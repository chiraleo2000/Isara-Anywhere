/**
 * DEFINITIVE Mock Data Generator for Izara Telemedicine Platform
 * 
 * Creates EXACTLY the users specified:
 * 1. ADMIN-001: admin.test@izara.com / IzaraAdmin@2024 (Admin)
 * 2. DOC-001: doctor.test@izara.com / IzaraDoctor@2024 (Approved GP)
 * 3. DOC-002: doctor02.test@izara.com / IzaraDoctor@2024 (PENDING Gastroenterologist)
 * 4. PATIENT-001: demo.test@gmail.com / P@ssw0rd (Patient)
 * 
 * Run: node scripts/definiteMockData.cjs
 * Requires: GCS API Server running on port 3012
 */

const http = require('http');

// ============================================================================
// CONFIGURATION - EXACT USER LIST AS REQUESTED
// ============================================================================

const BUCKETS = {
  credentials: 'izara-users-credentials',
  doctor: 'izara-doctors-data',
  patient: 'izara-patients-data',
  appointments: 'izara-appointments',
  metadata: 'izara-meta-data'
};

// EXACT USERS - NO MORE, NO LESS
const ADMIN = {
  id: 'ADMIN-001',
  email: 'admin.test@izara.com',
  password: 'IzaraAdmin@2024',
  name: 'Dr. Admin Manager',
  nameTh: 'นพ. แอดมิน ผู้จัดการ',
  medicalLicenseNumber: 'MD-ADMIN-001',
  specialty: 'Healthcare Administration',
  phone: '+66812345678',
  role: 'admin',
  isAdmin: true,
  isActive: true,
  isApproved: true,
  approvalStatus: 'approved'
};

const DOCTORS = [
  {
    id: 'DOC-001',
    email: 'doctor.test@izara.com',
    password: 'IzaraDoctor@2024',
    name: 'Dr. Somchai Prakarn',
    nameTh: 'นพ. สมชาย ประการ',
    medicalLicenseNumber: 'MD-12345',
    specialty: 'General Practitioner',
    specialtyTh: 'แพทย์เวชปฏิบัติทั่วไป',
    phone: '+66812345679',
    role: 'doctor',
    isAdmin: false,
    isActive: true,
    isApproved: true,
    approvalStatus: 'approved',
    hospital: 'Izara Medical Center',
    department: 'General Medicine',
    consultationFee: 500,
    bio: 'Experienced General Practitioner with 10 years of clinical experience.'
  },
  {
    id: 'DOC-002',
    email: 'doctor02.test@izara.com',
    password: 'IzaraDoctor@2024',
    name: 'Dr. Wanida Gastro',
    nameTh: 'พญ. วนิดา แกสโตร',
    medicalLicenseNumber: 'MD-67890',
    specialty: 'Gastroenterologist',
    specialtyTh: 'แพทย์ผู้เชี่ยวชาญด้านทางเดินอาหาร',
    phone: '+66812345680',
    role: 'doctor',
    isAdmin: false,
    isActive: false,  // NOT ACTIVE - PENDING
    isApproved: false, // NOT APPROVED - NEEDS ADMIN APPROVAL
    approvalStatus: 'pending', // PENDING STATUS
    hospital: 'Izara Medical Center',
    department: 'Gastroenterology',
    consultationFee: 800,
    bio: 'Gastroenterology specialist seeking approval.'
  }
];

