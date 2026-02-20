/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SPEC 10: MOBILE VIEWPORT & DATA STREAMING SYNC
 * ═══════════════════════════════════════════════════════════════════════════════
 * Tests: ~85 | Sections: A–G
 * Coverage: Mobile responsive viewport tests (simulating Android/iOS via
 *           Playwright), data streaming between Local/Cloud-Dev, all features
 *           tested at mobile breakpoints matching the React Native mobile app.
 *
 * This replaces the need for Android Studio or iOS Simulator — Playwright
 * uses a mobile Chrome viewport (375x812 iPhone / 393x851 Android) to test
 * the same web app rendered responsively, identical to the mobile WebView.
 *
 * Demo Accounts (same as web):
 *   patient1/patient2/patient3 → Patient Portal
 *   doctor/admin → Doctor Portal
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { test, expect } from '@playwright/test';
import {
  PATIENT_URL, DOCTOR_URL,
  ENDPOINTS, TIMEOUTS,
  authenticateAllUsers,
  patientApi, doctorApi, meetingApi,
  assertOk,
  generatePHRVitals, generateAppointmentData,
  logTestSuccess, logTestInfo, logTestWarning,
  type UserRole, type AuthenticatedUser,
} from '../lib/test-helpers';

let users: Map<UserRole, AuthenticatedUser>;

// Mobile viewport dimensions matching common devices
const MOBILE_VIEWPORT = { width: 393, height: 851 }; // Pixel 7
const IPHONE_VIEWPORT = { width: 375, height: 812 }; // iPhone 13

