-- ============================================================================
-- Migration: v2.2.0 - AI Specialty Matching & Admin Audit Trail
-- Description: Creates tables for AI appointment specialty suggestions and
--              admin action audit logging.
-- Date: 2026-04-01
-- ============================================================================

-- Ensure uuid-ossp extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Table: appointment_ai_suggestions
-- Stores every Gemini AI specialty suggestion for pool appointments.
-- ============================================================================
CREATE TABLE IF NOT EXISTS appointment_ai_suggestions (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id       VARCHAR(50) NOT NULL,
    suggested_specialty  VARCHAR(100),
    secondary_specialty  VARCHAR(100),
    confidence           DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    reasoning            TEXT,
    ai_model             VARCHAR(50),
    admin_id             VARCHAR(50) NOT NULL,
    accepted             BOOLEAN DEFAULT NULL,
    created_at           TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for looking up suggestions by appointment
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_appointment_id
    ON appointment_ai_suggestions (appointment_id);

-- Index for audit queries by admin
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_admin_id
    ON appointment_ai_suggestions (admin_id);

-- Index for time-range queries
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_created_at
    ON appointment_ai_suggestions (created_at);

-- ============================================================================
-- Table: admin_actions
-- Audit trail for all administrative actions (assignment, rejection, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_actions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id    VARCHAR(50) NOT NULL,
    action      VARCHAR(100) NOT NULL,
    target_id   VARCHAR(50),
    metadata    JSONB DEFAULT '{}'::jsonb,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for filtering actions by admin
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id
    ON admin_actions (admin_id);

-- Index for filtering actions by target (e.g. appointment_id)
CREATE INDEX IF NOT EXISTS idx_admin_actions_target_id
    ON admin_actions (target_id);

-- Composite index for audit range queries
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_created
    ON admin_actions (admin_id, created_at);

-- ============================================================================
-- Done
-- ============================================================================
SELECT 'v2.2.0-ai-specialty-matching migration completed' AS status;
