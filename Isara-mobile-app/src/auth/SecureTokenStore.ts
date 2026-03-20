import * as SecureStore from 'expo-secure-store';
import type { UserRole, User } from '../types';

const KEYS = {
  ROLE: 'izara_role',
  TOKEN: 'izara_token',
  USER: 'izara_user',
} as const;

export const SecureTokenStore = {
  async getRole(): Promise<UserRole | null> {
    const role = await SecureStore.getItemAsync(KEYS.ROLE);
    if (role === 'patient' || role === 'doctor') {
      return role;
    }
    return null;
  },

  async setRole(role: UserRole): Promise<void> {
    await SecureStore.setItemAsync(KEYS.ROLE, role);
  },

  async getToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.TOKEN);
  },

  async setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(KEYS.TOKEN, token);
  },

  async getUser(): Promise<User | null> {
    const json = await SecureStore.getItemAsync(KEYS.USER);
    if (!json) return null;
    try {
      return JSON.parse(json) as User;
    } catch {
      return null;
    }
  },

  async setUser(user: User): Promise<void> {
    await SecureStore.setItemAsync(KEYS.USER, JSON.stringify(user));
  },

  async saveSession(role: UserRole, token: string, user: User): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(KEYS.ROLE, role),
      SecureStore.setItemAsync(KEYS.TOKEN, token),
      SecureStore.setItemAsync(KEYS.USER, JSON.stringify(user)),
    ]);
  },

  async getAll(): Promise<{ role: UserRole | null; token: string | null; user: User | null }> {
    const [roleRaw, token, userJson] = await Promise.all([
      SecureStore.getItemAsync(KEYS.ROLE),
      SecureStore.getItemAsync(KEYS.TOKEN),
      SecureStore.getItemAsync(KEYS.USER),
    ]);

    const role = (roleRaw === 'patient' || roleRaw === 'doctor') ? roleRaw : null;
    let user: User | null = null;
    if (userJson) {
      try {
        user = JSON.parse(userJson) as User;
      } catch {
        user = null;
      }
    }

    return { role, token, user };
  },

  async clear(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.ROLE),
      SecureStore.deleteItemAsync(KEYS.TOKEN),
      SecureStore.deleteItemAsync(KEYS.USER),
    ]);
  },
};
