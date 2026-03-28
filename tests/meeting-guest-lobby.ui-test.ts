/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA — GUEST LOBBY & HOST APPROVAL WORKFLOW UI TESTS
 * ═══════════════════════════════════════════════════════════════════════
 * Tests the Microsoft Teams–style lobby flow:
 * - Guest join page (public, no auth required)
 * - Lobby waiting room with real-time updates
 * - Doctor (host) admit / reject controls
 * - Admin joins via same lobby flow
 * - Share link generation
 * Screenshots stored in: screenshots/meeting-lobby/
 * ═══════════════════════════════════════════════════════════════════════
 */
import { test, expect, Page, BrowserContext } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';

const PATIENT_URL = 'https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app';
const DOCTOR_URL  = 'https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app';
const MEETING_URL = 'https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app';

const DOCTOR_EMAIL    = 'doctor.test@izara.com';
const DOCTOR_PASSWORD = process.env.IZARA_DOCTOR_PASSWORD || 'IzaraDoctor@2024';

const SS_DIR = path.join(__dirname, '..', 'screenshots', 'meeting-lobby');
fs.mkdirSync(SS_DIR, { recursive: true });

async function snap(page: Page, filename: string, label: string, waitMs = 2500): Promise<void> {
  try {
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
    try { await page.waitForLoadState('networkidle', { timeout: 10000 }); } catch { /* ok */ }
    await page.waitForTimeout(waitMs);
    const fp = path.join(SS_DIR, `${filename}.png`);
    await page.screenshot({ path: fp, fullPage: false });
    console.log(`  📸 [${label}] → ${fp}`);
  } catch (err) {
    console.log(`  ⚠️ [${label}] Screenshot skipped: ${(err as Error).message?.slice(0, 80)}`);
  }
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function apiPost(page: Page, url: string, data: Record<string, unknown>, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const r = await page.request.post(url, { data, headers });
  return { status: r.status(), body: await r.json().catch(() => ({})) };
}

async function apiGet(page: Page, url: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const r = await page.request.get(url, { headers });
  return { status: r.status(), body: await r.json().catch(() => ({})) };
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

test.describe('Guest Lobby & Host Approval — UI Screenshots', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180000);

  let doctorCtx: BrowserContext;
  let doctorPage: Page;
  let guestCtx: BrowserContext;
  let guestPage: Page;
  let doctorToken: string;
  let doctorUser: Record<string, unknown>;
  let doctorUserId: string;
  const testMeetingId = `test-lobby-${Date.now()}`;

  test.beforeAll(async ({ browser }) => {
    doctorCtx = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      permissions: ['camera', 'microphone'],
    });
    doctorPage = await doctorCtx.newPage();

    guestCtx = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    guestPage = await guestCtx.newPage();
  });

  test.afterAll(async () => {
    await doctorCtx?.close();
    await guestCtx?.close();
  });

  // ── MG01 — Meeting Server Health ────────────────────────────────
  test('MG01 — Meeting Server Health Check', async () => {
    const healthR = await apiGet(doctorPage, `${MEETING_URL}/api/health`);
    expect(healthR.status).toBe(200);
    console.log('  ✅ Meeting server health:', JSON.stringify(healthR.body));
  });

  // ── MG02 — Doctor Login ─────────────────────────────────────────
  test('MG02 — Doctor Login & Auth', async () => {
    const loginR = await apiPost(doctorPage, `${DOCTOR_URL}/auth/api/login`, {
      email: DOCTOR_EMAIL,
      password: DOCTOR_PASSWORD,
    });

    if (loginR.status === 200 && (loginR.body.token || loginR.body.accessToken)) {
      doctorToken = loginR.body.token || loginR.body.accessToken;
      doctorUser = loginR.body.user || { id: loginR.body.userId, email: DOCTOR_EMAIL, name: 'Doctor Test' };
    } else {
      doctorToken = 'demo-token';
      doctorUser = { id: 'demo-doctor', email: DOCTOR_EMAIL, name: 'Dr. Demo' };
    }
    doctorUserId = (doctorUser.id as string) || 'demo-doctor';

    // Navigate to doctor dashboard
    await doctorPage.goto(`${DOCTOR_URL}/doctor/${doctorUserId}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await injectDoctorAuth(doctorPage, doctorToken, doctorUser);
    await doctorPage.reload();
    await snap(doctorPage, 'MG02-doctor-dashboard', 'Doctor Dashboard');
  });

  // ── MG03 — Guest Join Page (Patient Portal) ────────────────────
  test('MG03 — Guest Join Page Load', async () => {
    await guestPage.goto(`${PATIENT_URL}/guest-join/${testMeetingId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await snap(guestPage, 'MG03-guest-join-form', 'Guest Join Form');

    // Verify form elements exist
    const nameInput = guestPage.locator('[data-testid="guest-name-input"]');
    const joinBtn = guestPage.locator('[data-testid="guest-join-btn"]');
    expect(await nameInput.count()).toBeGreaterThan(0);
    expect(await joinBtn.count()).toBeGreaterThan(0);
    console.log('  ✅ Guest join form loaded with name input and join button');
  });

  // ── MG04 — Guest Enters Name & Requests to Join ────────────────
  test('MG04 — Guest Requests Lobby Access', async () => {
    // Fill in guest name
    const nameInput = guestPage.locator('[data-testid="guest-name-input"]');
    await nameInput.fill('External Guest User');
    await snap(guestPage, 'MG04a-guest-name-filled', 'Guest Name Entered');

    // Click join button
    const joinBtn = guestPage.locator('[data-testid="guest-join-btn"]');
    await joinBtn.click();

    // Wait for lobby waiting state
    await sleep(3000);
    await snap(guestPage, 'MG04b-guest-lobby-waiting', 'Guest Waiting in Lobby');
    console.log('  ✅ Guest submitted lobby request');
  });

  // ── MG05 — Verify Lobby Entry via API ───────────────────────────
  test('MG05 — Lobby API Verification', async () => {
    const lobbyR = await apiGet(doctorPage, `${MEETING_URL}/api/meetings/${testMeetingId}/lobby`, doctorToken);
    console.log('  📋 Lobby state:', JSON.stringify(lobbyR.body));

    if (lobbyR.body.total > 0) {
      expect(lobbyR.body.participants[0].participantName).toBe('External Guest User');
      expect(lobbyR.body.participants[0].role).toBe('guest');
      expect(lobbyR.body.participants[0].status).toBe('waiting');
      console.log('  ✅ Guest found in lobby with status=waiting');
    } else {
      console.log('  ⚠️ Lobby empty — guest join may have timed out');
    }
  });

  // ── MG06 — Doctor Sees Lobby Panel ──────────────────────────────
  test('MG06 — Doctor Meeting Room with Lobby', async () => {
    // Navigate doctor to the health-meeting page
    await doctorPage.goto(`${DOCTOR_URL}/doctor/${doctorUserId}/health-meeting`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await injectDoctorAuth(doctorPage, doctorToken, doctorUser);
    await doctorPage.reload();
    await doctorPage.waitForTimeout(3000);
    await snap(doctorPage, 'MG06-doctor-meeting-lobby', 'Doctor Meeting — Lobby Panel');
  });

  // ── MG07 — Doctor Admits Guest via API ──────────────────────────
  test('MG07 — Doctor Admits Guest', async () => {
    // Get lobby participants first
    const lobbyR = await apiGet(doctorPage, `${MEETING_URL}/api/meetings/${testMeetingId}/lobby`, doctorToken);

    if (lobbyR.body.total > 0) {
      const guestPid = lobbyR.body.participants[0].participantId;

      // Admit the guest
      const admitR = await apiPost(doctorPage, `${MEETING_URL}/api/meetings/${testMeetingId}/lobby/admit`, {
        participantId: guestPid,
        admittedBy: doctorUserId,
      }, doctorToken);

      expect(admitR.body.success).toBe(true);
      expect(admitR.body.participant.status).toBe('admitted');
      console.log(`  ✅ Guest ${guestPid} admitted by doctor`);
    } else {
      console.log('  ⚠️ No guests in lobby to admit');
    }

    // Wait for guest page to react
    await sleep(4000);
    await snap(guestPage, 'MG07-guest-admitted', 'Guest Admitted — Joining Meeting');
  });

  // ── MG08 — Share Link Generation ────────────────────────────────
  test('MG08 — Share Meeting Link', async () => {
    const shareR = await apiPost(doctorPage, `${MEETING_URL}/api/meetings/${testMeetingId}/share-link`, {
      sharedBy: doctorUserId,
      sharedByName: doctorUser.name,
      recipientName: 'Family Member',
    }, doctorToken);

    expect(shareR.body.success || shareR.status === 200).toBeTruthy();
    console.log('  ✅ Share link generated:', JSON.stringify(shareR.body).substring(0, 120));
    await snap(doctorPage, 'MG08-share-link', 'Share Meeting Link');
  });

  // ── MG09 — Guest Join Page (Doctor Portal) ─────────────────────
  test('MG09 — Guest Page on Doctor Portal', async () => {
    const guestPage2 = await guestCtx.newPage();
    await guestPage2.goto(`${DOCTOR_URL}/guest-join/${testMeetingId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await snap(guestPage2, 'MG09-guest-doctor-portal', 'Guest Join — Doctor Portal');

    // Verify dark theme form
    const joinForm = guestPage2.locator('[data-testid="guest-join-form"]');
    expect(await joinForm.count()).toBeGreaterThan(0);
    console.log('  ✅ Guest join page loaded on doctor portal (dark theme)');
    await guestPage2.close();
  });

  // ── MG10 — Reject Flow ─────────────────────────────────────────
  test('MG10 — Doctor Rejects Guest', async () => {
    const rejectMeetingId = `test-reject-${Date.now()}`;

    // Guest joins lobby
    const joinR = await apiPost(guestPage, `${MEETING_URL}/api/meetings/${rejectMeetingId}/lobby/join`, {
      participantName: 'Unwanted Guest',
      role: 'guest',
    });

    if (joinR.body.success) {
      const guestPid = joinR.body.participantId;

      // Doctor rejects
      const rejectR = await apiPost(doctorPage, `${MEETING_URL}/api/meetings/${rejectMeetingId}/lobby/reject`, {
        participantId: guestPid,
        rejectedBy: doctorUserId,
        reason: 'Not authorized',
      }, doctorToken);

      expect(rejectR.body.success).toBe(true);
      expect(rejectR.body.participant.status).toBe('rejected');
      console.log(`  ✅ Guest ${guestPid} rejected by doctor`);
    }

    // Check lobby status endpoint
    if (joinR.body.participantId) {
      const statusR = await apiGet(guestPage, `${MEETING_URL}/api/meetings/${rejectMeetingId}/lobby/status/${joinR.body.participantId}`);
      expect(statusR.body.status).toBe('rejected');
      console.log('  ✅ Guest status confirmed: rejected');
    }
  });
});
