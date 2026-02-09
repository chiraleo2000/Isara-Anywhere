/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — COMPREHENSIVE E2E TEST SUITE v1.4.7
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Multi-User PARALLEL Testing | Full Workflow Coverage | Phase 1 Requirements
 * 
 * Updated: February 9, 2026
 * Tests: 100+ comprehensive tests (only EXISTING endpoints)
 * Mode: HEADED (UI visible)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { test, expect, APIRequestContext } from '@playwright/test';
import {
  PATIENT_URL, DOCTOR_URL, MEETING_SERVER_URL,
  CREDENTIALS, IS_CLOUD,
} from '../lib/test-config';

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
async function getPatientToken(request: APIRequestContext, email: string, password: string): Promise<string> {
  const r = await request.post(`${PATIENT_URL}/api/auth/login`, {
    data: { email, password },
    headers: { 'Content-Type': 'application/json' },
    timeout: IS_CLOUD ? 30000 : 15000,
  });
  if (r.status() === 200) {
    const d = await r.json();
    return d.token || d.accessToken || '';
  }
  return '';
}

async function getDoctorToken(request: APIRequestContext, email: string, password: string): Promise<string> {
  for (const path of ['/auth/login', '/api/auth/login']) {
    try {
      const r = await request.post(`${DOCTOR_URL}${path}`, {
        data: { email, password },
        headers: { 'Content-Type': 'application/json' },
        timeout: IS_CLOUD ? 30000 : 15000,
      });
      if (r.status() === 200) {
        const d = await r.json();
        return d.token || d.accessToken || d.data?.token || '';
      }
    } catch { /* next */ }
  }
  return '';
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION A: HEALTH CHECKS (8 tests)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('A: Health Checks', () => {
  test('A1: Patient portal health', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/health`);
    expect(r.status()).toBe(200);
  });

  test('A2: Patient portal DB health', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/health/db`);
    expect(r.status()).toBe(200);
  });

  test('A3: Doctor portal health', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/health`);
    expect(r.status()).toBe(200);
  });

  test('A4: Doctor portal DB health', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/health/db`);
    expect(r.status()).toBe(200);
  });

  test('A5: Meeting server health', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/api/health`);
    expect(r.status()).toBe(200);
  });

  test('A6: Meeting server root health', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/health`);
    expect(r.status()).toBe(200);
  });

  test('A7: Patient portal root', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/`);
    expect(r.status()).toBe(200);
  });

  test('A8: Doctor portal root', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/`);
    expect(r.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION B: AUTHENTICATION (8 tests)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('B: Authentication', () => {
  test('B1: Patient1 login succeeds', async ({ request }) => {
    const token = await getPatientToken(request, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password);
    expect(token).toBeTruthy();
  });

  test('B2: Doctor login succeeds', async ({ request }) => {
    const token = await getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password);
    expect(token).toBeTruthy();
  });

  test('B3: Admin login succeeds', async ({ request }) => {
    const token = await getDoctorToken(request, CREDENTIALS.admin.email, CREDENTIALS.admin.password);
    expect(token).toBeTruthy();
  });

  test('B4: Patient + Doctor login SIMULTANEOUSLY', async ({ request }) => {
    const [pt, dt] = await Promise.all([
      getPatientToken(request, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password),
      getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password),
    ]);
    expect(pt).toBeTruthy();
    expect(dt).toBeTruthy();
  });

  test('B5: Doctor + Admin login SIMULTANEOUSLY', async ({ request }) => {
    const [t1, t2] = await Promise.all([
      getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password),
      getDoctorToken(request, CREDENTIALS.admin.email, CREDENTIALS.admin.password),
    ]);
    expect(t1).toBeTruthy();
    expect(t2).toBeTruthy();
  });

  test('B6: ALL THREE roles login SIMULTANEOUSLY', async ({ request }) => {
    const [pt, doc, adm] = await Promise.all([
      getPatientToken(request, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password),
      getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password),
      getDoctorToken(request, CREDENTIALS.admin.email, CREDENTIALS.admin.password),
    ]);
    expect(pt).toBeTruthy();
    expect(doc).toBeTruthy();
    expect(adm).toBeTruthy();
  });

  test('B7: Patient login returns valid token format', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/auth/login`, {
      data: { email: CREDENTIALS.patient1.email, password: CREDENTIALS.patient1.password },
    });
    expect(r.status()).toBe(200);
    const json = await r.json();
    expect(json.token).toBeTruthy();
  });

  test('B8: Doctor login returns JWT token', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/auth/login`, {
      data: { email: CREDENTIALS.doctor.email, password: CREDENTIALS.doctor.password },
    });
    expect(r.status()).toBe(200);
    const json = await r.json();
    expect(json.token).toMatch(/^eyJ/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION C: PATIENT APPOINTMENTS (10 tests)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('C: Patient Appointments', () => {
  test('C1: Patient gets appointments', async ({ request }) => {
    const token = await getPatientToken(request, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password);
    const r = await request.get(`${PATIENT_URL}/api/appointments`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('C2: Patient gets appointment pool', async ({ request }) => {
    const token = await getPatientToken(request, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password);
    const r = await request.get(`${PATIENT_URL}/api/appointment-pool`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('C3: Patient gets doctors list', async ({ request }) => {
    const token = await getPatientToken(request, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password);
    const r = await request.get(`${PATIENT_URL}/api/doctors`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('C4: Patient appointment history', async ({ request }) => {
    const token = await getPatientToken(request, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password);
    const r = await request.get(`${PATIENT_URL}/api/appointments/history`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('C5: Doctor gets all appointments', async ({ request }) => {
    const token = await getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password);
    const r = await request.get(`${DOCTOR_URL}/api/appointments`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('C6: Admin gets all appointments', async ({ request }) => {
    const token = await getDoctorToken(request, CREDENTIALS.admin.email, CREDENTIALS.admin.password);
    const r = await request.get(`${DOCTOR_URL}/api/appointments`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('C7: Patient + Doctor get appointments SIMULTANEOUSLY', async ({ request }) => {
    const [pt, dt] = await Promise.all([
      getPatientToken(request, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password),
      getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password),
    ]);
    const [r1, r2] = await Promise.all([
      request.get(`${PATIENT_URL}/api/appointments`, { headers: authHeaders(pt) }),
      request.get(`${DOCTOR_URL}/api/appointments`, { headers: authHeaders(dt) }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
  });

  test('C8: Doctor and Admin get appointments SIMULTANEOUSLY', async ({ request }) => {
    const [t1, t2] = await Promise.all([
      getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password),
      getDoctorToken(request, CREDENTIALS.admin.email, CREDENTIALS.admin.password),
    ]);
    const [r1, r2] = await Promise.all([
      request.get(`${DOCTOR_URL}/api/appointments`, { headers: authHeaders(t1) }),
      request.get(`${DOCTOR_URL}/api/appointments`, { headers: authHeaders(t2) }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
  });

  test('C9: ALL three roles get appointments SIMULTANEOUSLY', async ({ request }) => {
    const [pt, doc, adm] = await Promise.all([
      getPatientToken(request, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password),
      getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password),
      getDoctorToken(request, CREDENTIALS.admin.email, CREDENTIALS.admin.password),
    ]);
    const [r1, r2, r3] = await Promise.all([
      request.get(`${PATIENT_URL}/api/appointments`, { headers: authHeaders(pt) }),
      request.get(`${DOCTOR_URL}/api/appointments`, { headers: authHeaders(doc) }),
      request.get(`${DOCTOR_URL}/api/appointments`, { headers: authHeaders(adm) }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
    expect(r3.status()).toBe(200);
  });

  test('C10: Patient gets appointment-pool + doctors SIMULTANEOUSLY', async ({ request }) => {
    const token = await getPatientToken(request, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password);
    const [r1, r2] = await Promise.all([
      request.get(`${PATIENT_URL}/api/appointment-pool`, { headers: authHeaders(token) }),
      request.get(`${PATIENT_URL}/api/doctors`, { headers: authHeaders(token) }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION D: VIDEO MEETING (10 tests)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('D: Video Meeting', () => {
  test('D1: Meeting server health', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/api/health`);
    expect(r.status()).toBe(200);
  });

  test('D2: Patient video meeting health', async ({ request }) => {
    const token = await getPatientToken(request, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password);
    const r = await request.get(`${PATIENT_URL}/api/video-meeting/health`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('D3: Doctor video meeting health', async ({ request }) => {
    const token = await getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password);
    const r = await request.get(`${DOCTOR_URL}/api/video-meeting/health`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('D4: Video meeting config', async ({ request }) => {
    const token = await getPatientToken(request, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password);
    const r = await request.get(`${PATIENT_URL}/api/video-meeting/config`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('D5: Doctor creates meeting via /api/meetings/create', async ({ request }) => {
    const token = await getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password);
    const r = await request.post(`${MEETING_SERVER_URL}/api/meetings/create`, {
      headers: authHeaders(token),
      data: {
        title: 'Test Consultation D5',
        doctorId: CREDENTIALS.doctor.id,
        patientId: CREDENTIALS.patient1.id,
        appointmentId: 'APT-TEST-D5',
      },
    });
    expect([200, 201]).toContain(r.status());
  });

  test('D6: Doctor creates meeting via /api/meeting/create', async ({ request }) => {
    const token = await getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password);
    const r = await request.post(`${MEETING_SERVER_URL}/api/meeting/create`, {
      headers: authHeaders(token),
      data: {
        title: 'Test Consultation D6',
        doctorId: CREDENTIALS.doctor.id,
        patientId: CREDENTIALS.patient1.id,
      },
    });
    expect([200, 201]).toContain(r.status());
  });

  test('D7: ALL portals access meeting health SIMULTANEOUSLY', async ({ request }) => {
    const [pt, dt] = await Promise.all([
      getPatientToken(request, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password),
      getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password),
    ]);
    const [r1, r2, r3] = await Promise.all([
      request.get(`${PATIENT_URL}/api/video-meeting/health`, { headers: authHeaders(pt) }),
      request.get(`${DOCTOR_URL}/api/video-meeting/health`, { headers: authHeaders(dt) }),
      request.get(`${MEETING_SERVER_URL}/api/health`),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
    expect(r3.status()).toBe(200);
  });

  test('D8: Get meeting status (404 expected for non-existent)', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/api/meetings/TEST-NONEXIST/status`);
    expect([200, 404]).toContain(r.status());
  });

  test('D9: Get meeting participants (404 expected for non-existent)', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/api/meetings/TEST-NONEXIST/participants`);
    expect([200, 404]).toContain(r.status());
  });

  test('D10: Doctor and Admin video health SIMULTANEOUSLY', async ({ request }) => {
    const [t1, t2] = await Promise.all([
      getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password),
      getDoctorToken(request, CREDENTIALS.admin.email, CREDENTIALS.admin.password),
    ]);
    const [r1, r2] = await Promise.all([
      request.get(`${DOCTOR_URL}/api/video-meeting/health`, { headers: authHeaders(t1) }),
      request.get(`${DOCTOR_URL}/api/video-meeting/health`, { headers: authHeaders(t2) }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION E: PHR & HEALTH RECORDS (10 tests)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('E: PHR & Health Records', () => {
  test('E1: Patient gets PHR', async ({ request }) => {
    const token = await getPatientToken(request, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password);
    const r = await request.get(`${PATIENT_URL}/api/phr`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('E2: Patient gets vitals', async ({ request }) => {
    const token = await getPatientToken(request, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password);
    const r = await request.get(`${PATIENT_URL}/api/phr/vitals`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('E3: Patient gets medications', async ({ request }) => {
    const token = await getPatientToken(request, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password);
    const r = await request.get(`${PATIENT_URL}/api/phr/medications`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('E4: Patient gets allergies', async ({ request }) => {
    const token = await getPatientToken(request, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password);
    const r = await request.get(`${PATIENT_URL}/api/phr/allergies`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('E5: Patient gets conditions', async ({ request }) => {
    const token = await getPatientToken(request, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password);
    const r = await request.get(`${PATIENT_URL}/api/phr/conditions`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('E6: Patient gets living will', async ({ request }) => {
    const token = await getPatientToken(request, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password);
    const r = await request.get(`${PATIENT_URL}/api/phr/living-will`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('E7: Patient gets ALL PHR data SIMULTANEOUSLY', async ({ request }) => {
    const token = await getPatientToken(request, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password);
    const [r1, r2, r3, r4, r5] = await Promise.all([
      request.get(`${PATIENT_URL}/api/phr`, { headers: authHeaders(token) }),
      request.get(`${PATIENT_URL}/api/phr/vitals`, { headers: authHeaders(token) }),
      request.get(`${PATIENT_URL}/api/phr/medications`, { headers: authHeaders(token) }),
      request.get(`${PATIENT_URL}/api/phr/allergies`, { headers: authHeaders(token) }),
      request.get(`${PATIENT_URL}/api/phr/conditions`, { headers: authHeaders(token) }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
    expect(r3.status()).toBe(200);
    expect(r4.status()).toBe(200);
    expect(r5.status()).toBe(200);
  });

  test('E8: Patient + Doctor access SIMULTANEOUSLY', async ({ request }) => {
    const [pt, dt] = await Promise.all([
      getPatientToken(request, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password),
      getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password),
    ]);
    const [r1, r2] = await Promise.all([
      request.get(`${PATIENT_URL}/api/phr`, { headers: authHeaders(pt) }),
      request.get(`${DOCTOR_URL}/api/emr`, { headers: authHeaders(dt) }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
  });

  test('E9: All roles access records SIMULTANEOUSLY', async ({ request }) => {
    const [pt, doc, adm] = await Promise.all([
      getPatientToken(request, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password),
      getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password),
      getDoctorToken(request, CREDENTIALS.admin.email, CREDENTIALS.admin.password),
    ]);
    const [r1, r2, r3] = await Promise.all([
      request.get(`${PATIENT_URL}/api/phr`, { headers: authHeaders(pt) }),
      request.get(`${DOCTOR_URL}/api/emr`, { headers: authHeaders(doc) }),
      request.get(`${DOCTOR_URL}/api/emr`, { headers: authHeaders(adm) }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
    expect(r3.status()).toBe(200);
  });

  test('E10: Doctor views patient via emr/patient', async ({ request }) => {
    const token = await getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password);
    const r = await request.get(`${DOCTOR_URL}/api/emr/patient/${CREDENTIALS.patient1.id}`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION F: EMR & PRESCRIPTIONS (8 tests)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('F: EMR & Prescriptions', () => {
  test('F1: Doctor gets EMR list', async ({ request }) => {
    const token = await getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password);
    const r = await request.get(`${DOCTOR_URL}/api/emr`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('F2: Doctor gets patient EMR', async ({ request }) => {
    const token = await getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password);
    const r = await request.get(`${DOCTOR_URL}/api/emr/patient/${CREDENTIALS.patient1.id}`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('F3: Admin gets EMR list', async ({ request }) => {
    const token = await getDoctorToken(request, CREDENTIALS.admin.email, CREDENTIALS.admin.password);
    const r = await request.get(`${DOCTOR_URL}/api/emr`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('F4: Doctor gets patients list', async ({ request }) => {
    const token = await getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password);
    const r = await request.get(`${DOCTOR_URL}/api/patients`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('F5: Admin gets patients list', async ({ request }) => {
    const token = await getDoctorToken(request, CREDENTIALS.admin.email, CREDENTIALS.admin.password);
    const r = await request.get(`${DOCTOR_URL}/api/patients`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('F6: Doctor and Admin get patients SIMULTANEOUSLY', async ({ request }) => {
    const [t1, t2] = await Promise.all([
      getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password),
      getDoctorToken(request, CREDENTIALS.admin.email, CREDENTIALS.admin.password),
    ]);
    const [r1, r2] = await Promise.all([
      request.get(`${DOCTOR_URL}/api/patients`, { headers: authHeaders(t1) }),
      request.get(`${DOCTOR_URL}/api/patients`, { headers: authHeaders(t2) }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
  });

  test('F7: Medications metadata', async ({ request }) => {
    const token = await getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password);
    const r = await request.get(`${DOCTOR_URL}/api/metadata/medications`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('F8: Lab tests metadata', async ({ request }) => {
    const token = await getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password);
    const r = await request.get(`${DOCTOR_URL}/api/metadata/lab-tests`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION G: AI FEATURES (6 tests - only existing endpoints)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('G: AI Features', () => {
  test('G1: Doctor AI health endpoint', async ({ request }) => {
    const token = await getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password);
    const r = await request.get(`${DOCTOR_URL}/api/ai/health`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('G2: Doctor and Admin AI health SIMULTANEOUSLY', async ({ request }) => {
    const [t1, t2] = await Promise.all([
      getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password),
      getDoctorToken(request, CREDENTIALS.admin.email, CREDENTIALS.admin.password),
    ]);
    const [r1, r2] = await Promise.all([
      request.get(`${DOCTOR_URL}/api/ai/health`, { headers: authHeaders(t1) }),
      request.get(`${DOCTOR_URL}/api/ai/health`, { headers: authHeaders(t2) }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
  });

  test('G3: AI chat doctor [Req 4.2]', async ({ request }) => {
    const token = await getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password);
    const r = await request.post(`${DOCTOR_URL}/api/ai/chat`, {
      headers: authHeaders(token),
      data: { message: 'What are common symptoms of flu?' },
    });
    expect(r.status()).toBe(200);
  });

  test('G4: AI chat patient', async ({ request }) => {
    const token = await getPatientToken(request, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password);
    const r = await request.post(`${PATIENT_URL}/api/ai/chat`, {
      headers: authHeaders(token),
      data: { message: 'ฉันมีอาการปวดหัว ควรทำอย่างไร' },
    });
    expect(r.status()).toBe(200);
  });

  test('G5: Patient and Doctor AI chat SIMULTANEOUSLY', async ({ request }) => {
    test.setTimeout(60000); // AI can be slow
    const [pt, dt] = await Promise.all([
      getPatientToken(request, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password),
      getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password),
    ]);
    const [r1, r2] = await Promise.all([
      request.post(`${PATIENT_URL}/api/ai/chat`, { headers: authHeaders(pt), data: { message: 'How to treat headache?' }, timeout: 45000 }),
      request.post(`${DOCTOR_URL}/api/ai/chat`, { headers: authHeaders(dt), data: { message: 'Diagnosis for fever?' }, timeout: 45000 }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
  });

  test('G6: AI summarize [Req 2.2]', async ({ request }) => {
    const token = await getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password);
    const r = await request.post(`${DOCTOR_URL}/api/ai/summarize`, {
      headers: authHeaders(token),
      data: { text: 'Patient presents with headache for 3 days, low grade fever.' },
    });
    expect(r.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION H: NOTIFICATIONS (8 tests)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('H: Notifications', () => {
  test('H1: Patient gets notifications', async ({ request }) => {
    const token = await getPatientToken(request, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password);
    const r = await request.get(`${PATIENT_URL}/api/notifications`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('H2: Doctor gets notifications', async ({ request }) => {
    const token = await getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password);
    const r = await request.get(`${DOCTOR_URL}/api/notifications`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('H3: Admin gets notifications', async ({ request }) => {
    const token = await getDoctorToken(request, CREDENTIALS.admin.email, CREDENTIALS.admin.password);
    const r = await request.get(`${DOCTOR_URL}/api/notifications`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('H4: Patient + Doctor notifications SIMULTANEOUSLY', async ({ request }) => {
    const [pt, dt] = await Promise.all([
      getPatientToken(request, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password),
      getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password),
    ]);
    const [r1, r2] = await Promise.all([
      request.get(`${PATIENT_URL}/api/notifications`, { headers: authHeaders(pt) }),
      request.get(`${DOCTOR_URL}/api/notifications`, { headers: authHeaders(dt) }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
  });

  test('H5: Doctor and Admin notifications SIMULTANEOUSLY', async ({ request }) => {
    const [t1, t2] = await Promise.all([
      getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password),
      getDoctorToken(request, CREDENTIALS.admin.email, CREDENTIALS.admin.password),
    ]);
    const [r1, r2] = await Promise.all([
      request.get(`${DOCTOR_URL}/api/notifications`, { headers: authHeaders(t1) }),
      request.get(`${DOCTOR_URL}/api/notifications`, { headers: authHeaders(t2) }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
  });

  test('H6: Patient notification count', async ({ request }) => {
    const token = await getPatientToken(request, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password);
    const r = await request.get(`${PATIENT_URL}/api/notifications/count`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('H7: Doctor notification count', async ({ request }) => {
    const token = await getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password);
    const r = await request.get(`${DOCTOR_URL}/api/notifications/count`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('H8: ALL three roles get notifications SIMULTANEOUSLY', async ({ request }) => {
    const [pt, doc, adm] = await Promise.all([
      getPatientToken(request, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password),
      getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password),
      getDoctorToken(request, CREDENTIALS.admin.email, CREDENTIALS.admin.password),
    ]);
    const [r1, r2, r3] = await Promise.all([
      request.get(`${PATIENT_URL}/api/notifications`, { headers: authHeaders(pt) }),
      request.get(`${DOCTOR_URL}/api/notifications`, { headers: authHeaders(doc) }),
      request.get(`${DOCTOR_URL}/api/notifications`, { headers: authHeaders(adm) }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
    expect(r3.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION I: MEDICAL CONTENT (8 tests)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('I: Medical Content', () => {
  test('I1: Public medical content', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/medical-content`);
    expect(r.status()).toBe(200);
  });

  test('I2: Content medical endpoint', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/content/medical`);
    expect(r.status()).toBe(200);
  });

  test('I3: Health tips', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/content/health-tips`);
    expect(r.status()).toBe(200);
  });

  test('I4: Doctor clinical resources', async ({ request }) => {
    const token = await getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password);
    const r = await request.get(`${DOCTOR_URL}/api/clinical-resources`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('I5: Doctor content clinical', async ({ request }) => {
    const token = await getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password);
    const r = await request.get(`${DOCTOR_URL}/api/content/clinical`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('I6: Consultants list', async ({ request }) => {
    const token = await getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password);
    const r = await request.get(`${DOCTOR_URL}/api/consultants`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('I7: Admin clinical resources', async ({ request }) => {
    const token = await getDoctorToken(request, CREDENTIALS.admin.email, CREDENTIALS.admin.password);
    const r = await request.get(`${DOCTOR_URL}/api/clinical-resources`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('I8: Content tags medical', async ({ request }) => {
    const token = await getPatientToken(request, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password);
    const r = await request.get(`${PATIENT_URL}/api/content/tags/medical`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION J: ADMIN FEATURES (6 tests)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('J: Admin Features', () => {
  test('J1: Admin stats', async ({ request }) => {
    const token = await getDoctorToken(request, CREDENTIALS.admin.email, CREDENTIALS.admin.password);
    const r = await request.get(`${DOCTOR_URL}/api/admin/stats`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('J2: Admin pending doctors', async ({ request }) => {
    const token = await getDoctorToken(request, CREDENTIALS.admin.email, CREDENTIALS.admin.password);
    const r = await request.get(`${DOCTOR_URL}/api/admin/pending-doctors`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('J3: Doctor accesses admin stats (may be restricted)', async ({ request }) => {
    const token = await getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password);
    const r = await request.get(`${DOCTOR_URL}/api/admin/stats`, { headers: authHeaders(token) });
    expect([200, 403]).toContain(r.status());
  });

  test('J4: Doctors list via doctors endpoint', async ({ request }) => {
    const token = await getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password);
    const r = await request.get(`${DOCTOR_URL}/api/doctors`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('J5: ICD-10 codes', async ({ request }) => {
    const token = await getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password);
    const r = await request.get(`${DOCTOR_URL}/api/metadata/icd10-codes`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('J6: Admin and Doctor access SIMULTANEOUSLY', async ({ request }) => {
    const [t1, t2] = await Promise.all([
      getDoctorToken(request, CREDENTIALS.admin.email, CREDENTIALS.admin.password),
      getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password),
    ]);
    const [r1, r2] = await Promise.all([
      request.get(`${DOCTOR_URL}/api/admin/stats`, { headers: authHeaders(t1) }),
      request.get(`${DOCTOR_URL}/api/doctors`, { headers: authHeaders(t2) }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION K: UI NAVIGATION (10 tests)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('K: UI Navigation', () => {
  test('K1: Patient login page', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/login`);
    await expect(page).toHaveURL(/login/);
  });

  test('K2: Patient register page', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/register`);
    await expect(page).toHaveURL(/register/);
  });

  test('K3: Doctor login page', async ({ page }) => {
    await page.goto(`${DOCTOR_URL}/login`);
    await expect(page).toHaveURL(/login/);
  });

  test('K4: Patient root page', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/`);
    await page.waitForLoadState('networkidle');
    expect(await page.title()).toBeTruthy();
  });

  test('K5: Doctor root page', async ({ page }) => {
    await page.goto(`${DOCTOR_URL}/`);
    await page.waitForLoadState('networkidle');
    expect(await page.title()).toBeTruthy();
  });

  test('K6: Patient map page', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/map`);
    await page.waitForLoadState('networkidle');
    expect(await page.title()).toBeTruthy();
  });

  test('K7: Patient appointments page', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/appointments`);
    await page.waitForLoadState('networkidle');
    expect(await page.title()).toBeTruthy();
  });

  test('K8: Patient health-records page', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/health-records`);
    await page.waitForLoadState('networkidle');
    expect(await page.title()).toBeTruthy();
  });

  test('K9: Patient dashboard page', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    expect(await page.title()).toBeTruthy();
  });

  test('K10: Patient profile page', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/profile`);
    await page.waitForLoadState('networkidle');
    expect(await page.title()).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION L: CROSS-PORTAL DATA SYNC (8 tests)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('L: Cross-Portal Data Sync', () => {
  test('L1: Patient + Doctor appointments SIMULTANEOUSLY', async ({ request }) => {
    const [pt, dt] = await Promise.all([
      getPatientToken(request, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password),
      getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password),
    ]);
    const [r1, r2] = await Promise.all([
      request.get(`${PATIENT_URL}/api/appointments`, { headers: authHeaders(pt) }),
      request.get(`${DOCTOR_URL}/api/appointments`, { headers: authHeaders(dt) }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
  });

  test('L2: All THREE portals health SIMULTANEOUSLY', async ({ request }) => {
    const [r1, r2, r3] = await Promise.all([
      request.get(`${PATIENT_URL}/api/health`),
      request.get(`${DOCTOR_URL}/api/health`),
      request.get(`${MEETING_SERVER_URL}/api/health`),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
    expect(r3.status()).toBe(200);
  });

  test('L3: All portals DB health SIMULTANEOUSLY', async ({ request }) => {
    const [r1, r2] = await Promise.all([
      request.get(`${PATIENT_URL}/api/health/db`),
      request.get(`${DOCTOR_URL}/api/health/db`),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
  });

  test('L4: Content access both portals SIMULTANEOUSLY', async ({ request }) => {
    const token = await getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password);
    const [r1, r2] = await Promise.all([
      request.get(`${PATIENT_URL}/api/medical-content`),
      request.get(`${DOCTOR_URL}/api/clinical-resources`, { headers: authHeaders(token) }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
  });

  test('L5: Doctor views patient EMR', async ({ request }) => {
    const token = await getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password);
    const r = await request.get(`${DOCTOR_URL}/api/emr/patient/${CREDENTIALS.patient1.id}`, { headers: authHeaders(token) });
    expect(r.status()).toBe(200);
  });

  test('L6: FULL 3-ROLE CONCURRENT ACCESS', async ({ request }) => {
    const [pt, doc, adm] = await Promise.all([
      getPatientToken(request, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password),
      getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password),
      getDoctorToken(request, CREDENTIALS.admin.email, CREDENTIALS.admin.password),
    ]);
    const results = await Promise.all([
      request.get(`${PATIENT_URL}/api/appointments`, { headers: authHeaders(pt) }),
      request.get(`${DOCTOR_URL}/api/appointments`, { headers: authHeaders(doc) }),
      request.get(`${DOCTOR_URL}/api/appointments`, { headers: authHeaders(adm) }),
      request.get(`${PATIENT_URL}/api/phr`, { headers: authHeaders(pt) }),
      request.get(`${DOCTOR_URL}/api/emr`, { headers: authHeaders(doc) }),
      request.get(`${MEETING_SERVER_URL}/api/health`),
    ]);
    for (const r of results) {
      expect(r.status()).toBe(200);
    }
  });

  test('L7: All roles access notifications SIMULTANEOUSLY', async ({ request }) => {
    const [pt, doc, adm] = await Promise.all([
      getPatientToken(request, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password),
      getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password),
      getDoctorToken(request, CREDENTIALS.admin.email, CREDENTIALS.admin.password),
    ]);
    const [r1, r2, r3] = await Promise.all([
      request.get(`${PATIENT_URL}/api/notifications`, { headers: authHeaders(pt) }),
      request.get(`${DOCTOR_URL}/api/notifications`, { headers: authHeaders(doc) }),
      request.get(`${DOCTOR_URL}/api/notifications`, { headers: authHeaders(adm) }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
    expect(r3.status()).toBe(200);
  });

  test('L8: Multi-endpoint access in one session', async ({ request }) => {
    const token = await getDoctorToken(request, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password);
    const [r1, r2, r3, r4] = await Promise.all([
      request.get(`${DOCTOR_URL}/api/appointments`, { headers: authHeaders(token) }),
      request.get(`${DOCTOR_URL}/api/patients`, { headers: authHeaders(token) }),
      request.get(`${DOCTOR_URL}/api/emr`, { headers: authHeaders(token) }),
      request.get(`${DOCTOR_URL}/api/notifications`, { headers: authHeaders(token) }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
    expect(r3.status()).toBe(200);
    expect(r4.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION M: ERROR HANDLING & SECURITY (8 tests - INTENTIONAL ERROR CODES)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('M: Error Handling & Security', () => {
  test('M1: Invalid login returns error', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/auth/login`, {
      data: { email: 'invalid@test.com', password: 'wrongpassword' },
    });
    expect([400, 401, 404]).toContain(r.status());
  });

  test('M2: Access without token returns 401', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/appointments`);
    expect([401, 403]).toContain(r.status());
  });

  test('M3: Invalid token returns 401/403', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/appointments`, {
      headers: { Authorization: 'Bearer invalid_token_12345' },
    });
    expect([401, 403]).toContain(r.status());
  });

  test('M4: Non-existent endpoint returns 404', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/nonexistent-endpoint-xyz`);
    expect(r.status()).toBe(404);
  });

  test('M5: Empty body login fails', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/auth/login`, { data: {} });
    expect([400, 401]).toContain(r.status());
  });

  test('M6: Doctor portal invalid token', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/patients`, {
      headers: { Authorization: 'Bearer bad_doctor_token_xyz' },
    });
    expect([401, 403]).toContain(r.status());
  });

  test('M7: SQL injection attempt sanitized', async ({ request }) => {
    const token = await getPatientToken(request, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password);
    const r = await request.get(`${PATIENT_URL}/api/phr?id='; DROP TABLE users; --`, {
      headers: authHeaders(token),
    });
    expect([200, 400, 404]).toContain(r.status());
  });

  test('M8: XSS attempt in login sanitized', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/auth/login`, {
      data: { email: '<script>alert(1)</script>@test.com', password: 'test' },
    });
    expect([400, 401]).toContain(r.status());
  });
});
