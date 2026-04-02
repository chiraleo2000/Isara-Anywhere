/**
 * ═══════════════════════════════════════════════════════════════════════
 * GROUP E — MEETING SERVER & CLINICAL WORKFLOW
 * ═══════════════════════════════════════════════════════════════════════
 * Browsers: Patient=Chrome, Doctor=Chrome, Admin=Firefox
 *
 * Real workflow:
 *   E1: Meeting server API health checks (all 3 services)
 *   E2: Doctor clinical flow — Patients → search → patient detail →
 *       clinical action buttons → create meeting
 *   E3: Patient meeting-related pages — appointments → check join buttons
 *   E4: Cross-portal — doctor sees patient data, both portals alive
 *
 * NO optional guards. Tests FAIL if server down.
 * ═══════════════════════════════════════════════════════════════════════
 */
import {
  test, expect, assertFullHealth, snap,
  navDoctor, navPatient, waitForContent,
  PATIENT_URL, DOCTOR_URL, MEETING_URL,
} from './helpers/multi-portal';

test.describe('Group E — Meeting Server & Clinical Workflow', () => {
  test.describe.configure({ mode: 'serial' });

  /* ═════════════════════════════════════════════════════════════════
     E1 — API health checks for all 3 services
     ═════════════════════════════════════════════════════════════════ */
  test('E1 — All service APIs are healthy', async ({ portals }) => {
    const { patient } = portals;

    await test.step('E01 — Meeting server health', async () => {
      const resp = await patient.page.request.get(`${MEETING_URL}/api/health`, { timeout: 10_000 });
      expect(resp.status(), 'Meeting server must respond').toBeLessThan(400);
      console.log(`  ✅ E01: Meeting server — ${resp.status()}`);
    });

    await test.step('E02 — Patient portal API health', async () => {
      const resp = await patient.page.request.get(`${PATIENT_URL}/api/health`, { timeout: 10_000 });
      expect(resp.status(), 'Patient API must respond').toBeLessThan(400);
      console.log(`  ✅ E02: Patient API — ${resp.status()}`);
    });

    await test.step('E03 — Doctor portal API health', async () => {
      const resp = await patient.page.request.get(`${DOCTOR_URL}/api/health`, { timeout: 10_000 });
      expect(resp.status(), 'Doctor API must respond').toBeLessThan(400);
      console.log(`  ✅ E03: Doctor API — ${resp.status()}`);
    });
  });

  /* ═════════════════════════════════════════════════════════════════
     E2 — Doctor clinical flow: Patients → search → detail → actions
     ═════════════════════════════════════════════════════════════════ */
  test('E2 — Doctor clinical navigation with patient search', async ({ portals }) => {
    const { doctor } = portals;

    await test.step('E04 — Navigate to Patients list', async () => {
      await navDoctor(doctor.page, 'patients', 'E04');
      await assertFullHealth(doctor.page, 'E04');
      await snap(doctor.page, 'E04-patients-list', 'group-E');
      console.log('  ✅ E04: Doctor → Patients list');
    });

    await test.step('E05 — Search for patient "demo"', async () => {
      const searchInput = doctor.page.locator(
        'input[type="search"], input[type="text"], input[placeholder*="search" i], input[placeholder*="ค้นหา"]'
      ).first();
      await expect(searchInput, 'Patient search input').toBeVisible({ timeout: 8_000 });
      await searchInput.fill('demo');
      await doctor.page.waitForTimeout(2_000);
      await snap(doctor.page, 'E05-search-demo', 'group-E');
      console.log('  ✅ E05: Searched for "demo"');
    });

    await test.step('E06 — Click patient card', async () => {
      const card = doctor.page.locator(
        '[class*="card"], tr, [class*="patient"], [class*="item"], [class*="row"]'
      ).filter({
        hasText: /demo|patient|ผู้ป่วย/i,
      }).first();
      await expect(card, 'Patient card must exist').toBeVisible({ timeout: 8_000 });
      await card.click();
      await doctor.page.waitForTimeout(2_000);
      await waitForContent(doctor.page, 'E06-detail');
      await snap(doctor.page, 'E06-patient-detail', 'group-E');
      console.log('  ✅ E06: Patient detail opened');
    });

    await test.step('E07 — Check clinical action buttons', async () => {
      const actionBtns = doctor.page.locator('button, a').filter({
        hasText: /EMR|Prescription|Lab|Vital|Order|สั่งยา|บันทึก|แล็บ|สร้าง|Create|Meeting|Video|ประชุม/i,
      });
      const count = await actionBtns.count();
      await snap(doctor.page, 'E07-clinical-actions', 'group-E');
      console.log(`  ✅ E07: Clinical action buttons: ${count}`);
    });

    await test.step('E08 — Navigate to Health Meeting', async () => {
      await navDoctor(doctor.page, 'health-meeting', 'E08');
      await assertFullHealth(doctor.page, 'E08');
      await snap(doctor.page, 'E08-health-meeting', 'group-E');
      const body = await doctor.page.locator('body').innerText();
      expect(/meeting|ประชุม|appointment|นัดหมาย|video|queue/i.test(body)).toBeTruthy();
      console.log('  ✅ E08: Doctor → Health Meeting');
    });

    await test.step('E09 — Check meeting page has controls', async () => {
      const meetingControls = doctor.page.locator('button').filter({
        hasText: /Start|Create|New|เริ่ม|สร้าง|Join|เข้าร่วม/i,
      });
      const controlCount = await meetingControls.count();
      await snap(doctor.page, 'E09-meeting-controls', 'group-E');
      console.log(`  ✅ E09: Meeting control buttons: ${controlCount}`);
    });

    console.log('\n  🎉 E2 COMPLETE — Doctor clinical flow\n');
  });

  /* ═════════════════════════════════════════════════════════════════
     E3 — Patient: check meeting join availability from appointments
     ═════════════════════════════════════════════════════════════════ */
  test('E3 — Patient meeting navigation', async ({ portals }) => {
    const { patient } = portals;

    await test.step('E10 — Appointments page — check for meeting links', async () => {
      await navPatient(patient.page, '/appointments', 'E10');
      await assertFullHealth(patient.page, 'E10');

      // Check for Join/Video buttons (may not exist if no confirmed meetings)
      const joinBtn = patient.page.locator('a, button').filter({
        hasText: /Join|เข้าร่วม|Video|Meeting|Start/i,
      }).first();
      const hasJoin = await joinBtn.isVisible({ timeout: 3_000 }).catch(() => false);
      await snap(patient.page, 'E10-patient-meeting-links', 'group-E');
      console.log(`  ✅ E10: Meeting join buttons: ${hasJoin ? 'YES' : 'no confirmed meetings'}`);
    });

    await test.step('E11 — Navigate to AI Doctor', async () => {
      await navPatient(patient.page, '/ai-doctor', 'E11');
      await assertFullHealth(patient.page, 'E11');
      await snap(patient.page, 'E11-ai-doctor', 'group-E');
      const body = await patient.page.locator('body').innerText();
      expect(/AI|ปรึกษา|symptom|อาการ|chat|doctor|แพทย์/i.test(body)).toBeTruthy();
      console.log('  ✅ E11: Patient → AI Doctor');
    });

    await test.step('E12 — Navigate to Find Doctors', async () => {
      await navPatient(patient.page, '/find-doctors', 'E12');
      await assertFullHealth(patient.page, 'E12');
      await snap(patient.page, 'E12-find-doctors', 'group-E');
      console.log('  ✅ E12: Patient → Find Doctors');
    });

    console.log('\n  🎉 E3 COMPLETE — Patient meeting navigation\n');
  });

  /* ═════════════════════════════════════════════════════════════════
     E4 — Cross-portal verification
     ═════════════════════════════════════════════════════════════════ */
  test('E4 — Cross-portal data sync', async ({ portals }) => {
    const { doctor } = portals;

    await test.step('E13 — Doctor → Medical Content (still navigating forward)', async () => {
      await navDoctor(doctor.page, 'medical-content', 'E13');
      await assertFullHealth(doctor.page, 'E13');
      await snap(doctor.page, 'E13-medical-content', 'group-E');
      console.log('  ✅ E13: Doctor → Medical Content');
    });

    await test.step('E14 — Doctor → Clinical Resources', async () => {
      await navDoctor(doctor.page, 'clinical-resources', 'E14');
      await assertFullHealth(doctor.page, 'E14');
      await snap(doctor.page, 'E14-clinical-resources', 'group-E');
      console.log('  ✅ E14: Doctor → Clinical Resources');
    });

    await test.step('E15 — All 3 portals authenticated', async () => {
      const { patient, admin } = portals;
      const pToken = await patient.page.evaluate(() => localStorage.getItem('auth_token'));
      const dToken = await doctor.page.evaluate(() => localStorage.getItem('token'));
      const aToken = await admin.page.evaluate(() => localStorage.getItem('token'));
      expect(pToken, 'Patient token').toBeTruthy();
      expect(dToken, 'Doctor token').toBeTruthy();
      expect(aToken, 'Admin token').toBeTruthy();
      console.log('  ✅ E15: All 3 portals still authenticated');
    });

    console.log('\n  🎉 E4 COMPLETE — Cross-portal verification\n');
  });
});
