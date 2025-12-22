/**
 * ================================================================================
 * IZARA TELEMEDICINE PLATFORM - MINIMAL DATA SEEDER
 * ================================================================================
 *
 * Creates minimal test data: 1 Admin, 1 Doctor, 1 Patient with full personal data
 * Designed for clean testing with proper data sync between portals.
 *
 * GCS Bucket Structure:
 * - izara-users-credentials : User authentication for both portals
 * - izara-doctors-data     : Doctor-specific data
 * - izara-patients-data    : Patient-specific data, PHR
 * - izara-appointments     : Shared appointment data
 * - izara-meta-data        : Reference data (medications, specialties, etc.)
 *
 * Usage: node scripts/seedMinimalData.cjs
 *
 * @version 1.0.0
 * @date December 2025
 */

const fs = require('fs');
const path = require('path');

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

// ============================================================================
// MINIMAL USER DATA - Only 3 Users: 1 Admin, 1 Doctor, 1 Patient
// ============================================================================

const USERS = {
  admin: {
    id: 'ADMIN-001',
    email: 'admin.test@izara.com',
    password: 'IzaraAdmin@2024',
    name: 'Dr. Admin Manager',
    nameThai: 'นพ. ผู้ดูแลระบบ ใจดี',
    role: 'admin',
    phone: '+66-89-123-4567',
    dateOfBirth: '1980-05-15',
    gender: 'male',
    specialty: 'Healthcare Administration',
    specialtyThai: 'บริหารจัดการทางการแพทย์',
    medicalLicenseNumber: 'ADMIN-LICENSE-001',
    hospital: 'Izara Central Hospital',
    hospitalThai: 'โรงพยาบาลอิซาร่าเซ็นทรัล',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin-001'
  },
  doctor: {
    id: 'DOC-001',
    email: 'doctor.test@izara.com',
    password: 'IzaraDoctor@2024',
    name: 'Dr. Sarah Johnson',
    nameThai: 'นพ. ซาร่า จอห์นสัน',
    role: 'doctor',
    phone: '+66-81-234-5678',
    dateOfBirth: '1985-08-20',
    gender: 'female',
    specialty: 'General Practice',
    specialtyThai: 'เวชปฏิบัติทั่วไป',
    medicalLicenseNumber: 'MD-2024-001',
    hospital: 'Izara Central Hospital',
    hospitalThai: 'โรงพยาบาลอิซาร่าเซ็นทรัล',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=doc-001',
    education: [
      { degree: 'MD', institution: 'Chulalongkorn University', year: 2010 },
      { degree: 'Residency - General Practice', institution: 'Siriraj Hospital', year: 2014 }
    ],
    languages: ['Thai', 'English'],
    consultationFee: 500,
    availableSlots: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00']
  },
  patient: {
    id: 'PATIENT-001',
    email: 'demo.test@gmail.com',
    password: 'P@ssw0rd',
    name: 'John Demo Patient',
    nameThai: 'นาย จอห์น ทดสอบ ระบบ',
    role: 'patient',
    phone: '+66-82-345-6789',
    dateOfBirth: '1990-03-10',
    gender: 'male',
    bloodType: 'O+',
    weight: 75,
    height: 175,
    allergies: ['Penicillin', 'Shellfish'],
    chronicConditions: ['Mild Hypertension'],
    emergencyContact: {
      name: 'Jane Demo',
      relationship: 'Spouse',
      phone: '+66-83-456-7890'
    },
    address: {
      street: '123 Test Street',
      district: 'Pathum Wan',
      province: 'Bangkok',
      postalCode: '10330',
      country: 'Thailand'
    },
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=patient-001',
    nationalId: '1234567890123',
    insuranceInfo: {
      provider: 'Thai Health Insurance',
      policyNumber: 'THI-2024-001',
      validUntil: '2025-12-31'
    }
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

function getDateOnly(daysFromNow = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ============================================================================
// GENERATE USER CREDENTIALS (izara-users-credentials)
// ============================================================================

function generateUserCredentials() {
  console.log('\n📁 Generating User Credentials...');
  
  const now = getDateString(0);
  
  // Admin credentials for Doctor Portal
  const adminCredentials = {
    id: USERS.admin.id,
    email: USERS.admin.email,
    passwordHash: Buffer.from(USERS.admin.password).toString('base64'),
    role: 'admin',
    name: USERS.admin.name,
    nameThai: USERS.admin.nameThai,
    phone: USERS.admin.phone,
    dateOfBirth: USERS.admin.dateOfBirth,
    gender: USERS.admin.gender,
    avatarUrl: USERS.admin.avatarUrl,
    isAdmin: true,
    isActive: true,
    isVerified: true,
    status: 'approved',
    createdAt: getDateString(-365),
    updatedAt: now,
    lastLogin: now,
    preferences: { language: 'th', notifications: true, theme: 'light' }
  };
  
  // Doctor credentials for Doctor Portal
  const doctorCredentials = {
    id: USERS.doctor.id,
    email: USERS.doctor.email,
    passwordHash: Buffer.from(USERS.doctor.password).toString('base64'),
    role: 'doctor',
    name: USERS.doctor.name,
    nameThai: USERS.doctor.nameThai,
    phone: USERS.doctor.phone,
    dateOfBirth: USERS.doctor.dateOfBirth,
    gender: USERS.doctor.gender,
    avatarUrl: USERS.doctor.avatarUrl,
    specialty: USERS.doctor.specialty,
    specialtyThai: USERS.doctor.specialtyThai,
    hospital: USERS.doctor.hospital,
    medicalLicenseNumber: USERS.doctor.medicalLicenseNumber,
    isActive: true,
    isVerified: true,
    status: 'approved',
    createdAt: getDateString(-180),
    updatedAt: now,
    lastLogin: now,
    preferences: { language: 'th', notifications: true, theme: 'light' }
  };
  
  // Patient credentials for Patient Portal
  const patientCredentials = {
    id: USERS.patient.id,
    patientId: USERS.patient.id,
    email: USERS.patient.email,
    passwordHash: Buffer.from(USERS.patient.password).toString('base64'),
    role: 'patient',
    name: USERS.patient.name,
    nameThai: USERS.patient.nameThai,
    phone: USERS.patient.phone,
    dateOfBirth: USERS.patient.dateOfBirth,
    gender: USERS.patient.gender,
    avatarUrl: USERS.patient.avatarUrl,
    isActive: true,
    isVerified: true,
    status: 'active',
    createdAt: getDateString(-90),
    updatedAt: now,
    lastLogin: now,
    profile: {
      id: USERS.patient.id,
      patientId: USERS.patient.id,
      name: USERS.patient.name,
      email: USERS.patient.email,
      phone: USERS.patient.phone,
      avatarUrl: USERS.patient.avatarUrl,
      dateOfBirth: USERS.patient.dateOfBirth,
      gender: USERS.patient.gender
    },
    preferences: { language: 'th', notifications: true, theme: 'light' }
  };
  
  // Write admin credentials
  writeJSON(BUCKETS.AUTH, `admins/${USERS.admin.id}.json`, adminCredentials);
  
  // Write doctor credentials
  writeJSON(BUCKETS.AUTH, `doctors/${USERS.doctor.id}.json`, doctorCredentials);
  
  // Write patient credentials
  writeJSON(BUCKETS.AUTH, `users/${USERS.patient.id}.json`, patientCredentials);
  
  // Create combined index files
  writeJSON(BUCKETS.AUTH, 'admins/index.json', [adminCredentials]);
  writeJSON(BUCKETS.AUTH, 'doctors/index.json', [doctorCredentials]);
  writeJSON(BUCKETS.AUTH, 'users/index.json', [patientCredentials]);
}

// ============================================================================
// GENERATE DOCTOR DATA (izara-doctors-data)
// ============================================================================

function generateDoctorData() {
  console.log('\n📁 Generating Doctor Data...');
  
  const now = getDateString(0);
  
  // Full doctor profile
  const doctorProfile = {
    id: USERS.doctor.id,
    email: USERS.doctor.email,
    name: USERS.doctor.name,
    nameThai: USERS.doctor.nameThai,
    phone: USERS.doctor.phone,
    dateOfBirth: USERS.doctor.dateOfBirth,
    gender: USERS.doctor.gender,
    avatarUrl: USERS.doctor.avatarUrl,
    specialty: USERS.doctor.specialty,
    specialtyThai: USERS.doctor.specialtyThai,
    hospital: USERS.doctor.hospital,
    hospitalThai: USERS.doctor.hospitalThai,
    medicalLicenseNumber: USERS.doctor.medicalLicenseNumber,
    education: USERS.doctor.education,
    languages: USERS.doctor.languages,
    consultationFee: USERS.doctor.consultationFee,
    availableSlots: USERS.doctor.availableSlots,
    isActive: true,
    isAvailable: true,
    isVerified: true,
    status: 'approved',
    rating: 4.8,
    totalConsultations: 150,
    totalPatients: 85,
    createdAt: getDateString(-180),
    updatedAt: now
  };
  
  // Admin profile (for Doctor Portal)
  const adminProfile = {
    id: USERS.admin.id,
    email: USERS.admin.email,
    name: USERS.admin.name,
    nameThai: USERS.admin.nameThai,
    phone: USERS.admin.phone,
    dateOfBirth: USERS.admin.dateOfBirth,
    gender: USERS.admin.gender,
    avatarUrl: USERS.admin.avatarUrl,
    specialty: USERS.admin.specialty,
    specialtyThai: USERS.admin.specialtyThai,
    hospital: USERS.admin.hospital,
    hospitalThai: USERS.admin.hospitalThai,
    medicalLicenseNumber: USERS.admin.medicalLicenseNumber,
    isAdmin: true,
    isActive: true,
    isVerified: true,
    status: 'approved',
    role: 'admin',
    createdAt: getDateString(-365),
    updatedAt: now
  };
  
  // Write individual profiles
  writeJSON(BUCKETS.DOCTOR, `profile/${USERS.doctor.id}.json`, doctorProfile);
  writeJSON(BUCKETS.DOCTOR, `profile/${USERS.admin.id}.json`, adminProfile);
  
  // Write doctors index (for Doctor Portal's doctor list)
  writeJSON(BUCKETS.DOCTOR, 'doctors.json', [doctorProfile, adminProfile]);
  
  // Patient data for doctor to view (same patient in doctors-data bucket)
  const patientForDoctor = {
    id: USERS.patient.id,
    patientId: USERS.patient.id,
    name: USERS.patient.name,
    nameThai: USERS.patient.nameThai,
    email: USERS.patient.email,
    phone: USERS.patient.phone,
    dateOfBirth: USERS.patient.dateOfBirth,
    gender: USERS.patient.gender,
    bloodType: USERS.patient.bloodType,
    weight: USERS.patient.weight,
    height: USERS.patient.height,
    allergies: USERS.patient.allergies,
    chronicConditions: USERS.patient.chronicConditions,
    emergencyContact: USERS.patient.emergencyContact,
    avatarUrl: USERS.patient.avatarUrl,
    address: USERS.patient.address,
    lastVisit: getDateString(-7),
    assignedDoctorId: USERS.doctor.id,
    status: 'active',
    createdAt: getDateString(-90),
    updatedAt: now
  };
  
  writeJSON(BUCKETS.DOCTOR, `patients/${USERS.patient.id}.json`, patientForDoctor);
  writeJSON(BUCKETS.DOCTOR, 'patients/patients.json', [patientForDoctor]);
  
  // Empty queue
  writeJSON(BUCKETS.DOCTOR, 'queue/queue.json', []);
  
  // Empty EMR index
  writeJSON(BUCKETS.DOCTOR, 'emrs/emrs.json', []);
  
  // Empty prescriptions
  writeJSON(BUCKETS.DOCTOR, 'prescriptions/prescriptions.json', []);
  
  // Empty lab orders
  writeJSON(BUCKETS.DOCTOR, 'lab-orders/lab-orders.json', []);
  
  // Empty imaging orders
  writeJSON(BUCKETS.DOCTOR, 'imaging-orders/imaging-orders.json', []);
}

// ============================================================================
// GENERATE PATIENT DATA (izara-patients-data)
// ============================================================================

function generatePatientData() {
  console.log('\n📁 Generating Patient Data...');
  
  const now = getDateString(0);
  
  // Full patient profile
  const patientProfile = {
    id: USERS.patient.id,
    patientId: USERS.patient.id,
    email: USERS.patient.email,
    name: USERS.patient.name,
    nameThai: USERS.patient.nameThai,
    phone: USERS.patient.phone,
    dateOfBirth: USERS.patient.dateOfBirth,
    gender: USERS.patient.gender,
    bloodType: USERS.patient.bloodType,
    weight: USERS.patient.weight,
    height: USERS.patient.height,
    allergies: USERS.patient.allergies,
    chronicConditions: USERS.patient.chronicConditions,
    emergencyContact: USERS.patient.emergencyContact,
    address: USERS.patient.address,
    avatarUrl: USERS.patient.avatarUrl,
    nationalId: USERS.patient.nationalId,
    insuranceInfo: USERS.patient.insuranceInfo,
    isActive: true,
    createdAt: getDateString(-90),
    updatedAt: now
  };
  
  // Write patient profile
  writeJSON(BUCKETS.PATIENT, `users/${USERS.patient.id}.json`, patientProfile);
  writeJSON(BUCKETS.PATIENT, 'patients.json', [patientProfile]);
  
  // Patient Health Record (PHR)
  const phr = {
    patientId: USERS.patient.id,
    lastUpdated: now,
    vitals: {
      bloodPressure: { systolic: 125, diastolic: 82, date: getDateString(-1) },
      heartRate: { value: 72, date: getDateString(-1) },
      temperature: { value: 36.5, unit: 'C', date: getDateString(-1) },
      weight: { value: 75, unit: 'kg', date: getDateString(-7) },
      height: { value: 175, unit: 'cm', date: getDateString(-30) },
      bloodOxygen: { value: 98, date: getDateString(-1) }
    },
    medications: [
      {
        name: 'Amlodipine',
        dosage: '5mg',
        frequency: 'Once daily',
        startDate: getDateOnly(-60),
        prescribedBy: USERS.doctor.name,
        status: 'active'
      }
    ],
    allergies: USERS.patient.allergies,
    conditions: USERS.patient.chronicConditions,
    familyHistory: [
      { condition: 'Hypertension', relationship: 'Father' },
      { condition: 'Diabetes Type 2', relationship: 'Mother' }
    ],
    immunizations: [
      { name: 'COVID-19 Vaccine', date: getDateOnly(-365), provider: 'Ministry of Public Health' },
      { name: 'Influenza', date: getDateOnly(-180), provider: USERS.doctor.hospital }
    ],
    lifestyle: {
      smoking: 'Never',
      alcohol: 'Occasional',
      exercise: 'Moderate (3x/week)',
      diet: 'Balanced'
    }
  };
  
  writeJSON(BUCKETS.PATIENT, `phr/${USERS.patient.id}.json`, phr);
  
  // PDPA Consent
  const pdpaConsent = {
    patientId: USERS.patient.id,
    consentGiven: true,
    consentDate: getDateString(-90),
    consentVersion: '1.0',
    purposes: {
      healthcareServices: true,
      medicalRecordAccess: true,
      emergencyContact: true,
      dataAnalytics: false,
      marketing: false
    },
    lastUpdated: getDateString(-90)
  };
  
  writeJSON(BUCKETS.PATIENT, `pdpa-consents/${USERS.patient.id}.json`, pdpaConsent);
}

// ============================================================================
// GENERATE APPOINTMENTS (izara-appointments)
// ============================================================================

function generateAppointments() {
  console.log('\n📁 Generating Appointments...');
  
  const now = getDateString(0);
  const appointmentDate = getDateOnly(2); // 2 days from now
  
  // Sample appointment
  const appointment = {
    id: 'APT-2024-1210-001',
    appointmentId: 'APT-2024-1210-001',
    
    // Patient Info
    patientId: USERS.patient.id,
    patientName: USERS.patient.name,
    patientEmail: USERS.patient.email,
    patientPhone: USERS.patient.phone,
    
    // Doctor Info (all assignment fields for compatibility)
    doctorId: USERS.doctor.id,
    assignedDoctorId: USERS.doctor.id,
    adminAssignedDoctorId: USERS.doctor.id,
    doctorName: USERS.doctor.name,
    
    // Timing (both formats for compatibility)
    appointmentDate: appointmentDate,
    date: appointmentDate,
    appointmentTime: '10:00',
    time: '10:00',
    duration: 30,
    
    // Type & Status
    appointmentType: 'telehealth',
    status: 'confirmed',
    
    // Medical Info
    symptoms: ['Headache', 'Mild fever'],
    symptomDescription: 'Experiencing headache and mild fever for 2 days',
    reason: 'General checkup and symptom consultation',
    urgency: 'normal',
    
    // Meeting
    meetingLink: '',
    meetLink: '',
    calendarEventId: '',
    
    // Metadata
    createdAt: getDateString(-1),
    updatedAt: now,
    createdBy: USERS.patient.id,
    source: 'patient_portal'
  };
  
  // Write to all required locations for proper sync
  
  // 1. Main index
  writeJSON(BUCKETS.APPOINTMENTS, 'index.json', [appointment]);
  
  // 2. Individual appointment file
  writeJSON(BUCKETS.APPOINTMENTS, `appointments/${appointment.id}/details.json`, appointment);
  
  // 3. Secondary appointments index
  writeJSON(BUCKETS.APPOINTMENTS, 'appointments/index.json', [appointment]);
  
  // 4. Doctor's daily file
  writeJSON(BUCKETS.APPOINTMENTS, `${USERS.doctor.id}/${appointmentDate}.json`, [appointment]);
  
  // 5. Empty appointment pool
  writeJSON(BUCKETS.APPOINTMENTS, 'appointment-pool.json', []);
  
  // 6. Results storage
  writeJSON(BUCKETS.APPOINTMENTS, 'results/results.json', []);
  
  // 7. Reschedule records
  writeJSON(BUCKETS.APPOINTMENTS, 'reschedule-records.json', []);
}

// ============================================================================
// GENERATE METADATA (izara-meta-data)
// ============================================================================

function generateMetadata() {
  console.log('\n📁 Generating Metadata...');
  
  // Specialties
  const specialties = [
    { id: 'GP', name: 'General Practice', nameThai: 'เวชปฏิบัติทั่วไป' },
    { id: 'IM', name: 'Internal Medicine', nameThai: 'อายุรกรรม' },
    { id: 'CARD', name: 'Cardiology', nameThai: 'โรคหัวใจและหลอดเลือด' },
    { id: 'DERM', name: 'Dermatology', nameThai: 'ผิวหนัง' },
    { id: 'PED', name: 'Pediatrics', nameThai: 'กุมารเวชกรรม' },
    { id: 'ORTHO', name: 'Orthopedics', nameThai: 'ศัลยกรรมกระดูก' },
    { id: 'ENT', name: 'ENT', nameThai: 'หู คอ จมูก' },
    { id: 'NEURO', name: 'Neurology', nameThai: 'ประสาทวิทยา' },
    { id: 'PSYCH', name: 'Psychiatry', nameThai: 'จิตเวช' },
    { id: 'OB-GYN', name: 'Obstetrics & Gynecology', nameThai: 'สูติ-นรีเวช' }
  ];
  
  writeJSON(BUCKETS.METADATA, 'specialties.json', specialties);
  
  // Medications
  const medications = [
    { id: 'MED-001', name: 'Paracetamol 500mg', category: 'Analgesic', usage: 'Pain relief, fever' },
    { id: 'MED-002', name: 'Ibuprofen 400mg', category: 'NSAID', usage: 'Pain relief, inflammation' },
    { id: 'MED-003', name: 'Amoxicillin 500mg', category: 'Antibiotic', usage: 'Bacterial infections' },
    { id: 'MED-004', name: 'Amlodipine 5mg', category: 'Antihypertensive', usage: 'High blood pressure' },
    { id: 'MED-005', name: 'Omeprazole 20mg', category: 'PPI', usage: 'Acid reflux, ulcers' },
    { id: 'MED-006', name: 'Metformin 500mg', category: 'Antidiabetic', usage: 'Type 2 diabetes' },
    { id: 'MED-007', name: 'Cetirizine 10mg', category: 'Antihistamine', usage: 'Allergies' },
    { id: 'MED-008', name: 'Losartan 50mg', category: 'ARB', usage: 'High blood pressure' }
  ];
  
  writeJSON(BUCKETS.METADATA, 'medications.json', medications);
  
  // Lab Tests
  const labTests = [
    { id: 'LAB-001', name: 'Complete Blood Count (CBC)', category: 'Hematology', price: 350 },
    { id: 'LAB-002', name: 'Blood Glucose (Fasting)', category: 'Chemistry', price: 100 },
    { id: 'LAB-003', name: 'HbA1c', category: 'Chemistry', price: 450 },
    { id: 'LAB-004', name: 'Lipid Profile', category: 'Chemistry', price: 500 },
    { id: 'LAB-005', name: 'Liver Function Test', category: 'Chemistry', price: 600 },
    { id: 'LAB-006', name: 'Kidney Function Test', category: 'Chemistry', price: 500 },
    { id: 'LAB-007', name: 'Thyroid Function (TSH)', category: 'Hormone', price: 400 },
    { id: 'LAB-008', name: 'Urinalysis', category: 'Urine', price: 150 }
  ];
  
  writeJSON(BUCKETS.METADATA, 'lab-tests.json', labTests);
  
  // Hospitals/Facilities
  const hospitals = [
    {
      id: 'HOS-001',
      name: 'Izara Central Hospital',
      nameThai: 'โรงพยาบาลอิซาร่าเซ็นทรัล',
      address: '123 Health Street, Pathum Wan, Bangkok 10330',
      phone: '+66-2-123-4567',
      type: 'Private Hospital',
      services: ['Emergency', 'Outpatient', 'Inpatient', 'Telehealth']
    },
    {
      id: 'HOS-002',
      name: 'Bangkok General Clinic',
      nameThai: 'คลินิกบางกอกเจเนอรัล',
      address: '456 Medical Avenue, Ratchathewi, Bangkok 10400',
      phone: '+66-2-234-5678',
      type: 'Clinic',
      services: ['Outpatient', 'Telehealth']
    }
  ];
  
  writeJSON(BUCKETS.METADATA, 'hospitals-facilities.json', hospitals);
  
  // Doctors (public list for patient portal)
  const doctorsPublic = [{
    id: USERS.doctor.id,
    name: USERS.doctor.name,
    nameThai: USERS.doctor.nameThai,
    specialty: USERS.doctor.specialty,
    specialtyThai: USERS.doctor.specialtyThai,
    hospital: USERS.doctor.hospital,
    avatarUrl: USERS.doctor.avatarUrl,
    languages: USERS.doctor.languages,
    consultationFee: USERS.doctor.consultationFee,
    rating: 4.8,
    isAvailable: true
  }];
  
  writeJSON(BUCKETS.METADATA, 'doctors.json', doctorsPublic);
  
  // ICD-10 Codes (sample)
  const icd10Codes = [
    { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified', category: 'Respiratory' },
    { code: 'R51', description: 'Headache', category: 'Symptoms' },
    { code: 'R50.9', description: 'Fever, unspecified', category: 'Symptoms' },
    { code: 'I10', description: 'Essential (primary) hypertension', category: 'Cardiovascular' },
    { code: 'E11', description: 'Type 2 diabetes mellitus', category: 'Endocrine' },
    { code: 'K21.0', description: 'Gastro-esophageal reflux disease', category: 'Digestive' }
  ];
  
  writeJSON(BUCKETS.METADATA, 'icd10-codes.json', icd10Codes);
  
  // Health Education Articles
  const articles = [
    {
      id: 'ART-001',
      title: 'Understanding Hypertension',
      titleThai: 'ทำความเข้าใจเรื่องความดันโลหิตสูง',
      category: 'Cardiovascular',
      content: 'High blood pressure (hypertension) is a common condition...',
      audience: 'public',
      createdAt: getDateString(-30)
    },
    {
      id: 'ART-002',
      title: 'Healthy Diet Tips',
      titleThai: 'เคล็ดลับการรับประทานอาหารเพื่อสุขภาพ',
      category: 'Nutrition',
      content: 'A balanced diet is essential for maintaining good health...',
      audience: 'public',
      createdAt: getDateString(-20)
    }
  ];
  
  writeJSON(BUCKETS.METADATA, 'health-education-articles.json', articles);
  
  // Health Tips
  const healthTips = [
    { id: 'TIP-001', tip: 'Drink at least 8 glasses of water daily', category: 'Hydration' },
    { id: 'TIP-002', tip: 'Get 7-8 hours of sleep each night', category: 'Sleep' },
    { id: 'TIP-003', tip: 'Exercise for at least 30 minutes, 3 times a week', category: 'Fitness' },
    { id: 'TIP-004', tip: 'Wash your hands frequently to prevent illness', category: 'Hygiene' }
  ];
  
  writeJSON(BUCKETS.METADATA, 'health-tips.json', healthTips);
  
  // Medical Content (for content library)
  const medicalContent = [
    {
      id: 'CONTENT-001',
      title: 'COVID-19 Prevention Guidelines',
      type: 'article',
      category: 'Infectious Disease',
      audience: 'public',
      createdAt: getDateString(-60)
    },
    {
      id: 'CONTENT-002',
      title: 'Managing Chronic Pain',
      type: 'video',
      category: 'Pain Management',
      audience: 'patients',
      createdAt: getDateString(-45)
    }
  ];
  
  writeJSON(BUCKETS.METADATA, 'medical-content.json', medicalContent);
  
  // Clinical Resources (for doctors)
  const clinicalResources = [
    {
      id: 'RES-001',
      title: 'Hypertension Treatment Guidelines 2024',
      type: 'guideline',
      specialty: 'Cardiology',
      audience: 'doctors',
      createdAt: getDateString(-30)
    }
  ];
  
  writeJSON(BUCKETS.METADATA, 'clinical-resources.json', clinicalResources);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 IZARA TELEMEDICINE - MINIMAL DATA SEEDER v1.0');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📋 Creating data for:');
  console.log(`   • Admin:   ${USERS.admin.email} / ${USERS.admin.password}`);
  console.log(`   • Doctor:  ${USERS.doctor.email} / ${USERS.doctor.password}`);
  console.log(`   • Patient: ${USERS.patient.email} / ${USERS.patient.password}`);
  
  // Clean output directory
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  }
  ensureDirectoryExists(OUTPUT_DIR);
  
  // Generate all data
  generateUserCredentials();
  generateDoctorData();
  generatePatientData();
  generateAppointments();
  generateMetadata();
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ DATA GENERATION COMPLETE!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🔧 Test Credentials:');
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ Role    │ Email                      │ Password            │');
  console.log('├─────────┼────────────────────────────┼─────────────────────┤');
  console.log(`│ Admin   │ ${USERS.admin.email.padEnd(26)} │ ${USERS.admin.password.padEnd(19)} │`);
  console.log(`│ Doctor  │ ${USERS.doctor.email.padEnd(26)} │ ${USERS.doctor.password.padEnd(19)} │`);
  console.log(`│ Patient │ ${USERS.patient.email.padEnd(26)} │ ${USERS.patient.password.padEnd(19)} │`);
  console.log('└─────────────────────────────────────────────────────────────────┘');
  console.log('\n📤 Next step: Upload to GCS with:');
  console.log('   node scripts/uploadToGCS.cjs');
  console.log('\n🧪 Or run tests directly (uses local output as fallback):');
  console.log('   node scripts/dataSyncSeleniumTests.cjs');
}

main();
