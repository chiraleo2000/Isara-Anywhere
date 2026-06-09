import { describe, expect, it } from 'vitest';
import {
  parseLobbySnapshot,
  participantIdByRole,
} from '../../helpers/meeting-lifecycle-fixture';

describe('three-party lobby snapshot parser', () => {
  it('finds admitted patient and guest roles', () => {
    const snap = parseLobbySnapshot({
      lobby: [
        { participantId: 'p1', role: 'patient', status: 'admitted' },
        { participantId: 'g1', role: 'guest', status: 'admitted' },
        { participantId: 'd1', role: 'doctor', status: 'admitted' },
      ],
    });
    expect(participantIdByRole(snap, 'patient')).toBe('p1');
    expect(participantIdByRole(snap, 'guest')).toBe('g1');
    expect(snap.all.filter((p) => p.status === 'admitted').length).toBeGreaterThanOrEqual(2);
  });

  it('returns undefined for missing guest role', () => {
    const snap = parseLobbySnapshot({
      lobby: [{ participantId: 'p1', role: 'patient', status: 'waiting' }],
    });
    expect(participantIdByRole(snap, 'guest')).toBeUndefined();
  });

  it('counts waiting participants before admit-all', () => {
    const snap = parseLobbySnapshot({
      lobby: [
        { participantId: 'p1', role: 'patient', status: 'waiting' },
        { participantId: 'g1', role: 'guest', status: 'waiting' },
      ],
    });
    expect(snap.all.filter((p) => p.status === 'waiting').length).toBe(2);
  });

  it('doctor admitted enables host-present gate', () => {
    const snap = parseLobbySnapshot({
      lobby: [{ participantId: 'd1', role: 'doctor', status: 'admitted' }],
    });
    expect(participantIdByRole(snap, 'doctor')).toBe('d1');
  });

  it('handles empty lobby array', () => {
    const snap = parseLobbySnapshot({ lobby: [] });
    expect(snap.all).toEqual([]);
  });
});
