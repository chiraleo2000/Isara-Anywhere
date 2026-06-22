#!/usr/bin/env node
/** Phase 0 — structure: lint, typecheck, meeting-server contract */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { npmStep, runSteps } from './lib/run-step.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const { pass } = runSteps([
  npmStep('lint-portals-full', 'test:lint:portals:full', root),
  npmStep('meeting-server-contract', 'test:meeting-server:contract', root),
]);

process.exit(pass ? 0 : 1);
