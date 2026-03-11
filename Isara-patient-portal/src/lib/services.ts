import api from './api';
import { PersonalHealthRecord, VitalSigns, Appointment, Doctor, User, AppointmentPoolItem, MeetingTimeRules, MeetingTimeCheck } from '../types';

// Auth Service
export const authService = {
  login: (data: { email: string; password: string }) => 
    api.post<{ user: User; token: string }>('/api/auth/login', data),
  register: (data: any) => 
    api.post<{ user: User; token: string }>('/api/auth/register', data),
  logout: (token: string) => 
    api.post<{ success: boolean }>('/api/auth/logout', { token }),
  validateSession: (token: string) => 
    api.post<{ valid: boolean; userId?: string }>('/api/auth/validate', { token }),
  getCurrentUser: () => 
    api.get<{ user: User }>('/api/auth/me'),
};

export const phrService = {
  get: (userId: string) => api.get<PersonalHealthRecord>(`/api/phr/${userId}`),
  update: (userId: string, data: Partial<PersonalHealthRecord>) => api.put<PersonalHealthRecord>(`/api/phr/${userId}`, data),
  getVitals: (userId: string) => api.get<VitalSigns[]>(`/api/phr/${userId}/vitals`),
  addVitals: (userId: string, vitals: VitalSigns) => api.post<VitalSigns>(`/api/phr/${userId}/vitals`, vitals),
  getTimeline: (userId: string) => api.get<any[]>(`/api/phr/${userId}/timeline`),
};

export const appointmentService = {
  getByPatient: (userId: string) => api.get<Appointment[]>(`/api/appointments/patient/${userId}`),
  getById: (id: string) => api.get<Appointment>(`/api/appointments/${id}`),
  create: (data: Partial<Appointment>) => api.post<Appointment>('/api/appointments', data),
  update: (id: string, data: Partial<Appointment>) => api.put<Appointment>(`/api/appointments/${id}`, data),
  cancel: (id: string) => api.delete<{ success: boolean }>(`/api/appointments/${id}`),
};

// Appointment Pool Service - For smart doctor assignment
export const appointmentPoolService = {
  // Get all pool items (filtered by status, specialty, urgency)
  getPool: (filters?: { status?: string; specialty?: string; urgency?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.specialty) params.append('specialty', filters.specialty);
    if (filters?.urgency) params.append('urgency', filters.urgency);
    const query = params.toString();
    return api.get<AppointmentPoolItem[]>('/api/appointment-pool' + (query ? `?${query}` : ''));
  },

  // Add appointment to pool
  addToPool: (data: {
    appointmentId: string;
    patientId: string;
    patientName: string;
    patientEmail: string;
    originalDoctorId?: string;
    originalDoctorName?: string;
    requiredSpecialty?: string;
    symptoms?: string[];
    symptomDescription?: string;
    urgency?: 'normal' | 'urgent' | 'emergency';
    preferredDates?: string[];
    preferredTimeSlot?: 'morning' | 'afternoon' | 'evening';
    appointmentType?: 'telehealth' | 'in_person';
    poolReason: 'no_doctor_selected' | 'doctor_unavailable' | 'doctor_rejected' | 'meeting_missed' | 'rescheduled';
    originalAppointmentDate?: string;
    originalAppointmentTime?: string;
  }) => api.post<{ success: boolean; poolItem: AppointmentPoolItem; message: string }>('/api/appointment-pool', data),

  // Doctor claims appointment from pool
  claimFromPool: (poolId: string, data: {
    doctorId: string;
    doctorName: string;
    proposedDate: string;
    proposedTime: string;
  }) => api.post<{ success: boolean; poolItem: AppointmentPoolItem; message: string }>(`/api/appointment-pool/${poolId}/claim`, data),

  // Admin assigns doctor (may require approval)
  adminAssign: (poolId: string, data: {
    doctorId: string;
    doctorName: string;
    assignedDate: string;
    assignedTime: string;
    adminId: string;
    adminName?: string;
  }) => api.post<{ success: boolean; poolItem: AppointmentPoolItem; requiresApproval: boolean; message: string }>(`/api/appointment-pool/${poolId}/admin-assign`, data),

  // Admin approves assignment
  approveAssignment: (poolId: string, data: {
    adminId: string;
    adminName?: string;
  }) => api.post<{ success: boolean; poolItem: AppointmentPoolItem; message: string }>(`/api/appointment-pool/${poolId}/approve`, data),

  // Trigger AI doctor matching
  aiMatch: (poolId: string) => api.post<{
    success: boolean;
    poolItem: AppointmentPoolItem;
    matchedDoctor?: any;
    message: string;
  }>(`/api/appointment-pool/${poolId}/ai-match`, {}),

  // Check if meeting can be joined (within time window)
  checkMeetingTime: (appointmentId: string) => api.get<MeetingTimeCheck & { rules: MeetingTimeRules }>(`/api/appointment-pool/meeting-check/${appointmentId}`),

  // Report missed meeting - triggers auto-reschedule
  reportMissedMeeting: (appointmentId: string, data: {
    missedBy: 'patient' | 'doctor';
  }) => api.post<{ success: boolean; message: string; rescheduled: boolean }>(`/api/appointment-pool/missed-meeting/${appointmentId}`, data),

  // Get meeting time rules
  getMeetingRules: () => api.get<MeetingTimeRules>('/api/appointment-pool/meeting-rules'),

  // Update meeting time rules (admin only)
  updateMeetingRules: (rules: Partial<MeetingTimeRules>) => api.put<{ success: boolean; rules: MeetingTimeRules }>('/api/appointment-pool/meeting-rules', rules),
};

