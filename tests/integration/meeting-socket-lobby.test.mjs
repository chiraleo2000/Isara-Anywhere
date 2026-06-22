/**
 * Live Socket.IO lobby integration — requires meeting-server on :3020.
 * Skips gracefully when server is down (pre-phase smoke is authoritative in gates).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { io as ioClient } from 'socket.io-client';

const MEETING_URL = (process.env.MEETING_URL || 'http://127.0.0.1:3020').replace(/\/$/, '');

async function serverUp() {
  try {
    const res = await fetch(`${MEETING_URL}/health`, { signal: AbortSignal.timeout(4000) });
    return res.ok;
  } catch {
    return false;
  }
}

describe('meeting-socket-lobby.integration', () => {
  it('connects and receives lobby-response on lobby-request', async (t) => {
    if (!(await serverUp())) {
      t.skip('meeting-server not reachable — skip socket integration');
      return;
    }

    const meetingId = `socket-smoke-${Date.now()}`;
    const participantId = `p-${Date.now()}`;

    await new Promise((resolve, reject) => {
      const socket = ioClient(MEETING_URL, {
        transports: ['websocket'],
        timeout: 8000,
        reconnection: false,
      });

      const timer = setTimeout(() => {
        socket.close();
        reject(new Error('socket lobby timeout'));
      }, 12000);

      socket.on('connect', () => {
        socket.emit('lobby-request', {
          meetingId,
          participantId,
          role: 'patient',
          displayName: 'Socket Smoke Patient',
        });
      });

      socket.on('lobby-response', (payload) => {
        clearTimeout(timer);
        try {
          assert.equal(payload.meetingId, meetingId);
          assert.equal(payload.participantId, participantId);
          assert.ok(['waiting', 'admitted'].includes(payload.status));
          socket.close();
          resolve();
        } catch (err) {
          socket.close();
          reject(err);
        }
      });

      socket.on('connect_error', (err) => {
        clearTimeout(timer);
        socket.close();
        reject(err);
      });
    });
  });

  it('broadcasts lobby-update to room subscribers', async (t) => {
    if (!(await serverUp())) {
      t.skip('meeting-server not reachable — skip socket integration');
      return;
    }

    const meetingId = `socket-lobby-${Date.now()}`;
    const participantId = `guest-${Date.now()}`;

    await new Promise((resolve, reject) => {
      const observer = ioClient(MEETING_URL, {
        transports: ['websocket'],
        timeout: 8000,
        reconnection: false,
      });
      const joiner = ioClient(MEETING_URL, {
        transports: ['websocket'],
        timeout: 8000,
        reconnection: false,
      });

      const timer = setTimeout(() => {
        observer.close();
        joiner.close();
        reject(new Error('lobby-update timeout'));
      }, 12000);

      observer.on('connect', () => {
        observer.emit('join-meeting', { meetingId, userName: 'Observer', role: 'doctor' });
      });

      observer.on('lobby-update', (payload) => {
        if (payload.action === 'join' && payload.participant?.participantId === participantId) {
          clearTimeout(timer);
          observer.close();
          joiner.close();
          resolve();
        }
      });

      joiner.on('connect', () => {
        setTimeout(() => {
          joiner.emit('lobby-request', {
            meetingId,
            participantId,
            role: 'guest',
            displayName: 'Socket Guest',
          });
        }, 300);
      });

      const onErr = (err) => {
        clearTimeout(timer);
        observer.close();
        joiner.close();
        reject(err);
      };
      observer.on('connect_error', onErr);
      joiner.on('connect_error', onErr);
    });
  });
});
