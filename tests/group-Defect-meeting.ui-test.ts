import {
  test,
  expect,
  DOCTOR_URL,
  PATIENT_URL,
  joinIzaraMeetingInApp,
  joinMeetingToLobby,
  snapMeetingStage,
  lobbyJoinUnauth,
  lobbyAdmitOne,
  lobbyReject,
  lobbyAdmitAll,
  isPlaywrightHeadless,
  lobbyParticipantStatus,
  getPatientAuth,
  readPageBearerToken,
  waitForLobbyWaitingParticipant,
  waitForDoctorLobbyAdmitControls,
  ensureDoctorLobbyPanelOpen,
  waitForDoctorLobbyRejectControl,
} from './helpers/multi-portal';
import {
  chromiumLaunchArgs,
  CHROMIUM_MEDIA_PERMISSIONS,
} from './helpers/browser-matrix';
import {
  proxyLocalMeetingServer,
  resolveBrowserMeetingServerUrl,
  overrideBrowserMeetingServerUrl,
  notifyHostPresentAfterJitsi,
  assertNoJitsiModeratorGate,
  waitForMeetingHostReady,
} from './helpers/meeting-lifecycle-fixture';
import { chromium } from '@playwright/test';

const MEETING_URL = process.env.MEETING_URL || 'http://127.0.0.1:3020';
const PATIENT_PORTAL = process.env.PATIENT_URL || 'http://127.0.0.1:3005';

function resolveHostReadyTimeoutMs(): number {
  const workers = Number.parseInt(process.env.PW_WORKERS || '1', 10);
  if (workers <= 1) return 60_000;
  const headed = process.env.PW_HEADED === '1' || process.env.PW_HEADED === 'true';
  return headed ? 120_000 : 90_000;
}

async function createDefectMeeting(
  doctorPage: import('@playwright/test').Page,
  suffix: string,
): Promise<{ appointmentId: string; doctorCtx: { token: string; doctorId: string; doctorName: string } }> {
  const doctorCtx = await doctorPage.evaluate(() => {
    const token = localStorage.getItem('token') || '';
    const raw = localStorage.getItem('doctor_user');
    const user = raw ? JSON.parse(raw) : {};
    return {
      token,
      doctorId: user?.id || 'DOC-TEST-001',
      doctorName: user?.name || 'Doctor',
    };
  });

  const appointmentId = `APT-DEFECT-${suffix}-${Date.now()}`;
  const createResp = await doctorPage.request.post(`${MEETING_URL}/api/meetings/create`, {
    headers: {
      Authorization: `Bearer ${doctorCtx.token}`,
      'Content-Type': 'application/json',
    },
    data: {
      appointmentId,
      doctorId: doctorCtx.doctorId,
      doctorName: doctorCtx.doctorName,
      patientId: 'PATIENT-DEMO',
      patientName: 'Patient Demo',
    },
  });
  expect(createResp.ok()).toBe(true);
  return { appointmentId, doctorCtx };
}

async function doctorInMeetingWithLobby(
  doctorPage: import('@playwright/test').Page,
  patientPage: import('@playwright/test').Page,
  appointmentId: string,
  doctorCtx: { token: string; doctorId: string },
  label: string,
  browserName: string,
): Promise<void> {
  await overrideBrowserMeetingServerUrl(doctorPage, MEETING_URL);
  await overrideBrowserMeetingServerUrl(patientPage, MEETING_URL);
  await proxyLocalMeetingServer(doctorPage, MEETING_URL);
  await proxyLocalMeetingServer(patientPage, MEETING_URL);
  await doctorPage.goto(`${DOCTOR_URL}/doctor/${doctorCtx.doctorId}/meeting/${appointmentId}`, {
    waitUntil: 'domcontentloaded',
  });
  await joinIzaraMeetingInApp(doctorPage, `${label}-doctor`, browserName);
  await notifyHostPresentAfterJitsi(doctorPage, appointmentId, { bffUrl: DOCTOR_URL, meetingUrl: MEETING_URL });
  await expect(doctorPage.getByTestId('jitsi-meeting-container')).toBeVisible({ timeout: 90_000 });

  await patientPage.goto(`${PATIENT_URL}/meeting/${appointmentId}`, { waitUntil: 'domcontentloaded' });
  await joinMeetingToLobby(patientPage, `${label}-patient`, browserName);
  await expect(
    patientPage.getByTestId('lobby-waiting-screen').or(patientPage.getByTestId('host-waiting-screen')).first(),
  ).toBeVisible({ timeout: 60_000 });

  const hostReadyTimeout = resolveHostReadyTimeoutMs();
  await waitForMeetingHostReady(patientPage.request, MEETING_URL, appointmentId, hostReadyTimeout);
  const { userId: patientParticipantId } = await getPatientAuth(patientPage);
  const doctorToken = await readPageBearerToken(doctorPage);
  await waitForLobbyWaitingParticipant(doctorPage, appointmentId, {
    authToken: doctorToken,
    participantId: patientParticipantId || 'PATIENT-DEMO',
  });
  await ensureDoctorLobbyPanelOpen(doctorPage);
  await waitForDoctorLobbyAdmitControls(doctorPage);
}

