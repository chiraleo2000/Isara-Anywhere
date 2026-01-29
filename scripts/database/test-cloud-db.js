/**
 * @deprecated This script has been consolidated into scripts/cloud-db-tool.cjs
 * Use: node scripts/cloud-db-tool.cjs --verify
 * 
 * Quick test script for Cloud SQL connection
 */
import pg from 'pg';

// Security: Get password from environment variable
const dbPassword = process.env.DB_PASSWORD || process.env.CLOUD_DB_PASSWORD;
if (!dbPassword) {
  console.error('❌ ERROR: DB_PASSWORD environment variable is required.');
  console.error('   Set it using: $env:DB_PASSWORD="your_password"');
  process.exit(1);
}

const pool = new pg.Pool({
  host: process.env.CLOUD_DB_HOST || '34.143.228.135',
  port: Number.parseInt(process.env.CLOUD_DB_PORT || '5432'),
  database: process.env.DB_NAME || 'izara_phase1',
  user: process.env.DB_USER || 'postgres',
  password: dbPassword
});

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
