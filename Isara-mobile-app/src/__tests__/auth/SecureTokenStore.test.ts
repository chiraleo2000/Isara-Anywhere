import { SecureTokenStore } from '../../auth/SecureTokenStore';
import * as SecureStore from 'expo-secure-store';
import type { User } from '../../types';

jest.mock('expo-secure-store');

const mockedSecureStore = jest.mocked(SecureStore);
const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  mockedSecureStore.getItemAsync.mockImplementation(async (key) => store.get(key) ?? null);
  mockedSecureStore.setItemAsync.mockImplementation(async (key, value) => {
    store.set(key, value);
  });
  mockedSecureStore.deleteItemAsync.mockImplementation(async (key) => {
    store.delete(key);
  });
});

const mockUser: User = {
  id: 'p-1',
  name: 'Test User',
  email: 'test@test.com',
  role: 'patient',
  phone: '081234',
  dateOfBirth: '1990-01-01',
  gender: 'male',
} as User;

describe('SecureTokenStore', () => {
  describe('getRole / setRole', () => {
    it('returns null when no role saved', async () => {
      const role = await SecureTokenStore.getRole();
      expect(role).toBeNull();
    });

    it('saves and retrieves patient role', async () => {
      await SecureTokenStore.setRole('patient');
      const role = await SecureTokenStore.getRole();
      expect(role).toBe('patient');
    });

    it('saves and retrieves doctor role', async () => {
      await SecureTokenStore.setRole('doctor');
      const role = await SecureTokenStore.getRole();
      expect(role).toBe('doctor');
    });

    it('returns null for invalid role', async () => {
      store.set('izara_role', 'admin');
      const role = await SecureTokenStore.getRole();
      expect(role).toBeNull();
    });
  });

  describe('getToken / setToken', () => {
    it('returns null when no token saved', async () => {
      const token = await SecureTokenStore.getToken();
      expect(token).toBeNull();
    });

    it('saves and retrieves token', async () => {
      await SecureTokenStore.setToken('jwt-abc-123');
      const token = await SecureTokenStore.getToken();
      expect(token).toBe('jwt-abc-123');
    });
  });

  describe('getUser / setUser', () => {
    it('returns null when no user saved', async () => {
      const user = await SecureTokenStore.getUser();
      expect(user).toBeNull();
    });

    it('saves and retrieves user object', async () => {
      await SecureTokenStore.setUser(mockUser);
      const user = await SecureTokenStore.getUser();
      expect(user).toEqual(mockUser);
    });

    it('returns null for corrupt JSON', async () => {
      store.set('izara_user', '{bad json');
      const user = await SecureTokenStore.getUser();
      expect(user).toBeNull();
    });
  });

  describe('saveSession', () => {
    it('saves role, token, and user atomically', async () => {
      await SecureTokenStore.saveSession('patient', 'my-token', mockUser);

      expect(store.get('izara_role')).toBe('patient');
      expect(store.get('izara_token')).toBe('my-token');
      expect(JSON.parse(store.get('izara_user') ?? '')).toEqual(mockUser);
    });
  });

  describe('getAll', () => {
    it('returns all null when store is empty', async () => {
      const result = await SecureTokenStore.getAll();
      expect(result.role).toBeNull();
      expect(result.token).toBeNull();
      expect(result.user).toBeNull();
    });

    it('returns saved session data', async () => {
      await SecureTokenStore.saveSession('doctor', 'doc-token', mockUser);
      const result = await SecureTokenStore.getAll();
      expect(result.role).toBe('doctor');
      expect(result.token).toBe('doc-token');
      expect(result.user).toEqual(mockUser);
    });
  });

  describe('clear', () => {
    it('removes all stored data', async () => {
      await SecureTokenStore.saveSession('patient', 'tok', mockUser);
      await SecureTokenStore.clear();

      expect(store.size).toBe(0);
      const result = await SecureTokenStore.getAll();
      expect(result.role).toBeNull();
      expect(result.token).toBeNull();
      expect(result.user).toBeNull();
    });
  });
});
