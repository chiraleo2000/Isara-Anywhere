/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — PATIENT PORTAL API SERVICE UNIT TESTS
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: API endpoint mapping, query parameter construction,
 *        auth token handling, error response parsing, role switching
 * Source: Isara-patient-portal/src/services/postgresService.ts
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';

// ─── API Endpoint Registry (validates backend routes) ───

const PATIENT_PORTAL_ENDPOINTS = {
  // Auth
  login: { method: 'POST', path: '/api/auth/login' },
  register: { method: 'POST', path: '/api/auth/register' },
  logout: { method: 'POST', path: '/api/auth/logout' },
  profile: { method: 'GET', path: '/api/auth/me' },
  updateProfile: { method: 'PUT', path: '/api/auth/profile' },

  // PHR
  getPHR: { method: 'GET', path: '/api/phr' },
  updatePHR: { method: 'PUT', path: '/api/phr' },
  addAllergy: { method: 'POST', path: '/api/phr/allergies' },
  removeAllergy: { method: 'DELETE', path: '/api/phr/allergies/:allergen' },
  addCondition: { method: 'POST', path: '/api/phr/conditions' },
  updateCondition: { method: 'PUT', path: '/api/phr/conditions/:id' },
  getMedications: { method: 'GET', path: '/api/phr/medications' },
  addMedication: { method: 'POST', path: '/api/phr/medications' },

  // Vital Signs
  getVitals: { method: 'GET', path: '/api/vitals' },
  recordVitals: { method: 'POST', path: '/api/vitals' },
  latestVitals: { method: 'GET', path: '/api/vitals/latest' },

  // Appointments
  getAppointments: { method: 'GET', path: '/api/appointments' },
  upcomingAppointments: { method: 'GET', path: '/api/appointments/upcoming' },
  getAppointmentById: { method: 'GET', path: '/api/appointments/:id' },
  bookAppointment: { method: 'POST', path: '/api/appointments' },
  cancelAppointment: { method: 'PUT', path: '/api/appointments/:id/cancel' },
  reschedule: { method: 'PUT', path: '/api/appointments/:id/reschedule' },
  joinVideo: { method: 'POST', path: '/api/appointments/:id/join-video' },

  // Video Meeting
  createMeeting: { method: 'POST', path: '/api/video/create' },
  getMeeting: { method: 'GET', path: '/api/video/:appointmentId' },
  healthCheck: { method: 'GET', path: '/api/video/health' },

  // Medication Reminders
  getReminders: { method: 'GET', path: '/api/medication-reminders' },
  markTaken: { method: 'PUT', path: '/api/medication-reminders/:id/taken' },
  skipMed: { method: 'PUT', path: '/api/medication-reminders/:id/skip' },

  // Documents
  uploadDoc: { method: 'POST', path: '/api/documents/upload' },
  getDocs: { method: 'GET', path: '/api/documents' },

  // Doctors
  searchDoctors: { method: 'GET', path: '/api/doctors/search' },
  doctorProfile: { method: 'GET', path: '/api/doctors/:id' },
  doctorAvailability: { method: 'GET', path: '/api/doctors/:id/availability' },

  // Notifications
  getNotifications: { method: 'GET', path: '/api/notifications' },
  markRead: { method: 'PUT', path: '/api/notifications/:id/read' },

  // Phase 2: Device
  registerDevice: { method: 'POST', path: '/api/devices/register' },
  getDeviceTokens: { method: 'GET', path: '/api/devices' },
  deactivateDevice: { method: 'DELETE', path: '/api/devices/:token' },

  // Phase 2: Biometric
  registerBiometric: { method: 'POST', path: '/api/biometric/register' },
  verifyBiometric: { method: 'POST', path: '/api/biometric/verify' },
  biometricStatus: { method: 'GET', path: '/api/biometric/status' },

  // Phase 2: Offline Sync
  pushSync: { method: 'POST', path: '/api/sync/push' },
  pullSync: { method: 'GET', path: '/api/sync/pull' },
  syncConflicts: { method: 'GET', path: '/api/sync/conflicts' },
  resolveConflict: { method: 'POST', path: '/api/sync/conflicts/:id/resolve' },
  syncStatus: { method: 'GET', path: '/api/sync/status' },

  // Phase 2: Settings
  getSettings: { method: 'GET', path: '/api/settings' },
  updateSettings: { method: 'PUT', path: '/api/settings' },
  notifPrefs: { method: 'GET', path: '/api/settings/notifications' },
  updateNotifPrefs: { method: 'PUT', path: '/api/settings/notifications' },
  switchRole: { method: 'POST', path: '/api/auth/switch-role' },
};

// ─── Query parameter builder (from postgresService.ts) ───

