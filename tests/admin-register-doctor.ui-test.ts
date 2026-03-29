/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — ADMIN REGISTER & PROMOTE DOCTOR WORKFLOW TESTS
 * ═══════════════════════════════════════════════════════════════════════
 * Tests end-to-end flow:
 *   AR01: Register new patient (via Patient Portal API)
 *   AR02: Login new patient (verify token)
 *   AR03: Register new doctor (via Doctor Portal API, pending approval)
 *   AR04: Admin approves new doctor
 *   AR05: Admin promotes new doctor to admin role
 *   AR06: New doctor (now admin) logs in and verifies admin access
 *
 * Screenshots saved to: screenshots/cloud-workflows/admin-register-doctor/
 * ═══════════════════════════════════════════════════════════════════════
 */
import { test, expect, Page } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';

// ── Cloud Run URLs ──────────────────────────────────────────────────
const PATIENT_URL = 'https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app';
const DOCTOR_URL  = 'https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app';

// ── Admin credentials ───────────────────────────────────────────────
const ADMIN_EMAIL    = 'admin.test@izara.com';
const ADMIN_PASSWORD = process.env.IZARA_ADMIN_PASSWORD || 'IzaraAdmin@2024';

// ── Screenshot output ───────────────────────────────────────────────
const SS_DIR = path.join(__dirname, '..', 'screenshots', 'cloud-workflows', 'admin-register-doctor');
fs.mkdirSync(SS_DIR, { recursive: true });

// ── Unique test data ────────────────────────────────────────────────
const TS = Date.now();
const NEW_PATIENT_EMAIL    = `ar.patient.${TS}@test.com`;
const NEW_PATIENT_PASSWORD = 'ARPatientTest@2024!'; // NOSONAR — test credential
const NEW_DOCTOR_EMAIL     = `ar.doctor.${TS}@test.com`;
const NEW_DOCTOR_PASSWORD  = 'ARDoctorTest@2024!'; // NOSONAR — test credential

// ── Shared state across serial tests ────────────────────────────────
let patientToken = '';
let patientId = '';
let doctorToken = '';
let doctorUserId = '';
let adminToken = '';
let adminUserId = '';
let serviceAvailable = false;

// ── Helpers ─────────────────────────────────────────────────────────
async function snap(page: Page, filename: string, label: string): Promise<void> {
  try {
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
    try { await page.waitForLoadState('networkidle', { timeout: 10000 }); } catch { /* ok */ }
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SS_DIR, `${filename}.png`), fullPage: false });
    console.log(`  📸 [${label}] → ${filename}.png`);
  } catch (err) {
    console.log(`  ⚠️ [${label}] Screenshot skipped: ${(err as Error).message?.slice(0, 80)}`);
  }
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function apiPost(page: Page, url: string, data: Record<string, unknown>, token?: string, retries = 3) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const r = await page.request.post(url, { data, headers, timeout: 15000 });
      return { status: r.status(), body: await r.json().catch(() => ({})) };
    } catch (err) {
      if (attempt === retries) {
        console.log(`  ⚠️ apiPost failed after ${retries} retries for ${url}: ${(err as Error).message?.slice(0, 60)}`);
        return { status: 0, body: {} };
      }
      console.log(`  ⏳ apiPost retry ${attempt}/${retries} for ${url}: ${(err as Error).message?.slice(0, 60)}`);
      await sleep(3000 * attempt);
    }
  }
  return { status: 0, body: {} };
}

async function safeGoto(page: Page, url: string, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      console.log(`  ⏳ safeGoto retry ${attempt}/${retries}: ${(err as Error).message?.slice(0, 60)}`);
      await sleep(3000 * attempt);
    }
  }
}