const PATIENT = {
  id: 'PATIENT-001',
  odVisitId: 'OD-001',
  email: 'demo.test@gmail.com',
  password: 'P@ssw0rd',
  name: 'Sompong Patientone',
  nameTh: 'สมปอง ผู้ป่วยหนึ่ง',
  phone: '+66899999999',
  role: 'patient',
  dateOfBirth: '1990-05-15',
  gender: 'male',
  idNumber: '1234567890123',
  bloodType: 'O+',
  height: 175,
  weight: 70,
  allergies: ['Penicillin', 'Aspirin'],
  chronicConditions: ['Hypertension', 'Type 2 Diabetes'],
  currentMedications: ['Metformin 500mg', 'Lisinopril 10mg'],
  emergencyContact: { name: 'Somying Patientone', phone: '+66811111111', relation: 'Spouse' }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function hashDoctorPassword(password) {
  try {
    const bcrypt = require('bcryptjs');
    return bcrypt.hashSync(password, 10);
  } catch (e) {
    console.error('bcryptjs not found, using fallback');
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(password + 'izara_salt_2024').digest('hex');
  }
}

function hashPatientPassword(password) {
  return Buffer.from(password).toString('base64');
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function writeToGCS(bucket, path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ bucket, path, data });
    
    const options = {
      hostname: 'localhost',
      port: 3012,
      path: '/api/storage/write',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`GCS write failed: ${res.statusCode} - ${body}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function deleteFromGCS(bucket, path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3012,
      path: `/api/storage/delete?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`,
      method: 'DELETE'
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(true));
    });
    
    req.on('error', () => resolve(false));
    req.end();
  });
}

async function listGCSFiles(bucket, prefix = '') {
  return new Promise((resolve) => {
    const url = `http://localhost:3012/api/storage/list?bucket=${encodeURIComponent(bucket)}&prefix=${encodeURIComponent(prefix)}`;
    
    http.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body).files || []);
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

// ============================================================================
// CLEAN ALL DATA FUNCTION
// ============================================================================

async function cleanAllData() {
  console.log('\n🧹 CLEANING ALL EXISTING DATA...\n');
  
  const bucketsToClean = [
    { bucket: BUCKETS.credentials, prefix: 'users/' },
    { bucket: BUCKETS.credentials, prefix: 'sessions/' },
    { bucket: BUCKETS.credentials, prefix: '' },
    { bucket: BUCKETS.doctor, prefix: 'doctors/' },
    { bucket: BUCKETS.doctor, prefix: '' },
    { bucket: BUCKETS.patient, prefix: 'patients/' },
    { bucket: BUCKETS.patient, prefix: '' },
    { bucket: BUCKETS.appointments, prefix: 'appointments/' },
    { bucket: BUCKETS.appointments, prefix: '' },
    { bucket: BUCKETS.metadata, prefix: '' }
  ];
  
  for (const { bucket, prefix } of bucketsToClean) {
    try {
      const files = await listGCSFiles(bucket, prefix);
      console.log(`   Found ${files.length} files in ${bucket}/${prefix || '(root)'}`);
      
      for (const file of files) {
        try {
          await deleteFromGCS(bucket, file.name || file);
          console.log(`   🗑️  Deleted: ${bucket}/${file.name || file}`);
        } catch (e) {
          // Ignore delete errors
        }
        await delay(50);
      }
    } catch (e) {
      console.log(`   ⚠️  Could not clean ${bucket}/${prefix}: ${e.message}`);
    }
  }
  
  console.log('\n✅ Cleaning completed\n');
}

// ============================================================================
// CREATE ADMIN
// ============================================================================

