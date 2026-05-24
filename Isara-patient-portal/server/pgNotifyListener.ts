/**
 * PG LISTEN/NOTIFY listener — Patient Portal (dedicated Client, not pooled).
 */
import { Client, type Pool } from 'pg';
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

let notifyClient: Client | null = null;
let listenPool: Pool | null = null;
let listenIo: SocketServer | null = null;

function clientConfigFromPool(pool: Pool) {
  const o = pool.options;
  return {
    host: o.host,
    port: o.port,
    user: o.user,
    password: o.password,
    database: o.database,
    ssl: o.ssl,
  };
}

async function verifyTriggers(client: Client): Promise<void> {
  try {
    const result = await client.query(
      `SELECT tgname FROM pg_trigger WHERE tgname LIKE 'trg_%_notify'`,
    );
    const deployed = new Set(result.rows.map((r: { tgname: string }) => r.tgname));
    const missing = EXPECTED_TRIGGERS.filter((t) => !deployed.has(t));
    if (missing.length > 0) {
      console.warn(`⚠️  [PG_NOTIFY] Missing ${missing.length} trigger(s): ${missing.join(', ')}`);
    } else {
      console.log(`✅ [PG_NOTIFY] All ${EXPECTED_TRIGGERS.length} triggers verified`);
    }
  } catch (err: unknown) {
    console.warn('[PG_NOTIFY] Could not verify triggers:', (err as Error).message);
  }
}

async function connectListen(pool: Pool, io: SocketServer): Promise<void> {
  if (notifyClient) {
    try {
      notifyClient.removeAllListeners('notification');
      notifyClient.removeAllListeners('error');
      await notifyClient.end();
    } catch {
      /* ignore */
    }
    notifyClient = null;
  }

  notifyClient = new Client(clientConfigFromPool(pool));
  await notifyClient.connect();
  await notifyClient.query('LISTEN data_changes');
  console.log('📡 PG LISTEN data_changes — dedicated client (patient portal)');

  await verifyTriggers(notifyClient);

  notifyClient.on('notification', (msg) => {
    if (msg.channel !== 'data_changes') return;
    try {
      const payload = JSON.parse(msg.payload || '{}');
      const event = TABLE_EVENT_MAP[payload.table] || 'data:changed';

      if (payload.table === 'medical_content' || payload.table === 'clinical_resources') {
        const emitEvent = payload.status === 'published' ? 'content:published' : event;
        io.emit(emitEvent, payload);
        return;
      }

      if (payload.table === 'appointments') {
        if (payload.patient_id) {
          io.to(`patient-${payload.patient_id}`).emit(event, payload);
          if (payload.operation === 'INSERT') {
            io.to(`patient-${payload.patient_id}`).emit('appointment:created', payload);
          }
        }
        io.to('admin-notifications').emit('pool-updated', payload);
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

  notifyClient.on('error', (err: Error) => {
    console.error('[PG_NOTIFY] Connection error — will retry:', err.message);
    setTimeout(() => {
      if (listenPool && listenIo) {
        connectListen(listenPool, listenIo).catch((e) =>
          console.error('[PG_NOTIFY] Retry failed:', (e as Error).message),
        );
      }
    }, 5000);
  });
}

export async function startPgNotifyListener(pool: Pool, io: SocketServer): Promise<void> {
  listenPool = pool;
  listenIo = io;
  try {
    await connectListen(pool, io);
  } catch (err: unknown) {
    console.error('[PG_NOTIFY] Subscribe failed — will retry:', (err as Error).message);
    setTimeout(() => startPgNotifyListener(pool, io), 5000);
  }
}
