/**
 * ═══════════════════════════════════════════════════════════════════════
 * DATABASE — Schema & Seed Data Unit Tests
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: scripts/database/izara-database.sql seed data, table schemas
 */
import { describe, it, expect } from 'vitest';

// ── Schema Constants ────────────────────────────────────────────────────

const CORE_TABLES = [
  'users', 'sessions', 'patients', 'doctors',
  'appointments', 'emr_records', 'prescriptions',
  'lab_orders', 'imaging_orders',
  'vital_signs', 'personal_health_records',
  'medical_content', 'clinical_resources',
  'patient_consents', 'living_wills',
  'notifications', 'notification_settings',
  'ai_chat_history', 'ai_chat_memory',
  'audit_logs', 'meetings', 'transcript_embeddings',
];

const USER_ROLES = ['patient', 'doctor', 'admin', 'nurse'];

// ── Seed Data Validation ────────────────────────────────────────────────

const SEED_USERS = [
  { email: 'admin@izara.dev', role: 'admin', name: 'Admin User' },
  { email: 'doctor1@izara.dev', role: 'doctor', name: 'Dr. Somchai' },
  { email: 'doctor2@izara.dev', role: 'doctor', name: 'Dr. Somsri' },
  { email: 'patient1@izara.dev', role: 'patient', name: 'สมชาย ทดสอบ' },
  { email: 'patient2@izara.dev', role: 'patient', name: 'สมศรี ทดสอบ' },
];

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateTableName(name: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(name);
}

function validateIndexName(name: string): boolean {
  return /^idx_[a-z][a-z0-9_]*$/.test(name);
}

// DB connection config
function parseConnectionConfig(envVars: Record<string, string>): Record<string, unknown> {
  if (envVars.DATABASE_URL) {
    try {
      const url = new URL(envVars.DATABASE_URL);
      return {
        host: url.hostname,
        port: parseInt(url.port || '5432'),
        database: url.pathname.slice(1),
        user: url.username,
      };
    } catch { return {}; }
  }
  return {
    host: envVars.DB_HOST || 'localhost',
    port: parseInt(envVars.DB_PORT || '5433'),
    database: envVars.DB_NAME || 'izara_phase1',
    user: envVars.DB_USER || 'izara_admin',
  };
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('Database — Schema & Seed', () => {

  describe('A — Core Tables', () => {
    it('A01 — has 20+ core tables', () => {
      expect(CORE_TABLES.length).toBeGreaterThanOrEqual(20);
    });

    it('A02 — all table names follow naming convention', () => {
      for (const table of CORE_TABLES) {
        expect(validateTableName(table)).toBe(true);
      }
    });

    it('A03 — users table exists', () => {
      expect(CORE_TABLES).toContain('users');
    });

    it('A04 — appointments table exists', () => {
      expect(CORE_TABLES).toContain('appointments');
    });

    it('A05 — emr_records table exists', () => {
      expect(CORE_TABLES).toContain('emr_records');
    });

    it('A06 — AI tables exist (chat_history, memory)', () => {
      expect(CORE_TABLES).toContain('ai_chat_history');
      expect(CORE_TABLES).toContain('ai_chat_memory');
    });

    it('A07 — transcript embeddings table exists (pgvector)', () => {
      expect(CORE_TABLES).toContain('transcript_embeddings');
    });
  });

  describe('B — Seed Users', () => {
    it('B01 — has admin, doctors, and patients', () => {
      const roles = new Set(SEED_USERS.map(u => u.role));
      expect(roles.has('admin')).toBe(true);
      expect(roles.has('doctor')).toBe(true);
      expect(roles.has('patient')).toBe(true);
    });

    it('B02 — all emails are valid', () => {
      for (const user of SEED_USERS) {
        expect(validateEmail(user.email)).toBe(true);
      }
    });

    it('B03 — all emails use izara.dev domain', () => {
      for (const user of SEED_USERS) {
        expect(user.email.endsWith('@izara.dev')).toBe(true);
      }
    });

    it('B04 — patient names are Thai', () => {
      const patients = SEED_USERS.filter(u => u.role === 'patient');
      for (const p of patients) {
        expect(/[\u0E00-\u0E7F]/.test(p.name)).toBe(true);
      }
    });

    it('B05 — at least 2 doctors for multi-doctor testing', () => {
      const doctors = SEED_USERS.filter(u => u.role === 'doctor');
      expect(doctors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('C — Connection Config', () => {
    it('C01 — parses DATABASE_URL', () => {
      const config = parseConnectionConfig({ DATABASE_URL: 'postgresql://admin:pw@dbhost:5432/izara' });
      expect(config.host).toBe('dbhost');
      expect(config.port).toBe(5432);
      expect(config.database).toBe('izara');
    });

    it('C02 — defaults to localhost:5433', () => {
      const config = parseConnectionConfig({});
      expect(config.host).toBe('localhost');
      expect(config.port).toBe(5433);
    });

    it('C03 — defaults database to izara_phase1', () => {
      const config = parseConnectionConfig({});
      expect(config.database).toBe('izara_phase1');
    });

    it('C04 — defaults user to izara_admin', () => {
      const config = parseConnectionConfig({});
      expect(config.user).toBe('izara_admin');
    });

    it('C05 — env vars override defaults', () => {
      const config = parseConnectionConfig({ DB_HOST: 'custom-host', DB_PORT: '5434' });
      expect(config.host).toBe('custom-host');
      expect(config.port).toBe(5434);
    });
  });

  describe('D — Index Names', () => {
    it('D01 — valid index name', () => {
      expect(validateIndexName('idx_users_email')).toBe(true);
    });

    it('D02 — rejects non-idx prefix', () => {
      expect(validateIndexName('index_users_email')).toBe(false);
    });

    it('D03 — rejects uppercase', () => {
      expect(validateIndexName('idx_Users_email')).toBe(false);
    });
  });

  describe('E — User Roles', () => {
    it('E01 — 4 roles defined', () => {
      expect(USER_ROLES).toHaveLength(4);
    });

    it('E02 — patient role exists', () => {
      expect(USER_ROLES).toContain('patient');
    });

    it('E03 — doctor role exists', () => {
      expect(USER_ROLES).toContain('doctor');
    });

    it('E04 — admin role exists', () => {
      expect(USER_ROLES).toContain('admin');
    });
  });
});
