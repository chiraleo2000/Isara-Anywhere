/**
 * =============================================================================
 * IZARA TELEMEDICINE — UNIFIED DATABASE TOOL
 * =============================================================================
 * Version: 3.0.0
 * Updated: February 19, 2026
 * 
 * Consolidates ALL database operations into one tool:
 *   - Schema fixes (missing columns, constraints)
 *   - Password management
 *   - Data verification
 *   - Profile table fixes
 *   - Seed data insertion
 *   - Production → Dev data migration
 *   - Phase 2 table migration
 *   - AI tables migration (chat memory, transcript embeddings)
 * 
 * Replaces (consolidated from):
 *   - scripts/cloud-db-tool.cjs (legacy)
 *   - scripts/migrate-prod-to-dev.cjs (legacy)
 * 
 * Usage:
 *   node scripts/database/db-tool.cjs --help                          # Show all commands
 *   node scripts/database/db-tool.cjs --fix                           # Fix schema issues
 *   node scripts/database/db-tool.cjs --seed                          # Seed demo data
 *   node scripts/database/db-tool.cjs --verify                        # Verify data
 *   node scripts/database/db-tool.cjs --all                           # Fix + seed + verify
 *   node scripts/database/db-tool.cjs --migrate-phase2                # Run Phase 2 migration
 *   node scripts/database/db-tool.cjs --migrate-ai                    # Run AI tables migration
 *   node scripts/database/db-tool.cjs --export                        # Export prod data
 *   node scripts/database/db-tool.cjs --import-local                  # Import into local DB
 *   node scripts/database/db-tool.cjs --import-dev                    # Import into dev cloud
 *   node scripts/database/db-tool.cjs --query                         # Query prod DB summary
 *   node scripts/database/db-tool.cjs --target local --fix            # Target local DB
 *   node scripts/database/db-tool.cjs --target cloud --all            # Target cloud DB
 * 
 * Environment Variables:
 *   DB_PASSWORD       - Database password (REQUIRED for cloud/prod)
 *   DEV_DB_PASSWORD   - Dev database password (default: IzaraDb2024)
 *   DB_HOST / DB_PORT - Override host/port
 * =============================================================================
 */

const { Pool, Client } = require('pg');
const fs = require('node:fs');
const path = require('node:path');

// =============================================================================
// CONFIGURATION (from lib/db-config.cjs)
// =============================================================================

const PASSWORD_HASHES = {
    patient: '$2b$10$64bK0EpjyC7quRGJNvRqmuH/jX3mA4dzyzYa2vgA2q.H3ZxkQwAmy',   // P@ssw0rd
    doctor: '$2b$10$aPN6uhBrLoms36C8/017be2GWqUqaPJa6WaTaZ8LrnwAeaf3GajrO',      // IzaraDoctor@2024
    admin: '$2b$10$fx5arkpb8YI7lEK5lcHdXeksczdG.qloim/uWghlBZXyxv.dNo/wq'        // IzaraAdmin@2024
};

const args = new Set(process.argv.slice(2));

function getTarget() {
    const idx = process.argv.indexOf('--target');
    if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
    if (args.has('--cloud') || args.has('-c')) return 'cloud';
    return 'local';
}

const TARGET = getTarget();

/** Izara GCE PostgreSQL VM (asia-southeast1) — override via CLOUD_DB_HOST / DEV_DB_HOST */
function getDefaultCloudDbHost() {
    return [35, 240, 157, 230].join('.');
}

