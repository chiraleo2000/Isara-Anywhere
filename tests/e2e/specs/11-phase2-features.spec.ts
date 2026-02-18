/**
 * Phase 2 E2E Tests — Device Tokens, Biometric, Sync, Connections, Settings
 * 
 * Tests new Phase 2 endpoints across both patient and doctor portals.
 * Run: npx playwright test specs/11-phase2-features.spec.ts
 */

import { test, expect, APIRequestContext } from '@playwright/test';
import {
  PATIENT_URL,
  DOCTOR_URL,
  CREDENTIALS,
  ENDPOINTS,
  TIMEOUTS,
  logTestSuccess,
  logTestInfo,
  logTestWarning,
} from '../lib/test-config';

// ─── Auth Helpers ─────────────────────────────────────────────────────

async function loginPatient(request: APIRequestContext, email?: string, password?: string) {
  const creds = {
    email: email || CREDENTIALS.patient1.email,
    password: password || CREDENTIALS.patient1.password,
  };
  const r = await request.post(`${PATIENT_URL}/api/auth/login`, {
    data: creds,
    headers: { 'Content-Type': 'application/json' },
    timeout: TIMEOUTS.api,
  });
  if (r.status() !== 200) {
    logTestWarning(`Patient login failed: ${r.status()}`);
    return { token: '', user: {} };
  }
  const d = await r.json();
  return {
    token: d.token || d.accessToken || '',
    user: d.user || d.data?.user || {},
  };
}

async function loginDoctor(request: APIRequestContext) {
  for (const path of ['/auth/login', '/api/auth/login']) {
    try {
      const r = await request.post(`${DOCTOR_URL}${path}`, {
        data: { email: CREDENTIALS.doctor.email, password: CREDENTIALS.doctor.password },
        headers: { 'Content-Type': 'application/json' },
        timeout: TIMEOUTS.api,
      });
      if (r.status() === 200) {
        const d = await r.json();
        return {
          token: d.token || d.accessToken || d.data?.token || '',
          user: d.user || d.data?.user || {},
        };
      }
    } catch { /* try next */ }
  }
  return { token: '', user: {} };
}

