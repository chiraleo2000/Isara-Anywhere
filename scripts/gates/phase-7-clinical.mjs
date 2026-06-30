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

resetDatabaseBaseline();
if (
  !runHeadedE2e(
    ['E-meeting-clinical', 'F-phr-health-records', 'L-lab-ordering'],
    'e2e-clinical-pipeline',
  )
) {
  bailWithArchive(ROUND, 'e2e-clinical-pipeline');
}

if (!runScreenshotGate('group-E', 'screenshots-group-E')) bailWithArchive(ROUND, 'screenshots-group-E');
if (!runScreenshotGate('group-F', 'screenshots-group-F')) bailWithArchive(ROUND, 'screenshots-group-F');
if (!runLedgerRound(ROUND)) bailWithArchive(ROUND, 'ledger-round');
process.exit(0);
