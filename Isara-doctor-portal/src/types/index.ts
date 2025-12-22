// ============================================================================
// USER TYPES - Cloud Storage Schema (izara-users-credentials bucket)
// ============================================================================

/**
 * User Preferences stored in GCS
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'th';
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}

/**
 * Admin Privileges - Controls what admin actions are allowed
 */
export interface AdminPrivileges {
  canManageDoctors: boolean;
  canManagePatients: boolean;
  canManageAppointments: boolean;
  canViewAnalytics: boolean;
  canManageSettings: boolean;
  canAssignRoles: boolean;
  level: 'super_admin' | 'admin' | 'moderator';
}

/**
 * User Credential Record - Stored in GCS: users/{id}.json
 * This is the FULL record stored in cloud storage
 */
export interface UserCredential {
  id: string;                      // Format: DOC-DEMO-001
  email: string;                   // Lowercase, trimmed
  passwordHash: string;            // SHA256 hash
  role: 'doctor' | 'admin' | 'patient';
  doctorId?: string;               // Same as id for doctors
  patientId?: string;              // For patient users
  medicalLicenseNumber?: string;   // Format: MD-123456 (doctors only)
  isAdmin: boolean;                // Admin privileges flag
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;               // ISO timestamp
  lastLogin: string | null;        // ISO timestamp
  loginAttempts: number;           // Failed login attempts
  lockedUntil: string | null;      // ISO timestamp when locked
  preferences: UserPreferences;
  // Additional profile data
  name?: string;
  phone?: string;
  dateOfBirth?: string;
  avatarUrl?: string;
  specialty?: string;
  // Admin specific
  adminPrivileges?: AdminPrivileges;
}

/**
 * User Index Entry - Stored in GCS: users/index.json
 * Lightweight index for email lookups
 */
export interface UserIndexEntry {
  id: string;
  email: string;
  role: 'doctor' | 'admin';
  isActive: boolean;
}

