import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';

/**
 * Settings Context for Theme and Language
 * ตั้งค่าธีมและภาษาสำหรับพอร์ทัลผู้ป่วย
 */

export type Theme = 'light' | 'dark';
export type Language = 'en' | 'th';

interface SettingsContextType {
  theme: Theme;
  language: Language;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  toggleTheme: () => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

interface Translations {
  [key: string]: {
    en: string;
    th: string;
  };
}

// Comprehensive translations for patient portal
const translations: Translations = {
  // Theme & Settings
  'settings.settings': { en: 'Settings', th: 'ตั้งค่า' },
  'settings.theme': { en: 'Theme', th: 'ธีม' },
  'settings.language': { en: 'Language', th: 'ภาษา' },
  'settings.lightMode': { en: 'Light Mode', th: 'โหมดสว่าง' },
  'settings.darkMode': { en: 'Dark Mode', th: 'โหมดมืด' },

  // Common
  'common.loading': { en: 'Loading...', th: 'กำลังโหลด...' },
  'common.save': { en: 'Save', th: 'บันทึก' },
  'common.cancel': { en: 'Cancel', th: 'ยกเลิก' },
  'common.delete': { en: 'Delete', th: 'ลบ' },
  'common.edit': { en: 'Edit', th: 'แก้ไข' },
  'common.view': { en: 'View', th: 'ดู' },
  'common.back': { en: 'Back', th: 'กลับ' },
  'common.next': { en: 'Next', th: 'ถัดไป' },
  'common.previous': { en: 'Previous', th: 'ก่อนหน้า' },
  'common.search': { en: 'Search', th: 'ค้นหา' },
  'common.filter': { en: 'Filter', th: 'กรอง' },
  'common.confirm': { en: 'Confirm', th: 'ยืนยัน' },
  'common.close': { en: 'Close', th: 'ปิด' },
  'common.submit': { en: 'Submit', th: 'ส่ง' },
  'common.upload': { en: 'Upload', th: 'อัปโหลด' },
  'common.download': { en: 'Download', th: 'ดาวน์โหลด' },
  'common.success': { en: 'Success', th: 'สำเร็จ' },
  'common.error': { en: 'Error', th: 'ข้อผิดพลาด' },

  // Navigation
  'nav.home': { en: 'Home', th: 'หน้าแรก' },
  'nav.dashboard': { en: 'Dashboard', th: 'แดชบอร์ด' },
  'nav.appointments': { en: 'Appointments', th: 'นัดหมาย' },
  'nav.healthRecords': { en: 'Health Records', th: 'ประวัติสุขภาพ' },
  'nav.profile': { en: 'Profile', th: 'โปรไฟล์' },
  'nav.settings': { en: 'Settings', th: 'ตั้งค่า' },
  'nav.logout': { en: 'Logout', th: 'ออกจากระบบ' },
  'nav.aiDoctor': { en: 'AI Doctor', th: 'หมอ AI' },
  'nav.medicalContent': { en: 'Medical Library', th: 'ห้องสมุดการแพทย์' },
  'nav.map': { en: 'Nearby Hospitals', th: 'โรงพยาบาลใกล้เคียง' },
  'nav.timeline': { en: 'Health Timeline', th: 'ไทม์ไลน์สุขภาพ' },
  'nav.pdpa': { en: 'Privacy (PDPA)', th: 'ความเป็นส่วนตัว (PDPA)' },
  'nav.livingWill': { en: 'Living Will', th: 'หนังสือแสดงเจตนา' },

  // Auth
  'auth.login': { en: 'Login', th: 'เข้าสู่ระบบ' },
  'auth.register': { en: 'Register', th: 'ลงทะเบียน' },
  'auth.email': { en: 'Email', th: 'อีเมล' },
  'auth.password': { en: 'Password', th: 'รหัสผ่าน' },
  'auth.confirmPassword': { en: 'Confirm Password', th: 'ยืนยันรหัสผ่าน' },
  'auth.forgotPassword': { en: 'Forgot Password?', th: 'ลืมรหัสผ่าน?' },
  'auth.rememberMe': { en: 'Remember me', th: 'จดจำฉัน' },
  'auth.noAccount': { en: "Don't have an account?", th: 'ยังไม่มีบัญชี?' },
  'auth.hasAccount': { en: 'Already have an account?', th: 'มีบัญชีแล้ว?' },

  // Appointments
  'appointment.bookAppointment': { en: 'Book Appointment', th: 'จองนัดหมาย' },
  'appointment.myAppointments': { en: 'My Appointments', th: 'นัดหมายของฉัน' },
  'appointment.upcoming': { en: 'Upcoming', th: 'กำลังมาถึง' },
  'appointment.past': { en: 'Past', th: 'ที่ผ่านมา' },
  'appointment.cancelled': { en: 'Cancelled', th: 'ยกเลิกแล้ว' },
  'appointment.date': { en: 'Date', th: 'วันที่' },
  'appointment.time': { en: 'Time', th: 'เวลา' },
  'appointment.doctor': { en: 'Doctor', th: 'แพทย์' },
  'appointment.specialty': { en: 'Specialty', th: 'ความเชี่ยวชาญ' },
  'appointment.type': { en: 'Type', th: 'ประเภท' },
  'appointment.telehealth': { en: 'Telehealth', th: 'พบแพทย์ออนไลน์' },
  'appointment.inPerson': { en: 'In-Person', th: 'พบแพทย์ที่โรงพยาบาล' },
  'appointment.joinMeeting': { en: 'Join Meeting', th: 'เข้าร่วมประชุม' },
  'appointment.cancelAppointment': { en: 'Cancel Appointment', th: 'ยกเลิกนัดหมาย' },
  'appointment.reschedule': { en: 'Reschedule', th: 'เลื่อนนัด' },

  // Health Records
  'health.personalHealthRecord': { en: 'Personal Health Record', th: 'ประวัติสุขภาพส่วนตัว' },
  'health.allergies': { en: 'Allergies', th: 'การแพ้' },
  'health.medications': { en: 'Medications', th: 'ยา' },
  'health.conditions': { en: 'Conditions', th: 'โรคประจำตัว' },
  'health.vitalSigns': { en: 'Vital Signs', th: 'สัญญาณชีพ' },
  'health.labResults': { en: 'Lab Results', th: 'ผลตรวจทางห้องปฏิบัติการ' },
  'health.vaccinations': { en: 'Vaccinations', th: 'การฉีดวัคซีน' },
  'health.documents': { en: 'Medical Documents', th: 'เอกสารทางการแพทย์' },

  // Dashboard
  'dashboard.welcome': { en: 'Welcome', th: 'ยินดีต้อนรับ' },
  'dashboard.upcomingAppointments': { en: 'Upcoming Appointments', th: 'นัดหมายที่กำลังมาถึง' },
  'dashboard.recentActivity': { en: 'Recent Activity', th: 'กิจกรรมล่าสุด' },
  'dashboard.quickActions': { en: 'Quick Actions', th: 'การดำเนินการด่วน' },
  'dashboard.healthSummary': { en: 'Health Summary', th: 'สรุปสุขภาพ' },

  // Profile
  'profile.personalInfo': { en: 'Personal Information', th: 'ข้อมูลส่วนตัว' },
  'profile.firstName': { en: 'First Name', th: 'ชื่อ' },
  'profile.lastName': { en: 'Last Name', th: 'นามสกุล' },
  'profile.dateOfBirth': { en: 'Date of Birth', th: 'วันเกิด' },
  'profile.gender': { en: 'Gender', th: 'เพศ' },
  'profile.phone': { en: 'Phone', th: 'โทรศัพท์' },
  'profile.address': { en: 'Address', th: 'ที่อยู่' },
  'profile.emergencyContact': { en: 'Emergency Contact', th: 'ผู้ติดต่อฉุกเฉิน' },

  // Notifications
  'notifications.title': { en: 'Notifications', th: 'การแจ้งเตือน' },
  'notifications.noNotifications': { en: 'No notifications', th: 'ไม่มีการแจ้งเตือน' },
  'notifications.markAllRead': { en: 'Mark all as read', th: 'อ่านทั้งหมดแล้ว' },

  // AI Doctor
  'aiDoctor.title': { en: 'AI Health Assistant', th: 'ผู้ช่วยสุขภาพ AI' },
  'aiDoctor.disclaimer': { en: 'This is not a substitute for professional medical advice', th: 'นี่ไม่ใช่คำแนะนำทางการแพทย์จากผู้เชี่ยวชาญ' },
  'aiDoctor.askQuestion': { en: 'Ask a health question...', th: 'ถามคำถามเกี่ยวกับสุขภาพ...' },

  // Time
  'time.today': { en: 'Today', th: 'วันนี้' },
  'time.yesterday': { en: 'Yesterday', th: 'เมื่อวาน' },
  'time.tomorrow': { en: 'Tomorrow', th: 'พรุ่งนี้' },
  'time.thisWeek': { en: 'This Week', th: 'สัปดาห์นี้' },
  'time.thisMonth': { en: 'This Month', th: 'เดือนนี้' },
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('patient-portal-theme');
    return (saved as Theme) || 'light';
  });

  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('patient-portal-language');
    return (saved as Language) || 'th';
  });

  useEffect(() => {
    localStorage.setItem('patient-portal-theme', theme);
    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('patient-portal-language', language);
    document.documentElement.lang = language;
  }, [language]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const toggleLanguage = () => {
    setLanguageState((prev) => (prev === 'en' ? 'th' : 'en'));
  };

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <SettingsContext.Provider
      value={{
        theme,
        language,
        setTheme,
        setLanguage,
        toggleTheme,
        toggleLanguage,
        t,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    // Return default values if not in provider (for backward compatibility)
    return {
      theme: 'light',
      language: 'th',
      setTheme: () => {},
      setLanguage: () => {},
      toggleTheme: () => {},
      toggleLanguage: () => {},
      t: (key: string) => translations[key]?.th || key,
    };
  }
  return context;
};

export default SettingsContext;
