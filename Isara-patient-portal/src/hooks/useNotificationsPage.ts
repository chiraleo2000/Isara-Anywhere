import { useCallback, useEffect, useMemo, useState } from 'react';
import { notificationService, type Notification } from '../lib/services';

export type NotificationsPageLabels = {
  title: string;
  markAll: string;
  loading: string;
  empty: string;
  details: string;
};

export function getNotificationsPageLabels(language: string): NotificationsPageLabels {
  return language === 'en'
    ? {
        title: 'Notifications',
        markAll: 'Mark all as read',
        loading: 'Loading notifications...',
        empty: 'No notifications',
        details: 'View details',
      }
    : {
        title: 'การแจ้งเตือน',
        markAll: 'อ่านทั้งหมดแล้ว',
        loading: 'กำลังโหลดการแจ้งเตือน...',
        empty: 'ยังไม่มีการแจ้งเตือน',
        details: 'ดูรายละเอียด',
      };
}

export function notificationRowClass(isRead: boolean, isDark: boolean): string {
  const base = `px-4 py-3 border-b last:border-b-0 ${isDark ? 'border-gray-800' : 'border-gray-100'}`;
  if (isRead) return base;
  return `${base} ${isDark ? 'bg-emerald-950/20' : 'bg-emerald-50/60'}`;
}

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
