/**
 * ============================================================================
 * SHARED PHR TYPES - Used by both Patient and Doctor Portals
 * ============================================================================
 * 
 * These types define the standard PHR (Personal Health Record) data structure
 * that must be consistent between the Patient Portal and Doctor Portal.
 * 
 * File: patients/{patientId}/phr.json
 * 
 * @version 2.0.0
 * @date December 2025
 */

// ============================================================================
// VITAL SIGNS - Standardized Structure
// ============================================================================

export interface BloodPressure {
  systolic: number;
  diastolic: number;
  unit: 'mmHg';
}

export interface VitalMeasurement {
  value: number;
  unit: string;
}

export interface BloodGlucoseMeasurement extends VitalMeasurement {
  testType?: 'fasting' | 'random' | 'postprandial';
}

export interface SharedVitalSigns {
  bloodPressure?: BloodPressure;
  heartRate?: VitalMeasurement;
  temperature?: {
    value: number;
    unit: 'celsius' | 'fahrenheit';
  };
  respiratoryRate?: VitalMeasurement;
  oxygenSaturation?: VitalMeasurement;
  bloodGlucose?: BloodGlucoseMeasurement;
  weight?: VitalMeasurement;
  height?: VitalMeasurement;
  bmi?: number;
  measuredAt: string; // ISO Date string
  notes?: string;
  source?: 'patient_input' | 'device' | 'clinic' | 'wearable';
}

// ============================================================================
// DEMOGRAPHICS - Standardized Structure
// ============================================================================

export interface SharedDemographics {
  name: string;
  dateOfBirth?: string;
  age?: number;
  gender: 'male' | 'female' | 'other';
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-';
  height?: number; // cm
  weight?: number; // kg
  ethnicity?: string;
  occupation?: string;
  nationalId?: string;
  phone?: string;
  email?: string;
  address?: string;
}

// ============================================================================
// MEDICATION - Standardized Structure
// ============================================================================

export interface SharedMedication {
  id: string;
  name: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  route: 'oral' | 'injection' | 'topical' | 'inhalation' | 'sublingual' | 'other';
  startDate: string; // ISO Date
  endDate?: string; // ISO Date
  prescribedBy?: string;
  prescribedByDoctorId?: string;
  purpose?: string;
  sideEffects?: string[];
  instructions?: string;
  refillsRemaining?: number;
  status: 'active' | 'completed' | 'discontinued' | 'on_hold';
  source: 'prescription' | 'self_reported' | 'otc';
}

// ============================================================================
// ALLERGY - Standardized Structure
// ============================================================================

export interface SharedAllergy {
  id: string;
  allergen: string;
  type: 'medication' | 'food' | 'environmental' | 'other';
  severity: 'mild' | 'moderate' | 'severe' | 'life_threatening';
  reaction?: string;
  onsetDate?: string;
  confirmedBy?: string;
  notes?: string;
}

// ============================================================================
// CHRONIC CONDITION - Standardized Structure
// ============================================================================

export interface SharedChronicCondition {
  id: string;
  condition: string;
  icdCode?: string;
  diagnosedDate?: string;
  diagnosedBy?: string;
  diagnosedByDoctorId?: string;
  status: 'active' | 'resolved' | 'in_remission' | 'managed';
  notes?: string;
  lastReviewDate?: string;
}

// ============================================================================
// VACCINATION - Standardized Structure
// ============================================================================

export interface SharedVaccination {
  id: string;
  vaccineName: string;
  vaccineType?: string;
  date: string; // ISO Date
  manufacturer?: string;
  lotNumber?: string;
  site?: string;
  administeredBy?: string;
  facility?: string;
  nextDueDate?: string;
  doseNumber?: number;
  totalDoses?: number;
  notes?: string;
}

// ============================================================================
// LIFESTYLE DATA - Standardized Structure
// ============================================================================

export interface SharedLifestyleData {
  smokingStatus: 'never' | 'former' | 'current' | 'unknown';
  smokingDetails?: {
    packsPerDay?: number;
    yearsSmoked?: number;
    quitDate?: string;
  };
  alcoholConsumption: 'never' | 'occasional' | 'moderate' | 'heavy' | 'unknown';
  alcoholDetails?: {
    drinksPerWeek?: number;
    preferredType?: string;
  };
  exerciseFrequency: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  exerciseDetails?: {
    minutesPerWeek?: number;
    preferredActivities?: string[];
  };
  dietType?: 'omnivore' | 'vegetarian' | 'vegan' | 'pescatarian' | 'other';
  dietaryRestrictions?: string[];
  sleepHours?: number;
  stressLevel?: 'low' | 'moderate' | 'high' | 'severe';
  occupation?: string;
  lastUpdated?: string;
}

