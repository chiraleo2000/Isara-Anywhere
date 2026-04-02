const fs = require('fs');

const groupI = `/**
 * GROUP I - ADMIN MANAGEMENT, USERS & NOTIFICATIONS
 * REAL USER FLOW - Admin manages doctor approvals, views user lists.
 * Doctor checks profile. Patient checks notifications and profile.
 * Flow: Admin: Dashboard -> Doctors -> Approve Queue -> Pool -> Schedule -> Profile
 *       Doctor: Dashboard -> Profile -> Meetings -> Patients
 *       Patient: Dashboard -> Profile -> Settings -> Appointments
 * Browsers: Patient=Chrome, Doctor=Chrome, Admin=Firefox
 */
import { test, expect, assertNotLogin, assertFullHealth, snap, navPatient, navDoctor } from './helpers/multi-portal';

test.describe('Group I - Admin, Users & Notifications', () => {
  test.describe.configure({ mode: 'serial' });

  test('I01 - Admin portal dashboard loads', async ({ portals }) => {
    const { admin } = portals;
    await assertFullHealth(admin.page, 'I01-admin-dashboard');
    await snap(admin.page, 'I01-admin-dashboard', 'group-I');
    const body = await admin.page.locator('body').innerText();
    expect(/dashboard|admin|manage|doctor/i.test(body)).toBeTruthy();
    console.log('  I01: Admin dashboard loaded');
  });

  test('I02 - Admin navigates to Doctor Management', async ({ portals }) => {
    const { admin } = portals;
    await navDoctor(admin.page, 'doctors', 'I02-doctors');
    await assertFullHealth(admin.page, 'I02-doctors');
    await snap(admin.page, 'I02-doctor-management', 'group-I');
    const body = await admin.page.locator('body').innerText();
    expect(/Doctor|Manage|Approval|Registration/i.test(body)).toBeTruthy();
    console.log('  I02: Admin -> Doctor Management');
  });

  test('I03 - Admin views approval queue', async ({ portals }) => {
    const { admin } = portals;
    const approvalTab = admin.page.locator('button, [role="tab"], a').filter({ hasText: /Pending|Approval|Queue|Review/i }).first();
    if (await approvalTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await approvalTab.click();
      await admin.page.waitForTimeout(2000);
    }
    await snap(admin.page, 'I03-approval-queue', 'group-I');
    assertNotLogin(admin.page, 'I03');
    console.log('  I03: Admin viewed approval queue');
  });

  test('I04 - Admin navigates to Appointment Pool', async ({ portals }) => {
    const { admin } = portals;
    await navDoctor(admin.page, 'pool', 'I04-pool');
    await assertFullHealth(admin.page, 'I04-pool');
    await snap(admin.page, 'I04-appointment-pool', 'group-I');
    console.log('  I04: Admin -> Appointment Pool');
  });

  test('I05 - Admin navigates Pool -> Schedule', async ({ portals }) => {
    const { admin } = portals;
    await navDoctor(admin.page, 'schedule', 'I05-schedule');
    await assertFullHealth(admin.page, 'I05-schedule');
    await snap(admin.page, 'I05-schedule', 'group-I');
    console.log('  I05: Admin -> Schedule page');
  });

  test('I06 - Admin navigates Schedule -> Profile', async ({ portals }) => {
    const { admin } = portals;
    await navDoctor(admin.page, 'profile', 'I06-profile');
    await assertFullHealth(admin.page, 'I06-profile');
    await snap(admin.page, 'I06-admin-profile', 'group-I');
    const body = await admin.page.locator('body').innerText();
    expect(/Profile|Name|Email|Role/i.test(body)).toBeTruthy();
    console.log('  I06: Admin -> Profile page');
  });

  test('I07 - Doctor navigates Dashboard -> Profile', async ({ portals }) => {
    const { doctor } = portals;
    await assertFullHealth(doctor.page, 'I07-dash');
    await snap(doctor.page, 'I07-doctor-dashboard', 'group-I');
    await navDoctor(doctor.page, 'profile', 'I07-profile');
    await assertFullHealth(doctor.page, 'I07-profile');
    await snap(doctor.page, 'I07-doctor-profile', 'group-I');
    const body = await doctor.page.locator('body').innerText();
    expect(/Profile|specialty|name|qualification/i.test(body)).toBeTruthy();
    console.log('  I07: Doctor -> Profile page');
  });

  test('I08 - Doctor navigates Profile -> Meetings', async ({ portals }) => {
    const { doctor } = portals;
    await navDoctor(doctor.page, 'meetings', 'I08-meetings');
    await assertFullHealth(doctor.page, 'I08-meetings');
    await snap(doctor.page, 'I08-meetings-page', 'group-I');
    console.log('  I08: Doctor -> Meetings page');
  });

  test('I09 - Doctor navigates Meetings -> Patients', async ({ portals }) => {
    const { doctor } = portals;
    await navDoctor(doctor.page, 'patients', 'I09-patients');
    await assertFullHealth(doctor.page, 'I09-patients');
    await snap(doctor.page, 'I09-patients-page', 'group-I');
    console.log('  I09: Doctor -> Patients page');
  });

  test('I10 - Patient navigates Dashboard -> Profile', async ({ portals }) => {
    const { patient } = portals;
    await assertFullHealth(patient.page, 'I10-dash');
    await snap(patient.page, 'I10-patient-dashboard', 'group-I');
    await navPatient(patient.page, '/profile', 'I10-profile');
    await assertFullHealth(patient.page, 'I10-profile');
    await snap(patient.page, 'I10-patient-profile', 'group-I');
    console.log('  I10: Patient -> Profile page');
  });

  test('I11 - Patient navigates Profile -> Settings', async ({ portals }) => {
    const { patient } = portals;
    await navPatient(patient.page, '/settings', 'I11-settings');
    await assertFullHealth(patient.page, 'I11-settings');
    await snap(patient.page, 'I11-settings-page', 'group-I');
    const body = await patient.page.locator('body').innerText();
    expect(/Setting|Language|Theme|Notification/i.test(body)).toBeTruthy();
    console.log('  I11: Patient -> Settings page');
  });

  test('I12 - Patient navigates Settings -> Appointments', async ({ portals }) => {
    const { patient } = portals;
    await navPatient(patient.page, '/appointments', 'I12-appt');
    await assertFullHealth(patient.page, 'I12-appt');
    await snap(patient.page, 'I12-appointments', 'group-I');
    const body = await patient.page.locator('body').innerText();
    expect(/Appointment|Schedule|Book|History/i.test(body)).toBeTruthy();
    console.log('  I12: Patient -> Appointments page');
  });

  test('I13 - Cross-portal all 3 portals authenticated', async ({ portals }) => {
    const { patient, doctor, admin } = portals;
    await assertFullHealth(patient.page, 'I13-patient');
    await assertFullHealth(doctor.page, 'I13-doctor');
    await assertFullHealth(admin.page, 'I13-admin');
    await snap(patient.page, 'I13-patient-final', 'group-I');
    await snap(doctor.page, 'I13-doctor-final', 'group-I');
    await snap(admin.page, 'I13-admin-final', 'group-I');
    console.log('  I13: All 3 portals authenticated');
  });
});
`;

