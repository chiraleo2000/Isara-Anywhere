/**
 * PG LISTEN/NOTIFY listener — Doctor Portal
 * Uses a dedicated pg.Client (never returned to the pool).
 */
const { Client } = require('pg');
const { SOCKET_EVENTS } = require('./socketEvents.cjs');

const TABLE_EVENT_MAP = {
  appointments: SOCKET_EVENTS.APPOINTMENT_UPDATED,
  emr: SOCKET_EVENTS.EMR_UPDATED,
  prescriptions: SOCKET_EVENTS.PRESCRIPTION_UPDATED,
  lab_orders: SOCKET_EVENTS.LAB_ORDER_UPDATED,
  notifications: SOCKET_EVENTS.NOTIFICATION_CREATED,
  vital_signs: SOCKET_EVENTS.VITALS_CREATED,
  phr: SOCKET_EVENTS.PHR_UPDATED,
  doctor_schedules: SOCKET_EVENTS.SCHEDULE_UPDATED,
  medical_content: SOCKET_EVENTS.CONTENT_UPDATED,
  clinical_resources: SOCKET_EVENTS.CONTENT_UPDATED,
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

let notifyClient = null;
let listenIo = null;
let listenPool = null;

function clientConfigFromPool(pool) {
  const o = pool.options || {};
  return {
    host: o.host,
    port: o.port,
    user: o.user,
    password: o.password,
    database: o.database,
    ssl: o.ssl,
  };
}

async function verifyTriggers(client) {
  try {
    const result = await client.query(
      `SELECT tgname FROM pg_trigger WHERE tgname LIKE 'trg_%_notify'`,
    );
    const deployed = new Set(result.rows.map((r) => r.tgname));
    const missing = EXPECTED_TRIGGERS.filter((t) => !deployed.has(t));
    if (missing.length > 0) {
      console.warn(`⚠️  [PG_NOTIFY] Missing ${missing.length} trigger(s): ${missing.join(', ')}`);
    } else {
      console.log(`✅ [PG_NOTIFY] All ${EXPECTED_TRIGGERS.length} triggers verified`);
    }
  } catch (err) {
    console.warn('[PG_NOTIFY] Could not verify triggers:', err.message);
  }
}

function forwardAppointment(io, payload, event) {
  const doctorId = payload.doctor_id;
  if (doctorId) {
    io.to(`doctor-${doctorId}`).emit(event, payload);
    io.to(`queue-${doctorId}`).emit(event, payload);
    io.to(`doctor-${doctorId}`).emit('pool-updated', payload);
    io.to(`queue-${doctorId}`).emit('appointment-updated', payload);
    io.to(`doctor-${doctorId}`).emit('appointment-created', payload);
  } else {
    io.to('pool-watchers').emit('pool-updated', payload);
    io.to('pool-watchers').emit(event, payload);
    io.to('pool-watchers').emit('appointment-updated', payload);
    io.to('admin-notifications').emit('pool-updated', payload);
    io.to('admin-notifications').emit(event, payload);
    io.to('admin-notifications').emit('appointment-updated', payload);
    if (payload.operation === 'INSERT') {
      io.to('pool-watchers').emit(SOCKET_EVENTS.APPOINTMENT_CREATED, payload);
      io.to('pool-watchers').emit('appointment-created', payload);
      io.to('admin-notifications').emit(SOCKET_EVENTS.APPOINTMENT_CREATED, payload);
      io.to('admin-notifications').emit('appointment-created', payload);
    }
  }
  if (payload.patient_id) {
    io.to(`patient-${payload.patient_id}`).emit(event, payload);
  }
}

async function connectListen(pool, io) {
  if (notifyClient) {
    try {
      notifyClient.removeAllListeners('notification');
      notifyClient.removeAllListeners('error');
      await notifyClient.end();
    } catch (endErr) {
      console.debug('[PG_NOTIFY] prior client end:', endErr.message);
    }
    notifyClient = null;
  }

  notifyClient = new Client(clientConfigFromPool(pool));
  await notifyClient.connect();
  await notifyClient.query('LISTEN data_changes');
  console.log('📡 PG LISTEN data_changes — dedicated client (doctor portal)');

  await verifyTriggers(notifyClient);

  notifyClient.on('notification', (msg) => {
    if (msg.channel !== 'data_changes') return;
    try {
      const payload = JSON.parse(msg.payload);
      const event = TABLE_EVENT_MAP[payload.table] || SOCKET_EVENTS.DATA_CHANGED;

      if (payload.table === 'medical_content' || payload.table === 'clinical_resources') {
        const emitEvent =
          payload.status === 'published' ? SOCKET_EVENTS.CONTENT_PUBLISHED : event;
        io.emit(emitEvent, payload);
        return;
      }

      if (payload.table === 'appointments') {
        forwardAppointment(io, payload, event);
        if (payload.operation === 'INSERT' && payload.doctor_id) {
          io.to(`doctor-${payload.doctor_id}`).emit(SOCKET_EVENTS.APPOINTMENT_CREATED, payload);
        }
        return;
      }

      if (payload.doctor_id) {
        io.to(`doctor-${payload.doctor_id}`).emit(event, payload);
        io.to(`queue-${payload.doctor_id}`).emit(event, payload);
      }
      if (payload.patient_id) {
        io.to(`patient-${payload.patient_id}`).emit(event, payload);
      }
    } catch (err) {
      console.error('[PG_NOTIFY] Failed to parse/forward:', err.message);
    }
  });

  notifyClient.on('error', (err) => {
    console.error('[PG_NOTIFY] Connection error — will retry:', err.message);
    setTimeout(() => {
      if (listenPool && listenIo) {
        connectListen(listenPool, listenIo).catch((e) =>
          console.error('[PG_NOTIFY] Retry failed:', e.message),
        );
      }
    }, 5000);
  });
}

/**
 * @param {import('pg').Pool} pool
 * @param {import('socket.io').Server} io
 */
async function startPgNotifyListener(pool, io) {
  listenPool = pool;
  listenIo = io;
  try {
    await connectListen(pool, io);
  } catch (err) {
    console.error('[PG_NOTIFY] Failed to subscribe — will retry:', err.message);
    setTimeout(() => startPgNotifyListener(pool, io), 5000);
  }
}

module.exports = { startPgNotifyListener };
