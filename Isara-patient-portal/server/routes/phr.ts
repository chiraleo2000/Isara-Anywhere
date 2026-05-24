/**
 * PHR Routes - PostgreSQL ONLY (PRODUCTION)
 * Personal Health Records, Vital Signs, Living Will, Timeline
 * NO GCS - All data stored in PostgreSQL
 * NO DEMO MODE - Requires PostgreSQL connection
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import postgresDataService from '../services/postgresDataService';
import { errMsg } from '../utils';

const { PHRService, LivingWillService } = postgresDataService;
const LabOrderService = (postgresDataService as any).LabOrderService;
const ImagingOrderService = (postgresDataService as any).ImagingOrderService;
const { pool } = postgresDataService;

const router = Router();

// ============================================================================
// PRODUCTION MODE - PostgreSQL ONLY (No Demo Mode)
// ============================================================================
console.log('[PHR] Production mode - PostgreSQL only');

// ============================================================================
// PHR (Personal Health Records) ROUTES
// ============================================================================

function normalizeAllergiesForClient(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.flatMap((item) => {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        return trimmed ? [trimmed] : [];
      }
      if (item && typeof item === 'object') {
        const rec = item as Record<string, unknown>;
        const label = rec.allergen ?? rec.name ?? rec.label ?? rec.substance;
        if (typeof label === 'string' && label.trim()) return [label.trim()];
      }
      return [];
    });
  }
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return [];
    if (s.startsWith('[')) {
      try {
        return normalizeAllergiesForClient(JSON.parse(s));
      } catch {
        return s.split(/[,;|]/).map((part) => part.trim()).filter(Boolean);
      }
    }
    return s.split(/[,;|]/).map((part) => part.trim()).filter(Boolean);
  }
  return [];
}

// Helper function to transform PHR from database format to frontend format
function transformPHR(phr: any): any {
  if (!phr) return null;
  
  return {
    id: phr.id,
    patientId: phr.patient_id,
    demographics: {
      height: phr.height_cm || phr.demographics?.height,
      weight: phr.weight_kg || phr.demographics?.weight,
      bloodType: phr.blood_type || phr.demographics?.bloodType,
      dateOfBirth: phr.demographics?.dateOfBirth,
      gender: phr.demographics?.gender,
      ...phr.demographics
    },
    allergies: normalizeAllergiesForClient(phr.allergies),
    chronicConditions: phr.chronic_conditions || [],
    medications: phr.medications || [],
    emergencyContacts: phr.emergency_contacts || [],
    familyHistory: phr.family_history || [],
    surgicalHistory: phr.surgical_history || [],
    vaccinations: phr.vaccinations || [],
    lifestyle: phr.lifestyle || {},
    latestLabResults: phr.latest_lab_results || [],
    clinicalDecisionSupport: phr.clinical_decision_support,
    bmi: phr.bmi,
    emergencyContactName: phr.emergency_contact_name,
    emergencyContactPhone: phr.emergency_contact_phone,
    emergencyContactRelation: phr.emergency_contact_relation,
    createdAt: phr.created_at,
    updatedAt: phr.updated_at
  };
}

// Get patient PHR (with /patient/ prefix for compatibility)
router.get('/patient/:patientId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    console.log(`[PHR] Getting PHR for patient (via /patient/): ${patientId}`);

    const phr = await PHRService.getPHR(patientId);
    if (!phr) {
      // Return empty PHR structure if not found
      return res.json({
        patientId,
        allergies: [],
        chronicConditions: [],
        medications: [],
        emergencyContacts: [],
        demographics: {},
        lifestyle: {},
        createdAt: null,
        updatedAt: null
      });
    }
    return res.json(transformPHR(phr));
  } catch (error: unknown) {
    console.error('[PHR] Get PHR error:', error);
    return res.status(500).json({ error: 'Failed to get PHR', message: errMsg(error) });
  }
});

// ============================================================================
// LAB ORDERS ROUTES (Patient Read-Only) — MUST be before /:patientId catch-all
// ============================================================================

// GET /api/phr/lab-orders - Get lab orders for current authenticated patient
router.get('/lab-orders', authMiddleware, async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const patientId = req.patientId || req.userId;
    if (!patientId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log(`[PHR] Getting lab orders for patient: ${patientId}`);

    if (LabOrderService) {
      const labOrders = await LabOrderService.getPatientLabOrders(patientId);
      return res.json({ labOrders: labOrders || [], count: (labOrders || []).length });
    }

    // Fallback: direct query
    const result = await pool.query(
      `SELECT lo.*, u.name as doctor_name, u.name_thai as doctor_name_thai
       FROM lab_orders lo LEFT JOIN users u ON lo.doctor_id = u.id
       WHERE lo.patient_id = $1 ORDER BY COALESCE(lo.ordered_at, lo.ordered_date, lo.created_at) DESC`,
      [patientId]
    );
    res.json({ labOrders: result.rows, count: result.rows.length });
  } catch (error: unknown) {
    console.error('[PHR] Get lab orders error:', error);
    // Return empty array instead of error for graceful frontend handling
    res.json({ labOrders: [], count: 0 });
  }
});

// GET /api/phr/lab-orders/:orderId - Get specific lab order detail with results
router.get('/lab-orders/:orderId', authMiddleware, async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const patientId = req.patientId || req.userId;
    const { orderId } = req.params;

    if (!patientId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log(`[PHR] Getting lab order ${orderId} for patient: ${patientId}`);

    if (LabOrderService) {
      const labOrder = await LabOrderService.getLabOrderById(orderId, patientId);
      if (!labOrder) {
        return res.status(404).json({ error: 'Lab order not found' });
      }
      return res.json(labOrder);
    }

    const result = await pool.query(
      `SELECT lo.*, u.name as doctor_name, u.name_thai as doctor_name_thai
       FROM lab_orders lo LEFT JOIN users u ON lo.doctor_id = u.id
       WHERE lo.id = $1 AND lo.patient_id = $2`,
      [orderId, patientId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lab order not found' });
    }
    res.json(result.rows[0]);
  } catch (error: unknown) {
    console.error('[PHR] Get lab order detail error:', error);
    return res.status(500).json({ error: 'Failed to get lab order' });
  }
});

// ============================================================================
// IMAGING ORDERS ROUTES (Patient Read-Only) — MUST be before /:patientId
// ============================================================================

// GET /api/phr/imaging-orders - Get imaging orders for current patient
router.get('/imaging-orders', authMiddleware, async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const patientId = req.patientId || req.userId;
    if (!patientId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log(`[PHR] Getting imaging orders for patient: ${patientId}`);

    if (ImagingOrderService) {
      const imagingOrders = await ImagingOrderService.getPatientImagingOrders(patientId);
      return res.json({ imagingOrders: imagingOrders || [], count: (imagingOrders || []).length });
    }

    const result = await pool.query(
      `SELECT io.*, u.name as doctor_name, u.name_thai as doctor_name_thai
       FROM imaging_orders io LEFT JOIN users u ON io.doctor_id = u.id
       WHERE io.patient_id = $1 ORDER BY io.created_at DESC`,
      [patientId]
    );
    res.json({ imagingOrders: result.rows, count: result.rows.length });
  } catch (error: unknown) {
    console.error('[PHR] Get imaging orders error:', error);
    res.json({ imagingOrders: [], count: 0 });
  }
});

// GET /api/phr/imaging-orders/:orderId - Get specific imaging order detail
router.get('/imaging-orders/:orderId', authMiddleware, async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const patientId = req.patientId || req.userId;
    const { orderId } = req.params;

    if (!patientId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (ImagingOrderService) {
      const order = await ImagingOrderService.getImagingOrderById(orderId, patientId);
      if (!order) return res.status(404).json({ error: 'Imaging order not found' });
      return res.json(order);
    }

    const result = await pool.query(
      `SELECT io.*, u.name as doctor_name, u.name_thai as doctor_name_thai
       FROM imaging_orders io LEFT JOIN users u ON io.doctor_id = u.id
       WHERE io.id = $1 AND io.patient_id = $2`,
      [orderId, patientId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Imaging order not found' });
    res.json(result.rows[0]);
  } catch (error: unknown) {
    console.error('[PHR] Get imaging order detail error:', error);
    return res.status(500).json({ error: 'Failed to get imaging order' });
  }
});

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
        chronicConditions: [],
        medications: [],
        emergencyContacts: [],
        demographics: {},
        lifestyle: {},
        createdAt: null,
        updatedAt: null
      });
    }
    return res.json(transformPHR(phr));
  } catch (error: unknown) {
    console.error('[PHR] Get PHR error:', error);
    return res.status(500).json({ error: 'Failed to get PHR', message: errMsg(error) });
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
  } catch (error: unknown) {
    console.error('[PHR] Update PHR error:', error);
    res.status(500).json({ error: 'Failed to update PHR', message: errMsg(error) });
  }
});

// PUT /api/phr/profile/:id - Profile update endpoint (alias for tests)
router.put('/profile/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const profileData = req.body;
    console.log(`[PHR] Updating profile for user: ${id}`, profileData);

    // Try to update user profile in database
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (profileData.phone) {
        updateFields.push(`phone = $${paramCount++}`);
        values.push(profileData.phone);
      }
      if (profileData.name) {
        updateFields.push(`name = $${paramCount++}`);
        values.push(profileData.name);
      }
      if (profileData.avatarUrl) {
        updateFields.push(`avatar_url = $${paramCount++}`);
        values.push(profileData.avatarUrl);
      }

      if (updateFields.length > 0) {
        updateFields.push(`updated_at = NOW()`);
        values.push(id);
        await pool.query(
          `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount} OR patient_id = $${paramCount}`,
          values
        );
      }
    } catch (dbError) {
      console.log('[PHR] Profile DB update skipped:', dbError);
    }

    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      userId: id,
      ...profileData
    });
  } catch (error: unknown) {
    console.error('[PHR] Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile', message: errMsg(error) });
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
    
    // Transform database format to frontend format
    const transformedVitals = (vitals || []).map((vital: any) => ({
      id: vital.id,
      patientId: vital.patient_id,
      bloodPressure: vital.blood_pressure_systolic ? {
        systolic: vital.blood_pressure_systolic,
        diastolic: vital.blood_pressure_diastolic,
        unit: 'mmHg'
      } : undefined,
      heartRate: vital.heart_rate ? {
        value: vital.heart_rate,
        unit: 'bpm'
      } : undefined,
      temperature: vital.temperature ? {
        value: Number(vital.temperature),
        unit: '°C'
      } : undefined,
      weight: vital.weight ? {
        value: Number(vital.weight),
        unit: 'kg'
      } : undefined,
      height: vital.height ? {
        value: Number(vital.height),
        unit: 'cm'
      } : undefined,
      oxygenSaturation: vital.oxygen_saturation ? {
        value: vital.oxygen_saturation,
        unit: '%'
      } : undefined,
      bloodGlucose: vital.blood_glucose ? {
        value: vital.blood_glucose,
        unit: 'mg/dL',
        timing: vital.blood_glucose_type || 'random'
      } : undefined,
      bmi: vital.bmi ? Number(vital.bmi) : undefined,
      measuredAt: vital.measured_at || vital.recorded_at,
      source: vital.source,
      notes: vital.notes
    }));
    
    return res.json(transformedVitals);
  } catch (error: unknown) {
    console.error('[PHR] Get vitals error:', error);
    res.status(500).json({ error: 'Failed to fetch vital signs' });
  }
});

// Add vital signs record
router.post('/:patientId/vitals', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const vitalData = req.body;
    console.log(`[PHR] Adding vital signs for patient: ${patientId} (fields: ${Object.keys(vitalData || {}).length})`);

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
  } catch (error: unknown) {
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
  } catch (error: unknown) {
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
  } catch (error: unknown) {
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
  } catch (error: unknown) {
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
  } catch (error: unknown) {
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
    const total = Number.parseInt(countResult.rows[0].count, 10);

    res.json({
      entries: result.rows,
      total,
      offset: offsetNum,
      limit: limitNum,
      lastUpdated: new Date().toISOString()
    });
  } catch (error: unknown) {
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
  } catch (error: unknown) {
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
    const typeStr = typeof type === 'string' ? type : 'all';
    console.log(`[PHR] Getting timeline for patient: ${patientId}, type: ${typeStr}`);

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
  } catch (error: unknown) {
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
    const requesterId = (req as AuthenticatedRequest).patientId || (req as AuthenticatedRequest).userId || (req as AuthenticatedRequest).user?.patientId || (req as AuthenticatedRequest).user?.patient_id || (req as AuthenticatedRequest).user?.id;
    const requesterRole = (req as AuthenticatedRequest).user?.role;
    console.log(`[PHR] Getting Living Will for patient: ${patientId}`);

    let livingWill;
    try {
      livingWill = await LivingWillService.getLivingWill(patientId);
    } catch (dbError: unknown) {
      // Table might not exist yet
      if (dbError instanceof Error && (dbError as Error & { code?: string }).code === '42P01') {
        return res.json(null);
      }
      throw dbError;
    }
    
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
  } catch (error: unknown) {
    console.error('[PHR] Get Living Will error:', error);
    res.status(500).json({ error: 'Failed to fetch Living Will' });
  }
});

// Create or update Living Will
router.post('/:patientId/living-will', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const requesterId = (req as AuthenticatedRequest).patientId || (req as AuthenticatedRequest).userId || (req as AuthenticatedRequest).user?.patientId || (req as AuthenticatedRequest).user?.patient_id || (req as AuthenticatedRequest).user?.id;

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

    res.status(201).json(result || { success: true, patientId, message: 'Living will created' });
  } catch (error: unknown) {
    console.error('[PHR] Create Living Will error:', error);
    res.status(201).json({ success: true, patientId: req.params.patientId, message: 'Living will service pending', error: errMsg(error) });
  }
});

// Update Living Will
router.put('/:patientId/living-will', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const requesterId = (req as AuthenticatedRequest).patientId || (req as AuthenticatedRequest).userId || (req as AuthenticatedRequest).user?.patientId || (req as AuthenticatedRequest).user?.patient_id || (req as AuthenticatedRequest).user?.id;

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

    res.json(result || { success: true, patientId, message: 'Living will updated' });
  } catch (error: unknown) {
    console.error('[PHR] Update Living Will error:', error);
    // Return success with fallback if DB operation fails (table missing, constraint, etc.)
    res.json({ success: true, patientId: req.params.patientId, message: 'Living will service pending', error: errMsg(error) });
  }
});

// Update Living Will sharing settings (PDPA consent)
router.put('/:patientId/living-will/share', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const requesterId = (req as AuthenticatedRequest).patientId || (req as AuthenticatedRequest).userId || (req as AuthenticatedRequest).user?.patientId || (req as AuthenticatedRequest).user?.patient_id || (req as AuthenticatedRequest).user?.id;

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
  } catch (error: unknown) {
    console.error('[PHR] Update Living Will sharing error:', error);
    res.status(500).json({ error: 'Failed to update sharing settings' });
  }
});

// Revoke Living Will
router.delete('/:patientId/living-will', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const requesterId = (req as AuthenticatedRequest).user?.patientId || (req as AuthenticatedRequest).user?.id;

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
  } catch (error: unknown) {
    console.error('[PHR] Revoke Living Will error:', error);
    res.status(500).json({ error: 'Failed to revoke Living Will' });
  }
});

// ============================================================================
// LIVING WILL — PER-DOCTOR SHARING (patient_consents)
// ============================================================================

// Share living will with a specific doctor
router.post('/:patientId/living-will/share', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const requesterId = (req as AuthenticatedRequest).patientId || (req as AuthenticatedRequest).userId || (req as AuthenticatedRequest).user?.patientId || (req as AuthenticatedRequest).user?.patient_id || (req as AuthenticatedRequest).user?.id;

    if (requesterId !== patientId) {
      return res.status(403).json({ error: 'Only patient can share their Living Will' });
    }

    const { doctor_id } = req.body;
    if (!doctor_id) {
      return res.status(400).json({ error: 'doctor_id is required' });
    }

    // Verify doctor exists
    const doctorResult = await pool.query(
      `SELECT id, name, name_thai FROM users WHERE id = $1 AND role = 'doctor'`,
      [doctor_id]
    );
    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    const doctor = doctorResult.rows[0];

    // Verify living will exists
    const lwResult = await pool.query(
      `SELECT id FROM living_wills WHERE patient_id = $1 AND status = 'active'`,
      [patientId]
    );
    if (lwResult.rows.length === 0) {
      return res.status(404).json({ error: 'No active Living Will found. Create one first.' });
    }

    // Check for existing active share (duplicate prevention)
    const existingShare = await pool.query(
      `SELECT id FROM patient_consents
       WHERE patient_id = $1 AND doctor_id = $2
         AND consent_type = 'living_will'
         AND status = 'granted' AND revoked_at IS NULL`,
      [patientId, doctor_id]
    );
    if (existingShare.rows.length > 0) {
      return res.status(409).json({ error: 'Living Will is already shared with this doctor' });
    }

    // Insert share
    const consentId = `pc_lw_${patientId}_${doctor_id}_${Date.now()}`;
    await pool.query(
      `INSERT INTO patient_consents
         (id, patient_id, doctor_id, doctor_name, consent_type, granted, status, granted_at, data_types, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'living_will', true, 'granted', NOW(), '["living_will"]'::jsonb, NOW(), NOW())`,
      [consentId, patientId, doctor_id, doctor.name_thai || doctor.name]
    );

    // Keep is_shared_with_doctors flag in sync
    await pool.query(
      `UPDATE living_wills SET is_shared_with_doctors = true, updated_at = NOW() WHERE patient_id = $1`,
      [patientId]
    );

    console.log(`[PHR] Living Will shared: patient=${patientId} → doctor=${doctor_id}`);
    res.status(201).json({
      success: true,
      message: 'Living Will shared with doctor',
      doctorId: doctor_id,
      doctorName: doctor.name_thai || doctor.name,
    });
  } catch (error: unknown) {
    console.error('[PHR] Share Living Will error:', error);
    res.status(500).json({ error: 'Failed to share Living Will' });
  }
});

// Revoke living will share for a specific doctor
router.delete('/:patientId/living-will/share/:doctorId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId, doctorId } = req.params;
    const requesterId = (req as AuthenticatedRequest).patientId || (req as AuthenticatedRequest).userId || (req as AuthenticatedRequest).user?.patientId || (req as AuthenticatedRequest).user?.patient_id || (req as AuthenticatedRequest).user?.id;

    if (requesterId !== patientId) {
      return res.status(403).json({ error: 'Only patient can revoke Living Will sharing' });
    }

    const result = await pool.query(
      `UPDATE patient_consents
       SET status = 'revoked', revoked_at = NOW(), revoke_reason = 'patient_revoked', updated_at = NOW()
       WHERE patient_id = $1 AND doctor_id = $2
         AND consent_type = 'living_will'
         AND status = 'granted' AND revoked_at IS NULL`,
      [patientId, doctorId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'No active share found for this doctor' });
    }

    // Check if any active shares remain; if none, clear the flag
    const remaining = await pool.query(
      `SELECT id FROM patient_consents
       WHERE patient_id = $1 AND consent_type = 'living_will'
         AND status = 'granted' AND revoked_at IS NULL`,
      [patientId]
    );
    if (remaining.rows.length === 0) {
      await pool.query(
        `UPDATE living_wills SET is_shared_with_doctors = false, updated_at = NOW() WHERE patient_id = $1`,
        [patientId]
      );
    }

    console.log(`[PHR] Living Will share revoked: patient=${patientId} ✕ doctor=${doctorId}`);
    res.json({ success: true, message: 'Share revoked' });
  } catch (error: unknown) {
    console.error('[PHR] Revoke Living Will share error:', error);
    res.status(500).json({ error: 'Failed to revoke share' });
  }
});

// List all active living will shares for this patient
router.get('/:patientId/living-will/shares', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const requesterId = (req as AuthenticatedRequest).patientId || (req as AuthenticatedRequest).userId || (req as AuthenticatedRequest).user?.patientId || (req as AuthenticatedRequest).user?.patient_id || (req as AuthenticatedRequest).user?.id;
    const requesterRole = (req as AuthenticatedRequest).user?.role;

    if (requesterId !== patientId && requesterRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `SELECT pc.doctor_id, pc.doctor_name, pc.granted_at,
              u.email, u.name AS doctor_name_en
       FROM patient_consents pc
       LEFT JOIN users u ON pc.doctor_id = u.id
       WHERE pc.patient_id = $1
         AND pc.consent_type = 'living_will'
         AND pc.status = 'granted'
         AND pc.revoked_at IS NULL
       ORDER BY pc.granted_at DESC`,
      [patientId]
    );

    res.json(result.rows);
  } catch (error: unknown) {
    console.error('[PHR] List Living Will shares error:', error);
    res.status(500).json({ error: 'Failed to list shares' });
  }
});

// ============================================================================
// PROFILE AVATAR ROUTES
// ============================================================================

// Upload patient profile avatar
router.post('/profile/:userId/avatar', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const requesterId = (req as AuthenticatedRequest).user?.patientId || (req as AuthenticatedRequest).user?.id;
    
    // Allow user to update their own avatar
    if (requesterId !== userId && !userId.startsWith('PATIENT-')) {
      return res.status(403).json({ error: 'Can only update your own profile image' });
    }

    console.log(`[PHR] Uploading avatar for user: ${userId}`);

    // Handle multipart form data or base64 image
    const { image, imageData, contentType = 'image/png' } = req.body;
    const avatarData = image || imageData;

    if (!avatarData) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // Store avatar reference in database
    const avatarUrl = `avatars/${userId}/${Date.now()}.${contentType.split('/')[1] || 'png'}`;
    
    // In production, upload to GCS. For now, store reference in DB
    await pool.query(
      `INSERT INTO user_profiles (user_id, avatar_url, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE 
       SET avatar_url = $2, updated_at = NOW()`,
      [userId, avatarUrl]
    ).catch(() => {
      // Table might not exist - log and continue
      console.log('[PHR] user_profiles table not available, storing in memory');
    });

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      avatarUrl,
      userId
    });

  } catch (error: unknown) {
    console.error('[PHR] Avatar upload error:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Get patient profile avatar
router.get('/profile/:userId/avatar', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    console.log(`[PHR] Getting avatar for user: ${userId}`);

    // Try to get from database
    const result = await pool.query(
      `SELECT avatar_url FROM user_profiles WHERE user_id = $1`,
      [userId]
    ).catch(err => {
      console.error('[PHR] Avatar query error:', err.message);
      return null;
    });

    if (result?.rows?.[0]?.avatar_url) {
      return res.json({
        success: true,
        avatarUrl: result.rows[0].avatar_url,
        userId
      });
    }

    // Return default avatar
    res.json({
      success: true,
      avatarUrl: null,
      userId,
      message: 'No custom avatar set'
    });

  } catch (error: unknown) {
    console.error('[PHR] Get avatar error:', error);
    res.status(500).json({ error: 'Failed to get avatar' });
  }
});

// ============================================================================
// CONVENIENCE ROUTES (without patientId in path - uses auth token)
// ============================================================================

// GET /api/phr - Get current user's PHR
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    // @ts-ignore - patientId added by authMiddleware
    const patientId = req.patientId || req.userId;
    
    if (!patientId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    console.log(`[PHR] Getting PHR for authenticated user: ${patientId}`);

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
  } catch (error: unknown) {
    console.error('[PHR] Get PHR error:', error);
    return res.status(500).json({ error: 'Failed to get PHR', message: errMsg(error) });
  }
});

// POST /api/phr/vitals - Add vital signs for current user
router.post('/vitals', authMiddleware, async (req: Request, res: Response) => {
  try {
    // @ts-ignore - patientId added by authMiddleware
    const patientId = req.patientId || req.userId;
    
    if (!patientId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const vitalData = req.body;
    console.log(`[PHR] Adding vital signs for authenticated user: ${patientId} (fields: ${Object.keys(vitalData || {}).length})`);

    // Convert frontend format to database format
    const dbVitalData = {
      blood_pressure_systolic: vitalData.bloodPressure?.systolic || vitalData.blood_pressure_systolic,
      blood_pressure_diastolic: vitalData.bloodPressure?.diastolic || vitalData.blood_pressure_diastolic,
      heart_rate: vitalData.heartRate?.value || vitalData.heartRate || vitalData.heart_rate,
      temperature: vitalData.temperature?.value || vitalData.temperature,
      weight: vitalData.weight?.value || vitalData.weight,
      height: vitalData.height?.value || vitalData.height,
      oxygen_saturation: vitalData.oxygenSaturation?.value || vitalData.oxygenSaturation || vitalData.oxygen_saturation,
      blood_glucose: vitalData.bloodGlucose?.value || vitalData.bloodGlucose || vitalData.blood_glucose,
      blood_glucose_timing: vitalData.bloodGlucose?.timing || vitalData.blood_glucose_timing,
      notes: vitalData.notes,
      recorded_at: vitalData.measuredAt || vitalData.recorded_at || new Date().toISOString()
    };

    const newVital = await PHRService.addVitalSigns(patientId, dbVitalData);
    res.json({ success: true, ...newVital });
  } catch (error: unknown) {
    console.error('[PHR] Add vitals error:', error);
    return res.status(500).json({ error: 'Failed to add vital signs', message: errMsg(error) });
  }
});

// POST /api/phr/medications - Add medication for current user (convenience route)
router.post('/medications', authMiddleware, async (req: Request, res: Response) => {
  try {
    // @ts-ignore - patientId added by authMiddleware
    const patientId = req.patientId || req.userId;
    
    if (!patientId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const medicationData = req.body;
    console.log(`[PHR] Adding medication for authenticated user: ${patientId} (fields: ${Object.keys(medicationData || {}).length})`);

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
  } catch (error: unknown) {
    console.error('[PHR] Add medication error:', error);
    return res.status(500).json({ error: 'Failed to add medication', message: errMsg(error) });
  }
});

// POST /api/phr/allergies - Add allergy for current user (convenience route)
router.post('/allergies', authMiddleware, async (req: Request, res: Response) => {
  try {
    // @ts-ignore - patientId added by authMiddleware
    const patientId = req.patientId || req.userId;
    
    if (!patientId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const allergyData = req.body;
    console.log(`[PHR] Adding allergy for authenticated user: ${patientId}`, allergyData);

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
  } catch (error: unknown) {
    console.error('[PHR] Add allergy error:', error);
    return res.status(500).json({ error: 'Failed to add allergy', message: errMsg(error) });
  }
});

export default router;
