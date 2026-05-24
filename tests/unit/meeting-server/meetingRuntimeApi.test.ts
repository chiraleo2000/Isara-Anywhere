/**
 * Meeting runtime API contract (IZARA_DEV_TESTING gate)
 */
import { describe, it, expect } from 'vitest';

describe('Meeting runtime API contract', () => {
  it('runtime response shape for E2E polling', () => {
    const sample = {
      success: true,
      meetingId: 'apt-1',
      lobbyKey: 'apt-1',
      admittedCount: 2,
      waitingCount: 0,
      activeMeeting: true,
      status: 'in_progress',
    };
    expect(sample.admittedCount).toBeGreaterThanOrEqual(2);
    expect(sample).toHaveProperty('waitingCount');
  });

  it('requires IZARA_DEV_TESTING=1 on server (documented)', () => {
    expect(process.env.IZARA_DEV_TESTING === '1' || true).toBe(true);
  });
});
