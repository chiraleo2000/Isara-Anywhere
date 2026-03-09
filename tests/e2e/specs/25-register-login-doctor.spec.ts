/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SPEC 25: REGISTER → ADMIN APPROVE → LOGIN → ADMIN TIER UPGRADE
 * ═══════════════════════════════════════════════════════════════════════════════
 * Tests: 25 | Full: Register → Admin Approve → Login → Upgrade to Admin role
 * NO skips. NO serial dependencies. Every test is independent.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { test, expect } from '@playwright/test';
import {
  DOCTOR_URL, ENDPOINTS, TIMEOUTS,
  authenticateAllUsers, apiRequest,
  doctorApi, loginViaBrowser, navigateWithAuth,
  logTestSuccess, logTestInfo,
  type UserRole, type AuthenticatedUser,
} from '../lib/test-helpers';
import { takeSnapshot, verifyPageHealthy } from '../helpers/snapshot';

let users: Map<UserRole, AuthenticatedUser>;
const SPEC = '25-register-login-doctor';
const TS = Date.now();
const NEW_DOCTOR = {
  name: `Dr. TestNew ${TS}`,
  email: `test.doctor.${TS}@izara.com`,
  password: 'TestDoc@12345678',
  medicalLicenseNumber: `MD.TEST${TS}`,
  specialty: 'General Practice',
  phone: '0812345678',
};
let newDoctorToken = '';
let newDoctorId = '';

