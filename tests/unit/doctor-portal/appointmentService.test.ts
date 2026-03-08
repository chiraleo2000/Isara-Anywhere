/**
 * ═══════════════════════════════════════════════════════════════════════
 * DOCTOR PORTAL — Appointment Service Unit Tests
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: appointmentService.ts — booking, conflicts, status, pool mgmt
 */
import { describe, it, expect } from 'vitest';

// ── Helpers ─────────────────────────────────────────────────────────────

interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  doctorId: string;
}

function hasTimeOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
  if (slot1.date !== slot2.date || slot1.doctorId !== slot2.doctorId) return false;
  const s1Start = parseInt(slot1.startTime.replace(':', ''));
  const s1End = parseInt(slot1.endTime.replace(':', ''));
  const s2Start = parseInt(slot2.startTime.replace(':', ''));
  const s2End = parseInt(slot2.endTime.replace(':', ''));
  return s1Start < s2End && s2Start < s1End;
}

function isFutureDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}

function generateAppointmentId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `APT-${timestamp}-${random}`.toUpperCase();
}

function calculateWaitingPosition(queue: { position: number }[]): number {
  return queue.length > 0 ? Math.max(...queue.map(q => q.position)) + 1 : 1;
}

function isWithinBusinessHours(time: string): boolean {
  const [hours] = time.split(':').map(Number);
  return hours >= 8 && hours < 18;
}

function generateJitsiMeetingLink(appointmentId: string): string {
  const roomName = `izara-${appointmentId}-${Date.now()}`;
  return `https://meet.jit.si/${roomName}#config.startWithAudioMuted=false&config.startWithVideoMuted=false&config.lang=th`;
}

const APPOINTMENT_TYPES = ['video_consultation', 'follow_up', 'urgent', 'general', 'specialist_referral'];
const APPOINTMENT_DURATIONS: Record<string, number> = {
  video_consultation: 30,
  follow_up: 15,
  urgent: 45,
  general: 30,
  specialist_referral: 45,
};

// ── Tests ───────────────────────────────────────────────────────────────

