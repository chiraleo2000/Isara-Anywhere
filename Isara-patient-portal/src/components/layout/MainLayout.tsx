import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { NotificationBell } from '../notifications/NotificationBell';
import { SettingsDropdown } from '../ui/SettingsDropdown';
import {
  Home,
  Calendar,
  MessageCircle,
  FileText,
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

// Mini Calendar Component - With dark mode and i18n support
function MiniCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { theme, language } = useSettings();
  const today = new Date();
  const isDark = theme === 'dark';
  
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const monthNames = language === 'th' 
    ? ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNames = language === 'th'
    ? ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
    : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  
  const isToday = (day: number) => 
    today.getDate() === day && 
    today.getMonth() === currentDate.getMonth() && 
    today.getFullYear() === currentDate.getFullYear();

  const year = language === 'th' ? currentDate.getFullYear() + 543 : currentDate.getFullYear();

  return (
    <div className={`rounded-xl p-3 ${isDark ? 'bg-gradient-to-br from-emerald-900/50 to-teal-900/50' : 'bg-gradient-to-br from-emerald-50 to-teal-50'}`}>
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className={`p-1 rounded ${isDark ? 'hover:bg-white/10' : 'hover:bg-white/50'}`}>
          <ChevronLeft className={`w-4 h-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
        </button>
        <span className={`text-xs font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
          {monthNames[currentDate.getMonth()]} {year}
        </span>
        <button onClick={nextMonth} className={`p-1 rounded ${isDark ? 'hover:bg-white/10' : 'hover:bg-white/50'}`}>
          <ChevronRight className={`w-4 h-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {dayNames.map(day => (
          <div key={day} className={`text-[10px] font-medium py-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{day}</div>
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
                : isDark 
                  ? 'text-gray-300 hover:bg-white/10' 
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

export default function MainLayout() {
  const { user, logout } = useAuth();
  const { theme, language } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const isDarkMode = theme === 'dark';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Navigation items with language support
  const navItems = [
    { icon: Home, label: language === 'th' ? 'หน้าหลัก' : 'Home', path: '/' },
    { icon: Calendar, label: language === 'th' ? 'นัดหมาย' : 'Appointments', path: '/appointments' },
    { icon: MessageCircle, label: language === 'th' ? 'ปรึกษา AI' : 'AI Doctor', path: '/ai-doctor' },
    { icon: BookOpen, label: language === 'th' ? 'คลังความรู้สุขภาพ' : 'Health Library', path: '/health-library' },
    { icon: FileText, label: language === 'th' ? 'ประวัติสุขภาพ' : 'Health Records', path: '/phr' },
    { icon: Activity, label: language === 'th' ? 'เส้นทางสุขภาพ' : 'Health Timeline', path: '/timeline' },
    { icon: Shield, label: language === 'th' ? 'PDPA & Living Will' : 'PDPA & Living Will', path: '/pdpa' },
    { icon: Settings, label: language === 'th' ? 'ตั้งค่า' : 'Settings', path: '/settings' },
  ];

  return (
    <div className={`min-h-screen flex ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 lg:translate-x-0 lg:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r`}>
        <div className="flex flex-col h-full">
          <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
            <Link to="/" className="flex items-center gap-3">
              <img src="/IzaraLogo.png" alt="Izara" className="w-10 h-10 object-contain" />
              <div>
                <h1 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Izara</h1>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Patient Portal</p>
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
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                      : isDarkMode 
                        ? 'text-gray-300 hover:bg-gray-700' 
                        : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : ''}`} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Mini Calendar Widget */}
          <div className="px-4 pb-2 space-y-3">
            <MiniCalendar />
          </div>

          <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
            <div className="flex items-center gap-3 mb-4">
              <img
                src={user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.id || 'default')}`}
                alt={user?.name}
                className="w-10 h-10 rounded-full"
              />
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{user?.name}</p>
                <p className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{user?.email}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                to="/profile"
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg ${
                  isDarkMode 
                    ? 'text-gray-300 bg-gray-700 hover:bg-gray-600' 
                    : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <User className="w-4 h-4" />
                {language === 'th' ? 'โปรไฟล์' : 'Profile'}
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50"
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
        <header className={`sticky top-0 z-30 border-b px-4 py-3 lg:hidden ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className={`p-2 rounded-lg ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <img src="/IzaraLogo.png" alt="Izara" className="w-8 h-8 object-contain" />
              <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Izara</span>
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
        <header className={`hidden lg:flex sticky top-0 z-30 border-b px-6 py-3 items-center justify-end ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
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
                <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{user?.name}</p>
              </div>
            </div>
          </div>
        </header>

        <main className={`flex-1 p-4 lg:p-6 overflow-auto ${isDarkMode ? 'bg-gray-900' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
