-- =============================================================================
-- Phase 2 Migration v2.1.0: AI-HIS Feature Tables
-- Version: 2.1.0
-- Date: 2026-02-16
-- Description: Tables for CTM, Geriatric Screening, SOS, Follow-up,
--              Nursing Dashboard, Predictive Analytics
-- =============================================================================

\echo '>>> Phase 2.1 Migration: Creating AI-HIS feature tables...'

-- =============================================================================
-- TABLE: ctm_assessments — Thai Traditional Medicine
-- =============================================================================
CREATE TABLE IF NOT EXISTS ctm_assessments (
    id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    doctor_id VARCHAR(50),
    dhatu VARCHAR(100) DEFAULT 'ธาตุดิน',
    symptoms JSONB DEFAULT '[]'::jsonb,
    diagnosis TEXT,
    herbal_prescription JSONB DEFAULT '[]'::jsonb,
    treatment_plan TEXT,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ctm_assessments_patient ON ctm_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_ctm_assessments_doctor ON ctm_assessments(doctor_id);

-- =============================================================================
-- TABLE: geriatric_screenings — Elderly screening battery
-- =============================================================================
CREATE TABLE IF NOT EXISTS geriatric_screenings (
    id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    screener_id VARCHAR(50),
    screening_type VARCHAR(50) DEFAULT 'comprehensive',
    scores JSONB DEFAULT '{}'::jsonb,
    risk_level VARCHAR(20) DEFAULT 'moderate' CHECK (risk_level IN ('low', 'moderate', 'high', 'critical')),
    recommendations JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_geriatric_screenings_patient ON geriatric_screenings(patient_id);

-- =============================================================================
-- TABLE: sos_alerts — Emergency alerts
-- =============================================================================
CREATE TABLE IF NOT EXISTS sos_alerts (
    id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    alert_type VARCHAR(50) DEFAULT 'emergency',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    message TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'cancelled')),
    acknowledged_by VARCHAR(50),
    resolved_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sos_alerts_patient ON sos_alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_status ON sos_alerts(status) WHERE status = 'active';

-- =============================================================================
-- TABLE: follow_ups — Follow-up tracking
-- =============================================================================
CREATE TABLE IF NOT EXISTS follow_ups (
    id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    doctor_id VARCHAR(50),
    appointment_id VARCHAR(50),
    follow_up_date TIMESTAMP WITH TIME ZONE,
    reason TEXT,
    instructions TEXT,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'overdue')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_follow_ups_patient ON follow_ups(patient_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_doctor ON follow_ups(doctor_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON follow_ups(status) WHERE status = 'active';

-- =============================================================================
-- TABLE: nursing_tasks — Nursing dashboard tasks
-- =============================================================================
CREATE TABLE IF NOT EXISTS nursing_tasks (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'NT-' || substr(gen_random_uuid()::text, 1, 12),
    nurse_id VARCHAR(50),
    patient_id VARCHAR(50) NOT NULL,
    task_type VARCHAR(50) NOT NULL DEFAULT 'general',
    description TEXT,
    priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    due_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_nursing_tasks_nurse ON nursing_tasks(nurse_id);
CREATE INDEX IF NOT EXISTS idx_nursing_tasks_status ON nursing_tasks(status) WHERE status = 'pending';

-- =============================================================================
-- TABLE: predictive_analytics — AI predictive analysis results
-- =============================================================================
CREATE TABLE IF NOT EXISTS predictive_analytics (
    id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    analysis_type VARCHAR(50) NOT NULL DEFAULT 'general',
    risk_scores JSONB DEFAULT '{}'::jsonb,
    model_version VARCHAR(20) DEFAULT '1.0.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_predictive_analytics_patient ON predictive_analytics(patient_id);
CREATE INDEX IF NOT EXISTS idx_predictive_analytics_type ON predictive_analytics(analysis_type);

-- =============================================================================
-- TABLE: ai_chat_history — AI chat message persistence
-- =============================================================================
CREATE TABLE IF NOT EXISTS ai_chat_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    session_id VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    context JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_user_session ON ai_chat_history(user_id, session_id);

-- =============================================================================
-- TABLE: emr_records — Electronic Medical Records (ensure exists)
-- =============================================================================
CREATE TABLE IF NOT EXISTS emr_records (
    id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50),
    doctor_id VARCHAR(50),
    visit_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    chief_complaint TEXT,
    diagnosis TEXT,
    diagnosis_code VARCHAR(20),
    treatment TEXT,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_emr_records_patient ON emr_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_emr_records_doctor ON emr_records(doctor_id);

\echo '>>> Phase 2.1 Migration: Complete!'
