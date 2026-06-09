/**
 * Defect J1 — Patient Jitsi display name auto-fill (no manual pre-join name prompt)
 *
 * @process Processes/Pages/Patient-Portal/05_Appointments_Page.md
 * @process Processes/VIDEO_MEETING_JITSI_GEMINI.md
 */
import {
  test,
  expect,
  snap,
  lobbyAdmitAll,
  joinIzaraMeetingInApp,
  PATIENT_URL,
  DOCTOR_URL,
  MEETING_URL,
  pageRequestPatch,
} from './helpers/multi-portal';
import {
  installJitsiMountSpy,
  readJitsiMountLog,
  assertNoJitsiPrejoinNameForm,
  assertJitsiMediaActive,
  assertJitsiRoleFlagsOnPage,
  waitForMeetingHostReady,
  overrideBrowserMeetingServerUrl,
  proxyLocalMeetingServer,
  ensureJitsiMountSpy,
} from './helpers/meeting-lifecycle-fixture';

const IS_CLOUD = process.env.TEST_ENV === 'cloud';
const API_TIMEOUT = IS_CLOUD ? 30_000 : 15_000;
const PATIENT_ID = 'PATIENT-DEMO';
const DOCTOR_ID = 'DOC-TEST-001';

test.describe('Group J — Patient Jitsi prejoin bypass', () => {
  test.describe.configure({ mode: 'serial' });

let appointmentId = '';
let meetingKey = '';

  test('JPRE01 — auth name on pre-join, Jitsi mounts without name prompt', async ({ portals }) => {
    const { patient, admin, doctor } = portals;

    await test.step('JPRE01a — Book, assign, confirm telehealth appointment', async () => {
      const token = await patient.page.evaluate(() => localStorage.getItem('auth_token') || '');
      const resp = await patient.page.request.post(`${PATIENT_URL}/api/appointments`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: {
          patientId: PATIENT_ID,
          appointmentType: 'telehealth',
          requestedDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          requestedTime: '11:00',
          reason: 'Jitsi display name E2E',
          symptomDescription: 'Auto display name validation',
          urgency: 'normal',
        },
        timeout: API_TIMEOUT,
      });
      expect(resp.status()).toBe(200);
      const body = await resp.json();
      appointmentId = body.id;
      expect(appointmentId).toBeTruthy();

      const adminToken = await admin.page.evaluate(() =>
        localStorage.getItem('token') || localStorage.getItem('izara_auth_token') || '',
      );
      await pageRequestPatch(admin.page, `${DOCTOR_URL}/api/appointments/${appointmentId}/assign`, {
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        data: { doctor_id: DOCTOR_ID },
        timeout: API_TIMEOUT,
      });

      const doctorToken = await doctor.page.evaluate(() =>
        localStorage.getItem('token') || localStorage.getItem('izara_auth_token') || '',
      );
      const confirmResp = await doctor.page.request.post(`${DOCTOR_URL}/api/appointments/${appointmentId}/confirm`, {
        headers: { Authorization: `Bearer ${doctorToken}`, 'Content-Type': 'application/json' },
        data: {
          doctorId: DOCTOR_ID,
          confirmedDate: new Date().toISOString().split('T')[0],
          confirmedTime: '11:00',
        },
        timeout: API_TIMEOUT,
      });
      expect(confirmResp.status()).toBe(200);
    });

    await test.step('JPRE01b — Create meeting record (doctor HOST)', async () => {
      const token = await doctor.page.evaluate(() => localStorage.getItem('token') || '');
      const resp = await doctor.page.request.post(`${MEETING_URL}/api/meetings/create`, {
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
      expect(resp.ok()).toBeTruthy();
      const body = await resp.json();
      const meeting = body.meeting || body;
      meetingKey = meeting.id || meeting.meetingId || appointmentId;
    });

    await test.step('JPRE01c — Patient pre-join shows auth display name (not empty)', async () => {
      await overrideBrowserMeetingServerUrl(patient.page, MEETING_URL);
      await proxyLocalMeetingServer(patient.page, MEETING_URL);
      await installJitsiMountSpy(patient.page);
      await patient.page.goto(`${PATIENT_URL}/meeting/${appointmentId}`, {
        waitUntil: 'domcontentloaded',
        timeout: IS_CLOUD ? 90_000 : 45_000,
      });

      const loading = patient.page.locator('[data-testid="meeting-loading"]');
      if (await loading.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await expect(loading).toBeHidden({ timeout: IS_CLOUD ? 120_000 : 60_000 });
      }

      const agreement = patient.page.locator('[data-testid="meeting-agreement"]');
      await expect(agreement).toBeVisible({ timeout: 30_000 });
      for (const id of ['consent-recording', 'consent-transcript', 'consent-data-sharing']) {
        const row = patient.page.locator(`[data-testid="${id}"]`);
        if (await row.isVisible({ timeout: 2_000 }).catch(() => false)) {
          const input = row.locator('input[type="checkbox"]').first();
          if (await input.isVisible().catch(() => false) && !(await input.isChecked().catch(() => false))) {
            await input.check({ force: true });
          }
        }
      }
      await patient.page.getByTestId('agree-continue-btn').click();
      await expect(patient.page.getByTestId('pre-join-screen')).toBeVisible({ timeout: 20_000 });

      const displayNameEl = patient.page.locator(
        '[data-testid="patient-display-name"], [data-testid="pre-join-screen"] .font-medium',
      ).first();
      await expect(displayNameEl, 'JPRE01c: patient display name on pre-join').toBeVisible();
      const displayName = (await displayNameEl.innerText()).trim();
      expect(displayName.length, 'JPRE01c: auth display name must not be empty').toBeGreaterThan(0);
      expect(displayName, 'JPRE01c: fallback Patient when auth empty').not.toBe('');
      expect(/enter your name|type your name|กรอกชื่อ/i.test(displayName)).toBe(false);
      await snap(patient.page, 'JPRE01c-patient-prejoin-autoname', 'group-J-jitsi-prejoin');
    });

    await test.step('JPRE01d — Patient joins lobby; doctor HOST opens meeting', async () => {
      await patient.page.getByTestId('join-meeting-btn').click();
      await expect(
        patient.page.getByTestId('lobby-waiting-screen').or(patient.page.getByTestId('host-waiting-screen')).first(),
      ).toBeVisible({ timeout: 45_000 });

      await overrideBrowserMeetingServerUrl(doctor.page, MEETING_URL);
      await proxyLocalMeetingServer(doctor.page, MEETING_URL);
      await doctor.page.goto(`${DOCTOR_URL}/doctor/${DOCTOR_ID}/meeting/${appointmentId}`, {
        waitUntil: 'domcontentloaded',
        timeout: IS_CLOUD ? 90_000 : 45_000,
      });
      await joinIzaraMeetingInApp(doctor.page, 'JPRE01d-doctor', portals.doctor.browserName);
      const doctorToken = await doctor.page.evaluate(() => localStorage.getItem('token') || '');
      await doctor.page.request.post(`${MEETING_URL}/api/meetings/${appointmentId}/host-present`, {
        headers: { Authorization: `Bearer ${doctorToken}` },
        timeout: API_TIMEOUT,
      });
      await waitForMeetingHostReady(
        doctor.page.request,
        MEETING_URL,
        appointmentId,
        IS_CLOUD ? 120_000 : 90_000,
      );
      await expect(doctor.page.getByTestId('jitsi-meeting-container')).toBeVisible({
        timeout: IS_CLOUD ? 90_000 : 60_000,
      });
    });

    await test.step('JPRE01e — Doctor admits patient; Jitsi bypasses name prompt', async () => {
      await ensureJitsiMountSpy(patient.page);
      await lobbyAdmitAll(doctor.page, appointmentId, DOCTOR_ID);
      await expect(patient.page.getByTestId('host-waiting-screen').or(patient.page.getByTestId('jitsi-meeting-container')).first())
        .toBeVisible({ timeout: 60_000 });

      await expect(patient.page.getByTestId('jitsi-meeting-container')).toBeVisible({
        timeout: IS_CLOUD ? 120_000 : 90_000,
      });
      await expect(patient.page.locator('[data-testid="jitsi-meeting-container"] iframe').first())
        .toBeVisible({ timeout: 60_000 });

      await assertJitsiRoleFlagsOnPage(patient.page, 'patient', 'JPRE01e');

      const mounts = await readJitsiMountLog(patient.page);
      if (mounts.length > 0) {
        const last = mounts.at(-1)!;
        const cfg = (last.options.configOverwrite || {}) as Record<string, unknown>;
        const userInfo = (last.options.userInfo || {}) as Record<string, unknown>;
        expect(cfg.prejoinPageEnabled, 'JPRE01e: prejoinPageEnabled must be false').toBe(false);
        expect(cfg.requireDisplayName, 'JPRE01e: requireDisplayName must be false').toBe(false);
        const mountedName = typeof userInfo.displayName === 'string' ? userInfo.displayName.trim() : '';
        expect(mountedName.length).toBeGreaterThan(0);
        expect(mountedName).not.toBe('Enter your name');
      } else {
        const patientToken = await patient.page.evaluate(() => localStorage.getItem('auth_token') || '');
        const joinResp = await patient.page.request.get(
          `${MEETING_URL}/api/meetings/${appointmentId}/join-config?role=patient`,
          { headers: { Authorization: `Bearer ${patientToken}` }, timeout: API_TIMEOUT },
        );
        expect(joinResp.ok(), 'JPRE01e: patient join-config').toBeTruthy();
        const joinCfg = (await joinResp.json()) as { displayName?: string; name?: string; participantName?: string };
        const mountedName = String(joinCfg.displayName || joinCfg.participantName || joinCfg.name || '').trim();
        expect(mountedName.length, 'JPRE01e: join-config display name').toBeGreaterThan(0);
        expect(mountedName).not.toBe('Enter your name');
      }

      await assertNoJitsiPrejoinNameForm(patient.page, 'patient');
      await assertJitsiMediaActive(patient.page, 'patient');
      await snap(patient.page, 'JPRE01e-patient-in-jitsi-canvas', 'group-J-jitsi-prejoin');
    });
  });
});
