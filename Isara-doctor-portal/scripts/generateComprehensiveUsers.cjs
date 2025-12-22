/**
 * Generate Comprehensive Mock Data for All Users
 * Creates realistic data for patients, doctors, and admin with full feature coverage
 * 
 * Usage: node scripts/generateComprehensiveUsers.cjs
 */

const bcrypt = require('bcryptjs');

const GCS_API_URL = process.env.GCS_API_URL || 'http://localhost:3012';

const BUCKETS = {
  credentials: 'izara-users-credentials',
  doctor: 'izara-doctors-data',
  patient: 'izara-patients-data',
  appointments: 'izara-appointments',
  metadata: 'izara-meta-data'
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function writeToGCS(bucket, path, data) {
  try {
    const url = `${GCS_API_URL}/api/storage/write`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket, path, data })
    });

    if (!response.ok) {
      throw new Error(`GCS write failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ Error writing ${bucket}/${path}:`, error.message);
    throw error;
  }
}

async function fetchFromGCS(bucket, path) {
  try {
    const url = `${GCS_API_URL}/api/storage/read?bucket=${bucket}&path=${encodeURIComponent(path)}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`GCS read failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error.message.includes('404')) {
      return null;
    }
    console.error(`❌ Error fetching ${bucket}/${path}:`, error.message);
    return null;
  }
}

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

const generateId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

// ============================================================================
// USER DEFINITIONS
// ============================================================================

const users = [
  // ADMIN
  {
    id: 'ADMIN-001',
    email: 'admin.test@izara.com',
    password: 'IzaraAdmin@2024',
    role: 'admin',
    status: 'approved',
    name: 'System Administrator',
    phone: '+66 2 123 4567',
    dateOfBirth: '1985-03-15',
    isActive: true,
    isApproved: true,
    emailVerified: true,
    adminPrivileges: {
      canManageDoctors: true,
      canManagePatients: true,
      canManageAppointments: true,
      canViewAnalytics: true,
      canManageSettings: true,
      canAssignRoles: true,
      level: 'super_admin'
    }
  },
  
  // DOCTORS
  {
    id: 'DOC-001',
    email: 'doctor.test@izara.com',
    password: 'IzaraDoctor@2024',
    role: 'doctor',
    status: 'approved',
    name: 'Dr. Somchai Prasert',
    phone: '+66 81 234 5678',
    dateOfBirth: '1980-06-20',
    specialty: 'General Practice',
    medicalLicenseNumber: 'MD-123456',
    hospital: 'Bangkok General Hospital',
    yearsOfExperience: 15,
    isActive: true,
    isApproved: true,
    emailVerified: true
  },
  {
    id: 'DOC-002',
    email: 'doctor02.test@izara.com',
    password: 'IzaraDoctor@2024',
    role: 'doctor',
    status: 'pending',
    name: 'Dr. Sukanya Wongchai',
    phone: '+66 82 345 6789',
    dateOfBirth: '1988-09-10',
    specialty: 'Pediatrics',
    medicalLicenseNumber: 'MD-234567',
    hospital: 'Bumrungrad International Hospital',
    yearsOfExperience: 8,
    isActive: true,
    isApproved: false,
    emailVerified: true
  },
  {
    id: 'DOC-003',
    email: 'cardio.doctor@izara.com',
    password: 'IzaraDoctor@2024',
    role: 'doctor',
    status: 'approved',
    name: 'Dr. Preecha Cardiac',
    phone: '+66 83 456 7890',
    dateOfBirth: '1975-12-05',
    specialty: 'Cardiology',
    medicalLicenseNumber: 'MD-345678',
    hospital: 'Samitivej Hospital',
    yearsOfExperience: 20,
    isActive: true,
    isApproved: true,
    emailVerified: true
  },
  {
    id: 'DOC-INACTIVE-001',
    email: 'inactive.doctor@izara.com',
    password: 'InactiveDoc@2024',
    role: 'doctor',
    status: 'inactive',
    name: 'Dr. Inactive Status',
    phone: '+66 84 567 8901',
    dateOfBirth: '1982-04-18',
    specialty: 'Dermatology',
    medicalLicenseNumber: 'MD-456789',
    hospital: 'BNH Hospital',
    yearsOfExperience: 12,
    isActive: false,
    isApproved: true,
    emailVerified: true
  },
  {
    id: 'DOC-REJECTED-001',
    email: 'rejected.doctor@izara.com',
    password: 'RejectedDoc@2024',
    role: 'doctor',
    status: 'rejected',
    name: 'Dr. Rejected Application',
    phone: '+66 85 678 9012',
    dateOfBirth: '1990-07-22',
    specialty: 'Psychiatry',
    medicalLicenseNumber: 'MD-567890',
    hospital: 'Vejthani Hospital',
    yearsOfExperience: 5,
    isActive: false,
    isApproved: false,
    emailVerified: true,
    rejectionReason: 'Incomplete documentation'
  },
  {
    id: 'DOC-LOCKED-001',
    email: 'locked.doctor@izara.com',
    password: 'LockedDoc@2024',
    role: 'doctor',
    status: 'locked',
    name: 'Dr. Locked Account',
    phone: '+66 86 789 0123',
    dateOfBirth: '1983-11-30',
    specialty: 'Orthopedics',
    medicalLicenseNumber: 'MD-678901',
    hospital: 'Bangkok Hospital',
    yearsOfExperience: 10,
    isActive: false,
    isApproved: true,
    emailVerified: true,
    lockedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    lockReason: 'Multiple failed login attempts'
  },
  
  // PATIENT
  {
    id: 'PATIENT-001',
    email: 'demo.test@gmail.com',
    password: 'P@ssw0rd',
    role: 'patient',
    status: 'active',
    name: 'John Smith',
    phone: '+66 91 234 5678',
    dateOfBirth: '1990-05-15',
    isActive: true,
    emailVerified: true,
    bloodType: 'O+',
    allergies: ['Penicillin', 'Peanuts'],
    chronicConditions: ['Hypertension', 'Type 2 Diabetes']
  }
];

