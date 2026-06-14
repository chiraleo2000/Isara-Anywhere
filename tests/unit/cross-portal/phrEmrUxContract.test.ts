/**
 * @process Processes/Health_Records_Processes.md
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

describe('PHR/EMR UX contract (PHR-UX)', () => {
  it('PHR-UX-01 — EMR status badges', () => {
    expect(fs.readFileSync(path.join(root, 'Isara-doctor-portal/src/components/emr-editor/EmrEditorChrome.tsx'), 'utf8'))
      .toMatch(/emr-status-badge/);
  });

  it('PHR-UX-02 — patient record viewer tabs', () => {
    expect(fs.readFileSync(path.join(root, 'Isara-doctor-portal/src/components/PatientRecordViewer.tsx'), 'utf8'))
      .toMatch(/patient-record-tab/);
  });

  it('PHR-UX-03 — apply AI summary to EMR', () => {
    expect(fs.readFileSync(path.join(root, 'Isara-doctor-portal/src/components/CompleteEMREditor.tsx'), 'utf8'))
      .toMatch(/readEmrAiDraft|apply.*ai|ai.*draft/i);
  });

  it('PHR-UX-04 — CDS allergy banner on prescribe', () => {
    expect(fs.readFileSync(path.join(root, 'Isara-doctor-portal/src/components/prescribing/PrescribingModalChrome.tsx'), 'utf8'))
      .toMatch(/cds-allergy-conflict-banner/);
  });
});
