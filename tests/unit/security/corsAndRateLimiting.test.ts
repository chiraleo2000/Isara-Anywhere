/**
 * ═══════════════════════════════════════════════════════════════════════
 * SECURITY — CORS & Rate Limiting Unit Tests
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: CORS validation, rate limit configuration, input sanitization
 */
import { describe, it, expect } from 'vitest';

// ── CORS Logic ──────────────────────────────────────────────────────────

const LOCALHOST_PORTS = [3000, 3001, 3004, 3005, 3009, 3010, 3011, 3012, 3020, 5173];
const CLOUD_RUN_PATTERN = /^https:\/\/.*\.run\.app$/;

function buildCorsWhitelist(): string[] {
  return LOCALHOST_PORTS.map(p => `http://localhost:${p}`);
}

function isAllowedOrigin(origin: string): boolean {
  const whitelist = buildCorsWhitelist();
  if (whitelist.includes(origin)) return true;
  if (CLOUD_RUN_PATTERN.test(origin)) return true;
  return false;
}

// ── Rate Limit Config ───────────────────────────────────────────────────

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  general_dev: { windowMs: 15 * 60 * 1000, maxRequests: 10000 },
  general_prod: { windowMs: 15 * 60 * 1000, maxRequests: 2000 },
  login: { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  api: { windowMs: 15 * 60 * 1000, maxRequests: 500 },
};

// ── Input Sanitization ──────────────────────────────────────────────────

function sanitizeInput(input: string): string {
  let clean = input;
  clean = clean.replaceAll(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replaceAll(/<[^>]*>/g, '');
  clean = clean.replaceAll(/javascript:/gi, '');
  clean = clean.replaceAll(/on\w+=/gi, '');
  clean = clean.replaceAll(/eval\s*\(/gi, '');
  return clean.trim();
}

function detectSQLInjection(input: string): boolean {
  const patterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|UNION)\b.*\b(FROM|INTO|SET|TABLE|WHERE|ALL)\b)/i,
    /(\bOR\b\s+\d+\s*=\s*\d+)/i,
    /(\bAND\b\s+\d+\s*=\s*\d+)/i,
    /(--|;|\/\*|\*\/)/,
    /('\s*OR\s*')/i,
  ];
  return patterns.some(p => p.test(input));
}

function detectXSS(input: string): boolean {
  const patterns = [
    /<script\b/i,
    /javascript:/i,
    /on(error|load|click|mouseover|focus)=/i,
    /<iframe/i,
    /<img[^>]+onerror/i,
  ];
  return patterns.some(p => p.test(input));
}

// ── Security Headers ────────────────────────────────────────────────────

const REQUIRED_HEADERS = [
  'X-Content-Type-Options',
  'X-Frame-Options',
  'X-XSS-Protection',
  'Strict-Transport-Security',
  'Content-Security-Policy',
  'Referrer-Policy',
  'Permissions-Policy',
];

// ── Tests ────────────────────────────────────────────────────────────────

