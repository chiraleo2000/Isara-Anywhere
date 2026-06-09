/**
 * PostgreSQL Service for Patient Portal - Phase 1
 * 
 * Provides data access layer for:
 * - User authentication
 * - Personal Health Records (PHR)
 * - Appointments management
 * - Medication tracking
 * - Health data sync
 */

import { resolveApiBaseUrl } from '../utils/resolveApiBaseUrl';

function apiBaseUrl(): string {
  return resolveApiBaseUrl();
}

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  nameThai?: string;
  age?: number;
  gender?: 'male' | 'female';
  bloodType?: string;
  phoneNumber?: string;
  role: 'patient';
  profileImage?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface Allergy {
  allergen: string;
  allergenThai?: string;
  type: 'drug' | 'food' | 'environmental';
  reaction: string;
  reactionThai?: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life_threatening';
  dateIdentified?: string;
}

export interface ChronicCondition {
  condition: string;
  conditionThai?: string;
  icdCode?: string;
  diagnosedDate: string;
  status: 'active' | 'controlled' | 'in_remission' | 'resolved';
  treatingPhysician?: string;
  notes?: string;
}

export interface Medication {
  name: string;
  nameThai?: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  route: string;
  startDate: string;
  prescribedBy?: string;
  forCondition?: string;
  instructions?: string;
  instructionsThai?: string;
}

export interface VitalSigns {
  recordedAt: string;
  bloodPressure?: {
    systolic: number;
    diastolic: number;
    unit: 'mmHg';
  };
  heartRate?: {
    value: number;
    unit: 'bpm';
  };
  temperature?: {
    value: number;
    unit: 'celsius';
  };
  weight?: {
    value: number;
    unit: 'kg';
  };
  height?: {
    value: number;
    unit: 'cm';
  };
  oxygenSaturation?: {
    value: number;
    unit: '%';
  };
  bloodGlucose?: {
    value: number;
    unit: 'mg/dL';
    timing: 'fasting' | 'random' | 'postprandial';
  };
}

export interface PHR {
  patientId: string;
  demographics: {
    name: string;
    nameThai?: string;
    dateOfBirth: string;
    age: number;
    gender: 'male' | 'female';
    bloodType: string;
    idNumber?: string;
    address?: string;
  };
  allergies: Allergy[];
  chronicConditions: ChronicCondition[];
  currentMedications: Medication[];
  vitalSigns: VitalSigns[];
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  lastUpdated: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName?: string;
  scheduledAt: string;
  duration: number;
  type: 'video' | 'chat' | 'in_person';
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  reason: string;
  symptoms?: string[];
  notes?: string;
  meetingLink?: string;
  createdAt: string;
}

export interface MedicationReminder {
  id: string;
  medicationName: string;
  dosage: string;
  scheduledTime: string;
  taken: boolean;
  takenAt?: string;
  skipped: boolean;
  skipReason?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Helper function for API calls
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const token = localStorage.getItem('authToken');
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${apiBaseUrl()}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || `HTTP ${response.status}`,
      };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error(`API Error [${endpoint}]:`, error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
}

// ===== Authentication =====

export async function login(
  email: string,
  password: string
): Promise<ApiResponse<{ user: User; token: string }>> {
  const result = await apiCall<{ user: User; token: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (result.success && result.data) {
    localStorage.setItem('authToken', result.data.token);
    localStorage.setItem('user', JSON.stringify(result.data.user));
  }

  return result;
}

export async function register(userData: {
  email: string;
  password: string;
  name: string;
  nameThai?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
}): Promise<ApiResponse<{ user: User; token: string }>> {
  return apiCall('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ ...userData, role: 'patient' }),
  });
}

export async function logout(): Promise<void> {
  await apiCall('/api/auth/logout', { method: 'POST' });
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
}

