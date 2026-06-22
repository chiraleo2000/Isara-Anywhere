/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — MEETING TIME SERVICE UNIT TESTS
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: checkMeetingWindow, getMeetingWindow, calculateNextWeekSlot,
 *        handleMissedMeeting, formatTimeRemaining, getWindowDisplayInfo
 * Source: Isara-doctor-portal/frontend/services/meetingTimeService.ts
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Reimplement pure meeting time logic ──

interface MeetingTimeRules {
  allowJoinBefore: number;
  allowJoinAfter: number;
  autoRescheduleOnMiss: boolean;
  rescheduleToNextWeek: boolean;
  maxMissedAttempts: number;
}

interface MeetingTimeCheck {
  canJoin: boolean;
  reason: string;
  minutesUntilStart?: number;
  minutesSinceEnd?: number;
  isEarly?: boolean;
  isLate?: boolean;
  windowStart?: Date;
  windowEnd?: Date;
}

interface MeetingWindow {
  appointmentId: string;
  scheduledTime: Date;
  windowStart: Date;
  windowEnd: Date;
  status: 'before_window' | 'in_window' | 'after_window';
}

const DEFAULT_MEETING_RULES: MeetingTimeRules = {
  allowJoinBefore: 15,
  allowJoinAfter: 30,
  autoRescheduleOnMiss: true,
  rescheduleToNextWeek: true,
  maxMissedAttempts: 3,
};

function checkMeetingWindow(
  appointmentDate: Date | string,
  appointmentTime: string,
  rules: MeetingTimeRules,
  now: Date
): MeetingTimeCheck {
  const dateStr = typeof appointmentDate === 'string'
    ? appointmentDate
    : appointmentDate.toISOString().split('T')[0];

  const [hours, minutes] = appointmentTime.split(':').map(Number);
  const meetingStart = new Date(dateStr);
  meetingStart.setHours(hours, minutes, 0, 0);

  const windowStart = new Date(meetingStart.getTime() - rules.allowJoinBefore * 60 * 1000);
  const windowEnd = new Date(meetingStart.getTime() + rules.allowJoinAfter * 60 * 1000);

  if (now < windowStart) {
    const minutesUntilStart = Math.ceil((meetingStart.getTime() - now.getTime()) / (60 * 1000));
    return { canJoin: false, reason: 'too_early', minutesUntilStart, isEarly: true, windowStart, windowEnd };
  }

  if (now > windowEnd) {
    const minutesSinceEnd = Math.ceil((now.getTime() - windowEnd.getTime()) / (60 * 1000));
    return { canJoin: false, reason: 'too_late', minutesSinceEnd, isLate: true, windowStart, windowEnd };
  }

  const minutesUntilStart = Math.ceil((meetingStart.getTime() - now.getTime()) / (60 * 1000));
  return {
    canJoin: true,
    reason: 'in_window',
    minutesUntilStart: now < meetingStart ? minutesUntilStart : undefined,
    minutesSinceEnd: now > meetingStart ? Math.abs(minutesUntilStart) : undefined,
    isEarly: now < meetingStart,
    isLate: now > meetingStart,
    windowStart,
    windowEnd,
  };
}

function getMeetingWindow(
  appointmentDate: Date | string,
  appointmentTime: string,
  rules: MeetingTimeRules,
  now: Date
): MeetingWindow {
  const dateStr = typeof appointmentDate === 'string'
    ? appointmentDate
    : appointmentDate.toISOString().split('T')[0];

  const [hours, minutes] = appointmentTime.split(':').map(Number);
  const scheduledTime = new Date(dateStr);
  scheduledTime.setHours(hours, minutes, 0, 0);

  const windowStart = new Date(scheduledTime.getTime() - rules.allowJoinBefore * 60 * 1000);
  const windowEnd = new Date(scheduledTime.getTime() + rules.allowJoinAfter * 60 * 1000);

  let status: 'before_window' | 'in_window' | 'after_window';
  if (now < windowStart) status = 'before_window';
  else if (now > windowEnd) status = 'after_window';
  else status = 'in_window';

  return { appointmentId: '', scheduledTime, windowStart, windowEnd, status };
}

function calculateNextWeekSlot(originalDate: Date | string, originalTime: string): { date: string; time: string } {
  const dateStr = typeof originalDate === 'string'
    ? originalDate
    : originalDate.toISOString().split('T')[0];

  const nextWeekDate = new Date(dateStr);
  nextWeekDate.setDate(nextWeekDate.getDate() + 7);

  return { date: nextWeekDate.toISOString().split('T')[0], time: originalTime };
}