describe('Security — CORS & Rate Limiting', () => {

  describe('A — CORS Whitelist', () => {
    it('A01 — patient portal origin allowed', () => {
      expect(isAllowedOrigin('http://localhost:3005')).toBe(true);
    });

    it('A02 — doctor portal origin allowed', () => {
      expect(isAllowedOrigin('http://localhost:3010')).toBe(true);
    });

    it('A03 — meeting server origin allowed', () => {
      expect(isAllowedOrigin('http://localhost:3020')).toBe(true);
    });

    it('A04 — vite dev server allowed', () => {
      expect(isAllowedOrigin('http://localhost:5173')).toBe(true);
    });

    it('A05 — Cloud Run origins allowed', () => {
      expect(isAllowedOrigin('https://issara-patient-dev.run.app')).toBe(true);
    });

    it('A06 — random origin blocked', () => {
      expect(isAllowedOrigin('https://evil.com')).toBe(false);
    });
  });

  describe('B — Rate Limits', () => {
    it('B01 — dev allows 10k requests', () => {
      expect(RATE_LIMITS.general_dev.maxRequests).toBe(10000);
    });

    it('B02 — prod allows 2k requests', () => {
      expect(RATE_LIMITS.general_prod.maxRequests).toBe(2000);
    });

    it('B03 — login limited to 5 attempts', () => {
      expect(RATE_LIMITS.login.maxRequests).toBe(5);
    });

    it('B04 — all windows are 15 minutes', () => {
      for (const config of Object.values(RATE_LIMITS)) {
        expect(config.windowMs).toBe(15 * 60 * 1000);
      }
    });
  });

  describe('C — Input Sanitization', () => {
    it('C01 — strips script tags', () => {
      const result = sanitizeInput('<script>alert("xss")</script>hello');
      expect(result).not.toContain('<script');
      expect(result).toContain('hello');
    });

    it('C02 — strips HTML tags', () => {
      const result = sanitizeInput('<div>Hello</div>');
      expect(result).not.toContain('<div');
      expect(result).toContain('Hello');
    });

    it('C03 — strips javascript: protocol', () => {
      const result = sanitizeInput('javascript:alert(1)');
      expect(result).not.toContain('javascript:');
    });

    it('C04 — strips event handlers', () => {
      const result = sanitizeInput('onerror=alert(1)');
      expect(result).not.toContain('onerror=');
    });

    it('C05 — preserves Thai text', () => {
      const result = sanitizeInput('สวัสดีครับ ผู้ป่วยชื่อสมชาย');
      expect(result).toBe('สวัสดีครับ ผู้ป่วยชื่อสมชาย');
    });

    it('C06 — preserves normal medical text', () => {
      const result = sanitizeInput('Blood pressure 120/80 mmHg, temperature 36.5°C');
      expect(result).toContain('120/80');
      expect(result).toContain('36.5°C');
    });
  });

  describe('D — SQL Injection Detection', () => {
    it('D01 — detects SELECT FROM', () => {
      expect(detectSQLInjection("' OR SELECT * FROM users --")).toBe(true);
    });

    it('D02 — detects DROP TABLE', () => {
      expect(detectSQLInjection("'; DROP TABLE users;")).toBe(true);
    });

    it('D03 — detects OR 1=1', () => {
      expect(detectSQLInjection("' OR 1=1 --")).toBe(true);
    });

    it('D04 — allows normal input', () => {
      expect(detectSQLInjection('John Smith')).toBe(false);
    });

    it('D05 — allows Thai text', () => {
      expect(detectSQLInjection('สมชาย ทดสอบ')).toBe(false);
    });

    it('D06 — allows medical text', () => {
      expect(detectSQLInjection('Metformin 500mg twice daily')).toBe(false);
    });
  });

  describe('E — XSS Detection', () => {
    it('E01 — detects script tag', () => {
      expect(detectXSS('<script>alert(1)</script>')).toBe(true);
    });

    it('E02 — detects javascript: protocol', () => {
      expect(detectXSS('javascript:alert(document.cookie)')).toBe(true);
    });

    it('E03 — detects event handler', () => {
      expect(detectXSS('<img onerror=alert(1) src=x>')).toBe(true);
    });

    it('E04 — detects iframe', () => {
      expect(detectXSS('<iframe src="evil.com">')).toBe(true);
    });

    it('E05 — allows normal text', () => {
      expect(detectXSS('Hello world')).toBe(false);
    });

    it('E06 — allows Thai text', () => {
      expect(detectXSS('ปวดหัวมาก 3 วัน')).toBe(false);
    });
  });

  describe('F — Security Headers', () => {
    it('F01 — 7 required headers', () => {
      expect(REQUIRED_HEADERS).toHaveLength(7);
    });

    it('F02 — X-Content-Type-Options', () => {
      expect(REQUIRED_HEADERS).toContain('X-Content-Type-Options');
    });

    it('F03 — X-Frame-Options', () => {
      expect(REQUIRED_HEADERS).toContain('X-Frame-Options');
    });

    it('F04 — HSTS', () => {
      expect(REQUIRED_HEADERS).toContain('Strict-Transport-Security');
    });

    it('F05 — CSP', () => {
      expect(REQUIRED_HEADERS).toContain('Content-Security-Policy');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// G. Sequential Middleware Pipeline (Step-by-Step)
// ═══════════════════════════════════════════════════════════════════════
// Simulates a full request flowing through CORS → Rate Limit → Sanitize → Validate → Accept/Reject

class InlineRateLimiter {
  private readonly store = new Map<string, { count: number; resetAt: number }>();
  constructor(private readonly maxReqs: number, private readonly windowMs: number) {}

  attempt(key: string): boolean {
    const now = Date.now();
    const entry = this.store.get(key);
    if (!entry || now >= entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    if (entry.count >= this.maxReqs) return false;
    entry.count++;
    return true;
  }
}

interface PipelineResult {
  allowed: boolean;
  stage: 'cors' | 'rate-limit' | 'sanitize' | 'validate' | 'accepted';
  reason?: string;
  sanitizedBody?: string;
}

function processRequest(origin: string, ip: string, body: string, limiter: InlineRateLimiter): PipelineResult {
  // Stage 1: CORS
  if (!isAllowedOrigin(origin)) {
    return { allowed: false, stage: 'cors', reason: `Origin rejected: ${origin}` };
  }

  // Stage 2: Rate Limit
  if (!limiter.attempt(ip)) {
    return { allowed: false, stage: 'rate-limit', reason: `Rate limit exceeded for ${ip}` };
  }

  // Stage 3: Sanitize
  const sanitized = sanitizeInput(body);

  // Stage 4: Validate (SQL + XSS)
  if (detectSQLInjection(body)) {
    return { allowed: false, stage: 'validate', reason: 'SQL injection detected' };
  }
  if (detectXSS(body)) {
    return { allowed: false, stage: 'validate', reason: 'XSS detected' };
  }

  return { allowed: true, stage: 'accepted', sanitizedBody: sanitized };
}

describe('Security — Sequential Middleware Pipeline (8 Steps)', () => {
  const limiter = new InlineRateLimiter(3, 900000);

  // Shared state
  let lastResult: PipelineResult;

  // Step 1: Legitimate request passes all stages
  it('Step 1 — Legitimate request passes full pipeline', () => {
    lastResult = processRequest(
      'http://localhost:3005',
      '192.168.1.10',
      'ผู้ป่วยปวดหัว 3 วัน',
      limiter,
    );
    expect(lastResult.allowed).toBe(true);
    expect(lastResult.stage).toBe('accepted');
    expect(lastResult.sanitizedBody).toBe('ผู้ป่วยปวดหัว 3 วัน');
  });

  // Step 2: Cloud Run origin also passes
  it('Step 2 — Cloud Run origin passes CORS check', () => {
    lastResult = processRequest(
      'https://izara-patient-portal-724889190329.asia-southeast1.run.app',
      '10.0.0.1',
      'BP 120/80 mmHg',
      limiter,
    );
    expect(lastResult.allowed).toBe(true);
    expect(lastResult.stage).toBe('accepted');
  });

  // Step 3: Unknown origin rejected at CORS stage
  it('Step 3 — Unknown origin rejected at CORS stage', () => {
    lastResult = processRequest(
      'https://evil.com',
      '1.2.3.4',
      'normal text',
      limiter,
    );
    expect(lastResult.allowed).toBe(false);
    expect(lastResult.stage).toBe('cors');
    expect(lastResult.reason).toContain('evil.com');
  });

  // Step 4: SQL injection rejected at validation stage
  it('Step 4 — SQL injection rejected at validation stage', () => {
    lastResult = processRequest(
      'http://localhost:3005',
      '192.168.1.20',
      "Robert'; DROP TABLE users; --",
      limiter,
    );
    expect(lastResult.allowed).toBe(false);
    expect(lastResult.stage).toBe('validate');
    expect(lastResult.reason).toContain('SQL injection');
  });

  // Step 5: XSS rejected at validation stage
  it('Step 5 — XSS attempt rejected at validation stage', () => {
    lastResult = processRequest(
      'http://localhost:3010',
      '192.168.1.30',
      '<script>alert("xss")</script>',
      limiter,
    );
    expect(lastResult.allowed).toBe(false);
    expect(lastResult.stage).toBe('validate');
    expect(lastResult.reason).toContain('XSS');
  });

  // Step 6: Rate limit triggered after N requests from same IP
  it('Step 6 — Rate limit blocks 4th request from same IP', () => {
    const strictLimiter = new InlineRateLimiter(3, 900000);

    // First 3 pass
    for (let i = 0; i < 3; i++) {
      const r = processRequest('http://localhost:3005', '10.10.10.10', `request ${i}`, strictLimiter);
      expect(r.allowed).toBe(true);
    }

    // 4th blocked
    lastResult = processRequest('http://localhost:3005', '10.10.10.10', 'blocked request', strictLimiter);
    expect(lastResult.allowed).toBe(false);
    expect(lastResult.stage).toBe('rate-limit');
    expect(lastResult.reason).toContain('Rate limit');
  });

  // Step 7: Sanitization strips dangerous content but preserves medical text
  it('Step 7 — Sanitization preserves medical text, strips tags', () => {
    // HTML tags removed
    const withTags = sanitizeInput('<b>Important</b> <i>note</i>');
    expect(withTags).toBe('Important note');

    // Thai medical text preserved
    const thai = sanitizeInput('อุณหภูมิ 37.5°C ความดัน 120/80');
    expect(thai).toBe('อุณหภูมิ 37.5°C ความดัน 120/80');

    // Script content stripped (but text preserved)
    const withScript = sanitizeInput('<script>steal()</script>Med notes');
    expect(withScript).not.toContain('<script');
    expect(withScript).toContain('Med notes');
  });

  // Step 8: Security headers are all defined
  it('Step 8 — All 7 security headers are defined', () => {
    expect(REQUIRED_HEADERS).toHaveLength(7);

    const expectedHeaders = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
      'Strict-Transport-Security',
      'Content-Security-Policy',
      'Referrer-Policy',
      'Permissions-Policy',
    ];

    for (const header of expectedHeaders) {
      expect(REQUIRED_HEADERS, `Missing header: ${header}`).toContain(header);
    }
  });
});