/**
 * User - Public user data (no sensitive fields like passwordHash)
 * Used in frontend after login
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'doctor' | 'admin';
  doctorId: string;
  medicalLicenseNumber: string;
  isActive: boolean;
  emailVerified: boolean;
  avatarUrl?: string;
  dateOfBirth?: string;
  phone?: string;
  specialty?: string;
  preferences: UserPreferences;
  // Admin privileges
  isAdmin?: boolean;
  adminPrivileges?: AdminPrivileges;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  dateOfBirth?: string;
  phone?: string;
  medicalLicenseNumber: string;
  specialty?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

// ============================================================================
// DOCTOR TYPES
// ============================================================================

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  avatarUrl: string;
  email?: string;
  rating?: number;
  experience?: string;
  qualifications?: string[];
  availableSlots?: string[];
}

// ============================================================================
// APPOINTMENT TYPES
// ============================================================================

export enum AppointmentStatus {
  Pending = 'Pending',
  Confirmed = 'Confirmed',
  InProgress = 'In Progress',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
  NoShow = 'No Show',
  Rescheduled = 'Rescheduled',
  Rejected = 'rejected',
  Declined = 'declined',
}

export enum AppointmentType {
  Telehealth = 'Telehealth',
  InPerson = 'In-person',
  Emergency = 'Emergency',
  FollowUp = 'Follow-up',
  Consultation = 'Consultation',
}

export interface Appointment {
  id: string;
  user: User;
  userId?: string; // User ID
  patientId?: string; // Patient ID
  date: Date;
  type: AppointmentType;
  status: AppointmentStatus;
  doctor?: Doctor;
  doctorId?: string; // Doctor ID for filtering
  symptoms: string[];
  notes: string;
  meetLink?: string;
  calendarEventId?: string;
  diagnosis?: string;
  treatmentPlan?: string[] | TreatmentPlan;
  summary?: string;
  laboratoryReport?: string;
  radiologyReport?: string;
  result?: AppointmentResult;
  createdAt?: Date;
  updatedAt?: Date;
  confirmedAt?: Date;
  paymentStatus?: 'unpaid' | 'partial' | 'paid' | 'refunded';
  // Additional fields for scheduling
  scheduledDate?: string;
  scheduledTime?: string;
  time?: string;
  confirmedDate?: string;
  confirmedTime?: string;
  appointmentDate?: string;
  appointmentTime?: string;
}

export interface AppointmentResult {
  id: string;
  appointmentId: string;
  diagnosis: string;
  differentialDiagnosis?: string[];
  prescriptions: Prescription[];
  labOrders: LabOrder[];
  radiologyOrders: RadiologyOrder[];
  treatmentPlan?: TreatmentPlan;
  followUpDate?: string;
  referral?: HospitalReferral;
  aiSummary?: string;
  createdAt: string;
  payment?: PaymentTransaction;
  timeline?: TreatmentTimeline[];
  medicalRecordSummary?: string;
  audioTranscriptionUrl?: string;
  vitalSigns?: VitalSigns;
  clinicalNotes?: string;
}

export interface NewAppointmentInfo {
  symptoms: string[];
  notes: string;
  aiSummary?: string;
  suggestedSymptoms?: string[];
  attachments?: File[];
  urgencyLevel?: 'low' | 'medium' | 'high';
}

export interface AppointmentBooking {
  symptoms: string[];
  symptomDescription: string;
  preferredDate: string;
  preferredTime: string;
  doctorSpecialty: string;
  urgencyLevel: 'low' | 'medium' | 'high';
  attachments?: File[];
  appointmentType?: AppointmentType;
}

// ============================================================================
// MEDICAL RECORD TYPES
// ============================================================================

export interface Prescription {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  refillsAllowed: number;
  prescribedBy?: string;
  prescribedDate?: string;
  pharmacyInstructions?: string;
  sideEffects?: string[];
  contraindications?: string[];
}

export interface LabOrder {
  id: string;
  testName: string;
  labName: string;
  status: string;
  orderedDate: string;
  scheduledDate?: string;
  completedDate?: string;
  instructions?: string;
  results?: LabResult[];
  orderedBy?: string;
  priority?: 'routine' | 'urgent' | 'stat';
}

export interface LabResult {
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'abnormal' | 'critical';
  notes?: string;
}

export interface RadiologyOrder {
  id: string;
  examType: string;
  bodyPart: string;
  status: string;
  orderedDate: string;
  scheduledDate?: string;
  completedDate?: string;
  facility?: string;
  instructions?: string;
  contrast?: boolean;
  orderedBy?: string;
  priority?: 'routine' | 'urgent' | 'stat';
  results?: string;
  imageUrls?: string[];
}

export interface HospitalReferral {
  hospitalName: string;
  department: string;
  reason: string;
  urgency: 'low' | 'medium' | 'high';
  doctorName?: string;
  contactNumber?: string;
  appointmentDate?: string;
  referralNotes?: string;
  status?: 'pending' | 'scheduled' | 'completed' | 'cancelled';
}

export interface TreatmentPlan {
  goals: string[];
  interventions: string[];
  timeline: string;
  homeCareSummary: string;
  followUpSchedule?: string[];
  expectedOutcomes?: string[];
  warnings?: string[];
  emergencyInstructions?: string;
}

export interface VitalSigns {
  bloodPressure?: {
    systolic: number;
    diastolic: number;
    unit: 'mmHg';
  };
  heartRate?: {
    value: number;
    unit: 'bpm';
  };
  temperature?: {
    value: number;
    unit: 'celsius' | 'fahrenheit';
  };
  respiratoryRate?: {
    value: number;
    unit: 'breaths/min';
  };
  oxygenSaturation?: {
    value: number;
    unit: '%';
  };
  weight?: {
    value: number;
    unit: 'kg' | 'lbs';
  };
  height?: {
    value: number;
    unit: 'cm' | 'inches';
  };
  bmi?: number;
  measuredAt?: Date;
}

// ============================================================================
// HEALTH RECORDS TYPES
// ============================================================================

export interface HealthRecord {
  id: string;
  type: 'Personal Health Record' | 'Electronic Health Record' | 'Electronic Medical Record';
  date: string;
  historyAndPhysical?: string;
  diagnosis?: string;
  treatment?: string;
  drugPrescription?: string;
  historyOfCare?: string;
  physicalFitness?: string;
  foodIntake?: string;
  mindAndSpiritual?: string;
  socialEnvironment?: string;
  specialInvestigation?: string;
  healthIndicator?: string;
  opdRecord?: string;
  ipdRecord?: string;
  operationRecord?: string;
  laboratoryReport?: string;
  radiologyReport?: string;
  pathologicalReport?: string;
  pharmaceuticalReport?: string;
  financialReport?: string;
}

// ============================================================================
// PAYMENT TYPES - UPDATED FOR THAI BAHT
// ============================================================================

export interface PaymentMethod {
  id: string;
  type: 'cash' | 'credit_card' | 'debit_card' | 'mobile_banking' | 'insurance' | 'government' | 'promptpay' | 'qr_code';
  cardLast4?: string;
  bankName?: string;
  insuranceProvider?: string;
  policyNumber?: string;
  promptpayId?: string;
  qrCodeUrl?: string;
  displayName?: string;
}

export interface ServiceCost {
  id: string;
  serviceName: string;
  category: 'consultation' | 'medication' | 'lab' | 'imaging' | 'procedure' | 'facility' | 'other';
  amount: number; // Thai Baht
  currency: 'THB';
  quantity: number;
  unitPrice: number; // Thai Baht per unit
  discount?: number; // Thai Baht
  discountReason?: string;
  taxAmount?: number; // Thai Baht (7% VAT)
  notes?: string;
  serviceDate?: string;
}

export interface PaymentTransaction {
  id: string;
  appointmentId: string;
  transactionDate: string;
  totalAmount: number; // Thai Baht
  paidAmount: number; // Thai Baht
  remainingBalance: number; // Thai Baht
  currency: 'THB';
  paymentMethod: PaymentMethod;
  serviceCosts: ServiceCost[];
  status: 'pending' | 'partial' | 'completed' | 'refunded' | 'cancelled' | 'failed';
  receiptUrl?: string;
  invoiceUrl?: string;
  notes?: string;
  paymentDeadline?: string;
  transactionReference?: string;
  qrCodeData?: QRPaymentData;
}

export interface QRPaymentData {
  qrCodeUrl: string;
  promptpayId: string;
  amount: number; // Thai Baht
  reference: string;
  expiryTime?: Date;
  generatedAt: Date;
  scannedAt?: Date;
  status: 'pending' | 'scanned' | 'completed' | 'expired';
}

// Thai Baht pricing constants
export const THAI_MEDICAL_PRICES = {
  // Consultations (all FREE under service fee)
  consultation: {
    telehealth: 0,
    inPerson: 0,
    emergency: 0,
    followUp: 0
  },
  
  // Common Medications (Thai Baht)
  medications: {
    paracetamol: 30,
    ibuprofen: 45,
    amoxicillin: 150,
    cetirizine: 80,
    omeprazole: 120,
    metformin: 200,
    aspirin: 25,
    vitamins: 150,
    coughSyrup: 85,
    topicalCream: 95
  },
  
  // Lab Tests (Thai Baht)
  labTests: {
    cbc: 250,
    bloodGlucose: 150,
    lipidPanel: 400,
    liverFunction: 450,
    kidneyFunction: 350,
    thyroidPanel: 600,
    urinalysis: 180,
    hba1c: 500
  },
  
  // Imaging (Thai Baht)
  imaging: {
    xray: 500,
    ultrasound: 800,
    ctScan: 3500,
    mri: 8000,
    mammogram: 1200
  },
  
  // Procedures (Thai Baht)
  procedures: {
    vaccination: 300,
    bloodDraw: 100,
    ecg: 400,
    stitches: 800
  }
};

// Helper function to format Thai Baht
export const formatThaiBaht = (amount: number): string => {
  return `฿ ${amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Helper function to calculate total from service costs
export const calculateTotalCost = (serviceCosts: ServiceCost[]): number => {
  return serviceCosts.reduce((total, cost) => total + cost.amount, 0);
};

// Helper function to generate Thai receipt reference
export const generateThaiReceiptReference = (appointmentId: string): string => {
  const timestamp = Date.now().toString().slice(-6);
  const aptId = appointmentId.slice(0, 8).toUpperCase();
  return `APT-${aptId}-${timestamp}`;
};

// ============================================================================
// TREATMENT TIMELINE TYPES
// ============================================================================

export interface TreatmentTimeline {
  id: string;
  date: string;
  type: 'diagnosis' | 'treatment' | 'medication' | 'lab' | 'imaging' | 'followup' | 'referral' | 'procedure' | 'consultation';
  title: string;
  description: string;
  performedBy?: string;
  attachments?: string[];
  status: 'completed' | 'pending' | 'cancelled' | 'scheduled';
  location?: string;
  duration?: number;
  cost?: number;
  notes?: string;
}

// ============================================================================
// HERB/RESOURCE TYPES
// ============================================================================

export interface Herb {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  tags: string[];
  benefits?: string[];
  usage?: string;
  dosage?: string;
  warnings?: string[];
  scientificName?: string;
  alternativeNames?: string[];
  preparation?: string[];
  storageInstructions?: string;
  interactions?: string[];
}

// ============================================================================
// MAP/LOCATION TYPES
// ============================================================================

export type MapLocationType = 'hospital' | 'clinic' | 'pharmacy' | 'health_center';

export interface MapLocation {
  id: string;
  name: string;
  type: MapLocationType;
  address: string;
  coords: {
    lat: number;
    lng: number;
  };
  phone?: string;
  website?: string;
  hours?: string;
  rating?: number;
  reviewCount?: number;
  services?: string[];
  acceptsWalkIn?: boolean;
  acceptsInsurance?: boolean;
  emergencyServices?: boolean;
  distance?: number;
}

// ============================================================================
// AI CHAT TYPES - FIXED
// ============================================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';  // Removed 'system' to match API expectations
  content: string;
  timestamp: Date;
  metadata?: {
    model?: string;
    tokens?: number;
    temperature?: number;
  };
  attachments?: ChatAttachment[];
}

export interface ChatAttachment {
  id: string;
  type: 'image' | 'document' | 'audio' | 'video';
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  context?: string;
  tags?: string[];
  archived?: boolean;
  pinned?: boolean;
}

// ============================================================================
// NAVIGATION TYPES
// ============================================================================

export type Page =
  | 'login'
  | 'register'
  | 'home'
  | 'patients'
  | 'patient_detail'
  | 'queue'
  | 'emr_editor'
  | 'prescribe'
  | 'lab_orders'
  | 'calendar'
  | 'ai_studio'
  | 'recordings'
  | 'settings'
  | 'intake'
  | 'scheduler'
  | 'post_visit'
  | 'history'
  | 'map'
  | 'medical_journey'
  | 'ai_doctor'
  | 'find_doctor'
  | 'payments'
  | 'profile';

// ============================================================================
// CLOUD STORAGE TYPES
// ============================================================================

export interface StorageFile {
  name: string;
  url: string;
  bucket: string;
  contentType: string;
  size: number;
  uploadedAt: Date;
  metadata?: {
    appointmentId?: string;
    userId?: string;
    dataType?: string;
    symptoms?: string;
    duration?: number;
    [key: string]: any;
  };
}

export interface StorageUploadOptions {
  bucket: string;
  folder?: string;
  makePublic?: boolean;
  metadata?: Record<string, string>;
  contentType?: string;
  cacheControl?: string;
}

export interface StorageListOptions {
  bucket: string;
  prefix?: string;
  maxResults?: number;
  pageToken?: string;
}

// ============================================================================
// GOOGLE CALENDAR TYPES
// ============================================================================

export interface CalendarEvent {
  id: string;
  summary: string;
  description: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  meetLink?: string;
  htmlLink?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  recurrence?: string[];
  reminders?: CalendarReminder[];
}

export interface CalendarReminder {
  method: 'email' | 'popup' | 'sms';
  minutes: number;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface Notification {
  id: string;
  userId: string;
  type: 'appointment' | 'payment' | 'prescription' | 'lab_result' | 'message' | 'reminder';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
  actionUrl?: string;
  actionLabel?: string;
  priority?: 'low' | 'medium' | 'high';
}

// ============================================================================
// VIRTUAL WAITING ROOM TYPES
// ============================================================================

export interface WaitingRoomStatus {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  joinedAt: Date;
  status: 'waiting' | 'in-call' | 'completed' | 'left';
  estimatedWaitTime?: number;
  position?: number;
}

export interface MeetingParticipant {
  id: string;
  name: string;
  role: 'patient' | 'doctor' | 'assistant';
  joinedAt: Date;
  leftAt?: Date;
  audioEnabled: boolean;
  videoEnabled: boolean;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
}

export interface MeetingSession {
  id: string;
  appointmentId: string;
  startTime: Date;
  endTime?: Date;
  participants: MeetingParticipant[];
  recordingUrl?: string;
  duration?: number;
  notes?: string;
  status: 'scheduled' | 'waiting' | 'active' | 'completed' | 'cancelled';
  // Enhanced meeting data
  meetLink?: string;
  calendarEventId?: string;
  transcription?: MeetingTranscription;
  aiSummary?: MeetingAISummary;
  patientJoinedAt?: Date;
  doctorJoinedAt?: Date;
  consentRecorded?: boolean;
}

/**
 * Meeting Transcription - AI-generated from audio
 */