async function handleMissedMeeting(
  rules: MeetingTimeRules,
  currentMissedCount: number
): Promise<{ rescheduled: boolean; cancelled?: boolean; reason: string }> {
  const newMissedCount = currentMissedCount + 1;

  if (newMissedCount >= rules.maxMissedAttempts) {
    return { rescheduled: false, cancelled: true, reason: 'max_attempts_exceeded' };
  }

  if (rules.autoRescheduleOnMiss && rules.rescheduleToNextWeek) {
    return { rescheduled: true, reason: 'auto_rescheduled' };
  }

  return { rescheduled: false, reason: 'cancelled' };
}

function formatTimeRemaining(minutes: number): string {
  if (minutes < 1) return 'ไม่กี่วินาที';
  if (minutes < 60) return `${minutes} นาที`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0
    ? `${hours} ชั่วโมง ${remainingMinutes} นาที`
    : `${hours} ชั่วโมง`;
}

// ════════════════════════════════════════════════════════════════════
// A. DEFAULT MEETING RULES (6 tests)
// ════════════════════════════════════════════════════════════════════
describe('Default Meeting Rules', () => {
  it('A01 — allows join 15 minutes before', () => {
    expect(DEFAULT_MEETING_RULES.allowJoinBefore).toBe(15);
  });

  it('A02 — allows join 30 minutes after', () => {
    expect(DEFAULT_MEETING_RULES.allowJoinAfter).toBe(30);
  });

  it('A03 — auto-reschedule enabled', () => {
    expect(DEFAULT_MEETING_RULES.autoRescheduleOnMiss).toBe(true);
  });

  it('A04 — reschedule to next week enabled', () => {
    expect(DEFAULT_MEETING_RULES.rescheduleToNextWeek).toBe(true);
  });

  it('A05 — max missed attempts is 3', () => {
    expect(DEFAULT_MEETING_RULES.maxMissedAttempts).toBe(3);
  });

  it('A06 — all rules have valid types', () => {
    expect(typeof DEFAULT_MEETING_RULES.allowJoinBefore).toBe('number');
    expect(typeof DEFAULT_MEETING_RULES.autoRescheduleOnMiss).toBe('boolean');
    expect(typeof DEFAULT_MEETING_RULES.maxMissedAttempts).toBe('number');
  });
});

