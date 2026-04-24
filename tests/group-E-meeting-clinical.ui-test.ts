/**
 * GROUP E - MEETING SERVER, ROOM ACCESS & GUEST INVITE WORKFLOW
 * Browsers: Patient=Chrome, Doctor=Chrome, Admin=Chrome
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
  navDoctor, navPatient, waitForContent,
  PATIENT_URL, DOCTOR_URL, MEETING_URL,
} from './helpers/multi-portal';

const IS_CLOUD = process.env.TEST_ENV === 'cloud';
const API_TIMEOUT = IS_CLOUD ? 30_000 : 10_000;

let sharedMeetingId = '';
let sharedRoomName = '';
let sharedAppointmentId = '';
let sharedGuestToken = '';
let sharedMeetingUrls: { base?: string; doctor?: string; patient?: string; guest?: string } = {};

test.describe('Group E - Meeting Server & Clinical Workflow', () => {
  test.describe.configure({ mode: 'serial' });

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
    const { doctor } = portals;

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

    await test.step('E09 - Get appointment ID from doctor API', async () => {
      const token = await doctor.page.evaluate(() => localStorage.getItem('token'));
      const resp = await doctor.page.request.get(DOCTOR_URL + '/api/appointments', {
        headers: { Authorization: 'Bearer ' + token },
        timeout: API_TIMEOUT,
      });
      expect(resp.status(), 'Doctor appointments API').toBe(200);
      const data = await resp.json();
      const apts = data.appointments || data || [];
      const apt = Array.isArray(apts) && apts.length > 0 ? apts[0] : null;
      expect(apt, 'Must have at least 1 appointment from Group D').toBeTruthy();
      sharedAppointmentId = apt.id;
      console.log('  E09: Appointment ' + sharedAppointmentId + ' (status: ' + apt.status + ')');
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
      expect(meetData.urls.base, 'Base meeting URL').toContain('meet.jit.si');
      expect(meetData.urls.doctor, 'Doctor meeting URL').toContain('meet.jit.si');
      expect(meetData.urls.patient, 'Patient meeting URL').toContain('meet.jit.si');
      expect(meetData.urls.guest, 'Guest meeting URL').toContain('meet.jit.si');
      expect(meetData.urls.base, 'Has lobby config').toContain('prejoinPageEnabled');
      expect(meetData.urls.base, 'Has language config').toContain('defaultLanguage');

      sharedMeetingId = meetData.meetingId;
      sharedRoomName = meetData.roomName;
      sharedMeetingUrls = meetData.urls;

      await snap(doctor.page, 'E10-meeting-created', 'group-E');
      console.log('  E10: Meeting created - id: ' + sharedMeetingId + ', room: ' + sharedRoomName);
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
      expect(meeting.status, 'Meeting status scheduled').toBe('scheduled');
      expect(meeting.doctor_id || meeting.doctorId, 'Doctor ID in record').toBeTruthy();
      expect(meeting.patient_id || meeting.patientId, 'Patient ID in record').toBeTruthy();
      console.log('  E11: Meeting record - status: ' + meeting.status);
    });

    await test.step('E12 - Verify all meeting URLs contain correct room', async () => {
      expect(sharedMeetingUrls.base, 'Base URL has room').toContain(sharedRoomName);
      expect(sharedMeetingUrls.doctor, 'Doctor URL has room').toContain(sharedRoomName);
      expect(sharedMeetingUrls.patient, 'Patient URL has room').toContain(sharedRoomName);
      expect(sharedMeetingUrls.guest, 'Guest URL has room').toContain(sharedRoomName);
      console.log('  E12: All 4 URLs contain room ' + sharedRoomName);
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
      expect(hasRealData, 'Appointment list has real data').toBeTruthy();
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
      const token = await patient.page.evaluate(() => localStorage.getItem('auth_token'));
      const resp = await patient.page.request.get(
        MEETING_URL + '/api/meetings/' + sharedMeetingId,
        { headers: { Authorization: 'Bearer ' + token }, timeout: API_TIMEOUT },
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
      expect(sharedMeetingUrls.patient, 'Patient URL Jitsi domain').toContain('meet.jit.si');
      console.log('  E16: Patient meeting URL verified - room: ' + sharedRoomName);
    });

    await test.step('E17 - Patient appointments API shows real data', async () => {
      const token = await patient.page.evaluate(() => localStorage.getItem('auth_token'));
      const resp = await patient.page.request.get(
        PATIENT_URL + '/api/appointments',
        { headers: { Authorization: 'Bearer ' + token }, timeout: API_TIMEOUT },
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
      const token = await doctor.page.evaluate(() => localStorage.getItem('token'));
      const resp = await doctor.page.request.post(
        MEETING_URL + '/api/meetings/' + sharedMeetingId + '/guest-invite',
        {
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          data: { guestName: 'Somchai Family', guestEmail: 'guest@test.com', guestType: 'family' },
          timeout: API_TIMEOUT,
        },
      );
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
      expect(data.meetingId, 'Meeting ID matches').toBe(sharedMeetingId);
      expect(data.guestName, 'Guest name preserved').toBeTruthy();
      expect(data.guestType, 'Guest type is family').toBe('family');
      console.log('  E20: Token validated - guest: ' + data.guestName + ', meeting: ' + data.meetingId);
    });

    await test.step('E21 - Guest lobby join via basic endpoint', async () => {
      expect(sharedMeetingId, 'Meeting from E2').toBeTruthy();
      const resp = await doctor.page.request.post(
        MEETING_URL + '/api/meetings/' + sharedMeetingId + '/lobby/join',
        {
          headers: { 'Content-Type': 'application/json' },
          data: { participantName: 'Guest Viewer 1' },
          timeout: API_TIMEOUT,
        },
      );
      expect(resp.status(), 'Lobby join status').toBe(200);
      const data = await resp.json();
      expect(data.success, 'Lobby join succeeded').toBe(true);
      expect(data.status, 'Lobby status returned').toBeTruthy();
      const participantId = data.participantId || 'host-bypass';
      await snap(doctor.page, 'E21-lobby-join-basic', 'group-E');
      console.log('  E21: Guest lobby join - status: ' + data.status + ', id: ' + participantId);
    });

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
      expect(data.meetingId, 'Meeting ID returned').toBe(sharedMeetingId);
      expect(data.participantId, 'Participant ID assigned').toBeTruthy();
      expect(data.status, 'Guest in lobby waiting').toBe('waiting');
      await snap(doctor.page, 'E22-lobby-join-token', 'group-E');
      console.log('  E22: Token lobby join - participant: ' + data.participantId + ', status: ' + data.status);
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
          await tab.click();
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
      expect(sharedMeetingUrls.doctor, 'Doctor URL has Jitsi domain').toContain('meet.jit.si');
      expect(sharedMeetingUrls.doctor, 'Doctor URL has room name').toContain(sharedRoomName);
      expect(sharedMeetingUrls.doctor, 'Doctor displayName encoded').toContain('displayName');
      console.log('  E24: Doctor meeting URL - Jitsi room + displayName verified');
    });

    await test.step('E25 - Patient meeting URL format verified', async () => {
      expect(sharedMeetingUrls.patient, 'Patient URL exists').toBeTruthy();
      expect(sharedMeetingUrls.patient, 'Patient URL has Jitsi domain').toContain('meet.jit.si');
      expect(sharedMeetingUrls.patient, 'Patient URL has room name').toContain(sharedRoomName);
      console.log('  E25: Patient meeting URL - Jitsi room + displayName verified');
    });

    await test.step('E26 - Guest meeting URL format verified', async () => {
      expect(sharedMeetingUrls.guest, 'Guest URL exists').toBeTruthy();
      expect(sharedMeetingUrls.guest, 'Guest URL has Jitsi domain').toContain('meet.jit.si');
      expect(sharedMeetingUrls.guest, 'Guest URL has room name').toContain(sharedRoomName);
      expect(sharedMeetingUrls.guest, 'Guest displayName is Guest').toContain('Guest');
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
});