async function createAdmin() {
  console.log('\n👤 Creating ADMIN user...');
  const now = new Date().toISOString();
  
  const credential = {
    id: ADMIN.id,
    email: ADMIN.email,
    passwordHash: hashDoctorPassword(ADMIN.password),
    role: 'admin',
    doctorId: ADMIN.id,
    medicalLicenseNumber: ADMIN.medicalLicenseNumber,
    isActive: true,
    isApproved: true,
    approvalStatus: 'approved',
    emailVerified: true,
    name: ADMIN.name,
    nameTh: ADMIN.nameTh,
    phone: ADMIN.phone,
    specialty: ADMIN.specialty,
    isAdmin: true,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${ADMIN.email}`,
    preferences: { theme: 'light', language: 'th', notifications: { email: true, sms: true, push: true } },
    createdAt: now,
    updatedAt: now
  };
  
  await writeToGCS(BUCKETS.credentials, `users/${ADMIN.id}.json`, credential);
  console.log(`   ✅ Created: ${ADMIN.email} (ID: ${ADMIN.id})`);
  
  return credential;
}

// ============================================================================
// CREATE DOCTORS
// ============================================================================

async function createDoctors() {
  console.log('\n👨‍⚕️ Creating DOCTOR users...');
  const now = new Date().toISOString();
  const allDoctors = [];
  
  for (const doctor of DOCTORS) {
    // Create credential for doctor portal auth
    const credential = {
      id: doctor.id,
      email: doctor.email,
      passwordHash: hashDoctorPassword(doctor.password),
      role: 'doctor',
      doctorId: doctor.id,
      medicalLicenseNumber: doctor.medicalLicenseNumber,
      isActive: doctor.isActive,
      isApproved: doctor.isApproved,
      approvalStatus: doctor.approvalStatus,
      emailVerified: true,
      name: doctor.name,
      nameTh: doctor.nameTh,
      phone: doctor.phone,
      specialty: doctor.specialty,
      specialtyTh: doctor.specialtyTh,
      isAdmin: false,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${doctor.email}`,
      preferences: { theme: 'light', language: 'th', notifications: { email: true, sms: true, push: true } },
      createdAt: now,
      updatedAt: now
    };
    
    await writeToGCS(BUCKETS.credentials, `users/${doctor.id}.json`, credential);
    
    // Create doctor profile
    const profile = {
      id: doctor.id,
      email: doctor.email,
      name: doctor.name,
      nameTh: doctor.nameTh,
      medicalLicenseNumber: doctor.medicalLicenseNumber,
      specialty: doctor.specialty,
      specialtyTh: doctor.specialtyTh,
      phone: doctor.phone,
      hospital: doctor.hospital,
      department: doctor.department,
      bio: doctor.bio,
      education: ['MD - Chulalongkorn University', 'Residency - Siriraj Hospital'],
      certifications: ['Thai Medical Council License', 'Board Certified'],
      consultationFee: doctor.consultationFee,
      availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      workingHours: { start: '09:00', end: '17:00' },
      rating: 4.5,
      reviewCount: 25,
      isActive: doctor.isActive,
      isApproved: doctor.isApproved,
      approvalStatus: doctor.approvalStatus,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${doctor.email}`,
      createdAt: now,
      updatedAt: now
    };
    
    await writeToGCS(BUCKETS.doctor, `doctors/${doctor.id}/profile.json`, profile);
    
    allDoctors.push(profile);
    
    const status = doctor.approvalStatus === 'pending' ? '⏳ PENDING APPROVAL' : '✅ APPROVED';
    console.log(`   ${status}: ${doctor.email} (ID: ${doctor.id}, ${doctor.specialty})`);
    
    await delay(100);
  }
  
  // Create doctors.json list (for listing)
  await writeToGCS(BUCKETS.doctor, 'doctors.json', allDoctors);
  
  return allDoctors;
}

// ============================================================================
// CREATE PATIENT
// ============================================================================

async function createPatient() {
  console.log('\n🧑 Creating PATIENT user...');
  const now = new Date().toISOString();
  const userId = `user_${PATIENT.id}`;
  
  // Create credential for patient portal auth (base64 password)
  const credential = {
    id: userId,
    patientId: PATIENT.id,
    odVisitId: PATIENT.odVisitId,
    email: PATIENT.email,
    passwordHash: hashPatientPassword(PATIENT.password), // BASE64 for patient portal
    role: 'patient',
    isActive: true,
    emailVerified: true,
    profile: {
      id: userId,
      patientId: PATIENT.id,
      name: PATIENT.name,
      nameTh: PATIENT.nameTh,
      email: PATIENT.email,
      phone: PATIENT.phone,
      dateOfBirth: PATIENT.dateOfBirth,
      gender: PATIENT.gender,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${PATIENT.email}`
    },
    createdAt: now,
    updatedAt: now
  };
  
  await writeToGCS(BUCKETS.credentials, `users/${userId}.json`, credential);
  
  // Create PHR data
  const phrData = {
    patientId: PATIENT.id,
    odVisitId: PATIENT.odVisitId,
    userId: userId,
    personalInfo: {
      name: PATIENT.name,
      nameTh: PATIENT.nameTh,
      dateOfBirth: PATIENT.dateOfBirth,
      gender: PATIENT.gender,
      phone: PATIENT.phone,
      email: PATIENT.email,
      nationalId: PATIENT.idNumber,
      bloodType: PATIENT.bloodType,
      address: '123 Test Street, Bangkok 10100'
    },
    physicalInfo: {
      height: PATIENT.height,
      weight: PATIENT.weight,
      bloodType: PATIENT.bloodType,
      bmi: (PATIENT.weight / Math.pow(PATIENT.height / 100, 2)).toFixed(1)
    },
    medicalInfo: {
      allergies: PATIENT.allergies,
      chronicConditions: PATIENT.chronicConditions,
      currentMedications: PATIENT.currentMedications
    },
    emergencyContact: PATIENT.emergencyContact,
    vitalHistory: [
      { date: now, bloodPressure: '120/80', heartRate: 72, temperature: 36.5, weight: PATIENT.weight }
    ],
    labResults: [],
    immunizations: [
      { name: 'COVID-19 Vaccine', date: '2023-01-15', provider: 'MoPH Thailand' },
      { name: 'Influenza', date: '2023-10-01', provider: 'Izara Medical Center' }
    ],
    createdAt: now,
    updatedAt: now
  };
  
  await writeToGCS(BUCKETS.patient, `patients/${PATIENT.id}/profile.json`, phrData);
  await writeToGCS(BUCKETS.patient, `patients/${PATIENT.id}/phr.json`, phrData);
  
  // Create patients.json list
  await writeToGCS(BUCKETS.patient, 'patients.json', [{
    id: PATIENT.id,
    odVisitId: PATIENT.odVisitId,
    name: PATIENT.name,
    email: PATIENT.email,
    phone: PATIENT.phone,
    dateOfBirth: PATIENT.dateOfBirth,
    gender: PATIENT.gender,
    assignedDoctorId: 'DOC-001'
  }]);
  
  console.log(`   ✅ Created: ${PATIENT.email} (ID: ${PATIENT.id})`);
  
  return { credential, phrData };
}