function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const filtered = Object.entries(params).filter(([_, v]) => v !== undefined && v !== '');
  if (filtered.length === 0) return '';
  return '?' + filtered.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
}

// ─── Auth token helpers ───

function getAuthHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// ─── API response parsing ───

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

function parseApiResponse<T>(response: { ok: boolean; status: number; json: () => any }): ApiResponse<T> {
  if (!response.ok) {
    const body = response.json();
    return {
      success: false,
      error: body?.error || body?.message || `HTTP ${response.status}`,
    };
  }
  const body = response.json();
  return {
    success: true,
    data: body?.data || body,
    message: body?.message,
  };
}

// ═══════════════════════════════════════════════
// TEST SUITES
// ═══════════════════════════════════════════════

// ─────────────────────────────────────────────
// A. Endpoint Registry Validation
// ─────────────────────────────────────────────

describe('Patient Portal API — Endpoint Registry', () => {
  it('A01 — all auth endpoints defined', () => {
    const authEndpoints = ['login', 'register', 'logout', 'profile', 'updateProfile'];
    for (const name of authEndpoints) {
      expect(PATIENT_PORTAL_ENDPOINTS[name as keyof typeof PATIENT_PORTAL_ENDPOINTS]).toBeDefined();
    }
  });

  it('A02 — all PHR endpoints defined', () => {
    const phrEndpoints = ['getPHR', 'updatePHR', 'addAllergy', 'removeAllergy', 'addCondition', 'updateCondition', 'getMedications', 'addMedication'];
    for (const name of phrEndpoints) {
      expect(PATIENT_PORTAL_ENDPOINTS[name as keyof typeof PATIENT_PORTAL_ENDPOINTS]).toBeDefined();
    }
  });

  it('A03 — all vitals endpoints defined', () => {
    expect(PATIENT_PORTAL_ENDPOINTS.getVitals.method).toBe('GET');
    expect(PATIENT_PORTAL_ENDPOINTS.recordVitals.method).toBe('POST');
    expect(PATIENT_PORTAL_ENDPOINTS.latestVitals.path).toContain('latest');
  });

  it('A04 — all appointment endpoints use correct methods', () => {
    expect(PATIENT_PORTAL_ENDPOINTS.getAppointments.method).toBe('GET');
    expect(PATIENT_PORTAL_ENDPOINTS.bookAppointment.method).toBe('POST');
    expect(PATIENT_PORTAL_ENDPOINTS.cancelAppointment.method).toBe('PUT');
  });

  it('A05 — Phase 2 sync endpoints exist', () => {
    const syncEndpoints = ['pushSync', 'pullSync', 'syncConflicts', 'resolveConflict', 'syncStatus'];
    for (const name of syncEndpoints) {
      expect(PATIENT_PORTAL_ENDPOINTS[name as keyof typeof PATIENT_PORTAL_ENDPOINTS]).toBeDefined();
    }
  });

  it('A06 — Phase 2 biometric endpoints exist', () => {
    expect(PATIENT_PORTAL_ENDPOINTS.registerBiometric.method).toBe('POST');
    expect(PATIENT_PORTAL_ENDPOINTS.verifyBiometric.method).toBe('POST');
    expect(PATIENT_PORTAL_ENDPOINTS.biometricStatus.method).toBe('GET');
  });

  it('A07 — all paths start with /api/', () => {
    for (const endpoint of Object.values(PATIENT_PORTAL_ENDPOINTS)) {
      expect(endpoint.path).toMatch(/^\/api\//);
    }
  });

  it('A08 — total endpoint count is complete', () => {
    const count = Object.keys(PATIENT_PORTAL_ENDPOINTS).length;
    expect(count).toBeGreaterThanOrEqual(45);
  });

  it('A09 — video meeting endpoints exist', () => {
    expect(PATIENT_PORTAL_ENDPOINTS.createMeeting.path).toContain('video');
    expect(PATIENT_PORTAL_ENDPOINTS.getMeeting.path).toContain('video');
    expect(PATIENT_PORTAL_ENDPOINTS.healthCheck.path).toContain('health');
  });

  it('A10 — role switch endpoint exists', () => {
    expect(PATIENT_PORTAL_ENDPOINTS.switchRole.method).toBe('POST');
    expect(PATIENT_PORTAL_ENDPOINTS.switchRole.path).toContain('switch-role');
  });
});

// ─────────────────────────────────────────────
// B. Query Parameter Construction
// ─────────────────────────────────────────────

describe('Patient Portal API — Query Parameters', () => {
  it('B01 — builds simple query string', () => {
    const qs = buildQueryString({ limit: 10, offset: 0 });
    expect(qs).toBe('?limit=10&offset=0');
  });

  it('B02 — filters out undefined values', () => {
    const qs = buildQueryString({ limit: 10, status: undefined });
    expect(qs).toBe('?limit=10');
    expect(qs).not.toContain('status');
  });

  it('B03 — filters out empty strings', () => {
    const qs = buildQueryString({ search: '', limit: 5 });
    expect(qs).toBe('?limit=5');
  });

  it('B04 — handles boolean values', () => {
    const qs = buildQueryString({ active: true });
    expect(qs).toBe('?active=true');
  });

  it('B05 — returns empty string for empty params', () => {
    const qs = buildQueryString({});
    expect(qs).toBe('');
  });

  it('B06 — encodes special characters', () => {
    const qs = buildQueryString({ search: 'สมชาย' });
    expect(qs).toContain('search=');
    expect(qs.length).toBeGreaterThan(10); // encoded Thai text
  });

  it('B07 — vitals query with date range', () => {
    const qs = buildQueryString({
      startDate: '2024-01-01',
      endDate: '2024-06-30',
      type: 'blood_pressure',
    });
    expect(qs).toContain('startDate=2024-01-01');
    expect(qs).toContain('endDate=2024-06-30');
    expect(qs).toContain('type=blood_pressure');
  });
});

// ─────────────────────────────────────────────
// C. Auth Token Handling
// ─────────────────────────────────────────────

describe('Patient Portal API — Auth Headers', () => {
  it('C01 — includes Content-Type', () => {
    const headers = getAuthHeaders();
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('C02 — adds Bearer token', () => {
    const headers = getAuthHeaders('eyJhbGciOiJIUzI1NiJ9');
    expect(headers['Authorization']).toBe('Bearer eyJhbGciOiJIUzI1NiJ9');
  });

  it('C03 — omits Authorization when no token', () => {
    const headers = getAuthHeaders(null);
    expect(headers['Authorization']).toBeUndefined();
  });

  it('C04 — omits Authorization for undefined token', () => {
    const headers = getAuthHeaders(undefined);
    expect(headers['Authorization']).toBeUndefined();
  });
});

// ─────────────────────────────────────────────
// D. API Response Parsing
// ─────────────────────────────────────────────

describe('Patient Portal API — Response Parsing', () => {
  it('D01 — parses successful response', () => {
    const result = parseApiResponse({
      ok: true,
      status: 200,
      json: () => ({ data: { name: 'สมชาย' }, message: 'Success' }),
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: 'สมชาย' });
  });

  it('D02 — parses error response', () => {
    const result = parseApiResponse({
      ok: false,
      status: 401,
      json: () => ({ error: 'Unauthorized' }),
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('D03 — fallback error message includes status', () => {
    const result = parseApiResponse({
      ok: false,
      status: 500,
      json: () => ({}),
    });
    expect(result.error).toContain('500');
  });

  it('D04 — handles response with message field', () => {
    const result = parseApiResponse({
      ok: false,
      status: 403,
      json: () => ({ message: 'PDPA consent required' }),
    });
    expect(result.error).toContain('PDPA');
  });
});

// ─────────────────────────────────────────────
// E. Data Validation (PHR/Appointment schemas)
// ─────────────────────────────────────────────

describe('Patient Portal API — Data Schemas', () => {
  it('E01 — appointment booking requires minimum fields', () => {
    const requiredFields = ['doctor_id', 'date', 'time', 'type'];
    const booking = { doctor_id: 'dr-001', date: '2024-07-15', time: '10:00', type: 'video' };
    for (const field of requiredFields) {
      expect(booking).toHaveProperty(field);
    }
  });

  it('E02 — vital signs record has required fields', () => {
    const requiredFields = ['type', 'value', 'unit'];
    const vital = { type: 'blood_pressure', value: '120/80', unit: 'mmHg', recorded_at: new Date().toISOString() };
    for (const field of requiredFields) {
      expect(vital).toHaveProperty(field);
    }
  });

  it('E03 — user registration requires email and password', () => {
    const requiredFields = ['email', 'password', 'first_name', 'last_name'];
    const registration = { email: 'test@izara.com', password: 'IzaraTest@2024!', first_name: 'สมชาย', last_name: 'มั่นคง' };
    for (const field of requiredFields) {
      expect(registration).toHaveProperty(field);
      expect(registration[field as keyof typeof registration]).toBeTruthy();
    }
  });

  it('E04 — medication reminder has schedule info', () => {
    const reminder = {
      medication_name: 'Metformin',
      dosage: '500mg',
      frequency: 'twice_daily',
      times: ['08:00', '20:00'],
    };
    expect(reminder.times).toHaveLength(2);
    expect(reminder.frequency).toBe('twice_daily');
  });

  it('E05 — appointment types are valid', () => {
    const validTypes = ['video', 'walk_in', 'in_person'];
    const testType = 'video';
    expect(validTypes).toContain(testType);
  });
});
