import { expect, type Page } from '@playwright/test';

/** Assert no horizontal scroll on document/body (responsive layout gate). */
export async function assertNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
  const vp = page.viewportSize();
  // phone-xs (320): allow tiny subpixel / scrollbar gutter; still catch real layout blowouts
  const slack = vp && vp.width <= 360 ? 16 : 0;
  expect(overflow.doc, 'document horizontal overflow').toBeLessThanOrEqual(slack);
  expect(overflow.body, 'body horizontal overflow').toBeLessThanOrEqual(slack);
}

/** Main content region should be visible and not clipped below fold on short viewports. */
export async function assertMainContentVisible(page: Page, testId = 'main-content') {
  const url = page.url();
  if (/\/login|\/register|\/reset-password/i.test(url)) {
    throw new Error(`assertMainContentVisible: still on auth shell (${url}) — session restore failed`);
  }
  // Prefer explicit testid; fall back to landmark. Scroll into view for short phone viewports.
  const main = page.locator(`[data-testid="${testId}"]`).or(page.locator('main, [role="main"]')).first();
  await main.waitFor({ state: 'attached', timeout: 15_000 }).catch(() => undefined);
  await main.scrollIntoViewIfNeeded().catch(() => undefined);
  await expect(main).toBeVisible({ timeout: 15_000 });
  const box = await main.boundingBox();
  // On very short phone viewports, allow slightly shorter main if still interactable.
  expect(box?.height ?? 0).toBeGreaterThan(24);
}
