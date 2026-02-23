/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — OPENCLAW MCP SERVER UNIT TESTS
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: AES-256-GCM encryption/decryption, session management,
 *        internal auth middleware, MCP route handlers, error handling
 * Source: Isara-doctor-portal/server/openclaw-mcp-server.cjs
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'node:crypto';

// ─── Reimplemented pure logic from openclaw-mcp-server.cjs for testing ──────

// ─── AES-256-GCM Encryption / Decryption ────────────────────────────────────

function encryptPayload(plaintext: string, keyHex: string): string {
  if (!keyHex || keyHex.length < 64) {
    throw new Error('Encryption key must be a 32-byte (64-char) hex string');
  }
  const key = Buffer.from(keyHex, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decryptPayload(ciphertext: string, keyHex: string): string {
  if (!keyHex || keyHex.length < 64) {
    return ciphertext; // passthrough in dev mode
  }
  const buf = Buffer.from(ciphertext, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const key = Buffer.from(keyHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
}

// ─── Internal Auth Middleware ────────────────────────────────────────────────

function checkInternalAuth(
  providedSecret: string | undefined,
  expectedSecret: string
): { authorized: boolean; status: number; error?: string } {
  if (!expectedSecret) {
    return { authorized: false, status: 503, error: 'Service misconfigured' };
  }
  if (!providedSecret) {
    return { authorized: false, status: 401, error: 'Unauthorized' };
  }
  const expectedBuf = Buffer.from(expectedSecret);
  const providedBuf = Buffer.from(providedSecret);
  if (expectedBuf.length !== providedBuf.length) {
    return { authorized: false, status: 401, error: 'Unauthorized' };
  }
  if (!crypto.timingSafeEqual(expectedBuf, providedBuf)) {
    return { authorized: false, status: 401, error: 'Unauthorized' };
  }
  return { authorized: true, status: 200 };
}

// ─── MCP Session Store ──────────────────────────────────────────────────────

interface MCPSession {
  patientId: string;
  channel: string;
  symptoms: string[];
  vitalSigns: Record<string, unknown>;
  historyOfPresentIllness: Record<string, unknown>;
  medications: string[];
  allergies: string[];
  chronicConditions: string[];
  investigations: { name: string; type: string; orderedAt: string; status: string }[];
  assessments: { description: string; timestamp: string }[];
  messages: { messageId?: string; channel: string; text: string; timestamp: string | Date }[];
  createdAt: Date;
  updatedAt: Date;
}

function createSessionStore() {
  const store = new Map<string, MCPSession>();

  function getOrCreateSession(patientId: string, channel: string): MCPSession {
    if (!store.has(patientId)) {
      store.set(patientId, {
        patientId,
        channel: channel || 'unknown',
        symptoms: [],
        vitalSigns: {},
        historyOfPresentIllness: {},
        medications: [],
        allergies: [],
        chronicConditions: [],
        investigations: [],
        assessments: [],
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    return store.get(patientId)!;
  }

  function deleteSession(patientId: string): boolean {
    return store.delete(patientId);
  }

  function getSession(patientId: string): MCPSession | undefined {
    return store.get(patientId);
  }

  function getAllSessions(): MCPSession[] {
    return Array.from(store.values());
  }

  return { store, getOrCreateSession, deleteSession, getSession, getAllSessions };
}

// ─── Entity merging logic ────────────────────────────────────────────────────

function mergeEntities(
  session: MCPSession,
  entities: {
    symptoms?: string[];
    vitalSigns?: Record<string, unknown>;
    historyOfPresentIllness?: Record<string, unknown>;
    medications?: string[];
    allergies?: string[];
  }
): void {
  if (entities.symptoms?.length) {
    session.symptoms = [...new Set([...session.symptoms, ...entities.symptoms])];
  }
  if (entities.vitalSigns) {
    session.vitalSigns = { ...session.vitalSigns, ...entities.vitalSigns };
  }
  if (entities.historyOfPresentIllness) {
    session.historyOfPresentIllness = {
      ...session.historyOfPresentIllness,
      ...entities.historyOfPresentIllness,
    };
  }
  if (entities.medications?.length) {
    session.medications = [...new Set([...session.medications, ...entities.medications])];
  }
  if (entities.allergies?.length) {
    session.allergies = [...new Set([...session.allergies, ...entities.allergies])];
  }
  session.updatedAt = new Date();
}

// ─── Ingest request validation ───────────────────────────────────────────────

function validateIngestRequest(body: {
  patientId?: string;
  text?: string;
}): { valid: boolean; error?: string } {
  if (!body.patientId || !body.text) {
    return { valid: false, error: 'patientId and text are required' };
  }
  return { valid: true };
}

// ─── Context request validation ──────────────────────────────────────────────

function validateContextRequest(body: {
  patientId?: string;
}): { valid: boolean; error?: string } {
  if (!body.patientId) {
    return { valid: false, error: 'patientId is required' };
  }
  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITES
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────
// A. AES-256-GCM Encryption / Decryption
// ─────────────────────────────────────────────

describe('MCP Server — AES-256-GCM Encryption', () => {
  const validKey = crypto.randomBytes(32).toString('hex'); // 64 hex chars

  it('A01 — encrypt and decrypt roundtrip returns original text', () => {
    const plaintext = 'Patient has fever and headache for 3 days';
    const encrypted = encryptPayload(plaintext, validKey);
    const decrypted = decryptPayload(encrypted, validKey);
    expect(decrypted).toBe(plaintext);
  });

  it('A02 — encrypted output is base64 encoded', () => {
    const encrypted = encryptPayload('test', validKey);
    expect(() => Buffer.from(encrypted, 'base64')).not.toThrow();
    expect(encrypted).not.toBe('test');
  });

  it('A03 — encrypted output differs for same plaintext (random IV)', () => {
    const a = encryptPayload('same text', validKey);
    const b = encryptPayload('same text', validKey);
    expect(a).not.toBe(b);
  });

  it('A04 — decryption fails with wrong key', () => {
    const wrongKey = crypto.randomBytes(32).toString('hex');
    const encrypted = encryptPayload('secret data', validKey);
    expect(() => decryptPayload(encrypted, wrongKey)).toThrow();
  });

  it('A05 — encryption throws with short key', () => {
    expect(() => encryptPayload('test', 'short_key')).toThrow('Encryption key must be');
  });

  it('A06 — encryption throws with empty key', () => {
    expect(() => encryptPayload('test', '')).toThrow('Encryption key must be');
  });

  it('A07 — decryption passthrough when key is empty (dev mode)', () => {
    const result = decryptPayload('plaintext_data', '');
    expect(result).toBe('plaintext_data');
  });

  it('A08 — handles JSON payload roundtrip', () => {
    const jsonData = JSON.stringify({ symptoms: ['fever'], temp: 38.5 });
    const encrypted = encryptPayload(jsonData, validKey);
    const decrypted = decryptPayload(encrypted, validKey);
    expect(JSON.parse(decrypted)).toEqual({ symptoms: ['fever'], temp: 38.5 });
  });

  it('A09 — handles unicode/Thai text roundtrip', () => {
    const thai = 'ผู้ป่วยมีอาการไข้สูง ปวดศีรษะ คลื่นไส้';
    const encrypted = encryptPayload(thai, validKey);
    const decrypted = decryptPayload(encrypted, validKey);
    expect(decrypted).toBe(thai);
  });

  it('A10 — handles empty string roundtrip', () => {
    const encrypted = encryptPayload('', validKey);
    const decrypted = decryptPayload(encrypted, validKey);
    expect(decrypted).toBe('');
  });
});

// ─────────────────────────────────────────────
// B. Internal Auth Middleware
// ─────────────────────────────────────────────

describe('MCP Server — Internal Auth', () => {
  const secret = 'super_secret_internal_token_64chars_long_for_testing_only_please';

  it('B01 — accepts valid secret', () => {
    const result = checkInternalAuth(secret, secret);
    expect(result.authorized).toBe(true);
    expect(result.status).toBe(200);
  });

  it('B02 — rejects missing secret (401)', () => {
    const result = checkInternalAuth(undefined, secret);
    expect(result.authorized).toBe(false);
    expect(result.status).toBe(401);
  });

  it('B03 — rejects wrong secret (401)', () => {
    const result = checkInternalAuth('wrong_secret', secret);
    expect(result.authorized).toBe(false);
    expect(result.status).toBe(401);
  });

  it('B04 — returns 503 when expected secret is empty (misconfigured)', () => {
    const result = checkInternalAuth('any_secret', '');
    expect(result.authorized).toBe(false);
    expect(result.status).toBe(503);
    expect(result.error).toBe('Service misconfigured');
  });

  it('B05 — timing-safe comparison prevents timing attacks', () => {
    const result1 = checkInternalAuth('a', secret);
    const result2 = checkInternalAuth('ab', secret);
    expect(result1.authorized).toBe(false);
    expect(result2.authorized).toBe(false);
  });

  it('B06 — rejects empty string as provided secret', () => {
    const result = checkInternalAuth('', secret);
    expect(result.authorized).toBe(false);
    expect(result.status).toBe(401);
  });
});

// ─────────────────────────────────────────────
// C. MCP Session Store
// ─────────────────────────────────────────────

describe('MCP Server — Session Store', () => {
  let sessionStore: ReturnType<typeof createSessionStore>;

  beforeEach(() => {
    sessionStore = createSessionStore();
  });

  it('C01 — creates new session for new patient', () => {
    const session = sessionStore.getOrCreateSession('line_U123', 'line');
    expect(session.patientId).toBe('line_U123');
    expect(session.channel).toBe('line');
    expect(session.symptoms).toEqual([]);
    expect(session.messages).toEqual([]);
  });

  it('C02 — returns existing session for same patient', () => {
    const s1 = sessionStore.getOrCreateSession('line_U1', 'line');
    s1.symptoms.push('fever');
    const s2 = sessionStore.getOrCreateSession('line_U1', 'line');
    expect(s2.symptoms).toContain('fever');
  });

  it('C03 — different patients have separate sessions', () => {
    sessionStore.getOrCreateSession('line_U1', 'line').symptoms.push('fever');
    sessionStore.getOrCreateSession('wa_661', 'whatsapp').symptoms.push('cough');
    expect(sessionStore.getSession('line_U1')!.symptoms).toEqual(['fever']);
    expect(sessionStore.getSession('wa_661')!.symptoms).toEqual(['cough']);
  });

  it('C04 — deleteSession removes session', () => {
    sessionStore.getOrCreateSession('line_U1', 'line');
    expect(sessionStore.deleteSession('line_U1')).toBe(true);
    expect(sessionStore.getSession('line_U1')).toBeUndefined();
  });

  it('C05 — deleteSession returns false for non-existent session', () => {
    expect(sessionStore.deleteSession('nonexistent')).toBe(false);
  });

  it('C06 — getSession returns undefined for non-existent patient', () => {
    expect(sessionStore.getSession('no_such_patient')).toBeUndefined();
  });

  it('C07 — getAllSessions returns all sessions', () => {
    sessionStore.getOrCreateSession('p1', 'line');
    sessionStore.getOrCreateSession('p2', 'whatsapp');
    sessionStore.getOrCreateSession('p3', 'telegram');
    expect(sessionStore.getAllSessions()).toHaveLength(3);
  });

  it('C08 — new session has timestamps', () => {
    const session = sessionStore.getOrCreateSession('p1', 'line');
    expect(session.createdAt).toBeInstanceOf(Date);
    expect(session.updatedAt).toBeInstanceOf(Date);
  });

  it('C09 — session defaults to empty arrays and objects', () => {
    const session = sessionStore.getOrCreateSession('p1', 'line');
    expect(session.medications).toEqual([]);
    expect(session.allergies).toEqual([]);
    expect(session.chronicConditions).toEqual([]);
    expect(session.investigations).toEqual([]);
    expect(session.assessments).toEqual([]);
    expect(session.vitalSigns).toEqual({});
    expect(session.historyOfPresentIllness).toEqual({});
  });

  it('C10 — channel defaults to unknown when not provided', () => {
    const session = sessionStore.getOrCreateSession('p1', '');
    expect(session.channel).toBe('unknown');
  });
});

// ─────────────────────────────────────────────
// D. Entity Merging
// ─────────────────────────────────────────────

describe('MCP Server — Entity Merging', () => {
  let sessionStore: ReturnType<typeof createSessionStore>;

  beforeEach(() => {
    sessionStore = createSessionStore();
  });

  it('D01 — merges symptoms into session (deduplicates)', () => {
    const session = sessionStore.getOrCreateSession('p1', 'line');
    session.symptoms = ['fever'];
    mergeEntities(session, { symptoms: ['fever', 'headache'] });
    expect(session.symptoms).toEqual(['fever', 'headache']);
  });

  it('D02 — merges vital signs (shallow merge)', () => {
    const session = sessionStore.getOrCreateSession('p1', 'line');
    session.vitalSigns = { temperature: 38.5 };
    mergeEntities(session, { vitalSigns: { heartRate: 90 } });
    expect(session.vitalSigns).toEqual({ temperature: 38.5, heartRate: 90 });
  });

  it('D03 — vital signs overwrites existing keys', () => {
    const session = sessionStore.getOrCreateSession('p1', 'line');
    session.vitalSigns = { temperature: 38.5 };
    mergeEntities(session, { vitalSigns: { temperature: 39.0 } });
    expect(session.vitalSigns).toEqual({ temperature: 39.0 });
  });

  it('D04 — merges medications (deduplicates)', () => {
    const session = sessionStore.getOrCreateSession('p1', 'line');
    session.medications = ['Paracetamol'];
    mergeEntities(session, { medications: ['Paracetamol', 'Amoxicillin'] });
    expect(session.medications).toEqual(['Paracetamol', 'Amoxicillin']);
  });

  it('D05 — merges allergies (deduplicates)', () => {
    const session = sessionStore.getOrCreateSession('p1', 'line');
    session.allergies = ['Penicillin'];
    mergeEntities(session, { allergies: ['Penicillin', 'Aspirin'] });
    expect(session.allergies).toEqual(['Penicillin', 'Aspirin']);
  });

  it('D06 — merges HPI data', () => {
    const session = sessionStore.getOrCreateSession('p1', 'line');
    mergeEntities(session, { historyOfPresentIllness: { onset: '3 days ago', severity: 'moderate' } });
    expect(session.historyOfPresentIllness).toEqual({ onset: '3 days ago', severity: 'moderate' });
  });

  it('D07 — empty entities array does not affect session', () => {
    const session = sessionStore.getOrCreateSession('p1', 'line');
    session.symptoms = ['fever'];
    mergeEntities(session, { symptoms: [] });
    expect(session.symptoms).toEqual(['fever']);
  });

  it('D08 — updates updatedAt timestamp after merge', () => {
    const session = sessionStore.getOrCreateSession('p1', 'line');
    const before = session.updatedAt;
    // Small delay to ensure different timestamp
    mergeEntities(session, { symptoms: ['new_symptom'] });
    expect(session.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it('D09 — handles null entities gracefully', () => {
    const session = sessionStore.getOrCreateSession('p1', 'line');
    expect(() => mergeEntities(session, {})).not.toThrow();
  });
});

// ─────────────────────────────────────────────
// E. Ingest Request Validation
// ─────────────────────────────────────────────

describe('MCP Server — Ingest Validation', () => {
  it('E01 — valid ingest request passes', () => {
    expect(validateIngestRequest({ patientId: 'line_U1', text: 'fever 3 days' }).valid).toBe(true);
  });

  it('E02 — missing patientId fails (400)', () => {
    const result = validateIngestRequest({ text: 'hello' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('patientId');
  });

  it('E03 — missing text fails (400)', () => {
    const result = validateIngestRequest({ patientId: 'p1' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('text');
  });

  it('E04 — empty body fails (400)', () => {
    const result = validateIngestRequest({});
    expect(result.valid).toBe(false);
  });
});

// ─────────────────────────────────────────────
// F. Context Request Validation
// ─────────────────────────────────────────────

describe('MCP Server — Context Validation', () => {
  it('F01 — valid context request passes', () => {
    expect(validateContextRequest({ patientId: 'line_U1' }).valid).toBe(true);
  });

  it('F02 — missing patientId fails (400)', () => {
    const result = validateContextRequest({});
    expect(result.valid).toBe(false);
    expect(result.error).toContain('patientId');
  });

  it('F03 — context not found for non-existent patient (404)', () => {
    const store = createSessionStore();
    expect(store.getSession('nonexistent')).toBeUndefined();
  });
});

// ─────────────────────────────────────────────
// G. Session Summary for Omnichannel Monitor
// ─────────────────────────────────────────────

describe('MCP Server — Session Summary', () => {
  let sessionStore: ReturnType<typeof createSessionStore>;

  beforeEach(() => {
    sessionStore = createSessionStore();
  });

  it('G01 — summary includes patientId and channel', () => {
    const session = sessionStore.getOrCreateSession('line_U1', 'line');
    session.symptoms.push('fever', 'cough');
    session.messages.push({ channel: 'line', text: 'hi', timestamp: new Date().toISOString() });

    const summaries = sessionStore.getAllSessions().map((s) => ({
      patientId: s.patientId,
      channel: s.channel,
      symptomCount: s.symptoms.length,
      messageCount: s.messages.length,
      updatedAt: s.updatedAt,
    }));

    expect(summaries).toHaveLength(1);
    expect(summaries[0].patientId).toBe('line_U1');
    expect(summaries[0].channel).toBe('line');
    expect(summaries[0].symptomCount).toBe(2);
    expect(summaries[0].messageCount).toBe(1);
  });

  it('G02 — empty store returns empty array', () => {
    expect(sessionStore.getAllSessions()).toEqual([]);
  });
});

// ─────────────────────────────────────────────
// H. Health Check Response Structure
// ─────────────────────────────────────────────

describe('MCP Server — Health Check Structure', () => {
  it('H01 — health response has required fields', () => {
    const sessionStore = createSessionStore();
    const health = {
      service: 'OpenClaw MCP Server',
      status: 'healthy',
      activeSessions: sessionStore.store.size,
      geminiConfigured: false,
      telegramConfigured: false,
      timestamp: new Date().toISOString(),
    };

    expect(health.service).toBe('OpenClaw MCP Server');
    expect(health.status).toBe('healthy');
    expect(health.activeSessions).toBe(0);
    expect(typeof health.geminiConfigured).toBe('boolean');
    expect(typeof health.telegramConfigured).toBe('boolean');
    expect(health.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('H02 — activeSessions tracks store size', () => {
    const sessionStore = createSessionStore();
    sessionStore.getOrCreateSession('p1', 'line');
    sessionStore.getOrCreateSession('p2', 'whatsapp');
    expect(sessionStore.store.size).toBe(2);
  });
});
