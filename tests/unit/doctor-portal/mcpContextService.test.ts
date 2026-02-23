/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — MCP CONTEXT SERVICE (FRONTEND) UNIT TESTS
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: API calls, error handling, fetch failures, status codes
 * Source: Isara-doctor-portal/src/services/mcpContextService.ts
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ─── Types (mirroring mcpContextService.ts) ──────────────────────────────────

interface MCPVitalSigns {
  temperature?: number | null;
  heartRate?: number | null;
  bloodPressure?: string | null;
  oxygenSaturation?: number | null;
}

interface MCPHPI {
  onset?: string | null;
  duration?: string | null;
  severity?: string | null;
  associatedFactors?: string[];
}

interface MCPSession {
  patientId: string;
  channel: string;
  symptoms: string[];
  vitalSigns: MCPVitalSigns;
  historyOfPresentIllness: MCPHPI;
  medications: string[];
  allergies: string[];
  chronicConditions: string[];
  investigations: unknown[];
  assessments: unknown[];
  messages: unknown[];
  createdAt: string;
  updatedAt: string;
}

interface MCPSessionSummary {
  patientId: string;
  channel: string;
  symptomCount: number;
  messageCount: number;
  updatedAt: string;
}

interface ReferralDocument {
  referralDate: string;
  patientId: string;
  targetFacility: string;
  reasonForReferral: string;
  clinicalSummary: string;
  currentMedications: string[];
  allergies: string[];
  investigationsPerformed: unknown[];
  urgency: 'routine' | 'urgent' | 'emergency';
  requestedBy?: string;
}

// ─── Reimplemented fetch helper (matches mcpContextService.ts logic) ─────────

async function mcpFetch<T>(
  baseUrl: string,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MCP API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

async function webhookFetch<T>(
  baseUrl: string,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Webhook API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
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
// A. Get Patient Context
// ─────────────────────────────────────────────

describe('MCP Context Service — getPatientContext', () => {
  const MCP_BASE = '/mcp';

  it('A01 — successful context retrieval', async () => {
    const mockContext: MCPSession = {
      patientId: 'line_U123',
      channel: 'line',
      symptoms: ['fever', 'headache'],
      vitalSigns: { temperature: 38.5 },
      historyOfPresentIllness: { onset: '3 days ago' },
      medications: ['Paracetamol'],
      allergies: [],
      chronicConditions: [],
      investigations: [],
      assessments: [],
      messages: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T12:00:00Z',
    };

    mockFetch.mockResolvedValueOnce(mockResponse(200, { success: true, context: mockContext }));

    const result = await mcpFetch<{ success: boolean; context: MCPSession }>(
      MCP_BASE, '/context', { method: 'POST', body: JSON.stringify({ patientId: 'line_U123' }) }
    );

    expect(result.success).toBe(true);
    expect(result.context.patientId).toBe('line_U123');
    expect(result.context.symptoms).toContain('fever');
  });

  it('A02 — 404 when patient session not found', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(404, 'Session not found'));

    await expect(
      mcpFetch(MCP_BASE, '/context', { method: 'POST', body: JSON.stringify({ patientId: 'nonexistent' }) })
    ).rejects.toThrow('MCP API error 404');
  });

  it('A03 — 400 when patientId is missing', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(400, 'patientId is required'));

    await expect(
      mcpFetch(MCP_BASE, '/context', { method: 'POST', body: JSON.stringify({}) })
    ).rejects.toThrow('MCP API error 400');
  });

  it('A04 — network error throws', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(
      mcpFetch(MCP_BASE, '/context', { method: 'POST', body: JSON.stringify({ patientId: 'p1' }) })
    ).rejects.toThrow('Failed to fetch');
  });

  it('A05 — 500 internal server error', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(500, 'Internal Server Error'));

    await expect(
      mcpFetch(MCP_BASE, '/context', { method: 'POST', body: JSON.stringify({ patientId: 'p1' }) })
    ).rejects.toThrow('MCP API error 500');
  });

  it('A06 — 401 unauthorized error', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(401, 'Unauthorized'));

    await expect(
      mcpFetch(MCP_BASE, '/context', { method: 'POST', body: JSON.stringify({ patientId: 'p1' }) })
    ).rejects.toThrow('MCP API error 401');
  });

  it('A07 — 503 service unavailable', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(503, 'Service misconfigured'));

    await expect(
      mcpFetch(MCP_BASE, '/context', { method: 'POST', body: JSON.stringify({ patientId: 'p1' }) })
    ).rejects.toThrow('MCP API error 503');
  });
});

// ─────────────────────────────────────────────
// B. Get Active Sessions
// ─────────────────────────────────────────────

describe('MCP Context Service — getActiveSessions', () => {
  const MCP_BASE = '/mcp';

  it('B01 — returns list of sessions', async () => {
    const sessions: MCPSessionSummary[] = [
      { patientId: 'line_U1', channel: 'line', symptomCount: 3, messageCount: 5, updatedAt: '2024-01-01T00:00:00Z' },
      { patientId: 'wa_661', channel: 'whatsapp', symptomCount: 1, messageCount: 2, updatedAt: '2024-01-01T00:00:00Z' },
    ];

    mockFetch.mockResolvedValueOnce(mockResponse(200, { success: true, sessions }));

    const result = await mcpFetch<{ success: boolean; sessions: MCPSessionSummary[] }>(MCP_BASE, '/sessions');
    expect(result.sessions).toHaveLength(2);
    expect(result.sessions[0].patientId).toBe('line_U1');
  });

  it('B02 — returns empty array when no sessions', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, { success: true, sessions: [] }));

    const result = await mcpFetch<{ success: boolean; sessions: MCPSessionSummary[] }>(MCP_BASE, '/sessions');
    expect(result.sessions).toEqual([]);
  });

  it('B03 — handles fetch failure gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(mcpFetch(MCP_BASE, '/sessions')).rejects.toThrow('Failed to fetch');
  });
});

