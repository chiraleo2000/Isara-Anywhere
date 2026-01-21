-- =============================================================================
-- IZARA TELEMEDICINE - LOCAL DOCKER SEED DATA
-- =============================================================================
-- Purpose: Complete seed data for local Docker development
-- Usage: docker exec -i izara-postgres psql -U postgres -d izara_phase1 < seed-local.sql
-- 
-- Test Credentials:
--   Patient: demo.test@gmail.com / P@ssw0rd
--   Doctor:  doctor.test@izara.com / IzaraDoctor@2024
--   Admin:   admin.test@izara.com / IzaraAdmin@2024
-- =============================================================================

-- Clear existing data (safe for local development)
TRUNCATE TABLE 
    sessions, notifications, emr, prescriptions, lab_orders, cds_logs,
    appointments, vital_signs, phr, patient_profiles, doctor_profiles,
    medical_content, clinical_resources, consultants, knowledge_base, users
CASCADE;

-- =============================================================================
-- USERS (6 test users)
-- =============================================================================
-- Password hashes generated with bcryptjs:
--   P@ssw0rd:        $2a$10$CXxX/a85GDsT8Ag2g8KAte4Rw0T0TiwnMpCR/8efAEeBpS3bjsBpu
--   IzaraDoctor@2024: $2a$10$gzo2zpabassdFT5ifvYdz./8R/chFDrG2Q.d9LsK.VU9rD6S7kwai
--   IzaraAdmin@2024:  $2a$10$G6Giw3dtL1IKpurag6jeoeYkxhNdDTdthVEdZchnjBOArMGtyfwFa

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
 'Admin Test', 'ผู้ดูแลระบบ ทดสอบ', 'admin', '0856789012', '1982-12-01', 'male', true, true);

-- =============================================================================
-- DOCTOR PROFILES
-- =============================================================================
INSERT INTO doctor_profiles (doctor_id, specialty, hospital_name, qualifications, years_of_experience, consultation_fee, is_available)
VALUES
('DOC-TEST-001', 'Internal Medicine', 'Izara Medical Center', 
 '["MD, Chulalongkorn University", "Thai Board of Internal Medicine"]', 15, 500.00, true),
('DOC-SPECIALIST-001', 'Cardiology', 'Izara Heart Center',
 '["MD, Mahidol University", "Thai Board of Cardiology", "FACC"]', 12, 800.00, true);

-- =============================================================================
-- PATIENT PROFILES
-- =============================================================================
INSERT INTO patient_profiles (patient_id, emergency_contact_name, emergency_contact_phone, allergies, chronic_conditions)
VALUES
('PATIENT-DEMO', 'Emergency Contact', '0899999999', '["Penicillin"]', '["Hypertension"]'),
('PATIENT-SOMCHAI', 'Wife Contact', '0888888888', '["Sulfa drugs"]', '["Type 2 Diabetes", "Hypertension"]'),
('PATIENT-ANAN', 'Parent Contact', '0877777777', '[]', '[]');

-- =============================================================================
-- PHR (Personal Health Records)
-- =============================================================================
INSERT INTO phr (id, patient_id, blood_type, allergies, chronic_conditions, current_medications, family_history)
VALUES
('PHR-DEMO', 'PATIENT-DEMO', 'O+', '["Penicillin"]', '["Hypertension"]', 
 '[{"name": "Amlodipine", "dosage": "5mg", "frequency": "Once daily"}]',
 '{"father": "Hypertension", "mother": "Diabetes"}'),
('PHR-SOMCHAI', 'PATIENT-SOMCHAI', 'A+', '["Sulfa drugs"]', '["Type 2 Diabetes", "Hypertension"]',
 '[{"name": "Metformin", "dosage": "500mg", "frequency": "Twice daily"}, {"name": "Losartan", "dosage": "50mg", "frequency": "Once daily"}]',
 '{"father": "Heart disease", "mother": "Diabetes"}'),
('PHR-ANAN', 'PATIENT-ANAN', 'B+', '[]', '[]', '[]', '{}');

-- =============================================================================
-- VITAL SIGNS
-- =============================================================================
INSERT INTO vital_signs (patient_id, blood_pressure_systolic, blood_pressure_diastolic, heart_rate, temperature, oxygen_saturation, weight, height, measured_at)
VALUES
('PATIENT-DEMO', 120, 80, 72, 36.5, 98, 70.0, 175, NOW() - interval '1 day'),
('PATIENT-DEMO', 118, 78, 70, 36.4, 99, 69.5, 175, NOW()),
('PATIENT-SOMCHAI', 135, 88, 78, 36.6, 97, 82.0, 170, NOW() - interval '1 day'),
('PATIENT-SOMCHAI', 132, 85, 76, 36.5, 98, 81.5, 170, NOW()),
('PATIENT-ANAN', 115, 75, 68, 36.4, 99, 65.0, 168, NOW());

-- =============================================================================
-- APPOINTMENTS
-- =============================================================================
INSERT INTO appointments (id, patient_id, doctor_id, requested_date, requested_time, confirmed_date, confirmed_time, 
                         appointment_type, status, symptoms, symptom_description, jitsi_room_name, meet_link)
