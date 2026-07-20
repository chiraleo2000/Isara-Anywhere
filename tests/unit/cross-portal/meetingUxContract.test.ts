/**
 * @process Processes/VIDEO_MEETING_JITSI_GEMINI.md, Processes/POST_MEETING_WORKFLOW.md
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const anywhereRoot = path.resolve(__dirname, '../../../..');
const workspaceRoot = path.resolve(__dirname, '../../..');
/** Portal sources live beside workspace; workspace files (env/scripts/helpers) stay under workspaceRoot. */
const root = anywhereRoot;
const ws = workspaceRoot;

describe('Meeting UX contract (MEET-UX)', () => {
  it('MEET-UX-01 — patient video-meeting proxy forwards to meeting-server', () => {
    const src = fs.readFileSync(path.join(root, 'issara-patient/backend/routes/video-meeting-proxy.ts'), 'utf8');
    expect(src).toMatch(/MEETING_SERVER_URL/);
    expect(src).toMatch(/\/api\/meetings\/create/);
    expect(src).toMatch(/lobby\/join/);
  });

  it('MEET-UX-02 — MeetingResults error output', () => {
    expect(fs.readFileSync(path.join(root, 'issara-doctor/frontend/pages/meetings/MeetingResults.tsx'), 'utf8'))
      .toMatch(/<output|setError|error/i);
  });

  it('MEET-UX-03 — degraded AI badge', () => {
    expect(fs.readFileSync(path.join(root, 'issara-doctor/frontend/pages/meetings/MeetingResults.tsx'), 'utf8'))
      .toMatch(/degraded/i);
  });

  it('MEET-UX-04 — end meeting transitions to ended status (MeetingRoom canonical)', () => {
    const src = fs.readFileSync(path.join(root, 'issara-doctor/frontend/pages/meetings/MeetingRoom.tsx'), 'utf8');
    expect(src).toMatch(/status: 'ended'|status === 'ended'|'ended'/);
  });

  it('MEET-UX-05 — lobby admit flow', () => {
    expect(fs.readFileSync(path.join(root, 'issara-jitsi/backend/lobbySession.js'), 'utf8'))
      .toMatch(/admit|lobby/i);
  });

  it('MEET-UX-06 — postMeetingPipeline failure logging', () => {
    expect(fs.readFileSync(path.join(root, 'issara-jitsi/backend/services/postMeetingPipeline.js'), 'utf8'))
      .toMatch(/console\.(error|warn)|socket/i);
  });

  it('MEET-UX-07 — breadcrumb on health meeting', () => {
    expect(fs.readFileSync(path.join(root, 'issara-doctor/frontend/pages/meetings/HealthMeeting.tsx'), 'utf8'))
      .toMatch(/health-meeting-breadcrumb/);
  });

  it('MEET-UX-08 — doctor PDPA consent + pre-join flow before joining (explicit consent required)', () => {
    // Current UX requires an explicit PDPA consent step (recording/transcript/data-sharing) before
    // a doctor can join — auto-consent was rejected because consent must be an affirmative doctor action.
    const src = fs.readFileSync(path.join(root, 'issara-doctor/frontend/pages/meetings/MeetingRoom.tsx'), 'utf8');
    expect(src).toMatch(/data-testid="meeting-agreement"/);
    expect(src).toMatch(/data-testid="consent-recording-input"/);
    expect(src).toMatch(/data-testid="consent-transcript-input"/);
    expect(src).toMatch(/data-testid="consent-data-sharing-input"/);
    expect(src).toMatch(/data-testid="pre-join-screen"/);
    expect(src).toMatch(/data-testid="join-meeting-btn"/);
  });

  it('MEET-UX-09 — patient PDPA consent + pre-join flow before joining (explicit consent required)', () => {
    const src = fs.readFileSync(path.join(root, 'issara-patient/frontend/pages/PatientMeetingRoom.tsx'), 'utf8');
    expect(src).toMatch(/data-testid="meeting-agreement"/);
    expect(src).toMatch(/data-testid="consent-recording-input"/);
    expect(src).toMatch(/data-testid="pre-join-screen"/);
    expect(src).toMatch(/data-testid="patient-display-name"/);
    expect(src).toMatch(/data-testid="join-meeting-btn"/);
  });

  it('MEET-UX-10 — no virtual-meeting route or VirtualMeeting page exists', () => {
    const portal = fs.readFileSync(path.join(root, 'issara-doctor/frontend/pages/DoctorPortal.tsx'), 'utf8');
    expect(portal).not.toMatch(/path="virtual-meeting/);
    expect(portal).not.toMatch(/import VirtualMeeting/);
    expect(fs.existsSync(path.join(root, 'issara-doctor/frontend/pages/meetings/VirtualMeeting.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'issara-doctor/frontend/pages/VirtualMeeting.tsx'))).toBe(false);
  });

  it('MEET-UX-11 — patient appointment UI joins in-app meeting path (not an external window)', () => {
    const appt = fs.readFileSync(path.join(root, 'issara-patient/frontend/pages/AppointmentPages.tsx'), 'utf8');
    expect(appt).toMatch(/to=\{`\/meeting\/\$\{apt\.id\}`\}/);
    expect(appt).not.toMatch(/window\.open\([^)]*meetingLink/);
    const dash = fs.readFileSync(path.join(root, 'issara-patient/frontend/pages/DashboardPage.tsx'), 'utf8');
    expect(dash).toMatch(/to=\{`\/meeting\/\$\{apt\.id\}`\}/);
  });

  it('MEET-UX-12 — patient lobby join never bypasses the host gate', () => {
    const src = fs.readFileSync(path.join(root, 'issara-patient/frontend/pages/PatientMeetingRoom.tsx'), 'utf8');
    // After a failed lobby join we must not auto-admit; doctor hosts and admits.
    expect(src).not.toMatch(/setLobbyStatus\('admitted'\);\s*\n\s*setStatus\('waiting_host'\);\s*\n\s*void connectVideoWhenReady/);
    expect(src).toMatch(/waitForHostReady/);
  });

  it('MEET-UX-13 — patient Jitsi container exposes role attrs for E2E (JROLE01)', () => {
    const src = fs.readFileSync(path.join(root, 'issara-patient/frontend/pages/PatientMeetingRoom.tsx'), 'utf8');
    expect(src).toMatch(/setAttribute\('data-jitsi-moderator',\s*'false'\)/);
    expect(src).toMatch(/setAttribute\('data-jitsi-participant',\s*'true'\)/);
    expect(src).toMatch(/setAttribute\('data-jitsi-display-name'/);
  });

  it('MEET-UX-14 — join-config downgrades non-appointed doctor from HOST', () => {
    const src = fs.readFileSync(path.join(root, 'issara-jitsi/backend/index.js'), 'utf8');
    expect(src).toMatch(/appointedDoctorId/);
    expect(src).toMatch(/appointedDoctorId !== requestDoctorId/);
    expect(src).toMatch(/isHost = false/);
    expect(src).toMatch(/downgraded when doctor is not appointed/);
  });

  it('MEET-UX-15 — docker env documents auto-admit-off default for headed E2E', () => {
    // The isDemoAutoLoginEnabled/isDemoAutoMeetingEnabled demo-mode helpers were removed from the
    // frontends (no demoAutoAuth.ts in either portal) — login/join now always require a real action.
    // Only the env-var documentation contract remains relevant.
    const dockerExample = fs.readFileSync(path.join(ws, '.env.docker.example'), 'utf8');
    expect(dockerExample).toMatch(/VITE_AUTO_ADMIT_LOBBY=0/);
    expect(dockerExample).toMatch(/PATIENT_PORTAL_URL=/);
  });

  it('MEET-UX-16 — Jitsi prejoin is disabled via mount config in both portals', () => {
    // wireJitsiSkipPrejoin (executeCommand override) is used for the guest mount path; authenticated
    // doctor/patient mounts disable prejoin declaratively via configOverwrite instead.
    const sharedCfg = fs.readFileSync(path.join(root, 'issara-patient/frontend/utils/jitsiMeetingConfig.ts'), 'utf8');
    expect(sharedCfg).toMatch(/wireJitsiSkipPrejoin/);
    expect(sharedCfg).toMatch(/prejoinPageEnabled:\s*false/);
    const patientRoom = fs.readFileSync(path.join(root, 'issara-patient/frontend/pages/PatientMeetingRoom.tsx'), 'utf8');
    const doctorRoom = fs.readFileSync(path.join(root, 'issara-doctor/frontend/pages/meetings/MeetingRoom.tsx'), 'utf8');
    expect(patientRoom).toMatch(/buildPatientJitsiMountOptions/);
    expect(doctorRoom).toMatch(/jitsiMeetingConfig/);
  });

  it('MEET-UX-17 — patient meeting API uses same-origin BFF plus meeting-server join-config', () => {
    const patientRoom = fs.readFileSync(path.join(root, 'issara-patient/frontend/pages/PatientMeetingRoom.tsx'), 'utf8');
    const server = fs.readFileSync(path.join(root, 'issara-jitsi/backend/index.js'), 'utf8');
    expect(patientRoom).toMatch(/resolveMeetingServerUrl/);
    expect(patientRoom).toMatch(/patientMeetingUrl/);
    expect(patientRoom).toMatch(/fetchMeetingJoinConfig/);
    expect(server).toMatch(/\/api\/meetings\/:id\/join-config/);
    expect(server).toMatch(/ensureMeetingRecordForAppointment/);
  });

  it('MEET-UX-18 — anonymous guest join is supported end-to-end (lobby admit + Jitsi mount)', () => {
    // Current product intentionally supports anonymous guest join via a shareable link — it is not
    // blocked. Doctor copies whichever link the server returns (token-signed when available).
    const jitsiCfg = fs.readFileSync(path.join(root, 'issara-jitsi/backend/jitsiConfig.js'), 'utf8');
    expect(jitsiCfg).toMatch(/guestLink:\s*guestTokenUrl/);
    const meetingRoom = fs.readFileSync(path.join(root, 'issara-doctor/frontend/pages/meetings/MeetingRoom.tsx'), 'utf8');
    expect(meetingRoom).toMatch(/data\.guestLink/);
    expect(meetingRoom).toMatch(/data\.guestTokenUrl/);
    const doctorGuest = fs.readFileSync(path.join(root, 'issara-doctor/frontend/pages/meetings/GuestMeetingJoin.tsx'), 'utf8');
    expect(doctorGuest).toMatch(/data-testid="guest-join-form"/);
    expect(doctorGuest).toMatch(/handleJoinLobby/);
    expect(doctorGuest).toMatch(/mountGuestJitsiMeeting/);
  });

  it('MEET-UX-19 — patient meeting route is reachable via ProtectedRoute (ownership verified server-side)', () => {
    // demoAutoAuth.ts / shouldBypassLoginRedirectForMeeting were removed — patients must be logged in;
    // PatientMeetingRoom itself re-verifies appointment ownership against the authenticated user.
    const room = fs.readFileSync(path.join(root, 'issara-patient/frontend/pages/PatientMeetingRoom.tsx'), 'utf8');
    expect(room).toMatch(/ownershipRes\.status === 401 \|\| ownershipRes\.status === 403/);
    const app = fs.readFileSync(path.join(root, 'issara-patient/frontend/App.tsx'), 'utf8');
    expect(app).toMatch(/path="\/meeting\/:appointmentId"\s+element=\{<ProtectedRoute><PatientMeetingRoom \/><\/ProtectedRoute>\}/);
  });

  it('MEET-UX-19b — doctor meeting route requires full portal login (no anonymous doctor join)', () => {
    // Doctors always authenticate normally; ProtectedRoute already guards the whole /doctor/:userId/*
    // subtree (including the meeting breakout), so no separate meeting-route login bypass exists.
    const portal = fs.readFileSync(path.join(root, 'issara-doctor/frontend/pages/DoctorPortal.tsx'), 'utf8');
    expect(portal).toMatch(/if \(!user \|\| \(user\.role !== 'doctor' && user\.role !== 'admin'\)\)/);
    expect(portal).toMatch(/isMeetingBreakout/);
    const app = fs.readFileSync(path.join(root, 'issara-doctor/frontend/App.tsx'), 'utf8');
    expect(app).toMatch(/ProtectedRoute allowedRoles=\{\['doctor', 'admin'\]\}/);
  });

  it('MEET-UX-20 — patient meeting route works both legacy and user-scoped', () => {
    const app = fs.readFileSync(path.join(root, 'issara-patient/frontend/App.tsx'), 'utf8');
    expect(app).toMatch(/path="\/meeting\/:appointmentId"/);
    expect(app).toMatch(/path="\/patient\/:userId\/meeting\/:appointmentId"/);
    const room = fs.readFileSync(path.join(root, 'issara-patient/frontend/pages/PatientMeetingRoom.tsx'), 'utf8');
    expect(room).toMatch(/appointmentId/);
  });

  it('MEET-UX-21 — docker env: DEMO_AUTO_LOGIN=1 and VITE_AUTO_ADMIT_LOBBY=0', () => {
    const dockerExample = fs.readFileSync(path.join(ws, '.env.docker.example'), 'utf8');
    expect(dockerExample).toMatch(/DEMO_AUTO_LOGIN=1/);
    expect(dockerExample).toMatch(/VITE_AUTO_ADMIT_LOBBY=0/);
    const gate = fs.readFileSync(path.join(ws, 'scripts/run-local-pre-deploy-gate.mjs'), 'utf8');
    expect(gate).toMatch(/VITE_AUTO_ADMIT_LOBBY:\s*'0'/);
    expect(gate).not.toMatch(/VITE_AUTO_ADMIT_LOBBY:\s*'1'/);
  });

  it('MEET-UX-22 — guest form testids on patient GuestMeetingJoin', () => {
    const guest = fs.readFileSync(path.join(root, 'issara-patient/frontend/pages/GuestMeetingJoin.tsx'), 'utf8');
    expect(guest).toMatch(/data-testid="guest-name-input"/);
    expect(guest).toMatch(/data-testid="guest-join-btn"/);
    expect(guest).toMatch(/data-testid="guest-lobby-waiting"/);
  });

  it('MEET-UX-23 — headed E2E env keeps manual admit (VITE_AUTO_ADMIT_LOBBY=0)', () => {
    const headed = fs.readFileSync(path.join(ws, 'scripts/gates/lib/run-step.mjs'), 'utf8');
    expect(headed).toMatch(/VITE_AUTO_ADMIT_LOBBY:\s*'0'/);
  });

  it('MEET-UX-24 — patient Jitsi only after lobby admit and host-ready', () => {
    const patientRoom = fs.readFileSync(path.join(root, 'issara-patient/frontend/pages/PatientMeetingRoom.tsx'), 'utf8');
    expect(patientRoom).toMatch(/lobbyStatus !== 'admitted'/);
    expect(patientRoom).toMatch(/waitForHostReady/);
    expect(patientRoom).toMatch(/mountJitsiMeeting/);
  });

  it('MEET-UX-25 — doctor HealthMeeting has no auto-navigate-into-meeting side effect', () => {
    // The earlier demo-auto-meeting/autostart concept was removed; HealthMeeting now stays on the
    // queue/dashboard view until the doctor explicitly starts a consultation from a specific card.
    const hm = fs.readFileSync(path.join(root, 'issara-doctor/frontend/pages/meetings/HealthMeeting.tsx'), 'utf8');
    expect(hm).not.toMatch(/isDemoAutoMeetingEnabled/);
    expect(hm).toMatch(/health-meeting-breadcrumb/);
  });

  it('MEET-UX-26 — demoAutoAuth.ts demo-mode helper was removed from the doctor portal', () => {
    expect(fs.existsSync(path.join(root, 'issara-doctor/frontend/utils/demoAutoAuth.ts'))).toBe(false);
  });

  it('MEET-UX-27 — multi-portal doctorHealthMeetingUrl defaults stayOnQueue for tests', () => {
    const mp = fs.readFileSync(path.join(ws, 'tests/helpers/multi-portal.ts'), 'utf8');
    expect(mp).toMatch(/doctorHealthMeetingUrl/);
    expect(mp).toMatch(/stayOnQueue=1/);
    expect(mp).toMatch(/ensureHealthMeetingStayOnQueue/);
  });

  it('MEET-UX-28 — doctor env defaults DEMO_AUTO_MEETING off', () => {
    // The doctor portal has no env-config.js runtime-injection template (that pattern is
    // patient-portal-only, see BFF-05) — its env default lives directly in .env.example.
    const env = fs.readFileSync(path.join(root, 'issara-doctor/.env.example'), 'utf8');
    expect(env).toMatch(/DEMO_AUTO_MEETING=0/);
  });
});
