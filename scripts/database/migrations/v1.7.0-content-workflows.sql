-- =============================================================================
-- Migration: v1.7.0 - Content Workflows (metadata, history, comments, tags)
-- Date: 2026-07-09
-- =============================================================================

BEGIN;

-- 1. medical_content extended columns
ALTER TABLE medical_content
  ADD COLUMN IF NOT EXISTS summary_thai TEXT,
  ADD COLUMN IF NOT EXISTS summary_english TEXT,
  ADD COLUMN IF NOT EXISTS content_type VARCHAR(30) DEFAULT 'article',
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS approved_by VARCHAR(50) REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS author_name VARCHAR(255);

-- 2. clinical_resources extended columns
ALTER TABLE clinical_resources
  ADD COLUMN IF NOT EXISTS description_thai TEXT,
  ADD COLUMN IF NOT EXISTS description_english TEXT,
  ADD COLUMN IF NOT EXISTS resource_type VARCHAR(30) DEFAULT 'guideline',
  ADD COLUMN IF NOT EXISTS references_list JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb;

-- 3. content_tags registry
CREATE TABLE IF NOT EXISTS content_tags (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  name_thai VARCHAR(255),
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('medical', 'clinical')),
  created_by VARCHAR(50) REFERENCES users(id),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_content_tags_type ON content_tags(content_type);

-- 4. Normalize clinical resource status
UPDATE clinical_resources SET status = 'published' WHERE status = 'approved';

-- 5. Remap clinical resource categories to UI category IDs
UPDATE clinical_resources SET category = 'treatment' WHERE category = 'cardiovascular';
UPDATE clinical_resources SET category = 'pharmacology' WHERE category = 'endocrinology';
UPDATE clinical_resources SET category = 'treatment' WHERE category = 'infectious';
UPDATE clinical_resources SET category = 'diagnosis' WHERE category = 'psychiatry';
UPDATE clinical_resources SET category = 'nursing' WHERE category = 'geriatrics';
UPDATE clinical_resources SET category = 'treatment' WHERE category = 'general';

COMMIT;
