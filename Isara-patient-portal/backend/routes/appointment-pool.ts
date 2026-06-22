/**
 * Appointment Pool Service — PostgreSQL source of truth (no GCS mutations).
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { errMsg } from '../utils';
import postgresDataService from '../services/postgresDataService';

const { pool: pgPool } = postgresDataService;

const router = Router();

export interface MeetingTimeRules {
  allowJoinBefore: number;
  allowJoinAfter: number;
  autoRescheduleOnMiss: boolean;
  rescheduleToNextWeek: boolean;
  maxMissedAttempts: number;
}

const DEFAULT_MEETING_RULES: MeetingTimeRules = {
  allowJoinBefore: 15,
  allowJoinAfter: 30,
  autoRescheduleOnMiss: true,
  rescheduleToNextWeek: true,
  maxMissedAttempts: 3,
};

function getNextWeekSameTime(date: string, time: string): { date: string; time: string } {
  const originalDate = new Date(date);
  originalDate.setDate(originalDate.getDate() + 7);
  return {
    date: originalDate.toISOString().split('T')[0],
    time,
  };
}

function isWithinMeetingWindow(
  appointmentDate: string,
  appointmentTime: string,
  rules: MeetingTimeRules = DEFAULT_MEETING_RULES,
): { canJoin: boolean; reason: string; minutesUntilStart?: number; minutesSinceEnd?: number } {
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
      minutesUntilStart,
    };
  }

  if (now > lateWindow) {
    const minutesSinceEnd = Math.ceil((now.getTime() - lateWindow.getTime()) / (60 * 1000));
    return {
      canJoin: false,
      reason: `Meeting window has passed. The allowed join time was ${rules.allowJoinAfter} minutes after the scheduled time.`,
      minutesSinceEnd,
    };
  }

  return { canJoin: true, reason: 'Within meeting window' };
}

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const includeAccepted =
      req.query.includeAccepted !== 'false' && req.query.includeAccepted !== false;

    const urgencyParam = req.query.urgency;
    let urgencyFilter: string | undefined;
    if (typeof urgencyParam === 'string') {
      urgencyFilter = urgencyParam;
    } else if (Array.isArray(urgencyParam) && typeof urgencyParam[0] === 'string') {
      urgencyFilter = urgencyParam[0];
    }

    const statusList = includeAccepted
      ? ['in_pool', 'pending', 'awaiting_doctor_response', 'assigned', 'confirmed']
      : ['in_pool', 'pending', 'awaiting_doctor_response', 'assigned'];

    let query = `SELECT a.*, u.name as patient_name, u.email as patient_email
      FROM appointments a
      LEFT JOIN users u ON a.patient_id = u.id
      WHERE a.status = ANY($1::text[])`;
    const params: unknown[] = [statusList];

    if (includeAccepted) {
      query += ` AND (
        a.status <> 'confirmed'
        OR COALESCE(a.confirmed_at, a.updated_at, a.created_at) >= NOW() - INTERVAL '7 days'
      )`;
    }

    if (urgencyFilter) {
      query += ` AND a.urgency_level = $2`;
      params.push(urgencyFilter);
    }

    query += ` ORDER BY a.created_at ASC`;
    const result = await pgPool.query(query, params);
    res.json(result.rows);
  } catch (error: unknown) {
    console.error('Get pool error:', error);
    res.status(500).json({ error: errMsg(error) });
  }
});

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

router.post('/:poolId/claim', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { poolId } = req.params;
    const { doctorId, doctorName, proposedDate, proposedTime } = req.body;
    const claimDoctorId = doctorId || (req as Request & { user?: { id?: string } }).user?.id;

    const result = await pgPool.query(
      `UPDATE appointments SET
        doctor_id = $2,
        status = 'awaiting_doctor_response',
        requested_date = COALESCE($3, requested_date),
        requested_time = COALESCE($4, requested_time),
        notes = COALESCE(notes, '') || $5,
        updated_at = NOW()
       WHERE id = $1 AND status IN ('in_pool', 'pending') AND (doctor_id IS NULL OR doctor_id = $2)
       RETURNING *`,
      [poolId, claimDoctorId, proposedDate || null, proposedTime || null,
        `\n[Claimed by ${doctorName || claimDoctorId}]`],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pool item not found or no longer available' });
    }

    res.json({
      success: true,
      appointment: result.rows[0],
      message: 'Appointment claimed successfully',
    });
  } catch (error: unknown) {
    console.error('Claim pool error:', error);
    res.status(500).json({ error: errMsg(error) });
  }
});

router.post('/:poolId/admin-assign', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { poolId } = req.params;
    const doctorId = req.body?.doctorId || req.body?.doctor_id;
    const { doctorName, assignedDate, assignedTime, adminId, adminName } = req.body;
    if (!doctorId) {
      return res.status(400).json({ error: 'doctorId or doctor_id is required' });
    }

    const result = await pgPool.query(
      `UPDATE appointments SET
        doctor_id = $2,
        status = 'awaiting_doctor_response',
        requested_date = COALESCE($3, requested_date),
        requested_time = COALESCE($4, requested_time),
        notes = COALESCE(notes, '') || $5,
        updated_at = NOW()
       WHERE id = $1 AND status IN ('in_pool', 'pending')
       RETURNING *`,
      [poolId, doctorId, assignedDate || null, assignedTime || null,
        `\n[Admin-assigned by ${adminName || adminId} to ${doctorName || doctorId}]`],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pool item not found or no longer in pool' });
    }

    res.json({
      success: true,
      appointment: result.rows[0],
      message: 'Appointment assigned successfully',
    });
  } catch (error: unknown) {
    console.error('Admin assign error:', error);
    res.status(500).json({ error: errMsg(error) });
  }
});

router.post('/:poolId/approve', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { poolId } = req.params;
    const { adminId, adminName } = req.body;

    const result = await pgPool.query(
      `UPDATE appointments SET
        status = 'awaiting_doctor_response',
        notes = COALESCE(notes, '') || $2,
        updated_at = NOW()
       WHERE id = $1 AND status IN ('in_pool', 'pending', 'awaiting_doctor_response')
       RETURNING *`,
      [poolId, `\n[Approved by ${adminName || adminId}]`],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pool item not found or not pending approval' });
    }

    res.json({
      success: true,
      appointment: result.rows[0],
      message: 'Assignment approved successfully',
    });
  } catch (error: unknown) {
    console.error('Approve assignment error:', error);
    res.status(500).json({ error: errMsg(error) });
  }
});

/** Deprecated — use doctor portal POST /api/ai/specialty-match */
router.post('/:poolId/ai-match', authMiddleware, async (req: Request, res: Response) => {
  res.status(410).json({
    error: 'Deprecated',
    message: 'Use POST /api/ai/specialty-match on the doctor portal API',
    poolId: req.params.poolId,
  });
});

