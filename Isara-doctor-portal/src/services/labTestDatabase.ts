export interface LabTest {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  specimen: string;
  normalRange?: string;
  turnaroundTime: string;
  preparationRequired?: string;
}

export interface LabPanel {
  id: string;
  name: string;
  tests: string[];
  description: string;
}

export const labTests: LabTest[] = [
  {
    id: 'lab_001',
    code: 'CBC',
    name: 'Complete Blood Count',
    category: 'Hematology',
    description: 'Comprehensive blood cell analysis',
    specimen: 'Whole blood (EDTA)',
    turnaroundTime: '2-4 hours',
    preparationRequired: 'None',
  },
  {
    id: 'lab_002',
    code: 'CMP',
    name: 'Comprehensive Metabolic Panel',
    category: 'Chemistry',
    description: 'Kidney and liver function, electrolytes, glucose',
    specimen: 'Serum',
    turnaroundTime: '2-4 hours',
    preparationRequired: 'Fasting 8-12 hours',
  },
  {
    id: 'lab_003',
    code: 'LIPID',
    name: 'Lipid Panel',
    category: 'Chemistry',
    description: 'Cholesterol, triglycerides, HDL, LDL',
    specimen: 'Serum',
    turnaroundTime: '2-4 hours',
    preparationRequired: 'Fasting 12 hours',
  },
  {
    id: 'lab_004',
    code: 'HBA1C',
    name: 'Hemoglobin A1C',
    category: 'Chemistry',
    description: 'Average blood sugar over 3 months',
    specimen: 'Whole blood',
    turnaroundTime: '2-4 hours',
    preparationRequired: 'None',
  },
  {
    id: 'lab_005',
    code: 'TSH',
    name: 'Thyroid Stimulating Hormone',
    category: 'Endocrinology',
    description: 'Thyroid function screening',
    specimen: 'Serum',
    turnaroundTime: '1-2 days',
    preparationRequired: 'None',
  },
  {
    id: 'lab_006',
    code: 'UA',
    name: 'Urinalysis',
    category: 'Urinalysis',
    description: 'Physical, chemical, microscopic urine analysis',
    specimen: 'Urine',
    turnaroundTime: '1-2 hours',
    preparationRequired: 'Clean catch specimen',
  },
  {
    id: 'lab_007',
    code: 'PT/INR',
    name: 'Prothrombin Time/INR',
    category: 'Coagulation',
    description: 'Blood clotting time, warfarin monitoring',
    specimen: 'Citrated plasma',
    turnaroundTime: '2-4 hours',
    preparationRequired: 'None',
  },
  {
    id: 'lab_008',
    code: 'BUN',
    name: 'Blood Urea Nitrogen',
    category: 'Chemistry',
    description: 'Kidney function',
    specimen: 'Serum',
    turnaroundTime: '2-4 hours',
    preparationRequired: 'None',
  },
  {
    id: 'lab_009',
    code: 'CREAT',
    name: 'Creatinine',
    category: 'Chemistry',
    description: 'Kidney function',
    specimen: 'Serum',
    turnaroundTime: '2-4 hours',
    preparationRequired: 'None',
  },
  {
    id: 'lab_010',
    code: 'TROPONIN',
    name: 'Troponin I',
    category: 'Cardiac',
    description: 'Cardiac muscle damage marker',
    specimen: 'Serum',
    turnaroundTime: '1 hour',
    preparationRequired: 'None',
  },
];

export const labPanels: LabPanel[] = [
  {
    id: 'panel_001',
    name: 'Basic Metabolic Panel',
    tests: ['BUN', 'CREAT', 'Glucose', 'Electrolytes'],
    description: 'Basic kidney function and electrolytes',
  },
  {
    id: 'panel_002',
    name: 'Comprehensive Metabolic Panel',
    tests: ['BUN', 'CREAT', 'Glucose', 'Electrolytes', 'Liver enzymes', 'Total protein'],
    description: 'Complete metabolic assessment',
  },
  {
    id: 'panel_003',
    name: 'Liver Function Panel',
    tests: ['ALT', 'AST', 'Alkaline phosphatase', 'Bilirubin', 'Albumin'],
    description: 'Liver function assessment',
  },
  {
    id: 'panel_004',
    name: 'Thyroid Panel',
    tests: ['TSH', 'Free T4', 'Free T3'],
    description: 'Comprehensive thyroid function',
  },
  {
    id: 'panel_005',
    name: 'Cardiac Panel',
    tests: ['Troponin I', 'CK-MB', 'BNP'],
    description: 'Cardiac markers for heart attack/failure',
  },
];

export const searchLabTests = (query: string): LabTest[] => {
  const lowerQuery = query.toLowerCase();
  return labTests.filter(
    test =>
      test.name.toLowerCase().includes(lowerQuery) ||
      test.code.toLowerCase().includes(lowerQuery) ||
      test.category.toLowerCase().includes(lowerQuery)
  );
};

export const getLabTestByCode = (code: string): LabTest | undefined => {
  return labTests.find(test => test.code === code);
};

export const imagingModalities = [
  { id: 'xray', name: 'X-Ray', description: 'Radiographic imaging' },
  { id: 'ct', name: 'CT Scan', description: 'Computed tomography' },
  { id: 'mri', name: 'MRI', description: 'Magnetic resonance imaging' },
  { id: 'ultrasound', name: 'Ultrasound', description: 'Sonographic imaging' },
  { id: 'pet', name: 'PET Scan', description: 'Positron emission tomography' },
  { id: 'mammogram', name: 'Mammogram', description: 'Breast imaging' },
  { id: 'dexa', name: 'DEXA Scan', description: 'Bone density scan' },
];

export default { labTests, labPanels, searchLabTests, getLabTestByCode, imagingModalities };
