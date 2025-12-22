/**
 * Generate Demo Medical Content and Clinical Resources Data
 * This script creates sample data via the GCS API server for testing the content management system
 * 
 * Usage: node scripts/generateContentData.cjs
 * Requires: GCS API Server running on port 3012
 */

const http = require('http');
const https = require('https');

// ============================================================================
// CONFIGURATION
// ============================================================================

const GCS_API_URL = process.env.GCS_API_URL || 'http://localhost:3012';

// ============================================================================
// HTTP HELPER FUNCTIONS
// ============================================================================

function makeRequest(method, url, data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    const req = protocol.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, data: body ? JSON.parse(body) : null });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function checkServerHealth() {
  try {
    const response = await makeRequest('GET', `${GCS_API_URL}/health`);
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

// ============================================================================
// SAMPLE MEDICAL CONTENT ARTICLES
// ============================================================================

const sampleMedicalContent = [
  {
    id: 'mc-001',
    title: 'Heart Health: Tips for a Healthy Heart',
    titleTh: 'วิธีดูแลสุขภาพหัวใจให้แข็งแรง',
    summary: 'Simple tips to keep your heart healthy throughout your life, including exercise and proper nutrition.',
    summaryTh: 'เคล็ดลับง่ายๆ ที่ช่วยให้หัวใจของคุณแข็งแรงและทำงานได้ดีตลอดชีวิต',
    content: `# Heart Health: Tips for a Healthy Heart

Your heart is one of the most important organs in your body. Taking care of it should be a top priority.

## Exercise Regularly

- Aim for at least 30 minutes of moderate exercise daily
- Walking, swimming, and cycling are excellent choices
- Consistency is more important than intensity

## Eat a Heart-Healthy Diet

- Include plenty of fruits and vegetables
- Choose whole grains over refined grains
- Limit saturated fats and sodium
- Include omega-3 fatty acids from fish

## Manage Stress

Chronic stress can affect your heart health. Practice:
- Deep breathing exercises
- Meditation
- Regular relaxation time

## Get Regular Check-ups

Visit your doctor regularly to monitor:
- Blood pressure
- Cholesterol levels
- Blood sugar`,
    contentTh: `# วิธีดูแลสุขภาพหัวใจให้แข็งแรง

หัวใจเป็นอวัยวะสำคัญที่สุดอย่างหนึ่งในร่างกาย การดูแลหัวใจควรเป็นสิ่งที่ให้ความสำคัญเป็นอันดับแรก

## ออกกำลังกายสม่ำเสมอ

- ตั้งเป้าออกกำลังกายอย่างน้อย 30 นาทีต่อวัน
- เดิน ว่ายน้ำ และปั่นจักรยาน เป็นทางเลือกที่ดี
- ความสม่ำเสมอสำคัญกว่าความเข้มข้น

## รับประทานอาหารที่ดีต่อหัวใจ

- รับประทานผักและผลไม้ให้มาก
- เลือกธัญพืชไม่ขัดสี
- จำกัดไขมันอิ่มตัวและโซเดียม
- รับประทานโอเมก้า-3 จากปลา

## จัดการความเครียด

ความเครียดเรื้อรังส่งผลต่อสุขภาพหัวใจ ควรฝึก:
- การหายใจลึก
- การทำสมาธิ
- มีเวลาพักผ่อน`,
    category: 'general-health',
    tags: ['heart', 'exercise', 'nutrition'],
    type: 'article',
    status: 'published',
    isFeatured: true,
    readTimeMinutes: 5,
    views: 1250,
    likes: 45,
    shares: 12,
    version: 1,
    history: [],
    comments: [],
    createdBy: 'doctor-001',
    createdByName: 'นพ.สมชาย ใจดี',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
  },
  {
    id: 'mc-002',
    title: 'Understanding Diabetes and Prevention',
    titleTh: 'เข้าใจโรคเบาหวานและวิธีป้องกัน',
    summary: 'Everything you need to know about diabetes: causes, symptoms, and prevention methods.',
    summaryTh: 'ทุกสิ่งที่คุณต้องรู้เกี่ยวกับโรคเบาหวาน สาเหตุ อาการ และวิธีป้องกัน',
    content: `# Understanding Diabetes

Diabetes is a chronic condition that affects how your body processes blood sugar (glucose).

## Types of Diabetes

### Type 1 Diabetes
- Autoimmune condition
- Usually develops in childhood
- Requires insulin therapy

### Type 2 Diabetes
- Most common type
- Often related to lifestyle
- Can be prevented or managed

## Warning Signs

- Increased thirst and urination
- Unexplained weight loss
- Fatigue and weakness
- Blurred vision

## Prevention Tips

1. Maintain a healthy weight
2. Exercise regularly
3. Eat a balanced diet
4. Get regular blood sugar tests`,
    contentTh: `# เข้าใจโรคเบาหวาน

โรคเบาหวานเป็นโรคเรื้อรังที่ส่งผลต่อการนำน้ำตาล (กลูโคส) ไปใช้ในร่างกาย

## ประเภทของโรคเบาหวาน

### เบาหวานชนิดที่ 1
- เป็นโรคภูมิคุ้มกันทำลายตนเอง
- มักเกิดในวัยเด็ก
- ต้องฉีดอินซูลิน

### เบาหวานชนิดที่ 2
- พบบ่อยที่สุด
- มักเกี่ยวข้องกับวิถีชีวิต
- สามารถป้องกันหรือควบคุมได้

## สัญญาณเตือน

- กระหายน้ำและปัสสาวะบ่อย
- น้ำหนักลดโดยไม่ทราบสาเหตุ
- อ่อนเพลีย
- ตามัว

## วิธีป้องกัน

1. รักษาน้ำหนักให้เหมาะสม
2. ออกกำลังกายสม่ำเสมอ
3. รับประทานอาหารที่สมดุล
4. ตรวจระดับน้ำตาลในเลือดเป็นประจำ`,
    category: 'chronic-disease',
    tags: ['diabetes', 'prevention', 'lifestyle'],
    type: 'article',
    status: 'published',
    isFeatured: true,
    readTimeMinutes: 8,
    views: 980,
    likes: 32,
    shares: 8,
    version: 1,
    history: [],
    comments: [],
    createdBy: 'doctor-002',
    createdByName: 'พญ.วิภา สุขใจ',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
  },
  {
    id: 'mc-003',
    title: 'Stress Management Techniques',
    titleTh: 'จัดการความเครียดอย่างไรให้ได้ผล',
    summary: 'Proven stress management techniques that really work.',
    summaryTh: 'เทคนิคการจัดการความเครียดที่ได้รับการพิสูจน์แล้วว่าได้ผลจริง',
    content: `# Effective Stress Management

Stress is a normal part of life, but chronic stress can harm your health.

## Breathing Techniques

### 4-7-8 Breathing
1. Inhale for 4 seconds
2. Hold for 7 seconds
3. Exhale for 8 seconds
4. Repeat 3-4 times

## Meditation

- Start with just 5 minutes daily
- Find a quiet space
- Focus on your breath
- Be patient with yourself

## Physical Activity

Exercise releases endorphins that naturally reduce stress:
- Walking
- Yoga
- Swimming
- Dancing

## Sleep Hygiene

Good sleep is essential for stress management:
- Maintain a regular sleep schedule
- Avoid screens before bed
- Create a comfortable sleep environment`,
    contentTh: `# จัดการความเครียดอย่างมีประสิทธิภาพ

ความเครียดเป็นส่วนหนึ่งของชีวิตปกติ แต่ความเครียดเรื้อรังสามารถทำร้ายสุขภาพได้

## เทคนิคการหายใจ

### การหายใจ 4-7-8
1. หายใจเข้า 4 วินาที
2. กลั้นหายใจ 7 วินาที
3. หายใจออก 8 วินาที
4. ทำซ้ำ 3-4 ครั้ง

## การทำสมาธิ

- เริ่มจาก 5 นาทีต่อวัน
- หาที่เงียบสงบ
- จดจ่อกับลมหายใจ
- อดทนกับตัวเอง

## การออกกำลังกาย

การออกกำลังกายปล่อยเอนดอร์ฟินที่ช่วยลดความเครียดตามธรรมชาติ:
- เดิน
- โยคะ
- ว่ายน้ำ
- เต้น

## สุขอนามัยการนอน

การนอนหลับที่ดีจำเป็นสำหรับการจัดการความเครียด:
- นอนและตื่นเวลาเดียวกันทุกวัน
- หลีกเลี่ยงจอก่อนนอน
- สร้างสภาพแวดล้อมการนอนที่สบาย`,
    category: 'mental-health',
    tags: ['stress', 'meditation', 'sleep'],
    type: 'article',
    status: 'published',
    isFeatured: true,
    readTimeMinutes: 6,
    views: 2100,
    likes: 78,
    shares: 25,
    version: 1,
    history: [],
    comments: [],
    createdBy: 'doctor-003',
    createdByName: 'นพ.ธนพล จิตสงบ',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
  },
  {
    id: 'mc-004',
    title: 'Foods That Boost Immunity',
    titleTh: 'อาหารที่ช่วยเสริมภูมิคุ้มกัน',
    summary: 'A list of foods that help strengthen your immune system.',
    summaryTh: 'รายการอาหารที่ช่วยเสริมสร้างระบบภูมิคุ้มกันให้แข็งแรง',
    content: `# Immune-Boosting Foods

Your diet plays a crucial role in maintaining a strong immune system.

## Top Immunity Foods

### Citrus Fruits
- Oranges, lemons, grapefruits
- Rich in Vitamin C
- Easy to add to your diet

### Garlic
- Natural antimicrobial properties
- Contains allicin
- Use fresh when possible

### Ginger
- Anti-inflammatory
- Helps with nausea
- Great in teas and cooking

### Yogurt
- Contains probiotics
- Look for live cultures
- Choose plain, unsweetened varieties

## Other Immune Boosters

- Green leafy vegetables
- Almonds and sunflower seeds
- Turmeric
- Green tea`,
    contentTh: `# อาหารเสริมภูมิคุ้มกัน

อาหารมีบทบาทสำคัญในการรักษาระบบภูมิคุ้มกันให้แข็งแรง

## อาหารเสริมภูมิคุ้มกันชั้นยอด

### ผลไม้ตระกูลส้ม
- ส้ม มะนาว เกรปฟรุต
- อุดมด้วยวิตามินซี
- เพิ่มในอาหารได้ง่าย

### กระเทียม
- มีคุณสมบัติต้านจุลินทรีย์ตามธรรมชาติ
- มีอัลลิซิน
- ใช้สดเมื่อเป็นไปได้

### ขิง
- ต้านการอักเสบ
- ช่วยเรื่องคลื่นไส้
- เหมาะสำหรับชาและการปรุงอาหาร

### โยเกิร์ต
- มีโปรไบโอติกส์
- เลือกที่มีจุลินทรีย์มีชีวิต
- เลือกรสธรรมชาติไม่เติมน้ำตาล

## อาหารเสริมภูมิคุ้มกันอื่นๆ

- ผักใบเขียว
- อัลมอนด์และเมล็ดทานตะวัน
- ขมิ้น
- ชาเขียว`,
    category: 'nutrition',
    tags: ['immunity', 'food', 'vitamins'],
    type: 'article',
    status: 'published',
    isFeatured: false,
    readTimeMinutes: 4,
    views: 1800,
    likes: 56,
    shares: 18,
    version: 1,
    history: [],
    comments: [],
    createdBy: 'doctor-004',
    createdByName: 'ดร.นิตยา อาหารดี',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
  },
  {
    id: 'mc-005',
    title: '10-Minute Exercise Routine',
    titleTh: 'ท่าบริหาร 10 นาที',
    summary: 'Simple daily exercises that take only 10 minutes to complete.',
    summaryTh: 'ท่าบริหารร่างกายง่ายๆ ที่ทำได้ทุกวัน ใช้เวลาเพียง 10 นาที',
    content: `# 10-Minute Daily Exercise Routine

No gym? No problem! This routine can be done anywhere.

## Warm-up (2 minutes)
- March in place
- Arm circles
- Gentle stretching

## Main Workout (6 minutes)

### Squats (1 minute)
- Feet shoulder-width apart
- Lower as if sitting in a chair
- Keep knees behind toes

### Push-ups (1 minute)
- Modified on knees if needed
- Keep body in straight line
- Go at your own pace

### Lunges (1 minute)
- Step forward with one leg
- Lower back knee toward floor
- Alternate legs

### Plank (1 minute)
- Hold position
- Keep core tight
- Breathe steadily

### Jumping Jacks (2 minutes)
- Full body movement
- Great for cardio
- Modify as needed

## Cool-down (2 minutes)
- Slow walking
- Deep stretches
- Deep breathing`,
    contentTh: `# ท่าบริหารประจำวัน 10 นาที

ไม่มียิม? ไม่เป็นปัญหา! ท่าบริหารนี้ทำได้ทุกที่

## อบอุ่นร่างกาย (2 นาที)
- เดินอยู่กับที่
- หมุนแขน
- ยืดเหยียดเบาๆ

## ออกกำลังกายหลัก (6 นาที)

### สควอท (1 นาที)
- เท้าห่างเท่าไหล่
- ลดตัวลงเหมือนนั่งเก้าอี้
- หัวเข่าอยู่หลังปลายเท้า

### วิดพื้น (1 นาที)
- ดัดแปลงโดยวางเข่าลงได้
- รักษาลำตัวเป็นเส้นตรง
- ทำตามจังหวะของตัวเอง

### ลันจ์ (1 นาที)
- ก้าวขาหนึ่งไปข้างหน้า
- ลดเข่าหลังลงใกล้พื้น
- สลับขา

### แพลงค์ (1 นาที)
- ค้างท่า
- เกร็งแกนกลางลำตัว
- หายใจสม่ำเสมอ

### กระโดดตบ (2 นาที)
- เคลื่อนไหวทั้งตัว
- ดีสำหรับคาร์ดิโอ
- ดัดแปลงตามความเหมาะสม

## คูลดาวน์ (2 นาที)
- เดินช้าๆ
- ยืดเหยียดลึก
- หายใจลึก`,
    category: 'exercise',
    tags: ['exercise', 'fitness', 'home-workout'],
    type: 'video',
    videoUrl: 'https://www.youtube.com/watch?v=example',
    status: 'published',
    isFeatured: true,
    readTimeMinutes: 10,
    views: 5600,
    likes: 234,
    shares: 89,
    version: 1,
    history: [],
    comments: [],
    createdBy: 'doctor-005',
    createdByName: 'Coach สมศักดิ์',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
  },
];

// ============================================================================
// SAMPLE CLINICAL RESOURCES
// ============================================================================

const sampleClinicalResources = [
  {
    id: 'cr-001',
    title: 'Hypertension Diagnosis Guidelines',
    titleTh: 'แนวทางการวินิจฉัยโรคความดันโลหิตสูง',
    summary: 'Clinical guidelines for diagnosing hypertension based on latest JNC recommendations.',
    summaryTh: 'แนวทางทางคลินิกสำหรับการวินิจฉัยโรคความดันโลหิตสูงตามคำแนะนำ JNC ล่าสุด',
    content: `# Hypertension Diagnosis Guidelines

## Blood Pressure Classification

| Category | Systolic (mmHg) | Diastolic (mmHg) |
|----------|----------------|------------------|
| Normal | <120 | <80 |
| Elevated | 120-129 | <80 |
| Stage 1 HTN | 130-139 | 80-89 |
| Stage 2 HTN | ≥140 | ≥90 |
| Hypertensive Crisis | >180 | >120 |

## Diagnostic Criteria

- Measure blood pressure at two or more visits
- Use proper technique with calibrated equipment
- Patient should be seated for 5 minutes before measurement
- Take average of 2-3 readings

## Initial Workup

1. Complete history and physical examination
2. Laboratory tests:
   - Complete blood count
   - Basic metabolic panel
   - Lipid profile
   - Urinalysis
3. ECG for baseline cardiac evaluation

## Secondary Causes to Consider

- Renal artery stenosis
- Primary aldosteronism
- Pheochromocytoma
- Thyroid disorders
- Sleep apnea`,
    category: 'diagnosis',
    tags: ['hypertension', 'cardiovascular', 'guidelines'],
    resourceType: 'guideline',
    evidenceLevel: 'A',
    specialty: 'Internal Medicine',
    lastReviewDate: new Date().toISOString(),
    status: 'published',
    requiresApproval: false,
    version: 1,
    history: [],
    comments: [],
    createdBy: 'doctor-001',
    createdByName: 'นพ.สมชาย ใจดี',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    approvedBy: 'admin-001',
    approvedAt: new Date().toISOString(),
  },
  {
    id: 'cr-002',
    title: 'Type 2 Diabetes Treatment Protocol',
    titleTh: 'แนวทางการรักษาโรคเบาหวานชนิดที่ 2',
    summary: 'Evidence-based treatment protocol for Type 2 Diabetes management.',
    summaryTh: 'แนวทางการรักษาโรคเบาหวานชนิดที่ 2 ตามหลักฐานทางวิทยาศาสตร์',
    content: `# Type 2 Diabetes Treatment Protocol

## Treatment Goals

- HbA1c < 7% (individualize based on patient factors)
- Fasting glucose: 80-130 mg/dL
- Post-prandial glucose: <180 mg/dL

## First-Line Therapy

**Metformin** (unless contraindicated)
- Start 500mg once daily with meals
- Titrate to 500-1000mg twice daily
- Maximum dose: 2550mg/day

## Second-Line Options

Consider adding based on patient characteristics:

### For patients with ASCVD
- SGLT2 inhibitors (empagliflozin, dapagliflozin)
- GLP-1 receptor agonists (semaglutide, liraglutide)

### For patients needing weight loss
- GLP-1 receptor agonists
- SGLT2 inhibitors

### For cost concerns
- Sulfonylureas
- Thiazolidinediones

## Monitoring

- HbA1c every 3 months until at goal, then every 6 months
- Annual lipid panel
- Annual kidney function (eGFR, urine albumin)
- Annual eye exam
- Regular foot examinations`,
    category: 'treatment',
    tags: ['diabetes', 'endocrinology', 'pharmacology'],
    resourceType: 'protocol',
    evidenceLevel: 'A',
    specialty: 'Endocrinology',
    lastReviewDate: new Date().toISOString(),
    status: 'published',
    requiresApproval: false,
    version: 1,
    history: [],
    comments: [],
    createdBy: 'doctor-002',
    createdByName: 'พญ.วิภา สุขใจ',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    approvedBy: 'admin-001',
    approvedAt: new Date().toISOString(),
  },
  {
    id: 'cr-003',
    title: 'Common Drug Interactions Reference',
    titleTh: 'คู่มืออันตรกิริยาระหว่างยาที่พบบ่อย',
    summary: 'Quick reference guide for commonly encountered drug interactions.',
    summaryTh: 'คู่มืออ้างอิงด่วนสำหรับอันตรกิริยาระหว่างยาที่พบบ่อย',
    content: `# Common Drug Interactions

## High-Risk Combinations

### Warfarin Interactions

| Drug | Effect | Management |
|------|--------|------------|
| NSAIDs | ↑ bleeding risk | Avoid; use acetaminophen |
| Antibiotics (fluoroquinolones) | ↑ INR | Monitor INR closely |
| Amiodarone | ↑ warfarin levels | Reduce warfarin dose 30-50% |

### ACE Inhibitors + Potassium

- ACE inhibitors/ARBs + Potassium supplements = hyperkalemia risk
- ACE inhibitors + Spironolactone = significant hyperkalemia
- Monitor potassium levels regularly

### QT Prolongation

Drugs that prolong QT interval should not be combined:
- Fluoroquinolones
- Macrolides (azithromycin, erythromycin)
- Antipsychotics
- Certain antiemetics (ondansetron)

## Moderate Interactions

### Statins and CYP3A4 Inhibitors

- Avoid grapefruit with simvastatin/lovastatin
- Clarithromycin increases statin levels
- Use rosuvastatin or pravastatin as alternatives

### Metformin and Contrast Media

- Hold metformin before contrast procedures
- Resume 48 hours after procedure if renal function stable`,
    category: 'pharmacology',
    tags: ['drug-interactions', 'pharmacology', 'safety'],
    resourceType: 'reference',
    evidenceLevel: 'B',
    specialty: 'Clinical Pharmacology',
    lastReviewDate: new Date().toISOString(),
    status: 'published',
    requiresApproval: false,
    version: 1,
    history: [],
    comments: [],
    createdBy: 'doctor-004',
    createdByName: 'ภญ.ปรีชา ยาดี',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    approvedBy: 'admin-001',
    approvedAt: new Date().toISOString(),
  },
  {
    id: 'cr-004',
    title: 'Emergency Chest Pain Protocol',
    titleTh: 'แนวทางการดูแลผู้ป่วยเจ็บหน้าอกฉุกเฉิน',
    summary: 'Step-by-step protocol for evaluating and managing chest pain in the emergency department.',
    summaryTh: 'แนวทางขั้นตอนการประเมินและดูแลผู้ป่วยเจ็บหน้าอกในห้องฉุกเฉิน',
    content: `# Emergency Chest Pain Protocol

## Initial Assessment (0-10 minutes)

### Immediate Actions
1. ABC assessment
2. Vital signs including pulse oximetry
3. 12-lead ECG within 10 minutes of arrival
4. IV access
5. Continuous cardiac monitoring

### MONA Protocol (if ACS suspected)
- Morphine (if pain severe and not contraindicated)
- Oxygen (if SpO2 <90%)
- Nitroglycerin (sublingual)
- Aspirin 325mg (chewed)

## Risk Stratification

### HEART Score
- History: 0-2 points
- ECG: 0-2 points
- Age: 0-2 points
- Risk factors: 0-2 points
- Troponin: 0-2 points

Score interpretation:
- 0-3: Low risk (1.7% event rate)
- 4-6: Intermediate risk
- 7-10: High risk (50%+ event rate)

## Disposition Guidelines

### Admit for:
- STEMI → Cath lab activation
- NSTEMI → Cardiology consult
- Unstable angina with high-risk features
- HEART score ≥7

### Consider discharge:
- HEART score 0-3
- Two negative troponins 3 hours apart
- Non-cardiac cause identified`,
    category: 'emergency',
    tags: ['chest-pain', 'acs', 'emergency'],
    resourceType: 'protocol',
    evidenceLevel: 'A',
    specialty: 'Emergency Medicine',
    lastReviewDate: new Date().toISOString(),
    status: 'published',
    requiresApproval: false,
    version: 1,
    history: [],
    comments: [],
    createdBy: 'doctor-003',
    createdByName: 'นพ.ฉุกเฉิน เร่งด่วน',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    approvedBy: 'admin-001',
    approvedAt: new Date().toISOString(),
  },
  {
    id: 'cr-005',
    title: 'Interesting Case: Unusual Presentation of Appendicitis',
    titleTh: 'กรณีศึกษา: การแสดงอาการที่ไม่ปกติของไส้ติ่งอักเสบ',
    summary: 'A case study of atypical appendicitis presentation in an elderly patient.',
    summaryTh: 'กรณีศึกษาการแสดงอาการที่ไม่ปกติของไส้ติ่งอักเสบในผู้ป่วยสูงอายุ',
    content: `# Case Study: Atypical Appendicitis

## Patient Presentation

**Demographics:** 72-year-old male

**Chief Complaint:** Generalized abdominal discomfort x 3 days

**History of Present Illness:**
- Mild, diffuse abdominal pain without classic migration pattern
- No nausea or vomiting initially
- Low-grade fever (37.8°C)
- Decreased appetite

## Physical Examination

- Mild tenderness in RLQ (less pronounced than expected)
- No rebound tenderness
- Positive Rovsing's sign
- Bowel sounds: diminished

## Diagnostic Workup

### Laboratory
- WBC: 11,500 (mildly elevated)
- CRP: 45 mg/L
- Basic metabolic panel: normal

### Imaging
- CT abdomen/pelvis: Dilated appendix (12mm) with periappendiceal fat stranding

## Discussion

### Why Atypical?
1. Elderly patients may have:
   - Blunted inflammatory response
   - Higher pain threshold
   - Delayed presentation

2. Classic McBurney's point tenderness absent in 30% of elderly

### Teaching Points
- Maintain high index of suspicion in elderly
- CT imaging has 94% sensitivity in this population
- Earlier surgical consultation recommended

## Outcome

- Underwent laparoscopic appendectomy
- Pathology confirmed acute gangrenous appendicitis
- Uncomplicated recovery`,
    category: 'case-studies',
    tags: ['appendicitis', 'elderly', 'surgery'],
    resourceType: 'case-study',
    evidenceLevel: 'D',
    specialty: 'General Surgery',
    lastReviewDate: new Date().toISOString(),
    status: 'pending',
    requiresApproval: true,
    version: 1,
    history: [],
    comments: [],
    createdBy: 'doctor-006',
    createdByName: 'นพ.ศัลยแพทย์ รักษาดี',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ============================================================================
// SAMPLE TAGS
// ============================================================================

const sampleMedicalTags = [
  { id: 'heart', name: 'Heart Health', nameTh: 'สุขภาพหัวใจ', createdBy: 'doctor-001', createdAt: new Date().toISOString(), usageCount: 3 },
  { id: 'exercise', name: 'Exercise', nameTh: 'การออกกำลังกาย', createdBy: 'doctor-005', createdAt: new Date().toISOString(), usageCount: 5 },
  { id: 'nutrition', name: 'Nutrition', nameTh: 'โภชนาการ', createdBy: 'doctor-004', createdAt: new Date().toISOString(), usageCount: 4 },
  { id: 'diabetes', name: 'Diabetes', nameTh: 'เบาหวาน', createdBy: 'doctor-002', createdAt: new Date().toISOString(), usageCount: 2 },
  { id: 'stress', name: 'Stress Management', nameTh: 'การจัดการความเครียด', createdBy: 'doctor-003', createdAt: new Date().toISOString(), usageCount: 2 },
  { id: 'prevention', name: 'Prevention', nameTh: 'การป้องกัน', createdBy: 'doctor-001', createdAt: new Date().toISOString(), usageCount: 3 },
  { id: 'lifestyle', name: 'Lifestyle', nameTh: 'วิถีชีวิต', createdBy: 'doctor-002', createdAt: new Date().toISOString(), usageCount: 2 },
  { id: 'immunity', name: 'Immunity', nameTh: 'ภูมิคุ้มกัน', createdBy: 'doctor-004', createdAt: new Date().toISOString(), usageCount: 1 },
];

const sampleClinicalTags = [
  { id: 'hypertension', name: 'Hypertension', nameTh: 'ความดันโลหิตสูง', createdBy: 'doctor-001', createdAt: new Date().toISOString(), usageCount: 2 },
  { id: 'cardiovascular', name: 'Cardiovascular', nameTh: 'หัวใจและหลอดเลือด', createdBy: 'doctor-001', createdAt: new Date().toISOString(), usageCount: 3 },
  { id: 'guidelines', name: 'Guidelines', nameTh: 'แนวทาง', createdBy: 'doctor-001', createdAt: new Date().toISOString(), usageCount: 2 },
  { id: 'pharmacology', name: 'Pharmacology', nameTh: 'เภสัชวิทยา', createdBy: 'doctor-004', createdAt: new Date().toISOString(), usageCount: 2 },
  { id: 'emergency', name: 'Emergency', nameTh: 'ฉุกเฉิน', createdBy: 'doctor-003', createdAt: new Date().toISOString(), usageCount: 1 },
  { id: 'drug-interactions', name: 'Drug Interactions', nameTh: 'อันตรกิริยาระหว่างยา', createdBy: 'doctor-004', createdAt: new Date().toISOString(), usageCount: 1 },
];

// ============================================================================
// API UPLOAD FUNCTIONS
// ============================================================================

async function uploadMedicalContent(articles) {
  let successCount = 0;
  for (const article of articles) {
    try {
      await makeRequest('POST', `${GCS_API_URL}/api/content/medical-content`, article);
      console.log(`  ✅ Created: ${article.title}`);
      successCount++;
    } catch (error) {
      console.error(`  ❌ Failed: ${article.title} - ${error.message}`);
    }
  }
  return successCount;
}

async function uploadClinicalResources(resources) {
  let successCount = 0;
  for (const resource of resources) {
    try {
      await makeRequest('POST', `${GCS_API_URL}/api/content/clinical`, resource);
      console.log(`  ✅ Created: ${resource.title}`);
      successCount++;
    } catch (error) {
      console.error(`  ❌ Failed: ${resource.title} - ${error.message}`);
    }
  }
  return successCount;
}

async function uploadMedicalTags(tags) {
  let successCount = 0;
  for (const tag of tags) {
    try {
      await makeRequest('POST', `${GCS_API_URL}/api/content/tags/medical`, tag);
      console.log(`  ✅ Created tag: ${tag.name}`);
      successCount++;
    } catch (error) {
      console.error(`  ❌ Failed tag: ${tag.name} - ${error.message}`);
    }
  }
  return successCount;
}

async function uploadClinicalTags(tags) {
  let successCount = 0;
  for (const tag of tags) {
    try {
      await makeRequest('POST', `${GCS_API_URL}/api/content/tags/clinical`, tag);
      console.log(`  ✅ Created tag: ${tag.name}`);
      successCount++;
    } catch (error) {
      console.error(`  ❌ Failed tag: ${tag.name} - ${error.message}`);
    }
  }
  return successCount;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main() {
  console.log('🚀 Generating Medical Content and Clinical Resources Demo Data\n');
  console.log(`📡 Connecting to GCS API Server: ${GCS_API_URL}\n`);
  
  // Check if server is running
  const serverHealthy = await checkServerHealth();
  if (!serverHealthy) {
    console.error('❌ GCS API Server is not running!');
    console.log('\nPlease start the server first:');
    console.log('  cd Isara-doctor-portal && node server/gcsApiServer.cjs');
    process.exit(1);
  }
  
  console.log('✅ GCS API Server is healthy\n');
  
  // Upload Medical Content
  console.log('📝 Uploading Medical Content articles...');
  const medicalCount = await uploadMedicalContent(sampleMedicalContent);
  
  // Upload Medical Content Tags
  console.log('\n🏷️  Uploading Medical Content tags...');
  const medicalTagCount = await uploadMedicalTags(sampleMedicalTags);
  
  // Upload Clinical Resources
  console.log('\n📚 Uploading Clinical Resources...');
  const clinicalCount = await uploadClinicalResources(sampleClinicalResources);
  
  // Upload Clinical Resources Tags
  console.log('\n🏷️  Uploading Clinical Resources tags...');
  const clinicalTagCount = await uploadClinicalTags(sampleClinicalTags);
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log(`   - ${medicalCount}/${sampleMedicalContent.length} Medical Content articles uploaded`);
  console.log(`   - ${medicalTagCount}/${sampleMedicalTags.length} Medical Content tags uploaded`);
  console.log(`   - ${clinicalCount}/${sampleClinicalResources.length} Clinical Resources uploaded`);
  console.log(`   - ${clinicalTagCount}/${sampleClinicalTags.length} Clinical Resources tags uploaded`);
  console.log('='.repeat(50));
  
  const pendingApprovals = sampleClinicalResources.filter(r => r.status === 'pending');
  if (pendingApprovals.length > 0) {
    console.log(`\n⏳ ${pendingApprovals.length} resource(s) are pending approval`);
  }
  
  console.log('\n🎉 Demo data generation complete!');
  console.log('\nTo test the content management system:');
  console.log('1. Doctor Portal: http://localhost:3010');
  console.log('2. Patient Portal: http://localhost:3005');
  console.log('3. Login as admin (admin.test@izara.com) to approve pending resources');
}

main().catch(console.error);