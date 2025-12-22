import { Router, Request, Response } from 'express';
import { storage, GCS_BUCKETS } from '../index';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Helper functions
async function readJSON(bucket: string, filePath: string): Promise<any> {
  try {
    const file = storage.bucket(bucket).file(filePath);
    const [contents] = await file.download();
    return JSON.parse(contents.toString());
  } catch (error: any) {
    if (error.code === 404) {
      throw new Error(`File not found: ${filePath}`);
    }
    throw error;
  }
}

async function writeJSON(bucket: string, filePath: string, data: any): Promise<void> {
  const file = storage.bucket(bucket).file(filePath);
  await file.save(JSON.stringify(data, null, 2), {
    contentType: 'application/json',
  });
}

async function fileExists(bucket: string, filePath: string): Promise<boolean> {
  try {
    const file = storage.bucket(bucket).file(filePath);
    const [exists] = await file.exists();
    return exists;
  } catch {
    return false;
  }
}

// Consent Routes
router.get('/consents/:patientId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;

    // Read consents from GCS: patients/{patientId}/pdpa/consents.json
    const consents = await readJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/pdpa/consents.json`);

    res.json(consents);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.json({ consents: [] }); // Return empty array if no consents yet
    }
    console.error('Get consents error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update consent (toggle on/off)
router.put('/consents/:patientId/:consentId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId, consentId } = req.params;
    const { granted } = req.body;

    // Get existing consents
    let consentsData: any = { consents: [] };
    try {
      consentsData = await readJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/pdpa/consents.json`);
    } catch {
      // File doesn't exist yet
    }

    const now = new Date();
    const consents = consentsData.consents || consentsData;
    
    // Find and update the consent
    const consentIndex = consents.findIndex((c: any) => c.id === consentId);
    
    if (consentIndex === -1) {
      // Create new consent if doesn't exist
      consents.push({
        id: consentId,
        type: consentId,
        granted,
        grantedAt: granted ? now.toISOString() : undefined,
        updatedAt: now.toISOString(),
      });
    } else {
      consents[consentIndex] = {
        ...consents[consentIndex],
        granted,
        grantedAt: granted ? now.toISOString() : consents[consentIndex].grantedAt,
        updatedAt: now.toISOString(),
      };
    }

    // Write back
    await writeJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/pdpa/consents.json`, { consents });

    res.json({ success: true, consent: consents.find((c: any) => c.id === consentId) });
  } catch (error: any) {
    console.error('Update consent error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Grant consent to a specific doctor
router.post('/consents/:patientId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const consentData = req.body;

    // Get existing consents
    let consentsData: any = { consents: [], doctorConsents: [] };
    try {
      consentsData = await readJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/pdpa/consents.json`);
    } catch {
      // File doesn't exist yet
    }

    const consentId = `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const newConsent = {
      id: consentId,
      patientId,
      ...consentData,
      status: 'granted',
      grantedAt: now.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    if (!consentsData.doctorConsents) {
      consentsData.doctorConsents = [];
    }
    consentsData.doctorConsents.push(newConsent);

    // Write consents back to GCS
    await writeJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/pdpa/consents.json`, consentsData);

    // Log the consent in audit logs
    try {
      let auditLog: any[] = [];
      try {
        auditLog = await readJSON(GCS_BUCKETS.PATIENT, `audit/access-logs/${patientId}.json`);
      } catch {
        // File doesn't exist yet
      }

      auditLog.push({
        timestamp: now.toISOString(),
        action: 'CONSENT_GRANTED',
        consentId,
        doctorId: consentData.doctorId,
        doctorName: consentData.doctorName,
        dataTypes: consentData.dataTypes,
      });

      await writeJSON(GCS_BUCKETS.PATIENT, `audit/access-logs/${patientId}.json`, auditLog);
    } catch (error) {
      console.error('Failed to log consent:', error);
    }

    res.json(newConsent);
  } catch (error: any) {
    console.error('Grant consent error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Revoke consent
router.put('/consents/:patientId/:consentId/revoke', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId, consentId } = req.params;
    const { revokeReason } = req.body;

    // Read existing consents
    const consentsData = await readJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/pdpa/consents.json`);
    const doctorConsents = consentsData.doctorConsents || [];

    // Find and update the consent
    const consentIndex = doctorConsents.findIndex((c: any) => c.id === consentId);

    if (consentIndex === -1) {
      return res.status(404).json({ error: 'Consent not found' });
    }

    const now = new Date();
    doctorConsents[consentIndex] = {
      ...doctorConsents[consentIndex],
      status: 'revoked',
      revokedAt: now.toISOString(),
      revokeReason: revokeReason || 'User request',
      updatedAt: now.toISOString(),
    };

    consentsData.doctorConsents = doctorConsents;

    // Write consents back to GCS
    await writeJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/pdpa/consents.json`, consentsData);

    // Log the revocation in audit logs
    try {
      let auditLog: any[] = [];
      try {
        auditLog = await readJSON(GCS_BUCKETS.PATIENT, `audit/access-logs/${patientId}.json`);
      } catch {
        // File doesn't exist yet
      }

      auditLog.push({
        timestamp: now.toISOString(),
        action: 'CONSENT_REVOKED',
        consentId,
        revokeReason,
      });

      await writeJSON(GCS_BUCKETS.PATIENT, `audit/access-logs/${patientId}.json`, auditLog);
    } catch (error) {
      console.error('Failed to log consent revocation:', error);
    }

    res.json(doctorConsents[consentIndex]);
  } catch (error: any) {
    console.error('Revoke consent error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify consent (for doctors accessing patient data)
router.post('/verify', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId, doctorId, dataTypes } = req.body;

    // Read patient consents
    const consentsData = await readJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/pdpa/consents.json`);
    const doctorConsents = consentsData.doctorConsents || [];

    // Find active consent for this doctor
    const activeConsent = doctorConsents.find((c: any) =>
      c.doctorId === doctorId &&
      c.status === 'granted' &&
      (!c.expiresAt || new Date(c.expiresAt) > new Date())
    );

    if (!activeConsent) {
      return res.json({ hasConsent: false, reason: 'No active consent found' });
    }

    // Check if all requested data types are covered by the consent
    const hasAllDataTypes = dataTypes.every((type: string) =>
      activeConsent.dataTypes.includes(type) || activeConsent.dataTypes.includes('all')
    );

    if (!hasAllDataTypes) {
      return res.json({
        hasConsent: false,
        reason: 'Consent does not cover all requested data types',
      });
    }

    res.json({ hasConsent: true, consent: activeConsent });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.json({ hasConsent: false, reason: 'No consents found' });
    }
    console.error('Verify consent error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get access logs for a patient
router.get('/audit/:patientId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;

    // Read audit logs from GCS: audit/access-logs/{patientId}.json
    const auditLog = await readJSON(GCS_BUCKETS.PATIENT, `audit/access-logs/${patientId}.json`);

    res.json(auditLog);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.json([]); // Return empty array if no logs yet
    }
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Living Will Routes
router.get('/living-will/:patientId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;

    // Read living will from GCS: patients/{patientId}/pdpa/living-will.json
    const livingWill = await readJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/pdpa/living-will.json`);

    res.json(livingWill);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.json(null); // Return null if no living will yet
    }
    console.error('Get living will error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get living will version history
router.get('/living-will/:patientId/versions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;

    // Read version history from GCS
    let versions: any[] = [];
    try {
      versions = await readJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/pdpa/living-will-versions.json`);
    } catch {
      // No versions yet
    }

    res.json(versions);
  } catch (error: any) {
    console.error('Get living will versions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific version of living will
router.get('/living-will/:patientId/versions/:versionId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId, versionId } = req.params;

    // Read version history
    const versions = await readJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/pdpa/living-will-versions.json`);
    const version = versions.find((v: any) => v.versionId === versionId);

    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    res.json(version);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'No versions found' });
    }
    console.error('Get living will version error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rollback to a specific version
router.post('/living-will/:patientId/rollback/:versionId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId, versionId } = req.params;
    const now = new Date();

    // Read version history
    const versions = await readJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/pdpa/living-will-versions.json`);
    const targetVersion = versions.find((v: any) => v.versionId === versionId);

    if (!targetVersion) {
      return res.status(404).json({ error: 'Version not found' });
    }

    // Get current living will to save as a version before rollback
    let currentLivingWill = null;
    try {
      currentLivingWill = await readJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/pdpa/living-will.json`);
    } catch {
      // No current living will
    }

    // Save current as a version before rollback
    if (currentLivingWill) {
      const newVersionId = `v_${Date.now()}`;
      versions.push({
        versionId: newVersionId,
        version: versions.length + 1,
        data: currentLivingWill,
        createdAt: now.toISOString(),
        note: 'Auto-saved before rollback',
      });
      await writeJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/pdpa/living-will-versions.json`, versions);
    }

    // Restore the target version as current
    const restoredLivingWill = {
      ...targetVersion.data,
      updatedAt: now.toISOString(),
      restoredFrom: versionId,
    };

    await writeJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/pdpa/living-will.json`, restoredLivingWill);

    // Log the action
    try {
      let auditLog: any[] = [];
      try {
        auditLog = await readJSON(GCS_BUCKETS.PATIENT, `audit/access-logs/${patientId}.json`);
      } catch {
        // File doesn't exist yet
      }

      auditLog.push({
        timestamp: now.toISOString(),
        action: 'LIVING_WILL_ROLLBACK',
        livingWillId: restoredLivingWill.id,
        rolledBackFromVersion: versionId,
      });

      await writeJSON(GCS_BUCKETS.PATIENT, `audit/access-logs/${patientId}.json`, auditLog);
    } catch (error) {
      console.error('Failed to log rollback action:', error);
    }

    res.json({ success: true, livingWill: restoredLivingWill });
  } catch (error: any) {
    console.error('Rollback living will error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save/Update living will (with versioning)
router.post('/living-will/:patientId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const livingWillData = req.body;

    const now = new Date();
    
    // Check if living will already exists
    let existingLivingWill = null;
    try {
      existingLivingWill = await readJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/pdpa/living-will.json`);
    } catch {
      // File doesn't exist yet
    }

    // If exists, save current version to history before updating
    if (existingLivingWill) {
      let versions: any[] = [];
      try {
        versions = await readJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/pdpa/living-will-versions.json`);
      } catch {
        // No versions yet
      }

      const versionId = `v_${Date.now()}`;
      versions.push({
        versionId,
        version: versions.length + 1,
        data: existingLivingWill,
        createdAt: existingLivingWill.updatedAt || existingLivingWill.createdAt,
        note: livingWillData.versionNote || 'Previous version',
      });

      await writeJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/pdpa/living-will-versions.json`, versions);
    }

    const livingWill = {
      id: existingLivingWill?.id || `living_will_${Date.now()}`,
      patientId,
      ...livingWillData,
      version: (existingLivingWill?.version || 0) + 1,
      createdAt: existingLivingWill?.createdAt || now.toISOString(),
      updatedAt: now.toISOString(),
    };

    // Remove versionNote from saved data
    delete livingWill.versionNote;

    // Write living will to GCS
    await writeJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/pdpa/living-will.json`, livingWill);

    // Log the action
    try {
      let auditLog: any[] = [];
      try {
        auditLog = await readJSON(GCS_BUCKETS.PATIENT, `audit/access-logs/${patientId}.json`);
      } catch {
        // File doesn't exist yet
      }

      auditLog.push({
        timestamp: now.toISOString(),
        action: existingLivingWill ? 'LIVING_WILL_UPDATED' : 'LIVING_WILL_CREATED',
        livingWillId: livingWill.id,
        version: livingWill.version,
      });

      await writeJSON(GCS_BUCKETS.PATIENT, `audit/access-logs/${patientId}.json`, auditLog);
    } catch (error) {
      console.error('Failed to log living will action:', error);
    }

    res.json(livingWill);
  } catch (error: any) {
    console.error('Save living will error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload signature image for living will
router.post('/living-will/:patientId/signature', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const { signatureData } = req.body; // Base64 image data

    if (!signatureData) {
      return res.status(400).json({ error: 'Signature data is required' });
    }

    const now = new Date();
    const fileName = `signature_${now.getTime()}.png`;
    const filePath = `patients/${patientId}/pdpa/signatures/${fileName}`;

    // Decode base64 and upload to GCS
    const base64Data = signatureData.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const file = storage.bucket(GCS_BUCKETS.PATIENT).file(filePath);
    await file.save(imageBuffer, {
      contentType: 'image/png',
      metadata: {
        patientId,
        uploadedAt: now.toISOString(),
      },
    });

    // Get signed URL for the uploaded file
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
    });

    res.json({ 
      success: true, 
      signatureUrl: signedUrl,
      filePath 
    });
  } catch (error: any) {
    console.error('Upload signature error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get doctor consents (list of doctors with access)
router.get('/doctor-consents/:patientId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;

    // Read consents
    const consentsData = await readJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/pdpa/consents.json`);
    const doctorConsents = consentsData.doctorConsents || [];

    // Filter to only active consents
    const activeConsents = doctorConsents.filter((c: any) => 
      c.status === 'granted' && 
      (!c.expiresAt || new Date(c.expiresAt) > new Date())
    );

    res.json(activeConsents);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.json([]);
    }
    console.error('Get doctor consents error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
