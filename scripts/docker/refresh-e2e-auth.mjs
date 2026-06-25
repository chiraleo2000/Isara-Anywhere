#!/usr/bin/env node
/** Re-login E2E users — run after resetDatabaseBaseline (sessions wiped). */
import { refreshE2eAuthAfterDbReset } from './e2eDockerCommon.mjs';

await refreshE2eAuthAfterDbReset();
