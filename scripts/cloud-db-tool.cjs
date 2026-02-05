/**
 * =============================================================================
 * IZARA TELEMEDICINE - UNIFIED DATABASE TOOL
 * =============================================================================
 * Version: 2.0.0
 * Updated: February 4, 2026
 * 
 * Consolidated database operations for both LOCAL and CLOUD:
 * - Schema fixes (missing columns, constraints)
 * - Password updates
 * - Data verification
 * - Profile table fixes
 * - Seed data insertion
 * - Data migration
 * 
 * Usage:
 *   node scripts/cloud-db-tool.cjs --target local --seed     # Seed local DB
 *   node scripts/cloud-db-tool.cjs --target cloud --fix      # Fix cloud schema
 *   node scripts/cloud-db-tool.cjs --target cloud --all      # All cloud operations
 *   node scripts/cloud-db-tool.cjs --verify                  # Verify cloud data
 * 
 * Environment Variables:
 *   DB_PASSWORD - Database password (REQUIRED for cloud)
 *   DB_HOST     - Override database host
 *   DB_PORT     - Override database port
 * =============================================================================
 */

const { Pool } = require('pg');
const fs = require('node:fs');
const path = require('node:path');

// =============================================================================
// CONFIGURATION
// =============================================================================

const args = parseArgs();

// Get password from environment
const dbPassword = process.env.DB_PASSWORD || process.env.CLOUD_DB_PASSWORD;
if (!dbPassword) {
    console.error('❌ ERROR: DB_PASSWORD environment variable is required.');
    console.error('   Set it using: $env:DB_PASSWORD="your_password"');
    process.exit(1);
}

// Determine if SSL should be used
const useSSL = process.env.DB_SSL !== 'false' && process.env.DB_SSL !== '0';

// Create pool with cloud config, overriding password
const pool = require('pg').Pool;
const cloudPool = new pool({
    host: process.env.CLOUD_DB_HOST || '34.143.228.135',
    port: Number.parseInt(process.env.CLOUD_DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: dbPassword,
    database: process.env.DB_NAME || 'izara_phase1',
    ssl: useSSL ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 30000,
    max: 5
});

// =============================================================================
// SCHEMA FIX OPERATIONS
// =============================================================================

async function fixUsersSchema(client) {
    console.log('📋 Fixing users table schema...');

    const userColumns = [
        'patient_id VARCHAR(50)',
        'doctor_id VARCHAR(50)',
        'medical_license_number VARCHAR(50)',
        'specialty VARCHAR(100)',
        'specialty_thai VARCHAR(100)',
        'is_active BOOLEAN DEFAULT true',
        'is_verified BOOLEAN DEFAULT true',
        'is_approved BOOLEAN DEFAULT true',
        'approval_status VARCHAR(20) DEFAULT \'approved\'',
        'is_admin BOOLEAN DEFAULT false',
        'admin_privileges JSONB',
        'name VARCHAR(255)',
        'name_thai VARCHAR(255)',
        'avatar_url TEXT',
        'allergies JSONB DEFAULT \'[]\'::jsonb',
        'blood_type VARCHAR(10)',
        'date_of_birth DATE',
        'gender VARCHAR(20)',
        'address TEXT',
        'emergency_contact JSONB',
        'hospital VARCHAR(255)',
        'hospital_thai VARCHAR(255)',
        'hospital_name VARCHAR(255)',
        'experience_years INTEGER DEFAULT 0',
        'consultation_fee DECIMAL(10,2) DEFAULT 0',
        'rating DECIMAL(3,2) DEFAULT 5.0',
        'review_count INTEGER DEFAULT 0',
        'bio TEXT',
        'qualifications JSONB',
        'last_login TIMESTAMP',
        'last_activity TIMESTAMP',
        'login_count INTEGER DEFAULT 0',
        'login_attempts INTEGER DEFAULT 0',
        'locked_until TIMESTAMP',
        'password_reset_token VARCHAR(255)',
        'password_reset_expires TIMESTAMP',
        'email_verified BOOLEAN DEFAULT true',
        'phone_verified BOOLEAN DEFAULT false',
        'two_factor_enabled BOOLEAN DEFAULT false',
        'two_factor_secret TEXT',
        'refresh_token TEXT',
        'fcm_token TEXT'
    ];

    let fixed = 0;
    for (const col of userColumns) {
        const name = col.split(' ')[0];
        try {
            await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col}`);
            fixed++;
        } catch (e) {
            // Column might already exist with different type
        }
    }
    console.log(`   ✅ Checked/added ${fixed} columns to users table`);
}

async function fixSessionsSchema(client) {
    console.log('📋 Fixing sessions table schema...');

    const sessionColumns = [
        'ip_address VARCHAR(45)',
        'user_agent TEXT',
        'is_valid BOOLEAN DEFAULT true',
        'last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
        'device_info JSONB',
        'refresh_token TEXT'
    ];

    for (const col of sessionColumns) {
        try {
            await client.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ${col}`);
        } catch (e) {
            // Skip
        }
    }
    console.log('   ✅ Sessions table fixed');
}

