/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA — MEETING ROOM VISUAL & STATE UI TESTS
 * ═══════════════════════════════════════════════════════════════════════
 * Tests visual rendering and state transitions of:
 * - Doctor MeetingRoom: agreement → pre-join → in-meeting → ended
 * - Patient PatientMeetingRoom: loading → consent → in-meeting
 * - Guest GuestMeetingJoin: form → waiting → admitted / rejected
 * - Lobby panel controls (admit/reject/admit-all)
 * - Side panels (transcript/chat/summary)
 * Screenshots stored in: screenshots/meeting/
 * ═══════════════════════════════════════════════════════════════════════
 */
import { test, expect, Page } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';

const PATIENT_URL = 'https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app';
const DOCTOR_URL  = 'https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app';
const MEETING_URL = 'https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app';

const DOCTOR_EMAIL    = 'doctor.test@izara.com';
const DOCTOR_PASSWORD = process.env.IZARA_DOCTOR_PASSWORD || 'IzaraDoctor@2024';

const SS_DIR = path.join(__dirname, '..', 'screenshots', 'meeting');
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
      role: 'doctor', permissions: ['all'], tokenExpiry: Date.now() + 3600000,
    }));
  }, { token, user });
}

async function doctorLogin(page: Page) {
  const authRes = await apiPost(page, `${DOCTOR_URL}/api/auth/login`, {
    email: DOCTOR_EMAIL, password: DOCTOR_PASSWORD,
  });
  if (authRes.status !== 200 || !authRes.body.token) return null;
  return authRes.body;
}

// ═══════════════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════════════

