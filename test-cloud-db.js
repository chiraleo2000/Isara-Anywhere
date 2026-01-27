// Quick test script for Cloud SQL connection
const pg = require('pg');

const pool = new pg.Pool({
  host: '34.143.228.135',
  port: 5432,
  database: 'izara_phase1',
  user: 'postgres',
  password: 'P@ssw0rd'
});

async function test() {
  try {
    const result = await pool.query("SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema='public'");
    console.log('Tables in public schema:', result.rows[0].cnt);
    
    // Check if users table exists
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
    console.log('Tables:', tables.rows.map(r => r.table_name).join(', '));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

test();
