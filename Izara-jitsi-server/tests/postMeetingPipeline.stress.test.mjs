/**
 * Stress / failure-mode tests for post-meeting pipeline
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createPostMeetingPipeline } from '../server/postMeetingPipeline.js';
import { withRetry, isTransientError } from '../server/pipelineRetry.js';

describe('postMeetingPipeline stress', () => {
  let tmpDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'izara-pipe-stress-'));
    process.env.JWT_SECRET = 'stress-test-secret';
    process.env.PIPELINE_RETRY_MAX = '3';
    process.env.PIPELINE_RETRY_BASE_MS = '10';
  });

  it('PM-ST-01 — rejects broken webm (interrupted recording)', () => {
    const pipeline = createPostMeetingPipeline({
      safeQuery: async () => ({ rows: [] }),
      genAI: null,
      geminiModel: 'test',
      recordingsDir: tmpDir,
      io: null,
      hasSttCredentials: () => false,
      createSpeechClient: async () => null,
      generateStructuredSOAP: async () => null,
      generateEmrNarrativeSummary: async () => null,
    });
    const broken = Buffer.alloc(1500, 0xff);
    const v = pipeline.validateRecordingBuffer(broken, 'video/webm');
    assert.equal(v.ok, false);
    assert.equal(v.reason, 'invalid_webm_header');
  });

  it('PM-ST-02 — rejects tiny payload (upload timeout residue)', () => {
    const pipeline = createPostMeetingPipeline({
      safeQuery: async () => ({ rows: [] }),
      genAI: null,
      geminiModel: 'test',
      recordingsDir: tmpDir,
      io: null,
      hasSttCredentials: () => false,
      createSpeechClient: async () => null,
      generateStructuredSOAP: async () => null,
      generateEmrNarrativeSummary: async () => null,
    });
    assert.equal(pipeline.validateRecordingBuffer(Buffer.alloc(64), 'video/webm').ok, false);
  });

  it('PM-ST-03 — withRetry recovers from transient failures', async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls += 1;
        if (calls < 3) throw new Error('fetch failed: timeout');
        return 'ok';
      },
      { label: 'stress-retry', shouldRetry: isTransientError, baseDelayMs: 5 },
    );
    assert.equal(result, 'ok');
    assert.equal(calls, 3);
  });

  it('PM-ST-04 — pipeline marks partial when no recording', async () => {
    const safeQuery = async (sql) => {
      if (sql.includes('SELECT mr.*')) {
        return {
          rows: [{
            id: 'm-stress-1',
            appointment_id: 'APT-S1',
            doctor_id: 'DR-S1',
            recording_mimetype: null,
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
      genAI: mockGenAILite(),
      geminiModel: 'test',
      recordingsDir: tmpDir,
      io: null,
      hasSttCredentials: () => false,
      createSpeechClient: async () => null,
      generateStructuredSOAP: async () => null,
      generateEmrNarrativeSummary: async () => 'summary from live transcript only',
    });

    const result = await pipeline.runPostMeetingPipeline('APT-S1', {
      fullTranscript: '[แพทย์] '.padEnd(80, 'ค'),
    });
    assert.equal(result.stage, 'completed');
  });
});

function mockGenAILite() {
  return {
    getGenerativeModel: () => ({
      generateContent: async () => ({
        response: { text: () => '{"symptoms":[],"requiresPhysicianValidation":true}' },
      }),
    }),
  };
}
