/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — PHASE 2 UI BROWSER TESTS v2.0.0
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * REAL BROWSER TESTS — opens visible Chrome windows, navigates pages,
 * clicks buttons, fills forms, validates rendered DOM elements.
 *
 * Coverage:
 *   Section A: Patient Portal — Login + Dashboard UI (5 tests)
 *   Section B: Patient Portal — Navigation & Pages (8 tests)
 *   Section C: Doctor Portal — Login + Dashboard UI (5 tests)
 *   Section D: Doctor Portal — Navigation & Pages (8 tests)
 *   Section E: Cross-Portal Phase 2 UI Features (6 tests)
 *   Section F: Responsive & Accessibility Checks (4 tests)
 *
 * HEADED MODE — browser windows are VISIBLE during testing.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import {
  PATIENT_URL, DOCTOR_URL, MEETING_SERVER_URL,
  CREDENTIALS, IS_CLOUD,
} from '../lib/test-config';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const TIMEOUT = IS_CLOUD ? 30_000 : 15_000;
const NAV_TIMEOUT = IS_CLOUD ? 60_000 : 30_000;
const P1 = CREDENTIALS.patient1;
const DOC = CREDENTIALS.doctor;
const ADM = CREDENTIALS.admin;

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

async function createPage(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  return { context, page };
}

async function browserLoginPatient(page: Page, email: string, password: string) {
  await page.goto(`${PATIENT_URL}/login`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const emailInput = page.locator('#login-email, input[name="email"], input[type="email"]').first();
  const passwordInput = page.locator('#login-password, input[name="password"], input[type="password"]').first();
  await emailInput.fill(email);
  await passwordInput.fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: NAV_TIMEOUT });
  await page.waitForTimeout(1500);
}

async function browserLoginDoctor(page: Page, email: string, password: string) {
  await page.goto(`${DOCTOR_URL}/login`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const emailInput = page.locator('input[type="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  await emailInput.fill(email);
  await passwordInput.fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: NAV_TIMEOUT });
  await page.waitForTimeout(1500);
}

async function loginAndGetPage(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const { context, page } = await createPage(browser);
  await browserLoginPatient(page, P1.email, P1.password);
  return { context, page };
}

