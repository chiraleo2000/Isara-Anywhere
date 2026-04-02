-- sqlfluff: dialect=postgres
-- =============================================================================
-- IZARA TELEMEDICINE - UNIFIED DATABASE INITIALIZATION
-- =============================================================================
-- Version: 5.1.0
-- Updated: 2026-01-27
-- Author: Izara Development Team
-- 
-- Purpose: Complete database schema + seed data for PostgreSQL Docker service.
--          NO Cloud SQL - PostgreSQL runs as Docker container alongside portals.
--
-- =============================================================================
-- USAGE
-- =============================================================================
--
-- Local Docker (bash):
--   docker exec -i izara-postgres psql -U postgres -d izara_phase1 < scripts/database/izara-database.sql
--
-- PowerShell (with Docker):
--   Get-Content scripts\database\izara-database.sql | docker exec -i izara-postgres psql -U postgres -d izara_phase1
--
-- =============================================================================
-- TEST CREDENTIALS
-- =============================================================================
-- 
-- Patient Accounts (password: P@ssw0rd)
--   - demo.test@gmail.com (Demo Patient)
--   - Somchai.Mankong@gmail.com (นายสมชาย มั่นคง)
--   - Anan.Khayanrian@gmail.com (นายอนันต์ ขยันเรียน - DM + CKD patient)
--
-- Doctor Account (password: IzaraDoctor@2024)
--   - doctor.test@izara.com (นพ. ทดสอบ แพทย์ดี)
--
-- Admin Account (password: IzaraAdmin@2024)
--   - admin.test@izara.com (นพ. ผู้ดูแลระบบ ใจดี)
--
-- =============================================================================

\echo '=============================================='
\echo 'IZARA TELEMEDICINE - DATABASE INITIALIZATION'
\echo '=============================================='
\echo ''

-- =============================================================================
-- SECTION 1: EXTENSIONS
-- =============================================================================
\echo '>>> Installing PostgreSQL Extensions...'

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- =============================================================================
-- SECTION 2: DROP EXISTING OBJECTS (Clean Slate)
-- =============================================================================
\echo '>>> Dropping existing tables...'

-- Drop in reverse dependency order
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS ai_validations CASCADE;
DROP TABLE IF EXISTS cds_logs CASCADE;
DROP TABLE IF EXISTS ai_document_analysis CASCADE;
DROP TABLE IF EXISTS ai_chat_history CASCADE;
DROP TABLE IF EXISTS knowledge_base CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS clinical_resources CASCADE;
DROP TABLE IF EXISTS medical_content CASCADE;
DROP TABLE IF EXISTS drugs CASCADE;
DROP TABLE IF EXISTS icd10_codes CASCADE;
DROP TABLE IF EXISTS lab_orders CASCADE;
DROP TABLE IF EXISTS prescriptions CASCADE;
DROP TABLE IF EXISTS emr CASCADE;
DROP TABLE IF EXISTS meeting_transcripts CASCADE;
DROP TABLE IF EXISTS meeting_records CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS consultants CASCADE;
DROP TABLE IF EXISTS doctor_reviews CASCADE;
DROP TABLE IF EXISTS doctor_schedules CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;
DROP TABLE IF EXISTS doctor_profiles CASCADE;
DROP TABLE IF EXISTS patient_consents CASCADE;
DROP TABLE IF EXISTS living_will_versions CASCADE;
DROP TABLE IF EXISTS living_wills CASCADE;
DROP TABLE IF EXISTS vital_signs CASCADE;
DROP TABLE IF EXISTS phr CASCADE;
DROP TABLE IF EXISTS patient_profiles CASCADE;
DROP TABLE IF EXISTS password_resets CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =============================================================================
-- SECTION 3: CORE USER TABLES
-- =============================================================================
\echo '>>> Creating core user tables...'

-- Users Table (unified for all roles: patient, doctor, admin)
CREATE TABLE users (
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
    -- Status fields
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    approval_status VARCHAR(20) DEFAULT 'pending',
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by VARCHAR(50),
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejected_by VARCHAR(50),
    -- Admin fields
    admin_privileges JSONB,
    is_admin BOOLEAN DEFAULT false,
    -- Settings
    preferences JSONB DEFAULT '{"language": "th", "theme": "light", "notifications": true}'::jsonb,
    notification_settings JSONB DEFAULT '{"appointments": true, "messages": true, "healthReminders": true, "promotions": false, "email": true, "push": true, "sms": false}'::jsonb,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    -- Security
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE
);

-- Sessions Table (JWT token storage)
CREATE TABLE sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id),
    token TEXT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    logged_out_at TIMESTAMP WITH TIME ZONE
);

-- Password Reset Tokens
CREATE TABLE password_resets (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id),
    token VARCHAR(128) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- SECTION 4: PATIENT DATA TABLES
-- =============================================================================
\echo '>>> Creating patient data tables...'

