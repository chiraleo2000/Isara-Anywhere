/**
 * Jibri webhook — validation contract + pipeline ingest integration
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { validateJibriWebhookRequest } from '../server/jibriWebhook.js';
import { createPostMeetingPipeline } from '../server/postMeetingPipeline.js';

describe('Jibri webhook integration', () => {
  const secret = 'test-jibri-webhook-secret';

  it('WH-01 — rejects invalid webhook secret when configured', () => {
    const result = validateJibriWebhookRequest(
      { meetingId: 'm1', videoBase64: 'abc' },
      { expectedSecret: secret, providedSecret: 'wrong' },
    );
    assert.equal(result.ok, false);
    assert.equal(result.status, 401);
    assert.match(result.error, /secret/i);
  });

  it('WH-02 — rejects missing meetingId or payload', () => {
    const noId = validateJibriWebhookRequest({}, { expectedSecret: secret, providedSecret: secret });
    assert.equal(noId.status, 400);
    const noPayload = validateJibriWebhookRequest(
      { meetingId: 'm1' },
      { expectedSecret: secret, providedSecret: secret },
    );
    assert.equal(noPayload.status, 400);
  });

  it('WH-03 — accepts valid secret + videoBase64 body', () => {
    const ok = validateJibriWebhookRequest(
      { meetingId: 'm1', videoBase64: Buffer.from('webm').toString('base64'), mimeType: 'video/webm' },
      { expectedSecret: secret, providedSecret: secret },
    );
    assert.equal(ok.ok, true);
    assert.equal(ok.status, 200);
  });

  it('WH-04 — allows open webhook when JIBRI_WEBHOOK_SECRET unset', () => {
    const ok = validateJibriWebhookRequest({ meetingId: 'm1', localFilePath: '/tmp/x.mp4' });
    assert.equal(ok.ok, true);
  });

  it('WH-05 — pipeline ingest stores meetings/{doctorId}/{meetingId}/video path', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'izara-wh-'));
    process.env.JWT_SECRET = 'jibri-webhook-test-secret';
    process.env.RECORDING_LOCAL_RETENTION = 'delete_after_persist';
      const meetingId = 'apt-wh-001';
      const doctorId = 'DOC-WH';
      const updates = [];
      const safeQuery = async (sql, params) => {
        if (sql.includes('SELECT mr.*')) {
          return {
            rows: [{
              id: meetingId,
              appointment_id: meetingId,
              doctor_id: doctorId,
              recording_mimetype: null,
              recording_data: null,
              transcript: '',
              meeting_config: {},
            }],
          };
        }
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
      const stored = await pipeline.ingestJibriRecording({
        meetingId,
        doctorId,
        videoBase64: buf.toString('base64'),
        mimeType: 'video/webm',
      });

      assert.ok(stored.recordingUrl.includes(`/meetings/${doctorId}/${meetingId}/`));
      assert.ok(updates.length >= 1);
  });
});
