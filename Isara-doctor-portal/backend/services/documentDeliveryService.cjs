/**
 * DocumentDeliveryService — publish/list/download patient_documents (PostgreSQL).
 */

const SOURCE_TYPES = new Set([
  'emr_report',
  'lab_report',
  'imaging_report',
  'prescription',
  'instruction_sheet',
  'patient_upload',
  'living_will_export',
]);

function normalizeBase64(data) {
  if (!data) return null;
  if (Buffer.isBuffer(data)) return data;
  const str = String(data);
  const base64 = str.includes(',') ? str.split(',')[1] : str;
  try {
    return Buffer.from(base64, 'base64');
  } catch {
    return null;
  }
}

function rowToDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    patientId: row.patient_id,
    sourceType: row.source_type,
    sourceId: row.source_id,
    appointmentId: row.appointment_id,
    doctorId: row.doctor_id,
    title: row.title,
    description: row.description,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    status: row.status,
    deliveredAt: row.delivered_at,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    hasFile: Boolean(row.file_data && row.file_data.length),
  };
}

async function ensureTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS patient_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id VARCHAR(50) NOT NULL,
      source_type TEXT NOT NULL,
      source_id VARCHAR(50),
      appointment_id VARCHAR(50),
      doctor_id VARCHAR(50),
      title TEXT NOT NULL,
      description TEXT,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL DEFAULT 'application/pdf',
      file_data BYTEA,
      file_size INTEGER,
      status TEXT NOT NULL DEFAULT 'delivered',
      delivered_at TIMESTAMPTZ DEFAULT NOW(),
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

/**
 * @param {import('pg').Pool} pool
 */
async function publishDocument(pool, {
  patientId,
  sourceType,
  sourceId = null,
  appointmentId = null,
  doctorId = null,
  title,
  description = null,
  fileName,
  mimeType = 'application/pdf',
  fileData = null,
  fileSize = null,
  metadata = {},
}) {
  if (!patientId || !sourceType || !title || !fileName) {
    throw new Error('patientId, sourceType, title, and fileName are required');
  }
  if (!SOURCE_TYPES.has(sourceType)) {
    console.warn(`[DocumentDelivery] Unknown source_type: ${sourceType}`);
  }

  await ensureTable(pool);

  const buf = normalizeBase64(fileData);
  const size = fileSize ?? (buf ? buf.length : 0);

  const result = await pool.query(
    `INSERT INTO patient_documents (
      patient_id, source_type, source_id, appointment_id, doctor_id,
      title, description, file_name, mime_type, file_data, file_size,
      status, metadata, delivered_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'delivered',$12,NOW(),NOW())
    RETURNING *`,
    [
      patientId,
      sourceType,
      sourceId,
      appointmentId,
      doctorId,
      title,
      description,
      fileName,
      mimeType,
      buf,
      size,
      JSON.stringify(metadata || {}),
    ]
  );

  return rowToDto(result.rows[0]);
}

async function listDocuments(pool, patientId, { sourceType, limit = 50, offset = 0 } = {}) {
  await ensureTable(pool);
  let query = `
    SELECT d.*, u.name as doctor_name
    FROM patient_documents d
    LEFT JOIN users u ON d.doctor_id = u.id
    WHERE d.patient_id = $1 AND d.status = 'delivered'
  `;
  const params = [patientId];
  if (sourceType) {
    params.push(sourceType);
    query += ` AND d.source_type = $${params.length}`;
  }
  params.push(limit, offset);
  query += ` ORDER BY d.delivered_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

  const result = await pool.query(query, params);
  return result.rows.map((row) => ({
    ...rowToDto(row),
    doctorName: row.doctor_name,
  }));
}

async function getDocument(pool, docId, patientId = null) {
  await ensureTable(pool);
  const params = [docId];
  let query = 'SELECT * FROM patient_documents WHERE id = $1';
  if (patientId) {
    params.push(patientId);
    query += ' AND patient_id = $2';
  }
  const result = await pool.query(query, params);
  return result.rows[0] || null;
}

async function deleteDocument(pool, docId, patientId) {
  const result = await pool.query(
    `DELETE FROM patient_documents
     WHERE id = $1 AND patient_id = $2 AND source_type = 'patient_upload'
     RETURNING id`,
    [docId, patientId]
  );
  return result.rows[0] || null;
}

module.exports = {
  SOURCE_TYPES,
  publishDocument,
  listDocuments,
  getDocument,
  deleteDocument,
  rowToDto,
  ensureTable,
};
