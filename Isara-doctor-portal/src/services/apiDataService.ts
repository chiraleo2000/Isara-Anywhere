/**
 * API Data Service - PostgreSQL Backend Integration
 *
 * This service replaces gcsDataService.ts for all data operations.
 * All data is fetched from/saved to PostgreSQL via the backend API.
 * 
 * GCS IS NOT USED FOR INTERACTIVE OPERATIONS - PostgreSQL only!
 */

// API Base URL - connects to the mainApiServer
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3010';

// ============================================================================
// AUTH HELPER
// ============================================================================

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('doctorToken') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
}

async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// DASHBOARD
// ============================================================================

export interface DashboardData {
  doctor: any;
  stats: {
    todayAppointments: number;
    patientsSeenToday: number;
    pendingConfirmations: number;
    confirmedAppointments: number;
    totalPatients: number;
    unreadMessages: number;
  };
  queue: any[];
  todaySchedule: any[];
  patients: any[];
}

export async function fetchDashboardData(doctorId: string): Promise<DashboardData> {
  console.log('[API] Fetching dashboard data from PostgreSQL...');
  return fetchAPI<DashboardData>(`/api/dashboard/${doctorId}`);
}

// ============================================================================
// PATIENTS
// ============================================================================

export async function fetchAllPatients(): Promise<any[]> {
  console.log('[API] Fetching all patients from PostgreSQL...');
  const result = await fetchAPI<{ patients: any[] }>('/api/patients');
  return result.patients || [];
}

export async function fetchPatientById(patientId: string): Promise<any> {
  console.log(`[API] Fetching patient ${patientId} from PostgreSQL...`);
  return fetchAPI<any>(`/api/patients/${patientId}`);
}

export async function fetchPatientEMRs(patientId: string): Promise<any[]> {
  console.log(`[API] Fetching EMRs for patient ${patientId}...`);
  const result = await fetchAPI<{ emrs: any[] }>(`/api/emr/patient/${patientId}`);
  return result.emrs || [];
}

export async function fetchPatientLabOrders(patientId: string): Promise<any[]> {
  console.log(`[API] Fetching lab orders for patient ${patientId}...`);
  // Using the patient endpoint which includes lab orders
  const patient = await fetchPatientById(patientId);
  return patient.labOrders || [];
}

export async function fetchPatientPrescriptions(patientId: string): Promise<any[]> {
  console.log(`[API] Fetching prescriptions for patient ${patientId}...`);
  // Using the patient endpoint which includes prescriptions
  const patient = await fetchPatientById(patientId);
  return patient.prescriptions || [];
}

// ============================================================================
// APPOINTMENTS
// ============================================================================

export async function fetchAllAppointments(doctorId?: string): Promise<any[]> {
  console.log('[API] Fetching appointments from PostgreSQL...');
  const params = doctorId ? `?doctorId=${doctorId}` : '';
  const result = await fetchAPI<{ appointments: any[] }>(`/api/appointments${params}`);
  return result.appointments || [];
}

export async function fetchPendingAppointments(doctorId: string): Promise<any[]> {
  console.log(`[API] Fetching pending appointments for doctor ${doctorId}...`);
  const result = await fetchAPI<{ appointments: any[] }>(`/api/appointments/pending/${doctorId}`);
  return result.appointments || [];
}

export async function confirmAppointment(
  appointmentId: string, 
  doctorId: string, 
  confirmedDate?: string, 
  confirmedTime?: string,
  notes?: string
): Promise<{ success: boolean; appointment: any; meetingLink: string }> {
  console.log(`[API] Confirming appointment ${appointmentId}...`);
  return fetchAPI<{ success: boolean; appointment: any; meetingLink: string }>(
    `/api/appointments/${appointmentId}/confirm`,
    {
      method: 'POST',
      body: JSON.stringify({ doctorId, confirmedDate, confirmedTime, notes })
    }
  );
}

// ============================================================================
// EMR
// ============================================================================

export async function createEMR(emrData: any): Promise<{ success: boolean; emr: any }> {
  console.log('[API] Creating EMR in PostgreSQL...');
  return fetchAPI<{ success: boolean; emr: any }>('/api/emr', {
    method: 'POST',
    body: JSON.stringify(emrData)
  });
}

// ============================================================================
// MEDICAL CONTENT
// ============================================================================

export async function fetchMedicalContent(status?: string, category?: string): Promise<any[]> {
  console.log('[API] Fetching medical content from PostgreSQL...');
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (category) params.append('category', category);
  const queryString = params.toString() ? `?${params.toString()}` : '';
  const result = await fetchAPI<{ articles: any[] }>(`/api/medical-content${queryString}`);
  return result.articles || [];
}

