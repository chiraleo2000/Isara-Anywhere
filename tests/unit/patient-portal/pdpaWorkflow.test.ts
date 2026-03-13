// ============================================================================
// PDPA & Privacy Workflow Tests — Patient Portal
// Based on: Processes/Pages/Patient-Portal/10_PDPA_Page.md
// Tests: Consent management, doctor access, audit logging, data sharing
// ============================================================================

import { describe, it, expect } from 'vitest';

// --- Types ---

type ConsentType = 'medical_data' | 'treatment_history' | 'lab_results' | 'prescriptions' | 'living_will' | 'vital_signs';

interface ConsentSetting {
  type: ConsentType;
  enabled: boolean;
  updatedAt: string;
}

interface DoctorAccess {
  doctorId: string;
  doctorName: string;
  accessLevel: 'full' | 'limited' | 'revoked';
  grantedAt: string;
  expiresAt?: string;
}

interface AuditEntry {
  id: string;
  userId: string;
  action: 'view' | 'export' | 'share' | 'revoke' | 'grant' | 'update_consent';
  targetResource: string;
  performedBy: string;
  performedByRole: 'patient' | 'doctor' | 'admin' | 'system';
  timestamp: string;
  ipAddress?: string;
}

// --- Constants ---

const ALL_CONSENT_TYPES: ConsentType[] = [
  'medical_data', 'treatment_history', 'lab_results',
  'prescriptions', 'living_will', 'vital_signs',
];

const CONSENT_LABELS_TH: Record<ConsentType, string> = {
  medical_data: 'ข้อมูลทางการแพทย์',
  treatment_history: 'ประวัติการรักษา',
  lab_results: 'ผลตรวจทางห้องปฏิบัติการ',
  prescriptions: 'ใบสั่งยา',
  living_will: 'พินัยกรรมชีวิต',
  vital_signs: 'สัญญาณชีพ',
};

// --- Helper Functions ---

function validateConsentUpdate(patientId: string, requesterId: string): { valid: boolean; error?: string } {
  if (!patientId) return { valid: false, error: 'Patient ID required' };
  if (!requesterId) return { valid: false, error: 'Requester ID required' };
  if (patientId !== requesterId) return { valid: false, error: 'Only patient can update their own consent' };
  return { valid: true };
}

function canDoctorAccess(access: DoctorAccess): boolean {
  if (access.accessLevel === 'revoked') return false;
  if (access.expiresAt && new Date(access.expiresAt) < new Date()) return false;
  return true;
}

function isConsentEnabled(settings: ConsentSetting[], type: ConsentType): boolean {
  const setting = settings.find(s => s.type === type);
  return setting?.enabled ?? false;
}

function getActiveAccessDoctors(accessList: DoctorAccess[]): DoctorAccess[] {
  return accessList.filter(a => canDoctorAccess(a));
}

function generateAuditEntry(
  userId: string, action: AuditEntry['action'],
  targetResource: string, performedBy: string,
  performedByRole: AuditEntry['performedByRole']
): AuditEntry {
  return {
    id: `AUDIT-${Date.now()}`,
    userId, action, targetResource, performedBy, performedByRole,
    timestamp: new Date().toISOString(),
  };
}

function filterAuditByAction(entries: AuditEntry[], action: AuditEntry['action']): AuditEntry[] {
  return entries.filter(e => e.action === action);
}

function filterAuditByDateRange(entries: AuditEntry[], startDate: string, endDate: string): AuditEntry[] {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  return entries.filter(e => {
    const t = new Date(e.timestamp).getTime();
    return t >= start && t <= end;
  });
}

function getDefaultConsents(): ConsentSetting[] {
  return ALL_CONSENT_TYPES.map(type => ({
    type,
    enabled: type !== 'living_will', // Living will defaults to private
    updatedAt: new Date().toISOString(),
  }));
}

// --- Tests ---

