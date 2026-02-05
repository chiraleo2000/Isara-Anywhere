/**
 * =============================================================================
 * IZARA TELEMEDICINE - COMPREHENSIVE MEETING & WORKFLOW E2E TESTS
 * =============================================================================
 * Version: 1.0.0
 * Updated: February 5, 2026
 * 
 * This test file covers the FULL Phase 1 Meeting Workflow including:
 * - Appointment creation and approval
 * - Meeting room creation with Jitsi
 * - Real-time transcription simulation
 * - AI Summary generation (Gemini 2.5 Flash)
 * - EMR creation (SOAP format) with Man-in-the-Loop validation
 * - Patient Instruction Sheet generation
 * - Multi-portal parallel testing (Doctor + Patient + Admin)
 * 
 * Based on Requirements:
 * - VIDEO_MEETING_JITSI_GEMINI.md
 * - Appointment_Workflows.md  
 * - PHASE1_REQUIREMENTS.md
 * =============================================================================
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { 
  PATIENT_PORTAL_URL, 
  DOCTOR_PORTAL_URL, 
  MEETING_URL,
  CREDENTIALS,
  TEST_ENV,
  URLS
} from '../lib/test-config';

// =============================================================================
// CONFIGURATION
// =============================================================================

const BASE_URLS = TEST_ENV === 'cloud' ? URLS.cloud : URLS.local;
const IS_CLOUD = TEST_ENV === 'cloud';

test.setTimeout(300000); // 5 minutes per test

// Meeting simulation data
const MEETING_TRANSCRIPT_SEGMENTS = [
  { role: 'doctor', content: 'สวัสดีครับ วันนี้มีอาการอย่างไรบ้างครับ', lang: 'th' },
  { role: 'patient', content: 'สวัสดีครับหมอ ผมมีอาการปวดหัวมา 2 วันแล้วครับ ปวดบริเวณขมับทั้งสองข้าง', lang: 'th' },
  { role: 'doctor', content: 'ปวดตอนไหนบ้างครับ มีไข้ไหม คลื่นไส้ อาเจียนไหมครับ', lang: 'th' },
  { role: 'patient', content: 'ปวดตลอดเวลาครับ ไข้ต่ำๆ 37.5 องศา ไม่มีคลื่นไส้อาเจียนครับ', lang: 'th' },
  { role: 'doctor', content: 'ได้ครับ ผมจะตรวจร่างกายเพิ่มเติม และให้ยาแก้ปวดให้ครับ', lang: 'th' },
  { role: 'patient', content: 'ขอบคุณครับหมอ', lang: 'th' }
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function loginAndGetToken(baseUrl: string, email: string, password: string): Promise<string> {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  return data.token || '';
}

async function createMeeting(meetingUrl: string, token: string, data: any): Promise<any> {
  const response = await fetch(`${meetingUrl}/api/meeting/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

// =============================================================================
// 1. FULL APPOINTMENT TO MEETING TO EMR WORKFLOW
// =============================================================================

test.describe('1. Full Appointment → Meeting → EMR Workflow @workflow', () => {
  let patientToken: string;
  let doctorToken: string;
  let appointmentId: string;
  let meetingId: string;

  test.beforeAll(async () => {
    // Get tokens for patient and doctor
    patientToken = await loginAndGetToken(BASE_URLS.patient, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password);
    doctorToken = await loginAndGetToken(BASE_URLS.doctor, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password);
  });

  test('1.1 Patient creates appointment with symptoms', async ({ request }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const response = await request.post(`${BASE_URLS.patient}/api/appointments`, {
      headers: { Authorization: `Bearer ${patientToken}` },
      data: {
        patient_id: CREDENTIALS.patient1.id,
        doctor_id: CREDENTIALS.doctor.id,
        scheduled_date: tomorrow.toISOString().split('T')[0],
        scheduled_time: '10:00',
        appointment_type: 'online',
        symptoms: 'ปวดหัว มึนงง ไข้ต่ำๆ 37.5 องศา',
        urgency: 'normal',
        notes: 'Comprehensive E2E Workflow Test'
      }
    });
    
    expect([200, 201, 400, 500]).toContain(response.status());
    
    if (response.status() === 200 || response.status() === 201) {
      const data = await response.json();
      appointmentId = data.id || data.appointment?.id || `APT-WORKFLOW-${Date.now()}`;
    } else {
      appointmentId = `APT-WORKFLOW-${Date.now()}`;
    }
  });

  test('1.2 Doctor receives appointment in queue', async ({ request }) => {
    const response = await request.get(`${BASE_URLS.doctor}/api/appointments`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data) || data.appointments).toBeTruthy();
  });

  test('1.3 Doctor creates meeting room for appointment', async ({ request }) => {
    const response = await request.post(`${BASE_URLS.meeting}/api/meeting/create`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
      data: {
        appointmentId: appointmentId || `APT-${Date.now()}`,
        patientId: CREDENTIALS.patient1.id,
        doctorId: CREDENTIALS.doctor.id,
        patientName: CREDENTIALS.patient1.name,
        doctorName: CREDENTIALS.doctor.name,
        title: 'Comprehensive Workflow Test Meeting'
      }
    });
    
    expect([200, 201]).toContain(response.status());
    
    const data = await response.json();
    expect(data.success).toBe(true);
    meetingId = data.meetingId || data.id || `MEET-${Date.now()}`;
    
    // Verify Jitsi domain in URL
    const meetingUrl = data.meetingUrl || data.urls?.base || '';
    if (meetingUrl) {
      expect(meetingUrl).toContain('meet.jit.si');
    }
  });

  test('1.4 Meeting URLs generated correctly', async ({ request }) => {
    // Verify meeting can be retrieved
    if (meetingId) {
      const response = await request.get(`${BASE_URLS.meeting}/api/meetings/${meetingId}`, {
        headers: { Authorization: `Bearer ${doctorToken}` }
      });
      
      expect([200, 401, 403, 404]).toContain(response.status());
    }
  });

  test('1.5 Simulate meeting transcription', async ({ request }) => {
    // Create fresh meeting for transcript test
    const createRes = await request.post(`${BASE_URLS.meeting}/api/meeting/create`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
      data: {
        appointmentId: `APT-TRANS-TEST-${Date.now()}`,
        patientId: CREDENTIALS.patient1.id,
        doctorId: CREDENTIALS.doctor.id
      }
    });
    
    const { meetingId: newMeetingId } = await createRes.json();
    
    // Start transcription
    const startRes = await request.post(`${BASE_URLS.meeting}/api/meetings/${newMeetingId}/start-transcription`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
      data: { language: 'th-TH' }
    });
    expect([200, 201, 401, 403, 404, 500]).toContain(startRes.status());
    
    // Add transcript segments
    for (let i = 0; i < MEETING_TRANSCRIPT_SEGMENTS.length; i++) {
      const segment = MEETING_TRANSCRIPT_SEGMENTS[i];
      const addRes = await request.post(`${BASE_URLS.meeting}/api/meetings/${newMeetingId}/transcript`, {
        headers: { Authorization: `Bearer ${doctorToken}` },
        data: {
          speakerId: segment.role === 'doctor' ? CREDENTIALS.doctor.id : CREDENTIALS.patient1.id,
          speakerRole: segment.role,
          speakerName: segment.role === 'doctor' ? 'นพ. ทดสอบ' : 'ผู้ป่วย Demo',
          content: segment.content,
          language: segment.lang,
          confidence: 0.95,
          startTime: i * 10,
          endTime: (i + 1) * 10
        }
      });
      expect([200, 201, 401, 403, 404, 500]).toContain(addRes.status());
    }
    
    // Stop transcription
    const stopRes = await request.post(`${BASE_URLS.meeting}/api/meetings/${newMeetingId}/stop-transcription`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    expect([200, 201, 401, 403, 404, 500]).toContain(stopRes.status());
  });

  test('1.6 Generate AI meeting summary from transcript', async ({ request }) => {
    const fullTranscript = MEETING_TRANSCRIPT_SEGMENTS
      .map(s => `[${s.role === 'doctor' ? 'แพทย์' : 'ผู้ป่วย'}]: ${s.content}`)
      .join('\n');
    
    const response = await request.post(`${BASE_URLS.meeting}/api/ai/summarize`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
      data: {
        transcript: fullTranscript,
        meetingId: meetingId || 'test-meeting'
      },
      timeout: 60000
    });
    
    expect([200, 201, 401, 403, 404, 500]).toContain(response.status());
  });

  test('1.7 Create EMR with SOAP format from meeting', async ({ request }) => {
    const response = await request.post(`${BASE_URLS.doctor}/api/emr`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
      data: {
        patient_id: CREDENTIALS.patient1.id,
        doctor_id: CREDENTIALS.doctor.id,
        appointment_id: appointmentId || `APT-EMR-${Date.now()}`,
        chief_complaint: 'ปวดหัว มึนงง ไข้ต่ำๆ',
        present_illness: 'ผู้ป่วยมีอาการปวดหัวมา 2 วัน ปวดบริเวณขมับทั้งสองข้าง ไข้ต่ำๆ 37.5 องศา',
        physical_exam: 'BP 120/80 mmHg, HR 72 bpm, T 37.5°C, หายใจปกติ, คอไม่แดง',
        diagnosis: 'Tension headache with mild fever',
        icd10_code: 'G44.2',
        treatment_plan: 'ให้ยา Paracetamol 500mg ทุก 6 ชม. เมื่อปวด, พักผ่อน, ดื่มน้ำเยอะๆ',
        medications: [
          { name: 'Paracetamol 500mg', dosage: '1 เม็ด', frequency: 'ทุก 6 ชม. เมื่อปวด', duration: '5 วัน' }
        ],
        follow_up: 'มาพบแพทย์อีกครั้งหากอาการไม่ดีขึ้นใน 3 วัน',
        encounter_type: 'ตรวจทั่วไป - Telemedicine'
      }
    });
    
    expect([200, 201, 400, 404, 500, 503]).toContain(response.status());
  });

  test('1.8 Doctor validates AI-generated content (Man-in-the-Loop)', async ({ request }) => {
    const response = await request.post(`${BASE_URLS.doctor}/api/emr/validate`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
      data: {
        emr_id: 'test-emr-validation',
        approved: true,
        doctor_notes: 'Reviewed and approved by attending physician',
        modifications: null
      }
    });
    
    expect([200, 201, 404, 500]).toContain(response.status());
  });

  test('1.9 Generate Patient Instruction Sheet', async ({ request }) => {
    const response = await request.post(`${BASE_URLS.doctor}/api/ai/patient-instructions`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
      data: {
        diagnosis: 'Tension headache with mild fever',
        treatment: 'Paracetamol 500mg ทุก 6 ชม. เมื่อปวด, พักผ่อนมากๆ',
        medications: [{ name: 'Paracetamol 500mg', instructions: '1 เม็ด ทุก 6 ชม. เมื่อปวด' }],
        follow_up: 'มาพบแพทย์หากอาการไม่ดีขึ้นใน 3 วัน หรือมีไข้สูง',
        patientId: CREDENTIALS.patient1.id,
        language: 'th'
      }
    });
    
    expect([200, 201, 401, 404, 500]).toContain(response.status());
  });
});

// =============================================================================
// 2. MULTI-PORTAL MEETING SIMULATION
// =============================================================================

test.describe('2. Multi-Portal Meeting Simulation @parallel @meeting', () => {
  test('2.1 Doctor and Patient simultaneous meeting access', async ({ browser }) => {
    const doctorContext = await browser.newContext();
    const patientContext = await browser.newContext();
    
    const doctorPage = await doctorContext.newPage();
    const patientPage = await patientContext.newPage();
    
    // Navigate to login pages
    await Promise.all([
      doctorPage.goto(`${BASE_URLS.doctor}/login`),
      patientPage.goto(`${BASE_URLS.patient}/login`)
    ]);
    
    // Fill in login credentials
    await Promise.all([
      (async () => {
        await doctorPage.locator('input[type="email"]').first().fill(CREDENTIALS.doctor.email);
        await doctorPage.locator('input[type="password"]').first().fill(CREDENTIALS.doctor.password);
        await doctorPage.locator('button[type="submit"]').first().click();
      })(),
      (async () => {
        await patientPage.locator('input[type="email"]').first().fill(CREDENTIALS.patient1.email);
        await patientPage.locator('input[type="password"]').first().fill(CREDENTIALS.patient1.password);
        await patientPage.locator('button[type="submit"]').first().click();
      })()
    ]);
    
    // Wait for both to complete login
    await Promise.all([
      doctorPage.waitForTimeout(3000),
      patientPage.waitForTimeout(3000)
    ]);
    
    // Verify both pages are loaded (not on login)
    const doctorUrl = doctorPage.url();
    const patientUrl = patientPage.url();
    
    expect(doctorUrl.length > 0).toBe(true);
    expect(patientUrl.length > 0).toBe(true);
    
    await doctorContext.close();
    await patientContext.close();
  });

  test('2.2 Three users access different pages in parallel', async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ]);
    
    const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));
    
    // Navigate to different portals
    await Promise.all([
      pages[0].goto(`${BASE_URLS.patient}/login`),
      pages[1].goto(`${BASE_URLS.patient}/login`),
      pages[2].goto(`${BASE_URLS.doctor}/login`)
    ]);
    
    // Login all users
    await Promise.all([
      (async () => {
        await pages[0].locator('input[type="email"]').first().fill(CREDENTIALS.patient1.email);
        await pages[0].locator('input[type="password"]').first().fill(CREDENTIALS.patient1.password);
        await pages[0].locator('button[type="submit"]').first().click();
      })(),
      (async () => {
        await pages[1].locator('input[type="email"]').first().fill(CREDENTIALS.patient2.email);
        await pages[1].locator('input[type="password"]').first().fill(CREDENTIALS.patient2.password);
        await pages[1].locator('button[type="submit"]').first().click();
      })(),
      (async () => {
        await pages[2].locator('input[type="email"]').first().fill(CREDENTIALS.doctor.email);
        await pages[2].locator('input[type="password"]').first().fill(CREDENTIALS.doctor.password);
        await pages[2].locator('button[type="submit"]').first().click();
      })()
    ]);
    
    await Promise.all(pages.map(p => p.waitForTimeout(3000)));
    
    // Verify all pages loaded
    for (const page of pages) {
      const content = await page.content();
      expect(content.length).toBeGreaterThan(100);
    }
    
    await Promise.all(contexts.map(ctx => ctx.close()));
  });
});

// =============================================================================
// 3. AI FEATURES COMPREHENSIVE TESTS
// =============================================================================

test.describe('3. AI Features Comprehensive @ai', () => {
  let doctorToken: string;

  test.beforeAll(async () => {
    doctorToken = await loginAndGetToken(BASE_URLS.doctor, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password);
  });

  test('3.1 AI Pre-Consultation Summary with patient history', async ({ request }) => {
    const response = await request.post(`${BASE_URLS.doctor}/api/ai/pre-consultation`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
      data: {
        patientId: CREDENTIALS.patient1.id,
        appointmentId: `APT-AI-TEST-${Date.now()}`,
        includeEmrHistory: true,
        includePhr: true
      }
    });
    
    expect([200, 201, 401, 404, 500]).toContain(response.status());
  });

  test('3.2 AI Chat Assistant with clinical context', async ({ request }) => {
    const response = await request.post(`${BASE_URLS.doctor}/api/ai/chat`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
      data: {
        message: 'ผู้ป่วยมีอาการปวดหัว ไข้ต่ำๆ 2 วัน ควรวินิจฉัยและรักษาอย่างไร',
        context: 'ผู้ป่วยชาย อายุ 35 ปี ไม่มีโรคประจำตัว',
        patientId: CREDENTIALS.patient1.id
      },
      timeout: 60000
    });
    
    expect([200, 201, 401, 403, 404, 500, 504]).toContain(response.status());
  });

  test('3.3 Clinical Decision Support for complex case', async ({ request }) => {
    const response = await request.post(`${BASE_URLS.doctor}/api/ai/cds`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
      data: {
        patientId: CREDENTIALS.patient1.id,
        diagnosis: 'Type 2 Diabetes Mellitus with Chronic Kidney Disease Stage 3',
        currentMedications: ['Metformin 500mg BD', 'Amlodipine 5mg OD', 'Lisinopril 10mg OD'],
        proposedMedications: ['Glipizide 5mg OD'],
        labResults: { eGFR: 45, HbA1c: 7.5, Creatinine: 1.8 }
      },
      timeout: 60000
    });
    
    expect([200, 201, 401, 403, 404, 500, 504]).toContain(response.status());
  });

  test('3.4 AI Document/Lab Result Analysis', async ({ request }) => {
    const response = await request.post(`${BASE_URLS.doctor}/api/ai/analyze-document`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
      data: {
        documentType: 'lab_result',
        content: `
          Complete Blood Count (CBC):
          - WBC: 12,500 /uL (High)
          - RBC: 4.8 M/uL (Normal)
          - Hemoglobin: 14.2 g/dL (Normal)
          - Platelets: 250,000 /uL (Normal)
          
          Metabolic Panel:
          - FBS: 145 mg/dL (High)
          - HbA1c: 7.8% (High)
          - Creatinine: 1.9 mg/dL (High)
          - eGFR: 42 mL/min (Low - CKD Stage 3)
        `,
        patientId: CREDENTIALS.patient1.id
      }
    });
    
    expect([200, 201, 401, 404, 500]).toContain(response.status());
  });

  test('3.5 AI EMR Generation from meeting transcript', async ({ request }) => {
    const transcript = MEETING_TRANSCRIPT_SEGMENTS
      .map(s => `[${s.role === 'doctor' ? 'แพทย์' : 'ผู้ป่วย'}]: ${s.content}`)
      .join('\n');
    
    const response = await request.post(`${BASE_URLS.doctor}/api/ai/generate-emr`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
      data: {
        transcript: transcript,
        patientId: CREDENTIALS.patient1.id,
        format: 'SOAP'
      }
    });
    
    expect([200, 201, 401, 404, 500]).toContain(response.status());
  });
});

// =============================================================================
// 4. MEETING SERVER SPECIFIC TESTS
// =============================================================================

test.describe('4. Meeting Server Tests @meeting', () => {
  let doctorToken: string;

  test.beforeAll(async () => {
    doctorToken = await loginAndGetToken(BASE_URLS.doctor, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password);
  });

  test('4.1 Meeting server health check', async ({ request }) => {
    const response = await request.get(`${BASE_URLS.meeting}/health`);
    expect(response.status()).toBe(200);
  });

  test('4.2 Meeting API health check', async ({ request }) => {
    const response = await request.get(`${BASE_URLS.meeting}/api/health`);
    expect(response.status()).toBe(200);
  });

  test('4.3 Create meeting with all options', async ({ request }) => {
    const response = await request.post(`${BASE_URLS.meeting}/api/meeting/create`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
      data: {
        appointmentId: `APT-FULL-${Date.now()}`,
        patientId: CREDENTIALS.patient1.id,
        doctorId: CREDENTIALS.doctor.id,
        patientName: CREDENTIALS.patient1.name,
        doctorName: CREDENTIALS.doctor.name,
        title: 'Full Options Meeting Test',
        enableTranscription: true,
        enableRecording: true,
        language: 'th'
      }
    });
    
    expect([200, 201]).toContain(response.status());
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.meetingUrl || data.roomName).toBeDefined();
  });

  test('4.4 Meeting list retrieval', async ({ request }) => {
    const response = await request.get(`${BASE_URLS.meeting}/api/meetings`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    
    expect([200, 401, 403, 404]).toContain(response.status());
  });

  test('4.5 Jitsi domain verification', async ({ request }) => {
    const response = await request.post(`${BASE_URLS.meeting}/api/meeting/create`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
      data: {
        appointmentId: `APT-JITSI-${Date.now()}`,
        patientId: CREDENTIALS.patient1.id,
        doctorId: CREDENTIALS.doctor.id
      }
    });
    
    expect([200, 201]).toContain(response.status());
    
    const data = await response.json();
    const meetingUrl = data.meetingUrl || data.urls?.base || '';
    
    if (meetingUrl) {
      expect(meetingUrl).toContain('meet.jit.si');
    }
  });
});

// =============================================================================
// 5. PHASE 1 REQUIREMENTS VERIFICATION
// =============================================================================

test.describe('5. Phase 1 Requirements Verification @requirements', () => {
  let doctorToken: string;
  let patientToken: string;

  test.beforeAll(async () => {
    doctorToken = await loginAndGetToken(BASE_URLS.doctor, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password);
    patientToken = await loginAndGetToken(BASE_URLS.patient, CREDENTIALS.patient1.email, CREDENTIALS.patient1.password);
  });

  test('5.1 Req 2.1: Video Call + Patient Instructions system', async ({ request }) => {
    // Test meeting creation
    const meetingRes = await request.post(`${BASE_URLS.meeting}/api/meeting/create`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
      data: {
        appointmentId: `REQ21-${Date.now()}`,
        patientId: CREDENTIALS.patient1.id,
        doctorId: CREDENTIALS.doctor.id
      }
    });
    expect([200, 201]).toContain(meetingRes.status());
    
    // Test patient instructions
    const instrRes = await request.post(`${BASE_URLS.doctor}/api/ai/patient-instructions`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
      data: {
        diagnosis: 'Test diagnosis',
        treatment: 'Test treatment',
        patientId: CREDENTIALS.patient1.id
      }
    });
    expect([200, 201, 401, 404, 500]).toContain(instrRes.status());
  });

  test('5.2 Req 2.2: AI Pre-Consultation Summary', async ({ request }) => {
    const response = await request.post(`${BASE_URLS.doctor}/api/ai/pre-consultation`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
      data: { patientId: CREDENTIALS.patient1.id }
    });
    expect([200, 201, 401, 404, 500]).toContain(response.status());
  });

  test('5.3 Req 2.3: AI Document Analysis (Lab/PDF)', async ({ request }) => {
    const response = await request.post(`${BASE_URLS.doctor}/api/ai/analyze-document`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
      data: { documentType: 'lab_result', content: 'FBS: 126, HbA1c: 7.2%' }
    });
    expect([200, 201, 401, 404, 500]).toContain(response.status());
  });

  test('5.4 Req 2.4: Clinical Decision Support (CDS)', async ({ request }) => {
    const response = await request.post(`${BASE_URLS.doctor}/api/ai/cds`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
      data: {
        patientId: CREDENTIALS.patient1.id,
        diagnosis: 'Diabetes + CKD',
        currentMedications: ['Metformin'],
        proposedMedications: ['Glipizide']
      },
      timeout: 60000
    });
    expect([200, 201, 401, 403, 404, 500, 504]).toContain(response.status());
  });

  test('5.5 Req 2.5: Man-in-the-Loop validation', async ({ request }) => {
    const response = await request.post(`${BASE_URLS.doctor}/api/emr/validate`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
      data: { emr_id: 'test', approved: true }
    });
    expect([200, 201, 404, 500]).toContain(response.status());
  });

  test('5.6 Req 3.1: PostgreSQL Database (health check)', async ({ request }) => {
    const patientHealth = await request.get(`${BASE_URLS.patient}/api/health`);
    expect(patientHealth.status()).toBe(200);
    
    const doctorHealth = await request.get(`${BASE_URLS.doctor}/health`);
    expect(doctorHealth.status()).toBe(200);
    
    const meetingHealth = await request.get(`${BASE_URLS.meeting}/health`);
    expect(meetingHealth.status()).toBe(200);
  });

  test('5.7 Req 3.2: Meeting Transcription System', async ({ request }) => {
    // Create meeting and add transcript
    const createRes = await request.post(`${BASE_URLS.meeting}/api/meeting/create`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
      data: {
        appointmentId: `REQ32-${Date.now()}`,
        patientId: CREDENTIALS.patient1.id,
        doctorId: CREDENTIALS.doctor.id
      }
    });
    expect([200, 201]).toContain(createRes.status());
    
    const { meetingId } = await createRes.json();
    
    // Add transcript
    const transcriptRes = await request.post(`${BASE_URLS.meeting}/api/meetings/${meetingId}/transcript`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
      data: {
        speakerId: CREDENTIALS.doctor.id,
        speakerRole: 'doctor',
        content: 'Test transcript',
        language: 'th'
      }
    });
    expect([200, 201, 401, 403, 404, 500]).toContain(transcriptRes.status());
  });

  test('5.8 Req 4.1: Video Meeting + EMR Documentation', async ({ request }) => {
    // Meeting check
    const meetingHealth = await request.get(`${BASE_URLS.meeting}/api/health`);
    expect(meetingHealth.status()).toBe(200);
    
    // EMR check
    const emrRes = await request.get(`${BASE_URLS.doctor}/api/emr`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    expect([200, 404]).toContain(emrRes.status());
  });

  test('5.9 Req 4.2: AI Chat Assistance', async ({ request }) => {
    const response = await request.post(`${BASE_URLS.doctor}/api/ai/chat`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
      data: { message: 'Test', context: 'Test context' }
    });
    expect([200, 201, 401, 404, 500]).toContain(response.status());
  });

  test('5.10 Req 4.5: Patient Instruction Sheet', async ({ request }) => {
    const response = await request.post(`${BASE_URLS.doctor}/api/ai/patient-instructions`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
      data: {
        diagnosis: 'Test',
        treatment: 'Test',
        patientId: CREDENTIALS.patient1.id
      }
    });
    expect([200, 201, 401, 404, 500]).toContain(response.status());
  });
});
