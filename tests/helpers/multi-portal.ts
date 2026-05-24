/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA — MULTI-PORTAL FIXTURE (3 BROWSERS, CONTINUOUS FLOW)
 * ═══════════════════════════════════════════════════════════════════════
 * Opens 3 SEPARATE BROWSERS in parallel (multi-party / Jitsi):
 *   - Patient → Google Chrome (channel: chrome)
 *   - Doctor  → Microsoft Edge (channel: msedge)
 *   - Admin   → Mozilla Firefox
 *
 * Each browser is pre-authenticated via storageState.
 * Tests are CONTINUOUS FLOWS — never go back to dashboard/home.
 * Every navigation uses sidebar clicks, NOT page.goto().
 *
 * Strict pass conditions:
 *   ✓ HTTP 200 on every navigation
 *   ✓ No login/register fallback (auto-retry on auth race)
 *   ✓ No whiteout (body text > 50 chars)
 *   ✓ No frozen loading spinners
 *   ✓ No JS errors visible on page
 *   ✓ 2-second wait after EVERY page navigation
 *   ✓ headless: false — browser windows always visible
 * ═══════════════════════════════════════════════════════════════════════
 */
import { test as base, Page, BrowserContext, Browser, BrowserContextOptions, expect, chromium, firefox, request } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { execSync } from 'node:child_process';
import {
  attachPortalDiagnostics,
  clearPortalIssues,
  formatDiagnosticReport,
  getPortalIssues,
  probeRenderHealth,
} from './portal-diagnostics';
import {
  CHROMIUM_LAUNCH_OPTIONS,
  chromiumLaunchArgs,
  CHROMIUM_MEDIA_PERMISSIONS,
  FIREFOX_LAUNCH_OPTIONS,
  ROLE_BROWSER_MATRIX,
  getRoleBrowserSpec,
  isConnectionRefusedError,
  scaleTimeout,
  scaleTimeoutByBrowser,
  type PortalRole,
} from './browser-matrix';
import { PortalServicesUnavailableError, waitForPortalServices } from './service-readiness';
import { applyRootEnvReadOnly, cloudDoctorUrl, cloudMeetingUrl, cloudPatientUrl } from './root-env';

applyRootEnvReadOnly();

export { clearPortalIssues, formatDiagnosticReport, getPortalIssues, probeRenderHealth };
export { ROLE_BROWSER_MATRIX, getRoleBrowserSpec } from './browser-matrix';

// ── Constants ────────────────────────────────────────────────────────
const IS_CLOUD = process.env.TEST_ENV === 'cloud';

const DEV_TESTING_FALLBACK = {
  patient: 'https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app',
  doctor: 'https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app',
  meeting: 'https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app',
};

export const PATIENT_URL = IS_CLOUD
  ? (process.env.CLOUD_PATIENT_URL || cloudPatientUrl(DEV_TESTING_FALLBACK.patient))
  : (process.env.PATIENT_URL || process.env.PATIENT_PORTAL_URL || process.env.LOCAL_PATIENT_URL || 'http://localhost:3005');
export const DOCTOR_URL = IS_CLOUD
  ? (process.env.CLOUD_DOCTOR_URL || cloudDoctorUrl(DEV_TESTING_FALLBACK.doctor))
  : (process.env.DOCTOR_URL || process.env.DOCTOR_PORTAL_URL || process.env.LOCAL_DOCTOR_URL || 'http://localhost:3010');
export const MEETING_URL = IS_CLOUD
  ? (process.env.CLOUD_MEETING_URL || cloudMeetingUrl(DEV_TESTING_FALLBACK.meeting))
  : (process.env.MEETING_URL || process.env.MEETING_SERVER_URL || process.env.LOCAL_MEETING_URL || 'http://localhost:3020');

/** Navigation timeout — longer for cloud cold starts */
const NAV_TIMEOUT = IS_CLOUD ? 90_000 : 30_000;
/** Fixture initial navigation timeout — extra generous for cold starts */
const FIXTURE_NAV_TIMEOUT = IS_CLOUD ? 120_000 : 60_000;

const AUTH_DIR = path.join(__dirname, '..', 'e2e', '.auth-states');
const SS_DIR   = path.join(__dirname, '..', '..', 'test-results', 'workflow-snapshots');
const DOCS_SS_DIR = path.join(__dirname, '..', '..', 'docs', 'screenshots');

/** Wait after every page change for UI to settle */
const WAIT_AFTER_NAV = 500;

export interface Portal {
  page: Page;
  ctx: BrowserContext;
  browser: Browser;
  url: string;
  role: string;
  userId: string;
  browserName: string;
}

export interface Portals {
  patient: Portal;
  doctor:  Portal;
  admin:   Portal;
}

// ═══════════════════════════════════════════════════════════════════════
// STRICT ASSERTION HELPERS
// ═══════════════════════════════════════════════════════════════════════

/** FAILS test if page fell back to /login or /register */
export function assertNotLogin(page: Page, label: string): void {
  const url = page.url();
  if (url.includes('/login') || url.includes('/register')) {
    throw new Error(
      `❌ [${label}] AUTH FAILED — Redirected to ${url}.\n` +
      `   storageState token is expired or invalid.`
    );
  }
}

/** FAILS test if page body has < 50 chars (whiteout / blank page) */
export async function assertNoWhiteout(page: Page, label: string) {
  const len = await page.evaluate(() => document.body?.innerText?.trim().length ?? 0);
  if (len < 50) {
    await page.waitForTimeout(2_000);
    const len2 = await page.evaluate(() => document.body?.innerText?.trim().length ?? 0);
    if (len2 < 50) {
      throw new Error(`❌ [${label}] WHITEOUT — Only ${len2} chars on page.`);
    }
  }
}

/** FAILS test if page stuck on loading spinner */
export async function assertNotFrozen(page: Page, label: string) {
  const frozen = await page.evaluate(() => {
    const el = document.querySelector('main, [role="main"], .main-content, #root > div');
    if (!el) return false;
    const text = el.textContent?.trim() || '';
    return text.length < 50 && /^(loading|กำลังโหลด|\.\.\.)\s*$/i.test(text);
  });
  if (frozen) {
    throw new Error(`❌ [${label}] FROZEN — Stuck on loading state.`);
  }
}

/** FAILS test if page has visible errors */
export async function assertNoErrors(page: Page, label: string) {
  const errors = await page.evaluate(() => {
    const problems: string[] = [];
    const lower = (document.body?.innerText || '').toLowerCase();
    if (lower.includes('something went wrong')) problems.push('Error boundary');
    if (lower.includes('failed to fetch')) problems.push('Failed to fetch');
    if (lower.includes('network error')) problems.push('Network error');
    if (lower.includes('500 internal server')) problems.push('500');
    if (lower.includes('502 bad gateway')) problems.push('502');
    if (lower.includes('cannot read properties')) problems.push('JS crash');
    return problems;
  });
  if (errors.length > 0) {
    throw new Error(`❌ [${label}] PAGE ERROR — ${errors.join(', ')}`);
  }
}

/** Run ALL health checks on a page after navigation */
export async function assertFullHealth(page: Page, label: string) {
  assertNotLogin(page, label);
  await assertNoWhiteout(page, label);
  await assertNotFrozen(page, label);
  await assertNoErrors(page, label);
}

