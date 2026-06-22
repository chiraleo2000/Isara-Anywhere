/**
 * Live Socket.IO lobby integration — requires meeting-server on :3020.
 * Skips when server is not reachable (local smoke is authoritative in CI).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const MEETING_URL = (process.env.MEETING_URL || 'http://127.0.0.1:3020').replace(/\/$/, '');
const requireFromRoot = createRequire(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../package.json'));

async function isMeetingServerUp() {
  try {
    const res = await fetch(`${MEETING_URL}/health`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return false;
    const body = await res.json();
    return body.status === 'healthy' || body.features?.lobby === true;
  } catch {
    return false;
  }
}

function connectSocket() {
  const { io } = requireFromRoot('socket.io-client');
  return io(MEETING_URL, {
    transports: ['websocket', 'polling'],
    reconnection: false,
    timeout: 5000,
  });
}

function once(socket, event, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), timeoutMs);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
    socket.once('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

describe('meeting-socket-lobby.integration', () => {
  it('SOCKET-01 — guest lobby-request receives waiting lobby-response', async () => {
    if (!(await isMeetingServerUp())) {
      console.log('[skip] meeting-server not reachable at', MEETING_URL);
      return;
    }

    const meetingId = `socket-lobby-${Date.now()}`;
    const participantId = `guest-${Date.now()}`;
    const socket = connectSocket();

    try {
      await once(socket, 'connect');
      socket.emit('lobby-request', {
        meetingId,
        participantId,
        participantName: 'Socket Test Guest',
        role: 'guest',
        email: 'socket-guest@test.local',
      });

      const response = await once(socket, 'lobby-response');
      assert.equal(response.meetingId, meetingId);
      assert.equal(response.participantId, participantId);
      assert.equal(response.status, 'waiting');
    } finally {
      socket.disconnect();
    }
  });

  it('SOCKET-02 — lobby-update broadcast on join', async () => {
    if (!(await isMeetingServerUp())) {
      console.log('[skip] meeting-server not reachable at', MEETING_URL);
      return;
    }

    const meetingId = `socket-lobby-upd-${Date.now()}`;
    const participantId = `guest-upd-${Date.now()}`;
    const socket = connectSocket();

    try {
      await once(socket, 'connect');
      socket.emit('join-meeting', meetingId);

      const updatePromise = once(socket, 'lobby-update');
      socket.emit('lobby-request', {
        meetingId,
        participantId,
        participantName: 'Lobby Update Guest',
        role: 'guest',
      });

      const update = await updatePromise;
      assert.equal(update.action, 'join');
      assert.equal(update.participant.participantId, participantId);
      assert.equal(update.participant.status, 'waiting');
    } finally {
      socket.disconnect();
    }
  });
});
