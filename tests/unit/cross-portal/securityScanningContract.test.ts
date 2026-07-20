/**
 * @process Processes/SECURITY_SCANNING.md — security gate scripts contract
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

describe('securityScanningContract', () => {
  it('SSC-01 — SECURITY_SCANNING.md exists and mentions scan layers', () => {
    const p = path.join(root, 'Processes/SECURITY_SCANNING.md');
    expect(fs.existsSync(p)).toBe(true);
    const doc = fs.readFileSync(p, 'utf8');
    for (const token of ['sonar:lint', 'security:cve-lite', 'audit:prod', 'security:app-scan']) {
      expect(doc, `missing scan layer: ${token}`).toContain(token);
    }
  });

  it('SSC-02 — package.json has security:scan, sonar:lint, test:security-hardening', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    expect(pkg.scripts['security:scan']).toBeTruthy();
    expect(pkg.scripts['sonar:lint']).toBeTruthy();
    expect(pkg.scripts['test:security-hardening']).toBeTruthy();
  });
});
