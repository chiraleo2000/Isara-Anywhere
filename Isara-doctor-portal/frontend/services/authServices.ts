/**
 * Auth Service - GCS-Only User Authentication
 *
 * ALL user data stored in GCS bucket: izara-users-credentials
 * Structure:
 * - users/index.json        (email -> id lookup)
 * - users/{id}.json         (full user credential record)
 * - sessions/{id}.json      (session data)
 * - login-history/{id}.json (audit logs)
 *
 * NO localStorage fallback for user data - GCS is the single source of truth.
 * localStorage is ONLY used for current session token (client-side).
 */

import { User, UserCredential, UserIndexEntry, RegisterData, LoginData, UserPreferences } from '../types';
import { writeToGCS, fetchFromGCS } from './gcsDataService';
import config from './config';
import { validateDoctorPassword } from '../utils/passwordPolicy';

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEYS = {
  CURRENT_USER: 'izara_current_user',
  AUTH_TOKEN: 'token',
  REFRESH_TOKEN: 'izara_refresh_token',
  SESSION_EXPIRY: 'izara_session_expiry',
  DEVICE_ID: 'izara_device_id',
  LAST_ACTIVITY: 'izara_last_activity',
} as const;

const SESSION_TIMEOUT = config.security.sessionTimeout;
const INACTIVITY_TIMEOUT = 3 * 60 * 60 * 1000; // 3 hours inactivity timeout
const _MAX_LOGIN_ATTEMPTS = 5;
const _LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const TOKEN_REFRESH_RATIO = 0.8; // Refresh at 80% of remaining lifetime

// ============================================================================
// DEVICE/SESSION FINGERPRINTING
// ============================================================================

/**
 * Generate a unique device fingerprint based on browser characteristics
 * This helps identify when a user is logging in from a different device/browser
 */
function generateDeviceFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 'unknown',
    navigator.platform || 'unknown',
  ];
  
  // Create a simple hash from components
  const fingerprint = components.join('|');
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.codePointAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return 'dev_' + Math.abs(hash).toString(36);
}

/**
 * Get or create a device ID for this browser
 * This is stored in localStorage to persist across sessions
 */
function getDeviceId(): string {
  let deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
  if (!deviceId) {
    deviceId = generateDeviceFingerprint() + '_' + Date.now().toString(36);
    localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
  }
  return deviceId;
}

/**
 * Update last activity timestamp
 * Called on user interactions to track activity
 */
function updateLastActivity(): void {
  localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());
}

/**
 * Decode JWT payload without cryptographic verification (client-side)
 * Used to read the `exp` claim for scheduling token refresh
 */
function decodeJwtPayload(token: string): { exp?: number; userId?: string; email?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = atob(parts[1].replaceAll('-', '+').replaceAll('_', '/'));
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/**
 * Check if session has timed out due to inactivity
 */
function isInactive(): boolean {
  const lastActivity = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY);
  if (!lastActivity) return true;
  return (Date.now() - Number.parseInt(lastActivity, 10)) > INACTIVITY_TIMEOUT;
}

// ============================================================================
// PASSWORD HASHING (SHA256)
// ============================================================================

/**
 * Hash password using SHA256
 * Uses Web Crypto API (works in browser)
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Verify password against stored hash
 */
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const inputHash = await hashPassword(password);
  return inputHash === storedHash;
}

// ============================================================================
// USER ID GENERATION
// ============================================================================

/**
 * Generate a unique doctor ID
 * Format: DOC-XXXX-NNN where XXXX is timestamp-based and NNN is random
 */
function generateDoctorId(): string {
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `DOC-${timestamp}-${random}`;
}

// ============================================================================
// GCS USER INDEX MANAGEMENT
// ============================================================================

/**
 * Fetch the user index from GCS
 */
async function fetchUserIndex(): Promise<UserIndexEntry[]> {
  const index = await fetchFromGCS<UserIndexEntry[]>('credentials', 'users/index.json', { cache: false });
  return index || [];
}

