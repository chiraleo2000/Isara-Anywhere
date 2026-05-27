/**
 * GROUP S — Responsive layout (mobile / tablet / desktop projects in playwright.config.ts)
 */
import {
  test, expect, assertFullHealth, snap, navPatient,
} from './helpers/multi-portal';
import { assertNoHorizontalScroll, assertMainContentVisible } from './helpers/layout-assertions';

test.describe('Group S — Responsive layout stability', () => {
  test('S01 — Patient dashboard layout', async ({ portals }) => {
    const { patient } = portals;
    await assertFullHealth(patient.page, 'S01-patient');
    await assertNoHorizontalScroll(patient.page);
    await assertMainContentVisible(patient.page);
    await snap(patient.page, 'S01-patient-dashboard', 'group-S');
  });

  test('S02 — Doctor dashboard layout', async ({ portals }) => {
    const { doctor } = portals;
    await assertFullHealth(doctor.page, 'S02-doctor');
    await assertNoHorizontalScroll(doctor.page);
    await assertMainContentVisible(doctor.page);
    await snap(doctor.page, 'S02-doctor-dashboard', 'group-S');
  });

  test('S03 — Patient deep routes (direct URL)', async ({ portals }) => {
    const { patient } = portals;
    for (const route of ['/phr', '/profile', '/settings', '/timeline']) {
      await navPatient(patient.page, route, `S03${route}`);
      await assertFullHealth(patient.page, `S03${route}`);
      await assertNoHorizontalScroll(patient.page);
    }
    await snap(patient.page, 'S03-patient-deep-routes', 'group-S');
  });
});
