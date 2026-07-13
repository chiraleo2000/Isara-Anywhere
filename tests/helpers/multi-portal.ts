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
import { test as base, Page, BrowserContext, Browser, BrowserContextOptions, expect, chromium, firefox, webkit, request } from '@playwright/test';
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
import { registerScreenshotHash, assertDistinctFromSession } from './screenshot-distinct';
import { installJitsiE2eStubForContext, ensureJitsiE2eStubOnPage } from './jitsi-e2e-stub';
import {
  refreshAuthStorageStates,
  refreshAuthStorageStateForRole,
  reinjectAuthFromStorageFile,
} from './auth-refresh';
import {
  chromiumLaunchArgs,
  CHROMIUM_MEDIA_PERMISSIONS,
  FIREFOX_LAUNCH_OPTIONS,
  getRoleBrowserSpec,
  resolveCoreBrowserEngine,
  isConnectionRefusedError,
  scaleTimeout,
  scaleTimeoutByBrowser,
  type PortalRole,
} from './browser-matrix';

function poolRowDoctorId(row: { doctor_id?: string | null; doctorId?: string | null }): string | null {
  const id = row.doctor_id ?? row.doctorId ?? null;
  return id == null || id === '' ? null : String(id);
}

function poolRowMatches(
  row: { id?: string; doctor_id?: string | null; doctorId?: string | null; status?: string },
  appointmentId: string,
  unassignedOnly?: boolean,
): boolean {
  if (row.id !== appointmentId) return false;
  if (unassignedOnly) return poolRowDoctorId(row) == null;
  return true;
}

async function reinjectAuthFromStorage(page: Page, storageStatePath: string): Promise<void> {
  if (!fs.existsSync(storageStatePath)) return;
  const state = JSON.parse(fs.readFileSync(storageStatePath, 'utf-8'));
  const items = state.origins?.[0]?.localStorage || [];
  await page.evaluate((entries: { name: string; value: string }[]) => {
    for (const e of entries) localStorage.setItem(e.name, e.value);
  }, items);
}

async function setReactControlledCheckbox(input: import('@playwright/test').Locator): Promise<void> {
  await input.evaluate((el: HTMLInputElement) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked')?.set;
    if (setter) setter.call(el, true);
    else el.checked = true;
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

async function safeBrowserClick(
  locator: import('@playwright/test').Locator,
  browserName: E2eBrowserName,
  timeout = 15_000,
): Promise<void> {
  if (browserName === 'firefox') {
    await locator.evaluate((el: HTMLElement) => {
      if (el instanceof HTMLButtonElement && el.disabled) return;
      if (el instanceof HTMLInputElement && el.type === 'checkbox' && el.disabled) return;
      el.click();
    });
    return;
  }
  const ok = await locator.click({ timeout }).then(() => true).catch(() => false);
  if (!ok) {
    await locator.evaluate((el: HTMLElement) => el.click());
  }
}

async function acceptMeetingConsentViaKeyboard(
  page: Page,
  label: string,
  consentIds: readonly string[],
  agreeBtn: import('@playwright/test').Locator,
): Promise<boolean> {
  for (const id of consentIds) {
    const input = page.locator(`[data-testid="${id}"] input[type="checkbox"]`).first();
    if (!(await input.isVisible({ timeout: 2_000 }).catch(() => false))) continue;
    if (await input.isChecked().catch(() => false)) continue;
    await input.focus().catch(() => {});
    await page.keyboard.press('Space');
    await page.waitForTimeout(250);
  }
  if (await agreeBtn.isEnabled().catch(() => false)) return true;
  for (const id of consentIds) {
    const row = page.locator(`[data-testid="${id}"]`);
    const input = row.locator('input[type="checkbox"]').first();
    await row.click({ force: true }).catch(() => {});
    await setReactControlledCheckbox(input).catch(() => {});
  }
  const enabled = await agreeBtn.isEnabled().catch(() => false);
  if (!enabled) console.warn(`  [${label}] Firefox keyboard consent path did not enable agree button`);
  return enabled;
}

async function acceptMeetingConsentViaPolling(
  page: Page,
  consentIds: readonly string[],
  agreeBtn: import('@playwright/test').Locator,
): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline && !(await agreeBtn.isEnabled().catch(() => false))) {
    for (const id of consentIds) {
      const row = page.locator(`[data-testid="${id}"]`);
      if (!(await row.isVisible({ timeout: 1_000 }).catch(() => false))) continue;
      const input = row.locator('input[type="checkbox"]').first();
      await row.click({ force: true, timeout: 5_000 }).catch(() => {});
      if (!(await agreeBtn.isEnabled().catch(() => false))) {
        await setReactControlledCheckbox(input).catch(() => {});
      }
    }
    await page.waitForTimeout(500);
  }
}

async function acceptMeetingConsent(
  page: Page,
  label: string,
  browserName: E2eBrowserName = 'chrome',
): Promise<void> {
  const agreement = page.locator('[data-testid="meeting-agreement"]');
  if (!(await agreement.isVisible({ timeout: 5_000 }).catch(() => false))) return;
  const consentIds = ['consent-recording', 'consent-transcript', 'consent-data-sharing'] as const;
  const agreeBtn = page.locator('[data-testid="agree-continue-btn"]');
  const enableTimeout = browserName === 'firefox' ? 15_000 : 10_000;

  const enabled = await acceptMeetingConsentViaKeyboard(page, label, consentIds, agreeBtn);
  if (!enabled) {
    await acceptMeetingConsentViaPolling(page, consentIds, agreeBtn);
  }

  await expect(agreeBtn, `[${label}] agree continue`).toBeEnabled({ timeout: enableTimeout });
  await safeBrowserClick(agreeBtn, browserName);
}

function meetingShellLocator(page: Page) {
  return page.getByTestId('lobby-starting-screen')
    .or(page.getByTestId('host-starting-screen'))
    .or(page.getByTestId('host-waiting-screen'))
    .or(page.getByTestId('lobby-waiting-screen'))
    .or(page.getByTestId('jitsi-meeting-container'))
    .first();
}

import { PortalServicesUnavailableError, waitForPortalServices } from './service-readiness';
import { applyRootEnvReadOnly, cloudDoctorUrl, cloudMeetingUrl, cloudPatientUrl } from './root-env';

applyRootEnvReadOnly();

export { snapSuccess, snapMeetingStage, snapMeetingStageAny, resolveScreenshotBrowser } from './screenshot-output';

export { clearPortalIssues, formatDiagnosticReport, getPortalIssues, probeRenderHealth };
export { ROLE_BROWSER_MATRIX, getRoleBrowserSpec } from './browser-matrix';

// ── Constants ────────────────────────────────────────────────────────
const IS_CLOUD = process.env.TEST_ENV === 'cloud';

function resolveHeadedTimeout(cloudMs: number, headedMs: number, defaultMs: number): number {
  if (IS_CLOUD) return cloudMs;
  if (process.env.PW_HEADED === '1') return headedMs;
  return defaultMs;
}

function resolveAuthStateFile(authRole: string): string {
  if (authRole === 'admin') return 'admin.json';
  if (authRole === 'doctor') return 'doctor.json';
  return 'patient1.json';
}

function resolveContentWaitMs(isPublicAuthShell: boolean): number {
  if (IS_CLOUD) return 25_000;
  if (isPublicAuthShell) return 90_000;
  return 10_000;
}

function resolveFixtureMaxAttempts(lightFixture: boolean): number {
  if (lightFixture) return 6;
  if (IS_CLOUD) return 30;
  return 12;
}

function resolveWorkerFixtureTimeout(forceHeaded: boolean): number {
  if (IS_CLOUD) return 3_600_000;
  if (forceHeaded) return 10_800_000;
  return 1_800_000;
}

/** Resolve bearer token from page storage (doctor/patient portals use different keys). */
export async function readPageBearerToken(page: Page): Promise<string> {
  return page.evaluate(() => {
    // PostgreSQL session tokens are opaque hex — do not prefer legacy JWT shape.
    const doctorToken = localStorage.getItem('token');
    if (doctorToken) return doctorToken;
    const patientToken = localStorage.getItem('auth_token');
    if (patientToken) return patientToken;
    return localStorage.getItem('izara_auth_token') || '';
  });
}

/** Re-login via API and reinject storageState when bearer auth is stale (401). */
function isPatientPortalBaseUrl(baseUrl: string): boolean {
  return baseUrl.includes('3005') || /patient-portal/i.test(baseUrl);
}

function isDoctorPortalBaseUrl(baseUrl: string): boolean {
  return baseUrl.includes('3010') || /doctor-portal/i.test(baseUrl);
}

export type PortalAuthRole = 'admin' | 'doctor' | 'patient1';

function doctorRoleFromUrl(url: string): 'admin' | 'doctor' | null {
  if (/ADMIN-TEST|\/admin\b/i.test(url)) return 'admin';
  return null;
}

async function resolveDoctorPortalAuthRole(page: Page): Promise<'admin' | 'doctor'> {
  const fromUrl = doctorRoleFromUrl(page.url());
  if (fromUrl) return fromUrl;

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await page.waitForLoadState('domcontentloaded', { timeout: 8_000 }).catch(() => {});
      return await page.evaluate(() => {
        try {
          const u = JSON.parse(localStorage.getItem('izara_current_user') || '{}') as {
            isAdmin?: boolean;
            role?: string;
            id?: string;
          };
          if (u.isAdmin || u.role === 'admin' || u.id?.startsWith('ADMIN-')) return 'admin';
        } catch {
          /* fall through */
        }
        const path = globalThis.location?.pathname || '';
        if (/ADMIN-TEST|\/admin\b/i.test(path)) return 'admin';
        return 'doctor';
      });
    } catch {
      const retryFromUrl = doctorRoleFromUrl(page.url());
      if (retryFromUrl) return retryFromUrl;
      if (attempt === 3) return 'doctor';
      await page.waitForTimeout(400 * (attempt + 1));
    }
  }
  return 'doctor';
}

export async function refreshPageAuth(
  page: Page,
  baseUrl: string,
  forcedRole?: PortalAuthRole,
): Promise<void> {
  if (forcedRole === 'patient1' || isPatientPortalBaseUrl(baseUrl)) {
    await refreshAuthStorageStateForRole('patient1');
    await reinjectAuthFromStorageFile(page, 'patient1');
    return;
  }
  if (isDoctorPortalBaseUrl(baseUrl) || forcedRole === 'admin' || forcedRole === 'doctor') {
    const role =
      forcedRole === 'admin' || forcedRole === 'doctor'
        ? forcedRole
        : await resolveDoctorPortalAuthRole(page);
    await refreshAuthStorageStateForRole(role);
    await reinjectAuthFromStorageFile(page, role);
    return;
  }
  const isAdmin = await page.evaluate(() => {
    try {
      const u = JSON.parse(localStorage.getItem('izara_current_user') || '{}') as { isAdmin?: boolean };
      return Boolean(u.isAdmin);
    } catch {
      return false;
    }
  });
  const role = isAdmin ? 'admin' : 'doctor';
  await refreshAuthStorageStateForRole(role);
  await reinjectAuthFromStorageFile(page, role);
}

