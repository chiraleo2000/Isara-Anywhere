/**
 * ═══════════════════════════════════════════════════════════════════════
 * Meeting Lobby Flow Logic Tests
 * Tests: Lobby admission, participant tracking, role-based access
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';

// --- Types ---
interface LobbyParticipant {
  id: string;
  name: string;
  role: 'doctor' | 'patient' | 'admin' | 'guest';
  joinedAt: string;
  status: 'waiting' | 'admitted' | 'rejected';
}

interface LobbyDecision {
  participantId: string;
  action: 'admit' | 'reject';
  decidedBy: string;
}

interface MeetingConfig {
  lobbyEnabled: boolean;
  maxParticipants: number;
  autoAdmitRoles: string[];
  requireConsent: boolean;
}

// --- Functions ---

function shouldAutoAdmit(participant: LobbyParticipant, config: MeetingConfig): boolean {
  if (!config.lobbyEnabled) return true;
  return config.autoAdmitRoles.includes(participant.role);
}

function canAdmitParticipant(
  meeting: { currentParticipants: number },
  config: MeetingConfig
): boolean {
  return meeting.currentParticipants < config.maxParticipants;
}

function processLobbyDecision(
  participant: LobbyParticipant,
  decision: LobbyDecision
): LobbyParticipant {
  return {
    ...participant,
    status: decision.action === 'admit' ? 'admitted' : 'rejected',
  };
}

function getWaitingParticipants(participants: LobbyParticipant[]): LobbyParticipant[] {
  return participants.filter(p => p.status === 'waiting');
}

function getAdmittedCount(participants: LobbyParticipant[]): number {
  return participants.filter(p => p.status === 'admitted').length;
}

function validateJoinPermission(
  role: string,
  isHost: boolean,
  meetingStatus: string
): { allowed: boolean; reason?: string } {
  if (meetingStatus === 'ended') return { allowed: false, reason: 'Meeting has ended' };
  if (meetingStatus === 'cancelled') return { allowed: false, reason: 'Meeting was cancelled' };
  if (isHost) return { allowed: true };
  if (meetingStatus !== 'active' && meetingStatus !== 'waiting') {
    return { allowed: false, reason: `Meeting status: ${meetingStatus}` };
  }
  return { allowed: true };
}

/** Teams-style: guests/patients wait until HOST admits (no doctor in admitted set). */
function hostPresentInLobby(participants: LobbyParticipant[]): boolean {
  return participants.some(p => (p.role === 'doctor' || p.role === 'admin') && p.status === 'admitted');
}

function admitAllWaiting(participants: LobbyParticipant[], decidedBy: string): LobbyParticipant[] {
  return participants.map(p =>
    p.status === 'waiting'
      ? { ...p, status: 'admitted' as const }
      : p,
  );
}

function countWaitingByRole(participants: LobbyParticipant[], role: LobbyParticipant['role']): number {
  return participants.filter(p => p.status === 'waiting' && p.role === role).length;
}

/** Resolve lobby map key: appointmentId preferred over meetingUUID (mirrors meeting-server). */
function resolveLobbyKey(meetingId: string, appointmentId: string | null): string {
  return appointmentId || meetingId;
}

// --- Test Data ---
const DEFAULT_CONFIG: MeetingConfig = {
  lobbyEnabled: true,
  maxParticipants: 10,
  autoAdmitRoles: ['doctor', 'admin'],
  requireConsent: true,
};

const SAMPLE_PARTICIPANTS: LobbyParticipant[] = [
  { id: '1', name: 'Dr. Smith', role: 'doctor', joinedAt: '2026-03-15T10:00:00Z', status: 'admitted' },
  { id: '2', name: 'Patient Demo', role: 'patient', joinedAt: '2026-03-15T10:01:00Z', status: 'waiting' },
  { id: '3', name: 'Admin User', role: 'admin', joinedAt: '2026-03-15T10:02:00Z', status: 'admitted' },
  { id: '4', name: 'Guest Viewer', role: 'guest', joinedAt: '2026-03-15T10:03:00Z', status: 'waiting' },
];

// --- Tests ---

