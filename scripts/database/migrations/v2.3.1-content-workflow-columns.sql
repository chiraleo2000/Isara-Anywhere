-- v2.3.1 — medical_content + clinical_resources workflow columns (approval, comments, history)
-- Idempotent; safe on fresh init and existing volumes.

ALTER TABLE medical_content ADD COLUMN IF NOT EXISTS summary_thai TEXT;
ALTER TABLE medical_content ADD COLUMN IF NOT EXISTS summary_english TEXT;
ALTER TABLE medical_content ADD COLUMN IF NOT EXISTS content_type VARCHAR(50) DEFAULT 'article';
ALTER TABLE medical_content ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE medical_content ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE medical_content ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE medical_content ADD COLUMN IF NOT EXISTS author_name VARCHAR(255);
ALTER TABLE medical_content ADD COLUMN IF NOT EXISTS approved_by VARCHAR(50) REFERENCES users(id);
ALTER TABLE medical_content ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE medical_content ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE medical_content ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE medical_content ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE medical_content ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb;

ALTER TABLE clinical_resources ADD COLUMN IF NOT EXISTS description_thai TEXT;
ALTER TABLE clinical_resources ADD COLUMN IF NOT EXISTS description_english TEXT;
ALTER TABLE clinical_resources ADD COLUMN IF NOT EXISTS resource_type VARCHAR(50) DEFAULT 'guideline';
ALTER TABLE clinical_resources ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE clinical_resources ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE clinical_resources ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE clinical_resources ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE clinical_resources ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE clinical_resources ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
