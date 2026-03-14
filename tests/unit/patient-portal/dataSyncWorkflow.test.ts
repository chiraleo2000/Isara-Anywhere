// ============================================================================
// Data Sync & Offline Workflow Tests
// Based on: Processes/Data_Sync_Documentation.md
// Tests: Sync states, conflict resolution, offline queue, retry logic
// ============================================================================

import { describe, it, expect } from 'vitest';

// --- Types ---

type SyncStatus = 'synced' | 'pending' | 'syncing' | 'conflict' | 'error';
type SyncDirection = 'upload' | 'download' | 'bidirectional';
type ConflictResolution = 'server_wins' | 'client_wins' | 'manual';

interface SyncRecord {
  id: string;
  entityType: string;
  entityId: string;
  status: SyncStatus;
  direction: SyncDirection;
  localVersion: number;
  serverVersion: number;
  lastSyncedAt?: string;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

interface OfflineAction {
  id: string;
  action: 'create' | 'update' | 'delete';
  entityType: string;
  payload: Record<string, unknown>;
  createdAt: string;
  synced: boolean;
}

// --- Constants ---

const SYNC_ENTITY_TYPES = [
  'appointment', 'patient_record', 'vital_signs', 'prescription',
  'emr', 'notification', 'consent', 'profile',
];

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // ms

// --- Helper Functions ---

function hasConflict(record: SyncRecord): boolean {
  return record.localVersion !== record.serverVersion && record.status !== 'synced';
}

function resolveConflict(record: SyncRecord, strategy: ConflictResolution): SyncRecord {
  if (strategy === 'server_wins') {
    return { ...record, localVersion: record.serverVersion, status: 'synced' };
  }
  if (strategy === 'client_wins') {
    return { ...record, serverVersion: record.localVersion, status: 'pending' };
  }
  return { ...record, status: 'conflict' };
}

function canRetry(record: SyncRecord): boolean {
  return record.retryCount < record.maxRetries && record.status === 'error';
}

function getRetryDelay(retryCount: number): number {
  return RETRY_DELAYS[Math.min(retryCount, RETRY_DELAYS.length - 1)];
}

function getPendingActions(actions: OfflineAction[]): OfflineAction[] {
  return actions.filter(a => !a.synced);
}

function sortActionsByPriority(actions: OfflineAction[]): OfflineAction[] {
  const priority: Record<string, number> = { create: 0, update: 1, delete: 2 };
  return [...actions].sort((a, b) => (priority[a.action] ?? 1) - (priority[b.action] ?? 1));
}

function generateSyncId(): string {
  return `SYNC-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

function isSyncStale(lastSyncedAt: string, maxAge: number): boolean {
  const last = new Date(lastSyncedAt).getTime();
  return Date.now() - last > maxAge;
}

function calculateSyncProgress(records: SyncRecord[]): number {
  if (records.length === 0) return 100;
  const synced = records.filter(r => r.status === 'synced').length;
  return Math.round((synced / records.length) * 100);
}

function getSyncSummary(records: SyncRecord[]): Record<SyncStatus, number> {
  const summary: Record<SyncStatus, number> = { synced: 0, pending: 0, syncing: 0, conflict: 0, error: 0 };
  for (const r of records) {
    summary[r.status]++;
  }
  return summary;
}

// --- Tests ---

describe('Data Sync & Offline Workflow (Process: Data_Sync_Documentation.md)', () => {

  describe('A — Sync Entity Types', () => {
    it('A01 — 8 entity types', () => expect(SYNC_ENTITY_TYPES).toHaveLength(8));
    it('A02 — includes appointments', () => expect(SYNC_ENTITY_TYPES).toContain('appointment'));
    it('A03 — includes EMR', () => expect(SYNC_ENTITY_TYPES).toContain('emr'));
    it('A04 — includes consent', () => expect(SYNC_ENTITY_TYPES).toContain('consent'));
  });

  describe('B — Conflict Detection', () => {
    it('B01 — same versions no conflict', () => {
      const record: SyncRecord = {
        id: '1', entityType: 'appointment', entityId: 'A1', status: 'synced',
        direction: 'bidirectional', localVersion: 5, serverVersion: 5,
        retryCount: 0, maxRetries: MAX_RETRIES,
      };
      expect(hasConflict(record)).toBe(false);
    });
    it('B02 — different versions = conflict', () => {
      const record: SyncRecord = {
        id: '1', entityType: 'appointment', entityId: 'A1', status: 'pending',
        direction: 'bidirectional', localVersion: 5, serverVersion: 6,
        retryCount: 0, maxRetries: MAX_RETRIES,
      };
      expect(hasConflict(record)).toBe(true);
    });
    it('B03 — already synced no conflict even with version diff', () => {
      const record: SyncRecord = {
        id: '1', entityType: 'appointment', entityId: 'A1', status: 'synced',
        direction: 'bidirectional', localVersion: 5, serverVersion: 6,
        retryCount: 0, maxRetries: MAX_RETRIES,
      };
      expect(hasConflict(record)).toBe(false);
    });
  });

  describe('C — Conflict Resolution', () => {
    const base: SyncRecord = {
      id: '1', entityType: 'emr', entityId: 'E1', status: 'conflict',
      direction: 'bidirectional', localVersion: 5, serverVersion: 7,
      retryCount: 0, maxRetries: MAX_RETRIES,
    };

    it('C01 — server wins: local updated to server version', () => {
      const resolved = resolveConflict(base, 'server_wins');
      expect(resolved.localVersion).toBe(7);
      expect(resolved.status).toBe('synced');
    });
    it('C02 — client wins: server set to local, goes pending', () => {
      const resolved = resolveConflict(base, 'client_wins');
      expect(resolved.serverVersion).toBe(5);
      expect(resolved.status).toBe('pending');
    });
    it('C03 — manual stays in conflict', () => {
      const resolved = resolveConflict(base, 'manual');
      expect(resolved.status).toBe('conflict');
    });
  });

  describe('D — Retry Logic', () => {
    it('D01 — can retry if under max', () => {
      const r: SyncRecord = {
        id: '1', entityType: 'x', entityId: 'x', status: 'error',
        direction: 'upload', localVersion: 1, serverVersion: 1,
        retryCount: 1, maxRetries: 3,
      };
      expect(canRetry(r)).toBe(true);
    });
    it('D02 — cannot retry at max retries', () => {
      const r: SyncRecord = {
        id: '1', entityType: 'x', entityId: 'x', status: 'error',
        direction: 'upload', localVersion: 1, serverVersion: 1,
        retryCount: 3, maxRetries: 3,
      };
      expect(canRetry(r)).toBe(false);
    });
    it('D03 — cannot retry non-error status', () => {
      const r: SyncRecord = {
        id: '1', entityType: 'x', entityId: 'x', status: 'pending',
        direction: 'upload', localVersion: 1, serverVersion: 1,
        retryCount: 0, maxRetries: 3,
      };
      expect(canRetry(r)).toBe(false);
    });
    it('D04 — exponential backoff delays', () => {
      expect(getRetryDelay(0)).toBe(1000);
      expect(getRetryDelay(1)).toBe(5000);
      expect(getRetryDelay(2)).toBe(15000);
    });
    it('D05 — max retry delay capped', () => {
      expect(getRetryDelay(5)).toBe(15000);
    });
  });

  describe('E — Offline Queue', () => {
    const actions: OfflineAction[] = [
      { id: '1', action: 'create', entityType: 'appointment', payload: {}, createdAt: '2026-01-01', synced: false },
      { id: '2', action: 'update', entityType: 'profile', payload: {}, createdAt: '2026-01-01', synced: true },
      { id: '3', action: 'delete', entityType: 'notification', payload: {}, createdAt: '2026-01-01', synced: false },
    ];

    it('E01 — pending count', () => expect(getPendingActions(actions)).toHaveLength(2));
    it('E02 — sort by priority: create first, delete last', () => {
      const sorted = sortActionsByPriority(actions);
      expect(sorted[0].action).toBe('create');
      expect(sorted.at(-1)?.action).toBe('delete');
    });
  });

  describe('F — Sync Progress', () => {
    it('F01 — all synced = 100%', () => {
      const records: SyncRecord[] = [
        { id: '1', entityType: 'x', entityId: 'x', status: 'synced', direction: 'upload', localVersion: 1, serverVersion: 1, retryCount: 0, maxRetries: 3 },
      ];
      expect(calculateSyncProgress(records)).toBe(100);
    });
    it('F02 — half synced = 50%', () => {
      const records: SyncRecord[] = [
        { id: '1', entityType: 'x', entityId: 'x', status: 'synced', direction: 'upload', localVersion: 1, serverVersion: 1, retryCount: 0, maxRetries: 3 },
        { id: '2', entityType: 'y', entityId: 'y', status: 'pending', direction: 'upload', localVersion: 1, serverVersion: 1, retryCount: 0, maxRetries: 3 },
      ];
      expect(calculateSyncProgress(records)).toBe(50);
    });
    it('F03 — empty = 100%', () => expect(calculateSyncProgress([])).toBe(100));
  });

  describe('G — Sync Summary', () => {
    it('G01 — summary counts per status', () => {
      const records: SyncRecord[] = [
        { id: '1', entityType: 'x', entityId: 'x', status: 'synced', direction: 'upload', localVersion: 1, serverVersion: 1, retryCount: 0, maxRetries: 3 },
        { id: '2', entityType: 'x', entityId: 'x', status: 'synced', direction: 'upload', localVersion: 1, serverVersion: 1, retryCount: 0, maxRetries: 3 },
        { id: '3', entityType: 'x', entityId: 'x', status: 'error', direction: 'upload', localVersion: 1, serverVersion: 1, retryCount: 3, maxRetries: 3 },
      ];
      const summary = getSyncSummary(records);
      expect(summary.synced).toBe(2);
      expect(summary.error).toBe(1);
      expect(summary.pending).toBe(0);
    });
  });

  describe('H — Sync ID Generation', () => {
    it('H01 — starts with SYNC-', () => expect(generateSyncId()).toMatch(/^SYNC-/));
    it('H02 — unique IDs', () => {
      const ids = new Set(Array.from({ length: 20 }, () => generateSyncId()));
      expect(ids.size).toBe(20);
    });
  });

  describe('I — Stale Check', () => {
    it('I01 — recent sync is not stale', () => {
      expect(isSyncStale(new Date().toISOString(), 60000)).toBe(false);
    });
    it('I02 — old sync is stale', () => {
      const old = new Date(Date.now() - 120000).toISOString();
      expect(isSyncStale(old, 60000)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // J — CONTINUOUS WORKFLOW: Offline → Queue → Sync → Conflict → Resolve
  // ═══════════════════════════════════════════════════════════════════════════
  describe('J — Offline-to-Sync Lifecycle Chain', () => {
    const offlineActions: OfflineAction[] = [];
    const syncRecords: SyncRecord[] = [];

    it('J01 — Step 1: User creates appointment offline', () => {
      offlineActions.push({
        id: 'OA-001',
        action: 'create',
        entityType: 'appointment',
        payload: { date: '2026-06-20', doctor: 'DOC-001' },
        createdAt: new Date().toISOString(),
        synced: false,
      });
      expect(offlineActions).toHaveLength(1);
    });

    it('J02 — Step 2: User updates profile offline', () => {
      offlineActions.push({
        id: 'OA-002',
        action: 'update',
        entityType: 'user',
        payload: { phone: '0899999999' },
        createdAt: new Date().toISOString(),
        synced: false,
      });
      expect(offlineActions).toHaveLength(2);
    });

    it('J03 — Step 3: Get pending actions', () => {
      const pending = getPendingActions(offlineActions);
      expect(pending).toHaveLength(2);
    });

    it('J04 — Step 4: Sort by priority', () => {
      const sorted = sortActionsByPriority(offlineActions);
      expect(sorted).toHaveLength(2);
    });

    it('J05 — Step 5: Network restored → create sync records', () => {
      for (const action of offlineActions) {
        syncRecords.push({
          id: generateSyncId(),
          entityType: action.entityType,
          entityId: action.id,
          status: 'pending',
          direction: 'upload',
          localVersion: 1,
          serverVersion: 0,
          retryCount: 0,
          maxRetries: MAX_RETRIES,
        });
      }
      expect(syncRecords).toHaveLength(2);
    });

    it('J06 — Step 6: Sync progress at 0%', () => {
      const progress = calculateSyncProgress(syncRecords);
      expect(progress).toBe(0);
    });

    it('J07 — Step 7: First record syncs successfully', () => {
      syncRecords[0].status = 'synced';
      syncRecords[0].lastSyncedAt = new Date().toISOString();
      expect(syncRecords[0].status).toBe('synced');
    });

    it('J08 — Step 8: Progress at 50%', () => {
      expect(calculateSyncProgress(syncRecords)).toBe(50);
    });

    it('J09 — Step 9: Second record hits conflict', () => {
      syncRecords[1].status = 'conflict';
      syncRecords[1].serverVersion = 2;
      expect(hasConflict(syncRecords[1])).toBe(true);
    });

    it('J10 — Step 10: Resolve conflict with server_wins', () => {
      const resolved = resolveConflict(syncRecords[1], 'server_wins');
      expect(resolved.status).toBe('synced');
      syncRecords[1] = resolved;
    });

    it('J11 — Step 11: Progress at 100%', () => {
      expect(calculateSyncProgress(syncRecords)).toBe(100);
    });

    it('J12 — Step 12: Summary shows all synced', () => {
      const summary = getSyncSummary(syncRecords);
      expect(summary.synced).toBe(2);
    });

    it('J13 — Final: Mark offline actions as synced', () => {
      for (const action of offlineActions) action.synced = true;
      expect(getPendingActions(offlineActions)).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // K — RETRY & ERROR RECOVERY CHAIN
  // ═══════════════════════════════════════════════════════════════════════════
  describe('K — Retry & Error Recovery Chain', () => {
    const record: SyncRecord = {
      id: generateSyncId(),
      entityType: 'emr',
      entityId: 'EMR-001',
      status: 'error',
      direction: 'upload',
      localVersion: 1,
      serverVersion: 1,
      retryCount: 0,
      maxRetries: MAX_RETRIES,
      error: 'Network timeout',
    };

    it('K01 — Step 1: Initial error state', () => {
      expect(record.status).toBe('error');
      expect(record.error).toBeTruthy();
    });

    it('K02 — Step 2: Can retry (0/3)', () => {
      expect(canRetry(record)).toBe(true);
    });

    it('K03 — Step 3: First retry delay = 1s', () => {
      expect(getRetryDelay(0)).toBe(RETRY_DELAYS[0]);
    });

    it('K04 — Step 4: Retry 1 fails', () => {
      record.retryCount = 1;
      expect(canRetry(record)).toBe(true);
      expect(getRetryDelay(1)).toBe(RETRY_DELAYS[1]);
    });

    it('K05 — Step 5: Retry 2 fails', () => {
      record.retryCount = 2;
      expect(canRetry(record)).toBe(true);
      expect(getRetryDelay(2)).toBe(RETRY_DELAYS[2]);
    });

    it('K06 — Step 6: Retry 3 succeeds', () => {
      record.retryCount = 3;
      record.status = 'synced';
      record.lastSyncedAt = new Date().toISOString();
      record.error = undefined;
      expect(record.status).toBe('synced');
    });

    it('K07 — Final: Max retries exhausted cannot retry', () => {
      const failed: SyncRecord = { ...record, status: 'error', retryCount: 3 };
      expect(canRetry(failed)).toBe(false);
    });
  });
});
