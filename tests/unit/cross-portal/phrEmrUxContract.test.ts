/**
 * @process Processes/Health_Records_Processes.md
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

describe('PHR/EMR UX contract (PHR-UX)', () => {
  it('PHR-UX-01 — EMR status badges', () => {
    expect(fs.readFileSync(path.join(root, 'Isara-doctor-portal/frontend/components/emr-editor/EmrEditorChrome.tsx'), 'utf8'))
      .toMatch(/emr-status-badge/);
  });

  it('PHR-UX-02 — patient record viewer tabs', () => {
    const src = fs.readFileSync(path.join(root, 'Isara-doctor-portal/frontend/components/PatientRecordViewer.tsx'), 'utf8');
    expect(src).toMatch(/patient-record-tab-\$\{tab\.key\}/);
    expect(src).toContain("key: 'meetings'");
    expect(src).toContain('ประวัติการจ่ายยา');
  });

  it('PHR-UX-03 — apply AI summary to EMR', () => {
    expect(fs.readFileSync(path.join(root, 'Isara-doctor-portal/frontend/components/CompleteEMREditor.tsx'), 'utf8'))
      .toMatch(/readEmrAiDraft|apply.*ai|ai.*draft/i);
  });

  it('PHR-UX-04 — CDS allergy banner on prescribe', () => {
    expect(fs.readFileSync(path.join(root, 'Isara-doctor-portal/frontend/components/prescribing/PrescribingModalChrome.tsx'), 'utf8'))
      .toMatch(/cds-allergy-conflict-banner/);
  });

  it('PHR-UX-05 — patient PHR medication history label + realtime', () => {
    const i18n = fs.readFileSync(path.join(root, 'Isara-patient-portal/frontend/contexts/SettingsContext.tsx'), 'utf8');
    const phr = fs.readFileSync(path.join(root, 'Isara-patient-portal/frontend/pages/PHRPage.tsx'), 'utf8');
    expect(i18n).toContain('ประวัติการรับยา');
    expect(phr).toContain('useRealtimeSync');
    expect(phr).not.toContain('/api/documents?source=prescription');
  });
});
