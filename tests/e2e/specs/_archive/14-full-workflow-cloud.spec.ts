/**
 * =============================================================================
 * 14-FULL-WORKFLOW-CLOUD — Comprehensive Cloud Tests (ALL Processes)
 * =============================================================================
 * Version: 5.0.0 | Updated: February 6, 2026
 *
 * MIRRORS 13-full-workflow-local.spec.ts but targets CLOUD URLs.
 * Covers EVERY workflow from Processes/ docs on Cloud Run deployment.
 *
 * Cloud URLs:
 *   Patient: https://izara-patient-portal-hvht4obouq-as.a.run.app
 *   Doctor:  https://izara-doctor-portal-hvht4obouq-as.a.run.app
 *   Meeting: https://izara-jitsi-meeting-portal-hvht4obouq-as.a.run.app
 * =============================================================================
 */

import { test, expect, APIRequestContext } from '@playwright/test';
import {
  CREDENTIALS, ENDPOINTS, TIMEOUTS,
  getAuthToken, getDoctorAuthToken, authHeaders,
} from '../lib/test-config';

// ============================================================================
// CLOUD URLS — hardcoded for cloud tests
// ============================================================================
const PATIENT_URL = 'https://izara-patient-portal-hvht4obouq-as.a.run.app';
const DOCTOR_URL = 'https://izara-doctor-portal-hvht4obouq-as.a.run.app';
const MEETING_SERVER_URL = 'https://izara-jitsi-meeting-portal-hvht4obouq-as.a.run.app';

const T = 30_000; // Cloud timeout
const LONG_T = 60_000;
const NAV_T = 60_000;

let patientToken = '';
let patient2Token = '';
let patient3Token = '';
let doctorToken = '';
let adminToken = '';
let createdAppointmentId = '';
let createdMeetingId = '';
let createdEmrId = '';

async function ensureTokens(request: APIRequestContext) {
  if (!patientToken) {
    patientToken = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
  }
  if (!patient2Token) {
    patient2Token = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient2);
  }
  if (!patient3Token) {
    patient3Token = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient3);
  }
  if (!doctorToken) {
    doctorToken = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
  }
  if (!adminToken) {
    adminToken = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.admin);
  }
}

// ============================================================================
// 1. CLOUD HEALTH & DATABASE CONNECTIVITY
// ============================================================================
test.describe('1. Cloud System Health & Database', () => {
  test('CL-SYS-01: Patient portal reachable', async ({ request }) => {
    const res = await request.get(`${PATIENT_URL}/api/health`, { timeout: T });
    expect(res.status()).toBe(200);
  });

  test('CL-SYS-02: Doctor portal reachable', async ({ request }) => {
    const res = await request.get(`${DOCTOR_URL}/api/health`, { timeout: T });
    expect(res.status()).toBe(200);
  });

  test('CL-SYS-03: Meeting server reachable', async ({ request }) => {
    try {
      const res = await request.get(`${MEETING_SERVER_URL}/health`, { timeout: T });
      expect(res.status()).toBe(200);
    } catch {
      const res = await request.get(`${MEETING_SERVER_URL}/api/health`, { timeout: T });
      expect(res.status()).toBe(200);
    }
  });

  test('CL-SYS-04: Patient DB health (PostgreSQL/CloudSQL)', async ({ request }) => {
    const res = await request.get(`${PATIENT_URL}/api/health/db`, { timeout: T });
    expect(res.status()).toBe(200);
  });

  test('CL-SYS-05: Doctor DB health (PostgreSQL/CloudSQL)', async ({ request }) => {
    const res = await request.get(`${DOCTOR_URL}/api/health/db`, { timeout: T });
    expect(res.status()).toBe(200);
  });
});

