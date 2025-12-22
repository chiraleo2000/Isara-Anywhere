/**
 * ================================================================================
 * IZARA TELEMEDICINE PLATFORM - UNIFIED DEMO DATA GENERATOR
 * ================================================================================
 *
 * This script generates comprehensive mock data for both Patient and Doctor portals.
 * Data is organized according to GCS bucket structure for seamless integration.
 *
 * GCS Bucket Structure:
 * - izara-users-credentials : User authentication for both patient and doctor
 * - izara-doctors-data     : Doctor-specific data, logs, EMRs, prescriptions
 * - izara-patients-data    : Patient-specific data, PHR, living will, PDPA
 * - izara-appointments     : Shared appointment data for both portals
 * - izara-meta-data        : Reference data (medications, lab tests, ICD-10, etc.)
 *
 * Usage: node scripts/generateUnifiedDemoData.cjs
 *
 * @author Izara Development Team
 * @version 2.0.0
 * @date November 2025
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// ============================================================================
// CONFIGURATION
// ============================================================================

const OUTPUT_DIR = path.join(__dirname, 'output');
const BUCKETS = {
  AUTH: 'izara-users-credentials',
  DOCTOR: 'izara-doctors-data',
  PATIENT: 'izara-patients-data',
  APPOINTMENTS: 'izara-appointments',
  METADATA: 'izara-meta-data'
};

// Demo User IDs - Matches MOCK_DATA_REFERENCE.md
const DEMO_IDS = {
  patient: {
    id: 'PATIENT-001',
    name: 'Demo Test User',
    nameThai: 'นาย ทดสอบ ระบบ',
    email: 'demo.test@gmail.com',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demotest-patient'
  },
  doctor: {
    id: 'DOC-001',
    name: 'Dr. Test Doctor',
    nameThai: 'นพ. ทดสอบ แพทย์',
    email: 'doctor.test@izara.com',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dr-example-doctor'
  },
  admin: {
    id: 'ADMIN-001',
    name: 'Admin Test',
    nameThai: 'ผู้ดูแลระบบ ทดสอบ',
    email: 'admin.test@izara.com',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin-test'
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeJSON(subDir, filename, data) {
  const filePath = path.join(OUTPUT_DIR, subDir, filename);
  ensureDirectoryExists(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`   ✅ Generated: ${subDir}/${filename}`);
}

function getDateString(daysFromNow = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString();
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ============================================================================
// USER CREDENTIALS (izara-users-credentials)
// ============================================================================

/**
 * MOCK USER TABLE - EXACTLY AS SPECIFIED:
 * | ID               | Email                        | Password           | Role    | Status      |
 * |------------------|------------------------------|--------------------| --------|-------------|
 * | ADMIN-001        | admin.test@izara.com         | IzaraAdmin@2024    | Admin   | ✅ Approved  |
 * | DOC-001          | doctor.test@izara.com        | IzaraDoctor@2024   | Doctor  | ✅ Approved  |
 * | DOC-002          | doctor02.test@izara.com      | IzaraDoctor@2024   | Doctor  | ⏳ Pending   |
 * | DOC-003          | cardio.doctor@izara.com      | IzaraDoctor@2024   | Doctor  | ✅ Approved  |
 * | DOC-INACTIVE-001 | inactive.doctor@izara.com    | InactiveDoc@2024   | Doctor  | 🚫 Inactive  |
 * | DOC-REJECTED-001 | rejected.doctor@izara.com    | RejectedDoc@2024   | Doctor  | ❌ Rejected  |
 * | DOC-LOCKED-001   | locked.doctor@izara.com      | LockedDoc@2024     | Doctor  | 🔒 Locked    |
 * | PATIENT-001      | demo.test@gmail.com          | P@ssw0rd           | Patient | ✅ Active    |
 */

function generateAllUsers() {
  // Use bcrypt for password hashing (matches auth server)
  const hashPassword = (password) => bcrypt.hashSync(password, 10);
  
  return [
    // ========== ADMIN ==========
    {
      id: 'ADMIN-001',
      email: 'admin.test@izara.com',
      passwordHash: hashPassword('IzaraAdmin@2024'),
      role: 'admin',
      name: 'Admin Test',
      nameThai: 'ผู้ดูแลระบบ ทดสอบ',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin-test',
      isAdmin: true,
      isActive: true,
      isVerified: true,
      isApproved: true,
      status: 'approved',
      approvalStatus: 'approved',
      createdAt: getDateString(-730),
      lastLogin: getDateString(0),
      preferences: { language: 'th', notifications: true, theme: 'light' }
    },
    
    // ========== DOCTOR ==========
    {
      id: 'DOC-001',
      email: 'doctor.test@izara.com',
      passwordHash: hashPassword('IzaraDoctor@2024'),
      role: 'doctor',
      name: 'Dr. Test Doctor',
      nameThai: 'นพ. ทดสอบ แพทย์',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=doc-001',
      specialty: 'General Practice',
      specialtyThai: 'เวชปฏิบัติทั่วไป',
      hospital: 'Izara Hospital Bangkok',
      medicalLicenseNumber: 'MD-001-2024',
      isActive: true,
      isVerified: true,
      isApproved: true,
      status: 'approved',
      approvalStatus: 'approved',
      createdAt: getDateString(-365),
      lastLogin: getDateString(0),
      preferences: { language: 'th', notifications: true, theme: 'light' }
    },
    
    // ========== PATIENT ==========
    {
      id: 'PATIENT-001',
      patientId: 'PATIENT-001',
      email: 'demo.test@gmail.com',
      passwordHash: hashPassword('P@ssw0rd'),
      role: 'patient',
      name: 'Demo Test User',
      nameThai: 'นาย ทดสอบ ระบบ',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=patient-001',
      isActive: true,
      isVerified: true,
      isApproved: true,
      approvalStatus: 'approved',
      status: 'active',
      createdAt: getDateString(-365),
      lastLogin: getDateString(0),
      profile: {
        id: 'PATIENT-001',
        patientId: 'PATIENT-001',
        name: 'Demo Test User',
        email: 'demo.test@gmail.com',
        phone: '+66-81-111-1111',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=patient-001',
        dateOfBirth: '1990-01-01',
        gender: 'female',
      },
      preferences: { language: 'th', notifications: true, theme: 'light' }
    }
  ];
}

// Legacy function for backward compatibility
function generateUserCredentials() {
  const allUsers = generateAllUsers();
  return {
    patients: allUsers.filter(u => u.role === 'patient'),
    doctors: allUsers.filter(u => u.role === 'doctor' || u.role === 'admin')
  };
}

// ============================================================================
// DOCTOR DATA (izara-doctors-data)
// ============================================================================

function generateDoctorProfiles() {
  // Generate profiles for ALL doctors from the mock table
  return [
    {
      id: 'DOC-001',
      name: 'Dr. Test Doctor',
      nameThai: 'นพ. ทดสอบ แพทย์',
      email: 'doctor.test@izara.com',
      role: 'doctor',
      medicalLicenseNumber: 'MD-001-2024',
      specialty: 'General Practice',
      specialtyThai: 'เวชปฏิบัติทั่วไป',
      phone: '+66 2 123 4567',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=doc-001',
      dateOfBirth: '1980-01-01T00:00:00.000Z',
      createdAt: getDateString(-365),
      status: 'approved',
      qualifications: [
        'Doctor of Medicine (MD) - Chulalongkorn University',
        'Board Certified - General Practice',
        'Advanced Cardiac Life Support (ACLS)',
        'Diploma in Family Medicine'
      ],
      experience: '15 years',
      languages: ['Thai', 'English'],
      consultationFee: 500,
      hospital: 'Izara Hospital Bangkok',
      department: 'General Medicine',
      availableHours: {
        monday: ['09:00-12:00', '13:00-17:00'],
        tuesday: ['09:00-12:00', '13:00-17:00'],
        wednesday: ['09:00-12:00', '13:00-17:00'],
        thursday: ['09:00-12:00', '13:00-17:00'],
        friday: ['09:00-12:00', '13:00-16:00'],
        saturday: ['09:00-12:00'],
        sunday: []
      },
      statistics: {
        totalPatients: 1250,
        totalConsultations: 3500,
        patientSatisfaction: 4.8,
        averageRating: 4.9
      }
    },
    {
      id: 'DOC-002',
      name: 'Dr. Pending Doctor',
      nameThai: 'นพ. รอการอนุมัติ',
      email: 'doctor02.test@izara.com',
      role: 'doctor',
      medicalLicenseNumber: 'MD-002-2024',
      specialty: 'Internal Medicine',
      specialtyThai: 'อายุรกรรม',
      phone: '+66 2 234 5678',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=doc-002',
      dateOfBirth: '1985-05-15T00:00:00.000Z',
      createdAt: getDateString(-30),
      status: 'pending',
      qualifications: [
        'Doctor of Medicine (MD) - Mahidol University',
        'Board Certified - Internal Medicine'
      ],
      experience: '5 years',
      languages: ['Thai', 'English'],
      consultationFee: 600,
      hospital: 'Bangkok Hospital',
      department: 'Internal Medicine',
      availableHours: {
        monday: ['09:00-12:00'],
        tuesday: ['09:00-12:00'],
        wednesday: [],
        thursday: ['09:00-12:00'],
        friday: ['09:00-12:00'],
        saturday: [],
        sunday: []
      },
      statistics: {
        totalPatients: 0,
        totalConsultations: 0,
        patientSatisfaction: 0,
        averageRating: 0
      }
    },
    {
      id: 'DOC-003',
      name: 'Dr. Cardio Specialist',
      nameThai: 'นพ. หัวใจ ผู้เชี่ยวชาญ',
      email: 'cardio.doctor@izara.com',
      role: 'doctor',
      medicalLicenseNumber: 'MD-003-2024',
      specialty: 'Cardiology',
      specialtyThai: 'โรคหัวใจและหลอดเลือด',
      phone: '+66 2 345 6789',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=doc-003',
      dateOfBirth: '1975-08-20T00:00:00.000Z',
      createdAt: getDateString(-200),
      status: 'approved',
      qualifications: [
        'Doctor of Medicine (MD) - Siriraj Hospital',
        'Board Certified - Cardiology',
        'Fellowship in Interventional Cardiology',
        'Advanced Cardiac Life Support (ACLS)'
      ],
      experience: '20 years',
      languages: ['Thai', 'English', 'Chinese'],
      consultationFee: 1500,
      hospital: 'Bangkok Heart Hospital',
      department: 'Cardiology',
      availableHours: {
        monday: ['09:00-12:00', '14:00-17:00'],
        tuesday: ['09:00-12:00'],
        wednesday: ['09:00-12:00', '14:00-17:00'],
        thursday: ['09:00-12:00'],
        friday: ['09:00-12:00'],
        saturday: [],
        sunday: []
      },
      statistics: {
        totalPatients: 2500,
        totalConsultations: 8000,
        patientSatisfaction: 4.9,
        averageRating: 4.95
      }
    },
    {
      id: 'DOC-INACTIVE-001',
      name: 'Dr. Inactive Doctor',
      nameThai: 'นพ. ไม่ใช้งาน',
      email: 'inactive.doctor@izara.com',
      role: 'doctor',
      medicalLicenseNumber: 'MD-INACTIVE-001',
      specialty: 'Pediatrics',
      specialtyThai: 'กุมารเวชกรรม',
      phone: '+66 2 456 7890',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=doc-inactive',
      dateOfBirth: '1982-03-10T00:00:00.000Z',
      createdAt: getDateString(-500),
      status: 'inactive',
      qualifications: [
        'Doctor of Medicine (MD) - Prince of Songkla University'
      ],
      experience: '12 years',
      languages: ['Thai', 'English'],
      consultationFee: 700,
      hospital: 'Samitivej Hospital',
      department: 'Pediatrics',
      availableHours: {},
      statistics: {
        totalPatients: 800,
        totalConsultations: 2000,
        patientSatisfaction: 4.5,
        averageRating: 4.6
      }
    },
    {
      id: 'DOC-REJECTED-001',
      name: 'Dr. Rejected Doctor',
      nameThai: 'นพ. ถูกปฏิเสธ',
      email: 'rejected.doctor@izara.com',
      role: 'doctor',
      medicalLicenseNumber: 'MD-REJECTED-001',
      specialty: 'Orthopedics',
      specialtyThai: 'ศัลยกรรมกระดูก',
      phone: '+66 2 567 8901',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=doc-rejected',
      dateOfBirth: '1988-11-25T00:00:00.000Z',
      createdAt: getDateString(-60),
      status: 'rejected',
      rejectionReason: 'Invalid medical license number',
      qualifications: ['Claimed MD - Unverified'],
      experience: '3 years',
      languages: ['Thai'],
      consultationFee: 400,
      hospital: 'Unknown Hospital',
      department: 'Orthopedics',
      availableHours: {},
      statistics: {
        totalPatients: 0,
        totalConsultations: 0,
        patientSatisfaction: 0,
        averageRating: 0
      }
    },
    {
      id: 'DOC-LOCKED-001',
      name: 'Dr. Locked Doctor',
      nameThai: 'นพ. ถูกล็อค',
      email: 'locked.doctor@izara.com',
      role: 'doctor',
      medicalLicenseNumber: 'MD-LOCKED-001',
      specialty: 'Dermatology',
      specialtyThai: 'ผิวหนัง',
      phone: '+66 2 678 9012',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=doc-locked',
      dateOfBirth: '1979-07-05T00:00:00.000Z',
      createdAt: getDateString(-400),
      status: 'locked',
      lockReason: 'Too many failed login attempts',
      lockedAt: getDateString(-7),
      qualifications: [
        'Doctor of Medicine (MD) - Khon Kaen University',
        'Board Certified - Dermatology'
      ],
      experience: '18 years',
      languages: ['Thai', 'English'],
      consultationFee: 800,
      hospital: 'Bumrungrad Hospital',
      department: 'Dermatology',
      availableHours: {},
      statistics: {
        totalPatients: 1500,
        totalConsultations: 4000,
        patientSatisfaction: 4.7,
        averageRating: 4.8
      }
    }
  ];
}

