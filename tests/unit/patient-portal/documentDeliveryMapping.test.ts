/**
 * DocumentDeliveryService mapping + source-type contracts (patient portal).
 * Pure mapping assertions — mock DB pool so import does not open TCP.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../issara-patient/backend/services/postgresDataService', () => ({
  pool: { query: vi.fn() },
}));

const {
  SOURCE_TYPES,
  rowToMedicalDocument,
} = await import('../../../issara-patient/backend/services/documentDeliveryService');

describe('DocumentDeliveryService mapping', () => {
  it('DOC-01 — SOURCE_TYPES includes clinical + patient upload kinds', () => {
    for (const t of [
      'emr_report',
      'lab_report',
      'imaging_report',
      'prescription',
      'instruction_sheet',
      'patient_upload',
      'living_will_export',
    ]) {
      expect(SOURCE_TYPES.has(t)).toBe(true);
    }
  });

  it('DOC-02 — rowToMedicalDocument maps lab_report → lab_result and download URL', () => {
    const doc = rowToMedicalDocument({
      id: 'doc-1',
      source_type: 'lab_report',
      title: 'CBC',
      description: 'Complete blood count',
      delivered_at: '2026-07-09T10:00:00Z',
      created_at: '2026-07-09T09:00:00Z',
      file_name: 'cbc.pdf',
      file_size: 1024,
    });
    expect(doc.type).toBe('lab_result');
    expect(doc.downloadUrl).toBe('/api/phr/documents/doc-1/download');
    expect(doc.fileName).toBe('cbc.pdf');
    expect(doc.sourceType).toBe('lab_report');
  });

  it('DOC-03 — emr_report and instruction_sheet map to their UI types', () => {
    expect(rowToMedicalDocument({ id: 'a', source_type: 'emr_report', title: 'EMR', file_name: 'e.pdf' }).type).toBe('emr');
    expect(rowToMedicalDocument({ id: 'b', source_type: 'instruction_sheet', title: 'IS', file_name: 'i.pdf' }).type).toBe('instruction');
  });

  it('DOC-04 — prescription and imaging map to dedicated types', () => {
    expect(rowToMedicalDocument({ id: 'c', source_type: 'prescription', title: 'Rx', file_name: 'r.pdf' }).type).toBe('prescription');
    expect(rowToMedicalDocument({ id: 'd', source_type: 'imaging_report', title: 'XR', file_name: 'x.pdf' }).type).toBe('imaging_result');
  });

  it('DOC-05 — unknown source_type falls back to the raw source_type', () => {
    expect(rowToMedicalDocument({ id: 'e', source_type: 'unknown_kind', title: 'X', file_name: 'x.bin' }).type).toBe('unknown_kind');
  });
});
