import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const livingWillPath = path.resolve(
  __dirname,
  '../../../Isara-patient-portal/src/pages/pdpa/LivingWillPage.tsx',
);

describe('living will input behavior (P11–P12)', () => {
  it('phone field limits length and uses tel pattern', () => {
    const source = fs.readFileSync(livingWillPath, 'utf8');
    expect(source).toMatch(/maxLength=\{10\}/);
    expect(source).toMatch(/inputMode=["']numeric["']/);
    expect(source).toMatch(/pattern=/);
  });

  it('signature canvas uses device pixel ratio scaling', () => {
    const source = fs.readFileSync(livingWillPath, 'utf8');
    expect(source).toMatch(/devicePixelRatio|setupSignatureCanvas/);
  });
});
