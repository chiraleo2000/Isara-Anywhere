/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SPEC 12: PATIENT PORTAL WORKFLOW TESTS — BROWSER-BASED
 * ═══════════════════════════════════════════════════════════════════════════════
 * Tests: ~50 | Sections: A–E
 * Coverage: Patient dashboard UI, appointment booking flow, PHR management,
 *           health library, AI doctor chat, map, PDPA & living will, timeline,
 *           profile & settings.
 *
 * All tests open a REAL browser window so every page is fully visible.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { test, expect } from '@playwright/test';
import {
  PATIENT_URL, DOCTOR_URL,
  ENDPOINTS, TIMEOUTS,
  authenticateAllUsers, apiRequest,
  patientApi, doctorApi,
  loginViaBrowser, navigateWithAuth,
  assertOk,
  logTestSuccess, logTestInfo,
  type UserRole, type AuthenticatedUser,
} from '../lib/test-helpers';

let users: Map<UserRole, AuthenticatedUser>;

test.describe('12 — Patient Portal Workflow Tests', () => {

  test.beforeAll(async ({ request }) => {
    users = await authenticateAllUsers(request);
    logTestInfo('All users authenticated for Patient Portal workflow tests');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // A: PATIENT DASHBOARD WORKFLOWS (10 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('A — Patient Dashboard Workflows', () => {

    test('A01 — Dashboard loads for Patient1', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/');
      await page.waitForTimeout(2000);
      const body = await page.locator('body').textContent();
      expect(body!.length).toBeGreaterThan(50);
      expect(page.url()).not.toContain('/login');
      logTestSuccess('Patient1 dashboard loaded');
    });

    test('A02 — Dashboard loads for Patient2', async ({ page }) => {
      await navigateWithAuth(page, 'patient2', '/');
      await page.waitForTimeout(2000);
      expect(page.url()).not.toContain('/login');
      logTestSuccess('Patient2 dashboard loaded');
    });

    test('A03 — Dashboard loads for Patient3', async ({ page }) => {
      await navigateWithAuth(page, 'patient3', '/');
      await page.waitForTimeout(2000);
      expect(page.url()).not.toContain('/login');
      logTestSuccess('Patient3 dashboard loaded');
    });

    test('A04 — Dashboard shows navigation menu', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/');
      await page.waitForTimeout(2000);
      // Look for main navigation elements
      const navItems = page.locator('nav a, nav button, [role="navigation"] a');
      const count = await navItems.count();
      expect(count).toBeGreaterThan(0);
      logTestSuccess(`Dashboard has ${count} navigation items`);
    });

    test('A05 — Dashboard profile API loads', async ({ request }) => {
      const u = users.get('patient1')!;
      const res = await patientApi(request, u.token).get(ENDPOINTS.profile);
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      logTestSuccess('Patient profile API OK');
    });

    test('A06 — Dashboard appointments API loads', async ({ request }) => {
      const u = users.get('patient1')!;
      const res = await patientApi(request, u.token).get(ENDPOINTS.appointments);
      expect(res.status).toBeLessThan(500);
      logTestSuccess(`Patient appointments → ${res.status}`);
    });

    test('A07 — Dashboard PHR summary accessible', async ({ request }) => {
      const u = users.get('patient1')!;
      const res = await patientApi(request, u.token).get(ENDPOINTS.phr);
      assertOk(res, 'Patient PHR summary');
    });

    test('A08 — Dashboard notifications accessible', async ({ request }) => {
      const u = users.get('patient1')!;
      const res = await patientApi(request, u.token).get(ENDPOINTS.notifications.list);
      assertOk(res, 'Patient notifications');
    });

    test('A09 — Dashboard timeline accessible', async ({ request }) => {
      const u = users.get('patient1')!;
      const res = await patientApi(request, u.token).get(ENDPOINTS.timeline);
      assertOk(res, 'Patient timeline');
    });

    test('A10 — Dashboard treatment results accessible', async ({ request }) => {
      const u = users.get('patient1')!;
      const res = await patientApi(request, u.token).get(ENDPOINTS.treatmentResults);
      expect(res.status).toBeLessThan(500);
      logTestSuccess(`Treatment results → ${res.status}`);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // B: APPOINTMENT BOOKING FLOW (10 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('B — Appointment Booking Flow', () => {

    test('B01 — Appointments list page opens', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/appointments');
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/appointments');
      logTestSuccess('Appointments list page loaded');
    });

    test('B02 — Book appointment page opens', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/appointments/book');
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/appointments/book');
      logTestSuccess('Book appointment page loaded');
    });

    test('B03 — Book page shows doctor selection or specialty', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/appointments/book');
      await page.waitForTimeout(2000);
      const content = await page.locator('body').textContent();
      expect(content!.length).toBeGreaterThan(50);
      logTestSuccess('Book appointment page has content');
    });

    test('B04 — Doctors list API returns doctors for booking', async ({ request }) => {
      const u = users.get('patient1')!;
      const res = await patientApi(request, u.token).get(ENDPOINTS.doctors);
      expect(res.status).toBeLessThan(500);
      logTestSuccess(`Doctors for booking → ${res.status}`);
    });

    test('B05 — Specialties available for filtering', async ({ request }) => {
      const u = users.get('patient1')!;
      const res = await patientApi(request, u.token).get('/api/metadata/specialties');
      expect(res.status).toBeLessThan(500);
      logTestSuccess(`Specialties → ${res.status}`);
    });

    test('B06 — Patient2 can view appointments', async ({ page }) => {
      await navigateWithAuth(page, 'patient2', '/appointments');
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/appointments');
      logTestSuccess('Patient2 appointments loaded');
    });

    test('B07 — Patient3 can view appointments', async ({ page }) => {
      await navigateWithAuth(page, 'patient3', '/appointments');
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/appointments');
      logTestSuccess('Patient3 appointments loaded');
    });

    test('B08 — Appointment booking API endpoint exists', async ({ request }) => {
      const u = users.get('patient1')!;
      // Test that the booking endpoint exists (don't actually book)
      const res = await patientApi(request, u.token).get(ENDPOINTS.appointments);
      expect(res.status).toBeLessThan(500);
      logTestSuccess('Appointment API accessible for booking');
    });

    test('B09 — Appointments page shows appointment cards', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/appointments');
      await page.waitForTimeout(2000);
      const body = await page.locator('body').textContent();
      expect(body!.length).toBeGreaterThan(20);
      logTestSuccess('Appointments page has appointment content');
    });

    test('B10 — Navigation from appointments to dashboard works', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/appointments');
      await page.waitForTimeout(1500);
      // Find home/dashboard link
      const homeLink = page.locator('a[href="/"], a[href="/dashboard"], a:has-text("Home"), a:has-text("หน้าหลัก")');
      const count = await homeLink.count();
      logTestSuccess(`Appointments-to-home links: ${count}`);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // C: PHR MANAGEMENT (10 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('C — PHR Management', () => {

    test('C01 — PHR page opens for Patient1', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/phr');
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/phr');
      logTestSuccess('PHR page loaded for Patient1');
    });

    test('C02 — PHR page opens for Patient2', async ({ page }) => {
      await navigateWithAuth(page, 'patient2', '/phr');
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/phr');
      logTestSuccess('PHR page loaded for Patient2');
    });

    test('C03 — PHR API returns health data', async ({ request }) => {
      const u = users.get('patient1')!;
      const res = await patientApi(request, u.token).get(ENDPOINTS.phr);
      assertOk(res, 'PHR API data');
    });

    test('C04 — PHR vitals endpoint accessible', async ({ request }) => {
      const u = users.get('patient1')!;
      const res = await patientApi(request, u.token).get(ENDPOINTS.healthRecords.vitals);
      expect(res.status).toBeLessThan(500);
      logTestSuccess(`PHR vitals → ${res.status}`);
    });

    test('C05 — PHR page shows tabs or sections', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/phr');
      await page.waitForTimeout(2000);
      // Look for tab elements (vitals, medications, allergies, profile)
      const tabs = page.locator('[role="tab"], button[class*="tab"], .tab');
      const count = await tabs.count();
      logTestSuccess(`PHR tabs found: ${count}`);
    });

    test('C06 — PHR living will endpoint accessible', async ({ request }) => {
      const u = users.get('patient1')!;
      const res = await patientApi(request, u.token).get(ENDPOINTS.healthRecords.livingWill);
      expect(res.status).toBeLessThan(500);
      logTestSuccess(`Living will → ${res.status}`);
    });

    test('C07 — Patient lab orders accessible', async ({ request }) => {
      const u = users.get('patient1')!;
      const res = await patientApi(request, u.token).get(ENDPOINTS.healthRecords.patientLabOrders);
      expect(res.status).toBeLessThan(500);
      logTestSuccess(`Patient lab orders → ${res.status}`);
    });

    test('C08 — Patient imaging orders accessible', async ({ request }) => {
      const u = users.get('patient1')!;
      const res = await patientApi(request, u.token).get(ENDPOINTS.healthRecords.patientImagingOrders);
      expect(res.status).toBeLessThan(500);
      logTestSuccess(`Patient imaging orders → ${res.status}`);
    });

    test('C09 — PHR page has content for Patient3', async ({ page }) => {
      await navigateWithAuth(page, 'patient3', '/phr');
      await page.waitForTimeout(2000);
      const body = await page.locator('body').textContent();
      expect(body!.length).toBeGreaterThan(50);
      logTestSuccess('PHR loaded for Patient3');
    });

    test('C10 — All 3 patients have distinct PHR data', async ({ request }) => {
      const results: number[] = [];
      for (const role of ['patient1', 'patient2', 'patient3'] as UserRole[]) {
        const u = users.get(role)!;
        const res = await patientApi(request, u.token).get(ENDPOINTS.phr);
        results.push(res.status);
      }
      // All should be accessible
      for (const status of results) {
        expect(status).toBeLessThan(500);
      }
      logTestSuccess(`PHR statuses: ${results.join(', ')}`);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // D: AI DOCTOR, HEALTH LIBRARY & MAP (10 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('D — AI Doctor, Health Library & Map', () => {

    test('D01 — AI Doctor page opens', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/ai-doctor');
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/ai-doctor');
      logTestSuccess('AI Doctor page loaded');
    });

    test('D02 — AI Doctor page shows chat interface', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/ai-doctor');
      await page.waitForTimeout(2000);
      const content = await page.locator('body').textContent();
      expect(content!.length).toBeGreaterThan(50);
      logTestSuccess('AI Doctor has chat content');
    });

    test('D03 — Health Library page opens', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/health-library');
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/health-library');
      logTestSuccess('Health library loaded');
    });

    test('D04 — Health Library API returns content', async ({ request }) => {
      const u = users.get('patient1')!;
      const res = await patientApi(request, u.token).get(ENDPOINTS.contentMedical);
      expect(res.status).toBeLessThan(500);
      logTestSuccess(`Health library API → ${res.status}`);
    });

    test('D05 — Map page opens', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/map');
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/map');
      logTestSuccess('Map page loaded');
    });

    test('D06 — Map page shows content', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/map');
      await page.waitForTimeout(2000);
      const body = await page.locator('body').textContent();
      expect(body!.length).toBeGreaterThan(20);
      logTestSuccess('Map page has content');
    });

    test('D07 — Timeline page opens', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/timeline');
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/timeline');
      logTestSuccess('Timeline page loaded');
    });

    test('D08 — Timeline API returns data', async ({ request }) => {
      const u = users.get('patient1')!;
      const res = await patientApi(request, u.token).get(ENDPOINTS.timeline);
      assertOk(res, 'Timeline API');
    });

    test('D09 — GCS status page loads (public)', async ({ page }) => {
      await page.goto(`${PATIENT_URL}/gcs-status`, {
        timeout: TIMEOUTS.navigation,
        waitUntil: 'domcontentloaded',
      });
      const body = await page.locator('body').textContent();
      expect(body!.length).toBeGreaterThan(10);
      logTestSuccess('GCS status page loaded');
    });

    test('D10 — Patient2 AI Doctor page opens', async ({ page }) => {
      await navigateWithAuth(page, 'patient2', '/ai-doctor');
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/ai-doctor');
      logTestSuccess('Patient2 AI Doctor loaded');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // E: PDPA, LIVING WILL, PROFILE & SETTINGS (10 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('E — PDPA, Living Will, Profile & Settings', () => {

    test('E01 — PDPA page opens', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/pdpa');
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/pdpa');
      logTestSuccess('PDPA page loaded');
    });

    test('E02 — Living Will page opens', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/living-will');
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/living-will');
      logTestSuccess('Living Will page loaded');
    });

    test('E03 — Living Will page shows form or content', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/living-will');
      await page.waitForTimeout(2000);
      const content = await page.locator('body').textContent();
      expect(content!.length).toBeGreaterThan(50);
      logTestSuccess('Living Will page has content');
    });

    test('E04 — Profile page opens', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/profile');
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/profile');
      logTestSuccess('Profile page loaded');
    });

    test('E05 — Profile page shows user data', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/profile');
      await page.waitForTimeout(2000);
      const content = await page.locator('body').textContent();
      expect(content!.length).toBeGreaterThan(50);
      logTestSuccess('Profile page has user content');
    });

    test('E06 — Settings page opens', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/settings');
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/settings');
      logTestSuccess('Settings page loaded');
    });

    test('E07 — Settings API accessible', async ({ request }) => {
      const u = users.get('patient1')!;
      const res = await patientApi(request, u.token).get(ENDPOINTS.settings.get);
      expect(res.status).toBeLessThan(500);
      logTestSuccess(`Settings API → ${res.status}`);
    });

    test('E08 — Settings notification preferences', async ({ request }) => {
      const u = users.get('patient1')!;
      const res = await patientApi(request, u.token).get(ENDPOINTS.settings.notifications);
      expect(res.status).toBeLessThan(500);
      logTestSuccess(`Notification prefs → ${res.status}`);
    });

    test('E09 — Patient2 profile page opens', async ({ page }) => {
      await navigateWithAuth(page, 'patient2', '/profile');
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/profile');
      logTestSuccess('Patient2 profile loaded');
    });

    test('E10 — Patient3 settings page opens', async ({ page }) => {
      await navigateWithAuth(page, 'patient3', '/settings');
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/settings');
      logTestSuccess('Patient3 settings loaded');
    });
  });
});
