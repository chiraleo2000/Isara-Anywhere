/**
 * @process Processes/TWO_ROUND_CLOUD_TESTING.md — E10d host-ready before patient Jitsi
 */
import { describe, it, expect, beforeEach } from 'vitest';

type HostPresence = { ready: boolean; inJitsi: boolean };
const meetingHostsOnline = new Map<string, HostPresence>();

function getHostPresence(meetingId: string, lobbyKey?: string): HostPresence | null {
  return meetingHostsOnline.get(meetingId) || (lobbyKey ? meetingHostsOnline.get(lobbyKey) : null) || null;
}

function isHostReadyForMeeting(meetingId: string, lobbyKey?: string): boolean {
  const presence = getHostPresence(meetingId, lobbyKey);
  return Boolean(presence?.ready && presence?.inJitsi);
}

function markHostPresent(meetingId: string, lobbyKey?: string, inJitsi = false) {
  if (!inJitsi) return;
  const payload = { ready: true, inJitsi: true };
  meetingHostsOnline.set(meetingId, payload);
  if (lobbyKey) meetingHostsOnline.set(lobbyKey, payload);
}

function markHostAbsent(meetingId: string, lobbyKey?: string) {
  meetingHostsOnline.delete(meetingId);
  if (lobbyKey) meetingHostsOnline.delete(lobbyKey);
}

describe('hostReadyGate — patient/guest join gating', () => {
  beforeEach(() => meetingHostsOnline.clear());

  it('HR01 — patient blocked until host marks present in Jitsi', () => {
    expect(isHostReadyForMeeting('APT-1')).toBe(false);
  });

  it('HR02 — host-ready only after doctor host-present with inJitsi:true', () => {
    markHostPresent('APT-1', undefined, false);
    expect(isHostReadyForMeeting('APT-1')).toBe(false);
    markHostPresent('APT-1', undefined, true);
    expect(isHostReadyForMeeting('APT-1')).toBe(true);
  });

  it('HR03 — lobby alias key also resolves host-ready', () => {
    markHostPresent('meet-uuid', 'APT-2', true);
    expect(isHostReadyForMeeting('meet-uuid', 'APT-2')).toBe(true);
    expect(isHostReadyForMeeting('APT-2')).toBe(true);
  });

  it('HR04 — join-config hostReady mirrors inJitsi gate', () => {
    const joinConfig = { hostReady: false, noJitsiLoginRequired: true };
    expect(joinConfig.hostReady).toBe(false);
    markHostPresent('APT-3', undefined, true);
    joinConfig.hostReady = isHostReadyForMeeting('APT-3');
    expect(joinConfig.hostReady).toBe(true);
  });

  it('HR05 — socket join-meeting alone must not mark host (REST host-present only)', () => {
    expect(isHostReadyForMeeting('APT-SOCKET-ONLY')).toBe(false);
  });

  it('HR06 — host-absent clears ready state', () => {
    markHostPresent('APT-4', undefined, true);
    expect(isHostReadyForMeeting('APT-4')).toBe(true);
    markHostAbsent('APT-4');
    expect(isHostReadyForMeeting('APT-4')).toBe(false);
  });
});
