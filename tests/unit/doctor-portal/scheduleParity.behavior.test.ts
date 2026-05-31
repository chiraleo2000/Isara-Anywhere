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

const ACTIVE_STATUSES = [
  'awaiting_doctor_response',
  'confirmed',
  'scheduled',
];

function sourceIncludesAllStatuses(source: string, statuses: string[]): boolean {
  return statuses.every((s) => source.includes(s));
}

describe('doctor schedule parity behavior (D2)', () => {
  it('dashboard and schedule share active appointment statuses', () => {
    const dashboardSource = fs.readFileSync(dashboardPath, 'utf8');
    const scheduleSource = fs.readFileSync(schedulePath, 'utf8');
    expect(sourceIncludesAllStatuses(dashboardSource, ACTIVE_STATUSES)).toBe(true);
    expect(sourceIncludesAllStatuses(scheduleSource, ACTIVE_STATUSES)).toBe(true);
  });
});
