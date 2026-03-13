/**
 * Notification Bell Component
 * Shows notification count badge and dropdown with recent notifications
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Check, Calendar, Video, FileText, AlertCircle, X, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { notificationService, Notification } from '../lib/services';
import { useAuth } from '../contexts/AuthContext';

interface NotificationBellProps {
  readonly className?: string;
}

export function NotificationBell({ className = '' }: Readonly<NotificationBellProps>) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const data = await notificationService.getNotifications(user.id);
      setNotifications(data || []);
      setUnreadCount(data?.filter((n: Notification) => !n.isRead).length || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Initial load and polling
  useEffect(() => {
    loadNotifications();

    // Poll for new notifications every 30 seconds
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
    if (!user?.id) return;

    try {
      await notificationService.markAsRead(user.id, notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;

    try {
      await notificationService.markAllAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Get icon for notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment_confirmed':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'appointment_declined':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case 'appointment_cancelled':
        return <X className="w-4 h-4 text-red-500" />;
      case 'emr_ready':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'appointment_completed':
        return <Calendar className="w-4 h-4 text-emerald-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
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

    if (diffMins < 1) return 'เมื่อสักครู่';
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
    if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
    return date.toLocaleDateString('th-TH');
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-[70vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-600" />
              การแจ้งเตือน
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
              >
                อ่านทั้งหมด
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <div className="p-4 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
              </div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>ไม่มีการแจ้งเตือน</p>
              </div>
            )}
            {!loading && notifications.length > 0 && (
              <div className="divide-y divide-gray-100">
                {notifications.slice(0, 10).map((notification) => (
                  <button
                    type="button"
                    key={notification.id}
                    onClick={() => handleMarkAsRead(notification.id)}
                    className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer w-full text-left ${notification.isRead ? '' : 'bg-emerald-50/50'
                      }`}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`text-sm ${notification.isRead ? 'font-medium' : 'font-semibold'} text-gray-800 line-clamp-1`}>
                            {notification.title}
                          </h4>
                          {notification.isRead ? null : (
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

                          {/* Action buttons */}
                          {notification.appointmentId && (
                            <Link
                              to={`/appointments/${notification.appointmentId}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                            >
                              ดูรายละเอียด <ChevronRight className="w-3 h-3" />
                            </Link>
                          )}

                          {notification.meetingLink && (
                            <a
                              href={notification.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                            >
                              <Video className="w-3 h-3" /> เข้าประชุม
                            </a>
                          )}

                          {notification.calendarUrl && (
                            <a
                              href={notification.calendarUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                            >
                              <Calendar className="w-3 h-3" /> ปฏิทิน
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 10 && (
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
              <Link
                to="/notifications"
                className="block text-center text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                onClick={() => setIsOpen(false)}
              >
                ดูการแจ้งเตือนทั้งหมด ({notifications.length})
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
