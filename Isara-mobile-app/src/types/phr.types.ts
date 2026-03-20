export interface PHRRecord {
  patientId: string;
  demographics?: {
    name: string;
    dateOfBirth: string;
    gender: string;
    bloodType?: string;
  };
  allergies?: string[];
  chronicConditions?: string[];
  emergencyContacts?: Array<{
    name: string;
    phone: string;
    relationship: string;
  }>;
}

export interface VitalSign {
  id: string;
  patientId: string;
  type: 'weight' | 'blood_pressure' | 'temperature' | 'spo2' | 'blood_sugar' | 'pulse';
  value: string;
  unit: string;
  recordedAt: string;
}

export interface TimelineEntry {
  id: string;
  type: 'appointment' | 'vital' | 'lab' | 'prescription' | 'emr';
  title: string;
  description?: string;
  date: string;
  data?: Record<string, unknown>;
}

export interface LabOrder {
  id: string;
  patientId: string;
  doctorId: string;
  testName: string;
  status: 'ordered' | 'in_progress' | 'completed';
  results?: string;
  orderedAt: string;
  completedAt?: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  drugName: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string;
  prescribedAt: string;
}

export interface LivingWill {
  patientId: string;
  preferences: Record<string, unknown>;
  witnesses?: Array<{ name: string; contact: string }>;
  updatedAt?: string;
}

export interface MedicationReminder {
  id: string;
  drugName: string;
  dosage: string;
  scheduledTime: string;
  taken: boolean;
}
