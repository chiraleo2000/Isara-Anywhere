/**
 * @process Processes/TWO_ROUND_CLOUD_TESTING.md — cloud gate npm scripts
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

describe('twoRoundCloudTestingContract', () => {
  it('TRC-01 — TWO_ROUND_CLOUD_TESTING.md exists', () => {
    expect(fs.existsSync(path.join(root, 'Processes/TWO_ROUND_CLOUD_TESTING.md'))).toBe(true);
  });

  it('TRC-02 — package.json has cloud deploy/hardening/smoke/gate0 scripts', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    expect(pkg.scripts['test:cloud:deploy-gate']).toBeTruthy();
    expect(pkg.scripts['test:cloud:hardening']).toBeTruthy();
    expect(pkg.scripts['cloud:smoke']).toBeTruthy();
    expect(pkg.scripts['verify:gate0']).toBeTruthy();
  });
});
