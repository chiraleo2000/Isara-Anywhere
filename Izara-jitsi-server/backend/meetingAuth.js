/** Normalize JWT payload to a single actor id for doctor-scoped routes. */
export function resolveActorUserId(user) {
  return user?.id || user?.userId || user?.sub || null;
}

/**
 * Dev-testing only: patient portal uses DB session tokens (not JWT) in Authorization.
 * When participantId matches the meeting's patient_id, allow lobby join as patient.
 */
export async function resolveDevTestingPatientLobbyUser(ctx, meetingRouteId, participantId) {
  const {
    isDevTesting,
    activeMeetings,
    resolveLobbyKey,
    pool,
    dbAvailable,
  } = ctx;
  if (!isDevTesting || !participantId) return null;

  const lobbyKey = await resolveLobbyKey(meetingRouteId);
  const active = activeMeetings.get(meetingRouteId) || activeMeetings.get(lobbyKey);
  if (active?.patientId && String(active.patientId) === String(participantId)) {
    return { id: String(participantId), role: 'patient' };
  }

  if (!dbAvailable || !pool) return null;
  try {
    const row = await pool.query(
      `SELECT patient_id FROM meeting_records
       WHERE id::text = $1 OR appointment_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [meetingRouteId],
    );
    const pid = row.rows[0]?.patient_id;
    if (pid && String(pid) === String(participantId)) {
      return { id: String(participantId), role: 'patient' };
    }
  } catch {
    /* best-effort */
  }
  return null;
}
