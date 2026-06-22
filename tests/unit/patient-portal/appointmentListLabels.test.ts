/**
 * Regression: AppointmentPages sort/filter i18n labels (W02 dateNewest crash).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appointmentPagesPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../Isara-patient-portal/frontend/pages/AppointmentPages.tsx',
);

const REQUIRED_LABEL_KEYS = [
  'myAppointments',
  'pending',
  'all',
  'confirmed',
  'completed',
  'dateNewest',
  'dateOldest',
  'confirmedRecentlyHint',
  'switchToConfirmed',
] as const;

function extractLabelsBlock(source: string): string {
  const match = source.match(/const labels = \{([\s\S]*?)\n  \};/);
  expect(match, 'labels object in AppointmentPages.tsx').toBeTruthy();
  return match![1];
}

function parseLabelKeys(block: string): string[] {
  return [...block.matchAll(/^\s+(\w+):/gm)].map((m) => m[1]);
}

describe('AppointmentPages — list i18n labels', () => {
  const source = fs.readFileSync(appointmentPagesPath, 'utf8');
  const block = extractLabelsBlock(source);
  const keys = parseLabelKeys(block);

  it('AL01 — required sort/filter label keys exist', () => {
    for (const key of REQUIRED_LABEL_KEYS) {
      expect(keys, `missing label key: ${key}`).toContain(key);
    }
  });

  it('AL02 — dateNewest and dateOldest have en + th strings', () => {
    expect(block).toMatch(/dateNewest:\s*\{\s*en:\s*'[^']+',\s*th:\s*'[^']+'\s*\}/);
    expect(block).toMatch(/dateOldest:\s*\{\s*en:\s*'[^']+',\s*th:\s*'[^']+'\s*\}/);
  });

  it('AL03 — dateNewest used in sort UI (not orphaned key)', () => {
    expect(source).toContain('labels.dateNewest[language]');
  });
});