// ============================================================================
// WEARABLE/DEVICE DATA - Standardized Structure
// ============================================================================

export interface SharedWearableData {
  source: string;
  lastSyncDate: string;
  steps?: number;
  caloriesBurned?: number;
  activeMinutes?: number;
  sleepData?: {
    totalHours: number;
    deepSleepHours?: number;
    remSleepHours?: number;
    lightSleepHours?: number;
    awakenings?: number;
  };
  heartRateData?: {
    resting: number;
    average: number;
    max: number;
    min: number;
  };
  spo2Average?: number;
}

// ============================================================================
// EMERGENCY CONTACT - Standardized Structure
// ============================================================================

export interface SharedEmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  isPrimary: boolean;
}

// ============================================================================
// MEDICAL DOCUMENT - Standardized Structure
// ============================================================================

export interface SharedMedicalDocument {
  id: string;
  type: 'lab_result' | 'imaging' | 'prescription' | 'discharge_summary' | 'referral' | 'report' | 'other';
  title: string;
  description?: string;
  uploadDate: string;
  documentDate?: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: 'patient' | 'doctor' | 'system';
  uploadedById?: string;
  tags?: string[];
  isSharedWithDoctors: boolean;
}

// ============================================================================
// LIVING WILL (E-Living) - PDPA Compliant Structure
// ============================================================================

/**
 * Treatment preference for a specific medical situation
 */
export interface LivingWillTreatment {
  treatmentType: string;
  preference: 'accept' | 'refuse' | 'conditional';
  conditions?: string;
  notes?: string;
}

/**
 * Treatment preferences by category
 */
export interface LivingWillTreatments {
  cpr: LivingWillTreatment;
  mechanicalVentilation: LivingWillTreatment;
  artificialNutrition: LivingWillTreatment;
  dialysis: LivingWillTreatment;
  antibiotics: LivingWillTreatment;
  painManagement: LivingWillTreatment;
  organDonation: LivingWillTreatment;
  otherTreatments?: LivingWillTreatment[];
}

/**
 * Healthcare representative/proxy
 */
export interface LivingWillRepresentative {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  address?: string;
  isMainRepresentative: boolean;
  authorizationLevel: 'full' | 'limited' | 'specific';
  limitations?: string;
  validFrom: string;
  validUntil?: string;
}

/**
 * Digital signature information
 */
export interface LivingWillSignature {
  signedAt: string;
  signatureMethod: 'digital' | 'biometric' | 'password';
  signatureData?: string;
  ipAddress?: string;
  deviceInfo?: string;
}

/**
 * PDPA Consent for Living Will sharing
 */
export interface LivingWillPDPAConsent {
  consentVersion: string;
  consentedAt: string;
  isSharedWithDoctors: boolean;
  shareScope: 'all_treating_doctors' | 'specific_doctors' | 'none';
  specificDoctorIds?: string[];
  shareWithAdmin: boolean;
  consentPurpose: string;
  dataRetentionPeriod: string;
  canWithdraw: boolean;
  lastUpdated: string;
}

/**
 * Audit log entry for Living Will changes
 */
export interface LivingWillAuditEntry {
  id: string;
  action: 'created' | 'updated' | 'shared' | 'unshared' | 'revoked' | 'viewed';
  performedBy: 'patient' | 'doctor' | 'admin' | 'system';
  performedById: string;
  performedByName?: string;
  timestamp: string;
  ipAddress?: string;
  changes?: {
    field: string;
    oldValue?: string;
    newValue?: string;
  }[];
  notes?: string;
}

/**
 * Complete Living Will document
 */
export interface LivingWill {
  // Identifiers
  id: string;
  patientId: string;
  version: string;
  
  // Status
  status: 'draft' | 'active' | 'suspended' | 'revoked';
  effectiveDate: string;
  expirationDate?: string;
  
  // Content
  treatments: LivingWillTreatments;
  personalStatement?: string;
  religiousBeliefs?: string;
  culturalConsiderations?: string;
  additionalInstructions?: string;
  
  // Representatives
  representatives: LivingWillRepresentative[];
  
  // PDPA Consent
  pdpaConsent: LivingWillPDPAConsent;
  
  // Witness Information (Thai law requirement)
  witnesses?: {
    name: string;
    relationship?: string;
    idNumber?: string;
    signedAt: string;
  }[];
  
  // Signature
  signature: LivingWillSignature;
  
