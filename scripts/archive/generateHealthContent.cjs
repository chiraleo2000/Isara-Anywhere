/**
 * Generate Health Content and Clinical Resources
 * 
 * Creates sample medical content and clinical resources for:
 * - doctor.test@izara.com (Doctor)
 * - admin.test@izara.com (Admin)
 * 
 * Content Types:
 * 1. Medical Content (3 topics) - Patient-facing health education
 * 2. Clinical Resources (3 topics) - Doctor-facing guidelines
 * 
 * Storage: GCS Bucket izara-meta-data
 */

const { Storage } = require('@google-cloud/storage');
const path = require('path');

// Initialize GCS
const storage = new Storage({
  keyFilename: path.join(__dirname, '..', 'Isara-doctor-portal', 'public', 'izara-telemedicine-dd0b6abe2bc8.json'),
  projectId: 'izara-telemedicine'
});

const BUCKET_NAME = 'izara-meta-data';
const bucket = storage.bucket(BUCKET_NAME);

// ============================================================================
// CONTENT AUTHORS
// ============================================================================

const AUTHORS = {
  doctor: {
    email: 'doctor.test@izara.com',
    name: 'Dr. Test Physician',
    nameTh: 'นพ. ทดสอบ แพทย์',
    role: 'doctor',
    specialty: 'Internal Medicine'
  },
  admin: {
    email: 'admin.test@izara.com',
    name: 'Admin Test',
    nameTh: 'แอดมิน ทดสอบ',
    role: 'admin'
  }
};

// ============================================================================
// MEDICAL CONTENT (Patient-Facing) - 3 Topics
// ============================================================================

