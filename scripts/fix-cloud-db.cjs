/**
 * Fix cloud DB: create admin_actions table + fix notify_data_change trigger
 * Usage: node scripts/fix-cloud-db.cjs
 * Env: CLOUD_DB_HOST, CLOUD_DB_PASSWORD (or DB_PASSWORD)
 */
const { Pool } = require('pg');

const host = process.env.CLOUD_DB_HOST || '35.240.157.230';
const password = process.env.CLOUD_DB_PASSWORD || process.env.DB_PASSWORD || 'IzaraDb2024';

const pool = new Pool({
  host,
  port: 5432,
  database: 'izara_phase1',
  user: 'postgres',
  password,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});

async function main() {
  const client = await pool.connect();
  try {
    console.log(`Connected to cloud DB at ${host}`);

    // 1. Create admin_actions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_actions (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id   VARCHAR(50) NOT NULL,
        action     VARCHAR(100) NOT NULL,
        target_id  VARCHAR(50),
        metadata   JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions (admin_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_admin_actions_target_id ON admin_actions (target_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_created ON admin_actions (admin_id, created_at)`);
    console.log('✅ admin_actions table ready');

    // 2. Fix notify_data_change trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION notify_data_change()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $function$
      DECLARE
        record_id TEXT;
        patient   TEXT;
        doctor    TEXT;
        payload   JSONB;
      BEGIN
        record_id := COALESCE(NEW.id::TEXT, '');

        -- Only access patient_id/doctor_id for tables that have those columns
        IF TG_TABLE_NAME IN ('appointments', 'emr', 'prescriptions', 'lab_orders', 'vital_signs', 'phr') THEN
          patient := COALESCE(NEW.patient_id::TEXT, '');
          doctor  := COALESCE(NEW.doctor_id::TEXT, '');
        ELSE
          patient := '';
          doctor  := '';
        END IF;

        payload := json_build_object(
          'table',      TG_TABLE_NAME,
          'operation',  TG_OP,
          'id',         record_id,
          'patient_id', patient,
          'doctor_id',  doctor
        );

        PERFORM pg_notify('data_changes', payload::TEXT);
        RETURN NULL;
      END;
      $function$
    `);
    console.log('✅ notify_data_change trigger function fixed');

    // 3. Verify admin_actions exists
    const { rows } = await client.query(`SELECT COUNT(*) FROM admin_actions`);
    console.log(`✅ admin_actions row count: ${rows[0].count}`);

    console.log('\n✅ All cloud DB fixes applied successfully!');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => {
  console.error('❌ Error:', e.message);
  pool.end();
  process.exit(1);
});
