import {
  test,
  expect,
  DOCTOR_URL,
  PATIENT_URL,
  MEETING_URL,
  joinIzaraMeetingInApp,
  joinMeetingToLobby,
  snap,
} from './helpers/multi-portal';

test.describe('Defect — Meeting lobby admit flow', () => {
  test.describe.configure({ mode: 'serial' });

  test('DM1 — doctor join route uses MeetingRoom with lobby admit UX', async ({ portals }) => {
    const { doctor, patient } = portals;

    const doctorCtx = await doctor.page.evaluate(() => {
      const token = localStorage.getItem('token') || '';
      const raw = localStorage.getItem('doctor_user');
      const user = raw ? JSON.parse(raw) : {};
      return {
        token,
        doctorId: user?.id || 'DOC-TEST-001',
        doctorName: user?.name || 'Doctor',
      };
    });

    const appointmentId = `APT-DEFECT-${Date.now()}`;
    const createResp = await doctor.page.request.post(`${MEETING_URL}/api/meetings/create`, {
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

    await doctor.page.goto(`${DOCTOR_URL}/doctor/${doctorCtx.doctorId}/meeting/${appointmentId}`, {
      waitUntil: 'domcontentloaded',
    });
    await joinIzaraMeetingInApp(doctor.page, 'DM1-doctor', portals.doctor.browserName);
    await expect(doctor.page.getByTestId('jitsi-meeting-container')).toBeVisible({ timeout: 90_000 });

    await patient.page.goto(`${PATIENT_URL}/meeting/${appointmentId}`, { waitUntil: 'domcontentloaded' });
    await joinMeetingToLobby(patient.page, 'DM1-patient', portals.patient.browserName);
    await expect(patient.page.getByTestId('lobby-waiting-screen')).toBeVisible({ timeout: 60_000 });

    await doctor.page.getByTestId('lobby-toggle-btn').click();
    await expect(doctor.page.getByTestId('lobby-panel')).toBeVisible({ timeout: 60_000 });
    await snap(doctor.page, 'DM1-doctor-lobby-panel', 'group-defect');
  });

  test('DM2 — admit button visible when patient waiting in lobby (M2)', async ({ portals }) => {
    const { doctor, patient } = portals;

    const doctorCtx = await doctor.page.evaluate(() => {
      const token = localStorage.getItem('token') || '';
      const raw = localStorage.getItem('doctor_user');
      const user = raw ? JSON.parse(raw) : {};
      return {
        token,
        doctorId: user?.id || 'DOC-TEST-001',
        doctorName: user?.name || 'Doctor',
      };
    });

    const appointmentId = `APT-DEFECT-DM2-${Date.now()}`;
    const createResp = await doctor.page.request.post(`${MEETING_URL}/api/meetings/create`, {
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

    await doctor.page.goto(`${DOCTOR_URL}/doctor/${doctorCtx.doctorId}/meeting/${appointmentId}`, {
      waitUntil: 'domcontentloaded',
    });
    await joinIzaraMeetingInApp(doctor.page, 'DM2-doctor', portals.doctor.browserName);
    await expect(doctor.page.getByTestId('jitsi-meeting-container')).toBeVisible({ timeout: 90_000 });

    await patient.page.goto(`${PATIENT_URL}/meeting/${appointmentId}`, { waitUntil: 'domcontentloaded' });
    await joinMeetingToLobby(patient.page, 'DM2-patient', portals.patient.browserName);
    await expect(patient.page.getByTestId('lobby-waiting-screen')).toBeVisible({ timeout: 60_000 });

    await doctor.page.getByTestId('lobby-toggle-btn').click();
    await expect(doctor.page.getByTestId('lobby-panel')).toBeVisible({ timeout: 60_000 });

    const admitBtn = doctor.page.getByTestId('admit-btn').or(doctor.page.getByTestId('admit-all-btn'));
    await expect(admitBtn.first()).toBeVisible({ timeout: 30_000 });
    await snap(doctor.page, 'DM2-admit-button-visible', 'group-defect');
  });
});
