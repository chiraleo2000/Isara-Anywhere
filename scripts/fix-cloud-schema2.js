const { Pool } = require('pg');
const pool = new Pool({ host: '34.143.228.135', port: 5432, database: 'izara_phase1', user: 'postgres', password: 'password123' });

async function run() {
  // 1. Fix vital_signs - add missing columns
  const vitalsCols = [
    'ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS oxygen_saturation DECIMAL(5,2)',
    'ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS blood_glucose DECIMAL(8,2)',
    'ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS blood_glucose_type VARCHAR(50)',
    'ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS notes TEXT',
    'ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS bmi DECIMAL(5,1)',
    'ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT \'patient_input\'',
  ];
  for (const sql of vitalsCols) {
    try {
      await pool.query(sql);
      console.log('OK:', sql.substring(0, 70));
    } catch(e) { console.log('ERR:', e.message.substring(0, 80)); }
  }

  // 2. Fix living_wills - drop and recreate with correct schema
  try {
    await pool.query('DROP TABLE IF EXISTS living_wills CASCADE');
    await pool.query(`CREATE TABLE living_wills (
      id VARCHAR(50) PRIMARY KEY DEFAULT ('lw-' || substr(md5(random()::text), 1, 12)),
      patient_id VARCHAR(50) NOT NULL,
      statement TEXT,
      treatments JSONB,
      representatives JSONB,
      signature JSONB,
      pdpa_consent JSONB,
      status VARCHAR(20) DEFAULT 'active',
      signed_at TIMESTAMP WITH TIME ZONE,
      decisions JSONB DEFAULT '{}'::jsonb,
      witness_info JSONB DEFAULT '{}'::jsonb,
      signature_data TEXT,
      is_shared_with_doctors BOOLEAN DEFAULT false,
      version INTEGER DEFAULT 1,
      restored_from VARCHAR(50),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      audit_log JSONB DEFAULT '[]'::jsonb
    )`);
    console.log('OK: Recreated living_wills table with correct schema');
  } catch(e) { console.log('ERR living_wills:', e.message); }

  // 3. Create health_logs table
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS health_logs (
      id VARCHAR(50) PRIMARY KEY DEFAULT ('hl-' || substr(md5(random()::text), 1, 12)),
      patient_id VARCHAR(50) NOT NULL,
      type VARCHAR(100),
      chief_complaint TEXT,
      diagnosis_description TEXT,
      treatment_plan TEXT,
      doctor_id VARCHAR(50),
      doctor_name VARCHAR(255),
      appointment_id VARCHAR(50),
      emr_id VARCHAR(50),
      summary TEXT,
      diagnosis TEXT,
      notes TEXT,
      data JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('OK: Created health_logs table');
  } catch(e) { console.log('ERR health_logs:', e.message); }

  // 4. Create video_meetings table
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS video_meetings (
      id VARCHAR(100) PRIMARY KEY,
      appointment_id VARCHAR(100),
      doctor_id VARCHAR(50),
      patient_id VARCHAR(50),
      room_id VARCHAR(200),
      meeting_url TEXT,
      status VARCHAR(50) DEFAULT 'created',
      meeting_type VARCHAR(50) DEFAULT 'telehealth',
      start_time TIMESTAMP WITH TIME ZONE,
      end_time TIMESTAMP WITH TIME ZONE,
      duration INTEGER,
      transcript JSONB DEFAULT '[]',
      summary TEXT,
      ai_summary JSONB,
      participants JSONB DEFAULT '[]',
      recording_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('OK: Created video_meetings table');
  } catch(e) { console.log('ERR video_meetings:', e.message); }

  // 5. Create living_will_versions table if missing
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS living_will_versions (
      id VARCHAR(50) PRIMARY KEY DEFAULT ('lwv-' || substr(md5(random()::text), 1, 12)),
      patient_id VARCHAR(50) NOT NULL,
      version INTEGER NOT NULL,
      data JSONB NOT NULL,
      note TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('OK: Created living_will_versions table');
  } catch(e) { console.log('ERR living_will_versions:', e.message); }

  // 6. Create patient_consents table if missing
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS patient_consents (
      id VARCHAR(50) PRIMARY KEY DEFAULT ('pc-' || substr(md5(random()::text), 1, 12)),
      patient_id VARCHAR(50) NOT NULL,
      consent_type VARCHAR(100) NOT NULL,
      granted BOOLEAN DEFAULT false,
      doctor_id VARCHAR(50),
      doctor_name VARCHAR(255),
      data_types JSONB DEFAULT '["all"]'::jsonb,
      granted_at TIMESTAMP WITH TIME ZONE,
      expires_at TIMESTAMP WITH TIME ZONE,
      revoked_at TIMESTAMP WITH TIME ZONE,
      revoke_reason TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('OK: Created patient_consents table');
  } catch(e) { console.log('ERR patient_consents:', e.message); }

  // Verify
  const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
  console.log('\nAll tables:', tables.rows.map(r => r.table_name).join(', '));

  pool.end();
}
run().catch(e => { console.error(e.message); pool.end(); });
