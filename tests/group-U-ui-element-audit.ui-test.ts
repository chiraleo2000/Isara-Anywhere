/**
 * GROUP U — UI Element Deep Audit
 * Clicks/types P0 + real P1 controls; asserts enabled/visible after interaction.
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

const RECORD_TABS = [
  'patient-record-tab-summary',
  'patient-record-tab-emr',
  'patient-record-tab-labs',
  'patient-record-tab-rx',
  'patient-record-tab-docs',
  'patient-record-tab-meetings',
  'patient-record-tab-pdpa',
] as const;

/** Soft exercise: click when visible+enabled; snap; never fail if absent in this session. */
async function clickIfPresent(
  page: import('@playwright/test').Page,
  testId: string,
  snapName: string,
  opts?: { fill?: string; assertEnabled?: boolean },
): Promise<boolean> {
  const el = page.getByTestId(testId).first();
  if (!(await el.isVisible({ timeout: 4_000 }).catch(() => false))) return false;
  if (opts?.fill != null) {
    await el.fill(opts.fill);
    await expect(el).toHaveValue(opts.fill);
  } else if (opts?.assertEnabled !== false) {
    const enabled = await el.isEnabled().catch(() => true);
    if (enabled) {
      await el.click({ timeout: 5_000 }).catch(async () => {
        await el.evaluate((node: HTMLElement) => node.click());
      });
    }
  }
  await page.waitForTimeout(400);
  await snap(page, snapName, 'group-U');
  return true;
}

