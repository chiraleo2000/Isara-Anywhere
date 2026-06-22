/**
 * ═══════════════════════════════════════════════════════════════════════
 * GROUP B — PATIENT PORTAL CONTINUOUS FLOW
 * ═══════════════════════════════════════════════════════════════════════
 * Browsers: Patient=Chrome, Doctor=Chrome, Admin=Firefox
 *
 * ONE CONTINUOUS TEST — patient navigates through ALL sidebar pages
 * sequentially via sidebar clicks. NEVER goes back to home/dashboard.
 *
 * Flow: Dashboard → Appointments → AI Doctor → Health Library →
 *       PHR → Timeline → Map → Find Doctors → PDPA → Settings → Profile
 *
 * Each step: click sidebar link → wait 2s → assertFullHealth → screenshot
 * ═══════════════════════════════════════════════════════════════════════
 */
import {
  test, expect, assertFullHealth, snap, navPatient,
  refreshPatientSession, waitForContent, PATIENT_URL,
} from './helpers/multi-portal';

test.describe('Group B — Patient Portal Continuous Flow', () => {

  test('B — Patient navigates ALL pages via sidebar (continuous)', async ({ portals }) => {
    const { patient } = portals;

    /* B01 — Dashboard (already loaded by fixture) */
    await test.step('B01 — Dashboard loaded', async () => {
      await refreshPatientSession(patient.page);
      await patient.page.goto(`${PATIENT_URL}/`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await waitForContent(patient.page, 'B01', 8_000);
      await assertFullHealth(patient.page, 'B01-dashboard');
      await snap(patient.page, 'B01-dashboard', 'group-B');
      const body = await patient.page.locator('body').innerText();
      expect(/dashboard|หน้าหลัก|welcome|สวัสดี|appointment|นัดหมาย/i.test(body)).toBeTruthy();
      console.log('  ✅ B01: Dashboard loaded');
    });

    /* B02 — Dashboard → Appointments */
    await test.step('B02 — Dashboard → Appointments', async () => {
      await navPatient(patient.page, '/appointments', 'B02');
      await assertFullHealth(patient.page, 'B02');
      await snap(patient.page, 'B02-appointments', 'group-B');
      const body = await patient.page.locator('body').innerText();
      expect(/appointment|นัดหมาย|book|จอง|schedule|ตาราง/i.test(body)).toBeTruthy();
      console.log('  ✅ B02: Appointments page');
    });

    /* B03 — Appointments → AI Doctor */
    await test.step('B03 — Appointments → AI Doctor', async () => {
      await navPatient(patient.page, '/ai-doctor', 'B03');
      await assertFullHealth(patient.page, 'B03');
      await snap(patient.page, 'B03-ai-doctor', 'group-B');
      const body = await patient.page.locator('body').innerText();
      expect(/AI|ปรึกษา|symptom|อาการ|chat|doctor|แพทย์/i.test(body)).toBeTruthy();
      console.log('  ✅ B03: AI Doctor page');
    });

    /* B04 — AI Doctor → Health Library */
    await test.step('B04 — AI Doctor → Health Library', async () => {
      await navPatient(patient.page, '/health-library', 'B04');
      await assertFullHealth(patient.page, 'B04');
      await snap(patient.page, 'B04-health-library', 'group-B');
      const body = await patient.page.locator('body').innerText();
      expect(/library|คลังความรู้|health|สุขภาพ|article|บทความ|category/i.test(body)).toBeTruthy();
      console.log('  ✅ B04: Health Library page');
    });

    /* B05 — Health Library → PHR */
    await test.step('B05 — Health Library → PHR', async () => {
      await navPatient(patient.page, '/phr', 'B05');
      await assertFullHealth(patient.page, 'B05');
      await snap(patient.page, 'B05-phr', 'group-B');
      const body = await patient.page.locator('body').innerText();
      expect(/health record|ระเบียนสุขภาพ|PHR|vital|allergy|medication|ภาพรวม/i.test(body)).toBeTruthy();
      console.log('  ✅ B05: PHR page');
    });

    /* B06 — PHR → Timeline */
    await test.step('B06 — PHR → Timeline', async () => {
      await navPatient(patient.page, '/timeline', 'B06');
      await assertFullHealth(patient.page, 'B06');
      await snap(patient.page, 'B06-timeline', 'group-B');
      const body = await patient.page.locator('body').innerText();
      expect(/timeline|เส้นทาง|history|ประวัติ|health|สุขภาพ/i.test(body)).toBeTruthy();
      console.log('  ✅ B06: Timeline page');
    });

    /* B07 — Timeline → Map */
    await test.step('B07 — Timeline → Hospital Map', async () => {
      await navPatient(patient.page, '/map', 'B07');
      await assertFullHealth(patient.page, 'B07');
      await snap(patient.page, 'B07-map', 'group-B');
      const body = await patient.page.locator('body').innerText();
      expect(/map|แผนที่|hospital|โรงพยาบาล|clinic|สถานพยาบาล|location/i.test(body)).toBeTruthy();
      console.log('  ✅ B07: Hospital Map page');
    });

    /* B08 — Map → Find Doctors */
    await test.step('B08 — Map → Find Doctors', async () => {
      await navPatient(patient.page, '/find-doctors', 'B08');
      await assertFullHealth(patient.page, 'B08');
      await snap(patient.page, 'B08-find-doctors', 'group-B');
      const body = await patient.page.locator('body').innerText();
      expect(/doctor|แพทย์|search|ค้นหา|specialty|ความเชี่ยวชาญ|find/i.test(body)).toBeTruthy();
      console.log('  ✅ B08: Find Doctors page');
    });

    /* B09 — Find Doctors → PDPA */
    await test.step('B09 — Find Doctors → PDPA & Living Will', async () => {
      await navPatient(patient.page, '/pdpa', 'B09');
      await assertFullHealth(patient.page, 'B09');
      await snap(patient.page, 'B09-pdpa', 'group-B');
      const body = await patient.page.locator('body').innerText();
      expect(/PDPA|consent|ยินยอม|living will|หนังสือแสดงเจตนา|privacy|ความเป็นส่วนตัว/i.test(body)).toBeTruthy();
      console.log('  ✅ B09: PDPA & Living Will page');
    });

    /* B10 — PDPA → Settings */
    await test.step('B10 — PDPA → Settings', async () => {
      await navPatient(patient.page, '/settings', 'B10');
      await assertFullHealth(patient.page, 'B10');
      await snap(patient.page, 'B10-settings', 'group-B');
      const body = await patient.page.locator('body').innerText();
      expect(/setting|ตั้งค่า|language|ภาษา|theme|notification|profile/i.test(body)).toBeTruthy();
      console.log('  ✅ B10: Settings page');
    });

    /* B11 — Settings → Profile */
    await test.step('B11 — Settings → Profile', async () => {
      await navPatient(patient.page, '/profile', 'B11');
      await assertFullHealth(patient.page, 'B11');
      await snap(patient.page, 'B11-profile', 'group-B');
      const body = await patient.page.locator('body').innerText();
      expect(/profile|โปรไฟล์|name|ชื่อ|email|phone/i.test(body)).toBeTruthy();
      console.log('  ✅ B11: Profile page');
    });

    console.log('\n  🎉 GROUP B COMPLETE — Patient navigated 11 pages continuously\n');
  });
});
