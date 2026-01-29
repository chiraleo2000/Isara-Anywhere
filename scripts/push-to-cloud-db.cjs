/**
 * =============================================================================
 * IZARA TELEMEDICINE - PUSH LOCAL DATA TO CLOUD DATABASE
 * =============================================================================
 * Version: 1.0.0
 * Updated: January 27, 2026
 * 
 * Pushes schema and seed data to the cloud PostgreSQL at 34.143.228.135
 * 
 * Usage:
 *   node scripts/push-to-cloud-db.cjs
 * =============================================================================
 */

const { Pool } = require('pg');
const fs = require('node:fs');
const path = require('node:path');
const { PASSWORD_HASHES, getCloudConfig } = require('./lib/db-config.cjs');

// =============================================================================
// CONFIGURATION - Cloud PostgreSQL
// =============================================================================

const CLOUD_CONFIG = getCloudConfig();

const pool = new Pool(CLOUD_CONFIG);

// Password hashes from shared config
const PATIENT_PASSWORD_HASH = PASSWORD_HASHES.patient;
const DOCTOR_PASSWORD_HASH = PASSWORD_HASHES.doctor;
const ADMIN_PASSWORD_HASH = PASSWORD_HASHES.admin;

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   IZARA - PUSH TO CLOUD DATABASE                         ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  console.log(`🌐 Connecting to Cloud PostgreSQL: ${CLOUD_CONFIG.host}:${CLOUD_CONFIG.port}`);

  try {
    // Test connection
    const testResult = await pool.query('SELECT NOW() as time');
    console.log(`✅ Connected successfully at ${testResult.rows[0].time}\n`);

    // Initialize schema
    console.log('📋 Step 1: Initializing database schema...');
    await initializeSchema();

    // Seed users
    console.log('\n📋 Step 2: Seeding users...');
    await seedUsers();

    // Seed doctors table
    console.log('\n📋 Step 3: Seeding doctors...');
    await seedDoctors();

    // Seed PHR
    console.log('\n📋 Step 4: Seeding PHR records...');
    await seedPHR();

    // Seed medical content
    console.log('\n📋 Step 5: Seeding medical content...');
    await seedMedicalContent();

    // Seed clinical resources
    console.log('\n📋 Step 6: Seeding clinical resources...');
    await seedClinicalResources();

    // Seed consultants
    console.log('\n📋 Step 7: Seeding consultants...');
    await seedConsultants();

    // Verify
    console.log('\n📋 Step 8: Verifying data...');
    await verifyData();

    console.log('\n✅ Cloud database initialized and seeded successfully!');
    console.log('\n📋 Cloud URLs:');
    console.log('   Patient Portal: https://izara-patient-portal-hvht4obouq-as.a.run.app');
    console.log('   Doctor Portal:  https://izara-doctor-portal-hvht4obouq-as.a.run.app\n');

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// =============================================================================
// SCHEMA INITIALIZATION
// =============================================================================

async function initializeSchema() {
  // Check if tables exist
  const tableCheck = await pool.query(`
    SELECT COUNT(*) as count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);

  const tableCount = Number.parseInt(tableCheck.rows[0].count, 10);
  console.log(`   Found ${tableCount} existing tables`);

  if (tableCount >= 20) {
    console.log('   ✓ Schema already exists, skipping creation');
    return;
  }

  console.log('   Creating tables...');

  // Create essential tables only (simplified version)
  await pool.query(`
    -- Extensions
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
  `);

  // Users table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(50) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'patient',
      name VARCHAR(255),
      name_thai VARCHAR(255),
      first_name_thai VARCHAR(100),
      last_name_thai VARCHAR(100),
      first_name_english VARCHAR(100),
      last_name_english VARCHAR(100),
      phone VARCHAR(20),
      avatar_url TEXT,
      doctor_id VARCHAR(50),
      patient_id VARCHAR(50),
      medical_license_number VARCHAR(50),
      specialty VARCHAR(100),
      is_active BOOLEAN DEFAULT true,
      is_verified BOOLEAN DEFAULT true,
      is_approved BOOLEAN DEFAULT true,
      approval_status VARCHAR(20) DEFAULT 'approved',
      is_admin BOOLEAN DEFAULT false,
      admin_privileges JSONB,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Sessions table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(50) PRIMARY KEY,
      user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
      token TEXT,
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Doctors table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS doctors (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255),
      name_thai VARCHAR(255),
      specialty VARCHAR(100),
      specialty_thai VARCHAR(100),
      hospital VARCHAR(255),
      hospital_thai VARCHAR(255),
      avatar_url TEXT,
      rating DECIMAL(3,2) DEFAULT 5.0,
      review_count INTEGER DEFAULT 0,
      experience_years INTEGER DEFAULT 0,
      consultation_fee DECIMAL(10,2) DEFAULT 0,
      is_available BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // PHR table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS phr (
      id VARCHAR(50) PRIMARY KEY,
      patient_id VARCHAR(50) REFERENCES users(id),
      demographics JSONB DEFAULT '{}'::jsonb,
      allergies JSONB DEFAULT '[]'::jsonb,
      chronic_conditions JSONB DEFAULT '[]'::jsonb,
      medications JSONB DEFAULT '[]'::jsonb,
      lifestyle JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Vital signs table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vital_signs (
      id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      patient_id VARCHAR(50) REFERENCES users(id),
      blood_pressure_systolic INTEGER,
      blood_pressure_diastolic INTEGER,
      heart_rate INTEGER,
      temperature DECIMAL(4,1),
      weight DECIMAL(5,1),
      height DECIMAL(5,1),
      recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Medical content table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS medical_content (
      id VARCHAR(50) PRIMARY KEY,
      title_thai TEXT,
      title_english TEXT,
      content_thai TEXT,
      content_english TEXT,
      category VARCHAR(50),
      author_id VARCHAR(50),
      status VARCHAR(20) DEFAULT 'published',
      view_count INTEGER DEFAULT 0,
      tags JSONB DEFAULT '[]'::jsonb,
      image_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Clinical resources table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clinical_resources (
      id VARCHAR(50) PRIMARY KEY,
      title TEXT,
      description TEXT,
      category VARCHAR(50),
      type VARCHAR(50),
      source TEXT,
      author_id VARCHAR(50),
      author_name VARCHAR(255),
      content JSONB,
      file_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Consultants table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS consultants (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255),
      name_thai VARCHAR(255),
      specialty VARCHAR(100),
      specialty_thai VARCHAR(100),
      hospital VARCHAR(255),
      hospital_thai VARCHAR(255),
      avatar_url TEXT,
      email VARCHAR(255),
      phone VARCHAR(50),
      is_available BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Appointments table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS appointments (
      id VARCHAR(50) PRIMARY KEY,
      patient_id VARCHAR(50) REFERENCES users(id),
      doctor_id VARCHAR(50),
      preferred_date DATE,
      preferred_time TIME,
      status VARCHAR(20) DEFAULT 'pending',
      symptoms JSONB DEFAULT '[]'::jsonb,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Notifications table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id VARCHAR(50) REFERENCES users(id),
      type VARCHAR(50),
      title TEXT,
      message TEXT,
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // AI Chat History table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_chat_history (
      id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id VARCHAR(50) REFERENCES users(id),
      session_id VARCHAR(50),
      role VARCHAR(20),
      message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('   ✓ Schema created successfully');
}

// =============================================================================
// SEED FUNCTIONS
// =============================================================================

async function seedUsers() {
  // First check which columns exist in users table
  const columnsResult = await pool.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'users' AND table_schema = 'public'
  `);
  const existingColumns = columnsResult.rows.map(r => r.column_name);
  console.log(`   Existing columns: ${existingColumns.join(', ')}`);

  const users = [
    {
      id: 'ADMIN-TEST-001',
      email: 'admin.test@izara.com',
      password_hash: ADMIN_PASSWORD_HASH,
      role: 'admin',
      first_name: 'Admin',
      last_name: 'Test',
      first_name_thai: 'ผู้ดูแลระบบ',
      last_name_thai: 'ทดสอบ'
    },
    {
      id: 'DOC-TEST-001',
      email: 'doctor.test@izara.com',
      password_hash: DOCTOR_PASSWORD_HASH,
      role: 'doctor',
      first_name: 'Test',
      last_name: 'Doctor',
      first_name_thai: 'ทดสอบ',
      last_name_thai: 'แพทย์ดี'
    },
    {
      id: 'PATIENT-DEMO',
      email: 'demo.test@gmail.com',
      password_hash: PATIENT_PASSWORD_HASH,
      role: 'patient',
      first_name: 'Demo',
      last_name: 'Test',
      first_name_thai: 'ทดสอบ',
      last_name_thai: 'ระบบ'
    },
    {
      id: 'PATIENT-SOMCHAI',
      email: 'Somchai.Mankong@gmail.com',
      password_hash: PATIENT_PASSWORD_HASH,
      role: 'patient',
      first_name: 'Somchai',
      last_name: 'Mankong',
      first_name_thai: 'สมชาย',
      last_name_thai: 'มั่นคง'
    },
    {
      id: 'PATIENT-ANAN',
      email: 'Anan.Khayanrian@gmail.com',
      password_hash: PATIENT_PASSWORD_HASH,
      role: 'patient',
      first_name: 'Anan',
      last_name: 'Khayanrian',
      first_name_thai: 'อนันต์',
      last_name_thai: 'ขยันเรียน'
    }
  ];

  for (const u of users) {
    try {
      // Use columns that exist in the cloud schema: first_name, last_name, first_name_thai, last_name_thai
      await pool.query(`
        INSERT INTO users (id, email, password_hash, role, first_name, last_name, first_name_thai, last_name_thai, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
        ON CONFLICT (id) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          first_name_thai = EXCLUDED.first_name_thai,
          last_name_thai = EXCLUDED.last_name_thai
      `, [u.id, u.email, u.password_hash, u.role, u.first_name, u.last_name, u.first_name_thai, u.last_name_thai]);
      console.log(`   ✓ ${u.email}`);
    } catch (err) {
      console.log(`   ⚠️  ${u.email}: ${err.message}`);
    }
  }
}

async function seedDoctors() {
  await pool.query(`
    INSERT INTO doctors (id, name, name_thai, specialty, specialty_thai, hospital, hospital_thai, avatar_url, rating, review_count, experience_years, consultation_fee, is_available)
    VALUES 
      ('DOC-TEST-001', 'Dr. Test Doctor', 'นพ.ทดสอบ แพทย์ดี', 'Internal Medicine', 'อายุรกรรมทั่วไป', 'Izara Test Hospital', 'โรงพยาบาลอิซาร่า', 'https://i.pravatar.cc/150?u=doctest', 5.0, 10, 5, 300.00, true),
      ('DOC-SOMCHAI', 'Dr. Somchai Prasert', 'นพ.สมชาย ประเสริฐ', 'Cardiology', 'โรคหัวใจ', 'Bangkok Heart Hospital', 'โรงพยาบาลหัวใจกรุงเทพ', 'https://i.pravatar.cc/150?u=docsomchai', 4.9, 150, 15, 1500.00, true),
      ('DOC-SIRIPORN', 'Dr. Siriporn Thongchai', 'พญ.ศิริพร ธงชัย', 'Endocrinology', 'ต่อมไร้ท่อ', 'Diabetes Care Center', 'ศูนย์เบาหวาน', 'https://i.pravatar.cc/150?u=docsiriporn', 4.8, 200, 12, 1200.00, true)
    ON CONFLICT (id) DO NOTHING
  `);
  console.log('   ✓ Seeded 3 doctors');
}

async function seedPHR() {
  // Get actual user IDs from the database
  const usersResult = await pool.query(`SELECT id, email FROM users WHERE role = 'patient'`);
  const patients = usersResult.rows;
  console.log(`   Found ${patients.length} patients in database`);

  for (const patient of patients) {
    const phrId = `PHR-${patient.id}`;
    let demographics = '{"age": 35, "gender": "male", "bloodType": "B+"}';
    let allergies = '[]';
    let conditions = '[]';
    let medications = '[]';

    if (patient.email.includes('Somchai')) {
      demographics = '{"age": 45, "gender": "male", "bloodType": "O+"}';
      conditions = '[{"name": "Hypertension", "icd10": "I10"}]';
      medications = '[{"name": "Amlodipine", "dose": "5mg"}]';
    } else if (patient.email.includes('Anan')) {
      demographics = '{"age": 58, "gender": "male", "bloodType": "A+"}';
      allergies = '[{"name": "Penicillin", "severity": "severe"}]';
      conditions = '[{"name": "Type 2 Diabetes Mellitus", "icd10": "E11.9"}, {"name": "CKD Stage 3b", "icd10": "N18.4"}]';
      medications = '[{"name": "Metformin", "dose": "500mg"}]';
    }

    try {
      await pool.query(`
        INSERT INTO phr (id, patient_id, demographics, allergies, chronic_conditions, medications, lifestyle)
        VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb, '{"smokingStatus": "never"}'::jsonb)
        ON CONFLICT (id) DO UPDATE SET
          demographics = EXCLUDED.demographics,
          allergies = EXCLUDED.allergies,
          chronic_conditions = EXCLUDED.chronic_conditions,
          medications = EXCLUDED.medications
      `, [phrId, patient.id, demographics, allergies, conditions, medications]);
      console.log(`   ✓ PHR for ${patient.email}`);
    } catch (err) {
      console.log(`   ⚠️  PHR for ${patient.email}: ${err.message}`);
    }
  }
}

async function seedMedicalContent() {
  // Read from startup_data/medical_content.json
  const contentPath = path.join(__dirname, 'startup_data', 'medical_content.json');
  let content = [];

  if (fs.existsSync(contentPath)) {
    const data = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));
    content = data.articles || data.content || [];
    console.log(`   Loading ${content.length} articles from medical_content.json`);
    console.log(`   Keys in JSON: ${Object.keys(data).join(', ')}`);
  }

  if (content.length === 0) {
    console.log('   Using default content...');
    content = [
      { id: 'MC-001', titleThai: 'การดูแลสุขภาพหัวใจ', titleEnglish: 'Heart Health Care', contentThai: 'หัวใจเป็นอวัยวะสำคัญ การดูแลหัวใจอย่างเหมาะสมจะช่วยให้มีสุขภาพดี', contentEnglish: 'Heart is vital. Proper heart care helps maintain good health', category: 'chronic-disease', imageUrl: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800' },
      { id: 'MC-002', titleThai: 'การจัดการโรคเบาหวาน', titleEnglish: 'Diabetes Management', contentThai: 'โรคเบาหวานต้องดูแลอย่างต่อเนื่อง', contentEnglish: 'Diabetes needs ongoing care', category: 'chronic-disease', imageUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800' },
      { id: 'MC-003', titleThai: 'การนอนหลับที่ดี', titleEnglish: 'Good Sleep Habits', contentThai: 'นอนหลับ 7-9 ชั่วโมงต่อวัน', contentEnglish: 'Sleep 7-9 hours per day', category: 'general-health', imageUrl: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800' },
      { id: 'MC-004', titleThai: 'การออกกำลังกายเบื้องต้น', titleEnglish: 'Basic Exercise Guide', contentThai: 'ออกกำลังกาย 30 นาทีต่อวัน', contentEnglish: 'Exercise 30 minutes daily', category: 'exercise', imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800' },
      { id: 'MC-005', titleThai: 'โภชนาการที่ดี', titleEnglish: 'Good Nutrition', contentThai: 'กินอาหารให้ครบ 5 หมู่', contentEnglish: 'Eat a balanced diet', category: 'nutrition', imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800' },
      { id: 'MC-006', titleThai: 'การดูแลสุขภาพจิต', titleEnglish: 'Mental Health Care', contentThai: 'ดูแลสุขภาพจิตใจให้ดี', contentEnglish: 'Take care of your mental health', category: 'mental-health', imageUrl: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=800' }
    ];
  }

  // Check which columns exist
  const columnsResult = await pool.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'medical_content' AND table_schema = 'public'
  `);
  const existingColumns = columnsResult.rows.map(r => r.column_name);
  console.log(`   Medical content columns: ${existingColumns.join(', ')}`);

  for (const c of content) {
    try {
      // Use thumbnail column (cloud schema)
      await pool.query(`
        INSERT INTO medical_content (id, title_thai, title_english, content_thai, content_english, category, author_id, status, thumbnail)
        VALUES ($1, $2, $3, $4, $5, $6, 'DOC-TEST-001', 'published', $7)
        ON CONFLICT (id) DO UPDATE SET
          title_thai = EXCLUDED.title_thai,
          title_english = EXCLUDED.title_english,
          category = EXCLUDED.category,
          thumbnail = EXCLUDED.thumbnail
      `, [c.id, c.titleThai || c.title_thai, c.titleEnglish || c.title_english, c.contentThai || c.content_thai || '', c.contentEnglish || c.content_english || '', c.category, c.imageUrl || c.image_url || null]);
    } catch (err) {
      console.log(`   ⚠️  ${c.id}: ${err.message}`);
    }
  }
  console.log(`   ✓ Seeded ${content.length} medical content articles`);
}

async function seedClinicalResources() {
  // Check which columns exist
  const columnsResult = await pool.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'clinical_resources' AND table_schema = 'public'
  `);
  const existingColumns = columnsResult.rows.map(r => r.column_name);
  console.log(`   Clinical resources columns: ${existingColumns.join(', ')}`);

  // Skip if table doesn't have expected columns
  if (!existingColumns.includes('title') && !existingColumns.includes('title_thai')) {
    console.log('   ⚠️  Skipping clinical resources - schema mismatch');
    return;
  }

  const resources = [
    { id: 'CR-001', title: 'Hypertension Guidelines 2024', description: 'Latest guidelines for hypertension management', category: 'cardiology', type: 'guideline', source: 'American Heart Association' },
    { id: 'CR-002', title: 'Diabetes Care Standards', description: 'Standards of medical care in diabetes', category: 'endocrinology', type: 'guideline', source: 'American Diabetes Association' },
    { id: 'CR-003', title: 'Drug Interaction Checker', description: 'Reference for checking drug interactions', category: 'pharmacology', type: 'reference', source: 'Clinical Pharmacology' },
    { id: 'CR-004', title: 'ICD-10 Quick Reference', description: 'Common ICD-10 codes for primary care', category: 'general', type: 'reference', source: 'Izara Clinical Team' },
    { id: 'CR-005', title: 'COVID-19 Treatment Protocol', description: 'Updated COVID-19 treatment guidelines', category: 'infectious', type: 'protocol', source: 'Thai Ministry of Public Health' },
    { id: 'CR-006', title: 'Kidney Disease Classification', description: 'CKD staging and management', category: 'nephrology', type: 'guideline', source: 'KDIGO Guidelines' }
  ];

  for (const r of resources) {
    try {
      // Cloud schema uses title_thai, title_english, content_thai, content_english
      await pool.query(`
        INSERT INTO clinical_resources (id, title_thai, title_english, content_thai, content_english, category, author_id, author_name, status)
        VALUES ($1, $2, $2, $3, $3, $4, 'DOC-TEST-001', 'Dr. Test Doctor', 'published')
        ON CONFLICT (id) DO NOTHING
      `, [r.id, r.title, r.description, r.category]);
    } catch (err) {
      console.log(`   ⚠️  ${r.id}: ${err.message}`);
    }
  }
  console.log('   ✓ Seeded 6 clinical resources');
}

async function seedConsultants() {
  // Check which columns exist
  const columnsResult = await pool.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'consultants' AND table_schema = 'public'
  `);
  const existingColumns = columnsResult.rows.map(r => r.column_name);
  console.log(`   Consultants columns: ${existingColumns.join(', ')}`);

  const consultants = [
    { id: 'CONSULT-001', name: 'Dr. Suthep Wongchai', specialty: 'Nephrology', hospital: 'Kidney Care Center', email: 'suthep@hospital.com' },
    { id: 'CONSULT-002', name: 'Dr. Pranee Suksan', specialty: 'Oncology', hospital: 'Cancer Institute', email: 'pranee@hospital.com' },
    { id: 'CONSULT-003', name: 'Dr. Wichai Thongdee', specialty: 'Pulmonology', hospital: 'Chest Hospital', email: 'wichai@hospital.com' }
  ];

  for (const c of consultants) {
    try {
      if (existingColumns.includes('name')) {
        await pool.query(`
          INSERT INTO consultants (id, name, specialty, hospital, email, is_available)
          VALUES ($1, $2, $3, $4, $5, true)
          ON CONFLICT (id) DO NOTHING
        `, [c.id, c.name, c.specialty, c.hospital, c.email]);
      } else {
        // Cloud schema might use different columns
        await pool.query(`
          INSERT INTO consultants (id, specialty, hospital, email, is_available)
          VALUES ($1, $2, $3, $4, true)
          ON CONFLICT (id) DO NOTHING
        `, [c.id, c.specialty, c.hospital, c.email]);
      }
    } catch (err) {
      console.log(`   ⚠️  ${c.id}: ${err.message}`);
    }
  }
  console.log('   ✓ Seeded 3 consultants');
}

// =============================================================================
// VERIFICATION
// =============================================================================

async function verifyData() {
  const checks = [
    { table: 'users', expected: 5 },
    { table: 'doctors', expected: 3 },
    { table: 'phr', expected: 3 },
    { table: 'medical_content', expected: 6 },
    { table: 'clinical_resources', expected: 6 },
    { table: 'consultants', expected: 3 }
  ];

  for (const check of checks) {
    try {
      const result = await pool.query(`SELECT COUNT(*) as count FROM ${check.table}`);
      const count = Number.parseInt(result.rows[0].count, 10);
      const status = count >= check.expected ? '✅' : '⚠️ ';
      console.log(`   ${status} ${check.table}: ${count}/${check.expected}`);
    } catch (err) {
      console.log(`   ❌ ${check.table}: ${err.message}`);
    }
  }
}

// Run
main();
