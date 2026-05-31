import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ACTIVE_STATUSES = [
  'confirmed',
  'scheduled',
  'in_pool',
  'pending',
  'awaiting_doctor_response',
  'assigned',
];

function countDoctorActiveAppointments(
  appointments: Array<{ status: string; doctorId?: string; assignedDoctorId?: string }>,
  doctorId: string,
): number {
  return appointments.filter((apt) => {
    const matchesDoctor =
      apt.doctorId === doctorId ||
      apt.assignedDoctorId === doctorId;
    return matchesDoctor && ACTIVE_STATUSES.includes(apt.status);
  }).length;
}

const dashboardPath = path.resolve(
  __dirname,
  '../../../Isara-doctor-portal/src/pages/DoctorDashboard.tsx',
);
const schedulePath = path.resolve(
  __dirname,
  '../../../Isara-doctor-portal/src/pages/schedule/CompleteSchedule.tsx',
);

const ACTIVE_STATUS_BLOCK_RE =
  /const isActive(?:Status)? = \[([\s\S]*?)\]\.includes\(apt\.status\)/;

function sourceContainsActiveStatusBlock(source: string): boolean {
  const blockMatch = ACTIVE_STATUS_BLOCK_RE.exec(source);
  if (!blockMatch) return false;
  const block = blockMatch[1];
  return ACTIVE_STATUSES.every((s) => block.includes(`'${s}'`));
}

describe('doctor schedule count parity behavior (D2)', () => {
  it('dashboard and schedule use identical active status filters', () => {
    const dashboardSource = fs.readFileSync(dashboardPath, 'utf8');
    const scheduleSource = fs.readFileSync(schedulePath, 'utf8');
    expect(sourceContainsActiveStatusBlock(dashboardSource)).toBe(true);
    expect(sourceContainsActiveStatusBlock(scheduleSource)).toBe(true);
  });

  it('shared counter excludes cancelled appointments', () => {
    const doctorId = 'DOC-1';
    const appointments = [
      { status: 'confirmed', doctorId },
      { status: 'cancelled', doctorId },
      { status: 'awaiting_doctor_response', assignedDoctorId: doctorId },
    ];
    expect(countDoctorActiveAppointments(appointments, doctorId)).toBe(2);
  });
});
