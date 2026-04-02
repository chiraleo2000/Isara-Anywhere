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
