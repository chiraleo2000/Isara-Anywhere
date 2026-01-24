-- =============================================================================
-- IZARA TELEMEDICINE - COMPLETE SEED DATA (Local + Cloud Compatible)
-- =============================================================================
-- Version: 3.1.0
-- Updated: 2026-01-22
-- Purpose: Complete seed data for both local Docker and Cloud SQL deployment
-- 
-- Usage (Local Docker):
--   docker exec -i izara-postgres psql -U postgres -d izara_phase1 < seed-complete.sql
--
-- Usage (Cloud SQL):
--   gcloud sql connect <instance> --user=postgres --database=izara_phase1 < seed-complete.sql
--
-- Test Credentials:
--   Patient: demo.test@gmail.com / P@ssw0rd
--   Doctor:  doctor.test@izara.com / IzaraDoctor@2024
--   Admin:   admin.test@izara.com / IzaraAdmin@2024
-- =============================================================================

-- =============================================================================
-- SECTION 1: CLEAR EXISTING DATA (Safe for development)
-- =============================================================================
-- For production, comment out this section and use ON CONFLICT instead

TRUNCATE TABLE 
    sessions, notifications, emr, prescriptions, lab_orders, cds_logs,
    ai_chat_history, ai_document_analysis, ai_validations,
    meeting_records, meeting_transcripts, appointments,
    living_wills, living_will_versions, patient_consents, phr, vital_signs,
    doctor_schedules, doctor_reviews, doctor_profiles, patient_profiles,
    medical_content, clinical_resources, consultants, knowledge_base, 
    audit_logs, doctors, users
CASCADE;

-- =============================================================================
-- SECTION 2: USERS (6 test users)
-- =============================================================================

-- Admin user (password: IzaraAdmin@2024)
INSERT INTO users (id, email, password_hash, role, name, name_thai, is_active, is_verified, is_approved, approval_status, is_admin, admin_privileges)
VALUES (
    'ADMIN-TEST-001',
    'admin.test@izara.com',
    '$2b$10$fx5arkpb8YI7lEK5lcHdXeksczdG.qloim/uWghlBZXyxv.dNo/wq',
    'admin',
    'Admin Test',
    'ผู้ดูแลระบบ ทดสอบ',
    true, true, true, 'approved', true,
    '{"canManageDoctors": true, "canManagePatients": true, "canManageAppointments": true, "canViewAnalytics": true, "canManageSettings": true, "level": "super_admin"}'::jsonb
);

-- Doctor Test (password: IzaraDoctor@2024)
INSERT INTO users (id, email, password_hash, role, name, name_thai, doctor_id, medical_license_number, specialty, is_active, is_verified, is_approved, approval_status)
VALUES (
    'DOC-TEST-001',
    'doctor.test@izara.com',
    '$2b$10$aPN6uhBrLoms36C8/017be2GWqUqaPJa6WaTaZ8LrnwAeaf3GajrO',
    'doctor',
    'Doctor Test',
    'นายแพทย์ ทดสอบ ระบบ',
    'DOC-TEST-001',
    'TH-MD-2020-001',
    'Internal Medicine',
    true, true, true, 'approved'
);

-- Dr. Somchai Prasert (password: IzaraDoctor@2024)
INSERT INTO users (id, email, password_hash, role, name, name_thai, doctor_id, medical_license_number, specialty, hospital_name, is_active, is_verified, is_approved, approval_status)
VALUES (
    'DOC-SOMCHAI-001',
    'somchai.prasert@izara.com',
    '$2b$10$aPN6uhBrLoms36C8/017be2GWqUqaPJa6WaTaZ8LrnwAeaf3GajrO',
    'doctor',
    'Dr. Somchai Prasert',
    'นพ.สมชาย ประเสริฐ',
    'DOC-SOMCHAI-001',
    'TH-MD-2010-100',
    'Cardiology',
    'Bangkok General Hospital',
    true, true, true, 'approved'
);

-- Dr. Siriporn Thongchai (password: IzaraDoctor@2024)
INSERT INTO users (id, email, password_hash, role, name, name_thai, doctor_id, medical_license_number, specialty, hospital_name, is_active, is_verified, is_approved, approval_status)
VALUES (
    'DOC-SIRIPORN-001',
    'siriporn.thongchai@izara.com',
    '$2b$10$aPN6uhBrLoms36C8/017be2GWqUqaPJa6WaTaZ8LrnwAeaf3GajrO',
    'doctor',
    'Dr. Siriporn Thongchai',
    'พญ.ศิริพร ทองชัย',
    'DOC-SIRIPORN-001',
    'TH-MD-2008-055',
    'Endocrinology',
    'Bumrungrad Hospital',
    true, true, true, 'approved'
);