export const doctorService = {
  getAll: () => api.get<Doctor[]>('/api/doctors'),
  getById: (id: string) => api.get<Doctor>(`/api/doctors/${id}`),
  getSchedule: (id: string) => api.get<any>(`/api/doctors/${id}/schedule`),
  searchBySpecialty: (specialty: string) => api.get<Doctor[]>(`/api/doctors/search/specialty/${encodeURIComponent(specialty)}`),
};

export const pdpaService = {
  getConsents: (userId: string) => api.get<any>(`/api/pdpa/consents/${userId}`),
  updateConsent: (userId: string, consentId: string, granted: boolean) => 
    api.put<any>(`/api/pdpa/consents/${userId}/${consentId}`, { granted }),
  grantConsent: (userId: string, data: any) => api.post<any>(`/api/pdpa/consents/${userId}`, data),
  revokeConsent: (userId: string, consentId: string, reason?: string) => 
    api.put<any>(`/api/pdpa/consents/${userId}/${consentId}/revoke`, { revokeReason: reason }),
  getDoctorConsents: (userId: string) => api.get<any[]>(`/api/pdpa/doctor-consents/${userId}`),
  getAuditLog: (userId: string) => api.get<any[]>(`/api/pdpa/audit/${userId}`),
  getLivingWill: (userId: string) => api.get<any>(`/api/pdpa/living-will/${userId}`),
  saveLivingWill: (userId: string, data: any) => api.post<any>(`/api/pdpa/living-will/${userId}`, data),
  getLivingWillVersions: (userId: string) => api.get<any[]>(`/api/pdpa/living-will/${userId}/versions`),
  getLivingWillVersion: (userId: string, versionId: string) => 
    api.get<any>(`/api/pdpa/living-will/${userId}/versions/${versionId}`),
  rollbackLivingWill: (userId: string, versionId: string) => 
    api.post<any>(`/api/pdpa/living-will/${userId}/rollback/${versionId}`, {}),
  uploadSignature: (userId: string, signatureData: string) => 
    api.post<{ signatureUrl: string }>(`/api/pdpa/living-will/${userId}/signature`, { signatureData }),
};