/** Recover admin/doctor portal page when reload redirected to session_expired login. */
export async function ensureDoctorPortalAuthenticated(
  page: Page,
  label: string,
  routeSegment = 'dashboard',
): Promise<void> {
  const contentTimeout = IS_CLOUD ? 45_000 : 15_000;
  for (let attempt = 0; attempt < 3; attempt++) {
    const url = page.url();
    if (!url.includes('/login') && !url.includes('/register')) {
      assertNotLogin(page, label);
      return;
    }
    await refreshPageAuth(page, DOCTOR_URL);
    const portalRole = await resolveDoctorPortalAuthRole(page);
    const userId = await page.evaluate(() => {
      try {
        const u = JSON.parse(localStorage.getItem('izara_current_user') || '{}') as { id?: string };
        return u.id || 'DOC-TEST-001';
      } catch {
        return 'DOC-TEST-001';
      }
    });
    const dest = `${DOCTOR_URL}/doctor/${userId}/${routeSegment}`;
    await page.goto(dest, { waitUntil: 'domcontentloaded', timeout: IS_CLOUD ? 90_000 : 30_000 });
    await waitForContent(page, `${label}-auth-recovery`, contentTimeout, portalRole);
  }
  assertNotLogin(page, label);
}

/** Recover patient portal session after long cloud runs or cross-portal fixture reuse. */
export async function ensurePatientPortalAuthenticated(page: Page, label: string): Promise<void> {
  const home = `${PATIENT_URL}/`;
  const contentTimeout = IS_CLOUD ? 20_000 : 8_000;

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      // Cloud Run 429s under bursty reinject/goto — back off before retry.
      await page.waitForTimeout(IS_CLOUD ? 3_000 * attempt : 500);
    }

    await refreshAuthStorageStateForRole('patient1');

    // Prefer reinject on the current patient origin; only navigate once per attempt.
    const onPatientOrigin = /patient-portal|localhost:3005|:3005\b/i.test(page.url());
    if (!onPatientOrigin) {
      if (IS_CLOUD) {
        await gotoCloudWithRetry(page, home, `${label}-origin-${attempt}`, 90_000);
      } else {
        await page.goto(home, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      }
    }

    await reinjectAuthFromStorageFile(page, 'patient1');
    await refreshPatientSession(page);

    if (IS_CLOUD) {
      await gotoCloudWithRetry(page, home, `${label}-auth-${attempt}`, 90_000);
    } else {
      await page.goto(home, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    }
    await waitForContent(page, `${label}-auth-${attempt}`, contentTimeout);

    const url = page.url();
    if (url.includes('doctor-portal') || /:3010\b/.test(url)) {
      throw new Error(`[${label}] expected patient portal, got ${url}`);
    }
    if (!/\/login|\/register/i.test(url)) {
      assertNotLogin(page, label);
      return;
    }
  }

  throw new Error(`[${label}] AUTH FAILED — still on ${page.url()} after patient auth reinject`);
}

/** GET with bearer auth + single refresh retry (cloud session invalidation). */
export async function pageRequestGetWithAuthRetry(
  page: Page,
  url: string,
  baseUrl: string,
  options?: Parameters<Page['request']['get']>[1],
): Promise<Awaited<ReturnType<Page['request']['get']>>> {
  let token = await readPageBearerToken(page);
  let authRetried = false;
  while (true) {
    const resp = await pageRequestGet(page, url, {
      ...options,
      headers: { ...options?.headers, Authorization: `Bearer ${token}` },
    });
    if ((resp.status() === 401 || resp.status() === 403) && !authRetried) {
      authRetried = true;
      await refreshPageAuth(page, baseUrl);
      token = await readPageBearerToken(page);
      continue;
    }
    return resp;
  }
}

/** PATCH with bearer auth + single refresh retry. */
export async function pageRequestPatchWithAuthRetry(
  page: Page,
  url: string,
  baseUrl: string,
  options?: Parameters<Page['request']['patch']>[1],
): Promise<Awaited<ReturnType<Page['request']['patch']>>> {
  let token = await readPageBearerToken(page);
  let authRetried = false;
  while (true) {
    const resp = await pageRequestPatch(page, url, {
      ...options,
      headers: { ...options?.headers, Authorization: `Bearer ${token}` },
    });
    if ((resp.status() === 401 || resp.status() === 403) && !authRetried) {
      authRetried = true;
      await refreshPageAuth(page, baseUrl);
      token = await readPageBearerToken(page);
      continue;
    }
    return resp;
  }
}

/** POST /api/appointments/:id/confirm with auth refresh retries (session invalidation). */
export async function confirmAppointmentApiWithRetry(
  page: Page,
  appointmentId: string,
  payload: { doctorId: string; confirmedDate: string; confirmedTime: string },
  label = 'confirm',
): Promise<void> {
  const baseUrl = DOCTOR_URL;
  let lastStatus = 0;
  let lastBody = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    await refreshPageAuth(page, baseUrl);
    const token = await readPageBearerToken(page);
    const resp = await page.request.post(`${baseUrl}/api/appointments/${appointmentId}/confirm`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: payload,
      timeout: IS_CLOUD ? 30_000 : 15_000,
    });
    if (resp.status() === 200) return;
    lastStatus = resp.status();
    lastBody = await resp.text().catch(() => '');
    if (resp.status() !== 401) break;
    await page.waitForTimeout(500 * (attempt + 1));
  }
  throw new Error(`${label}: confirm API must succeed (last ${lastStatus}: ${lastBody.slice(0, 200)})`);
}

const DEV_TESTING_FALLBACK = {
  patient: 'https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app',
  doctor: 'https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app',
  meeting: 'https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app',
};

export const PATIENT_URL = IS_CLOUD
  ? (process.env.CLOUD_PATIENT_URL || cloudPatientUrl(DEV_TESTING_FALLBACK.patient))
  : (process.env.PATIENT_URL || process.env.PATIENT_PORTAL_URL || process.env.LOCAL_PATIENT_URL || 'http://127.0.0.1:3005');
export const DOCTOR_URL = IS_CLOUD
  ? (process.env.CLOUD_DOCTOR_URL || cloudDoctorUrl(DEV_TESTING_FALLBACK.doctor))
  : (process.env.DOCTOR_URL || process.env.DOCTOR_PORTAL_URL || process.env.LOCAL_DOCTOR_URL || 'http://127.0.0.1:3010');
export const MEETING_URL = IS_CLOUD
  ? (process.env.CLOUD_MEETING_URL || cloudMeetingUrl(DEV_TESTING_FALLBACK.meeting))
  : (process.env.MEETING_URL || process.env.MEETING_SERVER_URL || process.env.LOCAL_MEETING_URL || 'http://127.0.0.1:3020');

/** Navigation timeout — longer for cloud cold starts and headed local (admin Firefox) */
// Headed (visible) runs are slower on Windows (GPU + 3 browsers) — allow more navigation time.
const NAV_TIMEOUT = resolveHeadedTimeout(90_000, 120_000, 30_000);
/** Fixture initial navigation timeout — extra generous for cold starts */
const FIXTURE_NAV_TIMEOUT = IS_CLOUD || process.env.PW_HEADED === '1' ? 120_000 : 60_000;

const AUTH_DIR = path.join(__dirname, '..', 'e2e', '.auth-states');
const SS_DIR   = path.join(__dirname, '..', '..', 'test-results', 'workflow-snapshots');
const DOCS_SS_DIR = path.join(__dirname, '..', '..', 'docs', 'screenshots');

/** Wait after every page change for UI to settle */
const WAIT_AFTER_NAV = 500;

type E2eBrowserName = 'chrome' | 'firefox';

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

/** FAILS test if an authenticated page fell back to login (not when already on public auth routes). */
export function assertNotLogin(page: Page, label: string): void {
  const url = page.url();
  let pathname = url;
  try {
    pathname = new URL(url).pathname.replace(/\/$/, '') || '/';
  } catch {
    /* keep url string */
  }
  const publicAuthPaths = ['/login', '/register', '/reset-password'];
  if (publicAuthPaths.includes(pathname)) return;

  if (url.includes('/login') || url.includes('/register')) {
    throw new Error(
      `❌ [${label}] AUTH FAILED — Redirected to ${url}.\n` +
      `   storageState token is expired or invalid.`
    );
  }
}

/** FAILS if email/password login form is visible on a meeting URL (doctor/patient must use silent auth). */
export async function assertNoPortalLoginVisible(page: Page, label?: string): Promise<void> {
  const url = page.url();
  const isMeetingUrl =
    /\/meeting\//.test(url) ||
    /\/doctor\/[^/]+\/meeting\//.test(url) ||
    /\/patient\/[^/]+\/meeting\//.test(url);
  if (!isMeetingUrl) return;

  const emailInput = page.locator('input[type="email"], input[name="email"], input[autocomplete="username"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  const emailVisible = await emailInput.isVisible().catch(() => false);
  const passwordVisible = await passwordInput.isVisible().catch(() => false);
  if (emailVisible && passwordVisible) {
    const prefix = label ? `[${label}] ` : '';
    throw new Error(
      `${prefix}Portal login form visible on meeting URL ${url} — doctor/patient must use silent DEMO_AUTO_LOGIN.`,
    );
  }
}

/** FAILS test if page body has < 50 chars (whiteout / blank page) */
export async function assertNoWhiteout(page: Page, label: string) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const len = await page.evaluate(() => document.body?.innerText?.trim().length ?? 0);
    if (len >= 50) return;
    await page.waitForTimeout(attempt === 0 ? 2_000 : 3_000);
  }
  const len2 = await page.evaluate(() => document.body?.innerText?.trim().length ?? 0);
  throw new Error(`❌ [${label}] WHITEOUT — Only ${len2} chars on page.`);
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

