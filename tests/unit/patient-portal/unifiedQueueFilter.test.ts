import { describe, it, expect } from 'vitest';

const ACCEPTED_VISIBILITY_DAYS = 7;

function isRecentConfirmed(status: string, updatedAt?: string | Date) {
  if (status !== 'confirmed') return false;
  if (!updatedAt) return true;
  const cutoff = Date.now() - ACCEPTED_VISIBILITY_DAYS * 24 * 60 * 60 * 1000;
  return new Date(updatedAt).getTime() >= cutoff;
}

function queueFilter(apt: { status: string; updatedAt?: string }) {
  return ['pending', 'awaiting_doctor_response', 'in_pool'].includes(apt.status)
    || isRecentConfirmed(apt.status, apt.updatedAt);
}

describe('unifiedQueueFilter', () => {
  it('includes pending statuses', () => {
    expect(queueFilter({ status: 'in_pool' })).toBe(true);
    expect(queueFilter({ status: 'awaiting_doctor_response' })).toBe(true);
  });

  it('includes recently confirmed', () => {
    expect(queueFilter({ status: 'confirmed', updatedAt: new Date().toISOString() })).toBe(true);
  });

  it('excludes old confirmed from queue filter', () => {
    const old = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(queueFilter({ status: 'confirmed', updatedAt: old })).toBe(false);
  });
});
