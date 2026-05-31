import { test, expect, navDoctor, assertFullHealth, snap, requireDoctorAuth } from './helpers/multi-portal';

test.describe('Defect — Clinical resources (D7–D8)', () => {
  test.describe.configure({ mode: 'serial' });

  test('DC1 — clinical resources page loads without white screen (D7)', async ({ portals }) => {
    const { doctor } = portals;
    await navDoctor(doctor.page, 'clinical-resources', 'DC1');
    await assertFullHealth(doctor.page, 'DC1');

    const body = await doctor.page.locator('body').innerText();
    expect(body.trim().length).toBeGreaterThan(50);
    expect(/clinical|คลินิก|resource|ทรัพยากร|guideline|protocol|content/i.test(body)).toBeTruthy();
    await snap(doctor.page, 'DC1-clinical-resources', 'group-defect');
  });

  test('DC2 — clinical resources API returns list payload (D8)', async ({ portals }) => {
    const { doctor } = portals;
    await navDoctor(doctor.page, 'clinical-resources', 'DC2');
    await assertFullHealth(doctor.page, 'DC2');

    const { token } = await requireDoctorAuth(doctor.page, 'DC2');

    const listResp = await doctor.page.request.get(`${doctor.url}/api/medical-content`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listResp.ok()).toBe(true);
    const payload = await listResp.json();
    expect(payload).toBeTruthy();
    expect(Array.isArray(payload.articles) || Array.isArray(payload)).toBeTruthy();
    await snap(doctor.page, 'DC2-clinical-api', 'group-defect');
  });
});
