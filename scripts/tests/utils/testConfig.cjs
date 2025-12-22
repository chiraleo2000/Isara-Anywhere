/**
 * Shared Test Configuration
 * Central configuration for all Selenium E2E tests
 * 
 * @module testConfig
 */

const path = require('path');

// ============================================================================
// PORTAL URLS
// ============================================================================
const URLS = {
  patientPortal: process.env.PATIENT_PORTAL_URL || 'http://localhost:3005',
  doctorPortal: process.env.DOCTOR_PORTAL_URL || 'http://localhost:3010',
  patientApi: process.env.PATIENT_API_URL || 'http://localhost:3004',
  doctorMainApi: process.env.DOCTOR_MAIN_API_URL || 'http://localhost:3009',
  doctorAuthApi: process.env.DOCTOR_AUTH_API_URL || 'http://localhost:3011',
  doctorGcsApi: process.env.DOCTOR_GCS_API_URL || 'http://localhost:3012'
};

// ============================================================================
// TEST CREDENTIALS
// ============================================================================
const CREDENTIALS = {
  patient: {
    email: 'demo.test@gmail.com',
    password: 'P@ssw0rd',
    id: 'PATIENT-001',
    name: 'John Demo Patient',
    patientId: 'PATIENT-001'
  },
  doctor: {
    email: 'doctor.test@izara.com',
    password: 'IzaraDoctor@2024',
    id: 'DOC-001',
    name: 'Dr. Sarah Johnson',
    specialty: 'Internal Medicine'
  },
  admin: {
    email: 'admin.test@izara.com',
    password: 'IzaraAdmin@2024',
    id: 'ADMIN-001',
    name: 'Dr. Admin Manager',
    role: 'admin_doctor'
  },
  doctor2: {
    email: 'cardio.doctor@izara.com',
    password: 'IzaraDoctor@2024',
    id: 'DOC-003',
    name: 'Dr. Cardiologist',
    specialty: 'Cardiology'
  }
};

// ============================================================================
// TIMEOUTS
// ============================================================================
const TIMEOUTS = {
  default: 20000,
  short: 5000,
  long: 60000,
  pageLoad: 30000,
  animation: 1000,
  afterAction: 1500,
  afterLogin: 15000,  // Increased for slower auth responses and re-login attempts
  afterNavigation: 3000,
  afterLogout: 5000   // Time to wait after logout before re-login
};

// ============================================================================
// DIRECTORIES
// ============================================================================
const DIRECTORIES = {
  screenshots: path.join(__dirname, '..', '..', 'test-screenshots'),
  results: path.join(__dirname, '..', '..', 'test-results'),
  logs: path.join(__dirname, '..', '..', 'test-logs')
};

