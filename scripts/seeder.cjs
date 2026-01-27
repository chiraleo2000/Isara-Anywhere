/**
 * =============================================================================
 * IZARA TELEMEDICINE - UNIFIED DATA SEEDER
 * =============================================================================
 * Version: 4.1.0
 * Updated: 2026-01-27
 * 
 * Comprehensive data seeder for PostgreSQL deployed as Docker service.
 * Uses PostgreSQL directly - NO GCS, NO Cloud SQL.
 * 
 * Usage:
 *   node scripts/seeder.cjs                  # Seed local database
 *   node scripts/seeder.cjs --verify         # Verify data only
 * =============================================================================
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('node:fs');
const path = require('node:path');

// =============================================================================
// CONFIGURATION - PostgreSQL Docker Service Only
// =============================================================================

const verifyOnly = process.argv.includes('--verify');

// PostgreSQL Docker service configuration (same for local and cloud)
const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'P@ssw0rd',
  database: process.env.DB_NAME || 'izara_phase1',
  port: Number.parseInt(process.env.DB_PORT || '5433')  // Docker exposes on 5433
};

const pool = new Pool(config);

// =============================================================================
// PASSWORD HASHES (Pre-computed for consistency)
// =============================================================================

// P@ssw0rd
const PATIENT_PASSWORD_HASH = '$2b$10$64bK0EpjyC7quRGJNvRqmuH/jX3mA4dzyzYa2vgA2q.H3ZxkQwAmy';
// IzaraDoctor@2024
const DOCTOR_PASSWORD_HASH = '$2b$10$aPN6uhBrLoms36C8/017be2GWqUqaPJa6WaTaZ8LrnwAeaf3GajrO';
// IzaraAdmin@2024
const ADMIN_PASSWORD_HASH = '$2b$10$fx5arkpb8YI7lEK5lcHdXeksczdG.qloim/uWghlBZXyxv.dNo/wq';

// =============================================================================
// SEED DATA
// =============================================================================

const USERS = [
  {
    id: 'ADMIN-TEST-001',
    email: 'admin.test@izara.com',
    password_hash: ADMIN_PASSWORD_HASH,
    role: 'admin',
    name: 'Admin Test',
    name_thai: 'ผู้ดูแลระบบ ทดสอบ',
    is_active: true,
    is_verified: true,
    is_approved: true,
    approval_status: 'approved',
    is_admin: true,
    admin_privileges: { canManageDoctors: true, canManagePatients: true, canManageAppointments: true, canViewAnalytics: true, canManageSettings: true, level: 'super_admin' }
  },
  {
    id: 'DOC-TEST-001',
    email: 'doctor.test@izara.com',
    password_hash: DOCTOR_PASSWORD_HASH,
    role: 'doctor',
    name: 'Doctor Test',
    name_thai: 'นายแพทย์ ทดสอบ ระบบ',
    doctor_id: 'DOC-TEST-001',
    medical_license_number: 'TH-MD-2020-001',
    specialty: 'Internal Medicine',
    is_active: true,
    is_verified: true,
    is_approved: true,
    approval_status: 'approved'
  },
  {
    id: 'PATIENT-DEMO',
    email: 'demo.test@gmail.com',
    password_hash: PATIENT_PASSWORD_HASH,
    role: 'patient',
    name: 'Demo Test Patient',
    name_thai: 'นาย ทดสอบ ระบบ',
    patient_id: 'PATIENT-DEMO',
    is_active: true,
    is_verified: true,
    is_approved: true,
    approval_status: 'approved'
  },
  {
    id: 'PATIENT-SOMCHAI',
    email: 'Somchai.Mankong@gmail.com',
    password_hash: PATIENT_PASSWORD_HASH,
    role: 'patient',
    name: 'Somchai Mankong',
    name_thai: 'นายสมชาย มั่นคง',
    patient_id: 'PATIENT-SOMCHAI',
    is_active: true,
    is_verified: true,
    is_approved: true,
    approval_status: 'approved'
  },
  {
    id: 'PATIENT-ANAN',
    email: 'Anan.Khayanrian@gmail.com',
    password_hash: PATIENT_PASSWORD_HASH,
    role: 'patient',
    name: 'Anan Khayanrian',
    name_thai: 'นายอนันต์ ขยันเรียน',
    patient_id: 'PATIENT-ANAN',
    is_active: true,
    is_verified: true,
    is_approved: true,
    approval_status: 'approved'
  }
];

// =============================================================================
// SEEDING FUNCTIONS
// =============================================================================

async function clearData() {
  console.log('🗑️  Clearing existing data...');
  await pool.query(`
    TRUNCATE TABLE 
      sessions, notifications, emr, prescriptions, lab_orders, cds_logs,
      ai_chat_history, ai_document_analysis, ai_validations,
      meeting_records, meeting_transcripts, appointments,
      living_wills, living_will_versions, patient_consents, phr, vital_signs,
      doctor_schedules, doctor_reviews, doctor_profiles, patient_profiles,
      medical_content, clinical_resources, consultants, knowledge_base, 
      audit_logs, doctors, users
    CASCADE
  `);
  console.log('✅ Data cleared');
}

async function seedUsers() {
  console.log('👤 Seeding users...');
  
  for (const user of USERS) {
    await pool.query(`
      INSERT INTO users (id, email, password_hash, role, name, name_thai, doctor_id, medical_license_number, specialty, patient_id, is_active, is_verified, is_approved, approval_status, is_admin, admin_privileges)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (id) DO NOTHING
    `, [
      user.id, user.email, user.password_hash, user.role, user.name, user.name_thai || null,
      user.doctor_id || null, user.medical_license_number || null, user.specialty || null,
      user.patient_id || null, user.is_active, user.is_verified, user.is_approved, user.approval_status,
      user.is_admin || false, user.admin_privileges ? JSON.stringify(user.admin_privileges) : null
    ]);
  }
  console.log(`✅ Seeded ${USERS.length} users`);
}

async function seedDoctors() {
  console.log('🩺 Seeding doctors table...');
  
  await pool.query(`
    INSERT INTO doctors (id, name, name_thai, specialty, specialty_thai, hospital, hospital_thai, avatar_url, rating, review_count, experience_years, consultation_fee, is_available)
    VALUES 
      ('DOC-TEST-001', 'Dr. Test Doctor', 'นพ.ทดสอบ ระบบ', 'Internal Medicine', 'อายุรกรรมทั่วไป', 'Izara Test Hospital', 'โรงพยาบาลอิซาร่า ทดสอบ', 'https://i.pravatar.cc/150?u=doctest', 5.0, 10, 5, 300.00, true)
    ON CONFLICT (id) DO NOTHING
  `);
  console.log('✅ Seeded doctors');
}

async function seedPHR() {
  console.log('📋 Seeding PHR records...');
  
  await pool.query(`
    INSERT INTO phr (id, patient_id, demographics, allergies, chronic_conditions, medications, lifestyle)
    VALUES 
      ('PHR-DEMO', 'PATIENT-DEMO', '{"age": 35, "gender": "male", "bloodType": "B+"}'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '{"smokingStatus": "never"}'::jsonb),
      ('PHR-SOMCHAI', 'PATIENT-SOMCHAI', '{"age": 45, "gender": "male", "bloodType": "O+"}'::jsonb, '[]'::jsonb, '[{"name": "Hypertension", "icd10": "I10"}]'::jsonb, '[{"name": "Amlodipine", "dose": "5mg"}]'::jsonb, '{"smokingStatus": "never"}'::jsonb),
      ('PHR-ANAN', 'PATIENT-ANAN', '{"age": 58, "gender": "male", "bloodType": "A+"}'::jsonb, '[{"name": "Penicillin", "severity": "severe"}]'::jsonb, '[{"name": "Type 2 Diabetes Mellitus", "icd10": "E11.9"}, {"name": "CKD Stage 3b", "icd10": "N18.4"}]'::jsonb, '[{"name": "Metformin", "dose": "500mg"}]'::jsonb, '{"smokingStatus": "former"}'::jsonb)
    ON CONFLICT (id) DO NOTHING
  `);
  console.log('✅ Seeded PHR records');
}

async function seedMedicalContent() {
  console.log('📚 Seeding medical content...');
  
  await pool.query(`
    INSERT INTO medical_content (id, title_thai, title_english, content_thai, content_english, category, author_id, status, view_count, tags, image_url)
    VALUES 
      ('MC-001', 'การดูแลสุขภาพหัวใจ', 'Heart Health Care', 'หัวใจเป็นอวัยวะสำคัญ', 'Heart is vital', 'cardiovascular', 'DOC-TEST-001', 'published', 150, '["heart", "health"]'::jsonb, 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800'),
      ('MC-002', 'การจัดการโรคเบาหวาน', 'Diabetes Management', 'โรคเบาหวานต้องดูแลต่อเนื่อง', 'Diabetes needs ongoing care', 'endocrinology', 'DOC-TEST-001', 'published', 200, '["diabetes"]'::jsonb, 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800'),
      ('MC-003', 'การนอนหลับที่ดี', 'Good Sleep Habits', 'นอนหลับ 7-9 ชั่วโมง', 'Sleep 7-9 hours', 'general', 'DOC-TEST-001', 'published', 120, '["sleep"]'::jsonb, 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800')
    ON CONFLICT (id) DO NOTHING
  `);
  console.log('✅ Seeded medical content');
}

async function seedClinicalResources() {
  console.log('📖 Seeding clinical resources...');
  
  await pool.query(`
    INSERT INTO clinical_resources (id, title_thai, title_english, content_thai, content_english, category, specialty, guideline_year, source, status)
    VALUES 
      ('CR-001', 'แนวทางการรักษาความดันโลหิตสูง 2024', 'Hypertension Guidelines 2024', 'เป้าหมาย BP < 140/90', 'Target BP < 140/90', 'cardiovascular', 'Cardiology', 2024, 'Thai Hypertension Society', 'approved'),
      ('CR-002', 'การใช้ยาปฏิชีวนะอย่างสมเหตุผล', 'Rational Antibiotic Use', 'ใช้เมื่อมีข้อบ่งใช้', 'Use when indicated', 'infectious', 'Infectious Disease', 2024, 'Thai FDA', 'approved')
    ON CONFLICT (id) DO NOTHING
  `);
  console.log('✅ Seeded clinical resources');
}

async function seedKnowledgeBase() {
  console.log('🧠 Seeding knowledge base...');
  
  await pool.query(`
    INSERT INTO knowledge_base (title, content, source, category, guideline_year, language)
    VALUES 
      ('KDIGO 2024 CKD Guideline - Metformin', 'Metformin dose adjustment for CKD: eGFR 30-45: Reduce dose by 50%. eGFR <30: Contraindicated.', 'KDIGO 2024', 'nephrology', '2024', 'en'),
      ('ADA 2025 Diabetes Standards', 'A1C target <7% for most adults. Consider <8% for older adults.', 'ADA 2025', 'diabetes', '2025', 'en'),
      ('แนวทางปรับยา Metformin', 'ปรับขนาดยาตาม eGFR: 30-45: ลดลง 50%', 'KDIGO 2024 Thai', 'nephrology', '2024', 'th')
    ON CONFLICT DO NOTHING
  `);
  console.log('✅ Seeded knowledge base');
}

async function seedAppointments() {
  console.log('📅 Seeding appointments...');
  
  await pool.query(`
    INSERT INTO appointments (id, patient_id, doctor_id, requested_date, requested_time, confirmed_date, confirmed_time, status, symptoms, symptom_description, urgency_level, jitsi_room_name)
    VALUES 
      ('APT-TEST-001', 'PATIENT-SOMCHAI', 'DOC-TEST-001', CURRENT_DATE, '09:00', CURRENT_DATE, '09:00', 'confirmed', '["headache"]'::jsonb, 'ปวดหัวมา 3 วัน', 'normal', 'izara-apt-test-001'),
      ('APT-TEST-002', 'PATIENT-ANAN', 'DOC-TEST-001', CURRENT_DATE, '10:30', CURRENT_DATE, '10:30', 'confirmed', '["diabetes_follow_up"]'::jsonb, 'นัดติดตามเบาหวาน', 'normal', 'izara-apt-test-002'),
      ('APT-TEST-003', 'PATIENT-DEMO', 'DOC-TEST-001', CURRENT_DATE + 1, '14:00', NULL, NULL, 'pending', '["checkup"]'::jsonb, 'ตรวจสุขภาพ', 'normal', NULL)
    ON CONFLICT (id) DO NOTHING
  `);
  console.log('✅ Seeded appointments');
}

async function seedConsultants() {
  console.log('👨‍⚕️ Seeding consultants...');
  
  await pool.query(`
    INSERT INTO consultants (id, name, specialty, email, phone, hospital, languages, experience_years, bio, is_available, rating)
    VALUES 
      ('CONS-001', 'Dr. Prasong Charoenpong', 'Nephrology', 'prasong.c@hospital.co.th', '02-555-1001', 'Siriraj Hospital', '["Thai", "English"]'::jsonb, 25, 'CKD specialist', true, 4.9),
      ('CONS-002', 'Dr. Wanida Thongprasert', 'Oncology', 'wanida.t@hospital.co.th', '02-555-1002', 'Chulalongkorn Hospital', '["Thai", "English"]'::jsonb, 20, 'Breast cancer specialist', true, 4.8)
    ON CONFLICT (id) DO NOTHING
  `);
  console.log('✅ Seeded consultants');
}

async function seedVitalSigns() {
  console.log('💓 Seeding vital signs...');
  
  await pool.query(`
    INSERT INTO vital_signs (patient_id, blood_pressure_systolic, blood_pressure_diastolic, heart_rate, temperature, oxygen_saturation, source)
    VALUES 
      ('PATIENT-DEMO', 120, 80, 72, 36.6, 99, 'patient_input'),
      ('PATIENT-SOMCHAI', 130, 85, 75, 36.5, 98, 'clinic_measurement'),
      ('PATIENT-ANAN', 145, 90, 80, 36.8, 97, 'clinic_measurement')
  `);
  console.log('✅ Seeded vital signs');
}

// =============================================================================
// VERIFICATION
// =============================================================================

async function verifyData() {
  console.log('\n📊 Verifying data...\n');
  
  const tables = [
    'users', 'doctors', 'phr', 'medical_content', 
    'clinical_resources', 'knowledge_base', 'appointments', 
    'consultants', 'vital_signs'
  ];
  
  for (const table of tables) {
    const result = await pool.query(`SELECT count(*) FROM ${table}`);
    const count = result.rows[0].count;
    console.log(`  ${table}: ${count} records`);
  }
  
  console.log('\n✅ Verification complete');
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║        IZARA TELEMEDICINE - DATA SEEDER                   ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  console.log(`Environment: PostgreSQL Docker Service (Port ${config.port})\n`);
  
  try {
    // Test connection
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful\n');
    
    if (verifyOnly) {
      await verifyData();
    } else {
      await clearData();
      await seedUsers();
      await seedDoctors();
      await seedPHR();
      await seedMedicalContent();
      await seedClinicalResources();
      await seedKnowledgeBase();
      await seedAppointments();
      await seedConsultants();
      await seedVitalSigns();
      await verifyData();
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
