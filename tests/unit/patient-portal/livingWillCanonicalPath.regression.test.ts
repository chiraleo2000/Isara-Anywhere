import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');
const appPath = path.join(root, 'Isara-patient-portal/src/App.tsx');
const canonicalPath = path.join(root, 'Isara-patient-portal/src/pages/LivingWillPage.tsx');
const implPath = path.join(root, 'Isara-patient-portal/src/pages/pdpa/LivingWillPage.tsx');

describe('living will canonical path (P11–P12, G2)', () => {
  it('App.tsx routes living-will to pages/LivingWillPage.tsx', () => {
    const app = fs.readFileSync(appPath, 'utf8');
    expect(app).toMatch(/from ['"]\.\/pages\/LivingWillPage['"]/);
    expect(app).toMatch(/path="living-will"/);
  });

  it('pages/LivingWillPage.tsx re-exports the PDPA implementation', () => {
    const canonical = fs.readFileSync(canonicalPath, 'utf8');
    expect(canonical).toMatch(/from ['"]\.\/pdpa\/LivingWillPage['"]/);
    expect(fs.existsSync(implPath)).toBe(true);
  });

  it('PDPA implementation has Sonar-safe Language typing (no redundant as LangKey)', () => {
    const impl = fs.readFileSync(implPath, 'utf8');
    expect(impl).toMatch(/type LangKey = Language/);
    expect(impl).not.toMatch(/as LangKey/);
    expect(impl).not.toMatch(/canvasRef as React\.RefObject/);
  });
});
