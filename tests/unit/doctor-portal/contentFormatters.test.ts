import { describe, it, expect } from 'vitest';
import {
  formatMedicalArticle,
  formatClinicalResource,
  normalizeStatus,
  parseJsonField,
} from '../../../Isara-doctor-portal/backend/lib/contentFormatters.cjs';

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
    expect(formatted.type).toBe('video');
    expect(formatted.isFeatured).toBe(true);
    expect(formatted.videoUrl).toBe('https://example.com/v.mp4');
    expect(formatted.summaryTh).toBe('สรุป');
    expect(formatted.version).toBe(2);
    expect(formatted.tags).toEqual(['health']);
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
    expect(formatted.status).toBe('published');
    expect(formatted.titleTh).toBe('แนวทาง');
    expect(formatted.resourceType).toBe('guideline');
    expect(formatted.createdByName).toBe('นพ.ทดสอบ');
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
    expect(formatted.rejectionReason).toBe('Missing evidence');
    expect(formatted.comments).toHaveLength(1);
    expect(formatted.comments[0].isAdminFeedback).toBe(true);
    expect(formatted.history).toHaveLength(1);
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
});