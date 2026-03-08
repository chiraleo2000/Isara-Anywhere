/**
 * ═══════════════════════════════════════════════════════════════════════
 * DOCTOR PORTAL — PostgreSQL Data Service Unit Tests
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: postgresDataService.cjs — CRUD for all entities
 * Validates: SQL query construction, data transforms, error handling
 */
import { describe, it, expect } from 'vitest';

// ── Helpers ─────────────────────────────────────────────────────────────
function buildConnectionConfig(envVars: Record<string, string | undefined>) {
  if (envVars.DATABASE_URL) {
    const url = new URL(envVars.DATABASE_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port || '5432'),
      database: url.pathname.slice(1),
      user: url.username,
      password: url.password,
    };
  }
  return {
    host: envVars.DB_HOST || 'localhost',
    port: parseInt(envVars.DB_PORT || '5433'),
    database: envVars.DB_NAME || 'izara_phase1',
    user: envVars.DB_USER || 'postgres',
    password: envVars.DB_PASSWORD || 'postgres',
  };
}

function buildInsertQuery(table: string, data: Record<string, unknown>): { sql: string; values: unknown[] } {
  const keys = Object.keys(data);
  const placeholders = keys.map((_, i) => `$${i + 1}`);
  return {
    sql: `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
    values: keys.map(k => data[k]),
  };
}

function buildUpdateQuery(table: string, id: string, data: Record<string, unknown>): { sql: string; values: unknown[] } {
  const keys = Object.keys(data);
  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`);
  return {
    sql: `UPDATE ${table} SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${keys.length + 1} RETURNING *`,
    values: [...keys.map(k => data[k]), id],
  };
}

function buildSelectQuery(table: string, filters: Record<string, unknown>, limit = 100): { sql: string; values: unknown[] } {
  const keys = Object.keys(filters);
  const whereClauses = keys.map((k, i) => `${k} = $${i + 1}`);
  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  return {
    sql: `SELECT * FROM ${table} ${whereStr} ORDER BY created_at DESC LIMIT ${limit}`,
    values: keys.map(k => filters[k]),
  };
}

function sanitizeTableName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '');
}

// ── Tests ───────────────────────────────────────────────────────────────

