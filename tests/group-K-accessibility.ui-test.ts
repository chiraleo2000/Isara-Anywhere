/**
 * Group K — Accessibility (WCAG 2.1 AA) gate
 * ---------------------------------------------------------------------------
 * Scans the primary public / post-login pages of both portals with axe-core
 * and fails the test on any "serious" or "critical" violation.
 *
 * @axe-core/playwright is a required dev dependency; the suite fails hard
 * if it cannot be loaded (no silent skips).
 */
import { test, expect, type Page } from '@playwright/test';
import { PATIENT_URL, DOCTOR_URL, gotoCloudWithRetry } from './helpers/multi-portal';

const IS_CLOUD = process.env.TEST_ENV === 'cloud';
const LOGIN_NAV_TIMEOUT = IS_CLOUD ? 90_000 : (process.env.PW_HEADED === '1' ? 60_000 : 30_000);

const IGNORED_RULES = new Set<string>([
  // Jitsi iframe injects color-contrast failures we don't own.
  'color-contrast',
]);

interface AxeResult {
  violations: Array<{
    id: string;
    impact: 'minor' | 'moderate' | 'serious' | 'critical';
    description: string;
    nodes: Array<{ target: string[] }>;
  }>;
}

async function runAxe(page: Page): Promise<AxeResult> {
  // @axe-core/playwright is a required dev dependency. Any import failure is a
  // hard error so the suite never silently degrades into a skip.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']);
  return (await builder.analyze()) as unknown as AxeResult;
}

function filterBlocking(r: AxeResult): AxeResult['violations'] {
  return r.violations.filter(
    v => (v.impact === 'serious' || v.impact === 'critical') && !IGNORED_RULES.has(v.id)
  );
}

test.describe('Group K — Accessibility (WCAG 2.1 AA)', () => {
  test('K1 — Patient portal login page has no serious a11y violations', async ({ page }) => {
    await gotoCloudWithRetry(page, `${PATIENT_URL}/login`, 'K1-login', LOGIN_NAV_TIMEOUT);
    const results = await runAxe(page);
    const blocking = filterBlocking(results);
    if (blocking.length > 0) {
      console.error('[K1] violations:', JSON.stringify(blocking, null, 2));
    }
    expect(blocking, `Serious/critical a11y violations: ${blocking.map(v => v.id).join(', ')}`).toEqual([]);
  });

  test('K2 — Doctor portal login page has no serious a11y violations', async ({ page }) => {
    await gotoCloudWithRetry(page, `${DOCTOR_URL}/login`, 'K2-login', LOGIN_NAV_TIMEOUT);
    const results = await runAxe(page);
    const blocking = filterBlocking(results);
    if (blocking.length > 0) {
      console.error('[K2] violations:', JSON.stringify(blocking, null, 2));
    }
    expect(blocking, `Serious/critical a11y violations: ${blocking.map(v => v.id).join(', ')}`).toEqual([]);
  });

  test('K3 — Patient portal root page is keyboard-navigable', async ({ page }) => {
    await gotoCloudWithRetry(page, `${PATIENT_URL}/login`, 'K3/patient-login');
    const focusable = page.locator('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    await expect(focusable.first()).toBeVisible({ timeout: IS_CLOUD ? 30_000 : 15_000 });
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
    }
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? { tag: el.tagName, id: el.id, role: el.getAttribute('role') } : null;
    });
    expect(focused, 'Tab navigation did not land on any focusable element').not.toBeNull();
    expect(focused!.tag).not.toBe('BODY');
  });
});
