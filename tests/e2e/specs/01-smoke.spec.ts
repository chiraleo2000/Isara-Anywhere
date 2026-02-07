/**
 * =============================================================================
 * 01-SMOKE — Quick health-check for all services
 * =============================================================================
 * Verifies portals load, login pages render, health endpoints respond.
 * Run first to catch outages before heavier suites.
 *
 *   npx playwright test specs/01-smoke.spec.ts
 * =============================================================================
 */
import { test, expect } from '@playwright/test';
import { PATIENT_URL, DOCTOR_URL, MEETING_SERVER_URL, TIMEOUTS, logTestSuccess } from '../lib/test-config';

const T = TIMEOUTS.api;

test.describe('1. Portal Accessibility', () => {
  test('SMOKE-01: Patient portal loads', async ({ page }) => {
    const res = await page.goto(PATIENT_URL, { timeout: TIMEOUTS.navigation });
    expect(res?.status()).toBeLessThan(400);
    logTestSuccess('Patient portal accessible');
  });

  test('SMOKE-02: Doctor portal loads', async ({ page }) => {
    const res = await page.goto(DOCTOR_URL, { timeout: TIMEOUTS.navigation });
    expect(res?.status()).toBeLessThan(400);
    logTestSuccess('Doctor portal accessible');
  });

  test('SMOKE-03: Patient login page has email input', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/login`, { timeout: TIMEOUTS.navigation });
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({ timeout: 15000 });
    logTestSuccess('Patient login page OK');
  });

  test('SMOKE-04: Doctor login page has email input', async ({ page }) => {
    await page.goto(`${DOCTOR_URL}/login`, { timeout: TIMEOUTS.navigation });
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({ timeout: 15000 });
    logTestSuccess('Doctor login page OK');
  });
});

test.describe('2. API Health Endpoints', () => {
  test('SMOKE-05: Patient /api/health → 200', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/health`, { timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Patient API health OK');
  });

  test('SMOKE-06: Doctor /api/health → 200', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/health`, { timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Doctor API health OK');
  });

  test('SMOKE-07: Patient /api/health/db → 200', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/health/db`, { timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Patient DB health OK');
  });

  test('SMOKE-08: Doctor /api/health/db → 200', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/health/db`, { timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Doctor DB health OK');
  });

  test('SMOKE-09: Patient /health → 200', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/health`, { timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Patient root health OK');
  });

  test('SMOKE-10: Doctor /health → 200', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/health`, { timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Doctor root health OK');
  });

  test('SMOKE-11: Meeting server /health → 200', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/health`, { timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Meeting server health OK');
  });

  test('SMOKE-12: Patient video-meeting health → 200', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/video-meeting/health`, { timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Patient video-meeting health OK');
  });

  test('SMOKE-13: Doctor video-meeting health → 200', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/video-meeting/health`, { timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Doctor video-meeting health OK');
  });

  test('SMOKE-14: Patient AI health → 200', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/ai/status`, { timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Patient AI health OK');
  });
});
