const { Pool } = require('pg');
const pool = new Pool({ host: '34.143.228.135', port: 5432, database: 'izara_phase1', user: 'postgres', password: 'password123' });

async function run() {
  // Find ALL FK constraints that reference users table
  const fks = await pool.query(`
    SELECT tc.table_name, kcu.column_name, tc.constraint_name
    FROM information_schema.table_constraints tc 
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'users'
    ORDER BY tc.table_name
  `);
  console.log('FK constraints referencing users:');
  fks.rows.forEach(r => console.log(`  ${r.table_name}.${r.column_name} (${r.constraint_name})`));

  // Drop ALL FK constraints, update, then recreate
  console.log('\n--- Dropping FK constraints ---');
  for (const fk of fks.rows) {
    try {
      await pool.query(`ALTER TABLE ${fk.table_name} DROP CONSTRAINT ${fk.constraint_name}`);
      console.log(`  Dropped ${fk.constraint_name}`);
    } catch(e) { console.log(`  ${fk.constraint_name}: ${e.message.substring(0, 60)}`); }
  }

  // Now update user IDs
  const map = { 'PATIENT-001': 'PATIENT-DEMO', 'DOC-001': 'DOC-TEST-001', 'ADMIN-001': 'ADMIN-TEST-001' };
  for (const [oldId, newId] of Object.entries(map)) {
    const check = await pool.query('SELECT id FROM users WHERE id = $1', [oldId]);
    if (check.rows.length === 0) { console.log(`  ${oldId}: not found`); continue; }

    // Delete sessions for this user
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [oldId]);
    
    // Update all tables that might reference this ID
    const allTables = await pool.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND (column_name LIKE '%patient_id%' OR column_name LIKE '%doctor_id%' OR column_name LIKE '%user_id%' OR column_name LIKE '%recipient_id%' OR column_name LIKE '%speaker_id%')");
    
    for (const { table_name, column_name } of allTables.rows) {
      try {
        const r = await pool.query(`UPDATE ${table_name} SET ${column_name} = $1 WHERE ${column_name} = $2`, [newId, oldId]);
        if (r.rowCount > 0) console.log(`  ${table_name}.${column_name}: ${r.rowCount} rows`);
      } catch(e) { /* ignore */ }
    }

    // Update main user
    await pool.query('UPDATE users SET id = $1 WHERE id = $2', [newId, oldId]);
    console.log(`  users: ${oldId} => ${newId}`);
  }

  // Recreate FK constraints
  console.log('\n--- Recreating FK constraints ---');
  for (const fk of fks.rows) {
    try {
      await pool.query(`ALTER TABLE ${fk.table_name} ADD CONSTRAINT ${fk.constraint_name} FOREIGN KEY (${fk.column_name}) REFERENCES users(id)`);
      console.log(`  Recreated ${fk.constraint_name}`);
    } catch(e) { console.log(`  ${fk.constraint_name}: ${e.message.substring(0, 80)}`); }
  }

  console.log('\nVerify:');
  const v = await pool.query("SELECT id, email, role FROM users WHERE id IN ('PATIENT-DEMO', 'PATIENT-SOMCHAI', 'PATIENT-ANAN', 'DOC-TEST-001', 'ADMIN-TEST-001')");
  v.rows.forEach(r => console.log(`  ${r.id} | ${r.email} | ${r.role}`));

  pool.end();
}
run().catch(e => { console.error('FATAL:', e.message); pool.end(); });