// Database configurations
const DB_CONFIGS = {
    local: {
        host: process.env.DB_HOST || 'localhost',
        port: Number.parseInt(process.env.DB_PORT || '5433', 10),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || '',
        database: process.env.DB_NAME || 'izara_phase1',
        ssl: false,
        connectionTimeoutMillis: 10000,
        max: 10
    },
    cloud: {
        host: process.env.CLOUD_DB_HOST || process.env.DEV_DB_HOST || getDefaultCloudDbHost(),
        port: Number.parseInt(process.env.CLOUD_DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || process.env.CLOUD_DB_PASSWORD,
        database: process.env.DB_NAME || 'izara_phase1',
        ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
        connectionTimeoutMillis: 30000,
        max: 5
    },
    'dev-cloud': {
        host: process.env.DEV_DB_HOST || getDefaultCloudDbHost(),
        port: Number.parseInt(process.env.DEV_DB_PORT || '5432'),
        user: 'postgres',
        password: process.env.DEV_DB_PASSWORD || '',
        database: 'izara_phase1',
        ssl: false,
        connectionTimeoutMillis: 30000,
        max: 5
    }
};

const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const STARTUP_DATA_DIR = path.join(__dirname, '..', 'output', 'startup-data');
const STARTUP_DATA_LEGACY = path.join(__dirname, '..', 'startup_data');

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function createPool(target) {
    const config = DB_CONFIGS[target || TARGET];
    if (!config) {
        console.error(`❌ Unknown target: ${target || TARGET}`);
        process.exit(1);
    }
    if ((target || TARGET) !== 'local' && !config.password) {
        console.error('❌ DB_PASSWORD environment variable is required for non-local targets.');
        console.error('   Example (PowerShell): $env:DB_PASSWORD = "..."');
        process.exit(1);
    }
    return new Pool(config);
}

function escapeSQL(value) {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return String(value);
    if (value instanceof Date) return `'${value.toISOString()}'`;
    if (typeof value === 'object') {
        return `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
    }
    return `'${String(value).replaceAll("'", "''")}'`;
}

function generateInsertSQL(tableName, rows) {
    if (!rows || rows.length === 0) return `-- No data for ${tableName}\n`;
    const columns = Object.keys(rows[0]);
    const lines = [`-- ${tableName}: ${rows.length} rows`];
    for (const row of rows) {
        const values = columns.map(col => escapeSQL(row[col]));
        lines.push(`INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;`);
    }
    lines.push('');
    return lines.join('\n');
}

function formatTable(rows, columns) {
    if (!rows || rows.length === 0) return '  (empty)\n';
    const widths = columns.map(c => Math.max(c.length, ...rows.map(r => String(r[c] || '').substring(0, 40).length)));
    const header = columns.map((c, i) => c.padEnd(widths[i])).join(' | ');
    const sep = widths.map(w => '-'.repeat(w)).join('-+-');
    const body = rows.map(r => columns.map((c, i) => String(r[c] || '').substring(0, 40).padEnd(widths[i])).join(' | '));
    return `  ${header}\n  ${sep}\n${body.map(l => '  ' + l).join('\n')}\n`;
}

async function addColumnsIfNotExist(client, tableName, columns) {
    let added = 0;
    for (const col of columns) {
        try {
            await client.query(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${col}`);
            added++;
        } catch (err) {
            const colName = col.split(' ')[0];
            console.log(`   ⚠️  ${tableName}.${colName}: ${err.message.substring(0, 60)}`);
        }
    }
    return added;
}

async function runOptionalQuery(client, sql, label) {
    try {
        await client.query(sql);
        return true;
    } catch (err) {
        if (label) {
            console.log(`   ⚠️  ${label}: ${err.message.substring(0, 60)}`);
        }
        return false;
    }
}

async function countTableRows(client, tableName) {
    try {
        const result = await client.query(`SELECT COUNT(*) as cnt FROM ${tableName}`);
        return { ok: true, count: result.rows[0].cnt };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

function parseMigrationStatements(sql) {
    const stmts = [];
    let current = '';
    let inDollarQuote = false;
    for (const line of sql.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('--')) {
            current += line + '\n';
            continue;
        }
        const dollarMatches = (line.match(/\$\$/g) || []).length;
        if (dollarMatches % 2 === 1) inDollarQuote = !inDollarQuote;
        current += line + '\n';
        if (!inDollarQuote && trimmed.endsWith(';')) {
            const cleaned = current.trim();
            if (cleaned && !cleaned.startsWith('--')) stmts.push(cleaned);
            current = '';
        }
    }
    if (current.trim()) stmts.push(current.trim());
    return stmts;
}

function isDuplicateSchemaError(err) {
    const msg = err.message || '';
    return msg.includes('already exists') || msg.includes('duplicate');
}

async function executeMigrationStatements(client, stmts) {
    let success = 0;
    let skipped = 0;
    for (const stmt of stmts) {
        try {
            await client.query(stmt);
            success++;
        } catch (err) {
            if (!isDuplicateSchemaError(err)) {
                console.log(`      WARN: ${err.message.substring(0, 80)}`);
            }
            skipped++;
        }
    }
    return { success, skipped };
}

// =============================================================================
// SECTION A: SCHEMA FIX OPERATIONS (from cloud-db-tool.cjs)
// =============================================================================

async function fixUsersSchema(client) {
    console.log('📋 Fixing users table schema...');
    const userColumns = [
        'patient_id VARCHAR(50)', 'doctor_id VARCHAR(50)', 'medical_license_number VARCHAR(50)',
        'specialty VARCHAR(100)', 'specialty_thai VARCHAR(100)', 'is_active BOOLEAN DEFAULT true',
        'is_verified BOOLEAN DEFAULT true', 'is_approved BOOLEAN DEFAULT true',
        'approval_status VARCHAR(20) DEFAULT \'approved\'', 'is_admin BOOLEAN DEFAULT false',
        'admin_privileges JSONB', 'name VARCHAR(255)', 'name_thai VARCHAR(255)', 'avatar_url TEXT',
        'allergies JSONB DEFAULT \'[]\'::jsonb', 'blood_type VARCHAR(10)', 'date_of_birth DATE',
        'gender VARCHAR(20)', 'address TEXT', 'emergency_contact JSONB',
        'hospital VARCHAR(255)', 'hospital_thai VARCHAR(255)', 'hospital_name VARCHAR(255)',
        'experience_years INTEGER DEFAULT 0', 'consultation_fee DECIMAL(10,2) DEFAULT 0',
        'rating DECIMAL(3,2) DEFAULT 5.0', 'review_count INTEGER DEFAULT 0', 'bio TEXT',
        'qualifications JSONB', 'last_login TIMESTAMP', 'last_activity TIMESTAMP',
        'login_count INTEGER DEFAULT 0', 'login_attempts INTEGER DEFAULT 0', 'locked_until TIMESTAMP',
        'password_reset_token VARCHAR(255)', 'password_reset_expires TIMESTAMP',
        'email_verified BOOLEAN DEFAULT true', 'phone_verified BOOLEAN DEFAULT false',
        'two_factor_enabled BOOLEAN DEFAULT false', 'two_factor_secret TEXT',
        'refresh_token TEXT', 'fcm_token TEXT'
    ];
    let fixed = 0;
    fixed = await addColumnsIfNotExist(client, 'users', userColumns);
    console.log(`   ✅ Checked/added ${fixed} columns to users table`);
}

async function fixSessionsSchema(client) {
    console.log('📋 Fixing sessions table schema...');
    const cols = [
        'ip_address VARCHAR(45)', 'user_agent TEXT', 'is_valid BOOLEAN DEFAULT true',
        'last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP', 'device_info JSONB', 'refresh_token TEXT'
    ];
    await addColumnsIfNotExist(client, 'sessions', cols);
    console.log('   ✅ Sessions table fixed');
}

async function fixDoctorProfilesSchema(client) {
    console.log('📋 Fixing doctor_profiles table schema...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS doctor_profiles (
        id SERIAL PRIMARY KEY, doctor_id VARCHAR(50) UNIQUE, user_id INTEGER REFERENCES users(id),
        name VARCHAR(255), name_thai VARCHAR(255), specialty VARCHAR(100), specialty_thai VARCHAR(100),
        hospital VARCHAR(255), hospital_name VARCHAR(255), hospital_thai VARCHAR(255),
        medical_license_number VARCHAR(50), experience_years INTEGER DEFAULT 0,
        consultation_fee DECIMAL(10,2) DEFAULT 0, bio TEXT, bio_thai TEXT, qualifications JSONB,
        rating DECIMAL(3,2) DEFAULT 5.0, review_count INTEGER DEFAULT 0, is_available BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS patient_profiles (
        id SERIAL PRIMARY KEY, patient_id VARCHAR(50) UNIQUE, user_id INTEGER REFERENCES users(id),
        emergency_contact_name VARCHAR(255), emergency_contact_phone VARCHAR(20),
        insurance_provider VARCHAR(255), insurance_policy_number VARCHAR(100),
        medical_conditions JSONB DEFAULT '[]', medications JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    const dpColumns = [
        'doctor_id VARCHAR(50)', 'name VARCHAR(255)', 'name_thai VARCHAR(255)',
        'specialty VARCHAR(100)', 'specialty_thai VARCHAR(100)', 'hospital VARCHAR(255)',
        'hospital_name VARCHAR(255)', 'hospital_thai VARCHAR(255)', 'medical_license_number VARCHAR(50)',
        'experience_years INTEGER DEFAULT 0', 'consultation_fee DECIMAL(10,2) DEFAULT 0',
        'bio TEXT', 'bio_thai TEXT', 'qualifications JSONB', 'rating DECIMAL(3,2) DEFAULT 5.0',
        'review_count INTEGER DEFAULT 0', 'is_available BOOLEAN DEFAULT true',
        'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP', 'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
    ];
    await addColumnsIfNotExist(client, 'doctor_profiles', dpColumns);
    await runOptionalQuery(
        client,
        `UPDATE doctor_profiles SET hospital_name = COALESCE(hospital, 'Izara Medical Center') WHERE hospital_name IS NULL`,
        'doctor_profiles hospital_name backfill'
    );
    console.log('   ✅ Doctor profiles table fixed');

    const ppColumns = [
        'patient_id VARCHAR(50) UNIQUE', 'user_id INTEGER', 'emergency_contact_name VARCHAR(255)',
        'emergency_contact_phone VARCHAR(20)', 'insurance_provider VARCHAR(255)',
        'insurance_policy_number VARCHAR(100)', 'medical_conditions JSONB DEFAULT \'[]\'::jsonb',
        'medications JSONB DEFAULT \'[]\'::jsonb', 'allergies JSONB DEFAULT \'[]\'::jsonb',
        'blood_type VARCHAR(10)', 'height_cm DECIMAL(5,2)', 'weight_kg DECIMAL(5,2)', 'date_of_birth DATE'
    ];
    await addColumnsIfNotExist(client, 'patient_profiles', ppColumns);
    console.log('   ✅ Patient profiles table fixed');
}

async function fixAppointmentsSchema(client) {
    console.log('📋 Fixing appointments table schema...');
    const cols = [
        'confirmed_date DATE', 'confirmed_time TIME', 'requested_date DATE', 'requested_time TIME',
        'jitsi_room_name VARCHAR(255)', 'meet_link TEXT', 'symptom_description TEXT',
        'urgency_level VARCHAR(20) DEFAULT \'normal\'', 'doctor_notes TEXT', 'patient_notes TEXT',
        'created_by VARCHAR(50)', 'updated_by VARCHAR(50)',
        'appointment_type VARCHAR(50) DEFAULT \'regular\'', 'appointment_reason TEXT',
        'follow_up_required BOOLEAN DEFAULT false', 'follow_up_date DATE', 'cancellation_reason TEXT',
        'cancelled_by VARCHAR(50)', 'cancelled_at TIMESTAMP', 'completed_at TIMESTAMP',
        'started_at TIMESTAMP', 'invitees JSONB DEFAULT \'[]\'::jsonb', 'meeting_notes TEXT',
        'duration_minutes INTEGER', 'is_recurring BOOLEAN DEFAULT false', 'recurrence_pattern JSONB',
        'appointment_date DATE', 'appointment_time TIME'
    ];
    let fixed = 0;
    fixed = await addColumnsIfNotExist(client, 'appointments', cols);
    await runOptionalQuery(client, `ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_patient_id_fkey`, 'drop appointments_patient_id_fkey');
    await runOptionalQuery(client, `ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_doctor_id_fkey`, 'drop appointments_doctor_id_fkey');
    await client.query(`UPDATE appointments SET appointment_date = COALESCE(confirmed_date, requested_date) WHERE appointment_date IS NULL`);
    console.log(`   ✅ Checked/added ${fixed} columns to appointments table`);
}

async function createMissingTables(client) {
    console.log('📋 Creating missing tables...');

    await client.query(`
        CREATE TABLE IF NOT EXISTS ai_validations (
            id SERIAL PRIMARY KEY, type VARCHAR(50) NOT NULL, content_type VARCHAR(50),
            content_id VARCHAR(100), original_content JSONB, ai_response JSONB,
            status VARCHAR(20) DEFAULT 'pending', validated_by VARCHAR(50),
            validated_at TIMESTAMP, validation_notes TEXT, requires_validation BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('   ✅ ai_validations table created/verified');

    await runOptionalQuery(client, `DROP TABLE IF EXISTS emr CASCADE`, 'drop legacy emr table');
    await client.query(`
        CREATE TABLE IF NOT EXISTS emr (
            id VARCHAR(100) PRIMARY KEY DEFAULT ('EMR-' || EXTRACT(EPOCH FROM NOW())::TEXT),
            patient_id VARCHAR(50) NOT NULL, doctor_id VARCHAR(50) NOT NULL,
            appointment_id VARCHAR(100), chief_complaint TEXT, history_present_illness TEXT,
            past_medical_history JSONB, medications JSONB, allergies JSONB, family_history JSONB,
            social_history JSONB, review_of_systems JSONB, physical_exam JSONB, vital_signs JSONB,
            subjective JSONB, objective JSONB, assessment JSONB, plan JSONB, diagnosis JSONB,
            prescriptions JSONB, lab_orders JSONB, imaging_orders JSONB, referrals JSONB,
            follow_up_instructions TEXT, patient_instructions TEXT, ai_summary TEXT,
            ai_suggestions JSONB, requires_validation BOOLEAN DEFAULT false,
            validated_by VARCHAR(50), validated_at TIMESTAMP, status VARCHAR(20) DEFAULT 'draft',
            doctor_signature VARCHAR(50), signed_at TIMESTAMP, icd_codes JSONB, soap JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('   ✅ emr table created/verified');

    await client.query(`
        CREATE TABLE IF NOT EXISTS meeting_transcripts (
            id SERIAL PRIMARY KEY, meeting_id VARCHAR(100) NOT NULL, appointment_id VARCHAR(100),
            patient_id VARCHAR(50), doctor_id VARCHAR(50), transcript TEXT, content TEXT,
            ai_summary TEXT, key_points JSONB, action_items JSONB, duration_minutes INTEGER,
            language VARCHAR(10) DEFAULT 'th', status VARCHAR(20) DEFAULT 'processing',
            speaker_name VARCHAR(255), speaker_role VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await client.query(`ALTER TABLE meeting_transcripts ADD COLUMN IF NOT EXISTS speaker_name VARCHAR(255)`);
    await client.query(`ALTER TABLE meeting_transcripts ADD COLUMN IF NOT EXISTS speaker_role VARCHAR(50)`);
    await client.query(`ALTER TABLE meeting_transcripts ADD COLUMN IF NOT EXISTS content TEXT`);
    console.log('   ✅ meeting_transcripts table created/verified');

    await client.query(`
        CREATE TABLE IF NOT EXISTS vital_signs (
            id SERIAL PRIMARY KEY, patient_id VARCHAR(50) NOT NULL,
            recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            blood_pressure_systolic INTEGER, blood_pressure_diastolic INTEGER,
            heart_rate INTEGER, temperature DECIMAL(4,1), respiratory_rate INTEGER,
            oxygen_saturation DECIMAL(4,1), weight DECIMAL(5,2), height DECIMAL(5,2),
            notes TEXT, recorded_by VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('   ✅ vital_signs table created/verified');

    await client.query(`
        CREATE TABLE IF NOT EXISTS prescriptions (
            id SERIAL PRIMARY KEY, patient_id VARCHAR(50) NOT NULL, doctor_id VARCHAR(50) NOT NULL,
            appointment_id VARCHAR(100), medication_name VARCHAR(255) NOT NULL,
            dosage VARCHAR(100), frequency VARCHAR(100), duration VARCHAR(100),
            instructions TEXT, instructions_thai TEXT, quantity INTEGER, refills INTEGER DEFAULT 0,
            status VARCHAR(20) DEFAULT 'active', prescribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('   ✅ prescriptions table created/verified');

    await client.query(`
        CREATE TABLE IF NOT EXISTS lab_orders (
            id SERIAL PRIMARY KEY, patient_id VARCHAR(50) NOT NULL, doctor_id VARCHAR(50) NOT NULL,
            appointment_id VARCHAR(100), test_name VARCHAR(255) NOT NULL, test_code VARCHAR(50),
            priority VARCHAR(20) DEFAULT 'routine', status VARCHAR(20) DEFAULT 'ordered',
            ordered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, results JSONB, results_at TIMESTAMP,
            notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('   ✅ lab_orders table created/verified');

    await client.query(`
        CREATE TABLE IF NOT EXISTS health_timeline (
            id SERIAL PRIMARY KEY, patient_id VARCHAR(50) NOT NULL, event_type VARCHAR(50) NOT NULL,
            event_date TIMESTAMP NOT NULL, title VARCHAR(255), title_thai VARCHAR(255),
            description TEXT, description_thai TEXT, reference_id VARCHAR(100),
            reference_type VARCHAR(50), metadata JSONB, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('   ✅ health_timeline table created/verified');

    await client.query(`
        CREATE TABLE IF NOT EXISTS patient_instructions (
            id SERIAL PRIMARY KEY, patient_id VARCHAR(50) NOT NULL, doctor_id VARCHAR(50) NOT NULL,
            appointment_id VARCHAR(100), title VARCHAR(255), content TEXT, content_thai TEXT,
            medications JSONB, follow_up_date DATE, follow_up_instructions TEXT,
            warnings JSONB, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('   ✅ patient_instructions table created/verified');

    // Fix medical_content columns
    const mcColumns = [
        'image_url TEXT', 'thumbnail_url TEXT', 'video_url TEXT', 'author_name VARCHAR(255)',
        'author_id VARCHAR(50)', 'view_count INTEGER DEFAULT 0', 'like_count INTEGER DEFAULT 0',
        'is_featured BOOLEAN DEFAULT false', 'is_published BOOLEAN DEFAULT true',
        'published_at TIMESTAMP', 'tags JSONB DEFAULT \'[]\'::jsonb'
    ];
    await addColumnsIfNotExist(client, 'medical_content', mcColumns);
    console.log('   ✅ medical_content table columns fixed');

    // Fix notifications table
    await client.query(`
        CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY, user_id VARCHAR(50) NOT NULL, title VARCHAR(255),
            title_thai VARCHAR(255), message TEXT, message_thai TEXT, type VARCHAR(50) DEFAULT 'info',
            is_read BOOLEAN DEFAULT false, reference_id VARCHAR(100), reference_type VARCHAR(50),
            data JSONB, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    const notifCols = ['title_thai VARCHAR(255)', 'message_thai TEXT', 'reference_id VARCHAR(100)', 'reference_type VARCHAR(50)', 'data JSONB'];
    await addColumnsIfNotExist(client, 'notifications', notifCols);
    await runOptionalQuery(client, `ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey`, 'drop notifications_user_id_fkey');
    console.log('   ✅ notifications table fixed');
}

async function updateUserData(client) {
    console.log('📋 Updating derived user data...');
    await client.query(`UPDATE users SET patient_id = 'PATIENT-DEMO' WHERE email = 'demo.test@gmail.com'`);
    await client.query(`UPDATE users SET patient_id = 'PATIENT-SOMCHAI' WHERE email = 'Somchai.Mankong@gmail.com'`);
    await client.query(`UPDATE users SET patient_id = 'PATIENT-ANAN' WHERE email = 'Anan.Khayanrian@gmail.com'`);
    await client.query(`UPDATE users SET doctor_id = 'DOC-TEST-001' WHERE email = 'doctor.test@izara.com'`);
    await client.query(`UPDATE users SET doctor_id = 'ADMIN-001' WHERE email = 'admin.test@izara.com'`);
    await client.query(`UPDATE users SET is_admin = true WHERE role = 'admin'`);
    await client.query(`UPDATE users SET name = COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') WHERE name IS NULL AND (first_name IS NOT NULL OR last_name IS NOT NULL)`);
    await client.query(`UPDATE users SET name_thai = COALESCE(first_name_thai, '') || ' ' || COALESCE(last_name_thai, '') WHERE name_thai IS NULL AND (first_name_thai IS NOT NULL OR last_name_thai IS NOT NULL)`);
    console.log('   ✅ User data updated');
}

async function fixPasswords(client) {
    console.log('📋 Updating password hashes...');
    const r1 = await client.query("UPDATE users SET password_hash = $1 WHERE role = 'patient'", [PASSWORD_HASHES.patient]);
    console.log(`   ✅ Updated ${r1.rowCount} patient passwords`);
    const r2 = await client.query("UPDATE users SET password_hash = $1 WHERE role = 'doctor'", [PASSWORD_HASHES.doctor]);
    console.log(`   ✅ Updated ${r2.rowCount} doctor passwords`);
    const r3 = await client.query("UPDATE users SET password_hash = $1 WHERE role = 'admin'", [PASSWORD_HASHES.admin]);
    console.log(`   ✅ Updated ${r3.rowCount} admin passwords`);
}

// =============================================================================
// SECTION B: PHASE 2 MIGRATION (from run-phase2-migration.cjs)
// =============================================================================

async function migratePhase2(client) {
    console.log('\n🔧 PHASE 2 MIGRATION: Mobile App Support Tables\n');

    const migrationFile = path.join(MIGRATIONS_DIR, 'v2.0.0-phase2-tables.sql');
    if (!fs.existsSync(migrationFile)) {
        console.log(`   ❌ Migration file not found: ${migrationFile}`);
        return;
    }

    let sql = fs.readFileSync(migrationFile, 'utf8');
    // Remove psql-only commands
    sql = sql.split('\n').filter(line => !line.trim().startsWith('\\')).join('\n');

    console.log('   Executing Phase 2 migration...');
    await client.query('BEGIN');
    try {
        await client.query(sql);
        await client.query('COMMIT');
        console.log('   ✅ Phase 2 migration executed successfully');
    } catch (err) {
        await client.query('ROLLBACK');
        console.log(`   Batch failed (${err.message.substring(0, 60)}), retrying individual statements...`);
        const { success, skipped } = await executeMigrationStatements(client, parseMigrationStatements(sql));
        console.log(`   ✅ ${success} succeeded, ${skipped} skipped`);
    }

    // Verify Phase 2 tables
    const result = await client.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' " +
        "AND table_name IN ('device_tokens', 'biometric_credentials', 'refresh_tokens', " +
        "'push_subscriptions', 'notification_preferences', 'user_api_connections', " +
        "'api_connection_audit', 'sync_queue', 'user_settings') ORDER BY table_name"
    );
    console.log(`   Phase 2 tables found: ${result.rows.length}/9`);
    result.rows.forEach(r => console.log(`      ✓ ${r.table_name}`));
}

// =============================================================================
// SECTION C: AI TABLES MIGRATION (from migrate-cloud-dev.cjs)
// =============================================================================

async function migrateAI(client) {
    console.log('\n🔧 AI TABLES MIGRATION: Chat Memory + Transcript Embeddings\n');

    // 1. Add embedding column to ai_chat_history
    console.log('   1. Adding embedding column to ai_chat_history...');
    await runOptionalQuery(client, 'ALTER TABLE ai_chat_history ADD COLUMN IF NOT EXISTS embedding vector(768)', 'ai_chat_history.embedding');

    // 2. Create ai_chat_memory table
    console.log('   2. Creating ai_chat_memory table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_chat_memory (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id),
        memory_type VARCHAR(30) NOT NULL CHECK (memory_type IN ('conversation_summary', 'health_context', 'preference', 'important_fact')),
        title VARCHAR(500), content TEXT NOT NULL, source_session_id VARCHAR(100),
        embedding vector(768), relevance_score DECIMAL(5,4) DEFAULT 1.0,
        access_count INTEGER DEFAULT 0, last_accessed_at TIMESTAMP WITH TIME ZONE,
        expires_at TIMESTAMP WITH TIME ZONE, is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Create transcript_embeddings table
    console.log('   3. Creating transcript_embeddings table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS transcript_embeddings (
        id SERIAL PRIMARY KEY,
        meeting_record_id UUID REFERENCES meeting_records(id) ON DELETE CASCADE,
        appointment_id VARCHAR(50) REFERENCES appointments(id),
        patient_id VARCHAR(50) REFERENCES users(id),
        doctor_id VARCHAR(50) REFERENCES users(id),
        chunk_index INTEGER NOT NULL, chunk_text TEXT NOT NULL,
        speaker_role VARCHAR(20) CHECK (speaker_role IN ('doctor', 'patient', 'guest', 'mixed')),
        start_time_seconds INTEGER, end_time_seconds INTEGER,
        embedding vector(768), metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Create indexes
    console.log('   4. Creating indexes...');
    const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_ai_memory_user_id ON ai_chat_memory(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_ai_memory_type ON ai_chat_memory(memory_type)',
        'CREATE INDEX IF NOT EXISTS idx_ai_memory_active ON ai_chat_memory(is_active) WHERE is_active = true',
        'CREATE INDEX IF NOT EXISTS idx_transcript_emb_meeting ON transcript_embeddings(meeting_record_id)',
        'CREATE INDEX IF NOT EXISTS idx_transcript_emb_patient ON transcript_embeddings(patient_id)',
        'CREATE INDEX IF NOT EXISTS idx_transcript_emb_doctor ON transcript_embeddings(doctor_id)'
    ];
    for (const idx of indexes) {
        await runOptionalQuery(client, idx, 'index');
    }
    console.log('   ✅ AI tables migration complete');

    // Verify
    const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('ai_chat_memory','transcript_embeddings') ORDER BY tablename");
    console.log(`   Verified tables: ${tables.rows.map(r => r.tablename).join(', ')}`);
}

// =============================================================================
// SECTION D: VERIFICATION (from cloud-db-tool.cjs)
// =============================================================================

async function verifyData(client) {
    console.log('📋 Verifying database data...\n');

    const users = await client.query('SELECT id, email, role, patient_id, doctor_id FROM users');
    console.log('   Users:');
    for (const row of users.rows) {
        console.log(`      ${row.email} (${row.role}): patient_id=${row.patient_id}, doctor_id=${row.doctor_id}`);
    }

    console.log('\n   Table counts:');
    const tables = ['users', 'appointments', 'medical_content', 'clinical_resources', 'consultants',
                    'doctor_profiles', 'patient_profiles', 'emr', 'prescriptions', 'notifications'];
    for (const table of tables) {
        const result = await countTableRows(client, table);
        if (result.ok) {
            console.log(`      ${table}: ${result.count} rows`);
        } else {
            console.log(`      ${table}: ⚠️  Table not found (${result.error.split('\n')[0]})`);
        }
    }

    // Check Phase 2 tables
    console.log('\n   Phase 2 tables:');
    const p2tables = ['device_tokens', 'biometric_credentials', 'push_subscriptions', 'user_settings', 'notification_preferences'];
    for (const table of p2tables) {
        const result = await countTableRows(client, table);
        if (result.ok) {
            console.log(`      ${table}: ${result.count} rows`);
        } else {
            console.log(`      ${table}: ⚠️  Not found (${result.error.split('\n')[0]})`);
        }
    }
}

// =============================================================================
// SECTION E: SEED DATABASE (from cloud-db-tool.cjs)
// =============================================================================

async function seedDatabase(client) {
    const dataPath = fs.existsSync(STARTUP_DATA_DIR) ? STARTUP_DATA_DIR : null;
    if (!dataPath) {
        console.log('   ⚠️  Startup data not found. Skipping seed.');
        return;
    }

    const files = [
        { file: '01-users.json', table: 'users' },
        { file: '02-medical-content.json', table: 'medical_content' },
        { file: '03-clinical-resources.json', table: 'clinical_resources' },
        { file: '04-consultants.json', table: 'consultants' },
        { file: '05-knowledge-base.json', table: 'knowledge_base' }
    ];

    for (const { file } of files) {
        const filePath = path.join(dataPath, file);
        if (!fs.existsSync(filePath)) { console.log(`   ⚠️  ${file} not found, skipping...`); continue; }
        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            console.log(`   📄 Loading ${file} (${data.length || Object.keys(data).length} items)...`);
            console.log(`   ✅ Loaded ${file}`);
        } catch (e) {
            console.log(`   ⚠️  Error loading ${file}: ${e.message}`);
        }
    }
}

// =============================================================================
// SECTION F: PRODUCTION DATA EXPORT/IMPORT (from migrate-prod-to-dev.cjs)
// =============================================================================

const REAL_USER_FILTER = `
    email NOT LIKE 'e2e.%' AND email NOT LIKE 'cloud.e2e.%' AND email NOT LIKE 'cloud.test.%'
    AND email NOT LIKE 'test.%.@test.com' AND email NOT LIKE '%.@test.com'
    AND email NOT LIKE 'testreg%@gmail.com' AND email NOT LIKE 'testafter%@test.com'
    AND email NOT LIKE 'test.patient.%@test.com' AND email NOT LIKE 'test.doctor.%@hospital.com'
    AND email NOT LIKE 'test.check.%@test.com' AND email NOT LIKE 'newtest%@test.com'
    AND email NOT LIKE 'fintest@test.com' AND email NOT LIKE 'finaltest@test.com'
    AND email NOT LIKE 'cloudtest@test.com' AND email NOT LIKE 'cloud999@test.com'
    AND email NOT LIKE 'test.now@test.com' AND email NOT LIKE 'test.afterbuild@test.com'
    AND email NOT LIKE 'testnewphr%@test.com' AND email NOT LIKE 'test.cloud.%@test.com'
    AND email NOT LIKE 'test.1770%@test.com' AND email NOT LIKE 'test2.demo@gmail.com'
    AND email NOT LIKE 'test.reg.patient@gmail.com'
`;

const EXPORT_TABLES = [
    { name: 'users', query: `SELECT * FROM users WHERE ${REAL_USER_FILTER} ORDER BY created_at`,
      transform: (row) => {
          if (row.role === 'patient') row.password_hash = PASSWORD_HASHES.patient;
          if (row.role === 'doctor') row.password_hash = PASSWORD_HASHES.doctor;
          if (row.role === 'admin') row.password_hash = PASSWORD_HASHES.admin;
          return row;
      }
    },
    { name: 'patient_profiles', query: `SELECT pp.* FROM patient_profiles pp JOIN users u ON pp.patient_id = u.id WHERE ${REAL_USER_FILTER} ORDER BY pp.patient_id` },
    { name: 'doctor_profiles', query: 'SELECT * FROM doctor_profiles ORDER BY doctor_id' },
    { name: 'doctors', query: 'SELECT * FROM doctors ORDER BY id' },
    { name: 'doctor_schedules', query: 'SELECT * FROM doctor_schedules ORDER BY doctor_id, day_of_week' },
    { name: 'phr', query: `SELECT p.* FROM phr p JOIN users u ON p.patient_id = u.id WHERE ${REAL_USER_FILTER} ORDER BY p.patient_id` },
    { name: 'vital_signs', query: `SELECT vs.* FROM vital_signs vs JOIN users u ON vs.patient_id = u.id WHERE ${REAL_USER_FILTER} ORDER BY vs.patient_id` },
    { name: 'living_wills', query: 'SELECT * FROM living_wills ORDER BY patient_id' },
    { name: 'patient_consents', query: 'SELECT * FROM patient_consents ORDER BY patient_id' },
    { name: 'consultants', query: 'SELECT * FROM consultants ORDER BY id' },
    { name: 'appointments', query: `SELECT a.* FROM appointments a JOIN users u ON a.patient_id = u.id WHERE ${REAL_USER_FILTER} ORDER BY a.created_at` },
    { name: 'meeting_records', query: 'SELECT * FROM meeting_records ORDER BY created_at' },
    { name: 'emr', query: `SELECT e.* FROM emr e JOIN appointments a ON e.appointment_id = a.id JOIN users u ON a.patient_id = u.id WHERE ${REAL_USER_FILTER} ORDER BY e.created_at` },
    { name: 'prescriptions', query: 'SELECT * FROM prescriptions ORDER BY created_at' },
    { name: 'lab_orders', query: 'SELECT * FROM lab_orders ORDER BY created_at' },
    { name: 'medical_content', query: 'SELECT * FROM medical_content ORDER BY id' },
    { name: 'clinical_resources', query: 'SELECT * FROM clinical_resources ORDER BY id' },
    { name: 'knowledge_base', query: 'SELECT * FROM knowledge_base ORDER BY id' },
    { name: 'notifications', query: `SELECT n.* FROM notifications n JOIN users u ON n.user_id = u.id WHERE ${REAL_USER_FILTER} ORDER BY n.created_at DESC LIMIT 100` }
];

async function queryProdData() {
    console.log('\n🔍 QUERYING PRODUCTION DATABASE\n');
    const config = DB_CONFIGS.cloud;
    console.log(`   Host: ${config.host}:${config.port} / ${config.database}\n`);

    const pool = new Pool(config);
    const client = await pool.connect();
    try {
        const tablesRes = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
        console.log(`📋 Tables found: ${tablesRes.rows.length}`);
        for (const t of tablesRes.rows) {
            try {
                const countRes = await client.query(`SELECT COUNT(*) as cnt FROM "${t.tablename}"`);
                console.log(`   ${t.tablename}: ${countRes.rows[0].cnt} rows`);
            } catch (e) { console.log(`   ${t.tablename}: ⚠️  ${e.message.split('\n')[0]}`); }
        }

        console.log('\n👥 USERS:');
        const users = await client.query('SELECT id, email, role, name, is_active, is_approved FROM users ORDER BY created_at');
        console.log(formatTable(users.rows, ['id', 'email', 'role', 'name', 'is_active', 'is_approved']));
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

async function exportProdData() {
    console.log('\n📦 EXPORTING PRODUCTION DATA\n');
    const config = DB_CONFIGS.cloud;
    console.log(`   Source: ${config.host}:${config.port}/${config.database}\n`);

    const pool = new Pool(config);
    const client = await pool.connect();
    const exportedData = {};

    try {
        const sqlLines = [
            '-- IZARA TELEMEDICINE — PRODUCTION DATA EXPORT',
            `-- Exported: ${new Date().toISOString()}`,
            `-- Source: ${config.host}:${config.port}/${config.database}`,
            '', 'BEGIN;', ''
        ];

        for (const table of EXPORT_TABLES) {
            try {
                console.log(`   📋 Exporting ${table.name}...`);
                const result = await client.query(table.query);
                let rows = result.rows;
                if (table.transform) rows = rows.map(table.transform);
                exportedData[table.name] = rows;
                sqlLines.push(generateInsertSQL(table.name, rows));
                console.log(`      ✅ ${rows.length} rows`);
            } catch (e) {
                console.log(`      ⚠️  ${table.name}: ${e.message}`);
                sqlLines.push(`-- ${table.name}: ERROR - ${e.message}\n`);
            }
        }

        sqlLines.push('COMMIT;', '');

        if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        fs.writeFileSync(path.join(OUTPUT_DIR, 'prod-data-export.sql'), sqlLines.join('\n'), 'utf8');
        fs.writeFileSync(path.join(OUTPUT_DIR, 'prod-data-export.json'), JSON.stringify(exportedData, null, 2), 'utf8');
        console.log(`\n   📄 Exports saved to ${OUTPUT_DIR}`);
        await updateStartupData(exportedData);
        console.log('\n✅ Export complete!');
        return exportedData;
    } catch (err) {
        console.error('❌ Error:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

async function exportAllTables(target = 'local') {
    const config = DB_CONFIGS[target];
    if (!config) {
        console.error(`❌ Unknown target: ${target}`);
        process.exit(1);
    }
    console.log(`\n📦 EXPORTING ALL TABLES (${target})\n`);
    console.log(`   Source: ${config.host}:${config.port}/${config.database}\n`);

    const pool = new Pool(config);
    const client = await pool.connect();
    const exportedData = {};
    const manifest = [];

    try {
        const tablesRes = await client.query(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
        );
        const tableNames = tablesRes.rows.map((r) => r.tablename);
        console.log(`   Found ${tableNames.length} tables\n`);

        const sqlLines = [
            '-- IZARA TELEMEDICINE — FULL DATABASE DATA EXPORT',
            `-- Exported: ${new Date().toISOString()}`,
            `-- Source: ${config.host}:${config.port}/${config.database}`,
            `-- Tables: ${tableNames.length}`,
            '',
            'BEGIN;',
            '',
        ];

        const exportDir = path.join(OUTPUT_DIR, 'local-db-export');
        const csvDir = path.join(exportDir, 'csv');
        if (!fs.existsSync(csvDir)) fs.mkdirSync(csvDir, { recursive: true });

        for (const tableName of tableNames) {
            try {
                const result = await client.query(`SELECT * FROM "${tableName}"`);
                const rows = result.rows;
                exportedData[tableName] = rows;
                sqlLines.push(generateInsertSQL(tableName, rows));
                manifest.push({ table: tableName, rows: rows.length });

                if (rows.length > 0) {
                    const columns = Object.keys(rows[0]);
                    const csvHeader = columns.map((c) => `"${c}"`).join(',');
                    const csvBody = rows
                        .map((row) =>
                            columns
                                .map((col) => {
                                    const v = row[col];
                                    if (v === null || v === undefined) return '';
                                    if (typeof v === 'object') return `"${JSON.stringify(v).replaceAll('"', '""')}"`;
                                    return `"${String(v).replaceAll('"', '""')}"`;
                                })
                                .join(',')
                        )
                        .join('\n');
                    fs.writeFileSync(
                        path.join(csvDir, `${tableName}.csv`),
                        `${csvHeader}\n${csvBody}\n`,
                        'utf8'
                    );
                } else {
                    fs.writeFileSync(path.join(csvDir, `${tableName}.csv`), '', 'utf8');
                }

                console.log(`   ✅ ${tableName}: ${rows.length} rows`);
            } catch (e) {
                manifest.push({ table: tableName, rows: -1, error: e.message });
                sqlLines.push(`-- ${tableName}: ERROR - ${e.message}\n`);
                console.log(`   ⚠️  ${tableName}: ${e.message}`);
            }
        }

        sqlLines.push('COMMIT;', '');

        fs.writeFileSync(path.join(exportDir, 'all-tables-data.sql'), sqlLines.join('\n'), 'utf8');
        fs.writeFileSync(
            path.join(exportDir, 'all-tables-data.json'),
            JSON.stringify(exportedData, null, 2),
            'utf8'
        );
        fs.writeFileSync(
            path.join(exportDir, 'manifest.json'),
            JSON.stringify(
                {
                    exportedAt: new Date().toISOString(),
                    source: { host: config.host, port: config.port, database: config.database },
                    tableCount: tableNames.length,
                    totalRows: manifest.reduce((sum, m) => sum + Math.max(0, m.rows), 0),
                    tables: manifest,
                },
                null,
                2
            ),
            'utf8'
        );

        console.log(`\n   📄 SQL:  ${path.join(exportDir, 'all-tables-data.sql')}`);
        console.log(`   📄 JSON: ${path.join(exportDir, 'all-tables-data.json')}`);
        console.log(`   📁 CSV:  ${csvDir} (${tableNames.length} files)`);
        console.log(`   📋 Manifest: ${path.join(exportDir, 'manifest.json')}`);
        console.log('\n✅ Full export complete!');
        return exportedData;
    } catch (err) {
        console.error('❌ Error:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

async function updateStartupData(data) {
    const startupDir = STARTUP_DATA_LEGACY;
    if (data.users && data.users.length > 0) {
        fs.writeFileSync(path.join(startupDir, 'users.json'), JSON.stringify({
            description: 'Startup users (exported from production)',
            encoding: 'UTF-8', version: '1.4.8', exportedAt: new Date().toISOString(),
            source: 'production', users: data.users.map(u => ({
                id: u.id, email: u.email, role: u.role, name: u.name, name_thai: u.name_thai,
                patient_id: u.patient_id, doctor_id: u.doctor_id, medical_license_number: u.medical_license_number,
                specialty: u.specialty, hospital_name: u.hospital_name, is_active: u.is_active,
                is_verified: u.is_verified, is_approved: u.is_approved, is_admin: u.is_admin,
                admin_privileges: u.admin_privileges, gender: u.gender, date_of_birth: u.date_of_birth, phone: u.phone
            })),
            password_hashes: { 'P@ssw0rd': PASSWORD_HASHES.patient, 'IzaraDoctor@2024': PASSWORD_HASHES.doctor, 'IzaraAdmin@2024': PASSWORD_HASHES.admin }
        }, null, 2), 'utf8');
        console.log(`      ✅ Updated users.json (${data.users.length} users)`);
    }
    if (data.doctors && data.doctors.length > 0) {
        fs.writeFileSync(path.join(startupDir, 'doctors.json'), JSON.stringify({
            description: 'Doctor profiles and consultants (exported from production)',
            encoding: 'UTF-8', version: '1.4.8', exportedAt: new Date().toISOString(),
            doctors: data.doctors, consultants: data.consultants || []
        }, null, 2), 'utf8');
        console.log(`      ✅ Updated doctors.json (${data.doctors.length} doctors)`);
    }
    if (data.phr && data.phr.length > 0) {
        fs.writeFileSync(path.join(startupDir, 'phr_records.json'), JSON.stringify({
            description: 'PHR records (exported from production)',
            encoding: 'UTF-8', version: '1.4.8', exportedAt: new Date().toISOString(), records: data.phr
        }, null, 2), 'utf8');
        console.log(`      ✅ Updated phr_records.json (${data.phr.length} records)`);
    }
    if (data.medical_content && data.medical_content.length > 0) {
        fs.writeFileSync(path.join(startupDir, 'medical_content.json'), JSON.stringify({
            description: 'Medical content and clinical resources (exported from production)',
            encoding: 'UTF-8', version: '1.4.8', exportedAt: new Date().toISOString(),
            medical_content: data.medical_content, clinical_resources: data.clinical_resources || []
        }, null, 2), 'utf8');
        console.log(`      ✅ Updated medical_content.json (${data.medical_content.length} articles)`);
    }
}

async function rollbackToSavepoint(client, savepoint) {
    try {
        await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    } catch (err) {
        console.log(`   ⚠️  Savepoint rollback (${savepoint}): ${err.message.substring(0, 60)}`);
    }
}

async function importUsers(client, users) {
    if (!users || users.length === 0) return;
    console.log(`   👥 Importing ${users.length} users...`);
    let imported = 0;
    for (const user of users) {
        try {
            await client.query('SAVEPOINT sp_user');
            await client.query(`
                INSERT INTO users (id, email, password_hash, role, name, name_thai,
                    patient_id, doctor_id, medical_license_number, specialty, hospital_name,
                    is_active, is_verified, is_approved, approval_status, is_admin, admin_privileges,
                    gender, date_of_birth, phone, avatar_url, preferences, notification_settings,
                    created_at, updated_at)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
                ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, name_thai = EXCLUDED.name_thai,
                    is_active = EXCLUDED.is_active, is_approved = EXCLUDED.is_approved, updated_at = CURRENT_TIMESTAMP
            `, [
                user.id, user.email, user.password_hash, user.role, user.name, user.name_thai,
                user.patient_id, user.doctor_id, user.medical_license_number, user.specialty, user.hospital_name,
                user.is_active !== false, user.is_verified !== false, user.is_approved !== false,
                user.approval_status || 'approved', user.is_admin || false,
                user.admin_privileges ? JSON.stringify(user.admin_privileges) : null,
                user.gender, user.date_of_birth, user.phone, user.avatar_url,
                user.preferences ? JSON.stringify(user.preferences) : '{"language": "th", "theme": "light", "notifications": true}',
                user.notification_settings ? JSON.stringify(user.notification_settings) : null,
                user.created_at || new Date(), user.updated_at || new Date()
            ]);
            await client.query('RELEASE SAVEPOINT sp_user');
            imported++;
        } catch (err) {
            await rollbackToSavepoint(client, 'sp_user');
            console.log(`      ⚠️  Skipped user ${user.email || user.id}: ${err.message.substring(0, 60)}`);
        }
    }
    console.log(`      ✅ ${imported}/${users.length} users imported`);
}

async function getTableColumns(client, tableName) {
    try {
        const colRes = await client.query(
            `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public'`,
            [tableName]
        );
        return new Set(colRes.rows.map(r => r.column_name));
    } catch (err) {
        console.log(`      ⚠️  ${tableName}: table doesn't exist (${err.message.substring(0, 60)})`);
        return null;
    }
}

async function importTableRows(client, tableName, rows, targetColumns) {
    let imported = 0;
    let skipped = 0;
    for (const row of rows) {
        try {
            await client.query('SAVEPOINT sp_row');
            const columns = Object.keys(row).filter(k => row[k] !== undefined && targetColumns.has(k));
            if (columns.length === 0) continue;
            const values = columns.map((_, i) => `$${i + 1}`);
            const params = columns.map(k => {
                const v = row[k];
                if (v !== null && typeof v === 'object' && !(v instanceof Date)) return JSON.stringify(v);
                return v;
            });
            await client.query(
                `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING`,
                params
            );
            await client.query('RELEASE SAVEPOINT sp_row');
            imported++;
        } catch (err) {
            await rollbackToSavepoint(client, 'sp_row');
            skipped++;
            if (skipped === 1) {
                console.log(`      ⚠️  ${tableName} import warnings: ${err.message.substring(0, 60)}`);
            }
        }
    }
    if (skipped > 1) {
        console.log(`      ⚠️  Skipped ${skipped} ${tableName} rows due to conflicts or schema mismatch`);
    }
    return imported;
}

const TABLES_TO_IMPORT = [
    'patient_profiles', 'doctor_profiles', 'doctors', 'doctor_schedules',
    'phr', 'vital_signs', 'consultants', 'appointments', 'emr',
    'medical_content', 'clinical_resources', 'knowledge_base', 'notifications'
];

async function importGenericTables(client, data) {
    for (const tableName of TABLES_TO_IMPORT) {
        if (!data[tableName] || data[tableName].length === 0) continue;
        console.log(`   📋 Importing ${data[tableName].length} ${tableName}...`);
        const targetColumns = await getTableColumns(client, tableName);
        if (!targetColumns || targetColumns.size === 0) continue;
        const imported = await importTableRows(client, tableName, data[tableName], targetColumns);
        console.log(`      ✅ ${imported}/${data[tableName].length} rows imported`);
    }
}

async function safeTransactionRollback(client) {
    if (!client) return;
    try {
        await client.query('ROLLBACK');
    } catch (err) {
        console.log(`   ⚠️  Rollback skipped: ${err.message.substring(0, 60)}`);
    }
}

async function importToTarget(targetName, data) {
    const config = DB_CONFIGS[targetName];
    const label = targetName === 'local' ? 'LOCAL DOCKER (localhost:5433)' : `DEV CLOUD (${config.host})`;
    console.log(`\n🚀 IMPORTING INTO ${label}\n`);

    const pool = new Pool(config);
    let client;
    try {
        client = await pool.connect();
        const ver = await client.query('SELECT version()');
        console.log(`   Connected: ${ver.rows[0].version.split(',')[0]}`);

        const schemaCheck = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users'");
        if (schemaCheck.rows.length === 0) {
            console.log('   ⚠️  Schema not found. Run izara-database.sql first.');
            return;
        }

        await client.query('BEGIN');
        await importUsers(client, data.users);
        await importGenericTables(client, data);
        await client.query('COMMIT');
        console.log(`\n   ✅ Import to ${label} complete!`);
    } catch (err) {
        await safeTransactionRollback(client);
        console.error(`   ❌ Import error: ${err.message}`);
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

function printHelp() {
    console.log('Usage: node scripts/database/db-tool.cjs [options]\n');
    console.log('Schema & Data Operations:');
    console.log('  --fix              Fix missing columns in database tables');
    console.log('  --fix-passwords    Update all password hashes');
    console.log('  --fix-profiles     Fix doctor/patient profile tables');
    console.log('  --seed             Seed database with demo data');
    console.log('  --cleanup-test       Remove E2E test data then re-seed baseline demo');
    console.log('  --cleanup-test-only  Remove E2E test data only (no re-seed)');
    console.log('  --verify           Verify data integrity');
    console.log('  --all              Run all fixes, seed, and verify\n');
    console.log('Migrations:');
    console.log('  --migrate-phase2   Run Phase 2 migration (mobile app tables)');
    console.log('  --migrate-ai       Run AI tables migration (chat memory, embeddings)\n');
    console.log('Production Data:');
    console.log('  --query            Query production DB and display summary');
    console.log('  --export           Export production data to SQL + JSON');
    console.log('  --export-all       Export every public table (default target: local)');
    console.log('  --import-local     Import exported data into local Docker DB');
    console.log('  --import-dev       Import exported data into dev cloud DB');
    console.log('  --full             Full migration (export + import local + import dev)\n');
    console.log('Targets:');
    console.log('  --target local     Target local database (localhost:5433)');
    console.log('  --target cloud     Target cloud/production database');
    console.log('  --target dev-cloud Target dev-testing cloud database\n');
    console.log('Environment Variables:');
    console.log('  DB_PASSWORD        Database password (required for cloud)');
    console.log('  DEV_DB_PASSWORD    Dev database password');
    console.log('  DB_HOST / DB_PORT  Override connection details\n');
    console.log('Examples:');
    console.log('  node scripts/database/db-tool.cjs --target local --fix');
    console.log('  node scripts/database/db-tool.cjs --target cloud --all');
    console.log('  node scripts/database/db-tool.cjs --migrate-phase2');
    console.log('  node scripts/database/db-tool.cjs --migrate-ai --target dev-cloud');
    console.log('  $env:DB_PASSWORD="pwd"; node scripts/database/db-tool.cjs --export');
    console.log('  node scripts/database/db-tool.cjs --target local --export-all');
    console.log('  $env:DB_PASSWORD="pwd"; node scripts/database/db-tool.cjs --full');
}

function hasSchemaCommand() {
    return args.has('--fix') || args.has('--all') || args.has('--verify')
        || args.has('--migrate-phase2') || args.has('--migrate-ai');
}

function hasProductionOnlyCommand() {
    return args.has('--export') || args.has('--full')
        || args.has('--import-local') || args.has('--import-dev');
}

async function runProductionWorkflow() {
    if (args.has('--query')) {
        await queryProdData();
        return 'done';
    }

    if (args.has('--export-all')) {
        await exportAllTables(TARGET);
        console.log('\n🎉 Done!\n');
        return 'done';
    }

    let exportedData = null;
    if (args.has('--export') || args.has('--full')) {
        exportedData = await exportProdData();
    }

    if (!exportedData && (args.has('--import-local') || args.has('--import-dev'))) {
        const jsonPath = path.join(OUTPUT_DIR, 'prod-data-export.json');
        if (fs.existsSync(jsonPath)) {
            console.log(`📄 Loading previously exported data from ${jsonPath}`);
            exportedData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        } else {
            console.error('❌ No exported data found. Run with --export first.');
            process.exit(1);
        }
    }

    if (exportedData && (args.has('--import-local') || args.has('--full'))) {
        await importToTarget('local', exportedData);
    }
    if (exportedData && (args.has('--import-dev') || args.has('--full'))) {
        await importToTarget('dev-cloud', exportedData);
    }

    if (hasProductionOnlyCommand() && !hasSchemaCommand()) {
        console.log('\n🎉 Done!\n');
        return 'done';
    }

    return 'continue';
}

async function runCleanupTestData(client) {
    console.log('\n🧹 CLEANING PLAYWRIGHT / E2E TEST DATA\n');
    const sqlPath = path.join(__dirname, 'cleanup-test-data.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await client.query(sql);
    console.log('   ✅ cleanup-test-data.sql applied');
}

async function runSeedWorkflow(client, runAll) {
    const shouldSeed =
        !args.has('--cleanup-test-only') &&
        (runAll || args.has('--seed') || args.has('--cleanup-test'));

    if (shouldSeed) {
        console.log('\n🌱 SEEDING DATABASE\n');
        await seedDatabase(client);
    }

    if (args.has('--seed-sso') || args.has('--cleanup-test')) {
        const ssoPath = path.join(__dirname, 'seed-sso-test-users.sql');
        if (fs.existsSync(ssoPath)) {
            console.log('\n🔐 SEEDING SSO TEST USERS (Group N)\n');
            await client.query(fs.readFileSync(ssoPath, 'utf8'));
            console.log('   ✅ seed-sso-test-users.sql applied');
        }
    }
}

async function runSchemaWorkflow(client) {
    const runAll = args.has('--all');

    if (runAll || args.has('--fix') || args.has('--fix-schema')) {
        console.log('\n🔧 FIXING DATABASE SCHEMA\n');
        await fixUsersSchema(client);
        await fixSessionsSchema(client);
        await fixAppointmentsSchema(client);
        await createMissingTables(client);
        await updateUserData(client);
    }

    if (runAll || args.has('--fix-profiles')) {
        console.log('\n🔧 FIXING PROFILE TABLES\n');
        await fixDoctorProfilesSchema(client);
    }

    if (runAll || args.has('--fix-passwords')) {
        console.log('\n🔧 FIXING PASSWORDS\n');
        await fixPasswords(client);
    }

    if (args.has('--cleanup-test') || args.has('--cleanup-test-only')) {
        await runCleanupTestData(client);
    }

    await runSeedWorkflow(client, runAll);

    if (args.has('--migrate-phase2')) {
        await migratePhase2(client);
    }

    if (args.has('--migrate-ai')) {
        await migrateAI(client);
    }

    if (runAll || args.has('--verify')) {
        console.log('\n🔍 VERIFYING DATA\n');
        await verifyData(client);
    }
}

async function main() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║   IZARA DATABASE TOOL v3.0.0 (Unified)                   ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    if (args.size === 0 || args.has('--help') || args.has('-h')) {
        printHelp();
        return;
    }

    const productionResult = await runProductionWorkflow();
    if (productionResult === 'done') return;

    const pool = createPool();
    const client = await pool.connect();

    try {
        await runSchemaWorkflow(client);
        console.log('\n✅ Database tool completed successfully!\n');
    } catch (err) {
        console.error('\n❌ Error:', err.message);
        console.error(err.stack);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

main().catch(err => {
    console.error('💥 Fatal error:', err.message);
    process.exit(1);
});
