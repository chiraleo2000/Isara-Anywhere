/**
 * Appointment Pool Service
 * 
 * Handles the appointment pool management for:
 * 1. Patient-selected doctor: Doctor responds with available slots, if unavailable goes to pool
 * 2. System-assigned doctor: Goes to pool for AI/doctor/admin assignment
 * 3. Meeting time rules: 15 min before / 30 min after allowed, auto-reschedule if missed
 * 
 * Pool Flow:
 * - Patient creates appointment request
 * - If doctor selected: Doctor can confirm or reject (goes to pool)
 * - If no doctor: Goes to pool for AI matching by specialty/symptom
 * - Other doctors can claim from pool
 * - Admin can assign with approval workflow
 * - Missed meetings auto-reschedule to next week same time
 */

import { Router, Request, Response } from 'express';
import { BUCKETS as GCS_BUCKETS, readJSON, writeJSON } from '../utils/localStore';
import { authMiddleware } from '../middleware/auth';
import { errMsg } from '../utils';
import postgresDataService from '../services/postgresDataService';

const { pool: pgPool } = postgresDataService;

const router = Router();

// Types for appointment pool
export interface AppointmentPoolItem {
  id: string;
  appointmentId: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  originalDoctorId?: string;
  originalDoctorName?: string;
  requiredSpecialty: string;
  matchedSpecialties: string[];
  symptoms: string[];
  symptomDescription?: string;
  urgency: 'normal' | 'urgent' | 'emergency';
  preferredDates: string[];
  preferredTimeSlot: 'morning' | 'afternoon' | 'evening';
  appointmentType: 'telehealth' | 'in_person';
  poolReason: 'no_doctor_selected' | 'doctor_unavailable' | 'doctor_rejected' | 'meeting_missed' | 'rescheduled';
  poolStatus: 'pending' | 'ai_matched' | 'doctor_claimed' | 'admin_assigned' | 'admin_pending_approval' | 'confirmed' | 'expired';
  aiMatchedDoctorId?: string;
  aiMatchedDoctorName?: string;
  aiMatchReason?: string;
  claimedByDoctorId?: string;
  claimedByDoctorName?: string;
  adminAssignedDoctorId?: string;
  adminAssignedDoctorName?: string;
  adminApprovalRequired: boolean;
  adminApproved?: boolean;
  adminApprovedBy?: string;
  adminApprovedAt?: string;
  assignedDate?: string;
  assignedTime?: string;
  missedCount: number;
  maxMissedAttempts: number;
  originalAppointmentDate?: string;
  originalAppointmentTime?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface PoolAssignmentResult {
  success: boolean;
  appointmentId: string;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  assignedDate?: string;
  assignedTime?: string;
  requiresAdminApproval?: boolean;
  message: string;
}

export interface MeetingTimeRules {
  allowJoinBefore: number; // minutes
  allowJoinAfter: number; // minutes
  autoRescheduleOnMiss: boolean;
  rescheduleToNextWeek: boolean;
  maxMissedAttempts: number;
}

// Default meeting time rules
const DEFAULT_MEETING_RULES: MeetingTimeRules = {
  allowJoinBefore: 15,
  allowJoinAfter: 30,
  autoRescheduleOnMiss: true,
  rescheduleToNextWeek: true,
  maxMissedAttempts: 3
};

// Helper functions
// readJSON / writeJSON are imported from utils/localStore (local filesystem under ./data)

// Specialty to symptom mapping for AI matching
const SPECIALTY_SYMPTOM_MAP: Record<string, string[]> = {
  'General Practitioner': ['ไข้', 'ปวดหัว', 'อ่อนเพลีย', 'ปวดกล้ามเนื้อ', 'นอนไม่หลับ', 'เวียนศีรษะ'],
  'Gastroenterologist': ['ปวดท้อง', 'ท้องเสีย', 'คลื่นไส้', 'อาเจียน', 'กรดไหลย้อน', 'ท้องผูก'],
  'Cardiologist': ['เจ็บหน้าอก', 'หายใจลำบาก', 'ใจสั่น', 'หัวใจเต้นผิดปกติ', 'ความดันโลหิตสูง'],
  'Dermatologist': ['ผื่น', 'คัน', 'สิว', 'ผิวแห้ง', 'ผมร่วง', 'แพ้อากาศ'],
  'Pulmonologist': ['ไอ', 'หายใจลำบาก', 'ไอมีเสมหะ', 'หอบหืด', 'เจ็บหน้าอก'],
  'ENT Specialist': ['เจ็บคอ', 'หูอื้อ', 'เสียงแหบ', 'คัดจมูก', 'น้ำมูกไหล', 'ไซนัส'],
  'Neurologist': ['ปวดหัว', 'เวียนศีรษะ', 'ชา', 'อาการชัก', 'สูญเสียความจำ'],
  'Orthopedist': ['ปวดข้อ', 'ปวดหลัง', 'ปวดเข่า', 'บาดเจ็บกล้ามเนื้อ', 'กระดูกหัก'],
  'Psychiatrist': ['นอนไม่หลับ', 'วิตกกังวล', 'ซึมเศร้า', 'เครียด', 'ไบโพลาร์'],
  'Pediatrician': ['ไข้ในเด็ก', 'ไอเด็ก', 'ท้องเสียเด็ก', 'ผื่นเด็ก', 'การเจริญเติบโต']
};

/**
 * Match symptoms to appropriate specialties
 */
function matchSymptomsToSpecialties(symptoms: string[], mainSymptom: string): string[] {
  const matchedSpecialties: string[] = [];
  const allSymptoms = [...symptoms, mainSymptom].map(s => s.toLowerCase());

  for (const [specialty, specialtySymptoms] of Object.entries(SPECIALTY_SYMPTOM_MAP)) {
    for (const symptom of allSymptoms) {
      if (specialtySymptoms.some(s => symptom.includes(s.toLowerCase()) || s.toLowerCase().includes(symptom))) {
        if (!matchedSpecialties.includes(specialty)) {
          matchedSpecialties.push(specialty);
        }
      }
    }
  }

  // Default to General Practitioner if no match
  if (matchedSpecialties.length === 0) {
    matchedSpecialties.push('General Practitioner');
  }

  return matchedSpecialties;
}

/**
 * Calculate next week same time slot
 */
function getNextWeekSameTime(date: string, time: string): { date: string; time: string } {
  const originalDate = new Date(date);
  originalDate.setDate(originalDate.getDate() + 7);
  return {
    date: originalDate.toISOString().split('T')[0],
    time: time
  };
}

/**
 * Check if current time is within meeting window
 */
function isWithinMeetingWindow(appointmentDate: string, appointmentTime: string, rules: MeetingTimeRules = DEFAULT_MEETING_RULES): { canJoin: boolean; reason: string; minutesUntilStart?: number; minutesSinceEnd?: number } {
  const now = new Date();
  const [hours, minutes] = appointmentTime.split(':').map(Number);
  const meetingStart = new Date(appointmentDate);
  meetingStart.setHours(hours, minutes, 0, 0);

  const earlyWindow = new Date(meetingStart.getTime() - rules.allowJoinBefore * 60 * 1000);
  const lateWindow = new Date(meetingStart.getTime() + rules.allowJoinAfter * 60 * 1000);

  if (now < earlyWindow) {
    const minutesUntilStart = Math.ceil((meetingStart.getTime() - now.getTime()) / (60 * 1000));
    return {
      canJoin: false,
      reason: `Meeting hasn't started yet. You can join ${rules.allowJoinBefore} minutes before the scheduled time.`,
      minutesUntilStart
    };
  }

  if (now > lateWindow) {
    const minutesSinceEnd = Math.ceil((now.getTime() - lateWindow.getTime()) / (60 * 1000));
    return {
      canJoin: false,
      reason: `Meeting window has passed. The allowed join time was ${rules.allowJoinAfter} minutes after the scheduled time.`,
      minutesSinceEnd
    };
  }

  return { canJoin: true, reason: 'Within meeting window' };
}

// Pool Routes

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { urgency } = req.query;
    let query = `SELECT a.*, u.name as patient_name, u.email as patient_email
      FROM appointments a
      LEFT JOIN users u ON a.patient_id = u.id
      WHERE a.status IN ('in_pool', 'pending', 'awaiting_doctor_response')`;
    const params: string[] = [];
    if (urgency) {
      query += ` AND a.urgency_level = $1`;
      params.push(String(urgency));
    }
    query += ` ORDER BY a.created_at ASC`;
    const result = await pgPool.query(query, params);
    res.json(result.rows);
  } catch (error: unknown) {
    console.error('Get pool error:', error);
    res.status(500).json({ error: errMsg(error) });
  }
});

