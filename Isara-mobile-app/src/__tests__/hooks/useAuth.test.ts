import { renderHook } from '@testing-library/react-native';
import { useAuth } from '../../hooks/useAuth';

// Mock the AuthContext module
jest.mock('../../auth/AuthContext', () => {
  const React = require('react');
  const mockValue = {
    role: 'patient',
    user: { id: 'p-1', name: 'Test Patient', email: 'test@mail.com', role: 'patient' },
    token: 'test-token',
    isAuthenticated: true,
    isLoading: false,
    loginAsPatient: jest.fn(),
    loginAsDoctor: jest.fn(),
    registerAsPatient: jest.fn(),
    registerAsDoctor: jest.fn(),
    logout: jest.fn(),
  };

  return {
    AuthContext: React.createContext(mockValue),
    AuthContextType: undefined,
  };
});

describe('useAuth', () => {
  it('returns auth context values', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.role).toBe('patient');
    expect(result.current.user).toEqual(
      expect.objectContaining({ id: 'p-1', name: 'Test Patient' })
    );
    expect(result.current.token).toBe('test-token');
  });

  it('exposes login and logout functions', () => {
    const { result } = renderHook(() => useAuth());

    expect(typeof result.current.loginAsPatient).toBe('function');
    expect(typeof result.current.loginAsDoctor).toBe('function');
    expect(typeof result.current.logout).toBe('function');
  });
});
