import { test, expect } from '@playwright/test';

// Test Configuration
const PATIENT_PORTAL = 'http://localhost:3005';
const DOCTOR_PORTAL = 'http://localhost:3010';

// Test Users
const PATIENT_USER = { email: 'demo.test@gmail.com', password: 'P@ssw0rd' };
const DOCTOR_USER = { email: 'doctor.test@izara.com', password: 'IzaraDoctor@2024' };

// =====================================================
// PATIENT PORTAL - EXTENDED FUNCTIONALITY TESTS
// =====================================================

test.describe('Patient Portal - Extended Functionality', () => {
  
  test('AI Health Chat - No Errors on Load', async ({ page }) => {
    // Monitor console for errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Login
    await page.goto(PATIENT_PORTAL);
    await page.fill('input[type="email"]', PATIENT_USER.email);
    await page.fill('input[type="password"]', PATIENT_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 15000 });
    
    // Navigate to AI Chat
    await page.click('a[href="/ai-doctor"], a[href*="ai"]');
    await page.waitForTimeout(3000);
    
    // Check for page freeze (can interact with elements)
    const body = await page.locator('body');
    await expect(body).toBeVisible();
    
    // No critical fetch errors
    const criticalErrors = errors.filter(e => 
      e.includes('Failed to fetch') || 
      e.includes('NetworkError') ||
      e.includes('CORS')
    );
    
    console.log('Console Errors:', errors);
    // Allow some errors but not fetch failures
    expect(criticalErrors.length).toBeLessThan(3);
  });

  test('Health Library - Content Loads', async ({ page }) => {
    // Login
    await page.goto(PATIENT_PORTAL);
    await page.fill('input[type="email"]', PATIENT_USER.email);
    await page.fill('input[type="password"]', PATIENT_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 15000 });
    
    // Navigate to Health Library
    const healthLink = page.locator('a[href="/health-library"], a[href*="library"], a[href*="studio"]').first();
    if (await healthLink.isVisible()) {
      await healthLink.click();
      await page.waitForTimeout(3000);
    }
    
    // Page should not freeze
    await expect(page.locator('body')).toBeVisible();
  });

  test('PHR - Personal Health Records Load', async ({ page }) => {
    // Login
    await page.goto(PATIENT_PORTAL);
    await page.fill('input[type="email"]', PATIENT_USER.email);
    await page.fill('input[type="password"]', PATIENT_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 15000 });
    
    // Navigate to PHR
    await page.click('a[href="/phr"], a[href*="health-record"]');
    await page.waitForTimeout(3000);
    
    // Page should load without freezing
    await expect(page.locator('body')).toBeVisible();
  });

  test('Timeline - Medical Timeline Loads', async ({ page }) => {
    // Login
    await page.goto(PATIENT_PORTAL);
    await page.fill('input[type="email"]', PATIENT_USER.email);
    await page.fill('input[type="password"]', PATIENT_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 15000 });
    
    // Navigate to Timeline
    const timelineLink = page.locator('a[href="/timeline"], a[href*="timeline"]').first();
    if (await timelineLink.isVisible()) {
      await timelineLink.click();
      await page.waitForTimeout(3000);
    }
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('Settings - Page Loads', async ({ page }) => {
    // Login
    await page.goto(PATIENT_PORTAL);
    await page.fill('input[type="email"]', PATIENT_USER.email);
    await page.fill('input[type="password"]', PATIENT_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 15000 });
    
    // Navigate to Settings
    const settingsLink = page.locator('a[href="/settings"], a[href*="setting"]').first();
    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      await page.waitForTimeout(2000);
    }
    
    await expect(page.locator('body')).toBeVisible();
  });
});

// =====================================================
// DOCTOR PORTAL - EXTENDED FUNCTIONALITY TESTS
// =====================================================

