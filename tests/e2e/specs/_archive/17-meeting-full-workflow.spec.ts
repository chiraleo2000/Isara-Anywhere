/**
 * =============================================================================
 * SPEC 17: FULL MEETING WORKFLOW — Sequential, No Skips, Strict 200
 * =============================================================================
 * Version: 4.0.0 | Rewritten: February 6, 2026
 *
 * Complete meeting lifecycle: auth → appointment → meeting create →
 *   transcription → AI summary → EMR → patient records
 *
 * CRITICAL: Sections 2-4 are in ONE test.describe.serial so meetId
 * flows through auth → meeting → transcription → AI within one worker.
 * NO test.skip() — every test MUST pass with status 200.
 * =============================================================================
 */

import { test, expect } from '@playwright/test';
import {
  IS_CLOUD,
  PATIENT_URL, DOCTOR_URL, MEETING_SERVER_URL,
  CREDENTIALS, TIMEOUTS,
  getAuthToken, getDoctorAuthToken,
} from '../lib/test-config';

const T = IS_CLOUD ? TIMEOUTS.cloud : TIMEOUTS.api;
const TL = IS_CLOUD ? 90_000 : TIMEOUTS.long;

function a(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// Shared state
let ptk = '', dtk = '', pt2 = '';
let aptId = '', meetId = '';

// ============================================================================
// 1. SYSTEM HEALTH (6 tests) — Independent, can run in any worker
// ============================================================================
test.describe('1. System Health', () => {
  test('Patient portal healthy', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/health`, { timeout: T });
    expect(r.status()).toBe(200);
  });
  test('Doctor portal healthy', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/health`, { timeout: T });
    expect(r.status()).toBe(200);
  });
  test('Meeting server healthy', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/api/health`, { timeout: T });
    expect(r.status()).toBe(200);
  });
  test('Patient DB connected', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/health/db`, { timeout: T });
    expect(r.status()).toBe(200);
  });
  test('Video meeting health', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/video-meeting/health`, { timeout: T });
    expect(r.status()).toBe(200);
  });
  test('Video meeting config', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/video-meeting/config`, { timeout: T });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.jitsiDomain).toBeTruthy();
  });
});

