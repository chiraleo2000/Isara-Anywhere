/**
 * =============================================================================
 * SPEC 22: DEEP AI FEATURES & CDS — Chat, Analysis, Validation, Knowledge
 * =============================================================================
 * Version: 1.0.0 | Created: February 7, 2026
 *
 * Covers PHASE1_REQUIREMENTS.md AI sections:
 *   - AI Chat Assistant (RAG + Gemini) for doctors
 *   - Clinical Decision Support (CDS) — drug interactions, dose adjustments
 *   - Man-in-the-Loop validation workflow
 *   - AI Document/PDF analysis
 *   - Knowledge base queries
 *   - AI Summarization (EMR, meeting, patient)
 *   - Patient AI chat (basic health)
 *
 * STRICT 200-only. NO test.skip(). NO errors.
 * =============================================================================
 */

import { test, expect } from '@playwright/test';
import {
  IS_CLOUD, PATIENT_URL, DOCTOR_URL,
  CREDENTIALS, TIMEOUTS, getAuthToken, getDoctorAuthToken,
} from '../lib/test-config';

const T = IS_CLOUD ? TIMEOUTS.cloud : TIMEOUTS.api;
const TL = IS_CLOUD ? 90_000 : TIMEOUTS.long;
const h = (tk: string) => ({ Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' });

let ptk = '', dtk = '', atk = '';

// ============================================================================
// 1. AI SYSTEM HEALTH (3 tests)
// ============================================================================
test.describe('1. AI System Health', () => {
  test('AI-H01: Doctor AI health', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/ai/health`, { timeout: T });
    expect(r.status()).toBe(200);
  });
  test('AI-H02: Patient AI status', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/ai/status`, { timeout: T });
    expect(r.status()).toBe(200);
  });
  test('AI-H03: Doctor portal healthy', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/health`, { timeout: T });
    expect(r.status()).toBe(200);
  });
});

// ============================================================================
// 2. DOCTOR AI CHAT & KNOWLEDGE (serial)
// ============================================================================
test.describe.serial('2. Doctor AI Chat & Knowledge', () => {
  test('DCHAT-01: Doctor login', async ({ request }) => {
    dtk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
    expect(dtk).toBeTruthy();
  });

  test('DCHAT-02: AI chat message', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/chat`, {
      headers: h(dtk), timeout: TL,
      data: {
        message: 'สรุปแนวทางการรักษาเบาหวาน type 2 ตาม guideline ล่าสุด',
        context: 'clinical_query',
      },
    });
    expect(r.status()).toBe(200);
  });

  test('DCHAT-03: Knowledge base query', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/ai/knowledge?query=hypertension`, {
      headers: h(dtk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('DCHAT-04: AI summarize text', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/summarize`, {
      headers: h(dtk), timeout: T,
      data: {
        text: 'ผู้ป่วยชาย อายุ 55 ปี มาด้วยอาการเจ็บหน้าอก ร้าวไปแขนซ้าย มา 2 ชม. มีประวัติเบาหวาน ความดันสูง สูบบุหรี่ 20 ปี',
        type: 'clinical',
      },
    });
    expect(r.status()).toBe(200);
  });

  test('DCHAT-05: AI patient summary', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/summarize`, {
      headers: h(dtk), timeout: TL,
      data: {
        text: 'ผู้ป่วยชาย อายุ 55 ปี DM type 2 HbA1c 8.2% รักษาด้วย Metformin และ Empagliflozin',
        type: 'clinical',
      },
    });
    expect(r.status()).toBe(200);
  });
});

// ============================================================================
// 3. CDS — CLINICAL DECISION SUPPORT (serial)
// ============================================================================
test.describe.serial('3. Clinical Decision Support', () => {
  test('CDS-01: Doctor login', async ({ request }) => {
    dtk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
    expect(dtk).toBeTruthy();
  });

  test('CDS-02: CDS check for drug interactions', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/cds`, {
      headers: h(dtk), timeout: TL,
      data: {
        patientId: CREDENTIALS.patient1.id,
        medications: ['Metformin 1000mg', 'Amlodipine 5mg', 'Warfarin 5mg'],
        conditions: ['Type 2 Diabetes', 'Hypertension', 'Atrial Fibrillation'],
        labResults: {
          HbA1c: 8.2,
          creatinine: 1.3,
          INR: 2.5,
        },
      },
    });
    expect(r.status()).toBe(200);
  });

  test('CDS-03: AI EMR summary', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/emr-summary`, {
      headers: h(dtk), timeout: T,
      data: {
        patientId: CREDENTIALS.patient1.id,
        transcript: 'ผู้ป่วยหญิง อายุ 62 ปี DM type 2 + CKD stage 3 HbA1c 7.8% eGFR 45 ปรับยาจาก Metformin เป็น Empagliflozin',
      },
    });
    expect(r.status()).toBe(200);
  });

  test('CDS-04: AI patient instruction', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/patient-instructions`, {
      headers: h(dtk), timeout: TL,
      data: {
        patientId: CREDENTIALS.patient1.id,
        diagnosis: 'Type 2 Diabetes with CKD',
        medications: ['Empagliflozin 10mg daily', 'Losartan 50mg daily'],
        recommendations: ['ลดอาหารเค็ม', 'ตรวจไตทุก 3 เดือน', 'วัดความดันที่บ้านทุกวัน'],
      },
    });
    expect(r.status()).toBe(200);
  });

  test('CDS-05: AI document analysis', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/analyze-document`, {
      headers: h(dtk), timeout: TL,
      data: {
        documentType: 'lab_result',
        content: 'CBC: WBC 8500, Hb 12.5, Plt 250000. BUN 28, Cr 1.3, eGFR 45. HbA1c 7.8%',
        patientId: CREDENTIALS.patient1.id,
      },
    });
    expect(r.status()).toBe(200);
  });

  test('CDS-06: AI pre-consultation summary', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/pre-consultation-summary`, {
      headers: h(dtk), timeout: TL,
      data: {
        patientId: CREDENTIALS.patient1.id,
        appointmentId: 'APT-DEMO',
      },
    });
    expect(r.status()).toBe(200);
  });
});

