import { Router, Request, Response } from 'express';
import { storage, GCS_BUCKETS } from '../index';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Helper function to read JSON from GCS
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

// Helper function to write JSON to GCS
async function writeJSON(bucket: string, filePath: string, data: any): Promise<void> {
  const file = storage.bucket(bucket).file(filePath);
  await file.save(JSON.stringify(data, null, 2), {
    contentType: 'application/json',
  });
}

// Get patient PHR
router.get('/:patientId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;

    // Read PHR from GCS: patients/{patientId}/phr.json
    const phr = await readJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/phr.json`);

    res.json(phr);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'PHR not found' });
    }
    console.error('Get PHR error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update patient PHR
router.put('/:patientId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const phrData = req.body;

    // Add metadata
    phrData.patientId = patientId;
    phrData.updatedAt = new Date().toISOString();

    // Write PHR to GCS: patients/{patientId}/phr.json
    await writeJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/phr.json`, phrData);

    res.json(phrData);
  } catch (error: any) {
    console.error('Update PHR error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get vital signs history
router.get('/:patientId/vitals', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;

    // Read vital signs from GCS: patients/{patientId}/vital-signs.json
    const vitals = await readJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/vital-signs.json`);

    res.json(vitals);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.json([]); // Return empty array if no vitals yet
    }
    console.error('Get vitals error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add vital signs record
router.post('/:patientId/vitals', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const vitalData = req.body;

    // Get existing vitals
    let vitals: any[] = [];
    try {
      vitals = await readJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/vital-signs.json`);
      if (!Array.isArray(vitals)) {
        vitals = [vitals]; // Convert single object to array
      }
    } catch {
      // File doesn't exist yet
    }

    // Get patient PHR for height to calculate BMI
    let phrData: any = null;
    try {
      phrData = await readJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/phr.json`);
    } catch {
      // PHR doesn't exist yet
    }

    // Calculate BMI if weight is provided and height is available
    let bmiData = null;
    const weight = vitalData.weight?.value;
    const height = phrData?.demographics?.height;
    
    if (weight && height) {
      const heightM = height / 100; // Convert cm to meters
      const bmiValue = weight / (heightM * heightM);
      
      // Determine BMI category
      let category = 'ปกติ';
      if (bmiValue < 18.5) category = 'น้ำหนักน้อย';
      else if (bmiValue < 23) category = 'ปกติ';
      else if (bmiValue < 25) category = 'น้ำหนักเกิน';
      else if (bmiValue < 30) category = 'อ้วนระดับ 1';
      else category = 'อ้วนระดับ 2';
      
      bmiData = {
        value: parseFloat(bmiValue.toFixed(1)),
        category: category,
        unit: 'kg/m²'
      };
    }

    // Add new vital signs record with standardized format
    const newVital = {
      id: `vital_${Date.now()}`,
      ...vitalData,
      ...(bmiData && { bmi: bmiData }), // Include BMI if calculated
      measuredAt: vitalData.measuredAt || new Date().toISOString(),
      date: new Date().toISOString(), // Keep for backwards compatibility
      source: vitalData.source || 'patient_input',
      patientId: patientId, // Ensure correct patient association
    };

    vitals.push(newVital);

    // Sort by date (newest first)
    vitals.sort((a, b) => 
      new Date(b.measuredAt || b.date || 0).getTime() - 
      new Date(a.measuredAt || a.date || 0).getTime()
    );

    // Write back to GCS
    await writeJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/vital-signs.json`, vitals);

    // Also update PHR demographics with latest weight if provided
    if (weight && phrData) {
      try {
        phrData.demographics = phrData.demographics || {};
        phrData.demographics.weight = weight;
        phrData.demographics.lastWeightUpdate = new Date().toISOString();
        // Also store BMI in demographics for easy access
        if (bmiData) {
          phrData.demographics.bmi = bmiData.value;
          phrData.demographics.bmiCategory = bmiData.category;
        }
        phrData.updatedAt = new Date().toISOString();
        await writeJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/phr.json`, phrData);
      } catch (updateError) {
        console.warn('Could not sync weight to PHR:', updateError);
        // Don't fail the whole request if PHR update fails
      }
    }

    res.json(newVital);
  } catch (error: any) {
    console.error('Add vitals error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// HEALTH LOGS (EMR records from doctors)
// ============================================================================

// Get patient health logs
router.get('/:patientId/health-logs', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const { type, limit, offset } = req.query;

    // Read health logs from GCS: patients/{patientId}/health-logs.json
    let healthLogs;
    try {
      healthLogs = await readJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/health-logs.json`);
    } catch {
      healthLogs = { entries: [], lastUpdated: null };
    }

    let entries = healthLogs.entries || [];
    
    // Filter by type if specified
    if (type) {
      entries = entries.filter((e: any) => e.type === type);
    }
    
    // Sort by date (newest first)
    entries.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Apply pagination
    const offsetNum = parseInt(offset as string) || 0;
    const limitNum = parseInt(limit as string) || 50;
    const total = entries.length;
    entries = entries.slice(offsetNum, offsetNum + limitNum);

    res.json({
      entries,
      total,
      offset: offsetNum,
      limit: limitNum,
      lastUpdated: healthLogs.lastUpdated
    });
  } catch (error: any) {
    console.error('Get health logs error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific health log entry
router.get('/:patientId/health-logs/:entryId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId, entryId } = req.params;

    // Read health logs from GCS
    const healthLogs = await readJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/health-logs.json`);
    
    const entry = (healthLogs.entries || []).find((e: any) => e.id === entryId);
    
    if (!entry) {
      return res.status(404).json({ error: 'Health log entry not found' });
    }

    res.json(entry);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Health logs not found' });
    }
    console.error('Get health log entry error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get patient timeline
router.get('/:patientId/timeline', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;

    // Read timeline from GCS: patients/{patientId}/timeline.json
    const timeline = await readJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/timeline.json`);

    res.json(timeline);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.json([]); // Return empty array if no timeline yet
    }
    console.error('Get timeline error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// LIVING WILL (E-Living) - PDPA Compliant Routes
// ============================================================================

// Get patient's Living Will
router.get('/:patientId/living-will', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const requesterId = (req as any).user?.patientId || (req as any).user?.id;
    const requesterRole = (req as any).user?.role;

    // Read Living Will from GCS: patients/{patientId}/living-will.json
    let livingWill;
    try {
      livingWill = await readJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/living-will.json`);
    } catch {
      return res.json(null); // No Living Will exists yet
    }

    // If patient is requesting their own data, return full document
    if (requesterId === patientId) {
      return res.json(livingWill);
    }

    // For doctors/admin: Check PDPA consent before returning
    if (requesterRole === 'doctor' || requesterRole === 'admin') {
      if (!livingWill.pdpaConsent?.isSharedWithDoctors) {
        return res.json({ 
          exists: true, 
          isShared: false,
          message: 'Patient has not shared their Living Will with medical staff' 
        });
      }
      
      // Add audit log entry for doctor view
      if (!livingWill.auditLog) livingWill.auditLog = [];
      livingWill.auditLog.push({
        id: `audit-${Date.now()}`,
        action: 'viewed',
        performedBy: requesterRole,
        performedById: requesterId,
        timestamp: new Date().toISOString(),
      });
      
      // Save audit log
      await writeJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/living-will.json`, livingWill);
      
      return res.json(livingWill);
    }

    // Default: deny access
    return res.status(403).json({ error: 'Access denied' });
  } catch (error: any) {
    console.error('Get Living Will error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new Living Will
router.post('/:patientId/living-will', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const requesterId = (req as any).user?.patientId || (req as any).user?.id;

    // Only patient can create their own Living Will
    if (requesterId !== patientId) {
      return res.status(403).json({ error: 'Only patient can create their Living Will' });
    }

    // Check if Living Will already exists
    try {
      await readJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/living-will.json`);
      return res.status(409).json({ error: 'Living Will already exists. Use PUT to update.' });
    } catch {
      // Good - doesn't exist yet
    }

    const now = new Date().toISOString();
    const livingWillData = req.body;

    // Create new Living Will with proper structure
    const newLivingWill = {
      id: `lw-${patientId}-${Date.now()}`,
      patientId,
      version: '1.0',
      status: livingWillData.status || 'draft',
      effectiveDate: livingWillData.effectiveDate || now,
      treatments: livingWillData.treatments || {
        cpr: { treatmentType: 'CPR', preference: 'conditional' },
        mechanicalVentilation: { treatmentType: 'Mechanical Ventilation', preference: 'conditional' },
        artificialNutrition: { treatmentType: 'Artificial Nutrition', preference: 'conditional' },
        dialysis: { treatmentType: 'Dialysis', preference: 'conditional' },
        antibiotics: { treatmentType: 'Antibiotics', preference: 'accept' },
        painManagement: { treatmentType: 'Pain Management', preference: 'accept' },
        organDonation: { treatmentType: 'Organ Donation', preference: 'conditional' },
      },
      personalStatement: livingWillData.personalStatement || '',
      religiousBeliefs: livingWillData.religiousBeliefs || '',
      culturalConsiderations: livingWillData.culturalConsiderations || '',
      additionalInstructions: livingWillData.additionalInstructions || '',
      representatives: livingWillData.representatives || [],
      pdpaConsent: {
        consentVersion: '1.0',
        consentedAt: now,
        isSharedWithDoctors: livingWillData.pdpaConsent?.isSharedWithDoctors || false,
        shareScope: livingWillData.pdpaConsent?.shareScope || 'none',
        shareWithAdmin: livingWillData.pdpaConsent?.shareWithAdmin || false,
        consentPurpose: 'Medical decision support when patient cannot communicate',
        dataRetentionPeriod: 'Until revoked by patient or 10 years after death',
        canWithdraw: true,
        lastUpdated: now,
      },
      witnesses: livingWillData.witnesses || [],
      signature: {
        signedAt: livingWillData.signature?.signedAt || '',
        signatureMethod: livingWillData.signature?.signatureMethod || 'digital',
        signatureData: livingWillData.signature?.signatureData,
      },
      auditLog: [{
        id: `audit-${Date.now()}`,
        action: 'created',
        performedBy: 'patient',
        performedById: patientId,
        timestamp: now,
      }],
      createdAt: now,
      updatedAt: now,
    };

    // Write to GCS
    await writeJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/living-will.json`, newLivingWill);

    res.status(201).json(newLivingWill);
  } catch (error: any) {
    console.error('Create Living Will error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Living Will
router.put('/:patientId/living-will', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const requesterId = (req as any).user?.patientId || (req as any).user?.id;

    // Only patient can update their own Living Will
    if (requesterId !== patientId) {
      return res.status(403).json({ error: 'Only patient can update their Living Will' });
    }

    // Read existing Living Will
    let existingLivingWill;
    try {
      existingLivingWill = await readJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/living-will.json`);
    } catch {
      return res.status(404).json({ error: 'Living Will not found. Use POST to create.' });
    }

    const now = new Date().toISOString();
    const updateData = req.body;

    // Build changes for audit log
    const changes: { field: string; oldValue?: string; newValue?: string }[] = [];
    
    if (updateData.status && updateData.status !== existingLivingWill.status) {
      changes.push({ field: 'status', oldValue: existingLivingWill.status, newValue: updateData.status });
    }
    if (updateData.treatments) {
      changes.push({ field: 'treatments', oldValue: 'previous', newValue: 'updated' });
    }

    // Merge updates
    const updatedLivingWill = {
      ...existingLivingWill,
      ...updateData,
      id: existingLivingWill.id, // Preserve original ID
      patientId: existingLivingWill.patientId, // Preserve patient ID
      createdAt: existingLivingWill.createdAt, // Preserve creation date
      version: (parseFloat(existingLivingWill.version) + 0.1).toFixed(1),
      updatedAt: now,
      auditLog: [
        ...(existingLivingWill.auditLog || []),
        {
          id: `audit-${Date.now()}`,
          action: 'updated',
          performedBy: 'patient',
          performedById: patientId,
          timestamp: now,
          changes,
        }
      ],
    };

    // Write to GCS
    await writeJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/living-will.json`, updatedLivingWill);

    res.json(updatedLivingWill);
  } catch (error: any) {
    console.error('Update Living Will error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Living Will sharing settings (PDPA consent)
router.put('/:patientId/living-will/share', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const requesterId = (req as any).user?.patientId || (req as any).user?.id;

    // Only patient can change sharing settings
    if (requesterId !== patientId) {
      return res.status(403).json({ error: 'Only patient can change sharing settings' });
    }

    // Read existing Living Will
    let livingWill;
    try {
      livingWill = await readJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/living-will.json`);
    } catch {
      return res.status(404).json({ error: 'Living Will not found' });
    }

    const now = new Date().toISOString();
    const { isSharedWithDoctors, shareScope, shareWithAdmin, specificDoctorIds } = req.body;

    const oldSharing = livingWill.pdpaConsent?.isSharedWithDoctors;

    // Update PDPA consent
    livingWill.pdpaConsent = {
      ...livingWill.pdpaConsent,
      isSharedWithDoctors: isSharedWithDoctors ?? livingWill.pdpaConsent?.isSharedWithDoctors ?? false,
      shareScope: shareScope ?? livingWill.pdpaConsent?.shareScope ?? 'none',
      shareWithAdmin: shareWithAdmin ?? livingWill.pdpaConsent?.shareWithAdmin ?? false,
      specificDoctorIds: specificDoctorIds ?? livingWill.pdpaConsent?.specificDoctorIds,
      lastUpdated: now,
      consentedAt: isSharedWithDoctors ? now : livingWill.pdpaConsent?.consentedAt,
    };

    // Add audit log
    livingWill.auditLog = [
      ...(livingWill.auditLog || []),
      {
        id: `audit-${Date.now()}`,
        action: isSharedWithDoctors ? 'shared' : 'unshared',
        performedBy: 'patient',
        performedById: patientId,
        timestamp: now,
        changes: [{
          field: 'isSharedWithDoctors',
          oldValue: String(oldSharing),
          newValue: String(isSharedWithDoctors),
        }],
      }
    ];

    livingWill.updatedAt = now;

    // Write to GCS
    await writeJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/living-will.json`, livingWill);

    res.json({
      success: true,
      isSharedWithDoctors: livingWill.pdpaConsent.isSharedWithDoctors,
      shareScope: livingWill.pdpaConsent.shareScope,
      message: isSharedWithDoctors 
        ? 'Living Will is now shared with medical staff' 
        : 'Living Will is now private',
    });
  } catch (error: any) {
    console.error('Update Living Will sharing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Revoke Living Will
router.delete('/:patientId/living-will', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const requesterId = (req as any).user?.patientId || (req as any).user?.id;

    // Only patient can revoke their Living Will
    if (requesterId !== patientId) {
      return res.status(403).json({ error: 'Only patient can revoke their Living Will' });
    }

    // Read existing Living Will
    let livingWill;
    try {
      livingWill = await readJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/living-will.json`);
    } catch {
      return res.status(404).json({ error: 'Living Will not found' });
    }

    const now = new Date().toISOString();

    // Don't delete - mark as revoked for legal records
    livingWill.status = 'revoked';
    livingWill.pdpaConsent = {
      ...livingWill.pdpaConsent,
      isSharedWithDoctors: false,
      shareScope: 'none',
      lastUpdated: now,
    };
    livingWill.updatedAt = now;
    livingWill.auditLog = [
      ...(livingWill.auditLog || []),
      {
        id: `audit-${Date.now()}`,
        action: 'revoked',
        performedBy: 'patient',
        performedById: patientId,
        timestamp: now,
      }
    ];

    // Write to GCS
    await writeJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/living-will.json`, livingWill);

    res.json({
      success: true,
      message: 'Living Will has been revoked. A new one can be created.',
    });
  } catch (error: any) {
    console.error('Revoke Living Will error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
