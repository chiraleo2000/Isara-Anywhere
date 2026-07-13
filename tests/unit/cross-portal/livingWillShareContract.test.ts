/**
 * Living will share → doctor PatientRecordViewer visibility contract.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

function visibleInPatientRecordViewer({
  sharedWithDoctors,
  doctorId,
}: {
  sharedWithDoctors: string[];
  doctorId: string;
}): boolean {
  return sharedWithDoctors.includes(doctorId);
}

describe('livingWillShareContract — pure', () => {
  it('LWS-01 — sharedWithDoctors includes doctorId → visible', () => {
    expect(
      visibleInPatientRecordViewer({
        sharedWithDoctors: ['doc-a', 'doc-b'],
        doctorId: 'doc-b',
      }),
    ).toBe(true);
  });

  it('LWS-02 — doctor not in sharedWithDoctors → not visible', () => {
    expect(
      visibleInPatientRecordViewer({
        sharedWithDoctors: ['doc-a'],
        doctorId: 'doc-z',
      }),
    ).toBe(false);
  });
});

describe('livingWillShareContract — source', () => {
  it('LWS-SRC — living will share in patient portal / doctor viewer', () => {
    const share = fs.readFileSync(
      path.join(root, 'Isara-patient-portal/backend/lib/livingWillShare.ts'),
      'utf8',
    );
    expect(share).toMatch(/living_will|sharedWith|resolveLivingWillAccess/);

    const phr = fs.readFileSync(
      path.join(root, 'Isara-patient-portal/backend/routes/phr.ts'),
      'utf8',
    );
    expect(phr).toMatch(/living-will/);
    expect(phr).toMatch(/share|is_shared_with_doctors/);

    const viewer = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/frontend/components/PatientRecordViewer.tsx'),
      'utf8',
    );
    expect(viewer).toMatch(/living.?will/i);
  });
});
