/**
 * @process Processes/Pages/Meeting-Server/01_Meeting_Room.md
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const meetingRoom = fs.readFileSync(
  path.resolve(__dirname, '../../../issara-doctor/frontend/pages/meetings/MeetingRoom.tsx'),
  'utf8',
);

describe('teamsLobbyContract — Teams-like manual admit default', () => {
  it('TM-02 — auto-admit-all gated behind VITE_AUTO_ADMIT_LOBBY', () => {
    expect(meetingRoom).toMatch(/VITE_AUTO_ADMIT_LOBBY/);
    expect(meetingRoom).toMatch(/lobby\/admit-all/);
    expect(meetingRoom).toMatch(/if \(autoAdmit\)/);
  });

  it('TM-01 — notifyHostPresent only after videoConferenceJoined (in Jitsi), not on joinMeeting click', () => {
    const jitsiCfg = fs.readFileSync(
      path.resolve(__dirname, '../../../issara-doctor/frontend/utils/jitsiMeetingConfig.ts'),
      'utf8',
    );
    expect(meetingRoom).toMatch(/const joinMeeting = useCallback/);
    expect(meetingRoom).toMatch(/handleConferenceJoined[\s\S]*?notifyHostPresent/);
    expect(jitsiCfg).toMatch(/inJitsi:\s*true/);
    expect(meetingRoom).not.toMatch(/joinMeeting[\s\S]*?notifyHostPresent[\s\S]*?loadJitsiExternalApiScript/);
  });

  it('TM-01c — notifyHostAbsent on hangup / readyToClose', () => {
    expect(meetingRoom).toMatch(/notifyHostAbsent/);
  });

  it('TM-01b — lobby panel testids present', () => {
    expect(meetingRoom).toMatch(/lobby-panel|admit-all-btn|lobby-participant/);
  });
});
