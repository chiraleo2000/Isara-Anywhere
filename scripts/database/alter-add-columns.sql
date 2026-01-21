-- Add missing column for doctor_profiles
ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS years_of_experience INTEGER DEFAULT 0;
ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS consultation_fee DECIMAL(10,2) DEFAULT 500.00;
ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;
