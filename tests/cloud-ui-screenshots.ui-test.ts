/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — CLOUD UI SCREENSHOT CAPTURE
 * ═══════════════════════════════════════════════════════════════════════
 * Opens real browser against CLOUD Cloud Run services.
 * Navigates ALL pages in both portals with slower actions.
 * Captures full-page screenshots of every page.
 * Verifies: status 200, data loads, no fetch errors, no empty states.
 * ═══════════════════════════════════════════════════════════════════════
 */
import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const CLOUD_PATIENT = 'https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app';
const CLOUD_DOCTOR = 'https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app';
const CLOUD_MEETING = 'https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app';

const PATIENT_CREDS = { email: 'demo.test@gmail.com', password: 'P@ssw0rd' };
const DOCTOR_CREDS = { email: 'doctor.test@izara.com', password: 'IzaraDoctor@2024' };

const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots', 'cloud');

// Ensure screenshot directory exists
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

// Slower wait — extra time for Cloud Run cold starts & network latency
const CLOUD_DELAY = 3000;

// ── HELPER: Wait for page fully loaded + extra settle time ──────────
async function waitAndCapture(page: Page, label: string, filename: string): Promise<void> {
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
  try {
    await page.waitForLoadState('networkidle', { timeout: 15000 });
  } catch {
    // networkidle can timeout on polling pages
  }
  // Extra settle time for Cloud Run latency + rendering
  await page.waitForTimeout(CLOUD_DELAY);

  // Check for error states
  const issues = await page.evaluate(() => {
    const problems: string[] = [];
    const body = document.body?.innerText || '';
    const lower = body.toLowerCase();
    if (lower.includes('failed to fetch')) problems.push('Failed to fetch');
    if (lower.includes('network error')) problems.push('Network error');
    if (lower.includes('500 internal server')) problems.push('500 error');
    if (lower.includes('502 bad gateway')) problems.push('502 error');
    if (lower.includes('503 service unavailable')) problems.push('503 error');
    if (lower.includes('error loading data')) problems.push('Error loading data');
    if (lower.includes('something went wrong')) problems.push('Something went wrong');
    const root = document.getElementById('root');
    if (root && root.innerHTML.trim().length < 50) problems.push('Root empty');
    return problems;
  });
  expect(issues, `${label}: Page has error states: ${issues.join(', ')}`).toHaveLength(0);

  // Capture screenshot
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${filename}.png`),
    fullPage: true,
  });
}

// ── HELPER: Login via API ───────────────────────────────────────────
async function loginViaAPI(
  page: Page,
  portalUrl: string,
  creds: { email: string; password: string },
): Promise<string> {
  const response = await page.request.post(`${portalUrl}/api/auth/login`, {
    data: creds,
    headers: { 'Content-Type': 'application/json' },
  });
  expect(response.status(), `Login to ${portalUrl} failed`).toBe(200);
  const data = await response.json();
  const token = data.token || data.accessToken;
  expect(token, 'No token in login response').toBeTruthy();
  return token;
}

async function setupPatientAuth(page: Page): Promise<void> {
  const token = await loginViaAPI(page, CLOUD_PATIENT, PATIENT_CREDS);
  await page.goto(CLOUD_PATIENT, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate((t) => {
    localStorage.setItem('token', t);
    localStorage.setItem('auth_token', t);
  }, token);
}

async function setupDoctorAuth(page: Page): Promise<string> {
  const token = await loginViaAPI(page, CLOUD_DOCTOR, DOCTOR_CREDS);
  const response = await page.request.post(`${CLOUD_DOCTOR}/api/auth/login`, {
    data: DOCTOR_CREDS,
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  const userId = data.user?.id || 'DOC-TEST-001';
  await page.goto(CLOUD_DOCTOR, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate((t) => {
    localStorage.setItem('token', t);
    localStorage.setItem('auth_token', t);
  }, token);
  return userId;
}

// ═══════════════════════════════════════════════════════════════════════
// CLOUD PATIENT PORTAL SCREENSHOTS
// ═══════════════════════════════════════════════════════════════════════
test.describe('Cloud Patient Portal — All Pages Screenshot', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(120000);

  let patientPage: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    patientPage = await context.newPage();
    await setupPatientAuth(patientPage);
  });

  test.afterAll(async () => {
    await patientPage?.context().close();
  });

  test('CP01 — Login Page', async () => {
    const ctx = await patientPage.context().browser()!.newContext({ viewport: { width: 1920, height: 1080 } });
    const fresh = await ctx.newPage();
    await fresh.goto(`${CLOUD_PATIENT}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(fresh, 'Patient Login', 'patient-01-login');
    await ctx.close();
  });

  test('CP02 — Register Page', async () => {
    const ctx = await patientPage.context().browser()!.newContext({ viewport: { width: 1920, height: 1080 } });
    const fresh = await ctx.newPage();
    await fresh.goto(`${CLOUD_PATIENT}/register`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(fresh, 'Patient Register', 'patient-02-register');
    await ctx.close();
  });

  test('CP03 — Dashboard', async () => {
    await patientPage.goto(`${CLOUD_PATIENT}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(patientPage, 'Dashboard', 'patient-03-dashboard');
  });

  test('CP04 — Appointments', async () => {
    await patientPage.goto(`${CLOUD_PATIENT}/appointments`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(patientPage, 'Appointments', 'patient-04-appointments');
  });

  test('CP05 — Book Appointment', async () => {
    await patientPage.goto(`${CLOUD_PATIENT}/appointments/book`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(patientPage, 'Book Appointment', 'patient-05-book-appointment');
  });

  test('CP06 — PHR Health Records', async () => {
    await patientPage.goto(`${CLOUD_PATIENT}/phr`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(patientPage, 'PHR', 'patient-06-phr');
  });

  test('CP07 — AI Doctor', async () => {
    await patientPage.goto(`${CLOUD_PATIENT}/ai-doctor`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(patientPage, 'AI Doctor', 'patient-07-ai-doctor');
  });

  test('CP08 — Health Library', async () => {
    await patientPage.goto(`${CLOUD_PATIENT}/health-library`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(patientPage, 'Health Library', 'patient-08-health-library');
  });

  test('CP09 — Timeline', async () => {
    await patientPage.goto(`${CLOUD_PATIENT}/timeline`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(patientPage, 'Timeline', 'patient-09-timeline');
  });

  test('CP10 — Map', async () => {
    await patientPage.goto(`${CLOUD_PATIENT}/map`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(patientPage, 'Map', 'patient-10-map');
  });

  test('CP11 — PDPA Privacy', async () => {
    await patientPage.goto(`${CLOUD_PATIENT}/pdpa`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(patientPage, 'PDPA', 'patient-11-pdpa');
  });

  test('CP12 — Living Will', async () => {
    await patientPage.goto(`${CLOUD_PATIENT}/living-will`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(patientPage, 'Living Will', 'patient-12-living-will');
  });

  test('CP13 — Profile', async () => {
    await patientPage.goto(`${CLOUD_PATIENT}/profile`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(patientPage, 'Profile', 'patient-13-profile');
  });

  test('CP14 — Settings', async () => {
    await patientPage.goto(`${CLOUD_PATIENT}/settings`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(patientPage, 'Settings', 'patient-14-settings');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// CLOUD DOCTOR PORTAL SCREENSHOTS
// ═══════════════════════════════════════════════════════════════════════
test.describe('Cloud Doctor Portal — All Pages Screenshot', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(120000);

  let doctorPage: Page;
  let userId: string;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    doctorPage = await context.newPage();
    userId = await setupDoctorAuth(doctorPage);
  });

  test.afterAll(async () => {
    await doctorPage?.context().close();
  });

  test('CD01 — Login Page', async () => {
    const ctx = await doctorPage.context().browser()!.newContext({ viewport: { width: 1920, height: 1080 } });
    const fresh = await ctx.newPage();
    await fresh.goto(`${CLOUD_DOCTOR}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(fresh, 'Doctor Login', 'doctor-01-login');
    await ctx.close();
  });

  test('CD02 — Dashboard', async () => {
    await doctorPage.goto(`${CLOUD_DOCTOR}/doctor/${userId}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(doctorPage, 'Dashboard', 'doctor-02-dashboard');
  });

  test('CD03 — Schedule', async () => {
    await doctorPage.goto(`${CLOUD_DOCTOR}/doctor/${userId}/schedule`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(doctorPage, 'Schedule', 'doctor-03-schedule');
  });

  test('CD04 — Patients', async () => {
    await doctorPage.goto(`${CLOUD_DOCTOR}/doctor/${userId}/patients`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(doctorPage, 'Patients', 'doctor-04-patients');
  });

  test('CD05 — Medical Consultants', async () => {
    await doctorPage.goto(`${CLOUD_DOCTOR}/doctor/${userId}/medical-consultants`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(doctorPage, 'Medical Consultants', 'doctor-05-consultants');
  });

  test('CD06 — Doctors Directory', async () => {
    await doctorPage.goto(`${CLOUD_DOCTOR}/doctor/${userId}/doctors`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(doctorPage, 'Doctors', 'doctor-06-doctors');
  });

  test('CD07 — Medical Content', async () => {
    await doctorPage.goto(`${CLOUD_DOCTOR}/doctor/${userId}/medical-content`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(doctorPage, 'Medical Content', 'doctor-07-medical-content');
  });

  test('CD08 — Health Meeting / Queue', async () => {
    await doctorPage.goto(`${CLOUD_DOCTOR}/doctor/${userId}/health-meeting`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(doctorPage, 'Health Meeting', 'doctor-08-health-meeting');
  });

  test('CD09 — Clinical Resources', async () => {
    await doctorPage.goto(`${CLOUD_DOCTOR}/doctor/${userId}/clinical-resources`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(doctorPage, 'Clinical Resources', 'doctor-09-clinical-resources');
  });

  test('CD10 — Profile', async () => {
    await doctorPage.goto(`${CLOUD_DOCTOR}/doctor/${userId}/profile`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(doctorPage, 'Doctor Profile', 'doctor-10-profile');
  });

  test('CD11 — Admin: Doctor Management', async () => {
    await doctorPage.goto(`${CLOUD_DOCTOR}/doctor/${userId}/doctor-management`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(doctorPage, 'Doctor Management', 'doctor-11-doctor-management');
  });

  test('CD12 — Admin: Appointment Management', async () => {
    await doctorPage.goto(`${CLOUD_DOCTOR}/doctor/${userId}/appointment-management`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(doctorPage, 'Appointment Management', 'doctor-12-appointment-management');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// CLOUD API HEALTH — ALL RETURN 200
// ═══════════════════════════════════════════════════════════════════════
test.describe('Cloud API Health — Status 200', () => {
  test.setTimeout(60000);

  let patientToken: string;
  let doctorToken: string;

  test.beforeAll(async ({ request }) => {
    const pRes = await request.post(`${CLOUD_PATIENT}/api/auth/login`, { data: PATIENT_CREDS });
    expect(pRes.status()).toBe(200);
    patientToken = (await pRes.json()).token;

    const dRes = await request.post(`${CLOUD_DOCTOR}/api/auth/login`, { data: DOCTOR_CREDS });
    expect(dRes.status()).toBe(200);
    doctorToken = (await dRes.json()).token;
  });

  test('CAPI01 — Patient /api/health', async ({ request }) => {
    const r = await request.get(`${CLOUD_PATIENT}/api/health`);
    expect(r.status()).toBe(200);
  });

  test('CAPI02 — Doctor /api/health', async ({ request }) => {
    const r = await request.get(`${CLOUD_DOCTOR}/api/health`);
    expect(r.status()).toBe(200);
  });

  test('CAPI03 — Meeting /api/health', async ({ request }) => {
    const r = await request.get(`${CLOUD_MEETING}/api/health`);
    expect(r.status()).toBe(200);
  });

  test('CAPI04 — Patient appointments', async ({ request }) => {
    const r = await request.get(`${CLOUD_PATIENT}/api/appointments`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    expect(r.status()).toBe(200);
  });

  test('CAPI05 — Patient notifications', async ({ request }) => {
    const r = await request.get(`${CLOUD_PATIENT}/api/notifications`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    expect(r.status()).toBe(200);
  });

  test('CAPI06 — Patient PHR', async ({ request }) => {
    const r = await request.get(`${CLOUD_PATIENT}/api/phr`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    expect(r.status()).toBe(200);
  });

  test('CAPI07 — Doctor appointments', async ({ request }) => {
    const r = await request.get(`${CLOUD_DOCTOR}/api/appointments`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    expect(r.status()).toBe(200);
  });

  test('CAPI08 — Doctor consultants', async ({ request }) => {
    const r = await request.get(`${CLOUD_DOCTOR}/api/consultants`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    expect(r.status()).toBe(200);
  });

  test('CAPI09 — Medical content', async ({ request }) => {
    const r = await request.get(`${CLOUD_DOCTOR}/api/content/medical`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    expect(r.status()).toBe(200);
  });

  test('CAPI10 — Clinical resources', async ({ request }) => {
    const r = await request.get(`${CLOUD_DOCTOR}/api/content/clinical`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    expect(r.status()).toBe(200);
  });

  test('CAPI11 — Doctor notifications', async ({ request }) => {
    const r = await request.get(`${CLOUD_DOCTOR}/api/notifications`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    expect(r.status()).toBe(200);
  });

  test('CAPI12 — Dashboard stats', async ({ request }) => {
    const r = await request.get(`${CLOUD_DOCTOR}/api/admin/dashboard-stats`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    expect(r.status()).toBe(200);
  });

  test('CAPI13 — Doctors list', async ({ request }) => {
    const r = await request.get(`${CLOUD_DOCTOR}/api/doctors`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    expect(r.status()).toBe(200);
  });
});