// ============================================================================
// MEDICAL DATA GENERATORS
// ============================================================================

function generateDoctorProfile(user) {
  if (user.role !== 'doctor') return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    specialty: user.specialty,
    medicalLicenseNumber: user.medicalLicenseNumber,
    hospital: user.hospital,
    phone: user.phone,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`,
    rating: Math.random() * 1 + 4, // 4.0 - 5.0
    yearsOfExperience: user.yearsOfExperience,
    
    qualifications: [
      'MD',
      `Board Certified - ${user.specialty}`,
      randomElement(['Fellowship in Advanced Medicine', 'Clinical Research Certification'])
    ],
    
    languages: ['Thai', 'English'],
    
    medicalSchool: randomElement([
      'Mahidol University Faculty of Medicine',
      'Chulalongkorn University Faculty of Medicine',
      'Siriraj Hospital'
    ]),
    
    boardCertifications: [user.specialty],
    
    consultationFee: Math.floor(Math.random() * 1000 + 500),
    
    availability: {
      monday: [{ start: '09:00', end: '17:00' }],
      tuesday: [{ start: '09:00', end: '17:00' }],
      wednesday: [{ start: '09:00', end: '17:00' }],
      thursday: [{ start: '09:00', end: '17:00' }],
      friday: [{ start: '09:00', end: '17:00' }],
      saturday: [{ start: '09:00', end: '13:00' }],
      sunday: []
    },
    
    bio: `Dr. ${user.name.split(' ').slice(1).join(' ')} is a dedicated ${user.specialty} specialist with ${user.yearsOfExperience} years of experience. Known for compassionate patient care and evidence-based treatment approaches.`,
    
    isApproved: user.isApproved,
    isActive: user.isActive,
    approvalStatus: user.status,
    
    statistics: {
      totalPatients: Math.floor(Math.random() * 500 + 100),
      totalConsultations: Math.floor(Math.random() * 1000 + 200),
      averageRating: Math.random() * 0.5 + 4.5,
      responseTime: Math.floor(Math.random() * 30 + 5) // minutes
    }
  };
}

function generatePatientProfile(user) {
  if (user.role !== 'patient') return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    dateOfBirth: user.dateOfBirth,
    age: new Date().getFullYear() - new Date(user.dateOfBirth).getFullYear(),
    gender: randomElement(['male', 'female']),
    bloodType: user.bloodType,
    
    address: {
      street: '123 Sukhumvit Road',
      district: 'Khlong Toei',
      city: 'Bangkok',
      province: 'Bangkok',
      postalCode: '10110',
      country: 'Thailand'
    },
    
    emergencyContact: {
      name: 'Jane Smith',
      relationship: 'Spouse',
      phone: '+66 92 345 6789'
    },
    
    allergies: user.allergies || [],
    chronicConditions: user.chronicConditions || [],
    
    medications: [
      {
        name: 'Metformin',
        dosage: '500mg',
        frequency: 'Twice daily',
        startDate: '2023-01-15',
        prescribedBy: 'DOC-001'
      },
      {
        name: 'Lisinopril',
        dosage: '10mg',
        frequency: 'Once daily',
        startDate: '2023-03-20',
        prescribedBy: 'DOC-003'
      }
    ],
    
    insurance: {
      provider: 'Thai Health Insurance',
      policyNumber: 'THI-123456789',
      expiryDate: '2025-12-31',
      coverageType: 'Premium'
    },
    
    preferences: {
      language: 'th',
      notifications: {
        email: true,
        sms: true,
        push: true
      }
    },
    
    consentStatus: {
      pdpaConsent: true,
      consentDate: '2024-01-01T00:00:00Z',
      marketingConsent: false
    }
  };
}

function generateAppointments(doctorId, patientId) {
  const appointments = [];
  const now = new Date();
  
  // Past appointments
  for (let i = 0; i < 3; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (i * 7 + Math.floor(Math.random() * 7)));
    
    appointments.push({
      id: generateId('APT'),
      patientId: patientId,
      doctorId: doctorId,
      date: date.toISOString().split('T')[0],
      time: '10:00',
      duration: 30,
      type: randomElement(['consultation', 'follow-up', 'check-up']),
      status: 'completed',
      reason: randomElement([
        'Regular check-up',
        'Follow-up consultation',
        'Blood pressure monitoring',
        'Diabetes management'
      ]),
      notes: 'Patient doing well. Continue current treatment plan.',
      createdAt: new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    });
  }
  
  // Upcoming appointment
  const futureDate = new Date(now);
  futureDate.setDate(futureDate.getDate() + 7);
  
  appointments.push({
    id: generateId('APT'),
    patientId: patientId,
    doctorId: doctorId,
    date: futureDate.toISOString().split('T')[0],
    time: '14:00',
    duration: 30,
    type: 'consultation',
    status: 'confirmed',
    reason: 'Regular check-up',
    notes: '',
    createdAt: now.toISOString()
  });
  
  return appointments;
}

function generateEMRRecords(patientId, doctorId) {
  const records = [];
  const now = new Date();
  
  for (let i = 0; i < 3; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (i * 30 + Math.floor(Math.random() * 15)));
    
    records.push({
      id: generateId('EMR'),
      patientId: patientId,
      doctorId: doctorId,
      visitDate: date.toISOString(),
      visitType: randomElement(['consultation', 'follow-up', 'emergency']),
      
      chiefComplaint: randomElement([
        'Headache and dizziness',
        'Chest pain',
        'Abdominal pain',
        'Fever and cough'
      ]),
      
      vitals: {
        bloodPressure: `${Math.floor(Math.random() * 40 + 110)}/${Math.floor(Math.random() * 20 + 70)}`,
        heartRate: Math.floor(Math.random() * 30 + 60),
        temperature: (Math.random() * 2 + 36).toFixed(1),
        respiratoryRate: Math.floor(Math.random() * 10 + 12),
        oxygenSaturation: Math.floor(Math.random() * 5 + 95),
        weight: (Math.random() * 30 + 60).toFixed(1),
        height: Math.floor(Math.random() * 20 + 160),
        bmi: (Math.random() * 10 + 20).toFixed(1)
      },
      
      historyOfPresentIllness: 'Patient presents with complaints starting 2 days ago. Symptoms have been gradually worsening.',
      
      physicalExamination: {
        general: 'Alert and oriented, no acute distress',
        heent: 'Normal',
        cardiovascular: 'Regular rate and rhythm, no murmurs',
        respiratory: 'Clear to auscultation bilaterally',
        abdomen: 'Soft, non-tender',
        neurological: 'Cranial nerves intact, normal reflexes'
      },
      
      diagnosis: {
        primary: randomElement([
          'Essential Hypertension',
          'Type 2 Diabetes Mellitus',
          'Upper Respiratory Infection',
          'Gastroesophageal Reflux Disease'
        ]),
        secondary: [],
        icdCodes: ['I10', 'E11.9']
      },
      
      treatment: {
        medications: [
          {
            name: randomElement(['Metformin', 'Lisinopril', 'Atorvastatin']),
            dosage: '500mg',
            frequency: 'Twice daily',
            duration: '30 days'
          }
        ],
        procedures: [],
        referrals: []
      },
      
      plan: 'Continue current medications. Follow up in 4 weeks. Patient advised on lifestyle modifications.',
      
      followUpDate: new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      
      createdBy: doctorId,
      createdAt: date.toISOString(),
      lastModified: date.toISOString()
    });
  }
  
  return records;
}

function generatePrescriptions(patientId, doctorId) {
  const prescriptions = [];
  const now = new Date();
  
  const medications = [
    { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily' },
    { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily' },
    { name: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily at bedtime' },
    { name: 'Omeprazole', dosage: '20mg', frequency: 'Once daily before breakfast' }
  ];
  
  for (let i = 0; i < 2; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (i * 30));
    const med = medications[i];
    
    prescriptions.push({
      id: generateId('RX'),
      patientId: patientId,
      doctorId: doctorId,
      prescriptionDate: date.toISOString(),
      status: i === 0 ? 'active' : 'expired',
      
      medications: [
        {
          name: med.name,
          genericName: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: '30 days',
          quantity: 60,
          refills: 2,
          instructions: 'Take with food',
          warnings: ['Do not consume alcohol']
        }
      ],
      
      diagnosis: 'Hypertension / Diabetes Management',
      notes: 'Monitor blood pressure and glucose levels regularly',
      
      pharmacyInstructions: 'Dispense as written',
      
      validUntil: new Date(date.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      
      dispensed: i === 1,
      dispensedDate: i === 1 ? new Date(date.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString() : null,
      dispensedBy: i === 1 ? 'Bangkok Pharmacy' : null
    });
  }
  
  return prescriptions;
}

function generateLabOrders(patientId, doctorId) {
  const labOrders = [];
  const now = new Date();
  
  const tests = [
    { name: 'Complete Blood Count (CBC)', category: 'Hematology' },
    { name: 'Lipid Profile', category: 'Chemistry' },
    { name: 'HbA1c', category: 'Chemistry' },
    { name: 'Thyroid Function Test', category: 'Endocrinology' }
  ];
  
  for (let i = 0; i < 2; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (i * 60));
    const test = tests[i];
    
    labOrders.push({
      id: generateId('LAB'),
      patientId: patientId,
      doctorId: doctorId,
      orderDate: date.toISOString(),
      status: i === 0 ? 'pending' : 'completed',
      priority: randomElement(['routine', 'urgent']),
      
      tests: [
        {
          name: test.name,
          category: test.category,
          code: `LAB-${Math.floor(Math.random() * 9000 + 1000)}`,
          instructions: 'Fasting required'
        }
      ],
      
      clinicalIndication: 'Routine health check / Chronic disease monitoring',
      
      scheduledDate: new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      
      results: i === 1 ? {
        completedDate: new Date(date.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        findings: 'Results within normal limits',
        values: {
          hemoglobin: '14.5 g/dL',
          wbc: '7.2 x10^9/L',
          platelets: '250 x10^9/L'
        },
        interpretation: 'Normal',
        reviewedBy: doctorId,
        reviewedDate: new Date(date.getTime() + 11 * 24 * 60 * 60 * 1000).toISOString()
      } : null
    });
  }
  
  return labOrders;
}

function generateClinicalResources() {
  return {
    drugDatabase: [
      {
        id: 'DRUG-001',
        name: 'Metformin',
        genericName: 'Metformin Hydrochloride',
        brandNames: ['Glucophage', 'Fortamet'],
        class: 'Antidiabetic',
        category: 'Biguanide',
        indications: ['Type 2 Diabetes Mellitus', 'Polycystic Ovary Syndrome'],
        contraindications: ['Severe renal impairment', 'Metabolic acidosis'],
        dosage: {
          adult: '500-1000mg twice daily with meals',
          pediatric: 'Not recommended under 10 years'
        },
        sideEffects: ['Nausea', 'Diarrhea', 'Abdominal discomfort'],
        interactions: ['Alcohol', 'Contrast dye'],
        warnings: ['Risk of lactic acidosis', 'Monitor renal function']
      },
      {
        id: 'DRUG-002',
        name: 'Lisinopril',
        genericName: 'Lisinopril',
        brandNames: ['Prinivil', 'Zestril'],
        class: 'Antihypertensive',
        category: 'ACE Inhibitor',
        indications: ['Hypertension', 'Heart Failure', 'Post-MI'],
        contraindications: ['Pregnancy', 'Angioedema history'],
        dosage: {
          adult: '10-40mg once daily',
          pediatric: 'Based on weight'
        },
        sideEffects: ['Dry cough', 'Dizziness', 'Headache'],
        interactions: ['NSAIDs', 'Potassium supplements'],
        warnings: ['Monitor potassium levels', 'Check renal function']
      },
      {
        id: 'DRUG-003',
        name: 'Atorvastatin',
        genericName: 'Atorvastatin Calcium',
        brandNames: ['Lipitor'],
        class: 'Lipid-lowering agent',
        category: 'HMG-CoA Reductase Inhibitor',
        indications: ['Hyperlipidemia', 'Cardiovascular disease prevention'],
        contraindications: ['Active liver disease', 'Pregnancy'],
        dosage: {
          adult: '10-80mg once daily at bedtime',
          pediatric: 'Based on weight for familial hypercholesterolemia'
        },
        sideEffects: ['Muscle pain', 'Headache', 'Nausea'],
        interactions: ['Grapefruit juice', 'Cyclosporine'],
        warnings: ['Monitor liver enzymes', 'Risk of rhabdomyolysis']
      }
    ],
    
    icd10Codes: [
      { code: 'I10', description: 'Essential (primary) hypertension', category: 'Cardiovascular' },
      { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', category: 'Endocrine' },
      { code: 'J00', description: 'Acute nasopharyngitis [common cold]', category: 'Respiratory' },
      { code: 'K21.9', description: 'Gastro-esophageal reflux disease without esophagitis', category: 'Digestive' },
      { code: 'M79.3', description: 'Panniculitis, unspecified', category: 'Musculoskeletal' },
      { code: 'R50.9', description: 'Fever, unspecified', category: 'Symptoms' }
    ],
    
    labTests: [
      {
        id: 'LAB-TEST-001',
        name: 'Complete Blood Count (CBC)',
        category: 'Hematology',
        description: 'Measures red blood cells, white blood cells, and platelets',
        normalRanges: {
          hemoglobin: '13.5-17.5 g/dL (male), 12.0-15.5 g/dL (female)',
          wbc: '4.5-11.0 x10^9/L',
          platelets: '150-400 x10^9/L'
        },
        preparationInstructions: 'No fasting required',
        turnaroundTime: '24 hours'
      },
      {
        id: 'LAB-TEST-002',
        name: 'Lipid Profile',
        category: 'Chemistry',
        description: 'Measures cholesterol and triglycerides',
        normalRanges: {
          totalCholesterol: '<200 mg/dL',
          ldl: '<100 mg/dL',
          hdl: '>40 mg/dL (male), >50 mg/dL (female)',
          triglycerides: '<150 mg/dL'
        },
        preparationInstructions: 'Fasting 12 hours required',
        turnaroundTime: '24 hours'
      },
      {
        id: 'LAB-TEST-003',
        name: 'HbA1c',
        category: 'Chemistry',
        description: 'Measures average blood glucose over 3 months',
        normalRanges: {
          normal: '<5.7%',
          prediabetes: '5.7-6.4%',
          diabetes: '≥6.5%'
        },
        preparationInstructions: 'No fasting required',
        turnaroundTime: '24-48 hours'
      }
    ],
    
    clinicalGuidelines: [
      {
        id: 'GUIDE-001',
        title: 'Hypertension Management Guidelines',
        category: 'Cardiovascular',
        summary: 'Evidence-based guidelines for diagnosis and treatment of hypertension',
        recommendations: [
          'Target BP <140/90 mmHg for most adults',
          'Target BP <130/80 mmHg for adults with diabetes or CKD',
          'Lifestyle modifications for all patients',
          'ACE inhibitor or ARB for patients with diabetes'
        ],
        lastUpdated: '2024-01-01'
      },
      {
        id: 'GUIDE-002',
        title: 'Type 2 Diabetes Management',
        category: 'Endocrine',
        summary: 'Comprehensive approach to Type 2 Diabetes management',
        recommendations: [
          'Target HbA1c <7% for most adults',
          'Metformin as first-line therapy',
          'Regular monitoring of blood glucose',
          'Patient education on lifestyle modifications'
        ],
        lastUpdated: '2024-01-01'
      }
    ]
  };
}

function generateMedicalContent() {
  return {
    articles: [
      {
        id: 'ARTICLE-001',
        title: 'Understanding Hypertension: A Patient Guide',
        category: 'Patient Education',
        author: 'DOC-003',
        publishDate: '2024-01-15',
        content: 'Hypertension, or high blood pressure, is a common condition that affects millions...',
        tags: ['hypertension', 'cardiovascular', 'patient-education'],
        readTime: '5 minutes',
        views: 1234
      },
      {
        id: 'ARTICLE-002',
        title: 'Managing Diabetes Through Diet and Exercise',
        category: 'Patient Education',
        author: 'DOC-001',
        publishDate: '2024-02-01',
        content: 'Type 2 diabetes management involves a comprehensive approach including medications...',
        tags: ['diabetes', 'lifestyle', 'diet', 'exercise'],
        readTime: '7 minutes',
        views: 2156
      },
      {
        id: 'ARTICLE-003',
        title: 'The Importance of Regular Health Screenings',
        category: 'Preventive Care',
        author: 'DOC-001',
        publishDate: '2024-03-10',
        content: 'Regular health screenings can detect diseases early when they are most treatable...',
        tags: ['prevention', 'screening', 'health-check'],
        readTime: '6 minutes',
        views: 987
      }
    ],
    
    videos: [
      {
        id: 'VIDEO-001',
        title: 'How to Measure Blood Pressure at Home',
        category: 'Patient Education',
        duration: '5:30',
        thumbnail: 'https://via.placeholder.com/640x360?text=Blood+Pressure',
        url: 'https://example.com/video1',
        author: 'DOC-003',
        uploadDate: '2024-01-20',
        views: 5432
      },
      {
        id: 'VIDEO-002',
        title: 'Understanding Your Lab Results',
        category: 'Patient Education',
        duration: '8:15',
        thumbnail: 'https://via.placeholder.com/640x360?text=Lab+Results',
        url: 'https://example.com/video2',
        author: 'DOC-001',
        uploadDate: '2024-02-15',
        views: 3210
      }
    ],
    
    infographics: [
      {
        id: 'INFOGRAPHIC-001',
        title: 'Blood Pressure Ranges Chart',
        category: 'Reference',
        imageUrl: 'https://via.placeholder.com/800x1200?text=BP+Chart',
        author: 'ADMIN-001',
        publishDate: '2024-01-01',
        downloads: 876
      }
    ]
  };
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function generateAllData() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🏥 GENERATING COMPREHENSIVE MOCK DATA');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // Check GCS connection
    console.log('📡 Checking GCS API connection...');
    const healthResponse = await fetch(`${GCS_API_URL}/api/health`);
    if (!healthResponse.ok) {
      throw new Error(`GCS API Server is not running on ${GCS_API_URL}. Please start it first.`);
    }
    console.log('✅ GCS API Server is healthy\n');

    // Initialize indexes
    let usersIndex = [];
    let doctorsList = [];
    let patientsList = [];
    let allAppointments = [];
    let pendingApprovals = [];

    console.log('👥 Creating users and profiles...\n');

    // Process each user
    for (const user of users) {
      console.log(`   Processing: ${user.name} (${user.email})`);

      // Create user credential
      const userCredential = {
        id: user.id,
        email: user.email,
        passwordHash: hashPassword(user.password),
        role: user.role,
        isActive: user.isActive,
        isApproved: user.isApproved,
        emailVerified: user.emailVerified,
        approvalStatus: user.status,
        createdAt: new Date().toISOString(),
        lastLogin: null,
        loginAttempts: 0,
        lockedUntil: user.lockedUntil || null,
        name: user.name,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        preferences: {
          theme: 'light',
          language: 'th',
          notifications: {
            email: true,
            push: true,
            sms: false
          }
        }
      };

      // Add role-specific data
      if (user.role === 'admin') {
        userCredential.adminPrivileges = user.adminPrivileges;
      } else if (user.role === 'doctor') {
        userCredential.doctorId = user.id;
        userCredential.medicalLicenseNumber = user.medicalLicenseNumber;
        userCredential.specialty = user.specialty;
        userCredential.hospital = user.hospital;
        userCredential.rejectionReason = user.rejectionReason;
        userCredential.lockReason = user.lockReason;
      }

      // Save user credential
      await writeToGCS(BUCKETS.credentials, `users/${user.id}.json`, userCredential);

      // Add to users index
      usersIndex.push({
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        approvalStatus: user.status
      });

      // Generate doctor profile
      if (user.role === 'doctor') {
        const doctorProfile = generateDoctorProfile(user);
        await writeToGCS(BUCKETS.doctor, `doctors/${user.id}.json`, doctorProfile);
        doctorsList.push(doctorProfile);

        // Add to pending approvals if status is pending
        if (user.status === 'pending') {
          pendingApprovals.push({
            id: user.id,
            email: user.email,
            name: user.name,
            specialty: user.specialty,
            medicalLicenseNumber: user.medicalLicenseNumber,
            submittedDate: new Date().toISOString(),
            status: 'pending'
          });
        }

        // Generate doctor-specific data for approved doctors
        if (user.isApproved && user.isActive) {
          // Generate schedule
          const schedule = {
            doctorId: user.id,
            weeklySchedule: doctorProfile.availability,
            exceptions: [],
            lastUpdated: new Date().toISOString()
          };
          await writeToGCS(BUCKETS.doctor, `schedules/${user.id}.json`, schedule);

          // Generate statistics
          const stats = {
            doctorId: user.id,
            period: 'monthly',
            ...doctorProfile.statistics,
            lastUpdated: new Date().toISOString()
          };
          await writeToGCS(BUCKETS.doctor, `statistics/${user.id}.json`, stats);
        }
      }

      // Generate patient profile
      if (user.role === 'patient') {
        const patientProfile = generatePatientProfile(user);
        await writeToGCS(BUCKETS.patient, `patients/${user.id}.json`, patientProfile);
        patientsList.push(patientProfile);

        // Generate patient medical data
        const approvedDoctors = users.filter(u => u.role === 'doctor' && u.isApproved && u.isActive);
        const primaryDoctor = approvedDoctors[0];

        if (primaryDoctor) {
          // Generate appointments
          const appointments = generateAppointments(primaryDoctor.id, user.id);
          for (const apt of appointments) {
            await writeToGCS(BUCKETS.appointments, `${apt.id}.json`, apt);
            allAppointments.push(apt);
          }

          // Generate EMR records
          const emrRecords = generateEMRRecords(user.id, primaryDoctor.id);
          for (const emr of emrRecords) {
            await writeToGCS(BUCKETS.patient, `emr/${user.id}/${emr.id}.json`, emr);
          }

          // Generate prescriptions
          const prescriptions = generatePrescriptions(user.id, primaryDoctor.id);
          for (const rx of prescriptions) {
            await writeToGCS(BUCKETS.patient, `prescriptions/${user.id}/${rx.id}.json`, rx);
          }

          // Generate lab orders
          const labOrders = generateLabOrders(user.id, primaryDoctor.id);
          for (const lab of labOrders) {
            await writeToGCS(BUCKETS.patient, `lab-orders/${user.id}/${lab.id}.json`, lab);
          }
        }
      }

      console.log(`      ✅ ${user.name} created successfully`);
    }

    // Save indexes
    console.log('\n📋 Saving indexes...');
    await writeToGCS(BUCKETS.credentials, 'users/index.json', usersIndex);
    await writeToGCS(BUCKETS.doctor, 'doctors.json', doctorsList);
    await writeToGCS(BUCKETS.patient, 'patients.json', patientsList);
    await writeToGCS(BUCKETS.appointments, 'index.json', allAppointments);
    await writeToGCS(BUCKETS.credentials, 'pending-approvals.json', pendingApprovals);
    console.log('   ✅ All indexes saved');

    // Generate clinical resources
    console.log('\n🏥 Generating clinical resources...');
    const clinicalResources = generateClinicalResources();
    await writeToGCS(BUCKETS.metadata, 'drug-database.json', clinicalResources.drugDatabase);
    await writeToGCS(BUCKETS.metadata, 'icd10-codes.json', clinicalResources.icd10Codes);
    await writeToGCS(BUCKETS.metadata, 'lab-tests.json', clinicalResources.labTests);
    await writeToGCS(BUCKETS.metadata, 'clinical-guidelines.json', clinicalResources.clinicalGuidelines);
    console.log('   ✅ Clinical resources created');

    // Generate medical content
    console.log('\n📚 Generating medical content...');
    const medicalContent = generateMedicalContent();
    await writeToGCS(BUCKETS.metadata, 'medical-articles.json', medicalContent.articles);
    await writeToGCS(BUCKETS.metadata, 'medical-videos.json', medicalContent.videos);
    await writeToGCS(BUCKETS.metadata, 'infographics.json', medicalContent.infographics);
    console.log('   ✅ Medical content created');

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ ALL DATA GENERATED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('📊 Summary:');
    console.log(`   👤 Admin Users: ${users.filter(u => u.role === 'admin').length}`);
    console.log(`   👨‍⚕️ Doctor Users: ${users.filter(u => u.role === 'doctor').length}`);
    console.log(`   🧑‍⚕️ Patient Users: ${users.filter(u => u.role === 'patient').length}`);
    console.log(`   📅 Appointments: ${allAppointments.length}`);
    console.log(`   💊 Drug Database: ${clinicalResources.drugDatabase.length} medications`);
    console.log(`   🧪 Lab Tests: ${clinicalResources.labTests.length} tests`);
    console.log(`   📄 ICD-10 Codes: ${clinicalResources.icd10Codes.length} codes`);
    console.log(`   📚 Articles: ${medicalContent.articles.length}`);
    console.log(`   🎥 Videos: ${medicalContent.videos.length}`);

    console.log('\n👥 TEST USERS:\n');
    
    console.log('═══ ADMIN ═══');
    console.log('Email: admin.test@izara.com');
    console.log('Password: IzaraAdmin@2024');
    console.log('Status: ✅ Approved\n');
    
    console.log('═══ DOCTORS ═══');
    console.log('1. Email: doctor.test@izara.com');
    console.log('   Password: IzaraDoctor@2024');
    console.log('   Status: ✅ Approved (General Practice)\n');
    
    console.log('2. Email: doctor02.test@izara.com');
    console.log('   Password: IzaraDoctor@2024');
    console.log('   Status: ⏳ Pending Approval (Pediatrics)\n');
    
    console.log('3. Email: cardio.doctor@izara.com');
    console.log('   Password: IzaraDoctor@2024');
    console.log('   Status: ✅ Approved (Cardiology)\n');
    
    console.log('4. Email: inactive.doctor@izara.com');
    console.log('   Password: InactiveDoc@2024');
    console.log('   Status: 🚫 Inactive (Dermatology)\n');
    
    console.log('5. Email: rejected.doctor@izara.com');
    console.log('   Password: RejectedDoc@2024');
    console.log('   Status: ❌ Rejected (Psychiatry)\n');
    
    console.log('6. Email: locked.doctor@izara.com');
    console.log('   Password: LockedDoc@2024');
    console.log('   Status: 🔒 Locked (Orthopedics)\n');
    
    console.log('═══ PATIENT ═══');
    console.log('Email: demo.test@gmail.com');
    console.log('Password: P@ssw0rd');
    console.log('Status: ✅ Active\n');

    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ GENERATION FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run generation
generateAllData();
