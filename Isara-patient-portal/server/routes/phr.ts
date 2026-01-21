/**
 * PHR Routes - PostgreSQL ONLY
 * Personal Health Records, Vital Signs, Living Will, Timeline
 * NO GCS - All data stored in PostgreSQL
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import postgresDataService from '../services/postgresDataService';

const { PHRService, LivingWillService } = postgresDataService;
const { pool } = postgresDataService;

const router = Router();

// ============================================================================
// PHR (Personal Health Records) ROUTES
// ============================================================================

// Get patient PHR
router.get('/:patientId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    console.log(`[PHR] Getting PHR for patient: ${patientId}`);

    const phr = await PHRService.getPHR(patientId);
    if (!phr) {
      // Return empty PHR structure if not found
      return res.json({
        patientId,
        allergies: [],
        chronic_conditions: [],
        medications: [],
        emergency_contacts: [],
        demographics: {},
        lifestyle: {},
        created_at: null,
        updated_at: null
      });
    }
    return res.json(phr);
  } catch (error: any) {
    console.error('[PHR] Get PHR error:', error);
    res.status(500).json({ error: 'Failed to fetch PHR data' });
  }
});

// Update patient PHR
router.put('/:patientId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const phrData = req.body;
    console.log(`[PHR] Updating PHR for patient: ${patientId}`);

    const updatedPHR = await PHRService.upsertPHR(patientId, phrData);
    res.json(updatedPHR);
  } catch (error: any) {
    console.error('[PHR] Update PHR error:', error);
    res.status(500).json({ error: 'Failed to update PHR data' });
  }
});

// ============================================================================
// VITAL SIGNS ROUTES
// ============================================================================

// Get vital signs history
router.get('/:patientId/vitals', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    console.log(`[PHR] Getting vitals for patient: ${patientId}`);

    const vitals = await PHRService.getVitalSigns(patientId);
    return res.json(vitals || []);
  } catch (error: any) {
    console.error('[PHR] Get vitals error:', error);
    res.status(500).json({ error: 'Failed to fetch vital signs' });
  }
});

// Add vital signs record
router.post('/:patientId/vitals', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const vitalData = req.body;
    console.log(`[PHR] Adding vital signs for patient: ${patientId}`, vitalData);

    // Convert frontend format to database format
    const dbVitalData = {
      blood_pressure_systolic: vitalData.bloodPressure?.systolic || vitalData.blood_pressure_systolic,
      blood_pressure_diastolic: vitalData.bloodPressure?.diastolic || vitalData.blood_pressure_diastolic,
      heart_rate: vitalData.heartRate?.value || vitalData.heart_rate,
      temperature: vitalData.temperature?.value || vitalData.temperature,
      weight: vitalData.weight?.value || vitalData.weight,
      height: vitalData.height?.value || vitalData.height,
      oxygen_saturation: vitalData.oxygenSaturation?.value || vitalData.oxygen_saturation,
      blood_glucose: vitalData.bloodGlucose?.value || vitalData.blood_glucose,
      blood_glucose_timing: vitalData.bloodGlucose?.timing || vitalData.blood_glucose_timing,
      notes: vitalData.notes,
      recorded_at: vitalData.measuredAt || vitalData.recorded_at || new Date().toISOString()
    };

    const newVital = await PHRService.addVitalSigns(patientId, dbVitalData);
    res.json(newVital);
  } catch (error: any) {
    console.error('[PHR] Add vitals error:', error);
    res.status(500).json({ error: 'Failed to add vital signs' });
  }
});

// ============================================================================
// MEDICATIONS ROUTES
// ============================================================================

// Get patient medications
router.get('/:patientId/medications', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    console.log(`[PHR] Getting medications for patient: ${patientId}`);

    const phr = await PHRService.getPHR(patientId);
    res.json(phr?.medications || []);
  } catch (error: any) {
    console.error('[PHR] Get medications error:', error);
    res.status(500).json({ error: 'Failed to fetch medications' });
  }
});

// Add medication
router.post('/:patientId/medications', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const medicationData = req.body;
    console.log(`[PHR] Adding medication for patient: ${patientId}`);

    const phr = await PHRService.getPHR(patientId);
    const medications = phr?.medications || [];
    
    const newMedication = {
      id: `med_${Date.now()}`,
      ...medicationData,
      addedAt: new Date().toISOString()
    };
    
    medications.push(newMedication);
    
    await PHRService.upsertPHR(patientId, { medications });
    res.json(newMedication);
  } catch (error: any) {
    console.error('[PHR] Add medication error:', error);
    res.status(500).json({ error: 'Failed to add medication' });
  }
});

// ============================================================================
// ALLERGIES ROUTES
// ============================================================================

// Get patient allergies
router.get('/:patientId/allergies', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    console.log(`[PHR] Getting allergies for patient: ${patientId}`);

    const phr = await PHRService.getPHR(patientId);
    res.json(phr?.allergies || []);
  } catch (error: any) {
    console.error('[PHR] Get allergies error:', error);
    res.status(500).json({ error: 'Failed to fetch allergies' });
  }
});

// Add allergy
router.post('/:patientId/allergies', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const allergyData = req.body;
    console.log(`[PHR] Adding allergy for patient: ${patientId}`);

    const phr = await PHRService.getPHR(patientId);
    const allergies = phr?.allergies || [];
    
    const newAllergy = {
      id: `allergy_${Date.now()}`,
      ...allergyData,
      addedAt: new Date().toISOString()
    };
    
    allergies.push(newAllergy);
    
    await PHRService.upsertPHR(patientId, { allergies });
    res.json(newAllergy);
  } catch (error: any) {
    console.error('[PHR] Add allergy error:', error);
    res.status(500).json({ error: 'Failed to add allergy' });
  }
});

// ============================================================================
// HEALTH LOGS (EMR records from doctors) - PostgreSQL
// ============================================================================

// Get patient health logs (from EMR table)
router.get('/:patientId/health-logs', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const { type, limit, offset } = req.query;
    console.log(`[PHR] Getting health logs for patient: ${patientId}`);

    const limitNum = Number.parseInt(limit as string, 10) || 50;
    const offsetNum = Number.parseInt(offset as string, 10) || 0;

    // Query EMR records from PostgreSQL
    let query = `
      SELECT e.*, 
             u.name as doctor_name, u.name_thai as doctor_name_thai,
             a.appointment_type, a.confirmed_date, a.confirmed_time
      FROM emr e
      LEFT JOIN users u ON e.doctor_id = u.id
      LEFT JOIN appointments a ON e.appointment_id = a.id
      WHERE e.patient_id = $1
    `;
    const params: any[] = [patientId];

    if (type) {
      query += ` AND e.status = $${params.length + 1}`;
      params.push(type);
    }

    query += ` ORDER BY e.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limitNum, offsetNum);

    const result = await pool.query(query, params);
    
    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM emr WHERE patient_id = $1',
      [patientId]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    res.json({
      entries: result.rows,
      total,
      offset: offsetNum,
      limit: limitNum,
      lastUpdated: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[PHR] Get health logs error:', error);
    res.status(500).json({ error: 'Failed to fetch health logs' });
  }
});

// Get specific health log entry
router.get('/:patientId/health-logs/:entryId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId, entryId } = req.params;
    console.log(`[PHR] Getting health log entry: ${entryId} for patient: ${patientId}`);

    const result = await pool.query(
      `SELECT e.*, 
              u.name as doctor_name, u.name_thai as doctor_name_thai,
              a.appointment_type, a.confirmed_date, a.confirmed_time
       FROM emr e
       LEFT JOIN users u ON e.doctor_id = u.id
       LEFT JOIN appointments a ON e.appointment_id = a.id
       WHERE e.id = $1 AND e.patient_id = $2`,
      [entryId, patientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Health log entry not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('[PHR] Get health log entry error:', error);
    res.status(500).json({ error: 'Failed to fetch health log entry' });
  }
});

// ============================================================================
// MEDICAL TIMELINE - PostgreSQL
// ============================================================================

// Get patient timeline (aggregated from appointments, EMR, prescriptions, lab orders)
router.get('/:patientId/timeline', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const { type } = req.query;
    console.log(`[PHR] Getting timeline for patient: ${patientId}, type: ${type || 'all'}`);

    const timeline: any[] = [];

    // Get appointments
    if (!type || type === 'appointment' || type === 'all') {
      const appointments = await pool.query(
        `SELECT a.*, u.name as doctor_name, u.name_thai as doctor_name_thai
         FROM appointments a
         LEFT JOIN users u ON a.doctor_id = u.id
         WHERE a.patient_id = $1 AND a.status IN ('completed', 'confirmed')
         ORDER BY COALESCE(a.confirmed_date, a.requested_date) DESC
         LIMIT 50`,
        [patientId]
      );
      appointments.rows.forEach((apt: any) => {
        timeline.push({
          id: apt.id,
          type: 'appointment',
          date: apt.confirmed_date || apt.requested_date,
          title: `นัดพบแพทย์ - ${apt.appointment_type || 'Telehealth'}`,
          titleThai: `นัดพบแพทย์ - ${apt.appointment_type || 'Telehealth'}`,
          description: apt.symptoms?.join(', ') || apt.symptom_description || '',
          doctorName: apt.doctor_name_thai || apt.doctor_name,
          status: apt.status,
          data: apt
        });
      });
    }

    // Get EMR/Diagnoses
    if (!type || type === 'diagnosis' || type === 'all') {
      const emrs = await pool.query(
        `SELECT e.*, u.name as doctor_name, u.name_thai as doctor_name_thai
         FROM emr e
         LEFT JOIN users u ON e.doctor_id = u.id
         WHERE e.patient_id = $1 AND e.status = 'signed'
         ORDER BY e.created_at DESC
         LIMIT 50`,
        [patientId]
      );
      emrs.rows.forEach((emr: any) => {
        const diagnoses = emr.assessment?.diagnoses || [];
        timeline.push({
          id: emr.id,
          type: 'diagnosis',
          date: emr.signed_at || emr.created_at,
          title: 'ผลการวินิจฉัย',
          titleThai: 'ผลการวินิจฉัย',
          description: diagnoses.map((d: any) => d.name || d.description).join(', ') || 'ผลตรวจ',
          doctorName: emr.doctor_name_thai || emr.doctor_name,
          data: emr
        });
      });
    }

    // Get prescriptions
    if (!type || type === 'medication' || type === 'all') {
      const prescriptions = await pool.query(
        `SELECT p.*, u.name as doctor_name, u.name_thai as doctor_name_thai
         FROM prescriptions p
         LEFT JOIN users u ON p.doctor_id = u.id
         WHERE p.patient_id = $1
         ORDER BY p.created_at DESC
         LIMIT 50`,
        [patientId]
      );
      prescriptions.rows.forEach((rx: any) => {
        const meds = rx.medications || [];
        timeline.push({
          id: rx.id,
          type: 'medication',
          date: rx.created_at,
          title: 'ใบสั่งยา',
          titleThai: 'ใบสั่งยา',
          description: meds.map((m: any) => m.name || m.drug_name).join(', ') || 'ยาที่สั่ง',
          doctorName: rx.doctor_name_thai || rx.doctor_name,
          data: rx
        });
      });
    }

    // Get lab orders
    if (!type || type === 'lab' || type === 'all') {
      const labOrders = await pool.query(
        `SELECT l.*, u.name as doctor_name, u.name_thai as doctor_name_thai
         FROM lab_orders l
         LEFT JOIN users u ON l.doctor_id = u.id
         WHERE l.patient_id = $1
         ORDER BY l.ordered_at DESC
         LIMIT 50`,
        [patientId]
      );
      labOrders.rows.forEach((lab: any) => {
        const tests = lab.tests || [];
        timeline.push({
          id: lab.id,
          type: 'lab',
          date: lab.completed_at || lab.ordered_at,
          title: lab.status === 'completed' ? 'ผลแลบ' : 'รอผลแลบ',
          titleThai: lab.status === 'completed' ? 'ผลแลบ' : 'รอผลแลบ',
          description: tests.map((t: any) => t.name || t.test_name).join(', ') || 'การตรวจทางห้องปฏิบัติการ',
          doctorName: lab.doctor_name_thai || lab.doctor_name,
          status: lab.status,
          data: lab
        });
      });
    }

    // Sort by date (newest first)
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json(timeline);
  } catch (error: any) {
    console.error('[PHR] Get timeline error:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

// ============================================================================
// LIVING WILL (E-Living) - PostgreSQL with PDPA Compliance
// ============================================================================

// Get patient's Living Will
router.get('/:patientId/living-will', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const requesterId = (req as any).user?.patientId || (req as any).user?.id;
    const requesterRole = (req as any).user?.role;
    console.log(`[PHR] Getting Living Will for patient: ${patientId}`);

    const livingWill = await LivingWillService.getLivingWill(patientId);
    
    if (!livingWill) {
      return res.json(null);
    }

    // If patient is requesting their own data, return full document
    if (requesterId === patientId) {
      return res.json(livingWill);
    }

    // For doctors/admin: Check PDPA consent
    if (requesterRole === 'doctor' || requesterRole === 'admin') {
      const lw = livingWill as any;
      if (!lw.is_shared_with_doctors) {
        return res.json({ 
          exists: true, 
          isShared: false,
          message: 'Patient has not shared their Living Will with medical staff' 
        });
      }
      return res.json(livingWill);
    }

    return res.status(403).json({ error: 'Access denied' });
  } catch (error: any) {
    console.error('[PHR] Get Living Will error:', error);
    res.status(500).json({ error: 'Failed to fetch Living Will' });
  }
});

// Create or update Living Will
router.post('/:patientId/living-will', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const requesterId = (req as any).user?.patientId || (req as any).user?.id;

    // Only patient can create their own Living Will
    if (requesterId !== patientId) {
      return res.status(403).json({ error: 'Only patient can create their Living Will' });
    }

    console.log(`[PHR] Creating/Updating Living Will for patient: ${patientId}`);
    const livingWillData = req.body;

    const result = await LivingWillService.upsertLivingWill(patientId, {
      statement: livingWillData.personalStatement || livingWillData.statement,
      treatment_preferences: livingWillData.treatments || livingWillData.treatment_preferences,
      representatives: livingWillData.representatives,
      is_shared_with_doctors: livingWillData.pdpaConsent?.isSharedWithDoctors || livingWillData.is_shared_with_doctors || false,
      signatures: livingWillData.signature || livingWillData.signatures
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error('[PHR] Create Living Will error:', error);
    res.status(500).json({ error: 'Failed to create Living Will' });
  }
});

// Update Living Will
router.put('/:patientId/living-will', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const requesterId = (req as any).user?.patientId || (req as any).user?.id;

    if (requesterId !== patientId) {
      return res.status(403).json({ error: 'Only patient can update their Living Will' });
    }

    console.log(`[PHR] Updating Living Will for patient: ${patientId}`);
    const updateData = req.body;

    const result = await LivingWillService.upsertLivingWill(patientId, {
      statement: updateData.personalStatement || updateData.statement,
      treatment_preferences: updateData.treatments || updateData.treatment_preferences,
      representatives: updateData.representatives,
      is_shared_with_doctors: updateData.pdpaConsent?.isSharedWithDoctors || updateData.is_shared_with_doctors,
      signatures: updateData.signature || updateData.signatures
    });

    res.json(result);
  } catch (error: any) {
    console.error('[PHR] Update Living Will error:', error);
    res.status(500).json({ error: 'Failed to update Living Will' });
  }
});

// Update Living Will sharing settings (PDPA consent)
router.put('/:patientId/living-will/share', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const requesterId = (req as any).user?.patientId || (req as any).user?.id;

    if (requesterId !== patientId) {
      return res.status(403).json({ error: 'Only patient can change sharing settings' });
    }

    console.log(`[PHR] Updating Living Will sharing for patient: ${patientId}`);
    const { isSharedWithDoctors } = req.body;

    await pool.query(
      `UPDATE living_wills 
       SET is_shared_with_doctors = $1, updated_at = NOW()
       WHERE patient_id = $2`,
      [isSharedWithDoctors, patientId]
    );

    res.json({
      success: true,
      isSharedWithDoctors,
      message: isSharedWithDoctors 
        ? 'Living Will is now shared with medical staff' 
        : 'Living Will is now private',
    });
  } catch (error: any) {
    console.error('[PHR] Update Living Will sharing error:', error);
    res.status(500).json({ error: 'Failed to update sharing settings' });
  }
});

// Revoke Living Will
router.delete('/:patientId/living-will', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const requesterId = (req as any).user?.patientId || (req as any).user?.id;

    if (requesterId !== patientId) {
      return res.status(403).json({ error: 'Only patient can revoke their Living Will' });
    }

    console.log(`[PHR] Revoking Living Will for patient: ${patientId}`);

    // Mark as revoked instead of deleting
    await pool.query(
      `UPDATE living_wills 
       SET status = 'revoked', is_shared_with_doctors = false, updated_at = NOW()
       WHERE patient_id = $1`,
      [patientId]
    );

    res.json({
      success: true,
      message: 'Living Will has been revoked. A new one can be created.',
    });
  } catch (error: any) {
    console.error('[PHR] Revoke Living Will error:', error);
    res.status(500).json({ error: 'Failed to revoke Living Will' });
  }
});

export default router;
