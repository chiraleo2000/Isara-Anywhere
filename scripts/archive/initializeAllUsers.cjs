/**
 * COMPLETE USER INITIALIZATION SCRIPT
 * Creates ALL required users for Izara Telemedicine Platform
 * 
 * ┌────────────────────┬──────────────────────────────┬──────────────────────┬─────────┬──────────────────┐
 * │ ID                 │ Email                        │ Password             │ Role    │ Status           │
 * ├────────────────────┼──────────────────────────────┼──────────────────────┼─────────┼──────────────────┤
 * │ ADMIN-001          │ admin.test@izara.com         │ IzaraAdmin@2024      │ Admin   │ ✅ Approved      │
 * │ DOC-001            │ doctor.test@izara.com        │ IzaraDoctor@2024     │ Doctor  │ ✅ Approved      │
 * │ DOC-002            │ doctor02.test@izara.com      │ IzaraDoctor@2024     │ Doctor  │ ⏳ Pending       │
 * │ DOC-003            │ cardio.doctor@izara.com      │ IzaraDoctor@2024     │ Doctor  │ ✅ Approved      │
 * │ DOC-INACTIVE-001   │ inactive.doctor@izara.com    │ InactiveDoc@2024     │ Doctor  │ 🚫 Inactive      │
 * │ DOC-REJECTED-001   │ rejected.doctor@izara.com    │ RejectedDoc@2024     │ Doctor  │ ❌ Rejected      │
 * │ DOC-LOCKED-001     │ locked.doctor@izara.com      │ LockedDoc@2024       │ Doctor  │ 🔒 Locked        │
 * │ PATIENT-001        │ demo.test@gmail.com          │ P@ssw0rd             │ Patient │ ✅ Active        │
 * └────────────────────┴──────────────────────────────┴──────────────────────┴─────────┴──────────────────┘
 * 
 * Run: node scripts/initializeAllUsers.cjs
 * Requires: GCS API Server running on port 3012
 */

const http = require('http');

// ============================================================================
// CONFIGURATION
// ============================================================================

const GCS_API_URL = 'http://localhost:3012';

const BUCKETS = {
  credentials: 'izara-users-credentials',
  doctor: 'izara-doctors-data',
  patient: 'izara-patients-data',
  appointments: 'izara-appointments',
  metadata: 'izara-meta-data'
};

// ============================================================================
// ALL USERS - COMPLETE LIST
// ============================================================================

