-- ============================================================================
-- IZARA TELEMEDICINE - POSTGRESQL DATABASE SCHEMA
-- Phase 1: Migration from GCS to PostgreSQL
-- Version: 2.0.0
-- Updated: 2026-01-19
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";  -- For RAG/embeddings

-- ============================================================================
-- DATABASE: izara-users-credentials
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

-- ============================================================================
-- DATABASE: izara-patients-data
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    audit_log JSONB DEFAULT '[]'::jsonb
);

-- ============================================================================
-- DATABASE: izara-doctors-data
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

-- Meeting recordings and transcripts
CREATE TABLE IF NOT EXISTS meeting_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id VARCHAR(50),
    doctor_id VARCHAR(50) REFERENCES users(id),
    patient_id VARCHAR(50) REFERENCES users(id),
    recording_url TEXT,
    transcript TEXT,
    ai_summary TEXT,
    ai_recommendations TEXT,
    section_summaries JSONB,
    duration_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- DATABASE: izara-appointments
-- Appointments, EMR, prescriptions
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
-- DATABASE: izara-meta-data
-- Reference data, medical content, clinical guidelines
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

-- ============================================================================
-- AI ASSISTANT TABLES (Per P.Beer recommendations)
-- ============================================================================

-- Knowledge base for RAG
CREATE TABLE IF NOT EXISTS knowledge_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,
    content_type VARCHAR(50),  -- guideline, drug_info, protocol
    source VARCHAR(255),
    embedding vector(768),  -- Gemini embedding dimension
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chat history for AI Assistant
CREATE TABLE IF NOT EXISTS ai_chat_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(50) REFERENCES users(id),
    session_id VARCHAR(50),
    role VARCHAR(20) NOT NULL,  -- user, assistant, system
    content TEXT NOT NULL,
    context JSONB,  -- patient_id, appointment_id, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Document Analysis (for PDF summarization)
CREATE TABLE IF NOT EXISTS ai_document_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(50) REFERENCES users(id),
    patient_id VARCHAR(50) REFERENCES users(id),
    document_type VARCHAR(50),  -- lab_result, external_pdf, medical_record
    original_filename VARCHAR(255),
    file_url TEXT,
    ai_summary TEXT,
    key_findings JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Clinical Decision Support logs
CREATE TABLE IF NOT EXISTS cds_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id VARCHAR(50) REFERENCES users(id),
    patient_id VARCHAR(50) REFERENCES users(id),
    appointment_id VARCHAR(50) REFERENCES appointments(id),
    cds_type VARCHAR(50),  -- drug_interaction, dose_adjustment, guideline_alert
    recommendation TEXT,
    guidelines_referenced JSONB,
    doctor_decision VARCHAR(20),  -- accepted, rejected, modified
    doctor_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_phr_patient_id ON phr(patient_id);
CREATE INDEX IF NOT EXISTS idx_vital_signs_patient_id ON vital_signs(patient_id);
CREATE INDEX IF NOT EXISTS idx_vital_signs_measured_at ON vital_signs(measured_at);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(confirmed_date);
CREATE INDEX IF NOT EXISTS idx_emr_appointment_id ON emr(appointment_id);
CREATE INDEX IF NOT EXISTS idx_emr_patient_id ON emr(patient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_ai_chat_user_id ON ai_chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_session ON ai_chat_history(session_id);

-- Vector index for RAG
CREATE INDEX IF NOT EXISTS idx_knowledge_embedding ON knowledge_base USING ivfflat (embedding vector_cosine_ops);

-- ============================================================================
-- INITIAL DATA - Test Users
-- ============================================================================

-- Admin user (password: IzaraAdmin@2024)
INSERT INTO users (id, email, password_hash, role, name, name_thai, is_active, is_verified, is_approved, is_admin, admin_privileges)
VALUES (
    'ADMIN-TEST-001',
    'admin.test@izara.com',
    '$2b$10$fx5arkpb8YI7lEK5lcHdXeksczdG.qloim/uWghlBZXyxv.dNo/wq',
    'admin',
    'Admin Test',
    'ผู้ดูแลระบบ ทดสอบ',
    true, true, true, true,
    '{"canManageDoctors": true, "canManagePatients": true, "canManageAppointments": true, "canViewAnalytics": true, "canManageSettings": true, "level": "super_admin"}'
) ON CONFLICT (id) DO NOTHING;

-- Doctor user (password: IzaraDoctor@2024)
INSERT INTO users (id, email, password_hash, role, name, name_thai, doctor_id, medical_license_number, specialty, is_active, is_verified, is_approved)
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
    true, true, true
) ON CONFLICT (id) DO NOTHING;

-- Patient: Somchai Mankong (password: P@ssw0rd)
INSERT INTO users (id, email, password_hash, role, name, name_thai, patient_id, is_active, is_verified, is_approved)
VALUES (
    'PATIENT-SOMCHAI',
    'Somchai.Mankong@gmail.com',
    '$2b$10$64bK0EpjyC7quRGJNvRqmuH/jX3mA4dzyzYa2vgA2q.H3ZxkQwAmy',
    'patient',
    'Somchai Mankong',
    'นายสมชาย มั่นคง',
    'PATIENT-SOMCHAI',
    true, true, true
) ON CONFLICT (id) DO NOTHING;