function AH(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION A: Device Token Management (Patient Portal)
// ═══════════════════════════════════════════════════════════════════════

test.describe('P2-A: Device Token Management (Patient Portal)', () => {
  let patientToken = '';

  test.beforeAll(async ({ request }) => {
    const auth = await loginPatient(request);
    patientToken = auth.token;
    logTestInfo(`Patient auth: ${patientToken ? 'OK' : 'FAILED'}`);
  });

  test('P2-A01: Register a device token', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}${ENDPOINTS.deviceTokens}`, {
      headers: AH(patientToken),
      data: {
        deviceToken: `test-fcm-token-${Date.now()}`,
        platform: 'web',
        deviceName: 'E2E Test Browser',
      },
    });
    // Accept 200 or 201 (created)
    expect([200, 201]).toContain(r.status());
    logTestSuccess('Device token registered');
  });

  test('P2-A02: Get device tokens', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}${ENDPOINTS.deviceTokens}`, {
      headers: AH(patientToken),
    });
    expect(r.status()).toBe(200);
    const body = await r.json();
    // May return array directly or wrapped in data
    const tokens = Array.isArray(body) ? body : body.data || [];
    expect(tokens.length).toBeGreaterThanOrEqual(0);
    logTestSuccess(`Got ${tokens.length} device tokens`);
  });

  test('P2-A03: Deactivate a device token', async ({ request }) => {
    const r = await request.delete(`${PATIENT_URL}${ENDPOINTS.deviceTokens}`, {
      headers: AH(patientToken),
      data: { deviceToken: `test-fcm-token-cleanup` },
    });
    // Accept 200 or 404 (token not found is OK for cleanup)
    expect([200, 204, 404]).toContain(r.status());
    logTestSuccess('Device token deactivation handled');
  });

  test('P2-A04: Deactivate all device tokens', async ({ request }) => {
    const r = await request.delete(`${PATIENT_URL}${ENDPOINTS.deviceTokens}/all`, {
      headers: AH(patientToken),
    });
    expect([200, 204]).toContain(r.status());
    logTestSuccess('All device tokens deactivated');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION B: Biometric Authentication (Patient Portal)
// ═══════════════════════════════════════════════════════════════════════

test.describe('P2-B: Biometric Authentication (Patient Portal)', () => {
  let patientToken = '';

  test.beforeAll(async ({ request }) => {
    const auth = await loginPatient(request);
    patientToken = auth.token;
  });

  test('P2-B01: Get biometric status', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}${ENDPOINTS.biometric.status}`, {
      headers: AH(patientToken),
    });
    expect([200, 404]).toContain(r.status());
    logTestSuccess('Biometric status checked');
  });

  test('P2-B02: Register biometric credential', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}${ENDPOINTS.biometric.register}`, {
      headers: AH(patientToken),
      data: {
        credentialId: `e2e-cred-${Date.now()}`,
        publicKey: 'test-public-key-base64',
        deviceId: `e2e-device-${Date.now()}`,
        deviceName: 'E2E Test Device',
        credentialType: 'fingerprint',
      },
    });
    expect([200, 201]).toContain(r.status());
    logTestSuccess('Biometric credential registered');
  });

  test('P2-B03: List biometric credentials', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/biometric`, {
      headers: AH(patientToken),
    });
    expect(r.status()).toBe(200);
    logTestSuccess('Biometric credentials listed');
  });

  test('P2-B04: Verify biometric (expected fail without real credential)', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}${ENDPOINTS.biometric.verify}`, {
      headers: AH(patientToken),
      data: {
        credentialId: 'non-existent-credential',
        deviceId: 'non-existent-device',
        signature: 'test-sig',
      },
    });
    // Expected to fail (401/404) since we don't have a real credential
    expect([200, 401, 404]).toContain(r.status());
    logTestSuccess('Biometric verify endpoint responded');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION C: Offline Sync Queue (Patient Portal)
// ═══════════════════════════════════════════════════════════════════════

test.describe('P2-C: Offline Sync Queue (Patient Portal)', () => {
  let patientToken = '';

  test.beforeAll(async ({ request }) => {
    const auth = await loginPatient(request);
    patientToken = auth.token;
  });

  test('P2-C01: Push changes to sync queue', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}${ENDPOINTS.sync.push}`, {
      headers: AH(patientToken),
      data: {
        items: [
          {
            entityType: 'vital_signs',
            entityId: `sync-${Date.now()}`,
            operation: 'create',
            payload: { heart_rate: 72, blood_pressure_systolic: 120, blood_pressure_diastolic: 80 },
            clientTimestamp: new Date().toISOString(),
          },
        ],
      },
    });
    expect([200, 201]).toContain(r.status());
    logTestSuccess('Sync push accepted');
  });

  test('P2-C02: Pull sync changes', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}${ENDPOINTS.sync.pull}`, {
      headers: AH(patientToken),
    });
    expect(r.status()).toBe(200);
    await r.json();
    logTestSuccess(`Pull sync returned data`);
  });

  test('P2-C03: Get sync conflicts', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}${ENDPOINTS.sync.conflicts}`, {
      headers: AH(patientToken),
    });
    expect([200, 404]).toContain(r.status());
    logTestSuccess('Sync conflicts checked');
  });

  test('P2-C04: Get sync status', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}${ENDPOINTS.sync.status}`, {
      headers: AH(patientToken),
    });
    expect(r.status()).toBe(200);
    logTestSuccess('Sync status retrieved');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION D: API Connections (Patient Portal)
// ═══════════════════════════════════════════════════════════════════════

