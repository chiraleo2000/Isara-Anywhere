import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const appRoutesPath = path.resolve(
  __dirname,
  '../../../Isara-patient-portal/frontend/App.tsx',
);

describe('notifications route regression guard', () => {
  it('declares /notifications route to avoid redirect-to-home', () => {
    const source = fs.readFileSync(appRoutesPath, 'utf8');
    expect(source).toMatch(/path="notifications"/);
  });
});