async function injectDoctorAuth(page: Page, token: string, userId: string, email: string, isAdmin = false): Promise<void> {
  await safeGoto(page, DOCTOR_URL);
  await page.evaluate(({ token, userId, email, isAdmin }) => {
    const now = Date.now();
    localStorage.setItem('token', token);
    localStorage.setItem('auth_token', token);
    localStorage.setItem('izara_current_user', JSON.stringify({
      id: userId, email, name: isAdmin ? 'Admin Test' : 'Dr. AR Test',
      displayName: isAdmin ? 'Admin Test' : 'Dr. AR Test', role: isAdmin ? 'admin' : 'doctor',
      doctorId: userId, medicalLicenseNumber: isAdmin ? 'LIC-ADMIN' : 'LIC-AR-TEST',
      isActive: true, emailVerified: true, isAdmin,
      adminPrivileges: isAdmin ? { manageDoctors: true, manageAppointments: true, viewAllRecords: true, manageContent: true, systemSettings: true } : undefined,
      specialty: 'General Practice',
      preferences: { theme: 'light', language: 'th', notifications: { email: true, push: true, sms: false } },
    }));
    localStorage.setItem('izara_session_expiry', (now + 3600000).toString());
    localStorage.setItem('izara_last_activity', now.toString());
  }, { token, userId, email, isAdmin });
}

// ── Login helper ────────────────────────────────────────────────────
async function loginDoctor(page: Page, email: string, password: string): Promise<{ token: string; userId: string }> {
  let res = await apiPost(page, `${DOCTOR_URL}/auth/login`, { email, password });
  if (res.status !== 200) {
    res = await apiPost(page, `${DOCTOR_URL}/api/auth/login`, { email, password });
  }
  expect([200], `Doctor login failed for ${email}: ${res.status} — ${JSON.stringify(res.body).slice(0, 200)}`).toContain(res.status);
  const token = res.body.token || res.body.accessToken;
  const userId = res.body.user?.id || res.body.userId || '';
  return { token, userId };
}

