-- =============================================================================
-- IZARA TELEMEDICINE - CLOUD SQL SEED DATA
-- =============================================================================
-- Purpose: Seed data for Google Cloud SQL production/staging deployment
-- Usage: gcloud sql connect <instance> --user=postgres --database=izara_phase1 < seed-cloud.sql
--
-- Note: This script does NOT truncate - it uses INSERT ON CONFLICT to safely
-- add data without destroying existing production data.
--
-- Test Credentials:
--   Patient: demo.test@gmail.com / P@ssw0rd
--   Doctor:  doctor.test@izara.com / IzaraDoctor@2024
--   Admin:   admin.test@izara.com / IzaraAdmin@2024
-- =============================================================================

-- =============================================================================
-- USERS (Upsert - safe for production)
-- =============================================================================
INSERT INTO users (id, email, password_hash, name, name_thai, role, phone, date_of_birth, gender, is_active, is_admin)
VALUES
-- Patients
('PATIENT-DEMO', 'demo.test@gmail.com', '$2a$10$CXxX/a85GDsT8Ag2g8KAte4Rw0T0TiwnMpCR/8efAEeBpS3bjsBpu', 
 'Demo Test Patient', 'นายทดสอบ ระบบ', 'patient', '0891234567', '1985-06-15', 'male', true, false),
('PATIENT-SOMCHAI', 'Somchai.Mankong@gmail.com', '$2a$10$CXxX/a85GDsT8Ag2g8KAte4Rw0T0TiwnMpCR/8efAEeBpS3bjsBpu',
 'Somchai Mankong', 'สมชาย มั่นคง', 'patient', '0812345678', '1978-03-20', 'male', true, false),
('PATIENT-ANAN', 'Anan.Khayanrian@gmail.com', '$2a$10$CXxX/a85GDsT8Ag2g8KAte4Rw0T0TiwnMpCR/8efAEeBpS3bjsBpu',
 'Anan Khayanrian', 'อนันต์ ขยันเรียน', 'patient', '0823456789', '1990-11-08', 'male', true, false),
-- Doctors
('DOC-TEST-001', 'doctor.test@izara.com', '$2a$10$gzo2zpabassdFT5ifvYdz./8R/chFDrG2Q.d9LsK.VU9rD6S7kwai',
 'Doctor Test', 'นายแพทย์ ทดสอบ ระบบ', 'doctor', '0834567890', '1975-08-12', 'male', true, false),
('DOC-SPECIALIST-001', 'specialist.test@izara.com', '$2a$10$gzo2zpabassdFT5ifvYdz./8R/chFDrG2Q.d9LsK.VU9rD6S7kwai',
 'Specialist Test', 'แพทย์หญิง ผู้เชี่ยวชาญ ทดสอบ', 'doctor', '0845678901', '1980-04-25', 'female', true, false),
-- Admin
('ADMIN-TEST-001', 'admin.test@izara.com', '$2a$10$G6Giw3dtL1IKpurag6jeoeYkxhNdDTdthVEdZchnjBOArMGtyfwFa',
 'Admin Test', 'ผู้ดูแลระบบ ทดสอบ', 'admin', '0856789012', '1982-12-01', 'male', true, true)
ON CONFLICT (id) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  is_active = EXCLUDED.is_active;

-- =============================================================================
-- DOCTOR PROFILES (Upsert)
-- =============================================================================
INSERT INTO doctor_profiles (doctor_id, specialty, hospital_name, qualifications, years_of_experience, consultation_fee, is_available)
VALUES
('DOC-TEST-001', 'Internal Medicine', 'Izara Medical Center', 
 '["MD, Chulalongkorn University", "Thai Board of Internal Medicine"]', 15, 500.00, true),
('DOC-SPECIALIST-001', 'Cardiology', 'Izara Heart Center',
 '["MD, Mahidol University", "Thai Board of Cardiology", "FACC"]', 12, 800.00, true)
ON CONFLICT (doctor_id) DO UPDATE SET
  specialty = EXCLUDED.specialty,
  is_available = EXCLUDED.is_available;