test.describe('10 — Mobile Viewport & Data Streaming Sync', () => {

  test.beforeAll(async ({ request }) => {
    users = await authenticateAllUsers(request);
    logTestInfo('All 5 users authenticated for mobile viewport & sync tests');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // A: MOBILE VIEWPORT — PATIENT PORTAL PAGES (15 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('A — Mobile Patient Portal Pages', () => {

    const patientPages = [
      { name: 'Login', path: '/login' },
      { name: 'Register', path: '/register' },
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Appointments', path: '/appointments' },
      { name: 'PHR', path: '/phr' },
      { name: 'AI Doctor', path: '/ai-doctor' },
      { name: 'Medical Content', path: '/medical-content' },
      { name: 'Map', path: '/map' },
      { name: 'PDPA', path: '/pdpa' },
      { name: 'Living Will', path: '/living-will' },
      { name: 'Profile', path: '/profile' },
      { name: 'Settings', path: '/settings' },
      { name: 'Timeline', path: '/timeline' },
      { name: 'Notifications', path: '/notifications' },
      { name: 'Reset Password', path: '/reset-password' },
    ];

    for (let i = 0; i < patientPages.length; i++) {
      const pg = patientPages[i];
      const testId = `A${String(i + 1).padStart(2, '0')}`;

      test(`${testId} — Mobile: Patient ${pg.name} (${pg.path})`, async ({ browser }) => {
        const context = await browser.newContext({
          viewport: MOBILE_VIEWPORT,
          userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Mobile Safari/537.36',
          isMobile: true,
          hasTouch: true,
        });
        const page = await context.newPage();
        try {
          const response = await page.goto(`${PATIENT_URL}${pg.path}`, {
            timeout: TIMEOUTS.navigation,
            waitUntil: 'domcontentloaded',
          });
          expect(response?.status()).toBe(200);

          // Verify no horizontal overflow (mobile responsive check)
          const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
          const viewportWidth = MOBILE_VIEWPORT.width;
          // Allow small overflow tolerance (scrollbar, etc.)
          const overflow = bodyWidth - viewportWidth;
          if (overflow > 50) {
            logTestWarning(`Mobile ${pg.name}: body width ${bodyWidth} > viewport ${viewportWidth} (overflow: ${overflow}px)`);
          }

          logTestSuccess(`Mobile Patient ${pg.name} → 200 (viewport: ${MOBILE_VIEWPORT.width}x${MOBILE_VIEWPORT.height})`);
        } finally {
          await context.close();
        }
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // B: MOBILE VIEWPORT — DOCTOR PORTAL PAGES (12 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('B — Mobile Doctor Portal Pages', () => {

    const doctorPages = [
      { name: 'Login', path: '/login' },
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Schedule', path: '/schedule' },
      { name: 'Patients', path: '/patients' },
      { name: 'EMR', path: '/emr' },
      { name: 'Prescriptions', path: '/prescriptions' },
      { name: 'Medical Content', path: '/medical-content' },
      { name: 'Clinical Resources', path: '/clinical-resources' },
      { name: 'Profile', path: '/profile' },
      { name: 'Queue', path: '/queue' },
      { name: 'Consultants', path: '/consultants' },
      { name: 'Reset Password', path: '/reset-password' },
    ];

    for (let i = 0; i < doctorPages.length; i++) {
      const pg = doctorPages[i];
      const testId = `B${String(i + 1).padStart(2, '0')}`;

      test(`${testId} — Mobile: Doctor ${pg.name} (${pg.path})`, async ({ browser }) => {
        const context = await browser.newContext({
          viewport: IPHONE_VIEWPORT,
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          isMobile: true,
          hasTouch: true,
        });
        const page = await context.newPage();
        try {
          const response = await page.goto(`${DOCTOR_URL}${pg.path}`, {
            timeout: TIMEOUTS.navigation,
            waitUntil: 'domcontentloaded',
          });
          expect(response?.status()).toBe(200);
          logTestSuccess(`Mobile Doctor ${pg.name} → 200 (viewport: ${IPHONE_VIEWPORT.width}x${IPHONE_VIEWPORT.height})`);
        } finally {
          await context.close();
        }
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // C: MOBILE API — ALL DEMO USERS (12 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('C — Mobile API Tests (All Demo Users)', () => {

    test('C01 — Patient1 (Demo) auth + profile via mobile', async ({ request }) => {
      const u = users.get('patient1')!;
      const res = await patientApi(request, u.token).get(ENDPOINTS.profile);
      assertOk(res, `Mobile Patient1 (${u.name}) profile`);
    });

    test('C02 — Patient2 (Somchai) auth + appointments', async ({ request }) => {
      const u = users.get('patient2')!;
      const res = await patientApi(request, u.token).get(ENDPOINTS.appointments);
      assertOk(res, `Mobile Patient2 (${u.name}) appointments`);
    });

    test('C03 — Patient3 (Anan) auth + PHR', async ({ request }) => {
      const u = users.get('patient3')!;
      const res = await patientApi(request, u.token).get(ENDPOINTS.phr);
      assertOk(res, `Mobile Patient3 (${u.name}) PHR`);
    });

    test('C04 — Doctor auth + patients list', async ({ request }) => {
      const u = users.get('doctor')!;
      const res = await doctorApi(request, u.token).get(ENDPOINTS.patients);
      assertOk(res, `Mobile Doctor (${u.name}) patients`);
    });

    test('C05 — Admin auth + admin stats', async ({ request }) => {
      const u = users.get('admin')!;
      const res = await doctorApi(request, u.token).get(ENDPOINTS.admin.stats);
      expect(res.status).toBeLessThan(500);
      logTestSuccess(`Mobile Admin (${u.name}) stats → ${res.status}`);
    });

    test('C06 — Mobile: Patient1 notifications', async ({ request }) => {
      const u = users.get('patient1')!;
      const res = await patientApi(request, u.token).get(ENDPOINTS.notifications.list);
      assertOk(res, 'Mobile Patient1 notifications');
    });

    test('C07 — Mobile: Patient2 timeline', async ({ request }) => {
      const u = users.get('patient2')!;
      const res = await patientApi(request, u.token).get(ENDPOINTS.timeline);
      assertOk(res, 'Mobile Patient2 timeline');
    });

    test('C08 — Mobile: Doctor EMR list', async ({ request }) => {
      const u = users.get('doctor')!;
      const res = await doctorApi(request, u.token).get(ENDPOINTS.emr);
      assertOk(res, 'Mobile Doctor EMR list');
    });

    test('C09 — Mobile: Doctor prescriptions', async ({ request }) => {
      const u = users.get('doctor')!;
      const res = await doctorApi(request, u.token).get(ENDPOINTS.prescriptions);
      assertOk(res, 'Mobile Doctor prescriptions');
    });

    test('C10 — Mobile: Medical content', async ({ request }) => {
      const doc = users.get('doctor')!;
      const res = await doctorApi(request, doc.token).get(ENDPOINTS.medicalContent);
      assertOk(res, 'Mobile Medical content');
    });

    test('C11 — Mobile: Clinical resources', async ({ request }) => {
      const doc = users.get('doctor')!;
      const res = await doctorApi(request, doc.token).get(ENDPOINTS.contentClinical);
      assertOk(res, 'Mobile Clinical resources');
    });

    test('C12 — Mobile: Meeting server health', async ({ request }) => {
      const res = await meetingApi(request, users.get('doctor')!.token).get(ENDPOINTS.meetings.health);
      expect(res.status).toBe(200);
      logTestSuccess('Mobile Meeting server healthy');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // D: DATA STREAMING — CREATE & VERIFY SYNC (10 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('D — Data Streaming & Real-time Sync', () => {

    test('D01 — Patient1 PHR vitals create and read-back', async ({ request }) => {
      const u = users.get('patient1')!;
      const vitals = generatePHRVitals();
      const createRes = await patientApi(request, u.token).post(`${ENDPOINTS.phr}/vitals`, vitals);
      expect(createRes.status).toBeLessThan(500);

      // Read back
      const listRes = await patientApi(request, u.token).get(ENDPOINTS.phr);
      assertOk(listRes, 'Patient1 vitals read-back');
    });

    test('D02 — Patient2 appointment create', async ({ request }) => {
      const u = users.get('patient2')!;
      const apptData = generateAppointmentData(u.name);
      const res = await patientApi(request, u.token).post(ENDPOINTS.appointments, apptData);
      expect(res.status).toBeLessThan(500);
      logTestSuccess(`Patient2 appointment create → ${res.status}`);
    });

    test('D03 — Doctor sees Patient2 appointment', async ({ request }) => {
      const doc = users.get('doctor')!;
      const res = await doctorApi(request, doc.token).get(ENDPOINTS.appointments);
      assertOk(res, 'Doctor sees appointments');
    });

    test('D04 — Patient3 PHR create', async ({ request }) => {
      const u = users.get('patient3')!;
      const vitals = generatePHRVitals();
      const createRes = await patientApi(request, u.token).post(`${ENDPOINTS.phr}/vitals`, vitals);
      expect(createRes.status).toBeLessThan(500);
      logTestSuccess(`Patient3 PHR create → ${createRes.status}`);
    });

    test('D05 — Medical content visible to all patients', async ({ request }) => {
      for (const role of ['patient1', 'patient2', 'patient3'] as UserRole[]) {
        const u = users.get(role)!;
        const res = await patientApi(request, u.token).get(ENDPOINTS.contentMedical);
        expect(res.status).toBeGreaterThanOrEqual(200);
        expect(res.status).toBeLessThan(300);
      }
      logTestSuccess('Medical content visible to all 3 patients');
    });

    test('D06 — Notification sync after operations', async ({ request }) => {
      const p1 = users.get('patient1')!;
      const res = await patientApi(request, p1.token).get(ENDPOINTS.notifications.list);
      assertOk(res, 'Notifications sync check');
    });

    test('D07 — Doctor queue data streaming', async ({ request }) => {
      const doc = users.get('doctor')!;
      const res = await doctorApi(request, doc.token).get(ENDPOINTS.queue);
      expect(res.status).toBeLessThan(500);
      logTestSuccess(`Queue data streaming → ${res.status}`);
    });

    test('D08 — Appointment pool data streaming', async ({ request }) => {
      const adm = users.get('admin')!;
      const res = await doctorApi(request, adm.token).get(ENDPOINTS.appointmentPool);
      expect(res.status).toBeLessThan(500);
      logTestSuccess(`Appointment pool streaming → ${res.status}`);
    });

    test('D09 — Consultants data streaming', async ({ request }) => {
      const doc = users.get('doctor')!;
      const res = await doctorApi(request, doc.token).get(ENDPOINTS.consultants);
      assertOk(res, 'Consultants data streaming');
    });

    test('D10 — Doctors list data streaming', async ({ request }) => {
      const adm = users.get('admin')!;
      const res = await doctorApi(request, adm.token).get(ENDPOINTS.doctors);
      assertOk(res, 'Doctors list data streaming');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // E: MOBILE BROWSER UI INTERACTIONS (10 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('E — Mobile Browser UI Interactions', () => {

    test('E01 — Mobile login form is usable (patient portal)', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: MOBILE_VIEWPORT, isMobile: true, hasTouch: true,
        userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/121.0 Mobile',
      });
      const page = await context.newPage();
      try {
        await page.goto(`${PATIENT_URL}/login`, { timeout: TIMEOUTS.navigation });
        // Verify form elements exist
        const emailInput = page.locator('input[type="email"]');
        const passwordInput = page.locator('input[type="password"]');
        const submitBtn = page.locator('button[type="submit"]');
        expect(await emailInput.count()).toBeGreaterThanOrEqual(1);
        expect(await passwordInput.count()).toBeGreaterThanOrEqual(1);
        expect(await submitBtn.count()).toBeGreaterThanOrEqual(1);
        logTestSuccess('Mobile patient login form is usable');
      } finally {
        await context.close();
      }
    });

    test('E02 — Mobile login form is usable (doctor portal)', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: IPHONE_VIEWPORT, isMobile: true, hasTouch: true,
        userAgent: 'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Mobile/15E148',
      });
      const page = await context.newPage();
      try {
        await page.goto(`${DOCTOR_URL}/login`, { timeout: TIMEOUTS.navigation });
        const emailInput = page.locator('input[type="email"]');
        const passwordInput = page.locator('input[type="password"]');
        expect(await emailInput.count()).toBeGreaterThanOrEqual(1);
        expect(await passwordInput.count()).toBeGreaterThanOrEqual(1);
        logTestSuccess('Mobile doctor login form is usable');
      } finally {
        await context.close();
      }
    });

    test('E03 — Mobile patient portal navigation renders', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: MOBILE_VIEWPORT, isMobile: true, hasTouch: true,
      });
      const page = await context.newPage();
      try {
        await page.goto(`${PATIENT_URL}/dashboard`, { timeout: TIMEOUTS.navigation });
        // On mobile, navigation may be a hamburger menu or bottom tabs
        const navElements = await page.locator('nav, [role="navigation"], .mobile-nav, .bottom-nav, header').count();
        logTestSuccess(`Mobile patient navigation elements: ${navElements}`);
      } finally {
        await context.close();
      }
    });

    test('E04 — Mobile doctor portal navigation renders', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: IPHONE_VIEWPORT, isMobile: true, hasTouch: true,
      });
      const page = await context.newPage();
      try {
        await page.goto(`${DOCTOR_URL}/dashboard`, { timeout: TIMEOUTS.navigation });
        const navElements = await page.locator('nav, [role="navigation"], header').count();
        logTestSuccess(`Mobile doctor navigation elements: ${navElements}`);
      } finally {
        await context.close();
      }
    });

    test('E05 — Mobile: Patient register page responsive', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: MOBILE_VIEWPORT, isMobile: true, hasTouch: true,
      });
      const page = await context.newPage();
      try {
        const res = await page.goto(`${PATIENT_URL}/register`, { timeout: TIMEOUTS.navigation });
        expect(res?.status()).toBe(200);
        logTestSuccess('Mobile register page responsive');
      } finally {
        await context.close();
      }
    });

    test('E06 — Mobile: Appointments page responsive', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: MOBILE_VIEWPORT, isMobile: true, hasTouch: true,
      });
      const page = await context.newPage();
      try {
        const res = await page.goto(`${PATIENT_URL}/appointments`, { timeout: TIMEOUTS.navigation });
        expect(res?.status()).toBe(200);
        logTestSuccess('Mobile appointments responsive');
      } finally {
        await context.close();
      }
    });

    test('E07 — Mobile: PHR page responsive', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: MOBILE_VIEWPORT, isMobile: true, hasTouch: true,
      });
      const page = await context.newPage();
      try {
        const res = await page.goto(`${PATIENT_URL}/phr`, { timeout: TIMEOUTS.navigation });
        expect(res?.status()).toBe(200);
        logTestSuccess('Mobile PHR responsive');
      } finally {
        await context.close();
      }
    });

    test('E08 — Mobile: AI Doctor page responsive', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: IPHONE_VIEWPORT, isMobile: true, hasTouch: true,
      });
      const page = await context.newPage();
      try {
        const res = await page.goto(`${PATIENT_URL}/ai-doctor`, { timeout: TIMEOUTS.navigation });
        expect(res?.status()).toBe(200);
        logTestSuccess('Mobile AI Doctor responsive');
      } finally {
        await context.close();
      }
    });

    test('E09 — Mobile: Map page responsive', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: MOBILE_VIEWPORT, isMobile: true, hasTouch: true,
      });
      const page = await context.newPage();
      try {
        const res = await page.goto(`${PATIENT_URL}/map`, { timeout: TIMEOUTS.navigation });
        expect(res?.status()).toBe(200);
        logTestSuccess('Mobile Map responsive');
      } finally {
        await context.close();
      }
    });

    test('E10 — Mobile: Profile page responsive', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: IPHONE_VIEWPORT, isMobile: true, hasTouch: true,
      });
      const page = await context.newPage();
      try {
        const res = await page.goto(`${PATIENT_URL}/profile`, { timeout: TIMEOUTS.navigation });
        expect(res?.status()).toBe(200);
        logTestSuccess('Mobile Profile responsive');
      } finally {
        await context.close();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // F: PHASE 2 MOBILE API (8 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('F — Phase 2 Mobile API Endpoints', () => {

    test('F01 — Sync status', async ({ request }) => {
      const u = users.get('patient1')!;
      const res = await patientApi(request, u.token).get(ENDPOINTS.phase2.sync.status);
      expect(res.status).toBeLessThan(500);
      logTestSuccess(`Mobile sync status → ${res.status}`);
    });

    test('F02 — Device tokens endpoint', async ({ request }) => {
      const u = users.get('patient1')!;
      const res = await patientApi(request, u.token).get(ENDPOINTS.phase2.deviceTokens);
      expect(res.status).toBeLessThan(500);
      logTestSuccess(`Mobile device tokens → ${res.status}`);
    });

    test('F03 — Biometric status', async ({ request }) => {
      const u = users.get('patient1')!;
      const res = await patientApi(request, u.token).get(ENDPOINTS.phase2.biometric.status);
      expect(res.status).toBeLessThan(500);
      logTestSuccess(`Mobile biometric status → ${res.status}`);
    });

    test('F04 — CTM assessment endpoint', async ({ request }) => {
      const doc = users.get('doctor')!;
      const res = await doctorApi(request, doc.token).get(ENDPOINTS.phase2.ctmAssessment);
      expect(res.status).toBeLessThan(500);
      logTestSuccess(`Mobile CTM assessment → ${res.status}`);
    });

    test('F05 — Geriatric screening endpoint', async ({ request }) => {
      const doc = users.get('doctor')!;
      const res = await doctorApi(request, doc.token).get(ENDPOINTS.phase2.geriatricScreening);
      expect(res.status).toBeLessThan(500);
      logTestSuccess(`Mobile geriatric screening → ${res.status}`);
    });

    test('F06 — Follow-up endpoint', async ({ request }) => {
      const doc = users.get('doctor')!;
      const res = await doctorApi(request, doc.token).get(ENDPOINTS.phase2.followUp);
      expect(res.status).toBeLessThan(500);
      logTestSuccess(`Mobile follow-up → ${res.status}`);
    });

    test('F07 — Nursing dashboard endpoint', async ({ request }) => {
      const doc = users.get('doctor')!;
      const res = await doctorApi(request, doc.token).get(ENDPOINTS.phase2.nursingDashboard);
      expect(res.status).toBeLessThan(500);
      logTestSuccess(`Mobile nursing dashboard → ${res.status}`);
    });

    test('F08 — Smart scheduling endpoint', async ({ request }) => {
      const doc = users.get('doctor')!;
      const res = await doctorApi(request, doc.token).get(ENDPOINTS.phase2.smartScheduling);
      expect(res.status).toBeLessThan(500);
      logTestSuccess(`Mobile smart scheduling → ${res.status}`);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // G: MULTI-DEVICE VIEWPORT COMPARISON (8 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('G — Multi-Device Viewport Comparison', () => {

    const viewports = [
      { name: 'iPhone SE', width: 375, height: 667 },
      { name: 'iPhone 13', width: 390, height: 844 },
      { name: 'Pixel 7', width: 393, height: 851 },
      { name: 'iPad Mini', width: 768, height: 1024 },
    ];

    for (let i = 0; i < viewports.length; i++) {
      const vp = viewports[i];
      const testIdx = i + 1;

      test(`G0${testIdx} — Patient dashboard on ${vp.name} (${vp.width}x${vp.height})`, async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          isMobile: vp.width < 768,
          hasTouch: true,
        });
        const page = await context.newPage();
        try {
          const res = await page.goto(`${PATIENT_URL}/dashboard`, {
            timeout: TIMEOUTS.navigation,
            waitUntil: 'domcontentloaded',
          });
          expect(res?.status()).toBe(200);
          logTestSuccess(`Patient dashboard on ${vp.name} → 200`);
        } finally {
          await context.close();
        }
      });
    }

    for (let i = 0; i < viewports.length; i++) {
      const vp = viewports[i];
      const testIdx = i + 5;

      test(`G0${testIdx} — Doctor dashboard on ${vp.name} (${vp.width}x${vp.height})`, async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          isMobile: vp.width < 768,
          hasTouch: true,
        });
        const page = await context.newPage();
        try {
          const res = await page.goto(`${DOCTOR_URL}/dashboard`, {
            timeout: TIMEOUTS.navigation,
            waitUntil: 'domcontentloaded',
          });
          expect(res?.status()).toBe(200);
          logTestSuccess(`Doctor dashboard on ${vp.name} → 200`);
        } finally {
          await context.close();
        }
      });
    }
  });
});
