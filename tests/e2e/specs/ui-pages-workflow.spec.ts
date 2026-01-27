/**
 * UI Pages Workflow Test
 * Based on: Processes/UI_Pages_Workflows.md
 * 
 * Tests:
 * - Page navigation and routing
 * - Responsive design
 * - Thai-English language switching
 * - Accessibility
 * - Loading states
 * - Error handling
 */

import { test, expect, Page } from '@playwright/test';

const PATIENT_PORTAL_URL = process.env.PATIENT_PORTAL_URL || 'http://localhost:3005';
const DOCTOR_PORTAL_URL = process.env.DOCTOR_PORTAL_URL || 'http://localhost:3010';

const TEST_USERS = {
  patient: {
    email: 'demo.test@gmail.com',
    password: 'P@ssw0rd'
  },
  doctor: {
    email: 'doctor.test@izara.com',
    password: 'IzaraDoctor@2024'
  }
};

async function loginPatient(page: Page) {
  await page.goto(`${PATIENT_PORTAL_URL}/auth/login`);
  await page.fill('input[type="email"]', TEST_USERS.patient.email);
  await page.fill('input[type="password"]', TEST_USERS.patient.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${PATIENT_PORTAL_URL}/**`);
}

async function loginDoctor(page: Page) {
  await page.goto(`${DOCTOR_PORTAL_URL}/auth/login`);
  await page.fill('input[type="email"]', TEST_USERS.doctor.email);
  await page.fill('input[type="password"]', TEST_USERS.doctor.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${DOCTOR_PORTAL_URL}/**`);
}

test.describe('UI Pages Workflow - Patient Portal', () => {
  
  test('Patient portal homepage loads correctly', async ({ page }) => {
    await page.goto(PATIENT_PORTAL_URL);
    
    // Verify hero section
    await expect(page.locator('h1')).toBeVisible();
    
    // Verify navigation
    await expect(page.locator('nav')).toBeVisible();
    
    // Verify login button
    await expect(page.locator('a:has-text("เข้าสู่ระบบ")')).toBeVisible();
    
    console.log('✅ Patient portal homepage loaded');
  });
  
  test('Patient dashboard navigation', async ({ page }) => {
    await loginPatient(page);
    
    // Verify dashboard elements
    await expect(page.locator('h1:has-text("แดชบอร์ด")')).toBeVisible();
    
    // Navigate to appointments
    await page.click('a[href*="/appointments"]');
    await expect(page).toHaveURL(/\/appointments/);
    await expect(page.locator('h1:has-text("นัดหมาย")')).toBeVisible();
    
    // Navigate to health records
    await page.click('a[href*="/health-records"]');
    await expect(page).toHaveURL(/\/health-records/);
    
    // Navigate to prescriptions
    await page.click('a[href*="/prescriptions"]');
    await expect(page).toHaveURL(/\/prescriptions/);
    
    // Navigate to health library
    await page.click('a[href*="/health-library"]');
    await expect(page).toHaveURL(/\/health-library/);
    
    console.log('✅ Patient navigation working');
  });
  
  test('Language switching - Thai to English', async ({ page }) => {
    await page.goto(PATIENT_PORTAL_URL);
    
    // Default should be Thai
    await expect(page.locator('text=เข้าสู่ระบบ')).toBeVisible();
    
    // Switch to English
    await page.click('[data-testid="language-switcher"]');
    await page.click('button:has-text("English")');
    
    // Verify English text
    await expect(page.locator('text=Login')).toBeVisible();
    
    // Switch back to Thai
    await page.click('[data-testid="language-switcher"]');
    await page.click('button:has-text("ไทย")');
    
    await expect(page.locator('text=เข้าสู่ระบบ')).toBeVisible();
    
    console.log('✅ Language switching works');
  });
  
  test('Responsive design - Mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto(PATIENT_PORTAL_URL);
    
    // Verify hamburger menu appears
    const hamburger = page.locator('[data-testid="mobile-menu-button"]');
    await expect(hamburger).toBeVisible();
    
    // Open mobile menu
    await hamburger.click();
    
    // Verify menu items
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
    
    console.log('✅ Mobile responsive design works');
  });
  
  test('Loading states and spinners', async ({ page }) => {
    await loginPatient(page);
    
    // Navigate to appointments
    await page.click('a[href*="/appointments"]');
    
    // Check for loading spinner
    const spinner = page.locator('[data-testid="loading-spinner"]');
    
    // Spinner should appear briefly then disappear
    if (await spinner.isVisible()) {
      await expect(spinner).not.toBeVisible({ timeout: 5000 });
    }
    
    // Content should load
    await expect(page.locator('[data-testid="appointments-list"]')).toBeVisible();
    
    console.log('✅ Loading states work');
  });
  
  test('Error page - 404 Not Found', async ({ page }) => {
    await page.goto(`${PATIENT_PORTAL_URL}/non-existent-page`);
    
    // Verify 404 page
    await expect(page.locator('text=/404|ไม่พบหน้า|not found/i')).toBeVisible();
    
    // Verify back home button
    await expect(page.locator('a:has-text("กลับหน้าหลัก")')).toBeVisible();
    
    console.log('✅ 404 page works');
  });
  
  test('Accessibility - Keyboard navigation', async ({ page }) => {
    await page.goto(PATIENT_PORTAL_URL);
    
    // Tab through navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Verify focus visible
    const focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    console.log('✅ Keyboard navigation accessible');
  });
  
});

test.describe('UI Pages Workflow - Doctor Portal', () => {
  
  test('Doctor dashboard layout', async ({ page }) => {
    await loginDoctor(page);
    
    // Verify sidebar
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    
    // Verify stats cards
    await expect(page.locator('[data-testid="stats-card"]')).toHaveCount({ minimum: 3 });
    
    // Verify appointment list
    await expect(page.locator('[data-testid="upcoming-appointments"]')).toBeVisible();
    
    console.log('✅ Doctor dashboard layout correct');
  });
  
  test('Doctor navigation menu', async ({ page }) => {
    await loginDoctor(page);
    
    // Navigate to patients
    await page.click('a[href*="/patients"]');
    await expect(page).toHaveURL(/\/patients/);
    
    // Navigate to appointments
    await page.click('a[href*="/appointments"]');
    await expect(page).toHaveURL(/\/appointments/);
    
    // Navigate to prescriptions
    await page.click('a[href*="/prescriptions"]');
    await expect(page).toHaveURL(/\/prescriptions/);
    
    // Navigate to medical records
    await page.click('a[href*="/medical-records"]');
    await expect(page).toHaveURL(/\/medical-records/);
    
    console.log('✅ Doctor navigation works');
  });
  
  test('Doctor profile dropdown', async ({ page }) => {
    await loginDoctor(page);
    
    // Click profile avatar
    await page.click('[data-testid="profile-avatar"]');
    
    // Verify dropdown appears
    await expect(page.locator('[data-testid="profile-dropdown"]')).toBeVisible();
    
    // Verify options
    await expect(page.locator('a:has-text("โปรไฟล์")')).toBeVisible();
    await expect(page.locator('a:has-text("ตั้งค่า")')).toBeVisible();
    await expect(page.locator('button:has-text("ออกจากระบบ")')).toBeVisible();
    
    console.log('✅ Profile dropdown works');
  });
  
  test('Search functionality', async ({ page }) => {
    await loginDoctor(page);
    
    await page.goto(`${DOCTOR_PORTAL_URL}/patients`);
    
    // Use search
    await page.fill('input[name="search"]', 'Demo');
    
    // Verify search results
    await expect(page.locator('[data-testid="patient-card"]')).toBeVisible();
    
    console.log('✅ Search works');
  });
  
  test('Pagination', async ({ page }) => {
    await loginDoctor(page);
    
    await page.goto(`${DOCTOR_PORTAL_URL}/appointments`);
    
    // Check for pagination
    const pagination = page.locator('[data-testid="pagination"]');
    
    if (await pagination.isVisible()) {
      // Click next page
      await page.click('button:has-text("ถัดไป")');
      
      // Verify page changed
      await expect(page.locator('[data-testid="page-indicator"]:has-text("2")')).toBeVisible();
      
      console.log('✅ Pagination works');
    }
  });
  
  test('Modal dialogs', async ({ page }) => {
    await loginDoctor(page);
    
    await page.goto(`${DOCTOR_PORTAL_URL}/patients`);
    
    // Open add patient modal
    await page.click('button:has-text("เพิ่มผู้ป่วย")');
    
    // Verify modal appears
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Close modal
    await page.click('[data-testid="close-modal"]');
    
    // Verify modal closed
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    
    console.log('✅ Modals work');
  });
  
  test('Toast notifications', async ({ page }) => {
    await loginDoctor(page);
    
    // Trigger action that shows toast
    await page.goto(`${DOCTOR_PORTAL_URL}/appointments`);
    
    // Example: Mark appointment as completed
    const appointment = page.locator('[data-testid="appointment-card"]').first();
    
    if (await appointment.isVisible()) {
      await appointment.click();
      await page.click('button:has-text("เสร็จสิ้น")');
      
      // Verify toast appears
      const toast = page.locator('[data-testid="toast-notification"]');
      await expect(toast).toBeVisible({ timeout: 3000 });
      
      // Toast should auto-dismiss
      await expect(toast).not.toBeVisible({ timeout: 5000 });
      
      console.log('✅ Toast notifications work');
    }
  });
  
  test('Dark mode toggle', async ({ page }) => {
    await loginDoctor(page);
    
    // Find dark mode toggle
    const darkModeToggle = page.locator('[data-testid="dark-mode-toggle"]');
    
    if (await darkModeToggle.isVisible()) {
      // Toggle dark mode
      await darkModeToggle.click();
      
      // Verify dark class applied
      const html = page.locator('html');
      await expect(html).toHaveClass(/dark/);
      
      // Toggle back
      await darkModeToggle.click();
      await expect(html).not.toHaveClass(/dark/);
      
      console.log('✅ Dark mode works');
    }
  });
  
});
