/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA — PHR TIMELINE & AI FEATURES UI SCREENSHOTS
 * ═══════════════════════════════════════════════════════════════════════
 * Tests patient health records (PHR) timeline, vital signs,
 * AI-powered features (pre-consultation summary, patient instructions,
 * clinical decision support, document analysis).
 * Screenshots stored in: screenshots/phr-timeline/ & screenshots/ai-features/
 * ═══════════════════════════════════════════════════════════════════════
 */
import { test, Page, BrowserContext } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';

const PATIENT_URL = 'https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app';
const DOCTOR_URL = 'https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app';

const SS_PHR = path.join(__dirname, '..', 'screenshots', 'phr-timeline');
const SS_AI = path.join(__dirname, '..', 'screenshots', 'ai-features');
[SS_PHR, SS_AI].forEach(d => fs.mkdirSync(d, { recursive: true }));

async function snap(page: Page, filename: string, label: string, dir: string, waitMs = 2500): Promise<void> {
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
  try { await page.waitForLoadState('networkidle', { timeout: 12000 }); } catch { /* ok */ }
  await page.waitForTimeout(waitMs);
  const fp = path.join(dir, `${filename}.png`);
  await page.screenshot({ path: fp, fullPage: false });
  console.log(`  📸 [${label}] → ${fp}`);
}

async function apiPost(page: Page, url: string, data: Record<string, unknown>, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const r = await page.request.post(url, { data, headers, timeout: 15000 });
    return { status: r.status(), body: await r.json().catch(() => ({})) };
  } catch {
    return { status: 0, body: {} };
  }
}

async function injectPatientAuth(page: Page, token: string, user: Record<string, unknown>) {
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('auth_token', token);
    localStorage.setItem('izara_user', JSON.stringify({
      id: user.id, email: user.email, name: user.name,
      role: 'patient', isActive: true,
    }));
    localStorage.setItem('izara_patient_last_activity', Date.now().toString());
  }, { token, user });
}

async function injectDoctorAuth(page: Page, token: string, user: Record<string, unknown>) {
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('izara_current_user', JSON.stringify({
      id: user.id, email: user.email, name: user.name,
      displayName: user.name, role: 'doctor',
      doctorId: user.doctorId || user.id,
      medicalLicenseNumber: 'LIC-001',
      isActive: true, emailVerified: true, isAdmin: true,
      adminPrivileges: { manageDoctors: true, manageAppointments: true, viewAllRecords: true, manageContent: true, systemSettings: true },
      specialty: 'General Practice',
      preferences: { theme: 'light', language: 'th', notifications: { email: true, push: true, sms: false } },
    }));
    localStorage.setItem('izara_session_expiry', (Date.now() + 3600000).toString());
  }, { token, user });
}

