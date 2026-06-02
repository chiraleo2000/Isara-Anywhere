import { describe, expect, it, vi } from 'vitest';
import {
  waitForMeetingResultsReady,
  waitForMeetingResultsReadyAny,
} from '../../../tests/helpers/meeting-lifecycle-fixture';

describe('waitForMeetingResultsReady', () => {
  it('resolves when GET /results returns success with meeting id', async () => {
    let calls = 0;
    const request = {
      get: vi.fn(async () => {
        calls += 1;
        if (calls < 2) {
          return { ok: () => false, status: () => 404, json: async () => ({ success: false }) };
        }
        return {
          ok: () => true,
          status: () => 200,
          json: async () => ({ success: true, meeting: { id: 'mr-uuid-1' } }),
        };
      }),
    };

    await waitForMeetingResultsReady(request, 'http://meeting.test', 'APT-1', 'token', 10_000);
    expect(calls).toBe(2);
  });

  it('throws with last HTTP status when timeout', async () => {
    const request = {
      get: vi.fn(async () => ({
        ok: () => false,
        status: () => 404,
        json: async () => ({ success: false, error: 'Meeting not found' }),
      })),
    };

    await expect(
      waitForMeetingResultsReady(request, 'http://meeting.test', 'APT-99', 'token', 500),
    ).rejects.toThrow(/HTTP 404/);
  });

  it('tries alternate meeting keys until one returns ready', async () => {
    const request = {
      get: vi.fn(async (url: string) => {
        if (url.includes('APT-miss')) {
          return { ok: () => false, status: () => 404, json: async () => ({ success: false }) };
        }
        return {
          ok: () => true,
          status: () => 200,
          json: async () => ({ success: true, meeting: { id: 'mr-alt' } }),
        };
      }),
    };

    const key = await waitForMeetingResultsReadyAny(
      request,
      'http://meeting.test',
      ['APT-miss', 'APT-hit'],
      'token',
      10_000,
    );
    expect(key).toBe('APT-hit');
    expect(request.get).toHaveBeenCalled();
  });

  it('keeps polling when ok but success=false', async () => {
    let calls = 0;
    const request = {
      get: vi.fn(async () => {
        calls += 1;
        if (calls < 3) {
          return {
            ok: () => true,
            status: () => 200,
            json: async () => ({ success: false }),
          };
        }
        return {
          ok: () => true,
          status: () => 200,
          json: async () => ({ success: true, meeting: { id: 'mr-2' } }),
        };
      }),
    };

    await waitForMeetingResultsReady(request, 'http://meeting.test', 'APT-2', 'token', 10_000);
    expect(calls).toBe(3);
  });
});
