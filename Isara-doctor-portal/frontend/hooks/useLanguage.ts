import { useState, useEffect } from 'react';

/**
 * Multi-language Support Hook
 * Supports English and Thai languages
 * ระบบรองรับภาษาไทยและอังกฤษ
 */

export type Language = 'en' | 'th';

interface Translations {
  [key: string]: {
    en: string;
    th: string;
  };
}

const translations: Translations = {
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

  // Prescription / ใบสั่งยา
  'rx.newPrescription': { en: 'New Prescription', th: 'สั่งยาใหม่' },
  'rx.drugName': { en: 'Drug Name', th: 'ชื่อยา' },
  'rx.dosage': { en: 'Dosage', th: 'ขนาดยา' },
  'rx.frequency': { en: 'Frequency', th: 'ความถี่' },
  'rx.duration': { en: 'Duration', th: 'ระยะเวลา' },
  'rx.instructions': { en: 'Instructions', th: 'คำแนะนำ' },
  'rx.interactions': { en: 'Drug Interactions', th: 'ปฏิกิริยายา' },
  'rx.quantity': { en: 'Quantity', th: 'จำนวน' },
  'rx.addMedication': { en: 'Add Medication', th: 'เพิ่มยา' },

  // Lab & Imaging / แล็บและเอกซเรย์
  'lab.labOrder': { en: 'Lab Order', th: 'สั่งตรวจแล็บ' },
  'lab.imagingOrder': { en: 'Imaging Order', th: 'สั่งเอกซเรย์' },
  'lab.results': { en: 'Results', th: 'ผลตรวจ' },
  'lab.pending': { en: 'Pending', th: 'รอผล' },
  'lab.completed': { en: 'Completed', th: 'เสร็จสิ้น' },
  'lab.orderLab': { en: 'Order Lab Test', th: 'สั่งตรวจแล็บ' },

  // Appointment / นัดหมาย
  'appt.schedule': { en: 'Schedule', th: 'ตารางนัด' },
  'appt.reschedule': { en: 'Reschedule', th: 'นัดใหม่' },
  'appt.cancel': { en: 'Cancel Appointment', th: 'ยกเลิกนัด' },
  'appt.confirm': { en: 'Confirm Appointment', th: 'ยืนยันนัด' },
  'appt.completed': { en: 'Completed', th: 'เสร็จสิ้น' },
  'appt.pending': { en: 'Pending', th: 'รอยืนยัน' },
  'appt.confirmed': { en: 'Confirmed', th: 'ยืนยันแล้ว' },
  'appt.cancelled': { en: 'Cancelled', th: 'ยกเลิกแล้ว' },
  'appt.inProgress': { en: 'In Progress', th: 'กำลังพบแพทย์' },
  'appt.newRequest': { en: 'New Appointment Request', th: 'คำขอนัดหมายใหม่' },
  'appt.patientSymptoms': { en: 'Patient Symptoms', th: 'อาการของผู้ป่วย' },
  'appt.preferredTime': { en: 'Preferred Time', th: 'เวลาที่ต้องการ' },
  'appt.setDateTime': { en: 'Set Date & Time', th: 'กำหนดวันเวลา' },
  'appt.decline': { en: 'Decline', th: 'ปฏิเสธ' },
  'appt.accept': { en: 'Accept', th: 'รับนัดหมาย' },

  // Video Consultation / การปรึกษาออนไลน์
  'video.startConsultation': { en: 'Start Consultation', th: 'เริ่มการปรึกษา' },
  'video.endConsultation': { en: 'End Consultation', th: 'จบการปรึกษา' },
  'video.muteAudio': { en: 'Mute Audio', th: 'ปิดเสียง' },
  'video.turnOffVideo': { en: 'Turn Off Video', th: 'ปิดวิดีโอ' },
  'video.joinMeeting': { en: 'Join Meeting', th: 'เข้าร่วมประชุม' },
  'video.startMeeting': { en: 'Start Meeting', th: 'เริ่มประชุม' },
  'video.meetingLink': { en: 'Meeting Link', th: 'ลิงก์ประชุม' },
  'video.copyLink': { en: 'Copy Link', th: 'คัดลอกลิงก์' },
  'video.shareScreen': { en: 'Share Screen', th: 'แชร์หน้าจอ' },
  'video.recording': { en: 'Recording', th: 'กำลังบันทึก' },

  // AI Studio / AI Studio
  'ai.askQuestion': { en: 'Ask a Question', th: 'ถามคำถาม' },
  'ai.medicalCalculators': { en: 'Medical Calculators', th: 'เครื่องคำนวณทางการแพทย์' },
  'ai.clinicalDecisionSupport': { en: 'Clinical Decision Support', th: 'ระบบสนับสนุนการตัดสินใจทางคลินิก' },
  'ai.assistant': { en: 'AI Assistant', th: 'ผู้ช่วย AI' },
  'ai.analyzing': { en: 'Analyzing...', th: 'กำลังวิเคราะห์...' },

  // Queue / คิว
  'queue.callNext': { en: 'Call Next Patient', th: 'เรียกผู้ป่วยคนต่อไป' },
  'queue.waitingPatients': { en: 'Waiting Patients', th: 'ผู้ป่วยรอพบ' },
  'queue.averageWaitTime': { en: 'Average Wait Time', th: 'เวลารอเฉลี่ย' },
  'queue.currentQueue': { en: 'Current Queue', th: 'คิวปัจจุบัน' },

  // Consent / ความยินยอม
  'consent.hasConsent': { en: 'Has Consent', th: 'ได้รับความยินยอม' },
  'consent.noConsent': { en: 'No Consent', th: 'ไม่มีความยินยอม' },
  'consent.requestConsent': { en: 'Request Consent', th: 'ขอความยินยอม' },
  'consent.pdpaCompliance': { en: 'PDPA Compliance', th: 'การปฏิบัติตาม PDPA' },

  // Notifications / การแจ้งเตือน
  'notif.notifications': { en: 'Notifications', th: 'การแจ้งเตือน' },
  'notif.markAllRead': { en: 'Mark all as read', th: 'อ่านทั้งหมด' },
  'notif.noNotifications': { en: 'No notifications', th: 'ไม่มีการแจ้งเตือน' },
  'notif.newAppointment': { en: 'New appointment request', th: 'คำขอนัดหมายใหม่' },
  'notif.appointmentConfirmed': { en: 'Appointment confirmed', th: 'นัดหมายยืนยันแล้ว' },
  'notif.appointmentCancelled': { en: 'Appointment cancelled', th: 'นัดหมายถูกยกเลิก' },
  'notif.emrReady': { en: 'EMR ready for review', th: 'เวชระเบียนพร้อมตรวจสอบ' },
  'notif.viewDetails': { en: 'View Details', th: 'ดูรายละเอียด' },
  'notif.justNow': { en: 'Just now', th: 'เมื่อสักครู่' },
  'notif.minutesAgo': { en: 'minutes ago', th: 'นาทีที่แล้ว' },
  'notif.hoursAgo': { en: 'hours ago', th: 'ชั่วโมงที่แล้ว' },
  'notif.daysAgo': { en: 'days ago', th: 'วันที่แล้ว' },

  // Time / เวลา
  'time.morning': { en: 'Morning', th: 'เช้า' },
  'time.afternoon': { en: 'Afternoon', th: 'บ่าย' },
  'time.evening': { en: 'Evening', th: 'เย็น' },
  'time.today': { en: 'Today', th: 'วันนี้' },
  'time.tomorrow': { en: 'Tomorrow', th: 'พรุ่งนี้' },
  'time.thisWeek': { en: 'This Week', th: 'สัปดาห์นี้' },

  // Status / สถานะ
  'status.online': { en: 'Online', th: 'ออนไลน์' },
  'status.offline': { en: 'Offline', th: 'ออฟไลน์' },
  'status.busy': { en: 'Busy', th: 'ไม่ว่าง' },
  'status.available': { en: 'Available', th: 'ว่าง' },

  // Medical / ทางการแพทย์
  'medical.telehealth': { en: 'Telehealth', th: 'พบแพทย์ออนไลน์' },
  'medical.inPerson': { en: 'In-Person', th: 'พบแพทย์ที่โรงพยาบาล' },
  'medical.urgency.normal': { en: 'Normal', th: 'ปกติ' },
  'medical.urgency.urgent': { en: 'Urgent', th: 'เร่งด่วน' },
  'medical.urgency.emergency': { en: 'Emergency', th: 'ฉุกเฉิน' },
};

export const useLanguage = () => {
  // Use the centralized useSettings for language management
  // This ensures language is synced across all components
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('doctor-portal-language');
    return (saved as Language) || 'th'; // Default to Thai
  });

  const updateLanguage = (newLang: Language) => {
    setLanguage(newLang);
    localStorage.setItem('doctor-portal-language', newLang);
    document.documentElement.lang = newLang;
  };

  useEffect(() => {
    // Listen for storage changes to sync language across tabs/components
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'doctor-portal-language' && e.newValue) {
        setLanguage(e.newValue as Language);
      }
    };
    
    globalThis.addEventListener('storage', handleStorageChange);
    
    // Set initial lang attribute
    document.documentElement.lang = language;
    
    return () => globalThis.removeEventListener('storage', handleStorageChange);
  }, [language]);

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'th' : 'en';
    updateLanguage(newLang);
  };

  return {
    language,
    setLanguage: updateLanguage,
    toggleLanguage,
    t,
  };
};
