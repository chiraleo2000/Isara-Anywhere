-- =============================================================================
-- Migration: v1.6.0 - Fix Content Approval & Consultant Schema
-- Date: 2026-03-30
-- Description: Add missing columns to medical_content and clinical_resources
--              tables needed for the approval workflow.
-- =============================================================================

BEGIN;

-- 1. Add missing columns to medical_content table
ALTER TABLE medical_content
  ADD COLUMN IF NOT EXISTS approved_by VARCHAR(50) REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS author_name VARCHAR(255);

-- 2. Add missing column to clinical_resources table
ALTER TABLE clinical_resources
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 3. Backfill author_name from users table for existing content
UPDATE medical_content mc
SET author_name = COALESCE(u.name_thai, u.name)
FROM users u
WHERE mc.author_id = u.id
  AND mc.author_name IS NULL;

-- 4. Ensure consultants table has all required columns
ALTER TABLE consultants
  ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'shared',
  ADD COLUMN IF NOT EXISTS updated_by VARCHAR(50);

COMMIT;
