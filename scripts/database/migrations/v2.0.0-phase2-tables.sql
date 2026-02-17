-- =============================================================================
-- Phase 2 Migration: Mobile App Support & Enhanced Features
-- Version: 2.0.0
-- Date: 2025-01-27
-- Description: Adds tables for device tokens, push notifications, biometric auth,
--              multi-API connections, offline sync, and notification preferences
-- =============================================================================

\echo '>>> Phase 2 Migration: Creating new tables...'

-- =============================================================================
-- TABLE: device_tokens - Push notification device registration
-- =============================================================================
CREATE TABLE IF NOT EXISTS device_tokens (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'DT-' || substr(gen_random_uuid()::text, 1, 12),
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_token TEXT NOT NULL,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    device_name VARCHAR(255),
    device_model VARCHAR(255),
    os_version VARCHAR(50),
    app_version VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_platform ON device_tokens(platform);
CREATE UNIQUE INDEX IF NOT EXISTS idx_device_tokens_unique ON device_tokens(user_id, device_token);

-- =============================================================================
-- TABLE: biometric_credentials - Biometric authentication (fingerprint/face)
-- =============================================================================
CREATE TABLE IF NOT EXISTS biometric_credentials (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'BIO-' || substr(gen_random_uuid()::text, 1, 12),
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credential_type VARCHAR(20) NOT NULL CHECK (credential_type IN ('fingerprint', 'face_id', 'iris')),
    public_key TEXT NOT NULL,
    credential_id TEXT NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_biometric_credentials_user_id ON biometric_credentials(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_biometric_credentials_device ON biometric_credentials(user_id, device_id, credential_type);

-- =============================================================================
-- TABLE: refresh_tokens - JWT refresh token rotation
-- =============================================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'RT-' || substr(gen_random_uuid()::text, 1, 12),
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    device_id VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN DEFAULT false,
    revoked_at TIMESTAMP WITH TIME ZONE,
    replaced_by VARCHAR(50),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at) WHERE is_revoked = false;

-- =============================================================================
-- TABLE: push_subscriptions - Push notification preferences & subscriptions
-- =============================================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'PS-' || substr(gen_random_uuid()::text, 1, 12),
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_reminders BOOLEAN DEFAULT true,
    medication_reminders BOOLEAN DEFAULT true,
    health_tips BOOLEAN DEFAULT true,
    lab_results BOOLEAN DEFAULT true,
    doctor_messages BOOLEAN DEFAULT true,
    system_updates BOOLEAN DEFAULT true,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    language_preference VARCHAR(10) DEFAULT 'th',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

-- =============================================================================
-- TABLE: user_api_connections - Multi-API service connections
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_api_connections (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'CONN-' || substr(gen_random_uuid()::text, 1, 12),
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_type VARCHAR(50) NOT NULL CHECK (service_type IN (
        'patient_portal', 'doctor_portal', 'meeting_server',
        'google_fit', 'apple_health', 'samsung_health',
        'pharmacy_api', 'lab_api', 'hospital_his',
        'line_notify', 'thai_id'
    )),
    service_url TEXT,
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    connection_status VARCHAR(20) DEFAULT 'active' CHECK (connection_status IN ('active', 'expired', 'revoked', 'error')),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_api_connections_user ON user_api_connections(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_api_connections_unique ON user_api_connections(user_id, service_type);

-- =============================================================================
-- TABLE: api_connection_audit - Audit trail for API connections
-- =============================================================================
CREATE TABLE IF NOT EXISTS api_connection_audit (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'ACA-' || substr(gen_random_uuid()::text, 1, 12),
    connection_id VARCHAR(50) REFERENCES user_api_connections(id) ON DELETE SET NULL,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    service_type VARCHAR(50) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_connection_audit_user ON api_connection_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_api_connection_audit_connection ON api_connection_audit(connection_id);

-- =============================================================================
-- TABLE: sync_queue - Offline sync queue for mobile
-- =============================================================================
CREATE TABLE IF NOT EXISTS sync_queue (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'SQ-' || substr(gen_random_uuid()::text, 1, 12),
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    operation VARCHAR(20) NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
    payload JSONB NOT NULL,
    client_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    server_timestamp TIMESTAMP WITH TIME ZONE,
    sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'conflict', 'failed')),
    conflict_resolution JSONB,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 5,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_user ON sync_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(sync_status) WHERE sync_status != 'synced';
CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity_type, entity_id);

-- =============================================================================
-- TABLE: notification_preferences - Granular notification settings
-- =============================================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'NP-' || substr(gen_random_uuid()::text, 1, 12),
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('push', 'email', 'sms', 'in_app', 'line')),
    category VARCHAR(50) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_preferences_unique ON notification_preferences(user_id, channel, category);

-- =============================================================================
-- TABLE: user_settings - Mobile app + web settings
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_settings (
    user_id VARCHAR(50) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    language VARCHAR(10) DEFAULT 'th',
    font_size VARCHAR(10) DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large')),
    biometric_enabled BOOLEAN DEFAULT false,
    auto_sync BOOLEAN DEFAULT true,
    sync_on_wifi_only BOOLEAN DEFAULT false,
    data_saver_mode BOOLEAN DEFAULT false,
    accessibility_high_contrast BOOLEAN DEFAULT false,
    accessibility_screen_reader BOOLEAN DEFAULT false,
    last_active_role VARCHAR(20) DEFAULT 'patient' CHECK (last_active_role IN ('patient', 'doctor')),
    onboarding_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- Add updated_at triggers for new tables
-- =============================================================================
DO $$ 
BEGIN
    -- Create update_updated_at_column function if not exists
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $trigger$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $trigger$ LANGUAGE plpgsql;
    
    -- Device tokens trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_device_tokens_updated_at') THEN
        CREATE TRIGGER update_device_tokens_updated_at BEFORE UPDATE ON device_tokens
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Biometric credentials trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_biometric_credentials_updated_at') THEN
        CREATE TRIGGER update_biometric_credentials_updated_at BEFORE UPDATE ON biometric_credentials
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Push subscriptions trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_push_subscriptions_updated_at') THEN
        CREATE TRIGGER update_push_subscriptions_updated_at BEFORE UPDATE ON push_subscriptions
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- User API connections trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_api_connections_updated_at') THEN
        CREATE TRIGGER update_user_api_connections_updated_at BEFORE UPDATE ON user_api_connections
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Sync queue trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_sync_queue_updated_at') THEN
        CREATE TRIGGER update_sync_queue_updated_at BEFORE UPDATE ON sync_queue
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Notification preferences trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_notification_preferences_updated_at') THEN
        CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- User settings trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_settings_updated_at') THEN
        CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- =============================================================================
-- SEED DATA for Phase 2 tables
-- =============================================================================
\echo '>>> Seeding Phase 2 data...'

-- Device tokens (demo)
INSERT INTO device_tokens (id, user_id, device_token, platform, device_name, device_model, os_version, app_version) VALUES
('DT-SOMCHAI-01', 'PATIENT-SOMCHAI', 'expo-push-token-somchai-demo', 'android', 'Samsung Galaxy S24', 'SM-S926B', 'Android 15', '2.0.0'),
('DT-ANAN-01', 'PATIENT-ANAN', 'expo-push-token-anan-demo', 'ios', 'iPhone 15 Pro', 'iPhone16,1', 'iOS 18.2', '2.0.0'),
('DT-DOC-01', 'DOC-TEST-001', 'expo-push-token-doctor-demo', 'android', 'Google Pixel 9', 'Pixel 9', 'Android 15', '2.0.0')
ON CONFLICT DO NOTHING;

-- Push subscriptions (demo)
INSERT INTO push_subscriptions (id, user_id, appointment_reminders, medication_reminders, health_tips, lab_results, doctor_messages, system_updates, language_preference) VALUES
('PS-SOMCHAI', 'PATIENT-SOMCHAI', true, true, true, true, true, true, 'th'),
('PS-ANAN', 'PATIENT-ANAN', true, true, false, true, true, true, 'th'),
('PS-DOC-01', 'DOC-TEST-001', true, false, false, true, true, true, 'en')
ON CONFLICT DO NOTHING;

-- User API connections (demo - internal services)
INSERT INTO user_api_connections (id, user_id, service_type, service_url, connection_status, metadata) VALUES
('CONN-SOMCHAI-PAT', 'PATIENT-SOMCHAI', 'patient_portal', 'https://izara-patient-portal-dev-testing-hvht4obouq-as.a.run.app', 'active', '{"version": "1.4.8"}'::jsonb),
('CONN-SOMCHAI-MEET', 'PATIENT-SOMCHAI', 'meeting_server', 'https://izara-meeting-server-dev-testing-hvht4obouq-as.a.run.app', 'active', '{"version": "1.0.0"}'::jsonb),
('CONN-DOC-DOC', 'DOC-TEST-001', 'doctor_portal', 'https://izara-doctor-portal-dev-testing-hvht4obouq-as.a.run.app', 'active', '{"version": "1.4.8"}'::jsonb),
('CONN-DOC-MEET', 'DOC-TEST-001', 'meeting_server', 'https://izara-meeting-server-dev-testing-hvht4obouq-as.a.run.app', 'active', '{"version": "1.0.0"}'::jsonb)
ON CONFLICT DO NOTHING;

-- User settings (demo)
INSERT INTO user_settings (user_id, theme, language, biometric_enabled, auto_sync, last_active_role, onboarding_completed) VALUES
('PATIENT-SOMCHAI', 'system', 'th', false, true, 'patient', true),
('PATIENT-ANAN', 'dark', 'th', true, true, 'patient', true),
('DOC-TEST-001', 'light', 'en', false, true, 'doctor', true),
('PATIENT-DEMO', 'system', 'th', false, true, 'patient', false)
ON CONFLICT DO NOTHING;

-- Notification preferences (demo)
INSERT INTO notification_preferences (id, user_id, channel, category, enabled) VALUES
('NP-S-PUSH-APT', 'PATIENT-SOMCHAI', 'push', 'appointment', true),
('NP-S-PUSH-MED', 'PATIENT-SOMCHAI', 'push', 'medication', true),
('NP-S-PUSH-HEALTH', 'PATIENT-SOMCHAI', 'push', 'health_tip', true),
('NP-S-EMAIL-APT', 'PATIENT-SOMCHAI', 'email', 'appointment', true),
('NP-S-EMAIL-LAB', 'PATIENT-SOMCHAI', 'email', 'lab_result', true),
('NP-A-PUSH-APT', 'PATIENT-ANAN', 'push', 'appointment', true),
('NP-A-PUSH-MED', 'PATIENT-ANAN', 'push', 'medication', true),
('NP-D-PUSH-APT', 'DOC-TEST-001', 'push', 'appointment', true),
('NP-D-PUSH-EMR', 'DOC-TEST-001', 'push', 'emr_update', true)
ON CONFLICT DO NOTHING;

\echo '>>> Phase 2 seed data complete.'
