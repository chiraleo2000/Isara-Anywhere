/**
 * Unit tests for canonical lobby key resolution (meeting UUID → appointmentId).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLobbyKeyResolver } from '../../../Izara-jitsi-server/server/lobbyKey.js';

function makeCtx(overrides?: Partial<Parameters<typeof createLobbyKeyResolver>[0]>) {
  const meetingLobbies = new Map<string, Map<string, { participantId: string; status: string }>>();
  const meetingLobbyAliases = new Map<string, string>();
  const activeMeetings = new Map<string, { meetingId: string; appointmentId?: string | null }>();
  const pool = {
    query: vi.fn().mockResolvedValue({ rows: [] }),
  };
  return {
    meetingLobbies,
    meetingLobbyAliases,
    activeMeetings,
    pool,
    getDbAvailable: () => true,
    ...overrides,
  };
}

describe('lobbyKey — resolveLobbyKey', () => {
  it('LK01 — prefers appointmentId from activeMeetings', async () => {
    const ctx = makeCtx();
    ctx.activeMeetings.set('meet-uuid', { meetingId: 'meet-uuid', appointmentId: 'APT-100' });
    const { resolveLobbyKey } = createLobbyKeyResolver(ctx);
    await expect(resolveLobbyKey('meet-uuid')).resolves.toBe('APT-100');
    await expect(resolveLobbyKey('APT-100')).resolves.toBe('APT-100');
  });

  it('LK02 — DB lookup maps meeting UUID to appointment_id', async () => {
    const ctx = makeCtx();
    ctx.pool.query = vi.fn().mockResolvedValue({
      rows: [{ id: 'meet-uuid', appointment_id: 'APT-DB' }],
    });
    const { resolveLobbyKey } = createLobbyKeyResolver(ctx);
    await expect(resolveLobbyKey('meet-uuid')).resolves.toBe('APT-DB');
    expect(ctx.meetingLobbyAliases.get('meet-uuid')).toBe('APT-DB');
  });

  it('LK03 — passthrough when no DB row and no memory', async () => {
    const ctx = makeCtx({ getDbAvailable: () => false });
    const { resolveLobbyKey } = createLobbyKeyResolver(ctx);
    await expect(resolveLobbyKey('orphan-id')).resolves.toBe('orphan-id');
  });

  it('LK04 — merges split lobby buckets on alias discovery', async () => {
    const ctx = makeCtx();
    const aptLobby = new Map([['p1', { participantId: 'p1', status: 'waiting' }]]);
    const meetLobby = new Map([['g1', { participantId: 'g1', status: 'waiting' }]]);
    ctx.meetingLobbies.set('APT-MERGE', aptLobby);
    ctx.meetingLobbies.set('meet-merge', meetLobby);
    ctx.activeMeetings.set('meet-merge', { meetingId: 'meet-merge', appointmentId: 'APT-MERGE' });
    const { resolveLobbyKey, mergeLobbyMaps } = createLobbyKeyResolver(ctx);
    mergeLobbyMaps('meet-merge', 'APT-MERGE');
    const key = await resolveLobbyKey('meet-merge');
    expect(key).toBe('APT-MERGE');
    const merged = ctx.meetingLobbies.get('APT-MERGE');
    expect(merged?.has('p1')).toBe(true);
    expect(merged?.has('g1')).toBe(true);
    expect(ctx.meetingLobbies.has('meet-merge')).toBe(true);
  });

  it('LK05 — existing in-memory lobby on raw id returns canonical alias', async () => {
    const ctx = makeCtx();
    ctx.meetingLobbyAliases.set('meet-x', 'APT-X');
    ctx.meetingLobbies.set('APT-X', new Map());
    const { resolveLobbyKey } = createLobbyKeyResolver(ctx);
    await expect(resolveLobbyKey('meet-x')).resolves.toBe('APT-X');
  });
});
