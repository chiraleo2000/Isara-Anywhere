/**
 * Video Meeting Jitsi Workflow Test - API Based
 * Based on: Processes/VIDEO_MEETING_JITSI_GEMINI.md
 * 
 * Tests:
 * - Video meeting configuration API
 * - Video meeting health endpoints
 * - Meeting room management API
 * - Video meeting integration
 */

import { test, expect, APIRequestContext } from '@playwright/test';

const DOCTOR_PORTAL_URL = process.env.DOCTOR_PORTAL_URL || 'http://localhost:3010';
const PATIENT_PORTAL_URL = process.env.PATIENT_PORTAL_URL || 'http://localhost:3005';
const MEETING_SERVER_URL = process.env.MEETING_SERVER_URL || 'http://localhost:3020';

const TEST_USERS = {
  patient: { email: 'demo.test@gmail.com', password: 'P@ssw0rd' },
  doctor: { email: 'doctor.test@izara.com', password: 'IzaraDoctor@2024' }
};

let patientToken: string;
let doctorToken: string;

async function getAuthToken(request: APIRequestContext, email: string, password: string, portal: 'patient' | 'doctor'): Promise<string> {
  const baseUrl = portal === 'patient' ? PATIENT_PORTAL_URL : DOCTOR_PORTAL_URL;
  const response = await request.post(`${baseUrl}/auth/login`, {
    data: { email, password }
  });
  const body = await response.json();
  return body.token;
}

test.describe('1. Meeting Server Health', () => {
  test('1.1 Meeting server health endpoint - 200', async ({ request }) => {
    const response = await request.get(`${MEETING_SERVER_URL}/health`);
    expect(response.status()).toBe(200);
    console.log('✅ Meeting server health endpoint OK');
  });

  test('1.2 Patient Portal video meeting health - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/api/video-meeting/health`);
    expect(response.status()).toBe(200);
    console.log('✅ Patient Portal video meeting health OK');
  });

  test('1.3 Doctor Portal video meeting health - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/api/video-meeting/health`);
    expect(response.status()).toBe(200);
    console.log('✅ Doctor Portal video meeting health OK');
  });
});

test.describe('2. Patient Portal Video Meeting API', () => {
  test.beforeAll(async ({ request }) => {
    if (!patientToken) {
      patientToken = await getAuthToken(request, TEST_USERS.patient.email, TEST_USERS.patient.password, 'patient');
    }
  });

  test('2.1 Patient video meeting config - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/api/video-meeting/config`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    console.log('✅ Patient video meeting config accessible');
  });

  test('2.2 Patient video meeting health - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/api/video-meeting/health`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Patient video meeting health OK');
  });

  test('2.3 Patient can access appointments for meeting - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/api/appointments`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Patient appointments for meeting accessible');
  });
});

test.describe('3. Doctor Portal Video Meeting API', () => {
  test.beforeAll(async ({ request }) => {
    if (!doctorToken) {
      doctorToken = await getAuthToken(request, TEST_USERS.doctor.email, TEST_USERS.doctor.password, 'doctor');
    }
  });

  test('3.1 Doctor video meeting health - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/api/video-meeting/health`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Doctor video meeting health OK');
  });

  test('3.2 Doctor can access appointments for meeting - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/api/appointments`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Doctor appointments for meeting accessible');
  });

  test('3.3 Doctor can access patients for meeting - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/api/patients`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Doctor patients for meeting accessible');
  });
});

test.describe('4. Portal Integration Health', () => {
  test('4.1 Patient Portal health - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/health`);
    expect(response.status()).toBe(200);
    console.log('✅ Patient Portal healthy');
  });

  test('4.2 Doctor Portal health - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/health`);
    expect(response.status()).toBe(200);
    console.log('✅ Doctor Portal healthy');
  });

  test('4.3 Patient Portal DB connection - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/health/db`);
    expect(response.status()).toBe(200);
    console.log('✅ Patient Portal DB connected');
  });

  test('4.4 Doctor Portal DB connection - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/health/db`);
    expect(response.status()).toBe(200);
    console.log('✅ Doctor Portal DB connected');
  });
});

test.describe('5. Cross-Portal Authentication', () => {
  test('5.1 Patient login for video - 200', async ({ request }) => {
    const response = await request.post(`${PATIENT_PORTAL_URL}/auth/login`, {
      data: { email: TEST_USERS.patient.email, password: TEST_USERS.patient.password }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    console.log('✅ Patient authenticated for video meeting');
  });

  test('5.2 Doctor login for video - 200', async ({ request }) => {
    const response = await request.post(`${DOCTOR_PORTAL_URL}/auth/login`, {
      data: { email: TEST_USERS.doctor.email, password: TEST_USERS.doctor.password }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    console.log('✅ Doctor authenticated for video meeting');
  });
});
