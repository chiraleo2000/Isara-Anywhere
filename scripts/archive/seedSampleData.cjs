/**
 * ================================================================================
 * IZARA TELEMEDICINE PLATFORM - SAMPLE DATA SEEDER
 * ================================================================================
 *
 * Seeds additional sample data AFTER the project has been initialized.
 * Creates sample doctors and patients for testing/demo purposes.
 *
 * Prerequisites:
 *   - Project must be initialized first (admin account exists)
 *   - Run: node scripts/project-init/initializeProject.cjs
 *
 * Usage:
 *   node scripts/project-init/seedSampleData.cjs
 *   node scripts/project-init/seedSampleData.cjs --dry-run
 *   node scripts/project-init/seedSampleData.cjs --minimal   (1 doctor, 1 patient)
 *   node scripts/project-init/seedSampleData.cjs --full      (5 doctors, 10 patients)
 *
 * @version 1.0.0
 * @date December 2025
 */

const { Storage } = require('@google-cloud/storage');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// ============================================================================
// CONFIGURATION
// ============================================================================

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const MINIMAL = args.includes('--minimal');
const FULL = args.includes('--full');
const VERBOSE = args.includes('--verbose') || args.includes('-v');

// Load environment
const envPath = path.join(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

// GCS Buckets
const GCS_BUCKETS = {
  AUTH: process.env.GCS_BUCKET_AUTH || 'izara-users-credentials',
  PATIENT: process.env.GCS_BUCKET_PATIENT || 'izara-patients-data',
  DOCTOR: process.env.GCS_BUCKET_DOCTOR || 'izara-doctors-data',
  APPOINTMENTS: process.env.GCS_BUCKET_APPOINTMENTS || 'izara-appointments',
  METADATA: process.env.GCS_BUCKET_METADATA || 'izara-meta-data'
};

// ============================================================================
// SAMPLE DATA DEFINITIONS
// ============================================================================

const SAMPLE_DOCTORS = [
  {
    id: 'DOC-001',
    email: 'doctor.test@izara.com',
    password: 'IzaraDoctor@2024',
    name: 'Dr. Somchai Prakarn',
    nameThai: 'นพ. สมชาย ประการ',
    gender: 'male',
    specialty: 'General Practice',
    specialtyThai: 'เวชปฏิบัติทั่วไป',
    medicalLicenseNumber: 'MD-12345',
    hospital: 'Izara Medical Center',
    hospitalThai: 'ศูนย์การแพทย์อิซาร่า',
    department: 'General Medicine',
    consultationFee: 500,
    bio: 'Experienced General Practitioner with 10+ years of clinical experience.',
    bioThai: 'แพทย์เวชปฏิบัติทั่วไปที่มีประสบการณ์มากกว่า 10 ปี',
    education: [
      { degree: 'MD', institution: 'Chulalongkorn University', year: 2010 },
      { degree: 'Residency', institution: 'Siriraj Hospital', year: 2014 }
    ],
    languages: ['Thai', 'English'],
    availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    workingHours: { start: '09:00', end: '17:00' }
  },
  {
    id: 'DOC-002',
    email: 'cardio.doctor@izara.com',
    password: 'IzaraDoctor@2024',
    name: 'Dr. Wanida Heartcare',
    nameThai: 'พญ. วนิดา หทัยรักษ์',
    gender: 'female',
    specialty: 'Cardiology',
    specialtyThai: 'อายุรศาสตร์หัวใจ',
    medicalLicenseNumber: 'MD-67890',
    hospital: 'Izara Medical Center',
    hospitalThai: 'ศูนย์การแพทย์อิซาร่า',
    department: 'Cardiology',
    consultationFee: 1000,
    bio: 'Board-certified Cardiologist specializing in preventive cardiology.',
    bioThai: 'แพทย์ผู้เชี่ยวชาญด้านหัวใจ เชี่ยวชาญการป้องกันโรคหัวใจ',
    education: [
      { degree: 'MD', institution: 'Mahidol University', year: 2008 },
      { degree: 'Fellowship - Cardiology', institution: 'Johns Hopkins', year: 2015 }
    ],
    languages: ['Thai', 'English'],
    availableDays: ['monday', 'wednesday', 'friday'],
    workingHours: { start: '10:00', end: '18:00' }
  },
  {
    id: 'DOC-003',
    email: 'derma.doctor@izara.com',
    password: 'IzaraDoctor@2024',
    name: 'Dr. Supaporn Skincare',
    nameThai: 'พญ. สุภาพร สกินแคร์',
    gender: 'female',
    specialty: 'Dermatology',
    specialtyThai: 'ตจวิทยา',
    medicalLicenseNumber: 'MD-11111',
    hospital: 'Izara Medical Center',
    hospitalThai: 'ศูนย์การแพทย์อิซาร่า',
    department: 'Dermatology',
    consultationFee: 800,
    bio: 'Dermatologist with expertise in cosmetic and medical dermatology.',
    bioThai: 'แพทย์ผิวหนังที่เชี่ยวชาญทั้งด้านความงามและการรักษาโรคผิวหนัง',
    education: [
      { degree: 'MD', institution: 'Khon Kaen University', year: 2012 }
    ],
    languages: ['Thai', 'English'],
    availableDays: ['tuesday', 'thursday', 'saturday'],
    workingHours: { start: '09:00', end: '16:00' }
  },
  {
    id: 'DOC-004',
    email: 'ortho.doctor@izara.com',
    password: 'IzaraDoctor@2024',
    name: 'Dr. Prasit Bonecare',
    nameThai: 'นพ. ประสิทธิ์ กระดูกแข็ง',
    gender: 'male',
    specialty: 'Orthopedics',
    specialtyThai: 'ออร์โธปิดิกส์',
    medicalLicenseNumber: 'MD-22222',
    hospital: 'Izara Medical Center',
    hospitalThai: 'ศูนย์การแพทย์อิซาร่า',
    department: 'Orthopedics',
    consultationFee: 900,
    bio: 'Orthopedic surgeon specializing in sports medicine and joint replacement.',
    bioThai: 'ศัลยแพทย์ออร์โธปิดิกส์เชี่ยวชาญเวชศาสตร์การกีฬาและเปลี่ยนข้อ',
    education: [
      { degree: 'MD', institution: 'Chiang Mai University', year: 2007 }
    ],
    languages: ['Thai', 'English'],
    availableDays: ['monday', 'tuesday', 'wednesday', 'thursday'],
    workingHours: { start: '08:00', end: '15:00' }
  },
  {
    id: 'DOC-005',
    email: 'pedia.doctor@izara.com',
    password: 'IzaraDoctor@2024',
    name: 'Dr. Naree Childcare',
    nameThai: 'พญ. นารี รักเด็ก',
    gender: 'female',
    specialty: 'Pediatrics',
    specialtyThai: 'กุมารเวชศาสตร์',
    medicalLicenseNumber: 'MD-33333',
    hospital: 'Izara Medical Center',
    hospitalThai: 'ศูนย์การแพทย์อิซาร่า',
    department: 'Pediatrics',
    consultationFee: 600,
    bio: 'Caring pediatrician dedicated to children\'s health and wellness.',
    bioThai: 'กุมารแพทย์ที่อุทิศตนเพื่อสุขภาพและความเป็นอยู่ที่ดีของเด็ก',
    education: [
      { degree: 'MD', institution: 'Srinakharinwirot University', year: 2014 }
    ],
    languages: ['Thai', 'English'],
    availableDays: ['monday', 'wednesday', 'friday', 'saturday'],
    workingHours: { start: '09:00', end: '17:00' }
  }
];

const SAMPLE_PATIENTS = [
  {
    id: 'PATIENT-001',
    email: 'demo.test@gmail.com',
    password: 'P@ssw0rd',
    name: 'John Demo Patient',
    nameThai: 'นาย จอห์น ทดสอบ',
    gender: 'male',
    dateOfBirth: '1990-03-15',
    bloodType: 'O+',
    phone: '+66821234567',
    nationalId: '1234567890123',
    allergies: ['Penicillin'],
    chronicConditions: ['Mild Hypertension']
  },
  {
    id: 'PATIENT-002',
    email: 'somying.test@gmail.com',
    password: 'P@ssw0rd',
    name: 'Somying Testuser',
    nameThai: 'นางสาว สมหญิง ทดสอบ',
    gender: 'female',
    dateOfBirth: '1985-07-22',
    bloodType: 'A+',
    phone: '+66829876543',
    nationalId: '9876543210987',
    allergies: [],
    chronicConditions: ['Type 2 Diabetes']
  },
  {
    id: 'PATIENT-003',
    email: 'somchai.demo@gmail.com',
    password: 'P@ssw0rd',
    name: 'Somchai Demoaccount',
    nameThai: 'นาย สมชาย เดโม',
    gender: 'male',
    dateOfBirth: '1978-11-08',
    bloodType: 'B+',
    phone: '+66835551234',
    nationalId: '5555555555555',
    allergies: ['Shellfish', 'Ibuprofen'],
    chronicConditions: []
  }
];

// ============================================================================
// UTILITIES
// ============================================================================

function log(message, type = 'info') {
  const icons = {
    info: '📘',
    success: '✅',
    warn: '⚠️',
    error: '❌',
    step: '➡️',
    doctor: '👨‍⚕️',
    patient: '🧑‍🤝‍🧑'
  };
  console.log(`${icons[type] || '•'} ${message}`);
}

function getDateString(daysFromNow = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString();
}

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

// Patient portal uses base64 encoding
function encodePatientPassword(password) {
  return Buffer.from(password).toString('base64');
}

// ============================================================================
// GCS FUNCTIONS
// ============================================================================

let storage;

function initializeStorage() {
  const projectId = process.env.GCP_PROJECT_ID || 'izara-telemedicine';
  
  const credentialPaths = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    path.join(__dirname, '../../credentials/service-account.json'),
    path.join(__dirname, '../../Isara-doctor-portal/public/izara-telemedicine-dd0b6abe2bc8.json'),
  ].filter(Boolean);
  
  for (const credPath of credentialPaths) {
    if (fs.existsSync(credPath)) {
      return new Storage({ projectId, keyFilename: credPath });
    }
  }
  
  return new Storage({ projectId });
}

