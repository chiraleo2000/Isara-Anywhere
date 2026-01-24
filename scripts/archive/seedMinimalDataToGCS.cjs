/**
 * ================================================================================
 * IZARA TELEMEDICINE PLATFORM - MINIMAL DATA GCS UPLOADER
 * ================================================================================
 *
 * Uploads minimal test data directly to GCS buckets via the GCS API Server.
 * Creates: 1 Admin, 1 Doctor, 1 Patient with full personal data
 *
 * Prerequisites:
 * - GCS API Server running on port 3012
 * - Doctor Portal servers running (node server/startAll.cjs)
 *
 * Usage: node scripts/seedMinimalDataToGCS.cjs
 *
 * @version 1.0.0
 * @date December 2025
 */

const http = require('http');
const bcrypt = require('bcryptjs');

// ============================================================================
// CONFIGURATION
// ============================================================================

const GCS_API_URL = process.env.GCS_API_URL || 'http://localhost:3012';

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

// Hash password using bcrypt (same as authServer.cjs)
function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

// HTTP Request helper for GCS API
function makeRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, GCS_API_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 3012,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const result = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (e) => reject(e));

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Write to GCS via API
async function writeToGCS(bucket, path, data) {
  try {
    const result = await makeRequest('POST', '/api/storage/write', {
      bucket: bucket,
      path: path,
      data: data,
      makePublic: true
    });
    
    if (result.status === 200) {
      console.log(`   ✅ Uploaded: ${bucket}/${path}`);
      return true;
    } else {
      console.log(`   ❌ Failed: ${bucket}/${path} - ${result.data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${bucket}/${path} - ${error.message}`);
    return false;
  }
}

// Check if GCS API is available
async function checkGCSAPI() {
  try {
    const result = await makeRequest('GET', '/api/health');
    return result.status === 200;
  } catch (e) {
    return false;
  }
}

// Delete file from GCS
async function deleteFromGCS(bucket, path) {
  try {
    const result = await makeRequest('DELETE', '/api/storage/delete', {
      bucket: bucket,
      path: path
    });
    return result.status === 200;
  } catch (e) {
    return false;
  }
}

// ============================================================================
// DATA GENERATION FUNCTIONS
// ============================================================================

async function uploadUserCredentials() {
  console.log('\n📁 Uploading User Credentials to GCS...');
  
  const now = getDateString(0);
  
  // Admin credentials
  const adminCredentials = {
    id: USERS.admin.id,
    email: USERS.admin.email,
    passwordHash: hashPassword(USERS.admin.password),
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
    isApproved: true,
    approvalStatus: 'approved',
    status: 'approved',
    doctorId: USERS.admin.id,
    medicalLicenseNumber: USERS.admin.medicalLicenseNumber,
    specialty: USERS.admin.specialty,
    loginAttempts: 0,
    lockedUntil: null,
    createdAt: getDateString(-365),
    updatedAt: now,
    lastLogin: now,
    preferences: { language: 'th', notifications: true, theme: 'light' }
  };
  
  // Doctor credentials
  const doctorCredentials = {
    id: USERS.doctor.id,
    email: USERS.doctor.email,
    passwordHash: hashPassword(USERS.doctor.password),
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
    doctorId: USERS.doctor.id,
    isActive: true,
    isVerified: true,
    isApproved: true,
    approvalStatus: 'approved',
    status: 'approved',
    loginAttempts: 0,
    lockedUntil: null,
    createdAt: getDateString(-180),
    updatedAt: now,
    lastLogin: now,
    preferences: { language: 'th', notifications: true, theme: 'light' }
  };
  
  // Patient credentials - Patient portal uses BASE64 encoding, NOT bcrypt!
  const patientCredentials = {
    id: USERS.patient.id,
    patientId: USERS.patient.id,
    email: USERS.patient.email,
    passwordHash: Buffer.from(USERS.patient.password).toString('base64'), // BASE64 for patient portal!
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
  
  // Upload to GCS - ALL users go to users/ folder for auth to work!
  // Admin stored in users/ folder
  await writeToGCS(BUCKETS.AUTH, `users/${USERS.admin.id}.json`, adminCredentials);
  // Doctor stored in users/ folder  
  await writeToGCS(BUCKETS.AUTH, `users/${USERS.doctor.id}.json`, doctorCredentials);
  // Patient stored in users/ folder
  await writeToGCS(BUCKETS.AUTH, `users/${USERS.patient.id}.json`, patientCredentials);
  
  // CRITICAL: users/index.json must contain ALL users for login to work
  const allUsersIndex = [
    {
      id: adminCredentials.id,
      email: adminCredentials.email,
      role: 'admin',
      isActive: true,
      isApproved: true,
      approvalStatus: 'approved'
    },
    {
      id: doctorCredentials.id,
      email: doctorCredentials.email,
      role: 'doctor',
      isActive: true,
      isApproved: true,
      approvalStatus: 'approved'
    },
    {
      id: patientCredentials.id,
      email: patientCredentials.email,
      role: 'patient',
      isActive: true,
      isApproved: true,
      approvalStatus: 'approved'
    }
  ];
  
  await writeToGCS(BUCKETS.AUTH, 'users/index.json', allUsersIndex);
}

async function uploadDoctorData() {
  console.log('\n📁 Uploading Doctor Data to GCS...');
  
  const now = getDateString(0);
  
  // Doctor profile
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
  
  // Admin profile
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
  
  // Patient for doctor view
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
  
  // Upload profiles
  await writeToGCS(BUCKETS.DOCTOR, `profile/${USERS.doctor.id}.json`, doctorProfile);
  await writeToGCS(BUCKETS.DOCTOR, `profile/${USERS.admin.id}.json`, adminProfile);
  await writeToGCS(BUCKETS.DOCTOR, 'doctors.json', [doctorProfile, adminProfile]);
  
  // Upload patient data
  await writeToGCS(BUCKETS.DOCTOR, `patients/${USERS.patient.id}.json`, patientForDoctor);
  await writeToGCS(BUCKETS.DOCTOR, 'patients/patients.json', [patientForDoctor]);
  
  // Empty collections
  await writeToGCS(BUCKETS.DOCTOR, 'queue/queue.json', []);
  await writeToGCS(BUCKETS.DOCTOR, 'emrs/emrs.json', []);
  await writeToGCS(BUCKETS.DOCTOR, 'prescriptions/prescriptions.json', []);
  await writeToGCS(BUCKETS.DOCTOR, 'lab-orders/lab-orders.json', []);
  await writeToGCS(BUCKETS.DOCTOR, 'imaging-orders/imaging-orders.json', []);
}

async function uploadPatientData() {
  console.log('\n📁 Uploading Patient Data to GCS...');
  
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
  
  await writeToGCS(BUCKETS.PATIENT, `users/${USERS.patient.id}.json`, patientProfile);
  await writeToGCS(BUCKETS.PATIENT, 'patients.json', [patientProfile]);
  
  // PHR
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
  
  await writeToGCS(BUCKETS.PATIENT, `phr/${USERS.patient.id}.json`, phr);
  
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
  
  await writeToGCS(BUCKETS.PATIENT, `pdpa-consents/${USERS.patient.id}.json`, pdpaConsent);
}

async function uploadAppointments() {
  console.log('\n📁 Uploading Appointments to GCS...');
  
  const now = getDateString(0);
  const appointmentDate = getDateOnly(2);
  
  const appointment = {
    id: 'APT-2024-1210-001',
    appointmentId: 'APT-2024-1210-001',
    patientId: USERS.patient.id,
    patientName: USERS.patient.name,
    patientEmail: USERS.patient.email,
    patientPhone: USERS.patient.phone,
    doctorId: USERS.doctor.id,
    assignedDoctorId: USERS.doctor.id,
    adminAssignedDoctorId: USERS.doctor.id,
    doctorName: USERS.doctor.name,
    appointmentDate: appointmentDate,
    date: appointmentDate,
    appointmentTime: '10:00',
    time: '10:00',
    duration: 30,
    appointmentType: 'telehealth',
    status: 'confirmed',
    symptoms: ['Headache', 'Mild fever'],
    symptomDescription: 'Experiencing headache and mild fever for 2 days',
    reason: 'General checkup and symptom consultation',
    urgency: 'normal',
    meetingLink: '',
    meetLink: '',
    calendarEventId: '',
    createdAt: getDateString(-1),
    updatedAt: now,
    createdBy: USERS.patient.id,
    source: 'patient_portal'
  };
  
  // Write to all locations
  await writeToGCS(BUCKETS.APPOINTMENTS, 'index.json', [appointment]);
  await writeToGCS(BUCKETS.APPOINTMENTS, `appointments/${appointment.id}/details.json`, appointment);
  await writeToGCS(BUCKETS.APPOINTMENTS, 'appointments/index.json', [appointment]);
  await writeToGCS(BUCKETS.APPOINTMENTS, `${USERS.doctor.id}/${appointmentDate}.json`, [appointment]);
  await writeToGCS(BUCKETS.APPOINTMENTS, 'appointment-pool.json', []);
  await writeToGCS(BUCKETS.APPOINTMENTS, 'results/results.json', []);
  await writeToGCS(BUCKETS.APPOINTMENTS, 'reschedule-records.json', []);
}

async function uploadMetadata() {
  console.log('\n📁 Uploading Metadata to GCS...');
  
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
  await writeToGCS(BUCKETS.METADATA, 'specialties.json', specialties);
  
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
  await writeToGCS(BUCKETS.METADATA, 'medications.json', medications);
  
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
  await writeToGCS(BUCKETS.METADATA, 'lab-tests.json', labTests);
  
  // Hospitals
  const hospitals = [
    {
      id: 'HOS-001',
      name: 'Izara Central Hospital',
      nameThai: 'โรงพยาบาลอิซาร่าเซ็นทรัล',
      address: '123 Health Street, Pathum Wan, Bangkok 10330',
      phone: '+66-2-123-4567',
      type: 'Private Hospital',
      services: ['Emergency', 'Outpatient', 'Inpatient', 'Telehealth']
    }
  ];
  await writeToGCS(BUCKETS.METADATA, 'hospitals-facilities.json', hospitals);
  
  // Public doctors list
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
  await writeToGCS(BUCKETS.METADATA, 'doctors.json', doctorsPublic);
  
  // ICD-10 Codes
  const icd10Codes = [
    { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified', category: 'Respiratory' },
    { code: 'R51', description: 'Headache', category: 'Symptoms' },
    { code: 'R50.9', description: 'Fever, unspecified', category: 'Symptoms' },
    { code: 'I10', description: 'Essential (primary) hypertension', category: 'Cardiovascular' },
    { code: 'E11', description: 'Type 2 diabetes mellitus', category: 'Endocrine' },
    { code: 'K21.0', description: 'Gastro-esophageal reflux disease', category: 'Digestive' }
  ];
  await writeToGCS(BUCKETS.METADATA, 'icd10-codes.json', icd10Codes);
  
  // Health Education
  const articles = [
    {
      id: 'ART-001',
      title: 'Understanding Hypertension',
      titleThai: 'ทำความเข้าใจเรื่องความดันโลหิตสูง',
      category: 'Cardiovascular',
      content: 'High blood pressure is a common condition...',
      audience: 'public',
      createdAt: getDateString(-30)
    }
  ];
  await writeToGCS(BUCKETS.METADATA, 'health-education-articles.json', articles);
  
  // Health Tips
  const healthTips = [
    { id: 'TIP-001', tip: 'Drink at least 8 glasses of water daily', category: 'Hydration' },
    { id: 'TIP-002', tip: 'Get 7-8 hours of sleep each night', category: 'Sleep' },
    { id: 'TIP-003', tip: 'Exercise for at least 30 minutes, 3 times a week', category: 'Fitness' }
  ];
  await writeToGCS(BUCKETS.METADATA, 'health-tips.json', healthTips);
  
  // Medical Content
  const medicalContent = [
    {
      id: 'CONTENT-001',
      title: 'COVID-19 Prevention Guidelines',
      type: 'article',
      category: 'Infectious Disease',
      audience: 'public',
      createdAt: getDateString(-60)
    }
  ];
  await writeToGCS(BUCKETS.METADATA, 'medical-content.json', medicalContent);
  
  // Clinical Resources
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
  await writeToGCS(BUCKETS.METADATA, 'clinical-resources.json', clinicalResources);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 IZARA TELEMEDICINE - MINIMAL DATA GCS UPLOADER v1.0');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n📡 GCS API: ${GCS_API_URL}`);
  
  // Check GCS API
  console.log('\n🔍 Checking GCS API availability...');
  const apiAvailable = await checkGCSAPI();
  
  if (!apiAvailable) {
    console.error('\n❌ GCS API Server is not running!');
    console.log('   Please start the Doctor Portal servers first:');
    console.log('   cd Isara-doctor-portal && node server/startAll.cjs');
    process.exit(1);
  }
  
  console.log('   ✅ GCS API is available\n');
  
  console.log('📋 Creating data for:');
  console.log(`   • Admin:   ${USERS.admin.email} / ${USERS.admin.password}`);
  console.log(`   • Doctor:  ${USERS.doctor.email} / ${USERS.doctor.password}`);
  console.log(`   • Patient: ${USERS.patient.email} / ${USERS.patient.password}`);
  
  // Upload all data
  await uploadUserCredentials();
  await uploadDoctorData();
  await uploadPatientData();
  await uploadAppointments();
  await uploadMetadata();
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ DATA UPLOAD TO GCS COMPLETE!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🔧 Test Credentials:');
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ Role    │ Email                      │ Password            │');
  console.log('├─────────┼────────────────────────────┼─────────────────────┤');
  console.log(`│ Admin   │ ${USERS.admin.email.padEnd(26)} │ ${USERS.admin.password.padEnd(19)} │`);
  console.log(`│ Doctor  │ ${USERS.doctor.email.padEnd(26)} │ ${USERS.doctor.password.padEnd(19)} │`);
  console.log(`│ Patient │ ${USERS.patient.email.padEnd(26)} │ ${USERS.patient.password.padEnd(19)} │`);
  console.log('└─────────────────────────────────────────────────────────────────┘');
  console.log('\n🌐 GCS Buckets Updated:');
  Object.entries(BUCKETS).forEach(([key, bucket]) => {
    console.log(`   • ${bucket}`);
  });
  console.log('\n🧪 Run Selenium tests with:');
  console.log('   node scripts/dataSyncSeleniumTests.cjs');
}

main().catch(console.error);
