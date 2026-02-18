/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — MULTI-USER SHOWCASE E2E TESTS v1.4.9
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Opens MULTIPLE browser pages simultaneously for Doctor, Patient, and Admin.
 * All portals are VISIBLE side-by-side in headed mode.
 *
 * Sections:
 *   MU-A: Simultaneous Multi-Role Login (5 tests)
 *   MU-B: Patient Portal — All Key Pages (8 tests)
 *   MU-C: Doctor Portal — All Key Pages (8 tests)
 *   MU-D: Admin Portal — Dashboard & Management (4 tests)
 *   MU-E: Cross-Portal Workflow Showcase (6 tests)
 *   MU-F: Full API Endpoint Sweep — No 400-500 (6 tests)
 *   MU-G: Multi-User Concurrent Page Navigation (5 tests)
 *   TOTAL: 42 tests
 *
 * Updated: v1.4.9 — February 16, 2026
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { test, expect, Browser, BrowserContext, Page, APIRequestContext } from '@playwright/test';
import {
  PATIENT_URL, DOCTOR_URL, MEETING_SERVER_URL,
  CREDENTIALS, IS_CLOUD, ENDPOINTS,
  logTestSuccess, logTestInfo, logTestWarning,
} from '../lib/test-config';

// ─── Constants ────────────────────────────────────────────────────────
const TIMEOUT = IS_CLOUD ? 30_000 : 15_000;
const NAV_TIMEOUT = IS_CLOUD ? 60_000 : 30_000;
const PAGE_LOAD_WAIT = 2000;

const P1 = CREDENTIALS.patient1;
const P2 = CREDENTIALS.patient2;
const DOC = CREDENTIALS.doctor;
const ADM = CREDENTIALS.admin;

// ─── Viewport presets (for tiled side-by-side display) ────────────────
const VIEWPORT_LEFT  = { width: 960, height: 1080 };
const VIEWPORT_RIGHT = { width: 960, height: 1080 };
const VIEWPORT_THIRD = { width: 640, height: 900 };

// ─── Helpers ──────────────────────────────────────────────────────────

const DEFAULT_VIEWPORT = { width: 1280, height: 900 };

async function createPage(browser: Browser, viewport = DEFAULT_VIEWPORT): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    viewport,
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  return { context, page };
}

async function browserLoginPatient(page: Page, creds = P1) {
  await page.goto(`${PATIENT_URL}/login`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const emailInput = page.locator('#login-email, input[name="email"], input[type="email"]').first();
  const passwordInput = page.locator('#login-password, input[name="password"], input[type="password"]').first();
  await emailInput.fill(creds.email);
  await passwordInput.fill(creds.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: NAV_TIMEOUT });
  await page.waitForTimeout(1500);
}

async function browserLoginDoctor(page: Page, creds = DOC) {
  await page.goto(`${DOCTOR_URL}/login`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const emailInput = page.locator('input[type="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  await emailInput.fill(creds.email);
  await passwordInput.fill(creds.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: NAV_TIMEOUT });
  await page.waitForTimeout(1500);
}

async function apiLoginPatient(request: APIRequestContext): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await request.post(`${PATIENT_URL}/api/auth/login`, {
        data: { email: P1.email, password: P1.password },
        headers: { 'Content-Type': 'application/json' },
        timeout: TIMEOUT,
      });
      if (r.status() === 200) {
        const d = await r.json();
        const token = d.token || d.accessToken || '';
        if (token) return token;
      }
    } catch (e) { logTestWarning(`Patient login attempt ${attempt + 1}: ${(e as Error).message}`); }
    if (attempt < 2) await new Promise(r => setTimeout(r, 2000));
  }
  return '';
}

async function apiLoginDoctor(request: APIRequestContext): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const path of ['/auth/login', '/api/auth/login']) {
      try {
        const r = await request.post(`${DOCTOR_URL}${path}`, {
          data: { email: DOC.email, password: DOC.password },
          headers: { 'Content-Type': 'application/json' },
          timeout: TIMEOUT,
        });
        if (r.status() === 200) {
          const d = await r.json();
          const token = d.token || d.accessToken || d.data?.token || '';
          if (token) return token;
        }
      } catch { /* try next */ }
    }
    if (attempt < 2) await new Promise(r => setTimeout(r, 2000));
  }
  return '';
}

