import { getBaseUrl, ApiError, apiClient } from '../../api/client';

jest.mock('../../auth/SecureTokenStore', () => ({
  SecureTokenStore: {
    getToken: jest.fn().mockResolvedValue(null),
  },
}));

describe('getBaseUrl', () => {
  it('returns patient URL', () => {
    const url = getBaseUrl('patient');
    expect(url).toContain('3005');
  });

  it('returns doctor auth URL', () => {
    const url = getBaseUrl('doctorAuth');
    expect(url).toContain('3011');
  });

  it('returns doctor API URL', () => {
    const url = getBaseUrl('doctorApi');
    expect(url).toContain('3009');
  });

  it('returns meeting URL', () => {
    const url = getBaseUrl('meeting');
    expect(url).toContain('3020');
  });
});

describe('ApiError', () => {
  it('creates error with status and message', () => {
    const err = new ApiError(404, 'Not found');
    expect(err.status).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err.name).toBe('ApiError');
    expect(err.data).toBeUndefined();
  });

  it('creates error with data', () => {
    const data = { detail: 'User not found' };
    const err = new ApiError(404, 'Not found', data);
    expect(err.data).toEqual(data);
  });

  it('is an instance of Error', () => {
    const err = new ApiError(500, 'Server error');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('apiClient', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = jest.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('makes GET request with correct URL', async () => {
    const mockResponse = { ok: true, json: jest.fn().mockResolvedValue({ data: 'test' }) };
    (globalThis.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const result = await apiClient('patient', '/api/test');
    expect(result).toEqual({ data: 'test' });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/test'),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
  });

  it('throws ApiError on non-ok response', async () => {
    const mockResponse = {
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: jest.fn().mockResolvedValue({ error: 'Invalid token' }),
    };
    (globalThis.fetch as jest.Mock).mockResolvedValue(mockResponse);

    await expect(apiClient('patient', '/api/secure')).rejects.toThrow(ApiError);
    try {
      await apiClient('patient', '/api/secure');
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(401);
      expect(apiErr.message).toBe('Invalid token');
    }
  });

  it('handles non-JSON error response', async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: jest.fn().mockRejectedValue(new Error('not json')),
    };
    (globalThis.fetch as jest.Mock).mockResolvedValue(mockResponse);

    await expect(apiClient('patient', '/api/broken')).rejects.toThrow(ApiError);
  });
});