const medicalContentArticles = [
  // Topic 1: Diabetes Management (by doctor.test)
  {
    id: 'mc-diabetes-001',
    title: 'Understanding and Managing Type 2 Diabetes',
    titleTh: 'ทำความเข้าใจและจัดการเบาหวานชนิดที่ 2',
    summary: 'A comprehensive guide to understanding Type 2 diabetes, its symptoms, management strategies, and lifestyle modifications for better health outcomes.',
    summaryTh: 'คู่มือครบถ้วนในการทำความเข้าใจเบาหวานชนิดที่ 2 อาการ กลยุทธ์การจัดการ และการปรับเปลี่ยนวิถีชีวิตเพื่อสุขภาพที่ดีขึ้น',
    content: `# Understanding Type 2 Diabetes

## What is Type 2 Diabetes?

Type 2 diabetes is a chronic condition that affects the way your body metabolizes sugar (glucose). With Type 2 diabetes, your body either resists the effects of insulin — a hormone that regulates the movement of sugar into your cells — or doesn't produce enough insulin to maintain normal glucose levels.

## Common Symptoms

- Increased thirst and frequent urination
- Increased hunger
- Unintended weight loss
- Fatigue
- Blurred vision
- Slow-healing sores
- Frequent infections
- Numbness or tingling in hands or feet

## Risk Factors

1. **Weight**: Being overweight is a primary risk factor
2. **Fat distribution**: Abdominal fat increases risk
3. **Inactivity**: Physical activity helps control weight
4. **Family history**: Risk increases with a parent or sibling with Type 2
5. **Age**: Risk increases after 45

## Management Strategies

### Diet Management

- **Carbohydrate counting**: Monitor carb intake
- **Glycemic index**: Choose low-GI foods
- **Portion control**: Use smaller plates
- **Regular meals**: Don't skip meals

### Exercise Recommendations

- 150 minutes moderate aerobic activity per week
- Strength training 2-3 times per week
- Include flexibility exercises
- Monitor blood sugar before and after exercise

### Medication

Consult your doctor about:
- Metformin
- Sulfonylureas
- GLP-1 receptor agonists
- Insulin therapy if needed

## Blood Sugar Targets

| Time | Target Range |
|------|--------------|
| Fasting | 80-130 mg/dL |
| 2 hours after meal | <180 mg/dL |
| HbA1c | <7% |

## When to See a Doctor

- Blood sugar consistently above target
- Symptoms of hypoglycemia
- Numbness or tingling that worsens
- Vision changes
- Wounds that don't heal`,
    contentTh: `# ทำความเข้าใจเบาหวานชนิดที่ 2

## เบาหวานชนิดที่ 2 คืออะไร?

เบาหวานชนิดที่ 2 เป็นโรคเรื้อรังที่ส่งผลต่อการเผาผลาญน้ำตาล (กลูโคส) ในร่างกาย ในโรคเบาหวานชนิดที่ 2 ร่างกายของคุณอาจดื้อต่อผลของอินซูลิน หรือผลิตอินซูลินไม่เพียงพอ

## อาการที่พบบ่อย

- กระหายน้ำมากขึ้นและปัสสาวะบ่อย
- หิวมากขึ้น
- น้ำหนักลดโดยไม่ตั้งใจ
- อ่อนเพลีย
- ตามัว
- แผลหายช้า

## การจัดการ

### การควบคุมอาหาร
- นับคาร์โบไฮเดรต
- เลือกอาหารดัชนีน้ำตาลต่ำ
- ควบคุมปริมาณ

### การออกกำลังกาย
- 150 นาทีต่อสัปดาห์
- รวมการฝึกความแข็งแรง`,
    category: 'chronic-disease',
    tags: ['diabetes', 'blood-sugar', 'lifestyle', 'chronic-disease', 'diet'],
    type: 'guide',
    thumbnail: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800',
    status: 'published',
    isFeatured: true,
    readTimeMinutes: 10,
    views: 1523,
    likes: 89,
    shares: 34,
    version: 1,
    history: [],
    comments: [],
    createdBy: AUTHORS.doctor.email,
    createdByName: AUTHORS.doctor.name,
    createdAt: new Date('2025-11-15T09:00:00Z').toISOString(),
    updatedBy: AUTHORS.doctor.email,
    updatedByName: AUTHORS.doctor.name,
    updatedAt: new Date('2025-12-01T10:30:00Z').toISOString(),
    approvedBy: AUTHORS.admin.email,
    approvedAt: new Date('2025-11-16T14:00:00Z').toISOString(),
    publishedAt: new Date('2025-11-16T14:00:00Z').toISOString()
  },

  // Topic 2: Mental Health & Stress (by admin.test)
  {
    id: 'mc-mental-001',
    title: 'Managing Stress and Anxiety in Daily Life',
    titleTh: 'การจัดการความเครียดและความวิตกกังวลในชีวิตประจำวัน',
    summary: 'Learn effective techniques to manage stress and anxiety, including mindfulness practices, breathing exercises, and lifestyle changes for better mental health.',
    summaryTh: 'เรียนรู้เทคนิคที่มีประสิทธิภาพในการจัดการความเครียดและความวิตกกังวล รวมถึงการฝึกสติ การหายใจ และการปรับเปลี่ยนวิถีชีวิต',
    content: `# Managing Stress and Anxiety

## Understanding Stress

Stress is your body's natural response to challenges. While some stress can be motivating, chronic stress can negatively impact your physical and mental health.

## Signs of Excessive Stress

### Physical Signs
- Headaches
- Muscle tension
- Sleep problems
- Fatigue
- Digestive issues

### Emotional Signs
- Irritability
- Anxiety
- Depression
- Difficulty concentrating
- Feeling overwhelmed

## Effective Stress Management Techniques

### 1. Deep Breathing Exercises

**4-7-8 Breathing Technique:**
1. Breathe in through your nose for 4 seconds
2. Hold your breath for 7 seconds
3. Exhale slowly through your mouth for 8 seconds
4. Repeat 3-4 times

### 2. Progressive Muscle Relaxation

- Start from your toes
- Tense each muscle group for 5 seconds
- Release and relax for 30 seconds
- Move up through your body

### 3. Mindfulness Meditation

- Find a quiet space
- Focus on your breath
- Notice thoughts without judgment
- Start with 5-10 minutes daily

### 4. Physical Activity

- Regular exercise releases endorphins
- Even a 10-minute walk helps
- Yoga combines movement and mindfulness
- Find activities you enjoy

## Lifestyle Changes for Better Mental Health

### Sleep Hygiene
- Maintain consistent sleep schedule
- Avoid screens before bed
- Create a relaxing bedtime routine
- Keep bedroom cool and dark

### Nutrition
- Limit caffeine and alcohol
- Eat regular, balanced meals
- Stay hydrated
- Include omega-3 rich foods

### Social Connection
- Maintain supportive relationships
- Don't isolate yourself
- Share your feelings with trusted people
- Consider support groups

## When to Seek Professional Help

- Symptoms persist for more than 2 weeks
- Difficulty functioning at work or home
- Thoughts of self-harm
- Using substances to cope
- Physical symptoms without medical cause`,
    contentTh: `# การจัดการความเครียดและความวิตกกังวล

## ทำความเข้าใจความเครียด

ความเครียดเป็นการตอบสนองตามธรรมชาติของร่างกายต่อความท้าทาย ความเครียดบางอย่างอาจเป็นแรงจูงใจ แต่ความเครียดเรื้อรังอาจส่งผลเสียต่อสุขภาพกายและจิต

## สัญญาณของความเครียดมากเกินไป

### อาการทางกาย
- ปวดหัว
- กล้ามเนื้อตึงเครียด
- นอนไม่หลับ
- เหนื่อยล้า

### อาการทางอารมณ์
- หงุดหงิด
- วิตกกังวล
- ซึมเศร้า
- จดจ่อยาก

## เทคนิคการจัดการความเครียด

### 1. การหายใจลึก
- หายใจเข้า 4 วินาที
- กลั้นหายใจ 7 วินาที
- หายใจออก 8 วินาที

### 2. การผ่อนคลายกล้ามเนื้อ
### 3. การทำสมาธิ
### 4. การออกกำลังกาย`,
    category: 'mental-health',
    tags: ['stress', 'anxiety', 'mental-health', 'mindfulness', 'wellness'],
    type: 'guide',
    thumbnail: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800',
    status: 'published',
    isFeatured: true,
    readTimeMinutes: 8,
    views: 2341,
    likes: 156,
    shares: 78,
    version: 1,
    history: [],
    comments: [],
    createdBy: AUTHORS.admin.email,
    createdByName: AUTHORS.admin.name,
    createdAt: new Date('2025-11-10T08:00:00Z').toISOString(),
    updatedBy: AUTHORS.admin.email,
    updatedByName: AUTHORS.admin.name,
    updatedAt: new Date('2025-11-20T09:00:00Z').toISOString(),
    approvedBy: AUTHORS.admin.email,
    approvedAt: new Date('2025-11-10T08:30:00Z').toISOString(),
    publishedAt: new Date('2025-11-10T08:30:00Z').toISOString()
  },

  // Topic 3: Heart Health & Prevention (by doctor.test)
  {
    id: 'mc-heart-001',
    title: 'Protecting Your Heart: Prevention and Early Detection',
    titleTh: 'ปกป้องหัวใจของคุณ: การป้องกันและการตรวจพบแต่เนิ่นๆ',
    summary: 'Essential information about cardiovascular health, risk factors, warning signs, and preventive measures to keep your heart healthy.',
    summaryTh: 'ข้อมูลสำคัญเกี่ยวกับสุขภาพหัวใจและหลอดเลือด ปัจจัยเสี่ยง สัญญาณเตือน และมาตรการป้องกันเพื่อรักษาสุขภาพหัวใจ',
    content: `# Protecting Your Heart

## Understanding Cardiovascular Disease

Cardiovascular disease (CVD) remains the leading cause of death globally. Understanding risk factors and taking preventive action can significantly reduce your risk.

## Risk Factors

### Modifiable Risk Factors
- High blood pressure
- High cholesterol
- Smoking
- Diabetes
- Obesity
- Physical inactivity
- Unhealthy diet
- Excessive alcohol

### Non-Modifiable Risk Factors
- Age (risk increases over 55)
- Family history
- Gender (men at higher risk earlier)
- Ethnicity

## Warning Signs of Heart Problems

### Heart Attack Symptoms
- Chest pain or discomfort
- Pain in arm, shoulder, neck, jaw
- Shortness of breath
- Cold sweat
- Nausea
- Lightheadedness

⚠️ **If you experience these symptoms, call emergency services immediately!**

### Signs to Watch For
- Unusual fatigue
- Swelling in legs or ankles
- Rapid or irregular heartbeat
- Difficulty breathing when lying down

## Prevention Strategies

### Heart-Healthy Diet

**DASH Diet Recommendations:**
- Fruits and vegetables: 4-5 servings each daily
- Whole grains: 6-8 servings daily
- Lean proteins: Fish 2x/week, poultry, legumes
- Low-fat dairy: 2-3 servings daily
- Limit: Sodium (<2,300mg), saturated fat, added sugars

### Exercise Guidelines

| Activity Type | Recommendation |
|---------------|----------------|
| Moderate aerobic | 150 min/week |
| Vigorous aerobic | 75 min/week |
| Strength training | 2 sessions/week |

### Blood Pressure Management

**Target Levels:**
- Normal: <120/80 mmHg
- Elevated: 120-129/<80 mmHg
- High: ≥130/80 mmHg

### Cholesterol Management

**Healthy Levels:**
- Total cholesterol: <200 mg/dL
- LDL (bad): <100 mg/dL
- HDL (good): ≥60 mg/dL
- Triglycerides: <150 mg/dL

## Regular Health Screenings

| Test | Frequency |
|------|-----------|
| Blood pressure | Every 1-2 years |
| Cholesterol | Every 4-6 years |
| Blood glucose | Every 3 years after 45 |
| BMI | Every visit |

## Lifestyle Modifications

1. **Quit smoking** - Risk drops within 1 year
2. **Manage stress** - Chronic stress harms heart
3. **Maintain healthy weight** - BMI 18.5-24.9
4. **Limit alcohol** - Max 1 drink/day women, 2 men
5. **Get adequate sleep** - 7-9 hours nightly`,
    contentTh: `# ปกป้องหัวใจของคุณ

## ทำความเข้าใจโรคหัวใจและหลอดเลือด

โรคหัวใจและหลอดเลือดยังคงเป็นสาเหตุการเสียชีวิตอันดับหนึ่งของโลก การทำความเข้าใจปัจจัยเสี่ยงและการดำเนินการป้องกันสามารถลดความเสี่ยงได้อย่างมาก

## ปัจจัยเสี่ยง

### ปัจจัยเสี่ยงที่แก้ไขได้
- ความดันโลหิตสูง
- คอเลสเตอรอลสูง
- การสูบบุหรี่
- เบาหวาน
- โรคอ้วน

## สัญญาณเตือนของปัญหาหัวใจ

### อาการหัวใจวาย
- เจ็บหน้าอก
- ปวดแขน ไหล่ คอ กราม
- หายใจลำบาก
- เหงื่อเย็น

⚠️ **หากมีอาการเหล่านี้ ให้โทรฉุกเฉินทันที!**

## กลยุทธ์การป้องกัน

### อาหารเพื่อสุขภาพหัวใจ
- ผักผลไม้ 4-5 ส่วนต่อวัน
- ธัญพืชเต็มเมล็ด
- โปรตีนไขมันต่ำ`,
    category: 'preventive-care',
    tags: ['heart-health', 'cardiovascular', 'prevention', 'blood-pressure', 'cholesterol'],
    type: 'guide',
    thumbnail: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800',
    status: 'published',
    isFeatured: false,
    readTimeMinutes: 12,
    views: 1876,
    likes: 112,
    shares: 45,
    version: 1,
    history: [],
    comments: [],
    createdBy: AUTHORS.doctor.email,
    createdByName: AUTHORS.doctor.name,
    createdAt: new Date('2025-11-20T10:00:00Z').toISOString(),
    updatedBy: AUTHORS.doctor.email,
    updatedByName: AUTHORS.doctor.name,
    updatedAt: new Date('2025-12-05T11:00:00Z').toISOString(),
    approvedBy: AUTHORS.admin.email,
    approvedAt: new Date('2025-11-21T09:00:00Z').toISOString(),
    publishedAt: new Date('2025-11-21T09:00:00Z').toISOString()
  }
];

