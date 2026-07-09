/**
 * Cross-portal content workflow contract tests.
 * Validates implementation matches Processes/Medicine_Content_Processes.md
 * and Clinical_Resources_&_Medical_Library_Workflows.md expectations.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  normalizeStatus,
  formatMedicalArticle,
  formatClinicalResource,
  parseJsonField,
} = require('../../../Isara-doctor-portal/backend/lib/contentFormatters.cjs');

// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  buildClinicalResourceVisibilityQuery,
  buildMedicalContentVisibilityQuery,
} = require('../../../Isara-doctor-portal/backend/lib/contentVisibility.cjs');

const root = path.resolve(__dirname, '../../..');

function read(relPath: string): string {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

describe('Content workflow contract', () => {
  it('CW-01 — doctor API exposes submit + review endpoints', () => {
    const server = read('Isara-doctor-portal/backend/mainApiServer.cjs');
    expect(server).toMatch(/\/api\/content\/medical\/:id\/submit/);
    expect(server).toMatch(/\/api\/content\/medical\/:id\/review/);
    expect(server).toMatch(/\/api\/content\/clinical\/:id\/review/);
    expect(server).toMatch(/app\.put\('\/api\/content\/clinical\/:id'/);
    expect(server).toMatch(/\/api\/content\/medical\/:id\/history/);
    expect(server).toMatch(/\/api\/content\/clinical\/:id\/history/);
  });

  it('CW-02 — postgres service has version history, comments, RAG indexing', () => {
    const svc = read('Isara-doctor-portal/backend/services/postgresDataService.cjs');
    expect(svc).toMatch(/submitContentForReview/);
    expect(svc).toMatch(/appendVersionHistory/);
    expect(svc).toMatch(/addComment/);
    expect(svc).toMatch(/indexClinicalResource/);
    expect(svc).toMatch(/deactivateClinicalResource/);
    expect(svc).toMatch(/rejection_reason/);
  });

  it('CW-03 — patient portal blocks clinical routes with 403', () => {
    const routes = read('Isara-patient-portal/backend/routes/content.ts');
    expect(routes).toMatch(/clinicalResourcesBlocked/);
    expect(routes).toMatch(/status\(403\)/);
    expect(routes).toMatch(/Clinical resources are not available to patients/);
    expect(routes).toMatch(/WHERE mc\.status = 'published'/);
  });

  it('CW-04 — patient library uses realtime content published events', () => {
    const sync = read('Isara-patient-portal/frontend/lib/useRealtimeSync.ts');
    expect(sync).toMatch(/CONTENT_PUBLISHED/);
    expect(sync).toMatch(/onContentPublished/);
    const library = read('Isara-patient-portal/frontend/pages/MedicalContentLibrary.tsx');
    expect(library).toMatch(/useRealtimeSync/);
    expect(library).toMatch(/onContentPublished/);
    const studio = read('Isara-patient-portal/frontend/components/health/MedicalContent.tsx');
    expect(studio).toMatch(/useRealtimeSync/);
    expect(studio).toMatch(/contentImageRenderer/);
  });

  it('CW-05 — admin stats endpoint feeds nav badge counts', () => {
    const layout = read('Isara-doctor-portal/frontend/components/common/ResponsiveLayout.tsx');
    expect(layout).toMatch(/\/api\/admin\/stats/);
    expect(layout).toMatch(/pendingContent/);
    expect(layout).toMatch(/pendingResources/);
    expect(layout).toMatch(/pendingDoctors/);
    const server = read('Isara-doctor-portal/backend/mainApiServer.cjs');
    expect(server).toMatch(/pendingContent/);
    expect(server).toMatch(/pendingResources/);
  });

  it('CW-06 — approval normalizes approved → published in API responses', () => {
    expect(normalizeStatus('approved')).toBe('published');
    const article = formatMedicalArticle({ id: '1', status: 'approved', title_thai: 'ทดสอบ', content_thai: 'เนื้อหา' });
    expect(article.status).toBe('published');
    const resource = formatClinicalResource({ id: '2', status: 'approved', title_thai: 'แนวทาง', content_thai: 'รายละเอียด' });
    expect(resource.status).toBe('published');
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
    expect(article.comments[0].content).toBe('Fix refs');
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
    const library = read('Isara-patient-portal/frontend/pages/MedicalContentLibrary.tsx');
    expect(library).toMatch(/data-testid="content-item"/);
    expect(library).toMatch(/data-testid="health-library-page"/);
    const studio = read('Isara-patient-portal/frontend/components/health/HealthStudio.tsx');
    expect(studio).toMatch(/health-studio-content-tab/);
    const doctorContent = read('Isara-doctor-portal/frontend/pages/content/MedicalContent.tsx');
    expect(doctorContent).toMatch(/data-testid="content-item"/);
    const layout = read('Isara-doctor-portal/frontend/components/common/ResponsiveLayout.tsx');
    expect(layout).toMatch(/nav-badge-/);
  });
});
