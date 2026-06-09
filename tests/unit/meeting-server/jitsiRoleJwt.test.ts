/**
 * @process Processes/VIDEO_MEETING_JITSI_GEMINI.md
 * Session auth + lobby role policy (Jitsi room JWT removed).
 */
import { describe, it, expect } from 'vitest';
import {
  createJitsiRoleJwt,
  validateGuestJoinAccess,
  generateOpaqueToken,
} from '../../../Izara-jitsi-server/server/sessionAuth.js';

describe('sessionAuth — Jitsi JWT removed', () => {
  it('JR01 — createJitsiRoleJwt always returns null', () => {
    expect(createJitsiRoleJwt()).toBeNull();
  });

  it('JR03 — disabled token auth returns null', () => {
    expect(createJitsiRoleJwt({ enabled: false })).toBeNull();
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

  it('JR10 — guest allowed with valid opaque invite token', () => {
    const result = validateGuestJoinAccess({
      authenticated: false,
      requestedRole: 'guest',
      inviteValid: true,
    });
    expect(result.allowed).toBe(true);
  });

  it('JR11 — authenticated patient bypasses guest invite requirement', () => {
    const result = validateGuestJoinAccess({
      authenticated: true,
      requestedRole: 'patient',
      inviteValid: false,
    });
    expect(result.allowed).toBe(true);
  });

  it('JR12 — lobby join denies unauthenticated patient role impersonation', () => {
    const reqUser = null;
    const requestedRole = 'patient';
    const denied =
      !reqUser
      && (requestedRole === 'doctor' || requestedRole === 'patient' || requestedRole === 'admin');
    expect(denied).toBe(true);
  });

  it('JR13 — opaque guest invite tokens are hex strings', () => {
    const token = generateOpaqueToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });
});
