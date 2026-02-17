/**
 * @izara/api-client
 *
 * Shared API client library for Izara mobile apps.
 * Wraps all Patient Portal (port 3005) and Doctor Portal (ports 3009/3011/3012)
 * API endpoints into typed, reusable functions.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface ApiConfig {
  baseURL: string;
  timeout?: number;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface LoginResponse extends AuthTokens {
  user: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code: string;
  status: number;
}

// ─────────────────────────────────────────────
// Base API Client
// ─────────────────────────────────────────────

class BaseApiClient {
  protected client: AxiosInstance;
  private refreshPromise: Promise<string> | null = null;

  constructor(config: ApiConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout ?? 30_000,
      headers: {
        'Content-Type': 'application/json',
        'X-Platform': 'mobile',
        'X-App-Version': '2.0.0',
        'X-Device-ID': `mobile-${Date.now()}`,
      },
    });

    // Request interceptor: attach auth token
    this.client.interceptors.request.use(async (reqConfig) => {
      const token = await SecureStore.getItemAsync('izara_access_token');
      if (token) {
        reqConfig.headers.Authorization = `Bearer ${token}`;
      }
      return reqConfig;
    });

    // Response interceptor: handle 401 with token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshAccessToken();
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return this.client(originalRequest);
          } catch {
            // Refresh failed, user needs to re-login
            await SecureStore.deleteItemAsync('izara_access_token');
            await SecureStore.deleteItemAsync('izara_refresh_token');
            throw error;
          }
        }

        throw this.normalizeError(error);
      }
    );
  }

  private async refreshAccessToken(): Promise<string> {
    // Deduplicate concurrent refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      const refreshToken = await SecureStore.getItemAsync('izara_refresh_token');
      if (!refreshToken) throw new Error('No refresh token');

      const response = await axios.post(`${this.client.defaults.baseURL}/auth/refresh`, {
        refresh_token: refreshToken,
      });

      const { access_token, refresh_token } = response.data;
      await SecureStore.setItemAsync('izara_access_token', access_token);
      await SecureStore.setItemAsync('izara_refresh_token', refresh_token);

      return access_token;
    })();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private normalizeError(error: AxiosError): ApiError {
    const data = error.response?.data as any;
    return {
      message: data?.message || data?.error || error.message || 'Unknown error',
      code: data?.code || 'UNKNOWN',
      status: error.response?.status || 0,
    };
  }
}

// ─────────────────────────────────────────────
// Patient API Client (port 3005)
// ─────────────────────────────────────────────

export class PatientApiClient extends BaseApiClient {
  // ── Auth ──
  async login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await this.client.post('/auth/login', { email, password });
    return data;
  }

  async loginWithBiometric(email: string, biometricToken: string): Promise<LoginResponse> {
    const { data } = await this.client.post('/auth/biometric-login', { email, biometric_token: biometricToken });
    return data;
  }

  async register(userData: any): Promise<LoginResponse> {
    const { data } = await this.client.post('/auth/register', userData);
    return data;
  }

  async logout(token: string): Promise<void> {
    await this.client.post('/auth/logout', {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const { data } = await this.client.post('/auth/refresh', { refresh_token: refreshToken });
    return data;
  }

  async getProfile(token?: string): Promise<any> {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const { data } = await this.client.get('/auth/profile', { headers });
    return data;
  }

  // ── Appointments ──
  async getUpcomingAppointments(): Promise<any[]> {
    const { data } = await this.client.get('/appointments/upcoming');
    return data;
  }

  async getAppointments(params?: { status?: string; page?: number; limit?: number }): Promise<PaginatedResponse<any>> {
    const { data } = await this.client.get('/appointments', { params });
    return data;
  }

  async getAppointmentById(id: string): Promise<any> {
    const { data } = await this.client.get(`/appointments/${id}`);
    return data;
  }

  async createAppointment(appointmentData: any): Promise<any> {
    const { data } = await this.client.post('/appointments', appointmentData);
    return data;
  }

  async cancelAppointment(id: string, reason: string): Promise<void> {
    await this.client.put(`/appointments/${id}/cancel`, { reason });
  }

  async rescheduleAppointment(id: string, newDate: string, newTime: string): Promise<any> {
    const { data } = await this.client.put(`/appointments/${id}/reschedule`, {
      date: newDate,
      time: newTime,
    });
    return data;
  }

  // ── Health Records / PHR ──
  async getHealthSummary(): Promise<any> {
    const { data } = await this.client.get('/phr/summary');
    return data;
  }

  async getVitals(params?: { type?: string; startDate?: string; endDate?: string }): Promise<any[]> {
    const { data } = await this.client.get('/phr/vitals', { params });
    return data;
  }

  async recordVitals(vitalsData: any): Promise<any> {
    const { data } = await this.client.post('/phr/vitals', vitalsData);
    return data;
  }

  async getMedications(): Promise<any[]> {
    const { data } = await this.client.get('/phr/medications');
    return data;
  }

  async getEMRHistory(): Promise<any[]> {
    const { data } = await this.client.get('/phr/emr');
    return data;
  }

  async getEMRById(id: string): Promise<any> {
    const { data } = await this.client.get(`/phr/emr/${id}`);
    return data;
  }

  async getHealthLogs(): Promise<any[]> {
    const { data } = await this.client.get('/phr/health-logs');
    return data;
  }

  async createHealthLog(logData: any): Promise<any> {
    const { data } = await this.client.post('/phr/health-logs', logData);
    return data;
  }

  // ── AI Chat ──
  async sendAIMessage(message: string, conversationId?: string): Promise<any> {
    const { data } = await this.client.post('/ai/chat', {
      message,
      conversation_id: conversationId,
    });
    return data;
  }

  async getAIConversations(): Promise<any[]> {
    const { data } = await this.client.get('/ai/conversations');
    return data;
  }

  async getAIConversation(id: string): Promise<any> {
    const { data } = await this.client.get(`/ai/conversations/${id}`);
    return data;
  }

  // ── Notifications ──
  async getNotifications(params?: { page?: number; limit?: number }): Promise<PaginatedResponse<any>> {
    const { data } = await this.client.get('/notifications', { params });
    return data;
  }

  async getUnreadNotificationCount(): Promise<{ count: number }> {
    const { data } = await this.client.get('/notifications/unread-count');
    return data;
  }

  async markNotificationRead(id: string): Promise<void> {
    await this.client.put(`/notifications/${id}/read`);
  }

  async markAllNotificationsRead(): Promise<void> {
    await this.client.put('/notifications/read-all');
  }

  // ── Device / Push ──
  async registerDevice(deviceData: {
    token: string;
    platform: 'ios' | 'android';
    device_id: string;
    device_model: string;
    os_version: string;
  }): Promise<void> {
    await this.client.post('/devices/register', deviceData);
  }

  async unregisterDevice(deviceId: string): Promise<void> {
    await this.client.delete(`/devices/${deviceId}`);
  }

  // ── Payments ──
  async createPaymentIntent(appointmentId: string, amount: number): Promise<any> {
    const { data } = await this.client.post('/payments/create-intent', {
      appointment_id: appointmentId,
      amount,
    });
    return data;
  }

  async getPaymentHistory(): Promise<any[]> {
    const { data } = await this.client.get('/payments/history');
    return data;
  }

  // ── Doctors (directory) ──
  async searchDoctors(params?: { specialty?: string; name?: string }): Promise<any[]> {
    const { data } = await this.client.get('/doctors/search', { params });
    return data;
  }

  async getDoctorAvailability(doctorId: string, date: string): Promise<any> {
    const { data } = await this.client.get(`/doctors/${doctorId}/availability`, {
      params: { date },
    });
    return data;
  }

  // ── Meeting ──
  async getJitsiToken(appointmentId: string): Promise<{ token: string; roomName: string }> {
    const { data } = await this.client.get(`/meeting/${appointmentId}/token`);
    return data;
  }
}

// ─────────────────────────────────────────────
// Doctor API Client (ports 3009 / 3011 / 3012)
// ─────────────────────────────────────────────

export class DoctorApiClient extends BaseApiClient {
  private authClient: AxiosInstance;
  private gcsClient: AxiosInstance;

  constructor(config: {
    apiBaseURL: string;      // port 3009
    authBaseURL: string;     // port 3011
    gcsBaseURL: string;      // port 3012
    timeout?: number;
  }) {
    super({ baseURL: config.apiBaseURL, timeout: config.timeout });

    const commonHeaders = {
      'Content-Type': 'application/json',
      'X-Platform': 'mobile',
      'X-App-Version': '2.0.0',
    };

    this.authClient = axios.create({
      baseURL: config.authBaseURL,
      timeout: config.timeout ?? 30_000,
      headers: { ...commonHeaders },
    });

    this.gcsClient = axios.create({
      baseURL: config.gcsBaseURL,
      timeout: config.timeout ?? 30_000,
      headers: { ...commonHeaders },
    });

    // Add auth token interceptors to authClient and gcsClient
    [this.authClient, this.gcsClient].forEach((client) => {
      client.interceptors.request.use(async (reqConfig) => {
        const token = await SecureStore.getItemAsync('izara_access_token');
        if (token && reqConfig.headers) {
          reqConfig.headers.Authorization = `Bearer ${token}`;
        }
        return reqConfig;
      });
    });
  }

  // ── Auth (port 3011) ──
  async login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await this.authClient.post('/auth/login', { email, password });
    return data;
  }

  async loginWithBiometric(email: string, biometricToken: string): Promise<LoginResponse> {
    const { data } = await this.authClient.post('/auth/biometric-login', { email, biometric_token: biometricToken });
    return data;
  }

  async register(userData: any): Promise<LoginResponse> {
    const { data } = await this.authClient.post('/auth/register', userData);
    return data;
  }

  async verify2FA(token: string, code: string): Promise<LoginResponse> {
    const { data } = await this.authClient.post('/auth/verify-2fa', { token, code });
    return data;
  }

  async logout(token: string): Promise<void> {
    await this.authClient.post('/auth/logout', {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const { data } = await this.authClient.post('/auth/refresh', { refresh_token: refreshToken });
    return data;
  }

  async getProfile(token?: string): Promise<any> {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const { data } = await this.authClient.get('/auth/profile', { headers });
    return data;
  }

  // ── Today's Data ──
  async getTodayStats(): Promise<any> {
    const { data } = await this.client.get('/dashboard/stats');
    return data;
  }

  async getTodayAppointments(): Promise<any[]> {
    const { data } = await this.client.get('/appointments/today');
    return data;
  }

  async getPendingAppointmentsCount(): Promise<{ count: number }> {
    const { data } = await this.client.get('/appointments/pending/count');
    return data;
  }

  // ── Appointments ──
  async getSchedule(date: string): Promise<any[]> {
    const { data } = await this.client.get('/appointments/schedule', { params: { date } });
    return data;
  }

  async confirmAppointment(id: string): Promise<void> {
    await this.client.put(`/appointments/${id}/confirm`);
  }

  async declineAppointment(id: string, reason: string): Promise<void> {
    await this.client.put(`/appointments/${id}/decline`, { reason });
  }

  // ── Patients ──
  async searchPatients(query: string): Promise<any[]> {
    const { data } = await this.client.get('/patients/search', { params: { q: query } });
    return data;
  }

  async getPatientDetail(patientId: string): Promise<any> {
    const { data } = await this.client.get(`/patients/${patientId}`);
    return data;
  }

  async getPatientPHR(patientId: string): Promise<any> {
    const { data } = await this.client.get(`/patients/${patientId}/phr`);
    return data;
  }

  async getPatientEMRHistory(patientId: string): Promise<any[]> {
    const { data } = await this.client.get(`/patients/${patientId}/emr`);
    return data;
  }

  // ── EMR ──
  async createEMR(emrData: any): Promise<any> {
    const { data } = await this.client.post('/emr', emrData);
    return data;
  }

  async getEMRById(emrId: string): Promise<any> {
    const { data } = await this.client.get(`/emr/${emrId}`);
    return data;
  }

  async updateEMR(emrId: string, emrData: any): Promise<any> {
    const { data } = await this.client.put(`/emr/${emrId}`, emrData);
    return data;
  }

  // ── Prescriptions ──
  async createPrescription(prescriptionData: any): Promise<any> {
    const { data } = await this.client.post('/prescriptions', prescriptionData);
    return data;
  }

  async searchMedications(query: string): Promise<any[]> {
    const { data } = await this.client.get('/medications/search', { params: { q: query } });
    return data;
  }

  // ── Queue ──
  async getQueue(): Promise<any[]> {
    const { data } = await this.client.get('/queue');
    return data;
  }

  async callNextPatient(): Promise<any> {
    const { data } = await this.client.post('/queue/next');
    return data;
  }

  async completeQueueItem(queueId: string): Promise<void> {
    await this.client.put(`/queue/${queueId}/complete`);
  }

  // ── AI Copilot ──
  async getAISummary(appointmentId: string): Promise<any> {
    const { data } = await this.client.get(`/ai/summary/${appointmentId}`);
    return data;
  }

  async getDiagnosisSuggestions(symptoms: string): Promise<any> {
    const { data } = await this.client.post('/ai/diagnosis-suggest', { symptoms });
    return data;
  }

  async generateEMRDraft(appointmentId: string, transcription?: string): Promise<any> {
    const { data } = await this.client.post('/ai/emr-draft', {
      appointment_id: appointmentId,
      transcription,
    });
    return data;
  }

  // ── Notifications ──
  async getUnreadNotificationCount(): Promise<{ count: number }> {
    const { data } = await this.client.get('/notifications/unread-count');
    return data;
  }

  // ── Meeting ──
  async getJitsiHostToken(appointmentId: string): Promise<{ token: string; roomName: string }> {
    const { data } = await this.client.get(`/meeting/${appointmentId}/host-token`);
    return data;
  }

  // ── GCS / File Upload (port 3012) ──
  async uploadFile(formData: FormData): Promise<{ url: string; key: string }> {
    const { data } = await this.gcsClient.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }

  async getSignedUrl(key: string): Promise<{ url: string }> {
    const { data } = await this.gcsClient.get('/signed-url', { params: { key } });
    return data;
  }
}

// ─────────────────────────────────────────────
// Singleton Instances (configured at app startup)
// ─────────────────────────────────────────────

let _patientApi: PatientApiClient | null = null;
let _doctorApi: DoctorApiClient | null = null;

export function initPatientApi(config: ApiConfig): PatientApiClient {
  _patientApi = new PatientApiClient(config);
  return _patientApi;
}

export function initDoctorApi(config: {
  apiBaseURL: string;
  authBaseURL: string;
  gcsBaseURL: string;
  timeout?: number;
}): DoctorApiClient {
  _doctorApi = new DoctorApiClient(config);
  return _doctorApi;
}

export const patientApi = new Proxy({} as PatientApiClient, {
  get(_, prop) {
    if (!_patientApi) throw new Error('Patient API not initialized. Call initPatientApi() first.');
    return (_patientApi as any)[prop];
  },
});

export const doctorApi = new Proxy({} as DoctorApiClient, {
  get(_, prop) {
    if (!_doctorApi) throw new Error('Doctor API not initialized. Call initDoctorApi() first.');
    return (_doctorApi as any)[prop];
  },
});
