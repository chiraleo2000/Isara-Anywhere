// Auth types
export type {
  UserRole,
  PatientUser,
  DoctorUser,
  User,
  AuthState,
  PatientLoginResponse,
  DoctorLoginResponse,
  PatientRegisterRequest,
  DoctorRegisterRequest,
  DoctorRegisterResponse,
} from './auth.types';

// Appointment types
export type {
  AppointmentStatus,
  Appointment,
  BookAppointmentRequest,
  Doctor,
} from './appointment.types';

// PHR types
export type {
  PHRRecord,
  VitalSign,
  TimelineEntry,
  LabOrder,
  Prescription,
  LivingWill,
  MedicationReminder,
} from './phr.types';

// EMR types
export type {
  EMRRecord,
  Drug,
  ImagingOrder,
} from './emr.types';

// Meeting types
export type {
  Meeting,
  CreateMeetingRequest,
  CreateMeetingResponse,
} from './meeting.types';

// Notification types
export type { Notification } from './notification.types';