async function writeToGCS(bucketName, filePath, data) {
  if (DRY_RUN) {
    log(`[DRY RUN] Would write: ${bucketName}/${filePath}`, 'info');
    return true;
  }
  
  try {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filePath);
    await file.save(JSON.stringify(data, null, 2), {
      contentType: 'application/json'
    });
    return true;
  } catch (error) {
    log(`Error writing ${filePath}: ${error.message}`, 'error');
    return false;
  }
}

async function readFromGCS(bucketName, filePath) {
  try {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filePath);
    const [content] = await file.download();
    return JSON.parse(content.toString());
  } catch (error) {
    return null;
  }
}

// ============================================================================
// SEEDING FUNCTIONS
// ============================================================================

async function seedDoctors(doctors) {
  log(`Seeding ${doctors.length} doctors...`, 'doctor');
  
  const now = getDateString(0);
  
  for (const doctor of doctors) {
    // Create credentials
    const credentials = {
      id: doctor.id,
      email: doctor.email,
      passwordHash: hashPassword(doctor.password),
      role: 'doctor',
      name: doctor.name,
      nameThai: doctor.nameThai,
      doctorId: doctor.id,
      isActive: true,
      isVerified: true,
      isApproved: true,
      approvalStatus: 'approved',
      loginAttempts: 0,
      createdAt: now,
      updatedAt: now
    };
    
    // Create profile
    const profile = {
      id: doctor.id,
      email: doctor.email,
      name: doctor.name,
      nameThai: doctor.nameThai,
      gender: doctor.gender,
      specialty: doctor.specialty,
      specialtyThai: doctor.specialtyThai,
      medicalLicenseNumber: doctor.medicalLicenseNumber,
      hospital: doctor.hospital,
      hospitalThai: doctor.hospitalThai,
      department: doctor.department,
      consultationFee: doctor.consultationFee,
      bio: doctor.bio,
      bioThai: doctor.bioThai,
      education: doctor.education,
      languages: doctor.languages,
      availableDays: doctor.availableDays,
      workingHours: doctor.workingHours,
      isActive: true,
      isApproved: true,
      createdAt: now,
      updatedAt: now
    };
    
    await writeToGCS(GCS_BUCKETS.AUTH, `users/${doctor.id}.json`, credentials);
    await writeToGCS(GCS_BUCKETS.DOCTOR, `doctors/${doctor.id}.json`, profile);
    
    log(`  Created: ${doctor.name} (${doctor.specialty})`, 'success');
  }
}

