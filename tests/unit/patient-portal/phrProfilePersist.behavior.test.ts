import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const profilePagePath = path.resolve(
  __dirname,
  '../../../Isara-patient-portal/src/pages/ProfilePage.tsx',
);
const phrRoutePath = path.resolve(
  __dirname,
  '../../../Isara-patient-portal/server/routes/phr.ts',
);

describe('PHR profile persist (P6)', () => {
  it('ProfilePage saves via phr profile API path', () => {
    const source = fs.readFileSync(profilePagePath, 'utf8');
    expect(source).toMatch(/\/api\/phr\/profile\//);
  });

  it('phr route exposes profile PUT handler', () => {
    const source = fs.readFileSync(phrRoutePath, 'utf8');
    expect(source).toMatch(/router\.put\('\/profile\/:id'/);
  });
});
