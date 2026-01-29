/**
 * =============================================================================
 * IZARA TELEMEDICINE - UNIFIED CLOUD DATABASE TOOL
 * =============================================================================
 * Version: 1.0.0
 * Updated: January 29, 2026
 * 
 * Consolidates all cloud database maintenance operations:
 * - Schema fixes (missing columns, constraints)
 * - Password updates
 * - Data verification
 * - Profile table fixes
 * 
 * Usage:
 *   node scripts/cloud-db-tool.cjs --fix-schema       # Fix missing columns
 *   node scripts/cloud-db-tool.cjs --fix-passwords    # Update password hashes
 *   node scripts/cloud-db-tool.cjs --fix-profiles     # Fix profile tables
 *   node scripts/cloud-db-tool.cjs --verify           # Verify all data
 *   node scripts/cloud-db-tool.cjs --all              # Run all fixes
 * 
 * Environment Variables:
 *   DB_PASSWORD - Database password (REQUIRED)
 * =============================================================================
 */

const { createPool, PASSWORD_HASHES, parseArgs } = require('./lib/db-config.cjs');
const bcrypt = require('bcryptjs');

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

// Create pool with cloud config, overriding password
const pool = require('pg').Pool;
const cloudPool = new pool({
    host: process.env.CLOUD_DB_HOST || '34.143.228.135',
    port: Number.parseInt(process.env.CLOUD_DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: dbPassword,
    database: process.env.DB_NAME || 'izara_phase1',
    ssl: false,
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
}

async function updateUserData(client) {
    console.log('📋 Updating derived user data...');

    await client.query(`
    UPDATE users SET patient_id = id WHERE role = 'patient' AND patient_id IS NULL;
  `);
    await client.query(`
    UPDATE users SET doctor_id = id WHERE role = 'doctor' AND doctor_id IS NULL;
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
    console.log('║   IZARA CLOUD DATABASE TOOL v1.0.0                       ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    const client = await cloudPool.connect();

    try {
        // Show help if no args
        if (args.size === 0 || args.has('--help') || args.has('-h')) {
            console.log('Usage:');
            console.log('  --fix-schema      Fix missing columns in database tables');
            console.log('  --fix-passwords   Update all password hashes');
            console.log('  --fix-profiles    Fix doctor profile tables');
            console.log('  --verify          Verify data integrity');
            console.log('  --all             Run all fixes and verify');
            console.log('  --help, -h        Show this help message');
            console.log('\nRequired environment variable: DB_PASSWORD');
            return;
        }

        const runAll = args.has('--all');

        // Fix schema
        if (runAll || args.has('--fix-schema')) {
            console.log('\n🔧 FIXING DATABASE SCHEMA\n');
            await fixUsersSchema(client);
            await fixSessionsSchema(client);
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

        // Verify
        if (runAll || args.has('--verify')) {
            console.log('\n🔍 VERIFYING DATA\n');
            await verifyData(client);
        }

        console.log('\n✅ Cloud database tool completed successfully!\n');

    } catch (err) {
        console.error('\n❌ Error:', err.message);
        console.error(err.stack);
        process.exit(1);
    } finally {
        client.release();
        await cloudPool.end();
    }
}

main();
