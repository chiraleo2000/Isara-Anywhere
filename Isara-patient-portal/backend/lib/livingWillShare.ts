import type { Pool } from 'pg';

export const SHARE_ALL_DOCTORS = '__all_doctors__';

function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === 'object') return value as T;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/** Map DB row to LivingWillPage form shape */
export function mapRowToLivingWillForm(row: Record<string, unknown>) {
  const decisions = parseJson<Record<string, unknown>>(row.decisions, {});
  if (decisions.healthcareProxy && decisions.preferences) {
    return {
      id: row.id,
      patientId: row.patient_id,
      version: row.version,
      ...decisions,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  const representatives = parseJson<Record<string, unknown>>(row.representatives, {});
  const preferences = parseJson<Record<string, unknown>>(row.treatments, {});
  const signature = parseJson<Record<string, unknown>>(row.signature, {});

  return {
    id: row.id,
    patientId: row.patient_id,
    version: row.version,
    healthcareProxy: representatives.primary
      ? representatives
      : {
          primary: {
            name: '',
            relationship: '',
            phone: '',
            email: '',
            address: '',
          },
        },
    preferences: {
      cpr: true,
      mechanicalVentilation: true,
      artificialNutrition: true,
      dialysis: true,
      organDonation: false,
      painManagement: 'comfort',
      additionalWishes: '',
      ...preferences,
    },
    religiousPreferences: row.statement || '',
    digitalSignature: row.signature_data || signature.digitalSignature || '',
    witnessSignatures: signature.witnessSignatures || [],
    sharedWith: [],
    shareWithEveryone: false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Persist LivingWillPage payload into living_wills columns */
export function mapFormToRowFields(livingWillData: Record<string, unknown>) {
  return {
    decisions: JSON.stringify(livingWillData),
    representatives: JSON.stringify(livingWillData.healthcareProxy || {}),
    treatments: JSON.stringify(livingWillData.preferences || {}),
    signature: JSON.stringify({
      digitalSignature: livingWillData.digitalSignature || null,
      witnessSignatures: livingWillData.witnessSignatures || [],
    }),
    signature_data: livingWillData.digitalSignature || null,
    statement: livingWillData.religiousPreferences || null,
    status: 'active',
  };
}

export async function getLivingWillShareState(pool: Pool, patientId: string) {
  const broad = await pool.query(
    `SELECT 1 FROM patient_consents
     WHERE patient_id = $1 AND doctor_id IS NULL
       AND consent_type = 'living_will'
       AND granted = true AND revoked_at IS NULL
       AND status IN ('active', 'granted')
     LIMIT 1`,
    [patientId]
  );

  const perDoctor = await pool.query(
    `SELECT doctor_id FROM patient_consents
     WHERE patient_id = $1 AND doctor_id IS NOT NULL
       AND consent_type = 'living_will'
       AND granted = true AND revoked_at IS NULL
       AND status IN ('active', 'granted')`,
    [patientId]
  );

  return {
    shareWithEveryone: broad.rows.length > 0,
    sharedWith: perDoctor.rows.map((r) => String(r.doctor_id)),
  };
}

/** Sync patient_consents living_will rows after save — preserves access without recreate */
export async function syncLivingWillShares(
  pool: Pool,
  patientId: string,
  sharedWith: string[] = [],
  shareWithEveryone = false,
) {
  const doctorIds = sharedWith.filter((id) => id && id !== SHARE_ALL_DOCTORS);

  if (shareWithEveryone) {
    await pool.query(
      `UPDATE patient_consents
       SET status = 'revoked', revoked_at = NOW(), revoke_reason = 'share_mode_changed', updated_at = NOW()
       WHERE patient_id = $1 AND consent_type = 'living_will'
         AND doctor_id IS NOT NULL AND revoked_at IS NULL`,
      [patientId]
    );

    const broadExisting = await pool.query(
      `SELECT id FROM patient_consents
       WHERE patient_id = $1 AND doctor_id IS NULL AND consent_type = 'living_will'
         AND granted = true AND revoked_at IS NULL
       LIMIT 1`,
      [patientId]
    );

    if (broadExisting.rows.length === 0) {
      await pool.query(
        `INSERT INTO patient_consents
           (id, patient_id, doctor_id, consent_type, granted, status, granted_at, data_types, created_at, updated_at)
         VALUES ($1, $2, NULL, 'living_will', true, 'granted', NOW(), '["living_will"]'::jsonb, NOW(), NOW())`,
        [`pc_lw_all_${patientId}_${Date.now()}`, patientId]
      );
    }
  } else {
    await pool.query(
      `UPDATE patient_consents
       SET status = 'revoked', revoked_at = NOW(), revoke_reason = 'share_mode_changed', updated_at = NOW()
       WHERE patient_id = $1 AND consent_type = 'living_will'
         AND doctor_id IS NULL AND revoked_at IS NULL`,
      [patientId]
    );

    const current = await pool.query(
      `SELECT doctor_id FROM patient_consents
       WHERE patient_id = $1 AND doctor_id IS NOT NULL
         AND consent_type = 'living_will'
         AND granted = true AND revoked_at IS NULL`,
      [patientId]
    );
    const currentIds = new Set(current.rows.map((r) => String(r.doctor_id)));
    const targetIds = new Set(doctorIds);

    for (const doctorId of currentIds) {
      if (!targetIds.has(doctorId)) {
        await pool.query(
          `UPDATE patient_consents
           SET status = 'revoked', revoked_at = NOW(), revoke_reason = 'patient_revoked', updated_at = NOW()
           WHERE patient_id = $1 AND doctor_id = $2
             AND consent_type = 'living_will' AND revoked_at IS NULL`,
          [patientId, doctorId]
        );
      }
    }

    for (const doctorId of doctorIds) {
      if (currentIds.has(doctorId)) continue;
      const doctorResult = await pool.query(
        `SELECT id, name, name_thai FROM users WHERE id = $1 AND role = 'doctor'`,
        [doctorId]
      );
      if (doctorResult.rows.length === 0) continue;
      const doctor = doctorResult.rows[0];
      await pool.query(
        `INSERT INTO patient_consents
           (id, patient_id, doctor_id, doctor_name, consent_type, granted, status, granted_at, data_types, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'living_will', true, 'granted', NOW(), '["living_will"]'::jsonb, NOW(), NOW())`,
        [
          `pc_lw_${patientId}_${doctorId}_${Date.now()}`,
          patientId,
          doctorId,
          doctor.name_thai || doctor.name,
        ]
      );
    }
  }

  const hasShare = shareWithEveryone || doctorIds.length > 0;
  await pool.query(
    `UPDATE living_wills SET is_shared_with_doctors = $1, updated_at = NOW() WHERE patient_id = $2`,
    [hasShare, patientId]
  );
}

/** Doctor-side access check (per-doctor or all-doctors living_will consent) */
export async function resolveLivingWillAccess(pool: Pool, patientId: string, doctorId: string) {
  if (!pool || !patientId || !doctorId) {
    return { hasAccess: false, exists: false };
  }

  const lwResult = await pool.query(
    `SELECT id FROM living_wills WHERE patient_id = $1 AND status IN ('active', 'suspended') LIMIT 1`,
    [patientId]
  );
  if (lwResult.rows.length === 0) {
    return { hasAccess: false, exists: false };
  }

  const broad = await pool.query(
    `SELECT * FROM patient_consents
     WHERE patient_id = $1 AND doctor_id IS NULL AND consent_type = 'living_will'
       AND granted = true AND revoked_at IS NULL AND status IN ('active', 'granted')
     LIMIT 1`,
    [patientId]
  );
  if (broad.rows.length > 0) {
    return { hasAccess: true, exists: true, source: 'all_doctors', consent: broad.rows[0] };
  }

  const perDoctor = await pool.query(
    `SELECT * FROM patient_consents
     WHERE patient_id = $1 AND doctor_id = $2 AND consent_type = 'living_will'
       AND granted = true AND revoked_at IS NULL AND status IN ('active', 'granted')
     LIMIT 1`,
    [patientId, doctorId]
  );
  if (perDoctor.rows.length > 0) {
    return { hasAccess: true, exists: true, source: 'doctor', consent: perDoctor.rows[0] };
  }

  return { hasAccess: false, exists: true };
}
