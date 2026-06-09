/**
 * Google Calendar add-event URL builder (no OAuth required).
 * Mirrors patient-portal notificationService.generateCalendarUrl.
 */

function buildGoogleCalendarUrl(data) {
  const { title, description, startDateTime, endDateTime, location } = data;
  const startDate = new Date(startDateTime).toISOString().replaceAll(/[-:]/g, '').split('.')[0] + 'Z';
  const endDate = new Date(endDateTime).toISOString().replaceAll(/[-:]/g, '').split('.')[0] + 'Z';

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'Izara Appointment',
    dates: `${startDate}/${endDate}`,
    details: description || '',
    location: location || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildTelehealthCalendarUrl(opts) {
  const {
    appointmentId,
    confirmedDate,
    confirmedTime,
    doctorName,
    patientName,
    meetingLink,
    durationMinutes = 30,
  } = opts;

  const dateStr = String(confirmedDate || '').split('T')[0];
  const timeStr = String(confirmedTime || '09:00').slice(0, 5);
  const startDateTime = new Date(`${dateStr}T${timeStr}:00`);
  const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

  const title = `Izara Telehealth — ${doctorName || 'Doctor'}`;
  const description = [
    `Patient: ${patientName || 'Patient'}`,
    appointmentId ? `Appointment: ${appointmentId}` : '',
    meetingLink ? `Join: ${meetingLink}` : '',
  ].filter(Boolean).join('\n');

  return buildGoogleCalendarUrl({
    title,
    description,
    startDateTime: startDateTime.toISOString(),
    endDateTime: endDateTime.toISOString(),
    location: meetingLink || 'Izara Video Meeting',
  });
}

module.exports = {
  buildGoogleCalendarUrl,
  buildTelehealthCalendarUrl,
};