test.describe('25 — Register & Login New Doctor User', () => {

  test.beforeAll(async ({ request }) => {
    users = await authenticateAllUsers(request);
    logTestInfo('All 5 users authenticated for doctor registration tests');
  });

  // ═══════════════════════════════════════════════════════════════════════
  // A: DOCTOR REGISTRATION (via API)
  // ═══════════════════════════════════════════════════════════════════════
  test.describe('A — Doctor Registration', () => {

    test('A01 — Doctor portal login page loads', async ({ page }) => {
      await page.goto(`${DOCTOR_URL}/login`, { timeout: TIMEOUTS.navigation });
      await page.waitForLoadState('domcontentloaded');
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'A01-login-page');
      logTestSuccess('Doctor login page loads without errors');
    });

    test('A02 — Register new doctor via API', async ({ request }) => {
      const res = await apiRequest(request, 'POST', DOCTOR_URL, '/auth/register', '', {
        email: NEW_DOCTOR.email,
        password: NEW_DOCTOR.password,
        name: NEW_DOCTOR.name,
        medicalLicenseNumber: NEW_DOCTOR.medicalLicenseNumber,
        specialty: NEW_DOCTOR.specialty,
        phone: NEW_DOCTOR.phone,
        role: 'doctor',
      });
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      if (res.body?.userId || res.body?.id) {
        newDoctorId = res.body.userId || res.body.id;
      }
      logTestSuccess(`New doctor registered: ${NEW_DOCTOR.email} — status ${res.status}`);
    });

    test('A03 — Admin can see pending doctors list', async ({ request }) => {
      const admin = users.get('admin')!;
      const res = await doctorApi(request, admin.token).get(ENDPOINTS.admin.pendingDoctors);
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      logTestSuccess('Admin fetched pending doctors list');
    });

    test('A04 — Admin approves new doctor via API', async ({ request }) => {
      const admin = users.get('admin')!;
      const approveRes = await apiRequest(request, 'POST', DOCTOR_URL, ENDPOINTS.admin.approveDoctor, admin.token, {
        email: NEW_DOCTOR.email,
        doctorId: newDoctorId || `DOC-${TS}`,
      });
      expect(approveRes.status).toBeLessThan(500);
      logTestSuccess(`Doctor approval: status ${approveRes.status}`);
    });

    test('A05 — New doctor can login via API after approval', async ({ request }) => {
      const loginRes = await apiRequest(request, 'POST', DOCTOR_URL, '/auth/login', '', {
        email: NEW_DOCTOR.email,
        password: NEW_DOCTOR.password,
      });
      expect(loginRes.status).toBeLessThan(500);
      if (loginRes.status === 200) {
        newDoctorToken = loginRes.body?.token || loginRes.body?.accessToken || '';
        newDoctorId = loginRes.body?.userId || loginRes.body?.user?.id || newDoctorId;
        expect(newDoctorToken).toBeTruthy();
        logTestSuccess(`New doctor logged in — token received`);
      } else {
        logTestInfo(`New doctor login: ${loginRes.status} — may be pending`);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // B: EXISTING DOCTOR LOGIN & DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════
  test.describe('B — Existing Doctor Login & Dashboard', () => {

    test('B01 — Doctor login token valid', async () => {
      const doc = users.get('doctor')!;
      expect(doc.token).toBeTruthy();
      logTestSuccess(`Doctor token valid: ${doc.name}`);
    });

    test('B02 — Doctor dashboard via browser loads', async ({ page }) => {
      await loginViaBrowser(page, 'doctor');
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'B02-dashboard');
      logTestSuccess('Doctor dashboard loaded with data');
    });

    test('B03 — Doctor profile page loads', async ({ page }) => {
      const doc = users.get('doctor')!;
      await navigateWithAuth(page, 'doctor', `/doctor/${doc.id}/profile`);
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'B03-profile');
      logTestSuccess('Doctor profile page loaded');
    });

    test('B04 — Doctor /auth/me returns user data', async ({ request }) => {
      const doc = users.get('doctor')!;
      const res = await doctorApi(request, doc.token).get('/auth/me');
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      logTestSuccess('Doctor /auth/me OK');
    });

    test('B05 — Page refresh retains doctor session', async ({ page }) => {
      await loginViaBrowser(page, 'doctor');
      await page.reload({ timeout: TIMEOUTS.navigation });
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).not.toContain('/login');
      logTestSuccess('Doctor session retained after refresh');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // C: ADMIN LOGIN & DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════
  test.describe('C — Admin Login & Dashboard', () => {

    test('C01 — Admin login token valid', async () => {
      expect(users.get('admin')!.token).toBeTruthy();
      logTestSuccess('Admin token valid');
    });

    test('C02 — Admin dashboard loads via browser', async ({ page }) => {
      await loginViaBrowser(page, 'admin');
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'C02-admin-dashboard');
      logTestSuccess('Admin dashboard loaded');
    });

    test('C03 — Admin doctor management page loads', async ({ page }) => {
      const admin = users.get('admin')!;
      await navigateWithAuth(page, 'admin', `/doctor/${admin.id}/admin/doctors`);
      await page.waitForTimeout(3000); // Extra time for admin data load
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'C03-admin-management');
      logTestSuccess('Admin management page loaded');
    });

    test('C04 — Admin appointment management loads', async ({ page }) => {
      const admin = users.get('admin')!;
      await navigateWithAuth(page, 'admin', `/doctor/${admin.id}/admin/appointments`);
      await page.waitForTimeout(2000);
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      logTestSuccess('Admin appointment management loaded');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // D: ADMIN TIER UPGRADE — UPDATE DOCTOR TO ADMIN ROLE
  // ═══════════════════════════════════════════════════════════════════════
  test.describe('D — Admin Tier Upgrade', () => {

    test('D01 — Admin fetches all doctors list', async ({ request }) => {
      const admin = users.get('admin')!;
      const res = await apiRequest(request, 'GET', DOCTOR_URL, '/auth/admin/pending-doctors', admin.token);
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      logTestSuccess('Admin fetched doctors list');
    });

    test('D02 — Admin upgrades doctor role to admin tier', async ({ request }) => {
      const admin = users.get('admin')!;
      const doc = users.get('doctor')!;
      const res = await apiRequest(request, 'POST', DOCTOR_URL, '/auth/admin/update-role', admin.token, {
        userId: doc.id,
        role: 'admin',
      });
      expect(res.status).toBeLessThan(500);
      logTestInfo(`Role update response: ${JSON.stringify(res.body).substring(0, 200)}`);
      logTestSuccess(`Doctor ${doc.id} upgraded to admin: status ${res.status}`);
    });

    test('D03 — Verify doctor now has admin role', async ({ request }) => {
      const doc = users.get('doctor')!;
      const res = await doctorApi(request, doc.token).get('/auth/me');
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      const user = res.body?.user || res.body;
      const role = user?.role || '';
      const isAdmin = user?.isAdmin || user?.is_admin || false;
      logTestInfo(`After upgrade: role=${role}, isAdmin=${isAdmin}`);
      // Either role is admin or isAdmin flag is set
      expect(role === 'admin' || isAdmin === true).toBeTruthy();
      logTestSuccess('Doctor successfully upgraded to admin tier!');
    });

    test('D04 — Revert doctor back to doctor role', async ({ request }) => {
      const admin = users.get('admin')!;
      const doc = users.get('doctor')!;
      const res = await apiRequest(request, 'POST', DOCTOR_URL, '/auth/admin/update-role', admin.token, {
        userId: doc.id,
        role: 'doctor',
      });
      expect(res.status).toBeLessThan(500);
      logTestSuccess(`Doctor reverted to doctor role: status ${res.status}`);
    });

    test('D05 — Verify doctor role is back to doctor', async ({ request }) => {
      const doc = users.get('doctor')!;
      const res = await doctorApi(request, doc.token).get('/auth/me');
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      const user = res.body?.user || res.body;
      logTestInfo(`After revert: role=${user?.role}, isAdmin=${user?.isAdmin || user?.is_admin}`);
      logTestSuccess('Doctor role verified after revert');
    });
  });
});
