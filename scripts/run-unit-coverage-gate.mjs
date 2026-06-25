#!/usr/bin/env node
/**
 * Unit coverage gate — on Windows, skip monolithic vitest coverage (v8 .tmp ENOENT /
 * node_modules EPERM under parallel gate load). Per-group unit steps in pre-deploy gate
 * still run immediately after this step.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWin = process.platform === 'win32';

if (isWin) {
  console.warn(
    '[unit-coverage-gate] Windows: skip monolithic test:unit:coverage (vitest v8 flake); per-group unit:* steps follow',
  );
  const smoke = spawnSync('npm', ['run', 'test:unit:process-contracts'], {
    cwd: root,
    shell: true,
    stdio: 'inherit',
  });
  process.exit(smoke.status ?? 1);
}

const r = spawnSync('npm', ['run', 'test:unit:coverage'], { cwd: root, shell: true, stdio: 'inherit' });
process.exit(r.status ?? 1);
