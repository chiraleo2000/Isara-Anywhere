-- Izara Telemedicine - PostgreSQL Seed Data
-- Phase 1: Essential test data for local development
-- Run: docker exec -i izara-postgres psql -U postgres -d izara_phase1 < seed_data.sql

-- ============================================================================
-- MEDICAL CONTENT
-- ============================================================================
INSERT INTO medical_content (id, title_thai, title_english, content_thai, content_english, category, status, author_id, published_at)
VALUES 
('MC-001', 'คู่มือการจัดการโรคเบาหวาน', 'Diabetes Management Guide', 'คู่มือฉบับสมบูรณ์สำหรับการจัดการโรคเบาหวาน', 'Complete guide for managing diabetes', 'diabetes', 'published', 'DOCTOR-TEST', NOW()),
('MC-002', 'การป้องกันโรคความดันโลหิตสูง', 'Hypertension Prevention', 'เคล็ดลับการป้องกันความดันโลหิตสูง', 'Tips for preventing high blood pressure', 'cardiology', 'published', 'DOCTOR-TEST', NOW()),
('MC-003', 'เคล็ดลับอาหารเพื่อสุขภาพ', 'Healthy Diet Tips', 'แนวทางโภชนาการเพื่อสุขภาพที่ดี', 'Nutrition guidelines for healthy living', 'nutrition', 'published', 'DOCTOR-TEST', NOW()),
('MC-004', 'การดูแลสุขภาพจิต', 'Mental Health Care', 'วิธีดูแลสุขภาพจิตในชีวิตประจำวัน', 'Daily mental health care tips', 'mental-health', 'pending', 'DOCTOR-TEST', NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CLINICAL RESOURCES
-- ============================================================================
INSERT INTO clinical_resources (id, title_thai, title_english, content_thai, content_english, category, resource_type, status, author_id, published_at)
VALUES 
('CR-001', 'แนวทางการวินิจฉัยโรคเบาหวาน 2025', 'Diabetes Diagnosis Guidelines 2025', 'แนวทางการวินิจฉัยโรคเบาหวานตามมาตรฐาน ADA 2025', 'ADA 2025 diabetes diagnosis guidelines', 'diagnosis', 'guideline', 'published', 'DOCTOR-TEST', NOW()),
('CR-002', 'โปรโตคอลการรักษาความดันโลหิตสูง', 'Hypertension Treatment Protocol', 'โปรโตคอลการรักษาความดันโลหิตสูงตามแนวทางสมาคมโรคหัวใจ', 'Thai Heart Association hypertension treatment protocol', 'treatment', 'protocol', 'published', 'DOCTOR-TEST', NOW()),
('CR-003', 'งานวิจัยโรคไตเรื้อรัง', 'CKD Research Paper', 'งานวิจัยล่าสุดเกี่ยวกับการรักษาโรคไตเรื้อรัง', 'Latest research on CKD treatment', 'research', 'paper', 'published', 'DOCTOR-TEST', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CONSULTANTS
-- ============================================================================
INSERT INTO consultants (id, name, specialty, email, phone, hospital, experience_years, bio, is_available, rating)
VALUES 
('CONS-001', 'Dr. Somchai Specialist', 'Cardiology', 'dr.somchai@hospital.co.th', '02-123-4567', 'Bangkok Heart Hospital', 15, 'Specialist in cardiovascular diseases', true, 4.8),
('CONS-002', 'Dr. Wanida Diabetes', 'Endocrinology', 'dr.wanida@hospital.co.th', '02-234-5678', 'Diabetes Care Center', 12, 'Expert in diabetes and hormonal disorders', true, 4.7),
('CONS-003', 'Dr. Prasit Nephrology', 'Nephrology', 'dr.prasit@hospital.co.th', '02-345-6789', 'Kidney Care Institute', 18, 'Kidney specialist with CKD expertise', true, 4.9)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DRUGS DATABASE
-- ============================================================================
INSERT INTO drugs (id, name, name_thai, generic_name, drug_class, route, form, strength, indications, contraindications)
VALUES 
('DRUG-001', 'Metformin', 'เมทฟอร์มิน', 'Metformin HCl', 'Biguanide', 'oral', 'tablet', '500mg', '["Type 2 Diabetes", "PCOS"]', '["CKD Stage 4-5", "Lactic acidosis risk"]'),
('DRUG-002', 'Amlodipine', 'แอมโลดิพีน', 'Amlodipine Besylate', 'CCB', 'oral', 'tablet', '5mg', '["Hypertension", "Angina"]', '["Cardiogenic shock", "Severe aortic stenosis"]'),
('DRUG-003', 'Losartan', 'โลซาร์แทน', 'Losartan Potassium', 'ARB', 'oral', 'tablet', '50mg', '["Hypertension", "Diabetic nephropathy"]', '["Pregnancy", "Bilateral renal artery stenosis"]')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ICD-10 CODES
-- ============================================================================
INSERT INTO icd10_codes (id, code, description, description_thai, category)
VALUES 
('ICD-E11', 'E11', 'Type 2 diabetes mellitus', 'เบาหวานชนิดที่ 2', 'Endocrine'),
('ICD-I10', 'I10', 'Essential hypertension', 'ความดันโลหิตสูงโดยไม่ทราบสาเหตุ', 'Cardiovascular'),
('ICD-N18', 'N18', 'Chronic kidney disease', 'โรคไตเรื้อรัง', 'Genitourinary'),
('ICD-J06', 'J06', 'Acute upper respiratory infections', 'การติดเชื้อทางเดินหายใจส่วนบนเฉียบพลัน', 'Respiratory')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SAMPLE NOTIFICATIONS
-- ============================================================================
INSERT INTO notifications (id, user_id, type, title, title_thai, message, message_thai, data)
VALUES 
('NOTIF-001', 'PATIENT-DEMO', 'appointment_reminder', 'Appointment Reminder', 'แจ้งเตือนนัดหมาย', 'You have an appointment tomorrow', 'คุณมีนัดหมายพรุ่งนี้', '{"appointmentId": "APT-001"}'),
('NOTIF-002', 'DOCTOR-TEST', 'new_appointment', 'New Appointment Request', 'คำขอนัดหมายใหม่', 'A patient has requested an appointment', 'ผู้ป่วยขอนัดหมายใหม่', '{"appointmentId": "APT-002"}')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DOCTOR PROFILES
-- ============================================================================
INSERT INTO doctor_profiles (id, doctor_id, specialty, hospital_name, qualification, bio, available_days, available_hours)
VALUES 
('DP-DOCTOR-TEST', 'DOCTOR-TEST', 'General Practice', 'Izara Medical Center', '["MD", "Board Certified"]', 'Experienced general practitioner', '["Mon", "Tue", "Wed", "Thu", "Fri"]', '{"start": "09:00", "end": "17:00"}'),
('DP-DOCTOR-ISARA', 'DOCTOR-ISARA', 'Internal Medicine', 'Izara Telemedicine Hospital', '["MD", "Fellowship Internal Medicine"]', 'Specialist in internal medicine with telemedicine focus', '["Mon", "Tue", "Wed", "Thu", "Fri"]', '{"start": "08:00", "end": "18:00"}')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PATIENT PROFILES
-- ============================================================================
INSERT INTO patient_profiles (id, patient_id, blood_type, height_cm, weight_kg, emergency_contact_name, emergency_contact_phone)
VALUES 
('PP-PATIENT-DEMO', 'PATIENT-DEMO', 'O+', 170, 70, 'Emergency Contact', '081-234-5678'),
('PP-PATIENT-SOMCHAI', 'PATIENT-SOMCHAI', 'A+', 175, 80, 'Wife Somchai', '089-876-5432'),
('PP-PATIENT-ANAN', 'PATIENT-ANAN', 'B+', 165, 85, 'Son Anan', '087-654-3210')
ON CONFLICT (id) DO NOTHING;

-- Verify data
SELECT 'medical_content' as table_name, COUNT(*) as count FROM medical_content
UNION ALL
SELECT 'clinical_resources', COUNT(*) FROM clinical_resources
UNION ALL
SELECT 'consultants', COUNT(*) FROM consultants
UNION ALL
SELECT 'drugs', COUNT(*) FROM drugs
UNION ALL
SELECT 'icd10_codes', COUNT(*) FROM icd10_codes
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'doctor_profiles', COUNT(*) FROM doctor_profiles
UNION ALL
SELECT 'patient_profiles', COUNT(*) FROM patient_profiles;
