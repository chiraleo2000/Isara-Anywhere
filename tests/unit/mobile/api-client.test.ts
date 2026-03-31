/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — MOBILE API CLIENT UNIT TESTS
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: Error normalization, header construction, token refresh
 *        deduplication, proxy throw behavior, API initialization
 * Source: Isara-mobile/packages/api-client/src/index.ts
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';

// ─── Re-implement pure logic from API client ───

interface ApiError {
  message: string;
  code: string;
  status: number;
}

function normalizeError(error: any): ApiError {
  // Axios-like error shape
  if (error?.response) {
    return {
      message: error.response.data?.message || error.response.statusText || 'Unknown error',
      code: error.response.data?.code || `HTTP_${error.response.status}`,
      status: error.response.status,
    };
  }

  // Network errors
  if (error?.code === 'ERR_NETWORK' || error?.message?.includes('Network Error')) {
    return {
      message: 'Network error. Please check your connection.',
      code: 'NETWORK_ERROR',
      status: 0,
    };
  }

  // Timeout
  if (error?.code === 'ECONNABORTED') {
    return {
      message: 'Request timed out. Please try again.',
      code: 'TIMEOUT',
      status: 0,
    };
  }

  // Generic
  return {
    message: error?.message || 'An unexpected error occurred',
    code: 'UNKNOWN',
    status: 0,
  };
}

// ─── Mobile request header builder ───

interface RequestHeaders {
  'Content-Type': string;
  'X-Platform': string;
  'X-App-Version': string;
  'X-Device-ID'?: string;
  Authorization?: string;
}

function buildHeaders(
  accessToken?: string | null,
  deviceId?: string,
  appVersion = '2.0.0',
): RequestHeaders {
  const headers: RequestHeaders = {
    'Content-Type': 'application/json',
    'X-Platform': 'mobile',
    'X-App-Version': appVersion,
  };
  if (deviceId) headers['X-Device-ID'] = deviceId;
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  return headers;
}

// ─── Token refresh deduplication ───

class TokenRefreshManager {
  private refreshPromise: Promise<string> | null = null;

  async refresh(refreshFn: () => Promise<string>): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = refreshFn().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  get isRefreshing(): boolean {
    return this.refreshPromise !== null;
  }
}

// ─── API Proxy validation ───

function createApiProxy<T extends object>(name: string): T {
  let instance: T | null = null;

  const proxy = new Proxy({} as T, {
    get(_target, prop) {
      if (!instance) {
        throw new Error(`${name} not initialized. Call init${name}() first.`);
      }
      return (instance as any)[prop];
    },
  });

  return proxy;
}

// ─────────────────────────────────────────────
// A. Error Normalization
// ─────────────────────────────────────────────

describe('Mobile API — Error Normalization', () => {
  it('A01 — normalizes HTTP 401 error', () => {
    const err = normalizeError({
      response: { status: 401, statusText: 'Unauthorized', data: { message: 'Invalid token' } },
    });
    expect(err.status).toBe(401);
    expect(err.message).toBe('Invalid token');
    expect(err.code).toBe('HTTP_401');
  });

  it('A02 — normalizes HTTP 500 with custom code', () => {
    const err = normalizeError({
      response: { status: 500, data: { message: 'DB error', code: 'DB_CONN_FAILED' } },
    });
    expect(err.status).toBe(500);
    expect(err.code).toBe('DB_CONN_FAILED');
  });

  it('A03 — normalizes network error', () => {
    const err = normalizeError({ code: 'ERR_NETWORK', message: 'Network Error' });
    expect(err.code).toBe('NETWORK_ERROR');
    expect(err.status).toBe(0);
  });

  it('A04 — normalizes timeout error', () => {
    const err = normalizeError({ code: 'ECONNABORTED' });
    expect(err.code).toBe('TIMEOUT');
    expect(err.message).toContain('timed out');
  });

  it('A05 — normalizes generic error', () => {
    const err = normalizeError(new Error('Something went wrong'));
    expect(err.code).toBe('UNKNOWN');
    expect(err.message).toBe('Something went wrong');
  });

  it('A06 — handles null/undefined error', () => {
    const err = normalizeError(null);
    expect(err.code).toBe('UNKNOWN');
    expect(err.message).toBeTruthy();
  });

  it('A07 — fallback to statusText when no data.message', () => {
    const err = normalizeError({
      response: { status: 403, statusText: 'Forbidden', data: {} },
    });
    expect(err.message).toBe('Forbidden');
    expect(err.status).toBe(403);
  });
});

// ─────────────────────────────────────────────
// B. Request Header Construction
// ─────────────────────────────────────────────

