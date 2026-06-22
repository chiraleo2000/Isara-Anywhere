/**
 * Post-meeting pipeline unit tests (paths, validation, job status)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createPostMeetingPipeline, sanitizePathSegment } from '../backend/services/postMeetingPipeline.js';

describe('postMeetingPipeline paths', () => {
  it('sanitizePathSegment strips unsafe characters', () => {
    const cleaned = sanitizePathSegment('doc/../evil');
    assert.ok(!cleaned.includes('/') && !cleaned.includes('\\'));
    assert.match(cleaned, /doc.*evil/);
  });

  it('buildRecordingPaths uses meetings/{doctorId}/{meetingId}/video.ext', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'izara-pipe-'));
    const pipeline = createPostMeetingPipeline({
      safeQuery: async () => ({ rows: [] }),
      genAI: null,
      geminiModel: 'test',
      recordingsDir: dir,
      io: null,
      hasSttCredentials: () => false,
      createSpeechClient: async () => null,
      generateStructuredSOAP: async () => null,
      generateEmrNarrativeSummary: async () => null,
    });

    const paths = pipeline.buildRecordingPaths('DR-001', 'm-uuid-1', 'mp4');
    assert.ok(paths.relativeDir.replaceAll('\\', '/').endsWith('meetings/DR-001/m-uuid-1'));
    assert.equal(paths.videoFilename, 'video.mp4');
    assert.match(paths.recordingUrl, /\/api\/recordings\/meetings\/DR-001\/m-uuid-1\/video\.mp4$/);

    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('postMeetingPipeline validation', () => {
  it('rejects empty or tiny buffers', () => {
    const pipeline = createPostMeetingPipeline({
      safeQuery: async () => ({ rows: [] }),
      genAI: null,
      geminiModel: 'test',
      recordingsDir: os.tmpdir(),
      io: null,
      hasSttCredentials: () => false,
      createSpeechClient: async () => null,
      generateStructuredSOAP: async () => null,
      generateEmrNarrativeSummary: async () => null,
    });
    assert.equal(pipeline.validateRecordingBuffer(Buffer.alloc(10), 'video/webm').ok, false);
  });

  it('accepts minimal valid webm header', () => {
    const pipeline = createPostMeetingPipeline({
      safeQuery: async () => ({ rows: [] }),
      genAI: null,
      geminiModel: 'test',
      recordingsDir: os.tmpdir(),
      io: null,
      hasSttCredentials: () => false,
      createSpeechClient: async () => null,
      generateStructuredSOAP: async () => null,
      generateEmrNarrativeSummary: async () => null,
    });
    const buf = Buffer.alloc(2048);
    buf.writeUInt32BE(0x1a45dfa3, 0);
    assert.equal(pipeline.validateRecordingBuffer(buf, 'video/webm').ok, true);
  });
});

describe('postMeetingPipeline status', () => {
  it('tracks in-memory pipeline stage', () => {
    const pipeline = createPostMeetingPipeline({
      safeQuery: async () => ({ rows: [] }),
      genAI: null,
      geminiModel: 'test',
      recordingsDir: os.tmpdir(),
      io: null,
      hasSttCredentials: () => false,
      createSpeechClient: async () => null,
      generateStructuredSOAP: async () => null,
      generateEmrNarrativeSummary: async () => null,
    });
    pipeline.getPipelineStatus('apt-1');
    assert.equal(pipeline.getPipelineStatus('apt-1').stage, 'pending');
  });
});
