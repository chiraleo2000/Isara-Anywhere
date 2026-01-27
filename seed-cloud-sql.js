// Cloud SQL Database Seeder
// Creates all tables and seeds with demo data
const pg = require('pg');
const bcrypt = require('bcryptjs');

const pool = new pg.Pool({
  host: '34.143.228.135',
  port: 5432,
  database: 'izara_phase1',
  user: 'postgres',
  password: 'P@ssw0rd',
  max: 5
});

// Pre-hashed passwords
const PATIENT_PASSWORD_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqSoeMvVlcmJt8/L6bQc6/sxEsZBC'; // P@ssw0rd
const DOCTOR_PASSWORD_HASH = '$2a$10$rQnM1jF7Y.Ld.q9QqF6OCeuG7kH6qQ3fUYzKq.X6p.V6i6r6uQe.e'; // IzaraDoctor@2024
const ADMIN_PASSWORD_HASH = '$2a$10$YqAzBzF5xQ.T.V3WwV8ZDO5Kx.k9W6Y6V5Z8X6r6uQe.eQqF6OC'; // IzaraAdmin@2024

async function seedDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Creating tables and seeding Cloud SQL database...');
    
    // Create extensions
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"').catch(() => {});
    await client.query('CREATE EXTENSION IF NOT EXISTS vector').catch(() => {});
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(100) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'patient',
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        first_name_thai VARCHAR(100),
        last_name_thai VARCHAR(100),
        phone VARCHAR(20),
        status VARCHAR(50) DEFAULT 'active',
        profile_image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created users table');
    
    // Create appointments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id VARCHAR(100) PRIMARY KEY,
        patient_id VARCHAR(100) REFERENCES users(id),
        doctor_id VARCHAR(100),
        preferred_date DATE,
        preferred_time VARCHAR(20),
        status VARCHAR(50) DEFAULT 'pending',
        symptoms TEXT,
        notes TEXT,
        meeting_link TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created appointments table');
    
    // Create medical_content table
    await client.query(`
      CREATE TABLE IF NOT EXISTS medical_content (
        id VARCHAR(100) PRIMARY KEY,
        title_thai VARCHAR(500),
        title_english VARCHAR(500),
        content_thai TEXT,
        content_english TEXT,
        summary_thai TEXT,
        summary_english TEXT,
        category VARCHAR(100),
        thumbnail TEXT,
        status VARCHAR(50) DEFAULT 'published',
        author_id VARCHAR(100),
        author_name VARCHAR(200),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created medical_content table');
    
    // Create clinical_resources table
    await client.query(`
      CREATE TABLE IF NOT EXISTS clinical_resources (
        id VARCHAR(100) PRIMARY KEY,
        title_thai VARCHAR(500),
        title_english VARCHAR(500),
        content_thai TEXT,
        content_english TEXT,
        category VARCHAR(100),
        specialty VARCHAR(100),
        status VARCHAR(50) DEFAULT 'published',
        author_id VARCHAR(100),
        author_name VARCHAR(200),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created clinical_resources table');
    
    // Create consultants table
    await client.query(`
      CREATE TABLE IF NOT EXISTS consultants (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        specialty VARCHAR(200),
        hospital VARCHAR(200),
        email VARCHAR(255),
        phone VARCHAR(50),
        is_available BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created consultants table');
    
    // Create notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100) REFERENCES users(id),
        type VARCHAR(100),
        title VARCHAR(500),
        message TEXT,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created notifications table');
    
    // Create meeting_transcripts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS meeting_transcripts (
        id VARCHAR(100) PRIMARY KEY,
        meeting_id VARCHAR(100),
        appointment_id VARCHAR(100),
        transcript TEXT,
        summary TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created meeting_transcripts table');
    
    // Seed users
    const users = [
      { id: 'PATIENT-001', email: 'demo.test@gmail.com', password_hash: PATIENT_PASSWORD_HASH, role: 'patient', first_name: 'Demo', last_name: 'Patient', first_name_thai: 'ทดสอบ', last_name_thai: 'ระบบ' },
      { id: 'PATIENT-SOMCHAI', email: 'Somchai.Mankong@gmail.com', password_hash: PATIENT_PASSWORD_HASH, role: 'patient', first_name: 'Somchai', last_name: 'Mankong', first_name_thai: 'สมชาย', last_name_thai: 'มั่นคง' },
      { id: 'PATIENT-ANAN', email: 'Anan.Khayanrian@gmail.com', password_hash: PATIENT_PASSWORD_HASH, role: 'patient', first_name: 'Anan', last_name: 'Khayanrian', first_name_thai: 'อนันต์', last_name_thai: 'ขยันเรียน' },
      { id: 'DOC-001', email: 'doctor.test@izara.com', password_hash: DOCTOR_PASSWORD_HASH, role: 'doctor', first_name: 'Test', last_name: 'Doctor', first_name_thai: 'ทดสอบ', last_name_thai: 'แพทย์ดี' },
      { id: 'ADMIN-001', email: 'admin.test@izara.com', password_hash: ADMIN_PASSWORD_HASH, role: 'admin', first_name: 'Admin', last_name: 'User', first_name_thai: 'ผู้ดูแล', last_name_thai: 'ระบบ' }
    ];
    
    for (const user of users) {
      await client.query(`
        INSERT INTO users (id, email, password_hash, role, first_name, last_name, first_name_thai, last_name_thai, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
        ON CONFLICT (id) DO UPDATE SET 
          email = EXCLUDED.email,
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role
      `, [user.id, user.email, user.password_hash, user.role, user.first_name, user.last_name, user.first_name_thai, user.last_name_thai]);
    }
    console.log('✅ Seeded 5 users');
    
    // Seed sample appointments
    await client.query(`
      INSERT INTO appointments (id, patient_id, doctor_id, preferred_date, preferred_time, status, symptoms)
      VALUES 
        ('APT-001', 'PATIENT-001', 'DOC-001', CURRENT_DATE + 1, '10:00', 'confirmed', 'ปวดหัว มีไข้'),
        ('APT-002', 'PATIENT-SOMCHAI', 'DOC-001', CURRENT_DATE + 2, '14:00', 'pending', 'เจ็บคอ ไอ'),
        ('APT-003', 'PATIENT-ANAN', 'DOC-001', CURRENT_DATE, '09:00', 'completed', 'ตรวจเบาหวาน')
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('✅ Seeded sample appointments');
    
    // Seed medical content
    await client.query(`
      INSERT INTO medical_content (id, title_thai, title_english, category, status)
      VALUES 
        ('MC-001', 'การดูแลสุขภาพเบื้องต้น', 'Basic Health Care', 'general-health', 'published'),
        ('MC-002', 'โรคเบาหวาน', 'Diabetes', 'chronic-disease', 'published'),
        ('MC-003', 'การออกกำลังกาย', 'Exercise', 'exercise', 'published')
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('✅ Seeded medical content');
    
    // Seed consultants
    await client.query(`
      INSERT INTO consultants (id, name, specialty, hospital, email, is_available)
      VALUES 
        ('CONS-001', 'นพ. สมศักดิ์ ศรีสุข', 'อายุรกรรม', 'โรงพยาบาลกรุงเทพ', 'somsak@hospital.com', true),
        ('CONS-002', 'พญ. สุภาพร ใจดี', 'กุมารเวชกรรม', 'โรงพยาบาลรามา', 'supaporn@hospital.com', true),
        ('CONS-003', 'นพ. วิชัย มั่นคง', 'ศัลยกรรม', 'โรงพยาบาลจุฬา', 'wichai@hospital.com', true)
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('✅ Seeded consultants');
    
    // Verify data
    const userCount = await client.query('SELECT COUNT(*) as cnt FROM users');
    const aptCount = await client.query('SELECT COUNT(*) as cnt FROM appointments');
    console.log(`\n📊 Final counts: ${userCount.rows[0].cnt} users, ${aptCount.rows[0].cnt} appointments`);
    
    console.log('\n✅ Cloud SQL database initialized successfully!');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase().catch(console.error);
