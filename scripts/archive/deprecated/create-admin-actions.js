const { Pool } = require('pg');
const pool = new Pool({ host: '127.0.0.1', port: 5432, database: 'izara_phase1', user: 'postgres', password: 'IzaraDb2024' });
async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_actions (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_id    VARCHAR(50) NOT NULL,
      action      VARCHAR(100) NOT NULL,
      target_id   VARCHAR(50),
      metadata    JSONB DEFAULT '{}'::jsonb,
      created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions (admin_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_admin_actions_target_id ON admin_actions (target_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_created ON admin_actions (admin_id, created_at)`);
  console.log('admin_actions table created successfully');
  await pool.end();
}
main().catch(e => { console.error('Error:', e.message); pool.end(); process.exit(1); });
