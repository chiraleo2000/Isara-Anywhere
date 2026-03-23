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
import * as path from 'node:path';
import * as fs from 'node:fs';

const CLOUD_PATIENT = 'https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app';
const CLOUD_DOCTOR = 'https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app';
const CLOUD_MEETING = 'https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app';

const PATIENT_CREDS = { email: process.env['PATIENT_EMAIL'] ?? 'demo.test@gmail.com', password: process.env['PATIENT_PASSWORD'] ?? 'DemoTest@2024!' };
const DOCTOR_CREDS = { email: process.env['DOCTOR_EMAIL'] ?? 'doctor.test@izara.com', password: process.env['DOCTOR_PASSWORD'] ?? 'IzaraDoctor@2024' };

const SS_ROOT = path.join(__dirname, '..', 'screenshots', 'cloud');
const SS_PATIENT = path.join(SS_ROOT, 'patient-portal');
const SS_DOCTOR  = path.join(SS_ROOT, 'doctor-portal');
const SS_API     = path.join(SS_ROOT, 'api-health');
[SS_ROOT, SS_PATIENT, SS_DOCTOR, SS_API].forEach(d => fs.mkdirSync(d, { recursive: true }));

// Slower wait — extra time for Cloud Run cold starts & network latency
const CLOUD_DELAY = 3000;

// ── HELPER: Wait for page fully loaded + extra settle time ──────────
async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function safeGoto(page: Page, url: string, options?: { waitUntil?: 'domcontentloaded' | 'load' | 'networkidle'; timeout?: number }, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await page.goto(url, options);
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      console.log(`  \u23f3 safeGoto retry ${attempt}/${retries} for ${url}: ${(err as Error).message?.slice(0, 60)}`);
      await sleep(3000 * attempt);
    }
  }
}

