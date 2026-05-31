/**
 * Doctor Portal Notification Bell Component
 * แสดงจำนวนการแจ้งเตือนและ dropdown รายการแจ้งเตือน
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../common/AuthProvider';

// Types
interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: {
    appointmentId?: string;
    patientId?: string;
    patientName?: string;
    meetingLink?: string;
  };
}

type NotificationType = 
  | 'appointment_requested'
  | 'appointment_confirmed'
  | 'appointment_cancelled'
  | 'appointment_assigned'
  | 'emr_ready'
  | 'meeting_started'
  | 'system';

// Icons
const BellIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const CalendarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const VideoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const AlertIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const FileIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// API Base URL - Empty string for relative paths in production (Cloud Run)
const API_BASE = import.meta.env.VITE_API_URL || '';

const getAuthHeaders = (): Record<string, string> => {
  const token =
    localStorage.getItem('token') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Extracted sub-component to reduce complexity and fix nested ternary
const NotificationList: React.FC<{
  notifications: Notification[];
  language: string;
  onNotificationClick: (n: Notification) => void;
  getNotificationIcon: (type: NotificationType) => React.ReactNode;
  formatTimeAgo: (dateStr: string) => string;
}> = ({ notifications, language, onNotificationClick, getNotificationIcon, formatTimeAgo }) => {
  if (notifications.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <BellIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p>{language === 'th' ? 'ไม่มีการแจ้งเตือน' : 'No notifications'}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {notifications.slice(0, 10).map((notification) => {
        const readClass = notification.isRead ? '' : 'bg-emerald-50/50';
        const fontClass = notification.isRead ? 'font-medium' : 'font-semibold';
        return (
          <button
            type="button"
            key={notification.id}
            onClick={() => onNotificationClick(notification)}
            className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer w-full text-left ${readClass}`}
            aria-label={`Notification: ${notification.title}`}
          >
            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-1">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  {getNotificationIcon(notification.type)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className={`text-sm ${fontClass} text-gray-800 line-clamp-1`}>
                    {notification.title}
                  </h4>
                  {!notification.isRead && (
                    <span className="flex-shrink-0 w-2 h-2 bg-emerald-500 rounded-full mt-1.5"></span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                  {notification.message}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-gray-400">
                    {formatTimeAgo(notification.createdAt)}
                  </span>
                  {notification.data?.meetingLink && (
                    <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                      <VideoIcon className="w-3 h-3" />
                      {language === 'th' ? 'เริ่มประชุม' : 'Start Meeting'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

interface DoctorNotificationBellProps {
  className?: string;
  onNavigate?: (view: string, data?: any) => void;
}

export const DoctorNotificationBell: React.FC<DoctorNotificationBellProps> = ({ 
  className = '',
  onNavigate 
}) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load notifications from API
  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/notifications/doctor/${user.id}`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        const notifs = (data.notifications || []).map((n: Notification & { read_at?: string; readAt?: string }) => ({
          ...n,
          isRead: typeof n.isRead === 'boolean' ? n.isRead : Boolean(n.read_at || n.readAt),
        }));
        setNotifications(notifs);
        setUnreadCount(notifs.filter((n: Notification) => !n.isRead).length || 0);
        console.log(`🔔 Loaded ${notifs.length} notifications for doctor ${user.id}`);
      } else {
        console.warn('⚠️ Notification API returned non-ok status:', response.status);
        // Initialize empty notifications if first time
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      // Use empty state on error
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Initial load and polling
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await fetch(`${API_BASE}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
    
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    
    try {
      await fetch(`${API_BASE}/api/notifications/doctor/${user.id}/read-all`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
    
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    handleMarkAsRead(notification.id);
    
    if (onNavigate) {
      if (notification.data?.appointmentId) {
        onNavigate('health-meeting', { appointmentId: notification.data.appointmentId });
      } else if (notification.data?.patientId) {
        onNavigate('patients', { patientId: notification.data.patientId });
      }
    }
    
    setIsOpen(false);
  };

  // Get icon for notification type
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'appointment_requested':
      case 'appointment_assigned':
        return <CalendarIcon className="w-4 h-4 text-blue-500" />;
      case 'appointment_confirmed':
        return <CheckIcon className="w-4 h-4 text-green-500" />;
      case 'appointment_cancelled':
        return <CloseIcon className="w-4 h-4 text-red-500" />;
      case 'meeting_started':
        return <VideoIcon className="w-4 h-4 text-purple-500" />;
      case 'emr_ready':
        return <FileIcon className="w-4 h-4 text-emerald-500" />;
      default:
        return <AlertIcon className="w-4 h-4 text-amber-500" />;
    }
  };

  // Format time ago
  const formatTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    return language === 'th'
      ? formatTimeAgoTh(diffMins, diffHours, diffDays, date)
      : formatTimeAgoEn(diffMins, diffHours, diffDays, date);
  };

  const formatTimeAgoTh = (diffMins: number, diffHours: number, diffDays: number, date: Date) => {
    if (diffMins < 1) return 'เมื่อสักครู่';
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
    if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
    return date.toLocaleDateString('th-TH');
  };

  const formatTimeAgoEn = (diffMins: number, diffHours: number, diffDays: number, date: Date) => {
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US');
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
        aria-label={t('notif.notifications')}
        title={t('notif.notifications')}
      >
        <BellIcon className="w-6 h-6 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-[70vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <BellIcon className="w-4 h-4 text-emerald-600" />
              {language === 'th' ? 'การแจ้งเตือน' : 'Notifications'}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
              >
                {language === 'th' ? 'อ่านทั้งหมด' : 'Mark all read'}
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">{t('common.loading')}</p>
              </div>
            ) : (
              <NotificationList
                notifications={notifications}
                language={language}
                onNotificationClick={handleNotificationClick}
                getNotificationIcon={getNotificationIcon}
                formatTimeAgo={formatTimeAgo}
              />
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-center">
              <button 
                onClick={() => {
                  setIsOpen(false);
                  if (onNavigate) onNavigate('dashboard');
                }}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                {language === 'th' ? 'ดูทั้งหมด' : 'View all'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DoctorNotificationBell;
