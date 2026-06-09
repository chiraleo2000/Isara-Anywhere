/**
 * Pure admit-all lobby logic (mirrors meeting-server POST /lobby/admit-all).
 */
import { describe, it, expect } from 'vitest';

type LobbyEntry = {
  participantId: string;
  role: string;
  status: 'waiting' | 'admitted' | 'rejected';
};

function admitAllWaiting(lobby: LobbyEntry[]): { admitted: LobbyEntry[]; total: number } {
  const admitted: LobbyEntry[] = [];
  for (const entry of lobby) {
    if (entry.status === 'waiting') {
      entry.status = 'admitted';
      admitted.push({ ...entry });
    }
  }
  return { admitted, total: admitted.length };
}

function admitAllOnMap(lobby: Map<string, LobbyEntry> | undefined): { admitted: LobbyEntry[]; total: number } {
  if (!lobby) return { admitted: [], total: 0 };
  return admitAllWaiting([...lobby.values()]);
}

describe('lobby admit-all', () => {
  it('LAA01 — admits every waiting participant', () => {
    const lobby: LobbyEntry[] = [
      { participantId: 'PATIENT-DEMO', role: 'patient', status: 'waiting' },
      { participantId: 'guest-abc', role: 'guest', status: 'waiting' },
      { participantId: 'DOC-1', role: 'doctor', status: 'admitted' },
    ];
    const { admitted, total } = admitAllWaiting(lobby);
    expect(total).toBe(2);
    expect(admitted.map((a) => a.participantId)).toEqual(['PATIENT-DEMO', 'guest-abc']);
    expect(lobby.every((e) => e.status !== 'waiting')).toBe(true);
  });

  it('LAA02 — empty lobby returns zero admitted', () => {
    expect(admitAllOnMap(undefined)).toEqual({ admitted: [], total: 0 });
    expect(admitAllOnMap(new Map())).toEqual({ admitted: [], total: 0 });
  });

  it('LAA03 — alias keys share same lobby map reference', () => {
    const canonical = new Map<string, LobbyEntry>([
      ['APT-1', { participantId: 'PATIENT-DEMO', role: 'patient', status: 'waiting' }],
    ]);
    const alias = canonical;
    const result = admitAllOnMap(alias);
    expect(result.total).toBe(1);
    expect(canonical.get('APT-1')?.status).toBe('admitted');
  });
});
