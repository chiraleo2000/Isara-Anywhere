import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const libraryPath = path.resolve(
  __dirname,
  '../../../Isara-patient-portal/src/pages/MedicalContentLibrary.tsx',
);

describe('medical content thumbnail (P7)', () => {
  it('renders img when article.thumbnail is set', () => {
    const source = fs.readFileSync(libraryPath, 'utf8');
    expect(source).toMatch(/article\.thumbnail \?/);
    expect(source).toMatch(/<img[\s\S]*src=\{article\.thumbnail\}/);
    expect(source).toMatch(/onError/);
  });

  it('shows type icon fallback when thumbnail is absent', () => {
    const source = fs.readFileSync(libraryPath, 'utf8');
    expect(source).toMatch(/getTypeIcon\(article\.type\)/);
  });
});
