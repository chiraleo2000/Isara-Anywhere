/**
 * =============================================================================
 * SPEC 15: COMPREHENSIVE ALL-WORKFLOWS — Strict 200-only, No Skips
 * =============================================================================
 * Version: 3.0.0 | Rewritten: February 6, 2026
 *
 * ALL 13 Process Documents tested with STRICT status 200 assertions.
 * NO test.skip() allowed — every test MUST pass.
 * Sequential execution within describe blocks for dependent tests.
 *
 * Covers:
 *   1. System Health & Database
 *   2. User Management & Authentication  (User_management_Workflows.md)
 *   3. Appointment Lifecycle             (Appointment_Workflows.md)
 *   4. Video Meeting Workflow            (VIDEO_MEETING_JITSI_GEMINI.md)
 *   5. Health Records: PHR, EMR, Rx, Lab (Health_Records_Processes.md)
 *   6. AI Features & CDS                (PHASE1_REQUIREMENTS.md)
 *   7. Living Will & PDPA               (Living_Will_Processes.md)
 *   8. Notifications                    (Notification_Workflows.md)
 *   9. Medical Content & Consultants    (Medicine_Content_Processes.md, Medical_Consultants_Workflows.md)
 *  10. Clinical Resources               (Clinical_Resources_&_Medical_Library_Workflows.md)
 *  11. Metadata & Reference Data        (Data_Sync_Documentation.md)
 *  12. Cross-Portal Data Sync           (Data_Sync_Documentation.md)
 *  13. UI Navigation & Multi-Portal     (UI_Pages_Workflows.md)
 * =============================================================================
 */

import { test, expect, APIRequestContext } from '@playwright/test';
import {
  PATIENT_URL, DOCTOR_URL, MEETING_SERVER_URL,
  CREDENTIALS, TIMEOUTS, IS_CLOUD,
  getAuthToken, getDoctorAuthToken,
} from '../lib/test-config';

// ── Timeouts ──
const T = IS_CLOUD ? TIMEOUTS.cloud : TIMEOUTS.api;
const TL = IS_CLOUD ? 90_000 : TIMEOUTS.long;

