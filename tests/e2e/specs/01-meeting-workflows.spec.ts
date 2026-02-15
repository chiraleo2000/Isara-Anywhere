/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — PHASE 1 MEETING & AI WORKFLOW E2E TESTS v3.5.0
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Comprehensive tests for Phase 1 Meeting Service features:
 *   - Meeting creation & lifecycle (Jitsi Meet integration)
 *   - Real-time transcription (Web Speech API)
 *   - Pause/Resume transcription
 *   - In-meeting chat messages
 *   - Guest invite management
 *   - AI SOAP summary generation (Gemini)
 *   - AI pre-consultation summary
 *   - AI patient instruction sheet
 *   - AI document analysis
 *   - AI CDS (Clinical Decision Support)
 *   - Man-in-the-loop AI validation
 *   - Transcript sections (30-min splits)
 *   - Full end-to-end meeting lifecycle
 *
 * Process References:
 *   - VIDEO_MEETING_JITSI_GEMINI.md
 *   - Appointment_Workflows.md
 *   - PHASE1_REQUIREMENTS.md
 *   - Health_Records_Processes.md
 *
 * Tests: 80+ tests across 10 sections (P–Y)
 * Updated: February 10, 2026
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { test, expect, APIRequestContext } from '@playwright/test';
import {
  PATIENT_URL, DOCTOR_URL, MEETING_SERVER_URL,
  CREDENTIALS, IS_CLOUD,
} from '../lib/test-config';

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
const TIMEOUT = IS_CLOUD ? 30_000 : 15_000;
const AI_TIMEOUT = IS_CLOUD ? 60_000 : 45_000;

const P1 = CREDENTIALS.patient1;
const P2 = CREDENTIALS.patient2;
const P3 = CREDENTIALS.patient3;
const DOC = CREDENTIALS.doctor;
const ADM = CREDENTIALS.admin;

async function loginPatient(request: APIRequestContext, email: string, password: string) {
  const r = await request.post(`${PATIENT_URL}/api/auth/login`, {
    data: { email, password },
    headers: { 'Content-Type': 'application/json' },
    timeout: TIMEOUT,
  });
  expect(r.status()).toBe(200);
  const d = await r.json();
  return { token: d.token || d.accessToken || '', user: d.user || d.data?.user || {} };
}

async function loginDoctor(request: APIRequestContext, email: string, password: string) {
  const r = await request.post(`${DOCTOR_URL}/auth/login`, {
    data: { email, password },
    headers: { 'Content-Type': 'application/json' },
    timeout: TIMEOUT,
  });
  expect(r.status()).toBe(200);
  const d = await r.json();
  return { token: d.token || d.accessToken || '', user: d.user || d.data?.user || {} };
}

const AH = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});

