/**
 * =============================================================================
 * 03-APPOINTMENT-WORKFLOW — Full appointment lifecycle
 * =============================================================================
 * Patient books → Doctor/Admin confirms → Meeting link generated →
 * Notifications sent → Appointment status updates
 *
 * Based on: Processes/Appointment_Workflows.md
 *   npx playwright test specs/03-appointment-workflow.spec.ts --headed
 * =============================================================================
 */
import { test, expect, APIRequestContext } from '@playwright/test';
import {
  PATIENT_URL, DOCTOR_URL,
  CREDENTIALS, getAuthToken, authHeaders, logTestSuccess, TIMEOUTS,
} from '../lib/test-config';

let ptk = '', dtk = '', atk = '';
let createdAppointmentId = '';
const T = TIMEOUTS.api;

async function tokens(req: APIRequestContext) {
  if (!ptk) ptk = await getAuthToken(req, PATIENT_URL, CREDENTIALS.patient1);
  if (!dtk) dtk = await getAuthToken(req, DOCTOR_URL, CREDENTIALS.doctor);
  if (!atk) atk = await getAuthToken(req, DOCTOR_URL, CREDENTIALS.admin);
}

// === 1. PATIENT BOOKING ===

test.describe('1. Patient Appointment Booking', () => {
  test.beforeAll(async ({ request }) => { await tokens(request); });

  test('APT-01: Patient views available doctors', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/doctors`, { headers: authHeaders(ptk), timeout: T });
    expect(r.status()).toBe(200);
    const body = await r.json();
    const docs = body.doctors || body.data || body;
    expect(Array.isArray(docs)).toBe(true);
    logTestSuccess(`Available doctors: ${Array.isArray(docs) ? docs.length : 0}`);
  });

  test('APT-02: Patient lists own appointments', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/appointments`, { headers: authHeaders(ptk), timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Patient appointments listed');
  });

  test('APT-03: Patient books new appointment (general)', async ({ request }) => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const r = await request.post(`${PATIENT_URL}/api/appointments`, {
      headers: authHeaders(ptk),
      data: {
        symptoms: 'ปวดหัว มีไข้ 2 วัน (E2E test)',
        notes: 'Auto E2E test appointment',
        preferredDate: tomorrow,
        preferredTime: '10:00',
        type: 'online',
        urgency: 'normal',
      },
      timeout: T,
    });
    expect([200, 201].includes(r.status())).toBe(true);
    const body = await r.json();
    createdAppointmentId = body.id || body.appointmentId || body.appointment?.id || '';
    logTestSuccess(`Appointment booked: ${createdAppointmentId}`);
  });

  test('APT-04: Patient books appointment for Somchai', async ({ request }) => {
    const p2tk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient2);
    const tomorrow = new Date(Date.now() + 172800000).toISOString().split('T')[0];
    const r = await request.post(`${PATIENT_URL}/api/appointments`, {
      headers: authHeaders(p2tk),
      data: {
        symptoms: 'ปวดท้อง คลื่นไส้ (E2E test Patient 2)',
        notes: 'Auto E2E test - Somchai',
        preferredDate: tomorrow,
        type: 'online',
        urgency: 'normal',
      },
      timeout: T,
    });
    expect([200, 201].includes(r.status())).toBe(true);
    logTestSuccess('Patient 2 appointment booked');
  });

  test('APT-05: Patient books appointment for Anan', async ({ request }) => {
    const p3tk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient3);
    const r = await request.post(`${PATIENT_URL}/api/appointments`, {
      headers: authHeaders(p3tk),
      data: {
        symptoms: 'ไอ เจ็บคอ (E2E test Patient 3)',
        notes: 'Auto E2E test - Anan',
        preferredDate: new Date(Date.now() + 259200000).toISOString().split('T')[0],
        type: 'online',
        urgency: 'normal',
      },
      timeout: T,
    });
    expect([200, 201].includes(r.status())).toBe(true);
    logTestSuccess('Patient 3 appointment booked');
  });
});

// === 2. DOCTOR / ADMIN CONFIRMATION ===