// ============================================================================
// CREATE USER INDEX
// ============================================================================

async function createUserIndex() {
  console.log('\n📋 Creating user index...');
  
  const usersIndex = [
    {
      id: ADMIN.id,
      email: ADMIN.email,
      role: 'admin',
      isActive: true,
      approvalStatus: 'approved'
    },
    {
      id: 'DOC-001',
      email: 'doctor.test@izara.com',
      role: 'doctor',
      isActive: true,
      approvalStatus: 'approved'
    },
    {
      id: 'DOC-002',
      email: 'doctor02.test@izara.com',
      role: 'doctor',
      isActive: false,
      approvalStatus: 'pending'
    },
    {
      id: `user_${PATIENT.id}`,
      email: PATIENT.email,
      role: 'patient',
      isActive: true,
      approvalStatus: 'approved'
    }
  ];
  
  await writeToGCS(BUCKETS.credentials, 'users/index.json', usersIndex);
  console.log('   ✅ User index created with 4 users');
  
  return usersIndex;
}

// ============================================================================
// CREATE PENDING APPROVALS LIST
// ============================================================================

async function createPendingApprovals() {
  console.log('\n⏳ Creating pending approvals list...');
  
  const pendingDoctor = DOCTORS.find(d => d.approvalStatus === 'pending');
  
  const pendingApprovals = pendingDoctor ? [{
    userId: pendingDoctor.id,
    email: pendingDoctor.email,
    name: pendingDoctor.name,
    medicalLicenseNumber: pendingDoctor.medicalLicenseNumber,
    specialty: pendingDoctor.specialty,
    requestedAt: new Date().toISOString(),
    status: 'pending'
  }] : [];
  
  await writeToGCS(BUCKETS.credentials, 'pending-approvals.json', pendingApprovals);
  console.log(`   ✅ Pending approvals: ${pendingApprovals.length} doctor(s)`);
  
  return pendingApprovals;
}

// ============================================================================
// CREATE SAMPLE APPOINTMENTS
// ============================================================================

