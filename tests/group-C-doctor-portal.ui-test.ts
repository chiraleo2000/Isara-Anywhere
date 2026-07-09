/**
 * ═══════════════════════════════════════════════════════════════════════
 * GROUP C — DOCTOR & ADMIN PORTAL CONTINUOUS FLOW
 * ═══════════════════════════════════════════════════════════════════════
 * Browsers: Patient=Chrome, Doctor=Chrome, Admin=Firefox
 *
 * TWO continuous tests:
 *   C1 — Doctor navigates ALL 8 sidebar pages sequentially
 *   C2 — Admin navigates ALL 8 base + 2 admin-only pages
 *
 * NEVER goes back to dashboard. Uses sidebar button clicks only.
 * ═══════════════════════════════════════════════════════════════════════
 */
import {
  test, expect, assertFullHealth, snap, navDoctor, DOCTOR_URL,
} from './helpers/multi-portal';
import type { Page } from '@playwright/test';

const BODY_READ_TIMEOUT = process.env.PW_HEADED === '1' ? 45_000 : 15_000;

async function readPageBodyText(page: Page): Promise<string> {
  const text = await page.locator('main, body').first().innerText({ timeout: BODY_READ_TIMEOUT }).catch(() => '');
  if (text.trim().length > 20) return text;
  return page.evaluate(() => document.body?.innerText || document.documentElement?.innerText || '');
}

