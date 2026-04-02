/**
 * PG LISTEN/NOTIFY listener — Patient Portal
 * Subscribes to the PostgreSQL 'data_changes' channel and re-broadcasts
 * events via Socket.IO so the patient frontend receives cross-service updates.
 */
import type { Pool, PoolClient } from 'pg';
import type { Server as SocketServer } from 'socket.io';

const TABLE_EVENT_MAP: Record<string, string> = {
  appointments: 'appointment:updated',
  emr: 'emr:updated',
  prescriptions: 'prescription:updated',
  lab_orders: 'lab-order:updated',
  notifications: 'notification:created',
  vital_signs: 'vitals:created',
  phr: 'phr:updated',
  doctor_schedules: 'schedule:updated',
  medical_content: 'content:updated',
  clinical_resources: 'content:updated',
};

// The 10 triggers expected from v2.2.0-notify-triggers.sql
const EXPECTED_TRIGGERS = [
  'trg_appointments_notify',
  'trg_emr_notify',
  'trg_prescriptions_notify',
  'trg_lab_orders_notify',
  'trg_notifications_notify',
  'trg_vital_signs_notify',
  'trg_phr_notify',
  'trg_doctor_schedules_notify',
  'trg_medical_content_notify',
  'trg_clinical_resources_notify',
];

/**
 * Verify that all PG NOTIFY triggers are deployed in the database.
 */
async function verifyTriggers(client: PoolClient): Promise<void> {
  try {
    const result = await client.query(
      `SELECT tgname FROM pg_trigger WHERE tgname LIKE 'trg_%_notify'`
    );
    const deployed = new Set(result.rows.map((r: { tgname: string }) => r.tgname));
    const missing = EXPECTED_TRIGGERS.filter(t => !deployed.has(t));

    if (missing.length > 0) {
      console.warn(`⚠️  [PG_NOTIFY] Missing ${missing.length} trigger(s): ${missing.join(', ')}`);
      console.warn('   → Run: scripts/database/v2.2.0-notify-triggers.sql to install them');
    } else {
      console.log(`✅ [PG_NOTIFY] All ${EXPECTED_TRIGGERS.length} triggers verified`);
    }
  } catch (err: unknown) {
    console.warn('[PG_NOTIFY] Could not verify triggers:', (err as Error).message);
  }
}

export async function startPgNotifyListener(pool: Pool, io: SocketServer): Promise<void> {
  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    await client.query('LISTEN data_changes');
    console.log('📡 PG LISTEN data_changes — connected (patient portal)');

    // Verify triggers on startup
    await verifyTriggers(client);

    client.on('notification', (msg) => {
      if (msg.channel !== 'data_changes') return;
      try {
        const payload = JSON.parse(msg.payload || '{}');
        const event = TABLE_EVENT_MAP[payload.table] || 'data:changed';

        // Content tables: broadcast to all (no patient/doctor scope)
        if (payload.table === 'medical_content' || payload.table === 'clinical_resources') {
          const emitEvent = payload.status === 'published' ? 'content:published' : event;
          io.emit(emitEvent, payload);
          return;
        }

        if (payload.patient_id) {
          io.to(`patient-${payload.patient_id}`).emit(event, payload);
        }
        if (payload.doctor_id) {
          io.to(`doctor-${payload.doctor_id}`).emit(event, payload);
        }
      } catch (err: unknown) {
        console.error('[PG_NOTIFY] Parse/forward error:', (err as Error).message);
      }
    });

    client.on('error', (err: Error) => {
      console.error('[PG_NOTIFY] Connection error — will retry:', err.message);
      try { client?.release(); } catch { /* ignore */ }
      setTimeout(() => startPgNotifyListener(pool, io), 5000);
    });
  } catch (err: unknown) {
    console.error('[PG_NOTIFY] Subscribe failed — will retry:', (err as Error).message);
    if (client) { try { client.release(); } catch { /* ignore */ } }
    setTimeout(() => startPgNotifyListener(pool, io), 5000);
  }
}
