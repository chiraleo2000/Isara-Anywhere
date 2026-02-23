/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — OMNICHANNEL SERVICE (FRONTEND) UNIT TESTS
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: API calls, message/session fetching, reply dispatch,
 *        socket subscription lifecycle, channel helpers, error handling
 * Source: Isara-doctor-portal/src/services/omnichannelService.ts
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ─── Types (mirroring omnichannelService.ts) ─────────────────────────────────

type OmnichannelChannel = 'line' | 'whatsapp' | 'telegram' | 'messages' | 'all';

interface OmnichannelMessage {
  id: string;
  patientId: string;
  channel: OmnichannelChannel;
  text: string;
  timestamp: string;
  direction: 'inbound' | 'outbound';
  entities?: {
    symptoms?: string[];
    medications?: string[];
    vitalSigns?: Record<string, unknown>;
  };
  consentStatus?: 'consented' | 'pending' | 'revoked';
}

interface OmnichannelSession {
  patientId: string;
  channel: OmnichannelChannel;
  symptomCount: number;
  messageCount: number;
  updatedAt: string;
  consentStatus?: 'consented' | 'pending' | 'revoked';
}

interface OmnichannelMessagesFilter {
  channel?: OmnichannelChannel;
  patientId?: string;
  since?: string;
  page?: number;
  limit?: number;
}

interface OmnichannelReplyPayload {
  patientId: string;
  channel: OmnichannelChannel;
  text: string;
  replyToken?: string;
}

// ─── Reimplemented logic from omnichannelService.ts ──────────────────────────

const CHANNEL_LABELS: Record<OmnichannelChannel, string> = {
  line: 'LINE',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  messages: 'Messages',
  all: 'All Channels',
};

const CHANNEL_COLORS: Record<OmnichannelChannel, string> = {
  line: '#06C755',
  whatsapp: '#25D366',
  telegram: '#2AABEE',
  messages: '#007AFF',
  all: '#6B7280',
};

