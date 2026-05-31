import { test, expect, navPatient, assertFullHealth, snap } from './helpers/multi-portal';

function facilitiesFromNearbyBody(body: Record<string, unknown>): unknown[] {
  if (Array.isArray(body?.facilities)) return body.facilities;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body)) return body;
  return [];
}

test.describe('Defect — Map and health library parity', () => {
  test.describe.configure({ mode: 'serial' });

  test('DJ1 — map nearby API includes lang parameter (P8–P10)', async ({ portals }) => {
    const { patient } = portals;

    const nearbyPromise = patient.page.waitForResponse(
      (r) => r.url().includes('/api/map/nearby') && r.request().method() === 'GET',
      { timeout: 30_000 },
    );

    await navPatient(patient.page, '/map', 'DJ1');
    await assertFullHealth(patient.page, 'DJ1');

    const nearbyResp = await nearbyPromise;
    expect(nearbyResp.url()).toMatch(/lang=/);

    const body = await nearbyResp.json().catch(() => ({}));
    const facilities = facilitiesFromNearbyBody(body as Record<string, unknown>);

    const listCards = patient.page.locator('[class*="result"], [class*="card"], [class*="facility"], li').filter({
      hasText: /hospital|โรงพยาบาล|clinic|คลินิก|pharmacy|ร้านยา|health/i,
    });
    const uiCount = await listCards.count();
    if (facilities.length > 0) {
      expect(uiCount).toBeGreaterThan(0);
    }

    await snap(patient.page, 'DJ1-map-nearby-parity', 'group-defect');
  });

  test('DJ2 — health library shows thumbnail or fallback image (P7)', async ({ portals }) => {
    const { patient } = portals;

    await navPatient(patient.page, '/health-library', 'DJ2');
    await assertFullHealth(patient.page, 'DJ2');

    const thumbnails = patient.page.locator('img[src]');
    await expect(thumbnails.first()).toBeVisible({ timeout: 15_000 });
    expect(await thumbnails.count()).toBeGreaterThan(0);

    await snap(patient.page, 'DJ2-health-library-thumbnail', 'group-defect');
  });
});
