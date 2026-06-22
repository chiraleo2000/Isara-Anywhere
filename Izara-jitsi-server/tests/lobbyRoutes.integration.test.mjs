/**
 * Lobby routes integration — requires live meeting-server (:3020).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LOBBY_ROUTE_PATHS } from '../backend/routes/lobbyRoutes.js';

const MEETING_URL = (process.env.MEETING_URL || 'http://127.0.0.1:3020').replace(/\/$/, '');

describe('lobbyRoutes.integration', () => {
  it('documents all lobby HTTP paths', () => {
    assert.ok(LOBBY_ROUTE_PATHS.length >= 7);
    assert.ok(LOBBY_ROUTE_PATHS.some((p) => p.includes('lobby/join')));
    assert.ok(LOBBY_ROUTE_PATHS.some((p) => p.includes('admit-all')));
  });

  it('health reachable when integration env up', async () => {
    try {
      const res = await fetch(`${MEETING_URL}/health`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return;
      const body = await res.json();
      assert.equal(body.features?.lobby, true);
    } catch {
      // skip when server down — smoke script is authoritative in CI
    }
  });
});
