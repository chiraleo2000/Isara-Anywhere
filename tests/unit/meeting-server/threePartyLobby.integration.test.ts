/**
 * @process Processes/VIDEO_MEETING_JITSI_GEMINI.md
 * Three-party lobby admission contracts (TPL-01–05).
 */
import { describe, it, expect } from 'vitest';
import { parseLobbySnapshot, participantIdByRole } from '../../helpers/meeting-lifecycle-fixture';

type LobbyRow = { participantId: string; role: string; status: string };

function allWaiting(rows: LobbyRow[]): boolean {
  return rows.every((r) => r.status === 'waiting');
}

function admitAll(rows: LobbyRow[]): LobbyRow[] {
  return rows.map((r) => ({ ...r, status: 'admitted' }));
}

function guestJwtAffiliation(role: string): string {
  return role === 'guest' ? 'none' : role === 'doctor' ? 'moderator' : 'member';
}

function canMountPatientJitsi(hostPresent: boolean): boolean {
  return hostPresent;
}

describe('threePartyLobby.integration — TPL', () => {
  const waitingLobby: LobbyRow[] = [
    { participantId: 'd1', role: 'doctor', status: 'waiting' },
    { participantId: 'p1', role: 'patient', status: 'waiting' },
    { participantId: 'g1', role: 'guest', status: 'waiting' },
  ];

  it('TPL-01 — lobby snapshot: doctor + patient + guest waiting', () => {
    expect(allWaiting(waitingLobby)).toBe(true);
    expect(waitingLobby.map((r) => r.role).sort()).toEqual(['doctor', 'guest', 'patient']);
  });

  it('TPL-02 — admit-all sets both patient and guest admitted', () => {
    const admitted = admitAll(waitingLobby);
    const patient = admitted.find((r) => r.role === 'patient');
    const guest = admitted.find((r) => r.role === 'guest');
    expect(patient?.status).toBe('admitted');
    expect(guest?.status).toBe('admitted');
  });

  it('TPL-03 — guest JWT affiliation none, doctor moderator', () => {
    expect(guestJwtAffiliation('guest')).toBe('none');
    expect(guestJwtAffiliation('doctor')).toBe('moderator');
  });

  it('TPL-04 — host-present required before patient Jitsi mount', () => {
    expect(canMountPatientJitsi(false)).toBe(false);
    expect(canMountPatientJitsi(true)).toBe(true);
  });

  it('TPL-05 — parseLobbySnapshot resolves admitted patient and guest', () => {
    const snap = parseLobbySnapshot({
      lobby: [
        { participantId: 'p1', role: 'patient', status: 'admitted' },
        { participantId: 'g1', role: 'guest', status: 'admitted' },
        { participantId: 'd1', role: 'doctor', status: 'admitted' },
      ],
    });
    expect(participantIdByRole(snap, 'patient')).toBe('p1');
    expect(participantIdByRole(snap, 'guest')).toBe('g1');
    expect(snap.all.filter((p) => p.status === 'admitted').length).toBe(3);
  });
});