/**
 * Save the user index to GCS
 */
async function saveUserIndex(index: UserIndexEntry[]): Promise<boolean> {
  const result = await writeToGCS('credentials', 'users/index.json', index);
  return result.success;
}

/**
 * Add user to index
 */
async function addUserToIndex(user: UserCredential): Promise<boolean> {
  const index = await fetchUserIndex();
  
  // Filter role to doctor or admin only for this portal
  const indexRole: 'doctor' | 'admin' = (user.role === 'admin') ? 'admin' : 'doctor';

  // Check if email already exists
  const existingIndex = index.findIndex(u => u.email === user.email);
  if (existingIndex >= 0) {
    // Update existing entry
    index[existingIndex] = {
      id: user.id,
      email: user.email,
      role: indexRole,
      isActive: user.isActive,
    };
  } else {
    // Add new entry
    index.push({
      id: user.id,
      email: user.email,
      role: indexRole,
      isActive: user.isActive,
    });
  }

  return saveUserIndex(index);
}

/**
 * Find user ID by email in index
 */
async function findUserIdByEmail(email: string): Promise<string | null> {
  const index = await fetchUserIndex();
  const entry = index.find(u => u.email === email.toLowerCase().trim());
  return entry?.id || null;
}

// ============================================================================
// GCS USER CRUD OPERATIONS
// ============================================================================

/**
 * Fetch user credential from GCS by ID
 */
async function fetchUserById(userId: string): Promise<UserCredential | null> {
  return fetchFromGCS<UserCredential>('credentials', `users/${userId}.json`, { cache: false });
}

/**
 * Fetch user credential from GCS by email
 */
async function fetchUserByEmail(email: string): Promise<UserCredential | null> {
  const emailKey = email.toLowerCase().trim();
  const userId = await findUserIdByEmail(emailKey);

  if (!userId) {
    console.log(`❌ User not found in index: ${emailKey}`);
    return null;
  }

  return fetchUserById(userId);
}

/**
 * Save user credential to GCS
 */
async function saveUser(user: UserCredential): Promise<boolean> {
  console.log(`💾 Saving user to GCS: users/${user.id}.json`);

  // Save user data
  const result = await writeToGCS('credentials', `users/${user.id}.json`, user);

  if (!result.success) {
    console.error('❌ Failed to save user to GCS:', result.error);
    return false;
  }

  // Update index
  const indexUpdated = await addUserToIndex(user);
  if (!indexUpdated) {
    console.warn('⚠️ User saved but index update failed');
  }

  console.log(`✅ User saved to GCS: ${user.id}`);
  return true;
}

// ============================================================================
// AUTH SERVICE CLASS
// ============================================================================

