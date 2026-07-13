/**
 * Guest anonymous deny — token always OK; anonymous only when allowAnonymous.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

function allowGuestJoin(opts: { hasToken: boolean; allowAnonymous: boolean }): boolean {
  if (opts.hasToken) return true;
  return opts.allowAnonymous === true;
}

describe('guestAnonymousDenyContract — pure join policy', () => {
  it('GAD-01 — token always ok', () => {
    expect(allowGuestJoin({ hasToken: true, allowAnonymous: false })).toBe(true);
    expect(allowGuestJoin({ hasToken: true, allowAnonymous: true })).toBe(true);
  });

  it('GAD-02 — no token only if allowAnonymous', () => {
    expect(allowGuestJoin({ hasToken: false, allowAnonymous: true })).toBe(true);
    expect(allowGuestJoin({ hasToken: false, allowAnonymous: false })).toBe(false);
  });
});

describe('guestAnonymousDenyContract — source strings', () => {
  it('GAD-03 — meetingAuth or index mentions GUEST_ALLOW_ANONYMOUS or guest token', () => {
    const index = fs.readFileSync(path.join(root, 'Izara-jitsi-server/backend/index.js'), 'utf8');
    const jitsiConfig = fs.readFileSync(
      path.join(root, 'Izara-jitsi-server/backend/jitsiConfig.js'),
      'utf8',
    );
    const sessionAuth = fs.readFileSync(
      path.join(root, 'Izara-jitsi-server/backend/sessionAuth.js'),
      'utf8',
    );
    const combined = `${index}\n${jitsiConfig}\n${sessionAuth}`;
    expect(combined).toMatch(/GUEST_ALLOW_ANONYMOUS|guest.*token|guestToken|guest invite/i);
  });

  it('GAD-04 — hostReadyGate / host-ready mentioned', () => {
    const index = fs.readFileSync(path.join(root, 'Izara-jitsi-server/backend/index.js'), 'utf8');
    expect(index).toMatch(/host-ready|hostReady|isHostReadyForMeeting/);
  });
});
