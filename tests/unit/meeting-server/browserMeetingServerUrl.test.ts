import { describe, it, expect } from 'vitest';
import {
  resolveBrowserMeetingServerUrl,
  resolveMeetingServerProxyTarget,
} from '../../helpers/meeting-lifecycle-fixture';

describe('resolveBrowserMeetingServerUrl', () => {
  it('BMS01 — host Playwright uses localhost (host.docker.internal unreachable on Windows)', () => {
    expect(resolveBrowserMeetingServerUrl('http://localhost:3020')).toBe('http://localhost:3020');
  });

  it('BMS02 — in-container Playwright keeps host.docker.internal', () => {
    expect(resolveBrowserMeetingServerUrl('http://host.docker.internal:3020')).toBe(
      'http://host.docker.internal:3020',
    );
  });

  it('BMS04 — cloud Playwright uses HTTPS meeting-server URL (no docker internal)', () => {
    const prev = process.env.TEST_ENV;
    process.env.TEST_ENV = 'cloud';
    try {
      const cloud = 'https://izara-meeting-server-dev-testing.example.run.app';
      expect(resolveBrowserMeetingServerUrl(cloud)).toBe(cloud);
    } finally {
      if (prev === undefined) delete process.env.TEST_ENV;
      else process.env.TEST_ENV = prev;
    }
  });

  it('BMS03 — proxy target stays localhost on host (CSP-safe)', () => {
    expect(resolveMeetingServerProxyTarget('http://localhost:3020')).toBe('http://localhost:3020');
  });
});
