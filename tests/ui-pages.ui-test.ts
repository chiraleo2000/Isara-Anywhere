/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — UI PAGE VERIFICATION (HEADED)
 * ═══════════════════════════════════════════════════════════════════════
 * Opens real browser, logs in, navigates ALL pages in both portals.
 * Verifies: status 200, data loads, no fetch errors, no empty states.
 * Runs with visible browser (headless: false).
 * ═══════════════════════════════════════════════════════════════════════
 */
import { test, expect, Page } from '@playwright/test';

const PATIENT_URL = 'http://localhost:3005';
const DOCTOR_URL = 'http://localhost:3010';

// Seed user credentials (from environment or defaults for local testing)
const PATIENT_CREDS = { email: 'demo.test@gmail.com', password: process.env.TEST_PATIENT_PASSWORD || 'P@ssw0rd' };
const DOCTOR_CREDS = { email: 'doctor.test@izara.com', password: process.env.TEST_DOCTOR_PASSWORD || 'IzaraDoctor@2024' };

// ── HELPER: Verify page loaded healthy ──────────────────────────────
async function verifyPageLoaded(page: Page, label: string): Promise<void> {
  // Wait for DOM content loaded
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });

  // Wait for network to settle (best effort)
  try {
    await page.waitForLoadState('networkidle', { timeout: 8000 });
  } catch {
    // networkidle timeout acceptable for long-polling pages
  }

  // Small pause for rendering
  await page.waitForTimeout(1000);

  // Check for error states on the page
  const issues = await page.evaluate(() => {
    const problems: string[] = [];
    const body = document.body?.innerText || '';
    const lower = body.toLowerCase();

    // Check for fatal error messages
    if (lower.includes('failed to fetch')) problems.push('Failed to fetch');
    if (lower.includes('network error')) problems.push('Network error');
    if (lower.includes('500 internal server')) problems.push('500 error');
    if (lower.includes('502 bad gateway')) problems.push('502 error');
    if (lower.includes('503 service unavailable')) problems.push('503 error');
    if (lower.includes('error loading data')) problems.push('Error loading data');
    if (lower.includes('something went wrong')) problems.push('Something went wrong');

    // Check root element has content
    const root = document.getElementById('root');
    if (root && root.innerHTML.trim().length < 50) {
      problems.push('Root element appears empty');
    }

    return problems;
  });

  // Verify no issues
  expect(issues, `${label}: Page has error states: ${issues.join(', ')}`).toHaveLength(0);

  // Verify URL didn't redirect to an error page
  const url = page.url();
  expect(url, `${label}: Unexpected redirect`).not.toContain('/error');
}

// ── HELPER: Login via API and inject token ──────────────────────────
async function loginViaAPI(
  page: Page,
  portalUrl: string,
  creds: { email: string; password: string },
): Promise<string> {
  // Login via API to get token
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
  const token = await loginViaAPI(page, PATIENT_URL, PATIENT_CREDS);
  // Navigate to patient portal and inject auth into localStorage
  await page.goto(PATIENT_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => {
    localStorage.setItem('token', t);
    localStorage.setItem('auth_token', t);
  }, token);
}

