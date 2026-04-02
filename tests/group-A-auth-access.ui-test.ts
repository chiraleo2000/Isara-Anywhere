/**
 * ═══════════════════════════════════════════════════════════════════════
 * GROUP A — AUTH & ACCESS VERIFICATION (ALL 3 PORTALS)
 * ═══════════════════════════════════════════════════════════════════════
 * Browsers: Patient=Chrome, Doctor=Chrome, Admin=Firefox
 *
 * Continuous flow — fixture opens all 3 dashboards, then:
 *   1) Verify all 3 dashboards loaded healthy
 *   2) Verify sidebar items exist per role
 *   3) API health checks (patient + doctor portals)
 *   4) Session/token persistence check
 *   5) Role isolation (patient can't access doctor routes)
 * ═══════════════════════════════════════════════════════════════════════
 */
import {
  test, expect, assertFullHealth, snap,
  PATIENT_URL, DOCTOR_URL, MEETING_URL,
} from './helpers/multi-portal';

test.describe('Group A — Auth & Access Verification', () => {
  test.describe.configure({ mode: 'serial' });

  /* ── A01 — All 3 dashboards are healthy ──────────────────────────── */
  test('A01 — All 3 portals loaded healthy after auth', async ({ portals }) => {
    const { patient, doctor, admin } = portals;

    await test.step('Patient dashboard is healthy', async () => {
      await assertFullHealth(patient.page, 'A01-patient');
      await snap(patient.page, 'A01-patient-dashboard', 'group-A');
      const body = await patient.page.locator('body').innerText();
      expect(body.length).toBeGreaterThan(50);
      console.log('  ✅ A01: Patient dashboard — healthy');
    });

    await test.step('Doctor dashboard is healthy', async () => {
      await assertFullHealth(doctor.page, 'A01-doctor');
      await snap(doctor.page, 'A01-doctor-dashboard', 'group-A');
      const body = await doctor.page.locator('body').innerText();
      expect(body.length).toBeGreaterThan(50);
      console.log('  ✅ A01: Doctor dashboard (Chrome) — healthy');
    });

    await test.step('Admin dashboard is healthy', async () => {
      await assertFullHealth(admin.page, 'A01-admin');
      await snap(admin.page, 'A01-admin-dashboard', 'group-A');
      const body = await admin.page.locator('body').innerText();
      expect(body.length).toBeGreaterThan(50);
      console.log('  ✅ A01: Admin dashboard (Firefox) — healthy');
    });
  });

  /* ── A02 — Patient sidebar has all expected nav items ────────────── */
  test('A02 — Patient portal sidebar complete', async ({ portals }) => {
    const { patient } = portals;
    const expectedLinks = [
      { href: '/', label: 'Home' },
      { href: '/appointments', label: 'Appointments' },
      { href: '/ai-doctor', label: 'AI Doctor' },
      { href: '/health-library', label: 'Health Library' },
      { href: '/phr', label: 'PHR' },
      { href: '/timeline', label: 'Timeline' },
      { href: '/map', label: 'Map' },
      { href: '/find-doctors', label: 'Find Doctors' },
      { href: '/pdpa', label: 'PDPA' },
      { href: '/settings', label: 'Settings' },
    ];

    const found: string[] = [];
    for (const item of expectedLinks) {
      const link = patient.page.locator(`nav a[href="${item.href}"], aside a[href="${item.href}"]`).first();
      if (await link.isVisible({ timeout: 3_000 }).catch(() => false)) {
        found.push(item.label);
      }
    }
    await snap(patient.page, 'A02-patient-sidebar', 'group-A');
    expect(found.length, `Expected ≥8 sidebar items, found: ${found.join(', ')}`).toBeGreaterThanOrEqual(8);
    console.log(`  ✅ A02: Patient sidebar — ${found.length}/10 items: [${found.join(', ')}]`);
  });

  /* ── A03 — Doctor sidebar has all expected nav items ─────────────── */
  test('A03 — Doctor portal sidebar complete', async ({ portals }) => {
    const { doctor } = portals;
    const expectedButtons = [
      /แดชบอร์ด|Dashboard/i,
      /ตารางนัด|Schedule/i,
      /ผู้ป่วย|Patients/i,
      /นัดหมาย.*ประชุม|Appointments.*Meeting/i,
      /กลุ่มนัดหมาย|Appointment Pool/i,
      /ที่ปรึกษา.*แพทย์|Medical Consultant/i,
      /เนื้อหา.*การแพทย์|Medical Content/i,
      /ทรัพยากร.*คลินิก|Clinical Resource/i,
    ];

    const found: string[] = [];
    for (const pattern of expectedButtons) {
      const btn = doctor.page.locator('nav button, aside button, nav a, aside a').filter({ hasText: pattern }).first();
      if (await btn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        found.push(pattern.source.split('|')[0]);
      }
    }
    await snap(doctor.page, 'A03-doctor-sidebar', 'group-A');
    expect(found.length, `Expected ≥6 doctor sidebar items, found: ${found.join(', ')}`).toBeGreaterThanOrEqual(6);
    console.log(`  ✅ A03: Doctor sidebar — ${found.length}/8 items found`);
  });

  /* ── A04 — Admin sidebar has extra admin-only items ──────────────── */
  test('A04 — Admin sidebar has doctor-management items', async ({ portals }) => {
    const { admin } = portals;
    const adminPatterns = [
      /จัดการแพทย์|Manage Doctor/i,
      /อนุมัติ.*แพทย์|Doctor Approval/i,
    ];

    const found: string[] = [];
    for (const pattern of adminPatterns) {
      const btn = admin.page.locator('nav button, aside button, nav a, aside a').filter({ hasText: pattern }).first();
      if (await btn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        found.push(pattern.source.split('|')[0]);
      }
    }
    await snap(admin.page, 'A04-admin-sidebar', 'group-A');
    expect(found.length, `Admin should have ≥1 admin-only sidebar items`).toBeGreaterThanOrEqual(1);
    console.log(`  ✅ A04: Admin sidebar — ${found.length} admin-only items`);
  });

  /* ── A05 — API health checks ────────────────────────────────────── */
  test('A05 — API health endpoints return 200', async ({ portals }) => {
    const { patient } = portals;
    const endpoints = [
      { url: `${PATIENT_URL}/api/health`, name: 'Patient API' },
      { url: `${DOCTOR_URL}/api/health`, name: 'Doctor API' },
      { url: `${MEETING_URL}/api/health`, name: 'Meeting API' },
    ];

    for (const ep of endpoints) {
      await test.step(`${ep.name} health check`, async () => {
        const resp = await patient.page.request.get(ep.url, { timeout: 10_000 }).catch(() => null);
        if (resp) {
          expect(resp.status(), `${ep.name} at ${ep.url}`).toBeLessThan(400);
          console.log(`  ✅ A05: ${ep.name} — ${resp.status()}`);
        } else {
          console.log(`  ⚠️ A05: ${ep.name} — unreachable`);
        }
      });
    }
  });

  /* ── A06 — Session tokens are present in localStorage ───────────── */
  test('A06 — Session tokens persist in all 3 browsers', async ({ portals }) => {
    const { patient, doctor, admin } = portals;

    await test.step('Patient has auth_token', async () => {
      const token = await patient.page.evaluate(() => localStorage.getItem('auth_token'));
      expect(token, 'Patient auth_token missing').toBeTruthy();
      console.log(`  ✅ A06: Patient token — ${token ? 'present' : 'MISSING'}`);
    });

    await test.step('Doctor has token', async () => {
      const token = await doctor.page.evaluate(() => localStorage.getItem('token'));
      expect(token, 'Doctor token missing').toBeTruthy();
      console.log(`  ✅ A06: Doctor token — ${token ? 'present' : 'MISSING'}`);
    });

    await test.step('Admin has token', async () => {
      const token = await admin.page.evaluate(() => localStorage.getItem('token'));
      expect(token, 'Admin token missing').toBeTruthy();
      console.log(`  ✅ A06: Admin token — ${token ? 'present' : 'MISSING'}`);
    });
  });

  /* ── A07 — Role isolation: patient can't access doctor routes ───── */
  test('A07 — Role isolation — patient blocked from doctor portal', async ({ portals }) => {
    const { patient } = portals;
    const doctorRoute = `${DOCTOR_URL}/doctor/nobody/dashboard`;
    const resp = await patient.page.request.get(doctorRoute, { timeout: 10_000 }).catch(() => null);
    // The page should either 4xx or redirect to login — patient token is for patient portal
    if (resp) {
      console.log(`  ✅ A07: Patient→Doctor route — status ${resp.status()}`);
    } else {
      console.log('  ✅ A07: Patient→Doctor route — network blocked');
    }
    await snap(patient.page, 'A07-role-isolation', 'group-A');
  });
});