export const aiService = {
  chat: (message: string, history?: any[], sessionId?: string) => 
    api.post<{ reply: string; sessionId: string }>('/api/ai/chat', { message, conversationHistory: history, sessionId }),
  symptomCheck: (symptoms: string, context?: any) => api.post<any>('/api/ai/symptom-checker', { symptoms, patientContext: context }),
  riskAssessment: (patientData: any) => api.post<any>('/api/ai/risk-assessment', { patientData }),
  // Chat history management - PostgreSQL persistent
  getChatHistory: (sessionId?: string) => 
    api.get<{ sessions?: any[]; history?: any[]; sessionId?: string }>(
      '/api/ai/chat/history' + (sessionId ? `?sessionId=${sessionId}` : '')
    ),
  clearChatHistory: (sessionId?: string) => 
    api.post<{ success: boolean; message: string }>('/api/ai/chat/clear', { sessionId }),
  getChatSessions: () => 
    api.get<{ sessions: Array<{ session_id: string; started_at: string; last_message_at: string; message_count: number }> }>('/api/ai/chat/history'),
};

// Health Logs Service - EMR records sent from doctors
export interface Medication {
  id: string;
  drugName: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  duration?: string;
  quantity?: number;
  instructions?: string;
  warnings?: string[];
}

export interface HealthLogEntry {
  id: string;
  patientId: string;
  emrId?: string;
  encounterDate: string;
  encounterType: string;
  doctorName: string;
  doctorId: string;
  chiefComplaint?: string;
  diagnosis?: Array<{ description: string; status: string }>;
  treatmentPlan?: string;
  medications?: Medication[];  // Prescribed medications
  prescriptionId?: string;     // Link to prescription record
  followUpInstructions?: string;
  followUpDate?: string;
  aiSummary?: string;  // Patient-friendly summary
  signedAt?: string;
  signedBy?: string;
  createdAt: string;
  receivedAt?: string;
  type: 'emr_record' | 'lab_result' | 'prescription' | 'note';
}

export const healthLogsService = {
  // Get all health logs for a patient
  getHealthLogs: (patientId: string, type?: string) => {
    const typeQuery = type ? `?type=${type}` : '';
    return api.get<{ entries: HealthLogEntry[]; total: number; lastUpdated: string }>(
      '/api/phr/' + patientId + '/health-logs' + typeQuery
    );
  },
  
  // Get EMR records specifically
  getEMRRecords: (patientId: string) => 
    api.get<{ entries: HealthLogEntry[]; total: number; lastUpdated: string }>(
      `/api/phr/${patientId}/health-logs?type=emr_record`
    ),
  
  // Get a specific health log entry
  getHealthLogById: (patientId: string, entryId: string) => 
    api.get<HealthLogEntry>(`/api/phr/${patientId}/health-logs/${entryId}`),
};

// Lab Orders Service - View lab results ordered by doctors
export const labOrderService = {
  getOrders: (_patientId: string) =>
    api.get<{ labOrders: any[] }>(`/api/phr/lab-orders`),
  getOrderById: (orderId: string) =>
    api.get<{ labOrder: any }>(`/api/phr/lab-orders/${orderId}`),
  getByPatientId: (patientId: string) =>
    api.get<{ labOrders: any[] }>(`/api/phr/${patientId}/lab-orders`),
};

// Imaging Orders Service - View imaging results ordered by doctors
export const imagingOrderService = {
  getOrders: (_patientId: string) =>
    api.get<{ imagingOrders: any[] }>(`/api/phr/imaging-orders`),
  getOrderById: (orderId: string) =>
    api.get<{ imagingOrder: any }>(`/api/phr/imaging-orders/${orderId}`),
};

export const metadataService = {
  getMedications: () => api.get<any[]>('/api/metadata/medications'),
  searchMedications: (query: string) => api.get<any[]>(`/api/metadata/medications/search?q=${encodeURIComponent(query)}`),
  getSpecialties: () => api.get<any[]>('/api/metadata/specialties'),
  getHealthTips: () => api.get<any[]>('/api/metadata/health-tips'),
};

