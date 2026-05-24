/**
 * Round 3 — Disk cleanup, transcript/schema bounds, clinical text guards
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createPostMeetingPipeline } from '../server/postMeetingPipeline.js';
import {
  buildChaoticTranscript2Hours,
  prepareTranscriptForLlm,
  prepareSummaryForDb,
  CLINICAL_TEXT_LIMITS,
} from '../server/clinicalTextLimits.js';
import {
  cleanupEphemeralRecordingAfterPersist,
  cleanupJibriSourceFile,
} from '../server/recordingCleanup.js';

describe('Round 3 — stability', () => {
  let tmpDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'izara-r3-'));
    process.env.JWT_SECRET = 'round3-stability-secret';
    process.env.RECORDING_LOCAL_RETENTION = 'delete_after_persist';
    process.env.NODE_ENV = 'test';
  });

  it('R3-C01 — cleanup removes local video after persist (BYTEA permanent)', () => {
    const recordingsDir = path.join(tmpDir, 'rec');
    const meetingId = 'm-r3-cleanup';
    const videoPath = path.join(recordingsDir, 'meetings', 'DR1', meetingId, 'video.webm');
    fs.mkdirSync(path.dirname(videoPath), { recursive: true });
  fs.writeFileSync(videoPath, Buffer.alloc(2048, 0x1a));

    const paths = {
      dir: path.dirname(videoPath),
      videoPath,
      relativeDir: `meetings/DR1/${meetingId}`,
      videoFilename: 'video.webm',
    };

    const result = cleanupEphemeralRecordingAfterPersist({
      recordingsDir,
      paths,
      legacyMeetingKey: 'APT-LEGACY',
      gcsUri: null,
    });

    assert.equal(result.skipped, false);
    assert.ok(result.removed.length >= 1);
    assert.equal(fs.existsSync(videoPath), false);
  });

  it('R3-C02 — Jibri source file deleted after ingest path', () => {
    const jibriTmp = path.join(tmpDir, 'jibri-drop.mp4');
    const canonical = path.join(tmpDir, 'canonical.mp4');
    fs.writeFileSync(jibriTmp, Buffer.from('jibri'));
    fs.writeFileSync(canonical, Buffer.from('canonical'));
    assert.equal(cleanupJibriSourceFile(jibriTmp, canonical), true);
    assert.equal(fs.existsSync(jibriTmp), false);
    assert.equal(fs.existsSync(canonical), true);
  });

  it('R3-T01 — 2h chaotic transcript clamps for LLM without emptying', () => {
    const chaotic = buildChaoticTranscript2Hours(350_000);
    assert.ok(chaotic.length >= 300_000);
    const llm = prepareTranscriptForLlm(chaotic);
    assert.ok(llm.length >= 50_000);
    assert.ok(llm.length <= CLINICAL_TEXT_LIMITS.MAX_TRANSCRIPT_FOR_LLM + 5000);
    assert.match(llm, /omitted/);
  });

  it('R3-T02 — summary + structured fit Postgres-safe JSONB bounds', () => {
    const chaotic = buildChaoticTranscript2Hours(100_000);
    const hugeSoap = {
      soap: {
        subjective: chaotic,
        objective: chaotic,
        assessment: chaotic,
        plan: chaotic,
      },
      redFlags: Array.from({ length: 200 }, (_, i) => `flag-${i}-${'x'.repeat(500)}`),
    };
    const safe = prepareSummaryForDb(chaotic, hugeSoap);
    assert.ok(safe.narrative.length <= CLINICAL_TEXT_LIMITS.MAX_AI_SUMMARY_TEXT);
    const json = JSON.stringify(safe.structured);
    assert.ok(json.length <= CLINICAL_TEXT_LIMITS.MAX_JSONB_PAYLOAD + 100);
    assert.doesNotThrow(() => JSON.parse(json));
  });

  it('R3-T03 — pipeline stores clamped transcript without throw', async () => {
    const chaotic = buildChaoticTranscript2Hours(80_000);
    const updates = [];
    const safeQuery = async (sql, params) => {
      if (sql.includes('SELECT mr.*')) {
        return {
          rows: [{
            id: 'm-r3-schema',
            appointment_id: 'APT-R3',
            doctor_id: 'DR-R3',
            recording_mimetype: 'audio/webm',
            recording_data: null,
            transcript: '',
            meeting_config: {},
          }],
        };
      }
      if (sql.includes('meeting_transcripts')) return { rows: [] };
      if (sql.includes('UPDATE meeting_records')) {
        updates.push({ sql, params });
        return { rows: [] };
      }
      if (sql.includes('meeting_config')) return { rows: [] };
      return { rows: [] };
    };

    const pipeline = createPostMeetingPipeline({
      safeQuery,
      genAI: null,
      recordingsDir: tmpDir,
      io: { to: () => ({ emit: () => {} }) },
      hasSttCredentials: () => false,
      createSpeechClient: async () => null,
      generateStructuredSOAP: async () => null,
      generateEmrNarrativeSummary: async () => null,
    });

    const buf = Buffer.alloc(2048);
    buf.writeUInt32BE(0x1a45dfa3, 0);

    const result = await pipeline.runPostMeetingPipeline('APT-R3', {
      meeting: {
        id: 'm-r3-schema',
        appointment_id: 'APT-R3',
        doctor_id: 'DR-R3',
        recording_mimetype: 'audio/webm',
      },
      recordingBuffer: buf,
      fullTranscript: chaotic,
      mimeType: 'audio/webm',
    });

    assert.ok(['completed', 'partial', 'failed'].includes(result.stage));
    const txUpdate = updates.find((u) => u.sql.includes('transcript ='));
    assert.ok(txUpdate, 'transcript persisted');
    assert.ok(txUpdate.params[1].length <= CLINICAL_TEXT_LIMITS.MAX_TRANSCRIPT_STORE);
  });
});
