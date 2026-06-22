#!/usr/bin/env node
/** Phase 2 — auth + cookie parity */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { npmStep, runSteps } from './lib/run-step.mjs';
import { runHeadedE2e } from './lib/run-headed-e2e.mjs';
import { runScreenshotGate } from './lib/run-screenshot-gate.mjs';
import { runLedgerRound } from './lib/run-ledger-round.mjs';
import { runPrePhaseSmoke } from './lib/run-pre-phase-smoke.mjs';
import { bailWithArchive } from './lib/archive-failure.mjs';
import { resetDatabaseBaseline } from '../docker/e2eDockerCommon.mjs';

const ROUND = 1;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const isWin = process.platform === 'win32';

if (!runPrePhaseSmoke()) bailWithArchive(ROUND, 'pre-phase-smoke');

const { pass: unitPass } = runSteps([npmStep('unit-auth', 'test:unit:auth', root)], { failFast: true });
if (!unitPass) bailWithArchive(ROUND, 'unit-auth');

const vitestAuth = spawnSync(
  'npx',
  ['vitest', 'run', 'doctor-portal/adminPoolAuth.test.ts'],
  { cwd: path.join(root, 'tests', 'unit'), shell: isWin, stdio: 'inherit' },
);
if (vitestAuth.status !== 0) bailWithArchive(ROUND, 'vitest-adminPoolAuth');

resetDatabaseBaseline();
if (!runHeadedE2e(['A-auth'], 'e2e-A-auth')) bailWithArchive(ROUND, 'e2e-A-auth');
if (!runScreenshotGate('group-A', 'screenshots-group-A')) bailWithArchive(ROUND, 'screenshots-group-A');
if (!runLedgerRound(ROUND)) bailWithArchive(ROUND, 'ledger-round');
process.exit(0);
