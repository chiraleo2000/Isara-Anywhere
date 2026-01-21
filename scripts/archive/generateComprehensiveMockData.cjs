/**
 * Comprehensive Mock Data Generation Script for Izara Telemedicine Platform
 * 
 * This script generates mock data for all users, clinical scenarios, and edge cases:
 * - Admin, Doctor (approved and pending), Patient users
 * - Clinical data: prescriptions, lab orders, imaging requests
 * - Appointments across different statuses
 * - PDPA consents and audit logs
 * - Edge cases: inactive users, failed logins, duplicate scenarios
 * 
 * Run: node scripts/generateComprehensiveMockData.cjs
 * Requires: GCS API Server running on port 3012
 */

const crypto = require('crypto');
const http = require('http');

// ============================================================================
// CONFIGURATION (from .env)
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
// MOCK USER DATA (As specified by user)
// ============================================================================

const MOCK_USERS = {
  admin: {
    id: 'ADMIN-001',
    email: 'admin.test@izara.com',
    password: 'IzaraAdmin@2024',
    name: 'Dr. Admin Test',
    nameTh: 'นพ. แอดมิน เทสต์',
    medicalLicenseNumber: 'MD-ADMIN-001',
    specialty: 'General Practitioner',
    specialtyTh: 'แพทย์เวชปฏิบัติทั่วไป',
    phone: '+66812345678',
    role: 'admin',
    isAdmin: true,
    isActive: true,
    isApproved: true,
    approvalStatus: 'approved'
  },
  doctor1: {
    id: 'DOC-001',
    email: 'doctor.test@izara.com',
    password: 'IzaraDoctor@2024',
    name: 'Dr. Doctor Test',
    nameTh: 'นพ. ด็อกเตอร์ เทสต์',
    medicalLicenseNumber: 'MD-DOC-001',
    specialty: 'General Practitioner',
    specialtyTh: 'แพทย์เวชปฏิบัติทั่วไป',
    phone: '+66812345679',
    role: 'doctor',
    isAdmin: false,
    isActive: true,
    isApproved: true,
    approvalStatus: 'approved'
  },
  doctor2: {
    id: 'DOC-002',
    email: 'doctor02.test@izara.com',
    password: 'IzaraDoctor@2024',
    name: 'Dr. Gastro Specialist',
    nameTh: 'นพ. ผู้เชี่ยวชาญทางเดินอาหาร',
    medicalLicenseNumber: 'MD-DOC-002',
    specialty: 'Gastroenterologist',
    specialtyTh: 'แพทย์ผู้เชี่ยวชาญด้านทางเดินอาหาร',
    phone: '+66812345680',
    role: 'doctor',
    isAdmin: false,
    isActive: false, // Pending approval
    isApproved: false,
    approvalStatus: 'pending' // Admin needs to approve this doctor
  },
  patient1: {
    id: 'PATIENT-001',
    email: 'demo.test@gmail.com',
    password: 'P@ssw0rd',
    name: 'Demo Patient',
    nameTh: 'ผู้ป่วย เดโม',
    phone: '+66899999999',
    role: 'patient',
    dateOfBirth: '1990-05-15',
    gender: 'male',
    idNumber: '1234567890123',
    bloodType: 'O+',
    allergies: ['Penicillin', 'Aspirin'],
    chronicConditions: ['Hypertension', 'Type 2 Diabetes'],
    currentMedications: ['Metformin 500mg', 'Lisinopril 10mg']
  }
};

