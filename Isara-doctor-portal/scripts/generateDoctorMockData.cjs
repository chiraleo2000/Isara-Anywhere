/**
 * Generate Complete Mock Data for DOCTOR PORTAL ONLY
 *
 * This generates:
 * - Doctors (NOT patients - patients are in patient portal)
 * - Doctor schedules
 * - Doctor statistics
 * - Medications database
 * - Lab tests catalog
 * - ICD-10 codes
 * - Doctor availability
 * - Queue templates
 *
 * Run: npm run generate:doctors
 */

const fs = require('fs');
const path = require('path');

// Create mockData directory
const mockDataDir = path.join(__dirname, '..', 'public', 'mockData');
if (!fs.existsSync(mockDataDir)) {
  fs.mkdirSync(mockDataDir, { recursive: true });
}

console.log('🏥 Generating Doctor Portal Mock Data...\n');

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const generateId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const randomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ============================================================================
// CONSTANTS
// ============================================================================

const FIRST_NAMES = ['John', 'Sarah', 'Michael', 'Emma', 'David', 'Lisa', 'James', 'Maria', 'Robert', 'Jennifer'];
const LAST_NAMES = ['Smith', 'Johnson', 'Brown', 'Davis', 'Wilson', 'Anderson', 'Taylor', 'Martinez', 'Garcia', 'Rodriguez'];

const SPECIALTIES = [
  'General Practice',
  'Internal Medicine',
  'Cardiology',
  'Pediatrics',
  'Orthopedics',
  'Dermatology',
  'Neurology',
  'Psychiatry',
  'Obstetrics & Gynecology',
  'Surgery',
  'Emergency Medicine',
  'Radiology',
  'Anesthesiology'
];

const HOSPITALS = [
  'Bangkok General Hospital',
  'Bumrungrad International Hospital',
  'Samitivej Hospital',
  'BNH Hospital',
  'Vejthani Hospital'
];

// ============================================================================
// GENERATE DOCTORS
// ============================================================================

function generateDoctors(count = 10) {
  const doctors = [];

  for (let i = 0; i < count; i++) {
    const firstName = randomElement(FIRST_NAMES);
    const lastName = randomElement(LAST_NAMES);
    const name = `Dr. ${firstName} ${lastName}`;
    const specialty = randomElement(SPECIALTIES);
    const hospital = randomElement(HOSPITALS);

    const doctor = {
      id: `DOC${String(i + 1).padStart(4, '0')}`,
      name,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${hospital.toLowerCase().replace(/\s+/g, '')}.com`,
      role: 'doctor',
      medicalLicenseNumber: `MD-${Math.floor(Math.random() * 900000 + 100000)}`,
      specialty,
      hospital,
      phone: `+66${Math.floor(Math.random() * 900000000 + 100000000)}`,
      avatarUrl: `https://i.pravatar.cc/300?u=doctor${i}`,
      dateOfBirth: randomDate(new Date(1970, 0, 1), new Date(1990, 0, 1)).toISOString(),

      // Professional Info
      yearsOfExperience: Math.floor(Math.random() * 25 + 5),
      medicalSchool: randomElement(['Mahidol University', 'Chulalongkorn University', 'Siriraj Hospital']),
      boardCertifications: [specialty],
      languagesSpoken: ['English', 'Thai'],

      // Practice Info
      consultationFee: Math.floor(Math.random() * 2500 + 500),
      consultationDuration: randomElement([15, 30, 45, 60]),
      acceptsNewPatients: true,
      acceptsTelemedicine: true,

      // Ratings
      rating: (Math.random() * 1 + 4).toFixed(1),
      totalReviews: Math.floor(Math.random() * 500 + 10),

      // Availability
      availability: {
        monday: { available: true, slots: ['09:00-12:00', '14:00-17:00'] },
        tuesday: { available: true, slots: ['09:00-12:00', '14:00-17:00'] },
        wednesday: { available: true, slots: ['09:00-12:00', '14:00-17:00'] },
        thursday: { available: true, slots: ['09:00-12:00', '14:00-17:00'] },
        friday: { available: true, slots: ['09:00-12:00', '14:00-17:00'] },
        saturday: { available: i % 2 === 0, slots: ['09:00-13:00'] },
        sunday: { available: false, slots: [] }
      },

      // Statistics
      statistics: {
        totalPatients: Math.floor(Math.random() * 4900 + 100),
        totalConsultations: Math.floor(Math.random() * 9800 + 200),
        averageConsultationTime: Math.floor(Math.random() * 30 + 15),
        patientSatisfactionRate: (Math.random() * 14 + 85).toFixed(1)
      },

      createdAt: new Date().toISOString()
    };

    doctors.push(doctor);
  }

  return doctors;
}

