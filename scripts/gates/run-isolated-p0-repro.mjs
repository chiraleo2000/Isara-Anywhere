#!/usr/bin/env node
/**
 * Round 1 P0 isolated repro — run before full phase gates when fixture pollution is suspected.
 * See LOCAL_E2E_ERROR_LEDGER_ROUND1.md (D3/C2/I1/JROLE02).
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resetDatabaseBaseline } from '../docker/e2eDockerCommon.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const isWin = process.platform === 'win32';

const ISOLATED_CASES = [
  { label: 'D3', project: 'D-appointments', grep: 'D3' },
  { label: 'C2', project: 'C-doctor-portal', grep: 'C2' },
  { label: 'I1', project: 'I-admin-notifications', grep: 'I1' },
  { label: 'JROLE02', project: 'R-jitsi-role-permissions', grep: 'JROLE02' },
];

const baseEnv = {
  ...process.env,
  PW_HEADED: '1',
  PW_WORKERS: '1',
  PW_SKIP_LIVE_GEMINI: '1',
  E2E_PRESERVE_WORKFLOW: '1',
  PATIENT_URL: 'http://127.0.0.1:3005',
  DOCTOR_URL: 'http://127.0.0.1:3010',
  MEETING_URL: 'http://127.0.0.1:3020',
};

console.log('\n═══ [isolated-round1-p0] DB baseline reset ═══');
resetDatabaseBaseline();

let failed = 0;
for (const { label, project, grep } of ISOLATED_CASES) {
  console.log(`\n═══ [isolated-round1-p0] ${label} (${project} --grep ${grep}) ═══`);
  resetDatabaseBaseline();
  const r = spawnSync(
    'npx',
    ['playwright', 'test', '--headed', `--project=${project}`, '--grep', grep, '--workers=1'],
    { cwd: root, stdio: 'inherit', shell: isWin, env: baseEnv },
  );
  if (r.status !== 0) {
    console.error(`❌ ${label} failed in isolation`);
    failed += 1;
  } else {
    console.log(`✅ ${label} passed in isolation`);
  }
}

if (failed) {
  console.error(`\n❌ ${failed}/${ISOLATED_CASES.length} isolated P0 repro(s) failed`);
  process.exit(1);
}

console.log(`\n✅ All ${ISOLATED_CASES.length} Round 1 P0 cases passed in isolation`);
process.exit(0);
