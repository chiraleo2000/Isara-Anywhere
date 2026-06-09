import { describe, expect, it } from 'vitest';
import {
  buildGoogleCalendarUrl,
  buildTelehealthCalendarUrl,
} from '../../../Isara-doctor-portal/server/calendarEventLinks.cjs';

describe('calendarEventLinks', () => {
  it('buildGoogleCalendarUrl returns Google Calendar TEMPLATE link', () => {
    const url = buildGoogleCalendarUrl({
      title: 'Test Event',
      description: 'Details',
      startDateTime: '2026-06-10T10:00:00.000Z',
      endDateTime: '2026-06-10T10:30:00.000Z',
      location: 'Online',
    });
    expect(url).toContain('calendar.google.com');
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain('Test+Event');
  });

  it('buildTelehealthCalendarUrl embeds meeting link in location', () => {
    const url = buildTelehealthCalendarUrl({
      appointmentId: 'APT-99',
      confirmedDate: '2026-06-10',
      confirmedTime: '14:00',
      doctorName: 'Dr. Test',
      patientName: 'Patient',
      meetingLink: 'https://meet.jit.si/izara-room',
    });
    expect(url).toContain('calendar.google.com');
    expect(url).toContain(encodeURIComponent('https://meet.jit.si/izara-room'));
  });
});
