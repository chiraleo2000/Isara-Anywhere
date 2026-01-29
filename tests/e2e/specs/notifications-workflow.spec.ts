/**
 * Notifications Workflow Test - API Based
 * Based on: Processes/Notification_Workflows.md
 * 
 * Tests:
 * - Notifications API endpoints
 * - System health checks
 */

import { test, expect, APIRequestContext } from '@playwright/test';

const DOCTOR_PORTAL_URL = process.env.DOCTOR_PORTAL_URL || 'http://localhost:3010';
const PATIENT_PORTAL_URL = process.env.PATIENT_PORTAL_URL || 'http://localhost:3005';

const TEST_USERS = {
  patient: { email: 'demo.test@gmail.com', password: 'P@ssw0rd' },
  patient2: { email: 'Somchai.Mankong@gmail.com', password: 'P@ssw0rd' },
  doctor: { email: 'doctor.test@izara.com', password: 'IzaraDoctor@2024' },
  admin: { email: 'admin.test@izara.com', password: 'IzaraAdmin@2024' }
};

let patientToken: string;
let doctorToken: string;
let adminToken: string;

async function getAuthToken(request: APIRequestContext, email: string, password: string, portal: 'patient' | 'doctor'): Promise<string> {
  const baseUrl = portal === 'patient' ? PATIENT_PORTAL_URL : DOCTOR_PORTAL_URL;
  const response = await request.post(`${baseUrl}/auth/login`, {
    data: { email, password }
  });
  const body = await response.json();
  return body.token;
}

test.describe('1. Authentication for Notifications', () => {
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

  test('1.3 Admin login - 200', async ({ request }) => {
    const response = await request.post(`${DOCTOR_PORTAL_URL}/auth/login`, {
      data: { email: TEST_USERS.admin.email, password: TEST_USERS.admin.password }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    adminToken = body.token;
    console.log('✅ Admin authenticated');
  });
});

test.describe('2. Patient Notifications API', () => {
  test.beforeAll(async ({ request }) => {
    if (!patientToken) {
      patientToken = await getAuthToken(request, TEST_USERS.patient.email, TEST_USERS.patient.password, 'patient');
    }
  });

  test('2.1 Patient can access notifications - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Patient notifications accessible');
  });

  test('2.2 Patient can access appointments - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/api/appointments`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Patient appointments accessible');
  });

  test('2.3 Patient can access PHR - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/api/phr`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Patient PHR accessible');
  });

  test('2.4 Patient can access consultants - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/api/consultants`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Patient consultants accessible');
  });
});

test.describe('3. Doctor Notifications API', () => {
  test.beforeAll(async ({ request }) => {
    if (!doctorToken) {
      doctorToken = await getAuthToken(request, TEST_USERS.doctor.email, TEST_USERS.doctor.password, 'doctor');
    }
  });

  test('3.1 Doctor can access notifications - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Doctor notifications accessible');
  });

  test('3.2 Doctor can access patients - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/api/patients`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Doctor patients accessible');
  });

  test('3.3 Doctor can access appointments - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/api/appointments`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Doctor appointments accessible');
  });
});

test.describe('4. Admin Notifications API', () => {
  test.beforeAll(async ({ request }) => {
    if (!adminToken) {
      adminToken = await getAuthToken(request, TEST_USERS.admin.email, TEST_USERS.admin.password, 'doctor');
    }
  });

  test('4.1 Admin can access notifications - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Admin notifications accessible');
  });

  test('4.2 Admin can access patients - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/api/patients`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Admin patients accessible');
  });
});

test.describe('5. System Health Checks', () => {
  test('5.1 Patient Portal health - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/health`);
    expect(response.status()).toBe(200);
    console.log('✅ Patient Portal healthy');
  });

  test('5.2 Doctor Portal health - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/health`);
    expect(response.status()).toBe(200);
    console.log('✅ Doctor Portal healthy');
  });

  test('5.3 Patient Portal DB health - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/health/db`);
    expect(response.status()).toBe(200);
    console.log('✅ Patient Portal DB healthy');
  });

  test('5.4 Doctor Portal DB health - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/health/db`);
    expect(response.status()).toBe(200);
    console.log('✅ Doctor Portal DB healthy');
  });
});
