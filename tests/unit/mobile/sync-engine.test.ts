/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — MOBILE SYNC & OFFLINE QUEUE UNIT TESTS
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: Sync conflict resolution, offline queue management,
 *        data merging strategies, last-write-wins vs server-wins
 * Architecture: SQLite (local) ←→ SyncEngine ←→ PostgreSQL (cloud)
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Offline Queue Item ───

type SyncStatus = 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed';
type OperationType = 'create' | 'update' | 'delete';

interface QueueItem {
  id: string;
  entity: string;
  entityId: string;
  operation: OperationType;
  payload: Record<string, any>;
  status: SyncStatus;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  lastAttempt?: string;
  errorMessage?: string;
}

// ─── Offline Queue Manager ───

class OfflineQueue {
  private items: QueueItem[] = [];

  enqueue(entity: string, entityId: string, operation: OperationType, payload: Record<string, any>): QueueItem {
    const item: QueueItem = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      entity,
      entityId,
      operation,
      payload,
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date().toISOString(),
    };
    this.items.push(item);
    return item;
  }

  dequeue(): QueueItem | undefined {
    return this.items.find(i => i.status === 'pending');
  }

  getPending(): QueueItem[] {
    return this.items.filter(i => i.status === 'pending');
  }

  getConflicts(): QueueItem[] {
    return this.items.filter(i => i.status === 'conflict');
  }

  getFailed(): QueueItem[] {
    return this.items.filter(i => i.status === 'failed');
  }

  markSynced(id: string): void {
    const item = this.items.find(i => i.id === id);
    if (item) item.status = 'synced';
  }

  markConflict(id: string, errorMessage: string): void {
    const item = this.items.find(i => i.id === id);
    if (item) {
      item.status = 'conflict';
      item.errorMessage = errorMessage;
    }
  }

  markFailed(id: string, errorMessage: string): void {
    const item = this.items.find(i => i.id === id);
    if (item) {
      item.retryCount++;
      item.lastAttempt = new Date().toISOString();
      item.errorMessage = errorMessage;
      if (item.retryCount >= item.maxRetries) {
        item.status = 'failed';
      }
    }
  }

  retry(id: string): boolean {
    const item = this.items.find(i => i.id === id);
    if (!item || item.retryCount >= item.maxRetries) return false;
    item.status = 'pending';
    return true;
  }

  clear(): void {
    this.items = this.items.filter(i => i.status !== 'synced');
  }

  get size(): number {
    return this.items.length;
  }

  get pendingCount(): number {
    return this.getPending().length;
  }
}

// ─── Conflict Resolution Strategies ───

type ConflictStrategy = 'last-write-wins' | 'server-wins' | 'client-wins' | 'manual';

interface VersionedRecord {
  id: string;
  data: Record<string, any>;
  version: number;
  updatedAt: string;
}

function resolveConflict(
  local: VersionedRecord,
  server: VersionedRecord,
  strategy: ConflictStrategy,
): VersionedRecord {
  switch (strategy) {
    case 'last-write-wins':
      return new Date(local.updatedAt) > new Date(server.updatedAt) ? local : server;
    case 'server-wins':
      return server;
    case 'client-wins':
      return local;
    case 'manual':
      throw new Error('Manual resolution required');
    default:
      return server; // Default: server wins
  }
}

function mergeRecords(
  local: Record<string, any>,
  server: Record<string, any>,
): Record<string, any> {
  // Deep merge: server fields win on collision, local-only fields preserved
  const merged = { ...local };
  for (const [key, value] of Object.entries(server)) {
    if (value !== undefined && value !== null) {
      merged[key] = value;
    }
  }
  return merged;
}

// ─── Sync Delta Calculation ───

function calculateDelta(
  localRecords: Record<string, VersionedRecord>,
  serverRecords: Record<string, VersionedRecord>,
): { toUpload: string[]; toDownload: string[]; conflicts: string[] } {
  const toUpload: string[] = [];
  const toDownload: string[] = [];
  const conflicts: string[] = [];

  // Check local records against server
  for (const [id, local] of Object.entries(localRecords)) {
    const server = serverRecords[id];
    if (!server) {
      toUpload.push(id);
    } else if (local.version > server.version) {
      toUpload.push(id);
    } else if (local.version < server.version) {
      toDownload.push(id);
    } else if (local.updatedAt !== server.updatedAt) {
      conflicts.push(id);
    }
  }

  // Check server-only records
  for (const id of Object.keys(serverRecords)) {
    if (!localRecords[id]) {
      toDownload.push(id);
    }
  }

  return { toUpload, toDownload, conflicts };
}

