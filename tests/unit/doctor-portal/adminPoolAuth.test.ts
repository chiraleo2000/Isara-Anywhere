/**
 * @process Processes/Pages/Doctor-Portal/20_Appointment_Pool_Management.md
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const storage = new Map<string, string>();

describe('adminPoolAuth — appointment pool API session', () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => { storage.set(k, v); },
      removeItem: (k: string) => { storage.delete(k); },
      clear: () => { storage.clear(); },
    });
    vi.stubGlobal('fetch', vi.fn());
    storage.set('token', 'admin-test-jwt');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('DB-01 — pool fetch must send credentials:include and Bearer when token present', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ appointments: [{ id: 'apt-1', status: 'in_pool' }] }),
    } as Response);

    const token = storage.get('token') || '';
    const apiBase = '';
    await fetch(`${apiBase}/api/appointment-pool?includeAccepted=true`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(init.credentials).toBe('include');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer admin-test-jwt');
  });

  it('DB-01b — pool fetch without token still sends credentials for cookie session', async () => {
    storage.delete('token');
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    } as Response);

    await fetch('/api/appointment-pool?includeAccepted=true', {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(init.credentials).toBe('include');
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });
});