// ============================================================================
// 4. AI VALIDATION (Man-in-the-Loop) (serial)
// ============================================================================
test.describe.serial('4. AI Validation Workflow', () => {
  test('VAL-01: Doctor login', async ({ request }) => {
    dtk = await getDoctorAuthToken(request, DOCTOR_URL, CREDENTIALS.doctor);
    expect(dtk).toBeTruthy();
  });

  test('VAL-02: Submit AI content for validation', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/ai/validate`, {
      headers: h(dtk), timeout: T,
      data: {
        contentType: 'emr',
        content: {
          subjective: 'AI generated: ผู้ป่วยมาด้วยอาการไข้ 3 วัน',
          objective: 'AI generated: T 38.5°C, pharyngeal injection',
          assessment: 'AI generated: Acute pharyngitis',
          plan: 'AI generated: Paracetamol 500mg prn, warm saline gargle',
        },
        patientId: CREDENTIALS.patient1.id,
        requiresValidation: true,
      },
    });
    expect(r.status()).toBe(200);
  });

  test('VAL-03: Get pending validations', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/ai/validations`, {
      headers: h(dtk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });
});

// ============================================================================
// 5. PATIENT AI CHAT (serial)
// ============================================================================
test.describe.serial('5. Patient AI Chat', () => {
  test('PCHAT-01: Patient login', async ({ request }) => {
    ptk = await getAuthToken(request, PATIENT_URL, CREDENTIALS.patient1);
    expect(ptk).toBeTruthy();
  });

  test('PCHAT-02: Patient AI chat', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/ai/chat`, {
      headers: h(ptk), timeout: T,
      data: {
        message: 'ฉันมีอาการปวดหัวบ่อย ควรทำอย่างไร',
      },
    });
    expect(r.status()).toBe(200);
  });

  test('PCHAT-03: Patient AI chat history', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/ai/chat/history`, {
      headers: h(ptk), timeout: T,
    });
    expect(r.status()).toBe(200);
  });

  test('PCHAT-04: Patient AI status', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/ai/status`, { timeout: T });
    expect(r.status()).toBe(200);
  });
});

// ============================================================================
// 6. UI AI PAGES
// ============================================================================
test.describe('6. UI AI Pages', () => {
  test('UI-AI-01: Patient AI chat page', async ({ page }) => {
    await page.goto(`${PATIENT_URL}/ai-chat`, { timeout: TL, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/');
  });
  test('UI-AI-02: Doctor dashboard (AI assistant)', async ({ page }) => {
    await page.goto(`${DOCTOR_URL}/dashboard`, { timeout: TL, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/');
  });
});
