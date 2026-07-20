/**
 * Patient portal content access policy tests.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = path.resolve(__dirname, '../../..');
const anywhereRoot = path.resolve(workspaceRoot, '..');
const contentRoutes = fs.readFileSync(
  path.join(anywhereRoot, 'issara-patient/backend/routes/content.ts'),
  'utf8',
);

describe('Patient content access policy', () => {
  it('allows only published medical content in GET /medical', () => {
    expect(contentRoutes).toMatch(/WHERE mc\.status = 'published'/);
    expect(contentRoutes).toMatch(/router\.get\('\/medical'/);
  });

  it('exposes clinical resource routes as published-only (not 403-blocked)', () => {
    expect(contentRoutes).toMatch(/router\.get\('\/clinical-resources', clinicalResourcesHandler\)/);
    expect(contentRoutes).toMatch(/router\.get\('\/clinical', clinicalResourcesHandler\)/);
    expect(contentRoutes).toMatch(/WHERE cr\.status = 'published'/);
    expect(contentRoutes).not.toMatch(/Clinical resources are not available to patients/);
  });

  it('tracks article views via POST /medical/:id/view', () => {
    expect(contentRoutes).toMatch(/router\.post\('\/medical\/:id\/view'/);
    expect(contentRoutes).toMatch(/view_count/);
  });

  it('search uses Thai/English column names', () => {
    expect(contentRoutes).toMatch(/title_thai/);
    expect(contentRoutes).toMatch(/title_english/);
    expect(contentRoutes).toMatch(/content_thai/);
  });
});