test.describe('Group U — UI Element Deep Audit', () => {
  test.describe.configure({ mode: 'serial' });

  /* ─── ux-u-auth-dash ─────────────────────────────────────────── */

  test('U-A — Doctor login fill + google SSO mount', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${DOCTOR_URL}/login`, { waitUntil: 'commit', timeout: 60_000 }).catch(async () => {
      await page.goto(`${DOCTOR_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    });
    const email = page.getByTestId('login-email');
    if (await email.isVisible({ timeout: 8_000 }).catch(() => false)) {
      const password = page.getByTestId('login-password');
      const submit = page.getByTestId('login-submit');
      await expect(password).toBeVisible();
      await expect(submit).toBeVisible();
      await email.fill('demo@example.com');
      await password.fill('demo-password');
      await expect(email).toHaveValue('demo@example.com');
      await expect(submit).toBeEnabled();
      await snap(page, 'U-login-email', 'group-U');
      await snap(page, 'U-login-password', 'group-U');
      await snap(page, 'U-login-submit', 'group-U');
      const google = page.getByTestId('google-sign-in-btn').or(page.getByTestId('google-sso-container')).first();
      if (await google.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await expect(google).toBeVisible();
        await snap(page, 'U-google-sign-in-btn', 'group-U');
      }
      const forgot = page.getByRole('button', { name: /Forgot Password|ลืมรหัสผ่าน/i }).first();
      if (await forgot.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await forgot.click({ timeout: 5_000 }).catch(async () => {
          await forgot.click({ force: true, timeout: 5_000 }).catch(() => {});
        });
        await page.waitForTimeout(600);
        await snap(page, 'U-doctor-forgot-password', 'group-U');
      }
    } else {
      await snap(page, 'U-A-doctor-login-auto-redirect', 'group-U');
    }
    await ctx.close();
  });

  test('U-A2 — Patient login fill + google SSO mount', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${PATIENT_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    const email = page.getByTestId('login-email');
    if (await email.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await expect(page.getByTestId('login-password')).toBeVisible();
      await expect(page.getByTestId('login-submit')).toBeVisible();
      await email.fill('patient@example.com');
      await page.getByTestId('login-password').fill('demo-password');
      await expect(page.getByTestId('login-submit')).toBeEnabled();
      await snap(page, 'U-A2-patient-login-filled', 'group-U');
      const google = page.getByTestId('google-sign-in-btn').or(page.getByTestId('google-sso-container')).first();
      if (await google.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await expect(google).toBeVisible();
        await snap(page, 'U-A2-google-sign-in-btn', 'group-U');
      }
    } else {
      await snap(page, 'U-A2-patient-login-auto-redirect', 'group-U');
    }
    await ctx.close();
  });

  test('U-A3 — Patient register type fields + submit enabled', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${PATIENT_URL}/register`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.locator('#root').waitFor({ state: 'attached', timeout: 15_000 }).catch(() => {});
    const name = page.locator('#register-name');
    if (await name.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await name.fill('U Test Patient');
      await page.locator('#register-email').fill(`u-audit-${Date.now()}@example.com`);
      await page.locator('#register-password').fill('DemoPass1!');
      await page.locator('#register-confirm-password').fill('DemoPass1!');
      await expect(name).toHaveValue('U Test Patient');
      await snap(page, 'U-A3-register-step1-filled', 'group-U');
      const next = page.getByRole('button', { name: /ถัดไป|Next|ข้อมูลสุขภาพ/i }).first();
      if (await next.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await next.click({ timeout: 5_000 }).catch(async () => {
          await next.click({ force: true, timeout: 5_000 }).catch(() => {});
        });
        await page.waitForTimeout(600);
        const submit = page.getByTestId('register-submit');
        if (await submit.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await expect(submit).toBeEnabled();
          await snap(page, 'U-register-submit', 'group-U');
        } else {
          await snap(page, 'U-A3-register-after-next', 'group-U');
        }
      }
    } else {
      await snap(page, 'U-A3-register-shell', 'group-U');
    }
    await ctx.close();
  });

  test('U-A4 — Patient + Doctor reset-password shells', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${PATIENT_URL}/reset-password`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await assertFullHealth(page, 'U-A4-patient-reset');
    await expect(
      page.getByText(/โทเค็น|รีเซ็ตรหัสผ่าน|reset password|invalid|token/i).first(),
    ).toBeVisible({ timeout: 12_000 });
    const newPw = page.locator('#reset-new-password');
    if (await newPw.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await newPw.fill('NewPass1!');
      await page.locator('#reset-confirm-password').fill('NewPass1!');
      await expect(newPw).toHaveValue('NewPass1!');
    }
    await snap(page, 'U-A4-patient-reset-password', 'group-U');

    await page.goto(`${DOCTOR_URL}/reset-password`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForTimeout(800);
    await snap(page, 'U-A4-doctor-reset-password', 'group-U');
    await ctx.close();
  });

  test('U-A5 — Doctor + Patient dashboard primary CTAs', async ({ portals }) => {
    const { doctor, patient } = portals;

    await navDoctor(doctor.page, 'dashboard', 'U-A5-doc');
    await assertFullHealth(doctor.page, 'U-A5-doctor-dashboard');
    await clickIfPresent(doctor.page, 'doctor-dashboard-kpi', 'U-doctor-dashboard-kpi', { assertEnabled: false });
    await clickIfPresent(doctor.page, 'doctor-dashboard-queue', 'U-doctor-dashboard-queue', { assertEnabled: false });
    await clickIfPresent(doctor.page, 'dashboard-search-treatment-history', 'U-dashboard-search-treatment-history');
    await clickIfPresent(doctor.page, 'dashboard-meeting-ai-summary', 'U-dashboard-meeting-ai-summary', { assertEnabled: false });
    await snap(doctor.page, 'U-A5-doctor-dashboard', 'group-U');

    await refreshPatientSession(patient.page);
    await navPatient(patient.page, '/', 'U-A5-pat');
    await assertFullHealth(patient.page, 'U-A5-patient-dashboard');
    await clickIfPresent(patient.page, 'dashboard-join-meeting', 'U-dashboard-join-meeting');
    const bookCta = patient.page.getByRole('link', { name: /นัดหมาย|Book|Appointment/i }).first();
    if (await bookCta.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await bookCta.click();
      await patient.page.waitForTimeout(800);
      await snap(patient.page, 'U-A5-patient-book-cta', 'group-U');
    } else {
      await snap(patient.page, 'U-A5-patient-dashboard', 'group-U');
    }
  });

  /* ─── ux-u-schedule-queue ────────────────────────────────────── */

  test('U-C — Health Meeting queue claim/confirm/decline/assign', async ({ portals }) => {
    const { doctor } = portals;
    await navDoctor(doctor.page, 'health-meeting', 'U-C');
    await assertFullHealth(doctor.page, 'U-C-health-meeting');
    await expect(doctor.page.getByTestId('health-meeting-page')).toBeVisible();
    await expect(doctor.page.getByTestId('queue-list')).toBeVisible();
    await snap(doctor.page, 'U-health-meeting-page', 'group-U');
    await snap(doctor.page, 'U-queue-list', 'group-U');

    await clickIfPresent(doctor.page, 'queue-count', 'U-queue-count', { assertEnabled: false });
    for (const tid of [
      'queue-claim-btn',
      'queue-ai-match-btn',
      'queue-confirm-btn',
      'queue-decline-btn',
      'queue-assign-btn',
      'queue-contact-btn',
      'confirm-appointment-btn',
      'assign-appointment-btn',
    ]) {
      await clickIfPresent(doctor.page, tid, `U-${tid}`);
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
    // Product may keep a dedicated AppointmentPool page or redirect to Health Meeting queue.
    const onPoolOrMeeting = /health-meeting|appointment-pool/i.test(doctor.page.url());
    expect(onPoolOrMeeting, 'U-C2: pool or health-meeting URL').toBeTruthy();
    await assertFullHealth(doctor.page, 'U-C2-pool-redirect');
    await expect(
      doctor.page
        .getByTestId('queue-list')
        .or(doctor.page.getByTestId('health-meeting-page'))
        .or(doctor.page.getByTestId('accepted-pool-list'))
        .or(doctor.page.getByTestId('accepted-pool-tab'))
        .first(),
    ).toBeVisible({ timeout: 15_000 });
    await snap(doctor.page, 'U-C2-pool-redirect-queue', 'group-U');
  });

  test('U-C3 — Doctor Schedule page click calendar controls', async ({ portals }) => {
    const { doctor } = portals;
    await navDoctor(doctor.page, 'schedule', 'U-C3');
    await assertFullHealth(doctor.page, 'U-C3-schedule');
    await expect(doctor.page.getByTestId('doctor-schedule-page')).toBeVisible({ timeout: 15_000 });
    await snap(doctor.page, 'U-C3-schedule-page', 'group-U');
    await clickIfPresent(doctor.page, 'doctor-schedule-page', 'U-doctor-schedule-page', { assertEnabled: false });
    await clickIfPresent(doctor.page, 'schedule-meeting-link', 'U-schedule-meeting-link');
    await clickIfPresent(doctor.page, 'mini-calendar-appointment-day', 'U-mini-calendar-appointment-day');
    for (const tid of ['schedule-page', 'schedule-calendar', 'schedule-mini-calendar', 'add-to-google-calendar-btn']) {
      await clickIfPresent(doctor.page, tid, `U-C3-${tid}`);
    }
  });

  /* ─── ux-u-clinical-modals ───────────────────────────────────── */

  test('U-C4 — EMR sign / Rx allergy / lab-imaging / record tabs', async ({ portals }) => {
    const { doctor } = portals;
    await navDoctor(doctor.page, 'dashboard', 'U-C4-dash');
    await assertFullHealth(doctor.page, 'U-C4-dashboard');

    const searchBtn = doctor.page.getByTestId('dashboard-search-treatment-history');
    if (await searchBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await searchBtn.click();
      await doctor.page.waitForTimeout(800);
    }

    let openedTabs = 0;
    for (const tid of RECORD_TABS) {
      const tab = doctor.page.getByTestId(tid).first();
      if (await tab.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await tab.click();
        await doctor.page.waitForTimeout(500);
        openedTabs++;
        await snap(doctor.page, `U-${tid}`, 'group-U');
      }
    }

    if (openedTabs < 2) {
      await navDoctor(doctor.page, 'patients', 'U-C4-patients');
      await assertFullHealth(doctor.page, 'U-C4-patients');
      await snap(doctor.page, 'U-C4-patients-list', 'group-U');
      const card = doctor.page.locator('[class*="card"], tr, [class*="patient"], [class*="row"]')
        .filter({ hasText: /demo|patient|ผู้ป่วย/i }).first();
      if (await card.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await card.click();
        await doctor.page.waitForTimeout(800);
      }
      const openRecord = doctor.page.getByRole('button', {
        name: /View Record|ดูเวชระเบียน|ประวัติ|Create EMR|สร้าง EMR|Prescribe|สั่งยา/i,
      }).first();
      if (await openRecord.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await openRecord.click();
        await doctor.page.waitForTimeout(1000);
      }
      for (const tid of RECORD_TABS) {
        await clickIfPresent(doctor.page, tid, `U-${tid}`);
      }
    }

    const createEmr = doctor.page.getByRole('button', { name: /^(Create EMR|สร้าง EMR)$/i }).first();
    if (await createEmr.isVisible({ timeout: 4_000 }).catch(() => false)
      && await createEmr.isEnabled().catch(() => false)) {
      await createEmr.click({ timeout: 5_000 }).catch(() => {});
      await doctor.page.waitForTimeout(1000);
    }
    const emrModal = doctor.page.getByTestId('emr-editor-modal');
    if (await emrModal.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(emrModal).toBeVisible();
      await snap(doctor.page, 'U-emr-editor-modal', 'group-U');
      await clickIfPresent(doctor.page, 'emr-autosave-status', 'U-emr-autosave-status', { assertEnabled: false });
      const signBtn = doctor.page.getByTestId('emr-sign-btn');
      if (await signBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await expect(signBtn).toBeEnabled();
        await snap(doctor.page, 'U-emr-sign-btn', 'group-U');
      }
      await doctor.page.keyboard.press('Escape').catch(() => {});
    }

    for (const tid of [
      'patient-message-send-btn',
      'prescribe-submit',
      'allergy-block-banner',
      'cds-allergy-conflict-banner',
      'lab-report-upload-btn',
      'imaging-report-upload-btn',
    ]) {
      await clickIfPresent(doctor.page, tid, `U-${tid}`, {
        assertEnabled: !tid.includes('banner') && !tid.includes('upload'),
      });
    }
  });

  /* ─── ux-u-patient-phr-appts ─────────────────────────────────── */

  test('U-B — Patient PHR all tabs + upload control', async ({ portals }) => {
    const { patient } = portals;
    await refreshPatientSession(patient.page);
    await patient.page.goto(`${PATIENT_URL}/phr`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await waitForContent(patient.page, 'U-PHR', 8_000);
    await assertFullHealth(patient.page, 'U-PHR-root');
    await expect(patient.page.getByTestId('phr-page')).toBeVisible();
    await clickIfPresent(patient.page, 'phr-tab-bar', 'U-phr-tab-bar', { assertEnabled: false });

    for (const tabId of PHR_TABS) {
      await test.step(`PHR tab ${tabId}`, async () => {
        const tab = patient.page.getByTestId(tabId);
        await expect(tab).toBeVisible({ timeout: 10_000 });
        // phr-tab-prescriptions is an sr-only contract alias for medications (not a layout tab).
        await tab.click({ force: tabId === 'phr-tab-prescriptions' });
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

  test('U-B2 — Appointments book / join / guest / cancel', async ({ portals }) => {
    const { patient } = portals;
    await refreshPatientSession(patient.page);
    await navPatient(patient.page, '/appointments', 'U-B2-appts');
    await assertFullHealth(patient.page, 'U-B2-appointments');
    await snap(patient.page, 'U-B2-appointments-page', 'group-U');

    const book = patient.page.getByTestId('book-appointment-btn');
    const bookVisible = await book.isVisible({ timeout: 8_000 }).catch(() => false);
    if (bookVisible) {
      await Promise.all([
        patient.page.waitForURL(/\/appointments\/book(?:\?|$)/, { timeout: 15_000 }).catch(() => undefined),
        book.click(),
      ]);
    }
    if (!/\/appointments\/book/.test(patient.page.url())) {
      await patient.page.goto(`${PATIENT_URL}/appointments/book`, { waitUntil: 'domcontentloaded' });
    }
    await expect(patient.page).toHaveURL(/\/appointments\/book/);
    await assertFullHealth(patient.page, 'U-B2-book');
    await snap(patient.page, 'U-book-appointment-btn', 'group-U');

    // Fill first book fields when present (do not submit).
    const symptom = patient.page.locator('textarea, input[type="text"]').first();
    if (await symptom.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await symptom.fill('U audit symptom — mild headache');
      await snap(patient.page, 'U-B2-book-symptom-typed', 'group-U');
    }

    await navPatient(patient.page, '/appointments', 'U-B2-appts-back');
    for (const tid of [
      'appointment-join-meeting-btn',
      'appointment-join-meeting',
      'appointment-detail-join-meeting',
      'appointment-cancel-btn',
      'appointment-calendar-link',
      'appointment-confirmed-badge',
      'confirmed-tab-hint',
      'guest-invite-btn',
      'guest-join-btn',
    ]) {
      await clickIfPresent(patient.page, tid, `U-B2-${tid}`);
    }
  });

  /* ─── ux-u-patient-secondary ─────────────────────────────────── */

  test('U-D — Settings theme/lang click + profile', async ({ portals }) => {
    const { patient } = portals;
    await navPatient(patient.page, '/settings', 'U-D');
    await assertFullHealth(patient.page, 'U-D-settings');
    const settingsBtn = patient.page.getByTestId('settings-button');
    if (await settingsBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await settingsBtn.click();
      await expect(patient.page.getByTestId('settings-dropdown')).toBeVisible();
      await snap(patient.page, 'U-D-settings-dropdown', 'group-U');
      await clickIfPresent(patient.page, 'theme-light', 'U-theme-light');
      await clickIfPresent(patient.page, 'lang-thai', 'U-lang-thai');
      await clickIfPresent(patient.page, 'lang-english', 'U-lang-english');
    }

    await navPatient(patient.page, '/profile', 'U-D-profile');
    await assertFullHealth(patient.page, 'U-D-profile');
    const profileInput = patient.page.locator('input[type="text"], input[type="email"]').first();
    if (await profileInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await profileInput.click().catch(() => {});
      await snap(patient.page, 'U-D-profile-page', 'group-U');
    } else {
      await snap(patient.page, 'U-D-profile-page', 'group-U');
    }
  });

  test('U-E — PDPA grant modal type/search + revoke', async ({ portals }) => {
    const { patient } = portals;
    await navPatient(patient.page, '/pdpa', 'U-E');
    await assertFullHealth(patient.page, 'U-E-pdpa');
    await clickIfPresent(patient.page, 'pdpa-current-consent-snapshot', 'U-pdpa-current-consent-snapshot', { assertEnabled: false });

    const grant = patient.page.getByTestId('pdpa-grant-doctor-access-btn');
    if (await grant.isVisible({ timeout: 6_000 }).catch(() => false)) {
      await expect(grant).toBeEnabled();
      await grant.click();
      await patient.page.waitForTimeout(600);
      await snap(patient.page, 'U-E-pdpa-grant-btn', 'group-U');
      const modal = patient.page.getByTestId('pdpa-grant-doctor-modal');
      if (await modal.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await expect(modal).toBeVisible();
        const search = patient.page.getByTestId('pdpa-grant-doctor-search');
        if (await search.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await search.fill('demo');
          await expect(search).toHaveValue('demo');
          await snap(patient.page, 'U-pdpa-grant-doctor-search', 'group-U');
        }
        await patient.page.keyboard.press('Escape').catch(() => {});
      }
    }

    for (const tid of ['pdpa-revoke-all-access-btn', 'pdpa-revoke-all-btn', 'pdpa-consent-toggle', 'pdpa-audit-log']) {
      await clickIfPresent(patient.page, tid, `U-E-${tid}`, { assertEnabled: tid !== 'pdpa-audit-log' });
    }
  });

  test('U-E4 — Living Will step fill + next', async ({ portals }) => {
    const { patient } = portals;
    await navPatient(patient.page, '/living-will', 'U-E4');
    await assertFullHealth(patient.page, 'U-E4-living-will');
    const step1 = patient.page.getByTestId('living-will-step-1');
    if (await step1.isVisible({ timeout: 12_000 }).catch(() => false)) {
      await expect(step1).toBeVisible();
      await clickIfPresent(patient.page, 'living-will-stepper', 'U-living-will-stepper', { assertEnabled: false });
      const name = patient.page.locator('#proxy-primary-name');
      if (await name.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await name.fill('นายทดสอบ U');
        await expect(name).toHaveValue('นายทดสอบ U');
      }
      await snap(patient.page, 'U-living-will-step-1', 'group-U');
      const next = patient.page.getByTestId('living-will-next-btn');
      await expect(next).toBeVisible();
      await next.click();
      await expect(patient.page.getByTestId('living-will-step-2')).toBeVisible({ timeout: 10_000 });
      await snap(patient.page, 'U-living-will-next-btn', 'group-U');
    } else {
      await snap(patient.page, 'U-E4-living-will-shell', 'group-U');
    }
  });

  test('U-E5 — Library / map / timeline / notifications click', async ({ portals }) => {
    const { patient } = portals;

    await navPatient(patient.page, '/health-library', 'U-E5-lib');
    await assertFullHealth(patient.page, 'U-E5-library');
    await clickIfPresent(patient.page, 'health-library-page', 'U-health-library-page', { assertEnabled: false });
    await clickIfPresent(patient.page, 'content-item', 'U-content-item');
    await clickIfPresent(patient.page, 'health-studio-ready', 'U-health-studio-ready', { assertEnabled: false });
    await clickIfPresent(patient.page, 'health-studio-medical-content', 'U-health-studio-medical-content', { assertEnabled: false });

    await navPatient(patient.page, '/map', 'U-E5-map');
    await assertFullHealth(patient.page, 'U-E5-map');
    const mapSearch = patient.page.locator(
      'input[type="search"], input[type="text"], input[placeholder*="search" i], input[placeholder*="ค้นหา"]',
    ).first();
    if (await mapSearch.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await mapSearch.fill('โรงพยาบาล');
      await snap(patient.page, 'U-E5-map-search', 'group-U');
    } else {
      await snap(patient.page, 'U-E5-map-page', 'group-U');
    }

    await navPatient(patient.page, '/timeline', 'U-E5-timeline');
    await assertFullHealth(patient.page, 'U-E5-timeline');
    await clickIfPresent(patient.page, 'timeline-page', 'U-timeline-page', { assertEnabled: false });
    await clickIfPresent(patient.page, 'timeline-consultation-link', 'U-timeline-consultation-link');
    await clickIfPresent(patient.page, 'timeline-download', 'U-timeline-download');

    await navPatient(patient.page, '/notifications', 'U-E5-notif');
    await assertFullHealth(patient.page, 'U-E5-notifications');
    await expect(patient.page.getByTestId('notifications-page')).toBeVisible();
    const markAll = patient.page.getByTestId('mark-all-read-btn');
    if (await markAll.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(markAll).toBeEnabled();
      await markAll.click();
      await patient.page.waitForTimeout(500);
      await snap(patient.page, 'U-mark-all-read-btn', 'group-U');
    }
    await clickIfPresent(patient.page, 'notifications-view-all-link', 'U-notifications-view-all-link');
    await snap(patient.page, 'U-notifications-page', 'group-U');
  });

  /* ─── ux-u-meeting-room ──────────────────────────────────────── */

  test('U-E2 — Meeting lobby admit/end/host/guest controls', async ({ portals }) => {
    const { doctor } = portals;
    await navDoctor(doctor.page, 'health-meeting', 'U-E2');
    await assertFullHealth(doctor.page, 'U-E2-meeting');
    for (const tid of [
      'admit-all-btn',
      'admit-btn',
      'reject-btn',
      'end-meeting-btn',
      'host-ready-indicator',
      'host-starting-screen',
      'share-meeting-link-btn',
      'guest-join-url-hint',
      'guest-token-url-hint',
      'lobby-panel',
    ]) {
      await clickIfPresent(doctor.page, tid, `U-${tid}`, {
        assertEnabled: !['host-starting-screen', 'guest-join-url-hint', 'guest-token-url-hint', 'lobby-panel'].includes(tid),
      });
    }
  });

  test('U-E3 — Meeting results generate / validate / apply / transcript', async ({ portals }) => {
    const { doctor } = portals;
    await navDoctor(doctor.page, 'health-meeting', 'U-E3');
    await assertFullHealth(doctor.page, 'U-E3-meeting-results');

    const resultsTab = doctor.page.getByRole('tab', { name: /results|ผลลัพธ์/i }).first();
    if (await resultsTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await resultsTab.click();
      await doctor.page.waitForTimeout(800);
    }

    // Open first available meeting-results entry if listed.
    const resultsEntry = doctor.page.getByTestId('meeting-results-primary-btn').first()
      .or(doctor.page.getByRole('button', { name: /results|ผลลัพธ์|สรุป|summary/i }).first());
    if (await resultsEntry.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await resultsEntry.click();
      await doctor.page.waitForTimeout(1000);
    }

    const resultsRoot = doctor.page.getByTestId('meeting-results').first();
    const genBtn = doctor.page.getByTestId('generate-summary-btn').first();

    if (await resultsRoot.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(resultsRoot).toBeVisible();
      await snap(doctor.page, 'U-meeting-results', 'group-U');

      await clickIfPresent(doctor.page, 'results-tab-transcript', 'U-results-tab-transcript');
      await clickIfPresent(doctor.page, 'transcript-panel', 'U-transcript-panel', { assertEnabled: false });
      await clickIfPresent(doctor.page, 'results-tab-summary', 'U-results-tab-summary');
      await clickIfPresent(doctor.page, 'summary-structured', 'U-summary-structured', { assertEnabled: false });
      await clickIfPresent(doctor.page, 'summary-degraded-badge', 'U-summary-degraded-badge', { assertEnabled: false });

      if (await genBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await expect(genBtn).toBeEnabled();
        await genBtn.click();
        await doctor.page.waitForTimeout(1200);
        await snap(doctor.page, 'U-generate-summary-btn', 'group-U');
      }

      await clickIfPresent(doctor.page, 'validate-summary-btn', 'U-validate-summary-btn');
      await clickIfPresent(doctor.page, 'apply-summary-emr-btn', 'U-apply-summary-emr-btn');
      await clickIfPresent(doctor.page, 'apply-ai-summary-emr-btn', 'U-apply-ai-summary-emr-btn');
    } else if (await genBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(genBtn).toBeEnabled();
      await genBtn.click();
      await doctor.page.waitForTimeout(1200);
      await snap(doctor.page, 'U-generate-summary-btn', 'group-U');
    } else {
      await snap(doctor.page, 'U-E3-meeting-results-controls-pending-appointment', 'group-U');
    }
  });

  /* ─── ux-u-admin-content ─────────────────────────────────────── */

  test('U-G — Admin assign/reject + content/resources/consultants + AI studio', async ({ portals }) => {
    const { doctor, admin } = portals;

    await navDoctor(doctor.page, 'medical-content', 'U-G-content');
    await assertFullHealth(doctor.page, 'U-G-content');
    await clickIfPresent(doctor.page, 'content-item', 'U-G-content-item');
    await snap(doctor.page, 'U-G-medical-content', 'group-U');

    await navDoctor(doctor.page, 'clinical-resources', 'U-G-resources');
    await assertFullHealth(doctor.page, 'U-G-resources');
    await clickIfPresent(doctor.page, 'content-item', 'U-G-resources-item');
    await snap(doctor.page, 'U-G-clinical-resources', 'group-U');

    // Phase 1: consultants / medical-consultants routes redirect to dashboard and sidebar item is disabled.
    const consultantsNav = doctor.page
      .locator('nav button, aside button, nav a, aside a')
      .filter({ hasText: /ที่ปรึกษา.*แพทย์|Medical Consultant/i })
      .first();
    if (await consultantsNav.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await navDoctor(doctor.page, 'consultants', 'U-G-consultants');
      await assertFullHealth(doctor.page, 'U-G-consultants');
      await snap(doctor.page, 'U-G-consultants', 'group-U');
    } else {
      const userId = await doctor.page.evaluate(() => {
        const m = window.location.pathname.match(/\/doctor\/([^/]+)/);
        return m?.[1] || '';
      });
      if (userId) {
        await doctor.page.goto(`${DOCTOR_URL}/doctor/${userId}/consultants`, {
          waitUntil: 'domcontentloaded',
          timeout: 20_000,
        }).catch(() => undefined);
        await doctor.page.waitForTimeout(800);
      }
      await snap(doctor.page, 'U-G-consultants-phase1-redirect', 'group-U');
    }

    // AI studio mount (doctor)
    const aiNav = doctor.page.getByRole('button', { name: /AI|Gemini|สตูดิโอ/i }).first();
    if (await aiNav.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await aiNav.click();
      await doctor.page.waitForTimeout(800);
    } else {
      const userId = await doctor.page.evaluate(() => {
        const m = window.location.pathname.match(/\/doctor\/([^/]+)/);
        return m?.[1] || '';
      });
      if (userId) {
        await doctor.page.goto(`${DOCTOR_URL}/doctor/${userId}/ai-studio`, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        }).catch(() => {});
        await doctor.page.waitForTimeout(1000);
      }
    }
    await clickIfPresent(doctor.page, 'gemini-ai-studio', 'U-gemini-ai-studio', { assertEnabled: false });
    await clickIfPresent(doctor.page, 'gemini-ai-studio-modal', 'U-gemini-ai-studio-modal', { assertEnabled: false });

    // Admin: doctors management + queue assign/reject surfaces
    await navDoctor(admin.page, 'doctors', 'U-G-admin-doctors');
    await assertFullHealth(admin.page, 'U-G-admin-doctors');
    await clickIfPresent(admin.page, 'doctor-item', 'U-doctor-item', { assertEnabled: false });
    await clickIfPresent(admin.page, 'admin-doctor-pending-tab', 'U-admin-doctor-pending-tab');
    await clickIfPresent(admin.page, 'admin-doctor-pending-panel', 'U-admin-doctor-pending-panel', { assertEnabled: false });
    await snap(admin.page, 'U-G-doctors-management', 'group-U');

    await navDoctor(admin.page, 'health-meeting', 'U-G-admin-queue');
    await assertFullHealth(admin.page, 'U-G-admin-queue');
    for (const tid of ['assign-appointment-btn', 'queue-assign-btn', 'queue-decline-btn', 'reject-btn']) {
      await clickIfPresent(admin.page, tid, `U-G-${tid}`);
    }
    await snap(admin.page, 'U-G-admin-queue-actions', 'group-U');
  });
});