function buildQueryString(filters: OmnichannelMessagesFilter): string {
  const params = new URLSearchParams();
  if (filters.channel && filters.channel !== 'all') params.set('channel', filters.channel);
  if (filters.patientId) params.set('patientId', filters.patientId);
  if (filters.since) params.set('since', filters.since);
  if (filters.page !== undefined) params.set('page', String(filters.page));
  if (filters.limit !== undefined) params.set('limit', String(filters.limit));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

async function apiFetch<T>(baseUrl: string, path: string, options: RequestInit = {}): Promise<T> {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// ─── Socket subscription lifecycle (pure logic) ─────────────────────────────

function createSubscriptionManager<T>() {
  const callbacks = new Set<(event: T) => void>();

  function subscribe(cb: (event: T) => void): () => void {
    callbacks.add(cb);
    return () => {
      callbacks.delete(cb);
    };
  }

  function dispatch(event: T): void {
    callbacks.forEach((cb) => cb(event));
  }

  return { callbacks, subscribe, dispatch };
}

// ─── Mock setup ──────────────────────────────────────────────────────────────

const mockFetch = vi.fn();

beforeEach(() => {
  globalThis.fetch = mockFetch;
});

afterEach(() => {
  vi.restoreAllMocks();
});

function mockResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
    headers: new Headers(),
    redirected: false,
    type: 'basic' as ResponseType,
    url: '',
    clone: () => mockResponse(status, body),
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    bytes: () => Promise.resolve(new Uint8Array()),
  } as Response;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITES
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────
// A. Channel Labels & Colors
// ─────────────────────────────────────────────

describe('Omnichannel Service — Channel Labels', () => {
  it('A01 — LINE label is correct', () => {
    expect(CHANNEL_LABELS.line).toBe('LINE');
  });

  it('A02 — WhatsApp label is correct', () => {
    expect(CHANNEL_LABELS.whatsapp).toBe('WhatsApp');
  });

  it('A03 — Telegram label is correct', () => {
    expect(CHANNEL_LABELS.telegram).toBe('Telegram');
  });

  it('A04 — Messages label is correct', () => {
    expect(CHANNEL_LABELS.messages).toBe('Messages');
  });

  it('A05 — All Channels label is correct', () => {
    expect(CHANNEL_LABELS.all).toBe('All Channels');
  });

  it('A06 — all 5 channels have labels', () => {
    expect(Object.keys(CHANNEL_LABELS)).toHaveLength(5);
  });
});

describe('Omnichannel Service — Channel Colors', () => {
  it('A07 — LINE color is green', () => {
    expect(CHANNEL_COLORS.line).toBe('#06C755');
  });

  it('A08 — WhatsApp color is green', () => {
    expect(CHANNEL_COLORS.whatsapp).toBe('#25D366');
  });

  it('A09 — Telegram color is blue', () => {
    expect(CHANNEL_COLORS.telegram).toBe('#2AABEE');
  });

  it('A10 — Messages color is blue', () => {
    expect(CHANNEL_COLORS.messages).toBe('#007AFF');
  });

  it('A11 — all channels have valid hex colors', () => {
    Object.values(CHANNEL_COLORS).forEach((color) => {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});

// ─────────────────────────────────────────────
// B. Query String Builder
// ─────────────────────────────────────────────

describe('Omnichannel Service — Query String Builder', () => {
  it('B01 — empty filters produce empty string', () => {
    expect(buildQueryString({})).toBe('');
  });

  it('B02 — channel=all is excluded from query', () => {
    expect(buildQueryString({ channel: 'all' })).toBe('');
  });

  it('B03 — specific channel is included', () => {
    expect(buildQueryString({ channel: 'line' })).toBe('?channel=line');
  });

  it('B04 — patientId is included', () => {
    expect(buildQueryString({ patientId: 'line_U1' })).toContain('patientId=line_U1');
  });

  it('B05 — since filter is included', () => {
    expect(buildQueryString({ since: '2024-01-01' })).toContain('since=2024-01-01');
  });

  it('B06 — page is included', () => {
    expect(buildQueryString({ page: 2 })).toContain('page=2');
  });

  it('B07 — limit is included', () => {
    expect(buildQueryString({ limit: 50 })).toContain('limit=50');
  });

  it('B08 — multiple filters combined', () => {
    const qs = buildQueryString({ channel: 'whatsapp', page: 1, limit: 20 });
    expect(qs).toContain('channel=whatsapp');
    expect(qs).toContain('page=1');
    expect(qs).toContain('limit=20');
  });
});

// ─────────────────────────────────────────────
// C. Message History Fetch
// ─────────────────────────────────────────────

describe('Omnichannel Service — getMessages', () => {
  const API_BASE = '';

  it('C01 — returns paginated messages', async () => {
    const mockMessages: OmnichannelMessage[] = [
      {
        id: 'msg1',
        patientId: 'line_U1',
        channel: 'line',
        text: 'Hello',
        timestamp: '2024-01-01T00:00:00Z',
        direction: 'inbound',
        consentStatus: 'consented',
      },
    ];

    mockFetch.mockResolvedValueOnce(mockResponse(200, { messages: mockMessages, total: 1, page: 1 }));

    const result = await apiFetch<{ messages: OmnichannelMessage[]; total: number; page: number }>(
      API_BASE, '/api/omnichannel/messages'
    );

    expect(result.messages).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
  });

  it('C02 — handles empty messages list', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, { messages: [], total: 0, page: 1 }));

    const result = await apiFetch<{ messages: OmnichannelMessage[]; total: number }>(
      API_BASE, '/api/omnichannel/messages'
    );

    expect(result.messages).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('C03 — handles 500 server error', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(500, 'Internal Server Error'));

    await expect(
      apiFetch(API_BASE, '/api/omnichannel/messages')
    ).rejects.toThrow('API error 500');
  });

  it('C04 — handles network failure', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(
      apiFetch(API_BASE, '/api/omnichannel/messages')
    ).rejects.toThrow('Failed to fetch');
  });
});

// ─────────────────────────────────────────────
// D. Session List Fetch
// ─────────────────────────────────────────────

describe('Omnichannel Service — getSessions', () => {
  const API_BASE = '';

  it('D01 — returns active sessions', async () => {
    const sessions: OmnichannelSession[] = [
      { patientId: 'line_U1', channel: 'line', symptomCount: 2, messageCount: 5, updatedAt: '2024-01-01T00:00:00Z', consentStatus: 'consented' },
    ];

    mockFetch.mockResolvedValueOnce(mockResponse(200, { sessions }));

    const result = await apiFetch<{ sessions: OmnichannelSession[] }>(API_BASE, '/api/omnichannel/sessions');
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].consentStatus).toBe('consented');
  });

  it('D02 — handles empty sessions', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, { sessions: [] }));

    const result = await apiFetch<{ sessions: OmnichannelSession[] }>(API_BASE, '/api/omnichannel/sessions');
    expect(result.sessions).toEqual([]);
  });

  it('D03 — handles service unavailable', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(
      apiFetch(API_BASE, '/api/omnichannel/sessions')
    ).rejects.toThrow('Failed to fetch');
  });
});

