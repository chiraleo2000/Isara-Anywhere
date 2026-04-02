/**
 * ═══════════════════════════════════════════════════════════════════════
 * Schedule Management Logic Tests (Doctor Portal)
 * Tests: Schedule parsing, slot generation, availability checks, conflicts
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';

// --- Types ---
interface DoctorSchedule {
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  isAvailable: boolean;
}

interface ScheduleSlot {
  day: number;
  time: string;
  endTime: string;
  available: boolean;
  booked: boolean;
}

// --- Functions ---

function getDayName(day: number): { en: string; th: string } {
  const names: { en: string; th: string }[] = [
    { en: 'Sunday', th: 'วันอาทิตย์' },
    { en: 'Monday', th: 'วันจันทร์' },
    { en: 'Tuesday', th: 'วันอังคาร' },
    { en: 'Wednesday', th: 'วันพุธ' },
    { en: 'Thursday', th: 'วันพฤหัสบดี' },
    { en: 'Friday', th: 'วันศุกร์' },
    { en: 'Saturday', th: 'วันเสาร์' },
  ];
  return names[day] || { en: 'Unknown', th: 'ไม่ทราบ' };
}

function generateSlotsForDay(schedule: DoctorSchedule): ScheduleSlot[] {
  if (!schedule.isAvailable) return [];
  const slots: ScheduleSlot[] = [];
  const [startH, startM] = schedule.startTime.split(':').map(Number);
  const [endH, endM] = schedule.endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  for (let m = startMinutes; m < endMinutes; m += schedule.slotDurationMinutes) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const endSlotM = m + schedule.slotDurationMinutes;
    const endSlotH = Math.floor(endSlotM / 60);
    const endSlotMin = endSlotM % 60;
    slots.push({
      day: schedule.dayOfWeek,
      time: `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
      endTime: `${String(endSlotH).padStart(2, '0')}:${String(endSlotMin).padStart(2, '0')}`,
      available: true,
      booked: false,
    });
  }
  return slots;
}

function getWeeklySlotCount(schedules: DoctorSchedule[]): number {
  return schedules.reduce((sum, s) => sum + generateSlotsForDay(s).length, 0);
}

function hasScheduleConflict(existing: DoctorSchedule[], newSchedule: DoctorSchedule): boolean {
  return existing.some(e =>
    e.dayOfWeek === newSchedule.dayOfWeek &&
    e.isAvailable &&
    e.startTime < newSchedule.endTime &&
    e.endTime > newSchedule.startTime
  );
}

function getAvailableDays(schedules: DoctorSchedule[]): number[] {
  return schedules.filter(s => s.isAvailable).map(s => s.dayOfWeek);
}

// --- Test Data ---
const WEEKLY_SCHEDULE: DoctorSchedule[] = [
  { dayOfWeek: 1, startTime: '09:00', endTime: '12:00', slotDurationMinutes: 30, isAvailable: true },
  { dayOfWeek: 1, startTime: '13:00', endTime: '17:00', slotDurationMinutes: 30, isAvailable: true },
  { dayOfWeek: 3, startTime: '09:00', endTime: '12:00', slotDurationMinutes: 30, isAvailable: true },
  { dayOfWeek: 5, startTime: '14:00', endTime: '18:00', slotDurationMinutes: 30, isAvailable: true },
  { dayOfWeek: 0, startTime: '09:00', endTime: '12:00', slotDurationMinutes: 30, isAvailable: false },
];

// --- Tests ---

describe('Schedule — Day Names', () => {
  it('SCH01 — Monday has Thai name', () => {
    expect(getDayName(1).th).toBe('วันจันทร์');
  });

  it('SCH02 — all 7 days have names', () => {
    for (let d = 0; d < 7; d++) {
      const name = getDayName(d);
      expect(name.en).toBeTruthy();
      expect(name.th).toBeTruthy();
    }
  });

  it('SCH03 — invalid day returns Unknown', () => {
    expect(getDayName(8).en).toBe('Unknown');
  });
});

describe('Schedule — Slot Generation', () => {
  it('SCH04 — 3-hour block generates 6 x 30-min slots', () => {
    const sched: DoctorSchedule = { dayOfWeek: 1, startTime: '09:00', endTime: '12:00', slotDurationMinutes: 30, isAvailable: true };
    const slots = generateSlotsForDay(sched);
    expect(slots).toHaveLength(6);
  });

  it('SCH05 — unavailable day generates no slots', () => {
    const sched: DoctorSchedule = { dayOfWeek: 0, startTime: '09:00', endTime: '12:00', slotDurationMinutes: 30, isAvailable: false };
    expect(generateSlotsForDay(sched)).toHaveLength(0);
  });

  it('SCH06 — first slot starts at schedule start', () => {
    const sched: DoctorSchedule = { dayOfWeek: 1, startTime: '09:00', endTime: '12:00', slotDurationMinutes: 30, isAvailable: true };
    const slots = generateSlotsForDay(sched);
    expect(slots[0].time).toBe('09:00');
  });

  it('SCH07 — last slot ends before schedule end', () => {
    const sched: DoctorSchedule = { dayOfWeek: 1, startTime: '09:00', endTime: '12:00', slotDurationMinutes: 30, isAvailable: true };
    const slots = generateSlotsForDay(sched);
    expect(slots.at(-1)!.time).toBe('11:30');
  });

  it('SCH08 — 15-min slots generate more slots', () => {
    const sched: DoctorSchedule = { dayOfWeek: 1, startTime: '09:00', endTime: '10:00', slotDurationMinutes: 15, isAvailable: true };
    expect(generateSlotsForDay(sched)).toHaveLength(4);
  });
});

describe('Schedule — Weekly Count', () => {
  it('SCH09 — weekly slot count matches sum', () => {
    const count = getWeeklySlotCount(WEEKLY_SCHEDULE);
    // Mon AM: 6 + Mon PM: 8 + Wed: 6 + Fri: 8 + Sun: 0 = 28
    expect(count).toBe(28);
  });

  it('SCH10 — empty schedule has 0 slots', () => {
    expect(getWeeklySlotCount([])).toBe(0);
  });
});

describe('Schedule — Conflicts', () => {
  it('SCH11 — overlapping times on same day is conflict', () => {
    const newSched: DoctorSchedule = { dayOfWeek: 1, startTime: '10:00', endTime: '14:00', slotDurationMinutes: 30, isAvailable: true };
    expect(hasScheduleConflict(WEEKLY_SCHEDULE, newSched)).toBe(true);
  });

  it('SCH12 — different day is not conflict', () => {
    const newSched: DoctorSchedule = { dayOfWeek: 2, startTime: '09:00', endTime: '12:00', slotDurationMinutes: 30, isAvailable: true };
    expect(hasScheduleConflict(WEEKLY_SCHEDULE, newSched)).toBe(false);
  });

  it('SCH13 — adjacent non-overlapping is not conflict', () => {
    const newSched: DoctorSchedule = { dayOfWeek: 1, startTime: '12:00', endTime: '13:00', slotDurationMinutes: 30, isAvailable: true };
    expect(hasScheduleConflict(WEEKLY_SCHEDULE, newSched)).toBe(false);
  });
});

describe('Schedule — Available Days', () => {
  it('SCH14 — returns only enabled days', () => {
    const days = getAvailableDays(WEEKLY_SCHEDULE);
    expect(days).toContain(1);
    expect(days).toContain(3);
    expect(days).toContain(5);
    expect(days).not.toContain(0); // Sunday disabled
  });
});
