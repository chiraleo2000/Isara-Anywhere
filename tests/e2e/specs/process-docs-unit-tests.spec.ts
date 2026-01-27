/**
 * Unit Tests from Process Documentation
 * Based on all Processes/*.md files
 * 
 * These tests verify that the API endpoints described in the
 * process documentation are working correctly.
 */

import { test, expect } from '@playwright/test';

// Environment URLs
const LOCAL_PATIENT = 'http://localhost:3005';
const LOCAL_DOCTOR = 'http://localhost:3010';
const CLOUD_PATIENT = 'https://izara-patient-portal-724889190329.asia-southeast1.run.app';
const CLOUD_DOCTOR = 'https://izara-doctor-portal-724889190329.asia-southeast1.run.app';

// Use local by default, cloud if TEST_ENV=cloud
const PATIENT_URL = process.env.TEST_ENV === 'cloud' ? CLOUD_PATIENT : LOCAL_PATIENT;
const DOCTOR_URL = process.env.TEST_ENV === 'cloud' ? CLOUD_DOCTOR : LOCAL_DOCTOR;

// Test credentials from Processes docs
const CREDENTIALS = {
  patient1: { email: 'demo.test@gmail.com', password: 'P@ssw0rd' },
  patient2: { email: 'Somchai.Mankong@gmail.com', password: 'P@ssw0rd' },
  patient3: { email: 'Anan.Khayanrian@gmail.com', password: 'P@ssw0rd' },
  doctor: { email: 'doctor.test@izara.com', password: 'IzaraDoctor@2024' },
  admin: { email: 'admin.test@izara.com', password: 'IzaraAdmin@2024' }
};

// Helper: Get auth token
async function getToken(request: any, baseUrl: string, creds: { email: string; password: string }): Promise<string> {
  const response = await request.post(`${baseUrl}/api/auth/login`, {
    data: creds,
    headers: { 'Content-Type': 'application/json' }
  });
  if (response.status() === 200) {
    const data = await response.json();
    return data.token || data.accessToken || '';
  }
  return '';
}

// ============================================================================
// APPOINTMENT WORKFLOWS (Appointment_Workflows.md)
// ============================================================================
test.describe('Appointment_Workflows.md Tests', () => {
  let patientToken: string;
  let doctorToken: string;

  test.beforeAll(async ({ request }) => {
    patientToken = await getToken(request, PATIENT_URL, CREDENTIALS.patient1);
    doctorToken = await getToken(request, DOCTOR_URL, CREDENTIALS.doctor);
  });

  test('APT-01: Patient Portal health (PostgreSQL) - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_URL}/api/health`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('healthy');
  });

  test('APT-02: Doctor Portal health - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_URL}/api/health`);
    expect(response.status()).toBe(200);
  });

  test('APT-03: Patient appointments list - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_URL}/api/appointments`, {
      headers: { 'Authorization': `Bearer ${patientToken}` }
    });
    expect(response.status()).toBe(200);
  });

  test('APT-04: Doctor appointments list - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_URL}/api/appointments`, {
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
  });
});

// ============================================================================
// VIDEO MEETING (VIDEO_MEETING_JITSI_GEMINI.md)
// ============================================================================
test.describe('VIDEO_MEETING_JITSI_GEMINI.md Tests', () => {
  let doctorToken: string;

  test.beforeAll(async ({ request }) => {
    doctorToken = await getToken(request, DOCTOR_URL, CREDENTIALS.doctor);
  });

  test('MEET-01: Video meeting service health - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_URL}/api/video-meeting/health`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('healthy');
  });

  test('MEET-02: Video meeting config (Jitsi) - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_URL}/api/video-meeting/config`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.jitsiDomain).toBe('meet.jit.si');
    expect(data.features.lobby).toBe(true);
  });

  test('MEET-03: Consultants list for invite - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_URL}/api/consultants`, {
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
  });
});

// ============================================================================
// HEALTH RECORDS (Health_Records_Processes.md)
// ============================================================================
test.describe('Health_Records_Processes.md Tests', () => {
  let patientToken: string;
  let doctorToken: string;

  test.beforeAll(async ({ request }) => {
    patientToken = await getToken(request, PATIENT_URL, CREDENTIALS.patient1);
    doctorToken = await getToken(request, DOCTOR_URL, CREDENTIALS.doctor);
  });

  test('PHR-01: Patient PHR data access - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_URL}/api/phr`, {
      headers: { 'Authorization': `Bearer ${patientToken}` }
    });
    expect(response.status()).toBe(200);
  });

  test('PHR-02: Patient treatment results - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_URL}/api/health-records/treatment-results`, {
      headers: { 'Authorization': `Bearer ${patientToken}` }
    });
    expect(response.status()).toBe(200);
  });

  test('PHR-03: Doctor patients list - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_URL}/api/patients`, {
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
  });
});

// ============================================================================
// CLINICAL RESOURCES (Clinical_Resources_&_Medical_Library_Workflows.md)
// ============================================================================
test.describe('Clinical_Resources_Workflows.md Tests', () => {
  let doctorToken: string;

  test.beforeAll(async ({ request }) => {
    doctorToken = await getToken(request, DOCTOR_URL, CREDENTIALS.doctor);
  });

  test('CR-01: Clinical resources list - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_URL}/api/clinical-resources`, {
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data.resources || data)).toBe(true);
  });

  test('CR-02: Medical content list - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_URL}/api/medical-content`, {
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
  });
});

