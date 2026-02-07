/**
 * =============================================================================
 * IZARA TELEMEDICINE - SHARED TEST CONFIGURATION v4.0
 * =============================================================================
 * Version: 4.0.0 | Updated: February 6, 2026
 *
 * Centralized configuration for ALL E2E tests (Local + Cloud).
 * Set TEST_ENV=cloud to switch to Cloud Run URLs.
 * =============================================================================
 */

export const TEST_ENV = process.env.TEST_ENV || 'local';
export const IS_CLOUD = TEST_ENV === 'cloud';

export const URLS = {
  local: {
    patient: process.env.LOCAL_PATIENT_URL || 'http://localhost:3005',
    doctor: process.env.LOCAL_DOCTOR_URL || 'http://localhost:3010',
    meeting: process.env.LOCAL_MEETING_URL || 'http://localhost:3020',
  },
  cloud: {
    patient: process.env.CLOUD_PATIENT_URL || 'https://izara-patient-portal-hvht4obouq-as.a.run.app',
    doctor: process.env.CLOUD_DOCTOR_URL || 'https://izara-doctor-portal-hvht4obouq-as.a.run.app',
    meeting: process.env.CLOUD_MEETING_URL || 'https://izara-jitsi-meeting-portal-hvht4obouq-as.a.run.app',
  },
};

const env = URLS[TEST_ENV as keyof typeof URLS] || URLS.local;
export const PATIENT_URL = env.patient;
export const DOCTOR_URL = env.doctor;
export const MEETING_SERVER_URL = env.meeting;

// Legacy aliases
export const PATIENT_PORTAL_URL = PATIENT_URL;
export const DOCTOR_PORTAL_URL = DOCTOR_URL;
export const MEETING_URL = MEETING_SERVER_URL;

// =============================================================================
// CREDENTIALS
// =============================================================================

export const CREDENTIALS = {
  patient1: {
    email: process.env.TEST_PATIENT1_EMAIL || 'demo.test@gmail.com',
    password: process.env.TEST_PATIENT_PASSWORD || 'P@ssw0rd',
    id: 'PATIENT-DEMO',
    name: 'Demo Test Patient',
  },
  patient2: {
    email: process.env.TEST_PATIENT2_EMAIL || 'Somchai.Mankong@gmail.com',
    password: process.env.TEST_PATIENT_PASSWORD || 'P@ssw0rd',
    id: 'PATIENT-SOMCHAI',
    name: 'Somchai Mankong',
  },
  patient3: {
    email: process.env.TEST_PATIENT3_EMAIL || 'Anan.Khayanrian@gmail.com',
    password: process.env.TEST_PATIENT_PASSWORD || 'P@ssw0rd',
    id: 'PATIENT-ANAN',
    name: 'Anan Khayanrian',
  },
  doctor: {
    email: process.env.TEST_DOCTOR_EMAIL || 'doctor.test@izara.com',
    password: process.env.TEST_DOCTOR_PASSWORD || 'IzaraDoctor@2024',
    id: 'DOC-TEST-001',
    name: 'Dr. Test Good',
  },
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin.test@izara.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'IzaraAdmin@2024',
    id: 'ADMIN-TEST-001',
    name: 'Dr. Admin Kind',
  },
};

// =============================================================================
// REGISTRATION DATA
// =============================================================================
export const REGISTRATION_DATA = {
  newPatient: {
    name: 'ทดสอบ ผู้ป่วยใหม่',
    email: `test.patient.${Date.now()}@gmail.com`,
    password: 'Test@12345678',
    phone: '0891234567',
    dateOfBirth: '1990-05-15',
    gender: 'male',
  },
  newDoctor: {
    name: 'นพ. ทดสอบ แพทย์ใหม่',
    email: `test.doctor.${Date.now()}@izara.com`,
    password: 'Test@12345678',
    medicalLicenseNumber: `MD.TEST${Date.now()}`,
    specialty: 'General Practice',
    phone: '0812345678',
    dateOfBirth: '1985-03-20',
  },
};

// =============================================================================
// HELPERS
// =============================================================================

