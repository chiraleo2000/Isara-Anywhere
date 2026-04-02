/**
 * ═══════════════════════════════════════════════════════════════════════
 * Timeline Page Logic Tests
 * Tests: Timeline data rendering, date filtering, event sorting, grouping
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';

// --- Types ---
interface TimelineEvent {
  id: string;
  type: 'appointment' | 'lab_result' | 'prescription' | 'vital_signs' | 'diagnosis';
  title: string;
  titleTh?: string;
  date: string; // ISO date
  description?: string;
  doctorName?: string;
  status?: string;
  data?: Record<string, unknown>;
}

interface TimelineGroup {
  date: string;
  label: string;
  events: TimelineEvent[];
}

interface TimelineFilter {
  type?: string;
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
}

// --- Functions ---

function filterTimeline(events: TimelineEvent[], filter: TimelineFilter): TimelineEvent[] {
  let result = [...events];
  if (filter.type) {
    result = result.filter(e => e.type === filter.type);
  }
  if (filter.startDate) {
    result = result.filter(e => e.date >= filter.startDate!);
  }
  if (filter.endDate) {
    result = result.filter(e => e.date <= filter.endDate!);
  }
  if (filter.searchQuery) {
    const q = filter.searchQuery.toLowerCase();
    result = result.filter(e =>
      e.title.toLowerCase().includes(q) ||
      (e.description?.toLowerCase().includes(q)) ||
      (e.titleTh?.toLowerCase().includes(q))
    );
  }
  return result;
}

function sortTimelineDesc(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function groupByDate(events: TimelineEvent[]): TimelineGroup[] {
  const map = new Map<string, TimelineEvent[]>();
  for (const e of events) {
    const dateKey = e.date.split('T')[0];
    let arr = map.get(dateKey);
    if (!arr) {
      arr = [];
      map.set(dateKey, arr);
    }
    arr.push(e);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, events]) => ({
      date,
      label: new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }),
      events,
    }));
}

function getTimelineStats(events: TimelineEvent[]): Record<string, number> {
  const stats: Record<string, number> = {};
  for (const e of events) {
    stats[e.type] = (stats[e.type] || 0) + 1;
  }
  return stats;
}

// --- Test Data ---
const SAMPLE_EVENTS: TimelineEvent[] = [
  { id: '1', type: 'appointment', title: 'Checkup', date: '2026-03-15T10:00:00Z', doctorName: 'Dr. Smith' },
  { id: '2', type: 'lab_result', title: 'Blood Test', date: '2026-03-15T14:00:00Z' },
  { id: '3', type: 'prescription', title: 'Paracetamol 500mg', date: '2026-03-10T09:00:00Z' },
  { id: '4', type: 'vital_signs', title: 'BP Reading', date: '2026-03-20T08:00:00Z' },
  { id: '5', type: 'diagnosis', title: 'Flu', date: '2026-03-15T11:00:00Z', titleTh: 'ไข้หวัดใหญ่' },
  { id: '6', type: 'appointment', title: 'Follow-up', date: '2026-03-25T10:00:00Z', doctorName: 'Dr. Jones' },
  { id: '7', type: 'lab_result', title: 'Cholesterol Panel', date: '2026-03-22T09:00:00Z' },
];

// --- Tests ---

describe('Timeline — Filtering', () => {
  it('T01 — filter by type appointment returns 2', () => {
    expect(filterTimeline(SAMPLE_EVENTS, { type: 'appointment' })).toHaveLength(2);
  });

  it('T02 — filter by type lab_result returns 2', () => {
    expect(filterTimeline(SAMPLE_EVENTS, { type: 'lab_result' })).toHaveLength(2);
  });

  it('T03 — filter by date range', () => {
    const result = filterTimeline(SAMPLE_EVENTS, { startDate: '2026-03-14', endDate: '2026-03-16' });
    expect(result).toHaveLength(3); // 3 events on March 15
  });

  it('T04 — filter by search query', () => {
    const result = filterTimeline(SAMPLE_EVENTS, { searchQuery: 'blood' });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Blood Test');
  });

  it('T05 — filter by Thai title search', () => {
    const result = filterTimeline(SAMPLE_EVENTS, { searchQuery: 'ไข้หวัด' });
    expect(result).toHaveLength(1);
  });

  it('T06 — empty filter returns all', () => {
    expect(filterTimeline(SAMPLE_EVENTS, {})).toHaveLength(SAMPLE_EVENTS.length);
  });

  it('T07 — combined type + date filter', () => {
    const result = filterTimeline(SAMPLE_EVENTS, { type: 'appointment', startDate: '2026-03-20' });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Follow-up');
  });
});

describe('Timeline — Sorting', () => {
  it('T08 — sort descending by date', () => {
    const sorted = sortTimelineDesc(SAMPLE_EVENTS);
    expect(sorted[0].id).toBe('6'); // March 25 is latest
    for (let i = 1; i < sorted.length; i++) {
      expect(new Date(sorted[i].date).getTime()).toBeLessThanOrEqual(new Date(sorted[i - 1].date).getTime());
    }
  });

  it('T09 — sort preserves all events', () => {
    const sorted = sortTimelineDesc(SAMPLE_EVENTS);
    expect(sorted).toHaveLength(SAMPLE_EVENTS.length);
  });
});

describe('Timeline — Grouping', () => {
  it('T10 — groups events by date', () => {
    const groups = groupByDate(SAMPLE_EVENTS);
    expect(groups.length).toBeGreaterThan(0);
    // March 15 has 3 events
    const march15 = groups.find(g => g.date === '2026-03-15');
    expect(march15).toBeDefined();
    expect(march15?.events).toHaveLength(3);
  });

  it('T11 — groups sorted newest first', () => {
    const groups = groupByDate(SAMPLE_EVENTS);
    expect(groups[0].date).toBe('2026-03-25');
  });

  it('T12 — each group has Thai label', () => {
    const groups = groupByDate(SAMPLE_EVENTS);
    for (const g of groups) {
      expect(g.label).toBeTruthy();
    }
  });
});

describe('Timeline — Stats', () => {
  it('T13 — stats count by type', () => {
    const stats = getTimelineStats(SAMPLE_EVENTS);
    expect(stats.appointment).toBe(2);
    expect(stats.lab_result).toBe(2);
    expect(stats.prescription).toBe(1);
    expect(stats.vital_signs).toBe(1);
    expect(stats.diagnosis).toBe(1);
  });

  it('T14 — empty events give empty stats', () => {
    expect(getTimelineStats([])).toEqual({});
  });
});
