#!/usr/bin/env node
/** Phase 8 — regression + quality */
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { npmStep, runSteps } from './lib/run-step.mjs';
import { runHeadedE2e } from './lib/run-headed-e2e.mjs';
import { runScreenshotGate } from './lib/run-screenshot-gate.mjs';
import { runLedgerRound } from './lib/run-ledger-round.mjs';
import { runPrePhaseSmoke } from './lib/run-pre-phase-smoke.mjs';
import { bailWithArchive } from './lib/archive-failure.mjs';
import { resetDatabaseBaseline } from '../docker/e2eDockerCommon.mjs';

const ROUND = 7;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

if (!runPrePhaseSmoke()) bailWithArchive(ROUND, 'pre-phase-smoke');

for (const project of ['Defect-regression', 'K-accessibility', 'S-phone-sm']) {
  resetDatabaseBaseline();
  if (!runHeadedE2e([project], `e2e-${project}`)) {
    bailWithArchive(ROUND, `e2e-${project}`);
  }
}

if (!runScreenshotGate('group-S', 'screenshots-group-S')) bailWithArchive(ROUND, 'screenshots-group-S');
if (!runScreenshotGate('group-defect', 'screenshots-group-defect')) {
  bailWithArchive(ROUND, 'screenshots-group-defect');
}

const { pass } = runSteps(
  [
    npmStep('lint-portals-full', 'test:lint:portals:full', root),
    npmStep('static-guards', 'test:guards:static', root),
    npmStep('process-audit', 'test:audit:process', root),
    npmStep('gate0-local', 'verify:gate0:local', root),
  ],
  { failFast: true },
);
if (!pass) bailWithArchive(ROUND, 'quality-gates');

if (!runLedgerRound(ROUND)) bailWithArchive(ROUND, 'ledger-round');

const agg = spawnSync('node', ['scripts/aggregate-ux-ui-gate.mjs'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (agg.status !== 0) {
  console.warn('⚠️ aggregate-ux-ui-gate reported incomplete evidence (non-fatal after phase 8 E2E)');
}

process.exit(0);
