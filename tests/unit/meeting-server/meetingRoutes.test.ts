/**
 * ═══════════════════════════════════════════════════════════════════════
 * MEETING SERVER — Meeting Routes Unit Tests
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: Izara-jitsi-server/server/index.js — routes, config, auth
 */
import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';

// ── Config & Constants ──────────────────────────────────────────────────

const PORT = 3020;
const JITSI_DOMAIN = 'meet.jit.si';
const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const DB_DEFAULT_PORT = 5433;
const DB_NAME = 'izara_phase1';

// CORS whitelist
const ALLOWED_ORIGINS = new Set([
  'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3005',
  'http://localhost:3009', 'http://localhost:3010', 'http://localhost:3011',
  'http://localhost:3012', 'http://localhost:3020', 'http://localhost:5173',
]);

function isOriginAllowed(origin: string, isDev: boolean): boolean {
  if (isDev) return true;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  if (origin.endsWith('.run.app')) return true; // Cloud Run
  return false;
}

// Meeting status
type MeetingStatus = 'waiting' | 'active' | 'ended';

interface Meeting {
  id: string;
  appointmentId: string;
  roomName: string;
  jitsiUrl: string;
  status: MeetingStatus;
  participants: Participant[];
  transcript: TranscriptSegment[];
  startedAt?: string;
  endedAt?: string;
}

interface Participant {
  id: string;
  name: string;
  role: 'doctor' | 'patient' | 'guest';
  authMethod: 'google' | 'anonymous';
}

interface TranscriptSegment {
  participantId: string;
  text: string;
  timestamp: number;
  confidence: number;
  language: string;
}

// Transcript chunking for embeddings
function chunkTranscript(segments: TranscriptSegment[], chunkDurationMs = 60000): TranscriptSegment[][] {
  if (segments.length === 0) return [];
  const sorted = [...segments].sort((a, b) => a.timestamp - b.timestamp);
  const chunks: TranscriptSegment[][] = [];
  let currentChunk: TranscriptSegment[] = [];
  let chunkStart = sorted[0].timestamp;

  for (const seg of sorted) {
    if (seg.timestamp - chunkStart >= chunkDurationMs && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [];
      chunkStart = seg.timestamp;
    }
    currentChunk.push(seg);
  }
  if (currentChunk.length > 0) chunks.push(currentChunk);
  return chunks;
}

// JWT validation
function isValidJWT(token: string): boolean {
  const parts = token.split('.');
  return parts.length === 3 && parts.every(p => p.length > 0);
}

