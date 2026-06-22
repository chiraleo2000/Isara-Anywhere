#!/usr/bin/env node
/** Phase 6 — patient portal + secondary UI */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { npmStep, runSteps } from './lib/run-step.mjs';
import { runHeadedE2e } from './lib/run-headed-e2e.mjs';
import { runScreenshotGate } from './lib/run-screenshot-gate.mjs';
import { runLedgerRound } from './lib/run-ledger-round.mjs';
import { runPrePhaseSmoke } from './lib/run-pre-phase-smoke.mjs';
import { bailWithArchive } from './lib/archive-failure.mjs';
import { resetDatabaseBaseline } from '../docker/e2eDockerCommon.mjs';

const ROUND = 5;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

if (!runPrePhaseSmoke()) bailWithArchive(ROUND, 'pre-phase-smoke');

const { pass: unitPass } = runSteps([npmStep('unit-workflows', 'test:unit:workflows', root)], { failFast: true });
if (!unitPass) bailWithArchive(ROUND, 'unit-workflows');

for (const project of [
  'B-patient-portal',
  'G-livingwill-pdpa',
  'H-content-resources',
  'J-patient-jitsi-prejoin',
]) {
  resetDatabaseBaseline();
  if (!runHeadedE2e([project], `e2e-${project}`)) {
    bailWithArchive(ROUND, `e2e-${project}`);
  }
}

if (!runScreenshotGate('group-B', 'screenshots-group-B')) bailWithArchive(ROUND, 'screenshots-group-B');
if (!runLedgerRound(ROUND)) bailWithArchive(ROUND, 'ledger-round');
process.exit(0);
