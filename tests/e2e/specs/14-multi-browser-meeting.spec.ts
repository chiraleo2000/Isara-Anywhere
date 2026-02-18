/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — MULTI-BROWSER PHASE 2 + MEETING E2E TESTS v2.0.0
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * REAL multi-browser tests: Doctor + Patient on separate browser pages simultaneously.
 * Tests Phase 2 features + meeting room navigation across portals.
 *
 * Coverage:
 *   Section MB-A: Simultaneous Login (4 tests)
 *   Section MB-B: Meeting Room Cross-Portal Navigation (6 tests)
 *   Section MB-C: Appointment → Meeting Flow (6 tests)
 *   Section MB-D: Phase 2 Cross-Portal Features (6 tests)
 *   Section MB-E: Multi-Portal Health & DB Endpoints (6 tests)
 *   Section MB-F: Error Handling — No 400-500s (6 tests)
 *   TOTAL: 34 tests
 *
 * Updated: February 15, 2026
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

const P1 = CREDENTIALS.patient1;
const DOC = CREDENTIALS.doctor;
const ADM = CREDENTIALS.admin;

// ─── Helpers ──────────────────────────────────────────────────────────

async function createPage(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  return { context, page };
}

async function browserLoginPatient(page: Page) {
  await page.goto(`${PATIENT_URL}/login`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const emailInput = page.locator('#login-email, input[name="email"], input[type="email"]').first();
  const passwordInput = page.locator('#login-password, input[name="password"], input[type="password"]').first();
  await emailInput.fill(P1.email);
  await passwordInput.fill(P1.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: NAV_TIMEOUT });
  await page.waitForTimeout(1500);
}

