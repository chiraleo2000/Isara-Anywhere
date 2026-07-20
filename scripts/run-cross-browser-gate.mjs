#!/usr/bin/env node
/**
 * Cross-browser + PDPA + content gate — lint, unit workflows, W×2, D firefox.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const isWin = process.platform === 'win32';

const gateEnv = {
  ...process.env,
  PW_SKIP_LIVE_GEMINI: '1',
  PW_HEADED: '1',
  PW_WORKERS: '1',
  PATIENT_URL: process.env.PATIENT_URL || 'http://127.0.0.1:3005',
  DOCTOR_URL: process.env.DOCTOR_URL || 'http://127.0.0.1:3010',
  MEETING_URL: process.env.MEETING_URL || 'http://127.0.0.1:3020',
  DEMO_AUTO_LOGIN: '1',
};

const steps = [
  { name: 'lint-portals', cmd: 'npm', args: ['run', 'test:lint:portals:full'] },
  { name: 'sonar-lint', cmd: 'npm', args: ['run', 'sonar:lint'] },
  { name: 'guards-static', cmd: 'npm', args: ['run', 'test:guards:static'] },
  { name: 'unit-workflows', cmd: 'npm', args: ['run', 'test:unit:workflows'] },
  {
    name: 'browser-core-firefox',
    cmd: 'npx',
    args: ['playwright', 'test', '--headed', '--project=W-core-firefox', '--workers=1'],
  },
  {
    name: 'browser-core-webkit',
    cmd: 'npx',
    args: ['playwright', 'test', '--headed', '--project=W-core-webkit', '--workers=1'],
  },
  {
    name: 'browser-appointments-firefox',
    cmd: 'npx',
    args: ['playwright', 'test', '--headed', '--project=D-appointments', '--workers=1'],
  },
];

let failed = false;
for (const step of steps) {
  console.log(`\n═══ [${step.name}] ═══`);
  const useGate = step.name.startsWith('browser-');
  const r = spawnSync(step.cmd, step.args, {
    cwd: root,
    stdio: 'inherit',
    shell: isWin,
    env: useGate ? gateEnv : process.env,
  });
  if (r.status !== 0) {
    failed = true;
    console.error(`❌ Failed: ${step.name}`);
    break;
  }
  console.log(`✅ ${step.name}`);
}

process.exit(failed ? 1 : 0);
