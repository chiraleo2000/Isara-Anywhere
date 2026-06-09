#!/usr/bin/env node
/**
 * Run Group D + Q meeting lifecycle E2E against local Docker stack.
 * Usage: npm run test:e2e:docker:meeting-lifecycle
 */
import {
  composeBase,
  run,
  resetDatabaseBaseline,
  waitForPortalHealth,
  waitForPostgresReady,
  runPlaywrightInDocker,
} from './e2eDockerCommon.mjs';

console.log('[e2e-docker] Step 1 — fresh stack with clean database volumes…');
run('docker', [...composeBase, 'down', '-v', '--remove-orphans']);

console.log('[e2e-docker] Step 2 — build and start postgres + portals + meeting-server…');
run('docker', [
  ...composeBase,
  'up', '-d', '--build', 'postgres', 'meeting-server', 'doctor-portal', 'patient-portal', '--remove-orphans',
]);

if (!waitForPostgresReady()) {
  console.error('[e2e-docker] Timed out waiting for postgres');
  process.exit(1);
}

if (!waitForPortalHealth(undefined, { includeMeeting: true })) {
  console.error('[e2e-docker] Timed out waiting for portal health');
  process.exit(1);
}

resetDatabaseBaseline();

runPlaywrightInDocker({
  projects: '--project=D-appointments --project=Q-meeting-lifecycle',
});

console.log('\n[e2e-docker] Meeting lifecycle E2E passed (Group D + Q).');