// Legacy function for backward compatibility
function generateDoctorProfile() {
  return generateDoctorProfiles();
}

function generatePatientRecords() {
  return [{
    id: 'PATIENT-001',
    demographics: {
      name: 'Demo Test User',
      nameThai: 'นาย ทดสอบ ระบบ',
      dateOfBirth: '1990-01-15T00:00:00.000Z',
      age: 34,
      gender: 'female',
      photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=patient-001',
      idNumber: '1234567890123'
    },
    contact: {
      phone: '+66 81 234 5678',
      email: 'demo.test@gmail.com',
      address: '123 Demo Street, Sukhumvit, Bangkok, Thailand 10110',
      emergencyContact: {
        name: 'Demo Emergency Contact',
        nameThai: 'นาง สมใจ ระบบ',
        relationship: 'Spouse',
        phone: '+66 82 345 6789'
      }
    },
    medicalInfo: {
      bloodType: 'O+',
      allergies: ['Penicillin'],
      chronicConditions: ['Hypertension'],
      currentMedications: ['Amlodipine 5mg OD'],
      familyHistory: ['Father - Hypertension', 'Mother - Type 2 Diabetes'],
      socialHistory: {
        smoking: 'Never',
        alcohol: 'Occasional',
        exercise: '2-3 times/week'
      }
    },
    insurance: {
      provider: 'Thai National Health Insurance',
      policyNumber: 'NHSO-1234567890',
      validUntil: getDateString(365)
    },
    lastVisit: getDateString(-5),
    nextAppointment: getDateString(1),
    consentStatus: {
      hasConsent: true,
      dataTypesAllowed: [
        'medicalHistory', 'labResults', 'prescriptions',
        'consultationNotes', 'imagingResults', 'vitalSigns'
      ],
      consentDate: getDateString(-180),
      expiresAt: getDateString(545)
    },
    riskLevel: 'medium',
    status: 'active',
    createdAt: getDateString(-365)
  }];
}

// Generate patients index for cross-portal data sync
function generatePatientsIndex() {
  return [
    {
      id: 'PATIENT-001',
      name: 'Demo Test User',
      email: 'demo.test@gmail.com',
      phone: '+66-81-111-1111',
      gender: 'female',
      age: 34,
      dateOfBirth: '1990-01-01',
      consentStatus: { hasConsent: true },
      status: 'active'
    }
  ];
}

function generateEMRs() {
  return [
    {
      id: 'EMR-DEMO-001',
      patientId: DEMO_IDS.patient.id,
      doctorId: DEMO_IDS.doctor.id,
      doctorName: DEMO_IDS.doctor.name,
      encounterDate: getDateString(-5),
      encounterType: 'follow-up',
      chiefComplaint: 'Routine follow-up for hypertension management',
      chiefComplaintThai: 'ติดตามการรักษาโรคความดันโลหิตสูงตามนัด',
      historyOfPresentIllness: 'Patient reports good medication compliance with Amlodipine 5mg OD. Blood pressure has been stable at home readings (130-140/80-85 mmHg). No side effects noted. Occasional headaches but mild and infrequent. Patient has been exercising 2-3 times per week and following low-sodium diet.',
      vitalSigns: {
        bloodPressure: '135/82',
        heartRate: 72,
        temperature: 36.8,
        respiratoryRate: 16,
        oxygenSaturation: 98,
        weight: 75,
        height: 175,
        bmi: 24.5
      },
      physicalExamination: {
        general: 'Alert, well-nourished, no acute distress',
        cardiovascular: 'Regular rate and rhythm, no murmurs, S1S2 normal',
        respiratory: 'Clear to auscultation bilaterally, no wheezes or rales',
        abdomen: 'Soft, non-tender, no organomegaly, normoactive bowel sounds',
        neurological: 'Cranial nerves intact, no focal deficits'
      },
      diagnosis: [{
        code: 'I10',
        description: 'Essential (primary) hypertension - controlled',
        descriptionThai: 'โรคความดันโลหิตสูงปฐมภูมิ - ควบคุมได้',
        type: 'primary'
      }],
      treatmentPlan: 'Continue current medication (Amlodipine 5mg OD). Patient responding well to therapy. Advised to continue lifestyle modifications including low-salt diet and regular exercise. Monitor BP at home weekly. Follow-up in 3 months or sooner if symptoms worsen.',
      medications: [{
        name: 'Amlodipine',
        dose: '5mg',
        frequency: 'Once daily',
        route: 'Oral',
        duration: 'Ongoing'
      }],
      labOrders: [],
      imagingOrders: [],
      referrals: [],
      followUpDate: getDateString(90),
      followUpReason: 'Hypertension monitoring',
      status: 'finalized',
      createdBy: DEMO_IDS.doctor.id,
      createdAt: getDateString(-5),
      updatedAt: getDateString(-5)
    },
    {
      id: 'EMR-DEMO-002',
      patientId: DEMO_IDS.patient.id,
      doctorId: DEMO_IDS.doctor.id,
      doctorName: DEMO_IDS.doctor.name,
      encounterDate: getDateString(-95),
      encounterType: 'consultation',
      chiefComplaint: 'Elevated blood pressure detected during routine checkup',
      chiefComplaintThai: 'ตรวจพบความดันโลหิตสูงระหว่างการตรวจสุขภาพประจำปี',
      historyOfPresentIllness: 'Patient reports occasional headaches over past 2 months, described as mild pressure-type headaches, mostly in the evening. Denies chest pain, shortness of breath, or palpitations. Family history significant for hypertension (father diagnosed at age 50). Lifestyle assessment reveals sedentary work, high sodium intake, occasional alcohol use.',
      vitalSigns: {
        bloodPressure: '148/92',
        heartRate: 78,
        temperature: 36.7,
        respiratoryRate: 16,
        oxygenSaturation: 99,
        weight: 76,
        height: 175,
        bmi: 24.8
      },
      physicalExamination: {
        general: 'Alert, slightly overweight, no acute distress',
        cardiovascular: 'Regular rate and rhythm, S1S2 normal, no murmurs',
        respiratory: 'Clear bilaterally',
        abdomen: 'Soft, non-tender, no organomegaly',
        neurological: 'No focal deficits, fundoscopy normal'
      },
      diagnosis: [{
        code: 'I10',
        description: 'Essential (primary) hypertension - newly diagnosed',
        descriptionThai: 'โรคความดันโลหิตสูงปฐมภูมิ - วินิจฉัยใหม่',
        type: 'primary'
      }],
      treatmentPlan: 'Initiate antihypertensive therapy with Amlodipine 5mg once daily in the morning. Comprehensive lifestyle modifications counseling provided: reduce sodium intake to <2g/day, DASH diet recommended, increase physical activity to 30min moderate exercise 5x/week, limit alcohol. Blood pressure monitoring at home recommended. Ordered baseline labs including lipid panel and renal function. Follow-up in 4 weeks to assess response.',
      medications: [{
        name: 'Amlodipine',
        dose: '5mg',
        frequency: 'Once daily',
        route: 'Oral',
        duration: 'Ongoing'
      }],
      labOrders: ['LAB-DEMO-001', 'LAB-DEMO-002'],
      imagingOrders: ['IMG-DEMO-001'],
      referrals: [],
      followUpDate: getDateString(-65),
      followUpReason: 'Blood pressure recheck and medication adjustment',
      status: 'finalized',
      createdBy: DEMO_IDS.doctor.id,
      createdAt: getDateString(-95),
      updatedAt: getDateString(-95)
    },
    {
      id: 'EMR-DEMO-003',
      patientId: DEMO_IDS.patient.id,
      doctorId: DEMO_IDS.doctor.id,
      doctorName: DEMO_IDS.doctor.name,
      encounterDate: getDateString(-180),
      encounterType: 'consultation',
      chiefComplaint: 'Fever and sore throat for 2 days',
      chiefComplaintThai: 'มีไข้และเจ็บคอมา 2 วัน',
      historyOfPresentIllness: 'Patient presents with fever (max 38.5C), sore throat, and mild cough. No difficulty breathing. No travel history.',
      vitalSigns: {
        bloodPressure: '120/80',
        heartRate: 90,
        temperature: 38.2,
        respiratoryRate: 18,
        oxygenSaturation: 98,
        weight: 75,
        height: 175,
        bmi: 24.5
      },
      physicalExamination: {
        general: 'Febrile, looks tired',
        headNeck: 'Pharynx injected, tonsils enlarged but no exudate',
        respiratory: 'Clear lungs',
        cardiovascular: 'Tachycardic but regular'
      },
      diagnosis: [{
        code: 'J06.9',
        description: 'Acute upper respiratory infection',
        descriptionThai: 'การติดเชื้อทางเดินหายใจส่วนบนเฉียบพลัน',
        type: 'primary'
      }],
      treatmentPlan: 'Symptomatic treatment. Paracetamol for fever. Rest and hydration.',
      medications: [{
        name: 'Paracetamol',
        dose: '500mg',
        frequency: 'Every 4-6 hours prn',
        route: 'Oral',
        duration: '5 days'
      }],
      labOrders: [],
      imagingOrders: [],
      referrals: [],
      status: 'finalized',
      createdBy: DEMO_IDS.doctor.id,
      createdAt: getDateString(-180),
      updatedAt: getDateString(-180)
    },
    {
      id: 'EMR-DEMO-004',
      patientId: DEMO_IDS.patient.id,
      doctorId: DEMO_IDS.doctor.id,
      doctorName: DEMO_IDS.doctor.name,
      encounterDate: getDateString(-200),
      encounterType: 'consultation',
      chiefComplaint: 'Annual health checkup',
      chiefComplaintThai: 'ตรวจสุขภาพประจำปี',
      historyOfPresentIllness: 'Patient presents for annual preventive health examination. No acute complaints. Reports generally good health. Exercises regularly (2-3 times/week). Works as software engineer with predominantly desk work. Non-smoker, occasional alcohol consumption.',
      vitalSigns: {
        bloodPressure: '128/78',
        heartRate: 70,
        temperature: 36.6,
        respiratoryRate: 14,
        oxygenSaturation: 99,
        weight: 74,
        height: 175,
        bmi: 24.2
      },
      physicalExamination: {
        general: 'Well-appearing, appropriate for stated age',
        cardiovascular: 'S1S2 regular, no murmurs, rubs, or gallops',
        respiratory: 'Clear to auscultation, normal respiratory effort',
        abdomen: 'Soft, non-distended, non-tender, no masses',
        neurological: 'Alert and oriented x3, normal gait',
        skin: 'No suspicious lesions',
        musculoskeletal: 'Full range of motion, no joint swelling'
      },
      diagnosis: [{
        code: 'Z00.00',
        description: 'General adult medical examination',
        descriptionThai: 'ตรวจสุขภาพทั่วไปผู้ใหญ่',
        type: 'primary'
      }],
      treatmentPlan: 'Patient in good general health. Continue current lifestyle habits. Ordered comprehensive metabolic panel, CBC, lipid panel, and urinalysis for baseline screening. Recommend annual flu vaccination. Continue regular exercise and maintain healthy diet. Return in 1 year for next annual physical or sooner if concerns arise.',
      medications: [],
      labOrders: ['LAB-DEMO-003', 'LAB-DEMO-004'],
      imagingOrders: [],
      referrals: [],
      followUpDate: getDateString(165),
      followUpReason: 'Annual health checkup',
      status: 'finalized',
      createdBy: DEMO_IDS.doctor.id,
      createdAt: getDateString(-200),
      updatedAt: getDateString(-200)
    },
    {
      id: 'EMR-DEMO-005',
      patientId: DEMO_IDS.patient.id,
      doctorId: DEMO_IDS.doctor.id,
      doctorName: DEMO_IDS.doctor.name,
      encounterDate: getDateString(-250),
      encounterType: 'consultation',
      chiefComplaint: 'Lower back pain after lifting heavy object',
      chiefComplaintThai: 'ปวดหลังส่วนล่างหลังยกของหนัก',
      historyOfPresentIllness: 'Patient reports acute onset lower back pain after lifting heavy furniture 2 days ago. Pain is localized to lumbar region, worsens with movement and bending. Rates pain 6/10. No radiation to legs. No numbness or tingling. No bowel/bladder dysfunction. Taking over-the-counter ibuprofen with minimal relief.',
      vitalSigns: {
        bloodPressure: '122/76',
        heartRate: 72,
        temperature: 36.5,
        respiratoryRate: 16,
        oxygenSaturation: 98,
        weight: 74,
        height: 175,
        bmi: 24.2
      },
      physicalExamination: {
        general: 'Moves cautiously due to pain',
        musculoskeletal: 'Tenderness over L4-L5 paraspinal muscles. No midline tenderness. Negative straight leg raise bilaterally. Normal lower extremity strength and sensation. Normal reflexes.',
        neurological: 'No focal neurological deficits'
      },
      diagnosis: [{
        code: 'M54.5',
        description: 'Low back pain - acute mechanical',
        descriptionThai: 'อาการปวดหลังส่วนล่าง - เฉียบพลันจากการเคลื่อนไหว',
        type: 'primary'
      }],
      treatmentPlan: 'Conservative management for acute mechanical low back pain. Continue NSAIDs (Ibuprofen 400mg TID with food) for pain and inflammation. Apply heat/ice alternately. Gentle stretching exercises. Avoid heavy lifting for 2 weeks. Physical therapy referral if not improved in 1 week. Red flag symptoms reviewed (weakness, numbness, bowel/bladder changes).',
      medications: [{
        name: 'Ibuprofen',
        dose: '400mg',
        frequency: 'Three times daily with food',
        route: 'Oral',
        duration: '7 days'
      }],
      labOrders: [],
      imagingOrders: [],
      referrals: [],
      followUpDate: getDateString(-243),
      followUpReason: 'Back pain reassessment',
      status: 'finalized',
      createdBy: DEMO_IDS.doctor.id,
      createdAt: getDateString(-250),
      updatedAt: getDateString(-250)
    },
    {
      id: 'EMR-DEMO-006',
      patientId: DEMO_IDS.patient.id,
      doctorId: DEMO_IDS.doctor.id,
      doctorName: DEMO_IDS.doctor.name,
      encounterDate: getDateString(-310),
      encounterType: 'consultation',
      chiefComplaint: 'Persistent heartburn and indigestion',
      chiefComplaintThai: 'อาการแสบร้อนกลางอกและอาหารไม่ย่อยเรื้อรัง',
      historyOfPresentIllness: 'Patient complains of burning chest discomfort after meals, especially with spicy or fatty foods, for past 3 weeks. Symptoms worse when lying down. Occasionally wakes up at night with sour taste in mouth. Denies weight loss, difficulty swallowing, or blood in stool. No radiation of pain to arms or jaw. Takes antacids occasionally with temporary relief.',
      vitalSigns: {
        bloodPressure: '126/80',
        heartRate: 75,
        temperature: 36.7,
        respiratoryRate: 15,
        oxygenSaturation: 98,
        weight: 74,
        height: 175,
        bmi: 24.2
      },
      physicalExamination: {
        general: 'Well-appearing, no distress',
        cardiovascular: 'Regular rate and rhythm, no murmurs',
        abdomen: 'Soft, mild epigastric tenderness, no guarding or rebound',
        respiratory: 'Clear bilaterally'
      },
      diagnosis: [{
        code: 'K21.0',
        description: 'Gastroesophageal reflux disease (GERD)',
        descriptionThai: 'โรคกรดไหลย้อน',
        type: 'primary'
      }],
      treatmentPlan: 'Initiated PPI therapy with Omeprazole 20mg once daily before breakfast for 8 weeks. Lifestyle modifications counseled: elevate head of bed, avoid late meals, reduce caffeine, spicy foods, and alcohol. Weight loss if overweight. H. pylori testing ordered. If symptoms persist after PPI trial, consider endoscopy. Follow-up in 4 weeks to assess response.',
      medications: [{
        name: 'Omeprazole',
        dose: '20mg',
        frequency: 'Once daily before breakfast',
        route: 'Oral',
        duration: '8 weeks'
      }],
      labOrders: ['LAB-DEMO-005'],
      imagingOrders: [],
      referrals: [],
      followUpDate: getDateString(-282),
      followUpReason: 'GERD symptom reassessment',
      status: 'finalized',
      createdBy: DEMO_IDS.doctor.id,
      createdAt: getDateString(-310),
      updatedAt: getDateString(-310)
    }
  ];
}

