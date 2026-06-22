#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runStep } from './run-step.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');

/**
 * @param {number|string} round
 * @param {{ maxP0?: number }} opts
 */
export function runLedgerRound(round, opts = {}) {
  const maxP0 = opts.maxP0 ?? 0;
  const ok = runStep({
    name: `ledger-round-${round}`,
    cmd: 'npm',
    args: ['run', 'ledger:local', '--', '--round', String(round)],
    cwd: root,
    env: { ...process.env, TEST_ENV: 'local' },
  });
  if (!ok) return false;

  const ledgerPath = path.join(root, 'reports', 'local-error-ledger', `round-${round}-latest.json`);
  if (!fs.existsSync(ledgerPath)) {
    console.warn(`Ledger file not found: ${ledgerPath} — skipping P0 assert`);
    return true;
  }
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const p0 = ledger.p0Count ?? ledger.summary?.p0 ?? ledger.failures?.filter((f) => f.priority === 'P0')?.length ?? 0;
  if (p0 > maxP0) {
    console.error(`❌ Ledger round ${round}: P0=${p0} (max ${maxP0})`);
    return false;
  }
  console.log(`✅ Ledger round ${round}: P0=${p0}`);
  return true;
}
