/**
 * Enhanced Interconnected Mock Data Generation Script
 * 
 * Creates comprehensive mock data with full cross-portal connectivity:
 * - All users (admin, doctors, patients) in both portal formats
 * - Appointments linking doctors and patients
 * - Complete clinical chains (EMR → Prescription → Lab → Imaging)
 * - PDPA consents with proper doctor-patient relationships
 * - Queue data for real-time consultations
 * - Video consultation history
 * 
 * Run: node scripts/generateInterconnectedMockData.cjs
 * Requires: GCS API Server running on port 3012
 */

const crypto = require('crypto');
const http = require('http');

// ============================================================================
// CONFIGURATION
// ============================================================================

const GCS_API_URL = process.env.GCS_API_URL || 'http://localhost:3012';

const BUCKETS = {
  credentials: 'izara-users-credentials',
  doctor: 'izara-doctors-data',
  patient: 'izara-patients-data',
  appointments: 'izara-appointments',
  metadata: 'izara-meta-data'
};

// ============================================================================
// COMPLETE MOCK USER DATA
// ============================================================================

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
    role: 'doctor',
    isAdmin: false,
    isActive: false,
    isApproved: false,
    approvalStatus: 'pending',
    hospital: 'Izara Medical Center',
    department: 'Gastroenterology',
    consultationFee: 800
  },
  {
    id: 'DOC-003',
    email: 'cardio.doctor@izara.com',
    password: 'IzaraDoctor@2024',
    name: 'Dr. Prasit Heartwell',
    nameTh: 'นพ. ประสิทธิ์ หัวใจดี',
    medicalLicenseNumber: 'MD-11111',
    specialty: 'Cardiologist',
    specialtyTh: 'แพทย์หัวใจ',
    phone: '+66812345681',
    role: 'doctor',
    isAdmin: false,
    isActive: true,
    isApproved: true,
    approvalStatus: 'approved',
    hospital: 'Izara Medical Center',
    department: 'Cardiology',
    consultationFee: 1000,
    availableDays: ['monday', 'wednesday', 'friday'],
    workingHours: { start: '10:00', end: '16:00' }
  },
  {
    id: 'DOC-004',
    email: 'pediatric.doctor@izara.com',
    password: 'IzaraDoctor@2024',
    name: 'Dr. Naree Childcare',
    nameTh: 'พญ. นารี ดูแลเด็ก',
    medicalLicenseNumber: 'MD-22222',
    specialty: 'Pediatrician',
    specialtyTh: 'แพทย์เด็ก',
    phone: '+66812345682',
    role: 'doctor',
    isAdmin: false,
    isActive: true,
    isApproved: true,
    approvalStatus: 'approved',
    hospital: 'Izara Medical Center',
    department: 'Pediatrics',
    consultationFee: 600,
    availableDays: ['tuesday', 'thursday', 'saturday'],
    workingHours: { start: '08:00', end: '14:00' }
  }
];

const ADMIN = {
  id: 'ADMIN-001',
  email: 'admin.test@izara.com',
  password: 'IzaraAdmin@2024',
  name: 'Dr. Admin Manager',
  nameTh: 'นพ. แอดมิน ผู้จัดการ',
  medicalLicenseNumber: 'MD-ADMIN-001',
  specialty: 'Healthcare Administration',
  specialtyTh: 'บริหารสาธารณสุข',
  phone: '+66812345678',
  role: 'admin',
  isAdmin: true,
  isActive: true,
  isApproved: true,
  approvalStatus: 'approved'
};