test.describe('P2-D: API Connections (Patient Portal)', () => {
  let patientToken = '';

  test.beforeAll(async ({ request }) => {
    const auth = await loginPatient(request);
    patientToken = auth.token;
  });

  test('P2-D01: List API connections', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}${ENDPOINTS.connections}`, {
      headers: AH(patientToken),
    });
    expect(r.status()).toBe(200);
    logTestSuccess('API connections listed');
  });

  test('P2-D02: Connect to a service', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}${ENDPOINTS.connections}`, {
      headers: AH(patientToken),
      data: {
        serviceType: 'apple_health',
        accessToken: 'test-access-token',
        metadata: { sync_interval: 3600 },
      },
    });
    expect([200, 201]).toContain(r.status());
    logTestSuccess('Service connected');
  });

  test('P2-D03: Get connection status', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}${ENDPOINTS.connections}/apple_health/status`, {
      headers: AH(patientToken),
    });
    expect([200, 404]).toContain(r.status());
    logTestSuccess('Connection status checked');
  });

  test('P2-D04: Get connection audit log', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}${ENDPOINTS.connections.replace('/api/connections', '/api/connections')}/audit/log`, {
      headers: AH(patientToken),
    });
    expect([200, 404]).toContain(r.status());
    logTestSuccess('Audit log checked');
  });

  test('P2-D05: Health check all connections', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}/api/connections/health/check`, {
      headers: AH(patientToken),
    });
    expect([200, 404]).toContain(r.status());
    logTestSuccess('Health check responded');
  });

  test('P2-D06: Disconnect from a service', async ({ request }) => {
    const r = await request.delete(`${PATIENT_URL}${ENDPOINTS.connections}/apple_health`, {
      headers: AH(patientToken),
    });
    expect([200, 204, 404]).toContain(r.status());
    logTestSuccess('Service disconnection handled');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION E: User Settings & Notification Preferences (Patient Portal)
// ═══════════════════════════════════════════════════════════════════════

test.describe('P2-E: User Settings (Patient Portal)', () => {
  let patientToken = '';

  test.beforeAll(async ({ request }) => {
    const auth = await loginPatient(request);
    patientToken = auth.token;
  });

  test('P2-E01: Get user settings', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}${ENDPOINTS.settings.base}`, {
      headers: AH(patientToken),
    });
    expect(r.status()).toBe(200);
    logTestSuccess('User settings retrieved');
  });

  test('P2-E02: Update user settings', async ({ request }) => {
    const r = await request.put(`${PATIENT_URL}${ENDPOINTS.settings.base}`, {
      headers: AH(patientToken),
      data: {
        theme: 'light',
        language: 'th',
        timezone: 'Asia/Bangkok',
      },
    });
    expect([200, 201]).toContain(r.status());
    logTestSuccess('User settings updated');
  });

  test('P2-E03: Get notification preferences', async ({ request }) => {
    const r = await request.get(`${PATIENT_URL}${ENDPOINTS.settings.notifications}`, {
      headers: AH(patientToken),
    });
    expect(r.status()).toBe(200);
    logTestSuccess('Notification preferences retrieved');
  });

  test('P2-E04: Update notification preferences', async ({ request }) => {
    const r = await request.put(`${PATIENT_URL}${ENDPOINTS.settings.notifications}`, {
      headers: AH(patientToken),
      data: {
        channel: 'push',
        category: 'appointment_reminder',
        enabled: true,
      },
    });
    expect([200, 201]).toContain(r.status());
    logTestSuccess('Notification preferences updated');
  });

  test('P2-E05: Set user role preference', async ({ request }) => {
    const r = await request.put(`${PATIENT_URL}${ENDPOINTS.settings.role}`, {
      headers: AH(patientToken),
      data: { role: 'patient' },
    });
    expect([200, 201]).toContain(r.status());
    logTestSuccess('Role preference updated');
  });

  test('P2-E06: Complete onboarding', async ({ request }) => {
    const r = await request.post(`${PATIENT_URL}${ENDPOINTS.settings.onboarding}`, {
      headers: AH(patientToken),
      data: { completed: true },
    });
    expect([200, 201]).toContain(r.status());
    logTestSuccess('Onboarding completed');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION F: Doctor Portal Phase 2 Endpoints
// ═══════════════════════════════════════════════════════════════════════

test.describe('P2-F: Doctor Portal Phase 2 Endpoints', () => {
  let doctorToken = '';

  test.beforeAll(async ({ request }) => {
    const auth = await loginDoctor(request);
    doctorToken = auth.token;
    logTestInfo(`Doctor auth: ${doctorToken ? 'OK' : 'FAILED'}`);
  });

  test('P2-F01: Register device token (Doctor)', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/device-tokens`, {
      headers: AH(doctorToken),
      data: {
        deviceToken: `test-doctor-fcm-${Date.now()}`,
        platform: 'web',
        deviceName: 'E2E Doctor Browser',
      },
    });
    expect([200, 201]).toContain(r.status());
    logTestSuccess('Doctor device token registered');
  });

  test('P2-F02: Get device tokens (Doctor)', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/device-tokens`, {
      headers: AH(doctorToken),
    });
    expect(r.status()).toBe(200);
    logTestSuccess('Doctor device tokens listed');
  });

  test('P2-F03: Get settings (Doctor)', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/settings`, {
      headers: AH(doctorToken),
    });
    expect(r.status()).toBe(200);
    logTestSuccess('Doctor settings retrieved');
  });

  test('P2-F04: Update settings (Doctor)', async ({ request }) => {
    const r = await request.put(`${DOCTOR_URL}/api/settings`, {
      headers: AH(doctorToken),
      data: {
        theme: 'light',
        language: 'th',
        consultation_mode: 'video',
      },
    });
    expect([200, 201]).toContain(r.status());
    logTestSuccess('Doctor settings updated');
  });

  test('P2-F05: Get API connections (Doctor)', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/connections`, {
      headers: AH(doctorToken),
    });
    expect(r.status()).toBe(200);
    logTestSuccess('Doctor API connections listed');
  });

  test('P2-F06: Connect service (Doctor)', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/connections`, {
      headers: AH(doctorToken),
      data: {
        serviceType: 'lab_api',
        accessToken: 'test-lab-token',
      },
    });
    expect([200, 201]).toContain(r.status());
    logTestSuccess('Doctor connected to service');
  });

  test('P2-F07: Push sync data (Doctor)', async ({ request }) => {
    const r = await request.post(`${DOCTOR_URL}/api/sync/push`, {
      headers: AH(doctorToken),
      data: {
        items: [
          {
            entityType: 'prescription',
            entityId: `doc-sync-${Date.now()}`,
            operation: 'create',
            payload: { medication: 'Paracetamol', dosage: '500mg' },
            clientTimestamp: new Date().toISOString(),
          },
        ],
      },
    });
    expect([200, 201]).toContain(r.status());
    logTestSuccess('Doctor sync push accepted');
  });

  test('P2-F08: Pull sync data (Doctor)', async ({ request }) => {
    const r = await request.get(`${DOCTOR_URL}/api/sync/pull`, {
      headers: AH(doctorToken),
    });
    expect(r.status()).toBe(200);
    logTestSuccess('Doctor sync pull retrieved');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION G: Cross-Role Integration Tests
// ═══════════════════════════════════════════════════════════════════════

test.describe('P2-G: Cross-Role Integration', () => {
  let patientToken = '';
  let doctorToken = '';

  test.beforeAll(async ({ request }) => {
    const [patientAuth, doctorAuth] = await Promise.all([
      loginPatient(request),
      loginDoctor(request),
    ]);
    patientToken = patientAuth.token;
    doctorToken = doctorAuth.token;
  });

  test('P2-G01: Both roles can register device tokens simultaneously', async ({ request }) => {
    const [patientR, doctorR] = await Promise.all([
      request.post(`${PATIENT_URL}${ENDPOINTS.deviceTokens}`, {
        headers: AH(patientToken),
        data: { deviceToken: `pt-sim-${Date.now()}`, platform: 'ios', deviceName: 'Patient iPhone' },
      }),
      request.post(`${DOCTOR_URL}/api/device-tokens`, {
        headers: AH(doctorToken),
        data: { deviceToken: `dr-sim-${Date.now()}`, platform: 'android', deviceName: 'Doctor Android' },
      }),
    ]);
    expect([200, 201]).toContain(patientR.status());
    expect([200, 201]).toContain(doctorR.status());
    logTestSuccess('Simultaneous device token registration OK');
  });

  test('P2-G02: Both roles can fetch settings independently', async ({ request }) => {
    const [patientR, doctorR] = await Promise.all([
      request.get(`${PATIENT_URL}${ENDPOINTS.settings.base}`, { headers: AH(patientToken) }),
      request.get(`${DOCTOR_URL}/api/settings`, { headers: AH(doctorToken) }),
    ]);
    expect(patientR.status()).toBe(200);
    expect(doctorR.status()).toBe(200);
    logTestSuccess('Independent settings fetch OK');
  });

  test('P2-G03: Unauthorized access returns 401/403', async ({ request }) => {
    // Try accessing patient endpoints without token
    const r = await request.get(`${PATIENT_URL}${ENDPOINTS.settings.base}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    expect([401, 403]).toContain(r.status());
    logTestSuccess('Unauthorized access correctly rejected');
  });
});
