/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — SHARED TEST HELPERS
 * ═══════════════════════════════════════════════════════════════════════
 * Resilient service probes with retry + exponential backoff.
 * Eliminates test.skip() from cold-start failures.
 * ═══════════════════════════════════════════════════════════════════════
 */
import { Page, APIRequestContext } from '@playwright/test';

const RETRY_DELAYS = [5000, 10000, 15000]; // backoff: 5s, 10s, 15s

/**
 * Probe a service URL with retries and exponential backoff.
 * Throws on final failure (making beforeAll fail → all tests fail).
 * Returns the HTTP status on success.
 */
export async function resilientProbe(
  requester: Page | APIRequestContext,
  url: string,
  maxRetries = 3,
  perAttemptTimeout = 20000,
): Promise<number> {
  const req = 'request' in requester ? requester.request : requester;
  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await req.get(url, { timeout: perAttemptTimeout });
      if (res.status() < 500) return res.status();
      lastErr = new Error(`${url} returned ${res.status()}`);
    } catch (err) {
      lastErr = err as Error;
    }
    if (attempt < maxRetries) {
      const delay = RETRY_DELAYS[attempt - 1] || 15000;
      console.log(`  ⏳ Probe retry ${attempt}/${maxRetries} for ${url} — waiting ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error(`Service unreachable after ${maxRetries} retries: ${url} — ${lastErr?.message?.slice(0, 100)}`);
}

/**
 * Resilient API POST with retry and exponential backoff.
 * Returns { status, body } — never throws (returns status=0 on total failure).
 */
export async function resilientApiPost(
  page: Page,
  url: string,
  data: Record<string, unknown>,
  token?: string,
  retries = 3,
  perAttemptTimeout = 20000,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const r = await page.request.post(url, { data, headers, timeout: perAttemptTimeout });
      return { status: r.status(), body: await r.json().catch(() => ({})) };
    } catch (err) {
      if (attempt === retries) {
        console.log(`  ⚠️ apiPost failed after ${retries} retries: ${(err as Error).message?.slice(0, 80)}`);
        return { status: 0, body: {} };
      }
      const delay = RETRY_DELAYS[attempt - 1] || 10000;
      console.log(`  ⏳ apiPost retry ${attempt}/${retries} for ${url} — waiting ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  return { status: 0, body: {} };
}

/**
 * Resilient API GET with retry and exponential backoff.
 */
export async function resilientApiGet(
  page: Page,
  url: string,
  token?: string,
  retries = 3,
  perAttemptTimeout = 20000,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const r = await page.request.get(url, { headers, timeout: perAttemptTimeout });
      return { status: r.status(), body: await r.json().catch(() => ({})) };
    } catch (err) {
      if (attempt === retries) {
        console.log(`  ⚠️ apiGet failed after ${retries} retries: ${(err as Error).message?.slice(0, 80)}`);
        return { status: 0, body: {} };
      }
      const delay = RETRY_DELAYS[attempt - 1] || 10000;
      console.log(`  ⏳ apiGet retry ${attempt}/${retries} for ${url} — waiting ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  return { status: 0, body: {} };
}

/**
 * Resilient page.goto with retry.
 */
export async function safeGoto(
  page: Page,
  url: string,
  options?: { waitUntil?: 'domcontentloaded' | 'load' | 'networkidle'; timeout?: number },
  retries = 3,
): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await page.goto(url, options);
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      const delay = RETRY_DELAYS[attempt - 1] || 10000;
      console.log(`  ⏳ safeGoto retry ${attempt}/${retries} for ${url}: ${(err as Error).message?.slice(0, 60)}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

/**
 * Resilient login via API with retry on both endpoint paths.
 * Tries /api/auth/login first, then /auth/login, then /auth/api/login.
 * Returns token + user data or throws.
 */
export async function resilientLogin(
  page: Page,
  portalUrl: string,
  creds: { email: string; password: string },
  retries = 3,
): Promise<{ token: string; user: Record<string, unknown>; userId: string }> {
  const endpoints = [
    `${portalUrl}/api/auth/login`,
    `${portalUrl}/auth/login`,
    `${portalUrl}/auth/api/login`,
  ];

  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    for (const endpoint of endpoints) {
      try {
        const res = await page.request.post(endpoint, {
          data: creds,
          headers: { 'Content-Type': 'application/json' },
          timeout: 20000,
        });
        if (res.status() === 200) {
          const data = await res.json();
          const token = data.token || data.accessToken;
          const user = data.user || { id: data.userId, email: creds.email, name: 'Test User' };
          const userId = user.id || data.userId || '';
          if (token) return { token, user, userId };
        }
      } catch (err) {
        lastErr = err as Error;
      }
    }
    if (attempt < retries) {
      const delay = RETRY_DELAYS[attempt - 1] || 10000;
      console.log(`  ⏳ Login retry ${attempt}/${retries} for ${portalUrl} — waiting ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error(`Login failed after ${retries} retries for ${portalUrl}: ${lastErr?.message?.slice(0, 100)}`);
}
