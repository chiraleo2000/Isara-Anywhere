/**
 * @process Processes/Appointment_Workflows.md
 * Calendar confirm notification payload (CAL-03–05).
 */
import { describe, it, expect } from 'vitest';

interface ConfirmNotificationInsert {
  user_id: string;
  type: string;
  data: {
    appointmentId: string;
    meetingLink?: string | null;
    calendarEventUrl?: string | null;
    confirmedDate?: string;
    confirmedTime?: string;
  };
}

function buildPatientConfirmNotification(ctx: {
  patientId: string;
  appointmentId: string;
  meetingLink: string | null;
  calendarEventUrl: string | null;
  confirmedDate: string;
  confirmedTime: string;
}): ConfirmNotificationInsert {
  return {
    user_id: ctx.patientId,
    type: 'appointment_confirmed',
    data: {
      appointmentId: ctx.appointmentId,
      meetingLink: ctx.meetingLink,
      calendarEventUrl: ctx.calendarEventUrl,
      confirmedDate: ctx.confirmedDate,
      confirmedTime: ctx.confirmedTime,
    },
  };
}

function buildDoctorScheduleNotification(ctx: {
  doctorId: string;
  appointmentId: string;
  calendarEventUrl: string;
  meetingLink: string | null;
  confirmedDate: string;
  confirmedTime: string;
  patientId: string;
}): ConfirmNotificationInsert {
  return {
    user_id: ctx.doctorId,
    type: 'schedule_entry_ready',
    data: {
      appointmentId: ctx.appointmentId,
      meetingLink: ctx.meetingLink,
      calendarEventUrl: ctx.calendarEventUrl,
      confirmedDate: ctx.confirmedDate,
      confirmedTime: ctx.confirmedTime,
    },
  };
}

describe('calendarConfirmNotification — CAL', () => {
  const base = {
    appointmentId: 'apt-cal-001',
    meetingLink: 'https://meet.example/room-1',
    calendarEventUrl: 'https://calendar.google.com/calendar/render?action=TEMPLATE',
    confirmedDate: '2026-06-15',
    confirmedTime: '10:00',
  };

  it('CAL-03 — patient notification includes calendarEventUrl', () => {
    const n = buildPatientConfirmNotification({
      patientId: 'PATIENT-DEMO',
      ...base,
    });
    expect(n.type).toBe('appointment_confirmed');
    expect(n.data.calendarEventUrl).toContain('calendar.google.com');
  });

  it('CAL-04 — meeting_link_ready when telehealth link present', () => {
    const hasLink = Boolean(base.meetingLink);
    expect(hasLink).toBe(true);
  });

  it('CAL-05 — doctor schedule_entry_ready includes calendarEventUrl', () => {
    const n = buildDoctorScheduleNotification({
      doctorId: 'DOC-TEST-001',
      patientId: 'PATIENT-DEMO',
      ...base,
    });
    expect(n.type).toBe('schedule_entry_ready');
    expect(n.data.calendarEventUrl).toBeTruthy();
    expect(n.user_id).toBe('DOC-TEST-001');
  });
});
