/** Normalize JWT payload to a single actor id for doctor-scoped routes. */
export function resolveActorUserId(user) {
  return user?.id || user?.userId || user?.sub || null;
}

const ROLE_ID_FIELD = {
  patient: 'patient_id',
  doctor: 'doctor_id',
  admin: 'doctor_id',
  host: 'doctor_id',
};

/**
 * Meeting-scoped identity — no portal session required when URL/body participantId
 * matches the appointment's patient_id or doctor_id on meeting_records.
 */
export async function resolveMeetingScopedLobbyUser(ctx, meetingRouteId, participantId, requestedRole) {
  const role = String(requestedRole || '').toLowerCase();
  const field = ROLE_ID_FIELD[role];
  if (!field || !participantId) return null;

  const {
    activeMeetings,
    resolveLobbyKey,
    pool,
    dbAvailable,
  } = ctx;

  const lobbyKey = await resolveLobbyKey(meetingRouteId);
  const active = activeMeetings.get(meetingRouteId) || activeMeetings.get(lobbyKey);
  if (active) {
    const expected =
      role === 'patient' ? active.patientId : active.doctorId;
    if (expected && String(expected) === String(participantId)) {
      return { id: String(participantId), role: role === 'host' ? 'doctor' : role };
    }
  }

  if (!dbAvailable || !pool) return null;
  try {
    const row = await pool.query(
      `SELECT patient_id, doctor_id FROM meeting_records
       WHERE id::text = $1 OR appointment_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [meetingRouteId],
    );
    const record = row.rows[0];
    if (record) {
      const expected = record[field];
      if (expected && String(expected) === String(participantId)) {
        return { id: String(participantId), role: role === 'host' ? 'doctor' : role };
      }
      return null;
    }

    // Meeting record may not exist yet — fall back to appointment assignment.
    const apt = await pool.query(
      `SELECT patient_id, doctor_id FROM appointments WHERE id = $1 LIMIT 1`,
      [meetingRouteId],
    );
    const aptRow = apt.rows[0];
    if (aptRow) {
      const expected = aptRow[field];
      if (expected && String(expected) === String(participantId)) {
        return { id: String(participantId), role: role === 'host' ? 'doctor' : role };
      }
    }
  } catch {
    /* best-effort */
  }
  return null;
}

/** @deprecated Use resolveMeetingScopedLobbyUser — kept for tests importing dev name. */
export async function resolveDevTestingPatientLobbyUser(ctx, meetingRouteId, participantId) {
  return resolveMeetingScopedLobbyUser(ctx, meetingRouteId, participantId, 'patient');
}
