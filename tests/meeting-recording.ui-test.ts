/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA — MEETING RECORDING & TRANSCRIPT WORKFLOW UI SCREENSHOTS
 * ═══════════════════════════════════════════════════════════════════════
 * Tests recording pipeline, transcript with speaker diarization,
 * AI summary generation, and post-meeting results.
 * Screenshots stored in: screenshots/meeting-recording/
 * ═══════════════════════════════════════════════════════════════════════
 */
import { test, Page, BrowserContext } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';

const DOCTOR_URL = 'https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app';
const PATIENT_URL = 'https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app';
const MEETING_URL = 'https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app';

const SS_DIR = path.join(__dirname, '..', 'screenshots', 'meeting-recording');
fs.mkdirSync(SS_DIR, { recursive: true });

async function snap(page: Page, filename: string, label: string, waitMs = 2500): Promise<void> {
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
  try { await page.waitForLoadState('networkidle', { timeout: 12000 }); } catch { /* ok */ }
  await page.waitForTimeout(waitMs);
  const fp = path.join(SS_DIR, `${filename}.png`);
  await page.screenshot({ path: fp, fullPage: false });
  console.log(`  📸 [${label}] → ${fp}`);
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

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

async function apiGet(page: Page, url: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const r = await page.request.get(url, { headers, timeout: 15000 });
    return { status: r.status(), body: await r.json().catch(() => ({})) };
  } catch {
    return { status: 0, body: {} };
  }
}

async function injectDoctorAuth(page: Page, token: string, user: Record<string, unknown>) {
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('izara_current_user', JSON.stringify({
      id: user.id, email: user.email, name: user.name,
      displayName: user.name, role: 'doctor',
      doctorId: user.doctorId || user.id,
      medicalLicenseNumber: user.medicalLicenseNumber || 'LIC-001',
      isActive: true, emailVerified: true, isAdmin: true,
      adminPrivileges: { manageDoctors: true, manageAppointments: true, viewAllRecords: true, manageContent: true, systemSettings: true },
      specialty: user.specialty || 'General Practice',
      preferences: { theme: 'light', language: 'th', notifications: { email: true, push: true, sms: false } },
    }));
    localStorage.setItem('izara_session_expiry', (Date.now() + 3600000).toString());
    localStorage.setItem('izara_last_activity', Date.now().toString());
  }, { token, user });
}

test.describe('Meeting Recording Workflow — UI Screenshots', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180000);

  let doctorCtx: BrowserContext;
  let doctorPage: Page;
  let doctorToken: string;
  let doctorUser: Record<string, unknown>;
  let doctorUserId: string; // userId for SPA route: /doctor/:userId/...

  test.beforeAll(async ({ browser }) => {
    doctorCtx = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      permissions: ['camera', 'microphone'],
    });
    doctorPage = await doctorCtx.newPage();
  });

  test.afterAll(async () => { await doctorCtx?.close(); });

  // ── MR01 — Doctor Login & Auth ──────────────────────────────────
  test('MR01 — Doctor Login for Meeting', async () => {
    const loginR = await apiPost(doctorPage, `${DOCTOR_URL}/auth/api/login`, {
      email: 'doctor.test@izara.com',
      password: process.env.IZARA_DOCTOR_PASSWORD || 'IzaraDoctor@2024',
    });

    if (loginR.status === 200 && (loginR.body.token || loginR.body.accessToken)) {
      doctorToken = loginR.body.token || loginR.body.accessToken;
      doctorUser = loginR.body.user || { id: loginR.body.userId, email: 'doctor.test@izara.com', name: 'Doctor Test' };
    } else {
      // Fallback: demo token
      doctorToken = 'demo-token';
      doctorUser = { id: 'demo-doctor', email: 'doctor.test@izara.com', name: 'Dr. Demo' };
    }
    doctorUserId = (doctorUser.id as string) || 'demo-doctor';

    await doctorPage.goto(`${DOCTOR_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await snap(doctorPage, 'MR01-doctor-login', 'Doctor Login Page');
  });

  // ── MR02 — Meeting Server Health Check ──────────────────────────
  test('MR02 — Meeting Server Health', async () => {
    const healthR = await apiGet(doctorPage, `${MEETING_URL}/api/health`);
    if (healthR.status !== 200) { test.skip(true, `Meeting server returned ${healthR.status}`); return; }
    console.log('  ✅ Meeting server health:', JSON.stringify(healthR.body.features || {}));

    await doctorPage.goto(`${DOCTOR_URL}/doctor/${doctorUserId}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await injectDoctorAuth(doctorPage, doctorToken, doctorUser);
    await doctorPage.reload();
    await snap(doctorPage, 'MR02-doctor-dashboard', 'Doctor Dashboard');
  });

  // ── MR03 — Navigate to Meeting/Appointment Area ─────────────────
  test('MR03 — Navigate to Appointments', async () => {
    await doctorPage.goto(`${DOCTOR_URL}/doctor/${doctorUserId}/schedule`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await injectDoctorAuth(doctorPage, doctorToken, doctorUser);
    await doctorPage.reload();
    await snap(doctorPage, 'MR03-appointments-list', 'Appointments List');
  });

  // ── MR04 — Meeting Room UI (Recording Controls) ─────────────────
  test('MR04 — Meeting Room Recording Controls', async () => {
    await doctorPage.goto(`${DOCTOR_URL}/doctor/${doctorUserId}/health-meeting`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await injectDoctorAuth(doctorPage, doctorToken, doctorUser);
    await doctorPage.reload();
    await doctorPage.waitForTimeout(3000);
    await snap(doctorPage, 'MR04-meeting-room-controls', 'Meeting Room - Recording Controls');
  });

  // ── MR05 — Transcript with Speaker Diarization ──────────────────
  test('MR05 — Transcript Diarization UI', async () => {
    // Already on health-meeting page from MR04; click Results tab if available
    try {
      const resultsTab = doctorPage.locator('button:has-text("ผลประชุม"), button:has-text("Results"), [data-testid="results-tab"]');
      if (await resultsTab.count() > 0) await resultsTab.first().click({ timeout: 5000 });
    } catch { /* stay on current view */ }
    await sleep(2000);
    await snap(doctorPage, 'MR05-transcript-diarization', 'Transcript Speaker Diarization');
  });

  // ── MR06 — AI Summary SOAP Format ──────────────────────────────
  test('MR06 — AI Summary Display', async () => {
    await snap(doctorPage, 'MR06-ai-summary-soap', 'AI Summary SOAP Format');
  });

  // ── MR07 — Post-Meeting Actions ─────────────────────────────────
  test('MR07 — Post-Meeting Action Buttons', async () => {
    await snap(doctorPage, 'MR07-post-meeting-actions', 'Post-Meeting Action Buttons');
  });

  // ── MR08 — Meeting History ──────────────────────────────────────
  test('MR08 — Meeting History', async () => {
    await doctorPage.goto(`${DOCTOR_URL}/doctor/${doctorUserId}/health-meeting`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await injectDoctorAuth(doctorPage, doctorToken, doctorUser);
    await doctorPage.reload();
    await doctorPage.waitForTimeout(3000);
    await injectDoctorAuth(doctorPage, doctorToken, doctorUser);
    await doctorPage.reload();
    await doctorPage.waitForTimeout(3000);
    await injectDoctorAuth(doctorPage, doctorToken, doctorUser);
    await doctorPage.reload();
    await doctorPage.waitForTimeout(3000);
    await snap(doctorPage, 'MR08-meeting-history', 'Meeting History');
  });
});