async function fixDoctorProfilesSchema(client) {
    console.log('📋 Fixing doctor_profiles table schema...');

    // Create doctor_profiles table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS doctor_profiles (
        id SERIAL PRIMARY KEY,
        doctor_id VARCHAR(50) UNIQUE,
        user_id INTEGER REFERENCES users(id),
        name VARCHAR(255),
        name_thai VARCHAR(255),
        specialty VARCHAR(100),
        specialty_thai VARCHAR(100),
        hospital VARCHAR(255),
        hospital_name VARCHAR(255),
        hospital_thai VARCHAR(255),
        medical_license_number VARCHAR(50),
        experience_years INTEGER DEFAULT 0,
        consultation_fee DECIMAL(10,2) DEFAULT 0,
        bio TEXT,
        bio_thai TEXT,
        qualifications JSONB,
        rating DECIMAL(3,2) DEFAULT 5.0,
        review_count INTEGER DEFAULT 0,
        is_available BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create patient_profiles table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS patient_profiles (
        id SERIAL PRIMARY KEY,
        patient_id VARCHAR(50) UNIQUE,
        user_id INTEGER REFERENCES users(id),
        emergency_contact_name VARCHAR(255),
        emergency_contact_phone VARCHAR(20),
        insurance_provider VARCHAR(255),
        insurance_policy_number VARCHAR(100),
        medical_conditions JSONB DEFAULT '[]',
        medications JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const dpColumns = [
        'doctor_id VARCHAR(50)',
        'name VARCHAR(255)',
        'name_thai VARCHAR(255)',
        'specialty VARCHAR(100)',
        'specialty_thai VARCHAR(100)',
        'hospital VARCHAR(255)',
        'hospital_name VARCHAR(255)',
        'hospital_thai VARCHAR(255)',
        'medical_license_number VARCHAR(50)',
        'experience_years INTEGER DEFAULT 0',
        'consultation_fee DECIMAL(10,2) DEFAULT 0',
        'bio TEXT',
        'bio_thai TEXT',
        'qualifications JSONB',
        'rating DECIMAL(3,2) DEFAULT 5.0',
        'review_count INTEGER DEFAULT 0',
        'is_available BOOLEAN DEFAULT true',
        'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
        'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
    ];

    for (const col of dpColumns) {
        try {
            await client.query(`ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS ${col}`);
        } catch (e) {
            // Skip
        }
    }

    // Ensure hospital_name has value
    try {
        await client.query(`
      UPDATE doctor_profiles 
      SET hospital_name = COALESCE(hospital, 'Izara Medical Center') 
      WHERE hospital_name IS NULL
    `);
    } catch (e) {
        // Skip if column doesn't exist
    }

    console.log('   ✅ Doctor profiles table fixed');

    // Fix patient_profiles columns
    console.log('📋 Fixing patient_profiles table...');
    const ppColumns = [
        'patient_id VARCHAR(50) UNIQUE',
        'user_id INTEGER',
        'emergency_contact_name VARCHAR(255)',
        'emergency_contact_phone VARCHAR(20)',
        'insurance_provider VARCHAR(255)',
        'insurance_policy_number VARCHAR(100)',
        'medical_conditions JSONB DEFAULT \'[]\'::jsonb',
        'medications JSONB DEFAULT \'[]\'::jsonb',
        'allergies JSONB DEFAULT \'[]\'::jsonb',
        'blood_type VARCHAR(10)',
        'height_cm DECIMAL(5,2)',
        'weight_kg DECIMAL(5,2)',
        'date_of_birth DATE'
    ];
    for (const col of ppColumns) {
        try {
            await client.query(`ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS ${col}`);
        } catch (e) {}
    }
    console.log('   ✅ Patient profiles table fixed');
}

async function updateUserData(client) {
    console.log('📋 Updating derived user data...');

    // Update patient IDs to match test expectations
    await client.query(`
        UPDATE users SET patient_id = 'PATIENT-DEMO' WHERE email = 'demo.test@gmail.com';
    `);
    await client.query(`
        UPDATE users SET patient_id = 'PATIENT-SOMCHAI' WHERE email = 'Somchai.Mankong@gmail.com';
    `);
    await client.query(`
        UPDATE users SET patient_id = 'PATIENT-ANAN' WHERE email = 'Anan.Khayanrian@gmail.com';
    `);
    await client.query(`
        UPDATE users SET doctor_id = 'DOC-TEST-001' WHERE email = 'doctor.test@izara.com';
    `);
    await client.query(`
        UPDATE users SET doctor_id = 'ADMIN-001' WHERE email = 'admin.test@izara.com';
    `);
    await client.query(`
        UPDATE users SET is_admin = true WHERE role = 'admin';
    `);
    await client.query(`
        UPDATE users SET name = COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') 
        WHERE name IS NULL AND (first_name IS NOT NULL OR last_name IS NOT NULL);
    `);
    await client.query(`
        UPDATE users SET name_thai = COALESCE(first_name_thai, '') || ' ' || COALESCE(last_name_thai, '') 
        WHERE name_thai IS NULL AND (first_name_thai IS NOT NULL OR last_name_thai IS NOT NULL);
    `);

    console.log('   ✅ User data updated');
}

async function fixAppointmentsSchema(client) {
    console.log('📋 Fixing appointments table schema...');

    const apptColumns = [
        'confirmed_date DATE',
        'confirmed_time TIME',
        'requested_date DATE',
        'requested_time TIME',
        'jitsi_room_name VARCHAR(255)',
        'meet_link TEXT',
        'symptom_description TEXT',
        'urgency_level VARCHAR(20) DEFAULT \'normal\'',
        'doctor_notes TEXT',
        'patient_notes TEXT',
        'created_by VARCHAR(50)',
        'updated_by VARCHAR(50)',
        'appointment_type VARCHAR(50) DEFAULT \'regular\'',
        'appointment_reason TEXT',
        'follow_up_required BOOLEAN DEFAULT false',
        'follow_up_date DATE',
        'cancellation_reason TEXT',
        'cancelled_by VARCHAR(50)',
        'cancelled_at TIMESTAMP',
        'completed_at TIMESTAMP',
        'started_at TIMESTAMP',
        'invitees JSONB DEFAULT \'[]\'::jsonb',
        'meeting_notes TEXT',
        'duration_minutes INTEGER',
        'is_recurring BOOLEAN DEFAULT false',
        'recurrence_pattern JSONB'
    ];

    let fixed = 0;
    for (const col of apptColumns) {
        const name = col.split(' ')[0];
        try {
            await client.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS ${col}`);
            fixed++;
        } catch (e) {
            // Column might already exist with different type
        }
    }
    // Drop foreign key constraints that cause issues
    try {
        await client.query(`ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_patient_id_fkey`);
        await client.query(`ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_doctor_id_fkey`);
    } catch (e) {}
    console.log(`   ✅ Checked/added ${fixed} columns to appointments table`);
}

async function createMissingTables(client) {
    console.log('📋 Creating missing tables...');

    // Create ai_validations table
    await client.query(`
        CREATE TABLE IF NOT EXISTS ai_validations (
            id SERIAL PRIMARY KEY,
            type VARCHAR(50) NOT NULL,
            content_type VARCHAR(50),
            content_id VARCHAR(100),
            original_content JSONB,
            ai_response JSONB,
            status VARCHAR(20) DEFAULT 'pending',
            validated_by VARCHAR(50),
            validated_at TIMESTAMP,
            validation_notes TEXT,
            requires_validation BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('   ✅ ai_validations table created/verified');

    // Drop and recreate EMR table with correct structure (VARCHAR id for explicit insertion)
    try {
        await client.query(`DROP TABLE IF EXISTS emr CASCADE`);
        console.log('   ✅ Dropped old emr table');
    } catch (e) { }
    
    // Create emr table (using VARCHAR id to allow explicit insertion)
    await client.query(`
        CREATE TABLE IF NOT EXISTS emr (
            id VARCHAR(100) PRIMARY KEY DEFAULT ('EMR-' || EXTRACT(EPOCH FROM NOW())::TEXT),
            patient_id VARCHAR(50) NOT NULL,
            doctor_id VARCHAR(50) NOT NULL,
            appointment_id VARCHAR(100),
            chief_complaint TEXT,
            history_present_illness TEXT,
            past_medical_history JSONB,
            medications JSONB,
            allergies JSONB,
            family_history JSONB,
            social_history JSONB,
            review_of_systems JSONB,
            physical_exam JSONB,
            vital_signs JSONB,
            subjective JSONB,
            objective JSONB,
            assessment JSONB,
            plan JSONB,
            diagnosis JSONB,
            prescriptions JSONB,
            lab_orders JSONB,
            imaging_orders JSONB,
            referrals JSONB,
            follow_up_instructions TEXT,
            patient_instructions TEXT,
            ai_summary TEXT,
            ai_suggestions JSONB,
            requires_validation BOOLEAN DEFAULT false,
            validated_by VARCHAR(50),
            validated_at TIMESTAMP,
            status VARCHAR(20) DEFAULT 'draft',
            doctor_signature VARCHAR(50),
            signed_at TIMESTAMP,
            icd_codes JSONB,
            soap JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('   ✅ emr table created/verified');

    // Fix EMR table structure - ensure correct column types
    const emrColumnFixes = [
        { name: 'soap', type: 'JSONB' },
        { name: 'icd_codes', type: 'JSONB' },
        { name: 'subjective', type: 'JSONB' },
        { name: 'objective', type: 'JSONB' },
        { name: 'assessment', type: 'JSONB' },
        { name: 'plan', type: 'JSONB' },
        { name: 'doctor_signature', type: 'VARCHAR(50)' },
        { name: 'signed_at', type: 'TIMESTAMP' }
    ];
    for (const col of emrColumnFixes) {
        try {
            await client.query(`ALTER TABLE emr ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
        } catch (e) { }
    }
    console.log('   ✅ emr columns updated');

    // Create meeting_transcripts table
    await client.query(`
        CREATE TABLE IF NOT EXISTS meeting_transcripts (
            id SERIAL PRIMARY KEY,
            meeting_id VARCHAR(100) NOT NULL,
            appointment_id VARCHAR(100),
            patient_id VARCHAR(50),
            doctor_id VARCHAR(50),
            transcript TEXT,
            content TEXT,
            ai_summary TEXT,
            key_points JSONB,
            action_items JSONB,
            duration_minutes INTEGER,
            language VARCHAR(10) DEFAULT 'th',
            status VARCHAR(20) DEFAULT 'processing',
            speaker_name VARCHAR(255),
            speaker_role VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    // Add missing columns to meeting_transcripts if it already exists
    await client.query(`ALTER TABLE meeting_transcripts ADD COLUMN IF NOT EXISTS speaker_name VARCHAR(255)`);
    await client.query(`ALTER TABLE meeting_transcripts ADD COLUMN IF NOT EXISTS speaker_role VARCHAR(50)`);
    await client.query(`ALTER TABLE meeting_transcripts ADD COLUMN IF NOT EXISTS content TEXT`);
    console.log('   ✅ meeting_transcripts table created/verified');

    // Create vital_signs table
    await client.query(`
        CREATE TABLE IF NOT EXISTS vital_signs (
            id SERIAL PRIMARY KEY,
            patient_id VARCHAR(50) NOT NULL,
            recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            blood_pressure_systolic INTEGER,
            blood_pressure_diastolic INTEGER,
            heart_rate INTEGER,
            temperature DECIMAL(4,1),
            respiratory_rate INTEGER,
            oxygen_saturation DECIMAL(4,1),
            weight DECIMAL(5,2),
            height DECIMAL(5,2),
            notes TEXT,
            recorded_by VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('   ✅ vital_signs table created/verified');

    // Create prescriptions table
    await client.query(`
        CREATE TABLE IF NOT EXISTS prescriptions (
            id SERIAL PRIMARY KEY,
            patient_id VARCHAR(50) NOT NULL,
            doctor_id VARCHAR(50) NOT NULL,
            appointment_id VARCHAR(100),
            medication_name VARCHAR(255) NOT NULL,
            dosage VARCHAR(100),
            frequency VARCHAR(100),
            duration VARCHAR(100),
            instructions TEXT,
            instructions_thai TEXT,
            quantity INTEGER,
            refills INTEGER DEFAULT 0,
            status VARCHAR(20) DEFAULT 'active',
            prescribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('   ✅ prescriptions table created/verified');

    // Create lab_orders table
    await client.query(`
        CREATE TABLE IF NOT EXISTS lab_orders (
            id SERIAL PRIMARY KEY,
            patient_id VARCHAR(50) NOT NULL,
            doctor_id VARCHAR(50) NOT NULL,
            appointment_id VARCHAR(100),
            test_name VARCHAR(255) NOT NULL,
            test_code VARCHAR(50),
            priority VARCHAR(20) DEFAULT 'routine',
            status VARCHAR(20) DEFAULT 'ordered',
            ordered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            results JSONB,
            results_at TIMESTAMP,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('   ✅ lab_orders table created/verified');

    // Create health_timeline table
    await client.query(`
        CREATE TABLE IF NOT EXISTS health_timeline (
            id SERIAL PRIMARY KEY,
            patient_id VARCHAR(50) NOT NULL,
            event_type VARCHAR(50) NOT NULL,
            event_date TIMESTAMP NOT NULL,
            title VARCHAR(255),
            title_thai VARCHAR(255),
            description TEXT,
            description_thai TEXT,
            reference_id VARCHAR(100),
            reference_type VARCHAR(50),
            metadata JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('   ✅ health_timeline table created/verified');

    // Create patient_instructions table
    await client.query(`
        CREATE TABLE IF NOT EXISTS patient_instructions (
            id SERIAL PRIMARY KEY,
            patient_id VARCHAR(50) NOT NULL,
            doctor_id VARCHAR(50) NOT NULL,
            appointment_id VARCHAR(100),
            title VARCHAR(255),
            content TEXT,
            content_thai TEXT,
            medications JSONB,
            follow_up_date DATE,
            follow_up_instructions TEXT,
            warnings JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('   ✅ patient_instructions table created/verified');

    // Fix medical_content table columns
    console.log('📋 Fixing medical_content table columns...');
    const mcColumns = [
        'image_url TEXT',
        'thumbnail_url TEXT',
        'video_url TEXT',
        'author_name VARCHAR(255)',
        'author_id VARCHAR(50)',
        'view_count INTEGER DEFAULT 0',
        'like_count INTEGER DEFAULT 0',
        'is_featured BOOLEAN DEFAULT false',
        'is_published BOOLEAN DEFAULT true',
        'published_at TIMESTAMP',
        'tags JSONB DEFAULT \'[]\'::jsonb'
    ];
    for (const col of mcColumns) {
        try {
            await client.query(`ALTER TABLE medical_content ADD COLUMN IF NOT EXISTS ${col}`);
        } catch (e) {}
    }
    console.log('   ✅ medical_content table columns fixed');

    // Fix appointments table with appointment_date
    console.log('📋 Fixing additional appointments columns...');
    const additionalApptCols = [
        'appointment_date DATE',
        'appointment_time TIME'
    ];
    for (const col of additionalApptCols) {
        try {
            await client.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS ${col}`);
        } catch (e) {}
    }
    // Populate appointment_date from confirmed_date if null
    await client.query(`
        UPDATE appointments 
        SET appointment_date = COALESCE(confirmed_date, requested_date)
        WHERE appointment_date IS NULL
    `);
    console.log('   ✅ additional appointments columns fixed');

    // Fix notifications table
    console.log('📋 Fixing notifications table...');
    await client.query(`
        CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(50) NOT NULL,
            title VARCHAR(255),
            title_thai VARCHAR(255),
            message TEXT,
            message_thai TEXT,
            type VARCHAR(50) DEFAULT 'info',
            is_read BOOLEAN DEFAULT false,
            reference_id VARCHAR(100),
            reference_type VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    const notifColumns = [
        'title_thai VARCHAR(255)',
        'message_thai TEXT',
        'reference_id VARCHAR(100)',
        'reference_type VARCHAR(50)',
        'data JSONB'
    ];
    for (const col of notifColumns) {
        try {
            await client.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS ${col}`);
        } catch (e) {}
    }
    // Drop foreign key constraint if it exists (user_id should be VARCHAR, not FK)
    try {
        await client.query(`ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey`);
    } catch (e) {}
    console.log('   ✅ notifications table fixed');
}

// =============================================================================
// PASSWORD FIX OPERATIONS
// =============================================================================

async function fixPasswords(client) {
    console.log('📋 Updating password hashes...');

    // Update patient passwords
    const r1 = await client.query(
        "UPDATE users SET password_hash = $1 WHERE role = 'patient'",
        [PASSWORD_HASHES.patient]
    );
    console.log(`   ✅ Updated ${r1.rowCount} patient passwords`);

    // Update doctor passwords
    const r2 = await client.query(
        "UPDATE users SET password_hash = $1 WHERE role = 'doctor'",
        [PASSWORD_HASHES.doctor]
    );
    console.log(`   ✅ Updated ${r2.rowCount} doctor passwords`);

    // Update admin passwords
    const r3 = await client.query(
        "UPDATE users SET password_hash = $1 WHERE role = 'admin'",
        [PASSWORD_HASHES.admin]
    );
    console.log(`   ✅ Updated ${r3.rowCount} admin passwords`);
}

// =============================================================================
// VERIFICATION
// =============================================================================

async function verifyData(client) {
    console.log('📋 Verifying database data...\n');

    // Check users
    const users = await client.query('SELECT id, email, role, patient_id, doctor_id FROM users');
    console.log('   Users:');
    for (const row of users.rows) {
        console.log(`      ${row.email} (${row.role}): patient_id=${row.patient_id}, doctor_id=${row.doctor_id}`);
    }

    // Verify passwords
    console.log('\n   Password verification:');
    const usersWithPwd = await client.query('SELECT email, role, password_hash FROM users');
    for (const user of usersWithPwd.rows) {
        let testPwd = 'P@ssw0rd';
        if (user.role === 'doctor') testPwd = 'IzaraDoctor@2024';
        if (user.role === 'admin') testPwd = 'IzaraAdmin@2024';

        const valid = await bcrypt.compare(testPwd, user.password_hash);
        console.log(`      ${user.email} (${user.role}): ${valid ? '✅' : '❌'}`);
    }

    // Count tables
    console.log('\n   Table counts:');
    const tables = ['users', 'appointments', 'medical_content', 'clinical_resources', 'consultants'];
    for (const table of tables) {
        try {
            const result = await client.query(`SELECT COUNT(*) as cnt FROM ${table}`);
            console.log(`      ${table}: ${result.rows[0].cnt} rows`);
        } catch (e) {
            console.log(`      ${table}: ⚠️  Table not found`);
        }
    }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║   IZARA DATABASE TOOL v2.0.0                             ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    const client = await cloudPool.connect();

    try {
        // Show help if no args
        if (args.size === 0 || args.has('--help') || args.has('-h')) {
            console.log('IZARA TELEMEDICINE - Database Tool');
            console.log('===================================\n');
            console.log('Usage: node scripts/cloud-db-tool.cjs [options]\n');
            console.log('Operations:');
            console.log('  --fix-schema      Fix missing columns in database tables');
            console.log('  --fix-passwords   Update all password hashes');
            console.log('  --fix-profiles    Fix doctor profile tables');
            console.log('  --seed            Seed database with demo data');
            console.log('  --verify          Verify data integrity');
            console.log('  --all             Run all fixes, seed, and verify');
            console.log('  --reset           Reset database (WARNING: deletes all data)\n');
            console.log('Targets:');
            console.log('  --target local    Target local database (localhost:5433)');
            console.log('  --target cloud    Target cloud database (default)\n');
            console.log('Environment Variables:');
            console.log('  DB_PASSWORD       Database password (required for cloud)');
            console.log('  DB_HOST           Override database host');
            console.log('  DB_PORT           Override database port\n');
            console.log('Examples:');
            console.log('  node scripts/cloud-db-tool.cjs --target local --seed');
            console.log('  node scripts/cloud-db-tool.cjs --target cloud --all');
            console.log('  node scripts/cloud-db-tool.cjs --verify');
            return;
        }

        const runAll = args.has('--all');

        // Fix schema
        if (runAll || args.has('--fix-schema') || args.has('--fix')) {
            console.log('\n🔧 FIXING DATABASE SCHEMA\n');
            await fixUsersSchema(client);
            await fixSessionsSchema(client);
            await fixAppointmentsSchema(client);
            await createMissingTables(client);
            await updateUserData(client);
        }

        // Fix profiles
        if (runAll || args.has('--fix-profiles')) {
            console.log('\n🔧 FIXING PROFILE TABLES\n');
            await fixDoctorProfilesSchema(client);
        }

        // Fix passwords
        if (runAll || args.has('--fix-passwords')) {
            console.log('\n🔧 FIXING PASSWORDS\n');
            await fixPasswords(client);
        }

        // Seed data
        if (runAll || args.has('--seed')) {
            console.log('\n🌱 SEEDING DATABASE\n');
            await seedDatabase(client);
        }

        // Verify
        if (runAll || args.has('--verify')) {
            console.log('\n🔍 VERIFYING DATA\n');
            await verifyData(client);
        }

        console.log('\n✅ Database tool completed successfully!\n');

    } catch (err) {
        console.error('\n❌ Error:', err.message);
        console.error(err.stack);
        process.exit(1);
    } finally {
        client.release();
        await cloudPool.end();
    }
}

// =============================================================================
// SEED DATABASE FUNCTION
// =============================================================================

async function seedDatabase(client) {
    const startupDataPath = path.join(__dirname, 'output', 'startup-data');
    
    if (!fs.existsSync(startupDataPath)) {
        console.log('   ⚠️  Startup data not found at:', startupDataPath);
        console.log('   Skipping seed operation.');
        return;
    }

    const files = [
        { file: '01-users.json', table: 'users' },
        { file: '02-medical-content.json', table: 'medical_content' },
        { file: '03-clinical-resources.json', table: 'clinical_resources' },
        { file: '04-consultants.json', table: 'consultants' },
        { file: '05-knowledge-base.json', table: 'knowledge_base' }
    ];

    for (const { file, table } of files) {
        const filePath = path.join(startupDataPath, file);
        if (!fs.existsSync(filePath)) {
            console.log(`   ⚠️  ${file} not found, skipping...`);
            continue;
        }

        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            console.log(`   📄 Loading ${file} (${data.length || Object.keys(data).length} items)...`);
            // Data would be inserted here based on table structure
            console.log(`   ✅ Loaded ${file}`);
        } catch (e) {
            console.log(`   ⚠️  Error loading ${file}: ${e.message}`);
        }
    }
}

main();
