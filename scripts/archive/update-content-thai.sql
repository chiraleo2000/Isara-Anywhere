-- =============================================================================
-- IZARA TELEMEDICINE - UPDATE CONTENT WITH THAI AND IMAGES
-- =============================================================================
-- Purpose: Update medical content and clinical resources with Thai content and images
-- Usage: Run in pgAdmin or via psql
-- =============================================================================

-- =============================================================================
-- MEDICAL CONTENT (Health Articles for Patients) - WITH IMAGES
-- =============================================================================
DELETE FROM medical_content WHERE id LIKE 'MC-%';
DELETE FROM medical_content WHERE id LIKE 'content-%';

INSERT INTO medical_content (id, title_thai, title_english, content_thai, content_english, category, 
                            author_id, status, view_count, tags, image_url)
VALUES
-- Heart Health with Image
('MC-001', 'การดูแลสุขภาพหัวใจ', 'Heart Health Care',
 '## 🫀 หัวใจแข็งแรง ชีวิตยืนยาว

หัวใจเป็นอวัยวะสำคัญที่สูบฉีดเลือดไปเลี้ยงร่างกายทุกส่วน การดูแลหัวใจให้แข็งแรงทำได้โดย:

### วิธีดูแลหัวใจ
- **ออกกำลังกายสม่ำเสมอ** - อย่างน้อย 150 นาทีต่อสัปดาห์
- **รับประทานอาหารสุขภาพ** - ลดเค็ม ลดมัน เพิ่มผักผลไม้
- **หลีกเลี่ยงบุหรี่และแอลกอฮอล์**
- **ตรวจสุขภาพประจำปี** - วัดความดัน ตรวจไขมันในเลือด

![ภาพหัวใจสุขภาพดี](https://images.unsplash.com/photo-1559757175-5700dde675bc?w=600)

### สัญญาณเตือนโรคหัวใจ
⚠️ เจ็บแน่นหน้าอก, หายใจลำบาก, เหนื่อยง่ายผิดปกติ',
 'The heart is a vital organ that pumps blood throughout the body. Keep it healthy with exercise, diet, and regular checkups.',
 'cardiovascular', 'DOC-SPECIALIST-001', 'published', 150, 
 '["หัวใจ", "สุขภาพ", "ออกกำลังกาย", "heart", "health"]'::jsonb,
 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800'),

-- Diabetes Management with Image
('MC-002', 'การจัดการโรคเบาหวาน', 'Diabetes Management',
 '## 🍬 ควบคุมเบาหวาน ชีวิตมีคุณภาพ

โรคเบาหวานเป็นโรคเรื้อรังที่ต้องดูแลอย่างต่อเนื่อง

### เป้าหมายการควบคุม
| ตัวชี้วัด | เป้าหมาย |
|----------|---------|
| HbA1c | < 7% |
| น้ำตาลก่อนอาหาร | 80-130 mg/dL |
| น้ำตาลหลังอาหาร | < 180 mg/dL |

### การดูแลตนเอง
1. **รับประทานยาตามแพทย์สั่ง**
2. **ควบคุมอาหาร** - ลดแป้ง น้ำตาล ไขมัน
3. **ออกกำลังกาย** - 30 นาที/วัน
4. **ตรวจน้ำตาลเป็นประจำ**

![ตรวจน้ำตาลในเลือด](https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600)

### สัญญาณน้ำตาลต่ำ
⚠️ ใจสั่น เหงื่อออก มือสั่น หิวมาก → รับประทานน้ำหวาน',
 'Diabetes is a chronic condition requiring ongoing management with medication, diet, and exercise.',
 'endocrinology', 'DOC-TEST-001', 'published', 200, 
 '["เบาหวาน", "น้ำตาล", "diabetes", "blood sugar"]'::jsonb,
 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800'),

-- Sleep Health with Image
('MC-003', 'การนอนหลับที่ดี', 'Good Sleep Habits',
 '## 😴 นอนหลับดี สุขภาพดี

การนอนหลับที่มีคุณภาพ 7-9 ชั่วโมงต่อคืนช่วยให้ร่างกายฟื้นฟู

### ประโยชน์ของการนอนหลับเพียงพอ
- ✅ เสริมสร้างภูมิคุ้มกัน
- ✅ ช่วยความจำและสมาธิ
- ✅ ลดความเครียด
- ✅ ควบคุมน้ำหนัก

### เทคนิคนอนหลับให้ดี
1. **เข้านอนเวลาเดียวกันทุกวัน**
2. **หลีกเลี่ยงคาเฟอีนหลังบ่าย 3**
3. **ปิดหน้าจอก่อนนอน 1 ชั่วโมง**
4. **ห้องนอนมืด เงียบ เย็นสบาย**

![การนอนหลับที่ดี](https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=600)',
 'Quality sleep of 7-9 hours per night helps the body recover, boosts immunity, and aids memory.',
 'general', 'DOC-TEST-001', 'published', 120, 
 '["นอนหลับ", "sleep", "wellness"]'::jsonb,
 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800'),

-- Exercise for Seniors
('MC-004', 'การออกกำลังกายสำหรับผู้สูงอายุ', 'Exercise for Seniors',
 '## 🏃‍♂️ ผู้สูงวัย แข็งแรงได้

การออกกำลังกายสำหรับผู้สูงอายุช่วยเพิ่มความแข็งแรง ป้องกันการหกล้ม

### กิจกรรมที่เหมาะสม
| กิจกรรม | เวลา/สัปดาห์ |
|--------|-------------|
| เดินเร็ว | 150 นาที |
| ว่ายน้ำ | 75-150 นาที |
| รำไทเก๊ก | 60 นาที |
| โยคะ | 60 นาที |

### ข้อควรระวัง
⚠️ อบอุ่นร่างกายก่อนออกกำลัง
⚠️ ดื่มน้ำเพียงพอ
⚠️ หยุดทันทีหากเจ็บหน้าอกหรือหายใจลำบาก

![ผู้สูงอายุออกกำลังกาย](https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600)',
 'Seniors should do light exercises like brisk walking, swimming, or yoga for at least 150 minutes per week.',
 'geriatrics', 'DOC-TEST-001', 'published', 80, 
 '["ผู้สูงอายุ", "ออกกำลังกาย", "exercise", "seniors"]'::jsonb,
 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800'),

-- Mental Health
('MC-005', 'สุขภาพจิตในยุคดิจิทัล', 'Mental Health in Digital Age',
 '## 🧠 ดูแลจิตใจ ในโลกออนไลน์

การใช้เทคโนโลยีมากเกินไปอาจส่งผลต่อสุขภาพจิต

### ผลกระทบจากการใช้หน้าจอมากเกินไป
- 😟 ความวิตกกังวล
- 😔 ภาวะซึมเศร้า
- 😴 นอนไม่หลับ
- 👀 สายตาเสื่อม

### วิธีรักษาสมดุล
1. **จำกัดเวลาหน้าจอ** - ใช้แอพติดตาม
2. **พักสายตาทุก 20 นาที** (กฎ 20-20-20)
3. **ทำกิจกรรมกลางแจ้ง**
4. **พบปะเพื่อนในชีวิตจริง**

![สุขภาพจิตที่ดี](https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=600)

### สัญญาณที่ควรพบแพทย์
⚠️ รู้สึกเศร้านานกว่า 2 สัปดาห์ ⚠️ มีความคิดทำร้ายตนเอง',
 'Excessive technology use can affect mental health. Take screen breaks, do outdoor activities, and maintain relationships.',
 'psychiatry', 'DOC-SPECIALIST-001', 'published', 95, 
 '["สุขภาพจิต", "mental health", "technology"]'::jsonb,
 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800'),

-- COVID Prevention
('MC-006', 'การป้องกันโรคติดเชื้อทางเดินหายใจ', 'Respiratory Infection Prevention',
 '## 🦠 ป้องกันโรคติดเชื้อทางเดินหายใจ

### วิธีป้องกัน
- 🧼 **ล้างมือบ่อยๆ** ด้วยสบู่หรือเจลแอลกอฮอล์
- 😷 **สวมหน้ากาก** ในที่ชุมชน
- 🌬️ **อยู่ในที่อากาศถ่ายเท**
- 💉 **ฉีดวัคซีนป้องกัน**

### เมื่อมีอาการไอ จาม
1. ปิดปากด้วยข้อพับแขน
2. ล้างมือทันที
3. หลีกเลี่ยงสัมผัสใกล้ชิดผู้อื่น
4. พบแพทย์หากมีไข้สูง หายใจลำบาก

![ป้องกันโรคติดเชื้อ](https://images.unsplash.com/photo-1584634428023-64f0f18c7a53?w=600)',
 'Prevent respiratory infections by washing hands, wearing masks, and getting vaccinated.',
 'infectious', 'DOC-TEST-001', 'published', 180, 
 '["ป้องกันโรค", "respiratory", "infection", "prevention"]'::jsonb,
 'https://images.unsplash.com/photo-1584634428023-64f0f18c7a53?w=800');

-- =============================================================================
-- CLINICAL RESOURCES (For Doctors) - WITH IMAGES
-- =============================================================================
DELETE FROM clinical_resources WHERE id LIKE 'CR-%';
DELETE FROM clinical_resources WHERE id LIKE 'resource-%';

INSERT INTO clinical_resources (id, title_thai, title_english, content_thai, content_english, 
                               category, specialty, guideline_year, source, tags, status, 
                               approved_by, approved_at, image_url)
VALUES
-- CKD Drug Dosing
('CR-001', 'แนวทางการปรับยาในผู้ป่วย CKD', 'Drug Dosing Adjustments in CKD',
 '## 💊 การปรับขนาดยาในผู้ป่วยโรคไตเรื้อรัง (CKD)

### Metformin (กลุ่ม Biguanide)
| eGFR (mL/min) | การใช้ยา |
|--------------|----------|
| ≥ 45 | ใช้ขนาดปกติ |
| 30-44 | ลดขนาด 50% |
| < 30 | ❌ หยุดยา |

### SGLT2 Inhibitors
| ยา | eGFR ที่เริ่มใช้ | eGFR ที่หยุด |
|---|----------------|-------------|
| Empagliflozin | ≥ 20 | < 20 |
| Dapagliflozin | ≥ 25 | < 25 |
| Canagliflozin | ≥ 30 | < 30 |

![ตรวจการทำงานของไต](https://images.unsplash.com/photo-1579165466741-7f35e4755169?w=600)

### ⚠️ ข้อควรระวัง
- ติดตาม eGFR ทุก 3-6 เดือน
- ปรับยาทันทีเมื่อ eGFR เปลี่ยนแปลง
- ระวัง Metformin-associated Lactic Acidosis',
 'Drug dosing in CKD: Metformin - eGFR>=45 normal, 30-44 reduce 50%, <30 discontinue',
 'pharmacology', 'Nephrology', 2025, 'KDIGO Guidelines 2024', 
 '["CKD", "drug dosing", "nephrology", "ไต"]'::jsonb,
 'approved', 'ADMIN-TEST-001', NOW(),
 'https://images.unsplash.com/photo-1579165466741-7f35e4755169?w=800'),

-- Diabetes + CKD CDS
('CR-002', 'CDS: เบาหวานร่วมกับโรคไตเรื้อรัง', 'CDS: Diabetes with CKD',
 '## 🩺 Clinical Decision Support: DM + CKD

### เป้าหมายการรักษา
| ตัวชี้วัด | ผู้ป่วยทั่วไป | ผู้สูงอายุ/มีภาวะแทรกซ้อน |
|----------|-------------|------------------------|
| HbA1c | < 7% | 7-8% |
| BP | < 130/80 | < 140/90 |

### ยาที่แนะนำ (2025 Guidelines)
**First-line:**
1. ✅ SGLT2 inhibitors (ลดการเสื่อมของไต)
2. ✅ GLP-1 RA (ลด CV events)

**ยาที่ต้องระวัง:**
- ⚠️ Metformin (หยุดถ้า eGFR < 30)
- ❌ Sulfonylureas ขนาดสูง

![เบาหวานกับไต](https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=600)

### Algorithm
```
eGFR > 30 → SGLT2i + Metformin
eGFR 15-30 → SGLT2i เท่านั้น
eGFR < 15 → Refer nephrologist
```',
 'HbA1c targets: <7% general, 7-8% elderly. Recommended: SGLT2i, GLP-1 RA',
 'treatment', 'Endocrinology', 2025, 'ADA/KDIGO Consensus 2024', 
 '["diabetes", "CKD", "treatment", "เบาหวาน", "ไต"]'::jsonb,
 'approved', 'ADMIN-TEST-001', NOW(),
 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=800'),

-- Hyperkalemia Emergency
('CR-003', 'โปรโตคอลฉุกเฉิน: ภาวะโพแทสเซียมในเลือดสูง', 'Emergency Protocol: Hyperkalemia',
 '## 🚨 Hyperkalemia Emergency Protocol

### การประเมินความรุนแรง
| K+ Level | การจัดการ |
|----------|----------|
| 5.5-6.0 | ลดอาหาร K+, ตรวจ EKG |
| 6.0-6.5 | + Kayexalate, IV Insulin |
| > 6.5 | + Ca gluconate, Dialysis |

### ⚡ การรักษาเร่งด่วน (K+ > 6.0)

**Step 1: Cardiac Protection**
- Calcium gluconate 10% 10 mL IV push (2-3 นาที)
- ออกฤทธิ์ทันที, หมดฤทธิ์ใน 30-60 นาที

**Step 2: Shift K+ into cells**
- Insulin 10 units + D50W 50 mL IV
- Onset: 15-30 min, Duration: 4-6 hrs

**Step 3: Remove K+**
- Kayexalate 30g PO/PR
- Hemodialysis (ถ้า refractory)

![EKG ใน Hyperkalemia](https://images.unsplash.com/photo-1516549655169-df83a0774514?w=600)

### ⚠️ EKG Changes
- Peaked T waves → Widened QRS → Sine wave → VF',
 'K+ 5.5-6.0: Diet, K+ >6.5: Ca gluconate, Insulin, Dialysis',
 'emergency', 'Nephrology', 2024, 'KDIGO AKI Guidelines', 
 '["emergency", "hyperkalemia", "protocol", "ฉุกเฉิน"]'::jsonb,
 'approved', 'ADMIN-TEST-001', NOW(),
 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800'),

-- Telemedicine Best Practices
('CR-004', 'แนวปฏิบัติ Telemedicine ประเทศไทย', 'Thailand Telemedicine Best Practices',
 '## 📹 แนวปฏิบัติการแพทย์ทางไกลในประเทศไทย

### ขั้นตอนการตรวจผ่าน Video Call
1. **ตรวจสอบอุปกรณ์** - กล้อง ไมค์ อินเทอร์เน็ต
2. **ทบทวนประวัติ** - อ่าน PHR/EMR ก่อนพบ
3. **ยืนยันตัวตนผู้ป่วย** - ถามชื่อ-สกุล วันเกิด
4. **ดำเนินการตรวจ** - ซักประวัติ ดูอาการ
5. **บันทึก EMR** - ลง SOAP note
6. **ขอ PDPA Consent** - ก่อนเก็บ/ส่งข้อมูล

### เอกสารที่ต้องจัดทำ
- ✅ EMR (บันทึกการตรวจ)
- ✅ ใบสั่งยา (E-prescription)
- ✅ Patient Instruction Sheet
- ✅ นัดหมายติดตาม

![Telemedicine Consultation](https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600)

### ข้อควรระวังทางกฎหมาย
- บันทึก Video ต้องได้รับความยินยอม
- เก็บข้อมูลตาม PDPA
- ส่งต่อทันทีหากเป็นกรณีฉุกเฉิน',
 'Steps: Check equipment, Review history, Verify patient, Record EMR, Obtain PDPA consent',
 'telemedicine', 'General', 2024, 'Thai Medical Council', 
 '["telemedicine", "PDPA", "guidelines", "แพทย์ทางไกล"]'::jsonb,
 'approved', 'ADMIN-TEST-001', NOW(),
 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800'),

-- Hypertension Guidelines
('CR-005', 'แนวทางการรักษาความดันโลหิตสูง 2025', 'Hypertension Treatment Guidelines 2025',
 '## 🩸 แนวทางการรักษาความดันโลหิตสูง

### เป้าหมายการรักษา (2025 Guidelines)
| กลุ่มผู้ป่วย | เป้าหมาย BP |
|------------|------------|
| ทั่วไป | < 140/90 |
| DM/CKD/CVD | < 130/80 |
| อายุ > 80 ปี | < 150/90 |

### ยา First-line
1. **CCB** (Amlodipine) - เหมาะกับผู้สูงอายุ
2. **ACEI/ARB** - เหมาะกับ DM/CKD
3. **Thiazide** - เหมาะกับผู้ป่วยบวม

### การปรับเปลี่ยนพฤติกรรม (DASH)
- 🧂 ลดเกลือ < 6 g/day
- 🥗 เพิ่มผัก ผลไม้
- 🏃 ออกกำลังกาย 150 min/week
- 🍷 ลดแอลกอฮอล์
- 🚭 หยุดบุหรี่

![ความดันโลหิต](https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=600)',
 'BP targets: <140/90 general, <130/80 high-risk. First-line: CCB, ACEI/ARB',
 'cardiology', 'Cardiology', 2025, 'Thai Hypertension Society', 
 '["hypertension", "ความดันโลหิตสูง", "treatment"]'::jsonb,
 'approved', 'ADMIN-TEST-001', NOW(),
 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800'),

-- AI in Healthcare
('CR-006', 'การใช้ AI ช่วยในการตัดสินใจทางคลินิก', 'AI-Assisted Clinical Decision Making',
 '## 🤖 การใช้ AI ช่วยในการตัดสินใจทางคลินิก

### หลัก Man-in-the-Loop
**AI ทำหน้าที่:**
- 📊 วิเคราะห์ข้อมูลผู้ป่วย
- 📝 สรุป EMR และประวัติ
- 💊 แนะนำการรักษาตาม Guidelines
- ⚠️ แจ้งเตือน Drug Interaction

**แพทย์ทำหน้าที่:**
- ✅ ตรวจสอบความถูกต้อง
- ✅ ตัดสินใจรักษา
- ✅ ยืนยันก่อนส่งถึงผู้ป่วย

### Workflow การใช้ AI
```
ผู้ป่วยให้ข้อมูล → AI วิเคราะห์ → 
แพทย์ตรวจสอบ → แพทย์ยืนยัน → ผู้ป่วยรับข้อมูล
```

![AI ช่วยแพทย์](https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600)

### ข้อควรระวัง
⚠️ AI ไม่สามารถแทนที่การตรวจทางกายภาพ
⚠️ ต้องตรวจสอบ AI output ทุกครั้ง
⚠️ ผู้ป่วยต้องทราบว่ามีการใช้ AI',
 'AI assists but doctors make final decisions. Man-in-the-loop validation required.',
 'technology', 'General', 2025, 'Izara Medical AI Guidelines', 
 '["AI", "clinical decision support", "man-in-the-loop"]'::jsonb,
 'approved', 'ADMIN-TEST-001', NOW(),
 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800');

-- =============================================================================
-- VERIFY
-- =============================================================================
SELECT 'THAI CONTENT WITH IMAGES UPDATED' as status;
SELECT 'medical_content: ' || count(*) as count FROM medical_content;
SELECT 'clinical_resources: ' || count(*) as count FROM clinical_resources;
