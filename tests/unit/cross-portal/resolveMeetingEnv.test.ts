/**
 * @process Processes/ENV_AND_STACK_CHECK.md, Processes/VIDEO_MEETING_JITSI_GEMINI.md
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

function readPortalUtil(portal: 'doctor' | 'patient', file: string): string {
  const dir = portal === 'doctor' ? 'issara-doctor' : 'issara-patient';
  return fs.readFileSync(path.join(root, dir, 'frontend/utils', file), 'utf8');
}

describe('resolveMeetingEnv — cross-portal parity', () => {
  it('ENV-MEET-01 — both portals export resolveEnv with runtime → VITE order', () => {
    const doctor = readPortalUtil('doctor', 'resolveEnv.ts');
    const patient = readPortalUtil('patient', 'resolveEnv.ts');
    for (const src of [doctor, patient]) {
      expect(src).toMatch(/runtimeEnv\(\)/);
      expect(src).toMatch(/VITE_\$\{key\}/);
      expect(src).toMatch(/export function resolveEnv/);
    }
  });

  it('ENV-MEET-02 — resolveMeetingServerUrl rewrites host.docker.internal for localhost browsers', () => {
    const doctor = readPortalUtil('doctor', 'resolveMeetingServerUrl.ts');
    const patient = readPortalUtil('patient', 'resolveMeetingServerUrl.ts');
    for (const src of [doctor, patient]) {
      expect(src).toMatch(/host\.docker\.internal/);
      expect(src).toMatch(/rewriteForBrowser/);
      expect(src).toMatch(/resolveEnv\('MEETING_SERVER_URL'\)/);
    }
  });

  it('ENV-MEET-03 — Cloud Run host swap to meeting-server', () => {
    const doctor = readPortalUtil('doctor', 'resolveMeetingServerUrl.ts');
    expect(doctor).toMatch(/izara-meeting-server/);
    expect(doctor).toMatch(/\.run\.app/);
  });
});

describe('resolveMeetingServerUrl — runtime behavior', () => {
  const originalLocation = globalThis.location;

  afterEach(() => {
    Object.defineProperty(globalThis, 'location', {
      value: originalLocation,
      configurable: true,
      writable: true,
    });
  });

  beforeEach(async () => {
    const { resolveMeetingServerUrl } = await import(
      '../../../issara-doctor/frontend/utils/resolveMeetingServerUrl.ts'
    );
    (globalThis as { __resolveTest?: typeof resolveMeetingServerUrl }).__resolveTest = resolveMeetingServerUrl;
  });

  it('ENV-MEET-04 — localhost browser defaults to :3020', async () => {
    delete process.env.MEETING_SERVER_URL;
    delete process.env.VITE_MEETING_SERVER_URL;
    delete process.env.MEETING_PUBLIC_URL;
    delete process.env.VITE_MEETING_PUBLIC_URL;
    (globalThis as { ENV?: Record<string, string> }).ENV = {};
    vi.stubEnv('MEETING_SERVER_URL', '');
    vi.stubEnv('VITE_MEETING_SERVER_URL', '');
    vi.stubEnv('MEETING_PUBLIC_URL', '');
    vi.stubEnv('VITE_MEETING_PUBLIC_URL', '');
    vi.resetModules();
    Object.defineProperty(globalThis, 'location', {
      value: { hostname: 'localhost', protocol: 'http:' },
      configurable: true,
      writable: true,
    });
    const { resolveMeetingServerUrl } = await import(
      '../../../issara-doctor/frontend/utils/resolveMeetingServerUrl.ts'
    );
    expect(resolveMeetingServerUrl()).toBe('http://localhost:3020');
    vi.unstubAllEnvs();
  });
});
