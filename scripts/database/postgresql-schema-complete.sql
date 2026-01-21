-- ============================================================================
-- IZARA TELEMEDICINE - COMPLETE POSTGRESQL DATABASE SCHEMA
-- Phase 1: Full Database Schema for Docker and Cloud Deployment
-- Version: 3.0.0
-- Updated: 2026-01-21
-- ============================================================================
-- This file combines postgresql-schema.sql and postgresql-schema-additions.sql
-- into a single comprehensive schema file for deployment.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";  -- For RAG/embeddings

-- ============================================================================
-- SECTION 1: CORE USER TABLES
-- Authentication, user accounts, sessions
-- ============================================================================

-- Users table (doctors, admins, patients)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('doctor', 'admin', 'patient')),
    name VARCHAR(255) NOT NULL,
    name_thai VARCHAR(255),
    avatar_url TEXT,
    phone VARCHAR(50),
    date_of_birth DATE,
    gender VARCHAR(20),
    national_id VARCHAR(20),
    
    -- Doctor-specific fields
    doctor_id VARCHAR(50),
    medical_license_number VARCHAR(50),
    specialty VARCHAR(100),
    hospital_name VARCHAR(255),
    
    -- Patient-specific fields
    patient_id VARCHAR(50),
    
    -- Status flags
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    approval_status VARCHAR(20) DEFAULT 'pending',
    
    -- Admin privileges (JSON)
    admin_privileges JSONB,
    is_admin BOOLEAN DEFAULT false,
    
    -- Preferences
    preferences JSONB DEFAULT '{"language": "th", "theme": "light", "notifications": true}'::jsonb,
    
    -- Notification settings (added from additions)
    notification_settings JSONB DEFAULT '{
        "appointments": true,
        "messages": true,
        "healthReminders": true,
        "promotions": false,
        "email": true,
        "push": true,
        "sms": false
    }'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    
    -- Security
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id),
    token TEXT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    logged_out_at TIMESTAMP WITH TIME ZONE
);

-- Password Resets table
CREATE TABLE IF NOT EXISTS password_resets (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id),
    token VARCHAR(128) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SECTION 2: PATIENT DATA TABLES
-- Patient profiles, PHR, health records
-- ============================================================================

-- Patient profiles
CREATE TABLE IF NOT EXISTS patient_profiles (
    patient_id VARCHAR(50) PRIMARY KEY REFERENCES users(id),
    demographics JSONB NOT NULL,
    emergency_contact JSONB,
    insurance_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PHR (Personal Health Records)
CREATE TABLE IF NOT EXISTS phr (
    id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) REFERENCES users(id),
    demographics JSONB,
    vital_signs_history JSONB DEFAULT '[]'::jsonb,
    allergies JSONB DEFAULT '[]'::jsonb,
    chronic_conditions JSONB DEFAULT '[]'::jsonb,
    medications JSONB DEFAULT '[]'::jsonb,
    vaccinations JSONB DEFAULT '[]'::jsonb,
    lifestyle JSONB,
    family_history JSONB DEFAULT '[]'::jsonb,
    surgical_history JSONB DEFAULT '[]'::jsonb,
    social_history JSONB,
    latest_lab_results JSONB DEFAULT '[]'::jsonb,
    clinical_decision_support JSONB,
    -- Additional fields from additions
    blood_type VARCHAR(10),
    height_cm DECIMAL(5,1),
    weight_kg DECIMAL(5,1),
    bmi DECIMAL(4,1),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    emergency_contact_relation VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP WITH TIME ZONE
);

-- Vital signs (normalized for trending)
CREATE TABLE IF NOT EXISTS vital_signs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id VARCHAR(50) REFERENCES users(id),
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    heart_rate INTEGER,
    temperature DECIMAL(4,1),
    respiratory_rate INTEGER,
    oxygen_saturation INTEGER,
    blood_glucose INTEGER,
    blood_glucose_type VARCHAR(20),
    weight DECIMAL(5,1),
    height DECIMAL(5,1),
    bmi DECIMAL(4,1),
    measured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(20) DEFAULT 'patient_input',
    notes TEXT
);

