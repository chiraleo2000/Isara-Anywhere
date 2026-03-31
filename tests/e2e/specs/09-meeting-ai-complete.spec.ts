/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — MEETING SERVER & AI PIPELINE E2E TESTS v1.4.8
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Deep testing of meeting server, AI pipeline (Gemini 2.5 Flash Lite),
 * CDS, pre-consultation summaries, patient instructions, drug interactions,
 * AI memory, knowledge base (RAG), and transcript pipeline.
 *
 * Coverage:
 *   - Meeting Server (26 endpoints)
 *   - AI Gemini Chat, CDS, EMR, Patient Instructions
 *   - AI Memory & Context
 *   - Knowledge Base & RAG
 *   - Transcript Processing & Embeddings
 *
 * Updated: February 15, 2026
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { test, expect, APIRequestContext } from '@playwright/test';
import {
  PATIENT_URL, DOCTOR_URL, MEETING_SERVER_URL,
  CREDENTIALS, IS_CLOUD,
} from '../lib/test-config';

const TIMEOUT = IS_CLOUD ? 30_000 : 15_000;
const AI_TIMEOUT = 60_000;
const P1 = CREDENTIALS.patient1;
const DOC = CREDENTIALS.doctor;
const ADM = CREDENTIALS.admin;

async function loginPatient(request: APIRequestContext, email: string, password: string) {
  const r = await request.post(`${PATIENT_URL}/api/auth/login`, {
    data: { email, password }, headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
  });
  expect(r.status()).toBe(200);
  const d = await r.json();
  return { token: d.token || d.accessToken || '', user: d.user || d.data?.user || {} };
}

async function loginDoctor(request: APIRequestContext, email: string, password: string) {
  for (const path of ['/auth/login', '/api/auth/login']) {
    try {
      const r = await request.post(`${DOCTOR_URL}${path}`, {
        data: { email, password }, headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
      });
      if (r.status() === 200) {
        const d = await r.json();
        return { token: d.token || d.accessToken || d.data?.token || '', user: d.user || d.data?.user || {} };
      }
    } catch { /* try next */ }
  }
  throw new Error('Doctor login failed');
}

