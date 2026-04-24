/**
 * Appointment Scheduler (cron)
 * ---------------------------------------------------------------------------
 * Runs on a fixed interval inside the patient-portal API process and:
 *   1. Sends "T-24h" reminder notifications for confirmed appointments
 *   2. Sends "T-1h"  reminder notifications for confirmed appointments
 *   3. Marks appointments as `no_show` when appointment_time + grace < NOW()
 *      and status is still 'confirmed' / 'in_progress'
 *
 * Deduplication is done via the notifications table (we refuse to insert a
 * second reminder of the same (user_id, type, data.appointmentId) within the
 * same reminder window). No schema changes required.
 */

import type { Pool } from 'pg';
import crypto from 'node:crypto';

const TICK_MS = Number(process.env.APPT_SCHEDULER_TICK_MS || 5 * 60 * 1000); // 5 min
const GRACE_MINUTES = Number(process.env.APPT_NOSHOW_GRACE_MIN || 30);

let timer: NodeJS.Timeout | null = null;

async function alreadySent(
  pool: Pool,
  userId: string,
  type: string,
  appointmentId: string,
  windowMinutes: number
): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM notifications
     WHERE user_id = $1
       AND type = $2
       AND data->>'appointmentId' = $3
       AND created_at > NOW() - ($4 || ' minutes')::interval
     LIMIT 1`,
    [userId, type, appointmentId, String(windowMinutes)]
  );
  return result.rows.length > 0;
}

async function insertNotification(
  pool: Pool,
  userId: string,
  type: string,
  title: string,
  message: string,
  appointmentId: string,
  extra: Record<string, unknown> = {}
): Promise<void> {
  await pool.query(
    `INSERT INTO notifications (id, user_id, type, title, message, data)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      crypto.randomUUID(),
      userId,
      type,
      title,
      message,
      JSON.stringify({ appointmentId, ...extra })
    ]
  );
}

function collectRecipients(row: { patient_id?: string | null; doctor_id?: string | null }): string[] { // NOSONAR S3776: stale warning, helper has CC=2
  const recipients: string[] = [];
  if (row.patient_id) recipients.push(row.patient_id);
  if (row.doctor_id) recipients.push(row.doctor_id);
  return recipients;
}

async function sendReminderToUser(
  pool: Pool,
  userId: string,
  type: string,
  row: { id: string; appt_date: string; appt_time: string },
  windowLabel: '24h' | '1h',
  dedupWindowMin: number
): Promise<boolean> {
  if (await alreadySent(pool, userId, type, row.id, dedupWindowMin)) return false;
  await insertNotification(
    pool,
    userId,
    type,
    windowLabel === '24h' ? 'Appointment in 24 hours' : 'Appointment in 1 hour',
    `You have an upcoming appointment (${row.id}) on ${row.appt_date} at ${row.appt_time}.`,
    row.id,
    { appointmentDate: row.appt_date, appointmentTime: row.appt_time }
  );
  return true;
}

async function sendReminders(pool: Pool, windowLabel: '24h' | '1h'): Promise<number> {
  const interval = windowLabel === '24h' ? '24 hours' : '1 hour';
  const tolerance = windowLabel === '24h' ? '30 minutes' : '10 minutes';
  const dedupWindowMin = windowLabel === '24h' ? 60 * 23 : 55;
  const type = windowLabel === '24h' ? 'appointment_reminder_24h' : 'appointment_reminder_1h';

  const result = await pool.query(
    `SELECT id, patient_id, doctor_id,
            COALESCE(confirmed_date, requested_date) AS appt_date,
            COALESCE(confirmed_time, requested_time) AS appt_time
     FROM appointments
     WHERE status IN ('confirmed', 'awaiting_doctor_response')
       AND confirmed_date IS NOT NULL
       AND (confirmed_date::text || ' ' || confirmed_time::text)::timestamp
           BETWEEN NOW() + $1::interval - $2::interval
               AND NOW() + $1::interval + $2::interval`,
    [interval, tolerance]
  );

  let sent = 0;
  for (const row of result.rows) {
    for (const userId of collectRecipients(row)) {
      try {
        if (await sendReminderToUser(pool, userId, type, row, windowLabel, dedupWindowMin)) sent++;
      } catch (err) {
        console.error(`[SCHEDULER] Failed to send ${type} for ${row.id}/${userId}:`, err);
      }
    }
  }
  return sent;
}

async function markNoShows(pool: Pool): Promise<number> {
  const result = await pool.query(
    `UPDATE appointments
     SET status = 'no_show',
         updated_at = NOW()
     WHERE status IN ('confirmed', 'in_progress', 'awaiting_doctor_response')
       AND confirmed_date IS NOT NULL
       AND (confirmed_date::text || ' ' || confirmed_time::text)::timestamp
           < NOW() - ($1 || ' minutes')::interval
     RETURNING id, patient_id, doctor_id`,
    [String(GRACE_MINUTES)]
  );

  for (const row of result.rows) {
    const recipients: string[] = [];
    if (row.patient_id) recipients.push(row.patient_id);
    if (row.doctor_id) recipients.push(row.doctor_id);
    for (const userId of recipients) {
      try {
        await insertNotification(
          pool,
          userId,
          'appointment_no_show',
          'Appointment missed',
          `Appointment ${row.id} was marked as no-show after ${GRACE_MINUTES} minutes grace period.`,
          row.id
        );
      } catch (err) {
        console.error(`[SCHEDULER] Failed to notify no-show for ${row.id}/${userId}:`, err);
      }
    }
  }
  return result.rows.length;
}

async function tick(pool: Pool): Promise<void> {
  try {
    const [n24, n1, noShow] = await Promise.all([
      sendReminders(pool, '24h'),
      sendReminders(pool, '1h'),
      markNoShows(pool)
    ]);
    if (n24 + n1 + noShow > 0) {
      console.log(`[SCHEDULER] tick: 24h=${n24} 1h=${n1} no_show=${noShow}`);
    }
  } catch (err) {
    console.error('[SCHEDULER] tick failed:', err);
  }
}

export function startAppointmentScheduler(pool: Pool): void {
  if (timer) return;
  console.log(`[SCHEDULER] Appointment reminder + no-show scheduler started (tick=${TICK_MS}ms, grace=${GRACE_MINUTES}min)`);
  // Fire-and-forget initial tick on next I/O cycle
  setImmediate(() => { void tick(pool); });
  timer = setInterval(() => { void tick(pool); }, TICK_MS);
  if (timer.unref) timer.unref();
}

export function stopAppointmentScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
