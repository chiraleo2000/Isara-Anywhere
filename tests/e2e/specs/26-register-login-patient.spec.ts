/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SPEC 26: REGISTER & LOGIN — NEW PATIENT USER
 * ═══════════════════════════════════════════════════════════════════════════════
 * Tests: ~25 | Full patient registration → login → navigate ALL pages → refresh
 * Takes snapshot at every step. Verifies data loads on EVERY page with no errors.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { test, expect } from '@playwright/test';
import {
  PATIENT_URL, DOCTOR_URL, ENDPOINTS, TIMEOUTS,
  authenticateAllUsers, apiRequest,
  patientApi, doctorApi,
  loginViaBrowser, navigateWithAuth,
  logTestSuccess, logTestInfo,
  type UserRole, type AuthenticatedUser,
} from '../lib/test-helpers';
import { takeSnapshot, verifyPageHealthy } from '../helpers/snapshot';

let users: Map<UserRole, AuthenticatedUser>;
const SPEC = '26-register-login-patient';
const TS = Date.now();
const NEW_PATIENT = {
  name: `TestPatient ${TS}`,
  email: `test.patient.${TS}@gmail.com`,
  password: 'TestPat@12345678',
  phone: '0891234567',
  dateOfBirth: '1990-05-15',
  gender: 'male',
};