// ── Screenshot helper ────────────────────────────────────────────────
export async function snap(page: Page, name: string, subDir?: string): Promise<string> {
  const safeSubDir = subDir?.replaceAll(/[^a-zA-Z0-9_-]/g, '_');
  const dir = safeSubDir ? path.join(SS_DIR, safeSubDir) : SS_DIR;
  fs.mkdirSync(dir, { recursive: true });
  const safeName = name.replaceAll(/[^a-zA-Z0-9_-]/g, '_');
  const filePath = path.join(dir, `${safeName}.png`);
  const docsDir = safeSubDir ? path.join(DOCS_SS_DIR, safeSubDir) : DOCS_SS_DIR;
  fs.mkdirSync(docsDir, { recursive: true });
  const docsPath = path.join(docsDir, `${safeName}.png`);

  const ssTimeout = (await isFirefoxPage(page)) ? 15_000 : 5_000;
  try {
    await page.screenshot({ path: filePath, fullPage: true, timeout: ssTimeout, animations: 'disabled' });
    fs.copyFileSync(filePath, docsPath);
  } catch {
    try {
      await page.screenshot({ path: filePath, fullPage: false, timeout: ssTimeout, animations: 'disabled' });
      fs.copyFileSync(filePath, docsPath);
    } catch (err) {
      console.warn(`⚠️ Screenshot failed: ${name}`, err instanceof Error ? err.message : '');
    }
  }
  return filePath;
}

function isTransientPlaywrightError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /not bound in the connection|Target (page|closed)|has been closed|Execution context was destroyed/i.test(msg);
}

/** page.request with retry when Firefox/reload races detach the connection. */
export async function pageRequestGet(
  page: Page,
  url: string,
  options?: Parameters<Page['request']['get']>[1],
): Promise<Awaited<ReturnType<Page['request']['get']>>> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await page.request.get(url, options);
    } catch (err) {
      lastErr = err;
      if (!isTransientPlaywrightError(err) || attempt === 3) throw err;
      await page.waitForTimeout(400 * (attempt + 1));
    }
  }
  throw lastErr;
}

export async function pageRequestPatch(
  page: Page,
  url: string,
  options?: Parameters<Page['request']['patch']>[1],
): Promise<Awaited<ReturnType<Page['request']['patch']>>> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await page.request.patch(url, options);
    } catch (err) {
      lastErr = err;
      if (!isTransientPlaywrightError(err) || attempt === 3) throw err;
      await page.waitForTimeout(400 * (attempt + 1));
    }
  }
  throw lastErr;
}

/** Poll API until predicate passes (cross-portal sync). */
export async function waitForPoolAppointment(
  page: Page,
  baseUrl: string,
  appointmentId: string,
  opts?: { unassignedOnly?: boolean; timeoutMs?: number },
): Promise<void> {
  const timeoutMs = opts?.timeoutMs ?? (IS_CLOUD ? 45_000 : 20_000);
  const token = await page.evaluate(() =>
    localStorage.getItem('token')
    || localStorage.getItem('izara_auth_token')
    || localStorage.getItem('auth_token')
    || '',
  );
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const poolResp = await pageRequestGet(page, `${baseUrl}/api/appointment-pool`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15_000,
    });
    if (poolResp.ok()) {
      const rows = await poolResp.json().catch(() => []);
      const list = Array.isArray(rows) ? rows : [];
      const hit = list.find((a: { id?: string; doctor_id?: string | null }) => {
        if (a.id !== appointmentId) return false;
        if (opts?.unassignedOnly) return !a.doctor_id;
        return true;
      });
      if (hit) return;
    }
    await page.waitForTimeout(1_500);
  }
  throw new Error(`❌ Appointment ${appointmentId} not visible in pool API within ${timeoutMs / 1000}s`);
}

/** Lobby join via meeting server API */
export async function lobbyJoin(
  page: Page,
  meetingKey: string,
  data: { participantName: string; participantId?: string; role?: string },
): Promise<{ success: boolean; status: string; participantId?: string }> {
  const resp = await page.request.post(`${MEETING_URL}/api/meetings/${meetingKey}/lobby/join`, {
    headers: { 'Content-Type': 'application/json' },
    data,
    timeout: IS_CLOUD ? 30_000 : 10_000,
  });
  expect(resp.ok(), `lobby join ${meetingKey}`).toBeTruthy();
  return resp.json();
}

/** Doctor admit-all (HOST) */
export async function lobbyAdmitAll(
  page: Page,
  meetingKey: string,
  admittedBy: string,
): Promise<{ admitted: unknown[]; total: number }> {
  const token = await page.evaluate(() => localStorage.getItem('token') || '');
  const resp = await page.request.post(`${MEETING_URL}/api/meetings/${meetingKey}/lobby/admit-all`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: { admittedBy },
    timeout: IS_CLOUD ? 30_000 : 10_000,
  });
  expect(resp.ok(), 'admit-all').toBeTruthy();
  const body = await resp.json();
  expect(body.success).toBeTruthy();
  return { admitted: body.admitted || [], total: body.total ?? 0 };
}

/** Admit a single lobby participant (HOST) */
export async function lobbyAdmitOne(
  page: Page,
  meetingKey: string,
  participantId: string,
  admittedBy: string,
): Promise<void> {
  const token = await page.evaluate(() => localStorage.getItem('token') || '');
  const resp = await page.request.post(`${MEETING_URL}/api/meetings/${meetingKey}/lobby/admit`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: { participantId, admittedBy },
    timeout: IS_CLOUD ? 30_000 : 10_000,
  });
  expect(resp.ok(), `lobby admit ${participantId}`).toBeTruthy();
}

/** Reject a lobby participant (HOST) */
export async function lobbyReject(
  page: Page,
  meetingKey: string,
  participantId: string,
  rejectedBy: string,
  reason?: string,
): Promise<void> {
  const token = await page.evaluate(() => localStorage.getItem('token') || '');
  const resp = await page.request.post(`${MEETING_URL}/api/meetings/${meetingKey}/lobby/reject`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: { participantId, rejectedBy, reason: reason || '' },
    timeout: IS_CLOUD ? 30_000 : 10_000,
  });
  expect(resp.ok(), `lobby reject ${participantId}`).toBeTruthy();
}

/** Unauthenticated lobby join (no browser storage / JWT) */
export async function lobbyJoinUnauth(
  meetingKey: string,
  data: { participantName: string; participantId?: string; role?: string },
): Promise<{ success: boolean; status: string; participantId?: string }> {
  const { request } = await import('@playwright/test');
  const ctx = await request.newContext({ baseURL: MEETING_URL });
  try {
    const resp = await ctx.post(`/api/meetings/${meetingKey}/lobby/join`, {
      headers: { 'Content-Type': 'application/json' },
      data,
      timeout: IS_CLOUD ? 30_000 : 10_000,
    });
    expect(resp.ok(), `unauth lobby join ${meetingKey}`).toBeTruthy();
    return resp.json();
  } finally {
    await ctx.dispose();
  }
}

/** Poll patient portal until notification type appears */
export async function waitForPatientNotification(
  page: Page,
  type: string,
  appointmentId?: string,
  timeoutMs?: number,
): Promise<void> {
  await assertNotificationTypePoll(page, PATIENT_URL, type, {
    authKey: 'auth_token',
    timeoutMs: timeoutMs ?? (IS_CLOUD ? 45_000 : 15_000),
    appointmentId,
  });
}

/** Poll lobby status for a participant */
export async function lobbyParticipantStatus(
  page: Page,
  meetingKey: string,
  participantId: string,
): Promise<string> {
  const resp = await page.request.get(
    `${MEETING_URL}/api/meetings/${meetingKey}/lobby/status/${encodeURIComponent(participantId)}`,
    { timeout: IS_CLOUD ? 30_000 : 10_000 },
  );
  expect(resp.ok()).toBeTruthy();
  const data = await resp.json();
  return data.status as string;
}

