#!/usr/bin/env node
/** Phase 7 — clinical workflow */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { npmStep, runSteps } from './lib/run-step.mjs';
import { runHeadedE2e } from './lib/run-headed-e2e.mjs';
import { runScreenshotGate } from './lib/run-screenshot-gate.mjs';
import { runLedgerRound } from './lib/run-ledger-round.mjs';
import { runPrePhaseSmoke } from './lib/run-pre-phase-smoke.mjs';
import { bailWithArchive } from './lib/archive-failure.mjs';
import { resetDatabaseBaseline } from '../docker/e2eDockerCommon.mjs';

const ROUND = 6;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

if (!runPrePhaseSmoke()) bailWithArchive(ROUND, 'pre-phase-smoke');

const { pass: unitPass } = runSteps([npmStep('unit-clinical', 'test:unit:clinical', root)], { failFast: true });
if (!unitPass) bailWithArchive(ROUND, 'unit-clinical');

for (const project of ['E-meeting-clinical', 'F-phr-health-records', 'L-lab-ordering']) {
  resetDatabaseBaseline();
  if (!runHeadedE2e([project], `e2e-${project}`)) {
    bailWithArchive(ROUND, `e2e-${project}`);
  }
}

if (!runScreenshotGate('group-E', 'screenshots-group-E')) bailWithArchive(ROUND, 'screenshots-group-E');
if (!runLedgerRound(ROUND)) bailWithArchive(ROUND, 'ledger-round');
process.exit(0);
