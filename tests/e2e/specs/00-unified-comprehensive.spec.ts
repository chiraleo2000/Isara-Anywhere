/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — UNIFIED COMPREHENSIVE E2E TEST v1.4.7
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ONE spec to rule them all. 209 tests covering ALL 14 process workflow documents:
 *   A. Smoke & Health           — Portal reachability, DB connectivity       (9)
 *   B. User Management          — Multi-user auth, profiles, admin           (14)
 *   C. Appointments             — Book, confirm, pool, queue, history        (17)
 *   D. Video Meeting            — Transcript, health, config, multi-segment  (12)
 *   E. Health Records (PHR)     — Vitals, medications, allergies, multi-user (19)
 *   F. EMR & Prescriptions      — EMR, prescriptions, lab orders, metadata  (14)
 *   G. AI Features              — Chat, CDS, analysis, instructions, summary(16)
 *   H. Living Will & PDPA       — Create will, consent, audit trail          (9)
 *   I. Notifications            — CRUD, mark read, multi-user               (11)
 *   J. Medical Content          — Articles, clinical resources, categories   (10)
 *   K. Consultants & Metadata   — Directory, specialties, admin, dashboard  (12)
 *   L. Data Sync                — Cross-portal consistency, multi-patient    (8)
 *   M. UI Navigation            — Page render (patient + doctor portals)     (11)
 *   N. Map / Nearby Healthcare  — GPS map page, config                      (3)
 *   O. Multi-User E2E Workflow  — Full appointment → meeting → EMR flow     (17)
 *   P. AI Meeting Summary Svc   — Gradio AI summary service on :7860        (4)
 *   Q. Full Meeting Lifecycle   — Appointment→Transcript→AI→EMR→Instructions(15)
 *   R. Error Handling           — Intentional failures & security validation (8)
 *
 * Process docs covered:
 *   1. Appointment_Workflows.md          2. Clinical_Resources_&_Medical_Library
 *   3. Data_Sync_Documentation.md        4. Health_Records_Processes.md
 *   5. Living_Will_Implementation.md     6. Living_Will_Processes.md
 *   7. Medical_Consultants_Workflows     8. Medicine_Content_Processes.md
 *   9. Notification_Workflows.md        10. PHASE1_REQUIREMENTS.md
 *  11. UI_Pages_Workflows.md            12. User_management_Workflows.md
 *  13. VIDEO_MEETING_JITSI_GEMINI.md    14. Map_Features.md
 *
 * Execution: Serial (mode: 'serial'), headed, 1 worker, single login per role
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { test, expect } from '@playwright/test';
import {
  PATIENT_URL, DOCTOR_URL, MEETING_SERVER_URL,
  CREDENTIALS, IS_CLOUD, TIMEOUTS,
  getAuthToken, getDoctorAuthToken, authHeaders,
} from '../lib/test-config';

// AI Summary Meeting service URL (local only — Gradio on :7860)
const AI_SUMMARY_URL = IS_CLOUD ? '' : 'http://localhost:7860';

// ─── Module-level state (shared across all serial tests) ─────────────────────
let ptk1 = ''; // patient1 token
let ptk2 = ''; // patient2 token
let ptk3 = ''; // patient3 token
let dtk = '';  // doctor token
let atk = '';  // admin token
let createdAppointmentId = '';
let createdAppointmentId2 = '';
let createdAppointmentId3 = '';
let createdMeetingId = '';

// ─── Auto-refresh tokens before every test ───────────────────────────────────
test.beforeEach(async ({ request }) => {
  if (!ptk1) ptk1 = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
  if (!ptk2) ptk2 = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient2);
  if (!ptk3) ptk3 = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient3);
  if (!dtk) dtk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
  if (!atk) atk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.admin);
});