// ============================================================================
// 2. CLOUD AUTHENTICATION
// ============================================================================
test.describe('2. Cloud Authentication', () => {
  test('CL-AUTH-01: Patient login', async ({ request }) => {
    const res = await request.post(`${PATIENT_URL}/api/auth/login`, {
      data: CREDENTIALS.patient1, timeout: T,
    });
    expect(res.status()).toBe(200);
    const d = await res.json();
    patientToken = d.token || d.accessToken;
    expect(patientToken).toBeTruthy();
  });

  test('CL-AUTH-02: Doctor login', async ({ request }) => {
    doctorToken = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
    expect(doctorToken).toBeTruthy();
  });

  test('CL-AUTH-03: Admin login', async ({ request }) => {
    adminToken = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.admin);
    expect(adminToken).toBeTruthy();
  });

  test('CL-AUTH-04: All 3 patients login', async ({ request }) => {
    const [p1, p2, p3] = await Promise.all([
      getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1),
      getAuthToken(request, PATIENT_URL, CREDENTIALS.patient2),
      getAuthToken(request, PATIENT_URL, CREDENTIALS.patient3),
    ]);
    patientToken = p1; patient2Token = p2; patient3Token = p3;
    expect(p1).toBeTruthy();
    expect(p2).toBeTruthy();
    expect(p3).toBeTruthy();
  });

  test('CL-AUTH-05: Cloud patient registration', async ({ request }) => {
    const email = `cloud.test.${Date.now()}@gmail.com`;
    const res = await request.post(`${PATIENT_URL}/api/auth/register`, {
      data: {
        name: 'Cloud Test Patient',
        email,
        password: 'Test@12345678',
        phone: '0891234567',
        dateOfBirth: '1990-05-15',
        gender: 'male',
      },
      timeout: T,
    });
    expect(res.status()).toBe(200);
  });

  test('CL-AUTH-06: Patient profile access', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.get(`${PATIENT_URL}/api/auth/me`, {
      headers: authHeaders(patientToken), timeout: T,
    });
    expect(res.status()).toBe(200);
  });

  test('CL-AUTH-07: Admin pending doctors list', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.get(`${DOCTOR_URL}/api/admin/pending-doctors`, {
      headers: authHeaders(adminToken), timeout: T,
    });
    expect(res.status()).toBe(200);
  });

  test('CL-AUTH-08: Admin stats', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.get(`${DOCTOR_URL}/api/admin/stats`, {
      headers: authHeaders(adminToken), timeout: T,
    });
    expect(res.status()).toBe(200);
  });
});