export class AuthService {
  private static instance: AuthService;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Register a new doctor account via auth server (PostgreSQL).
   * Does not create a session — admin approval is required before login.
   */
  async register(data: RegisterData): Promise<{ user: User; token: string; pendingApproval: true }> {
    console.log('\n========================================');
    console.log('📝 REGISTRATION - Auth Server');
    console.log('========================================');

    if (!data.email?.trim()) {
      throw new Error('Email is required');
    }
    const passwordCheck = validateDoctorPassword(data.password || '');
    if (!passwordCheck.valid) {
      throw new Error(passwordCheck.errors.join('. '));
    }
    if (data.password !== data.confirmPassword) {
      throw new Error('Passwords do not match');
    }
    if (!data.name?.trim()) {
      throw new Error('Full name is required');
    }
    if (!data.medicalLicenseNumber?.trim()) {
      throw new Error('Medical License Number is required');
    }

    const emailKey = data.email.toLowerCase().trim();
    console.log(`📧 Registering: ${emailKey}`);

    const response = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailKey,
        password: data.password,
        name: data.name.trim(),
        phone: data.phone?.trim(),
        dateOfBirth: data.dateOfBirth,
        medicalLicenseNumber: data.medicalLicenseNumber.trim(),
        specialty: data.specialty?.trim() || 'General Practice',
        status: 'pending_approval',
      }),
    });

    const responseText = await response.text();
    let result: Record<string, unknown> = {};
    try {
      result = responseText ? JSON.parse(responseText) : {};
    } catch {
      throw new Error('Server response was not valid. Please try again.');
    }

    if (!response.ok) {
      throw new Error(
        (typeof result.error === 'string' && result.error) || 'Registration failed',
      );
    }

    const authUser = (result.user || {}) as Record<string, unknown>;
    const user: User = {
      displayName: String(authUser.name || data.name),
      id: String(authUser.id || ''),
      email: String(authUser.email || emailKey),
      name: String(authUser.name || data.name),
      role: 'doctor',
      doctorId: String(authUser.doctorId || authUser.id || ''),
      medicalLicenseNumber: data.medicalLicenseNumber.trim(),
      isActive: false,
      emailVerified: true,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.name)}`,
      dateOfBirth: data.dateOfBirth,
      phone: data.phone?.trim(),
      specialty: data.specialty?.trim() || 'General Practice',
      preferences: {
        theme: 'light',
        language: 'en',
        notifications: { email: true, push: true, sms: false },
      },
      isAdmin: false,
    };

    console.log('========================================');
    console.log('✅ REGISTRATION SUBMITTED (pending admin approval)');
    console.log(`📧 Email: ${user.email}`);
    console.log('========================================\n');

    return { user, token: '', pendingApproval: true };
  }

  /**
   * Login with email and password
   * Uses the auth server which handles bcrypt password verification
   * Includes device fingerprinting for multi-device session management
   */
  async login(data: LoginData): Promise<{ user: User; token: string }> {
    console.log('\n========================================');
    console.log('🔐 LOGIN - Auth Server');
    console.log('========================================');

    if (!data.email?.trim()) {
      throw new Error('Email is required');
    }
    if (!data.password) {
      throw new Error('Password is required');
    }

    const emailKey = data.email.toLowerCase().trim();
    const deviceId = getDeviceId();
    console.log(`📧 Logging in: ${emailKey}`);
    console.log(`📱 Device ID: ${deviceId}`);

    try {
      // Call auth server for login (handles bcrypt verification)
      // Uses relative URL which is proxied by Vite to auth server
      console.log('🔗 Calling auth server: /auth/login');
      
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailKey,
          password: data.password,
          deviceId: deviceId, // Include device ID for session tracking
          userAgent: navigator.userAgent,
        }),
      });

      const responseText = await response.text();
      const contentType = response.headers.get('content-type') || '';
      const trimmed = responseText.trim();

      if (!trimmed) {
        throw new Error(
          response.ok
            ? 'Empty response from auth server. Please try again.'
            : `Auth server error (${response.status}). Please try again.`,
        );
      }

      const looksLikeHtml = trimmed.startsWith('<') || trimmed.startsWith('<!');
      if (looksLikeHtml || (!contentType.includes('json') && !trimmed.startsWith('{') && !trimmed.startsWith('['))) {
        console.error('❌ Auth server returned non-JSON:', response.status, trimmed.slice(0, 200));
        throw new Error(
          'Auth service returned an unexpected response. Check your connection or try again in a moment.',
        );
      }

      let result: Record<string, unknown>;
      try {
        result = JSON.parse(trimmed) as Record<string, unknown>;
      } catch (parseError) {
        console.error('❌ Failed to parse auth server response:', trimmed.slice(0, 300), parseError);
        throw new Error('Server response was not valid JSON. Please try again.');
      }

      if (!response.ok || !result.success) {
        const errMsg =
          (typeof result.error === 'string' && result.error) ||
          (typeof result.message === 'string' && result.message) ||
          (typeof result.code === 'string' ? `Login failed (${result.code})` : '') ||
          'Invalid email or password';
        console.error('❌ Auth server login failed:', errMsg);
        const loginError = new Error(
          typeof result.message === 'string' && result.message ? result.message : errMsg,
        ) as Error & { code?: string };
        loginError.code = typeof result.code === 'string' ? result.code : undefined;
        throw loginError;
      }

      console.log('✅ Auth server returned success');

      const authUser = result.user as Record<string, unknown>;
      const authToken = result.token as string;

      // Map auth server response to our User type
      // Auth server returns: id, email, role, doctorId, medicalLicenseNumber, isActive, 
      // emailVerified, name, phone, dateOfBirth, avatarUrl, specialty, preferences, isAdmin, adminPrivileges
      const userName = String(authUser.name || 'Doctor');
      const userEmail = String(authUser.email || emailKey);
      const user: User = {
        displayName: userName,
        id: String(authUser.id || ''),
        email: userEmail,
        name: userName,
        role: (authUser.role as User['role']) || 'doctor',
        doctorId: String(authUser.doctorId || authUser.id || ''),
        medicalLicenseNumber: String(authUser.medicalLicenseNumber || ''),
        isActive: authUser.isActive !== false,
        emailVerified: authUser.emailVerified !== false,
        avatarUrl: String(authUser.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userName || userEmail)}`),
        dateOfBirth: authUser.dateOfBirth as string | undefined,
        phone: authUser.phone as string | undefined,
        specialty: authUser.specialty as string | undefined,
        preferences: (authUser.preferences as User['preferences']) || {
          theme: 'light',
          language: 'th',
          notifications: { email: true, sms: true, push: true },
        },
        // Admin privileges - CRITICAL for admin functionality
        isAdmin: Boolean(authUser.isAdmin),
        adminPrivileges: authUser.adminPrivileges as User['adminPrivileges'],
      };

      // Log admin status for debugging
      if (user.isAdmin) {
        console.log('👑 Admin user logged in:', user.email);
        console.log('🔑 Admin privileges:', JSON.stringify(user.adminPrivileges));
      }

      // Save session locally
      this.saveLocalSession(user, authToken);

      // Store refresh token and start auto-refresh timer
      const refreshToken = result.refreshToken;
      if (typeof refreshToken === 'string' && refreshToken) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      }
      this.startTokenRefreshTimer(authToken);

      // Log successful login
      await this.logLoginAttempt(user.id, true, emailKey, 'login');

      console.log('========================================');
      console.log('✅ LOGIN SUCCESSFUL');
      console.log(`🆔 ID: ${user.id}`);
      console.log(`📧 Email: ${user.email}`);
      console.log('========================================\n');

      return { user, token: authToken };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      console.error('❌ Login error:', errorMessage);
      
      // Log failed attempt
      await this.logLoginAttempt('unknown', false, emailKey, 'login');
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Sign in with Google (verifies ID token via /auth/google-auth).
   * Throws an error with code `PENDING_APPROVAL` if the doctor account
   * exists but has not been approved yet.
   */
  async loginWithGoogle(idToken: string): Promise<{ user: User; token: string }> {
    if (!idToken) throw new Error('Google ID token is required');
    console.log('\n========================================');
    console.log('🔐 GOOGLE SSO LOGIN');
    console.log('========================================');

    const response = await fetch('/auth/google-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    let result: any = {};
    try { result = await response.json(); } catch { /* non-JSON body */ }

    if (!response.ok) {
      const code = result.code || result.error || 'GOOGLE_SSO_ERROR';
      const message = result.message || result.error || 'Google sign-in failed';
      const err = new Error(message) as Error & { code?: string; userId?: string; email?: string };
      err.code = code;
      err.userId = result.userId;
      err.email = result.email;
      throw err;
    }

    if (!result.user || !result.token) {
      throw new Error('Invalid response from server');
    }

    const authUser = result.user;
    const user: User = {
      displayName: authUser.name || 'Doctor',
      id: authUser.id,
      email: authUser.email,
      name: authUser.name || 'Doctor',
      role: authUser.role || 'doctor',
      doctorId: authUser.doctorId || authUser.id,
      medicalLicenseNumber: authUser.medicalLicenseNumber || '',
      isActive: authUser.isActive !== false,
      emailVerified: authUser.emailVerified !== false,
      avatarUrl: authUser.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(authUser.name || authUser.email)}`,
      dateOfBirth: authUser.dateOfBirth,
      phone: authUser.phone,
      specialty: authUser.specialty,
      preferences: authUser.preferences || {
        theme: 'light',
        language: 'th',
        notifications: { email: true, sms: true, push: true },
      },
      isAdmin: authUser.isAdmin || false,
      adminPrivileges: authUser.adminPrivileges || undefined,
    };

    this.saveLocalSession(user, result.token);
    if (result.refreshToken) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, result.refreshToken);
    }
    this.startTokenRefreshTimer(result.token);

    console.log(`✅ Google SSO login successful: ${user.email}`);
    return { user, token: result.token };
  }

  /**
   * Logout - clear local session
   */
  async logout(): Promise<void> {
    console.log('👋 Logging out...');
    this.stopTokenRefreshTimer();

    // Call server to revoke refresh tokens
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      try {
        const authUrl = config.api.authUrl || `${config.api.baseUrl || ''}/auth`;
        await fetch(`${authUrl}/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        console.warn('Server logout call failed:', e);
      }
    }

    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.SESSION_EXPIRY);
    console.log('✅ Session cleared');
  }

  /**
   * Get current user from local session
   */
  getCurrentUser(): User | null {
    if (!this.isSessionValid()) {
      return null;
    }
    try {
      const userJson = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('Failed to get current user from session:', error);
      return null;
    }
  }

  /**
   * Get auth token
   */
  getToken(): string | null {
    return this.isSessionValid() ? localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) : null;
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return !!(this.getCurrentUser() && this.getToken());
  }

  /**
   * Get auth headers for API requests
   */
  getAuthHeaders(): HeadersInit {
    const token = this.getToken();
    return {
      'Authorization': `Bearer ${token || ''}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Refresh session expiry and update activity timestamp
   * Called periodically and on user interactions
   */
  refreshSession(): void {
    const user = this.getCurrentUser();
    const token = this.getToken();
    if (user && token) {
      this.saveLocalSession(user, token);
      updateLastActivity();
      // Restart refresh timer with recalculated remaining time
      this.startTokenRefreshTimer(token);
    }
  }

  /**
   * Check and enforce inactivity timeout
   * Returns true if session is still valid, false if logged out
   */
  checkInactivityTimeout(): boolean {
    if (isInactive()) {
      console.log('⚠️ Session expired due to 15 minutes of inactivity');
      this.logout();
      return false;
    }
    updateLastActivity();
    return true;
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<User>): Promise<User | null> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    // Fetch from GCS
    const userCredential = await fetchUserById(currentUser.id);
    if (!userCredential) {
      throw new Error('User not found');
    }

    // Apply updates (only allowed fields)
    if (updates.name) userCredential.name = updates.name;
    if (updates.phone) userCredential.phone = updates.phone;
    if (updates.dateOfBirth) userCredential.dateOfBirth = updates.dateOfBirth;
    if (updates.avatarUrl) userCredential.avatarUrl = updates.avatarUrl;
    if (updates.specialty) userCredential.specialty = updates.specialty;
    if (updates.preferences) userCredential.preferences = updates.preferences;

    // Save to GCS
    const saved = await saveUser(userCredential);
    if (!saved) {
      throw new Error('Failed to update profile');
    }

    // Update local session
    const user = this.credentialToUser(userCredential);
    const token = this.getToken();
    if (token) {
      this.saveLocalSession(user, token);
    }

    return user;
  }

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters');
    }

    // Fetch from GCS
    const userCredential = await fetchUserById(currentUser.id);
    if (!userCredential) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, userCredential.passwordHash);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Update password
    userCredential.passwordHash = await hashPassword(newPassword);

    // Save to GCS
    return saveUser(userCredential);
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================
  // TOKEN REFRESH
  // ============================================================================

  private refreshTimerId: ReturnType<typeof setTimeout> | null = null;

  /**
   * Start (or restart) the auto-refresh timer based on JWT exp or local session expiry.
   * Opaque PG session tokens (64-char hex) use izara_session_expiry from localStorage.
   */
  startTokenRefreshTimer(sessionToken: string): void {
    this.stopTokenRefreshTimer();

    const payload = decodeJwtPayload(sessionToken);
    let expiresAtMs: number | null = payload?.exp ? payload.exp * 1000 : null;
    if (!expiresAtMs) {
      const expiryStr = localStorage.getItem(STORAGE_KEYS.SESSION_EXPIRY);
      if (expiryStr) {
        expiresAtMs = Number.parseInt(expiryStr, 10);
      }
    }
    if (!expiresAtMs || expiresAtMs <= Date.now()) return;

    const remainingMs = expiresAtMs - Date.now();
    const delayMs = Math.max(remainingMs * TOKEN_REFRESH_RATIO, 5000); // at least 5 s
    console.log(`⏱️ Token refresh scheduled in ${Math.round(delayMs / 1000)}s`);

    this.refreshTimerId = setTimeout(() => this.performTokenRefresh(), delayMs);
  }

  stopTokenRefreshTimer(): void {
    if (this.refreshTimerId) {
      clearTimeout(this.refreshTimerId);
      this.refreshTimerId = null;
    }
  }

  /**
   * Silently refresh the JWT using the stored refresh token.
   * @returns true if a new session token was stored
   */
  async trySilentRefresh(): Promise<boolean> {
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    const deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (!refreshToken) {
      return false;
    }

    try {
      const authUrl = config.api.authUrl || `${config.api.baseUrl || ''}/auth`;
      const res = await fetch(`${authUrl}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ refreshToken, deviceId }),
      });

      if (!res.ok) {
        return false;
      }

      const data = await res.json();
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
      if (data.refreshToken) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
      }
      if (data.user) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(data.user));
      }
      const expiry = Date.now() + (data.expiresIn ? data.expiresIn * 1000 : SESSION_TIMEOUT);
      localStorage.setItem(STORAGE_KEYS.SESSION_EXPIRY, expiry.toString());
      updateLastActivity();
      this.startTokenRefreshTimer(data.token);
      return true;
    } catch (err) {
      console.error('Token refresh network error:', err);
      return false;
    }
  }

  /**
   * Silently refresh the JWT using the stored refresh token.
   */
  private async performTokenRefresh(): Promise<void> {
    const ok = await this.trySilentRefresh();
    if (!ok) {
      console.warn('⚠️ Token refresh failed — forcing logout');
      await this.logout();
      globalThis.location.href = '/login';
    } else {
      console.log('🔄 Token refreshed silently');
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private credentialToUser(credential: UserCredential): User {
    // Handle role - filter to only allow doctor or admin roles for this portal
    const validRole = (credential.role === 'doctor' || credential.role === 'admin') 
      ? credential.role 
      : 'doctor';
    
    return {
      displayName: credential.name || 'Doctor',
      id: credential.id,
      email: credential.email,
      name: credential.name || 'Doctor',
      role: validRole,
      doctorId: credential.doctorId || credential.id,
      medicalLicenseNumber: credential.medicalLicenseNumber || '',
      isActive: credential.isActive,
      emailVerified: credential.emailVerified,
      avatarUrl: credential.avatarUrl,
      dateOfBirth: credential.dateOfBirth,
      phone: credential.phone,
      specialty: credential.specialty,
      preferences: credential.preferences,
      isAdmin: credential.isAdmin,
      adminPrivileges: credential.adminPrivileges,
    };
  }

  private isSessionValid(): boolean {
    const expiry = localStorage.getItem(STORAGE_KEYS.SESSION_EXPIRY);
    if (!expiry) return false;
    
    // Check absolute session expiry
    if (Date.now() >= Number.parseInt(expiry, 10)) return false;
    
    // Check inactivity timeout (15 minutes)
    if (isInactive()) {
      console.log('⚠️ Session expired due to inactivity');
      this.logout();
      return false;
    }
    
    return true;
  }

  private saveLocalSession(user: User, token: string): void {
    const expiry = Date.now() + SESSION_TIMEOUT;
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.SESSION_EXPIRY, expiry.toString());
    updateLastActivity(); // Start activity tracking
  }

  private generateToken(userId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `izara_${userId}_${timestamp}_${random}`;
  }

  private async logLoginAttempt(
    userId: string,
    success: boolean,
    email: string,
    action: 'login' | 'registration'
  ): Promise<void> {
    if (!config.features.auditLoggingEnabled) return;

    try {
      const historyPath = `login-history/${userId}.json`;
      const history = await fetchFromGCS<any[]>('credentials', historyPath, { cache: false }) || [];

      history.push({
        timestamp: new Date().toISOString(),
        email,
        action,
        success,
        userAgent: typeof navigator === 'undefined' ? 'server' : navigator.userAgent,
        source: 'doctor-portal',
      });

      // Keep only last 100 entries
      const trimmedHistory = history.slice(-100);
      await writeToGCS('credentials', historyPath, trimmedHistory);
    } catch (error) {
      console.warn('Failed to log login attempt:', error);
    }
  }
}

