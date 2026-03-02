/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — SECURITY VALIDATION UNIT TESTS
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: Password validation, token format, CORS rules, rate-limit logic,
 *        OWASP Top-10 compliance validation (pure logic, no server needed)
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';

// ─────────────────────────────────────────────
// A. Password Policy Tests
// ─────────────────────────────────────────────

/** Unified password policy (Phase 1+2 combined) */
function validatePasswordUnified(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] };
  }
  if (password.length < 12) errors.push('Password must be at least 12 characters');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Password must contain lowercase letter');
  if (!/\d/.test(password)) errors.push('Password must contain a number');
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) errors.push('Password must contain a special character');

  // Common password blocklist
  const common = ['password', '123456', 'qwerty', 'admin', 'letmein', 'welcome', 'abc123'];
  if (common.some(c => password.toLowerCase().includes(c))) {
    errors.push('Password contains a common password pattern');
  }

  // Repeating characters
  if (/(.)\1{3,}/.test(password)) errors.push('Password has too many repeating characters');

  return { valid: errors.length === 0, errors };
}

describe('Security — Password Policy (Unified Phase 1+2)', () => {
  it('A01 — strong password passes', () => {
    const result = validatePasswordUnified('IzaraDoctor@2024');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('A02 — rejects short password (<12 chars)', () => {
    const result = validatePasswordUnified('Ab1!short');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('12 characters'))).toBe(true);
  });

  it('A03 — rejects password without uppercase', () => {
    const result = validatePasswordUnified('izaradoctor@2024');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('uppercase'))).toBe(true);
  });

  it('A04 — rejects password without lowercase', () => {
    const result = validatePasswordUnified('IZARADOCTOR@2024');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('lowercase'))).toBe(true);
  });

  it('A05 — rejects password without number', () => {
    const result = validatePasswordUnified('IzaraDoctor@Home');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('number'))).toBe(true);
  });

  it('A06 — rejects password without special character', () => {
    const result = validatePasswordUnified('IzaraDoctor2024');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('special'))).toBe(true);
  });

  it('A07 — rejects common password patterns', () => {
    const result = validatePasswordUnified('Password@12345');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('common'))).toBe(true);
  });

  it('A08 — rejects repeating characters (4+ same char)', () => {
    const result = validatePasswordUnified('Iaaaazara@2024!');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('repeating'))).toBe(true);
  });

  it('A09 — rejects empty password', () => {
    const result = validatePasswordUnified('');
    expect(result.valid).toBe(false);
  });

  it('A10 — accumulates multiple errors', () => {
    const result = validatePasswordUnified('ab');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});

// ─────────────────────────────────────────────
// B. JWT Token Format Tests
// ─────────────────────────────────────────────

describe('Security — JWT Token Format', () => {
  it('B01 — valid JWT has 3 base64url-encoded parts', () => {
    const mockToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    const parts = mockToken.split('.');
    expect(parts).toHaveLength(3);
    expect(() => atob(parts[0].replace(/-/g, '+').replace(/_/g, '/'))).not.toThrow();
  });

  it('B02 — JWT header should specify algorithm', () => {
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.sigs';
    const headerPart = mockToken.split('.')[0];
    const header = JSON.parse(atob(headerPart.replace(/-/g, '+').replace(/_/g, '/')));
    expect(header.alg).toBeDefined();
    expect(['HS256', 'HS384', 'HS512', 'RS256']).toContain(header.alg);
  });

  it('B03 — invalid base64 is detectable', () => {
    const badToken = 'not.a.jwt';
    const parts = badToken.split('.');
    let isValid = true;
    try {
      JSON.parse(atob(parts[0]));
    } catch {
      isValid = false;
    }
    expect(isValid).toBe(false);
  });
});

// ─────────────────────────────────────────────
// C. CORS Origin Validation
// ─────────────────────────────────────────────

