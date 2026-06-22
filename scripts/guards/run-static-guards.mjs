#!/usr/bin/env node
/** Run static regression guards (Phase 8). */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSteps } from '../gates/lib/run-step.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const guardsDir = path.dirname(fileURLToPath(import.meta.url));

const { pass } = runSteps([
  { name: 'no-legacy-src', cmd: 'node', args: ['no-legacy-src.mjs'], cwd: guardsDir },
  { name: 'credentials-include-meeting', cmd: 'node', args: ['credentials-include-meeting.mjs'], cwd: guardsDir },
  { name: 'no-dev-testing-in-prod-env', cmd: 'node', args: ['no-dev-testing-in-prod-env.mjs'], cwd: guardsDir },
], { failFast: true });

process.exit(pass ? 0 : 1);