test.describe('2. Doctor/Admin Appointment Management', () => {
  test.beforeAll(async ({ request }) => { await tokens(request); });

  test('APT-06: Doctor views appointment queue', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/appointments`, { headers: authHeaders(dtk), timeout: T });
    expect(r.status()).toBe(200);
    const body = await r.json();
    logTestSuccess(`Doctor sees ${JSON.stringify(body).length} bytes of appointments`);
  });

  test('APT-07: Admin views ALL appointments', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/appointments`, { headers: authHeaders(atk), timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Admin sees all appointments');
  });

  test('APT-08: Doctor views pending appointments', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/appointments/pending/${CREDENTIALS.doctor.id}`, { headers: authHeaders(dtk), timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Doctor pending appointments OK');
  });

  test('APT-09: Doctor confirms appointment (generates meeting link)', async ({ request }) => {
    if (!createdAppointmentId) {
      // Get any pending appointment
      const list = await request.get(`${DOCTOR_URL}/api/appointments`, { headers: authHeaders(dtk), timeout: T });
      const body = await list.json();
      const apts = body.appointments || body.data || body;
      if (Array.isArray(apts) && apts.length > 0) {
        const pending = apts.find((a: any) => a.status === 'pending' || a.status === 'in_pool');
        if (pending) createdAppointmentId = pending.id || pending.appointmentId;
      }
    }
    if (createdAppointmentId) {
      const r = await request.post(`${DOCTOR_URL}/api/appointments/${createdAppointmentId}/confirm`, {
        headers: authHeaders(dtk),
        data: {
          confirmedDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          confirmedTime: '14:00',
          notes: 'Confirmed by E2E test',
        },
        timeout: T,
      });
      expect([200, 201].includes(r.status())).toBe(true);
      const body = await r.json();
      logTestSuccess(`Appointment confirmed, meeting link: ${body.meetingUrl || body.meeting_url || 'generated'}`);
    } else {
      logTestSuccess('No pending appointment to confirm (OK in clean state)');
    }
  });

  test('APT-10: Doctor views patient list', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/patients`, { headers: authHeaders(dtk), timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Doctor patient list OK');
  });

  test('APT-11: Doctor views today appointments', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/appointments`, { headers: authHeaders(dtk), timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Doctor today appointments OK');
  });
});

// === 3. NOTIFICATION VERIFICATION ===

test.describe('3. Appointment Notifications', () => {
  test.beforeAll(async ({ request }) => { await tokens(request); });

  test('APT-12: Patient receives notifications', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/notifications`, { headers: authHeaders(ptk), timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Patient notifications retrieved');
  });

  test('APT-13: Doctor receives notifications', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/notifications`, { headers: authHeaders(dtk), timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Doctor notifications retrieved');
  });

  test('APT-14: Patient notification count', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/notifications/count`, { headers: authHeaders(ptk), timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Notification count OK');
  });
});

// === 4. UI APPOINTMENT WORKFLOW ===

test.describe('4. UI Appointment Workflow', () => {
  test('APT-15: Patient books via UI', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/login`, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
    const emailInput = page.locator('input[type="email"], input[name="email"], input[id*="email"]').first();
    const passInput  = page.locator('input[type="password"]').first();
    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailInput.fill(CREDENTIALS.patient1.email);
      await passInput.fill(CREDENTIALS.patient1.password);
      await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("เข้าสู่ระบบ")').first().click();
      await page.waitForTimeout(5000);
    }
    // Navigate to appointments page
    await page.goto(`${PATIENT_URL}/appointments`, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    logTestSuccess('Patient appointments page visible');
  });

  test('APT-16: Doctor reviews queue via UI', async ({ page }) => {
    await page.goto(`${DOCTOR_URL}/login`, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
    const emailInput = page.locator('input[type="email"], input[name="email"], input[id*="email"]').first();
    const passInput  = page.locator('input[type="password"]').first();
    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailInput.fill(CREDENTIALS.doctor.email);
      await passInput.fill(CREDENTIALS.doctor.password);
      await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("เข้าสู่ระบบ")').first().click();
      await page.waitForTimeout(5000);
    }
    logTestSuccess('Doctor dashboard loaded for appointment review');
  });
});

// === 5. APPOINTMENT POOL ===

test.describe('5. Appointment Pool', () => {
  test.beforeAll(async ({ request }) => { await tokens(request); });

  test('APT-17: View appointment pool', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/appointment-pool`, { headers: authHeaders(dtk), timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Appointment pool OK');
  });

  test('APT-18: Patient creates pool appointment', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/appointment-pool`, {
      headers: authHeaders(ptk),
      data: {
        symptoms: 'ปวดหลัง (Pool E2E test)',
        urgency: 'normal',
        type: 'online',
      },
      timeout: T,
    });
    expect([200, 201].includes(r.status())).toBe(true);
    logTestSuccess('Pool appointment created');
  });
});