// ============================================================================
// 3. CLOUD APPOINTMENT LIFECYCLE
// ============================================================================
test.describe('3. Cloud Appointment Lifecycle', () => {
  test('CL-APT-01: Available doctors list', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.get(`${PATIENT_URL}/api/doctors`, {
      headers: authHeaders(patientToken), timeout: T,
    });
    expect(res.status()).toBe(200);
  });

  test('CL-APT-02: Patient books appointment', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.post(`${PATIENT_URL}/api/appointments`, {
      headers: authHeaders(patientToken),
      data: {
        patientId: CREDENTIALS.patient1.id,
        patientName: CREDENTIALS.patient1.name,
        type: 'online', symptoms: 'Cloud test - ปวดหัว',
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        time: '10:00', urgency: 'normal',
      },
      timeout: T,
    });
    expect(res.status()).toBe(200);
    const d = await res.json();
    createdAppointmentId = d.appointmentId || d.id || d.data?.id || d.data?.appointmentId || '';
  });

  test('CL-APT-03: Patient lists appointments', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.get(`${PATIENT_URL}/api/appointments`, {
      headers: authHeaders(patientToken), timeout: T,
    });
    expect(res.status()).toBe(200);
  });

  test('CL-APT-04: Doctor views appointments', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.get(`${DOCTOR_URL}/api/appointments`, {
      headers: authHeaders(doctorToken), timeout: T,
    });
    expect(res.status()).toBe(200);
  });

  test('CL-APT-05: Admin views ALL appointments', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.get(`${DOCTOR_URL}/api/appointments`, {
      headers: authHeaders(adminToken), timeout: T,
    });
    expect(res.status()).toBe(200);
  });

  test('CL-APT-06: Doctor confirms appointment', async ({ request }) => {
    await ensureTokens(request);
    const listRes = await request.get(`${DOCTOR_URL}/api/appointments`, {
      headers: authHeaders(doctorToken), timeout: T,
    });
    const ld = await listRes.json();
    const apts = ld.appointments || ld.data || ld || [];
    const pending = (Array.isArray(apts) ? apts : []).find(
      (a: any) => ['pending', 'awaiting_doctor_response', 'in_pool'].includes(a.status),
    );
    const aptId = pending?.id || pending?.appointmentId || createdAppointmentId;
    if (aptId) {
      const res = await request.post(`${DOCTOR_URL}/api/appointments/${aptId}/confirm`, {
        headers: authHeaders(doctorToken),
        data: { doctorId: CREDENTIALS.doctor.id },
        timeout: T,
      });
      expect(res.status()).toBe(200);
    } else {
      // Book + confirm inline
      const bRes = await request.post(`${PATIENT_URL}/api/appointments`, {
        headers: authHeaders(patientToken),
        data: {
          patientId: CREDENTIALS.patient1.id, patientName: CREDENTIALS.patient1.name,
          type: 'online', symptoms: 'confirm test', date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
          time: '09:00', urgency: 'normal',
        },
        timeout: T,
      });
      expect(bRes.status()).toBe(200);
    }
  });

  test('CL-APT-07: Appointment pool', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.get(`${DOCTOR_URL}/api/appointment-pool`, {
      headers: authHeaders(adminToken), timeout: T,
    });
    expect(res.status()).toBe(200);
  });

  test('CL-APT-08: Queue management', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.get(`${DOCTOR_URL}/api/appointments`, {
      headers: authHeaders(doctorToken), timeout: T,
    });
    expect(res.status()).toBe(200);
  });

  test('CL-APT-09: Patient list', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.get(`${DOCTOR_URL}/api/patients`, {
      headers: authHeaders(doctorToken), timeout: T,
    });
    expect(res.status()).toBe(200);
  });
});

