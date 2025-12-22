import React, { ReactNode, useState, useEffect } from 'react';
import { User, Page, Appointment } from '../types';
import {
  Home,
  Calendar,
  Activity,
  FileText,
  User as UserIcon,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  MessageSquare,
  Heart,
  Shield,
  MapPin,
  CreditCard,
  Stethoscope,
  Video,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';

interface MainLayoutProps {
  user: User;
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
  children: ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  user,
  currentPage,
  onNavigate,
  onLogout,
  children,
}) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        user={user}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onLogout={onLogout}
      />

      <div className="flex">
        <Sidebar
          currentPage={currentPage}
          onNavigate={onNavigate}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 p-6 lg:ml-64">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

interface HeaderProps {
  user: User;
  onToggleSidebar: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onToggleSidebar, onLogout }) => {
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu className="w-6 h-6 text-gray-600" />
            </button>

            <div className="flex items-center gap-3">
              <img src="/IzaraLogo.jpg" alt="Izara" className="h-10" />
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-800">Izara</h1>
                <p className="text-xs text-gray-500">Patient Portal</p>
              </div>
            </div>
          </div>

          <div className="flex-1 max-w-2xl mx-4 hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="ค้นหาแพทย์, โรค, อาการ..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-gray-100 relative">
              <Bell className="w-6 h-6 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            <button className="p-2 rounded-lg hover:bg-gray-100">
              <MessageSquare className="w-6 h-6 text-gray-600" />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100"
              >
                <img
                  src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.id)}`}
                  alt={user.name}
                  className="w-8 h-8 rounded-full"
                />
                <span className="hidden md:block text-sm font-medium text-gray-700">
                  {user.name}
                </span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <LogOut className="w-4 h-4" />
                    ออกจากระบบ
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  isOpen: boolean;
  onClose: () => void;
}

// Mini Calendar Component
const MiniCalendar: React.FC<{ onNavigate: (page: Page) => void }> = ({ onNavigate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  
  useEffect(() => {
    // Load appointments from localStorage or API
    const stored = localStorage.getItem('izara_user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        const patientId = user.patientId || user.id;
        fetch(`/api/appointments/patient/${patientId}`)
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) setAppointments(data.slice(0, 3));
          })
          .catch(() => {});
      } catch {}
    }
  }, []);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const today = new Date();
  
  const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  const hasAppointment = (day: number) => {
    return appointments.some(apt => {
      const aptDate = new Date(apt.appointmentDate);
      return aptDate.getDate() === day && 
             aptDate.getMonth() === currentDate.getMonth() && 
             aptDate.getFullYear() === currentDate.getFullYear();
    });
  };

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="p-1 hover:bg-white/50 rounded"><ChevronLeft className="w-4 h-4" /></button>
        <span className="text-sm font-medium text-gray-700">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear() + 543}</span>
        <button onClick={nextMonth} className="p-1 hover:bg-white/50 rounded"><ChevronRight className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {dayNames.map(day => (
          <div key={day} className="text-gray-500 font-medium py-1">{day}</div>
        ))}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isToday = today.getDate() === day && today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();
          const hasApt = hasAppointment(day);
          return (
            <div
              key={day}
              className={`py-1 rounded-full text-xs relative cursor-pointer hover:bg-white/50 ${
                isToday ? 'bg-emerald-500 text-white font-bold' : 'text-gray-700'
              }`}
            >
              {day}
              {hasApt && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-red-500 rounded-full" />}
            </div>
          );
        })}
      </div>
      {appointments.length > 0 && (
        <div className="mt-2 pt-2 border-t border-emerald-200">
          <p className="text-xs font-medium text-gray-600 mb-1">นัดหมายที่จะถึง:</p>
          {appointments.slice(0, 2).map(apt => (
            <div key={apt.id} className="flex items-center gap-2 text-xs py-1 px-2 bg-white/50 rounded mb-1">
              <Clock className="w-3 h-3 text-emerald-600" />
              <span className="truncate">{apt.doctorName}</span>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={() => onNavigate('appointments')}
        className="w-full mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
      >
        ดูนัดหมายทั้งหมด →
      </button>
    </div>
  );
};

// Mini Map Component
const MiniMap: React.FC<{ onNavigate: (page: Page) => void }> = ({ onNavigate }) => {
  const [location, setLocation] = useState({ lat: 13.7563, lng: 100.5018 }); // Bangkok default
  const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}, // Keep default
        { timeout: 5000 }
      );
    }
  }, []);

  return (
    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-3 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="w-4 h-4 text-orange-600" />
        <span className="text-sm font-medium text-gray-700">สถานพยาบาลใกล้เคียง</span>
      </div>
      <div className="h-24 rounded-lg overflow-hidden bg-gray-200">
        {MAPS_API_KEY ? (
          <iframe
            src={`https://www.google.com/maps/embed/v1/search?key=${MAPS_API_KEY}&q=hospital+near+${location.lat},${location.lng}&zoom=13`}
            className="w-full h-full border-0"
            loading="lazy"
            title="Nearby hospitals"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <MapPin className="w-8 h-8" />
          </div>
        )}
      </div>
      <button
        onClick={() => onNavigate('map')}
        className="w-full mt-2 text-xs text-orange-600 hover:text-orange-700 font-medium"
      >
        ดูแผนที่เต็ม →
      </button>
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, isOpen, onClose }) => {
  const menuItems = [
    { icon: Home, label: 'หน้าหลัก', page: 'home' as Page },
    { icon: Calendar, label: 'นัดหมาย', page: 'appointments' as Page },
    { icon: Stethoscope, label: 'AI Doctor', page: 'ai_doctor' as Page },
    { icon: Activity, label: 'บันทึกสุขภาพ', page: 'phr' as Page },
    { icon: FileText, label: 'ประวัติการรักษา', page: 'medical_journey' as Page },
    { icon: Video, label: 'บันทึกวิดีโอ', page: 'recordings' as Page },
    { icon: Heart, label: 'Living Will', page: 'living_will' as Page },
    { icon: Shield, label: 'ความเป็นส่วนตัว', page: 'pdpa_consent' as Page },
    { icon: MapPin, label: 'แผนที่', page: 'map' as Page },
    { icon: CreditCard, label: 'การชำระเงิน', page: 'payments' as Page },
    { icon: UserIcon, label: 'โปรไฟล์', page: 'profile' as Page },
    { icon: Settings, label: 'ตั้งค่า', page: 'settings' as Page },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 w-64 transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:top-[73px]`}
      >
        <div className="p-4 lg:hidden flex justify-between items-center border-b">
          <h2 className="font-semibold text-gray-800">เมนู</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.page;

            return (
              <button
                key={item.page}
                onClick={() => {
                  onNavigate(item.page);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-gray-500'}`} />
                <span className="text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Mini Widgets */}
        <div className="p-4 border-t border-gray-100">
          <MiniCalendar onNavigate={onNavigate} />
          <MiniMap onNavigate={onNavigate} />
        </div>
      </aside>
    </>
  );
};
