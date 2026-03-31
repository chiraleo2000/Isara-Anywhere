/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — DOCTOR PORTAL COMPLETE E2E TESTS v1.4.8
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Comprehensive coverage of ALL Doctor Portal pages, features, and workflows.
 * 21 Doctor Portal pages × deep feature testing = 100+ tests
 *
 * Coverage:
 *   01_Login_Page, 02_Reset_Password, 03_Dashboard, 04_Schedule
 *   05_Patient_Management, 06_Health_Meeting, 07_Virtual_Meeting
 *   08_EMR_Editor, 09_Prescribing, 10_Lab_Orders
 *   11_Patient_Record_Viewer, 12_Medical_Consultants, 13_Medical_Content
 *   14_Clinical_Resources, 15_Gemini_AI_Studio, 16_Doctor_Profile
 *   17_Admin_Appointment_Mgmt, 18_Admin_Doctor_Mgmt
 *   19_Doctors_Management, 20_Appointment_Pool, 21_Queue_Management
 *
 * Updated: February 15, 2026
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { test, expect, APIRequestContext } from '@playwright/test';
import {
  PATIENT_URL, DOCTOR_URL, MEETING_SERVER_URL,
  CREDENTIALS, IS_CLOUD,
} from '../lib/test-config';

const TIMEOUT = IS_CLOUD ? 30_000 : 15_000;
const P1 = CREDENTIALS.patient1;
const DOC = CREDENTIALS.doctor;
const ADM = CREDENTIALS.admin;

async function loginDoctor(request: APIRequestContext, email: string, password: string) {
  for (const path of ['/auth/login', '/api/auth/login']) {
    try {
      const r = await request.post(`${DOCTOR_URL}${path}`, {
        data: { email, password },
        headers: { 'Content-Type': 'application/json' },
        timeout: TIMEOUT,
      });
      if (r.status() === 200) {
        const d = await r.json();
        return { token: d.token || d.accessToken || d.data?.token || '', user: d.user || d.data?.user || {} };
      }
    } catch { /* try next */ }
  }
  throw new Error('Doctor login failed');
}

async function loginPatient(request: APIRequestContext, email: string, password: string) {
  const r = await request.post(`${PATIENT_URL}/api/auth/login`, {
    data: { email, password },
    headers: { 'Content-Type': 'application/json' },
    timeout: TIMEOUT,
  });
  expect(r.status()).toBe(200);
  const d = await r.json();
  return { token: d.token || d.accessToken || '', user: d.user || d.data?.user || {} };
}

