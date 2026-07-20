/**
 * Regression: after frontend/ migration, Tailwind must scan frontend/** not legacy src/**.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const anywhereRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

function readTailwindContent(portal: 'doctor' | 'patient'): string {
  const file = path.join(anywhereRoot, `issara-${portal}`, 'tailwind.config.js');
  return readFileSync(file, 'utf8');
}

describe('Tailwind content paths (frontend migration)', () => {
  it.each(['doctor', 'patient'] as const)('%s portal scans frontend/** not src/**', (portal) => {
    const source = readTailwindContent(portal);
    expect(source).toMatch(/['"]\.\/frontend\/\*\*\/\*\.\{js,ts,jsx,tsx\}['"]/);
    expect(source).not.toMatch(/['"]\.\/src\/\*\*\/\*\.\{js,ts,jsx,tsx\}['"]/);
  });
});
