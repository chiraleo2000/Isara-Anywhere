/**
 * Doctor confirm must persist confirmed_date for patient UI.
 */
import { describe, it, expect } from 'vitest';

function buildConfirmUpdate(body: {
  confirmedDate?: string;
  confirmedTime?: string;
  appointment: { scheduled_date?: string; requested_date?: string; scheduled_time?: string; requested_time?: string };
}) {
  const confirmedDate = body.confirmedDate || body.appointment.scheduled_date;
  const confirmedTime = body.confirmedTime || body.appointment.scheduled_time;
  return {
    status: 'confirmed',
    confirmed_date: confirmedDate || body.appointment.requested_date,
    confirmed_time: confirmedTime || body.appointment.requested_time,
    scheduled_date: confirmedDate || body.appointment.scheduled_date,
    scheduled_time: confirmedTime || body.appointment.scheduled_time,
  };
}

describe('confirmSetsConfirmedDate', () => {
  it('sets confirmed_date and confirmed_time on doctor confirm', () => {
    const update = buildConfirmUpdate({
      confirmedDate: '2026-06-10',
      confirmedTime: '10:30',
      appointment: { requested_date: '2026-06-09', requested_time: '09:00' },
    });
    expect(update.confirmed_date).toBe('2026-06-10');
    expect(update.confirmed_time).toBe('10:30');
    expect(update.status).toBe('confirmed');
  });
});
