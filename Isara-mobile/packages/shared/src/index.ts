/**
 * @izara/shared
 *
 * Shared types, constants, and utilities for Izara mobile apps.
 * Used by both patient and doctor apps.
 */

// ─────────────────────────────────────────────
// User Types
// ─────────────────────────────────────────────

export interface PatientUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar_url?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  blood_type?: string;
  allergies?: string[];
  national_id?: string;
  role: 'patient';
  created_at: string;
  updated_at: string;
}

export interface DoctorUser {
  id: string;
  email: string;
  prefix: string;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar_url?: string;
  specialty: string;
  license_number: string;
  hospital?: string;
  department?: string;
  bio?: string;
  years_of_experience?: number;
  role: 'doctor';
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────
// Appointment Types
// ─────────────────────────────────────────────

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'declined'
  | 'waiting'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type AppointmentType = 'video' | 'walk_in' | 'in_person';

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  patient_name?: string;
  doctor_name?: string;
  specialty?: string;
  date: string;
  time: string;
  end_time?: string;
  type: AppointmentType;
  status: AppointmentStatus;
  symptoms?: string;
  notes?: string;
  queue_number?: number;
  consultation_fee?: number;
  payment_status?: 'pending' | 'paid' | 'refunded';
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────
// Health Record Types
// ─────────────────────────────────────────────

export type VitalType =
  | 'blood_pressure'
  | 'heart_rate'
  | 'temperature'
  | 'weight'
  | 'height'
  | 'blood_glucose'
  | 'oxygen_saturation'
  | 'respiratory_rate';

export interface VitalRecord {
  id: string;
  patient_id: string;
  type: VitalType;
  value: number;
  value_secondary?: number; // e.g., diastolic for blood pressure
  unit: string;
  source: 'manual' | 'wearable' | 'device';
  recorded_at: string;
  notes?: string;
}

export interface Medication {
  id: string;
  name: string;
  generic_name?: string;
  dosage: string;
  frequency: string;
  route: string;
  start_date: string;
  end_date?: string;
  prescriber?: string;
  is_active: boolean;
  instructions?: string;
  side_effects?: string[];
}

export interface EMR {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id?: string;
  doctor_name: string;
  specialty: string;
  date: string;
  chief_complaint: string;
  present_illness?: string;
  physical_exam?: string;
  assessment: string;
  diagnosis_codes?: string[]; // ICD-10
  plan: string;
  prescriptions?: Medication[];
  lab_orders?: any[];
  follow_up_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────
// Notification Types
// ─────────────────────────────────────────────

export type NotificationType =
  | 'appointment_confirmed'
  | 'appointment_declined'
  | 'appointment_reminder'
  | 'meeting_started'
  | 'new_emr'
  | 'new_prescription'
  | 'lab_result'
  | 'medication_reminder'
  | 'payment_received'
  | 'payment_refunded'
  | 'new_appointment_request'
  | 'queue_update'
  | 'system';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  is_read: boolean;
  deep_link?: string;
  created_at: string;
}

// ─────────────────────────────────────────────
// Payment Types
// ─────────────────────────────────────────────

export type PaymentMethod = 'card' | 'promptpay' | 'apple_pay' | 'google_pay' | 'truemoney' | 'bank_transfer';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  appointment_id: string;
  patient_id: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  stripe_payment_intent_id?: string;
  receipt_url?: string;
  created_at: string;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'รอการยืนยัน',
  confirmed: 'ยืนยันแล้ว',
  declined: 'ปฏิเสธ',
  waiting: 'รอตรวจ',
  in_progress: 'กำลังตรวจ',
  completed: 'เสร็จสิ้น',
  cancelled: 'ยกเลิก',
  no_show: 'ไม่มา',
};

export const VITAL_TYPE_LABELS: Record<VitalType, string> = {
  blood_pressure: 'ความดันโลหิต',
  heart_rate: 'อัตราการเต้นของหัวใจ',
  temperature: 'อุณหภูมิ',
  weight: 'น้ำหนัก',
  height: 'ส่วนสูง',
  blood_glucose: 'น้ำตาลในเลือด',
  oxygen_saturation: 'ออกซิเจนในเลือด',
  respiratory_rate: 'อัตราการหายใจ',
};

export const VITAL_TYPE_UNITS: Record<VitalType, string> = {
  blood_pressure: 'mmHg',
  heart_rate: 'bpm',
  temperature: '°C',
  weight: 'kg',
  height: 'cm',
  blood_glucose: 'mg/dL',
  oxygen_saturation: '%',
  respiratory_rate: 'breaths/min',
};

export const SPECIALTIES = [
  { id: 'general', label: 'แพทย์ทั่วไป', labelEn: 'General Practitioner' },
  { id: 'internal', label: 'อายุรกรรม', labelEn: 'Internal Medicine' },
  { id: 'pediatrics', label: 'กุมารเวชศาสตร์', labelEn: 'Pediatrics' },
  { id: 'cardiology', label: 'หัวใจ', labelEn: 'Cardiology' },
  { id: 'dermatology', label: 'ผิวหนัง', labelEn: 'Dermatology' },
  { id: 'orthopedics', label: 'กระดูกและข้อ', labelEn: 'Orthopedics' },
  { id: 'ophthalmology', label: 'จักษุ', labelEn: 'Ophthalmology' },
  { id: 'ent', label: 'หู คอ จมูก', labelEn: 'ENT' },
  { id: 'psychiatry', label: 'จิตเวชศาสตร์', labelEn: 'Psychiatry' },
  { id: 'obgyn', label: 'สูติ-นรีเวช', labelEn: 'OB/GYN' },
  { id: 'surgery', label: 'ศัลยกรรม', labelEn: 'Surgery' },
  { id: 'neurology', label: 'ประสาทวิทยา', labelEn: 'Neurology' },
] as const;

// ─────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────

/**
 * Format a Thai-style date string
 */
export function formatThaiDate(dateString: string): string {
  const date = new Date(dateString);
  const thaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
  ];
  const day = date.getDate();
  const month = thaiMonths[date.getMonth()];
  const year = date.getFullYear() + 543; // Buddhist Era
  return `${day} ${month} ${year}`;
}

/**
 * Format time to HH:MM
 */
export function formatTime(timeString: string): string {
  if (timeString.includes(':')) {
    return timeString.substring(0, 5);
  }
  const date = new Date(timeString);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const dob = new Date(dateOfBirth);
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

/**
 * Format currency in Thai Baht
 */
export function formatCurrency(amount: number): string {
  return `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
}

/**
 * Validate Thai national ID (13 digits)
 */
export function validateThaiNationalId(id: string): boolean {
  if (!/^\d{13}$/.test(id)) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(id[i]) * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === parseInt(id[12]);
}

/**
 * Validate Thai phone number
 */
export function validateThaiPhone(phone: string): boolean {
  return /^(0[689]\d{8}|0[23457]\d{7})$/.test(phone.replace(/[-\s]/g, ''));
}