export async function getAuthToken(
  request: any,
  baseUrl: string,
  creds: { email: string; password: string },
): Promise<string> {
  const res = await request.post(`${baseUrl}/api/auth/login`, {
    data: creds,
    headers: { 'Content-Type': 'application/json' },
    timeout: IS_CLOUD ? 30000 : 15000,
  });
  if (res.status() === 200) {
    const d = await res.json();
    return d.token || d.accessToken || '';
  }
  return '';
}

export function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export function logTestSuccess(msg: string) { console.log(`✅ ${msg}`); }
export function logTestInfo(msg: string) { console.log(`ℹ️  ${msg}`); }
export function logTestWarning(msg: string) { console.log(`⚠️  ${msg}`); }

// =============================================================================
// TIMEOUTS
// =============================================================================

export const TIMEOUTS = {
  short: 5_000,
  medium: 15_000,
  long: 30_000,
  cloud: 60_000,
  navigation: IS_CLOUD ? 60_000 : 30_000,
  api: IS_CLOUD ? 30_000 : 15_000,
};

// =============================================================================
// ENDPOINTS
// =============================================================================

export const ENDPOINTS = {
  health: '/api/health',
  healthDb: '/api/health/db',
  login: '/api/auth/login',
  register: '/api/auth/register',
  appointments: '/api/appointments',
  phr: '/api/phr',
  doctors: '/api/doctors',
  consultants: '/api/consultants',
  notifications: '/api/notifications',
  medicalContent: '/api/medical-content',
  contentMedical: '/api/content/medical',
  contentClinical: '/api/content/clinical',
  clinicalResources: '/api/clinical-resources',
  timeline: '/api/timeline',
  treatmentResults: '/api/health-records/treatment-results',
  userProfile: '/api/users/profile',
  patients: '/api/patients',
  emr: '/api/emr',
  prescriptions: '/api/prescriptions',
  labOrders: '/api/lab-orders',
  queue: '/api/queue',
  appointmentPool: '/api/appointment-pool',
  livingWill: '/api/phr',  // /api/phr/:id/living-will
  videoMeeting: {
    health: '/api/video-meeting/health',
    config: '/api/video-meeting/config',
    create: '/api/video-meeting/create',
  },
  meetings: {
    create: '/api/meetings/create',
    health: '/api/health',
  },
  ai: {
    health: '/api/ai/health',
    chat: '/api/ai/chat',
    summarize: '/api/ai/summarize',
    preSummary: '/api/ai/pre-consultation-summary',
    patientSummary: '/api/ai/patient-summary',
    analyzeDocument: '/api/ai/analyze-document',
    emrSummary: '/api/ai/emr-summary',
    patientInstruction: '/api/ai/patient-instruction',
    meetingSummary: '/api/ai/meeting-summary',
    validate: '/api/ai/validate',
    knowledge: '/api/ai/knowledge',
    validations: '/api/ai/validations',
  },
  cds: {
    check: '/api/ai/cds-check',
    alerts: '/api/ai/cds-alerts',
    logs: '/api/ai/cds-logs',
  },
  admin: {
    doctors: '/api/admin/doctors',
    pendingDoctors: '/api/admin/pending-doctors',
    approveDoctor: '/api/admin/approve-doctor',
    rejectDoctor: '/api/admin/reject-doctor',
    stats: '/api/admin/stats',
  },
  metadata: {
    specialties: '/api/metadata/specialties',
    labTests: '/api/metadata/lab-tests',
    icd10: '/api/metadata/icd10-codes',
    medications: '/api/metadata/medications',
  },
  contentTags: {
    medical: '/api/content/tags/medical',
    clinical: '/api/content/tags/clinical',
  },
};

/** Helper: get doctor auth login endpoint (doctor portal uses /auth/login not /api/auth/login) */
export async function getDoctorAuthToken(
  request: any,
  baseUrl: string,
  creds: { email: string; password: string },
): Promise<string> {
  // Try /auth/login first (doctor portal auth server), then /api/auth/login
  for (const path of ['/auth/login', '/api/auth/login']) {
    try {
      const res = await request.post(`${baseUrl}${path}`, {
        data: creds,
        headers: { 'Content-Type': 'application/json' },
        timeout: IS_CLOUD ? 30000 : 15000,
      });
      if (res.status() === 200) {
        const d = await res.json();
        return d.token || d.accessToken || d.data?.token || '';
      }
    } catch { /* try next */ }
  }
  return '';
}
