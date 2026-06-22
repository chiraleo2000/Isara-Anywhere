/**
 * Patient Record Service — PostgreSQL API Layer
 *
 * Fetches patient data from Doctor Portal API endpoints that read from
 * the shared izara_phase1 PostgreSQL database.
 *
 * Endpoints:
 *   GET /api/patients/:patientId/phr  → PHR + vitals + living will
 *   GET /api/patients/:patientId/emr  → EMR SOAP timeline
 *   GET /api/patients/:patientId/ehr  → Lab results + external records
 *
 * All endpoints are PDPA-protected (server validates consent per request).
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PHRData {
  patientId: string;
  demographics: {
    name: string;
    age: number;
    sex: string;
    weight: number;
    height: number;
    bmi: number;
    bloodType?: string;
  };
  vitalsSummary: VitalEntry[];
  medications: MedicationEntry[];
  allergies: AllergyEntry[];
  chronicConditions: ChronicConditionEntry[];
  lifestyle: {
    diet: string | null;
    exercise: string | null;
    sleepHours: string | null;
    smoking: string | null;
    alcohol: string | null;
  };
  livingWill: LivingWillForDoctorView | null;
}

export interface VitalEntry {
  id: string;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  heartRate: number | null;
  temperature: number | null;
  weight: number | null;
  bloodGlucose: number | null;
  measuredAt: string;
  source: string;
}

export interface MedicationEntry {
  name: string;
  dosage: string;
  frequency: string;
  status: 'active' | 'stopped' | (string & {});
}

export interface AllergyEntry {
  allergen: string;
  severity: 'high' | 'medium' | 'low' | (string & {});
  reaction: string;
}

export interface ChronicConditionEntry {
  name: string;
  diagnosedDate: string | null;
  status: string;
}

// Living Will types for doctor view
export interface LivingWillTreatmentView {
  treatmentType: string;
  preference: 'accept' | 'refuse' | 'conditional';
  conditions?: string;
  notes?: string;
}

export interface LivingWillTreatmentsView {
  cpr: LivingWillTreatmentView;
  mechanicalVentilation: LivingWillTreatmentView;
  artificialNutrition: LivingWillTreatmentView;
  dialysis: LivingWillTreatmentView;
  antibiotics: LivingWillTreatmentView;
  painManagement: LivingWillTreatmentView;
  organDonation: LivingWillTreatmentView;
  otherTreatments?: LivingWillTreatmentView[];
}

export interface LivingWillForDoctorView {
  id: string;
  patientId: string;
  patientName: string;
  version: string;
  status: 'draft' | 'active' | 'suspended' | 'revoked';
  effectiveDate: string;
  treatments: LivingWillTreatmentsView;
  personalStatement?: string;
  additionalInstructions?: string;
  mainRepresentative?: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  };
  authorized?: boolean;
  isSharedByPatient: boolean;
  sharedAt?: string;
  lastUpdated: string;
}

/** Response from the living will endpoint — may be full data, exists-but-not-shared, or null */
export type LivingWillResponse =
  | LivingWillForDoctorView
  | { exists: true; isShared: false; authorized: false; message: string }
  | null;

export interface EMRRecord {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  encounterDate: string;
  subjective: Record<string, unknown> | null;
  objective: Record<string, unknown> | null;
  assessment: Record<string, unknown> | null;
  plan: Record<string, unknown> | null;
  aiSummary: string | null;
  aiGenerated: boolean;
  aiApproved: boolean;
  aiApprovedBy: string | null;
  patientInstructions: string | null;
  status: 'draft' | 'signed' | 'finalized';
  signedAt: string | null;
  prescriptionCount: number;
  labOrderCount: number;
}

export interface LabTestResult {
  name: string;
  value: string;
  unit: string;
  normalRange: string;
  flag: 'HIGH' | 'LOW' | 'NORMAL' | 'CRITICAL' | (string & {});
}

export interface LabResultGroup {
  id: string;
  orderDate: string;
  completedDate: string;
  doctorName: string;
  tests: LabTestResult[];
  aiAnalysis: string | null;
  priority: string;
}

export interface EHRData {
  labGroups: LabResultGroup[];
  externalRecords: ExternalRecord[];
  patientId: string;
}

export interface ExternalRecord {
  id: string;
  documentType: string;
  uploadedAt: string;
  uploadedBy: string;
  viewUrl: string;
}

