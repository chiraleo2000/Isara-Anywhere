/**
 * Shared PDPA medical-record consent resolution for doctor portal.
 * Used by validateDoctorPatientAccess middleware and /api/pdpa/check.
 */

/**
 * @param {import('pg').Pool} pool
 * @param {string} patientId
 * @param {string} doctorId
 * @returns {Promise<{ hasAccess: boolean, source?: string, consent?: object, appointmentId?: string }>}
 */
async function resolveMedicalRecordConsent(pool, patientId, doctorId) {
  if (!pool || !patientId || !doctorId) {
    return { hasAccess: false };
  }

  // 1. Per-doctor medical_record_access consent (includes legacy doctor_access)
  const consentResult = await pool.query(
    `SELECT * FROM patient_consents
     WHERE patient_id = $1 AND doctor_id = $2
       AND consent_type IN ('medical_record_access', 'doctor_access')
       AND granted = true AND revoked_at IS NULL
       AND status IN ('active', 'granted')
       AND (expires_at IS NULL OR expires_at > NOW())
     LIMIT 1`,
    [patientId, doctorId]
  );

  if (consentResult.rows.length > 0) {
    return { hasAccess: true, source: 'consent', consent: consentResult.rows[0] };
  }

  // Explicit per-doctor revoke overrides broad sharing and appointment fallback
  const revokedResult = await pool.query(
    `SELECT 1 FROM patient_consents
     WHERE patient_id = $1 AND doctor_id = $2
       AND consent_type IN ('medical_record_access', 'doctor_access')
       AND revoked_at IS NOT NULL
     LIMIT 1`,
    [patientId, doctorId]
  );

  if (revokedResult.rows.length > 0) {
    return { hasAccess: false, source: 'revoked' };
  }

  // 2. Broad data_sharing consent (all authorized doctors)
  const broadResult = await pool.query(
    `SELECT * FROM patient_consents
     WHERE patient_id = $1 AND consent_type = 'data_sharing'
       AND granted = true AND revoked_at IS NULL
       AND status IN ('active', 'granted')
       AND (expires_at IS NULL OR expires_at > NOW())
     LIMIT 1`,
    [patientId]
  );

  if (broadResult.rows.length > 0) {
    return { hasAccess: true, source: 'broad_consent', consent: broadResult.rows[0] };
  }

  // 3. Legacy rows without consent_type filter
  const legacyResult = await pool.query(
    `SELECT * FROM patient_consents
     WHERE patient_id = $1 AND doctor_id = $2
       AND granted = true AND revoked_at IS NULL
       AND status IN ('active', 'granted')
       AND (expires_at IS NULL OR expires_at > NOW())
     LIMIT 1`,
    [patientId, doctorId]
  );

  if (legacyResult.rows.length > 0) {
    return { hasAccess: true, source: 'consent', consent: legacyResult.rows[0] };
  }

  // 4. Active/completed appointment fallback
  const appointmentResult = await pool.query(
    `SELECT id, status FROM appointments
     WHERE patient_id = $1 AND doctor_id = $2
       AND status IN ('confirmed', 'in_progress', 'completed')
     ORDER BY CASE status WHEN 'in_progress' THEN 0 WHEN 'confirmed' THEN 1 ELSE 2 END
     LIMIT 1`,
    [patientId, doctorId]
  );

  if (appointmentResult.rows.length > 0) {
    const apt = appointmentResult.rows[0];
    return {
      hasAccess: true,
      source: apt.status === 'in_progress' ? 'emergency' : 'appointment',
      appointmentId: apt.id,
    };
  }

  return { hasAccess: false };
}

/**
 * @param {import('express').Request} req
 * @returns {string|undefined}
 */
function resolveDoctorId(req) {
  return req.user?.doctorId || req.user?.id;
}

module.exports = { resolveMedicalRecordConsent, resolveDoctorId };