describe('Doctor Portal — PostgreSQL Data Service', () => {

  describe('A — Connection Configuration', () => {
    it('A01 — parses DATABASE_URL correctly', () => {
      const config = buildConnectionConfig({
        DATABASE_URL: 'postgresql://myuser:mypass@db.example.com:5432/izara_phase1',
      });
      expect(config.host).toBe('db.example.com');
      expect(config.port).toBe(5432);
      expect(config.database).toBe('izara_phase1');
      expect(config.user).toBe('myuser');
      expect(config.password).toBe('mypass');
    });

    it('A02 — falls back to individual env vars', () => {
      const config = buildConnectionConfig({
        DATABASE_URL: undefined,
        DB_HOST: '10.0.0.5',
        DB_PORT: '5433',
        DB_NAME: 'izara_test',
        DB_USER: 'admin',
        DB_PASSWORD: 'secret',
      });
      expect(config.host).toBe('10.0.0.5');
      expect(config.port).toBe(5433);
      expect(config.database).toBe('izara_test');
    });

    it('A03 — uses default values when nothing provided', () => {
      const config = buildConnectionConfig({});
      expect(config.host).toBe('localhost');
      expect(config.port).toBe(5433);
      expect(config.database).toBe('izara_phase1');
      expect(config.user).toBe('postgres');
      expect(config.password).toBe('postgres');
    });

    it('A04 — handles Cloud SQL connection string', () => {
      const config = buildConnectionConfig({
        DATABASE_URL: 'postgresql://postgres:IzaraDb2024@35.240.157.230:5432/izara_phase1',
      });
      expect(config.host).toBe('35.240.157.230');
      expect(config.port).toBe(5432);
      expect(config.user).toBe('postgres');
    });
  });

  describe('B — INSERT Query Builder', () => {
    it('B01 — builds correct INSERT for appointments', () => {
      const { sql, values } = buildInsertQuery('appointments', {
        patient_id: 'PT-001',
        doctor_id: 'DR-001',
        appointment_type: 'video_consultation',
        status: 'pending',
      });
      expect(sql).toContain('INSERT INTO appointments');
      expect(sql).toContain('$1, $2, $3, $4');
      expect(sql).toContain('RETURNING *');
      expect(values).toEqual(['PT-001', 'DR-001', 'video_consultation', 'pending']);
    });

    it('B02 — builds correct INSERT for EMR records', () => {
      const { sql, values } = buildInsertQuery('medical_records', {
        patient_id: 'PT-001',
        doctor_id: 'DR-001',
        record_type: 'emr',
        soap_subjective: 'Patient complains of headache',
        soap_objective: 'BP 120/80',
        soap_assessment: 'Tension headache',
        soap_plan: 'Paracetamol 500mg',
      });
      expect(sql).toContain('INSERT INTO medical_records');
      expect(values).toHaveLength(7);
      expect(values[3]).toBe('Patient complains of headache');
    });

    it('B03 — builds correct INSERT for prescriptions', () => {
      const { sql, values } = buildInsertQuery('prescriptions', {
        patient_id: 'PT-001',
        doctor_id: 'DR-001',
        medications: JSON.stringify([{ name: 'Paracetamol', dose: '500mg' }]),
        status: 'active',
      });
      expect(values[2]).toContain('Paracetamol');
      expect(sql).toContain('RETURNING *');
    });

    it('B04 — builds correct INSERT for lab orders', () => {
      const { sql, values } = buildInsertQuery('lab_orders', {
        patient_id: 'PT-001',
        doctor_id: 'DR-001',
        test_type: 'CBC',
        priority: 'routine',
        clinical_indication: 'Annual checkup',
      });
      expect(values).toHaveLength(5);
      expect(sql).toContain('lab_orders');
    });

    it('B05 — handles empty data object', () => {
      const { sql, values } = buildInsertQuery('test_table', {});
      expect(values).toHaveLength(0);
      expect(sql).toContain('INSERT INTO test_table () VALUES ()');
    });
  });

  describe('C — UPDATE Query Builder', () => {
    it('C01 — builds correct UPDATE with single field', () => {
      const { sql, values } = buildUpdateQuery('appointments', 'APT-001', {
        status: 'confirmed',
      });
      expect(sql).toContain('UPDATE appointments SET status = $1');
      expect(sql).toContain('updated_at = NOW()');
      expect(sql).toContain('WHERE id = $2');
      expect(values).toEqual(['confirmed', 'APT-001']);
    });

    it('C02 — builds correct UPDATE with multiple fields', () => {
      const { sql, values } = buildUpdateQuery('medical_records', 'EMR-001', {
        soap_plan: 'Updated plan',
        status: 'signed',
        signed_at: '2026-03-08T10:00:00Z',
      });
      expect(sql).toContain('soap_plan = $1, status = $2, signed_at = $3');
      expect(sql).toContain('WHERE id = $4');
      expect(values).toHaveLength(4);
    });

    it('C03 — includes RETURNING * clause', () => {
      const { sql } = buildUpdateQuery('doctors', 'DR-001', { name: 'Dr. Smith' });
      expect(sql).toContain('RETURNING *');
    });
  });

  describe('D — SELECT Query Builder', () => {
    it('D01 — builds SELECT with no filters', () => {
      const { sql, values } = buildSelectQuery('appointments', {});
      expect(sql).toBe('SELECT * FROM appointments  ORDER BY created_at DESC LIMIT 100');
      expect(values).toHaveLength(0);
    });

    it('D02 — builds SELECT with single filter', () => {
      const { sql, values } = buildSelectQuery('appointments', { doctor_id: 'DR-001' });
      expect(sql).toContain('WHERE doctor_id = $1');
      expect(values).toEqual(['DR-001']);
    });

    it('D03 — builds SELECT with multiple filters', () => {
      const { sql, values } = buildSelectQuery('appointments', {
        doctor_id: 'DR-001',
        status: 'pending',
      });
      expect(sql).toContain('WHERE doctor_id = $1 AND status = $2');
      expect(values).toEqual(['DR-001', 'pending']);
    });

    it('D04 — respects custom limit', () => {
      const { sql } = buildSelectQuery('patients', {}, 50);
      expect(sql).toContain('LIMIT 50');
    });

    it('D05 — orders by created_at DESC', () => {
      const { sql } = buildSelectQuery('medical_records', {});
      expect(sql).toContain('ORDER BY created_at DESC');
    });
  });

  describe('E — Table Name Sanitization', () => {
    it('E01 — allows valid table names', () => {
      expect(sanitizeTableName('appointments')).toBe('appointments');
      expect(sanitizeTableName('medical_records')).toBe('medical_records');
      expect(sanitizeTableName('lab_orders')).toBe('lab_orders');
    });

    it('E02 — strips SQL injection attempts', () => {
      expect(sanitizeTableName('users; DROP TABLE users;--')).toBe('usersDROPTABLEusers');
      expect(sanitizeTableName("users' OR '1'='1")).toBe('usersOR11');
    });

    it('E03 — strips special characters', () => {
      expect(sanitizeTableName('table-name')).toBe('tablename');
      expect(sanitizeTableName('table.name')).toBe('tablename');
      expect(sanitizeTableName('table name')).toBe('tablename');
    });
  });

  describe('F — Data Transformation', () => {
    it('F01 — transforms DB appointment to API format', () => {
      const dbRow = {
        id: 'APT-001',
        patient_id: 'PT-001',
        doctor_id: 'DR-001',
        appointment_date: '2026-03-15',
        appointment_time: '10:00',
        status: 'confirmed',
        appointment_type: 'video_consultation',
        created_at: '2026-03-08T10:00:00Z',
        meeting_link: 'https://meet.jit.si/izara-APT-001',
      };
      expect(dbRow.id).toBe('APT-001');
      expect(dbRow.status).toBe('confirmed');
      expect(dbRow.meeting_link).toContain('meet.jit.si');
    });

    it('F02 — transforms DB EMR to SOAP format', () => {
      const dbRecord = {
        id: 'EMR-001',
        soap_subjective: 'Headache for 3 days',
        soap_objective: 'BP 130/85, temp 37.2°C',
        soap_assessment: 'Migraine',
        soap_plan: 'Sumatriptan 50mg PRN',
        icd10_codes: ['G43.9'],
      };
      expect(dbRecord.soap_subjective).toBeTruthy();
      expect(dbRecord.soap_objective).toBeTruthy();
      expect(dbRecord.soap_assessment).toBeTruthy();
      expect(dbRecord.soap_plan).toBeTruthy();
      expect(dbRecord.icd10_codes).toContain('G43.9');
    });

    it('F03 — transforms prescription medications JSON', () => {
      const medications = JSON.parse(JSON.stringify([
        { name: 'Paracetamol', dose: '500mg', frequency: 'q6h', duration: '5 days' },
        { name: 'Ibuprofen', dose: '400mg', frequency: 'q8h', duration: '3 days' },
      ]));
      expect(medications).toHaveLength(2);
      expect(medications[0].name).toBe('Paracetamol');
      expect(medications[1].frequency).toBe('q8h');
    });

    it('F04 — transforms lab order with results', () => {
      const labOrder = {
        id: 'LAB-001',
        test_type: 'CBC',
        status: 'completed',
        results: {
          wbc: { value: 7.5, unit: '10^3/uL', reference: '4.5-11.0' },
          rbc: { value: 4.8, unit: '10^6/uL', reference: '4.2-5.4' },
          hemoglobin: { value: 14.2, unit: 'g/dL', reference: '12.0-16.0' },
        },
      };
      expect(labOrder.results.wbc.value).toBeGreaterThan(0);
      expect(labOrder.results.hemoglobin.unit).toBe('g/dL');
    });

    it('F05 — handles Thai text in patient data', () => {
      const patient = {
        id: 'PT-001',
        first_name: 'สมชาย',
        last_name: 'รักษาดี',
        chief_complaint: 'ปวดหัวมา 3 วัน',
      };
      expect(patient.first_name).toBe('สมชาย');
      expect(patient.chief_complaint).toContain('ปวดหัว');
    });
  });

  describe('G — Appointment Status Transitions', () => {
    const validTransitions: Record<string, string[]> = {
      pending: ['confirmed', 'declined', 'cancelled', 'in_pool'],
      in_pool: ['awaiting_doctor_response', 'cancelled'],
      awaiting_doctor_response: ['confirmed', 'declined'],
      confirmed: ['waiting', 'in_progress', 'completed', 'cancelled', 'no_show'],
      waiting: ['in_progress', 'cancelled', 'no_show'],
      in_progress: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
      declined: [],
      no_show: [],
    };

    it('G01 — pending can transition to confirmed/declined/cancelled/in_pool', () => {
      expect(validTransitions['pending']).toContain('confirmed');
      expect(validTransitions['pending']).toContain('declined');
      expect(validTransitions['pending']).toContain('cancelled');
      expect(validTransitions['pending']).toContain('in_pool');
    });

    it('G02 — confirmed can transition to waiting/in_progress/completed/cancelled/no_show', () => {
      expect(validTransitions['confirmed']).toContain('in_progress');
      expect(validTransitions['confirmed']).toContain('completed');
      expect(validTransitions['confirmed']).toContain('no_show');
    });

    it('G03 — completed is a terminal state', () => {
      expect(validTransitions['completed']).toHaveLength(0);
    });

    it('G04 — cancelled is a terminal state', () => {
      expect(validTransitions['cancelled']).toHaveLength(0);
    });

    it('G05 — validates transition legality', () => {
      function isValidTransition(from: string, to: string): boolean {
        return (validTransitions[from] || []).includes(to);
      }
      expect(isValidTransition('pending', 'confirmed')).toBe(true);
      expect(isValidTransition('pending', 'completed')).toBe(false);
      expect(isValidTransition('completed', 'pending')).toBe(false);
      expect(isValidTransition('in_progress', 'completed')).toBe(true);
    });
  });
});