function generatePrescriptions() {
  return [
    {
      id: 'RX-DEMO-001',
      patientId: DEMO_IDS.patient.id,
      patientName: DEMO_IDS.patient.name,
      doctorId: DEMO_IDS.doctor.id,
      doctorName: DEMO_IDS.doctor.name,
      encounterDate: getDateString(-5),
      medications: [{
        id: 'MED-DEMO-001',
        name: 'Amlodipine',
        genericName: 'Amlodipine besylate',
        strength: '5mg',
        form: 'Tablet',
        quantity: 30,
        dosage: '1 tablet',
        frequency: 'Once daily in the morning',
        route: 'Oral',
        duration: '30 days',
        instructions: 'Take one tablet in the morning with or without food. Monitor blood pressure regularly.',
        instructionsThai: 'รับประทานวันละ 1 เม็ด เช้า หลังอาหาร วัดความดันโลหิตสม่ำเสมอ',
        refills: 2,
        substitutionAllowed: true
      }],
      diagnosis: 'Essential hypertension (I10) - controlled',
      notes: 'Patient tolerating medication well. Blood pressure well controlled. Continue current regimen.',
      pharmacyNotes: 'Generic substitution permitted. Counsel patient on potential side effects including ankle swelling.',
      status: 'active',
      expiryDate: getDateString(360),
      createdAt: getDateString(-5),
      updatedAt: getDateString(-5)
    },
    {
      id: 'RX-DEMO-002',
      patientId: DEMO_IDS.patient.id,
      patientName: DEMO_IDS.patient.name,
      doctorId: DEMO_IDS.doctor.id,
      doctorName: DEMO_IDS.doctor.name,
      encounterDate: getDateString(-95),
      medications: [{
        id: 'MED-DEMO-002',
        name: 'Amlodipine',
        genericName: 'Amlodipine besylate',
        strength: '5mg',
        form: 'Tablet',
        quantity: 30,
        dosage: '1 tablet',
        frequency: 'Once daily',
        route: 'Oral',
        duration: '30 days',
        instructions: 'Take one tablet in the morning, preferably at the same time each day.',
        refills: 0,
        substitutionAllowed: true
      }],
      diagnosis: 'Essential hypertension - newly diagnosed (I10)',
      notes: 'Initial prescription for hypertension management.',
      pharmacyNotes: 'Generic substitution permitted. Counsel patient on potential side effects.',
      status: 'completed',
      expiryDate: getDateString(-65),
      createdAt: getDateString(-95),
      updatedAt: getDateString(-95)
    },
    {
      id: 'RX-DEMO-003',
      patientId: DEMO_IDS.patient.id,
      patientName: DEMO_IDS.patient.name,
      doctorId: DEMO_IDS.doctor.id,
      doctorName: DEMO_IDS.doctor.name,
      encounterDate: getDateString(-180),
      medications: [{
        id: 'MED-DEMO-003',
        name: 'Paracetamol',
        genericName: 'Acetaminophen',
        strength: '500mg',
        form: 'Tablet',
        quantity: 20,
        dosage: '1 tablet',
        frequency: 'Every 4-6 hours prn',
        route: 'Oral',
        duration: '5 days',
        instructions: 'Take one tablet every 4-6 hours as needed for fever or pain.',
        refills: 0,
        substitutionAllowed: true
      }],
      diagnosis: 'Acute upper respiratory infection (J06.9)',
      notes: 'Symptomatic treatment.',
      pharmacyNotes: '',
      status: 'completed',
      expiryDate: getDateString(-175),
      createdAt: getDateString(-180),
      updatedAt: getDateString(-180)
    },
    {
      id: 'RX-DEMO-004',
      patientId: DEMO_IDS.patient.id,
      patientName: DEMO_IDS.patient.name,
      doctorId: DEMO_IDS.doctor.id,
      doctorName: DEMO_IDS.doctor.name,
      encounterDate: getDateString(-250),
      medications: [{
        id: 'MED-DEMO-004',
        name: 'Ibuprofen',
        genericName: 'Ibuprofen',
        strength: '400mg',
        form: 'Tablet',
        quantity: 21,
        dosage: '1 tablet',
        frequency: 'Three times daily with food',
        route: 'Oral',
        duration: '7 days',
        instructions: 'Take one tablet three times daily with food for pain and inflammation. Do not exceed 3 tablets per day.',
        instructionsThai: 'รับประทานวันละ 3 เม็ด หลังอาหาร เพื่อลดอาการปวดและการอักเสบ ห้ามเกิน 3 เม็ดต่อวัน',
        refills: 0,
        substitutionAllowed: true
      }],
      diagnosis: 'Low back pain - acute mechanical (M54.5)',
      notes: 'For acute low back pain management.',
      pharmacyNotes: 'Counsel on taking with food to reduce GI upset.',
      status: 'completed',
      expiryDate: getDateString(-243),
      createdAt: getDateString(-250),
      updatedAt: getDateString(-250)
    },
    {
      id: 'RX-DEMO-005',
      patientId: DEMO_IDS.patient.id,
      patientName: DEMO_IDS.patient.name,
      doctorId: DEMO_IDS.doctor.id,
      doctorName: DEMO_IDS.doctor.name,
      encounterDate: getDateString(-310),
      medications: [{
        id: 'MED-DEMO-005',
        name: 'Omeprazole',
        genericName: 'Omeprazole',
        strength: '20mg',
        form: 'Capsule',
        quantity: 56,
        dosage: '1 capsule',
        frequency: 'Once daily before breakfast',
        route: 'Oral',
        duration: '8 weeks',
        instructions: 'Take one capsule 30 minutes before breakfast. Complete full 8-week course.',
        instructionsThai: 'รับประทานวันละ 1 เม็ด ก่อนอาหารเช้า 30 นาที รับประทานครบ 8 สัปดาห์',
        refills: 0,
        substitutionAllowed: true
      }],
      diagnosis: 'Gastroesophageal reflux disease (K21.0)',
      notes: 'Initial treatment for GERD symptoms.',
      pharmacyNotes: 'Take before meals for maximum effectiveness.',
      status: 'completed',
      expiryDate: getDateString(-254),
      createdAt: getDateString(-310),
      updatedAt: getDateString(-310)
    }
  ];
}

function generateLabOrders() {
  return [
    {
      id: 'LAB-DEMO-001',
      patientId: DEMO_IDS.patient.id,
      patientName: DEMO_IDS.patient.name,
      doctorId: DEMO_IDS.doctor.id,
      doctorName: DEMO_IDS.doctor.name,
      orderDate: getDateString(-95),
      tests: [
        { name: 'Total Cholesterol', code: 'CHOL', category: 'Lipid Profile', result: '205', unit: 'mg/dL', referenceRange: '<200', status: 'completed', abnormalFlag: 'H' },
        { name: 'HDL Cholesterol', code: 'HDL', category: 'Lipid Profile', result: '48', unit: 'mg/dL', referenceRange: '>40', status: 'completed', abnormalFlag: '' },
        { name: 'LDL Cholesterol', code: 'LDL', category: 'Lipid Profile', result: '135', unit: 'mg/dL', referenceRange: '<130', status: 'completed', abnormalFlag: 'H' },
        { name: 'Triglycerides', code: 'TRIG', category: 'Lipid Profile', result: '110', unit: 'mg/dL', referenceRange: '<150', status: 'completed', abnormalFlag: '' }
      ],
      testCategory: 'Lipid Profile',
      priority: 'routine',
      fastingRequired: true,
      specimenType: 'Blood',
      specimenCollectedAt: getDateString(-94),
      resultAvailableAt: getDateString(-93),
      status: 'completed',
      interpretation: 'Borderline high total cholesterol with elevated LDL. HDL within normal limits. Patient has additional cardiovascular risk factor (hypertension). Recommend lifestyle modifications.',
      interpretationThai: 'คอเลสเตอรอลรวมสูงปานกลาง LDL สูง HDL ปกติ ผู้ป่วยมีปัจจัยเสี่ยงโรคหัวใจ (ความดันสูง) แนะนำปรับพฤติกรรม',
      createdAt: getDateString(-95),
      updatedAt: getDateString(-93)
    },
    {
      id: 'LAB-DEMO-002',
      patientId: DEMO_IDS.patient.id,
      patientName: DEMO_IDS.patient.name,
      doctorId: DEMO_IDS.doctor.id,
      doctorName: DEMO_IDS.doctor.name,
      orderDate: getDateString(-95),
      tests: [
        { name: 'Creatinine', code: 'CREAT', category: 'Renal Function', result: '0.95', unit: 'mg/dL', referenceRange: '0.7-1.3', status: 'completed', abnormalFlag: '' },
        { name: 'Blood Urea Nitrogen (BUN)', code: 'BUN', category: 'Renal Function', result: '16', unit: 'mg/dL', referenceRange: '7-20', status: 'completed', abnormalFlag: '' },
        { name: 'eGFR', code: 'eGFR', category: 'Renal Function', result: '95', unit: 'mL/min/1.73m²', referenceRange: '>60', status: 'completed', abnormalFlag: '' },
        { name: 'Sodium', code: 'NA', category: 'Electrolytes', result: '140', unit: 'mEq/L', referenceRange: '136-145', status: 'completed', abnormalFlag: '' },
        { name: 'Potassium', code: 'K', category: 'Electrolytes', result: '4.2', unit: 'mEq/L', referenceRange: '3.5-5.0', status: 'completed', abnormalFlag: '' }
      ],
      testCategory: 'Renal Function & Electrolytes',
      priority: 'routine',
      fastingRequired: false,
      specimenType: 'Blood',
      specimenCollectedAt: getDateString(-94),
      resultAvailableAt: getDateString(-93),
      status: 'completed',
      interpretation: 'Normal renal function with eGFR 95 mL/min/1.73m². Electrolytes within normal limits. Safe to continue antihypertensive therapy.',
      interpretationThai: 'การทำงานของไตปกติ eGFR 95 อิเล็กโทรไลต์ปกติ ปลอดภัยที่จะใช้ยาลดความดันต่อไป',
      createdAt: getDateString(-95),
      updatedAt: getDateString(-93)
    },
    {
      id: 'LAB-DEMO-003',
      patientId: DEMO_IDS.patient.id,
      patientName: DEMO_IDS.patient.name,
      doctorId: DEMO_IDS.doctor.id,
      doctorName: DEMO_IDS.doctor.name,
      orderDate: getDateString(-200),
      tests: [
        { name: 'White Blood Cell Count', code: 'WBC', category: 'CBC', result: '7.2', unit: '10^3/μL', referenceRange: '4.5-11.0', status: 'completed', abnormalFlag: '' },
        { name: 'Red Blood Cell Count', code: 'RBC', category: 'CBC', result: '5.1', unit: '10^6/μL', referenceRange: '4.5-5.9', status: 'completed', abnormalFlag: '' },
        { name: 'Hemoglobin', code: 'HGB', category: 'CBC', result: '15.2', unit: 'g/dL', referenceRange: '13.5-17.5', status: 'completed', abnormalFlag: '' },
        { name: 'Hematocrit', code: 'HCT', category: 'CBC', result: '45.5', unit: '%', referenceRange: '38.8-50.0', status: 'completed', abnormalFlag: '' },
        { name: 'Platelet Count', code: 'PLT', category: 'CBC', result: '250', unit: '10^3/μL', referenceRange: '150-400', status: 'completed', abnormalFlag: '' }
      ],
      testCategory: 'Complete Blood Count (CBC)',
      priority: 'routine',
      fastingRequired: false,
      specimenType: 'Blood',
      specimenCollectedAt: getDateString(-199),
      resultAvailableAt: getDateString(-199),
      status: 'completed',
      interpretation: 'Complete blood count within normal limits. No evidence of anemia, infection, or hematologic disorders.',
      interpretationThai: 'ผลตรวจเลือดสมบูรณ์ปกติ ไม่พบภาวะโลหิตจาง การติดเชื้อ หรือความผิดปกติทางเลือด',
      createdAt: getDateString(-200),
      updatedAt: getDateString(-199)
    },
    {
      id: 'LAB-DEMO-004',
      patientId: DEMO_IDS.patient.id,
      patientName: DEMO_IDS.patient.name,
      doctorId: DEMO_IDS.doctor.id,
      doctorName: DEMO_IDS.doctor.name,
      orderDate: getDateString(-200),
      tests: [
        { name: 'Fasting Blood Glucose', code: 'FBG', category: 'Chemistry', result: '92', unit: 'mg/dL', referenceRange: '70-100', status: 'completed', abnormalFlag: '' },
        { name: 'ALT (SGPT)', code: 'ALT', category: 'Liver Function', result: '28', unit: 'U/L', referenceRange: '7-56', status: 'completed', abnormalFlag: '' },
        { name: 'AST (SGOT)', code: 'AST', category: 'Liver Function', result: '24', unit: 'U/L', referenceRange: '10-40', status: 'completed', abnormalFlag: '' },
        { name: 'Alkaline Phosphatase', code: 'ALP', category: 'Liver Function', result: '75', unit: 'U/L', referenceRange: '44-147', status: 'completed', abnormalFlag: '' }
      ],
      testCategory: 'Metabolic Panel',
      priority: 'routine',
      fastingRequired: true,
      specimenType: 'Blood',
      specimenCollectedAt: getDateString(-199),
      resultAvailableAt: getDateString(-199),
      status: 'completed',
      interpretation: 'Fasting glucose normal. Liver function tests within normal limits. No evidence of diabetes or hepatic dysfunction.',
      interpretationThai: 'น้ำตาลในเลือดขณะอดอาหารปกติ การทำงานของตับปกติ ไม่พบเบาหวานหรือความผิดปกติของตับ',
      createdAt: getDateString(-200),
      updatedAt: getDateString(-199)
    },
    {
      id: 'LAB-DEMO-005',
      patientId: DEMO_IDS.patient.id,
      patientName: DEMO_IDS.patient.name,
      doctorId: DEMO_IDS.doctor.id,
      doctorName: DEMO_IDS.doctor.name,
      orderDate: getDateString(-310),
      tests: [
        { name: 'H. pylori Antigen', code: 'HPYLORI', category: 'Infectious Disease', result: 'Negative', unit: '', referenceRange: 'Negative', status: 'completed', abnormalFlag: '' }
      ],
      testCategory: 'H. pylori Testing',
      priority: 'routine',
      fastingRequired: false,
      specimenType: 'Stool',
      specimenCollectedAt: getDateString(-309),
      resultAvailableAt: getDateString(-308),
      status: 'completed',
      interpretation: 'Helicobacter pylori antigen test negative. GERD symptoms likely not related to H. pylori infection.',
      interpretationThai: 'ผลตรวจเชื้อ H. pylori เป็นลบ อาการกรดไหลย้อนน่าจะไม่เกี่ยวข้องกับการติดเชื้อ H. pylori',
      createdAt: getDateString(-310),
      updatedAt: getDateString(-308)
    }
  ];
}

