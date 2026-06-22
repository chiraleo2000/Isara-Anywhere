import { describe, expect, it } from 'vitest';
import { buildCalendarEventUrl } from '../../../Isara-patient-portal/frontend/utils/buildCalendarEventUrl';

describe('buildCalendarEventUrl', () => {
  it('returns Google Calendar TEMPLATE URL', () => {
    const url = buildCalendarEventUrl({
      title: 'Izara Telehealth',
      description: 'Join meeting',
      startDate: '2026-06-10',
      startTime: '14:00',
      location: 'https://meet.jit.si/test',
    });
    expect(url).toContain('calendar.google.com');
    expect(url).toContain('action=TEMPLATE');
  });
});