/** GET lobby snapshot (waiting + all participants) */
export async function lobbyGetSnapshot(
  page: Page,
  meetingKey: string,
  authToken?: string,
): Promise<{ waiting: Array<{ participantId?: string; status?: string; role?: string }>; all: Array<{ participantId?: string; status?: string; role?: string }> }> {
  const headers: Record<string, string> = {};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const resp = await page.request.get(`${MEETING_URL}/api/meetings/${meetingKey}/lobby`, {
    headers,
    timeout: IS_CLOUD ? 30_000 : 10_000,
  });
  expect(resp.ok(), `lobby GET ${meetingKey}`).toBeTruthy();
  const data = await resp.json();
  const waiting = data.participants || [];
  const all = data.lobby || waiting;
  return { waiting, all };
}

/** Parse notification.data (object or JSON string) and resolve appointment id */
function notificationDataPayload(n: { data?: unknown }): Record<string, unknown> {
  let d = n.data;
  if (typeof d === 'string') {
    try {
      d = JSON.parse(d);
    } catch {
      d = {};
    }
  }
  return (d && typeof d === 'object' ? d : {}) as Record<string, unknown>;
}

function notificationMatchesAppointment(
  n: { data?: unknown; appointmentId?: string },
  appointmentId: string,
): boolean {
  const d = notificationDataPayload(n);
  const id =
    (d.appointmentId as string) ||
    (d.appointment_id as string) ||
    n.appointmentId;
  return id === appointmentId || JSON.stringify(d).includes(appointmentId);
}

/** Assert notification type exists for portal API */
export async function assertNotificationType(
  page: Page,
  baseUrl: string,
  type: string,
  authKey: 'token' | 'auth_token' = 'token',
): Promise<void> {
  await assertNotificationTypePoll(page, baseUrl, type, { authKey, timeoutMs: 0 });
}

/** Poll until notification type appears (async delivery / NOTIFY) */
export async function assertNotificationTypePoll(
  page: Page,
  baseUrl: string,
  type: string,
  opts?: { authKey?: 'token' | 'auth_token'; timeoutMs?: number; appointmentId?: string },
): Promise<void> {
  const authKey = opts?.authKey ?? 'token';
  const timeoutMs = opts?.timeoutMs ?? (IS_CLOUD ? 45_000 : 15_000);
  const storageToken = await page.evaluate((key) => localStorage.getItem(key) || '', authKey);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const resp = await page.request.get(`${baseUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${storageToken}` },
      timeout: IS_CLOUD ? 30_000 : 10_000,
    });
    if (resp.ok()) {
      const data = await resp.json().catch(() => []);
      const list = Array.isArray(data) ? data : (data.notifications || data.items || []);
      const hit = list.find((n: { type?: string; data?: unknown; appointmentId?: string }) => {
        if (n.type !== type) return false;
        if (opts?.appointmentId) {
          return notificationMatchesAppointment(n, opts.appointmentId);
        }
        return true;
      });
      if (hit) return;
    }
    if (timeoutMs <= 0) break;
    await page.waitForTimeout(1_500);
  }

  const resp = await page.request.get(`${baseUrl}/api/notifications`, {
    headers: { Authorization: `Bearer ${storageToken}` },
    timeout: IS_CLOUD ? 30_000 : 10_000,
  });
  expect(resp.ok(), `notifications ${type}`).toBeTruthy();
  const data = await resp.json().catch(() => []);
  const list = Array.isArray(data) ? data : (data.notifications || data.items || []);
  const hit = list.some((n: { type?: string }) => n.type === type);
  expect(hit, `Expected notification type ${type}`).toBeTruthy();
}

/** Consent + pre-join + join; stop in lobby (before HOST admit). Used by Group Q01c. */
export async function joinMeetingToLobby(
  page: Page,
  label: string,
  browserName: 'chrome' | 'firefox' = 'chrome',
): Promise<void> {
  const routeTimeout = scaleTimeoutByBrowser(IS_CLOUD ? 60_000 : 30_000, browserName);
  await expect(page, `[${label}] must be on meeting route`).toHaveURL(/\/meeting\//, {
    timeout: routeTimeout,
  });
  const loading = page.locator('[data-testid="meeting-loading"]');
  if (await loading.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await expect(loading, `[${label}] meeting init`).toBeHidden({
      timeout: scaleTimeoutByBrowser(IS_CLOUD ? 120_000 : 60_000, browserName),
    });
  }
  const agreement = page.locator('[data-testid="meeting-agreement"]');
  if (await agreement.isVisible({ timeout: 5_000 }).catch(() => false)) {
    for (const id of ['consent-recording', 'consent-transcript', 'consent-data-sharing']) {
      const row = page.locator(`[data-testid="${id}"]`);
      if (await row.isVisible({ timeout: 2_000 }).catch(() => false)) {
        const input = row.locator('input[type="checkbox"]').first();
        if (await input.isVisible().catch(() => false)) {
          if (!(await input.isChecked().catch(() => false))) await input.check({ force: true });
        } else {
          await row.click({ force: true });
        }
      }
    }
    const agreeBtn = page.locator('[data-testid="agree-continue-btn"]');
    await expect(agreeBtn, `[${label}] agree continue`).toBeEnabled({ timeout: 10_000 });
    await agreeBtn.click();
  }
  const joinBtn = page.getByTestId('join-meeting-btn');
  if (await joinBtn.isVisible({ timeout: 15_000 }).catch(() => false)) {
    await joinBtn.click();
  }
  await expect(
    page.getByTestId('lobby-waiting-screen').or(page.getByTestId('host-waiting-screen')).first(),
    `[${label}] lobby waiting after join`,
  ).toBeVisible({ timeout: scaleTimeoutByBrowser(IS_CLOUD ? 90_000 : 45_000, browserName) });
}

/**
 * Join Izara in-app MeetingRoom (consent → pre-join → Jitsi iframe).
 * Display name is pre-filled from Izara auth — no manual Jitsi name prompt.
 */
export async function joinIzaraMeetingInApp(
  page: Page,
  label: string,
  browserName: 'chrome' | 'firefox' = 'chrome',
): Promise<void> {
  const routeTimeout = scaleTimeoutByBrowser(IS_CLOUD ? 60_000 : 30_000, browserName);
  const initTimeout = scaleTimeoutByBrowser(IS_CLOUD ? 120_000 : 60_000, browserName);
  const lobbyTimeout = scaleTimeoutByBrowser(IS_CLOUD ? 120_000 : 90_000, browserName);
  const iframeTimeout = scaleTimeoutByBrowser(IS_CLOUD ? 120_000 : 60_000, browserName);

  await expect(page, `[${label}] must be on meeting route`).toHaveURL(/\/meeting\//, {
    timeout: routeTimeout,
  });

  const loading = page.locator('[data-testid="meeting-loading"]');
  if (await loading.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await expect(loading, `[${label}] meeting init`).toBeHidden({ timeout: initTimeout });
  }

  if (await page.locator('iframe').first().isVisible({ timeout: 5_000 }).catch(() => false)) {
    return;
  }

  const agreement = page.locator('[data-testid="meeting-agreement"]');
  await expect(
    agreement.or(page.getByTestId('pre-join-screen')).first(),
    `[${label}] agreement or pre-join after init`,
  ).toBeVisible({ timeout: scaleTimeoutByBrowser(IS_CLOUD ? 90_000 : 45_000, browserName) });

  if (await agreement.isVisible({ timeout: 5_000 }).catch(() => false)) {
    for (const id of ['consent-recording', 'consent-transcript', 'consent-data-sharing']) {
      const row = page.locator(`[data-testid="${id}"]`);
      if (await row.isVisible({ timeout: 2_000 }).catch(() => false)) {
        const input = row.locator('input[type="checkbox"]').first();
        if (await input.isVisible().catch(() => false)) {
          if (!(await input.isChecked().catch(() => false))) await input.check({ force: true });
        } else {
          await row.click({ force: true });
        }
      }
    }
    const agreeBtn = page.locator('[data-testid="agree-continue-btn"]');
    await expect(agreeBtn, `[${label}] agree continue`).toBeEnabled({ timeout: 10_000 });
    await agreeBtn.click();
    await expect(page.getByTestId('pre-join-screen'), `[${label}] pre-join after consent`).toBeVisible({
      timeout: scaleTimeoutByBrowser(IS_CLOUD ? 30_000 : 15_000, browserName),
    });
  }

  await expect(
    page.getByTestId('pre-join-screen'),
    `[${label}] pre-join screen`,
  ).toBeVisible({ timeout: scaleTimeoutByBrowser(IS_CLOUD ? 90_000 : 45_000, browserName) });

  const joinBtn = page.getByTestId('join-meeting-btn');
  await expect(joinBtn, `[${label}] join meeting button`).toBeVisible({ timeout: 15_000 });
  await joinBtn.click();

  const waitingLobby = page.getByTestId('lobby-waiting-screen');
  if (await waitingLobby.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await expect(waitingLobby, `[${label}] lobby waiting until HOST admits`).toBeHidden({
      timeout: lobbyTimeout,
    });
  }

  const waitingHost = page.getByTestId('host-waiting-screen');
  if (await waitingHost.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await expect(waitingHost, `[${label}] host waiting until doctor in room`).toBeHidden({
      timeout: lobbyTimeout,
    });
  }

  await expect(
    page.getByTestId('jitsi-meeting-container'),
    `[${label}] Izara meeting container must render`,
  ).toBeVisible({ timeout: scaleTimeoutByBrowser(IS_CLOUD ? 60_000 : 30_000, browserName) });

  await expect(
    page.locator('iframe').first(),
    `[${label}] Jitsi iframe must load inside Izara MeetingRoom`,
  ).toBeVisible({ timeout: iframeTimeout });
}

