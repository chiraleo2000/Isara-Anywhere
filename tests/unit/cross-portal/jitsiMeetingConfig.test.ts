/**
 * @process Processes/Pages/Doctor-Portal/07, Patient-Portal/05, VIDEO_MEETING_JITSI_GEMINI.md
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getJitsiExternalApiOptions,
  pickJitsiJwt,
  type JitsiMeetingRole,
} from '../../../Isara-patient-portal/frontend/utils/jitsiMeetingConfig.ts';

describe('jitsiMeetingConfig — portal join options', () => {
  it('JM01 — doctor role is host toolbar with lobby disabled', () => {
    const opts = getJitsiExternalApiOptions('doctor', 'Dr. Demo');
    expect(opts.configOverwrite.enableLobby).toBe(false);
    expect(opts.configOverwrite.requireDisplayName).toBe(false);
    expect(opts.configOverwrite.prejoinPageEnabled).toBe(false);
    expect(opts.configOverwrite.startWithAudioMuted).toBe(false);
    expect(opts.configOverwrite.toolbarButtons).toContain('participants-pane');
  });

  it('JM02 — patient role is non-host, audio muted initially', () => {
    const opts = getJitsiExternalApiOptions('patient', 'Patient Demo');
    expect(opts.configOverwrite.startWithAudioMuted).toBe(true);
    expect(opts.configOverwrite.toolbarButtons).not.toContain('participants-pane');
  });

  it('JM03 — guest role matches patient AV defaults', () => {
    const opts = getJitsiExternalApiOptions('guest', 'Guest User');
    expect(opts.configOverwrite.enableLobby).toBe(false);
    expect(opts.interfaceConfigOverwrite.DEFAULT_LOCAL_DISPLAY_NAME).toBe('Guest User');
  });

  it('JM04 — admin treated as host', () => {
    const opts = getJitsiExternalApiOptions('admin', 'Admin Observer');
    expect(opts.configOverwrite.startWithAudioMuted).toBe(false);
    expect(opts.configOverwrite.toolbarButtons).toContain('participants-pane');
  });

  const roles: JitsiMeetingRole[] = ['doctor', 'patient', 'guest', 'admin'];
  it('JM05 — all roles disable Jitsi built-in lobby', () => {
    for (const role of roles) {
      const opts = getJitsiExternalApiOptions(role, 'Test');
      expect(opts.configOverwrite.enableLobby).toBe(false);
      expect(opts.configOverwrite.lobbyModeEnabled).toBe(false);
    }
  });
});

describe('jitsiMeetingConfig — isHostReady fetch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('JM06b — pickJitsiJwt strips JWT on public meet.jit.si', () => {
    expect(
      pickJitsiJwt({
        jwt: 'eyJhbGciOiJIUzI1NiJ9.fake',
        tokenAuthEnabled: true,
        domain: 'meet.jit.si',
      }),
    ).toBeUndefined();
    expect(
      pickJitsiJwt({
        jwt: 'eyJhbGciOiJIUzI1NiJ9.fake',
        tokenAuthEnabled: true,
        domain: 'meet.example.com',
      }),
    ).toBe('eyJhbGciOiJIUzI1NiJ9.fake');
  });

  it('JM06 — isHostReady parses ready flag', async () => {
    const { isHostReady } = await import('../../../Isara-patient-portal/frontend/utils/jitsiMeetingConfig.ts');
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ ready: true }),
    });
    expect(await isHostReady('http://localhost:3020', 'APT-1')).toBe(true);
  });
});
