/**
 * ═══════════════════════════════════════════════════════════════════════
 * Cross-Portal Data Sync Validation Tests
 * Tests: ID consistency, status transitions, timestamp ordering
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';

// --- Types ---
interface PortalAppointment {
  id: string;
  patientId: string;
  doctorId?: string;
  status: string;
  updatedAt: string;
}

interface SyncCheck {
  field: string;
  patientValue: unknown;
  doctorValue: unknown;
  match: boolean;
}

// --- Functions ---

function compareSyncFields(
  patientData: PortalAppointment,
  doctorData: PortalAppointment
): SyncCheck[] {
  const fields: (keyof PortalAppointment)[] = ['id', 'patientId', 'doctorId', 'status'];
  return fields.map(field => ({
    field,
    patientValue: patientData[field],
    doctorValue: doctorData[field],
    match: patientData[field] === doctorData[field],
  }));
}

function isDataConsistent(checks: SyncCheck[]): boolean {
  return checks.every(c => c.match);
}

function validateStatusTransition(from: string, to: string): boolean {
  const validTransitions: Record<string, string[]> = {
    pending: ['confirmed', 'cancelled', 'rejected'],
    confirmed: ['in-progress', 'cancelled', 'rescheduled', 'no-show'],
    'in-progress': ['completed', 'cancelled'],
    completed: [], // terminal state
    cancelled: ['pending'], // can rebook
    rejected: ['pending'],
    rescheduled: ['confirmed', 'cancelled'],
    'no-show': ['rescheduled', 'cancelled'],
  };
  const allowed = validTransitions[from];
  return allowed ? allowed.includes(to) : false;
}

function validateTimestampOrdering(timestamps: { label: string; time: string }[]): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    if (new Date(timestamps[i].time) < new Date(timestamps[i - 1].time)) {
      issues.push(`${timestamps[i].label} (${timestamps[i].time}) is before ${timestamps[i - 1].label} (${timestamps[i - 1].time})`);
    }
  }
  return { valid: issues.length === 0, issues };
}

function generateSyncReport(
  patientAppointments: PortalAppointment[],
  doctorAppointments: PortalAppointment[]
): { matched: number; mismatched: number; missingInDoctor: number; missingInPatient: number } {
  const pIds = new Set(patientAppointments.map(a => a.id));
  const dIds = new Set(doctorAppointments.map(a => a.id));

  let matched = 0;
  let mismatched = 0;

  for (const pa of patientAppointments) {
    const da = doctorAppointments.find(d => d.id === pa.id);
    if (da) {
      if (pa.status === da.status) matched++;
      else mismatched++;
    }
  }

  return {
    matched,
    mismatched,
    missingInDoctor: patientAppointments.filter(p => !dIds.has(p.id)).length,
    missingInPatient: doctorAppointments.filter(d => !pIds.has(d.id)).length,
  };
}

// --- Tests ---

describe('Data Sync — Field Comparison', () => {
  it('DS01 — matching data is consistent', () => {
    const p: PortalAppointment = { id: 'APT-001', patientId: 'P1', doctorId: 'D1', status: 'confirmed', updatedAt: '2026-03-15' };
    const d: PortalAppointment = { id: 'APT-001', patientId: 'P1', doctorId: 'D1', status: 'confirmed', updatedAt: '2026-03-15' };
    const checks = compareSyncFields(p, d);
    expect(isDataConsistent(checks)).toBe(true);
  });

  it('DS02 — different status is inconsistent', () => {
    const p: PortalAppointment = { id: 'APT-001', patientId: 'P1', doctorId: 'D1', status: 'pending', updatedAt: '2026-03-15' };
    const d: PortalAppointment = { id: 'APT-001', patientId: 'P1', doctorId: 'D1', status: 'confirmed', updatedAt: '2026-03-15' };
    const checks = compareSyncFields(p, d);
    expect(isDataConsistent(checks)).toBe(false);
    expect(checks.find(c => c.field === 'status')?.match).toBe(false);
  });

  it('DS03 — different doctor is inconsistent', () => {
    const p: PortalAppointment = { id: 'APT-001', patientId: 'P1', doctorId: 'D1', status: 'confirmed', updatedAt: '2026-03-15' };
    const d: PortalAppointment = { id: 'APT-001', patientId: 'P1', doctorId: 'D2', status: 'confirmed', updatedAt: '2026-03-15' };
    expect(isDataConsistent(compareSyncFields(p, d))).toBe(false);
  });
});

describe('Data Sync — Status Transitions', () => {
  it('DS04 — pending → confirmed: valid', () => {
    expect(validateStatusTransition('pending', 'confirmed')).toBe(true);
  });

  it('DS05 — pending → completed: invalid', () => {
    expect(validateStatusTransition('pending', 'completed')).toBe(false);
  });

  it('DS06 — confirmed → in-progress: valid', () => {
    expect(validateStatusTransition('confirmed', 'in-progress')).toBe(true);
  });

  it('DS07 — completed → anything: invalid (terminal)', () => {
    expect(validateStatusTransition('completed', 'pending')).toBe(false);
    expect(validateStatusTransition('completed', 'cancelled')).toBe(false);
  });

  it('DS08 — cancelled → pending: valid (rebook)', () => {
    expect(validateStatusTransition('cancelled', 'pending')).toBe(true);
  });

  it('DS09 — confirmed → cancelled: valid', () => {
    expect(validateStatusTransition('confirmed', 'cancelled')).toBe(true);
  });

  it('DS10 — confirmed → no-show: valid', () => {
    expect(validateStatusTransition('confirmed', 'no-show')).toBe(true);
  });
});

describe('Data Sync — Timestamp Ordering', () => {
  it('DS11 — correct ordering is valid', () => {
    const result = validateTimestampOrdering([
      { label: 'created', time: '2026-03-15T10:00:00Z' },
      { label: 'confirmed', time: '2026-03-15T11:00:00Z' },
      { label: 'started', time: '2026-03-16T10:00:00Z' },
      { label: 'completed', time: '2026-03-16T10:30:00Z' },
    ]);
    expect(result.valid).toBe(true);
  });

  it('DS12 — out-of-order timestamps detected', () => {
    const result = validateTimestampOrdering([
      { label: 'created', time: '2026-03-15T10:00:00Z' },
      { label: 'confirmed', time: '2026-03-14T09:00:00Z' }, // before created
    ]);
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});

describe('Data Sync — Sync Report', () => {
  it('DS13 — fully synced appointments', () => {
    const p = [{ id: '1', patientId: 'P1', status: 'confirmed', updatedAt: '' }];
    const d = [{ id: '1', patientId: 'P1', status: 'confirmed', updatedAt: '' }];
    const report = generateSyncReport(p, d);
    expect(report.matched).toBe(1);
    expect(report.mismatched).toBe(0);
  });

  it('DS14 — mismatched status detected', () => {
    const p = [{ id: '1', patientId: 'P1', status: 'pending', updatedAt: '' }];
    const d = [{ id: '1', patientId: 'P1', status: 'confirmed', updatedAt: '' }];
    const report = generateSyncReport(p, d);
    expect(report.mismatched).toBe(1);
  });

  it('DS15 — missing in doctor portal detected', () => {
    const p = [
      { id: '1', patientId: 'P1', status: 'pending', updatedAt: '' },
      { id: '2', patientId: 'P1', status: 'pending', updatedAt: '' },
    ];
    const d = [{ id: '1', patientId: 'P1', status: 'pending', updatedAt: '' }];
    const report = generateSyncReport(p, d);
    expect(report.missingInDoctor).toBe(1);
  });

  it('DS16 — missing in patient portal detected', () => {
    const p = [{ id: '1', patientId: 'P1', status: 'pending', updatedAt: '' }];
    const d = [
      { id: '1', patientId: 'P1', status: 'pending', updatedAt: '' },
      { id: '3', patientId: 'P1', status: 'confirmed', updatedAt: '' },
    ];
    const report = generateSyncReport(p, d);
    expect(report.missingInPatient).toBe(1);
  });
});