// ═══════════════════════════════════════════════
// TEST SUITES
// ═══════════════════════════════════════════════

// ─────────────────────────────────────────────
// A. Offline Queue Operations
// ─────────────────────────────────────────────

describe('Mobile Sync — Offline Queue', () => {
  let queue: OfflineQueue;

  beforeEach(() => {
    queue = new OfflineQueue();
  });

  it('A01 — enqueue creates pending item', () => {
    const item = queue.enqueue('appointment', 'apt-001', 'create', { title: 'Checkup' });
    expect(item.status).toBe('pending');
    expect(item.entity).toBe('appointment');
    expect(item.operation).toBe('create');
    expect(queue.size).toBe(1);
  });

  it('A02 — dequeue returns first pending item', () => {
    queue.enqueue('appointment', 'apt-001', 'create', {});
    queue.enqueue('phr', 'phr-001', 'update', {});
    const item = queue.dequeue();
    expect(item?.entity).toBe('appointment');
  });

  it('A03 — markSynced changes status', () => {
    const item = queue.enqueue('appointment', 'apt-001', 'create', {});
    queue.markSynced(item.id);
    expect(queue.pendingCount).toBe(0);
  });

  it('A04 — markConflict sets error message', () => {
    const item = queue.enqueue('phr', 'phr-001', 'update', {});
    queue.markConflict(item.id, 'Version mismatch');
    expect(queue.getConflicts()).toHaveLength(1);
    expect(queue.getConflicts()[0].errorMessage).toBe('Version mismatch');
  });

  it('A05 — markFailed increments retry count', () => {
    const item = queue.enqueue('appointment', 'apt-001', 'create', {});
    queue.markFailed(item.id, 'Network error');
    expect(item.retryCount).toBe(1);
    expect(item.status).toBe('pending'); // Not yet max retries
  });

  it('A06 — fails permanently after max retries', () => {
    const item = queue.enqueue('appointment', 'apt-001', 'create', {});
    queue.markFailed(item.id, 'Error 1');
    queue.markFailed(item.id, 'Error 2');
    queue.markFailed(item.id, 'Error 3');
    expect(item.status).toBe('failed');
    expect(queue.getFailed()).toHaveLength(1);
  });

  it('A07 — retry resets status to pending', () => {
    const item = queue.enqueue('appointment', 'apt-001', 'create', {});
    queue.markFailed(item.id, 'Error');
    expect(queue.retry(item.id)).toBe(true);
    expect(item.status).toBe('pending');
  });

  it('A08 — retry returns false after max retries', () => {
    const item = queue.enqueue('appointment', 'apt-001', 'create', {});
    queue.markFailed(item.id, 'E1');
    queue.markFailed(item.id, 'E2');
    queue.markFailed(item.id, 'E3');
    expect(queue.retry(item.id)).toBe(false);
  });

  it('A09 — clear removes synced items only', () => {
    const i1 = queue.enqueue('a', '1', 'create', {});
    const i2 = queue.enqueue('b', '2', 'update', {});
    queue.markSynced(i1.id);
    queue.clear();
    expect(queue.size).toBe(1);
    expect(queue.pendingCount).toBe(1);
  });

  it('A10 — multiple operations on same entity', () => {
    queue.enqueue('phr', 'phr-001', 'update', { allergies: ['Penicillin'] });
    queue.enqueue('phr', 'phr-001', 'update', { medications: ['Metformin'] });
    expect(queue.pendingCount).toBe(2);
  });
});

// ─────────────────────────────────────────────
// B. Conflict Resolution
// ─────────────────────────────────────────────