/**
 * Deprecated: pool rows are created via POST /api/appointments (status in_pool).
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  const { appointmentId } = req.body;
  if (appointmentId) {
    return res.json({
      success: true,
      deprecated: true,
      message: 'Pool is stored in PostgreSQL appointments table; use POST /api/appointments',
      appointmentId,
    });
  }
  res.status(400).json({ error: 'appointmentId required; create appointment via POST /api/appointments first' });
});

/**
 * Doctor claims appointment from pool
 */
router.post('/:poolId/claim', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { poolId } = req.params;
    const { doctorId, doctorName, proposedDate, proposedTime } = req.body;

    // Read pool
    let pool = await readJSON(GCS_BUCKETS.APPOINTMENTS, 'appointment-pool/pool.json') || [];
    const itemIndex = pool.findIndex((item: AppointmentPoolItem) => item.id === poolId);

    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Pool item not found' });
    }

    const poolItem = pool[itemIndex];

    if (poolItem.poolStatus !== 'pending' && poolItem.poolStatus !== 'ai_matched') {
      return res.status(400).json({ error: 'This appointment is no longer available for claiming' });
    }

    // Update pool item
    poolItem.claimedByDoctorId = doctorId;
    poolItem.claimedByDoctorName = doctorName;
    poolItem.assignedDate = proposedDate;
    poolItem.assignedTime = proposedTime;
    poolItem.poolStatus = 'doctor_claimed';
    poolItem.updatedAt = new Date().toISOString();

    pool[itemIndex] = poolItem;

    // Write updated pool
    await writeJSON(GCS_BUCKETS.APPOINTMENTS, 'appointment-pool/pool.json', pool);
    await writeJSON(GCS_BUCKETS.APPOINTMENTS, `appointment-pool/items/${poolId}.json`, poolItem);

    // Update the original appointment
    await updateOriginalAppointment(poolItem.appointmentId, {
      doctorId: doctorId,
      doctorName: doctorName,
      appointmentDate: proposedDate,
      appointmentTime: proposedTime,
      status: 'confirmed',
      poolId: poolId
    });

    res.json({
      success: true,
      poolItem,
      message: 'Appointment claimed successfully'
    });
  } catch (error: unknown) {
    console.error('Claim pool error:', error);
    res.status(500).json({ error: errMsg(error) });
  }
});

