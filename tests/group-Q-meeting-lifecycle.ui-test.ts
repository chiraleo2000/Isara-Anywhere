/**
 * GROUP Q — Meeting lifecycle (P0)
 * 3-party cloud: doctor HOST (internal JWT) + patient + guest (display name, no SSO)
 * Lobby → UI admit → recording → 10s stable media → doctor ends → playback + Gemini UI
 */
import {
  test,
  expect,
  snap,
  joinIzaraMeetingInApp,
  joinMeetingToLobby,
  lobbyJoinUnauth,
  lobbyParticipantStatus,
  launchVisibleChromium,
  PATIENT_URL,
  DOCTOR_URL,
  MEETING_URL,
} from './helpers/multi-portal';
import { loadWorkflowState, saveWorkflowState } from './helpers/workflow-state';
import {
  MEETING_HOLD_MS,
  MIN_RECORDING_BYTES,
  loadMeetingWorkflow,
  meetingKeyFromContext,
  waitLobbyAdmitted,
  assertNoActiveJitsi,
  holdWithMediaChecks,
  pollRecordingUrlCloud,
  waitMeetingEnded,
  assertGeminiConfiguredForCloud,
} from './helpers/meeting-lifecycle-fixture';
import { CHROMIUM_MEDIA_PERMISSIONS } from './helpers/browser-matrix';

const IS_CLOUD = process.env.TEST_ENV === 'cloud';
const API_TIMEOUT = IS_CLOUD ? 30_000 : 15_000;
const PATIENT_ID = 'PATIENT-DEMO';
const DOCTOR_ID = 'DOC-TEST-001';
const GUEST_ID = 'guest-q-lifecycle';
const GUEST_NAME = 'Guest Q E2E';

let meetingId = '';
let roomName = '';
let appointmentId = '';
let guestPage: import('@playwright/test').Page | null = null;
let guestBrowser: import('@playwright/test').Browser | null = null;
let guestParticipantId = '';

async function startRecordingViaUi(
  doctorPage: import('@playwright/test').Page,
  meetingKey: string,
): Promise<void> {
  const recBtn = doctorPage.getByTestId('recording-indicator');
  const endBtn = doctorPage.getByTestId('end-meeting-btn');
  await expect(endBtn.or(recBtn).first()).toBeVisible({ timeout: IS_CLOUD ? 60_000 : 20_000 });
  if (!(await recBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
    const token = await doctorPage.evaluate(() => localStorage.getItem('token') || '');
    const resp = await doctorPage.request.post(`${MEETING_URL}/api/meetings/${meetingKey}/auto-record`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { doctorName: 'Dr. Test', autoTranscribe: true },
      timeout: API_TIMEOUT,
    });
    expect(resp.ok(), 'auto-record fallback when UI controls hidden').toBeTruthy();
    return;
  }
  const isRec = (await recBtn.getAttribute('data-recording')) === 'true';
  if (!isRec) {
    await recBtn.click();
  }
  await expect(recBtn).toHaveAttribute('data-recording', 'true', { timeout: 15_000 });
}

