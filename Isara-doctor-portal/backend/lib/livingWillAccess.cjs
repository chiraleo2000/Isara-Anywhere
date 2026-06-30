/**
 * Living will access resolution and doctor-view mapping (PostgreSQL).
 */

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/**
 * @param {import('pg').Pool} pool
 * @param {string} patientId
 * @param {string} doctorId
 */
async function resolveLivingWillAccess(pool, patientId, doctorId) {
  if (!pool || !patientId || !doctorId) {
    return { hasAccess: false };
  }

  const lwResult = await pool.query(
    `SELECT id, status FROM living_wills
     WHERE patient_id = $1 AND status IN ('active', 'suspended')
     LIMIT 1`,
    [patientId]
  );

  if (lwResult.rows.length === 0) {
    return { hasAccess: false, exists: false };
  }

  const broadResult = await pool.query(
    `SELECT * FROM patient_consents
     WHERE patient_id = $1 AND doctor_id IS NULL
       AND consent_type = 'living_will'
       AND granted = true AND revoked_at IS NULL
       AND status IN ('active', 'granted')
       AND (expires_at IS NULL OR expires_at > NOW())
     LIMIT 1`,
    [patientId]
  );

  if (broadResult.rows.length > 0) {
    return { hasAccess: true, exists: true, source: 'all_doctors', consent: broadResult.rows[0] };
  }

  const perDoctorResult = await pool.query(
    `SELECT * FROM patient_consents
     WHERE patient_id = $1 AND doctor_id = $2
       AND consent_type = 'living_will'
       AND granted = true AND revoked_at IS NULL
       AND status IN ('active', 'granted')
       AND (expires_at IS NULL OR expires_at > NOW())
     LIMIT 1`,
    [patientId, doctorId]
  );

  if (perDoctorResult.rows.length > 0) {
    return { hasAccess: true, exists: true, source: 'doctor', consent: perDoctorResult.rows[0] };
  }

  return { hasAccess: false, exists: true };
}

function boolToPreference(value) {
  if (value === true) return { preference: 'accept' };
  if (value === false) return { preference: 'refuse' };
  if (typeof value === 'string') return { preference: value };
  if (value && typeof value === 'object' && value.preference) return value;
  return { preference: 'conditional' };
}

/**
 * Map living_wills row to doctor portal LivingWillForDoctorView shape.
 */
function mapLivingWillRowToDoctorView(row, patientName, access) {
  const decisions = parseJson(row.decisions, {});
  const representatives = parseJson(row.representatives, {});
  const preferences = parseJson(row.treatments, {});

  const proxy = decisions.healthcareProxy || representatives;
  const prefs = decisions.preferences || preferences;
  const primary = proxy?.primary || (Array.isArray(representatives) ? representatives.find((r) => r.isMainRepresentative) : null);

  const treatments = {
    cpr: boolToPreference(prefs.cpr),
    mechanicalVentilation: boolToPreference(prefs.mechanicalVentilation),
    artificialNutrition: boolToPreference(prefs.artificialNutrition),
    dialysis: boolToPreference(prefs.dialysis),
    antibiotics: boolToPreference(prefs.antibiotics),
    painManagement: boolToPreference(prefs.painManagement || 'balanced'),
    organDonation: boolToPreference(prefs.organDonation),
  };

  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: patientName || `Patient ${row.patient_id}`,
    version: String(row.version || 1),
    status: row.status || 'active',
    effectiveDate: row.signed_at || row.created_at,
    treatments,
    personalStatement: decisions.religiousPreferences || row.statement || null,
    additionalInstructions: prefs.additionalWishes || null,
    mainRepresentative: primary
      ? {
          name: primary.name,
          relationship: primary.relationship,
          phone: primary.phone,
          email: primary.email,
        }
      : undefined,
    authorized: true,
    isSharedByPatient: true,
    sharedAt: access?.consent?.granted_at || row.updated_at,
    lastUpdated: row.updated_at,
  };
}

module.exports = {
  resolveLivingWillAccess,
  mapLivingWillRowToDoctorView,
};