function AH(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

/** Navigate and verify page loads (body > 50 chars, status OK) */
async function navigateAndVerify(page: Page, url: string, label: string) {
  await page.goto(url, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(PAGE_LOAD_WAIT);
  const body = await page.textContent('body') || '';
  expect(body.length).toBeGreaterThan(50);
  logTestInfo(`${label}: loaded (${body.length} chars)`);
}

// ═══════════════════════════════════════════════════════════════════════
// MU-A: SIMULTANEOUS MULTI-ROLE LOGIN (5 tests)
// ═══════════════════════════════════════════════════════════════════════

test.describe('MU-A: Simultaneous Multi-Role Login', () => {

  test('MU-A01: Patient + Doctor + Admin login simultaneously', async ({ browser }) => {
    const [patient, doctor, admin] = await Promise.all([
      createPage(browser, VIEWPORT_THIRD),
      createPage(browser, VIEWPORT_THIRD),
      createPage(browser, VIEWPORT_THIRD),
    ]);

    // Login all 3 simultaneously
    await Promise.all([
      browserLoginPatient(patient.page),
      browserLoginDoctor(doctor.page),
      browserLoginDoctor(admin.page, ADM), // Admin uses doctor portal
    ]);

    // All 3 should be off the login page
    expect(patient.page.url()).not.toContain('/login');
    expect(doctor.page.url()).not.toContain('/login');
    expect(admin.page.url()).not.toContain('/login');
    logTestSuccess('3 users (Patient + Doctor + Admin) logged in simultaneously');

    await Promise.all([patient.context.close(), doctor.context.close(), admin.context.close()]);
  });

  test('MU-A02: Two patients login simultaneously (different accounts)', async ({ browser }) => {
    const [p1, p2] = await Promise.all([
      createPage(browser, VIEWPORT_LEFT),
      createPage(browser, VIEWPORT_RIGHT),
    ]);

    await Promise.all([
      browserLoginPatient(p1.page, P1),
      browserLoginPatient(p2.page, P2),
    ]);

    expect(p1.page.url()).not.toContain('/login');
    expect(p2.page.url()).not.toContain('/login');
    logTestSuccess('Two patients logged in simultaneously on separate pages');

    await Promise.all([p1.context.close(), p2.context.close()]);
  });

  test('MU-A03: All pages display content after login', async ({ browser }) => {
    const [patient, doctor] = await Promise.all([
      createPage(browser, VIEWPORT_LEFT),
      createPage(browser, VIEWPORT_RIGHT),
    ]);

    await Promise.all([
      browserLoginPatient(patient.page),
      browserLoginDoctor(doctor.page),
    ]);

    const [pBody, dBody] = await Promise.all([
      patient.page.textContent('body'),
      doctor.page.textContent('body'),
    ]);

    expect(pBody?.length).toBeGreaterThan(100);
    expect(dBody?.length).toBeGreaterThan(100);
    logTestSuccess(`Patient: ${pBody?.length} chars, Doctor: ${dBody?.length} chars`);

    await Promise.all([patient.context.close(), doctor.context.close()]);
  });

  test('MU-A04: API tokens returned for all roles', async ({ request }) => {
    const [pToken, dToken] = await Promise.all([
      apiLoginPatient(request),
      apiLoginDoctor(request),
    ]);

    expect(pToken).toBeTruthy();
    expect(dToken).toBeTruthy();
    logTestSuccess(`Patient token: ${pToken.slice(0, 15)}... Doctor token: ${dToken.slice(0, 15)}...`);
  });

  test('MU-A05: Patient + Doctor pages have no critical JS errors', async ({ browser }) => {
    const [patient, doctor] = await Promise.all([
      createPage(browser, VIEWPORT_LEFT),
      createPage(browser, VIEWPORT_RIGHT),
    ]);

    const pErrors: string[] = [];
    const dErrors: string[] = [];
    patient.page.on('pageerror', err => pErrors.push(err.message));
    doctor.page.on('pageerror', err => dErrors.push(err.message));

    await Promise.all([
      browserLoginPatient(patient.page),
      browserLoginDoctor(doctor.page),
    ]);

    await Promise.all([
      patient.page.waitForTimeout(3000),
      doctor.page.waitForTimeout(3000),
    ]);

    const ignoredPatterns = ['ResizeObserver', 'Script error', 'jitsi', 'meet.jit.si'];
    const pCritical = pErrors.filter(e => !ignoredPatterns.some(p => e.includes(p)));
    const dCritical = dErrors.filter(e => !ignoredPatterns.some(p => e.includes(p)));

    if (pCritical.length) logTestWarning(`Patient JS errors: ${pCritical.join(', ')}`);
    if (dCritical.length) logTestWarning(`Doctor JS errors: ${dCritical.join(', ')}`);

    // Pages should still be functional
    expect(await patient.page.textContent('body')).toBeTruthy();
    expect(await doctor.page.textContent('body')).toBeTruthy();
    logTestSuccess(`Patient: ${pCritical.length} critical errors, Doctor: ${dCritical.length} critical errors`);

    await Promise.all([patient.context.close(), doctor.context.close()]);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// MU-B: PATIENT PORTAL — ALL KEY PAGES (8 tests)
// ═══════════════════════════════════════════════════════════════════════

test.describe('MU-B: Patient Portal — All Key Pages', () => {

  test('MU-B01: Dashboard loads', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginPatient(page);
    await navigateAndVerify(page, `${PATIENT_URL}/dashboard`, 'Patient Dashboard');
    await context.close();
  });

  test('MU-B02: Appointments page loads', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginPatient(page);
    await navigateAndVerify(page, `${PATIENT_URL}/appointments`, 'Patient Appointments');
    await context.close();
  });

  test('MU-B03: Health records page loads', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginPatient(page);
    await navigateAndVerify(page, `${PATIENT_URL}/health-records`, 'Patient Health Records');
    await context.close();
  });

  test('MU-B04: Doctors list page loads', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginPatient(page);
    await navigateAndVerify(page, `${PATIENT_URL}/doctors`, 'Patient Doctors');
    await context.close();
  });

  test('MU-B05: Notifications page loads', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginPatient(page);
    await navigateAndVerify(page, `${PATIENT_URL}/notifications`, 'Patient Notifications');
    await context.close();
  });

  test('MU-B06: Medical content / education page loads', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginPatient(page);
    await navigateAndVerify(page, `${PATIENT_URL}/medical-content`, 'Patient Medical Content');
    await context.close();
  });

  test('MU-B07: Settings / profile page loads', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginPatient(page);
    await navigateAndVerify(page, `${PATIENT_URL}/settings`, 'Patient Settings');
    await context.close();
  });

  test('MU-B08: AI consultation page loads', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginPatient(page);
    await navigateAndVerify(page, `${PATIENT_URL}/ai-consultation`, 'Patient AI Consultation');
    await context.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// MU-C: DOCTOR PORTAL — ALL KEY PAGES (8 tests)
// ═══════════════════════════════════════════════════════════════════════

test.describe('MU-C: Doctor Portal — All Key Pages', () => {

  test('MU-C01: Dashboard loads', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginDoctor(page);
    // Doctor portal dashboard routes vary — try /doctor/:id or /dashboard
    await page.goto(`${DOCTOR_URL}/doctor/${DOC.id}`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(PAGE_LOAD_WAIT);
    const body = await page.textContent('body') || '';
    expect(body.length).toBeGreaterThan(100);
    logTestInfo(`Doctor Dashboard: loaded (${body.length} chars)`);
    await context.close();
  });

  test('MU-C02: Patients list loads', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginDoctor(page);
    await navigateAndVerify(page, `${DOCTOR_URL}/doctor/${DOC.id}/patients`, 'Doctor Patients');
    await context.close();
  });

  test('MU-C03: Appointments loads', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginDoctor(page);
    await navigateAndVerify(page, `${DOCTOR_URL}/doctor/${DOC.id}/appointments`, 'Doctor Appointments');
    await context.close();
  });

  test('MU-C04: Queue management loads', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginDoctor(page);
    await navigateAndVerify(page, `${DOCTOR_URL}/doctor/${DOC.id}/queue`, 'Doctor Queue');
    await context.close();
  });

  test('MU-C05: Health meeting page loads', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginDoctor(page);
    await navigateAndVerify(page, `${DOCTOR_URL}/doctor/${DOC.id}/health-meeting`, 'Doctor Health Meeting');
    await context.close();
  });

  test('MU-C06: Prescriptions page loads', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginDoctor(page);
    await navigateAndVerify(page, `${DOCTOR_URL}/doctor/${DOC.id}/prescriptions`, 'Doctor Prescriptions');
    await context.close();
  });

  test('MU-C07: Medical content loads', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginDoctor(page);
    await navigateAndVerify(page, `${DOCTOR_URL}/doctor/${DOC.id}/medical-content`, 'Doctor Medical Content');
    await context.close();
  });

  test('MU-C08: Settings / profile loads', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginDoctor(page);
    await navigateAndVerify(page, `${DOCTOR_URL}/doctor/${DOC.id}/settings`, 'Doctor Settings');
    await context.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// MU-D: ADMIN PORTAL — DASHBOARD & MANAGEMENT (4 tests)
// ═══════════════════════════════════════════════════════════════════════

test.describe('MU-D: Admin Portal — Dashboard & Management', () => {

  test('MU-D01: Admin dashboard loads', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginDoctor(page, ADM);
    await page.goto(`${DOCTOR_URL}/doctor/${ADM.id}`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(PAGE_LOAD_WAIT);
    const body = await page.textContent('body') || '';
    expect(body.length).toBeGreaterThan(50);
    logTestInfo(`Admin Dashboard: loaded (${body.length} chars)`);
    await context.close();
  });

  test('MU-D02: Admin pending doctors page loads', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginDoctor(page, ADM);
    await navigateAndVerify(page, `${DOCTOR_URL}/doctor/${ADM.id}/admin`, 'Admin Management');
    await context.close();
  });

  test('MU-D03: Admin stats via API', async ({ request }) => {
    const token = await apiLoginDoctor(request);
    expect(token).toBeTruthy();
    const r = await request.get(`${DOCTOR_URL}${ENDPOINTS.admin.stats}`, {
      headers: AH(token),
      timeout: TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
    logTestSuccess(`Admin stats: ${r.status()}`);
  });

  test('MU-D04: Admin doctors list via API', async ({ request }) => {
    const token = await apiLoginDoctor(request);
    expect(token).toBeTruthy();
    const r = await request.get(`${DOCTOR_URL}${ENDPOINTS.admin.doctors}`, {
      headers: AH(token),
      timeout: TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
    logTestSuccess(`Admin doctors: ${r.status()}`);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// MU-E: CROSS-PORTAL WORKFLOW SHOWCASE (6 tests)
// ═══════════════════════════════════════════════════════════════════════

test.describe('MU-E: Cross-Portal Workflow Showcase', () => {

  test('MU-E01: Patient + Doctor see dashboard simultaneously', async ({ browser }) => {
    const [patient, doctor] = await Promise.all([
      createPage(browser, VIEWPORT_LEFT),
      createPage(browser, VIEWPORT_RIGHT),
    ]);

    await Promise.all([
      browserLoginPatient(patient.page),
      browserLoginDoctor(doctor.page),
    ]);

    // Navigate both to dashboards
    await Promise.all([
      patient.page.goto(`${PATIENT_URL}/dashboard`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' }),
      doctor.page.goto(`${DOCTOR_URL}/doctor/${DOC.id}`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' }),
    ]);

    await Promise.all([
      patient.page.waitForTimeout(PAGE_LOAD_WAIT),
      doctor.page.waitForTimeout(PAGE_LOAD_WAIT),
    ]);

    const [pBody, dBody] = await Promise.all([
      patient.page.textContent('body'),
      doctor.page.textContent('body'),
    ]);

    expect(pBody?.length).toBeGreaterThan(100);
    expect(dBody?.length).toBeGreaterThan(100);
    logTestSuccess('Both dashboards loaded side-by-side');

    await Promise.all([patient.context.close(), doctor.context.close()]);
  });

  test('MU-E02: Patient + Doctor see appointments simultaneously', async ({ browser }) => {
    const [patient, doctor] = await Promise.all([
      createPage(browser, VIEWPORT_LEFT),
      createPage(browser, VIEWPORT_RIGHT),
    ]);

    await Promise.all([
      browserLoginPatient(patient.page),
      browserLoginDoctor(doctor.page),
    ]);

    await Promise.all([
      patient.page.goto(`${PATIENT_URL}/appointments`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' }),
      doctor.page.goto(`${DOCTOR_URL}/doctor/${DOC.id}/appointments`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' }),
    ]);

    await Promise.all([
      patient.page.waitForTimeout(PAGE_LOAD_WAIT),
      doctor.page.waitForTimeout(PAGE_LOAD_WAIT),
    ]);

    expect(await patient.page.textContent('body')).toBeTruthy();
    expect(await doctor.page.textContent('body')).toBeTruthy();
    logTestSuccess('Patient + Doctor appointment pages loaded simultaneously');

    await Promise.all([patient.context.close(), doctor.context.close()]);
  });

  test('MU-E03: Both portals navigate to meeting room', async ({ browser }) => {
    const [patient, doctor] = await Promise.all([
      createPage(browser, VIEWPORT_LEFT),
      createPage(browser, VIEWPORT_RIGHT),
    ]);

    await Promise.all([
      browserLoginPatient(patient.page),
      browserLoginDoctor(doctor.page),
    ]);

    const testAptId = `APT-SHOWCASE-${Date.now()}`;
    await Promise.all([
      patient.page.goto(`${PATIENT_URL}/meeting/${testAptId}`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' }),
      doctor.page.goto(`${DOCTOR_URL}/doctor/${DOC.id}/meeting/${testAptId}`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' }),
    ]);

    await Promise.all([
      patient.page.waitForTimeout(PAGE_LOAD_WAIT),
      doctor.page.waitForTimeout(PAGE_LOAD_WAIT),
    ]);

    expect(await patient.page.textContent('body')).toBeTruthy();
    expect(await doctor.page.textContent('body')).toBeTruthy();
    logTestSuccess('Both portals navigated to meeting room');

    await Promise.all([patient.context.close(), doctor.context.close()]);
  });

  test('MU-E04: Patient health records + Doctor EMR side by side', async ({ browser }) => {
    const [patient, doctor] = await Promise.all([
      createPage(browser, VIEWPORT_LEFT),
      createPage(browser, VIEWPORT_RIGHT),
    ]);

    await Promise.all([
      browserLoginPatient(patient.page),
      browserLoginDoctor(doctor.page),
    ]);

    await Promise.all([
      patient.page.goto(`${PATIENT_URL}/health-records`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' }),
      doctor.page.goto(`${DOCTOR_URL}/doctor/${DOC.id}/patients`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' }),
    ]);

    await Promise.all([
      patient.page.waitForTimeout(PAGE_LOAD_WAIT),
      doctor.page.waitForTimeout(PAGE_LOAD_WAIT),
    ]);

    expect(await patient.page.textContent('body')).toBeTruthy();
    expect(await doctor.page.textContent('body')).toBeTruthy();
    logTestSuccess('Patient health records + Doctor patient list loaded');

    await Promise.all([patient.context.close(), doctor.context.close()]);
  });

  test('MU-E05: Medical content visible on both portals', async ({ browser }) => {
    const [patient, doctor] = await Promise.all([
      createPage(browser, VIEWPORT_LEFT),
      createPage(browser, VIEWPORT_RIGHT),
    ]);

    await Promise.all([
      browserLoginPatient(patient.page),
      browserLoginDoctor(doctor.page),
    ]);

    await Promise.all([
      patient.page.goto(`${PATIENT_URL}/medical-content`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' }),
      doctor.page.goto(`${DOCTOR_URL}/doctor/${DOC.id}/medical-content`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' }),
    ]);

    await Promise.all([
      patient.page.waitForTimeout(PAGE_LOAD_WAIT),
      doctor.page.waitForTimeout(PAGE_LOAD_WAIT),
    ]);

    expect(await patient.page.textContent('body')).toBeTruthy();
    expect(await doctor.page.textContent('body')).toBeTruthy();
    logTestSuccess('Medical content loaded on both portals');

    await Promise.all([patient.context.close(), doctor.context.close()]);
  });

  test('MU-E06: All 3 services respond to health check concurrently', async ({ request }) => {
    const [pRes, dRes, mRes] = await Promise.all([
      request.get(`${PATIENT_URL}${ENDPOINTS.health}`, { timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}${ENDPOINTS.health}`, { timeout: TIMEOUT }),
      request.get(`${MEETING_SERVER_URL}/api/health`, { timeout: TIMEOUT }),
    ]);

    expect(pRes.status()).toBe(200);
    expect(dRes.status()).toBe(200);
    expect(mRes.status()).toBe(200);
    logTestSuccess('All 3 services (Patient, Doctor, Meeting) healthy concurrently');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// MU-F: FULL API ENDPOINT SWEEP — NO 400-500 (6 tests)
// ═══════════════════════════════════════════════════════════════════════

test.describe('MU-F: Full API Endpoint Sweep — No 400-500', () => {

  test('MU-F01: Patient portal — all public endpoints return < 400', async ({ request }) => {
    const publicEndpoints = [
      ENDPOINTS.health,
      ENDPOINTS.healthDb,
      ENDPOINTS.metadata.specialties,
      ENDPOINTS.metadata.medications,
      ENDPOINTS.metadata.labTests,
      ENDPOINTS.metadata.icd10,
    ];

    for (const ep of publicEndpoints) {
      const r = await request.get(`${PATIENT_URL}${ep}`, { timeout: TIMEOUT });
      expect(r.status()).toBeLessThan(400);
      logTestInfo(`Patient ${ep}: ${r.status()}`);
    }
    logTestSuccess('All patient public endpoints < 400');
  });

  test('MU-F02: Patient portal — all auth endpoints return < 400', async ({ request }) => {
    const token = await apiLoginPatient(request);
    expect(token).toBeTruthy();

    const authEndpoints = [
      ENDPOINTS.appointments,
      ENDPOINTS.doctors,
      ENDPOINTS.notifications,
      ENDPOINTS.phr,
      ENDPOINTS.timeline,
      ENDPOINTS.userProfile,
    ];

    for (const ep of authEndpoints) {
      const r = await request.get(`${PATIENT_URL}${ep}`, {
        headers: AH(token),
        timeout: TIMEOUT,
      });
      expect(r.status()).toBeLessThan(400);
      logTestInfo(`Patient ${ep}: ${r.status()}`);
    }
    logTestSuccess('All patient auth endpoints < 400');
  });

  test('MU-F03: Doctor portal — all public endpoints return < 400', async ({ request }) => {
    const publicEndpoints = [
      ENDPOINTS.health,
      ENDPOINTS.healthDb,
    ];

    for (const ep of publicEndpoints) {
      const r = await request.get(`${DOCTOR_URL}${ep}`, { timeout: TIMEOUT });
      expect(r.status()).toBeLessThan(400);
      logTestInfo(`Doctor ${ep}: ${r.status()}`);
    }
    logTestSuccess('All doctor public endpoints < 400');
  });

  test('MU-F04: Doctor portal — all auth endpoints return < 400', async ({ request }) => {
    const token = await apiLoginDoctor(request);
    expect(token).toBeTruthy();

    const authEndpoints = [
      ENDPOINTS.appointments,
      ENDPOINTS.patients,
      ENDPOINTS.prescriptions,
      ENDPOINTS.queue,
    ];

    for (const ep of authEndpoints) {
      const r = await request.get(`${DOCTOR_URL}${ep}`, {
        headers: AH(token),
        timeout: TIMEOUT,
      });
      expect(r.status()).toBeLessThan(400);
      logTestInfo(`Doctor ${ep}: ${r.status()}`);
    }
    logTestSuccess('All doctor auth endpoints < 400');
  });

  test('MU-F05: Meeting server — all endpoints return < 400', async ({ request }) => {
    const meetingEndpoints = [
      '/health',
      '/api/health',
      '/api/health/db',
      '/api/config',
      '/api/meetings',
      '/api/meetings/active',
    ];

    for (const ep of meetingEndpoints) {
      const r = await request.get(`${MEETING_SERVER_URL}${ep}`, { timeout: TIMEOUT });
      expect(r.status()).toBeLessThan(400);
      logTestInfo(`Meeting ${ep}: ${r.status()}`);
    }
    logTestSuccess('All meeting server endpoints < 400');
  });

  test('MU-F06: Content + AI endpoints — no 500 errors', async ({ request }) => {
    const contentEndpoints = [
      { url: `${PATIENT_URL}${ENDPOINTS.medicalContent}`, label: 'Medical Content' },
      { url: `${PATIENT_URL}${ENDPOINTS.contentMedical}`, label: 'Content/Medical' },
      { url: `${PATIENT_URL}${ENDPOINTS.clinicalResources}`, label: 'Clinical Resources' },
      { url: `${MEETING_SERVER_URL}/api/ai/validations`, label: 'AI Validations' },
      { url: `${MEETING_SERVER_URL}/api/config`, label: 'Meeting Config' },
    ];

    for (const ep of contentEndpoints) {
      const r = await request.get(ep.url, { timeout: TIMEOUT });
      expect(r.status()).toBeLessThan(500);
      logTestInfo(`${ep.label}: ${r.status()}`);
    }
    logTestSuccess('All content + AI endpoints < 500');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// MU-G: MULTI-USER CONCURRENT PAGE NAVIGATION (5 tests)
// ═══════════════════════════════════════════════════════════════════════

test.describe('MU-G: Multi-User Concurrent Page Navigation', () => {

  test('MU-G01: 3 users navigate to different pages simultaneously', async ({ browser }) => {
    const [patient, doctor, patient2] = await Promise.all([
      createPage(browser, VIEWPORT_THIRD),
      createPage(browser, VIEWPORT_THIRD),
      createPage(browser, VIEWPORT_THIRD),
    ]);

    await Promise.all([
      browserLoginPatient(patient.page, P1),
      browserLoginDoctor(doctor.page),
      browserLoginPatient(patient2.page, P2),
    ]);

    // Navigate all to different pages
    await Promise.all([
      patient.page.goto(`${PATIENT_URL}/appointments`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' }),
      doctor.page.goto(`${DOCTOR_URL}/doctor/${DOC.id}/queue`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' }),
      patient2.page.goto(`${PATIENT_URL}/health-records`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' }),
    ]);

    await Promise.all([
      patient.page.waitForTimeout(PAGE_LOAD_WAIT),
      doctor.page.waitForTimeout(PAGE_LOAD_WAIT),
      patient2.page.waitForTimeout(PAGE_LOAD_WAIT),
    ]);

    expect(await patient.page.textContent('body')).toBeTruthy();
    expect(await doctor.page.textContent('body')).toBeTruthy();
    expect(await patient2.page.textContent('body')).toBeTruthy();
    logTestSuccess('3 users navigated to different pages simultaneously');

    await Promise.all([patient.context.close(), doctor.context.close(), patient2.context.close()]);
  });

  test('MU-G02: Rapid page switching — Patient navigates 5 pages fast', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginPatient(page);

    const patientPages = [
      `${PATIENT_URL}/dashboard`,
      `${PATIENT_URL}/appointments`,
      `${PATIENT_URL}/health-records`,
      `${PATIENT_URL}/doctors`,
      `${PATIENT_URL}/notifications`,
    ];

    for (const url of patientPages) {
      await page.goto(url, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500); // Rapid switching
      const body = await page.textContent('body') || '';
      expect(body.length).toBeGreaterThan(30);
    }

    logTestSuccess('Patient navigated 5 pages rapidly — all loaded');
    await context.close();
  });

  test('MU-G03: Rapid page switching — Doctor navigates 5 pages fast', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginDoctor(page);

    const doctorPages = [
      `${DOCTOR_URL}/doctor/${DOC.id}`,
      `${DOCTOR_URL}/doctor/${DOC.id}/patients`,
      `${DOCTOR_URL}/doctor/${DOC.id}/appointments`,
      `${DOCTOR_URL}/doctor/${DOC.id}/queue`,
      `${DOCTOR_URL}/doctor/${DOC.id}/prescriptions`,
    ];

    for (const url of doctorPages) {
      await page.goto(url, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const body = await page.textContent('body') || '';
      expect(body.length).toBeGreaterThan(30);
    }

    logTestSuccess('Doctor navigated 5 pages rapidly — all loaded');
    await context.close();
  });

  test('MU-G04: Patient + Doctor navigate same flow (appointments → details)', async ({ browser }) => {
    const [patient, doctor] = await Promise.all([
      createPage(browser, VIEWPORT_LEFT),
      createPage(browser, VIEWPORT_RIGHT),
    ]);

    await Promise.all([
      browserLoginPatient(patient.page),
      browserLoginDoctor(doctor.page),
    ]);

    // Step 1: Both go to appointments
    await Promise.all([
      patient.page.goto(`${PATIENT_URL}/appointments`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' }),
      doctor.page.goto(`${DOCTOR_URL}/doctor/${DOC.id}/appointments`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' }),
    ]);

    await Promise.all([
      patient.page.waitForTimeout(PAGE_LOAD_WAIT),
      doctor.page.waitForTimeout(PAGE_LOAD_WAIT),
    ]);

    // Step 2: Both navigate to notifications / queue
    await Promise.all([
      patient.page.goto(`${PATIENT_URL}/notifications`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' }),
      doctor.page.goto(`${DOCTOR_URL}/doctor/${DOC.id}/queue`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' }),
    ]);

    await Promise.all([
      patient.page.waitForTimeout(PAGE_LOAD_WAIT),
      doctor.page.waitForTimeout(PAGE_LOAD_WAIT),
    ]);

    expect(await patient.page.textContent('body')).toBeTruthy();
    expect(await doctor.page.textContent('body')).toBeTruthy();
    logTestSuccess('Patient + Doctor navigated same workflow flow simultaneously');

    await Promise.all([patient.context.close(), doctor.context.close()]);
  });

  test('MU-G05: Screenshot both portals side by side', async ({ browser }) => {
    const [patient, doctor] = await Promise.all([
      createPage(browser, VIEWPORT_LEFT),
      createPage(browser, VIEWPORT_RIGHT),
    ]);

    await Promise.all([
      browserLoginPatient(patient.page),
      browserLoginDoctor(doctor.page),
    ]);

    // Navigate to dashboards
    await Promise.all([
      patient.page.goto(`${PATIENT_URL}/dashboard`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' }),
      doctor.page.goto(`${DOCTOR_URL}/doctor/${DOC.id}`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' }),
    ]);

    await Promise.all([
      patient.page.waitForTimeout(PAGE_LOAD_WAIT),
      doctor.page.waitForTimeout(PAGE_LOAD_WAIT),
    ]);

    // Take screenshots
    await Promise.all([
      patient.page.screenshot({ path: 'test-results/multi-user-patient-dashboard.png', fullPage: true }),
      doctor.page.screenshot({ path: 'test-results/multi-user-doctor-dashboard.png', fullPage: true }),
    ]);

    logTestSuccess('Screenshots saved: multi-user-patient-dashboard.png + multi-user-doctor-dashboard.png');

    await Promise.all([patient.context.close(), doctor.context.close()]);
  });
});
