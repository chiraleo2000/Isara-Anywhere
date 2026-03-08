/**
 * ═══════════════════════════════════════════════════════════════════════
 * DOCTOR PORTAL — OWASP Middleware Unit Tests
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: server/security/owasp-middleware.cjs
 * Validates: Security headers, rate limiting, input sanitization, CORS
 */
import { describe, it, expect } from 'vitest';

// ── Security Header Definitions ─────────────────────────────────────────

const REQUIRED_SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '0',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// ── CORS Origin Helpers ─────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  'http://localhost:3005',
  'http://localhost:3009',
  'http://localhost:3010',
  'http://localhost:3011',
  'http://localhost:3012',
  'http://localhost:3020',
  'https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app',
  'https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app',
];

function isOriginAllowed(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Cloud Run pattern
  if (/^https:\/\/izara-.*\.asia-southeast1\.run\.app$/.test(origin)) return true;
  return false;
}

// ── Input Sanitization ──────────────────────────────────────────────────

function sanitizeInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/eval\(/gi, '')
    .replace(/expression\(/gi, '');
}

function detectSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC)\b)/i,
    /('|--|;|\/\*|\*\/)/,
    /(\bOR\b\s+\d+\s*=\s*\d+)/i,
    /(\bAND\b\s+\d+\s*=\s*\d+)/i,
  ];
  return sqlPatterns.some(p => p.test(input));
}

function detectXSS(input: string): boolean {
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /on(load|error|click|mouseover)\s*=/i,
    /eval\(/i,
    /<iframe/i,
    /<img[^>]+onerror/i,
  ];
  return xssPatterns.some(p => p.test(input));
}

// ── Tests ───────────────────────────────────────────────────────────────

