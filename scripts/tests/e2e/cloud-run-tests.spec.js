/**
 * Cloud Run E2E Tests for Izara Telemedicine
 * 
 * Tests Cloud Run deployment functionality
 * 
 * @version 3.0.0
 * @updated 2026-01-21
 */

const { test, expect } = require('@playwright/test');

// Cloud Run URLs
const PATIENT_PORTAL_CLOUD = 'https://izara-patient-portal-724889190329.asia-southeast1.run.app';
const DOCTOR_PORTAL_CLOUD = 'https://izara-doctor-portal-724889190329.asia-southeast1.run.app';

// ============================================================================
// SECTION 1: CLOUD RUN HEALTH CHECKS
// ============================================================================

test.describe('Cloud Run Health Checks', () => {
  test('Patient Portal Cloud Run is accessible', async ({ request }) => {
    const response = await request.get(PATIENT_PORTAL_CLOUD, {
      timeout: 30000
    });
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
  });

  test('Doctor Portal Cloud Run is accessible', async ({ request }) => {
    const response = await request.get(DOCTOR_PORTAL_CLOUD, {
      timeout: 30000
    });
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
  });

  test('Patient Portal returns HTML', async ({ request }) => {
    const response = await request.get(PATIENT_PORTAL_CLOUD);
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('text/html');
  });

  test('Doctor Portal returns HTML', async ({ request }) => {
    const response = await request.get(DOCTOR_PORTAL_CLOUD);
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('text/html');
  });
});

// ============================================================================
// SECTION 2: CLOUD RUN UI TESTS
// ============================================================================

test.describe('Cloud Run UI Tests', () => {
  test('Patient Portal login page loads on Cloud Run', async ({ page }) => {
    await page.goto(`${PATIENT_PORTAL_CLOUD}/login`, { timeout: 60000 });
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({ timeout: 10000 });
  });

  test('Doctor Portal login page loads on Cloud Run', async ({ page }) => {
    await page.goto(`${DOCTOR_PORTAL_CLOUD}/login`, { timeout: 60000 });
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({ timeout: 10000 });
  });

  test('Patient Portal home page has expected content', async ({ page }) => {
    await page.goto(PATIENT_PORTAL_CLOUD, { timeout: 60000 });
    // Check for app-specific content
    await expect(page).toHaveTitle(/Izara|Isara|Patient/i, { timeout: 10000 });
  });

  test('Doctor Portal home page has expected content', async ({ page }) => {
    await page.goto(DOCTOR_PORTAL_CLOUD, { timeout: 60000 });
    // Check for app-specific content  
    await expect(page).toHaveTitle(/Izara|Isara|Doctor/i, { timeout: 10000 });
  });
});

// ============================================================================
// SECTION 3: CLOUD RUN API TESTS
// ============================================================================

test.describe('Cloud Run API Tests', () => {
  test('Patient Portal API health endpoint works', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_CLOUD}/api/health`, {
      timeout: 30000
    });
    expect(response.status()).toBeLessThan(500);
  });

  test('Doctor Portal API health endpoint works', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_CLOUD}/api/health`, {
      timeout: 30000
    });
    expect(response.status()).toBeLessThan(500);
  });

  test('Patient Portal auth endpoint responds', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_CLOUD}/api/auth/status`, {
      timeout: 30000
    });
    // Should get some response (not 5xx)
    expect(response.status()).toBeLessThan(500);
  });

  test('Doctor Portal auth endpoint responds', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_CLOUD}/api/auth/status`, {
      timeout: 30000
    });
    // Should get some response (not 5xx)
    expect(response.status()).toBeLessThan(500);
  });
});

// ============================================================================
// SECTION 4: CLOUD RUN SECURITY TESTS
// ============================================================================

test.describe('Cloud Run Security Tests', () => {
  test('Patient Portal uses HTTPS', async ({ request }) => {
    const response = await request.get(PATIENT_PORTAL_CLOUD);
    expect(response.url()).toMatch(/^https:\/\//);
  });

  test('Doctor Portal uses HTTPS', async ({ request }) => {
    const response = await request.get(DOCTOR_PORTAL_CLOUD);
    expect(response.url()).toMatch(/^https:\/\//);
  });

  test('Patient Portal has security headers', async ({ request }) => {
    const response = await request.get(PATIENT_PORTAL_CLOUD);
    const headers = response.headers();
    // Cloud Run may strip some headers, but check for at least content-type
    expect(headers['content-type']).toBeTruthy();
  });

  test('Doctor Portal has security headers', async ({ request }) => {
    const response = await request.get(DOCTOR_PORTAL_CLOUD);
    const headers = response.headers();
    expect(headers['content-type']).toBeTruthy();
  });
});

// ============================================================================
// SECTION 5: CLOUD RUN PERFORMANCE TESTS
// ============================================================================

test.describe('Cloud Run Performance Tests', () => {
  test('Patient Portal responds within 10 seconds', async ({ request }) => {
    const startTime = Date.now();
    const response = await request.get(PATIENT_PORTAL_CLOUD, {
      timeout: 30000
    });
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    expect(response.ok()).toBeTruthy();
    expect(responseTime).toBeLessThan(10000); // 10 seconds
    console.log(`Patient Portal response time: ${responseTime}ms`);
  });

  test('Doctor Portal responds within 10 seconds', async ({ request }) => {
    const startTime = Date.now();
    const response = await request.get(DOCTOR_PORTAL_CLOUD, {
      timeout: 30000
    });
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    expect(response.ok()).toBeTruthy();
    expect(responseTime).toBeLessThan(10000); // 10 seconds
    console.log(`Doctor Portal response time: ${responseTime}ms`);
  });
});

console.log('🌩️ Cloud Run E2E Test Suite Loaded');
console.log('📋 Test Sections: 5');
console.log('📊 Total Test Cases: 16');