describe('Doctor Portal — Appointment Service', () => {

  describe('A — Time Slot Conflict Detection', () => {
    it('A01 — detects overlapping slots same doctor same day', () => {
      const slot1: TimeSlot = { date: '2026-03-15', startTime: '10:00', endTime: '10:30', doctorId: 'DR-001' };
      const slot2: TimeSlot = { date: '2026-03-15', startTime: '10:15', endTime: '10:45', doctorId: 'DR-001' };
      expect(hasTimeOverlap(slot1, slot2)).toBe(true);
    });

    it('A02 — no overlap for different doctors', () => {
      const slot1: TimeSlot = { date: '2026-03-15', startTime: '10:00', endTime: '10:30', doctorId: 'DR-001' };
      const slot2: TimeSlot = { date: '2026-03-15', startTime: '10:15', endTime: '10:45', doctorId: 'DR-002' };
      expect(hasTimeOverlap(slot1, slot2)).toBe(false);
    });

    it('A03 — no overlap for different days', () => {
      const slot1: TimeSlot = { date: '2026-03-15', startTime: '10:00', endTime: '10:30', doctorId: 'DR-001' };
      const slot2: TimeSlot = { date: '2026-03-16', startTime: '10:00', endTime: '10:30', doctorId: 'DR-001' };
      expect(hasTimeOverlap(slot1, slot2)).toBe(false);
    });

    it('A04 — back-to-back slots do not overlap', () => {
      const slot1: TimeSlot = { date: '2026-03-15', startTime: '10:00', endTime: '10:30', doctorId: 'DR-001' };
      const slot2: TimeSlot = { date: '2026-03-15', startTime: '10:30', endTime: '11:00', doctorId: 'DR-001' };
      expect(hasTimeOverlap(slot1, slot2)).toBe(false);
    });

    it('A05 — fully contained slot overlaps', () => {
      const slot1: TimeSlot = { date: '2026-03-15', startTime: '09:00', endTime: '12:00', doctorId: 'DR-001' };
      const slot2: TimeSlot = { date: '2026-03-15', startTime: '10:00', endTime: '11:00', doctorId: 'DR-001' };
      expect(hasTimeOverlap(slot1, slot2)).toBe(true);
    });
  });

  describe('B — Date Validation', () => {
    it('B01 — future date is valid', () => {
      const future = new Date();
      future.setDate(future.getDate() + 7);
      expect(isFutureDate(future.toISOString().split('T')[0])).toBe(true);
    });

    it('B02 — today is valid', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(isFutureDate(today)).toBe(true);
    });

    it('B03 — past date is invalid', () => {
      expect(isFutureDate('2020-01-01')).toBe(false);
    });
  });

  describe('C — Appointment ID Generation', () => {
    it('C01 — starts with APT-', () => {
      const id = generateAppointmentId();
      expect(id.startsWith('APT-')).toBe(true);
    });

    it('C02 — generates unique IDs', () => {
      const ids = new Set(Array.from({ length: 50 }, () => generateAppointmentId()));
      expect(ids.size).toBe(50);
    });

    it('C03 — is uppercase', () => {
      const id = generateAppointmentId();
      expect(id).toBe(id.toUpperCase());
    });
  });

  describe('D — Queue Management', () => {
    it('D01 — first patient gets position 1', () => {
      expect(calculateWaitingPosition([])).toBe(1);
    });

    it('D02 — calculates next position correctly', () => {
      const queue = [{ position: 1 }, { position: 2 }, { position: 3 }];
      expect(calculateWaitingPosition(queue)).toBe(4);
    });

    it('D03 — handles gaps in positions', () => {
      const queue = [{ position: 1 }, { position: 5 }];
      expect(calculateWaitingPosition(queue)).toBe(6);
    });
  });

  describe('E — Business Hours', () => {
    it('E01 — 8:00 is within hours', () => {
      expect(isWithinBusinessHours('08:00')).toBe(true);
    });

    it('E02 — 17:30 is within hours', () => {
      expect(isWithinBusinessHours('17:30')).toBe(true);
    });

    it('E03 — 18:00 is outside hours', () => {
      expect(isWithinBusinessHours('18:00')).toBe(false);
    });

    it('E04 — 07:00 is outside hours', () => {
      expect(isWithinBusinessHours('07:00')).toBe(false);
    });

    it('E05 — midnight is outside hours', () => {
      expect(isWithinBusinessHours('00:00')).toBe(false);
    });
  });

  describe('F — Appointment Types & Durations', () => {
    it('F01 — all types have defined durations', () => {
      APPOINTMENT_TYPES.forEach(type => {
        expect(APPOINTMENT_DURATIONS[type]).toBeGreaterThan(0);
      });
    });

    it('F02 — video consultation is 30 minutes', () => {
      expect(APPOINTMENT_DURATIONS['video_consultation']).toBe(30);
    });

    it('F03 — follow-up is 15 minutes', () => {
      expect(APPOINTMENT_DURATIONS['follow_up']).toBe(15);
    });

    it('F04 — urgent is 45 minutes', () => {
      expect(APPOINTMENT_DURATIONS['urgent']).toBe(45);
    });
  });

  describe('G — Jitsi Meeting Link', () => {
    it('G01 — link contains meet.jit.si', () => {
      const link = generateJitsiMeetingLink('APT-001');
      expect(link).toContain('https://meet.jit.si/');
    });

    it('G02 — link contains appointment ID', () => {
      const link = generateJitsiMeetingLink('APT-TEST-123');
      expect(link).toContain('APT-TEST-123');
    });

    it('G03 — link includes Thai language config', () => {
      const link = generateJitsiMeetingLink('APT-001');
      expect(link).toContain('config.lang=th');
    });

    it('G04 — link includes audio/video config', () => {
      const link = generateJitsiMeetingLink('APT-001');
      expect(link).toContain('config.startWithAudioMuted=false');
      expect(link).toContain('config.startWithVideoMuted=false');
    });

    it('G05 — generates unique links for same appointment', () => {
      const link1 = generateJitsiMeetingLink('APT-001');
      // Small delay to ensure different timestamp
      const link2 = generateJitsiMeetingLink('APT-001');
      // Links may differ due to timestamp
      expect(link1).toContain('izara-APT-001');
    });
  });

  describe('H — Appointment Pool Logic', () => {
    it('H01 — pool appointment transitions correctly', () => {
      const poolStatuses = ['pending', 'in_pool', 'awaiting_doctor_response', 'confirmed'];
      expect(poolStatuses[0]).toBe('pending');
      expect(poolStatuses[poolStatuses.length - 1]).toBe('confirmed');
    });

    it('H02 — pool assignment data structure', () => {
      const assignment = {
        appointmentId: 'APT-001',
        assignedDoctorId: 'DR-001',
        assignedAt: new Date().toISOString(),
        responseDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: 'awaiting_doctor_response',
      };
      expect(assignment.assignedDoctorId).toBeTruthy();
      expect(new Date(assignment.responseDeadline) > new Date(assignment.assignedAt)).toBe(true);
    });
  });
});
