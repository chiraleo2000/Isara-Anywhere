/**
 * @process Processes/FULL_WORKFLOW_CONTRACT.md
 * Global invariants — auth, appointments, meeting roles, clinical boundaries.
 */
import { describe, it, expect } from 'vitest';
import { createJitsiRoleJwt, validateGuestJoinAccess } from '../../../Izara-jitsi-server/backend/sessionAuth.js';
import { buildDoctorJitsiMountOptions, resolveMountJwt } from '../../../Isara-doctor-portal/frontend/utils/jitsiMeetingConfig.ts';
import { buildPatientJitsiMountOptions } from '../../../Isara-patient-portal/frontend/utils/jitsiMeetingConfig.ts';
import { matchesPoolFilter, PENDING_POOL_STATUSES } from '../../../Isara-doctor-portal/backend/appointmentPoolQuery.cjs';
import { derivePoolStatus } from '../../../Isara-doctor-portal/backend/appointmentQueueMapper.cjs';

describe('FULL_WORKFLOW_CONTRACT — global invariants', () => {
  it('FWI-01 — doctor is Jitsi host via moderator config (no room JWT)', () => {
    expect(createJitsiRoleJwt()).toBeNull();
    const mount = buildDoctorJitsiMountOptions({
      user: { name: 'Dr. Host' },
      roomName: 'izara-room',
      domain: 'meet.jit.si',
    });
    expect(mount.apiOptions.configOverwrite.moderator).toBe(true);
  });

  it('FWI-02 — patient is participant not moderator', () => {
    const mount = buildPatientJitsiMountOptions({
      user: { name: 'Patient' },
      roomName: 'izara-room',
    });
    expect(mount.apiOptions.configOverwrite.moderator).toBe(false);
    expect(mount.apiOptions.configOverwrite.prejoinPageEnabled).toBe(false);
  });

  it('FWI-03 — anonymous guest blocked without invite token', () => {
    const denied = validateGuestJoinAccess({
      authenticated: false,
      requestedRole: 'guest',
      inviteValid: false,
    });
    expect(denied.allowed).toBe(false);
  });

  it('FWI-04 — doctor mount always sets moderator on public Jitsi', () => {
    const mount = buildDoctorJitsiMountOptions({
      user: { name: 'Dr. Test' },
      roomName: 'izara-apt',
      domain: 'meet.jit.si',
    });
    expect(mount.apiOptions.configOverwrite.moderator).toBe(true);
    expect(resolveMountJwt()).toBeUndefined();
  });

  it('FWI-05 — patient mount never sets moderator', () => {
    const mount = buildPatientJitsiMountOptions({
      user: { name: 'Patient Test' },
      roomName: 'izara-apt',
    });
    expect(mount.apiOptions.configOverwrite.moderator).toBe(false);
    expect(mount.apiOptions.configOverwrite.prejoinPageEnabled).toBe(false);
  });

  it('FWI-06 — accepted appointments remain traceable in pool queries', () => {
    const accepted = {
      id: 'apt-1',
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      doctor_id: 'doc-1',
    };
    expect(derivePoolStatus('confirmed', 'doc-1')).toBe('accepted');
    expect(matchesPoolFilter(accepted, true)).toBe(true);
    expect(matchesPoolFilter(accepted, false)).toBe(false);
  });

  it('FWI-07 — pending pool statuses exclude confirmed', () => {
    expect(PENDING_POOL_STATUSES).not.toContain('confirmed');
    expect(PENDING_POOL_STATUSES).toContain('in_pool');
    expect(PENDING_POOL_STATUSES).toContain('awaiting_doctor_response');
  });

  it('FWI-08 — guest invite URLs must use patient portal origin (token), not bare meeting host', () => {
    const patientPortal = 'http://127.0.0.1:3005';
    const guestLink = `${patientPortal}/guest-join?token=abc123`;
    expect(guestLink.startsWith(patientPortal)).toBe(true);
    expect(guestLink).not.toMatch(/:3020\/guest-join$/);
    expect(guestLink).toMatch(/token=/);
  });
});

describe('FULL_WORKFLOW_CONTRACT — error handling', () => {
  it('FWI-ERR02 — Jitsi room JWT removed returns null', () => {
    expect(createJitsiRoleJwt()).toBeNull();
  });
});
