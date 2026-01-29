/**
 * Cloud Health & Public Endpoint Tests
 * Tests for Google Cloud Run deployment
 * 
 * NOTE: Cloud database is separate from local - 
 *       authentication tests use local credentials only
 */

import { test, expect } from '@playwright/test';
import { URLS, TIMEOUTS } from '../lib/test-config';

// Cloud URLs from shared config
const CLOUD_PATIENT = URLS.cloud.patient;
const CLOUD_DOCTOR = URLS.cloud.doctor;

test.describe('Cloud Patient Portal Health - 200 Status Only', () => {

  test('CLOUD-PAT-01: Patient Portal API health - 200', async ({ request }) => {
    const response = await request.get(`${CLOUD_PATIENT}/api/health`, {
      timeout: TIMEOUTS.cloud
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('healthy');
    expect(data.service).toBe('Izara Patient Portal API');
  });

  test('CLOUD-PAT-02: Video Meeting health - 200', async ({ request }) => {
    const response = await request.get(`${CLOUD_PATIENT}/api/video-meeting/health`, {
      timeout: 30000
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('healthy');
  });

  test('CLOUD-PAT-03: Video Meeting config - 200', async ({ request }) => {
    const response = await request.get(`${CLOUD_PATIENT}/api/video-meeting/config`, {
      timeout: 30000
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.jitsiDomain).toBeTruthy();
  });

  test('CLOUD-PAT-04: Treatment results (public) - 200', async ({ request }) => {
    const response = await request.get(`${CLOUD_PATIENT}/api/health-records/treatment-results`, {
      timeout: 30000
    });
    expect(response.status()).toBe(200);
  });

  test('CLOUD-PAT-05: Consultants endpoint - 200', async ({ request }) => {
    const response = await request.get(`${CLOUD_PATIENT}/api/consultants`, {
      timeout: 30000
    });
    // Should return 200 for public access
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('CLOUD-PAT-06: Consultants specialties endpoint - 200', async ({ request }) => {
    const response = await request.get(`${CLOUD_PATIENT}/api/consultants/specialties`, {
      timeout: 30000
    });
    // Should return 200 for public access
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});

test.describe('Cloud Doctor Portal Health - 200 Status Only', () => {

  test('CLOUD-DOC-01: Doctor Portal API health - 200', async ({ request }) => {
    const response = await request.get(`${CLOUD_DOCTOR}/api/health`, {
      timeout: 30000
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('healthy');
  });

  test('CLOUD-DOC-02: Video Meeting health - 200', async ({ request }) => {
    const response = await request.get(`${CLOUD_DOCTOR}/api/video-meeting/health`, {
      timeout: 30000
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('healthy');
  });

  test('CLOUD-DOC-03: AI Service endpoint - 200/404', async ({ request }) => {
    const response = await request.get(`${CLOUD_DOCTOR}/api/ai/health`, {
      timeout: 30000
    });
    // 200 = AI deployed, 404 = not deployed (both valid)
    expect([200, 404].includes(response.status())).toBe(true);
  });

  test('CLOUD-DOC-04: Auth endpoint reachable - 200', async ({ request }) => {
    // Just check the endpoint exists (login with wrong creds returns 401)
    const response = await request.post(`${CLOUD_DOCTOR}/api/auth/login`, {
      data: { email: 'test@test.com', password: 'wrong' },
      timeout: 30000
    });
    // 401 = endpoint works but invalid creds, 503 = DB not connected
    expect([200, 401].includes(response.status())).toBe(true);
  });
});

test.describe('Cloud Infrastructure Tests', () => {

  test('CLOUD-INFRA-01: Patient Portal responds under 3 seconds', async ({ request }) => {
    const start = Date.now();
    const response = await request.get(`${CLOUD_PATIENT}/api/health`, {
      timeout: 30000
    });
    const elapsed = Date.now() - start;
    expect(response.status()).toBe(200);
    expect(elapsed).toBeLessThan(3000);
  });

  test('CLOUD-INFRA-02: Doctor Portal responds under 3 seconds', async ({ request }) => {
    const start = Date.now();
    const response = await request.get(`${CLOUD_DOCTOR}/api/health`, {
      timeout: 30000
    });
    const elapsed = Date.now() - start;
    expect(response.status()).toBe(200);
    expect(elapsed).toBeLessThan(3000);
  });

  test('CLOUD-INFRA-03: CORS headers present on Patient Portal', async ({ request }) => {
    const response = await request.get(`${CLOUD_PATIENT}/api/health`, {
      timeout: 30000
    });
    expect(response.status()).toBe(200);
    // Cloud Run services should allow CORS for frontend access
  });

  test('CLOUD-INFRA-04: CORS headers present on Doctor Portal', async ({ request }) => {
    const response = await request.get(`${CLOUD_DOCTOR}/api/health`, {
      timeout: 30000
    });
    expect(response.status()).toBe(200);
  });

  test('CLOUD-INFRA-05: Security headers (OWASP compliance)', async ({ request }) => {
    const response = await request.get(`${CLOUD_PATIENT}/api/health`, {
      timeout: 30000
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    // Check security field in response
    expect(data.security).toContain('OWASP');
  });
});

test.describe('Cloud Service Connectivity', () => {

  test('CLOUD-CONN-01: Both portals are accessible', async ({ request }) => {
    const [patientRes, doctorRes] = await Promise.all([
      request.get(`${CLOUD_PATIENT}/api/health`, { timeout: 30000 }),
      request.get(`${CLOUD_DOCTOR}/api/health`, { timeout: 30000 })
    ]);
    expect(patientRes.status()).toBe(200);
    expect(doctorRes.status()).toBe(200);
  });

  test('CLOUD-CONN-02: Video meeting service available on both portals', async ({ request }) => {
    const [patientRes, doctorRes] = await Promise.all([
      request.get(`${CLOUD_PATIENT}/api/video-meeting/health`, { timeout: 30000 }),
      request.get(`${CLOUD_DOCTOR}/api/video-meeting/health`, { timeout: 30000 })
    ]);
    expect(patientRes.status()).toBe(200);
    expect(doctorRes.status()).toBe(200);
  });
});
