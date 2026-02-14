import React, { useState, useEffect, useMemo, useCallback, createContext, useContext, ReactNode } from 'react';

/**
 * Settings Hook for Theme and Language
 * ตั้งค่าธีมและภาษา
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

// Comprehensive translations
const translations: Translations = {
  // Theme & Settings
  'settings.theme': { en: 'Theme', th: 'ธีม' },
  'settings.lightMode': { en: 'Light Mode', th: 'โหมดสว่าง' },
  'settings.darkMode': { en: 'Dark Mode', th: 'โหมดมืด' },
  'settings.language': { en: 'Language', th: 'ภาษา' },
  'settings.english': { en: 'English', th: 'อังกฤษ' },
  'settings.thai': { en: 'Thai', th: 'ไทย' },
  'settings.settings': { en: 'Settings', th: 'ตั้งค่า' },

  // Common / ทั่วไป
  'common.save': { en: 'Save', th: 'บันทึก' },
  'common.cancel': { en: 'Cancel', th: 'ยกเลิก' },
  'common.close': { en: 'Close', th: 'ปิด' },
  'common.edit': { en: 'Edit', th: 'แก้ไข' },
  'common.delete': { en: 'Delete', th: 'ลบ' },
  'common.search': { en: 'Search', th: 'ค้นหา' },
  'common.loading': { en: 'Loading...', th: 'กำลังโหลด...' },
  'common.error': { en: 'Error', th: 'ข้อผิดพลาด' },
  'common.success': { en: 'Success', th: 'สำเร็จ' },
  'common.confirm': { en: 'Confirm', th: 'ยืนยัน' },
  'common.back': { en: 'Back', th: 'กลับ' },
  'common.next': { en: 'Next', th: 'ถัดไป' },
  'common.submit': { en: 'Submit', th: 'ส่ง' },
  'common.view': { en: 'View', th: 'ดู' },
  'common.viewAll': { en: 'View All', th: 'ดูทั้งหมด' },
  'common.noData': { en: 'No data available', th: 'ไม่มีข้อมูล' },
  'common.logout': { en: 'Logout', th: 'ออกจากระบบ' },
  'common.profile': { en: 'Profile', th: 'โปรไฟล์' },

  // Navigation / เมนูนำทาง
  'nav.dashboard': { en: 'Dashboard', th: 'แดชบอร์ด' },
  'nav.patients': { en: 'Patients', th: 'ผู้ป่วย' },
  'nav.queue': { en: 'Queue', th: 'คิว' },
  'nav.calendar': { en: 'Calendar', th: 'ปฏิทิน' },
  'nav.schedule': { en: 'Schedule', th: 'ตารางนัดหมาย' },
  'nav.availability': { en: 'My Availability', th: 'เวลาว่างของฉัน' },
  'nav.appointments': { en: 'Appointments & Meetings', th: 'นัดหมายและการประชุม' },
  'nav.medicalConsultants': { en: 'Medical Consultants', th: 'ที่ปรึกษาทางการแพทย์' },
  'nav.medicalContent': { en: 'Medical Content', th: 'เนื้อหาทางการแพทย์' },
  'nav.clinicalResources': { en: 'Clinical Resources', th: 'ทรัพยากรทางคลินิก' },
  'nav.doctorsManagement': { en: 'Doctors Management', th: 'จัดการแพทย์' },
  'nav.doctorApproval': { en: 'Doctor Approval', th: 'อนุมัติแพทย์' },
  'nav.aiStudio': { en: 'AI Studio', th: 'AI Studio' },
  'nav.recordings': { en: 'Recordings', th: 'บันทึกการพบ' },
  'nav.settings': { en: 'Settings', th: 'ตั้งค่า' },

  // Health Studio / สตูดิโอสุขภาพ
  'healthStudio.diagnosis': { en: 'Diagnosis & Differential Diagnosis', th: 'การวินิจฉัย / วินิจฉัยแยกโรค' },
  'healthStudio.medicalRecord': { en: 'Medical Record', th: 'รายงานเวชระเบียน' },
  'healthStudio.labReports': { en: 'Laboratory Reports', th: 'รายงานทางห้องปฏิบัติการ' },
  'healthStudio.pathologyReports': { en: 'Pathological Reports', th: 'รายงานทางพยาธิวิทยา' },
  'healthStudio.searchRecords': { en: 'Search Medical Records', th: 'ค้นประวัติการรักษา' },
  'healthStudio.retrieveHistory': { en: 'Retrieve Treatment History', th: 'ดึงข้อมูลการรักษาเดิม' },

  // Dashboard / แดชบอร์ด
  'dashboard.todayAppointments': { en: "Today's Appointments", th: 'นัดหมายวันนี้' },
  'dashboard.patientsSeen': { en: 'Patients Seen', th: 'พบผู้ป่วยแล้ว' },
  'dashboard.pendingPrescriptions': { en: 'Pending Prescriptions', th: 'ใบสั่งยารอดำเนินการ' },
  'dashboard.unreadMessages': { en: 'Unread Messages', th: 'ข้อความยังไม่ได้อ่าน' },
  'dashboard.patientQueue': { en: 'Patient Queue', th: 'คิวผู้ป่วย' },
  'dashboard.todaySchedule': { en: "Today's Schedule", th: 'ตารางวันนี้' },
  'dashboard.welcome': { en: 'Welcome back', th: 'ยินดีต้อนรับ' },
  'dashboard.quickActions': { en: 'Quick Actions', th: 'การดำเนินการด่วน' },
  'dashboard.recentPatients': { en: 'Recent Patients', th: 'ผู้ป่วยล่าสุด' },
  'dashboard.pendingRequests': { en: 'Pending Requests', th: 'คำขอรอดำเนินการ' },

  // Patient / ผู้ป่วย
  'patient.searchPatient': { en: 'Search Patient', th: 'ค้นหาผู้ป่วย' },
  'patient.patientDetails': { en: 'Patient Details', th: 'ข้อมูลผู้ป่วย' },
  'patient.demographics': { en: 'Demographics', th: 'ข้อมูลประชากร' },
  'patient.medicalHistory': { en: 'Medical History', th: 'ประวัติการรักษา' },
  'patient.allergies': { en: 'Allergies', th: 'ประวัติแพ้ยา' },
  'patient.chronicConditions': { en: 'Chronic Conditions', th: 'โรคประจำตัว' },
  'patient.currentMedications': { en: 'Current Medications', th: 'ยาที่ใช้ประจำ' },
  'patient.name': { en: 'Patient Name', th: 'ชื่อผู้ป่วย' },
  'patient.age': { en: 'Age', th: 'อายุ' },
  'patient.gender': { en: 'Gender', th: 'เพศ' },
  'patient.phone': { en: 'Phone', th: 'โทรศัพท์' },
  'patient.email': { en: 'Email', th: 'อีเมล' },
  'patient.bloodType': { en: 'Blood Type', th: 'กรุ๊ปเลือด' },

  // EMR / เวชระเบียน
  'emr.createEMR': { en: 'Create EMR', th: 'สร้างบันทึกการรักษา' },
  'emr.editEMR': { en: 'Edit EMR', th: 'แก้ไขบันทึกการรักษา' },
  'emr.chiefComplaint': { en: 'Chief Complaint', th: 'อาการสำคัญ' },
  'emr.historyOfPresentIllness': { en: 'History of Present Illness', th: 'ประวัติการเจ็บป่วยปัจจุบัน' },
  'emr.physicalExamination': { en: 'Physical Examination', th: 'การตรวจร่างกาย' },
  'emr.vitalSigns': { en: 'Vital Signs', th: 'สัญญาณชีพ' },
  'emr.assessment': { en: 'Assessment', th: 'การประเมิน' },
  'emr.diagnosis': { en: 'Diagnosis', th: 'การวินิจฉัย' },
  'emr.treatmentPlan': { en: 'Treatment Plan', th: 'แผนการรักษา' },
  'emr.followUp': { en: 'Follow-up', th: 'นัดติดตาม' },
  'emr.sign': { en: 'Sign EMR', th: 'ลงนามเวชระเบียน' },
  'emr.signed': { en: 'EMR Signed', th: 'ลงนามแล้ว' },

  // Video Consultation / การปรึกษาออนไลน์
  'video.startConsultation': { en: 'Start Consultation', th: 'เริ่มการปรึกษา' },
  'video.endConsultation': { en: 'End Consultation', th: 'จบการปรึกษา' },
  'video.joinMeeting': { en: 'Join Meeting', th: 'เข้าร่วมประชุม' },
  'video.startMeeting': { en: 'Start Meeting', th: 'เริ่มประชุม' },
  'video.meetingLink': { en: 'Meeting Link', th: 'ลิงก์ประชุม' },
  'video.copyLink': { en: 'Copy Link', th: 'คัดลอกลิงก์' },

  // Notifications / การแจ้งเตือน
  'notif.notifications': { en: 'Notifications', th: 'การแจ้งเตือน' },
  'notif.markAllRead': { en: 'Mark all as read', th: 'อ่านทั้งหมด' },
  'notif.noNotifications': { en: 'No notifications', th: 'ไม่มีการแจ้งเตือน' },
  'notif.viewAll': { en: 'View all notifications', th: 'ดูการแจ้งเตือนทั้งหมด' },

  // Time / เวลา
  'time.today': { en: 'Today', th: 'วันนี้' },
  'time.tomorrow': { en: 'Tomorrow', th: 'พรุ่งนี้' },
  'time.thisWeek': { en: 'This Week', th: 'สัปดาห์นี้' },
  'time.justNow': { en: 'Just now', th: 'เมื่อสักครู่' },
  'time.minutesAgo': { en: 'minutes ago', th: 'นาทีที่แล้ว' },
  'time.hoursAgo': { en: 'hours ago', th: 'ชั่วโมงที่แล้ว' },

  // Status / สถานะ
  'status.online': { en: 'Online', th: 'ออนไลน์' },
  'status.offline': { en: 'Offline', th: 'ออฟไลน์' },
  'status.available': { en: 'Available', th: 'ว่าง' },

  // Medical / ทางการแพทย์
  'medical.telehealth': { en: 'Telehealth', th: 'พบแพทย์ออนไลน์' },
  'medical.inPerson': { en: 'In-Person', th: 'พบแพทย์ที่โรงพยาบาล' },
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('doctor-portal-theme');
    return (saved as Theme) || 'light';
  });

  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('doctor-portal-language');
    return (saved as Language) || 'th';
  });

  useEffect(() => {
    localStorage.setItem('doctor-portal-theme', theme);
    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('doctor-portal-language', language);
    document.documentElement.lang = language;
  }, [language]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === 'en' ? 'th' : 'en'));
  }, []);

  const t = useCallback((key: string): string => {
    return translations[key]?.[language] || key;
  }, [language]);

  const contextValue = useMemo(() => ({
    theme,
    language,
    setTheme,
    setLanguage,
    toggleTheme,
    toggleLanguage,
    t,
  }), [theme, language, setTheme, setLanguage, toggleTheme, toggleLanguage, t]);

  return (
    <SettingsContext.Provider
      value={contextValue}
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

// Export for backward compatibility with useLanguage
export const useLanguage = () => {
  const { language, setLanguage, toggleLanguage, t } = useSettings();
  return { language, setLanguage, toggleLanguage, t };
};