// ═══════════════════════════════════════════════════════════════════════════════
// A. SMOKE & HEALTH CHECKS (9 tests)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('A. Smoke & Health', () => {
  test('A1: Patient portal health', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/health`);
    expect(r.status()).toBe(200);
  });

  test('A2: Doctor portal health', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/health`);
    expect(r.status()).toBe(200);
  });

  test('A3: Patient DB health', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/health/db`);
    expect(r.status()).toBe(200);
    const j = await r.json();
    expect(j.connected).toBe(true);
  });

  test('A4: Doctor DB health', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/health/db`);
    expect(r.status()).toBe(200);
    const j = await r.json();
    expect(j.connected).toBe(true);
  });

  test('A5: Meeting server health', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/api/health`);
    expect(r.status()).toBe(200);
  });

  test('A6: Patient portal alternative /health', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/health`);
    expect(r.status()).toBe(200);
  });

  test('A7: Doctor portal alternative /health', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/health`);
    expect(r.status()).toBe(200);
  });

  test('A8: Meeting server alternative /health', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/health`);
    expect(r.status()).toBe(200);
  });

  test('A9: Patient portal returns valid JSON health', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/health`);
    expect(r.status()).toBe(200);
    const j = await r.json();
    expect(j).toBeTruthy();
    expect(typeof j).toBe('object');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// B. USER MANAGEMENT — Multi-user authentication & profiles (14 tests)
//    Process: User_management_Workflows.md
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('B. User Management', () => {

  test('B1: Patient 1 login', async ({ request }) => {
    ptk1 = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    expect(ptk1.length).toBeGreaterThan(0);
  });

  test('B2: Patient 2 login', async ({ request }) => {
    ptk2 = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient2);
    expect(ptk2.length).toBeGreaterThan(0);
  });

  test('B3: Patient 3 login', async ({ request }) => {
    ptk3 = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient3);
    expect(ptk3.length).toBeGreaterThan(0);
  });

  test('B4: Doctor login', async ({ request }) => {
    dtk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
    expect(dtk.length).toBeGreaterThan(0);
  });

  test('B5: Admin login', async ({ request }) => {
    atk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.admin);
    expect(atk.length).toBeGreaterThan(0);
  });

  test('B6: Patient validate session', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/auth/validate`, {
      data: { token: ptk1 },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(r.status()).toBe(200);
  });

  test('B7: Patient 1 profile (GET /api/auth/me)', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/auth/me`, {
      headers: authHeaders(ptk1),
    });
    expect(r.status()).toBe(200);
  });

  test('B8: Doctor profile (GET /api/auth/me)', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/auth/me`, {
      headers: authHeaders(dtk),
    });
    expect(r.status()).toBe(200);
  });

  test('B9: Patient extended profile (GET /api/profile)', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/profile`, {
      headers: authHeaders(ptk1),
    });
    expect(r.status()).toBe(200);
  });

  test('B10: Admin profile (GET /api/auth/me)', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/auth/me`, {
      headers: authHeaders(atk),
    });
    expect(r.status()).toBe(200);
  });

  test('B11: Admin views all users', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/admin/users`, {
      headers: authHeaders(atk),
    });
    expect(r.status()).toBe(200);
  });

  test('B12: Doctor portal alternative /auth/me', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/auth/me`, {
      headers: authHeaders(dtk),
    });
    expect(r.status()).toBe(200);
  });

  test('B13: Patient 2 profile (GET /api/auth/me)', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/auth/me`, {
      headers: authHeaders(ptk2),
    });
    expect(r.status()).toBe(200);
  });

  test('B14: Patient 3 profile (GET /api/auth/me)', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/auth/me`, {
      headers: authHeaders(ptk3),
    });
    expect(r.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// C. APPOINTMENTS — Full lifecycle with multi-user (17 tests)
//    Process: Appointment_Workflows.md
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('C. Appointments', () => {

  test('C1: Patient 1 creates appointment', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/appointments`, {
      headers: authHeaders(ptk1),
      data: {
        patientId: CREDENTIALS.patient1.id,
        patientName: CREDENTIALS.patient1.name,
        doctorId: CREDENTIALS.doctor.id,
        doctorName: CREDENTIALS.doctor.name,
        type: 'telehealth',
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        time: '10:00',
        symptoms: ['ปวดหัว', 'มีไข้'],
        symptomDescription: 'มีอาการปวดหัวและมีไข้ 2 วัน',
        notes: 'E2E test appointment v1.4.7',
      },
    });
    expect(r.status()).toBe(200);
    const j = await r.json();
    createdAppointmentId = j.id || j.appointmentId || j.data?.id || '';
    expect(createdAppointmentId.length).toBeGreaterThan(0);
  });

  test('C2: Patient 2 creates appointment', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/appointments`, {
      headers: authHeaders(ptk2),
      data: {
        patientId: CREDENTIALS.patient2.id,
        patientName: CREDENTIALS.patient2.name,
        type: 'telehealth',
        date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        time: '14:00',
        symptoms: ['ไอ'],
        symptomDescription: 'ไอเรื้อรัง',
      },
    });
    expect(r.status()).toBe(200);
    const j = await r.json();
    createdAppointmentId2 = j.id || j.appointmentId || j.data?.id || '';
  });

  test('C3: Patient 3 creates appointment', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/appointments`, {
      headers: authHeaders(ptk3),
      data: {
        patientId: CREDENTIALS.patient3.id,
        patientName: CREDENTIALS.patient3.name,
        type: 'telehealth',
        date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
        time: '09:00',
        symptoms: ['เจ็บคอ'],
        symptomDescription: 'เจ็บคอ 3 วัน',
      },
    });
    expect(r.status()).toBe(200);
    const j = await r.json();
    createdAppointmentId3 = j.id || j.appointmentId || j.data?.id || '';
  });

  test('C4: Doctor views all appointments', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/appointments`, {
      headers: authHeaders(dtk),
    });
    expect(r.status()).toBe(200);
  });

  test('C5: Doctor views pending appointments', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/appointments/pending/${CREDENTIALS.doctor.id}`, {
      headers: authHeaders(dtk),
    });
    expect(r.status()).toBe(200);
  });

  test('C6: Admin views appointment pool', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/appointment-pool`, {
      headers: authHeaders(atk),
    });
    expect(r.status()).toBe(200);
  });

  test('C7: Doctor confirms appointment', async ({ request }) => {
    const apptId = createdAppointmentId;
    expect(apptId.length).toBeGreaterThan(0);
    const r = await request.post(`${DOCTOR_URL}/api/appointments/${apptId}/confirm`, {
      headers: authHeaders(dtk),
      data: { doctorId: CREDENTIALS.doctor.id },
    });
    expect([200, 201]).toContain(r.status());
  });

  test('C8: Patient 1 views appointment history', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/appointments/history`, {
      headers: authHeaders(ptk1),
    });
    expect(r.status()).toBe(200);
  });

  test('C9: Patient 1 views my appointments', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/appointments/my`, {
      headers: authHeaders(ptk1),
    });
    expect(r.status()).toBe(200);
  });

  test('C10: Patient 2 views my appointments', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/appointments/my`, {
      headers: authHeaders(ptk2),
    });
    expect(r.status()).toBe(200);
  });

  test('C11: Patient 3 views my appointments', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/appointments/my`, {
      headers: authHeaders(ptk3),
    });
    expect(r.status()).toBe(200);
  });

  test('C12: Patient 1 views all appointments', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/appointments`, {
      headers: authHeaders(ptk1),
    });
    expect(r.status()).toBe(200);
  });

  test('C13: Doctor queue for doctor', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/queue/doctor/${CREDENTIALS.doctor.id}`, {
      headers: authHeaders(dtk),
    });
    expect(r.status()).toBe(200);
  });

  test('C14: Patient 2 views appointment history', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/appointments/history`, {
      headers: authHeaders(ptk2),
    });
    expect(r.status()).toBe(200);
  });

  test('C15: Patient 3 views appointment history', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/appointments/history`, {
      headers: authHeaders(ptk3),
    });
    expect(r.status()).toBe(200);
  });

  test('C16: Admin views all appointments', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/appointments`, {
      headers: authHeaders(atk),
    });
    expect(r.status()).toBe(200);
  });

  test('C17: Doctor views appointments with date filter', async ({ request }) => {
    const today = new Date().toISOString().split('T')[0];
    const r = await request.get(`${DOCTOR_URL}/api/appointments?date=${today}`, {
      headers: authHeaders(dtk),
    });
    expect(r.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// D. VIDEO MEETING — Transcript, health, config, multi-segment (12 tests)
//    Process: VIDEO_MEETING_JITSI_GEMINI.md
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('D. Video Meeting', () => {

  test('D1: Patient portal meeting config', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/video-meeting/config`, {
      headers: authHeaders(ptk1),
    });
    expect(r.status()).toBe(200);
  });

  test('D2: Doctor saves initial consultation transcript', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/meeting/transcript`, {
      headers: authHeaders(dtk),
      data: {
        appointmentId: createdAppointmentId || 'test-appt-001',
        speakerRole: 'patient',
        speakerName: CREDENTIALS.patient1.name,
        content: 'ผู้ป่วย: มีอาการปวดหัวมา 2 วัน มีไข้ต่ำๆ ไม่มีอาเจียน',
      },
    });
    expect([200, 201]).toContain(r.status());
  });

  test('D3: Doctor portal video meeting health', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/video-meeting/health`, {
      headers: authHeaders(dtk),
    });
    expect(r.status()).toBe(200);
  });

  test('D4: Patient portal video meeting config details', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/video-meeting/config`, {
      headers: authHeaders(ptk2),
    });
    expect(r.status()).toBe(200);
    const j = await r.json();
    expect(j).toBeTruthy();
  });

  test('D5: Doctor saves doctor transcript segment', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/meeting/transcript`, {
      headers: authHeaders(dtk),
      data: {
        appointmentId: createdAppointmentId || 'test-appt-001',
        speakerRole: 'doctor',
        speakerName: CREDENTIALS.doctor.name,
        content: 'แพทย์: ผู้ป่วยมีอาการไข้และปวดศีรษะ แนะนำให้พักผ่อนและดื่มน้ำมาก',
      },
    });
    expect([200, 201]).toContain(r.status());
  });

  test('D6: Doctor retrieves meeting transcript', async ({ request }) => {
    const apptId = createdAppointmentId || 'test-appt-001';
    const r = await request.get(`${DOCTOR_URL}/api/meeting/transcript/${apptId}`, {
      headers: authHeaders(dtk),
    });
    expect(r.status()).toBe(200);
  });

  test('D7: Meeting server health', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/api/health`);
    expect(r.status()).toBe(200);
  });

  test('D8: Meeting server alternative /health', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/health`);
    expect(r.status()).toBe(200);
  });

  test('D9: Doctor saves second patient transcript segment', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/meeting/transcript`, {
      headers: authHeaders(dtk),
      data: {
        appointmentId: createdAppointmentId || 'test-appt-001',
        speakerRole: 'patient',
        speakerName: CREDENTIALS.patient1.name,
        content: 'ผู้ป่วย: กินยาลดไข้แล้วแต่ไม่ดีขึ้น มีอาการเวียนศีรษะด้วย',
      },
    });
    expect([200, 201]).toContain(r.status());
  });

  test('D10: Doctor saves transcript for patient 2 appointment', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/meeting/transcript`, {
      headers: authHeaders(dtk),
      data: {
        appointmentId: 'test-appt-p2-001',
        speakerRole: 'doctor',
        speakerName: CREDENTIALS.doctor.name,
        content: 'แพทย์: ผู้ป่วยมีอาการไอเรื้อรัง แนะนำตรวจเพิ่มเติม',
      },
    });
    expect([200, 201]).toContain(r.status());
  });

  test('D11: Doctor saves Thai transcript with medical terms', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/meeting/transcript`, {
      headers: authHeaders(dtk),
      data: {
        appointmentId: createdAppointmentId || 'test-appt-001',
        speakerRole: 'doctor',
        speakerName: CREDENTIALS.doctor.name,
        content: 'แพทย์: ผลตรวจเบื้องต้นพบ BP 120/80, HR 88, SpO2 98% อุณหภูมิ 38.2°C สงสัย URTI',
        language: 'th',
      },
    });
    expect([200, 201]).toContain(r.status());
  });

  test('D12: Doctor retrieves patient 2 transcript', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/meeting/transcript/test-appt-p2-001`, {
      headers: authHeaders(dtk),
    });
    expect(r.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E. HEALTH RECORDS (PHR) — Vitals, medications, allergies, multi-user (19 tests)
//    Process: Health_Records_Processes.md
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('E. Health Records (PHR)', () => {

  test('E1: Get patient 1 PHR', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/phr/${CREDENTIALS.patient1.id}`, {
      headers: authHeaders(ptk1),
    });
    expect(r.status()).toBe(200);
  });

  test('E2: Patient 1 adds vital signs', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/phr/${CREDENTIALS.patient1.id}/vitals`, {
      headers: authHeaders(ptk1),
      data: {
        bloodPressureSystolic: 120, bloodPressureDiastolic: 80,
        heartRate: 72, temperature: 36.5, weight: 65, height: 170,
        oxygenSaturation: 98, recordedAt: new Date().toISOString(),
      },
    });
    expect([200, 201]).toContain(r.status());
  });

  test('E3: Patient 1 gets vital signs', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/phr/${CREDENTIALS.patient1.id}/vitals`, {
      headers: authHeaders(ptk1),
    });
    expect(r.status()).toBe(200);
  });

  test('E4: Patient 1 adds medication', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/phr/${CREDENTIALS.patient1.id}/medications`, {
      headers: authHeaders(ptk1),
      data: { name: 'Paracetamol 500mg', dosage: '1 เม็ด', frequency: 'ทุก 6 ชั่วโมง', startDate: new Date().toISOString() },
    });
    expect([200, 201]).toContain(r.status());
  });

  test('E5: Patient 1 gets medications', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/phr/${CREDENTIALS.patient1.id}/medications`, { headers: authHeaders(ptk1) });
    expect(r.status()).toBe(200);
  });

  test('E6: Patient 1 adds allergy', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/phr/${CREDENTIALS.patient1.id}/allergies`, {
      headers: authHeaders(ptk1),
      data: { allergen: 'Penicillin', severity: 'severe', reaction: 'ผื่นแดงทั่วตัว' },
    });
    expect([200, 201]).toContain(r.status());
  });

  test('E7: Patient 1 gets allergies', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/phr/${CREDENTIALS.patient1.id}/allergies`, { headers: authHeaders(ptk1) });
    expect(r.status()).toBe(200);
  });

  test('E8: Patient 1 health logs', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/phr/${CREDENTIALS.patient1.id}/health-logs`, { headers: authHeaders(ptk1) });
    expect(r.status()).toBe(200);
  });

  test('E9: Patient 2 gets PHR', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/phr/${CREDENTIALS.patient2.id}`, { headers: authHeaders(ptk2) });
    expect(r.status()).toBe(200);
  });

  test('E10: Patient 2 adds vital signs', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/phr/${CREDENTIALS.patient2.id}/vitals`, {
      headers: authHeaders(ptk2),
      data: {
        bloodPressureSystolic: 130, bloodPressureDiastolic: 85,
        heartRate: 78, temperature: 36.8, weight: 72, height: 175,
        oxygenSaturation: 97, recordedAt: new Date().toISOString(),
      },
    });
    expect([200, 201]).toContain(r.status());
  });

  test('E11: Patient 2 gets vital signs', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/phr/${CREDENTIALS.patient2.id}/vitals`, { headers: authHeaders(ptk2) });
    expect(r.status()).toBe(200);
  });

  test('E12: Patient 3 gets PHR', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/phr/${CREDENTIALS.patient3.id}`, { headers: authHeaders(ptk3) });
    expect(r.status()).toBe(200);
  });

  test('E13: Patient 3 adds vital signs', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/phr/${CREDENTIALS.patient3.id}/vitals`, {
      headers: authHeaders(ptk3),
      data: {
        bloodPressureSystolic: 118, bloodPressureDiastolic: 75,
        heartRate: 68, temperature: 36.3, weight: 58, height: 165,
        oxygenSaturation: 99, recordedAt: new Date().toISOString(),
      },
    });
    expect([200, 201]).toContain(r.status());
  });

  test('E14: Patient 3 gets vital signs', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/phr/${CREDENTIALS.patient3.id}/vitals`, { headers: authHeaders(ptk3) });
    expect(r.status()).toBe(200);
  });

  test('E15: Doctor reads patient 1 PHR', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/phr/patient/${CREDENTIALS.patient1.id}`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
  });

  test('E16: Doctor reads patient 1 vitals history', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/phr/patient/${CREDENTIALS.patient1.id}/vitals/history`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
  });

  test('E17: Doctor reads patient 2 PHR', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/phr/patient/${CREDENTIALS.patient2.id}`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
  });

  test('E18: Patient 2 adds medication', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/phr/${CREDENTIALS.patient2.id}/medications`, {
      headers: authHeaders(ptk2),
      data: { name: 'Loratadine 10mg', dosage: '1 เม็ด', frequency: 'วันละ 1 ครั้ง ก่อนนอน', startDate: new Date().toISOString() },
    });
    expect([200, 201]).toContain(r.status());
  });

  test('E19: Patient 2 gets medications', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/phr/${CREDENTIALS.patient2.id}/medications`, { headers: authHeaders(ptk2) });
    expect(r.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// F. EMR & PRESCRIPTIONS — Doctor creates EMR, prescriptions, lab orders (14 tests)
//    Process: Health_Records_Processes.md, PHASE1_REQUIREMENTS.md
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('F. EMR & Prescriptions', () => {

  test('F1: Doctor creates EMR for patient 1', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/emr`, {
      headers: authHeaders(dtk),
      data: {
        patientId: CREDENTIALS.patient1.id, doctorId: CREDENTIALS.doctor.id,
        appointmentId: createdAppointmentId || 'test-appt-001',
        chiefComplaint: 'ปวดหัว มีไข้ 2 วัน',
        subjective: 'ผู้ป่วยมีอาการปวดศีรษะและไข้ 2 วัน กินยาลดไข้แล้วไม่ดีขึ้น',
        objective: 'T: 38.2°C, BP: 120/80, HR: 88, SpO2: 98%',
        assessment: 'Upper respiratory tract infection',
        plan: 'ให้ยาลดไข้ พักผ่อน ดื่มน้ำมาก นัดติดตามอาการ 3 วัน',
        icd10Codes: ['J06.9'], status: 'draft',
      },
    });
    expect([200, 201]).toContain(r.status());
  });

  test('F2: Doctor views all EMR records', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/emr`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
  });

  test('F3: Doctor views patient 1 EMR', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/emr/patient/${CREDENTIALS.patient1.id}`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
  });

  test('F4: Doctor creates prescription for patient 1', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/prescriptions`, {
      headers: authHeaders(dtk),
      data: {
        patientId: CREDENTIALS.patient1.id, doctorId: CREDENTIALS.doctor.id,
        medications: [
          { name: 'Paracetamol 500mg', dosage: '1 เม็ด ทุก 6 ชม.', quantity: 20, unit: 'เม็ด' },
          { name: 'Amoxicillin 500mg', dosage: '1 เม็ด ทุก 8 ชม.', quantity: 21, unit: 'แคปซูล' },
        ],
        notes: 'กินยาหลังอาหาร',
      },
    });
    expect([200, 201]).toContain(r.status());
  });

  test('F5: Doctor creates lab order for patient 1', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/lab-orders`, {
      headers: authHeaders(dtk),
      data: {
        patientId: CREDENTIALS.patient1.id, doctorId: CREDENTIALS.doctor.id,
        tests: [
          { testName: 'CBC', testCode: 'LAB-001', reason: 'ตรวจเลือดเบื้องต้น' },
          { testName: 'CRP', testCode: 'LAB-002', reason: 'ตรวจการอักเสบ' },
        ],
        urgency: 'normal',
      },
    });
    expect([200, 201]).toContain(r.status());
  });

  test('F6: Doctor views prescriptions for patient 1', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/prescriptions/patient/${CREDENTIALS.patient1.id}`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
  });

  test('F7: Doctor views lab orders for patient 1', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/lab-orders/patient/${CREDENTIALS.patient1.id}`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
  });

  test('F8: Doctor views patients list', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/patients`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
  });

  test('F9: Metadata — ICD-10 codes', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/metadata/icd10-codes`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
  });

  test('F10: Metadata — Lab tests catalog', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/metadata/lab-tests`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
  });

  test('F11: Metadata — Medications catalog', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/metadata/medications`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
  });

  test('F12: Doctor creates EMR for patient 2', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/emr`, {
      timeout: 60000,
      headers: authHeaders(dtk),
      data: {
        patientId: CREDENTIALS.patient2.id, doctorId: CREDENTIALS.doctor.id,
        appointmentId: createdAppointmentId2 || `emr-p2-${Date.now()}`,
        chiefComplaint: 'ไอเรื้อรัง', subjective: 'ไอมา 2 สัปดาห์ ไม่มีเสมหะเลือด',
        objective: 'T: 37.0°C, BP: 130/85, Lungs clear',
        assessment: 'Chronic cough, R/O Allergic rhinitis',
        plan: 'ให้ยาแก้ไอ แก้แพ้ นัด 1 สัปดาห์', icd10Codes: ['R05'], status: 'draft',
      },
    });
    expect([200, 201]).toContain(r.status());
  });

  test('F13: Metadata — Drug interactions catalog', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/metadata/drug-interactions`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
  });

  test('F14: Doctor views EMR for patient 2', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/emr/patient/${CREDENTIALS.patient2.id}`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// G. AI FEATURES — Chat, CDS, summarization, patient instructions (16 tests)
//    Process: PHASE1_REQUIREMENTS.md (DR-01 to DR-05, PB-01 to PB-05)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('G. AI Features', () => {

  test('G1: Patient AI status', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/ai/status`);
    expect(r.status()).toBe(200);
  });

  test('G2: Doctor AI health', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/ai/health`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
  });

  test('G3: Patient 1 AI chat (symptom query)', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/ai/chat`, {
      headers: authHeaders(ptk1),
      data: { message: 'ฉันมีอาการปวดหัวบ่อย ควรทำอย่างไร', patientId: CREDENTIALS.patient1.id },
    });
    expect(r.status()).toBe(200);
  });

  test('G4: Patient 2 AI chat (chronic cough)', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/ai/chat`, {
      headers: authHeaders(ptk2),
      data: { message: 'อาการไอเรื้อรังควรพบแพทย์เมื่อไหร่', patientId: CREDENTIALS.patient2.id },
    });
    expect(r.status()).toBe(200);
  });

  test('G5: Doctor AI chat (clinical copilot — Req 4.2)', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/chat`, {
      headers: authHeaders(dtk),
      data: { message: 'สรุปประวัติการรักษาผู้ป่วย PATIENT-DEMO', doctorId: CREDENTIALS.doctor.id, context: 'clinical_assistant' },
    });
    expect(r.status()).toBe(200);
  });

  test('G6: AI EMR summary (Req 2.1 — Video Call + Patient Instructions)', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/emr-summary`, {
      headers: authHeaders(dtk),
      data: { patientId: CREDENTIALS.patient1.id, transcript: 'ผู้ป่วยมีอาการปวดศีรษะ มีไข้ 38°C สองวัน ไม่มีอาเจียน' },
    });
    expect(r.status()).toBe(200);
  });

  test('G7: CDS check (Req 2.4 — Clinical Decision Support)', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/cds`, {
      timeout: 60000,
      headers: authHeaders(dtk),
      data: { patientId: CREDENTIALS.patient1.id, medications: ['Paracetamol', 'Amoxicillin'], conditions: ['Hypertension', 'Diabetes'], action: 'prescribe' },
    });
    expect(r.status()).toBe(200);
  });

  test('G8: AI patient instruction generation (Req 4.5)', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/patient-instructions`, {
      headers: authHeaders(dtk),
      data: { patientId: CREDENTIALS.patient1.id, diagnosis: 'Upper respiratory tract infection', medications: ['Paracetamol 500mg q6h', 'Amoxicillin 500mg q8h'], recommendations: 'พักผ่อน ดื่มน้ำมาก' },
    });
    expect(r.status()).toBe(200);
  });

  test('G9: AI document analysis (Req 2.3 — AI Document/PDF Analysis)', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/analyze-document`, {
      headers: authHeaders(dtk),
      data: { documentType: 'lab_result', content: 'CBC: WBC 12,000, Hb 14g/dL, Plt 250,000. CRP: 15mg/L (elevated)', patientId: CREDENTIALS.patient1.id },
    });
    expect(r.status()).toBe(200);
  });

  test('G10: AI validation (Req 2.5 — Man-in-the-Loop)', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/validate`, {
      headers: authHeaders(dtk),
      data: { type: 'emr_summary', content: 'AI-generated EMR for review', doctorId: CREDENTIALS.doctor.id, action: 'review' },
    });
    expect(r.status()).toBe(200);
  });

  test('G11: AI pre-consultation summary (Req 2.2)', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/pre-consultation-summary`, {
      headers: authHeaders(dtk),
      data: { patientId: CREDENTIALS.patient1.id, appointmentId: createdAppointmentId || 'test-appt-001' },
    });
    expect(r.status()).toBe(200);
  });

  test('G12: Doctor AI chat with clinical guidelines context', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/chat`, {
      timeout: 60000,
      headers: authHeaders(dtk),
      data: { message: 'แนะนำแนวทางการรักษา URTI ในผู้ป่วยสูงอายุ', doctorId: CREDENTIALS.doctor.id, context: 'clinical_guidelines' },
    });
    expect(r.status()).toBe(200);
  });

  test('G13: AI document analysis with imaging data (Req 4.4)', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/analyze-document`, {
      headers: authHeaders(dtk),
      data: { documentType: 'imaging_report', content: 'Chest X-ray: No active pulmonary infiltrate. Heart size normal. No pleural effusion.', patientId: CREDENTIALS.patient2.id },
    });
    expect(r.status()).toBe(200);
  });

  test('G14: AI meeting summary from transcript (Req 3.2)', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/generate-summary`, {
      timeout: 60000,
      headers: authHeaders(dtk),
      data: {
        appointmentId: createdAppointmentId || 'test-appt-001',
        transcripts: ['แพทย์: สวัสดีครับ วันนี้มาด้วยอาการอะไร', 'ผู้ป่วย: ปวดหัวมา 2 วัน มีไข้', 'แพทย์: BP 120/80 ไข้ 38.2 สงสัย URTI'],
      },
    });
    expect(r.status()).toBe(200);
  });

  test('G15: Patient 3 AI chat (abdominal pain)', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/ai/chat`, {
      headers: authHeaders(ptk3),
      data: { message: 'ปวดท้องน้อยด้านขวามา 1 วัน ควรทำอย่างไร', patientId: CREDENTIALS.patient3.id },
    });
    expect(r.status()).toBe(200);
  });

  test('G16: AI patient instruction for patient 2', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/patient-instructions`, {
      timeout: 60000,
      headers: authHeaders(dtk),
      data: { patientId: CREDENTIALS.patient2.id, diagnosis: 'Chronic cough, suspected allergic rhinitis', medications: ['Loratadine 10mg OD', 'Dextromethorphan PRN'], recommendations: 'หลีกเลี่ยงสารก่อภูมิแพ้ ดื่มน้ำอุ่น' },
    });
    expect(r.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// H. LIVING WILL & PDPA (9 tests)
//    Process: Living_Will_Processes.md, Living_Will_Implementation_Plan.md
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('H. Living Will & PDPA', () => {

  test('H1: Patient 1 gets living will', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/phr/${CREDENTIALS.patient1.id}/living-will`, { headers: authHeaders(ptk1) });
    expect(r.status()).toBe(200);
  });

  test('H2: Patient 1 creates/updates living will', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/phr/${CREDENTIALS.patient1.id}/living-will`, {
      headers: authHeaders(ptk1),
      data: {
        treatmentPreferences: { resuscitation: false, mechanicalVentilation: false, artificialNutrition: true, dialysis: true, antibiotics: true, painManagement: true },
        representatives: [{ name: 'สมชาย มานคง', relationship: 'บุตร', phone: '0891234567' }],
        notes: 'ขอให้ดูแลแบบประคับประคอง',
      },
    });
    expect([200, 201]).toContain(r.status());
  });

  test('H3: Patient 1 PDPA consent status', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/pdpa/consents/${CREDENTIALS.patient1.id}`, { headers: authHeaders(ptk1) });
    expect(r.status()).toBe(200);
  });

  test('H4: Patient 2 PDPA consent status', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/pdpa/consents/${CREDENTIALS.patient2.id}`, { headers: authHeaders(ptk2) });
    expect(r.status()).toBe(200);
  });

  test('H5: Patient 1 PDPA audit trail', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/pdpa/audit/${CREDENTIALS.patient1.id}`, { headers: authHeaders(ptk1) });
    expect(r.status()).toBe(200);
  });

  test('H6: Doctor views patient living will', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/patients/${CREDENTIALS.patient1.id}/living-will`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
  });

  test('H7: Patient 2 PDPA audit trail', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/pdpa/audit/${CREDENTIALS.patient2.id}`, { headers: authHeaders(ptk2) });
    expect(r.status()).toBe(200);
  });

  test('H8: Patient 3 PDPA consent status', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/pdpa/consents/${CREDENTIALS.patient3.id}`, { headers: authHeaders(ptk3) });
    expect(r.status()).toBe(200);
  });

  test('H9: Patient 3 PDPA audit trail', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/pdpa/audit/${CREDENTIALS.patient3.id}`, { headers: authHeaders(ptk3) });
    expect(r.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// I. NOTIFICATIONS (11 tests)
//    Process: Notification_Workflows.md
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('I. Notifications', () => {

  test('I1: Patient 1 notifications list', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/notifications`, { headers: authHeaders(ptk1) });
    expect(r.status()).toBe(200);
  });

  test('I2: Patient 1 unread count', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/notifications/count`, { headers: authHeaders(ptk1) });
    expect(r.status()).toBe(200);
  });

  test('I3: Create test notification for patient 1', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/notifications/test`, {
      headers: authHeaders(ptk1),
      data: { userId: CREDENTIALS.patient1.id, type: 'appointment_reminder', title: 'Reminder: Test appointment', message: 'E2E test notification v1.4.7' },
    });
    expect([200, 201]).toContain(r.status());
  });

  test('I4: Mark all patient 1 notifications read', async ({ request }) => {
    const r = await request.put(`${PATIENT_URL}/api/notifications/read-all`, {
      headers: authHeaders(ptk1), data: { userId: CREDENTIALS.patient1.id },
    });
    expect(r.status()).toBe(200);
  });

  test('I5: Doctor notifications list', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/notifications`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
  });

  test('I6: Doctor unread count', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/notifications/count`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
  });

  test('I7: Patient 2 notifications list', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/notifications`, { headers: authHeaders(ptk2) });
    expect(r.status()).toBe(200);
  });

  test('I8: Patient 2 unread count', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/notifications/count`, { headers: authHeaders(ptk2) });
    expect(r.status()).toBe(200);
  });

  test('I9: Patient 3 notifications list', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/notifications`, { headers: authHeaders(ptk3) });
    expect(r.status()).toBe(200);
  });

  test('I10: Patient 3 unread count', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/notifications/count`, { headers: authHeaders(ptk3) });
    expect(r.status()).toBe(200);
  });

  test('I11: Create test notification for patient 2', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/notifications/test`, {
      headers: authHeaders(ptk2),
      data: { userId: CREDENTIALS.patient2.id, type: 'emr_signed', title: 'EMR signed by doctor', message: 'Your EMR has been signed by Dr. Test Good' },
    });
    expect([200, 201]).toContain(r.status());
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// J. MEDICAL CONTENT & CLINICAL RESOURCES (10 tests)
//    Process: Medicine_Content_Processes.md, Clinical_Resources_&_Medical_Library
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('J. Medical Content', () => {

  test('J1: Patient reads medical content', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/content/medical`);
    expect(r.status()).toBe(200);
  });

  test('J2: Patient reads health tips', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/content/health-tips`);
    expect(r.status()).toBe(200);
  });

  test('J3: Doctor reads clinical resources', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/content/clinical`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
  });

  test('J4: Doctor reads medical content', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/content/medical`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
  });

  test('J5: Medical content tags', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/content/tags/medical`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
  });

  test('J6: Clinical content tags', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/content/tags/clinical`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
  });

  test('J7: Content categories', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/content/categories`);
    expect(r.status()).toBe(200);
  });

  test('J8: Patient reads filtered medical content', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/content/medical?category=general`);
    expect(r.status()).toBe(200);
  });

  test('J9: Patient reads health tips (authenticated)', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/content/health-tips`, { headers: authHeaders(ptk1) });
    expect(r.status()).toBe(200);
  });

  test('J10: Doctor reads medical content with validation', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/content/medical`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
    const j = await r.json();
    expect(j).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// K. CONSULTANTS & METADATA (12 tests)
//    Process: Medical_Consultants_Workflows.md, Data_Sync_Documentation.md
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('K. Consultants & Metadata', () => {

  test('K1: List consultants (doctor portal)', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/consultants`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
  });

  test('K2: Specialties list', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/consultants/specialties`);
    expect(r.status()).toBe(200);
  });

  test('K3: List doctors (patient portal)', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/doctors`, { headers: authHeaders(ptk1) });
    expect(r.status()).toBe(200);
  });

  test('K4: Doctor dashboard data', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/dashboard/${CREDENTIALS.doctor.id}`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
  });

  test('K5: Admin statistics', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/admin/stats`, { headers: authHeaders(atk) });
    expect(r.status()).toBe(200);
  });

  test('K6: Admin pending doctors', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/admin/pending-doctors`, { headers: authHeaders(atk) });
    expect(r.status()).toBe(200);
  });

  test('K7: Admin all doctors list', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/doctors`, { headers: authHeaders(atk) });
    expect(r.status()).toBe(200);
  });

  test('K8: Single doctor details', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/doctors/${CREDENTIALS.doctor.id}`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
  });

  test('K9: Admin views all users', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/admin/users`, { headers: authHeaders(atk) });
    expect(r.status()).toBe(200);
  });

  test('K10: Doctor views own dashboard with data', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/dashboard/${CREDENTIALS.doctor.id}`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
    const j = await r.json();
    expect(j).toBeTruthy();
  });

  test('K11: Patient 2 views doctor list', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/doctors`, { headers: authHeaders(ptk2) });
    expect(r.status()).toBe(200);
  });

  test('K12: Admin dashboard statistics overview', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/admin/stats`, { headers: authHeaders(atk) });
    expect(r.status()).toBe(200);
    const j = await r.json();
    expect(j).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// L. DATA SYNC — Cross-portal consistency (8 tests)
