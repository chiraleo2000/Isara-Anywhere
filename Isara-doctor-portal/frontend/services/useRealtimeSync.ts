/**
 * useRealtimeSync — Doctor Portal
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from './socketEvents';

export interface RealtimeSyncOptions {
  doctorId?: string;
  /** Join admin-notifications room (admins watching appointment pool) */
  isAdmin?: boolean;
  onAppointmentChange?: () => void;
  onQueueChange?: () => void;
  onEmrChange?: () => void;
  onPrescriptionChange?: () => void;
  onLabOrderChange?: () => void;
  onNotification?: () => void;
  onScheduleChange?: () => void;
  onContentChange?: () => void;
  onDataChanged?: (payload: Record<string, unknown>) => void;
}

const LEGACY_APPOINTMENT_EVENTS = [
  'pool-updated',
  'appointment-created',
  'appointment-updated',
  'appointment:created',
  'appointment:updated',
] as const;

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
    if (!options.doctorId && !options.isAdmin) return;

    const wsUrl = `${globalThis.location.protocol}//${globalThis.location.host}`;
    const socket = io(wsUrl, {
      path: '/ws',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    const fireAppointment = () => cbRef.current.onAppointmentChange?.();
    const fireQueue = () => cbRef.current.onQueueChange?.();

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join', 'pool-watchers');
      if (options.doctorId) {
        socket.emit('join-doctor-room', options.doctorId);
        socket.emit('join-queue-room', options.doctorId);
      }
      if (options.isAdmin) {
        socket.emit('join', 'admin-notifications');
      }
    });

    socket.on('disconnect', () => setConnected(false));

    const bind = (event: string, fn: () => void) => {
      socket.on(event, fn);
    };

    bind(SOCKET_EVENTS.APPOINTMENT_CREATED, fireAppointment);
    bind(SOCKET_EVENTS.APPOINTMENT_UPDATED, fireAppointment);
    bind(SOCKET_EVENTS.QUEUE_UPDATED, fireQueue);

    for (const ev of LEGACY_APPOINTMENT_EVENTS) {
      socket.on(ev, () => {
        fireAppointment();
        fireQueue();
      });
    }

    bind(SOCKET_EVENTS.EMR_UPDATED, () => cbRef.current.onEmrChange?.());
    bind(SOCKET_EVENTS.PRESCRIPTION_CREATED, () => cbRef.current.onPrescriptionChange?.());
    bind(SOCKET_EVENTS.PRESCRIPTION_UPDATED, () => cbRef.current.onPrescriptionChange?.());
    bind(SOCKET_EVENTS.LAB_ORDER_CREATED, () => cbRef.current.onLabOrderChange?.());
    bind(SOCKET_EVENTS.LAB_ORDER_UPDATED, () => cbRef.current.onLabOrderChange?.());
    bind(SOCKET_EVENTS.NOTIFICATION_CREATED, () => cbRef.current.onNotification?.());
    bind(SOCKET_EVENTS.SCHEDULE_UPDATED, () => cbRef.current.onScheduleChange?.());
    bind(SOCKET_EVENTS.CONTENT_UPDATED, () => cbRef.current.onContentChange?.());
    bind(SOCKET_EVENTS.CONTENT_PUBLISHED, () => cbRef.current.onContentChange?.());

    socket.on(SOCKET_EVENTS.DATA_CHANGED, (payload: Record<string, unknown>) => {
      cbRef.current.onDataChanged?.(payload);
      if (payload.table === 'appointments') {
        fireAppointment();
        fireQueue();
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [options.doctorId, options.isAdmin]);

  return { connected, disconnect };
}
