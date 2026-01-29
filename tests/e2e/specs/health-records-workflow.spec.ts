/**
 * Health Records (PHR/EMR) Workflow Test - API Based
 * Based on: Processes/Health_Records_Processes.md
 * 
 * Tests:
 * - PHR API endpoints
 * - EMR/Clinical data API endpoints
 * - Treatment results API
 * - Health timeline API
 * - System health checks
 */

import { test, expect, APIRequestContext } from '@playwright/test';

const PATIENT_PORTAL_URL = process.env.PATIENT_PORTAL_URL || 'http://localhost:3005';
const DOCTOR_PORTAL_URL = process.env.DOCTOR_PORTAL_URL || 'http://localhost:3010';
const MEETING_SERVER_URL = process.env.MEETING_SERVER_URL || 'http://localhost:3020';

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

test.describe('1. Authentication for Health Records', () => {
  test('1.1 Patient login - 200', async ({ request }) => {
    const response = await request.post(`${PATIENT_PORTAL_URL}/auth/login`, {
      data: { email: TEST_USERS.patient1.email, password: TEST_USERS.patient1.password }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    patientToken = body.token;
    console.log('✅ Patient authenticated for health records');
  });

  test('1.2 Doctor login - 200', async ({ request }) => {
    const response = await request.post(`${DOCTOR_PORTAL_URL}/auth/login`, {
      data: { email: TEST_USERS.doctor.email, password: TEST_USERS.doctor.password }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    doctorToken = body.token;
    console.log('✅ Doctor authenticated for health records');
  });

  test('1.3 Admin login - 200', async ({ request }) => {
    const response = await request.post(`${DOCTOR_PORTAL_URL}/auth/login`, {
      data: { email: TEST_USERS.admin.email, password: TEST_USERS.admin.password }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    adminToken = body.token;
    console.log('✅ Admin authenticated for health records');
  });
});

test.describe('2. Patient Health Records API', () => {
  test.beforeAll(async ({ request }) => {
    if (!patientToken) {
      patientToken = await getAuthToken(request, TEST_USERS.patient1.email, TEST_USERS.patient1.password, 'patient');
    }
  });

  test('2.1 Patient can view appointments - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/api/appointments`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Appointments API accessible');
  });

  test('2.2 Patient can view treatment results - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/api/health-records/treatment-results`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Treatment results API accessible');
  });

  test('2.3 Patient can view available doctors - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/api/doctors`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Doctors API accessible');
  });

  test('2.4 Patient can view notifications - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Notifications API accessible');
  });
});

test.describe('3. Doctor Clinical Access API', () => {
  test.beforeAll(async ({ request }) => {
    if (!doctorToken) {
      doctorToken = await getAuthToken(request, TEST_USERS.doctor.email, TEST_USERS.doctor.password, 'doctor');
    }
  });

  test('3.1 Doctor can access clinical resources - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/api/clinical-resources`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Clinical resources API accessible');
  });

  test('3.2 Doctor can access medical content - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/api/medical-content`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Medical content API accessible');
  });

  test('3.3 Doctor can access consultants - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/api/consultants`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Consultants API accessible');
  });

  test('3.4 Doctor can access patients list - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/api/patients`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Patients list API accessible');
  });

  test('3.5 Doctor can access appointments - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/api/appointments`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Appointments API accessible');
  });

  test('3.6 Doctor can access notifications - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Notifications API accessible');
  });
});

test.describe('4. Medical Content & Resources API', () => {
  test.beforeAll(async ({ request }) => {
    if (!patientToken) {
      patientToken = await getAuthToken(request, TEST_USERS.patient1.email, TEST_USERS.patient1.password, 'patient');
    }
  });

  test('4.1 Medical content accessible - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/api/medical-content`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    console.log(`✅ Medical content: ${body.articles?.length || body.length || 0} items`);
  });

  test('4.2 Consultants list accessible - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/api/consultants`);
    expect(response.status()).toBe(200);
    console.log('✅ Consultants list accessible');
  });

  test('4.3 Patient PHR data accessible - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/api/phr`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ PHR data accessible');
  });

  test('4.4 Patient consultants accessible - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/api/consultants`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    expect(response.status()).toBe(200);
    console.log('✅ Patient consultants accessible');
  });
});

test.describe('5. Video Meeting API', () => {
  test('5.1 Meeting server health - 200', async ({ request }) => {
    const response = await request.get(`${MEETING_SERVER_URL}/health`);
    expect(response.status()).toBe(200);
    console.log('✅ Meeting server healthy');
  });

  test('5.2 Doctor Portal video meeting health - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/api/video-meeting/health`);
    expect(response.status()).toBe(200);
    console.log('✅ Doctor Portal video meeting healthy');
  });

  test('5.3 Patient Portal video meeting config - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/api/video-meeting/config`);
    expect(response.status()).toBe(200);
    console.log('✅ Patient Portal video meeting config accessible');
  });
});

test.describe('6. Patient Portal Video Meeting API', () => {
  test('6.1 Patient video meeting health - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/api/video-meeting/health`);
    expect(response.status()).toBe(200);
    console.log('✅ Patient video meeting healthy');
  });

  test('6.2 Patient video meeting config - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/api/video-meeting/config`);
    expect(response.status()).toBe(200);
    console.log('✅ Patient video meeting config accessible');
  });
});

test.describe('7. System Health Checks', () => {
  test('7.1 Patient Portal health - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/health`);
    expect(response.status()).toBe(200);
    console.log('✅ Patient Portal healthy');
  });

  test('7.2 Doctor Portal health - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/health`);
    expect(response.status()).toBe(200);
    console.log('✅ Doctor Portal healthy');
  });

  test('7.3 Patient Portal DB health - 200', async ({ request }) => {
    const response = await request.get(`${PATIENT_PORTAL_URL}/health/db`);
    expect(response.status()).toBe(200);
    console.log('✅ Patient Portal DB healthy');
  });

  test('7.4 Doctor Portal DB health - 200', async ({ request }) => {
    const response = await request.get(`${DOCTOR_PORTAL_URL}/health/db`);
    expect(response.status()).toBe(200);
    console.log('✅ Doctor Portal DB healthy');
  });

  test('7.5 Meeting server health - 200', async ({ request }) => {
    const response = await request.get(`${MEETING_SERVER_URL}/health`);
    expect(response.status()).toBe(200);
    console.log('✅ Meeting server healthy');
  });
});
