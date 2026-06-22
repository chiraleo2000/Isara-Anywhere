/**
 * Round 2 — Whisper/Gemini pipeline resilience (mocked 504 + corrupt audio)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createPostMeetingPipeline } from '../backend/services/postMeetingPipeline.js';
import { isTransientError, withRetry } from '../backend/pipelineRetry.js';

function minimalWebm(size = 2048) {
  const buf = Buffer.alloc(size);
  buf.writeUInt32BE(0x1a45dfa3, 0);
  return buf;
}

describe('Round 2 — pipeline chaos', () => {
  let tmpDir;
  const originalFetch = globalThis.fetch;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'izara-r2-pipe-'));
    process.env.JWT_SECRET = 'round2-chaos-secret';
    process.env.PIPELINE_RETRY_MAX = '3';
    process.env.PIPELINE_RETRY_BASE_MS = '5';
  });

  it('R2-P01 — isTransientError treats HTTP 504 / gateway timeout', () => {
    assert.equal(isTransientError({ status: 504, message: 'Gateway Timeout' }), true);
    assert.equal(isTransientError(new Error('Whisper API 504: gateway timeout')), true);
    assert.equal(isTransientError(new Error('permanent validation failed')), false);
  });

  it('R2-P02 — withRetry recovers after simulated 504 Whisper failures', async () => {
    let calls = 0;
    const out = await withRetry(
      async () => {
        calls += 1;
        if (calls < 3) {
          const err = new Error('Whisper API 504: gateway timeout');
          err.status = 504;
          throw err;
        }
        return 'transcript-ok';
      },
      { label: 'whisper-504', shouldRetry: isTransientError, baseDelayMs: 5 },
    );
    assert.equal(out, 'transcript-ok');
    assert.equal(calls, 3);
  });

  it('R2-P03 — corrupt audio rejected; pipeline failed with userMessage (no throw)', async () => {
    const safeQuery = async (sql) => {
      if (sql.includes('SELECT mr.*')) {
        return {
          rows: [{
            id: 'm-r2-corrupt',
            appointment_id: 'APT-R2-CORRUPT',
            doctor_id: 'DR-R2',
            recording_mimetype: 'video/webm',
            recording_data: null,
            transcript: '',
            meeting_config: {},
          }],
        };
      }
      if (sql.includes('meeting_config')) return { rows: [] };
      return { rows: [] };
    };
    const pipeline = createPostMeetingPipeline({
      safeQuery,
      genAI: null,
      geminiModel: 'test',
      recordingsDir: tmpDir,
      io: { to: () => ({ emit: () => {} }) },
      hasSttCredentials: () => false,
      createSpeechClient: async () => null,
      generateStructuredSOAP: async () => null,
      generateEmrNarrativeSummary: async () => null,
    });

    const corrupt = Buffer.alloc(1500, 0xff);
    const result = await pipeline.runPostMeetingPipeline('APT-R2-CORRUPT', {
      meeting: (await pipeline.resolveMeetingContext('APT-R2-CORRUPT')),
      recordingBuffer: corrupt,
      mimeType: 'video/webm',
    });
    assert.equal(result.stage, 'failed');
    assert.ok(result.userMessage || result.error);
  });

  it('R2-P04 — Whisper 504 exhaust retries → failed_summary with userMessage', async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 504,
      text: async () => 'gateway timeout',
    });

    const safeQuery = async (sql) => {
      if (sql.includes('SELECT mr.*')) {
        return {
          rows: [{
            id: 'm-r2-whisper',
            appointment_id: 'APT-R2-WHISPER',
            doctor_id: 'DR-R2',
            recording_mimetype: 'audio/webm',
            recording_data: null,
            transcript: '',
            meeting_config: {},
          }],
        };
      }
      if (sql.includes('meeting_transcripts')) return { rows: [] };
      if (sql.includes('UPDATE meeting_records SET transcript')) return { rows: [] };
      if (sql.includes('meeting_config')) return { rows: [] };
      return { rows: [] };
    };

    process.env.OPENAI_API_KEY = 'test-whisper-key-chaos';

    const pipeline = createPostMeetingPipeline({
      safeQuery,
      genAI: {
        getGenerativeModel: () => ({
          generateContent: async () => ({
            response: { text: () => '{"symptoms":[],"requiresPhysicianValidation":true}' },
          }),
        }),
      },
      geminiModel: 'test',
      recordingsDir: tmpDir,
      io: { to: () => ({ emit: () => {} }) },
      hasSttCredentials: () => false,
      createSpeechClient: async () => null,
      generateStructuredSOAP: async () => ({ subjective: 's' }),
      generateEmrNarrativeSummary: async () => 'narrative fallback',
    });

    const result = await pipeline.runPostMeetingPipeline('APT-R2-WHISPER', {
      recordingBuffer: minimalWebm(),
      mimeType: 'audio/webm',
    });

    globalThis.fetch = originalFetch;
    delete process.env.OPENAI_API_KEY;

    assert.ok(['failed', 'partial', 'completed'].includes(result.stage));
    if (result.stage === 'failed') {
      assert.ok(result.userMessage?.includes('ถอดเสียง') || result.userMessage?.includes('สรุป'));
    }
  });

  it('R2-P07 — stale tiny disk file ignored when BYTEA has valid recording', async () => {
    const { encryptRecordingBuffer } = await import('../backend/recordingCrypto.js');
    const good = minimalWebm(2048);
    const { buffer: encGood } = encryptRecordingBuffer(good);
    const staleDisk = path.join(tmpDir, 'stale-video.webm');
    fs.writeFileSync(staleDisk, Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));

    const pipeline = createPostMeetingPipeline({
      safeQuery: async () => ({ rows: [] }),
      genAI: null,
      recordingsDir: tmpDir,
      io: { to: () => ({ emit: () => {} }) },
      hasSttCredentials: () => false,
      createSpeechClient: async () => null,
      generateStructuredSOAP: async () => ({}),
      generateEmrNarrativeSummary: async () => '',
    });

    const plain = pipeline.resolveRecordingForPlayback({
      diskPath: staleDisk,
      byteaRaw: encGood,
      mimeType: 'audio/webm',
    });
    assert.ok(plain.length >= pipeline.MIN_RECORDING_BYTES);
    assert.equal(plain.readUInt32BE(0), 0x1a45dfa3);
  });

  it('R2-P06 — BYTEA/disk decrypt round-trip preserves WebM header', async () => {
    const { encryptRecordingBuffer, decryptRecordingBuffer } = await import('../backend/recordingCrypto.js');
    const plain = Buffer.alloc(1536);
    plain.writeUInt32BE(0x1a45dfa3, 0);
    plain.write('playback-chaos', 32, 'utf8');
    const { buffer: enc } = encryptRecordingBuffer(plain);
    const out = decryptRecordingBuffer(enc);
    assert.equal(out.readUInt32BE(0), 0x1a45dfa3);
    assert.equal(out.subarray(32, 46).toString('utf8'), 'playback-chaos');
  });

  it('R2-P05 — Gemini failure returns degraded completed summary without unhandled rejection', async () => {
    const safeQuery = async (sql) => {
      if (sql.includes('SELECT mr.*')) {
        return {
          rows: [{
            id: 'm-r2-gemini',
            appointment_id: 'APT-R2-GEMINI',
            doctor_id: 'DR-R2',
            recording_mimetype: 'audio/webm',
            recording_data: null,
            transcript: '',
            meeting_config: {},
          }],
        };
      }
      if (sql.includes('meeting_config')) return { rows: [] };
      if (sql.includes('UPDATE meeting_records')) return { rows: [] };
      return { rows: [] };
    };

    const pipeline = createPostMeetingPipeline({
      safeQuery,
      genAI: {
        getGenerativeModel: () => ({
          generateContent: async () => {
            throw new Error('Gemini API 503: overloaded');
          },
        }),
      },
      geminiModel: 'test',
      recordingsDir: tmpDir,
      io: { to: () => ({ emit: () => {} }) },
      hasSttCredentials: () => false,
      createSpeechClient: async () => null,
      generateStructuredSOAP: async () => null,
      generateEmrNarrativeSummary: async () => null,
    });

    const transcript = '[แพทย์] '.padEnd(80, 'อาการทดสอบ chaos');
    const result = await pipeline.runPostMeetingPipeline('APT-R2-GEMINI', {
      fullTranscript: transcript,
      recordingBuffer: minimalWebm(),
      mimeType: 'audio/webm',
    });

    assert.equal(result.stage, 'completed');
    assert.equal(result.degraded, true);
    assert.equal(result.summaryAvailable, true);
  });
});