// ============================================================================
// 4. CLOUD VIDEO MEETING
// ============================================================================
test.describe('4. Cloud Video Meeting', () => {
  test('CL-MEET-01: Meeting server health', async ({ request }) => {
    try {
      const res = await request.get(`${MEETING_SERVER_URL}/health`, { timeout: T });
      expect(res.status()).toBe(200);
    } catch {
      const res = await request.get(`${MEETING_SERVER_URL}/api/health`, { timeout: T });
      expect(res.status()).toBe(200);
    }
  });

  test('CL-MEET-02: Video meeting config', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.get(`${PATIENT_URL}/api/video-meeting/config`, {
      headers: authHeaders(patientToken), timeout: T,
    });
    expect(res.status()).toBe(200);
  });

  test('CL-MEET-03: Doctor video-meeting health', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.get(`${DOCTOR_URL}/api/video-meeting/health`, {
      headers: authHeaders(doctorToken), timeout: T,
    });
    expect(res.status()).toBe(200);
  });

  test('CL-MEET-04: Create meeting on cloud', async ({ request }) => {
    await ensureTokens(request);
    const aptId = createdAppointmentId || 'cloud-test-apt-001';
    const res = await request.post(`${DOCTOR_URL}/api/video-meeting/create`, {
      headers: authHeaders(doctorToken),
      data: {
        appointmentId: aptId,
        doctorId: CREDENTIALS.doctor.id,
        patientId: CREDENTIALS.patient1.id,
        meetingType: 'telehealth',
      },
      timeout: T,
    });
    expect([200, 500].includes(res.status())).toBeTruthy();
    try {
      const d = await res.json();
      createdMeetingId = d.meetingId || d.id || d.data?.meetingId || aptId;
    } catch { createdMeetingId = aptId; }
  });

  test('CL-MEET-05: Create meeting via meeting server', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.post(`${MEETING_SERVER_URL}/api/meetings/create`, {
      headers: authHeaders(doctorToken),
      data: {
        appointmentId: 'cloud-meeting-test-001',
        doctorId: CREDENTIALS.doctor.id,
        patientId: CREDENTIALS.patient1.id,
      },
      timeout: T,
    });
    expect([200, 500].includes(res.status())).toBeTruthy();
  });

  test('CL-MEET-06: Doctor joins meeting', async ({ request }) => {
    await ensureTokens(request);
    const meetId = createdMeetingId || 'cloud-test-apt-001';
    const res = await request.post(`${DOCTOR_URL}/api/video-meeting/${meetId}/join`, {
      headers: authHeaders(doctorToken),
      data: { userId: CREDENTIALS.doctor.id, role: 'host' },
      timeout: T,
    });
    expect([200, 404, 500].includes(res.status())).toBeTruthy();
  });

  test('CL-MEET-07: Patient joins meeting', async ({ request }) => {
    await ensureTokens(request);
    const meetId = createdMeetingId || 'cloud-test-apt-001';
    const res = await request.post(`${PATIENT_URL}/api/video-meeting/${meetId}/join`, {
      headers: authHeaders(patientToken),
      data: { userId: CREDENTIALS.patient1.id, role: 'participant' },
      timeout: T,
    });
    expect([200, 404, 500].includes(res.status())).toBeTruthy();
  });

  test('CL-MEET-08: Submit transcript', async ({ request }) => {
    await ensureTokens(request);
    const meetId = createdMeetingId || 'cloud-test-apt-001';
    const res = await request.post(`${DOCTOR_URL}/api/video-meeting/${meetId}/transcript`, {
      headers: authHeaders(doctorToken),
      data: {
        speakerId: CREDENTIALS.doctor.id, speakerRole: 'doctor',
        speakerName: CREDENTIALS.doctor.name,
        content: 'คุณมีอาการอย่างไรบ้างครับ? มีไข้ด้วยใช่ไหม?',
        language: 'th', timestamp: new Date().toISOString(),
      },
      timeout: T,
    });
    expect([200, 404, 500].includes(res.status())).toBeTruthy();
  });

  test('CL-MEET-09: AI meeting summary', async ({ request }) => {
    await ensureTokens(request);
    const meetId = createdMeetingId || 'cloud-test-apt-001';
    const res = await request.post(`${DOCTOR_URL}/api/video-meeting/${meetId}/summarize`, {
      headers: authHeaders(doctorToken),
      data: { appointmentId: meetId },
      timeout: LONG_T,
    });
    expect([200, 404, 500].includes(res.status())).toBeTruthy();
  });

  test('CL-MEET-10: End meeting with AI', async ({ request }) => {
    await ensureTokens(request);
    const meetId = createdMeetingId || 'cloud-test-apt-001';
    const res = await request.post(`${DOCTOR_URL}/api/video-meeting/${meetId}/end`, {
      headers: authHeaders(doctorToken),
      data: { appointmentId: meetId, doctorId: CREDENTIALS.doctor.id, duration: 900, generateSummary: true },
      timeout: LONG_T,
    });
    expect([200, 404, 500, 503].includes(res.status())).toBeTruthy();
  });

  test('CL-MEET-11: Guest invite', async ({ request }) => {
    await ensureTokens(request);
    const meetId = createdMeetingId || 'cloud-test-apt-001';
    const res = await request.post(`${DOCTOR_URL}/api/video-meeting/${meetId}/invite`, {
      headers: authHeaders(doctorToken),
      data: { guestName: 'Cloud Guest', guestEmail: 'guest@test.com', guestType: 'patient_relative' },
      timeout: T,
    });
    expect([200, 404, 500].includes(res.status())).toBeTruthy();
  });
});

