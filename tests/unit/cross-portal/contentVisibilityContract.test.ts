/**
 * Medical content visibility contract
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  canViewMedicalContent,
  buildMedicalContentVisibilityQuery,
} = require('../../../Isara-doctor-portal/backend/lib/contentVisibility.cjs');

const root = path.resolve(__dirname, '../../..');

describe('Content visibility contract', () => {
  it('CONTENT-01 — patient sees published only; author sees own draft', () => {
    const draft = { id: '1', status: 'draft', author_id: 'doc-a' };
    const published = { id: '2', status: 'published', author_id: 'doc-b' };

    expect(canViewMedicalContent(published, { role: 'anonymous' })).toBe(true);
    expect(canViewMedicalContent(draft, { role: 'anonymous' })).toBe(false);
    expect(canViewMedicalContent(draft, { userId: 'doc-a', role: 'doctor' })).toBe(true);
    expect(canViewMedicalContent(draft, { userId: 'doc-c', role: 'doctor' })).toBe(false);
    expect(canViewMedicalContent(draft, { role: 'admin', isAdmin: true })).toBe(true);
  });

  it('CONTENT-02 — submit endpoint and draft default exist', () => {
    const server = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/backend/mainApiServer.cjs'),
      'utf8',
    );
    expect(server).toMatch(/\/api\/content\/medical\/:id\/submit/);
    expect(server).toMatch(/submitContentForReview/);
    expect(server).toMatch(/status: 'draft'/);

    const svc = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/backend/services/postgresDataService.cjs'),
      'utf8',
    );
    expect(svc).toMatch(/submitContentForReview/);
    expect(svc).toMatch(/getContentForRole/);
  });

  it('CONTENT-03 — doctor list query includes author drafts', () => {
    const { whereClause } = buildMedicalContentVisibilityQuery({
      userId: 'doc-1',
      role: 'doctor',
    });
    expect(whereClause).toMatch(/published/);
    expect(whereClause).toMatch(/author_id/);
  });
});
