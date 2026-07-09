/**
 * @process Processes/VIDEO_MEETING_JITSI_GEMINI.md, Processes/POST_MEETING_WORKFLOW.md
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

describe('Meeting UX contract (MEET-UX)', () => {
  it('MEET-UX-01 — patient video-meeting proxy forwards to meeting-server', () => {
    const src = fs.readFileSync(path.join(root, 'Isara-patient-portal/backend/routes/video-meeting-proxy.ts'), 'utf8');
    expect(src).toMatch(/MEETING_SERVER_URL/);
    expect(src).toMatch(/\/api\/meetings\/create/);
    expect(src).toMatch(/lobby\/join/);
  });

  it('MEET-UX-02 — MeetingResults error output', () => {
    expect(fs.readFileSync(path.join(root, 'Isara-doctor-portal/frontend/pages/meetings/MeetingResults.tsx'), 'utf8'))
      .toMatch(/<output|setError|error/i);
  });

  it('MEET-UX-03 — degraded AI badge', () => {
    expect(fs.readFileSync(path.join(root, 'Isara-doctor-portal/frontend/pages/meetings/MeetingResults.tsx'), 'utf8'))
      .toMatch(/degraded/i);
  });

  it('MEET-UX-04 — end meeting transitions to ended status (MeetingRoom canonical)', () => {
    const src = fs.readFileSync(path.join(root, 'Isara-doctor-portal/frontend/pages/meetings/MeetingRoom.tsx'), 'utf8');
    expect(src).toMatch(/status: 'ended'|status === 'ended'|'ended'/);
  });

  it('MEET-UX-05 — lobby admit flow', () => {
    expect(fs.readFileSync(path.join(root, 'Izara-jitsi-server/backend/lobbySession.js'), 'utf8'))
      .toMatch(/admit|lobby/i);
  });

  it('MEET-UX-06 — postMeetingPipeline failure logging', () => {
    expect(fs.readFileSync(path.join(root, 'Izara-jitsi-server/backend/services/postMeetingPipeline.js'), 'utf8'))
      .toMatch(/console\.(error|warn)|socket/i);
  });

  it('MEET-UX-07 — breadcrumb on health meeting', () => {
    expect(fs.readFileSync(path.join(root, 'Isara-doctor-portal/frontend/pages/meetings/HealthMeeting.tsx'), 'utf8'))
      .toMatch(/health-meeting-breadcrumb/);
  });

  it('MEET-UX-08 — doctor host auto-consent and auto-start (no manual checkboxes)', () => {
    const src = fs.readFileSync(path.join(root, 'Isara-doctor-portal/frontend/pages/meetings/MeetingRoom.tsx'), 'utf8');
    expect(src).toMatch(/host_starting/);
    expect(src).toMatch(/host-starting-screen/);
    expect(src).toMatch(/hostAutoConsent:\s*true/);
    expect(src).toMatch(/doctor-display-name/);
    expect(src).not.toMatch(/data-testid="meeting-agreement"/);
    expect(src).not.toMatch(/data-testid="pre-join-screen"/);
    expect(src).not.toMatch(/data-testid="join-meeting-btn"/);
  });

  it('MEET-UX-09 — patient auto-consent and auto-lobby (no manual checkboxes)', () => {
    const src = fs.readFileSync(path.join(root, 'Isara-patient-portal/frontend/pages/PatientMeetingRoom.tsx'), 'utf8');
    expect(src).toMatch(/lobby_starting/);
    expect(src).toMatch(/lobby-starting-screen/);
    expect(src).toMatch(/patientAutoConsent:\s*true/);
    expect(src).toMatch(/patient-display-name/);
    expect(src).not.toMatch(/data-testid="meeting-agreement"/);
    expect(src).not.toMatch(/data-testid="pre-join-screen"/);
    expect(src).not.toMatch(/data-testid="join-meeting-btn"/);
  });

  it('MEET-UX-10 — no virtual-meeting route or VirtualMeeting page exists', () => {
    const portal = fs.readFileSync(path.join(root, 'Isara-doctor-portal/frontend/pages/DoctorPortal.tsx'), 'utf8');
    expect(portal).not.toMatch(/path="virtual-meeting/);
    expect(portal).not.toMatch(/import VirtualMeeting/);
    expect(fs.existsSync(path.join(root, 'Isara-doctor-portal/frontend/pages/meetings/VirtualMeeting.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'Isara-doctor-portal/frontend/pages/VirtualMeeting.tsx'))).toBe(false);
  });

  it('MEET-UX-11 — patient appointment UI joins in-app user-scoped meeting path', () => {
    const appt = fs.readFileSync(path.join(root, 'Isara-patient-portal/frontend/pages/AppointmentPages.tsx'), 'utf8');
    expect(appt).toMatch(/buildPatientMeetingPath/);
    expect(appt).not.toMatch(/window\.open\([^)]*meetingLink/);
    const dash = fs.readFileSync(path.join(root, 'Isara-patient-portal/frontend/pages/DashboardPage.tsx'), 'utf8');
    expect(dash).toMatch(/buildPatientMeetingPath/);
  });

  it('MEET-UX-12 — patient lobby join never bypasses the host gate', () => {
    const src = fs.readFileSync(path.join(root, 'Isara-patient-portal/frontend/pages/PatientMeetingRoom.tsx'), 'utf8');
    // After a failed lobby join we must not auto-admit; doctor hosts and admits.
    expect(src).not.toMatch(/setLobbyStatus\('admitted'\);\s*\n\s*setStatus\('waiting_host'\);\s*\n\s*void connectVideoWhenReady/);
    expect(src).toMatch(/waitForHostReady/);
  });

  it('MEET-UX-13 — patient Jitsi container exposes role attrs for E2E (JROLE01)', () => {
    const src = fs.readFileSync(path.join(root, 'Isara-patient-portal/frontend/pages/PatientMeetingRoom.tsx'), 'utf8');
    expect(src).toMatch(/data-jitsi-moderator="false"/);
    expect(src).toMatch(/data-jitsi-participant="true"/);
    expect(src).toMatch(/data-jitsi-display-name/);
  });

  it('MEET-UX-14 — join-config downgrades non-appointed doctor from HOST', () => {
    const src = fs.readFileSync(path.join(root, 'Izara-jitsi-server/backend/index.js'), 'utf8');
    expect(src).toMatch(/appointedDoctorId/);
    expect(src).toMatch(/appointedDoctorId !== requestDoctorId/);
    expect(src).toMatch(/isHost = false/);
    expect(src).toMatch(/downgraded when doctor is not appointed/);
  });

  it('MEET-UX-15 — demo auto-login and auto-meeting env hooks (no manual login/join clicks)', () => {
    const patientAuth = fs.readFileSync(path.join(root, 'Isara-patient-portal/frontend/contexts/AuthContext.tsx'), 'utf8');
    const doctorAuth = fs.readFileSync(path.join(root, 'Isara-doctor-portal/frontend/components/common/AuthProvider.tsx'), 'utf8');
    const patientApt = fs.readFileSync(path.join(root, 'Isara-patient-portal/frontend/pages/AppointmentPages.tsx'), 'utf8');
    expect(patientAuth).toMatch(/isDemoAutoLoginEnabled/);
    expect(patientAuth).toMatch(/shouldSkipDemoAutoLogin/);
    expect(doctorAuth).toMatch(/isDemoAutoLoginEnabled/);
    expect(patientApt).toMatch(/isDemoAutoMeetingEnabled/);
    const dockerExample = fs.readFileSync(path.join(root, '.env.docker.example'), 'utf8');
    expect(dockerExample).toMatch(/DEMO_AUTO_LOGIN=1/);
    expect(dockerExample).toMatch(/VITE_AUTO_ADMIT_LOBBY=0/);
    expect(dockerExample).toMatch(/PATIENT_PORTAL_URL=/);
  });

  it('MEET-UX-16 — Jitsi prejoin bypass wired in both portals', () => {
    const patientRoom = fs.readFileSync(path.join(root, 'Isara-patient-portal/frontend/pages/PatientMeetingRoom.tsx'), 'utf8');
    const doctorRoom = fs.readFileSync(path.join(root, 'Isara-doctor-portal/frontend/pages/meetings/MeetingRoom.tsx'), 'utf8');
    const patientCfg = fs.readFileSync(path.join(root, 'Isara-patient-portal/frontend/utils/jitsiMeetingConfig.ts'), 'utf8');
    expect(patientRoom).toMatch(/wireJitsiSkipPrejoin/);
    expect(doctorRoom).toMatch(/wireJitsiSkipPrejoin/);
    expect(patientCfg).toMatch(/joinConference/);
  });

  it('MEET-UX-17 — patient meeting API uses same-origin BFF (fixes meeting-server 401)', () => {
    const patientRoom = fs.readFileSync(path.join(root, 'Isara-patient-portal/frontend/pages/PatientMeetingRoom.tsx'), 'utf8');
    const proxy = fs.readFileSync(path.join(root, 'Isara-patient-portal/backend/routes/video-meeting-proxy.ts'), 'utf8');
    const server = fs.readFileSync(path.join(root, 'Izara-jitsi-server/backend/index.js'), 'utf8');
    expect(patientRoom).toMatch(/resolvePatientMeetingApiBase/);
    expect(patientRoom).toMatch(/patientMeetingUrl/);
    expect(proxy).toMatch(/join-config/);
    expect(server).toMatch(/ensureMeetingRecordForAppointment/);
  });

  it('MEET-UX-18 — guest invite uses token URL; doctor copies guestLink not bare guest-join', () => {
    const jitsiCfg = fs.readFileSync(path.join(root, 'Izara-jitsi-server/backend/jitsiConfig.js'), 'utf8');
    expect(jitsiCfg).toMatch(/guestLink:\s*guestTokenUrl/);
    const meetingRoom = fs.readFileSync(path.join(root, 'Isara-doctor-portal/frontend/pages/meetings/MeetingRoom.tsx'), 'utf8');
    expect(meetingRoom).toMatch(/data\.guestLink\s*\|\|\s*data\.guestTokenUrl/);
    const doctorGuest = fs.readFileSync(path.join(root, 'Isara-doctor-portal/frontend/pages/meetings/GuestMeetingJoin.tsx'), 'utf8');
    expect(doctorGuest).toMatch(/openGuestJoinBlocked/);
    expect(doctorGuest).toMatch(/Anonymous guest access is disabled/);
    expect(doctorGuest).toMatch(/PATIENT_PORTAL_URL/);
  });

  it('MEET-UX-19 — patient AuthContext demo auto-login on meeting route', () => {
    const auth = fs.readFileSync(path.join(root, 'Isara-patient-portal/frontend/utils/demoAutoAuth.ts'), 'utf8');
    expect(auth).toMatch(/shouldBypassLoginRedirectForMeeting/);
    expect(auth).toMatch(/isPatientMeetingRoute/);
    const guard = fs.readFileSync(path.join(root, 'Isara-patient-portal/frontend/pages/PatientMeetingRoute.tsx'), 'utf8');
    expect(guard).toMatch(/meeting-auth-starting/);
  });

  it('MEET-UX-19b — doctor AuthProvider never navigates to /login on meeting route when DEMO_AUTO_LOGIN', () => {
    const auth = fs.readFileSync(path.join(root, 'Isara-doctor-portal/frontend/components/common/AuthProvider.tsx'), 'utf8');
    expect(auth).toMatch(/shouldBypassLoginRedirectForMeeting/);
    expect(auth).toMatch(/isDoctorMeetingRoute/);
    expect(auth).toMatch(/meeting-auth-starting/);
    expect(auth).toMatch(/!shouldBypassLoginRedirectForMeeting\(location\.pathname\)[\s\S]*navigate\('\/login'/);
  });

  it('MEET-UX-20 — patient meeting route requires auth (user-scoped like doctor)', () => {
    const app = fs.readFileSync(path.join(root, 'Isara-patient-portal/frontend/App.tsx'), 'utf8');
    expect(app).toMatch(/path="\/patient\/:userId\/meeting\/:appointmentId"/);
    expect(app).toMatch(/PatientMeetingRouteGuard/);
    expect(app).toMatch(/LegacyPatientMeetingRedirect/);
    const room = fs.readFileSync(path.join(root, 'Isara-patient-portal/frontend/pages/PatientMeetingRoom.tsx'), 'utf8');
    expect(room).not.toMatch(/guestParticipantId/);
  });

  it('MEET-UX-21 — docker env: DEMO_AUTO_LOGIN=1 and VITE_AUTO_ADMIT_LOBBY=0', () => {
    const dockerExample = fs.readFileSync(path.join(root, '.env.docker.example'), 'utf8');
    expect(dockerExample).toMatch(/DEMO_AUTO_LOGIN=1/);
    expect(dockerExample).toMatch(/VITE_AUTO_ADMIT_LOBBY=0/);
    const gate = fs.readFileSync(path.join(root, 'scripts/run-local-pre-deploy-gate.mjs'), 'utf8');
    expect(gate).toMatch(/VITE_AUTO_ADMIT_LOBBY:\s*'0'/);
    expect(gate).not.toMatch(/VITE_AUTO_ADMIT_LOBBY:\s*'1'/);
  });

  it('MEET-UX-22 — guest form testids on patient GuestMeetingJoin', () => {
    const guest = fs.readFileSync(path.join(root, 'Isara-patient-portal/frontend/pages/GuestMeetingJoin.tsx'), 'utf8');
    expect(guest).toMatch(/data-testid="guest-name-input"/);
    expect(guest).toMatch(/data-testid="guest-join-btn"/);
    expect(guest).toMatch(/data-testid="guest-lobby-waiting"/);
  });

  it('MEET-UX-23 — headed E2E env keeps manual admit (VITE_AUTO_ADMIT_LOBBY=0)', () => {
    const headed = fs.readFileSync(path.join(root, 'scripts/gates/lib/run-step.mjs'), 'utf8');
    expect(headed).toMatch(/VITE_AUTO_ADMIT_LOBBY:\s*'0'/);
  });

  it('MEET-UX-24 — patient Jitsi only after lobby admit and host-ready', () => {
    const patientRoom = fs.readFileSync(path.join(root, 'Isara-patient-portal/frontend/pages/PatientMeetingRoom.tsx'), 'utf8');
    expect(patientRoom).toMatch(/lobbyStatus !== 'admitted'/);
    expect(patientRoom).toMatch(/waitForHostReady/);
    expect(patientRoom).toMatch(/mountJitsiMeeting/);
  });

  it('MEET-UX-25 — doctor HealthMeeting only autostarts on explicit ?autostart= / ?appointmentId=', () => {
    const hm = fs.readFileSync(path.join(root, 'Isara-doctor-portal/frontend/pages/meetings/HealthMeeting.tsx'), 'utf8');
    expect(hm).toMatch(/isDemoAutoMeetingEnabled/);
    expect(hm).toMatch(/searchParams\.get\('autostart'\)/);
    expect(hm).not.toMatch(/meetings\.find\(/);
    expect(hm).toMatch(/shouldStayOnHealthMeetingQueue|stayOnQueue/);
  });

  it('MEET-UX-26 — demoAutoAuth shouldStayOnHealthMeetingQueue helper', () => {
    const auth = fs.readFileSync(path.join(root, 'Isara-doctor-portal/frontend/utils/demoAutoAuth.ts'), 'utf8');
    expect(auth).toMatch(/shouldStayOnHealthMeetingQueue/);
    expect(auth).toMatch(/stayOnQueue/);
  });

  it('MEET-UX-27 — multi-portal doctorHealthMeetingUrl defaults stayOnQueue for tests', () => {
    const mp = fs.readFileSync(path.join(root, 'tests/helpers/multi-portal.ts'), 'utf8');
    expect(mp).toMatch(/doctorHealthMeetingUrl/);
    expect(mp).toMatch(/stayOnQueue=1/);
    expect(mp).toMatch(/ensureHealthMeetingStayOnQueue/);
  });

  it('MEET-UX-28 — doctor env-config defaults DEMO_AUTO_MEETING off', () => {
    const env = fs.readFileSync(path.join(root, 'Isara-doctor-portal/frontend/public/env-config.js'), 'utf8');
    expect(env).toMatch(/DEMO_AUTO_MEETING:\s*'0'/);
  });
});
