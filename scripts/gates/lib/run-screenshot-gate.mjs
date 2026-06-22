#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runStep } from './run-step.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');

/**
 * @param {string} groupArg e.g. "group-Q" or "group-A,group-D,group-Q"
 */
export function runScreenshotGate(groupArg, label) {
  return runStep({
    name: label ?? `screenshots-${groupArg}`,
    cmd: 'node',
    args: ['scripts/validate-screenshot-uniqueness.mjs', '--group', groupArg],
    cwd: root,
  });
}
