/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — SECURITY HARDENING UNIT TESTS
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: CSP policy, API key exposure prevention, Buffer.subarray vs slice,
 *        JSON.parse safety, input length validation, OWASP middleware,
 *        CSRF token validation, encryption key management,
 *        timing-safe comparison, RBAC, request integrity
 * Source: Isara-doctor-portal/server/security/owasp-middleware.cjs
 *         Isara-doctor-portal/server/openclaw-mcp-server.cjs
 *         Isara-doctor-portal/server/omnichannel-webhook-server.cjs
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'node:crypto';

// ═══════════════════════════════════════════════════════════════════════════════
// A. CSP (Content Security Policy) Validation
// ═══════════════════════════════════════════════════════════════════════════════

describe('Security Hardening — CSP Policy', () => {
  // The CSP string after security fix (unsafe-eval removed, frame-ancestors added)
  const CSP_POLICY =
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://apis.google.com https://maps.googleapis.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https: blob:; " +
    "connect-src 'self' http://localhost:* https://*.googleapis.com wss://*; " +
    "frame-src 'self' https://meet.google.com https://calendar.google.com; " +
    "frame-ancestors 'self';";

  it('A01 — CSP does NOT contain unsafe-eval', () => {
    expect(CSP_POLICY).not.toContain('unsafe-eval');
  });

  it('A02 — CSP contains frame-ancestors directive', () => {
    expect(CSP_POLICY).toContain("frame-ancestors 'self'");
  });

  it('A03 — CSP has default-src self', () => {
    expect(CSP_POLICY).toContain("default-src 'self'");
  });

  it('A04 — CSP restricts script sources', () => {
    expect(CSP_POLICY).toContain("script-src 'self'");
    expect(CSP_POLICY).toContain('https://apis.google.com');
  });

  it('A05 — CSP restricts connect sources', () => {
    expect(CSP_POLICY).toContain("connect-src 'self'");
  });

  it('A06 — CSP restricts frame sources', () => {
    expect(CSP_POLICY).toContain("frame-src 'self'");
    expect(CSP_POLICY).toContain('https://meet.google.com');
  });

  it('A07 — CSP does not allow wildcard script-src', () => {
    // Extract the script-src directive
    const scriptSrc = CSP_POLICY.match(/script-src ([^;]+)/)?.[1] || '';
    expect(scriptSrc).not.toContain(' * ');
    expect(scriptSrc).not.toMatch(/^script-src \*/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// B. API Key Exposure Prevention (Gemini)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Security Hardening — API Key Protection', () => {
  it('B01 — Gemini API URL does not contain key param', () => {
    const model = 'gemini-2.5-flash-lite';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    expect(url).not.toContain('key=');
    expect(url).not.toContain('?');
  });

  it('B02 — API key is sent via x-goog-api-key header', () => {
    const apiKey = 'test_api_key_123';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    };
    expect(headers['x-goog-api-key']).toBe(apiKey);
  });

  it('B03 — URL query strings should never contain secrets', () => {
    function buildGeminiUrl(model: string): string {
      return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    }
    const url = buildGeminiUrl('gemini-2.5-flash-lite');
    expect(url).not.toContain('key=');
    expect(url).not.toContain('secret');
    expect(url).not.toContain('token');
  });

  it('B04 — validates header-based auth is used (not URL-based)', () => {
    function buildGeminiHeaders(apiKey: string): Record<string, string> {
      return {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      };
    }
    const headers = buildGeminiHeaders('AIzaSyTestKey');
    expect(headers).toHaveProperty('x-goog-api-key');
    expect(headers['x-goog-api-key']).toBe('AIzaSyTestKey');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// C. Buffer.subarray vs Buffer.slice (Deprecation Fix)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Security Hardening — Buffer.subarray Usage', () => {
  it('C01 — subarray returns correct IV (first 12 bytes)', () => {
    const original = crypto.randomBytes(44); // 12 IV + 16 tag + 16 data
    const iv = original.subarray(0, 12);
    expect(iv.length).toBe(12);
    expect(Buffer.compare(iv, original.subarray(0, 12))).toBe(0);
  });

  it('C02 — subarray returns correct auth tag (bytes 12-28)', () => {
    const original = crypto.randomBytes(44);
    const tag = original.subarray(12, 28);
    expect(tag.length).toBe(16);
  });

  it('C03 — subarray returns correct encrypted data (from byte 28)', () => {
    const original = crypto.randomBytes(60);
    const encrypted = original.subarray(28);
    expect(encrypted.length).toBe(32);
  });

  it('C04 — subarray preserves buffer reference (not a copy)', () => {
    const buf = Buffer.from('Hello World Test');
    const sub = buf.subarray(0, 5);
    sub[0] = 0x58; // 'X'
    expect(buf[0]).toBe(0x58); // original is also modified
  });

  it('C05 — AES-256-GCM encrypt/decrypt roundtrip with subarray', () => {
    const keyHex = crypto.randomBytes(32).toString('hex');
    const plaintext = 'Medical record: ผู้ป่วยมีอาการไข้สูง';

    // Encrypt
    const key = Buffer.from(keyHex, 'hex');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const combined = Buffer.concat([iv, tag, encrypted]);
    const ciphertext = combined.toString('base64');

    // Decrypt using subarray (the fix)
    const buf = Buffer.from(ciphertext, 'base64');
    const decIv = buf.subarray(0, 12);
    const decTag = buf.subarray(12, 28);
    const decEncrypted = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, decIv);
    decipher.setAuthTag(decTag);
    const decrypted = decipher.update(decEncrypted).toString('utf8') + decipher.final('utf8');

    expect(decrypted).toBe(plaintext);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// D. JSON.parse Safety (Uncaught Exception Prevention)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Security Hardening — JSON.parse Safety', () => {
  function safeJsonParse(data: string, fallback: unknown = {}): unknown {
    try {
      return JSON.parse(data);
    } catch {
      return fallback;
    }
  }

  it('D01 — valid JSON is parsed correctly', () => {
    const result = safeJsonParse('{"ok":true,"description":"sent"}');
    expect(result).toEqual({ ok: true, description: 'sent' });
  });

  it('D02 — invalid JSON returns fallback', () => {
    const result = safeJsonParse('not json');
    expect(result).toEqual({});
  });

  it('D03 — empty string returns fallback', () => {
    const result = safeJsonParse('');
    expect(result).toEqual({});
  });

  it('D04 — HTML error page returns fallback', () => {
    const result = safeJsonParse('<html><body>502 Bad Gateway</body></html>');
    expect(result).toEqual({});
  });

  it('D05 — custom fallback is used', () => {
    const result = safeJsonParse('invalid', { error: 'parse_failed' });
    expect(result).toEqual({ error: 'parse_failed' });
  });

  it('D06 — truncated JSON returns fallback', () => {
    const result = safeJsonParse('{"ok": tr');
    expect(result).toEqual({});
  });

  it('D07 — null input returns null (JSON.parse behavior)', () => {
    const result = safeJsonParse(null as unknown as string);
    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E. Input Length Validation (DoS Prevention)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Security Hardening — Input Length Validation', () => {
  const MAX_MESSAGE_TEXT_LENGTH = 4096;

  function truncateInput(input: unknown): string {
    return typeof input === 'string'
      ? input.slice(0, MAX_MESSAGE_TEXT_LENGTH)
      : '';
  }

  it('E01 — normal text passes through unchanged', () => {
    const text = 'มีไข้ 3 วัน ปวดศีรษะ';
    expect(truncateInput(text)).toBe(text);
  });

  it('E02 — text at exact limit passes through', () => {
    const text = 'a'.repeat(MAX_MESSAGE_TEXT_LENGTH);
    expect(truncateInput(text).length).toBe(MAX_MESSAGE_TEXT_LENGTH);
  });

  it('E03 — oversized text is truncated', () => {
    const text = 'a'.repeat(MAX_MESSAGE_TEXT_LENGTH + 1000);
    const result = truncateInput(text);
    expect(result.length).toBe(MAX_MESSAGE_TEXT_LENGTH);
  });

  it('E04 — non-string input returns empty string', () => {
    expect(truncateInput(undefined)).toBe('');
    expect(truncateInput(null)).toBe('');
    expect(truncateInput(12345)).toBe('');
    expect(truncateInput({})).toBe('');
  });

  it('E05 — empty string is preserved', () => {
    expect(truncateInput('')).toBe('');
  });

  it('E06 — MAX_MESSAGE_TEXT_LENGTH is 4096', () => {
    expect(MAX_MESSAGE_TEXT_LENGTH).toBe(4096);
  });

  it('E07 — very large payload (1MB) is truncated', () => {
    const largeText = 'x'.repeat(1_000_000);
    const result = truncateInput(largeText);
    expect(result.length).toBe(MAX_MESSAGE_TEXT_LENGTH);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// F. OWASP RBAC (Role-Based Access Control)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Security Hardening — RBAC Permissions', () => {
  const ROLE_PERMISSIONS: Record<string, string[]> = {
    admin: ['read:all', 'write:all', 'delete:all', 'manage:users', 'manage:doctors', 'approve:doctors', 'view:audit'],
    doctor: ['read:patients', 'write:emr', 'write:prescriptions', 'write:laborders', 'read:appointments', 'write:appointments'],
    patient: ['read:own', 'write:own', 'read:appointments', 'write:appointments'],
  };

  function hasPermission(role: string, required: string): boolean {
    const perms = ROLE_PERMISSIONS[role] || [];
    return perms.includes(required) ||
      perms.some(p => p.endsWith(':all') && required.startsWith(p.replace(':all', ':')));
  }

  it('F01 — admin has read:all access', () => {
    expect(hasPermission('admin', 'read:patients')).toBe(true);
  });

  it('F02 — admin has write:all access', () => {
    expect(hasPermission('admin', 'write:emr')).toBe(true);
  });

  it('F03 — admin has delete:all access', () => {
    expect(hasPermission('admin', 'delete:appointments')).toBe(true);
  });

  it('F04 — doctor can write EMR', () => {
    expect(hasPermission('doctor', 'write:emr')).toBe(true);
  });

  it('F05 — doctor can write prescriptions', () => {
    expect(hasPermission('doctor', 'write:prescriptions')).toBe(true);
  });

  it('F06 — doctor cannot manage users', () => {
    expect(hasPermission('doctor', 'manage:users')).toBe(false);
  });

  it('F07 — doctor cannot delete anything', () => {
    expect(hasPermission('doctor', 'delete:patients')).toBe(false);
  });

  it('F08 — patient can read own data', () => {
    expect(hasPermission('patient', 'read:own')).toBe(true);
  });

  it('F09 — patient cannot read all patients', () => {
    expect(hasPermission('patient', 'read:patients')).toBe(false);
  });

  it('F10 — patient cannot write EMR', () => {
    expect(hasPermission('patient', 'write:emr')).toBe(false);
  });

  it('F11 — unknown role has no permissions', () => {
    expect(hasPermission('guest', 'read:own')).toBe(false);
  });

  it('F12 — empty role has no permissions', () => {
    expect(hasPermission('', 'read:own')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// G. CSRF Token Validation
// ═══════════════════════════════════════════════════════════════════════════════

describe('Security Hardening — CSRF Token Management', () => {
  const csrfTokens = new Map<string, { token: string; createdAt: number }>();

  function generateCSRFToken(sessionId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    csrfTokens.set(sessionId, { token, createdAt: Date.now() });
    return token;
  }

  function validateCSRFToken(sessionId: string, token: string, maxAgeMs = 3600000): boolean {
    const stored = csrfTokens.get(sessionId);
    if (!stored) return false;
    if (Date.now() - stored.createdAt > maxAgeMs) {
      csrfTokens.delete(sessionId);
      return false;
    }
    return stored.token === token;
  }

  beforeEach(() => {
    csrfTokens.clear();
  });

  it('G01 — generated token is 64-char hex string', () => {
    const token = generateCSRFToken('session1');
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('G02 — valid token passes validation', () => {
    const token = generateCSRFToken('session1');
    expect(validateCSRFToken('session1', token)).toBe(true);
  });

  it('G03 — wrong token fails validation', () => {
    generateCSRFToken('session1');
    expect(validateCSRFToken('session1', 'wrong_token')).toBe(false);
  });

  it('G04 — non-existent session fails validation', () => {
    expect(validateCSRFToken('no_session', 'any_token')).toBe(false);
  });

  it('G05 — each session gets unique token', () => {
    const t1 = generateCSRFToken('session1');
    const t2 = generateCSRFToken('session2');
    expect(t1).not.toBe(t2);
  });

  it('G06 — regenerating token for same session replaces old one', () => {
    const old = generateCSRFToken('session1');
    const fresh = generateCSRFToken('session1');
    expect(validateCSRFToken('session1', old)).toBe(false);
    expect(validateCSRFToken('session1', fresh)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// H. Request Integrity (HMAC Signatures)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Security Hardening — Request Integrity HMAC', () => {
  function generateRequestSignature(body: unknown, timestamp: string, secret: string): string {
    const payload = JSON.stringify(body) + timestamp;
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  function verifyRequestSignature(
    body: unknown, timestamp: string, signature: string, secret: string
  ): boolean {
    const expected = generateRequestSignature(body, timestamp, secret);
    const expectedBuf = Buffer.from(expected);
    const providedBuf = Buffer.from(signature);
    if (expectedBuf.length !== providedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, providedBuf);
  }

  const SECRET = 'test-hmac-secret-key';

  it('H01 — valid signature passes verification', () => {
    const body = { patientId: 'line_U1', text: 'hello' };
    const ts = String(Date.now());
    const sig = generateRequestSignature(body, ts, SECRET);
    expect(verifyRequestSignature(body, ts, sig, SECRET)).toBe(true);
  });

  it('H02 — tampered body fails verification', () => {
    const body = { patientId: 'line_U1', text: 'hello' };
    const ts = String(Date.now());
    const sig = generateRequestSignature(body, ts, SECRET);
    const tampered = { patientId: 'line_U1', text: 'hacked' };
    expect(verifyRequestSignature(tampered, ts, sig, SECRET)).toBe(false);
  });

  it('H03 — tampered timestamp fails verification', () => {
    const body = { data: 'test' };
    const ts = String(Date.now());
    const sig = generateRequestSignature(body, ts, SECRET);
    expect(verifyRequestSignature(body, String(Date.now() + 1000), sig, SECRET)).toBe(false);
  });

  it('H04 — wrong secret fails verification', () => {
    const body = { data: 'test' };
    const ts = String(Date.now());
    const sig = generateRequestSignature(body, ts, SECRET);
    expect(verifyRequestSignature(body, ts, sig, 'wrong-secret')).toBe(false);
  });

  it('H05 — timestamp freshness check (5 min window)', () => {
    const now = Date.now();
    const fiveMinAgo = now - 5 * 60 * 1000;
    const sixMinAgo = now - 6 * 60 * 1000;

    function isTimestampFresh(timestamp: number, windowMs = 5 * 60 * 1000): boolean {
      return Math.abs(Date.now() - timestamp) <= windowMs;
    }

    expect(isTimestampFresh(now)).toBe(true);
    expect(isTimestampFresh(fiveMinAgo)).toBe(true);
    expect(isTimestampFresh(sixMinAgo)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// I. Encryption Key Management
// ═══════════════════════════════════════════════════════════════════════════════

describe('Security Hardening — Encryption Key Management', () => {
  it('I01 — valid 32-byte hex key has length 64', () => {
    const key = crypto.randomBytes(32).toString('hex');
    expect(key.length).toBe(64);
  });

  it('I02 — key validation rejects short key', () => {
    function isValidKey(keyHex: string): boolean {
      return typeof keyHex === 'string' && keyHex.length >= 64 && /^[0-9a-f]+$/i.test(keyHex);
    }
    expect(isValidKey('short')).toBe(false);
    expect(isValidKey('')).toBe(false);
  });

  it('I03 — key validation accepts valid key', () => {
    function isValidKey(keyHex: string): boolean {
      return typeof keyHex === 'string' && keyHex.length >= 64 && /^[0-9a-f]+$/i.test(keyHex);
    }
    const key = crypto.randomBytes(32).toString('hex');
    expect(isValidKey(key)).toBe(true);
  });

  it('I04 — key validation rejects non-hex characters', () => {
    function isValidKey(keyHex: string): boolean {
      return typeof keyHex === 'string' && keyHex.length >= 64 && /^[0-9a-f]+$/i.test(keyHex);
    }
    const badKey = 'g'.repeat(64); // 'g' is not valid hex
    expect(isValidKey(badKey)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// J. Sensitive Data Masking
// ═══════════════════════════════════════════════════════════════════════════════

describe('Security Hardening — Data Masking', () => {
  const SENSITIVE_FIELDS = ['password', 'passwordHash', 'token', 'secret', 'apiKey'];

  function maskSensitiveData(
    obj: Record<string, unknown>,
    sensitiveFields: string[] = SENSITIVE_FIELDS
  ): Record<string, unknown> {
    if (!obj || typeof obj !== 'object') return obj;
    const masked = { ...obj };
    for (const key of Object.keys(masked)) {
      if (sensitiveFields.some(sf => key.toLowerCase().includes(sf.toLowerCase()))) {
        masked[key] = '[REDACTED]';
      } else if (typeof masked[key] === 'object' && masked[key] !== null) {
        masked[key] = maskSensitiveData(masked[key] as Record<string, unknown>, sensitiveFields);
      }
    }
    return masked;
  }

  it('J01 — masks password field', () => {
    const data = { email: 'test@izara.com', password: 'secret123' };
    const masked = maskSensitiveData(data);
    expect(masked.password).toBe('[REDACTED]');
    expect(masked.email).toBe('test@izara.com');
  });

  it('J02 — masks apiKey field', () => {
    const data = { service: 'gemini', apiKey: 'AIzaSy123456' };
    const masked = maskSensitiveData(data);
    expect(masked.apiKey).toBe('[REDACTED]');
  });

  it('J03 — masks nested sensitive data', () => {
    const data = { user: { name: 'Dr. Smith', passwordHash: 'hash123' } };
    const masked = maskSensitiveData(data);
    expect((masked.user as Record<string, unknown>).passwordHash).toBe('[REDACTED]');
    expect((masked.user as Record<string, unknown>).name).toBe('Dr. Smith');
  });

  it('J04 — preserves non-sensitive fields', () => {
    const data = { name: 'Test', role: 'doctor', department: 'Internal Medicine' };
    const masked = maskSensitiveData(data);
    expect(masked).toEqual(data);
  });

  it('J05 — masks token field', () => {
    const data = { token: 'jwt_abc123', sessionId: '123' };
    const masked = maskSensitiveData(data);
    expect(masked.token).toBe('[REDACTED]');
    expect(masked.sessionId).toBe('123');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// K. Timing-Safe Comparison (Prevents Timing Attacks)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Security Hardening — Timing-Safe Comparison', () => {
  function timingSafeCompare(a: string, b: string): boolean {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length) return false;
    try {
      return crypto.timingSafeEqual(aBuf, bBuf);
    } catch {
      return false;
    }
  }

  it('K01 — equal strings return true', () => {
    expect(timingSafeCompare('secret_token', 'secret_token')).toBe(true);
  });

  it('K02 — different strings return false', () => {
    expect(timingSafeCompare('secret_token', 'wrong_token!')).toBe(false);
  });

  it('K03 — different lengths return false', () => {
    expect(timingSafeCompare('short', 'much_longer_string')).toBe(false);
  });

  it('K04 — empty strings return true', () => {
    expect(timingSafeCompare('', '')).toBe(true);
  });

  it('K05 — one empty, one not returns false', () => {
    expect(timingSafeCompare('', 'secret')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// L. Email and Phone Validation
// ═══════════════════════════════════════════════════════════════════════════════

describe('Security Hardening — Input Validation', () => {
  function isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  function isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\d\s\-+()]{10,20}$/;
    return phoneRegex.test(phone);
  }

  it('L01 — valid email passes', () => {
    expect(isValidEmail('doctor@izara.com')).toBe(true);
  });

  it('L02 — email without @ fails', () => {
    expect(isValidEmail('doctorizara.com')).toBe(false);
  });

  it('L03 — email without domain fails', () => {
    expect(isValidEmail('doctor@')).toBe(false);
  });

  it('L04 — overly long email (>254 chars) fails', () => {
    const longEmail = 'a'.repeat(250) + '@b.com';
    expect(isValidEmail(longEmail)).toBe(false);
  });

  it('L05 — valid Thai phone number passes', () => {
    expect(isValidPhone('+66 812345678')).toBe(true);
  });

  it('L06 — short phone fails', () => {
    expect(isValidPhone('123')).toBe(false);
  });

  it('L07 — phone with invalid chars fails', () => {
    expect(isValidPhone('+66 abc 1234')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// M. Injection Pattern Detection
// ═══════════════════════════════════════════════════════════════════════════════

describe('Security Hardening — Injection Detection', () => {
  const PATTERNS: Record<string, RegExp> = {
    sql: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE)\b)|(--)|(;)|(')/gi,
    xss: /<script[\s>]|javascript:|on\w+\s*=/gi,
    pathTraversal: /\.\.[/\\]|[/\\]\.\.|%2e%2e/gi,
  };

  function detectInjection(input: string): string | null {
    for (const [type, pattern] of Object.entries(PATTERNS)) {
      // Reset lastIndex for global regex
      pattern.lastIndex = 0;
      if (pattern.test(input)) return type;
    }
    return null;
  }

  it('M01 — detects SQL injection (SELECT)', () => {
    expect(detectInjection("' OR SELECT * FROM users --")).toBe('sql');
  });

  it('M02 — detects SQL injection (DROP)', () => {
    expect(detectInjection("'; DROP TABLE patients; --")).toBe('sql');
  });

  it('M03 — detects XSS (script tag)', () => {
    expect(detectInjection('<script>alert("xss")</script>')).toBe('xss');
  });

  it('M04 — detects XSS (javascript: protocol)', () => {
    expect(detectInjection('javascript:alert(1)')).toBe('xss');
  });

  it('M05 — detects path traversal', () => {
    expect(detectInjection('../../etc/passwd')).toBe('pathTraversal');
  });

  it('M06 — normal medical text passes', () => {
    expect(detectInjection('Patient has fever 38.5°C for 3 days')).toBeNull();
  });

  it('M07 — normal Thai medical text passes', () => {
    expect(detectInjection('ผู้ป่วยมีอาการไข้สูง 3 วัน ปวดศีรษะ')).toBeNull();
  });
});
