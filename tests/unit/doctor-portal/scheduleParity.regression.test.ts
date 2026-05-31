import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const dashboardPath = path.resolve(
  __dirname,
  '../../../Isara-doctor-portal/src/pages/DoctorDashboard.tsx',
);

const schedulePath = path.resolve(
  __dirname,
  '../../../Isara-doctor-portal/src/pages/schedule/CompleteSchedule.tsx',
);

describe('doctor schedule parity regression guard', () => {
  it('uses aligned active appointment statuses in dashboard and schedule', () => {
    const dashboardSource = fs.readFileSync(dashboardPath, 'utf8');
    const scheduleSource = fs.readFileSync(schedulePath, 'utf8');

    const dashboardHasAwaiting = /awaiting_doctor_response/.test(dashboardSource);
    const scheduleHasAwaiting = /awaiting_doctor_response/.test(scheduleSource);

    expect(dashboardHasAwaiting).toBe(true);
    expect(scheduleHasAwaiting).toBe(true);
  });
});