-- Living Will
CREATE TABLE IF NOT EXISTS living_wills (
    id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) REFERENCES users(id),
    statement TEXT,
    treatments JSONB,
    representatives JSONB,
    signature JSONB,
    pdpa_consent JSONB,
    status VARCHAR(20) DEFAULT 'active',
    signed_at TIMESTAMP WITH TIME ZONE,
    -- Additional fields from additions
    decisions JSONB DEFAULT '{}'::jsonb,
    witness_info JSONB DEFAULT '{}'::jsonb,
    signature_data TEXT,
    version INTEGER DEFAULT 1,
    restored_from VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    audit_log JSONB DEFAULT '[]'::jsonb
);

-- Living Will versions (for version history)
CREATE TABLE IF NOT EXISTS living_will_versions (
    id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) REFERENCES users(id),
    version INTEGER NOT NULL,
    data JSONB NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Patient consents (for PDPA compliance)
CREATE TABLE IF NOT EXISTS patient_consents (
    id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) REFERENCES users(id),
    consent_type VARCHAR(100) NOT NULL,
    granted BOOLEAN DEFAULT false,
    doctor_id VARCHAR(50),
    doctor_name VARCHAR(255),
    data_types JSONB DEFAULT '["all"]'::jsonb,
    granted_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoke_reason TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SECTION 3: DOCTOR DATA TABLES
-- Doctor profiles, schedules, consultants
-- ============================================================================

