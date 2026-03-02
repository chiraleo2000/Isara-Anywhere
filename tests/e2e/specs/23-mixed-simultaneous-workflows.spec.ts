import { test, expect } from '@playwright/test';
import { PATIENT_URL, DOCTOR_URL, ENDPOINTS, authenticateAllUsers, apiRequest, generatePHRVitals, generateAppointmentData, generateEMRData, generatePrescriptionData, generateLabOrder, appointmentLifecycle, logTestSuccess, logTestInfo, type UserRole, type AuthenticatedUser } from '../lib/test-helpers';
let users: Map<UserRole, AuthenticatedUser>;
test.describe('23 - Mixed Simultaneous Workflows', () => {
  test.beforeAll(async ({ request }) => { users = await authenticateAllUsers(request); });
  test.describe('A - 5 User Parallel', () => {
    test('A01 - All roles simultaneous', async ({ request }) => {
      const results = await Promise.all([
        apiRequest(request, 'GET', PATIENT_URL, ENDPOINTS.phr, users.get('patient1')!.token),
        apiRequest(request, 'GET', PATIENT_URL, ENDPOINTS.appointments, users.get('patient2')!.token),
        apiRequest(request, 'GET', PATIENT_URL, ENDPOINTS.medicalContent, users.get('patient3')!.token),
        apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.appointments, users.get('doctor')!.token),
        apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.admin.stats, users.get('admin')!.token),
      ]);
      results.forEach((r) => expect([200, 304]).toContain(r.status));
      logTestSuccess('5 users parallel OK');
    });
    test('A02 - 3 patients PHR concurrent', async ({ request }) => {
      const patients: UserRole[] = ['patient1', 'patient2', 'patient3'];
      const results = await Promise.all(patients.map(role => apiRequest(request, 'GET', PATIENT_URL, ENDPOINTS.phr, users.get(role)!.token)));
      results.forEach((r) => expect([200, 304]).toContain(r.status));
      logTestSuccess('3 patients PHR OK');
    });
    test('A03 - Doctor + Admin concurrent', async ({ request }) => {
      const [a, b, c, d] = await Promise.all([
        apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.appointments, users.get('doctor')!.token),
        apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.medicalContent, users.get('doctor')!.token),
        apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.admin.pendingDoctors, users.get('admin')!.token),
        apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.admin.stats, users.get('admin')!.token),
      ]);
      [a, b, c, d].forEach(r => expect([200, 304]).toContain(r.status));
      logTestSuccess('Doc+Admin concurrent OK');
    });
  });
  test.describe('B - Sequential Multi-Patient', () => {
    test('B01 - Patient1 books appointment', async ({ request }) => { const pt = users.get('patient1')!; const res = await apiRequest(request, 'POST', PATIENT_URL, ENDPOINTS.appointments, pt.token, generateAppointmentData()); expect([200, 201, 400]).toContain(res.status); logTestSuccess('Pt1 appt -> ' + res.status); });
    test('B02 - Patient2 records vitals', async ({ request }) => { const pt = users.get('patient2')!; const res = await apiRequest(request, 'POST', PATIENT_URL, ENDPOINTS.phr + '/vitals', pt.token, generatePHRVitals()); expect([200, 201, 404]).toContain(res.status); logTestSuccess('Pt2 vitals -> ' + res.status); });
    test('B03 - Patient3 reads content', async ({ request }) => { const pt = users.get('patient3')!; const res = await apiRequest(request, 'GET', PATIENT_URL, ENDPOINTS.medicalContent, pt.token); expect([200, 304]).toContain(res.status); logTestSuccess('Pt3 content -> ' + res.status); });
  });
  test.describe('C - Doctor EMR + Rx + Lab', () => {
    test('C01 - Doctor creates EMR', async ({ request }) => { const doc = users.get('doctor')!; const res = await apiRequest(request, 'POST', DOCTOR_URL, ENDPOINTS.emr, doc.token, generateEMRData('PATIENT-DEMO')); expect([200, 201]).toContain(res.status); logTestSuccess('EMR -> ' + res.status); });
    test('C02 - Doctor creates prescription', async ({ request }) => { const doc = users.get('doctor')!; const res = await apiRequest(request, 'POST', DOCTOR_URL, ENDPOINTS.prescriptions, doc.token, generatePrescriptionData('PATIENT-DEMO')); expect([200, 201]).toContain(res.status); logTestSuccess('Rx -> ' + res.status); });
    test('C03 - Doctor creates lab order', async ({ request }) => { const doc = users.get('doctor')!; const res = await apiRequest(request, 'POST', DOCTOR_URL, ENDPOINTS.labOrders, doc.token, generateLabOrder('PATIENT-DEMO')); expect([200, 201]).toContain(res.status); logTestSuccess('Lab -> ' + res.status); });
    test('C04 - Concurrent Rx + Lab', async ({ request }) => { const doc = users.get('doctor')!; const [rx, lab] = await Promise.all([apiRequest(request, 'POST', DOCTOR_URL, ENDPOINTS.prescriptions, doc.token, generatePrescriptionData('PATIENT-SOMCHAI')), apiRequest(request, 'POST', DOCTOR_URL, ENDPOINTS.labOrders, doc.token, generateLabOrder('PATIENT-ANAN'))]); expect([200, 201]).toContain(rx.status); expect([200, 201]).toContain(lab.status); logTestSuccess('Concurrent Rx+Lab OK'); });
  });
  test.describe('D - Lifecycle', () => {
    test('D01 - Appointment lifecycle', async ({ request }) => { const pt = users.get('patient1')!; const doc = users.get('doctor')!; const r = await appointmentLifecycle(request, pt.token, doc.token); expect(r.appointmentId).toBeDefined(); logTestSuccess('Lifecycle: ' + r.appointmentId); });
    test('D02 - Health check servers', async ({ request }) => { const [p, d] = await Promise.all([apiRequest(request, 'GET', PATIENT_URL, '/api/health', ''), apiRequest(request, 'GET', DOCTOR_URL, '/api/health', '')]); expect([200, 304]).toContain(p.status); expect([200, 304]).toContain(d.status); logTestSuccess('All servers healthy'); });
  });
});
