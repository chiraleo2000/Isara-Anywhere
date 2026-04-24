-- ============================================================================
-- IZARA TELEMEDICINE — IDEMPOTENT DEV SEED DATA
-- ============================================================================
-- Safe to run repeatedly (uses ON CONFLICT DO NOTHING).
-- Does NOT drop or truncate any tables.
-- Run after izara-database.sql has created the schema.
--
-- Usage:
--   docker exec -i izara-postgres psql -U postgres -d izara_phase1 -f /docker-entrypoint-initdb.d/seed-dev-data.sql
--   # or via PowerShell:
--   Get-Content scripts\database\seed-dev-data.sql | docker exec -i izara-postgres psql -U postgres -d izara_phase1
-- ============================================================================

\echo '══════════════════════════════════════════'
\echo '  IZARA DEV SEED — idempotent insert'
\echo '══════════════════════════════════════════'

-- ──────────────────────────────────────────
-- 1. USERS  (admin, doctor, patient)
-- ──────────────────────────────────────────
\echo '>>> Users...'

-- Admin (password: IzaraAdmin@2024)
INSERT INTO users (id, email, password_hash, role, name, name_thai, is_active, is_verified, is_approved, approval_status, is_admin, admin_privileges)
VALUES ('ADMIN-TEST-001', 'admin.test@izara.com',
        '$2b$10$fx5arkpb8YI7lEK5lcHdXeksczdG.qloim/uWghlBZXyxv.dNo/wq',
        'admin', 'Dr. Admin Kind', 'นพ. ผู้ดูแลระบบ ใจดี',
        true, true, true, 'approved', true,
        '{"canManageDoctors":true,"canManagePatients":true,"canManageAppointments":true,"canViewAnalytics":true,"canManageSettings":true,"level":"super_admin"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Doctor Test (password: IzaraDoctor@2024)
INSERT INTO users (id, email, password_hash, role, name, name_thai, doctor_id, medical_license_number, specialty, is_active, is_verified, is_approved, approval_status)
VALUES ('DOC-TEST-001', 'doctor.test@izara.com',
        '$2b$10$aPN6uhBrLoms36C8/017be2GWqUqaPJa6WaTaZ8LrnwAeaf3GajrO',
        'doctor', 'Dr. Test Good', 'นพ. ทดสอบ แพทย์ดี',
        'DOC-TEST-001', 'TH-MD-2020-001', 'Internal Medicine',
        true, true, true, 'approved')
ON CONFLICT (id) DO NOTHING;

-- Dr. Somchai Prasert (Cardiologist)
INSERT INTO users (id, email, password_hash, role, name, name_thai, doctor_id, medical_license_number, specialty, hospital_name, is_active, is_verified, is_approved, approval_status)
VALUES ('DOC-SOMCHAI-001', 'somchai.prasert@izara.com',
        '$2b$10$aPN6uhBrLoms36C8/017be2GWqUqaPJa6WaTaZ8LrnwAeaf3GajrO',
        'doctor', 'Dr. Somchai Prasert', 'นพ.สมชาย ประเสริฐ',
        'DOC-SOMCHAI-001', 'TH-MD-2010-100', 'Cardiology', 'Bangkok General Hospital',
        true, true, true, 'approved')
ON CONFLICT (id) DO NOTHING;

-- Dr. Siriporn Thongchai (Endocrinologist)
INSERT INTO users (id, email, password_hash, role, name, name_thai, doctor_id, medical_license_number, specialty, hospital_name, is_active, is_verified, is_approved, approval_status)
VALUES ('DOC-SIRIPORN-001', 'siriporn.thongchai@izara.com',
        '$2b$10$aPN6uhBrLoms36C8/017be2GWqUqaPJa6WaTaZ8LrnwAeaf3GajrO',
        'doctor', 'Dr. Siriporn Thongchai', 'พญ.ศิริพร ทองชัย',
        'DOC-SIRIPORN-001', 'TH-MD-2008-055', 'Endocrinology', 'Bumrungrad Hospital',
        true, true, true, 'approved')
ON CONFLICT (id) DO NOTHING;

-- Patient: Somchai Mankong (password: P@ssw0rd)
INSERT INTO users (id, email, password_hash, role, name, name_thai, patient_id, is_active, is_verified, is_approved, approval_status)
VALUES ('PATIENT-SOMCHAI', 'Somchai.Mankong@gmail.com',
        '$2b$10$64bK0EpjyC7quRGJNvRqmuH/jX3mA4dzyzYa2vgA2q.H3ZxkQwAmy',
        'patient', 'Somchai Mankong', 'นายสมชาย มั่นคง',
        'PATIENT-SOMCHAI', true, true, true, 'approved')
ON CONFLICT (id) DO NOTHING;

-- Patient: Anan Khayanrian (DM + CKD)
INSERT INTO users (id, email, password_hash, role, name, name_thai, patient_id, is_active, is_verified, is_approved, approval_status)
VALUES ('PATIENT-ANAN', 'Anan.Khayanrian@gmail.com',
        '$2b$10$64bK0EpjyC7quRGJNvRqmuH/jX3mA4dzyzYa2vgA2q.H3ZxkQwAmy',
        'patient', 'Anan Khayanrian', 'นายอนันต์ ขยันเรียน',
        'PATIENT-ANAN', true, true, true, 'approved')
ON CONFLICT (id) DO NOTHING;

-- Patient: Demo Test
INSERT INTO users (id, email, password_hash, role, name, name_thai, patient_id, is_active, is_verified, is_approved, approval_status)
VALUES ('PATIENT-DEMO', 'demo.test@gmail.com',
        '$2b$10$64bK0EpjyC7quRGJNvRqmuH/jX3mA4dzyzYa2vgA2q.H3ZxkQwAmy',
        'patient', 'Demo Test Patient', 'นาย ทดสอบ ระบบ',
        'PATIENT-DEMO', true, true, true, 'approved')
ON CONFLICT (id) DO NOTHING;

-- Doctor: Pending Approval (for admin approval workflow testing)
INSERT INTO users (id, email, password_hash, role, name, name_thai, doctor_id, medical_license_number, specialty, hospital_name, is_active, is_verified, is_approved, approval_status)
VALUES ('DOC-PENDING-001', 'pending.doctor@izara.com',
        '$2b$10$aPN6uhBrLoms36C8/017be2GWqUqaPJa6WaTaZ8LrnwAeaf3GajrO',
        'doctor', 'Dr. Pending Approval', 'นพ. รอการอนุมัติ',
        'DOC-PENDING-001', 'TH-MD-2024-999', 'General Practice', 'Provincial Hospital',
        true, true, false, 'pending')
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────
-- 2. DOCTORS TABLE
-- ──────────────────────────────────────────
\echo '>>> Doctors...'

INSERT INTO doctors (id, name, name_thai, specialty, specialty_thai, hospital, hospital_thai, avatar_url, rating, review_count, experience_years, consultation_fee, is_available)
VALUES
  ('DOC-TEST-001',     'Dr. Test Doctor',        'นพ.ทดสอบ ระบบ',        'Internal Medicine', 'อายุรกรรมทั่วไป', 'Izara Test Hospital',      'โรงพยาบาลอิซาร่า ทดสอบ',  'https://i.pravatar.cc/150?u=doctest', 5.0, 10, 5,  300.00, true),
  ('DOC-SOMCHAI-001',  'Dr. Somchai Prasert',    'นพ.สมชาย ประเสริฐ',    'Cardiology',        'หทัยวิทยา',       'Bangkok General Hospital', 'โรงพยาบาลกรุงเทพ',         'https://i.pravatar.cc/150?u=doc1',    4.8, 125, 15, 500.00, true),
  ('DOC-SIRIPORN-001', 'Dr. Siriporn Thongchai', 'พญ.ศิริพร ทองชัย',     'Endocrinology',     'ต่อมไร้ท่อ',      'Bumrungrad Hospital',      'โรงพยาบาลบำรุงราษฎร์',     'https://i.pravatar.cc/150?u=doc2',    4.9, 200, 20, 800.00, true)
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────
-- 3. DOCTOR SCHEDULES
-- ──────────────────────────────────────────
\echo '>>> Doctor schedules...'

INSERT INTO doctor_schedules (id, doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_available)
VALUES
  ('SCH-TEST-001-1', 'DOC-TEST-001', 1, '09:00', '17:00', 30, true),
  ('SCH-TEST-001-2', 'DOC-TEST-001', 2, '09:00', '17:00', 30, true),
  ('SCH-TEST-001-3', 'DOC-TEST-001', 3, '09:00', '17:00', 30, true),
  ('SCH-TEST-001-4', 'DOC-TEST-001', 4, '09:00', '17:00', 30, true),
  ('SCH-TEST-001-5', 'DOC-TEST-001', 5, '09:00', '17:00', 30, true)
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────
-- 4. PATIENT PROFILES
-- ──────────────────────────────────────────
\echo '>>> Patient profiles...'

INSERT INTO patient_profiles (patient_id, demographics, emergency_contact, insurance_info)
VALUES (
  'PATIENT-SOMCHAI',
  '{"title":"นาย","firstName":"สมชาย","lastName":"มั่นคง","firstNameEn":"Somchai","lastNameEn":"Mankong","nationalId":"1-1001-00001-01-1","dateOfBirth":"1980-03-15","age":45,"gender":"male","bloodType":"O+","phone":"081-234-5678"}'::jsonb,
  '{"name":"นางสมหญิง มั่นคง","relationship":"spouse","phone":"081-987-6543"}'::jsonb,
  '{"type":"Universal Coverage Scheme","policyNumber":"UCS-2024-001234"}'::jsonb
) ON CONFLICT (patient_id) DO NOTHING;

INSERT INTO patient_profiles (patient_id, demographics, emergency_contact, insurance_info)
VALUES (
  'PATIENT-ANAN',
  '{"title":"นาย","firstName":"อนันต์","lastName":"ขยันเรียน","firstNameEn":"Anan","lastNameEn":"Khayanrian","nationalId":"1-1002-00002-02-2","dateOfBirth":"1967-08-22","age":58,"gender":"male","bloodType":"A+","phone":"089-876-5432"}'::jsonb,
  '{"name":"นางบุษบา ขยันเรียน","relationship":"spouse","phone":"089-123-4567"}'::jsonb,
  '{"type":"Social Security","policyNumber":"SSO-2018-005678"}'::jsonb
) ON CONFLICT (patient_id) DO NOTHING;

INSERT INTO patient_profiles (patient_id, demographics, emergency_contact, insurance_info)
VALUES (
  'PATIENT-DEMO',
  '{"title":"นาย","firstName":"ทดสอบ","lastName":"ระบบ","firstNameEn":"Demo","lastNameEn":"Test","nationalId":"1-1000-00000-00-0","dateOfBirth":"1990-01-01","age":35,"gender":"male","bloodType":"B+","phone":"090-000-0000"}'::jsonb,
  '{"name":"นายพ่อ ทดสอบ","relationship":"father","phone":"091-111-1111"}'::jsonb,
  '{"type":"Private Insurance","policyNumber":"PVT-2025-000001"}'::jsonb
) ON CONFLICT (patient_id) DO NOTHING;

-- ──────────────────────────────────────────
-- 5. PHR (Personal Health Records)
-- ──────────────────────────────────────────
\echo '>>> PHR records...'

INSERT INTO phr (id, patient_id, blood_type, height_cm, weight_kg, bmi,
  allergies, chronic_conditions, medications, lifestyle,
  emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
  family_history, surgical_history, vaccinations)
VALUES (
  'PHR-SOMCHAI', 'PATIENT-SOMCHAI', 'O+', 175.0, 78.0, 25.5,
  '[]'::jsonb,
  '[{"name":"Essential Hypertension","icd10":"I10","status":"controlled"}]'::jsonb,
  '[{"name":"Amlodipine","dose":"5mg","frequency":"QD"}]'::jsonb,
  '{"smokingStatus":"never","exerciseFrequency":"2-3 times/week"}'::jsonb,
  'นางสมหญิง มั่นคง', '081-987-6543', 'spouse',
  '[{"condition":"Hypertension","relation":"father"}]'::jsonb,
  '[]'::jsonb,
  '[{"name":"COVID-19","date":"2024-01-15","type":"Pfizer Booster"}]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO phr (id, patient_id, blood_type, height_cm, weight_kg, bmi,
  allergies, chronic_conditions, medications, lifestyle,
  emergency_contact_name, emergency_contact_phone, emergency_contact_relation)
VALUES (
  'PHR-ANAN', 'PATIENT-ANAN', 'A+', 168.0, 75.0, 26.6,
  '[{"name":"Sulfonamides","severity":"moderate","reaction":"rash"}]'::jsonb,
  '[{"name":"Type 2 Diabetes","icd10":"E11","status":"controlled"},{"name":"CKD Stage 3a","icd10":"N18.3","status":"stable"}]'::jsonb,
  '[{"name":"Metformin","dose":"500mg","frequency":"BID"},{"name":"Losartan","dose":"50mg","frequency":"QD"}]'::jsonb,
  '{"smokingStatus":"former","exerciseFrequency":"daily_walk"}'::jsonb,
  'นางบุษบา ขยันเรียน', '089-123-4567', 'spouse'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO phr (id, patient_id, blood_type, height_cm, weight_kg, bmi,
  allergies, chronic_conditions, medications, lifestyle,
  emergency_contact_name, emergency_contact_phone, emergency_contact_relation)
VALUES (
  'PHR-DEMO', 'PATIENT-DEMO', 'B+', 170.0, 70.0, 24.2,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '{"smokingStatus":"never","exerciseFrequency":"3 times/week"}'::jsonb,
  'นายพ่อ ทดสอบ', '091-111-1111', 'father'
) ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────
-- 6. VITAL SIGNS
-- ──────────────────────────────────────────
\echo '>>> Vital signs...'

INSERT INTO vital_signs (patient_id, blood_pressure_systolic, blood_pressure_diastolic, heart_rate, temperature, oxygen_saturation, blood_glucose, blood_glucose_type, weight, height, source)
VALUES
  ('PATIENT-SOMCHAI', 130, 85, 75, 36.5, 98, NULL, NULL, 78, 175, 'clinic_measurement'),
  ('PATIENT-ANAN',    145, 90, 80, 36.8, 97, 145, 'fasting', 75, 168, 'clinic_measurement'),
  ('PATIENT-DEMO',    120, 80, 72, 36.6, 99, NULL, NULL, 70, 170, 'patient_input');

-- ──────────────────────────────────────────
-- 7. APPOINTMENTS
-- ──────────────────────────────────────────
\echo '>>> Appointments...'

INSERT INTO appointments (id, patient_id, doctor_id, requested_date, requested_time, confirmed_date, confirmed_time, status, symptoms, symptom_description, urgency_level, jitsi_room_name, meet_link)
VALUES
  ('APT-SEED-001', 'PATIENT-SOMCHAI', 'DOC-TEST-001', CURRENT_DATE, '09:00', CURRENT_DATE, '09:00', 'confirmed',
   '["headache","fatigue"]'::jsonb, 'ปวดหัวและเหนื่อยมา 3 วัน', 'normal', 'izara-apt-seed-001', 'https://meet.jit.si/izara-apt-seed-001'),
  ('APT-SEED-002', 'PATIENT-ANAN', 'DOC-TEST-001', CURRENT_DATE, '10:30', CURRENT_DATE, '10:30', 'confirmed',
   '["diabetes_follow_up","kidney_check"]'::jsonb, 'นัดติดตามผลเบาหวานและโรคไต', 'normal', 'izara-apt-seed-002', 'https://meet.jit.si/izara-apt-seed-002'),
  ('APT-SEED-003', 'PATIENT-DEMO', 'DOC-TEST-001', CURRENT_DATE + 1, '14:00', NULL, NULL, 'pending',
   '["general_checkup"]'::jsonb, 'ต้องการตรวจสุขภาพประจำปี', 'normal', NULL, NULL),
  ('APT-SEED-004', 'PATIENT-SOMCHAI', 'DOC-SOMCHAI-001', CURRENT_DATE + 2, '11:00', NULL, NULL, 'awaiting_doctor_response',
   '["chest_pain"]'::jsonb, 'แน่นหน้าอกเป็นพักๆ', 'urgent', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────
-- 8. NOTIFICATIONS
-- ──────────────────────────────────────────
\echo '>>> Notifications...'

INSERT INTO notifications (user_id, type, title, title_thai, message, message_thai, data)
VALUES
  ('PATIENT-SOMCHAI', 'appointment_confirmed', 'Appointment Confirmed', 'ยืนยันนัดหมายแล้ว', 'Your appointment has been confirmed', 'นัดหมายของคุณได้รับการยืนยันแล้ว', '{"appointmentId":"APT-SEED-001"}'::jsonb),
  ('PATIENT-ANAN',    'appointment_confirmed', 'Appointment Confirmed', 'ยืนยันนัดหมายแล้ว', 'Your appointment has been confirmed', 'นัดหมายของคุณได้รับการยืนยันแล้ว', '{"appointmentId":"APT-SEED-002"}'::jsonb),
  ('DOC-TEST-001',    'appointment_requested', 'New Appointment Request', 'มีนัดหมายใหม่', 'Patient has requested an appointment', 'ผู้ป่วยขอนัดหมาย', '{"appointmentId":"APT-SEED-003"}'::jsonb),
  ('ADMIN-TEST-001',  'doctor_registration', 'New Doctor Registration', 'แพทย์ใหม่ลงทะเบียน', 'Dr. Pending Approval has requested to join', 'นพ. รอการอนุมัติ ขอลงทะเบียน', '{"doctorId":"DOC-PENDING-001"}'::jsonb);

-- ──────────────────────────────────────────
-- 9. CONSULTANTS
-- ──────────────────────────────────────────
\echo '>>> Consultants...'

INSERT INTO consultants (id, name, specialty, email, phone, hospital, languages, experience_years, bio, is_available, rating, created_by)
VALUES
  ('CONS-001', 'Dr. Prasong Charoenpong', 'Nephrology', 'prasong.c@hospital.co.th', '02-555-1001', 'Siriraj Hospital', '["Thai","English"]'::jsonb, 25, 'Expert in CKD and dialysis management.', true, 4.9, 'ADMIN-TEST-001'),
  ('CONS-002', 'Dr. Wanida Thongprasert',  'Oncology',   'wanida.t@hospital.co.th',  '02-555-1002', 'Chulalongkorn Hospital', '["Thai","English","Mandarin"]'::jsonb, 20, 'Specializes in breast cancer treatment.', true, 4.8, 'ADMIN-TEST-001'),
  ('CONS-003', 'Dr. Piyarat Srisawat',     'Cardiology', 'piyarat.s@hospital.co.th', '02-555-1003', 'Bumrungrad Hospital', '["Thai","English"]'::jsonb, 18, 'Expert in interventional cardiology.', true, 4.7, 'ADMIN-TEST-001')
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────
-- NOTE: PG LISTEN/NOTIFY triggers are in a separate v2.2.0-notify-triggers.sql
-- which runs automatically via Docker init or can be applied manually:
--   \i v2.2.0-notify-triggers.sql
-- ──────────────────────────────────────────

\echo ''
\echo '══════════════════════════════════════════'
\echo '  SEED COMPLETE ✅'
\echo '══════════════════════════════════════════'