-- Patient: Somchai Mankong (password: P@ssw0rd)
INSERT INTO users (id, email, password_hash, role, name, name_thai, patient_id, is_active, is_verified, is_approved, approval_status)
VALUES (
    'PATIENT-SOMCHAI',
    'Somchai.Mankong@gmail.com',
    '$2b$10$64bK0EpjyC7quRGJNvRqmuH/jX3mA4dzyzYa2vgA2q.H3ZxkQwAmy',
    'patient',
    'Somchai Mankong',
    'นายสมชาย มั่นคง',
    'PATIENT-SOMCHAI',
    true, true, true, 'approved'
);

-- Patient: Anan Khayanrian - Complex DM + CKD (password: P@ssw0rd)
INSERT INTO users (id, email, password_hash, role, name, name_thai, patient_id, is_active, is_verified, is_approved, approval_status)
VALUES (
    'PATIENT-ANAN',
    'Anan.Khayanrian@gmail.com',
    '$2b$10$64bK0EpjyC7quRGJNvRqmuH/jX3mA4dzyzYa2vgA2q.H3ZxkQwAmy',
    'patient',
    'Anan Khayanrian',
    'นายอนันต์ ขยันเรียน',
    'PATIENT-ANAN',
    true, true, true, 'approved'
);

-- Patient: Demo Test (password: P@ssw0rd)
INSERT INTO users (id, email, password_hash, role, name, name_thai, patient_id, is_active, is_verified, is_approved, approval_status)
VALUES (
    'PATIENT-DEMO',
    'demo.test@gmail.com',
    '$2b$10$64bK0EpjyC7quRGJNvRqmuH/jX3mA4dzyzYa2vgA2q.H3ZxkQwAmy',
    'patient',
    'Demo Test Patient',
    'นาย ทดสอบ ระบบ',
    'PATIENT-DEMO',
    true, true, true, 'approved'
);

-- =============================================================================
-- SECTION 3: DOCTORS TABLE (Quick lookup)
-- =============================================================================

INSERT INTO doctors (id, name, name_thai, specialty, specialty_thai, hospital, hospital_thai, avatar_url, rating, review_count, experience_years, consultation_fee, is_available)
VALUES 
    ('DOC-TEST-001', 'Dr. Test Doctor', 'นพ.ทดสอบ ระบบ', 'Internal Medicine', 'อายุรกรรมทั่วไป', 'Izara Test Hospital', 'โรงพยาบาลอิซาร่า ทดสอบ', 'https://i.pravatar.cc/150?u=doctest', 5.0, 10, 5, 300.00, true),
    ('DOC-SOMCHAI-001', 'Dr. Somchai Prasert', 'นพ.สมชาย ประเสริฐ', 'Cardiology', 'หทัยวิทยา', 'Bangkok General Hospital', 'โรงพยาบาลกรุงเทพ', 'https://i.pravatar.cc/150?u=doc1', 4.8, 125, 15, 500.00, true),
    ('DOC-SIRIPORN-001', 'Dr. Siriporn Thongchai', 'พญ.ศิริพร ทองชัย', 'Endocrinology', 'ต่อมไร้ท่อ', 'Bumrungrad Hospital', 'โรงพยาบาลบำรุงราษฎร์', 'https://i.pravatar.cc/150?u=doc2', 4.9, 200, 20, 800.00, true);

-- =============================================================================
-- SECTION 4: DOCTOR SCHEDULES
-- =============================================================================

-- DOC-TEST-001 schedule (Mon-Fri 09:00-17:00)
INSERT INTO doctor_schedules (id, doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_available)
VALUES 
    ('SCH-TEST-001-1', 'DOC-TEST-001', 1, '09:00', '17:00', 30, true),
    ('SCH-TEST-001-2', 'DOC-TEST-001', 2, '09:00', '17:00', 30, true),
    ('SCH-TEST-001-3', 'DOC-TEST-001', 3, '09:00', '17:00', 30, true),
    ('SCH-TEST-001-4', 'DOC-TEST-001', 4, '09:00', '17:00', 30, true),
    ('SCH-TEST-001-5', 'DOC-TEST-001', 5, '09:00', '17:00', 30, true);

