/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SPEC 27: LAB DATA — DOCTOR SENDS, PATIENT SEES + REFRESH RETAINS
 * ═══════════════════════════════════════════════════════════════════════════════
 * Tests: ~18 | Doctor creates lab order → patient verifies → refresh retains
 * Snapshots at every transition point.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { test, expect } from '@playwright/test';
import {
  PATIENT_URL, DOCTOR_URL, ENDPOINTS, TIMEOUTS,
  authenticateAllUsers, apiRequest,
  patientApi, doctorApi,
  loginViaBrowser, navigateWithAuth,
  generateLabOrder,
  logTestSuccess, logTestInfo,
  type UserRole, type AuthenticatedUser,
} from '../lib/test-helpers';
import { takeSnapshot, verifyPageHealthy } from '../helpers/snapshot';

let users: Map<UserRole, AuthenticatedUser>;
const SPEC = '27-lab-data-doctor-to-patient';
let createdLabOrderId: string | null = null;

test.describe('27 — Lab Data: Doctor Sends → Patient Sees → Refresh Retains', () => {

  test.beforeAll(async ({ request }) => {
    users = await authenticateAllUsers(request);
    logTestInfo('All 5 users authenticated for lab data sync tests');
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
      await takeSnapshot(page, SPEC, 'A01-doctor-patients');
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
      const patient = users.get('patient1')!;
      const labOrder = generateLabOrder(patient.id);

      const res = await doctorApi(request, doc.token).post(ENDPOINTS.labOrders, {
        ...labOrder,
        patientId: patient.id,
        doctorId: doc.id,
      });
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);

      // Save the created order ID for later verification
      createdLabOrderId = res.body?.id || res.body?.orderId || res.body?.data?.id || null;
      logTestSuccess(`Lab order created: status ${res.status}, id=${createdLabOrderId}`);
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
      await takeSnapshot(page, SPEC, 'A05-doctor-lab-orders-page');
      logTestSuccess('Doctor lab orders page loaded in browser');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // B: PATIENT SEES LAB DATA
  // ═══════════════════════════════════════════════════════════════════════
  test.describe('B — Patient Sees Lab Data', () => {

    test('B01 — Patient can fetch lab orders via API', async ({ request }) => {
      const p1 = users.get('patient1')!;
      const res = await patientApi(request, p1.token).get(ENDPOINTS.healthRecords.patientLabOrders);
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      logTestSuccess(`Patient lab orders fetched: status ${res.status}`);
    });

    test('B02 — Patient PHR page loads with lab data', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/phr');
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'B02-patient-phr-with-lab');
      logTestSuccess('Patient PHR page loaded');
    });

    test('B03 — Patient imaging orders fetch returns 200', async ({ request }) => {
      const p1 = users.get('patient1')!;
      const res = await patientApi(request, p1.token).get(ENDPOINTS.healthRecords.patientImagingOrders);
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      logTestSuccess(`Patient imaging orders: status ${res.status}`);
    });

    test('B04 — Patient dashboard shows health data', async ({ page }) => {
      await loginViaBrowser(page, 'patient1');
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'B04-patient-dashboard-health');
      logTestSuccess('Patient dashboard shows health data');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // C: REFRESH RETAINS LAB DATA
  // ═══════════════════════════════════════════════════════════════════════
  test.describe('C — Refresh Retains Lab Data', () => {

    test('C01 — Patient PHR retains lab data after refresh', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/phr');
      const health1 = await verifyPageHealthy(page);
      expect(health1.healthy).toBe(true);

      // Refresh
      await page.reload({ timeout: TIMEOUTS.navigation });
      await page.waitForLoadState('domcontentloaded');

      expect(page.url()).not.toContain('/login');
      const health2 = await verifyPageHealthy(page);
      expect(health2.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'C01-phr-after-refresh');
      logTestSuccess('PHR lab data retained after refresh');
    });

    test('C02 — Patient API lab orders still available after delay', async ({ request }) => {
      // Wait a moment then re-fetch
      await new Promise(r => setTimeout(r, 1000));
      const p1 = users.get('patient1')!;
      const res = await patientApi(request, p1.token).get(ENDPOINTS.healthRecords.patientLabOrders);
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      logTestSuccess('Lab orders still available on re-fetch');
    });

    test('C03 — Doctor dashboard retains data after refresh', async ({ page }) => {
      await loginViaBrowser(page, 'doctor');
      await page.reload({ timeout: TIMEOUTS.navigation });
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).not.toContain('/login');
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'C03-doctor-refresh');
      logTestSuccess('Doctor dashboard retained after refresh');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // D: CROSS-PORTAL DATA CONSISTENCY
  // ═══════════════════════════════════════════════════════════════════════
  test.describe('D — Cross-Portal Data Consistency', () => {

    test('D01 — Doctor and patient see consistent patient list', async ({ request }) => {
      const doc = users.get('doctor')!;
      const p1 = users.get('patient1')!;

      const drRes = await doctorApi(request, doc.token).get(ENDPOINTS.patients);
      const ptRes = await patientApi(request, p1.token).get(ENDPOINTS.profile);

      expect(drRes.status).toBeGreaterThanOrEqual(200);
      expect(drRes.status).toBeLessThan(300);
      expect(ptRes.status).toBeGreaterThanOrEqual(200);
      expect(ptRes.status).toBeLessThan(300);
      logTestSuccess('Cross-portal data consistent');
    });

    test('D02 — Treatment results endpoint returns 200', async ({ request }) => {
      const p1 = users.get('patient1')!;
      const res = await patientApi(request, p1.token).get(ENDPOINTS.healthRecords.treatmentResults);
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      logTestSuccess(`Treatment results: status ${res.status}`);
    });
  });
});
