/**
 * Maps PostgreSQL appointment rows (+ optional user join columns) to queue/pool DTOs.
 * Single source of truth for admin pool, health meeting queue, and API list responses.
 */

function parseJsonField(val) {
  if (val == null) return null;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return null;
  }
}

function parseSymptoms(row) {
  const raw = row.symptoms ?? row.symptom_list;
  const parsed = parseJsonField(raw);
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === 'string' && parsed.length > 0) return [parsed];
  if (row.symptom_description) return [row.symptom_description];
  if (row.reason) return [row.reason];
  return [];
}

/**
 * Derive legacy poolStatus for AppointmentPoolManagement UI.
 */
function derivePoolStatus(status, doctorId) {
  if (status === 'in_pool' || status === 'pending') return 'pending';
  if (status === 'awaiting_doctor_response' && doctorId) return 'doctor_claimed';
  if (status === 'awaiting_doctor_response') return 'ai_matched';
  return status || 'pending';
}

/**
 * Full queue card for Health Meeting, pool admin, and list APIs.
 * @param {object} row - appointments row with optional patient_name, doctor_name joins
 */
function mapAppointmentToQueueCard(row) {
  if (!row) return null;
  const symptoms = parseSymptoms(row);
  const aiTriage = parseJsonField(row.ai_triage);
  const status = row.status || 'pending';
  const doctorId = row.doctor_id || null;
  const patientId = row.patient_id || '';

  return {
    id: row.id,
    appointmentId: row.id,
    patientId,
    patientName: row.patient_name || row.patient_name_thai || 'Unknown Patient',
    patientEmail: row.patient_email || '',
    patientPhone: row.patient_phone || null,
    doctorId,
    doctorName: row.doctor_name || row.doctor_name_thai || null,
    status,
    poolStatus: derivePoolStatus(status, doctorId),
    poolReason: doctorId ? 'admin_assigned' : 'no_doctor_selected',
    urgency: row.urgency_level || row.urgency || 'normal',
    appointmentType: row.appointment_type || 'telehealth',
    symptoms,
    symptomDescription: row.symptom_description || row.reason || symptoms.join(', '),
    reason: row.reason || row.symptom_description || symptoms[0] || '',
    aiTriage,
    aiAnalysis: aiTriage,
    notes: row.notes || '',
    requestedDate: row.requested_date || row.confirmed_date || row.appointment_date || null,
    requestedTime: row.requested_time || row.confirmed_time || row.appointment_time || null,
    preferredDates: parseJsonField(row.preferred_dates) || (row.requested_date ? [row.requested_date] : []),
    preferredTimeSlot: row.preferred_time_slot || null,
    requiredSpecialty: row.required_specialty || row.suggested_specialty || null,
    meetLink: row.meet_link || row.meeting_link || null,
    jitsiRoomName: row.jitsi_room_name || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    claimedByDoctorId: status === 'awaiting_doctor_response' ? doctorId : undefined,
    assignedDoctorId: doctorId,
    assignedDoctorName: row.doctor_name || null,
  };
}

/**
 * Pool list item shape (extends queue card with pool-specific fields).
 */
function mapAppointmentToPoolItem(row) {
  const card = mapAppointmentToQueueCard(row);
  if (!card) return null;
  return {
    ...card,
    matchedSpecialties: card.requiredSpecialty ? [card.requiredSpecialty] : [],
    preferredTimeSlot: card.preferredTimeSlot || 'morning',
    missedCount: 0,
  };
}

module.exports = {
  mapAppointmentToQueueCard,
  mapAppointmentToPoolItem,
  derivePoolStatus,
  parseSymptoms,
};
