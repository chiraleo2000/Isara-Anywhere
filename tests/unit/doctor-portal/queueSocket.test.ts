/**
 * Queue WebSocket events — Processes/Pages/Doctor-Portal/21_Queue_Management.md
 */
import { describe, it, expect } from 'vitest';

export const QUEUE_SOCKET_EVENTS = {
  UPDATE: 'queue-update',
  APPOINTMENT: 'appointment-update',
} as const;

export function parseQueueUpdate(payload: unknown): { appointmentId?: string; queueCount?: number } {
  if (!payload || typeof payload !== 'object') return {};
  const p = payload as Record<string, unknown>;
  return {
    appointmentId: typeof p.appointmentId === 'string' ? p.appointmentId : undefined,
    queueCount: typeof p.queueCount === 'number' ? p.queueCount : undefined,
  };
}

describe('Queue socket contract', () => {
  it('uses kebab-case queue-update event', () => {
    expect(QUEUE_SOCKET_EVENTS.UPDATE).toBe('queue-update');
  });

  it('parses queue payload', () => {
    const parsed = parseQueueUpdate({ appointmentId: 'APT-1', queueCount: 3 });
    expect(parsed.appointmentId).toBe('APT-1');
    expect(parsed.queueCount).toBe(3);
  });
});
