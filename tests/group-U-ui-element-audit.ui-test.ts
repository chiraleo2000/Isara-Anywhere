/**
 * GROUP U — UI Element Deep Audit
 * Clicks/types P0 controls per page; captures screenshot after each action.
 */
import {
  test, expect, assertFullHealth, snap, navPatient, navDoctor,
  refreshPatientSession, waitForContent, PATIENT_URL, DOCTOR_URL,
} from './helpers/multi-portal';

const PHR_TABS = [
  'phr-tab-overview',
  'phr-tab-vitals',
  'phr-tab-medications',
  'phr-tab-allergies',
  'phr-tab-lab-imaging',
  'phr-tab-prescriptions',
  'phr-tab-documents',
  'phr-tab-profile',
] as const;

test.describe('Group U — UI Element Deep Audit', () => {
  test.describe.configure({ mode: 'serial' });

  test('U-A — Doctor login controls visible', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${DOCTOR_URL}/login`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('login-email')).toBeVisible();
    await expect(page.getByTestId('login-password')).toBeVisible();
    await expect(page.getByTestId('login-submit')).toBeVisible();
    await snap(page, 'U-A-doctor-login-controls', 'group-U');
    await ctx.close();
  });

  test('U-B — Patient PHR all tabs + upload control', async ({ portals }) => {
    const { patient } = portals;
    await refreshPatientSession(patient.page);
    await patient.page.goto(`${PATIENT_URL}/phr`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await waitForContent(patient.page, 'U-PHR', 8_000);
    await assertFullHealth(patient.page, 'U-PHR-root');
    await expect(patient.page.getByTestId('phr-page')).toBeVisible();

    for (const tabId of PHR_TABS) {
      await test.step(`PHR tab ${tabId}`, async () => {
        const tab = patient.page.getByTestId(tabId);
        await expect(tab).toBeVisible({ timeout: 10_000 });
        await tab.click();
        await patient.page.waitForTimeout(500);
        await snap(patient.page, `U-PHR-${tabId}`, 'group-U');
      });
    }

    const upload = patient.page.getByTestId('phr-document-upload');
    if (await upload.count()) {
      await expect(upload).toBeVisible();
      await snap(patient.page, 'U-PHR-document-upload', 'group-U');
    }
  });

  test('U-C — Doctor Health Meeting queue controls', async ({ portals }) => {
    const { doctor } = portals;
    await navDoctor(doctor.page, 'health-meeting', 'U-C');
    await assertFullHealth(doctor.page, 'U-C-health-meeting');
    await expect(doctor.page.getByTestId('health-meeting-page')).toBeVisible();
    await expect(doctor.page.getByTestId('queue-list')).toBeVisible();
    await snap(doctor.page, 'U-C-health-meeting-queue', 'group-U');

    const claimBtn = doctor.page.getByTestId('queue-claim-btn').first();
    if (await claimBtn.isVisible().catch(() => false)) {
      await snap(doctor.page, 'U-C-queue-claim-visible', 'group-U');
    }
  });

  test('U-C2 — Appointment pool redirects to health-meeting queue', async ({ portals }) => {
    const { doctor } = portals;
    const userId = await doctor.page.evaluate(() => {
      const m = window.location.pathname.match(/\/doctor\/([^/]+)/);
      return m?.[1] || '';
    });
    await doctor.page.goto(`${DOCTOR_URL}/doctor/${userId}/appointment-pool`, { waitUntil: 'domcontentloaded' });
    await doctor.page.waitForTimeout(1500);
    expect(doctor.page.url()).toMatch(/health-meeting/);
    await assertFullHealth(doctor.page, 'U-C2-pool-redirect');
    await snap(doctor.page, 'U-C2-pool-redirect-queue', 'group-U');
  });

  test('U-D — Patient settings theme/lang controls', async ({ portals }) => {
    const { patient } = portals;
    await navPatient(patient.page, '/settings', 'U-D');
    await assertFullHealth(patient.page, 'U-D-settings');
    const settingsBtn = patient.page.getByTestId('settings-button');
    if (await settingsBtn.isVisible().catch(() => false)) {
      await settingsBtn.click();
      await expect(patient.page.getByTestId('settings-dropdown')).toBeVisible();
      await snap(patient.page, 'U-D-settings-dropdown', 'group-U');
    }
  });

  test('U-E — PDPA grant access button', async ({ portals }) => {
    const { patient } = portals;
    await navPatient(patient.page, '/pdpa', 'U-E');
    await assertFullHealth(patient.page, 'U-E-pdpa');
    const grant = patient.page.getByTestId('pdpa-grant-doctor-access-btn');
    if (await grant.isVisible().catch(() => false)) {
      await snap(patient.page, 'U-E-pdpa-grant-btn', 'group-U');
    }
  });
});