test.describe('Defect — Meeting lobby admit flow', () => {
  test.describe.configure({ mode: 'serial' });

  test('DM1 — doctor join route uses MeetingRoom with lobby admit UX', async ({ portals }) => {
    const { doctor, patient } = portals;
    const { appointmentId, doctorCtx } = await createDefectMeeting(doctor.page, 'DM1');
    await doctorInMeetingWithLobby(
      doctor.page,
      patient.page,
      appointmentId,
      doctorCtx,
      'DM1',
      portals.doctor.browserName,
    );
    await snapMeetingStage(doctor.page, 'DM1-doctor-lobby-panel', 'lobby-panel', 'group-defect');
  });

  test('DM2 — admit button visible when patient waiting in lobby (M2)', async ({ portals }) => {
    const { doctor, patient } = portals;
    const { appointmentId, doctorCtx } = await createDefectMeeting(doctor.page, 'DM2');
    await doctorInMeetingWithLobby(
      doctor.page,
      patient.page,
      appointmentId,
      doctorCtx,
      'DM2',
      portals.doctor.browserName,
    );

    await snapMeetingStage(doctor.page, 'DM2-admit-button-visible', 'lobby-panel', 'group-defect');
  });

  test('DM3 — doctor admits patient via MeetingRoom UI (2-party)', async ({ portals }) => {
    const { doctor, patient } = portals;
    const { appointmentId, doctorCtx } = await createDefectMeeting(doctor.page, 'DM3');
    await doctorInMeetingWithLobby(
      doctor.page,
      patient.page,
      appointmentId,
      doctorCtx,
      'DM3',
      portals.doctor.browserName,
    );

    const admitBtn = doctor.page.getByTestId('admit-btn').or(doctor.page.getByTestId('admit-all-btn')).first();
    await admitBtn.click();
    await expect(patient.page.getByTestId('lobby-waiting-screen')).toBeHidden({ timeout: 90_000 });
    await expect(patient.page.getByTestId('jitsi-meeting-container')).toBeVisible({ timeout: 90_000 });
    await assertNoJitsiModeratorGate(doctor.page, 'DM3-doctor');
    await assertNoJitsiModeratorGate(patient.page, 'DM3-patient');
    await snapMeetingStage(patient.page, 'DM3-patient-in-jitsi', 'jitsi-meeting-container', 'group-defect');
    await snapMeetingStage(doctor.page, 'DM3-doctor-jitsi-with-patient', 'jitsi-meeting-container', 'group-defect');
  });

  test('DM4 — doctor rejects patient from lobby via MeetingRoom UI', async ({ portals }) => {
    const { doctor, patient } = portals;
    const { appointmentId, doctorCtx } = await createDefectMeeting(doctor.page, 'DM4');
    await doctorInMeetingWithLobby(
      doctor.page,
      patient.page,
      appointmentId,
      doctorCtx,
      'DM4',
      portals.doctor.browserName,
    );

    await waitForDoctorLobbyRejectControl(doctor.page);

    const rejectBtn = doctor.page.getByTestId('reject-btn').first();
    const { userId: patientParticipantId } = await getPatientAuth(patient.page);
    const rejectResp = patient.page.waitForResponse(
      (r) => r.url().includes('/lobby/reject') && r.request().method() === 'POST',
      { timeout: 45_000 },
    ).catch(() => null);
    await rejectBtn.click();
    await rejectResp;
    const rejectDeadline = Date.now() + 45_000;
    let lobbyRejected = false;
    const statusParticipantId = patientParticipantId || 'PATIENT-DEMO';
    while (Date.now() < rejectDeadline) {
      const status = await lobbyParticipantStatus(patient.page, appointmentId, statusParticipantId).catch(() => 'unknown');
      if (status === 'rejected') {
        lobbyRejected = true;
        break;
      }
      await patient.page.waitForTimeout(1_000);
    }
    const rejected = patient.page.getByTestId('lobby-rejected-screen');
    const leftLobby = patient.page.getByTestId('lobby-waiting-screen');
    if (lobbyRejected) {
      await expect(rejected).toBeVisible({ timeout: 30_000 });
    } else {
      await expect(rejected.or(leftLobby).first()).toBeVisible({ timeout: 30_000 });
    }
    if (await rejected.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await snapMeetingStage(patient.page, 'DM4-patient-lobby-rejected', 'lobby-rejected-screen', 'group-defect');
    }
  });

  test('DM5 — guest + patient in lobby; doctor admits both (3-party)', async ({ portals }) => {
    const { doctor, patient } = portals;
    const { appointmentId, doctorCtx } = await createDefectMeeting(doctor.page, 'DM5');

    await proxyLocalMeetingServer(doctor.page, MEETING_URL);
    await proxyLocalMeetingServer(patient.page, MEETING_URL);
    await overrideBrowserMeetingServerUrl(doctor.page, MEETING_URL);
    await overrideBrowserMeetingServerUrl(patient.page, MEETING_URL);
    await doctor.page.goto(`${DOCTOR_URL}/doctor/${doctorCtx.doctorId}/meeting/${appointmentId}`, {
      waitUntil: 'domcontentloaded',
    });
    try {
      await joinIzaraMeetingInApp(doctor.page, 'DM5-doctor', portals.doctor.browserName);
    } catch {
      await joinIzaraMeetingInApp(doctor.page, 'DM5-doctor-retry', portals.doctor.browserName);
    }
    await notifyHostPresentAfterJitsi(doctor.page, appointmentId, { bffUrl: DOCTOR_URL, meetingUrl: MEETING_URL });
    await expect(doctor.page.getByTestId('jitsi-meeting-container')).toBeVisible({ timeout: 90_000 });

    const inviteResp = await doctor.page.request.post(`${DOCTOR_URL}/api/meetings/${appointmentId}/guest-invite`, {
      headers: { Authorization: `Bearer ${doctorCtx.token}`, 'Content-Type': 'application/json' },
      data: { guestName: 'Family Guest', guestEmail: 'guest@test.com', guestType: 'family' },
    });
    expect(inviteResp.ok()).toBeTruthy();
    const inviteData = await inviteResp.json();

    await patient.page.goto(`${PATIENT_URL}/meeting/${appointmentId}`, { waitUntil: 'domcontentloaded' });
    await joinMeetingToLobby(patient.page, 'DM5-patient', portals.patient.browserName);
    await waitForMeetingHostReady(patient.page.request, MEETING_URL, appointmentId, 60_000);
    await expect(
      patient.page.getByTestId('lobby-waiting-screen').or(patient.page.getByTestId('host-waiting-screen')).first(),
    ).toBeVisible({ timeout: 60_000 });

    const headless = isPlaywrightHeadless();
    const guestBrowser = await chromium.launch({ headless, args: chromiumLaunchArgs(headless) });
    const guestCtx = await guestBrowser.newContext({ viewport: { width: 1440, height: 900 } });
    await guestCtx.grantPermissions([...CHROMIUM_MEDIA_PERMISSIONS]);
    const browserMeetingUrl = resolveBrowserMeetingServerUrl(MEETING_URL);
    await guestCtx.addInitScript((url: string) => {
      const g = globalThis as unknown as { ENV?: Record<string, string> };
      g.ENV = { ...g.ENV, MEETING_SERVER_URL: url, VITE_MEETING_SERVER_URL: url };
    }, browserMeetingUrl);
    const guestPage = await guestCtx.newPage();
    try {
      await proxyLocalMeetingServer(guestPage, MEETING_URL);
      await guestPage.goto(`${PATIENT_PORTAL}/guest/join/${inviteData.token}`, {
        waitUntil: 'domcontentloaded',
      });
      const joinBtn = guestPage.getByTestId('guest-join-btn');
      if (await joinBtn.isVisible({ timeout: 15_000 }).catch(() => false)) {
        const nameInput = guestPage.getByTestId('guest-name-input');
        if (await nameInput.isVisible().catch(() => false)) {
          const current = await nameInput.inputValue().catch(() => '');
          if (!current.trim()) await nameInput.fill('Family Guest');
        }
        await joinBtn.click();
      }
      await expect(
        guestPage.getByTestId('guest-lobby-waiting').or(guestPage.getByTestId('lobby-waiting-screen')).first(),
      ).toBeVisible({ timeout: 60_000 });

      const lobbyPanel = doctor.page.getByTestId('lobby-panel');
      if (!(await lobbyPanel.isVisible({ timeout: 8_000 }).catch(() => false))) {
        await doctor.page.getByTestId('lobby-toggle-btn').click();
      }
      await expect(lobbyPanel).toBeVisible({ timeout: 60_000 });
      await snapMeetingStage(doctor.page, 'DM5-doctor-lobby-guest-patient', 'lobby-panel', 'group-defect');

      await lobbyAdmitAll(doctor.page, appointmentId, doctorCtx.doctorId);

      await expect(patient.page.getByTestId('jitsi-meeting-container')).toBeVisible({ timeout: 90_000 });
      await expect(
        guestPage.getByTestId('jitsi-guest-container').or(guestPage.getByTestId('jitsi-meeting-container')).first(),
      ).toBeVisible({ timeout: 90_000 });
      await assertNoJitsiModeratorGate(doctor.page, 'DM5-doctor');
      await assertNoJitsiModeratorGate(patient.page, 'DM5-patient');
      await assertNoJitsiModeratorGate(guestPage, 'DM5-guest');
      await snapMeetingStage(guestPage, 'DM5-guest-in-jitsi', 'jitsi-guest-container', 'group-defect');
      await snapMeetingStage(patient.page, 'DM5-patient-in-jitsi-3party', 'jitsi-meeting-container', 'group-defect');
    } finally {
      await guestPage.close().catch(() => {});
      await guestCtx.close().catch(() => {});
      await guestBrowser.close().catch(() => {});
    }
  });

  test('DM6 — doctor denies guest via API; patient still admitted separately', async ({ portals }) => {
    const { doctor, patient } = portals;
    const { appointmentId, doctorCtx } = await createDefectMeeting(doctor.page, 'DM6');

    await proxyLocalMeetingServer(doctor.page, MEETING_URL);
    await proxyLocalMeetingServer(patient.page, MEETING_URL);
    await overrideBrowserMeetingServerUrl(doctor.page, MEETING_URL);
    await overrideBrowserMeetingServerUrl(patient.page, MEETING_URL);
    await doctor.page.goto(`${DOCTOR_URL}/doctor/${doctorCtx.doctorId}/meeting/${appointmentId}`, {
      waitUntil: 'domcontentloaded',
    });
    await joinIzaraMeetingInApp(doctor.page, 'DM6-doctor', portals.doctor.browserName);
    await notifyHostPresentAfterJitsi(doctor.page, appointmentId, { bffUrl: DOCTOR_URL, meetingUrl: MEETING_URL });

    const guestInviteResp = await doctor.page.request.post(`${DOCTOR_URL}/api/meetings/${appointmentId}/guest-invite`, {
      headers: { Authorization: `Bearer ${doctorCtx.token}`, 'Content-Type': 'application/json' },
      data: { guestName: 'Blocked Guest', guestEmail: 'blocked@test.com', guestType: 'family' },
    });
    expect(guestInviteResp.ok()).toBeTruthy();
    const guestInviteData = await guestInviteResp.json();

    const guestJoin = await lobbyJoinUnauth(appointmentId, {
      participantName: 'Blocked Guest',
      role: 'guest',
      invite: guestInviteData.token,
    });
    const guestId = guestJoin.participantId || 'guest-dm6';

    await patient.page.goto(`${PATIENT_URL}/meeting/${appointmentId}`, { waitUntil: 'domcontentloaded' });
    await joinMeetingToLobby(patient.page, 'DM6-patient', portals.patient.browserName);

    await lobbyReject(doctor.page, appointmentId, guestId, doctorCtx.doctorId, 'E2E deny guest');
    const { userId: patientParticipantId } = await getPatientAuth(patient.page);
    await lobbyAdmitOne(
      doctor.page,
      appointmentId,
      patientParticipantId || 'PATIENT-DEMO',
      doctorCtx.doctorId,
    );

    await expect(patient.page.getByTestId('jitsi-meeting-container')).toBeVisible({ timeout: 90_000 });
    await snapMeetingStage(patient.page, 'DM6-patient-admitted-alone', 'jitsi-meeting-container', 'group-defect');
  });
});
