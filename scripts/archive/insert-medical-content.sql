-- Update Medical Content
DELETE FROM medical_content;

INSERT INTO medical_content (id, title_thai, title_english, content_thai, content_english, category, author_id, status, view_count, tags, image_url)
VALUES
('MC-001', 'การดูแลสุขภาพหัวใจ', 'Heart Health Care',
 E'หัวใจเป็นอวัยวะสำคัญที่สูบฉีดเลือดไปเลี้ยงร่างกาย การดูแลหัวใจให้แข็งแรงทำได้โดย:\n\n- ออกกำลังกายสม่ำเสมอ 150 นาที/สัปดาห์\n- รับประทานอาหารสุขภาพ ลดเค็ม ลดมัน\n- หลีกเลี่ยงบุหรี่และแอลกอฮอล์\n- ตรวจสุขภาพประจำปี',
 'The heart is vital. Keep it healthy with exercise, diet, and regular checkups.',
 'cardiovascular', 'DOC-SOMCHAI-001', 'published', 150, 
 '["heart", "health"]'::jsonb, 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800'),
('MC-002', 'การจัดการโรคเบาหวาน', 'Diabetes Management',
 E'โรคเบาหวานเป็นโรคเรื้อรังที่ต้องดูแลอย่างต่อเนื่อง\n\nเป้าหมาย: HbA1c < 7%\n\nการดูแลตนเอง:\n- รับประทานยาตามแพทย์สั่ง\n- ควบคุมอาหาร ลดแป้ง น้ำตาล\n- ออกกำลังกาย 30 นาที/วัน',
 'Diabetes requires ongoing management with medication, diet, and exercise.',
 'endocrinology', 'DOC-TEST-001', 'published', 200, 
 '["diabetes", "blood sugar"]'::jsonb, 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800'),
('MC-003', 'การนอนหลับที่ดี', 'Good Sleep Habits',
 E'การนอนหลับที่มีคุณภาพ 7-9 ชั่วโมงต่อคืนช่วยให้ร่างกายฟื้นฟู\n\nประโยชน์:\n- เสริมสร้างภูมิคุ้มกัน\n- ช่วยความจำและสมาธิ\n- ลดความเครียด\n\nเทคนิค:\n- เข้านอนเวลาเดียวกันทุกวัน\n- ปิดหน้าจอก่อนนอน 1 ชั่วโมง',
 'Quality sleep of 7-9 hours helps the body recover and boosts immunity.',
 'general', 'DOC-SIRIPORN-001', 'published', 120, 
 '["sleep", "wellness"]'::jsonb, 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800'),
('MC-004', 'การออกกำลังกายสำหรับผู้สูงอายุ', 'Exercise for Seniors',
 E'ผู้สูงอายุควรออกกำลังกายเบาๆ อย่างน้อย 150 นาทีต่อสัปดาห์\n\nกิจกรรมที่เหมาะสม:\n- เดินเร็ว\n- ว่ายน้ำ\n- รำไทเก๊ก\n- โยคะ\n\nข้อควรระวัง:\n- อบอุ่นร่างกายก่อนออกกำลัง\n- ดื่มน้ำเพียงพอ',
 'Seniors should do light exercises like walking, swimming, or yoga.',
 'geriatrics', 'DOC-TEST-001', 'published', 80, 
 '["seniors", "exercise"]'::jsonb, 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800'),
('MC-005', 'สุขภาพจิตในยุคดิจิทัล', 'Mental Health in Digital Age',
 E'การใช้เทคโนโลยีมากเกินไปอาจส่งผลต่อสุขภาพจิต\n\nวิธีรักษาสมดุล:\n- จำกัดเวลาหน้าจอ\n- พักสายตาทุก 20 นาที\n- ทำกิจกรรมกลางแจ้ง\n- พบปะเพื่อนในชีวิตจริง',
 'Excessive technology use can affect mental health. Take breaks and maintain relationships.',
 'psychiatry', 'DOC-SOMCHAI-001', 'published', 95, 
 '["mental health", "technology"]'::jsonb, 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800'),
('MC-006', 'การป้องกันโรคติดเชื้อทางเดินหายใจ', 'Respiratory Infection Prevention',
 E'วิธีป้องกัน:\n- ล้างมือบ่อยๆ ด้วยสบู่หรือเจลแอลกอฮอล์\n- สวมหน้ากากในที่ชุมชน\n- อยู่ในที่อากาศถ่ายเท\n- ฉีดวัคซีนป้องกัน\n\nเมื่อมีอาการไอ จาม:\n- ปิดปากด้วยข้อพับแขน\n- ล้างมือทันที',
 'Prevent respiratory infections by washing hands, wearing masks, and getting vaccinated.',
 'infectious', 'DOC-SIRIPORN-001', 'published', 180, 
 '["respiratory", "prevention"]'::jsonb, 'https://images.unsplash.com/photo-1584634428023-64f0f18c7a53?w=800');

SELECT 'Medical content inserted: ' || count(*) FROM medical_content;
