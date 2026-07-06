import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resolveMeetingServerUrl } from '../../../Isara-patient-portal/frontend/utils/resolveMeetingServerUrl';

describe('resolveMeetingServerUrl (patient portal)', () => {
  const originalLocation = globalThis.location;
  const originalEnv = (globalThis as { ENV?: Record<string, string> }).ENV;

  beforeEach(() => {
    vi.stubEnv('MEETING_PUBLIC_URL', '');
    vi.stubEnv('VITE_MEETING_PUBLIC_URL', '');
    vi.stubEnv('MEETING_SERVER_URL', '');
    vi.stubEnv('VITE_MEETING_SERVER_URL', '');
    Object.defineProperty(globalThis, 'location', {
      value: { hostname: 'localhost', protocol: 'http:' },
      configurable: true,
      writable: true,
    });
    (globalThis as { ENV?: Record<string, string> }).ENV = {
      MEETING_SERVER_URL: 'http://host.docker.internal:3020',
    };
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    Object.defineProperty(globalThis, 'location', {
      value: originalLocation,
      configurable: true,
      writable: true,
    });
    (globalThis as { ENV?: Record<string, string> }).ENV = originalEnv;
  });

  it('RMS01 — rewrites host.docker.internal to localhost on host browser', () => {
    expect(resolveMeetingServerUrl()).toBe('http://localhost:3020');
  });

  it('RMS03 — Cloud Run derives meeting-server URL (no localhost fallback)', () => {
    (globalThis as { ENV?: Record<string, string> }).ENV = {};
    Object.defineProperty(globalThis, 'location', {
      value: {
        hostname: 'izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app',
        protocol: 'https:',
      },
      configurable: true,
      writable: true,
    });
    expect(resolveMeetingServerUrl()).toBe(
      'https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app',
    );
  });

  it('RMS02 — keeps host.docker.internal when browser is inside Docker', () => {
    Object.defineProperty(globalThis, 'location', {
      value: { hostname: 'host.docker.internal', protocol: 'http:' },
      configurable: true,
      writable: true,
    });
    expect(resolveMeetingServerUrl()).toBe('http://host.docker.internal:3020');
  });
});
