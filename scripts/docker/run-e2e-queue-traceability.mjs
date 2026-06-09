#!/usr/bin/env node

/**

 * Run queue accept traceability Playwright E2E against local Docker stack.

 * Usage: npm run test:e2e:docker:queue-traceability

 */

import {

  composeBase,

  run,

  waitForPortalHealth,

  runPlaywrightInDocker,

} from './e2eDockerCommon.mjs';



console.log('[e2e-docker] Step 1/3 — ensure Docker stack is up …');

run('docker', [...composeBase, 'up', '-d', '--remove-orphans']);



console.log('[e2e-docker] Step 2/3 — wait for portal health …');

if (!waitForPortalHealth()) {

  console.error('[e2e-docker] Timed out waiting for portal /api/health');

  process.exit(1);

}



console.log('[e2e-docker] Step 3/3 — Playwright in browser container (headless) …');

runPlaywrightInDocker({

  projects: '--project=A-auth --project=D-queue-traceability',

});



console.log('\n[e2e-docker] Queue accept traceability E2E passed.');

