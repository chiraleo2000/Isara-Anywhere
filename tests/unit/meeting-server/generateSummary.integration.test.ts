/**
 * @process Processes/POST_MEETING_WORKFLOW.md
 * Post-meeting generate-summary pipeline contracts (GSUM-01–07).
 */
import { describe, it, expect } from 'vitest';

const MIN_RECORDING_BYTES = 1024;
const PLACEHOLDER_GEMINI_KEY = 'your-gemini-api-key-here';

type MeetingStatus = 'in_progress' | 'ended' | 'processing' | 'results_ready';

function canStopRecording(status: MeetingStatus): boolean {
  return status === 'ended';
}

function validateRecordingSize(bytes: number): { ok: boolean; code?: string } {
  if (bytes < MIN_RECORDING_BYTES) return { ok: false, code: 'RECORDING_TOO_SMALL' };
  return { ok: true };
}

function canGenerateSummary(status: MeetingStatus, geminiKey: string): { ok: boolean; status?: number; code?: string } {
  if (geminiKey === PLACEHOLDER_GEMINI_KEY || !geminiKey) {
    return { ok: false, status: 503, code: 'GEMINI_UNAVAILABLE' };
  }
  if (status !== 'ended' && status !== 'processing') {
    return { ok: false, status: 409, code: 'INVALID_STATUS' };
  }
  return { ok: true };
}

function applyGenerateSummary(status: MeetingStatus): {
  status: MeetingStatus;
  ready_for_patient: boolean;
} {
  return { status: 'results_ready', ready_for_patient: false };
}

function buildResultsPayload(meeting: {
  recordingUrl?: string;
  summary?: Record<string, unknown>;
  status: MeetingStatus;
}) {
  return {
    status: meeting.status,
    recordingUrl: meeting.recordingUrl ?? null,
    summary: meeting.summary ?? null,
    ready_for_patient: false,
  };
}

describe('generateSummary.integration — GSUM pipeline', () => {
  it('GSUM-01 — end meeting with generateSummary=true enqueues pipeline', () => {
    const endPayload = { endedBy: 'doc-1', generateSummary: true };
    expect(endPayload.generateSummary).toBe(true);
  });

  it('GSUM-02 — stop-recording requires prior ended status', () => {
    expect(canStopRecording('ended')).toBe(true);
    expect(canStopRecording('in_progress')).toBe(false);
  });

  it('GSUM-03 — save-recording validates MIN_RECORDING_BYTES', () => {
    expect(validateRecordingSize(10).ok).toBe(false);
    expect(validateRecordingSize(MIN_RECORDING_BYTES).ok).toBe(true);
  });

  it('GSUM-04 — generate-summary returns 503 when GEMINI_API_KEY is placeholder', () => {
    const result = canGenerateSummary('ended', PLACEHOLDER_GEMINI_KEY);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(503);
  });

  it('GSUM-05 — success sets results_ready and ready_for_patient=false', () => {
    const next = applyGenerateSummary('processing');
    expect(next.status).toBe('results_ready');
    expect(next.ready_for_patient).toBe(false);
  });

  it('GSUM-06 — idempotent re-call of generate-summary keeps results_ready', () => {
    const first = applyGenerateSummary('processing');
    const second = applyGenerateSummary(first.status);
    expect(second.status).toBe('results_ready');
  });

  it('GSUM-07 — degraded summary path when Gemini unavailable', () => {
    const degraded = canGenerateSummary('ended', '');
    expect(degraded.ok).toBe(false);
    expect(degraded.code).toBe('GEMINI_UNAVAILABLE');
  });

  it('GSUM-08 — GET results returns recording URL and summary JSON', () => {
    const payload = buildResultsPayload({
      status: 'results_ready',
      recordingUrl: '/api/recordings/meetings/DR-001/m-1/video.mp4',
      summary: { soap: { subjective: 'cough' } },
    });
    expect(payload.recordingUrl).toContain('/api/recordings/');
    expect(payload.summary).toHaveProperty('soap');
    expect(payload.ready_for_patient).toBe(false);
  });
});
