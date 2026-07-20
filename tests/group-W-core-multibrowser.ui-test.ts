/**
 * GROUP W — Core multi-browser workflow (Chromium / Firefox / WebKit)
 *
 * Covers canonical paths from Processes/FULL_WORKFLOW_CONTRACT.md:
 *   Login & dashboards → Appointments → Virtual meetings → EMR editor → Gemini AI Studio
 *
 * Runs inside Docker via: npm run test:e2e:docker:core-multibrowser
 * Set PW_CORE_BROWSER=chromium|firefox|webkit (one engine per Playwright project).
 * Success screenshots: tests/output/screenshots/{browser}/group-W/
 */
import type { Page } from '@playwright/test';
import {
  test,
  expect,
  assertFullHealth,
  snapSuccess,
  resolveScreenshotBrowser,
  navPatient,
  navDoctor,
  waitForContent,
  requirePatientAuth,
  ensurePatientPortalAuthenticated,
  ensureDoctorPortalAuthenticated,
  PATIENT_URL,
  DOCTOR_URL,
  MEETING_URL,
} from './helpers/multi-portal';

const IS_CLOUD = process.env.TEST_ENV === 'cloud';
const API_TIMEOUT = IS_CLOUD ? 30_000 : 12_000;
const WORKFLOW = 'group-W';

let workflowAppointmentId = '';

async function openGeminiStudio(doctorPage: Page): Promise<void> {
  const studioHeading = doctorPage.getByTestId('gemini-ai-studio');
  if (await studioHeading.isVisible({ timeout: 2_000 }).catch(() => false)) return;

  await doctorPage.keyboard.press('Escape').catch(() => {});
  await expect(doctorPage.locator('div.fixed.inset-0.bg-black\\/50')).toHaveCount(0, { timeout: 10_000 });
  const fab = doctorPage.getByTitle('AI Assistant');
  await expect(fab).toBeVisible({ timeout: 20_000 });
  try {
    await fab.click({ force: true, timeout: 12_000 });
  } catch {
    await fab.evaluate((el: HTMLElement) => el.click());
  }
  await expect(studioHeading).toBeVisible({ timeout: 15_000 });
}

async function createPoolAppointmentViaApi(patientPage: Page, doctorId: string): Promise<string> {
  const sessionPatientId = await patientPage.evaluate(() => {
    try {
      const raw =
        localStorage.getItem('izara_current_user')
        || localStorage.getItem('izara_user')
        || localStorage.getItem('currentUser')
        || '';
      if (!raw) return 'PATIENT-DEMO';
      const parsed = JSON.parse(raw);
      return parsed?.id || 'PATIENT-DEMO';
    } catch {
      return 'PATIENT-DEMO';
    }
  });

  const now = new Date();
  const requestedDate = now.toISOString().split('T')[0];
  const slot = new Date(now.getTime() - 10 * 60 * 1000);
  const requestedTime = `${String(slot.getHours()).padStart(2, '0')}:${String(slot.getMinutes()).padStart(2, '0')}`;

  const token = await patientPage.evaluate(() => localStorage.getItem('auth_token') || '');
  const resp = await patientPage.request.post(`${PATIENT_URL}/api/appointments`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: {
      patientId: sessionPatientId,
      doctorId,
      appointmentType: 'Telehealth',
      requestedDate,
      requestedTime,
      confirmedDate: requestedDate,
      confirmedTime: requestedTime,
      reason: 'Group W core workflow E2E',
      symptomDescription: 'Headache and fever (Group W)',
      urgency: 'normal',
      status: 'confirmed',
    },
    timeout: API_TIMEOUT,
  });
  expect(resp.ok(), 'Patient must create appointment via API').toBeTruthy();
  const created = await resp.json();
  const id = created?.id || created?.appointment?.id;
  expect(id, 'Appointment id required').toBeTruthy();
  return id as string;
}

