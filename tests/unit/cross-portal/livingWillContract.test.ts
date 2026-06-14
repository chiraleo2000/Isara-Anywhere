/**
 * @process Processes/Living_Will_Processes.md, Processes/Pages/Patient-Portal/11_Living_Will_Page.md
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

describe('Living will contract (LWL)', () => {
  it('LWL-01 — living will workflow test', () => {
    expect(fs.existsSync(path.join(root, 'tests/unit/patient-portal/livingWillWorkflow.test.ts'))).toBe(true);
  });

  it('LWL-02 — canonical path regression', () => {
    expect(fs.existsSync(path.join(root, 'tests/unit/patient-portal/livingWillCanonicalPath.regression.test.ts'))).toBe(true);
  });

  it('LWL-03 — living will API on pdpa/phr routes', () => {
    const pdpa = fs.readFileSync(path.join(root, 'Isara-patient-portal/server/routes/pdpa.ts'), 'utf8');
    expect(pdpa).toMatch(/living-will/);
  });

  it('LWL-04 — living will page component', () => {
    const page = path.join(root, 'Isara-patient-portal/src/pages/LivingWillPage.tsx');
    expect(fs.existsSync(page)).toBe(true);
  });

  it('LWL-05 — group-G e2e covers living will', () => {
    expect(fs.existsSync(path.join(root, 'tests/group-G-livingwill-pdpa.ui-test.ts'))).toBe(true);
  });
});
