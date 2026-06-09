#!/usr/bin/env node

/**

 * Run patient Jitsi prejoin bypass E2E against local Docker stack.

 * Usage: npm run test:e2e:docker:patient-jitsi-prejoin

 */

import {

  composeBase,

  run,

  waitForPortalHealth,

  runPlaywrightInDocker,

} from './e2eDockerCommon.mjs';



run('docker', [...composeBase, 'up', '-d', '--remove-orphans']);



if (!waitForPortalHealth(undefined, { includeMeeting: true })) {

  console.error('[e2e-docker] Timed out waiting for health');

  process.exit(1);

}



runPlaywrightInDocker({

  projects: '--project=A-auth --project=J-patient-jitsi-prejoin',

});



console.log('\n[e2e-docker] Patient Jitsi prejoin bypass E2E passed.');

