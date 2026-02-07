/**
 * =============================================================================
 * 06-AI-FEATURES — AI Chat, CDS, Summarization, Patient Instructions
 * =============================================================================
 * Based on: Processes/PHASE1_REQUIREMENTS.md (DR-01 to DR-05)
 *   - AI Pre-Consultation Summary (DR-02)
 *   - AI Document/PDF Analysis (DR-03)
 *   - Clinical Decision Support (DR-04)
 *   - Man-in-the-Loop Validation (DR-05)
 *   - Patient Instruction Sheet (4.5)
 *
 *   npx playwright test specs/06-ai-features.spec.ts
 * =============================================================================
 */
import { test, expect, APIRequestContext } from '@playwright/test';
import {
  PATIENT_URL, DOCTOR_URL,
  CREDENTIALS, getAuthToken, authHeaders, logTestSuccess, TIMEOUTS,
} from '../lib/test-config';

let ptk = '', dtk = '';
const T = TIMEOUTS.api;
const TL = TIMEOUTS.long; // 30s for AI calls

async function tokens(req: APIRequestContext) {
  if (!ptk) ptk = await getAuthToken(req, PATIENT_URL, CREDENTIALS.patient1);
  if (!dtk) dtk = await getAuthToken(req, DOCTOR_URL, CREDENTIALS.doctor);
}

// === 1. AI SERVICE HEALTH ===

test.describe('1. AI Service Health', () => {
  test('AI-01: Patient portal AI status', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/ai/status`, { timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Patient AI status OK');
  });

  test('AI-02: Doctor portal AI health', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/ai/health`, { timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('Doctor AI health OK');
  });
});

// === 2. AI CHAT ASSISTANT (DR-02, PB-03) ===

test.describe('2. AI Chat Assistant', () => {
  test.beforeAll(async ({ request }) => { await tokens(request); });

  test('AI-03: Patient AI symptom checker', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/ai/symptom-checker`, {
      headers: authHeaders(ptk),
      data: { symptoms: 'ปวดหัว มีไข้ คลื่นไส้', language: 'th' },
      timeout: TL,
    });
    expect([200, 201].includes(r.status())).toBe(true);
    logTestSuccess('AI symptom checker OK');
  });

  test('AI-04: Patient AI chat', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/ai/chat`, {
      headers: authHeaders(ptk),
      data: { message: 'ปวดหัวควรทำอย่างไร', sessionId: `e2e-${Date.now()}` },
      timeout: TL,
    });
    expect([200, 201].includes(r.status())).toBe(true);
    logTestSuccess('Patient AI chat OK');
  });

  test('AI-05: Doctor AI clinical assistant', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/chat`, {
      headers: authHeaders(dtk),
      data: {
        message: 'Patient with type 2 diabetes and CKD stage 3, what medication adjustments?',
        context: 'clinical',
      },
      timeout: TL,
    });
    expect([200, 201].includes(r.status())).toBe(true);
    logTestSuccess('Doctor AI clinical chat OK');
  });

  test('AI-06: AI chat history', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/ai/chat/history`, {
      headers: authHeaders(ptk), timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('AI chat history OK');
  });
});

// === 3. AI SUMMARIZATION (DR-02, DR-03) ===

test.describe('3. AI Summarization', () => {
  test.beforeAll(async ({ request }) => { await tokens(request); });

  test('AI-07: AI text summarization', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/summarize`, {
      headers: authHeaders(dtk),
      data: {
        text: 'ผู้ป่วยชาย อายุ 45 ปี มาด้วยอาการปวดหัวเรื้อรัง 2 สัปดาห์ ร่วมกับตามัว ไม่มีไข้ ไม่มีอาเจียน BP: 160/100 มีประวัติความดันสูง ไม่ได้ทานยา',
        format: 'soap',
      },
      timeout: TL,
    });
    expect([200, 201].includes(r.status())).toBe(true);
    logTestSuccess('AI text summarization OK');
  });

  test('AI-08: AI EMR summary', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/emr-summary`, {
      headers: authHeaders(dtk),
      data: {
        patientId: CREDENTIALS.patient1.id,
        transcript: 'Doctor: สวัสดีครับ วันนี้มาด้วยเรื่องอะไรครับ\nPatient: ปวดหัวมากครับ 2 วันแล้ว\nDoctor: มีไข้ด้วยไหมครับ\nPatient: มีครับ วัดได้ 38.5',
      },
      timeout: TL,
    });
    expect([200, 201].includes(r.status())).toBe(true);
    logTestSuccess('AI EMR summary OK');
  });

  test('AI-09: AI pre-consultation summary', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/pre-consultation-summary`, {
      headers: authHeaders(dtk),
      data: { patientId: CREDENTIALS.patient1.id },
      timeout: TL });
    expect([200, 201].includes(r.status())).toBe(true);
    logTestSuccess('AI pre-consultation summary OK');
  });

  test('AI-10: AI document analysis (DR-03)', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/analyze-document`, {
      headers: authHeaders(dtk),
      data: {
        documentText: 'Lab Results:\nCBC: WBC 12,000, RBC 4.5M, Hgb 14.2, Plt 250K\nFBS: 126 mg/dL\nHbA1c: 7.2%\nCreatinine: 1.8 mg/dL\neGFR: 45 mL/min',
        documentType: 'lab_results',
        patientId: CREDENTIALS.patient1.id,
      },
      timeout: TL,
    });
    expect([200, 201].includes(r.status())).toBe(true);
    logTestSuccess('AI document analysis OK');
  });
});

