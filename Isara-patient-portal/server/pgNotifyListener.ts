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
};

export async function startPgNotifyListener(pool: Pool, io: SocketServer): Promise<void> {
  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    await client.query('LISTEN data_changes');
    console.log('📡 PG LISTEN data_changes — connected (patient portal)');

    client.on('notification', (msg) => {
      if (msg.channel !== 'data_changes') return;
      try {
        const payload = JSON.parse(msg.payload || '{}');
        const event = TABLE_EVENT_MAP[payload.table] || 'data:changed';

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
