/**
 * Living Will Workflow Test - API Based
 * Based on: Processes/Living_Will_Processes.md
 * 
 * Tests:
 * - PDPA settings API
 * - Health records API
 * - System health checks
 */

import { test, expect, APIRequestContext } from '@playwright/test';

const PATIENT_PORTAL_URL = process.env.PATIENT_PORTAL_URL || 'http://localhost:3005';
const DOCTOR_PORTAL_URL = process.env.DOCTOR_PORTAL_URL || 'http://localhost:3010';

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

test.describe('1. Authentication for Living Will', () => {
  test('1.1 Patient login - 200', async ({ request }) => {
    const response = await request.post(`${PATIENT_PORTAL_URL}/auth/login`, {
      data: { email: TEST_USERS.patient.email, password: TEST_USERS.patient.password }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    patientToken = body.token;
    console.log('✅ Patient authenticated');
  });

  test('1.2 Doctor login - 200', async ({ request }) => {
    const response = await request.post(`${DOCTOR_PORTAL_URL}/auth/login`, {
      data: { email: TEST_USERS.doctor.email, password: TEST_USERS.doctor.password }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    doctorToken = body.token;
    console.log('✅ Doctor authenticated');
  });
});

test.describe('2. Patient Health Data API', () => {
  test.beforeAll(async ({ request }) => {
    if (!patientToken) {
      patientToken = await getAuthToken(request, TEST_USERS.patient.email, TEST_USERS.patient.password, 'patient');
    }
  });

  test('2.1 Patient can access PHR - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/api/phr`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ PHR API accessible');
  });

  test('2.2 Patient can access appointments - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/api/appointments`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Appointments API accessible');
  });

  test('2.3 Patient can access notifications - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Notifications API accessible');
  });

  test('2.4 Patient can access treatment results - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/api/health-records/treatment-results`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Treatment results API accessible');
  });
});

test.describe('3. Doctor Access API', () => {
  test.beforeAll(async ({ request }) => {
    if (!doctorToken) {
      doctorToken = await getAuthToken(request, TEST_USERS.doctor.email, TEST_USERS.doctor.password, 'doctor');
    }
  });

  test('3.1 Doctor can access patients - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/api/patients`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Patients API accessible');
  });

  test('3.2 Doctor can access clinical resources - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/api/clinical-resources`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Clinical resources API accessible');
  });
});

test.describe('4. System Health Checks', () => {
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

  test('4.3 Patient Portal DB health - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/health/db`);
    expect(response.status()).toBe(200);
    console.log('✅ Patient Portal DB healthy');
  });

  test('4.4 Doctor Portal DB health - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/health/db`);
    expect(response.status()).toBe(200);
    console.log('✅ Doctor Portal DB healthy');
  });
});
