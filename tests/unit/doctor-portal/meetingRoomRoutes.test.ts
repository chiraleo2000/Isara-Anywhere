/**
 * @process Processes/Pages/Doctor-Portal/07_Virtual_Meeting.md, Processes/Pages/Meeting-Server/00_Meeting_Server_Overview.md
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const doctorPortal = path.resolve(__dirname, '../../../issara-doctor/frontend/pages/DoctorPortal.tsx');
const meetingRoom = path.resolve(__dirname, '../../../issara-doctor/frontend/pages/meetings/MeetingRoom.tsx');
const meetingResults = path.resolve(__dirname, '../../../issara-doctor/frontend/pages/meetings/MeetingResults.tsx');

describe('meeting room routes (MRR)', () => {
  const portalSrc = fs.readFileSync(doctorPortal, 'utf8');

  it('MRR-01 — meeting results route registered', () => {
    expect(portalSrc).toMatch(/meeting\/:appointmentId\/results/);
  });

  it('MRR-02 — EMR appointment route registered', () => {
    expect(portalSrc).toMatch(/emr\/:appointmentId/);
  });

  it('MRR-03 — MeetingResultsPage import', () => {
    expect(portalSrc).toMatch(/MeetingResultsPage/);
  });

  it('MRR-04 — EmrAppointmentPage import', () => {
    expect(portalSrc).toMatch(/EmrAppointmentPage/);
  });

  it('MRR-05 — MeetingRoom is the canonical in-app meeting route (no virtual-meeting)', () => {
    expect(portalSrc).toMatch(/meeting\/:appointmentId/);
    // virtual-meeting route is removed — all consultations use the real Jitsi /meeting/:id flow
    expect(portalSrc).not.toMatch(/path="virtual-meeting/);
    const src = fs.readFileSync(meetingRoom, 'utf8');
    expect(src).toMatch(/jitsi-meeting-container|JitsiMeetingShell|doctor-meeting-room/);
  });

  it('MRR-06 — MeetingResultsPage surfaces errors', () => {
    const src = fs.readFileSync(meetingResults, 'utf8');
    expect(src).toMatch(/setError|error/i);
  });

  it('MRR-07 — health meeting breadcrumb nav', () => {
    const hm = path.resolve(__dirname, '../../../issara-doctor/frontend/pages/meetings/HealthMeeting.tsx');
    expect(fs.readFileSync(hm, 'utf8')).toMatch(/health-meeting-breadcrumb/);
  });

  it('MRR-08 — meeting server health endpoint referenced in probe', () => {
    const probe = path.resolve(__dirname, '../../../scripts/docker/probe-health.mjs');
    expect(fs.readFileSync(probe, 'utf8')).toMatch(/3020/);
  });

  it('MRR-09 — doctor BFF meetings.cjs proxies results route', () => {
    const meetings = path.resolve(__dirname, '../../../issara-doctor/backend/routes/meetings.cjs');
    expect(fs.readFileSync(meetings, 'utf8')).toMatch(/\/api\/meetings\/:id\/results/);
    const main = path.resolve(__dirname, '../../../issara-doctor/backend/mainApiServer.cjs');
    expect(fs.readFileSync(main, 'utf8')).toMatch(/registerMeetingProxyRoutes/);
  });
});
