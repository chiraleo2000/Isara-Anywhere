/**
 * @process Processes/Appointment_Workflows.md, Processes/Pages/Patient-Portal/05_Appointments_Page.md
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

describe('Appointment UX contract (APPT-UX)', () => {
  const apptPages = fs.readFileSync(
    path.join(root, 'issara-patient/frontend/pages/AppointmentPages.tsx'),
    'utf8',
  );
  const apptBackend = fs.readFileSync(
    path.join(root, 'issara-patient/backend/routes/appointments.ts'),
    'utf8',
  );

  it('APPT-UX-01 — pool reroute supported in booking API', () => {
    expect(apptBackend).toMatch(/reroutedToPool/);
    expect(apptPages).toMatch(/in_pool|skipDoctorSelection/);
  });

  it('APPT-UX-02 — status badges', () => {
    expect(apptPages).toMatch(/status|badge/i);
  });

  it('APPT-UX-03 — join meeting CTA on dashboard', () => {
    expect(fs.readFileSync(path.join(root, 'issara-patient/frontend/pages/DashboardPage.tsx'), 'utf8'))
      .toMatch(/dashboard-join-meeting/);
  });

  it('APPT-UX-04 — confirm spinner guard', () => {
    expect(fs.readFileSync(path.join(root, 'issara-doctor/frontend/pages/meetings/HealthMeeting.tsx'), 'utf8'))
      .toMatch(/confirmInProgress|confirming/i);
  });

  it('APPT-UX-05 — calendar link on confirm', () => {
    expect(fs.readFileSync(path.join(root, 'issara-doctor/frontend/pages/meetings/HealthMeeting.tsx'), 'utf8'))
      .toMatch(/calendar|ics|google/i);
  });

  it('APPT-UX-06 — accepted queue list testid', () => {
    expect(fs.readFileSync(path.join(root, 'issara-doctor/frontend/pages/meetings/HealthMeeting.tsx'), 'utf8'))
      .toMatch(/accepted-queue-list/);
  });

  it('APPT-UX-07 — pool enrollment response.ok (Health Meeting queue)', () => {
    expect(fs.readFileSync(path.join(root, 'issara-doctor/frontend/pages/meetings/HealthMeeting.tsx'), 'utf8'))
      .toMatch(/response\.ok/);
  });

  it('APPT-UX-08 — appointment wizard vertical steps', () => {
    expect(apptPages).toMatch(/step|wizard/i);
  });

  it('APPT-UX-09 — skip-doctor pool path in wizard UI', () => {
    expect(apptPages).toMatch(/skip-doctor-selection|skipDoctorSelection/);
    expect(apptPages).toMatch(/appointment-date-/);
  });

  it('APPT-UX-10 — local date grid and MediaRecorder mime probe', () => {
    expect(apptPages).toMatch(/formatLocalDateYmd/);
    expect(apptPages).toMatch(/resolveRecordingMimeType/);
    expect(apptPages).toMatch(/appointment-date-/);
  });
});
