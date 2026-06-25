import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import node_crypto from 'node:crypto';
import postgresDataService from '../services/postgresDataService';
import { errMsg } from '../utils';

const { pool } = postgresDataService;
const router = Router();

// ============================================================================
// AUTH RATE LIMITING (in-memory, per-IP — stricter for auth endpoints)
// ============================================================================
const authRateLimits = new Map<string, { count: number; start: number }>();

function authRateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    let entry = authRateLimits.get(ip);
    if (!entry || now - entry.start > windowMs) {
      entry = { count: 1, start: now };
      authRateLimits.set(ip, entry);
    } else {
      entry.count++;
    }
    if (entry.count > maxRequests) {
      return res.status(429).json({ error: 'Too many attempts. Please try again later.' });
    }
    next();
  };
}

// Auth endpoints: rate limited in production only — unlimited in dev/test
const isProduction = process.env.NODE_ENV === 'production';
const authRateLimitMax = Number.parseInt(process.env.RATE_LIMIT_MAX || '0') || 10;
const authLimiter = isProduction
  ? authRateLimit(authRateLimitMax, 60000)
  : (_req: Request, _res: Response, next: NextFunction) => next();

// ============================================================================
// PRODUCTION MODE - PostgreSQL ONLY (No Demo Mode)
// ============================================================================
console.log('[AUTH] Production mode - PostgreSQL only');

// Database connection status
let dbAvailable = false;

async function checkDbConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    dbAvailable = true;
    return true;
  } catch (err) {
    console.error('[AUTH] DB connection check failed:', (err as Error).message);
    dbAvailable = false;
    return false;
  }
}

// Initialize db check - run immediately (fire and forget with logging)
try {
  const available = await checkDbConnection();
  console.log(available 
    ? '✅ PostgreSQL connected - Production mode active' 
    : '❌ PostgreSQL unavailable - Authentication will fail until DB is available');
} catch (error_) {
  console.warn('⚠️ Initial DB connection check failed:', (error_ as Error).message);
}

// Keep-alive: periodically check database connection
setInterval(() => {
  checkDbConnection().catch(() => {});
}, 30000);

// ============================================================================
// POSTGRESQL-ONLY AUTHENTICATION - NO GCS
// ============================================================================

// Helper: Generate secure random token
function generateSecureToken(length: number = 64): string {
  return node_crypto.randomBytes(length).toString('hex');
}

// Helper: Generate session token
function generateSessionToken(): string {
  return `token_${Date.now()}_${generateSecureToken(32)}`;
}

// Helper: Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper: Hash password with bcrypt
async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

// Helper: Verify password (bcrypt only - legacy base64 removed for security)
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (hash.startsWith('$2')) {
    return bcrypt.compare(password, hash);
  }
  // Legacy base64 hashes are no longer supported - user must reset password
  return false;
}

// ============================================================================
// VALIDATION HELPERS - Extracted to reduce cognitive complexity
// ============================================================================
interface ValidationError {
  success: false;
  error: string;
  message: string;
}

function validateRegistrationInput(body: Record<string, unknown>): ValidationError | null {
  const { email, password, confirmPassword } = body;
  
  if (!email) {
    return { success: false, error: 'Email is required', message: 'Please provide an email address' };
  }
  if (!password) {
    return { success: false, error: 'Password is required', message: 'Please provide a password' };
  }
  if (!isValidEmail(email as string)) {
    return { success: false, error: 'Invalid email format', message: 'Please provide a valid email address' };
  }
  if (confirmPassword && password !== confirmPassword) {
    return { success: false, error: 'Passwords do not match', message: 'Password and confirmation must match' };
  }
  if ((password as string).length < 12) {
    return { success: false, error: 'Password too short', message: 'Password must be at least 12 characters' };
  }
  return null;
}

// Helper: Parse comma/semicolon separated list input
function parseList(str: string | undefined): string[] {
  if (!str) return [];
  return str.split(/[,;]/).map(s => s.trim()).filter(Boolean);
}

// Helper: Check if user email already exists, returns userId or null
async function findExistingUserByEmail(emailLower: string): Promise<string | null> {
  try {
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [emailLower]
    );
    return existingUser.rows.length > 0 ? existingUser.rows[0].id : null;
  } catch (dbError) {
    console.error('DB check error:', dbError);
    return null; // Continue with registration attempt
  }
}