// ============================================================================
// API HELPERS
// ============================================================================

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...options, headers: { ...getAuthHeaders(), ...options?.headers } });
  if (res.status === 403) {
    throw new Error('PDPA consent required to access this patient\'s records');
  }
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

// ============================================================================
// PATIENT RECORD SERVICE
// ============================================================================

type CacheEntry<T> = { data: T; ts: number };

class PatientRecordService {
  private static instance: PatientRecordService;
  private readonly cache = new Map<string, CacheEntry<unknown>>();

  private constructor() {}

  static getInstance(): PatientRecordService {
    if (!PatientRecordService.instance) {
      PatientRecordService.instance = new PatientRecordService();
    }
    return PatientRecordService.instance;
  }

  /** Clear cache when modal closes / patient changes */
  clearCache(): void {
    this.cache.clear();
  }

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry) return entry.data as T;
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, ts: Date.now() });
  }

  // ===========================================================================
  // PHR — calls GET /api/patients/:patientId/phr
  // ===========================================================================

  async getPHR(patientId: string): Promise<PHRData | null> {
    const cacheKey = `phr:${patientId}`;
    const cached = this.getCached<PHRData>(cacheKey);
    if (cached) return cached;

    try {
      const data = await apiFetch<PHRData>(`/api/patients/${encodeURIComponent(patientId)}/phr`);
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching PHR:', error);
      return null;
    }
  }

  // ===========================================================================
  // Living Will — calls GET /api/patients/:patientId/living-will
  // ===========================================================================

  async getLivingWill(patientId: string): Promise<LivingWillResponse> {
    const cacheKey = `lw:${patientId}`;
    const cached = this.getCached<LivingWillResponse>(cacheKey);
    if (cached !== null) return cached;

    try {
      const data = await apiFetch<LivingWillResponse>(`/api/patients/${encodeURIComponent(patientId)}/living-will`);
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching Living Will:', error);
      return null;
    }
  }

  // ===========================================================================
  // EMR — calls GET /api/patients/:patientId/emr
  // ===========================================================================

  async getEMRs(patientId: string): Promise<EMRRecord[]> {
    const cacheKey = `emr:${patientId}`;
    const cached = this.getCached<EMRRecord[]>(cacheKey);
    if (cached) return cached;

    try {
      const res = await apiFetch<{ emrs: EMRRecord[] }>(`/api/patients/${encodeURIComponent(patientId)}/emr`);
      const emrs = res.emrs || [];
      this.setCache(cacheKey, emrs);
      return emrs;
    } catch (error) {
      console.error('Error fetching EMRs:', error);
      return [];
    }
  }

  // ===========================================================================
  // EHR — calls GET /api/patients/:patientId/ehr
  // ===========================================================================

  async getEHR(patientId: string): Promise<EHRData | null> {
    const cacheKey = `ehr:${patientId}`;
    const cached = this.getCached<EHRData>(cacheKey);
    if (cached) return cached;

    try {
      const data = await apiFetch<EHRData>(`/api/patients/${encodeURIComponent(patientId)}/ehr`);
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching EHR:', error);
      return null;
    }
  }

  // ===========================================================================
  // PDPA — consent check & request access
  // ===========================================================================

  async checkPDPAConsent(patientId: string): Promise<{
    hasConsent: boolean;
    isEmergencyBypass?: boolean;
    isBroadConsent?: boolean;
    appointmentId?: string;
    consent?: unknown;
  }> {
    try {
      return await apiFetch<{
        hasConsent: boolean;
        isEmergencyBypass?: boolean;
        isBroadConsent?: boolean;
        appointmentId?: string;
        consent?: unknown;
      }>(`/api/pdpa/check/${encodeURIComponent(patientId)}`);
    } catch (error) {
      console.error('Error checking PDPA consent:', error);
      return { hasConsent: false };
    }
  }

  async requestAccess(patientId: string): Promise<{ success: boolean; requestSent?: boolean; message?: string }> {
    try {
      return await apiFetch<{ success: boolean; requestSent?: boolean; message?: string }>(
        '/api/pdpa/request-access',
        { method: 'POST', body: JSON.stringify({ patient_id: patientId }), headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Error requesting access:', error);
      return { success: false };
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const patientRecordService = PatientRecordService.getInstance();
export default patientRecordService;
