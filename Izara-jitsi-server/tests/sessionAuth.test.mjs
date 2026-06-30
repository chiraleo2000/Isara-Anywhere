import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createJitsiRoleJwt,
  validateGuestJoinAccess,
  generateOpaqueToken,
} from '../backend/sessionAuth.js';

describe('sessionAuth', () => {
  it('createJitsiRoleJwt returns null without options (public default)', () => {
    assert.equal(createJitsiRoleJwt(), null);
  });

  it('createJitsiRoleJwt issues JWT on private domain when enabled', () => {
    const token = createJitsiRoleJwt({
      enabled: true,
      roomName: 'test-room',
      domain: 'meet.localhost',
      signingSecret: 'test-secret-min-32-characters-long',
      role: 'doctor',
      user: { id: 'd1', name: 'Doctor' },
    });
    assert.ok(typeof token === 'string' && token.length > 20);
  });

  it('generateOpaqueToken produces 64-char hex', () => {
    const token = generateOpaqueToken();
    assert.match(token, /^[a-f0-9]{64}$/);
  });

  it('guest join requires invite when anonymous', () => {
    const result = validateGuestJoinAccess({
      authenticated: false,
      requestedRole: 'guest',
      inviteValid: false,
    });
    assert.equal(result.allowed, false);
    assert.equal(result.code, 'GUEST_AUTH_REQUIRED');
  });

  it('authenticated patient bypasses guest invite', () => {
    const result = validateGuestJoinAccess({
      authenticated: true,
      requestedRole: 'patient',
      inviteValid: false,
    });
    assert.equal(result.allowed, true);
  });
});
