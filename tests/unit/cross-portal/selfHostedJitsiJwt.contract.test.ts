/**
 * @process Processes/VIDEO_MEETING_JITSI_GEMINI.md
 * Self-hosted Jitsi JWT: doctor moderator, patient/guest participant, public SaaS null.
 */
import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { createJitsiRoleJwt } from '@meeting/sessionAuth.js';

const UNIT_TEST_JWT_HS256_STUB = `unit-${'a'.repeat(28)}`;
const DOMAIN = 'meet.localhost';
const ROOM = 'izara-test-room-001';

describe('selfHostedJitsiJwt contract', () => {
  it('SHJ01 — public meet.jit.si returns null even when enabled', () => {
    expect(
      createJitsiRoleJwt({
        enabled: true,
        roomName: ROOM,
        domain: 'meet.jit.si',
        signingSecret: UNIT_TEST_JWT_HS256_STUB,
        role: 'doctor',
      }),
    ).toBeNull();
  });

  it('SHJ02 — disabled token auth returns null', () => {
    expect(
      createJitsiRoleJwt({
        enabled: false,
        roomName: ROOM,
        domain: DOMAIN,
        signingSecret: UNIT_TEST_JWT_HS256_STUB,
        role: 'doctor',
      }),
    ).toBeNull();
  });

  it('SHJ03 — doctor JWT has moderator context on private domain', () => {
    const token = createJitsiRoleJwt({
      enabled: true,
      roomName: ROOM,
      domain: DOMAIN,
      signingSecret: UNIT_TEST_JWT_HS256_STUB,
      issuer: 'izara-telemedicine',
      role: 'doctor',
      user: { id: 'DOC-1', name: 'Dr Test', email: 'doc@test.com' },
    });
    if (!token) throw new Error('expected token');
    const payload = jwt.verify(token, UNIT_TEST_JWT_HS256_STUB);
    if (typeof payload === 'string') throw new Error('unexpected JWT payload type');
    expect(payload.aud).toBe('jitsi');
    expect(payload.sub).toBe(DOMAIN);
    expect(payload.room).toBe(ROOM);
    // Current createJitsiRoleJwt only sets context.user.moderator (no affiliation field).
    const ctx = payload.context as { user: { moderator: boolean; affiliation?: string } };
    expect(ctx.user.moderator).toBe(true);
    expect(ctx.user.affiliation).toBeUndefined();
  });

  it('SHJ04 — patient JWT is not moderator', () => {
    const token = createJitsiRoleJwt({
      enabled: true,
      roomName: ROOM,
      domain: DOMAIN,
      signingSecret: UNIT_TEST_JWT_HS256_STUB,
      role: 'patient',
      user: { id: 'PAT-1', name: 'Patient' },
    });
    if (!token) throw new Error('expected token');
    const payload = jwt.verify(token, UNIT_TEST_JWT_HS256_STUB);
    if (typeof payload === 'string') throw new Error('unexpected JWT payload type');
    const ctx = payload.context as { user: { moderator: boolean; affiliation?: string } };
    expect(ctx.user.moderator).toBe(false);
    expect(ctx.user.affiliation).toBeUndefined();
  });

  it('SHJ05 — guest JWT is not moderator', () => {
    const token = createJitsiRoleJwt({
      enabled: true,
      roomName: ROOM,
      domain: DOMAIN,
      signingSecret: UNIT_TEST_JWT_HS256_STUB,
      role: 'guest',
      user: { name: 'Guest' },
    });
    if (!token) throw new Error('expected token');
    const payload = jwt.verify(token, UNIT_TEST_JWT_HS256_STUB);
    if (typeof payload === 'string') throw new Error('unexpected JWT payload type');
    const ctx = payload.context as { user: { moderator: boolean } };
    expect(ctx.user.moderator).toBe(false);
  });
});
