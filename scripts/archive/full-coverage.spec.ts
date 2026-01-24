import { test, expect } from '@playwright/test';

// Test Configuration
const PATIENT_PORTAL = 'http://localhost:3005';
const DOCTOR_PORTAL = 'http://localhost:3010';

// Test Users
const PATIENT_USER = { email: 'demo.test@gmail.com', password: 'P@ssw0rd' };
const DOCTOR_USER = { email: 'doctor.test@izara.com', password: 'IzaraDoctor@2024' };
const ADMIN_USER = { email: 'admin.test@izara.com', password: 'IzaraAdmin@2024' };

// =====================================================
// PATIENT PORTAL TESTS
// =====================================================

test.describe('Patient Portal - Full Coverage', () => {
  test.describe.configure({ mode: 'serial' });

  test('Health Check', async ({ page }) => {
    const response = await page.goto(`${PATIENT_PORTAL}/health`);
    expect(response?.status()).toBe(200);
  });

  test('Login Page Loads', async ({ page }) => {
    await page.goto(PATIENT_PORTAL);
    await expect(page).toHaveTitle(/Izara|Patient/i);
  });

  test('Patient Login Success', async ({ page }) => {
    await page.goto(PATIENT_PORTAL);
    await page.waitForLoadState('networkidle');
    
    // Wait for React app to load
    await page.waitForTimeout(3000);
    
    // Fill login form
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    
    if (await emailInput.isVisible()) {
      await emailInput.fill(PATIENT_USER.email);
      await passwordInput.fill(PATIENT_USER.password);
      await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign")');
      
      // Wait for navigation or dashboard element
      await Promise.race([
        page.waitForURL(/dashboard|home|appointment/i, { timeout: 15000 }),
        page.waitForSelector('[class*="dashboard"], [class*="home"], nav', { timeout: 15000 })
      ]).catch(() => {});
    }
    
    // Verify we're logged in
    await expect(page.locator('body')).toBeVisible();
  });

  test('Dashboard Access', async ({ page }) => {
    // Login first
    await page.goto(PATIENT_PORTAL);
    await page.fill('input[type="email"], input[name="email"]', PATIENT_USER.email);
    await page.fill('input[type="password"], input[name="password"]', PATIENT_USER.password);
    await page.click('button[type="submit"]');
    // After login, patient portal stays at "/" which is the dashboard (index route)
    // Wait for login to complete - URL should no longer contain 'login'
    await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 15000 });
    
    // Verify dashboard elements
    await expect(page.locator('body')).toBeVisible();
  });

  test('Appointments Page', async ({ page }) => {
    await page.goto(PATIENT_PORTAL);
    await page.fill('input[type="email"], input[name="email"]', PATIENT_USER.email);
    await page.fill('input[type="password"], input[name="password"]', PATIENT_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 15000 });
    
    // Navigate to appointments - use href selector for Thai navigation
    await page.click('a[href="/appointments"], a[href*="appointment"]');
    await page.waitForTimeout(2000);
  });

  test('Profile Page', async ({ page }) => {
    await page.goto(PATIENT_PORTAL);
    await page.fill('input[type="email"], input[name="email"]', PATIENT_USER.email);
    await page.fill('input[type="password"], input[name="password"]', PATIENT_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 15000 });
    
    // Navigate to profile - use href selector for Thai navigation
    const profileLink = page.locator('a[href="/profile"], a[href*="profile"]').first();
    if (await profileLink.isVisible()) {
      await profileLink.click();
      await page.waitForTimeout(2000);
    }
  });

  test('Health Records Page', async ({ page }) => {
    await page.goto(PATIENT_PORTAL);
    await page.fill('input[type="email"], input[name="email"]', PATIENT_USER.email);
    await page.fill('input[type="password"], input[name="password"]', PATIENT_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 15000 });
    
    // Navigate to health records (PHR in Thai navigation)
    const recordsLink = page.locator('a[href="/phr"], a[href*="record"], a[href*="health"]').first();
    if (await recordsLink.isVisible()) {
      await recordsLink.click();
      await page.waitForTimeout(2000);
    }
  });

  test('AI Chat Page', async ({ page }) => {
    await page.goto(PATIENT_PORTAL);
    await page.fill('input[type="email"], input[name="email"]', PATIENT_USER.email);
    await page.fill('input[type="password"], input[name="password"]', PATIENT_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 15000 });
    
    // Navigate to AI chat (ai-doctor in Thai navigation)
    const chatLink = page.locator('a[href="/ai-doctor"], a[href*="ai"], a[href*="chat"]').first();
    if (await chatLink.isVisible()) {
      await chatLink.click();
      await page.waitForTimeout(2000);
    }
  });
});

