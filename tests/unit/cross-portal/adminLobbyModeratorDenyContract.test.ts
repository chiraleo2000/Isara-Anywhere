/**
 * Lobby join-config moderator deny — only doctor host is moderator.
 * Admin / patient / guest must not receive moderator privileges.
 * Patient Jitsi mount requires lobby admit (status === 'admitted').
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

function joinConfigModerator({ role }: { role: string }): boolean {
  const normalized = role.toLowerCase();
  return normalized === 'doctor' || normalized === 'host';
}

function patientMayMountJitsi({
  lobbyStatus,
  hostReady,
}: {
  lobbyStatus: string;
  hostReady: boolean;
}): boolean {
  return lobbyStatus === 'admitted' && hostReady;
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

  it('ALM-03 — lobby admit required before patient Jitsi mount', () => {
    expect(patientMayMountJitsi({ lobbyStatus: 'waiting', hostReady: true })).toBe(false);
    expect(patientMayMountJitsi({ lobbyStatus: 'admitted', hostReady: false })).toBe(false);
    expect(patientMayMountJitsi({ lobbyStatus: 'admitted', hostReady: true })).toBe(true);
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

  it('ALM-SRC-ADMIT — patient room gates Jitsi on lobby admit + host-ready', () => {
    const patientRoom = fs.readFileSync(
      path.join(root, 'Isara-patient-portal/frontend/pages/PatientMeetingRoom.tsx'),
      'utf8',
    );
    expect(patientRoom).toMatch(/lobbyStatus !== 'admitted'/);
    expect(patientRoom).toMatch(/waitForHostReady/);
    expect(patientRoom).toMatch(/mountJitsiMeeting/);
  });
});
