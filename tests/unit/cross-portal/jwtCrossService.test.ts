/**
 * ═══════════════════════════════════════════════════════════════════════
 * JWT Cross-Service Validation Tests
 * Tests: Token structure, expiry, role claims, cross-service compatibility
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';

// --- Types ---
interface JWTPayload {
  sub: string;      // user ID
  email: string;
  role: 'patient' | 'doctor' | 'admin';
  name?: string;
  iat: number;       // issued at
  exp: number;       // expiry
  iss?: string;      // issuer
}

interface TokenValidation {
  valid: boolean;
  errors: string[];
  payload?: JWTPayload;
}

// --- Functions ---

function parsePayloadFromBase64(base64: string): JWTPayload | null {
  try {
    const json = Buffer.from(base64, 'base64url').toString('utf-8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function validateTokenStructure(token: string): { valid: boolean; parts: number } {
  const parts = token.split('.');
  return { valid: parts.length === 3, parts: parts.length };
}

function validatePayload(payload: JWTPayload): TokenValidation {
  const errors: string[] = [];

  if (!payload.sub) errors.push('Missing subject (sub)');
  if (!payload.email) errors.push('Missing email');
  if (!payload.role) errors.push('Missing role');
  if (!['patient', 'doctor', 'admin'].includes(payload.role)) {
    errors.push(`Invalid role: ${payload.role}`);
  }
  if (!payload.iat) errors.push('Missing issued-at (iat)');
  if (!payload.exp) errors.push('Missing expiry (exp)');
  if (payload.exp && payload.iat && payload.exp <= payload.iat) {
    errors.push('Token expiry must be after issued-at');
  }

  return { valid: errors.length === 0, errors, payload };
}

function isTokenExpired(payload: JWTPayload, nowMs?: number): boolean {
  const now = nowMs ?? Date.now();
  return payload.exp * 1000 < now;
}

function getTokenTTLMinutes(payload: JWTPayload): number {
  return Math.max(0, (payload.exp - payload.iat) / 60);
}

function canAccessService(
  payload: JWTPayload,
  service: 'patient-portal' | 'doctor-portal' | 'meeting-server'
): boolean {
  const accessMap: Record<string, string[]> = {
    'patient-portal': ['patient', 'admin'],
    'doctor-portal': ['doctor', 'admin'],
    'meeting-server': ['patient', 'doctor', 'admin'],
  };
  return accessMap[service]?.includes(payload.role) ?? false;
}

function tokensShareSecret(issuer1: string | undefined, issuer2: string | undefined): boolean {
  // If both have same issuer or both undefined, they share the same secret
  return issuer1 === issuer2;
}

// --- Test Data ---
const NOW = Math.floor(Date.now() / 1000);
const HOUR = 3600;

const PATIENT_TOKEN: JWTPayload = {
  sub: 'PATIENT-001', email: 'patient@test.com', role: 'patient', name: 'Test Patient',
  iat: NOW, exp: NOW + 24 * HOUR, iss: 'izara-auth',
};

const DOCTOR_TOKEN: JWTPayload = {
  sub: 'DOC-001', email: 'doctor@test.com', role: 'doctor', name: 'Dr. Test',
  iat: NOW, exp: NOW + 24 * HOUR, iss: 'izara-auth',
};

const ADMIN_TOKEN: JWTPayload = {
  sub: 'ADMIN-001', email: 'admin@test.com', role: 'admin', name: 'Admin User',
  iat: NOW, exp: NOW + 24 * HOUR, iss: 'izara-auth',
};

const EXPIRED_TOKEN: JWTPayload = {
  sub: 'USER-OLD', email: 'old@test.com', role: 'patient',
  iat: NOW - 48 * HOUR, exp: NOW - 24 * HOUR,
};

// --- Tests ---

describe('JWT — Token Structure', () => {
  it('JWT01 — valid JWT has 3 parts', () => {
    expect(validateTokenStructure('header.payload.signature').valid).toBe(true);
  });

  it('JWT02 — invalid JWT with 2 parts fails', () => {
    expect(validateTokenStructure('header.payload').valid).toBe(false);
  });

  it('JWT03 — empty string fails', () => {
    expect(validateTokenStructure('').valid).toBe(false);
  });
});

describe('JWT — Payload Validation', () => {
  it('JWT04 — valid patient token', () => {
    expect(validatePayload(PATIENT_TOKEN).valid).toBe(true);
  });

  it('JWT05 — valid doctor token', () => {
    expect(validatePayload(DOCTOR_TOKEN).valid).toBe(true);
  });

  it('JWT06 — valid admin token', () => {
    expect(validatePayload(ADMIN_TOKEN).valid).toBe(true);
  });

  it('JWT07 — missing email fails', () => {
    const bad = { ...PATIENT_TOKEN, email: '' };
    expect(validatePayload(bad).valid).toBe(false);
  });

  it('JWT08 — missing role fails', () => {
    const bad = { ...PATIENT_TOKEN, role: '' as any };
    expect(validatePayload(bad).valid).toBe(false);
  });

  it('JWT09 — invalid role fails', () => {
    const bad = { ...PATIENT_TOKEN, role: 'superuser' as any };
    expect(validatePayload(bad).valid).toBe(false);
  });

  it('JWT10 — exp before iat fails', () => {
    const bad = { ...PATIENT_TOKEN, iat: NOW, exp: NOW - HOUR };
    expect(validatePayload(bad).valid).toBe(false);
  });
});

describe('JWT — Expiry', () => {
  it('JWT11 — active token is not expired', () => {
    expect(isTokenExpired(PATIENT_TOKEN)).toBe(false);
  });

  it('JWT12 — expired token is detected', () => {
    expect(isTokenExpired(EXPIRED_TOKEN)).toBe(true);
  });

  it('JWT13 — TTL is 24 hours (1440 minutes)', () => {
    expect(getTokenTTLMinutes(PATIENT_TOKEN)).toBe(1440);
  });
});

describe('JWT — Cross-Service Access', () => {
  it('JWT14 — patient can access patient-portal', () => {
    expect(canAccessService(PATIENT_TOKEN, 'patient-portal')).toBe(true);
  });

  it('JWT15 — patient cannot access doctor-portal', () => {
    expect(canAccessService(PATIENT_TOKEN, 'doctor-portal')).toBe(false);
  });

  it('JWT16 — doctor can access doctor-portal', () => {
    expect(canAccessService(DOCTOR_TOKEN, 'doctor-portal')).toBe(true);
  });

  it('JWT17 — doctor cannot access patient-portal', () => {
    expect(canAccessService(DOCTOR_TOKEN, 'patient-portal')).toBe(false);
  });

  it('JWT18 — admin can access all services', () => {
    expect(canAccessService(ADMIN_TOKEN, 'patient-portal')).toBe(true);
    expect(canAccessService(ADMIN_TOKEN, 'doctor-portal')).toBe(true);
    expect(canAccessService(ADMIN_TOKEN, 'meeting-server')).toBe(true);
  });

  it('JWT19 — all roles can access meeting-server', () => {
    expect(canAccessService(PATIENT_TOKEN, 'meeting-server')).toBe(true);
    expect(canAccessService(DOCTOR_TOKEN, 'meeting-server')).toBe(true);
    expect(canAccessService(ADMIN_TOKEN, 'meeting-server')).toBe(true);
  });
});

describe('JWT — Cross-Service Secret', () => {
  it('JWT20 — same issuer shares secret', () => {
    expect(tokensShareSecret('izara-auth', 'izara-auth')).toBe(true);
  });

  it('JWT21 — different issuers do not share', () => {
    expect(tokensShareSecret('izara-auth', 'external-auth')).toBe(false);
  });

  it('JWT22 — patient and doctor tokens share issuer', () => {
    expect(tokensShareSecret(PATIENT_TOKEN.iss, DOCTOR_TOKEN.iss)).toBe(true);
  });
});