describe('Lobby — Auto-Admit', () => {
  it('LB01 — doctor auto-admitted', () => {
    const p: LobbyParticipant = { id: '1', name: 'Dr. Test', role: 'doctor', joinedAt: '', status: 'waiting' };
    expect(shouldAutoAdmit(p, DEFAULT_CONFIG)).toBe(true);
  });

  it('LB02 — admin auto-admitted', () => {
    const p: LobbyParticipant = { id: '2', name: 'Admin', role: 'admin', joinedAt: '', status: 'waiting' };
    expect(shouldAutoAdmit(p, DEFAULT_CONFIG)).toBe(true);
  });

  it('LB03 — patient NOT auto-admitted', () => {
    const p: LobbyParticipant = { id: '3', name: 'Patient', role: 'patient', joinedAt: '', status: 'waiting' };
    expect(shouldAutoAdmit(p, DEFAULT_CONFIG)).toBe(false);
  });

  it('LB04 — guest NOT auto-admitted', () => {
    const p: LobbyParticipant = { id: '4', name: 'Guest', role: 'guest', joinedAt: '', status: 'waiting' };
    expect(shouldAutoAdmit(p, DEFAULT_CONFIG)).toBe(false);
  });

  it('LB05 — lobby disabled: everyone auto-admitted', () => {
    const config = { ...DEFAULT_CONFIG, lobbyEnabled: false };
    const p: LobbyParticipant = { id: '5', name: 'Patient', role: 'patient', joinedAt: '', status: 'waiting' };
    expect(shouldAutoAdmit(p, config)).toBe(true);
  });
});

describe('Lobby — Capacity', () => {
  it('LB06 — can admit when under max', () => {
    expect(canAdmitParticipant({ currentParticipants: 5 }, DEFAULT_CONFIG)).toBe(true);
  });

  it('LB07 — cannot admit when at max', () => {
    expect(canAdmitParticipant({ currentParticipants: 10 }, DEFAULT_CONFIG)).toBe(false);
  });
});

describe('Lobby — Decision Processing', () => {
  it('LB08 — admit changes status', () => {
    const p = SAMPLE_PARTICIPANTS[1]; // waiting patient
    const result = processLobbyDecision(p, { participantId: p.id, action: 'admit', decidedBy: 'doc1' });
    expect(result.status).toBe('admitted');
  });

  it('LB09 — reject changes status', () => {
    const p = SAMPLE_PARTICIPANTS[3]; // waiting guest
    const result = processLobbyDecision(p, { participantId: p.id, action: 'reject', decidedBy: 'doc1' });
    expect(result.status).toBe('rejected');
  });
});

describe('Lobby — Participant Queries', () => {
  it('LB10 — 2 waiting participants', () => {
    expect(getWaitingParticipants(SAMPLE_PARTICIPANTS)).toHaveLength(2);
  });

  it('LB11 — 2 admitted participants', () => {
    expect(getAdmittedCount(SAMPLE_PARTICIPANTS)).toBe(2);
  });
});

describe('Lobby — Join Permission', () => {
  it('LB12 — host can always join active meeting', () => {
    expect(validateJoinPermission('doctor', true, 'active').allowed).toBe(true);
  });

  it('LB13 — cannot join ended meeting', () => {
    expect(validateJoinPermission('patient', false, 'ended').allowed).toBe(false);
  });

  it('LB14 — cannot join cancelled meeting', () => {
    expect(validateJoinPermission('patient', false, 'cancelled').allowed).toBe(false);
  });

  it('LB15 — guest can join active meeting', () => {
    expect(validateJoinPermission('guest', false, 'active').allowed).toBe(true);
  });

  it('LB16 — host can join even before active', () => {
    expect(validateJoinPermission('doctor', true, 'created').allowed).toBe(true);
  });
});

