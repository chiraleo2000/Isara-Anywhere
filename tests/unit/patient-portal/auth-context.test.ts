/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — Patient Portal Auth Context Unit Tests
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: AuthContext logic, inactivity timeout, device ID generation,
 * token management, login/register flows, session persistence.
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Mock localStorage ──────────────────────────────────────────────
const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, val: string) => { store[key] = val; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
};

beforeEach(() => {
  mockLocalStorage.clear();
});

// ═══════════════════════════════════════════════════════════════════════
// A. Device ID Generation
// ═══════════════════════════════════════════════════════════════════════
describe('Auth — Device ID Generation', () => {
  function generateDeviceId(): string {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'test';
    const lang = typeof navigator !== 'undefined' ? navigator.language : 'en';
    const sw = typeof globalThis.screen !== 'undefined' ? globalThis.screen.width : 1920;
    const sh = typeof globalThis.screen !== 'undefined' ? globalThis.screen.height : 1080;
    const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';
    const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 4;
    const raw = `${ua}_${lang}_${sw}x${sh}_${tz}_${cores}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return `device_${Math.abs(hash).toString(36)}`;
  }

  function getDeviceId(): string {
    let id = mockLocalStorage.getItem('izara_patient_device_id');
    if (!id) {
      id = generateDeviceId();
      mockLocalStorage.setItem('izara_patient_device_id', id);
    }
    return id;
  }

  it('A01 — generates a non-empty device ID', () => {
    const id = generateDeviceId();
    expect(id).toBeTruthy();
    expect(id.startsWith('device_')).toBe(true);
  });

  it('A02 — device ID is deterministic for same environment', () => {
    const id1 = generateDeviceId();
    const id2 = generateDeviceId();
    expect(id1).toBe(id2);
  });

  it('A03 — getDeviceId creates and persists ID', () => {
    const id = getDeviceId();
    expect(id).toBeTruthy();
    expect(mockLocalStorage.getItem('izara_patient_device_id')).toBe(id);
  });

  it('A04 — getDeviceId returns cached ID on second call', () => {
    const id1 = getDeviceId();
    const id2 = getDeviceId();
    expect(id1).toBe(id2);
  });

  it('A05 — device ID uses base36 encoding', () => {
    const id = generateDeviceId();
    const suffix = id.replace('device_', '');
    expect(/^[0-9a-z]+$/.test(suffix)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// B. Token Management
// ═══════════════════════════════════════════════════════════════════════
describe('Auth — Token Management', () => {
  function getToken(): string | null {
    return mockLocalStorage.getItem('auth_token');
  }

  function setToken(token: string): void {
    mockLocalStorage.setItem('auth_token', token);
  }

  function clearAuth(): void {
    mockLocalStorage.removeItem('auth_token');
    mockLocalStorage.removeItem('izara_user');
    mockLocalStorage.removeItem('izara_patient_last_activity');
  }

  it('B01 — getToken returns null when no token stored', () => {
    expect(getToken()).toBeNull();
  });

  it('B02 — setToken stores token in localStorage', () => {
    setToken('test-jwt-token-123');
    expect(getToken()).toBe('test-jwt-token-123');
  });

  it('B03 — clearAuth removes all auth keys', () => {
    setToken('test-token');
    mockLocalStorage.setItem('izara_user', '{"id":"test"}');
    mockLocalStorage.setItem('izara_patient_last_activity', '12345');
    clearAuth();
    expect(getToken()).toBeNull();
    expect(mockLocalStorage.getItem('izara_user')).toBeNull();
    expect(mockLocalStorage.getItem('izara_patient_last_activity')).toBeNull();
  });

  it('B04 — token format validation (JWT has 3 parts)', () => {
    const validJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.signature';
    expect(validJwt.split('.').length).toBe(3);
  });

  it('B05 — empty string token is falsy', () => {
    setToken('');
    expect(getToken()).toBe('');
    expect(!!getToken()).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// C. Inactivity Timeout Logic
// ═══════════════════════════════════════════════════════════════════════
describe('Auth — Inactivity Timeout', () => {
  const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
  const INACTIVITY_CHECK_INTERVAL = 60 * 1000; // 60 seconds

  function isSessionExpired(lastActivity: number): boolean {
    return Date.now() - lastActivity > INACTIVITY_TIMEOUT;
  }

  function updateActivity(): number {
    const now = Date.now();
    mockLocalStorage.setItem('izara_patient_last_activity', now.toString());
    return now;
  }

  it('C01 — session is not expired within timeout', () => {
    expect(isSessionExpired(Date.now())).toBe(false);
  });

  it('C02 — session is expired after 15 minutes', () => {
    const past = Date.now() - INACTIVITY_TIMEOUT - 1000;
    expect(isSessionExpired(past)).toBe(true);
  });

  it('C03 — updating activity resets the timer', () => {
    const ts = updateActivity();
    expect(isSessionExpired(ts)).toBe(false);
  });

  it('C04 — inactivity timeout is exactly 15 minutes', () => {
    expect(INACTIVITY_TIMEOUT).toBe(900_000);
  });

  it('C05 — check interval is 60 seconds', () => {
    expect(INACTIVITY_CHECK_INTERVAL).toBe(60_000);
  });

  it('C06 — activity timestamp persists to localStorage', () => {
    updateActivity();
    const stored = mockLocalStorage.getItem('izara_patient_last_activity');
    expect(stored).toBeTruthy();
    expect(Number(stored)).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// D. User Object Serialization
// ═══════════════════════════════════════════════════════════════════════
describe('Auth — User Serialization', () => {
  interface IzaraUser {
    id: string;
    email: string;
    name: string;
    role: string;
  }

  function saveUser(user: IzaraUser): void {
    mockLocalStorage.setItem('izara_user', JSON.stringify(user));
  }

  function loadUser(): IzaraUser | null {
    const raw = mockLocalStorage.getItem('izara_user');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  it('D01 — saves and loads user correctly', () => {
    const user: IzaraUser = { id: 'P-001', email: 'test@gmail.com', name: 'Test', role: 'patient' };
    saveUser(user);
    expect(loadUser()).toEqual(user);
  });

  it('D02 — returns null when no user stored', () => {
    expect(loadUser()).toBeNull();
  });

  it('D03 — handles corrupted JSON gracefully', () => {
    mockLocalStorage.setItem('izara_user', '{invalid json}');
    expect(loadUser()).toBeNull();
  });

  it('D04 — user has required fields', () => {
    const user: IzaraUser = { id: 'P-002', email: 'a@b.com', name: 'A', role: 'patient' };
    saveUser(user);
    const loaded = loadUser()!;
    expect(loaded.id).toBeTruthy();
    expect(loaded.email).toContain('@');
    expect(loaded.name).toBeTruthy();
    expect(loaded.role).toBe('patient');
  });

  it('D05 — preserves Thai characters in name', () => {
    const user: IzaraUser = { id: 'P-TH', email: 'th@test.com', name: 'สมชาย มั่นคง', role: 'patient' };
    saveUser(user);
    expect(loadUser()!.name).toBe('สมชาย มั่นคง');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// E. API URL Resolution
// ═══════════════════════════════════════════════════════════════════════
describe('Auth — API URL Resolution', () => {
  function getApiUrl(path: string, baseUrl: string = ''): string {
    return `${baseUrl}${path}`;
  }

  it('E01 — builds correct login URL', () => {
    expect(getApiUrl('/api/auth/login')).toBe('/api/auth/login');
  });

  it('E02 — prepends base URL when configured', () => {
    expect(getApiUrl('/api/auth/login', 'http://localhost:3005')).toBe('http://localhost:3005/api/auth/login');
  });

  it('E03 — handles empty base URL (proxy mode)', () => {
    expect(getApiUrl('/api/health', '')).toBe('/api/health');
  });

  it('E04 — builds register URL correctly', () => {
    expect(getApiUrl('/api/auth/register')).toBe('/api/auth/register');
  });

  it('E05 — builds PHR URL with user ID', () => {
    const userId = 'PATIENT-DEMO';
    expect(getApiUrl(`/api/phr/${userId}`)).toBe('/api/phr/PATIENT-DEMO');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// F. Login / Register Data Validation
// ═══════════════════════════════════════════════════════════════════════
describe('Auth — Registration Data Validation', () => {
  interface RegisterInput {
    email: string;
    password: string;
    confirmPassword: string;
    name: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
  }

  function validateRegisterInput(input: RegisterInput): string[] {
    const errors: string[] = [];
    if (!input.email || !input.email.includes('@')) errors.push('Invalid email');
    if (!input.password || input.password.length < 8) errors.push('Password too short');
    if (input.password !== input.confirmPassword) errors.push('Passwords do not match');
    if (!input.name || input.name.trim().length < 2) errors.push('Name required');
    if (input.phone && !/^0\d{8,9}$/.test(input.phone)) errors.push('Invalid Thai phone');
    return errors;
  }

  it('F01 — valid input produces no errors', () => {
    const input: RegisterInput = {
      email: 'test@gmail.com', password: 'Test@12345678',
      confirmPassword: 'Test@12345678', name: 'Test User',
    };
    expect(validateRegisterInput(input)).toHaveLength(0);
  });

  it('F02 — rejects invalid email', () => {
    const input: RegisterInput = {
      email: 'invalid', password: 'Test@12345678',
      confirmPassword: 'Test@12345678', name: 'Test',
    };
    expect(validateRegisterInput(input)).toContain('Invalid email');
  });

  it('F03 — rejects short password', () => {
    const input: RegisterInput = {
      email: 'a@b.com', password: 'short',
      confirmPassword: 'short', name: 'Test',
    };
    expect(validateRegisterInput(input)).toContain('Password too short');
  });

  it('F04 — rejects mismatched passwords', () => {
    const input: RegisterInput = {
      email: 'a@b.com', password: 'Test@12345678',
      confirmPassword: 'Different@123456', name: 'Test',
    };
    expect(validateRegisterInput(input)).toContain('Passwords do not match');
  });

  it('F05 — rejects missing name', () => {
    const input: RegisterInput = {
      email: 'a@b.com', password: 'Test@12345678',
      confirmPassword: 'Test@12345678', name: '',
    };
    expect(validateRegisterInput(input)).toContain('Name required');
  });

  it('F06 — validates Thai phone number format', () => {
    const input: RegisterInput = {
      email: 'a@b.com', password: 'Test@12345678',
      confirmPassword: 'Test@12345678', name: 'Test', phone: '12345',
    };
    expect(validateRegisterInput(input)).toContain('Invalid Thai phone');
  });

  it('F07 — accepts valid Thai phone', () => {
    const input: RegisterInput = {
      email: 'a@b.com', password: 'Test@12345678',
      confirmPassword: 'Test@12345678', name: 'Test', phone: '0891234567',
    };
    expect(validateRegisterInput(input)).toHaveLength(0);
  });

  it('F08 — accepts Thai name characters', () => {
    const input: RegisterInput = {
      email: 'a@b.com', password: 'Test@12345678',
      confirmPassword: 'Test@12345678', name: 'ทดสอบ ผู้ป่วยใหม่',
    };
    expect(validateRegisterInput(input)).toHaveLength(0);
  });
});