export async function createMedicalContent(contentData: any): Promise<{ success: boolean; article: any }> {
  console.log('[API] Creating medical content in PostgreSQL...');
  return fetchAPI<{ success: boolean; article: any }>('/api/medical-content', {
    method: 'POST',
    body: JSON.stringify(contentData)
  });
}

// ============================================================================
// CLINICAL RESOURCES
// ============================================================================

export async function fetchClinicalResources(status?: string, category?: string): Promise<any[]> {
  console.log('[API] Fetching clinical resources from PostgreSQL...');
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (category) params.append('category', category);
  const queryString = params.toString() ? `?${params.toString()}` : '';
  const result = await fetchAPI<{ resources: any[] }>(`/api/clinical-resources${queryString}`);
  return result.resources || [];
}

export async function createClinicalResource(resourceData: any): Promise<{ success: boolean; resource: any }> {
  console.log('[API] Creating clinical resource in PostgreSQL...');
  return fetchAPI<{ success: boolean; resource: any }>('/api/clinical-resources', {
    method: 'POST',
    body: JSON.stringify(resourceData)
  });
}

// ============================================================================
// CONSULTANTS
// ============================================================================

export async function fetchConsultants(specialty?: string): Promise<any[]> {
  console.log('[API] Fetching consultants from PostgreSQL...');
  const params = specialty ? `?specialty=${specialty}` : '';
  const result = await fetchAPI<{ consultants: any[] }>(`/api/consultants${params}`);
  return result.consultants || [];
}

// ============================================================================
// MEETINGS
// ============================================================================

export async function fetchMeetingHistory(doctorId: string): Promise<any[]> {
  console.log(`[API] Fetching meeting history for doctor ${doctorId}...`);
  try {
    // Use the new PostgreSQL-backed meeting history endpoint
    const result = await fetchAPI<{ meetings: any[] }>(`/api/video-meeting/history/${doctorId}`);
    return result.meetings || [];
  } catch (error) {
    console.warn('[API] Meeting history endpoint not available, falling back to appointments...', error);
    // Fallback: Meetings are linked to completed appointments
    const appointments = await fetchAllAppointments(doctorId);
    return appointments.filter(apt => 
      apt.status === 'completed' && apt.meet_link
    ).map(apt => ({
      id: apt.id,
      patientName: apt.patient_name_thai || apt.patient_name,
      date: apt.scheduled_date || apt.confirmed_date,
      time: apt.scheduled_time || apt.confirmed_time,
      meetingLink: apt.meet_link,
      status: 'completed',
      aiSummary: apt.ai_summary
    }));
  }
}

export async function createVideoMeeting(data: {
  appointmentId: string;
  doctorId: string;
  doctorName: string;
  patientId?: string;
  patientName?: string;
  enableRecording?: boolean;
  language?: string;
}): Promise<{ success: boolean; meeting: any; urls: { doctor: string; patient: string; generic: string } }> {
  console.log(`[API] Creating video meeting for appointment ${data.appointmentId}...`);
  return fetchAPI<{ success: boolean; meeting: any; urls: { doctor: string; patient: string; generic: string } }>(
    '/api/video-meeting/create',
    {
      method: 'POST',
      body: JSON.stringify(data)
    }
  );
}

export async function getVideoMeeting(appointmentId: string): Promise<any> {
  console.log(`[API] Getting video meeting for appointment ${appointmentId}...`);
  return fetchAPI<any>(`/api/video-meeting/${appointmentId}`);
}

export async function endVideoMeeting(appointmentId: string, data: {
  doctorId: string;
  doctorName?: string;
  transcript?: any[];
  summary?: any;
  recommendations?: any;
  duration?: number;
  generateSummary?: boolean;
  generateRecommendations?: boolean;
}): Promise<any> {
  console.log(`[API] Ending video meeting for appointment ${appointmentId}...`);
  return fetchAPI<any>(
    `/api/video-meeting/${appointmentId}/end`,
    {
      method: 'POST',
      body: JSON.stringify(data)
    }
  );
}

export async function getMeetingFiles(appointmentId: string, doctorId?: string): Promise<any> {
  console.log(`[API] Getting meeting files for appointment ${appointmentId}...`);
  const params = doctorId ? `?doctorId=${doctorId}` : '';
  return fetchAPI<any>(`/api/video-meeting/${appointmentId}/files${params}`);
}

export async function checkVideoMeetingHealth(): Promise<any> {
  console.log('[API] Checking video meeting service health...');
  return fetchAPI<any>('/api/video-meeting/health');
}

// ============================================================================
// PRESCRIPTIONS
// ============================================================================

