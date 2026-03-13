// ============================================================================
// Queue Management Workflow Tests
// Based on: Processes/Pages/Doctor-Portal/06_Queue_Management_Page.md
// Tests: Real-time queue, call/skip/complete, priority ordering, wait time
// ============================================================================

import { describe, it, expect } from 'vitest';

// --- Types ---

type QueueStatus = 'waiting' | 'called' | 'in_consultation' | 'completed' | 'skipped' | 'no_show';

interface QueueEntry {
  id: string;
  queueNumber: number;
  patientId: string;
  patientName: string;
  appointmentId: string;
  doctorId: string;
  status: QueueStatus;
  priority: 'normal' | 'high' | 'urgent';
  checkedInAt: string;
  calledAt?: string;
  completedAt?: string;
  estimatedWaitMinutes: number;
}

// --- Constants ---

const QUEUE_TRANSITIONS: Record<QueueStatus, QueueStatus[]> = {
  waiting: ['called', 'skipped', 'no_show'],
  called: ['in_consultation', 'skipped', 'no_show'],
  in_consultation: ['completed'],
  completed: [],
  skipped: ['waiting'],
  no_show: [],
};

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, normal: 2 };

const QUEUE_STATUS_TH: Record<QueueStatus, string> = {
  waiting: 'กำลังรอ',
  called: 'เรียกแล้ว',
  in_consultation: 'กำลังพบแพทย์',
  completed: 'เสร็จสิ้น',
  skipped: 'ข้ามคิว',
  no_show: 'ไม่มา',
};

// --- Helper Functions ---

function canTransition(current: QueueStatus, next: QueueStatus): boolean {
  return QUEUE_TRANSITIONS[current]?.includes(next) ?? false;
}

function sortQueue(entries: QueueEntry[]): QueueEntry[] {
  return [...entries].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 2;
    const pb = PRIORITY_ORDER[b.priority] ?? 2;
    if (pa !== pb) return pa - pb;
    return a.queueNumber - b.queueNumber;
  });
}

function getWaitingCount(entries: QueueEntry[]): number {
  return entries.filter(e => e.status === 'waiting').length;
}

function getNextInQueue(entries: QueueEntry[]): QueueEntry | undefined {
  const sorted = sortQueue(entries.filter(e => e.status === 'waiting'));
  return sorted[0];
}

function calculateEstimatedWait(position: number, avgConsultMinutes = 15): number {
  return position * avgConsultMinutes;
}

function generateQueueNumber(date: string, sequence: number): string {
  const dateShort = date.replaceAll('-', '').substring(2);
  return `Q${dateShort}-${sequence.toString().padStart(3, '0')}`;
}

function getQueueStats(entries: QueueEntry[]): { waiting: number; inConsultation: number; completed: number; skipped: number } {
  return {
    waiting: entries.filter(e => e.status === 'waiting').length,
    inConsultation: entries.filter(e => e.status === 'in_consultation').length,
    completed: entries.filter(e => e.status === 'completed').length,
    skipped: entries.filter(e => e.status === 'skipped').length,
  };
}

function calculateAvgWaitTime(entries: QueueEntry[]): number {
  const completedEntries = entries.filter(
    (e): e is QueueEntry & { calledAt: string } => !!e.calledAt && e.status === 'completed'
  );
  if (completedEntries.length === 0) return 0;
  const totalWait = completedEntries.reduce((sum, e) => {
    const checkIn = new Date(e.checkedInAt).getTime();
    const called = new Date(e.calledAt).getTime();
    return sum + (called - checkIn) / 60000;
  }, 0);
  return Math.round(totalWait / completedEntries.length);
}

// --- Tests ---

