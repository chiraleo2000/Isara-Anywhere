import { Link } from 'react-router-dom';
import { Bell, ChevronRight, CheckCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import {
  getNotificationsPageLabels,
  notificationRowClass,
  useNotificationsPage,
} from '../hooks/useNotificationsPage';

export default function NotificationsPage() {
  const { user } = useAuth();
  const { theme, language } = useSettings();
  const isDark = theme === 'dark';
  const labels = getNotificationsPageLabels(language);
  const { items, loading, markAllAsRead } = useNotificationsPage(user?.id);

  return (
    <main data-testid="notifications-page" className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{labels.title}</h1>
        <button
          type="button"
          data-testid="mark-all-read-btn"
          onClick={() => void markAllAsRead()}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <CheckCheck className="w-4 h-4" />
          {labels.markAll}
        </button>
      </div>

      {loading ? (
        <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>{labels.loading}</p>
      ) : (
        <div className={`rounded-xl border ${isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}>
          {items.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className={`mx-auto mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>{labels.empty}</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className={notificationRowClass(item.isRead, isDark)}>
                <p className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{item.title}</p>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{item.message}</p>
                {item.appointmentId ? (
                  <Link
                    to={`/appointments/${item.appointmentId}`}
                    data-testid={`notification-appointment-link-${item.appointmentId}`}
                    className="inline-flex items-center gap-1 mt-2 text-sm text-emerald-600 hover:text-emerald-700"
                  >
                    {labels.details} <ChevronRight className="w-3 h-3" />
                  </Link>
                ) : null}
              </div>
            ))
          )}
        </div>
      )}
    </main>
  );
}
