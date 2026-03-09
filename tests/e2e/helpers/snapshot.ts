/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA — CLOUD TEST SNAPSHOT HELPER
 * ═══════════════════════════════════════════════════════════════════════
 * Takes full-page screenshots at each test step for cloud verification.
 * Captures timing metadata and organizes by spec/step.
 * ═══════════════════════════════════════════════════════════════════════
 */
import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SNAPSHOT_DIR = path.join(__dirname, '..', 'cloud-test-snapshots');

// Ensure snapshot directory exists
if (!fs.existsSync(SNAPSHOT_DIR)) {
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
}

interface SnapshotMeta {
  spec: string;
  step: string;
  timestamp: string;
  durationMs: number;
  url: string;
  file: string;
}

const metadata: SnapshotMeta[] = [];

/**
 * Take a full-page screenshot and save with timing metadata.
 * Waits 500ms for rendering before capture.
 * Never throws — snapshot failure must not fail a test.
 */
export async function takeSnapshot(
  page: Page,
  specName: string,
  stepName: string,
): Promise<void> {
  const t0 = Date.now();
  try {
    // Wait for rendering
    await page.waitForTimeout(500);

    const safeName = `${specName}--${stepName}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const specDir = path.join(SNAPSHOT_DIR, specName.replace(/[^a-zA-Z0-9_-]/g, '_'));
    if (!fs.existsSync(specDir)) fs.mkdirSync(specDir, { recursive: true });

    const fileName = `${safeName}--${Date.now()}.png`;
    const filePath = path.join(specDir, fileName);

    await page.screenshot({
      path: filePath,
      fullPage: true,
      timeout: 10000,
    });

    const entry: SnapshotMeta = {
      spec: specName,
      step: stepName,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - t0,
      url: page.url(),
      file: filePath,
    };
    metadata.push(entry);

    // Write metadata incrementally
    const reportPath = path.join(SNAPSHOT_DIR, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(metadata, null, 2));
  } catch {
    // Swallow — snapshot failure must never fail a test
  }
}

/**
 * Verify page has no persistent error or loading states.
 * Returns true if page looks healthy (no error banners / stuck loading).
 */
export async function verifyPageHealthy(page: Page, timeout = 10000): Promise<{ healthy: boolean; issues: string[] }> {
  const issues: string[] = [];

  try {
    await page.waitForLoadState('domcontentloaded', { timeout });
  } catch {
    issues.push('Page did not reach domcontentloaded');
  }

  // Wait for network to settle
  try {
    await page.waitForLoadState('networkidle', { timeout: 5000 });
  } catch {
    // networkidle timeout is acceptable — some pages have persistent connections
  }

  // Check for error indicators in the page (wrapped in try-catch for page lifecycle safety)
  try {
    const errorTexts = await page.evaluate(() => {
      const issues: string[] = [];
      const body = document.body?.innerText || '';
      const lower = body.toLowerCase();

      // Check for common error patterns
      if (lower.includes('failed to fetch') || lower.includes('network error')) {
        issues.push('Network/fetch error visible on page');
      }
      if (lower.includes('500 internal server') || lower.includes('502 bad gateway') || lower.includes('503 service')) {
        issues.push('Server error visible on page');
      }

      // Check for stuck loading ONLY if it's the primary content
      const mainContent = document.querySelector('main, [role="main"], .main-content, #root > div');
      if (mainContent) {
        const mainText = mainContent.textContent?.trim() || '';
        // Only flag if the ENTIRE main content is just a loading indicator
        if (mainText.length < 50 && (/^(loading|กำลังโหลด|\.\.\.)\s*$/i.test(mainText))) {
          issues.push('Page appears stuck on loading state');
        }
      }

      return issues;
    });

    issues.push(...errorTexts);
  } catch {
    // page.evaluate can fail if page/context was closed — not an actual health issue
  }

  return { healthy: issues.length === 0, issues };
}
