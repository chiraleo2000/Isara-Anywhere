import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const mapPagePath = path.resolve(
  __dirname,
  '../../../Isara-patient-portal/frontend/pages/MapPage.tsx',
);

describe('Map markers regression guard', () => {
  it('requests nearby facilities with lang and renders facility list cards', () => {
    const source = fs.readFileSync(mapPagePath, 'utf8');

    expect(source).toContain('/api/map/nearby?lat=${lat}&lng=${lng}&radius=${radiusKm}&lang=${lang}');
    expect(source).toContain('filtered.slice(0, 50).map((f) => (');
    expect(source).toContain('setSelectedId(f.id)');
  });
});