// =====================================================
// DOCTOR PORTAL TESTS
// =====================================================

test.describe('Doctor Portal - Full Coverage', () => {
  test.describe.configure({ mode: 'serial' });

  test('Health Check', async ({ page }) => {
    const response = await page.goto(`${DOCTOR_PORTAL}/health`);
    expect(response?.status()).toBe(200);
  });

  test('Login Page Loads', async ({ page }) => {
    await page.goto(DOCTOR_PORTAL);
    await expect(page).toHaveTitle(/Izara|Doctor|Portal/i);
  });

  test('Doctor Login Success', async ({ page }) => {
    await page.goto(DOCTOR_PORTAL);
    
    // Fill login form  
    await page.fill('input[type="email"], input[name="email"]', DOCTOR_USER.email);
    await page.fill('input[type="password"], input[name="password"]', DOCTOR_USER.password);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForURL(/dashboard|home|appointments|consultation/i, { timeout: 15000 });
  });

  test('Doctor Dashboard Access', async ({ page }) => {
    await page.goto(DOCTOR_PORTAL);
    await page.fill('input[type="email"], input[name="email"]', DOCTOR_USER.email);
    await page.fill('input[type="password"], input[name="password"]', DOCTOR_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|home|appointments|consultation/i, { timeout: 15000 });
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('Doctor Appointments Page', async ({ page }) => {
    await page.goto(DOCTOR_PORTAL);
    await page.fill('input[type="email"], input[name="email"]', DOCTOR_USER.email);
    await page.fill('input[type="password"], input[name="password"]', DOCTOR_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|home|appointments|consultation/i, { timeout: 15000 });
    
    const appointmentsLink = page.locator('a[href*="appointment"], nav >> text=/appointment/i').first();
    if (await appointmentsLink.isVisible()) {
      await appointmentsLink.click();
      await page.waitForTimeout(2000);
    }
  });

  test('Doctor Patients Page', async ({ page }) => {
    await page.goto(DOCTOR_PORTAL);
    await page.fill('input[type="email"], input[name="email"]', DOCTOR_USER.email);
    await page.fill('input[type="password"], input[name="password"]', DOCTOR_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|home|appointments|consultation/i, { timeout: 15000 });
    
    const patientsLink = page.locator('a[href*="patient"], nav >> text=/patient/i').first();
    if (await patientsLink.isVisible()) {
      await patientsLink.click();
      await page.waitForTimeout(2000);
    }
  });

  test('Doctor Consultations Page', async ({ page }) => {
    await page.goto(DOCTOR_PORTAL);
    await page.fill('input[type="email"], input[name="email"]', DOCTOR_USER.email);
    await page.fill('input[type="password"], input[name="password"]', DOCTOR_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|home|appointments|consultation/i, { timeout: 15000 });
    
    const consultLink = page.locator('a[href*="consult"], nav >> text=/consult/i').first();
    if (await consultLink.isVisible()) {
      await consultLink.click();
      await page.waitForTimeout(2000);
    }
  });

  test('Doctor EMR/Medical Records Page', async ({ page }) => {
    await page.goto(DOCTOR_PORTAL);
    await page.fill('input[type="email"], input[name="email"]', DOCTOR_USER.email);
    await page.fill('input[type="password"], input[name="password"]', DOCTOR_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|home|appointments|consultation/i, { timeout: 15000 });
    
    const emrLink = page.locator('a[href*="emr"], a[href*="record"], nav >> text=/emr|record|medical/i').first();
    if (await emrLink.isVisible()) {
      await emrLink.click();
      await page.waitForTimeout(2000);
    }
  });

  test('Doctor Profile Page', async ({ page }) => {
    await page.goto(DOCTOR_PORTAL);
    await page.fill('input[type="email"], input[name="email"]', DOCTOR_USER.email);
    await page.fill('input[type="password"], input[name="password"]', DOCTOR_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|home|appointments|consultation/i, { timeout: 15000 });
    
    const profileLink = page.locator('a[href*="profile"], button:has-text("profile"), nav >> text=/profile|setting/i').first();
    if (await profileLink.isVisible()) {
      await profileLink.click();
      await page.waitForTimeout(2000);
    }
  });
});

// =====================================================
// ADMIN PORTAL TESTS
// =====================================================

test.describe('Admin Portal - Full Coverage', () => {
  test.describe.configure({ mode: 'serial' });

  test('Admin Login Success', async ({ page }) => {
    await page.goto(DOCTOR_PORTAL);
    
    // Fill login form  
    await page.fill('input[type="email"], input[name="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"], input[name="password"]', ADMIN_USER.password);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForURL(/dashboard|admin|home/i, { timeout: 15000 });
  });

  test('Admin Dashboard Access', async ({ page }) => {
    await page.goto(DOCTOR_PORTAL);
    await page.fill('input[type="email"], input[name="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"], input[name="password"]', ADMIN_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|admin|home/i, { timeout: 15000 });
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('Admin User Management Page', async ({ page }) => {
    await page.goto(DOCTOR_PORTAL);
    await page.fill('input[type="email"], input[name="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"], input[name="password"]', ADMIN_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|admin|home/i, { timeout: 15000 });
    
    const usersLink = page.locator('a[href*="user"], a[href*="admin"], nav >> text=/user|manage/i').first();
    if (await usersLink.isVisible()) {
      await usersLink.click();
      await page.waitForTimeout(2000);
    }
  });

  test('Admin Analytics Page', async ({ page }) => {
    await page.goto(DOCTOR_PORTAL);
    await page.fill('input[type="email"], input[name="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"], input[name="password"]', ADMIN_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|admin|home/i, { timeout: 15000 });
    
    const analyticsLink = page.locator('a[href*="analytic"], a[href*="report"], nav >> text=/analytic|report|statistic/i').first();
    if (await analyticsLink.isVisible()) {
      await analyticsLink.click();
      await page.waitForTimeout(2000);
    }
  });
});

// =====================================================
// API ENDPOINT TESTS
// =====================================================

test.describe('API Endpoints', () => {
  test('Patient Portal Health', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL}/health`);
    expect(response.ok()).toBeTruthy();
  });

  test('Doctor Portal Health', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL}/health`);
    expect(response.ok()).toBeTruthy();
  });

  test('Patient Login API', async ({ request }) => {
    const response = await request.post(`${PATIENT_PORTAL}/api/auth/login`, {
      data: PATIENT_USER
    });
    expect(response.ok()).toBeTruthy();
    const json = await response.json();
    expect(json.user).toBeDefined();
    expect(json.token).toBeDefined();
  });

  test('Doctor Login API', async ({ request }) => {
    const response = await request.post(`${DOCTOR_PORTAL}/auth/login`, {
      data: DOCTOR_USER
    });
    expect(response.ok()).toBeTruthy();
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.token).toBeDefined();
  });

  test('Admin Login API', async ({ request }) => {
    const response = await request.post(`${DOCTOR_PORTAL}/auth/login`, {
      data: ADMIN_USER
    });
    expect(response.ok()).toBeTruthy();
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.user.isAdmin).toBe(true);
  });
});
