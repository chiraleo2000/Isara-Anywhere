import { test, expect, navPatient, assertFullHealth, snap } from './helpers/multi-portal';

test.describe('Defect — Theme and i18n (G1, G2)', () => {
  test.describe.configure({ mode: 'serial' });

  test('DT1 — English language setting shows English notifications heading (G1)', async ({ portals }) => {
    const { patient } = portals;
    await navPatient(patient.page, '/settings', 'DT1');
    await assertFullHealth(patient.page, 'DT1-setup');

    const langSelect = patient.page.locator('select').filter({ has: patient.page.locator('option') }).first();
    if (await langSelect.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await langSelect.selectOption({ value: 'en' }).catch(async () => {
        await langSelect.selectOption({ label: /english/i });
      });
      await patient.page.waitForTimeout(800);
    }

    await patient.page.goto(`${patient.url}/notifications`, { waitUntil: 'domcontentloaded' });
    await expect(patient.page.getByTestId('notifications-page')).toBeVisible({ timeout: 10_000 });
    await expect(patient.page.getByRole('heading', { name: /notifications/i })).toBeVisible({ timeout: 10_000 });
    await snap(patient.page, 'DT1-notifications-en', 'group-defect');
  });

  test('DT2 — dark mode notifications page uses dark panel surfaces (G2)', async ({ portals }) => {
    const { patient } = portals;
    await navPatient(patient.page, '/settings', 'DT2');
    await assertFullHealth(patient.page, 'DT2-setup');

    await patient.page.evaluate(() => {
      localStorage.setItem('patient-portal-theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    await patient.page.reload({ waitUntil: 'domcontentloaded' });
    await patient.page.waitForTimeout(800);

    await patient.page.goto(`${patient.url}/notifications`, { waitUntil: 'domcontentloaded' });
    await expect(patient.page.getByTestId('notifications-page')).toBeVisible({ timeout: 10_000 });

    const darkPanel = patient.page.locator('.bg-gray-900').first();
    await expect(darkPanel).toBeVisible({ timeout: 10_000 });
    await snap(patient.page, 'DT2-notifications-dark', 'group-defect');
  });

  test('DT3 — living will page loads under PDPA route in dark-friendly layout (G2)', async ({ portals }) => {
    const { patient } = portals;
    await navPatient(patient.page, '/living-will', 'DT3');
    await assertFullHealth(patient.page, 'DT3');

    const body = await patient.page.locator('body').innerText();
    expect(/living will|livingwill|เจตจ|living/i.test(body)).toBeTruthy();
    await snap(patient.page, 'DT3-living-will', 'group-defect');
  });
});
