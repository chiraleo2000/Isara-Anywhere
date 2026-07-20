-- ============================================================================
-- Migration: v2.3.0 - Patient documents registry + doctor messages + booking fields
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Unified clinical document delivery registry
CREATE TABLE IF NOT EXISTS patient_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id      VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_type     TEXT NOT NULL,
    source_id       VARCHAR(50),
    appointment_id  VARCHAR(50) REFERENCES appointments(id) ON DELETE SET NULL,
    doctor_id       VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    title           TEXT NOT NULL,
    description     TEXT,
    file_name       TEXT NOT NULL,
    mime_type       TEXT NOT NULL DEFAULT 'application/pdf',
    file_data       BYTEA,
    file_size       INTEGER,
    status          TEXT NOT NULL DEFAULT 'delivered',
    delivered_at    TIMESTAMPTZ DEFAULT NOW(),
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_documents_patient
    ON patient_documents(patient_id, delivered_at DESC);
CREATE INDEX IF NOT EXISTS idx_patient_documents_source
    ON patient_documents(source_type, source_id);

-- Doctor-to-patient async messages
CREATE TABLE IF NOT EXISTS patient_doctor_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id      VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id       VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_id  VARCHAR(50) REFERENCES appointments(id) ON DELETE SET NULL,
    subject         TEXT NOT NULL,
    body            TEXT NOT NULL,
    channel         TEXT NOT NULL DEFAULT 'both',
    status          TEXT NOT NULL DEFAULT 'sent',
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_doctor_messages_patient
    ON patient_doctor_messages(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patient_doctor_messages_doctor
    ON patient_doctor_messages(doctor_id, created_at DESC);

-- Appointment booking wizard fields (queue card enrichment)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS preferred_dates JSONB DEFAULT '[]'::jsonb;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS preferred_time_slot VARCHAR(20);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS required_specialty VARCHAR(100);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS suggested_specialty VARCHAR(100);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS booking_metadata JSONB DEFAULT '{}'::jsonb;

SELECT 'v2.3.0-patient-documents-and-messages migration completed' AS status;
