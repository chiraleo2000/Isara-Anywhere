/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * IZARA — AUTH STORE  (read-only, no API calls)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Reads the token cache written by global-setup.ts.
 * Every spec's beforeAll() calls loadCachedUsers() instead of authenticateAllUsers().
 * This means ZERO login API calls during the actual test run.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { CachedAuth } from '../global-setup';

export type UserRole = 'patient1' | 'patient2' | 'patient3' | 'doctor' | 'admin';

export interface AuthenticatedUser {
  role: UserRole;
  id: string;
  token: string;
  email: string;
  name: string;
  portalUrl: string;
}

const AUTH_CACHE_PATH = path.join(__dirname, '..', '.auth-cache.json');
const STORAGE_STATE_DIR = path.join(__dirname, '..', '.auth-states');

/** Get the path to a storageState JSON file for a given role (written by global-setup). */
export function getStorageStatePath(role: UserRole): string {
  return path.join(STORAGE_STATE_DIR, `${role}.json`);
}

let _cached: Map<UserRole, AuthenticatedUser> | null = null;

/**
 * Load all 5 user tokens from the cache file (written by global-setup).
 * This is a pure file read — ZERO network calls.
 * Results are memoised in-process so even repeated beforeAll() calls are free.
 */
export function loadCachedUsers(): Map<UserRole, AuthenticatedUser> {
  if (_cached) return _cached;

  if (!fs.existsSync(AUTH_CACHE_PATH)) {
    throw new Error(
      `Auth cache not found at ${AUTH_CACHE_PATH}. ` +
      `Make sure globalSetup ran. Check playwright.config.ts has globalSetup: './global-setup.ts'`,
    );
  }

  const raw: CachedAuth = JSON.parse(fs.readFileSync(AUTH_CACHE_PATH, 'utf-8'));
  const map = new Map<UserRole, AuthenticatedUser>();

  for (const [role, u] of Object.entries(raw.users)) {
    map.set(role as UserRole, {
      role: role as UserRole,
      id: u.id,
      token: u.token,
      email: u.email,
      name: u.name,
      portalUrl: u.portalUrl,
    });
  }

  _cached = map;
  return map;
}

/** Get a single user from cache */
export function getCachedUser(role: UserRole): AuthenticatedUser {
  const users = loadCachedUsers();
  const u = users.get(role);
  if (!u) throw new Error(`User ${role} not found in auth cache`);
  return u;
}