// ============================================================================
// CLINICAL RESOURCES (Doctor-Facing) - 3 Topics
// ============================================================================

const clinicalResources = [
  // Topic 1: Hypertension Guidelines (by doctor.test)
  {
    id: 'cr-hypertension-001',
    title: 'Clinical Guidelines for Hypertension Management',
    titleTh: 'แนวทางเวชปฏิบัติการจัดการความดันโลหิตสูง',
    description: 'Evidence-based clinical guidelines for the diagnosis, treatment, and management of hypertension in adult patients.',
    descriptionTh: 'แนวทางเวชปฏิบัติตามหลักฐานทางวิทยาศาสตร์สำหรับการวินิจฉัย รักษา และจัดการความดันโลหิตสูงในผู้ป่วยผู้ใหญ่',
    content: `# Clinical Guidelines for Hypertension Management

## 1. Definition and Classification

### Blood Pressure Categories (ACC/AHA 2017)

| Category | Systolic (mmHg) | | Diastolic (mmHg) |
|----------|-----------------|---|------------------|
| Normal | <120 | and | <80 |
| Elevated | 120-129 | and | <80 |
| Stage 1 HTN | 130-139 | or | 80-89 |
| Stage 2 HTN | ≥140 | or | ≥90 |
| Hypertensive Crisis | >180 | and/or | >120 |

## 2. Diagnostic Evaluation

### Initial Assessment
1. **History**
   - Duration of elevated BP
   - Previous treatments and response
   - Risk factors (diabetes, dyslipidemia, smoking)
   - Family history of CVD
   - Symptoms of secondary causes

2. **Physical Examination**
   - Accurate BP measurement (proper cuff size, seated)
   - Fundoscopic exam
   - Cardiac exam (S4, murmurs)
   - Peripheral pulses
   - BMI calculation

3. **Laboratory Tests**
   - Fasting glucose or HbA1c
   - Complete lipid panel
   - Serum creatinine with eGFR
   - Serum potassium
   - Urinalysis
   - Optional: TSH, uric acid

## 3. Treatment Targets

| Patient Population | Target BP |
|--------------------|-----------|
| General adult | <130/80 mmHg |
| Diabetes | <130/80 mmHg |
| CKD | <130/80 mmHg |
| High CVD risk (≥10%) | <130/80 mmHg |
| Age ≥65 (ambulatory) | <130/80 mmHg |

## 4. Pharmacotherapy

### First-Line Agents

1. **ACE Inhibitors**
   - Lisinopril 10-40 mg daily
   - Enalapril 5-40 mg daily (divided)
   - Contraindications: Pregnancy, bilateral renal artery stenosis

2. **ARBs**
   - Losartan 50-100 mg daily
   - Valsartan 80-320 mg daily
   - Use if ACE-I intolerant (cough)

3. **Calcium Channel Blockers**
   - Amlodipine 5-10 mg daily
   - Preferred in African Americans

4. **Thiazide Diuretics**
   - Chlorthalidone 12.5-25 mg daily
   - Hydrochlorothiazide 25-50 mg daily

### Combination Therapy

- Preferred for Stage 2 HTN
- ACE-I/ARB + CCB
- ACE-I/ARB + Thiazide
- CCB + Thiazide

**Avoid:** ACE-I + ARB combination

## 5. Follow-up Schedule

| BP Status | Follow-up |
|-----------|-----------|
| At goal | Every 3-6 months |
| Not at goal | Monthly until controlled |
| Medication change | 2-4 weeks |

## 6. Resistant Hypertension

**Definition:** BP above goal despite ≥3 antihypertensives (including diuretic) at optimal doses

**Evaluation:**
- Confirm adherence
- Rule out white-coat effect (ABPM)
- Screen for secondary causes
- Consider aldosterone/renin ratio

**Management:**
- Add spironolactone 25-50 mg
- Consider beta-blocker or alpha-blocker
- Referral to hypertension specialist

## 7. Special Populations

### Pregnancy
- Avoid: ACE-I, ARB
- Use: Labetalol, nifedipine, methyldopa

### CKD with Proteinuria
- First-line: ACE-I or ARB
- Monitor potassium and creatinine

### Diabetes
- Target <130/80 mmHg
- ACE-I or ARB preferred

## References

1. Whelton PK, et al. 2017 ACC/AHA Hypertension Guideline
2. Williams B, et al. 2018 ESC/ESH Guidelines
3. SPRINT Research Group. NEJM 2015`,
    contentTh: `# แนวทางเวชปฏิบัติการจัดการความดันโลหิตสูง

## 1. นิยามและการจำแนก

### หมวดหมู่ความดันโลหิต (ACC/AHA 2017)

| หมวดหมู่ | ค่าบน (mmHg) | | ค่าล่าง (mmHg) |
|----------|--------------|---|----------------|
| ปกติ | <120 | และ | <80 |
| สูงเล็กน้อย | 120-129 | และ | <80 |
| ความดันสูงระดับ 1 | 130-139 | หรือ | 80-89 |
| ความดันสูงระดับ 2 | ≥140 | หรือ | ≥90 |

## 2. การประเมินเพื่อวินิจฉัย

### การประเมินเบื้องต้น
1. ประวัติ
2. การตรวจร่างกาย
3. การตรวจทางห้องปฏิบัติการ

## 3. เป้าหมายการรักษา

| กลุ่มผู้ป่วย | เป้าหมาย BP |
|-------------|-------------|
| ผู้ใหญ่ทั่วไป | <130/80 mmHg |
| เบาหวาน | <130/80 mmHg |

## 4. การรักษาด้วยยา

### ยาลำดับแรก
1. ACE Inhibitors
2. ARBs
3. Calcium Channel Blockers
4. Thiazide Diuretics`,
    category: 'treatment',
    tags: ['hypertension', 'guidelines', 'cardiovascular', 'pharmacotherapy'],
    specialty: 'Internal Medicine',
    resourceType: 'guideline',
    evidenceLevel: 'A',
    source: 'ACC/AHA 2017 Guideline',
    references: [
      'Whelton PK, et al. 2017 ACC/AHA Hypertension Guideline',
      'Williams B, et al. 2018 ESC/ESH Guidelines',
      'SPRINT Research Group. NEJM 2015'
    ],
    attachments: [],
    status: 'published',
    requiresAdminApproval: true,
    version: 1,
    history: [],
    comments: [
      {
        id: 'comment-001',
        authorId: AUTHORS.admin.email,
        authorName: AUTHORS.admin.name,
        authorRole: 'admin',
        content: 'Comprehensive guideline. Approved for publication.',
        createdAt: new Date('2025-11-18T10:00:00Z').toISOString(),
        isAdminFeedback: true
      }
    ],
    createdBy: AUTHORS.doctor.email,
    createdByName: AUTHORS.doctor.name,
    createdAt: new Date('2025-11-17T08:00:00Z').toISOString(),
    updatedBy: AUTHORS.doctor.email,
    updatedByName: AUTHORS.doctor.name,
    updatedAt: new Date('2025-11-17T16:00:00Z').toISOString(),
    submittedAt: new Date('2025-11-17T16:30:00Z').toISOString(),
    reviewedBy: AUTHORS.admin.email,
    reviewedByName: AUTHORS.admin.name,
    reviewedAt: new Date('2025-11-18T10:00:00Z').toISOString(),
    publishedAt: new Date('2025-11-18T10:00:00Z').toISOString()
  },

  // Topic 2: Diabetes Protocol (by admin.test)
  {
    id: 'cr-diabetes-001',
    title: 'Type 2 Diabetes Treatment Protocol',
    titleTh: 'แนวทางการรักษาเบาหวานชนิดที่ 2',
    description: 'Step-by-step treatment protocol for Type 2 diabetes mellitus including initial assessment, glycemic targets, and medication algorithms.',
    descriptionTh: 'โปรโตคอลการรักษาเบาหวานชนิดที่ 2 แบบทีละขั้นตอน รวมถึงการประเมินเบื้องต้น เป้าหมายน้ำตาล และอัลกอริทึมการใช้ยา',
    content: `# Type 2 Diabetes Treatment Protocol

## 1. Initial Assessment

### Required Evaluations
- Fasting plasma glucose (FPG)
- HbA1c
- Lipid panel
- Renal function (eGFR, urine albumin)
- Liver function tests
- Comprehensive metabolic panel
- Complete blood count
- Thyroid function (if indicated)

### Diagnostic Criteria

| Test | Diabetes | Prediabetes |
|------|----------|-------------|
| FPG | ≥126 mg/dL | 100-125 mg/dL |
| 2-hr OGTT | ≥200 mg/dL | 140-199 mg/dL |
| HbA1c | ≥6.5% | 5.7-6.4% |
| Random glucose | ≥200 mg/dL + symptoms | N/A |

## 2. Glycemic Targets

### General Population
- HbA1c: <7.0%
- Fasting glucose: 80-130 mg/dL
- Post-prandial glucose: <180 mg/dL

### Individualized Targets

| Patient Factors | HbA1c Target |
|-----------------|--------------|
| Short duration, long life expectancy, no CVD | <6.5% |
| Complex/intermediate | <7.0% |
| History of severe hypoglycemia, limited life expectancy | <8.0% |

## 3. Treatment Algorithm

### Step 1: Lifestyle Modification + Metformin
- Start metformin 500mg once daily
- Titrate to 2000mg daily (divided doses)
- Medical nutrition therapy
- Exercise: 150 min/week moderate intensity
- Weight loss goal: 5-10% if overweight

### Step 2: Add Second Agent (if HbA1c >7% after 3 months)

**Agent Selection Based on Comorbidities:**

| Comorbidity | Preferred Agent |
|-------------|-----------------|
| ASCVD | GLP-1 RA (liraglutide, semaglutide) |
| Heart failure | SGLT2i (empagliflozin, dapagliflozin) |
| CKD | SGLT2i or GLP-1 RA |
| Obesity | GLP-1 RA or SGLT2i |
| Cost concern | Sulfonylurea or TZD |

### Step 3: Triple Therapy or Insulin

**If HbA1c >7% on dual therapy:**
- Add third oral agent
- OR initiate basal insulin

**Basal Insulin Protocol:**
- Start NPH or long-acting insulin at bedtime
- Initial dose: 10 units or 0.1-0.2 units/kg
- Titrate by 2-4 units every 3-7 days
- Target fasting glucose: 80-130 mg/dL

### Step 4: Intensified Insulin Regimen

**If not at goal on basal + oral agents:**
- Add prandial insulin (rapid-acting)
- Start with largest meal
- Consider premixed insulin alternatives

## 4. Medication Reference

### Metformin
- **Dose:** 500-2000mg daily
- **Contraindications:** eGFR <30, acute illness
- **Side effects:** GI upset, B12 deficiency

### SGLT2 Inhibitors
- **Options:** Empagliflozin, dapagliflozin, canagliflozin
- **Benefits:** Weight loss, BP reduction, CV protection
- **Risks:** UTI, DKA, genital infections

### GLP-1 Receptor Agonists
- **Options:** Semaglutide, liraglutide, dulaglutide
- **Benefits:** Weight loss, CV protection
- **Risks:** GI side effects, pancreatitis (rare)

### Sulfonylureas
- **Options:** Glimepiride, glipizide
- **Risks:** Hypoglycemia, weight gain
- **Caution:** Elderly, renal impairment

## 5. Monitoring Schedule

| Parameter | Frequency |
|-----------|-----------|
| HbA1c | Every 3 months until stable, then every 6 months |
| Fasting glucose | Self-monitoring as indicated |
| Lipid panel | Annually |
| eGFR, urine albumin | Annually |
| Dilated eye exam | Annually |
| Foot exam | Every visit |

## 6. Hypoglycemia Management

### Classification
- **Level 1:** Glucose <70 mg/dL, patient alert
- **Level 2:** Glucose <54 mg/dL, impaired cognition
- **Level 3:** Severe, requires assistance

### Treatment
- Conscious: 15-20g fast-acting carbohydrate
- Recheck in 15 minutes
- Repeat if <70 mg/dL
- Unconscious: Glucagon 1mg IM/SC or IV dextrose

## References

1. ADA Standards of Care in Diabetes 2024
2. AACE Comprehensive Type 2 Diabetes Management Algorithm
3. KDIGO Guidelines for Diabetes in CKD`,
    contentTh: `# แนวทางการรักษาเบาหวานชนิดที่ 2

## 1. การประเมินเบื้องต้น

### การตรวจที่จำเป็น
- น้ำตาลในเลือดหลังอดอาหาร (FPG)
- HbA1c
- ไขมันในเลือด
- การทำงานของไต
- การทำงานของตับ

## 2. เป้าหมายระดับน้ำตาล

### ประชากรทั่วไป
- HbA1c: <7.0%
- น้ำตาลหลังอดอาหาร: 80-130 mg/dL
- น้ำตาลหลังอาหาร: <180 mg/dL

## 3. อัลกอริทึมการรักษา

### ขั้นที่ 1: ปรับพฤติกรรม + Metformin
- เริ่ม metformin 500mg วันละครั้ง
- ไทเทรตถึง 2000mg ต่อวัน

### ขั้นที่ 2: เพิ่มยาตัวที่สอง

### ขั้นที่ 3: ยาสามตัวหรืออินซูลิน`,
    category: 'treatment',
    tags: ['diabetes', 'treatment-protocol', 'glycemic-control', 'insulin'],
    specialty: 'Endocrinology',
    resourceType: 'protocol',
    evidenceLevel: 'A',
    source: 'ADA Standards of Care 2024',
    references: [
      'ADA Standards of Care in Diabetes 2024',
      'AACE Comprehensive Type 2 Diabetes Management Algorithm',
      'KDIGO Guidelines for Diabetes in CKD'
    ],
    attachments: [],
    status: 'published',
    requiresAdminApproval: true,
    version: 1,
    history: [],
    comments: [],
    createdBy: AUTHORS.admin.email,
    createdByName: AUTHORS.admin.name,
    createdAt: new Date('2025-11-22T09:00:00Z').toISOString(),
    updatedBy: AUTHORS.admin.email,
    updatedByName: AUTHORS.admin.name,
    updatedAt: new Date('2025-11-22T14:00:00Z').toISOString(),
    submittedAt: new Date('2025-11-22T14:00:00Z').toISOString(),
    reviewedBy: AUTHORS.admin.email,
    reviewedByName: AUTHORS.admin.name,
    reviewedAt: new Date('2025-11-22T15:00:00Z').toISOString(),
    publishedAt: new Date('2025-11-22T15:00:00Z').toISOString()
  },

  // Topic 3: Emergency Response Protocol (by doctor.test)
  {
    id: 'cr-emergency-001',
    title: 'Acute Chest Pain Emergency Protocol',
    titleTh: 'โปรโตคอลฉุกเฉินอาการเจ็บหน้าอกเฉียบพลัน',
    description: 'Standardized emergency protocol for evaluation and management of patients presenting with acute chest pain, including ACS workup and triage.',
    descriptionTh: 'โปรโตคอลฉุกเฉินมาตรฐานสำหรับการประเมินและจัดการผู้ป่วยที่มีอาการเจ็บหน้าอกเฉียบพลัน รวมถึงการตรวจ ACS และการคัดแยก',
    content: `# Acute Chest Pain Emergency Protocol

## 1. Initial Triage (0-10 minutes)

### Immediate Assessment
- **Airway:** Patent, protected
- **Breathing:** RR, SpO2, breath sounds
- **Circulation:** HR, BP, capillary refill
- **Disability:** Level of consciousness, GCS

### High-Risk Features - IMMEDIATE ATTENTION
- Ongoing chest pain
- Hemodynamic instability
- Signs of heart failure
- ST elevation on initial ECG
- Syncope with chest pain

## 2. Rapid Evaluation Protocol

### Within 10 minutes of arrival:
1. ☐ 12-lead ECG
2. ☐ IV access (large bore)
3. ☐ Continuous cardiac monitoring
4. ☐ Vital signs (including both arm BP)
5. ☐ Pulse oximetry
6. ☐ Brief targeted history

### STEMI Identification
**Time is muscle - Door-to-balloon goal: <90 minutes**

ST elevation criteria:
- ≥1mm in 2 contiguous leads
- Or ≥2mm in V1-V3
- New LBBB with symptoms

**If STEMI identified:**
→ Activate cath lab immediately
→ Aspirin 325mg (chew)
→ P2Y12 inhibitor loading
→ Heparin bolus
→ Notify interventional cardiology

## 3. NSTEMI/Unstable Angina Workup

### Laboratory Tests (STAT)
- Troponin I or T (high-sensitivity preferred)
- CBC
- BMP
- PT/INR, PTT
- BNP/NT-proBNP (if dyspnea present)
- D-dimer (if PE suspected)

### Troponin Interpretation

| Result | Interpretation | Action |
|--------|----------------|--------|
| <99th percentile | Negative | Consider other causes |
| >99th percentile, rising | Positive - AMI | Cardiology consult |
| >99th percentile, stable | Chronic elevation | Evaluate for other causes |

### Serial Troponins
- Initial at presentation
- Repeat at 3-6 hours
- Consider 1-hour rule-out protocol (hs-cTn)

## 4. Differential Diagnosis

### Life-Threatening Causes (Must Rule Out)
1. Acute Coronary Syndrome (ACS)
2. Aortic Dissection
3. Pulmonary Embolism
4. Tension Pneumothorax
5. Esophageal Rupture
6. Cardiac Tamponade

### Clinical Decision Rules

**HEART Score for ACS:**
| Factor | 0 | 1 | 2 |
|--------|---|---|---|
| History | Slightly suspicious | Moderately suspicious | Highly suspicious |
| ECG | Normal | Non-specific changes | Significant ST changes |
| Age | <45 | 45-64 | ≥65 |
| Risk factors | None | 1-2 | ≥3 or known CAD |
| Troponin | ≤ normal | 1-3x normal | >3x normal |

**Score Interpretation:**
- 0-3: Low risk, consider discharge with follow-up
- 4-6: Intermediate, admission for observation
- 7-10: High risk, admission, cardiology consult

## 5. Initial Treatment

### Universal Measures
- Supplemental O2 if SpO2 <90%
- IV access
- Continuous monitoring
- Aspirin 325mg (unless contraindicated)
- Nitroglycerin SL 0.4mg (if SBP >90, no RV infarct)
- Morphine 2-4mg IV (if ongoing pain after nitro)

### Antiplatelet/Anticoagulation

**For confirmed ACS:**
- Aspirin 325mg
- P2Y12 inhibitor:
  - Ticagrelor 180mg loading, OR
  - Clopidogrel 300-600mg loading
- Anticoagulation:
  - Heparin 60 U/kg bolus (max 4000 U)
  - OR Enoxaparin 1mg/kg SC

### Contraindications to Thrombolytics
- Active bleeding
- Prior intracranial hemorrhage
- Ischemic stroke <3 months
- Suspected aortic dissection
- Active peptic ulcer
- Recent major surgery

## 6. Disposition

### Admit to CCU/Telemetry
- STEMI (post-PCI)
- NSTEMI
- Unstable angina with ongoing symptoms
- High HEART score

### Observation Unit
- Intermediate HEART score
- Negative initial workup
- Stress testing planned

### Discharge Criteria
- HEART score 0-3
- Serial negative troponins
- No ECG changes
- Symptom-free
- Follow-up arranged within 72 hours

## 7. Documentation Requirements

☐ Time of symptom onset
☐ Time of first medical contact
☐ Time of ECG
☐ ECG interpretation
☐ Troponin results with times
☐ Risk stratification score
☐ Treatment administered
☐ Disposition decision
☐ Follow-up plan

## References

1. 2021 ACC/AHA Chest Pain Guidelines
2. ESC Guidelines for NSTE-ACS 2020
3. ACEP Clinical Policy: Chest Pain 2018`,
    contentTh: `# โปรโตคอลฉุกเฉินอาการเจ็บหน้าอกเฉียบพลัน

## 1. การคัดแยกเบื้องต้น (0-10 นาที)

### การประเมินทันที
- ทางเดินหายใจ
- การหายใจ
- การไหลเวียน
- ระดับความรู้สึกตัว

### ลักษณะความเสี่ยงสูง - ต้องดูแลทันที
- เจ็บหน้าอกต่อเนื่อง
- ความดันโลหิตไม่คงที่
- มีอาการหัวใจล้มเหลว
- ST elevation บน ECG

## 2. โปรโตคอลการประเมินเร็ว

### ภายใน 10 นาที:
1. ☐ ECG 12 ลีด
2. ☐ เปิดเส้นเลือด
3. ☐ ติดมอนิเตอร์หัวใจ
4. ☐ วัดสัญญาณชีพ
5. ☐ วัดออกซิเจน

## 3. การตรวจ NSTEMI/Unstable Angina

### การตรวจทางห้องปฏิบัติการ (STAT)
- Troponin
- CBC
- BMP
- PT/INR, PTT

## 4. การวินิจฉัยแยกโรค

### สาเหตุที่เป็นอันตรายถึงชีวิต
1. Acute Coronary Syndrome
2. Aortic Dissection
3. Pulmonary Embolism
4. Tension Pneumothorax`,
    category: 'emergency',
    tags: ['chest-pain', 'ACS', 'STEMI', 'emergency', 'protocol'],
    specialty: 'Emergency Medicine',
    resourceType: 'protocol',
    evidenceLevel: 'A',
    source: 'ACC/AHA Chest Pain Guidelines 2021',
    references: [
      '2021 ACC/AHA Chest Pain Guidelines',
      'ESC Guidelines for NSTE-ACS 2020',
      'ACEP Clinical Policy: Chest Pain 2018'
    ],
    attachments: [],
    status: 'published',
    requiresAdminApproval: true,
    version: 1,
    history: [],
    comments: [
      {
        id: 'comment-002',
        authorId: AUTHORS.admin.email,
        authorName: AUTHORS.admin.name,
        authorRole: 'admin',
        content: 'Excellent protocol with clear action steps. Approved.',
        createdAt: new Date('2025-11-26T11:00:00Z').toISOString(),
        isAdminFeedback: true
      }
    ],
    createdBy: AUTHORS.doctor.email,
    createdByName: AUTHORS.doctor.name,
    createdAt: new Date('2025-11-25T07:00:00Z').toISOString(),
    updatedBy: AUTHORS.doctor.email,
    updatedByName: AUTHORS.doctor.name,
    updatedAt: new Date('2025-11-25T18:00:00Z').toISOString(),
    submittedAt: new Date('2025-11-25T18:30:00Z').toISOString(),
    reviewedBy: AUTHORS.admin.email,
    reviewedByName: AUTHORS.admin.name,
    reviewedAt: new Date('2025-11-26T11:00:00Z').toISOString(),
    publishedAt: new Date('2025-11-26T11:00:00Z').toISOString()
  }
];