describe('PDPA Privacy & Consent Workflow (Process: 10_PDPA_Page.md)', () => {

  describe('A — Consent Types', () => {
    it('A01 — 6 consent types defined', () => expect(ALL_CONSENT_TYPES).toHaveLength(6));
    it('A02 — all have Thai labels', () => {
      for (const type of ALL_CONSENT_TYPES) {
        expect(CONSENT_LABELS_TH[type]).toBeTruthy();
      }
    });
    it('A03 — medical_data label is correct', () => expect(CONSENT_LABELS_TH.medical_data).toBe('ข้อมูลทางการแพทย์'));
    it('A04 — living_will label is correct', () => expect(CONSENT_LABELS_TH.living_will).toBe('พินัยกรรมชีวิต'));
  });

  describe('B — Consent Update Authorization', () => {
    it('B01 — patient can update own consent', () => {
      expect(validateConsentUpdate('PAT-001', 'PAT-001').valid).toBe(true);
    });
    it('B02 — different user cannot update', () => {
      const result = validateConsentUpdate('PAT-001', 'PAT-002');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Only patient can update their own consent');
    });
    it('B03 — missing patient ID fails', () => {
      expect(validateConsentUpdate('', 'PAT-001').valid).toBe(false);
    });
    it('B04 — missing requester fails', () => {
      expect(validateConsentUpdate('PAT-001', '').valid).toBe(false);
    });
  });

  describe('C — Doctor Access Control', () => {
    it('C01 — full access doctor can access', () => {
      expect(canDoctorAccess({ doctorId: 'D1', doctorName: 'Dr.A', accessLevel: 'full', grantedAt: '2026-01-01' })).toBe(true);
    });
    it('C02 — limited access doctor can access', () => {
      expect(canDoctorAccess({ doctorId: 'D1', doctorName: 'Dr.A', accessLevel: 'limited', grantedAt: '2026-01-01' })).toBe(true);
    });
    it('C03 — revoked doctor cannot access', () => {
      expect(canDoctorAccess({ doctorId: 'D1', doctorName: 'Dr.A', accessLevel: 'revoked', grantedAt: '2026-01-01' })).toBe(false);
    });
    it('C04 — expired access denied', () => {
      expect(canDoctorAccess({ doctorId: 'D1', doctorName: 'Dr.A', accessLevel: 'full', grantedAt: '2025-01-01', expiresAt: '2025-12-31' })).toBe(false);
    });
    it('C05 — no expiry means indefinite', () => {
      expect(canDoctorAccess({ doctorId: 'D1', doctorName: 'Dr.A', accessLevel: 'full', grantedAt: '2026-01-01' })).toBe(true);
    });
  });

  describe('D — Consent Setting Checks', () => {
    const settings: ConsentSetting[] = [
      { type: 'medical_data', enabled: true, updatedAt: '2026-01-01' },
      { type: 'lab_results', enabled: false, updatedAt: '2026-01-01' },
      { type: 'prescriptions', enabled: true, updatedAt: '2026-01-01' },
    ];

    it('D01 — enabled consent returns true', () => expect(isConsentEnabled(settings, 'medical_data')).toBe(true));
    it('D02 — disabled consent returns false', () => expect(isConsentEnabled(settings, 'lab_results')).toBe(false));
    it('D03 — missing consent defaults to false', () => expect(isConsentEnabled(settings, 'living_will')).toBe(false));
  });

  describe('E — Active Doctor Access Filtering', () => {
    const accessList: DoctorAccess[] = [
      { doctorId: 'D1', doctorName: 'Dr.A', accessLevel: 'full', grantedAt: '2026-01-01' },
      { doctorId: 'D2', doctorName: 'Dr.B', accessLevel: 'revoked', grantedAt: '2026-01-01' },
      { doctorId: 'D3', doctorName: 'Dr.C', accessLevel: 'limited', grantedAt: '2026-01-01', expiresAt: '2025-06-01' },
    ];

    it('E01 — only active doctors returned', () => {
      const active = getActiveAccessDoctors(accessList);
      expect(active).toHaveLength(1);
      expect(active[0].doctorId).toBe('D1');
    });
  });

  describe('F — Audit Logging', () => {
    it('F01 — audit entry generated with correct fields', () => {
      const entry = generateAuditEntry('PAT-001', 'view', 'medical_data', 'DOC-001', 'doctor');
      expect(entry.id).toMatch(/^AUDIT-/);
      expect(entry.userId).toBe('PAT-001');
      expect(entry.action).toBe('view');
      expect(entry.performedByRole).toBe('doctor');
    });

    it('F02 — filter by action', () => {
      const entries: AuditEntry[] = [
        { id: '1', userId: 'P1', action: 'view', targetResource: 'r1', performedBy: 'D1', performedByRole: 'doctor', timestamp: '2026-01-01' },
        { id: '2', userId: 'P1', action: 'export', targetResource: 'r1', performedBy: 'P1', performedByRole: 'patient', timestamp: '2026-01-02' },
        { id: '3', userId: 'P1', action: 'view', targetResource: 'r2', performedBy: 'D2', performedByRole: 'doctor', timestamp: '2026-01-03' },
      ];
      expect(filterAuditByAction(entries, 'view')).toHaveLength(2);
      expect(filterAuditByAction(entries, 'export')).toHaveLength(1);
    });

    it('F03 — filter by date range', () => {
      const entries: AuditEntry[] = [
        { id: '1', userId: 'P1', action: 'view', targetResource: 'r1', performedBy: 'D1', performedByRole: 'doctor', timestamp: '2026-01-01T10:00:00Z' },
        { id: '2', userId: 'P1', action: 'view', targetResource: 'r1', performedBy: 'D1', performedByRole: 'doctor', timestamp: '2026-01-15T10:00:00Z' },
        { id: '3', userId: 'P1', action: 'view', targetResource: 'r1', performedBy: 'D1', performedByRole: 'doctor', timestamp: '2026-02-01T10:00:00Z' },
      ];
      const filtered = filterAuditByDateRange(entries, '2026-01-10', '2026-01-20');
      expect(filtered).toHaveLength(1);
    });
  });

  describe('G — Default Consent Settings', () => {
    it('G01 — defaults have 6 entries', () => expect(getDefaultConsents()).toHaveLength(6));
    it('G02 — living will defaults to private (disabled)', () => {
      const defaults = getDefaultConsents();
      const lw = defaults.find(d => d.type === 'living_will');
      expect(lw?.enabled).toBe(false);
    });
    it('G03 — medical data defaults to enabled', () => {
      const defaults = getDefaultConsents();
      const md = defaults.find(d => d.type === 'medical_data');
      expect(md?.enabled).toBe(true);
    });
  });
});
