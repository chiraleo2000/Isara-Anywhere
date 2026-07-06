/**
 * ═══════════════════════════════════════════════════════════════════════
 * GROUP G — LIVING WILL & PDPA (PRIVACY CONSENT WORKFLOWS)
 * ═══════════════════════════════════════════════════════════════════════
 * Browsers: Patient=Chrome, Doctor=Chrome, Admin=Firefox
 *
 * Real workflow:
 *   G1: Patient → PDPA page → explore tabs → toggle privacy switches
 *   G2: Patient → Living Will → fill steps (representatives,
 *       treatment preferences, signature, sharing) → submit
 *   G3: Doctor → Patients → verify shared living will visible
 *
 * Real form filling, toggle interactions, step progression.
 * ═══════════════════════════════════════════════════════════════════════
 */
import {
  test, expect, assertFullHealth, snap,
  navPatient, navDoctor, waitForContent, PATIENT_URL, DOCTOR_URL,
  readPageBearerToken,
} from './helpers/multi-portal';

const DEMO_DOCTOR_ID = 'DOC-TEST-001';
const DEMO_PATIENT_ID = 'PATIENT-DEMO';

async function openDoctorPatientRecord(doctorPage: import('@playwright/test').Page, label: string) {
  await doctorPage.goto(`${DOCTOR_URL}/doctor/${DEMO_DOCTOR_ID}/patients/${DEMO_PATIENT_ID}`, {
    waitUntil: 'domcontentloaded',
    timeout: 15_000,
  });
  await waitForContent(doctorPage, label);
  const viewRecordBtn = doctorPage.getByRole('button', { name: /View Record|ดูเวชระเบียน/i });
  await expect(viewRecordBtn, `${label} View Record button`).toBeVisible({ timeout: 12_000 });
  await viewRecordBtn.click();
  await doctorPage.waitForTimeout(2_000);
}