test.describe('Group W — Core multi-browser workflow', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    const engine = resolveScreenshotBrowser();
    console.log(`\n🌐 Group W running with PW_CORE_BROWSER=${engine}\n`);
  });

  test('W01 — Auth dashboards healthy (patient, doctor, admin)', async ({ portals }) => {
    const { patient, doctor, admin } = portals;

    await test.step('Patient dashboard', async () => {
      await ensurePatientPortalAuthenticated(patient.page, 'W01-patient');
      await assertFullHealth(patient.page, 'W01-patient');
      await expect(patient.page.locator('body')).not.toBeEmpty();
      await snapSuccess(patient.page, 'W01-patient-dashboard', WORKFLOW);
    });

    await test.step('Doctor dashboard', async () => {
      await ensureDoctorPortalAuthenticated(doctor.page, 'W01-doctor');
      await assertFullHealth(doctor.page, 'W01-doctor');
      await expect(doctor.page.locator('body')).not.toBeEmpty();
      await snapSuccess(doctor.page, 'W01-doctor-dashboard', WORKFLOW);
    });

    await test.step('Admin dashboard', async () => {
      await ensureDoctorPortalAuthenticated(admin.page, 'W01-admin');
      await assertFullHealth(admin.page, 'W01-admin');
      await expect(admin.page.locator('body')).not.toBeEmpty();
      await snapSuccess(admin.page, 'W01-admin-dashboard', WORKFLOW);
    });
  });

  test('W02 — Patient appointments list and booking', async ({ portals }) => {
    const { patient, doctor } = portals;

    await test.step('Appointments list loads', async () => {
      await ensurePatientPortalAuthenticated(patient.page, 'W02');
      await navPatient(patient.page, '/appointments', 'W02');
      await assertFullHealth(patient.page, 'W02');
      await expect(patient.page.locator('body')).toContainText(/appointment|นัดหมาย/i, {
        timeout: 15_000,
      });
      await snapSuccess(patient.page, 'W02-appointments-list', WORKFLOW);
    });

    await test.step('Create pool appointment', async () => {
      workflowAppointmentId = await createPoolAppointmentViaApi(patient.page, doctor.userId);
      await navPatient(patient.page, '/appointments', 'W02-after-book');
      await waitForContent(patient.page, 'W02-booked', 10_000);
      await assertFullHealth(patient.page, 'W02-booked');
      await snapSuccess(patient.page, 'W02-appointment-created', WORKFLOW);
      console.log(`  ✅ W02: appointment ${workflowAppointmentId}`);
    });
  });

  test('W03 — Doctor dashboards (health meeting + appointment pool)', async ({ portals }) => {
    const { doctor } = portals;

    await test.step('Health meeting queue page', async () => {
      await navDoctor(doctor.page, 'health-meeting', 'W03-meeting');
      const pageRoot = doctor.page.getByTestId('health-meeting-page');
      if (!(await pageRoot.isVisible({ timeout: 5_000 }).catch(() => false))) {
        await doctor.page.goto(
          `${DOCTOR_URL}/doctor/${doctor.userId}/health-meeting`,
          { waitUntil: 'domcontentloaded', timeout: 30_000 },
        );
      }
      await waitForContent(doctor.page, 'W03-meeting', 10_000);
      await assertFullHealth(doctor.page, 'W03-meeting');
      await expect(doctor.page.getByTestId('health-meeting-page')).toBeVisible({ timeout: 15_000 });
      await snapSuccess(doctor.page, 'W03-health-meeting', WORKFLOW);
    });

    await test.step('Appointment pool', async () => {
      await navDoctor(doctor.page, 'appointment-pool', 'W03-pool');
      await assertFullHealth(doctor.page, 'W03-pool');
      const body = doctor.page.locator('body');
      await expect(body).toContainText(/pool|กลุ่มนัด|appointment/i, { timeout: 15_000 });
      await snapSuccess(doctor.page, 'W03-appointment-pool', WORKFLOW);
    });
  });

  test('W04 — Virtual meeting routes resolve for doctor and patient', async ({ portals }) => {
    const { doctor, patient } = portals;
    expect(workflowAppointmentId, 'W02 must create appointment').toBeTruthy();

    let meetingId = '';

    await test.step('Create meeting via meeting-server API', async () => {
      const token = await doctor.page.evaluate(() => localStorage.getItem('token') || '');
      const resp = await doctor.page.request.post(`${MEETING_URL}/api/meetings/create`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: {
          appointmentId: workflowAppointmentId,
          patientId: 'PATIENT-DEMO',
          doctorId: doctor.userId,
          doctorName: 'Dr. Test Good',
          patientName: 'Demo Test Patient',
        },
        timeout: API_TIMEOUT,
      });
      expect(resp.ok(), 'Meeting server create must succeed').toBeTruthy();
      const body = await resp.json();
      meetingId = body?.meetingId || body?.id || body?.meeting?.id || '';
      expect(meetingId, 'Meeting id required').toBeTruthy();
      console.log(`  ✅ W04: meeting ${meetingId}`);
    });

    await test.step('Doctor meeting room route', async () => {
      const url = `${DOCTOR_URL}/doctor/${doctor.userId}/meeting/${workflowAppointmentId}`;
      await doctor.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await waitForContent(doctor.page, 'W04-doctor-meeting', 12_000);
      await assertFullHealth(doctor.page, 'W04-doctor-meeting');
      await expect(doctor.page.getByTestId('doctor-meeting-room')).toBeVisible({ timeout: 20_000 });
      await snapSuccess(doctor.page, 'W04-doctor-meeting-room', WORKFLOW);
    });

    await test.step('Patient meeting route', async () => {
      const { userId: patientUserId } = await requirePatientAuth(patient.page, 'W04');
      const url = `${PATIENT_URL}/patient/${patientUserId}/meeting/${workflowAppointmentId}`;
      await patient.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await waitForContent(patient.page, 'W04-patient-meeting', 12_000);
      await assertFullHealth(patient.page, 'W04-patient-meeting');
      await expect(patient.page.getByTestId('patient-meeting-room')).toBeVisible({ timeout: 20_000 });
      const meetingShell = patient.page.locator(
        '[data-testid="meeting-agreement"], [data-testid="meeting-auth-starting"], [data-testid="meeting-loading"], [data-testid="lobby-starting-screen"], [data-testid="lobby-waiting-screen"], [data-testid="host-waiting-screen"], [data-testid="pre-join-screen"], [data-testid="jitsi-meeting-container"]',
      ).first();
      await expect(meetingShell).toBeVisible({ timeout: 25_000 });
      await snapSuccess(patient.page, 'W04-patient-meeting-room', WORKFLOW);
      // Leave meeting shells so Firefox can close contexts cleanly between serial tests.
      await doctor.page.goto(`${DOCTOR_URL}/doctor/${doctor.userId}/dashboard`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      }).catch(() => {});
      await patient.page.goto(PATIENT_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
    });
  });

  test('W05 — EMR editor opens with autosave status', async ({ portals }) => {
    const { doctor } = portals;

    await test.step('Open patient detail', async () => {
      await doctor.page.goto(
        `${DOCTOR_URL}/doctor/${doctor.userId}/patients/PATIENT-DEMO`,
        { waitUntil: 'domcontentloaded', timeout: 30_000 },
      );
      await waitForContent(doctor.page, 'W05-detail', 10_000);
      await assertFullHealth(doctor.page, 'W05-detail');
      await expect(doctor.page.getByRole('button', { name: /Create EMR|สร้าง EMR|สร้างบันทึก/i }).first())
        .toBeVisible({ timeout: 15_000 });
      await snapSuccess(doctor.page, 'W05-patient-detail', WORKFLOW);
    });

    await test.step('Open EMR editor modal', async () => {
      const createEmrBtn = doctor.page.getByRole('button', { name: /Create EMR|สร้าง EMR|สร้างบันทึก/i }).first();
      await expect(createEmrBtn).toBeVisible({ timeout: 15_000 });
      try {
        await createEmrBtn.click({ force: true, timeout: 12_000 });
      } catch {
        await createEmrBtn.evaluate((el: HTMLElement) => el.click());
      }
      await expect(doctor.page.getByTestId('emr-autosave-status')).toBeVisible({ timeout: 20_000 });
      await snapSuccess(doctor.page, 'W05-emr-editor', WORKFLOW);
    });
  });

  test('W06 — Gemini AI Studio loads with API Connected', async ({ portals }) => {
    const { doctor } = portals;

    await test.step('Open Gemini AI Studio from FAB', async () => {
      await ensureDoctorPortalAuthenticated(doctor.page, 'W06-dashboard');
      await doctor.page.goto(
        `${DOCTOR_URL}/doctor/${doctor.userId}/dashboard`,
        { waitUntil: 'domcontentloaded', timeout: 30_000 },
      );
      await ensureDoctorPortalAuthenticated(doctor.page, 'W06-dashboard');
      await waitForContent(doctor.page, 'W06-dashboard', 10_000);
      await expect(doctor.page.getByTestId('emr-autosave-status')).toBeHidden({ timeout: 10_000 });
      await assertFullHealth(doctor.page, 'W06');
      await openGeminiStudio(doctor.page);
      await expect(doctor.page.getByTestId('gemini-ai-studio')).toBeVisible({ timeout: 15_000 });
      await snapSuccess(doctor.page, 'W06-gemini-studio-open', WORKFLOW);
    });

    await test.step('Verify API Connected badge', async () => {
      await expect(doctor.page.getByText('API Connected')).toBeVisible({ timeout: 25_000 });
      await snapSuccess(doctor.page, 'W06-gemini-api-connected', WORKFLOW);
    });
  });
});
