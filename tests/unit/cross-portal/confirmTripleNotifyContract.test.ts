/**
 * Confirm triple notify — patient confirmed + meeting link + doctor schedule entry.
 */
import { describe, it, expect } from 'vitest';

interface ConfirmNotification {
  type: string;
  audience: 'patient' | 'doctor';
  appointmentId: string;
  calendarEventUrl: string;
}

function buildConfirmNotifications(ctx: {
  appointmentId: string;
  calendarEventUrl: string;
  meetingLink: string;
}): ConfirmNotification[] {
  const { appointmentId, calendarEventUrl } = ctx;
  return [
    {
      type: 'appointment_confirmed',
      audience: 'patient',
      appointmentId,
      calendarEventUrl,
    },
    {
      type: 'meeting_link_ready',
      audience: 'patient',
      appointmentId,
      calendarEventUrl,
    },
    {
      type: 'schedule_entry_ready',
      audience: 'doctor',
      appointmentId,
      calendarEventUrl,
    },
  ];
}

describe('confirmTripleNotifyContract', () => {
  it('CTN-01 — buildConfirmNotifications returns exactly 3 typed notifications', () => {
    const notes = buildConfirmNotifications({
      appointmentId: 'apt-ctn-001',
      calendarEventUrl: 'https://calendar.google.com/calendar/render?action=TEMPLATE',
      meetingLink: 'https://meet.example/room-1',
    });
    expect(notes).toHaveLength(3);
    expect(notes.map((n) => n.type)).toEqual([
      'appointment_confirmed',
      'meeting_link_ready',
      'schedule_entry_ready',
    ]);
    expect(notes.find((n) => n.type === 'meeting_link_ready')?.audience).toBe('patient');
    expect(notes.find((n) => n.type === 'schedule_entry_ready')?.audience).toBe('doctor');
  });

  it('CTN-02 — all notifications include calendarEventUrl and appointmentId', () => {
    const notes = buildConfirmNotifications({
      appointmentId: 'apt-ctn-002',
      calendarEventUrl: 'https://calendar.google.com/calendar/render?action=TEMPLATE',
      meetingLink: 'https://meet.example/room-2',
    });
    for (const n of notes) {
      expect(n.calendarEventUrl).toBeTruthy();
      expect(n.appointmentId).toBe('apt-ctn-002');
    }
  });
});
