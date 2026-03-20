import { useCallback, useState } from 'react';
import { meetingApi } from '../api/meeting.api';
import type { CreateMeetingRequest } from '../types';

export function useMeetingApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callApi = useCallback(async <T>(fn: () => Promise<T>): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    createMeeting: useCallback(
      (data: CreateMeetingRequest) => callApi(() => meetingApi.createMeeting(data)),
      [callApi],
    ),
    getMeetingStatus: useCallback(
      (meetingId: string) => callApi(() => meetingApi.getMeetingStatus(meetingId)),
      [callApi],
    ),
    getMeetingHistory: useCallback(
      () => callApi(() => meetingApi.getMeetingHistory()),
      [callApi],
    ),
    endMeeting: useCallback(
      (meetingId: string) => callApi(() => meetingApi.endMeeting(meetingId)),
      [callApi],
    ),
  };
}
