/** Build Google Calendar add-event URL (no OAuth). */
export function buildCalendarEventUrl(opts: {
  title: string;
  description?: string;
  startDate: string;
  startTime: string;
  durationMinutes?: number;
  location?: string;
}): string {
  const { title, description, startDate, startTime, durationMinutes = 30, location } = opts;
  const dateStr = startDate.split('T')[0];
  const timeStr = startTime.slice(0, 5);
  const start = new Date(`${dateStr}T${timeStr}:00`);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replaceAll(/[-:]/g, '').split('.')[0] + 'Z';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: description || '',
    location: location || '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
