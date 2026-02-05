-- =============================================================================
-- CLOUD DATABASE MIGRATION FIX
-- =============================================================================
-- Run this on Cloud SQL to add missing columns
-- =============================================================================

-- Add missing columns to PHR table
ALTER TABLE phr ADD COLUMN IF NOT EXISTS blood_type VARCHAR(10);
ALTER TABLE phr ADD COLUMN IF NOT EXISTS height_cm DECIMAL(5,1);
ALTER TABLE phr ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(5,1);
ALTER TABLE phr ADD COLUMN IF NOT EXISTS bmi DECIMAL(4,1);
ALTER TABLE phr ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255);
ALTER TABLE phr ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(50);
ALTER TABLE phr ADD COLUMN IF NOT EXISTS emergency_contact_relation VARCHAR(100);

-- Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rejected_by VARCHAR(50);

-- Verify the changes
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'phr' AND column_name IN ('blood_type', 'height_cm', 'weight_kg', 'bmi');
