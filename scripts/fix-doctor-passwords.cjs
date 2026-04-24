'use strict';
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  database: 'izara_phase1',
  user: 'postgres',
  password: 'IzaraDb2024',
});

async function main() {
  const doctorHash = bcrypt.hashSync('IzaraDoctor@2024', 10);
  const adminHash  = bcrypt.hashSync('IzaraAdmin@2024', 10);

  console.log('Doctor hash:', doctorHash);
  console.log('Admin hash: ', adminHash);

  // Verify hashes before writing
  console.log('Doctor verify:', bcrypt.compareSync('IzaraDoctor@2024', doctorHash));
  console.log('Admin verify: ', bcrypt.compareSync('IzaraAdmin@2024', adminHash));

  await pool.query('UPDATE users SET password_hash=$1 WHERE email=$2', [doctorHash, 'doctor.test@izara.com']);
  await pool.query('UPDATE users SET password_hash=$1 WHERE email=$2', [adminHash, 'admin.test@izara.com']);

  const res = await pool.query("SELECT email, LEFT(password_hash,20) as hash_prefix, LENGTH(password_hash) as len FROM users WHERE email IN ('doctor.test@izara.com','admin.test@izara.com')");
  console.log('Updated rows:', res.rows);
  await pool.end();
  console.log('Done!');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
