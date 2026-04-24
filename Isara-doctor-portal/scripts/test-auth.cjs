'use strict';
const dotenv = require('dotenv');
dotenv.config(); // Load .env from current dir

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

console.log('DB Config from env:');
console.log('  DATABASE_URL:', process.env.DATABASE_URL);
console.log('  DB_PORT:', process.env.DB_PORT);
console.log('  DB_HOST:', process.env.DB_HOST);

let dbConfig = {};
if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  dbConfig = {
    host: url.hostname,
    port: parseInt(url.port || '5432'),
    database: url.pathname.substring(1),
    user: url.username,
    password: decodeURIComponent(url.password),
  };
}

const poolOptions = {
  host: dbConfig.host || process.env.DB_HOST || 'localhost',
  port: dbConfig.port || parseInt(process.env.DB_PORT || '5433'),
  database: dbConfig.database || process.env.DB_NAME || 'izara_phase1',
  user: dbConfig.user || process.env.DB_USER || 'postgres',
  password: dbConfig.password || process.env.DB_PASSWORD || '',
  connectionTimeoutMillis: 5000,
};

console.log('\nPool options:', { ...poolOptions, password: '***' });

const pool = new Pool(poolOptions);

async function main() {
  try {
    const testConn = await pool.query('SELECT NOW() as now');
    console.log('\n✅ DB connected:', testConn.rows[0].now);

    const result = await pool.query(
      `SELECT u.*, u.password_hash as "passwordHash", u.is_active as "isActive"
       FROM users u
       LEFT JOIN doctor_profiles dp ON dp.doctor_id = u.id
       WHERE LOWER(u.email) = LOWER($1)`,
      ['doctor.test@izara.com']
    );
    
    const user = result.rows[0];
    if (!user) {
      console.log('❌ User not found!');
      return;
    }
    console.log('\n✅ User found:', user.email, 'role:', user.role);
    console.log('  hash from DB:', user.passwordHash || user.password_hash);
    console.log('  isActive:', user.isActive ?? user.is_active);

    const hash = user.passwordHash || user.password_hash;
    const password = 'IzaraDoctor@2024';
    const match = bcrypt.compareSync(password, hash);
    console.log('\nbcrypt.compareSync result:', match);
    
    if (match) {
      console.log('✅ Auth should succeed!');
    } else {
      console.log('❌ Password mismatch!');
    }
  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    await pool.end();
  }
}

main();
