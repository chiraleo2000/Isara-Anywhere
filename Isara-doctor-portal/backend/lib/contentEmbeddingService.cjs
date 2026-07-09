/**
 * Index clinical resources into knowledge_base for RAG search.
 * Uses Gemini embedding API when configured; stores text without vector otherwise.
 */

const { resolveGeminiApiKey, isGeminiConfigured } = require('./geminiKey.cjs');

const EMBEDDING_MODEL = 'text-embedding-004';
const EMBEDDING_DIM = 768;

async function generateEmbedding(text) {
  const apiKey = resolveGeminiApiKey();
  if (!isGeminiConfigured() || !text?.trim()) return null;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${EMBEDDING_MODEL}`,
          content: { parts: [{ text: text.substring(0, 8000) }] },
        }),
      }
    );
    if (!response.ok) {
      console.warn('[RAG] Embedding API error:', response.status);
      return null;
    }
    const data = await response.json();
    const values = data.embedding?.values;
    if (!Array.isArray(values) || values.length === 0) return null;
    return values.slice(0, EMBEDDING_DIM);
  } catch (err) {
    console.warn('[RAG] Embedding generation failed:', err.message);
    return null;
  }
}

function clinicalSourceKey(resourceId) {
  return `clinical_resource:${resourceId}`;
}

/**
 * Upsert knowledge_base row for an approved clinical resource.
 * @param {import('pg').Pool} pool
 * @param {object} resource - clinical_resources row
 */
async function indexClinicalResource(pool, resource) {
  if (!pool || !resource?.id) return null;

  const title = resource.title_thai || resource.title_english || 'Clinical Resource';
  const content = resource.content_thai || resource.content_english || '';
  const sourceKey = clinicalSourceKey(resource.id);
  const embedding = await generateEmbedding(`${title}\n\n${content}`);

  const existing = await pool.query(
    `SELECT id FROM knowledge_base WHERE source = $1 LIMIT 1`,
    [sourceKey]
  );

  if (existing.rows.length > 0) {
    const id = existing.rows[0].id;
    if (embedding) {
      await pool.query(
        `UPDATE knowledge_base SET
          title = $2, content = $3, category = $4, guideline_year = $5,
          language = 'th', embedding = $6::vector, is_active = true, updated_at = NOW()
         WHERE id = $1`,
        [id, title, content, resource.category, String(resource.guideline_year || ''), `[${embedding.join(',')}]`]
      );
    } else {
      await pool.query(
        `UPDATE knowledge_base SET
          title = $2, content = $3, category = $4, guideline_year = $5,
          language = 'th', is_active = true, updated_at = NOW()
         WHERE id = $1`,
        [id, title, content, resource.category, String(resource.guideline_year || '')]
      );
    }
    return id;
  }

  if (embedding) {
    const result = await pool.query(
      `INSERT INTO knowledge_base (title, content, source, category, guideline_year, language, embedding, is_active)
       VALUES ($1, $2, $3, $4, $5, 'th', $6::vector, true)
       RETURNING id`,
      [title, content, sourceKey, resource.category, String(resource.guideline_year || ''), `[${embedding.join(',')}]`]
    );
    return result.rows[0]?.id;
  }

  const result = await pool.query(
    `INSERT INTO knowledge_base (title, content, source, category, guideline_year, language, is_active)
     VALUES ($1, $2, $3, $4, $5, 'th', true)
     RETURNING id`,
    [title, content, sourceKey, resource.category, String(resource.guideline_year || '')]
  );
  return result.rows[0]?.id;
}

/**
 * Deactivate knowledge_base entry when clinical resource is rejected/archived/deleted.
 */
async function deactivateClinicalResource(pool, resourceId) {
  if (!pool || !resourceId) return;
  await pool.query(
    `UPDATE knowledge_base SET is_active = false, updated_at = NOW() WHERE source = $1`,
    [clinicalSourceKey(resourceId)]
  );
}

module.exports = {
  generateEmbedding,
  indexClinicalResource,
  deactivateClinicalResource,
  clinicalSourceKey,
};
