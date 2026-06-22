/**
 * Lobby GET response parsing — waiting vs all participants.
 */
import { describe, it, expect } from 'vitest';
import { parseLobbySnapshot } from '../../helpers/lobbySnapshot';

describe('parseLobbySnapshot', () => {
  it('LSP01 — participants are waiting, lobby is all', () => {
    const snap = parseLobbySnapshot({
      participants: [{ participantId: 'P1', status: 'waiting', role: 'patient' }],
      lobby: [
        { participantId: 'P1', status: 'waiting', role: 'patient' },
        { participantId: 'D1', status: 'admitted', role: 'doctor' },
      ],
    });
    expect(snap.waiting).toHaveLength(1);
    expect(snap.all).toHaveLength(2);
  });

  it('LSP02 — falls back to participants when lobby missing', () => {
    const snap = parseLobbySnapshot({
      participants: [{ participantId: 'G1', status: 'waiting', role: 'guest' }],
    });
    expect(snap.waiting).toEqual(snap.all);
  });
});