describe('Queue Management Workflow (Process: 06_Queue_Management_Page.md)', () => {

  describe('A — Queue Transitions', () => {
    it('A01 — waiting → called', () => expect(canTransition('waiting', 'called')).toBe(true));
    it('A02 — waiting → skipped', () => expect(canTransition('waiting', 'skipped')).toBe(true));
    it('A03 — called → in_consultation', () => expect(canTransition('called', 'in_consultation')).toBe(true));
    it('A04 — in_consultation → completed', () => expect(canTransition('in_consultation', 'completed')).toBe(true));
    it('A05 — completed is terminal', () => expect(QUEUE_TRANSITIONS.completed).toHaveLength(0));
    it('A06 — skipped → waiting (re-queue)', () => expect(canTransition('skipped', 'waiting')).toBe(true));
    it('A07 — completed cannot go back', () => expect(canTransition('completed', 'waiting')).toBe(false));
    it('A08 — waiting cannot skip to in_consultation', () => expect(canTransition('waiting', 'in_consultation')).toBe(false));
  });

  describe('B — Priority Sorting', () => {
    const entries: QueueEntry[] = [
      { id: '1', queueNumber: 1, patientId: 'P1', patientName: 'A', appointmentId: 'A1', doctorId: 'D1', status: 'waiting', priority: 'normal', checkedInAt: '2026-01-01T08:00:00Z', estimatedWaitMinutes: 30 },
      { id: '2', queueNumber: 2, patientId: 'P2', patientName: 'B', appointmentId: 'A2', doctorId: 'D1', status: 'waiting', priority: 'urgent', checkedInAt: '2026-01-01T08:05:00Z', estimatedWaitMinutes: 0 },
      { id: '3', queueNumber: 3, patientId: 'P3', patientName: 'C', appointmentId: 'A3', doctorId: 'D1', status: 'waiting', priority: 'high', checkedInAt: '2026-01-01T08:10:00Z', estimatedWaitMinutes: 15 },
    ];

    it('B01 — urgent gets first position', () => {
      const sorted = sortQueue(entries);
      expect(sorted[0].priority).toBe('urgent');
    });
    it('B02 — high comes before normal', () => {
      const sorted = sortQueue(entries);
      expect(sorted[1].priority).toBe('high');
      expect(sorted[2].priority).toBe('normal');
    });
    it('B03 — same priority sorted by queue number', () => {
      const sameP: QueueEntry[] = [
        { ...entries[0], queueNumber: 5 },
        { ...entries[0], id: '4', queueNumber: 2 },
      ];
      const sorted = sortQueue(sameP);
      expect(sorted[0].queueNumber).toBe(2);
    });
  });

  describe('C — Queue Counting', () => {
    const entries: QueueEntry[] = [
      { id: '1', queueNumber: 1, patientId: 'P1', patientName: 'A', appointmentId: 'A1', doctorId: 'D1', status: 'waiting', priority: 'normal', checkedInAt: '2026-01-01', estimatedWaitMinutes: 0 },
      { id: '2', queueNumber: 2, patientId: 'P2', patientName: 'B', appointmentId: 'A2', doctorId: 'D1', status: 'in_consultation', priority: 'normal', checkedInAt: '2026-01-01', estimatedWaitMinutes: 0 },
      { id: '3', queueNumber: 3, patientId: 'P3', patientName: 'C', appointmentId: 'A3', doctorId: 'D1', status: 'completed', priority: 'normal', checkedInAt: '2026-01-01', estimatedWaitMinutes: 0 },
      { id: '4', queueNumber: 4, patientId: 'P4', patientName: 'D', appointmentId: 'A4', doctorId: 'D1', status: 'waiting', priority: 'normal', checkedInAt: '2026-01-01', estimatedWaitMinutes: 0 },
    ];

    it('C01 — 2 waiting', () => expect(getWaitingCount(entries)).toBe(2));
    it('C02 — stats breakdown', () => {
      const stats = getQueueStats(entries);
      expect(stats.waiting).toBe(2);
      expect(stats.inConsultation).toBe(1);
      expect(stats.completed).toBe(1);
    });
    it('C03 — next is first waiting by queue number', () => {
      const next = getNextInQueue(entries);
      expect(next?.queueNumber).toBe(1);
    });
  });

  describe('D — Wait Time', () => {
    it('D01 — 15 min avg per position', () => expect(calculateEstimatedWait(3)).toBe(45));
    it('D02 — first position = 0 wait', () => expect(calculateEstimatedWait(0)).toBe(0));
    it('D03 — custom avg time', () => expect(calculateEstimatedWait(2, 20)).toBe(40));
  });

  describe('E — Queue Number Generation', () => {
    it('E01 — format is Q + date + sequence', () => {
      expect(generateQueueNumber('2026-06-01', 1)).toBe('Q260601-001');
    });
    it('E02 — sequence padding', () => {
      expect(generateQueueNumber('2026-06-01', 42)).toBe('Q260601-042');
    });
    it('E03 — high sequence', () => {
      expect(generateQueueNumber('2026-12-31', 100)).toBe('Q261231-100');
    });
  });

  describe('F — Thai Status Labels', () => {
    it('F01 — all 6 statuses have Thai labels', () => {
      const statuses: QueueStatus[] = ['waiting', 'called', 'in_consultation', 'completed', 'skipped', 'no_show'];
      for (const s of statuses) {
        expect(QUEUE_STATUS_TH[s]).toBeTruthy();
      }
    });
    it('F02 — waiting is กำลังรอ', () => expect(QUEUE_STATUS_TH.waiting).toBe('กำลังรอ'));
    it('F03 — completed is เสร็จสิ้น', () => expect(QUEUE_STATUS_TH.completed).toBe('เสร็จสิ้น'));
  });

  describe('G — Average Wait Time', () => {
    it('G01 — calculates avg from completed entries', () => {
      const entries: QueueEntry[] = [
        { id: '1', queueNumber: 1, patientId: 'P1', patientName: 'A', appointmentId: 'A1', doctorId: 'D1', status: 'completed', priority: 'normal', checkedInAt: '2026-01-01T08:00:00Z', calledAt: '2026-01-01T08:10:00Z', estimatedWaitMinutes: 0 },
        { id: '2', queueNumber: 2, patientId: 'P2', patientName: 'B', appointmentId: 'A2', doctorId: 'D1', status: 'completed', priority: 'normal', checkedInAt: '2026-01-01T08:05:00Z', calledAt: '2026-01-01T08:25:00Z', estimatedWaitMinutes: 0 },
      ];
      expect(calculateAvgWaitTime(entries)).toBe(15); // (10+20)/2
    });
    it('G02 — empty queue returns 0', () => expect(calculateAvgWaitTime([])).toBe(0));
  });
});
