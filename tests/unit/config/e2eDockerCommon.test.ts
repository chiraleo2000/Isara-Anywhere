/**
 * Docker E2E common helpers — health URL and portal URL contracts.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('e2eDockerCommon URL helpers', () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    vi.resetModules();
    for (const key of [
      'LOCAL_PATIENT_URL',
      'LOCAL_DOCTOR_URL',
      'LOCAL_MEETING_URL',
      'HEALTH_DOCTOR_URL',
      'HEALTH_PATIENT_URL',
      'HEALTH_MEETING_URL',
    ]) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('EDC01 — hostHealthUrls uses 127.0.0.1 on host', async () => {
    const { hostHealthUrls } = await import('../../../scripts/docker/e2eDockerCommon.mjs');
    expect(hostHealthUrls(false)).toEqual([
      'http://127.0.0.1:3010',
      'http://127.0.0.1:3005',
    ]);
    expect(hostHealthUrls(true)).toEqual([
      'http://127.0.0.1:3010',
      'http://127.0.0.1:3005',
      'http://127.0.0.1:3020',
    ]);
  });

  it('EDC02 — playwrightPortalUrls uses host.docker.internal for container', async () => {
    const { playwrightPortalUrls } = await import('../../../scripts/docker/e2eDockerCommon.mjs');
    expect(playwrightPortalUrls()).toEqual({
      patient: 'http://host.docker.internal:3005',
      doctor: 'http://host.docker.internal:3010',
      meeting: 'http://host.docker.internal:3020',
    });
  });

  it('EDC03 — env overrides respected', async () => {
    process.env.HEALTH_MEETING_URL = 'http://127.0.0.1:3999';
    process.env.LOCAL_MEETING_URL = 'http://host.docker.internal:3999';
    const { hostHealthUrls, playwrightPortalUrls } = await import(
      '../../../scripts/docker/e2eDockerCommon.mjs'
    );
    expect(hostHealthUrls(true)).toContain('http://127.0.0.1:3999');
    expect(playwrightPortalUrls().meeting).toBe('http://host.docker.internal:3999');
  });
});
