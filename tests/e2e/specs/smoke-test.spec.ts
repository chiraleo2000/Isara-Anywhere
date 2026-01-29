/**
 * Basic Smoke Test - Verify Portals Are Running
 */

import { test, expect } from '@playwright/test';
import { PATIENT_PORTAL_URL, DOCTOR_PORTAL_URL, logTestSuccess } from '../lib/test-config';

test.describe('Basic Smoke Tests', () => {

  test('Patient portal is accessible', async ({ page }) => {
    await page.goto(PATIENT_PORTAL_URL);

    // Just verify the page loads
    await expect(page).not.toHaveURL(/error/);

    logTestSuccess('Patient portal accessible');
  });

  test('Doctor portal is accessible', async ({ page }) => {
    await page.goto(DOCTOR_PORTAL_URL);

    // Just verify the page loads
    await expect(page).not.toHaveURL(/error/);

    logTestSuccess('Doctor portal accessible');
  });

  test('Can access patient login page', async ({ page }) => {
    await page.goto(`${PATIENT_PORTAL_URL}/login`);

    // Look for email input
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 10000 });

    logTestSuccess('Patient login page works');
  });

  test('Can access doctor login page', async ({ page }) => {
    await page.goto(`${DOCTOR_PORTAL_URL}/login`);

    // Look for email input
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 10000 });

    logTestSuccess('Doctor login page works');
  });

});
