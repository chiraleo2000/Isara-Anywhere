/**
 * PG LISTEN/NOTIFY listener — Meeting Server
 * Subscribes to the PostgreSQL 'data_changes' channel and re-broadcasts
 * events via Socket.IO so meeting rooms receive real-time updates when
 * appointments or records change in other portals.
 */

const TABLE_EVENT_MAP = {
  appointments:    'appointment:updated',
  meeting_records: 'meeting:updated',
  emr:             'emr:updated',
  prescriptions:   'prescription:updated',
  lab_orders:      'lab-order:updated',
  notifications:   'notification:created',
  vital_signs:     'vitals:created',
  phr:             'phr:updated',
  doctor_schedules:'schedule:updated',
};

// The 8 triggers expected from v2.2.0-notify-triggers.sql
const EXPECTED_TRIGGERS = [
  'trg_appointments_notify',
  'trg_emr_notify',
  'trg_prescriptions_notify',
  'trg_lab_orders_notify',
  'trg_notifications_notify',
  'trg_vital_signs_notify',
  'trg_phr_notify',
  'trg_doctor_schedules_notify',
];

/**
 * Verify that all PG NOTIFY triggers are deployed in the database.
 * Logs a warning for each missing trigger.
 *
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
 * Must be called AFTER the pg Pool and Socket.IO server are created.
 *
 * @param {import('pg').Pool} pool - PostgreSQL pool
 * @param {import('socket.io').Server} io - Socket.IO server instance
 */
async function startPgNotifyListener(pool, io) {
  let client;
  try {
    client = await pool.connect();
    await client.query('LISTEN data_changes');
    console.log('📡 PG LISTEN data_changes — connected (meeting server)');

    // Verify triggers on startup
    await verifyTriggers(client);

    client.on('notification', (msg) => {
      if (msg.channel !== 'data_changes') return;
      try {
        const payload = JSON.parse(msg.payload);
        const event = TABLE_EVENT_MAP[payload.table] || 'data:changed';

        // Route to doctor/patient rooms (for participants in meetings)
        if (payload.doctor_id) {
          io.to(`doctor-${payload.doctor_id}`).emit(event, payload);
        }
        if (payload.patient_id) {
          io.to(`patient-${payload.patient_id}`).emit(event, payload);
        }

        // Route appointment changes to any active meeting room for that appointment
        if (payload.table === 'appointments' && payload.id) {
          io.to(payload.id).emit(event, payload);
        }
      } catch (err) {
        console.error('[PG_NOTIFY] Failed to parse/forward:', err.message);
      }
    });

    client.on('error', (err) => {
      console.error('[PG_NOTIFY] Connection error — will retry:', err.message);
      try { client.release(); } catch (_) { /* ignore */ }
      setTimeout(() => startPgNotifyListener(pool, io), 5000);
    });
  } catch (err) {
    console.error('[PG_NOTIFY] Failed to subscribe — will retry:', err.message);
    if (client) { try { client.release(); } catch (_) { /* ignore */ } }
    setTimeout(() => startPgNotifyListener(pool, io), 5000);
  }
}

export { startPgNotifyListener };
