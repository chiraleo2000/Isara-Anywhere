import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../../..');
const CANONICAL_MODEL = 'gemini-3.1-flash-lite';

const KEY_FILES = [
  'issara-doctor/frontend/services/geminiClinicalService.ts',
  'issara-doctor/frontend/services/config.ts',
  'issara-doctor/backend/mainApiServer.cjs',
  'issara-patient/backend/routes/ai.ts',
  'issara-patient/backend/routes/video-meeting-proxy.ts',
  'issara-jitsi/backend/index.js',
  '.env.example',
  'issara-doctor/.env.example',
  'issara-patient/.env.example',
];

const FORBIDDEN = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'flash-lite-lite'];

describe('Gemini 3.1 model config regression', () => {
  it('uses canonical gemini-3.1-flash-lite default in key services', () => {
    const clinical = fs.readFileSync(
      path.join(ROOT, 'issara-doctor/frontend/services/geminiClinicalService.ts'),
      'utf8',
    );
    const mainApi = fs.readFileSync(
      path.join(ROOT, 'issara-doctor/backend/mainApiServer.cjs'),
      'utf8',
    );

    expect(clinical).toContain(`'${CANONICAL_MODEL}'`);
    expect(mainApi).toContain(`'${CANONICAL_MODEL}'`);
  });

  it('status endpoint documents configured and model fields', () => {
    const mainApi = fs.readFileSync(
      path.join(ROOT, 'issara-doctor/backend/mainApiServer.cjs'),
      'utf8',
    );
    expect(mainApi).toMatch(/res\.json\(\{\s*configured,/);
    expect(mainApi).toContain('model:');
  });

  KEY_FILES.forEach((relPath) => {
    it(`forbids legacy model strings in ${relPath}`, () => {
      const fullPath = path.join(ROOT, relPath);
      expect(fs.existsSync(fullPath), `${relPath} should exist`).toBe(true);
      const source = fs.readFileSync(fullPath, 'utf8');
      for (const forbidden of FORBIDDEN) {
        expect(source).not.toContain(forbidden);
      }
    });
  });
});
