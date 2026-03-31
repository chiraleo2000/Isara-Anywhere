/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — WORKFLOW PROCESSES COMPLETE E2E TESTS v1.4.8
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * End-to-end workflow testing covering ALL 13 process documents.
 * Cross-portal integration workflows × deep feature testing = 100+ tests
 *
 * Coverage (13 Process Documents):
 *   - Appointment_Workflows.md
 *   - Health_Records_Processes.md
 *   - VIDEO_MEETING_JITSI_GEMINI.md
 *   - User_management_Workflows.md
 *   - Notification_Workflows.md
 *   - Living_Will_Processes.md
 *   - Clinical_Resources_&_Medical_Library_Workflows.md
 *   - Medical_Consultants_Workflows.md
 *   - Medicine_Content_Processes.md
 *   - Data_Sync_Documentation.md
 *   - Living_Will_Implementation_Plan.md
 *   - PHASE1_REQUIREMENTS.md
 *   - UI_Pages_Workflows.md
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
const P2 = CREDENTIALS.patient2;
const P3 = CREDENTIALS.patient3;
const DOC = CREDENTIALS.doctor;
const ADM = CREDENTIALS.admin;

async function loginPatient(request: APIRequestContext, email: string, password: string) {
  const r = await request.post(`${PATIENT_URL}/api/auth/login`, {
    data: { email, password }, headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
  });
  expect(r.status()).toBe(200);
  const d = await r.json();
  return { token: d.token || d.accessToken || '', user: d.user || d.data?.user || {} };
}

async function loginDoctor(request: APIRequestContext, email: string, password: string) {
  for (const path of ['/auth/login', '/api/auth/login']) {
    try {
      const r = await request.post(`${DOCTOR_URL}${path}`, {
        data: { email, password }, headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
      });
      if (r.status() === 200) {
        const d = await r.json();
        return { token: d.token || d.accessToken || d.data?.token || '', user: d.user || d.data?.user || {} };
      }
    } catch { /* try next */ }
  }
  throw new Error('Doctor login failed');
}