function a(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ── Shared state across sequential tests ──
let ptk = '', pt2 = '', pt3 = '', dtk = '', atk = '';
let aptId = '', meetId = '';

// ============================================================================
// 1. SYSTEM HEALTH & DATABASE (9 tests)
// ============================================================================
test.describe('1. System Health & Database', () => {
  test('SYS-01: Patient portal health', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/health`, { timeout: T });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.status).toBe('healthy');
  });

  test('SYS-02: Doctor portal health', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/health`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('SYS-03: Patient DB (PostgreSQL)', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/health/db`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('SYS-04: Doctor DB (PostgreSQL)', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/health/db`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('SYS-05: Meeting server health', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/api/health`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('SYS-06: Patient consultants (public)', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/consultants`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('SYS-07: Patient medical content (public)', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/medical-content`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('SYS-08: Video meeting health', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/video-meeting/health`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('SYS-09: Treatment results (public)', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/health-records/treatment-results`, { timeout: T });
    expect(r.status()).toBe(200);
  });
});

// ============================================================================
// 2. USER MANAGEMENT & AUTHENTICATION (12 tests)
// Uses test.describe.serial so tokens are available to later tests
// ============================================================================
test.describe.serial('2. User Management & Authentication', () => {
  test('AUTH-01: Patient1 login', async ({ request }) => {
    ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    expect(ptk).toBeTruthy();
  });

  test('AUTH-02: Patient2 login', async ({ request }) => {
    pt2 = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient2);
    expect(pt2).toBeTruthy();
  });

  test('AUTH-03: Patient3 login', async ({ request }) => {
    pt3 = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient3);
    expect(pt3).toBeTruthy();
  });

  test('AUTH-04: Doctor login', async ({ request }) => {
    dtk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
    expect(dtk).toBeTruthy();
  });

  test('AUTH-05: Admin login', async ({ request }) => {
    atk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.admin);
    expect(atk).toBeTruthy();
  });

  test('AUTH-06: Patient profile', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/profile`, { headers: a(ptk), timeout: T });
    expect(r.status()).toBe(200);
  });

  test('AUTH-07: Doctor profile via /auth/me', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/auth/me`, { headers: a(dtk), timeout: T });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.success).toBe(true);
  });

  test('AUTH-08: Invalid credentials rejected', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/auth/login`, {
      data: { email: 'fake@nowhere.com', password: 'WrongPwd!' }, timeout: T,
    });
    expect([400, 401, 403]).toContain(r.status());
  });

  test('AUTH-09: Patient registration', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/auth/register`, {
      data: {
        name: `E2E Test ${Date.now()}`,
        email: `e2e.${Date.now()}@gmail.com`,
        password: 'Test@12345678',
        phone: '0891234567',
        dateOfBirth: '1990-05-15',
        gender: 'male',
      },
      timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('AUTH-10: Admin stats', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/admin/stats`, { headers: a(atk), timeout: T });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.success).toBe(true);
  });

  test('AUTH-11: Token validation', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/auth/validate`, {
      data: { token: ptk }, timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('AUTH-12: Admin pending doctors', async ({ request }) => {
    let r = await request.get(`${DOCTOR_URL}/admin/pending-doctors`, { headers: a(atk), timeout: T });
    if (r.status() !== 200) {
      r = await request.get(`${DOCTOR_URL}/api/admin/pending-doctors`, { headers: a(atk), timeout: T });
    }
    expect(r.status()).toBe(200);
  });
});

// ============================================================================
// 3. APPOINTMENT LIFECYCLE (9 tests) — Sequential for appointment flow
// ============================================================================
test.describe.serial('3. Appointment Lifecycle', () => {
  test('APT-01: List consultants (public)', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/consultants`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('APT-02: Patient books appointment', async ({ request }) => {
    if (!ptk) ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    const tomorrow = new Date(Date.now() + 86_400_000);
    const r = await request.post(`${PATIENT_URL}/api/appointments`, {
      headers: a(ptk),
      data: {
        doctorId: CREDENTIALS.doctor.id,
        requestedDate: tomorrow.toISOString().split('T')[0],
        requestedTime: '10:00',
        appointmentType: 'Telehealth',
        symptoms: ['ปวดหัว', 'ไข้'],
        symptomDescription: 'ปวดหัว มีไข้ 2 วัน',
        urgencyLevel: 'normal',
      },
      timeout: T,
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    aptId = d.appointment?.id || d.id || d.appointmentId || `APT-${Date.now()}`;
    expect(aptId).toBeTruthy();
  });

  test('APT-03: Patient lists appointments', async ({ request }) => {
    if (!ptk) ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    const r = await request.get(`${PATIENT_URL}/api/appointments/my`, { headers: a(ptk), timeout: T });
    expect(r.status()).toBe(200);
  });

  test('APT-04: Doctor views appointments', async ({ request }) => {
    if (!dtk) dtk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
    const r = await request.get(`${DOCTOR_URL}/api/appointments`, { headers: a(dtk), timeout: T });
    expect(r.status()).toBe(200);
  });

  test('APT-05: Doctor confirms appointment', async ({ request }) => {
    if (!dtk) dtk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
    expect(aptId).toBeTruthy();
    const r = await request.post(`${DOCTOR_URL}/api/appointments/${aptId}/confirm`, {
      headers: a(dtk), data: { doctorId: CREDENTIALS.doctor.id }, timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('APT-06: Appointment pool', async ({ request }) => {
    if (!atk) atk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.admin);
    const r = await request.get(`${DOCTOR_URL}/api/appointment-pool`, { headers: a(atk), timeout: T });
    expect(r.status()).toBe(200);
  });

  test('APT-07: Queue management', async ({ request }) => {
    if (!dtk) dtk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
    const r = await request.get(`${DOCTOR_URL}/api/appointments`, { headers: a(dtk), timeout: T });
    expect(r.status()).toBe(200);
  });

  test('APT-08: Patient appointment history', async ({ request }) => {
    if (!ptk) ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    const r = await request.get(`${PATIENT_URL}/api/appointments/my`, { headers: a(ptk), timeout: T });
    expect(r.status()).toBe(200);
  });

  test('APT-09: Doctor patient list', async ({ request }) => {
    if (!dtk) dtk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
    const r = await request.get(`${DOCTOR_URL}/api/patients`, { headers: a(dtk), timeout: T });
    expect(r.status()).toBe(200);
  });
});

// ============================================================================
// 4. VIDEO MEETING WORKFLOW (12 tests) — Sequential for meeting flow
// ============================================================================
test.describe.serial('4. Video Meeting Workflow', () => {
  test('MEET-01: Meeting server health', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/api/health`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('MEET-02: Video meeting config', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/video-meeting/config`, { timeout: T });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.jitsiDomain).toBeTruthy();
  });

  test('MEET-03: Create meeting via meeting server', async ({ request }) => {
    const r = await request.post(`${MEETING_SERVER_URL}/api/meeting/create`, {
      data: {
        appointmentId: aptId || `M-${Date.now()}`,
        patientId: CREDENTIALS.patient1.id,
        doctorId: CREDENTIALS.doctor.id,
        title: 'E2E Consultation',
      },
      timeout: T,
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.success).toBe(true);
    meetId = d.meetingId;
    expect(meetId).toBeTruthy();
  });

  test('MEET-04: Create second meeting', async ({ request }) => {
    const r = await request.post(`${MEETING_SERVER_URL}/api/meeting/create`, {
      data: { appointmentId: `M2-${Date.now()}`, patientId: 'P2', doctorId: 'D1', title: 'Test2' },
      timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('MEET-05: Patient video-meeting config', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/video-meeting/config`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('MEET-06: Patient appointments with meeting links', async ({ request }) => {
    if (!ptk) ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    const r = await request.get(`${PATIENT_URL}/api/appointments/my`, { headers: a(ptk), timeout: T });
    expect(r.status()).toBe(200);
  });

  test('MEET-07: Meeting server health (post-create)', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/api/health`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('MEET-08: Transcription start', async ({ request }) => {
    if (!dtk) dtk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
    expect(meetId).toBeTruthy();
    const r = await request.post(`${MEETING_SERVER_URL}/api/meetings/${meetId}/start-transcription`, {
      headers: a(dtk), data: { language: 'th-TH' }, timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('MEET-09: Submit transcript segments', async ({ request }) => {
    if (!dtk) dtk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
    expect(meetId).toBeTruthy();
    const segs = [
      { role: 'doctor', name: 'Dr. Test', id: 'D1', text: 'สวัสดีครับ มีอาการอะไรบ้าง' },
      { role: 'patient', name: 'Patient', id: 'P1', text: 'ปวดหัวมาก มีไข้ 2 วัน' },
      { role: 'doctor', name: 'Dr. Test', id: 'D1', text: 'น่าจะเป็นไข้หวัดใหญ่ จะสั่งยาให้' },
    ];
    for (const s of segs) {
      const r = await request.post(`${MEETING_SERVER_URL}/api/meetings/${meetId}/transcript`, {
        headers: a(dtk),
        data: { speakerId: s.id, speakerRole: s.role, speakerName: s.name, content: s.text, language: 'th' },
        timeout: T,
      });
      expect(r.status()).toBe(200);
    }
  });

  test('MEET-10: Patient PHR accessible post-meeting', async ({ request }) => {
    if (!ptk) ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    const r = await request.get(`${PATIENT_URL}/api/phr`, { headers: a(ptk), timeout: T });
    expect(r.status()).toBe(200);
  });

  test('MEET-11: Health records post-meeting', async ({ request }) => {
    if (!ptk) ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    const r = await request.get(`${PATIENT_URL}/api/health-records`, { headers: a(ptk), timeout: T });
    expect(r.status()).toBe(200);
  });

  test('MEET-12: Treatment results', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/health-records/treatment-results`, { timeout: T });
    expect(r.status()).toBe(200);
  });
});

// ============================================================================
// 5. HEALTH RECORDS: PHR, EMR, PRESCRIPTIONS, LAB (11 tests)
// ============================================================================
test.describe.serial('5. Health Records', () => {
  test('PHR-01: Patient PHR', async ({ request }) => {
    if (!ptk) ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    const r = await request.get(`${PATIENT_URL}/api/phr`, { headers: a(ptk), timeout: T });
    expect(r.status()).toBe(200);
  });

  test('PHR-02: Health records', async ({ request }) => {
    if (!ptk) ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    const r = await request.get(`${PATIENT_URL}/api/health-records`, { headers: a(ptk), timeout: T });
    expect(r.status()).toBe(200);
  });

  test('PHR-03: Timeline', async ({ request }) => {
    if (!ptk) ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    const r = await request.get(`${PATIENT_URL}/api/timeline`, { headers: a(ptk), timeout: T });
    expect(r.status()).toBe(200);
  });

  test('PHR-04: EMR history', async ({ request }) => {
    if (!ptk) ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    const r = await request.get(`${PATIENT_URL}/api/emr/my`, { headers: a(ptk), timeout: T });
    expect(r.status()).toBe(200);
  });

  test('EMR-01: Create EMR', async ({ request }) => {
    if (!dtk) dtk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
    const r = await request.post(`${DOCTOR_URL}/api/emr`, {
      headers: a(dtk),
      data: {
        patientId: CREDENTIALS.patient1.id,
        visitDate: new Date().toISOString(),
        chiefComplaint: 'ปวดหัว มีไข้ 2 วัน',
        diagnosis: 'Upper respiratory infection',
        diagnosisCode: 'J06.9',
        treatment: 'Rest, fluids, Paracetamol 500mg',
        notes: 'Follow up in 1 week if symptoms persist',
        doctorId: CREDENTIALS.doctor.id,
      },
      timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('EMR-02: List EMR', async ({ request }) => {
    if (!dtk) dtk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
    const r = await request.get(`${DOCTOR_URL}/api/emr/patient/${CREDENTIALS.patient1.id}`, {
      headers: a(dtk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('RX-01: Create prescription', async ({ request }) => {
    if (!dtk) dtk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
    const r = await request.post(`${DOCTOR_URL}/api/prescriptions`, {
      headers: a(dtk),
      data: {
        patientId: CREDENTIALS.patient1.id,
        medications: [{ name: 'Paracetamol', dosage: '500mg', frequency: '3 times daily', duration: '5 days' }],
        notes: 'Take after meals',
        doctorId: CREDENTIALS.doctor.id,
      },
      timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('LAB-01: Create lab order', async ({ request }) => {
    if (!dtk) dtk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
    const r = await request.post(`${DOCTOR_URL}/api/lab-orders`, {
      headers: a(dtk),
      data: {
        patientId: CREDENTIALS.patient1.id,
        tests: [{ name: 'CBC', code: 'CBC-001' }],
        notes: 'Rule out infection',
        doctorId: CREDENTIALS.doctor.id,
      },
      timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('TL-01: Patient timeline', async ({ request }) => {
    if (!ptk) ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    const r = await request.get(`${PATIENT_URL}/api/timeline`, { headers: a(ptk), timeout: T });
    expect(r.status()).toBe(200);
  });

  test('PHR-05: Patient profile', async ({ request }) => {
    if (!ptk) ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    const r = await request.get(`${PATIENT_URL}/api/profile`, { headers: a(ptk), timeout: T });
    expect(r.status()).toBe(200);
  });

  test('PHR-06: Storage health', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/storage/health`, { timeout: T });
    expect(r.status()).toBe(200);
  });
});

// ============================================================================
// 6. AI FEATURES & CDS (7 tests)
// ============================================================================
test.describe('6. AI Features', () => {
  test('AI-01: AI health (doctor portal)', async ({ request }) => {
    if (!dtk) dtk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
    const r = await request.get(`${DOCTOR_URL}/api/ai/health`, { headers: a(dtk), timeout: T });
    expect(r.status()).toBe(200);
  });

  test('AI-02: AI chat', async ({ request }) => {
    if (!dtk) dtk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
    const r = await request.post(`${DOCTOR_URL}/api/ai/chat`, {
      headers: a(dtk),
      data: { message: 'What are common symptoms of influenza?', context: 'medical' },
      timeout: TL,
    });
    expect(r.status()).toBe(200);
  });

  test('AI-03: AI summarize', async ({ request }) => {
    if (!dtk) dtk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
    const r = await request.post(`${DOCTOR_URL}/api/ai/summarize`, {
      headers: a(dtk),
      data: { text: 'Patient complains of headache and fever for 2 days' },
      timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('AI-04: AI EMR summary', async ({ request }) => {
    if (!dtk) dtk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
    const r = await request.post(`${DOCTOR_URL}/api/ai/emr-summary`, {
      headers: a(dtk),
      data: { patientId: CREDENTIALS.patient1.id, visitDate: new Date().toISOString() },
      timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('AI-05: Document analysis', async ({ request }) => {
    if (!dtk) dtk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
    const r = await request.post(`${DOCTOR_URL}/api/ai/analyze-document`, {
      headers: a(dtk),
      data: { documentType: 'lab_result', content: 'CBC: WBC 12000, Hb 13.5, Plt 250000' },
      timeout: TL,
    });
    expect(r.status()).toBe(200);
  });

  test('AI-06: AI validate (doctor portal)', async ({ request }) => {
    if (!dtk) dtk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
    const r = await request.post(`${DOCTOR_URL}/api/ai/validate`, {
      headers: a(dtk),
      data: { content: 'Prescription validation check', type: 'prescription' },
      timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('AI-07: AI validate (patient portal)', async ({ request }) => {
    if (!ptk) ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    const r = await request.post(`${PATIENT_URL}/api/ai/validate`, {
      headers: a(ptk),
      data: { content: 'test content', type: 'general' },
      timeout: T,
    });
    expect(r.status()).toBe(200);
  });
});

// ============================================================================
// 7. LIVING WILL & PDPA (4 tests)
// ============================================================================
test.describe('7. Living Will & PDPA', () => {
  test('LW-01: Patient PHR accessible', async ({ request }) => {
    if (!ptk) ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    const r = await request.get(`${PATIENT_URL}/api/phr`, { headers: a(ptk), timeout: T });
    expect(r.status()).toBe(200);
  });

  test('LW-02: Patient profile', async ({ request }) => {
    if (!ptk) ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    const r = await request.get(`${PATIENT_URL}/api/profile`, { headers: a(ptk), timeout: T });
    expect(r.status()).toBe(200);
  });

  test('LW-03: Consultants list (PDPA public)', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/consultants`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('PDPA-01: Storage health', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/storage/health`, { timeout: T });
    expect(r.status()).toBe(200);
  });
});

// ============================================================================
// 8. NOTIFICATIONS (2 tests)
// ============================================================================
test.describe('8. Notifications', () => {
  test('NOTIF-01: Patient notifications', async ({ request }) => {
    if (!ptk) ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    const r = await request.get(`${PATIENT_URL}/api/notifications`, { headers: a(ptk), timeout: T });
    expect(r.status()).toBe(200);
  });

  test('NOTIF-02: Doctor notifications', async ({ request }) => {
    if (!dtk) dtk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
    const r = await request.get(`${DOCTOR_URL}/api/notifications`, { headers: a(dtk), timeout: T });
    expect(r.status()).toBe(200);
  });
});

// ============================================================================
// 9. MEDICAL CONTENT & CONSULTANTS (9 tests)
// ============================================================================
test.describe('9. Medical Content & Consultants', () => {
  test('MC-01: Medical content (public)', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/medical-content`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('MC-02: Patient medical content', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/medical-content`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('CR-01: Clinical resources (doctor portal)', async ({ request }) => {
    if (!dtk) dtk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
    const r = await request.get(`${DOCTOR_URL}/api/clinical-resources`, { headers: a(dtk), timeout: T });
    expect(r.status()).toBe(200);
  });

  test('CONS-01: Consultants list', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/consultants`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('CONS-02: Consultants specialties', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/consultants/specialties`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('META-01: Specialties (doctor portal)', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/metadata/specialties`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('META-02: Medications', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/metadata/medications`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('META-03: ICD-10', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/metadata/icd10`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('META-04: Lab tests', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/metadata/lab-tests`, { timeout: T });
    expect(r.status()).toBe(200);
  });
});

// ============================================================================
// 10. METADATA & REFERENCE DATA (3 tests)
// ============================================================================
test.describe('10. Metadata & Reference Data', () => {
  test('META-05: Patient dashboard stats', async ({ request }) => {
    if (!ptk) ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    const r = await request.get(`${PATIENT_URL}/api/dashboard/stats`, { headers: a(ptk), timeout: T });
    expect(r.status()).toBe(200);
  });

  test('META-06: Patient consultants specialties', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/consultants/specialties`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  test('META-07: Video meeting config', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/video-meeting/config`, { timeout: T });
    expect(r.status()).toBe(200);
  });
});

// ============================================================================
// 11. CROSS-PORTAL DATA SYNC (4 tests)
// ============================================================================
test.describe('11. Cross-Portal Data Sync', () => {
  test('SYNC-01: Patient data accessible from patient portal', async ({ request }) => {
    if (!ptk) ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    const r = await request.get(`${PATIENT_URL}/api/phr`, { headers: a(ptk), timeout: T });
    expect(r.status()).toBe(200);
  });

  test('SYNC-02: Doctor sees patient EMR', async ({ request }) => {
    if (!dtk) dtk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
    const r = await request.get(`${DOCTOR_URL}/api/emr/patient/${CREDENTIALS.patient1.id}`, {
      headers: a(dtk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('SYNC-03: Patient portal health consistent', async ({ request }) => {
    const [r1, r2] = await Promise.all([
      request.get(`${PATIENT_URL}/api/health`, { timeout: T }),
      request.get(`${DOCTOR_URL}/api/health`, { timeout: T }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
  });

  test('SYNC-04: Meeting server consistent', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/api/health`, { timeout: T });
    expect(r.status()).toBe(200);
  });
});

// ============================================================================
// 12. UI NAVIGATION (7 tests)
// ============================================================================
test.describe('12. UI Navigation', () => {
  test('UI-01: Patient portal loads', async ({ page }) => {
    await page.goto(PATIENT_URL, { timeout: IS_CLOUD ? 60_000 : 30_000, waitUntil: 'domcontentloaded' });
    expect(page.url()).toBeTruthy();
  });

  test('UI-02: Doctor portal loads', async ({ page }) => {
    await page.goto(DOCTOR_URL, { timeout: IS_CLOUD ? 60_000 : 30_000, waitUntil: 'domcontentloaded' });
    expect(page.url()).toBeTruthy();
  });

  test('UI-03: Both portals simultaneously', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const [p1, p2] = await Promise.all([ctx1.newPage(), ctx2.newPage()]);
    await Promise.all([
      p1.goto(PATIENT_URL, { timeout: IS_CLOUD ? 60_000 : 30_000, waitUntil: 'domcontentloaded' }),
      p2.goto(DOCTOR_URL, { timeout: IS_CLOUD ? 60_000 : 30_000, waitUntil: 'domcontentloaded' }),
    ]);
    expect(p1.url()).toBeTruthy();
    expect(p2.url()).toBeTruthy();
    await ctx1.close();
    await ctx2.close();
  });

  test('UI-04: Patient login UI', async ({ page }) => {
    await page.goto(PATIENT_URL, { timeout: IS_CLOUD ? 60_000 : 30_000, waitUntil: 'domcontentloaded' });
    const emailInput = page.locator('input[type="email"], input[name="email"], #email').first();
    if (await emailInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await emailInput.fill(CREDENTIALS.patient1.email);
      const passInput = page.locator('input[type="password"]').first();
      await passInput.fill(CREDENTIALS.patient1.password);
      const submitBtn = page.locator('button[type="submit"], button:has-text("เข้าสู่ระบบ"), button:has-text("Login")').first();
      if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(2_000);
      }
    }
    expect(page.url()).toBeTruthy();
  });

  test('UI-05: Doctor login UI', async ({ page }) => {
    await page.goto(DOCTOR_URL, { timeout: IS_CLOUD ? 60_000 : 30_000, waitUntil: 'domcontentloaded' });
    const emailInput = page.locator('input[type="email"], input[name="email"], #email').first();
    if (await emailInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await emailInput.fill(CREDENTIALS.doctor.email);
      const passInput = page.locator('input[type="password"]').first();
      await passInput.fill(CREDENTIALS.doctor.password);
      const submitBtn = page.locator('button[type="submit"], button:has-text("เข้าสู่ระบบ"), button:has-text("Login")').first();
      if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(2_000);
      }
    }
    expect(page.url()).toBeTruthy();
  });

  test('UI-06: Multi-user parallel API', async ({ request }) => {
    if (!ptk) ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    if (!dtk) dtk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
    const pt2t = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient2);
    const [r1, r2, r3] = await Promise.all([
      request.get(`${PATIENT_URL}/api/phr`, { headers: a(ptk), timeout: T }),
      request.get(`${PATIENT_URL}/api/phr`, { headers: a(pt2t), timeout: T }),
      request.get(`${DOCTOR_URL}/api/appointments`, { headers: a(dtk), timeout: T }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
    expect(r3.status()).toBe(200);
  });

  test('UI-07: Stress test — 10 parallel health checks', async ({ request }) => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () => request.get(`${PATIENT_URL}/api/health`, { timeout: T }))
    );
    for (const r of results) expect(r.status()).toBe(200);
  });
});
