/**
 * Basic Smoke Test - Verify Portals Are Running
 */

import { test, expect } from '@playwright/test';

const PATIENT_PORTAL_URL = process.env.PATIENT_PORTAL_URL || 'http://localhost:3005';
const DOCTOR_PORTAL_URL = process.env.DOCTOR_PORTAL_URL || 'http://localhost:3010';

test.describe('Basic Smoke Tests', () => {
  
  test('Patient portal is accessible', async ({ page }) => {
    await page.goto(PATIENT_PORTAL_URL);
    
    // Just verify the page loads
    await expect(page).not.toHaveURL(/error/);
    
    console.log('✅ Patient portal accessible');
  });
  
  test('Doctor portal is accessible', async ({ page }) => {
    await page.goto(DOCTOR_PORTAL_URL);
    
    // Just verify the page loads
    await expect(page).not.toHaveURL(/error/);
    
    console.log('✅ Doctor portal accessible');
  });
  
  test('Can access patient login page', async ({ page }) => {
    await page.goto(`${PATIENT_PORTAL_URL}/login`);
    
    // Look for email input
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Patient login page works');
  });
  
  test('Can access doctor login page', async ({ page }) => {
    await page.goto(`${DOCTOR_PORTAL_URL}/login`);
    
    // Look for email input
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Doctor login page works');
  });
  
});