// Google Services
export const googleService = {
  // Calendar
  createCalendarEvent: (eventData: {
    summary: string;
    description?: string;
    startDateTime: string;
    endDateTime: string;
    location?: string;
    attendees?: { email: string }[];
  }) => api.post<{ 
    success: boolean; 
    calendarUrl: string; 
    event: any 
  }>('/api/google/calendar/event', eventData),
  
  getAvailability: (date: string, doctorId?: string) => 
    api.get<{ slots: any[]; date: string }>(
      '/api/google/calendar/availability?date=' + date + (doctorId ? `&doctorId=${doctorId}` : '')
    ),

  // Google Meet
  createMeetLink: (appointmentData: {
    appointmentId: string;
    patientId: string;
    doctorId: string;
    startDateTime: string;
    endDateTime: string;
    patientName?: string;
    doctorName?: string;
  }) => api.post<{
    success: boolean;
    meetLink: string;
    appointmentId: string;
  }>('/api/google/meet/create', appointmentData),
  
  getMeetInfo: (appointmentId: string) => 
    api.get<{ 
      meetLink: string; 
      appointmentId: string; 
      expiresAt: string 
    }>(`/api/google/meet/${appointmentId}`),

  // Google Maps
  searchNearby: (params: {
    location: string;
    type?: string;
    radius?: number;
    keyword?: string;
  }) => api.get<{
    success: boolean;
    results: any[];
    query: any;
  }>(`/api/google/maps/nearby?${new URLSearchParams(params as any).toString()}`),
  
  getPlaceDetails: (placeId: string) => 
    api.get<{ success: boolean; place: any }>(`/api/google/maps/place/${placeId}`),
  
  getPhotoUrl: (photoReference: string, maxWidth?: number) => {
    const params = new URLSearchParams({ photoReference });
    if (typeof maxWidth === 'number') {
      params.set('maxWidth', String(maxWidth));
    }
    return api.get<{ success: boolean; photoUrl: string }>(`/api/google/maps/photo?${params.toString()}`);
  },
  
  geocode: (address: string) => 
    api.get<{ success: boolean; results: any[] }>(`/api/google/maps/geocode?address=${encodeURIComponent(address)}`),
  
  getDirections: (origin: string, destination: string, mode?: 'driving' | 'walking' | 'bicycling' | 'transit') => 
    api.get<{ success: boolean; routes: any[] }>(
      '/api/google/maps/directions?origin=' + encodeURIComponent(origin) + '&destination=' + encodeURIComponent(destination) + (mode ? `&mode=${mode}` : '')
    ),

  // Status
  getStatus: () => api.get<{
    services: {
      calendar: { configured: boolean; status: string };
      meet: { configured: boolean; status: string };
      maps: { configured: boolean; status: string };
    };
    timestamp: string;
  }>('/api/google/status'),
};

// Notification Service
export interface Notification {
  id: string;
  type: 'appointment_confirmed' | 'appointment_declined' | 'appointment_cancelled' | 'appointment_assigned' | 'emr_ready' | 'appointment_completed' | 'system';
  title: string;
  message: string;
  appointmentId?: string;
  doctorName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  meetingLink?: string;
  calendarUrl?: string;
  emrId?: string;
  isRead: boolean;
  createdAt: string;
}

export const notificationService = {
  // Get all notifications for current user
  getNotifications: (userId: string) => 
    api.get<Notification[]>(`/api/appointments/notifications/${userId}`),
  
  // Mark notification as read
  markAsRead: (userId: string, notificationId: string) => 
    api.put<{ success: boolean }>(`/api/appointments/notifications/${userId}/${notificationId}/read`, {}),
  
  // Mark all notifications as read
  markAllAsRead: async (userId: string) => {
    const notifications = await api.get<Notification[]>(`/api/appointments/notifications/${userId}`);
    const unread = notifications.filter((n: Notification) => !n.isRead);
    await Promise.all(
      unread.map((n: Notification) => 
        api.put(`/api/appointments/notifications/${userId}/${n.id}/read`, {})
      )
    );
    return { success: true, marked: unread.length };
  },

  // Get unread count
  getUnreadCount: async (userId: string): Promise<number> => {
    try {
      const notifications = await api.get<Notification[]>(`/api/appointments/notifications/${userId}`);
      return notifications.filter((n: Notification) => !n.isRead).length;
    } catch {
      return 0;
    }
  },
};