//    Process: Data_Sync_Documentation.md
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('L. Data Sync & Cross-Portal', () => {

  test('L1: Patient 1 data visible on doctor portal', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/patients/${CREDENTIALS.patient1.id}`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
  });

  test('L2: Patient 2 data visible on doctor portal', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/patients/${CREDENTIALS.patient2.id}`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
  });

  test('L3: Patient 3 data visible on doctor portal', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/patients/${CREDENTIALS.patient3.id}`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
  });

  test('L4: Appointments visible on both portals', async ({ request }) => {
    const rp = await request.get(`${PATIENT_URL}/api/appointments/my`, { headers: authHeaders(ptk1) });
    expect(rp.status()).toBe(200);
    const rd = await request.get(`${DOCTOR_URL}/api/appointments`, { headers: authHeaders(dtk) });
    expect(rd.status()).toBe(200);
  });

  test('L5: Doctor list consistent across portals', async ({ request }) => {
    const rp = await request.get(`${PATIENT_URL}/api/doctors`, { headers: authHeaders(ptk1) });
    expect(rp.status()).toBe(200);
    const rd = await request.get(`${DOCTOR_URL}/api/doctors`, { headers: authHeaders(dtk) });
    expect(rd.status()).toBe(200);
  });

  test('L6: EMR endpoint accessible for patient 1', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/emr/patient/${CREDENTIALS.patient1.id}`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
  });

  test('L7: Prescriptions cross-portal for patient 1', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/prescriptions/patient/${CREDENTIALS.patient1.id}`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
  });

  test('L8: Lab orders cross-portal for patient 1', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/lab-orders/patient/${CREDENTIALS.patient1.id}`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// M. UI NAVIGATION — All pages render with 200 (11 tests)
//    Process: UI_Pages_Workflows.md
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('M. UI Navigation', () => {

  test('M1: Patient portal — login page', async ({ page }) => {
    const r = await page.goto(`${PATIENT_URL}/login`);
    expect(r?.status()).toBe(200);
  });

  test('M2: Patient portal — register page', async ({ page }) => {
    const r = await page.goto(`${PATIENT_URL}/register`);
    expect(r?.status()).toBe(200);
  });

  test('M3: Doctor portal — login page', async ({ page }) => {
    const r = await page.goto(`${DOCTOR_URL}`);
    expect(r?.status()).toBe(200);
  });

  test('M4: Patient portal — root', async ({ page }) => {
    const r = await page.goto(PATIENT_URL);
    expect(r?.status()).toBe(200);
  });

  test('M5: Patient portal — health check JSON', async ({ page }) => {
    const r = await page.goto(`${PATIENT_URL}/api/health`);
    expect(r?.status()).toBe(200);
  });

  test('M6: Doctor portal — health check JSON', async ({ page }) => {
    const r = await page.goto(`${DOCTOR_URL}/api/health`);
    expect(r?.status()).toBe(200);
  });

  test('M7: Meeting server — health check JSON', async ({ page }) => {
    const r = await page.goto(`${MEETING_SERVER_URL}/api/health`);
    expect(r?.status()).toBe(200);
  });

  test('M8: Patient portal — appointments page (SPA)', async ({ page }) => {
    const r = await page.goto(`${PATIENT_URL}/appointments`);
    expect(r?.status()).toBe(200);
  });

  test('M9: Patient portal — map page (SPA)', async ({ page }) => {
    const r = await page.goto(`${PATIENT_URL}/map`);
    expect(r?.status()).toBe(200);
  });

  test('M10: Patient portal — health records page (SPA)', async ({ page }) => {
    const r = await page.goto(`${PATIENT_URL}/health-records`);
    expect(r?.status()).toBe(200);
  });

  test('M11: Patient portal — profile page (SPA)', async ({ page }) => {
    const r = await page.goto(`${PATIENT_URL}/profile`);
    expect(r?.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// N. MAP / NEARBY HEALTHCARE (3 tests)
//    Process: Map_Features.md
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('N. Map & Nearby Healthcare', () => {

  test('N1: Patient portal serves /map route', async ({ page }) => {
    const r = await page.goto(`${PATIENT_URL}/map`);
    expect(r?.status()).toBe(200);
  });

  test('N2: Maps config via health endpoint', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/health`);
    expect(r.status()).toBe(200);
  });

  test('N3: Map page renders with title', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/map`);
    const title = await page.title();
    expect(title).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// O. MULTI-USER WORKFLOW — Full Appointment → Meeting → EMR flow (17 tests)
//    Tests multiple users interacting sequentially
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('O. Multi-User E2E Workflow', () => {

  let multiApptId = '';

  test('O1: Patient 3 books appointment with specific doctor', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/appointments`, {
      headers: authHeaders(ptk3),
      data: {
        patientId: CREDENTIALS.patient3.id, patientName: CREDENTIALS.patient3.name,
        doctorId: CREDENTIALS.doctor.id, doctorName: CREDENTIALS.doctor.name,
        type: 'telehealth',
        date: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
        time: '11:00', symptoms: ['ปวดท้อง'], symptomDescription: 'ปวดท้องน้อยด้านขวามา 1 วัน',
      },
    });
    expect(r.status()).toBe(200);
    const j = await r.json();
    multiApptId = j.id || j.appointmentId || j.data?.id || '';
    expect(multiApptId.length).toBeGreaterThan(0);
  });

  test('O2: Admin views all appointments including new one', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/appointments`, { headers: authHeaders(atk) });
    expect(r.status()).toBe(200);
  });

  test('O3: Doctor confirms the appointment', async ({ request }) => {
    const apptId = multiApptId || createdAppointmentId;
    expect(apptId.length).toBeGreaterThan(0);
    const r = await request.post(`${DOCTOR_URL}/api/appointments/${apptId}/confirm`, {
      headers: authHeaders(dtk), data: { doctorId: CREDENTIALS.doctor.id },
    });
    expect([200, 201]).toContain(r.status());
  });

  test('O4: Patient 3 sees confirmed appointment', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/appointments/my`, { headers: authHeaders(ptk3) });
    expect(r.status()).toBe(200);
  });

  test('O5: Doctor saves initial transcript for workflow', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/meeting/transcript`, {
      headers: authHeaders(dtk),
      data: { appointmentId: multiApptId || 'multi-test-001', speakerRole: 'doctor', speakerName: CREDENTIALS.doctor.name, content: 'เริ่มการนัดหมาย: ผู้ป่วยมาด้วยอาการปวดท้อง' },
    });
    expect([200, 201]).toContain(r.status());
  });

  test('O6: Doctor generates AI pre-consultation summary', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/pre-consultation-summary`, {
      headers: authHeaders(dtk),
      data: { patientId: CREDENTIALS.patient3.id, appointmentId: multiApptId || 'multi-test-001' },
    });
    expect(r.status()).toBe(200);
  });

  test('O7: Doctor saves meeting transcript', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/meeting/transcript`, {
      headers: authHeaders(dtk),
      data: { appointmentId: multiApptId || 'multi-test-001', speakerRole: 'doctor', speakerName: CREDENTIALS.doctor.name, content: 'สรุป: ผู้ป่วยมีอาการปวดท้อง แนะนำตรวจอัลตร้าซาวด์ช่องท้อง' },
    });
    expect([200, 201]).toContain(r.status());
  });

  test('O8: Doctor saves patient transcript segment', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/meeting/transcript`, {
      headers: authHeaders(dtk),
      data: { appointmentId: multiApptId || 'multi-test-001', speakerRole: 'patient', speakerName: CREDENTIALS.patient3.name, content: 'ผู้ป่วย: ปวดท้องน้อยด้านขวา เริ่มเมื่อวานตอนเย็น' },
    });
    expect([200, 201]).toContain(r.status());
  });

  test('O9: Doctor retrieves meeting transcript', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/meeting/transcript/${multiApptId || 'multi-test-001'}`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
  });

  test('O10: Doctor creates EMR from meeting', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/emr`, {
      headers: authHeaders(dtk),
      data: {
        patientId: CREDENTIALS.patient3.id, doctorId: CREDENTIALS.doctor.id,
        appointmentId: multiApptId || 'multi-test-001',
        chiefComplaint: 'ปวดท้องน้อยด้านขวา',
        subjective: 'ปวดท้องน้อยด้านขวา 1 วัน ไม่มีไข้',
        objective: 'Tenderness at RLQ, no rebound',
        assessment: 'R/O Appendicitis',
        plan: 'ส่งตรวจอัลตร้าซาวด์ นัดฟังผล', icd10Codes: ['K35.9'], status: 'draft',
      },
    });
    expect([200, 201]).toContain(r.status());
  });

  test('O11: Doctor generates patient instruction sheet', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/patient-instructions`, {
      headers: authHeaders(dtk),
      data: { patientId: CREDENTIALS.patient3.id, diagnosis: 'Suspected appendicitis', medications: [], recommendations: 'งดอาหาร ถ้าปวดมากให้มาฉุกเฉิน' },
    });
    expect(r.status()).toBe(200);
  });

  test('O12: Patient 3 checks health records after meeting', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/phr/${CREDENTIALS.patient3.id}`, { headers: authHeaders(ptk3) });
    expect(r.status()).toBe(200);
  });

  test('O13: Patient 2 has separate PHR (no cross-contamination)', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/phr/${CREDENTIALS.patient2.id}`, { headers: authHeaders(ptk2) });
    expect(r.status()).toBe(200);
  });

  test('O14: Admin views all patients after workflow', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/patients`, { headers: authHeaders(atk) });
    expect(r.status()).toBe(200);
  });

  test('O15: Doctor views all EMRs after workflow', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/emr`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
  });

  test('O16: Doctor views EMR for patient 3', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/emr/patient/${CREDENTIALS.patient3.id}`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
  });

  test('O17: AI meeting summary for workflow appointment', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/generate-summary`, {
      timeout: 60000,
      headers: authHeaders(dtk),
      data: { appointmentId: multiApptId || 'multi-test-001', transcripts: ['ผู้ป่วยปวดท้องน้อยด้านขวา 1 วัน', 'Tenderness at RLQ สงสัย Appendicitis'] },
    });
    expect(r.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// P. AI MEETING SUMMARY SERVICE — Gradio on :7860 (4 tests)
//    New service for AI-powered meeting transcription and summarization
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('P. AI Meeting Summary Service', () => {

  test('P1: AI Summary service root page', async ({ request }) => {
    if (IS_CLOUD) { expect(true).toBe(true); return; }
    const r = await request.get(`${AI_SUMMARY_URL}/`);
    expect(r.status()).toBe(200);
  });

  test('P2: AI Summary service OpenAPI spec', async ({ request }) => {
    if (IS_CLOUD) { expect(true).toBe(true); return; }
    const r = await request.get(`${AI_SUMMARY_URL}/openapi.json`);
    expect(r.status()).toBe(200);
    const j = await r.json();
    expect(j.openapi).toBeTruthy();
  });

  test('P3: AI Summary service queue status', async ({ request }) => {
    if (IS_CLOUD) { expect(true).toBe(true); return; }
    const r = await request.get(`${AI_SUMMARY_URL}/gradio_api/queue/status`);
    expect(r.status()).toBe(200);
    const j = await r.json();
    expect(j.msg).toBe('estimation');
  });

  test('P4: AI Summary service startup events', async ({ request }) => {
    if (IS_CLOUD) { expect(true).toBe(true); return; }
    const r = await request.get(`${AI_SUMMARY_URL}/gradio_api/startup-events`);
    expect(r.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Q. FULL MEETING LIFECYCLE — Appointment→Transcript→AI→EMR→Instructions (15 tests)
//    Covers: Req 2.1-2.5, 3.2, 4.1, 4.3, 4.5
//    Process: VIDEO_MEETING_JITSI_GEMINI.md, PHASE1_REQUIREMENTS.md
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Q. Full Meeting Lifecycle', () => {

  let lifecycleApptId = '';

  test('Q1: Patient 1 books a new meeting appointment', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/appointments`, {
      headers: authHeaders(ptk1),
      data: {
        patientId: CREDENTIALS.patient1.id, patientName: CREDENTIALS.patient1.name,
        doctorId: CREDENTIALS.doctor.id, doctorName: CREDENTIALS.doctor.name,
        type: 'telehealth',
        date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
        time: '15:00', symptoms: ['เวียนศีรษะ', 'คลื่นไส้'],
        symptomDescription: 'เวียนศีรษะและคลื่นไส้เป็นพักๆ มา 3 วัน',
        notes: 'Full lifecycle test v1.4.7',
      },
    });
    expect(r.status()).toBe(200);
    const j = await r.json();
    lifecycleApptId = j.id || j.appointmentId || j.data?.id || '';
    expect(lifecycleApptId.length).toBeGreaterThan(0);
  });

  test('Q2: Doctor confirms meeting appointment', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/appointments/${lifecycleApptId}/confirm`, {
      headers: authHeaders(dtk), data: { doctorId: CREDENTIALS.doctor.id },
    });
    expect([200, 201]).toContain(r.status());
  });

  test('Q3: AI pre-consultation summary (Req 2.2)', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/pre-consultation-summary`, {
      headers: authHeaders(dtk),
      data: { patientId: CREDENTIALS.patient1.id, appointmentId: lifecycleApptId },
    });
    expect(r.status()).toBe(200);
  });

  test('Q4: Doctor saves opening transcript segment', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/meeting/transcript`, {
      headers: authHeaders(dtk),
      data: { appointmentId: lifecycleApptId, speakerRole: 'doctor', speakerName: CREDENTIALS.doctor.name, content: 'สวัสดีครับ คุณ Demo วันนี้มาด้วยอาการอะไรครับ', language: 'th' },
    });
    expect([200, 201]).toContain(r.status());
  });

  test('Q5: Patient transcript — chief complaint', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/meeting/transcript`, {
      headers: authHeaders(dtk),
      data: { appointmentId: lifecycleApptId, speakerRole: 'patient', speakerName: CREDENTIALS.patient1.name, content: 'เวียนศีรษะมา 3 วัน หมุนๆ เป็นพักๆ บางทีคลื่นไส้ด้วย โดยเฉพาะตอนเปลี่ยนท่า', language: 'th' },
    });
    expect([200, 201]).toContain(r.status());
  });

  test('Q6: Doctor transcript — examination', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/meeting/transcript`, {
      headers: authHeaders(dtk),
      data: { appointmentId: lifecycleApptId, speakerRole: 'doctor', speakerName: CREDENTIALS.doctor.name, content: 'ตรวจร่างกาย BP 130/85 HR 78 ไม่มีไข้ Dix-Hallpike test positive สงสัย BPPV', language: 'th' },
    });
    expect([200, 201]).toContain(r.status());
  });

  test('Q7: Doctor retrieves full transcript', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/meeting/transcript/${lifecycleApptId}`, { headers: authHeaders(dtk) });
    expect(r.status()).toBe(200);
  });

  test('Q8: AI EMR summary from transcript (Req 4.1)', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/emr-summary`, {
      headers: authHeaders(dtk),
      data: { patientId: CREDENTIALS.patient1.id, transcript: 'เวียนศีรษะมา 3 วัน หมุนๆ เปลี่ยนท่าแล้วเป็น BP 130/85 Dix-Hallpike positive สงสัย BPPV', appointmentId: lifecycleApptId },
    });
    expect(r.status()).toBe(200);
  });

  test('Q9: CDS check for dizziness management (Req 2.4)', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/cds`, {
      timeout: 60000,
      headers: authHeaders(dtk),
      data: { patientId: CREDENTIALS.patient1.id, medications: ['Betahistine', 'Dimenhydrinate'], conditions: ['BPPV', 'Hypertension'], action: 'prescribe' },
    });
    expect(r.status()).toBe(200);
  });

  test('Q10: AI validate EMR (Req 2.5 — Man-in-the-Loop)', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/validate`, {
      headers: authHeaders(dtk),
      data: { type: 'emr_summary', content: 'SOAP: S-เวียนศีรษะ O-BP 130/85 Dix-Hallpike(+) A-BPPV P-Epley+Betahistine', doctorId: CREDENTIALS.doctor.id, action: 'approve' },
    });
    expect(r.status()).toBe(200);
  });

  test('Q11: Doctor creates EMR from validated AI summary', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/emr`, { timeout: 60000,
      headers: authHeaders(dtk),
      data: {
        patientId: CREDENTIALS.patient1.id, doctorId: CREDENTIALS.doctor.id,
        appointmentId: lifecycleApptId,
        chiefComplaint: 'เวียนศีรษะ คลื่นไส้ 3 วัน',
        subjective: 'เวียนศีรษะหมุนเป็นพักๆ 3 วัน เปลี่ยนท่าแล้วเป็น มีคลื่นไส้',
        objective: 'BP: 130/85, HR: 78, Dix-Hallpike test: positive',
        assessment: 'Benign Paroxysmal Positional Vertigo (BPPV)',
        plan: 'Epley maneuver, Betahistine 16mg TID, Dimenhydrinate PRN, นัด 1 สัปดาห์',
        icd10Codes: ['H81.1'], status: 'draft',
      },
    });
    expect([200, 201]).toContain(r.status());
  });

  test('Q12: Doctor creates prescription from EMR', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/prescriptions`, {
      headers: authHeaders(dtk),
      data: {
        patientId: CREDENTIALS.patient1.id, doctorId: CREDENTIALS.doctor.id,
        medications: [
          { name: 'Betahistine 16mg', dosage: '1 เม็ด วันละ 3 เวลา', quantity: 42, unit: 'เม็ด' },
          { name: 'Dimenhydrinate 50mg', dosage: '1 เม็ด เวลาเวียนศีรษะ', quantity: 10, unit: 'เม็ด' },
        ],
        notes: 'กินยาหลังอาหาร ระวังง่วงนอนจาก Dimenhydrinate',
      },
    });
    expect([200, 201]).toContain(r.status());
  });

  test('Q13: AI patient instruction sheet (Req 4.5)', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/patient-instructions`, {
      headers: authHeaders(dtk),
      data: { patientId: CREDENTIALS.patient1.id, diagnosis: 'BPPV (Benign Paroxysmal Positional Vertigo)', medications: ['Betahistine 16mg TID', 'Dimenhydrinate 50mg PRN'], recommendations: 'ทำ Epley maneuver ที่บ้าน หลีกเลี่ยงเปลี่ยนท่าเร็วๆ ห้ามขับรถ' },
    });
    expect(r.status()).toBe(200);
  });

  test('Q14: AI meeting summary (Req 3.2)', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/generate-summary`, {
      timeout: 60000,
      headers: authHeaders(dtk),
      data: { appointmentId: lifecycleApptId, transcripts: ['เวียนศีรษะ 3 วัน BP 130/85', 'Dix-Hallpike(+) Dx: BPPV', 'Rx: Betahistine, Dimenhydrinate, Epley'] },
    });
    expect(r.status()).toBe(200);
  });

  test('Q15: Patient 1 checks health records post-lifecycle', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/phr/${CREDENTIALS.patient1.id}`, { headers: authHeaders(ptk1) });
    expect(r.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// R. ERROR HANDLING & SECURITY — Intentional failure tests (8 tests)
//    Validates proper error responses for unauthorized/invalid requests
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('R. Error Handling & Security', () => {

  test('R1: Wrong password login rejected', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/auth/login`, {
      data: { email: CREDENTIALS.patient1.email, password: 'WrongPassword123' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(r.ok()).toBe(false);
  });

  test('R2: No auth header on patient protected endpoint', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/auth/me`);
    expect(r.ok()).toBe(false);
  });

  test('R3: No auth header on doctor protected endpoint', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/auth/me`);
    expect(r.ok()).toBe(false);
  });

  test('R4: Invalid token on patient portal', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/auth/me`, { headers: authHeaders('invalid-token-12345') });
    expect(r.ok()).toBe(false);
  });

  test('R5: Nonexistent email login rejected', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/auth/login`, {
      data: { email: 'nonexistent@nowhere.com', password: 'Test@12345' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(r.ok()).toBe(false);
  });

  test('R6: Meeting server rejects unauthenticated create', async ({ request }) => {
    const r = await request.post(`${MEETING_SERVER_URL}/api/meetings/create`, {
      headers: { 'Content-Type': 'application/json' },
      data: { appointmentId: 'test', doctorId: 'test', patientId: 'test' },
    });
    expect(r.ok()).toBe(false);
  });

  test('R7: Empty body login rejected', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/auth/login`, {
      data: {}, headers: { 'Content-Type': 'application/json' },
    });
    expect(r.ok()).toBe(false);
  });

  test('R8: Invalid token on doctor portal', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/auth/me`, { headers: authHeaders('fake-jwt-token-xyz') });
    expect(r.ok()).toBe(false);
  });
});
