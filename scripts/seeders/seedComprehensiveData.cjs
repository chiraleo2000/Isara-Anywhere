/**
 * Comprehensive Demo Data Seeder for Izara Telemedicine
 * 
 * This script populates the PostgreSQL database with comprehensive demo data
 * for testing all workflows and features.
 * 
 * Usage: node scripts/seeders/seedComprehensiveData.cjs
 * 
 * @version 3.0.0
 * @updated 2026-01-21
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Database connection - Use Docker container hostname or env
const pool = new Pool({
  host: process.env.POSTGRES_HOST || process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.POSTGRES_PORT || process.env.DB_PORT || '5432'),
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'P@ssw0rd',
  database: process.env.POSTGRES_DB || 'izara_phase1'
});

// Password hashes (pre-computed for speed)
const PASSWORD_HASHES = {
  admin: '$2b$10$fx5arkpb8YI7lEK5lcHdXeksczdG.qloim/uWghlBZXyxv.dNo/wq', // IzaraAdmin@2024
  doctor: '$2b$10$aPN6uhBrLoms36C8/017be2GWqUqaPJa6WaTaZ8LrnwAeaf3GajrO', // IzaraDoctor@2024
  patient: '$2b$10$64bK0EpjyC7quRGJNvRqmuH/jX3mA4dzyzYa2vgA2q.H3ZxkQwAmy'  // P@ssw0rd
};

// ============================================================================
// DEMO DATA
// ============================================================================

const DEMO_USERS = {
  admins: [
    {
      id: 'ADMIN-TEST-001',
      email: 'admin.test@izara.com',
      name: 'Admin Test',
      nameThai: 'ผู้ดูแลระบบ ทดสอบ',
      privileges: {
        canManageDoctors: true,
        canManagePatients: true,
        canManageAppointments: true,
        canViewAnalytics: true,
        canManageSettings: true,
        level: 'super_admin'
      }
    },
    {
      id: 'ADMIN-STAFF-001',
      email: 'staff.admin@izara.com',
      name: 'Staff Admin',
      nameThai: 'เจ้าหน้าที่ ดูแลระบบ',
      privileges: {
        canManageDoctors: false,
        canManagePatients: true,
        canManageAppointments: true,
        canViewAnalytics: false,
        canManageSettings: false,
        level: 'moderator'
      }
    }
  ],
  doctors: [
    {
      id: 'DOC-TEST-001',
      email: 'doctor.test@izara.com',
      name: 'Doctor Test',
      nameThai: 'นายแพทย์ ทดสอบ ระบบ',
      specialty: 'Internal Medicine',
      specialtyThai: 'อายุรกรรม',
      hospital: 'Izara Test Hospital',
      hospitalThai: 'โรงพยาบาลอิซาร่า ทดสอบ',
      licenseNumber: 'TH-MD-2020-001',
      approvalStatus: 'approved'
    },
    {
      id: 'DOC-SOMCHAI-001',
      email: 'dr.somchai@izara.com',
      name: 'Dr. Somchai Prasert',
      nameThai: 'นพ.สมชาย ประเสริฐ',
      specialty: 'Cardiology',
      specialtyThai: 'หทัยวิทยา',
      hospital: 'Bangkok General Hospital',
      hospitalThai: 'โรงพยาบาลกรุงเทพ',
      licenseNumber: 'TH-MD-2015-042',
      approvalStatus: 'approved'
    },
    {
      id: 'DOC-SIRIPORN-001',
      email: 'dr.siriporn@izara.com',
      name: 'Dr. Siriporn Thongchai',
      nameThai: 'พญ.ศิริพร ทองชัย',
      specialty: 'Nephrology',
      specialtyThai: 'อายุรกรรมโรคไต',
      hospital: 'Bumrungrad Hospital',
      hospitalThai: 'โรงพยาบาลบำรุงราษฎร์',
      licenseNumber: 'TH-MD-2012-088',
      approvalStatus: 'approved'
    },
    {
      id: 'DOC-PENDING-001',
      email: 'dr.pending@hospital.com',
      name: 'Dr. New Pending',
      nameThai: 'นพ.รอ อนุมัติ',
      specialty: 'General Medicine',
      specialtyThai: 'เวชปฏิบัติทั่วไป',
      hospital: 'Private Clinic',
      hospitalThai: 'คลินิกส่วนตัว',
      licenseNumber: 'TH-MD-2024-999',
      approvalStatus: 'pending'
    }
  ],
  patients: [
    {
      id: 'PATIENT-SOMCHAI',
      email: 'Somchai.Mankong@gmail.com',
      name: 'Somchai Mankong',
      nameThai: 'นายสมชาย มั่นคง',
      phone: '0812345678',
      dateOfBirth: '1979-05-15',
      gender: 'male',
      nationalId: '1234567890123'
    },
    {
      id: 'PATIENT-ANAN',
      email: 'Anan.Khayanrian@gmail.com',
      name: 'Anan Khayanrian',
      nameThai: 'นายอนันต์ ขยันเรียน',
      phone: '0898765432',
      dateOfBirth: '1968-11-22',
      gender: 'male',
      nationalId: '1234567890456'
    },
    {
      id: 'PATIENT-DEMO',
      email: 'demo.test@gmail.com',
      name: 'Demo Test Patient',
      nameThai: 'นาย ทดสอบ ระบบ',
      phone: '0811111111',
      dateOfBirth: '1990-01-01',
      gender: 'male',
      nationalId: '1234567890789'
    },
    {
      id: 'PATIENT-SUDA',
      email: 'suda.lovely@gmail.com',
      name: 'Suda Lovely',
      nameThai: 'นางสุดา น่ารัก',
      phone: '0822222222',
      dateOfBirth: '1985-03-08',
      gender: 'female',
      nationalId: '1234567890111'
    },
    {
      id: 'PATIENT-NEW-001',
      email: 'new.patient@gmail.com',
      name: 'New Patient Test',
      nameThai: 'นาย ผู้ป่วยใหม่ ทดสอบ',
      phone: '0833333333',
      dateOfBirth: '1995-07-20',
      gender: 'male',
      nationalId: '1234567890222'
    }
  ]
};

const DEMO_PHR = [
  {
    id: 'PHR-ANAN',
    patientId: 'PATIENT-ANAN',
    demographics: { age: 58, gender: 'male', bloodType: 'A+' },
    allergies: [
      { name: 'Penicillin', severity: 'severe', reaction: 'Anaphylaxis' },
      { name: 'Sulfa drugs', severity: 'moderate', reaction: 'Rash' }
    ],
    chronicConditions: [
      { name: 'Type 2 Diabetes Mellitus', icd10: 'E11.9', diagnosedDate: '2018-03-15' },
      { name: 'Chronic Kidney Disease Stage 3b', icd10: 'N18.4', diagnosedDate: '2022-06-10', 
        details: 'eGFR 38 ml/min/1.73m2' }
    ],
    medications: [
      { name: 'Metformin', dose: '500mg', frequency: 'BID', notes: 'May need adjustment for CKD' },
      { name: 'Lisinopril', dose: '10mg', frequency: 'QD' },
      { name: 'Atorvastatin', dose: '20mg', frequency: 'QD' }
    ],
    clinicalDecisionSupport: {
      alerts: [{
        type: 'dose_adjustment',
        severity: 'warning',
        drug: 'Metformin',
        message: 'Consider dose reduction for eGFR < 45',
        guideline: 'KDIGO 2024'
      }]
    }
  },
  {
    id: 'PHR-SOMCHAI',
    patientId: 'PATIENT-SOMCHAI',
    demographics: { age: 45, gender: 'male', bloodType: 'O+' },
    allergies: [],
    chronicConditions: [
      { name: 'Hypertension', icd10: 'I10', diagnosedDate: '2020-01-15' }
    ],
    medications: [
      { name: 'Amlodipine', dose: '5mg', frequency: 'QD' }
    ]
  },
  {
    id: 'PHR-SUDA',
    patientId: 'PATIENT-SUDA',
    demographics: { age: 39, gender: 'female', bloodType: 'B+' },
    allergies: [
      { name: 'Aspirin', severity: 'mild', reaction: 'Stomach upset' }
    ],
    chronicConditions: [
      { name: 'Migraine', icd10: 'G43.9', diagnosedDate: '2015-08-20' }
    ],
    medications: [
      { name: 'Sumatriptan', dose: '50mg', frequency: 'PRN' }
    ]
  }
];

const DEMO_APPOINTMENTS = [
  {
    id: 'APT-001',
    patientId: 'PATIENT-SOMCHAI',
    doctorId: 'DOC-TEST-001',
    requestedDate: new Date().toISOString().split('T')[0],
    requestedTime: '09:00',
    confirmedDate: new Date().toISOString().split('T')[0],
    confirmedTime: '09:00',
    status: 'confirmed',
    symptoms: ['headache', 'fatigue'],
    symptomDescription: 'ปวดหัวและเหนื่อยมา 3 วัน',
    urgencyLevel: 'normal',
    jitsiRoomName: 'izara-apt-001'
  },
  {
    id: 'APT-002',
    patientId: 'PATIENT-ANAN',
    doctorId: 'DOC-TEST-001',
    requestedDate: new Date().toISOString().split('T')[0],
    requestedTime: '10:30',
    confirmedDate: new Date().toISOString().split('T')[0],
    confirmedTime: '10:30',
    status: 'confirmed',
    symptoms: ['diabetes_follow_up', 'kidney_check'],
    symptomDescription: 'นัดติดตามผลเบาหวานและโรคไต',
    urgencyLevel: 'normal',
    jitsiRoomName: 'izara-apt-002'
  },
  {
    id: 'APT-003',
    patientId: 'PATIENT-DEMO',
    doctorId: 'DOC-TEST-001',
    requestedDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    requestedTime: '14:00',
    confirmedDate: null,
    confirmedTime: null,
    status: 'pending',
    symptoms: ['chest_pain'],
    symptomDescription: 'เจ็บหน้าอกเป็นพักๆ',
    urgencyLevel: 'urgent',
    jitsiRoomName: null
  },
  {
    id: 'APT-004',
    patientId: 'PATIENT-SUDA',
    doctorId: 'DOC-SOMCHAI-001',
    requestedDate: new Date(Date.now() + 172800000).toISOString().split('T')[0], // Day after tomorrow
    requestedTime: '11:00',
    confirmedDate: null,
    confirmedTime: null,
    status: 'pending',
    symptoms: ['migraine', 'nausea'],
    symptomDescription: 'ไมเกรนรุนแรงร่วมกับคลื่นไส้',
    urgencyLevel: 'normal',
    jitsiRoomName: null
  },
  {
    id: 'APT-005',
    patientId: 'PATIENT-ANAN',
    doctorId: 'DOC-SIRIPORN-001',
    requestedDate: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
    requestedTime: '09:30',
    confirmedDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    confirmedTime: '09:30',
    status: 'completed',
    symptoms: ['kidney_follow_up'],
    symptomDescription: 'นัดติดตามผลโรคไตกับแพทย์เฉพาะทาง',
    urgencyLevel: 'normal',
    jitsiRoomName: 'izara-apt-005'
  }
];

const DEMO_KNOWLEDGE_BASE = [
  {
    title: 'KDIGO 2024 CKD Guideline - Metformin',
    content: 'Metformin dose adjustment for CKD: eGFR 30-45: Reduce dose by 50%. eGFR <30: Contraindicated. Monitor renal function every 3 months.',
    source: 'KDIGO 2024',
    category: 'nephrology',
    guidelineYear: '2024',
    language: 'en'
  },
  {
    title: 'ADA 2025 Diabetes Standards - Glucose Targets',
    content: 'A1C target <7% for most adults. Consider <8% for older adults with comorbidities. Fasting glucose 80-130 mg/dL.',
    source: 'ADA Standards of Care 2025',
    category: 'diabetes',
    guidelineYear: '2025',
    language: 'en'
  },
  {
    title: 'แนวทางปรับยา Metformin ในผู้ป่วยโรคไต',
    content: 'การปรับขนาดยา Metformin ตาม eGFR: 30-45: ลดขนาดยาลง 50%. <30: ห้ามใช้. ตรวจการทำงานของไตทุก 3 เดือน.',
    source: 'KDIGO 2024 (Thai)',
    category: 'nephrology',
    guidelineYear: '2024',
    language: 'th'
  },
  {
    title: 'แนวทางการรักษาความดันโลหิตสูง 2024',
    content: 'เป้าหมาย BP < 130/80 mmHg สำหรับผู้ป่วยเบาหวาน/โรคไต. ยาเลือกแรก: ACEi หรือ ARB สำหรับผู้ป่วยที่มี proteinuria.',
    source: 'Thai Hypertension Society 2024',
    category: 'cardiology',
    guidelineYear: '2024',
    language: 'th'
  },
  {
    title: 'Drug Interaction: NSAIDs and ACEi',
    content: 'NSAIDs reduce efficacy of ACE inhibitors. Risk of acute kidney injury increases when used together, especially in volume-depleted patients.',
    source: 'Clinical Pharmacology Database',
    category: 'pharmacology',
    guidelineYear: '2024',
    language: 'en'
  }
];

const DEMO_MEDICAL_CONTENT = [
  {
    id: 'content-001',
    titleThai: 'การดูแลสุขภาพหัวใจ',
    titleEnglish: 'Heart Health Care',
    contentThai: 'การดูแลหัวใจที่ดีเริ่มต้นจากการรับประทานอาหารที่มีประโยชน์ ออกกำลังกายสม่ำเสมอ และหลีกเลี่ยงความเครียด การตรวจสุขภาพประจำปีช่วยให้ตรวจพบปัญหาได้เร็ว',
    contentEnglish: 'Good heart care starts with eating healthy foods, exercising regularly, and avoiding stress. Annual checkups help detect problems early.',
    category: 'Cardiology',
    tags: ['heart', 'health', 'exercise'],
    status: 'published'
  },
  {
    id: 'content-002',
    titleThai: 'การจัดการโรคเบาหวาน',
    titleEnglish: 'Diabetes Management',
    contentThai: 'การควบคุมน้ำตาลในเลือดเป็นสิ่งสำคัญสำหรับผู้ป่วยเบาหวาน ควรตรวจน้ำตาลเป็นประจำและรับประทานยาตามแพทย์สั่ง หลีกเลี่ยงอาหารหวานและแป้งมากเกินไป',
    contentEnglish: 'Blood sugar control is important for diabetic patients. Regular monitoring and medication as prescribed are essential. Avoid excessive sugar and carbs.',
    category: 'Endocrinology',
    tags: ['diabetes', 'blood sugar', 'health'],
    status: 'published'
  },
  {
    id: 'content-003',
    titleThai: 'การดูแลผู้ป่วยโรคไตเรื้อรัง',
    titleEnglish: 'Chronic Kidney Disease Care',
    contentThai: 'ผู้ป่วยโรคไตเรื้อรังควรควบคุมอาหาร จำกัดโปรตีน โซเดียม และโพแทสเซียม ดื่มน้ำในปริมาณที่เหมาะสม และตรวจติดตามการทำงานของไตอย่างสม่ำเสมอ',
    contentEnglish: 'CKD patients should control diet, limit protein, sodium, and potassium. Drink appropriate amounts of water and monitor kidney function regularly.',
    category: 'Nephrology',
    tags: ['kidney', 'CKD', 'diet'],
    status: 'published'
  }
];

// ============================================================================
// SEEDING FUNCTIONS
// ============================================================================

async function seedUsers() {
  console.log('👤 Seeding users...');
  
  // Seed Admins
  for (const admin of DEMO_USERS.admins) {
    await pool.query(`
      INSERT INTO users (id, email, password_hash, role, name, name_thai, is_active, is_verified, is_approved, approval_status, is_admin, admin_privileges)
      VALUES ($1, $2, $3, 'admin', $4, $5, true, true, true, 'approved', true, $6)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        name_thai = EXCLUDED.name_thai,
        admin_privileges = EXCLUDED.admin_privileges
    `, [admin.id, admin.email, PASSWORD_HASHES.admin, admin.name, admin.nameThai, JSON.stringify(admin.privileges)]);
    console.log(`  ✅ Admin: ${admin.email}`);
  }

  // Seed Doctors
  for (const doctor of DEMO_USERS.doctors) {
    await pool.query(`
      INSERT INTO users (id, email, password_hash, role, name, name_thai, doctor_id, medical_license_number, specialty, hospital_name, is_active, is_verified, is_approved, approval_status)
      VALUES ($1, $2, $3, 'doctor', $4, $5, $1, $6, $7, $8, true, true, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        name_thai = EXCLUDED.name_thai,
        specialty = EXCLUDED.specialty,
        hospital_name = EXCLUDED.hospital_name,
        approval_status = EXCLUDED.approval_status,
        is_approved = EXCLUDED.is_approved
    `, [doctor.id, doctor.email, PASSWORD_HASHES.doctor, doctor.name, doctor.nameThai, 
        doctor.licenseNumber, doctor.specialty, doctor.hospital, 
        doctor.approvalStatus === 'approved', doctor.approvalStatus]);
    console.log(`  ✅ Doctor: ${doctor.email} (${doctor.approvalStatus})`);
  }

  // Seed Patients
  for (const patient of DEMO_USERS.patients) {
    await pool.query(`
      INSERT INTO users (id, email, password_hash, role, name, name_thai, patient_id, phone, date_of_birth, gender, national_id, is_active, is_verified, is_approved, approval_status)
      VALUES ($1, $2, $3, 'patient', $4, $5, $1, $6, $7, $8, $9, true, true, true, 'approved')
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        name_thai = EXCLUDED.name_thai,
        phone = EXCLUDED.phone,
        date_of_birth = EXCLUDED.date_of_birth
    `, [patient.id, patient.email, PASSWORD_HASHES.patient, patient.name, patient.nameThai,
        patient.phone, patient.dateOfBirth, patient.gender, patient.nationalId]);
    console.log(`  ✅ Patient: ${patient.email}`);
  }
}

async function seedPHR() {
  console.log('📋 Seeding PHR records...');
  
  for (const phr of DEMO_PHR) {
    await pool.query(`
      INSERT INTO phr (id, patient_id, demographics, allergies, chronic_conditions, medications, clinical_decision_support)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        demographics = EXCLUDED.demographics,
        allergies = EXCLUDED.allergies,
        chronic_conditions = EXCLUDED.chronic_conditions,
        medications = EXCLUDED.medications,
        clinical_decision_support = EXCLUDED.clinical_decision_support
    `, [phr.id, phr.patientId, JSON.stringify(phr.demographics), JSON.stringify(phr.allergies),
        JSON.stringify(phr.chronicConditions), JSON.stringify(phr.medications), 
        JSON.stringify(phr.clinicalDecisionSupport || {})]);
    console.log(`  ✅ PHR: ${phr.id}`);
  }
}

async function seedAppointments() {
  console.log('📅 Seeding appointments...');
  
  for (const apt of DEMO_APPOINTMENTS) {
    await pool.query(`
      INSERT INTO appointments (id, patient_id, doctor_id, requested_date, requested_time, confirmed_date, confirmed_time, status, symptoms, symptom_description, urgency_level, jitsi_room_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        confirmed_date = EXCLUDED.confirmed_date,
        confirmed_time = EXCLUDED.confirmed_time,
        symptoms = EXCLUDED.symptoms
    `, [apt.id, apt.patientId, apt.doctorId, apt.requestedDate, apt.requestedTime,
        apt.confirmedDate, apt.confirmedTime, apt.status, JSON.stringify(apt.symptoms),
        apt.symptomDescription, apt.urgencyLevel, apt.jitsiRoomName]);
    console.log(`  ✅ Appointment: ${apt.id} (${apt.status})`);
  }
}

async function seedKnowledgeBase() {
  console.log('📚 Seeding knowledge base...');
  
  for (const kb of DEMO_KNOWLEDGE_BASE) {
    await pool.query(`
      INSERT INTO knowledge_base (title, content, source, category, guideline_year, language)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING
    `, [kb.title, kb.content, kb.source, kb.category, kb.guidelineYear, kb.language]);
    console.log(`  ✅ KB: ${kb.title.substring(0, 40)}...`);
  }
}

async function seedMedicalContent() {
  console.log('📰 Seeding medical content...');
  
  for (const content of DEMO_MEDICAL_CONTENT) {
    await pool.query(`
      INSERT INTO medical_content (id, title_thai, title_english, content_thai, content_english, category, tags, status, published_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (id) DO UPDATE SET
        title_thai = EXCLUDED.title_thai,
        content_thai = EXCLUDED.content_thai,
        status = EXCLUDED.status
    `, [content.id, content.titleThai, content.titleEnglish, content.contentThai,
        content.contentEnglish, content.category, JSON.stringify(content.tags), content.status]);
    console.log(`  ✅ Content: ${content.titleThai}`);
  }
}

async function seedDoctorProfiles() {
  console.log('👨‍⚕️ Seeding doctor profiles...');
  
  const doctorProfiles = [
    { doctorId: 'DOC-TEST-001', specialty: 'Internal Medicine', experienceYears: 5, rating: 5.0, totalReviews: 10, consultationFee: 300 },
    { doctorId: 'DOC-SOMCHAI-001', specialty: 'Cardiology', experienceYears: 15, rating: 4.8, totalReviews: 125, consultationFee: 800 },
    { doctorId: 'DOC-SIRIPORN-001', specialty: 'Nephrology', experienceYears: 20, rating: 4.9, totalReviews: 200, consultationFee: 1000 }
  ];

  for (const profile of doctorProfiles) {
    await pool.query(`
      INSERT INTO doctor_profiles (doctor_id, specialty, experience_years, rating, total_reviews, consultation_fee, is_available)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      ON CONFLICT (doctor_id) DO UPDATE SET
        rating = EXCLUDED.rating,
        total_reviews = EXCLUDED.total_reviews
    `, [profile.doctorId, profile.specialty, profile.experienceYears, profile.rating, 
        profile.totalReviews, profile.consultationFee]);
    console.log(`  ✅ Profile: ${profile.doctorId}`);
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('🚀 Starting comprehensive data seeding...\n');
  
  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');

    await seedUsers();
    await seedPHR();
    await seedAppointments();
    await seedKnowledgeBase();
    await seedMedicalContent();
    await seedDoctorProfiles();

    console.log('\n✅ All demo data seeded successfully!');
    console.log('\n📋 Test Credentials:');
    console.log('  Admin:   admin.test@izara.com / IzaraAdmin@2024');
    console.log('  Doctor:  doctor.test@izara.com / IzaraDoctor@2024');
    console.log('  Patient: demo.test@gmail.com / P@ssw0rd');
    console.log('  Pending Doctor: dr.pending@hospital.com / IzaraDoctor@2024');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
