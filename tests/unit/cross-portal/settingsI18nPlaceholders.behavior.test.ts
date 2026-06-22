import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const TARGET_PAGES = [
  '../../../Isara-patient-portal/frontend/pages/ProfilePage.tsx',
  '../../../Isara-patient-portal/frontend/pages/NotificationsPage.tsx',
  '../../../Isara-patient-portal/frontend/pages/health/AIDoctorPage.tsx',
];

/** Hard-coded English placeholder attributes that should use t() (G3). */
const FORBIDDEN_PLACEHOLDERS = [
  'placeholder="Search',
  'placeholder="Enter your',
  'placeholder="Type your message',
];

describe('settings i18n placeholders behavior (G3)', () => {
  it('target pages do not use hard-coded English placeholder attributes', () => {
    for (const rel of TARGET_PAGES) {
      const source = fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
      for (const forbidden of FORBIDDEN_PLACEHOLDERS) {
        expect(source, `${rel} should not contain ${forbidden}`).not.toContain(forbidden);
      }
    }
  });

  it('SettingsContext defines placeholder translation keys for auth and profile', () => {
    const settingsPath = path.resolve(
      __dirname,
      '../../../Isara-patient-portal/frontend/contexts/SettingsContext.tsx',
    );
    const source = fs.readFileSync(settingsPath, 'utf8');
    expect(source).toMatch(/'auth\.login'/);
    expect(source).toMatch(/'profile\./);
    expect(source).toMatch(/en:/);
    expect(source).toMatch(/th:/);
  });
});
