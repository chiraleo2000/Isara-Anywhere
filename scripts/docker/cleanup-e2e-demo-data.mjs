#!/usr/bin/env node
/**
 * Purge E2E test pollution from local Docker Postgres and ephemeral Playwright artifacts.
 * Keeps seed users (PATIENT-DEMO, DOC-TEST-001, ADMIN-TEST-001, etc.) via cleanup + re-seed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  repoRoot,
  waitForPostgresReady,
  resetDatabaseBaseline,
} from './e2eDockerCommon.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function removeIfExists(target, label) {
  if (!fs.existsSync(target)) return;
  fs.rmSync(target, { recursive: true, force: true });
  console.log(`[cleanup] Removed ${label}`);
}

console.log('[cleanup] Local Docker E2E demo-data cleanup…');

if (!waitForPostgresReady()) {
  console.error('[cleanup] izara-postgres not ready — start stack: docker compose --env-file .env.docker up -d');
  process.exit(1);
}

resetDatabaseBaseline();

const workflowState = path.join(repoRoot, 'tests', 'e2e', '.workflow-state.json');
if (fs.existsSync(workflowState)) {
  fs.unlinkSync(workflowState);
  console.log('[cleanup] Removed tests/e2e/.workflow-state.json');
}

const testResults = path.join(repoRoot, 'test-results');
removeIfExists(testResults, 'test-results/');

const authStates = path.join(repoRoot, 'tests', 'e2e', '.auth');
removeIfExists(authStates, 'tests/e2e/.auth/');

console.log('[cleanup] Done — baseline seed restored, E2E artifacts cleared.');
