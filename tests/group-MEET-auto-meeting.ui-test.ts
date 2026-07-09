/**
 * MEET-AUTO — Doctor health-meeting queue vs explicit ?autostart= deep-links
 */
import {
  test,
  expect,
  assertNotLogin,
  doctorHealthMeetingUrl,
  DOCTOR_URL,
} from './helpers/multi-portal';
import { loadWorkflowState } from './helpers/workflow-state';

const DOCTOR_ID = process.env.TEST_DOCTOR_ID || 'DOC-TEST-001';

test.describe('MEET-AUTO — Doctor health-meeting autostart', () => {
  test('MEET-AUTO-01 — sidebar health-meeting shows queue (no autostart)', async ({ portals }) => {
    const { doctor } = portals;
    await doctor.page.goto(`${DOCTOR_URL}/doctor/${DOCTOR_ID}/health-meeting`, {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    await expect(doctor.page).toHaveURL(/\/health-meeting/);
    assertNotLogin(doctor.page, 'MEET-AUTO-01');
    await expect(doctor.page.getByTestId('health-meeting-page')).toBeVisible({ timeout: 15_000 });
    await expect(
      doctor.page.getByTestId('queue-list').or(doctor.page.getByTestId('queue-count')).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('MEET-AUTO-02 — stayOnQueue=1 keeps health-meeting queue UI', async ({ portals }) => {
    const { doctor } = portals;
    await doctor.page.goto(doctorHealthMeetingUrl(DOCTOR_ID, DOCTOR_URL, { stayOnQueue: true }), {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    await expect(doctor.page).toHaveURL(/\/health-meeting/);
    await expect(doctor.page.getByTestId('health-meeting-page')).toBeVisible({ timeout: 15_000 });
    await expect(
      doctor.page.getByTestId('queue-list').or(doctor.page.getByTestId('queue-count')).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('MEET-AUTO-03 — explicit ?autostart= navigates to meeting', async ({ portals }) => {
    const { doctor } = portals;
    const { appointmentId } = loadWorkflowState();
    const aptId = appointmentId || 'APT-DEMO-001';
    await doctor.page.goto(
      `${DOCTOR_URL}/doctor/${DOCTOR_ID}/health-meeting?autostart=${encodeURIComponent(aptId)}`,
      { waitUntil: 'domcontentloaded', timeout: 45_000 },
    );
    await expect(doctor.page).toHaveURL(new RegExp(`/meeting/${aptId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), {
      timeout: 30_000,
    });
  });
});