-- Patient: Anan Khayanrian (password: P@ssw0rd)
INSERT INTO users (id, email, password_hash, role, name, name_thai, patient_id, is_active, is_verified, is_approved)
VALUES (
    'PATIENT-ANAN',
    'Anan.Khayanrian@gmail.com',
    '$2b$10$64bK0EpjyC7quRGJNvRqmuH/jX3mA4dzyzYa2vgA2q.H3ZxkQwAmy',
    'patient',
    'Anan Khayanrian',
    'นายอนันต์ ขยันเรียน',
    'PATIENT-ANAN',
    true, true, true
) ON CONFLICT (id) DO NOTHING;

-- Patient: Demo Test Patient (password: P@ssw0rd)
INSERT INTO users (id, email, password_hash, role, name, name_thai, patient_id, is_active, is_verified, is_approved)
VALUES (
    'PATIENT-DEMO',
    'demo.test@gmail.com',
    '$2b$10$64bK0EpjyC7quRGJNvRqmuH/jX3mA4dzyzYa2vgA2q.H3ZxkQwAmy',
    'patient',
    'Demo Test Patient',
    'นาย ทดสอบ ระบบ',
    'PATIENT-DEMO',
    true, true, true
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_phr_updated_at BEFORE UPDATE ON phr
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emr_updated_at BEFORE UPDATE ON emr
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- AUDIT LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50),
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

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================================
-- AI VALIDATIONS TABLE (Man-in-the-Loop - Phase 1)
-- Tracks doctor approval/rejection of AI-generated content
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_validations (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- 'summary', 'documents', 'cds', 'patient_instructions'
    patient_id VARCHAR(50) REFERENCES users(id),
    doctor_id VARCHAR(50) NOT NULL REFERENCES users(id),
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('approved', 'rejected')),
    notes TEXT,
    content_snapshot TEXT, -- Snapshot of AI content at time of validation
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_validations_doctor_id ON ai_validations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_ai_validations_patient_id ON ai_validations(patient_id);
CREATE INDEX IF NOT EXISTS idx_ai_validations_type ON ai_validations(type);
CREATE INDEX IF NOT EXISTS idx_ai_validations_decision ON ai_validations(decision);

-- ============================================================================
-- AI CHAT HISTORY TABLE (Phase 1 - PB-03)
-- Stores doctor-AI conversation history for context
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_chat_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id),
    session_id VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    context JSONB, -- Patient context, appointment info, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_history_user_id ON ai_chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_history_session_id ON ai_chat_history(session_id);

-- ============================================================================
-- AI DOCUMENT ANALYSIS TABLE (Phase 1 - DR-03)
-- Stores AI analysis results for uploaded documents
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_document_analysis (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) REFERENCES users(id),
    doctor_id VARCHAR(50) REFERENCES users(id),
    document_type VARCHAR(50) NOT NULL, -- 'lab_result', 'prescription', 'medical_record', 'imaging'
    filename VARCHAR(255),
    file_path TEXT,
    mime_type VARCHAR(100),
    summary TEXT,
    key_findings JSONB DEFAULT '[]'::jsonb,
    abnormal_values JSONB DEFAULT '[]'::jsonb,
    raw_analysis JSONB,
    validation_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    validated_by VARCHAR(50) REFERENCES users(id),
    validated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_document_analysis_patient_id ON ai_document_analysis(patient_id);
CREATE INDEX IF NOT EXISTS idx_ai_document_analysis_doctor_id ON ai_document_analysis(doctor_id);
CREATE INDEX IF NOT EXISTS idx_ai_document_analysis_document_type ON ai_document_analysis(document_type);

-- ============================================================================
-- CDS LOGS TABLE (Phase 1 - DR-04)
-- Clinical Decision Support decision audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS cds_logs (
    id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) REFERENCES users(id),
    doctor_id VARCHAR(50) NOT NULL REFERENCES users(id),
    recommendation_type VARCHAR(50) NOT NULL, -- 'dose_adjustment', 'drug_interaction', 'screening', etc.
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

CREATE INDEX IF NOT EXISTS idx_cds_logs_patient_id ON cds_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_cds_logs_doctor_id ON cds_logs(doctor_id);
CREATE INDEX IF NOT EXISTS idx_cds_logs_recommendation_type ON cds_logs(recommendation_type);

-- ============================================================================
-- KNOWLEDGE BASE TABLE (Phase 1 - RAG)
-- Stores medical guidelines and references for AI
-- ============================================================================

CREATE TABLE IF NOT EXISTS knowledge_base (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    source VARCHAR(255), -- 'KDIGO 2024', 'ADA 2025', etc.
    category VARCHAR(100), -- 'diabetes', 'hypertension', 'nephrology', etc.
    guideline_year VARCHAR(10),
    language VARCHAR(10) DEFAULT 'th',
    embedding vector(768), -- For RAG similarity search
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding ON knowledge_base USING ivfflat (embedding vector_cosine_ops);

-- ============================================================================
-- VIEWS
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