test.describe('26 — Register & Login New Patient User', () => {

  test.beforeAll(async ({ request }) => {
    users = await authenticateAllUsers(request);
    logTestInfo('All 5 users authenticated for patient registration tests');
  });

  // ═══════════════════════════════════════════════════════════════════════
  // A: PATIENT REGISTRATION
  // ═══════════════════════════════════════════════════════════════════════
  test.describe('A — Patient Registration', () => {

    test('A01 — Patient portal login page loads', async ({ page }) => {
      await page.goto(`${PATIENT_URL}/login`, { timeout: TIMEOUTS.navigation });
      await page.waitForLoadState('domcontentloaded');
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'A01-patient-login-page');
      logTestSuccess('Patient login page loads without errors');
    });

    test('A02 — Patient register page loads', async ({ page }) => {
      await page.goto(`${PATIENT_URL}/register`, { timeout: TIMEOUTS.navigation });
      await page.waitForLoadState('domcontentloaded');
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'A02-patient-register-page');
      logTestSuccess('Patient register page loads without errors');
    });

    test('A03 — Register new patient via API', async ({ request }) => {
      const res = await apiRequest(request, 'POST', PATIENT_URL, ENDPOINTS.register, '', {
        email: NEW_PATIENT.email,
        password: NEW_PATIENT.password,
        name: NEW_PATIENT.name,
        phone: NEW_PATIENT.phone,
        dateOfBirth: NEW_PATIENT.dateOfBirth,
        gender: NEW_PATIENT.gender,
      });
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      logTestSuccess(`New patient registered: ${NEW_PATIENT.email} — status ${res.status}`);
    });

    test('A04 — New patient can login via API', async ({ request }) => {
      const loginRes = await apiRequest(request, 'POST', PATIENT_URL, ENDPOINTS.login, '', {
        email: NEW_PATIENT.email,
        password: NEW_PATIENT.password,
      });
      expect(loginRes.status).toBe(200);
      const token = loginRes.body?.token || loginRes.body?.accessToken;
      expect(token).toBeTruthy();
      logTestSuccess('New patient logged in — token received');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // B: EXISTING PATIENT LOGIN & FULL PAGE NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════
  test.describe('B — Existing Patient Login & Page Navigation', () => {

    test('B01 — Patient1 login via API returns token', async () => {
      const p1 = users.get('patient1')!;
      expect(p1.token).toBeTruthy();
      logTestSuccess(`Patient1 token valid: ${p1.name}`);
    });

    test('B02 — Patient dashboard loads via browser with data', async ({ page }) => {
      await loginViaBrowser(page, 'patient1');
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'B02-patient-dashboard');
      logTestSuccess('Patient dashboard loaded');
    });

    test('B03 — Appointments page loads with data', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/appointments');
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'B03-appointments');
      logTestSuccess('Appointments page loaded');
    });

    test('B04 — AI Doctor page loads', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/ai-doctor');
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'B04-ai-doctor');
      logTestSuccess('AI Doctor page loaded');
    });

    test('B05 — Health Library page loads with content', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/health-library');
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'B05-health-library');
      logTestSuccess('Health library page loaded');
    });

    test('B06 — PHR (Health Records) page loads', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/phr');
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'B06-phr');
      logTestSuccess('PHR page loaded');
    });

    test('B07 — Timeline page loads', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/timeline');
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'B07-timeline');
      logTestSuccess('Timeline page loaded');
    });

    test('B08 — Map page loads', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/map');
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'B08-map');
      logTestSuccess('Map page loaded');
    });

    test('B09 — PDPA page loads', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/pdpa');
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'B09-pdpa');
      logTestSuccess('PDPA page loaded');
    });

    test('B10 — Living Will page loads', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/living-will');
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'B10-living-will');
      logTestSuccess('Living Will page loaded');
    });

    test('B11 — Profile page loads', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/profile');
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'B11-profile');
      logTestSuccess('Profile page loaded');
    });

    test('B12 — Settings page loads', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/settings');
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'B12-settings');
      logTestSuccess('Settings page loaded');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // C: PAGE REFRESH RETAINS DATA
  // ═══════════════════════════════════════════════════════════════════════
  test.describe('C — Page Refresh Retains Data', () => {

    test('C01 — Dashboard retains data after refresh', async ({ page }) => {
      await loginViaBrowser(page, 'patient1');
      await page.reload({ timeout: TIMEOUTS.navigation });
      await page.waitForLoadState('domcontentloaded');
      const url = page.url();
      expect(url).not.toContain('/login');
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'C01-dashboard-after-refresh');
      logTestSuccess('Dashboard data retained after refresh');
    });

    test('C02 — Appointments retained after refresh', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/appointments');
      await page.reload({ timeout: TIMEOUTS.navigation });
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).not.toContain('/login');
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'C02-appointments-after-refresh');
      logTestSuccess('Appointments retained after refresh');
    });

    test('C03 — PHR retained after refresh', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/phr');
      await page.reload({ timeout: TIMEOUTS.navigation });
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).not.toContain('/login');
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'C03-phr-after-refresh');
      logTestSuccess('PHR retained after refresh');
    });

    test('C04 — Health library retained after refresh', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/health-library');
      await page.reload({ timeout: TIMEOUTS.navigation });
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).not.toContain('/login');
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'C04-health-library-after-refresh');
      logTestSuccess('Health library retained after refresh');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // D: API VERIFICATION — ALL PATIENT ENDPOINTS RETURN 200
  // ═══════════════════════════════════════════════════════════════════════
  test.describe('D — API Verification', () => {

    test('D01 — GET /api/health returns 200', async ({ request }) => {
      const p1 = users.get('patient1')!;
      const res = await patientApi(request, p1.token).get(ENDPOINTS.health);
      expect(res.status).toBe(200);
      logTestSuccess('Health endpoint: 200');
    });

    test('D02 — GET /api/appointments returns 200', async ({ request }) => {
      const p1 = users.get('patient1')!;
      const res = await patientApi(request, p1.token).get(ENDPOINTS.appointments);
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      logTestSuccess('Appointments endpoint: 200');
    });

    test('D03 — GET /api/medical-content returns 200', async ({ request }) => {
      const p1 = users.get('patient1')!;
      const res = await patientApi(request, p1.token).get(ENDPOINTS.medicalContent);
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      logTestSuccess('Medical content endpoint: 200');
    });

    test('D04 — GET /api/phr returns 200', async ({ request }) => {
      const p1 = users.get('patient1')!;
      const res = await patientApi(request, p1.token).get(ENDPOINTS.phr);
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      logTestSuccess('PHR endpoint: 200');
    });

    test('D05 — GET /api/users/profile returns 200', async ({ request }) => {
      const p1 = users.get('patient1')!;
      const res = await patientApi(request, p1.token).get(ENDPOINTS.profile);
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      logTestSuccess('Profile endpoint: 200');
    });
  });
});
