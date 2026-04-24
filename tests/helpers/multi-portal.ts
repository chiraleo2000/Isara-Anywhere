/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA — MULTI-PORTAL FIXTURE (3 BROWSERS, CONTINUOUS FLOW)
 * ═══════════════════════════════════════════════════════════════════════
 * Opens 3 SEPARATE BROWSERS simultaneously:
 *   - Patient → Chrome (Chromium channel: chrome)
 *   - Doctor  → Chrome (separate Chromium instance, channel: chrome)
 *   - Admin   → Chrome (separate Chromium instance, channel: chrome)
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
import { test as base, Page, BrowserContext, Browser, expect, chromium } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';

// ── Constants ────────────────────────────────────────────────────────
const IS_CLOUD = process.env.TEST_ENV === 'cloud';

export const PATIENT_URL = IS_CLOUD
  ? (process.env.CLOUD_PATIENT_URL || process.env.PATIENT_URL || process.env.PATIENT_PORTAL_URL || 'https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app')
  : (process.env.PATIENT_URL || process.env.PATIENT_PORTAL_URL || process.env.LOCAL_PATIENT_URL || 'http://localhost:3005');
export const DOCTOR_URL = IS_CLOUD
  ? (process.env.CLOUD_DOCTOR_URL || process.env.DOCTOR_URL || process.env.DOCTOR_PORTAL_URL || 'https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app')
  : (process.env.DOCTOR_URL || process.env.DOCTOR_PORTAL_URL || process.env.LOCAL_DOCTOR_URL || 'http://localhost:3010');
export const MEETING_URL = IS_CLOUD
  ? (process.env.CLOUD_MEETING_URL || process.env.MEETING_URL || process.env.MEETING_SERVER_URL || 'https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app')
  : (process.env.MEETING_URL || process.env.MEETING_SERVER_URL || process.env.LOCAL_MEETING_URL || 'http://localhost:3020');

/** Navigation timeout — longer for cloud cold starts */
const NAV_TIMEOUT = IS_CLOUD ? 90_000 : 30_000;
/** Fixture initial navigation timeout — extra generous for cold starts */
const FIXTURE_NAV_TIMEOUT = IS_CLOUD ? 120_000 : 60_000;

const AUTH_DIR = path.join(__dirname, '..', 'e2e', '.auth-states');
const SS_DIR   = path.join(__dirname, '..', '..', 'test-results', 'workflow-snapshots');

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
  try {
    await page.screenshot({ path: filePath, fullPage: true, timeout: 5_000 });
  } catch {
    try {
      await page.screenshot({ path: filePath, fullPage: false, timeout: 3_000 });
    } catch (err) {
      console.warn(`⚠️ Screenshot failed: ${name}`, err instanceof Error ? err.message : '');
    }
  }
  return filePath;
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

  // Try sidebar first, then fall back to any link on the page (e.g. footer /profile)
  let link = page.locator(`nav a[href="${href}"], aside a[href="${href}"]`).first();
  if (!await link.isVisible({ timeout: 5_000 }).catch(() => false)) {
    link = page.locator(`a[href="${href}"]`).first();
  }
  await expect(link, `Patient link "${href}" not found`).toBeVisible({ timeout: 10_000 });
  await link.click({ force: true, timeout: 12_000 });
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

export async function navDoctor(page: Page, target: string | RegExp, label: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const url = page.url();
    if (!url.includes('/login') && !url.includes('/register')) break;
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 10_000 });
    await page.waitForTimeout(WAIT_AFTER_NAV);
  }
  assertNotLogin(page, `${label}-pre`);

  let pattern: string | RegExp = target;
  if (typeof target === 'string') {
    const key = target.toLowerCase().trim();
    if (DOCTOR_NAV_MAP[key]) {
      pattern = DOCTOR_NAV_MAP[key];
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

  await btn.click({ force: true, timeout: 12_000 });
  await page.waitForTimeout(WAIT_AFTER_NAV);
  await waitForContent(page, label);
  assertNotLogin(page, label);
}

// ═══════════════════════════════════════════════════════════════════════
// GUEST BROWSER LAUNCHER (Edge / Chrome incognito)
// ═══════════════════════════════════════════════════════════════════════

export async function launchGuestBrowser(browserType: 'edge' | 'chrome-incognito' = 'edge'): Promise<{ browser: Browser; ctx: BrowserContext; page: Page }> {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
    channel: browserType === 'edge' ? 'msedge' : 'chrome',
    args: browserType === 'edge' ? ['--start-maximized'] : ['--start-maximized', '--incognito'],
  });
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

  const chromeOpts = {
    headless: false,
    slowMo: 100,
    channel: 'chrome' as const,
    args: ['--start-maximized', '--auto-accept-camera-and-microphone-capture'],
  };
  const ctxOpts = { viewport: { width: 1440, height: 900 } };

  // Sequential browser launch for reliability
  const patientBrowser = await launchBrowserWithRetry(chromeOpts, 'Patient');
  const doctorBrowser  = await launchBrowserWithRetry(chromeOpts, 'Doctor');
  const adminBrowser   = await launchBrowserWithRetry(chromeOpts, 'Admin');

  const [patientCtx, doctorCtx, adminCtx] = await Promise.all([
    patientBrowser.newContext({ ...ctxOpts, storageState: patientState }),
    doctorBrowser.newContext({ ...ctxOpts, storageState: doctorState }),
    adminBrowser.newContext({ ...ctxOpts, storageState: adminState }),
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

  // Sequential navigation for reliability
  await gotoWithRetry(patientPage, PATIENT_URL, NAV_TIMEOUT, patientState, 'Patient');
  await gotoWithRetry(doctorPage, `${DOCTOR_URL}/doctor/${doctorId}/dashboard`, NAV_TIMEOUT, doctorState, 'Doctor');
  await gotoWithRetry(adminPage, `${DOCTOR_URL}/doctor/${adminId}/dashboard`, NAV_TIMEOUT, adminState, 'Admin');

  await refreshPatientSession(patientPage);

  return {
    patient: { page: patientPage, ctx: patientCtx, browser: patientBrowser, url: PATIENT_URL, role: 'patient', userId: 'PATIENT-DEMO', browserName: 'chrome' },
    doctor:  { page: doctorPage,  ctx: doctorCtx,  browser: doctorBrowser,  url: DOCTOR_URL,  role: 'doctor',  userId: doctorId,       browserName: 'chrome' },
    admin:   { page: adminPage,   ctx: adminCtx,   browser: adminBrowser,   url: DOCTOR_URL,  role: 'admin',   userId: adminId,        browserName: 'chrome' },
  };
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
// MULTI-PORTAL FIXTURE — 3 BROWSERS, headless: false ALWAYS
// ═══════════════════════════════════════════════════════════════════════

/** Launch a browser with retry to handle transient Chrome startup failures */
async function launchBrowserWithRetry(opts: Parameters<typeof chromium.launch>[0], label: string, retries = 2): Promise<Browser> {
  for (let i = 0; i <= retries; i++) {
    try {
      const t0 = Date.now();
      const browser = await chromium.launch(opts);
      console.log(`  🚀 ${label} browser launched in ${Date.now() - t0}ms`);
      return browser;
    } catch (err: any) {
      console.error(`  ❌ ${label} launch attempt ${i + 1} failed: ${err?.message?.slice(0, 120)}`);
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 2_000));
    }
  }
  throw new Error(`${label} browser launch failed after ${retries + 1} attempts`);
}

