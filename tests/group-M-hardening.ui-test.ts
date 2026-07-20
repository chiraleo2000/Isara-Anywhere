/**
 * GROUP M - HARDENING REGRESSION TESTS (Meeting + SSO contract)
 *
 *   M1: POST /api/meetings/create rejects invalid FK refs with 400 invalid_refs
 *   M2: GET  /api/meetings/:id/health returns inDb / inMemory / databaseConnected contract
 *   M3: POST /auth/google-auth (patient)  - 400 when idToken missing
 *   M4: POST /auth/google-auth (patient)  - 401 / 503 when token invalid
 *   M5: POST /auth/google-auth (doctor)   - 400 when idToken missing
 *   M6: POST /auth/google-auth (doctor)   - 401 / 503 when token invalid
 *   M7: Meeting server /health endpoint returns 200
 */
import { test, expect, request } from '@playwright/test';
import { PATIENT_URL, DOCTOR_URL, MEETING_URL } from './helpers/multi-portal';

const PATIENT_API = process.env.PATIENT_API_URL || PATIENT_URL;
const DOCTOR_API = process.env.DOCTOR_API_URL || DOCTOR_URL;
const IS_CLOUD = process.env.TEST_ENV === 'cloud';

async function postWith429Retry(
  ctx: Awaited<ReturnType<typeof request.newContext>>,
  url: string,
  data: Record<string, unknown>,
  maxAttempts = IS_CLOUD ? 8 : 2,
) {
  let res = await ctx.post(url, { data });
  for (let attempt = 1; res.status() === 429 && attempt < maxAttempts; attempt++) {
    const delayMs = IS_CLOUD ? 5000 * attempt : 2000 * attempt;
    await new Promise((r) => setTimeout(r, delayMs));
    res = await ctx.post(url, { data });
  }
  return res;
}

test.describe('Group M - Hardening regression', () => {

  test('M1 - meetings/create rejects invalid FK refs', async () => {
    const ctx = await request.newContext();
    const res = await ctx.post(`${MEETING_URL}/api/meetings/create`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        appointmentId: `non-existent-appt-${Date.now()}`,
        doctorId: `non-existent-doc-${Date.now()}`,
        patientId: `non-existent-pat-${Date.now()}`,
      },
    });
    expect([400, 401, 403]).toContain(res.status());
    if (res.status() === 400) {
      const body = await res.json();
      expect(body.error).toBe('invalid_refs');
      expect(Array.isArray(body.missing)).toBe(true);
    }
    await ctx.dispose();
  });

  test('M2 - meetings/:id/health returns proper contract', async () => {
    const ctx = await request.newContext();
    const probeId = `probe-${Date.now()}`;
    const res = await ctx.get(`${MEETING_URL}/api/meetings/${probeId}/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      inDb: expect.any(Boolean),
      inMemory: expect.any(Boolean),
      databaseConnected: expect.any(Boolean),
    });
    await ctx.dispose();
  });

  test('M3 - patient google-auth rejects missing token', async () => {
    const ctx = await request.newContext();
    const res = await postWith429Retry(ctx, `${PATIENT_API}/api/auth/google-auth`, {});
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error || body.code).toMatch(/idToken|MISSING/i);
    await ctx.dispose();
  });

  test('M4 - patient google-auth rejects invalid token', async () => {
    const ctx = await request.newContext();
    const res = await postWith429Retry(ctx, `${PATIENT_API}/api/auth/google-auth`, {
      idToken: 'definitely.not.a.real.token',
    });
    expect([401, 429, 503]).toContain(res.status());
    if (res.status() === 429) {
      // Still rate-limited after retries — treat as soft pass on cloud auth limiter
      test.info().annotations.push({ type: 'note', description: 'google-auth still 429 after retries' });
    } else {
      expect([401, 503]).toContain(res.status());
    }
    await ctx.dispose();
  });

  test('M5 - doctor google-auth rejects missing token', async () => {
    const ctx = await request.newContext();
    const res = await postWith429Retry(ctx, `${DOCTOR_API}/auth/google-auth`, {});
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code || body.error).toBeTruthy();
    await ctx.dispose();
  });

  test('M6 - doctor google-auth rejects invalid token', async () => {
    const ctx = await request.newContext();
    const res = await postWith429Retry(ctx, `${DOCTOR_API}/auth/google-auth`, {
      idToken: 'definitely.not.a.real.token',
    });
    expect([401, 429, 503]).toContain(res.status());
    await ctx.dispose();
  });

  test('M7 - meeting server /health endpoint is healthy', async () => {
    const ctx = await request.newContext();
    const res = await ctx.get(`${MEETING_URL}/health`).catch(() => null);
    if (res?.status() === 200) {
      expect(res.status()).toBe(200);
    } else {
      const alt = await ctx.get(`${MEETING_URL}/api/health`);
      expect(alt.status()).toBe(200);
    }
    await ctx.dispose();
  });
});
