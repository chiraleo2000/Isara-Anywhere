const { Pool } = require('pg');
const pool = new Pool({ host: '34.143.228.135', port: 5432, database: 'izara_phase1', user: 'postgres', password: 'password123' });

async function run() {
  // Check vital_signs columns
  const vs = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'vital_signs' ORDER BY ordinal_position");
  console.log('vital_signs columns:', vs.rows.map(c => c.column_name).join(', '));
  
  // Check living_wills columns
  const lw = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'living_wills' ORDER BY ordinal_position");
  console.log('living_wills columns:', lw.rows.map(c => c.column_name).join(', '));

  // Check health_logs table
  const hl = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'health_logs' ORDER BY ordinal_position");
  console.log('health_logs columns:', hl.rows.map(c => c.column_name).join(', '));

  // Check video_meetings table
  const vm = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'video_meetings' ORDER BY ordinal_position");
  console.log('video_meetings columns:', vm.rows.map(c => c.column_name).join(', '));

  pool.end();
}
run().catch(e => { console.error(e.message); pool.end(); });
