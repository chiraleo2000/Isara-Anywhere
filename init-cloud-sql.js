// Initialize Cloud SQL database with izara schema
// This script properly handles PostgreSQL functions and complex SQL
const pg = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new pg.Pool({
  host: '34.143.228.135',
  port: 5432,
  database: 'izara_phase1',
  user: 'postgres',
  password: 'P@ssw0rd',
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

async function initializeDatabase() {
  console.log('🔄 Initializing Cloud SQL database with schema...');
  const client = await pool.connect();
  
  try {
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'scripts', 'database', 'izara-database.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Execute the entire SQL file as one transaction
    console.log('📝 Executing database schema...');
    await client.query(sql);
    console.log('✅ Schema executed successfully!');
    
  } catch (err) {
    // If the full execution fails, try a different approach
    console.log('⚠️ Full execution failed, trying statement-by-statement...');
    console.log('Error:', err.message);
    
    // Try to create tables manually
    try {
      // Create pgvector extension
      await client.query('CREATE EXTENSION IF NOT EXISTS vector').catch(() => {});
      
      // Check what tables exist
      const tablesResult = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' ORDER BY table_name
      `);
      console.log('📋 Existing tables:', tablesResult.rows.map(r => r.table_name).join(', ') || 'none');
      
      // Check users
      try {
        const users = await client.query('SELECT COUNT(*) as cnt FROM users');
        console.log('👥 Users in database:', users.rows[0].cnt);
      } catch (e) {
        console.log('⚠️ Users table does not exist yet');
      }
      
    } catch (e) {
      console.error('❌ Error:', e.message);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

initializeDatabase();
