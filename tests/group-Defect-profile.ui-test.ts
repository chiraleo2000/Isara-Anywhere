import fs from 'node:fs';
import path from 'node:path';

import { test, expect, navPatient, assertFullHealth, snap } from './helpers/multi-portal';

const AUTH_DIR = path.join(__dirname, 'e2e', '.auth-states');

function reinjectPatientAuth(page: import('@playwright/test').Page): Promise<void> {
  const patientState = path.join(AUTH_DIR, 'patient1.json');
  if (!fs.existsSync(patientState)) return Promise.resolve();
  const state = JSON.parse(fs.readFileSync(patientState, 'utf-8'));
  const items = state.origins?.[0]?.localStorage || [];
  return page.evaluate((entries: { name: string; value: string }[]) => {
    localStorage.clear();
    for (const e of entries) localStorage.setItem(e.name, e.value);
    localStorage.setItem('izara_patient_last_activity', Date.now().toString());
  }, items);
}

test.describe('Defect — PHR profile persistence after re-login', () => {
  test.describe.configure({ mode: 'serial' });

  test('DP1 — profile fields persist after logout and re-login (P6)', async ({ portals }) => {
    const { patient } = portals;
    const marker = `DEFECT-DP1-${Date.now()}`;

    await navPatient(patient.page, '/profile', 'DP1');
    await assertFullHealth(patient.page, 'DP1');

    const editBtn = patient.page.getByRole('button', { name: /แก้ไข|edit/i });
    await expect(editBtn).toBeVisible({ timeout: 15_000 });
    await editBtn.click();

    const addressInput = patient.page.locator('#profile-address');
    await expect(addressInput).toBeVisible({ timeout: 10_000 });
    await addressInput.fill(marker);

    const saveBtn = patient.page.getByRole('button', { name: /บันทึก|save/i });
    const saveResp = patient.page.waitForResponse(
      (r) => r.url().includes('/api/phr/profile') && r.request().method() === 'PUT',
      { timeout: 20_000 },
    );
    await saveBtn.click();
    const saved = await saveResp;
    expect(saved.ok(), `profile save HTTP ${saved.status()}`).toBeTruthy();
    await expect(patient.page.locator('body')).toContainText(marker, { timeout: 10_000 });

    await patient.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await reinjectPatientAuth(patient.page);
    await patient.page.reload({ waitUntil: 'domcontentloaded' });
    await patient.page.waitForTimeout(1500);

    await navPatient(patient.page, '/profile', 'DP1-relogin');
    await assertFullHealth(patient.page, 'DP1-relogin');

    await expect(patient.page.locator('body')).toContainText(marker, { timeout: 15_000 });
    await snap(patient.page, 'DP1-phr-persist-relogin', 'group-defect');
  });
});
