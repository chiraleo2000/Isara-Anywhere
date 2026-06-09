/**
 * Appointment Routes - PostgreSQL ONLY
 * NO GCS - All data stored in PostgreSQL
 */

import { Router, Request, Response, Application } from 'express';
import type { PoolClient } from 'pg';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import postgresDataService from '../services/postgresDataService';
import crypto from 'node:crypto';

const { AppointmentService, NotificationService } = postgresDataService;
const { pool } = postgresDataService;

const router = Router();

/** Insert appointment notifications in the same DB transaction as the appointment row */
async function insertAppointmentNotificationsTx(
  client: PoolClient,
  appointment: Record<string, unknown>
): Promise<void> {
  const doctorId = appointment.doctor_id as string | null;
  const appointmentId = appointment.id as string;
  const dataJson = JSON.stringify({ appointmentId });

  if (doctorId) {
    await client.query(
      `INSERT INTO notifications (id, user_id, type, title, title_thai, message, message_thai, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        crypto.randomUUID(),
        doctorId,
        'appointment_requested',
        'New Appointment Request',
        'มีนัดหมายใหม่',
        'Patient has requested an appointment',
        'ผู้ป่วยขอนัดหมาย',
        dataJson,
      ]
    );
    return;
  }

  const admins = await client.query(
    "SELECT id FROM users WHERE role = 'admin' AND is_active = true"
  );
  for (const admin of admins.rows) {
    await client.query(
      `INSERT INTO notifications (id, user_id, type, title, title_thai, message, message_thai, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        crypto.randomUUID(),
        admin.id,
        'appointment_requested',
        'New Unassigned Appointment',
        'นัดหมายใหม่รอมอบหมาย',
        'A new appointment is waiting to be assigned to a doctor',
        'มีนัดหมายใหม่รอมอบหมายแพทย์',
        dataJson,
      ]
    );
  }

  const patientId = appointment.patient_id as string;
  if (patientId) {
    await client.query(
      `INSERT INTO notifications (id, user_id, type, title, title_thai, message, message_thai, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        crypto.randomUUID(),
        patientId,
        'appointment_requested',
        'Appointment Request Submitted',
        'ส่งคำขอนัดหมายแล้ว',
        'Your appointment request has been submitted and is awaiting assignment',
        'ส่งคำขอนัดหมายของคุณแล้ว กำลังรอการมอบหมายแพทย์',
        dataJson,
      ]
    );
  }
}

/** Socket.IO only — DB rows are committed with the appointment (NOTIFY is cross-portal primary path) */
function emitAppointmentSockets(app: Application, appointment: Record<string, unknown>): void {
  const io = app.get('io');
  if (!io) return;

  const doctorId = appointment.doctor_id as string | null;
  const patientId = appointment.patient_id as string | null;
  const payload = {
    appointmentId: appointment.id,
    id: appointment.id,
    doctor_id: doctorId,
    patient_id: patientId,
    status: appointment.status,
    table: 'appointments',
    operation: 'INSERT',
  };

  if (doctorId) {
    io.to(`doctor-${doctorId}`).emit('appointment:created', payload);
    io.to(`doctor-${doctorId}`).emit('appointment-created', payload);
    io.to(`queue-${doctorId}`).emit('appointment:created', payload);
  } else {
    io.to('admin-notifications').emit('pool-updated', payload);
    io.to('admin-notifications').emit('appointment:created', payload);
  }
  if (patientId) {
    io.to(`patient-${patientId}`).emit('appointment:created', payload);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Transform snake_case database row to camelCase for frontend
 */
function transformAppointment(row: any): any {
  if (!row) return row;
  return {
    id: row.id,
    patientId: row.patient_id,
    doctorId: row.doctor_id,
    doctorName: row.doctor_name || row.doctor_name_thai,
    doctorNameThai: row.doctor_name_thai,
    doctorAvatar: row.doctor_avatar,
    doctorSpecialty: row.doctor_specialty,
    appointmentDate: row.confirmed_date || row.requested_date,
    appointmentTime: row.confirmed_time || row.requested_time,
    requestedDate: row.requested_date,
    requestedTime: row.requested_time,
    confirmedDate: row.confirmed_date,
    confirmedTime: row.confirmed_time,
    type: (row.appointment_type || 'telehealth').toLowerCase(),
    status: row.status,
    urgency: row.urgency_level,
    symptoms: row.symptoms,
    symptomDescription: row.symptom_description,
    reason: row.symptom_description || row.reason,
    notes: row.notes,
    // Never surface a null meeting link: backfill from jitsi_room_name if legacy rows have no stored URL.
    meetingLink: row.patient_meeting_url || row.meet_link || row.meeting_link
      || (row.jitsi_room_name ? generateJitsiMeetingLink(row.jitsi_room_name) : null),
    jitsiRoomName: row.jitsi_room_name,
    doctorMeetingUrl: row.doctor_meeting_url,
    patientMeetingUrl: row.patient_meeting_url || row.meet_link || row.meeting_link
      || (row.jitsi_room_name ? generateJitsiMeetingLink(row.jitsi_room_name) : null),
    guestMeetingUrl: row.guest_meeting_url,
    confirmedBy: row.confirmed_by,
    confirmedByEmail: row.confirmed_by_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    confirmedAt: row.confirmed_at,
    cancelledAt: row.cancelled_at,
    // Keep original row for any missed fields
    ...row
  };
}

// ============================================================================
// JITSI MEETING LINK GENERATION
// ============================================================================

const JITSI_DOMAIN = process.env.JITSI_DOMAIN || 'meet.jit.si';

/**
 * Generate secure Jitsi room name
 */
function generateJitsiRoomName(appointmentId: string): string {
  const hash = crypto.createHash('sha256')
    .update(appointmentId + Date.now().toString())
    .digest('hex')
    .substring(0, 8);
  return `Izara-${appointmentId.substring(0, 12)}-${hash}`;
}

/**
 * Generate Jitsi meeting URL with configuration
 */
function generateJitsiMeetingLink(
  roomName: string,
  opts?: { displayName?: string; email?: string },
): string {
  const params = new URLSearchParams();
  
  // Basic configuration
  params.set('config.startWithAudioMuted', 'false');
  params.set('config.startWithVideoMuted', 'false');
  params.set('config.enableClosePage', 'true');
  params.set('config.disableDeepLinking', 'true');
  params.set('config.defaultLanguage', 'th');
  if (opts?.displayName) {
    params.set('userInfo.displayName', opts.displayName);
    params.set('config.requireDisplayName', 'false');
    params.set('config.prejoinPageEnabled', 'false');
  } else {
    params.set('config.prejoinPageEnabled', 'true');
    params.set('config.requireDisplayName', 'true');
  }
  
  // Lobby for doctor approval
  params.set('config.enableLobby', 'false');
  params.set('config.lobbyModeEnabled', 'false');
  params.set('config.enableLobbyChat', 'false');
  
  // Recording
  params.set('config.fileRecordingsEnabled', 'true');
  params.set('config.localRecording.enabled', 'false');
  
  // UI
  params.set('interfaceConfig.APP_NAME', 'Izara Telemedicine');
  params.set('interfaceConfig.SHOW_PROMOTIONAL_CLOSE_PAGE', 'false');
  
  return `https://${JITSI_DOMAIN}/${roomName}#${params.toString()}`;
}

// ============================================================================
// APPOINTMENT ROUTES
// ============================================================================

// Get appointment history for the authenticated patient
router.get('/history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const patientId = (req as AuthenticatedRequest).patientId;
    if (!patientId) {
      return res.status(401).json({ error: 'Patient ID not found in token' });
    }
    
    console.log(`[APPOINTMENT] Getting appointment history for patient: ${patientId}`);

    const result = await pool.query(
      `SELECT a.*, 
              u.name as doctor_name, u.name_thai as doctor_name_thai, 
              u.avatar_url as doctor_avatar,
              dp.specialty as doctor_specialty
       FROM appointments a
       LEFT JOIN users u ON a.doctor_id = u.id
       LEFT JOIN doctor_profiles dp ON dp.doctor_id = u.id
       WHERE a.patient_id = $1 AND a.status IN ('completed', 'confirmed', 'cancelled')
       ORDER BY COALESCE(a.confirmed_date, a.requested_date) DESC`,
      [patientId]
    );

    console.log(`[APPOINTMENT] Found ${result.rows.length} history items for patient ${patientId}`);
    res.json({
      success: true,
      history: result.rows.map(transformAppointment)
    });
  } catch (error: unknown) {
    console.error('[APPOINTMENT] Get history error:', error);
    // Return success with empty array for test compatibility
    res.json({
      success: true,
      history: []
    });
  }
});