describe('Lobby — HOST absent & multi-guest (Teams-style)', () => {
  it('LB17 — no host in lobby until doctor admitted', () => {
    const guestsOnly: LobbyParticipant[] = [
      { id: 'g1', name: 'Guest 1', role: 'guest', joinedAt: '', status: 'waiting' },
      { id: 'g2', name: 'Guest 2', role: 'guest', joinedAt: '', status: 'waiting' },
      { id: 'p1', name: 'Patient', role: 'patient', joinedAt: '', status: 'waiting' },
    ];
    expect(hostPresentInLobby(guestsOnly)).toBe(false);
    expect(getWaitingParticipants(guestsOnly)).toHaveLength(3);
  });

  it('LB18 — admit-all admits every waiting participant', () => {
    const mixed: LobbyParticipant[] = [
      { id: 'g1', name: 'G1', role: 'guest', joinedAt: '', status: 'waiting' },
      { id: 'g2', name: 'G2', role: 'guest', joinedAt: '', status: 'waiting' },
      { id: 'p1', name: 'P', role: 'patient', joinedAt: '', status: 'waiting' },
    ];
    const after = admitAllWaiting(mixed, 'DOC-001');
    expect(getWaitingParticipants(after)).toHaveLength(0);
    expect(getAdmittedCount(after)).toBe(3);
  });

  it('LB19 — two guests waiting simultaneously', () => {
    const lobby: LobbyParticipant[] = [
      { id: 'g1', name: 'Guest A', role: 'guest', joinedAt: '', status: 'waiting' },
      { id: 'g2', name: 'Guest B', role: 'guest', joinedAt: '', status: 'waiting' },
    ];
    expect(countWaitingByRole(lobby, 'guest')).toBe(2);
    expect(countWaitingByRole(lobby, 'patient')).toBe(0);
  });

  it('LB20 — guest before host: patient stays waiting when only guests admitted', () => {
    const partial: LobbyParticipant[] = [
      { id: 'g1', name: 'G1', role: 'guest', joinedAt: '', status: 'admitted' },
      { id: 'p1', name: 'P', role: 'patient', joinedAt: '', status: 'waiting' },
    ];
    expect(hostPresentInLobby(partial)).toBe(false);
    expect(getWaitingParticipants(partial)).toHaveLength(1);
  });

  it('LB21 — resolveLobbyKey prefers appointmentId', () => {
    expect(resolveLobbyKey('uuid-meeting', 'APT-001')).toBe('APT-001');
    expect(resolveLobbyKey('uuid-meeting', null)).toBe('uuid-meeting');
  });

  it('LB22 — reject removes participant from waiting list', () => {
    const lobby: LobbyParticipant[] = [
      { id: 'g1', name: 'G1', role: 'guest', joinedAt: '', status: 'waiting' },
      { id: 'g2', name: 'G2', role: 'guest', joinedAt: '', status: 'waiting' },
    ];
    const rejected = processLobbyDecision(lobby[1], { participantId: 'g2', action: 'reject', decidedBy: 'doc' });
    const updated = lobby.map(p => (p.id === 'g2' ? rejected : p));
    expect(getWaitingParticipants(updated)).toHaveLength(1);
    expect(updated.find(p => p.id === 'g2')?.status).toBe('rejected');
  });

  it('LB23 — admit-one leaves other guests waiting', () => {
    const lobby: LobbyParticipant[] = [
      { id: 'g1', name: 'G1', role: 'guest', joinedAt: '', status: 'waiting' },
      { id: 'g2', name: 'G2', role: 'guest', joinedAt: '', status: 'waiting' },
    ];
    const admitted = processLobbyDecision(lobby[0], { participantId: 'g1', action: 'admit', decidedBy: 'doc' });
    const updated = lobby.map(p => (p.id === 'g1' ? admitted : p));
    expect(getAdmittedCount(updated)).toBe(1);
    expect(getWaitingParticipants(updated)).toHaveLength(1);
    expect(getWaitingParticipants(updated)[0].id).toBe('g2');
  });

  it('LB24 — doctor role auto-admitted; guest never', () => {
    const doc: LobbyParticipant = { id: 'd1', name: 'Doc', role: 'doctor', joinedAt: '', status: 'waiting' };
    const guest: LobbyParticipant = { id: 'g1', name: 'G', role: 'guest', joinedAt: '', status: 'waiting' };
    expect(shouldAutoAdmit(doc, DEFAULT_CONFIG)).toBe(true);
    expect(shouldAutoAdmit(guest, DEFAULT_CONFIG)).toBe(false);
  });
});
