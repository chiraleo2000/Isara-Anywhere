import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const servicesPath = path.resolve(
  __dirname,
  '../../../issara-patient/frontend/lib/services.ts',
);

describe('notification markAllAsRead (P5)', () => {
  it('uses single PUT read-all endpoint', () => {
    const source = fs.readFileSync(servicesPath, 'utf8');
    const block = /markAllAsRead[\s\S]*?},/.exec(source)?.[0] ?? '';
    expect(block).toContain('/read-all');
    expect(block).not.toMatch(/for\s*\(/);
    expect(block).not.toMatch(/\.map\s*\(/);
  });
});
