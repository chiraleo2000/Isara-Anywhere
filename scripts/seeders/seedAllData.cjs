/**
 * IZARA TELEMEDICINE - COMPREHENSIVE DATA SEEDER
 * 
 * Seeds all 5 GCS buckets with properly structured data following
 * the database schema defined in data/izara_database_schema.dbml
 * 
 * Buckets:
 * 1. izara-users-credentials - Authentication data
 * 2. izara-patients-data - Patient records, EMR, PHR
 * 3. izara-doctors-data - Doctor profiles, schedules, queue
 * 4. izara-appointments - Appointments, meeting links
 * 5. izara-meta-data - Reference data (medications, ICD-10, lab tests)
 * 
 * Usage: node scripts/seedAllData.cjs
 */

const { Storage } = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// ============================================================================
// CONFIGURATION
// ============================================================================

const PROJECT_ID = 'izara-telemedicine';
const BUCKETS = {
  credentials: 'izara-users-credentials',
  patients: 'izara-patients-data',
  doctors: 'izara-doctors-data',
  appointments: 'izara-appointments',
  metadata: 'izara-meta-data'
};

// Find service account file
const SERVICE_ACCOUNT_PATHS = [
  path.join(__dirname, '..', 'Isara-patient-portal', 'credentials', 'service-account.json'),
  path.join(__dirname, '..', 'Isara-doctor-portal', 'public', 'izara-telemedicine-dd0b6abe2bc8.json'),
];

let storage;

function initializeStorage() {
  for (const saPath of SERVICE_ACCOUNT_PATHS) {
    if (fs.existsSync(saPath)) {
      console.log(`✅ Using service account: ${path.basename(saPath)}`);
      return new Storage({
        projectId: PROJECT_ID,
        keyFilename: saPath
      });
    }
  }
  
  console.log('⚠️  No service account found, using ADC');
  return new Storage({ projectId: PROJECT_ID });
}

storage = initializeStorage();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function hashPassword(password) {
  return Buffer.from(password).toString('base64');
}

async function writeToGCS(bucket, filePath, data) {
  try {
    const file = storage.bucket(bucket).file(filePath);
    await file.save(JSON.stringify(data, null, 2), {
      contentType: 'application/json'
    });
    console.log(`   ✅ ${bucket}/${filePath}`);
    return true;
  } catch (error) {
    console.error(`   ❌ ${bucket}/${filePath}: ${error.message}`);
    return false;
  }
}

async function readFromGCS(bucket, filePath) {
  try {
    const file = storage.bucket(bucket).file(filePath);
    const [contents] = await file.download();
    return JSON.parse(contents.toString());
  } catch (error) {
    return null;
  }
}

// ============================================================================
// TEST DATA GENERATORS
// ============================================================================

const now = new Date();
const today = now.toISOString().split('T')[0];

// ---- PATIENTS ----
const PATIENTS = [
  {
    id: 'PAT-001',
    name: 'สมชาย ใจดี',
    email: 'somchai@example.com',
    phone: '+66-81-111-1111',
    dateOfBirth: '1985-03-15',
    gender: 'male',
    bloodType: 'O',
    nationalId: '1234567890123',
    address: '123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110'
  },
  {
    id: 'PAT-002',
    name: 'สมหญิง รักสุขภาพ',
    email: 'somying@example.com',
    phone: '+66-82-222-2222',
    dateOfBirth: '1990-07-22',
    gender: 'female',
    bloodType: 'A',
    nationalId: '2345678901234',
    address: '456 ถนนพระราม 4 แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110'
  },
  {
    id: 'PAT-003',
    name: 'วิชัย เข็มแข็ง',
    email: 'wichai@example.com',
    phone: '+66-83-333-3333',
    dateOfBirth: '1978-11-08',
    gender: 'male',
    bloodType: 'B',
    nationalId: '3456789012345',
    address: '789 ถนนสีลม แขวงสีลม เขตบางรัก กรุงเทพฯ 10500'
  },
  {
    id: 'PAT-004',
    name: 'นภา สวัสดิ์',
    email: 'napa@example.com',
    phone: '+66-84-444-4444',
    dateOfBirth: '1995-02-28',
    gender: 'female',
    bloodType: 'AB',
    nationalId: '4567890123456',
    address: '321 ถนนเพชรบุรี แขวงถนนพญาไท เขตราชเทวี กรุงเทพฯ 10400'
  }
];

