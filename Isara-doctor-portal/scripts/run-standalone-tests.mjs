#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const platformRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const baseUrl = process.env.DOCTOR_URL || 'http://localhost:3010';

const env = {
  ...process.env,
  STANDALONE_MODE: '1',
  DOCTOR_URL: baseUrl,
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
run('npm', ['run', 'test:unit:appointments'], 'unit:appointments');
run(
  'npx',
  ['playwright', 'test', '--project=A-auth', '--project=C-doctor-portal', '--project=D-appointments', '--workers=1'],
  'smoke E2E',
);
console.log('\n✅ doctor test:standalone complete');
