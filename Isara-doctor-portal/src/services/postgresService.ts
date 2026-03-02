/**
 * PostgreSQL Database Service - Phase 1
 * 
 * Handles all database operations for Izara Telemedicine
 * Replaces GCS with PostgreSQL for local and cloud deployment
 * 
 * Databases:
 * - izara-users-credentials (Auth)
 * - izara-patients-data (Patient PHR)
 * - izara-doctors-data (Doctor profiles)
 * - izara-appointments (Appointments, EMR)
 * - izara-meta-data (Reference data, AI knowledge)
 */

// Configuration
const DB_CONFIG = {
  host: import.meta.env.VITE_DB_HOST || 'localhost',
  port: Number.parseInt(import.meta.env.VITE_DB_PORT || '5432', 10),
  database: import.meta.env.VITE_DB_NAME || 'izara_phase1',
  user: import.meta.env.VITE_DB_USER || 'postgres',
  password: import.meta.env.VITE_DB_PASSWORD || '',
};

// API Base URL (backend handles actual DB connection)
const API_BASE = import.meta.env.VITE_API_URL || '';

// ============================================================================
// TYPES
// ============================================================================

export interface DBQueryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
}

export interface UserRecord {
  id: string;
  email: string;
  role: 'doctor' | 'admin' | 'patient';
  name: string;
  nameThai?: string;
  doctorId?: string;
  patientId?: string;
  isActive: boolean;
  isAdmin?: boolean;
  adminPrivileges?: AdminPrivileges;
  preferences?: UserPreferences;
  createdAt: string;
  lastLogin?: string;
}

export interface AdminPrivileges {
  canManageDoctors: boolean;
  canManagePatients: boolean;
  canManageAppointments: boolean;
  canViewAnalytics: boolean;
  canManageSettings: boolean;
  level: 'super_admin' | 'admin' | 'moderator';
}

export interface UserPreferences {
  language: 'th' | 'en';
  theme: 'light' | 'dark';
  notifications: boolean;
}

export interface PHRRecord {
  id: string;
  patientId: string;
  demographics: PatientDemographics;
  vitalSignsHistory: VitalSign[];
  allergies: Allergy[];
  chronicConditions: ChronicCondition[];
  medications: Medication[];
  vaccinations: Vaccination[];
  lifestyle?: LifestyleData;
  familyHistory?: FamilyHistoryItem[];
  latestLabResults?: LabResult[];
  clinicalDecisionSupport?: CDSData;
}

export interface PatientDemographics {
  name: string;
  nameThai?: string;
  dateOfBirth: string;
  age?: number;
  gender: string;
  bloodType?: string;
  height?: number;
  weight?: number;
  phone?: string;
  email?: string;
  address?: string;
  nationalId?: string;
  insuranceType?: string;
}

export interface VitalSign {
  bloodPressure?: { systolic: number; diastolic: number; unit: string };
  heartRate?: { value: number; unit: string };
  temperature?: { value: number; unit: string };
  oxygenSaturation?: { value: number; unit: string };
  weight?: { value: number; unit: string };
  height?: { value: number; unit: string };
  bmi?: number;
  bloodGlucose?: { value: number; unit: string; testType?: string };
  measuredAt: string;
  source?: string;
  notes?: string;
}

export interface Allergy {
  id: string;
  allergen: string;
  type: 'medication' | 'food' | 'environmental' | 'other';
  severity: 'mild' | 'moderate' | 'severe' | 'life_threatening';
  reaction?: string;
  notes?: string;
}

export interface ChronicCondition {
  id: string;
  condition: string;
  conditionThai?: string;
  icdCode?: string;
  diagnosedDate?: string;
  status: 'active' | 'resolved' | 'managed';
  notes?: string;
}

export interface Medication {
  id: string;
  name: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  route: string;
  startDate: string;
  endDate?: string;
  prescribedBy?: string;
  purpose?: string;
  instructions?: string;
  status: 'active' | 'completed' | 'discontinued';
  contraindications?: string[];
  notes?: string;
}

export interface Vaccination {
  id: string;
  vaccineName: string;
  date: string;
  doseNumber?: number;
  totalDoses?: number;
  facility?: string;
  notes?: string;
}

