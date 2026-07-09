/**
 * Patient Documents API — unified clinical document registry
 */
import { Router, Request, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import {
  publishDocument,
  listDocuments,
  deletePatientUpload,
} from '../services/documentDeliveryService';

const router = Router();

function resolvePatientId(req: Request): string | null {
  const authReq = req as AuthenticatedRequest;
  return authReq.user?.userId || authReq.user?.id || null;
}

const DOC_TYPE_MAP: Record<string, string> = {
  lab_result: 'patient_upload',
  prescription: 'patient_upload',
  imaging: 'patient_upload',
  other: 'patient_upload',
};

// GET /api/patients/documents
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const patientId = resolvePatientId(req);
    if (!patientId) return res.status(401).json({ error: 'Unauthorized' });

    const { sourceType } = req.query;
    const documents = await listDocuments(patientId, {
      sourceType: sourceType as string | undefined,
    });
    res.json({ documents, count: documents.length });
  } catch (error: unknown) {
    console.error('[Documents] List error:', error);
    res.status(500).json({ error: 'Failed to list documents' });
  }
});

// POST /api/patients/documents — JSON body with base64 file
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const patientId = resolvePatientId(req);
    if (!patientId) return res.status(401).json({ error: 'Unauthorized' });

    const {
      fileName,
      mimeType,
      fileData,
      documentType,
      description,
      title,
    } = req.body;

    if (!fileName || !fileData) {
      return res.status(400).json({ error: 'fileName and fileData are required' });
    }

    const doc = await publishDocument({
      patientId,
      sourceType: DOC_TYPE_MAP[documentType] || 'patient_upload',
      title: title || fileName,
      description: description || null,
      fileName,
      mimeType: mimeType || 'application/pdf',
      fileData,
      metadata: { documentType: documentType || 'other', uploadedBy: 'patient' },
    });

    res.status(201).json({
      id: doc.id,
      filename: doc.file_name,
      uploadedAt: doc.delivered_at || doc.created_at,
    });
  } catch (error: unknown) {
    console.error('[Documents] Upload error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// DELETE /api/patients/documents/:id — patient uploads only
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const patientId = resolvePatientId(req);
    if (!patientId) return res.status(401).json({ error: 'Unauthorized' });

    const deleted = await deletePatientUpload(req.params.id, patientId);
    if (!deleted) {
      return res.status(404).json({ error: 'Document not found or not deletable' });
    }
    res.json({ success: true });
  } catch (error: unknown) {
    console.error('[Documents] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;
