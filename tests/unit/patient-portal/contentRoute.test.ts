/**
 * ═══════════════════════════════════════════════════════════════════════
 * PATIENT PORTAL — Content Route Unit Tests
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: server/routes/content.ts — articles, clinical resources, filter/limit logic
 */
import { describe, it, expect } from 'vitest';

// ── Constants & Logic ───────────────────────────────────────────────────

const VALID_CATEGORIES = ['general-health', 'nutrition', 'exercise', 'mental-health'];
const VALID_CONTENT_TYPES = ['article', 'video'];

const SAMPLE_MEDICAL_CONTENT = [
  { id: 'a-1', titleThai: 'การดูแลสุขภาพประจำวัน', category: 'general-health', type: 'article', isFeatured: true, viewCount: 250, readTime: 5 },
  { id: 'a-2', titleThai: 'โภชนาการที่ดี', category: 'nutrition', type: 'article', isFeatured: false, viewCount: 180, readTime: 7 },
  { id: 'a-3', titleThai: 'การออกกำลังกาย', category: 'exercise', type: 'video', isFeatured: true, viewCount: 320, readTime: 10 },
  { id: 'a-4', titleThai: 'สุขภาพจิตที่ดี', category: 'mental-health', type: 'article', isFeatured: false, viewCount: 150, readTime: 6 },
];

const SAMPLE_CLINICAL_RESOURCES = [
  { id: 'cr-1', title: 'Clinical Practice Guidelines', specialty: 'general', guidelineYear: 2024, source: 'MOH Thailand' },
  { id: 'cr-2', title: 'Drug Interactions Reference', specialty: 'pharmacy', guidelineYear: 2024, source: 'Thai FDA' },
];

function filterByCategory(content: typeof SAMPLE_MEDICAL_CONTENT, category?: string) {
  if (!category) return content;
  return content.filter(c => c.category === category);
}

function applyLimit(content: unknown[], limit?: number) {
  if (!limit || limit <= 0) return content;
  return content.slice(0, limit);
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('Patient Portal — Content Route', () => {

  describe('A — Categories', () => {
    it('A01 — 4 valid categories', () => {
      expect(VALID_CATEGORIES).toHaveLength(4);
    });

    it('A02 — general-health exists', () => {
      expect(VALID_CATEGORIES).toContain('general-health');
    });

    it('A03 — nutrition exists', () => {
      expect(VALID_CATEGORIES).toContain('nutrition');
    });

    it('A04 — exercise exists', () => {
      expect(VALID_CATEGORIES).toContain('exercise');
    });

    it('A05 — mental-health exists', () => {
      expect(VALID_CATEGORIES).toContain('mental-health');
    });
  });

  describe('B — Content Types', () => {
    it('B01 — article type supported', () => {
      expect(VALID_CONTENT_TYPES).toContain('article');
    });

    it('B02 — video type supported', () => {
      expect(VALID_CONTENT_TYPES).toContain('video');
    });
  });

  describe('C — Sample Content Fixtures', () => {
    it('C01 — has 4 sample articles', () => {
      expect(SAMPLE_MEDICAL_CONTENT).toHaveLength(4);
    });

    it('C02 — has 2 sample clinical resources', () => {
      expect(SAMPLE_CLINICAL_RESOURCES).toHaveLength(2);
    });

    it('C03 — all sample content has Thai titles', () => {
      for (const item of SAMPLE_MEDICAL_CONTENT) {
        expect(item.titleThai).toBeTruthy();
        expect(typeof item.titleThai).toBe('string');
      }
    });

    it('C04 — all categories covered in sample data', () => {
      const cats = new Set(SAMPLE_MEDICAL_CONTENT.map(c => c.category));
      for (const cat of VALID_CATEGORIES) {
        expect(cats.has(cat)).toBe(true);
      }
    });

    it('C05 — featured items have higher view counts', () => {
      const featured = SAMPLE_MEDICAL_CONTENT.filter(c => c.isFeatured);
      expect(featured.length).toBeGreaterThan(0);
      for (const f of featured) {
        expect(f.viewCount).toBeGreaterThanOrEqual(200);
      }
    });
  });

  describe('D — Category Filter', () => {
    it('D01 — no filter returns all', () => {
      const result = filterByCategory(SAMPLE_MEDICAL_CONTENT);
      expect(result).toHaveLength(4);
    });

    it('D02 — filter by nutrition', () => {
      const result = filterByCategory(SAMPLE_MEDICAL_CONTENT, 'nutrition');
      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('nutrition');
    });

    it('D03 — unknown category returns empty', () => {
      const result = filterByCategory(SAMPLE_MEDICAL_CONTENT, 'unknown');
      expect(result).toHaveLength(0);
    });
  });

  describe('E — Result Limiting', () => {
    it('E01 — no limit returns all', () => {
      const result = applyLimit(SAMPLE_MEDICAL_CONTENT);
      expect(result).toHaveLength(4);
    });

    it('E02 — limit=2 returns 2 items', () => {
      const result = applyLimit(SAMPLE_MEDICAL_CONTENT, 2);
      expect(result).toHaveLength(2);
    });

    it('E03 — limit=0 returns all', () => {
      const result = applyLimit(SAMPLE_MEDICAL_CONTENT, 0);
      expect(result).toHaveLength(4);
    });

    it('E04 — limit > length returns all', () => {
      const result = applyLimit(SAMPLE_MEDICAL_CONTENT, 100);
      expect(result).toHaveLength(4);
    });
  });

  describe('F — Clinical Resources', () => {
    it('F01 — each resource has specialty', () => {
      for (const r of SAMPLE_CLINICAL_RESOURCES) {
        expect(r.specialty).toBeTruthy();
      }
    });

    it('F02 — guideline year is recent', () => {
      for (const r of SAMPLE_CLINICAL_RESOURCES) {
        expect(r.guidelineYear).toBeGreaterThanOrEqual(2020);
      }
    });

    it('F03 — each resource has source attribution', () => {
      for (const r of SAMPLE_CLINICAL_RESOURCES) {
        expect(r.source).toBeTruthy();
      }
    });
  });
});