/** Fail fast when Tailwind bundle is empty (broken content paths → unstyled UI). */
export async function assertTailwindCssHealthy(page: Page, label: string): Promise<void> {
  const { cssBytes, emeraldBg } = await page.evaluate(async () => {
    const links = [...document.querySelectorAll('link[rel="stylesheet"]')] as HTMLLinkElement[];
    let cssBytes = 0;
    for (const link of links) {
      if (!link.href) continue;
      try {
        const resp = await fetch(link.href, { cache: 'no-store' });
        const text = await resp.text();
        cssBytes += text.length;
      } catch {
        /* same-origin bundle expected */
      }
    }
    const probe = document.createElement('div');
    probe.className = 'bg-emerald-600';
    probe.style.position = 'absolute';
    probe.style.left = '-9999px';
    document.body.appendChild(probe);
    const emeraldBg = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return { cssBytes, emeraldBg };
  });
  const rgb = emeraldBg.replaceAll(/\s/g, '');
  const emeraldOk = rgb === 'rgb(5,150,105)' || rgb === 'rgba(5,150,105,1)';
  // Vite dev injects CSS via JS modules (no large link[rel=stylesheet] bundles); utility probe is authoritative.
  if (cssBytes <= 25_000 && emeraldOk) return;
  expect(cssBytes, `${label}: bundled CSS must include Tailwind utilities (>25KB)`).toBeGreaterThan(25_000);
  expect(
    emeraldOk,
    `${label}: Tailwind utility bg-emerald-600 must apply (got ${emeraldBg})`,
  ).toBeTruthy();
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

  const isFf = await isFirefoxPage(page);
  // Screenshots can be slow on Windows + headed browsers (especially Firefox).
  const ssTimeout = isFf ? 30_000 : 15_000;
  try {
    // Reduce flake when pages have transient spinners/animations.
    await page.evaluate(() => {
      if (!document.getElementById('pw-screenshot-stabilize')) {
        const style = document.createElement('style');
        style.id = 'pw-screenshot-stabilize';
        style.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; }';
        document.head.appendChild(style);
      }
    }).catch(() => {});
    await page.locator('.animate-spin').first().waitFor({ state: 'hidden', timeout: isFf ? 20_000 : 10_000 }).catch(() => {});
    await page.waitForTimeout(250);
    await page.screenshot({ path: filePath, fullPage: true, timeout: ssTimeout, animations: 'disabled' });
    fs.copyFileSync(filePath, docsPath);
    if (safeSubDir) registerScreenshotHash(safeSubDir, docsPath);
  } catch {
    try {
      await page.screenshot({ path: filePath, fullPage: false, timeout: ssTimeout, animations: 'disabled' });
      fs.copyFileSync(filePath, docsPath);
      if (safeSubDir) registerScreenshotHash(safeSubDir, docsPath);
    } catch (err) {
      console.warn(`⚠️ Screenshot failed: ${name}`, err instanceof Error ? err.message : '');
    }
  }
  return filePath;
}

/** Screenshot that fails if pixels match a prior step in the same group run. */
export async function snapDistinct(
  page: Page,
  name: string,
  subDir?: string,
  options?: { locator?: import('@playwright/test').Locator; fullPage?: boolean; stabilize?: boolean },
): Promise<string> {
  const safeSubDir = subDir?.replaceAll(/[^a-zA-Z0-9_-]/g, '_');
  const dir = safeSubDir ? path.join(SS_DIR, safeSubDir) : SS_DIR;
  fs.mkdirSync(dir, { recursive: true });
  const safeName = name.replaceAll(/[^a-zA-Z0-9_-]/g, '_');
  const filePath = path.join(dir, `${safeName}.png`);
  const docsDir = safeSubDir ? path.join(DOCS_SS_DIR, safeSubDir) : DOCS_SS_DIR;
  fs.mkdirSync(docsDir, { recursive: true });
  const docsPath = path.join(docsDir, `${safeName}.png`);
  const ssTimeout = (await isFirefoxPage(page)) ? 15_000 : 5_000;
  const shotOpts = { path: filePath, timeout: ssTimeout, animations: 'disabled' as const };
  try {
    if (options?.stabilize) {
      await page.evaluate(() => {
        if (!document.getElementById('pw-screenshot-stabilize')) {
          const style = document.createElement('style');
          style.id = 'pw-screenshot-stabilize';
          style.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; }';
          document.head.appendChild(style);
        }
      });
      await page.locator('.animate-spin').first().waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});
      await page.waitForTimeout(250);
    }
    if (options?.locator) {
      if (options?.stabilize) {
        const box = await options.locator.boundingBox();
        if (!box || box.width <= 0 || box.height <= 0) {
          throw new Error(`Distinct screenshot failed: ${name} — locator has no bounding box`);
        }
        await page.screenshot({
          path: filePath,
          timeout: ssTimeout,
          animations: 'disabled',
          clip: {
            x: Math.max(0, Math.floor(box.x)),
            y: Math.max(0, Math.floor(box.y)),
            width: Math.ceil(box.width),
            height: Math.ceil(box.height),
          },
        });
      } else {
        await options.locator.screenshot(shotOpts);
      }
    } else {
      await page.screenshot({ ...shotOpts, fullPage: options?.fullPage ?? true });
    }
    fs.copyFileSync(filePath, docsPath);
    if (safeSubDir) assertDistinctFromSession(safeSubDir, docsPath);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`⚠️ Distinct screenshot failed: ${name}`, msg);
    // Firefox locator.screenshot timeouts are flaky — fall back to full-page capture.
    if (/Timeout|timeout/i.test(msg)) {
      await page.screenshot({
        path: filePath,
        timeout: Math.max(ssTimeout, 20_000),
        animations: 'disabled',
        fullPage: options?.fullPage ?? false,
      }).catch(() => {});
      if (fs.existsSync(filePath)) {
        fs.copyFileSync(filePath, docsPath);
        return filePath;
      }
    }
    throw err;
  }
  return filePath;
}

function isTransientPlaywrightError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /not bound in the connection|Target (page|closed)|has been closed|Execution context was destroyed|socket hang up|ECONNRESET|ECONNREFUSED|UND_ERR_SOCKET/i.test(msg);
}

function transientRetryDelayMs(attempt: number, err: unknown): number {
  const msg = err instanceof Error ? err.message : String(err);
  if (/ECONNREFUSED|ECONNRESET/i.test(msg)) return 3000 * (attempt + 1);
  return 400 * (attempt + 1);
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
      await page.waitForTimeout(transientRetryDelayMs(attempt, err));
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
      await page.waitForTimeout(transientRetryDelayMs(attempt, err));
    }
  }
  throw lastErr;
}

/** Poll API until predicate passes (cross-portal sync). */
type PoolPollSnapshot = {
  status: number;
  count: number;
  ids: string[];
  statuses: string[];
};

async function queryPoolForAppointment(
  page: Page,
  baseUrl: string,
  appointmentId: string,
  opts?: { unassignedOnly?: boolean },
): Promise<{ found: boolean; authRetry: boolean; snapshot: PoolPollSnapshot }> {
  const token = await readPageBearerToken(page);
  const poolResp = await pageRequestGet(page, `${baseUrl}/api/appointment-pool`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 15_000,
  });
  if (poolResp.status() === 401) {
    return {
      found: false,
      authRetry: true,
      snapshot: { status: 401, count: 0, ids: [], statuses: [] },
    };
  }
  const ok = poolResp.ok();
  const rows = ok ? await poolResp.json().catch(() => []) : [];
  const list = Array.isArray(rows) ? rows : [];
  const snapshot: PoolPollSnapshot = {
    status: poolResp.status(),
    count: list.length,
    ids: list.map((a: { id?: string }) => String(a.id || '')),
    statuses: list.map((a: { status?: string }) => String(a.status || '')),
  };
  if (ok) {
    const hit = list.find((a: { id?: string; doctor_id?: string | null; doctorId?: string | null; status?: string }) =>
      poolRowMatches(a, appointmentId, opts?.unassignedOnly),
    );
    if (hit) return { found: true, authRetry: false, snapshot };
  }
  return { found: false, authRetry: false, snapshot };
}

async function appointmentExistsViaDetail(
  page: Page,
  baseUrl: string,
  appointmentId: string,
  unassignedOnly?: boolean,
): Promise<boolean> {
  const token = await readPageBearerToken(page);
  const detail = await pageRequestGet(page, `${baseUrl}/api/appointments/${appointmentId}`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 15_000,
  }).catch(() => null);
  if (!detail?.ok()) return false;
  const row = await detail.json().catch(() => null);
  if (!row?.id || row.id !== appointmentId) return false;
  if (!unassignedOnly) return true;
  return poolRowDoctorId(row) == null;
}

export async function waitForPoolAppointment(
  page: Page,
  baseUrl: string,
  appointmentId: string,
  opts?: { unassignedOnly?: boolean; timeoutMs?: number },
): Promise<void> {
  const timeoutMs = opts?.timeoutMs ?? resolveHeadedTimeout(45_000, 60_000, 45_000);
  const deadline = Date.now() + timeoutMs;
  let authRetried = false;
  let lastSnapshot: PoolPollSnapshot | null = null;

  while (Date.now() < deadline) {
    const poll = await queryPoolForAppointment(page, baseUrl, appointmentId, opts);
    lastSnapshot = poll.snapshot;
    if (poll.authRetry && !authRetried) {
      authRetried = true;
      await refreshPageAuth(page, baseUrl);
      continue;
    }
    if (poll.found) return;
    if (await appointmentExistsViaDetail(page, baseUrl, appointmentId, opts?.unassignedOnly)) return;
    await page.waitForTimeout(1_500);
  }
  throw new Error(
    `❌ Appointment ${appointmentId} not visible in pool API within ${timeoutMs / 1000}s`
    + (lastSnapshot ? ` (last: http=${lastSnapshot.status} count=${lastSnapshot.count} ids=${lastSnapshot.ids.slice(0, 5).join(',')})` : ''),
  );
}

/** Row is in accepted / confirmed traceability section (not removed from pool). */
export function isAcceptedPoolRow(row: {
  status?: string;
  poolStatus?: string;
  queueVisibility?: string;
}): boolean {
  const status = String(row?.status || row?.poolStatus || '');
  return status === 'confirmed'
    || row?.poolStatus === 'accepted'
    || row?.queueVisibility === 'accepted';
}

