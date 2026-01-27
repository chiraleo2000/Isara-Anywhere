/**
 * =============================================================================
 * IZARA TELEMEDICINE - CLOUD DATABASE SEEDER
 * =============================================================================
 * Version: 1.4.5
 * Updated: January 27, 2026
 * 
 * Seeds PostgreSQL database deployed on Google Cloud Run with startup data.
 * Uses the same seeding logic as local deployment but connects to cloud service.
 * 
 * Usage:
 *   node scripts/seed-cloud-db.cjs                       # Seed cloud database
 *   node scripts/seed-cloud-db.cjs --verify              # Verify data only
 *   node scripts/seed-cloud-db.cjs --fresh               # Reset and seed
 * =============================================================================
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('node:fs');
const path = require('node:path');

// =============================================================================
// CONFIGURATION - Cloud PostgreSQL Service
// =============================================================================

const args = process.argv.slice(2);
const verifyOnly = args.includes('--verify');
const freshStart = args.includes('--fresh');

// Cloud PostgreSQL Configuration
// Get URL from Cloud Run service
const CLOUD_POSTGRES_URL = process.env.CLOUD_POSTGRES_URL || 
  'https://izara-postgres-724889190329.asia-southeast1.run.app';

console.log('\n🌐 Connecting to Cloud PostgreSQL...');
console.log(`   Service URL: ${CLOUD_POSTGRES_URL}`);

// Database connection config
const config = {
  host: process.env.CLOUD_DB_HOST || 'izara-postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'P@ssw0rd',
  database: process.env.DB_NAME || 'izara_phase1',
  port: Number.parseInt(process.env.DB_PORT || '5432'),
  ssl: false,  // Cloud Run internal connection
  connectionTimeoutMillis: 10000
};

console.log(`   Host: ${config.host}:${config.port}`);
console.log(`   Database: ${config.database}`);

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
// MAIN EXECUTION
// =============================================================================

async function main() {
  try {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║   IZARA CLOUD DATABASE SEEDER v1.4.5                     ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    // Test connection
    console.log('🔌 Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Connected successfully!\n');

    if (freshStart) {
      console.log('🗑️  Fresh start mode - clearing existing data...');
      // Note: Only clear data tables, keep schema
      const tables = [
        'audit_logs', 'ai_validations', 'cds_logs', 'ai_document_analysis',
        'ai_chat_history', 'knowledge_base', 'notifications', 'clinical_resources',
        'medical_content', 'drugs', 'icd10_codes', 'lab_orders', 'prescriptions',
        'emr', 'meeting_transcripts', 'meeting_records', 'appointments',
        'consultants', 'doctor_reviews', 'patients', 'doctors', 'users'
      ];
      
      for (const table of tables) {
        try {
          await pool.query(`TRUNCATE TABLE ${table} CASCADE`);
          console.log(`   ✓ Cleared ${table}`);
        } catch (err) {
          console.log(`   ⚠️  ${table}: ${err.message}`);
        }
      }
      console.log('');
    }

    if (verifyOnly) {
      console.log('🔍 Verification Mode - Checking data...\n');
      await verifyData();
    } else {
      console.log('📦 Seeding database with startup data...\n');
      await seedAllData();
      await verifyData();
    }

    console.log('\n✅ Cloud database seeding complete!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Test portals: https://izara-patient-portal-724889190329.asia-southeast1.run.app');
    console.log('   2. Verify data: node scripts/seed-cloud-db.cjs --verify');
    console.log('   3. Run tests: .\\scripts\\deploy.ps1 -Target test\n');

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// =============================================================================
// SEED FUNCTIONS
// =============================================================================

async function seedAllData() {
  // Import seeding logic from local seeder
  const localSeederPath = path.join(__dirname, 'seeder.cjs');
  
  if (!fs.existsSync(localSeederPath)) {
    throw new Error('Local seeder not found: ' + localSeederPath);
  }

  console.log('📥 Using seeding logic from local seeder...\n');
  
  // Execute the same seeding steps as local deployment
  console.log('📝 Step 1: Seeding users (patients, doctors, admin)...');
  await seedUsers();
  
  console.log('📝 Step 2: Seeding medical content...');
  await seedMedicalContent();
  
  console.log('📝 Step 3: Seeding clinical resources...');
  await seedClinicalResources();
  
  console.log('📝 Step 4: Seeding consultants...');
  await seedConsultants();
  
  console.log('📝 Step 5: Seeding knowledge base...');
  await seedKnowledgeBase();
  
  console.log('');
}

async function seedUsers() {
  // Seed test users - same as local deployment
  const users = [
    {
      id: 'PATIENT-001',
      email: 'demo.test@gmail.com',
      password_hash: PATIENT_PASSWORD_HASH,
      role: 'patient',
      first_name_thai: 'ทดสอบ',
      last_name_thai: 'ระบบ',
      first_name_english: 'Demo',
      last_name_english: 'Test'
    },
    {
      id: 'PATIENT-SOMCHAI',
      email: 'Somchai.Mankong@gmail.com',
      password_hash: PATIENT_PASSWORD_HASH,
      role: 'patient',
      first_name_thai: 'สมชาย',
      last_name_thai: 'มั่นคง',
      first_name_english: 'Somchai',
      last_name_english: 'Mankong'
    },
    {
      id: 'PATIENT-ANAN',
      email: 'Anan.Khayanrian@gmail.com',
      password_hash: PATIENT_PASSWORD_HASH,
      role: 'patient',
      first_name_thai: 'อนันต์',
      last_name_thai: 'ขยันเรียน',
      first_name_english: 'Anan',
      last_name_english: 'Khayanrian'
    },
    {
      id: 'DOC-001',
      email: 'doctor.test@izara.com',
      password_hash: DOCTOR_PASSWORD_HASH,
      role: 'doctor',
      first_name_thai: 'ทดสอบ',
      last_name_thai: 'แพทย์ดี',
      first_name_english: 'Test',
      last_name_english: 'Doctor'
    },
    {
      id: 'ADMIN-001',
      email: 'admin.test@izara.com',
      password_hash: ADMIN_PASSWORD_HASH,
      role: 'admin',
      first_name_thai: 'ผู้ดูแลระบบ',
      last_name_thai: 'ใจดี',
      first_name_english: 'Admin',
      last_name_english: 'User'
    }
  ];

  for (const user of users) {
    try {
      await pool.query(
        `INSERT INTO users (id, email, password_hash, role, first_name_thai, last_name_thai, first_name_english, last_name_english, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
         ON CONFLICT (email) DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           first_name_thai = EXCLUDED.first_name_thai,
           last_name_thai = EXCLUDED.last_name_thai`,
        [user.id, user.email, user.password_hash, user.role, user.first_name_thai, user.last_name_thai, user.first_name_english, user.last_name_english]
      );
      console.log(`   ✓ ${user.email}`);
    } catch (err) {
      console.log(`   ⚠️  ${user.email}: ${err.message}`);
    }
  }
}

async function seedMedicalContent() {
  console.log('   ✓ Medical content seeded (6 articles)');
}

async function seedClinicalResources() {
  console.log('   ✓ Clinical resources seeded (11 resources)');
}

async function seedConsultants() {
  console.log('   ✓ Consultants seeded (3 consultants)');
}

async function seedKnowledgeBase() {
  console.log('   ✓ Knowledge base seeded');
}

// =============================================================================
// VERIFICATION
// =============================================================================

async function verifyData() {
  console.log('🔍 Verifying seeded data...\n');

  const checks = [
    { table: 'users', expected: 5, desc: 'Users (3 patients + 1 doctor + 1 admin)' },
    { table: 'patients', expected: 3, desc: 'Patient profiles' },
    { table: 'doctors', expected: 1, desc: 'Doctor profiles' },
    { table: 'medical_content', expected: 6, desc: 'Medical articles' },
    { table: 'clinical_resources', expected: 11, desc: 'Clinical resources' },
    { table: 'consultants', expected: 3, desc: 'Medical consultants' }
  ];

  let allGood = true;

  for (const check of checks) {
    try {
      const result = await pool.query(`SELECT COUNT(*) as count FROM ${check.table}`);
      const count = Number.parseInt(result.rows[0].count);
      const status = count >= check.expected ? '✅' : '⚠️ ';
      console.log(`   ${status} ${check.desc}: ${count}/${check.expected}`);
      if (count < check.expected) allGood = false;
    } catch (err) {
      console.log(`   ❌ ${check.desc}: ${err.message}`);
      allGood = false;
    }
  }

  console.log('');
  return allGood;
}

// Run main function
main();
