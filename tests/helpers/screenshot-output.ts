/**
 * Structured success screenshots for multi-browser core workflow runs.
 * Output: tests/output/screenshots/{browser}/{workflow}/{step}.png
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { expect, type Locator, type Page } from '@playwright/test';
import { resolveCoreBrowserEngine, type BrowserEngine } from './browser-matrix';
import { registerScreenshotHash } from './screenshot-distinct';

export const SCREENSHOT_ROOT = path.join(__dirname, '..', 'output', 'screenshots');
const DOCS_SS_ROOT = path.join(__dirname, '..', '..', 'docs', 'screenshots');

export function resolveScreenshotBrowser(): BrowserEngine {
  return resolveCoreBrowserEngine() ?? 'chromium';
}

async function writeScreenshot(
  page: Page,
  filePath: string,
  options: { locator?: Locator; fullPage?: boolean },
): Promise<void> {
  const browser = resolveScreenshotBrowser();
  const ssTimeout = browser === 'firefox' ? 15_000 : 8_000;
  const base = {
    path: filePath,
    timeout: ssTimeout,
    animations: 'disabled' as const,
  };
  try {
    if (options.locator) {
      await options.locator.screenshot({ ...base });
    } else {
      await page.screenshot({ ...base, fullPage: options.fullPage ?? true });
    }
  } catch {
    if (options.locator) {
      await options.locator.screenshot({ ...base, timeout: ssTimeout });
    } else {
      await page.screenshot({ ...base, fullPage: false });
    }
  }
}

/** Wait for any of testIds visible, screenshot element + copy to docs/screenshots/{subDir}. */
export async function snapMeetingStageAny(
  page: Page,
  name: string,
  testIds: string[],
  subDir = 'group-Q',
): Promise<string> {
  const selector = testIds.map((id) => `[data-testid="${id}"]`).join(', ');
  const locator = page.locator(selector).first();
  await expect(locator, `${name}: ${testIds.join('|')}`).toBeVisible({ timeout: 90_000 });

  const safeSubDir = subDir.replaceAll(/[^a-zA-Z0-9_-]/g, '_');
  const safeName = name.replaceAll(/[^a-zA-Z0-9_-]/g, '_');
  const browser = resolveScreenshotBrowser();

  const outDir = path.join(SCREENSHOT_ROOT, browser, safeSubDir);
  const docsDir = path.join(DOCS_SS_ROOT, safeSubDir);
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(docsDir, { recursive: true });

  const filePath = path.join(outDir, `${safeName}.png`);
  const docsPath = path.join(docsDir, `${safeName}.png`);
  await writeScreenshot(page, filePath, { locator });
  const minBytes = Number.parseInt(process.env.SCREENSHOT_MIN_BYTES || '15000', 10);
  if (fs.statSync(filePath).size < minBytes) {
    await writeScreenshot(page, filePath, { fullPage: true });
  }
  fs.copyFileSync(filePath, docsPath);
  registerScreenshotHash(safeSubDir, docsPath);
  console.log(`  📸 ${path.relative(path.join(__dirname, '..', '..'), docsPath)}`);
  return docsPath;
}

/** Wait for testid, screenshot element + copy to docs/screenshots/{subDir}. */
export async function snapMeetingStage(
  page: Page,
  name: string,
  testId: string,
  subDir = 'group-Q',
): Promise<string> {
  const locator = page.getByTestId(testId).first();
  await expect(locator, `${name}: ${testId}`).toBeVisible({ timeout: 90_000 });

  const safeSubDir = subDir.replaceAll(/[^a-zA-Z0-9_-]/g, '_');
  const safeName = name.replaceAll(/[^a-zA-Z0-9_-]/g, '_');
  const browser = resolveScreenshotBrowser();

  const outDir = path.join(SCREENSHOT_ROOT, browser, safeSubDir);
  const docsDir = path.join(DOCS_SS_ROOT, safeSubDir);
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(docsDir, { recursive: true });

  const filePath = path.join(outDir, `${safeName}.png`);
  const docsPath = path.join(docsDir, `${safeName}.png`);
  await writeScreenshot(page, filePath, { locator });
  const minBytes = Number.parseInt(process.env.SCREENSHOT_MIN_BYTES || '15000', 10);
  if (fs.statSync(filePath).size < minBytes) {
    await writeScreenshot(page, filePath, { fullPage: true });
  }
  fs.copyFileSync(filePath, docsPath);
  registerScreenshotHash(safeSubDir, docsPath);
  console.log(`  📸 ${path.relative(path.join(__dirname, '..', '..'), docsPath)}`);
  return docsPath;
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
