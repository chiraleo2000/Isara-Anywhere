/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA — ADMIN WORKFLOWS UI SCREENSHOTS
 * ═══════════════════════════════════════════════════════════════════════
 * Tests admin dashboards, user management, appointment management,
 * doctor scheduling, clinical resources, and system settings.
 * Screenshots stored in: screenshots/admin-workflows/
 * ═══════════════════════════════════════════════════════════════════════
 */
import { test, Page, BrowserContext } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';

const DOCTOR_URL = 'https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app';

const SS_DIR = path.join(__dirname, '..', 'screenshots', 'admin-workflows');
fs.mkdirSync(SS_DIR, { recursive: true });

async function snap(page: Page, filename: string, label: string, waitMs = 2500): Promise<void> {
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
  try { await page.waitForLoadState('networkidle', { timeout: 12000 }); } catch { /* ok */ }
  await page.waitForTimeout(waitMs);
  const fp = path.join(SS_DIR, `${filename}.png`);
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

test.describe('Admin Workflows — UI Screenshots', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180000);

  let ctx: BrowserContext;
  let page: Page;
  let token: string;
  let user: Record<string, unknown>;

  test.beforeAll(async ({ browser }) => {
    ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    page = await ctx.newPage();

    const loginR = await apiPost(page, `${DOCTOR_URL}/auth/api/login`, {
      email: 'doctor.test@izara.com',
      password: process.env.IZARA_DOCTOR_PASSWORD || 'IzaraDoctor@2024',
    });

    if (loginR.status === 200 && (loginR.body.token || loginR.body.accessToken)) {
      token = loginR.body.token || loginR.body.accessToken;
      user = loginR.body.user || { id: loginR.body.userId, email: 'doctor.test@izara.com', name: 'Doctor Test' };
    } else {
      token = 'demo-token';
      user = { id: 'demo-doctor', email: 'doctor.test@izara.com', name: 'Dr. Demo' };
    }
  });

  test.afterAll(async () => { await ctx?.close(); });

  // Helper: inject auth on login page first, then navigate to target
  async function authAndGo(target: string) {
    await page.goto(`${DOCTOR_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await injectDoctorAuth(page, token, user);
    await page.goto(`${DOCTOR_URL}${target}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);
  }

  // ── AD01 — Admin Dashboard ──────────────────────────────────────
  test('AD01 — Admin Dashboard', async () => {
    await authAndGo('/dashboard');
    await snap(page, 'AD01-admin-dashboard', 'Admin Dashboard');
  });

  // ── AD02 — User Management ─────────────────────────────────────
  test('AD02 — User Management', async () => {
    await authAndGo('/admin/doctors');
    await snap(page, 'AD02-user-management', 'User Management');
  });

  // ── AD03 — Doctor Schedule Management ──────────────────────────
  test('AD03 — Doctor Schedules', async () => {
    await authAndGo('/doctor-schedule');
    await snap(page, 'AD03-doctor-schedules', 'Doctor Schedules');
  });

  // ── AD04 — Appointment Management (Admin) ─────────────────────
  test('AD04 — Appointment Management', async () => {
    await authAndGo('/appointments');
    await snap(page, 'AD04-appointment-management', 'Appointment Management');
  });

  // ── AD05 — Clinical Resources ──────────────────────────────────
  test('AD05 — Clinical Resources', async () => {
    await authAndGo('/clinical-resources');
    await snap(page, 'AD05-clinical-resources', 'Clinical Resources');
  });

  // ── AD06 — Medical Content Management ──────────────────────────
  test('AD06 — Medical Content', async () => {
    await authAndGo('/medical-content');
    await snap(page, 'AD06-medical-content', 'Medical Content');
  });

  // ── AD07 — Notifications Management ────────────────────────────
  test('AD07 — Notifications', async () => {
    await authAndGo('/notifications');
    await snap(page, 'AD07-notifications', 'Notifications');
  });

  // ── AD08 — Living Will Management ──────────────────────────────
  test('AD08 — Living Will', async () => {
    await authAndGo('/patients');
    await snap(page, 'AD08-living-will', 'Living Will Management');
  });
});