test.describe('Group C — Doctor & Admin Portal Continuous Flow', () => {
  test.describe.configure({ mode: 'serial' });

  /* ═════════════════════════════════════════════════════════════════
     C1 — Doctor: Dashboard → Schedule → Patients → Health Meeting →
          Appointment Pool → Medical Consultants → Medical Content →
          Clinical Resources
     ═════════════════════════════════════════════════════════════════ */
  test('C1 — Doctor navigates ALL sidebar pages (continuous)', async ({ portals }) => {
    const { doctor } = portals;

    await test.step('C01 — Dashboard loaded', async () => {
      await assertFullHealth(doctor.page, 'C01-dashboard');
      await snap(doctor.page, 'C01-dashboard', 'group-C');
      const body = await doctor.page.locator('body').innerText();
      expect(/dashboard|แดชบอร์ด|welcome|สรุป|patient|ผู้ป่วย/i.test(body)).toBeTruthy();
      console.log('  ✅ C01: Doctor dashboard loaded');
    });

    await test.step('C02 — Dashboard → Schedule', async () => {
      await navDoctor(doctor.page, 'schedule', 'C02');
      await assertFullHealth(doctor.page, 'C02');
      await snap(doctor.page, 'C02-schedule', 'group-C');
      const body = await doctor.page.locator('body').innerText();
      expect(/schedule|ตาราง|calendar|day|week|month|slot|นัด/i.test(body)).toBeTruthy();
      console.log('  ✅ C02: Schedule page');
    });

    await test.step('C03 — Schedule → Patients', async () => {
      await navDoctor(doctor.page, 'patients', 'C03');
      await assertFullHealth(doctor.page, 'C03');
      await snap(doctor.page, 'C03-patients', 'group-C');
      const body = await doctor.page.locator('body').innerText();
      expect(/patient|ผู้ป่วย|search|ค้นหา|list|รายชื่อ/i.test(body)).toBeTruthy();
      console.log('  ✅ C03: Patients page');
    });

    await test.step('C04 — Patients → Health Meeting', async () => {
      await navDoctor(doctor.page, 'health-meeting', 'C04');
      await assertFullHealth(doctor.page, 'C04');
      await snap(doctor.page, 'C04-health-meeting', 'group-C');
      const body = await doctor.page.locator('body').innerText();
      expect(/meeting|ประชุม|appointment|นัดหมาย|queue|คิว|scheduled/i.test(body)).toBeTruthy();
      console.log('  ✅ C04: Health Meeting page');
    });

    await test.step('C05 — Appointment Pool redirects to Health Meeting queue', async () => {
      await navDoctor(doctor.page, 'appointment-pool', 'C05');
      await doctor.page.waitForTimeout(1000);
      expect(doctor.page.url()).toMatch(/health-meeting/);
      await assertFullHealth(doctor.page, 'C05');
      await snap(doctor.page, 'C05-health-meeting-queue', 'group-C');
      await expect(doctor.page.getByTestId('health-meeting-page')).toBeVisible({ timeout: 15_000 });
      await expect(doctor.page.getByTestId('queue-list')).toBeVisible();
      const body = await doctor.page.locator('body').innerText();
      expect(/pool|กลุ่ม|appointment|นัดหมาย|pending|queue|คิว/i.test(body)).toBeTruthy();
      console.log('  ✅ C05: Pool redirect → Health Meeting queue');
    });

    // C06 — Medical Consultants — REMOVED in Phase 1 (page disabled, will be rebuilt in Phase 2)

    await test.step('C07 — Appointment Pool → Medical Content', async () => {
      await navDoctor(doctor.page, 'medical-content', 'C07');
      await assertFullHealth(doctor.page, 'C07');
      await snap(doctor.page, 'C07-medical-content', 'group-C');
      const body = await doctor.page.locator('body').innerText();
      expect(/content|เนื้อหา|article|บทความ|medical|สุขภาพ|create|สร้าง/i.test(body)).toBeTruthy();
      console.log('  ✅ C07: Medical Content page');
    });

    await test.step('C08 — Medical Content → Clinical Resources', async () => {
      await navDoctor(doctor.page, 'clinical-resources', 'C08');
      await assertFullHealth(doctor.page, 'C08');
      await snap(doctor.page, 'C08-clinical-resources', 'group-C');
      const body = await doctor.page.locator('body').innerText();
      expect(/clinical|คลินิก|resource|ทรัพยากร|guideline|protocol|drug/i.test(body)).toBeTruthy();
      console.log('  ✅ C08: Clinical Resources page');
    });

    console.log('\n  🎉 C1 COMPLETE — Doctor navigated 8 pages continuously\n');
  });

  /* ═════════════════════════════════════════════════════════════════
     C2 — Admin: Dashboard → all base pages + 2 admin-only pages
     ═════════════════════════════════════════════════════════════════ */
  test('C2 — Admin navigates ALL sidebar pages including admin-only (continuous)', async ({ portals }) => {
    const { admin } = portals;

    await test.step('C09 — Admin dashboard loaded', async () => {
      await assertFullHealth(admin.page, 'C09-dashboard');
      await snap(admin.page, 'C09-admin-dashboard', 'group-C');
      console.log('  ✅ C09: Admin dashboard loaded');
    });

    await test.step('C10 — Dashboard → Patients', async () => {
      await navDoctor(admin.page, 'patients', 'C10');
      await assertFullHealth(admin.page, 'C10');
      await snap(admin.page, 'C10-admin-patients', 'group-C');
      console.log('  ✅ C10: Admin → Patients');
    });

    await test.step('C11 — Patients → Schedule', async () => {
      await navDoctor(admin.page, 'schedule', 'C11');
      await assertFullHealth(admin.page, 'C11');
      await snap(admin.page, 'C11-admin-schedule', 'group-C');
      console.log('  ✅ C11: Admin → Schedule');
    });

    await test.step('C12 — Schedule → Health Meeting', async () => {
      await navDoctor(admin.page, 'health-meeting', 'C12');
      await assertFullHealth(admin.page, 'C12');
      await snap(admin.page, 'C12-admin-meeting', 'group-C');
      console.log('  ✅ C12: Admin → Health Meeting');
    });

    await test.step('C13 — Health Meeting → Manage Doctors (admin-only)', async () => {
      await navDoctor(admin.page, 'doctors', 'C13');
      await assertFullHealth(admin.page, 'C13');
      await snap(admin.page, 'C13-manage-doctors', 'group-C');
      const body = await readPageBodyText(admin.page);
      expect(/doctor|แพทย์|manage|จัดการ|list|รายชื่อ/i.test(body)).toBeTruthy();
      console.log('  ✅ C13: Admin → Manage Doctors (admin-only)');
    });

    await test.step('C14 — Manage Doctors → Doctor Approval (admin-only)', async () => {
      await navDoctor(admin.page, 'doctor-management', 'C14');
      await assertFullHealth(admin.page, 'C14');
      await snap(admin.page, 'C14-doctor-approval', 'group-C');
      const body = await readPageBodyText(admin.page);
      expect(/approval|อนุมัติ|pending|new doctor|แพทย์ใหม่|manage/i.test(body)).toBeTruthy();
      console.log('  ✅ C14: Admin → Doctor Approval (admin-only)');
    });

    await test.step('C15 — Doctor Approval → Medical Content', async () => {
      await navDoctor(admin.page, 'medical-content', 'C15');
      await assertFullHealth(admin.page, 'C15');
      await snap(admin.page, 'C15-admin-content', 'group-C');
      console.log('  ✅ C15: Admin → Medical Content');
    });

    await test.step('C16 — Medical Content → Clinical Resources', async () => {
      await navDoctor(admin.page, 'clinical-resources', 'C16');
      await assertFullHealth(admin.page, 'C16');
      await snap(admin.page, 'C16-admin-resources', 'group-C');
      console.log('  ✅ C16: Admin → Clinical Resources');
    });

    await test.step('C17 — Doctor profile page (page 16)', async () => {
      const { doctor } = portals;
      const userId = await doctor.page.evaluate(() => {
        const m = window.location.pathname.match(/\/doctor\/([^/]+)/);
        return m?.[1] || '';
      });
      if (userId) {
        await doctor.page.goto(`${DOCTOR_URL}/doctor/${userId}/profile`, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        });
        await assertFullHealth(doctor.page, 'C17-profile');
        await snap(doctor.page, 'C17-doctor-profile', 'group-C');
      }
    });

    console.log('\n  🎉 C2 COMPLETE — Admin navigated 8 pages including admin-only\n');
  });
});