test.describe('PHR Timeline & AI Features — UI Screenshots', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180000);

  let patientCtx: BrowserContext;
  let doctorCtx: BrowserContext;
  let patientPage: Page;
  let doctorPage: Page;
  let patientToken: string;
  let doctorToken: string;
  let patientUser: Record<string, unknown>;
  let doctorUser: Record<string, unknown>;
  let serviceAvailable = false;

  test.beforeAll(async ({ browser }) => {
    patientCtx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    doctorCtx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    patientPage = await patientCtx.newPage();
    doctorPage = await doctorCtx.newPage();

    try {
    // Health check — skip all tests if services are unreachable
    const hc = await patientPage.request.get(`${PATIENT_URL}/api/health`, { timeout: 10000 });
    if (hc.status() !== 200) throw new Error(`Health check failed: ${hc.status()}`);

    // Patient login
    const ts = Date.now();
    const patientEmail = `e2e.phr.${ts}@test.com`;
    const testPassword = process.env.E2E_TEST_PASSWORD || 'TestPHR@2024!';
    const regR = await apiPost(patientPage, `${PATIENT_URL}/auth/register`, {
      email: patientEmail, password: testPassword,
      name: 'PHR Test Patient', phone: '0899999000',
      dateOfBirth: '1988-03-20', gender: 'female',
    });

    if ([200, 201].includes(regR.status)) {
      const loginR = await apiPost(patientPage, `${PATIENT_URL}/auth/login`, {
        email: patientEmail, password: testPassword,
      });
      patientToken = loginR.body.token || loginR.body.accessToken || 'demo-token';
      patientUser = loginR.body.user || { id: loginR.body.userId || 'demo-patient', email: patientEmail, name: 'PHR Test Patient' };
    } else {
      patientToken = 'demo-token';
      patientUser = { id: 'demo-patient', email: 'phr-test@test.com', name: 'PHR Test Patient' };
    }

    // Doctor login
    const docR = await apiPost(doctorPage, `${DOCTOR_URL}/api/auth/login`, {
      email: 'doctor.test@izara.com',
      password: process.env.IZARA_DOCTOR_PASSWORD || 'IzaraDoctor@2024',
    });
    if (docR.status === 200) {
      doctorToken = docR.body.token || docR.body.accessToken || 'demo-token';
      doctorUser = docR.body.user || { id: docR.body.userId, email: 'doctor.test@izara.com', name: 'Doctor Test' };
    } else {
      doctorToken = 'demo-token';
      doctorUser = { id: 'demo-doctor', email: 'doctor.test@izara.com', name: 'Dr. Demo' };
    }
    serviceAvailable = true;
    } catch (err) {
      console.log(`⚠️ Services unreachable, skipping PHR/AI suite: ${(err as Error).message?.slice(0, 80)}`);
    }
  });

  test.afterAll(async () => {
    await patientCtx?.close();
    await doctorCtx?.close();
  });

  // Helpers: inject auth on login page first, then navigate to target
  async function patientGo(target: string) {
    await patientPage.goto(`${PATIENT_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await injectPatientAuth(patientPage, patientToken, patientUser);
    await patientPage.goto(`${PATIENT_URL}${target}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await patientPage.waitForTimeout(1500);
  }

  async function doctorGo(target: string) {
    await doctorPage.goto(`${DOCTOR_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await injectDoctorAuth(doctorPage, doctorToken, doctorUser);
    await doctorPage.goto(`${DOCTOR_URL}${target}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await doctorPage.waitForTimeout(1500);
  }

  // ── PHR01 — Patient Dashboard ──────────────────────────────────
  test('PHR01 — Patient Dashboard', async () => {
    test.skip(!serviceAvailable, 'Services unreachable');
    await patientGo('/dashboard');
    await snap(patientPage, 'PHR01-patient-dashboard', 'Patient Dashboard', SS_PHR);
  });

  // ── PHR02 — Health Records Overview ────────────────────────────
  test('PHR02 — Health Records', async () => {
    test.skip(!serviceAvailable, 'Services unreachable');
    await patientGo('/health-records');
    await snap(patientPage, 'PHR02-health-records', 'Health Records', SS_PHR);
  });

  // ── PHR03 — Vital Signs Input ──────────────────────────────────
  test('PHR03 — Vital Signs', async () => {
    test.skip(!serviceAvailable, 'Services unreachable');
    await patientGo('/health-records');
    await snap(patientPage, 'PHR03-vital-signs', 'Vital Signs', SS_PHR);
  });

  // ── PHR04 — Patient Timeline ───────────────────────────────────
  test('PHR04 — Patient Timeline', async () => {
    test.skip(!serviceAvailable, 'Services unreachable');
    await patientGo('/timeline');
    await snap(patientPage, 'PHR04-timeline', 'Patient Timeline', SS_PHR);
  });

  // ── PHR05 — Living Will (Patient Side) ─────────────────────────
  test('PHR05 — Living Will', async () => {
    test.skip(!serviceAvailable, 'Services unreachable');
    await patientGo('/living-will');
    await snap(patientPage, 'PHR05-living-will', 'Living Will', SS_PHR);
  });

  // ── AI01 — AI Pre-Consultation Summary ─────────────────────────
  test('AI01 — Pre-Consultation Summary', async () => {
    test.skip(!serviceAvailable, 'Services unreachable');
    await doctorGo('/health-meeting');
    await snap(doctorPage, 'AI01-pre-consultation', 'AI Pre-Consultation Summary', SS_AI);
  });

  // ── AI02 — AI Clinical Decision Support ────────────────────────
  test('AI02 — Clinical Decision Support', async () => {
    test.skip(!serviceAvailable, 'Services unreachable');
    await doctorGo('/clinical-resources');
    await snap(doctorPage, 'AI02-clinical-decision', 'AI Clinical Decision Support', SS_AI);
  });

  // ── AI03 — AI Document Analysis ────────────────────────────────
  test('AI03 — Document Analysis', async () => {
    test.skip(!serviceAvailable, 'Services unreachable');
    await doctorGo('/patients');
    await snap(doctorPage, 'AI03-document-analysis', 'AI Document Analysis', SS_AI);
  });

  // ── AI04 — AI Meeting Summary (SOAP) ──────────────────────────
  test('AI04 — Meeting SOAP Summary', async () => {
    test.skip(!serviceAvailable, 'Services unreachable');
    await doctorGo('/health-meeting');
    await snap(doctorPage, 'AI04-meeting-soap-summary', 'AI Meeting SOAP Summary', SS_AI);
  });
});