VALUES
-- Today's appointments
('APT-TODAY-001', 'PATIENT-DEMO', 'DOC-TEST-001', CURRENT_DATE, '09:00', CURRENT_DATE, '09:00',
 'Telehealth', 'confirmed', '["headache", "fever"]', 'Headache and mild fever for 2 days', 
 'izara-meet-today-001', 'https://meet.jit.si/izara-meet-today-001'),
('APT-TODAY-002', 'PATIENT-SOMCHAI', 'DOC-TEST-001', CURRENT_DATE, '10:30', CURRENT_DATE, '10:30',
 'Telehealth', 'confirmed', '["diabetes followup"]', 'Regular diabetes checkup',
 'izara-meet-today-002', 'https://meet.jit.si/izara-meet-today-002'),
('APT-TODAY-003', 'PATIENT-ANAN', 'DOC-SPECIALIST-001', CURRENT_DATE, '14:00', CURRENT_DATE, '14:00',
 'Telehealth', 'confirmed', '["heart palpitations"]', 'Occasional heart palpitations',
 'izara-meet-today-003', 'https://meet.jit.si/izara-meet-today-003'),
-- Tomorrow
('APT-TOMORROW-001', 'PATIENT-DEMO', 'DOC-SPECIALIST-001', CURRENT_DATE + 1, '11:00', CURRENT_DATE + 1, '11:00',
 'Telehealth', 'confirmed', '["checkup"]', 'Annual health checkup',
 'izara-meet-tomorrow-001', 'https://meet.jit.si/izara-meet-tomorrow-001'),
-- Past (completed)
('APT-PAST-001', 'PATIENT-DEMO', 'DOC-TEST-001', CURRENT_DATE - 7, '09:00', CURRENT_DATE - 7, '09:00',
 'Telehealth', 'completed', '["cold symptoms"]', 'Cold and runny nose',
 'izara-meet-past-001', 'https://meet.jit.si/izara-meet-past-001'),
('APT-PAST-002', 'PATIENT-SOMCHAI', 'DOC-TEST-001', CURRENT_DATE - 14, '10:00', CURRENT_DATE - 14, '10:00',
 'Telehealth', 'completed', '["diabetes checkup"]', 'Quarterly diabetes review',
 'izara-meet-past-002', 'https://meet.jit.si/izara-meet-past-002'),
-- Pending
('APT-PENDING-001', 'PATIENT-ANAN', 'DOC-TEST-001', CURRENT_DATE + 7, '15:00', NULL, NULL,
 'Telehealth', 'pending', '["general consultation"]', 'General health consultation',
 NULL, NULL);

-- =============================================================================
-- EMR (Electronic Medical Records) - SOAP Format
-- =============================================================================
INSERT INTO emr (id, appointment_id, patient_id, doctor_id, subjective, objective, assessment, plan, 
                ai_summary, ai_summary_approved, status)
VALUES
('EMR-PAST-001', 'APT-PAST-001', 'PATIENT-DEMO', 'DOC-TEST-001',
 '{"chief_complaint": "Cold symptoms for 3 days", "history": "Runny nose, mild cough, no fever"}'::jsonb,
 '{"vital_signs": {"temp": 36.8, "bp": "120/80", "hr": 72}, "physical_exam": "Throat slightly red, lungs clear"}'::jsonb,
 '{"diagnosis": ["J00 Acute nasopharyngitis (common cold)"], "icd10": "J00"}'::jsonb,
 '{"medications": ["Paracetamol 500mg PRN", "Chlorpheniramine 4mg TID"], "instructions": "Rest, drink fluids", "follow_up": "If symptoms worsen"}'::jsonb,
 'Patient with common cold symptoms for 3 days. No fever. Prescribed symptomatic treatment.',
 true, 'completed'),
('EMR-PAST-002', 'APT-PAST-002', 'PATIENT-SOMCHAI', 'DOC-TEST-001',
 '{"chief_complaint": "Diabetes follow-up", "history": "Type 2 DM on Metformin, compliant"}'::jsonb,
 '{"vital_signs": {"bp": "130/85", "hr": 76}, "labs": {"HbA1c": 7.1, "FBS": 128}}'::jsonb,
 '{"diagnosis": ["E11.9 Type 2 DM without complications"], "icd10": "E11.9"}'::jsonb,
 '{"medications": ["Continue Metformin 500mg BID"], "instructions": "Diet control, exercise 30min/day", "follow_up": "3 months"}'::jsonb,
 'DM type 2 patient with improved HbA1c (7.1%). Continue current regimen.',
 true, 'completed');

-- =============================================================================
-- MEDICAL CONTENT (Health Articles)
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
 'psychiatry', 'DOC-SPECIALIST-001', 'published', 95, '["mental health", "technology", "balance"]'::jsonb);

-- =============================================================================
-- CLINICAL RESOURCES (For Doctors)
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
 'approved', 'ADMIN-TEST-001', NOW());

