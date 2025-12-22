import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { appointmentService } from '../../lib/services';
import { Appointment } from '../../types';
import { HealthStudio, AIHealthChat } from '../../components/health';
import {
  Calendar,
  MessageCircle,
  FileText,
  MapPin,
  Clock,
  ChevronRight,
  Video,
  Bell,
  Plus,
} from 'lucide-react';

const quickActions = [
  { icon: Calendar, label: 'นัดหมายแพทย์', path: '/appointments/book', color: 'from-blue-500 to-blue-600' },
  { icon: MessageCircle, label: 'ปรึกษา AI', path: '/ai-doctor', color: 'from-purple-500 to-purple-600' },
  { icon: FileText, label: 'ประวัติสุขภาพ', path: '/phr', color: 'from-emerald-500 to-emerald-600' },
  { icon: MapPin, label: 'ค้นหาสถานพยาบาล', path: '/map', color: 'from-orange-500 to-orange-600' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const patientId = user!.patientId || user!.id;
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
    return new Date(date).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-green-100 text-green-700',
      completed: 'bg-blue-100 text-blue-700',
    };
    const labels: Record<string, string> = {
      pending: 'รอยืนยัน',
      confirmed: 'ยืนยันแล้ว',
      completed: 'เสร็จสิ้น',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

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
            <h1 className="text-2xl font-bold">สวัสดี, {user?.name?.split(' ')[0]} 👋</h1>
            <p className="text-emerald-100 mt-1">ยินดีต้อนรับสู่ Izara Patient Portal</p>
          </div>
          <Link
            to="/appointments/book"
            className="hidden sm:flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-xl transition-all"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">นัดหมาย</span>
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
                className="group relative bg-white rounded-xl p-4 border border-gray-100 hover:shadow-lg transition-all overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <p className="font-medium text-gray-800 group-hover:text-emerald-700 transition-colors">{action.label}</p>
              </Link>
            ))}
          </div>

          {/* Upcoming Appointments */}
          <div className="bg-white rounded-xl border border-gray-100">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                นัดหมายที่จะถึง
              </h2>
              <Link to="/appointments" className="text-emerald-600 text-sm hover:underline flex items-center">
                ดูทั้งหมด <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="p-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="animate-pulse bg-gray-100 h-20 rounded-xl" />
                  ))}
                </div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="mb-2">ไม่มีนัดหมายที่จะถึง</p>
                  <Link 
                    to="/appointments/book" 
                    className="inline-flex items-center gap-1 text-emerald-600 text-sm hover:underline font-medium"
                  >
                    <Plus className="w-4 h-4" /> นัดหมายแพทย์
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments.map((apt) => (
                    <Link
                      key={apt.id}
                      to={`/appointments/${apt.id}`}
                      className="block p-4 bg-gray-50 rounded-xl hover:bg-emerald-50 transition-all group border border-transparent hover:border-emerald-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <img
                            src={apt.doctorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(apt.doctorId)}`}
                            alt={apt.doctorName}
                            className="w-10 h-10 rounded-full"
                          />
                          <div>
                            <p className="font-medium text-gray-800 group-hover:text-emerald-700">{apt.doctorName}</p>
                            <p className="text-sm text-gray-600">{apt.doctorSpecialty}</p>
                          </div>
                        </div>
                        {getStatusBadge(apt.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(apt.appointmentDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {apt.appointmentTime}
                        </span>
                        <span className="flex items-center gap-1">
                          {apt.type === 'telehealth' ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                          {apt.type === 'telehealth' ? 'ออนไลน์' : 'โรงพยาบาล'}
                        </span>
                      </div>
                      
                      {/* Meeting Link for Confirmed Telehealth */}
                      {apt.status === 'confirmed' && apt.type === 'telehealth' && apt.meetingLink && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <a
                            href={apt.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Video className="w-4 h-4" />
                            เข้าร่วมการประชุม
                          </a>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Notifications Summary */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Bell className="w-5 h-5 text-orange-500" />
                การแจ้งเตือน
              </h3>
              <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                {appointments.filter(a => a.status === 'pending').length} รายการ
              </span>
            </div>
            {appointments.filter(a => a.status === 'pending').length > 0 ? (
              <div className="space-y-2">
                {appointments.filter(a => a.status === 'pending').slice(0, 2).map((apt) => (
                  <div key={apt.id} className="flex items-center gap-3 p-2 bg-yellow-50 rounded-lg text-sm">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                    <span className="text-yellow-800">รอแพทย์ยืนยันนัดหมาย - {apt.doctorName}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">ไม่มีการแจ้งเตือนใหม่</p>
            )}
          </div>
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
