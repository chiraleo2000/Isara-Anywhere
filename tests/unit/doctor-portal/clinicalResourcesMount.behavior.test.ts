import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const clinicalPath = path.resolve(
  __dirname,
  '../../../issara-doctor/frontend/pages/content/ClinicalResources.tsx',
);

describe('clinical resources mount (D7–D8)', () => {
  it('exports default ClinicalResources component', () => {
    const source = fs.readFileSync(clinicalPath, 'utf8');
    expect(source).toMatch(/export const ClinicalResources/);
    expect(source).toMatch(/export default ClinicalResources/);
  });

  it('create flow POSTs to /api/content/clinical', () => {
    const source = fs.readFileSync(clinicalPath, 'utf8');
    expect(source).toContain('/api/content/clinical');
    expect(source).toMatch(/method:\s*'POST'/);
  });

  it('loads list from GET /api/content/clinical', () => {
    const source = fs.readFileSync(clinicalPath, 'utf8');
    expect(source).toMatch(/\/api\/content\/clinical\?/);
  });
});
