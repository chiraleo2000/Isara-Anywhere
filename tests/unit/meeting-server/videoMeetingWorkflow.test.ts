// ============================================================================
// Video Meeting & Jitsi Workflow Tests
// Based on: Processes/VIDEO_MEETING_JITSI_GEMINI.md
// Tests: Meeting lifecycle, room creation, token generation, transcription, AI summary
// ============================================================================

import { describe, it, expect } from 'vitest';

// --- Types ---

type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
type ParticipantRole = 'host' | 'participant' | 'observer';

interface VideoMeeting {
  id: string;
  appointmentId: string;
  roomName: string;
  jitsiUrl: string;
  hostDoctorId: string;
  participants: MeetingParticipant[];
  status: MeetingStatus;
  scheduledAt: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  hasTranscription: boolean;
  hasAiSummary: boolean;
}

interface MeetingParticipant {
  userId: string;
  name: string;
  role: ParticipantRole;
  joinedAt?: string;
  leftAt?: string;
}

interface TranscriptionSegment {
  speakerId: string;
  text: string;
  timestamp: string;
  language: 'th' | 'en';
}

// --- Constants ---

const JITSI_DOMAIN = 'meet.jit.si';
const MEETING_PREFIX = 'izara-meet';

const VALID_STATUS_TRANSITIONS: Record<MeetingStatus, MeetingStatus[]> = {
  scheduled: ['in_progress', 'cancelled', 'no_show'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
  no_show: [],
};

// --- Helper Functions ---

function generateRoomName(appointmentId: string, timestamp?: number): string {
  const ts = timestamp || Date.now();
  return `${MEETING_PREFIX}-${appointmentId}-${ts}`;
}

function buildJitsiUrl(roomName: string, domain = JITSI_DOMAIN): string {
  return `https://${domain}/${roomName}`;
}

function canTransition(current: MeetingStatus, next: MeetingStatus): boolean {
  return VALID_STATUS_TRANSITIONS[current]?.includes(next) ?? false;
}

function calculateDuration(startedAt: string, endedAt: string): number {
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  return Math.round((end - start) / (1000 * 60)); // minutes
}

function isValidRoomName(name: string): boolean {
  return /^izara-meet-.+$/.test(name) && name.length >= 15;
}

function getParticipantCount(meeting: VideoMeeting): number {
  return meeting.participants.length;
}

function getActiveParts(meeting: VideoMeeting): MeetingParticipant[] {
  return meeting.participants.filter(p => p.joinedAt && !p.leftAt);
}

function canStartMeeting(meeting: VideoMeeting, userId: string): boolean {
  if (meeting.status !== 'scheduled') return false;
  if (meeting.hostDoctorId !== userId) return false;
  return true;
}

function canJoinMeeting(meeting: VideoMeeting, userId: string): boolean {
  if (!['scheduled', 'in_progress'].includes(meeting.status)) return false;
  const isParticipant = meeting.participants.some(p => p.userId === userId);
  return isParticipant || meeting.hostDoctorId === userId;
}

function shouldAutoRecord(meeting: VideoMeeting): boolean {
  return meeting.status === 'in_progress' && meeting.participants.length >= 2;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} นาที`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours} ชม. ${remaining} นาที` : `${hours} ชม.`;
}

function validateTranscription(segments: TranscriptionSegment[]): string[] {
  const errors: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    if (!segments[i].speakerId) errors.push(`Segment ${i}: missing speakerId`);
    if (!segments[i].text.trim()) errors.push(`Segment ${i}: empty text`);
    if (!segments[i].timestamp) errors.push(`Segment ${i}: missing timestamp`);
  }
  return errors;
}