  // Audit Trail
  auditLog: LivingWillAuditEntry[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  lastReviewedAt?: string;
  nextReviewDate?: string;
  
  // Document attachments (e.g., scanned forms)
  attachments?: {
    id: string;
    fileName: string;
    fileUrl: string;
    uploadedAt: string;
    description?: string;
  }[];
}

/**
 * Living Will view for doctors - filtered based on PDPA consent
 */
export interface LivingWillForDoctor {
  // Basic info
  id: string;
  patientId: string;
  patientName: string;
  version: string;
  status: 'draft' | 'active' | 'suspended' | 'revoked';
  effectiveDate: string;
  
  // Treatment preferences (main content)
  treatments: LivingWillTreatments;
  
  // Personal statements
  personalStatement?: string;
  additionalInstructions?: string;
  
  // Emergency contact - main representative only
  mainRepresentative?: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  };
  
  // Sharing info
  isSharedByPatient: boolean;
  sharedAt?: string;
  
  // Timestamps
  lastUpdated: string;
}

/**
 * Convert full Living Will to doctor view
 */
export function convertLivingWillToDoctorView(
  livingWill: LivingWill,
  patientName: string
): LivingWillForDoctor | null {
  // Check PDPA consent
  if (!livingWill.pdpaConsent.isSharedWithDoctors) {
    return null;
  }
  
  const mainRep = livingWill.representatives.find(r => r.isMainRepresentative);
  
  return {
    id: livingWill.id,
    patientId: livingWill.patientId,
    patientName,
    version: livingWill.version,
    status: livingWill.status,
    effectiveDate: livingWill.effectiveDate,
    treatments: livingWill.treatments,
    personalStatement: livingWill.personalStatement,
    additionalInstructions: livingWill.additionalInstructions,
    mainRepresentative: mainRep ? {
      name: mainRep.name,
      relationship: mainRep.relationship,
      phone: mainRep.phone,
      email: mainRep.email,
    } : undefined,
    isSharedByPatient: true,
    sharedAt: livingWill.pdpaConsent.consentedAt,
    lastUpdated: livingWill.updatedAt,
  };
}

/**
 * Create empty Living Will template
 */
export function createEmptyLivingWill(patientId: string): LivingWill {
  const now = new Date().toISOString();
  return {
    id: `lw-${patientId}-${Date.now()}`,
    patientId,
    version: '1.0',
    status: 'draft',
    effectiveDate: now,
    treatments: {
      cpr: { treatmentType: 'CPR', preference: 'conditional' },
      mechanicalVentilation: { treatmentType: 'Mechanical Ventilation', preference: 'conditional' },
      artificialNutrition: { treatmentType: 'Artificial Nutrition', preference: 'conditional' },
      dialysis: { treatmentType: 'Dialysis', preference: 'conditional' },
      antibiotics: { treatmentType: 'Antibiotics', preference: 'accept' },
      painManagement: { treatmentType: 'Pain Management', preference: 'accept' },
      organDonation: { treatmentType: 'Organ Donation', preference: 'conditional' },
    },
    representatives: [],
    pdpaConsent: {
      consentVersion: '1.0',
      consentedAt: now,
      isSharedWithDoctors: false,
      shareScope: 'none',
      shareWithAdmin: false,
      consentPurpose: 'Medical decision support when patient cannot communicate',
      dataRetentionPeriod: 'Until revoked by patient or 10 years after death',
      canWithdraw: true,
      lastUpdated: now,
    },
    signature: {
      signedAt: '',
      signatureMethod: 'digital',
    },
    auditLog: [{
      id: `audit-${Date.now()}`,
      action: 'created',
      performedBy: 'patient',
      performedById: patientId,
      timestamp: now,
    }],
    createdAt: now,
    updatedAt: now,
  };
}

// ============================================================================
// COMPLETE PHR RECORD - Full Standardized Structure
// ============================================================================

export interface SharedPHRRecord {
  // Identifiers
  id: string;
  patientId: string;
  version: string;
  
  // Demographics
  demographics: SharedDemographics;
  
  // Vital Signs History (sorted by measuredAt, newest first)
  vitalSignsHistory: SharedVitalSigns[];
  
  // Current/Latest Vitals
  latestVitals?: SharedVitalSigns;
  
  // Medical Information
  allergies: SharedAllergy[];
  chronicConditions: SharedChronicCondition[];
  currentMedications: SharedMedication[];
  vaccinations: SharedVaccination[];
  
  // Lifestyle
  lifestyle: SharedLifestyleData;
  
  // Device/Wearable Data
  wearableData?: SharedWearableData;
  
  // Documents
  documents: SharedMedicalDocument[];
  
