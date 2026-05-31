import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const patientSettingsPath = path.resolve(
  __dirname,
  '../../../Isara-patient-portal/src/contexts/SettingsContext.tsx',
);

function extractTranslationBlock(source: string, key: string): string | null {
  const escapedKey = key.replaceAll('.', String.raw`\.`);
  const re = new RegExp(String.raw`'${escapedKey}':\s*\{[^}]+\}`);
  return re.exec(source)?.[0] ?? null;
}

describe('settings i18n behavior (G3)', () => {
  it('notifications.title has non-empty EN and TH strings', () => {
    const source = fs.readFileSync(patientSettingsPath, 'utf8');
    const block = extractTranslationBlock(source, 'notifications.title');
    expect(block).toBeTruthy();
    expect(block).toMatch(/en:\s*'Notifications'/);
    expect(block).toMatch(/th:\s*'การแจ้งเตือน'/);
  });

  it('auth.login placeholder keys exist in both languages', () => {
    const source = fs.readFileSync(patientSettingsPath, 'utf8');
    const block = extractTranslationBlock(source, 'auth.login');
    expect(block).toMatch(/en:/);
    expect(block).toMatch(/th:/);
  });
});