// ============================================================================
// REGISTER NEW USER
// ============================================================================
router.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const { 
      name, email, password, phone, dateOfBirth, gender,
      height, weight, bloodType, allergies, chronicConditions, currentMedications,
      emergencyContactName, emergencyContactPhone, emergencyContactRelation
    } = req.body;

    // Validate input using extracted helper
    const validationError = validateRegistrationInput(req.body);
    if (validationError) {
      return res.status(400).json(validationError);
    }

    const emailLower = email.toLowerCase().trim();

    // Check if email already exists using extracted helper
    const existingUserId = await findExistingUserByEmail(emailLower);
    if (existingUserId) {
      return res.json({ 
        success: true,
        message: 'User already exists',
        userId: existingUserId,
        alreadyExists: true
      });
    }

    // Generate IDs and hash password
    // IMPORTANT: Use same ID for userId and patientId to satisfy FK constraints
    // PHR table references users(id), so patient_id in PHR must match users.id
    const uniqueId = `PATIENT-${Date.now()}-${node_crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const userId = uniqueId;
    const patientId = uniqueId; // Same as userId for FK constraint compatibility
    const passwordHash = await hashPassword(password);
    const now = new Date();

    // Insert user into PostgreSQL
    // Note: id and patient_id are the same to satisfy FK constraints
    await pool.query(
      `INSERT INTO users (id, patient_id, email, password_hash, name, phone, date_of_birth, gender, role, is_active, is_verified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'patient', true, true, $9, $9)`,
      [userId, patientId, emailLower, passwordHash, name || 'User', phone, dateOfBirth, gender, now]
    );

    // Create initial PHR record
    // patient_id references users(id), so use userId (which equals patientId)
    const bmi = height && weight ? (Number.parseFloat(weight) / Math.pow(Number.parseFloat(height) / 100, 2)).toFixed(1) : null;
    
    await pool.query(
      `INSERT INTO phr (id, patient_id, blood_type, allergies, chronic_conditions, medications, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, height_cm, weight_kg, bmi, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
       ON CONFLICT (patient_id) DO UPDATE SET
         blood_type = EXCLUDED.blood_type,
         allergies = EXCLUDED.allergies,
         chronic_conditions = EXCLUDED.chronic_conditions,
         medications = EXCLUDED.medications,
         updated_at = NOW()`,
      [
        `phr_${userId}`,
        userId, // Must reference users.id, not a separate patient_id
        bloodType || null,
        JSON.stringify(parseList(allergies)),
        JSON.stringify(parseList(chronicConditions)),
        JSON.stringify(parseList(currentMedications)),
        emergencyContactName || null,
        emergencyContactPhone || null,
        emergencyContactRelation || null,
        height ? Number.parseFloat(height) : null,
        weight ? Number.parseFloat(weight) : null,
        bmi ? Number.parseFloat(bmi) : null,
        now
      ]
    );

    console.log(`[AUTH] User registered successfully: ${emailLower}, patientId: ${patientId}`);

    res.json({
      success: true,
      message: 'Registration successful. Please log in with your credentials.',
      user: {
        id: userId,
        patientId,
        name: name || 'User',
        email: emailLower,
        phone,
        dateOfBirth,
        gender,
        avatarUrl: `https://i.pravatar.cc/150?u=${userId}`,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error('[AUTH] Registration error:', error);
    
    // Handle duplicate user errors gracefully
    if (errMsg(error)?.includes('duplicate') || (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === '23505')) {
      return res.json({ 
        success: true,
        message: 'User already exists',
        alreadyExists: true
      });
    }
    
    // Return error on registration failure - NO demo fallback in production
    res.status(500).json({ 
      success: false,
      error: 'Registration failed',
      message: errMsg(error)
    });
  }
});