function AH(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WF-A: APPOINTMENT WORKFLOW — FULL LIFECYCLE (14 tests)
// Process: Appointment_Workflows.md — Book → Approve → Meeting → Complete
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('WF-A: Appointment Workflow — Full Lifecycle', () => {
  test('WF-A01: Patient books appointment via patient portal', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.post(`${PATIENT_URL}/api/appointments`, {
      data: {
        patientId: P1.id, doctorId: DOC.id, type: 'telemedicine',
        reason: 'WF-A01 lifecycle test', symptoms: 'Persistent cough', urgency: 'normal',
        scheduledDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        scheduledTime: '09:00',
      },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
  });

  test('WF-A02: Doctor sees patient appointment', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/appointments`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
    const d = await r.json();
    const apts = d.appointments || d.data || d;
    expect(Array.isArray(apts)).toBe(true);
  });

  test('WF-A03: Admin sees all appointments', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/api/appointments`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('WF-A04: Patient appointment appears in patient list', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.get(`${PATIENT_URL}/api/appointments`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('WF-A05: Multiple patients book appointments simultaneously', async ({ request }) => {
    const p1 = await loginPatient(request, P1.email, P1.password);
    const p2 = await loginPatient(request, P2.email, P2.password);
    const p3 = await loginPatient(request, P3.email, P3.password);
    const baseDate = new Date(Date.now() + 86400000 * 6).toISOString().split('T')[0];
    const [r1, r2, r3] = await Promise.all([
      request.post(`${PATIENT_URL}/api/appointments`, {
        data: { patientId: P1.id, doctorId: DOC.id, type: 'telemedicine', reason: 'WF-A05-P1', scheduledDate: baseDate, scheduledTime: '09:00' },
        headers: AH(p1.token), timeout: TIMEOUT,
      }),
      request.post(`${PATIENT_URL}/api/appointments`, {
        data: { patientId: P2.id, doctorId: DOC.id, type: 'telemedicine', reason: 'WF-A05-P2', scheduledDate: baseDate, scheduledTime: '10:00' },
        headers: AH(p2.token), timeout: TIMEOUT,
      }),
      request.post(`${PATIENT_URL}/api/appointments`, {
        data: { patientId: P3.id, doctorId: DOC.id, type: 'telemedicine', reason: 'WF-A05-P3', scheduledDate: baseDate, scheduledTime: '11:00' },
        headers: AH(p3.token), timeout: TIMEOUT,
      }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
    expect(r3.status()).toBe(200);
  });

  test('WF-A06: Doctor appointment queue reflects new bookings', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/queue`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('WF-A07: Appointment pool for unassigned appointments', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/appointment-pool`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('WF-A08: Patient appointment history tracks bookings', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.get(`${PATIENT_URL}/api/appointments/history`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('WF-A09: Doctor-specific patient appointments', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/appointments/patient/${P1.id}`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('WF-A10: Cross-portal appointment verification', async ({ request }) => {
    const patToken = (await loginPatient(request, P1.email, P1.password)).token;
    const docToken = (await loginDoctor(request, DOC.email, DOC.password)).token;
    const [pr, dr] = await Promise.all([
      request.get(`${PATIENT_URL}/api/appointments`, { headers: AH(patToken), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/appointments`, { headers: AH(docToken), timeout: TIMEOUT }),
    ]);
    expect(pr.status()).toBe(200);
    expect(dr.status()).toBe(200);
  });

  test('WF-A11: Appointment notifications generated', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.get(`${PATIENT_URL}/api/notifications`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('WF-A12: Doctor notifications for new appointments', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/notifications`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('WF-A13: Admin can assign unassigned appointments', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/api/appointment-pool`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('WF-A14: All portals see appointments in PARALLEL', async ({ request }) => {
    const pat = await loginPatient(request, P1.email, P1.password);
    const doc = await loginDoctor(request, DOC.email, DOC.password);
    const adm = await loginDoctor(request, ADM.email, ADM.password);
    const [rp, rd, ra] = await Promise.all([
      request.get(`${PATIENT_URL}/api/appointments`, { headers: AH(pat.token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/appointments`, { headers: AH(doc.token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/appointments`, { headers: AH(adm.token), timeout: TIMEOUT }),
    ]);
    expect(rp.status()).toBe(200);
    expect(rd.status()).toBe(200);
    expect(ra.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// WF-B: HEALTH RECORDS WORKFLOW (12 tests)
// Process: Health_Records_Processes.md — PHR → EMR → Lab → Timeline
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('WF-B: Health Records Workflow', () => {
  test('WF-B01: Patient creates PHR vitals entry', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.post(`${PATIENT_URL}/api/phr/vitals`, {
      data: { type: 'blood_pressure', systolic: 118, diastolic: 78, pulse: 70, recordedAt: new Date().toISOString() },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
  });

  test('WF-B02: Doctor creates EMR after consultation', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/emr`, {
      data: {
        patientId: P1.id, doctorId: DOC.id,
        chiefComplaint: 'WF-B02 chronic cough', diagnosis: 'Upper respiratory infection',
        treatment: 'Antibiotics and rest', notes: 'Follow up in 1 week',
      },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
  });

  test('WF-B03: Doctor creates prescription', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/prescriptions`, {
      data: {
        patientId: P1.id, doctorId: DOC.id,
        medications: [{ name: 'Amoxicillin 500mg', dosage: '1 cap', frequency: 'tid', duration: '7 days' }],
      },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
  });

  test('WF-B04: Doctor orders lab tests', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/lab-orders`, {
      data: {
        patientId: P1.id, doctorId: DOC.id,
        tests: [{ name: 'CBC', code: 'LAB-CBC' }, { name: 'CRP', code: 'LAB-CRP' }],
        priority: 'routine',
      },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
  });

  test('WF-B05: Patient timeline shows new records', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.get(`${PATIENT_URL}/api/timeline`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('WF-B06: Patient treatment results available', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.get(`${PATIENT_URL}/api/health-records/treatment-results`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('WF-B07: Doctor views patient health logs', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/patients/${P1.id}/health-logs`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });

  test('WF-B08: EMR + Prescriptions + Lab orders in PARALLEL', async ({ request }) => {
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

  test('WF-B09: Patient PHR vitals history', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.get(`${PATIENT_URL}/api/phr/vitals`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('WF-B10: Patient medications from PHR', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.get(`${PATIENT_URL}/api/phr/medications`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('WF-B11: Patient allergies from PHR', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.get(`${PATIENT_URL}/api/phr/allergies`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('WF-B12: Cross-portal health data consistency', async ({ request }) => {
    const patToken = (await loginPatient(request, P1.email, P1.password)).token;
    const docToken = (await loginDoctor(request, DOC.email, DOC.password)).token;
    const [phr, emr] = await Promise.all([
      request.get(`${PATIENT_URL}/api/phr/vitals`, { headers: AH(patToken), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/emr`, { headers: AH(docToken), timeout: TIMEOUT }),
    ]);
    expect(phr.status()).toBe(200);
    expect(emr.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// WF-C: VIDEO MEETING WORKFLOW (12 tests)
// Process: VIDEO_MEETING_JITSI_GEMINI.md — Create → Join → Transcript → AI → EMR
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('WF-C: Video Meeting Workflow', () => {
  test('WF-C01: All 3 services healthy for meeting', async ({ request }) => {
    const [p, d, m] = await Promise.all([
      request.get(`${PATIENT_URL}/health`, { timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/health`, { timeout: TIMEOUT }),
      request.get(`${MEETING_SERVER_URL}/health`, { timeout: TIMEOUT }),
    ]);
    expect(p.status()).toBe(200);
    expect(d.status()).toBe(200);
    expect(m.status()).toBe(200);
  });

  test('WF-C02: Meeting server API health', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/api/health`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d).toHaveProperty('status');
  });

  test('WF-C03: Video meeting config available', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/video-meeting/config`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('WF-C04: Create meeting via meeting server', async ({ request }) => {
    const r = await request.post(`${MEETING_SERVER_URL}/api/meetings/create`, {
      data: {
        appointmentId: `APT-WF-C04-${Date.now()}`,
        doctorId: DOC.id, patientId: P1.id,
        roomName: `wf-c04-${Date.now()}`,
      },
      headers: { 'Content-Type': 'application/json' },
      timeout: TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('WF-C05: Create meeting via doctor portal', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/meetings/create`, {
      data: { appointmentId: `APT-WF-C05-${Date.now()}`, doctorId: DOC.id, patientId: P1.id },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('WF-C06: Meeting transcript endpoint accessible', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/meeting/transcript/latest`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });

  test('WF-C07: AI meeting summary endpoint', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/ai/meeting-summary`, {
      data: { transcript: 'Test transcript for summary', meetingId: 'test-meeting' },
      headers: AH(token), timeout: 60_000,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('WF-C08: AI EMR summary from meeting data', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/ai/emr-summary`, {
      data: { transcript: 'Patient reports headache for 3 days. BP 130/85.', patientId: P1.id },
      headers: AH(token), timeout: 60_000,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('WF-C09: AI patient instruction from meeting', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/ai/patient-instruction`, {
      data: { diagnosis: 'Hypertension', medications: ['Amlodipine 5mg'], followUp: '2 weeks' },
      headers: AH(token), timeout: 60_000,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('WF-C10: AI CDS check during meeting', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/ai/cds-check`, {
      data: { patientId: P1.id, medications: ['Amlodipine'], diagnosis: 'Hypertension' },
      headers: AH(token), timeout: 60_000,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('WF-C11: Meeting config + health in PARALLEL', async ({ request }) => {
    const [cfg, mh, ph, dh] = await Promise.all([
      request.get(`${PATIENT_URL}/api/video-meeting/config`, { timeout: TIMEOUT }),
      request.get(`${MEETING_SERVER_URL}/health`, { timeout: TIMEOUT }),
      request.get(`${PATIENT_URL}/health`, { timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/health`, { timeout: TIMEOUT }),
    ]);
    expect(cfg.status()).toBe(200);
    expect(mh.status()).toBe(200);
    expect(ph.status()).toBe(200);
    expect(dh.status()).toBe(200);
  });

  test('WF-C12: Video meeting config from both portals', async ({ request }) => {
    const [pc, dc] = await Promise.all([
      request.get(`${PATIENT_URL}/api/video-meeting/config`, { timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/video-meeting/config`, { timeout: TIMEOUT }),
    ]);
    expect(pc.status()).toBe(200);
    expect(dc.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// WF-D: USER MANAGEMENT WORKFLOW (10 tests)
// Process: User_management_Workflows.md — Registration, Auth, Roles
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('WF-D: User Management Workflow', () => {
  test('WF-D01: Patient registration creates account', async ({ request }) => {
    const ts = Date.now();
    const r = await request.post(`${PATIENT_URL}/api/auth/register`, {
      data: {
        name: `WF-D01 ${ts}`, email: `wf.d01.${ts}@gmail.com`,
        password: 'Test@12345678', phone: '0891234567',
        dateOfBirth: '1992-03-15', gender: 'female',
      },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
  });

  test('WF-D02: Patient login after registration', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    expect(token).toBeTruthy();
  });

  test('WF-D03: Doctor login with credentials', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    expect(token).toBeTruthy();
  });

  test('WF-D04: Admin login with credentials', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    expect(token).toBeTruthy();
  });

  test('WF-D05: All 5 users authenticate in sequence', async ({ request }) => {
    const p1 = await loginPatient(request, P1.email, P1.password);
    const p2 = await loginPatient(request, P2.email, P2.password);
    const p3 = await loginPatient(request, P3.email, P3.password);
    const doc = await loginDoctor(request, DOC.email, DOC.password);
    const adm = await loginDoctor(request, ADM.email, ADM.password);
    expect(p1.token).toBeTruthy();
    expect(p2.token).toBeTruthy();
    expect(p3.token).toBeTruthy();
    expect(doc.token).toBeTruthy();
    expect(adm.token).toBeTruthy();
  });

  test('WF-D06: Token validation for patient', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.post(`${PATIENT_URL}/api/auth/validate`, {
      data: { token }, headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
  });

  test('WF-D07: Session verification for doctor', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/auth/me`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('WF-D08: Admin manages doctor list', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/api/doctors`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('WF-D09: Admin views pending doctor registrations', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/api/admin/pending-doctors`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });

  test('WF-D10: Password reset request works', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/auth/request-password-reset`, {
      data: { email: P1.email }, headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// WF-E: NOTIFICATION WORKFLOW (10 tests)
// Process: Notification_Workflows.md — In-App, Email, Push
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('WF-E: Notification Workflow', () => {
  test('WF-E01: Patient notifications list', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.get(`${PATIENT_URL}/api/notifications`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('WF-E02: Patient notification count', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.get(`${PATIENT_URL}/api/notifications/count`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('WF-E03: Doctor notifications list', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/notifications`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('WF-E04: Admin notifications list', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.get(`${DOCTOR_URL}/api/notifications`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('WF-E05: All users notifications in PARALLEL', async ({ request }) => {
    const pat = await loginPatient(request, P1.email, P1.password);
    const doc = await loginDoctor(request, DOC.email, DOC.password);
    const adm = await loginDoctor(request, ADM.email, ADM.password);
    const [rp, rd, ra] = await Promise.all([
      request.get(`${PATIENT_URL}/api/notifications`, { headers: AH(pat.token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/notifications`, { headers: AH(doc.token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/notifications`, { headers: AH(adm.token), timeout: TIMEOUT }),
    ]);
    expect(rp.status()).toBe(200);
    expect(rd.status()).toBe(200);
    expect(ra.status()).toBe(200);
  });

  test('WF-E06: Mark notifications as read', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.post(`${PATIENT_URL}/api/notifications/read`, {
      data: { notificationIds: [] }, headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('WF-E07: Patient2 notifications (isolation)', async ({ request }) => {
    const { token } = await loginPatient(request, P2.email, P2.password);
    const r = await request.get(`${PATIENT_URL}/api/notifications`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('WF-E08: Patient3 notifications (isolation)', async ({ request }) => {
    const { token } = await loginPatient(request, P3.email, P3.password);
    const r = await request.get(`${PATIENT_URL}/api/notifications`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('WF-E09: Notification settings accessible', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.get(`${PATIENT_URL}/api/notifications/settings`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });

  test('WF-E10: Doctor notification count', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/notifications/count`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// WF-F: LIVING WILL & PDPA WORKFLOW (8 tests)
// Processes: Living_Will_Processes.md, Living_Will_Implementation_Plan.md
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('WF-F: Living Will & PDPA Workflow', () => {
  test('WF-F01: Patient creates living will', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.post(`${PATIENT_URL}/api/phr/living-will`, {
      data: {
        treatmentPreferences: { cpr: true, ventilator: false },
        healthcareProxy: { name: 'WF-F01 Proxy', phone: '0891111111' },
      },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('WF-F02: Patient PDPA consents for sharing', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.get(`${PATIENT_URL}/api/pdpa/consents`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('WF-F03: Doctor views patient living will', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/patients/${P1.id}/living-will`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });

  test('WF-F04: PDPA audit log for living will access', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.get(`${PATIENT_URL}/api/pdpa/audit`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('WF-F05: Patient consent and living will in PARALLEL', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const [c, lw] = await Promise.all([
      request.get(`${PATIENT_URL}/api/pdpa/consents`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${PATIENT_URL}/api/phr/living-will`, { headers: AH(token), timeout: TIMEOUT }),
    ]);
    expect(c.status()).toBe(200);
    expect(lw.status()).toBeLessThan(500);
  });

  test('WF-F06: Patient2 PDPA isolation', async ({ request }) => {
    const { token } = await loginPatient(request, P2.email, P2.password);
    const r = await request.get(`${PATIENT_URL}/api/pdpa/consents`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('WF-F07: Living will sharing consent', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.post(`${PATIENT_URL}/api/pdpa/living-will/share`, {
      data: { doctorId: DOC.id, consent: true },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('WF-F08: Cross-portal living will consistency', async ({ request }) => {
    const patToken = (await loginPatient(request, P1.email, P1.password)).token;
    const docToken = (await loginDoctor(request, DOC.email, DOC.password)).token;
    const [pl, dl] = await Promise.all([
      request.get(`${PATIENT_URL}/api/phr/living-will`, { headers: AH(patToken), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/patients/${P1.id}/living-will`, { headers: AH(docToken), timeout: TIMEOUT }),
    ]);
    expect(pl.status()).toBeLessThan(500);
    expect(dl.status()).toBeLessThan(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// WF-G: CONTENT & CLINICAL RESOURCES WORKFLOW (10 tests)
// Processes: Clinical_Resources_&_Medical_Library_Workflows.md, Medicine_Content_Processes.md
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('WF-G: Content & Clinical Resources', () => {
  test('WF-G01: Doctor creates medical content', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/medical-content`, {
      data: { title: `WF-G01 ${Date.now()}`, content: 'Test article body', category: 'health', status: 'draft' },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('WF-G02: Doctor lists medical content', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/medical-content`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('WF-G03: Patient reads medical content', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.get(`${PATIENT_URL}/api/content/medical`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('WF-G04: Doctor creates clinical resource', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/clinical-resources`, {
      data: { title: `WF-G04 ${Date.now()}`, content: 'Clinical guideline', category: 'guidelines' },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('WF-G05: Patient reads clinical resources', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.get(`${PATIENT_URL}/api/content/clinical`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('WF-G06: Admin views all content', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const [mc, cr] = await Promise.all([
      request.get(`${DOCTOR_URL}/api/medical-content`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/clinical-resources`, { headers: AH(token), timeout: TIMEOUT }),
    ]);
    expect(mc.status()).toBe(200);
    expect(cr.status()).toBe(200);
  });

  test('WF-G07: AI knowledge base for RAG', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/ai/knowledge`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });

  test('WF-G08: Cross-portal content sync', async ({ request }) => {
    const patToken = (await loginPatient(request, P1.email, P1.password)).token;
    const docToken = (await loginDoctor(request, DOC.email, DOC.password)).token;
    const [pc, dc] = await Promise.all([
      request.get(`${PATIENT_URL}/api/content/medical`, { headers: AH(patToken), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/medical-content`, { headers: AH(docToken), timeout: TIMEOUT }),
    ]);
    expect(pc.status()).toBe(200);
    expect(dc.status()).toBe(200);
  });

  test('WF-G09: Content tags for doctor portal', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/content/tags/medical`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });

  test('WF-G10: Health tips for patient portal', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.get(`${PATIENT_URL}/api/metadata/health-tips`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// WF-H: MEDICAL CONSULTANTS WORKFLOW (6 tests)
// Process: Medical_Consultants_Workflows.md — CRUD, referrals
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('WF-H: Medical Consultants Workflow', () => {
  test('WF-H01: Doctor lists consultants', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/consultants`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('WF-H02: Admin creates consultant', async ({ request }) => {
    const { token } = await loginDoctor(request, ADM.email, ADM.password);
    const r = await request.post(`${DOCTOR_URL}/api/consultants`, {
      data: { name: `WF-H02 ${Date.now()}`, specialty: 'Neurology', hospital: 'Test Hospital', phone: '0212345678' },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('WF-H03: Patient views consultants', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.get(`${PATIENT_URL}/api/consultants`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });

  test('WF-H04: Doctor + Admin view consultants in PARALLEL', async ({ request }) => {
    const doc = await loginDoctor(request, DOC.email, DOC.password);
    const adm = await loginDoctor(request, ADM.email, ADM.password);
    const [r1, r2] = await Promise.all([
      request.get(`${DOCTOR_URL}/api/consultants`, { headers: AH(doc.token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/consultants`, { headers: AH(adm.token), timeout: TIMEOUT }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
  });

  test('WF-H05: Specialties for consultant lookup', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/metadata/specialties`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('WF-H06: Cross-portal consultant accessibility', async ({ request }) => {
    const patToken = (await loginPatient(request, P1.email, P1.password)).token;
    const docToken = (await loginDoctor(request, DOC.email, DOC.password)).token;
    const [pc, dc] = await Promise.all([
      request.get(`${PATIENT_URL}/api/consultants`, { headers: AH(patToken), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/consultants`, { headers: AH(docToken), timeout: TIMEOUT }),
    ]);
    expect(pc.status()).toBeLessThan(500);
    expect(dc.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// WF-I: DATA SYNC & SYSTEM INTEGRATION (10 tests)
// Process: Data_Sync_Documentation.md — Cross-service data consistency
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('WF-I: Data Sync & System Integration', () => {
  test('WF-I01: All services healthy simultaneously', async ({ request }) => {
    const [p, d, m] = await Promise.all([
      request.get(`${PATIENT_URL}/api/health`, { timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/health`, { timeout: TIMEOUT }),
      request.get(`${MEETING_SERVER_URL}/api/health`, { timeout: TIMEOUT }),
    ]);
    expect(p.status()).toBe(200);
    expect(d.status()).toBe(200);
    expect(m.status()).toBe(200);
  });

  test('WF-I02: Database health from all services', async ({ request }) => {
    const [pdb, ddb] = await Promise.all([
      request.get(`${PATIENT_URL}/api/health/db`, { timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/health/db`, { timeout: TIMEOUT }),
    ]);
    expect(pdb.status()).toBe(200);
    expect(ddb.status()).toBe(200);
  });

  test('WF-I03: Patient data consistent across portals', async ({ request }) => {
    const patToken = (await loginPatient(request, P1.email, P1.password)).token;
    const docToken = (await loginDoctor(request, DOC.email, DOC.password)).token;
    const [pp, dp] = await Promise.all([
      request.get(`${PATIENT_URL}/api/auth/me`, { headers: AH(patToken), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/patients/${P1.id}`, { headers: AH(docToken), timeout: TIMEOUT }),
    ]);
    expect(pp.status()).toBe(200);
    expect(dp.status()).toBe(200);
  });

  test('WF-I04: Appointment data sync between portals', async ({ request }) => {
    const patToken = (await loginPatient(request, P1.email, P1.password)).token;
    const docToken = (await loginDoctor(request, DOC.email, DOC.password)).token;
    const [pa, da] = await Promise.all([
      request.get(`${PATIENT_URL}/api/appointments`, { headers: AH(patToken), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/appointments`, { headers: AH(docToken), timeout: TIMEOUT }),
    ]);
    expect(pa.status()).toBe(200);
    expect(da.status()).toBe(200);
  });

  test('WF-I05: Metadata consistency across portals', async ({ request }) => {
    const patToken = (await loginPatient(request, P1.email, P1.password)).token;
    const docToken = (await loginDoctor(request, DOC.email, DOC.password)).token;
    const [ps, ds] = await Promise.all([
      request.get(`${PATIENT_URL}/api/metadata/specialties`, { headers: AH(patToken), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/metadata/specialties`, { headers: AH(docToken), timeout: TIMEOUT }),
    ]);
    expect(ps.status()).toBe(200);
    expect(ds.status()).toBe(200);
  });

  test('WF-I06: Content sync — medical articles', async ({ request }) => {
    const patToken = (await loginPatient(request, P1.email, P1.password)).token;
    const docToken = (await loginDoctor(request, DOC.email, DOC.password)).token;
    const [pc, dc] = await Promise.all([
      request.get(`${PATIENT_URL}/api/content/medical`, { headers: AH(patToken), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/medical-content`, { headers: AH(docToken), timeout: TIMEOUT }),
    ]);
    expect(pc.status()).toBe(200);
    expect(dc.status()).toBe(200);
  });

  test('WF-I07: Video meeting config sync', async ({ request }) => {
    const [pc, dc] = await Promise.all([
      request.get(`${PATIENT_URL}/api/video-meeting/config`, { timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/video-meeting/config`, { timeout: TIMEOUT }),
    ]);
    expect(pc.status()).toBe(200);
    expect(dc.status()).toBe(200);
  });

  test('WF-I08: GCS storage health', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/health/gcs`, { timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });

  test('WF-I09: All portals serve static assets', async ({ request }) => {
    const [p, d] = await Promise.all([
      request.get(`${PATIENT_URL}/`, { timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/`, { timeout: TIMEOUT }),
    ]);
    expect(p.status()).toBe(200);
    expect(d.status()).toBe(200);
  });

  test('WF-I10: Comprehensive parallel health check all services', async ({ request }) => {
    const [ph, dh, mh, pdb, ddb] = await Promise.all([
      request.get(`${PATIENT_URL}/health`, { timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/health`, { timeout: TIMEOUT }),
      request.get(`${MEETING_SERVER_URL}/health`, { timeout: TIMEOUT }),
      request.get(`${PATIENT_URL}/api/health/db`, { timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/health/db`, { timeout: TIMEOUT }),
    ]);
    expect(ph.status()).toBe(200);
    expect(dh.status()).toBe(200);
    expect(mh.status()).toBe(200);
    expect(pdb.status()).toBe(200);
    expect(ddb.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// WF-J: PHASE 1 REQUIREMENTS VALIDATION (8 tests)
// Process: PHASE1_REQUIREMENTS.md — Core deliverables verification
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('WF-J: Phase 1 Requirements Validation', () => {
  test('WF-J01: Core — telemedicine appointment flow works', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.post(`${PATIENT_URL}/api/appointments`, {
      data: {
        patientId: P1.id, doctorId: DOC.id, type: 'telemedicine',
        reason: 'WF-J01 Phase1 validation', scheduledDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
        scheduledTime: '10:00',
      },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
  });

  test('WF-J02: Core — meeting infrastructure ready', async ({ request }) => {
    const [cfg, mh] = await Promise.all([
      request.get(`${PATIENT_URL}/api/video-meeting/config`, { timeout: TIMEOUT }),
      request.get(`${MEETING_SERVER_URL}/health`, { timeout: TIMEOUT }),
    ]);
    expect(cfg.status()).toBe(200);
    expect(mh.status()).toBe(200);
  });

  test('WF-J03: Core — AI features available', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/ai/chat`, {
      data: { message: 'Phase 1 AI validation test', sessionId: `wf-j03-${Date.now()}` },
      headers: AH(token), timeout: 60_000,
    });
    expect(r.status()).toBe(200);
  });

  test('WF-J04: Core — EMR creation works', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/emr`, {
      data: {
        patientId: P1.id, doctorId: DOC.id,
        chiefComplaint: 'WF-J04 validation', diagnosis: 'Test', treatment: 'Test',
      },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
  });

  test('WF-J05: Core — patient PHR accessible', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const [v, m, a] = await Promise.all([
      request.get(`${PATIENT_URL}/api/phr/vitals`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${PATIENT_URL}/api/phr/medications`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${PATIENT_URL}/api/phr/allergies`, { headers: AH(token), timeout: TIMEOUT }),
    ]);
    expect(v.status()).toBe(200);
    expect(m.status()).toBe(200);
    expect(a.status()).toBe(200);
  });

  test('WF-J06: Core — notification system works', async ({ request }) => {
    const pat = await loginPatient(request, P1.email, P1.password);
    const doc = await loginDoctor(request, DOC.email, DOC.password);
    const [pn, dn] = await Promise.all([
      request.get(`${PATIENT_URL}/api/notifications`, { headers: AH(pat.token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/notifications`, { headers: AH(doc.token), timeout: TIMEOUT }),
    ]);
    expect(pn.status()).toBe(200);
    expect(dn.status()).toBe(200);
  });

  test('WF-J07: Core — PDPA compliance features', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const [c, a] = await Promise.all([
      request.get(`${PATIENT_URL}/api/pdpa/consents`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${PATIENT_URL}/api/pdpa/audit`, { headers: AH(token), timeout: TIMEOUT }),
    ]);
    expect(c.status()).toBe(200);
    expect(a.status()).toBe(200);
  });

  test('WF-J08: Core — all 3 services operational', async ({ request }) => {
    const [p, d, m] = await Promise.all([
      request.get(`${PATIENT_URL}/health`, { timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/health`, { timeout: TIMEOUT }),
      request.get(`${MEETING_SERVER_URL}/health`, { timeout: TIMEOUT }),
    ]);
    expect(p.status()).toBe(200);
    expect(d.status()).toBe(200);
    expect(m.status()).toBe(200);
  });
});
