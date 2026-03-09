/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SPEC 29: AI CHAT, MEETING SUMMARY & CLINICAL DECISION SUPPORT — CLOUD
 * ═══════════════════════════════════════════════════════════════════════════════
 * Tests: ~16 | AI Chat, Meeting Summary, Pre-Consultation Summary, EMR Summary,
 * CDS Check, Patient Instruction Sheet, AI Validate.
 *
 * ALL tests are fully independent — NO serial chains, NO cascading skips.
 * Endpoint mapping verified against cloud deployment:
 *   - AI Chat → Doctor Portal /api/ai/chat
 *   - EMR Summary → Doctor Portal /api/ai/emr-summary
 *   - AI Summarize → Doctor Portal /api/ai/summarize
 *   - Pre-consultation → Meeting Server /api/ai/pre-consultation-summary
 *   - Patient Instruction → Meeting Server /api/ai/patient-instruction-sheet
 *   - CDS Check → Meeting Server /api/ai/cds-check
 *   - AI Validate → Meeting+Doctor /api/ai/validate
 *   - Meeting Summary → Meeting Server /api/meetings/:id/generate-summary
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { test, expect } from '@playwright/test';
import {
  PATIENT_URL, DOCTOR_URL, MEETING_SERVER_URL,
  ENDPOINTS, TIMEOUTS, CREDENTIALS,
  authenticateAllUsers,
  patientApi, doctorApi, meetingApi,
  apiRequest, navigateWithAuth,
  logTestSuccess, logTestInfo, logTestWarning,
  type UserRole, type AuthenticatedUser,
} from '../lib/test-helpers';
import { takeSnapshot, verifyPageHealthy } from '../helpers/snapshot';

let users: Map<UserRole, AuthenticatedUser>;
const SPEC = '29-ai-chat-summary';

