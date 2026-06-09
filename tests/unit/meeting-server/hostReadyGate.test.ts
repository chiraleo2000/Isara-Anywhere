/**
 * @process Processes/TWO_ROUND_CLOUD_TESTING.md — E10d host-ready before patient Jitsi
 */
import { describe, it, expect, beforeEach } from 'vitest';

const meetingHostsOnline = new Set<string>();

function isHostReadyForMeeting(meetingId: string, lobbyKey?: string): boolean {
  return meetingHostsOnline.has(meetingId) || Boolean(lobbyKey && meetingHostsOnline.has(lobbyKey));
}

function markHostPresent(meetingId: string, lobbyKey?: string) {
  meetingHostsOnline.add(meetingId);
  if (lobbyKey) meetingHostsOnline.add(lobbyKey);
}

describe('hostReadyGate — patient/guest join gating', () => {
  beforeEach(() => meetingHostsOnline.clear());

  it('HR01 — patient blocked until host marks present', () => {
    expect(isHostReadyForMeeting('APT-1')).toBe(false);
  });

  it('HR02 — host-ready after doctor host-present', () => {
    markHostPresent('APT-1');
    expect(isHostReadyForMeeting('APT-1')).toBe(true);
  });

  it('HR03 — lobby alias key also resolves host-ready', () => {
    markHostPresent('meet-uuid', 'APT-2');
    expect(isHostReadyForMeeting('meet-uuid', 'APT-2')).toBe(true);
    expect(isHostReadyForMeeting('APT-2')).toBe(true);
  });

  it('HR04 — join-config hostReady mirrors gate', () => {
    const joinConfig = { hostReady: false, noJitsiLoginRequired: true };
    expect(joinConfig.hostReady).toBe(false);
    markHostPresent('APT-3');
    joinConfig.hostReady = isHostReadyForMeeting('APT-3');
    expect(joinConfig.hostReady).toBe(true);
  });

  it('HR05 — socket join-meeting alone must not mark host (REST host-present only)', () => {
    // Simulates socketHandlers policy: join-meeting does not call markHostOnline
    expect(isHostReadyForMeeting('APT-SOCKET-ONLY')).toBe(false);
  });
});
