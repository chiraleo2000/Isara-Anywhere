/**
 * Contract tests: unified clinical document delivery registry
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

describe('Clinical document delivery contract', () => {
  it('patient_documents migration exists', () => {
    const migration = path.join(root, 'scripts/database/migrations/v2.3.0-patient-documents-and-messages.sql');
    expect(fs.existsSync(migration)).toBe(true);
    const sql = fs.readFileSync(migration, 'utf8');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS patient_documents');
    expect(sql).toContain('patient_doctor_messages');
  });

  it('DocumentDeliveryService exists on both portals', () => {
    expect(fs.existsSync(path.join(root, 'Isara-doctor-portal/backend/services/documentDeliveryService.cjs'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'Isara-patient-portal/backend/services/documentDeliveryService.ts'))).toBe(true);
  });

  it('patient portal exposes documents API routes', () => {
    const index = fs.readFileSync(path.join(root, 'Isara-patient-portal/backend/index.ts'), 'utf8');
    expect(index).toContain('/api/patients/documents');
    expect(index).toContain('/api/documents/:id/download');
    expect(index).toContain('/api/meetings/recording-download');
  });

  it('doctor portal publishes EMR to health-logs with auth in CompleteEMREditor', () => {
    const emr = fs.readFileSync(path.join(root, 'Isara-doctor-portal/frontend/components/CompleteEMREditor.tsx'), 'utf8');
    expect(emr).toContain('Authorization');
    expect(emr).toMatch(/health-logs/);
  });

  it('PUT /api/emr/:id registered in mainApiServer', () => {
    const api = fs.readFileSync(path.join(root, 'Isara-doctor-portal/backend/mainApiServer.cjs'), 'utf8');
    expect(api).toContain("app.put('/api/emr/:id'");
    expect(api).toContain('DocumentDeliveryService');
    expect(api).toContain('patient_doctor_messages');
    expect(api).toContain('notifyDocumentDelivered');
    expect(api).toContain("type: 'document_delivered'");
  });

  it('phr health-logs map to HealthLogEntry and signed-only filter', () => {
    const phr = fs.readFileSync(path.join(root, 'Isara-patient-portal/backend/routes/phr.ts'), 'utf8');
    expect(phr).toContain('mapEmrRowToHealthLogEntry');
    expect(phr).toContain("e.status = 'signed'");
    expect(phr).toContain('listDocuments');
  });

  it('doctor EHR exposes documents + imaging for PatientRecordViewer Docs/Labs tabs', () => {
    const api = fs.readFileSync(path.join(root, 'Isara-doctor-portal/backend/mainApiServer.cjs'), 'utf8');
    expect(api).toContain('imagingGroups');
    expect(api).toContain('mapDocumentToExternalRecord');
    expect(api).toContain("/api/patients/:patientId/meetings");
  });

  it('workflow doc documents meeting video + realtime surfaces', () => {
    const doc = fs.readFileSync(path.join(root, 'Processes/Clinical_Document_Delivery_Workflows.md'), 'utf8');
    expect(doc).toContain('document_delivered');
    expect(doc).toContain('Meeting video');
    expect(doc).toContain('useRealtimeSync');
  });
});
