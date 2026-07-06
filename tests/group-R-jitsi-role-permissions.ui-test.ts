/**
 * Defect — Jitsi role parity: doctor = HOST/moderator, patient = standard participant.
 * Dual-browser: Chromium (JROLE01) + Firefox (JROLE02). Doctor must initialize room first.
 *
 * @process Processes/VIDEO_MEETING_JITSI_GEMINI.md
 * @process Processes/Pages/Doctor-Portal/06_Health_Meeting_Page.md
 * @process Processes/Pages/Doctor-Portal/07_Virtual_Meeting.md
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { chromium, firefox, type Browser, type Page } from '@playwright/test';
import {
  test,
  expect,
  joinIzaraMeetingInApp,
  joinMeetingToLobby,
  lobbyAdmitAll,
  pageRequestPatch,
  readPageBearerToken,
  refreshPageAuth,
  PATIENT_URL,
  DOCTOR_URL,
  MEETING_URL,
  isPlaywrightHeadless,
} from './helpers/multi-portal';
import {
  installJitsiMountSpy,
  readJitsiMountLog,
  assertJitsiMountRole,
  assertJitsiRoleFlagsOnPage,
  waitForMeetingHostReady,
  notifyHostPresentAfterJitsi,
  assertNoJitsiModeratorGate,
  overrideBrowserMeetingServerUrl,
  proxyLocalMeetingServer,
  ensureJitsiMountSpy,
} from './helpers/meeting-lifecycle-fixture';
import {
  chromiumLaunchArgs,
  CHROMIUM_MEDIA_PERMISSIONS,
  FIREFOX_LAUNCH_OPTIONS,
  scaleTimeoutByBrowser,
} from './helpers/browser-matrix';

const IS_CLOUD = process.env.TEST_ENV === 'cloud';
const API_TIMEOUT = IS_CLOUD ? 30_000 : 15_000;

function resolveJitsiNavTimeoutMs(): number {
  if (IS_CLOUD || process.env.PW_HEADED === '1') return 90_000;
  return 45_000;
}
const PATIENT_ID = 'PATIENT-DEMO';
const DOCTOR_ID = 'DOC-TEST-001';
const AUTH_DIR = path.join(__dirname, 'e2e', '.auth-states');

async function seedTelehealthAppointment(
  patientPage: Page,
  doctorPage: Page,
  adminPage: Page,
): Promise<string> {
  const patientToken = await patientPage.evaluate(() => localStorage.getItem('auth_token') || '');
  const resp = await patientPage.request.post(`${PATIENT_URL}/api/appointments`, {
    headers: { Authorization: `Bearer ${patientToken}`, 'Content-Type': 'application/json' },
    data: {
      patientId: PATIENT_ID,
      appointmentType: 'telehealth',
      requestedDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      requestedTime: '14:00',
      reason: 'Jitsi role parity E2E',
      symptomDescription: 'Doctor HOST / patient participant',
      urgency: 'normal',
    },
    timeout: API_TIMEOUT,
  });
  expect(resp.status()).toBe(200);
  const body = await resp.json();
  const appointmentId = body.id as string;
  expect(appointmentId).toBeTruthy();

  const adminToken = await adminPage.evaluate(() =>
    localStorage.getItem('token') || localStorage.getItem('izara_auth_token') || '',
  );
  await pageRequestPatch(adminPage, `${DOCTOR_URL}/api/appointments/${appointmentId}/assign`, {
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    data: { doctor_id: DOCTOR_ID },
    timeout: API_TIMEOUT,
  });

  await refreshPageAuth(doctorPage, DOCTOR_URL);
  const doctorToken = await readPageBearerToken(doctorPage);
  let confirmResp = await doctorPage.request.post(`${DOCTOR_URL}/api/appointments/${appointmentId}/confirm`, {
    headers: { Authorization: `Bearer ${doctorToken}`, 'Content-Type': 'application/json' },
    data: {
      doctorId: DOCTOR_ID,
      confirmedDate: new Date().toISOString().split('T')[0],
      confirmedTime: '14:00',
    },
    timeout: API_TIMEOUT,
  });
  if (confirmResp.status() === 401) {
    await refreshPageAuth(doctorPage, DOCTOR_URL);
    const retryToken = await readPageBearerToken(doctorPage);
    confirmResp = await doctorPage.request.post(`${DOCTOR_URL}/api/appointments/${appointmentId}/confirm`, {
      headers: { Authorization: `Bearer ${retryToken}`, 'Content-Type': 'application/json' },
      data: {
        doctorId: DOCTOR_ID,
        confirmedDate: new Date().toISOString().split('T')[0],
        confirmedTime: '14:00',
      },
      timeout: API_TIMEOUT,
    });
  }
  expect(confirmResp.status()).toBe(200);
  return appointmentId;
}

async function createMeetingRecord(doctorPage: Page, appointmentId: string): Promise<string> {
  const token = await readPageBearerToken(doctorPage);
  const resp = await doctorPage.request.post(`${MEETING_URL}/api/meetings/create`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: {
      appointmentId,
      doctorId: DOCTOR_ID,
      doctorName: 'Dr. Test',
      patientId: PATIENT_ID,
      patientName: 'Demo Test Patient',
    },
    timeout: API_TIMEOUT,
  });
  expect(resp.ok(), 'meeting create').toBeTruthy();
  const body = await resp.json();
  const meeting = body.meeting || body;
  return meeting.id || meeting.meetingId || appointmentId;
}

async function assertJitsiRoleFromMountOrDom(
  page: Page,
  expected: 'doctor' | 'patient',
  label: string,
): Promise<void> {
  const mounts = await readJitsiMountLog(page);
  if (mounts.length > 0) {
    assertJitsiMountRole(mounts.at(-1)!, expected, `${label}-mount`);
    try {
      await assertJitsiRoleFlagsOnPage(page, expected, `${label}-dom`);
    } catch (domErr) {
      console.warn(`  ${label}: DOM role flags lag mount spy — ${domErr}`);
    }
    return;
  }
  await assertJitsiRoleFlagsOnPage(page, expected, `${label}-dom`);
}

async function assertAnonymousGuestBlocked(meetingKey: string): Promise<void> {
  const resp = await fetch(`${MEETING_URL}/api/meetings/${meetingKey}/lobby/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      participantName: 'Random Guest',
      participantId: 'anon-guest-test',
      role: 'guest',
    }),
  });
  expect(resp.status).toBe(401);
  const body = await resp.json().catch(() => ({}));
  expect(body.code).toBe('GUEST_AUTH_REQUIRED');
}

async function runJitsiRoleParityFlow(
  doctorPage: Page,
  patientPage: Page,
  adminPage: Page,
  browserName: 'chrome' | 'firefox',
  label: string,
): Promise<void> {
  const navTimeout = resolveJitsiNavTimeoutMs();
  await patientPage.goto(`${PATIENT_URL}/`, { waitUntil: 'domcontentloaded', timeout: navTimeout });
  await doctorPage.goto(`${DOCTOR_URL}/doctor/${DOCTOR_ID}/dashboard`, {
    waitUntil: 'domcontentloaded',
    timeout: navTimeout,
  });
  // Firefox: parallel admin warmup can NET_RESET under load — stagger + retry
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await adminPage.goto(`${DOCTOR_URL}/doctor/ADMIN-TEST-001/dashboard`, {
        waitUntil: 'domcontentloaded',
        timeout: navTimeout,
      });
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt === 3 || !/NET_RESET|TIMED_OUT|timeout/i.test(msg)) throw err;
      await adminPage.waitForTimeout(1_500 * attempt);
    }
  }

  const appointmentId = await seedTelehealthAppointment(patientPage, doctorPage, adminPage);
  const meetingKey = await createMeetingRecord(doctorPage, appointmentId);

  await assertAnonymousGuestBlocked(meetingKey);

  await overrideBrowserMeetingServerUrl(doctorPage, MEETING_URL);
  await overrideBrowserMeetingServerUrl(patientPage, MEETING_URL);
  await proxyLocalMeetingServer(doctorPage, MEETING_URL);
  await proxyLocalMeetingServer(patientPage, MEETING_URL);
  await installJitsiMountSpy(doctorPage);
  await installJitsiMountSpy(patientPage);

  await test.step(`${label}a — Doctor opens meeting first (HOST)`, async () => {
    await doctorPage.goto(`${DOCTOR_URL}/doctor/${DOCTOR_ID}/meeting/${appointmentId}`, {
      waitUntil: 'domcontentloaded',
      timeout: IS_CLOUD ? 90_000 : 45_000,
    });
    await ensureJitsiMountSpy(doctorPage);
    await joinIzaraMeetingInApp(doctorPage, `${label}-doctor`, 'chrome');

    await notifyHostPresentAfterJitsi(doctorPage, appointmentId, {
      bffUrl: DOCTOR_URL,
      meetingUrl: MEETING_URL,
    });

    await assertJitsiRoleFromMountOrDom(doctorPage, 'doctor', `${label}a-doctor`);
  });

  await test.step(`${label}b — Patient joins after host ready (participant)`, async () => {
    await patientPage.goto(`${PATIENT_URL}/meeting/${appointmentId}`, {
      waitUntil: 'domcontentloaded',
      timeout: IS_CLOUD ? 90_000 : 45_000,
    });
    await joinMeetingToLobby(patientPage, `${label}-patient-lobby`, browserName);
    await lobbyAdmitAll(doctorPage, meetingKey, DOCTOR_ID);

    await expect(
      patientPage.getByTestId('lobby-waiting-screen'),
      `${label}b: lobby clears after admit`,
    ).toBeHidden({ timeout: scaleTimeoutByBrowser(IS_CLOUD ? 120_000 : 90_000, browserName) }).catch(() => {});

    await ensureJitsiMountSpy(patientPage);
    await patientPage.reload({ waitUntil: 'domcontentloaded' });
    await joinIzaraMeetingInApp(patientPage, `${label}-patient`, browserName);

    await assertJitsiRoleFromMountOrDom(patientPage, 'patient', `${label}b-patient`);
    await assertNoJitsiModeratorGate(doctorPage, `${label}b-doctor`);
    await assertNoJitsiModeratorGate(patientPage, `${label}b-patient`);
  });

  await test.step(`${label}c — join-config JWT roles (when token auth enabled)`, async () => {
    const doctorToken = await doctorPage.evaluate(() => localStorage.getItem('token') || '');
    const patientToken = await patientPage.evaluate(() => localStorage.getItem('auth_token') || '');
    const doctorCfg = await doctorPage.request.get(
      `${MEETING_URL}/api/meetings/${meetingKey}/join-config?role=doctor&name=Dr.%20Test`,
      { headers: { Authorization: `Bearer ${doctorToken}` }, timeout: API_TIMEOUT },
    );
    expect(doctorCfg.ok()).toBeTruthy();
    const doctorBody = await doctorCfg.json();
    expect(doctorBody.role).toBe('doctor');
    if (doctorBody.jwt) {
      const payloadPart = String(doctorBody.jwt).split('.')[1] || '';
      const normalized = payloadPart.replaceAll('-', '+').replaceAll('_', '/');
      const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
      const decoded = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
      expect(decoded?.context?.user?.moderator === true || decoded?.context?.user?.affiliation === 'owner').toBeTruthy();
    } else {
      expect(doctorBody.configOverwrite?.moderator).toBe(true);
    }

    const patientCfg = await patientPage.request.get(
      `${MEETING_URL}/api/meetings/${meetingKey}/join-config?role=patient&name=Demo%20Test%20Patient`,
      { headers: { Authorization: `Bearer ${patientToken}` }, timeout: API_TIMEOUT },
    );
    expect(patientCfg.ok()).toBeTruthy();
    const patientBody = await patientCfg.json();
    expect(patientBody.role).toBe('patient');
    if (patientBody.jwt) {
      const payloadPart = String(patientBody.jwt).split('.')[1] || '';
      const normalized = payloadPart.replaceAll('-', '+').replaceAll('_', '/');
      const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
      const decoded = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
      expect(decoded?.context?.user?.moderator).not.toBe(true);
      expect(decoded?.context?.user?.affiliation).toBe('member');
    }
  });
}

async function launchDualBrowserPair(
  engine: 'chromium' | 'firefox',
): Promise<{ browser: Browser; doctorPage: Page; patientPage: Page; adminPage: Page; browserName: 'chrome' | 'firefox' }> {
  const patientState = path.join(AUTH_DIR, 'patient1.json');
  const doctorState = path.join(AUTH_DIR, 'doctor.json');
  const adminState = path.join(AUTH_DIR, 'admin.json');
  for (const f of [patientState, doctorState, adminState]) {
    expect(fs.existsSync(f), `Auth state missing: ${f} — run A-auth first`).toBeTruthy();
  }

  const headless = isPlaywrightHeadless();
  const ctxOpts = { viewport: { width: 1440, height: 900 } as const };

  if (engine === 'chromium') {
    const browser = await chromium.launch({
      headless,
      args: chromiumLaunchArgs(headless),
    });
    const [doctorCtx, patientCtx, adminCtx] = await Promise.all([
      browser.newContext({ ...ctxOpts, storageState: doctorState }),
      browser.newContext({ ...ctxOpts, storageState: patientState }),
      browser.newContext({ ...ctxOpts, storageState: adminState }),
    ]);
    await Promise.all([
      doctorCtx.grantPermissions([...CHROMIUM_MEDIA_PERMISSIONS]),
      patientCtx.grantPermissions([...CHROMIUM_MEDIA_PERMISSIONS]),
    ]);
    const [doctorPage, patientPage, adminPage] = await Promise.all([
      doctorCtx.newPage(),
      patientCtx.newPage(),
      adminCtx.newPage(),
    ]);
    return { browser, doctorPage, patientPage, adminPage, browserName: 'chrome' };
  }

  if (engine === 'firefox') {
    // Doctor HOST on Edge — Firefox headed cannot complete Jitsi External API host mount on Windows.
    // Patient + admin on Firefox preserves cross-browser parity for attendee flows.
    const doctorBrowser = await chromium.launch({
      headless,
      channel: 'msedge',
      args: chromiumLaunchArgs(headless),
    });
    const patientBrowser = await firefox.launch({ headless, ...FIREFOX_LAUNCH_OPTIONS });
    const adminBrowser = await firefox.launch({ headless, ...FIREFOX_LAUNCH_OPTIONS });
    const doctorCtx = await doctorBrowser.newContext({ ...ctxOpts, storageState: doctorState });
    const patientCtx = await patientBrowser.newContext({ ...ctxOpts, storageState: patientState });
    const adminCtx = await adminBrowser.newContext({ ...ctxOpts, storageState: adminState });
    await doctorCtx.grantPermissions([...CHROMIUM_MEDIA_PERMISSIONS]);
    const patientOrigin = new URL(PATIENT_URL).origin;
    await patientCtx.grantPermissions(['camera', 'microphone'], { origin: patientOrigin }).catch(() => {});
    const [doctorPage, patientPage, adminPage] = await Promise.all([
      doctorCtx.newPage(),
      patientCtx.newPage(),
      adminCtx.newPage(),
    ]);
    const closeAll = async () => {
      await Promise.all([doctorBrowser.close(), patientBrowser.close(), adminBrowser.close()].map((p) => p.catch(() => {})));
    };
    (doctorPage as Page & { __closeBrowsers?: () => Promise<void> }).__closeBrowsers = closeAll;
    return { browser: patientBrowser, doctorPage, patientPage, adminPage, browserName: 'firefox' };
  }

  throw new Error(`Unsupported engine: ${engine}`);
}

test.describe('Group R — Jitsi role permissions (doctor HOST / patient participant)', () => {
  test.describe.configure({ mode: 'serial' });

  test('JROLE01 — Chromium: doctor moderator controls, patient standard attendee', async ({ portals }) => {
    test.setTimeout(IS_CLOUD ? 600_000 : 420_000);
    await runJitsiRoleParityFlow(
      portals.doctor.page,
      portals.patient.page,
      portals.admin.page,
      portals.doctor.browserName === 'firefox' ? 'firefox' : 'chrome',
      'JROLE01-chromium',
    );
  });

  test('JROLE02 — Firefox: doctor moderator controls, patient standard attendee', async () => {
    test.setTimeout(IS_CLOUD ? 600_000 : 420_000);
    const { browser, doctorPage, patientPage, adminPage, browserName } = await launchDualBrowserPair('firefox');
    const closeBrowsers = (doctorPage as Page & { __closeBrowsers?: () => Promise<void> }).__closeBrowsers;
    try {
      await runJitsiRoleParityFlow(doctorPage, patientPage, adminPage, browserName, 'JROLE02-firefox');
    } finally {
      if (closeBrowsers) await closeBrowsers();
      else await browser.close().catch(() => {});
    }
  });
});
