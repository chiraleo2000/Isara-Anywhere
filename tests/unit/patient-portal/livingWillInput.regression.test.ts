import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const livingWillPath = path.resolve(
  __dirname,
  '../../../Isara-patient-portal/src/pages/pdpa/LivingWillPage.tsx',
);

describe('Living will input regression guard', () => {
  it('keeps numeric 10-digit phone constraints and DPR-aware signature canvas', () => {
    const source = fs.readFileSync(livingWillPath, 'utf8');

    expect(source).toContain('inputMode="numeric"');
    expect(source).toContain('maxLength={10}');
    expect(source).toContain('window.devicePixelRatio || 1');
  });
});
