/**
 * @process Processes/Pages/Doctor-Portal/07_Virtual_Meeting.md
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const meetingRoom = path.resolve(__dirname, '../../../Isara-doctor-portal/frontend/pages/meetings/MeetingRoom.tsx');

describe('meetingRecordingUi — host recording UX', () => {
  const src = fs.readFileSync(meetingRoom, 'utf8');

  it('MRI-01 — recording-indicator testid present', () => {
    expect(src).toMatch(/data-testid="recording-indicator"/);
  });

  it('MRI-02 — auto-record called on conference join for host', () => {
    expect(src).toMatch(/videoConferenceJoined.*handleConferenceJoined|handleConferenceJoined/s);
    expect(src).toMatch(/auto-record/);
    expect(src).toMatch(/setIsRecording\(true\)/);
  });

  it('MRI-03 — notifyHostPresent on conference joined only (inJitsi), host-absent on leave', () => {
    const jitsiCfg = fs.readFileSync(
      path.resolve(__dirname, '../../../Isara-doctor-portal/frontend/utils/jitsiMeetingConfig.ts'),
      'utf8',
    );
    expect(src).toMatch(/notifyHostPresent/);
    expect(src).toMatch(/handleConferenceJoined/);
    expect(src).toMatch(/handleConferenceJoined[\s\S]*?notifyHostPresent/);
    expect(jitsiCfg).toMatch(/inJitsi:\s*true/);
    expect(src).toMatch(/notifyHostAbsent/);
    expect(src).not.toMatch(/joinMeeting[\s\S]*?notifyHostPresent/);
  });

  it('MRI-04 — save-recording on stop recording path (same-origin BFF)', () => {
    expect(src).toMatch(/save-recording/);
    expect(src).toMatch(/\/api\/meetings\/\$\{/);
  });
});