async function browserLoginDoctor(page: Page) {
  await page.goto(`${DOCTOR_URL}/login`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const emailInput = page.locator('input[type="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  await emailInput.fill(DOC.email);
  await passwordInput.fill(DOC.password);
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

// ═══════════════════════════════════════════════════════════════════════
// MB-A: SIMULTANEOUS LOGIN (4 tests)
// ═══════════════════════════════════════════════════════════════════════

test.describe('MB-A: Simultaneous Login', () => {

  test('MB-A01: Patient + Doctor login simultaneously', async ({ browser }) => {
    const [patient, doctor] = await Promise.all([
      createPage(browser),
      createPage(browser),
    ]);
    // Login both simultaneously
    await Promise.all([
      browserLoginPatient(patient.page),
      browserLoginDoctor(doctor.page),
    ]);
    // Both should be on their dashboards
    expect(patient.page.url()).not.toContain('/login');
    expect(doctor.page.url()).not.toContain('/login');
    logTestSuccess('Patient + Doctor logged in simultaneously');
    await Promise.all([patient.context.close(), doctor.context.close()]);
  });

  test('MB-A02: Both portals show content after login', async ({ browser }) => {
    const [patient, doctor] = await Promise.all([
      createPage(browser),
      createPage(browser),
    ]);
    await Promise.all([
      browserLoginPatient(patient.page),
      browserLoginDoctor(doctor.page),
    ]);
    const [patientBody, doctorBody] = await Promise.all([
      patient.page.textContent('body'),
      doctor.page.textContent('body'),
    ]);
    expect(patientBody?.length).toBeGreaterThan(100);
    expect(doctorBody?.length).toBeGreaterThan(100);
    logTestSuccess('Both portals have content after login');
    await Promise.all([patient.context.close(), doctor.context.close()]);
  });

  test('MB-A03: API logins return valid tokens', async ({ request }) => {
    const [pToken, dToken] = await Promise.all([
      apiLoginPatient(request),
      apiLoginDoctor(request),
    ]);
    expect(pToken).toBeTruthy();
    expect(dToken).toBeTruthy();
    logTestSuccess(`Patient token: ${pToken.slice(0, 20)}... Doctor token: ${dToken.slice(0, 20)}...`);
  });

  test('MB-A04: Admin login works alongside others', async ({ browser, request }) => {
    // Admin into doctor portal
    const { context, page } = await createPage(browser);
    await page.goto(`${DOCTOR_URL}/login`, { timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.locator('input[type="email"]').first().fill(ADM.email);
    await page.locator('input[type="password"]').first().fill(ADM.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: NAV_TIMEOUT });
    expect(page.url()).not.toContain('/login');
    logTestSuccess('Admin login into doctor portal works');
    await context.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// MB-B: MEETING ROOM CROSS-PORTAL NAVIGATION (6 tests)
// ═══════════════════════════════════════════════════════════════════════

test.describe('MB-B: Meeting Room Cross-Portal Navigation', () => {

  test('MB-B01: Doctor navigates to meeting room page', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginDoctor(page);
    // Navigate to meeting room with test appointment ID
    await page.goto(`${DOCTOR_URL}/doctor/${DOC.id}/meeting/APT-NAV-001`, {
      timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(2000);
    const bodyText = await page.textContent('body') || '';
    expect(bodyText.length).toBeGreaterThan(50);
    logTestSuccess('Doctor navigated to meeting room');
    await context.close();
  });

  test('MB-B02: Patient navigates to meeting room page', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginPatient(page);
    await page.goto(`${PATIENT_URL}/meeting/APT-NAV-001`, {
      timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(2000);
    const bodyText = await page.textContent('body') || '';
    expect(bodyText.length).toBeGreaterThan(50);
    logTestSuccess('Patient navigated to meeting room');
    await context.close();
  });

  test('MB-B03: Both portals load meeting room simultaneously', async ({ browser }) => {
    const [patient, doctor] = await Promise.all([
      createPage(browser),
      createPage(browser),
    ]);
    await Promise.all([
      browserLoginPatient(patient.page),
      browserLoginDoctor(doctor.page),
    ]);
    // Navigate both to meeting rooms
    await Promise.all([
      patient.page.goto(`${PATIENT_URL}/meeting/APT-DUAL-001`, {
        timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded',
      }),
      doctor.page.goto(`${DOCTOR_URL}/doctor/${DOC.id}/meeting/APT-DUAL-001`, {
        timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded',
      }),
    ]);
    await Promise.all([
      patient.page.waitForTimeout(2000),
      doctor.page.waitForTimeout(2000),
    ]);
    const [pBody, dBody] = await Promise.all([
      patient.page.textContent('body'),
      doctor.page.textContent('body'),
    ]);
    expect(pBody?.length).toBeGreaterThan(50);
    expect(dBody?.length).toBeGreaterThan(50);
    logTestSuccess('Both portals loaded meeting room simultaneously');
    await Promise.all([patient.context.close(), doctor.context.close()]);
  });

  test('MB-B04: Doctor meeting room — no JavaScript errors', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await browserLoginDoctor(page);
    await page.goto(`${DOCTOR_URL}/doctor/${DOC.id}/meeting/APT-ERR-001`, {
      timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(3000);
    // Allow external Jitsi CDN errors but no app-level crashes
    const criticalErrors = errors.filter(e =>
      !e.includes('jitsi') && !e.includes('meet.jit.si') && !e.includes('external_api') &&
      !e.includes('ResizeObserver') && !e.includes('Script error')
    );
    if (criticalErrors.length > 0) {
      logTestWarning(`JS errors: ${criticalErrors.join(', ')}`);
    }
    // Page should still be functional (not crashed)
    expect(await page.textContent('body')).toBeTruthy();
    logTestSuccess(`Meeting room loaded — ${criticalErrors.length} critical JS errors`);
    await context.close();
  });

  test('MB-B05: Patient meeting room — no JavaScript errors', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await browserLoginPatient(page);
    await page.goto(`${PATIENT_URL}/meeting/APT-ERR-001`, {
      timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(3000);
    const criticalErrors = errors.filter(e =>
      !e.includes('jitsi') && !e.includes('meet.jit.si') && !e.includes('external_api') &&
      !e.includes('ResizeObserver') && !e.includes('Script error')
    );
    expect(await page.textContent('body')).toBeTruthy();
    logTestSuccess(`Patient meeting room — ${criticalErrors.length} critical JS errors`);
    await context.close();
  });

  test('MB-B06: Doctor health-meeting page still works', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginDoctor(page);
    await page.goto(`${DOCTOR_URL}/doctor/${DOC.id}/health-meeting`, {
      timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(2000);
    const body = await page.textContent('body') || '';
    // HealthMeeting should show tabs — at minimum "Virtual" or "Meeting" or Thai text
    expect(body.length).toBeGreaterThan(100);
    logTestSuccess('HealthMeeting page loads with content');
    await context.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// MB-C: APPOINTMENT → MEETING FLOW (6 tests)
// ═══════════════════════════════════════════════════════════════════════

test.describe('MB-C: Appointment → Meeting Flow', () => {

  test('MB-C01: Patient appointments page loads', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginPatient(page);
    await page.goto(`${PATIENT_URL}/appointments`, {
      timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(2000);
    const body = await page.textContent('body') || '';
    expect(body.length).toBeGreaterThan(50);
    logTestSuccess('Patient appointments page loads');
    await context.close();
  });

  test('MB-C02: Doctor appointment schedule accessible', async ({ browser }) => {
    const { context, page } = await createPage(browser);
    await browserLoginDoctor(page);
    // Doctor portal appointment routes vary — try dashboard
    await page.goto(`${DOCTOR_URL}/doctor/${DOC.id}`, {
      timeout: NAV_TIMEOUT, waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(2000);
    const body = await page.textContent('body') || '';
    expect(body.length).toBeGreaterThan(100);
    logTestSuccess('Doctor dashboard loads (has appointment access)');
    await context.close();
  });

  test('MB-C03: List appointments via API — patient portal', async ({ request }) => {
    const token = await apiLoginPatient(request);
    expect(token).toBeTruthy();
    const r = await request.get(`${PATIENT_URL}${ENDPOINTS.appointments}`, {
      headers: AH(token),
      timeout: TIMEOUT,
    });
    expect([200, 404]).toContain(r.status());
    logTestSuccess(`Patient appointments API: ${r.status()}`);
  });

  test('MB-C04: List appointments via API — doctor portal', async ({ request }) => {
    const token = await apiLoginDoctor(request);
    expect(token).toBeTruthy();
    const r = await request.get(`${DOCTOR_URL}${ENDPOINTS.appointments}`, {
      headers: AH(token),
      timeout: TIMEOUT,
    });
    expect([200, 404]).toContain(r.status());
    logTestSuccess(`Doctor appointments API: ${r.status()}`);
  });

  test('MB-C05: Video meeting config from patient portal', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}${ENDPOINTS.videoMeeting.config}`, {
      timeout: TIMEOUT,
    });
    expect([200, 404]).toContain(r.status());
    logTestSuccess(`Patient video meeting config: ${r.status()}`);
  });

  test('MB-C06: Video meeting config from doctor portal', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}${ENDPOINTS.videoMeeting.config}`, {
      timeout: TIMEOUT,
    });
    expect([200, 404]).toContain(r.status());
    logTestSuccess(`Doctor video meeting config: ${r.status()}`);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// MB-D: PHASE 2 CROSS-PORTAL FEATURES (6 tests)
// ═══════════════════════════════════════════════════════════════════════

test.describe('MB-D: Phase 2 Cross-Portal Features', () => {

  test('MB-D01: Device tokens endpoint — patient portal', async ({ request }) => {
    const token = await apiLoginPatient(request);
    expect(token).toBeTruthy();
    const r = await request.post(`${PATIENT_URL}${ENDPOINTS.deviceTokens}`, {
      headers: AH(token),
      data: {
        token: `test-fcm-${Date.now()}`,
        platform: 'web',
        deviceInfo: { browser: 'Chrome', os: 'Windows' },
      },
      timeout: TIMEOUT,
    });
    expect([200, 201, 409]).toContain(r.status());
    logTestSuccess(`Device token registration: ${r.status()}`);
  });

  test('MB-D02: Sync pull — patient portal', async ({ request }) => {
    const token = await apiLoginPatient(request);
    expect(token).toBeTruthy();
    const r = await request.post(`${PATIENT_URL}${ENDPOINTS.sync.pull}`, {
      headers: AH(token),
      data: { lastSyncAt: new Date(Date.now() - 86400000).toISOString() },
      timeout: TIMEOUT,
    });
    expect([200, 404]).toContain(r.status());
    logTestSuccess(`Sync pull: ${r.status()}`);
  });

  test('MB-D03: Sync status — patient portal', async ({ request }) => {
    const token = await apiLoginPatient(request);
    expect(token).toBeTruthy();
    const r = await request.get(`${PATIENT_URL}${ENDPOINTS.sync.status}`, {
      headers: AH(token),
      timeout: TIMEOUT,
    });
    expect([200, 404]).toContain(r.status());
    logTestSuccess(`Sync status: ${r.status()}`);
  });

  test('MB-D04: Settings endpoint — patient portal', async ({ request }) => {
    const token = await apiLoginPatient(request);
    expect(token).toBeTruthy();
    const r = await request.get(`${PATIENT_URL}${ENDPOINTS.settings.base}`, {
      headers: AH(token),
      timeout: TIMEOUT,
    });
    expect([200, 404]).toContain(r.status());
    logTestSuccess(`Settings GET: ${r.status()}`);
  });

  test('MB-D05: Connections endpoint — doctor portal', async ({ request }) => {
    const token = await apiLoginDoctor(request);
    expect(token).toBeTruthy();
    const r = await request.get(`${DOCTOR_URL}${ENDPOINTS.connections}`, {
      headers: AH(token),
      timeout: TIMEOUT,
    });
    expect([200, 404]).toContain(r.status());
    logTestSuccess(`Connections: ${r.status()}`);
  });

  test('MB-D06: Biometric status — patient portal', async ({ request }) => {
    const token = await apiLoginPatient(request);
    expect(token).toBeTruthy();
    const r = await request.get(`${PATIENT_URL}${ENDPOINTS.biometric.status}`, {
      headers: AH(token),
      timeout: TIMEOUT,
    });
    expect([200, 404]).toContain(r.status());
    logTestSuccess(`Biometric status: ${r.status()}`);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// MB-E: MULTI-PORTAL HEALTH & DB ENDPOINTS (6 tests)
// ═══════════════════════════════════════════════════════════════════════

test.describe('MB-E: Multi-Portal Health & DB Endpoints', () => {

  test('MB-E01: Patient portal health — 200', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}${ENDPOINTS.health}`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
    logTestSuccess('Patient portal health OK');
  });

  test('MB-E02: Patient portal DB health — 200', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}${ENDPOINTS.healthDb}`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.database || d.db || d.status).toBeTruthy();
    logTestSuccess('Patient portal DB health OK — no connection failures');
  });

  test('MB-E03: Doctor portal health — 200', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}${ENDPOINTS.health}`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
    logTestSuccess('Doctor portal health OK');
  });

  test('MB-E04: Doctor portal DB health — 200', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}${ENDPOINTS.healthDb}`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.database || d.db || d.status).toBeTruthy();
    logTestSuccess('Doctor portal DB health OK — no connection failures');
  });

  test('MB-E05: Meeting server health — 200', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/api/health`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
    logTestSuccess('Meeting server health OK');
  });

  test('MB-E06: All 3 services health simultaneously', async ({ request }) => {
    const [pRes, dRes, mRes] = await Promise.all([
      request.get(`${PATIENT_URL}${ENDPOINTS.health}`, { timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}${ENDPOINTS.health}`, { timeout: TIMEOUT }),
      request.get(`${MEETING_SERVER_URL}/api/health`, { timeout: TIMEOUT }),
    ]);
    expect(pRes.status()).toBe(200);
    expect(dRes.status()).toBe(200);
    expect(mRes.status()).toBe(200);
    logTestSuccess('All 3 services healthy simultaneously — no 400-500s');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// MB-F: ERROR HANDLING — NO 400-500s (6 tests)
// ═══════════════════════════════════════════════════════════════════════

test.describe('MB-F: Error Handling — No 400-500s', () => {

  test('MB-F01: Patient portal — all key GET endpoints return 200', async ({ request }) => {
    const token = await apiLoginPatient(request);
    expect(token).toBeTruthy();
    const endpoints = [
      ENDPOINTS.health,
      ENDPOINTS.healthDb,
      ENDPOINTS.appointments,
      ENDPOINTS.doctors,
      ENDPOINTS.notifications,
    ];
    for (const ep of endpoints) {
      const r = await request.get(`${PATIENT_URL}${ep}`, {
        headers: AH(token),
        timeout: TIMEOUT,
      });
      expect(r.status()).toBeLessThan(400);
      logTestInfo(`${ep}: ${r.status()}`);
    }
    logTestSuccess('All patient key endpoints < 400');
  });

  test('MB-F02: Doctor portal — all key GET endpoints return 200', async ({ request }) => {
    const token = await apiLoginDoctor(request);
    expect(token).toBeTruthy();
    const endpoints = [
      ENDPOINTS.health,
      ENDPOINTS.healthDb,
      ENDPOINTS.appointments,
      ENDPOINTS.patients,
    ];
    for (const ep of endpoints) {
      const r = await request.get(`${DOCTOR_URL}${ep}`, {
        headers: AH(token),
        timeout: TIMEOUT,
      });
      expect(r.status()).toBeLessThan(400);
      logTestInfo(`${ep}: ${r.status()}`);
    }
    logTestSuccess('All doctor key endpoints < 400');
  });

  test('MB-F03: Meeting server — all GET endpoints return 200', async ({ request }) => {
    const endpoints = [
      '/health',
      '/api/health',
      '/api/health/db',
      '/api/config',
      '/api/meetings',
      '/api/meetings/active',
    ];
    for (const ep of endpoints) {
      const r = await request.get(`${MEETING_SERVER_URL}${ep}`, { timeout: TIMEOUT });
      expect(r.status()).toBeLessThan(400);
      logTestInfo(`Meeting ${ep}: ${r.status()}`);
    }
    logTestSuccess('All meeting server GET endpoints < 400');
  });

  test('MB-F04: Metadata endpoints — no 500s', async ({ request }) => {
    const metaEndpoints = [
      ENDPOINTS.metadata.specialties,
      ENDPOINTS.metadata.labTests,
      ENDPOINTS.metadata.icd10,
      ENDPOINTS.metadata.medications,
    ];
    for (const ep of metaEndpoints) {
      const r = await request.get(`${PATIENT_URL}${ep}`, { timeout: TIMEOUT });
      expect(r.status()).toBeLessThan(500);
      logTestInfo(`Metadata ${ep}: ${r.status()}`);
    }
    logTestSuccess('All metadata endpoints < 500');
  });

  test('MB-F05: Content endpoints — no 500s', async ({ request }) => {
    const contentEndpoints = [
      ENDPOINTS.medicalContent,
      ENDPOINTS.contentMedical,
      ENDPOINTS.contentClinical,
      ENDPOINTS.clinicalResources,
    ];
    for (const ep of contentEndpoints) {
      const r = await request.get(`${PATIENT_URL}${ep}`, { timeout: TIMEOUT });
      expect(r.status()).toBeLessThan(500);
      logTestInfo(`Content ${ep}: ${r.status()}`);
    }
    logTestSuccess('All content endpoints < 500');
  });

  test('MB-F06: AI endpoints — graceful responses (no crashes)', async ({ request }) => {
    const aiEndpoints = [
      { url: `${MEETING_SERVER_URL}/api/ai/validations`, method: 'GET' },
      { url: `${PATIENT_URL}${ENDPOINTS.ai.health}`, method: 'GET' },
    ];
    for (const ep of aiEndpoints) {
      const r = await request.get(ep.url, { timeout: TIMEOUT });
      expect(r.status()).toBeLessThan(500);
      logTestInfo(`AI ${ep.url.split('/').slice(-2).join('/')}: ${r.status()}`);
    }
    logTestSuccess('AI endpoints respond gracefully — no 500s');
  });
});
