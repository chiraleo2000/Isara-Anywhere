/**
 * useRealtimeSync — Patient Portal
 *
 * React hook that establishes a Socket.IO connection, joins the
 * patient-specific room, and exposes data-change callbacks so
 * pages can refetch stale data automatically.
 *
 * Usage:
 *   const { connected } = useRealtimeSync({
 *     patientId: user.patientId,
 *     onAppointmentChange: () => refetchAppointments(),
 *   });
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';

// Event constants (mirrored from server socketEvents)
const EVENTS = {
  APPOINTMENT_CREATED: 'appointment:created',
  APPOINTMENT_UPDATED: 'appointment:updated',
  NOTIFICATION_CREATED: 'notification:created',
  PRESCRIPTION_UPDATED: 'prescription:updated',
  LAB_ORDER_UPDATED: 'lab-order:updated',
  EMR_UPDATED: 'emr:updated',
  PHR_UPDATED: 'phr:updated',
  VITALS_CREATED: 'vitals:created',
  CONTENT_UPDATED: 'content:updated',
  CONTENT_PUBLISHED: 'content:published',
  DATA_CHANGED: 'data:changed',
} as const;

export interface RealtimeSyncOptions {
  /** Current patient's user id */
  patientId?: string;
  /** Appointment created or updated */
  onAppointmentChange?: () => void;
  /** Notification received */
  onNotification?: () => void;
  /** Prescription updated */
  onPrescriptionChange?: () => void;
  /** Lab order updated */
  onLabOrderChange?: () => void;
  /** EMR updated */
  onEmrChange?: () => void;
  /** PHR / vitals updated */
  onHealthRecordChange?: () => void;
  /** Fired when any medical content or clinical resource is published */
  onContentPublished?: () => void;
  /** Catch-all */
  onDataChanged?: (payload: Record<string, unknown>) => void;
}

export function useRealtimeSync(options: RealtimeSyncOptions) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const cbRef = useRef(options);
  cbRef.current = options;

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    // Connect when we have a patientId OR when a content broadcast listener is registered
    if (!options.patientId && !options.onContentPublished) return;

    const wsUrl = `${globalThis.location.protocol}//${globalThis.location.host}`;
    const socket = io(wsUrl, {
      path: '/ws',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      if (options.patientId) {
        socket.emit('join-patient-room', options.patientId);
      }
    });

    socket.on('disconnect', () => setConnected(false));

    const bind = (event: string, getter: () => (() => void) | undefined) => {
      socket.on(event, () => getter()?.());
    };

    bind(EVENTS.APPOINTMENT_CREATED, () => cbRef.current.onAppointmentChange);
    bind(EVENTS.APPOINTMENT_UPDATED, () => cbRef.current.onAppointmentChange);
    bind(EVENTS.NOTIFICATION_CREATED, () => cbRef.current.onNotification);
    bind(EVENTS.PRESCRIPTION_UPDATED, () => cbRef.current.onPrescriptionChange);
    bind(EVENTS.LAB_ORDER_UPDATED, () => cbRef.current.onLabOrderChange);
    bind(EVENTS.EMR_UPDATED, () => cbRef.current.onEmrChange);
    bind(EVENTS.PHR_UPDATED, () => cbRef.current.onHealthRecordChange);
    bind(EVENTS.VITALS_CREATED, () => cbRef.current.onHealthRecordChange);
    bind(EVENTS.CONTENT_UPDATED, () => cbRef.current.onContentPublished);
    bind(EVENTS.CONTENT_PUBLISHED, () => cbRef.current.onContentPublished);

    socket.on(EVENTS.DATA_CHANGED, (payload: Record<string, unknown>) => {
      cbRef.current.onDataChanged?.(payload);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [options.patientId, options.onContentPublished]);

  return { connected, disconnect };
}