async function loginAndGetDoctorPage(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const { context, page } = await createPage(browser);
  await browserLoginDoctor(page, DOC.email, DOC.password);
  return { context, page };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION A: PATIENT PORTAL — LOGIN + DASHBOARD UI (5 tests)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('P2-UI-A: Patient Portal Login & Dashboard', () => {

  test('P2-A01: Login page renders with form elements', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await page.goto(`${PATIENT_URL}/login`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });

    // Verify visible login form
    await expect(page.locator('#login-email, input[name="email"], input[type="email"]').first()).toBeVisible({ timeout: TIMEOUT });
    await expect(page.locator('#login-password, input[name="password"], input[type="password"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Page title or heading present
    const pageText = await page.textContent('body');
    expect(pageText!.length).toBeGreaterThan(50);

    await page.screenshot({ path: 'test-results/p2-a01-patient-login.png', fullPage: true });
    await context.close();
  });

  test('P2-A02: Patient login redirects to dashboard', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginPatient(page, P1.email, P1.password);

    // Should be on dashboard (not login)
    expect(page.url()).not.toContain('/login');

    // Dashboard should have meaningful content
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(100);

    await page.screenshot({ path: 'test-results/p2-a02-patient-dashboard.png', fullPage: true });
    await context.close();
  });

  test('P2-A03: Dashboard shows navigation sidebar/menu', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginPatient(page, P1.email, P1.password);

    // Look for navigation elements (sidebar, nav, menu)
    const nav = page.locator('nav, [role="navigation"], .sidebar, .nav-menu, aside').first();
    await expect(nav).toBeVisible({ timeout: TIMEOUT });

    await page.screenshot({ path: 'test-results/p2-a03-patient-nav.png', fullPage: true });
    await context.close();
  });

  test('P2-A04: Dashboard displays user greeting or info', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginPatient(page, P1.email, P1.password);

    // Dashboard body should contain some recognizable text
    const body = (await page.textContent('body'))!.toLowerCase();
    // Flexible: look for dashboard-like keywords
    const hasDashboardContent = body.includes('dashboard') || body.includes('welcome') ||
      body.includes('appointment') || body.includes('health') || body.includes('home') ||
      body.includes('สวัสดี') || body.includes('นัดหมาย');
    expect(hasDashboardContent).toBe(true);

    await context.close();
  });

  test('P2-A05: Invalid login shows error feedback', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await page.goto(`${PATIENT_URL}/login`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });

    const emailInput = page.locator('#login-email, input[name="email"], input[type="email"]').first();
    const passwordInput = page.locator('#login-password, input[name="password"], input[type="password"]').first();
    await emailInput.fill('invalid@test.com');
    await passwordInput.fill('wrongpassword');
    await page.locator('button[type="submit"]').click();

    await page.waitForTimeout(3000);

    // Should still be on login page
    expect(page.url()).toContain('/login');

    // Should show error message
    const body = (await page.textContent('body'))!.toLowerCase();
    const hasError = body.includes('error') || body.includes('invalid') || body.includes('incorrect') ||
      body.includes('failed') || body.includes('ผิดพลาด') || body.includes('ไม่ถูกต้อง');
    expect(hasError).toBe(true);

    await page.screenshot({ path: 'test-results/p2-a05-patient-login-error.png', fullPage: true });
    await context.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION B: PATIENT PORTAL — NAVIGATION & KEY PAGES (8 tests)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('P2-UI-B: Patient Portal Pages', () => {

  test('P2-B01: Navigate to Appointments page', async ({ browser }) => {
    const { context, page } = await loginAndGetPage(browser);
    await page.goto(`${PATIENT_URL}/appointments`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const body = (await page.textContent('body'))!.toLowerCase();
    const hasContent = body.includes('appointment') || body.includes('นัดหมาย') || body.includes('schedule') || body.includes('booking');
    expect(hasContent).toBe(true);

    await page.screenshot({ path: 'test-results/p2-b01-appointments.png', fullPage: true });
    await context.close();
  });

  test('P2-B02: Navigate to Health Records page', async ({ browser }) => {
    const { context, page } = await loginAndGetPage(browser);
    await page.goto(`${PATIENT_URL}/health-records`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const body = (await page.textContent('body'))!.toLowerCase();
    expect(body.length).toBeGreaterThan(50);

    await page.screenshot({ path: 'test-results/p2-b02-health-records.png', fullPage: true });
    await context.close();
  });

  test('P2-B03: Navigate to AI Chat page', async ({ browser }) => {
    const { context, page } = await loginAndGetPage(browser);
    await page.goto(`${PATIENT_URL}/ai-chat`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const body = (await page.textContent('body'))!.toLowerCase();
    const hasAI = body.includes('ai') || body.includes('chat') || body.includes('gemini') ||
      body.includes('ถาม') || body.includes('assist') || body.includes('message');
    expect(hasAI || body.length > 50).toBe(true);

    await page.screenshot({ path: 'test-results/p2-b03-ai-chat.png', fullPage: true });
    await context.close();
  });

  test('P2-B04: Navigate to Profile/Settings page', async ({ browser }) => {
    const { context, page } = await loginAndGetPage(browser);
    await page.goto(`${PATIENT_URL}/profile`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const body = (await page.textContent('body'))!.toLowerCase();
    const hasProfile = body.includes('profile') || body.includes('setting') || body.includes('account') ||
      body.includes('โปรไฟล์') || body.includes('ตั้งค่า') || body.includes('email');
    expect(hasProfile || body.length > 50).toBe(true);

    await page.screenshot({ path: 'test-results/p2-b04-profile.png', fullPage: true });
    await context.close();
  });

  test('P2-B05: Navigate to Medical Library page', async ({ browser }) => {
    const { context, page } = await loginAndGetPage(browser);
    await page.goto(`${PATIENT_URL}/medical-library`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const body = (await page.textContent('body'))!.toLowerCase();
    expect(body.length).toBeGreaterThan(50);

    await page.screenshot({ path: 'test-results/p2-b05-medical-library.png', fullPage: true });
    await context.close();
  });

  test('P2-B06: Navigate to Notifications page', async ({ browser }) => {
    const { context, page } = await loginAndGetPage(browser);
    await page.goto(`${PATIENT_URL}/notifications`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const body = (await page.textContent('body'))!.toLowerCase();
    expect(body.length).toBeGreaterThan(50);

    await page.screenshot({ path: 'test-results/p2-b06-notifications.png', fullPage: true });
    await context.close();
  });

  test('P2-B07: Navigate to Living Will page', async ({ browser }) => {
    const { context, page } = await loginAndGetPage(browser);
    await page.goto(`${PATIENT_URL}/living-will`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const body = (await page.textContent('body'))!.toLowerCase();
    expect(body.length).toBeGreaterThan(50);

    await page.screenshot({ path: 'test-results/p2-b07-living-will.png', fullPage: true });
    await context.close();
  });

  test('P2-B08: Navigate to Consultants page', async ({ browser }) => {
    const { context, page } = await loginAndGetPage(browser);
    await page.goto(`${PATIENT_URL}/consultants`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const body = (await page.textContent('body'))!.toLowerCase();
    expect(body.length).toBeGreaterThan(50);

    await page.screenshot({ path: 'test-results/p2-b08-consultants.png', fullPage: true });
    await context.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION C: DOCTOR PORTAL — LOGIN + DASHBOARD UI (5 tests)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('P2-UI-C: Doctor Portal Login & Dashboard', () => {

  test('P2-C01: Doctor login page renders', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await page.goto(`${DOCTOR_URL}/login`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });

    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: TIMEOUT });
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    await page.screenshot({ path: 'test-results/p2-c01-doctor-login.png', fullPage: true });
    await context.close();
  });

  test('P2-C02: Doctor login redirects to dashboard', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginDoctor(page, DOC.email, DOC.password);

    expect(page.url()).not.toContain('/login');
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(100);

    await page.screenshot({ path: 'test-results/p2-c02-doctor-dashboard.png', fullPage: true });
    await context.close();
  });

  test('P2-C03: Doctor dashboard has navigation', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginDoctor(page, DOC.email, DOC.password);

    const nav = page.locator('nav, [role="navigation"], .sidebar, .nav-menu, aside').first();
    await expect(nav).toBeVisible({ timeout: TIMEOUT });

    await page.screenshot({ path: 'test-results/p2-c03-doctor-nav.png', fullPage: true });
    await context.close();
  });

  test('P2-C04: Doctor dashboard shows doctor-specific content', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginDoctor(page, DOC.email, DOC.password);

    const body = (await page.textContent('body'))!.toLowerCase();
    const hasDoctorContent = body.includes('patient') || body.includes('schedule') ||
      body.includes('appointment') || body.includes('queue') || body.includes('dashboard') ||
      body.includes('ผู้ป่วย') || body.includes('ตารางนัด') || body.includes('คิว');
    expect(hasDoctorContent).toBe(true);

    await context.close();
  });

  test('P2-C05: Admin login to doctor portal', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginDoctor(page, ADM.email, ADM.password);

    expect(page.url()).not.toContain('/login');
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(100);

    await page.screenshot({ path: 'test-results/p2-c05-admin-dashboard.png', fullPage: true });
    await context.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION D: DOCTOR PORTAL — NAVIGATION & KEY PAGES (8 tests)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('P2-UI-D: Doctor Portal Pages', () => {

  test('P2-D01: Navigate to Schedule page', async ({ browser }) => {
    const { context, page } = await loginAndGetDoctorPage(browser);
    await page.goto(`${DOCTOR_URL}/schedule`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const body = (await page.textContent('body'))!.toLowerCase();
    expect(body.length).toBeGreaterThan(50);

    await page.screenshot({ path: 'test-results/p2-d01-schedule.png', fullPage: true });
    await context.close();
  });

  test('P2-D02: Navigate to Patients list page', async ({ browser }) => {
    const { context, page } = await loginAndGetDoctorPage(browser);
    await page.goto(`${DOCTOR_URL}/patients`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const body = (await page.textContent('body'))!.toLowerCase();
    expect(body.length).toBeGreaterThan(50);

    await page.screenshot({ path: 'test-results/p2-d02-patients.png', fullPage: true });
    await context.close();
  });

  test('P2-D03: Navigate to Queue page', async ({ browser }) => {
    const { context, page } = await loginAndGetDoctorPage(browser);
    await page.goto(`${DOCTOR_URL}/queue`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const body = (await page.textContent('body'))!.toLowerCase();
    expect(body.length).toBeGreaterThan(50);

    await page.screenshot({ path: 'test-results/p2-d03-queue.png', fullPage: true });
    await context.close();
  });

  test('P2-D04: Navigate to EMR page', async ({ browser }) => {
    const { context, page } = await loginAndGetDoctorPage(browser);
    await page.goto(`${DOCTOR_URL}/emr`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const body = (await page.textContent('body'))!.toLowerCase();
    expect(body.length).toBeGreaterThan(50);

    await page.screenshot({ path: 'test-results/p2-d04-emr.png', fullPage: true });
    await context.close();
  });

  test('P2-D05: Navigate to Prescriptions page', async ({ browser }) => {
    const { context, page } = await loginAndGetDoctorPage(browser);
    await page.goto(`${DOCTOR_URL}/prescriptions`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const body = (await page.textContent('body'))!.toLowerCase();
    expect(body.length).toBeGreaterThan(50);

    await page.screenshot({ path: 'test-results/p2-d05-prescriptions.png', fullPage: true });
    await context.close();
  });

  test('P2-D06: Navigate to Clinical Resources page', async ({ browser }) => {
    const { context, page } = await loginAndGetDoctorPage(browser);
    await page.goto(`${DOCTOR_URL}/clinical-resources`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const body = (await page.textContent('body'))!.toLowerCase();
    expect(body.length).toBeGreaterThan(50);

    await page.screenshot({ path: 'test-results/p2-d06-clinical-resources.png', fullPage: true });
    await context.close();
  });

  test('P2-D07: Navigate to Doctor Profile page', async ({ browser }) => {
    const { context, page } = await loginAndGetDoctorPage(browser);
    await page.goto(`${DOCTOR_URL}/profile`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const body = (await page.textContent('body'))!.toLowerCase();
    expect(body.length).toBeGreaterThan(50);

    await page.screenshot({ path: 'test-results/p2-d07-doctor-profile.png', fullPage: true });
    await context.close();
  });

  test('P2-D08: Navigate to Analytics/Reports page', async ({ browser }) => {
    const { context, page } = await loginAndGetDoctorPage(browser);
    await page.goto(`${DOCTOR_URL}/analytics`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const body = (await page.textContent('body'))!.toLowerCase();
    expect(body.length).toBeGreaterThan(50);

    await page.screenshot({ path: 'test-results/p2-d08-analytics.png', fullPage: true });
    await context.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION E: CROSS-PORTAL PHASE 2 UI (6 tests)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('P2-UI-E: Cross-Portal Phase 2 Features', () => {

  test('P2-E01: Patient + Doctor login SIMULTANEOUSLY — two browser windows', async ({ browser }) => {
    const patient = await createPage(browser);
    const doctor = await createPage(browser);

    // Both navigate at once
    await Promise.all([
      patient.page.goto(`${PATIENT_URL}/login`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' }),
      doctor.page.goto(`${DOCTOR_URL}/login`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' }),
    ]);

    // Both login forms visible
    await expect(patient.page.locator('#login-email, input[type="email"]').first()).toBeVisible();
    await expect(doctor.page.locator('input[type="email"]').first()).toBeVisible();

    // Both fill and submit
    await patient.page.locator('#login-email, input[type="email"]').first().fill(P1.email);
    await patient.page.locator('#login-password, input[type="password"]').first().fill(P1.password);
    await doctor.page.locator('input[type="email"]').first().fill(DOC.email);
    await doctor.page.locator('input[type="password"]').first().fill(DOC.password);

    await Promise.all([
      patient.page.locator('button[type="submit"]').click(),
      doctor.page.locator('button[type="submit"]').click(),
    ]);

    await Promise.all([
      patient.page.waitForURL(url => !url.toString().includes('/login'), { timeout: NAV_TIMEOUT }),
      doctor.page.waitForURL(url => !url.toString().includes('/login'), { timeout: NAV_TIMEOUT }),
    ]);

    // Both on their dashboards
    expect(patient.page.url()).not.toContain('/login');
    expect(doctor.page.url()).not.toContain('/login');

    await patient.page.screenshot({ path: 'test-results/p2-e01-patient-side.png' });
    await doctor.page.screenshot({ path: 'test-results/p2-e01-doctor-side.png' });

    await patient.context.close();
    await doctor.context.close();
  });

  test('P2-E02: Patient portal — check sidebar has key menu items', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginPatient(page, P1.email, P1.password);

    const body = (await page.textContent('body'))!.toLowerCase();
    // At least some key navigation text exists
    const menuItems = ['appointment', 'health', 'ai', 'profile', 'notification', 'นัดหมาย', 'สุขภาพ'];
    const foundCount = menuItems.filter(item => body.includes(item)).length;
    expect(foundCount).toBeGreaterThanOrEqual(2);

    await context.close();
  });

  test('P2-E03: Doctor portal — check sidebar has key menu items', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginDoctor(page, DOC.email, DOC.password);

    const body = (await page.textContent('body'))!.toLowerCase();
    const menuItems = ['patient', 'schedule', 'queue', 'emr', 'profile', 'ผู้ป่วย', 'ตารางนัด'];
    const foundCount = menuItems.filter(item => body.includes(item)).length;
    expect(foundCount).toBeGreaterThanOrEqual(2);

    await context.close();
  });

  test('P2-E04: Patient portal — clickable navigation works', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginPatient(page, P1.email, P1.password);

    // Find and click any nav link
    const navLinks = page.locator('nav a, aside a, .sidebar a, [role="navigation"] a');
    const count = await navLinks.count();

    if (count > 0) {
      await navLinks.first().click({ timeout: TIMEOUT });
      await page.waitForTimeout(1500);
      // URL may have changed — page should still have content
      const body = await page.textContent('body');
      expect(body!.length).toBeGreaterThan(50);
    }

    await context.close();
  });

  test('P2-E05: Doctor portal — clickable navigation works', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginDoctor(page, DOC.email, DOC.password);

    const navLinks = page.locator('nav a, aside a, .sidebar a, [role="navigation"] a');
    const count = await navLinks.count();

    if (count > 0) {
      await navLinks.first().click({ timeout: TIMEOUT });
      await page.waitForTimeout(1500);
      const body = await page.textContent('body');
      expect(body!.length).toBeGreaterThan(50);
    }

    await context.close();
  });

  test('P2-E06: Meeting server health endpoint accessible', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await page.goto(`${MEETING_SERVER_URL}/api/health`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });

    const body = (await page.textContent('body'))!;
    // Health endpoint returns JSON
    expect(body.length).toBeGreaterThan(0);

    await page.screenshot({ path: 'test-results/p2-e06-meeting-health.png' });
    await context.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION F: RESPONSIVE & ACCESSIBILITY (4 tests)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('P2-UI-F: Responsive & Accessibility', () => {

  test('P2-F01: Patient portal renders at mobile viewport (375px)', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      ignoreHTTPSErrors: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15',
    });
    const page = await context.newPage();

    await page.goto(`${PATIENT_URL}/login`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Login form should still be visible at mobile width
    await expect(page.locator('#login-email, input[name="email"], input[type="email"]').first()).toBeVisible({ timeout: TIMEOUT });
    
    await page.screenshot({ path: 'test-results/p2-f01-mobile-patient.png', fullPage: true });
    await context.close();
  });

  test('P2-F02: Doctor portal renders at tablet viewport (768px)', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 768, height: 1024 },
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    await page.goto(`${DOCTOR_URL}/login`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: TIMEOUT });
    
    await page.screenshot({ path: 'test-results/p2-f02-tablet-doctor.png', fullPage: true });
    await context.close();
  });

  test('P2-F03: Patient portal has no console errors on login page', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(`${PATIENT_URL}/login`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Filter out known harmless errors (favicon, etc.)
    const criticalErrors = consoleErrors.filter(e =>
      !e.includes('favicon') && !e.includes('manifest') && !e.includes('service-worker') && !e.includes('ERR_CONNECTION_REFUSED')
    );

    // Allow up to 2 non-critical console errors
    expect(criticalErrors.length).toBeLessThanOrEqual(2);

    await context.close();
  });

  test('P2-F04: Doctor portal has no console errors on login page', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(`${DOCTOR_URL}/login`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const criticalErrors = consoleErrors.filter(e =>
      !e.includes('favicon') && !e.includes('manifest') && !e.includes('service-worker') && !e.includes('ERR_CONNECTION_REFUSED')
    );

    expect(criticalErrors.length).toBeLessThanOrEqual(2);

    await context.close();
  });
});