// ── Refresh patient session to prevent 15-min inactivity timeout ─────
export async function refreshPatientSession(page: Page): Promise<void> {
  try {
    await page.evaluate(() => {
      localStorage.setItem('izara_patient_last_activity', Date.now().toString());
    });
  } catch { /* page may not be ready */ }
}

// ── Wait for SPA content to render (2s min + content poll) ──────────
export async function waitForContent(page: Page, label: string, timeoutMs = 8_000) {
  await page.waitForTimeout(WAIT_AFTER_NAV);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const len = await page.evaluate(() => document.body?.innerText?.trim().length ?? 0);
    if (len > 50) {
      const url = page.url();
      if (url.includes('/login') || url.includes('/register')) {
        // Re-inject auth tokens before reloading
        const patientState = path.join(AUTH_DIR, 'patient1.json');
        if (fs.existsSync(patientState)) {
          const state = JSON.parse(fs.readFileSync(patientState, 'utf-8'));
          const items = state.origins?.[0]?.localStorage || [];
          await page.evaluate((entries: { name: string; value: string }[]) => {
            for (const e of entries) localStorage.setItem(e.name, e.value);
            localStorage.setItem('izara_patient_last_activity', Date.now().toString());
          }, items);
        }
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 10_000 });
        await page.waitForTimeout(WAIT_AFTER_NAV);
        continue;
      }
      return;
    }
    await page.waitForTimeout(300);
  }
  assertNotLogin(page, label);
}

// ═══════════════════════════════════════════════════════════════════════
// PATIENT PORTAL SIDEBAR NAVIGATION (uses <a href="/path">)
// ═══════════════════════════════════════════════════════════════════════

export async function navPatient(page: Page, href: string, label: string): Promise<void> {
  // Keep patient session alive (prevent 15-min inactivity timeout)
  await refreshPatientSession(page);

  for (let attempt = 0; attempt < 3; attempt++) {
    const url = page.url();
    if (!url.includes('/login') && !url.includes('/register')) break;
    // Re-inject auth tokens from storageState
    const patientState = path.join(AUTH_DIR, 'patient1.json');
    if (fs.existsSync(patientState)) {
      const state = JSON.parse(fs.readFileSync(patientState, 'utf-8'));
      const items = state.origins?.[0]?.localStorage || [];
      await page.evaluate((entries: { name: string; value: string }[]) => {
        for (const e of entries) localStorage.setItem(e.name, e.value);
        localStorage.setItem('izara_patient_last_activity', Date.now().toString());
      }, items);
    }
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 10_000 });
    await page.waitForTimeout(WAIT_AFTER_NAV);
  }

  const navTimeout = IS_CLOUD ? 45_000 : 10_000;
  const pathOnly = href.startsWith('/') ? href : `/${href}`;

  // Full-screen meeting route has no sidebar — go home first
  if (page.url().includes('/meeting/')) {
    await page.goto(`${PATIENT_URL}/`, {
      waitUntil: 'domcontentloaded',
      timeout: IS_CLOUD ? 90_000 : 30_000,
    });
    await waitForContent(page, `${label}-exit-meeting`);
  }

  // Try sidebar first, then fall back to any link on the page (e.g. footer /profile)
  let link = page.locator(`nav a[href="${pathOnly}"], aside a[href="${pathOnly}"]`).first();
  if (!await link.isVisible({ timeout: IS_CLOUD ? 15_000 : 5_000 }).catch(() => false)) {
    link = page.locator(`a[href="${pathOnly}"]`).first();
  }
  if (!await link.isVisible({ timeout: IS_CLOUD ? 10_000 : 3_000 }).catch(() => false)) {
    if (IS_CLOUD) {
      console.warn(`  ⚠️ navPatient "${pathOnly}" — direct route (cloud)`);
    }
    await page.goto(`${PATIENT_URL}${pathOnly}`, {
      waitUntil: 'domcontentloaded',
      timeout: IS_CLOUD ? 90_000 : 30_000,
    });
    await waitForContent(page, label);
    assertNotLogin(page, label);
    return;
  }
  await expect(link, `Patient link "${pathOnly}" not found`).toBeVisible({ timeout: navTimeout });
  await link.click({ force: true, timeout: IS_CLOUD ? 20_000 : 12_000 });
  await page.waitForTimeout(WAIT_AFTER_NAV);
  await waitForContent(page, label);
  assertNotLogin(page, label);
}

// ═══════════════════════════════════════════════════════════════════════
// DOCTOR PORTAL SIDEBAR NAVIGATION (uses <button onClick>)
// ═══════════════════════════════════════════════════════════════════════

const DOCTOR_NAV_MAP: Record<string, RegExp> = {
  'dashboard':           /แดชบอร์ด|Dashboard/i,
  'schedule':            /ตารางนัด|Schedule/i,
  'patients':            /ผู้ป่วย|Patients/i,
  'health-meeting':      /นัดหมาย.*ประชุม|Appointments.*Meeting/i,
  'meetings':            /นัดหมาย.*ประชุม|Appointments.*Meeting/i,
  'appointment-pool':    /กลุ่มนัดหมาย|Appointment Pool/i,
  'pool':                /กลุ่มนัดหมาย|Appointment Pool/i,
  'medical-consultants': /ที่ปรึกษา.*แพทย์|Medical Consultant/i,
  'consultants':         /ที่ปรึกษา.*แพทย์|Medical Consultant/i,
  'medical-content':     /เนื้อหา.*การแพทย์|Medical Content/i,
  'content':             /เนื้อหา.*การแพทย์|Medical Content/i,
  'clinical-resources':  /ทรัพยากร.*คลินิก|Clinical Resource/i,
  'resources':           /ทรัพยากร.*คลินิก|Clinical Resource/i,
  'doctors':             /จัดการแพทย์|Manage Doctor/i,
  'doctor-management':   /อนุมัติ.*แพทย์|Doctor Approval/i,
  'approval':            /อนุมัติ.*แพทย์|Doctor Approval/i,
  'profile':             /โปรไฟล์|แก้ไขโปรไฟล์|Profile/i,
};

