/**
 * Structured success screenshots for multi-browser core workflow runs.
 * Output: tests/output/screenshots/{browser}/{workflow}/{step}.png
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Page } from '@playwright/test';
import { resolveCoreBrowserEngine, type BrowserEngine } from './browser-matrix';

export const SCREENSHOT_ROOT = path.join(__dirname, '..', 'output', 'screenshots');

export function resolveScreenshotBrowser(): BrowserEngine {
  return resolveCoreBrowserEngine() ?? 'chromium';
}

/** Full-page screenshot written only after a workflow step passes validation. */
export async function snapSuccess(
  page: Page,
  stepId: string,
  workflow = 'group-W',
): Promise<string> {
  const browser = resolveScreenshotBrowser();
  const safeWorkflow = workflow.replaceAll(/[^a-zA-Z0-9_-]/g, '_');
  const safeStep = stepId.replaceAll(/[^a-zA-Z0-9_-]/g, '_');
  const dir = path.join(SCREENSHOT_ROOT, browser, safeWorkflow);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${safeStep}.png`);
  const ssTimeout = browser === 'firefox' ? 15_000 : 8_000;

  try {
    await page.screenshot({
      path: filePath,
      fullPage: true,
      timeout: ssTimeout,
      animations: 'disabled',
    });
  } catch {
    await page.screenshot({
      path: filePath,
      fullPage: false,
      timeout: ssTimeout,
      animations: 'disabled',
    });
  }

  console.log(`  📸 tests/output/screenshots/${browser}/${safeWorkflow}/${safeStep}.png`);
  return filePath;
}
