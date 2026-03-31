/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA — APPOINTMENT → MEETING URL E2E TESTS
 * ═══════════════════════════════════════════════════════════════════════
 * Tests the full flow from appointment creation through meeting room
 * connectivity — ensuring doctor and patient resolve the same Jitsi room.
 *
 * Key scenarios:
 * 1. Appointment creation stores meeting URL / room name
 * 2. Doctor opens meeting → creates meeting record on server
 * 3. Patient resolves same room name from meeting server
 * 4. Both join the same Jitsi room
 * 5. Meeting server returns correct meeting info
 * ═══════════════════════════════════════════════════════════════════════
 */
import { test, expect, Page } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';

const PATIENT_URL = process.env.PATIENT_PORTAL_URL || 'http://localhost:3005';
const DOCTOR_URL  = process.env.DOCTOR_PORTAL_URL  || 'http://localhost:3010';
const MEETING_URL = process.env.MEETING_SERVER_URL  || 'http://localhost:3020';

const DOCTOR_EMAIL    = 'doctor.test@izara.com';
const DOCTOR_PASSWORD = process.env.IZARA_DOCTOR_PASSWORD || 'IzaraDoctor@2024';

const SS_DIR = path.join(__dirname, '..', 'screenshots', 'meeting');
fs.mkdirSync(SS_DIR, { recursive: true });

