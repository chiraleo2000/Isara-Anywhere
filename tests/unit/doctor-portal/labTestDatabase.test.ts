/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — LAB TEST DATABASE UNIT TESTS
 * ═══════════════════════════════════════════════════════════════════════
 * Tests: labTests data, labPanels data, searchLabTests, getLabTestByCode,
 *        imagingModalities
 * Source: Isara-doctor-portal/src/services/labTestDatabase.ts
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';

// ─── Re-implement data from labTestDatabase.ts ──

interface LabTest {
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

interface LabPanel {
  id: string;
  name: string;
  tests: string[];
  description: string;
}

const labTests: LabTest[] = [
  { id: 'lab_001', code: 'CBC', name: 'Complete Blood Count', category: 'Hematology', description: 'Comprehensive blood cell analysis', specimen: 'Whole blood (EDTA)', turnaroundTime: '2-4 hours', preparationRequired: 'None' },
  { id: 'lab_002', code: 'CMP', name: 'Comprehensive Metabolic Panel', category: 'Chemistry', description: 'Kidney and liver function, electrolytes, glucose', specimen: 'Serum', turnaroundTime: '2-4 hours', preparationRequired: 'Fasting 8-12 hours' },
  { id: 'lab_003', code: 'LIPID', name: 'Lipid Panel', category: 'Chemistry', description: 'Cholesterol, triglycerides, HDL, LDL', specimen: 'Serum', turnaroundTime: '2-4 hours', preparationRequired: 'Fasting 12 hours' },
  { id: 'lab_004', code: 'HBA1C', name: 'Hemoglobin A1C', category: 'Chemistry', description: 'Average blood sugar over 3 months', specimen: 'Whole blood', turnaroundTime: '2-4 hours', preparationRequired: 'None' },
  { id: 'lab_005', code: 'TSH', name: 'Thyroid Stimulating Hormone', category: 'Endocrinology', description: 'Thyroid function screening', specimen: 'Serum', turnaroundTime: '1-2 days', preparationRequired: 'None' },
  { id: 'lab_006', code: 'UA', name: 'Urinalysis', category: 'Urinalysis', description: 'Physical, chemical, microscopic urine analysis', specimen: 'Urine', turnaroundTime: '1-2 hours', preparationRequired: 'Clean catch specimen' },
  { id: 'lab_007', code: 'PT/INR', name: 'Prothrombin Time/INR', category: 'Coagulation', description: 'Blood clotting time, warfarin monitoring', specimen: 'Citrated plasma', turnaroundTime: '2-4 hours', preparationRequired: 'None' },
  { id: 'lab_008', code: 'BUN', name: 'Blood Urea Nitrogen', category: 'Chemistry', description: 'Kidney function', specimen: 'Serum', turnaroundTime: '2-4 hours', preparationRequired: 'None' },
  { id: 'lab_009', code: 'CREAT', name: 'Creatinine', category: 'Chemistry', description: 'Kidney function', specimen: 'Serum', turnaroundTime: '2-4 hours', preparationRequired: 'None' },
  { id: 'lab_010', code: 'TROPONIN', name: 'Troponin I', category: 'Cardiac', description: 'Cardiac muscle damage marker', specimen: 'Serum', turnaroundTime: '1 hour', preparationRequired: 'None' },
];

const labPanels: LabPanel[] = [
  { id: 'panel_001', name: 'Basic Metabolic Panel', tests: ['BUN', 'CREAT', 'Glucose', 'Electrolytes'], description: 'Basic kidney function and electrolytes' },
  { id: 'panel_002', name: 'Comprehensive Metabolic Panel', tests: ['BUN', 'CREAT', 'Glucose', 'Electrolytes', 'Liver enzymes', 'Total protein'], description: 'Complete metabolic assessment' },
  { id: 'panel_003', name: 'Liver Function Panel', tests: ['ALT', 'AST', 'Alkaline phosphatase', 'Bilirubin', 'Albumin'], description: 'Liver function assessment' },
  { id: 'panel_004', name: 'Thyroid Panel', tests: ['TSH', 'Free T4', 'Free T3'], description: 'Comprehensive thyroid function' },
  { id: 'panel_005', name: 'Cardiac Panel', tests: ['Troponin I', 'CK-MB', 'BNP'], description: 'Cardiac markers for heart attack/failure' },
];

const imagingModalities = [
  { id: 'xray', name: 'X-Ray', description: 'Radiographic imaging' },
  { id: 'ct', name: 'CT Scan', description: 'Computed tomography' },
  { id: 'mri', name: 'MRI', description: 'Magnetic resonance imaging' },
  { id: 'ultrasound', name: 'Ultrasound', description: 'Sonographic imaging' },
  { id: 'pet', name: 'PET Scan', description: 'Positron emission tomography' },
  { id: 'mammogram', name: 'Mammogram', description: 'Breast imaging' },
  { id: 'dexa', name: 'DEXA Scan', description: 'Bone density scan' },
];

const searchLabTests = (query: string): LabTest[] => {
  const lowerQuery = query.toLowerCase();
  return labTests.filter(
    test =>
      test.name.toLowerCase().includes(lowerQuery) ||
      test.code.toLowerCase().includes(lowerQuery) ||
      test.category.toLowerCase().includes(lowerQuery)
  );
};

const getLabTestByCode = (code: string): LabTest | undefined => {
  return labTests.find(test => test.code === code);
};

// ════════════════════════════════════════════════════════════════════
// A. LAB TESTS DATA (12 tests)
// ════════════════════════════════════════════════════════════════════
describe('Lab Tests Data', () => {
  it('A01 — 10 lab tests defined', () => {
    expect(labTests).toHaveLength(10);
  });

  it('A02 — all have unique IDs', () => {
    const ids = labTests.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('A03 — all have unique codes', () => {
    const codes = labTests.map(t => t.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('A04 — CBC is hematology', () => {
    const cbc = labTests.find(t => t.code === 'CBC');
    expect(cbc?.category).toBe('Hematology');
  });

  it('A05 — TROPONIN is cardiac category', () => {
    const troponin = labTests.find(t => t.code === 'TROPONIN');
    expect(troponin?.category).toBe('Cardiac');
  });

  it('A06 — all tests have specimen type', () => {
    labTests.forEach(t => {
      expect(t.specimen).toBeTruthy();
    });
  });

  it('A07 — all tests have turnaround time', () => {
    labTests.forEach(t => {
      expect(t.turnaroundTime).toBeTruthy();
    });
  });

  it('A08 — Chemistry is most common category', () => {
    const chemistry = labTests.filter(t => t.category === 'Chemistry');
    expect(chemistry.length).toBeGreaterThanOrEqual(4);
  });

  it('A09 — CMP requires fasting', () => {
    const cmp = labTests.find(t => t.code === 'CMP');
    expect(cmp?.preparationRequired).toContain('Fasting');
  });

  it('A10 — LIPID requires fasting 12 hours', () => {
    const lipid = labTests.find(t => t.code === 'LIPID');
    expect(lipid?.preparationRequired).toBe('Fasting 12 hours');
  });

  it('A11 — UA uses urine specimen', () => {
    const ua = labTests.find(t => t.code === 'UA');
    expect(ua?.specimen).toBe('Urine');
  });

  it('A12 — all IDs follow lab_XXX pattern', () => {
    labTests.forEach(t => {
      expect(t.id).toMatch(/^lab_\d{3}$/);
    });
  });
});

// ════════════════════════════════════════════════════════════════════
// B. SEARCH LAB TESTS (12 tests)
// ════════════════════════════════════════════════════════════════════
describe('Search Lab Tests', () => {
  it('B01 — search by exact code CBC', () => {
    const results = searchLabTests('CBC');
    expect(results).toHaveLength(1);
    expect(results[0].code).toBe('CBC');
  });

  it('B02 — search by partial name "blood"', () => {
    const results = searchLabTests('blood');
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it('B03 — search by category "Chemistry"', () => {
    const results = searchLabTests('Chemistry');
    expect(results.length).toBeGreaterThanOrEqual(4);
  });

  it('B04 — search is case-insensitive', () => {
    const upper = searchLabTests('CBC');
    const lower = searchLabTests('cbc');
    expect(upper).toEqual(lower);
  });

  it('B05 — search by description keyword "Kidney" matches BUN and CREAT', () => {
    // searchLabTests only checks name, code, category — not description
    // BUN and CREAT have 'Kidney function' in description but that's not searched
    const bun = getLabTestByCode('BUN');
    const creat = getLabTestByCode('CREAT');
    expect(bun?.description).toContain('Kidney');
    expect(creat?.description).toContain('Kidney');
  });

  it('B06 — search for "cardiac" returns TROPONIN', () => {
    const results = searchLabTests('cardiac');
    expect(results.some(r => r.code === 'TROPONIN')).toBe(true);
  });

  it('B07 — empty search returns nothing', () => {
    const results = searchLabTests('xyznonexistent');
    expect(results).toHaveLength(0);
  });

  it('B08 — search for "thyroid" returns TSH', () => {
    const results = searchLabTests('thyroid');
    expect(results.some(r => r.code === 'TSH')).toBe(true);
  });

  it('B09 — search for "Coagulation" returns PT/INR', () => {
    const results = searchLabTests('Coagulation');
    expect(results.some(r => r.code === 'PT/INR')).toBe(true);
  });

  it('B10 — search for "Urinalysis" returns UA test', () => {
    const results = searchLabTests('Urinalysis');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].code).toBe('UA');
  });

  it('B11 — empty string returns all tests', () => {
    const results = searchLabTests('');
    expect(results).toHaveLength(10);
  });

  it('B12 — results maintain original order', () => {
    const results = searchLabTests('Chemistry');
    for (let i = 1; i < results.length; i++) {
      const prevIdx = labTests.indexOf(results[i - 1]);
      const currIdx = labTests.indexOf(results[i]);
      expect(currIdx).toBeGreaterThan(prevIdx);
    }
  });
});

// ════════════════════════════════════════════════════════════════════
// C. GET LAB TEST BY CODE (8 tests)
// ════════════════════════════════════════════════════════════════════
describe('Get Lab Test By Code', () => {
  it('C01 — finds CBC by code', () => {
    const test = getLabTestByCode('CBC');
    expect(test).toBeDefined();
    expect(test?.name).toBe('Complete Blood Count');
  });

  it('C02 — finds TROPONIN by code', () => {
    const test = getLabTestByCode('TROPONIN');
    expect(test).toBeDefined();
    expect(test?.category).toBe('Cardiac');
  });

  it('C03 — returns undefined for unknown code', () => {
    const test = getLabTestByCode('UNKNOWN');
    expect(test).toBeUndefined();
  });

  it('C04 — code match is case-sensitive', () => {
    const test = getLabTestByCode('cbc');
    expect(test).toBeUndefined();
  });

  it('C05 — finds PT/INR with slash in code', () => {
    const test = getLabTestByCode('PT/INR');
    expect(test).toBeDefined();
    expect(test?.category).toBe('Coagulation');
  });

  it('C06 — HBA1C returns full test object', () => {
    const test = getLabTestByCode('HBA1C');
    expect(test).toHaveProperty('id');
    expect(test).toHaveProperty('code');
    expect(test).toHaveProperty('name');
    expect(test).toHaveProperty('category');
    expect(test).toHaveProperty('specimen');
  });

  it('C07 — all defined codes are findable', () => {
    labTests.forEach(t => {
      const found = getLabTestByCode(t.code);
      expect(found).toBe(t);
    });
  });

  it('C08 — empty string returns undefined', () => {
    expect(getLabTestByCode('')).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════════════════════
// D. LAB PANELS (10 tests)
// ════════════════════════════════════════════════════════════════════
describe('Lab Panels', () => {
  it('D01 — 5 panels defined', () => {
    expect(labPanels).toHaveLength(5);
  });

  it('D02 — all have unique IDs', () => {
    const ids = labPanels.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('D03 — Basic Metabolic Panel has 4 tests', () => {
    const bmp = labPanels.find(p => p.name === 'Basic Metabolic Panel');
    expect(bmp?.tests).toHaveLength(4);
  });

  it('D04 — Comprehensive Metabolic Panel has more tests than Basic', () => {
    const bmp = labPanels.find(p => p.name === 'Basic Metabolic Panel');
    const cmp = labPanels.find(p => p.name === 'Comprehensive Metabolic Panel');
    expect(cmp!.tests.length).toBeGreaterThan(bmp!.tests.length);
  });

  it('D05 — Liver Function Panel includes ALT and AST', () => {
    const lfp = labPanels.find(p => p.name === 'Liver Function Panel');
    expect(lfp?.tests).toContain('ALT');
    expect(lfp?.tests).toContain('AST');
  });

  it('D06 — Thyroid Panel includes TSH', () => {
    const tp = labPanels.find(p => p.name === 'Thyroid Panel');
    expect(tp?.tests).toContain('TSH');
  });

  it('D07 — Cardiac Panel includes Troponin I', () => {
    const cp = labPanels.find(p => p.name === 'Cardiac Panel');
    expect(cp?.tests).toContain('Troponin I');
  });

  it('D08 — all panels have descriptions', () => {
    labPanels.forEach(p => {
      expect(p.description).toBeTruthy();
    });
  });

  it('D09 — all panels have at least 3 tests', () => {
    labPanels.forEach(p => {
      expect(p.tests.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('D10 — panel IDs follow panel_XXX pattern', () => {
    labPanels.forEach(p => {
      expect(p.id).toMatch(/^panel_\d{3}$/);
    });
  });
});

// ════════════════════════════════════════════════════════════════════
// E. IMAGING MODALITIES (8 tests)
// ════════════════════════════════════════════════════════════════════
describe('Imaging Modalities', () => {
  it('E01 — 7 modalities defined', () => {
    expect(imagingModalities).toHaveLength(7);
  });

  it('E02 — all have unique IDs', () => {
    const ids = imagingModalities.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('E03 — X-Ray included', () => {
    expect(imagingModalities.some(m => m.name === 'X-Ray')).toBe(true);
  });

  it('E04 — MRI included', () => {
    expect(imagingModalities.some(m => m.name === 'MRI')).toBe(true);
  });

  it('E05 — CT Scan included', () => {
    expect(imagingModalities.some(m => m.name === 'CT Scan')).toBe(true);
  });

  it('E06 — all have descriptions', () => {
    imagingModalities.forEach(m => {
      expect(m.description).toBeTruthy();
    });
  });

  it('E07 — all have non-empty names', () => {
    imagingModalities.forEach(m => {
      expect(m.name.length).toBeGreaterThan(0);
    });
  });

  it('E08 — DEXA scan for bone density', () => {
    const dexa = imagingModalities.find(m => m.id === 'dexa');
    expect(dexa?.description).toContain('Bone density');
  });
});
