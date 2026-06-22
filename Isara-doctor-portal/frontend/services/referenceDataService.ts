/**
 * Reference Data Service - Medical Reference Data
 *
 * Uses GCS bucket: izara-meta-data
 * - medications.json - Drug database
 * - lab-tests.json - Lab test catalog
 * - icd10-codes.json - ICD-10 diagnosis codes
 * - drug-interactions.json - Drug interaction database
 * - reference-ranges.json - Normal value ranges
 *
 * Features:
 * - Medication lookup with interactions
 * - Drug interaction checking
 * - Lab test catalog with reference ranges
 * - ICD-10 code search
 * - Clinical guidelines
 */

// DrugInfo and LabTest types are defined locally for better type safety
import {
  fetchMedications,
  fetchLabTests,
  fetchICD10Codes,
  fetchDrugInteractions,
  fetchReferenceRanges,
  checkDrugInteractions as gcsCheckDrugInteractions,
  getReferenceRange as gcsGetReferenceRange,
} from './gcsDataService';

// ============================================================================
// TYPES
// ============================================================================

interface ICD10Code {
  code: string;
  description: string;
  category: string;
  subcategory?: string;
  keywords?: string[];
}

interface DrugInteraction {
  id: string;
  drug1Id: string;
  drug1Name: string;
  drug2Id: string;
  drug2Name: string;
  severity: 'critical' | 'major' | 'moderate' | 'minor';
  description: string;
  mechanism?: string;
  clinicalEffects?: string[];
  management?: string;
}

interface Medication {
  id: string;
  name: string;
  genericName: string;
  brandNames: string[];
  category: string;
  dosageForms: string[];
  strengths: string[];
  indications: string[];
  contraindications: string[];
  sideEffects: string[];
  interactions: string[];
  warnings: string[];
  pregnancyCategory?: string;
  controlled?: boolean;
  price?: number;
}

interface LabTestInfo {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  specimen: string;
  turnaroundTime: string;
  referenceRanges: ReferenceRange[];
  preparation?: string;
  price?: number;
}

type AgeGroup = 'adult' | 'pediatric' | 'geriatric';

interface ReferenceRange {
  ageGroup: 'all' | AgeGroup;
  gender?: 'male' | 'female' | 'all';
  min?: number;
  max?: number;
  unit: string;
  interpretation?: string;
}

// ============================================================================
// REFERENCE DATA SERVICE CLASS
// ============================================================================

class ReferenceDataService {
  private static instance: ReferenceDataService;

  // Cache for frequently accessed data
  private medicationsCache: Medication[] | null = null;
  private labTestsCache: LabTestInfo[] | null = null;
  private icd10Cache: ICD10Code[] | null = null;
  private drugInteractionsCache: DrugInteraction[] | null = null;
  private referenceRangesCache: ReferenceRange[] | null = null;

  private constructor() { }

  static getInstance(): ReferenceDataService {
    if (!ReferenceDataService.instance) {
      ReferenceDataService.instance = new ReferenceDataService();
    }
    return ReferenceDataService.instance;
  }

  // ===========================================================================
  // MEDICATIONS
  // ===========================================================================

  /**
   * Get all medications
   */
  async getAllMedications(): Promise<Medication[]> {
    if (this.medicationsCache) {
      return this.medicationsCache;
    }

    console.log('💊 Fetching medications from GCS...');
    const medications = await fetchMedications();
    this.medicationsCache = medications as Medication[];
    console.log(`✅ Loaded ${medications.length} medications`);
    return this.medicationsCache;
  }

