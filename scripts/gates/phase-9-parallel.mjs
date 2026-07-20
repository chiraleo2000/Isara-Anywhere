#!/usr/bin/env node
/**
 * Phase 9 — parallel local gate (~45–90 min vs 2–4 h serial).
 * Sets GATE_PARALLEL=1 and PW_WORKERS=2 (override with PW_WORKERS=N).
 */
process.env.GATE_PARALLEL = '1';
const isStrict = process.env.GATE_STRICT === '1' || process.env.GATE_STRICT === 'true';
if (!process.env.PW_WORKERS?.trim()) {
  process.env.PW_WORKERS = isStrict ? '1' : '2';
}
process.env.PW_NO_CHROME = process.env.PW_NO_CHROME || '1';

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const isWin = process.platform === 'win32';

console.log('═══════════════════════════════════════════════════════════');
console.log(' Phase 9 PARALLEL — headed E2E with PW_WORKERS=' + process.env.PW_WORKERS);
console.log(' Chrome-safe: PW_NO_CHROME=1 (bundled Chromium / Firefox / WebKit)');
console.log('═══════════════════════════════════════════════════════════\n');

const r = spawnSync('node', ['scripts/gates/phase-9-full.mjs'], {
  cwd: root,
  stdio: 'inherit',
  shell: isWin,
  env: process.env,
});

process.exit(r.status ?? 1);
