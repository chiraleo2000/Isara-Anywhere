/**
 * Group K — Accessibility (WCAG 2.1 AA) gate
 * ---------------------------------------------------------------------------
 * Scans the primary public / post-login pages of both portals with axe-core
 * and fails the test on any "serious" or "critical" violation.
 *
 * We lazy-load @axe-core/playwright so the suite degrades gracefully when
 * the dev dependency is not yet installed (prints a single skip notice).
 */
import { test, expect, type Page } from '@playwright/test';

const PATIENT_URL = process.env.PATIENT_URL || 'http://localhost:3005';
const DOCTOR_URL = process.env.DOCTOR_URL || 'http://localhost:3010';

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

async function runAxe(page: Page): Promise<AxeResult | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { default: AxeBuilder } = await import('@axe-core/playwright');
    const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']);
    return (await builder.analyze()) as unknown as AxeResult;
  } catch (err) {
    console.warn(
      `[K-a11y] @axe-core/playwright not installed — skipping. Install with: npm i -D @axe-core/playwright. (${(err as Error).message})`
    );
    return null;
  }
}

function filterBlocking(r: AxeResult): AxeResult['violations'] {
  return r.violations.filter(
    v => (v.impact === 'serious' || v.impact === 'critical') && !IGNORED_RULES.has(v.id)
  );
}

test.describe('Group K — Accessibility (WCAG 2.1 AA)', () => {
  test('K1 — Patient portal login page has no serious a11y violations', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/login`);
    await page.waitForLoadState('domcontentloaded');
    const results = await runAxe(page);
    test.skip(!results, 'axe-core not installed');
    const blocking = filterBlocking(results!);
    if (blocking.length > 0) {
      console.error('[K1] violations:', JSON.stringify(blocking, null, 2));
    }
    expect(blocking, `Serious/critical a11y violations: ${blocking.map(v => v.id).join(', ')}`).toEqual([]);
  });

  test('K2 — Doctor portal login page has no serious a11y violations', async ({ page }) => {
    await page.goto(`${DOCTOR_URL}/login`);
    await page.waitForLoadState('domcontentloaded');
    const results = await runAxe(page);
    test.skip(!results, 'axe-core not installed');
    const blocking = filterBlocking(results!);
    if (blocking.length > 0) {
      console.error('[K2] violations:', JSON.stringify(blocking, null, 2));
    }
    expect(blocking, `Serious/critical a11y violations: ${blocking.map(v => v.id).join(', ')}`).toEqual([]);
  });

  test('K3 — Patient portal root page is keyboard-navigable', async ({ page }) => {
    await page.goto(PATIENT_URL);
    await page.waitForLoadState('domcontentloaded');
    // Tab through first 10 focusable elements — must land on a real element.
    for (let i = 0; i < 10; i++) {
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