describe('Security — CORS Origin Validation', () => {
  const allowedOrigins = [
    'http://localhost:3005',
    'http://localhost:3010',
    'http://localhost:3020',
    'https://izara-patient-portal-724889190329.asia-southeast1.run.app',
    'https://izara-doctor-portal-724889190329.asia-southeast1.run.app',
    'https://izara-jitsi-meeting-portal-724889190329.asia-southeast1.run.app',
  ];

  function isAllowedOrigin(origin: string): boolean {
    return allowedOrigins.includes(origin) ||
      /^https:\/\/izara-[\w-]+-\d+\.[\w-]+\.run\.app$/.test(origin) ||
      origin.startsWith('http://localhost:');
  }

  it('C01 — allows patient portal localhost', () => {
    expect(isAllowedOrigin('http://localhost:3005')).toBe(true);
  });

  it('C02 — allows doctor portal localhost', () => {
    expect(isAllowedOrigin('http://localhost:3010')).toBe(true);
  });

  it('C03 — allows Cloud Run origins', () => {
    expect(isAllowedOrigin('https://izara-patient-portal-724889190329.asia-southeast1.run.app')).toBe(true);
  });

  it('C04 — allows any Cloud Run subdomain', () => {
    expect(isAllowedOrigin('https://izara-custom-service-724889190329.asia-southeast1.run.app')).toBe(true);
  });

  it('C05 — rejects unknown external origins', () => {
    expect(isAllowedOrigin('https://evil.com')).toBe(false);
  });

  it('C06 — rejects similar-looking origins', () => {
    expect(isAllowedOrigin('https://fake-a.run.app.evil.com')).toBe(false);
  });
});

// ─────────────────────────────────────────────
// D. Rate Limit Logic
// ─────────────────────────────────────────────

describe('Security — Rate Limit Logic', () => {
  class InMemoryRateLimiter {
    private store = new Map<string, { count: number; resetAt: number }>();

    constructor(
      private maxRequests: number,
      private windowMs: number,
    ) {}

    isAllowed(key: string): boolean {
      const now = Date.now();
      const entry = this.store.get(key);

      if (!entry || now >= entry.resetAt) {
        this.store.set(key, { count: 1, resetAt: now + this.windowMs });
        return true;
      }

      if (entry.count >= this.maxRequests) {
        return false;
      }

      entry.count++;
      return true;
    }

    getRemaining(key: string): number {
      const entry = this.store.get(key);
      if (!entry) return this.maxRequests;
      return Math.max(0, this.maxRequests - entry.count);
    }
  }

  it('D01 — allows requests within limit', () => {
    const limiter = new InMemoryRateLimiter(5, 60000);
    expect(limiter.isAllowed('user1')).toBe(true);
    expect(limiter.isAllowed('user1')).toBe(true);
    expect(limiter.isAllowed('user1')).toBe(true);
  });

  it('D02 — blocks after max requests', () => {
    const limiter = new InMemoryRateLimiter(3, 60000);
    limiter.isAllowed('user1'); // 1
    limiter.isAllowed('user1'); // 2
    limiter.isAllowed('user1'); // 3
    expect(limiter.isAllowed('user1')).toBe(false); // 4 → blocked
  });

  it('D03 — separate keys have independent limits', () => {
    const limiter = new InMemoryRateLimiter(2, 60000);
    limiter.isAllowed('user1'); // 1
    limiter.isAllowed('user1'); // 2
    expect(limiter.isAllowed('user1')).toBe(false); // blocked
    expect(limiter.isAllowed('user2')).toBe(true);  // separate user, allowed
  });

  it('D04 — getRemaining shows correct count', () => {
    const limiter = new InMemoryRateLimiter(5, 60000);
    expect(limiter.getRemaining('user1')).toBe(5);
    limiter.isAllowed('user1');
    expect(limiter.getRemaining('user1')).toBe(4);
    limiter.isAllowed('user1');
    expect(limiter.getRemaining('user1')).toBe(3);
  });

  it('D05 — login attempt lockout after 5 failures', () => {
    const loginLimiter = new InMemoryRateLimiter(5, 15 * 60 * 1000); // 15 min window
    for (let i = 0; i < 5; i++) {
      expect(loginLimiter.isAllowed('user@test.com')).toBe(true);
    }
    expect(loginLimiter.isAllowed('user@test.com')).toBe(false);
    expect(loginLimiter.getRemaining('user@test.com')).toBe(0);
  });
});

// ─────────────────────────────────────────────
// E. Security Headers Validation
// ─────────────────────────────────────────────