describe('Mobile Sync — Conflict Resolution', () => {
  const local: VersionedRecord = {
    id: 'rec-001',
    data: { name: 'Local Edit', bp: '130/85' },
    version: 3,
    updatedAt: '2024-06-15T10:30:00Z',
  };

  const server: VersionedRecord = {
    id: 'rec-001',
    data: { name: 'Server Edit', bp: '120/80' },
    version: 3,
    updatedAt: '2024-06-15T10:25:00Z',
  };

  it('B01 — last-write-wins picks local (newer)', () => {
    const result = resolveConflict(local, server, 'last-write-wins');
    expect(result.data.name).toBe('Local Edit');
  });

  it('B02 — last-write-wins picks server (when server is newer)', () => {
    const newerServer = { ...server, updatedAt: '2024-06-15T11:00:00Z' };
    const result = resolveConflict(local, newerServer, 'last-write-wins');
    expect(result.data.name).toBe('Server Edit');
  });

  it('B03 — server-wins always picks server', () => {
    const result = resolveConflict(local, server, 'server-wins');
    expect(result.data.name).toBe('Server Edit');
  });

  it('B04 — client-wins always picks local', () => {
    const result = resolveConflict(local, server, 'client-wins');
    expect(result.data.name).toBe('Local Edit');
  });

  it('B05 — manual throws for user intervention', () => {
    expect(() => resolveConflict(local, server, 'manual')).toThrow('Manual resolution required');
  });
});

// ─────────────────────────────────────────────
// C. Record Merging
// ─────────────────────────────────────────────

describe('Mobile Sync — Record Merging', () => {
  it('C01 — server values overwrite local', () => {
    const merged = mergeRecords({ name: 'Local', bp: '130/85' }, { name: 'Server' });
    expect(merged.name).toBe('Server');
  });

  it('C02 — local-only fields preserved', () => {
    const merged = mergeRecords({ name: 'Local', localField: 'keep' }, { name: 'Server' });
    expect(merged.localField).toBe('keep');
  });

  it('C03 — server null does not overwrite local', () => {
    const merged = mergeRecords({ name: 'Local' }, { name: null as any });
    expect(merged.name).toBe('Local');
  });

  it('C04 — server undefined does not overwrite local', () => {
    const merged = mergeRecords({ name: 'Local', bp: '130/85' }, { bp: undefined as any });
    expect(merged.bp).toBe('130/85');
  });

  it('C05 — merge appointment with vitals', () => {
    const merged = mergeRecords(
      { id: 'apt-001', status: 'confirmed', notes: 'patient arrived' },
      { id: 'apt-001', status: 'in_progress', doctor_notes: 'examining' },
    );
    expect(merged.status).toBe('in_progress'); // server wins
    expect(merged.notes).toBe('patient arrived'); // local preserved
    expect(merged.doctor_notes).toBe('examining'); // server adds
  });
});

// ─────────────────────────────────────────────
// D. Sync Delta Calculation
// ─────────────────────────────────────────────