export interface MeetingTranscription {
  id: string;
  meetingId: string;
  segments: TranscriptSegment[];
  fullText: string;
  language: string;
  generatedAt: Date;
  accuracy?: number;
}

/**
 * AI Summary of Meeting
 */
export interface MeetingAISummary {
  id: string;
  meetingId: string;
  chiefComplaint: string;
  symptoms: string[];
  diagnosis?: string;
  treatmentPlan: string[];
  prescriptions: SuggestedPrescription[];
  labOrders: string[];
  followUpRecommended: boolean;
  followUpDate?: string;
  redFlags: string[];
  patientEducation: string[];
  generatedAt: Date;
  confidence: number;
}

/**
 * Suggested Prescription from AI
 */
export interface SuggestedPrescription {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  reason: string;
}

// ============================================================================
// STATISTICS & ANALYTICS TYPES
// ============================================================================

export interface HealthMetrics {
  userId: string;
  period: 'day' | 'week' | 'month' | 'year';
  appointmentCount: number;
  completedAppointments: number;
  cancelledAppointments: number;
  averageWaitTime?: number;
  totalSpending: number;
  prescriptionsFilled: number;
  labTestsCompleted: number;
  lastCheckupDate?: Date;
  upcomingAppointments: number;
}

export interface DashboardStats {
  upcomingAppointments: number;
  completedAppointments: number;
  pendingPayments: number;
  unreadMessages: number;
  prescriptionsToRefill: number;
  nextAppointment?: Appointment;
  healthScore?: number;
  recentActivity: ActivityLog[];
}