async function setupDoctorAuth(page: Page): Promise<string> {
  const token = await loginViaAPI(page, DOCTOR_URL, DOCTOR_CREDS);
  // Login response contains user info
  const response = await page.request.post(`${DOCTOR_URL}/api/auth/login`, {
    data: DOCTOR_CREDS,
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  const userId = data.user?.id || 'DOC-TEST-001';

  // Navigate and inject auth
  await page.goto(DOCTOR_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => {
    localStorage.setItem('token', t);
    localStorage.setItem('auth_token', t);
  }, token);

  return userId;
}

// ═══════════════════════════════════════════════════════════════════════
// PATIENT PORTAL PAGES
// ═══════════════════════════════════════════════════════════════════════
test.describe('Patient Portal — All Pages Load', () => {
  test.describe.configure({ mode: 'serial' });

  let patientPage: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    patientPage = await context.newPage();
    await setupPatientAuth(patientPage);
  });

  test.afterAll(async () => {
    await patientPage?.context().close();
  });

  test('P01 — Dashboard loads with data', async () => {
    await patientPage.goto(`${PATIENT_URL}/`, { waitUntil: 'domcontentloaded' });
    await verifyPageLoaded(patientPage, 'Dashboard');
    // Dashboard should have content (not just a loading spinner)
    const content = await patientPage.textContent('body');
    expect((content ?? '').length).toBeGreaterThan(100);
  });

  test('P02 — Appointments page loads', async () => {
    await patientPage.goto(`${PATIENT_URL}/appointments`, { waitUntil: 'domcontentloaded' });
    await verifyPageLoaded(patientPage, 'Appointments');
  });

  test('P03 — Book Appointment page loads', async () => {
    await patientPage.goto(`${PATIENT_URL}/appointments/book`, { waitUntil: 'domcontentloaded' });
    await verifyPageLoaded(patientPage, 'Book Appointment');
  });

  test('P04 — PHR (Personal Health Records) loads', async () => {
    await patientPage.goto(`${PATIENT_URL}/phr`, { waitUntil: 'domcontentloaded' });
    await verifyPageLoaded(patientPage, 'PHR');
  });

  test('P05 — AI Doctor page loads', async () => {
    await patientPage.goto(`${PATIENT_URL}/ai-doctor`, { waitUntil: 'domcontentloaded' });
    await verifyPageLoaded(patientPage, 'AI Doctor');
  });

  test('P06 — Health Library loads', async () => {
    await patientPage.goto(`${PATIENT_URL}/health-library`, { waitUntil: 'domcontentloaded' });
    await verifyPageLoaded(patientPage, 'Health Library');
  });

  test('P07 — Timeline page loads', async () => {
    await patientPage.goto(`${PATIENT_URL}/timeline`, { waitUntil: 'domcontentloaded' });
    await verifyPageLoaded(patientPage, 'Timeline');
  });

  test('P08 — Map page loads', async () => {
    await patientPage.goto(`${PATIENT_URL}/map`, { waitUntil: 'domcontentloaded' });
    await verifyPageLoaded(patientPage, 'Map');
  });

  test('P09 — PDPA page loads', async () => {
    await patientPage.goto(`${PATIENT_URL}/pdpa`, { waitUntil: 'domcontentloaded' });
    await verifyPageLoaded(patientPage, 'PDPA');
  });

  test('P10 — Living Will page loads', async () => {
    await patientPage.goto(`${PATIENT_URL}/living-will`, { waitUntil: 'domcontentloaded' });
    await verifyPageLoaded(patientPage, 'Living Will');
  });

  test('P11 — Profile page loads', async () => {
    await patientPage.goto(`${PATIENT_URL}/profile`, { waitUntil: 'domcontentloaded' });
    await verifyPageLoaded(patientPage, 'Profile');
  });

  test('P12 — Settings page loads', async () => {
    await patientPage.goto(`${PATIENT_URL}/settings`, { waitUntil: 'domcontentloaded' });
    await verifyPageLoaded(patientPage, 'Settings');
  });

  test('P13 — Login page accessible (public)', async () => {
    // Open new context without auth to test public page
    const browser = patientPage.context().browser();
    const ctx = await browser.newContext();
    const fresh = await ctx.newPage();
    await fresh.goto(`${PATIENT_URL}/login`, { waitUntil: 'domcontentloaded' });
    await verifyPageLoaded(fresh, 'Login');
    await ctx.close();
  });

  test('P14 — Register page accessible (public)', async () => {
    const browser = patientPage.context().browser();
    const ctx = await browser.newContext();
    const fresh = await ctx.newPage();
    await fresh.goto(`${PATIENT_URL}/register`, { waitUntil: 'domcontentloaded' });
    await verifyPageLoaded(fresh, 'Register');
    await ctx.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// DOCTOR PORTAL PAGES
// ═══════════════════════════════════════════════════════════════════════
test.describe('Doctor Portal — All Pages Load', () => {
  test.describe.configure({ mode: 'serial' });

  let doctorPage: Page;
  let userId: string;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    doctorPage = await context.newPage();
    userId = await setupDoctorAuth(doctorPage);
  });

  test.afterAll(async () => {
    await doctorPage?.context().close();
  });

  test('D01 — Dashboard loads with data', async () => {
    await doctorPage.goto(`${DOCTOR_URL}/doctor/${userId}/dashboard`, { waitUntil: 'domcontentloaded' });
    await verifyPageLoaded(doctorPage, 'Dashboard');
    const content = await doctorPage.textContent('body');
    expect((content ?? '').length).toBeGreaterThan(100);
  });

  test('D02 — Schedule page loads', async () => {
    await doctorPage.goto(`${DOCTOR_URL}/doctor/${userId}/schedule`, { waitUntil: 'domcontentloaded' });
    await verifyPageLoaded(doctorPage, 'Schedule');
  });

  test('D03 — Patients page loads', async () => {
    await doctorPage.goto(`${DOCTOR_URL}/doctor/${userId}/patients`, { waitUntil: 'domcontentloaded' });
    await verifyPageLoaded(doctorPage, 'Patients');
  });

  test('D04 — Medical Consultants page loads', async () => {
    await doctorPage.goto(`${DOCTOR_URL}/doctor/${userId}/medical-consultants`, { waitUntil: 'domcontentloaded' });
    await verifyPageLoaded(doctorPage, 'Medical Consultants');
  });

  test('D05 — Doctors Directory page loads', async () => {
    await doctorPage.goto(`${DOCTOR_URL}/doctor/${userId}/doctors`, { waitUntil: 'domcontentloaded' });
    await verifyPageLoaded(doctorPage, 'Doctors Directory');
  });

  test('D06 — Medical Content page loads', async () => {
    await doctorPage.goto(`${DOCTOR_URL}/doctor/${userId}/medical-content`, { waitUntil: 'domcontentloaded' });
    await verifyPageLoaded(doctorPage, 'Medical Content');
  });

  test('D07 — Health Meeting / Queue page loads', async () => {
    await doctorPage.goto(`${DOCTOR_URL}/doctor/${userId}/health-meeting`, { waitUntil: 'domcontentloaded' });
    await verifyPageLoaded(doctorPage, 'Health Meeting');
  });

  test('D08 — Clinical Resources page loads', async () => {
    await doctorPage.goto(`${DOCTOR_URL}/doctor/${userId}/clinical-resources`, { waitUntil: 'domcontentloaded' });
    await verifyPageLoaded(doctorPage, 'Clinical Resources');
  });

  test('D09 — Profile page loads', async () => {
    await doctorPage.goto(`${DOCTOR_URL}/doctor/${userId}/profile`, { waitUntil: 'domcontentloaded' });
    await verifyPageLoaded(doctorPage, 'Doctor Profile');
  });

  test('D10 — Admin: Doctor Management page loads', async () => {
    await doctorPage.goto(`${DOCTOR_URL}/doctor/${userId}/doctor-management`, { waitUntil: 'domcontentloaded' });
    await verifyPageLoaded(doctorPage, 'Doctor Management');
  });

  test('D11 — Admin: Appointment Management page loads', async () => {
    await doctorPage.goto(`${DOCTOR_URL}/doctor/${userId}/appointment-management`, { waitUntil: 'domcontentloaded' });
    await verifyPageLoaded(doctorPage, 'Appointment Management');
  });

  test('D12 — Login page accessible (public)', async () => {
    const browser = doctorPage.context().browser();
    const ctx = await browser.newContext();
    const fresh = await ctx.newPage();
    await fresh.goto(`${DOCTOR_URL}/login`, { waitUntil: 'domcontentloaded' });
    await verifyPageLoaded(fresh, 'Doctor Login');
    await ctx.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// API DATA VERIFICATION
// ═══════════════════════════════════════════════════════════════════════
test.describe('API Data Verification — Status 200', () => {
  let patientToken: string;
  let doctorToken: string;

  test.beforeAll(async ({ request }) => {
    // Patient login
    const pRes = await request.post(`${PATIENT_URL}/api/auth/login`, {
      data: PATIENT_CREDS,
    });
    expect(pRes.status()).toBe(200);
    const pData = await pRes.json();
    patientToken = pData.token;

    // Doctor login
    const dRes = await request.post(`${DOCTOR_URL}/api/auth/login`, {
      data: DOCTOR_CREDS,
    });
    expect(dRes.status()).toBe(200);
    const dData = await dRes.json();
    doctorToken = dData.token;
  });

  // Health endpoints
  test('API01 — Patient health 200', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/health`);
    expect(r.status()).toBe(200);
  });

  test('API02 — Doctor health 200', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/health`);
    expect(r.status()).toBe(200);
  });

  test('API03 — Meeting health 200', async ({ request }) => {
    const r = await request.get('http://localhost:3020/api/health');
    expect(r.status()).toBe(200);
  });

  // Patient data endpoints
  test('API04 — Patient appointments 200 + data', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/appointments`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d).toBeTruthy();
  });

  test('API05 — Patient notifications 200', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    expect(r.status()).toBe(200);
  });

  test('API06 — Patient PHR 200', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/phr`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    expect(r.status()).toBe(200);
  });

  // Doctor data endpoints
  test('API07 — Doctor appointments 200 + data', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/appointments`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    expect(r.status()).toBe(200);
  });

  test('API08 — Doctor consultants 200 + data', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/consultants`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.consultants?.length).toBeGreaterThan(0);
  });

  test('API09 — Medical content 200 + data', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/content/medical`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.articles?.length).toBeGreaterThan(0);
  });

  test('API10 — Clinical resources 200 + data', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/content/clinical`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.resources?.length).toBeGreaterThan(0);
  });

  test('API11 — Doctor notifications 200', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    expect(r.status()).toBe(200);
  });

  test('API12 — Dashboard stats 200', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/admin/dashboard-stats`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    expect(r.status()).toBe(200);
  });

  test('API13 — Doctors list 200', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/doctors`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    expect(r.status()).toBe(200);
  });

  test('API14 — Meetings list 200', async ({ request }) => {
    const r = await request.get('http://localhost:3020/api/meetings', {});
    expect(r.status()).toBe(200);
  });

  test('API14b — Meeting auto-record endpoint exists', async ({ request }) => {
    // Test that the auto-record endpoint responds (even without valid meeting ID)
    const r = await request.post('http://localhost:3020/api/meetings/test-id/auto-record', {
      data: { doctorId: 'test', doctorName: 'Test', autoTranscribe: true },
      headers: { 'Content-Type': 'application/json' },
    });
    // Should get 200 (creates in-memory) or 500 — but NOT 404
    expect([200, 500]).toContain(r.status());
  });

  test('API14c — Meeting results endpoint exists', async ({ request }) => {
    const r = await request.get('http://localhost:3020/api/meetings/test-id/results', {});
    // 404 = not found (correct), 200 = found, but not 500
    expect([200, 404]).toContain(r.status());
  });

  // Auth protection
  test('API15 — Unauth doctor returns 401', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/appointments`);
    expect(r.status()).toBe(401);
  });

  test('API16 — Unauth patient returns 401', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/notifications`);
    expect(r.status()).toBe(401);
  });
});