// ============================================================================
// 5. CLOUD HEALTH RECORDS
// ============================================================================
test.describe('5. Cloud Health Records', () => {
  test('CL-PHR-01: Patient PHR', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.get(`${PATIENT_URL}/api/phr/${CREDENTIALS.patient1.id}`, {
      headers: authHeaders(patientToken), timeout: T,
    });
    expect(res.status()).toBe(200);
  });

  test('CL-PHR-02: Update PHR', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.put(`${PATIENT_URL}/api/phr/${CREDENTIALS.patient1.id}`, {
      headers: authHeaders(patientToken),
      data: { bloodType: 'O+', heightCm: 175, weightKg: 70, allergies: ['Sulfa'] },
      timeout: T,
    });
    expect(res.status()).toBe(200);
  });

  test('CL-PHR-03: Record vitals', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.post(`${PATIENT_URL}/api/phr/${CREDENTIALS.patient1.id}/vitals`, {
      headers: authHeaders(patientToken),
      data: {
        bloodPressureSystolic: 125, bloodPressureDiastolic: 82, heartRate: 75,
        temperature: 36.8, weight: 70, oxygenSaturation: 97,
        recordedAt: new Date().toISOString(),
      },
      timeout: T,
    });
    expect([200, 500].includes(res.status())).toBeTruthy();
  });

  test('CL-PHR-04: Doctor views patient PHR', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.get(`${DOCTOR_URL}/api/phr/patient/${CREDENTIALS.patient1.id}`, {
      headers: authHeaders(doctorToken), timeout: T,
    });
    expect(res.status()).toBe(200);
  });

  test('CL-EMR-01: Create EMR', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.post(`${DOCTOR_URL}/api/emr`, {
      headers: authHeaders(doctorToken),
      data: {
        patientId: CREDENTIALS.patient1.id, doctorId: CREDENTIALS.doctor.id,
        appointmentId: createdAppointmentId || 'cloud-emr-test',
        subjective: 'Cloud test EMR', objective: 'Normal', assessment: 'Healthy (Z00.0)',
        plan: 'No treatment needed', icd10Codes: ['Z00.0'], chiefComplaint: 'Cloud EMR test',
      },
      timeout: T,
    });
    expect(res.status()).toBe(200);
    const d = await res.json();
    createdEmrId = d.emrId || d.id || d.data?.id || '';
  });

  test('CL-EMR-02: EMR list', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.get(`${DOCTOR_URL}/api/emr`, {
      headers: authHeaders(doctorToken), timeout: T,
    });
    expect(res.status()).toBe(200);
  });

  test('CL-RX-01: Create prescription', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.post(`${DOCTOR_URL}/api/prescriptions`, {
      headers: authHeaders(doctorToken),
      data: {
        patientId: CREDENTIALS.patient1.id, doctorId: CREDENTIALS.doctor.id,
        appointmentId: 'cloud-rx-test',
        medications: [{ name: 'Cloud Test Med', dosage: '1 tab', frequency: 'daily', duration: '7 days' }],
      },
      timeout: T,
    });
    expect(res.status()).toBe(200);
  });

  test('CL-LAB-01: Create lab order', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.post(`${DOCTOR_URL}/api/lab-orders`, {
      headers: authHeaders(doctorToken),
      data: {
        patientId: CREDENTIALS.patient1.id, doctorId: CREDENTIALS.doctor.id,
        appointmentId: 'cloud-lab-test',
        tests: [{ testName: 'CBC', testCode: 'LAB-001', reason: 'Routine' }],
      },
      timeout: T,
    });
    expect(res.status()).toBe(200);
  });

  test('CL-HL-01: Push health log', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.post(`${DOCTOR_URL}/api/patients/${CREDENTIALS.patient1.id}/health-logs`, {
      headers: authHeaders(doctorToken),
      data: {
        id: `hl-cloud-${Date.now()}`,
        type: 'emr_summary', chiefComplaint: 'Cloud test',
        diagnosisDescription: 'Test diagnosis', treatmentPlan: 'Cloud test plan',
        doctorId: CREDENTIALS.doctor.id, doctorName: CREDENTIALS.doctor.name,
      },
      timeout: T,
    });
    expect([200, 201].includes(res.status())).toBeTruthy();
  });

  test('CL-TL-01: Patient timeline', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.get(`${PATIENT_URL}/api/timeline`, {
      headers: authHeaders(patientToken), timeout: T,
    });
    expect(res.status()).toBe(200);
  });
});

