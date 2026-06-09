import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createJitsiRoleJwt,
  validateGuestJoinAccess,
  generateOpaqueToken,
} from '../server/sessionAuth.js';

describe('sessionAuth', () => {
  it('createJitsiRoleJwt returns null (JWT removed)', () => {
    assert.equal(createJitsiRoleJwt(), null);
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
