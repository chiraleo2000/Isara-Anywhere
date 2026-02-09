/**
 * =============================================================================
 * 08-CONTENT-NOTIFICATIONS — Medical Content, Clinical Resources,
 *   Consultants, Notifications, Metadata
 * =============================================================================
 * Based on: Processes/Clinical_Resources_&_Medical_Library_Workflows.md
 *           Processes/Medical_Consultants_Workflows.md
 *           Processes/Medicine_Content_Processes.md
 *           Processes/Notification_Workflows.md
 *
 *   npx playwright test specs/08-content-notifications.spec.ts
 * =============================================================================
 */
import { test, expect, APIRequestContext } from '@playwright/test';
import {
  PATIENT_URL, DOCTOR_URL,
  CREDENTIALS, getAuthToken, authHeaders, logTestSuccess, TIMEOUTS,
} from '../lib/test-config';

let ptk = '', dtk = '', atk = '';
const T = TIMEOUTS.api;

async function tokens(req: APIRequestContext) {
  if (!ptk) ptk = await getAuthToken(req, PATIENT_URL, CREDENTIALS.patient1);
  if (!dtk) dtk = await getAuthToken(req, DOCTOR_URL, CREDENTIALS.doctor);
  if (!atk) atk = await getAuthToken(req, DOCTOR_URL, CREDENTIALS.admin);
}

// === 1. MEDICAL CONTENT ===

test.describe('1. Medical Content', () => {
  test.beforeAll(async ({ request }) => { await tokens(request); });

  test('MC-01: Patient medical content list', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/medical-content`, { timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Patient medical content OK');
  });

  test('MC-02: Patient content/medical', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/content/medical`, { timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Patient content medical OK');
  });

  test('MC-03: Doctor medical content', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/medical-content`, { headers: authHeaders(dtk), timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Doctor medical content OK');
  });

  test('MC-04: Doctor content/medical', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/content/medical`, { timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Doctor content/medical OK');
  });

  test('MC-05: Doctor content/clinical', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/content/clinical`, { timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Doctor content/clinical OK');
  });

  test('MC-06: Admin creates medical content', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/content/medical`, {
      headers: authHeaders(atk),
      data: {
        title: 'E2E Test Article - การดูแลสุขภาพเบื้องต้น',
        content: 'บทความทดสอบสำหรับ E2E testing',
        category: 'general_health',
        tags: ['e2e-test', 'health'],
        language: 'th',
      },
      timeout: T,
    });
    expect([200, 201].includes(r.status())).toBe(true);
    logTestSuccess('Medical content created');
  });
});

// === 2. CLINICAL RESOURCES ===

test.describe('2. Clinical Resources', () => {
  test.beforeAll(async ({ request }) => { await tokens(request); });

  test('CR-01: Doctor clinical resources', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/clinical-resources`, { headers: authHeaders(dtk), timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Clinical resources OK');
  });

  test('CR-02: Admin clinical resources', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/clinical-resources`, { headers: authHeaders(atk), timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Admin clinical resources OK');
  });

  test('CR-03: Create clinical resource', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/clinical-resources`, {
      headers: authHeaders(atk),
      data: {
        title: 'E2E Test Clinical Resource',
        content: 'Clinical guideline for E2E testing',
        category: 'guidelines',
        specialty: 'general',
      },
      timeout: T,
    });
    expect([200, 201].includes(r.status())).toBe(true);
    logTestSuccess('Clinical resource created');
  });
});

// === 3. MEDICAL CONSULTANTS ===

test.describe('3. Medical Consultants', () => {
  test.beforeAll(async ({ request }) => { await tokens(request); });

  test('CON-01: Patient consultants list', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/consultants`, { timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Patient consultants OK');
  });

  test('CON-02: Doctor consultants list', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/consultants`, { timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Doctor consultants OK');
  });

  test('CON-03: Consultant specialties', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/consultants/specialties`, { timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Specialties OK');
  });

  test('CON-04: Admin creates consultant', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/consultants`, {
      headers: authHeaders(atk),
      data: {
        name: 'นพ. ทดสอบ ที่ปรึกษา (E2E)',
        specialty: 'Cardiology',
        hospital: 'E2E Test Hospital',
        email: 'e2e.consultant@hospital.co.th',
        phone: '0891111111',
      },
      timeout: T,
    });
    expect([200, 201].includes(r.status())).toBe(true);
    logTestSuccess('Consultant created');
  });
});

// === 4. NOTIFICATIONS ===

test.describe('4. Notifications', () => {
  test.beforeAll(async ({ request }) => { await tokens(request); });

  test('NOTIF-01: Patient notifications', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/notifications`, { headers: authHeaders(ptk), timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Patient notifications OK');
  });

  test('NOTIF-02: Patient unread count', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/notifications/count`, { headers: authHeaders(ptk), timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Patient unread count OK');
  });

  test('NOTIF-03: Doctor notifications', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/notifications`, { headers: authHeaders(dtk), timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Doctor notifications OK');
  });

  test('NOTIF-04: Admin notifications', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/notifications`, { headers: authHeaders(atk), timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Admin notifications OK');
  });

  test('NOTIF-05: Mark notification read', async ({ request }) => {
    const list = await request.get(`${PATIENT_URL}/api/notifications`, { headers: authHeaders(ptk), timeout: T });
    const body = await list.json();
    const notifs = body.notifications || body.data || body;
    if (Array.isArray(notifs) && notifs.length > 0) {
      const nid = notifs[0].id || notifs[0].notificationId;
      const r = await request.put(`${PATIENT_URL}/api/notifications/${nid}/read`, {
        headers: authHeaders(ptk), timeout: T });
      expect(r.status()).toBe(200);
      logTestSuccess('Notification marked read');
    } else {
      logTestSuccess('No notifications to mark (OK)');
    }
  });

  test('NOTIF-06: Mark all read', async ({ request }) => {
    const r = await request.put(`${PATIENT_URL}/api/notifications/read-all`, {
      headers: authHeaders(ptk), timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('All notifications marked read');
  });

  test('NOTIF-07: Notification settings', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/notifications/settings`, { headers: authHeaders(ptk), timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Notification settings OK');
  });
});

// === 5. METADATA ===

test.describe('5. Metadata', () => {
  test('META-01: Medications', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/metadata/medications`, { timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Medications metadata OK');
  });

  test('META-02: Lab tests', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/metadata/lab-tests`, { timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Lab tests metadata OK');
  });

  test('META-03: ICD-10 codes', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/metadata/icd10-codes`, { timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('ICD-10 metadata OK');
  });

  test('META-04: Specialties', async ({ request }) => {
    // Specialties available at /api/consultants/specialties (public, no auth needed)
    const r = await request.get(`${DOCTOR_URL}/api/consultants/specialties`, { timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Specialties metadata OK');
  });

  test('META-05: Health tips', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/content/health-tips`, { timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Health tips OK');
  });
});

// === 6. USER MANAGEMENT ===

test.describe('6. User Management (Admin)', () => {
  test.beforeAll(async ({ request }) => { await tokens(request); });

  test('USR-01: Admin lists all users', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/admin/users`, { headers: authHeaders(atk), timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Admin users list OK');
  });

  test('USR-02: Admin pending doctors', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/admin/pending-doctors`, { headers: authHeaders(atk), timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Admin pending doctors OK');
  });

  test('USR-03: Doctor profile', async ({ request }) => {
    // Use /api/doctors/:doctorId which doesn't conflict with route params
    const r = await request.get(`${DOCTOR_URL}/api/doctors/${CREDENTIALS.doctor.id}`, { headers: authHeaders(dtk), timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Doctor profile OK');
  });
});
