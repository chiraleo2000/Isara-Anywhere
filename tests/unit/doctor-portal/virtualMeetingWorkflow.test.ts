/**
 * @process Processes/Pages/Doctor-Portal/07_Virtual_Meeting.md
 */
import { describe, it, expect } from 'vitest';

type MeetingUiState = 'time_check' | 'consent' | 'meeting' | 'ended';

function nextMeetingState(current: MeetingUiState, event: 'time_ok' | 'consent_accept' | 'hangup'): MeetingUiState {
  if (event === 'hangup') return 'ended';
  if (current === 'time_check' && event === 'time_ok') return 'consent';
  if (current === 'consent' && event === 'consent_accept') return 'meeting';
  return current;
}

function isWithinJoinWindow(appointmentStartMs: number, nowMs: number, windowMinutes = 30): boolean {
  const diff = appointmentStartMs - nowMs;
  return diff <= windowMinutes * 60_000 && diff >= -windowMinutes * 60_000;
}

function allConsentsAccepted(flags: Record<string, boolean>): boolean {
  const required = ['video', 'audio', 'chat', 'ai'];
  return required.every(k => flags[k] === true);
}

describe('virtualMeetingWorkflow — Doctor Virtual Meeting', () => {
  it('VM01 — state machine progresses time_check → consent → meeting', () => {
    let s: MeetingUiState = 'time_check';
    s = nextMeetingState(s, 'time_ok');
    expect(s).toBe('consent');
    s = nextMeetingState(s, 'consent_accept');
    expect(s).toBe('meeting');
    s = nextMeetingState(s, 'hangup');
    expect(s).toBe('ended');
  });

  it('VM02 — join window allows ±30 minutes', () => {
    const start = Date.now() + 10 * 60_000;
    expect(isWithinJoinWindow(start, Date.now())).toBe(true);
    expect(isWithinJoinWindow(Date.now() + 2 * 60 * 60_000, Date.now())).toBe(false);
  });

  it('VM03 — all PDPA consents required before meeting', () => {
    expect(allConsentsAccepted({ video: true, audio: true, chat: true, ai: true })).toBe(true);
    expect(allConsentsAccepted({ video: true, audio: false, chat: true, ai: true })).toBe(false);
  });
});