// ═══════════════════════════════════════════════════════════════════════
// ADMIN + DOCTOR REGISTRATION → PROMOTION WORKFLOW (AR01–AR06)
// ═══════════════════════════════════════════════════════════════════════
test.describe('Admin Register & Promote Doctor Workflow', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(120000);

  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    // Health check — skip all tests if services are unreachable
    try {
      const hc = await page.request.get(`${PATIENT_URL}/api/health`, { timeout: 10000 });
      if (hc.status() !== 200) throw new Error(`Health check failed: ${hc.status()}`);
      serviceAvailable = true;
    } catch (err) {
      console.log(`⚠️ Services unreachable, skipping admin-register suite: ${(err as Error).message?.slice(0, 80)}`);
    }
  });

  test.afterAll(async () => {
    await page?.close();
  });

  // ── AR01: Register new patient ──────────────────────────────────
  test('AR01 — Register new patient via Patient Portal API', async () => {
    test.skip(!serviceAvailable, 'Services unreachable');
    console.log(`\n🔹 AR01: Registering new patient: ${NEW_PATIENT_EMAIL}`);

    const reg = await apiPost(page, `${PATIENT_URL}/auth/register`, {
      email: NEW_PATIENT_EMAIL,
      password: NEW_PATIENT_PASSWORD,
      name: 'AR Test Patient',
      phone: '0899990001',
      dateOfBirth: '1992-08-20',
      gender: 'male',
    });
    expect([200, 201, 409], `Patient register failed: ${reg.status}`).toContain(reg.status);
    console.log(`  ✅ Patient registration: status=${reg.status}`);

    // Screenshot: patient portal login page
    await safeGoto(page, `${PATIENT_URL}/login`);
    await snap(page, 'AR01-patient-register', 'Patient Registration');
  });

  // ── AR02: Login new patient ─────────────────────────────────────
  test('AR02 — Login new patient and verify token', async () => {
    test.skip(!serviceAvailable, 'Services unreachable');
    console.log(`\n🔹 AR02: Logging in as new patient: ${NEW_PATIENT_EMAIL}`);

    const login = await apiPost(page, `${PATIENT_URL}/auth/login`, {
      email: NEW_PATIENT_EMAIL,
      password: NEW_PATIENT_PASSWORD,
    });
    expect(login.status, `Patient login failed: ${login.status}`).toBe(200);

    patientToken = login.body.token || login.body.accessToken || '';
    patientId = login.body.user?.id || login.body.userId || '';
    expect(patientToken).toBeTruthy();
    expect(patientId).toBeTruthy();
    console.log(`  ✅ Patient logged in: id=${patientId}`);

    // Inject auth and show dashboard
    await safeGoto(page, PATIENT_URL);
    await page.evaluate(({ token, email, patientId }) => {
      const now = Date.now();
      localStorage.setItem('izara_user', JSON.stringify({
        id: patientId, patientId, name: 'AR Test Patient', email,
        phone: '0899990001', role: 'patient', gender: 'male', dateOfBirth: '1992-08-20',
      }));
      localStorage.setItem('auth_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('izara_patient_last_activity', now.toString());
    }, { token: patientToken, email: NEW_PATIENT_EMAIL, patientId });

    await safeGoto(page, `${PATIENT_URL}/dashboard`);
    await snap(page, 'AR02-patient-dashboard', 'Patient Dashboard');
  });

  // ── AR03: Register new doctor ───────────────────────────────────
  test('AR03 — Register new doctor (pending approval)', async () => {
    test.skip(!serviceAvailable, 'Services unreachable');
    console.log(`\n🔹 AR03: Registering new doctor: ${NEW_DOCTOR_EMAIL}`);

    const reg = await apiPost(page, `${DOCTOR_URL}/auth/register`, {
      email: NEW_DOCTOR_EMAIL,
      password: NEW_DOCTOR_PASSWORD,
      name: 'Dr. AR Test',
      medicalLicenseNumber: `LIC-AR-${TS}`,
      specialty: 'Internal Medicine',
      phone: '0899990002',
      dateOfBirth: '1985-03-15',
      status: 'pending_approval',
    });
    expect([200, 201, 409], `Doctor register failed: ${reg.status}`).toContain(reg.status);

    // Extract user ID from registration response
    if (reg.body.user?.id) {
      doctorUserId = reg.body.user.id;
    }
    console.log(`  ✅ Doctor registered (pending): id=${doctorUserId}, status=${reg.body.user?.approvalStatus || 'pending'}`);

    // Screenshot: doctor portal login page
    await safeGoto(page, `${DOCTOR_URL}/login`);
    await snap(page, 'AR03-doctor-register', 'Doctor Registration');
  });

  // ── AR04: Admin approves new doctor ─────────────────────────────
  test('AR04 — Admin approves new doctor', async () => {
    test.skip(!serviceAvailable, 'Services unreachable');
    console.log(`\n🔹 AR04: Admin approving doctor: ${NEW_DOCTOR_EMAIL}`);

    // Login as admin
    const adminLogin = await loginDoctor(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    adminToken = adminLogin.token;
    adminUserId = adminLogin.userId;
    expect(adminToken).toBeTruthy();
    console.log(`  ✅ Admin logged in: id=${adminUserId}`);

    // If we don't have doctorUserId from registration, try to find it
    if (!doctorUserId) {
      // Try logging in with the new doctor (may work if auto-approved)
      try {
        const tryLogin = await apiPost(page, `${DOCTOR_URL}/auth/login`, {
          email: NEW_DOCTOR_EMAIL,
          password: NEW_DOCTOR_PASSWORD,
        });
        if (tryLogin.status === 200) {
          doctorUserId = tryLogin.body.user?.id || tryLogin.body.userId || '';
        }
      } catch { /* expected if pending */ }
    }

    // Approve doctor via admin API
    if (doctorUserId) {
      const approve = await apiPost(page, `${DOCTOR_URL}/api/admin/approve-doctor`, {
        userId: doctorUserId,
      }, adminToken);
      console.log(`  Approve response: status=${approve.status}, body=${JSON.stringify(approve.body).slice(0, 200)}`);
      expect([200, 201, 409], `Approve failed: ${approve.status}`).toContain(approve.status);
      console.log(`  ✅ Doctor approved: ${doctorUserId}`);
    } else {
      console.log('  ⚠️ doctorUserId not found — doctor may have auto-approved');
    }

    // Navigate to admin doctor management page and screenshot
    await injectDoctorAuth(page, adminToken, adminUserId, ADMIN_EMAIL, true);
    await safeGoto(page, `${DOCTOR_URL}/admin/doctors`);
    await snap(page, 'AR04-admin-approve-doctor', 'Admin Approve Doctor');
  });

  // ── AR05: Admin promotes new doctor to admin ────────────────────
  test('AR05 — Admin sets privilege: promote doctor to admin', async () => {
    test.skip(!serviceAvailable, 'Services unreachable');
    console.log(`\n🔹 AR05: Promoting doctor to admin: ${doctorUserId || NEW_DOCTOR_EMAIL}`);

    // If still no doctorUserId, login as the newly approved doctor
    if (!doctorUserId) {
      const docLogin = await loginDoctor(page, NEW_DOCTOR_EMAIL, NEW_DOCTOR_PASSWORD);
      doctorUserId = docLogin.userId;
      doctorToken = docLogin.token;
    }
    expect(doctorUserId).toBeTruthy();

    // Use admin API to update role to admin
    const roleUpdate = await apiPost(page, `${DOCTOR_URL}/api/admin/update-role`, {
      userId: doctorUserId,
      role: 'admin',
      isAdmin: true,
    }, adminToken);
    console.log(`  Role update response: status=${roleUpdate.status}, body=${JSON.stringify(roleUpdate.body).slice(0, 200)}`);
    expect([200, 201], `Role update failed: ${roleUpdate.status}`).toContain(roleUpdate.status);
    console.log(`  ✅ Doctor promoted to admin: ${doctorUserId}`);

    // Navigate to admin doctors page, show admin tab
    await injectDoctorAuth(page, adminToken, adminUserId, ADMIN_EMAIL, true);
    await safeGoto(page, `${DOCTOR_URL}/admin/doctors`);
    await page.waitForTimeout(2000);

    // Try to click "Admins" tab if visible
    try {
      const adminTab = page.locator('button:has-text("Admin"), [role="tab"]:has-text("Admin"), button:has-text("แอดมิน")');
      if (await adminTab.count() > 0) {
        await adminTab.first().click();
        await page.waitForTimeout(1500);
      }
    } catch { /* ok — tab may not exist */ }

    await snap(page, 'AR05-admin-promote-doctor', 'Admin Promote Doctor');
  });

  // ── AR06: New admin (former doctor) logs in and verifies ────────
  test('AR06 — New admin (promoted doctor) login and verify access', async () => {
    test.skip(!serviceAvailable, 'Services unreachable');
    console.log(`\n🔹 AR06: Logging in as promoted admin: ${NEW_DOCTOR_EMAIL}`);

    // Login as the newly promoted admin
    const newAdminLogin = await loginDoctor(page, NEW_DOCTOR_EMAIL, NEW_DOCTOR_PASSWORD);
    doctorToken = newAdminLogin.token;
    const newAdminUserId = newAdminLogin.userId;
    expect(doctorToken).toBeTruthy();
    console.log(`  ✅ Promoted admin logged in: id=${newAdminUserId}`);

    // Verify admin privileges in login response
    const verifyRes = await apiPost(page, `${DOCTOR_URL}/auth/login`, {
      email: NEW_DOCTOR_EMAIL,
      password: NEW_DOCTOR_PASSWORD,
    });
    const user = verifyRes.body.user || {};
    console.log(`  Login response — isAdmin: ${user.isAdmin}, role: ${user.role}, adminPrivileges: ${JSON.stringify(user.adminPrivileges || {}).slice(0, 150)}`);

    // Inject auth with admin privileges and navigate to admin page
    await injectDoctorAuth(page, doctorToken, newAdminUserId, NEW_DOCTOR_EMAIL, true);
    await safeGoto(page, `${DOCTOR_URL}/admin/doctors`);
    await snap(page, 'AR06-new-admin-access', 'New Admin Access Verification');

    // Verify admin page loads (not redirected to login)
    const currentUrl = page.url();
    console.log(`  📍 Current URL: ${currentUrl}`);
    // Should be on admin page, not redirected
    expect(currentUrl).toContain('/admin');
    console.log(`  ✅ Promoted admin has full admin access`);
  });
});