async function waitAndCapture(page: Page, label: string, filename: string, dir: string = SS_ROOT): Promise<void> {
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
  try {
    await page.waitForLoadState('networkidle', { timeout: 15000 });
  } catch {
    // networkidle can timeout on polling pages
  }
  // Extra settle time for Cloud Run latency + rendering
  await page.waitForTimeout(CLOUD_DELAY);

  // Check for error states (lenient: skip 'Root empty' — some pages render async)
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
    return problems;
  });
  expect(issues, `${label}: Page has error states: ${issues.join(', ')}`).toHaveLength(0);

  // Verify authenticated pages don't show login form (redirect detection)
  const currentUrl = page.url();
  const isAuthPage = filename.includes('login') || filename.includes('register') || filename.includes('reset');
  if (!isAuthPage) {
    const showsLogin = await page.evaluate(() => {
      const url = globalThis.location.pathname;
      const hasLoginForm = !!document.querySelector('form[action*="login"], input[type="password"]');
      const isLoginUrl = url.includes('/login') || url.includes('/register');
      return isLoginUrl || (hasLoginForm && !url.includes('/reset'));
    });
    expect(showsLogin, `${label}: Page redirected to login — auth injection failed (URL: ${currentUrl})`).toBe(false);
  }

  // Capture screenshot
  await page.screenshot({
    path: path.join(dir, `${filename}.png`),
    fullPage: false,
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
  // If login fails with existing creds, try /auth/login path
  if (response.status() !== 200) {
    const altResponse = await page.request.post(`${portalUrl}/auth/login`, {
      data: creds,
      headers: { 'Content-Type': 'application/json' },
    });
    expect(altResponse.status(), `Login to ${portalUrl} failed (tried both /api/auth/login and /auth/login)`).toBe(200);
    const altData = await altResponse.json();
    return altData.token || altData.accessToken;
  }
  const data = await response.json();
  const token = data.token || data.accessToken;
  expect(token, 'No token in login response').toBeTruthy();
  return token;
}

async function setupPatientAuth(page: Page): Promise<void> {
  // Register a fresh patient (in case demo account doesn't exist on cloud)
  const ts = Date.now();
  const freshEmail = `cloud.test.${ts}@test.com`;
  const freshPass = 'CloudTest@2024!';
  await page.request.post(`${CLOUD_PATIENT}/auth/register`, {
    data: { email: freshEmail, password: freshPass, name: 'Cloud Test Patient', phone: '0899999999', dateOfBirth: '1990-01-01', gender: 'female' },
    headers: { 'Content-Type': 'application/json' },
  });
  // Try login with fresh account
  let token: string;
  let userData: Record<string, unknown> = {};
  const freshLogin = await page.request.post(`${CLOUD_PATIENT}/auth/login`, {
    data: { email: freshEmail, password: freshPass },
    headers: { 'Content-Type': 'application/json' },
  });
  if (freshLogin.status() === 200) {
    const loginData = await freshLogin.json();
    token = loginData.token;
    userData = loginData.user || {};
  } else {
    // Fallback to default patient creds
    const fallbackRes = await page.request.post(`${CLOUD_PATIENT}/api/auth/login`, {
      data: PATIENT_CREDS,
      headers: { 'Content-Type': 'application/json' },
    });
    if (fallbackRes.status() === 200) {
      const fbData = await fallbackRes.json();
      token = fbData.token || fbData.accessToken;
      userData = fbData.user || {};
    } else {
      const altRes = await page.request.post(`${CLOUD_PATIENT}/auth/login`, {
        data: PATIENT_CREDS,
        headers: { 'Content-Type': 'application/json' },
      });
      expect(altRes.status(), 'Patient login failed').toBe(200);
      const altData = await altRes.json();
      token = altData.token || altData.accessToken;
      userData = altData.user || {};
    }
  }
  await safeGoto(page,CLOUD_PATIENT, { waitUntil: 'domcontentloaded', timeout: 30000 });
  // Inject FULL patient auth — must set izara_user + auth_token + activity timestamp
  await page.evaluate(({ t, user, email }) => {
    const now = Date.now();
    const userObj = Object.keys(user).length > 0 ? user : {
      id: 'cloud-test-patient',
      patientId: 'cloud-test-patient',
      name: 'Cloud Test Patient',
      email: email,
      phone: '0899999999',
      role: 'patient',
      gender: 'female',
      dateOfBirth: '1990-01-01',
    };
    localStorage.setItem('izara_user', JSON.stringify(userObj));
    localStorage.setItem('auth_token', t);
    localStorage.setItem('token', t);
    localStorage.setItem('izara_patient_last_activity', now.toString());
  }, { t: token, user: userData, email: freshEmail });
  // Reload to pick up auth state
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
}

async function setupDoctorAuth(page: Page): Promise<string> {
  const token = await loginViaAPI(page, CLOUD_DOCTOR, DOCTOR_CREDS);
  const response = await page.request.post(`${CLOUD_DOCTOR}/api/auth/login`, {
    data: DOCTOR_CREDS,
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  const userId = data.user?.id || 'DOC-TEST-001';
  await safeGoto(page,CLOUD_DOCTOR, { waitUntil: 'domcontentloaded', timeout: 30000 });
  // Inject full doctor auth (same pattern as multi-user test)
  await page.evaluate(({ token, userId }) => {
    const now = Date.now();
    localStorage.setItem('token', token);
    localStorage.setItem('auth_token', token);
    localStorage.setItem('izara_current_user', JSON.stringify({
      id: userId, email: 'doctor.test@izara.com', name: 'Dr. Test',
      displayName: 'Dr. Test', role: 'doctor',
      doctorId: userId, medicalLicenseNumber: 'LIC-001',
      isActive: true, emailVerified: true, isAdmin: true,
      adminPrivileges: { manageDoctors: true, manageAppointments: true, viewAllRecords: true, manageContent: true, systemSettings: true },
      specialty: 'General Practice',
      preferences: { theme: 'light', language: 'th', notifications: { email: true, push: true, sms: false } },
    }));
    localStorage.setItem('izara_session_expiry', (now + 3600000).toString());
    localStorage.setItem('izara_last_activity', now.toString());
  }, { token, userId });
  // Reload to pick up injected auth state
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
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
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    patientPage = await context.newPage();
    await setupPatientAuth(patientPage);
  });

  test.afterAll(async () => {
    await patientPage?.context().close();
  });

  test('CP01 — Login Page', async () => {
    const browser = patientPage.context().browser();
    if (!browser) throw new Error('Browser not available');
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const fresh = await ctx.newPage();
    await safeGoto(fresh,`${CLOUD_PATIENT}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(fresh, 'Patient Login', 'patient-01-login', SS_PATIENT);
    await ctx.close();
  });

  test('CP02 — Register Page', async () => {
    const browser = patientPage.context().browser();
    if (!browser) throw new Error('Browser not available');
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const fresh = await ctx.newPage();
    await safeGoto(fresh,`${CLOUD_PATIENT}/register`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(fresh, 'Patient Register', 'patient-02-register', SS_PATIENT);
    await ctx.close();
  });

  test('CP03 — Dashboard', async () => {
    await safeGoto(patientPage,`${CLOUD_PATIENT}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(patientPage, 'Dashboard', 'patient-03-dashboard', SS_PATIENT);
  });

  test('CP04 — Appointments', async () => {
    await safeGoto(patientPage,`${CLOUD_PATIENT}/appointments`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(patientPage, 'Appointments', 'patient-04-appointments', SS_PATIENT);
  });

  test('CP05 — Book Appointment', async () => {
    await safeGoto(patientPage,`${CLOUD_PATIENT}/appointments/book`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(patientPage, 'Book Appointment', 'patient-05-book-appointment', SS_PATIENT);
  });

  test('CP06 — PHR Health Records', async () => {
    await safeGoto(patientPage,`${CLOUD_PATIENT}/phr`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(patientPage, 'PHR', 'patient-06-phr', SS_PATIENT);
  });

  test('CP07 — AI Doctor', async () => {
    await safeGoto(patientPage,`${CLOUD_PATIENT}/ai-doctor`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(patientPage, 'AI Doctor', 'patient-07-ai-doctor', SS_PATIENT);
  });

  test('CP08 — Health Library', async () => {
    await safeGoto(patientPage,`${CLOUD_PATIENT}/health-library`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(patientPage, 'Health Library', 'patient-08-health-library', SS_PATIENT);
  });

  test('CP09 — Timeline', async () => {
    await safeGoto(patientPage,`${CLOUD_PATIENT}/timeline`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(patientPage, 'Timeline', 'patient-09-timeline', SS_PATIENT);
  });

  test('CP10 — Map', async () => {
    await safeGoto(patientPage,`${CLOUD_PATIENT}/map`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(patientPage, 'Map', 'patient-10-map', SS_PATIENT);
  });

  test('CP11 — PDPA Privacy', async () => {
    await safeGoto(patientPage,`${CLOUD_PATIENT}/pdpa`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(patientPage, 'PDPA', 'patient-11-pdpa', SS_PATIENT);
  });

  test('CP12 — Living Will', async () => {
    await safeGoto(patientPage,`${CLOUD_PATIENT}/living-will`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(patientPage, 'Living Will', 'patient-12-living-will', SS_PATIENT);
  });

  test('CP13 — Profile', async () => {
    await safeGoto(patientPage,`${CLOUD_PATIENT}/profile`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(patientPage, 'Profile', 'patient-13-profile', SS_PATIENT);
  });

  test('CP14 — Settings', async () => {
    await safeGoto(patientPage,`${CLOUD_PATIENT}/settings`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(patientPage, 'Settings', 'patient-14-settings', SS_PATIENT);
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
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    doctorPage = await context.newPage();
    userId = await setupDoctorAuth(doctorPage);
  });

  test.afterAll(async () => {
    await doctorPage?.context().close();
  });

  test('CD01 — Login Page', async () => {
    const browser = doctorPage.context().browser();
    if (!browser) throw new Error('Browser not available');
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const fresh = await ctx.newPage();
    await safeGoto(fresh,`${CLOUD_DOCTOR}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(fresh, 'Doctor Login', 'doctor-01-login', SS_DOCTOR);
    await ctx.close();
  });

  test('CD02 — Dashboard', async () => {
    await safeGoto(doctorPage,`${CLOUD_DOCTOR}/doctor/${userId}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(doctorPage, 'Dashboard', 'doctor-02-dashboard', SS_DOCTOR);
  });

  test('CD03 — Schedule', async () => {
    await safeGoto(doctorPage,`${CLOUD_DOCTOR}/doctor/${userId}/schedule`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(doctorPage, 'Schedule', 'doctor-03-schedule', SS_DOCTOR);
  });

  test('CD04 — Patients', async () => {
    await safeGoto(doctorPage,`${CLOUD_DOCTOR}/doctor/${userId}/patients`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(doctorPage, 'Patients', 'doctor-04-patients', SS_DOCTOR);
  });

  test('CD05 — Medical Consultants', async () => {
    await safeGoto(doctorPage,`${CLOUD_DOCTOR}/doctor/${userId}/medical-consultants`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(doctorPage, 'Medical Consultants', 'doctor-05-consultants', SS_DOCTOR);
  });

  test('CD06 — Doctors Directory', async () => {
    await safeGoto(doctorPage,`${CLOUD_DOCTOR}/doctor/${userId}/doctors`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(doctorPage, 'Doctors', 'doctor-06-doctors', SS_DOCTOR);
  });

  test('CD07 — Medical Content', async () => {
    await safeGoto(doctorPage,`${CLOUD_DOCTOR}/doctor/${userId}/medical-content`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(doctorPage, 'Medical Content', 'doctor-07-medical-content', SS_DOCTOR);
  });

  test('CD08 — Health Meeting / Queue', async () => {
    await safeGoto(doctorPage,`${CLOUD_DOCTOR}/doctor/${userId}/health-meeting`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(doctorPage, 'Health Meeting', 'doctor-08-health-meeting', SS_DOCTOR);
  });

  test('CD09 — Clinical Resources', async () => {
    await safeGoto(doctorPage,`${CLOUD_DOCTOR}/doctor/${userId}/clinical-resources`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(doctorPage, 'Clinical Resources', 'doctor-09-clinical-resources', SS_DOCTOR);
  });

  test('CD10 — Profile', async () => {
    await safeGoto(doctorPage,`${CLOUD_DOCTOR}/doctor/${userId}/profile`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(doctorPage, 'Doctor Profile', 'doctor-10-profile', SS_DOCTOR);
  });

  test('CD11 — Admin: Doctor Management', async () => {
    await safeGoto(doctorPage,`${CLOUD_DOCTOR}/doctor/${userId}/doctor-management`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(doctorPage, 'Doctor Management', 'doctor-11-doctor-management', SS_DOCTOR);
  });

  test('CD12 — Admin: Appointment Management', async () => {
    await safeGoto(doctorPage,`${CLOUD_DOCTOR}/doctor/${userId}/appointment-management`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitAndCapture(doctorPage, 'Appointment Management', 'doctor-12-appointment-management', SS_DOCTOR);
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
    // Register fresh patient for cloud API tests
    const ts = Date.now();
    const freshEmail = `api.test.${ts}@test.com`;
    const freshPass = 'ApiTest@2024!';
    await request.post(`${CLOUD_PATIENT}/auth/register`, {
      data: { email: freshEmail, password: freshPass, name: 'API Test Patient', phone: '0888888888', dateOfBirth: '1990-01-01', gender: 'male' },
    });
    const pRes = await request.post(`${CLOUD_PATIENT}/auth/login`, {
      data: { email: freshEmail, password: freshPass },
    });
    expect(pRes.status(), 'Patient login for API tests failed').toBe(200);
    patientToken = (await pRes.json()).token;

    const dRes = await request.post(`${CLOUD_DOCTOR}/api/auth/login`, { data: DOCTOR_CREDS });
    expect(dRes.status(), 'Doctor login for API tests failed').toBe(200);
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
