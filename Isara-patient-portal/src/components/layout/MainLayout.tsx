import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationBell } from '../notifications/NotificationBell';
import { SettingsDropdown } from '../ui/SettingsDropdown';
import {
  Home,
  Calendar,
  MessageCircle,
  FileText,
  MapPin,
  Settings,
  LogOut,
  Menu,
  User,
  Activity,
  Shield,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { useState, useEffect } from 'react';

// Mini Calendar Component
function MiniCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
  
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  
  const isToday = (day: number) => 
    today.getDate() === day && 
    today.getMonth() === currentDate.getMonth() && 
    today.getFullYear() === currentDate.getFullYear();

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="p-1 hover:bg-white/50 rounded">
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        <span className="text-xs font-medium text-gray-700">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear() + 543}
        </span>
        <button onClick={nextMonth} className="p-1 hover:bg-white/50 rounded">
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {dayNames.map(day => (
          <div key={day} className="text-[10px] font-medium text-gray-500 py-1">{day}</div>
        ))}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => (
          <div
            key={i + 1}
            className={`text-[10px] py-1 rounded ${
              isToday(i + 1)
                ? 'bg-emerald-500 text-white font-bold'
                : 'text-gray-600 hover:bg-white/50'
            }`}
          >
            {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}

// Mini Map Component
function MiniMap() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setLocation({ lat: 13.7563, lng: 100.5018 }) // Default: Bangkok
      );
    } else {
      setLocation({ lat: 13.7563, lng: 100.5018 });
    }
  }, []);

  return (
    <Link to="/map" className="block">
      <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl overflow-hidden h-50 group cursor-pointer">
        {location && (
          <iframe
            src={`https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d3000!2d${location.lng}!3d${location.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sth!2sth!4v1`}
            className="w-full h-full border-0 pointer-events-none"
            loading="lazy"
            title="Mini Map"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
          <span className="text-white text-xs font-medium flex items-center gap-1">
            <MapPin className="w-3 h-3" /> ดูแผนที่
          </span>
        </div>
        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-medium text-gray-700">ตำแหน่งของคุณ</span>
        </div>
      </div>
    </Link>
  );
}

const navItems = [
  { icon: Home, label: 'หน้าหลัก', path: '/' },
  { icon: Calendar, label: 'นัดหมาย', path: '/appointments' },
  { icon: MessageCircle, label: 'ปรึกษา AI', path: '/ai-doctor' },
  { icon: BookOpen, label: 'คลังความรู้สุขภาพ', path: '/health-library' },
  { icon: FileText, label: 'ประวัติสุขภาพ', path: '/phr' },
  { icon: Activity, label: 'เส้นทางสุขภาพ', path: '/timeline' },
  { icon: Shield, label: 'PDPA & Living Will', path: '/pdpa' },
  { icon: MapPin, label: 'แผนที่', path: '/map' },
  { icon: Settings, label: 'ตั้งค่า', path: '/settings' },
];

export default function MainLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 lg:translate-x-0 lg:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-gray-100">
            <Link to="/" className="flex items-center gap-3">
              <img src="/IzaraLogo.png" alt="Izara" className="w-10 h-10 object-contain" />
              <div>
                <h1 className="font-bold text-gray-800">Izara</h1>
                <p className="text-xs text-gray-500">Patient Portal</p>
              </div>
            </Link>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || 
                (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : ''}`} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Mini Calendar & Map Widgets */}
          <div className="px-4 pb-2 space-y-3">
            <MiniCalendar />
            <MiniMap />
          </div>

          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <img
                src={user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.id || 'default')}`}
                alt={user?.name}
                className="w-10 h-10 rounded-full"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                to="/profile"
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <User className="w-4 h-4" />
                โปรไฟล์
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <img src="/IzaraLogo.png" alt="Izara" className="w-8 h-8 object-contain" />
              <span className="font-bold text-gray-800">Izara</span>
            </div>
            <div className="flex items-center gap-2">
              <SettingsDropdown />
              <NotificationBell />
              <img
                src={user?.avatarUrl || `https://i.pravatar.cc/150?u=${user?.id}`}
                alt={user?.name}
                className="w-8 h-8 rounded-full"
              />
            </div>
          </div>
        </header>

        {/* Desktop Header with Notifications */}
        <header className="hidden lg:flex sticky top-0 z-30 bg-white border-b border-gray-200 px-6 py-3 items-center justify-end">
          <div className="flex items-center gap-4">
            <SettingsDropdown />
            <NotificationBell />
            <div className="flex items-center gap-3">
              <img
                src={user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.id || 'default')}`}
                alt={user?.name}
                className="w-9 h-9 rounded-full"
              />
              <div className="hidden xl:block">
                <p className="text-sm font-medium text-gray-800">{user?.name}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
