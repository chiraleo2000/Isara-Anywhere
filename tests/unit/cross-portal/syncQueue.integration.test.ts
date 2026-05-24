/**
 * Sync queue push/pull — Processes/Data_Sync_Documentation.md
 */
import { describe, it, expect } from 'vitest';

type SyncItem = {
  id: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  updatedAt: string;
};

function pushPullRoundTrip(
  server: SyncItem[],
  clientItems: SyncItem[],
): { server: SyncItem[]; client: SyncItem[] } {
  const byId = new Map(server.map((i) => [i.id, i]));
  for (const item of clientItems) {
    const existing = byId.get(item.id);
    if (!existing || item.updatedAt > existing.updatedAt) {
      byId.set(item.id, item);
    }
  }
  const merged = [...byId.values()];
  return { server: merged, client: merged };
}

describe('Sync queue merge', () => {
  it('client newer wins without data loss', () => {
    const server: SyncItem[] = [
      { id: '1', entityType: 'phr', entityId: 'P1', payload: { vitals: 1 }, updatedAt: '2026-05-22T10:00:00Z' },
    ];
    const client: SyncItem[] = [
      { id: '1', entityType: 'phr', entityId: 'P1', payload: { vitals: 2 }, updatedAt: '2026-05-22T11:00:00Z' },
    ];
    const { server: out } = pushPullRoundTrip(server, client);
    expect(out[0].payload.vitals).toBe(2);
  });
});
