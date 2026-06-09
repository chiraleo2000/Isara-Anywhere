#!/usr/bin/env node

/**

 * Run Group W core workflow E2E across Chromium, Firefox, and WebKit inside Docker.

 * Usage: npm run test:e2e:docker:core-multibrowser

 */

import {

  composeBase,

  run,

  resetDatabaseBaseline,

  waitForPortalHealth,

  waitForPostgresReady,

  runPlaywrightInDocker,

} from './e2eDockerCommon.mjs';



const CORE_BROWSERS = ['chromium', 'firefox', 'webkit'];



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



runPlaywrightInDocker({ projects: '--project=A-auth' });



for (const browser of CORE_BROWSERS) {

  console.log(`\n[e2e-docker] Group W — ${browser}\n`);

  resetDatabaseBaseline();

  runPlaywrightInDocker({

    projects: `--project=W-core-${browser}`,

    extraEnv: { PW_CORE_BROWSER: browser },

  });

}



console.log('\n[e2e-docker] Core multi-browser E2E passed (Chromium + Firefox + WebKit).');

console.log('[e2e-docker] Success screenshots: tests/output/screenshots/');