// ─────────────────────────────────────────────
// E. Reply Dispatch
// ─────────────────────────────────────────────

describe('Omnichannel Service — replyToPatient', () => {
  const API_BASE = '';

  it('E01 — successful reply dispatch', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, { success: true, channel: 'line', patientId: 'line_U1' }));

    const payload: OmnichannelReplyPayload = {
      patientId: 'line_U1',
      channel: 'line',
      text: 'Hello patient',
    };

    const result = await apiFetch<{ success: boolean; channel: string; patientId: string }>(
      API_BASE, '/api/omnichannel/reply', { method: 'POST', body: JSON.stringify(payload) }
    );

    expect(result.success).toBe(true);
    expect(result.channel).toBe('line');
  });

  it('E02 — 400 on invalid payload', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(400, 'patientId, channel, and text are required'));

    await expect(
      apiFetch(API_BASE, '/api/omnichannel/reply', { method: 'POST', body: JSON.stringify({}) })
    ).rejects.toThrow('API error 400');
  });

  it('E03 — 400 on unsupported channel', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(400, 'Unsupported channel: sms'));

    await expect(
      apiFetch(API_BASE, '/api/omnichannel/reply', {
        method: 'POST',
        body: JSON.stringify({ patientId: 'p1', channel: 'sms', text: 'hi' }),
      })
    ).rejects.toThrow('API error 400');
  });

  it('E04 — handles network failure on reply', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(
      apiFetch(API_BASE, '/api/omnichannel/reply', {
        method: 'POST',
        body: JSON.stringify({ patientId: 'p1', channel: 'line', text: 'hi' }),
      })
    ).rejects.toThrow('Failed to fetch');
  });
});

// ─────────────────────────────────────────────
// F. Socket.io Subscription Manager (Pure Logic)
// ─────────────────────────────────────────────

