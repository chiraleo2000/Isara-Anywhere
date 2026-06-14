/**
 * @process Processes/VIDEO_MEETING_JITSI_GEMINI.md, Processes/POST_MEETING_WORKFLOW.md
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

describe('Meeting UX contract (MEET-UX)', () => {
  it('MEET-UX-01 — persisted/degraded flags in video-meeting', () => {
    const src = fs.readFileSync(path.join(root, 'Isara-patient-portal/server/routes/video-meeting.ts'), 'utf8');
    expect(src).toMatch(/persisted|degraded/i);
  });

  it('MEET-UX-02 — MeetingResults error output', () => {
    expect(fs.readFileSync(path.join(root, 'Isara-doctor-portal/src/pages/meetings/MeetingResults.tsx'), 'utf8'))
      .toMatch(/<output|setError|error/i);
  });

  it('MEET-UX-03 — degraded AI badge', () => {
    expect(fs.readFileSync(path.join(root, 'Isara-doctor-portal/src/pages/meetings/MeetingResults.tsx'), 'utf8'))
      .toMatch(/degraded/i);
  });

  it('MEET-UX-04 — end meeting transitions to ended status (MeetingRoom canonical)', () => {
    const src = fs.readFileSync(path.join(root, 'Isara-doctor-portal/src/pages/meetings/MeetingRoom.tsx'), 'utf8');
    expect(src).toMatch(/status: 'ended'|status === 'ended'|'ended'/);
  });

  it('MEET-UX-05 — lobby admit flow', () => {
    expect(fs.readFileSync(path.join(root, 'Izara-jitsi-server/server/lobbySession.js'), 'utf8'))
      .toMatch(/admit|lobby/i);
  });

  it('MEET-UX-06 — postMeetingPipeline failure logging', () => {
    expect(fs.readFileSync(path.join(root, 'Izara-jitsi-server/server/postMeetingPipeline.js'), 'utf8'))
      .toMatch(/console\.(error|warn)|socket/i);
  });

  it('MEET-UX-07 — breadcrumb on health meeting', () => {
    expect(fs.readFileSync(path.join(root, 'Isara-doctor-portal/src/pages/meetings/HealthMeeting.tsx'), 'utf8'))
      .toMatch(/health-meeting-breadcrumb/);
  });

  it('MEET-UX-08 — meeting consent requires all three checkboxes (doctor portal)', () => {
    const src = fs.readFileSync(path.join(root, 'Isara-doctor-portal/src/pages/meetings/MeetingRoom.tsx'), 'utf8');
    expect(src).toMatch(/consent-recording-input/);
    expect(src).toMatch(/consent-transcript-input/);
    expect(src).toMatch(/consent-data-sharing-input/);
    expect(src).toMatch(/disabled=\{!consentRecording \|\| !consentTranscript \|\| !consentDataSharing\}/);
    expect(src).toMatch(/htmlFor="consent-recording-input"/);
  });

  it('MEET-UX-09 — meeting consent requires all three checkboxes (patient portal)', () => {
    const src = fs.readFileSync(path.join(root, 'Isara-patient-portal/src/pages/PatientMeetingRoom.tsx'), 'utf8');
    expect(src).toMatch(/consent-recording-input/);
    expect(src).toMatch(/consent-transcript-input/);
    expect(src).toMatch(/consent-data-sharing-input/);
    expect(src).toMatch(/disabled=\{!consentRecording \|\| !consentTranscript \|\| !consentDataSharing\}/);
    expect(src).toMatch(/htmlFor="patient-consent-recording-input"/);
  });

  it('MEET-UX-10 — no virtual-meeting route or VirtualMeeting page exists', () => {
    const portal = fs.readFileSync(path.join(root, 'Isara-doctor-portal/src/pages/DoctorPortal.tsx'), 'utf8');
    expect(portal).not.toMatch(/path="virtual-meeting/);
    expect(portal).not.toMatch(/import VirtualMeeting/);
    expect(fs.existsSync(path.join(root, 'Isara-doctor-portal/src/pages/meetings/VirtualMeeting.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'Isara-doctor-portal/src/pages/VirtualMeeting.tsx'))).toBe(false);
  });

  it('MEET-UX-11 — patient appointment UI joins in-app /meeting/:id, no external Jitsi tab', () => {
    const appt = fs.readFileSync(path.join(root, 'Isara-patient-portal/src/pages/AppointmentPages.tsx'), 'utf8');
    expect(appt).toMatch(/to=\{`\/meeting\/\$\{apt\.id\}`\}/);
    expect(appt).not.toMatch(/window\.open\([^)]*meetingLink/);
    const dash = fs.readFileSync(path.join(root, 'Isara-patient-portal/src/pages/DashboardPage.tsx'), 'utf8');
    expect(dash).toMatch(/to=\{`\/meeting\/\$\{apt\.id\}`\}/);
  });

  it('MEET-UX-12 — patient lobby join never bypasses the host gate', () => {
    const src = fs.readFileSync(path.join(root, 'Isara-patient-portal/src/pages/PatientMeetingRoom.tsx'), 'utf8');
    // After a failed lobby join we must not auto-admit; doctor hosts and admits.
    expect(src).not.toMatch(/setLobbyStatus\('admitted'\);\s*\n\s*setStatus\('waiting_host'\);\s*\n\s*void connectVideoWhenReady/);
    expect(src).toMatch(/waitForHostReady/);
  });
});
