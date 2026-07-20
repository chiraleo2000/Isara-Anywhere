/**
 * Sync queue push/pull — Processes/Data_Sync_Documentation.md
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

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
  it('SQ-02 — NOTIFY trigger migration file exists (v2.2.0)', () => {
    const migration = path.resolve(__dirname, '../../../scripts/database/v2.2.0-notify-triggers.sql');
    expect(fs.existsSync(migration)).toBe(true);
    const sql = fs.readFileSync(migration, 'utf8');
    expect(sql).toMatch(/pg_notify|data_changes/i);
  });

  it('SQ-03 — doctor portal pgNotify listener wired', () => {
    const listener = path.resolve(__dirname, '../../../issara-doctor/backend/pgNotifyListener.cjs');
    expect(fs.existsSync(listener)).toBe(true);
    expect(fs.readFileSync(listener, 'utf8')).toMatch(/LISTEN\s+data_changes/i);
  });

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
