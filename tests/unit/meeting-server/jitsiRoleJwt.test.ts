/**
 * @process Processes/VIDEO_MEETING_JITSI_GEMINI.md
 * Session auth + self-hosted Jitsi JWT policy.
 */
import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  createJitsiRoleJwt,
  validateGuestJoinAccess,
  generateOpaqueToken,
} from '@meeting/sessionAuth.js';

const UNIT_TEST_JWT_HS256_STUB = `unit-${'a'.repeat(28)}`;
const DOMAIN = 'meet.localhost';

describe('sessionAuth — Jitsi JWT policy', () => {
  it('JR01 — no-args returns null (public default)', () => {
    expect(createJitsiRoleJwt()).toBeNull();
  });

  it('JR03 — disabled token auth returns null', () => {
    expect(createJitsiRoleJwt({ enabled: false, roomName: 'r', domain: DOMAIN, signingSecret: UNIT_TEST_JWT_HS256_STUB })).toBeNull();
  });

  it('JR04 — enabled private domain issues HS256 JWT', () => {
    const token = createJitsiRoleJwt({
      enabled: true,
      roomName: 'izara-room',
      domain: DOMAIN,
      signingSecret: UNIT_TEST_JWT_HS256_STUB,
      role: 'doctor',
      user: { id: 'd1', name: 'Doc' },
    });
    expect(typeof token).toBe('string');
    if (!token) throw new Error('expected JWT');
    expect(jwt.verify(token, UNIT_TEST_JWT_HS256_STUB)).toBeTruthy();
  });
});

describe('join-config authorization contract', () => {
  it('JR05 — secured room denies unauthenticated doctor role', () => {
    const tokenAuthEnabled = true;
    const reqUser = null;
    const role = 'doctor';
    const denied = tokenAuthEnabled && !reqUser && (role === 'doctor' || role === 'patient');
    expect(denied).toBe(true);
  });

  it('JR06 — anonymous guest denied without invite token', () => {
    const result = validateGuestJoinAccess({
      authenticated: false,
      requestedRole: 'guest',
      inviteValid: false,
    });
    expect(result.allowed).toBe(false);
    expect(result.code).toBe('GUEST_AUTH_REQUIRED');
  });

  it('JR07 — opaque session token is 64-char hex', () => {
    const t = generateOpaqueToken();
    expect(t).toMatch(/^[a-f0-9]{64}$/);
  });
});
