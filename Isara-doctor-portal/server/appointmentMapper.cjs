/**
 * Map PostgreSQL appointment rows to client-friendly payloads (camelCase + snake_case aliases).
 */

function mapAppointmentForClient(row) {
  if (!row) return row;

  const confirmedDate = row.confirmed_date || null;
  const confirmedTime = row.confirmed_time || null;
  const scheduledDate = row.scheduled_date || confirmedDate || row.requested_date || row.appointment_date || null;
  const scheduledTime = row.scheduled_time || confirmedTime || row.requested_time || row.appointment_time || null;
  const appointmentDate = confirmedDate || row.requested_date || row.appointment_date || scheduledDate;
  const appointmentTime = confirmedTime || row.requested_time || row.appointment_time || scheduledTime;
  const meetingLink = row.meeting_link || row.meet_link || null;

  return {
    ...row,
    doctorId: row.doctor_id || row.doctorId,
    patientId: row.patient_id || row.patientId,
    patientName: row.patient_name || row.patientName,
    patientNameThai: row.patient_name_thai || row.patientNameThai,
    doctorName: row.doctor_name || row.doctorName,
    doctorNameThai: row.doctor_name_thai || row.doctorNameThai,
    appointmentDate,
    appointmentTime,
    scheduledDate,
    scheduledTime,
    confirmedDate,
    confirmedTime,
    meetingLink,
    meetLink: meetingLink,
    appointmentType: row.appointment_type || row.appointmentType,
    assignedDoctorId: row.assigned_doctor_id || row.assignedDoctorId,
    adminAssignedDoctorId: row.admin_assigned_doctor_id || row.adminAssignedDoctorId,
    calendarEventUrl: row.calendar_event_url || row.calendarEventUrl || null,
    date: appointmentDate,
    time: appointmentTime,
  };
}

module.exports = {
  mapAppointmentForClient,
};