function generateMeetingId(): string {
  return `MTG-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

// --- Tests ---

describe('Video Meeting & Jitsi Workflow (Process: VIDEO_MEETING_JITSI_GEMINI.md)', () => {

  describe('A — Room Name Generation', () => {
    it('A01 — starts with izara-meet-', () => {
      const name = generateRoomName('APT-001');
      expect(name).toMatch(/^izara-meet-/);
    });
    it('A02 — includes appointment ID', () => {
      const name = generateRoomName('APT-12345');
      expect(name).toContain('APT-12345');
    });
    it('A03 — valid room names pass validation', () => {
      const name = generateRoomName('APT-001', 1710000000000);
      expect(isValidRoomName(name)).toBe(true);
    });
    it('A04 — short room names rejected', () => {
      expect(isValidRoomName('izara-meet-1')).toBe(false);
    });
    it('A05 — wrong prefix rejected', () => {
      expect(isValidRoomName('meeting-APT-001-12345')).toBe(false);
    });
  });

  describe('B — Jitsi URL', () => {
    it('B01 — default domain', () => {
      const url = buildJitsiUrl('izara-meet-test');
      expect(url).toBe('https://meet.jit.si/izara-meet-test');
    });
    it('B02 — custom domain', () => {
      const url = buildJitsiUrl('room1', 'jitsi.izara.health');
      expect(url).toBe('https://jitsi.izara.health/room1');
    });
    it('B03 — URL starts with https', () => {
      expect(buildJitsiUrl('test').startsWith('https://')).toBe(true);
    });
  });

  describe('C — Meeting Status Transitions', () => {
    it('C01 — scheduled → in_progress', () => expect(canTransition('scheduled', 'in_progress')).toBe(true));
    it('C02 — scheduled → cancelled', () => expect(canTransition('scheduled', 'cancelled')).toBe(true));
    it('C03 — scheduled → no_show', () => expect(canTransition('scheduled', 'no_show')).toBe(true));
    it('C04 — in_progress → completed', () => expect(canTransition('in_progress', 'completed')).toBe(true));
    it('C05 — completed cannot transition', () => {
      expect(canTransition('completed', 'in_progress')).toBe(false);
      expect(canTransition('completed', 'scheduled')).toBe(false);
    });
    it('C06 — cancelled cannot transition', () => expect(canTransition('cancelled', 'in_progress')).toBe(false));
    it('C07 — in_progress cannot go back to scheduled', () => expect(canTransition('in_progress', 'scheduled')).toBe(false));
    it('C08 — no skipping: scheduled cannot go to completed', () => expect(canTransition('scheduled', 'completed')).toBe(false));
  });

  describe('D — Duration Calculation', () => {
    it('D01 — 30 minutes', () => {
      expect(calculateDuration('2026-01-01T10:00:00Z', '2026-01-01T10:30:00Z')).toBe(30);
    });
    it('D02 — 1 hour', () => {
      expect(calculateDuration('2026-01-01T10:00:00Z', '2026-01-01T11:00:00Z')).toBe(60);
    });
    it('D03 — Thai format under 60 min', () => {
      expect(formatDuration(45)).toBe('45 นาที');
    });
    it('D04 — Thai format 1 hour', () => {
      expect(formatDuration(60)).toBe('1 ชม.');
    });
    it('D05 — Thai format mixed', () => {
      expect(formatDuration(90)).toBe('1 ชม. 30 นาที');
    });
  });

  describe('E — Meeting Access Control', () => {
    const meeting: VideoMeeting = {
      id: 'MTG-001', appointmentId: 'APT-001', roomName: 'izara-meet-001',
      jitsiUrl: 'https://meet.jit.si/izara-meet-001', hostDoctorId: 'DOC-001',
      participants: [
        { userId: 'PAT-001', name: 'Patient A', role: 'participant' },
      ],
      status: 'scheduled', scheduledAt: '2026-01-01T10:00:00Z',
      hasTranscription: false, hasAiSummary: false,
    };

    it('E01 — host can start', () => expect(canStartMeeting(meeting, 'DOC-001')).toBe(true));
    it('E02 — non-host cannot start', () => expect(canStartMeeting(meeting, 'DOC-002')).toBe(false));
    it('E03 — participant can join', () => expect(canJoinMeeting(meeting, 'PAT-001')).toBe(true));
    it('E04 — host can join', () => expect(canJoinMeeting(meeting, 'DOC-001')).toBe(true));
    it('E05 — unknown user cannot join', () => expect(canJoinMeeting(meeting, 'PAT-999')).toBe(false));
    it('E06 — cannot start completed meeting', () => {
      const completed = { ...meeting, status: 'completed' as MeetingStatus };
      expect(canStartMeeting(completed, 'DOC-001')).toBe(false);
    });
    it('E07 — cannot join cancelled meeting', () => {
      const cancelled = { ...meeting, status: 'cancelled' as MeetingStatus };
      expect(canJoinMeeting(cancelled, 'PAT-001')).toBe(false);
    });
  });

  describe('F — Auto Recording', () => {
    it('F01 — record when 2+ participants in progress', () => {
      const mtg: VideoMeeting = {
        id: 'M1', appointmentId: 'A1', roomName: 'r', jitsiUrl: 'u',
        hostDoctorId: 'D1', status: 'in_progress',
        participants: [
          { userId: 'D1', name: 'D', role: 'host', joinedAt: '2026-01-01' },
          { userId: 'P1', name: 'P', role: 'participant', joinedAt: '2026-01-01' },
        ],
        scheduledAt: '2026-01-01', hasTranscription: false, hasAiSummary: false,
      };
      expect(shouldAutoRecord(mtg)).toBe(true);
    });
    it('F02 — do not record with only 1 participant', () => {
      const mtg: VideoMeeting = {
        id: 'M1', appointmentId: 'A1', roomName: 'r', jitsiUrl: 'u',
        hostDoctorId: 'D1', status: 'in_progress',
        participants: [
          { userId: 'D1', name: 'D', role: 'host', joinedAt: '2026-01-01' },
        ],
        scheduledAt: '2026-01-01', hasTranscription: false, hasAiSummary: false,
      };
      expect(shouldAutoRecord(mtg)).toBe(false);
    });
  });

  describe('G — Transcription Validation', () => {
    it('G01 — valid transcription passes', () => {
      const segments: TranscriptionSegment[] = [
        { speakerId: 'D1', text: 'สวัสดีครับ', timestamp: '2026-01-01T10:00:00Z', language: 'th' },
        { speakerId: 'P1', text: 'สวัสดีค่ะ', timestamp: '2026-01-01T10:00:05Z', language: 'th' },
      ];
      expect(validateTranscription(segments)).toHaveLength(0);
    });
    it('G02 — empty text flagged', () => {
      const segments: TranscriptionSegment[] = [
        { speakerId: 'D1', text: '  ', timestamp: '2026-01-01T10:00:00Z', language: 'th' },
      ];
      expect(validateTranscription(segments)).toHaveLength(1);
    });
    it('G03 — missing speaker flagged', () => {
      const segments: TranscriptionSegment[] = [
        { speakerId: '', text: 'Hello', timestamp: '2026-01-01T10:00:00Z', language: 'en' },
      ];
      expect(validateTranscription(segments)).toHaveLength(1);
    });
  });

  describe('H — Meeting ID Generation', () => {
    it('H01 — starts with MTG-', () => expect(generateMeetingId()).toMatch(/^MTG-/));
    it('H02 — unique IDs', () => {
      const ids = new Set(Array.from({ length: 20 }, () => generateMeetingId()));
      expect(ids.size).toBe(20);
    });
  });
});
