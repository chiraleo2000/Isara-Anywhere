import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import node_crypto from 'node:crypto';
import postgresDataService from '../services/postgresDataService';

const { pool } = postgresDataService;
const router = Router();

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
(async () => {
  try {
    const available = await checkDbConnection();
    console.log(available 
      ? '✅ PostgreSQL connected - Production mode active' 
      : '❌ PostgreSQL unavailable - Authentication will fail until DB is available');
  } catch {}
})().catch(() => {});

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

// Helper: Verify password (supports bcrypt and legacy base64)
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (hash.startsWith('$2')) {
    // bcrypt hash
    return bcrypt.compare(password, hash);
  }
  // Legacy base64 fallback
  const base64Hash = Buffer.from(password).toString('base64');
  return hash === base64Hash;
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
  if ((password as string).length < 6) {
    return { success: false, error: 'Password too short', message: 'Password must be at least 6 characters' };
  }
  return null;
}

// ============================================================================
// REGISTER NEW USER
// ============================================================================
router.post('/register', async (req: Request, res: Response) => {
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

    // Check if email already exists
    try {
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
        [emailLower]
      );

      if (existingUser.rows.length > 0) {
        // Return success with existing user info for testing
        return res.json({ 
          success: true,
          message: 'User already exists',
          userId: existingUser.rows[0].id,
          alreadyExists: true
        });
      }
    } catch (dbError) {
      console.error('DB check error:', dbError);
      // Continue with registration attempt
    }

    // Generate IDs and hash password
    // IMPORTANT: Use same ID for userId and patientId to satisfy FK constraints
    // PHR table references users(id), so patient_id in PHR must match users.id
    const uniqueId = `PATIENT-${Date.now()}-${node_crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const userId = uniqueId;
    const patientId = uniqueId; // Same as userId for FK constraint compatibility
    const passwordHash = await hashPassword(password);
    const now = new Date();

    // Parse list inputs
    const parseList = (str: string | undefined): string[] => {
      if (!str) return [];
      return str.split(/[,;]/).map(s => s.trim()).filter(Boolean);
    };

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

    // Create session
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await pool.query(
      `INSERT INTO sessions (id, user_id, token, ip_address, user_agent, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        `session_${Date.now()}`,
        userId,
        sessionToken,
        req.ip || 'unknown',
        req.headers['user-agent'] || 'unknown',
        expiresAt,
        now
      ]
    );

    console.log(`[AUTH] User registered successfully: ${emailLower}, patientId: ${patientId}`);

    res.json({
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
      token: sessionToken,
    });
  } catch (error: any) {
    console.error('[AUTH] Registration error:', error);
    
    // Handle duplicate user errors gracefully
    if (error.message?.includes('duplicate') || error.code === '23505') {
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
      message: error.message
    });
  }
});

// ============================================================================
// LOGIN - PRODUCTION MODE (PostgreSQL Only)
// ============================================================================
router.post('/login', async (req: Request, res: Response) => {
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

    // Create session
    const sessionToken = generateSessionToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

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
  } catch (error: any) {
    console.error('[AUTH] Login error:', error);
    res.status(500).json({ error: 'Login failed: ' + error.message });
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
  } catch (error: any) {
    console.error('[AUTH] Validation error:', error);
    res.status(500).json({ valid: false, error: 'Validation failed' });
  }
});

// ============================================================================
// LOGOUT
// ============================================================================
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Delete session from PostgreSQL
    await pool.query('DELETE FROM sessions WHERE token = $1', [token]);

    console.log('[AUTH] Logout successful');
    res.json({ success: true });
  } catch (error: any) {
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
  } catch (error: any) {
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
  } catch (error: any) {
    console.error('[AUTH] Profile update error:', error);
    res.status(500).json({ error: 'Profile update failed: ' + error.message });
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

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
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
  } catch (error: any) {
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

    console.log(`\n📧 PASSWORD RESET REQUEST`);
    console.log(`   Email: ${emailLower}`);
    console.log(`   User: ${user.name}`);
    console.log(`   Token: ${resetToken}`);
    console.log(`   Reset Link: ${resetLink}`);
    console.log(`   Expires: ${expiresAt.toISOString()}\n`);

    // In production, send email here
    // For development, return token
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    res.json({ 
      success: true, 
      message: 'Password reset link sent to your email. Please check your inbox.',
      devToken: isDevelopment ? resetToken : undefined
    });
  } catch (error: any) {
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
  } catch (error: any) {
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

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
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
  } catch (error: any) {
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
  } catch (error: any) {
    console.error('[AUTH DEBUG] Error:', error);
    res.status(500).json({ error: error.message });
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
  } catch (error: any) {
    console.error('[AUTH] Avatar update error:', error);
    res.status(500).json({ error: 'Failed to update avatar: ' + error.message });
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
  } catch (error: any) {
    console.error('[AUTH] Profile image update error:', error);
    res.status(500).json({ error: 'Failed to update profile image: ' + error.message });
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
  } catch (error: any) {
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
    const sessionExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes for mobile
    
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
      expiresIn: 900, // 15 minutes in seconds
      user: {
        id: tokenRow.user_id,
        patientId: tokenRow.patient_id || tokenRow.user_id,
        name: tokenRow.name,
        nameThai: tokenRow.name_thai,
        email: tokenRow.email,
        role: tokenRow.role,
      }
    });
  } catch (error: any) {
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
  } catch (error) {
    dbAvailable = false;
    res.status(503).json({ status: 'degraded', database: 'disconnected' });
  }
});

export default router;