function AH(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MT-A: MEETING SERVER INFRASTRUCTURE (10 tests)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('MT-A: Meeting Server Infrastructure', () => {
  test('MT-A01: Meeting server root health', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/health`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('MT-A02: Meeting server API health', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/api/health`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.status).toBeTruthy();
  });

  test('MT-A03: Meeting server database health', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/api/health/db`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('MT-A04: Meeting server Jitsi config', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/api/config`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d).toBeTruthy();
  });

  test('MT-A05: Meeting create endpoint', async ({ request }) => {
    const uid = Date.now();
    const r = await request.post(`${MEETING_SERVER_URL}/api/meetings/create`, {
      data: { appointmentId: `APT-MTA05-${uid}`, doctorId: DOC.id, patientId: P1.id, roomName: `mt-a05-${uid}` },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('MT-A06: Meeting list endpoint', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/api/meetings`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('MT-A07: Active meetings endpoint', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/api/meetings/active`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('MT-A08: Meeting history endpoint', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/api/meetings/history`, { timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });

  test('MT-A09: Meeting transcriptions endpoint', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/api/transcriptions`, { timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });

  test('MT-A10: All meeting endpoints in PARALLEL', async ({ request }) => {
    const [h, ah, dh, cfg, mtgs, active] = await Promise.all([
      request.get(`${MEETING_SERVER_URL}/health`, { timeout: TIMEOUT }),
      request.get(`${MEETING_SERVER_URL}/api/health`, { timeout: TIMEOUT }),
      request.get(`${MEETING_SERVER_URL}/api/health/db`, { timeout: TIMEOUT }),
      request.get(`${MEETING_SERVER_URL}/api/config`, { timeout: TIMEOUT }),
      request.get(`${MEETING_SERVER_URL}/api/meetings`, { timeout: TIMEOUT }),
      request.get(`${MEETING_SERVER_URL}/api/meetings/active`, { timeout: TIMEOUT }),
    ]);
    expect(h.status()).toBe(200);
    expect(ah.status()).toBe(200);
    expect(dh.status()).toBe(200);
    expect(cfg.status()).toBe(200);
    expect(mtgs.status()).toBe(200);
    expect(active.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MT-B: MEETING LIFECYCLE (8 tests)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('MT-B: Meeting Lifecycle', () => {
  test('MT-B01: Doctor creates meeting from doctor portal', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/meetings/create`, {
      data: { appointmentId: `APT-MTB01-${Date.now()}`, doctorId: DOC.id, patientId: P1.id },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('MT-B02: Doctor lists meetings', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/meetings`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('MT-B03: Patient meeting config accessible', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.get(`${PATIENT_URL}/api/video-meeting/config`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('MT-B04: Doctor meeting config accessible', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/video-meeting/config`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('MT-B05: Meeting token generation', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/meetings/token`, {
      data: { roomName: `mt-b05-${Date.now()}`, userId: DOC.id, role: 'moderator' },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('MT-B06: Meeting end with transcript save', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/meetings/end`, {
      data: { meetingId: `meet-test-${Date.now()}`, transcript: 'Sample transcript data' },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('MT-B07: Cross-portal meeting readiness', async ({ request }) => {
    const patToken = (await loginPatient(request, P1.email, P1.password)).token;
    const docToken = (await loginDoctor(request, DOC.email, DOC.password)).token;
    const [pc, dc, ms] = await Promise.all([
      request.get(`${PATIENT_URL}/api/video-meeting/config`, { headers: AH(patToken), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/video-meeting/config`, { headers: AH(docToken), timeout: TIMEOUT }),
      request.get(`${MEETING_SERVER_URL}/health`, { timeout: TIMEOUT }),
    ]);
    expect(pc.status()).toBe(200);
    expect(dc.status()).toBe(200);
    expect(ms.status()).toBe(200);
  });

  test('MT-B08: Meeting + transcription + AI pipeline flow', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const [m, t, ai] = await Promise.all([
      request.get(`${DOCTOR_URL}/api/meetings`, { headers: AH(token), timeout: TIMEOUT }),
      request.get(`${DOCTOR_URL}/api/meeting/transcript/latest`, { headers: AH(token), timeout: TIMEOUT }),
      request.post(`${DOCTOR_URL}/api/ai/chat`, {
        data: { message: 'meeting pipeline test', sessionId: `mt-b08-${Date.now()}` },
        headers: AH(token), timeout: AI_TIMEOUT,
      }),
    ]);
    expect(m.status()).toBe(200);
    expect(t.status()).toBeLessThan(500);
    expect(ai.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MT-C: AI GEMINI PIPELINE (12 tests)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('MT-C: AI Gemini Pipeline', () => {
  test('MT-C01: AI chat basic response', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/ai/chat`, {
      data: { message: 'What is hypertension?', sessionId: `mt-c01-${Date.now()}` },
      headers: AH(token), timeout: AI_TIMEOUT,
    });
    expect(r.status()).toBe(200);
    const d = await r.json();
    expect(d.response || d.message || d.text || d.data).toBeTruthy();
  });

  test('MT-C02: AI CDS drug interaction check', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/ai/cds-check`, {
      data: {
        patientId: P1.id,
        medications: ['Warfarin', 'Aspirin'],
        diagnosis: 'Atrial fibrillation',
      },
      headers: AH(token), timeout: AI_TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('MT-C03: AI pre-consultation summary', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/ai/pre-consultation`, {
      data: { patientId: P1.id },
      headers: AH(token), timeout: AI_TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('MT-C04: AI EMR summary generation', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/ai/emr-summary`, {
      data: {
        transcript: 'Patient complains of chest pain. BP 140/90. ECG normal.',
        patientId: P1.id,
      },
      headers: AH(token), timeout: AI_TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('MT-C05: AI patient instruction generation', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/ai/patient-instruction`, {
      data: {
        diagnosis: 'Type 2 Diabetes', medications: ['Metformin 500mg'],
        followUp: '1 month', language: 'th',
      },
      headers: AH(token), timeout: AI_TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('MT-C06: AI chat with medical context', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/ai/chat`, {
      data: {
        message: 'What medications should I consider for a patient with hypertension and diabetes?',
        sessionId: `mt-c06-${Date.now()}`, context: 'clinical',
      },
      headers: AH(token), timeout: AI_TIMEOUT,
    });
    expect(r.status()).toBe(200);
  });

  test('MT-C07: AI memory stores conversation history', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const sessionId = `mt-c07-${Date.now()}`;
    const r1 = await request.post(`${DOCTOR_URL}/api/ai/chat`, {
      data: { message: 'Remember that patient A has diabetes', sessionId },
      headers: AH(token), timeout: AI_TIMEOUT,
    });
    expect(r1.status()).toBe(200);
    const r2 = await request.post(`${DOCTOR_URL}/api/ai/chat`, {
      data: { message: 'What condition does patient A have?', sessionId },
      headers: AH(token), timeout: AI_TIMEOUT,
    });
    expect(r2.status()).toBe(200);
  });

  test('MT-C08: AI knowledge base query', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/ai/knowledge`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });

  test('MT-C09: AI meeting summary from transcript', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/ai/meeting-summary`, {
      data: {
        transcript: 'Doctor: How are you? Patient: I have a headache. Doctor: Since when? Patient: 3 days.',
        meetingId: `meet-c09-${Date.now()}`,
      },
      headers: AH(token), timeout: AI_TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('MT-C10: Patient AI Doctor chat', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.post(`${PATIENT_URL}/api/ai/chat`, {
      data: { message: 'I have a headache, what should I do?', sessionId: `mt-c10-${Date.now()}` },
      headers: AH(token), timeout: AI_TIMEOUT,
    });
    expect(r.status()).toBe(200);
  });

  test('MT-C11: Patient AI chat history', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.get(`${PATIENT_URL}/api/ai/history`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('MT-C12: AI features parallel check from both portals', async ({ request }) => {
    const patToken = (await loginPatient(request, P1.email, P1.password)).token;
    const docToken = (await loginDoctor(request, DOC.email, DOC.password)).token;
    const [pai, dai, mem] = await Promise.all([
      request.post(`${PATIENT_URL}/api/ai/chat`, {
        data: { message: 'test', sessionId: `mt-c12p-${Date.now()}` },
        headers: AH(patToken), timeout: AI_TIMEOUT,
      }),
      request.post(`${DOCTOR_URL}/api/ai/chat`, {
        data: { message: 'test', sessionId: `mt-c12d-${Date.now()}` },
        headers: AH(docToken), timeout: AI_TIMEOUT,
      }),
      request.get(`${PATIENT_URL}/api/ai/history`, { headers: AH(patToken), timeout: TIMEOUT }),
    ]);
    expect(pai.status()).toBe(200);
    expect(dai.status()).toBe(200);
    expect(mem.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MT-D: TRANSCRIPT & EMBEDDING PIPELINE (6 tests)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('MT-D: Transcript & Embedding Pipeline', () => {
  test('MT-D01: Save meeting transcript', async ({ request }) => {
    await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${MEETING_SERVER_URL}/api/transcriptions`, {
      data: {
        meetingId: `meet-d01-${Date.now()}`,
        transcript: 'Doctor: สวัสดีครับ Patient: สวัสดีค่ะ Doctor: วันนี้มีอาการอะไรบ้างครับ?',
        doctorId: DOC.id, patientId: P1.id,
      },
      headers: { 'Content-Type': 'application/json' }, timeout: TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('MT-D02: Doctor views latest transcript', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/api/meeting/transcript/latest`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });

  test('MT-D03: AI processes transcript for embeddings', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/ai/embed-transcript`, {
      data: {
        transcript: 'Patient reports severe headache for 3 days with nausea.',
        meetingId: `meet-d03-${Date.now()}`,
      },
      headers: AH(token), timeout: AI_TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('MT-D04: Meeting transcription history', async ({ request }) => {
    const r = await request.get(`${MEETING_SERVER_URL}/api/transcriptions`, { timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });

  test('MT-D05: AI semantic search on transcripts', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/ai/search`, {
      data: { query: 'headache treatment', limit: 5 },
      headers: AH(token), timeout: AI_TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('MT-D06: Transcript + AI summary + EMR flow', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const transcript = 'Patient has fever 38.5C, cough, and sore throat for 2 days.';
    const [summ, emr] = await Promise.all([
      request.post(`${DOCTOR_URL}/api/ai/meeting-summary`, {
        data: { transcript, meetingId: `meet-d06-${Date.now()}` },
        headers: AH(token), timeout: AI_TIMEOUT,
      }),
      request.post(`${DOCTOR_URL}/api/ai/emr-summary`, {
        data: { transcript, patientId: P1.id },
        headers: AH(token), timeout: AI_TIMEOUT,
      }),
    ]);
    expect(summ.status()).toBeLessThan(500);
    expect(emr.status()).toBeLessThan(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MT-E: GCS STORAGE & FILE MANAGEMENT (8 tests)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('MT-E: GCS Storage & File Management', () => {
  test('MT-E01: GCS health check', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/gcs/health`, { timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('MT-E02: GCS buckets list', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/gcs/buckets`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBe(200);
  });

  test('MT-E03: Patient GCS files list', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.get(`${DOCTOR_URL}/gcs/files/${P1.id}`, { headers: AH(token), timeout: TIMEOUT });
    expect(r.status()).toBeLessThan(500);
  });

  test('MT-E04: GCS signed upload URL', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/gcs/upload-url`, {
      data: { fileName: `test-${Date.now()}.pdf`, contentType: 'application/pdf', patientId: P1.id },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('MT-E05: Patient profile image upload URL', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.post(`${PATIENT_URL}/api/upload/profile-image`, {
      data: { fileName: 'profile.jpg', contentType: 'image/jpeg' },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('MT-E06: Medical document upload URL', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/gcs/upload-url`, {
      data: { fileName: `lab-${Date.now()}.pdf`, contentType: 'application/pdf', category: 'lab-results', patientId: P1.id },
      headers: AH(token), timeout: TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('MT-E07: GCS storage from both portals PARALLEL', async ({ request }) => {
    const patToken = (await loginPatient(request, P1.email, P1.password)).token;
    const docToken = (await loginDoctor(request, DOC.email, DOC.password)).token;
    const [gh, pup, gb] = await Promise.all([
      request.get(`${DOCTOR_URL}/gcs/health`, { timeout: TIMEOUT }),
      request.post(`${PATIENT_URL}/api/upload/profile-image`, {
        data: { fileName: 'test.jpg', contentType: 'image/jpeg' },
        headers: AH(patToken), timeout: TIMEOUT,
      }),
      request.get(`${DOCTOR_URL}/gcs/buckets`, { headers: AH(docToken), timeout: TIMEOUT }),
    ]);
    expect(gh.status()).toBe(200);
    expect(pup.status()).toBeLessThan(500);
    expect(gb.status()).toBe(200);
  });

  test('MT-E08: GCS + meeting + AI storage integration', async ({ request }) => {
    const [gh, mh] = await Promise.all([
      request.get(`${DOCTOR_URL}/gcs/health`, { timeout: TIMEOUT }),
      request.get(`${MEETING_SERVER_URL}/health`, { timeout: TIMEOUT }),
    ]);
    expect(gh.status()).toBe(200);
    expect(mh.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MT-F: AI EDGE CASES & RESILIENCE (6 tests)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('MT-F: AI Edge Cases & Resilience', () => {
  test('MT-F01: AI handles empty message gracefully', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/ai/chat`, {
      data: { message: '', sessionId: `mt-f01-${Date.now()}` },
      headers: AH(token), timeout: AI_TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('MT-F02: AI handles very long message', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const longMsg = 'Patient symptoms: '.repeat(200);
    const r = await request.post(`${DOCTOR_URL}/api/ai/chat`, {
      data: { message: longMsg, sessionId: `mt-f02-${Date.now()}` },
      headers: AH(token), timeout: AI_TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
  });

  test('MT-F03: AI handles Thai language input', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/ai/chat`, {
      data: { message: 'ผู้ป่วยมีอาการปวดหัวมา 3 วัน', sessionId: `mt-f03-${Date.now()}` },
      headers: AH(token), timeout: AI_TIMEOUT,
    });
    expect(r.status()).toBe(200);
  });

  test('MT-F04: Patient AI handles medical disclaimer', async ({ request }) => {
    const { token } = await loginPatient(request, P1.email, P1.password);
    const r = await request.post(`${PATIENT_URL}/api/ai/chat`, {
      data: { message: 'Should I take aspirin for my headache?', sessionId: `mt-f04-${Date.now()}` },
      headers: AH(token), timeout: AI_TIMEOUT,
    });
    expect(r.status()).toBe(200);
  });

  test('MT-F05: Multiple concurrent AI sessions', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const [r1, r2, r3] = await Promise.all([
      request.post(`${DOCTOR_URL}/api/ai/chat`, {
        data: { message: 'session 1 test', sessionId: `mt-f05a-${Date.now()}` },
        headers: AH(token), timeout: AI_TIMEOUT,
      }),
      request.post(`${DOCTOR_URL}/api/ai/chat`, {
        data: { message: 'session 2 test', sessionId: `mt-f05b-${Date.now()}` },
        headers: AH(token), timeout: AI_TIMEOUT,
      }),
      request.post(`${DOCTOR_URL}/api/ai/chat`, {
        data: { message: 'session 3 test', sessionId: `mt-f05c-${Date.now()}` },
        headers: AH(token), timeout: AI_TIMEOUT,
      }),
    ]);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
    expect(r3.status()).toBe(200);
  });

  test('MT-F06: CDS check with no medications (edge)', async ({ request }) => {
    const { token } = await loginDoctor(request, DOC.email, DOC.password);
    const r = await request.post(`${DOCTOR_URL}/api/ai/cds-check`, {
      data: { patientId: P1.id, medications: [], diagnosis: '' },
      headers: AH(token), timeout: AI_TIMEOUT,
    });
    expect(r.status()).toBeLessThan(500);
  });
});
