import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildDoctorJitsiMountOptions,
  fetchMeetingJoinConfig,
  generateIzaraRoomName,
  getJitsiExternalApiOptions,
  loadJitsiExternalApiScript,
  pickJitsiJwt,
} from '../../../Isara-doctor-portal/frontend/utils/jitsiMeetingConfig.ts';

describe('doctor meeting join config contract', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('MJ01 — join-config response shape includes jwt and role', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        domain: 'meet.example.com',
        roomName: 'izara-apt-001',
        jwt: 'eyJhbGciOiJIUzI1NiJ9.test',
        role: 'doctor',
        displayName: 'Dr. Demo',
        tokenAuthEnabled: true,
        configOverwrite: { prejoinPageEnabled: false },
      }),
    });
    const cfg = await fetchMeetingJoinConfig('http://localhost:3020', 'apt-001', 'doctor', 'Dr. Demo', 'token');
    expect(cfg).toMatchObject({
      roomName: 'izara-apt-001',
      role: 'doctor',
      jwt: expect.any(String),
    });
    expect(pickJitsiJwt(cfg)).toBe('eyJhbGciOiJIUzI1NiJ9.test');
  });

  it('MJ02 — doctor open-room init does not throw with mocked script loader', async () => {
    vi.stubGlobal('JitsiMeetExternalAPI', vi.fn());
    vi.stubGlobal('document', {
      querySelector: vi.fn(() => null),
      querySelectorAll: vi.fn(() => []),
      head: { appendChild: vi.fn() },
      createElement: vi.fn(() => ({
        async: false,
        src: '',
        onload: null as (() => void) | null,
        onerror: null as (() => void) | null,
        addEventListener: vi.fn(),
        getAttribute: vi.fn(() => null),
      })),
    });
    const p = loadJitsiExternalApiScript('meet.example.com');
    const el = (document.createElement as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    el.onload?.();
    await expect(p).resolves.toBeUndefined();
    const opts = getJitsiExternalApiOptions('doctor', 'Dr. Demo');
    expect(opts.configOverwrite.prejoinPageEnabled).toBe(false);
    expect(opts.configOverwrite.moderator).toBe(true);
    const api = new (globalThis as any).JitsiMeetExternalAPI('meet.example.com', {
      roomName: 'room-1',
      ...opts,
      userInfo: { displayName: 'Dr. Demo' },
    });
    expect(api).toBeDefined();
  });

  it('MJ03 — join-config fetch failure returns null without unhandled rejection', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network'));
    await expect(
      fetchMeetingJoinConfig('http://localhost:3020', 'bad-id', 'doctor'),
    ).resolves.toBeNull();
  });

  it('MJ04 — join-config request includes display name query for authenticated users', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, roomName: 'izara-apt', displayName: 'Dr. Demo' }),
    });
    await fetchMeetingJoinConfig('http://localhost:3020', 'apt-001', 'doctor', 'Dr. Demo', 'token');
    const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain('name=Dr.');
    expect(calledUrl).toContain('role=doctor');
  });

  it('MJ05 — generateIzaraRoomName matches server meeting link pattern', () => {
    expect(generateIzaraRoomName('abc123')).toMatch(/^izara-abc123-/);
  });

  it('MJ06 — resolveMountJwt never passes JWT to public meet.jit.si mount', async () => {
    const { resolveMountJwt } = await import('../../../Isara-doctor-portal/frontend/utils/jitsiMeetingConfig.ts');
    expect(resolveMountJwt()).toBeUndefined();
  });

  it('MJ07 — loadJitsiExternalApiScript uses provided domain', async () => {
    vi.stubGlobal('document', {
      querySelector: vi.fn(() => null),
      querySelectorAll: vi.fn(() => []),
      head: { appendChild: vi.fn() },
      createElement: vi.fn(() => {
        const el = {
          async: false,
          src: '',
          onload: null as (() => void) | null,
          onerror: null as (() => void) | null,
          addEventListener: vi.fn(),
          getAttribute: vi.fn(() => null),
        };
        return el;
      }),
    });
    vi.stubGlobal('JitsiMeetExternalAPI', undefined);
    const p = loadJitsiExternalApiScript('meet.custom.example');
    const el = (document.createElement as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    el.onload?.();
    await p;
    expect(el.src).toBe('https://meet.custom.example/external_api.js');
  });

  it('MJ08 — buildDoctorJitsiMountOptions sets moderator and strips JWT on public domain', () => {
    const mount = buildDoctorJitsiMountOptions({
      user: { id: 'doc-1', name: 'Dr. Demo', email: 'doc@test.com' },
      roomName: 'izara-apt-001',
      joinCfg: {
        jwt: 'eyJhbGciOiJIUzI1NiJ9.test',
        domain: 'meet.jit.si',
        tokenAuthEnabled: true,
      },
      micOn: true,
      cameraOn: true,
    });
    expect(mount.apiOptions.configOverwrite.moderator).toBe(true);
    expect(mount.apiOptions.configOverwrite.prejoinPageEnabled).toBe(false);
    expect(mount.apiOptions.userInfo.displayName).toBe('Dr. Demo');
    expect(mount.jwt).toBeUndefined();
    const serialized = JSON.stringify(mount.apiOptions);
    expect(serialized).not.toMatch(/eyJhbGci/i);
  });
});