-- =============================================================================
-- SECTION 5: PHR (Personal Health Records)
-- =============================================================================

-- PHR for Somchai Mankong
INSERT INTO phr (id, patient_id, demographics, allergies, chronic_conditions, medications, lifestyle)
VALUES (
    'PHR-SOMCHAI',
    'PATIENT-SOMCHAI',
    '{"age": 45, "gender": "male", "bloodType": "O+", "height": 175, "weight": 78}'::jsonb,
    '[]'::jsonb,
    '[{"name": "Hypertension", "icd10": "I10", "diagnosedDate": "2020-01-15"}]'::jsonb,
    '[{"name": "Amlodipine", "dose": "5mg", "frequency": "QD"}]'::jsonb,
    '{"smokingStatus": "never", "alcoholConsumption": "occasional", "exerciseFrequency": "2-3 times/week"}'::jsonb
);

-- PHR for Anan (Complex case - DM + CKD for CDS testing)
INSERT INTO phr (id, patient_id, demographics, allergies, chronic_conditions, medications, clinical_decision_support, lifestyle)
VALUES (
    'PHR-ANAN',
    'PATIENT-ANAN',
    '{"age": 58, "gender": "male", "bloodType": "A+", "height": 168, "weight": 75}'::jsonb,
    '[{"name": "Penicillin", "severity": "severe", "reaction": "Anaphylaxis"}, {"name": "Sulfa drugs", "severity": "moderate", "reaction": "Rash"}]'::jsonb,
    '[{"name": "Type 2 Diabetes Mellitus", "icd10": "E11.9", "diagnosedDate": "2018-03-15", "details": "HbA1c 7.2%"}, {"name": "Chronic Kidney Disease Stage 3b", "icd10": "N18.4", "diagnosedDate": "2022-06-10", "details": "eGFR 38 ml/min/1.73m2"}]'::jsonb,
    '[{"name": "Metformin", "dose": "500mg", "frequency": "BID", "notes": "May need adjustment for CKD"}, {"name": "Lisinopril", "dose": "10mg", "frequency": "QD"}, {"name": "Atorvastatin", "dose": "20mg", "frequency": "QD"}]'::jsonb,
    '{"alerts": [{"type": "dose_adjustment", "severity": "warning", "drug": "Metformin", "message": "Consider dose reduction for eGFR < 45", "guideline": "KDIGO 2024"}]}'::jsonb,
    '{"smokingStatus": "former", "alcoholConsumption": "never", "exerciseFrequency": "daily_walking"}'::jsonb
);

-- PHR for Demo Patient
INSERT INTO phr (id, patient_id, demographics, allergies, chronic_conditions, medications, lifestyle)
VALUES (
    'PHR-DEMO',
    'PATIENT-DEMO',
    '{"age": 35, "gender": "male", "bloodType": "B+", "height": 170, "weight": 70}'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '{"smokingStatus": "never", "alcoholConsumption": "social", "exerciseFrequency": "3 times/week"}'::jsonb
);

-- =============================================================================
-- SECTION 6: MEDICAL CONTENT (Health Articles)
-- =============================================================================

