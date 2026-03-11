/**
 * Database Cleanup Script — removes duplicate test data while retaining originals
 */
const { Pool } = require('pg');

const DB_PASSWORD = process.env.PGPASSWORD || 'IzaraDb2024';
const LOCAL_CONFIG = {
  host: 'localhost', port: 5433, user: 'postgres',
  password: DB_PASSWORD, database: 'izara_phase1',
};

async function run() {
  const pool = new Pool(LOCAL_CONFIG);
  const client = await pool.connect();
  try {
    // 1. List tables and row counts
    console.log('\n=== TABLE INVENTORY ===');
    const tables = await client.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
    );
    for (const t of tables.rows) {
      const cnt = await client.query(`SELECT COUNT(*) as c FROM "${t.tablename}"`);
      console.log(`  ${t.tablename}: ${cnt.rows[0].c} rows`);
    }

    // 2. Find and remove duplicate appointments (same patient+doctor+date)
    console.log('\n=== CHECKING DUPLICATES ===');

    // Appointments duplicates — keep the one with EMR references
    const aptDups = await client.query(`
      SELECT patient_id, doctor_id, appointment_date, COUNT(*) as cnt
      FROM appointments
      GROUP BY patient_id, doctor_id, appointment_date
      HAVING COUNT(*) > 1
    `).catch(() => ({ rows: [] }));
    console.log(`  Appointment duplicates: ${aptDups.rows.length} groups`);

    if (aptDups.rows.length > 0) {
      // Delete duplicates that have NO EMR references (safe to remove)
      const delApt = await client.query(`
        DELETE FROM appointments WHERE id IN (
          SELECT id FROM (
            SELECT a.id, ROW_NUMBER() OVER (
              PARTITION BY a.patient_id, a.doctor_id, a.appointment_date
              ORDER BY (SELECT COUNT(*) FROM emr e WHERE e.appointment_id = a.id) DESC, a.created_at ASC
            ) as rn FROM appointments a
          ) t WHERE rn > 1
        ) AND id NOT IN (SELECT DISTINCT appointment_id FROM emr WHERE appointment_id IS NOT NULL)
      `);
      console.log(`  Deleted ${delApt.rowCount} duplicate appointments (preserved EMR-linked ones)`);
    }

    // Meeting duplicates (same subject+patient)
    const meetDups = await client.query(`
      SELECT subject, patient_id, COUNT(*) as cnt
      FROM meetings
      GROUP BY subject, patient_id
      HAVING COUNT(*) > 1
    `).catch(() => ({ rows: [] }));
    console.log(`  Meeting duplicates: ${meetDups.rows.length} groups`);

    if (meetDups.rows.length > 0) {
      const delMeet = await client.query(`
        DELETE FROM meetings WHERE id IN (
          SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (
              PARTITION BY subject, patient_id
              ORDER BY created_at ASC
            ) as rn FROM meetings
          ) t WHERE rn > 1
        )
      `);
      console.log(`  Deleted ${delMeet.rowCount} duplicate meetings`);
    }

    // Content duplicates (same title)
    const contDups = await client.query(`
      SELECT title, COUNT(*) as cnt
      FROM medical_content
      GROUP BY title
      HAVING COUNT(*) > 1
    `).catch(() => ({ rows: [] }));
    console.log(`  Content duplicates: ${contDups.rows.length} groups`);

    if (contDups.rows.length > 0) {
      const delCont = await client.query(`
        DELETE FROM medical_content WHERE id IN (
          SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (
              PARTITION BY title
              ORDER BY created_at ASC
            ) as rn FROM medical_content
          ) t WHERE rn > 1
        )
      `);
      console.log(`  Deleted ${delCont.rowCount} duplicate content items`);
    }

    // Notification duplicates (same user+type+message within same minute)
    const notifDups = await client.query(`
      SELECT user_id, type, message, date_trunc('minute', created_at) as minute, COUNT(*) as cnt
      FROM notifications
      GROUP BY user_id, type, message, date_trunc('minute', created_at)
      HAVING COUNT(*) > 1
    `).catch(() => ({ rows: [] }));
    console.log(`  Notification duplicates: ${notifDups.rows.length} groups`);

    if (notifDups.rows.length > 0) {
      const delNotif = await client.query(`
        DELETE FROM notifications WHERE id IN (
          SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (
              PARTITION BY user_id, type, message, date_trunc('minute', created_at)
              ORDER BY created_at ASC
            ) as rn FROM notifications
          ) t WHERE rn > 1
        )
      `);
      console.log(`  Deleted ${delNotif.rowCount} duplicate notifications`);
    }

    // AI chat duplicates (same user+message)
    const aiDups = await client.query(`
      SELECT user_id, message, COUNT(*) as cnt
      FROM ai_chat_history
      GROUP BY user_id, message
      HAVING COUNT(*) > 1
    `).catch(() => ({ rows: [] }));
    console.log(`  AI chat duplicates: ${aiDups.rows.length} groups`);

    if (aiDups.rows.length > 0) {
      const delAi = await client.query(`
        DELETE FROM ai_chat_history WHERE id IN (
          SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (
              PARTITION BY user_id, message
              ORDER BY created_at ASC
            ) as rn FROM ai_chat_history
          ) t WHERE rn > 1
        )
      `);
      console.log(`  Deleted ${delAi.rowCount} duplicate AI chat entries`);
    }

    // Clean up test-created data (meetings with test-* subjects, etc.)
    console.log('\n=== CLEANING TEST DATA ===');
    const testMeetings = await client.query(`
      DELETE FROM meetings WHERE subject LIKE 'test-%' OR subject LIKE 'Test meeting%'
    `).catch(() => ({ rowCount: 0 }));
    console.log(`  Removed ${testMeetings.rowCount} test meetings`);

    // Clean old sessions (>7 days)
    const oldSessions = await client.query(`
      DELETE FROM sessions WHERE created_at < NOW() - INTERVAL '7 days'
    `).catch(() => ({ rowCount: 0 }));
    console.log(`  Removed ${oldSessions.rowCount} old sessions`);

    // Clean duplicate meeting_records (same meeting_id + session_id)
    const meetRecDups = await client.query(`
      DELETE FROM meeting_records WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (
            PARTITION BY meeting_id
            ORDER BY created_at DESC
          ) as rn FROM meeting_records
        ) t WHERE rn > 5
      )
    `).catch(() => ({ rowCount: 0 }));
    console.log(`  Removed ${meetRecDups.rowCount} excess meeting records (keeping latest 5 per meeting)`);

    // Clean duplicate vital_signs  
    const vitalDups = await client.query(`
      DELETE FROM vital_signs WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (
            PARTITION BY patient_id, date_trunc('day', recorded_at)
            ORDER BY recorded_at DESC
          ) as rn FROM vital_signs
        ) t WHERE rn > 3
      )
    `).catch(() => ({ rowCount: 0 }));
    console.log(`  Removed ${vitalDups.rowCount} excess vitals (keeping latest 3 per patient per day)`);

    // Final counts
    console.log('\n=== FINAL TABLE COUNTS ===');
    for (const t of tables.rows) {
      const cnt = await client.query(`SELECT COUNT(*) as c FROM "${t.tablename}"`);
      console.log(`  ${t.tablename}: ${cnt.rows[0].c} rows`);
    }

    console.log('\n✅ Database cleanup complete');
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