async function createSampleAppointments() {
  console.log('\n📅 Creating sample appointments...');
  const now = new Date();
  
  const appointments = [
    {
      id: 'APT-001',
      patientId: PATIENT.id,
      patientName: PATIENT.name,
      doctorId: 'DOC-001',
      doctorName: DOCTORS[0].name,
      specialty: DOCTORS[0].specialty,
      date: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
      time: '10:00',
      type: 'video',
      status: 'scheduled',
      reason: 'Follow-up for blood pressure',
      notes: '',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    },
    {
      id: 'APT-002',
      patientId: PATIENT.id,
      patientName: PATIENT.name,
      doctorId: 'DOC-001',
      doctorName: DOCTORS[0].name,
      specialty: DOCTORS[0].specialty,
      date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last week
      time: '14:00',
      type: 'video',
      status: 'completed',
      reason: 'General checkup',
      notes: 'Patient in good health. Continue current medications.',
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
  
  // Save appointments
  for (const apt of appointments) {
    await writeToGCS(BUCKETS.appointments, `appointments/${apt.id}.json`, apt);
  }
  
  await writeToGCS(BUCKETS.appointments, 'appointments.json', appointments);
  
  // Save patient-specific appointments
  await writeToGCS(BUCKETS.patient, `patients/${PATIENT.id}/appointments.json`, appointments);
  
  // Save doctor-specific appointments
  await writeToGCS(BUCKETS.doctor, `doctors/DOC-001/appointments.json`, appointments);
  
  console.log(`   ✅ Created ${appointments.length} sample appointments`);
  
  return appointments;
}

// ============================================================================
// CREATE PDPA CONSENTS
// ============================================================================

async function createPDPAConsents() {
  console.log('\n📜 Creating PDPA consents...');
  const now = new Date().toISOString();
  
  const pdpaConsent = {
    patientId: PATIENT.id,
    consents: [
      {
        type: 'medical_data_collection',
        granted: true,
        timestamp: now,
        version: '1.0'
      },
      {
        type: 'telemedicine_terms',
        granted: true,
        timestamp: now,
        version: '1.0'
      },
      {
        type: 'data_sharing_doctors',
        granted: true,
        doctorIds: ['DOC-001'],
        timestamp: now,
        version: '1.0'
      }
    ],
    lastUpdated: now
  };
  
  await writeToGCS(BUCKETS.patient, `patients/${PATIENT.id}/pdpa-consent.json`, pdpaConsent);
  console.log('   ✅ PDPA consents created');
  
  return pdpaConsent;
}

// ============================================================================
// CREATE EMR RECORDS
// ============================================================================

async function createEMRRecords() {
  console.log('\n📋 Creating sample EMR records...');
  const now = new Date().toISOString();
  
  const emrRecord = {
    id: 'EMR-001',
    patientId: PATIENT.id,
    doctorId: 'DOC-001',
    appointmentId: 'APT-002',
    visitDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    chiefComplaint: 'Routine follow-up for hypertension',
    subjective: 'Patient reports feeling well. No chest pain, shortness of breath, or dizziness.',
    objective: {
      vitalSigns: {
        bloodPressure: '130/85',
        heartRate: 75,
        temperature: 36.6,
        respiratoryRate: 16,
        oxygenSaturation: 98
      },
      physicalExam: 'General: Alert, oriented. CV: Regular rate rhythm, no murmurs. Lungs: Clear bilateral.'
    },
    assessment: 'Essential hypertension, controlled on current medication.',
    plan: 'Continue Lisinopril 10mg daily. Follow up in 3 months. Lifestyle modifications discussed.',
    diagnoses: [
      { code: 'I10', description: 'Essential (primary) hypertension', isPrimary: true }
    ],
    prescriptions: [
      {
        id: 'RX-001',
        medication: 'Lisinopril',
        dosage: '10mg',
        frequency: 'Once daily',
        duration: '90 days',
        quantity: 90,
        instructions: 'Take in the morning with water'
      }
    ],
    createdAt: now,
    updatedAt: now,
    status: 'completed'
  };
  
  await writeToGCS(BUCKETS.doctor, `doctors/DOC-001/emr/${PATIENT.id}/EMR-001.json`, emrRecord);
  await writeToGCS(BUCKETS.patient, `patients/${PATIENT.id}/emr/EMR-001.json`, emrRecord);
  
  console.log('   ✅ Sample EMR record created');
  
  return emrRecord;
}

// ============================================================================
// CREATE METADATA
// ============================================================================

async function createMetadata() {
  console.log('\n📊 Creating system metadata...');
  
  const metadata = {
    version: '0.0.2',
    lastDataGeneration: new Date().toISOString(),
    environment: 'development',
    users: {
      total: 4,
      admins: 1,
      doctors: 2,
      patients: 1
    },
    features: {
      appointments: true,
      emr: true,
      prescriptions: true,
      labOrders: true,
      imaging: true,
      videoConsultation: true,
      aiAssistant: true,
      pdpaConsent: true
    }
  };
  
  await writeToGCS(BUCKETS.metadata, 'system-info.json', metadata);
  
  // Specialties list for dropdowns
  const specialties = [
    { id: 'gp', name: 'General Practitioner', nameTh: 'แพทย์เวชปฏิบัติทั่วไป' },
    { id: 'cardio', name: 'Cardiologist', nameTh: 'แพทย์หัวใจ' },
    { id: 'gastro', name: 'Gastroenterologist', nameTh: 'แพทย์ทางเดินอาหาร' },
    { id: 'peds', name: 'Pediatrician', nameTh: 'แพทย์เด็ก' },
    { id: 'derm', name: 'Dermatologist', nameTh: 'แพทย์ผิวหนัง' },
    { id: 'neuro', name: 'Neurologist', nameTh: 'ประสาทวิทยา' },
    { id: 'ortho', name: 'Orthopedist', nameTh: 'แพทย์กระดูก' }
  ];
  
  await writeToGCS(BUCKETS.metadata, 'specialties.json', specialties);
  
  console.log('   ✅ System metadata created');
  
  return metadata;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('  IZARA TELEMEDICINE - DEFINITIVE MOCK DATA GENERATOR');
  console.log('='.repeat(70));
  console.log('\n📋 Will create EXACTLY these users:');
  console.log('   1. ADMIN-001: admin.test@izara.com / IzaraAdmin@2024');
  console.log('   2. DOC-001: doctor.test@izara.com / IzaraDoctor@2024 (APPROVED)');
  console.log('   3. DOC-002: doctor02.test@izara.com / IzaraDoctor@2024 (PENDING)');
  console.log('   4. PATIENT-001: demo.test@gmail.com / P@ssw0rd');
  console.log('');
  
  try {
    // Step 1: Clean all existing data
    await cleanAllData();
    await delay(500);
    
    // Step 2: Create users
    await createAdmin();
    await delay(200);
    
    await createDoctors();
    await delay(200);
    
    await createPatient();
    await delay(200);
    
    // Step 3: Create index and pending approvals
    await createUserIndex();
    await delay(200);
    
    await createPendingApprovals();
    await delay(200);
    
    // Step 4: Create sample data
    await createSampleAppointments();
    await delay(200);
    
    await createPDPAConsents();
    await delay(200);
    
    await createEMRRecords();
    await delay(200);
    
    await createMetadata();
    
    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('  ✅ MOCK DATA GENERATION COMPLETE');
    console.log('='.repeat(70));
    console.log('\n📋 CREATED USERS:');
    console.log('┌─────────────┬──────────────────────────┬───────────────────────┬─────────────────┐');
    console.log('│ ID          │ Email                    │ Password              │ Status          │');
    console.log('├─────────────┼──────────────────────────┼───────────────────────┼─────────────────┤');
    console.log('│ ADMIN-001   │ admin.test@izara.com     │ IzaraAdmin@2024       │ ✅ ACTIVE       │');
    console.log('│ DOC-001     │ doctor.test@izara.com    │ IzaraDoctor@2024      │ ✅ APPROVED     │');
    console.log('│ DOC-002     │ doctor02.test@izara.com  │ IzaraDoctor@2024      │ ⏳ PENDING      │');
    console.log('│ PATIENT-001 │ demo.test@gmail.com      │ P@ssw0rd              │ ✅ ACTIVE       │');
    console.log('└─────────────┴──────────────────────────┴───────────────────────┴─────────────────┘');
    console.log('\n📌 PORTAL URLs:');
    console.log('   Doctor Portal:  http://localhost:3010');
    console.log('   Patient Portal: http://localhost:3005');
    console.log('\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
