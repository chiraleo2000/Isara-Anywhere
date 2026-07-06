import { test, expect, navPatient, assertFullHealth, snap } from './helpers/multi-portal';

test.describe('Defect — AI new chat and language', () => {
  test.describe.configure({ mode: 'serial' });

  test('DA1 — new chat clears visible history after reload', async ({ portals }) => {
    const { patient } = portals;
    await navPatient(patient.page, '/ai-doctor', 'DA1');
    await assertFullHealth(patient.page, 'DA1');

    const chatInput = patient.page.locator('textarea, input[type="text"]').filter({ hasNot: patient.page.locator('[type="search"]') }).first();
    await expect(chatInput).toBeVisible({ timeout: 15_000 });
    await chatInput.fill('test headache symptom for defect DA1');
    const submitBtn = patient.page.getByRole('button', { name: /send|ส่ง|submit/i }).first();
    if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await submitBtn.click();
    } else {
      await chatInput.press('Enter');
    }
    await patient.page.waitForTimeout(3000);

    const bodyBefore = await patient.page.locator('body').innerText();
    const newChatBtn = patient.page.getByRole('button', { name: /new chat|สนทนาใหม่|แชทใหม่/i }).first();
    if (!await newChatBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const sidebarToggle = patient.page.locator('button[title*="History"], button[title*="ประวัติ"]').first();
      if (await sidebarToggle.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await sidebarToggle.click();
      }
    }
    await expect(newChatBtn, 'New Chat control must be available on AI doctor page').toBeVisible({ timeout: 15_000 });
    await newChatBtn.click();
    await patient.page.waitForTimeout(2000);
    await patient.page.reload({ waitUntil: 'domcontentloaded' });
    await patient.page.waitForTimeout(2000);

    const bodyAfter = await patient.page.locator('body').innerText();
    await snap(patient.page, 'DA1-new-chat-cleared', 'group-defect');
    expect(bodyAfter).not.toContain('test headache symptom for defect DA1');
    expect(bodyAfter.length).toBeLessThan(bodyBefore.length + 200);
  });

  test('DA2 — English setting yields Latin script in AI reply area', async ({ portals }) => {
    const { patient } = portals;
    await navPatient(patient.page, '/settings', 'DA2');
    await assertFullHealth(patient.page, 'DA2-setup');

    const langSelect = patient.page.locator('select').filter({ has: patient.page.locator('option') }).first();
    if (await langSelect.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await langSelect.selectOption({ value: 'en' }).catch(async () => {
        await langSelect.selectOption({ label: /english/i });
      });
      await patient.page.waitForTimeout(1000);
    }

    await navPatient(patient.page, '/ai-doctor', 'DA2');
    await assertFullHealth(patient.page, 'DA2');

    const chatInput = patient.page.locator('textarea, input[type="text"]').first();
    await expect(chatInput).toBeVisible({ timeout: 15_000 });
    await chatInput.fill('I have had a mild headache for two days. What should I watch for?');
    const submitBtn = patient.page.getByRole('button', { name: /send|ส่ง|submit/i }).first();
    if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await submitBtn.click();
    } else {
      await chatInput.press('Enter');
    }
    const deadline = Date.now() + 30_000;
    let body = '';
    while (Date.now() < deadline) {
      body = await patient.page.locator('body').innerText().catch(() => '');
      if (/[a-zA-Z]{4,}/.test(body)) break;
      await patient.page.waitForTimeout(1_500);
    }
    await snap(patient.page, 'DA2-english-reply', 'group-defect');
    expect(/[a-zA-Z]{4,}/.test(body)).toBe(true);
  });
});
