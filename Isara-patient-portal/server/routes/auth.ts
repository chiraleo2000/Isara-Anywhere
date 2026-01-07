import { Router, Request, Response } from 'express';
import { storage, GCS_BUCKETS } from '../index';
import bcrypt from 'bcryptjs';

const router = Router();

// Helper function to read JSON from GCS
async function readJSON(bucket: string, filePath: string): Promise<any> {
  try {
    const file = storage.bucket(bucket).file(filePath);
    const [contents] = await file.download();
    return JSON.parse(contents.toString());
  } catch (error: any) {
    if (error.code === 404) {
      throw new Error(`File not found: ${filePath}`);
    }
    throw error;
  }
}

// Helper function to write JSON to GCS
async function writeJSON(bucket: string, filePath: string, data: any): Promise<void> {
  const file = storage.bucket(bucket).file(filePath);
  await file.save(JSON.stringify(data, null, 2), {
    contentType: 'application/json',
  });
}

// Ensure a demo account exists for smoke testing
async function ensureDemoUser(email: string, plainPassword: string) {
  const passwordHash = Buffer.from(plainPassword).toString('base64');
  const userId = 'demo-user-001';
  const patientId = 'demo-patient-001';
  const now = new Date();

  const storedUser = {
    id: userId,
    patientId,
    email,
    passwordHash,
    profile: {
      id: userId,
      patientId,
      name: 'Demo User',
      email,
      phone: '+66-81-111-1111',
      avatarUrl: 'https://i.pravatar.cc/150?u=demo.user',
      dateOfBirth: '1990-01-01',
      gender: 'female',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  // Persist user and patient profile if not already there
  await writeJSON(GCS_BUCKETS.AUTH, `users/${userId}.json`, storedUser);

  const patientProfile = {
    patientId,
    userId,
    personalInfo: {
      name: 'Demo User',
      dateOfBirth: '1990-01-01',
      gender: 'female',
      phone: '+66-81-111-1111',
      email,
      nationalId: '1234567890123',
      address: 'Bangkok, Thailand',
    },
    physicalInfo: {
      height: 165,
      weight: 60,
      bloodType: 'O',
      bmi: 22.0,
    },
    medicalInfo: {
      allergies: ['Penicillin'],
      chronicConditions: ['Hypertension'],
      currentMedications: ['Amlodipine 5mg OD'],
      bloodPressure: '125/78',
      heartRate: 72,
      bloodSugar: '95',
    },
    emergencyContact: {
      name: 'Prasert Demo',
      phone: '+66-81-222-2222',
      relation: 'Spouse',
    },
    vitalHistory: [],
    labResults: [],
    immunizations: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  await writeJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/profile.json`, patientProfile);
  await writeJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/phr.json`, patientProfile);

  // Ensure aggregated patients.json contains demo patient for cross-portal views
  try {
    let patientsIndex: any[] = [];
    try {
      patientsIndex = await readJSON(GCS_BUCKETS.PATIENT, 'patients.json');
    } catch {
      patientsIndex = [];
    }

    const exists = patientsIndex.find((p: any) => p.id === patientId);
    if (!exists) {
      patientsIndex.push({
        id: patientId,
        name: 'Demo User',
        email,
        phone: '+66-81-111-1111',
        gender: 'female',
        age: 34,
        consentStatus: { hasConsent: true },
      });
      await writeJSON(GCS_BUCKETS.PATIENT, 'patients.json', patientsIndex);
    }
  } catch (err) {
    console.error('Failed to update patients.json for demo user', err);
  }

  return storedUser;
}

// Helper function to list files
async function listFiles(bucket: string, prefix?: string): Promise<any[]> {
  const [files] = await storage.bucket(bucket).getFiles({ prefix });
  return files.map(file => ({
    name: file.name,
    metadata: file.metadata,
  }));
}

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { 
      name, email, password, confirmPassword, phone, dateOfBirth, gender,
      // Health Info
      height, weight, bloodType, allergies, chronicConditions, currentMedications,
      // Emergency Contact
      emergencyContactName, emergencyContactPhone, emergencyContactRelation
    } = req.body;

    // Validation
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if email already exists
    const existingFiles = await listFiles(GCS_BUCKETS.AUTH, 'users/');
    for (const file of existingFiles) {
      try {
        const userData = await readJSON(GCS_BUCKETS.AUTH, file.name);
        if (userData.email === email) {
          return res.status(400).json({ error: 'Email already exists' });
        }
      } catch (e) {
        continue;
      }
    }

    // Generate user ID and patient ID
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const patientId = `patient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    // Parse allergies and conditions into arrays
    const parseList = (str: string | undefined): string[] => {
      if (!str) return [];
      return str.split(/[,;]/).map(s => s.trim()).filter(s => s);
    };

    const user = {
      id: userId,
      patientId,
      name,
      email,
      avatarUrl: `https://i.pravatar.cc/150?u=${userId}`,
      dateOfBirth,
      phone,
      gender,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const storedUser = {
      id: userId,
      patientId,
      email,
      passwordHash: Buffer.from(password).toString('base64'), // In production, use bcrypt
      profile: user,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    // Write user to GCS: users/{userId}.json
    await writeJSON(GCS_BUCKETS.AUTH, `users/${userId}.json`, storedUser);

    // Create initial PHR data with health information
    const patientData = {
      patientId,
      userId,
      personalInfo: {
        name,
        dateOfBirth,
        gender,
        phone,
        email,
        nationalId: '',
        address: '',
      },
      physicalInfo: {
        height: height ? parseFloat(height) : null,
        weight: weight ? parseFloat(weight) : null,
        bloodType: bloodType || null,
        bmi: height && weight ? (parseFloat(weight) / Math.pow(parseFloat(height) / 100, 2)).toFixed(1) : null,
      },
      medicalInfo: {
        allergies: parseList(allergies),
        chronicConditions: parseList(chronicConditions),
        currentMedications: parseList(currentMedications),
        bloodPressure: null,
        heartRate: null,
        bloodSugar: null,
      },
      emergencyContact: {
        name: emergencyContactName || '',
        phone: emergencyContactPhone || '',
        relation: emergencyContactRelation || '',
      },
      vitalHistory: [],
      labResults: [],
      immunizations: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    // Write patient data to patients bucket (both profile.json and phr.json for compatibility)
    await writeJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/profile.json`, patientData);
    await writeJSON(GCS_BUCKETS.PATIENT, `patients/${patientId}/phr.json`, patientData);

    // Create session
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes

    const session = {
      id: sessionId,
      userId,
      patientId,
      token: `token_${sessionId}_${Date.now()}`,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    // Write session to GCS: sessions/{sessionId}.json
    await writeJSON(GCS_BUCKETS.AUTH, `sessions/${sessionId}.json`, session);

    // Log registration
    try {
      let history: any[] = [];
      try {
        history = await readJSON(GCS_BUCKETS.AUTH, 'audit/login-history.json');
      } catch {
        // File doesn't exist yet
      }

      history.push({
        userId,
        patientId,
        timestamp: now.toISOString(),
        success: true,
        method: 'password',
        action: 'register',
      });

      // Keep only last 1000 entries
      if (history.length > 1000) {
        history = history.slice(-1000);
      }

      await writeJSON(GCS_BUCKETS.AUTH, 'audit/login-history.json', history);
    } catch (error) {
      console.error('Failed to log registration:', error);
    }

    res.json({
      user: { ...user, patientId },
      token: session.token,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Login with email/password
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const emailLower = email?.toLowerCase().trim();
    console.log(`[AUTH] Login attempt for email: ${emailLower}`);

    if (!emailLower || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email (case-insensitive)
    const existingFiles = await listFiles(GCS_BUCKETS.AUTH, 'users/');
    console.log(`[AUTH] Found ${existingFiles.length} user files to check`);
    let storedUser: any = null;

    for (const file of existingFiles) {
      try {
        const userData = await readJSON(GCS_BUCKETS.AUTH, file.name);
        if (userData.email?.toLowerCase() === emailLower) {
          storedUser = userData;
          console.log(`[AUTH] Found user: ${file.name}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!storedUser) {
      if (emailLower === 'demo.test@gmail.com') {
        console.log('[AUTH] Seeding demo user...');
        storedUser = await ensureDemoUser(emailLower, 'P@ssw0rd');
      } else {
        console.log(`[AUTH] User not found for email: ${emailLower}`);
        return res.status(401).json({ error: 'Invalid email or password' });
      }
    }

    // Verify password - support both bcrypt and legacy base64
    let passwordValid = false;
    
    // Try bcrypt first (new format starts with $2b$)
    if (storedUser.passwordHash && storedUser.passwordHash.startsWith('$2')) {
      passwordValid = bcrypt.compareSync(password, storedUser.passwordHash);
      console.log(`[AUTH] Using bcrypt verification: ${passwordValid}`);
    } else {
      // Fallback to legacy base64
      const passwordHash = Buffer.from(password).toString('base64');
      passwordValid = storedUser.passwordHash === passwordHash;
      console.log(`[AUTH] Using base64 verification: ${passwordValid}`);
    }
    
    if (!passwordValid) {
      console.log(`[AUTH] Password mismatch for user: ${emailLower}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log(`[AUTH] Password verified for user: ${emailLower}`);

    // Create session
    const now = new Date();
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes

    const session = {
      id: sessionId,
      userId: storedUser.id,
      token: `token_${sessionId}_${Date.now()}`,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    // Write session to GCS
    await writeJSON(GCS_BUCKETS.AUTH, `sessions/${sessionId}.json`, session);
    console.log(`[AUTH] Session created: ${sessionId}`);

    // Log login
    try {
      let history: any[] = [];
      try {
        history = await readJSON(GCS_BUCKETS.AUTH, 'audit/login-history.json');
      } catch {
        // File doesn't exist yet
      }

      history.push({
        userId: storedUser.id,
        timestamp: now.toISOString(),
        success: true,
        method: 'password',
      });

      if (history.length > 1000) {
        history = history.slice(-1000);
      }

      await writeJSON(GCS_BUCKETS.AUTH, 'audit/login-history.json', history);
    } catch (error) {
      console.error('Failed to log login:', error);
    }

    const user = {
      ...storedUser.profile,
      patientId: storedUser.patientId,
      updatedAt: now.toISOString(),
    };

    console.log(`[AUTH] Login successful for: ${emailLower}, patientId: ${storedUser.patientId}`);

    res.json({
      user,
      token: session.token,
    });
  } catch (error: any) {
    console.error('[AUTH] Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Validate session
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Extract session ID from token
    const sessionId = token.replace('token_', '').split('_')[0];

    try {
      const session = await readJSON(GCS_BUCKETS.AUTH, `sessions/session_${sessionId}.json`);

      if (new Date(session.expiresAt) < new Date()) {
        return res.json({ valid: false, error: 'Session expired' });
      }

      res.json({ valid: true, userId: session.userId });
    } catch (error) {
      res.json({ valid: false, error: 'Invalid session' });
    }
  } catch (error: any) {
    console.error('Validation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Logout
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Extract session ID from token
    const sessionId = token.replace('token_', '').split('_')[0];

    try {
      // Delete session from GCS
      await storage.bucket(GCS_BUCKETS.AUTH).file(`sessions/session_${sessionId}.json`).delete();
    } catch (error) {
      console.error('Failed to delete session:', error);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current user profile
router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate session
    const sessionId = token.replace('token_', '').split('_')[0];
    const session = await readJSON(GCS_BUCKETS.AUTH, `sessions/session_${sessionId}.json`);

    if (new Date(session.expiresAt) < new Date()) {
      return res.status(401).json({ error: 'Session expired' });
    }

    // Get user data
    const storedUser = await readJSON(GCS_BUCKETS.AUTH, `users/${session.userId}.json`);

    res.json({ user: storedUser.profile });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// ============================================================================
// PASSWORD RESET FUNCTIONALITY
// ============================================================================

// Generate secure random token
function generateResetToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Request password reset - send email with reset link
router.post('/request-password-reset', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Input validation
    if (!email) {
      return res.status(400).json({ error: 'Email is required', code: 'MISSING_EMAIL' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format', code: 'INVALID_EMAIL' });
    }

    console.log(`[PASSWORD_RESET] Request received for: ${email}`);

    // Find user by email
    const existingFiles = await listFiles(GCS_BUCKETS.AUTH, 'users/');
    let foundUser: any = null;

    for (const file of existingFiles) {
      try {
        const userData = await readJSON(GCS_BUCKETS.AUTH, file.name);
        if (userData.email && userData.email.toLowerCase() === email.toLowerCase()) {
          foundUser = userData;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    // Always return same response to prevent user enumeration
    if (!foundUser) {
      console.log(`[PASSWORD_RESET] User not found: ${email}`);
      return res.json({ 
        success: true, 
        message: 'If the email exists, a reset link will be sent.' 
      });
    }

    // Generate reset token with 1 hour expiry
    const resetToken = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    // Store reset token
    const resetData = {
      userId: foundUser.id,
      email: email.toLowerCase().trim(),
      token: resetToken,
      createdAt: new Date().toISOString(),
      expiresAt,
      used: false
    };

    await writeJSON(GCS_BUCKETS.AUTH, `password-resets/${resetToken}.json`, resetData);

    // Generate reset link
    const baseUrl = process.env.APP_URL || 'http://localhost:3005';
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

    // Log for development
    console.log(`\n📧 PASSWORD RESET REQUEST`);
    console.log(`   Email: ${email}`);
    console.log(`   User: ${foundUser.profile?.name || foundUser.name || 'Unknown'}`);
    console.log(`   Token: ${resetToken}`);
    console.log(`   Reset Link: ${resetLink}`);
    console.log(`   Expires: ${expiresAt}\n`);

    // Send email notification (would use email service in production)
    // For now, we log the reset link
    
    res.json({ 
      success: true, 
      message: 'Password reset link sent to your email. Please check your inbox.',
      // Include for development/testing only - remove in production
      devToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined
    });
  } catch (error: any) {
    console.error('[PASSWORD_RESET] Error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// Verify reset token is valid
router.get('/verify-reset-token/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ valid: false, error: 'Token is required' });
    }

    // Fetch reset token data
    let resetData: any;
    try {
      resetData = await readJSON(GCS_BUCKETS.AUTH, `password-resets/${token}.json`);
    } catch (e) {
      return res.json({ valid: false, error: 'Invalid or expired reset token' });
    }

    if (resetData.used) {
      return res.json({ valid: false, error: 'Reset token has already been used' });
    }

    if (new Date(resetData.expiresAt) < new Date()) {
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

// Reset password with token
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
    let resetData: any;
    try {
      resetData = await readJSON(GCS_BUCKETS.AUTH, `password-resets/${token}.json`);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    if (resetData.used) {
      return res.status(400).json({ error: 'Reset token has already been used' });
    }

    if (new Date(resetData.expiresAt) < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    // Fetch user
    let storedUser: any;
    try {
      storedUser = await readJSON(GCS_BUCKETS.AUTH, `users/${resetData.userId}.json`);
    } catch (e) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Update password with bcrypt hash
    const salt = bcrypt.genSaltSync(12);
    storedUser.passwordHash = bcrypt.hashSync(newPassword, salt);
    storedUser.updatedAt = new Date().toISOString();

    await writeJSON(GCS_BUCKETS.AUTH, `users/${resetData.userId}.json`, storedUser);

    // Mark token as used
    resetData.used = true;
    resetData.usedAt = new Date().toISOString();
    await writeJSON(GCS_BUCKETS.AUTH, `password-resets/${token}.json`, resetData);

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

// Debug endpoint - check user status (for troubleshooting login issues)
router.get('/check-user/:email', async (req: Request, res: Response) => {
  try {
    const emailLower = req.params.email?.toLowerCase().trim();
    console.log(`[AUTH DEBUG] Checking user: ${emailLower}`);
    
    const existingFiles = await listFiles(GCS_BUCKETS.AUTH, 'users/');
    let storedUser: any = null;

    for (const file of existingFiles) {
      try {
        const userData = await readJSON(GCS_BUCKETS.AUTH, file.name);
        if (userData.email?.toLowerCase() === emailLower) {
          storedUser = userData;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!storedUser) {
      return res.json({ 
        found: false, 
        email: emailLower, 
        message: 'User not found',
        totalUsersFound: existingFiles.length
      });
    }

    res.json({
      found: true,
      email: emailLower,
      id: storedUser.id,
      patientId: storedUser.patientId,
      role: storedUser.role,
      hasPassword: !!storedUser.passwordHash,
      passwordFormat: storedUser.passwordHash?.startsWith('$2') ? 'bcrypt' : 'base64',
      hasProfile: !!storedUser.profile
    });
  } catch (error: any) {
    console.error('[AUTH DEBUG] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
