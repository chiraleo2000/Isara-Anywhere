-- ============================================================================
-- IZARA TELEMEDICINE - ADDITIONAL TABLES FOR PATIENT PORTAL
-- Version: 2.1.0
-- Updated: 2026-01-20
-- ============================================================================

-- ============================================================================
-- PATIENT CONSENTS TABLE (for PDPA compliance)
-- ============================================================================
CREATE TABLE IF NOT EXISTS patient_consents (
    id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) REFERENCES users(id),
    consent_type VARCHAR(100) NOT NULL,
    granted BOOLEAN DEFAULT false,
    doctor_id VARCHAR(50),
    doctor_name VARCHAR(255),
    data_types JSONB DEFAULT '["all"]'::jsonb,
    granted_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoke_reason TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patient_consents_patient_id ON patient_consents(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_consents_doctor_id ON patient_consents(doctor_id);
CREATE INDEX IF NOT EXISTS idx_patient_consents_status ON patient_consents(status);

-- ============================================================================
-- LIVING WILL VERSIONS TABLE (for version history)
-- ============================================================================
CREATE TABLE IF NOT EXISTS living_will_versions (
    id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) REFERENCES users(id),
    version INTEGER NOT NULL,
    data JSONB NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_living_will_versions_patient_id ON living_will_versions(patient_id);

-- ============================================================================
-- PASSWORD RESETS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS password_resets (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id),
    token VARCHAR(128) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);

-- ============================================================================
-- DOCTOR SCHEDULES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS doctor_schedules (
    id VARCHAR(50) PRIMARY KEY,
    doctor_id VARCHAR(50) REFERENCES users(id),
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INTEGER DEFAULT 30,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doctor_id ON doctor_schedules(doctor_id);

-- ============================================================================
-- DOCTOR REVIEWS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS doctor_reviews (
    id VARCHAR(50) PRIMARY KEY,
    doctor_id VARCHAR(50) REFERENCES users(id),
    patient_id VARCHAR(50) REFERENCES users(id),
    appointment_id VARCHAR(50) REFERENCES appointments(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_doctor_reviews_doctor_id ON doctor_reviews(doctor_id);

-- ============================================================================
-- DOCTORS TABLE (denormalized for quick lookups)
-- ============================================================================
CREATE TABLE IF NOT EXISTS doctors (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_thai VARCHAR(255),
    specialty VARCHAR(100),
    specialty_thai VARCHAR(100),
    hospital VARCHAR(255),
    hospital_thai VARCHAR(255),
    avatar_url TEXT,
    rating DECIMAL(2,1) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    experience_years INTEGER,
    consultation_fee DECIMAL(10,2),
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors(specialty);
CREATE INDEX IF NOT EXISTS idx_doctors_is_available ON doctors(is_available);

-- ============================================================================
-- ADD notification_settings column to users table
-- ============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'notification_settings') THEN
        ALTER TABLE users ADD COLUMN notification_settings JSONB DEFAULT '{
            "appointments": true,
            "messages": true,
            "healthReminders": true,
            "promotions": false,
            "email": true,
            "push": true,
            "sms": false
        }'::jsonb;
    END IF;
END $$;

-- ============================================================================
-- ADD additional columns to living_wills table
-- ============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'living_wills' AND column_name = 'decisions') THEN
        ALTER TABLE living_wills ADD COLUMN decisions JSONB DEFAULT '{}'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'living_wills' AND column_name = 'witness_info') THEN
        ALTER TABLE living_wills ADD COLUMN witness_info JSONB DEFAULT '{}'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'living_wills' AND column_name = 'signature_data') THEN
        ALTER TABLE living_wills ADD COLUMN signature_data TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'living_wills' AND column_name = 'version') THEN
        ALTER TABLE living_wills ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'living_wills' AND column_name = 'restored_from') THEN
        ALTER TABLE living_wills ADD COLUMN restored_from VARCHAR(50);
    END IF;
END $$;

-- ============================================================================
-- ADD additional columns to phr table
-- ============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'phr' AND column_name = 'blood_type') THEN
        ALTER TABLE phr ADD COLUMN blood_type VARCHAR(10);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'phr' AND column_name = 'height_cm') THEN
        ALTER TABLE phr ADD COLUMN height_cm DECIMAL(5,1);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'phr' AND column_name = 'weight_kg') THEN
        ALTER TABLE phr ADD COLUMN weight_kg DECIMAL(5,1);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'phr' AND column_name = 'bmi') THEN
        ALTER TABLE phr ADD COLUMN bmi DECIMAL(4,1);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'phr' AND column_name = 'emergency_contact_name') THEN
        ALTER TABLE phr ADD COLUMN emergency_contact_name VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'phr' AND column_name = 'emergency_contact_phone') THEN
        ALTER TABLE phr ADD COLUMN emergency_contact_phone VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'phr' AND column_name = 'emergency_contact_relation') THEN
        ALTER TABLE phr ADD COLUMN emergency_contact_relation VARCHAR(100);
    END IF;
END $$;

-- ============================================================================
-- ADD additional columns to appointments table
-- ============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'appointments' AND column_name = 'appointment_date') THEN
        ALTER TABLE appointments ADD COLUMN appointment_date DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'appointments' AND column_name = 'appointment_time') THEN
        ALTER TABLE appointments ADD COLUMN appointment_time TIME;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'appointments' AND column_name = 'reason') THEN
        ALTER TABLE appointments ADD COLUMN reason TEXT;
    END IF;