  /**
   * Search medications by name or generic name
   */
  async searchMedications(query: string): Promise<Medication[]> {
    const medications = await this.getAllMedications();
    const lowerQuery = query.toLowerCase();

    return medications.filter(med =>
      med.name.toLowerCase().includes(lowerQuery) ||
      med.genericName.toLowerCase().includes(lowerQuery) ||
      med.brandNames.some(b => b.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get medication by ID
   */
  async getMedicationById(id: string): Promise<Medication | null> {
    const medications = await this.getAllMedications();
    return medications.find(m => m.id === id) || null;
  }

  /**
   * Get medication by name
   */
  async getMedicationByName(name: string): Promise<Medication | null> {
    const medications = await this.getAllMedications();
    const lowerName = name.toLowerCase();
    return medications.find(
      m =>
        m.name.toLowerCase() === lowerName ||
        m.genericName.toLowerCase() === lowerName
    ) || null;
  }

  /**
   * Get medications by category
   */
  async getMedicationsByCategory(category: string): Promise<Medication[]> {
    const medications = await this.getAllMedications();
    return medications.filter(m => m.category === category);
  }

  /**
   * Get all drug interactions from GCS
   * Uses: drug-interactions.json
   */
  async getAllDrugInteractions(): Promise<DrugInteraction[]> {
    if (this.drugInteractionsCache) {
      return this.drugInteractionsCache;
    }

    console.log('💊 Fetching drug interactions from GCS...');
    const interactions = await fetchDrugInteractions();
    this.drugInteractionsCache = interactions as DrugInteraction[];
    console.log(`✅ Loaded ${interactions.length} drug interactions`);
    return this.drugInteractionsCache;
  }

  /**
   * Check drug interactions between a list of medications
   * Uses: drug-interactions.json via gcsDataService
   */
  async checkDrugInteractions(drugNames: string[]): Promise<{
    drug1: string;
    drug2: string;
    severity: 'critical' | 'major' | 'moderate' | 'minor';
    description: string;
    mechanism?: string;
    management?: string;
  }[]> {
    const medications = await this.getAllMedications();
    const allInteractions = await this.getAllDrugInteractions();
    const foundInteractions: any[] = [];

    // Find medications by name
    const drugs = drugNames.map(name =>
      medications.find(m =>
        m.name.toLowerCase() === name.toLowerCase() ||
        m.genericName.toLowerCase() === name.toLowerCase()
      )
    ).filter((m): m is Medication => Boolean(m));

    // Check for interactions in the drug-interactions.json database
    for (let i = 0; i < drugs.length; i++) {
      for (let j = i + 1; j < drugs.length; j++) {
        const drug1 = drugs[i];
        const drug2 = drugs[j];

        // Look up in drug-interactions.json
        const interaction = allInteractions.find(
          int =>
            (int.drug1Id === drug1.id && int.drug2Id === drug2.id) ||
            (int.drug1Id === drug2.id && int.drug2Id === drug1.id) ||
            (int.drug1Name?.toLowerCase() === drug1.genericName.toLowerCase() &&
              int.drug2Name?.toLowerCase() === drug2.genericName.toLowerCase()) ||
            (int.drug1Name?.toLowerCase() === drug2.genericName.toLowerCase() &&
              int.drug2Name?.toLowerCase() === drug1.genericName.toLowerCase())
        );

        if (interaction) {
          foundInteractions.push({
            drug1: drug1.name,
            drug2: drug2.name,
            severity: interaction.severity,
            description: interaction.description,
            mechanism: interaction.mechanism,
            management: interaction.management,
          });
        } else {
          // Fallback: Check medication's own interaction list
          const interaction1 = drug1.interactions?.find(int =>
            int.toLowerCase().includes(drug2.genericName.toLowerCase()) ||
            int.toLowerCase().includes(drug2.name.toLowerCase())
          );

          const interaction2 = drug2.interactions?.find(int =>
            int.toLowerCase().includes(drug1.genericName.toLowerCase()) ||
            int.toLowerCase().includes(drug1.name.toLowerCase())
          );

          if (interaction1 || interaction2) {
            foundInteractions.push({
              drug1: drug1.name,
              drug2: drug2.name,
              severity: 'moderate',
              description: interaction1 || interaction2 || 'Potential interaction detected',
            });
          }
        }
      }
    }

    // Sort by severity (critical first)
    const severityOrder: Record<string, number> = { critical: 0, major: 1, moderate: 2, minor: 3 };
    foundInteractions.sort((a, b) => (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4));

    return foundInteractions;
  }

  /**
   * Check interactions by drug IDs (faster if you have IDs)
   */
  async checkDrugInteractionsByIds(drugIds: string[]): Promise<any[]> {
    return gcsCheckDrugInteractions(drugIds);
  }

  // ===========================================================================
  // LAB TESTS
  // ===========================================================================

  /**
   * Get all lab tests
   */
  async getAllLabTests(): Promise<LabTestInfo[]> {
    if (this.labTestsCache) {
      return this.labTestsCache;
    }

    console.log('🧪 Fetching lab tests from GCS...');
    const labTests = await fetchLabTests();
    this.labTestsCache = labTests as LabTestInfo[];
    console.log(`✅ Loaded ${labTests.length} lab tests`);
    return this.labTestsCache;
  }

  /**
   * Search lab tests by name or code
   */
  async searchLabTests(query: string): Promise<LabTestInfo[]> {
    const labTests = await this.getAllLabTests();
    const lowerQuery = query.toLowerCase();

    return labTests.filter(test =>
      test.name.toLowerCase().includes(lowerQuery) ||
      test.code.toLowerCase().includes(lowerQuery) ||
      test.category.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get lab test by code
   */
  async getLabTestByCode(code: string): Promise<LabTestInfo | null> {
    const labTests = await this.getAllLabTests();
    return labTests.find(t => t.code === code) || null;
  }

  /**
   * Get lab tests by category
   */
  async getLabTestsByCategory(category: string): Promise<LabTestInfo[]> {
    const labTests = await this.getAllLabTests();
    return labTests.filter(t => t.category === category);
  }

  /**
   * Get reference range for a lab test
   */
  async getReferenceRange(
    testCode: string,
    ageGroup: AgeGroup = 'adult',
    gender?: 'male' | 'female'
  ): Promise<ReferenceRange | null> {
    const test = await this.getLabTestByCode(testCode);
    if (!test) return null;

    // Find matching reference range
    return test.referenceRanges.find(r =>
      (r.ageGroup === ageGroup || r.ageGroup === 'all') &&
      (!gender || r.gender === gender || r.gender === 'all')
    ) || test.referenceRanges[0] || null;
  }

  /**
   * Interpret lab result
   */
  async interpretLabResult(
    testCode: string,
    value: number,
    ageGroup: AgeGroup = 'adult',
    gender?: 'male' | 'female'
  ): Promise<{
    status: 'normal' | 'low' | 'high' | 'critical';
    interpretation: string;
    referenceRange: ReferenceRange | null;
  }> {
    const range = await this.getReferenceRange(testCode, ageGroup, gender);

    if (!range) {
      return {
        status: 'normal',
        interpretation: 'Reference range not available',
        referenceRange: null,
      };
    }

    let status: 'normal' | 'low' | 'high' | 'critical' = 'normal';
    let interpretation = '';

    if (range.min !== undefined && value < range.min) {
      status = 'low';
      interpretation = `Value is below normal range (${range.min} - ${range.max} ${range.unit})`;
    } else if (range.max !== undefined && value > range.max) {
      status = 'high';
      interpretation = `Value is above normal range (${range.min} - ${range.max} ${range.unit})`;
    } else {
      interpretation = `Value is within normal range (${range.min} - ${range.max} ${range.unit})`;
    }

    return { status, interpretation, referenceRange: range };
  }

  // ===========================================================================
  // ICD-10 CODES
  // ===========================================================================

  /**
   * Get all ICD-10 codes
   */
  async getAllICD10Codes(): Promise<ICD10Code[]> {
    if (this.icd10Cache) {
      return this.icd10Cache;
    }

    console.log('📋 Fetching ICD-10 codes from GCS...');
    const codes = await fetchICD10Codes();
    this.icd10Cache = codes as ICD10Code[];
    console.log(`✅ Loaded ${codes.length} ICD-10 codes`);
    return this.icd10Cache;
  }

  /**
   * Search ICD-10 codes by code or description
   */
  async searchICD10Codes(query: string): Promise<ICD10Code[]> {
    const codes = await this.getAllICD10Codes();
    const lowerQuery = query.toLowerCase();

    return codes.filter(code =>
      code.code.toLowerCase().includes(lowerQuery) ||
      code.description.toLowerCase().includes(lowerQuery) ||
      code.category.toLowerCase().includes(lowerQuery) ||
      code.keywords?.some(k => k.toLowerCase().includes(lowerQuery))
    ).slice(0, 50); // Limit results
  }

  /**
   * Get ICD-10 code by exact code
   */
  async getICD10ByCode(code: string): Promise<ICD10Code | null> {
    const codes = await this.getAllICD10Codes();
    return codes.find(c => c.code === code) || null;
  }

  /**
   * Get ICD-10 codes by category
   */
  async getICD10ByCategory(category: string): Promise<ICD10Code[]> {
    const codes = await this.getAllICD10Codes();
    return codes.filter(c => c.category === category);
  }

  // ===========================================================================
  // CACHE MANAGEMENT
  // ===========================================================================

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.medicationsCache = null;
    this.labTestsCache = null;
    this.icd10Cache = null;
    this.drugInteractionsCache = null;
    this.referenceRangesCache = null;
    console.log('🗑️ Reference data cache cleared');
  }

  // ===========================================================================
  // REFERENCE RANGES (from reference-ranges.json)
  // ===========================================================================

  /**
   * Get all reference ranges from GCS
   * Uses: reference-ranges.json
   */
  async getAllReferenceRanges(): Promise<ReferenceRange[]> {
    if (this.referenceRangesCache) {
      return this.referenceRangesCache;
    }

    console.log('📏 Fetching reference ranges from GCS...');
    const ranges = await fetchReferenceRanges();
    this.referenceRangesCache = ranges as ReferenceRange[];
    console.log(`✅ Loaded ${ranges.length} reference ranges`);
    return this.referenceRangesCache;
  }

  /**
   * Get reference range for a specific test from reference-ranges.json
   */
  async getReferenceRangeFromFile(
    testCode: string,
    ageGroup?: AgeGroup,
    gender?: 'male' | 'female'
  ): Promise<ReferenceRange | null> {
    return gcsGetReferenceRange(testCode, ageGroup, gender);
  }

  /**
   * Preload all reference data
   */
  async preloadAll(): Promise<void> {
    console.log('📥 Preloading all reference data...');

    await Promise.all([
      this.getAllMedications(),
      this.getAllLabTests(),
      this.getAllICD10Codes(),
      this.getAllDrugInteractions(),
      this.getAllReferenceRanges(),
    ]);

    console.log('✅ All reference data preloaded');
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /**
   * Get common medications (frequently prescribed)
   */
  async getCommonMedications(): Promise<Medication[]> {
    const medications = await this.getAllMedications();
    // Return first 20 or those marked as common
    return medications.slice(0, 20);
  }

  /**
   * Get common lab panels (CBC, CMP, etc.)
   */
  async getCommonLabPanels(): Promise<string[]> {
    return [
      'Complete Blood Count (CBC)',
      'Comprehensive Metabolic Panel (CMP)',
      'Basic Metabolic Panel (BMP)',
      'Lipid Panel',
      'Liver Function Tests (LFTs)',
      'Thyroid Panel',
      'Urinalysis',
      'HbA1c',
    ];
  }

  /**
   * Get common diagnoses
   */
  async getCommonDiagnoses(): Promise<ICD10Code[]> {
    const codes = await this.getAllICD10Codes();
    // Return common conditions
    const commonCodes = new Set(['J06.9', 'I10', 'E11.9', 'J18.9', 'K21.0', 'F32.9', 'M54.5']);
    return codes.filter(c => commonCodes.has(c.code));
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const referenceDataService = ReferenceDataService.getInstance();
export default referenceDataService;
