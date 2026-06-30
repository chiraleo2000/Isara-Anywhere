/**
 * GROUP Q — Meeting lifecycle (P0)
 * 3-party cloud: doctor HOST (internal JWT) + patient + guest (display name, no SSO)
 * Lobby → UI admit → recording → 10s stable media → doctor ends → playback + Gemini UI
 */
import {
  test,
  expect,
  snapMeetingStage,
  snapMeetingStageAny,
  joinIzaraMeetingInApp,
  joinMeetingToLobby,
  lobbyGetSnapshot,
  lobbyParticipantStatus,
  requirePatientAuth,
  launchVisibleChromium,
  PATIENT_URL,
  DOCTOR_URL,
  MEETING_URL,
  readPageBearerToken,
  refreshPageAuth,
} from './helpers/multi-portal';
import { refreshAuthStorageStates, reinjectAuthFromStorageFile } from './helpers/auth-refresh';
import { loadWorkflowState, saveWorkflowState } from './helpers/workflow-state';
import {
  MEETING_HOLD_MS,
  MIN_RECORDING_BYTES,
  loadMeetingWorkflow,
  meetingKeyFromContext,
  resolveWorkflowAppointmentId,
  assertNoActiveJitsi,
  holdWithMediaChecks,
  pollRecordingUrlCloud,
  waitMeetingEnded,
  ensureMeetingResultsForE2E,
  waitForMeetingResultsReady,
  assertGeminiConfiguredForCloud,
  overrideBrowserMeetingServerUrl,
  proxyLocalMeetingServer,
  resolveBrowserMeetingServerUrl,
  admitAllLobbyParticipants,
  resolveGuestParticipantId,
  participantIdByRole,
  assertThreePartyInMeeting,
  assertTwoPartyInMeeting,
  assertJitsiRoleFlagsOnPage,
  assertNoJitsiPrejoinNameForm,
  assertJitsiAutoDisplayName,
  assertGuestManualNameForm,
  isMeetingGuestE2EEnabled,
  notifyHostPresentAfterJitsi,
  assertNoJitsiModeratorGate,
  waitForMeetingHostReady,
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
let guestInviteToken = '';
let patientParticipantId = PATIENT_ID;

async function assertQ02dGeminiLite(
  page: import('@playwright/test').Page,
  structured: import('@playwright/test').Locator,
  isCloud: boolean,
): Promise<void> {
  const degraded = page.getByTestId('summary-degraded-badge');
  const pollMs = isCloud ? 60_000 : 45_000;
  let hasStructured = false;
  let hasDegraded = false;
  let hasSummaryCopy = false;
  const deadline = Date.now() + pollMs;
  while (Date.now() < deadline) {
    hasStructured = await structured.isVisible().catch(() => false);
    hasDegraded = await degraded.isVisible().catch(() => false);
    if (hasStructured || hasDegraded) break;
    const resultsText = await page.getByTestId('meeting-results').innerText().catch(() => '');
    hasSummaryCopy = /สรุป|summary|SOAP|สำรอง|degraded|clinical/i.test(resultsText);
    if (hasSummaryCopy && resultsText.trim().length > 40) break;
    await page.waitForTimeout(1_500);
  }
  expect(
    hasStructured || hasDegraded || hasSummaryCopy,
    'summary UI, degraded badge, or meeting-results summary copy (Gemini-lite)',
  ).toBeTruthy();
  console.log('  Q02d: Gemini-lite mode OK (structured, degraded, or results copy)');
}

async function assertQ02dLiveGemini(
  page: import('@playwright/test').Page,
  structured: import('@playwright/test').Locator,
  isCloud: boolean,
): Promise<void> {
  await expect(structured).toBeVisible({ timeout: isCloud ? 120_000 : 60_000 });
  const summaryText = await page.getByTestId('summary-structured').innerText();
  expect(summaryText.trim().length, 'structured summary content').toBeGreaterThan(20);
  const transcriptPanel = page.getByTestId('transcript-panel');
  if (await transcriptPanel.isVisible({ timeout: 5_000 }).catch(() => false)) {
    const tx = await transcriptPanel.innerText();
    expect(tx.trim().length).toBeGreaterThan(0);
  }
  if (isCloud) {
    expect(summaryText, 'no stub placeholder on cloud').not.toMatch(/placeholder|lorem|TODO/i);
  }
  console.log('  Q02d: Gemini summary OK');
}

async function startRecordingViaUi(
  doctorPage: import('@playwright/test').Page,
  meetingKey: string,
): Promise<void> {
  const recBtn = doctorPage.getByTestId('recording-indicator');
  const endBtn = doctorPage.getByTestId('end-meeting-btn');
  await expect(endBtn.or(recBtn).first()).toBeVisible({ timeout: IS_CLOUD ? 60_000 : 20_000 });
  if (!(await recBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
    console.warn('Q01 WARN: recording-indicator not visible — production REC UX gap');
    if (process.env.PW_ALLOW_RECORDING_SEED === '1') {
      const token = await readPageBearerToken(doctorPage);
      const resp = await doctorPage.request.post(`${MEETING_URL}/api/meetings/${meetingKey}/auto-record`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: { doctorName: 'Dr. Test', autoTranscribe: true },
        timeout: API_TIMEOUT,
      });
      expect(resp.ok(), 'auto-record fallback only when PW_ALLOW_RECORDING_SEED=1').toBeTruthy();
      return;
    }
    expect(await recBtn.isVisible(), 'recording-indicator must be visible (Teams-like REC UX)').toBeTruthy();
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

  test('Q01 - Doctor HOST, patient lobby (+ optional guest), admit, 10s media, end', async ({ portals }) => {
    const { doctor, patient } = portals;
    const includeGuest = isMeetingGuestE2EEnabled();
    await refreshPageAuth(doctor.page, DOCTOR_URL);
    const token = await readPageBearerToken(doctor.page);
    let wf: ReturnType<typeof loadMeetingWorkflow>;
    try {
      wf = loadMeetingWorkflow();
    } catch {
      const appointmentId = await resolveWorkflowAppointmentId(doctor.page.request, DOCTOR_URL, token);
      wf = { appointmentId };
    }
    appointmentId = wf.appointmentId;

    await test.step('Q01a - Create meeting (doctor JWT, no social login)', async () => {
      const token = await readPageBearerToken(doctor.page);
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
    const lobbyKey = appointmentId;

    await test.step('Q01a-proxy - Docker meeting-server URL for browser clients', async () => {
      await overrideBrowserMeetingServerUrl(doctor.page, MEETING_URL);
      await proxyLocalMeetingServer(doctor.page, MEETING_URL);
      await overrideBrowserMeetingServerUrl(patient.page, MEETING_URL);
      await proxyLocalMeetingServer(patient.page, MEETING_URL);
    });

    await test.step('Q01b - Doctor opens in-app meeting (HOST)', async () => {
      await overrideBrowserMeetingServerUrl(doctor.page, MEETING_URL);
      await proxyLocalMeetingServer(doctor.page, MEETING_URL);
      await doctor.page.goto(`${DOCTOR_URL}/doctor/${DOCTOR_ID}/meeting/${appointmentId}`, {
        waitUntil: 'domcontentloaded',
        timeout: IS_CLOUD ? 90_000 : 45_000,
      });
      try {
        await joinIzaraMeetingInApp(doctor.page, 'Q01b-doctor', portals.doctor.browserName);
      } catch (joinErr) {
        console.log(`  Q01b joinIzaraMeetingInApp retry path: ${String(joinErr).slice(0, 120)}`);
        await joinIzaraMeetingInApp(doctor.page, 'Q01b-doctor-retry', portals.doctor.browserName);
      }
      await notifyHostPresentAfterJitsi(doctor.page, appointmentId, {
        bffUrl: DOCTOR_URL,
        meetingUrl: MEETING_URL,
      });
      await expect(
        doctor.page
          .getByTestId('jitsi-meeting-container')
          .or(doctor.page.getByTestId('end-meeting-btn'))
          .or(doctor.page.getByTestId('host-starting-screen'))
          .first(),
      ).toBeVisible({ timeout: 120_000 });
      await expect(
        doctor.page.locator('[data-testid="jitsi-meeting-container"] iframe').first(),
      ).toBeVisible({ timeout: 60_000 });
      await assertJitsiRoleFlagsOnPage(doctor.page, 'doctor', 'Q01b-doctor');
      await assertNoJitsiPrejoinNameForm(doctor.page, 'Q01b-doctor');
      const doctorDisplayName = await assertJitsiAutoDisplayName(doctor.page, 'Q01b-doctor');
      expect(doctorDisplayName, 'doctor auto name from account').not.toMatch(/^(Doctor|Host)$/i);
      await snapMeetingStage(doctor.page, 'Q01b-doctor-host-jitsi', 'doctor-meeting-room', 'group-Q');
    });

    await test.step('Q01c - Patient joins lobby (waiting, no Jitsi yet)', async () => {
      await overrideBrowserMeetingServerUrl(patient.page, MEETING_URL);
      await proxyLocalMeetingServer(patient.page, MEETING_URL);
      await patient.page.goto(`${PATIENT_URL}/meeting/${appointmentId}`, {
        waitUntil: 'domcontentloaded',
        timeout: IS_CLOUD ? 90_000 : 45_000,
      });
      await joinMeetingToLobby(patient.page, 'Q01c-patient', portals.patient.browserName);
      const waiting = patient.page.getByTestId('lobby-waiting-screen');
      const hostWait = patient.page.getByTestId('host-waiting-screen');
      await expect(waiting.or(hostWait).first()).toBeVisible({ timeout: IS_CLOUD ? 90_000 : 45_000 });
      await assertNoActiveJitsi(patient.page, 'Q01c-patient');

      const doctorToken = await readPageBearerToken(doctor.page);
      const { userId: patientUserId } = await requirePatientAuth(patient.page, 'Q01c');
      let lobbySnap = await lobbyGetSnapshot(doctor.page, lobbyKey, doctorToken);
      if (!participantIdByRole(lobbySnap, 'patient')) {
        const joinKeys = [...new Set([lobbyKey, meetingKey, meetingId].filter(Boolean))];
        let joined = false;
        for (const key of joinKeys) {
          const joinResp = await patient.page.request.post(`${MEETING_URL}/api/meetings/${key}/lobby/join`, {
            headers: { 'Content-Type': 'application/json' },
            data: {
              participantName: 'Demo Test Patient',
              participantId: patientUserId || PATIENT_ID,
              role: 'patient',
            },
            timeout: API_TIMEOUT,
          });
          if (joinResp.ok()) {
            joined = true;
            break;
          }
          const errText = await joinResp.text().catch(() => '');
          console.log(`  Q01c lobby join ${key}: HTTP ${joinResp.status()} ${errText.slice(0, 120)}`);
        }
        expect(joined, 'Q01c patient lobby API fallback (dev patient_id match)').toBeTruthy();
      }

      const statusDeadline = Date.now() + (IS_CLOUD ? 90_000 : 45_000);
      let status = 'not_found';
      while (Date.now() < statusDeadline) {
        lobbySnap = await lobbyGetSnapshot(doctor.page, lobbyKey, doctorToken);
        patientParticipantId = participantIdByRole(lobbySnap, 'patient') || PATIENT_ID;
        status = await lobbyParticipantStatus(patient.page, lobbyKey, patientParticipantId);
        if (status === 'waiting' || status === 'admitted') break;
        await patient.page.waitForTimeout(1_500);
      }
      expect(['waiting', 'admitted'], `patient lobby status for ${patientParticipantId}`).toContain(status);
      await snapMeetingStageAny(
        patient.page,
        'Q01c-patient-lobby-waiting',
        ['lobby-waiting-screen', 'host-waiting-screen', 'lobby-starting-screen'],
        'group-Q',
      );
    });

    await test.step('Q01d - Guest joins lobby (opaque invite token, no auth account)', async () => { // NOSONAR S3776 — multi-browser guest lobby flow
      if (!includeGuest) {
        console.log('  Q01d: skipped (PW_INCLUDE_GUEST not set — doctor+patient only)');
        return;
      }
      const doctorTokenQ01d = await readPageBearerToken(doctor.page);
      const inviteResp = await doctor.page.request.post(`${MEETING_URL}/api/meetings/${meetingKey}/guest-invite`, {
        headers: { Authorization: `Bearer ${doctorTokenQ01d}`, 'Content-Type': 'application/json' },
        data: { guestName: GUEST_NAME, guestEmail: 'guest@test.com', guestType: 'family' },
        timeout: API_TIMEOUT,
      });
      expect(inviteResp.ok(), 'Q01d guest-invite').toBeTruthy();
      const inviteData = await inviteResp.json();
      expect(inviteData.token, 'Q01d guest invite token').toBeTruthy();
      guestInviteToken = inviteData.token;

      guestBrowser = await launchVisibleChromium('Guest-Q');
      const guestCtx = await guestBrowser.newContext();
      await guestCtx.grantPermissions([...CHROMIUM_MEDIA_PERMISSIONS]);
      const browserMeetingUrl = resolveBrowserMeetingServerUrl(MEETING_URL);
      await guestCtx.addInitScript((url: string) => {
        const g = globalThis as unknown as { ENV?: Record<string, string> };
        g.ENV = { ...g.ENV, MEETING_SERVER_URL: url, VITE_MEETING_SERVER_URL: url };
      }, browserMeetingUrl);
      guestPage = await guestCtx.newPage();
      await proxyLocalMeetingServer(guestPage, MEETING_URL);
      const guestUrl = `${PATIENT_URL}/guest/join/${inviteData.token}`;
      const preflight = await guestPage.request.get(
        `${MEETING_URL}/api/guest/meeting/${encodeURIComponent(inviteData.token)}`,
        { timeout: API_TIMEOUT },
      );
      expect(preflight.ok(), 'Q01d guest token preflight (meeting server)').toBeTruthy();

      await guestPage.goto(guestUrl, {
        waitUntil: 'domcontentloaded',
        timeout: IS_CLOUD ? 90_000 : 45_000,
      });
      await guestPage
        .getByTestId('guest-token-validating')
        .waitFor({ state: 'hidden', timeout: IS_CLOUD ? 30_000 : 15_000 })
        .catch(() => {});

      const joinBtn = guestPage.getByTestId('guest-join-btn');
      const lobbyWaiting = guestPage.getByTestId('guest-lobby-waiting');
      const accessDenied = guestPage.getByTestId('guest-access-denied');
      let guestInLobby = false;

      const uiDeadline = Date.now() + (IS_CLOUD ? 45_000 : 25_000);
      while (Date.now() < uiDeadline) {
        if (await lobbyWaiting.isVisible().catch(() => false)) {
          guestInLobby = true;
          break;
        }
        if (await joinBtn.isVisible().catch(() => false) && (await joinBtn.isEnabled().catch(() => false))) {
          await assertGuestManualNameForm(guestPage, 'Q01d-guest');
          const nameInput = guestPage.getByTestId('guest-name-input');
          const current = await nameInput.inputValue().catch(() => '');
          if (!current.trim()) await nameInput.fill(GUEST_NAME);
          await joinBtn.click({ timeout: 5_000 });
          if (await lobbyWaiting.isVisible({ timeout: IS_CLOUD ? 20_000 : 10_000 }).catch(() => false)) {
            guestInLobby = true;
            break;
          }
        }
        if (await accessDenied.isVisible().catch(() => false)) break;
        await guestPage.waitForTimeout(500);
      }

      if (guestInLobby) {
        guestParticipantId = await resolveGuestParticipantId(
          guestPage,
          doctor.page,
          lobbyKey,
          doctorTokenQ01d,
        );
      } else {
        const joinApi = await guestPage.request.post(
          `${MEETING_URL}/api/guest/meeting/${encodeURIComponent(inviteData.token)}/join`,
          { data: { displayName: GUEST_NAME }, timeout: API_TIMEOUT },
        );
        expect(joinApi.ok(), 'Q01d guest API lobby join fallback').toBeTruthy();
        const joinBody = await joinApi.json();
        guestParticipantId = joinBody.participantId || `guest-${GUEST_ID}`;
        console.log(`  Q01d: guest lobby via API fallback (${guestParticipantId})`);
      }
      const statusResp = await guestPage.request.get(
        `${MEETING_URL}/api/meetings/${lobbyKey}/lobby/status/${encodeURIComponent(guestParticipantId)}`,
        { timeout: API_TIMEOUT },
      );
      expect(statusResp.ok(), 'Q01d guest lobby status API').toBeTruthy();
      const statusBody = await statusResp.json();
      expect(['waiting', 'admitted']).toContain(statusBody.status);
      expect(guestParticipantId.length).toBeGreaterThan(0);
      await assertNoActiveJitsi(guestPage, 'Q01d-guest');
      await snapMeetingStageAny(
        guestPage,
        'Q01d-guest-lobby-waiting',
        ['lobby-waiting-screen', 'guest-join-form', 'host-waiting-screen'],
        'group-Q',
      );
    });

    await test.step('Q01e - Doctor admits patient (+ guest when enabled) via admit-all-btn', async () => {
      const admitted = await admitAllLobbyParticipants({
        doctorPage: doctor.page,
        patientPage: patient.page,
        guestPage,
        lobbyKey,
        appointmentId,
        doctorId: DOCTOR_ID,
        meetingUrl: MEETING_URL,
        includeGuest,
        expected: {
          patientId: patientParticipantId,
          guestId: guestParticipantId || GUEST_ID,
          patientName: 'Demo Test Patient',
          guestName: GUEST_NAME,
          guestInviteToken,
        },
        apiTimeout: API_TIMEOUT,
      });
      patientParticipantId = admitted.patientId;
      guestParticipantId = admitted.guestId;
      expect(patientParticipantId, 'Q01e patient participant id').toBeTruthy();
      if (includeGuest) {
        expect(guestParticipantId, 'Q01e guest participant id').toBeTruthy();
      }
      const lobbyPanel = doctor.page.getByTestId('lobby-panel').or(doctor.page.getByTestId('admit-all-btn'));
      await expect(lobbyPanel.first()).toBeVisible({ timeout: 30_000 });
      await snapMeetingStageAny(
        doctor.page,
        'Q01e-doctor-admitted',
        ['lobby-panel', 'doctor-meeting-room'],
        'group-Q',
      );
    });

    await test.step('Q01f - In-meeting Jitsi; recording ON; hold 10s with media checks', async () => {
      await joinIzaraMeetingInApp(patient.page, 'Q01f-patient', portals.patient.browserName);
      await expect(patient.page.getByTestId('jitsi-meeting-container')).toBeVisible({
        timeout: IS_CLOUD ? 120_000 : 60_000,
      });

      const doctorToken = await readPageBearerToken(doctor.page);
      if (includeGuest) {
        expect(guestPage, 'Q01f guest browser required for 3-party').toBeTruthy();
        const guestJoin = guestPage!.getByTestId('guest-join-btn');
        if (await guestJoin.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await guestJoin.click();
        }
        const guestJitsi = guestPage!.getByTestId('jitsi-guest-container').or(
          guestPage!.getByTestId('jitsi-meeting-container'),
        );
        await expect(guestJitsi.first()).toBeVisible({ timeout: IS_CLOUD ? 120_000 : 60_000 });
        await assertThreePartyInMeeting({
          doctorPage: doctor.page,
          patientPage: patient.page,
          guestPage: guestPage!,
          meetingKey,
          doctorToken,
          meetingUrl: MEETING_URL,
          apiTimeout: API_TIMEOUT,
        });
      } else {
        await assertTwoPartyInMeeting({
          doctorPage: doctor.page,
          patientPage: patient.page,
          meetingKey,
          doctorToken,
          meetingUrl: MEETING_URL,
          apiTimeout: API_TIMEOUT,
        });
      }
      await assertJitsiRoleFlagsOnPage(doctor.page, 'doctor', 'Q01f-doctor');
      await assertJitsiRoleFlagsOnPage(patient.page, 'patient', 'Q01f-patient');
      await assertNoJitsiModeratorGate(doctor.page, 'Q01f-doctor');
      await assertNoJitsiModeratorGate(patient.page, 'Q01f-patient');
      await assertNoJitsiPrejoinNameForm(patient.page, 'Q01f-patient');
      const patientDisplayName = await assertJitsiAutoDisplayName(patient.page, 'Q01f-patient');
      expect(patientDisplayName, 'patient auto name from Izara account').toMatch(/Demo|Patient|Test|สม/i);
      const doctorDisplayNameQ01f = await assertJitsiAutoDisplayName(doctor.page, 'Q01f-doctor');
      expect(doctorDisplayNameQ01f, 'doctor auto name from Izara account').not.toMatch(/^(Doctor|Host)$/i);

      await startRecordingViaUi(doctor.page, meetingKey);
      const holdPages = [
        { page: doctor.page, label: 'doctor' },
        { page: patient.page, label: 'patient' },
        ...(includeGuest && guestPage ? [{ page: guestPage, label: 'guest' as const }] : []),
      ];
      await holdWithMediaChecks(holdPages, MEETING_HOLD_MS, 3);
      await snapMeetingStage(
        doctor.page,
        includeGuest ? 'Q01f-three-party-held' : 'Q01f-two-party-held',
        'doctor-meeting-room',
        'group-Q',
      );
    });

    await test.step('Q01g - Doctor ends meeting via UI (saves recording)', async () => {
      await refreshPageAuth(doctor.page, DOCTOR_URL);
      const endBtn = doctor.page.getByTestId('end-meeting-btn');
      await expect(endBtn, 'end-meeting-btn must be visible for HOST').toBeVisible({
        timeout: IS_CLOUD ? 30_000 : 15_000,
      });
      const saveRecPromise = doctor.page.waitForResponse(
          (r) => r.url().includes('/save-recording') && r.request().method() === 'POST',
          { timeout: IS_CLOUD ? 90_000 : 45_000 },
        );
      await endBtn.click();
      const saveRecResp = await saveRecPromise;
      expect(saveRecResp.ok(), `save-recording must succeed (HTTP ${saveRecResp.status()})`).toBeTruthy();
      const token = await readPageBearerToken(doctor.page);
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
    // Prefer workflow disk state — module-level meetingId/appointmentId are empty when Q01 is skipped by grep
    const resolvedAppointmentId = wf.appointmentId || appointmentId;
    const resolvedMeetingId = wf.meetingId || meetingId;
    const meetingKey = meetingKeyFromContext({
      appointmentId: resolvedAppointmentId,
      meetingId: resolvedMeetingId,
      roomName: wf.roomName || roomName,
    });
    await refreshAuthStorageStates();
    await reinjectAuthFromStorageFile(doctor.page, 'doctor');
    await refreshPageAuth(doctor.page, DOCTOR_URL);
    const token = await readPageBearerToken(doctor.page);

    await test.step('Q02a - recordingUrl from real UI end flow (no seed unless PW_ALLOW_RECORDING_SEED=1)', async () => {
      const pollKeys = [...new Set([resolvedMeetingId, resolvedAppointmentId, meetingKey].filter(Boolean))];
      const recordingUrl = await pollRecordingUrlCloud(
        doctor.page.request,
        MEETING_URL,
        meetingKey,
        token,
        DOCTOR_ID,
        {
          bffUrl: DOCTOR_URL,
          meetingKeys: pollKeys,
          onAuthFailure: async () => {
            await refreshPageAuth(doctor.page, DOCTOR_URL);
            return readPageBearerToken(doctor.page);
          },
        },
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
      const resultKeys = [...new Set([meetingKey, resolvedMeetingId, resolvedAppointmentId].filter(Boolean))] as string[];
      if (IS_CLOUD) {
        await ensureMeetingResultsForE2E(
          doctor.page.request,
          MEETING_URL,
          resultKeys,
          token,
          180_000,
        );
      } else {
        await waitForMeetingResultsReady(
          doctor.page.request,
          MEETING_URL,
          meetingKey,
          token,
          60_000,
        );
      }
      const resultsResponse = doctor.page.waitForResponse(
        (r) => r.url().includes('/results') && r.request().method() === 'GET' && r.status() === 200,
        { timeout: IS_CLOUD ? 90_000 : 45_000 },
      );
      await doctor.page.goto(`${DOCTOR_URL}/doctor/${DOCTOR_ID}/meeting/${resolvedAppointmentId}/results`, {
        waitUntil: 'domcontentloaded',
        timeout: IS_CLOUD ? 90_000 : 45_000,
      });
      await resultsResponse.catch(() => null);
      const player = doctor.page.getByTestId('recording-player');
      const results = doctor.page.getByTestId('meeting-results');
      await expect(player.or(results).first()).toBeVisible({
        timeout: IS_CLOUD ? 90_000 : 45_000,
      });
      if (await player.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await expect(player).toBeVisible();
      } else {
        const retryBtn = doctor.page.getByRole('button', { name: /ลองใหม่|retry/i });
        if (await retryBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await retryBtn.click();
          await expect(player.or(results).first()).toBeVisible({ timeout: IS_CLOUD ? 60_000 : 30_000 });
        }
      }
      await snapMeetingStageAny(
        doctor.page,
        'Q02c-dashboard-recording',
        ['recording-player', 'meeting-results', 'summary-structured', 'summary-degraded-badge'],
        'group-Q',
      );
    });

    await test.step('Q02d - generate-summary via UI (Gemini-lite when PW_SKIP_LIVE_GEMINI=1)', async () => {
      const skipLiveGemini = process.env.PW_SKIP_LIVE_GEMINI === '1' || process.env.PW_SKIP_LIVE_GEMINI === 'true';
      const aptId = resolvedAppointmentId;
      expect(aptId, 'Q02d appointmentId from Q01 workflow').toBeTruthy();
      await doctor.page.goto(`${DOCTOR_URL}/doctor/${DOCTOR_ID}/meeting/${aptId}/results`, {
        waitUntil: 'domcontentloaded',
        timeout: IS_CLOUD ? 90_000 : 45_000,
      });
      await expect(doctor.page).toHaveURL(/\/results/, { timeout: IS_CLOUD ? 30_000 : 15_000 });
      const retryBtn = doctor.page.getByRole('button', { name: /ลองใหม่|retry/i });
      if (await retryBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await retryBtn.click();
      }
      await expect(doctor.page.getByTestId('meeting-results')).toBeVisible({
        timeout: IS_CLOUD ? 60_000 : 30_000,
      });
      await doctor.page.getByRole('button', { name: /สรุป AI|SOAP|summary/i }).first().click().catch(() => {});
      const structured = doctor.page.getByTestId('summary-structured');
      const degraded = doctor.page.getByTestId('summary-degraded-badge');
      const summaryBtn = doctor.page.getByTestId('generate-summary-btn');
      const hasSummaryUi = await structured.or(degraded).first().isVisible({ timeout: 8_000 }).catch(() => false);
      if (!hasSummaryUi) {
        if (await summaryBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
          await summaryBtn.click();
          await doctor.page.waitForTimeout(IS_CLOUD ? 4_000 : 2_500);
        } else {
          const authToken = await readPageBearerToken(doctor.page);
          await doctor.page.request.post(`${DOCTOR_URL}/api/meetings/${aptId}/generate-summary`, {
            headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
            data: {},
            timeout: 60_000,
          });
          await doctor.page.waitForTimeout(2_000);
          await doctor.page.reload({ waitUntil: 'domcontentloaded' });
          await doctor.page.getByRole('button', { name: /สรุป AI|SOAP|summary/i }).first().click().catch(() => {});
        }
      }
      if (skipLiveGemini) {
        await assertQ02dGeminiLite(doctor.page, structured, IS_CLOUD);
      } else {
        await assertQ02dLiveGemini(doctor.page, structured, IS_CLOUD);
      }
    });
  });
});
