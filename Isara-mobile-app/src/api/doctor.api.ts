import { api } from './client';
import type {
  DoctorLoginResponse,
  DoctorRegisterRequest,
  DoctorRegisterResponse,
  Appointment,
  EMRRecord,
  Drug,
  LabOrder,
  ImagingOrder,
  Prescription,
  Notification,
} from '../types';

export const doctorApi = {
  // Auth (port 3011)
  login: (data: { email: string; password: string }) =>
    api.post<DoctorLoginResponse>('doctorAuth', '/auth/login', data),

  register: (data: DoctorRegisterRequest) =>
    api.post<DoctorRegisterResponse>('doctorAuth', '/auth/register', data),

  getMe: () =>
    api.get<{ user: { id: string; name: string; email: string; isApproved: boolean } }>('doctorAuth', '/auth/me'),

  requestPasswordReset: (email: string) =>
    api.post<{ success: boolean }>('doctorAuth', '/auth/request-password-reset', { email }),

  // Dashboard (port 3009)
  getDashboard: (doctorId: string) =>
    api.get<{ stats: { pending: number; confirmed: number; completedToday: number }; schedule: Appointment[] }>(
      'doctorApi', `/api/dashboard/${encodeURIComponent(doctorId)}`,
    ),

  // Appointments
  getAppointments: (doctorId: string) =>
    api.get<{ appointments: Appointment[] }>(
      'doctorApi', `/api/appointments?doctorId=${encodeURIComponent(doctorId)}`,
    ),

  claimAppointment: (appointmentId: string) =>
    api.post<{ success: boolean }>(
      'doctorApi', `/api/appointments/${encodeURIComponent(appointmentId)}/claim`,
    ),

  // Queue
  getQueue: () =>
    api.get<{ queue: Appointment[] }>('doctorApi', '/api/queue'),

  // Patients
  getPatients: (search?: string) => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return api.get<{ patients: Array<{ id: string; name: string; email: string }> }>(
      'doctorApi', `/api/patients${query}`,
    );
  },

  getPatientDetail: (patientId: string) =>
    api.get<{ patient: { id: string; name: string; phr: unknown; emr: unknown } }>(
      'doctorApi', `/api/patients/${encodeURIComponent(patientId)}`,
    ),

  getPatientPHR: (patientId: string) =>
    api.get<{ phr: unknown }>(
      'doctorApi', `/api/patients/${encodeURIComponent(patientId)}/phr`,
    ),

  getPatientEMR: (patientId: string) =>
    api.get<{ records: EMRRecord[] }>(
      'doctorApi', `/api/emr?patientId=${encodeURIComponent(patientId)}`,
    ),

  getPatientPrescriptions: (patientId: string) =>
    api.get<{ prescriptions: Prescription[] }>(
      'doctorApi', `/api/prescriptions/patient/${encodeURIComponent(patientId)}`,
    ),

  getPatientLabOrders: (patientId: string) =>
    api.get<{ labOrders: LabOrder[] }>(
      'doctorApi', `/api/lab-orders/patient/${encodeURIComponent(patientId)}`,
    ),

  // EMR
  createEMR: (data: Partial<EMRRecord>) =>
    api.post<{ emr: EMRRecord }>('doctorApi', '/api/emr', data),

  signEMR: (emrId: string) =>
    api.put<{ success: boolean }>(
      'doctorApi', `/api/emr/${encodeURIComponent(emrId)}/sign`,
    ),

  // Prescriptions
  createPrescription: (data: Partial<Prescription>) =>
    api.post<{ prescription: Prescription }>('doctorApi', '/api/prescriptions', data),

  // Drugs
  searchDrugs: (query?: string) => {
    const searchParam = query ? `?search=${encodeURIComponent(query)}` : '';
    return api.get<{ drugs: Drug[] }>('doctorApi', `/api/drugs${searchParam}`);
  },

  // Lab Orders
  createLabOrder: (data: Partial<LabOrder>) =>
    api.post<{ labOrder: LabOrder }>('doctorApi', '/api/lab-orders', data),

  uploadLabResults: (labOrderId: string, results: string) =>
    api.put<{ success: boolean }>(
      'doctorApi', `/api/lab-orders/${encodeURIComponent(labOrderId)}/results`, { results },
    ),

  // Imaging Orders
  createImagingOrder: (data: Partial<ImagingOrder>) =>
    api.post<{ imagingOrder: ImagingOrder }>('doctorApi', '/api/imaging-orders', data),

  uploadImagingResults: (orderId: string, results: string) =>
    api.put<{ success: boolean }>(
      'doctorApi', `/api/imaging-orders/${encodeURIComponent(orderId)}/results`, { results },
    ),

  // Medical Content
  getMedicalContent: () =>
    api.get<{ content: Array<{ id: string; title: string; status: string }> }>('doctorApi', '/api/content/medical'),

  createMedicalContent: (data: { title: string; body: string; category: string }) =>
    api.post<{ content: { id: string } }>('doctorApi', '/api/content/medical', data),

  updateMedicalContent: (id: string, data: Record<string, unknown>) =>
    api.put<{ success: boolean }>(
      'doctorApi', `/api/content/medical/${encodeURIComponent(id)}`, data,
    ),

  // Clinical Resources
  getClinicalResources: () =>
    api.get<{ resources: Array<{ id: string; title: string; type: string }> }>('doctorApi', '/api/clinical-resources'),

  createClinicalResource: (data: Record<string, unknown>) =>
    api.post<{ resource: { id: string } }>('doctorApi', '/api/clinical-resources', data),

  updateClinicalResource: (id: string, data: Record<string, unknown>) =>
    api.put<{ success: boolean }>(
      'doctorApi', `/api/clinical-resources/${encodeURIComponent(id)}`, data,
    ),

  deleteClinicalResource: (id: string) =>
    api.delete<{ success: boolean }>(
      'doctorApi', `/api/clinical-resources/${encodeURIComponent(id)}`,
    ),

  // Doctor Profile & Availability
  updateProfile: (data: Record<string, unknown>) =>
    api.put<{ success: boolean }>('doctorApi', '/api/doctors/profile', data),

  getAvailability: (doctorId: string) =>
    api.get<{ availability: Array<{ day: string; slots: string[] }> }>(
      'doctorApi', `/api/doctors/${encodeURIComponent(doctorId)}/availability`,
    ),

  updateAvailability: (doctorId: string, data: Array<{ day: string; slots: string[] }>) =>
    api.put<{ success: boolean }>(
      'doctorApi', `/api/doctors/${encodeURIComponent(doctorId)}/availability`, data,
    ),

  // AI
  sendAIChat: (message: string, context?: Record<string, unknown>) =>
    api.post<{ response: string }>('doctorApi', '/api/ai/chat', { message, context }),

  cdsCheck: (data: Record<string, unknown>) =>
    api.post<{ result: unknown }>('doctorApi', '/api/ai/cds-check', data),

  generateEMRSummary: (meetingId: string) =>
    api.post<{ summary: unknown }>('doctorApi', '/api/ai/emr-summary', { meetingId }),

  // Admin
  getAdminUsers: () =>
    api.get<{ users: Array<{ id: string; name: string; email: string; isApproved: boolean }> }>('doctorApi', '/api/admin/users'),

  approveUser: (userId: string) =>
    api.put<{ success: boolean }>(
      'doctorApi', `/api/admin/users/${encodeURIComponent(userId)}/approve`,
    ),

  // Notifications
  getNotifications: () =>
    api.get<{ notifications: Notification[] }>('doctorApi', '/api/notifications'),

  markNotificationRead: (id: string) =>
    api.put<{ success: boolean }>(
      'doctorApi', `/api/notifications/${encodeURIComponent(id)}/read`,
    ),
};