export const authService = AuthService.getInstance();

// Export convenience functions
export const register = (data: RegisterData) => authService.register(data);
export const login = (data: LoginData) => authService.login(data);
export const logout = () => authService.logout();
export const getCurrentUser = () => authService.getCurrentUser();
export const isAuthenticated = () => authService.isAuthenticated();
export const getToken = () => authService.getToken();
export const getAuthHeaders = () => authService.getAuthHeaders();
export const refreshSession = () => authService.refreshSession();
export const checkInactivityTimeout = () => authService.checkInactivityTimeout();
export const trySilentRefresh = () => authService.trySilentRefresh();

/** Proactive refresh before meeting lifecycle calls (save-recording, /end). */
export async function ensureMeetingSessionFresh(): Promise<boolean> {
  const refreshed = await authService.trySilentRefresh();
  if (refreshed) return true;
  authService.refreshSession();
  return authService.getToken() !== null;
}

function resolveBearerToken(): string {
  return (
    authService.getToken()
    || localStorage.getItem('token')
    || localStorage.getItem('izara_auth_token')
    || ''
  );
}

function isSessionAuthFailure(status: number, body: { code?: string; error?: string }): boolean {
  if (status === 401) return true;
  return status === 403 && (body.code === 'SESSION_INVALID' || /session expired|invalid/i.test(body.error || ''));
}

/** Authenticated fetch with credentials, token refresh, and single retry on session expiry. */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  refreshSession();

  const execute = async (): Promise<Response> => {
    const token = resolveBearerToken();
    const headers = new Headers(init.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    return fetch(input, {
      ...init,
      credentials: 'include',
      headers,
    });
  };

  let response = await execute();
  if (response.ok) {
    return response;
  }

  const errBody = await response.clone().json().catch(() => ({} as { code?: string; error?: string }));
  if (!isSessionAuthFailure(response.status, errBody)) {
    return response;
  }

  const refreshed = await authService.trySilentRefresh();
  if (refreshed) {
    response = await execute();
    if (response.ok) {
      return response;
    }
  }

  await authService.logout();
  if (typeof globalThis !== 'undefined' && globalThis.location?.pathname !== '/login') {
    globalThis.location.href = '/login?reason=session_expired';
  }
  return response;
}

/**
 * Initialize the token refresh timer from a stored JWT.
 * Call once on app startup (e.g. in App.tsx or AuthProvider mount).
 */
export function initTokenRefreshTimer(): void {
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  if (token) {
    authService.startTokenRefreshTimer(token);
  }
}

// Export device functions for session management
export { getDeviceId, updateLastActivity, isInactive };