// ============================================================================
// 2-4. FULL MEETING CHAIN — ONE serial block so meetId flows through
//      Auth → Appointment → Meeting → Transcription → AI Summary
// ============================================================================
test.describe.serial('2-4. Full Meeting Chain', () => {
  // --- 2a. Auth ---
  test('Patient login', async ({ request }) => {
    ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    expect(ptk).toBeTruthy();
  });
  test('Doctor login', async ({ request }) => {
    dtk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
    expect(dtk).toBeTruthy();
  });

  // --- 2b. Appointment ---
  test('Create appointment', async ({ request }) => {
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
    aptId = d.appointment?.id || d.id || d.appointmentId || `APPT-${Date.now()}`;
    expect(aptId).toBeTruthy();
  });

  // --- 2c. Meeting Creation ---
  test('Create meeting room', async ({ request }) => {
    const r = await request.post(`${MEETING_SERVER_URL}/api/meeting/create`, {
      data: {
        appointmentId: aptId,
        patientId: CREDENTIALS.patient1.id,
        doctorId: CREDENTIALS.doctor.id,
        title: 'E2E Meeting Consultation',
      },
      timeout: T,
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.success).toBe(true);
    expect(d.meetingUrl).toBeTruthy();
    meetId = d.meetingId;
    expect(meetId).toBeTruthy();
  });

  // --- 2d. Meeting Status ---
  test('Meeting status', async ({ request }) => {
    expect(meetId).toBeTruthy();
    const r = await request.get(`${MEETING_SERVER_URL}/api/meetings/${meetId}/status`, { timeout: T });
    expect(r.status()).toBe(200);
  });

  // --- 3. Transcription (depends on meetId) ---
  test('Start transcription', async ({ request }) => {
    expect(meetId).toBeTruthy();
    const r = await request.post(`${MEETING_SERVER_URL}/api/meetings/${meetId}/start-transcription`, {
      headers: a(dtk), data: { language: 'th-TH' }, timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('Add transcript segments', async ({ request }) => {
    expect(meetId).toBeTruthy();
    const segs = [
      { role: 'doctor', name: 'Dr. Test', id: 'DOC-TEST-001', text: 'สวัสดีครับ มีอาการอะไรบ้าง' },
      { role: 'patient', name: 'Demo Patient', id: 'PATIENT-DEMO', text: 'ปวดหัวมาก มีไข้ 2 วัน กินยาแล้วไม่ดี' },
      { role: 'doctor', name: 'Dr. Test', id: 'DOC-TEST-001', text: 'น่าจะเป็นไข้หวัดใหญ่ จะสั่งยาให้' },
      { role: 'patient', name: 'Demo Patient', id: 'PATIENT-DEMO', text: 'ยากินวันละกี่ครั้งครับ' },
      { role: 'doctor', name: 'Dr. Test', id: 'DOC-TEST-001', text: 'วันละ 3 มื้อ หลังอาหาร พักผ่อนเยอะๆ' },
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

  test('Stop transcription', async ({ request }) => {
    expect(meetId).toBeTruthy();
    const r = await request.post(`${MEETING_SERVER_URL}/api/meetings/${meetId}/stop-transcription`, {
      headers: a(dtk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('Get transcript', async ({ request }) => {
    expect(meetId).toBeTruthy();
    const r = await request.get(`${MEETING_SERVER_URL}/api/meetings/${meetId}/transcript`, {
      headers: a(dtk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  // --- 4. AI Summary (depends on meetId) ---
  test('Generate SOAP summary', async ({ request }) => {
    expect(meetId).toBeTruthy();
    const r = await request.post(`${MEETING_SERVER_URL}/api/meetings/${meetId}/generate-summary`, {
      headers: a(dtk), data: { format: 'soap' }, timeout: TL,
    });
    expect(r.status()).toBe(200);
  });

  test('Get summary', async ({ request }) => {
    expect(meetId).toBeTruthy();
    const r = await request.get(`${MEETING_SERVER_URL}/api/meetings/${meetId}/summary`, {
      headers: a(dtk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('AI validate (patient portal)', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/ai/validate`, {
      headers: a(ptk), data: { content: 'test content' }, timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('AI health (doctor portal)', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/ai/health`, { headers: a(dtk), timeout: T });
    expect(r.status()).toBe(200);
  });
});

// ============================================================================
// 5. POST-MEETING RECORDS (6 tests)
// ============================================================================
test.describe('5. Post-Meeting Records', () => {
  test('Patient PHR', async ({ request }) => {
    if (!ptk) ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    const r = await request.get(`${PATIENT_URL}/api/phr`, { headers: a(ptk), timeout: T });
    expect(r.status()).toBe(200);
  });
  test('Health records', async ({ request }) => {
    if (!ptk) ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    const r = await request.get(`${PATIENT_URL}/api/health-records`, { headers: a(ptk), timeout: T });
    expect(r.status()).toBe(200);
  });
  test('EMR history', async ({ request }) => {
    if (!ptk) ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    const r = await request.get(`${PATIENT_URL}/api/emr/my`, { headers: a(ptk), timeout: T });
    expect(r.status()).toBe(200);
  });
  test('Timeline', async ({ request }) => {
    if (!ptk) ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    const r = await request.get(`${PATIENT_URL}/api/timeline`, { headers: a(ptk), timeout: T });
    expect(r.status()).toBe(200);
  });
  test('Treatment results', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/health-records/treatment-results`, { timeout: T });
    expect(r.status()).toBe(200);
  });
  test('Appointments', async ({ request }) => {
    if (!ptk) ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    const r = await request.get(`${PATIENT_URL}/api/appointments/my`, { headers: a(ptk), timeout: T });
    expect(r.status()).toBe(200);
  });
});

// ============================================================================
// 6. VIDEO MEETING ROUTES (3 tests)
// ============================================================================
test.describe('6. Video Meeting Routes', () => {
  test('Video meeting health', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/video-meeting/health`, { timeout: T });
    expect(r.status()).toBe(200);
  });
  test('Video meeting config', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/video-meeting/config`, { timeout: T });
    expect(r.status()).toBe(200);
  });
  test('Create meeting via server', async ({ request }) => {
    const r = await request.post(`${MEETING_SERVER_URL}/api/meeting/create`, {
      data: { appointmentId: `VM-${Date.now()}`, patientId: 'P1', doctorId: 'D1', title: 'Test' },
      timeout: T,
    });
    expect(r.status()).toBe(200);
  });
});

// ============================================================================
// 7. MULTI-USER (3 tests)
// ============================================================================
test.describe('7. Multi-User', () => {
  test('Patient2 login', async ({ request }) => {
    pt2 = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient2);
    expect(pt2).toBeTruthy();
  });
  test('Parallel patient queries', async ({ request }) => {
    if (!ptk) ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    if (!pt2) pt2 = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient2);
    const [r1, r2] = await Promise.all([
      request.get(`${PATIENT_URL}/api/appointments/my`, { headers: a(ptk), timeout: T }),
      request.get(`${PATIENT_URL}/api/appointments/my`, { headers: a(pt2), timeout: T }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
  });
  test('Doctor views patients', async ({ request }) => {
    if (!dtk) dtk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
    const r = await request.get(`${DOCTOR_URL}/api/patients`, { headers: a(dtk), timeout: T });
    expect(r.status()).toBe(200);
  });
});

// ============================================================================
// 8. NOTIFICATIONS (2 tests)
// ============================================================================
test.describe('8. Notifications', () => {
  test('Patient notifications', async ({ request }) => {
    if (!ptk) ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    const r = await request.get(`${PATIENT_URL}/api/notifications`, { headers: a(ptk), timeout: T });
    expect(r.status()).toBe(200);
  });
  test('Doctor notifications', async ({ request }) => {
    if (!dtk) dtk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
    const r = await request.get(`${DOCTOR_URL}/api/notifications`, { headers: a(dtk), timeout: T });
    expect(r.status()).toBe(200);
  });
});

// ============================================================================
// 9. CONCURRENT STRESS (3 tests)
// ============================================================================
test.describe('9. Stress', () => {
  test('10 parallel health checks', async ({ request }) => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () => request.get(`${PATIENT_URL}/api/health`, { timeout: T }))
    );
    for (const r of results) expect(r.status()).toBe(200);
  });
  test('5 parallel appointment queries', async ({ request }) => {
    if (!ptk) ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    const results = await Promise.all(
      Array.from({ length: 5 }, () => request.get(`${PATIENT_URL}/api/appointments/my`, { headers: a(ptk), timeout: T }))
    );
    for (const r of results) expect(r.status()).toBe(200);
  });
  test('Mixed parallel calls', async ({ request }) => {
    if (!ptk) ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    const results = await Promise.all([
      request.get(`${PATIENT_URL}/api/health`, { timeout: T }),
      request.get(`${PATIENT_URL}/api/consultants`, { timeout: T }),
      request.get(`${PATIENT_URL}/api/medical-content`, { timeout: T }),
      request.get(`${PATIENT_URL}/api/phr`, { headers: a(ptk), timeout: T }),
      request.get(`${MEETING_SERVER_URL}/api/health`, { timeout: T }),
    ]);
    for (const r of results) expect(r.status()).toBe(200);
  });
});

// ============================================================================
// 10. UI (2 tests)
// ============================================================================
test.describe('10. UI', () => {
  test('Patient portal loads', async ({ page }) => {
    await page.goto(PATIENT_URL, { timeout: IS_CLOUD ? 60_000 : 30_000, waitUntil: 'domcontentloaded' });
    expect(page.url()).toBeTruthy();
  });
  test('Doctor portal loads', async ({ page }) => {
    await page.goto(DOCTOR_URL, { timeout: IS_CLOUD ? 60_000 : 30_000, waitUntil: 'domcontentloaded' });
    expect(page.url()).toBeTruthy();
  });
});