// ---- DOCTORS ----
const DOCTORS = [
  {
    id: 'DOC-001',
    name: 'Dr. Sarah Chen',
    email: 'sarah.chen@izara.health',
    phone: '+66-91-001-0001',
    specialty: 'Internal Medicine',
    medicalLicense: 'TH-MD-2015-001',
    hospitalName: 'Izara Medical Center',
    experienceYears: 10,
    languages: ['English', 'Thai', 'Chinese'],
    rating: 4.8,
    totalReviews: 156,
    qualifications: 'MD, FACP - Board Certified Internal Medicine',
    isActive: true
  },
  {
    id: 'DOC-002',
    name: 'Dr. Michael Tanaka',
    email: 'michael.tanaka@izara.health',
    phone: '+66-91-002-0002',
    specialty: 'Gastroenterology',
    medicalLicense: 'TH-MD-2012-002',
    hospitalName: 'Izara Medical Center',
    experienceYears: 13,
    languages: ['English', 'Thai', 'Japanese'],
    rating: 4.9,
    totalReviews: 203,
    qualifications: 'MD, PhD - Gastroenterology & Hepatology',
    isActive: true
  },
  {
    id: 'DOC-003',
    name: 'Dr. Emily Wong',
    email: 'emily.wong@izara.health',
    phone: '+66-91-003-0003',
    specialty: 'Cardiology',
    medicalLicense: 'TH-MD-2010-003',
    hospitalName: 'Izara Heart Center',
    experienceYears: 15,
    languages: ['English', 'Thai'],
    rating: 4.7,
    totalReviews: 189,
    qualifications: 'MD, FACC - Interventional Cardiology',
    isActive: true
  }
];

// ---- ADMIN USER ----
const ADMIN_USER = {
  id: 'ADMIN-001',
  name: 'System Administrator',
  email: 'admin@izara.health',
  role: 'admin',
  isAdmin: true
};

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

async function seedUsersCredentials() {
  console.log('\n📦 Seeding izara-users-credentials bucket...');
  
  const users = [];
  
  // Create patient user accounts
  for (const patient of PATIENTS) {
    const userId = `USER-${patient.id}`;
    const user = {
      id: userId,
      email: patient.email,
      role: 'patient',
      patientId: patient.id,
      doctorId: null,
      passwordHash: hashPassword('IzaraPatient@2024'),
      isActive: true,
      emailVerified: true,
      createdAt: now.toISOString(),
      lastLogin: now.toISOString(),
      loginAttempts: 0,
      lockedUntil: null
    };
    
    users.push(user);
    await writeToGCS(BUCKETS.credentials, `users/${userId}.json`, user);
  }
  
  // Create doctor user accounts
  for (const doctor of DOCTORS) {
    const userId = `USER-${doctor.id}`;
    const user = {
      id: userId,
      email: doctor.email,
      role: 'doctor',
      patientId: null,
      doctorId: doctor.id,
      passwordHash: hashPassword('IzaraDoctor@2024'),
      isActive: true,
      emailVerified: true,
      createdAt: now.toISOString(),
      lastLogin: now.toISOString(),
      loginAttempts: 0,
      lockedUntil: null
    };
    
    users.push(user);
    await writeToGCS(BUCKETS.credentials, `users/${userId}.json`, user);
  }
  
  // Create admin user
  const adminUserId = `USER-${ADMIN_USER.id}`;
  const adminUser = {
    id: adminUserId,
    email: ADMIN_USER.email,
    role: 'admin',
    patientId: null,
    doctorId: null,
    isAdmin: true,
    passwordHash: hashPassword('IzaraAdmin@2024'),
    isActive: true,
    emailVerified: true,
    createdAt: now.toISOString(),
    lastLogin: now.toISOString(),
    loginAttempts: 0,
    lockedUntil: null
  };
  
  users.push(adminUser);
  await writeToGCS(BUCKETS.credentials, `users/${adminUserId}.json`, adminUser);
  
  // Write users index
  await writeToGCS(BUCKETS.credentials, 'users.json', users);
  
  console.log(`   ✅ Created ${users.length} user accounts`);
}

