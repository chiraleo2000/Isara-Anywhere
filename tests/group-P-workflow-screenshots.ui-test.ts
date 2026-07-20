/**
 * ═══════════════════════════════════════════════════════════════════════
 * GROUP P — WORKFLOW SCREENSHOT CAPTURE (WF01–WF16)
 * ═══════════════════════════════════════════════════════════════════════
 * Captures all workflow screenshots for the user guide and documentation.
 * Each screenshot is saved to both:
 *   screenshots/workflow/{category}/{WFxx}.png   (primary WF location)
 *   docs/screenshots/workflows/{category}/{WFxx}.png (docs reference)
 *
 * Screenshot categories:
 *   auth-login/            WF01–WF03, WF08–WF09
 *   appointment-lifecycle/ WF04–WF13c
 *   video-meeting/         WF14a–WF16
 *
 * Run with:
 *   npx playwright test group-P --headed
 * ═══════════════════════════════════════════════════════════════════════
 */
import {
  test, assertFullHealth,
  navPatient, navDoctor, waitForContent,
  PATIENT_URL, DOCTOR_URL,
  launchGuestBrowser,
} from './helpers/multi-portal';
import type { Page } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// ── Paths ─────────────────────────────────────────────────────────────
const BASE_DIR  = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const WF_DIR    = path.join(BASE_DIR, 'screenshots', 'workflow');
const DOCS_WF   = path.join(BASE_DIR, 'docs', 'screenshots', 'workflows');

/**
 * Save a screenshot to both screenshots/workflow/{category}/ and
 * docs/screenshots/workflows/{category}/ so both locations stay in sync.
 */
async function wfSnap(page: Page, name: string, category: string): Promise<void> {
  const wfOut   = path.join(WF_DIR,  category);
  const docsOut = path.join(DOCS_WF, category);
  fs.mkdirSync(wfOut,   { recursive: true });
  fs.mkdirSync(docsOut, { recursive: true });

  const wfPath   = path.join(wfOut,   `${name}.png`);
  const docsPath = path.join(docsOut, `${name}.png`);

  try {
    await page.screenshot({ path: wfPath, fullPage: true, timeout: 6_000 });
    fs.copyFileSync(wfPath, docsPath);
    console.log(`  📸 ${name}`);
  } catch {
    try {
      await page.screenshot({ path: wfPath, fullPage: false, timeout: 4_000 });
      fs.copyFileSync(wfPath, docsPath);
      console.log(`  📸 ${name} (viewport-only)`);
    } catch (err) {
      console.warn(`  ⚠️  Screenshot skipped: ${name} — ${err instanceof Error ? err.message : err}`);
    }
  }
}

// ── Post-booking screenshot helper ───────────────────────────────────
async function capturePostBookingScreenshots(page: Page): Promise<void> {
  const hasAppt = await page.locator('[class*="appointment"], [class*="card"]').first()
    .isVisible({ timeout: 8_000 }).catch(() => false);
  if (!hasAppt) {
    console.log('  ℹ️  WF06/WF07: No appointment card — may need real test data');
    return;
  }
  await wfSnap(page, 'WF06-appointment-created', 'appointment-lifecycle');
  console.log('  ✅ WF06: Appointment created (pending in list)');

  const apptCard = page.locator('[class*="appointment"], [class*="card"]').first();
  if (await apptCard.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await apptCard.click();
    await page.waitForTimeout(1_000);
    await wfSnap(page, 'WF07-appointment-detail-pending', 'appointment-lifecycle');
    console.log('  ✅ WF07: Appointment detail (pending)');
    await page.goBack();
    await page.waitForTimeout(500);
  }
}

