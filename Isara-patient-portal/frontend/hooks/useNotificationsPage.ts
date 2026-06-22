import { useCallback, useEffect, useMemo, useState } from 'react';
import { notificationService, type Notification } from '../lib/services';
import {
  getNotificationsPageLabels,
  notificationRowClass,
  type NotificationsPageLabels,
} from './useNotificationsPageHelpers';

export { getNotificationsPageLabels, notificationRowClass, type NotificationsPageLabels };

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function mapNotificationRow(raw: Notification & Record<string, unknown>): Notification {
  const data =
    raw.data && typeof raw.data === 'object'
      ? (raw.data as Record<string, unknown>)
      : {};
  const appointmentId =
    asOptionalString(raw.appointmentId)
    ?? asOptionalString(data.appointmentId)
    ?? asOptionalString(data.appointment_id);
  return {
    ...raw,
    title: asOptionalString(raw.title) ?? asOptionalString(raw.title_thai) ?? '',
    message: asOptionalString(raw.message) ?? asOptionalString(raw.message_thai) ?? '',
    appointmentId,
    isRead: Boolean(raw.isRead ?? raw.read_at),
    createdAt: asOptionalString(raw.createdAt) ?? asOptionalString(raw.created_at) ?? '',
  };
}

export function useNotificationsPage(userId: string | undefined) {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!userId) return;
      try {
        setLoading(true);
        const data = await notificationService.getNotifications(userId);
        if (active) {
          setItems((data || []).map((row) => mapNotificationRow(row as Notification & Record<string, unknown>)));
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [userId]);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    await notificationService.markAllAsRead(userId);
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, [userId]);

  return useMemo(
    () => ({ items, loading, markAllAsRead, setItems }),
    [items, loading, markAllAsRead],
  );
}
