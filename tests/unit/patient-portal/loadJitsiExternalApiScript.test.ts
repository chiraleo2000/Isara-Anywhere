/**
 * Patient portal Jitsi external API script loader.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadJitsiExternalApiScript } from '../../../../issara-patient/frontend/utils/jitsiMeetingConfig';

describe('patient loadJitsiExternalApiScript', () => {
  beforeEach(() => {
    delete (globalThis as any).JitsiMeetExternalAPI;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (globalThis as any).JitsiMeetExternalAPI;
  });

  it('JIT-P01 — resolves immediately when JitsiMeetExternalAPI already present', async () => {
    (globalThis as any).JitsiMeetExternalAPI = vi.fn();
    const createElement = vi.fn();
    vi.stubGlobal('document', {
      querySelector: vi.fn(),
      createElement,
      head: { appendChild: vi.fn() },
    });
    await expect(loadJitsiExternalApiScript('meet.jit.si')).resolves.toBeUndefined();
    expect(createElement).not.toHaveBeenCalled();
  });

  it('JIT-P02 — injects script with https://{domain}/external_api.js', async () => {
    const scriptEl = {
      async: false,
      src: '',
      onload: null as (() => void) | null,
      onerror: null as (() => void) | null,
      addEventListener: vi.fn(),
    };
    vi.stubGlobal('document', {
      querySelector: vi.fn(() => null),
      createElement: vi.fn(() => scriptEl),
      head: { appendChild: vi.fn() },
    });
    const p = loadJitsiExternalApiScript('meet.example.com');
    expect(document.createElement).toHaveBeenCalledWith('script');
    expect(scriptEl.src).toBe('https://meet.example.com/external_api.js');
    expect(scriptEl.async).toBe(true);
    (globalThis as any).JitsiMeetExternalAPI = vi.fn();
    scriptEl.onload?.();
    await expect(p).resolves.toBeUndefined();
  });

  it('JIT-P03 — reuses existing external_api script node via load listener', async () => {
    const existing = {
      addEventListener: vi.fn((event: string, fn: () => void) => {
        if (event === 'load') fn();
      }),
    };
    const createElement = vi.fn();
    vi.stubGlobal('document', {
      querySelector: vi.fn(() => existing),
      createElement,
      head: { appendChild: vi.fn() },
    });
    await expect(loadJitsiExternalApiScript('meet.jit.si')).resolves.toBeUndefined();
    expect(createElement).not.toHaveBeenCalled();
    expect(existing.addEventListener).toHaveBeenCalledWith('load', expect.any(Function));
  });

  it('JIT-P04 — rejects when script onerror fires', async () => {
    const scriptEl = {
      async: false,
      src: '',
      onload: null as (() => void) | null,
      onerror: null as (() => void) | null,
      addEventListener: vi.fn(),
    };
    vi.stubGlobal('document', {
      querySelector: vi.fn(() => null),
      createElement: vi.fn(() => scriptEl),
      head: { appendChild: vi.fn() },
    });
    const p = loadJitsiExternalApiScript('meet.example.com');
    scriptEl.onerror?.();
    await expect(p).rejects.toThrow(/Failed to load Jitsi/);
  });
});
