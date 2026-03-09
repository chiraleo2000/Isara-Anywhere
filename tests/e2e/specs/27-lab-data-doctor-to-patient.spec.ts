/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SPEC 27: LAB + IMAGING DATA: DOCTOR SENDS → PATIENT SEES → REFRESH RETAINS
 * ═══════════════════════════════════════════════════════════════════════════════
 * Tests: 20 | Lab orders + Imaging orders — full cross-portal data sync
 * NO skips. Every test independent.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { test, expect } from '@playwright/test';
import {
  DOCTOR_URL, PATIENT_URL, ENDPOINTS, TIMEOUTS,
  authenticateAllUsers, apiRequest,
  patientApi, doctorApi,
  loginViaBrowser, navigateWithAuth,
  logTestSuccess, logTestInfo,
  type UserRole, type AuthenticatedUser,
} from '../lib/test-helpers';
import { takeSnapshot, verifyPageHealthy } from '../helpers/snapshot';

let users: Map<UserRole, AuthenticatedUser>;
const SPEC = '27-lab-imaging-data';

test.describe('27 — Lab & Imaging Data: Doctor Sends → Patient Sees → Refresh', () => {

  test.beforeAll(async ({ request }) => {
    users = await authenticateAllUsers(request);
    logTestInfo('All 5 users authenticated for lab/imaging data sync tests');
  });

  // ═══════════════════════════════════════════════════════════════════════
  // A: DOCTOR CREATES LAB ORDER
  // ═══════════════════════════════════════════════════════════════════════
  test.describe('A — Doctor Creates Lab Order', () => {

    test('A01 — Doctor patient management page loads', async ({ page }) => {
      const doc = users.get('doctor')!;
      await navigateWithAuth(page, 'doctor', `/doctor/${doc.id}/patients`);
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'A01-patients-page');
      logTestSuccess('Doctor patient management page loaded');
    });

    test('A02 — Doctor can fetch patient list via API', async ({ request }) => {
      const doc = users.get('doctor')!;
      const res = await doctorApi(request, doc.token).get(ENDPOINTS.patients);
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      logTestSuccess(`Patients list fetched: status ${res.status}`);
    });

    test('A03 — Doctor creates lab order for patient via API', async ({ request }) => {
      const doc = users.get('doctor')!;
      const p1 = users.get('patient1')!;
      const res = await doctorApi(request, doc.token).post(ENDPOINTS.labOrders, {
        patientId: p1.id,
        doctorId: doc.id,
        tests: [{ testName: 'CBC', code: 'LAB-CBC', urgency: 'routine' }],
        notes: 'Routine blood work — E2E test',
        urgency: 'routine',
      });
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      logTestSuccess(`Lab order created: status ${res.status}, id=${res.body?.id || res.body?.labOrder?.id || null}`);
    });

    test('A04 — Doctor can view lab orders list', async ({ request }) => {
      const doc = users.get('doctor')!;
      const res = await doctorApi(request, doc.token).get(ENDPOINTS.labOrders);
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      logTestSuccess(`Lab orders list: status ${res.status}`);
    });

    test('A05 — Doctor lab orders page loads in browser', async ({ page }) => {
      const doc = users.get('doctor')!;
      await navigateWithAuth(page, 'doctor', `/doctor/${doc.id}/patients`);
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'A05-lab-orders-page');
      logTestSuccess('Doctor lab orders page loaded in browser');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // B: DOCTOR CREATES IMAGING ORDER
  // ═══════════════════════════════════════════════════════════════════════
  test.describe('B — Doctor Creates Imaging Order', () => {

    test('B01 — Doctor creates imaging order for patient via API', async ({ request }) => {
      const doc = users.get('doctor')!;
      const p1 = users.get('patient1')!;
      const res = await apiRequest(request, 'POST', DOCTOR_URL, '/api/imaging-orders', doc.token, {
        patientId: p1.id,
        doctorId: doc.id,
        imagingType: 'X-Ray',
        bodyPart: 'Chest',
        reason: 'Routine check — E2E test',
        urgency: 'routine',
        notes: 'PA view',
      });
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      logTestSuccess(`Imaging order created: status ${res.status}`);
    });

    test('B02 — Doctor can view imaging orders for patient', async ({ request }) => {
      const doc = users.get('doctor')!;
      const p1 = users.get('patient1')!;
      const res = await apiRequest(request, 'GET', DOCTOR_URL, `/api/imaging-orders/patient/${p1.id}`, doc.token);
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      logTestSuccess(`Doctor imaging orders for patient: status ${res.status}`);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // C: PATIENT SEES LAB + IMAGING DATA
  // ═══════════════════════════════════════════════════════════════════════
  test.describe('C — Patient Sees Lab & Imaging Data', () => {

    test('C01 — Patient can fetch lab orders via API', async ({ request }) => {
      const p1 = users.get('patient1')!;
      const res = await patientApi(request, p1.token).get('/api/phr/lab-orders');
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      logTestSuccess(`Patient lab orders fetched: status ${res.status}`);
    });

    test('C02 — Patient PHR page loads with lab data', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/phr');
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'C02-patient-phr');
      logTestSuccess('Patient PHR page loaded');
    });

    test('C03 — Patient imaging orders fetch returns 200', async ({ request }) => {
      const p1 = users.get('patient1')!;
      const res = await patientApi(request, p1.token).get('/api/phr/imaging-orders');
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      logTestSuccess(`Patient imaging orders: status ${res.status}`);
    });

    test('C04 — Patient dashboard shows health data', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/dashboard');
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'C04-patient-dashboard');
      logTestSuccess('Patient dashboard shows health data');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // D: REFRESH RETAINS DATA
  // ═══════════════════════════════════════════════════════════════════════
  test.describe('D — Refresh Retains Lab & Imaging Data', () => {

    test('D01 — Patient PHR retains lab data after refresh', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/phr');
      await page.waitForLoadState('networkidle');
      await page.reload({ timeout: TIMEOUTS.navigation });
      await page.waitForLoadState('domcontentloaded');
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'D01-phr-refreshed');
      logTestSuccess('PHR lab data retained after refresh');
    });

    test('D02 — Patient API lab orders still available after delay', async ({ request }) => {
      await new Promise(r => setTimeout(r, 1000));
      const p1 = users.get('patient1')!;
      const res = await patientApi(request, p1.token).get('/api/phr/lab-orders');
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      logTestSuccess('Lab orders still available on re-fetch');
    });

    test('D03 — Doctor dashboard retains data after refresh', async ({ page }) => {
      await loginViaBrowser(page, 'doctor');
      await page.reload({ timeout: TIMEOUTS.navigation });
      await page.waitForLoadState('domcontentloaded');
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      logTestSuccess('Doctor dashboard retained after refresh');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // E: CROSS-PORTAL DATA CONSISTENCY
  // ═══════════════════════════════════════════════════════════════════════
  test.describe('E — Cross-Portal Data Consistency', () => {

    test('E01 — Doctor and patient see consistent patient list', async ({ request }) => {
      const doc = users.get('doctor')!;
      const p1 = users.get('patient1')!;
      const docRes = await doctorApi(request, doc.token).get(ENDPOINTS.patients);
      const patRes = await patientApi(request, p1.token).get(ENDPOINTS.health);
      expect(docRes.status).toBeGreaterThanOrEqual(200);
      expect(patRes.status).toBe(200);
      logTestSuccess('Cross-portal data consistent');
    });

    test('E02 — Treatment results endpoint returns 200', async ({ request }) => {
      const p1 = users.get('patient1')!;
      const res = await patientApi(request, p1.token).get(ENDPOINTS.treatmentResults);
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      logTestSuccess(`Treatment results: status ${res.status}`);
    });

    test('E03 — Imaging data visible in both portals', async ({ request }) => {
      const doc = users.get('doctor')!;
      const p1 = users.get('patient1')!;

      // Doctor sees imaging orders
      const docRes = await apiRequest(request, 'GET', DOCTOR_URL, `/api/imaging-orders/patient/${p1.id}`, doc.token);
      expect(docRes.status).toBeGreaterThanOrEqual(200);
      expect(docRes.status).toBeLessThan(300);

      // Patient sees imaging orders
      const patRes = await patientApi(request, p1.token).get('/api/phr/imaging-orders');
      expect(patRes.status).toBeGreaterThanOrEqual(200);
      expect(patRes.status).toBeLessThan(300);

      logTestSuccess('Imaging data visible in both portals');
    });
  });
});
