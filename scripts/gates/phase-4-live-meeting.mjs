#!/usr/bin/env node
/** Phase 4 — live meeting / Teams-like */
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

const ROUND = 3;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const isWin = process.platform === 'win32';

if (!runPrePhaseSmoke()) bailWithArchive(ROUND, 'pre-phase-smoke');

const { pass: unitPass } = runSteps(
  [
    npmStep('unit-meeting-acceptance', 'test:unit:meeting-acceptance', root),
    npmStep('meeting-contract', 'test:meeting-server:contract', root),
    npmStep('meeting-socket-integration', 'test:meeting-server:integration', root),
  ],
  { failFast: true },
);
if (!unitPass) bailWithArchive(ROUND, 'unit-wave');

const vitest = spawnSync(
  'npx',
  [
    'vitest', 'run',
    'doctor-portal/meetingRecordingUi.test.ts',
    'cross-portal/teamsLobbyContract.test.ts',
    'cross-portal/jitsiMeetingConfig.test.ts',
    'meeting-server/threePartyLobby.integration.test.ts',
  ],
  { cwd: path.join(root, 'tests', 'unit'), shell: isWin, stdio: 'inherit' },
);
if (vitest.status !== 0) bailWithArchive(ROUND, 'vitest-live-meeting');

const socketTest = spawnSync(
  'node',
  ['--test', 'tests/integration/meeting-socket-lobby.test.mjs'],
  { cwd: root, shell: isWin, stdio: 'inherit' },
);
if (socketTest.status !== 0) bailWithArchive(ROUND, 'socket-lobby-integration');

resetDatabaseBaseline();
if (!runHeadedE2e(['Q-meeting-lifecycle', 'R-jitsi-role-permissions'], 'e2e-Q-R')) {
  bailWithArchive(ROUND, 'e2e-Q-R');
}
if (!runScreenshotGate('group-Q', 'screenshots-group-Q')) bailWithArchive(ROUND, 'screenshots-group-Q');
if (!runLedgerRound(ROUND)) bailWithArchive(ROUND, 'ledger-round');
process.exit(0);
