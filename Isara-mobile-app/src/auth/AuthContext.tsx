import React, { createContext, useCallback, useEffect, useMemo, useReducer } from 'react';
import type { AuthState, User, UserRole, PatientUser, DoctorUser } from '../types';
import { SecureTokenStore } from './SecureTokenStore';
import { patientApi } from '../api/patient.api';
import { doctorApi } from '../api/doctor.api';

type AuthAction =
  | { type: 'RESTORE_SESSION'; role: UserRole; token: string; user: User }
  | { type: 'LOGIN'; role: UserRole; token: string; user: User }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'UPDATE_USER'; user: User };

const initialState: AuthState = {
  role: null,
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'RESTORE_SESSION':
    case 'LOGIN':
      return {
        role: action.role,
        user: action.user,
        token: action.token,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGOUT':
      return { ...initialState, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.isLoading };
    case 'UPDATE_USER':
      return { ...state, user: action.user };
    default:
      return state;
  }
}

export interface AuthContextType extends AuthState {
  loginAsPatient: (email: string, password: string) => Promise<void>;
  loginAsDoctor: (email: string, password: string) => Promise<void>;
  registerAsPatient: (data: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    phone: string;
    dateOfBirth: string;
    gender: string;
  }) => Promise<void>;
  registerAsDoctor: (data: {
    name: string;
    email: string;
    password: string;
    medicalLicenseNumber: string;
    specialty?: string;
    hospitalName?: string;
  }) => Promise<{ isPending: boolean }>;
  logout: () => Promise<void>;
  switchRole: () => Promise<void>;
  updateUser: (user: User) => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  readonly children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const { role, token, user } = await SecureTokenStore.getAll();
        if (role && token && user) {
          dispatch({ type: 'RESTORE_SESSION', role, token, user });
        } else {
          dispatch({ type: 'SET_LOADING', isLoading: false });
        }
      } catch {
        dispatch({ type: 'SET_LOADING', isLoading: false });
      }
    };
    void restoreSession();
  }, []);

  const loginAsPatient = useCallback(async (email: string, password: string) => {
    const response = await patientApi.login({ email, password });
    const user: PatientUser = { ...response.user, role: 'patient' };
    await SecureTokenStore.saveSession('patient', response.token, user);
    dispatch({ type: 'LOGIN', role: 'patient', token: response.token, user });
  }, []);

  const loginAsDoctor = useCallback(async (email: string, password: string) => {
    const response = await doctorApi.login({ email, password });
    const user: DoctorUser = { ...response.user };
    await SecureTokenStore.saveSession('doctor', response.token, user);
    dispatch({ type: 'LOGIN', role: 'doctor', token: response.token, user });
  }, []);

  const registerAsPatient = useCallback(async (data: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    phone: string;
    dateOfBirth: string;
    gender: string;
  }) => {
    const response = await patientApi.register(data);
    if ('token' in response && response.token) {
      const user: PatientUser = { ...response.user, role: 'patient' } as PatientUser;
      await SecureTokenStore.saveSession('patient', response.token, user);
      dispatch({ type: 'LOGIN', role: 'patient', token: response.token, user });
    }
  }, []);

  const registerAsDoctor = useCallback(async (data: {
    name: string;
    email: string;
    password: string;
    medicalLicenseNumber: string;
    specialty?: string;
    hospitalName?: string;
  }) => {
    const response = await doctorApi.register(data);
    const isPending = response.user.approvalStatus === 'pending';
    return { isPending };
  }, []);

  const logout = useCallback(async () => {
    await SecureTokenStore.clear();
    dispatch({ type: 'LOGOUT' });
  }, []);

  const switchRole = useCallback(async () => {
    await SecureTokenStore.clear();
    dispatch({ type: 'LOGOUT' });
  }, []);

  const updateUser = useCallback((user: User) => {
    dispatch({ type: 'UPDATE_USER', user });
  }, []);

  const contextValue = useMemo<AuthContextType>(() => ({
    ...state,
    loginAsPatient,
    loginAsDoctor,
    registerAsPatient,
    registerAsDoctor,
    logout,
    switchRole,
    updateUser,
  }), [state, loginAsPatient, loginAsDoctor, registerAsPatient, registerAsDoctor, logout, switchRole, updateUser]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
