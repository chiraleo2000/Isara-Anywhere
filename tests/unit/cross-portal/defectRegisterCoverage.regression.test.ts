import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

const DEFECT_IDS = [
  'G1', 'G2', 'G3',
  'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12',
  'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8',
  'M2',
];

const SCAN_FILES = [
  'issara-doctor/frontend/services/geminiClinicalService.ts',
  'issara-doctor/frontend/components/CompleteEMREditor.tsx',
  'issara-doctor/frontend/components/CompletePrescribing.tsx',
  'issara-doctor/frontend/components/LiveTranscription.tsx',
  'issara-doctor/frontend/pages/DoctorDashboard.tsx',
  'issara-doctor/frontend/pages/GeminiAIStudio.tsx',
  'issara-patient/backend/services/postgresDataService.ts',
  'issara-patient/frontend/pages/MapPage.tsx',
  'issara-patient/frontend/App.tsx',
];

describe('defect register coverage guard (v1.7.48)', () => {
  it('DEFECT_REGISTER lists all 23 PDF defect IDs', () => {
    const register = fs.readFileSync(
      path.join(root, 'reports/defect-fix/DEFECT_REGISTER.md'),
      'utf8',
    );
    for (const id of DEFECT_IDS) {
      expect(register, `missing defect ${id}`).toMatch(new RegExp(String.raw`\| ${id} \|`));
    }
  });

  it('forbidden legacy strings are absent from active source', () => {
    for (const rel of SCAN_FILES) {
      const content = fs.readFileSync(path.join(root, rel), 'utf8');
      expect(content, rel).not.toMatch(/gemini-2\.5-flash/);
      expect(content, rel).not.toMatch(/flash-lite-lite/);
      expect(content, rel).not.toMatch(/onKeyPress/);
    }
    const pg = fs.readFileSync(
      path.join(root, 'issara-patient/backend/services/postgresDataService.ts'),
      'utf8',
    );
    expect(pg).not.toMatch(/\.substr\(/);
  });

  it('orphan map/MapPage.tsx is removed', () => {
    expect(
      fs.existsSync(path.join(root, 'issara-patient/frontend/pages/map/MapPage.tsx')),
    ).toBe(false);
  });

  it('livingWillCanonicalPath test references routed pages/LivingWillPage.tsx', () => {
    const canonicalTest = fs.readFileSync(
      path.join(root, 'tests/unit/patient-portal/livingWillCanonicalPath.regression.test.ts'),
      'utf8',
    );
    expect(canonicalTest).toMatch(/pages\/LivingWillPage\.tsx/);
  });

  it('livingWill input tests scan PDPA implementation file', () => {
    for (const file of ['livingWillInput.behavior.test.ts', 'livingWillInput.regression.test.ts']) {
      const content = fs.readFileSync(path.join(root, 'tests/unit/patient-portal', file), 'utf8');
      expect(content, file).toMatch(/pdpa\/LivingWillPage\.tsx/);
    }
  });
});