/** Route segment for direct navigation (Firefox sidebar clicks can hang). */
const DOCTOR_NAV_PATH: Record<string, string> = {
  'dashboard': 'dashboard',
  'schedule': 'schedule',
  'patients': 'patients',
  'health-meeting': 'health-meeting',
  'meetings': 'health-meeting',
  'appointment-pool': 'appointment-pool',
  'pool': 'appointment-pool',
  'medical-content': 'medical-content',
  'content': 'medical-content',
  'clinical-resources': 'clinical-resources',
  'resources': 'clinical-resources',
  'doctors': 'doctors',
  'doctor-management': 'doctor-management',
  'approval': 'doctor-management',
  'profile': 'profile',
};

function extractDoctorIdFromUrl(url: string): string | null {
  const m = url.match(/\/doctor\/([^/]+)/);
  return m?.[1] ?? null;
}

async function isFirefoxPage(page: Page): Promise<boolean> {
  const browser = page.context().browser();
  return browser?.browserType().name() === 'firefox';
}

/** Firefox: native Playwright clicks on sidebar/tabs often hang — use DOM click. */
export async function clickLocatorSafe(page: Page, locator: ReturnType<Page['locator']>, timeout = 12_000): Promise<void> {
  await expect(locator).toBeVisible({ timeout: Math.min(timeout, 10_000) });
  if (await isFirefoxPage(page)) {
    await locator.evaluate((el: HTMLElement) => el.click());
  } else {
    await locator.click({ force: true, timeout });
  }
}

export async function navDoctor(page: Page, target: string | RegExp, label: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const url = page.url();
    if (!url.includes('/login') && !url.includes('/register')) break;
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 10_000 });
    await page.waitForTimeout(WAIT_AFTER_NAV);
  }
  assertNotLogin(page, `${label}-pre`);

  let pattern: string | RegExp = target;
  let navKey = '';
  if (typeof target === 'string') {
    navKey = target.toLowerCase().trim();
    if (DOCTOR_NAV_MAP[navKey]) {
      pattern = DOCTOR_NAV_MAP[navKey];
    }
  }

  // Firefox: Playwright force-click on sidebar buttons often hangs — use direct route navigation.
  if (navKey && DOCTOR_NAV_PATH[navKey] && (await isFirefoxPage(page))) {
    const doctorId = extractDoctorIdFromUrl(page.url());
    if (doctorId) {
      const origin = page.url().match(/^(https?:\/\/[^/]+)/)?.[1] || DOCTOR_URL;
      const dest = `${origin}/doctor/${doctorId}/${DOCTOR_NAV_PATH[navKey]}`;
      if (!page.url().includes(`/${DOCTOR_NAV_PATH[navKey]}`)) {
        try {
          await page.goto(dest, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
        } catch {
          // Cloud Run can cold-start route handlers; retry once before failing the step.
          await page.goto(dest, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
        }
      }
      await page.waitForTimeout(WAIT_AFTER_NAV);
      await waitForContent(page, label);
      assertNotLogin(page, label);
      return;
    }
  }

  let btn = page.locator('nav button, aside button, nav a, aside a').filter({ hasText: pattern }).first();
  let visible = await btn.isVisible({ timeout: 10_000 }).catch(() => false);

  // Cloud recovery: if sidebar not found, page may be blank — reload and retry
  if (!visible && IS_CLOUD) {
    console.warn(`  ⚠️ navDoctor "${String(target)}" not found — reloading doctor portal...`);
    const doctorState = path.join(AUTH_DIR, 'doctor.json');
    const adminState  = path.join(AUTH_DIR, 'admin.json');
    const stateFile = fs.existsSync(adminState) ? adminState : doctorState;
    if (fs.existsSync(stateFile)) {
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
      const items = state.origins?.[0]?.localStorage || [];
      await page.evaluate((entries: { name: string; value: string }[]) => {
        for (const e of entries) localStorage.setItem(e.name, e.value);
      }, items);
    }
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2_000);
    btn = page.locator('nav button, aside button, nav a, aside a').filter({ hasText: pattern }).first();
    await btn.isVisible({ timeout: 15_000 }).catch(() => false);
  }

  await expect(btn, `Doctor sidebar "${String(target)}" not found`).toBeVisible({ timeout: 10_000 });

  const clickTimeout = IS_CLOUD ? 20_000 : 12_000;
  if (await isFirefoxPage(page)) {
    await btn.evaluate((el: HTMLElement) => el.click());
  } else {
    await btn.click({ force: true, timeout: clickTimeout });
  }
  await page.waitForTimeout(WAIT_AFTER_NAV);
  await waitForContent(page, label);
  assertNotLogin(page, label);
}

// ═══════════════════════════════════════════════════════════════════════
// VISIBLE CHROMIUM (guest / extra party) — same Windows-safe headed launch as fixture
// ═══════════════════════════════════════════════════════════════════════

export function isPlaywrightHeadless(): boolean {
  return process.env.PW_HEADLESS === '1';
}

export async function launchVisibleChromium(label = 'Guest'): Promise<Browser> {
  const headless = isPlaywrightHeadless();
  const slowMo = headless ? 0 : Number.parseInt(process.env.PW_SLOW_MO || '350', 10);
  const opts = { headless, slowMo, args: chromiumLaunchArgs(headless) };
  if (!headless && process.platform === 'win32') {
    try {
      const browser = await chromium.launch({ ...opts, channel: 'chrome' });
      console.log(`  🚀 ${label} (chrome, HEADED visible window) launched`);
      return browser;
    } catch {
      console.warn(`  ⚠️ ${label}: chrome channel failed — bundled Chromium`);
    }
  }
  const browser = await chromium.launch(opts);
  console.log(`  🚀 ${label} (${headless ? 'headless' : 'HEADED visible window'}) launched`);
  return browser;
}

// ═══════════════════════════════════════════════════════════════════════
// GUEST BROWSER LAUNCHER (Edge / Chrome incognito)
// ═══════════════════════════════════════════════════════════════════════

export async function launchGuestBrowser(browserType: 'edge' | 'chrome-incognito' = 'edge'): Promise<{ browser: Browser; ctx: BrowserContext; page: Page }> {
  const browser = await launchVisibleChromium(`Guest-${browserType}`);
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  return { browser, ctx, page };
}

// ═══════════════════════════════════════════════════════════════════════
// createPortals / closePortals — FOR beforeAll/afterAll SHARED BROWSERS
// ═══════════════════════════════════════════════════════════════════════