-- =============================================================================
-- PATIENT PROFILES (Upsert)
-- =============================================================================
INSERT INTO patient_profiles (patient_id, emergency_contact_name, emergency_contact_phone, allergies, chronic_conditions)
VALUES
('PATIENT-DEMO', 'Emergency Contact', '0899999999', '["Penicillin"]', '["Hypertension"]'),
('PATIENT-SOMCHAI', 'Wife Contact', '0888888888', '["Sulfa drugs"]', '["Type 2 Diabetes", "Hypertension"]'),
('PATIENT-ANAN', 'Parent Contact', '0877777777', '[]', '[]')
ON CONFLICT (patient_id) DO UPDATE SET
  emergency_contact_name = EXCLUDED.emergency_contact_name,
  emergency_contact_phone = EXCLUDED.emergency_contact_phone;

-- =============================================================================
-- PHR (Upsert)
-- =============================================================================
INSERT INTO phr (id, patient_id, blood_type, allergies, chronic_conditions, current_medications, family_history)
VALUES
('PHR-DEMO', 'PATIENT-DEMO', 'O+', '["Penicillin"]', '["Hypertension"]', 
 '[{"name": "Amlodipine", "dosage": "5mg", "frequency": "Once daily"}]',
 '{"father": "Hypertension", "mother": "Diabetes"}'),
('PHR-SOMCHAI', 'PATIENT-SOMCHAI', 'A+', '["Sulfa drugs"]', '["Type 2 Diabetes", "Hypertension"]',
 '[{"name": "Metformin", "dosage": "500mg", "frequency": "Twice daily"}, {"name": "Losartan", "dosage": "50mg", "frequency": "Once daily"}]',
 '{"father": "Heart disease", "mother": "Diabetes"}'),
('PHR-ANAN', 'PATIENT-ANAN', 'B+', '[]', '[]', '[]', '{}')
ON CONFLICT (id) DO UPDATE SET
  blood_type = EXCLUDED.blood_type,
  allergies = EXCLUDED.allergies;

-- =============================================================================
-- MEDICAL CONTENT (Upsert)
-- =============================================================================
INSERT INTO medical_content (id, title_thai, title_english, content_thai, content_english, category, 
                            author_id, status, view_count, tags)
VALUES
('MC-001', 'การดูแลสุขภาพหัวใจ', 'Heart Health Care',
 'หัวใจเป็นอวัยวะสำคัญที่สูบฉีดเลือดไปเลี้ยงร่างกาย การดูแลหัวใจให้แข็งแรงทำได้โดยการออกกำลังกายสม่ำเสมอ รับประทานอาหารที่ดีต่อสุขภาพ และหลีกเลี่ยงการสูบบุหรี่',
 'The heart is a vital organ that pumps blood throughout the body. Keeping your heart healthy involves regular exercise, eating a healthy diet, and avoiding smoking.',
 'cardiovascular', 'DOC-SPECIALIST-001', 'published', 150, '["heart", "health", "exercise"]'::jsonb),
('MC-002', 'การจัดการโรคเบาหวาน', 'Diabetes Management',
 'โรคเบาหวานเป็นโรคเรื้อรังที่ต้องการการดูแลอย่างต่อเนื่อง การควบคุมระดับน้ำตาลในเลือด การรับประทานยาตามแพทย์สั่ง และการตรวจสุขภาพประจำเป็นสิ่งสำคัญ',
 'Diabetes is a chronic condition requiring ongoing management. Controlling blood sugar levels, taking medications as prescribed, and regular health checkups are essential.',
 'endocrinology', 'DOC-TEST-001', 'published', 200, '["diabetes", "blood sugar", "lifestyle"]'::jsonb),
('MC-003', 'การนอนหลับที่ดี', 'Good Sleep Habits',
 'การนอนหลับที่มีคุณภาพ 7-9 ชั่วโมงต่อคืนช่วยให้ร่างกายฟื้นฟู เสริมสร้างภูมิคุ้มกัน และช่วยในการจดจำ',
 'Quality sleep of 7-9 hours per night helps the body recover, boosts immunity, and aids memory.',
 'general', 'DOC-TEST-001', 'published', 120, '["sleep", "health", "wellness"]'::jsonb),
