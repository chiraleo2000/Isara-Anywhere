/**
 * Shared Socket.IO event name constants
 * Used by frontend hooks to listen for real-time data updates.
 */
export const SOCKET_EVENTS = {
  // Appointments
  APPOINTMENT_CREATED: 'appointment:created',
  APPOINTMENT_UPDATED: 'appointment:updated',
  APPOINTMENT_DELETED: 'appointment:deleted',

  // EMR / Medical Records
  EMR_CREATED: 'emr:created',
  EMR_UPDATED: 'emr:updated',

  // Prescriptions
  PRESCRIPTION_CREATED: 'prescription:created',
  PRESCRIPTION_UPDATED: 'prescription:updated',

  // Lab Orders
  LAB_ORDER_CREATED: 'lab-order:created',
  LAB_ORDER_UPDATED: 'lab-order:updated',

  // Patient Queue
  QUEUE_UPDATED: 'queue:updated',

  // Notifications
  NOTIFICATION_CREATED: 'notification:created',
  NOTIFICATION_READ: 'notification:read',

  // Patient Health Records (PHR)
  PHR_UPDATED: 'phr:updated',

  // Vital Signs
  VITALS_CREATED: 'vitals:created',

  // Doctor Schedule
  SCHEDULE_UPDATED: 'schedule:updated',

  // Cross-service sync (from PG LISTEN/NOTIFY)
  DATA_CHANGED: 'data:changed',
} as const;

export type SocketEvent = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];