const PATIENTS = [
  {
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
    emergencyContact: { name: 'Somying Patientone', phone: '+66811111111', relation: 'Spouse' },
    assignedDoctorId: 'DOC-001'
  },
  {
    id: 'PATIENT-002',
    odVisitId: 'OD-002',
    email: 'patient2@test.com',
    password: 'P@ssw0rd',
    name: 'Wanphen Patienttwo',
    nameTh: 'วันเพ็ญ ผู้ป่วยสอง',
    phone: '+66899999998',
    role: 'patient',
    dateOfBirth: '1985-08-22',
    gender: 'female',
    idNumber: '1234567890124',
    bloodType: 'A+',
    height: 160,
    weight: 55,
    allergies: ['Sulfa drugs'],
    chronicConditions: ['Asthma'],
    currentMedications: ['Ventolin inhaler PRN'],
    emergencyContact: { name: 'Somsak Patienttwo', phone: '+66822222222', relation: 'Husband' },
    assignedDoctorId: 'DOC-001'
  },
  {
    id: 'PATIENT-003',
    odVisitId: 'OD-003',
    email: 'patient3@test.com',
    password: 'P@ssw0rd',
    name: 'Pichai Patientthree',
    nameTh: 'พิชัย ผู้ป่วยสาม',
    phone: '+66899999997',
    role: 'patient',
    dateOfBirth: '1978-12-10',
    gender: 'male',
    idNumber: '1234567890125',
    bloodType: 'B+',
    height: 168,
    weight: 80,
    allergies: [],
    chronicConditions: ['Coronary Artery Disease', 'Hyperlipidemia'],
    currentMedications: ['Aspirin 81mg', 'Atorvastatin 20mg', 'Metoprolol 50mg'],
    emergencyContact: { name: 'Pimpa Patientthree', phone: '+66833333333', relation: 'Wife' },
    assignedDoctorId: 'DOC-003'
  },
  {
    id: 'PATIENT-004',
    odVisitId: 'OD-004',
    email: 'childpatient@test.com',
    password: 'P@ssw0rd',
    name: 'Nong Childpatient',
    nameTh: 'น้อง เด็กป่วย',
    phone: '+66899999996',
    role: 'patient',
    dateOfBirth: '2018-03-25',
    gender: 'female',
    idNumber: '1234567890126',
    bloodType: 'AB+',
    height: 110,
    weight: 20,
    allergies: ['Eggs'],
    chronicConditions: [],
    currentMedications: [],
    emergencyContact: { name: 'Mae Childparent', phone: '+66844444444', relation: 'Mother' },
    assignedDoctorId: 'DOC-004'
  },
  {
    id: 'PATIENT-005',
    odVisitId: 'OD-005',
    email: 'gi.patient@test.com',
    password: 'P@ssw0rd',
    name: 'Somkid GIpatient',
    nameTh: 'สมคิด ทางเดินอาหาร',
    phone: '+66899999995',
    role: 'patient',
    dateOfBirth: '1995-07-18',
    gender: 'male',
    idNumber: '1234567890127',
    bloodType: 'O-',
    height: 172,
    weight: 65,
    allergies: ['Shellfish'],
    chronicConditions: ['GERD', 'IBS'],
    currentMedications: ['Omeprazole 20mg'],
    emergencyContact: { name: 'Somjai GIpatient', phone: '+66855555555', relation: 'Brother' },
    assignedDoctorId: 'DOC-001' // Assigned to GP since gastro doc is pending
  }
];

