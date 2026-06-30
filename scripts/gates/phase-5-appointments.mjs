#!/usr/bin/env node
/** Phase 5 — appointments + admin */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { npmStep, runSteps } from './lib/run-step.mjs';
import { runHeadedE2e } from './lib/run-headed-e2e.mjs';
import { runScreenshotGate } from './lib/run-screenshot-gate.mjs';
import { runLedgerRound } from './lib/run-ledger-round.mjs';
import { runPrePhaseSmoke } from './lib/run-pre-phase-smoke.mjs';
import { bailWithArchive } from './lib/archive-failure.mjs';
import { resetDatabaseBaseline } from '../docker/e2eDockerCommon.mjs';

const ROUND = 4;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

if (!runPrePhaseSmoke()) bailWithArchive(ROUND, 'pre-phase-smoke');

const { pass: unitPass } = runSteps(
  [
    npmStep('unit-appointments', 'test:unit:appointments', root),
    npmStep('process-contracts', 'test:unit:process-contracts', root),
  ],
  { failFast: true },
);
if (!unitPass) bailWithArchive(ROUND, 'unit-wave');

resetDatabaseBaseline();
if (
  !runHeadedE2e(
    ['D-appointments', 'D-queue-traceability', 'D-doctor-host'],
    'e2e-D-pipeline',
  )
) {
  bailWithArchive(ROUND, 'e2e-D-pipeline');
}

for (const project of ['C-doctor-portal', 'I-admin-notifications']) {
  resetDatabaseBaseline();
  if (!runHeadedE2e([project], `e2e-${project}`)) {
    bailWithArchive(ROUND, `e2e-${project}`);
  }
}

if (!runScreenshotGate('group-D', 'screenshots-group-D')) bailWithArchive(ROUND, 'screenshots-group-D');
if (!runScreenshotGate('group-C', 'screenshots-group-C')) bailWithArchive(ROUND, 'screenshots-group-C');
if (!runScreenshotGate('group-I', 'screenshots-group-I')) bailWithArchive(ROUND, 'screenshots-group-I');
if (!runLedgerRound(ROUND)) bailWithArchive(ROUND, 'ledger-round');
process.exit(0);