('MC-004', 'การออกกำลังกายสำหรับผู้สูงอายุ', 'Exercise for Seniors',
 'ผู้สูงอายุควรออกกำลังกายเบาๆ เช่น เดินเร็ว ว่ายน้ำ หรือโยคะ อย่างน้อย 150 นาทีต่อสัปดาห์',
 'Seniors should do light exercises like brisk walking, swimming, or yoga for at least 150 minutes per week.',
 'geriatrics', 'DOC-TEST-001', 'published', 80, '["exercise", "seniors", "fitness"]'::jsonb),
('MC-005', 'สุขภาพจิตในยุคดิจิทัล', 'Mental Health in Digital Age',
 'การใช้เทคโนโลยีมากเกินไปอาจส่งผลต่อสุขภาพจิต ควรหยุดพักจากหน้าจอ ทำกิจกรรมกลางแจ้ง และรักษาความสัมพันธ์กับคนรอบข้าง',
 'Excessive technology use can affect mental health. Take screen breaks, do outdoor activities, and maintain relationships.',
 'psychiatry', 'DOC-SPECIALIST-001', 'published', 95, '["mental health", "technology", "balance"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  view_count = EXCLUDED.view_count,
  status = EXCLUDED.status;

-- =============================================================================
-- CLINICAL RESOURCES (Upsert)
-- =============================================================================
INSERT INTO clinical_resources (id, title_thai, title_english, content_thai, content_english, 
                               category, specialty, guideline_year, source, tags, status, approved_by, approved_at)
VALUES
('CR-001', 'แนวทางการปรับยาในผู้ป่วย CKD', 'Drug Dosing Adjustments in CKD',
 'การปรับขนาดยาในผู้ป่วยโรคไตเรื้อรัง: Metformin - eGFR>=45 ใช้ขนาดปกติ, 30-44 ลดขนาด 50%, <30 หยุดยา',
 'Drug dosing in CKD patients: Metformin - eGFR>=45 normal dose, 30-44 reduce 50%, <30 discontinue',
 'pharmacology', 'Nephrology', 2025, 'KDIGO Guidelines', '["CKD", "drug dosing", "nephrology"]'::jsonb,
 'approved', 'ADMIN-TEST-001', NOW()),
('CR-002', 'CDS: เบาหวานร่วมกับโรคไตเรื้อรัง', 'CDS: Diabetes with CKD',
 'เป้าหมาย HbA1c: <7% สำหรับผู้ป่วยทั่วไป, 7-8% สำหรับผู้สูงอายุ/มีภาวะแทรกซ้อน. ยาที่แนะนำ: SGLT2i, GLP-1 RA',
 'HbA1c targets: <7% for general patients, 7-8% for elderly/complications. Recommended: SGLT2i, GLP-1 RA',
 'treatment', 'Endocrinology', 2025, 'ADA/KDIGO Consensus', '["diabetes", "CKD", "treatment"]'::jsonb,
 'approved', 'ADMIN-TEST-001', NOW()),
('CR-003', 'โปรโตคอลฉุกเฉิน: Hyperkalemia', 'Emergency Protocol: Hyperkalemia',
 'K+ 5.5-6.0: ลดอาหารโพแทสเซียม, K+ 6.0-6.5: Kayexalate + ลดอาหาร, K+ >6.5: Ca gluconate, Insulin, Dialysis',
 'K+ 5.5-6.0: Dietary restriction, K+ 6.0-6.5: Kayexalate, K+ >6.5: Ca gluconate, Insulin, Dialysis',
 'emergency', 'Nephrology', 2024, 'KDIGO AKI Guidelines', '["emergency", "hyperkalemia", "protocol"]'::jsonb,
 'approved', 'ADMIN-TEST-001', NOW()),
('CR-004', 'แนวปฏิบัติ Telemedicine ประเทศไทย', 'Thailand Telemedicine Best Practices',
 'ขั้นตอน: 1) ตรวจสอบอุปกรณ์ 2) ทบทวนประวัติก่อนพบ 3) ยืนยันตัวตนผู้ป่วย 4) บันทึก EMR 5) ขอ PDPA consent',
 'Steps: 1) Check equipment 2) Review history 3) Verify patient identity 4) Record EMR 5) Obtain PDPA consent',
 'telemedicine', 'General', 2024, 'Thai Medical Council', '["telemedicine", "PDPA", "guidelines"]'::jsonb,
 'approved', 'ADMIN-TEST-001', NOW())
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status;

-- =============================================================================
-- CONSULTANTS (Upsert)
-- =============================================================================
INSERT INTO consultants (id, name, specialty, hospital, phone, email, is_available)
VALUES
('CONSULT-001', 'Dr. Wichai Chuchart', 'Cardiology', 'Bumrungrad Hospital', '02-011-1111', 'wichai@bumrungrad.com', true),
('CONSULT-002', 'Dr. Somying Thongsuk', 'Nephrology', 'Siriraj Hospital', '02-022-2222', 'somying@siriraj.ac.th', true),
('CONSULT-003', 'Dr. Prasert Wongsawat', 'Endocrinology', 'Ramathibodi Hospital', '02-033-3333', 'prasert@rama.ac.th', true),
('CONSULT-004', 'Dr. Nattaporn Srisawat', 'Oncology', 'Chulalongkorn Hospital', '02-044-4444', 'nattaporn@chula.ac.th', false)
ON CONFLICT (id) DO UPDATE SET
  is_available = EXCLUDED.is_available;

-- =============================================================================
-- KNOWLEDGE BASE (Upsert)
-- =============================================================================
INSERT INTO knowledge_base (id, content_type, content, metadata)
VALUES
('KB-001', 'clinical_guideline', 
 'Hypertension management in Thai adults: Target BP <140/90 mmHg for general population, <130/80 for high-risk patients. First-line: CCB or ACEI/ARB. Lifestyle modifications essential.',
 '{"specialty": "cardiology", "source": "Thai Hypertension Society 2024", "language": "en"}'::jsonb),
('KB-002', 'drug_interaction',
 'Metformin and contrast media: Hold metformin 48 hours before and after contrast procedures in patients with eGFR <60. Resume after confirming stable renal function.',
 '{"specialty": "nephrology", "source": "KDIGO 2024", "language": "en"}'::jsonb),
('KB-003', 'clinical_guideline',
 'Diabetic foot care: Daily inspection, proper footwear, avoid walking barefoot, regular podiatry visits. Screen for neuropathy annually with 10g monofilament.',
 '{"specialty": "endocrinology", "source": "ADA Standards 2025", "language": "en"}'::jsonb),
('KB-004', 'protocol',
 'Telemedicine consultation workflow: 1) Pre-visit questionnaire 2) Equipment check 3) Patient verification 4) Consultation 5) EMR documentation 6) E-prescription if needed 7) Follow-up scheduling',
 '{"specialty": "telemedicine", "source": "Izara Protocol", "language": "en"}'::jsonb),
('KB-005', 'drug_information',
 'SGLT2 inhibitors in heart failure: Empagliflozin and dapagliflozin reduce hospitalization and CV death in HFrEF regardless of diabetes status. Monitor for genital infections and euglycemic DKA.',
 '{"specialty": "cardiology", "source": "ESC Guidelines 2024", "language": "en"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  content = EXCLUDED.content,
  metadata = EXCLUDED.metadata;

-- =============================================================================
-- Note: Appointments, EMR, Vital Signs, Notifications are NOT seeded in cloud
-- as these should be created dynamically by the application
-- =============================================================================

SELECT 'CLOUD SEED DATA LOADED SUCCESSFULLY' as status;
SELECT 'users: ' || count(*) FROM users;
SELECT 'doctor_profiles: ' || count(*) FROM doctor_profiles;
SELECT 'patient_profiles: ' || count(*) FROM patient_profiles;
SELECT 'medical_content: ' || count(*) FROM medical_content;
SELECT 'clinical_resources: ' || count(*) FROM clinical_resources;
SELECT 'consultants: ' || count(*) FROM consultants;
SELECT 'knowledge_base: ' || count(*) FROM knowledge_base;