function AH(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DP-A: DOCTOR AUTH & LOGIN (8 tests)
// Pages: 01_Login_Page, 02_Reset_Password_Page
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('DP-A: Doctor Auth & Login', () => {
  test('DP-A01: Doctor login via /auth/login', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    expect(token).toBeTruthy();
  });

  test('DP-A02: Admin login via /auth/login', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    expect(token).toBeTruthy();
  });

  test('DP-A03: Doctor session via /auth/me', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/auth/me`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.success).toBe(true);
  });

  test('DP-A04: Admin session via /auth/me', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/auth/me`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-A05: Invalid credentials rejected', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/auth/login`, {
      data: { email: DOC.email, password: 'WrongPassword123!' },
      headers: { 'Content-Type': 'application/json' },
      timeout: TIMEOUT,
    });
    expect(r.status()).toBeGreaterThanOrEqual(400);
  });

  test('DP-A06: Doctor + Admin login in PARALLEL', async ({ request }) => {
    const [doc, adm] = await Promise.all([
      loginDoctor(request, DOC.email, DOC.password),
      loginDoctor(request, ADM.email, ADM.password),
    ]);
    expect(doc.token).toBeTruthy();
    expect(adm.token).toBeTruthy();
  });

  test('DP-A07: Doctor portal health check', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/health`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-A08: Doctor portal DB health', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/health/db`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DP-B: DASHBOARD (6 tests)
// Page: 03_Dashboard_Page — Stats overview, today's queue, pending tasks
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('DP-B: Doctor Dashboard', () => {
  test('DP-B01: Doctor dashboard stats', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/dashboard/${DOC.id}`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });

  test('DP-B02: Admin dashboard stats', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/api/admin/stats`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });

  test('DP-B03: Todays appointments for dashboard queue', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/appointments`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-B04: Notifications for dashboard badge', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/notifications`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-B05: Dashboard doctor and admin in PARALLEL', async ({ request }) => {
    const doc = await loginDoctor(request, DOC.email, DOC.password);
    const adm = await loginDoctor(request, ADM.email, ADM.password);
    const [r1, r2] = await Promise.all([
      request.get(`${DOCTOR_URL}/api/appointments`, { headers: AH(doc.token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/appointments`, { headers: AH(adm.token), timeout: TIMEOUT }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
  });

  test('DP-B06: Doctor analytics data', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/dashboard/${DOC.id}/analytics`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DP-C: SCHEDULE PAGE (4 tests)
// Page: 04_Schedule_Page — Calendar view, availability management
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('DP-C: Schedule Management', () => {
  test('DP-C01: Doctor appointments list (schedule data)', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/appointments`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-C02: Doctor schedule/availability', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/doctors/${DOC.id}/schedule`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });

  test('DP-C03: Admin sees all schedules', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/api/appointments`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-C04: Doctor queue for today', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/queue`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DP-D: PATIENT MANAGEMENT (8 tests)
// Pages: 05_Patient_Management, 11_Patient_Record_Viewer
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('DP-D: Patient Management & Records', () => {
  test('DP-D01: List all patients', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/patients`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-D02: Get patient details by ID', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/patients/${P1.id}`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-D03: Get patient EMR records', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/patients/${P1.id}/emr`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });

  test('DP-D04: Get patient health logs', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/patients/${P1.id}/health-logs`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });

  test('DP-D05: Get patient living will (with PDPA consent)', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/patients/${P1.id}/living-will`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });

  test('DP-D06: Admin lists all patients', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/api/patients`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-D07: Doctor + Admin access patient list in PARALLEL', async ({ request }) => {
    const doc = await loginDoctor(request, DOC.email, DOC.password);
    const adm = await loginDoctor(request, ADM.email, ADM.password);
    const [r1, r2] = await Promise.all([
      request.get(`${DOCTOR_URL}/api/patients`, { headers: AH(doc.token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/patients`, { headers: AH(adm.token), timeout: TIMEOUT }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
  });

  test('DP-D08: Patient PHR from doctor side', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/phr/${P1.id}`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DP-E: HEALTH MEETING & VIRTUAL MEETING (10 tests)
// Pages: 06_Health_Meeting_Page, 07_Virtual_Meeting
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('DP-E: Health Meeting & Virtual Meeting', () => {
  test('DP-E01: Meeting server health', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/health`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-E02: Meeting server API health', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/api/health`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-E03: Create meeting room', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/meetings/create`, {
      data: {
        appointmentId: `APT-E2E-${Date.now()}`,
        doctorId: DOC.id,
        patientId: P1.id,
        roomName: `e2e-dp-e03-${Date.now()}`,
      },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('DP-E04: Video meeting config', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/video-meeting/config`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-E05: Doctor appointment queue for meetings', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/queue`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-E06: Confirm appointment with meeting link', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    // First create appointment from patient side
    const patToken = (await loginPatient(request, P1.email, P1.password)).token;
    const aptR = await request.post(`${PATIENT_URL}/api/appointments`, {
      data: {
        patientId: P1.id, doctorId: DOC.id, type: 'telemedicine',
        reason: 'DP-E06 meeting test', scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        scheduledTime: '10:00',
      },
      headers: { Authorization: `Bearer ${patToken}`, 'Content-Type': 'application/json' },
      timeout: TIMEOUT,
    });
    expect(aptR.status()).toBe(200);
    // Doctor views appointments
    const dr = await request.get(`${DOCTOR_URL}/api/appointments`, { headers: AH(token), timeout: TIMEOUT });
    expect(dr.status()).toBe(200);
  });

  test('DP-E07: Meeting transcript endpoints', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/meeting/transcript/latest`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });

  test('DP-E08: Doctor and meeting server health in PARALLEL', async ({ request }) => {
    const [dh, mh] = await Promise.all([
      request.get(`${DOCTOR_URL}/health`, { timeout: TIMEOUT }),
      request.get(`${MEETING_SERVER_URL}/health`, { timeout: TIMEOUT }),
    ]);
    expect(dh.status()).toBe(200);
    expect(mh.status()).toBe(200);
  });

  test('DP-E09: Video meeting create from doctor portal', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/video-meeting/create`, {
      data: { appointmentId: `APT-DP-E09-${Date.now()}`, doctorId: DOC.id, patientId: P1.id },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('DP-E10: Admin views all meetings', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/api/appointments`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DP-F: EMR & PRESCRIPTIONS & LAB ORDERS (12 tests)
// Pages: 08_EMR_Editor, 09_Prescribing, 10_Lab_Orders
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('DP-F: EMR, Prescriptions & Lab Orders', () => {
  test('DP-F01: List EMR records', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/emr`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-F02: Create new EMR record', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/emr`, {
      data: {
        patientId: P1.id, doctorId: DOC.id,
        chiefComplaint: 'E2E test - headache', diagnosis: 'Tension headache',
        treatment: 'Rest and paracetamol', notes: 'E2E test EMR',
      },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
  });

  test('DP-F03: List prescriptions', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/prescriptions`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-F04: Create new prescription', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/prescriptions`, {
      data: {
        patientId: P1.id, doctorId: DOC.id,
        medications: [{ name: 'Paracetamol 500mg', dosage: '1 tab', frequency: 'q6h', duration: '3 days' }],
        notes: 'E2E test prescription',
      },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
  });

  test('DP-F05: List lab orders', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/lab-orders`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-F06: Create lab order', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/lab-orders`, {
      data: {
        patientId: P1.id, doctorId: DOC.id,
        tests: [{ name: 'CBC', code: 'LAB-CBC-001' }],
        priority: 'routine', notes: 'E2E test lab order',
      },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
  });

  test('DP-F07: Medication search for prescribing', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/metadata/medications`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-F08: Lab tests catalog for ordering', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/metadata/lab-tests`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-F09: ICD-10 codes for diagnosis', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/metadata/icd10-codes`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-F10: EMR + Prescriptions + Lab Orders in PARALLEL', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const [e, p, l] = await Promise.all([
      request.get(`${DOCTOR_URL}/api/emr`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/prescriptions`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/lab-orders`, { headers: AH(token), timeout: TIMEOUT }),
    ]);
    expect(e.status()).toBe(200);
    expect(p.status()).toBe(200);
    expect(l.status()).toBe(200);
  });

  test('DP-F11: Admin views all EMR records', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/api/emr`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-F12: EMR validation via AI', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/ai/validate`, {
      data: { type: 'emr', content: { diagnosis: 'Tension headache', treatment: 'Paracetamol' } },
      headers: AH(token), timeout: 60_000,
    });
    expect(r.status()).toBeLessThan(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DP-G: MEDICAL CONTENT & CLINICAL RESOURCES (10 tests)
// Pages: 13_Medical_Content_Page, 14_Clinical_Resources_Page
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('DP-G: Medical Content & Clinical Resources', () => {
  test('DP-G01: List medical content (doctor view)', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/medical-content`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-G02: List clinical resources', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/clinical-resources`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-G03: Create medical content article', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/medical-content`, {
      data: {
        title: `E2E Test Article ${Date.now()}`, content: 'Test content body',
        category: 'general', tags: ['test'], status: 'draft',
      },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('DP-G04: Create clinical resource', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/clinical-resources`, {
      data: {
        title: `E2E Clinical Resource ${Date.now()}`, content: 'Clinical test content',
        category: 'guidelines', tags: ['test'],
      },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('DP-G05: Content tags for medical', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/content/tags/medical`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });

  test('DP-G06: Content tags for clinical', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/content/tags/clinical`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });

  test('DP-G07: Admin views all medical content', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/api/medical-content`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-G08: Admin views all clinical resources', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/api/clinical-resources`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-G09: Content + Clinical in PARALLEL', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const [mc, cr] = await Promise.all([
      request.get(`${DOCTOR_URL}/api/medical-content`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/clinical-resources`, { headers: AH(token), timeout: TIMEOUT }),
    ]);
    expect(mc.status()).toBe(200);
    expect(cr.status()).toBe(200);
  });

  test('DP-G10: Knowledge base for AI RAG', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/ai/knowledge`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DP-H: GEMINI AI STUDIO (10 tests)
// Page: 15_Gemini_AI_Studio — AI chat, CDS, summarization
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('DP-H: Gemini AI Studio', () => {
  test('DP-H01: AI health/status check', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/ai/health`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });

  test('DP-H02: AI chat — medical question', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/ai/chat`, {
      data: { message: 'What are the latest guidelines for treating hypertension?', sessionId: `doc-${Date.now()}` },
      headers: AH(token), timeout: 60_000,
    });
    expect(r.status()).toBe(200);
  });

  test('DP-H03: AI pre-consultation summary', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/ai/pre-consultation-summary`, {
      data: { patientId: P1.id, appointmentId: 'test-apt' },
      headers: AH(token), timeout: 60_000,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('DP-H04: AI EMR summary generation', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/ai/emr-summary`, {
      data: {
        transcript: 'Patient complains of headache for 3 days. No fever. Taking paracetamol.',
        patientId: P1.id,
      },
      headers: AH(token), timeout: 60_000,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('DP-H05: AI CDS check', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/ai/cds-check`, {
      data: { patientId: P1.id, medications: ['Paracetamol'], diagnosis: 'Headache' },
      headers: AH(token), timeout: 60_000,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('DP-H06: AI patient instruction generation', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/ai/patient-instruction`, {
      data: { diagnosis: 'Tension headache', medications: ['Paracetamol 500mg'], followUp: '1 week' },
      headers: AH(token), timeout: 60_000,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('DP-H07: AI drug interaction check', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/ai/drug-interactions`, {
      data: { drugs: ['Warfarin', 'Aspirin'] },
      headers: AH(token), timeout: 60_000,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('DP-H08: AI CDS logs', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/ai/cds-logs`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });

  test('DP-H09: AI validations list', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/ai/validations`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });

  test('DP-H10: AI summarize meeting data', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/ai/summarize`, {
      data: { text: 'Patient came with complaints of headache and dizziness for 3 days.' },
      headers: AH(token), timeout: 60_000,
    });
    expect(r.status()).toBeLessThan(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DP-I: MEDICAL CONSULTANTS (6 tests)
// Page: 12_Medical_Consultants_Page — Specialist referrals
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('DP-I: Medical Consultants', () => {
  test('DP-I01: List consultants', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/consultants`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-I02: Create consultant (admin)', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.post(`${DOCTOR_URL}/api/consultants`, {
      data: {
        name: `E2E Consultant ${Date.now()}`, specialty: 'Cardiology',
        hospital: 'Bangkok Hospital', phone: '0212345678',
      },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('DP-I03: Admin lists consultants', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/api/consultants`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-I04: Doctor + Admin access consultants in PARALLEL', async ({ request }) => {
    const doc = await loginDoctor(request, DOC.email, DOC.password);
    const adm = await loginDoctor(request, ADM.email, ADM.password);
    const [r1, r2] = await Promise.all([
      request.get(`${DOCTOR_URL}/api/consultants`, { headers: AH(doc.token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/consultants`, { headers: AH(adm.token), timeout: TIMEOUT }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
  });

  test('DP-I05: Specialties metadata for consultant lookup', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/metadata/specialties`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-I06: Patient consultants accessible from patient portal', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.get(`${PATIENT_URL}/api/consultants`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DP-J: ADMIN FEATURES (10 tests)
// Pages: 17_Admin_Appointment_Mgmt, 18_Admin_Doctor_Mgmt, 19_Doctors_Mgmt
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('DP-J: Admin Features', () => {
  test('DP-J01: Admin — list all appointments', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/api/appointments`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-J02: Admin — list all doctors', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/api/doctors`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-J03: Admin — pending doctor registrations', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/api/admin/pending-doctors`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });

  test('DP-J04: Admin — admin stats', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/api/admin/stats`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });

  test('DP-J05: Admin — appointment pool management', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/api/appointment-pool`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-J06: Admin — queue management', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/api/queue`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-J07: Admin — notifications management', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/api/notifications`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-J08: Admin all management endpoints in PARALLEL', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const [a, d, q, n] = await Promise.all([
      request.get(`${DOCTOR_URL}/api/appointments`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/doctors`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/queue`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/notifications`, { headers: AH(token), timeout: TIMEOUT }),
    ]);
    expect(a.status()).toBe(200);
    expect(d.status()).toBe(200);
    expect(q.status()).toBe(200);
    expect(n.status()).toBe(200);
  });

  test('DP-J09: Admin doctor auth — list doctors via auth server', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/auth/admin/doctors`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });

  test('DP-J10: Admin — all patients list', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/api/patients`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DP-K: DOCTOR PROFILE & NOTIFICATION (6 tests)
// Pages: 16_Doctor_Profile_Page, Notification system
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('DP-K: Doctor Profile & Notifications', () => {
  test('DP-K01: Doctor profile via /auth/me', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/auth/me`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-K02: Doctor profile via /auth/profile', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/auth/profile`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-K03: Doctor notifications list', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/notifications`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-K04: Admin notifications list', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/api/notifications`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-K05: Doctor + Admin profiles in PARALLEL', async ({ request }) => {
    const doc = await loginDoctor(request, DOC.email, DOC.password);
    const adm = await loginDoctor(request, ADM.email, ADM.password);
    const [r1, r2] = await Promise.all([
      request.get(`${DOCTOR_URL}/auth/me`, { headers: AH(doc.token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/auth/me`, { headers: AH(adm.token), timeout: TIMEOUT }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
  });

  test('DP-K06: Doctor list visible to patients', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.get(`${PATIENT_URL}/api/doctors`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DP-L: QUEUE & APPOINTMENT POOL (8 tests)
// Pages: 20_Appointment_Pool_Management, 21_Queue_Management
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('DP-L: Queue & Appointment Pool', () => {
  test('DP-L01: Doctor queue list', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/queue`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-L02: Appointment pool list', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/appointment-pool`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-L03: Admin queue list', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/api/queue`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-L04: Admin appointment pool list', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/api/appointment-pool`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-L05: Queue + Pool in PARALLEL', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const [q, p] = await Promise.all([
      request.get(`${DOCTOR_URL}/api/queue`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/appointment-pool`, { headers: AH(token), timeout: TIMEOUT }),
    ]);
    expect(q.status()).toBe(200);
    expect(p.status()).toBe(200);
  });

  test('DP-L06: Patient appointment pool view', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.get(`${PATIENT_URL}/api/appointment-pool`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-L07: Doctor + Admin queue in PARALLEL', async ({ request }) => {
    const doc = await loginDoctor(request, DOC.email, DOC.password);
    const adm = await loginDoctor(request, ADM.email, ADM.password);
    const [r1, r2] = await Promise.all([
      request.get(`${DOCTOR_URL}/api/queue`, { headers: AH(doc.token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/queue`, { headers: AH(adm.token), timeout: TIMEOUT }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
  });

  test('DP-L08: Appointment pool accessible from both portals', async ({ request }) => {
    const patToken = (await loginPatient(request, P1.email, P1.password)).token;
    const docToken = (await loginDoctor(request, DOC.email, DOC.password)).token;
    const [pr, dr] = await Promise.all([
      request.get(`${PATIENT_URL}/api/appointment-pool`, { headers: AH(patToken), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/appointment-pool`, { headers: AH(docToken), timeout: TIMEOUT }),
    ]);
    expect(pr.status()).toBe(200);
    expect(dr.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DP-M: METADATA FROM DOCTOR PORTAL (6 tests)
// Supporting reference data for all doctor pages
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('DP-M: Doctor Portal Metadata', () => {
  test('DP-M01: Specialties metadata', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/metadata/specialties`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-M02: Medications metadata', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/metadata/medications`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-M03: Lab tests metadata', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/metadata/lab-tests`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-M04: ICD-10 codes metadata', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/metadata/icd10-codes`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('DP-M05: All metadata in PARALLEL', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const [s, m, l, i] = await Promise.all([
      request.get(`${DOCTOR_URL}/api/metadata/specialties`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/metadata/medications`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/metadata/lab-tests`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/metadata/icd10-codes`, { headers: AH(token), timeout: TIMEOUT }),
    ]);
    expect(s.status()).toBe(200);
    expect(m.status()).toBe(200);
    expect(l.status()).toBe(200);
    expect(i.status()).toBe(200);
  });

  test('DP-M06: Doctors list as metadata', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/doctors`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(Array.isArray(d.doctors || d.data || d)).toBe(true);
  });
});
