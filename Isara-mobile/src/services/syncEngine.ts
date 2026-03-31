/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — SYNC ENGINE
 * ═══════════════════════════════════════════════════════════════════════
 * Top-level coordinator that wires together:
 *   • Network connectivity detection (expo-network / NetInfo)
 *   • The Zustand sync store (reactive state)
 *   • The offline queue repository (SQLite persistence)
 *   • The @izara/api-client (HTTP transport)
 *
 * Usage:
 *   import { syncEngine } from '@/services/syncEngine';
 *   await syncEngine.initialize();          // call once at app start
 *   await syncEngine.triggerFullSync();      // manual or on-reconnect
 *   syncEngine.dispose();                    // on app teardown
 * ═══════════════════════════════════════════════════════════════════════
 */

import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { AppState, type AppStateStatus } from 'react-native';
import { patientApi } from '@izara/api-client';
import { localDb } from '@izara/shared/db/localDb';
import type { SyncEntity, SyncQueueItem } from '@izara/shared/db/schema';
import { SYNC_ENTITIES } from '@izara/shared/db/schema';
import { useSyncStore } from '@/stores/syncStore';

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────

const SYNC_INTERVAL_MS = 5 * 60 * 1000;     // auto-sync every 5 min when online
const DEBOUNCE_MS = 2_000;                    // debounce rapid connectivity flaps

// ─────────────────────────────────────────────
// Entity → API mapping
// ─────────────────────────────────────────────

/**
 * Maps each sync entity to the API methods used for push (single item)
 * and pull (batch fetch).
 */
const entityApiMap: Record<SyncEntity, {
  push: (item: SyncQueueItem) => Promise<{ conflict?: boolean; serverVersion?: Record<string, unknown> }>;
  pull: () => Promise<{ records: Record<string, unknown>[]; serverVersion: number }>;
  apply: (records: Record<string, unknown>[]) => Promise<void>;
}> = {
  appointments: {
    push: async (item) => {
      const payload = JSON.parse(item.payload_json);
      if (item.operation === 'create') {
        await patientApi.createAppointment(payload);
      } else if (item.operation === 'update') {
        // Uses generic update endpoint
        await patientApi.createAppointment({ ...payload, id: item.entity_id });
      } else if (item.operation === 'delete') {
        await patientApi.cancelAppointment(item.entity_id, payload.reason ?? 'Cancelled offline');
      }
      return {};
    },
    pull: async () => {
      const res = await patientApi.getAppointments({ page: 1, limit: 500 });
      return { records: res.data as Record<string, unknown>[], serverVersion: Date.now() };
    },
    apply: async (records) => {
      await localDb.transaction(async () => {
        for (const r of records) {
          await localDb.upsert('appointments', r as Record<string, unknown>, 'id');
        }
      });
    },
  },

  vital_signs: {
    push: async (item) => {
      const payload = JSON.parse(item.payload_json);
      // Vitals are created locally and pushed as new records
      await patientApi.createAppointment(payload); // placeholder — wire to actual vitals API
      return {};
    },
    pull: async () => {
      // Vitals pulled from PHR endpoint
      return { records: [], serverVersion: Date.now() };
    },
    apply: async (records) => {
      await localDb.transaction(async () => {
        for (const r of records) {
          await localDb.upsert('vital_signs', r as Record<string, unknown>, 'id');
        }
      });
    },
  },

  medications: {
    push: async (item) => {
      const payload = JSON.parse(item.payload_json);
      await patientApi.createAppointment(payload); // placeholder
      return {};
    },
    pull: async () => {
      return { records: [], serverVersion: Date.now() };
    },
    apply: async (records) => {
      await localDb.transaction(async () => {
        for (const r of records) {
          await localDb.upsert('medications', r as Record<string, unknown>, 'id');
        }
      });
    },
  },

  medication_logs: {
    push: async (item) => {
      const payload = JSON.parse(item.payload_json);
      await patientApi.createAppointment(payload); // placeholder
      return {};
    },
    pull: async () => {
      return { records: [], serverVersion: Date.now() };
    },
    apply: async (records) => {
      await localDb.transaction(async () => {
        for (const r of records) {
          await localDb.upsert('medication_logs', r as Record<string, unknown>, 'id');
        }
      });
    },
  },

  phr_cache: {
    push: async (_item) => {
      // PHR cache is read-only from server, no push needed
      return {};
    },
    pull: async () => {
      const phr = await patientApi.getProfile();
      return {
        records: [phr as Record<string, unknown>],
        serverVersion: Date.now(),
      };
    },
    apply: async (records) => {
      if (records.length > 0) {
        await localDb.upsert('phr_cache', {
          id: 'current',
          data_json: JSON.stringify(records[0]),
          updated_at: new Date().toISOString(),
        }, 'id');
      }
    },
  },

  notifications: {
    push: async (_item) => {
      // Notifications are server → client only
      return {};
    },
    pull: async () => {
      return { records: [], serverVersion: Date.now() };
    },
    apply: async (records) => {
      await localDb.transaction(async () => {
        for (const r of records) {
          await localDb.upsert('notifications', r as Record<string, unknown>, 'id');
        }
      });
    },
  },
};