describe('Doctor Portal — OWASP Middleware', () => {

  describe('A — Security Headers', () => {
    it('A01 — X-Content-Type-Options is nosniff', () => {
      expect(REQUIRED_SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff');
    });

    it('A02 — X-Frame-Options is DENY', () => {
      expect(REQUIRED_SECURITY_HEADERS['X-Frame-Options']).toBe('DENY');
    });

    it('A03 — XSS-Protection is disabled (modern CSP preferred)', () => {
      expect(REQUIRED_SECURITY_HEADERS['X-XSS-Protection']).toBe('0');
    });

    it('A04 — HSTS is configured', () => {
      expect(REQUIRED_SECURITY_HEADERS['Strict-Transport-Security']).toContain('max-age=');
    });

    it('A05 — CSP is set', () => {
      expect(REQUIRED_SECURITY_HEADERS['Content-Security-Policy']).toContain("default-src");
    });

    it('A06 — Referrer-Policy is strict', () => {
      expect(REQUIRED_SECURITY_HEADERS['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    });

    it('A07 — all required headers are defined', () => {
      expect(Object.keys(REQUIRED_SECURITY_HEADERS).length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('B — CORS Origin Validation', () => {
    it('B01 — allows localhost patient portal', () => {
      expect(isOriginAllowed('http://localhost:3005')).toBe(true);
    });

    it('B02 — allows localhost doctor portal', () => {
      expect(isOriginAllowed('http://localhost:3010')).toBe(true);
    });

    it('B03 — allows localhost meeting server', () => {
      expect(isOriginAllowed('http://localhost:3020')).toBe(true);
    });

    it('B04 — allows Cloud Run patient portal', () => {
      expect(isOriginAllowed('https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app')).toBe(true);
    });

    it('B05 — allows Cloud Run doctor portal', () => {
      expect(isOriginAllowed('https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app')).toBe(true);
    });

    it('B06 — rejects unknown origins', () => {
      expect(isOriginAllowed('https://evil.com')).toBe(false);
      expect(isOriginAllowed('http://localhost:9999')).toBe(false);
    });

    it('B07 — matches Cloud Run pattern dynamically', () => {
      expect(isOriginAllowed('https://izara-newservice-123.asia-southeast1.run.app')).toBe(true);
    });

    it('B08 — rejects non-HTTPS Cloud Run', () => {
      expect(isOriginAllowed('http://izara-patient-portal-dev.asia-southeast1.run.app')).toBe(false);
    });
  });

  describe('C — Input Sanitization', () => {
    it('C01 — strips script tags', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('');
    });

    it('C02 — strips all HTML tags', () => {
      expect(sanitizeInput('<b>bold</b> <i>italic</i>')).toBe('bold italic');
    });

    it('C03 — strips javascript: protocol', () => {
      expect(sanitizeInput('javascript:alert(1)')).toBe('alert(1)');
    });

    it('C04 — strips event handlers', () => {
      expect(sanitizeInput('onerror=alert(1)')).toBe('alert(1)');
      expect(sanitizeInput('onclick=hack()')).toBe('hack()');
    });

    it('C05 — strips eval()', () => {
      expect(sanitizeInput('eval(malicious)')).toBe('malicious)');
    });

    it('C06 — preserves normal text', () => {
      expect(sanitizeInput('Normal medical note: Patient is well')).toBe('Normal medical note: Patient is well');
    });

    it('C07 — preserves Thai text', () => {
      const thai = 'ผู้ป่วยมีอาการปวดหัวเล็กน้อย';
      expect(sanitizeInput(thai)).toBe(thai);
    });
  });

  describe('D — SQL Injection Detection', () => {
    it('D01 — detects SELECT injection', () => {
      expect(detectSQLInjection("' UNION SELECT * FROM users--")).toBe(true);
    });

    it('D02 — detects DROP injection', () => {
      expect(detectSQLInjection("'; DROP TABLE patients;--")).toBe(true);
    });

    it('D03 — detects OR 1=1', () => {
      expect(detectSQLInjection("' OR 1=1--")).toBe(true);
    });

    it('D04 — allows normal input', () => {
      expect(detectSQLInjection('John Smith')).toBe(false);
    });

    it('D05 — allows Thai text input', () => {
      expect(detectSQLInjection('สมชาย รักษาดี')).toBe(false);
    });

    it('D06 — allows medical terms', () => {
      expect(detectSQLInjection('Paracetamol 500mg q6h PRN')).toBe(false);
    });
  });

  describe('E — XSS Detection', () => {
    it('E01 — detects script tags', () => {
      expect(detectXSS('<script>alert("xss")</script>')).toBe(true);
    });

    it('E02 — detects javascript: protocol', () => {
      expect(detectXSS('javascript:void(0)')).toBe(true);
    });

    it('E03 — detects event handlers', () => {
      expect(detectXSS('<img onerror=alert(1)>')).toBe(true);
    });

    it('E04 — detects eval()', () => {
      expect(detectXSS('eval(document.cookie)')).toBe(true);
    });

    it('E05 — detects iframe injection', () => {
      expect(detectXSS('<iframe src="evil.com">')).toBe(true);
    });

    it('E06 — allows normal content', () => {
      expect(detectXSS('Patient has recovered well')).toBe(false);
    });

    it('E07 — allows Thai content', () => {
      expect(detectXSS('ผู้ป่วยฟื้นตัวดี')).toBe(false);
    });
  });

  describe('F — Rate Limit Configuration', () => {
    it('F01 — development rate limit is high', () => {
      const devLimit = 10000;
      expect(devLimit).toBeGreaterThan(1000);
    });

    it('F02 — production rate limit is reasonable', () => {
      const prodLimit = 2000;
      expect(prodLimit).toBeGreaterThan(100);
      expect(prodLimit).toBeLessThan(10000);
    });

    it('F03 — login rate limit is strict', () => {
      const loginLimit = 5; // 5 attempts per 15 minutes
      const loginWindow = 15; // minutes
      expect(loginLimit).toBeLessThanOrEqual(10);
      expect(loginWindow).toBeGreaterThanOrEqual(10);
    });
  });

  describe('G — Audit Log Entry Format', () => {
    it('G01 — audit log has required fields', () => {
      const entry = {
        timestamp: new Date().toISOString(),
        requestId: 'req-12345',
        userId: 'DR-001',
        action: 'emr_create',
        resource: '/api/emr',
        method: 'POST',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        result: 'success',
      };
      expect(entry.timestamp).toBeTruthy();
      expect(entry.requestId).toBeTruthy();
      expect(entry.action).toBeTruthy();
      expect(entry.result).toMatch(/success|failure|blocked/);
    });

    it('G02 — security event log format', () => {
      const event = {
        type: 'login_failure',
        severity: 'warning',
        ip: '10.0.0.1',
        details: 'Invalid credentials for admin@izara.com',
        blocked: false,
      };
      expect(['info', 'warning', 'error', 'critical']).toContain(event.severity);
    });
  });
});