describe('Mobile Sync — Delta Calculation', () => {
  it('D01 — local-only records need upload', () => {
    const local = {
      'rec-001': { id: 'rec-001', data: {}, version: 1, updatedAt: '2024-06-15T10:00:00Z' },
    };
    const server = {};
    const delta = calculateDelta(local, server);
    expect(delta.toUpload).toContain('rec-001');
    expect(delta.toDownload).toHaveLength(0);
  });

  it('D02 — server-only records need download', () => {
    const local = {};
    const server = {
      'rec-002': { id: 'rec-002', data: {}, version: 1, updatedAt: '2024-06-15T10:00:00Z' },
    };
    const delta = calculateDelta(local, server);
    expect(delta.toDownload).toContain('rec-002');
    expect(delta.toUpload).toHaveLength(0);
  });

  it('D03 — higher local version → upload', () => {
    const local = {
      'rec-001': { id: 'rec-001', data: {}, version: 3, updatedAt: '2024-06-15T10:00:00Z' },
    };
    const server = {
      'rec-001': { id: 'rec-001', data: {}, version: 2, updatedAt: '2024-06-15T09:00:00Z' },
    };
    const delta = calculateDelta(local, server);
    expect(delta.toUpload).toContain('rec-001');
  });

  it('D04 — higher server version → download', () => {
    const local = {
      'rec-001': { id: 'rec-001', data: {}, version: 1, updatedAt: '2024-06-15T09:00:00Z' },
    };
    const server = {
      'rec-001': { id: 'rec-001', data: {}, version: 3, updatedAt: '2024-06-15T10:00:00Z' },
    };
    const delta = calculateDelta(local, server);
    expect(delta.toDownload).toContain('rec-001');
  });

  it('D05 — same version but different timestamps → conflict', () => {
    const local = {
      'rec-001': { id: 'rec-001', data: {}, version: 2, updatedAt: '2024-06-15T10:30:00Z' },
    };
    const server = {
      'rec-001': { id: 'rec-001', data: {}, version: 2, updatedAt: '2024-06-15T10:25:00Z' },
    };
    const delta = calculateDelta(local, server);
    expect(delta.conflicts).toContain('rec-001');
  });

  it('D06 — same version and timestamp → no action needed', () => {
    const ts = '2024-06-15T10:00:00Z';
    const local = { 'rec-001': { id: 'rec-001', data: {}, version: 2, updatedAt: ts } };
    const server = { 'rec-001': { id: 'rec-001', data: {}, version: 2, updatedAt: ts } };
    const delta = calculateDelta(local, server);
    expect(delta.toUpload).toHaveLength(0);
    expect(delta.toDownload).toHaveLength(0);
    expect(delta.conflicts).toHaveLength(0);
  });

  it('D07 — mixed scenario', () => {
    const local: Record<string, VersionedRecord> = {
      'rec-001': { id: 'rec-001', data: {}, version: 3, updatedAt: '2024-06-15T10:00:00Z' }, // upload
      'rec-002': { id: 'rec-002', data: {}, version: 1, updatedAt: '2024-06-15T09:00:00Z' }, // download
      'rec-003': { id: 'rec-003', data: {}, version: 1, updatedAt: '2024-06-15T10:00:00Z' }, // upload (local only)
    };
    const server: Record<string, VersionedRecord> = {
      'rec-001': { id: 'rec-001', data: {}, version: 2, updatedAt: '2024-06-15T09:00:00Z' },
      'rec-002': { id: 'rec-002', data: {}, version: 3, updatedAt: '2024-06-15T10:00:00Z' },
      'rec-004': { id: 'rec-004', data: {}, version: 1, updatedAt: '2024-06-15T10:00:00Z' }, // download (server only)
    };
    const delta = calculateDelta(local, server);
    expect(delta.toUpload).toContain('rec-001');
    expect(delta.toUpload).toContain('rec-003');
    expect(delta.toDownload).toContain('rec-002');
    expect(delta.toDownload).toContain('rec-004');
  });
});

// ─────────────────────────────────────────────
// E. Sync Store State
// ─────────────────────────────────────────────

describe('Mobile Sync — Store State', () => {
  interface SyncState {
    isSyncing: boolean;
    lastSyncAt: string | null;
    pendingChanges: number;
    conflicts: number;
    isOnline: boolean;
  }

  function createInitialSyncState(): SyncState {
    return {
      isSyncing: false,
      lastSyncAt: null,
      pendingChanges: 0,
      conflicts: 0,
      isOnline: true,
    };
  }

  it('E01 — initial state is idle with no pending', () => {
    const state = createInitialSyncState();
    expect(state.isSyncing).toBe(false);
    expect(state.pendingChanges).toBe(0);
    expect(state.conflicts).toBe(0);
    expect(state.lastSyncAt).toBeNull();
  });

  it('E02 — state tracks online status', () => {
    const state = createInitialSyncState();
    expect(state.isOnline).toBe(true);
    state.isOnline = false;
    expect(state.isOnline).toBe(false);
  });

  it('E03 — state tracks last sync time', () => {
    const state = createInitialSyncState();
    state.lastSyncAt = new Date().toISOString();
    expect(state.lastSyncAt).toBeTruthy();
    expect(new Date(state.lastSyncAt!).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('E04 — state tracks pending change count', () => {
    const state = createInitialSyncState();
    state.pendingChanges = 5;
    state.conflicts = 2;
    expect(state.pendingChanges + state.conflicts).toBe(7);
  });
});