// ============================================================================
// LOGIN - PRODUCTION MODE (PostgreSQL Only)
// ============================================================================
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const emailLower = email?.toLowerCase().trim();

    console.log(`[AUTH] Login attempt for: ${emailLower}`);

    if (!emailLower || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check database connection - if not available, try to reconnect
    if (!dbAvailable) {
      const connectionOk = await checkDbConnection();
      if (!connectionOk) {
        console.error('[AUTH] Database unavailable for login');
        return res.status(503).json({ error: 'Database temporarily unavailable. Please try again.' });
      }
    }

    // Find user in PostgreSQL
    const userResult = await pool.query(
      `SELECT id, patient_id, email, password_hash, name, name_thai, phone, avatar_url, date_of_birth, gender, role, is_active
       FROM users WHERE LOWER(email) = LOWER($1)`,
      [emailLower]
    );

    if (userResult.rows.length === 0) {
      console.log(`[AUTH] User not found: ${emailLower}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Verify password
    const passwordValid = await verifyPassword(password, user.password_hash);
    if (!passwordValid) {
      console.log(`[AUTH] Password mismatch for: ${emailLower}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log(`[AUTH] Password verified for: ${emailLower}`);

    // Create session - invalidate old sessions first to prevent cross-device contamination
    const sessionToken = generateSessionToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Invalidate previous sessions (skip during E2E — parallel Playwright contexts share one user)
    if (process.env.E2E_ALLOW_PARALLEL_SESSIONS !== '1') {
      await pool.query(
        `UPDATE sessions SET expires_at = NOW(), logged_out_at = NOW()
         WHERE user_id = $1 AND expires_at > NOW() AND logged_out_at IS NULL`,
        [user.id]
      );
    }

    await pool.query(
      `INSERT INTO sessions (id, user_id, token, ip_address, user_agent, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        `session_${Date.now()}`,
        user.id,
        sessionToken,
        req.ip || 'unknown',
        req.headers['user-agent'] || 'unknown',
        expiresAt,
        now
      ]
    );

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = $1 WHERE id = $2',
      [now, user.id]
    );

    console.log(`[AUTH] Login successful for: ${emailLower}, patientId: ${user.patient_id}`);

    res.json({
      success: true,
      user: {
        id: user.id,
        patientId: user.patient_id || user.id,
        name: user.name,
        nameThai: user.name_thai,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatar_url || `https://i.pravatar.cc/150?u=${user.id}`,
        dateOfBirth: user.date_of_birth,
        gender: user.gender,
        role: user.role,
        updatedAt: now.toISOString(),
      },
      token: sessionToken,
    });
  } catch (error: unknown) {
    console.error('[AUTH] Login error:', error);
    res.status(500).json({ error: 'Login failed: ' + errMsg(error) });
  }
});

