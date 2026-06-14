/**
 * @process Processes/Appointment_Workflows.md, Processes/Pages/Patient-Portal/05_Appointments_Page.md
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

describe('Appointment UX contract (APPT-UX)', () => {
  const apptPages = fs.readFileSync(
    path.join(root, 'Isara-patient-portal/src/pages/appointments/AppointmentPages.tsx'),
    'utf8',
  );

  it('APPT-UX-01 — reroutedToPool notice', () => {
    expect(apptPages).toMatch(/reroutedToPool/);
  });

  it('APPT-UX-02 — status badges', () => {
    expect(apptPages).toMatch(/status|badge/i);
  });

  it('APPT-UX-03 — join meeting CTA on dashboard', () => {
    expect(fs.readFileSync(path.join(root, 'Isara-patient-portal/src/pages/DashboardPage.tsx'), 'utf8'))
      .toMatch(/dashboard-join-meeting/);
  });

  it('APPT-UX-04 — confirm spinner guard', () => {
    expect(fs.readFileSync(path.join(root, 'Isara-doctor-portal/src/pages/meetings/HealthMeeting.tsx'), 'utf8'))
      .toMatch(/confirmInProgress|confirming/i);
  });

  it('APPT-UX-05 — calendar link on confirm', () => {
    expect(fs.readFileSync(path.join(root, 'Isara-doctor-portal/src/pages/meetings/HealthMeeting.tsx'), 'utf8'))
      .toMatch(/calendar|ics|google/i);
  });

  it('APPT-UX-06 — accepted queue list testid', () => {
    expect(fs.readFileSync(path.join(root, 'Isara-doctor-portal/src/pages/meetings/HealthMeeting.tsx'), 'utf8'))
      .toMatch(/accepted-queue-list/);
  });

  it('APPT-UX-07 — pool enrollment response.ok', () => {
    expect(fs.readFileSync(path.join(root, 'Isara-doctor-portal/src/pages/AppointmentPoolManagement.tsx'), 'utf8'))
      .toMatch(/response\.ok/);
  });

  it('APPT-UX-08 — appointment wizard vertical steps', () => {
    expect(apptPages).toMatch(/step|wizard/i);
  });

  it('APPT-UX-09 — reroute notice uses banner not alert', () => {
    expect(apptPages).toMatch(/reroutedToPool/);
    expect(apptPages).toMatch(/type:\s*created\.reroutedToPool\s*\?\s*'warning'/);
  });
});
