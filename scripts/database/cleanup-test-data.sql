-- ============================================================================
-- CLEANUP TEST-GENERATED DATA
-- Removes all E2E test data, keeping only original seed data
-- Works on both local (Docker) and cloud (GCE VM) databases
-- ============================================================================

BEGIN;

-- 1. Clear all sessions and tokens
DELETE FROM sessions;
DELETE FROM refresh_tokens;

-- 2. Clear meeting children FIRST (FK dependencies)
DELETE FROM meeting_transcripts;
DELETE FROM ai_validations;
DELETE FROM meeting_records;

-- 3. Clear prescriptions and lab orders
DELETE FROM prescriptions;
DELETE FROM lab_orders;

-- 4. Clear EMR (references appointments via FK)
DELETE FROM emr;

-- 5. Clear ALL appointments (tests create their own)
DELETE FROM appointments;

-- 6. Clear generated content (keep seed MC-001 to MC-009)
DELETE FROM medical_content WHERE id NOT LIKE 'MC-00%';

-- 7. Clear generated clinical_resources (keep seed CR-001 to CR-006)
DELETE FROM clinical_resources WHERE id NOT LIKE 'CR-00%';

-- 8. Clear generated consultants (keep seed)
DELETE FROM consultants WHERE id NOT LIKE 'EXT-%' AND id NOT LIKE 'CONS-00%';

-- 9. Clear ALL vital_signs (tests create their own)
DELETE FROM vital_signs;

-- 10. Clear ALL notifications
DELETE FROM notifications;

-- 11. Clean all child tables for non-core users/doctors
DELETE FROM doctor_schedules WHERE doctor_id NOT IN ('DOC-TEST-001','DOC-SIRIPORN-001','DOC-SOMCHAI-001','DOC-PIYAWAT-001','DOC-KANNIKA-001');
DELETE FROM doctor_profiles WHERE doctor_id NOT IN ('DOC-TEST-001','DOC-SIRIPORN-001','DOC-SOMCHAI-001','DOC-PIYAWAT-001','DOC-KANNIKA-001');
DELETE FROM doctor_reviews;

-- 12. Clean PHR/living wills for non-core patients
DELETE FROM phr WHERE patient_id NOT IN ('PATIENT-SOMCHAI','PATIENT-ANAN','PATIENT-DEMO');
DELETE FROM living_wills WHERE patient_id NOT IN ('PATIENT-SOMCHAI','PATIENT-ANAN','PATIENT-DEMO');

-- 13. Clean all session/device/preference tables
DELETE FROM patient_profiles;
DELETE FROM patient_consents;
DELETE FROM device_tokens;
DELETE FROM push_subscriptions;
DELETE FROM notification_preferences;
DELETE FROM user_settings;
DELETE FROM sync_queue;
DELETE FROM password_resets;
DELETE FROM biometric_credentials;
DELETE FROM user_api_connections;

-- 14. Clean E2E generated doctors (keep seed 3 + JSON extra 2)
DELETE FROM doctors WHERE id NOT IN (
  'DOC-TEST-001','DOC-SIRIPORN-001','DOC-SOMCHAI-001',
  'DOC-PIYAWAT-001','DOC-KANNIKA-001'
);

-- 15. Clean E2E generated users (keep 9 core users)
DELETE FROM users WHERE id NOT IN (
  'ADMIN-TEST-001','DOC-TEST-001','DOC-SOMCHAI-001','DOC-SIRIPORN-001',
  'PATIENT-SOMCHAI','PATIENT-ANAN','PATIENT-DEMO',
  'DOC-PIYAWAT-001','DOC-KANNIKA-001'
);

COMMIT;

-- Show final counts
SELECT 'users' as tbl, count(*) FROM users
UNION ALL SELECT 'doctors', count(*) FROM doctors
UNION ALL SELECT 'appointments', count(*) FROM appointments
UNION ALL SELECT 'medical_content', count(*) FROM medical_content
UNION ALL SELECT 'clinical_resources', count(*) FROM clinical_resources
UNION ALL SELECT 'consultants', count(*) FROM consultants
UNION ALL SELECT 'vital_signs', count(*) FROM vital_signs
UNION ALL SELECT 'phr', count(*) FROM phr
UNION ALL SELECT 'living_wills', count(*) FROM living_wills
UNION ALL SELECT 'notifications', count(*) FROM notifications
UNION ALL SELECT 'meeting_records', count(*) FROM meeting_records
UNION ALL SELECT 'prescriptions', count(*) FROM prescriptions
UNION ALL SELECT 'sessions', count(*) FROM sessions
ORDER BY tbl;