// ============================================================================
// TEST DATA
// ============================================================================
const TEST_DATA = {
  // Appointment test data
  appointment: {
    symptoms: {
      main: 'ปวดหัว',
      description: 'ปวดหัวบริเวณหน้าผากเป็นเวลา 2 วัน ปวดเป็นพักๆ',
      duration: '2 วัน',
      severity: 5,
      additionalSymptoms: ['คลื่นไส้เล็กน้อย', 'เมื่อยตา']
    },
    type: 'telehealth',
    urgency: 'normal'
  },

  // Lifestyle data
  lifestyle: {
    diet: 'regular',
    dietDescription: 'รับประทานอาหาร 3 มื้อ หลีกเลี่ยงของทอด',
    exercise: 'moderate',
    exerciseDescription: 'วิ่งเหยาะๆ สัปดาห์ละ 3 ครั้ง',
    sleep: '7',
    smokingStatus: 'never',
    alcoholConsumption: 'occasional',
    supplements: 'วิตามินซี 500mg วันละ 1 เม็ด',
    otherTreatments: 'นวดแผนไทยเดือนละ 1 ครั้ง'
  },

  // Vital signs
  vitals: {
    bloodPressureSystolic: '120',
    bloodPressureDiastolic: '80',
    heartRate: '72',
    temperature: '36.5',
    weight: '65',
    oxygenSaturation: '98',
    bloodGlucose: '95'
  },

  // EMR data (Thai OPD Card format)
  emr: {
    chiefComplaint: 'ปวดหัวเป็นๆ หายๆ 2 วัน',
    historyOfPresentIllness: 'ผู้ป่วยมาด้วยอาการปวดหัวบริเวณหน้าผากและขมับทั้งสองข้าง เริ่มปวดเมื่อ 2 วันก่อน ปวดเป็นพักๆ นอนพักแล้วดีขึ้น',
    physicalExamination: 'GA: Good consciousness, not pale, not jaundice\nVital signs: stable\nHEENT: Normal\nHeart: Normal S1S2, no murmur\nLungs: Clear, no adventitious sounds\nAbdomen: Soft, no tenderness',
    diagnosis: 'Tension headache',
    diagnosisCode: 'G44.2',
    treatmentPlan: '1. Paracetamol 500mg prn for headache\n2. Rest and reduce stress\n3. Follow up in 1 week if not improved',
    vitalSigns: {
      temperature: '36.5',
      heartRate: '72',
      bloodPressure: '120/80',
      respiratoryRate: '16',
      oxygenSaturation: '98'
    }
  },

  // Prescription data
  prescription: {
    medications: [
      {
        drugName: 'Paracetamol 500mg',
        genericName: 'Paracetamol',
        dosage: '500mg',
        frequency: '4-6 ชั่วโมง เมื่อมีอาการ',
        duration: '5 วัน',
        quantity: 10,
        instructions: 'รับประทานเมื่อมีอาการปวด ไม่เกิน 4 เม็ด/วัน'
      },
      {
        drugName: 'Ibuprofen 400mg',
        genericName: 'Ibuprofen',
        dosage: '400mg',
        frequency: 'วันละ 3 ครั้ง หลังอาหาร',
        duration: '5 วัน',
        quantity: 15,
        instructions: 'รับประทานหลังอาหารทันที หากปวดท้องให้หยุดยา'
      }
    ]
  },

  // Medical content test data
  medicalContent: {
    title: 'การดูแลสุขภาพสำหรับอาการปวดหัว',
    category: 'general-health',
    content: `
      # อาการปวดหัวและการดูแลตัวเอง
      
      อาการปวดหัวเป็นอาการที่พบบ่อยในชีวิตประจำวัน สาเหตุมีหลายอย่าง เช่น ความเครียด การนอนหลับไม่เพียงพอ หรือการอดอาหาร
      
      ## การดูแลตัวเองเบื้องต้น
      1. พักผ่อนในห้องที่เงียบและมืด
      2. ดื่มน้ำให้เพียงพอ
      3. ประคบเย็นที่หน้าผาก
      4. หลีกเลี่ยงแสงจ้าและเสียงดัง
      
      ## เมื่อควรพบแพทย์
      - ปวดหัวรุนแรงผิดปกติ
      - มีอาการคลื่นไส้อาเจียนร่วม
      - ปวดหัวหลังจากได้รับบาดเจ็บที่ศีรษะ
    `,
    tags: ['ปวดหัว', 'สุขภาพ', 'การดูแลตัวเอง'],
    targetAudience: 'patients'
  }
};

// ============================================================================
// SELECTORS (Common CSS Selectors)
// ============================================================================
const SELECTORS = {
  // Login elements
  login: {
    emailInput: 'input[type="email"], input[name="email"]',
    passwordInput: 'input[type="password"], input[name="password"]',
    submitButton: 'button[type="submit"]',
    errorMessage: '.error-message, .text-red-500, [role="alert"]'
  },

  // Navigation
  nav: {
    dashboard: 'a[href*="dashboard"], [data-nav="dashboard"]',
    appointments: 'a[href*="appointment"], [data-nav="appointments"]',
    phr: 'a[href*="phr"], [data-nav="phr"]',
    healthStudio: '[data-nav="health-studio"]',
    profile: 'a[href*="profile"], [data-nav="profile"]'
  },

  // Common UI elements
  ui: {
    modal: '.modal, [role="dialog"]',
    closeButton: '.close-button, [data-close]',
    saveButton: 'button:contains("Save"), button:contains("บันทึก")',
    confirmButton: 'button:contains("Confirm"), button:contains("ยืนยัน")',
    cancelButton: 'button:contains("Cancel"), button:contains("ยกเลิก")',
    loadingSpinner: '.animate-spin, .loading',
    toast: '.toast, [role="status"]'
  }
};

// ============================================================================
// EXPORT
// ============================================================================
module.exports = {
  URLS,
  CREDENTIALS,
  TIMEOUTS,
  DIRECTORIES,
  TEST_DATA,
  SELECTORS
};
