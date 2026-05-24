/**
 * Cross-portal E2E diagnostics — console, network, page errors by role/browser.
 */
import type { Page } from '@playwright/test';
import type { Portal } from './multi-portal';
import { isConnectionRefusedError } from './browser-matrix';

export type IssueCategory =
  | 'console'
  | 'network'
  | 'render'
  | 'sync'
  | 'auth'
  | 'jitsi'
  | 'infrastructure';

export interface PortalIssue {
  portal: string;
  browser: string;
  category: IssueCategory;
  message: string;
  url?: string;
  timestamp: string;
}

const issues: PortalIssue[] = [];

export function getPortalIssues(): PortalIssue[] {
  return [...issues];
}

export function clearPortalIssues(): void {
  issues.length = 0;
}

function pushIssue(
  portal: string,
  browser: string,
  category: IssueCategory,
  message: string,
  url?: string,
): void {
  issues.push({
    portal,
    browser,
    category,
    message: message.slice(0, 500),
    url,
    timestamp: new Date().toISOString(),
  });
}

export function attachPortalDiagnostics(portal: Portal): void {
  const { page, role, browserName } = portal;

  page.on('console', (msg) => {
    const type = msg.type();
    if (type !== 'error' && type !== 'warning') return;
    const text = msg.text();
    if (/favicon|devtools|extension/i.test(text)) return;
    pushIssue(role, browserName, type === 'error' ? 'console' : 'render', `[${type}] ${text}`, page.url());
  });

  page.on('pageerror', (err) => {
    pushIssue(role, browserName, 'console', `Uncaught: ${err.message}`, page.url());
  });

  page.on('requestfailed', (req) => {
    const failure = req.failure();
    const errText = failure?.errorText || 'unknown';
    if (/favicon|sockjs|analytics/i.test(req.url())) return;
    const category: IssueCategory = isConnectionRefusedError(errText)
      ? 'infrastructure'
      : req.url().includes('meet.jit.si') || req.url().includes('/api/meetings')
        ? 'jitsi'
        : 'network';
    pushIssue(role, browserName, category, `${req.method()} ${req.url()} — ${errText}`, page.url());
  });

  page.on('response', (res) => {
    if (res.status() < 400) return;
    const url = res.url();
    if (!url.includes('localhost') && !url.includes('run.app') && !url.includes('jit.si')) return;
    if (/favicon|\.map$/i.test(url)) return;
    pushIssue(role, browserName, 'network', `HTTP ${res.status()} ${url}`, page.url());
  });
}

/** Snapshot layout/whiteout hints for Firefox vs Chrome divergence */
export async function probeRenderHealth(page: Page, portal: Portal, label: string): Promise<void> {
  try {
    const health = await page.evaluate(() => {
      const textLen = document.body?.innerText?.trim().length ?? 0;
      const spinners = document.querySelectorAll('[class*="animate-spin"], [class*="loading"]').length;
      const iframes = document.querySelectorAll('iframe').length;
      const login = /\/login|\/register/.test(location.pathname);
      return { textLen, spinners, iframes, login, path: location.pathname };
    });
    if (health.login) {
      pushIssue(portal.role, portal.browserName, 'auth', `${label}: redirected to login`, page.url());
    }
    if (health.textLen < 50) {
      pushIssue(portal.role, portal.browserName, 'render', `${label}: whiteout/sparse body (${health.textLen} chars)`, page.url());
    }
    if (health.spinners > 2) {
      pushIssue(portal.role, portal.browserName, 'sync', `${label}: ${health.spinners} loading spinners still visible`, page.url());
    }
  } catch {
    /* page closed */
  }
}

export function formatDiagnosticReport(): string {
  if (issues.length === 0) return 'No portal diagnostics captured.';
  const lines = ['\n═══ PORTAL DIAGNOSTIC REPORT ═══'];
  const byBrowser = new Map<string, PortalIssue[]>();
  for (const i of issues) {
    const key = `${i.portal}/${i.browser}`;
    if (!byBrowser.has(key)) byBrowser.set(key, []);
    byBrowser.get(key)!.push(i);
  }
  for (const [key, list] of byBrowser) {
    lines.push(`\n[${key}] (${list.length} issue(s))`);
    for (const i of list) {
      lines.push(`  • [${i.category}] ${i.message}`);
      if (i.url) lines.push(`    url: ${i.url}`);
    }
  }
  lines.push(`\nTotal issues: ${issues.length}\n`);
  return lines.join('\n');
}