// ─────────────────────────────────────────────
// C. Team Brief Generation
// ─────────────────────────────────────────────

describe('MCP Context Service — requestTeamBrief', () => {
  const MCP_BASE = '/mcp';

  it('C01 — sends team brief and returns result', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, {
      success: true,
      brief: 'Patient has fever for 3 days...'
    }));

    const result = await mcpFetch<{ success: boolean; brief: string }>(
      MCP_BASE, '/team-brief',
      { method: 'POST', body: JSON.stringify({ patientId: 'line_U1', question: 'Review medication', requestedBy: 'Dr. Smith' }) }
    );

    expect(result.success).toBe(true);
    expect(result.brief).toContain('fever');
  });

  it('C02 — 404 when patient not found', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(404, 'Session not found'));

    await expect(
      mcpFetch(MCP_BASE, '/team-brief', { method: 'POST', body: JSON.stringify({ patientId: 'nonexistent' }) })
    ).rejects.toThrow('MCP API error 404');
  });

  it('C03 — 400 when patientId is missing', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(400, 'patientId is required'));

    await expect(
      mcpFetch(MCP_BASE, '/team-brief', { method: 'POST', body: JSON.stringify({}) })
    ).rejects.toThrow('MCP API error 400');
  });
});

// ─────────────────────────────────────────────
// D. Referral Generation
// ─────────────────────────────────────────────

describe('MCP Context Service — generateReferral', () => {
  const MCP_BASE = '/mcp';

  it('D01 — generates referral document', async () => {
    const referral: ReferralDocument = {
      referralDate: '2024-01-01',
      patientId: 'line_U1',
      targetFacility: 'Siriraj Hospital',
      reasonForReferral: 'Specialist consultation',
      clinicalSummary: 'Patient with persistent fever...',
      currentMedications: ['Paracetamol'],
      allergies: ['NKDA'],
      investigationsPerformed: [],
      urgency: 'routine',
      requestedBy: 'Dr. Smith',
    };

    mockFetch.mockResolvedValueOnce(mockResponse(200, { success: true, referral }));

    const result = await mcpFetch<{ success: boolean; referral: ReferralDocument }>(
      MCP_BASE, '/referral',
      { method: 'POST', body: JSON.stringify({ patientId: 'line_U1', targetFacility: 'Siriraj Hospital', requestedBy: 'Dr. Smith' }) }
    );

    expect(result.referral.targetFacility).toBe('Siriraj Hospital');
    expect(result.referral.urgency).toBe('routine');
  });

  it('D02 — 404 when patient session missing', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(404, 'Session not found'));

    await expect(
      mcpFetch(MCP_BASE, '/referral', { method: 'POST', body: JSON.stringify({ patientId: 'nonexistent' }) })
    ).rejects.toThrow('MCP API error 404');
  });
});

// ─────────────────────────────────────────────
// E. MCP Session Deletion
// ─────────────────────────────────────────────

describe('MCP Context Service — deleteMCPSession', () => {
  const MCP_BASE = '/mcp';

  it('E01 — successful session deletion', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, { success: true, message: 'Session context purged' }));

    const result = await mcpFetch<{ success: boolean; message: string }>(
      MCP_BASE, '/context/delete',
      { method: 'POST', body: JSON.stringify({ patientId: 'line_U1' }) }
    );

    expect(result.success).toBe(true);
  });

  it('E02 — 404 when session not found', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(404, 'Session not found'));

    await expect(
      mcpFetch(MCP_BASE, '/context/delete', { method: 'POST', body: JSON.stringify({ patientId: 'nonexistent' }) })
    ).rejects.toThrow('MCP API error 404');
  });
});

// ─────────────────────────────────────────────
// F. Consent API
// ─────────────────────────────────────────────

describe('MCP Context Service — Consent API', () => {
  const WEBHOOK_BASE = '/omnichannel';

  it('F01 — check consent returns consented status', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, { userId: 'U123', channel: 'line', consented: true }));

    const result = await webhookFetch<{ userId: string; channel: string; consented: boolean }>(
      WEBHOOK_BASE, '/api/consent/line/U123'
    );

    expect(result.consented).toBe(true);
    expect(result.channel).toBe('line');
  });

  it('F02 — check consent returns not consented', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, { userId: 'U456', channel: 'whatsapp', consented: false }));

    const result = await webhookFetch<{ userId: string; channel: string; consented: boolean }>(
      WEBHOOK_BASE, '/api/consent/whatsapp/U456'
    );

    expect(result.consented).toBe(false);
  });

  it('F03 — revoke consent succeeds', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, { success: true, message: 'Consent revoked' }));

    const result = await webhookFetch<{ success: boolean }>(
      WEBHOOK_BASE, '/api/consent/line/U123', { method: 'DELETE' }
    );

    expect(result.success).toBe(true);
  });

  it('F04 — consent API handles network failure', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(
      webhookFetch(WEBHOOK_BASE, '/api/consent/line/U123')
    ).rejects.toThrow('Failed to fetch');
  });

  it('F05 — consent API handles 500 error', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(500, 'Internal Server Error'));

    await expect(
      webhookFetch(WEBHOOK_BASE, '/api/consent/line/U123')
    ).rejects.toThrow('Webhook API error 500');
  });
});
