// ============================================================================
// Medical Content & Clinical Resources Workflow Tests — Doctor Portal
// Based on: Processes/Medicine_Content_Processes.md
//           Processes/Clinical_Resources_&_Medical_Library_Workflows.md
// Tests: Content CRUD, approval workflow, categories, Thai-first policy
// ============================================================================

import { describe, it, expect } from 'vitest';

// --- Types ---

type ContentStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'published';
type ContentType = 'article' | 'video' | 'guide' | 'infographic';
type ResourceType = 'guideline' | 'protocol' | 'research' | 'template' | 'reference';

interface MedicalContent {
  id: string;
  titleTh: string;
  titleEn?: string;
  contentTh: string;
  contentEn?: string;
  type: ContentType;
  category: string;
  status: ContentStatus;
  authorId: string;
  authorRole: 'doctor' | 'admin';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface ClinicalResource {
  id: string;
  titleTh: string;
  titleEn?: string;
  type: ResourceType;
  category: string;
  status: ContentStatus;
  authorId: string;
  authorRole: 'doctor' | 'admin';
  createdAt: string;
}

// --- Constants ---

const CONTENT_CATEGORIES = [
  'general_health', 'nutrition', 'exercise', 'mental_health',
  'chronic_disease', 'prevention', 'medication', 'pediatrics',
  'geriatrics', 'womens_health',
];

const CLINICAL_CATEGORIES = [
  'cardiology', 'dermatology', 'endocrinology', 'gastroenterology',
  'general_medicine', 'hematology', 'infectious_disease',
  'nephrology', 'neurology', 'oncology', 'orthopedics',
  'pediatrics', 'psychiatry', 'pulmonology', 'surgery',
];

const CONTENT_TYPES: ContentType[] = ['article', 'video', 'guide', 'infographic'];
const RESOURCE_TYPES: ResourceType[] = ['guideline', 'protocol', 'research', 'template', 'reference'];

// --- Helper Functions ---

function validateContent(data: Partial<MedicalContent>): string[] {
  const errors: string[] = [];
  if (!data.titleTh || data.titleTh.trim().length === 0) errors.push('Thai title is required');
  if (!data.contentTh || data.contentTh.trim().length === 0) errors.push('Thai content is required');
  if (!data.type || !CONTENT_TYPES.includes(data.type)) errors.push('Invalid content type');
  if (!data.category || !CONTENT_CATEGORIES.includes(data.category)) errors.push('Invalid category');
  if (!data.authorId) errors.push('Author ID is required');
  return errors;
}

function validateResource(data: Partial<ClinicalResource>): string[] {
  const errors: string[] = [];
  if (!data.titleTh || data.titleTh.trim().length === 0) errors.push('Thai title is required');
  if (!data.type || !RESOURCE_TYPES.includes(data.type)) errors.push('Invalid resource type');
  if (!data.category || !CLINICAL_CATEGORIES.includes(data.category)) errors.push('Invalid category');
  if (!data.authorId) errors.push('Author ID is required');
  return errors;
}

function getNextStatus(current: ContentStatus, action: 'submit' | 'approve' | 'reject' | 'edit'): ContentStatus | null {
  const transitions: Record<string, Record<string, ContentStatus>> = {
    draft: { submit: 'pending' },
    pending: { approve: 'published', reject: 'rejected' },
    rejected: { edit: 'draft' },
    published: { edit: 'pending' },
    approved: { edit: 'pending' },
  };
  return transitions[current]?.[action] || null;
}

function canPerformContentAction(role: string, action: string, authorId: string, requesterId: string): boolean {
  if (role === 'admin') return true;
  if (role === 'doctor') {
    if (['create', 'edit_own', 'delete_own', 'submit'].includes(action)) {
      return action === 'create' || action === 'submit' || authorId === requesterId;
    }
    return false;
  }
  return false;
}

function generateContentId(type: 'content' | 'resource'): string {
  const prefix = type === 'content' ? 'MC' : 'CR';
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

function filterByCategory(items: { category: string }[], category: string): { category: string }[] {
  return items.filter(i => i.category === category);
}

function filterByStatus(items: { status: ContentStatus }[], status: ContentStatus): { status: ContentStatus }[] {
  return items.filter(i => i.status === status);
}

function searchContent(items: MedicalContent[], query: string): MedicalContent[] {
  const q = query.toLowerCase();
  return items.filter(i =>
    i.titleTh.includes(q) ||
    (i.titleEn?.toLowerCase().includes(q)) ||
    i.tags.some(t => t.toLowerCase().includes(q))
  );
}

function isThaiText(text: string): boolean {
  return /[\u0E00-\u0E7F]/.test(text);
}

// --- Tests ---

describe('Medical Content Workflow (Process: Medicine_Content_Processes.md)', () => {

  describe('A — Content Validation (Thai-First)', () => {
    it('A01 — valid content passes', () => {
      const errors = validateContent({
        titleTh: 'โรคหัวใจ', contentTh: 'เนื้อหาเกี่ยวกับโรคหัวใจ',
        type: 'article', category: 'general_health', authorId: 'DOC-001',
      });
      expect(errors).toHaveLength(0);
    });

    it('A02 — missing Thai title fails', () => {
      const errors = validateContent({ contentTh: 'content', type: 'article', category: 'general_health', authorId: 'DOC-001' });
      expect(errors).toContain('Thai title is required');
    });

    it('A03 — missing Thai content fails', () => {
      const errors = validateContent({ titleTh: 'title', type: 'article', category: 'general_health', authorId: 'DOC-001' });
      expect(errors).toContain('Thai content is required');
    });

    it('A04 — English fields are optional', () => {
      const errors = validateContent({
        titleTh: 'โรคหัวใจ', contentTh: 'เนื้อหา',
        type: 'article', category: 'general_health', authorId: 'DOC-001',
      });
      expect(errors).toHaveLength(0);
    });

    it('A05 — 4 content types exist', () => expect(CONTENT_TYPES).toHaveLength(4));
    it('A06 — 10 content categories exist', () => expect(CONTENT_CATEGORIES).toHaveLength(10));
    it('A07 — invalid type fails', () => {
      const errors = validateContent({ titleTh: 'T', contentTh: 'C', type: 'podcast' as any, category: 'general_health', authorId: 'D' });
      expect(errors).toContain('Invalid content type');
    });
  });

  describe('B — Clinical Resource Validation', () => {
    it('B01 — valid resource passes', () => {
      const errors = validateResource({
        titleTh: 'แนวทางรักษา', type: 'guideline', category: 'cardiology', authorId: 'DOC-001',
      });
      expect(errors).toHaveLength(0);
    });

    it('B02 — 5 resource types', () => expect(RESOURCE_TYPES).toHaveLength(5));
    it('B03 — 15 clinical categories', () => expect(CLINICAL_CATEGORIES).toHaveLength(15));

    it('B04 — invalid resource type fails', () => {
      const errors = validateResource({ titleTh: 'T', type: 'blog' as any, category: 'cardiology', authorId: 'D' });
      expect(errors).toContain('Invalid resource type');
    });
  });

  describe('C — Approval Workflow (State Machine)', () => {
    it('C01 — draft → submit → pending', () => expect(getNextStatus('draft', 'submit')).toBe('pending'));
    it('C02 — pending → approve → published', () => expect(getNextStatus('pending', 'approve')).toBe('published'));
    it('C03 — pending → reject → rejected', () => expect(getNextStatus('pending', 'reject')).toBe('rejected'));
    it('C04 — rejected → edit → draft', () => expect(getNextStatus('rejected', 'edit')).toBe('draft'));
    it('C05 — published → edit → re-triggers approval (pending)', () => expect(getNextStatus('published', 'edit')).toBe('pending'));
    it('C06 — invalid transition returns null', () => expect(getNextStatus('draft', 'approve')).toBeNull());
    it('C07 — draft cannot be rejected', () => expect(getNextStatus('draft', 'reject')).toBeNull());
  });

  describe('D — Role-Based Content Access', () => {
    it('D01 — admin can do anything', () => {
      expect(canPerformContentAction('admin', 'approve', 'DOC-001', 'ADMIN-001')).toBe(true);
    });
    it('D02 — doctor can create', () => {
      expect(canPerformContentAction('doctor', 'create', '', 'DOC-001')).toBe(true);
    });
    it('D03 — doctor can edit own', () => {
      expect(canPerformContentAction('doctor', 'edit_own', 'DOC-001', 'DOC-001')).toBe(true);
    });
    it('D04 — doctor cannot edit others', () => {
      expect(canPerformContentAction('doctor', 'edit_own', 'DOC-002', 'DOC-001')).toBe(false);
    });
    it('D05 — doctor cannot approve', () => {
      expect(canPerformContentAction('doctor', 'approve', 'DOC-001', 'DOC-001')).toBe(false);
    });
    it('D06 — doctor can submit for review', () => {
      expect(canPerformContentAction('doctor', 'submit', 'DOC-001', 'DOC-001')).toBe(true);
    });
  });

  describe('E — ID Generation', () => {
    it('E01 — content ID starts with MC-', () => expect(generateContentId('content')).toMatch(/^MC-/));
    it('E02 — resource ID starts with CR-', () => expect(generateContentId('resource')).toMatch(/^CR-/));
    it('E03 — IDs are unique', () => {
      const ids = new Set(Array.from({ length: 10 }, () => generateContentId('content')));
      expect(ids.size).toBe(10);
    });
  });

  describe('F — Filtering & Search', () => {
    const items: MedicalContent[] = [
      { id: '1', titleTh: 'โรคหัวใจ', titleEn: 'Heart Disease', contentTh: 'c', type: 'article', category: 'general_health', status: 'published', authorId: 'D1', authorRole: 'doctor', tags: ['heart', 'cardio'], createdAt: '', updatedAt: '' },
      { id: '2', titleTh: 'โภชนาการ', contentTh: 'c', type: 'guide', category: 'nutrition', status: 'draft', authorId: 'D2', authorRole: 'doctor', tags: ['food', 'diet'], createdAt: '', updatedAt: '' },
      { id: '3', titleTh: 'การออกกำลังกาย', contentTh: 'c', type: 'video', category: 'exercise', status: 'published', authorId: 'D1', authorRole: 'doctor', tags: ['exercise', 'fitness'], createdAt: '', updatedAt: '' },
    ];

    it('F01 — filter by category', () => expect(filterByCategory(items, 'general_health')).toHaveLength(1));
    it('F02 — filter by status', () => expect(filterByStatus(items, 'published')).toHaveLength(2));
    it('F03 — search by Thai title', () => expect(searchContent(items, 'โรคหัวใจ')).toHaveLength(1));
    it('F04 — search by English title', () => expect(searchContent(items, 'heart disease')).toHaveLength(1));
    it('F05 — search by tag', () => expect(searchContent(items, 'diet')).toHaveLength(1));
  });

  describe('G — Thai Text Detection', () => {
    it('G01 — detects Thai text', () => expect(isThaiText('โรคหัวใจ')).toBe(true));
    it('G02 — English text is not Thai', () => expect(isThaiText('Heart Disease')).toBe(false));
    it('G03 — mixed text contains Thai', () => expect(isThaiText('โรค Heart')).toBe(true));
    it('G04 — empty text has no Thai', () => expect(isThaiText('')).toBe(false));
  });
});
