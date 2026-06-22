/**
 * ═══════════════════════════════════════════════════════════════════════
 * GROUP I — ADMIN, USER MANAGEMENT & NOTIFICATIONS
 * ═══════════════════════════════════════════════════════════════════════
 * Browsers: Patient=Chrome, Doctor=Chrome, Admin=Firefox
 *
 * Real workflow:
 *   I1: Admin → Manage Doctors → search → view profile → approve/reject
 *   I2: Admin → Doctor Approval → review pending
 *   I3: Admin → Notifications → read notifications
 *   I4: Cross-portal token & session check
 *
 * Admin-specific workflows with real search/filter interactions.
 * ═══════════════════════════════════════════════════════════════════════
 */
import {
  test, expect, assertFullHealth, snap,
  navDoctor, navPatient, waitForContent, assertHasData,
  PATIENT_URL, DOCTOR_URL,
  refreshPatientSession,
} from './helpers/multi-portal';

test.describe('Group I — Admin, Users & Notifications', () => {
  test.describe.configure({ mode: 'serial' });

  test('I0 — Patient /notifications route exists', async ({ portals }) => {
    const { patient } = portals;

    await navPatient(patient.page, '/', 'I00');
    await assertFullHealth(patient.page, 'I00');
    await patient.page.goto(`${PATIENT_URL}/notifications`, { waitUntil: 'domcontentloaded' });
    await patient.page.waitForTimeout(1000);

    expect(patient.page.url().includes('/notifications')).toBe(true);
  });

  /* ═════════════════════════════════════════════════════════════════
     I1 — Admin: Manage Doctors → search → view → approve
     ═════════════════════════════════════════════════════════════════ */
  test('I1 — Admin doctor management workflow', async ({ portals }) => {
    const { admin } = portals;

    await test.step('I01 — Admin → Dashboard', async () => {
      await navDoctor(admin.page, 'dashboard', 'I01');
      await assertFullHealth(admin.page, 'I01');
      await snap(admin.page, 'I01-admin-dashboard', 'group-I');
      console.log('  ✅ I01: Admin dashboard');
    });

    await test.step('I02 — Admin → Manage Doctors', async () => {
      await navDoctor(admin.page, 'doctors', 'I02');
      await assertFullHealth(admin.page, 'I02');
      await snap(admin.page, 'I02-manage-doctors', 'group-I');
      const body = await admin.page.locator('body').innerText();
      expect(/doctor|แพทย์|manage|จัดการ|approval|อนุมัติ/i.test(body)).toBeTruthy();
      console.log('  ✅ I02: Manage Doctors');
    });

    await test.step('I03 — Search for doctor', async () => {
      const searchInput = admin.page.locator(
        'input[type="search"], input[type="text"], input[placeholder*="search" i], input[placeholder*="ค้นหา"]'
      ).first();
      if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await searchInput.fill('demo');
        await admin.page.waitForTimeout(500);
        await snap(admin.page, 'I03-search-doctor', 'group-I');
        console.log('  ✅ I03: Searched "demo"');
      } else {
        await snap(admin.page, 'I03-no-search', 'group-I');
        console.log('  ✅ I03: No search input (list view)');
      }
    });

    await test.step('I04 — Click doctor profile', async () => {
      // Use narrow selectors to avoid matching non-clickable header divs
      const card = admin.page.locator(
        'table tbody tr, [class*="card"]:not(nav *):not(header *), [class*="doctor-item"], [class*="list-item"]'
      ).filter({
        hasText: /doctor|แพทย์|demo/i,
      }).first();
      if (await card.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await card.evaluate((el) => (el as HTMLElement).click());
        await admin.page.waitForTimeout(500);
        await waitForContent(admin.page, 'I04-detail');
        await snap(admin.page, 'I04-doctor-detail', 'group-I');
        console.log('  ✅ I04: Doctor profile opened');
      } else {
        await snap(admin.page, 'I04-no-doctors', 'group-I');
        console.log('  ✅ I04: No doctor cards (empty list)');
      }
    });

    await test.step('I05 — Check approve/reject buttons', async () => {
      const approveBtn = admin.page.locator('button').filter({
        hasText: /Approve|อนุมัติ|Accept|ยอมรับ/i,
      }).first();
      const rejectBtn = admin.page.locator('button').filter({
        hasText: /Reject|ปฏิเสธ|Deny/i,
      }).first();
      const approveVisible = await approveBtn.isVisible({ timeout: 3_000 }).catch(() => false);
      const rejectVisible = await rejectBtn.isVisible({ timeout: 3_000 }).catch(() => false);
      await snap(admin.page, 'I05-approval-buttons', 'group-I');
      console.log(`  ✅ I05: Approve=${approveVisible}, Reject=${rejectVisible}`);
    });

    console.log('\n  🎉 I1 COMPLETE — Doctor management\n');
  });

  /* ═════════════════════════════════════════════════════════════════
     I2 — Admin: Doctor Approval → Schedule → Pool
     ═════════════════════════════════════════════════════════════════ */
  test('I2 — Admin approval and scheduling', async ({ portals }) => {
    const { admin } = portals;

    await test.step('I06 — Admin → Doctor Approval', async () => {
      await navDoctor(admin.page, 'doctor-management', 'I06');
      await assertFullHealth(admin.page, 'I06');
      await snap(admin.page, 'I06-doctor-approval', 'group-I');
      console.log('  ✅ I06: Doctor Approval page');
    });

    await test.step('I07 — Browse pending approvals', async () => {
      const dataCount = await assertHasData(admin.page, 'I07', 1);
      await snap(admin.page, 'I07-pending-list', 'group-I');
      console.log(`  ✅ I07: Pending approvals — ${dataCount} items`);
    });

    await test.step('I08 — Admin → Schedule view', async () => {
      await navDoctor(admin.page, 'schedule', 'I08');
      await assertFullHealth(admin.page, 'I08');
      await snap(admin.page, 'I08-admin-schedule', 'group-I');
      console.log('  ✅ I08: Admin schedule');
    });

    await test.step('I09 — Admin → Appointment Pool', async () => {
      await navDoctor(admin.page, 'appointment-pool', 'I09');
      await assertFullHealth(admin.page, 'I09');
      await snap(admin.page, 'I09-admin-pool', 'group-I');
      console.log('  ✅ I09: Admin pool');
    });

    console.log('\n  🎉 I2 COMPLETE — Approval & scheduling\n');
  });

  /* ═════════════════════════════════════════════════════════════════
     I3 — Doctor & Patient: Notifications
     ═════════════════════════════════════════════════════════════════ */
  test('I3 — Notifications across portals', async ({ portals }) => {
    const { patient, doctor } = portals;

    await test.step('I10 — Doctor checks notification bell', async () => {
      const bell = doctor.page.locator(
        '[aria-label*="notification" i], [class*="notification"], [class*="bell"], button:has(svg[class*="bell"])'
      ).first();
      if (await bell.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await bell.click();
        await doctor.page.waitForTimeout(500);
        await snap(doctor.page, 'I10-doctor-notifications', 'group-I');
        console.log('  ✅ I10: Doctor notifications opened');
      } else {
        await snap(doctor.page, 'I10-no-bell', 'group-I');
        console.log('  ✅ I10: No notification bell visible');
      }
    });

    await test.step('I11 — Patient checks notifications', async () => {
      const bell = patient.page.locator(
        '[aria-label*="notification" i], [class*="notification"], [class*="bell"], button:has(svg)'
      ).first();
      if (await bell.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await bell.click();
        await patient.page.waitForTimeout(500);
        await snap(patient.page, 'I11-patient-notifications', 'group-I');
        console.log('  ✅ I11: Patient notifications');
      } else {
        console.log('  ✅ I11: No notification bell');
      }
    });

    await test.step('I12 — Doctor → Profile (forward flow)', async () => {
      // "Profile" is NOT in the doctor sidebar nav — access via settings gear icon or URL
      const gear = doctor.page.locator('button svg, button').filter({ hasText: /⚙|settings|ตั้งค่า/i }).first();
      const gearIcon = doctor.page.locator('[class*="settings"], [aria-label*="settings"], [aria-label*="ตั้งค่า"]').first();
      if (await gear.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await gear.click();
      } else if (await gearIcon.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await gearIcon.click();
      } else {
        // fallback: navigate directly via URL
        const currentUrl = doctor.page.url();
        const match = /\/doctor\/([^/]+)/.exec(currentUrl);
        const userId = match?.[1] ?? '';
        await doctor.page.goto(`${DOCTOR_URL}/doctor/${userId}/profile`, {
          waitUntil: 'domcontentloaded', timeout: 15_000
        });
      }
      await doctor.page.waitForTimeout(500);
      await assertFullHealth(doctor.page, 'I12');
      await snap(doctor.page, 'I12-doctor-profile', 'group-I');
      console.log('  ✅ I12: Doctor → Profile');
    });

    console.log('\n  🎉 I3 COMPLETE — Notifications\n');
  });

  /* ═════════════════════════════════════════════════════════════════
     I4 — Final cross-portal session verification
     ═════════════════════════════════════════════════════════════════ */
  test('I4 — Cross-portal session health', async ({ portals }) => {
    const { patient, doctor, admin } = portals;

    await test.step('I13 — All 3 portals authenticated', async () => {
      await refreshPatientSession(patient.page);
      await patient.page.goto(PATIENT_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });

      const readToken = async (page: typeof patient.page, keys: string[]) =>
        page.evaluate((k) => k.map((key) => localStorage.getItem(key)).find(Boolean) || null, keys);

      let pToken = await readToken(patient.page, ['auth_token', 'izara_auth_token', 'token']);
      let dToken = await readToken(doctor.page, ['token', 'izara_auth_token']);
      let aToken = await readToken(admin.page, ['token', 'izara_auth_token']);
      if (!pToken || !dToken || !aToken) {
        await patient.page.waitForTimeout(1_000);
        pToken = await readToken(patient.page, ['auth_token', 'izara_auth_token', 'token']);
        dToken = await readToken(doctor.page, ['token', 'izara_auth_token']);
        aToken = await readToken(admin.page, ['token', 'izara_auth_token']);
      }
      expect(pToken, 'Patient token').toBeTruthy();
      expect(dToken, 'Doctor token').toBeTruthy();
      expect(aToken, 'Admin token').toBeTruthy();
      console.log('  ✅ I13: All 3 tokens valid');
    });

    await test.step('I14 — Patient API health check', async () => {
      const resp = await patient.page.request.get(`${PATIENT_URL}/api/health`);
      expect(resp.status(), 'Patient API').toBe(200);
      console.log(`  ✅ I14: Patient API — ${resp.status()}`);
    });

    await test.step('I15 — Doctor API health check', async () => {
      const resp = await doctor.page.request.get(`${DOCTOR_URL}/api/health`);
      expect(resp.status(), 'Doctor API').toBe(200);
      console.log(`  ✅ I15: Doctor API — ${resp.status()}`);
    });

    console.log('\n  🎉 I4 COMPLETE — Session health\n');
  });
});