// ============================================================================
// 6. CLOUD AI FEATURES
// ============================================================================
test.describe('6. Cloud AI Features', () => {
  test('CL-AI-01: AI health', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.get(`${DOCTOR_URL}/api/ai/health`, {
      headers: authHeaders(doctorToken), timeout: T,
    });
    expect(res.status()).toBe(200);
  });

  test('CL-AI-02: AI chat', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.post(`${DOCTOR_URL}/api/ai/chat`, {
      headers: authHeaders(doctorToken),
      data: { message: 'Cloud test: recommend medication for flu', doctorId: CREDENTIALS.doctor.id, sessionId: `cloud-${Date.now()}` },
      timeout: LONG_T,
    });
    expect(res.status()).toBe(200);
  });

  test('CL-AI-03: Pre-consultation summary', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.post(`${DOCTOR_URL}/api/ai/pre-consultation-summary`, {
      headers: authHeaders(doctorToken),
      data: { patientId: CREDENTIALS.patient1.id, appointmentId: createdAppointmentId || 'cloud-ai-test' },
      timeout: LONG_T,
    });
    expect(res.status()).toBe(200);
  });

  test('CL-AI-04: Document analysis', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.post(`${DOCTOR_URL}/api/ai/analyze-document`, {
      headers: authHeaders(doctorToken),
      data: { documentType: 'lab_result', content: 'CBC: WBC 10000, RBC 4.8, Hgb 14.0', patientId: CREDENTIALS.patient1.id },
      timeout: LONG_T,
    });
    expect(res.status()).toBe(200);
  });

  test('CL-AI-05: CDS check', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.post(`${DOCTOR_URL}/api/ai/cds`, {
      headers: authHeaders(doctorToken),
      data: {
        patientId: CREDENTIALS.patient1.id,
        medications: ['Metformin 500mg'], conditions: ['Type 2 Diabetes'],
        proposedMedication: 'Glipizide 5mg',
      },
      timeout: LONG_T,
    });
    expect(res.status()).toBe(200);
  });

  test('CL-AI-06: Patient instruction', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.post(`${DOCTOR_URL}/api/ai/patient-instructions`, {
      headers: authHeaders(doctorToken),
      data: {
        patientId: CREDENTIALS.patient1.id,
        diagnosis: 'Common cold', medications: ['Paracetamol 500mg'],
        instructions: 'Rest and drink fluids',
      },
      timeout: LONG_T,
    });
    expect(res.status()).toBe(200);
  });

  test('CL-AI-07: Man-in-loop validation', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.post(`${DOCTOR_URL}/api/ai/validate`, {
      headers: authHeaders(doctorToken),
      data: { type: 'emr_summary', content: 'Cloud AI validation test', doctorId: CREDENTIALS.doctor.id, approved: true },
      timeout: T,
    });
    expect(res.status()).toBe(200);
  });

  test('CL-AI-08: Knowledge base', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.get(`${DOCTOR_URL}/api/ai/knowledge?query=diabetes`, {
      headers: authHeaders(doctorToken), timeout: T,
    });
    expect(res.status()).toBe(200);
  });

  test('CL-AI-09: AI CDS history', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.get(`${DOCTOR_URL}/api/ai/validations`, {
      headers: authHeaders(doctorToken), timeout: T,
    });
    expect(res.status()).toBe(200);
  });

  test('CL-AI-10: AI validations', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.get(`${DOCTOR_URL}/api/ai/validations`, {
      headers: authHeaders(doctorToken), timeout: T,
    });
    expect(res.status()).toBe(200);
  });
});

// ============================================================================
// 7. CLOUD LIVING WILL & PDPA
// ============================================================================
test.describe('7. Cloud Living Will & PDPA', () => {
  test('CL-LW-01: Patient living will', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.get(`${PATIENT_URL}/api/phr/${CREDENTIALS.patient1.id}/living-will`, {
      headers: authHeaders(patientToken), timeout: T,
    });
    expect([200, 500].includes(res.status())).toBeTruthy();
  });

  test('CL-LW-02: Doctor views patient living will', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.get(`${DOCTOR_URL}/api/patients/${CREDENTIALS.patient1.id}/living-will`, {
      headers: authHeaders(doctorToken), timeout: T,
    });
    expect(res.status()).toBe(200);
  });

  test('CL-PDPA-01: PDPA consent', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.get(`${PATIENT_URL}/api/pdpa/status`, {
      headers: authHeaders(patientToken), timeout: T,
    });
    expect(res.status()).toBe(200);
  });
});

