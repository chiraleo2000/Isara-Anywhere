/**
 * Doctor portal Jitsi loader — stub-safe early return + stale script cleanup.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadJitsiExternalApiScript } from '../../../Isara-doctor-portal/frontend/utils/jitsiMeetingConfig';

describe('doctor loadJitsiExternalApiScript stub safety', () => {
  beforeEach(() => {
    delete (globalThis as any).JitsiMeetExternalAPI;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (globalThis as any).JitsiMeetExternalAPI;
  });

  it('JIT-D01 — early resolve when stub/API already installed (no script fetch)', async () => {
    (globalThis as any).JitsiMeetExternalAPI = vi.fn();
    const createElement = vi.fn();
    const querySelectorAll = vi.fn(() => []);
    vi.stubGlobal('document', {
      querySelector: vi.fn(),
      querySelectorAll,
      createElement,
      head: { appendChild: vi.fn() },
    });
    await expect(loadJitsiExternalApiScript('meet.jit.si')).resolves.toBeUndefined();
    expect(createElement).not.toHaveBeenCalled();
  });

  it('JIT-D02 — removes stale external_api scripts for other domains', async () => {
    const stale = {
      getAttribute: vi.fn(() => 'https://old.example/external_api.js'),
      remove: vi.fn(),
      addEventListener: vi.fn(),
    };
    const scriptEl = {
      async: false,
      src: '',
      onload: null as (() => void) | null,
      onerror: null as (() => void) | null,
      addEventListener: vi.fn(),
    };
    vi.stubGlobal('document', {
      querySelector: vi.fn(() => null),
      querySelectorAll: vi.fn(() => [stale]),
      createElement: vi.fn(() => scriptEl),
      head: { appendChild: vi.fn() },
    });
    const p = loadJitsiExternalApiScript('meet.example.com');
    expect(stale.remove).toHaveBeenCalled();
    (globalThis as any).JitsiMeetExternalAPI = vi.fn();
    scriptEl.onload?.();
    await expect(p).resolves.toBeUndefined();
  });

  it('JIT-D03 — rejects when document is undefined', async () => {
    vi.stubGlobal('document', undefined);
    await expect(loadJitsiExternalApiScript('meet.example.com')).rejects.toThrow(
      /browser document/i,
    );
  });
});
