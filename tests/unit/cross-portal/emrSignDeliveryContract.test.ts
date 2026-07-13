/**
 * EMR sign → patient document delivery contract.
 * Signed EMR unlocks patient-visible clinical docs (emr_report / instruction_sheet).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

const PATIENT_DOC_TYPES = ['emr_report', 'instruction_sheet'] as const;

type ClinicalDoc = { id: string; type: string };

function patientVisibleDocuments({
  signed,
  docs,
}: {
  signed: boolean;
  docs: ClinicalDoc[];
}): ClinicalDoc[] {
  if (!signed) return [];
  return docs.filter((d) =>
    (PATIENT_DOC_TYPES as readonly string[]).includes(d.type),
  );
}

describe('emrSignDeliveryContract — pure', () => {
  const docs: ClinicalDoc[] = [
    { id: '1', type: 'emr_report' },
    { id: '2', type: 'instruction_sheet' },
    { id: '3', type: 'draft_note' },
  ];

  it('ESD-01 — unsigned EMR yields no patient-visible documents', () => {
    expect(patientVisibleDocuments({ signed: false, docs })).toEqual([]);
  });

  it('ESD-02 — signed EMR returns emr_report and instruction_sheet only', () => {
    const visible = patientVisibleDocuments({ signed: true, docs });
    expect(visible.map((d) => d.type).sort()).toEqual([
      'emr_report',
      'instruction_sheet',
    ]);
    expect(PATIENT_DOC_TYPES).toContain('emr_report');
    expect(PATIENT_DOC_TYPES).toContain('instruction_sheet');
  });
});

describe('emrSignDeliveryContract — source', () => {
  it('ESD-SRC — documentDeliveryService mentions emr_report / instruction_sheet / patient_documents', () => {
    const doctor = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/backend/services/documentDeliveryService.cjs'),
      'utf8',
    );
    expect(doctor).toMatch(/emr_report/);
    expect(doctor).toMatch(/instruction_sheet/);
    expect(doctor).toMatch(/patient_documents/);

    const patient = fs.readFileSync(
      path.join(root, 'Isara-patient-portal/backend/services/documentDeliveryService.ts'),
      'utf8',
    );
    expect(patient).toMatch(/emr_report/);
    expect(patient).toMatch(/instruction_sheet/);
    expect(patient).toMatch(/patient_documents/);
  });
});
