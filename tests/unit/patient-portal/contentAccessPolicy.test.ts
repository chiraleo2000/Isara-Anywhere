/**
 * Patient portal content access policy tests.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');
const contentRoutes = fs.readFileSync(
  path.join(root, 'Isara-patient-portal/backend/routes/content.ts'),
  'utf8',
);

describe('Patient content access policy', () => {
  it('allows only published medical content in GET /medical', () => {
    expect(contentRoutes).toMatch(/WHERE mc\.status = 'published'/);
    expect(contentRoutes).toMatch(/router\.get\('\/medical'/);
  });

  it('blocks clinical resource routes for patients with 403', () => {
    expect(contentRoutes).toMatch(/router\.get\('\/clinical-resources', clinicalResourcesBlocked\)/);
    expect(contentRoutes).toMatch(/router\.get\('\/clinical', clinicalResourcesBlocked\)/);
    expect(contentRoutes).toMatch(/status\(403\)/);
    expect(contentRoutes).toMatch(/Clinical resources are not available to patients/);
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