// ============================================================================
// VALIDATE SESSION - PRODUCTION MODE (PostgreSQL Only)
// ============================================================================
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ valid: false, error: 'Token is required' });
    }

    // Validate session in PostgreSQL
    const sessionResult = await pool.query(
      `SELECT s.*, u.id as user_id, u.patient_id, u.name, u.email
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token]
    );

    if (sessionResult.rows.length === 0) {
      return res.json({ valid: false, error: 'Session expired or invalid' });
    }

    const session = sessionResult.rows[0];
    res.json({ 
      valid: true, 
      userId: session.user_id,
      patientId: session.patient_id 
    });
  } catch (error: unknown) {
    console.error('[AUTH] Validation error:', error);
    res.status(500).json({ valid: false, error: 'Validation failed' });
  }
});

// ============================================================================
// LOGOUT
// ============================================================================
router.post('/logout', async (req: Request, res: Response) => {
  try {
    // Accept token from body or Authorization header
    const bodyToken = req.body?.token;
    const authHeader = req.headers.authorization;
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const token = bodyToken || headerToken;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Delete session from PostgreSQL
    await pool.query('DELETE FROM sessions WHERE token = $1', [token]);

    console.log('[AUTH] Logout successful');
    res.json({ success: true });
  } catch (error: unknown) {
    console.error('[AUTH] Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ============================================================================
// GET CURRENT USER PROFILE (/me)
// ============================================================================
router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate session and get user
    const sessionResult = await pool.query(
      `SELECT s.*, u.*
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW() AND u.is_active = true`,
      [token]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }

    const user = sessionResult.rows[0];

    res.json({
      user: {
        id: user.user_id,
        patientId: user.patient_id || user.user_id,
        name: user.name,
        nameThai: user.name_thai,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatar_url || `https://i.pravatar.cc/150?u=${user.user_id}`,
        dateOfBirth: user.date_of_birth,
        gender: user.gender,
        role: user.role,
      }
    });
  } catch (error: unknown) {
    console.error('[AUTH] Get user error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// ============================================================================
// UPDATE USER PROFILE
// ============================================================================
router.put('/profile', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate session
    const sessionResult = await pool.query(
      `SELECT user_id FROM sessions WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }

    const userId = sessionResult.rows[0].user_id;
    const { name, nameThai, phone, dateOfBirth, gender, avatarUrl } = req.body;

    const updateResult = await pool.query(
      `UPDATE users SET
         name = COALESCE($1, name),
         name_thai = COALESCE($2, name_thai),
         phone = COALESCE($3, phone),
         date_of_birth = COALESCE($4, date_of_birth),
         gender = COALESCE($5, gender),
         avatar_url = COALESCE($6, avatar_url),
         updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [name, nameThai, phone, dateOfBirth, gender, avatarUrl, userId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = updateResult.rows[0];
    console.log(`[AUTH] Profile updated for user: ${userId}`);

    res.json({
      user: {
        id: user.id,
        patientId: user.patient_id,
        name: user.name,
        nameThai: user.name_thai,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatar_url,
        dateOfBirth: user.date_of_birth,
        gender: user.gender,
        role: user.role,
      }
    });
  } catch (error: unknown) {
    console.error('[AUTH] Profile update error:', error);
    res.status(500).json({ error: 'Profile update failed: ' + errMsg(error) });
  }
});

// ============================================================================
// CHANGE PASSWORD (for logged in users)
// ============================================================================
router.post('/change-password', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All password fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New passwords do not match' });
    }

    if (newPassword.length < 12) {
      return res.status(400).json({ error: 'Password must be at least 12 characters' });
    }

    // Validate session and get user
    const sessionResult = await pool.query(
      `SELECT s.user_id, u.password_hash, u.email
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }

    const { user_id, password_hash, email } = sessionResult.rows[0];

    // Verify current password
    const currentPasswordValid = await verifyPassword(currentPassword, password_hash);
    if (!currentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password and update
    const newPasswordHash = await hashPassword(newPassword);
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, user_id]
    );

    console.log(`[AUTH] Password changed for user: ${email}`);

    res.json({ 
      success: true, 
      message: 'Password changed successfully' 
    });
  } catch (error: unknown) {
    console.error('[AUTH] Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ============================================================================
// REQUEST PASSWORD RESET (for forgotten password)
// ============================================================================
router.post('/request-password-reset', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required', code: 'MISSING_EMAIL' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format', code: 'INVALID_EMAIL' });
    }

    const emailLower = email.toLowerCase().trim();
    console.log(`[PASSWORD_RESET] Request received for: ${emailLower}`);

    // Find user
    const userResult = await pool.query(
      'SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1)',
      [emailLower]
    );

    // Always return same response to prevent user enumeration
    if (userResult.rows.length === 0) {
      console.log(`[PASSWORD_RESET] User not found: ${emailLower}`);
      return res.json({ 
        success: true, 
        message: 'If the email exists, a reset link will be sent.' 
      });
    }

    const user = userResult.rows[0];

    // Generate reset token
    const resetToken = generateSecureToken(32);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token in database
    await pool.query(
      `INSERT INTO password_resets (id, user_id, token, expires_at, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         token = EXCLUDED.token,
         expires_at = EXCLUDED.expires_at,
         used = false,
         created_at = NOW()`,
      [`reset_${Date.now()}`, user.id, resetToken, expiresAt]
    );

    // Generate reset link
    const baseUrl = process.env.APP_URL || 'http://localhost:3005';
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

    // Log reset request (without sensitive token details)
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    if (isDevelopment) {
      console.log(`\n📧 PASSWORD RESET REQUEST`);
      console.log(`   Email: ${emailLower}`);
      console.log(`   User: ${user.name}`);
      console.log(`   Token: ${resetToken}`);
      console.log(`   Reset Link: ${resetLink}`);
      console.log(`   Expires: ${expiresAt.toISOString()}\n`);
    } else {
      console.log(`📧 Password reset requested for: ${emailLower}`);
    }

    // In production, send email here
    res.json({ 
      success: true, 
      message: 'Password reset link sent to your email. Please check your inbox.',
      devToken: isDevelopment ? resetToken : undefined
    });
  } catch (error: unknown) {
    console.error('[PASSWORD_RESET] Error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// ============================================================================
// VERIFY RESET TOKEN
// ============================================================================
router.get('/verify-reset-token/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ valid: false, error: 'Token is required' });
    }

    const resetResult = await pool.query(
      `SELECT pr.*, u.email 
       FROM password_resets pr
       JOIN users u ON pr.user_id = u.id
       WHERE pr.token = $1`,
      [token]
    );

    if (resetResult.rows.length === 0) {
      return res.json({ valid: false, error: 'Invalid or expired reset token' });
    }

    const resetData = resetResult.rows[0];

    if (resetData.used) {
      return res.json({ valid: false, error: 'Reset token has already been used' });
    }

    if (new Date(resetData.expires_at) < new Date()) {
      return res.json({ valid: false, error: 'Reset token has expired' });
    }

    res.json({ 
      valid: true, 
      email: resetData.email 
    });
  } catch (error: unknown) {
    console.error('[VERIFY_TOKEN] Error:', error);
    res.status(500).json({ valid: false, error: 'Failed to verify token' });
  }
});

// ============================================================================
// RESET PASSWORD WITH TOKEN
// ============================================================================
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    // Validation
    if (!token) {
      return res.status(400).json({ error: 'Reset token is required' });
    }

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'New password and confirmation are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (newPassword.length < 12) {
      return res.status(400).json({ error: 'Password must be at least 12 characters' });
    }

    // Verify token
    const resetResult = await pool.query(
      `SELECT pr.*, u.email 
       FROM password_resets pr
       JOIN users u ON pr.user_id = u.id
       WHERE pr.token = $1`,
      [token]
    );

    if (resetResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const resetData = resetResult.rows[0];

    if (resetData.used) {
      return res.status(400).json({ error: 'Reset token has already been used' });
    }

    if (new Date(resetData.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    // Hash new password and update user
    const newPasswordHash = await hashPassword(newPassword);
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, resetData.user_id]
    );

    // Mark token as used
    await pool.query(
      'UPDATE password_resets SET used = true, used_at = NOW() WHERE token = $1',
      [token]
    );

    console.log(`[PASSWORD_RESET] Password reset successful for: ${resetData.email}`);

    res.json({ 
      success: true, 
      message: 'Password has been reset successfully. You can now login with your new password.' 
    });
  } catch (error: unknown) {
    console.error('[RESET_PASSWORD] Error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ============================================================================
// DEBUG: CHECK USER STATUS
// ============================================================================
router.get('/check-user/:email', async (req: Request, res: Response) => {
  try {
    const emailLower = req.params.email?.toLowerCase().trim();
    console.log(`[AUTH DEBUG] Checking user: ${emailLower}`);

    const userResult = await pool.query(
      `SELECT id, patient_id, email, name, role, is_active, password_hash IS NOT NULL as has_password,
              CASE WHEN password_hash LIKE '$2%' THEN 'bcrypt' ELSE 'base64' END as password_format,
              created_at, last_login
       FROM users WHERE LOWER(email) = LOWER($1)`,
      [emailLower]
    );

    if (userResult.rows.length === 0) {
      return res.json({ 
        found: false, 
        email: emailLower, 
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];
    res.json({
      found: true,
      email: emailLower,
      id: user.id,
      patientId: user.patient_id,
      name: user.name,
      role: user.role,
      isActive: user.is_active,
      hasPassword: user.has_password,
      passwordFormat: user.password_format,
      createdAt: user.created_at,
      lastLogin: user.last_login
    });
  } catch (error: unknown) {
    console.error('[AUTH DEBUG] Error:', error);
    res.status(500).json({ error: errMsg(error) });
  }
});

// ============================================================================
// AVATAR/PROFILE IMAGE UPLOAD ENDPOINTS
// ============================================================================

// POST /api/auth/avatar - Upload avatar URL
router.post('/avatar', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate session
    const sessionResult = await pool.query(
      `SELECT user_id FROM sessions WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }

    const userId = sessionResult.rows[0].user_id;
    const { avatarUrl } = req.body;

    if (!avatarUrl) {
      return res.status(400).json({ error: 'Avatar URL is required' });
    }

    const updateResult = await pool.query(
      `UPDATE users SET avatar_url = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, avatar_url`,
      [avatarUrl, userId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`[AUTH] Avatar updated for user: ${userId}`);
    res.json({
      success: true,
      avatarUrl: updateResult.rows[0].avatar_url,
      message: 'Avatar updated successfully'
    });
  } catch (error: unknown) {
    console.error('[AUTH] Avatar update error:', error);
    res.status(500).json({ error: 'Failed to update avatar: ' + errMsg(error) });
  }
});

// POST /api/auth/profile/image - Alias for avatar upload
router.post('/profile/image', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const sessionResult = await pool.query(
      `SELECT user_id FROM sessions WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }

    const userId = sessionResult.rows[0].user_id;
    const { avatarUrl, imageUrl, url } = req.body;
    const finalUrl = avatarUrl || imageUrl || url;

    if (!finalUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    const updateResult = await pool.query(
      `UPDATE users SET avatar_url = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, avatar_url`,
      [finalUrl, userId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`[AUTH] Profile image updated for user: ${userId}`);
    res.json({
      success: true,
      avatarUrl: updateResult.rows[0].avatar_url,
      message: 'Profile image updated successfully'
    });
  } catch (error: unknown) {
    console.error('[AUTH] Profile image update error:', error);
    res.status(500).json({ error: 'Failed to update profile image: ' + errMsg(error) });
  }
});

// ============================================================================
// GET PROFILE (standalone - used by tests for /api/profile)
// ============================================================================
router.get('/', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate session and get user from PostgreSQL
    const sessionResult = await pool.query(
      `SELECT s.*, u.*
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW() AND u.is_active = true`,
      [token]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }

    const user = sessionResult.rows[0];

    res.json({
      id: user.user_id,
      patientId: user.patient_id || user.user_id,
      name: user.name,
      nameThai: user.name_thai,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatar_url || `https://i.pravatar.cc/150?u=${user.user_id}`,
      dateOfBirth: user.date_of_birth,
      gender: user.gender,
      role: user.role,
    });
  } catch (error: unknown) {
    console.error('[AUTH] Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// ============================================================================
// TOKEN REFRESH - Phase 2 (Mobile App Support)
// ============================================================================
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken, deviceId } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }
    
    // Check DB
    if (!dbAvailable) {
      const connectionOk = await checkDbConnection();
      if (!connectionOk) {
        return res.status(503).json({ error: 'Database temporarily unavailable' });
      }
    }
    
    // Hash the token to compare
    const tokenHash = node_crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    // Find valid refresh token
    const tokenResult = await pool.query(
      `SELECT rt.*, u.id as user_id, u.email, u.name, u.name_thai, u.role, u.patient_id, u.is_active
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.token_hash = $1 AND rt.is_revoked = false AND rt.expires_at > NOW()`,
      [tokenHash]
    );
    
    if (tokenResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    
    const tokenRow = tokenResult.rows[0];
    
    if (!tokenRow.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }
    
    // Revoke old refresh token (token rotation)
    const newRefreshToken = generateSecureToken(64);
    const newRefreshHash = node_crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    const newTokenId = `rt_${Date.now()}_${node_crypto.randomBytes(8).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    
    await pool.query(
      `UPDATE refresh_tokens SET is_revoked = true, revoked_at = NOW(), replaced_by = $2 WHERE id = $1`,
      [tokenRow.id, newTokenId]
    );
    
    // Create new refresh token
    await pool.query(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, device_id, expires_at, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [newTokenId, tokenRow.user_id, newRefreshHash, deviceId || tokenRow.device_id, 
       expiresAt, req.ip || 'unknown', req.headers['user-agent'] || 'unknown']
    );
    
    // Create new session token (access token)
    const sessionToken = generateSessionToken();
    const sessionExpires = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours
    
    await pool.query(
      `INSERT INTO sessions (id, user_id, token, ip_address, user_agent, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [`session_${Date.now()}`, tokenRow.user_id, sessionToken, req.ip || 'unknown',
       req.headers['user-agent'] || 'unknown', sessionExpires]
    );
    
    console.log(`[AUTH] Token refreshed for user: ${tokenRow.email}`);
    
    res.json({
      success: true,
      token: sessionToken,
      refreshToken: newRefreshToken,
      expiresIn: 10800, // 3 hours in seconds
      user: {
        id: tokenRow.user_id,
        patientId: tokenRow.patient_id || tokenRow.user_id,
        name: tokenRow.name,
        nameThai: tokenRow.name_thai,
        email: tokenRow.email,
        role: tokenRow.role,
      }
    });
  } catch (error: unknown) {
    console.error('[AUTH] Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// ============================================================================
// DATABASE HEALTH CHECK
// ============================================================================
router.get('/health/db', async (_req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    dbAvailable = true;
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error_) {
    dbAvailable = false;
    console.warn('DB health check failed:', (error_ as Error).message);
    res.status(503).json({ status: 'degraded', database: 'disconnected' });
  }
});

// ============================================================================
// GOOGLE SSO — verify ID token, auto-provision patient, issue session token
// ============================================================================
import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '').replace(/\r?\n/g, '').trim();
const googleAuthClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

