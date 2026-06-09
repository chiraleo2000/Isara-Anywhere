/**
 * Guest token lobby join — token path always assigns a fresh guest-* participantId.
 * E2E must not double-join (API lobby/join + UI token join) or admit the wrong id.
 */
import { describe, it, expect } from 'vitest';

function guestTokenJoinParticipantId(existingIds: Set<string>): string {
  let id = '';
  do {
    const suffix = Math.random().toString(36).slice(2, 10);
    id = `guest-${suffix}`;
  } while (existingIds.has(id));
  return id;
}

function lobbyJoinWithFixedId(participantId: string, lobby: Map<string, { status: string }>): string {
  lobby.set(participantId, { status: 'waiting' });
  return participantId;
}

describe('guest token lobby join — participant id contract', () => {
  it('GTJ01 — token join generates guest-* id (not caller-supplied)', () => {
    const id = guestTokenJoinParticipantId(new Set());
    expect(id).toMatch(/^guest-[a-z0-9]+$/);
  });

  it('GTJ02 — double join creates two distinct lobby entries (E2E hazard)', () => {
    const lobby = new Map<string, { status: string }>();
    const apiId = lobbyJoinWithFixedId('guest-q-lifecycle', lobby);
    const uiId = guestTokenJoinParticipantId(new Set(lobby.keys()));
    lobby.set(uiId, { status: 'waiting' });
    expect(lobby.size).toBe(2);
    expect(apiId).not.toBe(uiId);
  });

  it('GTJ03 — admit by stale api id leaves UI guest waiting', () => {
    const lobby = new Map<string, { status: string }>([
      ['guest-q-lifecycle', { status: 'admitted' }],
      ['guest-abc12345', { status: 'waiting' }],
    ]);
    const waiting = [...lobby.entries()].filter(([, e]) => e.status === 'waiting');
    expect(waiting).toHaveLength(1);
    expect(waiting[0][0]).toBe('guest-abc12345');
  });
});