export async function fetchPendingPrescriptionsCount(doctorId: string): Promise<number> {
  console.log(`[API] Fetching pending prescriptions count for doctor ${doctorId}...`);
  try {
    const result = await fetchAPI<{ success: boolean; count: number }>(`/api/prescriptions/pending/count/${doctorId}`);
    return result.count || 0;
  } catch (error) {
    console.error('[API] Error fetching pending prescriptions count:', error);
    return 0;
  }
}

export async function fetchPendingPrescriptions(doctorId: string): Promise<any[]> {
  console.log(`[API] Fetching pending prescriptions for doctor ${doctorId}...`);
  try {
    const result = await fetchAPI<{ success: boolean; prescriptions: any[] }>(`/api/prescriptions/pending/${doctorId}`);
    return result.prescriptions || [];
  } catch (error) {
    console.error('[API] Error fetching pending prescriptions:', error);
    return [];
  }
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export async function fetchNotifications(userId: string, unreadOnly = false): Promise<any[]> {
  console.log(`[API] Fetching notifications for user ${userId}...`);
  const params = unreadOnly ? '?unread=true' : '';
  const result = await fetchAPI<{ notifications: any[] }>(`/api/notifications${params}`);
  return result.notifications || [];
}

export async function fetchUnreadNotificationsCount(userId: string): Promise<number> {
  console.log(`[API] Fetching unread notifications count for user ${userId}...`);
  try {
    const result = await fetchAPI<{ success: boolean; count: number; unreadCount: number }>('/api/notifications/count');
    return result.unreadCount || result.count || 0;
  } catch (error) {
    console.error('[API] Error fetching unread notifications count:', error);
    return 0;
  }
}

// ============================================================================
// CACHE MANAGEMENT (No-op - PostgreSQL handles data freshness)
// ============================================================================

export function clearCache(_bucket?: string): void {
  console.log('[API] Cache clear called - no-op (PostgreSQL always fresh)');
}

export function invalidateCache(_bucket?: string, _path?: string): void {
  console.log('[API] Cache invalidate called - no-op (PostgreSQL always fresh)');
}

// ============================================================================
// DOCTORS
// ============================================================================

export async function fetchAllDoctors(): Promise<any[]> {
  console.log('[API] Fetching all doctors from PostgreSQL...');
  const result = await fetchAPI<{ doctors: any[] }>('/api/doctors');
  return result.doctors || [];
}

export async function fetchDoctorAppointments(doctorId: string): Promise<any[]> {
  console.log(`[API] Fetching appointments for doctor ${doctorId}...`);
  return fetchAllAppointments(doctorId);
}

// ============================================================================
// APPOINTMENT SAVE OPERATIONS (PostgreSQL-backed)
// ============================================================================

export async function saveAppointment(appointment: any): Promise<{ success: boolean; appointment: any }> {
  console.log('[API] Saving appointment to PostgreSQL...');
  if (appointment.id) {
    // Update existing
    return fetchAPI<{ success: boolean; appointment: any }>(
      `/api/appointments/${appointment.id}`,
      {
        method: 'PUT',
        body: JSON.stringify(appointment)
      }
    );
  } else {
    // Create new
    return fetchAPI<{ success: boolean; appointment: any }>(
      '/api/appointments',
      {
        method: 'POST',
        body: JSON.stringify(appointment)
      }
    );
  }
}

export async function saveAllAppointments(appointments: any[]): Promise<{ success: boolean; count: number }> {
  console.log('[API] Bulk saving appointments to PostgreSQL...');
  const results = await Promise.all(appointments.map(apt => saveAppointment(apt)));
  const successCount = results.filter(r => r.success).length;
  return { success: successCount === appointments.length, count: successCount };
}

// ============================================================================
// GCS REPLACEMENT - Data operations go to PostgreSQL
// ============================================================================

/**
 * @deprecated Use specific API functions instead.
 * This is a compatibility shim that logs a warning.
 */
export async function writeToGCS(_bucket: string, _path: string, _data: any): Promise<{ success: boolean }> {
  console.warn('[API] writeToGCS called - this should use PostgreSQL! Operation may not persist correctly.');
  console.warn('[API] Use specific API functions like saveAppointment(), createEMR(), etc.');
  // Return success to prevent crashes but data won't persist
  return { success: false };
}

/**
 * @deprecated Use specific API functions instead.
 */
export async function fetchFromGCS(_bucket: string, _path: string): Promise<any> {
  console.warn('[API] fetchFromGCS called - this should use PostgreSQL!');
  console.warn('[API] Use specific API functions like fetchAllPatients(), fetchAllAppointments(), etc.');
  return null;
}

// ============================================================================
// COMPATIBILITY - Aliased exports for easy migration
// ============================================================================

export { fetchAllPatients as getPatients };
export { fetchDashboardData as fetchDoctorQueue };
