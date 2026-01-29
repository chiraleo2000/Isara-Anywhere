/**
 * @deprecated This script has been consolidated into scripts/cloud-db-tool.cjs
 * Use: node scripts/cloud-db-tool.cjs --all
 * 
 * Initialize Cloud SQL database with izara schema
 */
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Security: Get password from environment variable
const dbPassword = process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || process.env.CLOUD_DB_PASSWORD;
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

console.log('🔄 Initializing Cloud SQL database...');

try {
  // Read the SQL file
  const sqlFile = path.join(__dirname, 'scripts', 'database', 'izara-database.sql');
  let sql = fs.readFileSync(sqlFile, 'utf8');
  
  // Remove psql-specific commands that don't work with node-postgres
  sql = sql.replaceAll(/\\echo .*/g, '-- echo removed');
  sql = sql.replaceAll(/\\c .*/g, '-- connect removed');
  sql = sql.replaceAll(/\\q.*/g, '-- quit removed');
  
  // Split by semicolons and execute each statement
  const statements = sql.split(/;[\r\n]+/).filter(s => s.trim() && !s.trim().startsWith('--'));
  
  console.log(`📝 Found ${statements.length} SQL statements to execute`);
  
  let executed = 0;
  let errors = 0;
  
  for (const stmt of statements) {
    const trimmed = stmt.trim();
    if (!trimmed || trimmed.startsWith('--')) continue;
    
    try {
      await pool.query(trimmed);
      executed++;
      if (executed % 10 === 0) {
        process.stdout.write(`\r✅ Executed ${executed} statements...`);
      }
    } catch (err) {
      // Ignore "already exists" errors
      if (!err.message.includes('already exists') && 
          !err.message.includes('duplicate key') &&
          !err.message.includes('does not exist')) {
        console.error(`\n❌ Error: ${err.message.substring(0, 100)}`);
        errors++;
      }
    }
  }
  
  console.log(`\n✅ Executed ${executed} statements with ${errors} errors`);
  
  // Verify tables created
  const result = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
  console.log(`\n📋 Tables created: ${result.rows.length}`);
  result.rows.forEach(r => console.log(`   - ${r.table_name}`));
  
  // Check users count
  const users = await pool.query('SELECT COUNT(*) as cnt FROM users');
  console.log(`\n👥 Users in database: ${users.rows[0].cnt}`);
  
} catch (err) {
  console.error('❌ Fatal error:', err.message);
} finally {
  await pool.end();
}
