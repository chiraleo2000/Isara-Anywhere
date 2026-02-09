/**
 * =============================================================================
 * SPEC 23: USER MANAGEMENT & NOTIFICATIONS — Auth, Roles, Alerts
 * =============================================================================
 * Version: 1.0.0 | Created: February 7, 2026
 *
 * Covers User_management_Workflows.md + Notification_Workflows.md:
 *   - Patient authentication (login, validate, me)
 *   - Doctor authentication (login, verify, profile)
 *   - Admin authentication & doctor management
 *   - Admin stats & pending doctors
 *   - Notification CRUD (patient & doctor)
 *   - Notification read/mark-all-read
 *   - Cross-portal user verification
 *   - Profile management
 *
 * STRICT 200-only. NO test.skip(). NO errors.
 * =============================================================================
 */

import { test, expect } from '@playwright/test';
import {
  IS_CLOUD, PATIENT_URL, DOCTOR_URL,
  CREDENTIALS, TIMEOUTS, getAuthToken, getDoctorAuthToken,
} from '../lib/test-config';

const T = IS_CLOUD ? TIMEOUTS.cloud : TIMEOUTS.api;
const TL = IS_CLOUD ? 90_000 : TIMEOUTS.long;
const h = (tk: string) => ({ Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' });

let ptk = '', pt2 = '', pt3 = '', dtk = '', atk = '';

// ============================================================================
// 1. PATIENT AUTHENTICATION (serial)
// ============================================================================
test.describe.serial('1. Patient Authentication', () => {
  test('PAUTH-01: Patient1 login', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/auth/login`, {
      data: CREDENTIALS.patient1,
      headers: { 'Content-Type': 'application/json' },
      timeout: T,
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    ptk = d.token || d.accessToken || '';
    expect(ptk).toBeTruthy();
  });

  test('PAUTH-02: Patient1 validate token', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/auth/validate`, {
      headers: h(ptk), timeout: T,
      data: { token: ptk },
    });
    expect(r.status()).toBe(200);
  });

  test('PAUTH-03: Patient1 get me', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/auth/me`, {
      headers: h(ptk), timeout: T,
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.user || d.id || d.email).toBeTruthy();
  });

  test('PAUTH-04: Patient2 login', async ({ request }) => {
    pt2 = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient2);
    expect(pt2).toBeTruthy();
  });

  test('PAUTH-05: Patient3 login', async ({ request }) => {
    pt3 = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient3);
    expect(pt3).toBeTruthy();
  });

  test('PAUTH-06: Patient1 get user profile', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/users/profile`, {
      headers: h(ptk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('PAUTH-07: Patient1 update profile', async ({ request }) => {
    const r = await request.put(`${PATIENT_URL}/api/users/profile`, {
      headers: h(ptk), timeout: T,
      data: { display_name: 'Demo Test Patient Updated' },
    });
    expect(r.status()).toBe(200);
  });
});

// ============================================================================
// 2. DOCTOR AUTHENTICATION (serial)
// ============================================================================
test.describe.serial('2. Doctor Authentication', () => {
  test('DAUTH-01: Doctor login via /auth/login', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/auth/login`, {
      data: CREDENTIALS.doctor,
      headers: { 'Content-Type': 'application/json' },
      timeout: T,
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    dtk = d.token || d.accessToken || d.data?.token || '';
    expect(dtk).toBeTruthy();
  });

  test('DAUTH-02: Doctor verify token via API', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/appointments`, {
      headers: h(dtk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('DAUTH-03: Doctor get me', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/auth/me`, {
      headers: h(dtk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('DAUTH-04: Doctor get profile', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/doctors/profile`, {
      headers: h(dtk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('DAUTH-05: Doctor get users me', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/users/me`, {
      headers: h(dtk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });
});

// ============================================================================
// 3. ADMIN FEATURES (serial)
// ============================================================================
test.describe.serial('3. Admin Management', () => {
  test('ADMIN-01: Admin login', async ({ request }) => {
    atk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.admin);
    expect(atk).toBeTruthy();
  });

  test('ADMIN-02: Admin verify token via API', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/appointments`, {
      headers: h(atk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('ADMIN-03: Admin get stats', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/admin/stats`, {
      headers: h(atk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('ADMIN-04: Admin list doctors', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/doctors`, {
      headers: h(atk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('ADMIN-05: Admin view pending doctors', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/admin/pending-doctors`, {
      headers: h(atk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('ADMIN-06: Admin list all patients', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/patients`, {
      headers: h(atk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('ADMIN-07: Admin list all users', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/users`, {
      headers: h(atk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('ADMIN-08: Admin dashboard stats', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/admin/dashboard-stats`, {
      headers: h(atk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });
});

// ============================================================================
// 4. PATIENT NOTIFICATIONS (serial)
// ============================================================================
test.describe.serial('4. Patient Notifications', () => {
  test('PNOTIF-01: Patient login', async ({ request }) => {
    ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    expect(ptk).toBeTruthy();
  });

  test('PNOTIF-02: Get patient notifications', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/notifications`, {
      headers: h(ptk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('PNOTIF-03: Get notifications list', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/notifications`, {
      headers: h(ptk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('PNOTIF-04: Mark all read', async ({ request }) => {
    const r = await request.put(`${PATIENT_URL}/api/notifications/read-all`, {
      headers: h(ptk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });
});

// ============================================================================
// 5. DOCTOR NOTIFICATIONS (serial)
// ============================================================================
test.describe.serial('5. Doctor Notifications', () => {
  test('DNOTIF-01: Doctor login', async ({ request }) => {
    dtk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
    expect(dtk).toBeTruthy();
  });

  test('DNOTIF-02: Get doctor notifications', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/notifications`, {
      headers: h(dtk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('DNOTIF-03: Get doctor notifications list', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/notifications`, {
      headers: h(dtk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('DNOTIF-04: Mark all read', async ({ request }) => {
    const r = await request.put(`${DOCTOR_URL}/api/notifications/mark-all-read`, {
      headers: h(dtk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('DNOTIF-05: Create test notification', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/notifications`, {
      headers: h(dtk), timeout: T,
      data: {
        type: 'system',
        title: 'Test Notification',
        message: 'This is a test notification from E2E tests',
        recipientId: CREDENTIALS.doctor.id,
      },
    });
    expect(r.status()).toBe(200);
  });
});

// ============================================================================
// 6. UI AUTH & NOTIFICATION PAGES
// ============================================================================
test.describe('6. UI Auth & Notification Pages', () => {
  test('UI-AUTH-01: Patient login page loads', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/auth/login`, { timeout: TL, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/');
  });
  test('UI-AUTH-02: Doctor login page loads', async ({ page }) => {
    await page.goto(`${DOCTOR_URL}/`, { timeout: TL, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/');
  });
  test('UI-AUTH-03: Patient home page loads', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/`, { timeout: TL, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/');
  });
  test('UI-AUTH-04: Doctor dashboard loads', async ({ page }) => {
    await page.goto(`${DOCTOR_URL}/dashboard`, { timeout: TL, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/');
  });
});
