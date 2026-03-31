/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — SYNC STORE  (Zustand)
 * ═══════════════════════════════════════════════════════════════════════
 * Reactive state for offline-first data sync.
 *
 * Responsibilities:
 *   • Track online/offline connectivity state
 *   • Expose pending changeset count for UI badges
 *   • Drive the sync lifecycle:  enqueue → process → pull → resolve
 *   • Keep per-entity "last synced" timestamps for freshness indicators
 * ═══════════════════════════════════════════════════════════════════════
 */

import { create } from 'zustand';
import type { SyncEntity, SyncQueueItem } from '@izara/shared/db/schema';
import {
  enqueueChange,
  getPendingItems,
  markSynced,
  markSyncing,
  recordFailure,
  markConflict,
  getQueueStats,
  clearSyncedItems,
  updateSyncMetadata,
  getSyncMetadata,
} from '@izara/shared/db/offlineQueueRepository';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface ConflictItem {
  queueItem: SyncQueueItem;
  serverVersion: Record<string, unknown>;
  localVersion: Record<string, unknown>;
  resolvedAt?: string;
}

export interface EntitySyncStatus {
  entity: SyncEntity;
  lastSyncedAt: string | null;
  pendingCount: number;
  isSyncing: boolean;
}

interface SyncState {
  // ── Connectivity ──
  isOnline: boolean;
  /** Last time we confirmed connectivity (ISO string). */
  lastConnectivityCheck: string | null;

  // ── Queue ──
  pendingCount: number;
  syncingCount: number;
  failedCount: number;

  // ── Active Sync ──
  isSyncing: boolean;
  currentEntity: SyncEntity | null;
  syncProgress: number;          // 0–1
  lastSyncAt: string | null;
  lastError: string | null;

  // ── Conflicts ──
  conflicts: ConflictItem[];

  // ── Per-entity status ──
  entityStatus: Record<string, EntitySyncStatus>;
}

interface SyncActions {
  // ── Connectivity ──
  setOnline: (online: boolean) => void;

  // ── Queue management ──
  enqueue: (
    entity: SyncEntity,
    entityId: string,
    operation: 'create' | 'update' | 'delete',
    payload: Record<string, unknown>,
  ) => Promise<string>;

  refreshQueueStats: () => Promise<void>;

  // ── Sync lifecycle ──
  /**
   * Push all pending local changes to the server.
   * @param pushFn  Callback that actually sends a single item to the API.
   *                Must throw on failure.
   */
  processQueue: (
    pushFn: (item: SyncQueueItem) => Promise<{ conflict?: boolean; serverVersion?: Record<string, unknown> }>,
  ) => Promise<void>;

  /**
   * Pull latest data from the server for a given entity.
   * @param pullFn  Callback that fetches the latest records.
   */
  pullFromServer: (
    entity: SyncEntity,
    pullFn: () => Promise<{ records: Record<string, unknown>[]; serverVersion: number }>,
    applyFn: (records: Record<string, unknown>[]) => Promise<void>,
  ) => Promise<void>;

  // ── Conflict resolution ──
  resolveConflict: (
    queueItemId: string,
    resolution: 'keep-local' | 'keep-server' | 'merge',
    mergedPayload?: Record<string, unknown>,
  ) => Promise<void>;
  clearResolvedConflicts: () => void;

  // ── Cleanup ──
  cleanupSyncedItems: () => Promise<void>;

  // ── Full sync cycle ──
  /**
   * Convenience method: pushes pending → pulls each entity → cleans up.
   */
  fullSync: (
    pushFn: (item: SyncQueueItem) => Promise<{ conflict?: boolean; serverVersion?: Record<string, unknown> }>,
    pullMap: Record<SyncEntity, {
      pull: () => Promise<{ records: Record<string, unknown>[]; serverVersion: number }>;
      apply: (records: Record<string, unknown>[]) => Promise<void>;
    }>,
  ) => Promise<void>;
}

type SyncStore = SyncState & SyncActions;

// ─────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────

