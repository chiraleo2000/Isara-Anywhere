/**
 * Izara Doctor Portal - Complete Demo Data Generator
 *
 * Generates comprehensive mock data for:
 * - Doctor: Dr. Example Test (example.test@hospital.com / P@ssw0rd)
 * - Multiple patients with full clinical data
 * - All GCS bucket data aligned with QUICK_REFERENCE.md
 *
 * Usage: node scripts/generateDemoData.cjs
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ============================================================================
// CONFIGURATION
// ============================================================================

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'mockData');
const USERS_DIR = path.join(OUTPUT_DIR, 'users');

// Demo IDs
const DEMO_DOCTOR_ID = 'DOC-DEMO-001';
// Sample patients for demo (connected to patient portal)
const DEMO_PATIENTS = [
  {
    id: 'PAT-DEMO-001',
    name: 'สมชาย รักดี',
    email: 'somchai.demo@gmail.com',
    age: 45,
    gender: 'male',
    phone: '+66812345678',
    chronicConditions: ['Hypertension', 'Type 2 Diabetes'],
    allergies: ['Penicillin']
  },
  {
    id: 'PAT-DEMO-002',
    name: 'สุดา สวัสดี',
    email: 'suda.demo@gmail.com',
    age: 32,
    gender: 'female',
    phone: '+66823456789',
    chronicConditions: [],
    allergies: ['Aspirin']
  },
  {
    id: 'PAT-DEMO-003',
    name: 'วิชัย ใจดี',
    email: 'wichai.demo@gmail.com',
    age: 58,
    gender: 'male',
    phone: '+66834567890',
    chronicConditions: ['Chronic Kidney Disease Stage 3'],
    allergies: []
  }
];

// Doctor credentials (single doctor-only demo account)
const DEMO_DOCTOR = {
  name: 'Dr. Demo Example',
  email: 'demo.example@hospitalx.com',
  password: 'Password123!'
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeJSON(filename, data, dir = OUTPUT_DIR) {
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`   ✅ Generated: ${filename}`);
}

function getDateString(daysFromNow = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString();
}

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Simple password hash (for demo - use bcrypt in production)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'izara_salt').digest('hex');
}

// ============================================================================
// USER CREDENTIALS GENERATOR (izara-users-credentials bucket)
// ============================================================================

function generateUserCredentials() {
  // User credential file: users/{userId}.json
  // Demo doctor is the first administrator of the application
  const userCredential = {
    id: DEMO_DOCTOR_ID,
    email: DEMO_DOCTOR.email,
    passwordHash: hashPassword(DEMO_DOCTOR.password),
    role: 'doctor',
    doctorId: DEMO_DOCTOR_ID,
    isActive: true,
    emailVerified: true,
    createdAt: getDateString(-365),
    lastLogin: getDateString(0),
    loginAttempts: 0,
    lockedUntil: null,
    
    // =====================================================
    // ADMIN PRIVILEGES - First administrator of application
    // =====================================================
    isAdmin: true,
    adminPermissions: {
      canControlAppointments: true,
      canManageDoctors: true,
      canAccessAllPatients: true,
      canModifyPrivileges: true,
      canViewAuditLogs: true,
      canManageSettings: true,
      grantedBy: 'SYSTEM',
      grantedAt: getDateString(-365),
      description: 'First administrator - full system access'
    },
    
    preferences: {
      theme: 'light',
      language: 'en',
      notifications: {
        email: true,
        push: true,
        sms: false
      }
    }
  };

  return userCredential;
}

function generateSessions() {
  // Session file: sessions/{sessionId}.json
  return {
    id: `session_${Date.now()}`,
    userId: DEMO_DOCTOR_ID,
    createdAt: getDateString(0),
    expiresAt: getDateString(1),
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    ipAddress: '127.0.0.1',
    isActive: true
  };
}

function generateOAuthTokens() {
  // OAuth tokens: oauth/tokens/{userId}.json
  return {
    userId: DEMO_DOCTOR_ID,
    accessToken: 'demo_access_token_' + Date.now(),
    refreshToken: 'demo_refresh_token_' + Date.now(),
    expiresAt: getDateString(1),
    scope: ['profile', 'email', 'calendar'],
    provider: 'google',
    createdAt: getDateString(0)
  };
}

function generateLoginHistory() {
  // Login history: users/{userId}/login-history.json
  return [
    { timestamp: getDateString(0), ip: '127.0.0.1', userAgent: 'Chrome', success: true },
    { timestamp: getDateString(-1), ip: '127.0.0.1', userAgent: 'Chrome', success: true },
    { timestamp: getDateString(-3), ip: '192.168.1.1', userAgent: 'Safari', success: true },
    { timestamp: getDateString(-7), ip: '127.0.0.1', userAgent: 'Chrome', success: false, reason: 'Invalid password' }
  ];
}

// ============================================================================
// DOCTOR DATA GENERATOR (izara-doctors-data bucket)
// ============================================================================

function generateDoctors() {
  return [{
    id: DEMO_DOCTOR_ID,
    name: DEMO_DOCTOR.name,
    email: DEMO_DOCTOR.email,
    role: 'doctor',
    medicalLicenseNumber: 'MD-12345-TH',
    specialty: 'Internal Medicine',
    subspecialty: 'Cardiology',
    phone: '+66 2 123 4567',
    avatarUrl: 'https://i.pravatar.cc/150?u=drexampletest',
    dateOfBirth: '1975-05-15T00:00:00.000Z',
    gender: 'male',
    qualifications: [
      'Doctor of Medicine (MD) - Mahidol University',
      'Board Certified - Internal Medicine',
      'Fellowship - Cardiology, Chulalongkorn University',
      'Advanced Cardiac Life Support (ACLS)',
      'Diploma in Hypertension Management'
    ],
    experience: '20 years',
    languages: ['Thai', 'English'],
    consultationFee: 1000,
    hospital: 'Demo Hospital Bangkok',
    department: 'Internal Medicine',
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
      totalPatients: 2500,
      totalConsultations: 8500,
      patientSatisfaction: 4.9,
      averageRating: 4.8,
      yearsOfExperience: 20
    },
    createdAt: getDateString(-365),
    updatedAt: getDateString(0)
  }];
}

function generateDoctorSchedule() {
  const today = new Date();
  const schedule = [];

  // Generate schedule for next 30 days
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dayOfWeek = date.getDay();

    // Skip Sunday
    if (dayOfWeek === 0) continue;

    const slots = [];
    const startHour = 9;
    const endHour = dayOfWeek === 6 ? 12 : 17;

    for (let hour = startHour; hour < endHour; hour++) {
      // Skip lunch (12-13)
      if (hour === 12) continue;

      slots.push({
        time: `${hour.toString().padStart(2, '0')}:00`,
        duration: 30,
        available: Math.random() > 0.3,
        appointmentId: Math.random() > 0.7 ? generateId('APT') : null
      });
      slots.push({
        time: `${hour.toString().padStart(2, '0')}:30`,
        duration: 30,
        available: Math.random() > 0.3,
        appointmentId: null
      });
    }

    schedule.push({
      date: date.toISOString().split('T')[0],
      doctorId: DEMO_DOCTOR_ID,
      slots,
      breakTimes: ['12:00-13:00'],
      notes: ''
    });
  }

  return schedule;
}

function generateQueue() {
  // Doctor-only demo: do not seed any queue entries
  return [];
}

// ============================================================================
// PATIENT DATA GENERATOR (izara-patients-data bucket)
// ============================================================================

function generatePatients() {
  const conditions = [
    { chronic: ['Hypertension', 'Type 2 Diabetes'], allergies: ['Penicillin'], meds: ['Amlodipine 5mg', 'Metformin 500mg'] },
    { chronic: ['Asthma'], allergies: ['Aspirin', 'NSAIDs'], meds: ['Seretide Inhaler'] },
    { chronic: ['Hyperlipidemia', 'Obesity'], allergies: [], meds: ['Atorvastatin 20mg'] },
    { chronic: ['Hypothyroidism'], allergies: ['Sulfa drugs'], meds: ['Levothyroxine 50mcg'] },
    { chronic: ['GERD', 'Anxiety'], allergies: ['Iodine'], meds: ['Omeprazole 20mg', 'Alprazolam 0.5mg PRN'] }
  ];

  return DEMO_PATIENTS.map((patient, index) => ({
    id: patient.id,
    demographics: {
      name: patient.name,
      dateOfBirth: `${1960 + index * 8}-${(index + 1).toString().padStart(2, '0')}-${(10 + index).toString().padStart(2, '0')}T00:00:00.000Z`,
      age: 64 - index * 8,
      gender: index % 2 === 0 ? 'male' : 'female',
      photo: `https://i.pravatar.cc/150?u=${patient.id}`,
      idNumber: `1${index}01234567890`,
      nationality: 'Thai',
      religion: 'Buddhist',
      occupation: ['Engineer', 'Teacher', 'Business Owner', 'Nurse', 'Accountant'][index],
      maritalStatus: ['Married', 'Single', 'Married', 'Divorced', 'Married'][index]
    },
    contact: {
      phone: `+66 8${index + 1} ${100 + index}${200 + index} ${300 + index}${400 + index}`,
      email: `${patient.name.toLowerCase().replace(' ', '.')}@email.com`,
      address: `${100 + index * 10} Sukhumvit Soi ${20 + index}, Bangkok, Thailand 101${index}0`,
      emergencyContact: {
        name: `Emergency Contact ${index + 1}`,
        relationship: ['Spouse', 'Parent', 'Child', 'Sibling', 'Friend'][index],
        phone: `+66 9${index + 1} ${500 + index}${600 + index} ${700 + index}${800 + index}`
      }
    },
    medicalInfo: {
      bloodType: ['A+', 'B+', 'O+', 'AB+', 'O-'][index],
      allergies: conditions[index].allergies,
      chronicConditions: conditions[index].chronic,
      currentMedications: conditions[index].meds,
      familyHistory: [
        'Father - ' + ['Heart Disease', 'Diabetes', 'Cancer', 'Hypertension', 'Stroke'][index],
        'Mother - ' + ['Diabetes', 'Hypertension', 'Osteoporosis', 'Thyroid Disease', 'Arthritis'][index]
      ],
      socialHistory: {
        smoking: ['Never', 'Former', 'Never', 'Current', 'Never'][index],
        alcohol: ['Occasional', 'Never', 'Social', 'Never', 'Occasional'][index],
        exercise: ['Regular', 'Occasional', 'Rarely', 'Regular', 'Moderate'][index]
      }
    },
    insurance: {
      provider: ['Thai National Health Insurance', 'AIA', 'Bangkok Insurance', 'Muang Thai Life', 'Thai Life Insurance'][index],
      policyNumber: `POL-${patient.id}-${Date.now().toString().slice(-6)}`,
      validUntil: getDateString(365)
    },
    lastVisit: getDateString(-5 - index * 10),
    nextAppointment: index < 3 ? getDateString(1 + index) : null,
    riskLevel: ['high', 'medium', 'medium', 'low', 'medium'][index],
    status: 'active',
    createdAt: getDateString(-365 - index * 30),
    updatedAt: getDateString(-index)
  }));
}

function generateEMRs() {
  const emrs = [];

  DEMO_PATIENTS.forEach((patient, pIndex) => {
    // Generate 2-4 EMRs per patient
    const emrCount = 2 + (pIndex % 3);

    for (let i = 0; i < emrCount; i++) {
      const daysAgo = i * 30 + pIndex * 10;
      emrs.push({
        id: `EMR-${patient.id}-${String(i + 1).padStart(3, '0')}`,
        patientId: patient.id,
        doctorId: DEMO_DOCTOR_ID,
        doctorName: DEMO_DOCTOR.name,
        encounterDate: getDateString(-daysAgo),
        encounterType: i === 0 ? 'follow-up' : 'consultation',
        chiefComplaint: [
          'Routine follow-up for chronic condition management',
          'Elevated blood pressure during home monitoring',
          'Medication refill and health check',
          'New symptom: occasional chest discomfort'
        ][i % 4],
        historyOfPresentIllness: `Patient presents for ${i === 0 ? 'routine follow-up' : 'evaluation of symptoms'}. Reports ${['good', 'fair', 'excellent'][i % 3]} compliance with current medications. ${i % 2 === 0 ? 'No new complaints.' : 'Reports mild fatigue over past week.'}`,
        vitalSigns: {
          bloodPressure: `${125 + pIndex * 5 + i * 2}/${78 + pIndex * 2 + i}`,
          heartRate: 68 + pIndex * 3 + i * 2,
          temperature: 36.5 + (pIndex * 0.1),
          respiratoryRate: 16 + (i % 2),
          oxygenSaturation: 98 - (pIndex % 2),
          weight: 60 + pIndex * 5,
          height: 160 + pIndex * 3,
          bmi: parseFloat((20 + pIndex * 1.5).toFixed(1))
        },
        physicalExamination: {
          general: 'Alert, oriented, no acute distress',
          cardiovascular: 'Regular rate and rhythm, no murmurs',
          respiratory: 'Clear to auscultation bilaterally',
          abdomen: 'Soft, non-tender, normoactive bowel sounds',
          neurological: 'Cranial nerves intact, no focal deficits'
        },
        diagnosis: [
          {
            code: ['I10', 'E11.9', 'J45.909', 'E03.9', 'K21.0'][pIndex],
            description: ['Essential hypertension', 'Type 2 diabetes', 'Asthma', 'Hypothyroidism', 'GERD'][pIndex],
            type: 'primary'
          }
        ],
        treatmentPlan: `Continue current medication regimen. ${i % 2 === 0 ? 'Lifestyle modifications reinforced.' : 'Medication adjustment as needed.'} Follow-up in ${4 - i} weeks.`,
        medications: [
          {
            name: ['Amlodipine', 'Metformin', 'Seretide', 'Levothyroxine', 'Omeprazole'][pIndex],
            dose: ['5mg', '500mg', '250/25mcg', '50mcg', '20mg'][pIndex],
            frequency: 'Once daily',
            route: 'Oral',
            duration: 'Ongoing'
          }
        ],
        labOrders: i === 0 ? [`LAB-${patient.id}-001`] : [],
        imagingOrders: i === 1 && pIndex < 3 ? [`IMG-${patient.id}-001`] : [],
        followUpDate: getDateString(-daysAgo + 30),
        status: 'finalized',
        createdAt: getDateString(-daysAgo),
        lastModified: getDateString(-daysAgo)
      });
    }
  });

  return emrs;
}

function generatePrescriptions() {
  const prescriptions = [];

  DEMO_PATIENTS.forEach((patient, pIndex) => {
    prescriptions.push({
      id: `RX-${patient.id}-001`,
      patientId: patient.id,
      patientName: patient.name,
      doctorId: DEMO_DOCTOR_ID,
      doctorName: DEMO_DOCTOR.name,
      prescribedDate: getDateString(-pIndex * 10),
      medications: [
        {
          id: `MED-${patient.id}-001`,
          name: ['Amlodipine', 'Metformin', 'Seretide Inhaler', 'Levothyroxine', 'Omeprazole'][pIndex],
          genericName: ['Amlodipine besylate', 'Metformin HCl', 'Fluticasone/Salmeterol', 'Levothyroxine sodium', 'Omeprazole'][pIndex],
          strength: ['5mg', '500mg', '250/25mcg', '50mcg', '20mg'][pIndex],
          form: ['Tablet', 'Tablet', 'Inhaler', 'Tablet', 'Capsule'][pIndex],
          quantity: [30, 60, 1, 30, 30][pIndex],
          dosage: '1 ' + ['tablet', 'tablet', 'puff', 'tablet', 'capsule'][pIndex],
          frequency: ['Once daily', 'Twice daily', 'Twice daily', 'Once daily (morning)', 'Once daily (before breakfast)'][pIndex],
          route: ['Oral', 'Oral', 'Inhalation', 'Oral', 'Oral'][pIndex],
          duration: '30 days',
          instructions: [
            'Take in the morning with or without food',
            'Take with meals to reduce GI upset',
            'Rinse mouth after use',
            'Take on empty stomach, 30 mins before breakfast',
            'Take 30 minutes before breakfast'
          ][pIndex],
          refills: 2,
          substitutionAllowed: true
        }
      ],
      diagnosis: ['Essential hypertension (I10)', 'Type 2 diabetes (E11.9)', 'Asthma (J45.909)', 'Hypothyroidism (E03.9)', 'GERD (K21.0)'][pIndex],
      notes: 'Patient tolerating medication well. Continue current therapy.',
      status: 'active',
      expiryDate: getDateString(360),
      createdAt: getDateString(-pIndex * 10),
      updatedAt: getDateString(-pIndex * 10)
    });
  });

  return prescriptions;
}

function generateLabOrders() {
  const labOrders = [];

  DEMO_PATIENTS.forEach((patient, pIndex) => {
    labOrders.push({
      id: `LAB-${patient.id}-001`,
      patientId: patient.id,
      patientName: patient.name,
      doctorId: DEMO_DOCTOR_ID,
      doctorName: DEMO_DOCTOR.name,
      orderDate: getDateString(-30 - pIndex * 10),
      tests: [
        {
          name: ['Lipid Profile', 'HbA1c', 'Pulmonary Function', 'TSH', 'Upper GI Endoscopy'][pIndex],
          code: ['LIPID', 'HBA1C', 'PFT', 'TSH', 'EGD'][pIndex],
          category: ['Chemistry', 'Chemistry', 'Pulmonary', 'Endocrinology', 'GI'][pIndex],
          result: ['TC: 195, LDL: 115, HDL: 52', '6.8%', 'FEV1: 78%', '2.5 mIU/L', 'Mild gastritis'][pIndex],
          unit: ['mg/dL', '%', '%', 'mIU/L', ''][pIndex],
          referenceRange: ['<200, <130, >40', '<7.0%', '>80%', '0.4-4.0', 'Normal'][pIndex],
          status: 'completed',
          abnormalFlag: pIndex === 1 ? 'H' : ''
        }
      ],
      testCategory: ['Lipid Profile', 'Diabetes', 'Pulmonary', 'Thyroid', 'GI'][pIndex],
      priority: 'routine',
      fastingRequired: pIndex < 2,
      specimenType: ['Blood', 'Blood', 'N/A', 'Blood', 'N/A'][pIndex],
      specimenCollectedAt: getDateString(-29 - pIndex * 10),
      resultAvailableAt: getDateString(-28 - pIndex * 10),
      status: 'completed',
      interpretation: [
        'Borderline lipid levels. Continue lifestyle modifications.',
        'HbA1c slightly elevated. Consider medication adjustment.',
        'Mild airflow limitation. Continue current inhaler therapy.',
        'TSH within normal range. Continue current dosage.',
        'Mild gastritis found. Continue PPI therapy.'
      ][pIndex],
      createdAt: getDateString(-30 - pIndex * 10),
      updatedAt: getDateString(-28 - pIndex * 10)
    });
  });

  return labOrders;
}

function generateImagingOrders() {
  return DEMO_PATIENTS.slice(0, 3).map((patient, pIndex) => ({
    id: `IMG-${patient.id}-001`,
    patientId: patient.id,
    patientName: patient.name,
    doctorId: DEMO_DOCTOR_ID,
    doctorName: DEMO_DOCTOR.name,
    orderDate: getDateString(-60 - pIndex * 15),
    modality: ['xray', 'echocardiogram', 'xray'][pIndex],
    bodyRegion: ['Chest', 'Heart', 'Chest'][pIndex],
    clinicalIndication: [
      'Baseline chest X-ray for hypertension workup',
      'Cardiac function assessment for diabetes',
      'Annual screening for asthma patient'
    ][pIndex],
    contrast: false,
    urgency: 'routine',
    status: 'completed',
    report: {
      findings: [
        'Heart size normal, CTR 0.48. Lungs clear. No pleural effusion.',
        'LVEF 55%. No regional wall motion abnormalities. Mild diastolic dysfunction.',
        'Lungs clear. No acute infiltrates. Heart size normal.'
      ][pIndex],
      impression: [
        'Normal chest radiograph.',
        'Preserved systolic function with mild diastolic dysfunction.',
        'Normal chest X-ray.'
      ][pIndex],
      radiologist: 'Dr. Radiology Specialist',
      reportedAt: getDateString(-58 - pIndex * 15)
    },
    createdAt: getDateString(-60 - pIndex * 15),
    updatedAt: getDateString(-58 - pIndex * 15)
  }));
}

function generatePDPAConsents() {
  const consents = {};

  DEMO_PATIENTS.forEach((patient) => {
    consents[patient.id] = {
      activeConsents: [{
        id: generateId('consent'),
        doctorId: DEMO_DOCTOR_ID,
        consentType: 'ehr-access',
        status: 'active',
        dataTypes: ['phr-access', 'ehr-access', 'data-sharing', 'telemedicine'],
        grantedAt: getDateString(-180),
        expiresAt: getDateString(185),
        scope: 'full-medical-record'
      }],
      history: []
    };
  });

  return consents;
}

function generatePatientTimelines() {
  const timelines = {};

  DEMO_PATIENTS.forEach((patient, pIndex) => {
    timelines[patient.id] = [
      {
        id: generateId('event'),
        timestamp: getDateString(-pIndex * 10),
        type: 'emr',
        action: 'created',
        resourceId: `EMR-${patient.id}-001`,
        summary: 'EMR created during follow-up visit',
        doctorId: DEMO_DOCTOR_ID
      },
      {
        id: generateId('event'),
        timestamp: getDateString(-pIndex * 10 - 1),
        type: 'prescription',
        action: 'created',
        resourceId: `RX-${patient.id}-001`,
        summary: 'Prescription issued',
        doctorId: DEMO_DOCTOR_ID
      },
      {
        id: generateId('event'),
        timestamp: getDateString(-30 - pIndex * 10),
        type: 'lab_order',
        action: 'completed',
        resourceId: `LAB-${patient.id}-001`,
        summary: 'Lab results available',
        doctorId: DEMO_DOCTOR_ID
      }
    ];
  });

  return timelines;
}

// ============================================================================
// APPOINTMENT DATA GENERATOR (izara-appointments bucket)
// ============================================================================

function generateAppointments() {
  const appointments = [];

  // Past appointments
  DEMO_PATIENTS.forEach((patient, pIndex) => {
    appointments.push({
      id: `APT-${patient.id}-001`,
      patientId: patient.id,
      patientName: patient.name,
      patientPhoto: `https://i.pravatar.cc/150?u=${patient.id}`,
      doctorId: DEMO_DOCTOR_ID,
      doctorName: DEMO_DOCTOR.name,
      date: getDateString(-5 - pIndex * 7),
      time: `${9 + pIndex}:00`,
      duration: 30,
      type: pIndex % 2 === 0 ? 'telehealth' : 'in-person',
      status: 'completed',
      reason: ['Hypertension follow-up', 'Diabetes management', 'Asthma check', 'Thyroid follow-up', 'GERD review'][pIndex],
      meetLink: pIndex % 2 === 0 ? `https://meet.google.com/izara-demo-${pIndex + 1}` : null,
      notes: 'Consultation completed successfully',
      createdAt: getDateString(-10 - pIndex * 7),
      updatedAt: getDateString(-5 - pIndex * 7)
    });
  });

  // Future appointments
  DEMO_PATIENTS.slice(0, 3).forEach((patient, pIndex) => {
    appointments.push({
      id: `APT-${patient.id}-002`,
      patientId: patient.id,
      patientName: patient.name,
      patientPhoto: `https://i.pravatar.cc/150?u=${patient.id}`,
      doctorId: DEMO_DOCTOR_ID,
      doctorName: DEMO_DOCTOR.name,
      date: getDateString(1 + pIndex),
      time: `${10 + pIndex}:00`,
      duration: 30,
      type: 'telehealth',
      status: 'confirmed',
      reason: 'Follow-up consultation',
      meetLink: `https://meet.google.com/izara-future-${pIndex + 1}`,
      notes: '',
      createdAt: getDateString(-3),
      updatedAt: getDateString(-1)
    });
  });

  return appointments;
}

// ============================================================================
// METADATA GENERATOR (izara-meta-data bucket)
// ============================================================================

function generateMedications() {
  return [
    { id: 'DRUG-001', name: 'Amlodipine', genericName: 'Amlodipine besylate', category: 'Cardiovascular', forms: ['Tablet'], strengths: ['2.5mg', '5mg', '10mg'], indication: 'Hypertension, Angina', contraindications: ['Severe hypotension', 'Cardiogenic shock'], sideEffects: ['Peripheral edema', 'Dizziness', 'Flushing'], interactions: ['Simvastatin'], maxDose: '10mg daily' },
    { id: 'DRUG-002', name: 'Metformin', genericName: 'Metformin hydrochloride', category: 'Diabetes', forms: ['Tablet', 'XR Tablet'], strengths: ['500mg', '850mg', '1000mg'], indication: 'Type 2 Diabetes', contraindications: ['Renal impairment (eGFR <30)', 'Metabolic acidosis'], sideEffects: ['GI upset', 'Nausea', 'Diarrhea'], interactions: ['Contrast media', 'Alcohol'], maxDose: '2550mg daily' },
    { id: 'DRUG-003', name: 'Atorvastatin', genericName: 'Atorvastatin calcium', category: 'Cardiovascular', forms: ['Tablet'], strengths: ['10mg', '20mg', '40mg', '80mg'], indication: 'Hypercholesterolemia', contraindications: ['Active liver disease', 'Pregnancy'], sideEffects: ['Muscle pain', 'Liver enzyme elevation'], interactions: ['Gemfibrozil', 'Cyclosporine'], maxDose: '80mg daily' },
    { id: 'DRUG-004', name: 'Losartan', genericName: 'Losartan potassium', category: 'Cardiovascular', forms: ['Tablet'], strengths: ['25mg', '50mg', '100mg'], indication: 'Hypertension, Diabetic nephropathy', contraindications: ['Pregnancy', 'Bilateral renal artery stenosis'], sideEffects: ['Dizziness', 'Hyperkalemia'], interactions: ['Potassium supplements', 'NSAIDs'], maxDose: '100mg daily' },
    { id: 'DRUG-005', name: 'Omeprazole', genericName: 'Omeprazole', category: 'Gastrointestinal', forms: ['Capsule', 'Tablet'], strengths: ['10mg', '20mg', '40mg'], indication: 'GERD, Peptic ulcer', contraindications: ['PPI hypersensitivity'], sideEffects: ['Headache', 'Diarrhea', 'Abdominal pain'], interactions: ['Clopidogrel'], maxDose: '40mg daily' },
    { id: 'DRUG-006', name: 'Levothyroxine', genericName: 'Levothyroxine sodium', category: 'Endocrine', forms: ['Tablet'], strengths: ['25mcg', '50mcg', '75mcg', '100mcg', '125mcg'], indication: 'Hypothyroidism', contraindications: ['Untreated adrenal insufficiency', 'Acute MI'], sideEffects: ['Palpitations', 'Weight loss', 'Tremor'], interactions: ['Calcium', 'Iron supplements'], maxDose: 'Varies by patient' },
    { id: 'DRUG-007', name: 'Seretide', genericName: 'Fluticasone/Salmeterol', category: 'Respiratory', forms: ['Inhaler'], strengths: ['100/50mcg', '250/25mcg', '500/50mcg'], indication: 'Asthma, COPD', contraindications: ['Acute bronchospasm'], sideEffects: ['Oral candidiasis', 'Hoarseness'], interactions: ['Strong CYP3A4 inhibitors'], maxDose: '2 puffs twice daily' },
    { id: 'DRUG-008', name: 'Paracetamol', genericName: 'Acetaminophen', category: 'Analgesic', forms: ['Tablet', 'Suspension'], strengths: ['325mg', '500mg', '650mg'], indication: 'Pain, Fever', contraindications: ['Severe hepatic impairment'], sideEffects: ['Hepatotoxicity (overdose)'], interactions: ['Warfarin', 'Alcohol'], maxDose: '4g daily' }
  ];
}

function generateLabTests() {
  return [
    { id: 'LT-001', code: 'CBC', name: 'Complete Blood Count', category: 'Hematology', specimenType: 'Blood', fastingRequired: false, turnaroundTime: '24 hours', price: 350 },
    { id: 'LT-002', code: 'CMP', name: 'Comprehensive Metabolic Panel', category: 'Chemistry', specimenType: 'Blood', fastingRequired: true, turnaroundTime: '24 hours', price: 800 },
    { id: 'LT-003', code: 'LIPID', name: 'Lipid Profile', category: 'Chemistry', specimenType: 'Blood', fastingRequired: true, turnaroundTime: '24 hours', price: 600 },
    { id: 'LT-004', code: 'HBA1C', name: 'Hemoglobin A1c', category: 'Chemistry', specimenType: 'Blood', fastingRequired: false, turnaroundTime: '24 hours', price: 450 },
    { id: 'LT-005', code: 'TSH', name: 'Thyroid Stimulating Hormone', category: 'Endocrinology', specimenType: 'Blood', fastingRequired: false, turnaroundTime: '48 hours', price: 400 },
    { id: 'LT-006', code: 'FT4', name: 'Free T4', category: 'Endocrinology', specimenType: 'Blood', fastingRequired: false, turnaroundTime: '48 hours', price: 350 },
    { id: 'LT-007', code: 'CREAT', name: 'Creatinine', category: 'Renal Function', specimenType: 'Blood', fastingRequired: false, turnaroundTime: '24 hours', price: 150 },
    { id: 'LT-008', code: 'BUN', name: 'Blood Urea Nitrogen', category: 'Renal Function', specimenType: 'Blood', fastingRequired: false, turnaroundTime: '24 hours', price: 150 },
    { id: 'LT-009', code: 'UA', name: 'Urinalysis', category: 'Urinalysis', specimenType: 'Urine', fastingRequired: false, turnaroundTime: '24 hours', price: 150 },
    { id: 'LT-010', code: 'ALT', name: 'ALT (SGPT)', category: 'Liver Function', specimenType: 'Blood', fastingRequired: false, turnaroundTime: '24 hours', price: 150 }
  ];
}

function generateICD10Codes() {
  return [
    { code: 'I10', description: 'Essential (primary) hypertension', category: 'Cardiovascular', thai: 'โรคความดันโลหิตสูงปฐมภูมิ' },
    { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', category: 'Endocrine', thai: 'เบาหวานชนิดที่ 2' },
    { code: 'E78.0', description: 'Pure hypercholesterolemia', category: 'Endocrine', thai: 'ภาวะคอเลสเตอรอลสูง' },
    { code: 'J45.909', description: 'Unspecified asthma, uncomplicated', category: 'Respiratory', thai: 'โรคหืด' },
    { code: 'E03.9', description: 'Hypothyroidism, unspecified', category: 'Endocrine', thai: 'ภาวะไทรอยด์ทำงานน้อย' },
    { code: 'K21.0', description: 'Gastro-esophageal reflux disease with esophagitis', category: 'Digestive', thai: 'โรคกรดไหลย้อน' },
    { code: 'F41.1', description: 'Generalized anxiety disorder', category: 'Mental Health', thai: 'โรควิตกกังวลทั่วไป' },
    { code: 'M54.5', description: 'Low back pain', category: 'Musculoskeletal', thai: 'ปวดหลังส่วนล่าง' },
    { code: 'N39.0', description: 'Urinary tract infection', category: 'Genitourinary', thai: 'ติดเชื้อทางเดินปัสสาวะ' },
    { code: 'J06.9', description: 'Acute upper respiratory infection', category: 'Respiratory', thai: 'ติดเชื้อทางเดินหายใจส่วนบน' }
  ];
}

function generateDrugInteractions() {
  return [
    { id: 'DI-001', drug1Id: 'DRUG-001', drug1Name: 'Amlodipine', drug2Id: 'DRUG-003', drug2Name: 'Atorvastatin', severity: 'moderate', description: 'Amlodipine may increase simvastatin levels', mechanism: 'CYP3A4 inhibition', management: 'Monitor for myopathy symptoms' },
    { id: 'DI-002', drug1Id: 'DRUG-002', drug1Name: 'Metformin', drug2Id: 'CONTRAST', drug2Name: 'Iodinated Contrast', severity: 'major', description: 'Risk of lactic acidosis', mechanism: 'Renal impairment', management: 'Hold metformin 48h before and after contrast' },
    { id: 'DI-003', drug1Id: 'DRUG-004', drug1Name: 'Losartan', drug2Id: 'NSAID', drug2Name: 'NSAIDs', severity: 'moderate', description: 'NSAIDs may reduce antihypertensive effect', mechanism: 'Prostaglandin inhibition', management: 'Monitor blood pressure closely' },
    { id: 'DI-004', drug1Id: 'DRUG-005', drug1Name: 'Omeprazole', drug2Id: 'CLOPIDOGREL', drug2Name: 'Clopidogrel', severity: 'major', description: 'Reduced clopidogrel efficacy', mechanism: 'CYP2C19 inhibition', management: 'Consider pantoprazole instead' },
    { id: 'DI-005', drug1Id: 'DRUG-006', drug1Name: 'Levothyroxine', drug2Id: 'CALCIUM', drug2Name: 'Calcium supplements', severity: 'moderate', description: 'Reduced levothyroxine absorption', mechanism: 'Binding in GI tract', management: 'Separate doses by 4 hours' }
  ];
}

function generateReferenceRanges() {
  return [
    { testCode: 'CBC_HGB', name: 'Hemoglobin', ageGroup: 'adult', gender: 'male', min: 13.5, max: 17.5, unit: 'g/dL' },
    { testCode: 'CBC_HGB', name: 'Hemoglobin', ageGroup: 'adult', gender: 'female', min: 12.0, max: 16.0, unit: 'g/dL' },
    { testCode: 'FBG', name: 'Fasting Blood Glucose', ageGroup: 'all', min: 70, max: 99, unit: 'mg/dL' },
    { testCode: 'HBA1C', name: 'HbA1c', ageGroup: 'all', min: 4.0, max: 5.6, unit: '%' },
    { testCode: 'CHOL', name: 'Total Cholesterol', ageGroup: 'adult', max: 200, unit: 'mg/dL' },
    { testCode: 'LDL', name: 'LDL Cholesterol', ageGroup: 'adult', max: 130, unit: 'mg/dL' },
    { testCode: 'HDL', name: 'HDL Cholesterol', ageGroup: 'adult', gender: 'male', min: 40, unit: 'mg/dL' },
    { testCode: 'HDL', name: 'HDL Cholesterol', ageGroup: 'adult', gender: 'female', min: 50, unit: 'mg/dL' },
    { testCode: 'TSH', name: 'TSH', ageGroup: 'adult', min: 0.4, max: 4.0, unit: 'mIU/L' },
    { testCode: 'CREAT', name: 'Creatinine', ageGroup: 'adult', gender: 'male', min: 0.7, max: 1.3, unit: 'mg/dL' },
    { testCode: 'CREAT', name: 'Creatinine', ageGroup: 'adult', gender: 'female', min: 0.6, max: 1.1, unit: 'mg/dL' }
  ];
}

// ============================================================================
// PATIENT DATA GENERATORS (For patient-doctor connection demo)
// ============================================================================

function generateDemoPatients() {
  return DEMO_PATIENTS.map(p => ({
    id: p.id,
    demographics: {
      name: p.name,
      email: p.email,
      phone: p.phone,
      dateOfBirth: getDateString(-365 * p.age),
      age: p.age,
      gender: p.gender,
      nationalId: `THAI${p.id.replace('-', '')}`,
      address: 'Bangkok, Thailand'
    },
    medicalInfo: {
      bloodType: ['A+', 'B+', 'O+', 'AB+'][Math.floor(Math.random() * 4)],
      allergies: p.allergies,
      chronicConditions: p.chronicConditions,
      currentMedications: p.chronicConditions.length > 0 ? ['As per chronic condition treatment'] : []
    },
    insuranceInfo: {
      provider: 'Thai Social Security',
      policyNumber: `POL-${p.id}`,
      validUntil: getDateString(365)
    },
    assignedDoctorId: DEMO_DOCTOR_ID,
    status: 'active',
    createdAt: getDateString(-90),
    lastVisit: getDateString(-7)
  }));
}

function generateDemoEMRs() {
  const emrs = [];
  DEMO_PATIENTS.forEach((patient, idx) => {
    // Create 1-2 EMRs per patient
    const numEmrs = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < numEmrs; i++) {
      emrs.push({
        id: `EMR-${patient.id}-${i + 1}`,
        patientId: patient.id,
        doctorId: DEMO_DOCTOR_ID,
        encounterDate: getDateString(-7 * (i + 1)),
        chiefComplaint: ['Headache and fatigue', 'Follow-up visit', 'Chronic condition management'][idx % 3],
        historyOfPresentIllness: 'Patient presents with symptoms as noted above.',
        assessment: patient.chronicConditions.length > 0 
          ? `Chronic conditions under control: ${patient.chronicConditions.join(', ')}`
          : 'Acute condition, recommend follow-up in 1 week',
        treatmentPlan: 'Continue current medications. Lifestyle modifications advised.',
        vitalSigns: {
          bloodPressure: `${110 + idx * 10}/${70 + idx * 5}`,
          heartRate: 72 + idx * 3,
          temperature: 36.5 + (Math.random() * 0.5),
          respiratoryRate: 16,
          oxygenSaturation: 98
        },
        status: 'signed',
        createdAt: getDateString(-7 * (i + 1)),
        signedAt: getDateString(-7 * (i + 1) + 1)
      });
    }
  });
  return emrs;
}

function generateDemoAppointments() {
  const appointments = [];
  const now = new Date();
  
  // Create appointments for each demo patient
  DEMO_PATIENTS.forEach((patient, idx) => {
    // Past appointment
    appointments.push({
      id: `APT-PAST-${patient.id}`,
      patientId: patient.id,
      doctorId: DEMO_DOCTOR_ID,
      type: 'telemedicine',
      status: 'completed',
      scheduledTime: getDateString(-7),
      endTime: getDateString(-7),
      duration: 30,
      chiefComplaint: 'Regular checkup',
      notes: 'Completed successfully',
      meetingUrl: null,
      createdAt: getDateString(-14)
    });
    
    // Upcoming appointment (today or next few days)
    appointments.push({
      id: `APT-UPCOMING-${patient.id}`,
      patientId: patient.id,
      patientName: patient.name,
      doctorId: DEMO_DOCTOR_ID,
      type: 'telemedicine',
      status: 'scheduled',
      scheduledTime: getDateString(idx + 1),
      duration: 30,
      chiefComplaint: patient.chronicConditions.length > 0 
        ? 'Follow-up for chronic condition' 
        : 'General consultation',
      notes: '',
      meetingUrl: `https://meet.google.com/demo-${patient.id.toLowerCase()}`,
      createdAt: getDateString(-3)
    });
  });
  
  return appointments;
}

function generateDemoQueue() {
  // Create a queue with one patient waiting
  if (DEMO_PATIENTS.length === 0) return [];
  
  const firstPatient = DEMO_PATIENTS[0];
  return [
    {
      id: `QUEUE-001`,
      patientId: firstPatient.id,
      patientName: firstPatient.name,
      doctorId: DEMO_DOCTOR_ID,
      appointmentId: `APT-UPCOMING-${firstPatient.id}`,
      status: 'waiting',
      priority: 'normal',
      estimatedWaitTime: 10,
      checkInTime: getDateString(0),
      chiefComplaint: 'Scheduled telemedicine appointment',
      position: 1
    }
  ];
}

// ============================================================================
// MAIN GENERATION FUNCTION
// ============================================================================

function generateAllData() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🏥 Izara Doctor Portal - Complete Demo Data Generator');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('👨‍⚕️ Demo Doctor Account:');
  console.log(`   Name:     ${DEMO_DOCTOR.name}`);
  console.log(`   Email:    ${DEMO_DOCTOR.email}`);
  console.log(`   Password: ${DEMO_DOCTOR.password}\n`);

  console.log('👥 Demo Patients:', DEMO_PATIENTS.length > 0 ? DEMO_PATIENTS.length : '(none - doctor-only demo)');
  console.log('\n');

  // Ensure directories exist
  ensureDirectoryExists(OUTPUT_DIR);
  ensureDirectoryExists(USERS_DIR);

  console.log('📁 Generating data files...\n');

  // ============================================
  // izara-users-credentials bucket
  // ============================================
  console.log('🔐 User Credentials (izara-users-credentials):');
  const userCred = generateUserCredentials();
  writeJSON(`${DEMO_DOCTOR_ID}.json`, userCred, USERS_DIR);
  writeJSON('sessions.json', [generateSessions()]);
  writeJSON('oauth-tokens.json', generateOAuthTokens());
  writeJSON('login-history.json', generateLoginHistory());

  // ============================================
  // izara-doctors-data bucket
  // ============================================
  console.log('\n👨‍⚕️ Doctor Data (izara-doctors-data):');
  writeJSON('doctors.json', generateDoctors());
  // queue intentionally omitted for doctor-only demo
  writeJSON('doctor-schedule.json', generateDoctorSchedule());

  // ============================================
  // izara-patients-data bucket
  // ============================================
  console.log('\n👥 Patient Data (izara-patients-data):');
  if (DEMO_PATIENTS.length > 0) {
    writeJSON('patients.json', generateDemoPatients());
    writeJSON('emrs.json', generateDemoEMRs());
  } else {
    console.log('   (skipped - no demo patients configured)');
  }

  // ============================================
  // izara-appointments bucket
  // ============================================
  console.log('\n📅 Appointments (izara-appointments):');
  if (DEMO_PATIENTS.length > 0) {
    writeJSON('appointments.json', generateDemoAppointments());
    writeJSON('queue.json', generateDemoQueue());
  } else {
    console.log('   (skipped - no demo patients configured)');
  }

  // ============================================
  // izara-meta-data bucket
  // ============================================
  console.log('\n📚 Reference Data (izara-meta-data):');
  writeJSON('medications.json', generateMedications());
  writeJSON('lab-tests.json', generateLabTests());
  writeJSON('icd10-codes.json', generateICD10Codes());
  writeJSON('drug-interactions.json', generateDrugInteractions());
  writeJSON('reference-ranges.json', generateReferenceRanges());

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Demo data generation complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📂 Output directory:', OUTPUT_DIR);
  console.log('\n🚀 Next steps:');
  console.log('   1. Run: npm run dev        (test locally)');
  console.log('   2. Run: node scripts/uploadToGCS.cjs (upload to GCS)\n');

  console.log('🔑 Login credentials:');
  console.log(`   Email:    ${DEMO_DOCTOR.email}`);
  console.log(`   Password: ${DEMO_DOCTOR.password}`);
  console.log(`   Role:     Admin (first administrator)\n`);
}

// Run the generator
generateAllData();

// Optionally upload the demo doctor credential/profile to GCS via the helper script.
// By default this runs when you execute the generator. Set SKIP_UPLOAD=true to skip.
if (process.env.SKIP_UPLOAD !== 'true') {
  try {
    const { execSync } = require('child_process');
    console.log('\n🔼 Auto-upload: running scripts/uploadDemoDoctor.cjs to push demo doctor to GCS...');
    execSync('node ./scripts/uploadDemoDoctor.cjs', { stdio: 'inherit' });
  } catch (err) {
    console.error('⚠️ Auto-upload failed:', err && err.message ? err.message : err);
    console.error('You can still upload manually: node scripts/uploadDemoDoctor.cjs');
  }
} else {
  console.log('\n⏭️ SKIP_UPLOAD=true - skipping automatic upload to GCS');
}
