/**
 * PG LISTEN/NOTIFY listener — Doctor Portal
 * Subscribes to the PostgreSQL 'data_changes' channel and re-broadcasts
 * events via the Socket.IO instance so that the doctor frontend receives
 * cross-service updates (e.g. patient portal creating an appointment).
 */
const { SOCKET_EVENTS } = require('./socketEvents.cjs');

const TABLE_EVENT_MAP = {
  appointments: SOCKET_EVENTS.APPOINTMENT_UPDATED,
  emr:           SOCKET_EVENTS.EMR_UPDATED,
  prescriptions: SOCKET_EVENTS.PRESCRIPTION_UPDATED,
  lab_orders:    SOCKET_EVENTS.LAB_ORDER_UPDATED,
  notifications: SOCKET_EVENTS.NOTIFICATION_CREATED,
  vital_signs:   SOCKET_EVENTS.VITALS_CREATED,
  phr:           SOCKET_EVENTS.PHR_UPDATED,
  doctor_schedules: SOCKET_EVENTS.SCHEDULE_UPDATED,
  medical_content:    SOCKET_EVENTS.CONTENT_UPDATED,
  clinical_resources: SOCKET_EVENTS.CONTENT_UPDATED,
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
 * @param {import('pg').PoolClient} client
 */
async function verifyTriggers(client) {
  try {
    const result = await client.query(
      `SELECT tgname FROM pg_trigger WHERE tgname LIKE 'trg_%_notify'`
    );
    const deployed = new Set(result.rows.map(r => r.tgname));
    const missing = EXPECTED_TRIGGERS.filter(t => !deployed.has(t));

    if (missing.length > 0) {
      console.warn(`⚠️  [PG_NOTIFY] Missing ${missing.length} trigger(s): ${missing.join(', ')}`);
      console.warn('   → Run: scripts/database/v2.2.0-notify-triggers.sql to install them');
    } else {
      console.log(`✅ [PG_NOTIFY] All ${EXPECTED_TRIGGERS.length} triggers verified`);
    }
  } catch (err) {
    console.warn('[PG_NOTIFY] Could not verify triggers:', err.message);
  }
}

/**
 * Start listening for PG NOTIFY on a dedicated connection.
 * Must be called AFTER the pg Pool is created.
 *
 * @param {import('pg').Pool} pool - PostgreSQL pool
 * @param {import('socket.io').Server} io   - Socket.IO server instance
 */
async function startPgNotifyListener(pool, io) {
  let client;
  try {
    client = await pool.connect();
    await client.query('LISTEN data_changes');
    console.log('📡 PG LISTEN data_changes — connected (doctor portal)');

    // Verify triggers on startup
    await verifyTriggers(client);

    client.on('notification', (msg) => {
      if (msg.channel !== 'data_changes') return;
      try {
        const payload = JSON.parse(msg.payload);
        const event = TABLE_EVENT_MAP[payload.table] || SOCKET_EVENTS.DATA_CHANGED;

        // Content tables: broadcast to all (no patient/doctor scope)
        if (payload.table === 'medical_content' || payload.table === 'clinical_resources') {
          const emitEvent = payload.status === 'published' ? SOCKET_EVENTS.CONTENT_PUBLISHED : event;
          io.emit(emitEvent, payload);
          return;
        }

        // Route to the correct rooms
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

    client.on('error', (err) => {
      console.error('[PG_NOTIFY] Connection error — will retry:', err.message);
      // Release and retry after 5s
      try { client.release(); } catch (_) { /* ignore */ }
      setTimeout(() => startPgNotifyListener(pool, io), 5000);
    });
  } catch (err) {
    console.error('[PG_NOTIFY] Failed to subscribe — will retry:', err.message);
    if (client) { try { client.release(); } catch (_) { /* ignore */ } }
    setTimeout(() => startPgNotifyListener(pool, io), 5000);
  }
}

module.exports = { startPgNotifyListener };
