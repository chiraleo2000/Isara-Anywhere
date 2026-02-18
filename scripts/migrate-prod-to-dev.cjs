/**
 * =============================================================================
 * IZARA TELEMEDICINE — MIGRATE PRODUCTION DATA (v1.4.7) → DEV (v1.4.8)
 * =============================================================================
 * Version: 1.0.0
 * Updated: 2026-02-15
 * 
 * This script:
 *   1. Connects to the production v1.4.7 Cloud SQL database
 *   2. Exports all users, appointments, PHR, medical content, etc.
 *   3. Generates SQL INSERT statements for the dev startup
 *   4. Optionally imports directly into the dev v1.4.8 database (cloud or local)
 * 
 * Usage:
 *   # Export prod data to SQL file (for review)
 *   $env:DB_PASSWORD="your_prod_password"; node scripts/migrate-prod-to-dev.cjs --export
 * 
 *   # Export + import into local Docker DB
 *   $env:DB_PASSWORD="your_prod_password"; node scripts/migrate-prod-to-dev.cjs --export --import-local
 * 
 *   # Export + import into dev cloud DB
 *   $env:DB_PASSWORD="your_prod_password"; node scripts/migrate-prod-to-dev.cjs --export --import-dev
 * 
 *   # Full migration (export from prod → import into both local + dev cloud)
 *   $env:DB_PASSWORD="your_prod_password"; node scripts/migrate-prod-to-dev.cjs --full
 * 
 *   # Just query and show what's in production
 *   $env:DB_PASSWORD="your_prod_password"; node scripts/migrate-prod-to-dev.cjs --query
 * 
 * Environment Variables:
 *   DB_PASSWORD       - Production database password (REQUIRED)
 *   DEV_DB_PASSWORD   - Dev database password (default: IzaraDb2024)
 * =============================================================================
 */

const { Pool } = require('pg');
const fs = require('node:fs');
const path = require('node:path');

// =============================================================================
// CONFIGURATION
// =============================================================================

const args = new Set(process.argv.slice(2));