async function seedPatients(patients) {
  log(`Seeding ${patients.length} patients...`, 'patient');
  
  const now = getDateString(0);
  
  for (const patient of patients) {
    // Create credentials (patient uses base64)
    const credentials = {
      id: patient.id,
      patientId: patient.id,
      email: patient.email,
      passwordHash: encodePatientPassword(patient.password),
      role: 'patient',
      name: patient.name,
      nameThai: patient.nameThai,
      isActive: true,
      isVerified: true,
      loginAttempts: 0,
      createdAt: now,
      updatedAt: now
    };
    
    // Create profile
    const profile = {
      id: patient.id,
      email: patient.email,
      name: patient.name,
      nameThai: patient.nameThai,
      gender: patient.gender,
      dateOfBirth: patient.dateOfBirth,
      bloodType: patient.bloodType,
      phone: patient.phone,
      nationalId: patient.nationalId,
      allergies: patient.allergies,
      chronicConditions: patient.chronicConditions,
      createdAt: now,
      updatedAt: now
    };
    
    await writeToGCS(GCS_BUCKETS.AUTH, `users/${patient.id}.json`, credentials);
    await writeToGCS(GCS_BUCKETS.PATIENT, `patients/${patient.id}.json`, profile);
    
    log(`  Created: ${patient.name}`, 'success');
  }
}