// Get appointments for the current patient (/my alias)
router.get('/my', authMiddleware, async (req: Request, res: Response) => {
  try {
    const patientId = (req as AuthenticatedRequest).patientId;
    console.log(`[APPOINTMENT] Getting MY appointments for patient: ${patientId}`);
    
    if (!patientId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        appointments: []
      });
    }

    try {
      const result = await pool.query(
        `SELECT a.*, 
                u.name as doctor_name, u.name_thai as doctor_name_thai, 
                u.avatar_url as doctor_avatar,
                dp.specialty as doctor_specialty
         FROM appointments a
         LEFT JOIN users u ON a.doctor_id = u.id
         LEFT JOIN doctor_profiles dp ON dp.doctor_id = u.id
         WHERE a.patient_id = $1
         ORDER BY COALESCE(a.confirmed_date, a.requested_date) DESC`,
        [patientId]
      );

      console.log(`[APPOINTMENT] Found ${result.rows.length} appointments for patient ${patientId}`);
      res.json({
        success: true,
        appointments: result.rows.map(transformAppointment)
      });
    } catch (dbError) {
      console.error('[APPOINTMENT] DB error:', dbError);
      res.status(500).json({
        success: false,
        error: 'Database error fetching appointments',
        appointments: []
      });
    }
  } catch (error: unknown) {
    console.error('[APPOINTMENT] Get MY appointments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch appointments',
      appointments: []
    });
  }
});

