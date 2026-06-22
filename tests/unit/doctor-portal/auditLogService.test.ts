/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — AUDIT LOG SERVICE UNIT TESTS
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: AuditLog creation, compliance report generation,
 *        CSV export, patient data access logging, filtering
 * Source: Isara-doctor-portal/frontend/services/auditLogService.ts
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';

// ─── Reimplement pure audit log logic ──

type AuditAction = 'view' | 'create' | 'update' | 'delete' | 'download' | 'print' | 'export' | 'login' | 'logout' | 'access_denied';

type AuditResource =
  | 'patient_phr' | 'patient_ehr' | 'patient_demographics' | 'emr' | 'prescription'
  | 'lab_order' | 'lab_result' | 'imaging_order' | 'imaging_report'
  | 'appointment' | 'consent_record' | 'e_living_will' | 'system';

interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId: string;
  patientId?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

function createAuditLog(
  userId: string,
  userName: string,
  action: AuditAction,
  resource: AuditResource,
  resourceId: string,
  options?: {
    patientId?: string;
    success?: boolean;
    errorMessage?: string;
    metadata?: Record<string, any>;
  }
): AuditLog {
  return {
    id: `AUDIT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    userId,
    userName,
    action,
    resource,
    resourceId,
    patientId: options?.patientId,
    success: options?.success !== false,
    errorMessage: options?.errorMessage,
    metadata: options?.metadata,
  };
}

function filterLogsByPatient(logs: AuditLog[], patientId: string, startDate?: Date, endDate?: Date): AuditLog[] {
  return logs.filter(log => {
    const matchesPatient = log.patientId === patientId;
    const logTime = log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp);
    const matchesDateRange = (!startDate || logTime >= startDate) && (!endDate || logTime <= endDate);
    return matchesPatient && matchesDateRange;
  });
}

function deduplicateLogs(logs: AuditLog[]): AuditLog[] {
  return logs.filter(
    (log, index, self) => index === self.findIndex(l => l.id === log.id)
  );
}

function sortLogsByRecent(logs: AuditLog[]): AuditLog[] {
  return [...logs].sort((a, b) => {
    const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
    const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
    return timeB - timeA;
  });
}

function generateComplianceReport(logs: AuditLog[], startDate: Date, endDate: Date) {
  const filtered = logs.filter(
    log => log.timestamp >= startDate && log.timestamp <= endDate
  );

  const report = {
    totalAccess: filtered.length,
    byResource: {} as Record<string, number>,
    byAction: {} as Record<string, number>,
    accessDenied: filtered.filter(log => log.action === 'access_denied').length,
    uniquePatients: new Set(filtered.map(log => log.patientId).filter(Boolean)).size,
    uniqueUsers: new Set(filtered.map(log => log.userId)).size,
  };

  filtered.forEach(log => {
    report.byResource[log.resource] = (report.byResource[log.resource] || 0) + 1;
    report.byAction[log.action] = (report.byAction[log.action] || 0) + 1;
  });

  return report;
}

function exportToCSV(logs: AuditLog[]): string {
  const headers = [
    'Timestamp', 'User', 'Action', 'Resource', 'Resource ID',
    'Patient ID', 'IP Address', 'Success', 'Error Message',
  ];
  const rows = logs.map(log => [
    log.timestamp.toISOString(),
    log.userName,
    log.action,
    log.resource,
    log.resourceId,
    log.patientId || '',
    log.ipAddress || '',
    log.success ? 'Yes' : 'No',
    log.errorMessage || '',
  ]);
  return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

// All valid audit actions
const ALL_ACTIONS: AuditAction[] = ['view', 'create', 'update', 'delete', 'download', 'print', 'export', 'login', 'logout', 'access_denied'];

// All valid audit resources
const ALL_RESOURCES: AuditResource[] = [
  'patient_phr', 'patient_ehr', 'patient_demographics', 'emr', 'prescription',
  'lab_order', 'lab_result', 'imaging_order', 'imaging_report',
  'appointment', 'consent_record', 'e_living_will', 'system',
];

// ════════════════════════════════════════════════════════════════════
// A. AUDIT LOG CREATION (10 tests)
// ════════════════════════════════════════════════════════════════════
describe('Audit Log Creation', () => {
  it('A01 — creates log with required fields', () => {
    const log = createAuditLog('u1', 'Dr. Smith', 'view', 'patient_phr', 'phr-001');
    expect(log.userId).toBe('u1');
    expect(log.userName).toBe('Dr. Smith');
    expect(log.action).toBe('view');
    expect(log.resource).toBe('patient_phr');
    expect(log.resourceId).toBe('phr-001');
  });

  it('A02 — generates unique ID starting with AUDIT-', () => {
    const log = createAuditLog('u1', 'Dr. Smith', 'view', 'emr', 'e1');
    expect(log.id).toMatch(/^AUDIT-/);
  });

  it('A03 — generates different IDs for each log', () => {
    const log1 = createAuditLog('u1', 'Dr. Smith', 'view', 'emr', 'e1');
    const log2 = createAuditLog('u1', 'Dr. Smith', 'view', 'emr', 'e1');
    expect(log1.id).not.toBe(log2.id);
  });

  it('A04 — sets timestamp to current time', () => {
    const before = Date.now();
    const log = createAuditLog('u1', 'User', 'login', 'system', 'u1');
    const after = Date.now();
    expect(log.timestamp.getTime()).toBeGreaterThanOrEqual(before);
    expect(log.timestamp.getTime()).toBeLessThanOrEqual(after);
  });

  it('A05 — success defaults to true', () => {
    const log = createAuditLog('u1', 'User', 'view', 'emr', 'e1');
    expect(log.success).toBe(true);
  });

  it('A06 — success can be set to false', () => {
    const log = createAuditLog('u1', 'User', 'view', 'emr', 'e1', { success: false });
    expect(log.success).toBe(false);
  });

  it('A07 — stores patientId when provided', () => {
    const log = createAuditLog('u1', 'Dr. Smith', 'view', 'patient_phr', 'phr-001', { patientId: 'p1' });
    expect(log.patientId).toBe('p1');
  });

  it('A08 — stores error message', () => {
    const log = createAuditLog('u1', 'User', 'access_denied', 'emr', 'e1', {
      success: false,
      errorMessage: 'No consent',
    });
    expect(log.errorMessage).toBe('No consent');
  });

  it('A09 — stores metadata', () => {
    const log = createAuditLog('u1', 'User', 'view', 'emr', 'e1', {
      metadata: { complianceType: 'HIPAA' },
    });
    expect(log.metadata?.complianceType).toBe('HIPAA');
  });

  it('A10 — 10 actions are defined', () => {
    expect(ALL_ACTIONS).toHaveLength(10);
  });
});

// ════════════════════════════════════════════════════════════════════
// B. AUDIT RESOURCES (8 tests)
// ════════════════════════════════════════════════════════════════════
describe('Audit Resources', () => {
  it('B01 — 13 resource types defined', () => {
    expect(ALL_RESOURCES).toHaveLength(13);
  });

  it('B02 — includes patient_phr', () => {
    expect(ALL_RESOURCES).toContain('patient_phr');
  });

  it('B03 — includes emr', () => {
    expect(ALL_RESOURCES).toContain('emr');
  });

  it('B04 — includes prescription', () => {
    expect(ALL_RESOURCES).toContain('prescription');
  });

  it('B05 — includes lab_order and lab_result', () => {
    expect(ALL_RESOURCES).toContain('lab_order');
    expect(ALL_RESOURCES).toContain('lab_result');
  });

  it('B06 — includes consent_record', () => {
    expect(ALL_RESOURCES).toContain('consent_record');
  });

  it('B07 — includes e_living_will', () => {
    expect(ALL_RESOURCES).toContain('e_living_will');
  });

  it('B08 — includes system for auth events', () => {
    expect(ALL_RESOURCES).toContain('system');
  });
});

// ════════════════════════════════════════════════════════════════════
// C. PATIENT LOG FILTERING (10 tests)
// ════════════════════════════════════════════════════════════════════
describe('Patient Log Filtering', () => {
  const logs: AuditLog[] = [
    { id: '1', timestamp: new Date('2025-01-10'), userId: 'u1', userName: 'DrA', action: 'view', resource: 'patient_phr', resourceId: 'r1', patientId: 'p1', success: true },
    { id: '2', timestamp: new Date('2025-01-15'), userId: 'u2', userName: 'DrB', action: 'update', resource: 'emr', resourceId: 'r2', patientId: 'p1', success: true },
    { id: '3', timestamp: new Date('2025-01-20'), userId: 'u1', userName: 'DrA', action: 'view', resource: 'patient_phr', resourceId: 'r3', patientId: 'p2', success: true },
    { id: '4', timestamp: new Date('2025-02-01'), userId: 'u3', userName: 'DrC', action: 'create', resource: 'prescription', resourceId: 'r4', patientId: 'p1', success: true },
    { id: '5', timestamp: new Date('2025-02-15'), userId: 'u1', userName: 'DrA', action: 'view', resource: 'lab_result', resourceId: 'r5', patientId: 'p1', success: true },
  ];

  it('C01 — filters by patient ID', () => {
    const result = filterLogsByPatient(logs, 'p1');
    expect(result).toHaveLength(4);
  });

  it('C02 — returns empty for unknown patient', () => {
    const result = filterLogsByPatient(logs, 'p999');
    expect(result).toHaveLength(0);
  });

  it('C03 — filters by date range', () => {
    const result = filterLogsByPatient(logs, 'p1', new Date('2025-01-01'), new Date('2025-01-31'));
    expect(result).toHaveLength(2);
  });

  it('C04 — inclusive start date', () => {
    const result = filterLogsByPatient(logs, 'p1', new Date('2025-01-10'));
    expect(result).toHaveLength(4);
  });

  it('C05 — inclusive end date', () => {
    const result = filterLogsByPatient(logs, 'p1', undefined, new Date('2025-01-15'));
    expect(result).toHaveLength(2);
  });

  it('C06 — narrow date range', () => {
    const result = filterLogsByPatient(logs, 'p1', new Date('2025-01-14'), new Date('2025-01-16'));
    expect(result).toHaveLength(1);
  });

  it('C07 — no date range returns all for patient', () => {
    const result = filterLogsByPatient(logs, 'p2');
    expect(result).toHaveLength(1);
  });

  it('C08 — deduplicates by ID', () => {
    const duped = [...logs, { ...logs[0] }];
    const result = deduplicateLogs(duped);
    expect(result).toHaveLength(5);
  });

  it('C09 — sorts by most recent first', () => {
    const sorted = sortLogsByRecent(logs);
    expect(sorted[0].id).toBe('5');
    expect(sorted[sorted.length - 1].id).toBe('1');
  });

  it('C10 — sort doesn\'t mutate original', () => {
    const original = [...logs];
    sortLogsByRecent(logs);
    expect(logs[0].id).toBe(original[0].id);
  });
});

// ════════════════════════════════════════════════════════════════════
// D. COMPLIANCE REPORT GENERATION (10 tests)
// ════════════════════════════════════════════════════════════════════
describe('Compliance Report', () => {
  const logs: AuditLog[] = [
    { id: '1', timestamp: new Date('2025-01-10'), userId: 'u1', userName: 'DrA', action: 'view', resource: 'patient_phr', resourceId: 'r1', patientId: 'p1', success: true },
    { id: '2', timestamp: new Date('2025-01-15'), userId: 'u2', userName: 'DrB', action: 'update', resource: 'emr', resourceId: 'r2', patientId: 'p1', success: true },
    { id: '3', timestamp: new Date('2025-01-20'), userId: 'u1', userName: 'DrA', action: 'view', resource: 'patient_phr', resourceId: 'r3', patientId: 'p2', success: true },
    { id: '4', timestamp: new Date('2025-01-25'), userId: 'u3', userName: 'Hacker', action: 'access_denied', resource: 'emr', resourceId: 'r4', patientId: 'p1', success: false },
    { id: '5', timestamp: new Date('2025-01-28'), userId: 'u1', userName: 'DrA', action: 'create', resource: 'prescription', resourceId: 'r5', patientId: 'p3', success: true },
  ];

  it('D01 — counts total access events', () => {
    const report = generateComplianceReport(logs, new Date('2025-01-01'), new Date('2025-01-31'));
    expect(report.totalAccess).toBe(5);
  });

  it('D02 — counts access denied', () => {
    const report = generateComplianceReport(logs, new Date('2025-01-01'), new Date('2025-01-31'));
    expect(report.accessDenied).toBe(1);
  });

  it('D03 — counts unique patients', () => {
    const report = generateComplianceReport(logs, new Date('2025-01-01'), new Date('2025-01-31'));
    expect(report.uniquePatients).toBe(3);
  });

  it('D04 — counts unique users', () => {
    const report = generateComplianceReport(logs, new Date('2025-01-01'), new Date('2025-01-31'));
    expect(report.uniqueUsers).toBe(3);
  });

  it('D05 — groups by resource', () => {
    const report = generateComplianceReport(logs, new Date('2025-01-01'), new Date('2025-01-31'));
    expect(report.byResource['patient_phr']).toBe(2);
    expect(report.byResource['emr']).toBe(2);
    expect(report.byResource['prescription']).toBe(1);
  });

  it('D06 — groups by action', () => {
    const report = generateComplianceReport(logs, new Date('2025-01-01'), new Date('2025-01-31'));
    expect(report.byAction['view']).toBe(2);
    expect(report.byAction['update']).toBe(1);
    expect(report.byAction['access_denied']).toBe(1);
  });

  it('D07 — narrow date range filters correctly', () => {
    const report = generateComplianceReport(logs, new Date('2025-01-14'), new Date('2025-01-21'));
    expect(report.totalAccess).toBe(2);
  });

  it('D08 — empty range returns zeros', () => {
    const report = generateComplianceReport(logs, new Date('2025-06-01'), new Date('2025-06-30'));
    expect(report.totalAccess).toBe(0);
    expect(report.accessDenied).toBe(0);
    expect(report.uniquePatients).toBe(0);
  });

  it('D09 — byResource object is populated', () => {
    const report = generateComplianceReport(logs, new Date('2025-01-01'), new Date('2025-01-31'));
    expect(Object.keys(report.byResource).length).toBeGreaterThan(0);
  });

  it('D10 — all counts are non-negative', () => {
    const report = generateComplianceReport(logs, new Date('2025-01-01'), new Date('2025-01-31'));
    expect(report.totalAccess).toBeGreaterThanOrEqual(0);
    expect(report.accessDenied).toBeGreaterThanOrEqual(0);
    expect(report.uniquePatients).toBeGreaterThanOrEqual(0);
    expect(report.uniqueUsers).toBeGreaterThanOrEqual(0);
  });
});

// ════════════════════════════════════════════════════════════════════
// E. CSV EXPORT (8 tests)
// ════════════════════════════════════════════════════════════════════
describe('CSV Export', () => {
  const logs: AuditLog[] = [
    {
      id: '1', timestamp: new Date('2025-01-10T10:00:00Z'), userId: 'u1', userName: 'Dr. Smith',
      action: 'view', resource: 'patient_phr', resourceId: 'r1', patientId: 'p1',
      ipAddress: '192.168.1.1', success: true,
    },
    {
      id: '2', timestamp: new Date('2025-01-15T14:30:00Z'), userId: 'u2', userName: 'Dr. Jones',
      action: 'access_denied', resource: 'emr', resourceId: 'r2', patientId: 'p2',
      success: false, errorMessage: 'No consent',
    },
  ];

  it('E01 — CSV starts with header row', () => {
    const csv = exportToCSV(logs);
    expect(csv.startsWith('"Timestamp"')).toBe(true);
  });

  it('E02 — header contains all 9 columns', () => {
    const csv = exportToCSV(logs);
    const headerLine = csv.split('\n')[0];
    const headers = headerLine.split(',');
    expect(headers).toHaveLength(9);
  });

  it('E03 — includes data rows', () => {
    const csv = exportToCSV(logs);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3); // header + 2 rows
  });

  it('E04 — includes user names', () => {
    const csv = exportToCSV(logs);
    expect(csv).toContain('Dr. Smith');
    expect(csv).toContain('Dr. Jones');
  });

  it('E05 — includes action types', () => {
    const csv = exportToCSV(logs);
    expect(csv).toContain('view');
    expect(csv).toContain('access_denied');
  });

  it('E06 — success shows as Yes/No', () => {
    const csv = exportToCSV(logs);
    expect(csv).toContain('"Yes"');
    expect(csv).toContain('"No"');
  });

  it('E07 — error message included', () => {
    const csv = exportToCSV(logs);
    expect(csv).toContain('No consent');
  });

  it('E08 — empty logs produces header only', () => {
    const csv = exportToCSV([]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(1);
  });
});

// ════════════════════════════════════════════════════════════════════
// F. HIPAA/PDPA COMPLIANCE SPECIFIC (6 tests)
// ════════════════════════════════════════════════════════════════════
describe('HIPAA/PDPA Compliance', () => {
  it('F01 — patient data access log includes compliance metadata', () => {
    const log = createAuditLog('u1', 'Dr. Smith', 'view', 'patient_phr', 'p1', {
      patientId: 'p1',
      metadata: { purpose: 'treatment', complianceType: 'HIPAA/PDPA' },
    });
    expect(log.metadata?.complianceType).toBe('HIPAA/PDPA');
    expect(log.metadata?.purpose).toBe('treatment');
  });

  it('F02 — consent check logs denial', () => {
    const log = createAuditLog('u1', 'DrA', 'access_denied', 'consent_record', 'p1', {
      patientId: 'p1',
      success: false,
      errorMessage: 'No patient consent',
      metadata: { requestedDataTypes: ['emr', 'lab_result'], complianceType: 'PDPA' },
    });
    expect(log.success).toBe(false);
    expect(log.action).toBe('access_denied');
    expect(log.metadata?.complianceType).toBe('PDPA');
  });

  it('F03 — EMR activity has HIPAA metadata', () => {
    const log = createAuditLog('u1', 'DrA', 'create', 'emr', 'emr-001', {
      patientId: 'p1',
      metadata: { complianceType: 'HIPAA' },
    });
    expect(log.metadata?.complianceType).toBe('HIPAA');
  });

  it('F04 — prescription activity has DEA/HIPAA metadata', () => {
    const log = createAuditLog('u1', 'DrA', 'create', 'prescription', 'rx-001', {
      patientId: 'p1',
      metadata: { complianceType: 'DEA/HIPAA' },
    });
    expect(log.metadata?.complianceType).toBe('DEA/HIPAA');
  });

  it('F05 — living will access logged', () => {
    const log = createAuditLog('u1', 'DrA', 'view', 'e_living_will', 'lw-001', {
      patientId: 'p1',
    });
    expect(log.resource).toBe('e_living_will');
    expect(log.patientId).toBe('p1');
  });

  it('F06 — login/logout events use system resource', () => {
    const loginLog = createAuditLog('u1', 'DrA', 'login', 'system', 'u1', { success: true });
    const logoutLog = createAuditLog('u1', 'DrA', 'logout', 'system', 'u1', { success: true });
    expect(loginLog.resource).toBe('system');
    expect(logoutLog.resource).toBe('system');
  });
});
