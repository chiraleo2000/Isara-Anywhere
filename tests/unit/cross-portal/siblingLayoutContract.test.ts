/**
 * Sibling-layout path contract — ensures New-Isara-Anywhere folder names resolve.
 * Complements process/page contracts after Isara-* → issara-* rename.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = path.resolve(__dirname, '../../..');
const anywhereRoot = path.resolve(workspaceRoot, '..');

function exists(p: string) {
  return fs.existsSync(p);
}

describe('issara sibling layout contract', () => {
  it('SL-01 — portal folders exist beside workspace', () => {
    expect(exists(path.join(anywhereRoot, 'issara-patient'))).toBe(true);
    expect(exists(path.join(anywhereRoot, 'issara-doctor'))).toBe(true);
    expect(exists(path.join(anywhereRoot, 'issara-jitsi'))).toBe(true);
    expect(exists(workspaceRoot)).toBe(true);
  });

  it('SL-02 — workspace orchestration files present', () => {
    expect(exists(path.join(workspaceRoot, 'package.json'))).toBe(true);
    expect(exists(path.join(workspaceRoot, 'issara-workspace.code-workspace'))).toBe(true);
    expect(exists(path.join(workspaceRoot, 'playwright.config.ts'))).toBe(true);
    expect(exists(path.join(workspaceRoot, 'Processes', 'ISSARA_ANYWHERE_PROJECT_DESCRIPTION.md'))).toBe(true);
    expect(exists(path.join(workspaceRoot, 'Processes', 'BACKEND_AND_FRONTEND_OVERVIEW.md'))).toBe(true);
  });

  it('SL-03 — each portal has package.json + backend entry', () => {
    expect(exists(path.join(anywhereRoot, 'issara-patient', 'package.json'))).toBe(true);
    expect(exists(path.join(anywhereRoot, 'issara-patient', 'backend', 'index.ts'))).toBe(true);
    expect(exists(path.join(anywhereRoot, 'issara-doctor', 'package.json'))).toBe(true);
    expect(exists(path.join(anywhereRoot, 'issara-doctor', 'backend', 'mainApiServer.cjs'))).toBe(true);
    expect(exists(path.join(anywhereRoot, 'issara-jitsi', 'package.json'))).toBe(true);
    expect(exists(path.join(anywhereRoot, 'issara-jitsi', 'backend', 'index.js'))).toBe(true);
  });

  it('SL-04 — env sync script targets sibling portals', () => {
    const sync = fs.readFileSync(
      path.join(workspaceRoot, 'scripts', 'env', 'sync-portal-env.mjs'),
      'utf8',
    );
    expect(sync).toContain('../issara-patient/.env');
    expect(sync).toContain('../issara-doctor/.env');
    expect(sync).toContain('../issara-jitsi/.env');
  });
});
