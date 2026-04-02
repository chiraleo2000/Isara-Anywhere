-- Migration: Add meeting URL and confirmation tracking columns to appointments table
-- Date: 2026-04-01
-- Purpose: Support separate doctor/patient/guest Jitsi URLs and track who confirmed

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_meeting_url TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_meeting_url TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS guest_meeting_url TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmed_by VARCHAR(50);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmed_by_email VARCHAR(255);
