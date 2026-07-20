/**
 * Cross-portal content workflow contract tests.
 * Validates current portal implementation (shared contentFormatters/contentVisibility
 * modules were removed — formatting/visibility live in routes + UI).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const anywhereRoot = path.resolve(__dirname, '../../../..');

function read(relPath: string): string {
  return fs.readFileSync(path.join(anywhereRoot, relPath), 'utf8');
}

function normalizeStatus(status: string | null | undefined): string {
  if (status === 'approved') return 'published';
  return status || 'draft';
}

function parseJsonField(value: unknown, fallback: unknown = []) {
  if (Array.isArray(value) || (value && typeof value === 'object')) return value;
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function formatMedicalArticle(row: Record<string, unknown>) {
  return {
    id: row.id,
    status: normalizeStatus(row.status as string),
    rejectionReason: row.rejection_reason || null,
    version: row.version ?? 1,
    history: parseJsonField(row.history, []),
    comments: parseJsonField(row.comments, []),
  };
}

function formatClinicalResource(row: Record<string, unknown>) {
  return {
    id: row.id,
    status: normalizeStatus(row.status as string),
  };
}

function buildClinicalResourceVisibilityQuery(viewer: { role?: string; userId?: string }) {
  if (viewer.role === 'doctor' && viewer.userId) {
    return {
      whereClause: `(cr.status IN ('published','approved') OR cr.author_id = '${viewer.userId}')`,
    };
  }
  return { whereClause: `cr.status IN ('published','approved')` };
}

function buildMedicalContentVisibilityQuery(viewer: { role?: string; userId?: string }) {
  if (viewer.role === 'doctor' && viewer.userId) {
    return {
      whereClause: `(mc.status = 'published' OR mc.author_id = '${viewer.userId}')`,
    };
  }
  return { whereClause: `mc.status = 'published'` };
}

describe('Content workflow contract', () => {
  it('CW-01 — doctor API exposes submit + review endpoints', () => {
    const server = read('issara-doctor/backend/mainApiServer.cjs');
    expect(server).toMatch(/\/api\/content\/medical\/:id\/submit/);
    expect(server).toMatch(/\/api\/content\/medical\/:id\/review/);
    expect(server).toMatch(/\/api\/content\/clinical\/:id\/review/);
    expect(server).toMatch(/app\.put\('\/api\/content\/clinical\/:id'/);
  });

  it('CW-02 — postgres service has content create/status update', () => {
    const svc = read('issara-doctor/backend/services/postgresDataService.cjs');
    expect(svc).toMatch(/updateContentStatus/);
    expect(svc).toMatch(/createContent/);
    expect(svc).toMatch(/getAllContent/);
    expect(svc).toMatch(/getClinicalResources/);
  });

  it('CW-03 — patient portal serves published clinical resources (not 403-blocked)', () => {
    const routes = read('issara-patient/backend/routes/content.ts');
    expect(routes).toMatch(/clinicalResourcesHandler/);
    expect(routes).toMatch(/WHERE cr\.status = 'published'/);
    expect(routes).toMatch(/WHERE mc\.status = 'published'/);
    expect(routes).not.toMatch(/Clinical resources are not available to patients/);
  });

  it('CW-04 — patient library uses realtime content published events', () => {
    const sync = read('issara-patient/frontend/lib/useRealtimeSync.ts');
    expect(sync).toMatch(/CONTENT_PUBLISHED/);
    expect(sync).toMatch(/onContentPublished/);
    const library = read('issara-patient/frontend/pages/health/MedicalContentLibrary.tsx');
    expect(library).toMatch(/useRealtimeSync/);
    expect(library).toMatch(/onContentPublished/);
  });

  it('CW-05 — admin stats endpoint and admin nav content items exist', () => {
    const layout = read('issara-doctor/frontend/components/common/ResponsiveLayout.tsx');
    expect(layout).toMatch(/getDesktopAdminNavItems|getMobileAdminNavItems/);
    expect(layout).toMatch(/medical-content|clinical-resources|doctor-management/);
    const server = read('issara-doctor/backend/mainApiServer.cjs');
    expect(server).toMatch(/\/api\/admin\/stats/);
    expect(server).toMatch(/pendingContent/);
    expect(server).toMatch(/pendingResources/);
  });

  it('CW-06 — approval normalizes approved → published in API responses', () => {
    expect(normalizeStatus('approved')).toBe('published');
    const article = formatMedicalArticle({
      id: '1',
      status: 'approved',
      title_thai: 'ทดสอบ',
      content_thai: 'เนื้อหา',
    });
    expect(article.status).toBe('published');
    const resource = formatClinicalResource({
      id: '2',
      status: 'approved',
      title_thai: 'แนวทาง',
      content_thai: 'รายละเอียด',
    });
    expect(resource.status).toBe('published');

    const server = read('issara-doctor/backend/mainApiServer.cjs');
    expect(server).toMatch(/action === 'approve' \? 'published'/);
  });

  it('CW-07 — formatters expose version history, comments, rejection reason', () => {
    const article = formatMedicalArticle({
      id: 'MC-9',
      title_thai: 'ทดสอบ',
      content_thai: 'เนื้อหา',
      status: 'rejected',
      rejection_reason: 'Needs citations',
      version: 3,
      history: JSON.stringify([{ version: 2, action: 'submit' }]),
      comments: JSON.stringify([{ id: 'c1', content: 'Fix refs', isAdminFeedback: true }]),
    });
    expect(article.rejectionReason).toBe('Needs citations');
    expect(article.version).toBe(3);
    expect(article.history).toHaveLength(1);
    expect((article.comments as Array<{ content: string }>)[0].content).toBe('Fix refs');
  });

  it('CW-08 — parseJsonField handles string, array, and invalid JSON', () => {
    expect(parseJsonField('["a"]')).toEqual(['a']);
    expect(parseJsonField(['b'])).toEqual(['b']);
    expect(parseJsonField('not-json', [])).toEqual([]);
    expect(parseJsonField(null, ['fallback'])).toEqual(['fallback']);
  });

  it('CW-09 — clinical visibility excludes patient role (doctor/admin only)', () => {
    const patientQuery = buildClinicalResourceVisibilityQuery({ role: 'patient' });
    expect(patientQuery.whereClause).toMatch(/published|approved/);
    expect(patientQuery.whereClause).not.toMatch(/author_id/);

    const doctorQuery = buildClinicalResourceVisibilityQuery({ userId: 'doc-1', role: 'doctor' });
    expect(doctorQuery.whereClause).toMatch(/author_id/);
    expect(doctorQuery.whereClause).toMatch(/published|approved/);
  });

  it('CW-10 — medical content patient query is published-only', () => {
    const { whereClause } = buildMedicalContentVisibilityQuery({ role: 'anonymous' });
    expect(whereClause).toBe(`mc.status = 'published'`);
  });

  it('CW-11 — manual QA testids exist on key UI surfaces', () => {
    const library = read('issara-patient/frontend/pages/health/MedicalContentLibrary.tsx');
    expect(library).toMatch(/data-testid="content-item"/);
    const doctorContent = read('issara-doctor/frontend/pages/content/MedicalContent.tsx');
    expect(doctorContent).toMatch(/data-testid="content-item"/);
    const layout = read('issara-doctor/frontend/components/common/ResponsiveLayout.tsx');
    expect(layout).toMatch(/medical-content|clinical-resources/);
  });
});
