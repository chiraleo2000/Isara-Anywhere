/**
 * Thin unit tests for patient frontend lib/utils covered by coverage.include:
 *   - lib/api.ts
 *   - utils/resolveApiBaseUrl.ts
 *   - utils/notificationRouting.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getNotificationTarget } from '../../../../issara-patient/frontend/utils/notificationRouting';

describe('notificationRouting', () => {
  it('routes to appointment detail when appointmentId present', () => {
    expect(getNotificationTarget({ appointmentId: 'a1' })).toBe('/appointments/a1');
  });

  it('falls back to /notifications when no appointmentId', () => {
    expect(getNotificationTarget({})).toBe('/notifications');
    expect(getNotificationTarget({ appointmentId: undefined })).toBe('/notifications');
  });
});

describe('resolveApiBaseUrl', () => {
  const originalLocation = globalThis.location;
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    Object.defineProperty(globalThis, 'location', {
      value: originalLocation,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      configurable: true,
      writable: true,
    });
  });

  it('returns empty string when VITE_API_URL is unset', async () => {
    vi.stubEnv('VITE_API_URL', '');
    Object.defineProperty(globalThis, 'window', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const { resolveApiBaseUrl } = await import(
      '../../../../issara-patient/frontend/utils/resolveApiBaseUrl'
    );
    expect(resolveApiBaseUrl()).toBe('');
  });

  it('returns configured URL when window is undefined (SSR/node)', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:3005');
    Object.defineProperty(globalThis, 'window', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const { resolveApiBaseUrl } = await import(
      '../../../../issara-patient/frontend/utils/resolveApiBaseUrl'
    );
    expect(resolveApiBaseUrl()).toBe('http://localhost:3005');
  });

  it('returns empty when configured origin differs from page origin', async () => {
    vi.stubEnv('VITE_API_URL', 'http://host.docker.internal:3005');
    Object.defineProperty(globalThis, 'window', {
      value: {},
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'location', {
      value: { origin: 'http://localhost:3005' },
      configurable: true,
      writable: true,
    });
    const { resolveApiBaseUrl } = await import(
      '../../../../issara-patient/frontend/utils/resolveApiBaseUrl'
    );
    expect(resolveApiBaseUrl()).toBe('');
  });

  it('keeps configured URL when same origin as page', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:3005');
    Object.defineProperty(globalThis, 'window', {
      value: {},
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'location', {
      value: { origin: 'http://localhost:3005' },
      configurable: true,
      writable: true,
    });
    const { resolveApiBaseUrl } = await import(
      '../../../../issara-patient/frontend/utils/resolveApiBaseUrl'
    );
    expect(resolveApiBaseUrl()).toBe('http://localhost:3005');
  });
});

describe('lib/api', () => {
  const store: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = val;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
  };

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    mockLocalStorage.clear();
    vi.stubEnv('VITE_API_URL', '');
    Object.defineProperty(globalThis, 'window', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    vi.stubGlobal('localStorage', mockLocalStorage);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('GET attaches Bearer token and returns JSON', async () => {
    mockLocalStorage.setItem('auth_token', 'tok-1');
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    const { api } = await import('../../../../issara-patient/frontend/lib/api');
    const data = await api.get<{ ok: boolean }>('/api/phr');

    expect(data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/phr',
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
        headers: expect.objectContaining({
          Authorization: 'Bearer tok-1',
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('401 clears auth storage and throws Session expired', async () => {
    mockLocalStorage.setItem('auth_token', 'tok-1');
    mockLocalStorage.setItem('izara_user', '{"id":"u1"}');
    Object.defineProperty(globalThis, 'location', {
      value: { pathname: '/dashboard', href: '' },
      configurable: true,
      writable: true,
    });

    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    });

    const { api } = await import('../../../../issara-patient/frontend/lib/api');
    await expect(api.get('/api/phr')).rejects.toThrow('Session expired');
    expect(mockLocalStorage.getItem('auth_token')).toBeNull();
    expect(mockLocalStorage.getItem('izara_user')).toBeNull();
    expect(globalThis.location.href).toBe('/login?reason=session_expired');
  });
});
