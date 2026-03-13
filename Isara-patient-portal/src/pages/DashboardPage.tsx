import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { appointmentService } from '../lib/services';
import { Appointment } from '../types';
import { HealthStudio, AIHealthChat } from '../components/health';
import {
  Calendar,
  MessageCircle,
  FileText,
  Clock,
  ChevronRight,
  Video,
  Bell,
  Plus,
  BookOpen,
  MapPin,
} from 'lucide-react';

/* ---- Extracted sub-components to reduce cognitive complexity ---- */

interface AppointmentCardProps {
  readonly apt: Appointment;
  readonly isDarkMode: boolean;
  readonly isEnglish: boolean;
  readonly formatDate: (date: string | Date) => string;
  readonly getStatusBadge: (status: string) => JSX.Element;
}

function getTypeLabel(type: string, isEnglish: boolean): string {
  if (type === 'telehealth') return isEnglish ? 'Online' : 'ออนไลน์';
  return isEnglish ? 'Hospital' : 'โรงพยาบาล';
}

function AppointmentCard({ apt, isDarkMode, isEnglish, formatDate, getStatusBadge }: AppointmentCardProps) {
  const typeLabel = getTypeLabel(apt.type, isEnglish);
  const TypeIcon = apt.type === 'telehealth' ? Video : MapPin;
  const showMeetingLink = apt.status === 'confirmed' && apt.type === 'telehealth' && apt.meetingLink;

  return (
    <Link
      to={`/appointments/${apt.id}`}
      className={`block p-4 rounded-xl transition-all group border ${isDarkMode ? 'bg-slate-800 hover:bg-emerald-900/30 border-slate-700 hover:border-emerald-700' : 'bg-gray-50 hover:bg-emerald-50 border-transparent hover:border-emerald-200'}`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-3">
          <img
            src={apt.doctorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(apt.doctorId)}`}
            alt={apt.doctorName}
            className="w-10 h-10 rounded-full"
          />
          <div>
            <p className={`font-medium ${isDarkMode ? 'text-white group-hover:text-emerald-400' : 'text-gray-800 group-hover:text-emerald-700'}`}>{apt.doctorName}</p>
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{apt.doctorSpecialty}</p>
          </div>
        </div>
        {getStatusBadge(apt.status)}
      </div>
      <div className={`flex items-center gap-4 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
        <span className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          {formatDate(apt.appointmentDate)}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          {apt.appointmentTime}
        </span>
        <span className="flex items-center gap-1">
          <TypeIcon className="w-4 h-4" />
          {typeLabel}
        </span>
      </div>

      {showMeetingLink && (
        <div className={`mt-3 pt-3 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <a
            href={apt.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Video className="w-4 h-4" />
            {isEnglish ? 'Join Meeting' : 'เข้าร่วมการประชุม'}
          </a>
        </div>
      )}
    </Link>
  );
}

interface NotificationsSummaryProps {
  readonly isDarkMode: boolean;
  readonly isEnglish: boolean;
  readonly pendingAppointments: Appointment[];
  readonly pendingCount: number;
}

function NotificationsSummary({ isDarkMode, isEnglish, pendingAppointments, pendingCount }: NotificationsSummaryProps) {
  const hasPending = pendingCount > 0;
  return (
    <div className={`rounded-xl border p-4 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-semibold flex items-center gap-2 ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>
          <Bell className="w-5 h-5 text-orange-500" />
          {isEnglish ? 'Notifications' : 'การแจ้งเตือน'}
        </h3>
        <span className={`text-xs px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-orange-900/50 text-orange-300' : 'bg-orange-100 text-orange-600'}`}>
          {pendingCount} {isEnglish ? 'items' : 'รายการ'}
        </span>
      </div>
      {hasPending ? (
        <div className="space-y-2">
          {pendingAppointments.slice(0, 2).map((apt) => (
            <div key={apt.id} className={`flex items-center gap-3 p-2 rounded-lg text-sm ${isDarkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'}`}>
              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
              <span className={isDarkMode ? 'text-yellow-300' : 'text-yellow-800'}>
                {isEnglish ? 'Awaiting doctor confirmation' : 'รอแพทย์ยืนยันนัดหมาย'} - {apt.doctorName}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
          {isEnglish ? 'No new notifications' : 'ไม่มีการแจ้งเตือนใหม่'}
        </p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { t, theme } = useSettings();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  
  const isDarkMode = theme === 'dark';
  const isEnglish = (t('common.loading') === 'Loading...');

  const quickActions = [
    { icon: Calendar, label: t('dashboard.bookAppointment'), path: '/appointments/book', color: 'from-blue-500 to-blue-600' },
    { icon: MessageCircle, label: t('dashboard.consultAI'), path: '/ai-doctor', color: 'from-purple-500 to-purple-600' },
    { icon: FileText, label: t('dashboard.healthRecords'), path: '/phr', color: 'from-emerald-500 to-emerald-600' },
    { icon: BookOpen, label: t('dashboard.healthLibrary') || (isEnglish ? 'Health Library' : 'คลังความรู้สุขภาพ'), path: '/health-library', color: 'from-orange-500 to-orange-600' },
  ];


  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      const patientId = user.patientId || user.id;
      const appts = await appointmentService.getByPatient(patientId).catch(() => []);
      // Filter upcoming non-cancelled appointments
      const upcoming = appts
        .filter((a: Appointment) => {
          const aptDate = new Date(a.appointmentDate);
          return aptDate >= new Date() && a.status !== 'cancelled';
        })
        .sort((a: Appointment, b: Appointment) => 
          new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()
        )
        .slice(0, 3);
      setAppointments(upcoming);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string | Date) => {
    const locale = isEnglish ? 'en-US' : 'th-TH';
    return new Date(date).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
      confirmed: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
      completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] || styles.pending}`}>
        {t(`status.${status}`)}
      </span>
    );
  };

  const pendingAppointments = appointments.filter((appointment) => appointment.status === 'pending');
  const pendingAppointmentsCount = pendingAppointments.length;

  let appointmentContent = null;
  if (loading) {
    appointmentContent = (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={`skeleton-${i}`} className={`animate-pulse h-20 rounded-xl ${isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`} />
        ))}
      </div>
    );
  } else if (appointments.length === 0) {
    appointmentContent = (
      <div className={`text-center py-8 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
        <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p className="mb-2">{t('dashboard.noAppointments')}</p>
        <Link
          to="/appointments/book"
          className="inline-flex items-center gap-1 text-emerald-500 text-sm hover:underline font-medium"
        >
          <Plus className="w-4 h-4" /> {t('dashboard.makeAppointment')}
        </Link>
      </div>
    );
  } else {
    appointmentContent = (
      <div className="space-y-3">
        {appointments.map((apt) => (
          <AppointmentCard
            key={apt.id}
            apt={apt}
            isDarkMode={isDarkMode}
            isEnglish={isEnglish}
            formatDate={formatDate}
            getStatusBadge={getStatusBadge}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 rounded-2xl p-6 mb-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NCAwLTE4IDguMDYtMTggMThzOC4wNiAxOCAxOCAxOCAxOC04LjA2IDE4LTE4LTguMDYtMTgtMTgtMTh6bTAgMzJjLTcuNzMyIDAtMTQtNi4yNjgtMTQtMTRzNi4yNjgtMTQgMTQtMTQgMTQgNi4yNjggMTQgMTQtNi4yNjggMTQtMTQgMTR6IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')] opacity-30" />
        <div className="relative flex items-center gap-4">
          <img
            src={user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.id || 'default')}`}
            alt={user?.name}
            className="w-16 h-16 rounded-full border-3 border-white/30 shadow-lg"
          />
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{t('dashboard.hello')}, {user?.name?.split(' ')[0]} 👋</h1>
            <p className="text-emerald-100 mt-1">{t('dashboard.welcome')}</p>
          </div>
          <Link
            to="/appointments/book"
            className="hidden sm:flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-xl transition-all"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">{isEnglish ? 'Book' : 'นัดหมาย'}</span>
          </Link>
        </div>
      </div>

      {/* Main Content Grid - Left: Quick Actions & Appointments, Right: Health Studio */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left Column - Quick Actions & Appointments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.path}
                to={action.path}
                className={`group relative rounded-xl p-4 border hover:shadow-lg transition-all overflow-hidden ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <p className={`font-medium group-hover:text-emerald-500 transition-colors ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>{action.label}</p>
              </Link>
            ))}
          </div>

          {/* Upcoming Appointments */}
          <div className={`rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
            <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
              <h2 className={`text-lg font-semibold flex items-center gap-2 ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>
                <Calendar className="w-5 h-5 text-emerald-600" />
                {t('dashboard.upcomingAppointments')}
              </h2>
              <Link to="/appointments" className="text-emerald-500 text-sm hover:underline flex items-center">
                {t('dashboard.viewAll')} <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="p-4">
              {appointmentContent}
            </div>
          </div>

          {/* Notifications Summary */}
          <NotificationsSummary
            isDarkMode={isDarkMode}
            isEnglish={isEnglish}
            pendingAppointments={pendingAppointments}
            pendingCount={pendingAppointmentsCount}
          />
        </div>

        {/* Right Column - Health Studio & AI Chat (Larger Area) */}
        <div className="lg:col-span-3 space-y-6">
          <HealthStudio />
          <AIHealthChat className="sticky top-4" />
        </div>
      </div>
    </div>
  );
}
