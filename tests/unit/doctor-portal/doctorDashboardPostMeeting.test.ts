/**
 * @process Processes/POST_MEETING_WORKFLOW.md
 */
import { describe, it, expect } from 'vitest';
import { getRecentCompletedAppointments } from '../../../Isara-doctor-portal/frontend/utils/postMeetingAppointments';

describe('doctorDashboardPostMeeting — completed appointment summary source', () => {
  const appointments = [
    { id: 'apt-upcoming', patientId: 'P1', status: 'confirmed', date: '2026-06-20' },
    { id: 'apt-old', patientId: 'P1', status: 'completed', date: '2026-06-01' },
    { id: 'apt-recent', patientId: 'P1', status: 'completed', date: '2026-06-18' },
    { id: 'apt-other', patientId: 'P2', status: 'completed', date: '2026-06-17' },
  ];

  it('PM-01 — getRecentCompletedAppointments excludes upcoming statuses', () => {
    const completed = getRecentCompletedAppointments(appointments);
    expect(completed).toHaveLength(3);
    expect(completed.every((a) => a.status === 'completed')).toBe(true);
    expect(completed.find((a) => a.id === 'apt-upcoming')).toBeUndefined();
  });

  it('PM-01b — most recent completed first for patient filter', () => {
    const mostRecentForPatient = getRecentCompletedAppointments(appointments).find(
      (a) => a.patientId === 'P1',
    );
    expect(mostRecentForPatient?.id).toBe('apt-recent');
  });
});
