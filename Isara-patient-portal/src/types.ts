// Common type aliases
export type RiskLevel = 'low' | 'moderate' | 'high';

// User & Auth Types
export interface User {
  id: string;
  patientId?: string;
  name: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  bloodType?: string;
  avatarUrl?: string;
  allergies?: string[];
  chronicConditions?: string[];
  address?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  dateOfBirth: string;
  phone: string;
}

// Page Navigation
export type Page =
  | 'home'
  | 'appointments'
  | 'scheduler'
  | 'ai_doctor'
  | 'symptom_checker'
  | 'phr'
  | 'medical_journey'
  | 'living_will'
  | 'pdpa_consent'
  | 'map'
  | 'payments'
  | 'profile'
  | 'settings'
  | 'recordings'
  | 'medications'
  | 'intake'
  | 'post_visit'
  | 'history';

// Appointment Types
export enum AppointmentType {
  Telehealth = 'telehealth',
  InPerson = 'in_person',
  Emergency = 'emergency',
  Consultation = 'consultation',
  FollowUp = 'follow_up',
}

export enum AppointmentStatus {
  Pending = 'pending',
  Confirmed = 'confirmed',
  InProgress = 'in_progress',
  Completed = 'completed',
  Cancelled = 'cancelled',
  NoShow = 'no_show',
  Rescheduled = 'rescheduled',
  InPool = 'in_pool', // Waiting in appointment pool for assignment
  AwaitingDoctorResponse = 'awaiting_doctor_response', // Doctor selected, waiting for response
}

// Appointment Pool Types
export type PoolReason = 'no_doctor_selected' | 'doctor_unavailable' | 'doctor_rejected' | 'meeting_missed' | 'rescheduled';

export type PoolStatus = 'pending' | 'ai_matched' | 'doctor_claimed' | 'admin_assigned' | 'admin_pending_approval' | 'confirmed' | 'expired';

