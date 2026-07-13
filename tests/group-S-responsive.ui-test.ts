/**
 * GROUP S — Responsive layout (mobile / tablet / desktop projects in playwright.config.ts)
 */
import {
  test, expect, assertFullHealth, snap, navPatient,
  doctorHealthMeetingUrl, DOCTOR_URL, PATIENT_URL, refreshPatientSession,
  assertNotLogin, ensurePatientPortalAuthenticated,
} from './helpers/multi-portal';
import { assertNoHorizontalScroll, assertMainContentVisible } from './helpers/layout-assertions';

async function ensurePatientAuthed(page: import('@playwright/test').Page, label: string) {
  // Avoid bursty API login + goto on every S test — only full recover when already on auth shell.
  if (!/\/login|\/register/i.test(page.url())) {
    await refreshPatientSession(page);
    return;
  }
  await ensurePatientPortalAuthenticated(page, label);
  await refreshPatientSession(page);
  expect(page.url(), `${label}: must not be on login after session restore`).not.toMatch(/\/login|\/register/i);
}

test.describe('Group S — Responsive layout stability', () => {
  test('S01 — Patient dashboard layout', async ({ portals }) => {
    const { patient } = portals;
    await ensurePatientAuthed(patient.page, 'S01');
    await navPatient(patient.page, '/', 'S01');
    expect(patient.page.url(), 'S01 must stay on patient portal').toMatch(
      new RegExp(new URL(PATIENT_URL).host.replace(/\./g, '\\.')),
    );
    assertNotLogin(patient.page, 'S01');
    expect(patient.page.url()).not.toMatch(/\/login|\/register/i);
    await assertFullHealth(patient.page, 'S01-patient');
    await assertNoHorizontalScroll(patient.page);
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await assertMainContentVisible(patient.page);
        break;
      } catch (err) {
        if (attempt === 1) throw err;
        await ensurePatientAuthed(patient.page, 'S01-retry');
        await navPatient(patient.page, '/', 'S01-retry');
        expect(patient.page.url()).not.toMatch(/\/login|\/register/i);
      }
    }
    await snap(patient.page, 'S01-patient-dashboard', 'group-S');
  });

  test('S02 — Doctor dashboard layout', async ({ portals }) => {
    const { doctor } = portals;
    await assertFullHealth(doctor.page, 'S02-doctor');
    await assertNoHorizontalScroll(doctor.page);
    await assertMainContentVisible(doctor.page);
    await snap(doctor.page, 'S02-doctor-dashboard', 'group-S');
  });

  test('S03 — Patient deep routes (direct URL)', async ({ portals }) => {
    const { patient } = portals;
    for (const route of ['/phr', '/profile', '/settings', '/timeline']) {
      await ensurePatientAuthed(patient.page, `S03${route}`);
      await navPatient(patient.page, route, `S03${route}`);
      assertNotLogin(patient.page, `S03${route}`);
      expect(patient.page.url()).not.toMatch(/\/login|\/register/i);
      await assertFullHealth(patient.page, `S03${route}`);
      await assertNoHorizontalScroll(patient.page);
    }
    await snap(patient.page, 'S03-patient-deep-routes', 'group-S');
  });

  test('S04 — Doctor dashboard deep views', async ({ portals }) => {
    const { doctor } = portals;
    const doctorId = process.env.TEST_DOCTOR_ID || 'DOC-TEST-001';
    const views = ['schedule', 'patients', 'health-meeting', 'profile'];
    for (const view of views) {
      if (view === 'health-meeting') {
        await doctor.page.goto(doctorHealthMeetingUrl(doctorId), {
          waitUntil: 'domcontentloaded',
          timeout: 45_000,
        });
      } else {
        await doctor.page.evaluate((v) => {
          const w = globalThis as unknown as { __doctorNavigate?: (x: string) => void };
          if (typeof w.__doctorNavigate === 'function') w.__doctorNavigate(v);
        }, view).catch(() => {});
      }
      await doctor.page.waitForTimeout(500);
      await assertNoHorizontalScroll(doctor.page);
    }
    await assertFullHealth(doctor.page, 'S04-doctor');
    await assertMainContentVisible(doctor.page);
    await snap(doctor.page, 'S04-doctor-deep-views', 'group-S');
  });

  test('S05 — Patient appointments route', async ({ portals }) => {
    const { patient } = portals;
    await ensurePatientAuthed(patient.page, 'S05');
    await navPatient(patient.page, '/appointments', 'S05');
    expect(patient.page.url(), 'S05 must stay on patient portal').toMatch(
      new RegExp(new URL(PATIENT_URL).host.replace(/\./g, '\\.')),
    );
    assertNotLogin(patient.page, 'S05');
    expect(patient.page.url()).not.toMatch(/\/login|\/register/i);
    await assertFullHealth(patient.page, 'S05-appointments');
    await assertNoHorizontalScroll(patient.page);
    await assertMainContentVisible(patient.page);
    const body = await patient.page.locator('body').innerText();
    expect(/appointment|นัดหมาย|book|จอง/i.test(body)).toBeTruthy();
    await snap(patient.page, 'S05-patient-appointments', 'group-S');
  });

  test('S06 — Patient meeting join route', async ({ portals }) => {
    const { patient } = portals;
    await ensurePatientAuthed(patient.page, 'S06');
    await navPatient(patient.page, '/appointments', 'S06');
    const joinLink = patient.page.locator(
      'a[href*="/meeting/"], [data-testid="dashboard-join-meeting"], [data-testid="appointment-join-meeting"]',
    ).first();
    if (await joinLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const href = await joinLink.getAttribute('href');
      expect(href, 'S06: meeting join href').toBeTruthy();
      if (href?.startsWith('/meeting/')) {
        await navPatient(patient.page, href, 'S06-meeting');
        await assertNoHorizontalScroll(patient.page);
        await assertMainContentVisible(patient.page);
      }
    } else {
      await navPatient(patient.page, '/meeting/APT-S06', 'S06-fallback');
      await assertNoHorizontalScroll(patient.page);
    }
    await snap(patient.page, 'S06-patient-meeting-route', 'group-S');
  });

  test('S07 — Patient EMR / treatment results surface', async ({ portals }) => {
    const { patient } = portals;
    await ensurePatientAuthed(patient.page, 'S07');
    await navPatient(patient.page, '/', 'S07');
    await assertFullHealth(patient.page, 'S07-dashboard');
    const emrTab = patient.page.locator('button').filter({ hasText: /^EMR$|ผลการรักษา|Treatment|results/i }).first();
    if (await emrTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await emrTab.click();
      await patient.page.waitForTimeout(500);
    } else {
      await ensurePatientAuthed(patient.page, 'S07-phr');
      await navPatient(patient.page, '/phr', 'S07-phr');
    }
    if (/\/login|\/register/i.test(patient.page.url())) {
      await ensurePatientAuthed(patient.page, 'S07-reauth');
      await navPatient(patient.page, '/phr', 'S07-phr-retry');
    }
    expect(patient.page.url()).not.toMatch(/\/login|\/register/i);
    await assertNoHorizontalScroll(patient.page);
    if (!/\/meeting\//.test(patient.page.url())) {
      await assertMainContentVisible(patient.page);
    }
    const body = await patient.page.locator('body').innerText();
    expect(/EMR|ผลการรักษา|health|สุขภาพ|vital|medication/i.test(body)).toBeTruthy();
    await snap(patient.page, 'S07-patient-emr-surface', 'group-S');
  });

  test('S08 — Patient in-call meeting route (responsive)', async ({ portals }) => {
    const { patient } = portals;
    await ensurePatientAuthed(patient.page, 'S08');
    await navPatient(patient.page, '/meeting/APT-S06', 'S08-meeting');
    if (/\/login|\/register/i.test(patient.page.url())) {
      await ensurePatientAuthed(patient.page, 'S08-reauth');
      await navPatient(patient.page, '/meeting/APT-S06', 'S08-meeting-retry');
    }
    await assertNoHorizontalScroll(patient.page);
    // Meeting shell may render lobby/consent without a long main landmark on phone-xs.
    const hasMain = await patient.page
      .locator('[data-testid="main-content"], main, [role="main"]')
      .first()
      .isVisible({ timeout: 8_000 })
      .catch(() => false);
    if (hasMain) {
      await assertMainContentVisible(patient.page);
    }
    const body = await patient.page.locator('body').innerText();
    expect(patient.page.url()).not.toMatch(/\/login|\/register/i);
    expect(/meeting|ประชุม|consent|รอแพทย์|waiting|join/i.test(body)).toBeTruthy();
    await snap(patient.page, 'S08-patient-meeting-in-call', 'group-S');
  });
});
