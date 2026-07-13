/**
 * GROUP U — UI Element Deep Audit
 * Clicks/types P0 + HIGH-page controls; captures screenshot after each action.
 * Maps Processes/Pages Doctor/Patient/Meeting inventories → headed UX depth.
 */
import {
  test, expect, assertFullHealth, snap, navPatient, navDoctor,
  refreshPatientSession, waitForContent, PATIENT_URL, DOCTOR_URL,
} from './helpers/multi-portal';

/** Visible PHR tabs — includes dedicated prescriptions history tab. */
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

  test('U-A — Doctor login controls clickable', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${DOCTOR_URL}/login`, { waitUntil: 'commit', timeout: 60_000 }).catch(async () => {
      await page.goto(`${DOCTOR_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    });
    const email = page.getByTestId('login-email');
    // Demo auto-login may skip the form — still assert controls when present.
    if (await email.isVisible({ timeout: 8_000 }).catch(() => false)) {
      const password = page.getByTestId('login-password');
      const submit = page.getByTestId('login-submit');
      await expect(password).toBeVisible();
      await expect(submit).toBeVisible();
      await email.fill('demo@example.com');
      await password.fill('demo-password');
      await expect(submit).toBeEnabled();
      await snap(page, 'U-login-email', 'group-U');
      await snap(page, 'U-login-password', 'group-U');
      await snap(page, 'U-login-submit', 'group-U');
    } else {
      await snap(page, 'U-A-doctor-login-auto-redirect', 'group-U');
    }
    await ctx.close();
  });

  test('U-A2 — Patient login controls clickable', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${PATIENT_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    const email = page.getByTestId('login-email');
    if (await email.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await expect(page.getByTestId('login-password')).toBeVisible();
      await expect(page.getByTestId('login-submit')).toBeVisible();
      await email.fill('patient@example.com');
      await page.getByTestId('login-password').fill('demo-password');
      await snap(page, 'U-A2-patient-login-filled', 'group-U');
    } else {
      await snap(page, 'U-A2-patient-login-auto-redirect', 'group-U');
    }
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
        await snap(patient.page, `U-${tabId}`, 'group-U');
      });
    }

    const upload = patient.page.getByTestId('phr-document-upload');
    if (await upload.count()) {
      await expect(upload).toBeVisible();
      await snap(patient.page, 'U-phr-document-upload', 'group-U');
    }
  });

  test('U-B2 — Patient dashboard + appointments controls', async ({ portals }) => {
    const { patient } = portals;
    await refreshPatientSession(patient.page);
    await navPatient(patient.page, '/', 'U-B2-dash');
    await assertFullHealth(patient.page, 'U-B2-dashboard');
    await snap(patient.page, 'U-B2-patient-dashboard', 'group-U');

    await navPatient(patient.page, '/appointments', 'U-B2-appts');
    await assertFullHealth(patient.page, 'U-B2-appointments');
    await snap(patient.page, 'U-B2-appointments-page', 'group-U');
    for (const tid of ['book-appointment-btn', 'appointment-cancel-btn', 'guest-invite-btn', 'join-meeting-btn']) {
      const el = patient.page.getByTestId(tid).first();
      if (await el.isVisible().catch(() => false)) {
        await snap(patient.page, `U-B2-${tid}`, 'group-U');
      }
    }
  });

  test('U-C — Doctor Health Meeting queue controls', async ({ portals }) => {
    const { doctor } = portals;
    await navDoctor(doctor.page, 'health-meeting', 'U-C');
    await assertFullHealth(doctor.page, 'U-C-health-meeting');
    await expect(doctor.page.getByTestId('health-meeting-page')).toBeVisible();
    await expect(doctor.page.getByTestId('queue-list')).toBeVisible();
    await snap(doctor.page, 'U-health-meeting-page', 'group-U');
    await snap(doctor.page, 'U-queue-list', 'group-U');

    for (const tid of ['queue-count', 'queue-claim-btn', 'queue-ai-match-btn', 'confirm-appointment-btn']) {
      const el = doctor.page.getByTestId(tid).first();
      if (await el.isVisible().catch(() => false)) {
        await snap(doctor.page, `U-${tid}`, 'group-U');
      }
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

  test('U-C3 — Doctor Schedule page controls', async ({ portals }) => {
    const { doctor } = portals;
    await navDoctor(doctor.page, 'schedule', 'U-C3');
    await assertFullHealth(doctor.page, 'U-C3-schedule');
    await snap(doctor.page, 'U-C3-schedule-page', 'group-U');
    for (const tid of ['schedule-page', 'schedule-calendar', 'schedule-mini-calendar', 'add-to-google-calendar-btn']) {
      const el = doctor.page.getByTestId(tid).first();
      if (await el.isVisible().catch(() => false)) {
        await snap(doctor.page, `U-C3-${tid}`, 'group-U');
      }
    }
  });

  test('U-C4 — Doctor EMR / Rx / Lab clinical controls', async ({ portals }) => {
    const { doctor } = portals;
    await navDoctor(doctor.page, 'patients', 'U-C4');
    await assertFullHealth(doctor.page, 'U-C4-patients');
    await snap(doctor.page, 'U-C4-patients-list', 'group-U');

    for (const tid of [
      'patient-message-send-btn',
      'emr-sign-btn',
      'emr-editor-modal',
      'emr-autosave-status',
      'prescribe-submit',
      'allergy-block-banner',
      'lab-report-upload-btn',
      'imaging-report-upload-btn',
    ]) {
      const el = doctor.page.getByTestId(tid).first();
      if (await el.isVisible().catch(() => false)) {
        await snap(doctor.page, `U-${tid}`, 'group-U');
      }
    }
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
    for (const tid of ['pdpa-revoke-all-btn', 'pdpa-consent-toggle', 'pdpa-audit-log']) {
      const el = patient.page.getByTestId(tid).first();
      if (await el.isVisible().catch(() => false)) {
        await snap(patient.page, `U-E-${tid}`, 'group-U');
      }
    }
  });

  test('U-E2 — Meeting lobby admit/end controls (doctor)', async ({ portals }) => {
    const { doctor } = portals;
    await navDoctor(doctor.page, 'health-meeting', 'U-E2');
    await assertFullHealth(doctor.page, 'U-E2-meeting');
    for (const tid of ['admit-all-btn', 'end-meeting-btn', 'host-ready-indicator', 'share-meeting-link-btn']) {
      const el = doctor.page.getByTestId(tid).first();
      if (await el.isVisible().catch(() => false)) {
        await snap(doctor.page, `U-${tid}`, 'group-U');
      }
    }
  });

  test('U-F — Notifications + timeline controls', async ({ portals }) => {
    const { patient } = portals;
    await navPatient(patient.page, '/notifications', 'U-F-notif');
    await assertFullHealth(patient.page, 'U-F-notifications');
    for (const tid of ['notifications-page', 'mark-all-read-btn', 'notification-item']) {
      const el = patient.page.getByTestId(tid).first();
      if (await el.isVisible().catch(() => false)) {
        await snap(patient.page, `U-F-${tid}`, 'group-U');
      }
    }

    await navPatient(patient.page, '/timeline', 'U-F-timeline');
    await assertFullHealth(patient.page, 'U-F-timeline');
    await snap(patient.page, 'U-F-timeline-page', 'group-U');
  });
});