function generateImagingOrders() {
  return [{
    id: 'IMG-DEMO-001',
    patientId: DEMO_IDS.patient.id,
    patientName: DEMO_IDS.patient.name,
    doctorId: DEMO_IDS.doctor.id,
    doctorName: DEMO_IDS.doctor.name,
    orderDate: getDateString(-95),
    modality: 'xray',
    bodyRegion: 'Chest',
    clinicalIndication: 'Baseline chest X-ray for new hypertension diagnosis',
    clinicalIndicationThai: 'เอกซเรย์ทรวงอกพื้นฐานสำหรับการวินิจฉัยความดันโลหิตสูงใหม่',
    contrast: false,
    urgency: 'routine',
    status: 'completed',
    report: {
      findings: 'Heart size within normal limits with cardiothoracic ratio of 0.45. No cardiomegaly. Aortic knob and mediastinal contours normal. Lung fields are clear bilaterally without infiltrates, masses, or effusions. No pneumothorax. Costophrenic angles sharp. Bony thorax intact.',
      impression: 'Normal chest radiograph. No evidence of cardiomegaly or pulmonary pathology.',
      impressionThai: 'ผลเอกซเรย์ทรวงอกปกติ ไม่พบหัวใจโตหรือพยาธิสภาพที่ปอด',
      radiologist: 'Dr. Radiology Example',
      reportedAt: getDateString(-93)
    },
    createdAt: getDateString(-95),
    updatedAt: getDateString(-93)
  }];
}

function generateQueue() {
  return [{
    id: 'Q-DEMO-001',
    patientId: DEMO_IDS.patient.id,
    patientName: DEMO_IDS.patient.name,
    patientPhoto: DEMO_IDS.patient.avatarUrl,
    appointmentId: 'APT-DEMO-001',
    queuePosition: 1,
    appointmentTime: getDateString(0),
    estimatedWaitTime: 15,
    status: 'waiting',
    priority: 'routine',
    reason: 'Hypertension follow-up',
    reasonThai: 'ติดตามโรคความดันโลหิตสูง',
    checkInTime: getDateString(0)
  }];
}

// ============================================================================
// PATIENT DATA (izara-patients-data)
// ============================================================================

function generatePHR() {
  return {
    id: `phr-${DEMO_IDS.patient.id}`,
    patientId: DEMO_IDS.patient.id,
    demographics: {
      name: DEMO_IDS.patient.name,
      nameThai: DEMO_IDS.patient.nameThai,
      dateOfBirth: '1990-01-15',
      gender: 'male',
      bloodType: 'O+',
      height: 175,
      weight: 75,
      ethnicity: 'Thai',
      occupation: 'Software Engineer'
    },
    vitalSignsHistory: [
      {
        bloodPressure: { systolic: 135, diastolic: 82, unit: 'mmHg' },
        heartRate: { value: 72, unit: 'bpm' },
        temperature: { value: 36.8, unit: 'celsius' },
        oxygenSaturation: { value: 98, unit: '%' },
        weight: { value: 75, unit: 'kg' },
        height: { value: 175, unit: 'cm' },
        bmi: 24.5,
        measuredAt: getDateString(-5)
      },
      {
        bloodPressure: { systolic: 148, diastolic: 92, unit: 'mmHg' },
        heartRate: { value: 78, unit: 'bpm' },
        temperature: { value: 36.7, unit: 'celsius' },
        oxygenSaturation: { value: 99, unit: '%' },
        weight: { value: 76, unit: 'kg' },
        height: { value: 175, unit: 'cm' },
        bmi: 24.8,
        measuredAt: getDateString(-95)
      },
      {
        bloodPressure: { systolic: 120, diastolic: 80, unit: 'mmHg' },
        heartRate: { value: 90, unit: 'bpm' },
        temperature: { value: 38.2, unit: 'celsius' },
        oxygenSaturation: { value: 98, unit: '%' },
        weight: { value: 75, unit: 'kg' },
        height: { value: 175, unit: 'cm' },
        bmi: 24.5,
        measuredAt: getDateString(-180)
      }
    ],
    lifestyle: {
      smokingStatus: 'never',
      alcoholConsumption: 'occasional',
      exerciseFrequency: 'moderate',
      dietType: 'omnivore',
      sleepHours: 7,
      stressLevel: 'moderate',
      occupation: 'Software Engineer'
    },
    allergies: ['Penicillin'],
    chronicConditions: ['Hypertension'],
    currentMedications: [{
      id: 'med-001',
      name: 'Amlodipine',
      genericName: 'Amlodipine besylate',
      dosage: '5mg',
      frequency: 'Once daily',
      route: 'oral',
      startDate: getDateString(-95),
      prescribedBy: DEMO_IDS.doctor.name,
      purpose: 'Blood pressure control',
      status: 'active'
    }],
    vaccinations: [
      {
        id: 'vac-001',
        name: 'COVID-19 (Pfizer)',
        date: getDateString(-365),
        manufacturer: 'Pfizer-BioNTech',
        lotNumber: 'FF1234',
        site: 'Left arm',
        administeredBy: 'Bangkok Hospital'
      },
      {
        id: 'vac-002',
        name: 'Influenza Vaccine 2025',
        date: getDateString(-60),
        manufacturer: 'Sanofi',
        lotNumber: 'FLU2025',
        site: 'Left arm',
        administeredBy: 'X Hospital Bangkok'
      },
      {
        id: 'vac-003',
        name: 'Tetanus-Diphtheria (Td)',
        date: getDateString(-1095),
        manufacturer: 'Sanofi Pasteur',
        lotNumber: 'TD2022',
        site: 'Right arm',
        administeredBy: 'X Hospital Bangkok'
      },
      {
        id: 'vac-004',
        name: 'Hepatitis B (Complete Series)',
        date: getDateString(-3650),
        manufacturer: 'GSK',
        lotNumber: 'HEPB2015',
        site: 'Left arm',
        administeredBy: 'Bangkok Hospital',
        notes: '3-dose series completed'
      }
    ],
    documents: [],
    updatedAt: getDateString(0)
  };
}

function generateLivingWill() {
  return {
    id: `lw-${DEMO_IDS.patient.id}`,
    patientId: DEMO_IDS.patient.id,
    healthcareProxy: {
      primary: {
        name: 'Demo Emergency Contact',
        nameThai: 'นาง สมใจ ระบบ',
        relationship: 'Spouse',
        phone: '+66 82 345 6789',
        email: 'emergency.contact@example.com',
        address: '123 Demo Street, Sukhumvit, Bangkok, Thailand 10110'
      }
    },
    preferences: {
      cpr: true,
      mechanicalVentilation: false,
      artificialNutrition: true,
      dialysis: true,
      organDonation: true,
      painManagement: 'Full pain management desired',
      painManagementThai: 'ต้องการการบรรเทาอาการปวดอย่างเต็มที่',
      additionalWishes: 'Prefer to spend final moments with family at home',
      additionalWishesThai: 'ต้องการใช้เวลาสุดท้ายกับครอบครัวที่บ้าน'
    },
    religiousPreferences: 'Buddhist',
    digitalSignature: 'DEMO_SIGNATURE_BASE64_DATA',
    createdAt: getDateString(-180),
    updatedAt: getDateString(-30),
    sharedWith: [DEMO_IDS.doctor.id]
  };
}

function generatePDPAConsents() {
  return [{
    id: `pdpa-${DEMO_IDS.patient.id}-${DEMO_IDS.doctor.id}`,
    patientId: DEMO_IDS.patient.id,
    doctorId: DEMO_IDS.doctor.id,
    doctorName: DEMO_IDS.doctor.name,
    dataTypes: ['phr', 'emr', 'prescriptions', 'labs', 'imaging'],
    status: 'granted',
    grantedAt: getDateString(-180),
    expiresAt: getDateString(545),
    digitalSignature: 'DEMO_PDPA_SIGNATURE_BASE64',
    ipAddress: '192.168.1.100',
    auditLog: [
      {
        timestamp: getDateString(-5),
        doctorId: DEMO_IDS.doctor.id,
        doctorName: DEMO_IDS.doctor.name,
        dataAccessed: 'PHR - Vital Signs, Medical History',
        purpose: 'Routine consultation and follow-up',
        purposeThai: 'ตรวจรักษาและติดตามอาการตามนัด',
        ipAddress: '10.0.0.50'
      },
      {
        timestamp: getDateString(-95),
        doctorId: DEMO_IDS.doctor.id,
        doctorName: DEMO_IDS.doctor.name,
        dataAccessed: 'PHR - Complete Medical Record',
        purpose: 'Initial consultation for hypertension',
        purposeThai: 'ตรวจวินิจฉัยโรคความดันโลหิตสูงครั้งแรก',
        ipAddress: '10.0.0.50'
      }
    ]
  }];
}

function generatePatientAIChatSessions() {
  return [{
    id: `chat-${DEMO_IDS.patient.id}-001`,
    patientId: DEMO_IDS.patient.id,
    title: 'Headache consultation',
    titleThai: 'ปรึกษาอาการปวดหัว',
    messages: [
      {
        id: 'msg-001',
        role: 'user',
        content: 'I have been having headaches for the past 3 days',
        timestamp: getDateString(-10)
      },
      {
        id: 'msg-002',
        role: 'assistant',
        content: 'Thank you for sharing your symptoms. Let me ask a few questions to better understand your condition:\n\n1. Where exactly do you feel the headache? (front, back, sides, or all over)\n2. How would you describe the pain? (throbbing, pressure, sharp)\n3. On a scale of 1-10, how severe is the pain?\n4. Do you have any other symptoms like nausea, sensitivity to light, or neck stiffness?',
        timestamp: getDateString(-10)
      }
    ],
    context: 'symptom_checker',
    aiModel: 'gemini-2.5-flash-lite',
    createdAt: getDateString(-10),
    updatedAt: getDateString(-10)
  }];
}