-- Patient Profiles (demographics, emergency contact, insurance)
CREATE TABLE patient_profiles (
    patient_id VARCHAR(50) PRIMARY KEY REFERENCES users(id),
    demographics JSONB NOT NULL,
    emergency_contact JSONB,
    insurance_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Personal Health Records (PHR)
CREATE TABLE phr (
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

-- Vital Signs (individual measurements)
CREATE TABLE vital_signs (
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

-- Living Wills (Advance Directives)
CREATE TABLE living_wills (
    id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) REFERENCES users(id),
    statement TEXT,
    treatments JSONB,
    representatives JSONB,
    signature JSONB,
    pdpa_consent JSONB,
    status VARCHAR(20) DEFAULT 'active',
    signed_at TIMESTAMP WITH TIME ZONE,
    decisions JSONB DEFAULT '{}'::jsonb,
    witness_info JSONB DEFAULT '{}'::jsonb,
    signature_data TEXT,
    version INTEGER DEFAULT 1,
    restored_from VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    audit_log JSONB DEFAULT '[]'::jsonb
);

-- Living Will Version History
CREATE TABLE living_will_versions (
    id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) REFERENCES users(id),
    version INTEGER NOT NULL,
    data JSONB NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Patient Consents (data sharing permissions)
CREATE TABLE patient_consents (
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

-- =============================================================================
-- SECTION 5: DOCTOR DATA TABLES
-- =============================================================================
\echo '>>> Creating doctor data tables...'

-- Doctor Profiles (extended info)
CREATE TABLE doctor_profiles (
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

-- Doctors (simplified listing for patient-facing features)
CREATE TABLE doctors (
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

-- Doctor Schedules (availability slots)
CREATE TABLE doctor_schedules (
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

-- Doctor Reviews (patient feedback)
CREATE TABLE doctor_reviews (
    id VARCHAR(50) PRIMARY KEY,
    doctor_id VARCHAR(50) REFERENCES users(id),
    patient_id VARCHAR(50) REFERENCES users(id),
    appointment_id VARCHAR(50),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Medical Consultants (external specialists)
CREATE TABLE consultants (
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
    created_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- SECTION 6: APPOINTMENT & MEETING TABLES
-- =============================================================================
\echo '>>> Creating appointment tables...'

-- Appointments (telehealth consultations)
CREATE TABLE appointments (
    id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) REFERENCES users(id),
    doctor_id VARCHAR(50) REFERENCES users(id),
    -- Scheduling fields
    requested_date DATE,
    requested_time TIME,
    confirmed_date DATE,
    confirmed_time TIME,
    appointment_type VARCHAR(50) DEFAULT 'Telehealth',
    appointment_date DATE,
    appointment_time TIME,
    -- Clinical info
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    urgency_level VARCHAR(20) DEFAULT 'normal',
    symptoms JSONB DEFAULT '[]'::jsonb,
    symptom_description TEXT,
    ai_triage JSONB,
    notes TEXT,
    -- Meeting links
    meet_link TEXT,
    meeting_link TEXT,
    jitsi_room_name VARCHAR(255),
    doctor_meeting_url TEXT,
    patient_meeting_url TEXT,
    guest_meeting_url TEXT,
    invitees JSONB DEFAULT '[]'::jsonb,
    -- Confirmation tracking
    confirmed_by VARCHAR(50),
    confirmed_by_email VARCHAR(255),
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT
);

-- Meeting Records (video consultation sessions)
CREATE TABLE meeting_records (
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
    -- AI-generated content
    recording_url TEXT,
    transcript TEXT,
    ai_summary TEXT,
    ai_recommendations TEXT,
    section_summaries JSONB,
    -- Timing
    duration_minutes INTEGER,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Meeting Transcripts (speech-to-text segments)
CREATE TABLE meeting_transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_record_id UUID REFERENCES meeting_records(id),
    appointment_id VARCHAR(50) REFERENCES appointments(id),
    speaker_id VARCHAR(50) REFERENCES users(id),
    speaker_role VARCHAR(20) NOT NULL CHECK (speaker_role IN ('doctor', 'patient', 'guest')),
    speaker_name VARCHAR(255),
    content TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'th',
    confidence DECIMAL(3,2),
    start_time_seconds INTEGER,
    end_time_seconds INTEGER,
    is_final BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- SECTION 7: CLINICAL DATA TABLES
-- =============================================================================
\echo '>>> Creating clinical data tables...'

-- Electronic Medical Records (EMR)
CREATE TABLE emr (
    id VARCHAR(50) PRIMARY KEY,
    appointment_id VARCHAR(50) REFERENCES appointments(id),
    patient_id VARCHAR(50) REFERENCES users(id),
    doctor_id VARCHAR(50) REFERENCES users(id),
    -- SOAP Notes
    subjective JSONB,
    objective JSONB,
    assessment JSONB,
    plan JSONB,
    -- AI assistance
    ai_summary TEXT,
    ai_summary_approved BOOLEAN DEFAULT false,
    ai_summary_approved_at TIMESTAMP WITH TIME ZONE,
    ai_transcript TEXT,
    -- Patient instructions
    patient_instructions TEXT,
    patient_instructions_thai TEXT,
    -- Signing
    doctor_signature TEXT,
    signed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'draft',
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Prescriptions
CREATE TABLE prescriptions (
    id VARCHAR(50) PRIMARY KEY,
    emr_id VARCHAR(50) REFERENCES emr(id),
    appointment_id VARCHAR(50) REFERENCES appointments(id),
    patient_id VARCHAR(50) REFERENCES users(id),
    doctor_id VARCHAR(50) REFERENCES users(id),
    medications JSONB NOT NULL,
    pharmacy_instructions TEXT,
    cds_warnings JSONB,
    cds_approved BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'pending',
    dispensed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Lab Orders
CREATE TABLE lab_orders (
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

-- =============================================================================
-- SECTION 8: CONTENT TABLES
-- =============================================================================
\echo '>>> Creating content tables...'

-- Medical Content (patient education)
-- Categories: general-health, nutrition, exercise, mental-health, 
--             chronic-disease, preventive-care, medications, first-aid
CREATE TABLE medical_content (
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
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Clinical Resources (doctor resources)
CREATE TABLE clinical_resources (
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
    image_url TEXT,
    author_id VARCHAR(50) REFERENCES users(id),
    author_name VARCHAR(255),
    approved_by VARCHAR(50) REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ICD-10 Codes (diagnosis codes)
CREATE TABLE icd10_codes (
    code VARCHAR(10) PRIMARY KEY,
    description_english VARCHAR(500),
    description_thai VARCHAR(500),
    category VARCHAR(100),
    chapter VARCHAR(10)
);

-- Drug Database
CREATE TABLE drugs (
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
    renal_adjustment JSONB,
    hepatic_adjustment JSONB
);

-- =============================================================================
-- SECTION 9: AI & KNOWLEDGE TABLES
-- =============================================================================
\echo '>>> Creating AI and knowledge tables...'

-- Notifications
CREATE TABLE notifications (
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

-- Knowledge Base (RAG for AI)
CREATE TABLE knowledge_base (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    source VARCHAR(255),
    category VARCHAR(100),
    guideline_year VARCHAR(10),
    language VARCHAR(10) DEFAULT 'th',
    embedding vector(768),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Chat History
CREATE TABLE ai_chat_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id),
    session_id VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    context JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Document Analysis
CREATE TABLE ai_document_analysis (
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

-- Clinical Decision Support Logs
CREATE TABLE cds_logs (
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

-- AI Validation Logs
CREATE TABLE ai_validations (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    patient_id VARCHAR(50) REFERENCES users(id),
    doctor_id VARCHAR(50) NOT NULL REFERENCES users(id),
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('approved', 'rejected')),
    notes TEXT,
    content_snapshot TEXT,
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- SECTION 10: AUDIT TABLES
-- =============================================================================
\echo '>>> Creating audit tables...'

CREATE TABLE audit_logs (
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

-- =============================================================================
-- SECTION 11: INDEXES
-- =============================================================================
\echo '>>> Creating indexes...'

-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_approval_status ON users(approval_status);

-- Session indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Patient data indexes
CREATE INDEX idx_phr_patient_id ON phr(patient_id);
CREATE INDEX idx_vital_signs_patient_id ON vital_signs(patient_id);
CREATE INDEX idx_vital_signs_measured_at ON vital_signs(measured_at);
CREATE INDEX idx_patient_consents_patient_id ON patient_consents(patient_id);

-- Doctor indexes
CREATE INDEX idx_doctors_specialty ON doctors(specialty);
CREATE INDEX idx_doctors_is_available ON doctors(is_available);
CREATE INDEX idx_doctor_schedules_doctor_id ON doctor_schedules(doctor_id);

-- Appointment indexes
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_date ON appointments(confirmed_date);

-- Clinical indexes
CREATE INDEX idx_emr_appointment_id ON emr(appointment_id);
CREATE INDEX idx_emr_patient_id ON emr(patient_id);
CREATE INDEX idx_meeting_transcripts_appointment_id ON meeting_transcripts(appointment_id);

-- Notification indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);

-- AI indexes
CREATE INDEX idx_ai_chat_user_id ON ai_chat_history(user_id);
CREATE INDEX idx_ai_chat_session ON ai_chat_history(session_id);
CREATE INDEX idx_cds_logs_patient_id ON cds_logs(patient_id);
CREATE INDEX idx_cds_logs_doctor_id ON cds_logs(doctor_id);

-- Vector index for knowledge base (RAG)
CREATE INDEX idx_knowledge_embedding ON knowledge_base USING ivfflat (embedding vector_cosine_ops);

-- Audit indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- =============================================================================
-- SECTION 12: TRIGGERS
-- =============================================================================
\echo '>>> Creating triggers...'

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_phr_updated_at BEFORE UPDATE ON phr
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emr_updated_at BEFORE UPDATE ON emr
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SECTION 13: VIEWS
-- =============================================================================
\echo '>>> Creating views...'

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
    u.id, u.name, u.name_thai, u.email,
    phr.demographics, phr.allergies, phr.chronic_conditions, 
    phr.medications, phr.clinical_decision_support
FROM users u
LEFT JOIN phr ON u.id = phr.patient_id
WHERE u.role = 'patient';

-- Doctor summary view
CREATE OR REPLACE VIEW v_doctor_summary AS
SELECT 
    u.id, u.name, u.name_thai, u.email, u.specialty, 
    u.hospital_name, u.is_approved, u.approval_status,
    dp.rating, dp.total_reviews, dp.is_available
FROM users u
LEFT JOIN doctor_profiles dp ON u.id = dp.doctor_id
WHERE u.role = 'doctor';

-- =============================================================================
-- SECTION 14: SEED DATA - USERS
-- =============================================================================
\echo '>>> Seeding users...'

-- Admin (password: IzaraAdmin@2024)
INSERT INTO users (id, email, password_hash, role, name, name_thai, is_active, is_verified, is_approved, approval_status, is_admin, admin_privileges)
VALUES ('ADMIN-TEST-001', 'admin.test@izara.com', '$2b$10$fx5arkpb8YI7lEK5lcHdXeksczdG.qloim/uWghlBZXyxv.dNo/wq', 'admin', 'Dr. Admin Kind', 'นพ. ผู้ดูแลระบบ ใจดี', true, true, true, 'approved', true, '{"canManageDoctors": true, "canManagePatients": true, "canManageAppointments": true, "canViewAnalytics": true, "canManageSettings": true, "level": "super_admin"}'::jsonb);

-- Doctor Test (password: IzaraDoctor@2024)
INSERT INTO users (id, email, password_hash, role, name, name_thai, doctor_id, medical_license_number, specialty, is_active, is_verified, is_approved, approval_status)
VALUES ('DOC-TEST-001', 'doctor.test@izara.com', '$2b$10$aPN6uhBrLoms36C8/017be2GWqUqaPJa6WaTaZ8LrnwAeaf3GajrO', 'doctor', 'Dr. Test Good', 'นพ. ทดสอบ แพทย์ดี', 'DOC-TEST-001', 'TH-MD-2020-001', 'Internal Medicine', true, true, true, 'approved');

-- Dr. Somchai Prasert (Cardiologist)
INSERT INTO users (id, email, password_hash, role, name, name_thai, doctor_id, medical_license_number, specialty, hospital_name, is_active, is_verified, is_approved, approval_status)
VALUES ('DOC-SOMCHAI-001', 'somchai.prasert@izara.com', '$2b$10$aPN6uhBrLoms36C8/017be2GWqUqaPJa6WaTaZ8LrnwAeaf3GajrO', 'doctor', 'Dr. Somchai Prasert', 'นพ.สมชาย ประเสริฐ', 'DOC-SOMCHAI-001', 'TH-MD-2010-100', 'Cardiology', 'Bangkok General Hospital', true, true, true, 'approved');

-- Dr. Siriporn Thongchai (Endocrinologist)
INSERT INTO users (id, email, password_hash, role, name, name_thai, doctor_id, medical_license_number, specialty, hospital_name, is_active, is_verified, is_approved, approval_status)
VALUES ('DOC-SIRIPORN-001', 'siriporn.thongchai@izara.com', '$2b$10$aPN6uhBrLoms36C8/017be2GWqUqaPJa6WaTaZ8LrnwAeaf3GajrO', 'doctor', 'Dr. Siriporn Thongchai', 'พญ.ศิริพร ทองชัย', 'DOC-SIRIPORN-001', 'TH-MD-2008-055', 'Endocrinology', 'Bumrungrad Hospital', true, true, true, 'approved');

-- Patient: Somchai Mankong (password: P@ssw0rd)
INSERT INTO users (id, email, password_hash, role, name, name_thai, patient_id, is_active, is_verified, is_approved, approval_status)
VALUES ('PATIENT-SOMCHAI', 'Somchai.Mankong@gmail.com', '$2b$10$64bK0EpjyC7quRGJNvRqmuH/jX3mA4dzyzYa2vgA2q.H3ZxkQwAmy', 'patient', 'Somchai Mankong', 'นายสมชาย มั่นคง', 'PATIENT-SOMCHAI', true, true, true, 'approved');

-- Patient: Anan Khayanrian (DM + CKD for CDS testing)
INSERT INTO users (id, email, password_hash, role, name, name_thai, patient_id, is_active, is_verified, is_approved, approval_status)
VALUES ('PATIENT-ANAN', 'Anan.Khayanrian@gmail.com', '$2b$10$64bK0EpjyC7quRGJNvRqmuH/jX3mA4dzyzYa2vgA2q.H3ZxkQwAmy', 'patient', 'Anan Khayanrian', 'นายอนันต์ ขยันเรียน', 'PATIENT-ANAN', true, true, true, 'approved');

-- Patient: Demo Test
INSERT INTO users (id, email, password_hash, role, name, name_thai, patient_id, is_active, is_verified, is_approved, approval_status)
VALUES ('PATIENT-DEMO', 'demo.test@gmail.com', '$2b$10$64bK0EpjyC7quRGJNvRqmuH/jX3mA4dzyzYa2vgA2q.H3ZxkQwAmy', 'patient', 'Demo Test Patient', 'นาย ทดสอบ ระบบ', 'PATIENT-DEMO', true, true, true, 'approved');

-- =============================================================================
-- SECTION 15: SEED DATA - DOCTORS TABLE
-- =============================================================================
\echo '>>> Seeding doctors table...'

INSERT INTO doctors (id, name, name_thai, specialty, specialty_thai, hospital, hospital_thai, avatar_url, rating, review_count, experience_years, consultation_fee, is_available)
VALUES 
    ('DOC-TEST-001', 'Dr. Test Doctor', 'นพ.ทดสอบ ระบบ', 'Internal Medicine', 'อายุรกรรมทั่วไป', 'Izara Test Hospital', 'โรงพยาบาลอิซาร่า ทดสอบ', 'https://i.pravatar.cc/150?u=doctest', 5.0, 10, 5, 300.00, true),
    ('DOC-SOMCHAI-001', 'Dr. Somchai Prasert', 'นพ.สมชาย ประเสริฐ', 'Cardiology', 'หทัยวิทยา', 'Bangkok General Hospital', 'โรงพยาบาลกรุงเทพ', 'https://i.pravatar.cc/150?u=doc1', 4.8, 125, 15, 500.00, true),
    ('DOC-SIRIPORN-001', 'Dr. Siriporn Thongchai', 'พญ.ศิริพร ทองชัย', 'Endocrinology', 'ต่อมไร้ท่อ', 'Bumrungrad Hospital', 'โรงพยาบาลบำรุงราษฎร์', 'https://i.pravatar.cc/150?u=doc2', 4.9, 200, 20, 800.00, true);

-- =============================================================================
-- SECTION 16: SEED DATA - DOCTOR SCHEDULES
-- =============================================================================
\echo '>>> Seeding doctor schedules...'

INSERT INTO doctor_schedules (id, doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_available)
VALUES 
    ('SCH-TEST-001-1', 'DOC-TEST-001', 1, '09:00', '17:00', 30, true),
    ('SCH-TEST-001-2', 'DOC-TEST-001', 2, '09:00', '17:00', 30, true),
    ('SCH-TEST-001-3', 'DOC-TEST-001', 3, '09:00', '17:00', 30, true),
    ('SCH-TEST-001-4', 'DOC-TEST-001', 4, '09:00', '17:00', 30, true),
    ('SCH-TEST-001-5', 'DOC-TEST-001', 5, '09:00', '17:00', 30, true);

-- =============================================================================
-- SECTION 17: SEED DATA - PATIENT PROFILES
-- =============================================================================
\echo '>>> Seeding patient profiles...'

-- Patient Profile: นายสมชาย มั่นคง
INSERT INTO patient_profiles (patient_id, demographics, emergency_contact, insurance_info)
VALUES (
    'PATIENT-SOMCHAI',
    '{"title": "นาย", "firstName": "สมชาย", "lastName": "มั่นคง", "firstNameEn": "Somchai", "lastNameEn": "Mankong", "nationalId": "1-1001-00001-01-1", "dateOfBirth": "1980-03-15", "age": 45, "gender": "male", "maritalStatus": "married", "religion": "Buddhist", "nationality": "Thai", "occupation": "Engineer", "address": "123/45 ซอยสุขุมวิท 71 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพฯ 10110", "phone": "081-234-5678", "bloodType": "O+", "hospitalNumber": "HN-2024-001234"}'::jsonb,
    '{"name": "นางสมหญิง มั่นคง", "relationship": "spouse", "phone": "081-987-6543", "address": "123/45 ซอยสุขุมวิท 71 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพฯ 10110"}'::jsonb,
    '{"type": "Universal Coverage Scheme", "policyNumber": "UCS-2024-001234", "provider": "สำนักงานหลักประกันสุขภาพแห่งชาติ", "validUntil": "2026-12-31"}'::jsonb
);

-- Patient Profile: นายอนันต์ ขยันเรียน
INSERT INTO patient_profiles (patient_id, demographics, emergency_contact, insurance_info)
VALUES (
    'PATIENT-ANAN',
    '{"title": "นาย", "firstName": "อนันต์", "lastName": "ขยันเรียน", "firstNameEn": "Anan", "lastNameEn": "Khayanrian", "nationalId": "1-1002-00002-02-2", "dateOfBirth": "1967-08-22", "age": 58, "gender": "male", "maritalStatus": "married", "religion": "Buddhist", "nationality": "Thai", "occupation": "Teacher (Retired)", "address": "456/78 ถนนพหลโยธิน แขวงลาดยาว เขตจตุจักร กรุงเทพฯ 10900", "phone": "089-876-5432", "bloodType": "A+", "hospitalNumber": "HN-2018-005678"}'::jsonb,
    '{"name": "นางบุษบา ขยันเรียน", "relationship": "spouse", "phone": "089-123-4567", "address": "456/78 ถนนพหลโยธิน แขวงลาดยาว เขตจตุจักร กรุงเทพฯ 10900"}'::jsonb,
    '{"type": "Social Security", "policyNumber": "SSO-2018-005678", "provider": "สำนักงานประกันสังคม", "validUntil": "2026-12-31"}'::jsonb
);

-- Patient Profile: Demo Test
INSERT INTO patient_profiles (patient_id, demographics, emergency_contact, insurance_info)
VALUES (
    'PATIENT-DEMO',
    '{"title": "นาย", "firstName": "ทดสอบ", "lastName": "ระบบ", "firstNameEn": "Demo", "lastNameEn": "Test", "nationalId": "1-1000-00000-00-0", "dateOfBirth": "1990-01-01", "age": 35, "gender": "male", "maritalStatus": "single", "religion": "Buddhist", "nationality": "Thai", "occupation": "Software Developer", "address": "999/99 ถนนรัชดาภิเษก เขตห้วยขวาง กรุงเทพฯ 10310", "phone": "090-000-0000", "bloodType": "B+", "hospitalNumber": "HN-2025-000001"}'::jsonb,
    '{"name": "นายพ่อ ทดสอบ", "relationship": "father", "phone": "091-111-1111", "address": "999/99 ถนนรัชดาภิเษก เขตห้วยขวาง กรุงเทพฯ 10310"}'::jsonb,
    '{"type": "Private Insurance", "policyNumber": "PVT-2025-000001", "provider": "บริษัท ประกันภัยไทย จำกัด", "validUntil": "2027-01-01"}'::jsonb
);

-- =============================================================================
-- SECTION 18: SEED DATA - PHR (Personal Health Records)
-- =============================================================================
\echo '>>> Seeding PHR records...'

-- PHR for นายสมชาย มั่นคง (Hypertension patient)
INSERT INTO phr (id, patient_id, demographics, allergies, chronic_conditions, medications, lifestyle, blood_type, height_cm, weight_kg, bmi, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, family_history, surgical_history, vaccinations, latest_lab_results)
VALUES (
    'PHR-SOMCHAI', 
    'PATIENT-SOMCHAI', 
    '{"age": 45, "gender": "male", "bloodType": "O+", "height": 175, "weight": 78, "occupation": "Engineer", "education": "Bachelor", "maritalStatus": "married"}'::jsonb,
    '[]'::jsonb,
    '[{"name": "Essential Hypertension", "nameThai": "โรคความดันโลหิตสูงชนิดไม่ทราบสาเหตุ", "icd10": "I10", "diagnosedDate": "2020-01-15", "status": "controlled", "treatingDoctor": "นพ.สมชาย ประเสริฐ", "notes": "ควบคุมได้ดีด้วยยา"}]'::jsonb,
    '[{"name": "Amlodipine", "nameThai": "แอมโลดิพีน", "dose": "5mg", "frequency": "QD", "route": "oral", "prescribedDate": "2020-01-15", "indication": "Hypertension"}]'::jsonb,
    '{"smokingStatus": "never", "alcoholConsumption": "occasional", "exerciseFrequency": "2-3 times/week", "dietType": "normal", "sleepHours": 7}'::jsonb,
    'O+', 175.0, 78.0, 25.5,
    'นางสมหญิง มั่นคง', '081-987-6543', 'spouse',
    '[{"condition": "Hypertension", "relation": "father", "ageAtDiagnosis": 50}, {"condition": "Diabetes", "relation": "mother", "ageAtDiagnosis": 55}]'::jsonb,
    '[]'::jsonb,
    '[{"name": "COVID-19", "date": "2024-01-15", "type": "Pfizer Booster"}, {"name": "Influenza", "date": "2025-10-01", "type": "Quadrivalent"}]'::jsonb,
    '[{"test": "BP", "value": "128/82", "unit": "mmHg", "date": "2025-12-15", "status": "normal"}, {"test": "FBS", "value": "95", "unit": "mg/dL", "date": "2025-12-15", "status": "normal"}]'::jsonb
);

-- PHR for นายอนันต์ ขยันเรียน (DM + CKD patient - for CDS testing)
INSERT INTO phr (id, patient_id, demographics, allergies, chronic_conditions, medications, lifestyle, blood_type, height_cm, weight_kg, bmi, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, family_history, surgical_history, vaccinations, latest_lab_results, clinical_decision_support)
VALUES (
    'PHR-ANAN', 
    'PATIENT-ANAN', 
    '{"age": 58, "gender": "male", "bloodType": "A+", "height": 168, "weight": 75, "occupation": "Teacher (Retired)", "education": "Master", "maritalStatus": "married"}'::jsonb,
    '[{"name": "Penicillin", "nameThai": "เพนนิซิลิน", "severity": "severe", "reaction": "Anaphylaxis", "reportedDate": "2010-05-20"}, {"name": "Sulfa drugs", "nameThai": "ยากลุ่มซัลฟา", "severity": "moderate", "reaction": "Rash", "reportedDate": "2015-03-10"}]'::jsonb,
    '[{"name": "Type 2 Diabetes Mellitus", "nameThai": "เบาหวานชนิดที่ 2", "icd10": "E11.9", "diagnosedDate": "2018-03-15", "status": "controlled", "details": "HbA1c 7.2%", "treatingDoctor": "พญ.ศิริพร ทองชัย"}, {"name": "Chronic Kidney Disease Stage 3b", "nameThai": "โรคไตเรื้อรังระยะ 3b", "icd10": "N18.4", "diagnosedDate": "2022-06-10", "status": "stable", "details": "eGFR 38 ml/min/1.73m2", "treatingDoctor": "นพ.สมชาย ประเสริฐ"}, {"name": "Essential Hypertension", "nameThai": "โรคความดันโลหิตสูง", "icd10": "I10", "diagnosedDate": "2018-03-15", "status": "controlled"}]'::jsonb,
    '[{"name": "Metformin", "nameThai": "เมทฟอร์มิน", "dose": "500mg", "frequency": "BID", "route": "oral", "notes": "ต้องปรับขนาดยาเนื่องจากไตทำงานลดลง", "warning": "Monitor for CKD"}, {"name": "Lisinopril", "nameThai": "ไลซิโนพริล", "dose": "10mg", "frequency": "QD", "route": "oral", "indication": "HTN + Nephroprotection"}, {"name": "Atorvastatin", "nameThai": "อะทอร์วาสแตติน", "dose": "20mg", "frequency": "QD", "route": "oral", "indication": "Dyslipidemia"}]'::jsonb,
    '{"smokingStatus": "former", "smokingQuitYear": 2018, "alcoholConsumption": "never", "exerciseFrequency": "daily_walking", "exerciseMinutes": 30, "dietType": "diabetic_renal", "sleepHours": 6}'::jsonb,
    'A+', 168.0, 75.0, 26.6,
    'นางบุษบา ขยันเรียน', '089-123-4567', 'spouse',
    '[{"condition": "Diabetes", "relation": "father", "ageAtDiagnosis": 45}, {"condition": "Diabetes", "relation": "mother", "ageAtDiagnosis": 50}, {"condition": "CKD", "relation": "father", "ageAtDiagnosis": 60}]'::jsonb,
    '[{"procedure": "Appendectomy", "date": "1995-08-15", "hospital": "โรงพยาบาลรามาธิบดี"}]'::jsonb,
    '[{"name": "COVID-19", "date": "2024-06-01", "type": "Pfizer Booster"}, {"name": "Influenza", "date": "2025-09-15", "type": "Quadrivalent"}, {"name": "Pneumococcal", "date": "2023-01-20", "type": "PPSV23"}]'::jsonb,
    '[{"test": "HbA1c", "value": "7.2", "unit": "%", "date": "2025-12-01", "status": "at_target"}, {"test": "eGFR", "value": "38", "unit": "ml/min/1.73m2", "date": "2025-12-01", "status": "CKD_3b"}, {"test": "Creatinine", "value": "1.8", "unit": "mg/dL", "date": "2025-12-01", "status": "elevated"}, {"test": "BP", "value": "135/85", "unit": "mmHg", "date": "2025-12-01", "status": "controlled"}, {"test": "LDL", "value": "85", "unit": "mg/dL", "date": "2025-12-01", "status": "at_target"}]'::jsonb,
    '{"alerts": [{"type": "dose_adjustment", "severity": "warning", "drug": "Metformin", "message": "ควรพิจารณาลดขนาดยา Metformin เนื่องจาก eGFR < 45", "messageThai": "ควรพิจารณาลดขนาดยา Metformin เนื่องจาก eGFR < 45 ml/min/1.73m2", "guideline": "KDIGO 2024", "action": "Consider dose reduction to 500mg QD"}, {"type": "drug_contraindication", "severity": "critical", "drug": "Penicillin", "message": "ผู้ป่วยมีประวัติแพ้ยา Penicillin รุนแรง (Anaphylaxis)", "guideline": "Thai FDA Drug Safety"}]}'::jsonb
);

-- PHR for Demo Test Patient (Healthy patient)
INSERT INTO phr (id, patient_id, demographics, allergies, chronic_conditions, medications, lifestyle, blood_type, height_cm, weight_kg, bmi, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, family_history, vaccinations, latest_lab_results)
VALUES (
    'PHR-DEMO', 
    'PATIENT-DEMO', 
    '{"age": 35, "gender": "male", "bloodType": "B+", "height": 170, "weight": 70, "occupation": "Software Developer", "education": "Bachelor", "maritalStatus": "single"}'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '{"smokingStatus": "never", "alcoholConsumption": "social", "exerciseFrequency": "3 times/week", "dietType": "normal", "sleepHours": 7}'::jsonb,
    'B+', 170.0, 70.0, 24.2,
    'นายพ่อ ทดสอบ', '091-111-1111', 'father',
    '[]'::jsonb,
    '[{"name": "COVID-19", "date": "2024-03-01", "type": "Pfizer"}]'::jsonb,
    '[{"test": "BP", "value": "120/80", "unit": "mmHg", "date": "2025-11-01", "status": "normal"}, {"test": "FBS", "value": "88", "unit": "mg/dL", "date": "2025-11-01", "status": "normal"}]'::jsonb
);

-- =============================================================================
-- SECTION 19: SEED DATA - MEDICAL CONTENT
-- =============================================================================
\echo '>>> Seeding medical content...'

-- Categories: general-health, nutrition, exercise, mental-health, chronic-disease, preventive-care, medications, first-aid
INSERT INTO medical_content (id, title_thai, title_english, content_thai, content_english, category, author_id, status, view_count, tags, image_url)
VALUES
('MC-001', 'การดูแลสุขภาพหัวใจ', 'Heart Health Care', E'## 🫀 หัวใจแข็งแรง ชีวิตยืนยาว\n\nหัวใจเป็นอวัยวะสำคัญที่สูบฉีดเลือดไปเลี้ยงร่างกาย การดูแลหัวใจให้แข็งแรงทำได้โดย:\n\n- ออกกำลังกายสม่ำเสมอ 150 นาที/สัปดาห์\n- รับประทานอาหารสุขภาพ ลดเค็ม ลดมัน\n- หลีกเลี่ยงบุหรี่และแอลกอฮอล์\n- ตรวจสุขภาพประจำปี', 'The heart is vital. Keep it healthy with exercise, diet, and regular checkups.', 'general-health', 'DOC-SOMCHAI-001', 'published', 150, '["heart", "health", "exercise"]'::jsonb, 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800'),

('MC-002', 'การจัดการโรคเบาหวาน', 'Diabetes Management', E'## 🩸 การดูแลตนเองสำหรับผู้ป่วยเบาหวาน\n\nโรคเบาหวานเป็นโรคเรื้อรังที่ต้องดูแลอย่างต่อเนื่อง\n\n**เป้าหมาย:** HbA1c < 7%\n\n**การดูแลตนเอง:**\n- รับประทานยาตามแพทย์สั่ง\n- ควบคุมอาหาร ลดแป้ง น้ำตาล\n- ออกกำลังกาย 30 นาที/วัน\n- ตรวจน้ำตาลเป็นประจำ', 'Diabetes requires ongoing management with medication, diet, and exercise.', 'chronic-disease', 'DOC-SIRIPORN-001', 'published', 200, '["diabetes", "blood sugar", "medication"]'::jsonb, 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800'),

('MC-003', 'การนอนหลับที่ดี', 'Good Sleep Habits', E'## 😴 การนอนหลับที่มีคุณภาพ\n\nการนอนหลับที่มีคุณภาพ 7-9 ชั่วโมงต่อคืนช่วยให้ร่างกายฟื้นฟู\n\n**ประโยชน์:**\n- เสริมสร้างภูมิคุ้มกัน\n- ช่วยความจำและสมาธิ\n- ลดความเครียด', 'Quality sleep of 7-9 hours helps the body recover and boosts immunity.', 'general-health', 'DOC-TEST-001', 'published', 120, '["sleep", "wellness", "health"]'::jsonb, 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800'),

('MC-004', 'การออกกำลังกายสำหรับผู้สูงอายุ', 'Exercise for Seniors', E'## 🚶 การออกกำลังกายสำหรับผู้สูงวัย\n\nผู้สูงอายุควรออกกำลังกายเบาๆ อย่างน้อย 150 นาทีต่อสัปดาห์\n\n**กิจกรรมที่เหมาะสม:**\n- เดินเร็ว\n- ว่ายน้ำ\n- รำไทเก๊ก', 'Seniors should do light exercises like walking, swimming, or yoga.', 'exercise', 'DOC-TEST-001', 'published', 80, '["seniors", "exercise", "health"]'::jsonb, 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800'),

('MC-005', 'สุขภาพจิตในยุคดิจิทัล', 'Mental Health in Digital Age', E'## 🧠 สุขภาพจิตในโลกออนไลน์\n\nการใช้เทคโนโลยีมากเกินไปอาจส่งผลต่อสุขภาพจิต\n\n**วิธีรักษาสมดุล:**\n- จำกัดเวลาหน้าจอ 2-3 ชม./วัน\n- พักสายตาทุก 20 นาที', 'Excessive technology use can affect mental health. Take breaks and maintain relationships.', 'mental-health', 'DOC-TEST-001', 'published', 95, '["mental health", "technology", "wellness"]'::jsonb, 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800'),

('MC-006', 'การป้องกันโรคติดเชื้อทางเดินหายใจ', 'Respiratory Infection Prevention', E'## 🫁 ป้องกันโรคทางเดินหายใจ\n\n**วิธีป้องกัน:**\n- ล้างมือบ่อยๆ ด้วยสบู่หรือเจลแอลกอฮอล์\n- สวมหน้ากากในที่ชุมชน\n- อยู่ในที่อากาศถ่ายเท', 'Prevent respiratory infections by washing hands, wearing masks, and getting vaccinated.', 'preventive-care', 'DOC-SOMCHAI-001', 'published', 180, '["respiratory", "prevention", "vaccination"]'::jsonb, 'https://images.unsplash.com/photo-1584634428023-64f0f18c7a53?w=800'),

('MC-007', 'โภชนาการสำหรับผู้ป่วยหัวใจ', 'Nutrition for Heart Patients', E'## 🥗 โภชนาการเพื่อสุขภาพหัวใจ\n\nการเลือกอาหารที่เหมาะสมช่วยป้องกันโรคหัวใจ:\n\n**อาหารที่ควรทาน:**\n- ผักผลไม้หลากสี\n- ปลาทะเล\n- ธัญพืชไม่ขัดสี\n\n**อาหารที่ควรหลีกเลี่ยง:**\n- อาหารไขมันสูง\n- อาหารเค็มจัด\n- อาหารหวานจัด', 'Heart-healthy nutrition guide focusing on vegetables, fish, and whole grains.', 'nutrition', 'DOC-SOMCHAI-001', 'published', 130, '["nutrition", "heart", "diet"]'::jsonb, 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800'),

('MC-008', 'การใช้ยาอย่างปลอดภัย', 'Safe Medication Use', E'## 💊 คู่มือการใช้ยาอย่างปลอดภัย\n\n**หลักการใช้ยา:**\n- รับประทานยาตามแพทย์สั่ง\n- ไม่หยุดยาเอง\n- เก็บยาให้พ้นมือเด็ก\n\n**อาการข้างเคียง:**\nหากมีอาการแพ้ยา เช่น ผื่นคัน หายใจลำบาก ให้หยุดยาและพบแพทย์ทันที', 'Guide for safe medication use including storage and side effects awareness.', 'medications', 'DOC-SIRIPORN-001', 'published', 175, '["medications", "safety", "drugs"]'::jsonb, 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800'),

('MC-009', 'ปฐมพยาบาลเบื้องต้น', 'Basic First Aid', E'## 🩹 ปฐมพยาบาลเบื้องต้น\n\n**การปฐมพยาบาลบาดแผล:**\n1. ล้างแผลด้วยน้ำสะอาด\n2. ใส่ยาฆ่าเชื้อ\n3. ปิดแผลด้วยผ้าก๊อซ\n\n**การปฐมพยาบาลไฟไหม้:**\n1. ล้างด้วยน้ำเย็น 20 นาที\n2. ห้ามใช้น้ำแข็ง\n3. พบแพทย์หากแผลรุนแรง', 'Basic first aid guide for wounds and burns.', 'first-aid', 'DOC-TEST-001', 'published', 210, '["first-aid", "emergency", "wounds"]'::jsonb, 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=800');

-- =============================================================================
-- SECTION 20: SEED DATA - CLINICAL RESOURCES
-- =============================================================================
\echo '>>> Seeding clinical resources...'

INSERT INTO clinical_resources (id, title_thai, title_english, content_thai, content_english, category, specialty, guideline_year, source, status, image_url, author_id, author_name)
VALUES
('CR-001', 'แนวทางการรักษาความดันโลหิตสูง 2024', 'Hypertension Treatment Guidelines 2024', E'## แนวทางการรักษาความดันโลหิตสูง\n\n**เป้าหมาย:**\n- ผู้ใหญ่ทั่วไป: < 140/90 mmHg\n- ผู้ป่วยเบาหวาน: < 130/80 mmHg\n\n**ยาเริ่มต้น:**\n- ACEI หรือ ARB\n- CCB\n- Thiazide diuretics', 'Guidelines for hypertension treatment according to WHO 2024 standards.', 'cardiovascular', 'Cardiology', 2024, 'Thai Hypertension Society', 'approved', 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800', 'DOC-SOMCHAI-001', 'นพ.สมชาย ประเสริฐ'),

('CR-002', 'การใช้ยาปฏิชีวนะอย่างสมเหตุผล', 'Rational Antibiotic Use', E'## หลักการใช้ยาปฏิชีวนะ\n\n**ข้อบ่งใช้:**\n- การติดเชื้อแบคทีเรียที่ยืนยันได้\n- การติดเชื้อรุนแรงที่สงสัยแบคทีเรีย', 'Guidelines for appropriate antibiotic prescribing to reduce antimicrobial resistance.', 'infectious', 'Infectious Disease', 2024, 'Thai FDA', 'approved', 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800', 'DOC-TEST-001', 'นพ. ทดสอบ แพทย์ดี'),

('CR-003', 'การดูแลผู้ป่วยเบาหวานแบบองค์รวม KDIGO 2024', 'Holistic Diabetes Care KDIGO 2024', E'## แนวทาง KDIGO 2024\n\n**การปรับยาในผู้ป่วยโรคไต:**\n- Metformin: ลดขนาดเมื่อ eGFR < 45\n- หยุดใช้เมื่อ eGFR < 30', 'Comprehensive diabetes care including dose adjustments for CKD per KDIGO 2024.', 'endocrinology', 'Endocrinology', 2024, 'KDIGO', 'approved', 'https://images.unsplash.com/photo-1576669801943-7a8a2c1e3b7e?w=800', 'DOC-SIRIPORN-001', 'พญ.ศิริพร ทองชัย'),

('CR-004', 'แบบประเมินสุขภาพจิต PHQ-9', 'PHQ-9 Mental Health Assessment', E'## แบบประเมิน PHQ-9\n\n**การให้คะแนน:**\n- 0-4: ปกติ\n- 5-9: ซึมเศร้าเล็กน้อย\n- 10-14: ซึมเศร้าปานกลาง', 'PHQ-9 Depression screening tool in Thai for patient assessment.', 'psychiatry', 'Psychiatry', 2024, 'Thai Psychiatric Association', 'approved', 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800', 'DOC-TEST-001', 'นพ. ทดสอบ แพทย์ดี'),

('CR-005', 'การดูแลผู้สูงอายุในชุมชน', 'Elderly Care in Community', E'## คู่มือการดูแลผู้สูงอายุ\n\n**การประเมิน:**\n- ADL (กิจวัตรประจำวัน)\n- IADL (กิจกรรมเครื่องมือ)', 'Community elderly care handbook for healthcare workers and caregivers.', 'geriatrics', 'Geriatrics', 2024, 'Department of Health Thailand', 'approved', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800', 'DOC-TEST-001', 'นพ. ทดสอบ แพทย์ดี'),

('CR-006', 'เครื่องคำนวณ BMI และความเสี่ยงโรคเรื้อรัง', 'BMI and Chronic Disease Risk Calculator', E'## การคำนวณ BMI\n\n**สูตร:** น้ำหนัก(kg) / ส่วนสูง(m)²\n\n**การแปลผล (เกณฑ์เอเชีย):**\n- < 18.5: น้ำหนักต่ำกว่าเกณฑ์\n- 18.5-22.9: ปกติ', 'BMI calculator tool with chronic disease risk assessment for Asian population.', 'general', 'General Medicine', 2024, 'Thai Medical Association', 'approved', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'DOC-SOMCHAI-001', 'นพ.สมชาย ประเสริฐ');

-- =============================================================================
-- SECTION 21: SEED DATA - KNOWLEDGE BASE (RAG)
-- =============================================================================
\echo '>>> Seeding knowledge base...'

INSERT INTO knowledge_base (title, content, source, category, guideline_year, language)
VALUES 
('KDIGO 2024 CKD Guideline - Metformin', 'Metformin dose adjustment for CKD: eGFR 30-45: Reduce dose by 50%. eGFR <30: Contraindicated. Monitor renal function every 3 months. For patients with DM + CKD, prioritize SGLT2 inhibitors which provide both glycemic control and kidney protection.', 'KDIGO 2024', 'nephrology', '2024', 'en'),

('ADA 2025 Diabetes Standards - Glucose Targets', 'A1C target <7% for most adults. Consider <8% for older adults with comorbidities. Fasting glucose 80-130 mg/dL. Postprandial glucose <180 mg/dL. For older adults or those with hypoglycemia risk, targets may be relaxed.', 'ADA Standards of Care 2025', 'diabetes', '2025', 'en'),

('แนวทางปรับยา Metformin ในผู้ป่วยโรคไต', 'การปรับขนาดยา Metformin ตาม eGFR: 30-45 ml/min: ลดขนาดยาลง 50% ควรเริ่ม 500 มก. วันละครั้ง. eGFR <30: ห้ามใช้. ตรวจการทำงานของไตทุก 3 เดือน. พิจารณาใช้ยากลุ่ม SGLT2 inhibitor แทนในผู้ป่วยที่มี CKD ร่วมด้วย', 'KDIGO 2024 (Thai Translation)', 'nephrology', '2024', 'th'),

('Drug Interaction: Metformin + Contrast Media', 'Stop metformin 48 hours before iodinated contrast. Resume 48 hours after procedure if renal function stable. Check serum creatinine/eGFR before resuming. Higher risk of lactic acidosis with contrast-induced AKI.', 'ACR Manual on Contrast Media 2024', 'radiology', '2024', 'en'),

('Hypertension in Diabetic Patients', 'Target BP <130/80 mmHg for most diabetic patients. First-line: ACEI or ARB (renoprotective). Add CCB or thiazide if needed. Avoid ACEI + ARB combination. Monitor potassium and creatinine when starting ACEI/ARB.', 'ADA Standards 2025', 'cardiology', '2025', 'en'),

('ยาลดความดันโลหิตในผู้ป่วยเบาหวาน', 'เป้าหมาย BP <130/80 mmHg สำหรับผู้ป่วยเบาหวานส่วนใหญ่ ยาเริ่มต้น: ACEI หรือ ARB (ปกป้องไต) เพิ่ม CCB หรือ thiazide หากจำเป็น หลีกเลี่ยงการใช้ ACEI ร่วมกับ ARB ติดตามโพแทสเซียมและครีอะตินีนเมื่อเริ่มใช้ ACEI/ARB', 'ADA Standards 2025 (Thai)', 'cardiology', '2025', 'th');

-- =============================================================================
-- SECTION 22: SEED DATA - CONSULTANTS
-- =============================================================================
\echo '>>> Seeding consultants...'

INSERT INTO consultants (id, name, specialty, email, phone, hospital, languages, experience_years, bio, is_available, rating, created_by)
VALUES 
('CONS-001', 'Dr. Prasong Charoenpong', 'Nephrology', 'prasong.c@hospital.co.th', '02-555-1001', 'Siriraj Hospital', '["Thai", "English"]'::jsonb, 25, 'Expert in CKD and dialysis management.', true, 4.9, 'ADMIN-TEST-001'),
('CONS-002', 'Dr. Wanida Thongprasert', 'Oncology', 'wanida.t@hospital.co.th', '02-555-1002', 'Chulalongkorn Hospital', '["Thai", "English", "Mandarin"]'::jsonb, 20, 'Specializes in breast cancer treatment.', true, 4.8, 'ADMIN-TEST-001'),
('CONS-003', 'Dr. Piyarat Srisawat', 'Cardiology', 'piyarat.s@hospital.co.th', '02-555-1003', 'Bumrungrad Hospital', '["Thai", "English"]'::jsonb, 18, 'Expert in interventional cardiology.', true, 4.7, 'ADMIN-TEST-001');

-- =============================================================================
-- SECTION 23: SEED DATA - APPOINTMENTS
-- =============================================================================
\echo '>>> Seeding appointments...'

INSERT INTO appointments (id, patient_id, doctor_id, requested_date, requested_time, confirmed_date, confirmed_time, status, symptoms, symptom_description, urgency_level, jitsi_room_name, meet_link)
VALUES 
('APT-TEST-001', 'PATIENT-SOMCHAI', 'DOC-TEST-001', CURRENT_DATE, '09:00', CURRENT_DATE, '09:00', 'confirmed', '["headache", "fatigue"]'::jsonb, 'ปวดหัวและเหนื่อยมา 3 วัน', 'normal', 'izara-apt-test-001', 'https://meet.jit.si/izara-apt-test-001'),
('APT-TEST-002', 'PATIENT-ANAN', 'DOC-TEST-001', CURRENT_DATE, '10:30', CURRENT_DATE, '10:30', 'confirmed', '["diabetes_follow_up", "kidney_check"]'::jsonb, 'นัดติดตามผลเบาหวานและโรคไต', 'normal', 'izara-apt-test-002', 'https://meet.jit.si/izara-apt-test-002'),
('APT-TEST-003', 'PATIENT-DEMO', 'DOC-TEST-001', CURRENT_DATE + 1, '14:00', NULL, NULL, 'pending', '["general_checkup"]'::jsonb, 'ต้องการตรวจสุขภาพประจำปี', 'normal', NULL, NULL);

-- =============================================================================
-- SECTION 24: SEED DATA - VITAL SIGNS
-- =============================================================================
\echo '>>> Seeding vital signs...'

INSERT INTO vital_signs (patient_id, blood_pressure_systolic, blood_pressure_diastolic, heart_rate, temperature, oxygen_saturation, blood_glucose, blood_glucose_type, weight, height, source)
VALUES 
('PATIENT-SOMCHAI', 130, 85, 75, 36.5, 98, NULL, NULL, 78, 175, 'clinic_measurement'),
('PATIENT-ANAN', 145, 90, 80, 36.8, 97, 145, 'fasting', 75, 168, 'clinic_measurement'),
('PATIENT-DEMO', 120, 80, 72, 36.6, 99, NULL, NULL, 70, 170, 'patient_input');

-- =============================================================================
-- SECTION 25: SEED DATA - NOTIFICATIONS
-- =============================================================================
\echo '>>> Seeding notifications...'

INSERT INTO notifications (user_id, type, title, title_thai, message, message_thai, data)
VALUES 
('PATIENT-SOMCHAI', 'appointment_confirmed', 'Appointment Confirmed', 'ยืนยันนัดหมายแล้ว', 'Your appointment has been confirmed', 'นัดหมายของคุณได้รับการยืนยันแล้ว', '{"appointmentId": "APT-TEST-001"}'::jsonb),
('PATIENT-ANAN', 'appointment_confirmed', 'Appointment Confirmed', 'ยืนยันนัดหมายแล้ว', 'Your appointment has been confirmed', 'นัดหมายของคุณได้รับการยืนยันแล้ว', '{"appointmentId": "APT-TEST-002"}'::jsonb);

-- =============================================================================
-- SECTION 26: VERIFICATION
-- =============================================================================
\echo ''
\echo '=============================================='
\echo 'DATABASE INITIALIZATION COMPLETE!'
\echo '=============================================='
\echo ''

SELECT 'Users' as table_name, count(*) as count FROM users
UNION ALL SELECT 'Doctors', count(*) FROM doctors
UNION ALL SELECT 'PHR Records', count(*) FROM phr
UNION ALL SELECT 'Medical Content', count(*) FROM medical_content
UNION ALL SELECT 'Clinical Resources', count(*) FROM clinical_resources
UNION ALL SELECT 'Knowledge Base', count(*) FROM knowledge_base
UNION ALL SELECT 'Appointments', count(*) FROM appointments
UNION ALL SELECT 'Consultants', count(*) FROM consultants;

\echo ''
\echo 'Medical Content Categories:'
SELECT category, COUNT(*) as count 
FROM medical_content 
WHERE status = 'published'
GROUP BY category 
ORDER BY category;

\echo ''
\echo '=============================================='
\echo 'Ready for development and testing!'
\echo '=============================================='

-- =============================================================================
-- END OF UNIFIED DATABASE INITIALIZATION
-- =============================================================================