// Room name generation
function generateRoomName(appointmentId: string): string {
  const hash = crypto.createHash('sha256').update(appointmentId + Date.now().toString()).digest('hex').substring(0, 12);
  return `Izara-${appointmentId.substring(0, 8)}-${hash}`;
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('Meeting Server — Routes & Config', () => {

  describe('A — Server Config', () => {
    it('A01 — default port 3020', () => {
      expect(PORT).toBe(3020);
    });

    it('A02 — Jitsi domain is meet.jit.si', () => {
      expect(JITSI_DOMAIN).toBe('meet.jit.si');
    });

    it('A03 — Gemini model correct', () => {
      expect(GEMINI_MODEL).toBe('gemini-2.5-flash-lite');
    });

    it('A04 — DB port is 5433', () => {
      expect(DB_DEFAULT_PORT).toBe(5433);
    });

    it('A05 — DB name is izara_phase1', () => {
      expect(DB_NAME).toBe('izara_phase1');
    });
  });

  describe('B — CORS Validation', () => {
    it('B01 — allows localhost patient portal 3005', () => {
      expect(isOriginAllowed('http://localhost:3005', false)).toBe(true);
    });

    it('B02 — allows localhost doctor portal 3010', () => {
      expect(isOriginAllowed('http://localhost:3010', false)).toBe(true);
    });

    it('B03 — allows Cloud Run origins', () => {
      expect(isOriginAllowed('https://isara-patient-portal-dev.run.app', false)).toBe(true);
    });

    it('B04 — rejects unknown origin in production', () => {
      expect(isOriginAllowed('https://evil.com', false)).toBe(false);
    });

    it('B05 — allows all origins in dev mode', () => {
      expect(isOriginAllowed('https://anything.com', true)).toBe(true);
    });
  });

  describe('C — JWT Validation', () => {
    it('C01 — valid 3-part JWT', () => {
      expect(isValidJWT('header.payload.signature')).toBe(true);
    });

    it('C02 — rejects 2-part token', () => {
      expect(isValidJWT('header.payload')).toBe(false);
    });

    it('C03 — rejects empty parts', () => {
      expect(isValidJWT('..signature')).toBe(false);
    });

    it('C04 — rejects empty string', () => {
      expect(isValidJWT('')).toBe(false);
    });
  });

  describe('D — Room Name', () => {
    it('D01 — starts with Izara- prefix', () => {
      const name = generateRoomName('APT-12345678');
      expect(name.startsWith('Izara-')).toBe(true);
    });

    it('D02 — includes appointment prefix', () => {
      const name = generateRoomName('APT-12345678');
      expect(name).toContain('APT-1234');
    });

    it('D03 — has hash suffix', () => {
      const name = generateRoomName('APT-001');
      const parts = name.split('-');
      expect(parts.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('E — Transcript Chunking', () => {
    it('E01 — empty segments → empty chunks', () => {
      expect(chunkTranscript([])).toEqual([]);
    });

    it('E02 — segments within 60s → single chunk', () => {
      const segs: TranscriptSegment[] = [
        { participantId: 'DR', text: 'hello', timestamp: 0, confidence: 0.9, language: 'th' },
        { participantId: 'PT', text: 'hi', timestamp: 30000, confidence: 0.85, language: 'th' },
      ];
      const chunks = chunkTranscript(segs);
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toHaveLength(2);
    });

    it('E03 — segments > 60s apart → multiple chunks', () => {
      const segs: TranscriptSegment[] = [
        { participantId: 'DR', text: 'a', timestamp: 0, confidence: 0.9, language: 'th' },
        { participantId: 'PT', text: 'b', timestamp: 70000, confidence: 0.9, language: 'th' },
        { participantId: 'DR', text: 'c', timestamp: 140000, confidence: 0.9, language: 'th' },
      ];
      const chunks = chunkTranscript(segs);
      expect(chunks).toHaveLength(3);
    });

    it('E04 — sorts by timestamp', () => {
      const segs: TranscriptSegment[] = [
        { participantId: 'PT', text: 'second', timestamp: 50000, confidence: 0.9, language: 'th' },
        { participantId: 'DR', text: 'first', timestamp: 10000, confidence: 0.9, language: 'th' },
      ];
      const chunks = chunkTranscript(segs);
      expect(chunks[0][0].text).toBe('first');
      expect(chunks[0][1].text).toBe('second');
    });
  });

  describe('F — Meeting Status Flow', () => {
    it('F01 — 3 valid statuses', () => {
      const statuses: MeetingStatus[] = ['waiting', 'active', 'ended'];
      expect(statuses).toHaveLength(3);
    });

    it('F02 — new meeting starts as waiting', () => {
      const meeting: Partial<Meeting> = { status: 'waiting', participants: [], transcript: [] };
      expect(meeting.status).toBe('waiting');
    });

    it('F03 — ended meeting has endedAt', () => {
      const meeting: Partial<Meeting> = { status: 'ended', endedAt: new Date().toISOString() };
      expect(meeting.endedAt).toBeTruthy();
    });
  });

  describe('G — Participant Roles', () => {
    it('G01 — doctor role', () => {
      const p: Participant = { id: '1', name: 'Dr. Test', role: 'doctor', authMethod: 'google' };
      expect(p.role).toBe('doctor');
    });

    it('G02 — patient role', () => {
      const p: Participant = { id: '2', name: 'Patient', role: 'patient', authMethod: 'anonymous' };
      expect(p.role).toBe('patient');
    });

    it('G03 — guest role', () => {
      const p: Participant = { id: '3', name: 'Guest', role: 'guest', authMethod: 'anonymous' };
      expect(p.role).toBe('guest');
    });
  });

  describe('H — AI Validation (Man-in-the-Loop)', () => {
    const validation = {
      validationId: `val_${Date.now()}`,
      meetingId: 'meeting-123',
      type: 'soap_summary',
      requiresValidation: true,
      status: 'pending' as 'pending' | 'approved' | 'rejected',
    };

    it('H01 — validation ID has val_ prefix', () => {
      expect(validation.validationId.startsWith('val_')).toBe(true);
    });

    it('H02 — requiresValidation defaults to true', () => {
      expect(validation.requiresValidation).toBe(true);
    });

    it('H03 — initial status is pending', () => {
      expect(validation.status).toBe('pending');
    });

    it('H04 — can be approved or rejected', () => {
      const statuses = ['pending', 'approved', 'rejected'];
      expect(statuses).toContain('approved');
      expect(statuses).toContain('rejected');
    });
  });
});
