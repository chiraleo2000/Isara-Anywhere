/**
 * ═══════════════════════════════════════════════════════════════════════
 * Clinical Resources Logic Tests (Doctor Portal)
 * Tests: Resource categorization, search, filtering, access control
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';

// --- Types ---
interface ClinicalResource {
  id: string;
  title: string;
  titleTh?: string;
  category: 'guideline' | 'protocol' | 'drug_reference' | 'tool' | 'education';
  specialty?: string;
  content: string;
  tags: string[];
  lastUpdated: string;
  accessLevel: 'public' | 'doctor' | 'admin';
}

// --- Functions ---

function filterResourcesByCategory(resources: ClinicalResource[], category: string): ClinicalResource[] {
  return resources.filter(r => r.category === category);
}

function searchResources(resources: ClinicalResource[], query: string): ClinicalResource[] {
  const q = query.toLowerCase();
  return resources.filter(r =>
    r.title.toLowerCase().includes(q) ||
    (r.titleTh?.toLowerCase().includes(q)) ||
    r.content.toLowerCase().includes(q) ||
    r.tags.some(t => t.toLowerCase().includes(q))
  );
}

function filterByAccessLevel(
  resources: ClinicalResource[],
  userRole: 'patient' | 'doctor' | 'admin'
): ClinicalResource[] {
  const accessMap: Record<string, string[]> = {
    patient: ['public'],
    doctor: ['public', 'doctor'],
    admin: ['public', 'doctor', 'admin'],
  };
  const allowed = accessMap[userRole] || [];
  return resources.filter(r => allowed.includes(r.accessLevel));
}

function sortResourcesByDate(resources: ClinicalResource[]): ClinicalResource[] {
  return [...resources].sort((a, b) =>
    new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
  );
}

function getResourceStats(resources: ClinicalResource[]): Record<string, number> {
  const stats: Record<string, number> = {};
  for (const r of resources) {
    stats[r.category] = (stats[r.category] || 0) + 1;
  }
  return stats;
}

// --- Test Data ---
const SAMPLE_RESOURCES: ClinicalResource[] = [
  { id: '1', title: 'Diabetes Management', titleTh: 'การจัดการเบาหวาน', category: 'guideline', content: 'HbA1c monitoring protocol', tags: ['diabetes', 'endocrine'], lastUpdated: '2026-03-01', accessLevel: 'doctor' },
  { id: '2', title: 'Drug Interaction Reference', category: 'drug_reference', content: 'Warfarin interactions database', tags: ['pharmacology', 'warfarin'], lastUpdated: '2026-03-15', accessLevel: 'doctor' },
  { id: '3', title: 'Patient Education: Hypertension', titleTh: 'ความดันโลหิตสูง', category: 'education', content: 'Blood pressure management for patients', tags: ['hypertension', 'education'], lastUpdated: '2026-02-20', accessLevel: 'public' },
  { id: '4', title: 'Admin Audit Protocol', category: 'protocol', content: 'Internal audit procedures', tags: ['admin', 'audit'], lastUpdated: '2026-03-10', accessLevel: 'admin' },
  { id: '5', title: 'CPR Protocol', category: 'protocol', content: 'Emergency CPR steps', tags: ['emergency', 'cpr'], lastUpdated: '2026-01-15', accessLevel: 'public' },
  { id: '6', title: 'BMI Calculator', category: 'tool', content: 'Body mass index calculator', tags: ['tool', 'bmi'], lastUpdated: '2026-03-20', accessLevel: 'doctor' },
];

// --- Tests ---

describe('Clinical Resources — Category Filter', () => {
  it('CR01 — filter guidelines', () => {
    expect(filterResourcesByCategory(SAMPLE_RESOURCES, 'guideline')).toHaveLength(1);
  });

  it('CR02 — filter protocols', () => {
    expect(filterResourcesByCategory(SAMPLE_RESOURCES, 'protocol')).toHaveLength(2);
  });

  it('CR03 — filter non-existent category', () => {
    expect(filterResourcesByCategory(SAMPLE_RESOURCES, 'other')).toHaveLength(0);
  });
});

describe('Clinical Resources — Search', () => {
  it('CR04 — search by title', () => {
    expect(searchResources(SAMPLE_RESOURCES, 'diabetes')).toHaveLength(1);
  });

  it('CR05 — search by Thai title', () => {
    expect(searchResources(SAMPLE_RESOURCES, 'เบาหวาน')).toHaveLength(1);
  });

  it('CR06 — search by content', () => {
    expect(searchResources(SAMPLE_RESOURCES, 'warfarin')).toHaveLength(1);
  });

  it('CR07 — search by tag', () => {
    expect(searchResources(SAMPLE_RESOURCES, 'emergency')).toHaveLength(1);
  });

  it('CR08 — search with no results', () => {
    expect(searchResources(SAMPLE_RESOURCES, 'xyz123')).toHaveLength(0);
  });
});

describe('Clinical Resources — Access Control', () => {
  it('CR09 — patient sees only public resources', () => {
    const result = filterByAccessLevel(SAMPLE_RESOURCES, 'patient');
    expect(result.every(r => r.accessLevel === 'public')).toBe(true);
    expect(result).toHaveLength(2);
  });

  it('CR10 — doctor sees public + doctor resources', () => {
    const result = filterByAccessLevel(SAMPLE_RESOURCES, 'doctor');
    expect(result).toHaveLength(5); // 2 public + 3 doctor
    expect(result.some(r => r.accessLevel === 'admin')).toBe(false);
  });

  it('CR11 — admin sees all resources', () => {
    expect(filterByAccessLevel(SAMPLE_RESOURCES, 'admin')).toHaveLength(6);
  });
});

describe('Clinical Resources — Sorting & Stats', () => {
  it('CR12 — sort by date descending', () => {
    const sorted = sortResourcesByDate(SAMPLE_RESOURCES);
    expect(sorted[0].id).toBe('6'); // March 20 is latest
  });

  it('CR13 — stats count by category', () => {
    const stats = getResourceStats(SAMPLE_RESOURCES);
    expect(stats.protocol).toBe(2);
    expect(stats.guideline).toBe(1);
  });
});