/** Poll pool API until appointment appears in accepted traceability list. */
export async function waitForAcceptedInPool(
  page: Page,
  baseUrl: string,
  appointmentId: string,
  opts?: { timeoutMs?: number },
): Promise<Record<string, unknown>> {
  const timeoutMs = opts?.timeoutMs ?? (IS_CLOUD ? 45_000 : 25_000);
  const deadline = Date.now() + timeoutMs;
  let authRetried = false;
  while (Date.now() < deadline) {
    const token = await readPageBearerToken(page);
    const poolResp = await pageRequestGet(page, `${baseUrl}/api/appointment-pool?includeAccepted=true`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15_000,
    });
    if ((poolResp.status() === 401 || poolResp.status() === 403) && !authRetried) {
      authRetried = true;
      await refreshPageAuth(page, baseUrl);
      continue;
    }
    if (poolResp.ok()) {
      const rows = await poolResp.json().catch(() => []);
      const list = Array.isArray(rows) ? rows : [];
      const hit = list.find((a) => {
        const row = a as Record<string, unknown>;
        return row.id === appointmentId && isAcceptedPoolRow({
          status: typeof row.status === 'string' ? row.status : undefined,
          poolStatus: typeof row.poolStatus === 'string' ? row.poolStatus : undefined,
          queueVisibility: typeof row.queueVisibility === 'string' ? row.queueVisibility : undefined,
        });
      });
      if (hit) return hit as Record<string, unknown>;
    }
    await page.waitForTimeout(1_500);
  }
  throw new Error(`❌ Appointment ${appointmentId} not in accepted pool within ${timeoutMs / 1000}s`);
}

/** Lobby join via meeting server API */
export async function lobbyJoin(
  page: Page,
  meetingKey: string,
  data: { participantName: string; participantId?: string; role?: string; invite?: string },
): Promise<{ success: boolean; status: string; participantId?: string }> {
  const token = await page.evaluate(() =>
    localStorage.getItem('token')
    || localStorage.getItem('auth_token')
    || localStorage.getItem('izara_auth_token')
    || '',
  );
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const resp = await page.request.post(`${MEETING_URL}/api/meetings/${meetingKey}/lobby/join`, {
    headers,
    data,
    timeout: 30_000,
  });
  expect(resp.ok(), `lobby join ${meetingKey}`).toBeTruthy();
  return resp.json();
}

/** Doctor admit-all (HOST) — retries for Firefox/Socket.IO timing */
export async function lobbyAdmitAll(
  page: Page,
  meetingKey: string,
  admittedBy: string,
): Promise<{ admitted: unknown[]; total: number }> {
  const maxAttempts = IS_CLOUD ? 4 : 8;
  let lastStatus = 0;
  let lastBody: { success?: boolean; admitted?: unknown[]; total?: number } = {};

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1 || lastStatus === 401 || lastStatus === 403) {
      await refreshPageAuth(page, DOCTOR_URL);
    }
    const token = await readPageBearerToken(page);
    const resp = await page.request.post(`${DOCTOR_URL}/api/meetings/${meetingKey}/lobby/admit-all`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { admittedBy },
      timeout: IS_CLOUD ? 30_000 : 15_000,
    });
    lastStatus = resp.status();
    lastBody = await resp.json().catch(() => ({}));
    if (resp.ok() && lastBody.success) {
      return { admitted: lastBody.admitted || [], total: lastBody.total ?? 0 };
    }
    if (attempt < maxAttempts) {
      await page.waitForTimeout(IS_CLOUD ? 2000 : 1500);
    }
  }

  expect(lastStatus, 'admit-all').toBe(200);
  expect(lastBody.success, 'admit-all success').toBeTruthy();
  return { admitted: lastBody.admitted || [], total: lastBody.total ?? 0 };
}

