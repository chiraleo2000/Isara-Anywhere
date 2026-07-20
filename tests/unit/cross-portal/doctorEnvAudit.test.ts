/**
 * @process Processes/ENV_AND_STACK_CHECK.md
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(__dirname, '../../..');

describe('Doctor env audit (ENV)', () => {
  it('ENV-01 — audit script exists', () => {
    expect(fs.existsSync(path.join(root, 'scripts/env/audit-doctor-portal-env.mjs'))).toBe(true);
  });

  it('ENV-02 — doctor .env exists', () => {
    expect(fs.existsSync(path.join(root, 'issara-doctor/.env'))).toBe(true);
  });

  it('ENV-03 — forbidden VITE_GOOGLE_CLIENT_SECRET absent from example', () => {
    const example = path.join(root, 'issara-doctor/.env.example');
    if (fs.existsSync(example)) {
      expect(fs.readFileSync(example, 'utf8')).not.toMatch(/VITE_GOOGLE_CLIENT_SECRET/);
    }
  });

  it('ENV-04 — audit script passes on trimmed doctor .env', () => {
    const r = spawnSync('node', ['scripts/env/audit-doctor-portal-env.mjs'], {
      cwd: root,
      encoding: 'utf8',
    });
    expect(r.status, r.stderr || r.stdout).toBe(0);
  });
});
