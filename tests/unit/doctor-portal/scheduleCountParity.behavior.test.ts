import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const DASHBOARD_ACTIVE_STATUSES = [
  'confirmed',
  'scheduled',
  'in_pool',
  'pending',
  'awaiting_doctor_response',
  'assigned',
];

const SCHEDULE_CALENDAR_STATUSES = ['confirmed', 'scheduled'];

function countDoctorActiveAppointments(
  appointments: Array<{ status: string; doctorId?: string; assignedDoctorId?: string }>,
  doctorId: string,
  statuses: string[],
): number {
  return appointments.filter((apt) => {
    const matchesDoctor =
      apt.doctorId === doctorId ||
      apt.assignedDoctorId === doctorId;
    return matchesDoctor && statuses.includes(apt.status);
  }).length;
}

const dashboardPath = path.resolve(
  __dirname,
  '../../../Isara-doctor-portal/frontend/pages/DoctorDashboard.tsx',
);
const schedulePath = path.resolve(
  __dirname,
  '../../../Isara-doctor-portal/frontend/pages/schedule/CompleteSchedule.tsx',
);

const DASHBOARD_STATUS_RE =
  /const isActiveStatus = \[([\s\S]*?)\]\.includes\(apt\.status\)/;
const SCHEDULE_STATUS_RE =
  /return \[([\s\S]*?)\]\.includes\(aptStatus\(apt\)\)/;

function blockHasStatuses(block: string, statuses: string[]): boolean {
  return statuses.every((s) => block.includes(`'${s}'`));
}

function sourceContainsStatuses(source: string, statuses: string[], kind: 'dashboard' | 'schedule'): boolean {
  const re = kind === 'dashboard' ? DASHBOARD_STATUS_RE : SCHEDULE_STATUS_RE;
  const blockMatch = re.exec(source);
  if (!blockMatch) return false;
  return blockHasStatuses(blockMatch[1], statuses);
}

describe('doctor schedule count parity behavior (D2)', () => {
  it('dashboard uses broad active filters; schedule uses confirmed calendar filters', () => {
    const dashboardSource = fs.readFileSync(dashboardPath, 'utf8');
    const scheduleSource = fs.readFileSync(schedulePath, 'utf8');
    expect(sourceContainsStatuses(dashboardSource, DASHBOARD_ACTIVE_STATUSES, 'dashboard')).toBe(true);
    expect(sourceContainsStatuses(scheduleSource, SCHEDULE_CALENDAR_STATUSES, 'schedule')).toBe(true);
  });

  it('schedule counter subset: confirmed visits only on calendar', () => {
    const doctorId = 'DOC-1';
    const appointments = [
      { status: 'confirmed', doctorId },
      { status: 'cancelled', doctorId },
      { status: 'awaiting_doctor_response', assignedDoctorId: doctorId },
    ];
    expect(countDoctorActiveAppointments(appointments, doctorId, DASHBOARD_ACTIVE_STATUSES)).toBe(2);
    expect(countDoctorActiveAppointments(appointments, doctorId, SCHEDULE_CALENDAR_STATUSES)).toBe(1);
  });
});
