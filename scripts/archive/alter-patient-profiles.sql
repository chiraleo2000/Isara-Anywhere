-- Add missing columns for patient_profiles
ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100);
ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);
ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS allergies JSONB DEFAULT '[]';
ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS chronic_conditions JSONB DEFAULT '[]';