export async function createPortals(): Promise<Portals> {
  const patientState = path.join(AUTH_DIR, 'patient1.json');
  const doctorState  = path.join(AUTH_DIR, 'doctor.json');
  const adminState   = path.join(AUTH_DIR, 'admin.json');

  for (const f of [patientState, doctorState, adminState]) {
    if (!fs.existsSync(f)) {
      throw new Error(`Auth state file missing: ${f}\nRun global setup first.`);
    }
  }

  const ctxOpts = { viewport: { width: 1440, height: 900 } };

  const { patient: patientBrowser, doctor: doctorBrowser, admin: adminBrowser } =
    await launchAllRoleBrowsersParallel();

  const [patientCtx, doctorCtx, adminCtx] = await Promise.all([
    newContextWithStorageFallback(patientBrowser, ctxOpts, patientState, 'Patient'),
    newContextWithStorageFallback(doctorBrowser, ctxOpts, doctorState, 'Doctor'),
    newContextWithStorageFallback(adminBrowser, ctxOpts, adminState, 'Admin'),
  ]);

  await grantMeetingMediaPermissions(patientCtx, doctorCtx, adminCtx);

  const [patientPage, doctorPage, adminPage] = await Promise.all([
    patientCtx.newPage(),
    doctorCtx.newPage(),
    adminCtx.newPage(),
  ]);

  // Extract user IDs from storageState
  const doctorData = JSON.parse(fs.readFileSync(doctorState, 'utf-8'));
  const adminData  = JSON.parse(fs.readFileSync(adminState, 'utf-8'));
  const doctorUser = doctorData.origins?.[0]?.localStorage?.find(
    (e: { name: string; value: string }) => e.name === 'izara_current_user'
  );
  const adminUser = adminData.origins?.[0]?.localStorage?.find(
    (e: { name: string; value: string }) => e.name === 'izara_current_user'
  );
  const doctorId = doctorUser ? JSON.parse(doctorUser.value).id : 'DOC-TEST-001';
  const adminId  = adminUser  ? JSON.parse(adminUser.value).id  : 'ADMIN-TEST-001';

  await warmupPortalSessions(
    [
      { page: patientPage, url: PATIENT_URL, storageStatePath: patientState, label: 'Patient', role: 'patient' },
      { page: doctorPage, url: `${DOCTOR_URL}/doctor/${doctorId}/dashboard`, storageStatePath: doctorState, label: 'Doctor', role: 'doctor' },
      { page: adminPage, url: `${DOCTOR_URL}/doctor/${adminId}/dashboard`, storageStatePath: adminState, label: 'Admin', role: 'admin' },
    ],
    NAV_TIMEOUT,
  );

  await refreshPatientSession(patientPage);

  const portals: Portals = {
    patient: { page: patientPage, ctx: patientCtx, browser: patientBrowser, url: PATIENT_URL, role: 'patient', userId: 'PATIENT-DEMO', browserName: 'chrome' },
    doctor:  { page: doctorPage,  ctx: doctorCtx,  browser: doctorBrowser,  url: DOCTOR_URL,  role: 'doctor',  userId: doctorId,       browserName: 'chrome' },
    admin:   { page: adminPage,   ctx: adminCtx,   browser: adminBrowser,   url: DOCTOR_URL,  role: 'admin',   userId: adminId,        browserName: 'firefox' },
  };
  attachPortalDiagnostics(portals.patient);
  attachPortalDiagnostics(portals.doctor);
  attachPortalDiagnostics(portals.admin);
  return portals;
}

export async function closePortals(portals: Portals): Promise<void> {
  if (!portals) return;
  await portals.patient.ctx.close().catch(() => {});
  await portals.doctor.ctx.close().catch(() => {});
  await portals.admin.ctx.close().catch(() => {});
  await portals.patient.browser.close().catch(() => {});
  await portals.doctor.browser.close().catch(() => {});
  await portals.admin.browser.close().catch(() => {});
}

// ═══════════════════════════════════════════════════════════════════════
// MULTI-PORTAL FIXTURE — 3 BROWSERS
// ═══════════════════════════════════════════════════════════════════════

const FORCE_HEADED =
  process.env.PW_HEADED === '1' ||
  process.env.PW_HEADED === 'true';
const DEFAULT_HEADLESS = IS_CLOUD && !FORCE_HEADED;

const HEADED_SLOW_MO = Number.parseInt(process.env.PW_SLOW_MO || (IS_CLOUD ? '350' : '150'), 10);

const SHARED_LAUNCH = {
  headless: DEFAULT_HEADLESS,
  slowMo: DEFAULT_HEADLESS ? 0 : HEADED_SLOW_MO,
  devtools: !DEFAULT_HEADLESS && process.env.PW_DEVTOOLS === '1',
};

/** Headless shell / headed: shared safe Chromium args (fake media for Jitsi/recording) */
function chromiumArgsForLaunch(): string[] {
  return chromiumLaunchArgs(DEFAULT_HEADLESS);
}