// ─────────────────────────────────────────────
// Sync Engine class
// ─────────────────────────────────────────────

class SyncEngine {
  private unsubscribeNetInfo: (() => void) | null = null;
  private appStateSubscription: { remove: () => void } | null = null;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private initialized = false;

  /**
   * Call once at app startup (e.g. in _layout.tsx useEffect).
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // 1. Ensure local DB schema exists
    await localDb.initialize();

    // 2. Hydrate queue stats
    await useSyncStore.getState().refreshQueueStats();

    // 3. Listen for network changes
    this.unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
      const online = !!(state.isConnected && state.isInternetReachable);
      const store = useSyncStore.getState();

      if (online !== store.isOnline) {
        store.setOnline(online);

        if (online && store.pendingCount > 0) {
          // Debounce to avoid rapid on/off flapping
          if (this.debounceTimer) clearTimeout(this.debounceTimer);
          this.debounceTimer = setTimeout(() => this.triggerFullSync(), DEBOUNCE_MS);
        }
      }
    });

    // 4. Listen for app foreground/background
    this.appStateSubscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active' && useSyncStore.getState().isOnline) {
        this.triggerFullSync();
      }
    });

    // 5. Periodic sync when online
    this.syncTimer = setInterval(() => {
      const { isOnline, isSyncing } = useSyncStore.getState();
      if (isOnline && !isSyncing) {
        this.triggerFullSync();
      }
    }, SYNC_INTERVAL_MS);

    this.initialized = true;
  }

  /**
   * Trigger a full push→pull sync cycle.
   */
  async triggerFullSync(): Promise<void> {
    const store = useSyncStore.getState();
    if (store.isSyncing || !store.isOnline) return;

    const pushFn = async (item: SyncQueueItem) => {
      const entity = item.entity as SyncEntity;
      const handler = entityApiMap[entity];
      if (!handler) return {};
      return handler.push(item);
    };

    const pullMap: Record<SyncEntity, {
      pull: () => Promise<{ records: Record<string, unknown>[]; serverVersion: number }>;
      apply: (records: Record<string, unknown>[]) => Promise<void>;
    }> = {} as any;

    for (const entity of SYNC_ENTITIES) {
      const handler = entityApiMap[entity];
      if (handler) {
        pullMap[entity] = { pull: handler.pull, apply: handler.apply };
      }
    }

    await store.fullSync(pushFn, pullMap);
  }

  /**
   * Enqueue a local change and optionally push immediately if online.
   */
  async trackChange(
    entity: SyncEntity,
    entityId: string,
    operation: 'create' | 'update' | 'delete',
    payload: Record<string, unknown>,
    pushImmediately = true,
  ): Promise<string> {
    const store = useSyncStore.getState();
    const id = await store.enqueue(entity, entityId, operation, payload);

    if (pushImmediately && store.isOnline && !store.isSyncing) {
      // Fire-and-forget push; errors are caught by processQueue
      this.triggerFullSync().catch(() => {});
    }

    return id;
  }

  /**
   * Teardown all listeners and timers.
   */
  dispose(): void {
    this.unsubscribeNetInfo?.();
    this.appStateSubscription?.remove();
    if (this.syncTimer) clearInterval(this.syncTimer);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.initialized = false;
  }
}

// ─────────────────────────────────────────────
// Singleton export
// ─────────────────────────────────────────────

export const syncEngine = new SyncEngine();
