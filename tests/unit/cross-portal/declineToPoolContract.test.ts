/**
 * @process Processes/Appointment_Workflows.md — decline → in_pool; cancel → cancelled
 */
import { describe, it, expect } from 'vitest';

type AptStatus =
  | 'awaiting_doctor_response'
  | 'in_pool'
  | 'confirmed'
  | 'cancelled'
  | 'declined';

function applyDecline(from: AptStatus): AptStatus {
  if (from === 'awaiting_doctor_response') return 'in_pool';
  throw new Error(`decline not allowed from ${from}`);
}

function applyCancel(from: AptStatus, opts?: { rePool?: boolean }): AptStatus {
  if (opts?.rePool) return 'in_pool';
  if (from === 'confirmed' || from === 'awaiting_doctor_response' || from === 'in_pool') {
    return 'cancelled';
  }
  throw new Error(`cancel not allowed from ${from}`);
}

describe('declineToPoolContract — status machine', () => {
  it('DTP-01 — decline from awaiting_doctor_response → in_pool', () => {
    expect(applyDecline('awaiting_doctor_response')).toBe('in_pool');
  });

  it('DTP-02 — cancel confirmed → cancelled (not in_pool unless re-pool)', () => {
    expect(applyCancel('confirmed')).toBe('cancelled');
    expect(applyCancel('confirmed')).not.toBe('in_pool');
    expect(applyCancel('confirmed', { rePool: true })).toBe('in_pool');
  });

  it('DTP-03 — Appointment_Workflows decline path lands in_pool', () => {
    // Follow Appointment_Workflows: decline → in_pool
    const transition = { from: 'awaiting_doctor_response' as const, action: 'decline' as const };
    const next = transition.action === 'decline' ? applyDecline(transition.from) : transition.from;
    expect(next).toBe('in_pool');
  });
});
