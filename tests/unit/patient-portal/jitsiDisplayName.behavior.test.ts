/**

 * @process Processes/VIDEO_MEETING_JITSI_GEMINI.md

 * Patient Jitsi display name — auth → External API payload (no pre-join prompt).

 */

import { describe, it, expect } from 'vitest';

import { getIzaraDisplayName } from '../../../../issara-patient/frontend/utils/jitsiDisplayName.ts';

import {

  buildPatientJitsiMountOptions,

  getJitsiExternalApiOptions,

  resolvePatientMeetingDisplayName,

} from '../../../../issara-patient/frontend/utils/jitsiMeetingConfig.ts';

import { generateIzaraRoomName } from '../../../../issara-doctor/frontend/utils/jitsiMeetingConfig.ts';



/** Mock authenticated Izara Anywhere patient profile (AuthContext user shape). */

function mockAuthUser(overrides: Record<string, unknown> = {}) {

  return {

    id: 'pat-uuid-001',

    name: 'สมชาย ใจดี',

    email: 'somchai@example.com',

    ...overrides,

  };

}



describe('jitsiDisplayName — patient auth mapping', () => {

  it('JD01 — auth user name maps to displayName', () => {

    const name = getIzaraDisplayName({ name: 'Sample Name' }, 'Patient');

    expect(name).toBe('Sample Name');

    const opts = getJitsiExternalApiOptions('patient', name);

    expect(opts.configOverwrite.prejoinPageEnabled).toBe(false);

  });



  it('JD02 — init options include userInfo.displayName from calculated name', () => {

    const displayName = getIzaraDisplayName({ displayName: 'Sample Name' }, 'Patient');

    const opts = getJitsiExternalApiOptions('patient', displayName);

    expect(opts.interfaceConfigOverwrite.DEFAULT_LOCAL_DISPLAY_NAME).toBe('Sample Name');

    expect(opts.configOverwrite.prejoinPageEnabled).toBe(false);

    expect(opts.configOverwrite.requireDisplayName).toBe(false);

  });



  it('JD03 — null name falls back to Patient without throwing', () => {

    expect(getIzaraDisplayName(null, 'Patient')).toBe('Patient');

    expect(getIzaraDisplayName({}, 'Patient')).toBe('Patient');

    const opts = getJitsiExternalApiOptions('patient', 'Patient');

    expect(opts.configOverwrite.prejoinPageEnabled).toBe(false);

  });



  it('JD04 — email local-part used when name missing', () => {

    expect(getIzaraDisplayName({ email: 'patient.demo@example.com' }, 'Patient')).toBe('patient.demo');

  });



  it('JD07 — nameThai used when primary name absent', () => {

    expect(getIzaraDisplayName({ nameThai: 'สมหญิง รักษ์ดี' }, 'Patient')).toBe('สมหญิง รักษ์ดี');

  });

});



describe('buildPatientJitsiMountOptions — auth → Jitsi payload', () => {

  it('JD08 — authenticated user name flows to userInfo.displayName', () => {

    const user = mockAuthUser();

    const mount = buildPatientJitsiMountOptions({

      user,

      roomName: 'izara-apt-001-meeting',

      micOn: true,

      cameraOn: true,

    });

    expect(mount.displayName).toBe('สมชาย ใจดี');

    expect(mount.apiOptions.userInfo.displayName).toBe('สมชาย ใจดี');

    expect(mount.apiOptions.userInfo.email).toBe('somchai@example.com');

  });



  it('JD09 — prejoin disabled even when join-config tries to enable it', () => {

    const mount = buildPatientJitsiMountOptions({

      user: mockAuthUser(),

      roomName: 'izara-apt-001-meeting',

      joinCfg: {

        configOverwrite: { prejoinPageEnabled: true, requireDisplayName: true },

      },

    });

    expect(mount.apiOptions.configOverwrite.prejoinPageEnabled).toBe(false);

    expect(mount.apiOptions.configOverwrite.requireDisplayName).toBe(false);

  });



  it('JD10 — auth loading failure falls back to Patient', () => {

    const mount = buildPatientJitsiMountOptions({

      user: null,

      roomName: 'izara-apt-001-meeting',

    });

    expect(mount.displayName).toBe('Patient');

    expect(mount.apiOptions.userInfo.displayName).toBe('Patient');

    expect(mount.apiOptions.userInfo.email).toBeUndefined();

  });



  it('JD11 — no auth tokens in public Jitsi config object', () => {

    const fakeJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzZWNyZXQifQ.fake';

    const mount = buildPatientJitsiMountOptions({

      user: mockAuthUser(),

      roomName: 'izara-apt-001-meeting',

      joinCfg: { jwt: fakeJwt, domain: 'meet.jit.si', tokenAuthEnabled: true },

    });

    const serialized = JSON.stringify(mount.apiOptions);

    expect(serialized).not.toMatch(/eyJhbGci|Bearer|auth_token|JWT_SECRET/i);

    expect(mount.jwt).toBeUndefined();

  });



  it('JD12 — resolvePatientMeetingDisplayName prefers server identity over auth', () => {

    expect(

      resolvePatientMeetingDisplayName({

        user: mockAuthUser(),

        resolvedName: 'Server Verified Name',

      }),

    ).toBe('Server Verified Name');

  });



  it('JD13 — mic/camera toggles reflected in configOverwrite', () => {

    const muted = buildPatientJitsiMountOptions({

      user: mockAuthUser(),

      roomName: 'room',

      micOn: false,

      cameraOn: false,

    });

    expect(muted.apiOptions.configOverwrite.startWithAudioMuted).toBe(true);

    expect(muted.apiOptions.configOverwrite.startWithVideoMuted).toBe(true);

  });

});



describe('jitsi wrapper init contract', () => {

  it('JD05 — wrapper passes calculated displayName properties only (no secrets)', () => {

    const opts = getJitsiExternalApiOptions('patient', 'Demo Patient');

    const serialized = JSON.stringify(opts);

    expect(serialized).not.toMatch(/JWT_SECRET|DATABASE_URL|AIza/i);

    expect(opts.configOverwrite.prejoinPageEnabled).toBe(false);

  });



  it('JD06 — unified room names use izara- prefix for meeting-server alignment', () => {

    const room = generateIzaraRoomName('appointment-abc-123');

    expect(room).toMatch(/^izara-appointment-/);

  });

});