export function getCurrentUser(): User | null {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

export async function updateProfile(
  profileData: Partial<User>
): Promise<ApiResponse<User>> {
  return apiCall('/api/patients/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
}

// ===== Personal Health Records =====

export async function getPHR(): Promise<ApiResponse<PHR>> {
  return apiCall('/api/patients/phr');
}

export async function updatePHR(phrData: Partial<PHR>): Promise<ApiResponse<PHR>> {
  return apiCall('/api/patients/phr', {
    method: 'PUT',
    body: JSON.stringify(phrData),
  });
}

// Allergies
export async function addAllergy(allergy: Allergy): Promise<ApiResponse<Allergy>> {
  return apiCall('/api/patients/phr/allergies', {
    method: 'POST',
    body: JSON.stringify(allergy),
  });
}

export async function removeAllergy(allergen: string): Promise<ApiResponse<void>> {
  return apiCall(`/api/patients/phr/allergies/${encodeURIComponent(allergen)}`, {
    method: 'DELETE',
  });
}

// Chronic Conditions
export async function addChronicCondition(
  condition: ChronicCondition
): Promise<ApiResponse<ChronicCondition>> {
  return apiCall('/api/patients/phr/conditions', {
    method: 'POST',
    body: JSON.stringify(condition),
  });
}

export async function updateChronicCondition(
  conditionId: string,
  updates: Partial<ChronicCondition>
): Promise<ApiResponse<ChronicCondition>> {
  return apiCall(`/api/patients/phr/conditions/${conditionId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

// Medications
export async function getCurrentMedications(): Promise<ApiResponse<Medication[]>> {
  return apiCall('/api/patients/medications');
}

export async function addMedication(
  medication: Medication
): Promise<ApiResponse<Medication>> {
  return apiCall('/api/patients/medications', {
    method: 'POST',
    body: JSON.stringify(medication),
  });
}

// ===== Vital Signs =====

export async function getVitalSigns(options?: {
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<ApiResponse<VitalSigns[]>> {
  const params = new URLSearchParams();
  if (options?.startDate) params.append('startDate', options.startDate);
  if (options?.endDate) params.append('endDate', options.endDate);
  if (options?.limit) params.append('limit', options.limit.toString());
  
  return apiCall(`/api/patients/vitals?${params.toString()}`);
}

export async function recordVitalSigns(vitals: VitalSigns): Promise<ApiResponse<VitalSigns>> {
  return apiCall('/api/patients/vitals', {
    method: 'POST',
    body: JSON.stringify(vitals),
  });
}

export async function getLatestVitals(): Promise<ApiResponse<VitalSigns>> {
  return apiCall('/api/patients/vitals/latest');
}

// ===== Appointments =====

export async function getAppointments(options?: {
  status?: string;
  startDate?: string;
  endDate?: string;
}): Promise<ApiResponse<Appointment[]>> {
  const params = new URLSearchParams();
  if (options?.status) params.append('status', options.status);
  if (options?.startDate) params.append('startDate', options.startDate);
  if (options?.endDate) params.append('endDate', options.endDate);
  
  return apiCall(`/api/appointments?${params.toString()}`);
}

export async function getUpcomingAppointments(): Promise<ApiResponse<Appointment[]>> {
  return apiCall('/api/appointments/upcoming');
}

export async function getAppointmentById(id: string): Promise<ApiResponse<Appointment>> {
  return apiCall(`/api/appointments/${id}`);
}

export async function bookAppointment(appointment: {
  doctorId: string;
  scheduledAt: string;
  type: 'video' | 'chat' | 'in_person';
  reason: string;
  symptoms?: string[];
}): Promise<ApiResponse<Appointment>> {
  return apiCall('/api/appointments', {
    method: 'POST',
    body: JSON.stringify(appointment),
  });
}

export async function cancelAppointment(
  appointmentId: string,
  reason?: string
): Promise<ApiResponse<Appointment>> {
  return apiCall(`/api/appointments/${appointmentId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function rescheduleAppointment(
  appointmentId: string,
  newScheduledAt: string
): Promise<ApiResponse<Appointment>> {
  return apiCall(`/api/appointments/${appointmentId}/reschedule`, {
    method: 'POST',
    body: JSON.stringify({ scheduledAt: newScheduledAt }),
  });
}

export async function joinVideoAppointment(
  appointmentId: string,
  participantId?: string,
  participantName?: string,
  role: 'patient' | 'guest' = 'patient'
): Promise<ApiResponse<{ meetingUrl: string; meeting: { id: string; roomName: string; status: string; participants: number } }>> {
  return apiCall(`/api/video-meeting/${appointmentId}/join`, {
    method: 'POST',
    body: JSON.stringify({ participantId, participantName, role }),
  });
}

// ===== Video Meeting Functions =====

export async function createVideoMeeting(data: {
  appointmentId: string;
  doctorId: string;
  doctorName: string;
  patientId: string;
  patientName: string;
  enableRecording?: boolean;
  language?: string;
}): Promise<ApiResponse<{
  success: boolean;
  meeting: { id: string; appointmentId: string; roomName: string; status: string };
  urls: { doctor: string; patient: string; generic: string };
}>> {
  return apiCall('/api/video-meeting/create', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getVideoMeeting(appointmentId: string): Promise<ApiResponse<{
  success: boolean;
  meeting: {
    id: string;
    appointmentId: string;
    roomName: string;
    jitsiUrl: string;
    status: string;
    participants: Array<{ id: string; name: string; role: string }>;
  };
}>> {
  return apiCall(`/api/video-meeting/${appointmentId}`);
}

export async function checkVideoMeetingHealth(): Promise<ApiResponse<{
  status: string;
  service: string;
  config: Record<string, unknown>;
  features: Record<string, string>;
}>> {
  return apiCall('/api/video-meeting/health');
}

// ===== Medication Reminders =====

export async function getMedicationReminders(
  date?: string
): Promise<ApiResponse<MedicationReminder[]>> {
  const params = date ? `?date=${date}` : '';
  return apiCall(`/api/patients/medication-reminders${params}`);
}

export async function markMedicationTaken(
  reminderId: string
): Promise<ApiResponse<MedicationReminder>> {
  return apiCall(`/api/patients/medication-reminders/${reminderId}/taken`, {
    method: 'POST',
  });
}

export async function skipMedication(
  reminderId: string,
  reason: string
): Promise<ApiResponse<MedicationReminder>> {
  return apiCall(`/api/patients/medication-reminders/${reminderId}/skip`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

// ===== Documents =====

export async function uploadDocument(
  file: File,
  documentType: 'lab_result' | 'prescription' | 'imaging' | 'other',
  description?: string
): Promise<ApiResponse<{ id: string; filename: string; uploadedAt: string }>> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentType', documentType);
  if (description) formData.append('description', description);

  const token = localStorage.getItem('authToken');
  
  try {
    const response = await fetch(`${apiBaseUrl()}/api/patients/documents`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    const data = await response.json();
    return response.ok ? { success: true, data } : { success: false, error: data.error };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getDocuments(): Promise<ApiResponse<any[]>> {
  return apiCall('/api/patients/documents');
}

// ===== Doctor Search =====

export async function searchDoctors(options?: {
  specialty?: string;
  name?: string;
  available?: boolean;
}): Promise<ApiResponse<any[]>> {
  const params = new URLSearchParams();
  if (options?.specialty) params.append('specialty', options.specialty);
  if (options?.name) params.append('name', options.name);
  if (options?.available) params.append('available', 'true');
  
  return apiCall(`/api/doctors/search?${params.toString()}`);
}

export async function getDoctorProfile(doctorId: string): Promise<ApiResponse<any>> {
  return apiCall(`/api/doctors/${doctorId}`);
}

export async function getDoctorAvailability(
  doctorId: string,
  date: string
): Promise<ApiResponse<{ slots: string[] }>> {
  return apiCall(`/api/doctors/${doctorId}/availability?date=${date}`);
}

// ===== Notifications =====

export async function getNotifications(): Promise<ApiResponse<any[]>> {
  return apiCall('/api/notifications');
}

export async function markNotificationRead(
  notificationId: string
): Promise<ApiResponse<void>> {
  return apiCall(`/api/notifications/${notificationId}/read`, {
    method: 'POST',
  });
}

// ===== Health Data Sync =====

export async function syncHealthData(data: {
  source: 'apple_health' | 'google_fit' | 'manual';
  vitals?: VitalSigns;
  steps?: number;
  sleepHours?: number;
  activityMinutes?: number;
}): Promise<ApiResponse<{ synced: boolean; timestamp: string }>> {
  return apiCall('/api/patients/health-sync', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ===== Phase 2: Device Tokens =====

export async function registerDeviceToken(data: {
  token: string;
  platform: 'ios' | 'android' | 'web';
  device_name?: string;
}): Promise<ApiResponse<{ id: string }>> {
  return apiCall('/api/device-tokens', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getDeviceTokens(): Promise<ApiResponse<any[]>> {
  return apiCall('/api/device-tokens');
}

export async function deactivateDeviceToken(token: string): Promise<ApiResponse<void>> {
  return apiCall('/api/device-tokens', {
    method: 'DELETE',
    body: JSON.stringify({ token }),
  });
}

// ===== Phase 2: Biometric Authentication =====

export async function registerBiometric(data: {
  credential_id: string;
  public_key: string;
  device_name: string;
  auth_type: 'fingerprint' | 'face_id' | 'iris';
}): Promise<ApiResponse<{ id: string }>> {
  return apiCall('/api/biometric/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function verifyBiometric(data: {
  credential_id: string;
  signature: string;
}): Promise<ApiResponse<{ session_token: string }>> {
  return apiCall('/api/biometric/verify', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getBiometricStatus(): Promise<ApiResponse<{
  enabled: boolean;
  credentials: any[];
}>> {
  return apiCall('/api/biometric/status');
}

// ===== Phase 2: Offline Sync =====

export async function pushSyncQueue(changes: any[]): Promise<ApiResponse<{
  processed: number;
  conflicts: number;
}>> {
  return apiCall('/api/sync/push', {
    method: 'POST',
    body: JSON.stringify({ changes }),
  });
}

export async function pullSyncChanges(since?: string): Promise<ApiResponse<{
  changes: any[];
  server_timestamp: string;
}>> {
  const query = since ? `?since=${since}` : '';
  return apiCall(`/api/sync/pull${query}`);
}

export async function getSyncConflicts(): Promise<ApiResponse<any[]>> {
  return apiCall('/api/sync/conflicts');
}

export async function resolveSyncConflict(
  conflictId: string,
  resolution: 'client' | 'server'
): Promise<ApiResponse<void>> {
  return apiCall(`/api/sync/conflicts/${conflictId}`, {
    method: 'PUT',
    body: JSON.stringify({ resolution }),
  });
}

export async function getSyncStatus(): Promise<ApiResponse<{
  pending: number;
  last_sync: string;
}>> {
  return apiCall('/api/sync/status');
}

// ===== Phase 2: API Connections =====

export async function getApiConnections(): Promise<ApiResponse<any[]>> {
  return apiCall('/api/connections');
}

export async function connectApiService(data: {
  service_type: string;
  access_token?: string;
  config?: Record<string, any>;
}): Promise<ApiResponse<{ id: string }>> {
  return apiCall('/api/connections', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function disconnectApiService(serviceType: string): Promise<ApiResponse<void>> {
  return apiCall(`/api/connections/${serviceType}`, {
    method: 'DELETE',
  });
}

export async function getApiConnectionHealth(): Promise<ApiResponse<{
  services: Array<{ service_type: string; status: string; latency_ms: number }>;
}>> {
  return apiCall('/api/connections/health/check');
}

// ===== Phase 2: User Settings =====

export async function getUserSettings(): Promise<ApiResponse<any>> {
  return apiCall('/api/settings');
}

export async function updateUserSettings(settings: Record<string, any>): Promise<ApiResponse<any>> {
  return apiCall('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

export async function getNotificationPreferences(): Promise<ApiResponse<any[]>> {
  return apiCall('/api/settings/notifications');
}

export async function updateNotificationPreferences(
  preferences: any[]
): Promise<ApiResponse<void>> {
  return apiCall('/api/settings/notifications', {
    method: 'PUT',
    body: JSON.stringify({ preferences }),
  });
}

export async function switchUserRole(role: 'patient' | 'doctor'): Promise<ApiResponse<void>> {
  return apiCall('/api/settings/role', {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
}

// Export service object
export const postgresService = {
  // Auth
  login,
  register,
  logout,
  getCurrentUser,
  updateProfile,
  
  // PHR
  getPHR,
  updatePHR,
  addAllergy,
  removeAllergy,
  addChronicCondition,
  updateChronicCondition,
  getCurrentMedications,
  addMedication,
  
  // Vitals
  getVitalSigns,
  recordVitalSigns,
  getLatestVitals,
  
  // Appointments
  getAppointments,
  getUpcomingAppointments,
  getAppointmentById,
  bookAppointment,
  cancelAppointment,
  rescheduleAppointment,
  joinVideoAppointment,
  
  // Medications
  getMedicationReminders,
  markMedicationTaken,
  skipMedication,
  
  // Documents
  uploadDocument,
  getDocuments,
  
  // Doctors
  searchDoctors,
  getDoctorProfile,
  getDoctorAvailability,
  
  // Notifications
  getNotifications,
  markNotificationRead,
  
  // Health Sync
  syncHealthData,

  // Phase 2: Device Tokens
  registerDeviceToken,
  getDeviceTokens,
  deactivateDeviceToken,

  // Phase 2: Biometric
  registerBiometric,
  verifyBiometric,
  getBiometricStatus,

  // Phase 2: Offline Sync
  pushSyncQueue,
  pullSyncChanges,
  getSyncConflicts,
  resolveSyncConflict,
  getSyncStatus,

  // Phase 2: API Connections
  getApiConnections,
  connectApiService,
  disconnectApiService,
  getApiConnectionHealth,

  // Phase 2: Settings
  getUserSettings,
  updateUserSettings,
  getNotificationPreferences,
  updateNotificationPreferences,
  switchUserRole,
};

export default postgresService;
