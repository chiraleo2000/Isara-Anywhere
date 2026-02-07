const { Pool } = require('pg');
const pool = new Pool({ host: '34.143.228.135', port: 5432, database: 'izara_phase1', user: 'postgres', password: 'password123' });

async function run() {
  try {
    await pool.query('ALTER TABLE vital_signs RENAME COLUMN recorded_at TO measured_at');
    console.log('1. Renamed recorded_at -> measured_at in vital_signs');
  } catch(e) { console.log('1. vital_signs column:', e.message); }

  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS living_wills (
      id SERIAL PRIMARY KEY,
      patient_id VARCHAR(100) NOT NULL,
      document_type VARCHAR(50) DEFAULT 'living_will',
      content TEXT,
      directives JSONB DEFAULT '{}',
      witnesses JSONB DEFAULT '[]',
      legal_status VARCHAR(50) DEFAULT 'draft',
      is_shared_with_doctors BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`);
    console.log('2. Created living_wills table');
  } catch(e) { console.log('2. living_wills:', e.message); }

  pool.end();
}
run();