describe('Omnichannel Service — Subscription Manager', () => {
  it('F01 — subscribe adds callback', () => {
    const manager = createSubscriptionManager<OmnichannelMessage>();
    const cb = vi.fn();
    manager.subscribe(cb);
    expect(manager.callbacks.size).toBe(1);
  });

  it('F02 — unsubscribe removes callback', () => {
    const manager = createSubscriptionManager<OmnichannelMessage>();
    const cb = vi.fn();
    const unsub = manager.subscribe(cb);
    unsub();
    expect(manager.callbacks.size).toBe(0);
  });

  it('F03 — dispatch calls all subscribers', () => {
    const manager = createSubscriptionManager<OmnichannelMessage>();
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    manager.subscribe(cb1);
    manager.subscribe(cb2);

    const msg: OmnichannelMessage = {
      id: 'msg1',
      patientId: 'line_U1',
      channel: 'line',
      text: 'hi',
      timestamp: '2024-01-01T00:00:00Z',
      direction: 'inbound',
    };

    manager.dispatch(msg);
    expect(cb1).toHaveBeenCalledWith(msg);
    expect(cb2).toHaveBeenCalledWith(msg);
  });

  it('F04 — dispatch does not call unsubscribed callbacks', () => {
    const manager = createSubscriptionManager<OmnichannelMessage>();
    const cb = vi.fn();
    const unsub = manager.subscribe(cb);
    unsub();

    manager.dispatch({ id: '1', patientId: 'p1', channel: 'line', text: 'hi', timestamp: '', direction: 'inbound' });
    expect(cb).not.toHaveBeenCalled();
  });

  it('F05 — multiple subscribe/unsubscribe cycles work', () => {
    const manager = createSubscriptionManager<OmnichannelMessage>();
    const cb = vi.fn();

    const unsub1 = manager.subscribe(cb);
    expect(manager.callbacks.size).toBe(1);
    unsub1();
    expect(manager.callbacks.size).toBe(0);

    const unsub2 = manager.subscribe(cb);
    expect(manager.callbacks.size).toBe(1);
    unsub2();
    expect(manager.callbacks.size).toBe(0);
  });

  it('F06 — consent event subscription works', () => {
    const manager = createSubscriptionManager<{ patientId: string; channel: string; consented: boolean }>();
    const cb = vi.fn();
    manager.subscribe(cb);

    manager.dispatch({ patientId: 'line_U1', channel: 'line', consented: true });
    expect(cb).toHaveBeenCalledWith({ patientId: 'line_U1', channel: 'line', consented: true });
  });
});

// ─────────────────────────────────────────────
// G. Error Response Handling
// ─────────────────────────────────────────────

describe('Omnichannel Service — HTTP Error Handling', () => {
  const API_BASE = '';

  it('G01 — 400 Bad Request includes body', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(400, 'Missing required fields'));
    await expect(apiFetch(API_BASE, '/api/omnichannel/messages')).rejects.toThrow('API error 400: Missing required fields');
  });

  it('G02 — 401 Unauthorized', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(401, 'Unauthorized'));
    await expect(apiFetch(API_BASE, '/api/omnichannel/messages')).rejects.toThrow('API error 401');
  });

  it('G03 — 403 Forbidden', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(403, 'Forbidden'));
    await expect(apiFetch(API_BASE, '/api/omnichannel/messages')).rejects.toThrow('API error 403');
  });

  it('G04 — 404 Not Found', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(404, 'Not Found'));
    await expect(apiFetch(API_BASE, '/api/omnichannel/messages')).rejects.toThrow('API error 404');
  });

  it('G05 — 429 Too Many Requests', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(429, 'Rate limited'));
    await expect(apiFetch(API_BASE, '/api/omnichannel/messages')).rejects.toThrow('API error 429');
  });

  it('G06 — 500 Internal Server Error', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(500, 'Internal Server Error'));
    await expect(apiFetch(API_BASE, '/api/omnichannel/messages')).rejects.toThrow('API error 500');
  });

  it('G07 — 502 Bad Gateway', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(502, 'Bad Gateway'));
    await expect(apiFetch(API_BASE, '/api/omnichannel/messages')).rejects.toThrow('API error 502');
  });

  it('G08 — 503 Service Unavailable', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(503, 'Service Unavailable'));
    await expect(apiFetch(API_BASE, '/api/omnichannel/messages')).rejects.toThrow('API error 503');
  });

  it('G09 — 504 Gateway Timeout', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(504, 'Gateway Timeout'));
    await expect(apiFetch(API_BASE, '/api/omnichannel/messages')).rejects.toThrow('API error 504');
  });

  it('G10 — network connection refused', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(apiFetch(API_BASE, '/api/omnichannel/messages')).rejects.toThrow('Failed to fetch');
  });

  it('G11 — DNS resolution failure', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('getaddrinfo ENOTFOUND'));
    await expect(apiFetch(API_BASE, '/api/omnichannel/messages')).rejects.toThrow('ENOTFOUND');
  });

  it('G12 — connection timeout', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('network timeout'));
    await expect(apiFetch(API_BASE, '/api/omnichannel/messages')).rejects.toThrow('timeout');
  });
});