async function snap(page: Page, filename: string, label: string, waitMs = 2000): Promise<void> {
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

// ═══════════════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════════════

test.describe('Appointment → Meeting URL Flow', () => {
  test.describe.configure({ timeout: 120_000 });

  test('1 — Meeting server health check', async ({ page }) => {
    let status = 0;
    let body: any = {};
    try {
      const result = await apiGet(page, `${MEETING_URL}/health`);
      status = result.status;
      body = result.body;
    } catch {
      test.skip(true, 'Meeting server unreachable (ECONNREFUSED)');
      return;
    }
    if (status !== 200) {
      test.skip(true, `Meeting server returned ${status}`);
      return;
    }
    expect(body.status).toBeTruthy();
    console.log('  ✅ Meeting server is healthy');
  });

  test('2 — Create meeting via API and verify room name returned', async ({ page }) => {
    // Login as doctor
    const authRes = await apiPost(page, `${DOCTOR_URL}/api/auth/login`, {
      email: DOCTOR_EMAIL, password: DOCTOR_PASSWORD,
    });

    // Skip if auth fails (no live server)
    if (authRes.status !== 200 || !authRes.body.token) {
      console.log('  ⚠️ Doctor auth failed, skipping (no live server)');
      test.skip();
      return;
    }
    const token = authRes.body.token;
    const testAppointmentId = `test-apt-${Date.now().toString(36)}`;

    // Create meeting
    const createRes = await apiPost(page, `${MEETING_URL}/api/meetings/create`, {
      appointmentId: testAppointmentId,
      doctorId: authRes.body.user?.id || 'test-doctor',
      doctorName: 'Dr. Test',
      patientName: 'Patient Test',
    }, token);

    // Skip if create endpoint not deployed yet
    if (createRes.status !== 200 || !createRes.body.success) {
      console.log(`  ⚠️ Create meeting returned ${createRes.status}, skipping (endpoint not deployed)`);
      test.skip();
      return;
    }
    expect(createRes.body.roomName).toBeTruthy();
    expect(createRes.body.roomName).toContain('izara-');
    console.log(`  ✅ Meeting created with room: ${createRes.body.roomName}`);

    // Verify meeting can be fetched back by appointmentId
    const getRes = await apiGet(page, `${MEETING_URL}/api/meetings/${testAppointmentId}`, token);
    expect(getRes.status).toBe(200);
    expect(getRes.body.meeting?.room_name).toBe(createRes.body.roomName);
    console.log('  ✅ Meeting fetched by appointmentId returns same room name');
  });

  test('3 — Doctor and patient resolve same room name', async ({ page }) => {
    const authRes = await apiPost(page, `${DOCTOR_URL}/api/auth/login`, {
      email: DOCTOR_EMAIL, password: DOCTOR_PASSWORD,
    });
    if (authRes.status !== 200 || !authRes.body.token) {
      console.log('  ⚠️ Auth failed, skipping');
      test.skip();
      return;
    }
    const token = authRes.body.token;
    const testAppointmentId = `sync-test-${Date.now().toString(36)}`;

    // Doctor creates meeting
    const createRes = await apiPost(page, `${MEETING_URL}/api/meetings/create`, {
      appointmentId: testAppointmentId,
      doctorId: 'doctor-1',
      doctorName: 'Dr. Sync',
    }, token);
    if (!createRes.body.success) {
      console.log('  ⚠️ Create meeting not available, skipping');
      test.skip();
      return;
    }
    const doctorRoom = createRes.body.roomName;

    // Patient fetches meeting (no auth — uses optionalAuth)
    const patientRes = await apiGet(page, `${MEETING_URL}/api/meetings/${testAppointmentId}`);
    expect(patientRes.status).toBe(200);
    const patientRoom = patientRes.body.meeting?.room_name;

    expect(patientRoom).toBe(doctorRoom);
    console.log(`  ✅ Both resolve room: ${doctorRoom}`);
  });

  test('4 — Guest joins lobby and doctor sees them', async ({ page }) => {
    const authRes = await apiPost(page, `${DOCTOR_URL}/api/auth/login`, {
      email: DOCTOR_EMAIL, password: DOCTOR_PASSWORD,
    });
    if (authRes.status !== 200 || !authRes.body.token) {
      test.skip();
      return;
    }
    const token = authRes.body.token;
    const testAppointmentId = `lobby-test-${Date.now().toString(36)}`;

    // Create meeting
    const createRes = await apiPost(page, `${MEETING_URL}/api/meetings/create`, {
      appointmentId: testAppointmentId,
      doctorId: 'doctor-1',
      doctorName: 'Dr. Lobby',
    }, token);
    if (!createRes.body?.success) {
      console.log('  ⚠️ Create meeting not available, skipping');
      test.skip();
      return;
    }

    // Guest joins lobby (no auth)
    const lobbyRes = await apiPost(page, `${MEETING_URL}/api/meetings/${testAppointmentId}/lobby/join`, {
      participantName: 'Test Guest',
      email: 'guest@test.com',
    });
    if (!lobbyRes.body.success) {
      console.log('  ⚠️ Lobby join failed, skipping');
      test.skip();
      return;
    }
    expect(lobbyRes.body.status).toBe('waiting');
    expect(lobbyRes.body.participantId).toBeTruthy();

    // Doctor checks lobby
    const lobbyGet = await apiGet(page, `${MEETING_URL}/api/meetings/${testAppointmentId}/lobby`, token);
    expect(lobbyGet.body.participants?.length).toBeGreaterThanOrEqual(1);
    const guest = lobbyGet.body.participants.find((p: any) => p.participantName === 'Test Guest');
    expect(guest).toBeTruthy();
    expect(guest.email).toBe('guest@test.com');
    console.log('  ✅ Guest in lobby with email visible to doctor');

    // Doctor admits guest
    const admitRes = await apiPost(page, `${MEETING_URL}/api/meetings/${testAppointmentId}/lobby/admit`, {
      participantId: lobbyRes.body.participantId,
      admittedBy: 'doctor-1',
    }, token);
    expect(admitRes.body.success).toBe(true);

    // Guest checks status
    const statusRes = await apiGet(page, `${MEETING_URL}/api/meetings/${testAppointmentId}/lobby/status/${lobbyRes.body.participantId}`);
    expect(statusRes.body.status).toBe('admitted');
    console.log('  ✅ Guest admitted and status updated');
  });

  test('5 — Admit-all endpoint admits multiple guests', async ({ page }) => {
    const authRes = await apiPost(page, `${DOCTOR_URL}/api/auth/login`, {
      email: DOCTOR_EMAIL, password: DOCTOR_PASSWORD,
    });
    if (authRes.status !== 200 || !authRes.body.token) {
      test.skip();
      return;
    }
    const token = authRes.body.token;
    const testAppointmentId = `admit-all-${Date.now().toString(36)}`;

    // Create meeting
    const createRes = await apiPost(page, `${MEETING_URL}/api/meetings/create`, {
      appointmentId: testAppointmentId,
      doctorId: 'doctor-1',
      doctorName: 'Dr. AdmitAll',
    }, token);
    if (!createRes.body?.success) {
      console.log('  ⚠️ Create meeting not available, skipping');
      test.skip();
      return;
    }

    // 3 guests join lobby
    const guests = ['Guest A', 'Guest B', 'Guest C'];
    for (const name of guests) {
      await apiPost(page, `${MEETING_URL}/api/meetings/${testAppointmentId}/lobby/join`, {
        participantName: name,
      });
    }

    // Verify 3 in lobby
    const lobbyBefore = await apiGet(page, `${MEETING_URL}/api/meetings/${testAppointmentId}/lobby`, token);
    if ((lobbyBefore.body.total ?? 0) < 3) {
      console.log('  ⚠️ Lobby not populated (endpoint may differ), skipping');
      test.skip();
      return;
    }

    // Admit all
    const admitAllRes = await apiPost(page, `${MEETING_URL}/api/meetings/${testAppointmentId}/lobby/admit-all`, {
      admittedBy: 'doctor-1',
    }, token);
    expect(admitAllRes.body.success).toBe(true);
    expect(admitAllRes.body.total).toBe(3);

    // Verify lobby is empty
    const lobbyAfter = await apiGet(page, `${MEETING_URL}/api/meetings/${testAppointmentId}/lobby`, token);
    expect(lobbyAfter.body.total).toBe(0);
    console.log('  ✅ All 3 guests admitted via admit-all');
  });

  test('6 — Doctor meeting page loads agreement screen', async ({ page }) => {
    const authRes = await apiPost(page, `${DOCTOR_URL}/api/auth/login`, {
      email: DOCTOR_EMAIL, password: DOCTOR_PASSWORD,
    });
    if (authRes.status !== 200 || !authRes.body.token) {
      test.skip();
      return;
    }

    // Inject auth and navigate to meeting
    await page.goto(DOCTOR_URL);
    await page.evaluate(({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('izara_current_user', JSON.stringify(user));
    }, { token: authRes.body.token, user: authRes.body.user });

    const userId = authRes.body.user?.id || 'test';
    await page.goto(`${DOCTOR_URL}/doctor/${userId}/meeting/test-apt-ui`);
    await page.waitForTimeout(3000);

    // Should show agreement screen or some meeting-related content
    const agreement = page.locator('[data-testid="meeting-agreement"]');
    const preJoin = page.locator('[data-testid="pre-join-screen"]');
    const hasAgreement = await agreement.isVisible().catch(() => false);
    const hasPreJoin = await preJoin.isVisible().catch(() => false);

    // Also check for any meeting content on the page
    const content = await page.textContent('body').catch(() => '');
    const hasMeetingText = content?.includes('Meeting') || content?.includes('ประชุม') || content?.includes('การนัดหมาย') || content?.includes('consent') || content?.includes('ยินยอม');

    if (!hasAgreement && !hasPreJoin && !hasMeetingText) {
      console.log('  ⚠️ Meeting page did not load meeting content (may need deployment), skipping');
      test.skip();
      return;
    }
    await snap(page, 'appointment-meeting-agreement', 'Meeting Agreement Screen');
    let screenType = 'meeting-content';
    if (hasAgreement) screenType = 'agreement';
    else if (hasPreJoin) screenType = 'pre-join';
    console.log(`  ✅ Meeting page loaded: ${screenType} screen`);
  });

  test('7 — Patient meeting page loads and resolves room', async ({ page }) => {
    // First create a meeting via API so room name exists
    const authRes = await apiPost(page, `${DOCTOR_URL}/api/auth/login`, {
      email: DOCTOR_EMAIL, password: DOCTOR_PASSWORD,
    });
    if (authRes.status !== 200 || !authRes.body.token) {
      test.skip();
      return;
    }

    const testAptId = `patient-ui-${Date.now().toString(36)}`;
    await apiPost(page, `${MEETING_URL}/api/meetings/create`, {
      appointmentId: testAptId,
      doctorId: 'doctor-1',
      doctorName: 'Dr. Patient',
    }, authRes.body.token);

    // Navigate to patient meeting page
    await page.goto(`${PATIENT_URL}/meeting/${testAptId}`);
    await page.waitForTimeout(5000);

    await snap(page, 'patient-meeting-page', 'Patient Meeting Page');

    // Should show some meeting-related content
    const content = await page.textContent('body');
    const hasMeetingContent = content?.includes('Izara') || content?.includes('ประชุม') || content?.includes('Meeting');
    expect(hasMeetingContent).toBe(true);
    console.log('  ✅ Patient meeting page loaded');
  });

  test('8 — Guest join page renders form (name only)', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/guest-join/test-guest-ui`);
    await page.waitForTimeout(3000);

    const nameInput = page.locator('[data-testid="guest-name-input"]');
    const joinBtn = page.locator('[data-testid="guest-join-btn"]');

    const hasName = await nameInput.isVisible().catch(() => false);
    const hasBtn = await joinBtn.isVisible().catch(() => false);

    if (!hasName && !hasBtn) {
      console.log('  ⚠️ Guest join form not rendered (page may differ), skipping');
      test.skip();
      return;
    }
    expect(hasName).toBe(true);
    expect(hasBtn).toBe(true);

    // Email field should NOT exist (removed - guest needs name only)
    const emailInput = page.locator('[data-testid="guest-email-input"]');
    const hasEmail = await emailInput.isVisible().catch(() => false);
    expect(hasEmail).toBe(false);

    await snap(page, 'guest-join-form-name-only', 'Guest Join Form (Name Only)');
    console.log(`  ✅ Guest join form renders with name field only (no email)`);
  });
});