// ============================================================================
// GENERATE MEDICATIONS DATABASE
// ============================================================================

function generateMedicationsDatabase() {
  return [
    // Cardiovascular
    { id: 'MED001', name: 'Aspirin 81mg', genericName: 'Acetylsalicylic acid', category: 'Cardiovascular', indications: 'Antiplatelet therapy', sideEffects: ['GI upset', 'Bleeding'] },
    { id: 'MED002', name: 'Atorvastatin 20mg', genericName: 'Atorvastatin', category: 'Cardiovascular', indications: 'Hyperlipidemia', sideEffects: ['Muscle pain', 'Liver enzyme elevation'] },
    { id: 'MED003', name: 'Lisinopril 10mg', genericName: 'Lisinopril', category: 'Cardiovascular', indications: 'Hypertension', sideEffects: ['Dry cough', 'Dizziness'] },
    { id: 'MED004', name: 'Amlodipine 5mg', genericName: 'Amlodipine', category: 'Cardiovascular', indications: 'Hypertension', sideEffects: ['Ankle edema', 'Flushing'] },

    // Diabetes
    { id: 'MED005', name: 'Metformin 500mg', genericName: 'Metformin HCl', category: 'Diabetes', indications: 'Type 2 Diabetes', sideEffects: ['GI upset', 'Diarrhea'] },
    { id: 'MED006', name: 'Insulin Glargine', genericName: 'Insulin glargine', category: 'Diabetes', indications: 'Diabetes mellitus', sideEffects: ['Hypoglycemia', 'Weight gain'] },

    // Antibiotics
    { id: 'MED007', name: 'Amoxicillin 500mg', genericName: 'Amoxicillin', category: 'Antibiotic', indications: 'Bacterial infections', sideEffects: ['Allergic reactions', 'GI upset'] },
    { id: 'MED008', name: 'Azithromycin 250mg', genericName: 'Azithromycin', category: 'Antibiotic', indications: 'Bacterial infections', sideEffects: ['GI upset', 'QT prolongation'] },

    // Pain Relief
    { id: 'MED009', name: 'Ibuprofen 400mg', genericName: 'Ibuprofen', category: 'Pain Relief', indications: 'Pain, inflammation', sideEffects: ['GI upset', 'Renal impairment'] },
    { id: 'MED010', name: 'Paracetamol 500mg', genericName: 'Acetaminophen', category: 'Pain Relief', indications: 'Pain, fever', sideEffects: ['Liver toxicity (overdose)'] },

    // GI
    { id: 'MED011', name: 'Omeprazole 20mg', genericName: 'Omeprazole', category: 'Gastrointestinal', indications: 'GERD, PUD', sideEffects: ['Headache', 'Diarrhea'] },
    { id: 'MED012', name: 'Pantoprazole 40mg', genericName: 'Pantoprazole', category: 'Gastrointestinal', indications: 'GERD, PUD', sideEffects: ['Headache', 'Nausea'] },

    // Respiratory
    { id: 'MED013', name: 'Albuterol Inhaler', genericName: 'Albuterol', category: 'Respiratory', indications: 'Asthma, COPD', sideEffects: ['Tremor', 'Tachycardia'] },
    { id: 'MED014', name: 'Montelukast 10mg', genericName: 'Montelukast', category: 'Respiratory', indications: 'Asthma', sideEffects: ['Headache', 'GI upset'] },

    // Thyroid
    { id: 'MED015', name: 'Levothyroxine 50mcg', genericName: 'Levothyroxine', category: 'Endocrine', indications: 'Hypothyroidism', sideEffects: ['Palpitations', 'Weight loss'] }
  ];
}