function generateMedicalTimeline() {
  return {
    patientId: DEMO_IDS.patient.id,
    events: [
      {
        id: 'timeline-001',
        date: getDateString(-5),
        type: 'consultation',
        title: 'Follow-up Consultation',
        titleThai: 'ตรวจติดตามอาการ',
        description: 'Hypertension follow-up - BP controlled, continue current medication',
        descriptionThai: 'ติดตามโรคความดันสูง - ความดันคุมได้ดี ใช้ยาเดิมต่อ',
        doctorName: DEMO_IDS.doctor.name,
        hospitalName: 'X Hospital Bangkok',
        documents: [],
        metadata: {
          emrId: 'EMR-DEMO-001',
          appointmentId: 'APT-DEMO-002'
        }
      },
      {
        id: 'timeline-002',
        date: getDateString(-93),
        type: 'lab',
        title: 'Laboratory Tests',
        titleThai: 'ตรวจเลือด',
        description: 'Lipid Profile and Renal Function tests - slight elevation in LDL',
        descriptionThai: 'ตรวจไขมันในเลือดและการทำงานของไต - LDL สูงเล็กน้อย',
        doctorName: DEMO_IDS.doctor.name,
        hospitalName: 'X Hospital Bangkok',
        documents: [],
        metadata: {
          labOrderIds: ['LAB-DEMO-001', 'LAB-DEMO-002']
        }
      },
      {
        id: 'timeline-003',
        date: getDateString(-93),
        type: 'imaging',
        title: 'Chest X-Ray',
        titleThai: 'เอกซเรย์ทรวงอก',
        description: 'Baseline chest X-ray - Normal findings',
        descriptionThai: 'เอกซเรย์ทรวงอกพื้นฐาน - ผลปกติ',
        doctorName: DEMO_IDS.doctor.name,
        hospitalName: 'X Hospital Bangkok',
        documents: [],
        metadata: {
          imagingOrderId: 'IMG-DEMO-001'
        }
      },
      {
        id: 'timeline-004',
        date: getDateString(-95),
        type: 'diagnosis',
        title: 'Hypertension Diagnosis',
        titleThai: 'วินิจฉัยโรคความดันโลหิตสูง',
        description: 'Initial diagnosis of essential hypertension - Started Amlodipine 5mg',
        descriptionThai: 'วินิจฉัยโรคความดันโลหิตสูงปฐมภูมิ - เริ่มยา Amlodipine 5mg',
        doctorName: DEMO_IDS.doctor.name,
        hospitalName: 'X Hospital Bangkok',
        documents: [],
        metadata: {
          emrId: 'EMR-DEMO-002',
          appointmentId: 'APT-DEMO-003',
          icd10: 'I10'
        }
      },
      {
        id: 'timeline-005',
        date: getDateString(-60),
        type: 'vaccination',
        title: 'Influenza Vaccination',
        titleThai: 'รับวัคซีนไข้หวัดใหญ่',
        description: '2025 Influenza Vaccine administered',
        descriptionThai: 'รับวัคซีนไข้หวัดใหญ่ประจำปี 2025',
        hospitalName: 'X Hospital Bangkok',
        documents: [],
        metadata: {
          vaccineName: 'Influenza 2025',
          manufacturer: 'Sanofi'
        }
      },
      {
        id: 'timeline-006',
        date: getDateString(-180),
        type: 'consultation',
        title: 'Sick Visit',
        titleThai: 'ตรวจรักษาอาการป่วย',
        description: 'Acute upper respiratory infection',
        descriptionThai: 'การติดเชื้อทางเดินหายใจส่วนบนเฉียบพลัน',
        doctorName: DEMO_IDS.doctor.name,
        hospitalName: 'X Hospital Bangkok',
        documents: [],
        metadata: {
          emrId: 'EMR-DEMO-003',
          appointmentId: 'APT-DEMO-004',
          icd10: 'J06.9'
        }
      },
      {
        id: 'timeline-007',
        date: getDateString(-199),
        type: 'lab',
        title: 'Annual Health Screening Labs',
        titleThai: 'ตรวจเลือดเพื่อสุขภาพประจำปี',
        description: 'Complete Blood Count and Metabolic Panel - All results within normal limits',
        descriptionThai: 'ตรวจเลือดสมบูรณ์และระดับน้ำตาล - ผลทุกอย่างปกติ',
        doctorName: DEMO_IDS.doctor.name,
        hospitalName: 'X Hospital Bangkok',
        documents: [],
        metadata: {
          labOrderIds: ['LAB-DEMO-003', 'LAB-DEMO-004']
        }
      },
      {
        id: 'timeline-008',
        date: getDateString(-200),
        type: 'consultation',
        title: 'Annual Physical Examination',
        titleThai: 'ตรวจสุขภาพประจำปี',
        description: 'Comprehensive annual health check - Overall good health status',
        descriptionThai: 'ตรวจสุขภาพประจำปีอย่างละเอียด - สุขภาพโดยรวมดี',
        doctorName: DEMO_IDS.doctor.name,
        hospitalName: 'X Hospital Bangkok',
        documents: [],
        metadata: {
          emrId: 'EMR-DEMO-004',
          icd10: 'Z00.00'
        }
      },
      {
        id: 'timeline-009',
        date: getDateString(-250),
        type: 'consultation',
        title: 'Acute Back Pain',
        titleThai: 'อาการปวดหลังเฉียบพลัน',
        description: 'Lower back pain after lifting - Treated with NSAIDs and rest',
        descriptionThai: 'ปวดหลังส่วนล่างหลังยกของหนัก - รักษาด้วยยาแก้ปวดและพักผ่อน',
        doctorName: DEMO_IDS.doctor.name,
        hospitalName: 'X Hospital Bangkok',
        documents: [],
        metadata: {
          emrId: 'EMR-DEMO-005',
          icd10: 'M54.5'
        }
      },
      {
        id: 'timeline-010',
        date: getDateString(-308),
        type: 'lab',
        title: 'H. pylori Test',
        titleThai: 'ตรวจเชื้อ H. pylori',
        description: 'Stool antigen test for H. pylori - Negative result',
        descriptionThai: 'ตรวจหาเชื้อ H. pylori ในอุจจาระ - ผลเป็นลบ',
        doctorName: DEMO_IDS.doctor.name,
        hospitalName: 'X Hospital Bangkok',
        documents: [],
        metadata: {
          labOrderId: 'LAB-DEMO-005'
        }
      },
      {
        id: 'timeline-011',
        date: getDateString(-310),
        type: 'diagnosis',
        title: 'GERD Diagnosis',
        titleThai: 'วินิจฉัยโรคกรดไหลย้อน',
        description: 'Diagnosed with gastroesophageal reflux disease - Started PPI therapy',
        descriptionThai: 'วินิจฉัยโรคกรดไหลย้อน - เริ่มยาลดกรด',
        doctorName: DEMO_IDS.doctor.name,
        hospitalName: 'X Hospital Bangkok',
        documents: [],
        metadata: {
          emrId: 'EMR-DEMO-006',
          icd10: 'K21.0'
        }
      },
      {
        id: 'timeline-012',
        date: getDateString(-365),
        type: 'vaccination',
        title: 'COVID-19 Booster',
        titleThai: 'วัคซีนโควิด-19 เข็มกระตุ้น',
        description: 'COVID-19 booster vaccine (Pfizer) - No adverse reactions',
        descriptionThai: 'วัคซีนโควิด-19 เข็มกระตุ้น (ไฟเซอร์) - ไม่มีผลข้างเคียง',
        hospitalName: 'Bangkok Hospital',
        documents: [],
        metadata: {
          vaccineName: 'COVID-19 Booster',
          manufacturer: 'Pfizer-BioNTech',
          dose: 'Booster'
        }
      }
    ]
  };
}

// ============================================================================
// APPOINTMENTS (izara-appointments)
// ============================================================================

function generateAppointments() {
  return [
    {
      id: 'APT-DEMO-001',
      patientId: DEMO_IDS.patient.id,
      patientName: DEMO_IDS.patient.name,
      patientPhoto: DEMO_IDS.patient.avatarUrl,
      patientEmail: DEMO_IDS.patient.email,
      doctorId: DEMO_IDS.doctor.id,
      doctorName: DEMO_IDS.doctor.name,
      doctorSpecialty: 'General Practice',
      doctorAvatar: DEMO_IDS.doctor.avatarUrl,
      doctorEmail: DEMO_IDS.doctor.email,
      dateTime: getDateString(1),
      appointmentDate: getDateString(1),
      appointmentTime: '10:00',
      duration: 30,
      type: 'telehealth',
      status: 'confirmed',
      reason: 'Hypertension follow-up and medication review',
      reasonThai: 'ติดตามโรคความดันโลหิตสูงและทบทวนยา',
      symptoms: ['Blood pressure monitoring', 'Medication review'],
      notes: 'Patient requested video consultation for medication adjustment',
      meetingLink: 'https://meet.google.com/izara-demo-001',
      calendarEventId: 'calendar-event-001',
      createdAt: getDateString(-1),
      updatedAt: getDateString(-1)
    },
    // PENDING APPOINTMENT - NEEDS DOCTOR CONFIRMATION
    {
      id: 'APT-PENDING-001',
      patientId: DEMO_IDS.patient.id,
      patientName: DEMO_IDS.patient.name,
      patientPhoto: DEMO_IDS.patient.avatarUrl,
      patientEmail: DEMO_IDS.patient.email,
      doctorId: DEMO_IDS.doctor.id,
      doctorName: DEMO_IDS.doctor.name,
      doctorSpecialty: 'General Practice',
      doctorAvatar: DEMO_IDS.doctor.avatarUrl,
      doctorEmail: DEMO_IDS.doctor.email,
      dateTime: getDateString(3),
      appointmentDate: getDateString(3),
      appointmentTime: '09:30',
      duration: 30,
      type: 'telehealth',
      status: 'pending',
      reason: 'Follow-up consultation for blood pressure monitoring',
      reasonThai: 'ตรวจติดตามความดันโลหิต',
      symptoms: ['Blood pressure check', 'Medication review'],
      notes: 'Admin assigned to Dr. Test Doctor - awaiting doctor confirmation',
      adminNote: 'Patient requested urgent follow-up due to elevated BP readings at home',
      assignedBy: 'ADMIN-001',
      assignedAt: getDateString(0),
      createdAt: getDateString(-1),
      updatedAt: getDateString(0)
    },
    // PENDING APPOINTMENT #2 - DIRECT PATIENT REQUEST
    {
      id: 'APT-PENDING-002',
      patientId: DEMO_IDS.patient.id,
      patientName: DEMO_IDS.patient.name,
      patientPhoto: DEMO_IDS.patient.avatarUrl,
      patientEmail: DEMO_IDS.patient.email,
      doctorId: DEMO_IDS.doctor.id,
      doctorName: DEMO_IDS.doctor.name,
      doctorSpecialty: 'General Practice',
      doctorAvatar: DEMO_IDS.doctor.avatarUrl,
      doctorEmail: DEMO_IDS.doctor.email,
      dateTime: getDateString(7),
      appointmentDate: getDateString(7),
      appointmentTime: '15:00',
      duration: 45,
      type: 'in_person',
      status: 'pending',
      reason: 'New symptoms - chest discomfort and shortness of breath',
      reasonThai: 'อาการใหม่ - แน่นหน้าอกและหายใจไม่สะดวก',
      symptoms: ['Chest discomfort', 'Shortness of breath', 'Fatigue'],
      notes: 'Patient direct request - needs evaluation for cardiac symptoms',
      patientNote: 'Experiencing chest tightness for the past 3 days, worse with exertion',
      requestType: 'patient-direct',
      createdAt: getDateString(0),
      updatedAt: getDateString(0)
    },

    {
      id: 'APT-DEMO-002',
      patientId: DEMO_IDS.patient.id,
      patientName: DEMO_IDS.patient.name,
      patientPhoto: DEMO_IDS.patient.avatarUrl,
      patientEmail: DEMO_IDS.patient.email,
      doctorId: DEMO_IDS.doctor.id,
      doctorName: DEMO_IDS.doctor.name,
      doctorSpecialty: 'General Practice',
      doctorAvatar: DEMO_IDS.doctor.avatarUrl,
      dateTime: getDateString(-5),
      appointmentDate: getDateString(-5),
      appointmentTime: '09:00',
      duration: 30,
      type: 'telehealth',
      status: 'completed',
      reason: 'General checkup and blood pressure monitoring',
      reasonThai: 'ตรวจสุขภาพทั่วไปและวัดความดันโลหิต',
      symptoms: ['Routine checkup'],
      notes: 'Completed consultation - patient stable, BP controlled',
      diagnosis: 'Essential hypertension - controlled (I10)',
      meetingLink: 'https://meet.google.com/izara-demo-002',
      result: {
        diagnosis: 'Essential hypertension - well controlled',
        prescriptions: ['RX-DEMO-001'],
        followUpDate: getDateString(90),
        notes: 'Continue current medication. Lifestyle modifications working well.'
      },
      createdAt: getDateString(-6),
      updatedAt: getDateString(-5)
    },
    {
      id: 'APT-DEMO-003',
      patientId: DEMO_IDS.patient.id,
      patientName: DEMO_IDS.patient.name,
      patientPhoto: DEMO_IDS.patient.avatarUrl,
      patientEmail: DEMO_IDS.patient.email,
      doctorId: DEMO_IDS.doctor.id,
      doctorName: DEMO_IDS.doctor.name,
      doctorSpecialty: 'General Practice',
      doctorAvatar: DEMO_IDS.doctor.avatarUrl,
      dateTime: getDateString(-95),
      appointmentDate: getDateString(-95),
      appointmentTime: '14:00',
      duration: 45,
      type: 'in_person',
      status: 'completed',
      reason: 'Initial hypertension diagnosis and management',
      reasonThai: 'วินิจฉัยและรักษาโรคความดันโลหิตสูงครั้งแรก',
      symptoms: ['Headache', 'Elevated blood pressure'],
      notes: 'Initial consultation - diagnosed with essential hypertension, started Amlodipine',
      diagnosis: 'Essential hypertension - newly diagnosed (I10)',
      result: {
        diagnosis: 'Essential (primary) hypertension - newly diagnosed',
        prescriptions: ['RX-DEMO-002'],
        labOrders: ['LAB-DEMO-001', 'LAB-DEMO-002'],
        imagingOrders: ['IMG-DEMO-001'],
        followUpDate: getDateString(-65),
        notes: 'Started Amlodipine 5mg daily. Ordered baseline labs and chest X-ray.'
      },
      createdAt: getDateString(-96),
      updatedAt: getDateString(-95)
    },
    {
      id: 'APT-DEMO-004',
      patientId: DEMO_IDS.patient.id,
      patientName: DEMO_IDS.patient.name,
      patientPhoto: DEMO_IDS.patient.avatarUrl,
      patientEmail: DEMO_IDS.patient.email,
      doctorId: DEMO_IDS.doctor.id,
      doctorName: DEMO_IDS.doctor.name,
      doctorSpecialty: 'General Practice',
      doctorAvatar: DEMO_IDS.doctor.avatarUrl,
      dateTime: getDateString(-180),
      appointmentDate: getDateString(-180),
      appointmentTime: '11:00',
      duration: 30,
      type: 'in_person',
      status: 'completed',
      reason: 'Flu symptoms',
      reasonThai: 'อาการไข้หวัดใหญ่',
      symptoms: ['Fever', 'Cough', 'Sore throat'],
      notes: 'Prescribed rest and fluids',
      diagnosis: 'Acute upper respiratory infection (J06.9)',
      result: {
        diagnosis: 'Acute upper respiratory infection',
        prescriptions: ['RX-DEMO-003'],
        notes: 'Symptomatic treatment.'
      },
      createdAt: getDateString(-181),
      updatedAt: getDateString(-180)
    }
  ];
}

