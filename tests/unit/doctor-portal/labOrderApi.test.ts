/**
 * Doctor frontend service: labOrderApi mapping (mocked fetch).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.stubGlobal('localStorage', {
  getItem: vi.fn(() => 'tok'),
  setItem: vi.fn(),
  removeItem: vi.fn(),
});

describe('labOrderApi', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.mocked(localStorage.getItem).mockReturnValue('tok');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'tok'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('fetchLabOrdersByPatient maps API rows', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          labOrders: [
            {
              id: '1',
              patient_id: 'p1',
              doctor_id: 'd1',
              doctor_name: 'Dr A',
              status: 'ordered',
              tests: [{ code: 'CBC' }],
              priority: 'urgent',
              notes: 'fasting',
              ordered_at: '2026-07-01T00:00:00Z',
              ai_analysis: 'ok',
            },
          ],
        }),
      })),
    );

    const { fetchLabOrdersByPatient } = await import('@doctor/services/labOrderApi.ts');
    const rows = await fetchLabOrdersByPatient('p1');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: '1',
      patientId: 'p1',
      doctorId: 'd1',
      doctorName: 'Dr A',
      status: 'ordered',
      priority: 'urgent',
      notes: 'fasting',
      orderDate: '2026-07-01T00:00:00Z',
      aiAnalysis: 'ok',
    });
    expect(fetch).toHaveBeenCalledWith(
      '/api/lab-orders/patient/p1',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
      }),
    );
  });

  it('maps bare array payloads and encodes patient id', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => [{ id: 9, patientId: 'p2', status: 'completed', urgency_level: 'stat' }],
      })),
    );
    const { fetchLabOrdersByPatient } = await import('@doctor/services/labOrderApi.ts');
    const rows = await fetchLabOrdersByPatient('a/b');
    expect(rows[0]).toMatchObject({ id: '9', patientId: 'p2', status: 'completed', priority: 'stat' });
    expect(fetch).toHaveBeenCalledWith(
      '/api/lab-orders/patient/a%2Fb',
      expect.any(Object),
    );
  });

  it('returns empty array on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) })));
    const { fetchLabOrdersByPatient } = await import('@doctor/services/labOrderApi.ts');
    await expect(fetchLabOrdersByPatient('p1')).resolves.toEqual([]);
  });

  it('createLabOrder POSTs JSON with auth headers', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    const { createLabOrder } = await import('@doctor/services/labOrderApi.ts');
    await createLabOrder({ patientId: 'p1', tests: ['CBC'] });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/lab-orders',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ patientId: 'p1', tests: ['CBC'] }),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer tok',
        }),
      }),
    );
  });

  it('omits Authorization when no token is stored', async () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ orders: [] }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { fetchLabOrdersByPatient } = await import('@doctor/services/labOrderApi.ts');
    await fetchLabOrdersByPatient('p1');
    const headers = (fetchMock.mock.calls[0][1] as { headers: Record<string, string> }).headers;
    expect(headers.Authorization).toBeUndefined();
  });
});