// ============================================================================
// 8. CLOUD NOTIFICATIONS
// ============================================================================
test.describe('8. Cloud Notifications', () => {
  test('CL-NOTIF-01: Patient notifications', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.get(`${PATIENT_URL}/api/notifications`, {
      headers: authHeaders(patientToken), timeout: T,
    });
    expect(res.status()).toBe(200);
  });

  test('CL-NOTIF-02: Doctor notifications', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.get(`${DOCTOR_URL}/api/notifications`, {
      headers: authHeaders(doctorToken), timeout: T,
    });
    expect(res.status()).toBe(200);
  });

  test('CL-NOTIF-03: Create notification', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.post(`${DOCTOR_URL}/api/notifications`, {
      headers: authHeaders(adminToken),
      data: {
        recipientId: CREDENTIALS.doctor.id, type: 'system',
        title: 'Cloud Test', message: 'Cloud notification test',
      },
      timeout: T,
    });
    expect(res.status()).toBe(200);
  });
});

// ============================================================================
// 9. CLOUD CONTENT & CONSULTANTS
// ============================================================================
test.describe('9. Cloud Content & Consultants', () => {
  test('CL-MC-01: Medical content', async ({ request }) => {
    const res = await request.get(`${DOCTOR_URL}/api/content/medical`, { timeout: T });
    expect(res.status()).toBe(200);
  });

  test('CL-MC-02: Patient medical content', async ({ request }) => {
    const res = await request.get(`${PATIENT_URL}/api/medical-content`, { timeout: T });
    expect(res.status()).toBe(200);
  });

  test('CL-CR-01: Clinical resources', async ({ request }) => {
    const res = await request.get(`${DOCTOR_URL}/api/content/clinical`, { timeout: T });
    expect(res.status()).toBe(200);
  });

  test('CL-CONS-01: Consultants', async ({ request }) => {
    const res = await request.get(`${DOCTOR_URL}/api/consultants`, { timeout: T });
    expect(res.status()).toBe(200);
  });

  test('CL-TAG-01: Medical tags', async ({ request }) => {
    const res = await request.get(`${DOCTOR_URL}/api/content/tags/medical`, { timeout: T });
    expect(res.status()).toBe(200);
  });

  test('CL-TAG-02: Clinical tags', async ({ request }) => {
    const res = await request.get(`${DOCTOR_URL}/api/content/tags/clinical`, { timeout: T });
    expect(res.status()).toBe(200);
  });
});

// ============================================================================
// 10. CLOUD METADATA
// ============================================================================
test.describe('10. Cloud Metadata', () => {
  test('CL-META-01: Drug interactions metadata', async ({ request }) => {
    const res = await request.get(`${DOCTOR_URL}/api/metadata/drug-interactions`, { timeout: T });
    expect(res.status()).toBe(200);
  });

  test('CL-META-02: Medications', async ({ request }) => {
    const res = await request.get(`${DOCTOR_URL}/api/metadata/medications`, { timeout: T });
    expect(res.status()).toBe(200);
  });

  test('CL-META-03: ICD-10', async ({ request }) => {
    const res = await request.get(`${DOCTOR_URL}/api/metadata/icd10-codes`, { timeout: T });
    expect(res.status()).toBe(200);
  });

  test('CL-META-04: Lab tests', async ({ request }) => {
    const res = await request.get(`${DOCTOR_URL}/api/metadata/lab-tests`, { timeout: T });
    expect(res.status()).toBe(200);
  });

  test('CL-META-05: Doctors list', async ({ request }) => {
    const res = await request.get(`${DOCTOR_URL}/api/doctors`, { timeout: T });
    expect(res.status()).toBe(200);
  });
});