function generateAppointmentResults() {
  return [
    {
      id: 'result-APT-DEMO-002',
      appointmentId: 'APT-DEMO-002',
      patientId: DEMO_IDS.patient.id,
      doctorId: DEMO_IDS.doctor.id,
      diagnosis: 'Essential hypertension - well controlled (I10)',
      diagnosisThai: 'โรคความดันโลหิตสูงปฐมภูมิ - ควบคุมได้ดี',
      clinicalNotes: 'Patient reports good compliance with Amlodipine. BP well controlled at 135/82. Continue current regimen.',
      vitalSigns: {
        bloodPressure: '135/82 mmHg',
        heartRate: '72 bpm',
        temperature: '36.8°C',
        oxygenSaturation: '98%'
      },
      prescriptions: ['RX-DEMO-001'],
      treatmentPlan: {
        goals: ['Maintain BP below 140/90', 'Continue lifestyle modifications'],
        interventions: ['Continue Amlodipine 5mg daily', 'Low-sodium diet', 'Regular exercise'],
        timeline: '3 months',
        homeCareSummary: 'Monitor BP weekly at home. Continue low-salt diet and exercise routine.',
        homeCareSummaryThai: 'วัดความดันที่บ้านสัปดาห์ละครั้ง รับประทานอาหารลดเกลือและออกกำลังกายต่อเนื่อง'
      },
      followUpDate: getDateString(90),
      aiSummary: 'Follow-up visit for essential hypertension. Patient demonstrates excellent medication compliance. Blood pressure is well-controlled on current regimen. No adverse effects reported. Continue current management with lifestyle modifications.',
      aiSummaryThai: 'ตรวจติดตามโรคความดันโลหิตสูง ผู้ป่วยรับประทานยาสม่ำเสมอ ความดันโลหิตควบคุมได้ดี ไม่มีผลข้างเคียง ใช้ยาและปรับพฤติกรรมต่อเนื่อง',
      createdAt: getDateString(-5)
    },
    {
      id: 'result-APT-DEMO-003',
      appointmentId: 'APT-DEMO-003',
      patientId: DEMO_IDS.patient.id,
      doctorId: DEMO_IDS.doctor.id,
      diagnosis: 'Essential (primary) hypertension - newly diagnosed (I10)',
      diagnosisThai: 'โรคความดันโลหิตสูงปฐมภูมิ - วินิจฉัยใหม่',
      clinicalNotes: 'Patient presents with elevated BP 148/92 detected during routine checkup. History of mild headaches. Family history positive for hypertension. Initiating pharmacotherapy and lifestyle modifications.',
      vitalSigns: {
        bloodPressure: '148/92 mmHg',
        heartRate: '78 bpm',
        temperature: '36.7°C',
        oxygenSaturation: '99%'
      },
      prescriptions: ['RX-DEMO-002'],
      labOrders: ['LAB-DEMO-001', 'LAB-DEMO-002'],
      imagingOrders: ['IMG-DEMO-001'],
      treatmentPlan: {
        goals: ['Reduce BP to below 140/90', 'Establish baseline cardiac status', 'Lifestyle modifications'],
        interventions: ['Amlodipine 5mg daily', 'DASH diet', 'Sodium restriction <2g/day', 'Exercise 30min 5x/week'],
        timeline: '4 weeks for initial response',
        homeCareSummary: 'Start Amlodipine 5mg in the morning. Monitor BP at home. Follow low-salt diet. Increase physical activity. Return for labs before next visit.',
        homeCareSummaryThai: 'เริ่มยา Amlodipine 5mg ตอนเช้า วัดความดันที่บ้าน รับประทานอาหารลดเกลือ เพิ่มการออกกำลังกาย มาตรวจเลือดก่อนนัดครั้งหน้า'
      },
      followUpDate: getDateString(-65),
      aiSummary: 'New diagnosis of essential hypertension in 34-year-old male with family history. Stage 1 hypertension with no target organ damage. Initiated CCB therapy with comprehensive lifestyle counseling. Baseline cardiovascular workup ordered.',
      createdAt: getDateString(-95)
    }
  ];
}

// ============================================================================
// METADATA (izara-meta-data)
// ============================================================================

