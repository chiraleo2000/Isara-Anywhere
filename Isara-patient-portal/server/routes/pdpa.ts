import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import postgresDataService from '../services/postgresDataService';

const { pool, LivingWillService } = postgresDataService;
const router = Router();

// ============================================================================
// PDPA ROUTES - POSTGRESQL ONLY (no demo mode — real use only)
// ============================================================================

// ============================================================================
// CONVENIENCE ROUTES (without patientId - uses auth token)
// ============================================================================

// GET /api/pdpa/status - Get current user's PDPA consent status
router.get('/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    // @ts-ignore - patientId added by authMiddleware
    const patientId = req.patientId || req.userId;
    if (!patientId) return res.status(401).json({ error: 'Not authenticated' });
    console.log(`[PDPA] Getting status for authenticated user: ${patientId}`);

    const result = await pool.query(
      `SELECT * FROM patient_consents WHERE patient_id = $1 ORDER BY created_at DESC`,
      [patientId]
    );

    const consents = result.rows;
    const hasDataProcessing = consents.some(c => c.consent_type === 'dataProcessing' && c.granted);
    
    res.json({
      hasConsented: hasDataProcessing || consents.length > 0,
      status: hasDataProcessing ? 'granted' : 'pending',
      consents: {
        dataProcessing: consents.find(c => c.consent_type === 'dataProcessing')?.granted || false,
        marketing: consents.find(c => c.consent_type === 'marketing')?.granted || false,
        research: consents.find(c => c.consent_type === 'research')?.granted || false
      },
      lastUpdated: consents[0]?.updated_at || null,
      patientId
    });
  } catch (error: unknown) {
    console.error('[PDPA] Get status error:', error);
    res.status(500).json({ error: 'Failed to fetch PDPA status' });
  }
});