export const useSyncStore = create<SyncStore>((set, get) => ({
  // ── Initial State ──
  isOnline: true,
  lastConnectivityCheck: null,
  pendingCount: 0,
  syncingCount: 0,
  failedCount: 0,
  isSyncing: false,
  currentEntity: null,
  syncProgress: 0,
  lastSyncAt: null,
  lastError: null,
  conflicts: [],
  entityStatus: {},

  // ── Connectivity ──
  setOnline: (online) => {
    set({ isOnline: online, lastConnectivityCheck: new Date().toISOString() });
    // Auto-trigger sync when coming back online
    if (online && get().pendingCount > 0 && !get().isSyncing) {
      // The actual trigger will be driven by the component layer
      // which calls fullSync with proper push/pull callbacks.
    }
  },

  // ── Enqueue ──
  enqueue: async (entity, entityId, operation, payload) => {
    const id = await enqueueChange(entity, entityId, operation, payload);
    await get().refreshQueueStats();
    return id;
  },

  // ── Stats ──
  refreshQueueStats: async () => {
    const stats = await getQueueStats();
    set({
      pendingCount: stats.pending,
      syncingCount: stats.syncing,
      failedCount: stats.failed,
    });
  },

  // ── Process Queue (Push) ──
  processQueue: async (pushFn) => {
    if (get().isSyncing || !get().isOnline) return;
    set({ isSyncing: true, lastError: null, syncProgress: 0 });

    try {
      const pending = await getPendingItems();
      if (pending.length === 0) {
        set({ isSyncing: false });
        return;
      }

      let processed = 0;
      for (const item of pending) {
        try {
          await markSyncing(item.id);
          set({ syncingCount: get().syncingCount + 1, currentEntity: item.entity as SyncEntity });

          const result = await pushFn(item);

          if (result.conflict) {
            await markConflict(item.id, 'Server version differs');
            set((s) => ({
              conflicts: [
                ...s.conflicts,
                {
                  queueItem: item,
                  serverVersion: result.serverVersion ?? {},
                  localVersion: JSON.parse(item.payload_json),
                },
              ],
            }));
          } else {
            await markSynced(item.id);
            await updateSyncMetadata(item.entity as SyncEntity);
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unknown push error';
          await recordFailure(item.id, msg);
        }

        processed++;
        set({ syncProgress: processed / pending.length });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Queue processing failed';
      set({ lastError: msg });
    } finally {
      set({ isSyncing: false, currentEntity: null, syncProgress: 1 });
      await get().refreshQueueStats();
    }
  },

  // ── Pull from Server ──
  pullFromServer: async (entity, pullFn, applyFn) => {
    if (!get().isOnline) return;
    set({ currentEntity: entity });

    try {
      const { records, serverVersion } = await pullFn();
      await applyFn(records);
      await updateSyncMetadata(entity, serverVersion);

      const meta = await getSyncMetadata(entity);
      set((s) => ({
        entityStatus: {
          ...s.entityStatus,
          [entity]: {
            entity,
            lastSyncedAt: meta?.last_synced_at ?? null,
            pendingCount: 0,
            isSyncing: false,
          },
        },
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Pull failed for ${entity}`;
      set({ lastError: msg });
    } finally {
      set({ currentEntity: null });
    }
  },

  // ── Conflict Resolution ──
  resolveConflict: async (queueItemId, resolution, mergedPayload) => {
    const conflict = get().conflicts.find((c) => c.queueItem.id === queueItemId);
    if (!conflict) return;

    if (resolution === 'keep-server') {
      // Discard local change
      await markSynced(queueItemId);
    } else if (resolution === 'keep-local') {
      // Re-enqueue the local version as a new change
      const item = conflict.queueItem;
      await markSynced(queueItemId);
      await enqueueChange(
        item.entity as SyncEntity,
        item.entity_id,
        item.operation as 'create' | 'update' | 'delete',
        JSON.parse(item.payload_json),
      );
    } else if (resolution === 'merge' && mergedPayload) {
      // Enqueue merged version
      const item = conflict.queueItem;
      await markSynced(queueItemId);
      await enqueueChange(
        item.entity as SyncEntity,
        item.entity_id,
        'update',
        mergedPayload,
      );
    }

    set((s) => ({
      conflicts: s.conflicts.filter((c) => c.queueItem.id !== queueItemId),
    }));
    await get().refreshQueueStats();
  },

  clearResolvedConflicts: () => {
    set((s) => ({
      conflicts: s.conflicts.filter((c) => !c.resolvedAt),
    }));
  },

  // ── Cleanup ──
  cleanupSyncedItems: async () => {
    await clearSyncedItems();
    await get().refreshQueueStats();
  },

  // ── Full Sync Cycle ──
  fullSync: async (pushFn, pullMap) => {
    const { processQueue, pullFromServer, cleanupSyncedItems } = get();

    // 1. Push pending local changes
    await processQueue(pushFn);

    // 2. Pull each entity from server
    const entities = Object.keys(pullMap) as SyncEntity[];
    for (const entity of entities) {
      const { pull, apply } = pullMap[entity];
      await pullFromServer(entity, pull, apply);
    }

    // 3. Clean up
    await cleanupSyncedItems();

    set({ lastSyncAt: new Date().toISOString() });
  },
}));
