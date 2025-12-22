/**
 * Seed Medical Content Library
 * Creates shared health content accessible from both Patient and Doctor portals
 * Stored in GCS: izara-meta-data/medical-content/
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
// MEDICAL CONTENT DATA
// ============================================================================

const medicalContent = [
  // General Health - Admin Content
  {
    id: 'gen-001',
    title: 'Understanding Blood Pressure: A Complete Guide',
    titleTh: 'ทำความเข้าใจความดันโลหิต: คู่มือฉบับสมบูรณ์',
    summary: 'Learn everything about blood pressure, from normal ranges to management strategies.',
    summaryTh: 'เรียนรู้ทุกสิ่งเกี่ยวกับความดันโลหิต ตั้งแต่ค่าปกติไปจนถึงการจัดการ',
    content: `# Understanding Blood Pressure

## What is Blood Pressure?

Blood pressure is the force exerted by circulating blood against the walls of your arteries. It's measured in millimeters of mercury (mmHg) and recorded as two numbers:

- **Systolic pressure** (top number): Pressure when your heart beats
- **Diastolic pressure** (bottom number): Pressure when your heart rests between beats

## Normal Blood Pressure Ranges

- **Normal**: Less than 120/80 mmHg
- **Elevated**: 120-129/<80 mmHg
- **Stage 1 Hypertension**: 130-139/80-89 mmHg
- **Stage 2 Hypertension**: 140/90 mmHg or higher
- **Hypertensive Crisis**: Higher than 180/120 mmHg

## Why It Matters

High blood pressure (hypertension) is called the "silent killer" because it often has no symptoms but can lead to:
- Heart attack
- Stroke
- Kidney disease
- Vision loss

## Managing Blood Pressure

### Lifestyle Changes:
1. **Diet**: Reduce sodium, eat more fruits/vegetables
2. **Exercise**: 150 minutes moderate activity per week
3. **Weight**: Maintain healthy BMI
4. **Stress**: Practice relaxation techniques
5. **Alcohol**: Limit consumption
6. **Smoking**: Quit smoking

### When to See a Doctor:
- Blood pressure consistently above 130/80
- Sudden severe headache
- Chest pain
- Vision problems
- Difficulty breathing

## Home Monitoring

Regular home monitoring helps track your blood pressure trends. Always:
- Measure at the same time daily
- Sit quietly for 5 minutes before measuring
- Take multiple readings
- Keep a log to share with your doctor`,
    contentTh: `# ทำความเข้าใจความดันโลหิต

## ความดันโลหิตคืออะไร?

ความดันโลหิตคือแรงที่เลือดหมุนเวียนกดผนังหลอดเลือดแดง วัดเป็นมิลลิเมตรปรอท (mmHg) และบันทึกเป็นตัวเลขสองตัว

- **ค่าบน**: แรงดันตอนหัวใจบีบตัว
- **ค่าล่าง**: แรงดันตอนหัวใจคลายตัว

## ค่าความดันโลหิตปกติ

- **ปกติ**: ต่ำกว่า 120/80 mmHg
- **สูงเล็กน้อย**: 120-129/<80 mmHg
- **ความดันโลหิตสูง ระดับ 1**: 130-139/80-89 mmHg
- **ความดันโลหิตสูง ระดับ 2**: 140/90 mmHg ขึ้นไป`,
    category: 'general-health',
    type: 'guide',
    thumbnail: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800',
    tags: ['hypertension', 'cardiovascular', 'prevention', 'monitoring'],
    isFeatured: true,
    status: 'published',
    viewCount: 1247,
    readTime: 8,
    createdBy: 'admin.test@izara.com',
    authorName: 'Admin Team',
    authorRole: 'admin',
    createdAt: new Date('2024-01-15').toISOString(),
    updatedAt: new Date().toISOString()
  },
  
  // Nutrition - Doctor Content
  {
    id: 'nut-001',
    title: 'Heart-Healthy Diet: Complete Nutrition Plan',
    titleTh: 'อาหารเพื่อหัวใจแข็งแรง: แผนโภชนาการครบถ้วน',
    summary: 'A comprehensive guide to eating for heart health, including meal plans and recipes.',
    summaryTh: 'คู่มือครบถ้วนเกี่ยวกับการทานอาหารเพื่อหัวใจแข็งแรง รวมแผนอาหารและสูตรอาหาร',
    content: `# Heart-Healthy Diet Guide

## The Mediterranean Diet Approach

Research shows the Mediterranean diet is one of the best for heart health.

### Key Components:

#### Foods to Include Daily:
- **Fruits & Vegetables**: 5-9 servings
- **Whole Grains**: Brown rice, quinoa, oats
- **Healthy Fats**: Olive oil, avocados, nuts
- **Lean Proteins**: Fish (2-3x/week), legumes
- **Low-fat Dairy**: Greek yogurt, cheese (moderate)

#### Foods to Limit:
- Red meat (once/week max)
- Processed foods
- Sugary drinks
- Trans fats
- Excessive salt

## Sample Daily Meal Plan

### Breakfast:
- Oatmeal with berries and walnuts
- Green tea

### Lunch:
- Grilled salmon salad
- Quinoa
- Olive oil dressing

### Dinner:
- Baked chicken breast
- Roasted vegetables
- Brown rice

### Snacks:
- Handful of almonds
- Apple with almond butter
- Carrot sticks with hummus

## Practical Tips:

1. **Read Labels**: Watch for hidden sodium and sugar
2. **Cook at Home**: Control ingredients
3. **Portion Control**: Use smaller plates
4. **Hydration**: Drink 8 glasses water daily
5. **Meal Prep**: Prepare healthy meals in advance

## Foods That Lower Cholesterol:

- Oats and barley
- Beans and lentils
- Fatty fish (salmon, mackerel)
- Nuts (almonds, walnuts)
- Avocados
- Olive oil

## Supplements to Consider:

Consult your doctor about:
- Omega-3 fatty acids
- Coenzyme Q10
- Plant sterols
- Fiber supplements`,
    contentTh: `# คู่มืออาหารเพื่อหัวใจ

## แนวทางอาหารแบบเมดิเตอร์เรเนียน

งานวิจัยแสดงว่าอาหารแบบเมดิเตอร์เรเนียนดีที่สุดสำหรับหัวใจ`,
    category: 'nutrition',
    type: 'guide',
    thumbnail: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800',
    tags: ['nutrition', 'heart-health', 'diet', 'meal-plan'],
    isFeatured: true,
    status: 'published',
    viewCount: 892,
    readTime: 12,
    createdBy: 'dr.smith@izara.com',
    authorName: 'Dr. Sarah Smith',
    authorRole: 'doctor',
    specialty: 'Cardiology',
    createdAt: new Date('2024-02-10').toISOString(),
    updatedAt: new Date().toISOString()
  },

  // Exercise - Doctor Content
  {
    id: 'ex-001',
    title: 'Exercise for Beginners: Safe Start Guide',
    titleTh: 'การออกกำลังกายสำหรับมือใหม่: คู่มือเริ่มต้นอย่างปลอดภัย',
    summary: 'Start your fitness journey safely with this beginner-friendly exercise program.',
    summaryTh: 'เริ่มต้นการออกกำลังกายอย่างปลอดภัยด้วยโปรแกรมสำหรับมือใหม่',
    content: `# Exercise for Beginners

## Getting Started Safely

Before starting any exercise program:
1. Consult your doctor
2. Start slowly and progress gradually
3. Listen to your body
4. Stay hydrated
5. Warm up and cool down

## Week 1-4: Foundation Building

### Monday, Wednesday, Friday (Cardio):
- 10-15 minutes walking
- Gradually increase pace
- Target: Able to talk while walking

### Tuesday, Thursday (Strength):
- Bodyweight exercises:
  - 10 squats
  - 10 push-ups (wall or knee)
  - 10 lunges (each leg)
  - 30-second plank
- 2 sets of each

### Saturday (Flexibility):
- 20 minutes gentle stretching
- Focus on major muscle groups
- Hold each stretch 30 seconds

### Sunday: Rest

## Week 5-8: Progress

Increase intensity:
- Walking: 20-30 minutes
- Add resistance bands
- Increase reps to 15
- Add 3rd set

## Important Safety Tips:

### Stop exercising if you experience:
- Chest pain or pressure
- Severe shortness of breath
- Dizziness or lightheadedness
- Nausea
- Pain in jaw, neck, or arm

### Proper Form:
- Keep back straight
- Breathe normally (don't hold breath)
- Move through full range of motion
- Control movements (no jerking)

## Tracking Progress:

Keep a log of:
- Exercise type and duration
- How you felt
- Any challenges
- Improvements noticed

## Staying Motivated:

1. Set realistic goals
2. Find an exercise buddy
3. Vary your routine
4. Celebrate small wins
5. Make it enjoyable

## Equipment for Home:

Minimal investment needed:
- Comfortable shoes
- Exercise mat
- Resistance bands
- Water bottle
- Towel

## Common Beginner Mistakes:

- Doing too much too soon
- Skipping warm-up
- Poor form
- Not resting enough
- Comparing to others

Remember: Consistency beats intensity for beginners!`,
    contentTh: `# การออกกำลังกายสำหรับมือใหม่

## เริ่มต้นอย่างปลอดภัย

ก่อนเริ่มโปรแกรมออกกำลังกาย:
1. ปรึกษาแพทย์
2. เริ่มช้าๆ และค่อยๆ เพิ่มระดับ
3. ฟังร่างกายของคุณ`,
    category: 'exercise',
    type: 'guide',
    thumbnail: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800',
    tags: ['exercise', 'fitness', 'beginners', 'workout-plan'],
    isFeatured: true,
    status: 'published',
    viewCount: 1054,
    readTime: 10,
    createdBy: 'dr.johnson@izara.com',
    authorName: 'Dr. Michael Johnson',
    authorRole: 'doctor',
    specialty: 'Sports Medicine',
    createdAt: new Date('2024-02-20').toISOString(),
    updatedAt: new Date().toISOString()
  },

  // Mental Health - Admin Content
  {
    id: 'mh-001',
    title: 'Managing Stress and Anxiety: Practical Techniques',
    titleTh: 'การจัดการความเครียดและความวิตกกังวล: เทคนิคที่ใช้ได้จริง',
    summary: 'Evidence-based strategies to reduce stress and manage anxiety in daily life.',
    summaryTh: 'กลยุทธ์ที่มีหลักฐานรองรับในการลดความเครียดและจัดการความวิตกกังวลในชีวิตประจำวัน',
    content: `# Managing Stress and Anxiety

## Understanding Stress Response

When stressed, your body activates "fight or flight" response:
- Increased heart rate
- Rapid breathing
- Muscle tension
- Racing thoughts

## Immediate Relief Techniques

### 1. Deep Breathing (4-7-8 Method):
- Breathe in for 4 counts
- Hold for 7 counts
- Exhale for 8 counts
- Repeat 4 times

### 2. Progressive Muscle Relaxation:
- Tense each muscle group 5 seconds
- Release and relax
- Start from toes, work up to head

### 3. Grounding Exercise (5-4-3-2-1):
- 5 things you can see
- 4 things you can touch
- 3 things you can hear
- 2 things you can smell
- 1 thing you can taste

## Long-term Strategies

### Daily Practices:
1. **Regular Exercise**: 30 minutes most days
2. **Adequate Sleep**: 7-9 hours nightly
3. **Healthy Diet**: Reduce caffeine/sugar
4. **Social Connection**: Talk to friends/family
5. **Mindfulness**: 10 minutes meditation

### Time Management:
- Prioritize tasks
- Break large projects into steps
- Learn to say "no"
- Schedule breaks
- Avoid multitasking

### Cognitive Techniques:
- Challenge negative thoughts
- Practice gratitude
- Focus on what you can control
- Reframe situations positively

## When to Seek Professional Help

See a doctor or therapist if:
- Symptoms persist >2 weeks
- Interfering with daily life
- Physical symptoms (chest pain, digestive issues)
- Thoughts of self-harm
- Panic attacks

## Apps and Resources:

- Headspace (meditation)
- Calm (sleep and relaxation)
- BetterHelp (online therapy)
- Crisis hotlines available 24/7

## Building Resilience:

1. Develop support network
2. Maintain positive outlook
3. Accept change as part of life
4. Take decisive action
5. Look for opportunities for self-discovery`,
    contentTh: `# การจัดการความเครียดและความวิตกกังวล

## เข้าใจการตอบสนองต่อความเครียด

เมื่อเครียด ร่างกายจะเปิดใช้งานการตอบสนอง "สู้หรือหนี"`,
    category: 'mental-health',
    type: 'article',
    thumbnail: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800',
    tags: ['mental-health', 'stress', 'anxiety', 'mindfulness'],
    isFeatured: true,
    status: 'published',
    viewCount: 2103,
    readTime: 9,
    createdBy: 'admin.test@izara.com',
    authorName: 'Admin Team',
    authorRole: 'admin',
    createdAt: new Date('2024-03-01').toISOString(),
    updatedAt: new Date().toISOString()
  },

  // Diabetes Management - Doctor Content
  {
    id: 'cd-001',
    title: 'Living Well with Diabetes: Complete Management Guide',
    titleTh: 'ใช้ชีวิตอย่างมีคุณภาพกับโรคเบาหวาน: คู่มือการจัดการแบบครบวงจร',
    summary: 'Comprehensive diabetes management covering diet, exercise, medication, and monitoring.',
    summaryTh: 'การจัดการโรคเบาหวานแบบครบวงจร ครอบคลุมอาหาร การออกกำลังกาย ยา และการติดตามผล',
    content: `# Living Well with Diabetes

## Understanding Diabetes

Diabetes affects how your body uses glucose (sugar). Types:
- **Type 1**: Body doesn't produce insulin
- **Type 2**: Body doesn't use insulin properly
- **Gestational**: Occurs during pregnancy

## Blood Sugar Management

### Target Ranges:
- **Before meals**: 80-130 mg/dL
- **2 hours after meals**: Less than 180 mg/dL
- **HbA1c**: Less than 7%

### When to Check:
- Before meals
- 2 hours after meals
- Before bed
- Before and after exercise
- When feeling symptoms

## Diabetic Diet

### Carbohydrate Counting:
- Total carbs per meal: 45-60g
- Choose complex carbs
- Pair with protein/healthy fat

### Best Foods:
- Non-starchy vegetables
- Lean proteins
- Whole grains
- Healthy fats (nuts, avocado)
- Low-fat dairy

### Foods to Limit:
- Sugary drinks
- White bread/pasta
- Fried foods
- High-fat meats
- Sweets and desserts

## Exercise Guidelines

### Benefits:
- Lowers blood sugar
- Improves insulin sensitivity
- Helps weight management
- Reduces cardiovascular risk

### Recommendations:
- 150 minutes moderate activity/week
- Strength training 2x/week
- Check blood sugar before/after
- Carry fast-acting carbs

## Medication Management

### Types of Diabetes Medications:
1. **Metformin**: First-line for Type 2
2. **Insulin**: Various types and timing
3. **GLP-1 agonists**: Injectable, weekly
4. **SGLT2 inhibitors**: Pills, daily
5. **DPP-4 inhibitors**: Pills, daily

Always take as prescribed!

## Preventing Complications

### Regular Screenings:
- **Eyes**: Yearly eye exam
- **Feet**: Daily inspection, yearly exam
- **Kidneys**: Annual urine test
- **Heart**: Regular BP and cholesterol checks

### Foot Care:
- Inspect daily
- Wash and dry thoroughly
- Moisturize (not between toes)
- Wear proper footwear
- Report any issues immediately

## Hypoglycemia (Low Blood Sugar)

### Symptoms:
- Shakiness
- Sweating
- Confusion
- Dizziness
- Hunger

### Treatment (Rule of 15):
1. Eat 15g fast-acting carbs
2. Wait 15 minutes
3. Recheck blood sugar
4. Repeat if still low

### Examples of 15g carbs:
- 4 glucose tablets
- 1/2 cup juice
- 1 tablespoon honey
- 1 cup milk

## Sick Day Management

When ill:
- Check blood sugar more often
- Stay hydrated
- Take medications as usual
- Have sick day plan ready
- Know when to call doctor

## Emergency Situations

Call doctor immediately if:
- Blood sugar >300 mg/dL
- Persistent vomiting
- Fruity breath odor
- Difficulty breathing
- Severe confusion

Remember: Diabetes is manageable with proper care!`,
    contentTh: `# ใช้ชีวิตกับโรคเบาหวาน

## ทำความเข้าใจโรคเบาหวาน

โรคเบาหวานส่งผลต่อวิธีที่ร่างกายใช้กลูโคส (น้ำตาล)`,
    category: 'chronic-disease',
    type: 'guide',
    thumbnail: 'https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=800',
    tags: ['diabetes', 'chronic-disease', 'blood-sugar', 'management'],
    isFeatured: true,
    status: 'published',
    viewCount: 1876,
    readTime: 15,
    createdBy: 'dr.patel@izara.com',
    authorName: 'Dr. Priya Patel',
    authorRole: 'doctor',
    specialty: 'Endocrinology',
    createdAt: new Date('2024-03-10').toISOString(),
    updatedAt: new Date().toISOString()
  },

  // Preventive Care - Doctor Content
  {
    id: 'pc-001',
    title: 'Essential Health Screenings by Age',
    titleTh: 'การตรวจสุขภาพที่จำเป็นตามช่วงอายุ',
    summary: 'Know which health screenings you need and when to get them.',
    summaryTh: 'รู้ว่าคุณต้องตรวจสุขภาพอะไรและเมื่อไหร่',
    content: `# Essential Health Screenings

## Ages 18-39

### Annual:
- Blood pressure
- BMI/Weight
- Skin cancer check

### Every 3-5 years:
- Cholesterol (men 35+, women 45+)
- Diabetes screening (if risk factors)

### Women:
- Pap smear (21-65): Every 3 years
- HPV test (30+): Every 5 years
- Clinical breast exam: Every 1-3 years

### Men:
- Testicular exam: Monthly self-check

## Ages 40-64

### Annual:
- Blood pressure
- Diabetes screening
- Weight/BMI

### Every 1-2 years:
- Cholesterol
- Eye exam

### Women (additional):
- Mammogram: Yearly (40+)
- Bone density (65+)

### Men (additional):
- PSA test: Discuss with doctor (50+)

## Ages 65+

### Annual:
- Blood pressure
- Diabetes screening
- Cholesterol
- Eye exam
- Hearing test
- Fall risk assessment

### Every 1-2 years:
- Bone density scan
- Skin cancer screening

### Every 10 years:
- Colonoscopy (until age 75)
- Shingles vaccine (50+)
- Pneumonia vaccine (65+)

## Cardiovascular Screenings

### Blood Pressure:
- Target: <120/80 mmHg
- Check yearly if normal
- More often if elevated

### Cholesterol Panel:
- Total cholesterol: <200 mg/dL
- LDL: <100 mg/dL
- HDL: >40 mg/dL (men), >50 (women)
- Triglycerides: <150 mg/dL

## Cancer Screenings

### Colorectal (45-75):
- Colonoscopy every 10 years
- OR Stool test annually
- OR CT colonography every 5 years

### Lung (55-80, smokers):
- Annual low-dose CT scan
- If smoking history 20+ pack-years

### Breast (Women):
- Mammogram yearly (40+)
- Clinical exam annually
- Monthly self-exam

### Cervical (Women 21-65):
- Pap every 3 years (21-29)
- Pap + HPV every 5 years (30+)

### Prostate (Men 50+):
- Discuss PSA test with doctor
- Consider risks/benefits
- Earlier if family history

## Additional Important Screenings

### Diabetes:
- Fasting glucose or HbA1c
- If BMI >25 or risk factors
- Every 3 years if normal

### Osteoporosis:
- Bone density scan
- Women 65+
- Earlier if risk factors

### Vision:
- Comprehensive eye exam
- Every 1-2 years
- Glaucoma screening

### Hearing:
- Baseline at 18
- Every decade until 50
- Every 3 years after 50

### Dental:
- Twice yearly cleaning/exam
- Annual X-rays

## Immunizations

### Adults All Ages:
- Flu vaccine: Annual
- Td/Tdap: Every 10 years
- COVID-19: As recommended

### Adults 50+:
- Shingles: 2 doses

### Adults 65+:
- Pneumococcal: 1-2 doses

## Risk-Based Screenings

Discuss with doctor if you have:
- Family history of disease
- Previous abnormal results
- Lifestyle risk factors
- Chronic conditions

## Preparing for Screenings:

1. **Know your history**: Family medical history
2. **List medications**: Including supplements
3. **Fast if required**: Usually 8-12 hours
4. **Ask questions**: Understand results
5. **Follow up**: Don't ignore abnormal results

Remember: Prevention is easier than treatment!`,
    contentTh: `# การตรวจสุขภาพที่จำเป็น

## อายุ 18-39 ปี

### ตรวจทุกปี:
- ความดันโลหิต
- BMI/น้ำหนัก
- ตรวจมะเร็งผิวหนัง`,
    category: 'preventive-care',
    type: 'guide',
    thumbnail: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800',
    tags: ['prevention', 'screening', 'check-up', 'wellness'],
    isFeatured: true,
    status: 'published',
    viewCount: 1432,
    readTime: 14,
    createdBy: 'dr.chen@izara.com',
    authorName: 'Dr. Lisa Chen',
    authorRole: 'doctor',
    specialty: 'Family Medicine',
    createdAt: new Date('2024-03-20').toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// ============================================================================
// UPLOAD FUNCTIONS
// ============================================================================

async function uploadContent() {
  try {
    console.log('🏥 Starting Medical Content Library Seed...\n');

    const now = new Date().toISOString();
    const contentData = {
      articles: medicalContent,
      lastUpdated: now,
      totalCount: medicalContent.length
    };

    // Upload content index (for reference)
    const indexFile = bucket.file('medical-content/content-index.json');
    await indexFile.save(JSON.stringify(medicalContent, null, 2), {
      contentType: 'application/json',
      metadata: {
        cacheControl: 'public, max-age=300'
      }
    });
    console.log('✅ Uploaded content index');

    // Upload for doctor portal API: medical-content/articles.json
    const doctorFile = bucket.file('medical-content/articles.json');
    await doctorFile.save(JSON.stringify(contentData, null, 2), {
      contentType: 'application/json',
      metadata: {
        cacheControl: 'public, max-age=300'
      }
    });
    console.log('✅ Uploaded doctor portal content (articles.json)');

    // Upload for patient portal API: medical-content.json (root level)
    const patientFile = bucket.file('medical-content.json');
    await patientFile.save(JSON.stringify(contentData, null, 2), {
      contentType: 'application/json',
      metadata: {
        cacheControl: 'public, max-age=300'
      }
    });
    console.log('✅ Uploaded patient portal content (medical-content.json)');

    // Upload individual articles
    for (const article of medicalContent) {
      const articleFile = bucket.file(`medical-content/articles/${article.id}.json`);
      await articleFile.save(JSON.stringify(article, null, 2), {
        contentType: 'application/json'
      });
      console.log(`✅ Uploaded article: ${article.title}`);
    }

    // Create categories index
    const categories = [
      { id: 'general-health', name: 'General Health', nameTh: 'สุขภาพทั่วไป', icon: '🏥', count: 1 },
      { id: 'nutrition', name: 'Nutrition', nameTh: 'โภชนาการ', icon: '🥗', count: 1 },
      { id: 'exercise', name: 'Exercise', nameTh: 'การออกกำลังกาย', icon: '🏃', count: 1 },
      { id: 'mental-health', name: 'Mental Health', nameTh: 'สุขภาพจิต', icon: '🧠', count: 1 },
      { id: 'chronic-disease', name: 'Chronic Disease', nameTh: 'โรคเรื้อรัง', icon: '💊', count: 1 },
      { id: 'preventive-care', name: 'Preventive Care', nameTh: 'การดูแลป้องกัน', icon: '🛡️', count: 1 }
    ];

    const categoriesFile = bucket.file('medical-content/categories.json');
    await categoriesFile.save(JSON.stringify(categories, null, 2), {
      contentType: 'application/json'
    });
    console.log('✅ Uploaded categories index');

    // Create tags index
    const allTags = [...new Set(medicalContent.flatMap(c => c.tags || []))];
    const tagsFile = bucket.file('medical-content/tags.json');
    await tagsFile.save(JSON.stringify(allTags, null, 2), {
      contentType: 'application/json'
    });
    console.log('✅ Uploaded tags index');

    console.log('\n✅ Medical Content Library seeded successfully!');
    console.log(`📊 Total articles: ${medicalContent.length}`);
    console.log(`📁 Categories: ${categories.length}`);
    console.log(`🏷️  Tags: ${allTags.length}`);
    console.log('\n🌐 Content accessible from both Patient and Doctor portals');

  } catch (error) {
    console.error('❌ Error seeding content:', error);
    process.exit(1);
  }
}

// Run
uploadContent();
