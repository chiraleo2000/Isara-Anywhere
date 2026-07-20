#!/usr/bin/env node
/** Phase 9 — full pre-deploy gate + screenshot audit + ledger final */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runStep } from './lib/run-step.mjs';
import { runScreenshotGate } from './lib/run-screenshot-gate.mjs';
import { runLedgerRound } from './lib/run-ledger-round.mjs';
import { runPrePhaseSmoke } from './lib/run-pre-phase-smoke.mjs';
import { bailWithArchive } from './lib/archive-failure.mjs';
import { isParallelGate, resolveGateWorkers } from './lib/resolve-gate-workers.mjs'; // NOSONAR S1128 — resolveGateWorkers used below

const ROUND = 9;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const isWin = process.platform === 'win32';
const gateWorkers = resolveGateWorkers();

if (!runPrePhaseSmoke()) bailWithArchive(ROUND, 'pre-phase-smoke');

if (isParallelGate()) {
  console.log(`\n⚡ Parallel gate — Playwright workers=${gateWorkers} (B/C/G/H/I/J ∥, D→Q→E→F serial via deps)\n`);
}

if (
  !runStep({
    name: 'pre-deploy-gate-core',
    cmd: 'node',
    args: ['scripts/run-local-pre-deploy-gate.mjs'],
    cwd: root,
    env: { ...process.env, PW_WORKERS: gateWorkers },
  })
) {
  bailWithArchive(ROUND, 'pre-deploy-gate-core');
}

/** Align with package.json test:screenshots:all */
if (
  !runScreenshotGate(
    'group-A,group-B,group-C,group-D,group-E,group-F,group-G,group-H,group-I,group-J,group-J-jitsi-prejoin,group-L,group-Q,group-Q2,group-R,group-S,group-defect',
    'screenshots-all',
  )
) {
  bailWithArchive(ROUND, 'screenshots-all');
}

const sync = spawnSync('npm', ['run', 'docs:evidence:local'], { cwd: root, shell: isWin, stdio: 'inherit' });
if (sync.status !== 0) {
  console.warn('docs:evidence:local skipped or failed (non-fatal if guides build unavailable)');
}

if (!runLedgerRound(ROUND)) bailWithArchive(ROUND, 'ledger-round');
console.log('\n✅ Phase 9 full gate complete');
process.exit(0);
