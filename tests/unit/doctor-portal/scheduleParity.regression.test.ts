import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const dashboardPath = path.resolve(
  __dirname,
  '../../../issara-doctor/frontend/pages/DoctorDashboard.tsx',
);

const schedulePath = path.resolve(
  __dirname,
  '../../../issara-doctor/frontend/pages/schedule/CompleteSchedule.tsx',
);

/** Calendar schedule shows confirmed visits only; dashboard tracks broader queue statuses. */
const SCHEDULE_CALENDAR_STATUSES = ['confirmed', 'scheduled'];

describe('doctor schedule parity regression guard', () => {
  it('dashboard tracks queue statuses; schedule shows confirmed calendar entries', () => {
    const dashboardSource = fs.readFileSync(dashboardPath, 'utf8');
    const scheduleSource = fs.readFileSync(schedulePath, 'utf8');

    expect(/awaiting_doctor_response/.test(dashboardSource)).toBe(true);
    for (const status of SCHEDULE_CALENDAR_STATUSES) {
      expect(scheduleSource).toContain(`'${status}'`);
    }
    expect(scheduleSource).toContain('resolveAppointmentSchedule');
    expect(scheduleSource).toContain('doctor_id');
  });
});
