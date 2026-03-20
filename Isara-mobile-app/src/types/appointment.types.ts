export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';

export interface Appointment {
  id: string;
  patientId: string;
  doctorId?: string;
  patientName?: string;
  doctorName?: string;
  specialty?: string;
  date: string;
  time: string;
  reason?: string;
  status: AppointmentStatus;
  meetLink?: string;
  notes?: string;
  createdAt?: string;
}

export interface BookAppointmentRequest {
  doctorId: string;
  date: string;
  time: string;
  reason: string;
}

export interface Doctor {
  id: string;
  name: string;
  email: string;
  specialty?: string;
  hospitalName?: string;
  isAvailable?: boolean;
}