async function updateIndices(doctors, patients) {
  log('Updating index files...', 'step');
  
  // Update users index
  const existingUsersIndex = await readFromGCS(GCS_BUCKETS.AUTH, 'index.json') || {
    version: '1.0.0',
    users: []
  };
  
  const newUsers = [
    ...doctors.map(d => ({ id: d.id, email: d.email, role: 'doctor', isActive: true })),
    ...patients.map(p => ({ id: p.id, email: p.email, role: 'patient', isActive: true }))
  ];
  
  existingUsersIndex.users = [...(existingUsersIndex.users || []), ...newUsers];
  existingUsersIndex.totalUsers = existingUsersIndex.users.length;
  existingUsersIndex.lastUpdated = getDateString(0);
  
  await writeToGCS(GCS_BUCKETS.AUTH, 'index.json', existingUsersIndex);
  
  // Update doctors index
  const doctorsIndex = {
    version: '1.0.0',
    lastUpdated: getDateString(0),
    totalDoctors: doctors.length,
    doctors: doctors.map(d => ({
      id: d.id,
      name: d.name,
      specialty: d.specialty,
      isActive: true
    }))
  };
  await writeToGCS(GCS_BUCKETS.DOCTOR, 'doctors-list.json', doctorsIndex);
  
  // Update patients index
  const patientsIndex = {
    version: '1.0.0',
    lastUpdated: getDateString(0),
    totalPatients: patients.length,
    patients: patients.map(p => ({
      id: p.id,
      name: p.name,
      isActive: true
    }))
  };
  await writeToGCS(GCS_BUCKETS.PATIENT, 'patients-list.json', patientsIndex);
  
  log('Indices updated', 'success');
}

// ============================================================================
// MAIN
// ============================================================================

async function seedSampleData() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║    IZARA TELEMEDICINE - SAMPLE DATA SEEDER                    ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log(`║  Mode: ${MINIMAL ? 'MINIMAL' : FULL ? 'FULL' : 'DEFAULT'}                                              ║`);
  console.log(`║  Dry Run: ${DRY_RUN ? 'YES' : 'NO'}                                                 ║`);
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  storage = initializeStorage();
  
  // Determine data set size
  let doctors, patients;
  
  if (MINIMAL) {
    doctors = SAMPLE_DOCTORS.slice(0, 1);
    patients = SAMPLE_PATIENTS.slice(0, 1);
  } else if (FULL) {
    doctors = SAMPLE_DOCTORS;
    patients = SAMPLE_PATIENTS;
  } else {
    doctors = SAMPLE_DOCTORS.slice(0, 2);
    patients = SAMPLE_PATIENTS.slice(0, 2);
  }
  
  // Seed data
  await seedDoctors(doctors);
  await seedPatients(patients);
  await updateIndices(doctors, patients);
  
  // Summary
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ SAMPLE DATA SEEDING COMPLETE                              ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log(`║  Doctors Created: ${String(doctors.length).padEnd(44)}║`);
  console.log(`║  Patients Created: ${String(patients.length).padEnd(43)}║`);
  console.log('║                                                               ║');
  console.log('║  Test Credentials:                                            ║');
  console.log('║    Doctor: doctor.test@izara.com / IzaraDoctor@2024           ║');
  console.log('║    Patient: demo.test@gmail.com / P@ssw0rd                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
}

seedSampleData().catch(error => {
  log(`Error: ${error.message}`, 'error');
  process.exit(1);
});
