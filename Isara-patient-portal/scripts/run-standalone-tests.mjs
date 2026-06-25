#!/usr/bin/env node
/**
 * Standalone test runner — invokes platform unit + smoke E2E against localhost:3005.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const platformRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const baseUrl = process.env.PATIENT_URL || 'http://localhost:3005';

const env = {
  ...process.env,
  STANDALONE_MODE: '1',
  PATIENT_URL: baseUrl,
  PW_HEADED: process.env.PW_HEADED || '0',
  PW_WORKERS: '1',
};

function run(cmd, args, label) {
  console.log(`\n--- ${label} ---\n`);
  const r = spawnSync(cmd, args, { cwd: platformRoot, stdio: 'inherit', shell: true, env });
  if (r.status !== 0) {
    console.error(`❌ ${label} failed`);
    process.exit(r.status ?? 1);
  }
}

run('npm', ['run', 'test:unit:auth'], 'unit:auth');
run(
  'npx',
  ['playwright', 'test', '--project=A-auth', '--project=B-patient-portal', '--project=G-livingwill-pdpa', '--workers=1'],
  'smoke E2E',
);
console.log('\n✅ patient test:standalone complete');
