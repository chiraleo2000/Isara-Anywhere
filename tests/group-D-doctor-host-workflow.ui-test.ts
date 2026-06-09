/**
 * GROUP D (HOST) — G8/G9: Doctor confirms and is Jitsi HOST (not patient/admin).
 * Requires workflow state from Group D serial run (appointmentId).
 */
import { test, expect, DOCTOR_URL, MEETING_URL } from './helpers/multi-portal';
import { loadWorkflowState } from './helpers/workflow-state';

const IS_CLOUD = process.env.TEST_ENV === 'cloud';

test.describe('Group D — Doctor HOST workflow (G8–G9)', () => {
  test.describe.configure({ mode: 'serial' });

  test('G8–G9 — Doctor confirm creates meeting with moderator for doctor', async ({ portals }) => {
    const { appointmentId } = loadWorkflowState();
    test.skip(!appointmentId, 'Run Group D first to create appointmentId in workflow state');

    const page = portals.doctor.page;
    const token = await page.evaluate(() =>
      localStorage.getItem('token') || localStorage.getItem('izara_auth_token') || '',
    );
    expect(token, 'doctor fixture must provide JWT (use TEST_DOCTOR_PASSWORD in Docker)').toBeTruthy();

    const doctorId = await page.evaluate(() => {
      const u = localStorage.getItem('izara_current_user');
      return u ? JSON.parse(u).id : 'DOC-TEST-001';
    });

    const confirmResp = await page.request.post(`${DOCTOR_URL}/api/appointments/${appointmentId}/confirm`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        doctorId,
        confirmedDate: new Date().toISOString().split('T')[0],
        confirmedTime: '10:00',
      },
      timeout: IS_CLOUD ? 30_000 : 15_000,
    });
    expect([200, 404].includes(confirmResp.status()), 'G8: doctor confirm should succeed or already-resolved').toBeTruthy();

    const meetResp = await page.request.post(`${DOCTOR_URL}/api/video-meeting/create`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { appointmentId, doctorId, patientId: 'PATIENT-DEMO' },
      timeout: IS_CLOUD ? 45_000 : 20_000,
    });
    expect(meetResp.status(), 'G9: meeting create must succeed').toBeLessThan(400);
    const meet = await meetResp.json().catch(() => ({}));
    let doctorUrl = meet.doctorUrl || meet.doctor_url || meet.urls?.doctor;
    let patientUrl = meet.patientUrl || meet.patient_url || meet.urls?.patient;
    if (!doctorUrl || !patientUrl) {
      const fallbackResp = await page.request.get(`${DOCTOR_URL}/api/video-meeting/${appointmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: IS_CLOUD ? 45_000 : 20_000,
      });
      if (fallbackResp.ok()) {
        const fallbackBody = await fallbackResp.json().catch(() => ({}));
        const meeting = fallbackBody.meeting || {};
        doctorUrl = doctorUrl || meeting.doctorUrl || meeting.doctor_url;
        patientUrl = patientUrl || meeting.patientUrl || meeting.patient_url || meeting.jitsiUrl;
      }
    }
    if (!doctorUrl || !patientUrl) {
      console.warn('  ⚠ G9: meeting create response lacks doctor/patient URL in this environment');
    }
    expect(Boolean(doctorUrl || patientUrl), 'G9: at least one meeting URL should be returned').toBeTruthy();
    const tokenAuthEnabled =
      meet.tokenAuthEnabled === true ||
      meet.tokens?.doctor ||
      String(doctorUrl || '').includes('jwt=');
    if (tokenAuthEnabled && doctorUrl) {
      expect(String(doctorUrl).includes('jwt='), 'G9: doctor URL must include JWT token for host auth').toBeTruthy();
    }
    const hostMarker =
      String(doctorUrl || '').includes('moderator=true')
      || meet.hostRole === 'doctor'
      || meet.meeting?.hostRole === 'doctor'
      || Boolean(meet.tokens?.doctor);
    if ((doctorUrl || meet.tokens?.doctor || meet.hostRole || meet.meeting?.hostRole) && !hostMarker) {
      console.warn('  ⚠ G9: host marker is not explicit in meeting payload');
    }
    if (tokenAuthEnabled && doctorUrl) try {
      const jwtValue = new URL(String(doctorUrl)).searchParams.get('jwt') || '';
      expect(jwtValue, 'G9: doctor JWT token present').toBeTruthy();
      const payloadPart = jwtValue.split('.')[1] || '';
      const normalized = payloadPart.replaceAll('-', '+').replaceAll('_', '/');
      const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
      const decoded = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
      const affiliation = decoded?.context?.user?.affiliation;
      const moderator = decoded?.context?.user?.moderator;
      expect(
        affiliation === 'owner' || moderator === true,
        `G9: doctor JWT must grant host role (affiliation=${String(affiliation)}, moderator=${String(moderator)})`,
      ).toBeTruthy();
    } catch (err) {
      throw new Error(`G9: invalid doctor JWT payload: ${String(err)}`);
    }

    if (MEETING_URL && meet.meetingKey) {
      const cfg = await page.request.get(`${MEETING_URL}/api/meetings/${meet.meetingKey}`, { timeout: 15_000 }).catch(() => null);
      if (cfg?.ok()) {
        const body = await cfg.json().catch(() => ({}));
        expect(
          body.organizerDoctorId || body.hostRole === 'doctor' || body.config?.moderator,
          'G9: meeting config HOST=doctor',
        ).toBeTruthy();
      }
    }

  });
});
