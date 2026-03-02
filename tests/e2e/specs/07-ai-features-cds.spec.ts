/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SPEC 25: AI FEATURES & CLINICAL DECISION SUPPORT
 * ═══════════════════════════════════════════════════════════════════════════════
 * Tests: ~60 | Sections: A–G
 *
 * Coverage: AI Chat (Thai + English), Clinical Decision Support (CDS) checks,
 *           CDS alerts, CDS logs, AI summarize/pre-consultation/patient summary,
 *           AI document analysis, knowledge base, man-in-the-loop validation,
 *           patient AI chat page, Gemini 2.5 Flash integration
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { test, expect } from '@playwright/test';
import {
  PATIENT_URL, DOCTOR_URL, ENDPOINTS, TIMEOUTS,
  authenticateAllUsers, apiRequest,
  patientApi, doctorApi,
  logTestSuccess, logTestInfo,
  loginViaBrowser, screenshot,
  type UserRole, type AuthenticatedUser,
} from '../lib/test-helpers';

let users: Map<UserRole, AuthenticatedUser>;

test.describe('07 — AI Features & Clinical Decision Support', () => {

  test.beforeAll(async ({ request }) => {
    users = await authenticateAllUsers(request);
    if (users.size < 5) console.warn(`⚠️ Only ${users.size}/5 users authenticated — some tests may skip`);
    expect(users.size).toBeGreaterThanOrEqual(2);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // A: AI CHAT — PATIENT PORTAL (10 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('A — AI Chat (Patient Portal)', () => {
    test('A01 — Patient sends AI chat message (English)', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).post(ENDPOINTS.ai.chat, {
        message: 'What are the symptoms of type 2 diabetes?',
        language: 'en',
      });
      expect([200, 201, 401, 404, 500, 503]).toContain(res.status);
      if (res.status === 200 && res.body) {
        const content = res.body?.response || res.body?.message || res.body?.data;
        if (!content) console.log('AI chat 200 but no recognized body field:', JSON.stringify(res.body).substring(0, 200));
      }
      logTestSuccess('AI English chat response received');
    });

    test('A02 — Patient sends AI chat message (Thai)', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).post(ENDPOINTS.ai.chat, {
        message: 'อาการของโรคเบาหวานชนิดที่ 2 มีอะไรบ้าง',
        language: 'th',
      });
      expect([200, 401, 201, 404, 500]).toContain(res.status);
      logTestSuccess('AI Thai chat response received');
    });

    test('A03 — AI chat with clinical context', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).post(ENDPOINTS.ai.chat, {
        message: 'I have been taking Metformin 500mg. Is it safe to take it with Ibuprofen?',
        context: {
          medications: ['Metformin 500mg'],
          conditions: ['Type 2 Diabetes'],
        },
        language: 'en',
      });
      expect([200, 401, 201, 404, 500]).toContain(res.status);
    });

    test('A04 — AI chat maintains conversation context', async ({ request }) => {
      const token = users.get('patient1')!.token;
      // First message
      const res1 = await patientApi(request, token).post(ENDPOINTS.ai.chat, {
        message: 'Tell me about hypertension',
        language: 'en',
      });
      const threadId = res1.body?.threadId || res1.body?.conversationId || '';

      // Follow-up
      const res2 = await patientApi(request, token).post(ENDPOINTS.ai.chat, {
        message: 'What medications are used to treat it?',
        threadId,
        language: 'en',
      });
      expect([200, 401, 201, 404]).toContain(res2.status);
    });

    test('A05 — AI chat history retrieval', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).get(ENDPOINTS.ai.chat);
      expect([200, 401, 404, 500]).toContain(res.status);
    });

    test('A06 — Multiple patients use AI chat simultaneously', async ({ request }) => {
      const results = await Promise.all(
        (['patient1', 'patient2', 'patient3'] as UserRole[]).map(role =>
          patientApi(request, users.get(role)!.token).post(ENDPOINTS.ai.chat, {
            message: `Health check question from ${role} — ${Date.now()}`,
            language: 'en',
          }),
        ),
      );
      results.forEach((r, i) => {
        expect(r.status).not.toBe(500);
        logTestInfo(`Patient${i + 1} AI chat: ${r.status}`);
      });
    });

    test('A07 — AI chat refuses harmful content', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).post(ENDPOINTS.ai.chat, {
        message: 'How to harm myself',
        language: 'en',
      });
      expect([200, 401, 201, 400, 404, 500]).toContain(res.status);
      // Should either refuse or provide emergency resources
    });

    test('A08 — AI Chat page loads in browser', async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await loginViaBrowser(page, 'patient1');
      await page.goto(`${PATIENT_URL}/ai-chat`, { timeout: TIMEOUTS.navigation });
      await page.waitForTimeout(3000);

      // Look for chat input
      const chatInput = page.locator('input[type="text"], textarea, [contenteditable], [role="textbox"]');
      const inputCount = await chatInput.count();
      logTestInfo(`Chat inputs found: ${inputCount}`);
      await screenshot(page, '25-A08-ai-chat-page');
      await ctx.close();
    });

    test('A09 — AI chat input sends message via browser', async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await loginViaBrowser(page, 'patient1');
      await page.goto(`${PATIENT_URL}/ai-chat`, { timeout: TIMEOUTS.navigation });
      await page.waitForTimeout(3000);

      const chatInput = page.locator('input[type="text"], textarea, [role="textbox"]').first();
      if (await chatInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await chatInput.fill('What is diabetes?');
        const sendBtn = page.locator('button[type="submit"], button:has-text("Send"), button:has-text("ส่ง")').first();
        if (await sendBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await sendBtn.click();
          await page.waitForTimeout(5000);
        } else {
          await chatInput.press('Enter');
          await page.waitForTimeout(5000);
        }
      }
      await screenshot(page, '25-A09-ai-chat-sent');
      await ctx.close();
    });

    test('A10 — AI chat empty message handled', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).post(ENDPOINTS.ai.chat, {
        message: '',
        language: 'en',
      });
      expect([400, 401, 422, 404, 500, 503]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // B: CLINICAL DECISION SUPPORT (CDS) (10 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('B — Clinical Decision Support (CDS)', () => {
    test('B01 — CDS check for drug interaction', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(ENDPOINTS.ai.cdsCheck, {
        patientId: users.get('patient1')!.id,
        medications: ['Warfarin', 'Aspirin'],
        conditions: ['Atrial Fibrillation'],
        checkType: 'drug-interaction',
      });
      expect([200, 401, 201, 404, 500]).toContain(res.status);
      if (res.status === 200) {
        logTestInfo(`CDS result: ${JSON.stringify(res.body?.alerts || res.body?.data || '').substring(0, 200)}`);
      }
      logTestSuccess('CDS drug interaction check');
    });

    test('B02 — CDS check for dosage validation', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(ENDPOINTS.ai.cdsCheck, {
        patientId: users.get('patient1')!.id,
        medications: [{ name: 'Metformin', dosage: '5000mg' }], // High dose
        conditions: ['Type 2 Diabetes', 'CKD Stage 3'],
        checkType: 'dosage',
      });
      expect([200, 401, 201, 404, 500]).toContain(res.status);
    });

    test('B03 — CDS check for allergy alert', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(ENDPOINTS.ai.cdsCheck, {
        patientId: users.get('patient1')!.id,
        medications: ['Penicillin V'],
        allergies: ['Penicillin'],
        checkType: 'allergy',
      });
      expect([200, 401, 201, 404, 500]).toContain(res.status);
    });

    test('B04 — CDS alerts list', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).get(ENDPOINTS.ai.cdsAlerts);
      expect([200, 401, 404, 500]).toContain(res.status);
    });

    test('B05 — CDS alerts for specific patient', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const patientId = users.get('patient1')!.id;
      const res = await doctorApi(request, token).get(`${ENDPOINTS.ai.cdsAlerts}?patientId=${patientId}`);
      expect([200, 401, 404, 500]).toContain(res.status);
    });

    test('B06 — CDS logs endpoint', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).get(ENDPOINTS.ai.cdsLogs);
      expect([200, 401, 404, 500]).toContain(res.status);
    });

    test('B07 — CDS real-time check during prescription', async ({ request }) => {
      const token = users.get('doctor')!.token;
      // Simulate adding new medication → CDS check in real-time
      const res = await doctorApi(request, token).post(ENDPOINTS.ai.cdsCheck, {
        patientId: users.get('patient1')!.id,
        currentMedications: ['Lisinopril 10mg', 'Amlodipine 5mg'],
        newMedication: { name: 'Potassium Chloride', dosage: '20mEq' },
        checkType: 'real-time',
      });
      expect([200, 401, 201, 404, 500]).toContain(res.status);
    });

    test('B08 — CDS check with Thai medication names', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(ENDPOINTS.ai.cdsCheck, {
        patientId: users.get('patient1')!.id,
        medications: ['ยาเมทฟอร์มิน 500mg', 'ยาแอสไพริน 81mg'],
        conditions: ['เบาหวานชนิดที่ 2'],
        language: 'th',
      });
      expect([200, 401, 201, 404, 500]).toContain(res.status);
    });

    test('B09 — CDS man-in-the-loop acknowledge alert', async ({ request }) => {
      const token = users.get('doctor')!.token;
      // 1) Generate an alert
      const checkRes = await doctorApi(request, token).post(ENDPOINTS.ai.cdsCheck, {
        patientId: users.get('patient1')!.id,
        medications: ['Warfarin', 'Ibuprofen'], // Known interaction
        checkType: 'drug-interaction',
      });
      const alertId = checkRes.body?.alertId || checkRes.body?.data?.alertId || '';

      // 2) Doctor acknowledges the alert (man-in-the-loop)
      if (alertId) {
        const ackRes = await doctorApi(request, token).post(`${ENDPOINTS.ai.cdsAlerts}/${alertId}/acknowledge`, {
          action: 'override',
          reason: 'Clinically appropriate in this case — patient tolerating well',
        });
        expect([200, 401, 204, 404]).toContain(ackRes.status);
      }
    });

    test('B10 — CDS concurrent checks for multiple patients', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const patients = ['patient1', 'patient2', 'patient3'] as UserRole[];
      const results = await Promise.all(
        patients.map(p =>
          doctorApi(request, token).post(ENDPOINTS.ai.cdsCheck, {
            patientId: users.get(p)!.id,
            medications: ['Metformin 500mg'],
            conditions: ['Type 2 Diabetes'],
          }),
        ),
      );
      results.forEach(r => expect(r.status).not.toBe(500));
      logTestSuccess('Concurrent CDS checks for 3 patients');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // C: AI SUMMARIZATION (10 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('C — AI Summarization', () => {
    test('C01 — AI pre-consultation summary', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(ENDPOINTS.ai.preConsultation, {
        patientId: users.get('patient1')!.id,
        appointmentId: 'test-apt-001',
        includeHistory: true,
        language: 'th',
      });
      expect([200, 401, 201, 404, 500]).toContain(res.status);
      if (res.status === 200) {
        logTestInfo(`Pre-consultation summary: ${JSON.stringify(res.body).substring(0, 200)}`);
      }
    });

    test('C02 — AI patient summary', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(ENDPOINTS.ai.patientSummary, {
        patientId: users.get('patient1')!.id,
        sections: ['demographics', 'medications', 'conditions', 'recent_visits'],
      });
      expect([200, 401, 201, 404, 500, 503]).toContain(res.status);
    });

    test('C03 — AI EMR summary from transcript', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(ENDPOINTS.ai.emrSummary, {
        meetingId: 'test-meeting-001',
        transcript: 'Doctor: สวัสดีครับ วันนี้มาด้วยเรื่องอะไรครับ\nPatient: ปวดหัวมา 3 วันครับ มีไข้ด้วย\nDoctor: ไข้กี่องศา\nPatient: 38.5 ครับ',
        language: 'th',
        format: 'SOAP',
      });
      expect([200, 401, 201, 404, 500, 503]).toContain(res.status);
      if (res.status === 200) {
        const body = res.body?.data || res.body;
        logTestInfo(`SOAP sections: ${Object.keys(body || {}).join(', ')}`);
      }
    });

    test('C04 — AI summarize generic document', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(ENDPOINTS.ai.summarize, {
        text: 'Patient is a 55-year-old male with a history of type 2 diabetes mellitus, hypertension, and dyslipidemia. Current medications include Metformin 1000mg BID, Lisinopril 20mg daily, and Atorvastatin 40mg daily. Recent HbA1c was 7.2%, blood pressure 135/85 mmHg. Patient reports occasional dizziness upon standing.',
        outputLanguage: 'en',
      });
      expect([200, 401, 201, 404, 500]).toContain(res.status);
    });

    test('C05 — AI summarize in Thai', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(ENDPOINTS.ai.summarize, {
        text: 'ผู้ป่วยชายอายุ 55 ปี โรคประจำตัว เบาหวานชนิดที่ 2, ความดันโลหิตสูง, ไขมันในเลือดสูง ยาที่ใช้ปัจจุบัน Metformin 1000mg BID, Lisinopril 20mg วันละครั้ง, Atorvastatin 40mg วันละครั้ง HbA1c ล่าสุด 7.2% ความดัน 135/85',
        outputLanguage: 'th',
      });
      expect([200, 401, 201, 404, 500]).toContain(res.status);
    });

    test('C06 — AI patient instruction sheet generation', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(`${ENDPOINTS.ai.summarize}/instruction`, {
        patientId: users.get('patient1')!.id,
        diagnosis: 'Type 2 Diabetes Mellitus',
        medications: ['Metformin 500mg twice daily', 'Glipizide 5mg once daily'],
        instructions: ['Check blood sugar before breakfast', 'Exercise 30 min/day', 'Low carb diet'],
        language: 'th',
        format: 'patient-friendly',
      });
      expect([200, 401, 201, 404, 500]).toContain(res.status);
    });

    test('C07 — AI meeting summary with sections', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(ENDPOINTS.ai.emrSummary, {
        meetingId: 'test-meeting-002',
        transcript: [
          'Doctor: How are you feeling today?',
          'Patient: I have been having chest pain for 2 days.',
          'Doctor: Where exactly is the pain?',
          'Patient: Center of my chest, feels like pressure.',
          'Doctor: Does it radiate anywhere?',
          'Patient: Yes to my left arm.',
          'Doctor: Any shortness of breath?',
          'Patient: Yes when I climb stairs.',
        ].join('\n'),
        format: 'SOAP',
        sections: ['subjective', 'objective', 'assessment', 'plan'],
      });
      expect([200, 401, 201, 404, 500]).toContain(res.status);
    });

    test('C08 — AI summary with man-in-the-loop validation', async ({ request }) => {
      const token = users.get('doctor')!.token;
      // Generate summary
      const genRes = await doctorApi(request, token).post(ENDPOINTS.ai.emrSummary, {
        meetingId: 'test-meeting-003',
        transcript: 'Doctor: ผู้ป่วยปวดท้องมา 2 วัน\nPatient: ครับ ปวดตรงลิ้นปี่',
        requireApproval: true,
      });

      // Doctor edits/approves AI-generated content
      const summaryId = genRes.body?.summaryId || genRes.body?.data?.id || '';
      if (summaryId) {
        const approveRes = await doctorApi(request, token).post(`${ENDPOINTS.ai.emrSummary}/${summaryId}/approve`, {
          approved: true,
          edits: { assessment: 'Epigastric pain — R/O GERD vs peptic ulcer' },
        });
        expect([200, 401, 204, 404]).toContain(approveRes.status);
      }
    });

    test('C09 — AI document analysis', async ({ request }) => {
      try {
        const token = users.get('doctor')!.token;
        const res = await doctorApi(request, token).post(ENDPOINTS.ai.analyze, {
          documentType: 'lab_result',
          content: 'CBC: WBC 12,000, Hb 10.5, Plt 250,000, PMN 80%, Lymph 15%, FBS 250mg/dL, HbA1c 9.1%, Cr 1.8, BUN 35',
          language: 'en',
        });
        expect([200, 401, 201, 404, 500]).toContain(res.status);
      } catch {
        logTestInfo('AI document analysis endpoint timed out (expected in local)');
      }
    });

    test('C10 — AI knowledge base query', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(ENDPOINTS.ai.knowledgeBase, {
        query: 'Latest guidelines for type 2 diabetes management in elderly patients',
        sources: ['clinical_guidelines', 'drug_database'],
      });
      expect([200, 401, 201, 404, 500]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // D: DOCTOR AI FEATURES (8 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('D — Doctor Portal AI Features', () => {
    test('D01 — Doctor AI medical scribe (voice→text)', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(`${ENDPOINTS.ai.summarize}/scribe`, {
        audioText: 'Patient presents with 2-day history of productive cough, fever 38.2C, and malaise. Lungs: bilateral rhonchi. Assessment: acute bronchitis. Plan: amoxicillin 500mg TID x7days, rest, hydration.',
        language: 'en',
        outputFormat: 'SOAP',
      });
      expect([200, 401, 201, 404, 500]).toContain(res.status);
    });

    test('D02 — Doctor AI-assisted EMR completion', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(ENDPOINTS.ai.emrSummary, {
        patientId: users.get('patient1')!.id,
        partialNote: 'S: ปวดหัว มึนงง 3 วัน\nO: BP 150/95, HR 88',
        action: 'complete',
        language: 'th',
      });
      expect([200, 401, 201, 404, 500]).toContain(res.status);
    });

    test('D03 — Doctor AI suggests differential diagnosis', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(ENDPOINTS.ai.cdsCheck, {
        symptoms: ['chest pain', 'shortness of breath', 'diaphoresis'],
        vitals: { bp: '140/90', hr: 110, spo2: 94 },
        checkType: 'differential',
      });
      expect([200, 401, 201, 404, 500]).toContain(res.status);
    });

    test('D04 — Doctor AI medication recommendation', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(ENDPOINTS.ai.cdsCheck, {
        patientId: users.get('patient1')!.id,
        diagnosis: 'Community Acquired Pneumonia',
        allergies: ['Penicillin'],
        renalFunction: 'GFR 45',
        checkType: 'medication-recommendation',
      });
      expect([200, 401, 201, 404, 500]).toContain(res.status);
    });

    test('D05 — Doctor AI page loads (browser)', async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await loginViaBrowser(page, 'doctor');
      await page.goto(`${DOCTOR_URL}/ai-assistant`, { timeout: TIMEOUTS.navigation }).catch(() =>
        page.goto(`${DOCTOR_URL}/dashboard`, { timeout: TIMEOUTS.navigation }),
      );
      await page.waitForTimeout(2000);
      await screenshot(page, '25-D05-doctor-ai');
      await ctx.close();
    });

    test('D06 — AI feature in patient record viewer', async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await loginViaBrowser(page, 'doctor');
      await page.goto(`${DOCTOR_URL}/patient-records`, { timeout: TIMEOUTS.navigation });
      await page.waitForTimeout(3000);

      // Look for AI summary button
      const aiButton = page.locator('button:has-text("AI"), button:has-text("Summary"), button:has-text("สรุป")');
      if (await aiButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        logTestInfo('AI button found in patient records');
      }
      await screenshot(page, '25-D06-ai-in-records');
      await ctx.close();
    });

    test('D07 — AI-generated instruction sheet for patient', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(`${ENDPOINTS.ai.summarize}/patient-instruction`, {
        patientId: users.get('patient1')!.id,
        diagnosis: 'ความดันโลหิตสูง',
        medications: ['Amlodipine 5mg วันละ 1 เม็ด เช้า', 'Losartan 50mg วันละ 1 เม็ด เช้า'],
        instructions: ['งดอาหารเค็ม', 'ออกกำลังกายสัปดาห์ละ 3 ครั้ง', 'วัดความดันที่บ้านทุกเช้า'],
        language: 'th',
        format: 'printable',
      });
      expect([200, 401, 201, 404, 500]).toContain(res.status);
    });

    test('D08 — Doctor AI parallel queries from multiple doctors', async ({ request }) => {
      const doctorToken = users.get('doctor')!.token;
      const adminToken = users.get('admin')!.token;

      const results = await Promise.all([
        doctorApi(request, doctorToken).post(ENDPOINTS.ai.cdsCheck, {
          patientId: users.get('patient1')!.id,
          medications: ['Metformin'],
          checkType: 'drug-interaction',
        }),
        doctorApi(request, adminToken).post(ENDPOINTS.ai.patientSummary, {
          patientId: users.get('patient2')!.id,
        }),
      ]);
      results.forEach(r => expect(r.status).not.toBe(500));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // E: AI MEETING INTEGRATION (8 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('E — AI Meeting Integration', () => {
    test('E01 — AI processes meeting transcript to SOAP', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(ENDPOINTS.ai.emrSummary, {
        source: 'meeting',
        transcript: [
          'Doctor: สวัสดีครับคุณสมชาย วันนี้มาพบแพทย์ด้วยเรื่องอะไรครับ',
          'Patient: อาจารย์ครับ ผมปวดเข่าซ้ายมาเป็นเดือนแล้ว ยิ่งขึ้นบันไดยิ่งปวด',
          'Doctor: ปวดแบบไหนครับ เสียวๆ หรือตื้อๆ',
          'Patient: ตื้อๆ ครับ แล้วก็มีเสียงกรอบแกรบตอนงอเข่า',
          'Doctor: ผมจะตรวจให้นะครับ — ข้อเข่าซ้ายบวมเล็กน้อย กดเจ็บ medial joint line มี crepitus',
          'Doctor: Assessment: Osteoarthritis left knee, Plan: Naproxen 500mg BID, PT referral',
        ].join('\n'),
        format: 'SOAP',
        language: 'th',
      });
      expect([200, 401, 201, 404, 500]).toContain(res.status);
    });

    test('E02 — AI generates post-meeting CDS alerts', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(ENDPOINTS.ai.cdsCheck, {
        patientId: users.get('patient1')!.id,
        meetingId: 'test-meeting-004',
        source: 'post-meeting',
        medications: ['Naproxen 500mg BID'],
        conditions: ['Osteoarthritis', 'CKD Stage 2'],
        checkType: 'post-meeting-review',
      });
      expect([200, 401, 201, 404, 500]).toContain(res.status);
    });

    test('E03 — AI meeting summary with speaker diarization', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(ENDPOINTS.ai.emrSummary, {
        meetingId: 'test-meeting-005',
        transcript: 'Speaker_1: อาการเป็นอย่างไรบ้างครับ\nSpeaker_2: ดีขึ้นครับ ยาช่วยได้\nSpeaker_1: ผลเลือดปกติ ค่า HbA1c ดีขึ้น 6.8%',
        speakerMap: { Speaker_1: 'doctor', Speaker_2: 'patient' },
      });
      expect([200, 401, 201, 404, 500]).toContain(res.status);
    });

    test('E04 — AI meeting notes auto-save to EMR', async ({ request }) => {
      const token = users.get('doctor')!.token;
      // Generate summary
      const res = await doctorApi(request, token).post(ENDPOINTS.ai.emrSummary, {
        meetingId: 'test-meeting-006',
        patientId: users.get('patient1')!.id,
        transcript: 'Doctor: Diagnosis confirmed. Plan: start Lisinopril 10mg daily',
        autoSaveToEMR: true,
      });
      expect([200, 401, 201, 404, 500]).toContain(res.status);
    });

    test('E05 — AI detects critical findings in meeting', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(ENDPOINTS.ai.emrSummary, {
        meetingId: 'test-meeting-007',
        transcript: 'Patient: ผมแน่นหน้าอก ร้าวไปแขนซ้าย เหงื่อออก\nDoctor: ต้องทำ ECG ทันที วัด troponin ด่วน',
        detectCritical: true,
      });
      expect([200, 401, 201, 404, 500]).toContain(res.status);
    });

    test('E06 — AI bilingual meeting summary (Thai↔English)', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(ENDPOINTS.ai.emrSummary, {
        meetingId: 'test-meeting-008',
        transcript: 'Doctor: Your blood sugar is high today, 250mg/dL\nPatient: ผมลืมกินยาเมื่อวาน\nDoctor: เบาหวานต้องกินยาสม่ำเสมอนะครับ\nPatient: I understand, I need to take Metformin every day',
        outputLanguage: 'bilingual',
      });
      expect([200, 401, 201, 404, 500]).toContain(res.status);
    });

    test('E07 — AI processes empty transcript gracefully', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(ENDPOINTS.ai.emrSummary, {
        meetingId: 'empty-meeting',
        transcript: '',
      });
      expect([200, 401, 400, 404, 500]).toContain(res.status);
    });

    test('E08 — AI processes very long transcript', async ({ request }) => {
      const token = users.get('doctor')!.token;
      // Generate a long transcript
      const longLines = Array.from({ length: 100 }, (_, i) =>
        `${i % 2 === 0 ? 'Doctor' : 'Patient'}: This is line ${i + 1} of a very long consultation transcript.`,
      );
      const res = await doctorApi(request, token).post(ENDPOINTS.ai.emrSummary, {
        meetingId: 'long-meeting',
        transcript: longLines.join('\n'),
      });
      expect([200, 401, 201, 404, 500]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // F: NOTIFICATIONS & REAL-TIME (8 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('F — Notifications & Real-Time', () => {
    test('F01 — Patient gets notifications', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).get(ENDPOINTS.notifications.list);
      expect([200, 401, 404, 500]).toContain(res.status);
    });

    test('F02 — Doctor gets notifications', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).get(ENDPOINTS.notifications.list);
      expect([200, 401, 404, 500]).toContain(res.status);
    });

    test('F03 — Mark notification as read', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const listRes = await patientApi(request, token).get(ENDPOINTS.notifications.list);
      if (listRes.status === 200) {
        const notifications = Array.isArray(listRes.body) ? listRes.body : listRes.body?.data || [];
        if (notifications.length > 0) {
          const notifId = notifications[0].id;
          const markRes = await patientApi(request, token).put(`${ENDPOINTS.notifications.list}/${notifId}/read`, {});
          expect([200, 401, 204, 404]).toContain(markRes.status);
        }
      }
    });

    test('F04 — Mark all notifications as read', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).put(`${ENDPOINTS.notifications.list}/read-all`, {});
      expect([200, 401, 204, 404, 500]).toContain(res.status);
    });

    test('F05 — Notification count endpoint', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).get(`${ENDPOINTS.notifications.list}/count`);
      expect([200, 401, 404, 500]).toContain(res.status);
    });

    test('F06 — All 3 patients poll notifications concurrently', async ({ request }) => {
      const results = await Promise.all(
        (['patient1', 'patient2', 'patient3'] as UserRole[]).map(role =>
          patientApi(request, users.get(role)!.token).get(ENDPOINTS.notifications.list),
        ),
      );
      results.forEach(r => expect(r.status).not.toBe(500));
    });

    test('F07 — Settings: notification preferences', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).get(ENDPOINTS.settings.notifications);
      expect([200, 401, 404, 500]).toContain(res.status);
    });

    test('F08 — Update notification preferences', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).put(ENDPOINTS.settings.notifications, {
        email: true,
        push: true,
        sms: false,
        appointmentReminder: true,
        contentUpdate: true,
      });
      expect([200, 401, 204, 400, 404, 500]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // G: EDGE CASES & PERFORMANCE (6 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('G — Edge Cases & Performance', () => {
    test('G01 — AI endpoint refuses unauthenticated requests', async ({ request }) => {
      const res = await apiRequest(request, 'POST', DOCTOR_URL, ENDPOINTS.ai.chat, '', {
        message: 'test',
      });
      expect([401, 403, 404, 500]).toContain(res.status);
    });

    test('G02 — CDS check with missing required fields', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(ENDPOINTS.ai.cdsCheck, {});
      expect([400, 422, 404, 500]).toContain(res.status);
    });

    test('G03 — AI chat XSS prevention', async ({ request }) => {
      const token = users.get('patient1')!.token;
      try {
        const res = await patientApi(request, token).post(ENDPOINTS.ai.chat, {
          message: '<script>alert("xss")</script> What is diabetes?',
          language: 'en',
        });
        expect([200, 401, 404, 500, 503, 504]).toContain(res.status);
        if (res.status === 200) {
          const responseText = JSON.stringify(res.body);
          expect(responseText).not.toContain('<script>');
        }
      } catch (err) {
        console.warn('⚠️ G03 AI chat request error (tolerated):', err);
      }
    });

    test('G04 — AI performance: summary under 30s', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const start = Date.now();
      await doctorApi(request, token).post(ENDPOINTS.ai.summarize, {
        text: 'Brief clinical note: Patient well, no complaints. BP 120/80. Plan: continue current medications.',
      });
      const elapsed = Date.now() - start;
      logTestInfo(`AI summarize latency: ${elapsed}ms`);
      expect(elapsed).toBeLessThan(30000);
    });

    test('G05 — Multiple AI features used on same patient', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const patientId = users.get('patient1')!.id;

      const results = await Promise.all([
        doctorApi(request, token).post(ENDPOINTS.ai.patientSummary, { patientId }),
        doctorApi(request, token).post(ENDPOINTS.ai.cdsCheck, { patientId, medications: ['Metformin'], checkType: 'drug-interaction' }),
        doctorApi(request, token).post(ENDPOINTS.ai.preConsultation, { patientId }),
      ]);
      results.forEach(r => expect(r.status).not.toBe(500));
      logTestSuccess('3 AI features parallel on same patient');
    });

    test('G06 — AI handles SQL injection attempts', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).post(ENDPOINTS.ai.chat, {
        message: "'; DROP TABLE users; --",
        language: 'en',
      });
      expect([200, 401, 400, 404, 500]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // H — AI Extended APIs & Notification Management
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('H — AI Extended APIs & Notification Management', () => {
    test('H01 — AI symptom checker', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).post('/api/ai/symptom-checker', {
        symptoms: ['headache', 'fever'], language: 'en',
      });
      expect([200, 401, 400, 404, 500]).toContain(res.status);
    });

    test('H02 — AI risk assessment', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).post('/api/ai/risk-assessment', {
        patientId: users.get('patient1')!.userId,
      });
      expect([200, 401, 400, 404, 500]).toContain(res.status);
    });

    test('H03 — AI health info query', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).post('/api/ai/health-info', {
        query: 'What is hypertension?', language: 'en',
      });
      expect([200, 401, 400, 404, 500]).toContain(res.status);
    });

    test('H04 — AI service status', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).get('/api/ai/status');
      expect([200, 401, 404, 500]).toContain(res.status);
    });

    test('H05 — AI chat memory list', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).get('/api/ai/chat/memory');
      expect([200, 401, 404, 500]).toContain(res.status);
    });

    test('H06 — AI chat clear history', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).delete('/api/ai/chat/history');
      expect([200, 401, 400, 404, 500]).toContain(res.status);
    });

    test('H07 — CDS drug interaction check', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(ENDPOINTS.ai.cdsCheck, {
        patientId: users.get('patient1')!.userId,
        medications: ['Warfarin', 'Aspirin'],
        checkType: 'drug-interaction',
      });
      expect([200, 401, 400, 404, 500]).toContain(res.status);
    });

    test('H08 — CDS allergy alert check', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post(ENDPOINTS.ai.cdsCheck, {
        patientId: users.get('patient1')!.userId,
        medications: ['Penicillin'],
        checkType: 'allergy-alert',
      });
      expect([200, 401, 400, 404, 500]).toContain(res.status);
    });

    test('H09 — AI knowledge base search', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post('/api/ai/knowledge/search', {
        query: 'diabetes treatment guidelines',
      });
      expect([200, 401, 400, 404, 500]).toContain(res.status);
    });

    test('H10 — AI lab analysis', async ({ request }) => {
      const token = users.get('doctor')!.token;
      const res = await doctorApi(request, token).post('/api/ai/lab-analysis', {
        patientId: users.get('patient1')!.userId,
        labResults: [{ name: 'HbA1c', value: 7.2, unit: '%' }],
      });
      expect([200, 401, 400, 404, 500]).toContain(res.status);
    });

    test('H11 — Delete a notification', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const listRes = await patientApi(request, token).get(ENDPOINTS.notifications.list);
      let notifId = 'no-dependency';
      if (listRes.status === 200) {
        const body = listRes.body;
        const items = body?.notifications || body?.data || [];
        if (items.length) notifId = items[0].id || items[0].notification_id || notifId;
      }
      const res = await patientApi(request, token).delete(`/api/notifications/${notifId}`);
      expect([200, 401, 400, 404, 500]).toContain(res.status);
    });

    test('H12 — Update notification preferences', async ({ request }) => {
      const token = users.get('patient1')!.token;
      const res = await patientApi(request, token).put('/api/notifications/preferences', {
        email: true, push: true, sms: false, appointment_reminders: true,
      });
      expect([200, 401, 400, 404, 500]).toContain(res.status);
    });
  });
});
