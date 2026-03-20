import { api } from './client';
import type { CreateMeetingRequest, CreateMeetingResponse, Meeting } from '../types';

export const meetingApi = {
  createMeeting: (data: CreateMeetingRequest) =>
    api.post<CreateMeetingResponse>('meeting', '/api/meetings/create', data),

  getMeetingStatus: (meetingId: string) =>
    api.get<{ meeting: Meeting }>(
      'meeting', `/api/meetings/${encodeURIComponent(meetingId)}/status`,
    ),

  getMeetingHistory: () =>
    api.get<{ meetings: Meeting[] }>('meeting', '/api/meetings/history'),

  endMeeting: (meetingId: string) =>
    api.post<{ success: boolean }>(
      'meeting', `/api/meetings/${encodeURIComponent(meetingId)}/end`,
    ),
};
