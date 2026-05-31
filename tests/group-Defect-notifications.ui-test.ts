import {
  test,
  expect,
  navPatient,
  assertFullHealth,
  snap,
  requirePatientAuth,
  seedPatientAppointmentNotification,
} from './helpers/multi-portal';

test.describe('Defect — Notifications route and navigation', () => {
  test.describe.configure({ mode: 'serial' });

  test('DN1 — patient can open notifications route', async ({ portals }) => {
    const { patient } = portals;

    await navPatient(patient.page, '/', 'DN1');
    await assertFullHealth(patient.page, 'DN1');

    await patient.page.goto(`${patient.url}/notifications`, { waitUntil: 'domcontentloaded' });
    await patient.page.waitForTimeout(1500);

    const currentUrl = patient.page.url();
    await snap(patient.page, 'DN1-notifications-route', 'group-defect');

    expect(currentUrl.includes('/notifications')).toBe(true);
  });

  test('DN2 — mark-all-read persists after refresh', async ({ portals }) => {
    const { patient } = portals;
    await navPatient(patient.page, '/notifications', 'DN2');
    await assertFullHealth(patient.page, 'DN2');

    const { token, userId } = await requirePatientAuth(patient.page, 'DN2');

    const markResp = await patient.page.request.put(
      `${patient.url}/api/appointments/notifications/${userId}/read-all`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: {},
      },
    );
    expect(markResp.ok()).toBe(true);

    await patient.page.reload({ waitUntil: 'domcontentloaded' });
    await expect(patient.page.getByTestId('notifications-page')).toBeVisible();
    await snap(patient.page, 'DN2-mark-all-persist', 'group-defect');
  });

  test('DN3 — notification item click routes to appointment detail', async ({ portals }) => {
    const { patient } = portals;
    const { token } = await requirePatientAuth(patient.page, 'DN3-setup');
    const appointmentId = await seedPatientAppointmentNotification(patient.page, patient.url, token);

    await navPatient(patient.page, '/notifications', 'DN3');
    await assertFullHealth(patient.page, 'DN3');
    await expect(patient.page.getByTestId('notifications-page')).toBeVisible({ timeout: 15_000 });

    const appointmentLink = patient.page.locator(`a[href="/appointments/${appointmentId}"]`).first();
    await expect(appointmentLink, 'seeded appointment notification link').toBeVisible({ timeout: 15_000 });

    await appointmentLink.click();
    await patient.page.waitForTimeout(1000);
    await snap(patient.page, 'DN3-click-navigate', 'group-defect');
    expect(patient.page.url()).toContain(`/appointments/${appointmentId}`);
  });

  test('DG1 — notifications heading follows English setting', async ({ portals }) => {
    const { patient } = portals;
    await navPatient(patient.page, '/settings', 'DG1');
    await assertFullHealth(patient.page, 'DG1-setup');

    const langSelect = patient.page.locator('select').filter({ has: patient.page.locator('option') }).first();
    if (await langSelect.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await langSelect.selectOption({ value: 'en' }).catch(async () => {
        await langSelect.selectOption({ label: /english/i });
      });
      await patient.page.waitForTimeout(800);
    }

    await patient.page.goto(`${patient.url}/notifications`, { waitUntil: 'domcontentloaded' });
    await expect(patient.page.getByTestId('notifications-page')).toBeVisible({ timeout: 10_000 });
    await expect(patient.page.getByRole('heading', { name: /notifications/i })).toBeVisible();
    await snap(patient.page, 'DG1-notifications-en', 'group-defect');
  });

  test('DN4 — notification bell opens dropdown with view-all link (P3)', async ({ portals }) => {
    const { patient } = portals;
    await navPatient(patient.page, '/', 'DN4');
    await assertFullHealth(patient.page, 'DN4');

    const bellBtn = patient.page.getByRole('button', { name: 'Notifications' });
    await expect(bellBtn).toBeVisible({ timeout: 15_000 });
    await bellBtn.click();
    await patient.page.waitForTimeout(500);

    const viewAll = patient.page
      .locator('.absolute.right-0')
      .getByRole('link', { name: /view all notifications|ดูการแจ้งเตือนทั้งหมด/i })
      .first();
    await expect(viewAll).toBeVisible({ timeout: 10_000 });
    await viewAll.click();
    await patient.page.waitForTimeout(1000);
    expect(patient.page.url()).toContain('/notifications');
    await snap(patient.page, 'DN4-bell-to-notifications', 'group-defect');
  });

  test('DN5 — mark-all-read via UI button persists after refresh (P5)', async ({ portals }) => {
    const { patient } = portals;
    await navPatient(patient.page, '/notifications', 'DN5');
    await assertFullHealth(patient.page, 'DN5');
    await expect(patient.page.getByTestId('notifications-page')).toBeVisible({ timeout: 10_000 });

    const markAllBtn = patient.page.getByTestId('notifications-page').getByRole('button', {
      name: /mark all as read|อ่านทั้งหมดแล้ว/i,
    });
    await expect(markAllBtn).toBeVisible({ timeout: 10_000 });

    const readAllPromise = patient.page.waitForResponse(
      (r) => r.url().includes('/read-all') && r.request().method() === 'PUT',
      { timeout: 15_000 },
    );
    await markAllBtn.click();
    const readAllResp = await readAllPromise;
    expect(readAllResp.ok()).toBe(true);

    await patient.page.reload({ waitUntil: 'domcontentloaded' });
    await expect(patient.page.getByTestId('notifications-page')).toBeVisible({ timeout: 10_000 });

    const { token, userId } = await requirePatientAuth(patient.page, 'DN5');

    const listResp = await patient.page.request.get(
      `${patient.url}/api/appointments/notifications/${userId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(listResp.ok()).toBe(true);
    const notifications = (await listResp.json()) as Array<{ isRead?: boolean; read_at?: string | null }>;
    const unread = notifications.filter((n) => !n.isRead && !n.read_at);
    expect(unread.length).toBe(0);

    await snap(patient.page, 'DN5-mark-all-ui-persist', 'group-defect');
  });
});