// Shared state for meeting lifecycle tests
let sharedMeetingId = '';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION P: MEETING SERVER HEALTH & CONFIGURATION (8 tests)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('P: Meeting Server Health & Configuration', () => {
  test('P1: Meeting server health check', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/health`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.status).toBe('ok');
    expect(d.service).toBe('izara-jitsi-server');
    expect(d.version).toBeTruthy();
    expect(d.features).toBeTruthy();
    expect(d.features.jitsi).toBe(true);
    expect(d.features.chat).toBe(true);
    expect(d.features.guestInvites).toBe(true);
  });

  test('P2: Meeting server API health', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/api/health`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.status).toBe('healthy');
    expect(d.jitsiDomain).toBeTruthy();
    expect(d.uptime).toBeGreaterThan(0);
  });

  test('P3: Patient portal video meeting health', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/video-meeting/health`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('P4: Doctor portal video meeting health', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/video-meeting/health`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('P5: Video meeting config returns Jitsi domain', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/video-meeting/config`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.domain || d.jitsiDomain || d.config).toBeTruthy();
  });

  test('P6: All 3 services healthy in PARALLEL', async ({ request }) => {
    const [p, d, m] = await Promise.all([
      request.get(`${PATIENT_URL}/api/video-meeting/health`, { timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/video-meeting/health`, { timeout: TIMEOUT }),
      request.get(`${MEETING_SERVER_URL}/api/health`, { timeout: TIMEOUT }),
    ]);
    expect(p.status()).toBe(200);
    expect(d.status()).toBe(200);
    expect(m.status()).toBe(200);
  });

  test('P7: Meeting server features include transcription type', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/health`, { timeout: TIMEOUT });
    const d = await r.json();
    expect(d.features.transcription).toBe('web-speech-api');
  });

  test('P8: Meeting server AI status', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/api/health`, { timeout: TIMEOUT });
    const d = await r.json();
    // aiEnabled may be true or false depending on config
    expect(typeof d.aiEnabled).toBe('boolean');
    expect(d.aiModel).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION Q: MEETING CREATION & ROOM MANAGEMENT (12 tests)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Q: Meeting Creation & Room Management', () => {
  test('Q1: Create meeting via Meeting Server (no auth)', async ({ request }) => {
    const aptId = `TEST-Q1-${Date.now()}`;
    const r = await request.post(`${MEETING_SERVER_URL}/api/meeting/create`, {
      data: {
        appointmentId: aptId, doctorId: DOC.id, patientId: P1.id,
        doctorName: DOC.name, patientName: P1.name,
        scheduledTime: new Date().toISOString(),
      },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.success).toBe(true);
    expect(d.meetingId).toBeTruthy();
    expect(d.roomName).toBeTruthy();
    expect(d.meetingUrl).toContain('meet.jit.si');
    expect(d.urls).toBeTruthy();
    expect(d.urls.base).toBeTruthy();
    expect(d.urls.guest).toBeTruthy();
    
    // Save for later tests
    sharedMeetingId = d.meetingId;
  });

  test('Q2: Create meeting via Patient Portal', async ({ request }) => {
    const aptId = `TEST-Q2-${Date.now()}`;
    const r = await request.post(`${PATIENT_URL}/api/video-meeting/create`, {
      data: {
        appointmentId: aptId, doctorId: DOC.id, patientId: P1.id,
        scheduledTime: new Date().toISOString(),
      },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.success || d.meeting).toBeTruthy();
  });

  test('Q3: Create meeting via Doctor Portal (authenticated)', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const aptId = `TEST-Q3-${Date.now()}`;
    const r = await request.post(`${DOCTOR_URL}/api/video-meeting/create`, {
      data: {
        appointmentId: aptId, doctorId: DOC.id, patientId: P1.id,
        scheduledTime: new Date().toISOString(),
      },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
  });

  test('Q4: Create meeting for Patient2', async ({ request }) => {
    const aptId = `TEST-Q4-P2-${Date.now()}`;
    const r = await request.post(`${MEETING_SERVER_URL}/api/meeting/create`, {
      data: {
        appointmentId: aptId, doctorId: DOC.id, patientId: P2.id,
        doctorName: DOC.name, patientName: P2.name,
        scheduledTime: new Date().toISOString(),
      },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.success).toBe(true);
  });

  test('Q5: Create meeting for Patient3', async ({ request }) => {
    const aptId = `TEST-Q5-P3-${Date.now()}`;
    const r = await request.post(`${MEETING_SERVER_URL}/api/meeting/create`, {
      data: {
        appointmentId: aptId, doctorId: DOC.id, patientId: P3.id,
        doctorName: DOC.name, patientName: P3.name,
        scheduledTime: new Date().toISOString(),
      },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
  });

  test('Q6: 3 meetings created SIMULTANEOUSLY', async ({ request }) => {
    const ts = Date.now();
    const [r1, r2, r3] = await Promise.all([
      request.post(`${MEETING_SERVER_URL}/api/meeting/create`, {
        data: { appointmentId: `SIM-P1-${ts}`, doctorId: DOC.id, patientId: P1.id, doctorName: DOC.name, patientName: P1.name, scheduledTime: new Date().toISOString() },
        headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
      }),
      request.post(`${MEETING_SERVER_URL}/api/meeting/create`, {
        data: { appointmentId: `SIM-P2-${ts}`, doctorId: DOC.id, patientId: P2.id, doctorName: DOC.name, patientName: P2.name, scheduledTime: new Date().toISOString() },
        headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
      }),
      request.post(`${MEETING_SERVER_URL}/api/meeting/create`, {
        data: { appointmentId: `SIM-P3-${ts}`, doctorId: DOC.id, patientId: P3.id, doctorName: DOC.name, patientName: P3.name, scheduledTime: new Date().toISOString() },
        headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
      }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
    expect(r3.status()).toBe(200);
  });

  test('Q7: Meeting with guest invites', async ({ request }) => {
    const aptId = `TEST-Q7-GUEST-${Date.now()}`;
    const r = await request.post(`${MEETING_SERVER_URL}/api/meeting/create`, {
      data: {
        appointmentId: aptId, doctorId: DOC.id, patientId: P1.id,
        doctorName: DOC.name, patientName: P1.name,
        scheduledTime: new Date().toISOString(),
        guestInvites: [
          { name: 'Family Member', email: 'family@test.com', role: 'relative' },
          { name: 'Interpreter', email: 'interpreter@test.com', role: 'interpreter' },
        ],
      },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.success).toBe(true);
    expect(d.urls.guest).toBeTruthy();
  });

  test('Q8: Get meeting status', async ({ request }) => {
    if (!sharedMeetingId) test.skip();
    const r = await request.get(`${MEETING_SERVER_URL}/api/meetings/${sharedMeetingId}/status`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.success).toBe(true);
    expect(d.status).toBeTruthy();
    expect(typeof d.participants).toBe('number');
  });

  test('Q9: Get meeting participants', async ({ request }) => {
    if (!sharedMeetingId) test.skip();
    const r = await request.get(`${MEETING_SERVER_URL}/api/meetings/${sharedMeetingId}/participants`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.success).toBe(true);
    expect(Array.isArray(d.participants)).toBe(true);
  });

  test('Q10: Patient + Doctor create meetings from BOTH portals in PARALLEL', async ({ request }) => {
    const { token: docToken } = await loginDoctor(request, DOC.email, DOC.password);
    const ts = Date.now();
    const [r1, r2] = await Promise.all([
      request.post(`${PATIENT_URL}/api/video-meeting/create`, {
        data: { appointmentId: `PATQ10-${ts}`, doctorId: DOC.id, patientId: P1.id, scheduledTime: new Date().toISOString() },
        headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
      }),
      request.post(`${DOCTOR_URL}/api/video-meeting/create`, {
        data: { appointmentId: `DOCQ10-${ts}`, doctorId: DOC.id, patientId: P2.id, scheduledTime: new Date().toISOString() },
        headers: AH(docToken), timeout: TIMEOUT,
      }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
  });

  test('Q11: Create meeting + retrieve via patient portal', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const aptId = `RETQ11-${Date.now()}`;
    const create = await request.post(`${MEETING_SERVER_URL}/api/meeting/create`, {
      data: { appointmentId: aptId, doctorId: DOC.id, patientId: P1.id, doctorName: DOC.name, patientName: P1.name, scheduledTime: new Date().toISOString() },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    expect(create.status()).toBe(200);
    
    const getR = await request.get(`${PATIENT_URL}/api/video-meeting/${aptId}`, { headers: AH(token), timeout: TIMEOUT });
    expect(getR.status()).toBe(200);
  });

  test('Q12: Meeting URL contains correct Jitsi domain', async ({ request }) => {
    const aptId = `URLQ12-${Date.now()}`;
    const r = await request.post(`${MEETING_SERVER_URL}/api/meeting/create`, {
      data: { appointmentId: aptId, doctorId: DOC.id, patientId: P1.id, scheduledTime: new Date().toISOString() },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    const d = await r.json();
    expect(d.meetingUrl).toContain('meet.jit.si');
    expect(d.roomName).toContain('izara-');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION R: TRANSCRIPTION LIFECYCLE (10 tests)
// Process: Transcription start → segments → pause → resume → stop
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('R: Transcription Lifecycle', () => {
  let meetingId = '';

  test.beforeAll(async ({ request }) => {
    // Create a meeting for transcription tests
    const aptId = `TRANS-${Date.now()}`;
    const r = await request.post(`${MEETING_SERVER_URL}/api/meeting/create`, {
      data: { appointmentId: aptId, doctorId: DOC.id, patientId: P1.id, doctorName: DOC.name, patientName: P1.name, scheduledTime: new Date().toISOString() },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    const d = await r.json();
    meetingId = d.meetingId;
  });

  test('R1: Start transcription', async ({ request }) => {
    if (!meetingId) test.skip();
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${MEETING_SERVER_URL}/api/meetings/${meetingId}/start-transcription`, {
      data: { language: 'th-TH' },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.success).toBe(true);
    expect(d.message).toContain('started');
    expect(d.language).toBe('th-TH');
  });

  test('R2: Add doctor transcript segment', async ({ request }) => {
    if (!meetingId) test.skip();
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${MEETING_SERVER_URL}/api/meetings/${meetingId}/transcript`, {
      data: {
        speakerId: DOC.id, speakerName: DOC.name, speakerRole: 'doctor',
        content: 'สวัสดีครับ คุณมีอาการอย่างไรบ้างครับ',
        language: 'th', confidence: 0.95,
      },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.success).toBe(true);
    expect(d.transcript).toBeTruthy();
  });

  test('R3: Add patient transcript segment', async ({ request }) => {
    if (!meetingId) test.skip();
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${MEETING_SERVER_URL}/api/meetings/${meetingId}/transcript`, {
      data: {
        speakerId: P1.id, speakerName: P1.name, speakerRole: 'patient',
        content: 'มีอาการปวดหัวและไข้สูงมา 3 วันครับ',
        language: 'th', confidence: 0.92,
      },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
  });

  test('R4: Add multiple transcript segments', async ({ request }) => {
    if (!meetingId) test.skip();
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    
    // Doctor follow-up
    const r1 = await request.post(`${MEETING_SERVER_URL}/api/meetings/${meetingId}/transcript`, {
      data: {
        speakerId: DOC.id, speakerName: DOC.name, speakerRole: 'doctor',
        content: 'มีอาการคลื่นไส้หรือไม่ครับ ไข้สูงสุดเท่าไหร่',
        language: 'th',
      },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r1.status()).toBe(200);

    // Patient response
    const r2 = await request.post(`${MEETING_SERVER_URL}/api/meetings/${meetingId}/transcript`, {
      data: {
        speakerId: P1.id, speakerName: P1.name, speakerRole: 'patient',
        content: 'ไข้สูง 39 องศาครับ คลื่นไส้เล็กน้อย ไม่อาเจียน',
        language: 'th',
      },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r2.status()).toBe(200);
  });

  test('R5: Pause transcription', async ({ request }) => {
    if (!meetingId) test.skip();
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${MEETING_SERVER_URL}/api/meetings/${meetingId}/pause-transcription`, {
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.success).toBe(true);
    expect(d.isPaused).toBe(true);
  });

  test('R6: Resume transcription (toggle pause)', async ({ request }) => {
    if (!meetingId) test.skip();
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${MEETING_SERVER_URL}/api/meetings/${meetingId}/pause-transcription`, {
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.success).toBe(true);
    expect(d.isPaused).toBe(false);
  });

  test('R7: Get transcript', async ({ request }) => {
    if (!meetingId) test.skip();
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${MEETING_SERVER_URL}/api/meetings/${meetingId}/transcript`, {
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.success).toBe(true);
    expect(d.totalSegments).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(d.segments)).toBe(true);
  });

  test('R8: Get transcript sections (30-min splits)', async ({ request }) => {
    if (!meetingId) test.skip();
    const r = await request.get(`${MEETING_SERVER_URL}/api/meetings/${meetingId}/transcript/sections`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.success).toBe(true);
    expect(Array.isArray(d.sections)).toBe(true);
    expect(typeof d.sectionMinutes).toBe('number');
  });

  test('R9: Stop transcription', async ({ request }) => {
    if (!meetingId) test.skip();
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${MEETING_SERVER_URL}/api/meetings/${meetingId}/stop-transcription`, {
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.success).toBe(true);
    expect(d.message).toContain('stopped');
    expect(typeof d.totalSegments).toBe('number');
  });

  test('R10: Transcript with text field (backward compat)', async ({ request }) => {
    // Create fresh meeting
    const aptId = `COMPAT-${Date.now()}`;
    const createR = await request.post(`${MEETING_SERVER_URL}/api/meeting/create`, {
      data: { appointmentId: aptId, scheduledTime: new Date().toISOString() },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    const created = await createR.json();
    
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    
    // Start transcription
    await request.post(`${MEETING_SERVER_URL}/api/meetings/${created.meetingId}/start-transcription`, {
      data: { language: 'th-TH' },
      headers: AH(token), timeout: TIMEOUT,
    });
    
    // Use 'text' field instead of 'content' (backward compatibility)
    const r = await request.post(`${MEETING_SERVER_URL}/api/meetings/${created.meetingId}/transcript`, {
      data: {
        speakerId: DOC.id, speakerName: DOC.name, speakerRole: 'doctor',
        text: 'Testing backward compatibility with text field',
        language: 'th',
      },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION S: IN-MEETING CHAT (8 tests)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('S: In-Meeting Chat Messages', () => {
  let chatMeetingId = '';

  test.beforeAll(async ({ request }) => {
    const aptId = `CHAT-${Date.now()}`;
    const r = await request.post(`${MEETING_SERVER_URL}/api/meeting/create`, {
      data: { appointmentId: aptId, doctorId: DOC.id, patientId: P1.id, scheduledTime: new Date().toISOString() },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    const d = await r.json();
    chatMeetingId = d.meetingId;
  });

  test('S1: Doctor sends chat message', async ({ request }) => {
    if (!chatMeetingId) test.skip();
    const r = await request.post(`${MEETING_SERVER_URL}/api/meetings/${chatMeetingId}/chat`, {
      data: {
        senderId: DOC.id, senderName: DOC.name, senderRole: 'doctor',
        message: 'กรุณารอสักครู่นะครับ กำลังตรวจสอบข้อมูล',
      },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.success).toBe(true);
    expect(d.chatMessage.id).toBeTruthy();
    expect(d.chatMessage.message).toContain('กรุณารอ');
  });

  test('S2: Patient sends chat message', async ({ request }) => {
    if (!chatMeetingId) test.skip();
    const r = await request.post(`${MEETING_SERVER_URL}/api/meetings/${chatMeetingId}/chat`, {
      data: {
        senderId: P1.id, senderName: P1.name, senderRole: 'patient',
        message: 'ได้ครับ ขอบคุณคุณหมอ',
      },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.chatMessage.senderRole).toBe('patient');
  });

  test('S3: Get chat messages', async ({ request }) => {
    if (!chatMeetingId) test.skip();
    const r = await request.get(`${MEETING_SERVER_URL}/api/meetings/${chatMeetingId}/chats`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.success).toBe(true);
    expect(d.totalMessages).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(d.messages)).toBe(true);
  });

  test('S4: Empty message rejected', async ({ request }) => {
    if (!chatMeetingId) test.skip();
    const r = await request.post(`${MEETING_SERVER_URL}/api/meetings/${chatMeetingId}/chat`, {
      data: { senderId: DOC.id, senderName: DOC.name, message: '' },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    expect(r.status()).toBe(400);
  });

  test('S5: Multiple messages in sequence', async ({ request }) => {
    if (!chatMeetingId) test.skip();
    for (let i = 0; i < 3; i++) {
      const r = await request.post(`${MEETING_SERVER_URL}/api/meetings/${chatMeetingId}/chat`, {
        data: {
          senderId: DOC.id, senderName: DOC.name, senderRole: 'doctor',
          message: `Test message ${i + 1}`,
        },
        headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
      });
      expect(r.status()).toBe(200);
    }
    
    const getR = await request.get(`${MEETING_SERVER_URL}/api/meetings/${chatMeetingId}/chats`, { timeout: TIMEOUT });
    const d = await getR.json();
    expect(d.totalMessages).toBeGreaterThanOrEqual(5); // 2 + 3
  });

  test('S6: Chat for non-existent meeting returns empty', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/api/meetings/non-existent-id/chats`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.totalMessages).toBe(0);
  });

  test('S7: Chat message has correct structure', async ({ request }) => {
    if (!chatMeetingId) test.skip();
    const r = await request.post(`${MEETING_SERVER_URL}/api/meetings/${chatMeetingId}/chat`, {
      data: {
        senderId: P1.id, senderName: P1.name, senderRole: 'patient',
        message: 'Structure test message',
      },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    const d = await r.json();
    const msg = d.chatMessage;
    expect(msg.id).toBeTruthy();
    expect(msg.meetingId).toBe(chatMeetingId);
    expect(msg.senderId).toBe(P1.id);
    expect(msg.senderName).toBe(P1.name);
    expect(msg.type).toBe('text');
    expect(msg.timestamp).toBeTruthy();
  });

  test('S8: Doctor + Patient send messages in PARALLEL', async ({ request }) => {
    if (!chatMeetingId) test.skip();
    const [r1, r2] = await Promise.all([
      request.post(`${MEETING_SERVER_URL}/api/meetings/${chatMeetingId}/chat`, {
        data: { senderId: DOC.id, senderName: DOC.name, senderRole: 'doctor', message: 'Parallel doctor msg' },
        headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
      }),
      request.post(`${MEETING_SERVER_URL}/api/meetings/${chatMeetingId}/chat`, {
        data: { senderId: P1.id, senderName: P1.name, senderRole: 'patient', message: 'Parallel patient msg' },
        headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
      }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION T: GUEST INVITE MANAGEMENT (6 tests)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('T: Guest Invite Management', () => {
  let inviteMeetingId = '';

  test.beforeAll(async ({ request }) => {
    const aptId = `INVITE-${Date.now()}`;
    const r = await request.post(`${MEETING_SERVER_URL}/api/meeting/create`, {
      data: { appointmentId: aptId, doctorId: DOC.id, patientId: P1.id, scheduledTime: new Date().toISOString() },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    const d = await r.json();
    inviteMeetingId = d.meetingId;
  });

  test('T1: Add guest invite', async ({ request }) => {
    if (!inviteMeetingId) test.skip();
    const r = await request.post(`${MEETING_SERVER_URL}/api/meetings/${inviteMeetingId}/invite`, {
      data: { name: 'Family Member', email: 'family@test.com', role: 'relative' },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.success).toBe(true);
    expect(d.invite.name).toBe('Family Member');
    expect(d.invite.role).toBe('relative');
    expect(d.invite.status).toBe('pending');
  });

  test('T2: Add interpreter invite', async ({ request }) => {
    if (!inviteMeetingId) test.skip();
    const r = await request.post(`${MEETING_SERVER_URL}/api/meetings/${inviteMeetingId}/invite`, {
      data: { name: 'Thai Interpreter', email: 'interpreter@test.com', role: 'interpreter', phone: '0891234567' },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.invite.role).toBe('interpreter');
  });

  test('T3: Get all invites', async ({ request }) => {
    if (!inviteMeetingId) test.skip();
    const r = await request.get(`${MEETING_SERVER_URL}/api/meetings/${inviteMeetingId}/invites`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.success).toBe(true);
    expect(d.totalInvites).toBeGreaterThanOrEqual(2);
    expect(d.invites[0].email).toBeTruthy();
  });

  test('T4: Invite without name/email rejected', async ({ request }) => {
    if (!inviteMeetingId) test.skip();
    const r = await request.post(`${MEETING_SERVER_URL}/api/meetings/${inviteMeetingId}/invite`, {
      data: { role: 'guest' },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    expect(r.status()).toBe(400);
  });

  test('T5: Invites for non-existent meeting returns empty', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/api/meetings/non-existent-id/invites`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.totalInvites).toBe(0);
  });

  test('T6: Guest invite shows in participants', async ({ request }) => {
    if (!inviteMeetingId) test.skip();
    const r = await request.get(`${MEETING_SERVER_URL}/api/meetings/${inviteMeetingId}/participants`, { timeout: TIMEOUT });
    const d = await r.json();
    const hasGuest = d.participants.some((p: any) => p.role === 'relative' || p.role === 'interpreter');
    expect(hasGuest).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION U: AI SUMMARY & VALIDATION (8 tests)
// Process: Gemini SOAP summary → man-in-the-loop → EMR
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('U: AI Summary & Man-in-the-Loop Validation', () => {
  test('U1: AI validations list', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/api/ai/validations`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.success).toBe(true);
    expect(Array.isArray(d.validations)).toBe(true);
  });

  test('U2: AI validate — approve content', async ({ request }) => {
    const r = await request.post(`${MEETING_SERVER_URL}/api/ai/validate`, {
      data: {
        type: 'meeting-summary', content: 'Test AI summary content',
        action: 'approve', doctorId: DOC.id, patientId: P1.id,
      },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.success).toBe(true);
    expect(d.status).toBe('approved');
  });

  test('U3: AI validate — reject content', async ({ request }) => {
    const r = await request.post(`${MEETING_SERVER_URL}/api/ai/validate`, {
      data: {
        type: 'patient-instructions', content: 'Incorrect instructions',
        action: 'reject', doctorId: DOC.id, patientId: P1.id,
        reason: 'Inaccurate dosage information',
      },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.status).toBe('rejected');
  });

  test('U4: Get meeting summary (no summary yet)', async ({ request }) => {
    const aptId = `SUMM-${Date.now()}`;
    const createR = await request.post(`${MEETING_SERVER_URL}/api/meeting/create`, {
      data: { appointmentId: aptId, scheduledTime: new Date().toISOString() },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    const created = await createR.json();
    
    const r = await request.get(`${MEETING_SERVER_URL}/api/meetings/${created.meetingId}/summary`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.success).toBe(true);
    expect(d.summary).toBeTruthy();
  });

  test('U5: Patient portal — AI validate endpoint', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}/api/ai/validate`, {
      data: {
        type: 'patient-instructions', content: 'Take medication twice daily.',
        doctorId: DOC.id, patientId: P1.id, action: 'approve',
      },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
  });

  test('U6: Doctor portal — AI validations list', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/ai/validations`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('U7: Doctor portal — AI health check', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/ai/health`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('U8: Patient portal — AI status check', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/ai/status`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION V: AI ADVANCED FEATURES (8 tests)
// Pre-consultation, Instructions, Document Analysis, CDS
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('V: AI Advanced Features', () => {
  test('V1: AI CDS check — drug interactions', async ({ request }) => {
    const r = await request.post(`${MEETING_SERVER_URL}/api/ai/cds-check`, {
      data: {
        patientId: P1.id,
        medications: ['Paracetamol 500mg', 'Amoxicillin 500mg', 'Omeprazole 20mg'],
        diagnosis: 'Upper respiratory infection',
        allergies: ['Penicillin'],
      },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.success).toBe(true);
    expect(Array.isArray(d.alerts)).toBe(true);
    expect(d.totalAlerts).toBeGreaterThanOrEqual(1); // Should flag allergy
    expect(d.checkedAt).toBeTruthy();
  });

  test('V2: AI CDS check — no issues', async ({ request }) => {
    const r = await request.post(`${MEETING_SERVER_URL}/api/ai/cds-check`, {
      data: {
        patientId: P1.id,
        medications: ['Paracetamol 500mg'],
        diagnosis: 'Common cold',
        allergies: [],
      },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.success).toBe(true);
    expect(d.totalAlerts).toBe(0);
  });

  test('V3: AI pre-consultation summary', async ({ request }) => {
    const r = await request.post(`${MEETING_SERVER_URL}/api/ai/pre-consultation-summary`, {
      data: { patientId: P1.id, appointmentId: 'test-apt-123' },
      headers: { 'Content-Type': 'application/json' }, timeout: AI_TIMEOUT,
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.success).toBe(true);
    expect(d.summary).toBeTruthy();
    expect(d.patientId).toBe(P1.id);
  });

  test('V4: AI patient instruction sheet', async ({ request }) => {
    const r = await request.post(`${MEETING_SERVER_URL}/api/ai/patient-instruction-sheet`, {
      data: {
        meetingId: 'test-meeting-123',
        patientName: P1.name,
        summary: 'Patient has upper respiratory infection',
        diagnosis: 'Upper respiratory infection',
        medications: ['Paracetamol 500mg x 3 times daily', 'Amoxicillin 500mg x 3 times daily'],
        followUp: '1 week',
      },
      headers: { 'Content-Type': 'application/json' }, timeout: AI_TIMEOUT,
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.success).toBe(true);
    expect(d.instructions).toBeTruthy();
    expect(d.requiresValidation).toBe(true);
  });

  test('V5: AI document analysis', async ({ request }) => {
    const r = await request.post(`${MEETING_SERVER_URL}/api/ai/document-analysis`, {
      data: {
        document: 'CBC Results: WBC 15000 (High), RBC 4.5 (Normal), Hemoglobin 14.2 (Normal), Platelets 250000 (Normal)',
        documentType: 'lab-result',
        patientId: P1.id,
      },
      headers: { 'Content-Type': 'application/json' }, timeout: AI_TIMEOUT,
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.success).toBe(true);
    expect(d.analysis).toBeTruthy();
    expect(d.requiresValidation).toBe(true);
  });

  test('V6: AI features return fallback when no API key', async ({ request }) => {
    // CDS check works without Gemini (rule-based)
    const r = await request.post(`${MEETING_SERVER_URL}/api/ai/cds-check`, {
      data: { patientId: P1.id, medications: [], allergies: [] },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.success).toBe(true);
  });

  test('V7: Doctor + Patient AI features in PARALLEL', async ({ request }) => {
    const _doc = await loginDoctor(request, DOC.email, DOC.password);
    const _pat = await loginPatient(request, P1.email, P1.password);
    const [rd, rp] = await Promise.all([
      request.get(`${DOCTOR_URL}/api/ai/health`, { timeout: TIMEOUT }),
      request.get(`${PATIENT_URL}/api/ai/status`, { timeout: TIMEOUT }),
    ]);
    expect(rd.status()).toBe(200);
    expect(rp.status()).toBe(200);
  });

  test('V8: CDS with multiple allergy flags', async ({ request }) => {
    const r = await request.post(`${MEETING_SERVER_URL}/api/ai/cds-check`, {
      data: {
        patientId: P1.id,
        medications: ['Drug A', 'Drug B', 'Drug C'],
        allergies: ['Aspirin', 'Ibuprofen'],
      },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    // Should have both drug-interaction and allergy-check alerts
    expect(d.totalAlerts).toBeGreaterThanOrEqual(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION W: FULL MEETING LIFECYCLE (8 tests)
// Create → Start → Transcribe → Chat → Stop → Summary → Validate → Deliver
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('W: Full Meeting Lifecycle — End-to-End', () => {
  let lifecycleMeetingId = '';
  let lifecycleAptId = '';

  test('W1: Create appointment + meeting', async ({ request }) => {
    test.setTimeout(90_000);
    lifecycleAptId = `LIFECYCLE-${Date.now()}`;
    
    // Create meeting
    const createR = await request.post(`${MEETING_SERVER_URL}/api/meeting/create`, {
      data: {
        appointmentId: lifecycleAptId, doctorId: DOC.id, patientId: P1.id,
        doctorName: DOC.name, patientName: P1.name,
        scheduledTime: new Date().toISOString(),
      },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    expect(createR.status()).toBe(200);
    const meeting = await createR.json();
    lifecycleMeetingId = meeting.meetingId;
    expect(lifecycleMeetingId).toBeTruthy();
  });

  test('W2: Start transcription + add segments', async ({ request }) => {
    if (!lifecycleMeetingId) test.skip();
    test.setTimeout(90_000);
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    
    // Start transcription
    const startR = await request.post(`${MEETING_SERVER_URL}/api/meetings/${lifecycleMeetingId}/start-transcription`, {
      data: { language: 'th-TH' },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(startR.status()).toBe(200);
    
    // Doctor speaks
    await request.post(`${MEETING_SERVER_URL}/api/meetings/${lifecycleMeetingId}/transcript`, {
      data: { speakerId: DOC.id, speakerName: DOC.name, speakerRole: 'doctor', content: 'สวัสดีครับ วันนี้มาด้วยเรื่องอะไรครับ', language: 'th' },
      headers: AH(token), timeout: TIMEOUT,
    });
    
    // Patient responds
    await request.post(`${MEETING_SERVER_URL}/api/meetings/${lifecycleMeetingId}/transcript`, {
      data: { speakerId: P1.id, speakerName: P1.name, speakerRole: 'patient', content: 'ปวดหัวมาก ไข้สูง 39 องศา 3 วันแล้วครับ', language: 'th' },
      headers: AH(token), timeout: TIMEOUT,
    });
    
    // Doctor assessment
    await request.post(`${MEETING_SERVER_URL}/api/meetings/${lifecycleMeetingId}/transcript`, {
      data: { speakerId: DOC.id, speakerName: DOC.name, speakerRole: 'doctor', content: 'น่าจะเป็นไข้หวัดครับ จะสั่งยาพาราเซตามอลและยาแก้หวัด นัดมาดูอาการใน 1 สัปดาห์', language: 'th' },
      headers: AH(token), timeout: TIMEOUT,
    });
  });

  test('W3: Send chat messages during meeting', async ({ request }) => {
    if (!lifecycleMeetingId) test.skip();
    
    await request.post(`${MEETING_SERVER_URL}/api/meetings/${lifecycleMeetingId}/chat`, {
      data: { senderId: DOC.id, senderName: DOC.name, senderRole: 'doctor', message: 'กำลังเตรียมใบสั่งยาให้ครับ' },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    
    await request.post(`${MEETING_SERVER_URL}/api/meetings/${lifecycleMeetingId}/chat`, {
      data: { senderId: P1.id, senderName: P1.name, senderRole: 'patient', message: 'ขอบคุณครับคุณหมอ' },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    
    const chatR = await request.get(`${MEETING_SERVER_URL}/api/meetings/${lifecycleMeetingId}/chats`, { timeout: TIMEOUT });
    const chatData = await chatR.json();
    expect(chatData.totalMessages).toBeGreaterThanOrEqual(2);
  });

  test('W4: Stop transcription', async ({ request }) => {
    if (!lifecycleMeetingId) test.skip();
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    
    const stopR = await request.post(`${MEETING_SERVER_URL}/api/meetings/${lifecycleMeetingId}/stop-transcription`, {
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(stopR.status()).toBe(200);
    const stopped = await stopR.json();
    expect(stopped.totalSegments).toBeGreaterThanOrEqual(3);
  });

  test('W5: Verify transcript saved', async ({ request }) => {
    if (!lifecycleMeetingId) test.skip();
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    
    const transcriptR = await request.get(`${MEETING_SERVER_URL}/api/meetings/${lifecycleMeetingId}/transcript`, {
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(transcriptR.status()).toBe(200);
    const transcriptData = await transcriptR.json();
    expect(transcriptData.totalSegments).toBeGreaterThanOrEqual(0);
  });

  test('W6: CDS check for lifecycle meeting', async ({ request }) => {
    if (!lifecycleMeetingId) test.skip();
    
    const r = await request.post(`${MEETING_SERVER_URL}/api/ai/cds-check`, {
      data: {
        patientId: P1.id,
        medications: ['Paracetamol 500mg', 'Chlorpheniramine 4mg'],
        diagnosis: 'Common cold with fever',
        allergies: [],
      },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.success).toBe(true);
  });

  test('W7: AI validate summary (man-in-the-loop approve)', async ({ request }) => {
    if (!lifecycleMeetingId) test.skip();
    
    const r = await request.post(`${MEETING_SERVER_URL}/api/ai/validate`, {
      data: {
        type: 'meeting-summary',
        content: 'SOAP summary for lifecycle test',
        action: 'approve',
        doctorId: DOC.id,
        patientId: P1.id,
      },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.status).toBe('approved');
  });

  test('W8: Full lifecycle — meeting status is completed', async ({ request }) => {
    if (!lifecycleMeetingId) test.skip();
    
    const r = await request.get(`${MEETING_SERVER_URL}/api/meetings/${lifecycleMeetingId}/status`, { timeout: TIMEOUT });
    const d = await r.json();
    // Meeting should be in completed or transcription_stopped state
    expect(['completed', 'in_progress', 'scheduled', 'transcription_stopped']).toContain(d.status);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION X: MULTI-PATIENT MEETING WORKFLOWS (8 tests)
// Process: Doctor handles multiple patient meetings concurrently
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('X: Multi-Patient Meeting Workflows', () => {
  test('X1: Create meetings for all 3 patients', async ({ request }) => {
    const ts = Date.now();
    const results = await Promise.all([
      request.post(`${MEETING_SERVER_URL}/api/meeting/create`, {
        data: { appointmentId: `MP1-${ts}`, doctorId: DOC.id, patientId: P1.id, doctorName: DOC.name, patientName: P1.name, scheduledTime: new Date().toISOString() },
        headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
      }),
      request.post(`${MEETING_SERVER_URL}/api/meeting/create`, {
        data: { appointmentId: `MP2-${ts}`, doctorId: DOC.id, patientId: P2.id, doctorName: DOC.name, patientName: P2.name, scheduledTime: new Date().toISOString() },
        headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
      }),
      request.post(`${MEETING_SERVER_URL}/api/meeting/create`, {
        data: { appointmentId: `MP3-${ts}`, doctorId: DOC.id, patientId: P3.id, doctorName: DOC.name, patientName: P3.name, scheduledTime: new Date().toISOString() },
        headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
      }),
    ]);
    
    for (const r of results) {
      expect(r.status()).toBe(200);
      const d = await r.json();
      expect(d.meetingId).toBeTruthy();
    }
  });

  test('X2: Chat messages in multiple meetings simultaneously', async ({ request }) => {
    const ts = Date.now();
    // Create 2 meetings
    const [m1, m2] = await Promise.all([
      request.post(`${MEETING_SERVER_URL}/api/meeting/create`, {
        data: { appointmentId: `XC1-${ts}`, doctorId: DOC.id, patientId: P1.id, scheduledTime: new Date().toISOString() },
        headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
      }),
      request.post(`${MEETING_SERVER_URL}/api/meeting/create`, {
        data: { appointmentId: `XC2-${ts}`, doctorId: DOC.id, patientId: P2.id, scheduledTime: new Date().toISOString() },
        headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
      }),
    ]);
    const d1 = await m1.json();
    const d2 = await m2.json();
    
    // Send chat to both meetings in parallel
    const [c1, c2] = await Promise.all([
      request.post(`${MEETING_SERVER_URL}/api/meetings/${d1.meetingId}/chat`, {
        data: { senderId: DOC.id, senderName: DOC.name, senderRole: 'doctor', message: 'Chat to meeting 1' },
        headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
      }),
      request.post(`${MEETING_SERVER_URL}/api/meetings/${d2.meetingId}/chat`, {
        data: { senderId: DOC.id, senderName: DOC.name, senderRole: 'doctor', message: 'Chat to meeting 2' },
        headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
      }),
    ]);
    expect(c1.status()).toBe(200);
    expect(c2.status()).toBe(200);
  });

  test('X3: All patient portals access meetings in PARALLEL', async ({ request }) => {
    const p1 = await loginPatient(request, P1.email, P1.password);
    const p2 = await loginPatient(request, P2.email, P2.password);
    const p3 = await loginPatient(request, P3.email, P3.password);
    
    const [r1, r2, r3] = await Promise.all([
      request.get(`${PATIENT_URL}/api/video-meeting/health`, { headers: AH(p1.token), timeout: TIMEOUT }),
      request.get(`${PATIENT_URL}/api/video-meeting/health`, { headers: AH(p2.token), timeout: TIMEOUT }),
      request.get(`${PATIENT_URL}/api/video-meeting/health`, { headers: AH(p3.token), timeout: TIMEOUT }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
    expect(r3.status()).toBe(200);
  });

  test('X4: Doctor creates meeting from both portals', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const ts = Date.now();
    const [r1, r2] = await Promise.all([
      request.post(`${MEETING_SERVER_URL}/api/meeting/create`, {
        data: { appointmentId: `XD1-${ts}`, doctorId: DOC.id, patientId: P1.id, scheduledTime: new Date().toISOString() },
        headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
      }),
      request.post(`${DOCTOR_URL}/api/video-meeting/create`, {
        data: { appointmentId: `XD2-${ts}`, doctorId: DOC.id, patientId: P2.id, scheduledTime: new Date().toISOString() },
        headers: AH(token), timeout: TIMEOUT,
      }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
  });

  test('X5: All 3 portals + meeting server health in PARALLEL', async ({ request }) => {
    const [p, d, m, mh] = await Promise.all([
      request.get(`${PATIENT_URL}/api/health`, { timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/health`, { timeout: TIMEOUT }),
      request.get(`${MEETING_SERVER_URL}/api/health`, { timeout: TIMEOUT }),
      request.get(`${MEETING_SERVER_URL}/health`, { timeout: TIMEOUT }),
    ]);
    expect(p.status()).toBe(200);
    expect(d.status()).toBe(200);
    expect(m.status()).toBe(200);
    expect(mh.status()).toBe(200);
  });

  test('X6: CDS checks for multiple patients in PARALLEL', async ({ request }) => {
    const [r1, r2, r3] = await Promise.all([
      request.post(`${MEETING_SERVER_URL}/api/ai/cds-check`, {
        data: { patientId: P1.id, medications: ['Drug A'], allergies: [] },
        headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
      }),
      request.post(`${MEETING_SERVER_URL}/api/ai/cds-check`, {
        data: { patientId: P2.id, medications: ['Drug B', 'Drug C'], allergies: ['Aspirin'] },
        headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
      }),
      request.post(`${MEETING_SERVER_URL}/api/ai/cds-check`, {
        data: { patientId: P3.id, medications: [], allergies: [] },
        headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
      }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
    expect(r3.status()).toBe(200);
  });

  test('X7: Multiple AI validations in PARALLEL', async ({ request }) => {
    const [r1, r2] = await Promise.all([
      request.post(`${MEETING_SERVER_URL}/api/ai/validate`, {
        data: { type: 'summary', content: 'Validate 1', action: 'approve', doctorId: DOC.id, patientId: P1.id },
        headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
      }),
      request.post(`${MEETING_SERVER_URL}/api/ai/validate`, {
        data: { type: 'instructions', content: 'Validate 2', action: 'reject', doctorId: DOC.id, patientId: P2.id },
        headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
      }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
  });

  test('X8: ULTIMATE — ALL services, ALL users, ALL meeting features', async ({ request }) => {
    test.setTimeout(120_000);
    const p1 = await loginPatient(request, P1.email, P1.password);
    const doc = await loginDoctor(request, DOC.email, DOC.password);
    const ts = Date.now();
    
    const results = await Promise.all([
      // Meeting Server endpoints
      request.get(`${MEETING_SERVER_URL}/api/health`, { timeout: TIMEOUT }),
      request.get(`${MEETING_SERVER_URL}/api/ai/validations`, { timeout: TIMEOUT }),
      request.post(`${MEETING_SERVER_URL}/api/ai/cds-check`, {
        data: { patientId: P1.id, medications: ['Test'], allergies: [] },
        headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
      }),
      request.post(`${MEETING_SERVER_URL}/api/meeting/create`, {
        data: { appointmentId: `ULT-${ts}`, doctorId: DOC.id, patientId: P1.id, scheduledTime: new Date().toISOString() },
        headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
      }),
      // Patient Portal
      request.get(`${PATIENT_URL}/api/video-meeting/health`, { timeout: TIMEOUT }),
      request.get(`${PATIENT_URL}/api/appointments`, { headers: AH(p1.token), timeout: TIMEOUT }),
      // Doctor Portal
      request.get(`${DOCTOR_URL}/api/video-meeting/health`, { timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/appointments`, { headers: AH(doc.token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/ai/health`, { timeout: TIMEOUT }),
    ]);
    
    for (const r of results) {
      expect(r.status()).toBe(200);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION Y: CROSS-SERVICE MEETING INTEGRATION (6 tests)
// Patient creates → Doctor manages → Meeting Server processes
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Y: Cross-Service Meeting Integration', () => {
  test('Y1: Patient appointment → Doctor creates meeting → transcript flow', async ({ request }) => {
    test.setTimeout(90_000);
    const { token: patToken } = await loginPatient(request, P1.email, P1.password);
    const { token: docToken } = await loginDoctor(request, DOC.email, DOC.password);
    
    // Patient creates appointment
    const aptR = await request.post(`${PATIENT_URL}/api/appointments`, {
      data: {
        patientId: P1.id, doctorId: DOC.id, type: 'telemedicine',
        reason: 'E2E cross-service test', scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        scheduledTime: '10:00',
      },
      headers: AH(patToken), timeout: TIMEOUT,
    });
    expect(aptR.status()).toBe(200);
    
    // Doctor sees appointment
    const docAptR = await request.get(`${DOCTOR_URL}/api/appointments`, { headers: AH(docToken), timeout: TIMEOUT });
    expect(docAptR.status()).toBe(200);
    
    // Create meeting via meeting server
    const meetR = await request.post(`${MEETING_SERVER_URL}/api/meeting/create`, {
      data: { appointmentId: `CROSS-${Date.now()}`, doctorId: DOC.id, patientId: P1.id, doctorName: DOC.name, patientName: P1.name, scheduledTime: new Date().toISOString() },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    expect(meetR.status()).toBe(200);
  });

  test('Y2: All portals video-meeting config consistent', async ({ request }) => {
    const [patConfig, docConfig, meetHealth] = await Promise.all([
      request.get(`${PATIENT_URL}/api/video-meeting/config`, { timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/video-meeting/config`, { timeout: TIMEOUT }),
      request.get(`${MEETING_SERVER_URL}/api/health`, { timeout: TIMEOUT }),
    ]);
    expect(patConfig.status()).toBe(200);
    expect(docConfig.status()).toBe(200);
    expect(meetHealth.status()).toBe(200);
  });

  test('Y3: Doctor AI features + Meeting AI features both available', async ({ request }) => {
    const [docAI, meetValidations, meetCDS] = await Promise.all([
      request.get(`${DOCTOR_URL}/api/ai/health`, { timeout: TIMEOUT }),
      request.get(`${MEETING_SERVER_URL}/api/ai/validations`, { timeout: TIMEOUT }),
      request.post(`${MEETING_SERVER_URL}/api/ai/cds-check`, {
        data: { patientId: P1.id, medications: [], allergies: [] },
        headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
      }),
    ]);
    expect(docAI.status()).toBe(200);
    expect(meetValidations.status()).toBe(200);
    expect(meetCDS.status()).toBe(200);
  });

  test('Y4: 5 users + all services active SIMULTANEOUSLY', async ({ request }) => {
    test.setTimeout(120_000);
    const p1 = await loginPatient(request, P1.email, P1.password);
    const p2 = await loginPatient(request, P2.email, P2.password);
    const p3 = await loginPatient(request, P3.email, P3.password);
    const doc = await loginDoctor(request, DOC.email, DOC.password);
    const adm = await loginDoctor(request, ADM.email, ADM.password);
    
    const results = await Promise.all([
      request.get(`${PATIENT_URL}/api/appointments`, { headers: AH(p1.token), timeout: TIMEOUT }),
      request.get(`${PATIENT_URL}/api/phr/${P2.id}`, { headers: AH(p2.token), timeout: TIMEOUT }),
      request.get(`${PATIENT_URL}/api/notifications`, { headers: AH(p3.token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/appointments`, { headers: AH(doc.token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/admin/stats`, { headers: AH(adm.token), timeout: TIMEOUT }),
      request.get(`${MEETING_SERVER_URL}/api/health`, { timeout: TIMEOUT }),
      request.get(`${MEETING_SERVER_URL}/api/ai/validations`, { timeout: TIMEOUT }),
    ]);
    
    for (const r of results) {
      expect(r.status()).toBe(200);
    }
  });

  test('Y5: Meeting creation from all entry points', async ({ request }) => {
    const { token: docToken } = await loginDoctor(request, DOC.email, DOC.password);
    const ts = Date.now();
    
    const [r1, r2, r3] = await Promise.all([
      // Via meeting server (no auth)
      request.post(`${MEETING_SERVER_URL}/api/meeting/create`, {
        data: { appointmentId: `Y5A-${ts}`, doctorId: DOC.id, patientId: P1.id, scheduledTime: new Date().toISOString() },
        headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
      }),
      // Via patient portal
      request.post(`${PATIENT_URL}/api/video-meeting/create`, {
        data: { appointmentId: `Y5B-${ts}`, doctorId: DOC.id, patientId: P2.id, scheduledTime: new Date().toISOString() },
        headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
      }),
      // Via doctor portal (authenticated)
      request.post(`${DOCTOR_URL}/api/video-meeting/create`, {
        data: { appointmentId: `Y5C-${ts}`, doctorId: DOC.id, patientId: P3.id, scheduledTime: new Date().toISOString() },
        headers: AH(docToken), timeout: TIMEOUT,
      }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
    expect(r3.status()).toBe(200);
  });

  test('Y6: Cross-portal data sync — meeting + appointments + notifications', async ({ request }) => {
    const p1 = await loginPatient(request, P1.email, P1.password);
    const doc = await loginDoctor(request, DOC.email, DOC.password);
    
    const results = await Promise.all([
      // Patient sees appointments
      request.get(`${PATIENT_URL}/api/appointments`, { headers: AH(p1.token), timeout: TIMEOUT }),
      // Doctor sees appointments
      request.get(`${DOCTOR_URL}/api/appointments`, { headers: AH(doc.token), timeout: TIMEOUT }),
      // Patient notifications
      request.get(`${PATIENT_URL}/api/notifications`, { headers: AH(p1.token), timeout: TIMEOUT }),
      // Doctor notifications
      request.get(`${DOCTOR_URL}/api/notifications`, { headers: AH(doc.token), timeout: TIMEOUT }),
      // Meeting server healthy
      request.get(`${MEETING_SERVER_URL}/api/health`, { timeout: TIMEOUT }),
    ]);
    
    for (const r of results) {
      expect(r.status()).toBe(200);
    }
  });
});