// Edge case users
const EDGE_CASE_USERS = {
  inactiveDoctor: {
    id: 'DOC-INACTIVE-001',
    email: 'inactive.doctor@izara.com',
    password: 'InactiveDoc@2024',
    name: 'Dr. Inactive Doctor',
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
  rejectedDoctor: {
    id: 'DOC-REJECTED-001',
    email: 'rejected.doctor@izara.com',
    password: 'RejectedDoc@2024',
    name: 'Dr. Rejected Doctor',
    medicalLicenseNumber: 'MD-INVALID-001',
    specialty: 'Cardiology',
    role: 'doctor',
    isAdmin: false,
    isActive: false,
    isApproved: false,
    approvalStatus: 'rejected',
    rejectedAt: new Date().toISOString(),
    rejectionReason: 'Invalid medical license'
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
// CLINICAL MOCK DATA
// ============================================================================

const MOCK_PRESCRIPTIONS = [
  {
    id: 'RX-2024-001',
    patientId: 'PATIENT-001',
    doctorId: 'DOC-001',
    medications: [
      {
        drugName: 'Metformin',
        genericName: 'Metformin Hydrochloride',
        dosage: '500mg',
        strength: '500mg',
        route: 'oral',
        frequency: 'twice daily',
        duration: '30 days',
        quantity: 60,
        refills: 2,
        instructions: 'Take with meals to reduce stomach upset'
      },
      {
        drugName: 'Lisinopril',
        genericName: 'Lisinopril',
        dosage: '10mg',
        strength: '10mg',
        route: 'oral',
        frequency: 'once daily',
        duration: '30 days',
        quantity: 30,
        refills: 2,
        instructions: 'Take in the morning'
      }
    ],
    status: 'dispensed',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    dispensedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'RX-2024-002',
    patientId: 'PATIENT-001',
    doctorId: 'DOC-001',
    medications: [
      {
        drugName: 'Omeprazole',
        genericName: 'Omeprazole',
        dosage: '20mg',
        strength: '20mg',
        route: 'oral',
        frequency: 'once daily',
        duration: '14 days',
        quantity: 14,
        refills: 0,
        instructions: 'Take 30 minutes before breakfast'
      }
    ],
    status: 'pending',
    createdAt: new Date().toISOString()
  }
];

const MOCK_LAB_ORDERS = [
  {
    id: 'LAB-2024-001',
    patientId: 'PATIENT-001',
    doctorId: 'DOC-001',
    tests: [
      { code: 'CBC', name: 'Complete Blood Count', panel: 'Hematology' },
      { code: 'HBA1C', name: 'Hemoglobin A1c', panel: 'Diabetes' },
      { code: 'LIPID', name: 'Lipid Panel', panel: 'Cardiovascular' }
    ],
    urgency: 'routine',
    status: 'completed',
    orderedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    collectedAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    results: {
      CBC: {
        WBC: { value: 7.5, unit: '10^9/L', normalRange: '4.5-11.0', status: 'normal' },
        RBC: { value: 4.8, unit: '10^12/L', normalRange: '4.5-5.5', status: 'normal' },
        Hemoglobin: { value: 14.2, unit: 'g/dL', normalRange: '12.0-16.0', status: 'normal' },
        Hematocrit: { value: 42, unit: '%', normalRange: '37-47', status: 'normal' }
      },
      HBA1C: { value: 7.2, unit: '%', normalRange: '<5.7', status: 'high' },
      LIPID: {
        TotalCholesterol: { value: 210, unit: 'mg/dL', normalRange: '<200', status: 'high' },
        LDL: { value: 130, unit: 'mg/dL', normalRange: '<100', status: 'high' },
        HDL: { value: 45, unit: 'mg/dL', normalRange: '>40', status: 'normal' },
        Triglycerides: { value: 175, unit: 'mg/dL', normalRange: '<150', status: 'high' }
      }
    }
  },
  {
    id: 'LAB-2024-002',
    patientId: 'PATIENT-001',
    doctorId: 'DOC-001',
    tests: [
      { code: 'CMP', name: 'Comprehensive Metabolic Panel', panel: 'Chemistry' }
    ],
    urgency: 'urgent',
    status: 'ordered',
    orderedAt: new Date().toISOString()
  }
];

const MOCK_IMAGING_ORDERS = [
  {
    id: 'IMG-2024-001',
    patientId: 'PATIENT-001',
    doctorId: 'DOC-001',
    type: 'X-ray',
    bodyPart: 'Chest',
    indication: 'Routine screening, history of hypertension',
    urgency: 'routine',
    status: 'completed',
    orderedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    scheduledAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
    findings: 'No acute cardiopulmonary abnormality. Heart size is normal.',
    impression: 'Normal chest X-ray'
  },
  {
    id: 'IMG-2024-002',
    patientId: 'PATIENT-001',
    doctorId: 'DOC-001',
    type: 'Ultrasound',
    bodyPart: 'Abdomen',
    indication: 'Evaluate for fatty liver disease',
    urgency: 'routine',
    status: 'scheduled',
    orderedAt: new Date().toISOString(),
    scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const MOCK_APPOINTMENTS = [
  {
    id: 'APT-2024-001',
    patientId: 'PATIENT-001',
    patientName: 'Demo Patient',
    doctorId: 'DOC-001',
    doctorName: 'Dr. Doctor Test',
    doctorSpecialty: 'General Practitioner',
    appointmentDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    appointmentTime: '10:00',
    type: 'telehealth',
    status: 'confirmed',
    symptoms: {
      mainSymptom: 'Follow-up for diabetes management',
      description: 'Routine follow-up to review blood sugar levels and medication effectiveness',
      duration: 'Ongoing',
      severity: 'mild'
    },
    meetingLink: 'https://meet.google.com/izara-demo-001',
    createdAt: new Date().toISOString()
  },
  {
    id: 'APT-2024-002',
    patientId: 'PATIENT-001',
    patientName: 'Demo Patient',
    doctorId: 'DOC-001',
    doctorName: 'Dr. Doctor Test',
    doctorSpecialty: 'General Practitioner',
    appointmentDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    appointmentTime: '14:00',
    type: 'in_person',
    status: 'completed',
    symptoms: {
      mainSymptom: 'Annual physical examination',
      description: 'Complete health check-up',
      duration: 'N/A',
      severity: 'none'
    },
    result: {
      diagnosis: 'Overall good health, well-controlled diabetes and hypertension',
      prescriptions: ['RX-2024-001'],
      labOrders: ['LAB-2024-001'],
      followUpDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    },
    completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'APT-2024-003',
    patientId: 'PATIENT-001',
    patientName: 'Demo Patient',
    doctorId: 'DOC-001',
    doctorName: 'Dr. Doctor Test',
    doctorSpecialty: 'General Practitioner',
    appointmentDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    appointmentTime: '09:00',
    type: 'telehealth',
    status: 'cancelled',
    symptoms: {
      mainSymptom: 'Headache',
      description: 'Recurring headaches for past 3 days',
      duration: '3 days',
      severity: 'moderate'
    },
    cancelledAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
    cancellationReason: 'Patient requested reschedule'
  },
  // New appointment types for pool workflow
  {
    id: 'APT-2024-004',
    patientId: 'PATIENT-001',
    patientName: 'Demo Patient',
    doctorId: null, // No doctor assigned - in pool
    doctorName: null,
    doctorSpecialty: null,
    appointmentDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    appointmentTime: '11:00',
    type: 'telehealth',
    status: 'in_pool',
    assignmentType: 'system', // Patient chose "Let system assign doctor"
    symptoms: {
      mainSymptom: 'Skin rash',
      description: 'Red itchy rash on arms for 2 days',
      duration: '2 days',
      severity: 'moderate'
    },
    poolEntry: {
      addedAt: new Date().toISOString(),
      priority: 'medium',
      reason: 'patient_no_preference'
    },
    createdAt: new Date().toISOString()
  },
  {
    id: 'APT-2024-005',
    patientId: 'PATIENT-001',
    patientName: 'Demo Patient',
    doctorId: 'DOC-001',
    doctorName: 'Dr. Doctor Test',
    doctorSpecialty: 'General Practitioner',
    appointmentDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    appointmentTime: '15:00',
    type: 'telehealth',
    status: 'awaiting_doctor_response',
    assignmentType: 'selected', // Patient selected specific doctor
    symptoms: {
      mainSymptom: 'Persistent cough',
      description: 'Dry cough for 1 week, no fever',
      duration: '1 week',
      severity: 'mild'
    },
    requestedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    id: 'APT-2024-006',
    patientId: 'PATIENT-001',
    patientName: 'Demo Patient',
    doctorId: 'DOC-001',
    doctorName: 'Dr. Doctor Test',
    doctorSpecialty: 'General Practitioner',
    appointmentDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    appointmentTime: '10:00',
    type: 'telehealth',
    status: 'rescheduled',
    assignmentType: 'system',
    symptoms: {
      mainSymptom: 'Stomach pain',
      description: 'Upper abdominal pain after meals',
      duration: '3 days',
      severity: 'moderate'
    },
    missedAttempts: 1,
    lastRescheduledAt: new Date().toISOString(),
    rescheduledReason: 'missed_meeting_auto_reschedule',
    createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Appointment Pool Mock Data
const MOCK_APPOINTMENT_POOL = [
  {
    id: 'POOL-001',
    appointmentId: 'APT-2024-004',
    patientId: 'PATIENT-001',
    patientName: 'Demo Patient',
    symptoms: ['Skin rash', 'Red itchy rash on arms for 2 days'],
    type: 'telehealth',
    priority: 'medium',
    preferredDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    preferredTime: '11:00',
    reason: 'patient_no_preference',
    addedAt: new Date().toISOString(),
    status: 'awaiting_assignment',
    claimedBy: null,
    assignedBy: null,
    requiresAdminApproval: false
  },
  {
    id: 'POOL-002',
    appointmentId: null,
    patientId: 'PATIENT-001',
    patientName: 'Demo Patient',
    symptoms: ['Joint pain', 'Swelling in knee joint'],
    type: 'telehealth',
    priority: 'high',
    preferredDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    preferredTime: '09:00',
    reason: 'max_missed_attempts',
    addedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'awaiting_admin_approval',
    claimedBy: null,
    assignedBy: null,
    requiresAdminApproval: true,
    missedAttempts: 3
  }
];

// Meeting Time Rules
const MOCK_MEETING_RULES = {
  allowJoinBefore: 15, // Can join 15 minutes before scheduled time
  allowJoinAfter: 30, // Can join up to 30 minutes after scheduled time
  autoRescheduleOnMiss: true,
  rescheduleToNextWeek: true,
  maxMissedAttempts: 3
};

// Reschedule Records for audit
const MOCK_RESCHEDULE_RECORDS = [
  {
    appointmentId: 'APT-2024-006',
    originalDate: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    originalTime: '10:00',
    newDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    newTime: '10:00',
    missedAttempt: 1,
    reason: 'ผู้เข้าร่วมไม่เข้าประชุมภายในเวลาที่กำหนด',
    rescheduledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    rescheduledBy: 'system',
    notificationSent: true
  }
];

const MOCK_EMR_RECORDS = [
  {
    id: 'EMR-2024-001',
    patientId: 'PATIENT-001',
    doctorId: 'DOC-001',
    encounterDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    encounterType: 'consultation',
    template: 'SOAP',
    chiefComplaint: 'Annual physical examination and follow-up for diabetes',
    historyOfPresentIllness: 'Patient presents for routine annual physical. Reports good compliance with medications. Occasional mild fatigue in afternoons. No chest pain, shortness of breath, or other concerning symptoms.',
    vitalSigns: {
      bloodPressure: { systolic: 128, diastolic: 82, unit: 'mmHg' },
      heartRate: { value: 72, unit: 'bpm' },
      temperature: { value: 36.6, unit: '°C' },
      respiratoryRate: { value: 16, unit: '/min' },
      oxygenSaturation: { value: 98, unit: '%' },
      weight: { value: 75, unit: 'kg' },
      height: { value: 170, unit: 'cm' },
      bmi: 26.0
    },
    physicalExam: {
      general: 'Well-appearing, no acute distress',
      cardiovascular: 'Regular rate and rhythm, no murmurs',
      respiratory: 'Clear to auscultation bilaterally',
      abdomen: 'Soft, non-tender, no organomegaly',
      extremities: 'No edema, pulses intact'
    },
    assessment: 'Type 2 Diabetes Mellitus, moderately controlled. Hypertension, well controlled.',
    diagnosis: [
      { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', type: 'primary' },
      { code: 'I10', description: 'Essential (primary) hypertension', type: 'secondary' }
    ],
    plan: 'Continue current medications. Order lab work to check HbA1c and lipid panel. Follow up in 3 months.',
    prescriptions: ['RX-2024-001'],
    labOrders: ['LAB-2024-001'],
    imagingOrders: ['IMG-2024-001'],
    status: 'finalized',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    finalizedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    signedBy: 'DOC-001'
  }
];

const MOCK_MEDICAL_ARTICLES = [
  {
    id: 'ART-001',
    title: 'Understanding Type 2 Diabetes',
    summary: 'A comprehensive guide to managing Type 2 Diabetes through diet and lifestyle changes.',
    content: '# Understanding Type 2 Diabetes\\n\\nType 2 diabetes is a chronic condition that affects the way your body processes blood sugar (glucose). \\n\\n## Key Management Strategies\\n1. **Healthy Eating**: Focus on fruits, vegetables, and whole grains.\\n2. **Regular Exercise**: Aim for 30 minutes of moderate activity most days.\\n3. **Medication Adherence**: Take your medications as prescribed.\\n\\n## Monitoring\\nRegularly check your blood sugar levels as advised by your doctor.',
    authorId: 'DOC-001',
    authorName: 'Dr. Doctor Test',
    category: 'Chronic Disease',
    tags: ['Diabetes', 'Health', 'Lifestyle'],
    publishedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'published',
    views: 150,
    likes: 25,
    imageUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=500&q=60'
  },
  {
    id: 'ART-002',
    title: 'Hypertension: The Silent Killer',
    summary: 'Why high blood pressure is dangerous and how to keep it under control.',
    content: '# Hypertension: The Silent Killer\\n\\nHigh blood pressure often has no symptoms, but it can lead to serious health problems like heart disease and stroke.\\n\\n## Risk Factors\\n- Age\\n- Family history\\n- Being overweight\\n- Not being physically active\\n\\n## Prevention\\n- Eat a healthy diet with less salt\\n- Exercise regularly\\n- Maintain a healthy weight',
    authorId: 'DOC-001',
    authorName: 'Dr. Doctor Test',
    category: 'Cardiology',
    tags: ['Hypertension', 'Heart Health'],
    publishedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'published',
    views: 89,
    likes: 12,
    imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=500&q=60'
  },
  {
    id: 'ART-003',
    title: 'Healthy Eating for a Healthy Heart',
    summary: 'Tips for a heart-healthy diet.',
    content: '# Healthy Eating for a Healthy Heart\\n\\nEating a healthy diet is one of the best things you can do for your heart.\\n\\n## Tips\\n- Eat more fruits and vegetables\\n- Choose whole grains\\n- Limit unhealthy fats\\n- Reduce salt intake',
    authorId: 'ADMIN-001',
    authorName: 'Dr. Admin Test',
    category: 'Nutrition',
    tags: ['Diet', 'Heart Health', 'Nutrition'],
    publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'published',
    views: 45,
    likes: 8,
    imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=500&q=60'
  }
];

const MOCK_MEDICAL_JOURNEY = {
  patientId: 'PATIENT-001',
  timeline: [
    {
      id: 'EVT-001',
      date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      type: 'diagnosis',
      title: 'Diagnosed with Type 2 Diabetes',
      description: 'Initial diagnosis following routine blood work showing elevated HbA1c.',
      provider: 'Dr. Previous Doctor',
      location: 'General Hospital'
    },
    {
      id: 'EVT-002',
      date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
      type: 'medication_start',
      title: 'Started Metformin',
      description: 'Prescribed Metformin 500mg twice daily.',
      provider: 'Dr. Doctor Test',
      location: 'Izara Medical Center'
    },
    {
      id: 'EVT-003',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      type: 'appointment',
      title: 'Annual Physical Exam',
      description: 'Routine check-up. BP 128/82. Weight stable.',
      provider: 'Dr. Doctor Test',
      location: 'Izara Medical Center'
    }
  ]
};

const MOCK_PDPA_CONSENTS = [
  {
    id: 'CONSENT-2024-001',
    patientId: 'PATIENT-001',
    doctorId: 'DOC-001',
    doctorName: 'Dr. Doctor Test',
    dataTypes: ['demographics', 'medical_history', 'lab_results', 'medications', 'vital_signs', 'emr_records'],
    status: 'granted',
    grantedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000).toISOString(),
    auditLog: [
      {
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        doctorId: 'DOC-001',
        dataAccessed: ['demographics', 'medical_history', 'vital_signs'],
        purpose: 'Annual physical examination'
      }
    ]
  }
];

const MOCK_LIVING_WILL = {
  id: 'LW-2024-001',
  patientId: 'PATIENT-001',
  status: 'active',
  decisions: {
    cpr: false,
    artificialNutrition: false,
    mechanicalVentilation: false,
    dialysis: true,
    antibiotics: true,
    painManagement: true
  },
  witnesses: [
    { name: 'Witness One', relationship: 'Family member', date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() },
    { name: 'Witness Two', relationship: 'Friend', date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() }
  ],
  healthcareProxy: {
    name: 'Emergency Contact Name',
    relationship: 'Spouse',
    phone: '+66899999998',
    email: 'emergency.contact@email.com'
  },
  createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function hashPasswordSHA256(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// For bcrypt-compatible hash (base64 encoded for simple comparison)
function hashPasswordBase64(password) {
  return Buffer.from(password).toString('base64');
}

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, GCS_API_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
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
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(result);
          } else {
            reject(new Error(result.error || `HTTP ${res.statusCode}`));
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({});
          } else {
            reject(new Error(`Failed to parse response: ${body}`));
          }
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

async function writeToGCS(bucket, path, data) {
  return makeRequest('POST', '/api/storage/write', {
    bucket: bucket,
    path: path,
    data: data,
    makePublic: true,
  });
}

async function checkApiServer() {
  try {
    await makeRequest('GET', '/api/health');
    return true;
  } catch (e) {
    return false;
  }
}

// ============================================================================
// USER CREDENTIAL CREATION
// ============================================================================

function createDoctorCredential(user) {
  const now = new Date().toISOString();
  const bcrypt = require('bcryptjs');
  
  return {
    id: user.id,
    email: user.email.toLowerCase().trim(),
    passwordHash: bcrypt.hashSync(user.password, 10),
    role: user.role || 'doctor',
    doctorId: user.id,
    medicalLicenseNumber: user.medicalLicenseNumber,
    isActive: user.isActive !== false,
    isApproved: user.isApproved !== false,
    approvalStatus: user.approvalStatus || 'approved',
    isAdmin: user.isAdmin || false,
    emailVerified: true,
    createdAt: user.createdAt || now,
    lastLogin: user.isActive ? now : null,
    loginAttempts: user.loginAttempts || 0,
    lockedUntil: user.lockedUntil || null,
    preferences: {
      theme: 'light',
      language: 'en',
      notifications: { email: true, push: true, sms: false }
    },
    name: user.name,
    nameTh: user.nameTh,
    phone: user.phone,
    dateOfBirth: user.dateOfBirth || null,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`,
    specialty: user.specialty,
    specialtyTh: user.specialtyTh,
    // Admin privileges if admin
    ...(user.isAdmin && {
      adminPrivileges: {
        canApproveUsers: true,
        canManageUsers: true,
        canViewAnalytics: true,
        canManageSettings: true
      }
    }),
    // Edge case fields
    ...(user.deactivatedAt && { deactivatedAt: user.deactivatedAt, deactivationReason: user.deactivationReason }),
    ...(user.rejectedAt && { rejectedAt: user.rejectedAt, rejectionReason: user.rejectionReason }),
    ...(user.approvedAt && { approvedAt: user.approvedAt, approvedBy: user.approvedBy })
  };
}

function createPatientCredential(user) {
  const now = new Date().toISOString();
  
  return {
    id: user.id,
    patientId: user.id,
    email: user.email.toLowerCase().trim(),
    passwordHash: hashPasswordBase64(user.password), // Patient portal uses base64
    role: 'patient',
    isActive: true,
    emailVerified: true,
    createdAt: now,
    lastLogin: now,
    profile: {
      id: user.id,
      email: user.email,
      name: user.name,
      nameTh: user.nameTh,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      idNumber: user.idNumber,
      bloodType: user.bloodType,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`
    }
  };
}

function createDoctorProfile(user) {
  return {
    id: user.id,
    name: user.name,
    nameTh: user.nameTh,
    specialty: user.specialty,
    specialtyTh: user.specialtyTh,
    email: user.email,
    medicalLicenseNumber: user.medicalLicenseNumber,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`,
    rating: 4.5,
    experience: '10 years',
    qualifications: ['MD', 'Board Certified'],
    hospital: 'Izara Medical Center',
    availableSlots: generateAvailableSlots(),
    isApproved: user.isApproved !== false,
    isActive: user.isActive !== false,
    phone: user.phone
  };
}

function createPatientRecord(user) {
  return {
    id: user.id,
    demographics: {
      name: user.name,
      nameTh: user.nameTh,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      idNumber: user.idNumber
    },
    contact: {
      phone: user.phone,
      email: user.email,
      address: {
        street: '123 Demo Street',
        district: 'Pathum Wan',
        city: 'Bangkok',
        postalCode: '10330',
        country: 'Thailand'
      },
      emergencyContact: {
        name: 'Emergency Contact',
        relationship: 'Spouse',
        phone: '+66899999998'
      }
    },
    medicalInfo: {
      bloodType: user.bloodType,
      allergies: user.allergies || [],
      chronicConditions: user.chronicConditions || [],
      currentMedications: user.currentMedications || []
    },
    consentStatus: {
      hasConsent: true,
      dataTypesAllowed: ['demographics', 'medical_history', 'lab_results', 'medications'],
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    },
    riskLevel: 'medium',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function generateAvailableSlots() {
  const slots = [];
  const now = new Date();
  
  for (let day = 1; day <= 14; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() + day);
    
    if (date.getDay() !== 0 && date.getDay() !== 6) { // Skip weekends
      slots.push({
        date: date.toISOString().split('T')[0],
        times: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00']
      });
    }
  }
  
  return slots;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  📦 COMPREHENSIVE MOCK DATA GENERATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Check API server
  console.log('🔍 Checking GCS API server...');
  const serverRunning = await checkApiServer();

  if (!serverRunning) {
    console.error('\n❌ ERROR: GCS API Server is not running!');
    console.error('Please start the server first: node server/gcsApiServer.cjs\n');
    process.exit(1);
  }

  console.log('✅ GCS API server is running\n');

  try {
    // ========================================================================
    // 1. CREATE USERS (Admin, Doctors, Patients)
    // ========================================================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  👥 CREATING USER ACCOUNTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const usersIndex = [];
    const doctors = [];
    const pendingApprovals = [];

    // Create Admin
    console.log('👨‍💼 Creating Admin user...');
    const adminCred = createDoctorCredential(MOCK_USERS.admin);
    await writeToGCS('credentials', `users/${adminCred.id}.json`, adminCred);
    usersIndex.push({ id: adminCred.id, email: adminCred.email, role: adminCred.role, isActive: adminCred.isActive, approvalStatus: adminCred.approvalStatus });
    doctors.push(createDoctorProfile(MOCK_USERS.admin));
    console.log(`   ✅ ${MOCK_USERS.admin.name} (${MOCK_USERS.admin.email})`);

    // Create Approved Doctor
    console.log('\n👨‍⚕️ Creating Approved Doctor...');
    const doc1Cred = createDoctorCredential(MOCK_USERS.doctor1);
    await writeToGCS('credentials', `users/${doc1Cred.id}.json`, doc1Cred);
    usersIndex.push({ id: doc1Cred.id, email: doc1Cred.email, role: doc1Cred.role, isActive: doc1Cred.isActive, approvalStatus: doc1Cred.approvalStatus });
    doctors.push(createDoctorProfile(MOCK_USERS.doctor1));
    console.log(`   ✅ ${MOCK_USERS.doctor1.name} (${MOCK_USERS.doctor1.email})`);

    // Create Pending Doctor (for admin approval testing)
    console.log('\n👨‍⚕️ Creating PENDING Doctor (for admin approval)...');
    const doc2Cred = createDoctorCredential(MOCK_USERS.doctor2);
    await writeToGCS('credentials', `users/${doc2Cred.id}.json`, doc2Cred);
    usersIndex.push({ id: doc2Cred.id, email: doc2Cred.email, role: doc2Cred.role, isActive: doc2Cred.isActive, approvalStatus: doc2Cred.approvalStatus });
    doctors.push(createDoctorProfile(MOCK_USERS.doctor2));
    pendingApprovals.push({
      userId: doc2Cred.id,
      email: doc2Cred.email,
      name: MOCK_USERS.doctor2.name,
      medicalLicenseNumber: MOCK_USERS.doctor2.medicalLicenseNumber,
      specialty: MOCK_USERS.doctor2.specialty,
      requestedAt: new Date().toISOString(),
      status: 'pending'
    });
    console.log(`   ⏳ ${MOCK_USERS.doctor2.name} (${MOCK_USERS.doctor2.email}) - PENDING APPROVAL`);

    // Create Edge Case Users
    console.log('\n⚠️  Creating Edge Case Users...');
    for (const [key, user] of Object.entries(EDGE_CASE_USERS)) {
      const edgeCred = createDoctorCredential(user);
      await writeToGCS('credentials', `users/${edgeCred.id}.json`, edgeCred);
      usersIndex.push({ id: edgeCred.id, email: edgeCred.email, role: edgeCred.role, isActive: edgeCred.isActive, approvalStatus: edgeCred.approvalStatus });
      doctors.push(createDoctorProfile(user));
      console.log(`   📝 ${user.name} (${key})`);
    }

    // Create Patient
    console.log('\n👤 Creating Patient user...');
    const patientCred = createPatientCredential(MOCK_USERS.patient1);
    await writeToGCS('credentials', `users/${patientCred.id}.json`, patientCred);
    // Patient stored separately in patient bucket
    await writeToGCS('patient', `users/${patientCred.id}.json`, patientCred);

    // Create patient record
    const patientRecord = createPatientRecord(MOCK_USERS.patient1);
    await writeToGCS('patient', `patients/${MOCK_USERS.patient1.id}.json`, patientRecord);

    // Add patient to patients list
    const patientsList = [patientRecord];
    await writeToGCS('patient', 'patients.json', patientsList);

    console.log(`   ✅ ${MOCK_USERS.patient1.name} (${MOCK_USERS.patient1.email})`);

    // Save users index and doctors list
    await writeToGCS('credentials', 'users/index.json', usersIndex);
    await writeToGCS('doctor', 'doctors.json', doctors);
    await writeToGCS('credentials', 'pending-approvals.json', pendingApprovals);

    console.log('\n✅ All user accounts created');

    // ========================================================================
    // 2. CREATE CLINICAL DATA
    // ========================================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  🏥 CREATING CLINICAL DATA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // EMR Records
    console.log('📋 Creating EMR records...');
    for (const emr of MOCK_EMR_RECORDS) {
      await writeToGCS('patient', `emr/${emr.patientId}/${emr.id}.json`, emr);
      console.log(`   ✅ ${emr.id}`);
    }
    await writeToGCS('patient', `emr/${MOCK_USERS.patient1.id}/index.json`, MOCK_EMR_RECORDS.map(e => ({ id: e.id, date: e.encounterDate, type: e.encounterType })));

    // Prescriptions
    console.log('\n💊 Creating prescriptions...');
    for (const rx of MOCK_PRESCRIPTIONS) {
      await writeToGCS('patient', `prescriptions/${rx.patientId}/${rx.id}.json`, rx);
      console.log(`   ✅ ${rx.id} (${rx.status})`);
    }
    await writeToGCS('patient', `prescriptions/${MOCK_USERS.patient1.id}/index.json`, MOCK_PRESCRIPTIONS);

    // Lab Orders
    console.log('\n🔬 Creating lab orders...');
    for (const lab of MOCK_LAB_ORDERS) {
      await writeToGCS('patient', `lab-orders/${lab.patientId}/${lab.id}.json`, lab);
      console.log(`   ✅ ${lab.id} (${lab.status})`);
    }
    await writeToGCS('patient', `lab-orders/${MOCK_USERS.patient1.id}/index.json`, MOCK_LAB_ORDERS);

    // Imaging Orders
    console.log('\n📷 Creating imaging orders...');
    for (const img of MOCK_IMAGING_ORDERS) {
      await writeToGCS('patient', `imaging-orders/${img.patientId}/${img.id}.json`, img);
      console.log(`   ✅ ${img.id} (${img.status})`);
    }
    await writeToGCS('patient', `imaging-orders/${MOCK_USERS.patient1.id}/index.json`, MOCK_IMAGING_ORDERS);

    console.log('\n✅ All clinical data created');

    // ========================================================================
    // 3. CREATE APPOINTMENTS
    // ========================================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  📅 CREATING APPOINTMENTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    for (const apt of MOCK_APPOINTMENTS) {
      await writeToGCS('appointments', `${apt.id}.json`, apt);
      console.log(`   ✅ ${apt.id} (${apt.status})`);
    }
    await writeToGCS('appointments', 'index.json', MOCK_APPOINTMENTS);

    // Create Appointment Pool
    console.log('\n📋 Creating Appointment Pool...');
    await writeToGCS('appointments', 'appointment-pool.json', MOCK_APPOINTMENT_POOL);
    for (const poolItem of MOCK_APPOINTMENT_POOL) {
      console.log(`   ✅ ${poolItem.id} (${poolItem.status} - ${poolItem.reason})`);
    }

    // Create Reschedule Records
    console.log('\n🔄 Creating Reschedule Records...');
    await writeToGCS('appointments', 'reschedule-records.json', MOCK_RESCHEDULE_RECORDS);
    console.log(`   ✅ ${MOCK_RESCHEDULE_RECORDS.length} reschedule records created`);

    console.log('\n✅ All appointments created');

    // ========================================================================
    // 4. CREATE PDPA CONSENTS
    // ========================================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  📜 CREATING PDPA CONSENTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    for (const consent of MOCK_PDPA_CONSENTS) {
      await writeToGCS('patient', `pdpa-consents/${consent.patientId}/${consent.id}.json`, consent);
      console.log(`   ✅ ${consent.id} (${consent.status})`);
    }
    await writeToGCS('patient', `pdpa-consents/${MOCK_USERS.patient1.id}/index.json`, MOCK_PDPA_CONSENTS);

    // Living Will
    console.log('\n📝 Creating Living Will...');
    await writeToGCS('patient', `living-will/${MOCK_LIVING_WILL.patientId}.json`, MOCK_LIVING_WILL);
    console.log(`   ✅ ${MOCK_LIVING_WILL.id}`);

    console.log('\n✅ All PDPA data created');

    // ========================================================================
    // 5. CREATE METADATA
    // ========================================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  📊 CREATING METADATA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // ICD-10 codes sample
    const icd10Codes = [
      { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' },
      { code: 'I10', description: 'Essential (primary) hypertension' },
      { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified' },
      { code: 'K21.0', description: 'Gastro-esophageal reflux disease with esophagitis' },
      { code: 'M54.5', description: 'Low back pain' }
    ];
    await writeToGCS('metadata', 'icd10-codes.json', icd10Codes);
    console.log('   ✅ ICD-10 codes');

    // Drug database sample
    const drugDatabase = [
      { name: 'Metformin', genericName: 'Metformin Hydrochloride', category: 'Antidiabetic', interactions: ['Alcohol', 'Contrast dye'] },
      { name: 'Lisinopril', genericName: 'Lisinopril', category: 'ACE Inhibitor', interactions: ['NSAIDs', 'Potassium supplements'] },
      { name: 'Omeprazole', genericName: 'Omeprazole', category: 'PPI', interactions: ['Clopidogrel', 'Methotrexate'] },
      { name: 'Atorvastatin', genericName: 'Atorvastatin Calcium', category: 'Statin', interactions: ['Gemfibrozil', 'Grapefruit'] },
      { name: 'Amlodipine', genericName: 'Amlodipine Besylate', category: 'Calcium Channel Blocker', interactions: ['Simvastatin', 'Cyclosporine'] }
    ];
    await writeToGCS('metadata', 'drug-database.json', drugDatabase);
    console.log('   ✅ Drug database');

    // Specialties
    const specialties = [
      { id: 'general', name: 'General Practitioner', nameTh: 'แพทย์เวชปฏิบัติทั่วไป' },
      { id: 'cardiology', name: 'Cardiologist', nameTh: 'แพทย์โรคหัวใจ' },
      { id: 'gastro', name: 'Gastroenterologist', nameTh: 'แพทย์ผู้เชี่ยวชาญด้านทางเดินอาหาร' },
      { id: 'pediatrics', name: 'Pediatrician', nameTh: 'กุมารแพทย์' },
      { id: 'internal', name: 'Internal Medicine', nameTh: 'อายุรแพทย์' }
    ];
    await writeToGCS('metadata', 'specialties.json', specialties);
    console.log('   ✅ Specialties');

    // Medical Articles (Shared Knowledge)
    await writeToGCS('metadata', 'health-education-articles.json', MOCK_MEDICAL_ARTICLES);
    console.log('   ✅ Health Education Articles');

    // Meeting Time Rules
    await writeToGCS('metadata', 'meeting-rules.json', MOCK_MEETING_RULES);
    console.log('   ✅ Meeting Time Rules (15 min before / 30 min after)');

    // Medical Journey (Personal Timeline)
    await writeToGCS('patient', `medical-journey/${MOCK_MEDICAL_JOURNEY.patientId}.json`, MOCK_MEDICAL_JOURNEY);
    console.log('   ✅ Medical Journey (Timeline)');

    console.log('\n✅ All metadata created');

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  ✅ MOCK DATA GENERATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('📦 Created Data:');
    console.log('   • Users: 1 Admin, 2 Doctors (1 pending), 3 Edge cases, 1 Patient');
    console.log('   • EMR Records: ' + MOCK_EMR_RECORDS.length);
    console.log('   • Prescriptions: ' + MOCK_PRESCRIPTIONS.length);
    console.log('   • Lab Orders: ' + MOCK_LAB_ORDERS.length);
    console.log('   • Imaging Orders: ' + MOCK_IMAGING_ORDERS.length);
    console.log('   • Appointments: ' + MOCK_APPOINTMENTS.length);
    console.log('   • Appointment Pool: ' + MOCK_APPOINTMENT_POOL.length);
    console.log('   • Reschedule Records: ' + MOCK_RESCHEDULE_RECORDS.length);
    console.log('   • Meeting Rules: 15 min before / 30 min after');
    console.log('   • PDPA Consents: ' + MOCK_PDPA_CONSENTS.length);
    console.log('   • Living Will: 1');

    console.log('\n🔐 TEST CREDENTIALS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n  👨‍💼 ADMIN:');
    console.log(`     Email: ${MOCK_USERS.admin.email}`);
    console.log(`     Password: ${MOCK_USERS.admin.password}`);
    console.log(`     ID: ${MOCK_USERS.admin.id}`);
    
    console.log('\n  👨‍⚕️ DOCTOR (Approved):');
    console.log(`     Email: ${MOCK_USERS.doctor1.email}`);
    console.log(`     Password: ${MOCK_USERS.doctor1.password}`);
    console.log(`     ID: ${MOCK_USERS.doctor1.id}`);
    
    console.log('\n  👨‍⚕️ DOCTOR (PENDING - needs admin approval):');
    console.log(`     Email: ${MOCK_USERS.doctor2.email}`);
    console.log(`     Password: ${MOCK_USERS.doctor2.password}`);
    console.log(`     ID: ${MOCK_USERS.doctor2.id}`);
    console.log(`     Specialty: ${MOCK_USERS.doctor2.specialty}`);
    
    console.log('\n  👤 PATIENT:');
    console.log(`     Email: ${MOCK_USERS.patient1.email}`);
    console.log(`     Password: ${MOCK_USERS.patient1.password}`);
    console.log(`     ID: ${MOCK_USERS.patient1.id}`);

    console.log('\n⚠️  EDGE CASE USERS:');
    for (const [key, user] of Object.entries(EDGE_CASE_USERS)) {
      console.log(`\n  📝 ${key.toUpperCase()}:`);
      console.log(`     Email: ${user.email}`);
      console.log(`     Password: ${user.password}`);
      console.log(`     Status: ${user.approvalStatus || 'N/A'}`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  💡 NEXT STEPS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  1. Start Doctor Portal: cd Isara-doctor-portal && npm run dev');
    console.log('  2. Start Patient Portal: cd Isara-patient-portal && npm run dev:all');
    console.log('  3. Run Selenium tests: node scripts/runSeleniumTests.cjs');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run
main();