describe('Mobile API — Headers', () => {
  it('B01 — always includes platform header', () => {
    const headers = buildHeaders();
    expect(headers['X-Platform']).toBe('mobile');
  });

  it('B02 — includes Content-Type JSON', () => {
    const headers = buildHeaders();
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('B03 — adds Bearer token when provided', () => {
    const headers = buildHeaders('test-token-123');
    expect(headers['Authorization']).toBe('Bearer test-token-123');
  });

  it('B04 — omits Authorization when no token', () => {
    const headers = buildHeaders(null);
    expect(headers['Authorization']).toBeUndefined();
  });

  it('B05 — includes device ID when provided', () => {
    const headers = buildHeaders(null, 'device-uuid-123');
    expect(headers['X-Device-ID']).toBe('device-uuid-123');
  });

  it('B06 — default app version is 2.0.0', () => {
    const headers = buildHeaders();
    expect(headers['X-App-Version']).toBe('2.0.0');
  });

  it('B07 — custom app version', () => {
    const headers = buildHeaders(null, undefined, '2.1.0');
    expect(headers['X-App-Version']).toBe('2.1.0');
  });
});

// ─────────────────────────────────────────────
// C. Token Refresh Deduplication
// ─────────────────────────────────────────────

describe('Mobile API — Token Refresh Dedup', () => {
  it('C01 — single refresh call works', async () => {
    const manager = new TokenRefreshManager();
    const token = await manager.refresh(async () => 'new-token');
    expect(token).toBe('new-token');
    expect(manager.isRefreshing).toBe(false);
  });

  it('C02 — concurrent calls share same promise', async () => {
    const manager = new TokenRefreshManager();
    let callCount = 0;

    const refreshFn = () =>
      new Promise<string>(resolve => {
        callCount++;
        setTimeout(() => resolve('shared-token'), 10);
      });

    // Fire 3 concurrent refreshes
    const [t1, t2, t3] = await Promise.all([
      manager.refresh(refreshFn),
      manager.refresh(refreshFn),
      manager.refresh(refreshFn),
    ]);

    // Only 1 actual call should have been made
    expect(callCount).toBe(1);
    expect(t1).toBe('shared-token');
    expect(t2).toBe('shared-token');
    expect(t3).toBe('shared-token');
  });

  it('C03 — resets after completion', async () => {
    const manager = new TokenRefreshManager();
    await manager.refresh(async () => 'token-1');
    expect(manager.isRefreshing).toBe(false);

    // New call creates new promise
    const token = await manager.refresh(async () => 'token-2');
    expect(token).toBe('token-2');
  });

  it('C04 — resets after error', async () => {
    const manager = new TokenRefreshManager();
    await expect(
      manager.refresh(async () => {
        throw new Error('Refresh failed');
      }),
    ).rejects.toThrow('Refresh failed');
    expect(manager.isRefreshing).toBe(false);
  });
});

// ─────────────────────────────────────────────
// D. API Proxy Safety
// ─────────────────────────────────────────────

describe('Mobile API — Proxy Safety', () => {
  it('D01 — throws when API not initialized', () => {
    const proxy = createApiProxy<{ doSomething: () => void }>('PatientApi');
    expect(() => (proxy as any).doSomething).toThrow('PatientApi not initialized');
  });

  it('D02 — error message includes API name', () => {
    const proxy = createApiProxy<{ login: () => void }>('DoctorApi');
    try {
      (proxy as any).login;
    } catch (e: any) {
      expect(e.message).toContain('DoctorApi');
      expect(e.message).toContain('initDoctorApi');
    }
  });
});

// ─────────────────────────────────────────────
// E. Endpoint URL Construction
// ─────────────────────────────────────────────

describe('Mobile API — URL Construction', () => {
  function buildUrl(baseUrl: string, path: string, params?: Record<string, string>): string {
    let url = `${baseUrl.replace(/\/$/, '')}${path}`;
    if (params) {
      const query = new URLSearchParams(params).toString();
      if (query) url += `?${query}`;
    }
    return url;
  }

  it('E01 — builds simple path', () => {
    expect(buildUrl('https://api.example.com', '/api/health')).toBe(
      'https://api.example.com/api/health',
    );
  });

  it('E02 — removes trailing slash from base', () => {
    expect(buildUrl('https://api.example.com/', '/api/health')).toBe(
      'https://api.example.com/api/health',
    );
  });

  it('E03 — appends query params', () => {
    const url = buildUrl('https://api.example.com', '/api/search', { q: 'doctor', limit: '10' });
    expect(url).toContain('q=doctor');
    expect(url).toContain('limit=10');
  });

  it('E04 — no query string when no params', () => {
    const url = buildUrl('https://api.example.com', '/api/profile');
    expect(url).not.toContain('?');
  });

  it('E05 — patient portal endpoints', () => {
    const base = 'http://localhost:3005';
    expect(buildUrl(base, '/api/auth/login')).toBe('http://localhost:3005/api/auth/login');
    expect(buildUrl(base, '/api/phr')).toBe('http://localhost:3005/api/phr');
    expect(buildUrl(base, '/api/appointments')).toBe('http://localhost:3005/api/appointments');
  });

  it('E06 — doctor portal endpoints', () => {
    const base = 'http://localhost:3009';
    expect(buildUrl(base, '/api/patients')).toBe('http://localhost:3009/api/patients');
    expect(buildUrl(base, '/api/emr')).toBe('http://localhost:3009/api/emr');
  });
});