// ============================================================================
// UPLOAD FUNCTIONS
// ============================================================================

async function uploadMedicalContent() {
  console.log('\n📚 Uploading Medical Content Articles...\n');
  
  const filePath = 'medical-content/articles.json';
  const data = {
    articles: medicalContentArticles,
    lastUpdated: new Date().toISOString()
  };

  try {
    // First, try to get existing content
    let existingData = { articles: [] };
    try {
      const [existingContent] = await bucket.file(filePath).download();
      existingData = JSON.parse(existingContent.toString());
      console.log(`  📖 Found ${existingData.articles?.length || 0} existing articles`);
    } catch (e) {
      console.log('  📖 No existing articles found, creating new file');
    }

    // Merge: Keep existing, add/update new ones
    const existingIds = new Set(existingData.articles?.map(a => a.id) || []);
    const mergedArticles = [...(existingData.articles || [])];
    
    for (const article of medicalContentArticles) {
      const existingIndex = mergedArticles.findIndex(a => a.id === article.id);
      if (existingIndex >= 0) {
        mergedArticles[existingIndex] = article;
        console.log(`  ✏️  Updated: ${article.title}`);
      } else {
        mergedArticles.push(article);
        console.log(`  ✅ Added: ${article.title}`);
      }
    }

    const finalData = {
      articles: mergedArticles,
      lastUpdated: new Date().toISOString()
    };

    await bucket.file(filePath).save(JSON.stringify(finalData, null, 2), {
      contentType: 'application/json'
    });

    console.log(`\n  💾 Saved ${mergedArticles.length} total articles to ${filePath}`);
    return true;
  } catch (error) {
    console.error('  ❌ Error uploading medical content:', error.message);
    return false;
  }
}

