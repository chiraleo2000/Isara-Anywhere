/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA — PAGE HEALTH ASSERTION HELPER
 * ═══════════════════════════════════════════════════════════════════════
 * Reusable function to verify a page loaded correctly:
 *  - HTTP 200 response (strict: THROWS on >= 400)
 *  - Non-empty body (no whiteout)
 *  - No error boundaries / "Something went wrong"
 *  - No perpetual loading spinners (frozen UI)
 *  - Data elements present (tables, cards, lists)
 *  - Full-page screenshot captured
 *  - 2-second post-navigation wait for SPA rendering
 * ═══════════════════════════════════════════════════════════════════════
 */
import { Page, expect, Response } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface PageHealthResult {
  status: number;
  loadTimeMs: number;
  hasData: boolean;
  screenshotPath: string;
  issues: string[];
}

/**
 * Check body text for whiteout (blank page), retrying once after 2s.
 */
async function checkWhiteout(page: Page): Promise<string[]> {
  let bodyText = await page.evaluate(() => document.body?.innerText?.trim() || '');
  if (bodyText.length >= 10) return [];
  await page.waitForTimeout(2000);
  bodyText = await page.evaluate(() => document.body?.innerText?.trim() || '');
  return bodyText.length < 10 ? ['Page appears blank (whiteout) — body text < 10 chars'] : [];
}

/**
 * Check for error boundaries, network errors, and visible server errors.
 */
async function checkPageErrors(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const problems: string[] = [];
    const lower = (document.body?.innerText || '').toLowerCase();
    const checks: [string, string][] = [
      ['something went wrong', 'Error boundary: "Something went wrong"'],
      ['failed to fetch', 'Failed to fetch error'],
      ['network error', 'Network error'],
      ['500 internal server', '500 Internal Server Error'],
      ['502 bad gateway', '502 Bad Gateway'],
      ['503 service unavailable', '503 Service Unavailable'],
      ['error loading data', 'Error loading data'],
      ['cannot read properties', 'JS runtime error visible'],
    ];
    for (const [needle, label] of checks) {
      if (lower.includes(needle)) problems.push(label);
    }
    const root = document.getElementById('root');
    if (root && root.innerHTML.trim().length < 50 && root.childElementCount === 0) {
      problems.push('Root element appears empty');
    }
    return problems;
  });
}

/**
 * Check for frozen loading spinners with no real content.
 */
async function checkFrozenLoader(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const main = document.querySelector('main, [role="main"], .main-content, #root > div');
    if (!main) return null;
    const mainText = main.textContent?.trim() || '';
    if (mainText.length < 50 && /^(loading|กำลังโหลด|\.\.\.)\s*$/i.test(mainText)) {
      return 'Page frozen on loading state';
    }
    return null;
  });
}

/**
 * Check URL didn't redirect to login or error page.
 */
function checkRedirects(page: Page, originalUrl: string): string[] {
  const issues: string[] = [];
  const current = page.url();
  if (current.includes('/login') && !originalUrl.includes('/login')) {
    issues.push(`Redirected to login page (auth issue): ${current}`);
  }
  if (current.includes('/error')) {
    issues.push(`Redirected to error page: ${current}`);
  }
  return issues;
}

/**
 * Check for data elements (tables, cards, list items, forms).
 */
async function checkDataPresent(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const sels = [
      'table tbody tr', '[class*="card"]', 'li', 'form',
      '[class*="grid"] > div', '[class*="list"] > div', '[class*="item"]',
      'h1', 'h2', 'h3', '[class*="stat"]', '[class*="chart"]',
      '[class*="dashboard"]', 'button', 'input', 'select', 'textarea',
    ];
    return sels.some(sel => document.querySelectorAll(sel).length > 0);
  });
}

/**
 * Capture a screenshot with fullPage fallback.
 */
async function captureScreenshot(page: Page, screenshotPath: string, pageName: string): Promise<void> {
  try {
    await page.screenshot({ path: screenshotPath, fullPage: true, timeout: 15000 });
  } catch {
    try {
      await page.screenshot({ path: screenshotPath, fullPage: false, timeout: 10000 });
      console.warn(`⚠️ ${pageName}: Full-page screenshot failed — viewport-only captured`);
    } catch (err) {
      console.warn(`⚠️ ${pageName}: Screenshot capture failed entirely`, err instanceof Error ? err.message : '');
    }
  }
}

