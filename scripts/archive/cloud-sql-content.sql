-- Cloud SQL Content Update Script
-- Adds Thai content with images to Cloud SQL izara_phase1 database

-- Clear and insert medical content
DELETE FROM medical_content;

INSERT INTO medical_content (id, title_thai, title_english, content_thai, content_english, category, author_id, status, view_count, tags, image_url)
VALUES
('MC-001', 'การดูแลสุขภาพหัวใจ', 'Heart Health Care',
 'หัวใจเป็นอวัยวะสำคัญที่สูบฉีดเลือดไปเลี้ยงร่างกาย การดูแลหัวใจให้แข็งแรงทำได้โดย ออกกำลังกายสม่ำเสมอ รับประทานอาหารสุขภาพ',
 'The heart is vital. Keep it healthy with exercise, diet, and regular checkups.',
 'cardiovascular', NULL, 'published', 150, 
 '["heart", "health"]'::jsonb, 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800'),
('MC-002', 'การจัดการโรคเบาหวาน', 'Diabetes Management',
 'โรคเบาหวานเป็นโรคเรื้อรังที่ต้องดูแลอย่างต่อเนื่อง การควบคุมอาหาร ออกกำลังกาย และรับประทานยาตามแพทย์สั่ง',
 'Diabetes requires ongoing management with medication, diet, and exercise.',
 'endocrinology', NULL, 'published', 200, 
 '["diabetes", "blood sugar"]'::jsonb, 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800'),
('MC-003', 'การนอนหลับที่ดี', 'Good Sleep Habits',
 'การนอนหลับที่มีคุณภาพ 7-9 ชั่วโมงต่อคืนช่วยให้ร่างกายฟื้นฟู เสริมสร้างภูมิคุ้มกัน และช่วยความจำ',
 'Quality sleep of 7-9 hours helps the body recover and boosts immunity.',
 'general', NULL, 'published', 120, 
 '["sleep", "wellness"]'::jsonb, 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800'),
('MC-004', 'การออกกำลังกายสำหรับผู้สูงอายุ', 'Exercise for Seniors',
 'ผู้สูงอายุควรออกกำลังกายเบาๆ อย่างน้อย 150 นาทีต่อสัปดาห์ เช่น เดินเร็ว ว่ายน้ำ รำไทเก๊ก',
 'Seniors should do light exercises like walking, swimming, or yoga.',
 'geriatrics', NULL, 'published', 80, 
 '["seniors", "exercise"]'::jsonb, 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800'),
('MC-005', 'สุขภาพจิตในยุคดิจิทัล', 'Mental Health in Digital Age',
 'การใช้เทคโนโลยีมากเกินไปอาจส่งผลต่อสุขภาพจิต ควรจำกัดเวลาหน้าจอ และพบปะเพื่อนในชีวิตจริง',
 'Excessive technology use can affect mental health. Take breaks and maintain relationships.',
 'psychiatry', NULL, 'published', 95, 
 '["mental health", "technology"]'::jsonb, 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800'),
('MC-006', 'การป้องกันโรคติดเชื้อทางเดินหายใจ', 'Respiratory Infection Prevention',
 'วิธีป้องกัน ล้างมือบ่อยๆ สวมหน้ากากในที่ชุมชน อยู่ในที่อากาศถ่ายเท และฉีดวัคซีนป้องกัน',
 'Prevent respiratory infections by washing hands, wearing masks, and getting vaccinated.',
 'infectious', NULL, 'published', 180, 
 '["respiratory", "prevention"]'::jsonb, 'https://images.unsplash.com/photo-1584634428023-64f0f18c7a53?w=800');

-- Clear and insert clinical resources
DELETE FROM clinical_resources;

INSERT INTO clinical_resources (id, title_thai, title_english, description_thai, description_english, category, resource_type, url, author_id, status, view_count, image_url)
VALUES
('CR-001', 'แนวทางการรักษาความดันโลหิตสูง', 'Hypertension Treatment Guidelines',
 'แนวทางปฏิบัติสำหรับแพทย์ในการรักษาผู้ป่วยความดันโลหิตสูง ตามมาตรฐาน WHO 2024',
 'Clinical practice guidelines for hypertension management per WHO 2024 standards.',
 'cardiovascular', 'guideline', 'https://izara-telemedicine.storage.googleapis.com/clinical/hypertension-guideline.pdf',
 NULL, 'published', 250, 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800'),
('CR-002', 'การใช้ยาปฏิชีวนะอย่างสมเหตุผล', 'Rational Antibiotic Use',
 'เอกสารแนะนำการใช้ยาปฏิชีวนะอย่างเหมาะสม เพื่อลดการดื้อยา',
 'Guidelines for appropriate antibiotic prescribing to reduce antimicrobial resistance.',
 'infectious', 'guideline', 'https://izara-telemedicine.storage.googleapis.com/clinical/antibiotic-guideline.pdf',
 NULL, 'published', 180, 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800'),
('CR-003', 'การดูแลผู้ป่วยเบาหวานแบบองค์รวม', 'Holistic Diabetes Care',
 'แนวทางการดูแลผู้ป่วยเบาหวานครบวงจร ตั้งแต่การควบคุมอาหาร การออกกำลังกาย และการใช้ยา',
 'Comprehensive diabetes care including diet, exercise, and medication management.',
 'endocrinology', 'guideline', 'https://izara-telemedicine.storage.googleapis.com/clinical/diabetes-care.pdf',
 NULL, 'published', 320, 'https://images.unsplash.com/photo-1576669801943-7a8a2c1e3b7e?w=800'),
('CR-004', 'แบบประเมินสุขภาพจิต PHQ-9', 'PHQ-9 Mental Health Assessment',
 'แบบประเมินภาวะซึมเศร้า PHQ-9 ฉบับภาษาไทย สำหรับคัดกรองผู้ป่วย',
 'PHQ-9 Depression screening tool in Thai for patient assessment.',
 'psychiatry', 'tool', 'https://izara-telemedicine.storage.googleapis.com/clinical/phq9-thai.pdf',
 NULL, 'published', 420, 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800'),
('CR-005', 'การดูแลผู้สูงอายุในชุมชน', 'Elderly Care in Community',
 'คู่มือการดูแลผู้สูงอายุในชุมชน สำหรับบุคลากรสาธารณสุขและผู้ดูแล',
 'Community elderly care handbook for healthcare workers and caregivers.',
 'geriatrics', 'handbook', 'https://izara-telemedicine.storage.googleapis.com/clinical/elderly-care.pdf',
 NULL, 'published', 150, 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800'),
('CR-006', 'เครื่องคำนวณ BMI และความเสี่ยง', 'BMI and Risk Calculator',
 'เครื่องมือคำนวณดัชนีมวลกาย (BMI) และประเมินความเสี่ยงโรคเรื้อรัง',
 'BMI calculator tool with chronic disease risk assessment.',
 'general', 'tool', 'https://izara-telemedicine.storage.googleapis.com/clinical/bmi-calculator.html',
 NULL, 'published', 580, 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800');

SELECT 'Medical content: ' || count(*) FROM medical_content;
SELECT 'Clinical resources: ' || count(*) FROM clinical_resources;