const ADMIN = {
  id: 'ADMIN-001',
  email: 'admin.test@izara.com',
  password: 'IzaraAdmin@2024',
  name: 'Dr. Admin Manager',
  nameTh: 'นพ. แอดมิน ผู้จัดการ',
  medicalLicenseNumber: 'MD-ADMIN-001',
  specialty: 'Healthcare Administration',
  specialtyTh: 'การบริหารระบบสุขภาพ',
  phone: '+66812345678',
  hospital: 'Izara Medical Center',
  department: 'Administration',
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
    hospital: 'Izara Medical Center',
    department: 'General Medicine',
    consultationFee: 500,
    bio: 'Experienced General Practitioner with 10+ years of clinical experience.',
    role: 'doctor',
    isAdmin: false,
    isActive: true,
    isApproved: true,
    approvalStatus: 'approved',
    availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    workingHours: { start: '09:00', end: '17:00' }
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
    hospital: 'Izara Medical Center',
    department: 'Gastroenterology',
    consultationFee: 800,
    bio: 'Gastroenterology specialist awaiting approval.',
    role: 'doctor',
    isAdmin: false,
    isActive: false,  // PENDING - NOT ACTIVE YET
    isApproved: false,
    approvalStatus: 'pending',
    availableDays: ['monday', 'wednesday', 'friday'],
    workingHours: { start: '10:00', end: '16:00' }
  },
  {
    id: 'DOC-003',
    email: 'cardio.doctor@izara.com',
    password: 'IzaraDoctor@2024',
    name: 'Dr. Naree Heartcare',
    nameTh: 'พญ. นารี หัวใจดี',
    medicalLicenseNumber: 'MD-CARDIO-003',
    specialty: 'Cardiologist',
    specialtyTh: 'แพทย์ผู้เชี่ยวชาญโรคหัวใจ',
    phone: '+66812345681',
    hospital: 'Izara Heart Center',
    department: 'Cardiology',
    consultationFee: 1200,
    bio: 'Board-certified Cardiologist specializing in heart disease prevention and treatment.',
    role: 'doctor',
    isAdmin: false,
    isActive: true,
    isApproved: true,
    approvalStatus: 'approved',
    availableDays: ['tuesday', 'thursday', 'saturday'],
    workingHours: { start: '08:00', end: '14:00' }
  },
  {
    id: 'DOC-INACTIVE-001',
    email: 'inactive.doctor@izara.com',
    password: 'InactiveDoc@2024',
    name: 'Dr. Prayut Retired',
    nameTh: 'นพ. ประยุทธ์ เกษียณ',
    medicalLicenseNumber: 'MD-INACTIVE-001',
    specialty: 'Internal Medicine',
    specialtyTh: 'อายุรศาสตร์',
    phone: '+66812345682',
    hospital: 'Izara Medical Center',
    department: 'Internal Medicine',
    consultationFee: 600,
    bio: 'Retired physician. Account inactive.',
    role: 'doctor',
    isAdmin: false,
    isActive: false,  // INACTIVE
    isApproved: true,  // Was approved before
    approvalStatus: 'inactive',
    inactiveReason: 'Retirement',
    inactivatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    availableDays: [],
    workingHours: null
  },
  {
    id: 'DOC-REJECTED-001',
    email: 'rejected.doctor@izara.com',
    password: 'RejectedDoc@2024',
    name: 'Dr. Rejected Applicant',
    nameTh: 'นพ. ถูกปฏิเสธ สมัคร',
    medicalLicenseNumber: 'MD-FAKE-999',
    specialty: 'General Practice',
    specialtyTh: 'แพทย์ทั่วไป',
    phone: '+66812345683',
    hospital: 'Unknown',
    department: 'N/A',
    consultationFee: 0,
    bio: 'Application rejected due to invalid credentials.',
    role: 'doctor',
    isAdmin: false,
    isActive: false,
    isApproved: false,
    approvalStatus: 'rejected',
    rejectionReason: 'Invalid medical license number',
    rejectedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    rejectedBy: 'ADMIN-001',
    availableDays: [],
    workingHours: null
  },
  {
    id: 'DOC-LOCKED-001',
    email: 'locked.doctor@izara.com',
    password: 'LockedDoc@2024',
    name: 'Dr. Locked Account',
    nameTh: 'นพ. ถูกล็อค บัญชี',
    medicalLicenseNumber: 'MD-LOCKED-001',
    specialty: 'Dermatology',
    specialtyTh: 'แพทย์ผิวหนัง',
    phone: '+66812345684',
    hospital: 'Izara Medical Center',
    department: 'Dermatology',
    consultationFee: 700,
    bio: 'Account locked due to multiple failed login attempts.',
    role: 'doctor',
    isAdmin: false,
    isActive: false,  // Locked means not active
    isApproved: true,  // Was approved
    approvalStatus: 'locked',
    lockedUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // Locked for 30 more minutes
    lockedReason: 'Multiple failed login attempts',
    loginAttempts: 5,
    availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    workingHours: { start: '09:00', end: '17:00' }
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
    console.error('bcryptjs not found, using SHA256 fallback');
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

async function writeToGCS(bucket, path, data, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await new Promise((resolve, reject) => {
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
            } else if (res.statusCode === 429) {
              reject(new Error('RATE_LIMIT'));
            } else {
              reject(new Error(`GCS write failed: ${res.statusCode} - ${body}`));
            }
          });
        });
        
        req.on('error', reject);
        req.write(postData);
        req.end();
      });
    } catch (error) {
      if (error.message === 'RATE_LIMIT' && attempt < retries) {
        const waitTime = 5000 * attempt; // Exponential backoff: 5s, 10s, 15s, 20s
        console.log(`   ⏳ Rate limited, waiting ${waitTime/1000}s... (attempt ${attempt}/${retries})`);
        await delay(waitTime);
      } else {
        throw error;
      }
    }
  }
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
// CLEAN ALL DATA
// ============================================================================

async function cleanAllData() {
  console.log('\n🧹 CLEANING ALL EXISTING DATA...\n');
  
  const bucketsToClean = [
    { bucket: BUCKETS.credentials, prefix: 'users/' },
    { bucket: BUCKETS.credentials, prefix: 'sessions/' },
    { bucket: BUCKETS.doctor, prefix: 'doctors/' },
    { bucket: BUCKETS.patient, prefix: 'patients/' },
    { bucket: BUCKETS.appointments, prefix: '' }
  ];
  
  for (const { bucket, prefix } of bucketsToClean) {
    try {
      const files = await listGCSFiles(bucket, prefix);
      for (const file of files) {
        try {
          await deleteFromGCS(bucket, file.name || file);
        } catch (e) { /* ignore */ }
        await delay(20);
      }
    } catch (e) { /* ignore */ }
  }
  
  console.log('✅ Cleaning completed\n');
}

// ============================================================================
// CREATE ALL USERS
// ============================================================================

