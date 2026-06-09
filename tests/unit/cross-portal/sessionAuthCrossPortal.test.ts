/**
 * @process Processes/VIDEO_MEETING_JITSI_GEMINI.md
 * Cross-portal session auth contract — JWT removed, opaque PG session tokens only.
 */
import { describe, it, expect } from 'vitest';
import { resolveMountJwt as doctorResolveMountJwt } from '../../../Isara-doctor-portal/src/utils/jitsiMeetingConfig.ts';
import { resolveMountJwt as patientResolveMountJwt } from '../../../Isara-patient-portal/src/utils/jitsiMeetingConfig.ts';
import { createJitsiRoleJwt } from '../../../Izara-jitsi-server/server/sessionAuth.js';
import { generateOpaqueToken } from '../../../Isara-doctor-portal/server/sessionAuth.cjs';

function isOpaqueSessionToken(token: string): boolean {
  return /^[a-f0-9]{64}$/i.test(token);
}

describe('sessionAuthCrossPortal', () => {
  it('SAC01 — doctor and patient Jitsi mount never embed JWT', () => {
    expect(doctorResolveMountJwt()).toBeUndefined();
    expect(patientResolveMountJwt()).toBeUndefined();
  });

  it('SAC02 — meeting server createJitsiRoleJwt returns null', () => {
    expect(createJitsiRoleJwt()).toBeNull();
  });

  it('SAC03 — shared generateOpaqueToken produces 64-char hex', () => {
    const token = generateOpaqueToken();
    expect(isOpaqueSessionToken(token)).toBe(true);
  });

  it('SAC04 — rejects JWT-shaped strings as session tokens', () => {
    expect(isOpaqueSessionToken('eyJhbGciOiJIUzI1NiJ9.payload.sig')).toBe(false);
  });
});
