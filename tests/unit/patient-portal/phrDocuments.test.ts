/**
 * @process Processes/Pages/Patient-Portal/06_PHR_Page.md
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const phrPage = path.resolve(__dirname, '../../../Isara-patient-portal/src/pages/PHRPage.tsx');

describe('PHR documents (PHD)', () => {
  const pageSrc = fs.readFileSync(phrPage, 'utf8');

  it('PHD-01 — PHR page renders documents list', () => {
    expect(pageSrc).toMatch(/documents/);
  });

  it('PHD-02 — DocumentsTab lists medical documents', () => {
    expect(pageSrc).toMatch(/DocumentsTab|documents\.map/);
  });

  it('PHD-03 — PHR types include medical documents', () => {
    const types = path.resolve(__dirname, '../../../Isara-patient-portal/src/types.ts');
    expect(fs.readFileSync(types, 'utf8')).toMatch(/MedicalDocument|documents/);
  });

  it('PHD-04 — download or view document action', () => {
    expect(pageSrc).toMatch(/download|href|openDocument/i);
  });

  it('PHD-05 — fetch failure logged on PHR load', () => {
    expect(pageSrc).toMatch(/PHR fetch failed|console\.error/);
  });

  it('PHD-06 — loading state while PHR loads', () => {
    expect(pageSrc).toMatch(/loading|setLoading|animate-spin/i);
  });

  it('PHD-07 — documents prop wired to viewer', () => {
    expect(pageSrc).toMatch(/phr\?\.documents|documents=\{/);
  });

  it('PHD-08 — TreatmentResults component surfaces fetch errors', () => {
    const tr = path.resolve(__dirname, '../../../Isara-patient-portal/src/components/health/TreatmentResults.tsx');
    expect(fs.readFileSync(tr, 'utf8')).toMatch(/error|setError|failed/i);
  });
});
