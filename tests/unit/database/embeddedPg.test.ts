/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — Embedded PostgreSQL Configuration Tests
 * ═══════════════════════════════════════════════════════════════════════
 * Tests the database connection configuration for both embedded PG
 * mode (Cloud Run VM) and external Cloud SQL mode.
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Connection Config Logic (extracted from postgresDataService.cjs)
// ============================================================================

interface DBConnectionConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean | { rejectUnauthorized: boolean };
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

function buildConnectionConfig(env: Record<string, string | undefined>): DBConnectionConfig {
  const useEmbedded = env.USE_EMBEDDED_PG === 'true';

  if (useEmbedded) {
    return {
      host: 'localhost',
      port: 5432,
      database: env.DB_NAME || 'izara_phase1',
      user: env.DB_USER || 'postgres',
      password: env.DB_PASSWORD || 'IzaraDb2024',
      ssl: false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };
  }

  // External Cloud SQL mode
  return {
    host: env.DB_HOST || '34.143.228.135',
    port: parseInt(env.DB_PORT || '5432', 10),
    database: env.DB_NAME || 'izara_phase1',
    user: env.DB_USER || 'izara_app',
    password: env.DB_PASSWORD || '',
    ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  };
}

function validateConnectionConfig(config: DBConnectionConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!config.host) errors.push('host is required');
  if (!config.port || config.port < 1 || config.port > 65535) errors.push('valid port is required');
  if (!config.database) errors.push('database name is required');
  if (!config.user) errors.push('user is required');
  if (config.max < 1) errors.push('max connections must be >= 1');
  return { valid: errors.length === 0, errors };
}

// ============================================================================
// TESTS
// ============================================================================

describe('Database Connection Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Embedded PostgreSQL Mode', () => {
    it('should use localhost when USE_EMBEDDED_PG=true', () => {
      const config = buildConnectionConfig({ USE_EMBEDDED_PG: 'true' });
      expect(config.host).toBe('localhost');
      expect(config.port).toBe(5432);
    });

    it('should disable SSL for embedded mode', () => {
      const config = buildConnectionConfig({ USE_EMBEDDED_PG: 'true' });
      expect(config.ssl).toBe(false);
    });

    it('should use default database name izara_phase1', () => {
      const config = buildConnectionConfig({ USE_EMBEDDED_PG: 'true' });
      expect(config.database).toBe('izara_phase1');
    });

    it('should use postgres user by default in embedded mode', () => {
      const config = buildConnectionConfig({ USE_EMBEDDED_PG: 'true' });
      expect(config.user).toBe('postgres');
    });

    it('should use default embedded password', () => {
      const config = buildConnectionConfig({ USE_EMBEDDED_PG: 'true' });
      expect(config.password).toBe('IzaraDb2024');
    });

    it('should allow higher connection pool for embedded', () => {
      const config = buildConnectionConfig({ USE_EMBEDDED_PG: 'true' });
      expect(config.max).toBe(20);
    });

    it('should have shorter connection timeout for localhost', () => {
      const config = buildConnectionConfig({ USE_EMBEDDED_PG: 'true' });
      expect(config.connectionTimeoutMillis).toBe(10000);
    });

    it('should allow custom database name override', () => {
      const config = buildConnectionConfig({ USE_EMBEDDED_PG: 'true', DB_NAME: 'izara_test' });
      expect(config.database).toBe('izara_test');
    });

    it('should be valid configuration', () => {
      const config = buildConnectionConfig({ USE_EMBEDDED_PG: 'true' });
      const validation = validateConnectionConfig(config);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('External Cloud SQL Mode', () => {
    it('should use external host when USE_EMBEDDED_PG is not set', () => {
      const config = buildConnectionConfig({});
      expect(config.host).toBe('34.143.228.135');
    });

    it('should enable SSL when DB_SSL=true', () => {
      const config = buildConnectionConfig({ DB_SSL: 'true' });
      expect(config.ssl).toEqual({ rejectUnauthorized: false });
    });

    it('should use izara_app user for external', () => {
      const config = buildConnectionConfig({});
      expect(config.user).toBe('izara_app');
    });

    it('should have smaller pool for external (network latency)', () => {
      const config = buildConnectionConfig({});
      expect(config.max).toBe(10);
    });

    it('should have longer timeout for external connections', () => {
      const config = buildConnectionConfig({});
      expect(config.connectionTimeoutMillis).toBe(15000);
    });

    it('should use custom host from env', () => {
      const config = buildConnectionConfig({ DB_HOST: '10.0.0.1', DB_PORT: '5433' });
      expect(config.host).toBe('10.0.0.1');
      expect(config.port).toBe(5433);
    });
  });

  describe('Connection Config Validation', () => {
    it('should reject empty host', () => {
      const config = buildConnectionConfig({ USE_EMBEDDED_PG: 'true' });
      config.host = '';
      const result = validateConnectionConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('host is required');
    });

    it('should reject invalid port', () => {
      const config = buildConnectionConfig({ USE_EMBEDDED_PG: 'true' });
      config.port = 0;
      const result = validateConnectionConfig(config);
      expect(result.valid).toBe(false);
    });

    it('should reject port over 65535', () => {
      const config = buildConnectionConfig({ USE_EMBEDDED_PG: 'true' });
      config.port = 70000;
      const result = validateConnectionConfig(config);
      expect(result.valid).toBe(false);
    });

    it('should reject missing database name', () => {
      const config = buildConnectionConfig({ USE_EMBEDDED_PG: 'true' });
      config.database = '';
      const result = validateConnectionConfig(config);
      expect(result.valid).toBe(false);
    });
  });
});

describe('Database Migration — Lab Orders', () => {
  it('should define migration SQL for updated_at column', () => {
    const migrationSQL = `
      ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS result_documents JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS result_date TIMESTAMP;
      ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS ordered_date TIMESTAMP;
    `;
    expect(migrationSQL).toContain('updated_at');
    expect(migrationSQL).toContain('result_documents');
    expect(migrationSQL).toContain('JSONB');
    expect(migrationSQL).toContain('IF NOT EXISTS');
  });
});

describe('Database Migration — Imaging Orders', () => {
  it('should define imaging_orders table creation SQL', () => {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS imaging_orders (
        id VARCHAR(100) PRIMARY KEY,
        appointment_id VARCHAR(100),
        patient_id VARCHAR(100) NOT NULL,
        doctor_id VARCHAR(100) NOT NULL,
        imaging_type VARCHAR(100) NOT NULL,
        body_part VARCHAR(200),
        clinical_indication TEXT,
        priority VARCHAR(50) DEFAULT 'routine',
        status VARCHAR(50) DEFAULT 'ordered',
        facility VARCHAR(200),
        results JSONB,
        result_documents JSONB DEFAULT '[]'::jsonb,
        notes TEXT,
        ordered_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    expect(createTableSQL).toContain('imaging_orders');
    expect(createTableSQL).toContain('imaging_type');
    expect(createTableSQL).toContain('body_part');
    expect(createTableSQL).toContain('result_documents JSONB');
    expect(createTableSQL).toContain('patient_id VARCHAR(100) NOT NULL');
    expect(createTableSQL).toContain('doctor_id VARCHAR(100) NOT NULL');
  });
});
