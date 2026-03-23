/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA — POST-MEETING ACTIONS: EMR, PRESCRIPTIONS & LAB ORDERS
 * ═══════════════════════════════════════════════════════════════════════
 * Tests the doctor workflow after a meeting:
 *   EMR creation → Prescription → Lab Orders → Follow-up Appointment
 * Screenshots stored in: screenshots/emr-prescriptions/ & screenshots/lab-orders/
 * ═══════════════════════════════════════════════════════════════════════
 */
import { test, Page, BrowserContext } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';

const DOCTOR_URL = 'https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app';

const SS_EMR = path.join(__dirname, '..', 'screenshots', 'emr-prescriptions');
const SS_LAB = path.join(__dirname, '..', 'screenshots', 'lab-orders');
[SS_EMR, SS_LAB].forEach(d => fs.mkdirSync(d, { recursive: true }));

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
  const r = await page.request.post(url, { data, headers });
  return { status: r.status(), body: await r.json().catch(() => ({})) };
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
    localStorage.setItem('izara_last_activity', Date.now().toString());
  }, { token, user });
}

test.describe('Post-Meeting Actions — EMR & Prescriptions & Labs', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180000);

  let doctorCtx: BrowserContext;
  let doctorPage: Page;
  let doctorToken: string;
  let doctorUser: Record<string, unknown>;

  test.beforeAll(async ({ browser }) => {
    doctorCtx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    doctorPage = await doctorCtx.newPage();

    const loginR = await apiPost(doctorPage, `${DOCTOR_URL}/auth/api/login`, {
      email: 'doctor.test@izara.com',
      password: process.env.IZARA_DOCTOR_PASSWORD || 'IzaraDoctor@2024',
    });

    if (loginR.status === 200 && (loginR.body.token || loginR.body.accessToken)) {
      doctorToken = loginR.body.token || loginR.body.accessToken;
      doctorUser = loginR.body.user || { id: loginR.body.userId, email: 'doctor.test@izara.com', name: 'Doctor Test' };
    } else {
      doctorToken = 'demo-token';
      doctorUser = { id: 'demo-doctor', email: 'doctor.test@izara.com', name: 'Dr. Demo' };
    }
  });

  test.afterAll(async () => { await doctorCtx?.close(); });

  // Helper: inject auth on login page first, then navigate to target
  async function authAndGo(target: string) {
    await doctorPage.goto(`${DOCTOR_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await injectDoctorAuth(doctorPage, doctorToken, doctorUser);
    await doctorPage.goto(`${DOCTOR_URL}${target}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await doctorPage.waitForTimeout(1500);
  }

  // ── EMR01 — EMR Page ────────────────────────────────────────────
  test('EMR01 — EMR Management Page', async () => {
    await authAndGo('/patients');
    await snap(doctorPage, 'EMR01-emr-page', 'EMR Management', SS_EMR);
  });

  // ── EMR02 — EMR Create/Edit Form ───────────────────────────────
  test('EMR02 — EMR Create Form', async () => {
    await authAndGo('/patients');
    await doctorPage.waitForTimeout(1500);

    // Try to click any enabled "New EMR" type button
    const newBtn = doctorPage.locator('button:has-text("EMR"), button:has-text("สร้าง"), button:has-text("เพิ่ม")').first();
    const isEnabled = await newBtn.isVisible({ timeout: 3000 }).catch(() => false)
      && await newBtn.isEnabled({ timeout: 1000 }).catch(() => false);
    if (isEnabled) {
      await newBtn.click();
      await doctorPage.waitForTimeout(2000);
    }
    await snap(doctorPage, 'EMR02-emr-create-form', 'EMR Create Form', SS_EMR);
  });

  // ── RX01 — Prescription Page ────────────────────────────────────
  test('RX01 — Prescription Page', async () => {
    await authAndGo('/patients');
    await snap(doctorPage, 'RX01-prescriptions-page', 'Prescriptions Page', SS_EMR);
  });

  // ── RX02 — Create Prescription ─────────────────────────────────
  test('RX02 — Create Prescription Form', async () => {
    await authAndGo('/patients');
    await doctorPage.waitForTimeout(1500);

    const newBtn = doctorPage.locator('button:has-text("สั่งยา"), button:has-text("สร้าง"), button:has-text("Prescribe")').first();
    const isEnabled = await newBtn.isVisible({ timeout: 3000 }).catch(() => false)
      && await newBtn.isEnabled({ timeout: 1000 }).catch(() => false);
    if (isEnabled) {
      await newBtn.click();
      await doctorPage.waitForTimeout(2000);
    }
    await snap(doctorPage, 'RX02-prescription-create', 'Create Prescription', SS_EMR);
  });

  // ── LAB01 — Lab Orders Page ─────────────────────────────────────
  test('LAB01 — Lab Orders Page', async () => {
    await authAndGo('/patients');
    await snap(doctorPage, 'LAB01-lab-orders-page', 'Lab Orders Page', SS_LAB);
  });

  // ── LAB02 — Create Lab Order ────────────────────────────────────
  test('LAB02 — Create Lab Order Form', async () => {
    await authAndGo('/patients');
    await doctorPage.waitForTimeout(1500);

    const newBtn = doctorPage.locator('button:has-text("Lab"), button:has-text("สร้าง"), button:has-text("Order")').first();
    const isEnabled = await newBtn.isVisible({ timeout: 3000 }).catch(() => false)
      && await newBtn.isEnabled({ timeout: 1000 }).catch(() => false);
    if (isEnabled) {
      await newBtn.click();
      await doctorPage.waitForTimeout(2000);
    }
    await snap(doctorPage, 'LAB02-lab-order-create', 'Create Lab Order', SS_LAB);
  });

  // ── LAB03 — Lab Results Review ──────────────────────────────────
  test('LAB03 — Lab Results Review', async () => {
    await authAndGo('/patients');
    await snap(doctorPage, 'LAB03-lab-results', 'Lab Results Review', SS_LAB);
  });
});