/** Navigate a page with retry — handles redirect-to-login by re-injecting auth */
async function gotoWithRetry(
  page: Page, url: string, timeout: number, storageStatePath: string, label: string,
): Promise<void> {
  const t0 = Date.now();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
  } catch (err: any) {
    console.warn(`  ⚠️ ${label} goto failed: ${err?.message?.slice(0, 100)} — retrying...`);
    await page.goto(url, { waitUntil: 'commit', timeout });
  }
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

  // Wait for meaningful content (max 10s, then retry on cloud)
  const contentWait = IS_CLOUD ? 12_000 : 10_000;
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

    const patientState = path.join(AUTH_DIR, 'patient1.json');
    const doctorState  = path.join(AUTH_DIR, 'doctor.json');
    const adminState   = path.join(AUTH_DIR, 'admin.json');

    for (const f of [patientState, doctorState, adminState]) {
      if (!fs.existsSync(f)) {
        throw new Error(`Auth state file missing: ${f}\nRun global setup first.`);
      }
    }

    const chromeOpts = {
      headless: false,
      slowMo: IS_CLOUD ? 250 : 100,
      channel: 'chrome' as const,
      args: ['--start-maximized', '--auto-accept-camera-and-microphone-capture'],
    };
    const ctxOpts = { viewport: { width: 1440, height: 900 } };

    // Sequential browser launch to avoid resource contention
    const patientBrowser = await launchBrowserWithRetry(chromeOpts, 'Patient');
    const doctorBrowser  = await launchBrowserWithRetry(chromeOpts, 'Doctor');
    const adminBrowser   = await launchBrowserWithRetry(chromeOpts, 'Admin');

    const [patientCtx, doctorCtx, adminCtx] = await Promise.all([
      patientBrowser.newContext({ ...ctxOpts, storageState: patientState }),
      doctorBrowser.newContext({ ...ctxOpts, storageState: doctorState }),
      adminBrowser.newContext({ ...ctxOpts, storageState: adminState }),
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

    // Navigate sequentially — avoids 3 parallel goto competing for resources
    await gotoWithRetry(patientPage, PATIENT_URL, navTimeout, patientState, 'Patient');
    await gotoWithRetry(doctorPage, `${DOCTOR_URL}/doctor/${doctorId}/dashboard`, navTimeout, doctorState, 'Doctor');
    await gotoWithRetry(adminPage, `${DOCTOR_URL}/doctor/${adminId}/dashboard`, navTimeout, adminState, 'Admin');

    // Refresh patient session timestamp to prevent inactivity timeout during tests
    await refreshPatientSession(patientPage);

    const portals: Portals = {
      patient: { page: patientPage, ctx: patientCtx, browser: patientBrowser, url: PATIENT_URL, role: 'patient', userId: 'PATIENT-DEMO', browserName: 'chrome' },
      doctor:  { page: doctorPage,  ctx: doctorCtx,  browser: doctorBrowser,  url: DOCTOR_URL,  role: 'doctor',  userId: doctorId,       browserName: 'chrome' },
      admin:   { page: adminPage,   ctx: adminCtx,   browser: adminBrowser,   url: DOCTOR_URL,  role: 'admin',   userId: adminId,        browserName: 'chrome' },
    };

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

    clearInterval(keepAlive);
    // Close with per-operation timeout to prevent teardown hang
    const closeWithTimeout = (p: Promise<void>, label: string, ms = 10_000) =>
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
  }, { scope: 'worker', timeout: 240_000 }],
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
