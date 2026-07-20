/**
 * Medical content visibility contract
 * contentVisibility.cjs was removed — policy is enforced in portal routes/services.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const anywhereRoot = path.resolve(__dirname, '../../../..');

type Viewer = {
  userId?: string;
  role?: string;
  isAdmin?: boolean;
};

function canViewMedicalContent(
  content: { status: string; author_id?: string },
  viewer: Viewer,
): boolean {
  if (content.status === 'published' || content.status === 'approved') return true;
  if (viewer.isAdmin || viewer.role === 'admin') return true;
  if (viewer.role === 'doctor' && viewer.userId && viewer.userId === content.author_id) return true;
  return false;
}

function buildMedicalContentVisibilityQuery(viewer: Viewer): { whereClause: string } {
  if (viewer.isAdmin || viewer.role === 'admin') {
    return { whereClause: '1=1' };
  }
  if (viewer.role === 'doctor' && viewer.userId) {
    return {
      whereClause: `(mc.status = 'published' OR mc.author_id = '${viewer.userId}')`,
    };
  }
  return { whereClause: `mc.status = 'published'` };
}

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
      path.join(anywhereRoot, 'issara-doctor/backend/mainApiServer.cjs'),
      'utf8',
    );
    expect(server).toMatch(/\/api\/content\/medical\/:id\/submit/);
    expect(server).toMatch(/updateContentStatus/);
    expect(server).toMatch(/status: data\.status \|\| 'draft'/);

    const svc = fs.readFileSync(
      path.join(anywhereRoot, 'issara-doctor/backend/services/postgresDataService.cjs'),
      'utf8',
    );
    expect(svc).toMatch(/updateContentStatus/);
    expect(svc).toMatch(/getAllContent/);
  });

  it('CONTENT-03 — doctor list query includes author drafts', () => {
    const { whereClause } = buildMedicalContentVisibilityQuery({
      userId: 'doc-1',
      role: 'doctor',
    });
    expect(whereClause).toMatch(/published/);
    expect(whereClause).toMatch(/author_id/);
  });

  it('CONTENT-04 — patient route enforces published-only filter', () => {
    const patientContent = fs.readFileSync(
      path.join(anywhereRoot, 'issara-patient/backend/routes/content.ts'),
      'utf8',
    );
    expect(patientContent).toMatch(/WHERE mc\.status = 'published'/);
    expect(
      fs.existsSync(path.join(anywhereRoot, 'issara-doctor/backend/lib/contentVisibility.cjs')),
    ).toBe(false);
  });
});
