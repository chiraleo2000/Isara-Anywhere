/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SPEC 28B: DOCTOR PORTAL PAGES VERIFICATION
 * ═══════════════════════════════════════════════════════════════════════════════
 * Tests: 13 | Every doctor portal page loads with 200 + data, no error states.
 * Split from spec 28 to prevent worker cascade skips across blocks.
 *
 * Auth: Uses storageState from global-setup — pages start pre-authenticated.
 * Login ONCE per role, test all pages step by step. ZERO /login navigations.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { test, expect } from '@playwright/test';
import {
  DOCTOR_URL, TIMEOUTS,
  getStorageStatePath,
  logTestSuccess,
} from '../lib/test-helpers';
import { takeSnapshot, verifyPageHealthy } from '../helpers/snapshot';

const SPEC = '28b-doctor-pages';
const DOC_ID = 'DOC-TEST-001';
const ADMIN_ID = 'ADMIN-TEST-001';

test.describe('28B — Doctor Portal Pages', () => {
  // Run doctor pages serially — parallel browser loads on heavy pages crash workers
  test.describe.configure({ mode: 'serial' });

  test('B01 — Doctor Login page loads', async ({ page }) => {
    test.slow();
    await page.goto(`${DOCTOR_URL}/login`, { timeout: TIMEOUTS.navigation * 2 });
    await page.waitForLoadState('domcontentloaded');
    const health = await verifyPageHealthy(page);
    expect(health.healthy).toBe(true);
    logTestSuccess('Doctor login page loaded');
  });

  // ── Doctor pages: pre-authenticated with doctor storageState ────────
  test.describe('Doctor pages', () => {
    test.use({ storageState: getStorageStatePath('doctor') });

    test('B02 — Doctor Dashboard loads with data', async ({ page }) => {
      test.slow();
      await page.goto(`${DOCTOR_URL}/doctor/${DOC_ID}/dashboard`, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      await takeSnapshot(page, SPEC, 'doctor-dashboard');
      logTestSuccess('Doctor dashboard loaded');
    });

    test('B03 — Doctor Schedule page loads', async ({ page }) => {
      await page.goto(`${DOCTOR_URL}/doctor/${DOC_ID}/schedule`, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      logTestSuccess('Doctor Schedule page loaded OK');
    });

    test('B04 — Doctor Patient Management page loads', async ({ page }) => {
      await page.goto(`${DOCTOR_URL}/doctor/${DOC_ID}/patients`, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      logTestSuccess('Doctor Patient Management loaded OK');
    });

    test('B05 — Doctor Health Meeting page loads', async ({ page }) => {
      await page.goto(`${DOCTOR_URL}/doctor/${DOC_ID}/health-meeting`, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      logTestSuccess('Doctor Health Meeting page loaded OK');
    });

    test('B06 — Doctor AI Studio page loads', async ({ page }) => {
      test.slow();
      await page.goto(`${DOCTOR_URL}/doctor/${DOC_ID}/ai-studio`, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      logTestSuccess('Doctor AI Studio page loaded OK');
    });

    test('B07 — Doctor Medical Content page loads', async ({ page }) => {
      test.slow();
      await page.goto(`${DOCTOR_URL}/doctor/${DOC_ID}/content`, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      logTestSuccess('Doctor Medical Content page loaded OK');
    });

    test('B08 — Doctor Clinical Resources page loads', async ({ page }) => {
      test.slow();
      await page.goto(`${DOCTOR_URL}/doctor/${DOC_ID}/resources`, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      logTestSuccess('Doctor Clinical Resources page loaded OK');
    });

    test('B09 — Doctor Medical Consultants page loads', async ({ page }) => {
      await page.goto(`${DOCTOR_URL}/doctor/${DOC_ID}/consultants`, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      logTestSuccess('Doctor Medical Consultants page loaded OK');
    });

    test('B10 — Doctor Profile page loads', async ({ page }) => {
      await page.goto(`${DOCTOR_URL}/doctor/${DOC_ID}/profile`, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      logTestSuccess('Doctor Profile page loaded OK');
    });
  });

  // ── Admin pages: pre-authenticated with admin storageState ──────────
  test.describe('Admin pages', () => {
    test.use({ storageState: getStorageStatePath('admin') });

    test('B11 — Admin Doctors Management page loads', async ({ page }) => {
      test.slow();
      await page.goto(`${DOCTOR_URL}/doctor/${ADMIN_ID}/admin/doctors`, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      logTestSuccess('Admin Doctors Management page loaded OK');
    });

    test('B12 — Admin Doctors Directory page loads', async ({ page }) => {
      test.slow();
      await page.goto(`${DOCTOR_URL}/doctor/${ADMIN_ID}/admin/directory`, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      logTestSuccess('Admin Doctors Directory page loaded OK');
    });

    test('B13 — Admin Appointment Pool page loads', async ({ page }) => {
      test.slow();
      await page.goto(`${DOCTOR_URL}/doctor/${ADMIN_ID}/admin/pool`, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      const health = await verifyPageHealthy(page);
      expect(health.healthy).toBe(true);
      logTestSuccess('Admin Appointment Pool page loaded OK');
    });
  });
});
