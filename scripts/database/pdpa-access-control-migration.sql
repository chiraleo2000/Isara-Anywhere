-- ============================================================================
-- PDPA Doctor Access Control Migration
-- Adds per-doctor medical_record_access consent + emergency bypass audit
-- ============================================================================

-- 1. Partial unique index: one consent row per (patient_id, doctor_id, consent_type)
--    Only applies when doctor_id IS NOT NULL (per-doctor consents)
CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_consents_unique_doctor
  ON patient_consents(patient_id, doctor_id, consent_type)
  WHERE doctor_id IS NOT NULL;

-- 2. Access audit table for emergency bypass logging (PDPA compliance)
CREATE TABLE IF NOT EXISTS access_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id VARCHAR(50) REFERENCES users(id),
    patient_id VARCHAR(50) REFERENCES users(id),
    access_type VARCHAR(50) NOT NULL,       -- 'emergency_bypass', 'consent_granted', etc.
    reason TEXT,
    appointment_id VARCHAR(50),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_access_audit_doctor_id ON access_audit(doctor_id);
CREATE INDEX IF NOT EXISTS idx_access_audit_patient_id ON access_audit(patient_id);
CREATE INDEX IF NOT EXISTS idx_access_audit_created_at ON access_audit(created_at);
