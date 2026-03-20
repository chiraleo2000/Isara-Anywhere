export interface Meeting {
  id: string;
  appointmentId?: string;
  doctorId: string;
  patientId?: string;
  status: 'waiting' | 'active' | 'ended';
  doctorUrl: string;
  patientUrl: string;
  startedAt?: string;
  endedAt?: string;
}

export interface CreateMeetingRequest {
  appointmentId: string;
  doctorId: string;
  patientId?: string;
}

export interface CreateMeetingResponse {
  meeting: Meeting;
  doctorUrl: string;
  patientUrl: string;
}
