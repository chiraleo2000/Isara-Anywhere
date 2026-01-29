/**
 * API Status Tests - Verify all endpoints return 200
 * Tests both local and cloud deployments
 * 
 * Updated to match actual API endpoints in the codebase
 */

import { test, expect } from '@playwright/test';
import {
  PATIENT_PORTAL_URL,
  DOCTOR_PORTAL_URL,
  CREDENTIALS,
  getAuthToken,
  ENDPOINTS
} from '../lib/test-config';

// Use local URLs from shared config
const LOCAL_PATIENT = PATIENT_PORTAL_URL;
const LOCAL_DOCTOR = DOCTOR_PORTAL_URL;

// Helper: Get auth token (using shared config)
async function getToken(request: any, base: string, creds: { email: string; password: string }) {
  return getAuthToken(request, base, creds);
}

test.describe('Patient Portal API Status Tests', () => {
  let patientToken: string;

  test.beforeAll(async ({ request }) => {
    patientToken = await getToken(request, LOCAL_PATIENT, CREDENTIALS.patient1);
  });

  test('API Health Check - 200', async ({ request }) => {
    const response = await request.get(`${LOCAL_PATIENT}${ENDPOINTS.health}`);
    expect(response.status()).toBe(200);
  });

  test('API Database Health - 200', async ({ request }) => {
    const response = await request.get(`${LOCAL_PATIENT}${ENDPOINTS.healthDb}`);
    expect(response.status()).toBe(200);
  });

  test('API Auth Login - 200', async ({ request }) => {
    const response = await request.post(`${LOCAL_PATIENT}${ENDPOINTS.login}`, {
      data: CREDENTIALS.patient1,
      headers: { 'Content-Type': 'application/json' }
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('API Appointments List - 200', async ({ request }) => {
    const response = await request.get(`${LOCAL_PATIENT}/api/appointments`, {
      headers: { 'Authorization': `Bearer ${patientToken}` }
    });
    expect(response.status()).toBe(200);
  });

  test('API PHR Data - 200', async ({ request }) => {
    const response = await request.get(`${LOCAL_PATIENT}/api/phr`, {
      headers: { 'Authorization': `Bearer ${patientToken}` }
    });
    expect(response.status()).toBe(200);
  });

  test('API Consultants List - 200', async ({ request }) => {
    const response = await request.get(`${LOCAL_PATIENT}/api/consultants`, {
      headers: { 'Authorization': `Bearer ${patientToken}` }
    });
    expect(response.status()).toBe(200);
  });

  test('API Doctors List - 200', async ({ request }) => {
    const response = await request.get(`${LOCAL_PATIENT}/api/doctors`, {
      headers: { 'Authorization': `Bearer ${patientToken}` }
    });
    expect(response.status()).toBe(200);
  });

  test('API Notifications - 200', async ({ request }) => {
    const response = await request.get(`${LOCAL_PATIENT}/api/notifications`, {
      headers: { 'Authorization': `Bearer ${patientToken}` }
    });
    expect(response.status()).toBe(200);
  });

  test('API Treatment Results - 200', async ({ request }) => {
    const response = await request.get(`${LOCAL_PATIENT}/api/health-records/treatment-results`, {
      headers: { 'Authorization': `Bearer ${patientToken}` }
    });
    expect(response.status()).toBe(200);
  });

  test('API Video Meeting Config - 200', async ({ request }) => {
    const response = await request.get(`${LOCAL_PATIENT}/api/video-meeting/config`);
    expect(response.status()).toBe(200);
  });

  test('API Video Meeting Health - 200', async ({ request }) => {
    const response = await request.get(`${LOCAL_PATIENT}/api/video-meeting/health`);
    expect(response.status()).toBe(200);
  });
});

test.describe('Doctor Portal API Status Tests', () => {
  let doctorToken: string;

  test.beforeAll(async ({ request }) => {
    doctorToken = await getToken(request, LOCAL_DOCTOR, CREDENTIALS.doctor);
  });

  test('API Health Check - 200', async ({ request }) => {
    const response = await request.get(`${LOCAL_DOCTOR}/api/health`);
    expect(response.status()).toBe(200);
  });

  test('API Auth Login - 200', async ({ request }) => {
    const response = await request.post(`${LOCAL_DOCTOR}/api/auth/login`, {
      data: CREDENTIALS.doctor,
      headers: { 'Content-Type': 'application/json' }
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('API Patients List - 200', async ({ request }) => {
    const response = await request.get(`${LOCAL_DOCTOR}/api/patients`, {
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
  });

  test('API Appointments List - 200', async ({ request }) => {
    const response = await request.get(`${LOCAL_DOCTOR}/api/appointments`, {
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
  });

  test('API Medical Content List - 200', async ({ request }) => {
    const response = await request.get(`${LOCAL_DOCTOR}/api/medical-content`, {
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
  });

  test('API Clinical Resources - 200', async ({ request }) => {
    const response = await request.get(`${LOCAL_DOCTOR}/api/clinical-resources`, {
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
  });

  test('API Notifications - 200', async ({ request }) => {
    const response = await request.get(`${LOCAL_DOCTOR}/api/notifications`, {
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    expect(response.status()).toBe(200);
  });

  test('API Video Meeting Health - 200', async ({ request }) => {
    const response = await request.get(`${LOCAL_DOCTOR}/api/video-meeting/health`);
    expect(response.status()).toBe(200);
  });
});