const EDGE_USERS = {
  inactiveDoctor: {
    id: 'DOC-INACTIVE-001',
    email: 'inactive.doctor@izara.com',
    password: 'InactiveDoc@2024',
    name: 'Dr. Inactive Practitioner',
    medicalLicenseNumber: 'MD-INACTIVE-001',
    specialty: 'Internal Medicine',
    role: 'doctor',
    isAdmin: false,
    isActive: false,
    isApproved: true,
    approvalStatus: 'approved',
    deactivatedAt: new Date().toISOString(),
    deactivationReason: 'License expired'
  },
  lockedUser: {
    id: 'DOC-LOCKED-001',
    email: 'locked.doctor@izara.com',
    password: 'LockedDoc@2024',
    name: 'Dr. Locked Account',
    medicalLicenseNumber: 'MD-LOCKED-001',
    specialty: 'Pediatrics',
    role: 'doctor',
    isAdmin: false,
    isActive: true,
    isApproved: true,
    approvalStatus: 'approved',
    loginAttempts: 5,
    lockedUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString()
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function hashPassword(password) {
  try {
    const bcrypt = require('bcryptjs');
    return bcrypt.hashSync(password, 10);
  } catch (e) {
    return crypto.createHash('sha256').update(password + 'izara_salt_2024').digest('hex');
  }
}

// Patient portal uses base64 encoding for passwords
function hashPatientPassword(password) {
  return Buffer.from(password).toString('base64');
}

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getDateString(daysOffset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
}

function getDateTimeString(daysOffset = 0, hour = 9) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

// Delay helper to avoid rate limiting
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function writeToGCS(bucket, path, data, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await new Promise((resolve, reject) => {
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
      await delay(100); // Small delay between successful writes
      return result;
    } catch (error) {
      if (attempt < retries - 1 && error.message.includes('429')) {
        console.log(`   ⏳ Rate limited, waiting... (attempt ${attempt + 1}/${retries})`);
        await delay(2000 * (attempt + 1)); // Exponential backoff
      } else {
        throw error;
      }
    }
  }
}

async function readFromGCS(bucket, path) {
  return new Promise((resolve, reject) => {
    const url = `http://localhost:3012/api/storage/read?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`;
    
    http.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(body));
        } else {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

// ============================================================================
// DATA GENERATION FUNCTIONS
// ============================================================================

async function createDoctorCredentials(doctor) {
  const now = new Date().toISOString();
  
  // Create credential record (for doctor portal auth)
  const credential = {
    id: doctor.id,
    email: doctor.email,
    passwordHash: hashPassword(doctor.password),
    role: doctor.role,
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
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${doctor.email}`,
    preferences: { theme: 'light', language: 'th', notifications: { email: true, sms: true, push: true } },
    createdAt: now,
    updatedAt: now,
    isAdmin: doctor.isAdmin || false,
    ...(doctor.deactivatedAt && { deactivatedAt: doctor.deactivatedAt }),
    ...(doctor.deactivationReason && { deactivationReason: doctor.deactivationReason }),
    ...(doctor.loginAttempts && { loginAttempts: doctor.loginAttempts }),
    ...(doctor.lockedUntil && { lockedUntil: doctor.lockedUntil })
  };
  
  await writeToGCS(BUCKETS.credentials, `users/${doctor.id}.json`, credential);
  
  // Create doctor profile in doctors bucket
  const doctorProfile = {
    id: doctor.id,
    email: doctor.email,
    name: doctor.name,
    nameTh: doctor.nameTh,
    medicalLicenseNumber: doctor.medicalLicenseNumber,
    specialty: doctor.specialty,
    specialtyTh: doctor.specialtyTh,
    phone: doctor.phone,
    hospital: doctor.hospital || 'Izara Medical Center',
    department: doctor.department || 'General',
    bio: `Experienced ${doctor.specialty} with dedication to patient care.`,
    education: ['MD - Chulalongkorn University', 'Residency - Siriraj Hospital'],
    certifications: ['Thai Medical Council License', 'Board Certified'],
    consultationFee: doctor.consultationFee || 500,
    availableDays: doctor.availableDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    workingHours: doctor.workingHours || { start: '09:00', end: '17:00' },
    rating: 4.5 + Math.random() * 0.5,
    reviewCount: Math.floor(Math.random() * 100) + 10,
    isActive: doctor.isActive,
    isApproved: doctor.isApproved,
    approvalStatus: doctor.approvalStatus,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${doctor.email}`,
    createdAt: now,
    updatedAt: now
  };
  
  await writeToGCS(BUCKETS.doctor, `doctors/${doctor.id}/profile.json`, doctorProfile);
  
  return { credential, doctorProfile };
}

async function createPatientCredentials(patient) {
  const now = new Date().toISOString();
  const userId = `user_${patient.id}`;
  
  // Create credential record for both portals
  // Patient portal uses base64 encoding for passwords
  const credential = {
    id: userId,
    patientId: patient.id,
    odVisitId: patient.odVisitId,
    email: patient.email,
    passwordHash: hashPatientPassword(patient.password),
    role: 'patient',
    isActive: true,
    emailVerified: true,
    profile: {
      id: userId,
      patientId: patient.id,
      name: patient.name,
      nameTh: patient.nameTh,
      email: patient.email,
      phone: patient.phone,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${patient.email}`
    },
    createdAt: now,
    updatedAt: now
  };
  
  await writeToGCS(BUCKETS.credentials, `users/${userId}.json`, credential);
  
  // Create patient PHR data
  const phrData = {
    patientId: patient.id,
    odVisitId: patient.odVisitId,
    userId: userId,
    personalInfo: {
      name: patient.name,
      nameTh: patient.nameTh,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      phone: patient.phone,
      email: patient.email,
      nationalId: patient.idNumber,
      bloodType: patient.bloodType,
      address: '123 Test Street, Bangkok 10100'
    },
    physicalInfo: {
      height: patient.height,
      weight: patient.weight,
      bmi: patient.weight / Math.pow(patient.height / 100, 2)
    },
    medicalInfo: {
      allergies: patient.allergies,
      chronicConditions: patient.chronicConditions,
      currentMedications: patient.currentMedications,
      bloodType: patient.bloodType
    },
    emergencyContact: patient.emergencyContact,
    assignedDoctorId: patient.assignedDoctorId,
    createdAt: now,
    updatedAt: now
  };
  
  await writeToGCS(BUCKETS.patient, `patients/${patient.id}/profile.json`, phrData);
  
  // Also save in patient portal format
  await writeToGCS(BUCKETS.patient, `patients/${patient.id}/phr.json`, phrData);
  
  return { credential, phrData };
}

async function createAppointment(patient, doctor, daysOffset, timeSlot, status) {
  const appointmentId = `APT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const now = new Date().toISOString();
  const appointmentDate = getDateString(daysOffset);
  const appointmentDateTime = getDateTimeString(daysOffset, timeSlot);
  
  const appointment = {
    id: appointmentId,
    patientId: patient.id,
    patientName: patient.name,
    patientPhone: patient.phone,
    patientEmail: patient.email,
    doctorId: doctor.id,
    doctorName: doctor.name,
    doctorSpecialty: doctor.specialty,
    date: appointmentDate,
    time: `${String(timeSlot).padStart(2, '0')}:00`,
    dateTime: appointmentDateTime,
    duration: 30,
    type: ['checkup', 'follow-up', 'consultation', 'telemedicine'][Math.floor(Math.random() * 4)],
    status: status,
    reason: ['Annual checkup', 'Follow-up visit', 'New symptoms', 'Medication review'][Math.floor(Math.random() * 4)],
    notes: status === 'completed' ? 'Patient visit completed successfully.' : '',
    consultationFee: doctor.consultationFee || 500,
    isPaid: status === 'completed',
    createdAt: now,
    updatedAt: now,
    // Cross-reference IDs
    odVisitId: patient.odVisitId,
    meetingUrl: status === 'scheduled' ? `https://meet.google.com/izara-${appointmentId.slice(-8)}` : null
  };
  
  // Save in appointments bucket
  await writeToGCS(BUCKETS.appointments, `appointments/${appointmentId}.json`, appointment);
  
  // Save reference in patient data
  const patientAppointments = await readFromGCS(BUCKETS.patient, `patients/${patient.id}/appointments.json`) || [];
  patientAppointments.push(appointment);
  await writeToGCS(BUCKETS.patient, `patients/${patient.id}/appointments.json`, patientAppointments);
  
  // Save reference in doctor data
  const doctorAppointments = await readFromGCS(BUCKETS.doctor, `doctors/${doctor.id}/appointments.json`) || [];
  doctorAppointments.push(appointment);
  await writeToGCS(BUCKETS.doctor, `doctors/${doctor.id}/appointments.json`, doctorAppointments);
  
  return appointment;
}

async function createEMR(patient, doctor, appointment) {
  const emrId = `EMR-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const now = new Date().toISOString();
  
  const vitalSigns = {
    bloodPressure: { systolic: 110 + Math.floor(Math.random() * 30), diastolic: 70 + Math.floor(Math.random() * 20) },
    heartRate: 60 + Math.floor(Math.random() * 30),
    temperature: 36.5 + Math.random() * 1.5,
    respiratoryRate: 12 + Math.floor(Math.random() * 8),
    oxygenSaturation: 95 + Math.floor(Math.random() * 5),
    weight: patient.weight,
    height: patient.height
  };
  
  const emr = {
    id: emrId,
    patientId: patient.id,
    patientName: patient.name,
    doctorId: doctor.id,
    doctorName: doctor.name,
    appointmentId: appointment?.id || null,
    odVisitId: patient.odVisitId,
    visitDate: now,
    visitType: 'outpatient',
    chiefComplaint: 'Routine health examination and medication review',
    historyOfPresentIllness: 'Patient presents for regular follow-up. Reports good adherence to current medications.',
    vitalSigns: vitalSigns,
    physicalExamination: {
      general: 'Alert and oriented, appears well',
      cardiovascular: 'Regular rate and rhythm, no murmurs',
      respiratory: 'Clear to auscultation bilaterally',
      abdominal: 'Soft, non-tender, no organomegaly',
      neurological: 'Cranial nerves intact, normal strength'
    },
    assessment: patient.chronicConditions.length > 0 
      ? patient.chronicConditions.map((c, i) => ({ 
          diagnosis: c, 
          icdCode: ['I10', 'E11.9', 'J45.909', 'K21.0'][i] || 'R69',
          status: 'stable' 
        }))
      : [{ diagnosis: 'Healthy adult', icdCode: 'Z00.00', status: 'stable' }],
    plan: {
      medications: 'Continue current medications',
      followUp: 'Return in 3 months',
      referrals: [],
      patientEducation: 'Discussed diet, exercise, and medication compliance'
    },
    allergies: patient.allergies,
    currentMedications: patient.currentMedications,
    status: 'completed',
    signedBy: doctor.name,
    signedAt: now,
    createdAt: now,
    updatedAt: now
  };
  
  // Save in doctor's EMR records
  await writeToGCS(BUCKETS.doctor, `doctors/${doctor.id}/emr/${emrId}.json`, emr);
  
  // Save reference in patient data
  const patientEMRs = await readFromGCS(BUCKETS.patient, `patients/${patient.id}/emr-records.json`) || [];
  patientEMRs.push(emr);
  await writeToGCS(BUCKETS.patient, `patients/${patient.id}/emr-records.json`, patientEMRs);
  
  return emr;
}

async function createPrescription(patient, doctor, emr) {
  const rxId = `RX-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const now = new Date().toISOString();
  
  const medications = [
    { name: 'Metformin', dosage: '500mg', frequency: 'twice daily', duration: '90 days', quantity: 180, instructions: 'Take with meals' },
    { name: 'Lisinopril', dosage: '10mg', frequency: 'once daily', duration: '90 days', quantity: 90, instructions: 'Take in the morning' },
    { name: 'Aspirin', dosage: '81mg', frequency: 'once daily', duration: '90 days', quantity: 90, instructions: 'Take with food' },
    { name: 'Omeprazole', dosage: '20mg', frequency: 'once daily', duration: '30 days', quantity: 30, instructions: 'Take before breakfast' },
    { name: 'Atorvastatin', dosage: '20mg', frequency: 'once daily', duration: '90 days', quantity: 90, instructions: 'Take at bedtime' }
  ];
  
  // Select 1-3 medications based on patient's conditions
  const selectedMeds = medications.slice(0, Math.min(3, Math.max(1, patient.chronicConditions.length)));
  
  const prescription = {
    id: rxId,
    patientId: patient.id,
    patientName: patient.name,
    doctorId: doctor.id,
    doctorName: doctor.name,
    doctorLicense: doctor.medicalLicenseNumber,
    emrId: emr?.id || null,
    odVisitId: patient.odVisitId,
    prescriptionDate: now,
    medications: selectedMeds,
    diagnosis: emr?.assessment?.[0]?.diagnosis || 'General health maintenance',
    notes: 'Please follow up if any adverse reactions occur.',
    status: 'active',
    dispensedAt: null,
    dispensedBy: null,
    createdAt: now,
    updatedAt: now
  };
  
  // Save in doctor's prescriptions
  await writeToGCS(BUCKETS.doctor, `doctors/${doctor.id}/prescriptions/${rxId}.json`, prescription);
  
  // Save reference in patient data
  const patientRx = await readFromGCS(BUCKETS.patient, `patients/${patient.id}/prescriptions.json`) || [];
  patientRx.push(prescription);
  await writeToGCS(BUCKETS.patient, `patients/${patient.id}/prescriptions.json`, patientRx);
  
  return prescription;
}

async function createLabOrder(patient, doctor, emr) {
  const labId = `LAB-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const now = new Date().toISOString();
  
  const labTests = [
    { code: 'CBC', name: 'Complete Blood Count', category: 'Hematology' },
    { code: 'BMP', name: 'Basic Metabolic Panel', category: 'Chemistry' },
    { code: 'LFT', name: 'Liver Function Test', category: 'Chemistry' },
    { code: 'TSH', name: 'Thyroid Stimulating Hormone', category: 'Endocrine' },
    { code: 'HbA1c', name: 'Hemoglobin A1c', category: 'Diabetes' },
    { code: 'Lipid', name: 'Lipid Panel', category: 'Cardiovascular' },
    { code: 'UA', name: 'Urinalysis', category: 'Urinary' }
  ];
  
  // Select 2-4 tests based on conditions
  const numTests = Math.min(4, Math.max(2, patient.chronicConditions.length + 1));
  const selectedTests = labTests.slice(0, numTests);
  
  const hasResults = Math.random() > 0.3; // 70% have results
  
  const labOrder = {
    id: labId,
    patientId: patient.id,
    patientName: patient.name,
    doctorId: doctor.id,
    doctorName: doctor.name,
    emrId: emr?.id || null,
    odVisitId: patient.odVisitId,
    orderDate: now,
    tests: selectedTests.map(test => ({
      ...test,
      status: hasResults ? 'completed' : 'pending',
      result: hasResults ? generateLabResult(test.code) : null,
      resultDate: hasResults ? now : null
    })),
    urgency: 'routine',
    status: hasResults ? 'completed' : 'pending',
    notes: 'Routine monitoring labs',
    collectedAt: hasResults ? now : null,
    resultedAt: hasResults ? now : null,
    createdAt: now,
    updatedAt: now
  };
  
  // Save in doctor's lab orders
  await writeToGCS(BUCKETS.doctor, `doctors/${doctor.id}/lab-orders/${labId}.json`, labOrder);
  
  // Save reference in patient data
  const patientLabs = await readFromGCS(BUCKETS.patient, `patients/${patient.id}/lab-results.json`) || [];
  patientLabs.push(labOrder);
  await writeToGCS(BUCKETS.patient, `patients/${patient.id}/lab-results.json`, patientLabs);
  
  return labOrder;
}

function generateLabResult(testCode) {
  const results = {
    'CBC': { WBC: '7.5 K/uL', RBC: '4.8 M/uL', Hemoglobin: '14.2 g/dL', Hematocrit: '42%', Platelets: '250 K/uL' },
    'BMP': { Glucose: '98 mg/dL', BUN: '15 mg/dL', Creatinine: '1.0 mg/dL', Sodium: '140 mEq/L', Potassium: '4.2 mEq/L' },
    'LFT': { AST: '28 U/L', ALT: '32 U/L', ALP: '65 U/L', Bilirubin: '0.8 mg/dL', Albumin: '4.2 g/dL' },
    'TSH': { TSH: '2.1 mIU/L', FreeT4: '1.2 ng/dL' },
    'HbA1c': { HbA1c: '6.8%', eAG: '148 mg/dL' },
    'Lipid': { TotalCholesterol: '195 mg/dL', LDL: '120 mg/dL', HDL: '55 mg/dL', Triglycerides: '150 mg/dL' },
    'UA': { Color: 'Yellow', Clarity: 'Clear', pH: '6.0', Glucose: 'Negative', Protein: 'Negative' }
  };
  return results[testCode] || { result: 'Normal' };
}

async function createImagingOrder(patient, doctor, emr) {
  const imgId = `IMG-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const now = new Date().toISOString();
  
  const imagingTypes = [
    { type: 'X-Ray', bodyPart: 'Chest', indication: 'Annual screening' },
    { type: 'Ultrasound', bodyPart: 'Abdomen', indication: 'Abdominal pain evaluation' },
    { type: 'ECG', bodyPart: 'Heart', indication: 'Cardiac screening' },
    { type: 'CT', bodyPart: 'Head', indication: 'Headache evaluation' }
  ];
  
  const selectedImaging = imagingTypes[Math.floor(Math.random() * imagingTypes.length)];
  const hasResults = Math.random() > 0.4;
  
  const imagingOrder = {
    id: imgId,
    patientId: patient.id,
    patientName: patient.name,
    doctorId: doctor.id,
    doctorName: doctor.name,
    emrId: emr?.id || null,
    odVisitId: patient.odVisitId,
    orderDate: now,
    imaging: {
      ...selectedImaging,
      status: hasResults ? 'completed' : 'scheduled',
      scheduledDate: hasResults ? now : getDateTimeString(3, 10),
      result: hasResults ? `${selectedImaging.type} of ${selectedImaging.bodyPart}: No acute abnormality identified.` : null,
      reportedBy: hasResults ? 'Dr. Radiologist' : null,
      reportedAt: hasResults ? now : null
    },
    urgency: 'routine',
    status: hasResults ? 'completed' : 'scheduled',
    notes: selectedImaging.indication,
    createdAt: now,
    updatedAt: now
  };
  
  // Save in doctor's imaging orders
  await writeToGCS(BUCKETS.doctor, `doctors/${doctor.id}/imaging/${imgId}.json`, imagingOrder);
  
  // Save reference in patient data
  const patientImaging = await readFromGCS(BUCKETS.patient, `patients/${patient.id}/imaging.json`) || [];
  patientImaging.push(imagingOrder);
  await writeToGCS(BUCKETS.patient, `patients/${patient.id}/imaging.json`, patientImaging);
  
  return imagingOrder;
}

async function createPDPAConsent(patient, doctor) {
  const consentId = `PDPA-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const now = new Date().toISOString();
  
  const consent = {
    id: consentId,
    patientId: patient.id,
    patientName: patient.name,
    patientEmail: patient.email,
    grantedTo: {
      doctorId: doctor.id,
      doctorName: doctor.name,
      hospital: doctor.hospital || 'Izara Medical Center'
    },
    consentTypes: [
      { type: 'medical_records', granted: true, grantedAt: now },
      { type: 'prescription_history', granted: true, grantedAt: now },
      { type: 'lab_results', granted: true, grantedAt: now },
      { type: 'imaging_reports', granted: true, grantedAt: now },
      { type: 'telemedicine', granted: true, grantedAt: now },
      { type: 'data_sharing_research', granted: false, grantedAt: null }
    ],
    status: 'active',
    validFrom: now,
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    signatureMethod: 'electronic',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    createdAt: now,
    updatedAt: now
  };
  
  // Save in metadata bucket
  await writeToGCS(BUCKETS.metadata, `pdpa-consents/${consentId}.json`, consent);
  
  // Save reference in patient data
  const patientConsents = await readFromGCS(BUCKETS.patient, `patients/${patient.id}/pdpa-consents.json`) || [];
  patientConsents.push(consent);
  await writeToGCS(BUCKETS.patient, `patients/${patient.id}/pdpa-consents.json`, patientConsents);
  
  return consent;
}

async function createQueueEntry(patient, doctor, position) {
  const queueId = `Q-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const now = new Date().toISOString();
  
  const queueEntry = {
    id: queueId,
    patientId: patient.id,
    patientName: patient.name,
    patientPhone: patient.phone,
    doctorId: doctor.id,
    doctorName: doctor.name,
    queueNumber: position,
    status: position === 1 ? 'in-progress' : 'waiting',
    checkInTime: now,
    estimatedWaitTime: position * 15,
    notes: 'Regular consultation',
    createdAt: now,
    updatedAt: now
  };
  
  return queueEntry;
}

async function createDoctorSchedule(doctor) {
  const scheduleId = `SCHED-${doctor.id}`;
  const now = new Date();
  const slots = [];
  
  // Generate slots for the next 14 days
  for (let day = 0; day < 14; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() + day);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    if (doctor.availableDays?.includes(dayName)) {
      const startHour = parseInt(doctor.workingHours?.start?.split(':')[0] || '9');
      const endHour = parseInt(doctor.workingHours?.end?.split(':')[0] || '17');
      
      for (let hour = startHour; hour < endHour; hour++) {
        slots.push({
          date: date.toISOString().split('T')[0],
          time: `${String(hour).padStart(2, '0')}:00`,
          duration: 30,
          available: Math.random() > 0.3, // 70% available
          type: 'consultation'
        });
        slots.push({
          date: date.toISOString().split('T')[0],
          time: `${String(hour).padStart(2, '0')}:30`,
          duration: 30,
          available: Math.random() > 0.3,
          type: 'consultation'
        });
      }
    }
  }
  
  const schedule = {
    id: scheduleId,
    doctorId: doctor.id,
    slots: slots,
    updatedAt: now.toISOString()
  };
  
  await writeToGCS(BUCKETS.doctor, `doctors/${doctor.id}/schedule.json`, schedule);
  return schedule;
}

// ============================================================================
// MAIN GENERATION FUNCTION
// ============================================================================

async function generateAllData() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  🔄 GENERATING INTERCONNECTED MOCK DATA');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // 1. Create Admin
    console.log('👨‍💼 Creating Admin...');
    await createDoctorCredentials(ADMIN);
    console.log(`   ✅ Admin: ${ADMIN.email}`);

    // 2. Create Doctors
    console.log('\n👨‍⚕️ Creating Doctors...');
    const createdDoctors = [];
    for (const doctor of DOCTORS) {
      await createDoctorCredentials(doctor);
      if (doctor.isActive && doctor.isApproved) {
        await createDoctorSchedule(doctor);
      }
      createdDoctors.push(doctor);
      console.log(`   ✅ ${doctor.name} (${doctor.email}) - ${doctor.approvalStatus}`);
    }

    // 3. Create Edge Case Users
    console.log('\n⚠️  Creating Edge Case Users...');
    for (const [key, user] of Object.entries(EDGE_USERS)) {
      await createDoctorCredentials(user);
      console.log(`   ✅ ${user.name} (${user.email}) - ${key}`);
    }

    // 4. Create Patients
    console.log('\n👤 Creating Patients...');
    const createdPatients = [];
    for (const patient of PATIENTS) {
      await createPatientCredentials(patient);
      createdPatients.push(patient);
      console.log(`   ✅ ${patient.name} (${patient.email})`);
    }

    // 5. Create Users Index
    console.log('\n📋 Creating Users Index...');
    const usersIndex = [
      { id: ADMIN.id, email: ADMIN.email, role: 'admin', name: ADMIN.name },
      ...DOCTORS.map(d => ({ id: d.id, email: d.email, role: 'doctor', name: d.name })),
      ...Object.values(EDGE_USERS).map(u => ({ id: u.id, email: u.email, role: 'doctor', name: u.name })),
      ...PATIENTS.map(p => ({ id: `user_${p.id}`, email: p.email, role: 'patient', name: p.name, patientId: p.id }))
    ];
    await writeToGCS(BUCKETS.credentials, 'users/index.json', usersIndex);
    console.log(`   ✅ ${usersIndex.length} users indexed`);

    // 6. Create Pending Approvals List
    console.log('\n📝 Creating Pending Approvals...');
    const pendingApprovals = DOCTORS.filter(d => d.approvalStatus === 'pending').map(d => ({
      id: d.id,
      email: d.email,
      name: d.name,
      medicalLicenseNumber: d.medicalLicenseNumber,
      specialty: d.specialty,
      submittedAt: new Date().toISOString(),
      status: 'pending'
    }));
    await writeToGCS(BUCKETS.credentials, 'pending-approvals.json', pendingApprovals);
    console.log(`   ✅ ${pendingApprovals.length} pending approvals`);

    // 7. Create Doctors Index
    console.log('\n📋 Creating Doctors Index...');
    const doctorsIndex = DOCTORS.filter(d => d.isApproved).map(d => ({
      id: d.id,
      name: d.name,
      nameTh: d.nameTh,
      specialty: d.specialty,
      specialtyTh: d.specialtyTh,
      hospital: d.hospital || 'Izara Medical Center',
      isActive: d.isActive,
      consultationFee: d.consultationFee,
      rating: 4.5 + Math.random() * 0.5,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${d.email}`
    }));
    await writeToGCS(BUCKETS.doctor, 'doctors/index.json', doctorsIndex);
    await writeToGCS(BUCKETS.metadata, 'doctors-list.json', doctorsIndex);
    console.log(`   ✅ ${doctorsIndex.length} doctors indexed`);

    // 8. Create Appointments (linking patients and doctors)
    console.log('\n📅 Creating Appointments...');
    const allAppointments = [];
    const activeDoctors = createdDoctors.filter(d => d.isActive && d.isApproved);
    
    for (const patient of createdPatients) {
      const assignedDoctor = activeDoctors.find(d => d.id === patient.assignedDoctorId) || activeDoctors[0];
      
      // Past completed appointment
      const pastApt = await createAppointment(patient, assignedDoctor, -7, 9, 'completed');
      allAppointments.push(pastApt);
      
      // Today's appointment
      const todayApt = await createAppointment(patient, assignedDoctor, 0, 10 + createdPatients.indexOf(patient), 'scheduled');
      allAppointments.push(todayApt);
      
      // Future appointment
      const futureApt = await createAppointment(patient, assignedDoctor, 14, 11, 'scheduled');
      allAppointments.push(futureApt);
    }
    
    await writeToGCS(BUCKETS.appointments, 'appointments/index.json', allAppointments);
    console.log(`   ✅ ${allAppointments.length} appointments created`);

    // 9. Create Clinical Data (EMR, Prescriptions, Labs, Imaging)
    console.log('\n🏥 Creating Clinical Data...');
    let emrCount = 0, rxCount = 0, labCount = 0, imgCount = 0;
    
    for (const patient of createdPatients) {
      const assignedDoctor = activeDoctors.find(d => d.id === patient.assignedDoctorId) || activeDoctors[0];
      const pastAppointment = allAppointments.find(a => a.patientId === patient.id && a.status === 'completed');
      
      // Create EMR for completed visits
      const emr = await createEMR(patient, assignedDoctor, pastAppointment);
      emrCount++;
      
      // Create prescription if patient has chronic conditions
      if (patient.chronicConditions.length > 0) {
        await createPrescription(patient, assignedDoctor, emr);
        rxCount++;
      }
      
      // Create lab order
      await createLabOrder(patient, assignedDoctor, emr);
      labCount++;
      
      // Create imaging for some patients
      if (Math.random() > 0.5) {
        await createImagingOrder(patient, assignedDoctor, emr);
        imgCount++;
      }
    }
    console.log(`   ✅ ${emrCount} EMR records, ${rxCount} prescriptions, ${labCount} lab orders, ${imgCount} imaging orders`);

    // 10. Create PDPA Consents
    console.log('\n🔐 Creating PDPA Consents...');
    for (const patient of createdPatients) {
      const assignedDoctor = activeDoctors.find(d => d.id === patient.assignedDoctorId) || activeDoctors[0];
      await createPDPAConsent(patient, assignedDoctor);
    }
    console.log(`   ✅ ${createdPatients.length} PDPA consents created`);

    // 11. Create Today's Queue
    console.log('\n📋 Creating Today\'s Queue...');
    const queue = [];
    for (let i = 0; i < Math.min(3, createdPatients.length); i++) {
      const patient = createdPatients[i];
      const doctor = activeDoctors[0];
      const entry = await createQueueEntry(patient, doctor, i + 1);
      queue.push(entry);
    }
    await writeToGCS(BUCKETS.doctor, `doctors/${activeDoctors[0].id}/queue.json`, queue);
    console.log(`   ✅ ${queue.length} patients in queue`);

    // 12. Create Patients Index
    console.log('\n📋 Creating Patients Index...');
    const patientsIndex = createdPatients.map(p => ({
      id: p.id,
      odVisitId: p.odVisitId,
      name: p.name,
      nameTh: p.nameTh,
      email: p.email,
      phone: p.phone,
      dateOfBirth: p.dateOfBirth,
      gender: p.gender,
      assignedDoctorId: p.assignedDoctorId
    }));
    await writeToGCS(BUCKETS.patient, 'patients/index.json', patientsIndex);
    console.log(`   ✅ ${patientsIndex.length} patients indexed`);

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  ✅ DATA GENERATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\n📊 Summary:');
    console.log(`   • Admin: 1`);
    console.log(`   • Doctors: ${DOCTORS.length} (${DOCTORS.filter(d => d.isApproved).length} approved, ${DOCTORS.filter(d => !d.isApproved).length} pending)`);
    console.log(`   • Edge Case Users: ${Object.keys(EDGE_USERS).length}`);
    console.log(`   • Patients: ${PATIENTS.length}`);
    console.log(`   • Appointments: ${allAppointments.length}`);
    console.log(`   • EMR Records: ${emrCount}`);
    console.log(`   • Prescriptions: ${rxCount}`);
    console.log(`   • Lab Orders: ${labCount}`);
    console.log(`   • Imaging Orders: ${imgCount}`);
    console.log(`   • PDPA Consents: ${createdPatients.length}`);
    
    console.log('\n🔑 Test Credentials:');
    console.log('   Admin:');
    console.log(`     Email: ${ADMIN.email}`);
    console.log(`     Password: ${ADMIN.password}`);
    console.log('   Doctor (Approved):');
    console.log(`     Email: ${DOCTORS[0].email}`);
    console.log(`     Password: ${DOCTORS[0].password}`);
    console.log('   Doctor (Pending):');
    console.log(`     Email: ${DOCTORS[1].email}`);
    console.log(`     Password: ${DOCTORS[1].password}`);
    console.log('   Patient:');
    console.log(`     Email: ${PATIENTS[0].email}`);
    console.log(`     Password: ${PATIENTS[0].password}`);
    
    console.log('\n═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error generating data:', error.message);
    process.exit(1);
  }
}

// Run
generateAllData();
