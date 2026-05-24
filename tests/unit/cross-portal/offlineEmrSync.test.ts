/**
 * Offline EMR sync queue — Processes/Data_Sync_Documentation.md
 */
import { describe, it, expect, beforeEach } from 'vitest';

const STORAGE_KEY = 'izara_emr_sync_queue';

type QueuedEmr = {
  id: string;
  payload: Record<string, unknown>;
  updatedAt: string;
};

function readQueue(store: Map<string, string>): QueuedEmr[] {
  const raw = store.get(STORAGE_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as QueuedEmr[];
}

function enqueue(store: Map<string, string>, item: QueuedEmr): void {
  const q = readQueue(store);
  const idx = q.findIndex((x) => x.id === item.id);
  if (idx >= 0) q[idx] = item;
  else q.push(item);
  store.set(STORAGE_KEY, JSON.stringify(q));
}

function flushQueue(
  store: Map<string, string>,
  push: (item: QueuedEmr) => Promise<boolean>,
): Promise<{ synced: number; failed: number }> {
  const q = readQueue(store);
  let synced = 0;
  let failed = 0;
  const remaining: QueuedEmr[] = [];
  return Promise.all(
    q.map(async (item) => {
      const ok = await push(item);
      if (ok) synced += 1;
      else {
        failed += 1;
        remaining.push(item);
      }
    }),
  ).then(() => {
    store.set(STORAGE_KEY, JSON.stringify(remaining));
    return { synced, failed };
  });
}

describe('Offline EMR sync queue', () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = new Map();
  });

  it('queues locally when push fails then syncs on reconnect without loss', async () => {
    enqueue(store, {
      id: 'emr-1',
      payload: { assessment: 'updated offline' },
      updatedAt: '2026-05-23T12:00:00Z',
    });
    expect(readQueue(store)).toHaveLength(1);

    const first = await flushQueue(store, async () => false);
    expect(first.synced).toBe(0);
    expect(readQueue(store)).toHaveLength(1);

    const second = await flushQueue(store, async () => true);
    expect(second.synced).toBe(1);
    expect(readQueue(store)).toHaveLength(0);
  });
});