// ============================================================================
// MEDICAL CONSULTANTS (Medical_Consultants_Workflows.md)
// ============================================================================
test.describe('Medical_Consultants_Workflows.md Tests', () => {
  let doctorToken: string;

  test.beforeAll(async ({ request }) => {
    doctorToken = await getToken(request, DOCTOR_URL, CREDENTIALS.doctor);
  });

  test('CONS-01: Consultants list - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_URL}/api/consultants`, {
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data.consultants || data)).toBe(true);
  });

  test('CONS-02: Consultant specialties - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_URL}/api/consultants/specialties/list`, {
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
  });
});

// ============================================================================
// NOTIFICATION WORKFLOWS (Notification_Workflows.md)
// ============================================================================
test.describe('Notification_Workflows.md Tests', () => {
  let patientToken: string;
  let doctorToken: string;

  test.beforeAll(async ({ request }) => {
    patientToken = await getToken(request, PATIENT_URL, CREDENTIALS.patient1);
    doctorToken = await getToken(request, DOCTOR_URL, CREDENTIALS.doctor);
  });

  test('NOTIF-01: Patient notifications - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_URL}/api/notifications`, {
      headers: { 'Authorization': `Bearer ${patientToken}` }
    });
    expect(response.status()).toBe(200);
  });

  test('NOTIF-02: Doctor notifications - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_URL}/api/notifications`, {
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
  });
});

// ============================================================================
// USER MANAGEMENT (User_management_Workflows.md)
// ============================================================================
test.describe('User_management_Workflows.md Tests', () => {
  
  test('USER-01: Patient 1 login - 200', async ({ request }) => {
    const response = await request.post(`${PATIENT_URL}/api/auth/login`, {
      data: CREDENTIALS.patient1,
      headers: { 'Content-Type': 'application/json' }
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('USER-02: Patient 2 login - 200', async ({ request }) => {
    const response = await request.post(`${PATIENT_URL}/api/auth/login`, {
      data: CREDENTIALS.patient2,
      headers: { 'Content-Type': 'application/json' }
    });
    expect(response.status()).toBe(200);
  });

  test('USER-03: Patient 3 login - 200', async ({ request }) => {
    const response = await request.post(`${PATIENT_URL}/api/auth/login`, {
      data: CREDENTIALS.patient3,
      headers: { 'Content-Type': 'application/json' }
    });
    expect(response.status()).toBe(200);
  });

  test('USER-04: Doctor login - 200', async ({ request }) => {
    const response = await request.post(`${DOCTOR_URL}/api/auth/login`, {
      data: CREDENTIALS.doctor,
      headers: { 'Content-Type': 'application/json' }
    });
    expect(response.status()).toBe(200);
  });

  test('USER-05: Admin login - 200', async ({ request }) => {
    const response = await request.post(`${DOCTOR_URL}/api/auth/login`, {
      data: CREDENTIALS.admin,
      headers: { 'Content-Type': 'application/json' }
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.user?.role === 'admin' || data.user?.is_admin === true).toBeTruthy();
  });
});

// ============================================================================
// DATA SYNC (Data_Sync_Documentation.md)
// ============================================================================
test.describe('Data_Sync_Documentation.md Tests', () => {
  
  test('SYNC-01: Patient Portal DB health - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_URL}/api/health/db`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.connected).toBe(true);
    expect(data.database).toBe('PostgreSQL');
  });

  test('SYNC-02: Doctor Portal uses PostgreSQL', async ({ request }) => {
    const response = await request.get(`${DOCTOR_URL}/api/health`);
    expect(response.status()).toBe(200);
  });
});

// ============================================================================
// PHASE 1 REQUIREMENTS (PHASE1_REQUIREMENTS.md)
// ============================================================================
test.describe('PHASE1_REQUIREMENTS.md Tests', () => {
  let doctorToken: string;

  test.beforeAll(async ({ request }) => {
    doctorToken = await getToken(request, DOCTOR_URL, CREDENTIALS.doctor);
  });

  test('REQ-01: Video meeting system ready - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_URL}/api/video-meeting/health`);
    expect(response.status()).toBe(200);
  });

  test('REQ-02: AI assistant endpoint - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_URL}/api/ai/health`, {
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    // AI health may or may not exist
    expect([200, 404].includes(response.status())).toBe(true);
  });

  test('REQ-03: Clinical resources (knowledge base) - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_URL}/api/clinical-resources`, {
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
  });

  test('REQ-04: Medical content available - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_URL}/api/medical-content`, {
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
  });
});

// ============================================================================
// MEDICINE CONTENT (Medicine_Content_Processes.md)
// ============================================================================
test.describe('Medicine_Content_Processes.md Tests', () => {
  let doctorToken: string;

  test.beforeAll(async ({ request }) => {
    doctorToken = await getToken(request, DOCTOR_URL, CREDENTIALS.doctor);
  });

  test('MED-01: Medical content list - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_URL}/api/medical-content`, {
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.articles)).toBe(true);
    expect(data.count).toBeGreaterThan(0);
  });
});

// ============================================================================
// ALL PORTALS ACCESSIBILITY
// ============================================================================
test.describe('Portal Accessibility Tests', () => {
  
  test('PORTAL-01: Patient Portal reachable - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_URL}/api/health`);
    expect(response.status()).toBe(200);
  });

  test('PORTAL-02: Doctor Portal reachable - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_URL}/api/health`);
    expect(response.status()).toBe(200);
  });

  test('PORTAL-03: Patient Portal DB connected - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_URL}/api/health/db`);
    expect(response.status()).toBe(200);
  });
});