  // Emergency Contacts
  emergencyContacts: SharedEmergencyContact[];
  
  // Family History
  familyHistory?: {
    condition: string;
    relationship: string;
    notes?: string;
  }[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  lastModifiedBy: 'patient' | 'doctor' | 'system';
  lastModifiedById?: string;
  
  // Consent & Visibility
  sharedWithDoctorIds?: string[];
  consentVersion?: string;
}

// ============================================================================
// PHR VIEW RESPONSE - What Doctor Portal Receives
// ============================================================================

export interface PHRViewForDoctor {
  patientId: string;
  demographics: SharedDemographics;
  
  // Key medical info for quick view
  allergies: string[];
  chronicConditions: string[];
  currentMedications: {
    name: string;
    dosage: string;
    frequency: string;
    startDate: string;
  }[];
  
  // Latest vitals
  vitalSigns: {
    date: Date;
    bloodPressure: BloodPressure;
    heartRate: number;
    temperature: number;
    oxygenSaturation: number;
    bloodGlucose?: number;
    weight?: number;
    height?: number;
    bmi?: number;
  }[];
  
  // Lifestyle summary
  lifestyle: {
    smoking: boolean;
    alcohol: boolean;
    exercise: string;
    diet: string;
    sleep: string;
  };
  
  // Vaccinations
  vaccinations: {
    vaccine: string;
    date: Date;
    nextDue?: Date;
  }[];
  
  // Wearable data (if available)
  wearableData?: {
    steps: number;
    caloriesBurned: number;
    sleepHours: number;
    activeMinutes: number;
  };
  
  // Last updated
  lastUpdated: string;
}

// ============================================================================
// CONVERSION UTILITIES
// ============================================================================

/**
 * Convert full SharedPHRRecord to PHRViewForDoctor
 */
export function convertPHRToDoctorView(phr: SharedPHRRecord): PHRViewForDoctor {
  return {
    patientId: phr.patientId,
    demographics: phr.demographics,
    allergies: phr.allergies.map(a => a.allergen),
    chronicConditions: phr.chronicConditions.map(c => c.condition),
    currentMedications: phr.currentMedications
      .filter(m => m.status === 'active')
      .map(m => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        startDate: m.startDate,
      })),
    vitalSigns: phr.vitalSignsHistory.slice(0, 10).map(v => ({
      date: new Date(v.measuredAt),
      bloodPressure: v.bloodPressure || { systolic: 0, diastolic: 0, unit: 'mmHg' },
      heartRate: v.heartRate?.value || 0,
      temperature: v.temperature?.value || 0,
      oxygenSaturation: v.oxygenSaturation?.value || 0,
      bloodGlucose: v.bloodGlucose?.value,
      weight: v.weight?.value,
      height: v.height?.value,
      bmi: v.bmi,
    })),
    lifestyle: {
      smoking: phr.lifestyle.smokingStatus === 'current',
      alcohol: phr.lifestyle.alcoholConsumption !== 'never',
      exercise: phr.lifestyle.exerciseFrequency || 'Unknown',
      diet: phr.lifestyle.dietType || 'Unknown',
      sleep: phr.lifestyle.sleepHours ? `${phr.lifestyle.sleepHours} hours` : 'Unknown',
    },
    vaccinations: phr.vaccinations.map(v => ({
      vaccine: v.vaccineName,
      date: new Date(v.date),
      nextDue: v.nextDueDate ? new Date(v.nextDueDate) : undefined,
    })),
    wearableData: phr.wearableData ? {
      steps: phr.wearableData.steps || 0,
      caloriesBurned: phr.wearableData.caloriesBurned || 0,
      sleepHours: phr.wearableData.sleepData?.totalHours || 0,
      activeMinutes: phr.wearableData.activeMinutes || 0,
    } : undefined,
    lastUpdated: phr.updatedAt,
  };
}

/**
 * Create empty PHR record for new patient
 */
export function createEmptyPHR(patientId: string, name: string): SharedPHRRecord {
  const now = new Date().toISOString();
  
  return {
    id: `phr_${patientId}`,
    patientId,
    version: '2.0.0',
    demographics: {
      name,
      gender: 'other',
    },
    vitalSignsHistory: [],
    allergies: [],
    chronicConditions: [],
    currentMedications: [],
    vaccinations: [],
    lifestyle: {
      smokingStatus: 'unknown',
      alcoholConsumption: 'unknown',
      exerciseFrequency: 'moderate',
    },
    documents: [],
    emergencyContacts: [],
    createdAt: now,
    updatedAt: now,
    lastModifiedBy: 'patient',
  };
}
