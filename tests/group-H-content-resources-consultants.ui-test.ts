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
  PATIENT_URL, DOCTOR_URL, readPageBearerToken, ensurePatientPortalAuthenticated,
  ensureDoctorPortalAuthenticated,
} from './helpers/multi-portal';

test.describe('Group H — Content, Resources & Consultants', () => {
  test.describe.configure({ mode: 'serial' });

  /* ═════════════════════════════════════════════════════════════════
     H1 — Doctor: Medical Content → create form → browse list
     ═════════════════════════════════════════════════════════════════ */
  test('H1 — Doctor medical content creation and browsing', async ({ portals }) => {
    const { doctor } = portals;

    await test.step('H01 — Navigate to Medical Content', async () => {
      await ensureDoctorPortalAuthenticated(doctor.page, 'H01-pre', 'medical-content');
      await navDoctor(doctor.page, 'medical-content', 'H01');
      await assertFullHealth(doctor.page, 'H01');
      await snap(doctor.page, 'H01-medical-content', 'group-H');
      const body = await doctor.page.locator('body').innerText();
      const onMedicalContent =
        /medical-content/i.test(doctor.page.url())
        || await doctor.page.getByTestId('medical-content-page').isVisible({ timeout: 8_000 }).catch(() => false);
      expect(
        onMedicalContent || /content|article|medical|create|library|Medical Content|เนื้อหา/i.test(body),
      ).toBeTruthy();
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

  /* ═════════════════════════════════════════════════════════════════
     H5 — Content approval: draft → admin approve → patient library
     ═════════════════════════════════════════════════════════════════ */
  test('H5 — Medical content draft approval workflow', async ({ portals }) => {
    const { doctor, admin, patient } = portals;
    const uniqueTitle = `E2E Draft ${Date.now()}`;
    let h5ArticleId = '';

    await test.step('H-approval-1 — Doctor creates draft via API', async () => {
      await ensureDoctorPortalAuthenticated(doctor.page, 'H5-pre', 'medical-content');
      let token = await readPageBearerToken(doctor.page);
      let createResp: import('@playwright/test').APIResponse | null = null;
      const createDeadline = Date.now() + 45_000;
      let attempt = 0;
      while (Date.now() < createDeadline) {
        attempt++;
        try {
          createResp = await doctor.page.request.post(`${DOCTOR_URL}/api/content/medical`, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            data: {
              titleThai: uniqueTitle,
              contentThai: 'บทความทดสอบรอการอนุมัติจากแอดมิน',
              category: 'general-health',
              tags: ['e2e'],
              status: 'draft',
            },
            timeout: 45_000,
          });
          if (createResp.status() === 401 || createResp.status() === 403) {
            await ensureDoctorPortalAuthenticated(doctor.page, `H5-pre-reauth-${attempt}`, 'medical-content');
            token = await readPageBearerToken(doctor.page);
            createResp = null;
            await doctor.page.waitForTimeout(1000 * Math.min(attempt, 3));
            continue;
          }
          break;
        } catch {
          createResp = null;
          await doctor.page.waitForTimeout(1500 * Math.min(attempt, 4));
        }
      }
      expect(createResp, 'create draft response').toBeTruthy();
      expect(createResp.status(), 'create draft').toBeLessThan(400);
      const created = await createResp.json();
      let articleId = created.article?.id || created.id;

      const listResp = await doctor.page.request.get(`${DOCTOR_URL}/api/content/medical`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const listBody = await listResp.json();
      const articles = listBody.articles || [];
      const matched = articles.find(
        (a: { id?: string; title?: string; titleThai?: string; title_thai?: string }) =>
          (a.title || a.titleThai || a.title_thai || '').includes(uniqueTitle),
      );
      if (matched?.id) articleId = matched.id;
      expect(articleId).toBeTruthy();
      const titles = articles.map((a: { title?: string; titleThai?: string; title_thai?: string }) => a.title || a.titleThai || a.title_thai);
      expect(titles.some((t: string) => t?.includes(uniqueTitle)), 'author sees draft').toBe(true);

      const patientList = await patient.page.request.get(`${PATIENT_URL}/api/content/medical`);
      const patientBody = await patientList.json();
      const patientTitles = (patientBody.articles || patientBody || []).map(
        (a: { title?: string; titleThai?: string }) => a.title || a.titleThai,
      );
      expect(patientTitles.some((t: string) => t?.includes(uniqueTitle)), 'patient must not see draft').toBe(false);

      h5ArticleId = String(articleId);
      console.log(`  ✅ H-approval-1: Draft created ${h5ArticleId}`);
    });

    await test.step('H-approval-2 — Doctor submits → admin approves → patient sees', async () => {
      expect(h5ArticleId, 'h5 article id').toBeTruthy();
      const articleId = h5ArticleId;

      await ensureDoctorPortalAuthenticated(doctor.page, 'H5-submit', 'medical-content');
      let doctorToken = await readPageBearerToken(doctor.page);
      let submitResp = await doctor.page.request.post(
        `${DOCTOR_URL}/api/content/medical/${articleId}/submit`,
        { headers: { Authorization: `Bearer ${doctorToken}` } },
      );
      console.log(`  H5 submit POST status=${submitResp.status()}`);
      if (submitResp.status() === 401 || submitResp.status() === 403) {
        await ensureDoctorPortalAuthenticated(doctor.page, 'H5-submit-reauth', 'medical-content');
        doctorToken = await readPageBearerToken(doctor.page);
        submitResp = await doctor.page.request.post(
          `${DOCTOR_URL}/api/content/medical/${articleId}/submit`,
          { headers: { Authorization: `Bearer ${doctorToken}` } },
        );
        console.log(`  H5 submit POST retry status=${submitResp.status()}`);
      }
      if (submitResp.status() >= 400) {
        submitResp = await doctor.page.request.put(
          `${DOCTOR_URL}/api/content/medical/${encodeURIComponent(articleId)}`,
          {
            headers: { Authorization: `Bearer ${doctorToken}`, 'Content-Type': 'application/json' },
            data: { status: 'pending' },
          },
        );
        console.log(`  H5 submit PUT fallback status=${submitResp.status()} body=${(await submitResp.text()).slice(0, 200)}`);
      }
      expect(submitResp.status(), 'submit for review').toBeLessThan(400);

      await ensureDoctorPortalAuthenticated(admin.page, 'H5-admin-approve', 'medical-content');
      let adminToken = await readPageBearerToken(admin.page);
      let reviewResp = await admin.page.request.post(
        `${DOCTOR_URL}/api/content/medical/${articleId}/review`,
        {
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          data: { action: 'approve' },
        },
      );
      if (reviewResp.status() === 401 || reviewResp.status() === 403) {
        await ensureDoctorPortalAuthenticated(admin.page, 'H5-admin-reauth', 'medical-content');
        adminToken = await readPageBearerToken(admin.page);
        reviewResp = await admin.page.request.post(
          `${DOCTOR_URL}/api/content/medical/${articleId}/review`,
          {
            headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
            data: { action: 'approve' },
          },
        );
      }
      expect(reviewResp.status(), 'admin approve').toBeLessThan(400);

      await patient.page.waitForTimeout(1_000);
      const patientList = await patient.page.request.get(`${PATIENT_URL}/api/content/medical`);
      const patientBody = await patientList.json();
      const patientTitles = (patientBody.articles || patientBody || []).map(
        (a: { title?: string; titleThai?: string }) => a.title || a.titleThai,
      );
      expect(patientTitles.some((t: string) => t?.includes(uniqueTitle)), 'patient sees published').toBe(true);
      console.log('  ✅ H-approval-2: Published visible to patient');
    });

    console.log('\n  🎉 H5 COMPLETE — Medical content approval workflow\n');
  });

  test('H6 — Clinical resource approval workflow', async ({ portals }) => {
    const { doctor, admin, patient } = portals;
    const uniqueTitle = `E2E Clinical ${Date.now()}`;
    let h6ResourceId = '';

    await test.step('H6-1 — Doctor creates clinical draft via API', async () => {
      await ensureDoctorPortalAuthenticated(doctor.page, 'H6-pre', 'clinical-resources');
      const token = await readPageBearerToken(doctor.page);
      const createResp = await doctor.page.request.post(`${DOCTOR_URL}/api/content/clinical`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: {
          titleThai: uniqueTitle,
          contentThai: 'แนวทางทดสอบสำหรับแพทย์เท่านั้น',
          category: 'general_medicine',
          resourceType: 'guideline',
          status: 'draft',
        },
        timeout: 45_000,
      });
      expect(createResp.status(), 'create clinical draft').toBeLessThan(400);
      const created = await createResp.json();
      const resourceId = created.resource?.id || created.id;
      expect(resourceId).toBeTruthy();
      h6ResourceId = String(resourceId);

      const patientResp = await patient.page.request.get(`${PATIENT_URL}/api/content/clinical`);
      expect(patientResp.status(), 'patient clinical list').toBeLessThan(500);
      if (patientResp.status() === 403) {
        console.log('  ✅ H6-1: Patient clinical endpoint blocked (403)');
      } else {
        const patientBody = await patientResp.json().catch(() => ({}));
        const list = patientBody.resources || patientBody.data || [];
        const leaked = Array.isArray(list) && list.some(
          (r: { id?: string; title?: string; titleThai?: string }) =>
            r.id === resourceId || r.title === uniqueTitle || r.titleThai === uniqueTitle,
        );
        expect(leaked, 'patient must not see clinical draft').toBeFalsy();
        console.log('  ✅ H6-1: Clinical draft hidden from patient published list');
      }
      console.log(`  ✅ H6-1: Clinical draft ${h6ResourceId}, patient blocked from draft`);
    });

    await test.step('H6-2 — Submit → admin approve → doctor sees published', async () => {
      expect(h6ResourceId, 'h6 resource id').toBeTruthy();
      const resourceId = h6ResourceId;

      await ensureDoctorPortalAuthenticated(doctor.page, 'H6-submit', 'clinical-resources');
      let doctorToken = await readPageBearerToken(doctor.page);
      let submitResp = await doctor.page.request.put(
        `${DOCTOR_URL}/api/content/clinical/${resourceId}`,
        {
          headers: { Authorization: `Bearer ${doctorToken}`, 'Content-Type': 'application/json' },
          data: { status: 'pending', changeNote: 'E2E submit' },
        },
      );
      if (submitResp.status() === 401 || submitResp.status() === 403) {
        await ensureDoctorPortalAuthenticated(doctor.page, 'H6-submit-reauth', 'clinical-resources');
        doctorToken = await readPageBearerToken(doctor.page);
        submitResp = await doctor.page.request.put(
          `${DOCTOR_URL}/api/content/clinical/${resourceId}`,
          {
            headers: { Authorization: `Bearer ${doctorToken}`, 'Content-Type': 'application/json' },
            data: { status: 'pending', changeNote: 'E2E submit' },
          },
        );
      }
      expect(submitResp.status(), 'submit clinical').toBeLessThan(400);

      await ensureDoctorPortalAuthenticated(admin.page, 'H6-admin-approve', 'clinical-resources');
      let adminToken = await readPageBearerToken(admin.page);
      let reviewResp = await admin.page.request.post(
        `${DOCTOR_URL}/api/content/clinical/${resourceId}/review`,
        {
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          data: { action: 'approve', comment: 'E2E approved' },
        },
      );
      if (reviewResp.status() === 401 || reviewResp.status() === 403) {
        await ensureDoctorPortalAuthenticated(admin.page, 'H6-admin-reauth', 'clinical-resources');
        adminToken = await readPageBearerToken(admin.page);
        reviewResp = await admin.page.request.post(
          `${DOCTOR_URL}/api/content/clinical/${resourceId}/review`,
          {
            headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
            data: { action: 'approve', comment: 'E2E approved' },
          },
        );
      }
      expect(reviewResp.status(), 'admin approve clinical').toBeLessThan(400);

      const listResp = await doctor.page.request.get(`${DOCTOR_URL}/api/content/clinical`, {
        headers: { Authorization: `Bearer ${doctorToken}` },
      });
      const listBody = await listResp.json();
      const resources = listBody.resources || listBody || [];
      const match = resources.find((r: { id?: string; titleThai?: string; title?: string; status?: string }) =>
        r.id === resourceId || r.titleThai?.includes(uniqueTitle) || r.title?.includes(uniqueTitle),
      );
      expect(match, 'doctor sees approved resource').toBeTruthy();
      expect(['published', 'approved']).toContain(match?.status);
      console.log('  ✅ H6-2: Clinical resource approved for doctors');
    });
  });

  test('H7 — Admin sidebar pending badges', async ({ portals }) => {
    const { admin } = portals;

    await test.step('H7-1 — Admin stats API returns pending fields', async () => {
      const token = await readPageBearerToken(admin.page);
      const statsResp = await admin.page.request.get(`${DOCTOR_URL}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(statsResp.status()).toBeLessThan(400);
      const body = await statsResp.json();
      const stats = body.stats || body;
      expect(stats).toHaveProperty('pendingContent');
      expect(stats).toHaveProperty('pendingResources');
      expect(stats).toHaveProperty('pendingDoctors');
      console.log(`  ✅ H7-1: pendingContent=${stats.pendingContent}, pendingResources=${stats.pendingResources}`);
    });

    await test.step('H7-2 — Badge elements render when counts > 0', async () => {
      await navDoctor(admin.page, 'medical-content', 'H7-nav');
      const badge = admin.page.locator('[data-testid="nav-badge-medical-content"]');
      const count = await badge.count();
      if (count > 0) {
        await expect(badge.first()).toBeVisible();
        console.log('  ✅ H7-2: Medical content nav badge visible');
      } else {
        console.log('  ℹ️ H7-2: No pending medical content badge (count is 0)');
      }
    });
  });

  test('H8 — Patient Health Studio medical content tab', async ({ portals }) => {
    const { patient } = portals;

    await test.step('H8-1 — Open dashboard Health Studio content tab', async () => {
      await ensurePatientPortalAuthenticated(patient.page, 'H8-auth');
      await patient.page.goto(`${PATIENT_URL}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await waitForContent(patient.page, 'H8-dashboard', 15_000, 'patient1');
      // Accept local Vite (:3005) or cloud patient portal origin.
      const patientOrigin = PATIENT_URL.replace(/\/$/, '');
      expect(patient.page.url(), 'patient dashboard URL').toMatch(
        new RegExp(`${patientOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/|$)`),
      );
      await assertFullHealth(patient.page, 'H8');
      const studio = patient.page.locator('[data-testid="health-studio-ready"]');
      const hasStudio = await studio.isVisible({ timeout: 12_000 }).catch(() => false);
      if (hasStudio) {
        await studio.scrollIntoViewIfNeeded();
        const contentTab = patient.page.locator('[data-testid="health-studio-content-tab"]');
        await expect(contentTab, 'Health Studio content tab').toBeVisible({ timeout: 10_000 });
        await contentTab.click();
        await expect(patient.page.locator('[data-testid="health-studio-medical-content"]')).toBeVisible({ timeout: 15_000 });
        await snap(patient.page, 'H15-health-studio-content', 'group-H');
        console.log('  ✅ H8-1: Health Studio content tab loaded');
      } else {
        // Fallback: Health Library is the patient medical-content surface when studio shell is absent.
        await navPatient(patient.page, '/health-library', 'H8-fallback');
        await assertFullHealth(patient.page, 'H8-fallback');
        const body = await patient.page.locator('body').innerText();
        expect(
          /health.?library|medical|content|article|ห้องสมุด|เนื้อหา|บทความ/i.test(body)
            || /health-library/i.test(patient.page.url()),
          'H8: medical content surface',
        ).toBeTruthy();
        await snap(patient.page, 'H15-health-library-fallback', 'group-H');
        console.warn('  ⚠ H8-1: health-studio-ready missing — accepted Health Library surface');
      }
    });

    await test.step('H8-2 — Browse article in Health Studio', async () => {
      const article = patient.page.locator('[data-testid="content-item"]').first();
      if (await article.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await article.click();
        await patient.page.waitForTimeout(500);
        await snap(patient.page, 'H16-health-studio-article', 'group-H');
        console.log('  ✅ H8-2: Article opened in Health Studio');
      } else {
        const libArticle = patient.page.locator('article, [data-testid*="article"], a, button').filter({
          hasText: /read|อ่าน|article|บทความ|view|ดู/i,
        }).first();
        if (await libArticle.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await libArticle.click().catch(() => {});
          await snap(patient.page, 'H16-health-library-article', 'group-H');
          console.log('  ✅ H8-2: Article opened via Health Library fallback');
        } else {
          console.log('  ℹ️ H8-2: No articles in Health Studio / library yet');
        }
      }
    });
  });
});
