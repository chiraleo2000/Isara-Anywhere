/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — OFFLINE SYNC QUEUE REPOSITORY
 * ═══════════════════════════════════════════════════════════════════════
 * Manages the local sync queue — enqueuing offline changes and
 * processing them when connectivity returns.
 * 
 * Flow: User Action → enqueue() → [offline queue]
 *       Network Online → processQueue() → API Push → markSynced()
 * ═══════════════════════════════════════════════════════════════════════
 */
import { localDb } from './localDb';
import type { SyncQueueItem, SyncEntity } from './schema';

/**
 * Generate a unique queue item ID.
 */
function generateQueueId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `sq_${ts}_${rand}`;
}

/**
 * Add a change to the offline sync queue.
 * Called whenever the user creates/updates/deletes data while offline.
 */
export async function enqueueChange(
  entity: SyncEntity,
  entityId: string,
  operation: 'create' | 'update' | 'delete',
  payload: Record<string, unknown>,
): Promise<string> {
  const id = generateQueueId();
  const now = new Date().toISOString();

  await localDb.execute(
    `INSERT INTO sync_queue (id, entity, entity_id, operation, payload_json, status, retry_count, max_retries, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', 0, 3, ?)`,
    [id, entity, entityId, operation, JSON.stringify(payload), now],
  );

  return id;
}

/**
 * Get all pending items from the queue, ordered by creation time (FIFO).
 */
export async function getPendingItems(): Promise<SyncQueueItem[]> {
  return localDb.query<SyncQueueItem>(
    `SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC`,
  );
}

/**
 * Get items by status.
 */
export async function getItemsByStatus(status: SyncQueueItem['status']): Promise<SyncQueueItem[]> {
  return localDb.query<SyncQueueItem>(
    `SELECT * FROM sync_queue WHERE status = ? ORDER BY created_at ASC`,
    [status],
  );
}

/**
 * Mark a queue item as synced (remove from active queue).
 */
export async function markSynced(id: string): Promise<void> {
  await localDb.execute(
    `UPDATE sync_queue SET status = 'synced', last_attempt = datetime('now') WHERE id = ?`,
    [id],
  );
}

/**
 * Mark an item as currently syncing.
 */
export async function markSyncing(id: string): Promise<void> {
  await localDb.execute(
    `UPDATE sync_queue SET status = 'syncing', last_attempt = datetime('now') WHERE id = ?`,
    [id],
  );
}

/**
 * Mark an item as having a conflict (needs manual resolution).
 */
export async function markConflict(id: string, errorMessage: string): Promise<void> {
  await localDb.execute(
    `UPDATE sync_queue SET status = 'conflict', error_message = ?, last_attempt = datetime('now') WHERE id = ?`,
    [errorMessage, id],
  );
}

/**
 * Record a failed sync attempt. If max retries exceeded, mark as 'failed'.
 */
export async function recordFailure(id: string, errorMessage: string): Promise<void> {
  await localDb.execute(
    `UPDATE sync_queue
     SET retry_count = retry_count + 1,
         error_message = ?,
         last_attempt = datetime('now'),
         status = CASE WHEN retry_count + 1 >= max_retries THEN 'failed' ELSE 'pending' END
     WHERE id = ?`,
    [errorMessage, id],
  );
}

/**
 * Retry a failed or conflicted item (reset to pending).
 */
export async function retryItem(id: string): Promise<boolean> {
  const item = await localDb.queryFirst<SyncQueueItem>(
    `SELECT * FROM sync_queue WHERE id = ?`,
    [id],
  );
  if (!item || item.retry_count >= item.max_retries) return false;

  await localDb.execute(
    `UPDATE sync_queue SET status = 'pending', error_message = NULL WHERE id = ?`,
    [id],
  );
  return true;
}

/**
 * Remove all synced items (cleanup).
 */
export async function clearSyncedItems(): Promise<number> {
  const result = await localDb.execute(
    `DELETE FROM sync_queue WHERE status = 'synced'`,
  );
  return result.changes;
}

/**
 * Get queue statistics.
 */
export async function getQueueStats(): Promise<{
  pending: number;
  syncing: number;
  conflict: number;
  failed: number;
  synced: number;
  total: number;
}> {
  const rows = await localDb.query<{ status: string; count: number }>(
    `SELECT status, COUNT(*) as count FROM sync_queue GROUP BY status`,
  );

  const stats = { pending: 0, syncing: 0, conflict: 0, failed: 0, synced: 0, total: 0 };
  for (const row of rows) {
    const key = row.status as keyof typeof stats;
    if (key in stats) stats[key] = row.count;
    stats.total += row.count;
  }
  return stats;
}

/**
 * Update sync metadata after a successful sync.
 */
export async function updateSyncMetadata(
  entity: SyncEntity,
  serverVersion?: number,
): Promise<void> {
  await localDb.execute(
    `UPDATE sync_metadata
     SET last_synced_at = datetime('now'),
         last_server_version = COALESCE(?, last_server_version),
         sync_count = sync_count + 1
     WHERE entity = ?`,
    [serverVersion ?? null, entity],
  );
}

/**
 * Get sync metadata for an entity.
 */
export async function getSyncMetadata(entity: SyncEntity) {
  return localDb.queryFirst<{
    entity: string;
    last_synced_at: string | null;
    last_server_version: number;
    sync_count: number;
  }>(
    `SELECT * FROM sync_metadata WHERE entity = ?`,
    [entity],
  );
}