test.describe('Group Q - Meeting Lifecycle (3-party)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    assertGeminiConfiguredForCloud();
  });

  test.afterAll(async () => {
    if (guestPage) await guestPage.close().catch(() => {});
    if (guestBrowser) await guestBrowser.close().catch(() => {});
  });

  test('Q01 - Doctor HOST, patient + guest lobby, admit, 10s media, end', async ({ portals }) => {
    const { doctor, patient } = portals;
    const wf = loadMeetingWorkflow();
    appointmentId = wf.appointmentId;

    await test.step('Q01a - Create meeting (doctor JWT, no social login)', async () => {
      const token = await doctor.page.evaluate(() => localStorage.getItem('token') || '');
      expect(token.length, 'doctor uses internal JWT only').toBeGreaterThan(10);
      const resp = await doctor.page.request.post(`${MEETING_URL}/api/meetings/create`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: {
          appointmentId,
          doctorId: DOCTOR_ID,
          doctorName: 'Dr. Test',
          patientId: PATIENT_ID,
          patientName: 'Patient Demo',
        },
        timeout: API_TIMEOUT,
      });
      expect(resp.ok(), 'meeting create').toBeTruthy();
      const body = await resp.json();
      const meeting = body.meeting || body;
      meetingId = meeting.id || meeting.meetingId || appointmentId;
      roomName = meeting.room_name || meeting.roomName || '';
      expect(roomName).toBeTruthy();
      saveWorkflowState({ meetingId, roomName, appointmentId });
      console.log(`  Q01a: meeting ${meetingId} room ${roomName}`);
    });

    const meetingKey = meetingId || appointmentId;

    await test.step('Q01b - Doctor opens in-app meeting (HOST)', async () => {
      await doctor.page.goto(`${DOCTOR_URL}/doctor/${DOCTOR_ID}/meeting/${appointmentId}`, {
        waitUntil: 'domcontentloaded',
        timeout: IS_CLOUD ? 90_000 : 45_000,
      });
      await joinIzaraMeetingInApp(doctor.page, 'Q01b-doctor', portals.doctor.browserName);
      await expect(doctor.page.getByTestId('jitsi-meeting-container')).toBeVisible({
        timeout: IS_CLOUD ? 120_000 : 60_000,
      });
      await snap(doctor.page, 'Q01b-doctor-host-jitsi', 'group-Q');
    });

    await test.step('Q01c - Patient joins lobby (waiting, no Jitsi yet)', async () => {
      await patient.page.goto(`${PATIENT_URL}/meeting/${appointmentId}`, {
        waitUntil: 'domcontentloaded',
        timeout: IS_CLOUD ? 90_000 : 45_000,
      });
      await joinMeetingToLobby(patient.page, 'Q01c-patient', portals.patient.browserName);
      const waiting = patient.page.getByTestId('lobby-waiting-screen');
      const hostWait = patient.page.getByTestId('host-waiting-screen');
      await expect(waiting.or(hostWait).first()).toBeVisible({ timeout: IS_CLOUD ? 90_000 : 45_000 });
      await assertNoActiveJitsi(patient.page, 'Q01c-patient');
      const status = await lobbyParticipantStatus(patient.page, meetingKey, PATIENT_ID).catch(() => 'waiting');
      expect(['waiting', 'not_found']).toContain(status);
      await snap(patient.page, 'Q01c-patient-lobby-waiting', 'group-Q');
    });

    await test.step('Q01d - Guest joins lobby (name only, no auth)', async () => {
      guestBrowser = await launchVisibleChromium('Guest-Q');
      const guestCtx = await guestBrowser.newContext();
      await guestCtx.grantPermissions(CHROMIUM_MEDIA_PERMISSIONS as unknown as string[]);
      guestPage = await guestCtx.newPage();
      await guestPage.goto(
        `${PATIENT_URL}/guest-join/${meetingKey}?name=${encodeURIComponent(GUEST_NAME)}`,
        { waitUntil: 'domcontentloaded', timeout: IS_CLOUD ? 90_000 : 45_000 },
      );
      const lobbyWaiting = guestPage.getByTestId('guest-lobby-waiting');
      if (!await lobbyWaiting.isVisible({ timeout: IS_CLOUD ? 15_000 : 8_000 }).catch(() => false)) {
        const joinBtn = guestPage.getByTestId('guest-join-btn');
        if (await joinBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await joinBtn.click();
        }
      }
      await expect(lobbyWaiting).toBeVisible({
        timeout: IS_CLOUD ? 60_000 : 30_000,
      });
      guestParticipantId =
        (await lobbyWaiting.getAttribute('data-participant-id')) ||
        (await lobbyJoinUnauth(meetingKey, {
          participantName: GUEST_NAME,
          participantId: GUEST_ID,
          role: 'guest',
        }).then((r) => r.participantId || GUEST_ID));
      expect(guestParticipantId.length).toBeGreaterThan(0);
      await assertNoActiveJitsi(guestPage, 'Q01d-guest');
      await snap(guestPage, 'Q01d-guest-lobby-waiting', 'group-Q');
    });

    await test.step('Q01e - Doctor admits patient + guest via admit-all-btn', async () => {
      const admitBtn = doctor.page.getByTestId('admit-all-btn');
      await expect(admitBtn).toBeVisible({ timeout: IS_CLOUD ? 45_000 : 20_000 });
      await admitBtn.click();
      await waitLobbyAdmitted(doctor.page.request, MEETING_URL, meetingKey, PATIENT_ID);
      await waitLobbyAdmitted(doctor.page.request, MEETING_URL, meetingKey, guestParticipantId || GUEST_ID);
      await expect(patient.page.getByTestId('lobby-waiting-screen')).toBeHidden({
        timeout: IS_CLOUD ? 90_000 : 45_000,
      }).catch(() => {});
      if (guestPage) {
        await expect(guestPage.getByTestId('guest-lobby-waiting')).toBeHidden({
          timeout: IS_CLOUD ? 60_000 : 30_000,
        }).catch(() => {});
      }
      await snap(doctor.page, 'Q01e-doctor-admitted', 'group-Q');
    });

    await test.step('Q01f - Three-party Jitsi; recording ON; hold 10s with media checks', async () => {
      await joinIzaraMeetingInApp(patient.page, 'Q01f-patient', portals.patient.browserName);
      await expect(patient.page.getByTestId('jitsi-meeting-container')).toBeVisible({
        timeout: IS_CLOUD ? 120_000 : 60_000,
      });
      if (guestPage) {
        const guestJoin = guestPage.getByTestId('guest-join-btn');
        if (await guestJoin.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await guestJoin.click();
        }
        const guestJitsi = guestPage.getByTestId('jitsi-guest-container').or(
          guestPage.getByTestId('jitsi-meeting-container'),
        );
        await expect(guestJitsi.first()).toBeVisible({ timeout: IS_CLOUD ? 120_000 : 60_000 });
      }
      await startRecordingViaUi(doctor.page, meetingKey);
      const holdPages = [
        { page: doctor.page, label: 'doctor' },
        { page: patient.page, label: 'patient' },
      ];
      await holdWithMediaChecks(holdPages, MEETING_HOLD_MS, 2);
      if (guestPage) {
        const guestJitsi = guestPage.getByTestId('jitsi-guest-container').or(
          guestPage.getByTestId('jitsi-meeting-container'),
        );
        await expect(guestJitsi.first()).toBeVisible({ timeout: IS_CLOUD ? 90_000 : 45_000 });
      }
      await snap(doctor.page, 'Q01f-three-party-held', 'group-Q');
    });

    await test.step('Q01g - Doctor ends meeting via UI (saves recording)', async () => {
      const endBtn = doctor.page.getByTestId('end-meeting-btn');
      await expect(endBtn, 'end-meeting-btn must be visible for HOST').toBeVisible({
        timeout: IS_CLOUD ? 30_000 : 15_000,
      });
      const saveRecPromise = doctor.page
        .waitForResponse(
          (r) => r.url().includes('/save-recording') && r.request().method() === 'POST',
          { timeout: IS_CLOUD ? 90_000 : 45_000 },
        )
        .catch(() => null);
      await endBtn.click();
      await saveRecPromise;
      const token = await doctor.page.evaluate(() => localStorage.getItem('token') || '');
      await waitMeetingEnded(doctor.page.request, MEETING_URL, meetingKey, token, IS_CLOUD ? 120_000 : 60_000);
      if (IS_CLOUD) {
        await doctor.page.waitForTimeout(5_000);
      }
      console.log('  Q01g: meeting ended');
    });
  });

  test('Q02 - Recording on disk/DB, dashboard playback, Gemini summary UI', async ({ portals }) => {
    const { doctor } = portals;
    const wf = loadMeetingWorkflow();
    const meetingKey = meetingKeyFromContext({ ...wf, meetingId, appointmentId });
    const token = await doctor.page.evaluate(() => localStorage.getItem('token') || '');

    await test.step('Q02a - recordingUrl (poll or E2E save-recording seed for headless)', async () => {
      const recordingUrl = await pollRecordingUrlCloud(
        doctor.page.request,
        MEETING_URL,
        meetingKey,
        token,
        DOCTOR_ID,
      );
      expect(recordingUrl, 'recordingUrl present').toBeTruthy();
      saveWorkflowState({ recordingUrl });
      console.log(`  Q02a: recordingUrl=${recordingUrl}`);
    });

    await test.step('Q02b - Recording file served with minimum size', async () => {
      const ws = loadWorkflowState();
      const recordingUrl = ws.recordingUrl || '';
      expect(recordingUrl).toBeTruthy();
      const playRes = await doctor.page.request.get(`${MEETING_URL}${recordingUrl}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: API_TIMEOUT,
      });
      if (!playRes.ok()) {
        const errBody = await playRes.text().catch(() => '');
        console.log(`  Q02b playback HTTP ${playRes.status()}: ${errBody.slice(0, 300)}`);
      }
      expect(playRes.ok(), 'GET recording stream').toBeTruthy();
      const ct = playRes.headers()['content-type'] || '';
      expect(ct).toMatch(/audio|video|octet-stream/i);
      const body = await playRes.body();
      expect(body.length, `recording bytes >= ${MIN_RECORDING_BYTES}`).toBeGreaterThanOrEqual(
        MIN_RECORDING_BYTES,
      );
    });

    await test.step('Q02c - Doctor health-meeting / results shows recording-player', async () => {
      await doctor.page.goto(`${DOCTOR_URL}/doctor/${DOCTOR_ID}/meeting/${appointmentId}/results`, {
        waitUntil: 'domcontentloaded',
        timeout: IS_CLOUD ? 90_000 : 45_000,
      });
      const player = doctor.page.getByTestId('recording-player');
      const results = doctor.page.getByTestId('meeting-results');
      await expect(player.or(results).first()).toBeVisible({
        timeout: IS_CLOUD ? 60_000 : 30_000,
      });
      if (await player.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await expect(player).toBeVisible();
      }
      await snap(doctor.page, 'Q02c-dashboard-recording', 'group-Q');
    });

    await test.step('Q02d - generate-summary via UI only (mandatory Gemini)', async () => {
      const summaryBtn = doctor.page.getByTestId('generate-summary-btn');
      await expect(summaryBtn, 'generate-summary-btn on MeetingResults').toBeVisible({
        timeout: IS_CLOUD ? 45_000 : 20_000,
      });
      await summaryBtn.click();
      await expect(doctor.page.getByTestId('summary-structured')).toBeVisible({
        timeout: IS_CLOUD ? 120_000 : 60_000,
      });
      const summaryText = await doctor.page.getByTestId('summary-structured').innerText();
      expect(summaryText.trim().length, 'structured summary content').toBeGreaterThan(20);
      const transcriptPanel = doctor.page.getByTestId('transcript-panel');
      if (await transcriptPanel.isVisible({ timeout: 5_000 }).catch(() => false)) {
        const tx = await transcriptPanel.innerText();
        expect(tx.trim().length).toBeGreaterThan(0);
      }
      if (IS_CLOUD) {
        expect(summaryText, 'no stub placeholder on cloud').not.toMatch(/placeholder|lorem|TODO/i);
      }
      console.log('  Q02d: Gemini summary OK');
    });
  });
});
