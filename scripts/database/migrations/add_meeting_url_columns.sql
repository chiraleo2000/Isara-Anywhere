-- Migration: Add separate meeting URL columns and confirmation tracking to appointments table
-- Required for: Doctor/Patient/Guest Jitsi URLs + confirmed_by tracking
-- Safe to run multiple times (uses IF NOT EXISTS pattern via DO blocks)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'doctor_meeting_url') THEN
    ALTER TABLE appointments ADD COLUMN doctor_meeting_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'patient_meeting_url') THEN
    ALTER TABLE appointments ADD COLUMN patient_meeting_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'guest_meeting_url') THEN
    ALTER TABLE appointments ADD COLUMN guest_meeting_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'confirmed_by') THEN
    ALTER TABLE appointments ADD COLUMN confirmed_by VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'confirmed_by_email') THEN
    ALTER TABLE appointments ADD COLUMN confirmed_by_email VARCHAR(255);
  END IF;
END $$;
