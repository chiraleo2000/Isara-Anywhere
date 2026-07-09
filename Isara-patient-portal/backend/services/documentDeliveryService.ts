/**
 * DocumentDeliveryService — patient portal (TypeScript)
 */
import { pool } from './postgresDataService';

export const SOURCE_TYPES = new Set([
  'emr_report',
  'lab_report',
  'imaging_report',
  'prescription',
  'instruction_sheet',
  'patient_upload',
  'living_will_export',
]);

export interface PublishDocumentInput {
  patientId: string;
  sourceType: string;
  sourceId?: string | null;
  appointmentId?: string | null;
  doctorId?: string | null;
  title: string;
  description?: string | null;
  fileName: string;
  mimeType?: string;
  fileData?: Buffer | string | null;
  fileSize?: number | null;
  metadata?: Record<string, unknown>;
}

function normalizeBase64(data: Buffer | string | null | undefined): Buffer | null {
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

export function rowToMedicalDocument(row: any) {
  return {
    id: row.id,
    type: mapSourceToDocType(row.source_type),
    title: row.title,
    description: row.description || undefined,
    uploadDate: row.delivered_at || row.created_at,
    fileUrl: `/api/documents/${row.id}/download`,
    fileName: row.file_name,
    fileSize: row.file_size || 0,
    mimeType: row.mime_type || 'application/pdf',
    sourceType: row.source_type,
    doctorName: row.doctor_name,
    metadata: row.metadata || {},
  };
}

function mapSourceToDocType(sourceType: string): string {
  const map: Record<string, string> = {
    lab_report: 'lab_result',
    imaging_report: 'imaging',
    prescription: 'prescription',
    emr_report: 'report',
    instruction_sheet: 'report',
    patient_upload: 'other',
    living_will_export: 'report',
  };
  return map[sourceType] || 'other';
}

export async function publishDocument(input: PublishDocumentInput) {
  const buf = normalizeBase64(input.fileData);
  const size = input.fileSize ?? (buf ? buf.length : 0);

  const result = await pool.query(
    `INSERT INTO patient_documents (
      patient_id, source_type, source_id, appointment_id, doctor_id,
      title, description, file_name, mime_type, file_data, file_size,
      status, metadata, delivered_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'delivered',$12,NOW(),NOW())
    RETURNING *`,
    [
      input.patientId,
      input.sourceType,
      input.sourceId ?? null,
      input.appointmentId ?? null,
      input.doctorId ?? null,
      input.title,
      input.description ?? null,
      input.fileName,
      input.mimeType || 'application/pdf',
      buf,
      size,
      JSON.stringify(input.metadata || {}),
    ]
  );
  return result.rows[0];
}

export async function listDocuments(
  patientId: string,
  opts: { sourceType?: string; limit?: number; offset?: number } = {}
) {
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;
  let query = `
    SELECT d.*, u.name as doctor_name
    FROM patient_documents d
    LEFT JOIN users u ON d.doctor_id = u.id
    WHERE d.patient_id = $1 AND d.status = 'delivered'
  `;
  const params: unknown[] = [patientId];
  if (opts.sourceType) {
    params.push(opts.sourceType);
    query += ` AND d.source_type = $${params.length}`;
  }
  params.push(limit, offset);
  query += ` ORDER BY d.delivered_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
  const result = await pool.query(query, params);
  return result.rows.map(rowToMedicalDocument);
}

export async function getDocumentById(docId: string, patientId?: string) {
  const params: string[] = [docId];
  let query = 'SELECT * FROM patient_documents WHERE id = $1';
  if (patientId) {
    params.push(patientId);
    query += ' AND patient_id = $2';
  }
  const result = await pool.query(query, params);
  return result.rows[0] || null;
}

export async function deletePatientUpload(docId: string, patientId: string) {
  const result = await pool.query(
    `DELETE FROM patient_documents
     WHERE id = $1 AND patient_id = $2 AND source_type = 'patient_upload'
     RETURNING id`,
    [docId, patientId]
  );
  return result.rows[0] || null;
}
