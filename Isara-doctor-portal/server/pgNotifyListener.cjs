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
};

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
    console.log('📡 PG LISTEN data_changes — connected');

    client.on('notification', (msg) => {
      if (msg.channel !== 'data_changes') return;
      try {
        const payload = JSON.parse(msg.payload);
        const event = TABLE_EVENT_MAP[payload.table] || SOCKET_EVENTS.DATA_CHANGED;

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
