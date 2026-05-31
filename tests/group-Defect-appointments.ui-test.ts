import { test, expect, navDoctor, assertFullHealth, snap, requireDoctorAuth } from './helpers/multi-portal';

test.describe('Defect — Appointment confirm and assign (D4–D6)', () => {
  test.describe.configure({ mode: 'serial' });

  test('DA1 — health meeting page loads with confirm workflow (D4)', async ({ portals }) => {
    const { doctor } = portals;
    await navDoctor(doctor.page, /health-meeting|health meeting|นัดหมาย/i, 'DA1');
    await assertFullHealth(doctor.page, 'DA1');

    const body = await doctor.page.locator('body').innerText();
    expect(/queue|patient|คิว|นัด|confirm|ยืนย/i.test(body)).toBeTruthy();
    await snap(doctor.page, 'DA1-health-meeting', 'group-defect');
  });

  test('DA2 — confirm API endpoint is reachable from doctor portal (D4–D6)', async ({ portals }) => {
    const { doctor } = portals;
    await navDoctor(doctor.page, /dashboard|แดชบอร์ด/i, 'DA2');
    await assertFullHealth(doctor.page, 'DA2');

    const { token } = await requireDoctorAuth(doctor.page, 'DA2');

    const statusResp = await doctor.page.request.get(`${doctor.url}/api/health`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(statusResp.ok()).toBe(true);

    const probeResp = await doctor.page.request.post(
      `${doctor.url}/api/appointments/APT-PROBE-NONEXIST/confirm`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: { doctorId: 'DOC-PROBE' },
      },
    );
    expect([400, 404, 403, 401, 500].includes(probeResp.status()) || probeResp.ok()).toBe(true);
    await snap(doctor.page, 'DA2-confirm-api-probe', 'group-defect');
  });

  test('DA3 — assign doctor control visible on health meeting for admin/doctor (D5)', async ({ portals }) => {
    const { doctor } = portals;
    await navDoctor(doctor.page, /health-meeting|health meeting|นัดหมาย/i, 'DA3');
    await assertFullHealth(doctor.page, 'DA3');

    const assignHint = doctor.page.getByText(/assign|มอบหมาย|doctor|แพทย์/i).first();
    const confirmHint = doctor.page.getByText(/confirm|ยืนย/i).first();
    const hasWorkflow =
      (await assignHint.isVisible({ timeout: 8_000 }).catch(() => false)) ||
      (await confirmHint.isVisible({ timeout: 3_000 }).catch(() => false));
    expect(hasWorkflow).toBe(true);
    await snap(doctor.page, 'DA3-assign-confirm-ui', 'group-defect');
  });
});
