/**
 * User Management Workflow Test - API Based
 * Based on: Processes/User_management_Workflows.md
 * 
 * Tests:
 * - Authentication API endpoints
 * - User data API endpoints
 * - System health checks
 */

import { test, expect, APIRequestContext } from '@playwright/test';

const DOCTOR_PORTAL_URL = process.env.DOCTOR_PORTAL_URL || 'http://localhost:3010';
const PATIENT_PORTAL_URL = process.env.PATIENT_PORTAL_URL || 'http://localhost:3005';

const TEST_USERS = {
  patient1: { email: 'demo.test@gmail.com', password: 'P@ssw0rd' },
  patient2: { email: 'Somchai.Mankong@gmail.com', password: 'P@ssw0rd' },
  patient3: { email: 'Anan.Khayanrian@gmail.com', password: 'P@ssw0rd' },
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

test.describe('1. All User Authentication', () => {
  test('1.1 Patient 1 login - 200', async ({ request }) => {
    const response = await request.post(`${PATIENT_PORTAL_URL}/auth/login`, {
      data: { email: TEST_USERS.patient1.email, password: TEST_USERS.patient1.password }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.user.role).toBe('patient');
    patientToken = body.token;
    console.log(`✅ Patient 1 authenticated: ${body.user.name}`);
  });

  test('1.2 Patient 2 login - 200', async ({ request }) => {
    const response = await request.post(`${PATIENT_PORTAL_URL}/auth/login`, {
      data: { email: TEST_USERS.patient2.email, password: TEST_USERS.patient2.password }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    console.log(`✅ Patient 2 authenticated: ${body.user.name}`);
  });

  test('1.3 Patient 3 login - 200', async ({ request }) => {
    const response = await request.post(`${PATIENT_PORTAL_URL}/auth/login`, {
      data: { email: TEST_USERS.patient3.email, password: TEST_USERS.patient3.password }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    console.log(`✅ Patient 3 authenticated: ${body.user.name}`);
  });

  test('1.4 Doctor login - 200', async ({ request }) => {
    const response = await request.post(`${DOCTOR_PORTAL_URL}/auth/login`, {
      data: { email: TEST_USERS.doctor.email, password: TEST_USERS.doctor.password }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.user.role).toBe('doctor');
    doctorToken = body.token;
    console.log(`✅ Doctor authenticated: ${body.user.name}`);
  });

  test('1.5 Admin login - 200', async ({ request }) => {
    const response = await request.post(`${DOCTOR_PORTAL_URL}/auth/login`, {
      data: { email: TEST_USERS.admin.email, password: TEST_USERS.admin.password }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.user.role).toBe('admin');
    adminToken = body.token;
    console.log(`✅ Admin authenticated: ${body.user.name}`);
  });
});

test.describe('2. Patient User Data API', () => {
  test.beforeAll(async ({ request }) => {
    if (!patientToken) {
      patientToken = await getAuthToken(request, TEST_USERS.patient1.email, TEST_USERS.patient1.password, 'patient');
    }
  });

  test('2.1 Patient can access PHR data - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/api/phr`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Patient PHR data accessible');
  });

  test('2.2 Patient can access appointments - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/api/appointments`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Patient appointments accessible');
  });

  test('2.3 Patient can access notifications - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Patient notifications accessible');
  });

  test('2.4 Patient can access doctors list - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/api/doctors`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Patient doctors list accessible');
  });
});

test.describe('3. Doctor User Data API', () => {
  test.beforeAll(async ({ request }) => {
    if (!doctorToken) {
      doctorToken = await getAuthToken(request, TEST_USERS.doctor.email, TEST_USERS.doctor.password, 'doctor');
    }
  });

  test('3.1 Doctor can access patients list - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/api/patients`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Doctor patients list accessible');
  });

  test('3.2 Doctor can access appointments - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/api/appointments`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Doctor appointments accessible');
  });

  test('3.3 Doctor can access notifications - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Doctor notifications accessible');
  });
});

test.describe('4. Admin User Data API', () => {
  test.beforeAll(async ({ request }) => {
    if (!adminToken) {
      adminToken = await getAuthToken(request, TEST_USERS.admin.email, TEST_USERS.admin.password, 'doctor');
    }
  });

  test('4.1 Admin can access patients list - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/api/patients`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Admin patients list accessible');
  });

  test('4.2 Admin can access appointments - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/api/appointments`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Admin appointments accessible');
  });

  test('4.3 Admin can access medical content - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/api/medical-content`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Admin medical content accessible');
  });

  test('4.4 Admin can access clinical resources - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/api/clinical-resources`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Admin clinical resources accessible');
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
