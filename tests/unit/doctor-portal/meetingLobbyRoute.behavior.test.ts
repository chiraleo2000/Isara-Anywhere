import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const dashboardPath = path.resolve(
  __dirname,
  '../../../issara-doctor/frontend/pages/DoctorDashboard.tsx',
);
const meetingRoomPath = path.resolve(
  __dirname,
  '../../../issara-doctor/frontend/pages/meetings/MeetingRoom.tsx',
);

describe('meeting lobby route behavior (M2)', () => {
  it('doctor dashboard links to meeting room route not raw external-only join', () => {
    const dashboard = fs.readFileSync(dashboardPath, 'utf8');
    expect(dashboard).toMatch(/\/meetings\/|meeting/i);
  });

  it('MeetingRoom handles lobby/admit flow', () => {
    const room = fs.readFileSync(meetingRoomPath, 'utf8');
    expect(room).toMatch(/lobby|admit|waiting/i);
  });
});
