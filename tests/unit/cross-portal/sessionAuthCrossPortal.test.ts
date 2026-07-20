/**
 * @process Processes/VIDEO_MEETING_JITSI_GEMINI.md
 * Cross-portal session auth contract — JWT removed, opaque PG session tokens only.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { resolveMountJwt as doctorResolveMountJwt } from '../../../../issara-doctor/frontend/utils/jitsiMeetingConfig.ts';
import { resolveMountJwt as patientResolveMountJwt } from '../../../../issara-patient/frontend/utils/jitsiMeetingConfig.ts';
import { createJitsiRoleJwt } from '../../../../issara-jitsi/backend/sessionAuth.js';
import { generateOpaqueToken } from '../../../../issara-doctor/backend/sessionAuth.cjs';

const anywhereRoot = path.resolve(__dirname, '../../../..');

function isOpaqueSessionToken(token: string): boolean {
  return /^[a-f0-9]{64}$/i.test(token);
}

/** Mirrors doctor meetings BFF resolveSessionTokenFromRequest (Bearer / sessionToken). */
function resolveSessionTokenFromRequest(req: {
  sessionToken?: string;
  headers: { authorization?: string; cookie?: string };
}): string {
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  return req.sessionToken || bearer;
}

describe('sessionAuthCrossPortal', () => {
  it('SAC01 — mount JWT only on self-hosted domain via join-config', () => {
    expect(doctorResolveMountJwt()).toBeUndefined();
    expect(patientResolveMountJwt()).toBeUndefined();
    const privateJwt = 'a'.repeat(48);
    expect(
      doctorResolveMountJwt({
        domain: 'meet.localhost',
        tokenAuthEnabled: true,
        jwt: privateJwt,
      }),
    ).toBe(privateJwt);
    expect(
      doctorResolveMountJwt({ domain: 'meet.jit.si', jwt: privateJwt }),
    ).toBeUndefined();
  });

  it('SAC02 — meeting server createJitsiRoleJwt null without options', () => {
    expect(createJitsiRoleJwt()).toBeNull();
  });

  it('SAC03 — shared generateOpaqueToken produces 64-char hex', () => {
    const token = generateOpaqueToken();
    expect(isOpaqueSessionToken(token)).toBe(true);
  });

  it('SAC04 — rejects JWT-shaped strings as session tokens', () => {
    expect(isOpaqueSessionToken('eyJhbGciOiJIUzI1NiJ9.payload.sig')).toBe(false);
  });

  it('SAC05 — patient lobby join uses credentials include for cookie auth', () => {
    const src = fs.readFileSync(
      path.join(anywhereRoot, 'issara-patient/frontend/pages/PatientMeetingRoom.tsx'),
      'utf8',
    );
    expect(src).toMatch(/patientMeetingUrl|resolveMeetingServerUrl/);
    expect(src).toMatch(/\/join|lobby\/join/);
    expect(src).toMatch(/credentials:\s*'include'/);
  });

  it('SAC06 — resolveSessionTokenFromRequest prefers sessionToken then Bearer', () => {
    const meetings = fs.readFileSync(
      path.join(anywhereRoot, 'issara-doctor/backend/routes/meetings.cjs'),
      'utf8',
    );
    expect(meetings).toMatch(/function resolveSessionTokenFromRequest/);
    expect(meetings).toMatch(/req\.sessionToken \|\| bearer/);

    const opaque = 'a'.repeat(64);
    expect(
      resolveSessionTokenFromRequest({
        headers: { authorization: `Bearer ${opaque}` },
      }),
    ).toBe(opaque);
    expect(
      resolveSessionTokenFromRequest({
        sessionToken: opaque,
        headers: { authorization: 'Bearer other' },
      }),
    ).toBe(opaque);
  });

  it('SAC07 — doctor authServices schedules refresh via SESSION_EXPIRY + trySilentRefresh', () => {
    const src = fs.readFileSync(
      path.join(anywhereRoot, 'issara-doctor/frontend/services/authServices.ts'),
      'utf8',
    );
    expect(src).toMatch(/SESSION_EXPIRY/);
    expect(src).toMatch(/trySilentRefresh/);
  });
});
