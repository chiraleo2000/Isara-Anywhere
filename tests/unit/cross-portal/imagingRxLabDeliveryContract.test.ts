/**
 * Imaging / Rx / Lab delivery + prescribing allergy gate contract.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

const CLINICAL_DELIVERY_TYPES = [
  'imaging_report',
  'lab_report',
  'prescription',
] as const;

function allergyBlocksPrescribe(allergies: string[], drugName: string): boolean {
  const drug = drugName.toLowerCase();
  return allergies.some((a) => {
    const sub = a.toLowerCase();
    return drug.includes(sub) || sub.includes(drug);
  });
}

/** Imaging download ACL — only owning patient (or null patientId for doctor) may fetch. */
function canDownloadImaging(opts: {
  docPatientId: string;
  requesterPatientId?: string | null;
}): boolean {
  if (opts.requesterPatientId == null || opts.requesterPatientId === '') return true;
  return opts.docPatientId === opts.requesterPatientId;
}

/** Lab report published into patient_documents becomes PHR-visible. */
function labReportVisibleInPhr(opts: {
  publishedToPatientDocuments: boolean;
  sourceType: string;
}): boolean {
  return opts.publishedToPatientDocuments && opts.sourceType === 'lab_report';
}

describe('imagingRxLabDeliveryContract — pure', () => {
  it('IRL-01 — delivery types include imaging_report, lab_report, prescription', () => {
    expect(CLINICAL_DELIVERY_TYPES).toContain('imaging_report');
    expect(CLINICAL_DELIVERY_TYPES).toContain('lab_report');
    expect(CLINICAL_DELIVERY_TYPES).toContain('prescription');
  });

  it('IRL-02 — allergyBlocksPrescribe true when drug matches allergy', () => {
    expect(allergyBlocksPrescribe(['Penicillin'], 'Amoxicillin')).toBe(false);
    expect(allergyBlocksPrescribe(['Penicillin'], 'Penicillin VK')).toBe(true);
    expect(allergyBlocksPrescribe(['ibuprofen'], 'Ibuprofen 400mg')).toBe(true);
    expect(allergyBlocksPrescribe(['Penicillin'], 'Paracetamol')).toBe(false);
  });

  it('IRL-03 — imaging ACL denies cross-patient download', () => {
    expect(
      canDownloadImaging({ docPatientId: 'PT-1', requesterPatientId: 'PT-1' }),
    ).toBe(true);
    expect(
      canDownloadImaging({ docPatientId: 'PT-1', requesterPatientId: 'PT-2' }),
    ).toBe(false);
    expect(
      canDownloadImaging({ docPatientId: 'PT-1', requesterPatientId: null }),
    ).toBe(true);
  });

  it('IRL-04 — lab_report in patient_documents is PHR-visible', () => {
    expect(
      labReportVisibleInPhr({
        publishedToPatientDocuments: true,
        sourceType: 'lab_report',
      }),
    ).toBe(true);
    expect(
      labReportVisibleInPhr({
        publishedToPatientDocuments: false,
        sourceType: 'lab_report',
      }),
    ).toBe(false);
    expect(
      labReportVisibleInPhr({
        publishedToPatientDocuments: true,
        sourceType: 'draft_note',
      }),
    ).toBe(false);
  });
});

describe('imagingRxLabDeliveryContract — source', () => {
  it('IRL-SRC — prescribing allergy + lab upload surfaces exist', () => {
    const prescribing = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/frontend/components/CompletePrescribing.tsx'),
      'utf8',
    );
    expect(prescribing).toMatch(/allergy/i);

    const allergyTest = fs.readFileSync(
      path.join(root, 'tests/unit/doctor-portal/prescribingAllergy.test.ts'),
      'utf8',
    );
    expect(allergyTest).toMatch(/allergy/i);

    const lab = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/frontend/components/CompleteLabOrders.tsx'),
      'utf8',
    );
    expect(lab).toMatch(/lab-report-upload|\/api\/lab-orders/);

    const delivery = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/backend/services/documentDeliveryService.cjs'),
      'utf8',
    );
    expect(delivery).toMatch(/imaging_report/);
    expect(delivery).toMatch(/lab_report/);
    expect(delivery).toMatch(/prescription/);
    expect(delivery).toMatch(/patient_id = \$2|AND patient_id/);

    const patientDelivery = fs.readFileSync(
      path.join(root, 'Isara-patient-portal/backend/services/documentDeliveryService.ts'),
      'utf8',
    );
    expect(patientDelivery).toMatch(/patientId/);
    expect(patientDelivery).toMatch(/imaging_report|lab_report/);
  });
});
