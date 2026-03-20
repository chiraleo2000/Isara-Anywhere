import { api } from './client';
import type {
  PatientLoginResponse,
  PatientRegisterRequest,
  Appointment,
  BookAppointmentRequest,
  PHRRecord,
  VitalSign,
  TimelineEntry,
  LabOrder,
  Prescription,
  LivingWill,
  MedicationReminder,
  Notification,
  Doctor,
} from '../types';

export const patientApi = {
  login: (data: { email: string; password: string }) =>
    api.post<PatientLoginResponse>('patient', '/api/auth/login', data),

  register: (data: PatientRegisterRequest) =>
    api.post<{ user: { id: string }; token: string } | { success: boolean; alreadyExists: boolean }>(
      'patient', '/api/auth/register', data,
    ),

  getMe: () =>
    api.get<{ user: { id: string; name: string; email: string } }>('patient', '/api/auth/me'),

  updateProfile: (data: Record<string, unknown>) =>
    api.put<{ success: boolean }>('patient', '/api/auth/profile', data),

  requestPasswordReset: (email: string) =>
    api.post<{ success: boolean }>('patient', '/api/auth/request-password-reset', { email }),

  getUpcomingAppointments: () =>
    api.get<{ appointments: Appointment[] }>('patient', '/api/appointments/upcoming'),

  getAppointmentHistory: () =>
    api.get<{ appointments: Appointment[] }>('patient', '/api/appointments/history'),

  getAppointment: (id: string) =>
    api.get<{ appointment: Appointment }>('patient', `/api/appointments/${encodeURIComponent(id)}`),

  bookAppointment: (data: BookAppointmentRequest) =>
    api.post<{ appointment: Appointment }>('patient', '/api/appointments', data),

  cancelAppointment: (id: string) =>
    api.put<{ success: boolean }>('patient', `/api/appointments/${encodeURIComponent(id)}/cancel`),

  getDoctors: () =>
    api.get<{ doctors: Doctor[] }>('patient', '/api/doctors'),

  getPHR: (patientId: string) =>
    api.get<{ phr: PHRRecord }>('patient', `/api/phr/${encodeURIComponent(patientId)}`),

  getVitals: (patientId: string) =>
    api.get<{ vitals: VitalSign[] }>('patient', `/api/phr/${encodeURIComponent(patientId)}/vitals`),

  addVital: (patientId: string, data: Omit<VitalSign, 'id' | 'patientId' | 'recordedAt'>) =>
    api.post<{ vital: VitalSign }>('patient', `/api/phr/${encodeURIComponent(patientId)}/vitals`, data),

  getLatestVitals: () =>
    api.get<{ vitals: VitalSign[] }>('patient', '/api/vitals/latest'),

  getTimeline: (patientId: string) =>
    api.get<{ timeline: TimelineEntry[] }>('patient', `/api/phr/${encodeURIComponent(patientId)}/timeline`),

  getLabOrders: () =>
    api.get<{ labOrders: LabOrder[] }>('patient', '/api/phr/lab-orders'),

  getPrescriptions: (patientId: string) =>
    api.get<{ prescriptions: Prescription[] }>('patient', `/api/prescriptions/patient/${encodeURIComponent(patientId)}`),

  getLivingWill: (patientId: string) =>
    api.get<{ livingWill: LivingWill }>('patient', `/api/phr/${encodeURIComponent(patientId)}/living-will`),

  saveLivingWill: (patientId: string, data: Partial<LivingWill>) =>
    api.post<{ livingWill: LivingWill }>('patient', `/api/phr/${encodeURIComponent(patientId)}/living-will`, data),

  getMedicationReminders: () =>
    api.get<{ reminders: MedicationReminder[] }>('patient', '/api/medication-reminders'),

  markReminderTaken: (id: string) =>
    api.put<{ success: boolean }>('patient', `/api/medication-reminders/${encodeURIComponent(id)}/taken`),

  getMedicalContent: () =>
    api.get<{ content: Array<{ id: string; title: string; body: string; category: string }> }>(
      'patient', '/api/content/medical?status=published',
    ),

  getDocuments: () =>
    api.get<{ documents: Array<{ id: string; name: string; url: string }> }>('patient', '/api/documents'),

  getNotifications: () =>
    api.get<{ notifications: Notification[] }>('patient', '/api/notifications'),

  markNotificationRead: (id: string) =>
    api.put<{ success: boolean }>('patient', `/api/notifications/${encodeURIComponent(id)}/read`),

  sendAIMessage: (message: string, history?: Array<{ role: string; content: string }>) =>
    api.post<{ response: string }>('patient', '/api/ai/chat', { message, history }),

  getPDPAConsent: (patientId: string) =>
    api.get<{ consent: Record<string, unknown> }>('patient', `/api/phr/${encodeURIComponent(patientId)}/pdpa-consent`),

  savePDPAConsent: (patientId: string, consent: Record<string, unknown>) =>
    api.post<{ success: boolean }>('patient', `/api/phr/${encodeURIComponent(patientId)}/pdpa-consent`, consent),
};