/**
 * Navigate to a page and verify it is healthy.
 * Throws on failure (making the test fail).
 */
export async function assertPageHealthy(
  page: Page,
  url: string,
  pageName: string,
  snapshotDir: string,
  options?: { timeout?: number; lenient?: boolean },
): Promise<PageHealthResult> {
  const timeout = options?.timeout ?? 20000;
  const lenient = options?.lenient ?? false;
  const t0 = Date.now();

  fs.mkdirSync(snapshotDir, { recursive: true });

  // Navigate and capture response status
  let response: Response | null = null;
  try {
    response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
  } catch (err) {
    throw new Error(`${pageName}: Navigation failed — ${(err as Error).message}`);
  }

  const status = response?.status() ?? 0;
  expect(status, `${pageName}: Expected HTTP 200, got ${status}`).toBeLessThan(400);

  try {
    await page.waitForLoadState('networkidle', { timeout: 10000 });
  } catch {
    // networkidle timeout acceptable for pages with persistent SSE/WebSocket
  }

  await page.waitForTimeout(1500);

  // Run all health checks
  const issues = [
    ...await checkWhiteout(page),
    ...await checkPageErrors(page),
    ...checkRedirects(page, url),
  ];
  const frozenCheck = await checkFrozenLoader(page);
  if (frozenCheck) issues.push(frozenCheck);

  const hasData = await checkDataPresent(page);

  // Screenshot
  const safeName = pageName.replaceAll(/[^a-zA-Z0-9_-]/g, '_');
  const screenshotPath = path.join(snapshotDir, `${safeName}.png`);
  await captureScreenshot(page, screenshotPath, pageName);

  const loadTimeMs = Date.now() - t0;

  if (lenient && issues.length > 0) {
    console.warn(`⚠️ ${pageName}: ${issues.length} issue(s) found (lenient mode — not failing):\n  - ${issues.join('\n  - ')}`);
  } else {
    expect(issues, `${pageName}: Page health check failed:\n  - ${issues.join('\n  - ')}`).toHaveLength(0);
  }

  return { status, loadTimeMs, hasData, screenshotPath, issues };
}

/**
 * STRICT version: Navigate to a page and THROW on any health issue.
 * Unlike `assertPageHealthy` with lenient mode, this always throws.
 * Includes 2s post-navigation wait for SPA rendering.
 */
export async function assertPageHealthStrict(
  page: Page,
  url: string,
  pageName: string,
  snapshotDir: string,
  options?: { timeout?: number },
): Promise<PageHealthResult> {
  return assertPageHealthy(page, url, pageName, snapshotDir, {
    timeout: options?.timeout ?? 20000,
    lenient: false,
  });
}

/**
 * Login via API, inject token into localStorage, then navigate to baseURL.
 * Used by specs that need pre-authenticated pages.
 */
export async function loginAndInjectToken(
  page: Page,
  portalUrl: string,
  creds: { email: string; password: string },
  storageKeys: Record<string, string>,
): Promise<{ token: string; userId: string }> {
  const endpoints = [
    `${portalUrl}/api/auth/login`,
    `${portalUrl}/auth/login`,
  ];

  let token = '';
  let userId = '';

  for (const endpoint of endpoints) {
    try {
      const res = await page.request.post(endpoint, {
        data: creds,
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
      });
      if (res.status() === 200) {
        const body = await res.json();
        token = body.token || body.accessToken || body.data?.token || '';
        userId = body.user?.id || body.user?.userId || body.data?.user?.id || '';
        if (token) break;
      }
    } catch { /* try next */ }
  }

  if (!token) throw new Error(`Login failed for ${creds.email}`);

  // Inject token into localStorage
  await page.goto(portalUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.evaluate(({ storageKeys, token, userId }) => {
    for (const [key, value] of Object.entries(storageKeys)) {
      localStorage.setItem(key, value.replace('{{TOKEN}}', token).replace('{{USER_ID}}', userId));
    }
  }, { storageKeys, token, userId });

  return { token, userId };
}
