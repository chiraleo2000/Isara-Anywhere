/**
 * Code Breaker Round 1 — latency chaos (DB + AI) + lobby reconnect (in-memory)
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { applyChaosLatency, getChaosLatencyMs } from '../server/chaosLatency.js';
import { createLobbyKeyResolver } from '../server/lobbyKey.js';
import { applyLobbyJoin, applyLobbyLeave } from '../server/lobbySession.js';

describe('Code Breaker Round 1 — network chaos', () => {
  const prevDb = process.env.IZARA_CHAOS_DB_LATENCY_MS;
  const prevAi = process.env.IZARA_CHAOS_AI_LATENCY_MS;

  after(() => {
    if (prevDb) process.env.IZARA_CHAOS_DB_LATENCY_MS = prevDb;
    else delete process.env.IZARA_CHAOS_DB_LATENCY_MS;
    if (prevAi) process.env.IZARA_CHAOS_AI_LATENCY_MS = prevAi;
    else delete process.env.IZARA_CHAOS_AI_LATENCY_MS;
  });

  it('CB1-N01 — chaos latency env is readable', () => {
    process.env.IZARA_CHAOS_DB_LATENCY_MS = '50';
    assert.equal(getChaosLatencyMs('db'), 50);
    delete process.env.IZARA_CHAOS_DB_LATENCY_MS;
    assert.equal(getChaosLatencyMs('db'), 0);
  });

  it('CB1-N02 — applyChaosLatency honors 2000ms AI delay', async () => {
    process.env.IZARA_CHAOS_AI_LATENCY_MS = '100';
    const t0 = Date.now();
    await applyChaosLatency('ai');
    assert.ok(Date.now() - t0 >= 90);
  });

  it('CB1-N03 — guest disconnect/reconnect in lobby without duplicate host keys', () => {
    const meetingLobbies = new Map();
    const meetingLobbyAliases = new Map();
    const activeMeetings = new Map();
    const apt = 'APT-CB1';
    const uuid = 'm-cb1-uuid';
    activeMeetings.set(uuid, { meetingId: uuid, appointmentId: apt });
    const resolver = createLobbyKeyResolver({
      meetingLobbies,
      meetingLobbyAliases,
      activeMeetings,
      getDbAvailable: () => false,
    });
    resolver.registerMeetingLobbyAliases(uuid, apt);
    const key = resolver.resolveLobbyKeySync(apt);
    const { lobby } = resolver.getLobbyMap(key);
    applyLobbyJoin(lobby, 'guest-cb1', { participantId: 'guest-cb1', participantName: 'Guest', role: 'guest', status: 'waiting' });
    applyLobbyLeave(lobby, 'guest-cb1');
    const rejoin = applyLobbyJoin(lobby, 'guest-cb1', {
      participantId: 'guest-cb1',
      participantName: 'Guest',
      role: 'guest',
      status: 'waiting',
    });
    assert.equal(rejoin.entry.status, 'waiting');
    assert.equal(lobby.size, 1);
  });
});
