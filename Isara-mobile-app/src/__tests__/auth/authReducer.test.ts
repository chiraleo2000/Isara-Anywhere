import type { AuthState, UserRole, User } from '../../types';

// Extract and test the authReducer logic directly
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

const mockPatient: User = {
  id: 'p-1',
  name: 'Test Patient',
  email: 'patient@test.com',
  role: 'patient',
  phone: '0812345678',
  dateOfBirth: '1990-01-01',
  gender: 'male',
} as User;

const mockDoctor: User = {
  id: 'd-1',
  name: 'Dr. Test',
  email: 'doctor@test.com',
  role: 'doctor',
  medicalLicenseNumber: 'ML-001',
  specialty: 'General',
} as User;

describe('authReducer', () => {
  it('returns initial state by default', () => {
    const result = authReducer(initialState, { type: 'UNKNOWN' as AuthAction['type'] } as AuthAction);
    expect(result).toEqual(initialState);
  });

  it('handles LOGIN action for patient', () => {
    const result = authReducer(initialState, {
      type: 'LOGIN',
      role: 'patient',
      token: 'test-token',
      user: mockPatient,
    });
    expect(result.isAuthenticated).toBe(true);
    expect(result.isLoading).toBe(false);
    expect(result.role).toBe('patient');
    expect(result.token).toBe('test-token');
    expect(result.user).toEqual(mockPatient);
  });

  it('handles LOGIN action for doctor', () => {
    const result = authReducer(initialState, {
      type: 'LOGIN',
      role: 'doctor',
      token: 'doc-token',
      user: mockDoctor,
    });
    expect(result.isAuthenticated).toBe(true);
    expect(result.role).toBe('doctor');
    expect(result.user).toEqual(mockDoctor);
  });

  it('handles RESTORE_SESSION same as LOGIN', () => {
    const result = authReducer(initialState, {
      type: 'RESTORE_SESSION',
      role: 'patient',
      token: 'restored-token',
      user: mockPatient,
    });
    expect(result.isAuthenticated).toBe(true);
    expect(result.token).toBe('restored-token');
    expect(result.isLoading).toBe(false);
  });

  it('handles LOGOUT action', () => {
    const loggedInState: AuthState = {
      role: 'patient',
      user: mockPatient,
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
    };
    const result = authReducer(loggedInState, { type: 'LOGOUT' });
    expect(result.isAuthenticated).toBe(false);
    expect(result.role).toBeNull();
    expect(result.user).toBeNull();
    expect(result.token).toBeNull();
    expect(result.isLoading).toBe(false);
  });

  it('handles SET_LOADING action', () => {
    const result = authReducer(initialState, { type: 'SET_LOADING', isLoading: false });
    expect(result.isLoading).toBe(false);

    const result2 = authReducer(result, { type: 'SET_LOADING', isLoading: true });
    expect(result2.isLoading).toBe(true);
  });

  it('handles UPDATE_USER action', () => {
    const loggedIn: AuthState = {
      role: 'patient',
      user: mockPatient,
      token: 'tok',
      isAuthenticated: true,
      isLoading: false,
    };
    const updatedUser = { ...mockPatient, name: 'Updated Name' };
    const result = authReducer(loggedIn, { type: 'UPDATE_USER', user: updatedUser });
    expect(result.user?.name).toBe('Updated Name');
    expect(result.isAuthenticated).toBe(true);
  });
});