if (!GOOGLE_CLIENT_ID) {
  console.warn('[AUTH] GOOGLE_CLIENT_ID not set — Google SSO endpoint will return 503');
}

/** Dev-testing Cloud Run: allow Playwright fixture tokens without real Google round-trip */
function isGoogleFixtureAllowed(): boolean {
  if (!process.env.GOOGLE_TOKEN_VERIFIER_FIXTURE) return false;
  if (process.env.NODE_ENV !== 'production') return true;
  return process.env.IZARA_DEV_TESTING === '1' || process.env.IZARA_ALLOW_GOOGLE_SSO_FIXTURE === '1';
}

router.get('/public-config', (_req: Request, res: Response) => {
  res.json({
    googleClientId: GOOGLE_CLIENT_ID,
    googleSsoEnabled: !!GOOGLE_CLIENT_ID,
    devTestingFixture: isGoogleFixtureAllowed(),
  });
});

// Test seam: allow tests to inject a fake verifier without real Google calls.
// Set process.env.GOOGLE_TOKEN_VERIFIER_FIXTURE to a JSON string of the payload
// to return for any non-empty idToken (NEVER set in production).
async function verifyGoogleIdToken(idToken: string): Promise<{ sub: string; email: string; emailVerified: boolean; name?: string; picture?: string } | null> {
  const fixture = process.env.GOOGLE_TOKEN_VERIFIER_FIXTURE;
  if (fixture && isGoogleFixtureAllowed()) {
    // Two modes:
    //   1) GOOGLE_TOKEN_VERIFIER_FIXTURE='1' (or 'true') -> parse idToken itself as JSON payload
    //   2) GOOGLE_TOKEN_VERIFIER_FIXTURE='{...json...}' -> use env value as payload for every call
    const useTokenAsPayload = fixture === '1' || fixture.toLowerCase() === 'true';
    try {
      const p = useTokenAsPayload ? JSON.parse(idToken) : JSON.parse(fixture);
      if (!p?.sub || !p?.email) return null;
      return { sub: p.sub, email: p.email, emailVerified: p.email_verified !== false, name: p.name, picture: p.picture };
    } catch {
      return null;
    }
  }
  if (!googleAuthClient || !GOOGLE_CLIENT_ID) return null;
  try {
    const ticket = await googleAuthClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
    const p = ticket.getPayload();
    if (!p?.sub || !p?.email) return null;
    return { sub: p.sub, email: p.email, emailVerified: !!p.email_verified, name: p.name, picture: p.picture };
  } catch (err) {
    console.warn('[AUTH] Google token verification failed:', (err as Error).message);
    return null;
  }
}

