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
        if (active) setItems(data || []);
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