// ============================================================================
// GENERATE LAB TESTS CATALOG
// ============================================================================

function generateLabTestsCatalog() {
  return [
    // Hematology
    { code: 'CBC', name: 'Complete Blood Count', category: 'Hematology', normalRange: 'Various', turnaroundTime: '2-4 hours' },
    { code: 'HGB', name: 'Hemoglobin', category: 'Hematology', normalRange: '12-16 g/dL (female), 14-18 g/dL (male)', turnaroundTime: '2-4 hours' },
    { code: 'WBC', name: 'White Blood Cell Count', category: 'Hematology', normalRange: '4,000-11,000/μL', turnaroundTime: '2-4 hours' },
    { code: 'PLT', name: 'Platelet Count', category: 'Hematology', normalRange: '150,000-400,000/μL', turnaroundTime: '2-4 hours' },

    // Chemistry
    { code: 'CMP', name: 'Comprehensive Metabolic Panel', category: 'Chemistry', normalRange: 'Various', turnaroundTime: '4-6 hours' },
    { code: 'BMP', name: 'Basic Metabolic Panel', category: 'Chemistry', normalRange: 'Various', turnaroundTime: '4-6 hours' },
    { code: 'GLUCOSE', name: 'Blood Glucose (Fasting)', category: 'Chemistry', normalRange: '70-100 mg/dL', turnaroundTime: '2-4 hours' },
    { code: 'HBA1C', name: 'Hemoglobin A1c', category: 'Chemistry', normalRange: '<5.7%', turnaroundTime: '1 day' },
    { code: 'CREATININE', name: 'Serum Creatinine', category: 'Chemistry', normalRange: '0.7-1.3 mg/dL', turnaroundTime: '4-6 hours' },
    { code: 'BUN', name: 'Blood Urea Nitrogen', category: 'Chemistry', normalRange: '7-20 mg/dL', turnaroundTime: '4-6 hours' },

    // Lipids
    { code: 'LIPID', name: 'Lipid Panel', category: 'Lipids', normalRange: 'Various', turnaroundTime: '1 day' },
    { code: 'CHOL', name: 'Total Cholesterol', category: 'Lipids', normalRange: '<200 mg/dL', turnaroundTime: '1 day' },
    { code: 'LDL', name: 'LDL Cholesterol', category: 'Lipids', normalRange: '<100 mg/dL', turnaroundTime: '1 day' },
    { code: 'HDL', name: 'HDL Cholesterol', category: 'Lipids', normalRange: '>40 mg/dL (male), >50 mg/dL (female)', turnaroundTime: '1 day' },
    { code: 'TRIG', name: 'Triglycerides', category: 'Lipids', normalRange: '<150 mg/dL', turnaroundTime: '1 day' },

    // Liver Function
    { code: 'LFT', name: 'Liver Function Tests', category: 'Liver', normalRange: 'Various', turnaroundTime: '1 day' },
    { code: 'ALT', name: 'Alanine Aminotransferase', category: 'Liver', normalRange: '7-56 U/L', turnaroundTime: '1 day' },
    { code: 'AST', name: 'Aspartate Aminotransferase', category: 'Liver', normalRange: '10-40 U/L', turnaroundTime: '1 day' },
    { code: 'ALP', name: 'Alkaline Phosphatase', category: 'Liver', normalRange: '44-147 U/L', turnaroundTime: '1 day' },
    { code: 'BILIRUBIN', name: 'Total Bilirubin', category: 'Liver', normalRange: '0.1-1.2 mg/dL', turnaroundTime: '1 day' },

    // Thyroid
    { code: 'TSH', name: 'Thyroid Stimulating Hormone', category: 'Endocrinology', normalRange: '0.4-4.0 mIU/L', turnaroundTime: '1-2 days' },
    { code: 'T3', name: 'Triiodothyronine', category: 'Endocrinology', normalRange: '80-200 ng/dL', turnaroundTime: '1-2 days' },
    { code: 'T4', name: 'Thyroxine', category: 'Endocrinology', normalRange: '4.5-12.5 μg/dL', turnaroundTime: '1-2 days' },

    // Urinalysis
    { code: 'UA', name: 'Urinalysis (Complete)', category: 'Urinalysis', normalRange: 'Various', turnaroundTime: '2-4 hours' },
    { code: 'URINE_CULTURE', name: 'Urine Culture', category: 'Microbiology', normalRange: 'No growth', turnaroundTime: '2-3 days' }
  ];
}