-- Doctor profiles
CREATE TABLE IF NOT EXISTS doctor_profiles (
    doctor_id VARCHAR(50) PRIMARY KEY REFERENCES users(id),
    specialty VARCHAR(100),
    sub_specialties JSONB,
    qualifications TEXT,
    experience_years INTEGER,
    hospital_name VARCHAR(255),
    department VARCHAR(100),
    languages JSONB DEFAULT '["Thai", "English"]'::jsonb,
    rating DECIMAL(2,1),
    total_reviews INTEGER DEFAULT 0,
    consultation_fee DECIMAL(10,2),
    is_available BOOLEAN DEFAULT true,
    schedule JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Doctors table (denormalized for quick lookups)
CREATE TABLE IF NOT EXISTS doctors (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_thai VARCHAR(255),
    specialty VARCHAR(100),
    specialty_thai VARCHAR(100),
    hospital VARCHAR(255),
    hospital_thai VARCHAR(255),
    avatar_url TEXT,
    rating DECIMAL(2,1) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    experience_years INTEGER,
    consultation_fee DECIMAL(10,2),
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Doctor schedules
CREATE TABLE IF NOT EXISTS doctor_schedules (
    id VARCHAR(50) PRIMARY KEY,
    doctor_id VARCHAR(50) REFERENCES users(id),
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INTEGER DEFAULT 30,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Doctor reviews
CREATE TABLE IF NOT EXISTS doctor_reviews (
    id VARCHAR(50) PRIMARY KEY,
    doctor_id VARCHAR(50) REFERENCES users(id),
    patient_id VARCHAR(50) REFERENCES users(id),
    appointment_id VARCHAR(50),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Medical consultants (specialist directory)
CREATE TABLE IF NOT EXISTS consultants (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    hospital VARCHAR(255),
    languages JSONB,
    experience_years INTEGER,
    bio TEXT,
    is_available BOOLEAN DEFAULT true,
    rating DECIMAL(2,1),
    reviews JSONB DEFAULT '[]'::jsonb,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SECTION 4: APPOINTMENT & CLINICAL TABLES
-- Appointments, EMR, prescriptions, lab orders
-- ============================================================================

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
    id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) REFERENCES users(id),
    doctor_id VARCHAR(50) REFERENCES users(id),
    
    -- Scheduling
    requested_date DATE,
    requested_time TIME,
    confirmed_date DATE,
    confirmed_time TIME,
    appointment_type VARCHAR(50) DEFAULT 'Telehealth',
    -- Additional fields from additions
    appointment_date DATE,
    appointment_time TIME,
    reason TEXT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending',
    urgency_level VARCHAR(20) DEFAULT 'normal',
    
    -- Clinical info
    symptoms JSONB DEFAULT '[]'::jsonb,
    symptom_description TEXT,
    ai_triage JSONB,
    notes TEXT,
    
    -- Meeting
    meet_link TEXT,
    meeting_link TEXT,
    jitsi_room_name VARCHAR(255),
    
    -- Invitees (relatives, consultants)
    invitees JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT
);

-- Meeting recordings and transcripts
CREATE TABLE IF NOT EXISTS meeting_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id VARCHAR(50) REFERENCES appointments(id),
    doctor_id VARCHAR(50) REFERENCES users(id),
    patient_id VARCHAR(50) REFERENCES users(id),
    room_id VARCHAR(100),
    room_name VARCHAR(255),
    jitsi_domain VARCHAR(255),
    meeting_url TEXT,
    doctor_url TEXT,
    patient_url TEXT,
    guest_url TEXT,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'waiting', 'active', 'in_progress', 'completed', 'cancelled')),
    meeting_config JSONB,
    recording_url TEXT,
    transcript TEXT,
    ai_summary TEXT,
    ai_recommendations TEXT,
    section_summaries JSONB,
    duration_minutes INTEGER,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Real-time meeting transcripts (NEW for Phase 1 - Near real-time like MS Teams)
CREATE TABLE IF NOT EXISTS meeting_transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_record_id UUID REFERENCES meeting_records(id),
    appointment_id VARCHAR(50) REFERENCES appointments(id),
    speaker_id VARCHAR(50) REFERENCES users(id),
    speaker_role VARCHAR(20) NOT NULL CHECK (speaker_role IN ('doctor', 'patient', 'guest')),
    speaker_name VARCHAR(255),
    content TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'th',
    confidence DECIMAL(3,2), -- Speech recognition confidence 0.00-1.00
    start_time_seconds INTEGER, -- Offset from meeting start
    end_time_seconds INTEGER,
    is_final BOOLEAN DEFAULT true, -- False for interim transcripts
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- EMR (Electronic Medical Records)
CREATE TABLE IF NOT EXISTS emr (
    id VARCHAR(50) PRIMARY KEY,
    appointment_id VARCHAR(50) REFERENCES appointments(id),
    patient_id VARCHAR(50) REFERENCES users(id),
    doctor_id VARCHAR(50) REFERENCES users(id),
    
    -- SOAP Notes (Thai Ministry of Health Standard)
    subjective JSONB,  -- Chief complaint, HPI, PMH, allergies
    objective JSONB,   -- Vital signs, physical exam, lab results
    assessment JSONB,  -- Diagnoses, ICD codes
    plan JSONB,        -- Treatment plan, medications, follow-up
    
    -- AI Summary for Patient (approved by doctor)
    ai_summary TEXT,
    ai_summary_approved BOOLEAN DEFAULT false,
    ai_summary_approved_at TIMESTAMP WITH TIME ZONE,
    
    -- AI Transcript from meeting
    ai_transcript TEXT,
    
    -- Patient Instruction Sheet
    patient_instructions TEXT,
    patient_instructions_thai TEXT,
    
    -- Signatures
    doctor_signature TEXT,
    signed_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
    id VARCHAR(50) PRIMARY KEY,
    emr_id VARCHAR(50) REFERENCES emr(id),
    appointment_id VARCHAR(50) REFERENCES appointments(id),
    patient_id VARCHAR(50) REFERENCES users(id),
    doctor_id VARCHAR(50) REFERENCES users(id),
    
    medications JSONB NOT NULL,
    pharmacy_instructions TEXT,
    
    -- Drug interaction warnings (CDS)
    cds_warnings JSONB,
    cds_approved BOOLEAN DEFAULT false,
    
    status VARCHAR(20) DEFAULT 'pending',
    dispensed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Lab orders
CREATE TABLE IF NOT EXISTS lab_orders (
    id VARCHAR(50) PRIMARY KEY,
    emr_id VARCHAR(50) REFERENCES emr(id),
    appointment_id VARCHAR(50) REFERENCES appointments(id),
    patient_id VARCHAR(50) REFERENCES users(id),
    doctor_id VARCHAR(50) REFERENCES users(id),
    
    tests JSONB NOT NULL,
    priority VARCHAR(20) DEFAULT 'routine',
    lab_name VARCHAR(255),
    
    results JSONB,
    ai_analysis TEXT,
    
    status VARCHAR(20) DEFAULT 'ordered',
    ordered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- SECTION 5: CONTENT TABLES
-- Medical content, clinical guidelines, reference data
-- ============================================================================

-- Medical content (health articles)
CREATE TABLE IF NOT EXISTS medical_content (
    id VARCHAR(50) PRIMARY KEY,
    title_thai VARCHAR(500) NOT NULL,
    title_english VARCHAR(500),
    content_thai TEXT NOT NULL,
    content_english TEXT,
    category VARCHAR(100),
    tags JSONB,
    author_id VARCHAR(50) REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'draft',
    published_at TIMESTAMP WITH TIME ZONE,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Clinical resources (guidelines, protocols)
CREATE TABLE IF NOT EXISTS clinical_resources (
    id VARCHAR(50) PRIMARY KEY,
    title_thai VARCHAR(500) NOT NULL,
    title_english VARCHAR(500),
    content_thai TEXT NOT NULL,
    content_english TEXT,
    category VARCHAR(100),
    specialty VARCHAR(100),
    guideline_year INTEGER,
    source VARCHAR(255),
    tags JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    approved_by VARCHAR(50) REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ICD-10 codes
CREATE TABLE IF NOT EXISTS icd10_codes (
    code VARCHAR(10) PRIMARY KEY,
    description_english VARCHAR(500),
    description_thai VARCHAR(500),
    category VARCHAR(100),
    chapter VARCHAR(10)
);

-- Drug database
CREATE TABLE IF NOT EXISTS drugs (
    id VARCHAR(50) PRIMARY KEY,
    generic_name VARCHAR(255) NOT NULL,
    brand_names JSONB,
    drug_class VARCHAR(100),
    dosage_forms JSONB,
    indications JSONB,
    contraindications JSONB,
    interactions JSONB,
    side_effects JSONB,
    pregnancy_category VARCHAR(5),
    renal_adjustment JSONB,  -- For CKD patients like PATIENT-ANAN
    hepatic_adjustment JSONB
);

-- ============================================================================
-- SECTION 6: AI & KNOWLEDGE TABLES (Phase 1 - P.Beer Recommendations)
-- ============================================================================

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(50) REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    title_thai VARCHAR(255),
    message TEXT,
    message_thai TEXT,
    data JSONB,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge base for RAG
CREATE TABLE IF NOT EXISTS knowledge_base (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    source VARCHAR(255),
    category VARCHAR(100),
    guideline_year VARCHAR(10),
    language VARCHAR(10) DEFAULT 'th',
    embedding vector(768),  -- Gemini embedding dimension
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chat history for AI Assistant
CREATE TABLE IF NOT EXISTS ai_chat_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id),
    session_id VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    context JSONB,  -- patient_id, appointment_id, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Document Analysis (for PDF summarization)
CREATE TABLE IF NOT EXISTS ai_document_analysis (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) REFERENCES users(id),
    doctor_id VARCHAR(50) REFERENCES users(id),
    document_type VARCHAR(50) NOT NULL,
    filename VARCHAR(255),
    file_path TEXT,
    mime_type VARCHAR(100),
    summary TEXT,
    key_findings JSONB DEFAULT '[]'::jsonb,
    abnormal_values JSONB DEFAULT '[]'::jsonb,
    raw_analysis JSONB,
    validation_status VARCHAR(20) DEFAULT 'pending',
    validated_by VARCHAR(50) REFERENCES users(id),
    validated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Clinical Decision Support logs
CREATE TABLE IF NOT EXISTS cds_logs (
    id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) REFERENCES users(id),
    doctor_id VARCHAR(50) NOT NULL REFERENCES users(id),
    appointment_id VARCHAR(50) REFERENCES appointments(id),
    recommendation_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    title TEXT NOT NULL,
    title_thai TEXT,
    description TEXT,
    description_thai TEXT,
    suggested_action TEXT,
    guideline_source VARCHAR(255),
    guideline_year VARCHAR(10),
    doctor_decision VARCHAR(20) CHECK (doctor_decision IN ('accepted', 'rejected', 'modified')),
    doctor_notes TEXT,
    decided_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Validations (Man-in-the-Loop audit trail)
CREATE TABLE IF NOT EXISTS ai_validations (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    patient_id VARCHAR(50) REFERENCES users(id),
    doctor_id VARCHAR(50) NOT NULL REFERENCES users(id),
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('approved', 'rejected')),
    notes TEXT,
    content_snapshot TEXT,
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SECTION 7: AUDIT & LOGGING TABLES
-- ============================================================================

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50),
    patient_id VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(50),
    details JSONB,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    performed_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SECTION 8: INDEXES
-- ============================================================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_approval_status ON users(approval_status);

-- Session indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Password reset indexes
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);

-- Patient data indexes
CREATE INDEX IF NOT EXISTS idx_phr_patient_id ON phr(patient_id);
CREATE INDEX IF NOT EXISTS idx_vital_signs_patient_id ON vital_signs(patient_id);
CREATE INDEX IF NOT EXISTS idx_vital_signs_measured_at ON vital_signs(measured_at);
CREATE INDEX IF NOT EXISTS idx_patient_consents_patient_id ON patient_consents(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_consents_doctor_id ON patient_consents(doctor_id);
CREATE INDEX IF NOT EXISTS idx_patient_consents_status ON patient_consents(status);
CREATE INDEX IF NOT EXISTS idx_living_will_versions_patient_id ON living_will_versions(patient_id);

-- Doctor data indexes
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors(specialty);
CREATE INDEX IF NOT EXISTS idx_doctors_is_available ON doctors(is_available);
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doctor_id ON doctor_schedules(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_reviews_doctor_id ON doctor_reviews(doctor_id);

-- Appointment indexes
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(confirmed_date);

-- Clinical indexes
CREATE INDEX IF NOT EXISTS idx_emr_appointment_id ON emr(appointment_id);
CREATE INDEX IF NOT EXISTS idx_emr_patient_id ON emr(patient_id);
CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_appointment_id ON meeting_transcripts(appointment_id);
CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_meeting_record_id ON meeting_transcripts(meeting_record_id);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);

-- AI indexes
CREATE INDEX IF NOT EXISTS idx_ai_chat_user_id ON ai_chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_session ON ai_chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_document_analysis_patient_id ON ai_document_analysis(patient_id);
CREATE INDEX IF NOT EXISTS idx_ai_document_analysis_doctor_id ON ai_document_analysis(doctor_id);
CREATE INDEX IF NOT EXISTS idx_ai_validations_doctor_id ON ai_validations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_ai_validations_patient_id ON ai_validations(patient_id);
CREATE INDEX IF NOT EXISTS idx_ai_validations_type ON ai_validations(type);
CREATE INDEX IF NOT EXISTS idx_cds_logs_patient_id ON cds_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_cds_logs_doctor_id ON cds_logs(doctor_id);

-- Vector index for RAG
CREATE INDEX IF NOT EXISTS idx_knowledge_embedding ON knowledge_base USING ivfflat (embedding vector_cosine_ops);

-- Audit indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================================
-- SECTION 9: TRIGGERS
-- ============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to relevant tables
DO $$ 
BEGIN
    -- Users table trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- PHR table trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_phr_updated_at') THEN
        CREATE TRIGGER update_phr_updated_at BEFORE UPDATE ON phr
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Appointments table trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_appointments_updated_at') THEN
        CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- EMR table trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_emr_updated_at') THEN
        CREATE TRIGGER update_emr_updated_at BEFORE UPDATE ON emr
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================================================
-- SECTION 10: VIEWS
-- ============================================================================

-- Active appointments view
CREATE OR REPLACE VIEW v_active_appointments AS
SELECT 
    a.*,
    p.name as patient_name,
    p.name_thai as patient_name_thai,
    d.name as doctor_name,
    d.name_thai as doctor_name_thai,
    d.specialty as doctor_specialty
FROM appointments a
LEFT JOIN users p ON a.patient_id = p.id
LEFT JOIN users d ON a.doctor_id = d.id
WHERE a.status NOT IN ('completed', 'cancelled');

-- Patient summary view
CREATE OR REPLACE VIEW v_patient_summary AS
SELECT 
    u.id,
    u.name,
    u.name_thai,
    u.email,
    phr.demographics,
    phr.allergies,
    phr.chronic_conditions,
    phr.medications,
    phr.clinical_decision_support
FROM users u
LEFT JOIN phr ON u.id = phr.patient_id
WHERE u.role = 'patient';

-- Doctor summary view
CREATE OR REPLACE VIEW v_doctor_summary AS
SELECT 
    u.id,
    u.name,
    u.name_thai,
    u.email,
    u.specialty,
    u.hospital_name,
    u.is_approved,
    u.approval_status,
    dp.rating,
    dp.total_reviews,
    dp.is_available
FROM users u
LEFT JOIN doctor_profiles dp ON u.id = dp.doctor_id
WHERE u.role = 'doctor';

-- Pending doctor approvals view
CREATE OR REPLACE VIEW v_pending_doctors AS
SELECT 
    id,
    name,
    name_thai,
    email,
    specialty,
    hospital_name,
    medical_license_number,
    created_at
FROM users
WHERE role = 'doctor' AND approval_status = 'pending';

-- ============================================================================
-- SECTION 11: INITIAL DATA - Test Users
-- ============================================================================

-- Admin user (password: IzaraAdmin@2024)
INSERT INTO users (id, email, password_hash, role, name, name_thai, is_active, is_verified, is_approved, approval_status, is_admin, admin_privileges)
VALUES (
    'ADMIN-TEST-001',
    'admin.test@izara.com',
    '$2b$10$fx5arkpb8YI7lEK5lcHdXeksczdG.qloim/uWghlBZXyxv.dNo/wq',
    'admin',
    'Admin Test',
    'ผู้ดูแลระบบ ทดสอบ',
    true, true, true, 'approved', true,
    '{"canManageDoctors": true, "canManagePatients": true, "canManageAppointments": true, "canViewAnalytics": true, "canManageSettings": true, "level": "super_admin"}'
) ON CONFLICT (id) DO NOTHING;

-- Doctor user (password: IzaraDoctor@2024)
INSERT INTO users (id, email, password_hash, role, name, name_thai, doctor_id, medical_license_number, specialty, is_active, is_verified, is_approved, approval_status)
VALUES (
    'DOC-TEST-001',
    'doctor.test@izara.com',
    '$2b$10$aPN6uhBrLoms36C8/017be2GWqUqaPJa6WaTaZ8LrnwAeaf3GajrO',
    'doctor',
    'Doctor Test',
    'นายแพทย์ ทดสอบ ระบบ',
    'DOC-TEST-001',
    'TH-MD-2020-001',
    'Internal Medicine',
    true, true, true, 'approved'
) ON CONFLICT (id) DO NOTHING;

-- Patient: Somchai Mankong (password: P@ssw0rd)
INSERT INTO users (id, email, password_hash, role, name, name_thai, patient_id, is_active, is_verified, is_approved, approval_status)
VALUES (
    'PATIENT-SOMCHAI',
    'Somchai.Mankong@gmail.com',
    '$2b$10$64bK0EpjyC7quRGJNvRqmuH/jX3mA4dzyzYa2vgA2q.H3ZxkQwAmy',
    'patient',
    'Somchai Mankong',
    'นายสมชาย มั่นคง',
    'PATIENT-SOMCHAI',
    true, true, true, 'approved'
) ON CONFLICT (id) DO NOTHING;

-- Patient: Anan Khayanrian - Complex case with DM + CKD (password: P@ssw0rd)
INSERT INTO users (id, email, password_hash, role, name, name_thai, patient_id, is_active, is_verified, is_approved, approval_status)
VALUES (
    'PATIENT-ANAN',
    'Anan.Khayanrian@gmail.com',
    '$2b$10$64bK0EpjyC7quRGJNvRqmuH/jX3mA4dzyzYa2vgA2q.H3ZxkQwAmy',
    'patient',
    'Anan Khayanrian',
    'นายอนันต์ ขยันเรียน',
    'PATIENT-ANAN',
    true, true, true, 'approved'
) ON CONFLICT (id) DO NOTHING;

-- Patient: Demo Test Patient (password: P@ssw0rd)
INSERT INTO users (id, email, password_hash, role, name, name_thai, patient_id, is_active, is_verified, is_approved, approval_status)
VALUES (
    'PATIENT-DEMO',
    'demo.test@gmail.com',
    '$2b$10$64bK0EpjyC7quRGJNvRqmuH/jX3mA4dzyzYa2vgA2q.H3ZxkQwAmy',
    'patient',
    'Demo Test Patient',
    'นาย ทดสอบ ระบบ',
    'PATIENT-DEMO',
    true, true, true, 'approved'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SECTION 12: SAMPLE DATA
-- ============================================================================

-- Sample doctors for quick lookups
INSERT INTO doctors (id, name, name_thai, specialty, specialty_thai, hospital, hospital_thai, avatar_url, rating, review_count, experience_years, consultation_fee, is_available)
VALUES 
    ('DOC-001', 'Dr. Somchai Prasert', 'นพ.สมชาย ประเสริฐ', 'Internal Medicine', 'อายุรกรรม', 'Bangkok General Hospital', 'โรงพยาบาลกรุงเทพ', 'https://i.pravatar.cc/150?u=doc1', 4.8, 125, 15, 500.00, true),
    ('DOC-002', 'Dr. Siriporn Thongchai', 'พญ.ศิริพร ทองชัย', 'Cardiology', 'หทัยวิทยา', 'Bumrungrad Hospital', 'โรงพยาบาลบำรุงราษฎร์', 'https://i.pravatar.cc/150?u=doc2', 4.9, 200, 20, 800.00, true),
    ('DOC-003', 'Dr. Wichai Sawangpong', 'นพ.วิชัย สว่างพงศ์', 'Dermatology', 'ผิวหนัง', 'Samitivej Hospital', 'โรงพยาบาลสมิติเวช', 'https://i.pravatar.cc/150?u=doc3', 4.7, 89, 12, 600.00, true),
    ('DOC-004', 'Dr. Nattaya Suksawat', 'พญ.ณัฏฐยา สุขสวัสดิ์', 'Pediatrics', 'กุมารเวชกรรม', 'Chulalongkorn Hospital', 'โรงพยาบาลจุฬาลงกรณ์', 'https://i.pravatar.cc/150?u=doc4', 4.6, 150, 10, 450.00, true),
    ('DOC-TEST-001', 'Dr. Test Doctor', 'นพ.ทดสอบ ระบบ', 'General Medicine', 'เวชปฏิบัติทั่วไป', 'Izara Test Hospital', 'โรงพยาบาลอิซาร่า ทดสอบ', 'https://i.pravatar.cc/150?u=doctest', 5.0, 10, 5, 300.00, true)
ON CONFLICT (id) DO NOTHING;

-- Sample PHR for complex patient (Anan - DM + CKD for CDS testing)
INSERT INTO phr (id, patient_id, demographics, allergies, chronic_conditions, medications, clinical_decision_support)
VALUES (
    'PHR-ANAN',
    'PATIENT-ANAN',
    '{"age": 58, "gender": "male", "bloodType": "A+"}',
    '[{"name": "Penicillin", "severity": "severe", "reaction": "Anaphylaxis"}, {"name": "Sulfa drugs", "severity": "moderate", "reaction": "Rash"}]',
    '[{"name": "Type 2 Diabetes Mellitus", "icd10": "E11.9", "diagnosedDate": "2018-03-15"}, {"name": "Chronic Kidney Disease Stage 3b", "icd10": "N18.4", "diagnosedDate": "2022-06-10", "details": "eGFR 38 ml/min/1.73m2"}]',
    '[{"name": "Metformin", "dose": "500mg", "frequency": "BID", "notes": "May need adjustment for CKD"}, {"name": "Lisinopril", "dose": "10mg", "frequency": "QD"}, {"name": "Atorvastatin", "dose": "20mg", "frequency": "QD"}]',
    '{"alerts": [{"type": "dose_adjustment", "severity": "warning", "drug": "Metformin", "message": "Consider dose reduction for eGFR < 45", "guideline": "KDIGO 2024"}]}'
) ON CONFLICT (id) DO NOTHING;

-- Sample PHR for Somchai
INSERT INTO phr (id, patient_id, demographics, allergies, chronic_conditions, medications)
VALUES (
    'PHR-SOMCHAI',
    'PATIENT-SOMCHAI',
    '{"age": 45, "gender": "male", "bloodType": "O+"}',
    '[]',
    '[{"name": "Hypertension", "icd10": "I10", "diagnosedDate": "2020-01-15"}]',
    '[{"name": "Amlodipine", "dose": "5mg", "frequency": "QD"}]'
) ON CONFLICT (id) DO NOTHING;

-- Sample medical content
INSERT INTO medical_content (id, title_thai, title_english, content_thai, content_english, category, tags, status, published_at)
VALUES 
    ('content-001', 'การดูแลสุขภาพหัวใจ', 'Heart Health Care', 
     'การดูแลหัวใจที่ดีเริ่มต้นจากการรับประทานอาหารที่มีประโยชน์ ออกกำลังกายสม่ำเสมอ และหลีกเลี่ยงความเครียด', 
     'Good heart care starts with eating healthy foods, exercising regularly, and avoiding stress.',
     'Cardiology', '["heart", "health", "exercise"]', 'published', NOW()),
    ('content-002', 'การจัดการโรคเบาหวาน', 'Diabetes Management',
     'การควบคุมน้ำตาลในเลือดเป็นสิ่งสำคัญสำหรับผู้ป่วยเบาหวาน ควรตรวจน้ำตาลเป็นประจำและรับประทานยาตามแพทย์สั่ง',
     'Blood sugar control is important for diabetic patients. Regular monitoring and medication as prescribed are essential.',
     'Endocrinology', '["diabetes", "blood sugar", "health"]', 'published', NOW()),
    ('content-003', 'การนอนหลับที่ดี', 'Good Sleep Habits',
     'การนอนหลับที่มีคุณภาพช่วยให้ร่างกายและจิตใจได้พักผ่อน ควรนอนให้ได้ 7-8 ชั่วโมงต่อวัน',
     'Quality sleep helps the body and mind rest. Aim for 7-8 hours of sleep per day.',
     'General Health', '["sleep", "wellness", "health"]', 'published', NOW())
ON CONFLICT (id) DO NOTHING;

-- Sample clinical resources
INSERT INTO clinical_resources (id, title_thai, title_english, content_thai, content_english, category, specialty, guideline_year, source, status)
VALUES 
    ('resource-001', 'แนวทางการรักษาโรคความดันโลหิตสูง', 'Hypertension Treatment Guidelines',
     'แนวทางการรักษาโรคความดันโลหิตสูงตามมาตรฐานกระทรวงสาธารณสุข',
     'Hypertension treatment guidelines according to Ministry of Public Health standards.',
     'Treatment Guidelines', 'Cardiology', 2024, 'Ministry of Public Health Thailand', 'approved'),
    ('resource-002', 'คู่มือการตรวจสุขภาพประจำปี', 'Annual Health Checkup Guide',
     'คู่มือสำหรับการตรวจสุขภาพประจำปีสำหรับผู้ใหญ่ทุกวัย',
     'Guide for annual health checkups for adults of all ages.',
     'Prevention', 'General Medicine', 2024, 'Thai Medical Association', 'approved')
ON CONFLICT (id) DO NOTHING;

-- Sample knowledge base entries for RAG
INSERT INTO knowledge_base (id, title, content, source, category, guideline_year, language)
VALUES 
    (1, 'KDIGO 2024 CKD Guideline - Metformin', 
     'Metformin dose adjustment for CKD: eGFR 30-45: Reduce dose by 50%. eGFR <30: Contraindicated. Monitor renal function every 3 months.',
     'KDIGO 2024', 'nephrology', '2024', 'en'),
    (2, 'ADA 2025 Diabetes Standards - Glucose Targets',
     'A1C target <7% for most adults. Consider <8% for older adults with comorbidities. Fasting glucose 80-130 mg/dL.',
     'ADA Standards of Care 2025', 'diabetes', '2025', 'en'),
    (3, 'แนวทางปรับยา Metformin ในผู้ป่วยโรคไต',
     'การปรับขนาดยา Metformin ตาม eGFR: 30-45: ลดขนาดยาลง 50%. <30: ห้ามใช้. ตรวจการทำงานของไตทุก 3 เดือน.',
     'KDIGO 2024 (Thai)', 'nephrology', '2024', 'th')
ON CONFLICT (id) DO NOTHING;

-- Sample appointments for testing
INSERT INTO appointments (id, patient_id, doctor_id, requested_date, requested_time, confirmed_date, confirmed_time, status, symptoms, symptom_description, urgency_level, jitsi_room_name)
VALUES 
    ('APT-001', 'PATIENT-SOMCHAI', 'DOC-TEST-001', CURRENT_DATE, '09:00', CURRENT_DATE, '09:00', 'confirmed', 
     '["headache", "fatigue"]', 'ปวดหัวและเหนื่อยมา 3 วัน', 'normal', 'izara-apt-001'),
    ('APT-002', 'PATIENT-ANAN', 'DOC-TEST-001', CURRENT_DATE, '10:30', CURRENT_DATE, '10:30', 'confirmed',
     '["diabetes_follow_up", "kidney_check"]', 'นัดติดตามผลเบาหวานและโรคไต', 'normal', 'izara-apt-002'),
    ('APT-003', 'PATIENT-DEMO', 'DOC-TEST-001', CURRENT_DATE + 1, '14:00', NULL, NULL, 'pending',
     '["chest_pain"]', 'เจ็บหน้าอกเป็นพักๆ', 'urgent', NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SECTION 13: GRANT PERMISSIONS (for application user)
-- ============================================================================

-- Create application user if not exists (optional - depends on deployment)
-- DO $$
-- BEGIN
--     IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'izara_app') THEN
--         CREATE ROLE izara_app WITH LOGIN PASSWORD 'your_secure_password';
--     END IF;
-- END $$;

-- Grant permissions to application user
-- GRANT USAGE ON SCHEMA public TO izara_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO izara_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO izara_app;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