router.get('/meeting-check/:appointmentId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const result = await pgPool.query(
      `SELECT id, requested_date, requested_time, confirmed_date, confirmed_time, status
       FROM appointments WHERE id = $1`,
      [appointmentId],
    );
    const appointment = result.rows[0];
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const appointmentDate = appointment.confirmed_date || appointment.requested_date;
    const appointmentTime = appointment.confirmed_time || appointment.requested_time || '09:00';
    const meetingCheck = isWithinMeetingWindow(appointmentDate, appointmentTime, DEFAULT_MEETING_RULES);

    res.json({
      appointmentId,
      appointmentDate,
      appointmentTime,
      ...meetingCheck,
      rules: DEFAULT_MEETING_RULES,
    });
  } catch (error: unknown) {
    console.error('Meeting check error:', error);
    res.status(500).json({ error: errMsg(error) });
  }
});

router.post('/missed-meeting/:appointmentId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const { missedBy } = req.body;

    const existing = await pgPool.query(
      `SELECT * FROM appointments WHERE id = $1`,
      [appointmentId],
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const appointment = existing.rows[0];
    const nextSlot = getNextWeekSameTime(
      appointment.confirmed_date || appointment.requested_date,
      appointment.confirmed_time || appointment.requested_time || '09:00',
    );

    await pgPool.query(
      `UPDATE appointments SET
        status = 'in_pool',
        requested_date = $2,
        requested_time = $3,
        notes = COALESCE(notes, '') || $4,
        updated_at = NOW()
       WHERE id = $1`,
      [
        appointmentId,
        nextSlot.date,
        nextSlot.time,
        `\n[Missed by ${missedBy || 'unknown'} — auto-rescheduled]`,
      ],
    );

    res.json({
      success: true,
      message: 'Meeting marked as missed. Auto-rescheduled to next week pending admin approval.',
      rescheduled: true,
    });
  } catch (error: unknown) {
    console.error('Missed meeting error:', error);
    res.status(500).json({ error: errMsg(error) });
  }
});

router.get('/meeting-rules', authMiddleware, async (_req: Request, res: Response) => {
  res.json(DEFAULT_MEETING_RULES);
});

router.put('/meeting-rules', authMiddleware, async (req: Request, res: Response) => {
  const newRules = { ...DEFAULT_MEETING_RULES, ...req.body };
  res.json({ success: true, rules: newRules, note: 'Rules are in-memory defaults; persist via admin config if needed' });
});

export default router;
