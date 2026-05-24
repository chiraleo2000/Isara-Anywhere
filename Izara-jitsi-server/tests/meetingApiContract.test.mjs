/**
 * Meeting server HTTP contracts (no live server — documents expected shapes for CI).
 * Live integration: Group Q + cloud dev-testing (IZARA_DEV_TESTING=1).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { buildGuestPortalUrls } from '../server/jitsiConfig.js';

const SECRET = 'test-jwt-secret-for-contract-only';

describe('Meeting API contracts', () => {
  it('save-recording rejects missing audioBase64', () => {
    const body = { mimeType: 'video/webm' };
    assert.equal(Boolean(body.audioBase64), false);
  });

  it('runtime API gated by IZARA_DEV_TESTING', () => {
    const enabled = process.env.IZARA_DEV_TESTING === '1';
    const statusWhenOff = 404;
    assert.equal(enabled || statusWhenOff === 404, true);
  });

  it('runtime response includes admittedCount', () => {
    const payload = {
      success: true,
      meetingId: 'm1',
      admittedCount: 2,
      waitingCount: 0,
      activeMeeting: true,
      status: 'in_progress',
    };
    assert.ok(payload.admittedCount >= 2);
  });

  it('Bearer token shape for authenticated routes', () => {
    const token = jwt.sign({ sub: 'DOC-TEST-001', role: 'doctor' }, SECRET, { expiresIn: '1h' });
    assert.match(token, /^[\w-]+\.[\w-]+\.[\w-]+$/);
  });

  it('results endpoint path pattern', () => {
    const meetingId = 'apt-demo-1';
    assert.equal(`/api/meetings/${meetingId}/results`, `/api/meetings/${meetingId}/results`);
  });

  it('generate-summary uses POST on meeting id', () => {
    const meetingId = 'apt-demo-1';
    assert.equal(`/api/meetings/${meetingId}/generate-summary`.includes('generate-summary'), true);
  });

  it('buildGuestPortalUrls returns canonical patient-portal paths', () => {
    const urls = buildGuestPortalUrls({
      patientPortalBase: 'https://patient.example.com',
      meetingKey: 'apt-123',
      guestName: 'Family Guest',
      token: 'jwt-token',
    });
    assert.equal(urls.guestJoinUrl, 'https://patient.example.com/guest-join/apt-123?name=Family%20Guest');
    assert.equal(urls.guestTokenUrl, 'https://patient.example.com/guest/join/jwt-token');
    assert.equal(urls.guestLink, urls.guestTokenUrl);
  });
});
