/**
 * ═══════════════════════════════════════════════════════════════════════
 * Admin Doctor Management Logic Tests
 * Tests: Doctor approval flow, listing, search, status management
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';

// --- Types ---
interface DoctorRecord {
  id: string;
  name: string;
  email: string;
  specialty: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  licenseNumber?: string;
  hospital?: string;
  registeredAt: string;
}

interface ApprovalDecision {
  doctorId: string;
  action: 'approve' | 'reject' | 'suspend' | 'reactivate';
  reason?: string;
  decidedBy: string;
}

// --- Functions ---

function filterDoctorsByStatus(doctors: DoctorRecord[], status: string): DoctorRecord[] {
  return doctors.filter(d => d.status === status);
}

function searchDoctors(doctors: DoctorRecord[], query: string): DoctorRecord[] {
  const q = query.toLowerCase();
  return doctors.filter(d =>
    d.name.toLowerCase().includes(q) ||
    d.email.toLowerCase().includes(q) ||
    d.specialty.toLowerCase().includes(q) ||
    (d.hospital?.toLowerCase().includes(q))
  );
}

function validateApprovalDecision(decision: ApprovalDecision, currentStatus: string): { valid: boolean; error?: string } {
  const validTransitions: Record<string, string[]> = {
    pending: ['approve', 'reject'],
    approved: ['suspend'],
    rejected: ['approve'],
    suspended: ['reactivate'],
  };

  const allowed = validTransitions[currentStatus];
  if (!allowed) return { valid: false, error: `Unknown status: ${currentStatus}` };
  if (!allowed.includes(decision.action)) {
    return { valid: false, error: `Cannot ${decision.action} a ${currentStatus} doctor` };
  }
  if ((decision.action === 'reject' || decision.action === 'suspend') && !decision.reason) {
    return { valid: false, error: `Reason required for ${decision.action}` };
  }
  return { valid: true };
}

function getStatusAfterAction(action: string): string {
  const map: Record<string, string> = {
    approve: 'approved',
    reject: 'rejected',
    suspend: 'suspended',
    reactivate: 'approved',
  };
  return map[action] || 'unknown';
}

function getDoctorStats(doctors: DoctorRecord[]): Record<string, number> {
  const stats: Record<string, number> = { total: doctors.length };
  for (const d of doctors) {
    stats[d.status] = (stats[d.status] || 0) + 1;
  }
  return stats;
}

// --- Test Data ---
const SAMPLE_DOCTORS: DoctorRecord[] = [
  { id: '1', name: 'Dr. Smith', email: 'smith@test.com', specialty: 'Cardiology', status: 'approved', licenseNumber: 'MD001', hospital: 'Bangkok Hospital', registeredAt: '2025-01-15' },
  { id: '2', name: 'Dr. Somchai', email: 'somchai@test.com', specialty: 'General Medicine', status: 'pending', licenseNumber: 'MD002', hospital: 'Siriraj', registeredAt: '2026-03-01' },
  { id: '3', name: 'Dr. Johnson', email: 'johnson@test.com', specialty: 'Dermatology', status: 'approved', hospital: 'Private Clinic', registeredAt: '2025-06-20' },
  { id: '4', name: 'Dr. Lee', email: 'lee@test.com', specialty: 'Cardiology', status: 'rejected', registeredAt: '2026-02-15' },
  { id: '5', name: 'Dr. Tanaka', email: 'tanaka@test.com', specialty: 'Neurology', status: 'suspended', registeredAt: '2025-09-10' },
];

// --- Tests ---

describe('Admin Doctor Management — Filter', () => {
  it('DM01 — filter pending doctors', () => {
    expect(filterDoctorsByStatus(SAMPLE_DOCTORS, 'pending')).toHaveLength(1);
  });

  it('DM02 — filter approved doctors', () => {
    expect(filterDoctorsByStatus(SAMPLE_DOCTORS, 'approved')).toHaveLength(2);
  });

  it('DM03 — filter suspended doctors', () => {
    expect(filterDoctorsByStatus(SAMPLE_DOCTORS, 'suspended')).toHaveLength(1);
  });
});

describe('Admin Doctor Management — Search', () => {
  it('DM04 — search by name', () => {
    expect(searchDoctors(SAMPLE_DOCTORS, 'somchai')).toHaveLength(1);
  });

  it('DM05 — search by specialty', () => {
    expect(searchDoctors(SAMPLE_DOCTORS, 'cardiology')).toHaveLength(2);
  });

  it('DM06 — search by hospital', () => {
    expect(searchDoctors(SAMPLE_DOCTORS, 'siriraj')).toHaveLength(1);
  });

  it('DM07 — search by email', () => {
    expect(searchDoctors(SAMPLE_DOCTORS, 'smith@')).toHaveLength(1);
  });
});

describe('Admin Doctor Management — Approval Flow', () => {
  it('DM08 — approve pending doctor: valid', () => {
    const result = validateApprovalDecision({ doctorId: '2', action: 'approve', decidedBy: 'admin1' }, 'pending');
    expect(result.valid).toBe(true);
  });

  it('DM09 — reject pending without reason: invalid', () => {
    const result = validateApprovalDecision({ doctorId: '2', action: 'reject', decidedBy: 'admin1' }, 'pending');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Reason required');
  });

  it('DM10 — reject pending with reason: valid', () => {
    const result = validateApprovalDecision({ doctorId: '2', action: 'reject', reason: 'Invalid license', decidedBy: 'admin1' }, 'pending');
    expect(result.valid).toBe(true);
  });

  it('DM11 — cannot approve already approved', () => {
    const result = validateApprovalDecision({ doctorId: '1', action: 'approve', decidedBy: 'admin1' }, 'approved');
    expect(result.valid).toBe(false);
  });

  it('DM12 — suspend approved: valid with reason', () => {
    const result = validateApprovalDecision({ doctorId: '1', action: 'suspend', reason: 'Investigation', decidedBy: 'admin1' }, 'approved');
    expect(result.valid).toBe(true);
  });

  it('DM13 — reactivate suspended: valid', () => {
    const result = validateApprovalDecision({ doctorId: '5', action: 'reactivate', decidedBy: 'admin1' }, 'suspended');
    expect(result.valid).toBe(true);
  });

  it('DM14 — approve rejected: valid (re-review)', () => {
    const result = validateApprovalDecision({ doctorId: '4', action: 'approve', decidedBy: 'admin1' }, 'rejected');
    expect(result.valid).toBe(true);
  });
});

describe('Admin Doctor Management — Status Transition', () => {
  it('DM15 — approve → approved', () => {
    expect(getStatusAfterAction('approve')).toBe('approved');
  });

  it('DM16 — reject → rejected', () => {
    expect(getStatusAfterAction('reject')).toBe('rejected');
  });

  it('DM17 — reactivate → approved', () => {
    expect(getStatusAfterAction('reactivate')).toBe('approved');
  });

  it('DM18 — suspend → suspended', () => {
    expect(getStatusAfterAction('suspend')).toBe('suspended');
  });
});

describe('Admin Doctor Management — Stats', () => {
  it('DM19 — stats include total', () => {
    const stats = getDoctorStats(SAMPLE_DOCTORS);
    expect(stats.total).toBe(5);
  });

  it('DM20 — stats count by status', () => {
    const stats = getDoctorStats(SAMPLE_DOCTORS);
    expect(stats.approved).toBe(2);
    expect(stats.pending).toBe(1);
    expect(stats.rejected).toBe(1);
    expect(stats.suspended).toBe(1);
  });
});