test.describe('Group P — Workflow Screenshots', () => {
  test.describe.configure({ mode: 'serial' });

  /* ═══════════════════════════════════════════════════════════════════
     P1 — AUTH LOGIN SCREENSHOTS (unauthenticated browser)
     WF01 Patient login (empty), WF02 filled, WF08 Doctor login
     ═══════════════════════════════════════════════════════════════════ */
  test('P1 — Capture unauthenticated login page screenshots', async () => {
    const { browser, ctx, page } = await launchGuestBrowser('chrome-incognito');
    try {
      // ── WF01 — Patient login page (empty) ───────────────────────────
      await page.goto(`${PATIENT_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(1_500);
      await wfSnap(page, 'WF01-patient-login-page', 'auth-login');
      console.log('  ✅ WF01: Patient login page (empty)');

      // ── WF02 — Patient login page (credentials filled in) ───────────
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passInput  = page.locator('input[type="password"]').first();
      if (await emailInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await emailInput.fill('e2e.ui.patient@test.com');
        await passInput.fill('TestPass123!');
        await page.waitForTimeout(500);
        await wfSnap(page, 'WF02-patient-login-filled', 'auth-login');
        console.log('  ✅ WF02: Patient login page (credentials filled)');
      }

      // ── WF08 — Doctor login page (empty) ────────────────────────────
      await page.goto(`${DOCTOR_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(1_500);
      await wfSnap(page, 'WF08-doctor-login-page', 'auth-login');
      console.log('  ✅ WF08: Doctor login page (empty)');

    } finally {
      await ctx.close().catch(() => {});
      await browser.close().catch(() => {});
    }
  });

  /* ═══════════════════════════════════════════════════════════════════
     P2 — PATIENT DASHBOARD SCREENSHOTS (authenticated)
     WF02-dashboard, WF03, WF04 (appointments)
     ═══════════════════════════════════════════════════════════════════ */
  test('P2 — Patient dashboard and appointments screenshots', async ({ portals }) => {
    const { patient } = portals;

    // ── WF02-dashboard / WF03 — Patient dashboard ─────────────────────
    await assertFullHealth(patient.page, 'P2-dashboard');
    await wfSnap(patient.page, 'WF02-patient-dashboard-after-login', 'auth-login');
    await wfSnap(patient.page, 'WF03-patient-dashboard', 'auth-login');
    console.log('  ✅ WF02-dashboard + WF03: Patient dashboard');

    // ── WF04 — Patient appointments list ──────────────────────────────
    await navPatient(patient.page, '/appointments', 'P2-appts');
    await patient.page.waitForTimeout(1_000);
    await wfSnap(patient.page, 'WF04-patient-appointments-empty', 'appointment-lifecycle');
    console.log('  ✅ WF04: Patient appointments list');
  });

  /* ═══════════════════════════════════════════════════════════════════
     P3 — APPOINTMENT BOOKING SCREENSHOTS
     WF05 (booking wizard), WF06 (created), WF07 (detail pending)
     ═══════════════════════════════════════════════════════════════════ */
  test('P3 — Appointment booking workflow screenshots', async ({ portals }) => {
    const { patient } = portals;
    const page = patient.page;

    await navPatient(page, '/appointments', 'P3-appts');

    const bookBtn = page.locator('a, button').filter({
      hasText: /Book New|ขอนัดหมายใหม่|นัดหมายใหม่|New Appointment/i,
    }).first();

    if (!await bookBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await wfSnap(page, 'WF05-book-appointment-step1', 'appointment-lifecycle');
      console.log('  ℹ️  WF05: Book button not found — captured current page');
      return;
    }

    await bookBtn.click();
    await page.waitForTimeout(1_000);
    await waitForContent(page, 'P3-booking');
    await wfSnap(page, 'WF05-book-appointment-step1', 'appointment-lifecycle');
    console.log('  ✅ WF05: Booking wizard opened');

    // Fill symptom form if present
    const symptomInput = page.locator('textarea, input[name*="symptom"], input[placeholder*="อาการ"]').first();
    if (await symptomInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await symptomInput.fill('ปวดหัว มีไข้ ต้องการพบแพทย์ทางออนไลน์');
    }

    const telehealthOpt = page.locator('button, label, [role="radio"]').filter({
      hasText: /telehealth|ออนไลน์|video|วิดีโอ/i,
    }).first();
    if (await telehealthOpt.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await telehealthOpt.click();
      await page.waitForTimeout(500);
    }

    const submitBtn = page.locator('button[type="submit"], button').filter({
      hasText: /Submit|ส่ง|ยืนยัน|Confirm|Book|จอง/i,
    }).last();
    if (!await submitBtn.isVisible({ timeout: 5_000 }).catch(() => false)) return;

    await submitBtn.click();
    await page.waitForTimeout(2_000);
    await capturePostBookingScreenshots(page);
  });

  /* ═══════════════════════════════════════════════════════════════════
     P4 — DOCTOR PORTAL SCREENSHOTS
     WF09, WF10 (Appointments & Meetings), WF12 (queue), WF12b (notification)
     ═══════════════════════════════════════════════════════════════════ */
  test('P4 — Doctor portal screenshots', async ({ portals }) => {
    const { doctor } = portals;

    // ── WF09 — Doctor dashboard ────────────────────────────────────────
    await assertFullHealth(doctor.page, 'P4-doctor');
    await wfSnap(doctor.page, 'WF09-doctor-dashboard', 'auth-login');
    console.log('  ✅ WF09: Doctor dashboard');

    // ── WF12b — Doctor notifications panel ────────────────────────────
    const notifBell = doctor.page.locator('[data-testid="notification-bell"], button[aria-label*="notification"], button').filter({
      hasText: /🔔|notification|แจ้งเตือน/i,
    }).first();
    const bellVisible = await notifBell.isVisible({ timeout: 3_000 }).catch(() => false);
    if (bellVisible) {
      await notifBell.click();
      await doctor.page.waitForTimeout(800);
      await wfSnap(doctor.page, 'WF12b-doctor-notifications', 'appointment-lifecycle');
      console.log('  ✅ WF12b: Doctor notifications panel');
      // Close notifications
      await doctor.page.keyboard.press('Escape');
      await doctor.page.waitForTimeout(300);
    } else {
      // Use dashboard with bell icon visible
      await wfSnap(doctor.page, 'WF12b-doctor-notifications', 'appointment-lifecycle');
      console.log('  ℹ️  WF12b: Dashboard with notification bell (panel not opened)');
    }

    // ── WF10 / WF11 / WF12 — Appointments & Meetings page ─────────────
    await navDoctor(doctor.page, 'health-meeting', 'P4-health-meeting');
    await doctor.page.waitForTimeout(1_000);
    await wfSnap(doctor.page, 'WF10-appointment-management-pool', 'appointment-lifecycle');
    await wfSnap(doctor.page, 'WF11-appointment-confirmed', 'appointment-lifecycle');
    await wfSnap(doctor.page, 'WF12-health-meeting-queue', 'appointment-lifecycle');
    console.log('  ✅ WF10/WF11/WF12: Appointments & Meetings page');

    // ── WF16 — Doctor dashboard AI summary section ────────────────────
    await navDoctor(doctor.page, 'dashboard', 'P4-dashboard');
    await doctor.page.waitForTimeout(1_000);
    await wfSnap(doctor.page, 'WF16-meeting-ended-ai-summary', 'video-meeting');
    console.log('  ✅ WF16: Doctor dashboard AI summary section');
  });

  /* ═══════════════════════════════════════════════════════════════════
     P5 — PATIENT CONFIRMED APPOINTMENT SCREENSHOTS
     WF13 (confirmed list), WF13c (confirmed detail)
     ═══════════════════════════════════════════════════════════════════ */
  test('P5 — Patient confirmed appointment screenshots', async ({ portals }) => {
    const { patient } = portals;

    await navPatient(patient.page, '/appointments', 'P5-appts');
    await patient.page.waitForTimeout(1_000);

    // Click "All" tab to show all appointments
    const allTab = patient.page.locator('button').filter({ hasText: /All|ทั้งหมด/i }).first();
    if (await allTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await allTab.click();
      await patient.page.waitForTimeout(600);
    }

    await wfSnap(patient.page, 'WF13-patient-appointment-confirmed', 'appointment-lifecycle');
    console.log('  ✅ WF13: Patient appointment list (all tab)');

    // Click "ยืนยันแล้ว" (Confirmed) tab
    const confirmedTab = patient.page.locator('button').filter({ hasText: /Confirmed|ยืนยันแล้ว/i }).first();
    if (await confirmedTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmedTab.click();
      await patient.page.waitForTimeout(600);
    }

    // Try to open first confirmed appointment for detail view
    const apptCard = patient.page.locator('[class*="appointment"], [class*="card"]').first();
    if (await apptCard.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await apptCard.click();
      await patient.page.waitForTimeout(1_000);
      await wfSnap(patient.page, 'WF13c-patient-appointment-detail-confirmed', 'appointment-lifecycle');
      console.log('  ✅ WF13c: Confirmed appointment detail');
      await patient.page.goBack();
      await patient.page.waitForTimeout(500);
    } else {
      console.log('  ℹ️  WF13c: No confirmed appointment found — keeping existing screenshot');
    }
  });

  /* ═══════════════════════════════════════════════════════════════════
     P6 — VIDEO MEETING AGREEMENT SCREENSHOTS
     WF14a (doctor agreement), WF15a (patient agreement)
     Note: These require an active meeting to have been created
     ═══════════════════════════════════════════════════════════════════ */
  test('P6 — Video meeting agreement page screenshots', async ({ portals }) => {
    const { doctor, patient } = portals;

    // ── WF14a — Doctor meeting agreement/consent page ─────────────────
    // Navigate to health meeting and try to access agreement page
    await navDoctor(doctor.page, 'health-meeting', 'P6-doctor-meeting');
    await doctor.page.waitForTimeout(1_000);

    const callBtn = doctor.page.locator('[data-testid="call-next-patient-btn"], button').filter({
      hasText: /Call Next Patient|โทรผู้ป่วย|เริ่มการประชุม/i,
    }).first();
    const callBtnVisible = await callBtn.isVisible({ timeout: 3_000 }).catch(() => false);

    if (callBtnVisible) {
      // Snapshot of pre-meeting (before entering agreement)
      await wfSnap(doctor.page, 'WF14a-doctor-agreement', 'video-meeting');
      console.log('  ✅ WF14a: Doctor Appointments & Meetings (pre-meeting)');
    } else {
      await wfSnap(doctor.page, 'WF14a-doctor-agreement', 'video-meeting');
      console.log('  ℹ️  WF14a: Appointments & Meetings page (no active meeting)');
    }

    // ── WF15a — Patient meeting page ──────────────────────────────────
    await navPatient(patient.page, '/appointments', 'P6-patient-appts');
    await patient.page.waitForTimeout(1_000);
    await wfSnap(patient.page, 'WF15a-patient-agreement', 'video-meeting');
    console.log('  ✅ WF15a: Patient appointments page');

    // Try to find a meeting link button for WF15b
    const meetingBtn = patient.page.locator('button, a').filter({
      hasText: /Join Meeting|เข้าร่วม|เริ่มประชุม|Video Call|วิดีโอ/i,
    }).first();
    if (await meetingBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await wfSnap(patient.page, 'WF15b-patient-pre-join-invite', 'video-meeting');
      console.log('  ✅ WF15b: Patient pre-join with meeting button');
    } else {
      await wfSnap(patient.page, 'WF15b-patient-pre-join-invite', 'video-meeting');
      console.log('  ℹ️  WF15b: Patient appointments (no active meeting invite)');
    }

    // ── WF14b — Doctor pre-join screen ────────────────────────────────
    await navDoctor(doctor.page, 'health-meeting', 'P6-doctor-pre-join');
    await wfSnap(doctor.page, 'WF14b-doctor-pre-join', 'video-meeting');
    console.log('  ✅ WF14b: Doctor Appointments & Meetings page (pre-join area)');

    console.log('\n  ℹ️  Note: WF14a–WF15b require an active meeting for full consent/pre-join screenshots.');
    console.log('      Run group-E tests with real appointment data to get the meeting agreement pages.\n');
  });
});
