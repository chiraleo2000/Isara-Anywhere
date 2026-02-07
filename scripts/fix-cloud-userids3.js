const { Pool } = require('pg');
const pool = new Pool({ host: '34.143.228.135', port: 5432, database: 'izara_phase1', user: 'postgres', password: 'password123' });

async function updateId(oldId, newId) {
  // Delete sessions first (they'll be recreated on login)
  await pool.query('DELETE FROM sessions WHERE user_id = $1', [oldId]);

  // Update all FK references
  const refs = [
    'patient_profiles:patient_id', 'phr:patient_id', 'vital_signs:patient_id',
    'appointments:patient_id', 'appointments:doctor_id',
    'emr:patient_id', 'emr:doctor_id', 'emr_records:patient_id', 'emr_records:doctor_id',
    'prescriptions:patient_id', 'prescriptions:doctor_id',
    'lab_orders:patient_id', 'lab_orders:doctor_id',
    'health_logs:patient_id', 'health_logs:doctor_id',
    'health_timeline:patient_id', 'notifications:recipient_id',
    'living_wills:patient_id', 'living_will_versions:patient_id',
    'patient_consents:patient_id', 'video_meetings:patient_id', 'video_meetings:doctor_id',
    'ai_chat_history:user_id', 'ai_chat_sessions:user_id',
    'doctor_profiles:doctor_id', 'meeting_invites:doctor_id',
    'meeting_transcripts:speaker_id', 'patient_instructions:patient_id', 'patient_instructions:doctor_id',
  ];

  for (const ref of refs) {
    const [table, col] = ref.split(':');
    try {
      const r = await pool.query(`UPDATE ${table} SET ${col} = $1 WHERE ${col} = $2`, [newId, oldId]);
      if (r.rowCount > 0) console.log(`  ${table}.${col}: ${r.rowCount} rows`);
    } catch(e) { /* ignore non-existent columns */ }
  }

  // Update main users table
  await pool.query('UPDATE users SET id = $1 WHERE id = $2', [newId, oldId]);
  console.log(`  users.id: ${oldId} => ${newId}`);
}

async function run() {
  const map = { 'PATIENT-001': 'PATIENT-DEMO', 'DOC-001': 'DOC-TEST-001', 'ADMIN-001': 'ADMIN-TEST-001' };

  for (const [oldId, newId] of Object.entries(map)) {
    const check = await pool.query('SELECT id FROM users WHERE id = $1', [oldId]);
    if (check.rows.length === 0) { console.log(`${oldId}: not found, skip`); continue; }
    console.log(`Updating ${oldId} => ${newId}:`);
    await updateId(oldId, newId);
  }

  console.log('\nVerify:');
  const v = await pool.query("SELECT id, email, role FROM users WHERE id IN ('PATIENT-DEMO', 'PATIENT-SOMCHAI', 'PATIENT-ANAN', 'DOC-TEST-001', 'ADMIN-TEST-001')");
  v.rows.forEach(r => console.log(`  ${r.id} | ${r.email} | ${r.role}`));
  
  pool.end();
}
run().catch(e => { console.error('FATAL:', e.message); pool.end(); });