/**
 * Admin assigns doctor to pool item (requires approval)
 */
router.post('/:poolId/admin-assign', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { poolId } = req.params;
    const { doctorId, doctorName, assignedDate, assignedTime, adminId, adminName } = req.body;

    // Read pool
    let pool = await readJSON(GCS_BUCKETS.APPOINTMENTS, 'appointment-pool/pool.json') || [];
    const itemIndex = pool.findIndex((item: AppointmentPoolItem) => item.id === poolId);

    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Pool item not found' });
    }

    const poolItem = pool[itemIndex];

    // Check if admin approval is required for this type of assignment
    const requiresApproval = poolItem.missedCount > 0 || poolItem.poolReason === 'rescheduled';

    // Update pool item
    poolItem.adminAssignedDoctorId = doctorId;
    poolItem.adminAssignedDoctorName = doctorName;
    poolItem.assignedDate = assignedDate;
    poolItem.assignedTime = assignedTime;
    poolItem.poolStatus = requiresApproval ? 'admin_pending_approval' : 'admin_assigned';
    poolItem.adminApprovalRequired = requiresApproval;
    poolItem.updatedAt = new Date().toISOString();

    if (!requiresApproval) {
      poolItem.adminApproved = true;
      poolItem.adminApprovedBy = adminName || adminId;
      poolItem.adminApprovedAt = new Date().toISOString();
    }

    pool[itemIndex] = poolItem;

    // Write updated pool
    await writeJSON(GCS_BUCKETS.APPOINTMENTS, 'appointment-pool/pool.json', pool);
    await writeJSON(GCS_BUCKETS.APPOINTMENTS, `appointment-pool/items/${poolId}.json`, poolItem);

    // If no approval needed, update original appointment immediately
    if (!requiresApproval) {
      await updateOriginalAppointment(poolItem.appointmentId, {
        doctorId: doctorId,
        doctorName: doctorName,
        appointmentDate: assignedDate,
        appointmentTime: assignedTime,
        status: 'confirmed',
        poolId: poolId
      });
    }

    res.json({
      success: true,
      poolItem,
      requiresApproval,
      message: requiresApproval 
        ? 'Assignment pending approval' 
        : 'Appointment assigned successfully'
    });
  } catch (error: unknown) {
    console.error('Admin assign error:', error);
    res.status(500).json({ error: errMsg(error) });
  }
});

