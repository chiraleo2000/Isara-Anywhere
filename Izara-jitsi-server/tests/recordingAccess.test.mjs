import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertCanAccessMeetingRecording,
  filterRecordingsForUser,
  buildSecureRecordingUrl,
} from '../backend/recordingAccess.js';

describe('recordingAccess', () => {
  const meeting = { doctor_id: 'doc-1', patient_id: 'pat-1' };

  it('allows doctor owner', () => {
    const r = assertCanAccessMeetingRecording({
      user: { role: 'doctor', userId: 'doc-1', doctorId: 'doc-1' },
      meeting,
    });
    assert.equal(r.allowed, true);
  });

  it('denies other doctor', () => {
    const r = assertCanAccessMeetingRecording({
      user: { role: 'doctor', userId: 'doc-2', doctorId: 'doc-2' },
      meeting,
    });
    assert.equal(r.allowed, false);
    assert.equal(r.status, 403);
  });

  it('allows patient participant', () => {
    const r = assertCanAccessMeetingRecording({
      user: { role: 'patient', id: 'pat-1' },
      meeting,
    });
    assert.equal(r.allowed, true);
  });

  it('denies guest direct playback', () => {
    const r = assertCanAccessMeetingRecording({
      user: { role: 'guest', type: 'guest-invite' },
      meeting,
    });
    assert.equal(r.allowed, false);
  });

  it('admin sees all rows', () => {
    const rows = [
      { doctor_id: 'a', patient_id: 'p1' },
      { doctor_id: 'b', patient_id: 'p2' },
    ];
    const filtered = filterRecordingsForUser(rows, { role: 'admin', isAdmin: true });
    assert.equal(filtered.length, 2);
  });

  it('buildSecureRecordingUrl has no gs prefix', () => {
    const url = buildSecureRecordingUrl({
      doctorId: 'd1',
      meetingId: 'm1',
      filename: 'video.webm',
    });
    assert.ok(url.startsWith('/api/recordings/meetings/'));
    assert.ok(!url.includes('gs://'));
  });
});