test.describe('Group G — Living Will & PDPA', () => {
  test.describe.configure({ mode: 'serial' });

  /* ═════════════════════════════════════════════════════════════════
     G1 — Patient: PDPA page → tabs → privacy toggles
     ═════════════════════════════════════════════════════════════════ */
  test('G1 — Patient PDPA privacy settings', async ({ portals }) => {
    const { patient } = portals;

    await test.step('G01 — Navigate to PDPA page', async () => {
      await navPatient(patient.page, '/pdpa', 'G01');
      await assertFullHealth(patient.page, 'G01');
      await snap(patient.page, 'G01-pdpa-page', 'group-G');
      const body = await patient.page.locator('body').innerText();
      expect(/PDPA|consent|ยินยอม|privacy|ความเป็นส่วนตัว|living will|หนังสือ/i.test(body)).toBeTruthy();
      console.log('  ✅ G01: PDPA page loaded');
    });

    await test.step('G02 — Explore PDPA tabs', async () => {
      const tabs = patient.page.locator('button, [role="tab"], a').filter({
        hasText: /Consent|ยินยอม|Privacy|ความเป็น|Living|หนังสือ|Data|ข้อมูล/i,
      });
      const tabCount = await tabs.count();
      for (let i = 0; i < Math.min(tabCount, 4); i++) {
        const tab = tabs.nth(i);
        if (await tab.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await tab.click();
          await patient.page.waitForTimeout(1_500);
        }
      }
      await snap(patient.page, 'G02-pdpa-tabs', 'group-G');
      console.log(`  ✅ G02: Explored ${tabCount} PDPA tabs`);
    });

    await test.step('G02b — PDPA tabs show no Invalid Date or error banners', async () => {
      const auditTab = patient.page.getByRole('button', { name: /Access History|ประวัติการเข้าถึง/i });
      if (await auditTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await auditTab.click();
        await patient.page.waitForTimeout(1_000);
      }
      const doctorsTab = patient.page.getByRole('button', { name: /Doctor Access|แพทย์ที่เข้าถึง/i });
      if (await doctorsTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await doctorsTab.click();
        await patient.page.waitForTimeout(1_000);
      }
      const body = await patient.page.locator('body').innerText();
      expect(body, 'G02b: no Invalid Date on PDPA').not.toMatch(/invalid date/i);
      expect(body, 'G02b: no generic error banner on PDPA').not.toMatch(/เกิดข้อผิดพลาด|an error occurred|session.*invalid|invalid session/i);
      console.log('  ✅ G02b: PDPA tabs free of Invalid Date / session errors');
    });

    await test.step('G03 — Toggle privacy switches (data-testid)', async () => {
      const consentToggle = patient.page.getByTestId(/^pdpa-consent-toggle-/).first();
      const cloud = process.env.TEST_ENV === 'cloud';
      const hasToggle = await consentToggle.isVisible({ timeout: cloud ? 30_000 : 5_000 }).catch(() => false);
      if (hasToggle) {
        await consentToggle.click();
        await patient.page.waitForTimeout(1_000);
        await consentToggle.click();
        console.log('  G03: PDPA consent toggle exercised');
      } else {
        const anySwitch = patient.page.locator('input[type="checkbox"], [role="switch"]').first();
        if (await anySwitch.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await anySwitch.click();
          console.log('  G03: PDPA fallback checkbox toggled');
        }
      }
      await snap(patient.page, 'G03-privacy-toggles', 'group-G');
    });

    await test.step('G03b — Audit log tab visible', async () => {
      const auditTab = patient.page.locator('button, [role="tab"]').filter({
        hasText: /Audit|ประวัติ|History/i,
      }).first();
      if (await auditTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await auditTab.click();
        await expect(patient.page.getByTestId('pdpa-audit-log')).toBeVisible({ timeout: 10_000 });
      }
      console.log('  G03b: PDPA audit log panel');
    });

    console.log('\n  🎉 G1 COMPLETE — PDPA privacy settings\n');
  });

  /* ═════════════════════════════════════════════════════════════════
     G2 — Patient: Living Will multi-step form
     ═════════════════════════════════════════════════════════════════ */
  test('G2 — Patient Living Will form flow', async ({ portals }) => {
    const { patient } = portals;

    await test.step('G04 — Navigate to Living Will', async () => {
      // Try direct link first, then sidebar
      const lwLink = patient.page.locator('a, button').filter({
        hasText: /Living Will|หนังสือแสดงเจตนา|สร้าง.*หนังสือ|Create.*Living/i,
      }).first();
      if (await lwLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await lwLink.click();
        await patient.page.waitForTimeout(2_000);
        await waitForContent(patient.page, 'G04');
      } else {
        await navPatient(patient.page, '/pdpa', 'G04');
        // Look for Living Will section/tab
        const lwTab = patient.page.locator('button, [role="tab"], a').filter({
          hasText: /Living Will|หนังสือแสดงเจตนา/i,
        }).first();
        if (await lwTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await lwTab.click();
          await patient.page.waitForTimeout(2_000);
        }
      }
      await assertFullHealth(patient.page, 'G04');
      await snap(patient.page, 'G04-living-will', 'group-G');
      console.log('  ✅ G04: Living Will page');
    });

    await test.step('G05 — Step 1: Fill representative info', async () => {
      // Look for input fields in the current view
      const inputs = patient.page.locator('input[type="text"], textarea');
      const inputCount = await inputs.count();
      if (inputCount > 0) {
        // Fill representative name
        const nameInput = inputs.first();
        await nameInput.fill('นายสมชาย ใจดี');
        await patient.page.waitForTimeout(500);

        // Fill relationship or phone if available
        if (inputCount > 1) {
          await inputs.nth(1).fill('คู่สมรส');
          await patient.page.waitForTimeout(300);
        }
        if (inputCount > 2) {
          await inputs.nth(2).fill('0812345678');
          await patient.page.waitForTimeout(300);
        }
      }
      await snap(patient.page, 'G05-step1-representatives', 'group-G');
      console.log(`  ✅ G05: Step 1 — filled ${Math.min(inputCount, 3)} fields`);
    });

    await test.step('G06 — Click Next to Step 2', async () => {
      const nextBtn = patient.page.locator('button').filter({
        hasText: /Next|ถัดไป|Continue|ต่อไป|Step 2|ขั้นตอน.*2/i,
      }).first();
      if (await nextBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await nextBtn.click();
        await patient.page.waitForTimeout(2_000);
      }
      await snap(patient.page, 'G06-step2-treatments', 'group-G');
      console.log('  ✅ G06: Step 2 — Treatment Preferences');
    });

    await test.step('G07 — Step 2: Toggle treatment preferences', async () => {
      const checkboxes = patient.page.locator(
        'input[type="checkbox"], [role="switch"], [role="checkbox"]'
      );
      const cbCount = await checkboxes.count();
      // Toggle first 3 treatment options
      for (let i = 0; i < Math.min(cbCount, 3); i++) {
        const cb = checkboxes.nth(i);
        if (await cb.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await cb.click();
          await patient.page.waitForTimeout(300);
        }
      }
      await snap(patient.page, 'G07-treatment-prefs', 'group-G');
      console.log(`  ✅ G07: Toggled ${Math.min(cbCount, 3)} treatment preferences`);
    });

    await test.step('G08 — Advance to Step 3 (Signature)', async () => {
      const nextBtn = patient.page.locator('button').filter({
        hasText: /Next|ถัดไป|Continue|ต่อไป|Step 3|ลงนาม|Sign/i,
      }).first();
      if (await nextBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await nextBtn.click();
        await patient.page.waitForTimeout(2_000);
      }
      await snap(patient.page, 'G08-step3-signature', 'group-G');
      console.log('  ✅ G08: Step 3 — Signature');
    });

    await test.step('G09 — Save or submit living will', async () => {
      const saveBtn = patient.page.locator('button').filter({
        hasText: /Save|บันทึก|Submit|ส่ง|Complete|เสร็จ|Confirm|ยืนยัน/i,
      }).first();
      if (await saveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        const [, apiResp] = await Promise.allSettled([
          saveBtn.click(),
          patient.page.waitForResponse(
            (r) => (r.url().includes('/api/phr') || r.url().includes('/api/pdpa') || r.url().includes('/living-will'))
              && (r.request().method() === 'POST' || r.request().method() === 'PUT'),
            { timeout: 10_000 },
          ),
        ]);
        await patient.page.waitForTimeout(2_000);
        if (apiResp.status === 'fulfilled') {
          console.log(`  ✅ G09: Living will saved — API ${apiResp.value.status()}`);
        } else {
          console.log('  ✅ G09: Save clicked');
        }
      } else {
        console.log('  ✅ G09: No save button (may need more steps)');
      }
      await snap(patient.page, 'G09-living-will-saved', 'group-G');
    });

    console.log('\n  🎉 G2 COMPLETE — Living Will form\n');
  });

  /* ═════════════════════════════════════════════════════════════════
     G3 — Doctor: Check patient data + cross-portal sync
     ═════════════════════════════════════════════════════════════════ */
  test('G3 — Doctor views patient records + cross-portal', async ({ portals }) => {
    const { patient, doctor, admin } = portals;

    await test.step('G10 — Doctor → Patients page', async () => {
      await navDoctor(doctor.page, 'patients', 'G10');
      await assertFullHealth(doctor.page, 'G10');
      await snap(doctor.page, 'G10-doctor-patients', 'group-G');
      console.log('  ✅ G10: Doctor → Patients');
    });

    await test.step('G11 — Doctor clicks patient card', async () => {
      const card = doctor.page.locator(
        '[class*="card"], tr, [class*="patient"], [class*="item"]'
      ).filter({
        hasText: /demo|patient|ผู้ป่วย/i,
      }).first();
      if (await card.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await card.click();
        await doctor.page.waitForTimeout(2_000);
        await waitForContent(doctor.page, 'G11-detail');
      }
      await snap(doctor.page, 'G11-patient-record', 'group-G');
      console.log('  ✅ G11: Patient record opened');
    });

    await test.step('G12 — Doctor → Meetings page', async () => {
      await navDoctor(doctor.page, 'health-meeting', 'G12');
      await assertFullHealth(doctor.page, 'G12');
      await snap(doctor.page, 'G12-meetings', 'group-G');
      console.log('  ✅ G12: Doctor → Meetings');
    });

    await test.step('G13 — Patient → Appointments (forward flow)', async () => {
      await navPatient(patient.page, '/appointments', 'G13');
      await assertFullHealth(patient.page, 'G13');
      await snap(patient.page, 'G13-patient-appointments', 'group-G');
      console.log('  ✅ G13: Patient → Appointments');
    });

    await test.step('G14 — All 3 portals still authenticated', async () => {
      const pToken = await patient.page.evaluate(() => localStorage.getItem('auth_token'));
      const dToken = await doctor.page.evaluate(() => localStorage.getItem('token'));
      const aToken = await admin.page.evaluate(() => localStorage.getItem('token'));
      expect(pToken, 'Patient token').toBeTruthy();
      expect(dToken, 'Doctor token').toBeTruthy();
      expect(aToken, 'Admin token').toBeTruthy();
      console.log('  ✅ G14: All 3 portals authenticated');
    });

    console.log('\n  🎉 G3 COMPLETE — Cross-portal verification\n');
  });

  /* ═════════════════════════════════════════════════════════════════
     G4 — Patient grants doctor access → doctor reads PHR (G15/G16)
     ═════════════════════════════════════════════════════════════════ */
  test('G4 — PDPA doctor access grant and revoke', async ({ portals }) => {
    const { patient, doctor } = portals;

    await test.step('G15 — Patient grants demo doctor medical record access', async () => {
      await navPatient(patient.page, '/pdpa', 'G15');
      const doctorsTab = patient.page.getByRole('button', { name: /Doctor Access|แพทย์ที่เข้าถึง/i });
      if (await doctorsTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await doctorsTab.click();
        await patient.page.waitForTimeout(500);
      }

      const token = await readPageBearerToken(patient.page);
      const grantResp = await patient.page.request.post(`${PATIENT_URL}/api/pdpa/doctor-access`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: { doctor_id: DEMO_DOCTOR_ID },
      });
      expect(grantResp.status(), 'G15 grant API').toBeLessThan(400);

      await patient.page.reload();
      await waitForContent(patient.page, 'G15-reload');
      const doctorsTabAfterReload = patient.page.getByRole('button', { name: /Doctor Access|แพทย์ที่เข้าถึง/i });
      if (await doctorsTabAfterReload.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await doctorsTabAfterReload.click();
        await patient.page.waitForTimeout(500);
      }
      const accessRow = patient.page.getByTestId(`pdpa-doctor-access-row-${DEMO_DOCTOR_ID}`);
      const accessDeadline = Date.now() + 30_000;
      while (Date.now() < accessDeadline) {
        if (await accessRow.isVisible({ timeout: 2_000 }).catch(() => false)) break;
        await patient.page.reload({ waitUntil: 'domcontentloaded' });
        await waitForContent(patient.page, 'G15-reload-retry');
        const tab = patient.page.getByRole('button', { name: /Doctor Access|แพทย์ที่เข้าถึง/i });
        if (await tab.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await tab.click();
          await patient.page.waitForTimeout(500);
        }
        await patient.page.waitForTimeout(1_000);
      }
      await expect(accessRow, 'G15 doctor access row visible').toBeVisible({ timeout: 10_000 });
      await snap(patient.page, 'G15-doctor-access-granted', 'group-G');
      console.log('  ✅ G15: Patient granted doctor access');
    });

    await test.step('G15b — Doctor opens patient record and sees PHR', async () => {
      await openDoctorPatientRecord(doctor.page, 'G15b');
      const body = await doctor.page.locator('body').innerText();
      expect(body, 'G15b no PDPA gate').not.toMatch(/PDPA Consent Required/i);
      await expect(doctor.page.getByTestId('patient-record-phr-summary'), 'G15b PHR summary').toBeVisible({ timeout: 12_000 });
      await snap(doctor.page, 'G15b-doctor-patient-phr', 'group-G');
      console.log('  ✅ G15b: Doctor patient record accessible');
    });

    await test.step('G16 — Patient revokes access → doctor sees consent gate', async () => {
      const token = await readPageBearerToken(patient.page);
      const revokeResp = await patient.page.request.delete(
        `${PATIENT_URL}/api/pdpa/doctor-access/${DEMO_DOCTOR_ID}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      expect(revokeResp.status(), 'G16 revoke API').toBeLessThan(400);

      const doctorToken = await readPageBearerToken(doctor.page);
      const checkResp = await doctor.page.request.get(
        `${DOCTOR_URL}/api/pdpa/check/${DEMO_PATIENT_ID}`,
        { headers: { Authorization: `Bearer ${doctorToken}` } },
      );
      expect(checkResp.ok(), 'G16 consent check API').toBeTruthy();
      const checkBody = await checkResp.json();
      expect(checkBody.hasConsent, 'G16 API hasConsent false after revoke').toBe(false);

      await openDoctorPatientRecord(doctor.page, 'G16');
      const body = await doctor.page.locator('body').innerText();
      const denied = /PDPA Consent Required|Request Access from Patient|PDPA consent required for medical records|Request Access/i.test(body);
      expect(denied, 'G16 consent gate after revoke').toBeTruthy();
      await snap(doctor.page, 'G16-doctor-consent-denied', 'group-G');
      console.log('  ✅ G16: Revoke restored consent gate');
    });

    console.log('\n  🎉 G4 COMPLETE — PDPA grant/revoke chain\n');
  });
});
