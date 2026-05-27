import { expect, type Page } from '@playwright/test';

/** Assert no horizontal scroll on document/body (responsive layout gate). */
export async function assertNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    body: document.body.scrollWidth > document.body.clientWidth,
  }));
  expect(overflow.doc, 'document horizontal overflow').toBe(false);
  expect(overflow.body, 'body horizontal overflow').toBe(false);
}

/** Main content region should be visible and not clipped below fold on short viewports. */
export async function assertMainContentVisible(page: Page, testId = 'main-content') {
  const main = page.locator(`[data-testid="${testId}"], main, [role="main"]`).first();
  await expect(main).toBeVisible({ timeout: 15_000 });
  const box = await main.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThan(40);
}