// Production v1.4.7 database (Cloud SQL)
const PROD_CONFIG = {
    host: process.env.PROD_DB_HOST || '34.143.228.135',
    port: Number.parseInt(process.env.PROD_DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'izara_phase1',
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
    max: 5
};

// Dev v1.4.8 Cloud database (GCE VM)
const DEV_CLOUD_CONFIG = {
    host: process.env.DEV_DB_HOST || '35.240.162.227',
    port: Number.parseInt(process.env.DEV_DB_PORT || '5432', 10),
    user: 'postgres',
    password: process.env.DEV_DB_PASSWORD || 'IzaraDb2024',
    database: 'izara_phase1',
    ssl: false,
    connectionTimeoutMillis: 30000,
    max: 5
};

// Local Docker database
const LOCAL_CONFIG = {
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    password: process.env.LOCAL_DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'IzaraDb2024',
    database: 'izara_phase1',
    ssl: false,
    connectionTimeoutMillis: 10000,
    max: 5
};

// Password hashes (pre-computed bcrypt)
const PASSWORD_HASHES = {
    patient: '$2b$10$64bK0EpjyC7quRGJNvRqmuH/jX3mA4dzyzYa2vgA2q.H3ZxkQwAmy',   // P@ssw0rd
    doctor: '$2b$10$aPN6uhBrLoms36C8/017be2GWqUqaPJa6WaTaZ8LrnwAeaf3GajrO',     // IzaraDoctor@2024
    admin: '$2b$10$fx5arkpb8YI7lEK5lcHdXeksczdG.qloim/uWghlBZXyxv.dNo/wq'       // IzaraAdmin@2024
};

// Output directory
const OUTPUT_DIR = path.join(__dirname, 'output');

// =============================================================================
// TABLES TO EXPORT (in dependency order)
// =============================================================================

// =============================================================================
// FILTER: Only export real users (not E2E test garbage)
// E2E test users typically have emails like e2e.*, test.*.@test.com, cloud.e2e.*
// =============================================================================
const REAL_USER_FILTER = `
    email NOT LIKE 'e2e.%'
    AND email NOT LIKE 'cloud.e2e.%'
    AND email NOT LIKE 'cloud.test.%'
    AND email NOT LIKE 'test.%.@test.com'
    AND email NOT LIKE '%.@test.com'
    AND email NOT LIKE 'testreg%@gmail.com'
    AND email NOT LIKE 'testafter%@test.com'
    AND email NOT LIKE 'test.patient.%@test.com'
    AND email NOT LIKE 'test.doctor.%@hospital.com'
    AND email NOT LIKE 'test.check.%@test.com'
    AND email NOT LIKE 'newtest%@test.com'
    AND email NOT LIKE 'fintest@test.com'
    AND email NOT LIKE 'finaltest@test.com'
    AND email NOT LIKE 'cloudtest@test.com'
    AND email NOT LIKE 'cloud999@test.com'
    AND email NOT LIKE 'test.now@test.com'
    AND email NOT LIKE 'test.afterbuild@test.com'
    AND email NOT LIKE 'testnewphr%@test.com'
    AND email NOT LIKE 'test.cloud.%@test.com'
    AND email NOT LIKE 'test.1770%@test.com'
    AND email NOT LIKE 'test2.demo@gmail.com'
    AND email NOT LIKE 'test.reg.patient@gmail.com'
`;

const EXPORT_TABLES = [
    {
        name: 'users',
        query: `SELECT * FROM users WHERE ${REAL_USER_FILTER} ORDER BY created_at`,
        transform: (row) => {
            // Ensure password hash is set correctly for dev
            if (row.role === 'patient') row.password_hash = PASSWORD_HASHES.patient;
            if (row.role === 'doctor') row.password_hash = PASSWORD_HASHES.doctor;
            if (row.role === 'admin') row.password_hash = PASSWORD_HASHES.admin;
            return row;
        }
    },
    {
        name: 'patient_profiles',
        query: `SELECT pp.* FROM patient_profiles pp JOIN users u ON pp.patient_id = u.id WHERE ${REAL_USER_FILTER} ORDER BY pp.patient_id`
    },
    {
        name: 'doctor_profiles',
        query: 'SELECT * FROM doctor_profiles ORDER BY doctor_id'
    },
    {
        name: 'doctors',
        query: 'SELECT * FROM doctors ORDER BY id'
    },
    {
        name: 'doctor_schedules',
        query: 'SELECT * FROM doctor_schedules ORDER BY doctor_id, day_of_week'
    },
    {
        name: 'phr',
        query: `SELECT p.* FROM phr p JOIN users u ON p.patient_id = u.id WHERE ${REAL_USER_FILTER} ORDER BY p.patient_id`
    },
    {
        name: 'vital_signs',
        query: `SELECT vs.* FROM vital_signs vs JOIN users u ON vs.patient_id = u.id WHERE ${REAL_USER_FILTER} ORDER BY vs.patient_id`
    },
    {
        name: 'living_wills',
        query: 'SELECT * FROM living_wills ORDER BY patient_id'
    },
    {
        name: 'patient_consents',
        query: 'SELECT * FROM patient_consents ORDER BY patient_id'
    },
    {
        name: 'consultants',
        query: 'SELECT * FROM consultants ORDER BY id'
    },
    {
        name: 'appointments',
        query: `SELECT a.* FROM appointments a JOIN users u ON a.patient_id = u.id WHERE ${REAL_USER_FILTER} ORDER BY a.created_at`
    },
    {
        name: 'meeting_records',
        query: 'SELECT * FROM meeting_records ORDER BY created_at'
    },
    {
        name: 'emr',
        query: `SELECT e.* FROM emr e JOIN appointments a ON e.appointment_id = a.id JOIN users u ON a.patient_id = u.id WHERE ${REAL_USER_FILTER} ORDER BY e.created_at`
    },
    {
        name: 'prescriptions',
        query: 'SELECT * FROM prescriptions ORDER BY created_at'
    },
    {
        name: 'lab_orders',
        query: 'SELECT * FROM lab_orders ORDER BY created_at'
    },
    {
        name: 'medical_content',
        query: 'SELECT * FROM medical_content ORDER BY id'
    },
    {
        name: 'clinical_resources',
        query: 'SELECT * FROM clinical_resources ORDER BY id'
    },
    {
        name: 'knowledge_base',
        query: 'SELECT * FROM knowledge_base ORDER BY id'
    },
    {
        name: 'notifications',
        query: `SELECT n.* FROM notifications n JOIN users u ON n.user_id = u.id WHERE ${REAL_USER_FILTER} ORDER BY n.created_at DESC LIMIT 100`
    }
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function escapeSQL(value) {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return String(value);
    if (value instanceof Date) return `'${value.toISOString()}'`;
    if (typeof value === 'object') {
        return `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
    }
    // String
    return `'${String(value).replaceAll("'", "''")}'`;
}

function generateInsertSQL(tableName, rows) {
    if (!rows || rows.length === 0) return `-- No data for ${tableName}\n`;

    const columns = Object.keys(rows[0]);
    const lines = [];
    lines.push(`-- ${tableName}: ${rows.length} rows from production v1.4.7`);

    for (const row of rows) {
        const values = columns.map(col => escapeSQL(row[col]));
        lines.push(
            `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;`
        );
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
    const bodyLines = body.map(l => '  ' + l);
    return `  ${header}\n  ${sep}\n${bodyLines.join('\n')}\n`;
}

// =============================================================================
// QUERY PRODUCTION DATA (--query)
// =============================================================================

async function queryProdData() {
    console.log('\n🔍 QUERYING PRODUCTION v1.4.7 DATABASE\n');
    console.log(`   Host: ${PROD_CONFIG.host}:${PROD_CONFIG.port}`);
    console.log(`   Database: ${PROD_CONFIG.database}\n`);

    const pool = new Pool(PROD_CONFIG);
    const client = await pool.connect();

    try {
        // 1. List all tables
        const tablesRes = await client.query(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
        );
        console.log(`📋 Tables found: ${tablesRes.rows.length}`);
        for (const t of tablesRes.rows) {
            try {
                const countRes = await client.query(`SELECT COUNT(*) as cnt FROM "${t.tablename}"`);
                console.log(`   ${t.tablename}: ${countRes.rows[0].cnt} rows`);
            } catch (e) {
                console.log(`   ${t.tablename}: ⚠️  ${e.message.split('\n')[0]}`);
            }
        }

        // 2. Show users
        console.log('\n👥 USERS:');
        const users = await client.query(
            'SELECT id, email, role, name, name_thai, patient_id, doctor_id, is_active, is_approved, created_at FROM users ORDER BY created_at'
        );
        console.log(formatTable(users.rows, ['id', 'email', 'role', 'name', 'is_active', 'is_approved']));

        // 3. Show appointments
        console.log('📅 APPOINTMENTS:');
        try {
            const apts = await client.query(
                'SELECT id, patient_id, doctor_id, status, confirmed_date, created_at FROM appointments ORDER BY created_at DESC LIMIT 10'
            );
            console.log(formatTable(apts.rows, ['id', 'patient_id', 'doctor_id', 'status', 'confirmed_date']));
        } catch (e) {
            console.log('   ⚠️  appointments table not accessible:', e.message);
        }

        // 4. Show PHR records
        console.log('🏥 PHR RECORDS:');
        try {
            const phr = await client.query(
                'SELECT id, patient_id, blood_type, height_cm, weight_kg, created_at FROM phr ORDER BY patient_id'
            );
            console.log(formatTable(phr.rows, ['id', 'patient_id', 'blood_type', 'height_cm', 'weight_kg']));
        } catch (e) {
            console.log('   ⚠️  phr table not accessible:', e.message);
        }

        // 5. Show medical content
        console.log('📚 MEDICAL CONTENT:');
        try {
            const mc = await client.query(
                'SELECT id, title_thai, category, status FROM medical_content ORDER BY id'
            );
            console.log(formatTable(mc.rows, ['id', 'title_thai', 'category', 'status']));
        } catch (e) {
            console.log('   ⚠️  medical_content table not accessible:', e.message);
        }

        // 6. Show doctors
        console.log('👨‍⚕️ DOCTORS TABLE:');
        try {
            const docs = await client.query(
                'SELECT id, name, specialty, hospital, rating, is_available FROM doctors ORDER BY id'
            );
            console.log(formatTable(docs.rows, ['id', 'name', 'specialty', 'rating']));
        } catch (e) {
            console.log('   ⚠️  doctors table not accessible:', e.message);
        }

        // 7. Show consultants
        console.log('🩺 CONSULTANTS:');
        try {
            const cons = await client.query(
                'SELECT id, name, specialty, hospital, is_available FROM consultants ORDER BY id'
            );
            console.log(formatTable(cons.rows, ['id', 'name', 'specialty', 'hospital']));
        } catch (e) {
            console.log('   ⚠️  consultants table not accessible:', e.message);
        }

        console.log('\n✅ Production query complete!');

    } catch (err) {
        console.error('❌ Error querying production:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

// =============================================================================
// EXPORT PRODUCTION DATA (--export)
// =============================================================================

async function exportProdData() {
    console.log('\n📦 EXPORTING PRODUCTION v1.4.7 DATA\n');
    console.log(`   Source: ${PROD_CONFIG.host}:${PROD_CONFIG.port}/${PROD_CONFIG.database}\n`);

    const pool = new Pool(PROD_CONFIG);
    const client = await pool.connect();
    const exportedData = {};

    try {
        const sqlLines = [];
        sqlLines.push(
            '-- =============================================================================',
            '-- IZARA TELEMEDICINE — PRODUCTION DATA EXPORT (v1.4.7 → v1.4.8)',
            `-- Exported: ${new Date().toISOString()}`,
            `-- Source: ${PROD_CONFIG.host}:${PROD_CONFIG.port}/${PROD_CONFIG.database}`,
            '-- =============================================================================',
            '',
            'BEGIN;',
            ''
        );

        for (const table of EXPORT_TABLES) {
            try {
                console.log(`   📋 Exporting ${table.name}...`);
                const result = await client.query(table.query);
                let rows = result.rows;
                
                if (table.transform) {
                    rows = rows.map(table.transform);
                }

                exportedData[table.name] = rows;
                sqlLines.push(generateInsertSQL(table.name, rows));
                console.log(`      ✅ ${rows.length} rows`);
            } catch (e) {
                console.log(`      ⚠️  ${table.name}: ${e.message}`);
                sqlLines.push(`-- ${table.name}: ERROR - ${e.message}\n`);
            }
        }

        sqlLines.push(
            'COMMIT;',
            '',
            '-- Status verification',
            "SELECT 'Users' as table_name, count(*) as count FROM users",
            "UNION ALL SELECT 'Doctors', count(*) FROM doctors",
            "UNION ALL SELECT 'PHR Records', count(*) FROM phr",
            "UNION ALL SELECT 'Appointments', count(*) FROM appointments",
            "UNION ALL SELECT 'Medical Content', count(*) FROM medical_content;"
        );

        // Write SQL file
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }

        const sqlPath = path.join(OUTPUT_DIR, 'prod-data-export.sql');
        fs.writeFileSync(sqlPath, sqlLines.join('\n'), 'utf8');
        console.log(`\n   📄 SQL export saved: ${sqlPath}`);

        // Write JSON file
        const jsonPath = path.join(OUTPUT_DIR, 'prod-data-export.json');
        fs.writeFileSync(jsonPath, JSON.stringify(exportedData, null, 2), 'utf8');
        console.log(`   📄 JSON export saved: ${jsonPath}`);

        // Update startup_data files
        console.log('\n   📝 Updating startup_data files...');
        await updateStartupData(exportedData);

        console.log('\n✅ Export complete!');
        return exportedData;

    } catch (err) {
        console.error('❌ Error exporting production data:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

// =============================================================================
// UPDATE STARTUP DATA FILES
// =============================================================================

async function updateStartupData(data) {
    const startupDir = path.join(__dirname, 'startup_data');

    // Update users.json
    if (data.users && data.users.length > 0) {
        const usersFile = path.join(startupDir, 'users.json');
        const usersData = {
            description: 'Startup users for Izara Telemedicine (exported from production v1.4.7)',
            encoding: 'UTF-8',
            version: '1.4.8',
            exportedAt: new Date().toISOString(),
            source: 'production v1.4.7',
            users: data.users.map(u => ({
                id: u.id,
                email: u.email,
                role: u.role,
                name: u.name,
                name_thai: u.name_thai,
                patient_id: u.patient_id,
                doctor_id: u.doctor_id,
                medical_license_number: u.medical_license_number,
                specialty: u.specialty,
                hospital_name: u.hospital_name,
                is_active: u.is_active,
                is_verified: u.is_verified,
                is_approved: u.is_approved,
                is_admin: u.is_admin,
                admin_privileges: u.admin_privileges,
                gender: u.gender,
                date_of_birth: u.date_of_birth,
                phone: u.phone
            })),
            password_hashes: {
                'P@ssw0rd': PASSWORD_HASHES.patient,
                'IzaraDoctor@2024': PASSWORD_HASHES.doctor,
                'IzaraAdmin@2024': PASSWORD_HASHES.admin
            }
        };
        fs.writeFileSync(usersFile, JSON.stringify(usersData, null, 2), 'utf8');
        console.log(`      ✅ Updated ${usersFile} (${data.users.length} users)`);
    }

    // Update doctors.json
    if (data.doctors && data.doctors.length > 0) {
        const doctorsFile = path.join(startupDir, 'doctors.json');
        const doctorsData = {
            description: 'Doctor profiles and consultants (exported from production v1.4.7)',
            encoding: 'UTF-8',
            version: '1.4.8',
            exportedAt: new Date().toISOString(),
            doctors: data.doctors,
            consultants: data.consultants || []
        };
        fs.writeFileSync(doctorsFile, JSON.stringify(doctorsData, null, 2), 'utf8');
        console.log(`      ✅ Updated ${doctorsFile} (${data.doctors.length} doctors)`);
    }

    // Update phr_records.json
    if (data.phr && data.phr.length > 0) {
        const phrFile = path.join(startupDir, 'phr_records.json');
        const phrData = {
            description: 'PHR records (exported from production v1.4.7)',
            encoding: 'UTF-8',
            version: '1.4.8',
            exportedAt: new Date().toISOString(),
            records: data.phr
        };
        fs.writeFileSync(phrFile, JSON.stringify(phrData, null, 2), 'utf8');
        console.log(`      ✅ Updated ${phrFile} (${data.phr.length} records)`);
    }

    // Update medical_content.json
    if (data.medical_content && data.medical_content.length > 0) {
        const mcFile = path.join(startupDir, 'medical_content.json');
        const mcData = {
            description: 'Medical content and clinical resources (exported from production v1.4.7)',
            encoding: 'UTF-8',
            version: '1.4.8',
            exportedAt: new Date().toISOString(),
            medical_content: data.medical_content,
            clinical_resources: data.clinical_resources || []
        };
        fs.writeFileSync(mcFile, JSON.stringify(mcData, null, 2), 'utf8');
        console.log(`      ✅ Updated ${mcFile} (${data.medical_content.length} articles)`);
    }
}

// =============================================================================
// IMPORT INTO DEV DATABASE
// =============================================================================

async function importToTarget(config, label, data) {
    console.log(`\n🚀 IMPORTING INTO ${label}`);
    console.log(`   Host: ${config.host}:${config.port}/${config.database}\n`);

    const pool = new Pool(config);
    let client;

    try {
        client = await pool.connect();

        // Test connection
        const ver = await client.query('SELECT version()');
        console.log(`   Connected: ${ver.rows[0].version.split(',')[0]}`);

        // Check if the schema exists (look for users table)
        const schemaCheck = await client.query(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users'"
        );
        
        if (schemaCheck.rows.length === 0) {
            console.log('   ⚠️  Schema not found. Please run izara-database.sql first.');
            console.log(String.raw`   For local: Get-Content scripts\database\izara-database.sql | docker exec -i izara-postgres psql -U postgres -d izara_phase1`);
            return;
        }

        await client.query('BEGIN');

        // Import users (conflict-safe with ON CONFLICT)
        if (data.users && data.users.length > 0) {
            console.log(`   👥 Importing ${data.users.length} users...`);
            let imported = 0;
            for (const user of data.users) {
                try {
                    await client.query('SAVEPOINT sp_user');
                    await client.query(`
                        INSERT INTO users (id, email, password_hash, role, name, name_thai, 
                            patient_id, doctor_id, medical_license_number, specialty, hospital_name,
                            is_active, is_verified, is_approved, approval_status, is_admin, admin_privileges,
                            gender, date_of_birth, phone, avatar_url, preferences, notification_settings,
                            created_at, updated_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
                        ON CONFLICT (id) DO UPDATE SET
                            name = EXCLUDED.name,
                            name_thai = EXCLUDED.name_thai,
                            is_active = EXCLUDED.is_active,
                            is_approved = EXCLUDED.is_approved,
                            updated_at = CURRENT_TIMESTAMP
                    `, [
                        user.id, user.email, user.password_hash, user.role,
                        user.name, user.name_thai, user.patient_id, user.doctor_id,
                        user.medical_license_number, user.specialty, user.hospital_name,
                        user.is_active !== false, user.is_verified !== false,
                        user.is_approved !== false, user.approval_status || 'approved',
                        user.is_admin || false, user.admin_privileges ? JSON.stringify(user.admin_privileges) : null,
                        user.gender, user.date_of_birth, user.phone, user.avatar_url,
                        user.preferences ? JSON.stringify(user.preferences) : '{"language": "th", "theme": "light", "notifications": true}',
                        user.notification_settings ? JSON.stringify(user.notification_settings) : null,
                        user.created_at || new Date(), user.updated_at || new Date()
                    ]);
                    await client.query('RELEASE SAVEPOINT sp_user');
                    imported++;
                } catch (e) {
                    await client.query('ROLLBACK TO SAVEPOINT sp_user');
                    console.log(`      ⚠️  User ${user.id}: ${e.message.split('\n')[0]}`);
                }
            }
            console.log(`      ✅ ${imported}/${data.users.length} users imported`);
        }

        // Generic table import for other tables
        // Skip columns that don't exist in target by querying table info first
        const tablesToImport = [
            'patient_profiles', 'doctor_profiles', 'doctors', 'doctor_schedules',
            'phr', 'vital_signs', 'consultants', 'appointments', 'emr',
            'medical_content', 'clinical_resources', 'knowledge_base', 'notifications'
        ];

        for (const tableName of tablesToImport) {
            if (data[tableName] && data[tableName].length > 0) {
                console.log(`   📋 Importing ${data[tableName].length} ${tableName}...`);
                
                // Get actual columns in the target table
                let targetColumns;
                try {
                    const colRes = await client.query(
                        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public'`,
                        [tableName]
                    );
                    targetColumns = new Set(colRes.rows.map(r => r.column_name));
                } catch (e) {
                    console.log(`      ⚠️  ${tableName}: table doesn't exist, skipping`);
                    continue;
                }
                
                if (targetColumns.size === 0) {
                    console.log(`      ⚠️  ${tableName}: table doesn't exist, skipping`);
                    continue;
                }

                let imported = 0;
                for (const row of data[tableName]) {
                    try {
                        await client.query('SAVEPOINT sp_row');
                        // Only use columns that exist in the target table
                        const columns = Object.keys(row).filter(k => row[k] !== undefined && targetColumns.has(k));
                        if (columns.length === 0) continue;
                        
                        const values = columns.map((_, i) => `$${i + 1}`);
                        const params = columns.map(k => {
                            const v = row[k];
                            if (v !== null && typeof v === 'object' && !(v instanceof Date)) {
                                return JSON.stringify(v);
                            }
                            return v;
                        });

                        await client.query(
                            `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING`,
                            params
                        );
                        await client.query('RELEASE SAVEPOINT sp_row');
                        imported++;
                    } catch (e) {
                        try { await client.query('ROLLBACK TO SAVEPOINT sp_row'); } catch (_) {}
                        // Only log non-duplicate errors, and limit log output
                        if (!e.message.includes('duplicate') && !e.message.includes('violates') && imported < 3) {
                            console.log(`      ⚠️  ${tableName} row: ${e.message.split('\n')[0].substring(0, 100)}`);
                        }
                    }
                }
                console.log(`      ✅ ${imported}/${data[tableName].length} rows imported`);
            }
        }

        await client.query('COMMIT');
        console.log(`\n   ✅ Import to ${label} complete!`);

        // Verify
        console.log('\n   📊 Verification:');
        const tables = ['users', 'doctors', 'phr', 'appointments', 'medical_content', 'consultants'];
        for (const t of tables) {
            try {
                const res = await client.query(`SELECT COUNT(*) as cnt FROM ${t}`);
                console.log(`      ${t}: ${res.rows[0].cnt} rows`);
            } catch (e) {
                console.log(`      ${t}: ⚠️  ${e.message}`);
            }
        }

    } catch (err) {
        if (client) {
            try { await client.query('ROLLBACK'); } catch (e) {}
        }
        console.error(`   ❌ Import error: ${err.message}`);
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║  IZARA — MIGRATE PRODUCTION v1.4.7 → DEV v1.4.8    ║');
    console.log('╚══════════════════════════════════════════════════════╝');

    // Show help
    if (args.size === 0 || args.has('--help') || args.has('-h')) {
        console.log(`
Usage: node scripts/migrate-prod-to-dev.cjs [options]

Options:
  --query          Query production DB and display summary
  --export         Export production data to SQL + JSON files
  --import-local   Import exported data into local Docker DB
  --import-dev     Import exported data into dev cloud DB
  --full           Full migration (export + import local + import dev)
  --help           Show this help message

Environment Variables (set before running):
  DB_PASSWORD       Production database password (REQUIRED)
  DEV_DB_PASSWORD   Dev database password (default: IzaraDb2024)

Examples:
  $env:DB_PASSWORD="your_password"; node scripts/migrate-prod-to-dev.cjs --query
  $env:DB_PASSWORD="your_password"; node scripts/migrate-prod-to-dev.cjs --full
`);
        return;
    }

    // Validate password
    if (!PROD_CONFIG.password) {
        console.error('\n❌ ERROR: DB_PASSWORD environment variable is required.');
        console.error('   Set it using: $env:DB_PASSWORD="your_production_password"');
        console.error('   This is the password for the production Cloud SQL at 34.143.228.135');
        process.exit(1);
    }

    // --query: Just show what's in production
    if (args.has('--query')) {
        await queryProdData();
        return;
    }

    // --export: Export production data
    let exportedData = null;
    if (args.has('--export') || args.has('--full')) {
        exportedData = await exportProdData();
    }

    // If we need to import but don't have exported data, try loading from file
    if (!exportedData && (args.has('--import-local') || args.has('--import-dev'))) {
        const jsonPath = path.join(OUTPUT_DIR, 'prod-data-export.json');
        if (fs.existsSync(jsonPath)) {
            console.log(`\n📄 Loading previously exported data from ${jsonPath}`);
            exportedData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        } else {
            console.error('\n❌ No exported data found. Run with --export first.');
            process.exit(1);
        }
    }

    // --import-local: Import into local Docker DB
    if (exportedData && (args.has('--import-local') || args.has('--full'))) {
        await importToTarget(LOCAL_CONFIG, 'LOCAL DOCKER (localhost:5433)', exportedData);
    }

    // --import-dev: Import into dev cloud DB
    if (exportedData && (args.has('--import-dev') || args.has('--full'))) {
        await importToTarget(DEV_CLOUD_CONFIG, 'DEV CLOUD (35.240.162.227)', exportedData);
    }

    console.log('\n🎉 Migration complete!\n');
}

main().catch(err => {
    console.error('💥 Fatal error:', err.message);
    process.exit(1);
});