function generateDoctorsList() {
  return [
    {
      id: DEMO_IDS.doctor.id,
      name: DEMO_IDS.doctor.name,
      nameThai: DEMO_IDS.doctor.nameThai,
      specialty: 'General Practice',
      specialtyThai: 'เวชปฏิบัติทั่วไป',
      hospital: 'Izara Hospital Bangkok',
      avatarUrl: DEMO_IDS.doctor.avatarUrl,
      email: DEMO_IDS.doctor.email,
      rating: 4.9,
      reviewCount: 247,
      experience: '15 years',
      languages: ['Thai', 'English'],
      availability: [
        { day: 'Monday', slots: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'] },
        { day: 'Tuesday', slots: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'] },
        { day: 'Wednesday', slots: ['09:00', '10:00', '11:00', '14:00', '15:00'] },
        { day: 'Thursday', slots: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'] },
        { day: 'Friday', slots: ['09:00', '10:00', '11:00', '14:00', '15:00'] },
        { day: 'Saturday', slots: ['09:00', '10:00', '11:00'] }
      ]
    },
    {
      id: 'DOC-005',
      name: 'Dr. Kittisak Phromrak',
      nameThai: 'นพ. กิตติศักดิ์ พร้อมรักษ์',
      specialty: 'Cardiology',
      specialtyThai: 'โรคหัวใจและหลอดเลือด',
      hospital: 'Bangkok Heart Hospital',
      avatarUrl: 'https://i.pravatar.cc/150?u=doc005',
      email: 'kittisak.p@bangkokheart.com',
      rating: 4.9,
      reviewCount: 423,
      experience: '20 years',
      languages: ['Thai', 'English', 'Japanese'],
      availability: [
        { day: 'Monday', slots: ['08:00', '09:00', '10:00', '14:00', '15:00'] },
        { day: 'Wednesday', slots: ['08:00', '09:00', '10:00', '14:00', '15:00'] },
        { day: 'Thursday', slots: ['08:00', '09:00', '10:00'] }
      ]
    },
    {
      id: 'DOC-006',
      name: 'Dr. Kanya Rattanaporn',
      nameThai: 'พญ. กัญญา รัตนพร',
      specialty: 'Dermatology',
      specialtyThai: 'ผิวหนัง',
      hospital: 'Siriraj Hospital',
      avatarUrl: 'https://i.pravatar.cc/150?u=doc006',
      email: 'kanya.r@siriraj.ac.th',
      rating: 4.8,
      reviewCount: 198,
      experience: '10 years',
      languages: ['Thai', 'English'],
      availability: [
        { day: 'Tuesday', slots: ['09:00', '10:00', '11:00', '14:00', '15:00'] },
        { day: 'Thursday', slots: ['09:00', '10:00', '11:00', '14:00', '15:00'] },
        { day: 'Saturday', slots: ['09:00', '10:00'] }
      ]
    }
  ];
}

function generateSpecialties() {
  return [
    { id: 'sp-001', name: 'General Practice', nameThai: 'เวชปฏิบัติทั่วไป' },
    { id: 'sp-002', name: 'Internal Medicine', nameThai: 'อายุรกรรม' },
    { id: 'sp-003', name: 'Pediatrics', nameThai: 'กุมารเวชกรรม' },
    { id: 'sp-004', name: 'Cardiology', nameThai: 'โรคหัวใจและหลอดเลือด' },
    { id: 'sp-005', name: 'Orthopedics', nameThai: 'ศัลยกรรมกระดูกและข้อ' },
    { id: 'sp-006', name: 'Dermatology', nameThai: 'ผิวหนัง' },
    { id: 'sp-007', name: 'Psychiatry', nameThai: 'จิตเวชกรรม' },
    { id: 'sp-008', name: 'ENT', nameThai: 'โสต ศอ นาสิกวิทยา' },
    { id: 'sp-009', name: 'Ophthalmology', nameThai: 'จักษุวิทยา' },
    { id: 'sp-010', name: 'Obstetrics & Gynecology', nameThai: 'สูติ-นรีเวชกรรม' },
    { id: 'sp-011', name: 'Gastroenterology', nameThai: 'ระบบทางเดินอาหาร' },
    { id: 'sp-012', name: 'Endocrinology', nameThai: 'ต่อมไร้ท่อและเมตาบอลิสม' }
  ];
}

function generateMedications() {
  return [
    { id: 'DRUG-001', name: 'Amlodipine', genericName: 'Amlodipine besylate', category: 'Cardiovascular', forms: ['Tablet'], strengths: ['2.5mg', '5mg', '10mg'], indication: 'Hypertension, Angina', contraindications: ['Severe hypotension', 'Cardiogenic shock'], sideEffects: ['Peripheral edema', 'Dizziness', 'Flushing'], maxDose: '10mg daily' },
    { id: 'DRUG-002', name: 'Metformin', genericName: 'Metformin hydrochloride', category: 'Diabetes', forms: ['Tablet', 'Extended-release'], strengths: ['500mg', '850mg', '1000mg'], indication: 'Type 2 Diabetes Mellitus', contraindications: ['Renal impairment (eGFR <30)', 'Metabolic acidosis'], sideEffects: ['GI upset', 'Nausea', 'Vitamin B12 deficiency'], maxDose: '2550mg daily' },
    { id: 'DRUG-003', name: 'Atorvastatin', genericName: 'Atorvastatin calcium', category: 'Cardiovascular', forms: ['Tablet'], strengths: ['10mg', '20mg', '40mg', '80mg'], indication: 'Hypercholesterolemia, Cardiovascular prevention', contraindications: ['Active liver disease', 'Pregnancy'], sideEffects: ['Muscle pain', 'Liver enzyme elevation'], maxDose: '80mg daily' },
    { id: 'DRUG-004', name: 'Losartan', genericName: 'Losartan potassium', category: 'Cardiovascular', forms: ['Tablet'], strengths: ['25mg', '50mg', '100mg'], indication: 'Hypertension, Diabetic nephropathy', contraindications: ['Pregnancy', 'Bilateral renal artery stenosis'], sideEffects: ['Dizziness', 'Hyperkalemia'], maxDose: '100mg daily' },
    { id: 'DRUG-005', name: 'Omeprazole', genericName: 'Omeprazole', category: 'Gastrointestinal', forms: ['Capsule', 'Tablet'], strengths: ['10mg', '20mg', '40mg'], indication: 'GERD, Peptic ulcer', contraindications: ['PPI hypersensitivity'], sideEffects: ['Headache', 'Diarrhea', 'Vitamin B12 deficiency'], maxDose: '40mg daily' },
    { id: 'DRUG-006', name: 'Paracetamol', genericName: 'Acetaminophen', category: 'Pain Relief', forms: ['Tablet', 'Suspension'], strengths: ['325mg', '500mg', '650mg'], indication: 'Pain, Fever', contraindications: ['Severe hepatic impairment'], sideEffects: ['Hepatotoxicity (overdose)'], maxDose: '4g daily (3g in elderly)' },
    { id: 'DRUG-007', name: 'Amoxicillin', genericName: 'Amoxicillin trihydrate', category: 'Antibiotic', forms: ['Capsule', 'Suspension'], strengths: ['250mg', '500mg', '875mg'], indication: 'Bacterial infections', contraindications: ['Penicillin allergy'], sideEffects: ['Diarrhea', 'Rash', 'Allergic reactions'], maxDose: '3g daily' },
    { id: 'DRUG-008', name: 'Cetirizine', genericName: 'Cetirizine hydrochloride', category: 'Antihistamine', forms: ['Tablet', 'Syrup'], strengths: ['5mg', '10mg'], indication: 'Allergic rhinitis, Urticaria', contraindications: ['Severe renal impairment'], sideEffects: ['Drowsiness', 'Dry mouth'], maxDose: '10mg daily' }
  ];
}

function generateLabTests() {
  return [
    { id: 'LT-001', name: 'Complete Blood Count (CBC)', code: 'CBC', category: 'Hematology', specimenType: 'Blood', fastingRequired: false, turnaroundTime: '24 hours', price: 350 },
    { id: 'LT-002', name: 'Lipid Profile', code: 'LIPID', category: 'Chemistry', specimenType: 'Blood', fastingRequired: true, turnaroundTime: '24 hours', price: 600 },
    { id: 'LT-003', name: 'Fasting Blood Glucose', code: 'FBG', category: 'Chemistry', specimenType: 'Blood', fastingRequired: true, turnaroundTime: '24 hours', price: 100 },
    { id: 'LT-004', name: 'HbA1c', code: 'HBA1C', category: 'Chemistry', specimenType: 'Blood', fastingRequired: false, turnaroundTime: '24 hours', price: 450 },
    { id: 'LT-005', name: 'Creatinine', code: 'CREAT', category: 'Renal Function', specimenType: 'Blood', fastingRequired: false, turnaroundTime: '24 hours', price: 150 },
    { id: 'LT-006', name: 'eGFR', code: 'EGFR', category: 'Renal Function', specimenType: 'Blood', fastingRequired: false, turnaroundTime: '24 hours', price: 150 },
    { id: 'LT-007', name: 'ALT (SGPT)', code: 'ALT', category: 'Liver Function', specimenType: 'Blood', fastingRequired: false, turnaroundTime: '24 hours', price: 150 },
    { id: 'LT-008', name: 'TSH', code: 'TSH', category: 'Endocrinology', specimenType: 'Blood', fastingRequired: false, turnaroundTime: '48 hours', price: 400 },
    { id: 'LT-009', name: 'Urinalysis', code: 'UA', category: 'Urinalysis', specimenType: 'Urine', fastingRequired: false, turnaroundTime: '24 hours', price: 150 },
    { id: 'LT-010', name: 'Electrolytes Panel', code: 'LYTES', category: 'Chemistry', specimenType: 'Blood', fastingRequired: false, turnaroundTime: '24 hours', price: 300 }
  ];
}

function generateICD10Codes() {
  return [
    { code: 'I10', description: 'Essential (primary) hypertension', descriptionThai: 'โรคความดันโลหิตสูงปฐมภูมิ', category: 'Cardiovascular' },
    { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', descriptionThai: 'เบาหวานชนิดที่ 2 โดยไม่มีภาวะแทรกซ้อน', category: 'Endocrine' },
    { code: 'E78.0', description: 'Pure hypercholesterolemia', descriptionThai: 'ภาวะคอเลสเตอรอลสูง', category: 'Endocrine' },
    { code: 'J06.9', description: 'Acute upper respiratory infection', descriptionThai: 'การติดเชื้อทางเดินหายใจส่วนบนเฉียบพลัน', category: 'Respiratory' },
    { code: 'M54.5', description: 'Low back pain', descriptionThai: 'อาการปวดหลังส่วนล่าง', category: 'Musculoskeletal' },
    { code: 'K21.0', description: 'GERD with esophagitis', descriptionThai: 'โรคกรดไหลย้อน', category: 'Digestive' },
    { code: 'F32.9', description: 'Major depressive disorder', descriptionThai: 'โรคซึมเศร้า', category: 'Mental Health' },
    { code: 'N39.0', description: 'Urinary tract infection', descriptionThai: 'การติดเชื้อทางเดินปัสสาวะ', category: 'Genitourinary' },
    { code: 'R51', description: 'Headache', descriptionThai: 'อาการปวดศีรษะ', category: 'General' },
    { code: 'Z00.00', description: 'General medical examination', descriptionThai: 'ตรวจสุขภาพทั่วไป', category: 'General' }
  ];
}

function generateHospitalsAndFacilities() {
  return [
    { id: 'hosp-001', name: 'X Hospital Bangkok', nameThai: 'โรงพยาบาล X กรุงเทพ', type: 'hospital', address: '123 Sukhumvit Rd, Bangkok 10110', coords: { lat: 13.7563, lng: 100.5018 }, phone: '02-123-4567', rating: 4.7, services: ['Emergency 24h', 'Cardiology', 'General Medicine'] },
    { id: 'hosp-002', name: 'Bangkok Hospital', nameThai: 'โรงพยาบาลกรุงเทพ', type: 'hospital', address: '2 Soi Soonvijai 7, New Petchburi Rd', coords: { lat: 13.7465, lng: 100.5650 }, phone: '02-310-3000', rating: 4.5, services: ['Emergency 24h', 'Heart Center', 'Cancer Center'] },
    { id: 'hosp-003', name: 'Samitivej Hospital', nameThai: 'โรงพยาบาลสมิติเวช', type: 'hospital', address: '133 Sukhumvit 49, Bangkok', coords: { lat: 13.7246, lng: 100.5698 }, phone: '02-022-2222', rating: 4.6, services: ['Emergency 24h', 'Pediatrics', 'OB-GYN'] },
    { id: 'pharm-001', name: 'Boots Pharmacy', nameThai: 'ร้านขายยา Boots', type: 'pharmacy', address: 'Terminal 21, Sukhumvit Rd', coords: { lat: 13.7387, lng: 100.5598 }, phone: '02-108-0888', rating: 4.3, services: ['Prescription', 'OTC', 'Consultation'] },
    { id: 'clinic-001', name: 'Sukjai Clinic', nameThai: 'คลินิกสุขใจ', type: 'clinic', address: '456 Rama 4 Rd, Bangkok', coords: { lat: 13.7307, lng: 100.5418 }, phone: '02-234-5678', rating: 4.4, services: ['General Practice', 'Health Checkup'] }
  ];
}

function generateHealthTips() {
  return [
    { id: 'tip-001', title: '5 Ways to Maintain Heart Health', titleThai: '5 วิธีดูแลสุขภาพหัวใจ', category: 'cardiovascular', content: 'Regular exercise, healthy diet, quit smoking, limit alcohol, annual checkups', tags: ['heart', 'prevention'], imageUrl: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400' },
    { id: 'tip-002', title: 'Managing Stress Effectively', titleThai: 'การรับมือกับความเครียด', category: 'mental_health', content: 'Practice meditation, exercise regularly, get enough sleep, talk to loved ones', tags: ['stress', 'wellness'], imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400' },
    { id: 'tip-003', title: 'Healthy Eating Guidelines', titleThai: 'การรับประทานอาหารเพื่อสุขภาพ', category: 'nutrition', content: 'Eat colorful fruits and vegetables, choose whole grains, reduce sugar and fat', tags: ['nutrition', 'diet'], imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400' },
    { id: 'tip-004', title: 'Quality Sleep Tips', titleThai: 'การนอนหลับที่มีคุณภาพ', category: 'sleep', content: 'Sleep 7-9 hours, maintain consistent schedule, avoid screens before bed', tags: ['sleep', 'rest'], imageUrl: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=400' }
  ];
}

function generateHealthEducationArticles() {
  return [
    {
      id: 'article-001',
      title: 'Understanding Hypertension',
      titleThai: 'ทำความเข้าใจโรคความดันโลหิตสูง',
      category: 'cardiovascular',
      content: 'Hypertension, or high blood pressure, is a common condition where the force of blood against artery walls is consistently too high...',
      contentThai: 'โรคความดันโลหิตสูงคือภาวะที่แรงดันเลือดที่กระทำต่อผนังหลอดเลือดแดงสูงกว่าปกติอย่างต่อเนื่อง...',
      author: 'Izara Medical Team',
      publishDate: getDateString(-30),
      tags: ['hypertension', 'heart', 'prevention'],
      imageUrl: 'https://images.unsplash.com/photo-1628348070889-cb656235b4eb?w=400',
      readTime: 7
    },
    {
      id: 'article-002',
      title: 'Type 2 Diabetes Prevention',
      titleThai: 'การป้องกันโรคเบาหวานชนิดที่ 2',
      category: 'diabetes',
      content: 'Type 2 diabetes is a chronic condition that affects how your body processes blood sugar...',
      contentThai: 'โรคเบาหวานชนิดที่ 2 เป็นโรคเรื้อรังที่ร่างกายไม่สามารถควบคุมระดับน้ำตาลในเลือดได้อย่างเหมาะสม...',
      author: 'Izara Medical Team',
      publishDate: getDateString(-60),
      tags: ['diabetes', 'prevention', 'lifestyle'],
      imageUrl: 'https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?w=400',
      readTime: 5
    }
  ];
}

function generateMedicalContent() {
  return [
    {
      id: 'mc-001',
      title: 'COVID-19 Prevention and Care Guidelines',
      titleThai: 'แนวทางป้องกันและดูแลตัวเองจาก COVID-19',
      category: 'infectious_disease',
      type: 'article',
      content: 'COVID-19 prevention includes proper hand hygiene, wearing masks in crowded places, maintaining social distance, and staying up to date with vaccinations. If infected, monitor symptoms, stay hydrated, rest well, and seek medical attention if symptoms worsen.',
      contentThai: 'การป้องกัน COVID-19 รวมถึงการล้างมือบ่อยๆ สวมหน้ากากในที่แออัด รักษาระยะห่าง และฉีดวัคซีนให้ครบ หากติดเชื้อให้เฝ้าระวังอาการ ดื่มน้ำมากๆ พักผ่อนให้เพียงพอ และพบแพทย์หากอาการรุนแรงขึ้น',
      author: 'Dr. Apirak Chaiyasit',
      authorId: DEMO_IDS.doctor.id,
      publishDate: getDateString(-7),
      status: 'published',
      tags: ['covid', 'prevention', 'guidelines'],
      imageUrl: 'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=800',
      views: 1250,
      likes: 89
    },
    {
      id: 'mc-002',
      title: 'Managing High Blood Pressure at Home',
      titleThai: 'การจัดการความดันโลหิตสูงที่บ้าน',
      category: 'cardiovascular',
      type: 'article',
      content: 'High blood pressure (hypertension) can be managed through lifestyle changes: regular exercise (30 min/day), reducing sodium intake (<2000mg/day), eating fruits and vegetables (DASH diet), limiting alcohol, maintaining healthy weight, and taking medications as prescribed.',
      contentThai: 'ความดันโลหิตสูงสามารถจัดการได้ด้วยการปรับเปลี่ยนวิถีชีวิต: ออกกำลังกายสม่ำเสมอ (30 นาที/วัน) ลดเกลือ (<2000 มก./วัน) กินผักผลไม้ (DASH diet) จำกัดแอลกอฮอล์ รักษาน้ำหนักให้เหมาะสม และทานยาตามแพทย์สั่ง',
      author: 'Dr. Somchai Prasert',
      authorId: 'DOC-002',
      publishDate: getDateString(-14),
      status: 'published',
      tags: ['hypertension', 'home-care', 'lifestyle'],
      imageUrl: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800',
      views: 2340,
      likes: 156
    },
    {
      id: 'mc-003',
      title: 'Diabetes Diet Guide: What to Eat and Avoid',
      titleThai: 'คู่มืออาหารสำหรับผู้เป็นเบาหวาน',
      category: 'diabetes',
      type: 'article',
      content: 'For diabetes management, focus on: complex carbohydrates (whole grains, legumes), lean proteins, healthy fats (olive oil, nuts), and plenty of vegetables. Avoid: sugary drinks, refined carbs, processed foods, and excessive fruit juice. Monitor carb portions and pair with protein.',
      contentThai: 'สำหรับการจัดการเบาหวาน: เน้นคาร์บเชิงซ้อน (ธัญพืช ถั่ว) โปรตีนไขมันต่ำ ไขมันดี (น้ำมันมะกอก ถั่ว) และผักมากๆ หลีกเลี่ยง: เครื่องดื่มหวาน คาร์บขัดสี อาหารแปรรูป และน้ำผลไม้มากเกินไป ควบคุมปริมาณคาร์บและกินคู่กับโปรตีน',
      author: 'Izara Nutrition Team',
      authorId: null,
      publishDate: getDateString(-21),
      status: 'published',
      tags: ['diabetes', 'nutrition', 'diet'],
      imageUrl: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800',
      views: 3150,
      likes: 234
    },
    {
      id: 'mc-004',
      title: 'Understanding Your Lab Results',
      titleThai: 'ทำความเข้าใจผลตรวจแลปของคุณ',
      category: 'general_health',
      type: 'article',
      content: 'Common lab tests explained: CBC (blood cell counts), FBS (fasting blood sugar, normal <100 mg/dL), HbA1c (diabetes control, normal <5.7%), Lipid Panel (cholesterol, LDL <100, HDL >40), Creatinine (kidney function), and Liver enzymes (ALT, AST). Always discuss results with your doctor.',
      contentThai: 'การตรวจแลปทั่วไป: CBC (นับเม็ดเลือด), FBS (น้ำตาลอดอาหาร ปกติ <100), HbA1c (ควบคุมเบาหวาน ปกติ <5.7%), Lipid Panel (ไขมัน LDL <100 HDL >40), Creatinine (ไต), Liver enzymes (ตับ) ควรปรึกษาแพทย์เพื่อแปลผล',
      author: 'Dr. Malee Srisombat',
      authorId: 'DOC-003',
      publishDate: getDateString(-28),
      status: 'published',
      tags: ['lab-results', 'health-checkup', 'education'],
      imageUrl: 'https://images.unsplash.com/photo-1579165466741-7f35e4755660?w=800',
      views: 4200,
      likes: 312
    },
    {
      id: 'mc-005',
      title: 'Mental Health: Recognizing Signs of Depression',
      titleThai: 'สุขภาพจิต: สัญญาณของภาวะซึมเศร้า',
      category: 'mental_health',
      type: 'article',
      content: 'Warning signs of depression include: persistent sadness, loss of interest in activities, changes in sleep/appetite, fatigue, difficulty concentrating, feelings of worthlessness, and thoughts of self-harm. If you experience these for more than 2 weeks, seek professional help.',
      contentThai: 'สัญญาณเตือนของภาวะซึมเศร้า: เศร้าต่อเนื่อง หมดความสนใจในกิจกรรม เปลี่ยนแปลงการนอน/กิน อ่อนเพลีย สมาธิลดลง รู้สึกไร้ค่า และคิดทำร้ายตัวเอง หากมีอาการนานกว่า 2 สัปดาห์ ควรพบแพทย์',
      author: 'Dr. Nattaporn Wongsiri',
      authorId: 'DOC-004',
      publishDate: getDateString(-35),
      status: 'published',
      tags: ['mental-health', 'depression', 'awareness'],
      imageUrl: 'https://images.unsplash.com/photo-1493836512294-502baa1986e2?w=800',
      views: 1890,
      likes: 145
    },
    {
      id: 'mc-006',
      title: 'Exercise Guidelines for Seniors',
      titleThai: 'แนวทางการออกกำลังกายสำหรับผู้สูงอายุ',
      category: 'elderly_care',
      type: 'article',
      content: 'Seniors should aim for: 150 min moderate aerobic activity/week (walking, swimming), strength training 2x/week, balance exercises daily. Start slow, stay hydrated, warm up properly. Avoid high-impact activities. Always consult doctor before starting new exercise programs.',
      contentThai: 'ผู้สูงอายุควร: ออกกำลังกายแอโรบิกปานกลาง 150 นาที/สัปดาห์ (เดิน ว่ายน้ำ) ฝึกกล้ามเนื้อ 2 ครั้ง/สัปดาห์ ฝึกทรงตัวทุกวัน เริ่มช้าๆ ดื่มน้ำมากๆ อบอุ่นร่างกายก่อน หลีกเลี่ยงกิจกรรมหนัก ปรึกษาแพทย์ก่อนเริ่มโปรแกรมใหม่',
      author: 'Izara Rehabilitation Team',
      authorId: null,
      publishDate: getDateString(-42),
      status: 'published',
      tags: ['elderly', 'exercise', 'wellness'],
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
      views: 1560,
      likes: 98
    }
  ];
}

function generateClinicalResources() {
  return [
    {
      id: 'cr-001',
      title: 'Thai Hypertension Treatment Guidelines 2023',
      titleThai: 'แนวทางการรักษาความดันโลหิตสูงสำหรับประเทศไทย 2566',
      category: 'cardiology',
      type: 'guideline',
      description: 'Official Thai Medical Council guidelines for hypertension diagnosis and treatment',
      fileUrl: 'https://storage.googleapis.com/izara-meta-data/clinical-resources/htn-guidelines-2023.pdf',
      author: 'Thai Medical Council',
      publishDate: getDateString(-90),
      status: 'approved',
      tags: ['hypertension', 'guidelines', 'cardiology'],
      downloads: 456
    },
    {
      id: 'cr-002',
      title: 'Diabetes Management Protocol',
      titleThai: 'โปรโตคอลการดูแลผู้ป่วยเบาหวาน',
      category: 'endocrinology',
      type: 'protocol',
      description: 'Step-by-step protocol for managing Type 2 Diabetes including medication titration',
      fileUrl: 'https://storage.googleapis.com/izara-meta-data/clinical-resources/dm-protocol.pdf',
      author: 'Endocrine Society of Thailand',
      publishDate: getDateString(-120),
      status: 'approved',
      tags: ['diabetes', 'protocol', 'endocrinology'],
      downloads: 789
    },
    {
      id: 'cr-003',
      title: 'Antibiotic Prescribing Guidelines',
      titleThai: 'แนวทางการสั่งยาปฏิชีวนะ',
      category: 'infectious_disease',
      type: 'guideline',
      description: 'Evidence-based antibiotic selection for common infections',
      fileUrl: 'https://storage.googleapis.com/izara-meta-data/clinical-resources/antibiotic-guide.pdf',
      author: 'Thai FDA & Infectious Disease Association',
      publishDate: getDateString(-60),
      status: 'approved',
      tags: ['antibiotics', 'infection', 'guidelines'],
      downloads: 1234
    },
    {
      id: 'cr-004',
      title: 'Pediatric Dosing Calculator Reference',
      titleThai: 'ตารางคำนวณขนาดยาเด็ก',
      category: 'pediatrics',
      type: 'reference',
      description: 'Weight-based dosing charts for common pediatric medications',
      fileUrl: 'https://storage.googleapis.com/izara-meta-data/clinical-resources/peds-dosing.pdf',
      author: 'Pediatric Society of Thailand',
      publishDate: getDateString(-150),
      status: 'approved',
      tags: ['pediatrics', 'dosing', 'reference'],
      downloads: 567
    },
    {
      id: 'cr-005',
      title: 'ECG Interpretation Quick Guide',
      titleThai: 'คู่มืออ่านคลื่นไฟฟ้าหัวใจฉบับย่อ',
      category: 'cardiology',
      type: 'reference',
      description: 'Quick reference for common ECG findings and abnormalities',
      fileUrl: 'https://storage.googleapis.com/izara-meta-data/clinical-resources/ecg-guide.pdf',
      author: 'Cardiology Association of Thailand',
      publishDate: getDateString(-180),
      status: 'approved',
      tags: ['ecg', 'cardiology', 'reference'],
      downloads: 890
    }
  ];
}

// ============================================================================
// MAIN GENERATION FUNCTION
// ============================================================================

function generateAllData() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🏥 IZARA TELEMEDICINE - UNIFIED DEMO DATA GENERATOR v3.0');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Get ALL users from the mock table
  const allUsers = generateAllUsers();
  const patients = allUsers.filter(u => u.role === 'patient');
  const doctors = allUsers.filter(u => u.role === 'doctor');
  const admins = allUsers.filter(u => u.role === 'admin');

  console.log('📋 Mock User Table (ALL 8 USERS):');
  console.log('┌────────────────────┬────────────────────────────────┬─────────┬──────────┐');
  console.log('│ ID                 │ Email                          │ Role    │ Status   │');
  console.log('├────────────────────┼────────────────────────────────┼─────────┼──────────┤');
  allUsers.forEach(u => {
    const id = u.id.padEnd(18);
    const email = u.email.padEnd(30);
    const role = u.role.padEnd(7);
    const status = (u.status || 'active').padEnd(8);
    console.log(`│ ${id} │ ${email} │ ${role} │ ${status} │`);
  });
  console.log('└────────────────────┴────────────────────────────────┴─────────┴──────────┘\n');

  ensureDirectoryExists(OUTPUT_DIR);

  // ========== AUTH BUCKET ==========
  console.log(`\n📁 [${BUCKETS.AUTH}] Generating user credentials for ${allUsers.length} users...`);
  
  // Write ALL users to users/ folder (auth server reads from here)
  allUsers.forEach(user => {
    writeJSON(BUCKETS.AUTH, `users/${user.id}.json`, user);
    console.log(`   ✓ users/${user.id}.json (${user.email})`);
  });
  
  // Also write doctors to doctors/ folder for doctor portal
  doctors.forEach(doctor => {
    writeJSON(BUCKETS.AUTH, `doctors/${doctor.id}.json`, doctor);
    console.log(`   ✓ doctors/${doctor.id}.json`);
  });
  
  // Write admin to admins/ folder
  admins.forEach(admin => {
    writeJSON(BUCKETS.AUTH, `admins/${admin.id}.json`, admin);
    console.log(`   ✓ admins/${admin.id}.json`);
  });

  // ========== DOCTOR BUCKET ==========
  console.log(`\n📁 [${BUCKETS.DOCTOR}] Generating doctor data...`);
  const doctorProfiles = generateDoctorProfiles();
  doctorProfiles.forEach(profile => {
    writeJSON(BUCKETS.DOCTOR, `profile/${profile.id}.json`, profile);
    console.log(`   ✓ profile/${profile.id}.json`);
  });
  // Also write a combined doctors list
  writeJSON(BUCKETS.DOCTOR, 'doctors.json', doctorProfiles);
  writeJSON(BUCKETS.DOCTOR, 'patients/patients.json', generatePatientRecords());
  writeJSON(BUCKETS.DOCTOR, 'emrs/emrs.json', generateEMRs());
  writeJSON(BUCKETS.DOCTOR, 'prescriptions/prescriptions.json', generatePrescriptions());
  writeJSON(BUCKETS.DOCTOR, 'lab-orders/lab-orders.json', generateLabOrders());
  writeJSON(BUCKETS.DOCTOR, 'imaging-orders/imaging-orders.json', generateImagingOrders());
  writeJSON(BUCKETS.DOCTOR, 'queue/queue.json', generateQueue());

  // ========== PATIENT BUCKET ==========
  console.log(`\n📁 [${BUCKETS.PATIENT}] Generating patient data...`);
  patients.forEach(patient => {
    writeJSON(BUCKETS.PATIENT, `users/${patient.id}/phr.json`, generatePHR());
    writeJSON(BUCKETS.PATIENT, `users/${patient.id}/living-will.json`, generateLivingWill());
    writeJSON(BUCKETS.PATIENT, `users/${patient.id}/pdpa-consents.json`, generatePDPAConsents());
    writeJSON(BUCKETS.PATIENT, `users/${patient.id}/chat-sessions.json`, generatePatientAIChatSessions());
    writeJSON(BUCKETS.PATIENT, `users/${patient.id}/timeline.json`, generateMedicalTimeline());
    console.log(`   ✓ users/${patient.id}/ (PHR, Living Will, PDPA, Chat, Timeline)`);
  });
  // Also write patients.json index
  writeJSON(BUCKETS.PATIENT, 'patients.json', generatePatientsIndex());

  // ========== APPOINTMENTS BUCKET ==========
  console.log(`\n📁 [${BUCKETS.APPOINTMENTS}] Generating appointment data...`);
  writeJSON(BUCKETS.APPOINTMENTS, 'appointments/appointments.json', generateAppointments());
  writeJSON(BUCKETS.APPOINTMENTS, 'results/results.json', generateAppointmentResults());

  // ========== METADATA BUCKET ==========
  console.log(`\n📁 [${BUCKETS.METADATA}] Generating metadata...`);
  writeJSON(BUCKETS.METADATA, 'doctors.json', generateDoctorsList());
  writeJSON(BUCKETS.METADATA, 'specialties.json', generateSpecialties());
  writeJSON(BUCKETS.METADATA, 'medications.json', generateMedications());
  writeJSON(BUCKETS.METADATA, 'lab-tests.json', generateLabTests());
  writeJSON(BUCKETS.METADATA, 'icd10-codes.json', generateICD10Codes());
  writeJSON(BUCKETS.METADATA, 'hospitals-facilities.json', generateHospitalsAndFacilities());
  writeJSON(BUCKETS.METADATA, 'health-tips.json', generateHealthTips());
  writeJSON(BUCKETS.METADATA, 'health-education-articles.json', generateHealthEducationArticles());
  writeJSON(BUCKETS.METADATA, 'medical-content.json', generateMedicalContent());
  writeJSON(BUCKETS.METADATA, 'clinical-resources.json', generateClinicalResources());

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ DEMO DATA GENERATION COMPLETE!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📂 Output directory:', OUTPUT_DIR);
  console.log('\n📦 GCS Bucket Structure:');
  console.log(`   • ${BUCKETS.AUTH}/     - User credentials (${allUsers.length} users: 1 admin, ${doctors.length} doctors, ${patients.length} patient)`);
  console.log(`   • ${BUCKETS.DOCTOR}/   - Doctor-specific data`);
  console.log(`   • ${BUCKETS.PATIENT}/  - Patient-specific data`);
  console.log(`   • ${BUCKETS.APPOINTMENTS}/ - Shared appointments`);
  console.log(`   • ${BUCKETS.METADATA}/     - Reference data`);

  console.log('\n🔑 Login Credentials:');
  console.log('┌─────────┬────────────────────────────────┬────────────────────┐');
  console.log('│ Role    │ Email                          │ Password           │');
  console.log('├─────────┼────────────────────────────────┼────────────────────┤');
  console.log('│ Admin   │ admin.test@izara.com           │ IzaraAdmin@2024    │');
  console.log('│ Doctor  │ doctor.test@izara.com          │ IzaraDoctor@2024   │');
  console.log('│ Doctor  │ cardio.doctor@izara.com        │ IzaraDoctor@2024   │');
  console.log('│ Patient │ demo.test@gmail.com            │ P@ssw0rd           │');
  console.log('└─────────┴────────────────────────────────┴────────────────────┘');

  console.log('\n🚀 Next steps:');
  console.log('   1. Review generated data in ./scripts/output/');
  console.log('   2. Run: node scripts/uploadToGCS.cjs (to upload to GCS)');
  console.log('   3. Update portal .env files with correct bucket names\n');
}

// Run the generator
generateAllData();