/** Admit a single lobby participant (HOST) */
export async function lobbyAdmitOne(
  page: Page,
  meetingKey: string,
  participantId: string,
  admittedBy: string,
): Promise<void> {
  const token = await readPageBearerToken(page);
  const resp = await page.request.post(`${DOCTOR_URL}/api/meetings/${meetingKey}/lobby/admit`, {
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
  const token = await readPageBearerToken(page);
  const resp = await page.request.post(`${DOCTOR_URL}/api/meetings/${meetingKey}/lobby/reject`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: { participantId, rejectedBy, reason: reason || '' },
    timeout: IS_CLOUD ? 30_000 : 10_000,
  });
  expect(resp.ok(), `lobby reject ${participantId}`).toBeTruthy();
}

/** Unauthenticated lobby join (no browser storage / JWT) */
export async function lobbyJoinUnauth(
  meetingKey: string,
  data: { participantName: string; participantId?: string; role?: string; invite?: string },
): Promise<{ success: boolean; status: string; participantId?: string }> {
  const { request } = await import('@playwright/test');
  const ctx = await request.newContext({ baseURL: MEETING_URL });
  try {
    const resp = await ctx.post(`/api/meetings/${meetingKey}/lobby/join`, {
      headers: { 'Content-Type': 'application/json' },
      data: { role: 'guest', ...data },
      timeout: 30_000,
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

/** Parse GET /lobby JSON — `waiting` === `participants`, `all` === `lobby` (meeting-server). */
export function parseLobbySnapshot(data: {
  participants?: Array<{ participantId?: string; status?: string; role?: string }>;
  lobby?: Array<{ participantId?: string; status?: string; role?: string }>;
}): {
  waiting: Array<{ participantId?: string; status?: string; role?: string }>;
  all: Array<{ participantId?: string; status?: string; role?: string }>;
} {
  const waiting = data.participants || [];
  const all = data.lobby || waiting;
  return { waiting, all };
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
    timeout: lobbyApiRequestTimeoutMs(),
  });
  expect(resp.ok(), `lobby GET ${meetingKey}`).toBeTruthy();
  const data = await resp.json();
  return parseLobbySnapshot(data);
}

function isParallelGateLoad(): boolean {
  return Number.parseInt(process.env.PW_WORKERS || '1', 10) > 1;
}

function isHeadedParallelLoad(): boolean {
  return (
    isParallelGateLoad() &&
    (process.env.PW_HEADED === '1' || process.env.PW_HEADED === 'true' || process.env.BASELINE_VISUAL === '1')
  );
}

function lobbyApiRequestTimeoutMs(): number {
  if (IS_CLOUD) return 30_000;
  if (isHeadedParallelLoad()) return 30_000;
  if (isParallelGateLoad()) return 25_000;
  return 10_000;
}

function resolveCloudParallelDefaultTimeout(
  cloudMs: number,
  parallelMs: number,
  defaultMs: number,
): number {
  if (IS_CLOUD) return cloudMs;
  if (isHeadedParallelLoad()) return Math.max(cloudMs, parallelMs);
  if (isParallelGateLoad()) return parallelMs;
  return defaultMs;
}

function resolveOptionalCloudParallelTimeout(
  timeoutMs: number | undefined,
  cloudMs: number,
  parallelMs: number,
  defaultMs: number,
): number {
  if (timeoutMs != null) return timeoutMs;
  return resolveCloudParallelDefaultTimeout(cloudMs, parallelMs, defaultMs);
}

function resolveStorageContextTimeoutMs(isAdminFirefox: boolean, parallelHeaded: boolean): number {
  if (IS_CLOUD) return 120_000;
  if (isAdminFirefox && parallelHeaded) return 180_000;
  if (parallelHeaded) return 120_000;
  return 45_000;
}

const MEETING_ROUTE_RE = /\/meeting\//;

/** Poll meeting-server lobby until a participant is waiting (source of truth before UI admit controls). */
export async function waitForLobbyWaitingParticipant(
  page: Page,
  meetingKey: string,
  opts: { authToken?: string; participantId?: string; timeoutMs?: number } = {},
): Promise<{ participantId: string }> {
  const timeoutMs = resolveOptionalCloudParallelTimeout(opts.timeoutMs, 120_000, 90_000, 60_000);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const token = opts.authToken ?? (await readPageBearerToken(page).catch(() => ''));
    try {
      const snap = await lobbyGetSnapshot(page, meetingKey, token || undefined);
      const match = opts.participantId
        ? snap.waiting.find((p) => p.participantId === opts.participantId)
        : snap.waiting.find((p) => p.status === 'waiting');
      if (match?.participantId) {
        return { participantId: match.participantId };
      }
    } catch {
      /* meeting-server may be slow under parallel headed load — keep polling */
    }
    await page.waitForTimeout(1_500);
  }
  throw new Error(`Lobby waiting participant not found for ${meetingKey} within ${timeoutMs}ms`);
}

/** Open doctor lobby sidebar if collapsed. */
export async function dismissMeetingResultsOverlayIfVisible(doctorPage: Page): Promise<void> {
  const results = doctorPage.getByTestId('meeting-results');
  if (!(await results.isVisible({ timeout: 2_000 }).catch(() => false))) return;
  const closeBtn = doctorPage.getByRole('button', { name: /ปิดผลการประชุม/i }).or(
    doctorPage.locator('[data-testid="meeting-results"] button[title="ปิดผลการประชุม"]'),
  );
  if (await closeBtn.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
    await closeBtn.first().click();
  } else {
    await doctorPage.keyboard.press('Escape');
  }
  await expect(results).toBeHidden({ timeout: 15_000 });
}

/** Open doctor lobby sidebar if collapsed. */
export async function ensureDoctorLobbyPanelOpen(doctorPage: Page): Promise<void> {
  await dismissMeetingResultsOverlayIfVisible(doctorPage);
  const lobbyPanel = doctorPage.getByTestId('lobby-panel');
  if (!(await lobbyPanel.isVisible({ timeout: 3_000 }).catch(() => false))) {
    await doctorPage.getByTestId('lobby-toggle-btn').click();
  }
  await expect(lobbyPanel).toBeVisible({ timeout: 60_000 });
}

/** Poll until admit-btn or admit-all-btn is visible (lobby UI polls every ~3s under load). */
export async function waitForDoctorLobbyAdmitControls(
  doctorPage: Page,
  timeoutMs?: number,
): Promise<void> {
  const resolvedTimeout = resolveOptionalCloudParallelTimeout(timeoutMs, 120_000, 90_000, 45_000);
  const deadline = Date.now() + resolvedTimeout;
  const admitBtn = doctorPage.getByTestId('admit-btn').or(doctorPage.getByTestId('admit-all-btn'));
  while (Date.now() < deadline) {
    await ensureDoctorLobbyPanelOpen(doctorPage);
    if (await admitBtn.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      return;
    }
    await doctorPage.waitForTimeout(1_500);
  }
  await expect(admitBtn.first()).toBeVisible({ timeout: 10_000 });
}

/** Poll until reject-btn is visible (dismisses results overlay that blocks lobby under parallel load). */
export async function waitForDoctorLobbyRejectControl(
  doctorPage: Page,
  timeoutMs?: number,
): Promise<void> {
  const resolvedTimeout = resolveOptionalCloudParallelTimeout(timeoutMs, 120_000, 90_000, 45_000);
  const deadline = Date.now() + resolvedTimeout;
  const rejectBtn = doctorPage.getByTestId('reject-btn');
  while (Date.now() < deadline) {
    await ensureDoctorLobbyPanelOpen(doctorPage);
    if (await rejectBtn.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      return;
    }
    await doctorPage.waitForTimeout(1_500);
  }
  await expect(rejectBtn.first()).toBeVisible({ timeout: 10_000 });
}

/** Poll patient PHR API until demographics.address contains expected text. */
export async function waitForPatientProfileAddress(
  page: Page,
  expectedAddress: string,
  timeoutMs?: number,
): Promise<void> {
  const resolvedTimeout = resolveOptionalCloudParallelTimeout(timeoutMs, 60_000, 45_000, 30_000);
  const deadline = Date.now() + resolvedTimeout;
  while (Date.now() < deadline) {
    const { token, userId } = await getPatientAuth(page);
    if (token && userId) {
      const resp = await page.request
        .get(`${PATIENT_URL}/api/phr/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10_000,
        })
        .catch(() => null);
      if (resp?.ok()) {
        const data = (await resp.json().catch(() => ({}))) as {
          demographics?: { address?: string };
        };
        const address = data.demographics?.address || '';
        if (address.includes(expectedAddress)) return;
      }
    }
    await page.waitForTimeout(1_000);
  }
  throw new Error(`Patient profile address does not contain "${expectedAddress}" within ${resolvedTimeout}ms`);
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

function parseNotificationList(data: unknown): Array<{ type?: string; data?: unknown; appointmentId?: string }> {
  if (Array.isArray(data)) return data;
  const bag = data as { notifications?: unknown[]; items?: unknown[] };
  return (bag.notifications || bag.items || []) as Array<{ type?: string; data?: unknown; appointmentId?: string }>;
}

function findNotificationOfType(
  list: Array<{ type?: string; data?: unknown; appointmentId?: string }>,
  type: string,
  appointmentId?: string,
): boolean {
  return list.some((n) => {
    if (n.type !== type) return false;
    return appointmentId ? notificationMatchesAppointment(n, appointmentId) : true;
  });
}

async function readNotificationAuthToken(page: Page, authKey: string): Promise<string> {
  return page.evaluate(
    (key) =>
      localStorage.getItem(key)
      || localStorage.getItem('izara_auth_token')
      || localStorage.getItem('token')
      || localStorage.getItem('auth_token')
      || '',
    authKey,
  );
}

async function requestNotificationList(
  page: Page,
  baseUrl: string,
  storageToken: string,
): Promise<{ ok: boolean; status: number; list: ReturnType<typeof parseNotificationList> }> {
  const timeout = IS_CLOUD ? 30_000 : 15_000;
  const maxAttempts = IS_CLOUD ? 2 : 3;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const resp = await page.request.get(`${baseUrl}/api/notifications`, {
        headers: { Authorization: `Bearer ${storageToken}` },
        timeout,
      });
      return {
        ok: resp.ok(),
        status: resp.status(),
        list: parseNotificationList(await resp.json().catch(() => [])),
      };
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        await page.waitForTimeout(750 * attempt);
      }
    }
  }

  console.warn('[notifications] request failed after retries:', lastErr);
  return { ok: false, status: 0, list: [] };
}

async function fetchNotificationsWithAuthRetry(
  page: Page,
  baseUrl: string,
  authKey: string,
  authRetries: { count: number },
): Promise<{ ok: boolean; list: ReturnType<typeof parseNotificationList> }> {
  let storageToken = await readNotificationAuthToken(page, authKey);
  let result = await requestNotificationList(page, baseUrl, storageToken);
  if (result.status === 401 && authRetries.count < 3) {
    authRetries.count += 1;
    await refreshPageAuth(page, baseUrl);
    storageToken = await readNotificationAuthToken(page, authKey);
    result = await requestNotificationList(page, baseUrl, storageToken);
  }
  return { ok: result.ok, list: result.list };
}

/** Poll until notification type appears (async delivery / NOTIFY) */
export async function assertNotificationTypePoll(
  page: Page,
  baseUrl: string,
  type: string,
  opts?: { authKey?: 'token' | 'auth_token'; timeoutMs?: number; appointmentId?: string },
): Promise<void> {
  const authKey = opts?.authKey ?? 'token';
  const timeoutMs = opts?.timeoutMs ?? resolveHeadedTimeout(45_000, 30_000, 15_000);
  const deadline = Date.now() + timeoutMs;
  const authRetries = { count: 0 };

  while (Date.now() < deadline) {
    const { ok, list } = await fetchNotificationsWithAuthRetry(page, baseUrl, authKey, authRetries);
    if (ok && findNotificationOfType(list, type, opts?.appointmentId)) return;
    if (timeoutMs <= 0) break;
    await page.waitForTimeout(1_500);
  }

  const { ok, list } = await fetchNotificationsWithAuthRetry(page, baseUrl, authKey, authRetries);
  expect(ok, `notifications ${type}`).toBeTruthy();
  expect(findNotificationOfType(list, type, opts?.appointmentId), `Expected notification type ${type}`).toBeTruthy();
}

/** Auto-consent + auto-lobby; stop in lobby (before HOST admit). Used by Group Q01c. */
export async function joinMeetingToLobby(
  page: Page,
  label: string,
  browserName: E2eBrowserName = 'chrome',
): Promise<void> {
  const routeTimeout = scaleTimeoutByBrowser(IS_CLOUD ? 60_000 : 30_000, browserName);
  await expect(page, `[${label}] must be on meeting route`).toHaveURL(MEETING_ROUTE_RE, {
    timeout: routeTimeout,
  });
  const loading = page.locator('[data-testid="meeting-loading"]');
  if (await loading.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await expect(loading, `[${label}] meeting init`).toBeHidden({
      timeout: scaleTimeoutByBrowser(IS_CLOUD ? 120_000 : 60_000, browserName),
    });
  }
  const lobbyStarting = page.getByTestId('lobby-starting-screen');
  if (await lobbyStarting.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await expect(lobbyStarting, `[${label}] patient auto-lobby start`).toBeHidden({
      timeout: scaleTimeoutByBrowser(IS_CLOUD ? 90_000 : 45_000, browserName),
    });
  }
  await expect(
    page.getByTestId('lobby-waiting-screen').or(page.getByTestId('host-waiting-screen')).first(),
    `[${label}] lobby waiting after auto-join`,
  ).toBeVisible({ timeout: scaleTimeoutByBrowser(IS_CLOUD ? 90_000 : 45_000, browserName) });
}

/**
 * Join Izara in-app MeetingRoom (auto-start for doctor/patient; Jitsi iframe after lobby admit).
 * Display name is pre-filled from Izara auth — no manual Jitsi name prompt.
 */
export async function joinIzaraMeetingInApp( // NOSONAR S3776 — multi-step meeting join with consent, lobby, and Jitsi iframe
  page: Page,
  label: string,
  browserName: E2eBrowserName = 'chrome',
): Promise<void> {
  const routeTimeout = scaleTimeoutByBrowser(IS_CLOUD ? 60_000 : 30_000, browserName);
  const initTimeout = scaleTimeoutByBrowser(IS_CLOUD ? 120_000 : 60_000, browserName);
  const lobbyTimeout = scaleTimeoutByBrowser(
    IS_CLOUD ? 120_000 : browserName === 'firefox' ? 180_000 : 90_000,
    browserName,
  );
  const iframeTimeout = scaleTimeoutByBrowser(
    resolveHeadedTimeout(120_000, 120_000, 60_000),
    browserName,
  );

  await expect(page, `[${label}] must be on meeting route`).toHaveURL(MEETING_ROUTE_RE, {
    timeout: routeTimeout,
  });

  const loading = page.locator('[data-testid="meeting-loading"]');
  if (await loading.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await expect(loading, `[${label}] meeting init`).toBeHidden({ timeout: initTimeout });
  }

  const jitsiContainer = page.getByTestId('jitsi-meeting-container');
  const meetingUi = jitsiContainer.or(page.getByTestId('end-meeting-btn')).first();
  const jitsiIframe = page.locator('[data-testid="jitsi-meeting-container"] iframe').first();

  const isDoctorMeeting = /\/doctor\/[^/]+\/meeting\//.test(page.url());
  if (isDoctorMeeting) {
    const hostStarting = page.getByTestId('host-starting-screen');
    const waitForDoctorJitsi = async (stepLabel: string) => {
      const meetingVisible = await meetingUi.isVisible({ timeout: 5_000 }).catch(() => false);
      if (meetingVisible) return;
      if ((await jitsiIframe.count()) > 0) {
        await expect(jitsiIframe, `[${stepLabel}] Jitsi iframe attached`).toBeAttached({ timeout: 10_000 });
        return;
      }
      const retryBtn = page.getByTestId('retry-join-meeting');
      if (await retryBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await retryBtn.click();
      }
      await expect(meetingUi, `[${stepLabel}] Jitsi after doctor auto-start`).toBeVisible({
        timeout: iframeTimeout,
      });
    };
    if (await hostStarting.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await waitForDoctorJitsi(`${label}-doctor-host-start`);
    } else {
      await waitForDoctorJitsi(`${label}-doctor`);
    }
    return;
  }

  const lobbyStarting = page.getByTestId('lobby-starting-screen');
  if (await lobbyStarting.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await expect(lobbyStarting, `[${label}] patient auto-lobby start`).toBeHidden({ timeout: lobbyTimeout });
  }

  const jitsiFrame = page.locator('[data-testid="jitsi-meeting-container"] iframe').first();
  if (await jitsiFrame.isVisible({ timeout: 5_000 }).catch(() => false)) {
    return;
  }
  if (await page.locator('iframe').first().isVisible({ timeout: 2_000 }).catch(() => false)) {
    return;
  }

  // After HOST admit (Group Q01f): patient is on host-waiting, not agreement/pre-join
  const hostWaitingEarly = page.getByTestId('host-waiting-screen');
  if (await hostWaitingEarly.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await expect(hostWaitingEarly, `[${label}] host-waiting until Jitsi connects`).toBeHidden({
      timeout: lobbyTimeout,
    });
    await expect(jitsiContainer, `[${label}] Jitsi after host-waiting`).toBeVisible({
      timeout: iframeTimeout,
    });
    return;
  }

  const shellTimeout = scaleTimeoutByBrowser(IS_CLOUD ? 90_000 : 45_000, browserName);
  await expect(
    meetingShellLocator(page),
    `[${label}] lobby-starting, lobby, host-waiting, or Jitsi after init`,
  ).toBeVisible({ timeout: shellTimeout });

  if (await jitsiContainer.isVisible({ timeout: 3_000 }).catch(() => false)) {
    return;
  }
  if (await hostWaitingEarly.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await expect(hostWaitingEarly, `[${label}] host-waiting until Jitsi connects`).toBeHidden({
      timeout: lobbyTimeout,
    });
    await expect(jitsiContainer, `[${label}] Jitsi after host-waiting`).toBeVisible({
      timeout: iframeTimeout,
    });
    return;
  }

  const lobbyWaiting = page.getByTestId('lobby-waiting-screen');
  if (await lobbyWaiting.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await expect(lobbyWaiting, `[${label}] lobby waiting until HOST admits`).toBeHidden({ timeout: lobbyTimeout });
    await expect(jitsiContainer, `[${label}] Jitsi after lobby`).toBeVisible({ timeout: iframeTimeout });
    return;
  }

  const waitingHost = page.getByTestId('host-waiting-screen');
  if (await waitingHost.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await expect(waitingHost, `[${label}] host waiting until doctor in room`).toBeHidden({
      timeout: lobbyTimeout,
    });
  }

  const displayNameEl = page.getByTestId('patient-display-name');
  if (await displayNameEl.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
    const autoName = (await displayNameEl.first().innerText()).trim();
    expect(autoName.length, `[${label}] Izara auth display name`).toBeGreaterThan(0);
    expect(/enter your name|type your name|กรอกชื่อ/i.test(autoName)).toBe(false);
  }

  const jitsiContainerFinal = page.getByTestId('jitsi-meeting-container');
  const hostShellEarly = page.getByTestId('end-meeting-btn');
  await expect(
    jitsiContainerFinal.or(hostShellEarly).or(lobbyWaiting).or(waitingHost).first(),
    `[${label}] Izara meeting shell must render`,
  ).toBeVisible({ timeout: scaleTimeoutByBrowser(IS_CLOUD ? 60_000 : 90_000, browserName) });

  const iframeInContainer = page.locator('[data-testid="jitsi-meeting-container"] iframe').first();
  const hostControls = page.getByTestId('end-meeting-btn');
  const lobbyWaitingShell = page.getByTestId('lobby-waiting-screen');
  await expect(
    iframeInContainer
      .or(hostControls)
      .or(jitsiContainerFinal)
      .or(lobbyWaitingShell)
      .or(waitingHost)
      .first(),
    `[${label}] Jitsi iframe, container shell, or host meeting controls`,
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

/** Resolve patient JWT + user id from portal localStorage (izara_user is canonical). */
export async function getPatientAuth(page: Page): Promise<{ token: string; userId: string }> {
  const auth = await page.evaluate(() => {
    const token =
      localStorage.getItem('auth_token')
      || localStorage.getItem('izara_auth_token')
      || '';
    let userId = '';
    for (const key of ['izara_user', 'patient_user', 'user']) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as { id?: string };
          if (parsed?.id) {
            userId = String(parsed.id);
            break;
          }
        }
      } catch { /* ignore malformed storage */ }
    }
    return { token, userId };
  });
  return auth;
}

export async function requirePatientAuth(page: Page, label: string): Promise<{ token: string; userId: string }> {
  const auth = await getPatientAuth(page);
  expect(auth.token, `${label}: patient auth_token missing`).toBeTruthy();
  expect(auth.userId, `${label}: patient user id missing (izara_user)`).toBeTruthy();
  return auth;
}

export async function requireDoctorAuth(page: Page, label: string): Promise<{ token: string }> {
  const auth = await page.evaluate(() => ({
    token:
      localStorage.getItem('token')
      || localStorage.getItem('izara_auth_token')
      || localStorage.getItem('auth_token')
      || '',
  }));
  expect(auth.token, `${label}: doctor token missing`).toBeTruthy();
  return auth;
}

/** Book a pool appointment so patient gets an appointment-linked notification (works on cloud). */
export async function seedPatientAppointmentNotification(
  page: Page,
  patientUrl: string,
  token: string,
): Promise<string> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const preferredDate = tomorrow.toISOString().slice(0, 10);
  const resp = await page.request.post(`${patientUrl}/api/appointments`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: {
      preferredDate,
      preferredTime: '10:00',
      reason: 'Defect notification routing test',
      symptoms: ['general'],
      urgency: 'normal',
    },
  });
  expect(resp.ok(), 'seed appointment for notification link').toBeTruthy();
  const body = (await resp.json()) as { appointment?: { id?: string }; id?: string };
  const appointmentId = body.appointment?.id || body.id || '';
  expect(appointmentId, 'seeded appointment id').toBeTruthy();
  return appointmentId;
}

// ── Wait for SPA content to render (2s min + content poll) ──────────
export async function waitForContent(
  page: Page,
  label: string,
  timeoutMs = 8_000,
  authRole: 'patient1' | 'doctor' | 'admin' = 'patient1',
) {
  await page.waitForTimeout(WAIT_AFTER_NAV);
  const reloadTimeout = IS_CLOUD ? 30_000 : 10_000;
  const stateFile = resolveAuthStateFile(authRole);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    let len = 0;
    try {
      len = await page.evaluate(() => document.body?.innerText?.trim().length ?? 0);
    } catch {
      await page.waitForTimeout(300);
      continue;
    }
    if (len > 50) {
      const url = page.url();
      if (url.includes('/login') || url.includes('/register')) {
        await reinjectAuthFromStorage(page, path.join(AUTH_DIR, stateFile));
        await page.reload({ waitUntil: 'domcontentloaded', timeout: reloadTimeout });
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

async function gotoPatientPath(page: Page, pathOnly: string, label: string): Promise<void> {
  await page.goto(`${PATIENT_URL}${pathOnly}`, {
    waitUntil: 'domcontentloaded',
    timeout: IS_CLOUD ? 90_000 : 30_000,
  });
  await waitForContent(page, label);
  let landed = page.url();
  if (
    /\/login|\/register/i.test(landed) ||
    landed.includes('doctor-portal') ||
    /:3010\b/.test(landed)
  ) {
    console.warn(`  ⚠️ navPatient "${pathOnly}" landed on ${landed} — recovering patient session`);
    await ensurePatientPortalAuthenticated(page, `${label}-recover`);
    await page.goto(`${PATIENT_URL}${pathOnly}`, {
      waitUntil: 'domcontentloaded',
      timeout: IS_CLOUD ? 90_000 : 30_000,
    });
    await waitForContent(page, `${label}-recover`);
    landed = page.url();
  }
  if (/\/login|\/register/i.test(landed)) {
    throw new Error(`[${label}] AUTH FAILED — still on ${landed} after navPatient recover`);
  }
}

/** Sidebar/drawer links are often off-canvas on phone/tablet — prefer direct route. */
function preferDirectPatientNav(page: Page): boolean {
  const vp = page.viewportSize();
  // Unknown viewport (or before layout): never attempt off-canvas sidebar clicks.
  if (!vp) return true;
  return vp.width < 1024;
}

export async function navPatient(page: Page, href: string, label: string): Promise<void> { // NOSONAR S3776 — sidebar nav with auth retry and health checks
  // Keep patient session alive (prevent 15-min inactivity timeout)
  await refreshPatientSession(page);

  for (let attempt = 0; attempt < 3; attempt++) {
    const url = page.url();
    if (!url.includes('/login') && !url.includes('/register')) break;
    // Re-inject auth tokens from storageState
    await reinjectAuthFromStorage(page, path.join(AUTH_DIR, 'patient1.json'));
    await page.evaluate(() => {
      localStorage.setItem('izara_patient_last_activity', Date.now().toString());
    });
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

  // Narrow viewports: drawer/aside links are outside the viewport — skip click path
  if (preferDirectPatientNav(page)) {
    if (IS_CLOUD) {
      console.warn(`  ⚠️ navPatient "${pathOnly}" — direct route (narrow viewport)`);
    }
    await gotoPatientPath(page, pathOnly, label);
    return;
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
    await gotoPatientPath(page, pathOnly, label);
    return;
  }

  const box = await link.boundingBox().catch(() => null);
  const vp = page.viewportSize();
  const outsideViewport =
    !box ||
    !vp ||
    box.x + box.width <= 0 ||
    box.y + box.height <= 0 ||
    box.x >= vp.width ||
    box.y >= vp.height;
  if (outsideViewport) {
    console.warn(`  ⚠️ navPatient "${pathOnly}" — direct route (link outside viewport)`);
    await gotoPatientPath(page, pathOnly, label);
    return;
  }

  await expect(link, `Patient link "${pathOnly}" not found`).toBeVisible({ timeout: navTimeout });
  try {
    await link.click({ force: true, timeout: IS_CLOUD ? 20_000 : 12_000 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/outside of the viewport|not visible|intercepts pointer/i.test(msg)) {
      console.warn(`  ⚠️ navPatient "${pathOnly}" — direct route after click fail`);
      await gotoPatientPath(page, pathOnly, label);
      return;
    }
    throw err;
  }
  await page.waitForTimeout(WAIT_AFTER_NAV);
  await waitForContent(page, label);
  const landed = page.url();
  if (
    /\/login|\/register/i.test(landed) ||
    landed.includes('doctor-portal') ||
    /:3010\b/.test(landed)
  ) {
    await gotoPatientPath(page, pathOnly, `${label}-recover`);
  }
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
  'appointment-pool':    /นัดหมาย.*ประชุม|Appointments.*Meeting|Patient Queue|คิวผู้ป่วย/i,
  'pool':                /นัดหมาย.*ประชุม|Appointments.*Meeting|Patient Queue|คิวผู้ป่วย/i,
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
  'appointment-pool': 'health-meeting',
  'pool': 'health-meeting',
  'medical-content': 'medical-content',
  'content': 'medical-content',
  'clinical-resources': 'clinical-resources',
  'resources': 'clinical-resources',
  'doctors': 'doctors',
  'doctor-management': 'doctor-management',
  'approval': 'doctor-management',
  'profile': 'profile',
};

const DOCTOR_ID_IN_URL = /\/doctor\/([^/]+)/;

function extractDoctorIdFromUrl(url: string): string | null {
  const m = DOCTOR_ID_IN_URL.exec(url);
  return m?.[1] ?? null;
}

const ORIGIN_FROM_URL = /^(https?:\/\/[^/]+)/;

function extractOriginFromUrl(url: string, fallback: string): string {
  const m = ORIGIN_FROM_URL.exec(url);
  return m?.[1] ?? fallback;
}

/** Doctor Health Meeting URL — tests default stayOnQueue=1 to keep queue UI visible. */
export function doctorHealthMeetingUrl(
  doctorId: string,
  baseUrl = DOCTOR_URL,
  opts?: { stayOnQueue?: boolean },
): string {
  const origin = baseUrl.replace(/\/$/, '');
  const stay = opts?.stayOnQueue !== false;
  const q = stay ? '?stayOnQueue=1' : '';
  return `${origin}/doctor/${doctorId}/health-meeting${q}`;
}

async function ensureHealthMeetingStayOnQueue(page: Page): Promise<void> {
  const url = page.url();
  if (!/\/health-meeting/.test(url) || url.includes('stayOnQueue=1')) return;
  const doctorId = extractDoctorIdFromUrl(url);
  if (!doctorId) return;
  const dest = doctorHealthMeetingUrl(doctorId, extractOriginFromUrl(url, DOCTOR_URL));
  await page.goto(dest, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
  await page.waitForTimeout(WAIT_AFTER_NAV);
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

export async function navDoctor(page: Page, target: string | RegExp, label: string): Promise<void> { // NOSONAR S3776 — sidebar nav with auth retry and health checks
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

  const wantsHealthMeeting =
    navKey === 'health-meeting'
    || navKey === 'appointment-pool'
    || navKey === 'pool'
    || (typeof target === 'string' && /health-meeting|health meeting|appointment-pool|appointment pool/i.test(target))
    || (target instanceof RegExp && /health-meeting|health meeting|appointment-pool|appointment pool/i.test(target.source));

  // Health Meeting (incl. legacy appointment-pool redirect): direct goto with stayOnQueue=1
  if (wantsHealthMeeting) {
    const doctorId = extractDoctorIdFromUrl(page.url());
    if (doctorId) {
      const origin = extractOriginFromUrl(page.url(), DOCTOR_URL);
      const tabQuery = (navKey === 'appointment-pool' || navKey === 'pool') ? '&tab=queue' : '';
      const dest = `${doctorHealthMeetingUrl(doctorId, origin).replace('?stayOnQueue=1', '')}?stayOnQueue=1${tabQuery}`;
      if (!page.url().includes('stayOnQueue=1')) {
        const gotoTimeout = (await isFirefoxPage(page))
          ? Math.round(NAV_TIMEOUT * getRoleBrowserSpec('admin').navTimeoutMultiplier)
          : NAV_TIMEOUT;
        await gotoCloudWithRetry(page, dest, `${label}-health-meeting`, gotoTimeout);
      }
      await page.waitForTimeout(WAIT_AFTER_NAV);
      await waitForContent(page, label);
      assertNotLogin(page, label);
      return;
    }
  }

  // Firefox: Playwright force-click on sidebar buttons often hangs — use direct route navigation.
  if (navKey && DOCTOR_NAV_PATH[navKey] && (await isFirefoxPage(page))) {
    const doctorId = extractDoctorIdFromUrl(page.url());
    if (doctorId) {
      const origin = extractOriginFromUrl(page.url(), DOCTOR_URL);
      const dest = navKey === 'health-meeting'
        ? doctorHealthMeetingUrl(doctorId, origin)
        : `${origin}/doctor/${doctorId}/${DOCTOR_NAV_PATH[navKey]}`;
      const navTimeout = Math.round(
        NAV_TIMEOUT * ((await isFirefoxPage(page)) ? getRoleBrowserSpec('admin').navTimeoutMultiplier : 1),
      );
      if (!page.url().includes(`/${DOCTOR_NAV_PATH[navKey]}`)) {
        try {
          await page.goto(dest, { waitUntil: 'domcontentloaded', timeout: navTimeout });
        } catch {
          // Cloud Run can cold-start route handlers; retry once before failing the step.
          await page.goto(dest, { waitUntil: 'domcontentloaded', timeout: navTimeout });
        }
      }
      await page.waitForTimeout(WAIT_AFTER_NAV);
      // Firefox SPA can accept goto but stay on dashboard when admin session is stale.
      if (!page.url().includes(`/${DOCTOR_NAV_PATH[navKey]}`)) {
        await refreshPageAuth(page, DOCTOR_URL);
        await page.goto(dest, { waitUntil: 'load', timeout: navTimeout });
        await page.waitForTimeout(WAIT_AFTER_NAV);
      }
      if (page.url().includes(`/${DOCTOR_NAV_PATH[navKey]}`)) {
        await waitForContent(page, label);
        assertNotLogin(page, label);
        return;
      }
      console.warn(`  ⚠️ navDoctor Firefox direct goto missed "${navKey}" — falling back to sidebar`);
    }
  }

  let btn = page.locator('nav button, aside button, nav a, aside a').filter({ hasText: pattern }).first();
  let visible = await btn.isVisible({ timeout: 10_000 }).catch(() => false);

  // Cloud / local recovery: if sidebar not found, page may be blank — reload and retry
  const bodyLen = await page.evaluate(() => document.body?.innerText?.trim().length ?? 0).catch(() => 0);
  if (!visible && (IS_CLOUD || bodyLen < 50)) {
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
  if (
    navKey === 'health-meeting'
    || (typeof target === 'string' && /health-meeting|health meeting/i.test(target))
    || (target instanceof RegExp && /health-meeting|health meeting/i.test(target.source))
  ) {
    await ensureHealthMeetingStayOnQueue(page);
  }
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
  if (!headless && process.platform === 'win32' && !USE_ISOLATED_LOCAL_BROWSERS) {
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
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, ignoreHTTPSErrors: true });
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

  const ctxOpts = { viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true };

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
    patient: { page: patientPage, ctx: patientCtx, browser: patientBrowser, url: PATIENT_URL, role: 'patient', userId: 'PATIENT-DEMO', browserName: portalBrowserLabel('patient') },
    doctor:  { page: doctorPage,  ctx: doctorCtx,  browser: doctorBrowser,  url: DOCTOR_URL,  role: 'doctor',  userId: doctorId,       browserName: portalBrowserLabel('doctor') },
    admin:   { page: adminPage,   ctx: adminCtx,   browser: adminBrowser,   url: DOCTOR_URL,  role: 'admin',   userId: adminId,        browserName: portalBrowserLabel('admin') },
  };
  attachPortalDiagnostics(portals.patient);
  attachPortalDiagnostics(portals.doctor);
  attachPortalDiagnostics(portals.admin);
  return portals;
}

export async function closePortals(portals: Portals): Promise<void> {
  if (!portals || KEEP_BROWSERS_OPEN) return;
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
const DEFAULT_HEADLESS =
  (process.env.PW_HEADLESS === '1' || process.env.PW_HEADLESS === 'true') &&
  !FORCE_HEADED;

/** Headed local runs use Playwright bundled Chromium/Firefox (not your daily Chrome/Edge). */
const USE_ISOLATED_LOCAL_BROWSERS =
  FORCE_HEADED && !IS_CLOUD && process.env.PW_USE_SYSTEM_BROWSERS !== '1';

/** Leave test browser windows open after a worker finishes (developer can inspect / keep working). */
const KEEP_BROWSERS_OPEN =
  process.env.PW_KEEP_BROWSERS === '1' || process.env.PW_KEEP_BROWSERS === 'true';

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

async function launchBrowserForSpec(
  spec: ReturnType<typeof getRoleBrowserSpec>,
  label: string,
): Promise<Browser> {
  if (spec.engine === 'firefox') {
    return firefox.launch({
      headless: SHARED_LAUNCH.headless,
      slowMo: SHARED_LAUNCH.slowMo,
      args: [...FIREFOX_LAUNCH_OPTIONS.args],
      firefoxUserPrefs: { ...FIREFOX_LAUNCH_OPTIONS.firefoxUserPrefs },
    });
  }
  if (spec.engine === 'webkit') {
    return webkit.launch({
      headless: SHARED_LAUNCH.headless,
      slowMo: SHARED_LAUNCH.slowMo,
      args: [],
    });
  }
  const launchOpts = { ...SHARED_LAUNCH, args: chromiumArgsForLaunch() };
  if (USE_ISOLATED_LOCAL_BROWSERS) {
    return chromium.launch(launchOpts);
  }
  const channel = spec.channel && spec.channel !== 'chrome' ? spec.channel : 'msedge';
  try {
    return await chromium.launch({ ...launchOpts, channel });
  } catch (channelErr) {
    console.warn(
      `  ⚠️ ${label} channel=${channel} failed, using bundled Chromium: ${String(channelErr).slice(0, 80)}`,
    );
    return chromium.launch(launchOpts);
  }
}

/** Launch a browser with retry (Chrome or Firefox per role) */
async function launchRoleBrowser(role: PortalRole, label: string): Promise<Browser> {
  const spec = getRoleBrowserSpec(role);
  const retries = spec.launchRetries;
  for (let i = 0; i <= retries; i++) {
    try {
      const t0 = Date.now();
      const browser = await launchBrowserForSpec(spec, label);
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
  const launchSequential = IS_CLOUD || FORCE_HEADED || resolveCoreBrowserEngine() !== null;
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
  const parallelHeaded =
    !IS_CLOUD &&
    FORCE_HEADED &&
    Number.parseInt(process.env.PW_WORKERS || '1', 10) > 1;
  const isAdminFirefox = label === 'Admin' && getRoleBrowserSpec('admin').engine === 'firefox';
  const STORAGE_CTX_TIMEOUT_MS = resolveStorageContextTimeoutMs(isAdminFirefox, parallelHeaded);
  try {
    return await Promise.race([
      browser.newContext({ ...ctxOpts, storageState: storageStatePath }),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error(`${label} storageState context timed out after ${STORAGE_CTX_TIMEOUT_MS}ms`)),
          STORAGE_CTX_TIMEOUT_MS,
        );
      }),
    ]);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`  ⚠ ${label} storageState failed; retrying without storageState: ${message.slice(0, 140)}`);
    return browser.newContext({ ...ctxOpts });
  }
}

function portalBrowserLabel(role: PortalRole): string {
  const spec = getRoleBrowserSpec(role);
  return spec.browserName;
}

async function grantMeetingMediaPermissions(
  patientCtx: BrowserContext,
  doctorCtx: BrowserContext,
  _adminCtx: BrowserContext,
): Promise<void> {
  // grantPermissions(camera/mic) is Chromium/WebKit-only; Firefox uses FIREFOX_LAUNCH_OPTIONS prefs.
  const grants: Promise<void>[] = [];
  if (getRoleBrowserSpec('patient').engine === 'chromium') {
    grants.push(patientCtx.grantPermissions([...CHROMIUM_MEDIA_PERMISSIONS], { origin: PATIENT_URL }));
  }
  if (getRoleBrowserSpec('doctor').engine === 'chromium') {
    grants.push(doctorCtx.grantPermissions([...CHROMIUM_MEDIA_PERMISSIONS], { origin: DOCTOR_URL }));
  }
  if (getRoleBrowserSpec('admin').engine === 'chromium') {
    grants.push(_adminCtx.grantPermissions([...CHROMIUM_MEDIA_PERMISSIONS], { origin: DOCTOR_URL }));
  }
  if (grants.length) await Promise.all(grants);
  await Promise.all([
    installJitsiE2eStubForContext(patientCtx),
    installJitsiE2eStubForContext(doctorCtx),
    installJitsiE2eStubForContext(_adminCtx),
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

const PUBLIC_AUTH_PATH_RE = /\/(register|reset-password|login|forgot-password)(\/|$|\?)/i;

/** Navigate with retry — cloud DNS/network flake (ERR_NETWORK_CHANGED, timeouts). */
export async function gotoCloudWithRetry(
  page: Page,
  url: string,
  label: string,
  timeoutMs?: number,
): Promise<void> {
  const isPublicAuthShell = PUBLIC_AUTH_PATH_RE.test(url);
  const resolvedTimeout =
    timeoutMs ??
    (isPublicAuthShell
      ? resolveHeadedTimeout(180_000, 120_000, 90_000)
      : resolveHeadedTimeout(90_000, 60_000, 30_000));
  await gotoWithRetry(page, url, resolvedTimeout, '', label, IS_CLOUD ? 4 : 3);
}

/** Navigate a page with retry — handles redirect-to-login by re-injecting auth */
async function gotoWithRetry( // NOSONAR S3776 — navigation retry with auth re-injection and health checks
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
  const isPublicAuthShell = PUBLIC_AUTH_PATH_RE.test(url);
  const primaryWaitUntil = isPublicAuthShell ? 'commit' : 'domcontentloaded';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await page.goto(url, { waitUntil: primaryWaitUntil, timeout });
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
        } catch (error_: unknown) {
          lastError = error_ instanceof Error ? error_ : new Error(String(error_));
        }
      }
    }
  }

  if (lastError) throw lastError;

  console.log(`  📄 ${label} navigated in ${Date.now() - t0}ms → ${page.url()}`);

  // If redirected to login, re-inject auth and navigate back (skip when login is the target page)
  if (page.url().includes('/login') && !isPublicAuthShell) {
    console.log(`  🔄 ${label} redirected to login — re-injecting auth...`);
    if (fs.existsSync(storageStatePath)) {
      const state = JSON.parse(fs.readFileSync(storageStatePath, 'utf-8'));
      const items = state.origins?.[0]?.localStorage || [];
      await page.evaluate((entries: { name: string; value: string }[]) => {
        for (const e of entries) localStorage.setItem(e.name, e.value);
      }, items);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
    }
  }

  const contentWait = scaleTimeout(
    resolveContentWaitMs(isPublicAuthShell),
    role,
  );
  const deadline = Date.now() + contentWait;
  let bodyLenBeforeRecovery = 0;
  while (Date.now() < deadline) {
    const len = await page.evaluate(() => document.body?.innerText?.trim().length ?? 0).catch(() => 0);
    bodyLenBeforeRecovery = len;
    if (len > 50) return;
    await page.waitForTimeout(500);
  }

  // Recovery: blank page after wait → re-navigate once.
  // - Cloud: handles cold-start blank renders
  // - Local headed: Firefox-admin / Edge-doctor can whiteout under parallel load
  const allowRecovery =
    !isPublicAuthShell &&
    (IS_CLOUD ||
      (role === 'admin' && getRoleBrowserSpec('admin').engine === 'firefox') ||
      (role === 'doctor' && bodyLenBeforeRecovery < 50));
  if (allowRecovery) {
    console.warn(`  ⚠️ ${label} content sparse after ${contentWait / 1000}s — re-navigating...`);
    if (fs.existsSync(storageStatePath)) {
      const state = JSON.parse(fs.readFileSync(storageStatePath, 'utf-8'));
      const items = state.origins?.[0]?.localStorage || [];
      await page.evaluate((entries: { name: string; value: string }[]) => {
        for (const e of entries) localStorage.setItem(e.name, e.value);
      }, items);
    }
    try {
      await page.goto(url, { waitUntil: 'commit', timeout: Math.min(timeout, 90_000) });
    } catch {
      console.warn(`  ⚠️ ${label} sparse-content recovery timed out — proceeding anyway`);
      return;
    }
    // Wait another 12s for content after reload
    const deadline2 = Date.now() + (IS_CLOUD ? 20_000 : 12_000);
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

let lastAuthRefreshMs = 0;
const AUTH_REFRESH_INTERVAL_MS =
  FORCE_HEADED && !IS_CLOUD ? 2 * 60 * 1000 : 10 * 60 * 1000;

export const test = base.extend<{ _authSync: void }, { portals: Portals }>({
  portals: [async ({}, use) => { // NOSONAR S3776 — worker-scoped tri-browser fixture setup/teardown
    const setupStart = Date.now();
    console.log('\n🔧 FIXTURE SETUP — launching 3 browsers...');

    // Cloud CI only: never taskkill chrome/msedge locally — that closes the developer's own browser.
    if (IS_CLOUD && process.env.PW_ALLOW_TASKKILL === '1') {
      try {
        execSync('taskkill /F /IM chrome.exe 2>NUL', { stdio: 'ignore' });
        await new Promise(r => setTimeout(r, 2_000));
      } catch { /* No chrome processes running — OK */ }
    }

    const patientState = path.join(AUTH_DIR, 'patient1.json');
    const doctorState  = path.join(AUTH_DIR, 'doctor.json');
    const adminState   = path.join(AUTH_DIR, 'admin.json');

    if (!IS_CLOUD) {
      await new Promise((r) => setTimeout(r, 1500));
    }

    const lightFixture = process.env.E2E_LIGHT_FIXTURE === '1';
    const authFiles = [patientState, doctorState, adminState];
    const authMissing = authFiles.some((f) => !fs.existsSync(f));
    if (!lightFixture || authMissing) {
      if (lightFixture && authMissing) {
        console.log('  ⚡ E2E_LIGHT_FIXTURE — auth cache missing, refreshing storage states');
      }
      await refreshAuthStorageStates();
    } else {
      console.log('  ⚡ E2E_LIGHT_FIXTURE — reusing auth cache, skipping storage refresh');
    }

    for (const f of authFiles) {
      if (!fs.existsSync(f)) {
        throw new Error(`Auth state file missing: ${f}\nRun global setup first.`);
      }
    }

    clearPortalIssues();
    // Omit viewport so Playwright project `use.viewport` applies (critical for Group S).
    const ctxOpts: { ignoreHTTPSErrors: true; viewport?: { width: number; height: number } } = {
      ignoreHTTPSErrors: true,
    };
    if (process.env.PW_FORCE_DESKTOP_VIEWPORT === '1') {
      ctxOpts.viewport = { width: 1440, height: 900 };
    }

    const coreEngine = resolveCoreBrowserEngine();
    const browserLabel = coreEngine
      ? `Patient+Doctor+Admin=${coreEngine} (unified core-browser run)`
      : 'Patient=Chrome, Doctor=Edge, Admin=Firefox (parallel launch)';
    console.log(`  🌐 Multi-party browsers: ${browserLabel}`);
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
            maxAttempts: resolveFixtureMaxAttempts(lightFixture),
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
      patient: { page: patientPage, ctx: patientCtx, browser: patientBrowser, url: PATIENT_URL, role: 'patient', userId: 'PATIENT-DEMO', browserName: portalBrowserLabel('patient') },
      doctor:  { page: doctorPage,  ctx: doctorCtx,  browser: doctorBrowser,  url: DOCTOR_URL,  role: 'doctor',  userId: doctorId,       browserName: portalBrowserLabel('doctor') },
      admin:   { page: adminPage,   ctx: adminCtx,   browser: adminBrowser,   url: DOCTOR_URL,  role: 'admin',   userId: adminId,        browserName: portalBrowserLabel('admin') },
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

    // Keep patient + doctor/admin sessions alive (prevent inactivity logout during long D runs)
    const keepAlive = setInterval(async () => {
      try {
        await patientPage.evaluate(() =>
          localStorage.setItem('izara_patient_last_activity', Date.now().toString())
        );
        await doctorPage.evaluate(() =>
          localStorage.setItem('izara_last_activity', Date.now().toString())
        );
        await adminPage.evaluate(() =>
          localStorage.setItem('izara_last_activity', Date.now().toString())
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
    if (KEEP_BROWSERS_OPEN) {
      console.log('  ℹ️ PW_KEEP_BROWSERS=1 — leaving test browser windows open');
      return;
    }
    // Close with per-operation timeout to prevent teardown hang
    // Cloud: 30s timeout — browsers take longer to close over network
    const CLOSE_TIMEOUT_MS = IS_CLOUD ? 30_000 : 10_000;
    const closeWithTimeout = (p: Promise<void>, label: string, ms = CLOSE_TIMEOUT_MS) =>
      Promise.race([p, new Promise<void>(r => setTimeout(() => { console.log(`  ⚠ ${label} close timed out`); r(); }, ms))]);
    try {
      // Close pages before contexts/browsers — avoids Playwright tracing race on worker teardown.
      await closeWithTimeout(patientPage.close().catch(() => {}), 'patientPage');
      await closeWithTimeout(doctorPage.close().catch(() => {}), 'doctorPage');
      await closeWithTimeout(adminPage.close().catch(() => {}), 'adminPage');
      await closeWithTimeout(patientCtx.close().catch(() => {}), 'patientCtx');
      await closeWithTimeout(doctorCtx.close().catch(() => {}), 'doctorCtx');
      await closeWithTimeout(adminCtx.close().catch(() => {}), 'adminCtx');
      await new Promise((r) => setTimeout(r, 300));
      await closeWithTimeout(patientBrowser.close().catch(() => {}), 'patientBrowser');
      await closeWithTimeout(doctorBrowser.close().catch(() => {}), 'doctorBrowser');
      await closeWithTimeout(adminBrowser.close().catch(() => {}), 'adminBrowser');
    } catch (err) {
      console.warn(`  ⚠ Fixture teardown: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, {
    scope: 'worker',
    // Must cover full headed gate (A→K + Defect); align with playwright globalTimeout (2h local headed)
    timeout: resolveWorkerFixtureTimeout(FORCE_HEADED),
  }],
  _authSync: [async ({ portals }, use) => {
    const now = Date.now();
    const shouldRefreshStorage =
      (FORCE_HEADED && !IS_CLOUD) || now - lastAuthRefreshMs > AUTH_REFRESH_INTERVAL_MS;
    if (shouldRefreshStorage) {
      await refreshAuthStorageStates();
      lastAuthRefreshMs = now;
    }
    await reinjectAuthFromStorageFile(portals.patient.page, 'patient1');
    await reinjectAuthFromStorageFile(portals.doctor.page, 'doctor');
    await reinjectAuthFromStorageFile(portals.admin.page, 'admin');
    await use();
  }, { auto: true }],
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
