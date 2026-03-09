/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SPEC 28A: PATIENT PORTAL PAGES VERIFICATION
 * ═══════════════════════════════════════════════════════════════════════════════
 * Tests: 13 | Every patient portal page loads with 200 + data, no error states.
 * Split from spec 28 to prevent worker cascade skips across blocks.
 *
 * Auth: Uses storageState from global-setup — pages start pre-authenticated.
 * Login ONCE, test all pages step by step. ZERO /login navigations.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { test, expect } from '@playwright/test';
import {
  PATIENT_URL, TIMEOUTS,
  getStorageStatePath,
  logTestSuccess, logTestInfo,
} from '../lib/test-helpers';
import { takeSnapshot, verifyPageHealthy } from '../helpers/snapshot';

const SPEC = '28a-patient-pages';

test.describe('28A — Patient Portal Pages', () => {
  // Run patient pages serially to avoid parallel browser overload
  test.describe.configure({ mode: 'serial' });

  // Pre-authenticated via storageState — NO login pages, NO wasted time
  test.use({ storageState: getStorageStatePath('patient1') });

  test('A01 — Patient Dashboard loads with data', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/dashboard`, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
    const health = await verifyPageHealthy(page);
    expect(health.healthy).toBe(true);
    await takeSnapshot(page, SPEC, 'patient-dashboard');
    logTestSuccess('Patient Dashboard page loaded OK');
  });

  test('A02 — Patient Appointments page loads', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/appointments`, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
    const health = await verifyPageHealthy(page);
    expect(health.healthy).toBe(true);
    await takeSnapshot(page, SPEC, 'patient-appointments');
    logTestSuccess('Patient Appointments page loaded OK');
  });

  test('A03 — Patient AI Doctor page loads', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/ai-doctor`, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
    const health = await verifyPageHealthy(page);
    expect(health.healthy).toBe(true);
    await takeSnapshot(page, SPEC, 'patient-ai-doctor');
    logTestSuccess('Patient AI Doctor page loaded OK');
  });

  test('A04 — Patient Health Library page loads', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/health-library`, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
    const health = await verifyPageHealthy(page);
    expect(health.healthy).toBe(true);
    logTestSuccess('Patient Health Library loaded OK');
  });

  test('A05 — Patient PHR page loads', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/phr`, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
    const health = await verifyPageHealthy(page);
    expect(health.healthy).toBe(true);
    logTestSuccess('Patient PHR page loaded OK');
  });

  test('A06 — Patient Timeline page loads', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/timeline`, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
    const health = await verifyPageHealthy(page);
    expect(health.healthy).toBe(true);
    logTestSuccess('Patient Timeline page loaded OK');
  });

  test('A07 — Patient Map page loads', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/map`, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
    const health = await verifyPageHealthy(page);
    expect(health.healthy).toBe(true);
    logTestSuccess('Patient Map page loaded OK');
  });

  test('A08 — Patient PDPA page loads', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/pdpa`, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
    const health = await verifyPageHealthy(page);
    expect(health.healthy).toBe(true);
    logTestSuccess('Patient PDPA page loaded OK');
  });

  test('A09 — Patient Living Will page loads', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/living-will`, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
    const health = await verifyPageHealthy(page);
    expect(health.healthy).toBe(true);
    logTestSuccess('Patient Living Will page loaded OK');
  });

  test('A10 — Patient Profile page loads', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/profile`, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
    const health = await verifyPageHealthy(page);
    expect(health.healthy).toBe(true);
    logTestSuccess('Patient Profile page loaded OK');
  });

  test('A11 — Patient Settings page loads', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/settings`, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
    const health = await verifyPageHealthy(page);
    expect(health.healthy).toBe(true);
    logTestSuccess('Patient Settings page loaded OK');
  });

  test('A12 — Patient login page accessible', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/login`, { timeout: TIMEOUTS.navigation });
    await page.waitForLoadState('domcontentloaded');
    const health = await verifyPageHealthy(page);
    expect(health.healthy).toBe(true);
    logTestSuccess('Patient login page loaded');
  });

  test('A13 — Patient register page accessible', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/register`, { timeout: TIMEOUTS.navigation });
    await page.waitForLoadState('domcontentloaded');
    const health = await verifyPageHealthy(page);
    expect(health.healthy).toBe(true);
    logTestSuccess('Patient register page loaded');
  });
});