const groupJ = `/**
 * GROUP J - AI DOCTOR, TIMELINE, MAP & CROSS-PORTAL
 * REAL USER FLOW - Patient navigates through AI Doctor chat, Timeline, Map,
 * Book Appointment, PHR, Appointments. Doctor navigates multiple pages.
 * Flow: Patient: Dashboard -> AI Doctor -> type msg -> Timeline -> Map
 *       -> Book Appointment -> PHR -> Appointments
 *       Doctor: Dashboard -> Schedule -> Pool -> Content -> Profile
 * Browsers: Patient=Chrome, Doctor=Chrome, Admin=Firefox
 */
import { test, expect, assertNotLogin, assertFullHealth, snap, navPatient, navDoctor } from './helpers/multi-portal';

test.describe('Group J - AI Doctor, Timeline, Map & Cross-Portal', () => {
  test.describe.configure({ mode: 'serial' });

  test('J01 - Patient navigates Dashboard -> AI Doctor', async ({ portals }) => {
    const { patient } = portals;
    await assertFullHealth(patient.page, 'J01-dashboard');
    await snap(patient.page, 'J01-patient-dashboard', 'group-J');
    await navPatient(patient.page, '/ai-doctor', 'J01-ai');
    await assertFullHealth(patient.page, 'J01-ai');
    await snap(patient.page, 'J01-ai-doctor', 'group-J');
    const body = await patient.page.locator('body').innerText();
    expect(/AI|doctor|chat|symptom|ask/i.test(body)).toBeTruthy();
    console.log('  J01: Dashboard -> AI Doctor page');
  });

  test('J02 - Patient types symptom in AI Doctor chat', async ({ portals }) => {
    const { patient } = portals;
    const chatInput = patient.page.locator('input[placeholder*="symptom" i], input[placeholder*="message" i], input[placeholder*="type" i], textarea').first();
    const fallbackInput = patient.page.locator('input[type="text"], textarea').first();
    const target = await chatInput.isVisible({ timeout: 5000 }).catch(() => false) ? chatInput : fallbackInput;
    if (await target.isVisible({ timeout: 5000 }).catch(() => false)) {
      await target.fill('headache and fever');
      await patient.page.waitForTimeout(1000);
      await snap(patient.page, 'J02-ai-typed', 'group-J');
      const sendBtn = patient.page.locator('button[type="submit"], button').filter({ hasText: /Send|Ask|Submit/i }).first();
      if (await sendBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await sendBtn.click();
        await patient.page.waitForTimeout(3000);
        await snap(patient.page, 'J02-ai-response', 'group-J');
      }
      console.log('  J02: AI Doctor chat message sent');
    } else {
      console.log('  J02: No chat input found (page checked)');
      await snap(patient.page, 'J02-no-input', 'group-J');
    }
    assertNotLogin(patient.page, 'J02');
  });

  test('J03 - Patient navigates AI Doctor -> Timeline', async ({ portals }) => {
    const { patient } = portals;
    await navPatient(patient.page, '/timeline', 'J03-timeline');
    await assertFullHealth(patient.page, 'J03-timeline');
    await snap(patient.page, 'J03-timeline', 'group-J');
    const body = await patient.page.locator('body').innerText();
    expect(/Timeline|History|Event|Record/i.test(body)).toBeTruthy();
    console.log('  J03: AI Doctor -> Timeline page');
  });

  test('J04 - Patient explores Timeline filters', async ({ portals }) => {
    const { patient } = portals;
    const filters = patient.page.locator('button, select, [role="tab"]').filter({ hasText: /Filter|All|Type|Date|Lab|Vital|Appointment/i });
    const count = await filters.count().catch(() => 0);
    if (count > 0) {
      for (let i = 0; i < Math.min(count, 3); i++) {
        const f = filters.nth(i);
        if (await f.isVisible({ timeout: 2000 }).catch(() => false)) {
          await f.click();
          await patient.page.waitForTimeout(1500);
        }
      }
      await snap(patient.page, 'J04-timeline-filtered', 'group-J');
    } else {
      await snap(patient.page, 'J04-timeline-no-filters', 'group-J');
    }
    assertNotLogin(patient.page, 'J04');
    console.log('  J04: Timeline filters explored (' + count + ' found)');
  });

  test('J05 - Patient navigates Timeline -> Map', async ({ portals }) => {
    const { patient } = portals;
    await navPatient(patient.page, '/map', 'J05-map');
    await assertFullHealth(patient.page, 'J05-map');
    await snap(patient.page, 'J05-map-page', 'group-J');
    const body = await patient.page.locator('body').innerText();
    expect(/Map|Hospital|Nearby|Facility|Pharmacy/i.test(body)).toBeTruthy();
    console.log('  J05: Timeline -> Map page');
  });

  test('J06 - Patient searches facilities on Map', async ({ portals }) => {
    const { patient } = portals;
    const searchInput = patient.page.locator('input[type="search"], input[type="text"], input[placeholder*="search" i]').first();
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('hospital');
      await patient.page.waitForTimeout(2000);
      await snap(patient.page, 'J06-map-searched', 'group-J');
    } else {
      const filterBtns = patient.page.locator('button').filter({ hasText: /Hospital|Clinic|Pharmacy|Filter/i });
      if (await filterBtns.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await filterBtns.first().click();
        await patient.page.waitForTimeout(2000);
        await snap(patient.page, 'J06-map-filtered', 'group-J');
      } else {
        await snap(patient.page, 'J06-map-no-search', 'group-J');
      }
    }
    assertNotLogin(patient.page, 'J06');
    console.log('  J06: Map search/filter interaction');
  });

  test('J07 - Patient navigates Map -> Book Appointment', async ({ portals }) => {
    const { patient } = portals;
    await navPatient(patient.page, '/book-appointment', 'J07-book');
    await assertFullHealth(patient.page, 'J07-book');
    await snap(patient.page, 'J07-book-appointment', 'group-J');
    const body = await patient.page.locator('body').innerText();
    expect(/Book|Appointment|Doctor|Specialty/i.test(body)).toBeTruthy();
    console.log('  J07: Map -> Book Appointment');
  });

  test('J08 - Patient explores booking specialty selection', async ({ portals }) => {
    const { patient } = portals;
    const specialtyCards = patient.page.locator('[class*="card"], button, [class*="specialty"]').filter({ hasText: /General|Internal|Pediatric|Cardio|Derma|specialty/i });
    const count = await specialtyCards.count().catch(() => 0);
    if (count > 0) {
      await specialtyCards.first().click();
      await patient.page.waitForTimeout(2000);
      await snap(patient.page, 'J08-specialty-selected', 'group-J');
    } else {
      await snap(patient.page, 'J08-no-specialty-cards', 'group-J');
    }
    assertNotLogin(patient.page, 'J08');
    console.log('  J08: Booking specialties explored (' + count + ' found)');
  });

  test('J09 - Patient navigates Book Appointment -> PHR', async ({ portals }) => {
    const { patient } = portals;
    await navPatient(patient.page, '/phr', 'J09-phr');
    await assertFullHealth(patient.page, 'J09-phr');
    await snap(patient.page, 'J09-phr-page', 'group-J');
    console.log('  J09: Book Appointment -> PHR');
  });

  test('J10 - Patient navigates PHR -> Appointments', async ({ portals }) => {
    const { patient } = portals;
    await navPatient(patient.page, '/appointments', 'J10-appt');
    await assertFullHealth(patient.page, 'J10-appt');
    await snap(patient.page, 'J10-appointments', 'group-J');
    console.log('  J10: PHR -> Appointments');
  });

  test('J11 - Doctor navigates Dashboard -> Schedule', async ({ portals }) => {
    const { doctor } = portals;
    await assertFullHealth(doctor.page, 'J11-dash');
    await snap(doctor.page, 'J11-doctor-dashboard', 'group-J');
    await navDoctor(doctor.page, 'schedule', 'J11-schedule');
    await assertFullHealth(doctor.page, 'J11-schedule');
    await snap(doctor.page, 'J11-schedule', 'group-J');
    console.log('  J11: Doctor -> Schedule page');
  });

  test('J12 - Doctor navigates Schedule -> Pool', async ({ portals }) => {
    const { doctor } = portals;
    await navDoctor(doctor.page, 'pool', 'J12-pool');
    await assertFullHealth(doctor.page, 'J12-pool');
    await snap(doctor.page, 'J12-pool', 'group-J');
    console.log('  J12: Doctor -> Appointment Pool');
  });

  test('J13 - Doctor navigates Pool -> Content', async ({ portals }) => {
    const { doctor } = portals;
    await navDoctor(doctor.page, 'content', 'J13-content');
    await assertFullHealth(doctor.page, 'J13-content');
    await snap(doctor.page, 'J13-content', 'group-J');
    console.log('  J13: Doctor -> Content page');
  });

  test('J14 - Doctor navigates Content -> Profile', async ({ portals }) => {
    const { doctor } = portals;
    await navDoctor(doctor.page, 'profile', 'J14-profile');
    await assertFullHealth(doctor.page, 'J14-profile');
    await snap(doctor.page, 'J14-doctor-profile', 'group-J');
    console.log('  J14: Doctor -> Profile page');
  });

  test('J15 - Cross-portal all portals final check', async ({ portals }) => {
    const { patient, doctor, admin } = portals;
    await assertFullHealth(patient.page, 'J15-patient');
    await assertFullHealth(doctor.page, 'J15-doctor');
    await assertFullHealth(admin.page, 'J15-admin');
    await snap(patient.page, 'J15-patient-final', 'group-J');
    await snap(doctor.page, 'J15-doctor-final', 'group-J');
    await snap(admin.page, 'J15-admin-final', 'group-J');
    console.log('  J15: All portals alive - full journey complete');
  });
});
`;

fs.writeFileSync('tests/group-I-admin-users-notifications.ui-test.ts', groupI, 'utf8');
fs.writeFileSync('tests/group-J-ai-timeline-map.ui-test.ts', groupJ, 'utf8');
console.log('Files written successfully');