export interface LifestyleData {
  smokingStatus: string;
  alcoholConsumption: string;
  exerciseFrequency: string;
  dietType?: string;
  dietaryRestrictions?: string[];
  sleepHours?: number;
  stressLevel?: string;
  lastUpdated?: string;
}

export interface FamilyHistoryItem {
  condition: string;
  conditionThai?: string;
  relationship: string;
  notes?: string;
}

export interface LabResult {
  testName: string;
  testNameThai?: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'abnormal' | 'critical';
  testedAt: string;
  notes?: string;
}

export interface CDSData {
  riskFactors?: string[];
  cardiovascularRisk?: string;
  ckdProgression?: string;
  medicationAlerts?: string[];
  guidelinesApplied?: string[];
}

export interface AppointmentRecord {
  id: string;
  patientId: string;
  doctorId?: string;
  requestedDate: string;
  requestedTime: string;
  confirmedDate?: string;
  confirmedTime?: string;
  appointmentType: string;
  status: string;
  urgencyLevel: string;
  symptoms: string[];
  symptomDescription?: string;
  aiTriage?: any;
  notes?: string;
  meetLink?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EMRRecord {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  subjective?: any;
  objective?: any;
  assessment?: any;
  plan?: any;
  aiSummary?: string;
  aiSummaryApproved: boolean;
  patientInstructions?: string;
  patientInstructionsThai?: string;
  doctorSignature?: string;
  signedAt?: string;
  status: 'draft' | 'signed' | 'amended';
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// API HELPER FUNCTIONS
// ============================================================================

async function apiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<DBQueryResult<T>> {
  try {
    const response = await fetch(`${API_BASE}/api${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      data: data.data || data,
      count: data.count,
    };
  } catch (error) {
    console.error('DB API Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// USER OPERATIONS
// ============================================================================

export async function getUser(userId: string): Promise<DBQueryResult<UserRecord>> {
  return apiRequest<UserRecord>(`/users/${userId}`);
}

export async function getUserByEmail(email: string): Promise<DBQueryResult<UserRecord>> {
  return apiRequest<UserRecord>(`/users/email/${encodeURIComponent(email)}`);
}

export async function getAllDoctors(): Promise<DBQueryResult<UserRecord[]>> {
  return apiRequest<UserRecord[]>('/users/role/doctor');
}

export async function getAllPatients(): Promise<DBQueryResult<UserRecord[]>> {
  return apiRequest<UserRecord[]>('/users/role/patient');
}

export async function updateUser(userId: string, updates: Partial<UserRecord>): Promise<DBQueryResult<UserRecord>> {
  return apiRequest<UserRecord>(`/users/${userId}`, 'PUT', updates);
}

// ============================================================================
// PHR OPERATIONS
// ============================================================================

export async function getPHR(patientId: string): Promise<DBQueryResult<PHRRecord>> {
  return apiRequest<PHRRecord>(`/phr/${patientId}`);
}

export async function updatePHR(patientId: string, updates: Partial<PHRRecord>): Promise<DBQueryResult<PHRRecord>> {
  return apiRequest<PHRRecord>(`/phr/${patientId}`, 'PUT', updates);
}

export async function getVitalSigns(patientId: string, limit = 10): Promise<DBQueryResult<VitalSign[]>> {
  return apiRequest<VitalSign[]>(`/phr/${patientId}/vitals?limit=${limit}`);
}

export async function addVitalSign(patientId: string, vitalSign: VitalSign): Promise<DBQueryResult<VitalSign>> {
  return apiRequest<VitalSign>(`/phr/${patientId}/vitals`, 'POST', vitalSign);
}

// ============================================================================
// APPOINTMENT OPERATIONS
// ============================================================================

export async function getAppointments(filters?: {
  patientId?: string;
  doctorId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<DBQueryResult<AppointmentRecord[]>> {
  const params = new URLSearchParams();
  if (filters?.patientId) params.append('patientId', filters.patientId);
  if (filters?.doctorId) params.append('doctorId', filters.doctorId);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.fromDate) params.append('fromDate', filters.fromDate);
  if (filters?.toDate) params.append('toDate', filters.toDate);
  
  return apiRequest<AppointmentRecord[]>(`/appointments?${params.toString()}`);
}

export async function getAppointment(appointmentId: string): Promise<DBQueryResult<AppointmentRecord>> {
  return apiRequest<AppointmentRecord>(`/appointments/${appointmentId}`);
}

export async function createAppointment(appointment: Partial<AppointmentRecord>): Promise<DBQueryResult<AppointmentRecord>> {
  return apiRequest<AppointmentRecord>('/appointments', 'POST', appointment);
}

export async function updateAppointment(
  appointmentId: string,
  updates: Partial<AppointmentRecord>
): Promise<DBQueryResult<AppointmentRecord>> {
  return apiRequest<AppointmentRecord>(`/appointments/${appointmentId}`, 'PUT', updates);
}

// ============================================================================
// EMR OPERATIONS
// ============================================================================

export async function getEMR(appointmentId: string): Promise<DBQueryResult<EMRRecord>> {
  return apiRequest<EMRRecord>(`/emr/appointment/${appointmentId}`);
}

export async function createEMR(emr: Partial<EMRRecord>): Promise<DBQueryResult<EMRRecord>> {
  return apiRequest<EMRRecord>('/emr', 'POST', emr);
}

export async function updateEMR(emrId: string, updates: Partial<EMRRecord>): Promise<DBQueryResult<EMRRecord>> {
  return apiRequest<EMRRecord>(`/emr/${emrId}`, 'PUT', updates);
}

export async function signEMR(emrId: string, doctorSignature: string): Promise<DBQueryResult<EMRRecord>> {
  return apiRequest<EMRRecord>(`/emr/${emrId}/sign`, 'POST', { doctorSignature });
}

// ============================================================================
// AI ASSISTANT OPERATIONS
// ============================================================================

export interface AIChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  context?: any;
  createdAt?: string;
}

export interface AIDocumentAnalysis {
  id: string;
  documentType: string;
  filename: string;
  summary: string;
  keyFindings: string[];
  abnormalValues?: string[];
  createdAt: string;
}

export interface CDSRecommendation {
  id: string;
  type: 'drug_interaction' | 'dose_adjustment' | 'contraindication' | 'guideline_alert';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  titleThai?: string;
  description: string;
  descriptionThai?: string;
  guideline?: string;
  guidelineYear?: number;
  suggestedAction: string;
  alternatives?: string[];
  doctorDecision?: 'accepted' | 'rejected' | 'modified';
  doctorNotes?: string;
}

export async function getChatHistory(
  userId: string,
  sessionId?: string
): Promise<DBQueryResult<AIChatMessage[]>> {
  const params = sessionId ? `?sessionId=${sessionId}` : '';
  return apiRequest<AIChatMessage[]>(`/ai/chat/${userId}${params}`);
}

export async function saveChatMessage(
  userId: string,
  message: AIChatMessage,
  sessionId?: string
): Promise<DBQueryResult<AIChatMessage>> {
  return apiRequest<AIChatMessage>('/ai/chat', 'POST', {
    userId,
    sessionId,
    ...message,
  });
}

export async function getDocumentAnalysis(
  patientId: string
): Promise<DBQueryResult<AIDocumentAnalysis[]>> {
  return apiRequest<AIDocumentAnalysis[]>(`/ai/documents/${patientId}`);
}

export async function analyzeDocument(
  file: File,
  patientId: string,
  documentType: string
): Promise<DBQueryResult<AIDocumentAnalysis>> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('patientId', patientId);
  formData.append('documentType', documentType);

  try {
    const response = await fetch(`${API_BASE}/api/ai/analyze-document`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    return {
      success: response.ok,
      data: data.data,
      error: data.error,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getCDSRecommendations(
  patientId: string,
  proposedMedications?: string[]
): Promise<DBQueryResult<CDSRecommendation[]>> {
  return apiRequest<CDSRecommendation[]>('/ai/cds', 'POST', {
    patientId,
    proposedMedications,
  });
}

export async function logCDSDecision(
  recommendationId: string,
  decision: 'accepted' | 'rejected' | 'modified',
  notes?: string
): Promise<DBQueryResult<CDSRecommendation>> {
  return apiRequest<CDSRecommendation>(`/ai/cds/${recommendationId}/decision`, 'POST', {
    decision,
    notes,
  });
}

// ============================================================================
// PRE-CONSULTATION SUMMARY
// ============================================================================

export interface PreConsultationSummary {
  patientId: string;
  appointmentId?: string;
  patientSnapshot: {
    name: string;
    nameThai?: string;
    age: number;
    gender: string;
    bloodType?: string;
    primaryConditions: string[];
    drugAllergies: Allergy[];
  };
  currentSymptoms: string[];
  urgencyLevel: string;
  aiTriage: {
    suggestedDiagnosis: string[];
    relevantHistory: string[];
    alertFlags: string[];
    suggestedQuestions: string[];
  };
  recentVisits: {
    date: string;
    diagnosis: string;
    treatment: string;
  }[];
  labTrends: {
    parameter: string;
    values: { date: string; value: number }[];
    trend: 'improving' | 'stable' | 'worsening';
  }[];
  generatedAt: string;
}

export async function getPreConsultationSummary(
  patientId: string,
  appointmentId?: string
): Promise<DBQueryResult<PreConsultationSummary>> {
  const params = appointmentId ? `?appointmentId=${appointmentId}` : '';
  return apiRequest<PreConsultationSummary>(`/ai/pre-summary/${patientId}${params}`);
}

// ============================================================================
// PATIENT INSTRUCTION SHEET
// ============================================================================

export interface PatientInstructionSheet {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  diagnosis: string;
  diagnosisThai?: string;
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    timing: string;
    duration: string;
    specialInstructions?: string;
  }[];
  selfCareInstructions: string[];
  selfCareInstructionsThai?: string[];
  warningSigns: string[];
  warningSignsThai?: string[];
  followUpDate?: string;
  followUpInstructions?: string;
  dietaryAdvice?: string[];
  exerciseAdvice?: string[];
  doctorName: string;
  approvedAt?: string;
  pdfUrl?: string;
}

export async function generatePatientInstructions(
  appointmentId: string
): Promise<DBQueryResult<PatientInstructionSheet>> {
  return apiRequest<PatientInstructionSheet>(`/ai/patient-instructions/${appointmentId}`, 'POST');
}

export async function approvePatientInstructions(
  instructionId: string,
  modifications?: Partial<PatientInstructionSheet>
): Promise<DBQueryResult<PatientInstructionSheet>> {
  return apiRequest<PatientInstructionSheet>(
    `/ai/patient-instructions/${instructionId}/approve`,
    'POST',
    modifications
  );
}

// ============================================================================
// KNOWLEDGE BASE (RAG)
// ============================================================================

export async function searchKnowledgeBase(
  query: string,
  topK = 5
): Promise<DBQueryResult<{ content: string; source: string; relevance: number }[]>> {
  return apiRequest('/ai/knowledge/search', 'POST', { query, topK });
}

export async function addToKnowledgeBase(
  content: string,
  contentType: string,
  source: string,
  metadata?: any
): Promise<DBQueryResult<{ id: string }>> {
  return apiRequest('/ai/knowledge', 'POST', {
    content,
    contentType,
    source,
    metadata,
  });
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export const postgresService = {
  // Users
  getUser,
  getUserByEmail,
  getAllDoctors,
  getAllPatients,
  updateUser,
  
  // PHR
  getPHR,
  updatePHR,
  getVitalSigns,
  addVitalSign,
  
  // Appointments
  getAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  
  // EMR
  getEMR,
  createEMR,
  updateEMR,
  signEMR,
  
  // AI Assistant
  getChatHistory,
  saveChatMessage,
  getDocumentAnalysis,
  analyzeDocument,
  getCDSRecommendations,
  logCDSDecision,
  getPreConsultationSummary,
  generatePatientInstructions,
  approvePatientInstructions,
  searchKnowledgeBase,
  addToKnowledgeBase,
};

export default postgresService;
