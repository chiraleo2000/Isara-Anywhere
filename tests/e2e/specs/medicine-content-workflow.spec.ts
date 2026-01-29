/**
 * Medicine Content Workflow Test - API Based
 * Based on: Processes/Medicine_Content_Processes.md
 * 
 * Tests:
 * - Medical content API endpoints
 * - Clinical resources API endpoints
 * - System health checks
 */

import { test, expect, APIRequestContext } from '@playwright/test';

const DOCTOR_PORTAL_URL = process.env.DOCTOR_PORTAL_URL || 'http://localhost:3010';
const PATIENT_PORTAL_URL = process.env.PATIENT_PORTAL_URL || 'http://localhost:3005';

const TEST_USERS = {
  doctor: { email: 'doctor.test@izara.com', password: 'IzaraDoctor@2024' },
  admin: { email: 'admin.test@izara.com', password: 'IzaraAdmin@2024' },
  patient: { email: 'demo.test@gmail.com', password: 'P@ssw0rd' }
};

let doctorToken: string;
let adminToken: string;
let patientToken: string;

async function getAuthToken(request: APIRequestContext, email: string, password: string, portal: 'patient' | 'doctor'): Promise<string> {
  const baseUrl = portal === 'patient' ? PATIENT_PORTAL_URL : DOCTOR_PORTAL_URL;
  const response = await request.post(`${baseUrl}/auth/login`, {
    data: { email, password }
  });
  const body = await response.json();
  return body.token;
}

test.describe('1. Authentication for Medical Content', () => {
  test('1.1 Doctor login - 200', async ({ request }) => {
    const response = await request.post(`${DOCTOR_PORTAL_URL}/auth/login`, {
      data: { email: TEST_USERS.doctor.email, password: TEST_USERS.doctor.password }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    doctorToken = body.token;
    console.log('✅ Doctor authenticated');
  });

  test('1.2 Admin login - 200', async ({ request }) => {
    const response = await request.post(`${DOCTOR_PORTAL_URL}/auth/login`, {
      data: { email: TEST_USERS.admin.email, password: TEST_USERS.admin.password }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    adminToken = body.token;
    console.log('✅ Admin authenticated');
  });

  test('1.3 Patient login - 200', async ({ request }) => {
    const response = await request.post(`${PATIENT_PORTAL_URL}/auth/login`, {
      data: { email: TEST_USERS.patient.email, password: TEST_USERS.patient.password }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    patientToken = body.token;
    console.log('✅ Patient authenticated');
  });
});

test.describe('2. Medical Content API', () => {
  test.beforeAll(async ({ request }) => {
    if (!doctorToken) {
      doctorToken = await getAuthToken(request, TEST_USERS.doctor.email, TEST_USERS.doctor.password, 'doctor');
    }
  });

  test('2.1 Doctor can access medical content - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/api/medical-content`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    console.log(`✅ Medical content: ${body.articles?.length || body.length || 0} articles`);
  });

  test('2.2 Doctor can access clinical resources - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/api/clinical-resources`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Clinical resources accessible');
  });

  test('2.3 Doctor can access consultants - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/api/consultants`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Consultants accessible');
  });
});

test.describe('3. Admin Medical Content API', () => {
  test.beforeAll(async ({ request }) => {
    if (!adminToken) {
      adminToken = await getAuthToken(request, TEST_USERS.admin.email, TEST_USERS.admin.password, 'doctor');
    }
  });

  test('3.1 Admin can access medical content - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/api/medical-content`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Admin medical content accessible');
  });

  test('3.2 Admin can access clinical resources - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/api/clinical-resources`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Admin clinical resources accessible');
  });

  test('3.3 Admin can access notifications - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Admin notifications accessible');
  });
});

test.describe('4. Patient Health Library API', () => {
  test.beforeAll(async ({ request }) => {
    if (!patientToken) {
      patientToken = await getAuthToken(request, TEST_USERS.patient.email, TEST_USERS.patient.password, 'patient');
    }
  });

  test('4.1 Patient can view consultants - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/api/consultants`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Patient consultants accessible');
  });

  test('4.2 Patient can view doctors - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/api/doctors`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Patient doctors accessible');
  });

  test('4.3 Patient can view appointments - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/api/appointments`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Patient appointments accessible');
  });
});

test.describe('5. System Health Checks', () => {
  test('5.1 Doctor Portal health - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/health`);
    expect(response.status()).toBe(200);
    console.log('✅ Doctor Portal healthy');
  });

  test('5.2 Patient Portal health - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/health`);
    expect(response.status()).toBe(200);
    console.log('✅ Patient Portal healthy');
  });

  test('5.3 Doctor Portal DB health - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/health/db`);
    expect(response.status()).toBe(200);
    console.log('✅ Doctor Portal DB healthy');
  });

  test('5.4 Patient Portal DB health - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/health/db`);
    expect(response.status()).toBe(200);
    console.log('✅ Patient Portal DB healthy');
  });
});
