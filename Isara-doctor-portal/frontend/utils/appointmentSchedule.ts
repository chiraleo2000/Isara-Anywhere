/** Map preferred-slot labels (morning/afternoon/evening) to HH:mm for <input type="time"> / calendar. */
export function normalizeAppointmentTime(raw: unknown, fallback = '10:00'): string {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return `${String(raw.getHours()).padStart(2, '0')}:${String(raw.getMinutes()).padStart(2, '0')}`;
  }
  if (typeof raw !== 'string' || !raw.trim()) return fallback;

  const value = raw.trim().toLowerCase();
  const slotDefaults: Record<string, string> = {
    morning: '10:00',
    afternoon: '14:00',
    evening: '18:00',
    'เช้า': '10:00',
    'บ่าย': '14:00',
    'เย็น': '18:00',
  };
  for (const [slot, hhmm] of Object.entries(slotDefaults)) {
    if (value === slot || value.includes(slot)) return hhmm;
  }

  // Accept HH:mm / HH:mm:ss / ISO datetime fragments
  const hhmm = value.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (hhmm) return `${hhmm[1].padStart(2, '0')}:${hhmm[2]}`;

  return fallback;
}

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
    ?? apt.appointmentTime ?? apt.appointment_time
    ?? apt.preferredTime ?? apt.preferred_time
    ?? apt.preferredTimeSlot ?? apt.preferred_time_slot
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

  return { date: dateStr, time: normalizeAppointmentTime(timeRaw, '09:00') };
}