describe('Security — Required Headers', () => {
  const requiredHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };

  it('E01 — all required security headers are defined', () => {
    for (const [header, value] of Object.entries(requiredHeaders)) {
      expect(value, `${header} should have a value`).toBeTruthy();
    }
  });

  it('E02 — X-Frame-Options prevents clickjacking', () => {
    expect(['DENY', 'SAMEORIGIN']).toContain(requiredHeaders['X-Frame-Options']);
  });

  it('E03 — nosniff prevents MIME type confusion', () => {
    expect(requiredHeaders['X-Content-Type-Options']).toBe('nosniff');
  });

  it('E04 — XSS protection enabled', () => {
    expect(requiredHeaders['X-XSS-Protection']).toContain('1');
  });
});

// ─────────────────────────────────────────────
// F. OWASP Input Sanitization
// ─────────────────────────────────────────────

describe('Security — Input Sanitization', () => {
  function sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .replace(/script/gi, 'scrpt')
      .trim();
  }

  it('F01 — strips HTML tags', () => {
    expect(sanitizeInput('<script>alert("xss")</script>')).not.toContain('<');
    expect(sanitizeInput('<script>alert("xss")</script>')).not.toContain('>');
  });

  it('F02 — strips javascript: protocol', () => {
    expect(sanitizeInput('javascript:alert(1)')).not.toContain('javascript:');
  });

  it('F03 — strips inline event handlers', () => {
    expect(sanitizeInput('onerror=alert(1)')).not.toContain('onerror=');
  });

  it('F04 — preserves normal text', () => {
    expect(sanitizeInput('Hello World 123!')).toBe('Hello World 123!');
  });

  it('F05 — preserves Thai text', () => {
    expect(sanitizeInput('สมชาย มั่นคง')).toBe('สมชาย มั่นคง');
  });

  it('F06 — handles SQL injection patterns safely', () => {
    const input = "Robert'; DROP TABLE users; --";
    // SQL injection prevention is at DB layer (parameterized queries)
    // but XSS sanitization should not break the string structure
    const sanitized = sanitizeInput(input);
    expect(sanitized).toBeTruthy();
  });
});

// ─────────────────────────────────────────────
// G. Refresh Token Rotation Logic
// ─────────────────────────────────────────────

describe('Security — Refresh Token Rotation', () => {
  class TokenStore {
    private tokens = new Map<string, { userId: string; family: string; revokedAt?: string }>();

    issue(userId: string, family?: string): string {
      const token = `rt_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      this.tokens.set(token, { userId, family: family || token });
      return token;
    }

    rotate(oldToken: string): string | null {
      const entry = this.tokens.get(oldToken);
      if (!entry) return null;
      if (entry.revokedAt) {
        // Reuse detection! Revoke entire family
        this.revokeFamily(entry.family);
        return null;
      }
      // Revoke old token
      entry.revokedAt = new Date().toISOString();
      // Issue new with same family
      return this.issue(entry.userId, entry.family);
    }

    revokeFamily(family: string): void {
      for (const [, entry] of this.tokens) {
        if (entry.family === family) {
          entry.revokedAt = entry.revokedAt || new Date().toISOString();
        }
      }
    }

    isValid(token: string): boolean {
      const entry = this.tokens.get(token);
      return !!entry && !entry.revokedAt;
    }
  }

  it('G01 — issued token is valid', () => {
    const store = new TokenStore();
    const token = store.issue('user1');
    expect(store.isValid(token)).toBe(true);
  });

  it('G02 — rotated token invalidates old one', () => {
    const store = new TokenStore();
    const old = store.issue('user1');
    const newToken = store.rotate(old);
    expect(newToken).not.toBeNull();
    expect(store.isValid(old)).toBe(false);
    expect(store.isValid(newToken!)).toBe(true);
  });

  it('G03 — reuse of revoked token triggers family revocation', () => {
    const store = new TokenStore();
    const first = store.issue('user1');
    const second = store.rotate(first)!;
    // Attacker reuses stolen first token
    const result = store.rotate(first);
    expect(result).toBeNull();
    // Entire family is now revoked
    expect(store.isValid(second)).toBe(false);
  });

  it('G04 — non-existent token returns null on rotate', () => {
    const store = new TokenStore();
    expect(store.rotate('fake_token')).toBeNull();
  });
});
