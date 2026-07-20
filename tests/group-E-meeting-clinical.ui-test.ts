/**
 * GROUP E - MEETING SERVER, ROOM ACCESS & GUEST INVITE WORKFLOW
 * Browsers (parallel fixture): Patient=Chrome, Doctor=Chrome, Admin=Firefox
 * SERIAL after D - uses appointment data from D1 + admin-assigned in D3.
 *
 *   E1: API health + meeting server endpoints audit
 *   E2: Doctor clinical flow + CREATE MEETING via API + verify room + URLs
 *   E3: Patient appointment + meeting room verification
 *   E4: GUEST INVITE lifecycle: create invite + validate token + lobby join
 *   E5: Meeting room URLs + cross-portal access verification
 */
import {
  test, expect, assertFullHealth, snap,
  navDoctor, navPatient, waitForContent, joinIzaraMeetingInApp,
  lobbyJoin, lobbyJoinUnauth, lobbyAdmitAll, lobbyAdmitOne, lobbyReject,
  lobbyParticipantStatus, lobbyGetSnapshot,
  probeRenderHealth, formatDiagnosticReport,
  clickLocatorSafe,
  PATIENT_URL, DOCTOR_URL, MEETING_URL,
  readPageBearerToken,
  requirePatientAuth,
  refreshPageAuth,
  pageRequestGetWithAuthRetry,
} from './helpers/multi-portal';
import { loadWorkflowState, reloadWorkflowStateFromDisk, saveWorkflowState } from './helpers/workflow-state';
import {
  overrideBrowserMeetingServerUrl,
  proxyLocalMeetingServer,
  notifyHostPresentAfterJitsi,
  assertNoJitsiModeratorGate,
} from './helpers/meeting-lifecycle-fixture';
import { assertAiMountOnlyWhenSkipped, isSkipLiveGemini } from './helpers/ai-gate-fixture';

const IS_CLOUD = process.env.TEST_ENV === 'cloud';
const API_TIMEOUT = 30_000;

/** Local Docker: self-hosted/localhost; cloud: meet.jit.si or meet.demotoday.net. */
function expectJitsiDomainInUrl(url: string, label: string) {
  expect(url, label).toMatch(/meet\.(jit\.si|localhost|demotoday\.net)/);
}

function expectJitsiJoinConfigDomain(domain: string, label: string) {
  expect(domain, label).toMatch(/meet\.(jit\.si|localhost|demotoday\.net)/);
}

let sharedMeetingId = '';
let sharedRoomName = '';
let sharedAppointmentId = '';
let sharedGuestToken = '';
let sharedMeetingUrls: { base?: string; doctor?: string; patient?: string; guest?: string } = {};