-- =============================================================================
-- CONSULTANTS (Specialist Directory)
-- =============================================================================
INSERT INTO consultants (id, name, specialty, hospital, phone, email, is_available)
VALUES
('CONSULT-001', 'Dr. Wichai Chuchart', 'Cardiology', 'Bumrungrad Hospital', '02-011-1111', 'wichai@bumrungrad.com', true),
('CONSULT-002', 'Dr. Somying Thongsuk', 'Nephrology', 'Siriraj Hospital', '02-022-2222', 'somying@siriraj.ac.th', true),
('CONSULT-003', 'Dr. Prasert Wongsawat', 'Endocrinology', 'Ramathibodi Hospital', '02-033-3333', 'prasert@rama.ac.th', true),
('CONSULT-004', 'Dr. Nattaporn Srisawat', 'Oncology', 'Chulalongkorn Hospital', '02-044-4444', 'nattaporn@chula.ac.th', false);

-- =============================================================================
-- KNOWLEDGE BASE (For RAG/AI)
-- =============================================================================
INSERT INTO knowledge_base (id, content_type, content, metadata, embedding)
VALUES
('KB-001', 'clinical_guideline', 
 'Hypertension management in Thai adults: Target BP <140/90 mmHg for general population, <130/80 for high-risk patients. First-line: CCB or ACEI/ARB. Lifestyle modifications essential.',
 '{"specialty": "cardiology", "source": "Thai Hypertension Society 2024", "language": "en"}'::jsonb, NULL),
('KB-002', 'drug_interaction',
 'Metformin and contrast media: Hold metformin 48 hours before and after contrast procedures in patients with eGFR <60. Resume after confirming stable renal function.',
 '{"specialty": "nephrology", "source": "KDIGO 2024", "language": "en"}'::jsonb, NULL),
('KB-003', 'clinical_guideline',
 'Diabetic foot care: Daily inspection, proper footwear, avoid walking barefoot, regular podiatry visits. Screen for neuropathy annually with 10g monofilament.',
 '{"specialty": "endocrinology", "source": "ADA Standards 2025", "language": "en"}'::jsonb, NULL),
('KB-004', 'protocol',
 'Telemedicine consultation workflow: 1) Pre-visit questionnaire 2) Equipment check 3) Patient verification 4) Consultation 5) EMR documentation 6) E-prescription if needed 7) Follow-up scheduling',
 '{"specialty": "telemedicine", "source": "Izara Protocol", "language": "en"}'::jsonb, NULL),
('KB-005', 'drug_information',
 'SGLT2 inhibitors in heart failure: Empagliflozin and dapagliflozin reduce hospitalization and CV death in HFrEF regardless of diabetes status. Monitor for genital infections and euglycemic DKA.',
 '{"specialty": "cardiology", "source": "ESC Guidelines 2024", "language": "en"}'::jsonb, NULL);

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================
INSERT INTO notifications (id, user_id, title, message, priority, metadata, created_at)
VALUES
('NOTIF-001', 'PATIENT-DEMO', 'Appointment Reminder', 'You have an appointment today at 9:00 AM with Dr. Test', 'high',
 '{"appointment_id": "APT-TODAY-001", "type": "appointment"}'::jsonb, NOW()),
('NOTIF-002', 'PATIENT-DEMO', 'Health Tip', 'Remember to take your blood pressure medication daily', 'low',
 '{"type": "health_tip"}'::jsonb, NOW() - interval '1 day'),
('NOTIF-003', 'DOC-TEST-001', 'New Appointment', 'A new appointment has been scheduled for today', 'medium',
 '{"appointment_id": "APT-TODAY-001", "type": "new_appointment"}'::jsonb, NOW()),
('NOTIF-004', 'DOC-TEST-001', 'Lab Results Ready', 'Lab results for patient Somchai are ready for review', 'high',
 '{"patient_id": "PATIENT-SOMCHAI", "type": "lab_results"}'::jsonb, NOW()),
('NOTIF-005', 'PATIENT-SOMCHAI', 'Appointment Tomorrow', 'You have a diabetes follow-up tomorrow', 'medium',
 '{"appointment_id": "APT-TOMORROW-001", "type": "reminder"}'::jsonb, NOW());

-- =============================================================================
-- VERIFY DATA COUNTS
-- =============================================================================
SELECT 'LOCAL SEED DATA LOADED SUCCESSFULLY' as status;
SELECT 'users: ' || count(*) FROM users;
SELECT 'doctor_profiles: ' || count(*) FROM doctor_profiles;
SELECT 'patient_profiles: ' || count(*) FROM patient_profiles;
SELECT 'phr: ' || count(*) FROM phr;
SELECT 'vital_signs: ' || count(*) FROM vital_signs;
SELECT 'appointments: ' || count(*) FROM appointments;
SELECT 'emr: ' || count(*) FROM emr;
SELECT 'medical_content: ' || count(*) FROM medical_content;
SELECT 'clinical_resources: ' || count(*) FROM clinical_resources;
SELECT 'consultants: ' || count(*) FROM consultants;
SELECT 'knowledge_base: ' || count(*) FROM knowledge_base;
SELECT 'notifications: ' || count(*) FROM notifications;
