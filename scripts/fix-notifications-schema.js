const { Pool } = require('pg');

const pool = new Pool({
  host: '34.143.228.135',
  port: 5432,
  database: 'izara_phase1',
  user: 'postgres',
  password: 'password123',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    console.log('Connecting to Cloud SQL...');
    const client = await pool.connect();
    
    // Check current notifications table structure
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'notifications'
    `);
    console.log('Current notifications columns:', result.rows.map(r => r.column_name));
    
    // Add read_at if missing
    console.log('Adding read_at column if not exists...');
    await client.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE');
    console.log('✓ read_at column ensured');
    
    client.release();
    await pool.end();
    console.log('Done!');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
