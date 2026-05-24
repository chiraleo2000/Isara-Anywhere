-- ============================================================================
-- Idempotent migration: ensure all appointment meeting-link columns exist
-- Safe to run multiple times (IF NOT EXISTS / OR REPLACE).
-- ============================================================================

-- Meeting link columns (patient portal stores meet_link; doctor portal confirms to meeting_link)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS meet_link TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS meeting_link TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS jitsi_room_name VARCHAR(255);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_meeting_url TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_meeting_url TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS guest_meeting_url TEXT;

-- Confirmation tracking columns
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmed_by VARCHAR(50);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmed_by_email VARCHAR(255);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmed_date DATE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmed_time TIME;

-- Status / urgency
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS urgency_level VARCHAR(20) DEFAULT 'normal';

-- Timestamps
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Extra scheduling
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_date DATE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_time TIME;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS requested_date DATE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS requested_time TIME;

-- AI / clinical info
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS symptoms JSONB DEFAULT '[]'::jsonb;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS symptom_description TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS ai_triage JSONB;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS invitees JSONB DEFAULT '[]'::jsonb;

-- updated_at trigger helper (harmless if already correct)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- notifications table (needed by patient portal broadcastNewAppointment)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(50),
  type VARCHAR(100),
  title TEXT,
  message TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- done
-- Lab orders columns (doctor portal creates; patient PHR reads)
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS ordered_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS result_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS notes TEXT;

SELECT 'appointment columns migration completed' AS result;
