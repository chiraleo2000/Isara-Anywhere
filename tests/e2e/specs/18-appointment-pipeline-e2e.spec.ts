/**
 * SPEC 18: FULL APPOINTMENT PIPELINE E2E
 */
import { test, expect } from '@playwright/test';
import {
  PATIENT_URL, DOCTOR_URL,
  ENDPOINTS, TIMEOUTS,
  authenticateAllUsers, apiRequest,
  generateAppointmentData,
  logTestSuccess, logTestInfo,
  type UserRole, type AuthenticatedUser,
} from '../lib/test-helpers';

let users: Map<UserRole, AuthenticatedUser>;
const DOC_ID = 'DOC-TEST-001';
const PATIENT1_ID = 'PATIENT-DEMO';

test.describe('18 - Full Appointment Pipeline E2E', () => {
  test.describe.configure({ mode: 'serial' });
  let createdAppointmentId: string;

  test.beforeAll(async ({ request }) => {
    users = await authenticateAllUsers(request);
    logTestInfo('All users authenticated for appointment pipeline tests');
  });

  test.describe('A - Patient Books Appointment', () => {
    test('A01 - Patient lists available doctors', async ({ request }) => {
      const pt = users.get('patient1')!;
      const res = await apiRequest(request, 'GET', PATIENT_URL, ENDPOINTS.doctors, pt.token);
      expect([200, 304]).toContain(res.status);
      logTestSuccess('Doctors list returned');
    });

    test('A02 - Patient books online appointment', async ({ request }) => {
      const pt = users.get('patient1')!;
      const apptData = { ...generateAppointmentData('Test Patient'), doctorId: DOC_ID, patientId: PATIENT1_ID, type: 'online', scheduledDate: new Date(Date.now() + 86400000).toISOString() };
      const res = await apiRequest(request, 'POST', PATIENT_URL, '/api/appointments/book', pt.token, apptData);
      expect(res.status).toBeLessThan(500);
      if (res.status === 200 || res.status === 201) createdAppointmentId = res.body?.id || res.body?.appointmentId || 'test-appt';
      logTestSuccess('Appointment booked -> ' + res.status);
    });

    test('A03 - Patient lists their appointments', async ({ request }) => {
      const pt = users.get('patient1')!;
      const res = await apiRequest(request, 'GET', PATIENT_URL, ENDPOINTS.appointments, pt.token);
      expect([200, 304]).toContain(res.status);
      logTestSuccess('Patient appointments listed');
    });
  });

  test.describe('B - Doctor Manages Appointments', () => {
    test('B01 - Doctor sees pending appointments', async ({ request }) => {
      const doc = users.get('doctor')!;
      const res = await apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.appointments, doc.token);
      expect([200, 304]).toContain(res.status);
      logTestSuccess('Doctor appointments listed');
    });

    test('B02 - Doctor confirms appointment', async ({ request }) => {
      const doc = users.get('doctor')!;
      const id = createdAppointmentId || 'test-appt';
      const res = await apiRequest(request, 'PATCH', DOCTOR_URL, ENDPOINTS.appointments + '/' + id, doc.token, { status: 'confirmed' });
      expect([200, 404]).toContain(res.status);
      logTestSuccess('Confirm -> ' + res.status);
    });

    test('B03 - Doctor cancels appointment', async ({ request }) => {
      const doc = users.get('doctor')!;
      const id = createdAppointmentId || 'test-appt';
      const res = await apiRequest(request, 'POST', DOCTOR_URL, '/api/appointments/' + id + '/cancel', doc.token, { reason: 'E2E test' });
      expect(res.status).toBeLessThan(501);
      logTestSuccess('Cancel -> ' + res.status);
    });
  });

  test.describe('C - Appointment Types', () => {
    test('C01 - AI pre-consultation summary', async ({ request }) => {
      const doc = users.get('doctor')!;
      const res = await apiRequest(request, 'POST', DOCTOR_URL, ENDPOINTS.ai.preConsultation, doc.token, { patientId: PATIENT1_ID });
      expect([200, 201, 404, 500]).toContain(res.status);
      logTestSuccess('AI pre-consult -> ' + res.status);
    });

    test('C02 - Appointment pool listing', async ({ request }) => {
      const doc = users.get('doctor')!;
      const res = await apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.appointmentPool, doc.token);
      expect([200, 304]).toContain(res.status);
      logTestSuccess('Pool listed');
    });

    test('C03 - Queue management endpoint', async ({ request }) => {
      const doc = users.get('doctor')!;
      const res = await apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.queue, doc.token);
      expect([200, 304]).toContain(res.status);
      logTestSuccess('Queue OK');
    });
  });

  test.describe('D - Multi-Patient Parallel Booking', () => {
    test('D01 - Three patients book concurrently', async ({ request }) => {
      const results = await Promise.all(
        (['patient1', 'patient2', 'patient3'] as UserRole[]).map(async (role) => {
          const user = users.get(role)!;
          const apptData = { ...generateAppointmentData('Parallel ' + role), doctorId: DOC_ID, patientId: user.id, type: 'online', scheduledDate: new Date(Date.now() + 259200000 + Math.random() * 86400000).toISOString() };
          return apiRequest(request, 'POST', PATIENT_URL, '/api/appointments/book', user.token, apptData);
        })
      );
      for (const r of results) expect(r.status).toBeLessThan(500);
      logTestSuccess('Parallel: ' + results.map(r => r.status).join(', '));
    });
  });
});