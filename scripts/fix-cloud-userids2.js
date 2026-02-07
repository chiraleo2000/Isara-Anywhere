const { Pool } = require('pg');
const pool = new Pool({ host: '34.143.228.135', port: 5432, database: 'izara_phase1', user: 'postgres', password: 'password123' });

async function updateId(oldId, newId, email) {
  console.log(`\n=== Updating ${email}: ${oldId} => ${newId} ===`);

  // First update all FK references, then update the main users table last
  const refTables = [
    'patient_profiles:patient_id',
    'phr:patient_id',
    'vital_signs:patient_id',
    'appointments:patient_id',
    'appointments:doctor_id',
    'emr:patient_id',
    'emr:doctor_id',
    'emr_records:patient_id',
    'emr_records:doctor_id',
    'prescriptions:patient_id',
    'prescriptions:doctor_id',
    'lab_orders:patient_id',
    'lab_orders:doctor_id',
    'health_logs:patient_id',
    'health_logs:doctor_id',
    'health_timeline:patient_id',
    'notifications:recipient_id',
    'sessions:user_id',
    'living_wills:patient_id',
    'living_will_versions:patient_id',
    'patient_consents:patient_id',
    'video_meetings:patient_id',
    'video_meetings:doctor_id',
    'ai_chat_history:user_id',
    'ai_chat_sessions:user_id',
    'doctor_profiles:doctor_id',
    'meeting_invites:doctor_id',
    'meeting_transcripts:speaker_id',
    'patient_instructions:patient_id',
    'patient_instructions:doctor_id',
  ];

  for (const ref of refTables) {
    const [table, col] = ref.split(':');
    try {
      const r = await pool.query(`UPDATE ${table} SET ${col} = $1 WHERE ${col} = $2`, [newId, oldId]);
      if (r.rowCount > 0) console.log(`  Updated ${table}.${col}: ${r.rowCount} rows`);
    } catch(e) {
      // Could be column doesn't exist or table has different structure
      if (!e.message.includes('does not exist')) {
        console.log(`  ${table}.${col}: ${e.message.substring(0, 60)}`);
      }
    }
  }

  // Finally update the main users table
  try {
    await pool.query('UPDATE users SET id = $1 WHERE id = $2', [newId, oldId]);
    console.log(`  Updated users.id: ${oldId} => ${newId}`);
  } catch(e) { 
    console.log(`  users.id ERROR: ${e.message}`);
  }
}

async function run() {
  // Check current state
  const emails = await pool.query("SELECT id, email FROM users WHERE email IN ('demo.test@gmail.com', 'doctor.test@izara.com', 'admin.test@izara.com')");
  console.log('Current cloud IDs:');
  emails.rows.forEach(r => console.log(`  ${r.email} => ${r.id}`));

  const map = {
    'demo.test@gmail.com': 'PATIENT-DEMO',
    'doctor.test@izara.com': 'DOC-TEST-001',
    'admin.test@izara.com': 'ADMIN-TEST-001',
  };

  for (const [email, newId] of Object.entries(map)) {
    const row = emails.rows.find(r => r.email === email);
    if (!row) { console.log(`${email}: NOT FOUND`); continue; }
    if (row.id === newId) { console.log(`${email}: already ${newId}`); continue; }
    await updateId(row.id, newId, email);
  }

  console.log('\nVerifying...');
  const verify = await pool.query("SELECT id, email, role FROM users WHERE id IN ('PATIENT-DEMO', 'PATIENT-SOMCHAI', 'PATIENT-ANAN', 'DOC-TEST-001', 'ADMIN-TEST-001')");
  verify.rows.forEach(r => console.log(`  ${r.id} | ${r.email} | ${r.role}`));

  pool.end();
}
run().catch(e => { console.error('FATAL:', e.message); pool.end(); });
