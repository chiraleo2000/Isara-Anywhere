/**
 * A2b — patient register + reset-password (isolated from tri-browser worker fixture).
 * Runs in project A2b-public-auth before A-auth so register UI is not starved by 3 headed browsers.
 */
import { test, expect } from '@playwright/test';
import {
  assertFullHealth,
  gotoCloudWithRetry,
  PATIENT_URL,
  snap,
} from './helpers/multi-portal';

test.describe('Group A2b — Public auth shells', () => {
  test('A2b — Patient register and reset-password UI', async ({ browser }) => {
    test.setTimeout(600_000);
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await gotoCloudWithRetry(page, `${PATIENT_URL}/register`, 'A2b/register');
      await expect(page.locator('#register-email')).toBeVisible({ timeout: 120_000 });
      await assertFullHealth(page, 'A2b/register');

      await gotoCloudWithRetry(page, `${PATIENT_URL}/reset-password`, 'A2b/reset-password');
      await page.waitForLoadState('domcontentloaded');
      await page.locator('#root').waitFor({ state: 'attached', timeout: 15_000 }).catch(() => {});
      await assertFullHealth(page, 'A2b/reset-password');
      await expect(
        page.getByText(/โทเค็น|รีเซ็ตรหัสผ่าน|reset password/i).first(),
      ).toBeVisible({ timeout: 10_000 });

      await snap(page, 'A2b-auth-registration', 'group-A');
    } finally {
      await ctx.close().catch(() => {});
    }
  });
});