INSERT INTO medical_content (id, title_thai, title_english, content_thai, content_english, category, author_id, status, view_count, tags, image_url)
VALUES
('MC-001', 'การดูแลสุขภาพหัวใจ', 'Heart Health Care',
 E'## 🫀 หัวใจแข็งแรง ชีวิตยืนยาว\n\nหัวใจเป็นอวัยวะสำคัญที่สูบฉีดเลือดไปเลี้ยงร่างกาย การดูแลหัวใจให้แข็งแรงทำได้โดย:\n\n- ออกกำลังกายสม่ำเสมอ 150 นาที/สัปดาห์\n- รับประทานอาหารสุขภาพ ลดเค็ม ลดมัน\n- หลีกเลี่ยงบุหรี่และแอลกอฮอล์\n- ตรวจสุขภาพประจำปี',
 'The heart is vital. Keep it healthy with exercise, diet, and regular checkups.',
 'cardiovascular', 'DOC-SOMCHAI-001', 'published', 150, 
 '["heart", "health", "exercise"]'::jsonb, 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800'),

('MC-002', 'การจัดการโรคเบาหวาน', 'Diabetes Management',
 E'## 🩸 การดูแลตนเองสำหรับผู้ป่วยเบาหวาน\n\nโรคเบาหวานเป็นโรคเรื้อรังที่ต้องดูแลอย่างต่อเนื่อง\n\n**เป้าหมาย:** HbA1c < 7%\n\n**การดูแลตนเอง:**\n- รับประทานยาตามแพทย์สั่ง\n- ควบคุมอาหาร ลดแป้ง น้ำตาล\n- ออกกำลังกาย 30 นาที/วัน\n- ตรวจน้ำตาลเป็นประจำ',
 'Diabetes requires ongoing management with medication, diet, and exercise.',
 'endocrinology', 'DOC-SIRIPORN-001', 'published', 200, 
 '["diabetes", "blood sugar", "medication"]'::jsonb, 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800'),

('MC-003', 'การนอนหลับที่ดี', 'Good Sleep Habits',
 E'## 😴 การนอนหลับที่มีคุณภาพ\n\nการนอนหลับที่มีคุณภาพ 7-9 ชั่วโมงต่อคืนช่วยให้ร่างกายฟื้นฟู\n\n**ประโยชน์:**\n- เสริมสร้างภูมิคุ้มกัน\n- ช่วยความจำและสมาธิ\n- ลดความเครียด\n\n**เทคนิค:**\n- เข้านอนเวลาเดียวกันทุกวัน\n- ปิดหน้าจอก่อนนอน 1 ชั่วโมง\n- ห้องนอนมืดและเย็น',
 'Quality sleep of 7-9 hours helps the body recover and boosts immunity.',
 'general', 'DOC-TEST-001', 'published', 120, 
 '["sleep", "wellness", "health"]'::jsonb, 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800'),

('MC-004', 'การออกกำลังกายสำหรับผู้สูงอายุ', 'Exercise for Seniors',
 E'## 🚶 การออกกำลังกายสำหรับผู้สูงวัย\n\nผู้สูงอายุควรออกกำลังกายเบาๆ อย่างน้อย 150 นาทีต่อสัปดาห์\n\n**กิจกรรมที่เหมาะสม:**\n- เดินเร็ว\n- ว่ายน้ำ\n- รำไทเก๊ก\n- โยคะ\n\n**ข้อควรระวัง:**\n- อบอุ่นร่างกายก่อนออกกำลัง\n- ดื่มน้ำเพียงพอ\n- หยุดพักเมื่อเหนื่อย',
 'Seniors should do light exercises like walking, swimming, or yoga.',
 'geriatrics', 'DOC-TEST-001', 'published', 80, 
 '["seniors", "exercise", "health"]'::jsonb, 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800'),

('MC-005', 'สุขภาพจิตในยุคดิจิทัล', 'Mental Health in Digital Age',
 E'## 🧠 สุขภาพจิตในโลกออนไลน์\n\nการใช้เทคโนโลยีมากเกินไปอาจส่งผลต่อสุขภาพจิต\n\n**วิธีรักษาสมดุล:**\n- จำกัดเวลาหน้าจอ 2-3 ชม./วัน\n- พักสายตาทุก 20 นาที\n- ทำกิจกรรมกลางแจ้ง\n- พบปะเพื่อนในชีวิตจริง\n- ฝึกสมาธิ 10 นาที/วัน',
 'Excessive technology use can affect mental health. Take breaks and maintain relationships.',
 'psychiatry', 'DOC-TEST-001', 'published', 95, 
 '["mental health", "technology", "wellness"]'::jsonb, 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800'),

('MC-006', 'การป้องกันโรคติดเชื้อทางเดินหายใจ', 'Respiratory Infection Prevention',
 E'## 🫁 ป้องกันโรคทางเดินหายใจ\n\n**วิธีป้องกัน:**\n- ล้างมือบ่อยๆ ด้วยสบู่หรือเจลแอลกอฮอล์\n- สวมหน้ากากในที่ชุมชน\n- อยู่ในที่อากาศถ่ายเท\n- ฉีดวัคซีนป้องกัน\n\n**เมื่อมีอาการไอ จาม:**\n- ปิดปากด้วยข้อพับแขน\n- ล้างมือทันที\n- หลีกเลี่ยงการสัมผัสใกล้ชิดผู้อื่น',
 'Prevent respiratory infections by washing hands, wearing masks, and getting vaccinated.',
 'infectious', 'DOC-SOMCHAI-001', 'published', 180, 
 '["respiratory", "prevention", "vaccination"]'::jsonb, 'https://images.unsplash.com/photo-1584634428023-64f0f18c7a53?w=800');

-- =============================================================================
-- SECTION 7: CLINICAL RESOURCES (Guidelines for Doctors)
-- =============================================================================

INSERT INTO clinical_resources (id, title_thai, title_english, content_thai, content_english, category, specialty, guideline_year, source, status, image_url)
VALUES
('CR-001', 'แนวทางการรักษาความดันโลหิตสูง 2024', 'Hypertension Treatment Guidelines 2024',
 E'## แนวทางการรักษาความดันโลหิตสูง\n\n**เป้าหมาย:**\n- ผู้ใหญ่ทั่วไป: < 140/90 mmHg\n- ผู้ป่วยเบาหวาน: < 130/80 mmHg\n\n**ยาเริ่มต้น:**\n- ACEI หรือ ARB\n- CCB\n- Thiazide diuretics',
 'Guidelines for hypertension treatment according to WHO 2024 standards.',
 'cardiovascular', 'Cardiology', 2024, 'Thai Hypertension Society', 'approved',
 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800'),

('CR-002', 'การใช้ยาปฏิชีวนะอย่างสมเหตุผล', 'Rational Antibiotic Use',
 E'## หลักการใช้ยาปฏิชีวนะ\n\n**ข้อบ่งใช้:**\n- การติดเชื้อแบคทีเรียที่ยืนยันได้\n- การติดเชื้อรุนแรงที่สงสัยแบคทีเรีย\n\n**ไม่ควรใช้:**\n- ไข้หวัดธรรมดา\n- ท้องเสียจากไวรัส\n- ไอ จามจากภูมิแพ้',
 'Guidelines for appropriate antibiotic prescribing to reduce antimicrobial resistance.',
 'infectious', 'Infectious Disease', 2024, 'Thai FDA', 'approved',
 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800'),

('CR-003', 'การดูแลผู้ป่วยเบาหวานแบบองค์รวม KDIGO 2024', 'Holistic Diabetes Care KDIGO 2024',
 E'## แนวทาง KDIGO 2024\n\n**การปรับยาในผู้ป่วยโรคไต:**\n- Metformin: ลดขนาดเมื่อ eGFR < 45\n- หยุดใช้เมื่อ eGFR < 30\n\n**การติดตาม:**\n- HbA1c ทุก 3 เดือน\n- eGFR ทุก 3-6 เดือน\n- UACR ปีละครั้ง',
 'Comprehensive diabetes care including dose adjustments for CKD per KDIGO 2024.',
 'endocrinology', 'Endocrinology', 2024, 'KDIGO', 'approved',
 'https://images.unsplash.com/photo-1576669801943-7a8a2c1e3b7e?w=800'),

('CR-004', 'แบบประเมินสุขภาพจิต PHQ-9', 'PHQ-9 Mental Health Assessment',
 E'## แบบประเมิน PHQ-9\n\n**การให้คะแนน:**\n- 0-4: ปกติ\n- 5-9: ซึมเศร้าเล็กน้อย\n- 10-14: ซึมเศร้าปานกลาง\n- 15-19: ซึมเศร้ารุนแรง\n- 20-27: ซึมเศร้ารุนแรงมาก\n\n**การดูแลเบื้องต้น:**\n- คะแนน > 10: ส่งพบจิตแพทย์',
 'PHQ-9 Depression screening tool in Thai for patient assessment.',
 'psychiatry', 'Psychiatry', 2024, 'Thai Psychiatric Association', 'approved',
 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800'),

('CR-005', 'การดูแลผู้สูงอายุในชุมชน', 'Elderly Care in Community',
 E'## คู่มือการดูแลผู้สูงอายุ\n\n**การประเมิน:**\n- ADL (กิจวัตรประจำวัน)\n- IADL (กิจกรรมเครื่องมือ)\n- การเคลื่อนไหวและการทรงตัว\n\n**การป้องกันการล้ม:**\n- ปรับปรุงสภาพแวดล้อม\n- ออกกำลังกายเสริมกล้ามเนื้อ\n- ตรวจสายตาประจำปี',
 'Community elderly care handbook for healthcare workers and caregivers.',
 'geriatrics', 'Geriatrics', 2024, 'Department of Health Thailand', 'approved',
 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800'),

('CR-006', 'เครื่องคำนวณ BMI และความเสี่ยงโรคเรื้อรัง', 'BMI and Chronic Disease Risk Calculator',
 E'## การคำนวณ BMI\n\n**สูตร:** น้ำหนัก(kg) / ส่วนสูง(m)²\n\n**การแปลผล (เกณฑ์เอเชีย):**\n- < 18.5: น้ำหนักต่ำกว่าเกณฑ์\n- 18.5-22.9: ปกติ\n- 23-24.9: เสี่ยงโรคอ้วน\n- 25-29.9: อ้วนระดับ 1\n- ≥ 30: อ้วนระดับ 2',
 'BMI calculator tool with chronic disease risk assessment for Asian population.',
 'general', 'General Medicine', 2024, 'Thai Medical Association', 'approved',
 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800');

-- =============================================================================
-- SECTION 8: KNOWLEDGE BASE (For AI RAG)
-- =============================================================================

INSERT INTO knowledge_base (title, content, source, category, guideline_year, language)
VALUES 
('KDIGO 2024 CKD Guideline - Metformin', 
 'Metformin dose adjustment for CKD: eGFR 30-45: Reduce dose by 50%. eGFR <30: Contraindicated. Monitor renal function every 3 months. For patients with DM + CKD, prioritize SGLT2 inhibitors which provide both glycemic control and kidney protection.',
 'KDIGO 2024', 'nephrology', '2024', 'en'),

('ADA 2025 Diabetes Standards - Glucose Targets',
 'A1C target <7% for most adults. Consider <8% for older adults with comorbidities. Fasting glucose 80-130 mg/dL. Postprandial glucose <180 mg/dL. For older adults or those with hypoglycemia risk, targets may be relaxed.',
 'ADA Standards of Care 2025', 'diabetes', '2025', 'en'),

('แนวทางปรับยา Metformin ในผู้ป่วยโรคไต',
 'การปรับขนาดยา Metformin ตาม eGFR: 30-45 ml/min: ลดขนาดยาลง 50% ควรเริ่ม 500 มก. วันละครั้ง. eGFR <30: ห้ามใช้. ตรวจการทำงานของไตทุก 3 เดือน. พิจารณาใช้ยากลุ่ม SGLT2 inhibitor แทนในผู้ป่วยที่มี CKD ร่วมด้วย',
 'KDIGO 2024 (Thai Translation)', 'nephrology', '2024', 'th'),

('Drug Interaction: Metformin + Contrast Media',
 'Stop metformin 48 hours before iodinated contrast. Resume 48 hours after procedure if renal function stable. Check serum creatinine/eGFR before resuming. Higher risk of lactic acidosis with contrast-induced AKI.',
 'ACR Manual on Contrast Media 2024', 'radiology', '2024', 'en'),

('Hypertension in Diabetic Patients',
 'Target BP <130/80 mmHg for most diabetic patients. First-line: ACEI or ARB (renoprotective). Add CCB or thiazide if needed. Avoid ACEI + ARB combination. Monitor potassium and creatinine when starting ACEI/ARB.',
 'ADA Standards 2025', 'cardiology', '2025', 'en'),

('ยาลดความดันโลหิตในผู้ป่วยเบาหวาน',
 'เป้าหมาย BP <130/80 mmHg สำหรับผู้ป่วยเบาหวานส่วนใหญ่ ยาเริ่มต้น: ACEI หรือ ARB (ปกป้องไต) เพิ่ม CCB หรือ thiazide หากจำเป็น หลีกเลี่ยงการใช้ ACEI ร่วมกับ ARB ติดตามโพแทสเซียมและครีอะตินีนเมื่อเริ่มใช้ ACEI/ARB',
 'ADA Standards 2025 (Thai)', 'cardiology', '2025', 'th');

-- =============================================================================
-- SECTION 9: CONSULTANTS (Specialist Directory)
-- =============================================================================

INSERT INTO consultants (id, name, specialty, email, phone, hospital, languages, experience_years, bio, is_available, rating)
VALUES 
('CONS-001', 'Dr. Prasong Charoenpong', 'Nephrology', 'prasong.c@hospital.co.th', '02-555-1001', 'Siriraj Hospital', '["Thai", "English"]'::jsonb, 25, 'Expert in CKD and dialysis management.', true, 4.9),
('CONS-002', 'Dr. Wanida Thongprasert', 'Oncology', 'wanida.t@hospital.co.th', '02-555-1002', 'Chulalongkorn Hospital', '["Thai", "English", "Mandarin"]'::jsonb, 20, 'Specializes in breast cancer treatment.', true, 4.8),
('CONS-003', 'Dr. Piyarat Srisawat', 'Cardiology', 'piyarat.s@hospital.co.th', '02-555-1003', 'Bumrungrad Hospital', '["Thai", "English"]'::jsonb, 18, 'Expert in interventional cardiology.', true, 4.7);

-- =============================================================================
-- SECTION 10: SAMPLE APPOINTMENTS (For Testing)
-- =============================================================================

INSERT INTO appointments (id, patient_id, doctor_id, requested_date, requested_time, confirmed_date, confirmed_time, status, symptoms, symptom_description, urgency_level, jitsi_room_name, meet_link)
VALUES 
('APT-TEST-001', 'PATIENT-SOMCHAI', 'DOC-TEST-001', CURRENT_DATE, '09:00', CURRENT_DATE, '09:00', 'confirmed', 
 '["headache", "fatigue"]'::jsonb, 'ปวดหัวและเหนื่อยมา 3 วัน', 'normal', 'izara-apt-test-001',
 'https://meet.jit.si/izara-apt-test-001?config.prejoinPageEnabled=true'),

('APT-TEST-002', 'PATIENT-ANAN', 'DOC-TEST-001', CURRENT_DATE, '10:30', CURRENT_DATE, '10:30', 'confirmed',
 '["diabetes_follow_up", "kidney_check"]'::jsonb, 'นัดติดตามผลเบาหวานและโรคไต', 'normal', 'izara-apt-test-002',
 'https://meet.jit.si/izara-apt-test-002?config.prejoinPageEnabled=true'),

('APT-TEST-003', 'PATIENT-DEMO', 'DOC-TEST-001', CURRENT_DATE + 1, '14:00', NULL, NULL, 'pending',
 '["general_checkup"]'::jsonb, 'ต้องการตรวจสุขภาพประจำปี', 'normal', NULL, NULL);

-- =============================================================================
-- SECTION 11: SAMPLE VITAL SIGNS
-- =============================================================================

INSERT INTO vital_signs (patient_id, blood_pressure_systolic, blood_pressure_diastolic, heart_rate, temperature, oxygen_saturation, blood_glucose, blood_glucose_type, weight, height, source)
VALUES 
('PATIENT-SOMCHAI', 130, 85, 75, 36.5, 98, NULL, NULL, 78, 175, 'clinic_measurement'),
('PATIENT-ANAN', 145, 90, 80, 36.8, 97, 145, 'fasting', 75, 168, 'clinic_measurement'),
('PATIENT-DEMO', 120, 80, 72, 36.6, 99, NULL, NULL, 70, 170, 'patient_input');

-- =============================================================================
-- SECTION 12: NOTIFICATIONS
-- =============================================================================

INSERT INTO notifications (user_id, type, title, title_thai, message, message_thai, data)
VALUES 
('PATIENT-SOMCHAI', 'appointment_confirmed', 'Appointment Confirmed', 'ยืนยันนัดหมายแล้ว', 
 'Your appointment has been confirmed', 'นัดหมายของคุณได้รับการยืนยันแล้ว', 
 '{"appointmentId": "APT-TEST-001"}'::jsonb),
('PATIENT-ANAN', 'appointment_confirmed', 'Appointment Confirmed', 'ยืนยันนัดหมายแล้ว',
 'Your appointment has been confirmed', 'นัดหมายของคุณได้รับการยืนยันแล้ว',
 '{"appointmentId": "APT-TEST-002"}'::jsonb);

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

SELECT 'Users: ' || count(*) FROM users;
SELECT 'Doctors: ' || count(*) FROM doctors;
SELECT 'PHR Records: ' || count(*) FROM phr;
SELECT 'Medical Content: ' || count(*) FROM medical_content;
SELECT 'Clinical Resources: ' || count(*) FROM clinical_resources;
SELECT 'Knowledge Base: ' || count(*) FROM knowledge_base;
SELECT 'Appointments: ' || count(*) FROM appointments;
SELECT 'Consultants: ' || count(*) FROM consultants;

-- =============================================================================
-- END OF SEED DATA
-- =============================================================================