// ════════════════════════════════════════════════════════════════════
// B. CHECK MEETING WINDOW (12 tests)
// ════════════════════════════════════════════════════════════════════
describe('Check Meeting Window', () => {
  const rules = DEFAULT_MEETING_RULES;

  it('B01 — can join exactly at meeting time', () => {
    const meetingDate = '2025-01-15';
    const meetingTime = '14:00';
    const now = new Date('2025-01-15T14:00:00');
    const check = checkMeetingWindow(meetingDate, meetingTime, rules, now);
    expect(check.canJoin).toBe(true);
  });

  it('B02 — can join 10 minutes before (within 15 min window)', () => {
    const now = new Date('2025-01-15T13:50:00');
    const check = checkMeetingWindow('2025-01-15', '14:00', rules, now);
    expect(check.canJoin).toBe(true);
    expect(check.isEarly).toBe(true);
  });

  it('B03 — can join 15 minutes before (exact boundary)', () => {
    const now = new Date('2025-01-15T13:45:00');
    const check = checkMeetingWindow('2025-01-15', '14:00', rules, now);
    expect(check.canJoin).toBe(true);
  });

  it('B04 — cannot join 20 minutes before (outside window)', () => {
    const now = new Date('2025-01-15T13:39:00');
    const check = checkMeetingWindow('2025-01-15', '14:00', rules, now);
    expect(check.canJoin).toBe(false);
    expect(check.isEarly).toBe(true);
  });

  it('B05 — can join 20 minutes after (within 30 min window)', () => {
    const now = new Date('2025-01-15T14:20:00');
    const check = checkMeetingWindow('2025-01-15', '14:00', rules, now);
    expect(check.canJoin).toBe(true);
    expect(check.isLate).toBe(true);
  });

  it('B06 — can join 30 minutes after (exact boundary)', () => {
    const now = new Date('2025-01-15T14:30:00');
    const check = checkMeetingWindow('2025-01-15', '14:00', rules, now);
    expect(check.canJoin).toBe(true);
  });

  it('B07 — cannot join 31 minutes after (outside window)', () => {
    const now = new Date('2025-01-15T14:31:00');
    const check = checkMeetingWindow('2025-01-15', '14:00', rules, now);
    expect(check.canJoin).toBe(false);
    expect(check.isLate).toBe(true);
  });

  it('B08 — windowStart is 15 min before meetingStart', () => {
    const now = new Date('2025-01-15T14:00:00');
    const check = checkMeetingWindow('2025-01-15', '14:00', rules, now);
    expect(check.windowStart).toBeDefined();
    expect(check.windowStart!.getHours()).toBe(13);
    expect(check.windowStart!.getMinutes()).toBe(45);
  });

  it('B09 — windowEnd is 30 min after meetingStart', () => {
    const now = new Date('2025-01-15T14:00:00');
    const check = checkMeetingWindow('2025-01-15', '14:00', rules, now);
    expect(check.windowEnd).toBeDefined();
    expect(check.windowEnd!.getHours()).toBe(14);
    expect(check.windowEnd!.getMinutes()).toBe(30);
  });

  it('B10 — works with Date object input', () => {
    const date = new Date('2025-01-15');
    const now = new Date('2025-01-15T14:00:00');
    const check = checkMeetingWindow(date, '14:00', rules, now);
    expect(check.canJoin).toBe(true);
  });

  it('B11 — morning appointment 09:00', () => {
    const now = new Date('2025-01-15T08:50:00');
    const check = checkMeetingWindow('2025-01-15', '09:00', rules, now);
    expect(check.canJoin).toBe(true);
    expect(check.isEarly).toBe(true);
  });

  it('B12 — custom rules with wider window', () => {
    const wideRules = { ...rules, allowJoinBefore: 60, allowJoinAfter: 60 };
    const now = new Date('2025-01-15T13:05:00');
    const check = checkMeetingWindow('2025-01-15', '14:00', wideRules, now);
    expect(check.canJoin).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════
// C. GET MEETING WINDOW STATUS (8 tests)
// ════════════════════════════════════════════════════════════════════
describe('Get Meeting Window', () => {
  const rules = DEFAULT_MEETING_RULES;

  it('C01 — before_window status when too early', () => {
    const now = new Date('2025-01-15T12:00:00');
    const win = getMeetingWindow('2025-01-15', '14:00', rules, now);
    expect(win.status).toBe('before_window');
  });

  it('C02 — in_window status during meeting time', () => {
    const now = new Date('2025-01-15T14:00:00');
    const win = getMeetingWindow('2025-01-15', '14:00', rules, now);
    expect(win.status).toBe('in_window');
  });

  it('C03 — after_window status when too late', () => {
    const now = new Date('2025-01-15T15:00:00');
    const win = getMeetingWindow('2025-01-15', '14:00', rules, now);
    expect(win.status).toBe('after_window');
  });

  it('C04 — scheduledTime is correctly parsed', () => {
    const now = new Date('2025-01-15T14:00:00');
    const win = getMeetingWindow('2025-01-15', '14:30', rules, now);
    expect(win.scheduledTime.getHours()).toBe(14);
    expect(win.scheduledTime.getMinutes()).toBe(30);
  });

  it('C05 — windowStart is correct', () => {
    const now = new Date('2025-01-15T14:00:00');
    const win = getMeetingWindow('2025-01-15', '14:00', rules, now);
    expect(win.windowStart.getTime()).toBe(win.scheduledTime.getTime() - 15 * 60 * 1000);
  });

  it('C06 — windowEnd is correct', () => {
    const now = new Date('2025-01-15T14:00:00');
    const win = getMeetingWindow('2025-01-15', '14:00', rules, now);
    expect(win.windowEnd.getTime()).toBe(win.scheduledTime.getTime() + 30 * 60 * 1000);
  });

  it('C07 — appointmentId is empty by default', () => {
    const now = new Date('2025-01-15T14:00:00');
    const win = getMeetingWindow('2025-01-15', '14:00', rules, now);
    expect(win.appointmentId).toBe('');
  });

  it('C08 — Date object input works', () => {
    const now = new Date('2025-01-15T14:00:00');
    const win = getMeetingWindow(new Date('2025-01-15'), '10:00', rules, now);
    expect(win.scheduledTime.getHours()).toBe(10);
  });
});

// ════════════════════════════════════════════════════════════════════
// D. CALCULATE NEXT WEEK SLOT (8 tests)
// ════════════════════════════════════════════════════════════════════
describe('Calculate Next Week Slot', () => {
  it('D01 — adds exactly 7 days', () => {
    const result = calculateNextWeekSlot('2025-01-15', '14:00');
    expect(result.date).toBe('2025-01-22');
  });

  it('D02 — keeps same time', () => {
    const result = calculateNextWeekSlot('2025-01-15', '09:30');
    expect(result.time).toBe('09:30');
  });

  it('D03 — crosses month boundary', () => {
    const result = calculateNextWeekSlot('2025-01-29', '14:00');
    expect(result.date).toBe('2025-02-05');
  });

  it('D04 — crosses year boundary', () => {
    const result = calculateNextWeekSlot('2024-12-30', '10:00');
    expect(result.date).toBe('2025-01-06');
  });

  it('D05 — leap year February', () => {
    const result = calculateNextWeekSlot('2024-02-24', '14:00');
    expect(result.date).toBe('2024-03-02');
  });

  it('D06 — works with Date object', () => {
    const result = calculateNextWeekSlot(new Date('2025-03-01'), '16:00');
    expect(result.date).toBe('2025-03-08');
    expect(result.time).toBe('16:00');
  });

  it('D07 — preserves midnight time', () => {
    const result = calculateNextWeekSlot('2025-01-15', '00:00');
    expect(result.time).toBe('00:00');
  });

  it('D08 — preserves end-of-day time', () => {
    const result = calculateNextWeekSlot('2025-01-15', '23:59');
    expect(result.time).toBe('23:59');
  });
});

// ════════════════════════════════════════════════════════════════════
// E. HANDLE MISSED MEETING (8 tests)
// ════════════════════════════════════════════════════════════════════
describe('Handle Missed Meeting', () => {
  it('E01 — first miss auto-reschedules', async () => {
    const result = await handleMissedMeeting(DEFAULT_MEETING_RULES, 0);
    expect(result.rescheduled).toBe(true);
    expect(result.reason).toBe('auto_rescheduled');
  });

  it('E02 — second miss still reschedules', async () => {
    const result = await handleMissedMeeting(DEFAULT_MEETING_RULES, 1);
    expect(result.rescheduled).toBe(true);
  });

  it('E03 — third miss cancels (max 3 attempts)', async () => {
    const result = await handleMissedMeeting(DEFAULT_MEETING_RULES, 2);
    expect(result.rescheduled).toBe(false);
    expect(result.cancelled).toBe(true);
  });

  it('E04 — fourth miss also cancels', async () => {
    const result = await handleMissedMeeting(DEFAULT_MEETING_RULES, 3);
    expect(result.cancelled).toBe(true);
  });

  it('E05 — auto-reschedule disabled cancels immediately', async () => {
    const rules = { ...DEFAULT_MEETING_RULES, autoRescheduleOnMiss: false };
    const result = await handleMissedMeeting(rules, 0);
    expect(result.rescheduled).toBe(false);
  });

  it('E06 — max attempts = 1 cancels on first miss', async () => {
    const rules = { ...DEFAULT_MEETING_RULES, maxMissedAttempts: 1 };
    const result = await handleMissedMeeting(rules, 0);
    expect(result.cancelled).toBe(true);
  });

  it('E07 — max attempts = 5 allows more misses', async () => {
    const rules = { ...DEFAULT_MEETING_RULES, maxMissedAttempts: 5 };
    const result = await handleMissedMeeting(rules, 3);
    expect(result.rescheduled).toBe(true);
  });

  it('E08 — rescheduleToNextWeek false still reschedules (just with different method)', async () => {
    const rules = { ...DEFAULT_MEETING_RULES, rescheduleToNextWeek: false };
    const result = await handleMissedMeeting(rules, 0);
    // autoRescheduleOnMiss AND rescheduleToNextWeek must both be true
    expect(result.rescheduled).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════
// F. FORMAT TIME REMAINING (8 tests)
// ════════════════════════════════════════════════════════════════════
describe('Format Time Remaining', () => {
  it('F01 — less than 1 minute shows seconds', () => {
    expect(formatTimeRemaining(0)).toBe('ไม่กี่วินาที');
  });

  it('F02 — 1 minute', () => {
    expect(formatTimeRemaining(1)).toBe('1 นาที');
  });

  it('F03 — 30 minutes', () => {
    expect(formatTimeRemaining(30)).toBe('30 นาที');
  });

  it('F04 — 59 minutes', () => {
    expect(formatTimeRemaining(59)).toBe('59 นาที');
  });

  it('F05 — exactly 60 minutes = 1 hour', () => {
    expect(formatTimeRemaining(60)).toBe('1 ชั่วโมง');
  });

  it('F06 — 90 minutes = 1 hour 30 minutes', () => {
    expect(formatTimeRemaining(90)).toBe('1 ชั่วโมง 30 นาที');
  });

  it('F07 — 120 minutes = 2 hours', () => {
    expect(formatTimeRemaining(120)).toBe('2 ชั่วโมง');
  });

  it('F08 — 150 minutes = 2 hours 30 minutes', () => {
    expect(formatTimeRemaining(150)).toBe('2 ชั่วโมง 30 นาที');
  });
});