// GET /api/pdpa/consents - Get current user's consents (convenience route)
router.get('/consents', authMiddleware, async (req: Request, res: Response) => {
  try {
    // @ts-ignore - patientId added by authMiddleware
    const patientId = req.patientId || req.userId;
    if (!patientId) return res.status(401).json({ error: 'Not authenticated' });
    console.log(`[PDPA] Getting consents for authenticated user: ${patientId}`);

    const result = await pool.query(
      `SELECT * FROM patient_consents WHERE patient_id = $1 ORDER BY created_at DESC`,
      [patientId]
    );

    const consents = result.rows.map((row: any) => ({
      id: row.id,
      patientId: row.patient_id,
      type: row.consent_type,
      granted: row.granted,
      doctorId: row.doctor_id,
      grantedAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json(consents);
  } catch (error: unknown) {
    console.error('[PDPA] Get consents error:', error);
    res.status(500).json({ error: 'Failed to fetch consents' });
  }
});

// GET /api/pdpa/audit - Get current user's audit logs (convenience route)
router.get('/audit', authMiddleware, async (req: Request, res: Response) => {
  try {
    // @ts-ignore - patientId added by authMiddleware
    const patientId = req.patientId || req.userId;
    if (!patientId) return res.status(401).json({ error: 'Not authenticated' });
    console.log(`[PDPA] Getting audit for authenticated user: ${patientId}`);

    const result = await pool.query(
      `SELECT * FROM audit_logs WHERE patient_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [patientId]
    );

    res.json(result.rows);
  } catch (error: unknown) {
    console.error('[PDPA] Get audit error:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// POST /api/pdpa/living-will/share - Share living will with doctor (convenience route)
router.post('/living-will/share', authMiddleware, async (req: Request, res: Response) => {
  try {
    // @ts-ignore - patientId added by authMiddleware
    const patientId = req.patientId || req.userId;
    if (!patientId) return res.status(401).json({ error: 'Not authenticated' });
    const { doctorId } = req.body;
    console.log(`[PDPA] Sharing living will for patient ${patientId} with doctor ${doctorId}`);

    // Check if living will exists
    const lwResult = await pool.query(
      'SELECT id FROM living_wills WHERE patient_id = $1',
      [patientId]
    );

    if (lwResult.rows.length === 0) {
      return res.status(404).json({ error: 'No living will found' });
    }

    // Log the share action
    await pool.query(
      `INSERT INTO audit_logs (id, patient_id, action, details, created_at)
       VALUES ($1, $2, 'living_will_shared', $3, NOW())`,
      [`audit_${Date.now()}`, patientId, JSON.stringify({ doctorId, sharedAt: new Date().toISOString() })]
    ).catch(() => {});

    res.json({ success: true, shared: true, patientId, doctorId });
  } catch (error: unknown) {
    console.error('[PDPA] Share living will error:', error);
    res.status(500).json({ error: 'Failed to share living will' });
  }
});

// POST /api/pdpa/consent - Grant PDPA consent for current user
router.post('/consent', authMiddleware, async (req: Request, res: Response) => {
  try {
    // @ts-ignore - patientId added by authMiddleware
    const patientId = req.patientId || req.userId;
    if (!patientId) return res.status(401).json({ error: 'Not authenticated' });
    const { dataProcessing, marketing, research } = req.body;
    const now = new Date();

    console.log(`[PDPA] Granting consent for authenticated user: ${patientId}`);

    // Upsert each consent type
    const consentTypes = [
      { type: 'dataProcessing', value: dataProcessing },
      { type: 'marketing', value: marketing },
      { type: 'research', value: research }
    ];

    for (const consent of consentTypes) {
      if (consent.value !== undefined) {
        await pool.query(
          `INSERT INTO patient_consents (id, patient_id, consent_type, granted, granted_at, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
           ON CONFLICT (patient_id, consent_type) DO UPDATE SET
             granted = EXCLUDED.granted,
             granted_at = CASE WHEN EXCLUDED.granted THEN $5 ELSE patient_consents.granted_at END,
             status = EXCLUDED.status,
             updated_at = $7`,
          [
            `consent_${patientId}_${consent.type}`,
            patientId,
            consent.type,
            consent.value,
            consent.value ? now : null,
            consent.value ? 'granted' : 'revoked',
            now
          ]
        );
      }
    }

    // Log to audit (PDPA requirement — always log, never skip)
    await pool.query(
      `INSERT INTO audit_logs (id, patient_id, action, details, created_at)
       VALUES ($1, $2, 'PDPA_CONSENT_UPDATED', $3, $4)`,
      [`audit_${Date.now()}`, patientId, JSON.stringify({ dataProcessing, marketing, research }), now]
    );

    res.json({
      success: true,
      patientId,
      consents: { dataProcessing, marketing, research },
      grantedAt: now.toISOString()
    });
  } catch (error: unknown) {
    console.error('[PDPA] Grant consent error:', error);
    res.status(500).json({ error: 'Failed to grant consent' });
  }
});

// DELETE /api/pdpa/consent - Revoke all PDPA consents for current user
router.delete('/consent', authMiddleware, async (req: Request, res: Response) => {
  try {
    // @ts-ignore - patientId added by authMiddleware
    const patientId = req.patientId || req.userId;
    if (!patientId) return res.status(401).json({ error: 'Not authenticated' });
    const now = new Date();

    console.log(`[PDPA] Revoking all consents for authenticated user: ${patientId}`);

    await pool.query(
      `UPDATE patient_consents SET granted = false, status = 'revoked', revoked_at = $1, updated_at = $1
       WHERE patient_id = $2`,
      [now, patientId]
    );

    // Log to audit (PDPA requirement)
    await pool.query(
      `INSERT INTO audit_logs (id, patient_id, action, details, created_at)
       VALUES ($1, $2, 'PDPA_ALL_CONSENTS_REVOKED', $3, $4)`,
      [`audit_${Date.now()}`, patientId, JSON.stringify({ revokedAt: now.toISOString() }), now]
    );

    res.json({
      success: true,
      patientId,
      message: 'All consents revoked',
      revokedAt: now.toISOString()
    });
  } catch (error: unknown) {
    console.error('[PDPA] Revoke all consents error:', error);
    res.status(500).json({ error: 'Failed to revoke consents' });
  }
});

// ============================================================================
// CONSENT ROUTES
// ============================================================================

// Get all consents for a patient
router.get('/consents/:patientId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    console.log(`[PDPA] Getting consents for patient: ${patientId}`);

    const result = await pool.query(
      `SELECT * FROM patient_consents WHERE patient_id = $1 ORDER BY created_at DESC`,
      [patientId]
    );

    const consents = result.rows.map(row => ({
      id: row.id,
      patientId: row.patient_id,
      type: row.consent_type,
      granted: row.granted,
      doctorId: row.doctor_id,
      doctorName: row.doctor_name,
      dataTypes: row.data_types,
      grantedAt: row.granted_at,
      expiresAt: row.expires_at,
      revokedAt: row.revoked_at,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    res.json({ consents });
  } catch (error: unknown) {
    console.error('[PDPA] Get consents error:', error);
    res.json({ consents: [] });
  }
});

// Update consent (toggle on/off)
router.put('/consents/:patientId/:consentId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId, consentId } = req.params;
    const { granted } = req.body;
    const now = new Date();

    console.log(`[PDPA] Updating consent ${consentId} for patient ${patientId}: granted=${granted}`);

    // Check if consent exists
    const existingResult = await pool.query(
      'SELECT id FROM patient_consents WHERE id = $1 AND patient_id = $2',
      [consentId, patientId]
    );

    if (existingResult.rows.length === 0) {
      // Create new consent
      await pool.query(
        `INSERT INTO patient_consents (id, patient_id, consent_type, granted, granted_at, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
        [consentId, patientId, consentId, granted, granted ? now : null, granted ? 'granted' : 'revoked', now]
      );
    } else {
      // Update existing consent
      await pool.query(
        `UPDATE patient_consents 
         SET granted = $1, granted_at = $2, status = $3, updated_at = $4
         WHERE id = $5 AND patient_id = $6`,
        [granted, granted ? now : null, granted ? 'granted' : 'revoked', now, consentId, patientId]
      );
    }

    // Log to audit
    await pool.query(
      `INSERT INTO audit_logs (id, patient_id, action, details, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [`audit_${Date.now()}`, patientId, granted ? 'CONSENT_GRANTED' : 'CONSENT_REVOKED', 
       JSON.stringify({ consentId }), now]
    );

    res.json({ success: true, consent: { id: consentId, granted, updatedAt: now.toISOString() } });
  } catch (error: unknown) {
    console.error('[PDPA] Update consent error:', error);
    res.status(500).json({ error: 'Failed to update consent' });
  }
});

// Grant consent to a specific doctor
router.post('/consents/:patientId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const { doctorId, doctorName, dataTypes, expiresAt } = req.body;
    const now = new Date();
    const consentId = `consent_${Date.now()}`;

    console.log(`[PDPA] Granting consent for patient ${patientId} to doctor ${doctorId}`);

    await pool.query(
      `INSERT INTO patient_consents 
       (id, patient_id, consent_type, granted, doctor_id, doctor_name, data_types, granted_at, expires_at, status, created_at, updated_at)
       VALUES ($1, $2, 'doctor_access', true, $3, $4, $5, $6, $7, 'granted', $6, $6)`,
      [consentId, patientId, doctorId, doctorName, JSON.stringify(dataTypes || ['all']), now, expiresAt || null]
    );

    // Log to audit
    await pool.query(
      `INSERT INTO audit_logs (id, patient_id, action, details, created_at)
       VALUES ($1, $2, 'CONSENT_GRANTED', $3, $4)`,
      [`audit_${Date.now()}`, patientId, JSON.stringify({ consentId, doctorId, doctorName, dataTypes }), now]
    );

    res.json({
      id: consentId,
      patientId,
      doctorId,
      doctorName,
      dataTypes,
      status: 'granted',
      grantedAt: now.toISOString(),
      createdAt: now.toISOString()
    });
  } catch (error: unknown) {
    console.error('[PDPA] Grant consent error:', error);
    res.status(500).json({ error: 'Failed to grant consent' });
  }
});

// Revoke consent
router.put('/consents/:patientId/:consentId/revoke', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId, consentId } = req.params;
    const { revokeReason } = req.body;
    const now = new Date();

    console.log(`[PDPA] Revoking consent ${consentId} for patient ${patientId}`);

    const result = await pool.query(
      `UPDATE patient_consents 
       SET granted = false, status = 'revoked', revoked_at = $1, revoke_reason = $2, updated_at = $1
       WHERE id = $3 AND patient_id = $4
       RETURNING *`,
      [now, revokeReason || 'User request', consentId, patientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Consent not found' });
    }

    // Log to audit
    await pool.query(
      `INSERT INTO audit_logs (id, patient_id, action, details, created_at)
       VALUES ($1, $2, 'CONSENT_REVOKED', $3, $4)`,
      [`audit_${Date.now()}`, patientId, JSON.stringify({ consentId, revokeReason }), now]
    );

    res.json({ success: true, consent: result.rows[0] });
  } catch (error: unknown) {
    console.error('[PDPA] Revoke consent error:', error);
    res.status(500).json({ error: 'Failed to revoke consent' });
  }
});

// Verify consent (for doctors accessing patient data)
router.post('/verify', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId, doctorId, dataTypes } = req.body;

    console.log(`[PDPA] Verifying consent for patient ${patientId}, doctor ${doctorId}`);

    const result = await pool.query(
      `SELECT * FROM patient_consents 
       WHERE patient_id = $1 AND doctor_id = $2 AND status = 'granted' 
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [patientId, doctorId]
    );

    if (result.rows.length === 0) {
      return res.json({ hasConsent: false, reason: 'No active consent found' });
    }

    const consent = result.rows[0];
    const consentDataTypes = consent.data_types || ['all'];

    // Check if all requested data types are covered
    const hasAllDataTypes = dataTypes.every((type: string) =>
      consentDataTypes.includes(type) || consentDataTypes.includes('all')
    );

    if (!hasAllDataTypes) {
      return res.json({
        hasConsent: false,
        reason: 'Consent does not cover all requested data types'
      });
    }

    res.json({ hasConsent: true, consent });
  } catch (error: unknown) {
    console.error('[PDPA] Verify consent error:', error);
    res.json({ hasConsent: false, reason: 'Verification failed' });
  }
});

// Get audit logs for a patient
router.get('/audit/:patientId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;

    const result = await pool.query(
      `SELECT * FROM audit_logs WHERE patient_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [patientId]
    );

    res.json(result.rows);
  } catch (error: unknown) {
    console.error('[PDPA] Get audit logs error:', error);
    res.json([]);
  }
});

// ============================================================================
// LIVING WILL ROUTES
// ============================================================================

// Get living will
router.get('/living-will/:patientId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    console.log(`[PDPA] Getting living will for patient: ${patientId}`);

    const livingWill = await LivingWillService.getLivingWill(patientId);

    if (!livingWill) {
      return res.json(null);
    }

    res.json(livingWill);
  } catch (error: unknown) {
    console.error('[PDPA] Get living will error:', error);
    res.json(null);
  }
});

// Get living will version history
router.get('/living-will/:patientId/versions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;

    const result = await pool.query(
      `SELECT * FROM living_will_versions WHERE patient_id = $1 ORDER BY version DESC`,
      [patientId]
    );

    res.json(result.rows);
  } catch (error: unknown) {
    console.error('[PDPA] Get living will versions error:', error);
    res.json([]);
  }
});

// Get specific version of living will
router.get('/living-will/:patientId/versions/:versionId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId, versionId } = req.params;

    const result = await pool.query(
      `SELECT * FROM living_will_versions WHERE patient_id = $1 AND id = $2`,
      [patientId, versionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Version not found' });
    }

    res.json(result.rows[0]);
  } catch (error: unknown) {
    console.error('[PDPA] Get living will version error:', error);
    res.status(500).json({ error: 'Failed to get version' });
  }
});

// Rollback to a specific version
router.post('/living-will/:patientId/rollback/:versionId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId, versionId } = req.params;
    const now = new Date();

    // Get target version
    const versionResult = await pool.query(
      `SELECT * FROM living_will_versions WHERE patient_id = $1 AND id = $2`,
      [patientId, versionId]
    );

    if (versionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Version not found' });
    }

    const targetVersion = versionResult.rows[0];

    // Save current version before rollback
    const currentResult = await pool.query(
      `SELECT * FROM living_wills WHERE patient_id = $1`,
      [patientId]
    );

    if (currentResult.rows.length > 0) {
      const current = currentResult.rows[0];
      await pool.query(
        `INSERT INTO living_will_versions (id, patient_id, version, data, note, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [`version_${Date.now()}`, patientId, current.version, JSON.stringify(current), 'Auto-saved before rollback', now]
      );
    }

    // Restore the target version
    const versionData = targetVersion.data;
    await pool.query(
      `UPDATE living_wills SET
         decisions = $1,
         witness_info = $2,
         signature_data = $3,
         version = version + 1,
         updated_at = $4,
         restored_from = $5
       WHERE patient_id = $6`,
      [versionData.decisions, versionData.witness_info, versionData.signature_data, now, versionId, patientId]
    );

    // Log the action
    await pool.query(
      `INSERT INTO audit_logs (id, patient_id, action, details, created_at)
       VALUES ($1, $2, 'LIVING_WILL_ROLLBACK', $3, $4)`,
      [`audit_${Date.now()}`, patientId, JSON.stringify({ rolledBackFromVersion: versionId }), now]
    );

    res.json({ success: true, message: 'Living will restored successfully' });
  } catch (error: unknown) {
    console.error('[PDPA] Rollback living will error:', error);
    res.status(500).json({ error: 'Failed to rollback' });
  }
});

// Save/Update living will
router.post('/living-will/:patientId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const livingWillData = req.body;
    const now = new Date();

    console.log(`[PDPA] Saving living will for patient: ${patientId}`);

    // Check if living will already exists
    const existingResult = await pool.query(
      'SELECT * FROM living_wills WHERE patient_id = $1',
      [patientId]
    );

    if (existingResult.rows.length > 0) {
      // Save current version to history
      const current = existingResult.rows[0];
      await pool.query(
        `INSERT INTO living_will_versions (id, patient_id, version, data, note, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [`version_${Date.now()}`, patientId, current.version, JSON.stringify(current), 
         livingWillData.versionNote || 'Previous version', now]
      );

      // Update existing
      const result = await pool.query(
        `UPDATE living_wills SET
           decisions = $1,
           witness_info = $2,
           signature_data = $3,
           version = version + 1,
           status = $4,
           updated_at = $5
         WHERE patient_id = $6
         RETURNING *`,
        [
          JSON.stringify(livingWillData.decisions || {}),
          JSON.stringify(livingWillData.witnessInfo || {}),
          livingWillData.signatureData || null,
          livingWillData.status || 'draft',
          now,
          patientId
        ]
      );

      // Log the action
      await pool.query(
        `INSERT INTO audit_logs (id, patient_id, action, details, created_at)
         VALUES ($1, $2, 'LIVING_WILL_UPDATED', $3, $4)`,
        [`audit_${Date.now()}`, patientId, JSON.stringify({ version: result.rows[0].version }), now]
      );

      return res.json(result.rows[0]);
    } else {
      // Create new living will
      const livingWillId = `living_will_${Date.now()}`;
      
      const result = await pool.query(
        `INSERT INTO living_wills (id, patient_id, decisions, witness_info, signature_data, version, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 1, $6, $7, $7)
         RETURNING *`,
        [
          livingWillId,
          patientId,
          JSON.stringify(livingWillData.decisions || {}),
          JSON.stringify(livingWillData.witnessInfo || {}),
          livingWillData.signatureData || null,
          livingWillData.status || 'draft',
          now
        ]
      );

      // Log the action
      await pool.query(
        `INSERT INTO audit_logs (id, patient_id, action, details, created_at)
         VALUES ($1, $2, 'LIVING_WILL_CREATED', $3, $4)`,
        [`audit_${Date.now()}`, patientId, JSON.stringify({ livingWillId }), now]
      );

      return res.json(result.rows[0]);
    }
  } catch (error: unknown) {
    console.error('[PDPA] Save living will error:', error);
    res.status(500).json({ error: 'Failed to save living will' });
  }
});

// Upload signature for living will (store as base64 in database)
router.post('/living-will/:patientId/signature', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const { signatureData } = req.body;

    if (!signatureData) {
      return res.status(400).json({ error: 'Signature data is required' });
    }

    console.log(`[PDPA] Saving signature for patient: ${patientId}`);

    // Update living will with signature
    await pool.query(
      `UPDATE living_wills SET signature_data = $1, updated_at = NOW() WHERE patient_id = $2`,
      [signatureData, patientId]
    );

    res.json({ success: true, message: 'Signature saved' });
  } catch (error: unknown) {
    console.error('[PDPA] Upload signature error:', error);
    res.status(500).json({ error: 'Failed to save signature' });
  }
});

// Get doctor consents (list of doctors with access)
router.get('/doctor-consents/:patientId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;

    const result = await pool.query(
      `SELECT * FROM patient_consents 
       WHERE patient_id = $1 AND doctor_id IS NOT NULL AND status = 'granted'
       AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY granted_at DESC`,
      [patientId]
    );

    const consents = result.rows.map(row => ({
      id: row.id,
      patientId: row.patient_id,
      doctorId: row.doctor_id,
      doctorName: row.doctor_name,
      dataTypes: row.data_types,
      status: row.status,
      grantedAt: row.granted_at,
      expiresAt: row.expires_at
    }));

    res.json(consents);
  } catch (error: unknown) {
    console.error('[PDPA] Get doctor consents error:', error);
    res.json([]);
  }
});

// ============================================================================
// DOCTOR ACCESS CONTROL — per-doctor medical_record_access consent
// ============================================================================

// GET /api/pdpa/doctor-access — list all medical_record_access consents for authenticated patient
router.get('/doctor-access', authMiddleware, async (req: Request, res: Response) => {
  try {
    // @ts-ignore - patientId added by authMiddleware
    const patientId = req.patientId || req.userId;
    if (!patientId) return res.status(401).json({ error: 'Not authenticated' });

    console.log(`[PDPA] Getting doctor-access consents for patient: ${patientId}`);

    const result = await pool.query(
      `SELECT pc.*, u.name AS doctor_name_joined, u.specialty AS doctor_specialty
       FROM patient_consents pc
       LEFT JOIN users u ON pc.doctor_id = u.id
       WHERE pc.patient_id = $1 AND pc.consent_type = 'medical_record_access'
       ORDER BY pc.created_at DESC`,
      [patientId]
    );

    const consents = result.rows.map((row: any) => ({
      id: row.id,
      patientId: row.patient_id,
      doctorId: row.doctor_id,
      doctorName: row.doctor_name_joined || row.doctor_name || 'Unknown',
      doctorSpecialty: row.doctor_specialty || null,
      dataTypes: row.data_types,
      granted: row.granted,
      status: row.status,
      grantedAt: row.granted_at,
      revokedAt: row.revoked_at,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    }));

    res.json(consents);
  } catch (error: unknown) {
    console.error('[PDPA] Get doctor-access error:', error);
    res.json([]);
  }
});

// POST /api/pdpa/doctor-access — grant medical_record_access to a specific doctor
router.post('/doctor-access', authMiddleware, async (req: Request, res: Response) => {
  try {
    // @ts-ignore - patientId added by authMiddleware
    const patientId = req.patientId || req.userId;
    if (!patientId) return res.status(401).json({ error: 'Not authenticated' });

    const { doctor_id } = req.body;
    if (!doctor_id) return res.status(400).json({ error: 'doctor_id is required' });

    const now = new Date();
    const consentId = `consent_mra_${patientId}_${doctor_id}`;

    console.log(`[PDPA] Granting medical_record_access: patient=${patientId} → doctor=${doctor_id}`);

    // Look up doctor name
    const doctorResult = await pool.query('SELECT name FROM users WHERE id = $1', [doctor_id]);
    const doctorName = doctorResult.rows[0]?.name || 'Unknown';

    // Upsert — one row per (patient_id, doctor_id, consent_type)
    const result = await pool.query(
      `INSERT INTO patient_consents
         (id, patient_id, doctor_id, doctor_name, consent_type, granted, status, data_types, granted_at, revoked_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'medical_record_access', true, 'granted', '["all"]'::jsonb, $5, NULL, $5, $5)
       ON CONFLICT (patient_id, doctor_id, consent_type) WHERE doctor_id IS NOT NULL
       DO UPDATE SET
         granted = true,
         status = 'granted',
         granted_at = $5,
         revoked_at = NULL,
         updated_at = $5
       RETURNING *`,
      [consentId, patientId, doctor_id, doctorName, now]
    );

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (id, patient_id, action, details, created_at)
       VALUES ($1, $2, 'MEDICAL_RECORD_ACCESS_GRANTED', $3, $4)`,
      [`audit_${Date.now()}`, patientId, JSON.stringify({ doctorId: doctor_id, doctorName }), now]
    ).catch(() => {});

    res.json(result.rows[0]);
  } catch (error: unknown) {
    console.error('[PDPA] Grant doctor-access error:', error);
    res.status(500).json({ error: 'Failed to grant access' });
  }
});

// DELETE /api/pdpa/doctor-access/:doctorId — revoke medical_record_access (sets revoked_at, never deletes)
router.delete('/doctor-access/:doctorId', authMiddleware, async (req: Request, res: Response) => {
  try {
    // @ts-ignore - patientId added by authMiddleware
    const patientId = req.patientId || req.userId;
    if (!patientId) return res.status(401).json({ error: 'Not authenticated' });

    const { doctorId } = req.params;
    const now = new Date();

    console.log(`[PDPA] Revoking medical_record_access: patient=${patientId}, doctor=${doctorId}`);

    const result = await pool.query(
      `UPDATE patient_consents
       SET granted = false, status = 'revoked', revoked_at = $1, updated_at = $1
       WHERE patient_id = $2 AND doctor_id = $3 AND consent_type = 'medical_record_access'
       RETURNING *`,
      [now, patientId, doctorId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Consent not found' });
    }

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (id, patient_id, action, details, created_at)
       VALUES ($1, $2, 'MEDICAL_RECORD_ACCESS_REVOKED', $3, $4)`,
      [`audit_${Date.now()}`, patientId, JSON.stringify({ doctorId }), now]
    ).catch(() => {});

    res.json({ success: true, consent: result.rows[0] });
  } catch (error: unknown) {
    console.error('[PDPA] Revoke doctor-access error:', error);
    res.status(500).json({ error: 'Failed to revoke access' });
  }
});

// GET /api/pdpa/pending-requests — list pending consent_request notifications for authenticated patient
router.get('/pending-requests', authMiddleware, async (req: Request, res: Response) => {
  try {
    // @ts-ignore - patientId added by authMiddleware
    const patientId = req.patientId || req.userId;
    if (!patientId) return res.status(401).json({ error: 'Not authenticated' });

    console.log(`[PDPA] Getting pending consent requests for patient: ${patientId}`);

    const result = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id = $1 AND type = 'consent_request' AND read_at IS NULL
       ORDER BY created_at DESC`,
      [patientId]
    );

    res.json(result.rows);
  } catch (error: unknown) {
    console.error('[PDPA] Get pending requests error:', error);
    res.json([]);
  }
});

// POST /api/pdpa/consent-request/respond — patient grants or denies a doctor's consent request
router.post('/consent-request/respond', authMiddleware, async (req: Request, res: Response) => {
  try {
    // @ts-ignore - patientId added by authMiddleware
    const patientId = req.patientId || req.userId;
    if (!patientId) return res.status(401).json({ error: 'Not authenticated' });

    const { notification_id, doctor_id, action } = req.body;
    if (!notification_id || !doctor_id || !['grant', 'deny'].includes(action)) {
      return res.status(400).json({ error: 'notification_id, doctor_id, and action (grant|deny) are required' });
    }

    const now = new Date();

    // Verify the notification belongs to this patient
    const notifResult = await pool.query(
      `SELECT * FROM notifications WHERE id = $1 AND user_id = $2 AND type = 'consent_request'`,
      [notification_id, patientId]
    );
    if (notifResult.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (action === 'grant') {
      // Look up doctor name
      const doctorResult = await pool.query('SELECT name FROM users WHERE id = $1', [doctor_id]);
      const doctorName = doctorResult.rows[0]?.name || 'Unknown';
      const consentId = `consent_mra_${patientId}_${doctor_id}`;

      // Upsert consent row
      await pool.query(
        `INSERT INTO patient_consents
           (id, patient_id, doctor_id, doctor_name, consent_type, granted, status, data_types, granted_at, revoked_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'medical_record_access', true, 'granted', '["all"]'::jsonb, $5, NULL, $5, $5)
         ON CONFLICT (patient_id, doctor_id, consent_type) WHERE doctor_id IS NOT NULL
         DO UPDATE SET
           granted = true,
           status = 'granted',
           granted_at = $5,
           revoked_at = NULL,
           updated_at = $5`,
        [consentId, patientId, doctor_id, doctorName, now]
      );

      // Audit log
      await pool.query(
        `INSERT INTO audit_logs (id, patient_id, action, details, created_at)
         VALUES ($1, $2, 'CONSENT_REQUEST_GRANTED', $3, $4)`,
        [`audit_${Date.now()}`, patientId, JSON.stringify({ doctorId: doctor_id, doctorName, notificationId: notification_id }), now]
      ).catch(() => {});
    } else {
      // Deny — audit log only, no consent row created
      await pool.query(
        `INSERT INTO audit_logs (id, patient_id, action, details, created_at)
         VALUES ($1, $2, 'CONSENT_REQUEST_DENIED', $3, $4)`,
        [`audit_${Date.now()}`, patientId, JSON.stringify({ doctorId: doctor_id, notificationId: notification_id }), now]
      ).catch(() => {});
    }

    // Mark notification as read
    await pool.query(
      `UPDATE notifications SET read_at = $1 WHERE id = $2`,
      [now, notification_id]
    );

    res.json({ success: true, action });
  } catch (error: unknown) {
    console.error('[PDPA] Respond to consent request error:', error);
    res.status(500).json({ error: 'Failed to process consent request' });
  }
});

export default router;