export interface ActivityLog {
  id: string;
  userId: string;
  type: 'appointment' | 'payment' | 'prescription' | 'lab' | 'message';
  action: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// ============================================================================
// ERROR & RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============================================================================
// FORM VALIDATION TYPES
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface FormState<T> {
  values: T;
  errors: Record<keyof T, string>;
  touched: Record<keyof T, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
}

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

export interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
  testId?: string;
}

export interface LoadingState {
  isLoading: boolean;
  loadingMessage?: string;
  progress?: number;
}

export interface ErrorState {
  hasError: boolean;
  errorMessage?: string;
  errorCode?: string;
  canRetry?: boolean;
}

// ============================================================================
// THEME & STYLING TYPES
// ============================================================================

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  error: string;
  warning: string;
  success: string;
  info: string;
  text: {
    primary: string;
    secondary: string;
    disabled: string;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = 
  Pick<T, Exclude<keyof T, Keys>> & 
  { [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>> }[Keys];

export type Nullable<T> = T | null;

export type AsyncResult<T> = Promise<T | null>;

// ============================================================================
// CONSTANT TYPES
// ============================================================================

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  [AppointmentStatus.Pending]: 'รอการยืนยัน',
  [AppointmentStatus.Confirmed]: 'ยืนยันแล้ว',
  [AppointmentStatus.InProgress]: 'กำลังดำเนินการ',
  [AppointmentStatus.Completed]: 'เสร็จสิ้น',
  [AppointmentStatus.Cancelled]: 'ยกเลิก',
  [AppointmentStatus.NoShow]: 'ไม่มาตามนัด',
  [AppointmentStatus.Rescheduled]: 'เลื่อนนัดใหม่',
  [AppointmentStatus.Rejected]: 'ปฏิเสธ',
  [AppointmentStatus.Declined]: 'ไม่รับนัด',
};

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  [AppointmentType.Telehealth]: 'Telehealth',
  [AppointmentType.InPerson]: 'พบแพทย์ที่คลินิก',
  [AppointmentType.Emergency]: 'ฉุกเฉิน',
  [AppointmentType.FollowUp]: 'ติดตามผล',
  [AppointmentType.Consultation]: 'ปรึกษา',
};