// === 4. CLINICAL DECISION SUPPORT (DR-04) ===

test.describe('4. Clinical Decision Support', () => {
  test.beforeAll(async ({ request }) => { await tokens(request); });

  test('AI-11: CDS drug interaction check', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/cds/drug-interactions`, {
      headers: authHeaders(dtk),
      data: {
        drugs: ['Metformin 500mg', 'Lisinopril 10mg'],
        patientId: CREDENTIALS.patient1.id,
      },
      timeout: TL,
    });
    expect([200, 201].includes(r.status())).toBe(true);
    logTestSuccess('CDS recommendation OK');
  });

  test('AI-12: AI drug interaction check', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/cds/drug-interactions`, {
      headers: authHeaders(dtk),
      data: {
        drugs: ['Metformin', 'Warfarin', 'Aspirin'],
      },
      timeout: TL,
    });
    expect([200, 201].includes(r.status())).toBe(true);
    logTestSuccess('Drug interaction check OK');
  });
});

// === 5. PATIENT INSTRUCTION SHEET (4.5) ===

test.describe('5. Patient Instruction Sheet', () => {
  test.beforeAll(async ({ request }) => { await tokens(request); });

  test('AI-13: Generate patient instructions', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/patient-instructions`, {
      headers: authHeaders(dtk),
      data: {
        patientId: CREDENTIALS.patient1.id,
        diagnosis: 'Acute febrile illness',
        treatment: 'Paracetamol 500mg every 6 hours',
        followUp: '3 days if not improving',
        language: 'th',
      },
      timeout: TL,
    });
    expect([200, 201].includes(r.status())).toBe(true);
    const body = await r.json();
    if (body.instructions || body.content) {
      expect(body.requiresValidation === undefined || body.requiresValidation === true).toBe(true);
    }
    logTestSuccess('Patient instructions generated (Man-in-the-Loop)');
  });

  test('AI-14: Save patient instructions', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/patient-instructions`, {
      headers: authHeaders(dtk),
      data: {
        patientId: CREDENTIALS.patient1.id,
        appointmentId: `INSTR-E2E-${Date.now()}`,
        content: 'คำแนะนำหลังพบแพทย์: 1. ทานยาพาราเซตามอล 2. ดื่มน้ำมาก 3. พักผ่อนให้เพียงพอ',
        validated: true,
        validatedBy: CREDENTIALS.doctor.id,
      },
      timeout: T,
    });
    expect([200, 201].includes(r.status())).toBe(true);
    logTestSuccess('Patient instructions saved');
  });
});

// === 6. MAN-IN-THE-LOOP VALIDATION (DR-05) ===

test.describe('6. Man-in-the-Loop Validation', () => {
  test.beforeAll(async ({ request }) => { await tokens(request); });

  test('AI-15: AI validation endpoint', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/validate`, {
      headers: authHeaders(dtk),
      data: {
        type: 'emr_summary',
        content: 'AI-generated EMR summary for validation test',
        patientId: CREDENTIALS.patient1.id,
      },
      timeout: TL,
    });
    expect([200, 201].includes(r.status())).toBe(true);
    logTestSuccess('AI validation endpoint OK');
  });

  test('AI-16: List AI validations', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/ai/validations`, {
      headers: authHeaders(dtk), timeout: T });
    expect(r.status()).toBe(200);
    logTestSuccess('AI validations list OK');
  });

  test('AI-17: Knowledge base query', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/ai/knowledge?query=diabetes+treatment+guidelines`, {
      headers: authHeaders(dtk), timeout: TL });
    expect(r.status()).toBe(200);
    logTestSuccess('Knowledge base OK');
  });

  test('AI-18: Knowledge base search', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/knowledge/search`, {
      headers: authHeaders(dtk),
      data: { query: 'diabetes treatment guidelines 2025' },
      timeout: TL,
    });
    expect([200, 201].includes(r.status())).toBe(true);
    logTestSuccess('Knowledge base search OK');
  });
});
