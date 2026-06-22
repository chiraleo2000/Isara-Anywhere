import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const dashboardPath = path.resolve(
  __dirname,
  '../../../Isara-doctor-portal/frontend/pages/DoctorDashboard.tsx',
);
const meetingRoomPath = path.resolve(
  __dirname,
  '../../../Isara-doctor-portal/frontend/pages/meetings/MeetingRoom.tsx',
);

describe('meeting lobby route regression guard', () => {
  it('routes doctor join action through MeetingRoom and exposes lobby notice UX', () => {
    const dashboardSource = fs.readFileSync(dashboardPath, 'utf8');
    const meetingSource = fs.readFileSync(meetingRoomPath, 'utf8');

    expect(dashboardSource).toContain('navigate(`/doctor/${doctor.id}/meeting/${apt.id}`)');
    expect(dashboardSource).not.toContain('href={apt.meetingLink}');
    expect(meetingSource).toContain('data-testid="lobby-panel"');
    expect(meetingSource).toContain('data-testid="lobby-notice"');
  });
});
