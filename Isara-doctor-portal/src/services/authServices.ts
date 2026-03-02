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

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEYS = {
  CURRENT_USER: 'izara_current_user',
  AUTH_TOKEN: 'token',
  SESSION_EXPIRY: 'izara_session_expiry',
  DEVICE_ID: 'izara_device_id',
  LAST_ACTIVITY: 'izara_last_activity',
} as const;

const SESSION_TIMEOUT = config.security.sessionTimeout;
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes inactivity timeout
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

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
   * Register a new doctor account
   * All data goes to GCS - no local storage
   */
  async register(data: RegisterData): Promise<{ user: User; token: string }> {
    console.log('\n========================================');
    console.log('📝 REGISTRATION - GCS Cloud Storage');
    console.log('========================================');

    // Validation
    if (!data.email?.trim()) {
      throw new Error('Email is required');
    }
    if (!data.password || data.password.length < 8) {
      throw new Error('Password must be at least 8 characters');
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

    // Check if user exists in GCS
    const existingUser = await fetchUserByEmail(emailKey);
    if (existingUser) {
      throw new Error('This email is already registered. Please login instead.');
    }

    // Generate IDs
    const userId = generateDoctorId();
    const passwordHash = await hashPassword(data.password);

    // Default preferences
    const defaultPreferences: UserPreferences = {
      theme: 'light',
      language: 'en',
      notifications: {
        email: true,
        push: true,
        sms: false,
      },
    };

    // Create user credential record
    const userCredential: UserCredential = {
      id: userId,
      email: emailKey,
      passwordHash: passwordHash,
      role: 'doctor',
      doctorId: userId,
      medicalLicenseNumber: data.medicalLicenseNumber.trim(),
      isAdmin: false, // New users are not admins by default
      isActive: true,
      emailVerified: true, // Auto-verify for demo
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      loginAttempts: 0,
      lockedUntil: null,
      preferences: defaultPreferences,
      name: data.name.trim(),
      phone: data.phone?.trim(),
      dateOfBirth: data.dateOfBirth,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.name)}`,
      specialty: data.specialty?.trim(),
    };

    // Save to GCS
    const saved = await saveUser(userCredential);
    if (!saved) {
      throw new Error('Failed to save user to cloud storage. Please ensure the GCS API server is running.');
    }

    // Create session (stored locally for client)
    const user = this.credentialToUser(userCredential);
    const token = this.generateToken(user.id);
    this.saveLocalSession(user, token);

    // Log registration
    await this.logLoginAttempt(userId, true, emailKey, 'registration');

    console.log('========================================');
    console.log('✅ REGISTRATION SUCCESSFUL');
    console.log(`🆔 ID: ${user.id}`);
    console.log(`📧 Email: ${user.email}`);
    console.log('☁️  Stored in: izara-users-credentials');
    console.log('========================================\n');

    return { user, token };
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

      // Check response body before parsing
      const responseText = await response.text();
      let result;
      
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('❌ Failed to parse auth server response:', responseText, parseError);
        throw new Error('Server response was not valid JSON. Please try again.');
      }

      if (!response.ok || !result.success) {
        console.error('❌ Auth server login failed:', result.error || result.message);
        throw new Error(result.error || result.message || 'Invalid email or password');
      }

      console.log('✅ Auth server returned success');

      // Auth server returns user and token
      const { user: authUser, token: authToken } = result;

      // Map auth server response to our User type
      // Auth server returns: id, email, role, doctorId, medicalLicenseNumber, isActive, 
      // emailVerified, name, phone, dateOfBirth, avatarUrl, specialty, preferences, isAdmin, adminPrivileges
      const user: User = {
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
        // Admin privileges - CRITICAL for admin functionality
        isAdmin: authUser.isAdmin || false,
        adminPrivileges: authUser.adminPrivileges || undefined,
      };

      // Log admin status for debugging
      if (authUser.isAdmin) {
        console.log('👑 Admin user logged in:', authUser.email);
        console.log('🔑 Admin privileges:', JSON.stringify(authUser.adminPrivileges));
      }

      // Save session locally
      this.saveLocalSession(user, authToken);

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
   * Logout - clear local session
   */
  async logout(): Promise<void> {
    console.log('👋 Logging out...');
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
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

  private credentialToUser(credential: UserCredential): User {
    // Handle role - filter to only allow doctor or admin roles for this portal
    const validRole = (credential.role === 'doctor' || credential.role === 'admin') 
      ? credential.role 
      : 'doctor';
    
    return {
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

// Export device functions for session management
export { getDeviceId, updateLastActivity, isInactive };
