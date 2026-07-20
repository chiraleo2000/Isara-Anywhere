/**
 * Gemini-lite gate helpers — when PW_SKIP_LIVE_GEMINI=1, assert AI UI mounts only (no live API wait).
 */
import { expect, type Page } from '@playwright/test';

export function isSkipLiveGemini(): boolean {
  return process.env.PW_SKIP_LIVE_GEMINI === '1' || process.env.PW_SKIP_LIVE_GEMINI === 'true';
}

export type AiMountOnlyOptions = {
  /** CSS selectors that must be visible when skipping live Gemini */
  selectors?: string[];
  /** Body text pattern that confirms the AI surface mounted */
  bodyPattern?: RegExp;
  /** Log label prefix */
  label?: string;
};

/**
 * When PW_SKIP_LIVE_GEMINI=1, assert AI-related UI mounted and return true
 * (caller should skip live Gemini interaction steps).
 */
export async function assertAiMountOnlyWhenSkipped(
  page: Page,
  options: AiMountOnlyOptions = {},
): Promise<boolean> {
  if (!isSkipLiveGemini()) return false;

  const label = options.label ?? 'AI mount-only';
  const mountTimeout = process.env.TEST_ENV === 'cloud' ? 45_000 : 15_000;
  const bodyPreview = await page.locator('body').innerText().catch(() => '');
  const url = page.url();
  const isPatientOrigin = /:3005\b|izara-patient|patient-portal/i.test(url);
  if (
    isPatientOrigin
    && /พอร์ทัลแพทย์|Doctor Portal/i.test(bodyPreview)
    && !/AI Doctor|หมอ AI|ai-doctor/i.test(url)
  ) {
    throw new Error(`${label}: patient test landed on doctor portal (${url})`);
  }
  if (options.selectors?.length) {
    let locator = page.locator(options.selectors[0]).first();
    for (let i = 1; i < options.selectors.length; i++) {
      locator = locator.or(page.locator(options.selectors[i]).first());
    }
    await expect(locator.first(), `${label}: ${options.selectors.join(' | ')}`).toBeVisible({
      timeout: mountTimeout,
    });
  }
  if (options.bodyPattern) {
    const body = await page.locator('body').innerText();
    expect(options.bodyPattern.test(body), `${label}: page content`).toBeTruthy();
  }
  console.log(`  ${label}: Gemini-lite mount-only OK (PW_SKIP_LIVE_GEMINI=1)`);
  return true;
}
