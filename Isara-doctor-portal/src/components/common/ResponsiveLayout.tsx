/**
 * Responsive Layout Components for Mobile/Tablet/Desktop
 * รองรับหน้าจอมือถือ แท็บเล็ต และเดสก์ท็อป
 */

import React, { useState, ReactNode } from 'react';
import { User } from '../../types';
import { useResponsive } from '../../hooks/useResponsive';
import { DoctorNotificationBell } from '../notifications/DoctorNotificationBell';
import { SettingsDropdown } from './SettingsDropdown';
import {
  HomeIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  VideoCameraIcon,
  UserGroupIcon,
  AcademicCapIcon,
  BookOpenIcon,
  ClockIcon,
} from '../../assets/NewSvgIcons';

// Shield icon for admin
const ShieldCheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

// ============================================================================
// MINI CALENDAR COMPONENT
// ============================================================================

const MiniCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const { firstDay, daysInMonth } = getDaysInMonth(currentDate);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    return (
      day === selectedDate.getDate() &&
      currentDate.getMonth() === selectedDate.getMonth() &&
      currentDate.getFullYear() === selectedDate.getFullYear()
    );
  };

  const handleDayClick = (day: number) => {
    setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
  };

  const renderDays = () => {
    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-6 h-6" />);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const today = isToday(day);
      const selected = isSelected(day);
      days.push(
        <button
          key={day}
          onClick={() => handleDayClick(day)}
          className={`w-6 h-6 text-xs rounded-full flex items-center justify-center transition-colors
            ${today ? 'bg-emerald-600 text-white font-bold' : ''}
            ${selected && !today ? 'bg-emerald-100 text-emerald-700 font-semibold' : ''}
            ${!today && !selected ? 'hover:bg-gray-100 text-gray-700' : ''}
          `}
        >
          {day}
        </button>
      );
    }
    
    return days;
  };

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-3 border border-emerald-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={prevMonth}
          className="p-1 hover:bg-emerald-100 rounded transition-colors"
        >
          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-emerald-800">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </span>
        <button
          onClick={nextMonth}
          className="p-1 hover:bg-emerald-100 rounded transition-colors"
        >
          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Days of Week */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {daysOfWeek.map((day) => (
          <div key={day} className="w-6 h-5 text-center text-xs font-medium text-emerald-600">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {renderDays()}
      </div>

      {/* Selected Date Display */}
      <div className="mt-2 pt-2 border-t border-emerald-200 text-center">
        <p className="text-xs text-emerald-700">
          Selected: {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// RESPONSIVE CONTAINER
// ============================================================================

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`w-full mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
};

// ============================================================================
// MOBILE NAVIGATION
// ============================================================================

interface MobileNavProps {
  user: User;
  currentView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  user,
  currentView,
  onNavigate,
  onLogout,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const isAdmin = user.isAdmin || user.role === 'admin';

  // Base nav items - Thai labels primary
  const baseNavItems = [
    { id: 'dashboard', label: 'แดชบอร์ด', icon: HomeIcon },
    { id: 'schedule', label: 'ตารางนัด', icon: CalendarDaysIcon },
    { id: 'availability', label: 'เวลาว่าง', icon: ClockIcon },
    { id: 'patients', label: 'ผู้ป่วย', icon: ClipboardDocumentListIcon },
    { id: 'health-meeting', label: 'นัดหมาย', icon: VideoCameraIcon },
    { id: 'medical-consultants', label: 'ที่ปรึกษา', icon: UserGroupIcon },
    { id: 'medical-content', label: 'เนื้อหา', icon: BookOpenIcon },
    { id: 'clinical-resources', label: 'ทรัพยากร', icon: AcademicCapIcon },
  ];

  // Admin-only menu items - Thai labels
  const adminNavItems = [
    { id: 'doctors', label: 'จัดการแพทย์', icon: UserGroupIcon },
    { id: 'doctor-management', label: 'อนุมัติแพทย์', icon: ShieldCheckIcon },
  ];

  const navItems = isAdmin ? [...baseNavItems, ...adminNavItems] : baseNavItems;

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
        <div className="flex items-center justify-between p-4">
          {/* Logo - Clickable */}
          <button
            onClick={() => {
              onNavigate('dashboard');
              setShowMenu(false);
            }}
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
          >
            <img src="/IzaraLogo.png" alt="Izara" className="h-8 w-auto" />
            <span className="font-bold text-gray-900">Doctor</span>
          </button>

          {/* Notification Bell and Settings */}
          <div className="flex items-center gap-2">
            <SettingsDropdown />
            <DoctorNotificationBell onNavigate={onNavigate} />
          </div>

          {/* Menu Button */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            {showMenu ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {showMenu && (
          <div className="border-t border-gray-200 bg-white">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <img
                  src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.email || user.id)}`}
                  alt={user.name}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
            </div>

            <nav className="py-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setShowMenu(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors ${
                      currentView === item.id
                        ? 'bg-emerald-50 text-emerald-600 border-l-4 border-emerald-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="border-t border-gray-200 p-4">
              <button
                onClick={onLogout}
                className="w-full py-2 px-4 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="grid grid-cols-5 gap-1">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center justify-center py-2 transition-colors ${
                  currentView === item.id
                    ? 'text-emerald-600'
                    : 'text-gray-500'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs mt-1">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

// ============================================================================
// DESKTOP SIDEBAR
// ============================================================================

interface DesktopSidebarProps {
  user: User;
  currentView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  user,
  currentView,
  onNavigate,
  onLogout,
}) => {
  const isAdmin = user.isAdmin || user.role === 'admin';

  // Base nav items - Thai labels primary
  const baseNavItems = [
    { id: 'dashboard', label: 'แดชบอร์ด', icon: HomeIcon },
    { id: 'schedule', label: 'ตารางนัดหมาย', icon: CalendarDaysIcon },
    { id: 'availability', label: 'เวลาว่างของฉัน', icon: ClockIcon },
    { id: 'patients', label: 'ผู้ป่วย', icon: ClipboardDocumentListIcon },
    { id: 'health-meeting', label: 'นัดหมาย & ประชุม', icon: VideoCameraIcon },
    { id: 'medical-consultants', label: 'ที่ปรึกษาแพทย์', icon: UserGroupIcon },
    { id: 'medical-content', label: 'เนื้อหาทางการแพทย์', icon: BookOpenIcon },
    { id: 'clinical-resources', label: 'ทรัพยากรทางคลินิก', icon: AcademicCapIcon },
  ];

  // Admin-only menu items - Thai labels
  const adminNavItems = [
    { id: 'doctors', label: 'จัดการแพทย์', icon: UserGroupIcon },
    { id: 'doctor-management', label: 'อนุมัติแพทย์ใหม่', icon: ShieldCheckIcon },
  ];

  const navItems = isAdmin ? [...baseNavItems, ...adminNavItems] : baseNavItems;

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-gray-200">
      {/* Logo - Clickable */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center space-x-3 hover:bg-gray-50 transition-colors text-left"
        >
          <img src="/IzaraLogo.png" alt="Izara" className="h-10 w-auto" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Izara</h1>
            <p className="text-xs text-gray-500">พอร์ทัลแพทย์</p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <SettingsDropdown />
          <DoctorNotificationBell onNavigate={onNavigate} />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center space-x-3 px-6 py-3 text-left transition-colors ${
                currentView === item.id
                  ? 'bg-emerald-50 text-emerald-600 border-r-4 border-emerald-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Mini Calendar - Above User Profile */}
      <div className="px-4 pb-3">
        <MiniCalendar />
      </div>

      {/* User Profile */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center space-x-3 mb-3">
          <img
            src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.email || user.id)}`}
            alt={user.name}
            className="w-10 h-10 rounded-full"
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
        >
          ออกจากระบบ
        </button>
      </div>
    </aside>
  );
};

// ============================================================================
// RESPONSIVE GRID
// ============================================================================

interface ResponsiveGridProps {
  children: ReactNode;
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: number;
  className?: string;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 4,
  className = '',
}) => {
  const gridCols = `grid-cols-${cols.mobile} sm:grid-cols-${cols.tablet} lg:grid-cols-${cols.desktop}`;
  const gridGap = `gap-${gap}`;

  return (
    <div className={`grid ${gridCols} ${gridGap} ${className}`}>
      {children}
    </div>
  );
};

// ============================================================================
// CARD COMPONENT
// ============================================================================

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  onClick,
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl shadow-sm border border-gray-200 ${paddingClasses[padding]} ${
        onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

// ============================================================================
// MAIN LAYOUT WRAPPER
// ============================================================================

interface ResponsiveLayoutProps {
  user: User;
  currentView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
  children: ReactNode;
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  user,
  currentView,
  onNavigate,
  onLogout,
  children,
}) => {
  const { isMobile } = useResponsive();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <DesktopSidebar
        user={user}
        currentView={currentView}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      {/* Mobile Navigation */}
      <MobileNav
        user={user}
        currentView={currentView}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      {/* Main Content */}
      <main
        className={`
          ${isMobile ? 'pt-16 pb-20' : 'lg:pl-64'}
          min-h-screen overflow-y-auto
        `}
      >
        {children}
      </main>
    </div>
  );
};
