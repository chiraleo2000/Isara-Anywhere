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
  if (options.selectors?.length) {
    for (const selector of options.selectors) {
      await expect(page.locator(selector).first(), `${label}: ${selector}`).toBeVisible({
        timeout: 15_000,
      });
    }
  }
  if (options.bodyPattern) {
    const body = await page.locator('body').innerText();
    expect(options.bodyPattern.test(body), `${label}: page content`).toBeTruthy();
  }
  console.log(`  ${label}: Gemini-lite mount-only OK (PW_SKIP_LIVE_GEMINI=1)`);
  return true;
}