async function seedPatientsData() {
  console.log('\n📦 Seeding izara-patients-data bucket...');
  
  const patientsIndex = [];
  
  for (const patient of PATIENTS) {
    // Patient profile
    const patientProfile = {
      id: patient.id,
      name: patient.name,
      dateOfBirth: patient.dateOfBirth,
      age: new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear(),
      gender: patient.gender,
      bloodType: patient.bloodType,
      phone: patient.phone,
      email: patient.email,
      address: patient.address,
      emergencyContactName: 'Emergency Contact',
      emergencyContactPhone: '+66-80-000-0000',
      insuranceProvider: 'Thai Health Insurance',
      insuranceNumber: `INS-${patient.id}`,
      idNumber: patient.nationalId,
      photoUrl: `https://i.pravatar.cc/150?u=${patient.id}`,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
    
    await writeToGCS(BUCKETS.patients, `patients/${patient.id}/profile.json`, patientProfile);
    
    // PHR (Personal Health Record)
    const phr = {
      patientId: patient.id,
      dietDescription: 'Balanced diet, low sodium',
      exerciseFrequency: '3 times per week',
      sleepHours: 7,
      smokingStatus: 'never',
      alcoholConsumption: 'occasional',
      allergies: patient.id === 'PAT-001' ? ['Penicillin', 'Shellfish'] : [],
      chronicConditions: patient.id === 'PAT-003' ? ['Hypertension', 'Diabetes Type 2'] : [],
      currentMedications: patient.id === 'PAT-003' ? ['Metformin 500mg', 'Amlodipine 5mg'] : [],
      familyHistory: 'Heart disease (father), Diabetes (mother)',
      vaccinationsSummary: 'COVID-19 (3 doses), Influenza (annual)',
      notes: '',
      updatedAt: now.toISOString()
    };
    
    await writeToGCS(BUCKETS.patients, `patients/${patient.id}/phr.json`, phr);
    
    // Vital signs history
    const vitals = [];
    for (let i = 0; i < 5; i++) {
      const vitalDate = new Date(now);
      vitalDate.setDate(vitalDate.getDate() - i * 7);
      
      vitals.push({
        id: generateId('vital'),
        patientId: patient.id,
        recordedAt: vitalDate.toISOString(),
        systolic: 110 + Math.floor(Math.random() * 30),
        diastolic: 70 + Math.floor(Math.random() * 15),
        heartRate: 65 + Math.floor(Math.random() * 20),
        temperature: 36.5 + Math.random() * 0.5,
        oxygenSaturation: 96 + Math.floor(Math.random() * 4),
        bloodGlucose: 90 + Math.floor(Math.random() * 30),
        weight: 60 + Math.floor(Math.random() * 20),
        height: 165,
        bmi: 22 + Math.random() * 3,
        recordedBy: 'Self-reported'
      });
    }
    
    await writeToGCS(BUCKETS.patients, `patients/${patient.id}/vitals.json`, vitals);
    
    // Consent records
    const consents = [
      {
        id: generateId('consent'),
        patientId: patient.id,
        doctorId: 'DOC-001',
        doctorName: 'Dr. Sarah Chen',
        dataTypes: 'medical_records,vital_signs,prescriptions',
        status: 'granted',
        grantedAt: now.toISOString(),
        expiresAt: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString(),
        revokedAt: null,
        revokeReason: null,
        digitalSignature: 'patient_signature_hash',
        ipAddress: '127.0.0.1',
        createdAt: now.toISOString()
      }
    ];
    
    await writeToGCS(BUCKETS.patients, `patients/${patient.id}/consents.json`, consents);
    
    // Medical timeline
    const timeline = [
      {
        id: generateId('tl'),
        patientId: patient.id,
        eventDate: now.toISOString(),
        eventType: 'registration',
        title: 'Registered as Patient',
        description: 'Initial patient registration completed',
        doctorName: null,
        hospitalName: 'Izara Medical Center',
        documentUri: null,
        refType: null,
        refId: null
      }
    ];
    
    await writeToGCS(BUCKETS.patients, `patients/${patient.id}/timeline.json`, timeline);
    
    // Add to patients index
    patientsIndex.push({
      id: patient.id,
      name: patient.name,
      email: patient.email,
      phone: patient.phone,
      gender: patient.gender,
      age: patientProfile.age,
      bloodType: patient.bloodType,
      consentStatus: { hasConsent: true }
    });
  }
  
  // Write patients index
  await writeToGCS(BUCKETS.patients, 'patients.json', patientsIndex);
  
  // Initialize empty arrays for other patient data
  await writeToGCS(BUCKETS.patients, 'emrs.json', []);
  await writeToGCS(BUCKETS.patients, 'prescriptions.json', []);
  await writeToGCS(BUCKETS.patients, 'lab-orders.json', []);
  await writeToGCS(BUCKETS.patients, 'imaging-orders.json', []);
  
  console.log(`   ✅ Created ${PATIENTS.length} patient records`);
}

async function seedDoctorsData() {
  console.log('\n📦 Seeding izara-doctors-data bucket...');
  
  const doctorsIndex = [];
  
  for (const doctor of DOCTORS) {
    // Doctor profile
    const doctorProfile = {
      id: doctor.id,
      name: doctor.name,
      specialty: doctor.specialty,
      email: doctor.email,
      phone: doctor.phone,
      medicalLicense: doctor.medicalLicense,
      avatarUrl: `https://i.pravatar.cc/150?u=${doctor.id}`,
      rating: doctor.rating,
      totalReviews: doctor.totalReviews,
      experienceYears: doctor.experienceYears,
      qualifications: doctor.qualifications,
      languages: doctor.languages.join(', '),
      hospitalName: doctor.hospitalName,
      isActive: doctor.isActive,
      approvalStatus: 'approved',
      createdAt: now.toISOString()
    };
    
    await writeToGCS(BUCKETS.doctors, `doctors/${doctor.id}/profile.json`, doctorProfile);
    
    // Doctor availability
    const availability = [];
    for (let day = 1; day <= 5; day++) { // Mon-Fri
      availability.push({
        id: generateId('avail'),
        doctorId: doctor.id,
        weekday: day,
        startTime: '09:00',
        endTime: '17:00',
        slotDurationMin: 30,
        isActive: true
      });
    }
    
    await writeToGCS(BUCKETS.doctors, `doctors/${doctor.id}/availability.json`, availability);
    
    // Doctor schedule for next 7 days
    const schedule = [];
    for (let i = 0; i < 7; i++) {
      const scheduleDate = new Date(now);
      scheduleDate.setDate(scheduleDate.getDate() + i);
      const dateStr = scheduleDate.toISOString().split('T')[0];
      
      // Skip weekends
      if (scheduleDate.getDay() === 0 || scheduleDate.getDay() === 6) continue;
      
      // Generate time slots
      for (let hour = 9; hour < 17; hour++) {
        for (let min = 0; min < 60; min += 30) {
          const startTime = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
          const endHour = min === 30 ? hour + 1 : hour;
          const endMin = min === 30 ? 0 : 30;
          const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
          
          schedule.push({
            id: generateId('slot'),
            doctorId: doctor.id,
            date: dateStr,
            slotStart: `${dateStr}T${startTime}:00`,
            slotEnd: `${dateStr}T${endTime}:00`,
            isAvailable: Math.random() > 0.3, // 70% available
            isBooked: false,
            appointmentId: null
          });
        }
      }
    }
    
    await writeToGCS(BUCKETS.doctors, `doctors/${doctor.id}/schedule.json`, schedule);
    
    // Doctor stats
    const stats = {
      doctorId: doctor.id,
      patientsSeenToday: 0,
      patientsSeenWeek: Math.floor(Math.random() * 50),
      patientsSeenMonth: Math.floor(Math.random() * 200),
      avgConsultationTimeMin: 25,
      pendingPrescriptions: 0,
      unreadMessages: 0,
      updatedAt: now.toISOString()
    };
    
    await writeToGCS(BUCKETS.doctors, `doctors/${doctor.id}/stats.json`, stats);
    
    // Add to doctors index
    doctorsIndex.push({
      id: doctor.id,
      name: doctor.name,
      specialty: doctor.specialty,
      email: doctor.email,
      phone: doctor.phone,
      rating: doctor.rating,
      totalReviews: doctor.totalReviews,
      experienceYears: doctor.experienceYears,
      hospitalName: doctor.hospitalName,
      isActive: doctor.isActive,
      avatarUrl: doctorProfile.avatarUrl,
      approvalStatus: 'approved'
    });
  }
  
  // Write doctors index
  await writeToGCS(BUCKETS.doctors, 'doctors.json', doctorsIndex);
  
  // Initialize empty queue
  await writeToGCS(BUCKETS.doctors, 'queue/queue.json', []);
  
  console.log(`   ✅ Created ${DOCTORS.length} doctor records`);
}

async function seedAppointments() {
  console.log('\n📦 Seeding izara-appointments bucket...');
  
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  
  const appointments = [
    // Today's confirmed appointments
    {
      id: generateId('apt'),
      patientId: 'PAT-001',
      patientName: 'สมชาย ใจดี',
      doctorId: 'DOC-001',
      doctorName: 'Dr. Sarah Chen',
      doctorPhoto: 'https://i.pravatar.cc/150?u=DOC-001',
      appointmentDate: today,
      appointmentTime: '09:30',
      appointmentType: 'video',
      status: 'confirmed',
      reason: 'ไข้ ปวดหัว 3 วัน',
      notes: null,
      meetLink: null,
      calendarEventId: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      confirmedAt: now.toISOString(),
      completedAt: null,
      cancelledAt: null,
      cancellationReason: null
    },
    {
      id: generateId('apt'),
      patientId: 'PAT-002',
      patientName: 'สมหญิง รักสุขภาพ',
      doctorId: 'DOC-002',
      doctorName: 'Dr. Michael Tanaka',
      doctorPhoto: 'https://i.pravatar.cc/150?u=DOC-002',
      appointmentDate: today,
      appointmentTime: '10:00',
      appointmentType: 'video',
      status: 'confirmed',
      reason: 'ปวดท้อง กรดไหลย้อน',
      notes: null,
      meetLink: null,
      calendarEventId: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      confirmedAt: now.toISOString(),
      completedAt: null,
      cancelledAt: null,
      cancellationReason: null
    },
    // Tomorrow's pending appointment
    {
      id: generateId('apt'),
      patientId: 'PAT-003',
      patientName: 'วิชัย เข็มแข็ง',
      doctorId: 'DOC-003',
      doctorName: 'Dr. Emily Wong',
      doctorPhoto: 'https://i.pravatar.cc/150?u=DOC-003',
      appointmentDate: tomorrow.toISOString().split('T')[0],
      appointmentTime: '14:00',
      appointmentType: 'video',
      status: 'pending',
      reason: 'เจ็บหน้าอก หายใจลำบาก',
      notes: 'Urgent - chest pain',
      meetLink: null,
      calendarEventId: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      confirmedAt: null,
      completedAt: null,
      cancelledAt: null,
      cancellationReason: null
    }
  ];
  
  // Write appointments index
  await writeToGCS(BUCKETS.appointments, 'appointments.json', appointments);
  
  // Write individual appointment details
  for (const apt of appointments) {
    await writeToGCS(BUCKETS.appointments, `appointments/${apt.id}/details.json`, apt);
  }
  
  // Initialize appointment pool
  const poolItems = [
    {
      id: generateId('pool'),
      appointmentId: null,
      patientId: 'PAT-004',
      patientName: 'นภา สวัสดิ์',
      patientEmail: 'napa@example.com',
      originalDoctorId: null,
      originalDoctorName: null,
      requiredSpecialty: 'Internal Medicine',
      matchedSpecialties: ['Internal Medicine', 'General Practitioner'],
      symptoms: ['ไข้', 'ปวดหัว', 'อ่อนเพลีย'],
      symptomDescription: 'ไข้สูง 39 องศา ปวดหัวมาก 2 วัน',
      urgency: 'urgent',
      preferredDates: [tomorrow.toISOString().split('T')[0], nextWeek.toISOString().split('T')[0]],
      preferredTimeSlot: 'morning',
      appointmentType: 'telehealth',
      poolReason: 'no_doctor_selected',
      poolStatus: 'pending',
      adminApprovalRequired: false,
      missedCount: 0,
      maxMissedAttempts: 3,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    }
  ];
  
  await writeToGCS(BUCKETS.appointments, 'appointment-pool/pool.json', poolItems);
  
  for (const item of poolItems) {
    await writeToGCS(BUCKETS.appointments, `appointment-pool/items/${item.id}.json`, item);
  }
  
  console.log(`   ✅ Created ${appointments.length} appointments and ${poolItems.length} pool items`);
}

async function seedMetadata() {
  console.log('\n📦 Seeding izara-meta-data bucket...');
  
  // Medications reference
  const medications = [
    { id: 'MED-001', name: 'Paracetamol', genericName: 'Acetaminophen', category: 'Analgesic', strengthOptions: '500mg, 650mg', routeOptions: 'Oral', isActive: true },
    { id: 'MED-002', name: 'Amoxicillin', genericName: 'Amoxicillin', category: 'Antibiotic', strengthOptions: '250mg, 500mg', routeOptions: 'Oral', isActive: true },
    { id: 'MED-003', name: 'Omeprazole', genericName: 'Omeprazole', category: 'PPI', strengthOptions: '20mg, 40mg', routeOptions: 'Oral', isActive: true },
    { id: 'MED-004', name: 'Metformin', genericName: 'Metformin HCl', category: 'Antidiabetic', strengthOptions: '500mg, 850mg, 1000mg', routeOptions: 'Oral', isActive: true },
    { id: 'MED-005', name: 'Amlodipine', genericName: 'Amlodipine Besylate', category: 'Antihypertensive', strengthOptions: '5mg, 10mg', routeOptions: 'Oral', isActive: true },
    { id: 'MED-006', name: 'Atorvastatin', genericName: 'Atorvastatin Calcium', category: 'Statin', strengthOptions: '10mg, 20mg, 40mg', routeOptions: 'Oral', isActive: true },
    { id: 'MED-007', name: 'Losartan', genericName: 'Losartan Potassium', category: 'ARB', strengthOptions: '25mg, 50mg, 100mg', routeOptions: 'Oral', isActive: true },
    { id: 'MED-008', name: 'Cetirizine', genericName: 'Cetirizine HCl', category: 'Antihistamine', strengthOptions: '10mg', routeOptions: 'Oral', isActive: true },
    { id: 'MED-009', name: 'Ibuprofen', genericName: 'Ibuprofen', category: 'NSAID', strengthOptions: '200mg, 400mg', routeOptions: 'Oral', isActive: true },
    { id: 'MED-010', name: 'Salbutamol', genericName: 'Albuterol', category: 'Bronchodilator', strengthOptions: '100mcg/puff', routeOptions: 'Inhaled', isActive: true }
  ];
  
  await writeToGCS(BUCKETS.metadata, 'medications.json', medications);
  
  // ICD-10 codes
  const icd10Codes = [
    { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified', category: 'Respiratory', isActive: true },
    { code: 'K21.0', description: 'Gastro-esophageal reflux disease with esophagitis', category: 'Digestive', isActive: true },
    { code: 'I10', description: 'Essential (primary) hypertension', category: 'Circulatory', isActive: true },
    { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', category: 'Endocrine', isActive: true },
    { code: 'R51', description: 'Headache', category: 'Symptoms', isActive: true },
    { code: 'R50.9', description: 'Fever, unspecified', category: 'Symptoms', isActive: true },
    { code: 'M54.5', description: 'Low back pain', category: 'Musculoskeletal', isActive: true },
    { code: 'J45.9', description: 'Asthma, unspecified', category: 'Respiratory', isActive: true },
    { code: 'K29.7', description: 'Gastritis, unspecified', category: 'Digestive', isActive: true },
    { code: 'F41.1', description: 'Generalized anxiety disorder', category: 'Mental', isActive: true }
  ];
  
  await writeToGCS(BUCKETS.metadata, 'icd10-codes.json', icd10Codes);
  
  // Lab tests reference
  const labTests = [
    { code: 'CBC', name: 'Complete Blood Count', category: 'Hematology', normalRange: 'Various', unit: 'Various' },
    { code: 'BMP', name: 'Basic Metabolic Panel', category: 'Chemistry', normalRange: 'Various', unit: 'Various' },
    { code: 'HBA1C', name: 'Hemoglobin A1c', category: 'Diabetes', normalRange: '<5.7%', unit: '%' },
    { code: 'LIPID', name: 'Lipid Panel', category: 'Cardiovascular', normalRange: 'Various', unit: 'mg/dL' },
    { code: 'TSH', name: 'Thyroid Stimulating Hormone', category: 'Thyroid', normalRange: '0.4-4.0', unit: 'mIU/L' },
    { code: 'UA', name: 'Urinalysis', category: 'Urology', normalRange: 'Various', unit: 'Various' },
    { code: 'LFT', name: 'Liver Function Tests', category: 'Hepatology', normalRange: 'Various', unit: 'Various' },
    { code: 'CRP', name: 'C-Reactive Protein', category: 'Inflammation', normalRange: '<10', unit: 'mg/L' },
    { code: 'FBS', name: 'Fasting Blood Sugar', category: 'Diabetes', normalRange: '70-100', unit: 'mg/dL' },
    { code: 'CREAT', name: 'Creatinine', category: 'Renal', normalRange: '0.7-1.3', unit: 'mg/dL' }
  ];
  
  await writeToGCS(BUCKETS.metadata, 'lab-tests.json', labTests);
  
  // Drug interactions
  const drugInteractions = [
    { drug1: 'Warfarin', drug2: 'Aspirin', severity: 'high', description: 'Increased bleeding risk' },
    { drug1: 'Metformin', drug2: 'Contrast Media', severity: 'high', description: 'Risk of lactic acidosis' },
    { drug1: 'ACE Inhibitors', drug2: 'Potassium', severity: 'moderate', description: 'Risk of hyperkalemia' },
    { drug1: 'Simvastatin', drug2: 'Grapefruit', severity: 'moderate', description: 'Increased statin levels' },
    { drug1: 'SSRI', drug2: 'MAOIs', severity: 'high', description: 'Serotonin syndrome risk' }
  ];
  
  await writeToGCS(BUCKETS.metadata, 'drug-interactions.json', drugInteractions);
  
  // Reference ranges
  const referenceRanges = [
    { test: 'Blood Pressure', metric: 'systolic', normalLow: 90, normalHigh: 120, unit: 'mmHg' },
    { test: 'Blood Pressure', metric: 'diastolic', normalLow: 60, normalHigh: 80, unit: 'mmHg' },
    { test: 'Heart Rate', metric: 'bpm', normalLow: 60, normalHigh: 100, unit: 'bpm' },
    { test: 'Temperature', metric: 'celsius', normalLow: 36.1, normalHigh: 37.2, unit: '°C' },
    { test: 'Oxygen Saturation', metric: 'spo2', normalLow: 95, normalHigh: 100, unit: '%' },
    { test: 'Blood Glucose', metric: 'fasting', normalLow: 70, normalHigh: 100, unit: 'mg/dL' },
    { test: 'BMI', metric: 'adult', normalLow: 18.5, normalHigh: 24.9, unit: 'kg/m²' }
  ];
  
  await writeToGCS(BUCKETS.metadata, 'reference-ranges.json', referenceRanges);
  
  console.log('   ✅ Created metadata reference data');
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function verifyBuckets() {
  console.log('\n🔍 Verifying GCS bucket access...\n');
  
  const results = [];
  
  for (const [name, bucket] of Object.entries(BUCKETS)) {
    try {
      const [exists] = await storage.bucket(bucket).exists();
      if (exists) {
        console.log(`   ✅ ${name.padEnd(15)} → ${bucket}`);
        results.push(true);
      } else {
        console.log(`   ❌ ${name.padEnd(15)} → ${bucket} (not found)`);
        results.push(false);
      }
    } catch (error) {
      console.log(`   ❌ ${name.padEnd(15)} → ${bucket} (${error.message})`);
      results.push(false);
    }
  }
  
  return results.every(r => r);
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🏥 IZARA TELEMEDICINE - COMPREHENSIVE DATA SEEDER');
  console.log('═══════════════════════════════════════════════════════════════');
  
  // Verify buckets
  const bucketsOk = await verifyBuckets();
  
  if (!bucketsOk) {
    console.error('\n❌ Cannot access all required buckets. Please check GCS configuration.');
    process.exit(1);
  }
  
  // Seed all data
  try {
    await seedUsersCredentials();
    await seedPatientsData();
    await seedDoctorsData();
    await seedAppointments();
    await seedMetadata();
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🎉 DATA SEEDING COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log('📋 TEST CREDENTIALS:');
    console.log('───────────────────────────────────────────────────────────────');
    console.log('Patient Portal (http://localhost:3005):');
    console.log('  • Email: somchai@example.com');
    console.log('  • Password: IzaraPatient@2024');
    console.log('');
    console.log('Doctor Portal (http://localhost:3010):');
    console.log('  • Doctor: sarah.chen@izara.health / IzaraDoctor@2024');
    console.log('  • Admin: admin@izara.health / IzaraAdmin@2024');
    console.log('───────────────────────────────────────────────────────────────\n');
    
  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

main();
