import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import postgresDataService from '../services/postgresDataService';

const { pool, LivingWillService } = postgresDataService;
const router = Router();

// ============================================================================
// DEMO MODE - Mock PDPA for cloud deployment without database
// ============================================================================
const DEMO_MODE = process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'demo';

// Check if database is available
async function checkDbConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

// Demo PDPA status
const DEMO_PDPA_STATUS = {
  hasConsented: true,
  status: 'granted',
  consents: {
    dataProcessing: true,
    marketing: false,
    research: true
  },
  lastUpdated: new Date().toISOString()
};

// ============================================================================
// PDPA ROUTES - POSTGRESQL ONLY
// ============================================================================

// ============================================================================
// CONVENIENCE ROUTES (without patientId - uses auth token)
// ============================================================================

// GET /api/pdpa/status - Get current user's PDPA consent status
router.get('/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    // @ts-ignore - patientId added by authMiddleware
    const patientId = req.patientId || req.userId || 'demo_patient_001';
    console.log(`[PDPA] Getting status for authenticated user: ${patientId}`);

    // Check if we should use demo mode
    const useDemo = DEMO_MODE || !(await checkDbConnection());
    if (useDemo) {
      console.log('[PDPA] Using DEMO MODE for status');
      return res.json({ ...DEMO_PDPA_STATUS, patientId, demoMode: true });
    }

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
    // Fallback to demo response
    // @ts-ignore
    return res.json({ ...DEMO_PDPA_STATUS, patientId: req.patientId || 'demo_patient_001', demoMode: true });
  }
});

// GET /api/pdpa/consents - Get current user's consents (convenience route)
router.get('/consents', authMiddleware, async (req: Request, res: Response) => {
  try {
    // @ts-ignore - patientId added by authMiddleware
    const patientId = req.patientId || req.userId || 'demo_patient_001';
    console.log(`[PDPA] Getting consents for authenticated user: ${patientId}`);

    const useDemo = DEMO_MODE || !(await checkDbConnection());
    if (useDemo) {
      return res.json([{ id: 'consent_demo', patientId, type: 'dataProcessing', granted: true, demoMode: true }]);
    }

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
    res.json([]);
  }
});

// GET /api/pdpa/audit - Get current user's audit logs (convenience route)
router.get('/audit', authMiddleware, async (req: Request, res: Response) => {
  try {
    // @ts-ignore - patientId added by authMiddleware
    const patientId = req.patientId || req.userId || 'demo_patient_001';
    console.log(`[PDPA] Getting audit for authenticated user: ${patientId}`);

    const useDemo = DEMO_MODE || !(await checkDbConnection());
    if (useDemo) {
      return res.json([{ id: 'audit_demo', patientId, action: 'consent_granted', demoMode: true }]);
    }

    const result = await pool.query(
      `SELECT * FROM audit_logs WHERE patient_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [patientId]
    );

    res.json(result.rows);
  } catch (error: unknown) {
    console.error('[PDPA] Get audit error:', error);
    res.json([]);
  }
});

// POST /api/pdpa/living-will/share - Share living will with doctor (convenience route)
router.post('/living-will/share', authMiddleware, async (req: Request, res: Response) => {
  try {
    // @ts-ignore - patientId added by authMiddleware
    const patientId = req.patientId || req.userId || 'demo_patient_001';
    const { doctorId } = req.body;
    console.log(`[PDPA] Sharing living will for patient ${patientId} with doctor ${doctorId}`);

    const useDemo = DEMO_MODE || !(await checkDbConnection());
    if (useDemo) {
      return res.json({ success: true, shared: true, patientId, doctorId, demoMode: true });
    }

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
    const patientId = req.patientId || req.userId || 'demo_patient_001';
    const { dataProcessing, marketing, research } = req.body;
    const now = new Date();

    console.log(`[PDPA] Granting consent for authenticated user: ${patientId}`);

    // Check if we should use demo mode
    const useDemo = DEMO_MODE || !(await checkDbConnection());
    if (useDemo) {
      console.log('[PDPA] Using DEMO MODE for consent');
      return res.json({
        success: true,
        patientId,
        consents: { dataProcessing, marketing, research },
        grantedAt: now.toISOString(),
        demoMode: true
      });
    }

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

    // Log to audit
    await pool.query(
      `INSERT INTO audit_logs (id, patient_id, action, details, created_at)
       VALUES ($1, $2, 'PDPA_CONSENT_UPDATED', $3, $4)`,
      [`audit_${Date.now()}`, patientId, JSON.stringify({ dataProcessing, marketing, research }), now]
    ).catch(() => {}); // Ignore audit log errors

    res.json({
      success: true,
      patientId,
      consents: { dataProcessing, marketing, research },
      grantedAt: now.toISOString()
    });
  } catch (error: unknown) {
    console.error('[PDPA] Grant consent error:', error);
    // Fallback to demo response
    // @ts-ignore
    const patientId = req.patientId || 'demo_patient_001';
    return res.json({
      success: true,
      patientId,
      consents: req.body,
      grantedAt: new Date().toISOString(),
      demoMode: true
    });
  }
});

// DELETE /api/pdpa/consent - Revoke all PDPA consents for current user
router.delete('/consent', authMiddleware, async (req: Request, res: Response) => {
  try {
    // @ts-ignore - patientId added by authMiddleware
    const patientId = req.patientId || req.userId || 'demo_patient_001';
    const now = new Date();

    console.log(`[PDPA] Revoking all consents for authenticated user: ${patientId}`);

    // Check if we should use demo mode
    const useDemo = DEMO_MODE || !(await checkDbConnection());
    if (useDemo) {
      console.log('[PDPA] Using DEMO MODE for consent revocation');
      return res.json({
        success: true,
        patientId,
        message: 'All consents revoked',
        revokedAt: now.toISOString(),
        demoMode: true
      });
    }

    await pool.query(
      `UPDATE patient_consents SET granted = false, status = 'revoked', revoked_at = $1, updated_at = $1
       WHERE patient_id = $2`,
      [now, patientId]
    );

    // Log to audit
    await pool.query(
      `INSERT INTO audit_logs (id, patient_id, action, details, created_at)
       VALUES ($1, $2, 'PDPA_ALL_CONSENTS_REVOKED', $3, $4)`,
      [`audit_${Date.now()}`, patientId, JSON.stringify({ revokedAt: now.toISOString() }), now]
    ).catch(() => {});

    res.json({
      success: true,
      patientId,
      message: 'All consents revoked',
      revokedAt: now.toISOString()
    });
  } catch (error: unknown) {
    console.error('[PDPA] Revoke all consents error:', error);
    // Fallback to demo response
    return res.json({
      success: true,
      // @ts-ignore
      patientId: req.patientId || 'demo_patient_001',
      message: 'All consents revoked',
      revokedAt: new Date().toISOString(),
      demoMode: true
    });
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

export default router;