// ============================================================================
// GENERATE ICD-10 CODES DATABASE
// ============================================================================

function generateICD10Codes() {
  return [
    // Common diagnoses
    { code: 'I10', description: 'Essential (primary) hypertension', category: 'Cardiovascular' },
    { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', category: 'Endocrine' },
    { code: 'E78.5', description: 'Hyperlipidemia, unspecified', category: 'Endocrine' },
    { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified', category: 'Respiratory' },
    { code: 'J45.909', description: 'Unspecified asthma, uncomplicated', category: 'Respiratory' },
    { code: 'M54.5', description: 'Low back pain', category: 'Musculoskeletal' },
    { code: 'M79.3', description: 'Myalgia', category: 'Musculoskeletal' },
    { code: 'K21.9', description: 'Gastro-esophageal reflux disease without esophagitis', category: 'Digestive' },
    { code: 'R51', description: 'Headache', category: 'Symptoms' },
    { code: 'R50.9', description: 'Fever, unspecified', category: 'Symptoms' },
    { code: 'F41.1', description: 'Generalized anxiety disorder', category: 'Mental Health' },
    { code: 'F32.9', description: 'Major depressive disorder, single episode, unspecified', category: 'Mental Health' },
    { code: 'E03.9', description: 'Hypothyroidism, unspecified', category: 'Endocrine' },
    { code: 'N39.0', description: 'Urinary tract infection, site not specified', category: 'Genitourinary' },
    { code: 'L30.9', description: 'Dermatitis, unspecified', category: 'Skin' }
  ];
}

// ============================================================================
// SAVE TO FILE
// ============================================================================

function saveToFile(fileName, data) {
  const filePath = path.join(mockDataDir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`✅ Saved ${fileName} (${Array.isArray(data) ? data.length : Object.keys(data).length} items)`);
}

// ============================================================================
// MAIN GENERATION
// ============================================================================

function generateAllData() {
  console.log('📊 Generating doctor portal data...\n');

  // Generate data
  const doctors = generateDoctors(10);
  const medications = generateMedicationsDatabase();
  const labTests = generateLabTestsCatalog();
  const icd10Codes = generateICD10Codes();

  // Save to files
  saveToFile('doctors.json', doctors);
  saveToFile('medications.json', medications);
  saveToFile('lab-tests.json', labTests);
  saveToFile('icd10-codes.json', icd10Codes);

  console.log('\n✅ All doctor portal mock data generated successfully!');
  console.log(`📁 Data saved to: ${mockDataDir}\n`);
  console.log('📊 Summary:');
  console.log(`   - ${doctors.length} doctors`);
  console.log(`   - ${medications.length} medications`);
  console.log(`   - ${labTests.length} lab tests`);
  console.log(`   - ${icd10Codes.length} ICD-10 codes\n`);

  console.log('💡 To use in development:');
  console.log('   1. Data is now available in public/mockData/');
  console.log('   2. Import and use in your components');
  console.log('   3. Patient data should be generated in patient portal\n');
}

// ============================================================================
// GENERATE PATIENTS FOR DOCTOR VIEW
// ============================================================================

const PATIENT_FIRST_NAMES = ['Somchai', 'Siriporn', 'Nuttapong', 'Preecha', 'Wanida', 'Thanapon', 'Siriwan', 'Apirak', 'Kanokwan', 'Pongsakorn', 'Chutima', 'Rattana', 'Supaporn', 'Worawut', 'Pimchanok'];
const PATIENT_LAST_NAMES = ['Chaisri', 'Wongsakul', 'Phatthana', 'Suksawat', 'Rattana', 'Somjai', 'Thongchai', 'Prasert', 'Chaiwong', 'Kittisak'];

function generatePatients(count = 50) {
  const patients = [];

  for (let i = 0; i < count; i++) {
    const firstName = randomElement(PATIENT_FIRST_NAMES);
    const lastName = randomElement(PATIENT_LAST_NAMES);
    const name = `${firstName} ${lastName}`;
    const gender = Math.random() > 0.5 ? 'male' : 'female';
    const age = Math.floor(Math.random() * 67) + 18;

    patients.push({
      id: `patient_${Date.now()}_${i}`,
      demographics: {
        name,
        dateOfBirth: randomDate(new Date(new Date().getFullYear() - age, 0, 1), new Date(new Date().getFullYear() - age, 11, 31)).toISOString().split('T')[0],
        age,
        gender,
        photo: `https://i.pravatar.cc/150?u=${name.replace(' ', '')}`,
        idNumber: `${Math.floor(Math.random() * 9 + 1)}${Math.floor(Math.random() * 10000)  }${Math.floor(Math.random() * 100000)}${Math.floor(Math.random() * 90 + 10)}-${Math.floor(Math.random() * 10)}`,
      },
      contact: {
        phone: `+66 ${Math.floor(Math.random() * 20) + 80} ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 9000) + 1000}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
        address: `${Math.floor(Math.random() * 999) + 1} Sukhumvit Rd, Bangkok 10110, Thailand`,
        emergencyContact: {
          name: `${randomElement(PATIENT_FIRST_NAMES)} ${randomElement(PATIENT_LAST_NAMES)}`,
          relationship: randomElement(['Spouse', 'Parent', 'Sibling', 'Child']),
          phone: `+66 ${Math.floor(Math.random() * 20) + 80} ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 9000) + 1000}`,
        },
      },
      medicalInfo: {
        bloodType: randomElement(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
        allergies: Math.random() > 0.6 ? [randomElement(['Penicillin', 'Sulfa drugs', 'Aspirin', 'Peanuts', 'Shellfish'])] : [],
        chronicConditions: Math.random() > 0.5 ? [randomElement(['Hypertension', 'Type 2 Diabetes', 'Asthma', 'COPD'])] : [],
        currentMedications: Math.random() > 0.4 ? [randomElement(['Metformin 500mg', 'Amlodipine 5mg', 'Atorvastatin 20mg'])] : [],
      },
      lastVisit: Math.random() > 0.3 ? randomDate(new Date(2024, 0, 1), new Date()) : undefined,
      nextAppointment: Math.random() > 0.6 ? randomDate(new Date(), new Date(2025, 11, 31)) : undefined,
      consentStatus: {
        hasConsent: true,
        dataTypesAllowed: ['PHR', 'EMR', 'Lab Results', 'Prescriptions'],
        expiresAt: new Date(2026, 11, 31).toISOString(),
      },
      riskLevel: randomElement(['low', 'medium', 'high']),
      isActive: Math.random() > 0.1,
    });
  }

  return patients;
}

function generateAllDataEnhanced() {
  console.log('📊 Generating comprehensive doctor portal data...\n');

  const doctors = generateDoctors(10);
  const patients = generatePatients(50);
  const medications = generateMedicationsDatabase();
  const labTests = generateLabTestsCatalog();
  const icd10Codes = generateICD10Codes();

  saveToFile('doctors.json', doctors);
  saveToFile('patients.json', patients);
  saveToFile('medications.json', medications);
  saveToFile('lab-tests.json', labTests);
  saveToFile('icd10-codes.json', icd10Codes);

  console.log('\n✅ All mock data generated successfully!');
  console.log(`📁 Data saved to: ${mockDataDir}\n`);
  console.log('📊 Summary:');
  console.log(`   - ${doctors.length} doctors`);
  console.log(`   - ${patients.length} patients`);
  console.log(`   - ${medications.length} medications`);
  console.log(`   - ${labTests.length} lab tests`);
  console.log(`   - ${icd10Codes.length} ICD-10 codes\n`);
}

generateAllDataEnhanced();