END $$;

-- ============================================================================
-- INSERT SAMPLE DOCTOR DATA
-- ============================================================================
INSERT INTO doctors (id, name, name_thai, specialty, specialty_thai, hospital, hospital_thai, avatar_url, rating, review_count, experience_years, consultation_fee, is_available)
VALUES 
    ('DOC-001', 'Dr. Somchai Prasert', 'นพ.สมชาย ประเสริฐ', 'Internal Medicine', 'อายุรกรรม', 'Bangkok General Hospital', 'โรงพยาบาลกรุงเทพ', 'https://i.pravatar.cc/150?u=doc1', 4.8, 125, 15, 500.00, true),
    ('DOC-002', 'Dr. Siriporn Thongchai', 'พญ.ศิริพร ทองชัย', 'Cardiology', 'หทัยวิทยา', 'Bumrungrad Hospital', 'โรงพยาบาลบำรุงราษฎร์', 'https://i.pravatar.cc/150?u=doc2', 4.9, 200, 20, 800.00, true),
    ('DOC-003', 'Dr. Wichai Sawangpong', 'นพ.วิชัย สว่างพงศ์', 'Dermatology', 'ผิวหนัง', 'Samitivej Hospital', 'โรงพยาบาลสมิติเวช', 'https://i.pravatar.cc/150?u=doc3', 4.7, 89, 12, 600.00, true),
    ('DOC-004', 'Dr. Nattaya Suksawat', 'พญ.ณัฏฐยา สุขสวัสดิ์', 'Pediatrics', 'กุมารเวชกรรม', 'Chulalongkorn Hospital', 'โรงพยาบาลจุฬาลงกรณ์', 'https://i.pravatar.cc/150?u=doc4', 4.6, 150, 10, 450.00, true),
    ('DOC-TEST-001', 'Dr. Test Doctor', 'นพ.ทดสอบ ระบบ', 'General Medicine', 'เวชปฏิบัติทั่วไป', 'Izara Test Hospital', 'โรงพยาบาลอิซาร่า ทดสอบ', 'https://i.pravatar.cc/150?u=doctest', 5.0, 10, 5, 300.00, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- INSERT SAMPLE MEDICAL CONTENT
-- ============================================================================
INSERT INTO medical_content (id, title_thai, title_english, content_thai, content_english, category, tags, status, published_at)
VALUES 
    ('content-001', 'การดูแลสุขภาพหัวใจ', 'Heart Health Care', 
     'การดูแลหัวใจที่ดีเริ่มต้นจากการรับประทานอาหารที่มีประโยชน์ ออกกำลังกายสม่ำเสมอ และหลีกเลี่ยงความเครียด', 
     'Good heart care starts with eating healthy foods, exercising regularly, and avoiding stress.',
     'Cardiology', '["heart", "health", "exercise"]', 'published', NOW()),
    ('content-002', 'การจัดการโรคเบาหวาน', 'Diabetes Management',
     'การควบคุมน้ำตาลในเลือดเป็นสิ่งสำคัญสำหรับผู้ป่วยเบาหวาน ควรตรวจน้ำตาลเป็นประจำและรับประทานยาตามแพทย์สั่ง',
     'Blood sugar control is important for diabetic patients. Regular monitoring and medication as prescribed are essential.',
     'Endocrinology', '["diabetes", "blood sugar", "health"]', 'published', NOW()),
    ('content-003', 'การนอนหลับที่ดี', 'Good Sleep Habits',
     'การนอนหลับที่มีคุณภาพช่วยให้ร่างกายและจิตใจได้พักผ่อน ควรนอนให้ได้ 7-8 ชั่วโมงต่อวัน',
     'Quality sleep helps the body and mind rest. Aim for 7-8 hours of sleep per day.',
     'General Health', '["sleep", "wellness", "health"]', 'published', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- INSERT SAMPLE CLINICAL RESOURCES
-- ============================================================================
INSERT INTO clinical_resources (id, title_thai, title_english, content_thai, content_english, category, specialty, guideline_year, source, status)
VALUES 
    ('resource-001', 'แนวทางการรักษาโรคความดันโลหิตสูง', 'Hypertension Treatment Guidelines',
     'แนวทางการรักษาโรคความดันโลหิตสูงตามมาตรฐานกระทรวงสาธารณสุข',
     'Hypertension treatment guidelines according to Ministry of Public Health standards.',
     'Treatment Guidelines', 'Cardiology', 2024, 'Ministry of Public Health Thailand', 'approved'),
    ('resource-002', 'คู่มือการตรวจสุขภาพประจำปี', 'Annual Health Checkup Guide',
     'คู่มือสำหรับการตรวจสุขภาพประจำปีสำหรับผู้ใหญ่ทุกวัย',
     'Guide for annual health checkups for adults of all ages.',
     'Prevention', 'General Medicine', 2024, 'Thai Medical Association', 'approved')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- AUDIT LOG FOR PATIENT_ID COLUMN
-- ============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'audit_logs' AND column_name = 'patient_id') THEN
        ALTER TABLE audit_logs ADD COLUMN patient_id VARCHAR(50);
    END IF;
END $$;
