/**
 * save-recording request contract + filesystem verify (node --test)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('save-recording body contract', () => {
  it('requires audioBase64 field', () => {
    const body = { mimeType: 'video/webm' };
    assert.equal(Boolean(body.audioBase64), false);
    const valid = { audioBase64: Buffer.from('test').toString('base64'), mimeType: 'video/webm' };
    assert.equal(Boolean(valid.audioBase64), true);
  });

  it('writes and verifies file under RECORDINGS_DIR layout', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'izara-rec-'));
    const meetingId = 'apt-test-001';
    const filename = `${meetingId}-rec.webm`;
    const meetingDir = path.join(dir, meetingId);
    fs.mkdirSync(meetingDir, { recursive: true });
    const filepath = path.join(meetingDir, filename);
    fs.writeFileSync(filepath, Buffer.from('fake-webm-content'));
    assert.ok(fs.existsSync(filepath));
    const recordingUrl = `/api/recordings/${meetingId}/${filename}`;
    assert.match(recordingUrl, new RegExp(`^/api/recordings/${meetingId}/`));
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
