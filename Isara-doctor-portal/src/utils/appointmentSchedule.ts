/** Resolve appointment date/time from API payloads (camelCase or snake_case). */
export function resolveAppointmentSchedule(
  apt: Record<string, unknown> | null | undefined,
): { date: string; time: string } {
  if (!apt) {
    const now = new Date();
    return {
      date: now.toISOString().split('T')[0],
      time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    };
  }

  const dateRaw =
    apt.confirmedDate ?? apt.confirmed_date
    ?? apt.requestedDate ?? apt.requested_date
    ?? apt.scheduledDate ?? apt.scheduled_date
    ?? apt.appointmentDate ?? apt.appointment_date
    ?? apt.date;

  const timeRaw =
    apt.confirmedTime ?? apt.confirmed_time
    ?? apt.requestedTime ?? apt.requested_time
    ?? apt.scheduledTime ?? apt.scheduled_time
    ?? apt.time
    ?? '09:00';

  let dateStr: string;
  if (typeof dateRaw === 'string') {
    dateStr = dateRaw.split('T')[0];
  } else if (dateRaw instanceof Date) {
    dateStr = dateRaw.toISOString().split('T')[0];
  } else {
    dateStr = new Date().toISOString().split('T')[0];
  }

  let timeStr = '09:00';
  if (typeof timeRaw === 'string') {
    timeStr = timeRaw.slice(0, 5);
  } else if (timeRaw instanceof Date) {
    timeStr = `${String(timeRaw.getHours()).padStart(2, '0')}:${String(timeRaw.getMinutes()).padStart(2, '0')}`;
  }
  return { date: dateStr, time: timeStr };
}
