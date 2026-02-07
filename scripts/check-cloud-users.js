const { Pool } = require('pg');
const pool = new Pool({ host: '34.143.228.135', port: 5432, database: 'izara_phase1', user: 'postgres', password: 'password123' });

async function run() {
  // Check what user IDs exist
  const users = await pool.query("SELECT id, name, email, role FROM users LIMIT 20");
  console.log('Users:');
  users.rows.forEach(u => console.log(`  ${u.id} | ${u.name} | ${u.email} | ${u.role}`));

  // Check patient_profiles
  const pp = await pool.query("SELECT patient_id FROM patient_profiles LIMIT 10");
  console.log('\nPatient profiles:', pp.rows.map(r => r.patient_id).join(', '));

  // Check if PATIENT-DEMO exists
  const demo = await pool.query("SELECT id, name, email FROM users WHERE id = 'PATIENT-DEMO'");
  console.log('\nPATIENT-DEMO:', demo.rows.length > 0 ? demo.rows[0] : 'NOT FOUND');

  pool.end();
}
run().catch(e => { console.error(e.message); pool.end(); });