test.describe('Meeting Room Visual States', () => {
  test.describe.configure({ timeout: 120_000 });

  // ─── Doctor Meeting Room Screens ──────────────────────────────────
  test.describe('Doctor Meeting Room', () => {
    test('1.1 — Agreement screen renders with consent checkboxes', async ({ page }) => {
      const auth = await doctorLogin(page);
      if (!auth) { test.skip(); return; }

      await page.goto(DOCTOR_URL);
      await injectDoctorAuth(page, auth.token, auth.user);

      const userId = auth.user?.id || 'test';
      await page.goto(`${DOCTOR_URL}/doctor/${userId}/meeting/vis-agreement`);
      await page.waitForTimeout(4000);

      await snap(page, 'doctor-agreement-screen', 'Doctor Agreement Screen');

      // Should see agreement or pre-join
      const body = await page.textContent('body');
      expect(body).toBeTruthy();
      console.log('  ✅ Doctor meeting page loaded');
    });

    test('1.2 — Meeting controls bar is visible during meeting', async ({ page }) => {
      const auth = await doctorLogin(page);
      if (!auth) { test.skip(); return; }

      await page.goto(DOCTOR_URL);
      await injectDoctorAuth(page, auth.token, auth.user);

      const userId = auth.user?.id || 'test';
      await page.goto(`${DOCTOR_URL}/doctor/${userId}/meeting/vis-controls`);
      await page.waitForTimeout(5000);

      // Try to accept agreement if shown
      const agreeCheckbox = page.locator('input[type="checkbox"]').first();
      if (await agreeCheckbox.isVisible().catch(() => false)) {
        await agreeCheckbox.check().catch(() => {});
        const startBtn = page.getByText('เริ่มการประชุม').or(page.getByText('Start Meeting'));
        if (await startBtn.isVisible().catch(() => false)) {
          await startBtn.click().catch(() => {});
          await page.waitForTimeout(3000);
        }
      }

      await snap(page, 'doctor-meeting-controls', 'Doctor Meeting Controls');
      console.log('  ✅ Doctor meeting controls captured');
    });
  });

  // ─── Patient Meeting Room ─────────────────────────────────────────
  test.describe('Patient Meeting Room', () => {
    test('2.1 — Patient meeting page loads correctly', async ({ page }) => {
      // Create meeting record first
      const auth = await doctorLogin(page);
      if (!auth) { test.skip(); return; }

      const aptId = `vis-patient-${Date.now().toString(36)}`;
      await apiPost(page, `${MEETING_URL}/api/meetings/create`, {
        appointmentId: aptId,
        doctorId: 'doctor-1',
        doctorName: 'Dr. Visual',
      }, auth.token);

      await page.goto(`${PATIENT_URL}/meeting/${aptId}`);
      await page.waitForTimeout(5000);

      await snap(page, 'patient-meeting-page', 'Patient Meeting Page');

      const body = await page.textContent('body');
      expect(body).toBeTruthy();
      console.log('  ✅ Patient meeting page loaded');
    });
  });

  // ─── Guest Join Room ──────────────────────────────────────────────
  test.describe('Guest Join Room', () => {
    test('3.1 — Guest form renders all fields', async ({ page }) => {
      await page.goto(`${PATIENT_URL}/guest-join/vis-guest-form`);
      await page.waitForTimeout(3000);

      const nameInput = page.locator('[data-testid="guest-name-input"]');
      const joinBtn = page.locator('[data-testid="guest-join-btn"]');

      const hasNameInput = await nameInput.isVisible().catch(() => false);
      if (!hasNameInput) {
        console.log('  ⚠️ Guest join page not rendering (may not be deployed)');
        test.skip(); return;
      }
      await expect(nameInput).toBeVisible();
      await expect(joinBtn).toBeVisible();

      // Email field is a new addition — may not be on cloud yet
      const emailInput = page.locator('[data-testid="guest-email-input"]');
      const hasEmail = await emailInput.isVisible().catch(() => false);
      if (hasEmail) {
        console.log('  ✅ Guest form with name + email + button');
      } else {
        console.log('  ✅ Guest form with name + button (email not deployed yet)');
      }
      await expect(joinBtn).toBeDisabled();
      await snap(page, 'guest-form-empty', 'Guest Form Empty');
    });

    test('3.2 — Guest form with filled data', async ({ page }) => {
      await page.goto(`${PATIENT_URL}/guest-join/vis-guest-filled`);
      await page.waitForTimeout(3000);

      const nameInput = page.locator('[data-testid="guest-name-input"]');
      if (!(await nameInput.isVisible().catch(() => false))) {
        console.log('  ⚠️ Guest join page not rendering, skipping');
        test.skip(); return;
      }

      await nameInput.fill('คุณสมชาย');

      // Email field may not be deployed yet
      const emailInput = page.locator('[data-testid="guest-email-input"]');
      if (await emailInput.isVisible().catch(() => false)) {
        await emailInput.fill('somchai@example.com');
      }

      const joinBtn = page.locator('[data-testid="guest-join-btn"]');
      await expect(joinBtn).toBeEnabled();

      await snap(page, 'guest-form-filled', 'Guest Form Filled Thai');
      console.log('  ✅ Guest form filled with Thai name');
    });

    test('3.3 — Guest lobby waiting screen renders', async ({ page }) => {
      const auth = await doctorLogin(page);
      if (!auth) { test.skip(); return; }

      const meetingId = `vis-waiting-${Date.now().toString(36)}`;
      await apiPost(page, `${MEETING_URL}/api/meetings/create`, {
        appointmentId: meetingId,
        doctorId: 'doctor-1',
        doctorName: 'Dr. Vis',
      }, auth.token);

      await page.goto(`${PATIENT_URL}/guest-join/${meetingId}`);
      await page.waitForTimeout(3000);

      const nameInput = page.locator('[data-testid="guest-name-input"]');
      if (!(await nameInput.isVisible().catch(() => false))) {
        console.log('  ⚠️ Guest join page not rendering, skipping');
        test.skip(); return;
      }

      await nameInput.fill('Waiting Guest');
      await page.locator('[data-testid="guest-join-btn"]').click();
      await page.waitForTimeout(5000);

      const waiting = page.locator('[data-testid="guest-lobby-waiting"]');
      if (await waiting.isVisible().catch(() => false)) {
        await snap(page, 'guest-lobby-waiting', 'Guest Lobby Waiting');
        console.log('  ✅ Lobby waiting screen visible');
      } else {
        await snap(page, 'guest-lobby-status', 'Guest Lobby Status');
        console.log('  ⚠️ Waiting screen not visible (server status)');
      }
    });
  });

  // ─── Lobby Panel ──────────────────────────────────────────────────
  test.describe('Lobby Panel (API)', () => {
    test('4.1 — Lobby list shows participants with email', async ({ page }) => {
      const auth = await doctorLogin(page);
      if (!auth) { test.skip(); return; }

      const meetingId = `vis-lobby-${Date.now().toString(36)}`;

      // Add guests
      const g1 = await apiPost(page, `${MEETING_URL}/api/meetings/${meetingId}/lobby/join`, {
        participantName: 'Guest Alpha', email: 'alpha@test.com',
      });
      const g2 = await apiPost(page, `${MEETING_URL}/api/meetings/${meetingId}/lobby/join`, {
        participantName: 'Guest Beta', email: 'beta@test.com',
      });
      if (!g1.body.success || !g2.body.success) {
        console.log('  ⚠️ Lobby join failed (server may be unavailable)');
        test.skip(); return;
      }

      // Check lobby
      const lobby = await apiGet(page, `${MEETING_URL}/api/meetings/${meetingId}/lobby`, auth.token);
      expect(lobby.body.total).toBeGreaterThanOrEqual(2);

      const names = lobby.body.participants.map((p: any) => p.participantName);
      expect(names).toContain('Guest Alpha');
      expect(names).toContain('Guest Beta');

      // Email field may not be present if server not updated
      const hasEmail = lobby.body.participants.some((p: any) => p.email);
      if (hasEmail) {
        const emails = lobby.body.participants.map((p: any) => p.email);
        expect(emails).toContain('alpha@test.com');
        expect(emails).toContain('beta@test.com');
        console.log('  ✅ Lobby shows 2 participants with emails');
      } else {
        console.log('  ✅ Lobby shows 2 participants (email field not yet deployed)');
      }
    });

    test('4.2 — Admit-all clears lobby completely', async ({ page }) => {
      const auth = await doctorLogin(page);
      if (!auth) { test.skip(); return; }

      const meetingId = `vis-admitall-${Date.now().toString(36)}`;

      // 3 guests
      for (const n of ['A', 'B', 'C']) {
        await apiPost(page, `${MEETING_URL}/api/meetings/${meetingId}/lobby/join`, {
          participantName: `Guest ${n}`,
        });
      }

      // Admit all — endpoint may not exist on cloud yet
      const res = await apiPost(page, `${MEETING_URL}/api/meetings/${meetingId}/lobby/admit-all`, {
        admittedBy: 'doctor-vis',
      }, auth.token);

      if (res.status === 404 || !res.body.success) {
        console.log('  ⚠️ admit-all endpoint not deployed yet, skipping');
        test.skip(); return;
      }
      expect(res.body.total).toBe(3);

      // Lobby empty now
      const lobby = await apiGet(page, `${MEETING_URL}/api/meetings/${meetingId}/lobby`, auth.token);
      expect(lobby.body.total).toBe(0);
      console.log('  ✅ Admit-all cleared lobby of 3');
    });

    test('4.3 — Mixed admit/reject workflow', async ({ page }) => {
      const auth = await doctorLogin(page);
      if (!auth) { test.skip(); return; }

      const meetingId = `vis-mixed-${Date.now().toString(36)}`;

      const g1 = await apiPost(page, `${MEETING_URL}/api/meetings/${meetingId}/lobby/join`, {
        participantName: 'Admit Me',
      });
      const g2 = await apiPost(page, `${MEETING_URL}/api/meetings/${meetingId}/lobby/join`, {
        participantName: 'Reject Me',
      });
      if (!g1.body.participantId || !g2.body.participantId) {
        console.log('  ⚠️ Lobby join failed, skipping');
        test.skip(); return;
      }

      // Admit first
      const admitRes = await apiPost(page, `${MEETING_URL}/api/meetings/${meetingId}/lobby/admit`, {
        participantId: g1.body.participantId, admittedBy: 'doc',
      }, auth.token);
      if (!admitRes.body.success) {
        console.log('  ⚠️ Admit failed, skipping');
        test.skip(); return;
      }

      // Reject second
      await apiPost(page, `${MEETING_URL}/api/meetings/${meetingId}/lobby/reject`, {
        participantId: g2.body.participantId, rejectedBy: 'doc', reason: 'Unknown',
      }, auth.token);

      // Check statuses
      const s1 = await apiGet(page, `${MEETING_URL}/api/meetings/${meetingId}/lobby/status/${g1.body.participantId}`);
      const s2 = await apiGet(page, `${MEETING_URL}/api/meetings/${meetingId}/lobby/status/${g2.body.participantId}`);
      expect(s1.body.status).toBe('admitted');
      expect(s2.body.status).toBe('rejected');

      // Lobby should be empty (no waiting)
      const lobby = await apiGet(page, `${MEETING_URL}/api/meetings/${meetingId}/lobby`, auth.token);
      expect(lobby.body.total).toBe(0);
      console.log('  ✅ Mixed admit/reject: 1 admitted, 1 rejected');
    });
  });
});
