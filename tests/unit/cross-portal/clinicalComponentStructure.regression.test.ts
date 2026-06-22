import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

describe('clinical component structure guard (v1.7.48)', () => {
  it('CompleteEMREditor delegates chrome to EmrEditorChrome', () => {
    const emr = read('Isara-doctor-portal/frontend/components/CompleteEMREditor.tsx');
    expect(emr).toMatch(/import \{ EmrEditorChrome \} from '\.\/emr-editor\/EmrEditorChrome'/);
    expect(emr).toMatch(/<EmrEditorChrome/);
    expect(fs.existsSync(path.join(root, 'Isara-doctor-portal/frontend/components/emr-editor/EmrEditorChrome.tsx'))).toBe(true);
  });

  it('CompletePrescribing delegates chrome to PrescribingModalChrome', () => {
    const rx = read('Isara-doctor-portal/frontend/components/CompletePrescribing.tsx');
    expect(rx).toMatch(/import \{ PrescribingModalChrome \} from '\.\/prescribing\/PrescribingModalChrome'/);
    expect(rx).toMatch(/<PrescribingModalChrome/);
    expect(fs.existsSync(path.join(root, 'Isara-doctor-portal/frontend/components/prescribing/PrescribingModalChrome.tsx'))).toBe(true);
  });

  it('LiveTranscription delegates view to LiveTranscriptionView', () => {
    const lt = read('Isara-doctor-portal/frontend/components/LiveTranscription.tsx');
    expect(lt).toMatch(/import \{ LiveTranscriptionView \} from '\.\/transcription\/LiveTranscriptionView'/);
    expect(lt).toMatch(/<LiveTranscriptionView/);
    expect(fs.existsSync(path.join(root, 'Isara-doctor-portal/frontend/components/transcription/LiveTranscriptionView.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'Isara-doctor-portal/frontend/components/transcription/transcriptTypes.ts'))).toBe(true);
  });

  it('MeetingResults uses ValidationAction type alias (S4323)', () => {
    const mr = read('Isara-doctor-portal/frontend/pages/meetings/MeetingResults.tsx');
    expect(mr).toMatch(/type ValidationAction = 'approve' \| 'edit' \| 'reject'/);
    expect(mr).not.toMatch(/action: 'approve' \| 'edit' \| 'reject'/);
  });

  it('technical_architecture_content uses ROLE_PATIENT and ROLE_DOCTOR constants (S1192)', () => {
    const py = read('scripts/technical_architecture_content.py');
    expect(py).toMatch(/^ROLE_PATIENT = "ผู้ป่วย"/m);
    expect(py).toMatch(/^ROLE_DOCTOR = "แพทย์"/m);
    expect(py).toMatch(/\[ROLE_PATIENT,/);
    expect(py).toMatch(/\[ROLE_DOCTOR,/);
    expect(py.match(/"ผู้ป่วย"/g)?.length ?? 0).toBe(1);
    expect(py.match(/"แพทย์"/g)?.length ?? 0).toBe(1);
  });
});
