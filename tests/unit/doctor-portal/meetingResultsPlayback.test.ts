/**
 * @process Processes/POST_MEETING_WORKFLOW.md
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const resultsSrc = fs.readFileSync(
  path.resolve(__dirname, '../../../issara-doctor/frontend/pages/meetings/MeetingResults.tsx'),
  'utf8',
);

describe('meetingResultsPlayback — authenticated recording via BFF', () => {
  it('PM-02 — no raw cross-origin audio src without auth helper', () => {
    expect(resultsSrc).not.toMatch(/<audio[^>]*>\s*<source src=\{`\$\{meetingServerBase\(\)\}/);
    expect(resultsSrc).not.toMatch(/src=\{`\$\{meetingServerBase\(\)\}\$\{meeting\.recordingUrl\}`\}/);
  });

  it('PM-02b — RecordingPlayer uses same-origin recording-stream proxy', () => {
    expect(resultsSrc).toMatch(/recording-stream\?path=/);
    expect(resultsSrc).toMatch(/fetchMeetingApi/);
    expect(resultsSrc).toMatch(/data-testid="recording-player"/);
  });

  it('PM-02c — video MIME supported when recording is video/*', () => {
    expect(resultsSrc).toMatch(/inferRecordingMime/);
    expect(resultsSrc).toMatch(/mime\.startsWith\('video\/'\)/);
    expect(resultsSrc).toMatch(/<video data-testid="recording-player"/);
  });

  it('PM-03 — pipeline-status poll before results fetch', () => {
    expect(resultsSrc).toMatch(/pipeline-status/);
    expect(resultsSrc).toMatch(/waitForPipelineReady/);
    expect(resultsSrc).toMatch(/results-pipeline-stage/);
  });
});
