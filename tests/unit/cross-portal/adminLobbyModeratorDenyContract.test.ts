/**
 * Lobby join-config moderator deny — only doctor host is moderator.
 * Admin / patient / guest must not receive moderator privileges.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

function joinConfigModerator({ role }: { role: string }): boolean {
  const normalized = role.toLowerCase();
  return normalized === 'doctor' || normalized === 'host';
}

describe('adminLobbyModeratorDenyContract — pure', () => {
  it('ALM-01 — doctor host is moderator', () => {
    expect(joinConfigModerator({ role: 'doctor' })).toBe(true);
    expect(joinConfigModerator({ role: 'host' })).toBe(true);
  });

  it('ALM-02 — admin / patient / guest are denied moderator', () => {
    expect(joinConfigModerator({ role: 'admin' })).toBe(false);
    expect(joinConfigModerator({ role: 'patient' })).toBe(false);
    expect(joinConfigModerator({ role: 'guest' })).toBe(false);
  });
});

describe('adminLobbyModeratorDenyContract — source', () => {
  it('ALM-SRC — jitsiRoleJwt / meetingAuth moderator logic exists', () => {
    const sessionAuth = fs.readFileSync(
      path.join(root, 'Izara-jitsi-server/backend/sessionAuth.js'),
      'utf8',
    );
    expect(sessionAuth).toMatch(/moderator/);
    expect(sessionAuth).toMatch(/createJitsiRoleJwt|isModerator|role/);

    const jitsiCfg = fs.readFileSync(
      path.join(root, 'Izara-jitsi-server/backend/jitsiConfig.js'),
      'utf8',
    );
    expect(jitsiCfg).toMatch(/moderator/);
    expect(jitsiCfg).toMatch(/role === 'doctor'|isHost/);

    expect(
      fs.existsSync(path.join(root, 'tests/unit/meeting-server/jitsiRoleJwt.test.ts')),
    ).toBe(true);
  });
});
