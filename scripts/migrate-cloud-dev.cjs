/**
 * Cloud-dev database migration script
 * Adds: ai_chat_memory table, transcript_embeddings table, embedding column on ai_chat_history
 */
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DEV_DB_HOST || '35.240.162.227',
  port: Number.parseInt(process.env.DEV_DB_PORT || '5432'),
  user: process.env.DEV_DB_USER || 'postgres',
  password: process.env.DEV_DB_PASSWORD || '',
  database: process.env.DEV_DB_NAME || 'izara_phase1',
  ssl: false,
  connectionTimeoutMillis: 15000
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Add embedding column to ai_chat_history
    console.log('1. Adding embedding column to ai_chat_history...');
    await client.query('ALTER TABLE ai_chat_history ADD COLUMN IF NOT EXISTS embedding vector(768)');
    console.log('   Done.');

    // 2. Create ai_chat_memory table
    console.log('2. Creating ai_chat_memory table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_chat_memory (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id),
        memory_type VARCHAR(30) NOT NULL CHECK (memory_type IN ('conversation_summary', 'health_context', 'preference', 'important_fact')),
        title VARCHAR(500),
        content TEXT NOT NULL,
        source_session_id VARCHAR(100),
        embedding vector(768),
        relevance_score DECIMAL(5,4) DEFAULT 1.0,
        access_count INTEGER DEFAULT 0,
        last_accessed_at TIMESTAMP WITH TIME ZONE,
        expires_at TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   Done.');

    // 3. Create transcript_embeddings table
    console.log('3. Creating transcript_embeddings table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS transcript_embeddings (
        id SERIAL PRIMARY KEY,
        meeting_record_id UUID REFERENCES meeting_records(id) ON DELETE CASCADE,
        appointment_id VARCHAR(50) REFERENCES appointments(id),
        patient_id VARCHAR(50) REFERENCES users(id),
        doctor_id VARCHAR(50) REFERENCES users(id),
        chunk_index INTEGER NOT NULL,
        chunk_text TEXT NOT NULL,
        speaker_role VARCHAR(20) CHECK (speaker_role IN ('doctor', 'patient', 'guest', 'mixed')),
        start_time_seconds INTEGER,
        end_time_seconds INTEGER,
        embedding vector(768),
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   Done.');

    // 4. Create indexes
    console.log('4. Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_ai_memory_user_id ON ai_chat_memory(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_ai_memory_type ON ai_chat_memory(memory_type)',
      'CREATE INDEX IF NOT EXISTS idx_ai_memory_active ON ai_chat_memory(is_active) WHERE is_active = true',
      'CREATE INDEX IF NOT EXISTS idx_transcript_emb_meeting ON transcript_embeddings(meeting_record_id)',
      'CREATE INDEX IF NOT EXISTS idx_transcript_emb_patient ON transcript_embeddings(patient_id)',
      'CREATE INDEX IF NOT EXISTS idx_transcript_emb_doctor ON transcript_embeddings(doctor_id)'
    ];
    for (const idx of indexes) {
      await client.query(idx);
      const name = /idx_\w+/.exec(idx)?.[0] || 'unknown';
      console.log('   Created: ' + name);
    }

    await client.query('COMMIT');
    console.log('\n✅ Migration complete! All tables and indexes created.');

    // Verify
    const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('ai_chat_memory','transcript_embeddings') ORDER BY tablename");
    console.log('Verified tables:', tables.rows.map(r => r.tablename).join(', '));
    const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='ai_chat_history' AND column_name='embedding'");
    console.log('ai_chat_history.embedding:', cols.rows.length > 0 ? 'EXISTS' : 'MISSING');
  } catch(e) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
