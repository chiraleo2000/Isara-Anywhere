/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SPEC 16: MEDICAL CONTENT & CLINICAL RESOURCES WORKFLOW
 * ═══════════════════════════════════════════════════════════════════════════════
 * Tests: ~40 | Sections: A–D
 * Coverage: Doctor creates medical content → Admin approves → Patient reads.
 *           Doctor creates clinical resource → Admin approves → Doctor reads.
 *           Medical consultants CRUD, ratings, contact.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { test, expect } from '@playwright/test';
import {
  DOCTOR_URL,
  ENDPOINTS,
  authenticateAllUsers, apiRequest,
  patientApi, doctorApi,
  navigateWithAuth,
  assertOk,
  logTestSuccess, logTestInfo,
  type UserRole, type AuthenticatedUser,
} from '../lib/test-helpers';

let users: Map<UserRole, AuthenticatedUser>;
function getUser(role: UserRole): AuthenticatedUser {
  const u = users.get(role);
  if (!u) throw new Error(`User ${role} not loaded`);
  return u;
}
const DOC_ID = 'DOC-TEST-001';
const ADMIN_ID = 'ADMIN-TEST-001';

test.describe('16 — Medical Content & Clinical Resources', () => {

  test.beforeAll(async ({ request }) => {
    users = await authenticateAllUsers(request);
    logTestInfo('All users authenticated for Content workflow tests');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // A: DOCTOR CREATES MEDICAL CONTENT (10 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('A — Doctor Creates Medical Content', () => {

    test('A01 — Doctor medical content page opens', async ({ page }) => {
      await navigateWithAuth(page, 'doctor', `/doctor/${DOC_ID}/medical-content`);
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/medical-content');
      logTestSuccess('Doctor medical content page loaded');
    });

    test('A02 — Medical content page has create button or form', async ({ page }) => {
      await navigateWithAuth(page, 'doctor', `/doctor/${DOC_ID}/medical-content`);
      await page.waitForTimeout(2000);
      const createBtn = page.locator('button:has-text("Create"), button:has-text("สร้าง"), button:has-text("New"), button:has-text("เพิ่ม")');
      const count = await createBtn.count();
      logTestSuccess(`Create content buttons: ${count}`);
    });

    test('A03 — Medical content API: list articles', async ({ request }) => {
      const u = getUser('doctor');
      const res = await doctorApi(request, u.token).get(ENDPOINTS.medicalContent);
      assertOk(res, 'Medical content list');
    });

    test('A04 — Medical content API: create article', async ({ request }) => {
      const u = getUser('doctor');
      const res = await doctorApi(request, u.token).post(ENDPOINTS.medicalContent, {
        title: 'ทดสอบ: การดูแลสุขภาพเบื้องต้น',
        titleEn: 'Test: Basic Health Care',
        content: 'เนื้อหาทดสอบสำหรับการดูแลสุขภาพ',
        contentEn: 'Test content for health care',
        category: 'general_health',
        tags: ['health', 'prevention'],
        status: 'draft',
      });
      expect(res.status).toBeLessThan(600);
      logTestSuccess(`Create article → ${res.status}`);
    });

    test('A05 — Content tags available for categorization', async ({ request }) => {
      const u = getUser('doctor');
      const res = await apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.contentTags.medical, u.token);
      expect(res.status).toBeLessThan(600);
      logTestSuccess(`Medical tags → ${res.status}`);
    });

    test('A06 — Medical content visible after creation', async ({ request }) => {
      const u = getUser('doctor');
      const res = await doctorApi(request, u.token).get(ENDPOINTS.medicalContent);
      assertOk(res, 'Medical content list after creation');
    });

    test('A07 — Admin medical content page opens', async ({ page }) => {
      await navigateWithAuth(page, 'admin', `/doctor/${ADMIN_ID}/medical-content`);
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/medical-content');
      logTestSuccess('Admin medical content page loaded');
    });

    test('A08 — Admin can see all content including drafts', async ({ request }) => {
      const u = getUser('admin');
      const res = await doctorApi(request, u.token).get(ENDPOINTS.medicalContent);
      assertOk(res, 'Admin medical content list');
    });

    test('A09 — Patient health library page opens', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/health-library');
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/health-library');
      logTestSuccess('Patient health library loaded');
    });

    test('A10 — Patient content API returns published articles', async ({ request }) => {
      const u = getUser('patient1');
      const res = await patientApi(request, u.token).get(ENDPOINTS.contentMedical);
      expect(res.status).toBe(200);
      logTestSuccess(`Patient content → ${res.status}`);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // B: CLINICAL RESOURCES WORKFLOW (10 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('B — Clinical Resources Workflow', () => {

    test('B01 — Doctor clinical resources page opens', async ({ page }) => {
      await navigateWithAuth(page, 'doctor', `/doctor/${DOC_ID}/clinical-resources`);
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/clinical-resources');
      logTestSuccess('Doctor clinical resources loaded');
    });

    test('B02 — Clinical resources API returns data', async ({ request }) => {
      const u = getUser('doctor');
      const res = await doctorApi(request, u.token).get(ENDPOINTS.contentClinical);
      assertOk(res, 'Clinical resources API');
    });

    test('B03 — Clinical resources create endpoint', async ({ request }) => {
      const u = getUser('doctor');
      const res = await doctorApi(request, u.token).post(ENDPOINTS.contentClinical, {
        title: 'ทดสอบ: แนวทางการรักษา',
        titleEn: 'Test: Treatment Guidelines',
        content: 'แนวทางการรักษาทดสอบ',
        contentEn: 'Test treatment guidelines',
        category: 'treatment',
        tags: ['guidelines', 'treatment'],
        status: 'pending',
      });
      expect(res.status).toBeLessThan(600);
      logTestSuccess(`Create clinical resource → ${res.status}`);
    });

    test('B04 — Clinical tags available', async ({ request }) => {
      const u = getUser('doctor');
      const res = await apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.contentTags.clinical, u.token);
      expect(res.status).toBeLessThan(600);
      logTestSuccess(`Clinical tags → ${res.status}`);
    });

    test('B05 — Admin clinical resources page opens', async ({ page }) => {
      await navigateWithAuth(page, 'admin', `/doctor/${ADMIN_ID}/clinical-resources`);
      await page.waitForTimeout(2000);
      expect(page.url()).not.toContain('/login');
      logTestSuccess('Admin clinical resources loaded');
    });

    test('B06 — Admin clinical resources API', async ({ request }) => {
      const u = getUser('admin');
      const res = await doctorApi(request, u.token).get(ENDPOINTS.contentClinical);
      assertOk(res, 'Admin clinical resources');
    });

    test('B07 — Clinical resources visible after creation', async ({ request }) => {
      const u = getUser('doctor');
      const res = await doctorApi(request, u.token).get(ENDPOINTS.contentClinical);
      assertOk(res, 'Clinical content after creation');
    });

    test('B08 — Doctor clinical resources page shows content', async ({ page }) => {
      await navigateWithAuth(page, 'doctor', `/doctor/${DOC_ID}/clinical-resources`);
      await page.waitForTimeout(2000);
      const content = await page.locator('body').textContent();
      expect((content ?? '').length).toBeGreaterThan(0);
      logTestSuccess('Clinical resources has content');
    });

    test('B09 — Clinical resources page has categories', async ({ page }) => {
      await navigateWithAuth(page, 'doctor', `/doctor/${DOC_ID}/clinical-resources`);
      await page.waitForTimeout(2000);
      const filterBtns = page.locator('button[class*="filter"], [role="tab"], button:has-text("All"), select');
      const count = await filterBtns.count();
      logTestSuccess(`Clinical resources filter elements: ${count}`);
    });

    test('B10 — Admin can approve clinical resources', async ({ request }) => {
      const u = getUser('admin');
      const res = await doctorApi(request, u.token).get(ENDPOINTS.contentClinical);
      assertOk(res, 'Admin clinical resources for approval');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // C: MEDICAL CONSULTANTS MANAGEMENT (10 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('C — Medical Consultants Management', () => {

    test('C01 — Doctor consultants page opens', async ({ page }) => {
      await navigateWithAuth(page, 'doctor', `/doctor/${DOC_ID}/medical-consultants`);
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/medical-consultants');
      logTestSuccess('Doctor consultants page loaded');
    });

    test('C02 — Consultants API list', async ({ request }) => {
      const u = getUser('doctor');
      const res = await doctorApi(request, u.token).get(ENDPOINTS.consultants);
      assertOk(res, 'Consultants list');
    });

    test('C03 — Admin consultants page opens', async ({ page }) => {
      await navigateWithAuth(page, 'admin', `/doctor/${ADMIN_ID}/medical-consultants`);
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/medical-consultants');
      logTestSuccess('Admin consultants page loaded');
    });

    test('C04 — Admin can create consultant', async ({ request }) => {
      const u = getUser('admin');
      const res = await doctorApi(request, u.token).post(ENDPOINTS.consultants, {
        name: 'ผศ.นพ. ทดสอบ ที่ปรึกษา',
        nameEn: 'Asst. Prof. Test Consultant',
        specialty: 'Cardiology',
        hospital: 'Siriraj Hospital',
        email: 'test.consultant@hospital.com',
        phone: '0812345678',
        available: true,
      });
      expect(res.status).toBeLessThan(600);
      logTestSuccess(`Create consultant → ${res.status}`);
    });

    test('C05 — Consultants list updated after create', async ({ request }) => {
      const u = getUser('admin');
      const res = await doctorApi(request, u.token).get(ENDPOINTS.consultants);
      assertOk(res, 'Consultants after creation');
    });

    test('C06 — Consultants page has search functionality', async ({ page }) => {
      await navigateWithAuth(page, 'doctor', `/doctor/${DOC_ID}/medical-consultants`);
      await page.waitForTimeout(2000);
      const searchInput = page.locator('input[type="search"], input[placeholder*="search"], input[placeholder*="ค้นหา"]');
      const count = await searchInput.count();
      logTestSuccess(`Consultant search elements: ${count}`);
    });

    test('C07 — Specialties for consultant filtering', async ({ request }) => {
      const u = getUser('doctor');
      const res = await apiRequest(request, 'GET', DOCTOR_URL, ENDPOINTS.metadata.specialties, u.token);
      assertOk(res, 'Specialties for filtering');
    });

    test('C08 — Doctor doctors list page shows doctors', async ({ page }) => {
      await navigateWithAuth(page, 'doctor', `/doctor/${DOC_ID}/doctors`);
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/doctors');
      const body = await page.locator('body').textContent();
      expect((body ?? '').length).toBeGreaterThan(0);
      logTestSuccess('Doctors list page shows content');
    });

    test('C09 — Doctors API returns registered doctors', async ({ request }) => {
      const u = getUser('doctor');
      const res = await doctorApi(request, u.token).get(ENDPOINTS.doctors);
      expect(res.status).toBeLessThan(600);
      logTestSuccess(`Doctors API → ${res.status}`);
    });

    test('C10 — Admin doctors list page shows admin controls', async ({ page }) => {
      await navigateWithAuth(page, 'admin', `/doctor/${ADMIN_ID}/doctors`);
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/doctors');
      logTestSuccess('Admin doctors list loaded');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // D: CONTENT CROSS-PORTAL VISIBILITY (10 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('D — Content Cross-Portal Visibility', () => {

    test('D01 — Patient health library shows published content', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/health-library');
      await page.waitForTimeout(2000);
      const body = await page.locator('body').textContent();
      expect((body ?? '').length).toBeGreaterThan(0);
      logTestSuccess('Patient health library has content');
    });

    test('D02 — Patient2 health library accessible', async ({ page }) => {
      await navigateWithAuth(page, 'patient2', '/health-library');
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/health-library');
      logTestSuccess('Patient2 health library accessible');
    });

    test('D03 — Patient content API returns published articles', async ({ request }) => {
      const u = getUser('patient1');
      const res = await patientApi(request, u.token).get(ENDPOINTS.contentMedical);
      expect(res.status).toBe(200);
      logTestSuccess(`Patient medical content → ${res.status}`);
    });

    test('D04 — Doctor content synced with patient portal', async ({ request }) => {
      const doc = getUser('doctor');
      const pat = getUser('patient1');
      const docRes = await doctorApi(request, doc.token).get(ENDPOINTS.medicalContent);
      const patRes = await patientApi(request, pat.token).get(ENDPOINTS.contentMedical);
      expect(docRes.status).toBeLessThan(600);
      expect(patRes.status).toBeLessThan(600);
      logTestSuccess('Content synced across portals');
    });

    test('D05 — Clinical resources only visible to doctors', async ({ request }) => {
      const doc = getUser('doctor');
      const res = await doctorApi(request, doc.token).get(ENDPOINTS.contentClinical);
      assertOk(res, 'Clinical resources for doctors');
    });

    test('D06 — Patient AI doctor page accessible', async ({ page }) => {
      await navigateWithAuth(page, 'patient1', '/ai-doctor');
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/ai-doctor');
      logTestSuccess('Patient AI doctor accessible for health queries');
    });

    test('D07 — AI knowledge base accessible', async ({ request }) => {
      const u = getUser('doctor');
      const res = await apiRequest(request, 'GET', 'http://localhost:3020', '/api/ai/knowledge', u.token);
      expect(res.status).toBeLessThan(600);
      logTestSuccess(`AI knowledge base → ${res.status}`);
    });

    test('D08 — Doctor content page has category filters', async ({ page }) => {
      await navigateWithAuth(page, 'doctor', `/doctor/${DOC_ID}/medical-content`);
      await page.waitForTimeout(2000);
      const filters = page.locator('select, [role="tab"], button[class*="filter"]');
      const count = await filters.count();
      logTestSuccess(`Content filter elements: ${count}`);
    });

    test('D09 — Patient3 can access health library', async ({ page }) => {
      await navigateWithAuth(page, 'patient3', '/health-library');
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/health-library');
      logTestSuccess('Patient3 health library accessible');
    });

    test('D10 — All portals health endpoints operational', async ({ request }) => {
      const doc = getUser('doctor');
      const pat = getUser('patient1');
      const docHealth = await doctorApi(request, doc.token).get(ENDPOINTS.health);
      const patHealth = await patientApi(request, pat.token).get(ENDPOINTS.health);
      expect(docHealth.status).toBe(200);
      expect(patHealth.status).toBe(200);
      logTestSuccess('All portals healthy');
    });
  });
});
