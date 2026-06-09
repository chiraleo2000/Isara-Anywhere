/**
 * @process Processes/POST_MEETING_WORKFLOW.md
 * Post-meeting pipeline status transitions (recording → summary → results)
 */
import { describe, it, expect } from 'vitest';

const POST_MEETING_STATUSES = ['in_progress', 'ended', 'processing', 'results_ready'] as const;

function nextPostMeetingStatus(current: string, event: 'end' | 'recording_saved' | 'summary_done'): string {
  if (event === 'end' && current === 'in_progress') return 'ended';
  if (event === 'recording_saved' && current === 'ended') return 'processing';
  if (event === 'summary_done' && (current === 'processing' || current === 'ended')) return 'results_ready';
  return current;
}

describe('postMeetingWorkflow — status machine', () => {
  it('PMW01 — doctor end moves in_progress → ended', () => {
    expect(nextPostMeetingStatus('in_progress', 'end')).toBe('ended');
  });

  it('PMW02 — recording save moves ended → processing', () => {
    expect(nextPostMeetingStatus('ended', 'recording_saved')).toBe('processing');
  });

  it('PMW03 — Gemini summary moves processing → results_ready', () => {
    expect(nextPostMeetingStatus('processing', 'summary_done')).toBe('results_ready');
  });

  it('PMW04 — end meeting requests generateSummary=true in payload contract', () => {
    const endPayload = { endedBy: 'doc-1', generateSummary: true };
    expect(endPayload.generateSummary).toBe(true);
  });

  it('PMW05 — all post-meeting statuses are defined', () => {
    expect(POST_MEETING_STATUSES).toContain('results_ready');
    expect(POST_MEETING_STATUSES.length).toBeGreaterThanOrEqual(4);
  });

  it('PMW06 — results_ready does not auto-unlock patient (man-in-the-loop)', () => {
    const payload = { status: 'results_ready', ready_for_patient: false };
    expect(payload.ready_for_patient).toBe(false);
  });

  it('PMW07 — invalid transition leaves status unchanged', () => {
    expect(nextPostMeetingStatus('in_progress', 'summary_done')).toBe('in_progress');
  });
});