/**
 * Admin approves assignment
 */
router.post('/:poolId/approve', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { poolId } = req.params;
    const { adminId, adminName } = req.body;

    // Read pool
    let pool = await readJSON(GCS_BUCKETS.APPOINTMENTS, 'appointment-pool/pool.json') || [];
    const itemIndex = pool.findIndex((item: AppointmentPoolItem) => item.id === poolId);

    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Pool item not found' });
    }

    const poolItem = pool[itemIndex];

    if (poolItem.poolStatus !== 'admin_pending_approval') {
      return res.status(400).json({ error: 'This assignment is not pending approval' });
    }

    // Approve assignment
    poolItem.adminApproved = true;
    poolItem.adminApprovedBy = adminName || adminId;
    poolItem.adminApprovedAt = new Date().toISOString();
    poolItem.poolStatus = 'confirmed';
    poolItem.updatedAt = new Date().toISOString();

    pool[itemIndex] = poolItem;

    // Write updated pool
    await writeJSON(GCS_BUCKETS.APPOINTMENTS, 'appointment-pool/pool.json', pool);
    await writeJSON(GCS_BUCKETS.APPOINTMENTS, `appointment-pool/items/${poolId}.json`, poolItem);

    // Update original appointment
    const assignedDoctorId = poolItem.adminAssignedDoctorId || poolItem.claimedByDoctorId;
    const assignedDoctorName = poolItem.adminAssignedDoctorName || poolItem.claimedByDoctorName;

    await updateOriginalAppointment(poolItem.appointmentId, {
      doctorId: assignedDoctorId,
      doctorName: assignedDoctorName,
      appointmentDate: poolItem.assignedDate,
      appointmentTime: poolItem.assignedTime,
      status: 'confirmed',
      poolId: poolId
    });

    res.json({
      success: true,
      poolItem,
      message: 'Assignment approved successfully'
    });
  } catch (error: unknown) {
    console.error('Approve assignment error:', error);
    res.status(500).json({ error: errMsg(error) });
  }
});

/**
 * AI-assisted doctor matching
 */