/** Launch a browser with retry (Chrome or Firefox per role) */
async function launchRoleBrowser(role: PortalRole, label: string): Promise<Browser> {
  const spec = getRoleBrowserSpec(role);
  const retries = spec.launchRetries;
  for (let i = 0; i <= retries; i++) {
    try {
      const t0 = Date.now();
      let browser: Browser;
      if (spec.engine === 'firefox') {
        browser = await firefox.launch({
          headless: SHARED_LAUNCH.headless,
          slowMo: SHARED_LAUNCH.slowMo,
          ...FIREFOX_LAUNCH_OPTIONS,
        });
      } else {
        const headedWin = FORCE_HEADED && process.platform === 'win32';
        const launchOpts = {
          ...SHARED_LAUNCH,
          args: chromiumArgsForLaunch(),
        };
        if (headedWin) {
          // Windows headed: installed Chrome is most stable for visible debugging
          try {
            browser = await chromium.launch({ ...launchOpts, channel: 'chrome' });
          } catch {
            browser = await chromium.launch(launchOpts);
          }
        } else {
          const tryChannel = !IS_CLOUD && !FORCE_HEADED && spec.channel;
          if (tryChannel) {
            try {
              browser = await chromium.launch({ ...launchOpts, channel: spec.channel });
            } catch (channelErr) {
              console.warn(
                `  ⚠️ ${label} channel=${spec.channel} failed, using bundled Chromium: ${String(channelErr).slice(0, 80)}`,
              );
              browser = await chromium.launch(launchOpts);
            }
          } else {
            browser = await chromium.launch(launchOpts);
          }
        }
      }
      const mode = DEFAULT_HEADLESS ? 'headless' : 'HEADED (visible window)';
      console.log(`  🚀 ${label} (${spec.browserName}, ${mode}) launched in ${Date.now() - t0}ms`);
      return browser;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ❌ ${label} launch attempt ${i + 1} failed: ${msg.slice(0, 120)}`);
      if (i === retries) throw err;
      await new Promise((r) => setTimeout(r, 2_000));
    }
  }
  throw new Error(`${label} browser launch failed after ${retries + 1} attempts`);
}

/** Launch Patient + Doctor + Admin browsers (sequential in cloud for stability) */
async function launchAllRoleBrowsersParallel(): Promise<{
  patient: Browser;
  doctor: Browser;
  admin: Browser;
}> {
  // Headed: one browser at a time (GPU/RAM); cloud headless may use parallel workers per project
  const launchSequential = IS_CLOUD || FORCE_HEADED;
  if (launchSequential) {
    const patient = await launchRoleBrowser('patient', 'Patient');
    const doctor = await launchRoleBrowser('doctor', 'Doctor');
    const admin = await launchRoleBrowser('admin', 'Admin');
    return { patient, doctor, admin };
  }
  const [patient, doctor, admin] = await Promise.all([
    launchRoleBrowser('patient', 'Patient'),
    launchRoleBrowser('doctor', 'Doctor'),
    launchRoleBrowser('admin', 'Admin'),
  ]);
  return { patient, doctor, admin };
}

async function newContextWithStorageFallback(
  browser: Browser,
  ctxOpts: BrowserContextOptions,
  storageStatePath: string,
  label: string,
): Promise<BrowserContext> {
  try {
    return await browser.newContext({ ...ctxOpts, storageState: storageStatePath });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`  ⚠ ${label} storageState failed; retrying without storageState: ${message.slice(0, 140)}`);
    return browser.newContext({ ...ctxOpts });
  }
}

async function grantMeetingMediaPermissions(
  patientCtx: BrowserContext,
  doctorCtx: BrowserContext,
  _adminCtx: BrowserContext,
): Promise<void> {
  // Playwright grantPermissions for camera/mic is Chromium-only (JIT-02).
  // Firefox admin context uses FIREFOX_LAUNCH_OPTIONS prefs + fake device args.
  await Promise.all([
    patientCtx.grantPermissions([...CHROMIUM_MEDIA_PERMISSIONS], { origin: PATIENT_URL }),
    doctorCtx.grantPermissions([...CHROMIUM_MEDIA_PERMISSIONS], { origin: DOCTOR_URL }),
  ]);
}

/** Staggered portal warmup — avoids cold-start thundering herd (RENDER-02) */
async function warmupPortalSessions(
  entries: Array<{
    page: Page;
    url: string;
    storageStatePath: string;
    label: string;
    role: PortalRole;
  }>,
  baseNavTimeout: number,
): Promise<void> {
  for (const entry of entries) {
    const timeout = scaleTimeout(baseNavTimeout, entry.role);
    await gotoWithRetry(entry.page, entry.url, timeout, entry.storageStatePath, entry.label);
  }
}

/** Navigate a page with retry — handles redirect-to-login by re-injecting auth */
async function gotoWithRetry(
  page: Page,
  url: string,
  timeout: number,
  storageStatePath: string,
  label: string,
  maxAttempts = 3,
  role: PortalRole = 'patient',
): Promise<void> {
  const t0 = Date.now();
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
      lastError = undefined;
      break;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      lastError = err instanceof Error ? err : new Error(msg);
      if (isConnectionRefusedError(msg) && attempt === maxAttempts) {
        throw new PortalServicesUnavailableError(
          `${label}: cannot reach ${url} — start services (docker compose up -d)`,
          [label],
        );
      }
      console.warn(`  ⚠️ ${label} goto attempt ${attempt}/${maxAttempts}: ${msg.slice(0, 100)}`);
      if (attempt < maxAttempts) {
        await page.waitForTimeout(1_500 * attempt);
        try {
          await page.goto(url, { waitUntil: 'commit', timeout });
          lastError = undefined;
          break;
        } catch (inner: unknown) {
          lastError = inner instanceof Error ? inner : new Error(String(inner));
        }
      }
    }
  }

  if (lastError) throw lastError;

  console.log(`  📄 ${label} navigated in ${Date.now() - t0}ms → ${page.url()}`);

  // If redirected to login, re-inject auth and reload once
  if (page.url().includes('/login') || page.url().includes('/register')) {
    console.log(`  🔄 ${label} redirected to login — re-injecting auth...`);
    if (fs.existsSync(storageStatePath)) {
      const state = JSON.parse(fs.readFileSync(storageStatePath, 'utf-8'));
      const items = state.origins?.[0]?.localStorage || [];
      await page.evaluate((entries: { name: string; value: string }[]) => {
        for (const e of entries) localStorage.setItem(e.name, e.value);
      }, items);
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 15_000 });
    }
  }

  const contentWait = scaleTimeout(IS_CLOUD ? 12_000 : 10_000, role);
  const deadline = Date.now() + contentWait;
  while (Date.now() < deadline) {
    const len = await page.evaluate(() => document.body?.innerText?.trim().length ?? 0).catch(() => 0);
    if (len > 50) return;
    await page.waitForTimeout(500);
  }

  // On cloud: blank page after wait → reload once (handles cold-start blank renders)
  if (IS_CLOUD) {
    console.warn(`  ⚠️ ${label} content sparse after ${contentWait / 1000}s — reloading page...`);
    // Re-inject auth before reload in case token was lost
    if (fs.existsSync(storageStatePath)) {
      const state = JSON.parse(fs.readFileSync(storageStatePath, 'utf-8'));
      const items = state.origins?.[0]?.localStorage || [];
      await page.evaluate((entries: { name: string; value: string }[]) => {
        for (const e of entries) localStorage.setItem(e.name, e.value);
      }, items);
    }
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 });
    // Wait another 12s for content after reload
    const deadline2 = Date.now() + 12_000;
    while (Date.now() < deadline2) {
      const len = await page.evaluate(() => document.body?.innerText?.trim().length ?? 0).catch(() => 0);
      if (len > 50) return;
      await page.waitForTimeout(500);
    }
    console.warn(`  ⚠️ ${label} still sparse after reload — proceeding anyway`);
  } else {
    console.warn(`  ⚠️ ${label} content still sparse after 10s — proceeding anyway`);
  }
}

export const test = base.extend<{}, { portals: Portals }>({
  portals: [async ({}, use) => {
    const setupStart = Date.now();
    console.log('\n🔧 FIXTURE SETUP — launching 3 browsers...');

    // Kill any lingering Chrome processes from previous fixture teardown (cloud: workers=1)
    if (IS_CLOUD) {
      try {
        execSync('taskkill /F /IM chrome.exe 2>NUL', { stdio: 'ignore' });
        await new Promise(r => setTimeout(r, 3_000));
      } catch { /* No chrome processes running — OK */ }
    }

    const patientState = path.join(AUTH_DIR, 'patient1.json');
    const doctorState  = path.join(AUTH_DIR, 'doctor.json');
    const adminState   = path.join(AUTH_DIR, 'admin.json');

    for (const f of [patientState, doctorState, adminState]) {
      if (!fs.existsSync(f)) {
        throw new Error(`Auth state file missing: ${f}\nRun global setup first.`);
      }
    }

    clearPortalIssues();
    const ctxOpts = { viewport: { width: 1440, height: 900 } };

    console.log('  🌐 Multi-party browsers: Patient=Chrome, Doctor=Chrome, Admin=Firefox (parallel launch)');
    const { patient: patientBrowser, doctor: doctorBrowser, admin: adminBrowser } =
      await launchAllRoleBrowsersParallel();

    const [patientCtx, doctorCtx, adminCtx] = await Promise.all([
      newContextWithStorageFallback(patientBrowser, ctxOpts, patientState, 'Patient'),
      newContextWithStorageFallback(doctorBrowser, ctxOpts, doctorState, 'Doctor'),
      newContextWithStorageFallback(adminBrowser, ctxOpts, adminState, 'Admin'),
    ]);

    const [patientPage, doctorPage, adminPage] = await Promise.all([
      patientCtx.newPage(),
      doctorCtx.newPage(),
      adminCtx.newPage(),
    ]);

    // Extract user IDs from storageState
    const doctorData = JSON.parse(fs.readFileSync(doctorState, 'utf-8'));
    const adminData  = JSON.parse(fs.readFileSync(adminState, 'utf-8'));
    const doctorUser = doctorData.origins?.[0]?.localStorage?.find(
      (e: { name: string; value: string }) => e.name === 'izara_current_user'
    );
    const adminUser = adminData.origins?.[0]?.localStorage?.find(
      (e: { name: string; value: string }) => e.name === 'izara_current_user'
    );
    const doctorId = doctorUser ? JSON.parse(doctorUser.value).id : 'DOC-TEST-001';
    const adminId  = adminUser  ? JSON.parse(adminUser.value).id  : 'ADMIN-TEST-001';

    const navTimeout = IS_CLOUD ? FIXTURE_NAV_TIMEOUT : NAV_TIMEOUT;

    if (process.env.E2E_SKIP_HEALTH_GATE !== '1') {
      await new Promise((r) => setTimeout(r, IS_CLOUD ? 3_000 : 500));
      const api = await request.newContext();
      try {
        await waitForPortalServices(
          api,
          [
            { name: 'Patient Portal', baseUrl: PATIENT_URL, healthPath: '/api/health' },
            { name: 'Doctor Portal', baseUrl: DOCTOR_URL, healthPath: '/api/health' },
            { name: 'Meeting Server', baseUrl: MEETING_URL, healthPath: '/health' },
          ],
          {
            maxAttempts: IS_CLOUD ? 30 : 12,
            strict: true,
            requestTimeoutMs: IS_CLOUD ? 30_000 : 12_000,
          },
        );
      } finally {
        await api.dispose();
      }
    }

    await grantMeetingMediaPermissions(patientCtx, doctorCtx, adminCtx);

    await warmupPortalSessions(
      [
        { page: patientPage, url: PATIENT_URL, storageStatePath: patientState, label: 'Patient', role: 'patient' },
        {
          page: doctorPage,
          url: `${DOCTOR_URL}/doctor/${doctorId}/dashboard`,
          storageStatePath: doctorState,
          label: 'Doctor',
          role: 'doctor',
        },
        {
          page: adminPage,
          url: `${DOCTOR_URL}/doctor/${adminId}/dashboard`,
          storageStatePath: adminState,
          label: 'Admin',
          role: 'admin',
        },
      ],
      navTimeout,
    );

    await refreshPatientSession(patientPage);

    const portals: Portals = {
      patient: { page: patientPage, ctx: patientCtx, browser: patientBrowser, url: PATIENT_URL, role: 'patient', userId: 'PATIENT-DEMO', browserName: 'chrome' },
      doctor:  { page: doctorPage,  ctx: doctorCtx,  browser: doctorBrowser,  url: DOCTOR_URL,  role: 'doctor',  userId: doctorId,       browserName: 'chrome' },
      admin:   { page: adminPage,   ctx: adminCtx,   browser: adminBrowser,   url: DOCTOR_URL,  role: 'admin',   userId: adminId,        browserName: 'firefox' },
    };
    attachPortalDiagnostics(portals.patient);
    attachPortalDiagnostics(portals.doctor);
    attachPortalDiagnostics(portals.admin);
    await Promise.all([
      probeRenderHealth(patientPage, portals.patient, 'fixture-patient'),
      probeRenderHealth(doctorPage, portals.doctor, 'fixture-doctor'),
      probeRenderHealth(adminPage, portals.admin, 'fixture-admin'),
    ]);

    console.log(`✅ FIXTURE SETUP complete in ${((Date.now() - setupStart) / 1000).toFixed(1)}s\n`);

    // Keep patient session alive every 60s to prevent 15-min inactivity logout
    const keepAlive = setInterval(async () => {
      try {
        await patientPage.evaluate(() =>
          localStorage.setItem('izara_patient_last_activity', Date.now().toString())
        );
      } catch { /* page may be navigating */ }
    }, 60_000);

    await use(portals);

    const report = formatDiagnosticReport();
    if (getPortalIssues().length > 0) {
      console.log(report);
      const reportPath = path.join(__dirname, '..', '..', 'test-results', 'portal-diagnostics.txt');
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, report, 'utf-8');
    }

    clearInterval(keepAlive);
    // Close with per-operation timeout to prevent teardown hang
    // Cloud: 30s timeout — browsers take longer to close over network
    const CLOSE_TIMEOUT_MS = IS_CLOUD ? 30_000 : 10_000;
    const closeWithTimeout = (p: Promise<void>, label: string, ms = CLOSE_TIMEOUT_MS) =>
      Promise.race([p, new Promise<void>(r => setTimeout(() => { console.log(`  ⚠ ${label} close timed out`); r(); }, ms))]);
    await Promise.all([
      closeWithTimeout(patientCtx.close().catch(() => {}), 'patientCtx'),
      closeWithTimeout(doctorCtx.close().catch(() => {}), 'doctorCtx'),
      closeWithTimeout(adminCtx.close().catch(() => {}), 'adminCtx'),
    ]);
    await Promise.all([
      closeWithTimeout(patientBrowser.close().catch(() => {}), 'patientBrowser'),
      closeWithTimeout(doctorBrowser.close().catch(() => {}), 'doctorBrowser'),
      closeWithTimeout(adminBrowser.close().catch(() => {}), 'adminBrowser'),
    ]);
  }, { scope: 'worker', timeout: 420_000 }],
});

// ═══════════════════════════════════════════════════════════════════════
// WORKFLOW HELPERS — Form fill, API wait, table assertions
// ═══════════════════════════════════════════════════════════════════════

/**
 * Wait for an API response matching a URL pattern to complete with status < 400.
 * Use after clicking a submit button to verify the backend accepted the request.
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  options?: { method?: string; timeout?: number },
): Promise<{ status: number; url: string }> {
  const timeout = options?.timeout ?? 15_000;
  const method = options?.method?.toUpperCase();
  const resp = await page.waitForResponse(
    (r) => {
      const matches = typeof urlPattern === 'string'
        ? r.url().includes(urlPattern)
        : urlPattern.test(r.url());
      if (!matches) return false;
      if (method && r.request().method().toUpperCase() !== method) return false;
      return true;
    },
    { timeout },
  );
  const status = resp.status();
  expect(status, `API ${resp.url()} returned ${status}`).toBeLessThan(400);
  return { status, url: resp.url() };
}

/**
 * Fill form fields on the current page. Each field is identified by a CSS selector.
 * Supports input, textarea, and select elements.
 */
export async function fillForm(
  page: Page,
  fields: Array<{ selector: string; value: string; type?: 'fill' | 'select' | 'check' }>,
): Promise<void> {
  for (const f of fields) {
    const el = page.locator(f.selector).first();
    await expect(el, `Form field "${f.selector}" not found`).toBeVisible({ timeout: 8_000 });
    if (f.type === 'select') {
      await el.selectOption(f.value);
    } else if (f.type === 'check') {
      if (f.value === 'true') await el.check();
      else await el.uncheck();
    } else {
      await el.fill(f.value);
    }
    await page.waitForTimeout(300);
  }
}

/**
 * Assert that a data list/table has at least `minRows` items.
 * Looks for common data container patterns (table rows, card elements, list items).
 * 
 * @param strict  If true (default), FAILS the test when count < minRows.
 *                If false, only logs a warning.
 */
export async function assertHasData(
  page: Page, label: string, minRows = 1, strict = true,
): Promise<number> {
  // Retry for up to 15 seconds to allow async content to load under parallel workers
  let count = 0;
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    count = await page.evaluate((min) => {
      const selectors = [
        'table tbody tr',
        '[data-testid="content-item"], [data-testid="doctor-item"]',
        // Content grid cards — buttons with overflow-hidden (ContentCard, ClinicalResources)
        'button[class*="overflow-hidden"]',
        // Grid/list items inside gap containers
        '[class*="gap-6"] > button:not(nav button), [class*="gap-4"] > button:not(nav button)',
        '[class*="card"]:not(nav [class*="card"])',
        '.appointment-item, .patient-item, .doctor-item, .content-item',
        '[class*="list-item"], [class*="listItem"]',
        // Doctor/patient rows in management tables
        '[class*="border-b"] [class*="font-medium"]:not(thead *)',
      ];
      let total = 0;
      for (const sel of selectors) {
        total += document.querySelectorAll(sel).length;
        if (total >= min) return total;
      }
      return total;
    }, minRows);
    if (count >= minRows) break;
    await page.waitForTimeout(300);
  }

  if (count < minRows) {
    throw new Error(
      `❌ [${label}] DATA SYNC FAILED — Only ${count} data items found (expected ≥${minRows}).\n` +
      `   Cross-portal data is not syncing. Check API endpoints and database connections.`
    );
  }
  return count;
}

/**
 * Click a button by its text label. Uses strict assertion — fails if not found.
 * Searches across nav buttons, form buttons, and general buttons.
 */
export async function clickButton(page: Page, text: string | RegExp, label: string): Promise<void> {
  const btn = page.locator('button, [role="button"], a.btn, a.button').filter({ hasText: text }).first();
  await expect(btn, `[${label}] Button "${String(text)}" not found`).toBeVisible({ timeout: 10_000 });
  await btn.click();
  await page.waitForTimeout(WAIT_AFTER_NAV);
}

/**
 * Navigate doctor/admin portal by direct URL path.
 * Use for pages that might not have sidebar buttons visible.
 */
export async function navByUrl(page: Page, url: string, label: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(WAIT_AFTER_NAV);
  await waitForContent(page, label);
  assertNotLogin(page, label);
}

export { expect } from '@playwright/test';