async function createAllUsers() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('       IZARA TELEMEDICINE - COMPLETE USER INITIALIZATION        ');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const now = new Date().toISOString();
  const usersIndex = [];
  const allDoctorProfiles = [];
  
  // =========== CREATE ADMIN ===========
  console.log('👑 Creating ADMIN...');
  
  const adminCredential = {
    id: ADMIN.id,
    email: ADMIN.email.toLowerCase(),
    passwordHash: hashDoctorPassword(ADMIN.password),
    role: 'admin',
    doctorId: ADMIN.id,
    medicalLicenseNumber: ADMIN.medicalLicenseNumber,
    isActive: true,
    isApproved: true,
    isAdmin: true,
    approvalStatus: 'approved',
    emailVerified: true,
    name: ADMIN.name,
    nameTh: ADMIN.nameTh,
    phone: ADMIN.phone,
    specialty: ADMIN.specialty,
    specialtyTh: ADMIN.specialtyTh,
    hospital: ADMIN.hospital,
    department: ADMIN.department,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${ADMIN.email}`,
    preferences: { 
      theme: 'light', 
      language: 'th', 
      notifications: { email: true, sms: true, push: true } 
    },
    createdAt: now,
    updatedAt: now
  };
  
  await writeToGCS(BUCKETS.credentials, `users/${ADMIN.id}.json`, adminCredential);
  usersIndex.push({
    id: ADMIN.id,
    email: ADMIN.email.toLowerCase(),
    role: 'admin',
    isActive: true,
    isAdmin: true,
    approvalStatus: 'approved'
  });
  
  console.log(`   ✅ ${ADMIN.email} (ID: ${ADMIN.id}) - ADMIN`);
  
  // =========== CREATE DOCTORS ===========
  console.log('\n👨‍⚕️ Creating DOCTORS...');
  
  for (const doctor of DOCTORS) {
    const credential = {
      id: doctor.id,
      email: doctor.email.toLowerCase(),
      passwordHash: hashDoctorPassword(doctor.password),
      role: 'doctor',
      doctorId: doctor.id,
      medicalLicenseNumber: doctor.medicalLicenseNumber,
      isActive: doctor.isActive,
      isApproved: doctor.isApproved,
      isAdmin: false,
      approvalStatus: doctor.approvalStatus,
      emailVerified: doctor.approvalStatus !== 'rejected',
      name: doctor.name,
      nameTh: doctor.nameTh,
      phone: doctor.phone,
      specialty: doctor.specialty,
      specialtyTh: doctor.specialtyTh,
      hospital: doctor.hospital,
      department: doctor.department,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${doctor.email}`,
      loginAttempts: doctor.loginAttempts || 0,
      lockedUntil: doctor.lockedUntil || null,
      inactiveReason: doctor.inactiveReason || null,
      inactivatedAt: doctor.inactivatedAt || null,
      rejectionReason: doctor.rejectionReason || null,
      rejectedAt: doctor.rejectedAt || null,
      rejectedBy: doctor.rejectedBy || null,
      preferences: { 
        theme: 'light', 
        language: 'th', 
        notifications: { email: true, sms: true, push: true } 
      },
      createdAt: now,
      updatedAt: now
    };
    
    await writeToGCS(BUCKETS.credentials, `users/${doctor.id}.json`, credential);
    
    // Create doctor profile (only for approved doctors)
    const profile = {
      id: doctor.id,
      email: doctor.email.toLowerCase(),
      name: doctor.name,
      nameTh: doctor.nameTh,
      medicalLicenseNumber: doctor.medicalLicenseNumber,
      specialty: doctor.specialty,
      specialtyTh: doctor.specialtyTh,
      phone: doctor.phone,
      hospital: doctor.hospital,
      department: doctor.department,
      bio: doctor.bio,
      consultationFee: doctor.consultationFee,
      education: ['MD - Chulalongkorn University', 'Residency - Siriraj Hospital'],
      certifications: ['Thai Medical Council License', 'Board Certified'],
      availableDays: doctor.availableDays || [],
      workingHours: doctor.workingHours || null,
      rating: doctor.isApproved ? 4.5 : 0,
      reviewCount: doctor.isApproved ? Math.floor(Math.random() * 50) + 10 : 0,
      isActive: doctor.isActive,
      isApproved: doctor.isApproved,
      approvalStatus: doctor.approvalStatus,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${doctor.email}`,
      createdAt: now,
      updatedAt: now
    };
    
    await writeToGCS(BUCKETS.doctor, `doctors/${doctor.id}/profile.json`, profile);
    
    // Only add active/approved doctors to the listing
    if (doctor.approvalStatus === 'approved' || doctor.approvalStatus === 'pending') {
      allDoctorProfiles.push(profile);
    }
    
    usersIndex.push({
      id: doctor.id,
      email: doctor.email.toLowerCase(),
      role: 'doctor',
      isActive: doctor.isActive,
      isAdmin: false,
      approvalStatus: doctor.approvalStatus
    });
    
    // Status emoji
    let statusEmoji = '✅';
    if (doctor.approvalStatus === 'pending') statusEmoji = '⏳';
    else if (doctor.approvalStatus === 'inactive') statusEmoji = '🚫';
    else if (doctor.approvalStatus === 'rejected') statusEmoji = '❌';
    else if (doctor.approvalStatus === 'locked') statusEmoji = '🔒';
    
    console.log(`   ${statusEmoji} ${doctor.email} (ID: ${doctor.id}) - ${doctor.approvalStatus.toUpperCase()}`);
    
    await delay(50);
  }
  
  // Save doctors list
  await writeToGCS(BUCKETS.doctor, 'doctors.json', allDoctorProfiles);
  
  // =========== CREATE PATIENT ===========
  console.log('\n🧑 Creating PATIENT...');
  
  const patientUserId = `user_${PATIENT.id}`;
  
  const patientCredential = {
    id: patientUserId,
    patientId: PATIENT.id,
    odVisitId: PATIENT.odVisitId,
    email: PATIENT.email.toLowerCase(),
    passwordHash: hashPatientPassword(PATIENT.password),
    role: 'patient',
    isActive: true,
    emailVerified: true,
    profile: {
      id: patientUserId,
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
  
  await writeToGCS(BUCKETS.credentials, `users/${patientUserId}.json`, patientCredential);
  
  // Create patient PHR data
  const phrData = {
    patientId: PATIENT.id,
    odVisitId: PATIENT.odVisitId,
    userId: patientUserId,
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
  
  usersIndex.push({
    id: patientUserId,
    email: PATIENT.email.toLowerCase(),
    role: 'patient',
    isActive: true,
    patientId: PATIENT.id
  });
  
  console.log(`   ✅ ${PATIENT.email} (ID: ${PATIENT.id}) - ACTIVE PATIENT`);
  
  // =========== SAVE USERS INDEX ===========
  await writeToGCS(BUCKETS.credentials, 'users/index.json', usersIndex);
  
  // =========== PRINT SUMMARY ===========
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                    INITIALIZATION COMPLETE                      ');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log('📋 USER CREDENTIALS SUMMARY:');
  console.log('┌────────────────────┬──────────────────────────────┬──────────────────────┬─────────┬──────────────────┐');
  console.log('│ ID                 │ Email                        │ Password             │ Role    │ Status           │');
  console.log('├────────────────────┼──────────────────────────────┼──────────────────────┼─────────┼──────────────────┤');
  console.log(`│ ${ADMIN.id.padEnd(18)} │ ${ADMIN.email.padEnd(28)} │ ${ADMIN.password.padEnd(20)} │ Admin   │ ✅ Approved      │`);
  
  for (const doc of DOCTORS) {
    let status = '✅ Approved';
    if (doc.approvalStatus === 'pending') status = '⏳ Pending';
    else if (doc.approvalStatus === 'inactive') status = '🚫 Inactive';
    else if (doc.approvalStatus === 'rejected') status = '❌ Rejected';
    else if (doc.approvalStatus === 'locked') status = '🔒 Locked';
    
    console.log(`│ ${doc.id.padEnd(18)} │ ${doc.email.padEnd(28)} │ ${doc.password.padEnd(20)} │ Doctor  │ ${status.padEnd(16)} │`);
  }
  
  console.log(`│ ${PATIENT.id.padEnd(18)} │ ${PATIENT.email.padEnd(28)} │ ${PATIENT.password.padEnd(20)} │ Patient │ ✅ Active        │`);
  console.log('└────────────────────┴──────────────────────────────┴──────────────────────┴─────────┴──────────────────┘\n');
  
  console.log('🔐 LOGIN URLS:');
  console.log('   Doctor Portal:  http://localhost:3010/login');
  console.log('   Patient Portal: http://localhost:3005/login');
  console.log('\n✅ All users created successfully!\n');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  try {
    // Check GCS connection
    console.log('\n🔍 Checking GCS API Server...');
    
    await new Promise((resolve, reject) => {
      http.get(`${GCS_API_URL}/api/health`, (res) => {
        if (res.statusCode === 200) {
          console.log('✅ GCS API Server is running\n');
          resolve();
        } else {
          reject(new Error('GCS API Server not healthy'));
        }
      }).on('error', reject);
    });
    
    // Clean and create
    await cleanAllData();
    await createAllUsers();
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\n⚠️  Make sure GCS API Server is running on port 3012');
    console.error('   Run: cd Isara-doctor-portal/server && node gcsApiServer.cjs\n');
    process.exit(1);
  }
}

main();
