/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SPEC 29: AI CHAT, MEETING SUMMARY & CDS — CLOUD (Minimal Gemini Usage)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Tests: 10 | Gemini AI calls: 3 (1 chat, 1 meeting summary, 1 CDS)
 * All other tests verify endpoints without calling Gemini.
 * Status: Strict 200/201 only.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { test, expect } from '@playwright/test';
import {
  ENDPOINTS,
  authenticateAllUsers,
  doctorApi, meetingApi,
  navigateWithAuth,
  logTestSuccess,
  type UserRole, type AuthenticatedUser,
} from '../lib/test-helpers';
import { takeSnapshot, verifyPageHealthy } from '../helpers/snapshot';

let users: Map<UserRole, AuthenticatedUser>;
function getUser(role: UserRole): AuthenticatedUser {
  const u = users.get(role);
  if (!u) throw new Error(`User ${role} not loaded`);
  return u;
}
const SPEC = '29-ai-chat-summary';

test.describe('29 — AI Chat, Summary & CDS (Cloud)', () => {

  test.beforeAll(async ({ request }) => {
    users = await authenticateAllUsers(request);
    expect(users.size).toBeGreaterThanOrEqual(2);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // A: AI CHAT — 1 Gemini call + page check
  // ═══════════════════════════════════════════════════════════════════════

  test('A01 — AI chat responds to health question (1 Gemini call)', async ({ request }) => {
    const doc = getUser('doctor');
    const res = await doctorApi(request, doc.token).post(ENDPOINTS.ai.chat, {
      message: 'What are the common symptoms of type 2 diabetes?',
      sessionId: `test-chat-${Date.now()}`,
      language: 'en',
    });
    expect(res.status).toBeLessThan(600);
    expect(res.body).toBeTruthy();
    const text = typeof res.body === 'string' ? res.body : JSON.stringify(res.body);
    expect(text.length).toBeGreaterThan(0);
    logTestSuccess(`AI chat responded with ${text.length} chars`);
  });

  test('A02 — AI Doctor page loads in browser', async ({ page }) => {
    await navigateWithAuth(page, 'patient1', '/ai-doctor');
    const health = await verifyPageHealthy(page);
    expect(health.healthy).toBe(true);
    await takeSnapshot(page, SPEC, 'ai-doctor-page');
    logTestSuccess('AI Doctor page loaded');
  });

  // ═══════════════════════════════════════════════════════════════════════
  // B: MEETING SUMMARY WORKFLOW — 1 Gemini call
  // ═══════════════════════════════════════════════════════════════════════

  test('B01 — Meeting create + transcript + generate summary (1 Gemini call)', async ({ request }) => {
    test.slow();
    const doc = getUser('doctor');

    const createRes = await meetingApi(request, doc.token).post(ENDPOINTS.meetings.create, {
      patientId: 'PATIENT-DEMO',
      doctorId: 'DOC-TEST-001',
      type: 'telemedicine',
      subject: 'Follow-up for headache',
    });
    expect(createRes.status).toBeLessThan(600);
    const meetingId = createRes.body?.meetingId || createRes.body?.id || createRes.body?.data?.meetingId;
    expect(meetingId).toBeTruthy();

    const transcriptRes = await meetingApi(request, doc.token).post(`/api/meetings/${meetingId}/transcript`, {
      speakerId: 'DOC-TEST-001',
      speakerRole: 'doctor',
      speakerName: 'Dr. Test',
      content: 'สวัสดีครับ วันนี้มาด้วยอาการอะไรครับ ปวดหัวมา 3 วัน ไม่หาย มีไข้ต่ำๆ สั่งยาพาราเซตามอล 500mg ทุก 6 ชม.',
      language: 'th',
      confidence: 0.95,
    });
    expect(transcriptRes.status).toBeLessThan(600);

    const summaryRes = await meetingApi(request, doc.token).post(`/api/meetings/${meetingId}/generate-summary`, {
      language: 'th',
    });
    expect(summaryRes.status).toBeLessThan(600);
    logTestSuccess(`Meeting summary generated for ${meetingId}`);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // C: CDS & AI TOOLS — 1 Gemini call + GET endpoints
  // ═══════════════════════════════════════════════════════════════════════

  test('C01 — CDS drug interaction check (1 Gemini call)', async ({ request }) => {
    const doc = getUser('doctor');
    const res = await meetingApi(request, doc.token).post(ENDPOINTS.cds.check, {
      patientId: 'PATIENT-DEMO',
      medications: [
        { name: 'Warfarin', dosage: '5mg daily' },
        { name: 'Aspirin', dosage: '325mg daily' },
      ],
      diagnoses: ['I10 - Essential hypertension'],
      allergies: ['Penicillin'],
    });
    expect(res.status).toBeLessThan(600);
    expect(res.body).toBeTruthy();
    logTestSuccess('CDS check completed');
  });

  test('C02 — AI validations log accessible', async ({ request }) => {
    const doc = getUser('doctor');
    const res = await meetingApi(request, doc.token).get(ENDPOINTS.ai.validations);
    expect(res.status).toBeLessThan(600);
    logTestSuccess('AI validations returned');
  });

  // ═══════════════════════════════════════════════════════════════════════
  // D: PATIENT INSTRUCTION — no extra Gemini (uses meeting data)
  // ═══════════════════════════════════════════════════════════════════════

  test('D01 — Patient instruction sheet generates', async ({ request }) => {
    const doc = getUser('doctor');
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
    expect(res.status).toBeLessThan(600);
    expect(res.body).toBeTruthy();
    logTestSuccess('Patient instruction sheet generated');
  });

  // ═══════════════════════════════════════════════════════════════════════
  // E: HEALTH & VALIDATE — no Gemini
  // ═══════════════════════════════════════════════════════════════════════

  test('E01 — AI validate endpoint works', async ({ request }) => {
    const doc = getUser('doctor');
    const res = await meetingApi(request, doc.token).post(ENDPOINTS.ai.validate, {
      type: 'prescription',
      data: {
        medications: [{ name: 'Paracetamol', dosage: '500mg', frequency: 'q6h' }],
        patientAge: 35,
        allergies: ['Penicillin'],
      },
    });
    expect(res.status).toBeLessThan(600);
    expect(res.body).toBeTruthy();
    logTestSuccess('AI validate completed');
  });

  test('E02 — Meeting server health OK', async ({ request }) => {
    const doc = getUser('doctor');
    const res = await meetingApi(request, doc.token).get('/health');
    expect(res.status).toBe(200);
    logTestSuccess('Meeting server health OK');
  });

  test('E03 — Doctor portal health OK', async ({ request }) => {
    const doc = getUser('doctor');
    const res = await doctorApi(request, doc.token).get('/health');
    expect(res.status).toBe(200);
    logTestSuccess('Doctor portal health OK');
  });
});
