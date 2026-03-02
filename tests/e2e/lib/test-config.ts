/**
 * =============================================================================
 * IZARA TELEMEDICINE - SHARED TEST CONFIGURATION v1.5.1
 * =============================================================================
 * Version: 1.5.1 | Updated: February 22, 2026
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
    patient: process.env.CLOUD_PATIENT_URL || 'https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app',
    doctor: process.env.CLOUD_DOCTOR_URL || 'https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app',
    meeting: process.env.CLOUD_MEETING_URL || 'https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app',
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
  const maxRetries = IS_CLOUD ? 3 : 1;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await request.post(`${baseUrl}/api/auth/login`, {
        data: creds,
        headers: { 'Content-Type': 'application/json' },
        timeout: IS_CLOUD ? 30000 : 15000,
      });
      if (res.status() === 200) {
        const d = await res.json();
        return d.token || d.accessToken || '';
      }
    } catch (err: any) {
      const msg = err?.message || '';
      const isTransient = msg.includes('ENOTFOUND') || msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT');
      if (attempt < maxRetries && isTransient) {
        await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
        continue;
      }
    }
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
  navigation: 60_000,
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
  notifications: {
    list: '/api/notifications',
    markAllRead: '/api/notifications/mark-all-read',
  },
  medicalContent: '/api/medical-content',
  contentMedical: '/api/content/medical',
  contentClinical: '/api/content/clinical',
  clinicalResources: '/api/content/clinical-resources',
  timeline: '/api/timeline',
  treatmentResults: '/api/health-records/treatment-results',
  userProfile: '/api/users/profile',
  profile: '/api/users/profile',
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
    list: '/api/meetings',
    config: '/api/meetings/config',
    invite: '/api/meetings/invite',
    transcription: '/api/meetings/transcription',
    sttConfig: '/api/meetings/stt/config',
  },
  ai: {
    health: '/api/health',   // AI services use meeting server /api/health
    chat: '/api/ai/chat',
    summarize: '/api/ai/summarize',
    preSummary: '/api/ai/pre-consultation-summary',
    preConsultation: '/api/ai/pre-consultation-summary',
    patientSummary: '/api/ai/patient-summary',
    analyzeDocument: '/api/ai/analyze-document',
    analyze: '/api/ai/analyze-document',
    emrSummary: '/api/ai/emr-summary',
    patientInstruction: '/api/ai/patient-instruction',
    meetingSummary: '/api/ai/meeting-summary',
    validate: '/api/ai/validate',
    knowledge: '/api/ai/knowledge',
    knowledgeBase: '/api/ai/knowledge',
    validations: '/api/ai/validations',
    cdsCheck: '/api/ai/cds-check',
    cdsAlerts: '/api/ai/cds-alerts',
    cdsLogs: '/api/ai/cds-logs',
  },
  cds: {
    check: '/api/ai/cds-check',
    alerts: '/api/ai/cds-alerts',
    logs: '/api/ai/cds-logs',
  },
  admin: {
    doctors: '/admin/pending-doctors',
    pendingDoctors: '/admin/pending-doctors',
    approveDoctor: '/auth/admin/approve-doctor',
    rejectDoctor: '/auth/admin/reject-doctor',
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
  // Phase 2 endpoints
  deviceTokens: '/api/device-tokens',
  biometric: {
    register: '/api/biometric/register',
    verify: '/api/biometric/verify',
    status: '/api/biometric/status',
  },
  sync: {
    push: '/api/sync/push',
    pull: '/api/sync/pull',
    conflicts: '/api/sync/conflicts',
    status: '/api/sync/status',
  },
  connections: '/api/connections',
  settings: {
    base: '/api/settings',
    general: '/api/settings',
    get: '/api/settings',
    update: '/api/settings',
    notifications: '/api/settings/notifications',
    role: '/api/settings/role',
    onboarding: '/api/settings/onboarding',
  },
  // Health Records (grouped)
  healthRecords: {
    phr: '/api/phr',
    emr: '/api/emr',
    vitals: '/api/phr/vitals',
    prescriptions: '/api/prescriptions',
    labOrders: '/api/lab-orders',
    imagingOrders: '/api/imaging-orders',
    patientLabOrders: '/api/phr/lab-orders',
    patientImagingOrders: '/api/phr/imaging-orders',
    livingWill: '/api/phr/living-will',
    timeline: '/api/timeline',
    treatmentResults: '/api/health-records/treatment-results',
  },
  // Phase 2 feature-specific endpoints
  phase2: {
    ctmAssessment: '/api/phase2/ctm-assessment',
    geriatricScreening: '/api/phase2/geriatric-screening',
    sosAlert: '/api/phase2/sos-alert',
    followUp: '/api/phase2/follow-up',
    nursingDashboard: '/api/phase2/nursing-dashboard',
    predictiveAnalytics: '/api/phase2/predictive-analytics',
    hisPatientLookup: '/api/phase2/his-patient-lookup',
    hisLabResults: '/api/phase2/his-lab-results',
    smartScheduling: '/api/phase2/smart-scheduling',
    nursingWorkflow: '/api/phase2/nursing-workflow',
    deviceTokens: '/api/device-tokens',
    biometric: {
      register: '/api/biometric/register',
      verify: '/api/biometric/verify',
      status: '/api/biometric/status',
    },
    sync: {
      push: '/api/sync/push',
      pull: '/api/sync/pull',
      conflicts: '/api/sync/conflicts',
      status: '/api/sync/status',
    },
  },
};

/** Attempt a single login request with retries for transient errors */
async function tryLoginPath(
  request: any,
  url: string,
  creds: { email: string; password: string },
  maxRetries: number,
): Promise<string | null> {
  const timeout = IS_CLOUD ? 30000 : 15000;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await request.post(url, {
        data: creds,
        headers: { 'Content-Type': 'application/json' },
        timeout,
      });
      if (res.status() === 200) {
        const d = await res.json();
        return d.token || d.accessToken || d.data?.token || '';
      }
      return null; // Non-transient HTTP error
    } catch (err: any) {
      const msg = err?.message || '';
      const isTransient = msg.includes('ENOTFOUND') || msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT');
      if (attempt < maxRetries && isTransient) {
        await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
        continue;
      }
      return null; // Non-transient or exhausted retries
    }
  }
  return null;
}

/** Helper: get doctor auth login endpoint (doctor portal uses /auth/login not /api/auth/login) */
export async function getDoctorAuthToken(
  request: any,
  baseUrl: string,
  creds: { email: string; password: string },
): Promise<string> {
  const maxRetries = IS_CLOUD ? 3 : 1;
  for (const path of ['/auth/login', '/api/auth/login']) {
    const token = await tryLoginPath(request, `${baseUrl}${path}`, creds, maxRetries);
    if (token !== null) return token;
  }
  return '';
}