export const PAYMENT_STATUS_LABELS: Record<'pending' | 'partial' | 'completed' | 'refunded' | 'cancelled', string> = {
  pending: 'รอชำระเงิน',
  partial: 'ชำระบางส่วน',
  completed: 'ชำระเรียบร้อย',
  refunded: 'คืนเงินแล้ว',
  cancelled: 'ยกเลิก',
};

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isAppointment(obj: any): obj is Appointment {
  return obj && typeof obj === 'object' && 'id' in obj && 'date' in obj && 'status' in obj;
}

export function isPaymentTransaction(obj: any): obj is PaymentTransaction {
  return obj && typeof obj === 'object' && 'id' in obj && 'totalAmount' in obj && 'paymentMethod' in obj;
}

export function isHealthRecord(obj: any): obj is HealthRecord {
  return obj && typeof obj === 'object' && 'id' in obj && 'type' in obj && 'date' in obj;
}

// ============================================================================
// DOCTOR PORTAL TYPES
// ============================================================================

// Patient Record for Doctor View - supports both nested and flat data structures
export interface PatientRecord {
  id: string;
  // Flat structure fields (from GCS)
  name?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other' | string;
  photo?: string;
  email?: string;
  phone?: string;
  // Nested structure (full profile)
  demographics?: {
    name: string;
    dateOfBirth: string;
    age: number;
    gender: 'male' | 'female' | 'other';
    photo?: string;
    idNumber?: string;
  };
  contact?: {
    phone: string;
    email: string;
    address: string;
    emergencyContact: EmergencyContact;
  };
  medicalInfo?: {
    bloodType?: string;
    allergies: string[];
    chronicConditions: string[];
    currentMedications: string[];
  };
  lastVisit?: Date;
  nextAppointment?: Date;
  consentStatus?: {
    hasConsent: boolean;
    dataTypesAllowed?: string[];
    expiresAt?: Date;
  };
  riskLevel?: 'low' | 'medium' | 'high';
  isActive?: boolean;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

// EMR (Electronic Medical Record) Types
export interface EMR {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  encounterDate: Date;
  encounterType: 'consultation' | 'follow-up' | 'emergency' | 'procedure';
  chiefComplaint: string;
  historyOfPresentIllness: string;
  reviewOfSystems: ReviewOfSystems;
  physicalExamination: PhysicalExam;
  vitalSigns: VitalSigns;
  assessment: string;
  diagnosis: DiagnosisCode[];
  treatmentPlan: string;
  prescriptions: Prescription[];
  investigations: Investigation[];
  followUpInstructions: string;
  followUpDate?: Date;
  createdAt: Date;
  lastModified: Date;
  status: 'draft' | 'finalized' | 'amended';
  digitalSignature?: string;
  version: number;
  previousVersions?: string[];
}

export interface ReviewOfSystems {
  constitutional?: string;
  eyes?: string;
  entNoseThroat?: string;
  cardiovascular?: string;
  respiratory?: string;
  gastrointestinal?: string;
  genitourinary?: string;
  musculoskeletal?: string;
  integumentary?: string;
  neurological?: string;
  psychiatric?: string;
  endocrine?: string;
  hematologicLymphatic?: string;
  allergicImmunologic?: string;
}

export interface PhysicalExam {
  generalAppearance?: string;
  vitalSigns: VitalSigns;
  heent?: string;
  neck?: string;
  cardiovascular?: string;
  respiratory?: string;
  abdomen?: string;
  extremities?: string;
  neurological?: string;
  skin?: string;
  other?: string;
}

export interface DiagnosisCode {
  code: string; // ICD-10 code
  description: string;
  type: 'primary' | 'secondary';
  onset?: Date;
  status: 'active' | 'resolved' | 'chronic';
}

export interface Investigation {
  id: string;
  type: 'lab' | 'imaging' | 'procedure';
  name: string;
  orderDate: Date;
  status: 'ordered' | 'in-progress' | 'completed' | 'cancelled';
  results?: string;
  notes?: string;
}

// E-Prescribing Types
export interface PrescriptionFull {
  id: string;
  patientId: string;
  doctorId: string;
  encounterDate: Date;
  medications: PrescriptionItem[];
  pharmacyId?: string;
  status: 'pending' | 'sent' | 'dispensed' | 'cancelled';
  digitalSignature: string;
  createdAt: Date;
  validUntil?: Date;
}

export interface PrescriptionItem {
  drugName: string;
  genericName: string;
  brandName?: string;
  dosage: string;
  strength: string;
  route: 'oral' | 'injection' | 'topical' | 'inhaled' | 'rectal' | 'other';
  frequency: string;
  duration: string;
  quantity: number;
  refills: number;
  instructions: string;
  interactions?: DrugInteraction[];
}

export interface DrugInteraction {
  interactsWith: string;
  severity: 'critical' | 'major' | 'moderate' | 'minor';
  description: string;
  recommendation: string;
}

export interface DrugInfo {
  name: string;
  genericName: string;
  brandNames: string[];
  class: string;
  indications: string[];
  contraindications: string[];
  sideEffects: string[];
  interactions: string[];
  dosageInfo: string;
}

// Lab and Imaging Types
export interface LabOrderFull {
  id: string;
  patientId: string;
  doctorId: string;
  orderDate: Date;
  tests: LabTest[];
  clinicalIndication: string;
  urgency: 'routine' | 'urgent' | 'stat';
  status: 'ordered' | 'collected' | 'in_progress' | 'completed' | 'cancelled';
  results?: LabResultFull[];
  completedAt?: Date;
}

export interface LabTest {
  code: string;
  name: string;
  category: string;
}

export interface LabResultFull {
  testName: string;
  value: string;
  unit: string;
  normalRange: string;
  flag?: 'high' | 'low' | 'critical';
  notes?: string;
}

export interface ImagingOrder {
  id: string;
  patientId: string;
  doctorId: string;
  orderDate: Date;
  modality: 'xray' | 'ct' | 'mri' | 'ultrasound' | 'pet';
  bodyRegion: string;
  clinicalIndication: string;
  contrast: boolean;
  urgency: 'routine' | 'urgent' | 'stat';
  status: 'ordered' | 'scheduled' | 'completed' | 'cancelled';
  report?: ImagingReport;
  images?: string[];
}

export interface ImagingReport {
  id: string;
  findings: string;
  impression: string;
  recommendations: string;
  radiologistName: string;
  reportDate: Date;
}

// Patient Queue Types
export interface QueuePatient {
  id: string;
  patientId: string;
  patientName: string;
  patient?: PatientRecord; // Optional nested patient object
  appointmentId: string;
  appointmentTime: Date | string;
  checkInTime?: Date | string;
  reasonForVisit?: string;
  reason: string; // Alias for reasonForVisit
  priority: 'routine' | 'urgent' | 'emergency' | 'high';
  status: 'waiting' | 'in-consultation' | 'in-progress' | 'completed' | 'no-show' | 'skipped' | string;
  estimatedWaitTime?: number;
  queuePosition: number;
  queueNumber?: number; // Alias for queuePosition
  doctorId?: string; // Doctor assigned to this queue entry
  addedAt?: Date; // When patient was added to queue
  updatedAt?: Date; // When queue entry was last updated
}

// Doctor Dashboard Types
export interface DoctorDashboard {
  todayStats: {
    appointmentsCount: number;
    patientsSeenCount: number;
    pendingPrescriptions: number;
    unreadMessages: number;
  };
  queue: QueuePatient[];
  todaySchedule: Appointment[];
  recentActivity: ActivityLog[];
  averageConsultationTime?: number;
  patientSatisfaction?: number;
}

// Clinical Templates
export interface ClinicalTemplate {
  id: string;
  name: string;
  type: 'soap' | 'sbar' | 'admission' | 'discharge' | 'progress';
  specialty?: string;
  content: {
    sections: TemplateSection[];
  };
  createdBy: string;
  isDefault: boolean;
}

export interface TemplateSection {
  id: string;
  title: string;
  content: string;
  order: number;
  required: boolean;
}

// AI Clinical Support Types
export interface ClinicalAIRequest {
  type: 'diagnosis' | 'treatment' | 'drug-info' | 'icd-code' | 'interaction-check';
  patientContext?: {
    age: number;
    gender: string;
    allergies: string[];
    currentMedications: string[];
    chronicConditions: string[];
  };
  query: string;
  additionalData?: any;
}

export interface ClinicalAIResponse {
  type: string;
  suggestions: string[];
  details: any;
  confidence?: number;
  references?: string[];
  warnings?: string[];
}

// Voice Transcription Types
export interface TranscriptionSession {
  id: string;
  appointmentId: string;
  startTime: Date;
  endTime?: Date;
  transcription: TranscriptSegment[];
  summary?: string;
  status: 'active' | 'paused' | 'completed';
}

export interface TranscriptSegment {
  id: string;
  timestamp: Date;
  speaker: 'doctor' | 'patient';
  text: string;
  confidence?: number;
}

// Consent Management
export interface ConsentRecord {
  id: string;
  patientId: string;
  doctorId: string;
  consentType: 'phr-access' | 'ehr-access' | 'data-sharing' | 'research' | 'recording';
  granted: boolean;
  grantedAt?: Date;
  expiresAt?: Date;
  scope: string[];
  signatureUrl?: string;
  witnessName?: string;
}

// Medical Calculators
export interface MedicalCalculation {
  type: 'bmi' | 'gfr' | 'chads2' | 'wells' | 'apgar' | 'framingham';
  inputs: Record<string, number | string>;
  result: {
    value: number | string;
    interpretation: string;
    category?: string;
    recommendations?: string[];
  };
  calculatedAt: Date;
}

// Clinical Decision Support
export interface ClinicalAlert {
  id: string;
  type: 'drug-interaction' | 'allergy' | 'contraindication' | 'duplicate-therapy' | 'dose-warning';
  severity: 'critical' | 'major' | 'moderate' | 'minor' | 'info';
  title: string;
  message: string;
  recommendation: string;
  relatedItems: string[];
  dismissible: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}