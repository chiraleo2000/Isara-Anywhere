#!/usr/bin/env node

/**

 * Run Jitsi role-permissions E2E (Chromium + Firefox) against local Docker stack.

 * Usage: npm run test:e2e:docker:jitsi-roles

 */

import {

  composeBase,

  run,

  waitForPortalHealth,

  runPlaywrightInDocker,

} from './e2eDockerCommon.mjs';



run('docker', [

  ...composeBase,

  'up', '-d', '--build', 'meeting-server', 'doctor-portal', 'patient-portal', '--remove-orphans',

]);



if (!waitForPortalHealth(undefined, { includeMeeting: true })) {

  console.error('[e2e-docker] Timed out waiting for health');

  process.exit(1);

}



runPlaywrightInDocker({

  projects: '--project=A-auth --project=R-jitsi-role-permissions',

});



console.log('\n[e2e-docker] Jitsi role permissions E2E passed (Chromium + Firefox).');

