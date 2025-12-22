import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, Lock, Globe, Moon, LogOut, ChevronRight, Shield } from 'lucide-react';

// Helper to get/set localStorage values
const getStoredValue = <T,>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setStoredValue = <T,>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
};

export default function SettingsPage() {
  const { logout } = useAuth();
  const [notifications, setNotifications] = useState(() => 
    getStoredValue('izara_notifications', {
      appointments: true,
      medications: true,
    })
  );
  const [darkMode, setDarkMode] = useState(() => 
    getStoredValue('izara_dark_mode', false)
  );
  const [language, setLanguage] = useState(() => 
    getStoredValue('izara_language', 'th')
  );

  // Apply dark mode to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#1a1a2e';
      document.body.style.color = '#ffffff';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
    }
    setStoredValue('izara_dark_mode', darkMode);
  }, [darkMode]);

  // Save language preference
  useEffect(() => {
    setStoredValue('izara_language', language);
    // Update html lang attribute
    document.documentElement.lang = language;
  }, [language]);

  // Save notifications preference
  useEffect(() => {
    setStoredValue('izara_notifications', notifications);
  }, [notifications]);

  const handleLogout = async () => {
    if (confirm(language === 'th' ? 'ต้องการออกจากระบบหรือไม่?' : 'Do you want to logout?')) {
      await logout();
    }
  };

  // Labels based on language
  const labels = {
    title: language === 'th' ? 'ตั้งค่า' : 'Settings',
    notifications: language === 'th' ? 'การแจ้งเตือน' : 'Notifications',
    appointmentReminder: language === 'th' ? 'แจ้งเตือนนัดหมาย' : 'Appointment Reminder',
    appointmentDesc: language === 'th' ? 'รับการแจ้งเตือนก่อนถึงเวลานัดหมาย' : 'Receive reminders before appointments',
    medicationReminder: language === 'th' ? 'แจ้งเตือนยา' : 'Medication Reminder',
    medicationDesc: language === 'th' ? 'รับการแจ้งเตือนเวลาทานยา' : 'Receive reminders to take medication',
    languageDisplay: language === 'th' ? 'ภาษาและการแสดงผล' : 'Language & Display',
    languageLabel: language === 'th' ? 'ภาษา' : 'Language',
    languageDesc: language === 'th' ? 'เลือกภาษาที่ใช้แสดงผล' : 'Select display language',
    darkModeLabel: language === 'th' ? 'โหมดมืด' : 'Dark Mode',
    darkModeDesc: language === 'th' ? 'เปลี่ยนเป็นธีมสีเข้ม' : 'Switch to dark theme',
    security: language === 'th' ? 'ความปลอดภัย' : 'Security',
    changePassword: language === 'th' ? 'เปลี่ยนรหัสผ่าน' : 'Change Password',
    logout: language === 'th' ? 'ออกจากระบบ' : 'Logout',
    version: 'Izara Patient Portal v1.0.0',
    comingSoon: language === 'th' ? 'เร็วๆ นี้' : 'Coming soon',
  };

  const cardClass = darkMode 
    ? 'bg-gray-800 border-gray-700' 
    : 'bg-white border-gray-100';
  
  const textClass = darkMode ? 'text-gray-100' : 'text-gray-800';
  const subTextClass = darkMode ? 'text-gray-400' : 'text-gray-500';
  const dividerClass = darkMode ? 'divide-gray-700 border-gray-700' : 'divide-gray-100 border-gray-100';

  return (
    <div className={`max-w-2xl mx-auto space-y-6 ${darkMode ? 'text-white' : ''}`}>
      <h1 className={`text-2xl font-bold ${textClass}`}>{labels.title}</h1>

      {/* Notifications Section */}
      <div className={`rounded-2xl border overflow-hidden ${cardClass}`}>
        <div className={`px-6 py-4 border-b ${dividerClass}`}>
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-emerald-600" />
            <h2 className={`font-semibold ${textClass}`}>{labels.notifications}</h2>
          </div>
        </div>
        <div className={`divide-y ${dividerClass}`}>
          <ToggleItem
            label={labels.appointmentReminder}
            description={labels.appointmentDesc}
            checked={notifications.appointments}
            onChange={(v) => setNotifications({ ...notifications, appointments: v })}
            darkMode={darkMode}
          />
          <ToggleItem
            label={labels.medicationReminder}
            description={labels.medicationDesc}
            checked={notifications.medications}
            onChange={(v) => setNotifications({ ...notifications, medications: v })}
            darkMode={darkMode}
          />
        </div>
      </div>

      {/* Language & Display Section */}
      <div className={`rounded-2xl border overflow-hidden ${cardClass}`}>
        <div className={`px-6 py-4 border-b ${dividerClass}`}>
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-emerald-600" />
            <h2 className={`font-semibold ${textClass}`}>{labels.languageDisplay}</h2>
          </div>
        </div>
        <div className={`divide-y ${dividerClass}`}>
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className={`font-medium ${textClass}`}>{labels.languageLabel}</p>
              <p className={`text-sm ${subTextClass}`}>{labels.languageDesc}</p>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={`px-4 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-200 text-gray-800'
              }`}
            >
              <option value="th">ไทย</option>
              <option value="en">English</option>
            </select>
          </div>
          <ToggleItem
            label={labels.darkModeLabel}
            description={labels.darkModeDesc}
            checked={darkMode}
            onChange={setDarkMode}
            icon={<Moon className={`w-5 h-5 ${darkMode ? 'text-yellow-400' : 'text-gray-400'}`} />}
            darkMode={darkMode}
          />
        </div>
      </div>

      {/* Security Section */}
      <div className={`rounded-2xl border overflow-hidden ${cardClass}`}>
        <div className={`px-6 py-4 border-b ${dividerClass}`}>
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-emerald-600" />
            <h2 className={`font-semibold ${textClass}`}>{labels.security}</h2>
          </div>
        </div>
        <div className={`divide-y ${dividerClass}`}>
          <LinkItem
            icon={<Lock className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />}
            label={labels.changePassword}
            onClick={() => alert(labels.comingSoon)}
            darkMode={darkMode}
          />
        </div>
      </div>

      {/* Logout Section */}
      <div className={`rounded-2xl border overflow-hidden ${cardClass}`}>
        <button
          onClick={handleLogout}
          className="w-full px-6 py-4 flex items-center gap-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">{labels.logout}</span>
        </button>
      </div>

      <p className={`text-center text-sm ${subTextClass}`}>
        {labels.version}
      </p>
    </div>
  );
}

function ToggleItem({
  label,
  description,
  checked,
  onChange,
  icon,
  darkMode = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon?: React.ReactNode;
  darkMode?: boolean;
}) {
  const textClass = darkMode ? 'text-gray-100' : 'text-gray-800';
  const subTextClass = darkMode ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className="px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className={`font-medium ${textClass}`}>{label}</p>
          <p className={`text-sm ${subTextClass}`}>{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-12 h-6 rounded-full transition-colors ${checked ? 'bg-emerald-500' : darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}
      >
        <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${checked ? 'translate-x-6' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

function LinkItem({
  icon,
  label,
  onClick,
  darkMode = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  darkMode?: boolean;
}) {
  const textClass = darkMode ? 'text-gray-100' : 'text-gray-800';
  const hoverClass = darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50';

  return (
    <button onClick={onClick} className={`w-full px-6 py-4 flex items-center justify-between ${hoverClass} transition-colors`}>
      <div className="flex items-center gap-3">
        {icon}
        <span className={`font-medium ${textClass}`}>{label}</span>
      </div>
      <ChevronRight className={`w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
    </button>
  );
}
