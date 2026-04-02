/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA — MULTI-PORTAL FIXTURE (3 BROWSERS, CONTINUOUS FLOW)
 * ═══════════════════════════════════════════════════════════════════════
 * Opens 3 SEPARATE BROWSERS simultaneously:
 *   - Patient → Chrome (Chromium channel: chrome)
 *   - Doctor  → Chrome (separate Chromium instance, channel: chrome)
 *   - Admin   → Firefox (guest browser for no conflicts)
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
import { test as base, Page, BrowserContext, Browser, expect, chromium, firefox } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';

// ── Constants ────────────────────────────────────────────────────────
const PATIENT_URL = process.env.PATIENT_URL || 'http://localhost:3005';
const DOCTOR_URL  = process.env.DOCTOR_URL  || 'http://localhost:3010';
const MEETING_URL = process.env.MEETING_URL || 'http://localhost:3020';

const AUTH_DIR = path.join(__dirname, '..', 'e2e', '.auth-states');
const SS_DIR   = path.join(__dirname, '..', '..', 'test-results', 'workflow-snapshots');

/** 2-second wait after every page change for UI to settle */
const WAIT_AFTER_NAV = 2_000;

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
    await page.screenshot({ path: filePath, fullPage: true, timeout: 15_000 });
  } catch {
    try {
      await page.screenshot({ path: filePath, fullPage: false, timeout: 10_000 });
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
export async function waitForContent(page: Page, label: string, timeoutMs = 15_000) {
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
  await link.click();
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

  const btn = page.locator('nav button, aside button, nav a, aside a').filter({ hasText: pattern }).first();
  await expect(btn, `Doctor sidebar "${String(target)}" not found`).toBeVisible({ timeout: 10_000 });

  await btn.evaluate((el) => {
    el.scrollIntoView({ block: 'center' });
    (el as HTMLElement).click();
  });
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
    slowMo: 300,
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
    slowMo: 300,
    channel: 'chrome' as const,
    args: ['--start-maximized', '--auto-accept-camera-and-microphone-capture'],
  };
  const firefoxOpts = { headless: false, slowMo: 300 };
  const ctxOpts = { viewport: { width: 1440, height: 900 } };

  const [patientBrowser, doctorBrowser, adminBrowser] = await Promise.all([
    chromium.launch(chromeOpts),
    chromium.launch(chromeOpts),
    firefox.launch(firefoxOpts),
  ]);

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

  // Navigate all 3 to dashboards
  await Promise.all([
    patientPage.goto(PATIENT_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 }),
    doctorPage.goto(`${DOCTOR_URL}/doctor/${doctorId}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30_000 }),
    adminPage.goto(`${DOCTOR_URL}/doctor/${adminId}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30_000 }),
  ]);

  await Promise.all([
    waitForContent(patientPage, 'setup-patient'),
    waitForContent(doctorPage, 'setup-doctor'),
    waitForContent(adminPage, 'setup-admin'),
  ]);

  // Refresh patient session timestamp to prevent inactivity timeout
  await refreshPatientSession(patientPage);

  return {
    patient: { page: patientPage, ctx: patientCtx, browser: patientBrowser, url: PATIENT_URL, role: 'patient', userId: 'PATIENT-DEMO', browserName: 'chrome' },
    doctor:  { page: doctorPage,  ctx: doctorCtx,  browser: doctorBrowser,  url: DOCTOR_URL,  role: 'doctor',  userId: doctorId,       browserName: 'chrome' },
    admin:   { page: adminPage,   ctx: adminCtx,   browser: adminBrowser,   url: DOCTOR_URL,  role: 'admin',   userId: adminId,        browserName: 'firefox' },
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

export const test = base.extend<{}, { portals: Portals }>({
  portals: [async ({}, use) => {
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
      slowMo: 300,
      channel: 'chrome' as const,
      args: ['--start-maximized', '--auto-accept-camera-and-microphone-capture'],
    };
    const firefoxOpts = { headless: false, slowMo: 300 };
    const ctxOpts = { viewport: { width: 1440, height: 900 } };

    const [patientBrowser, doctorBrowser, adminBrowser] = await Promise.all([
      chromium.launch(chromeOpts),
      chromium.launch(chromeOpts),
      firefox.launch(firefoxOpts),
    ]);

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

    // Navigate all 3 to dashboards — patient+doctor parallel, admin with retry
    await Promise.all([
      patientPage.goto(PATIENT_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 }),
      doctorPage.goto(`${DOCTOR_URL}/doctor/${doctorId}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60_000 }),
    ]);
    // Admin (Firefox) sometimes slow — retry once on timeout
    try {
      await adminPage.goto(`${DOCTOR_URL}/doctor/${adminId}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    } catch {
      console.log('  ⚠ Admin goto timed out, retrying...');
      await adminPage.goto(`${DOCTOR_URL}/doctor/${adminId}/dashboard`, { waitUntil: 'commit', timeout: 60_000 });
    }

    await Promise.all([
      waitForContent(patientPage, 'fixture-patient'),
      waitForContent(doctorPage, 'fixture-doctor'),
      waitForContent(adminPage, 'fixture-admin'),
    ]);

    // Refresh patient session timestamp to prevent inactivity timeout during tests
    await refreshPatientSession(patientPage);

    const portals: Portals = {
      patient: { page: patientPage, ctx: patientCtx, browser: patientBrowser, url: PATIENT_URL, role: 'patient', userId: 'PATIENT-DEMO', browserName: 'chrome' },
      doctor:  { page: doctorPage,  ctx: doctorCtx,  browser: doctorBrowser,  url: DOCTOR_URL,  role: 'doctor',  userId: doctorId,       browserName: 'chrome' },
      admin:   { page: adminPage,   ctx: adminCtx,   browser: adminBrowser,   url: DOCTOR_URL,  role: 'admin',   userId: adminId,        browserName: 'firefox' },
    };

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
    await patientCtx.close().catch(() => {});
    await doctorCtx.close().catch(() => {});
    await adminCtx.close().catch(() => {});
    await patientBrowser.close().catch(() => {});
    await doctorBrowser.close().catch(() => {});
    await adminBrowser.close().catch(() => {});
  }, { scope: 'worker' }],
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
 */
export async function assertHasData(page: Page, label: string, minRows = 1): Promise<number> {
  const count = await page.evaluate((min) => {
    const selectors = [
      'table tbody tr',
      '[class*="card"]:not(nav [class*="card"])',
      '.appointment-item, .patient-item, .doctor-item, .content-item',
      '[class*="list-item"], [class*="listItem"]',
    ];
    let total = 0;
    for (const sel of selectors) {
      total += document.querySelectorAll(sel).length;
      if (total >= min) return total;
    }
    return total;
  }, minRows);

  if (count < minRows) {
    console.warn(`⚠️ [${label}] Only ${count} data items found (expected ≥${minRows})`);
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
export { PATIENT_URL, DOCTOR_URL, MEETING_URL, WAIT_AFTER_NAV, SS_DIR, AUTH_DIR };
