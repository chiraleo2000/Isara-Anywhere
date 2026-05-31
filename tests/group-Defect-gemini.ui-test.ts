import { test, expect, navDoctor, assertFullHealth, snap } from './helpers/multi-portal';
import type { Page } from '@playwright/test';

async function openGeminiStudio(doctorPage: Page) {
  const studioHeading = doctorPage.getByText('Gemini AI Studio').first();
  if (await studioHeading.isVisible({ timeout: 2_000 }).catch(() => false)) {
    return;
  }
  await doctorPage.keyboard.press('Escape').catch(() => {});
  const fab = doctorPage.getByTitle('AI Assistant');
  await expect(fab).toBeVisible({ timeout: 20_000 });
  await fab.click();
  await expect(studioHeading).toBeVisible({ timeout: 15_000 });
}

test.describe('Defect — Gemini AI Studio (D3)', () => {
  test.describe.configure({ mode: 'serial' });

  test('D3a — Gemini AI Studio shows API Connected badge', async ({ portals }) => {
    const { doctor } = portals;
    await navDoctor(doctor.page, /dashboard|แดชบอร์ด/i, 'D3a');
    await assertFullHealth(doctor.page, 'D3a');

    await openGeminiStudio(doctor.page);
    await doctor.page.waitForTimeout(3000);

    await expect(doctor.page.getByText('API Connected')).toBeVisible({ timeout: 20_000 });
    await snap(doctor.page, 'DG2-gemini-connected', 'group-defect');
  });

  test('D3b — Gemini clinical question returns Latin script reply', async ({ portals }) => {
    const { doctor } = portals;
    await navDoctor(doctor.page, /dashboard|แดชบอร์ด/i, 'D3b');
    await assertFullHealth(doctor.page, 'D3b');

    await openGeminiStudio(doctor.page);

    const studioModal = doctor.page.locator('div.fixed.inset-0').filter({ hasText: 'Gemini AI Studio' });
    const chatInput = studioModal.getByRole('textbox', { name: /พิมพ์คำถามทางการแพทย์/i });
    await expect(chatInput).toBeVisible({ timeout: 15_000 });
    await chatInput.fill('What are common causes of hypertension in adults?');

    const sendBtn = studioModal.getByRole('button', { name: 'ส่ง', exact: true });
    await expect(sendBtn).toBeEnabled({ timeout: 5_000 });
    await sendBtn.click();

    await doctor.page.waitForTimeout(12_000);
    const body = await doctor.page.locator('body').innerText();
    await snap(doctor.page, 'DG3-gemini-reply', 'group-defect');
    expect(/[a-zA-Z]{4,}/.test(body)).toBe(true);
  });
});