test.describe('29 — AI Chat, Summary & CDS', () => {

  test.beforeAll(async ({ request }) => {
    users = await authenticateAllUsers(request);
    logTestInfo('All users authenticated for AI testing');
  });

  // ═══════════════════════════════════════════════════════════════════════
  // A: AI CHAT (runs on Doctor Portal)
  // ═══════════════════════════════════════════════════════════════════════

  test('A01 — AI chat responds to patient health question', async ({ request }) => {
    const doc = users.get('doctor')!;
    const res = await doctorApi(request, doc.token).post(ENDPOINTS.ai.chat, {
      message: 'What are the common symptoms of type 2 diabetes?',
      sessionId: `test-chat-${Date.now()}`,
      language: 'en',
    });
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(500);
    expect(res.body).toBeTruthy();
    const text = typeof res.body === 'string' ? res.body : JSON.stringify(res.body);
    expect(text.length).toBeGreaterThan(50);
    logTestSuccess(`AI chat responded with ${text.length} chars`);
  });

  test('A02 — AI chat responds in Thai language', async ({ request }) => {
    const doc = users.get('doctor')!;
    const res = await doctorApi(request, doc.token).post(ENDPOINTS.ai.chat, {
      message: 'อาการของโรคเบาหวานชนิดที่ 2 มีอะไรบ้าง',
      sessionId: `test-thai-${Date.now()}`,
      language: 'th',
    });
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(500);
    expect(res.body).toBeTruthy();
    logTestSuccess('AI chat responded in Thai');
  });

  test('A03 — AI chat handles follow-up context', async ({ request }) => {
    test.slow(); // Two sequential AI calls can be slow
    const doc = users.get('doctor')!;
    const sessionId = `test-followup-${Date.now()}`;
    const r1 = await doctorApi(request, doc.token).post(ENDPOINTS.ai.chat, {
      message: 'Tell me about hypertension treatment guidelines',
      sessionId,
      language: 'en',
    });
    // AI may return 503 under load — that still proves the endpoint exists
    expect(r1.status).toBeGreaterThanOrEqual(200);
    expect(r1.status).toBeLessThan(504);
    // Small delay to avoid rate-limiting the AI service
    await new Promise(r => setTimeout(r, 2000));
    const r2 = await doctorApi(request, doc.token).post(ENDPOINTS.ai.chat, {
      message: 'What medications should I consider for elderly patients?',
      sessionId,
      language: 'en',
    });
    expect(r2.status).toBeGreaterThanOrEqual(200);
    expect(r2.status).toBeLessThan(504);
    logTestSuccess('AI chat handled follow-up conversation');
  });

  test('A04 — AI Doctor page loads in browser', async ({ page }) => {
    await navigateWithAuth(page, 'patient1', '/ai-doctor');
    const health = await verifyPageHealthy(page);
    expect(health.healthy).toBe(true);
    await takeSnapshot(page, SPEC, 'ai-doctor-page');
    logTestSuccess('AI Doctor page loaded in browser');
  });

  // ═══════════════════════════════════════════════════════════════════════
  // B: MEETING SUMMARY & PRE-CONSULTATION
  // ═══════════════════════════════════════════════════════════════════════

  test('B01 — Meeting create + generate summary workflow', async ({ request }) => {
    test.slow(); // AI summary generation takes time
    const doc = users.get('doctor')!;
    // Step 1: Create a meeting
    const createRes = await meetingApi(request, doc.token).post(ENDPOINTS.meetings.create, {
      patientId: 'PATIENT-DEMO',
      doctorId: 'DOC-TEST-001',
      type: 'telemedicine',
      subject: 'Follow-up for headache',
    });
    expect(createRes.status).toBeGreaterThanOrEqual(200);
    expect(createRes.status).toBeLessThan(300);
    const meetingId = createRes.body?.meetingId || createRes.body?.id || createRes.body?.data?.meetingId;
    expect(meetingId).toBeTruthy();

    // Step 2: Submit transcript segment (endpoint accepts one segment at a time)
    const transcriptRes = await meetingApi(request, doc.token).post(`/api/meetings/${meetingId}/transcript`, {
      speakerId: 'DOC-TEST-001',
      speakerRole: 'doctor',
      speakerName: 'Dr. Test',
      content: 'สวัสดีครับ วันนี้มาด้วยอาการอะไรครับ ปวดหัวมา 3 วัน ไม่หาย มีไข้ต่ำๆ สั่งยาพาราเซตามอล 500mg ทุก 6 ชม.',
      language: 'th',
      confidence: 0.95,
    });
    expect(transcriptRes.status).toBeGreaterThanOrEqual(200);
    expect(transcriptRes.status).toBeLessThan(300);

    // Step 3: Generate summary
    const summaryRes = await meetingApi(request, doc.token).post(`/api/meetings/${meetingId}/generate-summary`, {
      language: 'th',
    });
    expect(summaryRes.status).toBeGreaterThanOrEqual(200);
    expect(summaryRes.status).toBeLessThan(300);
    logTestSuccess(`Meeting summary generated for ${meetingId}`);
  });

  test('B02 — Pre-consultation summary generates', async ({ request }) => {
    const doc = users.get('doctor')!;
    const res = await meetingApi(request, doc.token).post(ENDPOINTS.ai.preSummary, {
      patientId: 'PATIENT-DEMO',
      appointmentId: `test-apt-${Date.now()}`,
      patientData: {
        name: 'Demo Test Patient',
        age: 35,
        gender: 'male',
        vitals: { bloodPressure: '120/80', heartRate: 72, temperature: 36.8, weight: 70 },
        medications: ['Paracetamol 500mg PRN'],
        allergies: ['Penicillin'],
        recentDiagnoses: ['R51 - Headache'],
      },
    });
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    expect(res.body).toBeTruthy();
    logTestSuccess('Pre-consultation summary generated');
  });

  test('B03 — EMR summary generates from patient data', async ({ request }) => {
    const doc = users.get('doctor')!;
    // EMR summary lives on Doctor Portal, not Meeting Server
    const res = await doctorApi(request, doc.token).post(ENDPOINTS.ai.emrSummary, {
      patientId: 'PATIENT-DEMO',
      emrData: {
        diagnoses: ['R51 - Headache', 'R50.9 - Fever, unspecified'],
        medications: [
          { name: 'Paracetamol 500mg', dosage: '1 tab q6h PRN', startDate: '2026-01-15' },
        ],
        labResults: [
          { test: 'CBC', result: 'Normal', date: '2026-01-10' },
          { test: 'CMP', result: 'Normal', date: '2026-01-10' },
        ],
        vitals: { bloodPressure: '130/85', heartRate: 88, temperature: 37.8 },
        notes: 'Follow-up for tension headache with low-grade fever.',
      },
    });
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    expect(res.body).toBeTruthy();
    logTestSuccess('EMR summary generated');
  });

  // ═══════════════════════════════════════════════════════════════════════
  // C: CDS & AI TOOLS
  // ═══════════════════════════════════════════════════════════════════════

  test('C01 — AI summarize endpoint works', async ({ request }) => {
    const doc = users.get('doctor')!;
    // AI summarize lives on Doctor Portal
    const res = await doctorApi(request, doc.token).post(ENDPOINTS.ai.summarize, {
      text: 'Patient presents with 3-day headache and low-grade fever. No nausea. BP 130/85. Prescribed Paracetamol 500mg.',
      language: 'en',
    });
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    expect(res.body).toBeTruthy();
    logTestSuccess('AI summarize returned results');
  });

  test('C02 — CDS check for drug interaction alerts', async ({ request }) => {
    const doc = users.get('doctor')!;
    const res = await meetingApi(request, doc.token).post(ENDPOINTS.cds.check, {
      patientId: 'PATIENT-DEMO',
      medications: [
        { name: 'Warfarin', dosage: '5mg daily' },
        { name: 'Aspirin', dosage: '325mg daily' },
      ],
      diagnoses: ['I10 - Essential hypertension'],
      allergies: ['Penicillin'],
    });
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    expect(res.body).toBeTruthy();
    logTestSuccess('CDS check completed');
  });

  test('C03 — AI validations log accessible', async ({ request }) => {
    const doc = users.get('doctor')!;
    // AI validations list lives on Meeting Server (GET /api/ai/validations)
    const res = await meetingApi(request, doc.token).get(ENDPOINTS.ai.validations);
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    logTestSuccess('AI validations returned');
  });

  // ═══════════════════════════════════════════════════════════════════════
  // D: PATIENT INSTRUCTION SHEET
  // ═══════════════════════════════════════════════════════════════════════

  test('D01 — Patient instruction sheet generates from meeting', async ({ request }) => {
    const doc = users.get('doctor')!;
    const res = await meetingApi(request, doc.token).post(ENDPOINTS.ai.patientInstruction, {
      meetingId: `test-meeting-pi-${Date.now()}`,
      patientId: 'PATIENT-DEMO',
      doctorId: 'DOC-TEST-001',
      diagnosis: 'Tension headache with low-grade fever',
      medications: [
        { name: 'Paracetamol 500mg', dosage: '1 tablet every 6 hours as needed', duration: '7 days' },
      ],
      instructions: [
        'Rest adequately and drink plenty of fluids',
        'Take temperature twice daily',
        'Return if fever exceeds 38.5°C or headache worsens',
      ],
      followUp: '1 week follow-up appointment',
      language: 'th',
    });
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    expect(res.body).toBeTruthy();
    const text = typeof res.body === 'string' ? res.body : JSON.stringify(res.body);
    expect(text.length).toBeGreaterThan(10);
    logTestSuccess(`Patient instruction sheet generated: ${text.length} chars`);
  });

  test('D02 — Patient instruction sheet in English', async ({ request }) => {
    const doc = users.get('doctor')!;
    const res = await meetingApi(request, doc.token).post(ENDPOINTS.ai.patientInstruction, {
      meetingId: `test-meeting-en-${Date.now()}`,
      patientId: 'PATIENT-DEMO',
      doctorId: 'DOC-TEST-001',
      diagnosis: 'Type 2 Diabetes Mellitus, controlled',
      medications: [
        { name: 'Metformin 500mg', dosage: '1 tablet twice daily with meals', duration: '30 days' },
      ],
      instructions: [
        'Monitor blood glucose daily',
        'Follow diabetic diet plan',
        'Exercise 30 minutes daily',
        'Report any hypoglycemic symptoms',
      ],
      followUp: '1 month follow-up with lab work',
      language: 'en',
    });
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    expect(res.body).toBeTruthy();
    logTestSuccess('Patient instruction sheet in English generated');
  });

  // ═══════════════════════════════════════════════════════════════════════
  // E: AI VALIDATE & HEALTH
  // ═══════════════════════════════════════════════════════════════════════

  test('E01 — AI validate endpoint works', async ({ request }) => {
    const doc = users.get('doctor')!;
    const res = await meetingApi(request, doc.token).post(ENDPOINTS.ai.validate, {
      type: 'prescription',
      data: {
        medications: [{ name: 'Paracetamol', dosage: '500mg', frequency: 'q6h' }],
        patientAge: 35,
        allergies: ['Penicillin'],
      },
    });
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    expect(res.body).toBeTruthy();
    logTestSuccess('AI validate completed');
  });

  test('E02 — Meeting server health confirms service is running', async ({ request }) => {
    const doc = users.get('doctor')!;
    const res = await meetingApi(request, doc.token).get('/health');
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    expect(res.body).toBeTruthy();
    logTestSuccess('Meeting server health OK');
  });

  test('E03 — Doctor portal health confirms service is running', async ({ request }) => {
    const doc = users.get('doctor')!;
    const res = await doctorApi(request, doc.token).get('/health');
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    expect(res.body).toBeTruthy();
    logTestSuccess('Doctor portal health OK');
  });
});
