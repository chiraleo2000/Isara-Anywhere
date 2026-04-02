/**
 * useRealtimeSync — Doctor Portal
 *
 * React hook that establishes a Socket.IO connection, joins the
 * appropriate rooms, and exposes data-change callbacks so that
 * pages can refetch stale data automatically.
 *
 * Usage:
 *   const { connected } = useRealtimeSync({
 *     doctorId: user.id,
 *     onAppointmentChange: () => refetchAppointments(),
 *     onQueueChange:       () => refetchQueue(),
 *   });
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from './socketEvents';

export interface RealtimeSyncOptions {
  /** Current doctor's user id — used to join doctor-specific rooms */
  doctorId?: string;
  /** Fired when any appointment is created / updated / deleted */
  onAppointmentChange?: () => void;
  /** Fired when queue data changes */
  onQueueChange?: () => void;
  /** Fired when an EMR record is created or updated */
  onEmrChange?: () => void;
  /** Fired when a new prescription is created */
  onPrescriptionChange?: () => void;
  /** Fired when a lab order is created / updated */
  onLabOrderChange?: () => void;
  /** Fired when a notification arrives */
  onNotification?: () => void;
  /** Fired when schedule data changes */
  onScheduleChange?: () => void;
  /** Fired when medical content or clinical resources are created/updated/published */
  onContentChange?: () => void;
  /** Catch-all for any data_changes event */
  onDataChanged?: (payload: Record<string, unknown>) => void;
}

export function useRealtimeSync(options: RealtimeSyncOptions) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Store latest callbacks in a ref to avoid re-subscribing on every render
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
    if (!options.doctorId) return;

    // Build WS URL using same origin (relative /ws path)
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
      // Join doctor-specific rooms
      socket.emit('join-doctor-room', options.doctorId);
      socket.emit('join-queue-room', options.doctorId);
    });

    socket.on('disconnect', () => setConnected(false));

    // Map server events → callbacks
    const bind = (event: string, cb: (() => void) | undefined, getter: () => (() => void) | undefined) => {
      socket.on(event, () => getter()?.());
    };

    bind(SOCKET_EVENTS.APPOINTMENT_CREATED, cbRef.current.onAppointmentChange, () => cbRef.current.onAppointmentChange);
    bind(SOCKET_EVENTS.APPOINTMENT_UPDATED, cbRef.current.onAppointmentChange, () => cbRef.current.onAppointmentChange);
    bind(SOCKET_EVENTS.QUEUE_UPDATED,       cbRef.current.onQueueChange,       () => cbRef.current.onQueueChange);
    bind(SOCKET_EVENTS.EMR_UPDATED,         cbRef.current.onEmrChange,         () => cbRef.current.onEmrChange);
    bind(SOCKET_EVENTS.PRESCRIPTION_CREATED, cbRef.current.onPrescriptionChange, () => cbRef.current.onPrescriptionChange);
    bind(SOCKET_EVENTS.PRESCRIPTION_UPDATED, cbRef.current.onPrescriptionChange, () => cbRef.current.onPrescriptionChange);
    bind(SOCKET_EVENTS.LAB_ORDER_CREATED,   cbRef.current.onLabOrderChange,    () => cbRef.current.onLabOrderChange);
    bind(SOCKET_EVENTS.LAB_ORDER_UPDATED,   cbRef.current.onLabOrderChange,    () => cbRef.current.onLabOrderChange);
    bind(SOCKET_EVENTS.NOTIFICATION_CREATED, cbRef.current.onNotification,     () => cbRef.current.onNotification);
    bind(SOCKET_EVENTS.SCHEDULE_UPDATED,    cbRef.current.onScheduleChange,    () => cbRef.current.onScheduleChange);
    bind(SOCKET_EVENTS.CONTENT_UPDATED,     cbRef.current.onContentChange,     () => cbRef.current.onContentChange);
    bind(SOCKET_EVENTS.CONTENT_PUBLISHED,   cbRef.current.onContentChange,     () => cbRef.current.onContentChange);

    socket.on(SOCKET_EVENTS.DATA_CHANGED, (payload: Record<string, unknown>) => {
      cbRef.current.onDataChanged?.(payload);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [options.doctorId]); // Only reconnect when doctorId changes

  return { connected, disconnect };
}