router.post('/:poolId/ai-match', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { poolId } = req.params;

    // Read pool
    let pool = await readJSON(GCS_BUCKETS.APPOINTMENTS, 'appointment-pool/pool.json') || [];
    const itemIndex = pool.findIndex((item: AppointmentPoolItem) => item.id === poolId);

    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Pool item not found' });
    }

    const poolItem = pool[itemIndex];

    // Get available doctors matching the specialties
    const doctors = await readJSON(GCS_BUCKETS.METADATA, 'doctors.json') || [];
    
    // Filter doctors by matching specialties and availability
    const matchingDoctors = doctors.filter((doc: any) => {
      const hasMatchingSpecialty = poolItem.matchedSpecialties.some(
        (specialty: string) => doc.specialty?.toLowerCase().includes(specialty.toLowerCase()) ||
          specialty.toLowerCase().includes(doc.specialty?.toLowerCase())
      );
      return hasMatchingSpecialty && doc.isActive !== false;
    });

    if (matchingDoctors.length === 0) {
      return res.json({
        success: false,
        message: 'No matching doctors available. Admin assignment required.',
        poolItem
      });
    }

    // Select best match (in real implementation, check availability)
    const bestMatch = matchingDoctors[0];

    // Update pool item with AI match
    poolItem.aiMatchedDoctorId = bestMatch.id;
    poolItem.aiMatchedDoctorName = bestMatch.name;
    poolItem.aiMatchReason = `Matched based on specialty: ${bestMatch.specialty}. Patient symptoms: ${poolItem.symptoms.join(', ')}`;
    poolItem.poolStatus = 'ai_matched';
    poolItem.updatedAt = new Date().toISOString();

    pool[itemIndex] = poolItem;

    // Write updated pool
    await writeJSON(GCS_BUCKETS.APPOINTMENTS, 'appointment-pool/pool.json', pool);
    await writeJSON(GCS_BUCKETS.APPOINTMENTS, `appointment-pool/items/${poolId}.json`, poolItem);

    res.json({
      success: true,
      poolItem,
      matchedDoctor: bestMatch,
      message: 'AI matching completed. Doctor can confirm or appointment remains in pool.'
    });
  } catch (error: unknown) {
    console.error('AI match error:', error);
    res.status(500).json({ error: errMsg(error) });
  }
});

/**
 * Check meeting time window
 */
router.get('/meeting-check/:appointmentId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;

    // Read appointment
    const appointments = await readJSON(GCS_BUCKETS.APPOINTMENTS, 'appointments.json') || [];
    const appointment = appointments.find((apt: any) => apt.id === appointmentId);

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const meetingCheck = isWithinMeetingWindow(
      appointment.appointmentDate,
      appointment.appointmentTime,
      DEFAULT_MEETING_RULES
    );

    res.json({
      appointmentId,
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime,
      ...meetingCheck,
      rules: DEFAULT_MEETING_RULES
    });
  } catch (error: unknown) {
    console.error('Meeting check error:', error);
    res.status(500).json({ error: errMsg(error) });
  }
});

/**
 * Handle missed meeting - auto reschedule
 */
