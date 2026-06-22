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
  source: string; // e.g., 'Apple Watch', 'Fitbit', etc.
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
  allergies: string[]; // Simplified list
  chronicConditions: string[]; // Simplified list
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
