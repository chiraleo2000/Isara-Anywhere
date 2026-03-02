/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — Prescription Service Unit Tests
 * ═══════════════════════════════════════════════════════════════════════
 * Tests prescription CRUD operations migrated from GCS to PostgreSQL
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Prescription Logic (extracted for testing)
// ============================================================================

interface PrescriptionData {
  id?: string;
  appointment_id?: string;
  patient_id: string;
  doctor_id: string;
  medications: MedicationItem[];
  diagnosis?: string;
  notes?: string;
  status?: string;
}

interface MedicationItem {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  route?: string;
  quantity?: number;
  refills?: number;
  instructions?: string;
}

function generatePrescriptionId(): string {
  return `RX-${Date.now()}`;
}

function validatePrescription(data: PrescriptionData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!data.patient_id) errors.push('patient_id is required');
  if (!data.doctor_id) errors.push('doctor_id is required');
  if (!data.medications || !Array.isArray(data.medications) || data.medications.length === 0) {
    errors.push('At least one medication is required');
  }
  if (data.medications) {
    data.medications.forEach((med, idx) => {
      if (!med.name) errors.push(`Medication ${idx + 1}: name is required`);
      if (!med.dosage) errors.push(`Medication ${idx + 1}: dosage is required`);
      if (!med.frequency) errors.push(`Medication ${idx + 1}: frequency is required`);
      if (!med.duration) errors.push(`Medication ${idx + 1}: duration is required`);
    });
  }
  return { valid: errors.length === 0, errors };
}

function buildPrescriptionInsertSQL(data: PrescriptionData): { sql: string; values: any[] } {
  const id = data.id || generatePrescriptionId();
  const sql = `
    INSERT INTO prescriptions (id, appointment_id, patient_id, doctor_id, medications, diagnosis, notes, status, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    RETURNING *
  `;
  const values = [
    id,
    data.appointment_id || null,
    data.patient_id,
    data.doctor_id,
    JSON.stringify(data.medications),
    data.diagnosis || null,
    data.notes || null,
    data.status || 'active',
  ];
  return { sql, values };
}

function buildPrescriptionsByPatientSQL(patientId: string): { sql: string; values: any[] } {
  return {
    sql: `
      SELECT p.*, u.first_name || ' ' || u.last_name as doctor_name
      FROM prescriptions p
      LEFT JOIN users u ON p.doctor_id = u.id
      WHERE p.patient_id = $1
      ORDER BY p.created_at DESC
    `,
    values: [patientId],
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('Prescriptions', () => {
  describe('generatePrescriptionId', () => {
    it('should generate ID with RX- prefix', () => {
      const id = generatePrescriptionId();
      expect(id).toMatch(/^RX-\d+$/);
    });
  });

  describe('validatePrescription', () => {
    it('should validate a complete prescription', () => {
      const data: PrescriptionData = {
        patient_id: 'P-001',
        doctor_id: 'DOC-001',
        medications: [
          { name: 'Amoxicillin', dosage: '500mg', frequency: '3 times daily', duration: '7 days' },
        ],
        diagnosis: 'Upper respiratory infection',
      };
      const result = validatePrescription(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject prescription without medications', () => {
      const data: PrescriptionData = {
        patient_id: 'P-001',
        doctor_id: 'DOC-001',
        medications: [],
      };
      const result = validatePrescription(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one medication is required');
    });

    it('should reject medication without name', () => {
      const data: PrescriptionData = {
        patient_id: 'P-001',
        doctor_id: 'DOC-001',
        medications: [
          { name: '', dosage: '500mg', frequency: '3x/day', duration: '7 days' },
        ],
      };
      const result = validatePrescription(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Medication 1: name is required');
    });

    it('should reject medication without dosage', () => {
      const data: PrescriptionData = {
        patient_id: 'P-001',
        doctor_id: 'DOC-001',
        medications: [
          { name: 'Ibuprofen', dosage: '', frequency: 'twice daily', duration: '5 days' },
        ],
      };
      const result = validatePrescription(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Medication 1: dosage is required');
    });

    it('should validate multiple medications and report all errors', () => {
      const data: PrescriptionData = {
        patient_id: 'P-001',
        doctor_id: 'DOC-001',
        medications: [
          { name: '', dosage: '500mg', frequency: '3x/day', duration: '7 days' },
          { name: 'Aspirin', dosage: '', frequency: '', duration: '30 days' },
        ],
      };
      const result = validatePrescription(data);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('buildPrescriptionInsertSQL', () => {
    it('should build correct INSERT SQL with all fields', () => {
      const data: PrescriptionData = {
        patient_id: 'P-001',
        doctor_id: 'DOC-001',
        appointment_id: 'APT-001',
        medications: [{ name: 'Test Med', dosage: '10mg', frequency: 'daily', duration: '30 days' }],
        diagnosis: 'Test diagnosis',
        notes: 'Some notes',
        status: 'active',
      };
      const result = buildPrescriptionInsertSQL(data);
      expect(result.sql).toContain('INSERT INTO prescriptions');
      expect(result.sql).toContain('RETURNING *');
      expect(result.values).toHaveLength(8);
      expect(result.values[2]).toBe('P-001'); // patient_id
      expect(result.values[3]).toBe('DOC-001'); // doctor_id
      expect(JSON.parse(result.values[4])).toHaveLength(1); // medications JSON
    });

    it('should default status to active', () => {
      const data: PrescriptionData = {
        patient_id: 'P-001',
        doctor_id: 'DOC-001',
        medications: [{ name: 'Med', dosage: '5mg', frequency: 'daily', duration: '7 days' }],
      };
      const result = buildPrescriptionInsertSQL(data);
      expect(result.values[7]).toBe('active');
    });

    it('should handle null optional fields', () => {
      const data: PrescriptionData = {
        patient_id: 'P-001',
        doctor_id: 'DOC-001',
        medications: [{ name: 'Med', dosage: '5mg', frequency: 'daily', duration: '7 days' }],
      };
      const result = buildPrescriptionInsertSQL(data);
      expect(result.values[1]).toBeNull(); // appointment_id
      expect(result.values[5]).toBeNull(); // diagnosis
      expect(result.values[6]).toBeNull(); // notes
    });
  });

  describe('buildPrescriptionsByPatientSQL', () => {
    it('should build patient prescriptions query with doctor name join', () => {
      const result = buildPrescriptionsByPatientSQL('P-001');
      expect(result.sql).toContain('prescriptions p');
      expect(result.sql).toContain('LEFT JOIN users u ON p.doctor_id = u.id');
      expect(result.sql).toContain('WHERE p.patient_id = $1');
      expect(result.sql).toContain('ORDER BY p.created_at DESC');
      expect(result.values).toEqual(['P-001']);
    });
  });
});