export interface AppointmentPoolItem {
  id: string;
  appointmentId: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  originalDoctorId?: string;
  originalDoctorName?: string;
  requiredSpecialty: string;
  matchedSpecialties: string[];
  symptoms: string[];
  symptomDescription?: string;
  urgency: 'normal' | 'urgent' | 'emergency';
  preferredDates: string[];
  preferredTimeSlot: 'morning' | 'afternoon' | 'evening';
  appointmentType: AppointmentType;
  poolReason: PoolReason;
  poolStatus: PoolStatus;
  aiMatchedDoctorId?: string;
  aiMatchedDoctorName?: string;
  aiMatchReason?: string;
  claimedByDoctorId?: string;
  claimedByDoctorName?: string;
  adminAssignedDoctorId?: string;
  adminAssignedDoctorName?: string;
  adminApprovalRequired: boolean;
  adminApproved?: boolean;
  adminApprovedBy?: string;
  adminApprovedAt?: string;
  assignedDate?: string;
  assignedTime?: string;
  missedCount: number;
  maxMissedAttempts: number;
  originalAppointmentDate?: string;
  originalAppointmentTime?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface MeetingTimeRules {
  allowJoinBefore: number; // minutes (default: 15)
  allowJoinAfter: number; // minutes (default: 30)
  autoRescheduleOnMiss: boolean;
  rescheduleToNextWeek: boolean;
  maxMissedAttempts: number;
}

export interface MeetingTimeCheck {
  canJoin: boolean;
  reason: string;
  minutesUntilStart?: number;
  minutesSinceEnd?: number;
  appointmentDate: string;
  appointmentTime: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorAvatar?: string;
  doctorEmail?: string;
  hospitalId?: string;
  hospitalName?: string;
  date: Date;
  appointmentDate: Date;
  appointmentTime: string;
  type: AppointmentType;
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  symptoms?: SymptomDetails | string[];
  diagnosis?: string;
  prescription?: Prescription;
  labOrders?: LabOrder[];
  result?: AppointmentResult;
  meetingLink?: string; // Google Meet link
  patientMeetingUrl?: string; // Jitsi meeting URL for patient
  doctorMeetingUrl?: string; // Jitsi meeting URL for doctor
  calendarEventId?: string; // Google Calendar event ID
  preferredTimeSlots?: string[]; // For pending appointments before doctor confirms
  preferredDates?: string[]; // Patient's preferred dates
  preferredDate?: string; // Single preferred date (for API compatibility)
  preferredTime?: string; // Preferred time (for API compatibility)
  requestedDate?: string; // Requested date (for API compatibility)
  requestedTime?: string; // Requested time (for API compatibility)
  confirmedDate?: string;
  confirmedTime?: string;
  preferredTimeSlot?: string; // morning, afternoon, evening
  urgency?: string; // normal, urgent, emergency
  aiAnalysis?: string; // AI analysis of symptoms
  symptomDescription?: string; // Text description of symptoms
  appointmentType?: string; // Alternative name for type field
  // Health Log / EMR reference
  healthLogEntryId?: string; // Reference to health-logs entry with detailed EMR data
  emrId?: string; // EMR ID from doctor portal (same as healthLogEntryId)
  // Pool-related fields
  poolId?: string; // Reference to pool item if in pool
  assignmentMethod?: 'patient_selected' | 'ai_matched' | 'doctor_claimed' | 'admin_assigned';
  missedBy?: 'patient' | 'doctor';
  missedCount?: number;
  originalDoctorId?: string; // If rescheduled from another doctor
  rescheduledFrom?: string; // Original appointment ID if rescheduled
  createdAt: Date;
  updatedAt: Date;
}

export interface SymptomDetails {
  mainSymptom: string;
  description: string;
  duration: string;
  severity: number;
  bodyParts?: string[];
  additionalSymptoms?: string[];
  fever?: string | null;
  currentMedications?: string;
  allergies?: string;
  previousTreatment?: string;
  medicalHistory?: string;
  additionalNotes?: string;
  additionalDetails?: string;
}

export interface AppointmentResult {
  diagnosis: string;
  prescriptions?: Prescription[];
  labOrders?: LabOrder[];
  imagingOrders?: ImagingOrder[];
  followUpDate?: Date;
  notes?: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  subSpecialty?: string;
  hospital?: string;
  hospitalId?: string;
  avatarUrl?: string;
  email?: string;
  phone?: string;
  rating?: number;
  reviewCount?: number;
  experience?: string;
  education?: string[];
  languages?: string[];
  consultationFee?: number;
  availability?: {
    day: string;
    slots: string[];
  }[];
  createdAt?: Date;
  updatedAt?: Date;
}

// PHR Types
export interface PersonalHealthRecord {
  id: string;
  patientId: string;
  demographics: Demographics;
  vitalSignsHistory: VitalSigns[];
  lifestyle: LifestyleData;
  allergies?: string[];
  chronicConditions?: string[];
  currentMedications?: Medication[];
  medications?: Medication[]; // Alias for currentMedications
  vaccinations?: Vaccination[];
  documents?: MedicalDocument[];
  wearableData?: WearableData;
  updatedAt: Date;
}

export interface Demographics {
  name: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  bloodType?: string;
  height?: number;
  weight?: number;
  ethnicity?: string;
  occupation?: string;
  phone?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
}

export interface VitalSigns {
  bloodPressure?: {
    systolic: number;
    diastolic: number;
    unit: string;
  };
  heartRate?: {
    value: number;
    unit: string;
  };
  temperature?: {
    value: number;
    unit: 'celsius' | 'fahrenheit';
  };
  respiratoryRate?: {
    value: number;
    unit: string;
  };
  oxygenSaturation?: {
    value: number;
    unit: string;
  };
  bloodGlucose?: {
    value: number;
    unit: string;
    testType?: 'fasting' | 'random' | 'postprandial';
  };
  weight?: {
    value: number;
    unit: string;
  };
  height?: {
    value: number;
    unit: string;
  };
  bmi?: number;
  measuredAt?: Date;
  notes?: string;
}

export interface LifestyleData {
  smokingStatus?: 'never' | 'former' | 'current' | 'occasional';
  alcoholConsumption?: 'never' | 'occasional' | 'moderate' | 'frequent' | 'former';
  exerciseFrequency?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | 'none' | 'very-active';
  exercise?: string;
  dietType?: 'omnivore' | 'vegetarian' | 'vegan' | 'other' | 'regular' | 'low-carb' | 'low-fat' | 'low-sodium' | 'diabetic' | 'halal';
  diet?: string;
  sleepHours?: number;
  sleep?: string;
  stressLevel?: RiskLevel;
  occupation?: string;
  supplements?: string;
  otherTreatments?: string;
}

export interface Medication {
  id: string;
  name: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  route: 'oral' | 'injection' | 'topical' | 'inhalation' | 'other';
  startDate: Date;
  endDate?: Date;
  prescribedBy?: string;
  purpose?: string;
  sideEffects?: string[];
  instructions?: string;
  refillsRemaining?: number;
  status: 'active' | 'completed' | 'discontinued';
}

export interface Vaccination {
  id: string;
  name: string;
  date: Date;
  manufacturer?: string;
  lotNumber?: string;
  site?: string;
  administeredBy?: string;
  nextDue?: Date;
  notes?: string;
}

export interface MedicalDocument {
  id: string;
  type: 'lab_result' | 'imaging' | 'prescription' | 'report' | 'other';
  title: string;
  description?: string;
  uploadDate: Date;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  tags?: string[];
}

export interface WearableData {
  source: 'fitbit' | 'apple_watch' | 'google_fit' | 'samsung_health' | 'other';
  lastSyncDate: Date;
  steps?: { date: Date; value: number }[];
  heartRate?: { date: Date; value: number }[];
  sleep?: { date: Date; hours: number; quality: string }[];
  calories?: { date: Date; value: number }[];
  distance?: { date: Date; value: number; unit: string }[];
  activeMinutes?: { date: Date; value: number }[];
}

// Prescription & Lab Types
export interface Prescription {
  id: string;
  appointmentId?: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  date: Date;
  medications: Medication[];
  instructions?: string;
  status: 'active' | 'completed' | 'cancelled';
  refillsAllowed?: number;
  validUntil?: Date;
}

export interface LabOrder {
  id: string;
  appointmentId?: string;
  patientId: string;
  doctorId: string;
  orderDate: Date;
  testName: string;
  testCode?: string;
  priority: 'routine' | 'urgent' | 'stat';
  instructions?: string;
  status: 'ordered' | 'collected' | 'processing' | 'completed' | 'cancelled';
  result?: LabResult;
}

export interface LabResult {
  testName: string;
  value: string | number;
  unit?: string;
  normalRange?: string;
  status: 'normal' | 'abnormal' | 'critical';
  date: Date;
  notes?: string;
}

export interface ImagingOrder {
  id: string;
  appointmentId?: string;
  patientId: string;
  doctorId: string;
  orderDate: Date;
  imagingType: 'x-ray' | 'ct' | 'mri' | 'ultrasound' | 'other';
  bodyPart: string;
  priority: 'routine' | 'urgent' | 'stat';
  instructions?: string;
  status: 'ordered' | 'scheduled' | 'completed' | 'cancelled';
  scheduledDate?: Date;
  result?: ImagingResult;
}

export interface ImagingResult {
  imagingType: string;
  date: Date;
  findings: string;
  impression: string;
  radiologistName?: string;
  imageUrls?: string[];
}

// Living Will Types
export interface LivingWill {
  id: string;
  patientId: string;
  healthcareProxy: {
    primary: Person;
    alternate?: Person;
  };
  preferences: {
    cpr: boolean;
    mechanicalVentilation: boolean;
    artificialNutrition: boolean;
    dialysis: boolean;
    organDonation: boolean;
    painManagement: string;
    additionalWishes: string;
  };
  religiousPreferences?: string;
  digitalSignature: string;
  witnessSignatures?: string[];
  createdAt: Date;
  updatedAt: Date;
  sharedWith: string[]; // doctor IDs
}

export interface Person {
  name: string;
  relationship: string;
  phone: string;
  email: string;
  address?: string;
}

// PDPA Consent Types
export type PDPADataType =
  | 'demographics'
  | 'medical_history'
  | 'medications'
  | 'allergies'
  | 'lab_results'
  | 'imaging_results'
  | 'prescriptions'
  | 'vital_signs'
  | 'emr_records'
  | 'phr'
  | 'emr'
  | 'labs'
  | 'imaging'
  | 'living_will'
  | 'all';

export interface PDPAConsent {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  hospitalId?: string;
  hospitalName?: string;
  dataTypes: PDPADataType[];
  purpose?: string;
  status: 'pending' | 'granted' | 'revoked' | 'expired';
  grantedAt?: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  revokeReason?: string;
  digitalSignature: string;
  ipAddress: string;
  userAgent?: string;
  auditLog: AccessLog[];
}

export interface AccessLog {
  timestamp: Date;
  doctorId: string;
  doctorName: string;
  dataAccessed: string;
  purpose: string;
  ipAddress: string;
}

// AI & Chat Types
export interface ChatSession {
  id: string;
  patientId: string;
  title: string;
  messages: ChatMessage[];
  context?: string;
  aiModel: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface SymptomAnalysis {
  symptoms: string[];
  additionalInfo?: string;
  triage: 'emergency' | 'urgent' | 'routine' | 'self_care';
  summary: string;
  recommendations: string[];
  suggestedActions: string[];
  warningSign: boolean;
  possibleConditions?: string[];
  confidenceScore?: number;
}

export interface HealthRiskAssessment {
  overallRisk: string;
  cardiovascularRisk: RiskLevel;
  diabetesRisk: RiskLevel;
  obesityRisk: RiskLevel;
  recommendations: string[];
}

// Google Cloud Storage Types
export interface GCSFile {
  name: string;
  url: string;
  bucket: string;
  contentType: string;
  size: number;
  uploadedAt: Date;
  metadata?: Record<string, any>;
}

export interface GCSUploadOptions {
  bucket: string;
  folder?: string;
  fileName?: string;
  contentType?: string;
  metadata?: Record<string, any>;
  makePublic?: boolean;
}

// Google Maps Types
export interface Location {
  lat: number;
  lng: number;
}

export interface PlaceResult {
  id: string;
  name: string;
  address: string;
  location: Location;
  rating?: number;
  userRatingsTotal?: number;
  types: string[];
  openNow?: boolean;
  phoneNumber?: string;
  website?: string;
  photoUrls?: string[];
  distance?: number;
  placeId?: string;
}

export interface MapMarker {
  id: string;
  position: Location;
  title: string;
  icon?: string;
  onClick?: () => void;
}

export interface MapLocation {
  id: string;
  name: string;
  type: 'hospital' | 'clinic' | 'pharmacy' | 'health_center';
  address: string;
  coords: {
    lat: number;
    lng: number;
  };
  phone?: string;
  rating?: number;
  userRatingsTotal?: number;
  openNow?: boolean;
  website?: string;
}

// Google Calendar Types
export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: { email: string; displayName?: string }[];
  reminders?: {
    useDefault: boolean;
    overrides?: { method: 'email' | 'popup'; minutes: number }[];
  };
  conferenceData?: {
    createRequest: {
      requestId: string;
      conferenceSolutionKey: { type: 'hangoutsMeet' };
    };
  };
  hangoutLink?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
}

// Medical Timeline Types
export interface MedicalTimeline {
  patientId: string;
  events: TimelineEvent[];
}

export interface TimelineEvent {
  id: string;
  date: Date;
  type: 'consultation' | 'diagnosis' | 'prescription' | 'lab' | 'imaging' | 'hospitalization' | 'surgery' | 'vaccination';
  title: string;
  description: string;
  doctorName?: string;
  hospitalName?: string;
  documents: MedicalDocument[];
  metadata: Record<string, any>;
}

// Payment Types
export interface Payment {
  id: string;
  patientId: string;
  appointmentId?: string;
  amount: number;
  currency: string;
  method: 'credit_card' | 'debit_card' | 'bank_transfer' | 'promptpay' | 'insurance';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  date: Date;
  description?: string;
  receiptUrl?: string;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: 'appointment' | 'medication' | 'lab_result' | 'message' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

// Recording Types
export interface Recording {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  fileUrl?: string;
  fileSize?: number;
  transcriptUrl?: string;
  status: 'recording' | 'processing' | 'completed' | 'failed';
  consentGiven: boolean;
}

// Alert Types
export interface Alert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible: boolean;
  createdAt: Date;
}

// Activity Types
export interface Activity {
  id: string;
  userId: string;
  type: 'appointment' | 'prescription' | 'lab' | 'document' | 'login';
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Global Window Types
declare global {
  interface Window {
    gapi?: any;
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: any) => any;
        };
        id: {
          initialize: (config: any) => void;
          prompt: () => void;
          renderButton: (element: HTMLElement, config: any) => void;
        };
      };
      maps: typeof google.maps;
    };
  }
}