router.post('/google-auth', authLimiter, async (req: Request, res: Response) => {
  try {
    const { idToken, portal } = req.body || {};
    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({ error: 'idToken is required' });
    }
    if (!GOOGLE_CLIENT_ID && !isGoogleFixtureAllowed()) {
      return res.status(503).json({ error: 'Google SSO not configured on server' });
    }

    const payload = await verifyGoogleIdToken(idToken);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid Google token' });
    }
    if (!payload.emailVerified) {
      return res.status(403).json({ error: 'Google email not verified' });
    }

    if (!dbAvailable) {
      const ok = await checkDbConnection();
      if (!ok) return res.status(503).json({ error: 'Database temporarily unavailable' });
    }

    const emailLower = payload.email.toLowerCase().trim();
    const isDoctorPortal = portal === 'doctor';

    // STRICT MODE: existing accounts only. Unknown email -> 404 NOT_REGISTERED.
    const userRow = (await pool.query(
      `SELECT id, patient_id, email, password_hash, google_sub, name, name_thai, phone, avatar_url, date_of_birth, gender, role,
              is_active, is_approved, approval_status
       FROM users WHERE LOWER(email) = LOWER($1)`,
      [emailLower]
    )).rows[0];

    if (!userRow) {
      return res.status(404).json({
        error: 'not_registered',
        code: 'NOT_REGISTERED',
        message: 'No account found for this Google email. Please register first.',
        email: emailLower,
      });
    }

    // Require a real password (reject Google-only stub accounts)
    if (!userRow.password_hash || userRow.password_hash === '!google-sso!') {
      return res.status(403).json({
        error: 'password_not_set',
        code: 'PASSWORD_NOT_SET',
        message: 'Please complete registration with a username and password before using Google sign-in.',
        email: emailLower,
      });
    }

    if (userRow.google_sub && userRow.google_sub !== payload.sub) {
      return res.status(409).json({
        error: 'google_account_mismatch',
        code: 'GOOGLE_ACCOUNT_MISMATCH',
        message: 'บัญชี Google นี้ไม่ตรงกับบัญชีที่เคยเชื่อมไว้ กรุณาใช้บัญชี Google เดิมหรือเข้าสู่ระบบด้วยรหัสผ่าน',
        email: emailLower,
      });
    }

    // Existing user — link google_sub if missing (best-effort)
    try {
      await pool.query(
        'UPDATE users SET google_sub = COALESCE(google_sub, $1) WHERE id = $2',
        [payload.sub, userRow.id]
      );
    } catch (linkErr) {
      console.warn('[AUTH/google] google_sub link skipped:', (linkErr as Error).message);
    }

    // Guards
    if (!userRow.is_active) {
      return res.status(403).json({ error: 'account_deactivated', code: 'ACCOUNT_DEACTIVATED', message: 'Account is deactivated' });
    }
    if (userRow.role === 'doctor' && (userRow.approval_status === 'pending' || userRow.is_approved === false)) {
      return res.status(403).json({ error: 'pending_approval', code: 'PENDING_APPROVAL', message: 'Doctor account is awaiting admin approval', userId: userRow.id });
    }
    if (userRow.role === 'doctor' && userRow.approval_status === 'rejected') {
      return res.status(403).json({ error: 'account_rejected', code: 'ACCOUNT_REJECTED', message: 'Account application was rejected' });
    }
    if (isDoctorPortal && userRow.role !== 'doctor' && userRow.role !== 'admin') {
      return res.status(403).json({ error: 'role_mismatch', code: 'ROLE_MISMATCH', message: 'This Google account is not registered as a doctor' });
    }

    // Issue session (same shape as /login)
    const sessionToken = generateSessionToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await pool.query(
      `UPDATE sessions SET expires_at = NOW(), logged_out_at = NOW()
       WHERE user_id = $1 AND expires_at > NOW() AND logged_out_at IS NULL`,
      [userRow.id]
    );
    await pool.query(
      `INSERT INTO sessions (id, user_id, token, ip_address, user_agent, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [`session_${Date.now()}`, userRow.id, sessionToken, req.ip || 'unknown',
       req.headers['user-agent'] || 'unknown', expiresAt, now]
    );
    await pool.query('UPDATE users SET last_login = $1 WHERE id = $2', [now, userRow.id]);

    console.log(`[AUTH/google] Login successful for ${emailLower} (role=${userRow.role})`);

    return res.json({
      success: true,
      user: {
        id: userRow.id,
        patientId: userRow.patient_id || userRow.id,
        name: userRow.name,
        nameThai: userRow.name_thai,
        email: userRow.email,
        phone: userRow.phone,
        avatarUrl: userRow.avatar_url || payload.picture || `https://i.pravatar.cc/150?u=${userRow.id}`,
        dateOfBirth: userRow.date_of_birth,
        gender: userRow.gender,
        role: userRow.role,
        updatedAt: now.toISOString(),
      },
      token: sessionToken,
    });
  } catch (error: unknown) {
    console.error('[AUTH/google] error:', error);
    res.status(500).json({ error: 'Google sign-in failed' });
  }
});

export default router;
