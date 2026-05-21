/**
 * ═══════════════════════════════════════════════════════════════════════
 * GROUP H — MEDICAL CONTENT, CLINICAL RESOURCES & CONSULTANTS
 * ═══════════════════════════════════════════════════════════════════════
 * Browsers: Patient=Chrome, Doctor=Chrome, Admin=Firefox
 *
 * Real workflow:
 *   H1: Doctor → Medical Content → open create form → fill fields →
 *       browse content list → click article
 *   H2: Doctor → Clinical Resources → browse → Consultants
 *   H3: Patient → Health Library → browse articles → read article
 *   H4: Admin → Content management
 *
 * Real form filling for content creation, article browsing.
 * ═══════════════════════════════════════════════════════════════════════
 */
import {
  test, expect, assertFullHealth, snap,
  navPatient, navDoctor, waitForContent, assertHasData,
} from './helpers/multi-portal';

test.describe('Group H — Content, Resources & Consultants', () => {
  test.describe.configure({ mode: 'serial' });

  /* ═════════════════════════════════════════════════════════════════
     H1 — Doctor: Medical Content → create form → browse list
     ═════════════════════════════════════════════════════════════════ */
  test('H1 — Doctor medical content creation and browsing', async ({ portals }) => {
    const { doctor } = portals;

    await test.step('H01 — Navigate to Medical Content', async () => {
      await navDoctor(doctor.page, 'medical-content', 'H01');
      await assertFullHealth(doctor.page, 'H01');
      await snap(doctor.page, 'H01-medical-content', 'group-H');
      const body = await doctor.page.locator('body').innerText();
      expect(/content|เนื้อหา|article|บทความ|medical|create|สร้าง/i.test(body)).toBeTruthy();
      console.log('  ✅ H01: Doctor → Medical Content');
    });

    await test.step('H02 — Open content creation form', async () => {
      const createBtn = doctor.page.locator('button, a').filter({
        hasText: /Create|สร้าง|New|เพิ่ม|Add|Write|เขียน/i,
      }).first();
      await expect(createBtn, 'Create content button').toBeVisible({ timeout: 8_000 });
      await createBtn.click();
      await doctor.page.waitForTimeout(500);
      await snap(doctor.page, 'H02-create-form', 'group-H');
      console.log('  ✅ H02: Content creation form opened');
    });

    await test.step('H03 — Fill content form fields', async () => {
      // Title input
      const titleInput = doctor.page.locator(
        'input[name*="title" i], input[placeholder*="title" i], input[placeholder*="หัวข้อ"], input[type="text"]'
      ).first();
      if (await titleInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await titleInput.fill('E2E Test: วิธีดูแลสุขภาพในฤดูฝน');
        await doctor.page.waitForTimeout(300);
      }

      // Content/body textarea
      const bodyInput = doctor.page.locator('textarea').first();
      if (await bodyInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await bodyInput.fill('บทความทดสอบ: การดูแลสุขภาพในช่วงฤดูฝน ควรรับประทานอาหารที่มีวิตามินซีสูง ออกกำลังกายสม่ำเสมอ');
        await doctor.page.waitForTimeout(300);
      }

      // Category select if available
      const categorySelect = doctor.page.locator('select').first();
      if (await categorySelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
        const options = await categorySelect.locator('option').allTextContents();
        if (options.length > 1) {
          await categorySelect.selectOption({ index: 1 });
          await doctor.page.waitForTimeout(300);
        }
      }

      await snap(doctor.page, 'H03-form-filled', 'group-H');
      console.log('  ✅ H03: Content form filled');
    });

    await test.step('H04 — Cancel/close creation form (dont submit test data)', async () => {
      const cancelBtn = doctor.page.locator('button').filter({
        hasText: /Cancel|ยกเลิก|Close|ปิด|Back|กลับ|Discard/i,
      }).first();
      if (await cancelBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await cancelBtn.click({ force: true, timeout: 12_000 });
        await doctor.page.waitForTimeout(500);
      } else {
        // Navigate back to content list
        await navDoctor(doctor.page, 'medical-content', 'H04-back');
      }
      await snap(doctor.page, 'H04-back-to-list', 'group-H');
      console.log('  ✅ H04: Back to content list');
    });

    await test.step('H05 — Browse content list', async () => {
      // Clear any leftover search text from H03 form fill that may have landed in search bar
      const searchInput = doctor.page.locator(
        'input[type="search"], input[type="text"], input[placeholder*="search" i], input[placeholder*="ค้นหา"]'
      ).first();
      if (await searchInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await searchInput.fill('');
        await doctor.page.waitForTimeout(500);
      }
      const dataCount = await assertHasData(doctor.page, 'H05', 1);
      // Click first article if available
      const article = doctor.page.locator('[class*="card"], [class*="item"], tr').filter({
        hasText: /article|บทความ|health|สุขภาพ|medical|content/i,
      }).first();
      if (await article.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await article.click();
        await doctor.page.waitForTimeout(500);
        await snap(doctor.page, 'H05-article-detail', 'group-H');
      }
      console.log(`  ✅ H05: Content list — ${dataCount} items`);
    });

    console.log('\n  🎉 H1 COMPLETE — Doctor content creation & browsing\n');
  });

  /* ═════════════════════════════════════════════════════════════════
     H2 — Doctor: Clinical Resources → Consultants → Pool
     ═════════════════════════════════════════════════════════════════ */
  test('H2 — Doctor clinical resources and consultants', async ({ portals }) => {
    const { doctor } = portals;

    await test.step('H06 — Navigate to Clinical Resources', async () => {
      await navDoctor(doctor.page, 'clinical-resources', 'H06');
      await assertFullHealth(doctor.page, 'H06');
      await snap(doctor.page, 'H06-clinical-resources', 'group-H');
      const body = await doctor.page.locator('body').innerText();
      expect(/clinical|คลินิก|resource|ทรัพยากร|guideline|protocol/i.test(body)).toBeTruthy();
      console.log('  ✅ H06: Clinical Resources');
    });

    await test.step('H07 — Browse resources list', async () => {
      const dataCount = await assertHasData(doctor.page, 'H07', 1);
      // Click first resource if available
      const resource = doctor.page.locator('[class*="card"], [class*="item"], tr').first();
      if (await resource.isVisible({ timeout: 3_000 }).catch(() => false) && dataCount > 0) {
        await resource.click();
        await doctor.page.waitForTimeout(500);
        await snap(doctor.page, 'H07-resource-detail', 'group-H');
      }
      console.log(`  ✅ H07: Resources — ${dataCount} items`);
    });

    // H08 — Medical Consultants — REMOVED in Phase 1 (page disabled, will be rebuilt in Phase 2)

    await test.step('H09 — Navigate to Appointment Pool', async () => {
      await navDoctor(doctor.page, 'appointment-pool', 'H09');
      await assertFullHealth(doctor.page, 'H09');
      await snap(doctor.page, 'H09-pool', 'group-H');
      console.log('  ✅ H09: Appointment Pool');
    });

    console.log('\n  🎉 H2 COMPLETE — Resources & consultants\n');
  });

  /* ═════════════════════════════════════════════════════════════════
     H3 — Patient: Health Library → browse → read article
     ═════════════════════════════════════════════════════════════════ */
  test('H3 — Patient health library browsing', async ({ portals }) => {
    const { patient } = portals;

    await test.step('H10 — Navigate to Health Library', async () => {
      await navPatient(patient.page, '/health-library', 'H10');
      await assertFullHealth(patient.page, 'H10');
      await snap(patient.page, 'H10-health-library', 'group-H');
      const body = await patient.page.locator('body').innerText();
      expect(/library|คลัง|health|สุขภาพ|article|บทความ/i.test(body)).toBeTruthy();
      console.log('  ✅ H10: Health Library');
    });

    await test.step('H11 — Browse articles', async () => {
      const dataCount = await assertHasData(patient.page, 'H11', 1);
      // Click first article card — match ContentCard buttons (overflow-hidden) or data-testid
      const article = patient.page
        .locator('[data-testid="content-item"], main button[class*="overflow-hidden"], [class*="gap-6"] > button')
        .first();
      if (await article.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await article.click();
        await patient.page.waitForTimeout(500);
        await waitForContent(patient.page, 'H11-article');
        await snap(patient.page, 'H11-article-detail', 'group-H');
        console.log(`  ✅ H11: Article opened — ${dataCount} total`);
      } else {
        console.log(`  ✅ H11: Articles listed — ${dataCount} total`);
      }
    });

    await test.step('H12 — Navigate to AI Doctor (forward flow)', async () => {
      await navPatient(patient.page, '/ai-doctor', 'H12');
      await assertFullHealth(patient.page, 'H12');
      await snap(patient.page, 'H12-ai-doctor', 'group-H');
      console.log('  ✅ H12: Patient → AI Doctor');
    });

    console.log('\n  🎉 H3 COMPLETE — Patient health library\n');
  });

  /* ═════════════════════════════════════════════════════════════════
     H4 — Admin: Content management overview
     ═════════════════════════════════════════════════════════════════ */
  test('H4 — Admin content management', async ({ portals }) => {
    const { admin } = portals;

    await test.step('H13 — Admin → Medical Content', async () => {
      await navDoctor(admin.page, 'medical-content', 'H13');
      await assertFullHealth(admin.page, 'H13');
      await snap(admin.page, 'H13-admin-content', 'group-H');
      console.log('  ✅ H13: Admin → Medical Content');
    });

    await test.step('H14 — Admin → Clinical Resources', async () => {
      await navDoctor(admin.page, 'clinical-resources', 'H14');
      await assertFullHealth(admin.page, 'H14');
      await snap(admin.page, 'H14-admin-resources', 'group-H');
      console.log('  ✅ H14: Admin → Clinical Resources');
    });

    console.log('\n  🎉 H4 COMPLETE — Admin content management\n');
  });
});
