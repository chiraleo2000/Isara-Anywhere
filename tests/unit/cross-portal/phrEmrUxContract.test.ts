/**
 * @process Processes/Health_Records_Processes.md
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const anywhereRoot = path.resolve(__dirname, '../../../..');

describe('PHR/EMR UX contract (PHR-UX)', () => {
  it('PHR-UX-01 — EMR status badges', () => {
    expect(fs.readFileSync(path.join(anywhereRoot, 'issara-doctor/frontend/components/emr-editor/EmrEditorChrome.tsx'), 'utf8'))
      .toMatch(/emr-status-badge/);
  });

  it('PHR-UX-02 — patient record viewer tabs', () => {
    const src = fs.readFileSync(path.join(anywhereRoot, 'issara-doctor/frontend/components/PatientRecordViewer.tsx'), 'utf8');
    expect(src).toMatch(/patient-record-tab-\$\{tab\.key\}/);
    expect(src).toContain("key: 'meetings'");
    expect(src).toContain("key: 'rx'");
    // Tab label is Thai per process doc (11_Patient_Record_Viewer.md): การประชุม
    expect(src).toContain("label: 'การประชุม'");
  });

  it('PHR-UX-03 — apply AI summary to EMR', () => {
    expect(fs.readFileSync(path.join(anywhereRoot, 'issara-doctor/frontend/components/CompleteEMREditor.tsx'), 'utf8'))
      .toMatch(/readEmrAiDraft|apply.*ai|ai.*draft/i);
  });

  it('PHR-UX-04 — CDS allergy banner on prescribe', () => {
    expect(fs.readFileSync(path.join(anywhereRoot, 'issara-doctor/frontend/components/prescribing/PrescribingModalChrome.tsx'), 'utf8'))
      .toMatch(/cds-allergy-conflict-banner/);
  });

  it('PHR-UX-05 — patient PHR medication label + MedicationsTab', () => {
    const i18n = fs.readFileSync(path.join(anywhereRoot, 'issara-patient/frontend/contexts/SettingsContext.tsx'), 'utf8');
    const phr = fs.readFileSync(path.join(anywhereRoot, 'issara-patient/frontend/pages/PHRPage.tsx'), 'utf8');
    expect(i18n).toMatch(/phr\.medications/);
    expect(i18n).toMatch(/ยาที่ใช้ประจำ|Medications/);
    expect(phr).toContain('MedicationsTab');
    expect(phr).not.toContain('/api/documents?source=prescription');
  });

  it('PHR-UX-06 — prescription download gated on download_url/document_id', () => {
    const phr = fs.readFileSync(path.join(anywhereRoot, 'issara-patient/frontend/pages/PHRPage.tsx'), 'utf8');
    expect(phr).toMatch(/const canDownload = Boolean\(rx\.download_url \|\| rx\.document_id\)/);
    expect(phr).toMatch(/if \(!canDownload/);
  });

  it('PHR-UX-07 — lab tab requires document id/url before download', () => {
    const phr = fs.readFileSync(path.join(anywhereRoot, 'issara-patient/frontend/pages/PHRPage.tsx'), 'utf8');
    expect(phr).toMatch(/order\.document_id \|\| order\.download_url \|\| order\.downloadUrl|canDownloadLabOrder/);
  });

  it('PHR-UX-08 — meetings unlock field readyForPatient wired in phr API', () => {
    const api = fs.readFileSync(path.join(anywhereRoot, 'issara-patient/backend/routes/phr.ts'), 'utf8');
    expect(api).toMatch(/readyForPatient/);
    expect(api).toMatch(/const unlocked = readyForPatient/);
  });
});
