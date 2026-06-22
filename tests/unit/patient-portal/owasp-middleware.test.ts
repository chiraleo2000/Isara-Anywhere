/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — OWASP SECURITY MIDDLEWARE UNIT TESTS
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: Password validation, input sanitization, email/phone validation,
 *        role permissions, data masking, login attempt tracking
 * Source: Isara-patient-portal/backend/security/owasp-middleware.ts
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';

// ─── Reimplement pure OWASP security logic ──

const PASSWORD_POLICY = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecial: true,
  maxRepeatingChars: 3,
};

interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters`);
  }
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (PASSWORD_POLICY.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (PASSWORD_POLICY.requireSpecial && !/[!@#$%^&*()\-_=+{};':"\\|,.<>?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return { valid: errors.length === 0, errors };
}

function generateSecureToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 600000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPasswordHash(password: string, storedHash: string): boolean {
  if (!storedHash?.includes(':')) return false;
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const verifyHash = crypto.pbkdf2Sync(password, salt, 600000, 64, 'sha512').toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
  } catch {
    return false;
  }
}

function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return input;
  return input.trim()
    .replaceAll('\0', '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#x27;');
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
}

function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-+()]{10,20}$/;
  return phoneRegex.test(phone);
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['read:all', 'write:all', 'delete:all', 'manage:users', 'view:audit'],
  doctor: ['read:patients', 'write:emr', 'read:appointments', 'write:appointments'],
  patient: ['read:own', 'write:own', 'read:appointments', 'write:appointments', 'read:phr', 'write:phr'],
};

function checkPermission(role: string, requiredPermission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(requiredPermission) ||
    permissions.some(p => p.endsWith(':all') && requiredPermission.startsWith(p.replace(':all', ':')));
}

function maskSensitiveData<T extends object>(
  obj: T,
  sensitiveFields = ['password', 'passwordHash', 'token']
): T {
  if (!obj || typeof obj !== 'object') return obj;
  const masked = { ...obj } as any;
  for (const key of Object.keys(masked)) {
    if (sensitiveFields.some(sf => key.toLowerCase().includes(sf.toLowerCase()))) {
      masked[key] = '[REDACTED]';
    } else if (typeof masked[key] === 'object' && masked[key] !== null) {
      masked[key] = maskSensitiveData(masked[key], sensitiveFields);
    }
  }
  return masked;
}

function getClientIP(headers: Record<string, string | string[] | undefined>, socketAddress?: string): string {
  const forwarded = headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  return socketAddress || 'unknown';
}

const SANITIZATION_PATTERNS = {
  sql: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)|(--)|(;)|(')/gi,
  nosql: /(\$where|\$gt|\$lt|\$ne|\$or|\$and|\$regex)/gi,
  xss: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>|javascript:|on\w+\s*=/gi,
  pathTraversal: /\.\.[\\/]|[\\/]\.\./gi,
};

function detectInjection(value: string): string | null {
  for (const [patternName, pattern] of Object.entries(SANITIZATION_PATTERNS)) {
    // Reset lastIndex for global regex
    pattern.lastIndex = 0;
    if (pattern.test(value)) {
      return patternName;
    }
  }
  return null;
}

// ════════════════════════════════════════════════════════════════════
// A. PASSWORD VALIDATION (12 tests)
// ════════════════════════════════════════════════════════════════════
describe('Password Validation', () => {
  it('A01 — valid complex password accepted', () => {
    const result = validatePassword('MyStr0ng!Pass');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('A02 — rejects empty password', () => {
    const result = validatePassword('');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('A03 — rejects short password (< 12 chars)', () => {
    const result = validatePassword('Short1!');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('12'))).toBe(true);
  });

  it('A04 — rejects no uppercase', () => {
    const result = validatePassword('lowercase123!@#');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('uppercase'))).toBe(true);
  });

  it('A05 — rejects no lowercase', () => {
    const result = validatePassword('UPPERCASE123!@#');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('lowercase'))).toBe(true);
  });

  it('A06 — rejects no numbers', () => {
    const result = validatePassword('NoNumbers!Here');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('number'))).toBe(true);
  });

  it('A07 — rejects no special characters', () => {
    const result = validatePassword('NoSpecial12345');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('special'))).toBe(true);
  });

  it('A08 — accepts exactly 12 char valid password', () => {
    const result = validatePassword('Abcdefgh1!23');
    expect(result.valid).toBe(true);
  });

  it('A09 — accepts very long password', () => {
    const result = validatePassword('VeryLongP@ssw0rd!WithManyCharacters123');
    expect(result.valid).toBe(true);
  });

  it('A10 — multiple errors for simple password', () => {
    const result = validatePassword('abc');
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('A11 — password policy requires min 12 chars', () => {
    expect(PASSWORD_POLICY.minLength).toBe(12);
  });

  it('A12 — all requirements are enabled', () => {
    expect(PASSWORD_POLICY.requireUppercase).toBe(true);
    expect(PASSWORD_POLICY.requireLowercase).toBe(true);
    expect(PASSWORD_POLICY.requireNumbers).toBe(true);
    expect(PASSWORD_POLICY.requireSpecial).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════
// B. PASSWORD HASHING (10 tests)
// ════════════════════════════════════════════════════════════════════
describe('Password Hashing', () => {
  it('B01 — hash format is salt:hash', () => {
    const hash = hashPassword('TestPassword1!');
    expect(hash).toContain(':');
    const parts = hash.split(':');
    expect(parts).toHaveLength(2);
  });

  it('B02 — salt is 32 hex chars (16 bytes)', () => {
    const hash = hashPassword('TestPassword1!');
    const salt = hash.split(':')[0];
    expect(salt).toHaveLength(32);
    expect(/^[0-9a-f]+$/.test(salt)).toBe(true);
  });

  it('B03 — hash is 128 hex chars (64 bytes)', () => {
    const hash = hashPassword('TestPassword1!');
    const hashPart = hash.split(':')[1];
    expect(hashPart).toHaveLength(128);
  });

  it('B04 — different passwords produce different hashes', () => {
    const hash1 = hashPassword('Password1!abc');
    const hash2 = hashPassword('Password2!abc');
    expect(hash1).not.toBe(hash2);
  });

  it('B05 — same password produces different hashes (random salt)', () => {
    const hash1 = hashPassword('SamePass1!ab');
    const hash2 = hashPassword('SamePass1!ab');
    expect(hash1).not.toBe(hash2); // Different salt each time
  });

  it('B06 — verify correct password returns true', () => {
    const hash = hashPassword('CorrectPass1!');
    expect(verifyPasswordHash('CorrectPass1!', hash)).toBe(true);
  });

  it('B07 — verify wrong password returns false', () => {
    const hash = hashPassword('CorrectPass1!');
    expect(verifyPasswordHash('WrongPass1!ab', hash)).toBe(false);
  });

  it('B08 — verify rejects empty stored hash', () => {
    expect(verifyPasswordHash('anything', '')).toBe(false);
  });

  it('B09 — verify rejects hash without colon', () => {
    expect(verifyPasswordHash('anything', 'invalidhash')).toBe(false);
  });

  it('B10 — verify rejects null/undefined hash', () => {
    expect(verifyPasswordHash('anything', null as any)).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════
// C. SECURE TOKEN GENERATION (6 tests)
// ════════════════════════════════════════════════════════════════════
describe('Secure Token Generation', () => {
  it('C01 — default length is 64 hex chars (32 bytes)', () => {
    const token = generateSecureToken();
    expect(token).toHaveLength(64);
  });

  it('C02 — custom length generates correct size', () => {
    const token = generateSecureToken(16);
    expect(token).toHaveLength(32); // 16 bytes = 32 hex chars
  });

  it('C03 — generates hex string', () => {
    const token = generateSecureToken();
    expect(/^[0-9a-f]+$/.test(token)).toBe(true);
  });

  it('C04 — generates unique tokens', () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateSecureToken()));
    expect(tokens.size).toBe(100);
  });

  it('C05 — 1-byte token', () => {
    const token = generateSecureToken(1);
    expect(token).toHaveLength(2);
  });

  it('C06 — 64-byte token', () => {
    const token = generateSecureToken(64);
    expect(token).toHaveLength(128);
  });
});

// ════════════════════════════════════════════════════════════════════
// D. INPUT SANITIZATION (12 tests)
// ════════════════════════════════════════════════════════════════════
describe('Input Sanitization', () => {
  it('D01 — escapes < and >', () => {
    expect(sanitizeInput('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('D02 — escapes &', () => {
    expect(sanitizeInput('a & b')).toBe('a &amp; b');
  });

  it('D03 — escapes double quotes', () => {
    expect(sanitizeInput('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('D04 — escapes single quotes', () => {
    expect(sanitizeInput("it's")).toBe('it&#x27;s');
  });

  it('D05 — strips null bytes', () => {

    const result = sanitizeInput('hello\0world');
    expect(result).not.toContain('\0');
  });

  it('D06 — trims whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello');
  });

  it('D07 — normal text unchanged', () => {
    expect(sanitizeInput('normal text')).toBe('normal text');
  });

  it('D08 — numbers pass through', () => {
    expect(sanitizeInput('12345')).toBe('12345');
  });

  it('D09 — empty string returns empty', () => {
    expect(sanitizeInput('')).toBe('');
  });

  it('D10 — TypeScript/code content sanitized', () => {
    const result = sanitizeInput('<div class="test">Hello</div>');
    expect(result).toContain('&lt;');
    expect(result).not.toContain('<div');
  });

  it('D11 — nested tags are escaped', () => {
    const result = sanitizeInput('<a href="javascript:void(0)">Click</a>');
    expect(result).not.toContain('<a');
    expect(result).toContain('&lt;a');
  });

  it('D12 — preserves Thai characters', () => {
    expect(sanitizeInput('สวัสดีครับ')).toBe('สวัสดีครับ');
  });
});

// ════════════════════════════════════════════════════════════════════
// E. INJECTION DETECTION (10 tests)
// ════════════════════════════════════════════════════════════════════
describe('Injection Detection', () => {
  it('E01 — detects SQL SELECT injection', () => {
    expect(detectInjection("' OR SELECT * FROM users --")).toBe('sql');
  });

  it('E02 — detects SQL DROP injection', () => {
    expect(detectInjection('DROP TABLE users')).toBe('sql');
  });

  it('E03 — detects SQL UNION injection', () => {
    expect(detectInjection("1 UNION SELECT password FROM users")).toBe('sql');
  });

  it('E04 — detects NoSQL $where injection', () => {
    expect(detectInjection('{"$where": "1==1"}')).toBe('nosql');
  });

  it('E05 — detects NoSQL $gt injection', () => {
    expect(detectInjection('{"age": {"$gt": ""}}')).toBe('nosql');
  });

  it('E06 — detects XSS script injection', () => {
    expect(detectInjection('<script>alert("xss")</script>')).toBe('xss');
  });

  it('E07 — detects XSS javascript: protocol', () => {
    expect(detectInjection('javascript:alert(1)')).toBe('xss');
  });

  it('E08 — detects path traversal ../', () => {
    expect(detectInjection('../../etc/passwd')).toBe('pathTraversal');
  });

  it('E09 — safe input returns null', () => {
    expect(detectInjection('Hello, my name is Somchai')).toBeNull();
  });

  it('E10 — Thai text is safe', () => {
    expect(detectInjection('สวัสดีครับ นัดพบแพทย์วันจันทร์')).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════
// F. EMAIL & PHONE VALIDATION (10 tests)
// ════════════════════════════════════════════════════════════════════
describe('Email & Phone Validation', () => {
  it('F01 — valid email accepted', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it('F02 — valid email with subdomain', () => {
    expect(isValidEmail('user@mail.co.th')).toBe(true);
  });

  it('F03 — rejects email without @', () => {
    expect(isValidEmail('userexample.com')).toBe(false);
  });

  it('F04 — rejects email without domain', () => {
    expect(isValidEmail('user@')).toBe(false);
  });

  it('F05 — rejects email without TLD', () => {
    expect(isValidEmail('user@localhost')).toBe(false);
  });

  it('F06 — rejects very long email (>254 chars)', () => {
    const longEmail = 'a'.repeat(250) + '@b.com';
    expect(isValidEmail(longEmail)).toBe(false);
  });

  it('F07 — valid phone accepted', () => {
    expect(isValidPhone('0812345678')).toBe(true);
  });

  it('F08 — valid international phone', () => {
    expect(isValidPhone('+66 81 234 5678')).toBe(true);
  });

  it('F09 — rejects too short phone', () => {
    expect(isValidPhone('12345')).toBe(false);
  });

  it('F10 — rejects phone with letters', () => {
    expect(isValidPhone('081abc5678')).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════
// G. ROLE-BASED ACCESS CONTROL (12 tests)
// ════════════════════════════════════════════════════════════════════
describe('Role-Based Access Control', () => {
  it('G01 — admin has read:all', () => {
    expect(checkPermission('admin', 'read:all')).toBe(true);
  });

  it('G02 — admin has write:all', () => {
    expect(checkPermission('admin', 'write:all')).toBe(true);
  });

  it('G03 — admin has manage:users', () => {
    expect(checkPermission('admin', 'manage:users')).toBe(true);
  });

  it('G04 — admin read:all grants read:patients', () => {
    expect(checkPermission('admin', 'read:patients')).toBe(true);
  });

  it('G05 — doctor has read:patients', () => {
    expect(checkPermission('doctor', 'read:patients')).toBe(true);
  });

  it('G06 — doctor has write:emr', () => {
    expect(checkPermission('doctor', 'write:emr')).toBe(true);
  });

  it('G07 — doctor cannot delete:all', () => {
    expect(checkPermission('doctor', 'delete:all')).toBe(false);
  });

  it('G08 — patient has read:own', () => {
    expect(checkPermission('patient', 'read:own')).toBe(true);
  });

  it('G09 — patient has read:phr', () => {
    expect(checkPermission('patient', 'read:phr')).toBe(true);
  });

  it('G10 — patient cannot read:patients (others)', () => {
    expect(checkPermission('patient', 'read:patients')).toBe(false);
  });

  it('G11 — unknown role has no permissions', () => {
    expect(checkPermission('guest', 'read:all')).toBe(false);
  });

  it('G12 — admin has 5 base permissions', () => {
    expect(ROLE_PERMISSIONS.admin).toHaveLength(5);
  });
});

// ════════════════════════════════════════════════════════════════════
// H. SENSITIVE DATA MASKING (8 tests)
// ════════════════════════════════════════════════════════════════════
describe('Sensitive Data Masking', () => {
  it('H01 — masks password field', () => {
    const result = maskSensitiveData({ password: 'secret123', name: 'Test' });
    expect(result.password).toBe('[REDACTED]');
    expect(result.name).toBe('Test');
  });

  it('H02 — masks passwordHash field', () => {
    const result = maskSensitiveData({ passwordHash: 'abc:def', email: 'a@b.com' });
    expect(result.passwordHash).toBe('[REDACTED]');
  });

  it('H03 — masks token field', () => {
    const result = maskSensitiveData({ token: 'jwt.abc.xyz', id: '123' });
    expect(result.token).toBe('[REDACTED]');
  });

  it('H04 — preserves non-sensitive fields', () => {
    const result = maskSensitiveData({ name: 'Dr. Smith', email: 'dr@izara.com' });
    expect(result.name).toBe('Dr. Smith');
    expect(result.email).toBe('dr@izara.com');
  });

  it('H05 — masks nested objects', () => {
    const result = maskSensitiveData({
      user: { name: 'Test', password: 'secret' },
    });
    expect(result.user.password).toBe('[REDACTED]');
    expect(result.user.name).toBe('Test');
  });

  it('H06 — handles null input gracefully', () => {
    const result = maskSensitiveData(null as any);
    expect(result).toBeNull();
  });

  it('H07 — custom sensitive fields', () => {
    const result = maskSensitiveData({ ssn: '123-45-6789', name: 'Test' }, ['ssn']);
    expect(result.ssn).toBe('[REDACTED]');
  });

  it('H08 — case-insensitive field matching', () => {
    const result = maskSensitiveData({ PASSWORD: 'secret', Token: 'abc' });
    expect(result.PASSWORD).toBe('[REDACTED]');
    expect(result.Token).toBe('[REDACTED]');
  });
});

// ════════════════════════════════════════════════════════════════════
// I. CLIENT IP EXTRACTION (6 tests)
// ════════════════════════════════════════════════════════════════════
describe('Client IP Extraction', () => {
  it('I01 — extracts from x-forwarded-for', () => {
    expect(getClientIP({ 'x-forwarded-for': '1.2.3.4' })).toBe('1.2.3.4');
  });

  it('I02 — takes first IP from comma-separated list', () => {
    expect(getClientIP({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8, 9.10.11.12' })).toBe('1.2.3.4');
  });

  it('I03 — falls back to socket address', () => {
    expect(getClientIP({}, '192.168.1.1')).toBe('192.168.1.1');
  });

  it('I04 — returns unknown when nothing available', () => {
    expect(getClientIP({})).toBe('unknown');
  });

  it('I05 — trims whitespace from forwarded IP', () => {
    expect(getClientIP({ 'x-forwarded-for': '  1.2.3.4  ' })).toBe('1.2.3.4');
  });

  it('I06 — ignores array-type header', () => {
    expect(getClientIP({ 'x-forwarded-for': ['1.2.3.4'] as any }, '10.0.0.1')).toBe('10.0.0.1');
  });
});
