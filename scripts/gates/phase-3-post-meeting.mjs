#!/usr/bin/env node
/** Phase 3 — post-meeting doctor visibility */
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

const ROUND = 2;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const isWin = process.platform === 'win32';

if (!runPrePhaseSmoke()) bailWithArchive(ROUND, 'pre-phase-smoke');

const { pass: unitPass } = runSteps(
  [
    npmStep('unit-meeting', 'test:unit:meeting', root),
    npmStep('process-contracts', 'test:unit:process-contracts', root),
    npmStep('post-meeting-pipeline', 'test:post-meeting-pipeline', root),
  ],
  { failFast: true },
);
if (!unitPass) bailWithArchive(ROUND, 'unit-wave');

const vitest = spawnSync(
  'npx',
  [
    'vitest', 'run',
    'doctor-portal/doctorDashboardPostMeeting.test.ts',
    'doctor-portal/meetingResultsPlayback.test.ts',
    'cross-portal/meetingBffProxyContract.test.ts',
    'cross-portal/postMeetingWorkflow.integration.test.ts',
    'doctor-portal/meetingResultsValidation.test.ts',
    'meeting-server/recordingRoundTrip.integration.test.ts',
  ],
  { cwd: path.join(root, 'tests', 'unit'), shell: isWin, stdio: 'inherit' },
);
if (vitest.status !== 0) bailWithArchive(ROUND, 'vitest-post-meeting');

resetDatabaseBaseline();
if (!runHeadedE2e(['Q-meeting-lifecycle'], 'e2e-Q-lifecycle')) {
  bailWithArchive(ROUND, 'e2e-Q-lifecycle');
}
resetDatabaseBaseline();
if (!runHeadedE2e(['Q2-post-meeting-doctor'], 'e2e-Q2-post-meeting')) {
  bailWithArchive(ROUND, 'e2e-Q2-post-meeting');
}
if (!runScreenshotGate('group-Q2', 'screenshots-group-Q2')) bailWithArchive(ROUND, 'screenshots-group-Q2');
if (!runLedgerRound(ROUND)) bailWithArchive(ROUND, 'ledger-round');
process.exit(0);