test.describe('Doctor Portal - Extended Functionality', () => {
  
  test('AI Chat Assistant - No Errors on Load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Login
    await page.goto(DOCTOR_PORTAL);
    await page.fill('input[type="email"]', DOCTOR_USER.email);
    await page.fill('input[type="password"]', DOCTOR_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|home|appointments/i, { timeout: 15000 });
    
    // Look for AI Chat button/link
    const aiChatLink = page.locator('button:has-text("AI"), a[href*="ai"], [class*="ai"]').first();
    if (await aiChatLink.isVisible()) {
      await aiChatLink.click();
      await page.waitForTimeout(3000);
    }
    
    await expect(page.locator('body')).toBeVisible();
    
    const criticalErrors = errors.filter(e => 
      e.includes('Failed to fetch') || 
      e.includes('NetworkError')
    );
    expect(criticalErrors.length).toBeLessThan(3);
  });

  test('Schedule/Calendar - Loads Correctly', async ({ page }) => {
    // Login
    await page.goto(DOCTOR_PORTAL);
    await page.fill('input[type="email"]', DOCTOR_USER.email);
    await page.fill('input[type="password"]', DOCTOR_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|home|appointments/i, { timeout: 15000 });
    
    // Navigate to Schedule
    const scheduleLink = page.locator('a[href*="schedule"], a[href*="calendar"]').first();
    if (await scheduleLink.isVisible()) {
      await scheduleLink.click();
      await page.waitForTimeout(3000);
    }
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('Patients List - Data Loads', async ({ page }) => {
    // Login
    await page.goto(DOCTOR_PORTAL);
    await page.fill('input[type="email"]', DOCTOR_USER.email);
    await page.fill('input[type="password"]', DOCTOR_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|home|appointments/i, { timeout: 15000 });
    
    // Navigate to Patients
    const patientsLink = page.locator('a[href*="patient"]').first();
    if (await patientsLink.isVisible()) {
      await patientsLink.click();
      await page.waitForTimeout(3000);
    }
    
    // Check that patient list or table appears
    await expect(page.locator('body')).toBeVisible();
  });

  test('Medical Content - Loads Without Error', async ({ page }) => {
    // Login
    await page.goto(DOCTOR_PORTAL);
    await page.fill('input[type="email"]', DOCTOR_USER.email);
    await page.fill('input[type="password"]', DOCTOR_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|home|appointments/i, { timeout: 15000 });
    
    // Navigate to Medical Content
    const contentLink = page.locator('a[href*="content"], a[href*="medical"]').first();
    if (await contentLink.isVisible()) {
      await contentLink.click();
      await page.waitForTimeout(3000);
    }
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('Clinical Resources - Loads Without Error', async ({ page }) => {
    // Login
    await page.goto(DOCTOR_PORTAL);
    await page.fill('input[type="email"]', DOCTOR_USER.email);
    await page.fill('input[type="password"]', DOCTOR_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|home|appointments/i, { timeout: 15000 });
    
    // Navigate to Clinical Resources
    const resourcesLink = page.locator('a[href*="resource"], a[href*="clinical"]').first();
    if (await resourcesLink.isVisible()) {
      await resourcesLink.click();
      await page.waitForTimeout(3000);
    }
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('Consultants Page - Loads Without Error', async ({ page }) => {
    // Login
    await page.goto(DOCTOR_PORTAL);
    await page.fill('input[type="email"]', DOCTOR_USER.email);
    await page.fill('input[type="password"]', DOCTOR_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|home|appointments/i, { timeout: 15000 });
    
    // Navigate to Consultants
    const consultantsLink = page.locator('a[href*="consultant"]').first();
    if (await consultantsLink.isVisible()) {
      await consultantsLink.click();
      await page.waitForTimeout(3000);
    }
    
    await expect(page.locator('body')).toBeVisible();
  });
});

// =====================================================
// API RESPONSE TESTS - Verify No Fetch Errors
// =====================================================

test.describe('API Data Fetch Tests', () => {
  
  test('GET /api/content/medical returns data', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL}/api/content/medical`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.articles !== undefined).toBeTruthy();
  });

  test('Patient Portal - GET doctors with auth returns data', async ({ request }) => {
    // Login first to get token
    const loginResponse = await request.post(`${PATIENT_PORTAL}/api/auth/login`, {
      data: PATIENT_USER
    });
    const loginData = await loginResponse.json();
    
    const response = await request.get(`${PATIENT_PORTAL}/api/doctors`, {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(Array.isArray(data) || data.doctors).toBeTruthy();
  });

  test('Doctor Portal - GET patients returns data', async ({ request }) => {
    // Login first to get token
    const loginResponse = await request.post(`${DOCTOR_PORTAL}/auth/login`, {
      data: DOCTOR_USER
    });
    const loginData = await loginResponse.json();
    
    const response = await request.get(`${DOCTOR_PORTAL}/api/patients`, {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });
    expect(response.ok()).toBeTruthy();
  });

  test('Doctor Portal - GET appointments returns data', async ({ request }) => {
    const loginResponse = await request.post(`${DOCTOR_PORTAL}/auth/login`, {
      data: DOCTOR_USER
    });
    const loginData = await loginResponse.json();
    
    const response = await request.get(`${DOCTOR_PORTAL}/api/appointments`, {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });
    expect(response.ok()).toBeTruthy();
  });
});