router.post('/missed-meeting/:appointmentId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const { missedBy } = req.body; // 'patient' or 'doctor'

    // Read appointments
    let appointments = await readJSON(GCS_BUCKETS.APPOINTMENTS, 'appointments.json') || [];
    const aptIndex = appointments.findIndex((apt: any) => apt.id === appointmentId);

    if (aptIndex === -1) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const appointment = appointments[aptIndex];

    // Check if already in pool
    let pool = await readJSON(GCS_BUCKETS.APPOINTMENTS, 'appointment-pool/pool.json') || [];
    const existingPoolItem = pool.find((item: AppointmentPoolItem) => item.appointmentId === appointmentId);

    if (existingPoolItem) {
      // Increment missed count
      existingPoolItem.missedCount += 1;
      
      if (existingPoolItem.missedCount >= existingPoolItem.maxMissedAttempts) {
        existingPoolItem.poolStatus = 'expired';
        appointment.status = 'cancelled';
        appointment.cancellationReason = 'Maximum missed attempts exceeded';
      } else {
        // Reschedule to next week
        const nextSlot = getNextWeekSameTime(
          existingPoolItem.assignedDate || appointment.appointmentDate,
          existingPoolItem.assignedTime || appointment.appointmentTime
        );
        existingPoolItem.assignedDate = nextSlot.date;
        existingPoolItem.assignedTime = nextSlot.time;
        existingPoolItem.poolStatus = 'admin_pending_approval';
        existingPoolItem.adminApprovalRequired = true;
      }

      existingPoolItem.updatedAt = new Date().toISOString();

      // Update pool
      const poolIndex = pool.findIndex((item: AppointmentPoolItem) => item.id === existingPoolItem.id);
      pool[poolIndex] = existingPoolItem;
      await writeJSON(GCS_BUCKETS.APPOINTMENTS, 'appointment-pool/pool.json', pool);
      await writeJSON(GCS_BUCKETS.APPOINTMENTS, `appointment-pool/items/${existingPoolItem.id}.json`, existingPoolItem);
    } else {
      // Create new pool item for missed meeting
      const nextSlot = getNextWeekSameTime(appointment.appointmentDate, appointment.appointmentTime);
      
      const poolId = `pool_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      const newPoolItem: AppointmentPoolItem = {
        id: poolId,
        appointmentId,
        patientId: appointment.patientId,
        patientName: appointment.patientName,
        patientEmail: appointment.patientEmail,
        originalDoctorId: appointment.doctorId,
        originalDoctorName: appointment.doctorName,
        requiredSpecialty: appointment.doctorSpecialty,
        matchedSpecialties: [appointment.doctorSpecialty],
        symptoms: appointment.symptoms || [],
        urgency: appointment.urgency || 'normal',
        preferredDates: [nextSlot.date],
        preferredTimeSlot: getTimeSlot(nextSlot.time),
        appointmentType: appointment.type,
        poolReason: 'meeting_missed',
        poolStatus: 'admin_pending_approval',
        adminApprovalRequired: true,
        missedCount: 1,
        maxMissedAttempts: DEFAULT_MEETING_RULES.maxMissedAttempts,
        originalAppointmentDate: appointment.appointmentDate,
        originalAppointmentTime: appointment.appointmentTime,
        assignedDate: nextSlot.date,
        assignedTime: nextSlot.time,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      pool.push(newPoolItem);
      await writeJSON(GCS_BUCKETS.APPOINTMENTS, 'appointment-pool/pool.json', pool);
      await writeJSON(GCS_BUCKETS.APPOINTMENTS, `appointment-pool/items/${poolId}.json`, newPoolItem);
    }

    // Update appointment status
    appointment.status = 'no_show';
    appointment.missedBy = missedBy;
    appointment.updatedAt = new Date().toISOString();
    appointments[aptIndex] = appointment;
    await writeJSON(GCS_BUCKETS.APPOINTMENTS, 'appointments.json', appointments);

    res.json({
      success: true,
      message: 'Meeting marked as missed. Auto-rescheduled to next week pending admin approval.',
      rescheduled: true
    });
  } catch (error: unknown) {
    console.error('Missed meeting error:', error);
    res.status(500).json({ error: errMsg(error) });
  }
});

// Helper function to determine time slot
function getTimeSlot(time: string): 'morning' | 'afternoon' | 'evening' {
  const hour = Number.parseInt(time.split(':')[0], 10);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

// Helper function to update original appointment
async function updateOriginalAppointment(appointmentId: string, updates: any): Promise<void> {
  try {
    let appointments = await readJSON(GCS_BUCKETS.APPOINTMENTS, 'appointments.json') || [];
    const aptIndex = appointments.findIndex((apt: any) => apt.id === appointmentId);

    if (aptIndex !== -1) {
      appointments[aptIndex] = {
        ...appointments[aptIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      await writeJSON(GCS_BUCKETS.APPOINTMENTS, 'appointments.json', appointments);

      // Also update individual appointment file
      await writeJSON(
        GCS_BUCKETS.APPOINTMENTS,
        `appointments/${appointmentId}/details.json`,
        appointments[aptIndex]
      );
    }
  } catch (error) {
    console.error('Error updating original appointment:', error);
  }
}

/**
 * Get meeting time rules
 */
router.get('/meeting-rules', authMiddleware, async (req: Request, res: Response) => {
  try {
    const rules = await readJSON(GCS_BUCKETS.METADATA, 'meeting-rules.json') || DEFAULT_MEETING_RULES;
    res.json(rules);
  } catch (error: unknown) {
    console.error('Get meeting rules error:', error);
    res.json(DEFAULT_MEETING_RULES);
  }
});

/**
 * Update meeting time rules (admin only)
 */
router.put('/meeting-rules', authMiddleware, async (req: Request, res: Response) => {
  try {
    const newRules = { ...DEFAULT_MEETING_RULES, ...req.body };
    await writeJSON(GCS_BUCKETS.METADATA, 'meeting-rules.json', newRules);
    res.json({ success: true, rules: newRules });
  } catch (error: unknown) {
    console.error('Update meeting rules error:', error);
    res.status(500).json({ error: errMsg(error) });
  }
});

export default router;