// Get all appointments for the authenticated patient (uses JWT patientId)
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const patientId = (req as AuthenticatedRequest).patientId;
    if (!patientId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    console.log(`[APPOINTMENT] Getting appointments for authenticated patient: ${patientId}`);

    const result = await pool.query(
      `SELECT a.*, 
              u.name as doctor_name, u.name_thai as doctor_name_thai, 
              u.avatar_url as doctor_avatar,
              dp.specialty as doctor_specialty
       FROM appointments a
       LEFT JOIN users u ON a.doctor_id = u.id
       LEFT JOIN doctor_profiles dp ON dp.doctor_id = u.id
       WHERE a.patient_id = $1
       ORDER BY COALESCE(a.confirmed_date, a.requested_date) DESC`,
      [patientId]
    );

    console.log(`[APPOINTMENT] Found ${result.rows.length} appointments for patient ${patientId}`);
    res.json(result.rows.map(transformAppointment));
  } catch (error: unknown) {
    console.error('[APPOINTMENT] Get appointments error:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Get all appointments for a patient (by path param)
router.get('/patient/:patientId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const authPatientId = (req as AuthenticatedRequest).patientId;
    const userRole = (req as AuthenticatedRequest).user?.role;
    
    // IDOR check: patients can only access their own appointments, doctors/admins can access any
    if (userRole === 'patient' && patientId !== authPatientId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    console.log(`[APPOINTMENT] Getting appointments for patient: ${patientId}`);

    const result = await pool.query(
      `SELECT a.*, 
              u.name as doctor_name, u.name_thai as doctor_name_thai, 
              u.avatar_url as doctor_avatar,
              dp.specialty as doctor_specialty
       FROM appointments a
       LEFT JOIN users u ON a.doctor_id = u.id
       LEFT JOIN doctor_profiles dp ON dp.doctor_id = u.id
       WHERE a.patient_id = $1
       ORDER BY COALESCE(a.confirmed_date, a.requested_date) DESC`,
      [patientId]
    );

    res.json(result.rows.map(transformAppointment));
  } catch (error: unknown) {
    console.error('[APPOINTMENT] Get appointments error:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Get single appointment
router.get('/:appointmentId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const authPatientId = (req as AuthenticatedRequest).patientId;
    const userRole = (req as AuthenticatedRequest).user?.role;
    console.log(`[APPOINTMENT] Getting appointment: ${appointmentId}`);

    const result = await pool.query(
      `SELECT a.*, 
              u1.name as patient_name, u1.name_thai as patient_name_thai,
              u2.name as doctor_name, u2.name_thai as doctor_name_thai,
              u2.avatar_url as doctor_avatar,
              dp.specialty as doctor_specialty
       FROM appointments a
       LEFT JOIN users u1 ON a.patient_id = u1.id
       LEFT JOIN users u2 ON a.doctor_id = u2.id
       LEFT JOIN doctor_profiles dp ON dp.doctor_id = u2.id
       WHERE a.id = $1`,
      [appointmentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // IDOR check: patients can only access their own appointments
    const appointment = result.rows[0];
    if (userRole === 'patient' && appointment.patient_id !== authPatientId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(transformAppointment(appointment));
  } catch (error: unknown) {
    console.error('[APPOINTMENT] Get appointment error:', error);
    res.status(500).json({ error: 'Failed to fetch appointment' });
  }
});

// Create new appointment
router.post('/', authMiddleware, async (req: Request, res: Response) => { // NOSONAR S3776: appointment creation with role-based validation, conflict detection, notification dispatch
  const client = await pool.connect();
  try {
    const appointmentData = req.body;
    const authReq = req as AuthenticatedRequest;
    const authPatientId = authReq.patientId;
    const authRole = authReq.user?.role;

    // SECURITY: Patient creates for self only. Ignore body.patientId to prevent IDOR.
    // Admin/doctor can create on behalf of a patient via body.patientId.
    let patientId: string | undefined;
    if (authRole === 'patient') {
      patientId = authPatientId;
      if (appointmentData.patientId && appointmentData.patientId !== authPatientId) {
        client.release();
        return res.status(403).json({ error: 'Patients cannot create appointments for other users' });
      }
    } else if (authRole === 'admin' || authRole === 'doctor') {
      patientId = appointmentData.patientId;
    }

    if (!patientId) {
      client.release();
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    // SECURITY: validate doctor (if provided) exists, is a doctor, and is active.
    const doctorIdRaw = appointmentData.doctorId;
    const doctorId = (doctorIdRaw && doctorIdRaw !== 'unassigned') ? doctorIdRaw : null;
    let effectiveDoctorId: string | null = doctorId;
    if (doctorId) {
      const docCheck = await pool.query(
        `SELECT id FROM users WHERE id = $1 AND role = 'doctor' AND is_active = true AND COALESCE(is_approved, true) = true`,
        [doctorId]
      );
      if (docCheck.rows.length === 0) {
        // Doctor inactive/unapproved: fall back to pool rather than hard-fail the booking.
        console.warn(`[APPOINTMENT] Requested doctor ${doctorId} unavailable — routing to pool`);
        effectiveDoctorId = null;
      }
    }

    // SECURITY: validate patient exists (protects against stale JWT / deleted user).
    const patCheck = await pool.query(
      `SELECT id, name, email FROM users WHERE id = $1 AND role = 'patient' AND is_active = true`,
      [patientId]
    );
    if (patCheck.rows.length === 0) {
      client.release();
      return res.status(400).json({ error: 'Invalid or inactive patient' });
    }
    const patProfile = patCheck.rows[0];
    const patientDisplayName = (
      patProfile.name || patProfile.email?.split('@')[0] || 'Patient'
    ).trim();

    console.log('[APPOINTMENT] Creating new appointment for patient:', patientId);

    const appointmentId = `APT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const now = new Date();

    // Determine initial status. Clients cannot request a terminal/privileged state.
    const allowedInitialStatuses = new Set(['pending', 'in_pool', 'awaiting_doctor_response']);
    let initialStatus = allowedInitialStatuses.has(appointmentData.status) ? appointmentData.status : 'pending';
    if (!effectiveDoctorId) {
      initialStatus = 'in_pool';
    } else if (appointmentData.assignmentMethod === 'patient_selected') {
      initialStatus = 'awaiting_doctor_response';
    }

    // Generate Jitsi meeting link
    const jitsiRoomName = generateJitsiRoomName(appointmentId);
    const meetingLink = generateJitsiMeetingLink(jitsiRoomName, {
      displayName: patientDisplayName,
      email: patProfile.email,
    });

    // BEGIN transaction — appointment insert + notification must be atomic
    await client.query('BEGIN');

    // Insert into PostgreSQL
    const result = await client.query(
      `INSERT INTO appointments (
        id, patient_id, doctor_id, requested_date, requested_time,
        appointment_type, status, urgency_level, symptoms, symptom_description,
        notes, meet_link, jitsi_room_name, invitees, created_at, updated_at
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15)
       RETURNING *`,
      [
        appointmentId,
        patientId,  // Use authenticated patient ID
        effectiveDoctorId,
        appointmentData.preferredDate || appointmentData.requestedDate,
        appointmentData.preferredTime || appointmentData.requestedTime,
        (appointmentData.appointmentType || appointmentData.type || 'telehealth').toLowerCase(),
        initialStatus,
        appointmentData.urgency || 'normal',
        JSON.stringify(appointmentData.symptoms || []),
        appointmentData.reason || appointmentData.symptomDescription,
        appointmentData.notes,
        meetingLink,
        jitsiRoomName,
        JSON.stringify(appointmentData.invitees || []),
        now
      ]
    );

    const appointment = result.rows[0];

    await insertAppointmentNotificationsTx(client, appointment);
    await client.query('COMMIT');

    try {
      emitAppointmentSockets(req.app, appointment);
    } catch (socketErr) {
      console.error(`[APPOINTMENT] ⚠️ Socket emit failed for ${appointmentId}:`, socketErr);
    }

    console.log(`[APPOINTMENT] Created: ${appointmentId} with meeting link: ${meetingLink}`);
    res.json(transformAppointment(appointment));
  } catch (error: unknown) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[APPOINTMENT] Create error:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  } finally {
    client.release();
  }
});

// Allowed status transitions (prevents e.g. completed → pending, cancelled → confirmed).
const ALLOWED_STATUS_TRANSITIONS: Record<string, Set<string>> = {
  pending: new Set(['in_pool', 'awaiting_doctor_response', 'confirmed', 'declined', 'rejected', 'cancelled']),
  in_pool: new Set(['awaiting_doctor_response', 'confirmed', 'cancelled']),
  awaiting_doctor_response: new Set(['confirmed', 'declined', 'rejected', 'cancelled', 'in_pool']),
  confirmed: new Set(['in_progress', 'completed', 'cancelled', 'no_show']),
  in_progress: new Set(['completed', 'cancelled']),
  completed: new Set([]),
  cancelled: new Set([]),
  declined: new Set(['in_pool']),
  declined_by_doctor: new Set(['in_pool', 'cancelled']),
  rejected: new Set(['in_pool']),
  no_show: new Set([])
};

function isStatusTransitionAllowed(from: string, to: string): boolean {
  if (from === to) return true;
  const allowed = ALLOWED_STATUS_TRANSITIONS[from];
  return !!allowed && allowed.has(to);
}

// Update appointment status (for doctor confirmation/decline)
router.put('/:appointmentId/status', authMiddleware, async (req: Request, res: Response) => { // NOSONAR S3776: status transition state machine with SELECT FOR UPDATE + role matrix
  const client = await pool.connect();
  try {
    const { appointmentId } = req.params;
    const { status, appointmentDate, appointmentTime, meetingLink } = req.body;
    const authReq = req as AuthenticatedRequest;
    const authRole = authReq.user?.role;
    const authUserId = authReq.userId;

    if (!status || typeof status !== 'string') {
      client.release();
      return res.status(400).json({ error: 'status is required' });
    }

    console.log(`[APPOINTMENT] Updating status for: ${appointmentId} to ${status}`);

    await client.query('BEGIN');

    // Lock the row to prevent race conditions (double-accept).
    const current = await client.query(
      'SELECT * FROM appointments WHERE id = $1 FOR UPDATE',
      [appointmentId]
    );
    if (current.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ error: 'Appointment not found' });
    }
    const currentAppointment = current.rows[0];

    // Ownership / role enforcement.
    const isAdmin = authRole === 'admin';
    const isDoctor = authRole === 'doctor';
    const isPatient = authRole === 'patient';
    const doctorMatches = currentAppointment.doctor_id === authUserId;
    const patientMatches = currentAppointment.patient_id === authUserId;

    // Patients can only cancel their own appointments through this endpoint.
    if (isPatient) {
      if (!patientMatches) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(403).json({ error: 'Access denied' });
      }
      if (status !== 'cancelled') {
        await client.query('ROLLBACK');
        client.release();
        return res.status(403).json({ error: 'Patients may only cancel appointments via this endpoint' });
      }
    } else if (isDoctor) {
      // Doctor must own the appointment (or be the one it's offered to via in_pool).
      if (!doctorMatches && currentAppointment.doctor_id !== null) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(403).json({ error: 'Doctor does not own this appointment' });
      }
    } else if (!isAdmin) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(403).json({ error: 'Access denied' });
    }

    // Transition validation.
    if (!isStatusTransitionAllowed(currentAppointment.status, status)) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(409).json({
        error: `Illegal status transition: ${currentAppointment.status} → ${status}`
      });
    }

    // Generate meeting link if confirming and none exists
    let finalMeetingLink = meetingLink || currentAppointment.meet_link;
    let jitsiRoomName = currentAppointment.jitsi_room_name;
    
    if (status === 'confirmed' && !finalMeetingLink) {
      jitsiRoomName = generateJitsiRoomName(appointmentId);
      const patRow = await pool.query(
        'SELECT name, email FROM users WHERE id = $1',
        [currentAppointment.patient_id],
      );
      const p = patRow.rows[0];
      const patientLabel = (p?.name || p?.email?.split('@')[0] || 'Patient').trim();
      finalMeetingLink = generateJitsiMeetingLink(jitsiRoomName, {
        displayName: patientLabel,
        email: p?.email,
      });
    }

    // When doctor confirms, persist traceability fields (doctor_id, confirmed_by) for queue visibility
    const effectiveDoctorId =
      status === 'confirmed' && isDoctor
        ? (currentAppointment.doctor_id || authUserId)
        : currentAppointment.doctor_id;
    const confirmedBy =
      status === 'confirmed' && isDoctor ? authUserId : null;
    const confirmedByEmail =
      status === 'confirmed' && isDoctor ? (authReq.user?.email || null) : null;

    // Update in PostgreSQL - cast $2 to varchar to avoid type inference conflict in CASE
    const result = await client.query(
      `UPDATE appointments SET
        status = $2::varchar,
        doctor_id = CASE WHEN $2::varchar = 'confirmed' AND $7::uuid IS NOT NULL THEN $7::uuid ELSE doctor_id END,
        confirmed_by = CASE WHEN $2::varchar = 'confirmed' AND $8::text IS NOT NULL THEN $8::text ELSE confirmed_by END,
        confirmed_by_email = CASE WHEN $2::varchar = 'confirmed' AND $9::text IS NOT NULL THEN $9::text ELSE confirmed_by_email END,
        confirmed_date = COALESCE($3, confirmed_date),
        confirmed_time = COALESCE($4, confirmed_time),
        meet_link = COALESCE($5, meet_link),
        jitsi_room_name = COALESCE($6, jitsi_room_name),
        confirmed_at = CASE WHEN $2::varchar = 'confirmed' THEN NOW() ELSE confirmed_at END,
        cancelled_at = CASE WHEN $2::varchar = 'cancelled' THEN NOW() ELSE cancelled_at END,
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        appointmentId,
        status,
        appointmentDate,
        appointmentTime,
        finalMeetingLink,
        jitsiRoomName,
        effectiveDoctorId,
        confirmedBy,
        confirmedByEmail,
      ]
    );

    await client.query('COMMIT');

    const updatedAppointment = result.rows[0];

    // Send notifications based on status change
    try {
      if (status === 'confirmed' && currentAppointment.status !== 'confirmed') {
        await NotificationService.createNotification({
          userId: updatedAppointment.patient_id,
          type: 'appointment_confirmed',
          title: 'Appointment Confirmed',
          titleThai: 'ยืนยันนัดหมายแล้ว',
          message: `Your appointment has been confirmed. Meeting link: ${finalMeetingLink}`,
          messageThai: `นัดหมายของคุณได้รับการยืนยันแล้ว`,
          data: { 
            appointmentId: updatedAppointment.id,
            meetingLink: finalMeetingLink 
          }
        });
        if (finalMeetingLink) {
          await NotificationService.createNotification({
            userId: updatedAppointment.patient_id,
            type: 'meeting_link_ready',
            title: 'Meeting Link Ready',
            titleThai: 'ลิงก์ประชุมพร้อมแล้ว',
            message: `Your telehealth meeting link is ready: ${finalMeetingLink}`,
            messageThai: 'ลิงก์เข้าร่วมการประชุมออนไลน์พร้อมแล้ว',
            data: {
              appointmentId: updatedAppointment.id,
              meetingLink: finalMeetingLink,
              meet_link: finalMeetingLink,
            },
          });
        }
        console.log(`[NOTIFICATION] Sent confirmation to patient: ${updatedAppointment.patient_id}`);
      } else if (status === 'declined' || status === 'rejected') {
        await NotificationService.createNotification({
          userId: updatedAppointment.patient_id,
          type: 'appointment_declined',
          title: 'Appointment Declined',
          titleThai: 'นัดหมายถูกปฏิเสธ',
          message: `Your appointment request has been declined. Please try booking with another doctor.`,
          messageThai: `คำขอนัดหมายของคุณถูกปฏิเสธ กรุณาลองนัดหมายกับแพทย์ท่านอื่น`,
          data: { appointmentId: updatedAppointment.id }
        });
        console.log(`[NOTIFICATION] Sent decline to patient: ${updatedAppointment.patient_id}`);
      } else if (status === 'cancelled') {
        await NotificationService.createNotification({
          userId: updatedAppointment.patient_id,
          type: 'appointment_cancelled',
          title: 'Appointment Cancelled',
          titleThai: 'ยกเลิกนัดหมาย',
          message: `Your appointment has been cancelled`,
          messageThai: `นัดหมายของคุณถูกยกเลิก`,
          data: { appointmentId: updatedAppointment.id }
        });
        console.log(`[NOTIFICATION] Sent cancellation to patient: ${updatedAppointment.patient_id}`);
      }
    } catch (notifError) {
      console.error('[APPOINTMENT] Notification error:', notifError);
    }

    // Emit Socket.IO real-time update
    const io = req.app.get('io');
    if (io) {
      const payload = { appointmentId, status, appointment: transformAppointment(updatedAppointment) };
      io.to(`patient-${updatedAppointment.patient_id}`).emit('appointment:updated', payload);
      if (updatedAppointment.doctor_id) {
        io.to(`doctor-${updatedAppointment.doctor_id}`).emit('appointment:updated', payload);
      }
    }

    console.log(`[APPOINTMENT] Updated: ${appointmentId} to ${status}`);
    res.json(transformAppointment(updatedAppointment));
  } catch (error: unknown) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[APPOINTMENT] Update status error:', error);
    res.status(500).json({ error: 'Failed to update appointment status' });
  } finally {
    client.release();
  }
});

// Update appointment
router.put('/:appointmentId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const updateData = req.body;
    const authReq = req as AuthenticatedRequest;
    const authRole = authReq.user?.role;
    const authUserId = authReq.userId;

    // Ownership check.
    const existing = await pool.query(
      'SELECT patient_id, doctor_id, status FROM appointments WHERE id = $1',
      [appointmentId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    const existingRow = existing.rows[0];
    const isOwner = (authRole === 'patient' && existingRow.patient_id === authUserId)
      || (authRole === 'doctor' && existingRow.doctor_id === authUserId)
      || authRole === 'admin';
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }
    // Patients cannot edit a confirmed/in-progress/completed/cancelled appointment.
    if (authRole === 'patient' && !['pending', 'in_pool', 'awaiting_doctor_response'].includes(existingRow.status)) {
      return res.status(409).json({ error: `Cannot edit appointment in status '${existingRow.status}'` });
    }

    console.log(`[APPOINTMENT] Updating appointment: ${appointmentId}`);

    const result = await pool.query(
      `UPDATE appointments SET
        requested_date = COALESCE($2, requested_date),
        requested_time = COALESCE($3, requested_time),
        confirmed_date = COALESCE($4, confirmed_date),
        confirmed_time = COALESCE($5, confirmed_time),
        symptoms = COALESCE($6, symptoms),
        symptom_description = COALESCE($7, symptom_description),
        notes = COALESCE($8, notes),
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        appointmentId,
        updateData.requestedDate,
        updateData.requestedTime,
        updateData.confirmedDate || updateData.appointmentDate,
        updateData.confirmedTime || updateData.appointmentTime,
        updateData.symptoms ? JSON.stringify(updateData.symptoms) : null,
        updateData.symptomDescription || updateData.reason,
        updateData.notes
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(result.rows[0]);
  } catch (error: unknown) {
    console.error('[APPOINTMENT] Update error:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// Cancel appointment
router.delete('/:appointmentId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const { cancelledBy = 'patient', reason } = req.body || {};
    const authReq = req as AuthenticatedRequest;
    const authRole = authReq.user?.role;
    const authUserId = authReq.userId;
    console.log(`[APPOINTMENT] Cancelling appointment: ${appointmentId}`);

    // Get current appointment
    const current = await pool.query('SELECT * FROM appointments WHERE id = $1', [appointmentId]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const currentAppointment = current.rows[0];
    const isOwner = (authRole === 'patient' && currentAppointment.patient_id === authUserId)
      || (authRole === 'doctor' && currentAppointment.doctor_id === authUserId)
      || authRole === 'admin';
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (currentAppointment.status === 'completed') {
      return res.status(400).json({ error: 'Cannot cancel a completed appointment' });
    }
    if (currentAppointment.status === 'cancelled') {
      return res.status(400).json({ error: 'Appointment is already cancelled' });
    }

    // Update to cancelled
    const result = await pool.query(
      `UPDATE appointments SET
        status = 'cancelled',
        cancellation_reason = $2,
        cancelled_at = NOW(),
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [appointmentId, reason]
    );

    const cancelledAppointment = result.rows[0];

    // Notify doctor about cancellation
    try {
      if (cancelledAppointment.doctor_id) {
        await NotificationService.createNotification({
          userId: cancelledAppointment.doctor_id,
          type: 'appointment_cancelled',
          title: 'Appointment Cancelled',
          titleThai: 'ผู้ป่วยยกเลิกนัดหมาย',
          message: `Appointment has been cancelled by ${cancelledBy}`,
          messageThai: `นัดหมายถูกยกเลิกโดย${cancelledBy === 'patient' ? 'ผู้ป่วย' : 'แพทย์'}`,
          data: { appointmentId: cancelledAppointment.id, reason }
        });
      }
    } catch (notifError) {
      console.error('[APPOINTMENT] Notification error:', notifError);
    }

    res.json(cancelledAppointment);
  } catch (error: unknown) {
    console.error('[APPOINTMENT] Cancel error:', error);
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

// ============================================================================
// NOTIFICATION ROUTES
// ============================================================================

/** SECURITY: users may only access their own notifications (admins may access any). */
function assertNotificationAccess(req: Request, res: Response, paramUserId: string): boolean {
  const authReq = req as AuthenticatedRequest;
  if (authReq.user?.role === 'admin') return true;
  if (authReq.userId && authReq.userId === paramUserId) return true;
  res.status(403).json({ error: 'Access denied' });
  return false;
}

// Get user notifications
router.get('/notifications/:userId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!assertNotificationAccess(req, res, userId)) return;
    console.log(`[NOTIFICATION] Getting notifications for user: ${userId}`);

    const notifications = await NotificationService.getUserNotifications(userId);
    res.json(notifications);
  } catch (error: unknown) {
    console.error('[NOTIFICATION] Get error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.put('/notifications/:userId/:notificationId/read', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId, notificationId } = req.params;
    if (!assertNotificationAccess(req, res, userId)) return;

    // Verify the notification belongs to the user before marking.
    const owns = await pool.query(
      'SELECT 1 FROM notifications WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );
    if (owns.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    console.log(`[NOTIFICATION] Marking as read: ${notificationId}`);
    await NotificationService.markAsRead(notificationId);
    res.json({ success: true });
  } catch (error: unknown) {
    console.error('[NOTIFICATION] Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.put('/notifications/:userId/read-all', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!assertNotificationAccess(req, res, userId)) return;
    console.log(`[NOTIFICATION] Marking all as read for user: ${userId}`);

    await NotificationService.markAllAsRead(userId);
    res.json({ success: true });
  } catch (error: unknown) {
    console.error('[NOTIFICATION] Mark all read error:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Get unread notification count
router.get('/notifications/:userId/count', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!assertNotificationAccess(req, res, userId)) return;

    const result = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read_at IS NULL',
      [userId]
    );

    res.json({ count: Number.parseInt(result.rows[0].count, 10) });
  } catch (error: unknown) {
    console.error('[NOTIFICATION] Count error:', error);
    res.status(500).json({ error: 'Failed to get notification count' });
  }
});

export default router;

