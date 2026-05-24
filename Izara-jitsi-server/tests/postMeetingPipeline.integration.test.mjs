/**
 * Integration: storage → transcript → Gemini summary → DB (mocked externals)
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createPostMeetingPipeline } from '../server/postMeetingPipeline.js';

function minimalWebm(size = 2048) {
  const buf = Buffer.alloc(size);
  buf.writeUInt32BE(0x1a45dfa3, 0);
  return buf;
}

function mockGenAI() {
  return {
    getGenerativeModel: () => ({
      generateContent: async () => ({
        response: {
          text: () =>
            JSON.stringify({
              symptoms: ['เจ็บหัว'],
              doctorNotes: ['ตรวจแล้ว'],
              patientStatements: ['ปวด 2 วัน'],
              assessment: 'น่าจะเป็นไมเกรน',
              planAndNextSteps: ['พักผ่อน'],
              redFlags: [],
              emrSoapDraft: { subjective: 'S', objective: 'O', assessment: 'A', plan: 'P' },
              requiresPhysicianValidation: true,
            }),
        },
      }),
    }),
  };
}

describe('postMeetingPipeline integration', () => {
  let tmpDir;
  const meetingId = 'int-meet-001';
  const appointmentId = 'APT-INT-001';
  const doctorId = 'DR-INT-001';
  let db;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'izara-pipe-int-'));
    process.env.JWT_SECRET = 'integration-test-secret';
    db = {
      meeting: {
        id: meetingId,
        appointment_id: appointmentId,
        doctor_id: doctorId,
        patient_id: 'PAT-INT',
        recording_mimetype: 'video/webm',
        transcript: '',
        ai_summary: null,
        meeting_config: {},
      },
      transcripts: [],
    };
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('PM-INT-01 — full pipeline completes with mocked Gemini', async () => {
    const updates = [];
    const safeQuery = async (sql, params) => {
      if (sql.includes('SELECT mr.*')) {
        return { rows: [db.meeting] };
      }
      if (sql.includes('UPDATE meeting_records SET') && sql.includes('recording_url')) {
        db.meeting.recording_url = params[0];
        updates.push('recording');
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO meeting_transcripts')) {
        db.transcripts.push(params);
        return { rows: [] };
      }
      if (sql.includes('transcript = $2')) {
        db.meeting.transcript = params[1];
        updates.push('transcript');
        return { rows: [] };
      }
      if (sql.includes('ai_summary = COALESCE')) {
        db.meeting.ai_summary = params[1];
        updates.push('summary');
        return { rows: [] };
      }
      if (sql.includes('meeting_config')) {
        return { rows: [] };
      }
      return { rows: [] };
    };

    const emitted = [];
    const io = {
      to: () => ({
        emit: (event, payload) => emitted.push({ event, payload }),
      }),
      emit: (event, payload) => emitted.push({ event, payload }),
    };

    const pipeline = createPostMeetingPipeline({
      safeQuery,
      genAI: mockGenAI(),
      geminiModel: 'gemini-test',
      recordingsDir: tmpDir,
      io,
      hasSttCredentials: () => false,
      createSpeechClient: async () => null,
      generateStructuredSOAP: async () => ({ subjective: 'S', objective: 'O', assessment: 'A', plan: 'P' }),
      generateEmrNarrativeSummary: async () => 'สรุปการปรึกษาทดสอบ',
    });

    const buffer = minimalWebm(4096);
    const result = await pipeline.runPostMeetingPipeline(appointmentId, {
      recordingBuffer: buffer,
      mimeType: 'video/webm',
      meeting: db.meeting,
      fullTranscript: '[แพทย์] สวัสดีครับ\n[ผู้ป่วย] ปวดหัวครับ',
    });

    assert.equal(result.stage, 'completed');
    assert.ok(db.meeting.recording_url.includes(`/meetings/${doctorId}/${meetingId}/video.webm`));
    assert.ok(db.meeting.ai_summary?.includes('สรุป'));
    const diskPath = path.join(tmpDir, 'meetings', doctorId, meetingId, 'video.webm');
    assert.ok(fs.existsSync(diskPath));
    assert.ok(emitted.some((e) => e.event === 'meeting-summary-ready'));
    assert.ok(updates.includes('summary'));
  });

  it('PM-INT-02 — Jibri base64 ingest stores video.mp4 path', async () => {
    const safeQuery = async (sql) => {
      if (sql.includes('SELECT mr.*')) return { rows: [db.meeting] };
      if (sql.includes('UPDATE meeting_records')) return { rows: [] };
      return { rows: [] };
    };
    const pipeline = createPostMeetingPipeline({
      safeQuery,
      genAI: null,
      geminiModel: 'test',
      recordingsDir: tmpDir,
      io: null,
      hasSttCredentials: () => false,
      createSpeechClient: async () => null,
      generateStructuredSOAP: async () => null,
      generateEmrNarrativeSummary: async () => null,
    });

    const mp4 = Buffer.alloc(2048);
    mp4.write('ftyp', 4, 'ascii');
    const stored = await pipeline.ingestJibriRecording({
      meetingId,
      doctorId,
      videoBase64: mp4.toString('base64'),
      mimeType: 'video/mp4',
    });
    assert.match(stored.recordingUrl, /video\.mp4$/);
    assert.ok(fs.existsSync(stored.videoPath));
  });
});