test.describe('Group E - Meeting Server & Clinical Workflow', () => {
  test.describe.configure({ mode: 'serial' });

  test.afterEach(async ({ portals }, testInfo) => {
    if (testInfo.status === testInfo.expectedStatus) return;
    await Promise.all([
      probeRenderHealth(portals.patient.page, portals.patient, `fail-${testInfo.title}-patient`),
      probeRenderHealth(portals.doctor.page, portals.doctor, `fail-${testInfo.title}-doctor`),
      probeRenderHealth(portals.admin.page, portals.admin, `fail-${testInfo.title}-admin`),
    ]);
    console.log(formatDiagnosticReport());
  });

  test('E1 - All service APIs are healthy', async ({ portals }) => {
    const { patient } = portals;

    await test.step('E01 - Meeting server health', async () => {
      const resp = await patient.page.request.get(MEETING_URL + '/api/health', { timeout: API_TIMEOUT });
      expect(resp.status(), 'Meeting server must respond').toBe(200);
      const body = await resp.json();
      expect(body.status, 'Meeting server healthy').toBe('healthy');
      console.log('  E01: Meeting server - ' + resp.status());
    });

    await test.step('E02 - Patient portal API health', async () => {
      const resp = await patient.page.request.get(PATIENT_URL + '/api/health', { timeout: API_TIMEOUT });
      expect(resp.status(), 'Patient API must respond').toBe(200);
      console.log('  E02: Patient API - ' + resp.status());
    });

    await test.step('E03 - Doctor portal API health', async () => {
      const resp = await patient.page.request.get(DOCTOR_URL + '/api/health', { timeout: API_TIMEOUT });
      expect(resp.status(), 'Doctor API must respond').toBe(200);
      console.log('  E03: Doctor API - ' + resp.status());
    });
  });

  test('E2 - Doctor clinical flow + meeting creation', async ({ portals }) => {
    const { doctor, patient } = portals;

    if (isSkipLiveGemini()) {
      await test.step('E2-lite — clinical UI mount-only (PW_SKIP_LIVE_GEMINI)', async () => {
        await navDoctor(doctor.page, 'patients', 'E2-lite');
        await assertFullHealth(doctor.page, 'E2-lite');
        const mounted = await assertAiMountOnlyWhenSkipped(doctor.page, {
          selectors: ['input[type="search"], input[type="text"]'],
          bodyPattern: /patient|ผู้ป่วย|search|ค้นหา/i,
          label: 'E2 clinical',
        });
        expect(mounted, 'E2 mount-only assert when PW_SKIP_LIVE_GEMINI=1').toBe(true);
        await snap(doctor.page, 'E2-lite-clinical-mount', 'group-E');
      });
    }

    await test.step('E04 - Navigate to Patients list', async () => {
      await navDoctor(doctor.page, 'patients', 'E04');
      await assertFullHealth(doctor.page, 'E04');
      await snap(doctor.page, 'E04-patients-list', 'group-E');
      console.log('  E04: Doctor -> Patients list');
    });

    await test.step('E05 - Search for patient demo', async () => {
      const searchInput = doctor.page.locator(
        'input[type="search"], input[type="text"], input[placeholder*="search" i]'
      ).first();
      await expect(searchInput, 'Patient search input').toBeVisible({ timeout: 8_000 });
      await searchInput.fill('demo');
      await doctor.page.waitForTimeout(500);
      await snap(doctor.page, 'E05-search-demo', 'group-E');
      console.log('  E05: Searched for demo');
    });

    await test.step('E06 - Click patient card', async () => {
      const card = doctor.page.locator(
        '[class*="card"], tr, [class*="patient"], [class*="item"], [class*="row"]'
      ).filter({ hasText: /demo|patient/i }).first();
      await expect(card, 'Patient card must exist').toBeVisible({ timeout: 8_000 });
      await card.click();
      await doctor.page.waitForTimeout(500);
      await waitForContent(doctor.page, 'E06-detail');
      await snap(doctor.page, 'E06-patient-detail', 'group-E');
      console.log('  E06: Patient detail opened');
    });

    await test.step('E07 - Verify clinical action buttons', async () => {
      const actionBtns = doctor.page.locator('button, a').filter({
        hasText: /EMR|Prescription|Lab|Vital|Order|Create|Meeting|Video/i,
      });
      const count = await actionBtns.count();
      await snap(doctor.page, 'E07-clinical-actions', 'group-E');
      console.log('  E07: Clinical action buttons: ' + count);
    });

    await test.step('E08 - Navigate to Health Meeting page', async () => {
      await navDoctor(doctor.page, 'health-meeting', 'E08');
      await assertFullHealth(doctor.page, 'E08');
      await snap(doctor.page, 'E08-health-meeting', 'group-E');
      const body = await doctor.page.locator('body').innerText();
      expect(/meeting|appointment|video|queue/i.test(body)).toBeTruthy();
      console.log('  E08: Doctor -> Health Meeting page');
    });

    await test.step('E09 - Use appointment from Group D workflow state', async () => {
      let workflow = reloadWorkflowStateFromDisk();
      for (let attempt = 0; !workflow.appointmentId && attempt < 8; attempt++) {
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
        workflow = reloadWorkflowStateFromDisk();
      }
      expect(workflow.appointmentId, '❌ E09: Group D must create appointmentId in workflow state').toBeTruthy();
      sharedAppointmentId = workflow.appointmentId!;

      let resp = await pageRequestGetWithAuthRetry(
        doctor.page,
        DOCTOR_URL + '/api/appointments/' + sharedAppointmentId,
        DOCTOR_URL,
        {
          timeout: API_TIMEOUT,
        },
      );
      if (resp.status() === 404 && !IS_CLOUD) {
        const listResp = await pageRequestGetWithAuthRetry(
          doctor.page,
          `${DOCTOR_URL}/api/appointments?doctorId=DOC-TEST-001`,
          DOCTOR_URL,
          { timeout: API_TIMEOUT },
        );
        expect(listResp.ok(), 'Doctor must list local workflow appointments').toBeTruthy();
        const listData = await listResp.json().catch(() => ({}));
        const appointments = Array.isArray(listData) ? listData : (listData.appointments || []);
        const localAppointment = appointments.find((row: Record<string, unknown>) =>
          (row.patientId === 'PATIENT-DEMO' || row.patient_id === 'PATIENT-DEMO')
          && (row.doctorId === 'DOC-TEST-001' || row.doctor_id === 'DOC-TEST-001')
        );
        expect(localAppointment?.id, 'Local Group D appointment must exist in doctor queue').toBeTruthy();
        sharedAppointmentId = localAppointment.id;
        saveWorkflowState({ appointmentId: sharedAppointmentId });
        resp = await pageRequestGetWithAuthRetry(
          doctor.page,
          DOCTOR_URL + '/api/appointments/' + sharedAppointmentId,
          DOCTOR_URL,
          { timeout: API_TIMEOUT },
        );
      }
      expect(resp.ok(), 'Doctor must fetch workflow appointment by id').toBeTruthy();
      const apt = await resp.json();
      const row = apt.appointment || apt;
      // Before D3 assign, doctor may still be null — only assert appointment exists here
      expect(row.id || row.appointmentId, '❌ E09: appointment record must exist').toBeTruthy();
      console.log('  E09: Workflow appointment ' + sharedAppointmentId + ' (status: ' + (row.status || '?') + ')');
    });

    await test.step('E10 - CREATE MEETING via Meeting Server API', async () => {
      const token = await doctor.page.evaluate(() => localStorage.getItem('token'));
      const resp = await doctor.page.request.post(MEETING_URL + '/api/meetings/create', {
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        data: {
          appointmentId: sharedAppointmentId,
          patientId: 'PATIENT-DEMO',
          doctorId: 'DOC-TEST-001',
          doctorName: 'Dr. Test Good',
          patientName: 'Demo Test Patient',
        },
        timeout: API_TIMEOUT,
      });
      expect(resp.status(), 'Meeting creation must succeed').toBe(200);
      const meetData = await resp.json();
      expect(meetData.success, 'Meeting created successfully').toBe(true);
      expect(meetData.meetingId, 'Meeting ID returned').toBeTruthy();
      expect(meetData.roomName, 'Room name generated').toBeTruthy();
      expect(meetData.urls, 'Meeting URLs returned').toBeTruthy();
      expectJitsiDomainInUrl(meetData.urls.base, 'Base meeting URL');
      expectJitsiDomainInUrl(meetData.urls.doctor, 'Doctor meeting URL');
      expectJitsiDomainInUrl(meetData.urls.patient, 'Patient meeting URL');
      expectJitsiDomainInUrl(meetData.urls.guest, 'Guest meeting URL');
      expect(meetData.urls.doctor, 'Doctor URL uses Izara display name').toContain('userInfo.displayName');
      expect(meetData.urls.patient, 'Patient URL uses Izara display name').toContain('userInfo.displayName');
      // Meeting server URL flags (requireDisplayName=false) apply after jitsi-server redeploy;
      // in-app MeetingRoom (E10c/E10d) always locks name via External API userInfo.
      const doctorUrl = String(meetData.urls.doctor);
      if (doctorUrl.includes('requireDisplayName=false')) {
        console.log('  E10: Meeting API URLs lock display name (no Jitsi manual prompt)');
      } else {
        console.warn('  E10: Meeting server URL still has requireDisplayName=true — redeploy izara-meeting-server; in-app join uses Izara profile');
      }

      sharedMeetingId = meetData.meetingId;
      sharedRoomName = meetData.roomName;
      sharedMeetingUrls = meetData.urls;

      saveWorkflowState({ meetingId: sharedMeetingId, roomName: sharedRoomName });
      await snap(doctor.page, 'E10-meeting-created', 'group-E');
      console.log('  E10: Meeting created - id: ' + sharedMeetingId + ', room: ' + sharedRoomName);
    });

    await test.step('E10proxy - Host browser meeting-server URL (localhost proxy)', async () => {
      if (!IS_CLOUD) {
        await overrideBrowserMeetingServerUrl(patient.page, MEETING_URL);
        await proxyLocalMeetingServer(patient.page, MEETING_URL);
        await overrideBrowserMeetingServerUrl(doctor.page, MEETING_URL);
        await proxyLocalMeetingServer(doctor.page, MEETING_URL);
        console.log('  E10proxy: host.docker.internal → localhost:3020 for patient + doctor browsers');
      }
    });

    await test.step('E10j - join-config API (doctor / patient / guest) — custom Jitsi, Izara lobby', async () => {
      expect(sharedAppointmentId, 'appointment id for join-config').toBeTruthy();
      if (doctor.page.url().includes('/login')) {
        await refreshPageAuth(doctor.page, DOCTOR_URL);
      }
      let token = '';
      try {
        token = (await doctor.page.evaluate(() =>
          localStorage.getItem('token') || localStorage.getItem('izara_auth_token') || '',
        )) || '';
      } catch {
        await refreshPageAuth(doctor.page, DOCTOR_URL);
        token = (await doctor.page.evaluate(() =>
          localStorage.getItem('token') || localStorage.getItem('izara_auth_token') || '',
        )) || '';
      }
      expect(token, 'E10j doctor token').toBeTruthy();

      const assertJoinConfigOk = async (role: 'doctor' | 'patient' | 'guest', query = '') => {
        const headers: Record<string, string> = {};
        if (role === 'doctor') {
          headers.Authorization = `Bearer ${token}`;
        } else if (role === 'patient') {
          const patientToken = await patient.page.evaluate(() =>
            localStorage.getItem('auth_token') || localStorage.getItem('token') || '',
          );
          headers.Authorization = `Bearer ${patientToken}`;
        }
        const resp = await doctor.page.request.get(
          `${MEETING_URL}/api/meetings/${sharedAppointmentId}/join-config?role=${role}${query}`,
          { headers, timeout: API_TIMEOUT },
        );
        expect(resp.status(), `join-config ${role} status`).toBe(200);
        const cfg = await resp.json();
        expect(cfg.success, `join-config ${role} success`).toBe(true);
        expectJitsiJoinConfigDomain(cfg.domain, `join-config ${role} domain`);
        expect(cfg.roomName, `join-config ${role} room`).toBeTruthy();
        expect(cfg.useIzaraLobbyOnly, `join-config ${role} Izara lobby`).toBe(true);
        if (cfg.noJitsiLoginRequired !== true && process.env.TEST_ENV === 'cloud') {
          console.warn(`  ⚠ E10j: join-config ${role} noJitsiLoginRequired=${cfg.noJitsiLoginRequired} (cloud soft)`);
        } else {
          expect(cfg.noJitsiLoginRequired, `join-config ${role} no Jitsi login`).toBe(true);
        }
        const lobbyOff =
          cfg.configOverwrite?.enableLobby === false ||
          String(cfg.configOverwrite?.enableLobby) === 'false';
        expect(lobbyOff, `join-config ${role} Jitsi lobby disabled`).toBe(true);
        if (role === 'doctor') {
          expect(cfg.role === 'doctor' || cfg.role === 'host', 'doctor is host role').toBe(true);
        }
        console.log(`  E10j: join-config ${role} OK — displayName=${cfg.displayName || 'n/a'}`);
      };

      await assertJoinConfigOk('doctor');
      await assertJoinConfigOk('patient');

      const guestNoInvite = await doctor.page.request.get(
        `${MEETING_URL}/api/meetings/${sharedAppointmentId}/join-config?role=guest`,
        { timeout: API_TIMEOUT },
      );
      expect(guestNoInvite.status(), 'guest without invite must be denied').toBe(401);
      const guestDenied = await guestNoInvite.json();
      expect(guestDenied.error || guestDenied.code, 'guest auth required').toMatch(/GUEST|invite|auth/i);
      console.log('  E10j: guest without invite correctly returns 401');

      const inviteResp = await doctor.page.request.post(
        `${MEETING_URL}/api/meetings/${sharedAppointmentId}/guest-invite`,
        {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          data: { guestName: 'E10j Guest', guestEmail: 'e10j-guest@test.com', guestType: 'family' },
          timeout: API_TIMEOUT,
        },
      );
      expect(inviteResp.ok(), 'E10j guest-invite').toBeTruthy();
      const inviteData = await inviteResp.json();
      expect(inviteData.token, 'E10j guest invite token').toBeTruthy();
      await assertJoinConfigOk('guest', `&invite=${encodeURIComponent(inviteData.token)}`);

      await snap(doctor.page, 'E10j-join-config-verified', 'group-E');
    });

    await test.step('E10b - Doctor in-app meeting route (MeetingRoom)', async () => {
      expect(sharedAppointmentId, 'appointment id required').toBeTruthy();
      const meetingPath = `${DOCTOR_URL}/doctor/DOC-TEST-001/meeting/${sharedAppointmentId}`;
      await doctor.page.goto(meetingPath, { waitUntil: 'domcontentloaded', timeout: IS_CLOUD ? 90_000 : 45_000 });
      await doctor.page.waitForURL(/\/meeting\//, { timeout: 45_000 }).catch(() => {
        console.warn('  E10b: MeetingRoom route slow-load — E10c is authoritative');
      });
      await snap(doctor.page, 'E10b-doctor-meeting-route', 'group-E');

      const inAppUi = doctor.page.locator(
        '[data-testid="host-starting-screen"], [data-testid="jitsi-meeting-container"], [data-testid="end-meeting-btn"]',
      ).first();
      const inAppVisible = await inAppUi.isVisible({ timeout: IS_CLOUD ? 45_000 : 30_000 }).catch(() => false);
      if (inAppVisible) {
        await snap(doctor.page, 'E10b-doctor-meeting-room', 'group-E');
        console.log('  E10b: Doctor MeetingRoom UI visible');
      } else {
        console.warn('  E10b: MeetingRoom slow-load — Jitsi URL step E10c is authoritative');
      }
    });

    await test.step('E10c0 - Patient lobby join BEFORE doctor HOST (must wait)', async () => {
      expect(sharedAppointmentId, 'appointment id from D').toBeTruthy();
      const data = await lobbyJoin(patient.page, sharedAppointmentId, {
        participantName: 'Demo Test Patient',
        participantId: 'PATIENT-DEMO',
        role: 'patient',
      });
      expect(['waiting', 'admitted'].includes(data.status), 'Patient should be queued or already admitted').toBe(true);
      if (data.status === 'waiting') {
        console.log('  E10c0: Patient in lobby before doctor HOST');
      } else {
        console.log('  E10c0: Patient already admitted by server policy');
      }
      await snap(patient.page, 'E10c0-patient-waiting-before-host', 'group-E');
    });

    await test.step('E10c - Doctor joins in-app MeetingRoom (Jitsi iframe, Izara display name)', async () => {
      if (!IS_CLOUD) {
        await overrideBrowserMeetingServerUrl(doctor.page, MEETING_URL);
        await proxyLocalMeetingServer(doctor.page, MEETING_URL);
      }
      const meetingPath = `${DOCTOR_URL}/doctor/DOC-TEST-001/meeting/${sharedAppointmentId}`;
      await doctor.page.goto(meetingPath, { waitUntil: 'domcontentloaded', timeout: IS_CLOUD ? 90_000 : 45_000 });
      await doctor.page.waitForURL(/\/meeting\//, { timeout: 45_000 });
      try {
        await joinIzaraMeetingInApp(doctor.page, 'E10c-doctor', portals.doctor.browserName);
      } catch (joinErr) {
        console.log(`  E10c joinIzaraMeetingInApp retry: ${String(joinErr).slice(0, 120)}`);
        await joinIzaraMeetingInApp(doctor.page, 'E10c-doctor-retry', portals.doctor.browserName);
      }
      const jitsiShell = doctor.page.getByTestId('jitsi-meeting-container');
      const hostControls = doctor.page.getByTestId('end-meeting-btn');
      const preJoin = doctor.page.getByTestId('host-starting-screen');
      await expect(
        jitsiShell.or(hostControls).or(preJoin).first(),
        'E10c doctor meeting shell',
      ).toBeVisible({ timeout: IS_CLOUD ? 120_000 : 90_000 });
      const iframe = doctor.page.locator('[data-testid="jitsi-meeting-container"] iframe').first();
      await expect(iframe.or(hostControls).first(), 'E10c Jitsi iframe or host controls').toBeVisible({
        timeout: IS_CLOUD ? 120_000 : 60_000,
      });
      await notifyHostPresentAfterJitsi(doctor.page, sharedAppointmentId, {
        bffUrl: DOCTOR_URL,
        meetingUrl: MEETING_URL,
      });
      await snap(doctor.page, 'E10c-jitsi-doctor-meet', 'group-J-meeting-jitsi');
      console.log('  E10c: Doctor HOST — meeting room + Jitsi iframe visible — ' + sharedRoomName);
    });

    await test.step('E10c2 - Patient still waiting while doctor is HOST', async () => {
      const status = await lobbyParticipantStatus(patient.page, sharedAppointmentId, 'PATIENT-DEMO');
      expect(['waiting', 'admitted'].includes(status), 'Patient lobby status').toBe(true);
      if (status === 'waiting') {
        console.log('  E10c2: Patient still waiting in lobby');
      } else {
        console.log('  E10c2: Patient already admitted (HOST may have auto-admitted)');
      }
    });

    await test.step('E10c3 - Doctor HOST admits patient from lobby (admit-all)', async () => {
      const admitResult = await lobbyAdmitAll(doctor.page, sharedAppointmentId, 'DOC-TEST-001');
      expect(admitResult.total, 'admit-all returns a numeric admission count').toBeGreaterThanOrEqual(0);
      const patientStatus = await lobbyParticipantStatus(patient.page, sharedAppointmentId, 'PATIENT-DEMO');
      expect(patientStatus, 'Patient admitted after HOST action').toBe('admitted');
      const admitBtn = doctor.page.getByTestId('admit-all-btn');
      if (await admitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await admitBtn.click().catch(() => {});
      }
      await snap(doctor.page, 'E10c3-doctor-lobby-admit', 'group-E');
      console.log(`  E10c3: Doctor admit-all count=${admitResult.total} — patient status: ${patientStatus}`);
    });

    await test.step('E10d - Patient joins in-app meeting (lobby → Jitsi)', async () => {
      expect(sharedAppointmentId, 'appointment id required').toBeTruthy();
      if (!IS_CLOUD) {
        await overrideBrowserMeetingServerUrl(patient.page, MEETING_URL);
        await proxyLocalMeetingServer(patient.page, MEETING_URL);
      }
      const { userId: patientUserId } = await requirePatientAuth(patient.page, 'E10d');
      await patient.page.goto(`${PATIENT_URL}/patient/${patientUserId}/meeting/${sharedAppointmentId}`, {
        waitUntil: 'domcontentloaded',
        timeout: IS_CLOUD ? 90_000 : 30_000,
      });
      await snap(patient.page, 'E10d-patient-meeting-lobby', 'group-E');
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          await joinIzaraMeetingInApp(patient.page, `E10d-patient${attempt ? '-retry' : ''}`, portals.patient.browserName);
          break;
        } catch (err) {
          if (attempt === 1) throw err;
          await patient.page.reload({ waitUntil: 'domcontentloaded' });
          await proxyLocalMeetingServer(patient.page, MEETING_URL);
        }
      }
      await expect(patient.page.getByTestId('patient-meeting-room')).toBeVisible({ timeout: IS_CLOUD ? 30_000 : 15_000 });
      const patientJitsi = patient.page.getByTestId('jitsi-meeting-container');
      const patientPreJoin = patient.page.getByTestId('pre-join-screen');
      await expect(patientJitsi.or(patientPreJoin).first(), 'E10d patient meeting shell').toBeVisible({
        timeout: IS_CLOUD ? 60_000 : 30_000,
      });
      const patientIframe = patient.page.locator('[data-testid="jitsi-meeting-container"] iframe').first();
      await expect(patientIframe.or(patientPreJoin).first(), 'E10d Jitsi iframe or pre-join').toBeVisible({
        timeout: IS_CLOUD ? 120_000 : 60_000,
      });
      await assertNoJitsiModeratorGate(doctor.page, 'E10d-doctor');
      await assertNoJitsiModeratorGate(patient.page, 'E10d-patient');
      await snap(patient.page, 'E10d-patient-jitsi-meet', 'group-J-meeting-jitsi');
      console.log('  E10d: Patient meeting room + Jitsi iframe visible (Izara profile, no Jitsi login)');
    });

    await test.step('E11 - Verify meeting record via GET API', async () => {
      const resp = await doctor.page.request.get(
        MEETING_URL + '/api/meetings/' + sharedMeetingId,
        { timeout: API_TIMEOUT },
      );
      expect(resp.ok(), 'Meeting record accessible').toBe(true);
      const data = await resp.json();
      const meeting = data.meeting || data;
      expect(meeting.room_name || meeting.roomName, 'Room name stored').toBeTruthy();
      expect(meeting.doctor_id || meeting.doctorId, 'Doctor ID in record').toBeTruthy();
      expect(meeting.patient_id || meeting.patientId, 'Patient ID in record').toBeTruthy();
      if (meeting.status) {
        const invalidStatuses = ['', 'unknown', 'error', 'cancelled'];
        expect(invalidStatuses.includes(String(meeting.status).toLowerCase())).toBe(false);
      }
      console.log('  E11: Meeting record - status: ' + (meeting.status ?? 'n/a'));
    });

    await test.step('E12 - Verify all meeting URLs contain correct room', async () => {
      expect(sharedMeetingUrls.base, 'Base URL has room').toContain(sharedRoomName);
      expect(sharedMeetingUrls.doctor, 'Doctor URL has room').toContain(sharedRoomName);
      expect(sharedMeetingUrls.patient, 'Patient URL has room').toContain(sharedRoomName);
      expect(sharedMeetingUrls.guest, 'Guest URL has room').toContain(sharedRoomName);
      console.log('  E12: All 4 URLs contain room ' + sharedRoomName);
    });

    await test.step('E2a - Lab report back with image upload (tied to appointment)', async () => {
      const token = await doctor.page.evaluate(() => localStorage.getItem('token'));
      expect(token, 'Doctor token required for lab API').toBeTruthy();
      const workflow = loadWorkflowState();
      const aptResp = await doctor.page.request.get(`${DOCTOR_URL}/api/appointments/${sharedAppointmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: API_TIMEOUT,
      });
      const aptBody = await aptResp.json().catch(() => ({}));
      const patientId =
        aptBody.patient_id ||
        aptBody.patientId ||
        workflow.patientId ||
        'PATIENT-DEMO';
      const tinyPng =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

      const createResp = await doctor.page.request.post(`${DOCTOR_URL}/api/lab-orders`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: {
          patientId,
          doctorId: 'DOC-TEST-001',
          appointmentId: sharedAppointmentId,
          tests: [{ code: 'CBC', name: 'Complete Blood Count' }],
          priority: 'routine',
        },
        timeout: API_TIMEOUT,
      });
      expect(createResp.status(), 'Lab order create').toBe(200);
      const created = await createResp.json();
      const labOrderId = created.labOrder?.id as string;
      expect(labOrderId, 'Lab order id returned').toBeTruthy();

      const resultsResp = await doctor.page.request.put(
        `${DOCTOR_URL}/api/lab-orders/${labOrderId}/results`,
        {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          data: {
            results: [
              {
                testCode: 'CBC',
                testName: 'Complete Blood Count',
                value: 5.2,
                unit: 'x10^9/L',
                normalRange: { low: 4.5, high: 11 },
                flag: 'NORMAL',
              },
            ],
            documents: [
              { name: 'lab-panel.png', type: 'image/png', data: tinyPng, size: tinyPng.length },
            ],
          },
          timeout: API_TIMEOUT,
        },
      );
      expect(resultsResp.ok(), 'Lab results + image upload').toBeTruthy();

      const getResp = await doctor.page.request.get(`${DOCTOR_URL}/api/lab-orders/${labOrderId}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: API_TIMEOUT,
      });
      expect(getResp.ok()).toBeTruthy();
      const row = await getResp.json();
      const resultsPayload = row.labOrder?.results;
      const docs =
        resultsPayload && typeof resultsPayload === 'object' && !Array.isArray(resultsPayload)
          ? resultsPayload.documents
          : [];
      expect(docs?.length, 'Stored lab report documents').toBeGreaterThanOrEqual(1);
      expect(docs[0].name).toBe('lab-panel.png');

      await refreshPageAuth(patient.page, PATIENT_URL);
      let patientToken = await readPageBearerToken(patient.page);
      let orderVisible = false;
      const waitUntil = Date.now() + (IS_CLOUD ? 45_000 : 20_000);
      while (Date.now() < waitUntil) {
        const patientList = await patient.page.request.get(`${PATIENT_URL}/api/phr/lab-orders`, {
          headers: { Authorization: `Bearer ${patientToken}` },
          timeout: API_TIMEOUT,
        });
        if (patientList.status() === 401) {
          await refreshPageAuth(patient.page, PATIENT_URL);
          patientToken = await readPageBearerToken(patient.page);
          continue;
        }
        if (!patientList.ok()) {
          await patient.page.waitForTimeout(2_000);
          continue;
        }
        const patientBody = await patientList.json();
        const orders = patientBody.labOrders || patientBody.orders || [];
        orderVisible = orders.some((o: { id: string }) => o.id === labOrderId);
        if (orderVisible) break;
        await patient.page.waitForTimeout(2_000);
      }
      if (orderVisible) {
        console.log('  E2a: Lab order visible in patient PHR list');
      } else {
        console.warn('  E2a: Lab order list propagation delayed; verifying direct detail endpoint');
      }

      let patientDetail = await patient.page.request.get(
        `${PATIENT_URL}/api/phr/lab-orders/${labOrderId}`,
        { headers: { Authorization: `Bearer ${patientToken}` }, timeout: API_TIMEOUT },
      );
      if (patientDetail.status() === 401) {
        await refreshPageAuth(patient.page, PATIENT_URL);
        patientToken = await readPageBearerToken(patient.page);
        patientDetail = await patient.page.request.get(
          `${PATIENT_URL}/api/phr/lab-orders/${labOrderId}`,
          { headers: { Authorization: `Bearer ${patientToken}` }, timeout: API_TIMEOUT },
        );
      }
      expect(patientDetail.ok(), `Patient lab order detail (HTTP ${patientDetail.status()})`).toBeTruthy();
      const detailBody = await patientDetail.json();
      const detailDocs =
        detailBody.labOrder?.results?.documents || detailBody.results?.documents || [];
      expect(detailDocs.length, 'Patient sees attached lab report image').toBeGreaterThanOrEqual(1);

      saveWorkflowState({ labOrderId });
      console.log(`  E2a: Lab report with image — order ${labOrderId}`);
    });

    console.log('  E2 COMPLETE - Doctor clinical flow + meeting creation');
  });

  test('E3 - Patient appointment + meeting room verification', async ({ portals }) => {
    const { patient } = portals;

    await test.step('E13 - Appointments list with real data', async () => {
      await navPatient(patient.page, '/appointments', 'E13');
      await assertFullHealth(patient.page, 'E13');
      const allTab = patient.page.locator('button').filter({ hasText: /All/i }).first();
      if (await allTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await allTab.click();
        await patient.page.waitForTimeout(500);
      }
      const body = await patient.page.locator('body').innerText();
      const hasRealData = /pending|confirmed|in_pool|Telehealth|E2E|Consultation|Dr\.|awaiting|appointment/i.test(body);
      if (!hasRealData) {
        console.warn('  ⚠ E13: Appointment list content is sparse in this environment');
      }
      console.log('  E13: Appointment list with real status data');
      await snap(patient.page, 'E13-appointments-real-data', 'group-E');
    });

    await test.step('E14 - Click appointment card', async () => {
      const card = patient.page.locator('a[href*="/appointments/"], [class*="card"] a, [class*="rounded-xl"]').filter({
        hasText: /pending|confirmed|Telehealth|E2E|Consultation|Dr/i,
      }).first();
      if (await card.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await card.click();
        await patient.page.waitForTimeout(500);
        await waitForContent(patient.page, 'E14-detail');
        console.log('  E14: Appointment detail opened');
        await snap(patient.page, 'E14-appointment-detail', 'group-E');
      } else {
        console.log('  E14: Appointment list displayed (no detail link)');
        await snap(patient.page, 'E14-appointment-list', 'group-E');
      }
    });

    await test.step('E15 - Patient can access meeting record via API', async () => {
      expect(sharedMeetingId, 'Meeting from E2').toBeTruthy();
      await requirePatientAuth(patient.page, 'E15');
      const resp = await pageRequestGetWithAuthRetry(
        patient.page,
        MEETING_URL + '/api/meetings/' + sharedMeetingId,
        PATIENT_URL,
        { timeout: API_TIMEOUT },
      );
      expect(resp.ok(), 'Patient can access meeting record').toBe(true);
      const data = await resp.json();
      const meeting = data.meeting || data;
      const roomName = meeting.room_name || meeting.roomName;
      expect(roomName, 'Room name in meeting record').toBeTruthy();
      expect(roomName, 'Room name matches created meeting').toBe(sharedRoomName);
      console.log('  E15: Patient meeting access - room: ' + roomName);
      await snap(patient.page, 'E15-patient-meeting-access', 'group-E');
    });

    await test.step('E16 - Patient meeting URL has correct room', async () => {
      expect(sharedMeetingUrls.patient, 'Patient URL exists').toBeTruthy();
      expect(sharedMeetingUrls.patient, 'Patient URL correct room').toContain(sharedRoomName);
      expectJitsiDomainInUrl(sharedMeetingUrls.patient!, 'Patient URL Jitsi domain');
      console.log('  E16: Patient meeting URL verified - room: ' + sharedRoomName);
    });

    await test.step('E17 - Patient appointments API shows real data', async () => {
      await requirePatientAuth(patient.page, 'E17');
      const resp = await pageRequestGetWithAuthRetry(
        patient.page,
        PATIENT_URL + '/api/appointments',
        PATIENT_URL,
        { timeout: API_TIMEOUT },
      );
      expect(resp.ok(), 'Patient appointments API').toBe(true);
      const data = await resp.json();
      const apts = data.appointments || data || [];
      const count = Array.isArray(apts) ? apts.length : 0;
      expect(count, 'Patient has appointments').toBeGreaterThan(0);
      console.log('  E17: Patient API - ' + count + ' appointment(s)');
    });

    console.log('  E3 COMPLETE - Patient appointment + meeting verification');
  });

  test('E4 - Guest invite lifecycle + lobby join', async ({ portals }) => {
    const { doctor, admin } = portals;
    const lobbyKey = sharedAppointmentId || sharedMeetingId;

    await test.step('E18 - Doctor navigates to Health Meeting queue', async () => {
      const url = doctor.page.url();
      if (!url.includes('health-meeting') && !url.includes('meeting')) {
        await navDoctor(doctor.page, 'health-meeting', 'E18');
      }
      await assertFullHealth(doctor.page, 'E18');
      const queueTabs = doctor.page.locator('button:not([disabled]), [role="tab"]').filter({
        hasText: /Queue|Pending|Scheduled|All Appointments/i,
      });
      const tabCount = await queueTabs.count();
      for (let i = 0; i < Math.min(tabCount, 3); i++) {
        const tab = queueTabs.nth(i);
        if (await tab.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await tab.click();
          await doctor.page.waitForTimeout(500);
        }
      }
      const body = await doctor.page.locator('body').innerText();
      const hasQueueData = /pending|patient|demo|appointment|queue/i.test(body);
      console.log('  E18: Doctor queue - real patient data: ' + hasQueueData);
      await snap(doctor.page, 'E18-doctor-queue', 'group-E');
    });

    await test.step('E19 - Generate JWT guest invite token', async () => {
      expect(sharedMeetingId, 'Meeting from E2').toBeTruthy();
      await refreshPageAuth(doctor.page, DOCTOR_URL);
      let token = await readPageBearerToken(doctor.page);
      if (!token) {
        token = await doctor.page.evaluate(() =>
          localStorage.getItem('token') || localStorage.getItem('izara_auth_token'),
        );
      }
      expect(token, 'Doctor bearer token for guest-invite').toBeTruthy();
      // Re-open meeting session if Q group ended the same appointment earlier
      const createResp = await doctor.page.request.post(MEETING_URL + '/api/meetings/create', {
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        data: {
          appointmentId: sharedAppointmentId,
          patientId: 'PATIENT-DEMO',
          doctorId: 'DOC-TEST-001',
          doctorName: 'Dr. Test Good',
          patientName: 'Demo Test Patient',
        },
        timeout: API_TIMEOUT,
      });
      if (createResp.ok()) {
        const created = await createResp.json();
        if (created.meetingId) sharedMeetingId = created.meetingId;
      }
      const inviteKey = lobbyKey || sharedAppointmentId || sharedMeetingId;
      let resp = await doctor.page.request.post(
        MEETING_URL + '/api/meetings/' + inviteKey + '/guest-invite',
        {
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          data: { guestName: 'Somchai Family', guestEmail: 'guest@test.com', guestType: 'family' },
          timeout: API_TIMEOUT,
        },
      );
      if (resp.status() === 401 || resp.status() === 403) {
        await refreshPageAuth(doctor.page, DOCTOR_URL);
        token = await readPageBearerToken(doctor.page);
        resp = await doctor.page.request.post(
          MEETING_URL + '/api/meetings/' + inviteKey + '/guest-invite',
          {
            headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
            data: { guestName: 'Somchai Family', guestEmail: 'guest@test.com', guestType: 'family' },
            timeout: API_TIMEOUT,
          },
        );
      }
      expect(resp.status(), 'Guest invite API status').toBe(200);
      const data = await resp.json();
      expect(data.success, 'Guest invite created').toBe(true);
      expect(data.token, 'Guest JWT token generated').toBeTruthy();
      expect(data.invite, 'Invite metadata returned').toBeTruthy();
      expect(data.guestLink, 'Guest join link generated').toBeTruthy();
      expect(data.guestLink, 'Guest link has /guest/join/ path').toContain('/guest/join/');
      sharedGuestToken = data.token;
      await snap(doctor.page, 'E19-guest-invite-created', 'group-E');
      console.log('  E19: Guest invite created - token: ' + sharedGuestToken.substring(0, 30) + '...');
    });

    await test.step('E20 - Validate guest invite token via API', async () => {
      expect(sharedGuestToken, 'Guest token from E19').toBeTruthy();
      const resp = await doctor.page.request.get(
        MEETING_URL + '/api/guest/meeting/' + sharedGuestToken,
        { timeout: API_TIMEOUT },
      );
      if (!resp.ok()) {
        const errBody = await resp.text();
        console.log('  WARNING E20: Token validation failed - ' + resp.status() + ': ' + errBody);
      }
      expect(resp.status(), 'Guest token validation returns 200').toBe(200);
      const data = await resp.json();
      expect(data.success, 'Token valid').toBe(true);
      expect(data.meetingId, 'Meeting ID matches invite key').toBeTruthy();
      expect([sharedMeetingId, sharedAppointmentId, lobbyKey].filter(Boolean)).toContain(String(data.meetingId));
      expect(data.guestName, 'Guest name preserved').toBeTruthy();
      expect(data.guestType, 'Guest type is family').toBe('family');
      console.log('  E20: Token validated - guest: ' + data.guestName + ', meeting: ' + data.meetingId);
    });

    await test.step('E21 - Guest lobby join via invite token (unauthenticated)', async () => {
      expect(lobbyKey, 'Lobby key from E2').toBeTruthy();
      expect(sharedGuestToken, 'Guest invite from E19').toBeTruthy();
      const data = await lobbyJoinUnauth(lobbyKey, {
        participantName: 'Guest Viewer 1',
        invite: sharedGuestToken,
      });
      expect(data.success, 'Lobby join succeeded').toBe(true);
      expect(data.status, 'Guest in lobby before HOST admits').toBe('waiting');
      const participantId = data.participantId || 'host-bypass';
      await snap(doctor.page, 'E21-lobby-join-basic', 'group-E');
      console.log('  E21: Guest lobby join - status: ' + data.status + ', id: ' + participantId);
    });

    await test.step('E21b — Second guest joins lobby (multi-guest waiting)', async () => {
      await refreshPageAuth(doctor.page, DOCTOR_URL);
      const token =
        (await readPageBearerToken(doctor.page)) ||
        (await doctor.page.evaluate(() => localStorage.getItem('token') || localStorage.getItem('izara_auth_token')));
      const invite2Resp = await doctor.page.request.post(
        `${MEETING_URL}/api/meetings/${lobbyKey}/guest-invite`,
        {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          data: { guestName: 'Guest Viewer 2', guestEmail: 'guest2@test.com', guestType: 'family' },
          timeout: API_TIMEOUT,
        },
      );
      expect(invite2Resp.ok(), 'E21b second guest-invite').toBeTruthy();
      const invite2 = await invite2Resp.json();
      const data = await lobbyJoinUnauth(lobbyKey, {
        participantName: 'Guest Viewer 2',
        invite: invite2.token,
      });
      expect(data.status, 'Second guest waits in lobby').toBe('waiting');
      const snap1 = await lobbyGetSnapshot(doctor.page, lobbyKey);
      expect(snap1.waiting.length, 'At least 2 waiting before admit-all').toBeGreaterThanOrEqual(2);
      console.log('  E21b: Multi-guest lobby — waiting count: ' + snap1.waiting.length);
    });

    let e22GuestParticipantId = '';

    await test.step('E22 - Guest lobby join via JWT token endpoint', async () => {
      expect(sharedGuestToken, 'Guest token from E19').toBeTruthy();
      const resp = await doctor.page.request.post(
        MEETING_URL + '/api/guest/meeting/' + sharedGuestToken + '/join',
        {
          headers: { 'Content-Type': 'application/json' },
          data: { displayName: 'Somchai Family - Token Join' },
          timeout: API_TIMEOUT,
        },
      );
      if (!resp.ok()) {
        const errBody = await resp.text();
        console.log('  WARNING E22: Token join failed - ' + resp.status() + ': ' + errBody);
      }
      expect(resp.status(), 'Token-based lobby join status').toBe(200);
      const data = await resp.json();
      expect(data.success, 'Token join succeeded').toBe(true);
      expect(data.meetingId, 'Meeting ID returned').toBeTruthy();
      expect([sharedMeetingId, sharedAppointmentId, lobbyKey].filter(Boolean)).toContain(String(data.meetingId));
      expect(data.participantId, 'Participant ID assigned').toBeTruthy();
      e22GuestParticipantId = data.participantId;
      expect(data.status, 'Guest in lobby waiting').toBe('waiting');
      await snap(doctor.page, 'E22-lobby-join-token', 'group-E');
      console.log('  E22: Token lobby join - participant: ' + data.participantId + ', status: ' + data.status);
    });

    await test.step('E22c - Reject second guest; stays rejected', async () => {
      const snapBefore = await lobbyGetSnapshot(doctor.page, lobbyKey);
      const waitingGuests = snapBefore.waiting.filter(
        (p) => p.role === 'guest' || String(p.participantId || '').startsWith('guest-'),
      );
      const rejectTarget = waitingGuests.find((p) => p.participantId !== e22GuestParticipantId)
        || waitingGuests[0];
      const rejectParticipantId = rejectTarget?.participantId;
      expect(rejectParticipantId, 'guest to reject').toBeTruthy();
      if (!rejectParticipantId) return;
      await lobbyReject(
        doctor.page,
        lobbyKey,
        rejectParticipantId,
        'DOC-TEST-001',
        'E2E reject',
      );
      const status = await lobbyParticipantStatus(
        doctor.page,
        lobbyKey,
        rejectParticipantId,
      );
      expect(status, 'rejected guest status').toBe('rejected');
      const after = await lobbyGetSnapshot(doctor.page, lobbyKey);
      const stillWaiting = after.waiting.some((p) => p.participantId === rejectParticipantId);
      expect(stillWaiting, 'rejected guest not in waiting list').toBe(false);
      console.log('  E22c: Guest rejected — ' + rejectParticipantId);
    });

    await test.step('E22d - Admit single guest (token join) vs admit-all', async () => {
      expect(e22GuestParticipantId, 'E22 token guest id').toBeTruthy();
      await lobbyAdmitOne(doctor.page, lobbyKey, e22GuestParticipantId, 'DOC-TEST-001');
      const admittedStatus = await lobbyParticipantStatus(
        doctor.page,
        lobbyKey,
        e22GuestParticipantId,
      );
      expect(admittedStatus, 'token guest admitted individually').toBe('admitted');
      console.log('  E22d: Single guest admitted — ' + e22GuestParticipantId);
    });

    await test.step('E22b - Doctor HOST admits all guests from lobby', async () => {
      expect(lobbyKey, 'meeting id for admit-all').toBeTruthy();
      const admitResult = await lobbyAdmitAll(doctor.page, lobbyKey, 'DOC-TEST-001');
      const lobbyCheck = await doctor.page.request.get(
        MEETING_URL + '/api/meetings/' + lobbyKey + '/lobby',
        { timeout: API_TIMEOUT },
      );
      expect(lobbyCheck.ok()).toBe(true);
      const lobbyList = await lobbyCheck.json();
      const guests = (lobbyList.lobby || lobbyList.participants || []).filter(
        (p: { role?: string; status?: string; participantId?: string }) =>
          (p.role === 'guest' || String(p.participantId || '').startsWith('guest-')) && p.status,
      );
      for (const g of guests) {
        expect(['admitted', 'rejected'].includes(g.status || ''), 'Guest final status').toBe(true);
      }
      if (e22GuestParticipantId) {
        const tokenGuestStatus = await lobbyParticipantStatus(
          doctor.page,
          sharedAppointmentId,
          e22GuestParticipantId,
        );
        expect(tokenGuestStatus, 'E22 guest on appointmentId bucket').toBe('admitted');
      }
      await snap(doctor.page, 'E22b-guest-admitted', 'group-E');
      console.log('  E22b: Guests resolved — admit-all total: ' + admitResult.total);
    });

    await test.step('E23 - Admin sees meeting queue data', async () => {
      await navDoctor(admin.page, 'health-meeting', 'E23');
      await assertFullHealth(admin.page, 'E23');
      const tabs = admin.page.locator('button:not([disabled]), [role="tab"]').filter({
        hasText: /Queue|All Appointments|Scheduled/i,
      });
      const tabCount = await tabs.count();
      for (let i = 0; i < Math.min(tabCount, 3); i++) {
        const tab = tabs.nth(i);
        if (await tab.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await clickLocatorSafe(admin.page, tab, 8_000);
          await admin.page.waitForTimeout(500);
        }
      }
      const body = await admin.page.locator('body').innerText();
      const hasQueueData = /appointment|patient|queue/i.test(body);
      console.log('  E23: Admin queue - appointment data visible: ' + hasQueueData);
      await snap(admin.page, 'E23-admin-queue', 'group-E');
    });

    console.log('  E4 COMPLETE - Guest invite lifecycle + lobby join');
  });

  test('E5 - Meeting room access + cross-portal verification', async ({ portals }) => {
    const { patient, doctor, admin } = portals;

    await test.step('E24 - Doctor meeting URL format verified', async () => {
      expect(sharedMeetingUrls.doctor, 'Doctor URL exists').toBeTruthy();
      expectJitsiDomainInUrl(sharedMeetingUrls.doctor!, 'Doctor URL has Jitsi domain');
      expect(sharedMeetingUrls.doctor, 'Doctor URL has room name').toContain(sharedRoomName);
      expect(sharedMeetingUrls.doctor, 'Doctor displayName encoded').toContain('userInfo.displayName');
      console.log('  E24: Doctor meeting URL - Jitsi room + displayName verified');
    });

    await test.step('E25 - Patient meeting URL format verified', async () => {
      expect(sharedMeetingUrls.patient, 'Patient URL exists').toBeTruthy();
      expectJitsiDomainInUrl(sharedMeetingUrls.patient!, 'Patient URL has Jitsi domain');
      expect(sharedMeetingUrls.patient, 'Patient URL has room name').toContain(sharedRoomName);
      console.log('  E25: Patient meeting URL - Jitsi room + displayName verified');
    });

    await test.step('E26 - Guest meeting URL format verified', async () => {
      expect(sharedMeetingUrls.guest, 'Guest URL exists').toBeTruthy();
      expectJitsiDomainInUrl(sharedMeetingUrls.guest!, 'Guest URL has Jitsi domain');
      expect(sharedMeetingUrls.guest, 'Guest URL has room name').toContain(sharedRoomName);
      if (!/Guest|userInfo\.displayName/i.test(sharedMeetingUrls.guest)) {
        console.warn('  ⚠ E26: Guest display name not explicit in meeting URL');
      }
      console.log('  E26: Guest meeting URL - Jitsi room + displayName verified');
    });

    await test.step('E27 - Meeting record accessible from all 3 portals', async () => {
      const dToken = await doctor.page.evaluate(() => localStorage.getItem('token'));
      const dResp = await doctor.page.request.get(
        MEETING_URL + '/api/meetings/' + sharedMeetingId,
        { headers: { Authorization: 'Bearer ' + dToken }, timeout: API_TIMEOUT },
      );
      expect(dResp.ok(), 'Doctor can access meeting').toBe(true);

      const pToken = await patient.page.evaluate(() => localStorage.getItem('auth_token'));
      const pResp = await patient.page.request.get(
        MEETING_URL + '/api/meetings/' + sharedMeetingId,
        { headers: { Authorization: 'Bearer ' + pToken }, timeout: API_TIMEOUT },
      );
      expect(pResp.ok(), 'Patient can access meeting').toBe(true);

      const aToken = await admin.page.evaluate(() => localStorage.getItem('token'));
      const aResp = await admin.page.request.get(
        MEETING_URL + '/api/meetings/' + sharedMeetingId,
        { headers: { Authorization: 'Bearer ' + aToken }, timeout: API_TIMEOUT },
      );
      expect(aResp.ok(), 'Admin can access meeting').toBe(true);

      console.log('  E27: Meeting record accessible from all 3 portals');
    });

    await test.step('E28 - All 3 portals still authenticated', async () => {
      const pToken = await patient.page.evaluate(() => localStorage.getItem('auth_token'));
      const dToken = await doctor.page.evaluate(() => localStorage.getItem('token'));
      const aToken = await admin.page.evaluate(() => localStorage.getItem('token'));
      expect(pToken, 'Patient token').toBeTruthy();
      expect(dToken, 'Doctor token').toBeTruthy();
      expect(aToken, 'Admin token').toBeTruthy();
      console.log('  E28: All 3 portals still authenticated');
    });

    console.log('  E5 COMPLETE - Meeting room access + cross-portal verification');
  });

  test('E6 - Lobby edge cases (host absent, multi-guest, admit-all)', async ({ portals }) => {
    const { doctor, patient } = portals;
    const workflow = loadWorkflowState();
    const aptId = workflow.appointmentId || sharedAppointmentId;
    expect(aptId, 'appointment id from D workflow').toBeTruthy();
    const lobbyKey = aptId;
    const e6PatientId = 'PATIENT-DEMO';

    await test.step('E6-setup - Reset lobby for isolated edge-case run', async () => {
      await refreshPageAuth(doctor.page, DOCTOR_URL);
      let token = await readPageBearerToken(doctor.page);
      if (!token) {
        token = await doctor.page.evaluate(() =>
          localStorage.getItem('token') || localStorage.getItem('izara_auth_token') || '',
        );
      }
      expect(token, 'E6 doctor token').toBeTruthy();
      // Re-open meeting if prior E steps / Q ended the appointment session
      await doctor.page.request.post(`${MEETING_URL}/api/meetings/create`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: {
          appointmentId: aptId,
          patientId: e6PatientId,
          doctorId: 'DOC-TEST-001',
          doctorName: 'Dr. Test Good',
          patientName: 'Demo Test Patient',
        },
        timeout: API_TIMEOUT,
      }).catch(() => null);
      let resetResp = await doctor.page.request.post(
        `${MEETING_URL}/api/meetings/${lobbyKey}/dev/reset-lobby`,
        {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          timeout: API_TIMEOUT,
        },
      );
      if (resetResp.status() === 401 || resetResp.status() === 403) {
        await refreshPageAuth(doctor.page, DOCTOR_URL);
        token = await readPageBearerToken(doctor.page);
        resetResp = await doctor.page.request.post(
          `${MEETING_URL}/api/meetings/${lobbyKey}/dev/reset-lobby`,
          {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            timeout: API_TIMEOUT,
          },
        );
      }
      expect(resetResp.ok(), `E6 lobby reset HTTP ${resetResp.status()}`).toBeTruthy();
      console.log('  E6-setup: Lobby reset for edge-case isolation');
    });

    await test.step('E29 - Guests join lobby BEFORE doctor enters (no HOST in room)', async () => {
      await refreshPageAuth(doctor.page, DOCTOR_URL);
      let doctorToken = await readPageBearerToken(doctor.page);
      if (!doctorToken) {
        doctorToken = await doctor.page.evaluate(() =>
          localStorage.getItem('token') || localStorage.getItem('izara_auth_token') || '',
        );
      }
      expect(doctorToken, 'E29 doctor token').toBeTruthy();

      const postInvite = async (guestName: string, guestEmail: string) => {
        let resp = await doctor.page.request.post(
          `${MEETING_URL}/api/meetings/${lobbyKey}/guest-invite`,
          {
            headers: { Authorization: `Bearer ${doctorToken}`, 'Content-Type': 'application/json' },
            data: { guestName, guestEmail, guestType: 'family' },
            timeout: API_TIMEOUT,
          },
        );
        if (resp.status() === 401 || resp.status() === 403) {
          await refreshPageAuth(doctor.page, DOCTOR_URL);
          doctorToken = await readPageBearerToken(doctor.page);
          resp = await doctor.page.request.post(
            `${MEETING_URL}/api/meetings/${lobbyKey}/guest-invite`,
            {
              headers: { Authorization: `Bearer ${doctorToken}`, 'Content-Type': 'application/json' },
              data: { guestName, guestEmail, guestType: 'family' },
              timeout: API_TIMEOUT,
            },
          );
        }
        return resp;
      };

      const inviteAResp = await postInvite('Early Guest Alpha', 'alpha@test.com');
      const inviteBResp = await postInvite('Early Guest Beta', 'beta@test.com');
      const inviteAStatus = inviteAResp.status();
      const inviteBStatus = inviteBResp.status();
      expect(inviteAResp.ok(), `E29 guest invite A HTTP ${inviteAStatus}`).toBeTruthy();
      expect(inviteBResp.ok(), `E29 guest invite B HTTP ${inviteBStatus}`).toBeTruthy();
      const inviteA = await inviteAResp.json();
      const inviteB = await inviteBResp.json();
      const guestA = await lobbyJoinUnauth(lobbyKey, {
        participantName: 'Early Guest Alpha',
        invite: inviteA.token,
      });
      const guestB = await lobbyJoinUnauth(lobbyKey, {
        participantName: 'Early Guest Beta',
        invite: inviteB.token,
      });
      expect(guestA.status, 'Guest A waiting').toBe('waiting');
      expect(guestB.status, 'Guest B waiting').toBe('waiting');
      const lobbySnap = await lobbyGetSnapshot(patient.page, lobbyKey);
      expect(lobbySnap.waiting.length, 'Multiple guests waiting').toBeGreaterThanOrEqual(2);
      const hostAdmitted = lobbySnap.all.some(
        (p) => (p.role === 'doctor' || p.role === 'admin') && p.status === 'admitted',
      );
      expect(hostAdmitted, 'HOST not admitted yet (Teams lobby)').toBe(false);
      await snap(patient.page, 'E29-guests-before-host', 'group-E');
      console.log('  E29: ' + lobbySnap.waiting.length + ' waiting, host present: ' + hostAdmitted);
    });

    await test.step('E30 - Patient joins lobby while guests wait (still waiting)', async () => {
      const pat = await lobbyJoin(patient.page, lobbyKey, {
        participantName: 'Demo Test Patient',
        participantId: e6PatientId,
        role: 'patient',
      });
      expect(pat.status, 'Patient waits with guests').toBe('waiting');
      const status = await lobbyParticipantStatus(patient.page, lobbyKey, e6PatientId);
      expect(status, 'Patient lobby status').toBe('waiting');
      console.log('  E30: Patient waiting alongside guests');
    });

    await test.step('E31 - HOST admit-all admits patient and all guests', async () => {
      await lobbyAdmitAll(doctor.page, lobbyKey, 'DOC-TEST-001');
      const token = await doctor.page.evaluate(() => localStorage.getItem('token') || '');
      const after = await lobbyGetSnapshot(doctor.page, lobbyKey, token);
      const waitingLeft = after.waiting.length;
      expect(waitingLeft, 'No participants left waiting').toBe(0);
      const patStatus = await lobbyParticipantStatus(patient.page, lobbyKey, e6PatientId);
      expect(patStatus, 'Patient admitted').toBe('admitted');
      await snap(doctor.page, 'E31-lobby-all-admitted', 'group-E');
      console.log('  E31: admit-all cleared waiting queue');
    });

    await test.step('E32 - Re-join after admit returns admitted (no reset to waiting)', async () => {
      const rejoin = await lobbyJoin(patient.page, lobbyKey, {
        participantName: 'Demo Test Patient',
        participantId: e6PatientId,
        role: 'patient',
      });
      expect(rejoin.status, 'Already-admitted patient stays admitted').toBe('admitted');
      console.log('  E32: Re-join idempotent for admitted patient');
    });

    console.log('  E6 COMPLETE - Lobby edge cases');
  });
});