/**
 * @process Processes/Pages/Doctor-Portal/07_Virtual_Meeting.md
 * Regression: doctor join from pre_join must layout-first mount without JWT.
 */
import { describe, it, expect } from 'vitest';
import { resolveMountJwt, pickJitsiJwt } from '../../../Isara-doctor-portal/src/utils/jitsiMeetingConfig.ts';

/** Mirrors VirtualMeeting.joinMeeting mount option builder */
function buildDoctorMountOptions(
  joinCfg: { configOverwrite?: Record<string, unknown> } | null,
  domain: string,
  roomName: string,
  displayName: string,
) {
  const jwt = resolveMountJwt();
  return {
    roomName,
    ...(jwt ? { jwt } : {}),
    configOverwrite: joinCfg?.configOverwrite
      ? { prejoinPageEnabled: false, ...joinCfg.configOverwrite }
      : { prejoinPageEnabled: false },
    userInfo: { displayName },
  };
}

describe('virtualMeetingLayoutFirst — doctor mount contract', () => {
  it('VML01 — mount omits jwt field (JWT removed)', () => {
    const opts = buildDoctorMountOptions(
      { configOverwrite: { moderator: true } },
      'meet.jit.si',
      'izara-apt-001',
      'Dr. Demo',
    );
    expect(opts).not.toHaveProperty('jwt');
    expect(opts.userInfo.displayName).toBe('Dr. Demo');
    expect(opts.configOverwrite.prejoinPageEnabled).toBe(false);
  });

  it('VML02 — resolveMountJwt and pickJitsiJwt always undefined', () => {
    expect(resolveMountJwt()).toBeUndefined();
    expect(pickJitsiJwt({ jwt: 'token', domain: 'meet.private.example' })).toBeUndefined();
  });

  it('VML03 — join-config display name preserved in userInfo', () => {
    const opts = buildDoctorMountOptions(null, 'meet.jit.si', 'room', 'Dr. Smith');
    expect(opts.userInfo.displayName).toBe('Dr. Smith');
  });
});
