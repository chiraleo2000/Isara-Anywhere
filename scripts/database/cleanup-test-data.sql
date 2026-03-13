-- ============================================================================
-- CLEANUP TEST-GENERATED DATA
-- Removes all E2E test data, keeping only original seed data
-- ============================================================================

BEGIN;

-- 1. Clear all sessions and tokens
DELETE FROM sessions;
DELETE FROM refresh_tokens;

-- 2. Clear meeting children (safe with CASCADE-like approach)
DELETE FROM meeting_records;

-- 3. Clear prescriptions
DELETE FROM prescriptions;

-- 4. Clear E2E test appointments (keep only seed APT-TEST-*)
DELETE FROM appointments WHERE id NOT LIKE 'APT-TEST-%';

-- 5. Clear generated content (keep seed MC-001 to MC-009)
DELETE FROM medical_content WHERE id NOT LIKE 'MC-00%';

-- 6. Clear generated clinical_resources (keep seed CR-001 to CR-006)
DELETE FROM clinical_resources WHERE id NOT LIKE 'CR-00%';

-- 7. Clear generated consultants (keep seed)
DELETE FROM consultants WHERE id NOT LIKE 'EXT-%' AND id NOT LIKE 'CONS-00%';

-- 8. Clean vital_signs - remove all for test users, keep only 1 per seed patient
DELETE FROM vital_signs WHERE patient_id LIKE '%17%';
DELETE FROM vital_signs WHERE id NOT IN (
  SELECT DISTINCT ON (patient_id) id 
  FROM vital_signs 
  ORDER BY patient_id, measured_at ASC
);

-- 9. Clean PHR for test users
DELETE FROM phr WHERE patient_id LIKE '%17%';

-- 10. Clean living wills for test users
DELETE FROM living_wills WHERE patient_id LIKE '%17%';

-- 11. Clean notifications for test users
DELETE FROM notifications WHERE user_id LIKE '%17%';

-- 12. Clean all child tables for test users/doctors
DELETE FROM doctor_schedules WHERE doctor_id LIKE '%17%';
DELETE FROM doctor_profiles WHERE doctor_id LIKE '%17%';
DELETE FROM doctor_reviews WHERE doctor_id LIKE '%17%' OR patient_id LIKE '%17%';
DELETE FROM patient_profiles WHERE patient_id LIKE '%17%';
DELETE FROM patient_consents WHERE patient_id LIKE '%17%';
DELETE FROM device_tokens WHERE user_id LIKE '%17%';
DELETE FROM push_subscriptions WHERE user_id LIKE '%17%';
DELETE FROM notification_preferences WHERE user_id LIKE '%17%';
DELETE FROM user_settings WHERE user_id LIKE '%17%';
DELETE FROM user_api_connections WHERE user_id LIKE '%17%';
DELETE FROM biometric_credentials WHERE user_id LIKE '%17%';
DELETE FROM password_resets WHERE user_id LIKE '%17%';
DELETE FROM sync_queue WHERE user_id LIKE '%17%';
DELETE FROM lab_orders WHERE patient_id LIKE '%17%' OR doctor_id LIKE '%17%';

-- 13. Clean E2E generated doctors (keep seed 3 + JSON extra 2)
DELETE FROM doctors WHERE id NOT IN (
  'DOC-TEST-001','DOC-SIRIPORN-001','DOC-SOMCHAI-001',
  'DOC-PIYAWAT-001','DOC-KANNIKA-001'
);

-- 14. Clean E2E generated users (keep 9 core users)
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