async function uploadClinicalResources() {
  console.log('\n🏥 Uploading Clinical Resources...\n');
  
  const filePath = 'clinical-resources/resources.json';
  const data = {
    resources: clinicalResources,
    pendingApprovalIds: [],
    lastUpdated: new Date().toISOString()
  };

  try {
    // First, try to get existing content
    let existingData = { resources: [], pendingApprovalIds: [] };
    try {
      const [existingContent] = await bucket.file(filePath).download();
      existingData = JSON.parse(existingContent.toString());
      console.log(`  📖 Found ${existingData.resources?.length || 0} existing resources`);
    } catch (e) {
      console.log('  📖 No existing resources found, creating new file');
    }

    // Merge: Keep existing, add/update new ones
    const mergedResources = [...(existingData.resources || [])];
    
    for (const resource of clinicalResources) {
      const existingIndex = mergedResources.findIndex(r => r.id === resource.id);
      if (existingIndex >= 0) {
        mergedResources[existingIndex] = resource;
        console.log(`  ✏️  Updated: ${resource.title}`);
      } else {
        mergedResources.push(resource);
        console.log(`  ✅ Added: ${resource.title}`);
      }
    }

    const finalData = {
      resources: mergedResources,
      pendingApprovalIds: existingData.pendingApprovalIds || [],
      lastUpdated: new Date().toISOString()
    };

    await bucket.file(filePath).save(JSON.stringify(finalData, null, 2), {
      contentType: 'application/json'
    });

    console.log(`\n  💾 Saved ${mergedResources.length} total resources to ${filePath}`);
    return true;
  } catch (error) {
    console.error('  ❌ Error uploading clinical resources:', error.message);
    return false;
  }
}

