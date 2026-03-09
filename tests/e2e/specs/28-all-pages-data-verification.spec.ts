/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SPEC 28: ALL PAGES DATA VERIFICATION — EVERY PAGE LOADS WITH 200 + DATA
 * ═══════════════════════════════════════════════════════════════════════════════
 * Tests: ~35 | Visits EVERY page in both portals, verifies no error states,
 * takes snapshot of each page showing data loaded correctly.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { test, expect } from '@playwright/test';
import {
  PATIENT_URL, DOCTOR_URL, ENDPOINTS, TIMEOUTS,
  authenticateAllUsers,
  patientApi, doctorApi, meetingApi,
  loginViaBrowser, navigateWithAuth,
  logTestSuccess, logTestInfo,
  type UserRole, type AuthenticatedUser,
} from '../lib/test-helpers';
import { takeSnapshot, verifyPageHealthy } from '../helpers/snapshot';

let users: Map<UserRole, AuthenticatedUser>;
const SPEC = '28-all-pages-data';

test.describe('28 — All Pages Data Verification', () => {

  test.beforeAll(async ({ request }) => {
    users = await authenticateAllUsers(request);
    logTestInfo('All 5 users authenticated for pages verification');
  });

  // ═══════════════════════════════════════════════════════════════════════
  // A: ALL PATIENT PORTAL PAGES (13 pages)
  // ═══════════════════════════════════════════════════════════════════════
  test.describe('A — Patient Portal Pages', () => {

    const patientPages = [
      { name: 'Dashboard', path: '/dashboard', key: 'dashboard' },
      { name: 'Appointments', path: '/appointments', key: 'appointments' },
      { name: 'AI Doctor', path: '/ai-doctor', key: 'ai-doctor' },
      { name: 'Health Library', path: '/health-library', key: 'health-library' },
      { name: 'PHR (Health Records)', path: '/phr', key: 'phr' },
      { name: 'Timeline', path: '/timeline', key: 'timeline' },
      { name: 'Map', path: '/map', key: 'map' },
      { name: 'PDPA', path: '/pdpa', key: 'pdpa' },
      { name: 'Living Will', path: '/living-will', key: 'living-will' },
      { name: 'Profile', path: '/profile', key: 'profile' },
      { name: 'Settings', path: '/settings', key: 'settings' },
    ];

    for (const pg of patientPages) {
      test(`A — Patient ${pg.name} page loads with data`, async ({ page }) => {
        await navigateWithAuth(page, 'patient1', pg.path);
        const health = await verifyPageHealthy(page);
        expect(health.healthy).toBe(true);
        await takeSnapshot(page, SPEC, `patient-${pg.key}`);
        logTestSuccess(`Patient ${pg.name} page loaded OK`);
      });
    }

    test('A — Patient login page accessible', async ({ page }) => {
      await page.goto(`${PATIENT_URL}/login`, { timeout: TIMEOUTS.navigation });
      await page.waitForLoadState('domcontentloaded');
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'patient-login');
      logTestSuccess('Patient login page loaded');
    });

    test('A — Patient register page accessible', async ({ page }) => {
      await page.goto(`${PATIENT_URL}/register`, { timeout: TIMEOUTS.navigation });
      await page.waitForLoadState('domcontentloaded');
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'patient-register');
      logTestSuccess('Patient register page loaded');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // B: ALL DOCTOR PORTAL PAGES (15+ pages)
  // ═══════════════════════════════════════════════════════════════════════
  test.describe('B — Doctor Portal Pages', () => {

    test('B — Doctor Login page loads', async ({ page }) => {
      await page.goto(`${DOCTOR_URL}/login`, { timeout: TIMEOUTS.navigation });
      await page.waitForLoadState('domcontentloaded');
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'doctor-login');
      logTestSuccess('Doctor login page loaded');
    });

    test('B — Doctor Dashboard loads with data', async ({ page }) => {
      await loginViaBrowser(page, 'doctor');
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'doctor-dashboard');
      logTestSuccess('Doctor dashboard loaded');
    });

    const doctorPages = [
      { name: 'Schedule', path: '/schedule', key: 'schedule' },
      { name: 'Patient Management', path: '/patients', key: 'patients' },
      { name: 'Health Meeting', path: '/health-meeting', key: 'health-meeting' },
      { name: 'AI Studio', path: '/ai-studio', key: 'ai-studio' },
      { name: 'Medical Content', path: '/content', key: 'content' },
      { name: 'Clinical Resources', path: '/resources', key: 'resources' },
      { name: 'Medical Consultants', path: '/consultants', key: 'consultants' },
      { name: 'Profile', path: '/profile', key: 'profile' },
    ];

    for (const pg of doctorPages) {
      test(`B — Doctor ${pg.name} page loads`, async ({ page }) => {
        const doc = users.get('doctor')!;
        await navigateWithAuth(page, 'doctor', `/doctor/${doc.id}${pg.path}`);
        const health = await verifyPageHealthy(page);
        expect(health.healthy).toBe(true);
        await takeSnapshot(page, SPEC, `doctor-${pg.key}`);
        logTestSuccess(`Doctor ${pg.name} page loaded OK`);
      });
    }

    // Admin-only pages
    const adminPages = [
      { name: 'Admin Doctors', path: '/admin/doctors', key: 'admin-doctors' },
      { name: 'Admin Appointments', path: '/admin/appointments', key: 'admin-appointments' },
      { name: 'Doctors Directory', path: '/admin/directory', key: 'admin-directory' },
      { name: 'Appointment Pool', path: '/admin/pool', key: 'admin-pool' },
    ];

    for (const pg of adminPages) {
      test(`B — Admin ${pg.name} page loads`, async ({ page }) => {
        const admin = users.get('admin')!;
        await navigateWithAuth(page, 'admin', `/doctor/${admin.id}${pg.path}`);
        const health = await verifyPageHealthy(page);
        expect(health.healthy).toBe(true);
        await takeSnapshot(page, SPEC, `admin-${pg.key}`);
        logTestSuccess(`Admin ${pg.name} page loaded OK`);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // C: API HEALTH CHECKS — ALL SERVICES RETURN 200
  // ═══════════════════════════════════════════════════════════════════════
  test.describe('C — Service Health Checks', () => {

    test('C01 — Patient Portal health returns 200', async ({ request }) => {
      const p1 = users.get('patient1')!;
      const res = await patientApi(request, p1.token).get(ENDPOINTS.health);
      expect(res.status).toBe(200);
      logTestSuccess('Patient portal health: 200');
    });

    test('C02 — Doctor Portal health returns 200', async ({ request }) => {
      const doc = users.get('doctor')!;
      const res = await doctorApi(request, doc.token).get('/health');
      expect(res.status).toBe(200);
      logTestSuccess('Doctor portal health: 200');
    });

    test('C03 — Meeting Server health returns 200', async ({ request }) => {
      const doc = users.get('doctor')!;
      const res = await meetingApi(request, doc.token).get(ENDPOINTS.meetings.health);
      expect(res.status).toBe(200);
      logTestSuccess('Meeting server health: 200');
    });

    test('C04 — Patient appointments API returns 200', async ({ request }) => {
      const p1 = users.get('patient1')!;
      const res = await patientApi(request, p1.token).get(ENDPOINTS.appointments);
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      logTestSuccess('Appointments API: 200');
    });

    test('C05 — Patient medical content API returns 200', async ({ request }) => {
      const p1 = users.get('patient1')!;
      const res = await patientApi(request, p1.token).get(ENDPOINTS.medicalContent);
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      logTestSuccess('Medical content API: 200');
    });

    test('C06 — Patient PHR API returns 200', async ({ request }) => {
      const p1 = users.get('patient1')!;
      const res = await patientApi(request, p1.token).get(ENDPOINTS.phr);
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      logTestSuccess('PHR API: 200');
    });

    test('C07 — Doctor patients API returns 200', async ({ request }) => {
      const doc = users.get('doctor')!;
      const res = await doctorApi(request, doc.token).get(ENDPOINTS.patients);
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      logTestSuccess('Doctor patients API: 200');
    });

    test('C08 — Doctor lab orders API returns 200', async ({ request }) => {
      const doc = users.get('doctor')!;
      const res = await doctorApi(request, doc.token).get(ENDPOINTS.labOrders);
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      logTestSuccess('Doctor lab orders API: 200');
    });
  });
});
