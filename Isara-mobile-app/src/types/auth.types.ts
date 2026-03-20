export type UserRole = 'patient' | 'doctor';

export interface PatientUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  role: 'patient';
}

export interface DoctorUser {
  id: string;
  name: string;
  email: string;
  specialty?: string;
  hospitalName?: string;
  medicalLicenseNumber?: string;
  isApproved: boolean;
  isAdmin?: boolean;
  role: 'doctor';
}

export type User = PatientUser | DoctorUser;

export interface AuthState {
  role: UserRole | null;
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface PatientLoginResponse {
  token: string;
  user: Omit<PatientUser, 'role'>;
}

export interface DoctorLoginResponse {
  token: string;
  user: DoctorUser;
}

export interface PatientRegisterRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
}

export interface DoctorRegisterRequest {
  name: string;
  email: string;
  password: string;
  medicalLicenseNumber: string;
  specialty?: string;
  hospitalName?: string;
}

export interface DoctorRegisterResponse {
  user: {
    id: string;
    name: string;
    email: string;
    approvalStatus: 'pending' | 'approved' | 'rejected';
  };
}
