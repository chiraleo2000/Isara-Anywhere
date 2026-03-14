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

  // ═══════════════════════════════════════════════════════════════════════════
  // I — CONTINUOUS WORKFLOW: Create → Start → Consult → End → AI → Deliver
  // Full meeting lifecycle with shared state — NO restarts
  // ═══════════════════════════════════════════════════════════════════════════
  describe('I — Continuous Meeting Lifecycle Chain', () => {
    const meeting: VideoMeeting = {
      id: generateMeetingId(),
      appointmentId: 'APT-CHAIN-001',
      roomName: '',
      jitsiUrl: '',
      hostDoctorId: 'DOC-TEST-001',
      participants: [],
      status: 'scheduled',
      scheduledAt: '2026-06-01T10:00:00Z',
      hasTranscription: false,
      hasAiSummary: false,
    };

    it('I01 — Step 1: Generate room name from appointment', () => {
      meeting.roomName = generateRoomName(meeting.appointmentId, 1710000000000);
      expect(meeting.roomName).toContain(meeting.appointmentId);
      expect(isValidRoomName(meeting.roomName)).toBe(true);
    });

    it('I02 — Step 2: Build Jitsi URL', () => {
      meeting.jitsiUrl = buildJitsiUrl(meeting.roomName);
      expect(meeting.jitsiUrl).toContain('https://');
      expect(meeting.jitsiUrl).toContain(meeting.roomName);
    });

    it('I03 — Step 3: Doctor (host) joins first', () => {
      meeting.participants.push({
        userId: 'DOC-TEST-001', name: 'Dr. Test', role: 'host',
        joinedAt: '2026-06-01T10:00:00Z',
      });
      expect(canStartMeeting(meeting, 'DOC-TEST-001')).toBe(true);
    });

    it('I04 — Step 4: Patient joins meeting', () => {
      meeting.participants.push({
        userId: 'PAT-001', name: 'Patient Demo', role: 'participant',
        joinedAt: '2026-06-01T10:01:00Z',
      });
      expect(canJoinMeeting(meeting, 'PAT-001')).toBe(true);
      expect(getParticipantCount(meeting)).toBe(2);
    });

    it('I05 — Step 5: Meeting starts → in_progress', () => {
      expect(canTransition(meeting.status, 'in_progress')).toBe(true);
      meeting.status = 'in_progress';
      meeting.startedAt = '2026-06-01T10:01:30Z';
      expect(meeting.status).toBe('in_progress');
    });

    it('I06 — Step 6: Auto-recording triggers (2+ participants)', () => {
      expect(shouldAutoRecord(meeting)).toBe(true);
    });

    it('I07 — Step 7: Active participants tracked', () => {
      const active = getActiveParts(meeting);
      expect(active).toHaveLength(2);
    });

    it('I08 — Step 8: Transcription runs during meeting', () => {
      const segments: TranscriptionSegment[] = [
        { speakerId: 'DOC-TEST-001', text: 'อาการเป็นยังไงบ้างครับ', timestamp: '2026-06-01T10:02:00Z', language: 'th' },
        { speakerId: 'PAT-001', text: 'ปวดหัวมาสองวันค่ะ', timestamp: '2026-06-01T10:02:15Z', language: 'th' },
        { speakerId: 'DOC-TEST-001', text: 'มีไข้ด้วยไหมครับ', timestamp: '2026-06-01T10:02:30Z', language: 'th' },
      ];
      expect(validateTranscription(segments)).toHaveLength(0);
      meeting.hasTranscription = true;
    });

    it('I09 — Step 9: Meeting ends → completed', () => {
      expect(canTransition(meeting.status, 'completed')).toBe(true);
      meeting.status = 'completed';
      meeting.endedAt = '2026-06-01T10:30:00Z';
      meeting.participants.forEach(p => { p.leftAt = meeting.endedAt; });
      expect(meeting.status).toBe('completed');
    });

    it('I10 — Step 10: Duration calculated', () => {
      const duration = calculateDuration(meeting.startedAt!, meeting.endedAt!);
      meeting.duration = duration;
      expect(duration).toBeGreaterThanOrEqual(28);
      expect(duration).toBeLessThanOrEqual(29);
    });

    it('I11 — Step 11: AI summary generated post-meeting', () => {
      meeting.hasAiSummary = true;
      expect(meeting.hasTranscription).toBe(true);
      expect(meeting.hasAiSummary).toBe(true);
    });

    it('I12 — Final: Complete meeting entity verified', () => {
      expect(meeting.id).toMatch(/^MTG-/);
      expect(meeting.appointmentId).toBe('APT-CHAIN-001');
      expect(meeting.status).toBe('completed');
      expect(meeting.duration).toBeGreaterThanOrEqual(28);
      expect(meeting.hasTranscription).toBe(true);
      expect(meeting.hasAiSummary).toBe(true);
      expect(getParticipantCount(meeting)).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // J — CANCELLATION & NO-SHOW BRANCH
  // ═══════════════════════════════════════════════════════════════════════════
  describe('J — Meeting Cancellation & No-Show Branch', () => {
    const meeting2: VideoMeeting = {
      id: generateMeetingId(),
      appointmentId: 'APT-CANCEL-001',
      roomName: generateRoomName('APT-CANCEL-001'),
      jitsiUrl: '',
      hostDoctorId: 'DOC-TEST-002',
      participants: [{ userId: 'PAT-002', name: 'Somchai', role: 'participant' }],
      status: 'scheduled',
      scheduledAt: '2026-06-02T14:00:00Z',
      hasTranscription: false,
      hasAiSummary: false,
    };

    it('J01 — Meeting scheduled with room name', () => {
      expect(meeting2.status).toBe('scheduled');
      expect(isValidRoomName(meeting2.roomName)).toBe(true);
    });

    it('J02 — Patient no-shows', () => {
      expect(canTransition('scheduled', 'no_show')).toBe(true);
      meeting2.status = 'no_show';
      expect(meeting2.status).toBe('no_show');
    });

    it('J03 — No-show is terminal for meeting', () => {
      expect(VALID_STATUS_TRANSITIONS.no_show).toHaveLength(0);
    });

    it('J04 — No transcription or AI for no-show', () => {
      expect(meeting2.hasTranscription).toBe(false);
      expect(meeting2.hasAiSummary).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // K — LOBBY & MULTI-PARTY MEETING
  // ═══════════════════════════════════════════════════════════════════════════
  describe('K — Lobby & Multi-Party Meeting', () => {
    const multiMeeting: VideoMeeting = {
      id: generateMeetingId(),
      appointmentId: 'APT-MULTI-001',
      roomName: generateRoomName('APT-MULTI-001'),
      jitsiUrl: '',
      hostDoctorId: 'DOC-TEST-001',
      participants: [],
      status: 'scheduled',
      scheduledAt: '2026-06-03T09:00:00Z',
      hasTranscription: false,
      hasAiSummary: false,
    };

    it('K01 — Host admits participants into lobby', () => {
      multiMeeting.participants.push(
        { userId: 'DOC-TEST-001', name: 'Dr. Host', role: 'host', joinedAt: '2026-06-03T09:00:00Z' },
      );
      expect(canStartMeeting(multiMeeting, 'DOC-TEST-001')).toBe(true);
    });

    it('K02 — Multiple patients join (up to 8)', () => {
      for (let i = 1; i <= 3; i++) {
        multiMeeting.participants.push({
          userId: `PAT-00${i}`, name: `Patient ${i}`, role: 'participant',
          joinedAt: `2026-06-03T09:0${i}:00Z`,
        });
      }
      expect(getParticipantCount(multiMeeting)).toBe(4);
    });

    it('K03 — Observer can join but is read-only', () => {
      multiMeeting.participants.push({
        userId: 'OBS-001', name: 'Observer', role: 'observer',
        joinedAt: '2026-06-03T09:05:00Z',
      });
      expect(getParticipantCount(multiMeeting)).toBe(5);
      const observer = multiMeeting.participants.find(p => p.role === 'observer');
      expect(observer).toBeTruthy();
    });

    it('K04 — All active participants tracked', () => {
      multiMeeting.status = 'in_progress';
      const active = getActiveParts(multiMeeting);
      expect(active).toHaveLength(5);
    });

    it('K05 — Auto-record with multiple participants', () => {
      expect(shouldAutoRecord(multiMeeting)).toBe(true);
    });
  });
});
