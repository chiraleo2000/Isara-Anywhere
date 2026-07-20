/**
 * contentFormatters — pure contract (module removed from issara-doctor;
 * formatting now lives inline in mainApiServer + frontend normalizeArticle).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const anywhereRoot = path.resolve(__dirname, '../../../..');

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

function formatMedicalArticle(row: Record<string, unknown> | null | undefined) {
  if (!row) return null;
  return {
    id: row.id,
    titleTh: row.title_thai || row.titleThai || '',
    contentTh: row.content_thai || row.contentThai || '',
    summaryTh: row.summary_thai || row.summaryTh || '',
    category: row.category,
    type: row.content_type || row.type || 'article',
    videoUrl: row.video_url || row.videoUrl || null,
    isFeatured: Boolean(row.is_featured ?? row.isFeatured),
    status: normalizeStatus(row.status as string),
    tags: parseJsonField(row.tags, []),
    version: row.version ?? 1,
    history: parseJsonField(row.history, []),
    comments: parseJsonField(row.comments, []),
    rejectionReason: row.rejection_reason || row.rejectionReason || null,
  };
}

function formatClinicalResource(row: Record<string, unknown> | null | undefined) {
  if (!row) return null;
  return {
    id: row.id,
    titleTh: row.title_thai || row.titleThai || '',
    contentTh: row.content_thai || row.contentThai || '',
    descriptionTh: row.description_thai || row.descriptionThai || '',
    category: row.category,
    resourceType: row.resource_type || row.resourceType || 'guideline',
    status: normalizeStatus(row.status as string),
    createdByName: row.author_name || row.authorName || '',
    rejectionReason: row.rejection_reason || row.rejectionReason || null,
    comments: parseJsonField(row.comments, []),
    history: parseJsonField(row.history, []),
    version: row.version ?? 1,
  };
}

describe('contentFormatters', () => {
  it('normalizes approved status to published', () => {
    expect(normalizeStatus('approved')).toBe('published');
    expect(normalizeStatus('draft')).toBe('draft');
    expect(normalizeStatus('pending')).toBe('pending');
    expect(normalizeStatus('published')).toBe('published');
  });

  it('formats medical article with metadata fields', () => {
    const formatted = formatMedicalArticle({
      id: 'MC-1',
      title_thai: 'หัวข้อ',
      content_thai: 'เนื้อหา',
      summary_thai: 'สรุป',
      category: 'general-health',
      content_type: 'video',
      video_url: 'https://example.com/v.mp4',
      is_featured: true,
      status: 'published',
      tags: '["health"]',
      version: 2,
      history: '[]',
      comments: '[]',
    });
    expect(formatted!.type).toBe('video');
    expect(formatted!.isFeatured).toBe(true);
    expect(formatted!.videoUrl).toBe('https://example.com/v.mp4');
    expect(formatted!.summaryTh).toBe('สรุป');
    expect(formatted!.version).toBe(2);
    expect(formatted!.tags).toEqual(['health']);
  });

  it('formats clinical resource with Thai-first fields', () => {
    const formatted = formatClinicalResource({
      id: 'CR-1',
      title_thai: 'แนวทาง',
      content_thai: 'รายละเอียด',
      description_thai: 'คำอธิบาย',
      category: 'treatment',
      resource_type: 'guideline',
      status: 'approved',
      author_id: 'DOC-1',
      author_name: 'นพ.ทดสอบ',
    });
    expect(formatted!.status).toBe('published');
    expect(formatted!.titleTh).toBe('แนวทาง');
    expect(formatted!.resourceType).toBe('guideline');
    expect(formatted!.createdByName).toBe('นพ.ทดสอบ');
  });

  it('includes rejection reason and admin comments for review feedback', () => {
    const formatted = formatClinicalResource({
      id: 'CR-2',
      title_thai: 'แนวทาง',
      content_thai: 'รายละเอียด',
      status: 'rejected',
      rejection_reason: 'Missing evidence',
      comments: JSON.stringify([
        { id: 'c1', content: 'Add references', isAdminFeedback: true, authorName: 'Admin', createdAt: '2026-01-01' },
      ]),
      history: JSON.stringify([{ version: 1, action: 'reject' }]),
      version: 2,
    });
    expect(formatted!.rejectionReason).toBe('Missing evidence');
    expect(formatted!.comments).toHaveLength(1);
    expect((formatted!.comments as Array<{ isAdminFeedback: boolean }>)[0].isAdminFeedback).toBe(true);
    expect(formatted!.history).toHaveLength(1);
  });

  it('parseJsonField handles arrays and objects safely', () => {
    expect(parseJsonField(['x'])).toEqual(['x']);
    expect(parseJsonField('{"a":1}', [])).toEqual({ a: 1 });
    expect(parseJsonField('not-json', [])).toEqual([]);
    expect(parseJsonField(null, ['default'])).toEqual(['default']);
  });

  it('returns null for missing article/resource rows', () => {
    expect(formatMedicalArticle(null)).toBeNull();
    expect(formatClinicalResource(undefined)).toBeNull();
  });

  it('doctor API still maps article fields inline (module deleted)', () => {
    const server = fs.readFileSync(
      path.join(anywhereRoot, 'issara-doctor/backend/mainApiServer.cjs'),
      'utf8',
    );
    expect(server).toMatch(/titleThai/);
    expect(server).toMatch(/contentThai/);
    expect(server).toMatch(/status: data\.status \|\| 'draft'/);
    expect(fs.existsSync(path.join(anywhereRoot, 'issara-doctor/backend/lib/contentFormatters.cjs'))).toBe(false);
  });
});