async function uploadTags() {
  console.log('\n🏷️  Uploading Content Tags...\n');
  
  // Extract unique tags from content
  const allTags = new Set();
  
  medicalContentArticles.forEach(article => {
    article.tags.forEach(tag => allTags.add(tag));
  });
  
  clinicalResources.forEach(resource => {
    resource.tags.forEach(tag => allTags.add(tag));
  });

  const tagsData = {
    tags: Array.from(allTags).map((tag, index) => ({
      id: `tag-${tag}`,
      name: tag.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      nameTh: '', // Can be filled in later
      createdBy: AUTHORS.admin.email,
      createdAt: new Date().toISOString(),
      usageCount: 1
    })),
    lastUpdated: new Date().toISOString()
  };

  try {
    // Medical content tags
    await bucket.file('medical-content/tags.json').save(JSON.stringify(tagsData, null, 2), {
      contentType: 'application/json'
    });
    console.log(`  ✅ Saved ${tagsData.tags.length} tags to medical-content/tags.json`);

    // Clinical resources tags
    await bucket.file('clinical-resources/tags.json').save(JSON.stringify(tagsData, null, 2), {
      contentType: 'application/json'
    });
    console.log(`  ✅ Saved ${tagsData.tags.length} tags to clinical-resources/tags.json`);

    return true;
  } catch (error) {
    console.error('  ❌ Error uploading tags:', error.message);
    return false;
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('       IZARA TELEMEDICINE - HEALTH CONTENT GENERATOR');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\n📅 Date: ${new Date().toISOString()}`);
  console.log(`📦 Bucket: ${BUCKET_NAME}`);
  console.log('\n👤 Content Authors:');
  console.log(`   - Doctor: ${AUTHORS.doctor.email} (${AUTHORS.doctor.name})`);
  console.log(`   - Admin:  ${AUTHORS.admin.email} (${AUTHORS.admin.name})`);

  console.log('\n📝 Content to Generate:');
  console.log('   Medical Content (Patient-Facing): 3 articles');
  medicalContentArticles.forEach((article, i) => {
    console.log(`     ${i+1}. ${article.title}`);
    console.log(`        Category: ${article.category} | Author: ${article.createdByName}`);
  });
  
  console.log('\n   Clinical Resources (Doctor-Facing): 3 resources');
  clinicalResources.forEach((resource, i) => {
    console.log(`     ${i+1}. ${resource.title}`);
    console.log(`        Category: ${resource.category} | Author: ${resource.createdByName}`);
  });

  console.log('\n───────────────────────────────────────────────────────────────');
  console.log('                    UPLOADING CONTENT');
  console.log('───────────────────────────────────────────────────────────────');

  const results = {
    medicalContent: await uploadMedicalContent(),
    clinicalResources: await uploadClinicalResources(),
    tags: await uploadTags()
  };

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                       SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\n  Medical Content:    ${results.medicalContent ? '✅ Success' : '❌ Failed'}`);
  console.log(`  Clinical Resources: ${results.clinicalResources ? '✅ Success' : '❌ Failed'}`);
  console.log(`  Tags:               ${results.tags ? '✅ Success' : '❌ Failed'}`);

  if (results.medicalContent && results.clinicalResources && results.tags) {
    console.log('\n🎉 All content uploaded successfully!');
    console.log('\n📍 Access Points:');
    console.log('   - Patient Portal: คลังความรู้สุขภาพ (Health Studio > Knowledge tab)');
    console.log('   - Doctor Portal:  Medical Content page + Clinical Resources page');
  } else {
    console.log('\n⚠️  Some uploads failed. Check the logs above for details.');
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

// Run the script
main().catch(console.error);
