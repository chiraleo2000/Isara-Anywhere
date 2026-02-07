const { Pool } = require('pg');
const pool = new Pool({ host: '34.143.228.135', port: 5432, database: 'izara_phase1', user: 'postgres', password: 'password123' });

async function run() {
  // Check if local IDs exist
  const check1 = await pool.query("SELECT id FROM users WHERE id IN ('PATIENT-DEMO', 'PATIENT-SOMCHAI', 'PATIENT-ANAN', 'DOC-TEST-001', 'ADMIN-TEST-001')");
  console.log('Existing local-format IDs:', check1.rows.map(r => r.id).join(', '));

  // Check cloud IDs for our known emails
  const emails = await pool.query("SELECT id, email FROM users WHERE email IN ('demo.test@gmail.com', 'Somchai.Mankong@gmail.com', 'Anan.Khayanrian@gmail.com', 'doctor.test@izara.com', 'admin.test@izara.com')");
  console.log('\nCloud IDs by email:');
  emails.rows.forEach(r => console.log(`  ${r.email} => ${r.id}`));

  // We need to add alias rows or update IDs. Safest: update the cloud user IDs to match local
  const idMap = {
    'demo.test@gmail.com': 'PATIENT-DEMO',
    'Somchai.Mankong@gmail.com': 'PATIENT-SOMCHAI',
    'Anan.Khayanrian@gmail.com': 'PATIENT-ANAN',
    'doctor.test@izara.com': 'DOC-TEST-001',
    'admin.test@izara.com': 'ADMIN-TEST-001',
  };

  for (const [email, newId] of Object.entries(idMap)) {
    const existing = emails.rows.find(r => r.email === email);
    if (!existing) {
      console.log(`  ${email}: NOT FOUND in cloud DB - skip`);
      continue;
    }
    if (existing.id === newId) {
      console.log(`  ${email}: already has correct ID ${newId}`);
      continue;
    }

    const oldId = existing.id;
    console.log(`  ${email}: ${oldId} => ${newId}`);

    // Update all tables that reference user IDs
    const tables = [
      { table: 'patient_profiles', col: 'patient_id' },
      { table: 'phr', col: 'patient_id' },
      { table: 'vital_signs', col: 'patient_id' },
      { table: 'appointments', col: 'patient_id' },
      { table: 'emr', col: 'patient_id' },
      { table: 'emr_records', col: 'patient_id' },
      { table: 'prescriptions', col: 'patient_id' },
      { table: 'lab_orders', col: 'patient_id' },
      { table: 'health_logs', col: 'patient_id' },
      { table: 'health_timeline', col: 'patient_id' },
      { table: 'notifications', col: 'recipient_id' },
      { table: 'sessions', col: 'user_id' },
      { table: 'living_wills', col: 'patient_id' },
      { table: 'living_will_versions', col: 'patient_id' },
      { table: 'patient_consents', col: 'patient_id' },
      { table: 'video_meetings', col: 'patient_id' },
      { table: 'ai_chat_history', col: 'user_id' },
      { table: 'ai_chat_sessions', col: 'user_id' },
    ];

    // Also update doctor_id refs
    const doctorTables = [
      { table: 'appointments', col: 'doctor_id' },
      { table: 'emr', col: 'doctor_id' },
      { table: 'emr_records', col: 'doctor_id' },
      { table: 'prescriptions', col: 'doctor_id' },
      { table: 'lab_orders', col: 'doctor_id' },
      { table: 'video_meetings', col: 'doctor_id' },
      { table: 'health_logs', col: 'doctor_id' },
      { table: 'doctor_profiles', col: 'doctor_id' },
    ];

    // Disable FK constraints temporarily
    await pool.query('SET session_replication_role = replica');

    // Update main users table
    try {
      await pool.query('UPDATE users SET id = $1 WHERE id = $2', [newId, oldId]);
      console.log(`    Updated users: ${oldId} => ${newId}`);
    } catch(e) { console.log(`    users ERROR: ${e.message}`); }

    // Update patient-related tables
    for (const { table, col } of tables) {
      try {
        const r = await pool.query(`UPDATE ${table} SET ${col} = $1 WHERE ${col} = $2`, [newId, oldId]);
        if (r.rowCount > 0) console.log(`    Updated ${table}.${col}: ${r.rowCount} rows`);
      } catch(e) { /* ignore - table might not have this col */ }
    }

    // Update doctor-related tables  
    for (const { table, col } of doctorTables) {
      try {
        const r = await pool.query(`UPDATE ${table} SET ${col} = $1 WHERE ${col} = $2`, [newId, oldId]);
        if (r.rowCount > 0) console.log(`    Updated ${table}.${col}: ${r.rowCount} rows`);
      } catch(e) { /* ignore */ }
    }

    // Re-enable FK constraints
    await pool.query('SET session_replication_role = DEFAULT');
  }

  console.log('\nDone! Verifying...');
  const verify = await pool.query("SELECT id, email FROM users WHERE id IN ('PATIENT-DEMO', 'PATIENT-SOMCHAI', 'PATIENT-ANAN', 'DOC-TEST-001', 'ADMIN-TEST-001')");
  verify.rows.forEach(r => console.log(`  ${r.id} => ${r.email}`));

  pool.end();
}
run().catch(e => { console.error('FATAL:', e.message); pool.end(); });