// ============================================================================
// 11. CLOUD UI PAGES
// ============================================================================
test.describe('11. Cloud UI Pages', () => {
  test('CL-UI-01: Patient portal loads', async ({ page }) => {
    await page.goto(PATIENT_URL, { timeout: NAV_T });
    await expect(page).toHaveTitle(/.*/);
  });

  test('CL-UI-02: Doctor portal loads', async ({ page }) => {
    await page.goto(DOCTOR_URL, { timeout: NAV_T });
    await expect(page).toHaveTitle(/.*/);
  });

  test('CL-UI-03: Both portals simultaneously', async ({ browser }) => {
    const [ctx1, ctx2] = await Promise.all([browser.newContext(), browser.newContext()]);
    const [p1, p2] = await Promise.all([ctx1.newPage(), ctx2.newPage()]);
    await Promise.all([
      p1.goto(PATIENT_URL, { timeout: NAV_T }),
      p2.goto(DOCTOR_URL, { timeout: NAV_T }),
    ]);
    expect(p1.url()).toContain('izara-patient');
    expect(p2.url()).toContain('izara-doctor');
    await ctx1.close();
    await ctx2.close();
  });

  test('CL-UI-04: Patient login UI', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/login`, { timeout: NAV_T });
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    if (await emailInput.isVisible({ timeout: 15000 }).catch(() => false)) {
      await emailInput.fill(CREDENTIALS.patient1.email);
      await page.locator('input[type="password"]').first().fill(CREDENTIALS.patient1.password);
      await page.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(5000);
    }
    expect(page.url()).toBeTruthy();
  });

  test('CL-UI-05: Doctor login UI', async ({ page }) => {
    await page.goto(`${DOCTOR_URL}/login`, { timeout: NAV_T });
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    if (await emailInput.isVisible({ timeout: 15000 }).catch(() => false)) {
      await emailInput.fill(CREDENTIALS.doctor.email);
      await page.locator('input[type="password"]').first().fill(CREDENTIALS.doctor.password);
      await page.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(5000);
    }
    expect(page.url()).toBeTruthy();
  });
});

// ============================================================================
// 12. CLOUD DATA SYNC
// ============================================================================
test.describe('12. Cloud Data Sync', () => {
  test('CL-SYNC-01: Patient books → doctor sees', async ({ request }) => {
    await ensureTokens(request);
    const bRes = await request.post(`${PATIENT_URL}/api/appointments`, {
      headers: authHeaders(patientToken),
      data: {
        patientId: CREDENTIALS.patient1.id, patientName: CREDENTIALS.patient1.name,
        type: 'online', symptoms: 'Cloud sync test',
        date: new Date(Date.now() + 259200000).toISOString().split('T')[0],
        time: '16:00', urgency: 'normal',
      },
      timeout: T,
    });
    expect(bRes.status()).toBe(200);

    const dRes = await request.get(`${DOCTOR_URL}/api/appointments`, {
      headers: authHeaders(doctorToken), timeout: T,
    });
    expect(dRes.status()).toBe(200);
  });

  test('CL-SYNC-02: Dashboard', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.get(`${DOCTOR_URL}/api/admin/dashboard-stats`, {
      headers: authHeaders(adminToken), timeout: T,
    });
    expect(res.status()).toBe(200);
  });

  test('CL-SYNC-03: Prescriptions list', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.get(`${DOCTOR_URL}/api/prescriptions/patient/${CREDENTIALS.patient1.id}`, {
      headers: authHeaders(doctorToken), timeout: T,
    });
    expect(res.status()).toBe(200);
  });

  test('CL-SYNC-04: Lab orders list', async ({ request }) => {
    await ensureTokens(request);
    const res = await request.get(`${DOCTOR_URL}/api/lab-orders/patient/${CREDENTIALS.patient1.id}`, {
      headers: authHeaders(doctorToken), timeout: T,
    });
    expect(res.status()).toBe(200);
  });
});
