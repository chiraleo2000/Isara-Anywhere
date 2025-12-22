/**
 * Authentication Server for Izara Platform
 * Port: 3011
 *
 * Handles:
 * - User Login/Register
 * - Session Management
 * - OAuth Token Management
 * - GCS Storage Operations (proxied from GCS API Server)
 * - WebSocket for real-time updates
 * 
 * OWASP Top 10:2025 Compliant
 */

// Force unbuffered output for Cloud Run logging
process.stdout.write('[AUTH-SERVER] Starting module load...\n');

process.stdout.write('[AUTH-SERVER] Loading express...\n');
const express = require('express');
process.stdout.write('[AUTH-SERVER] Loading cors...\n');
const cors = require('cors');
process.stdout.write('[AUTH-SERVER] Loading bcryptjs...\n');
const bcrypt = require('bcryptjs');
process.stdout.write('[AUTH-SERVER] Loading crypto...\n');
const crypto = require('crypto');
process.stdout.write('[AUTH-SERVER] Loading http...\n');
const http = require('http');
process.stdout.write('[AUTH-SERVER] Loading socket.io...\n');
const { Server } = require('socket.io');
const path = require('path');

process.stdout.write('[AUTH-SERVER] Loading email service...\n');
const { emailService } = require('./emailService.cjs');
process.stdout.write('[AUTH-SERVER] Email service loaded\n');

// OWASP Security Middleware
process.stdout.write('[AUTH-SERVER] Loading OWASP middleware...\n');
const {
  securityHeaders,
  rateLimit,
  sanitizeRequestBody,
  validatePassword,
  securityAuditLog,
  requestLogger,
  secureErrorHandler,
  isAccountLocked,
  trackLoginAttempt,
  isValidEmail,
  getClientIP,
  checkPermission,
  asyncHandler,
  maskSensitiveData,
  resetRateLimits
} = require('./security/owasp-middleware.cjs');
process.stdout.write('[AUTH-SERVER] OWASP middleware loaded\n');

const app = express();
const server = http.createServer(app);
const PORT = process.env.AUTH_PORT || 3011;
process.stdout.write(`[AUTH-SERVER] App created, port=${PORT}\n`);

// ============================================================================
// CONFIGURATION
// ============================================================================

const GCS_API_URL = process.env.GCS_API_URL || 'http://localhost:3012';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin.test@izara.com';

const BUCKETS = {
  credentials: 'izara-users-credentials',
  doctor: 'izara-doctors-data',
  patient: 'izara-patients-data',
  appointments: 'izara-appointments',
  metadata: 'izara-meta-data'
};

// Allowed CORS origins (A02 - Security Misconfiguration)
const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
  ? [
      'https://doctor.izara.com',
      'https://izara.com',
      'https://izara-doctor-portal-724889190329.asia-southeast1.run.app',
      'https://izara-patient-portal-724889190329.asia-southeast1.run.app',
      /\.run\.app$/
    ]
  : ['http://localhost:3010', 'http://localhost:3011', 'http://127.0.0.1:3010', 'http://0.0.0.0:3010'];

// ============================================================================
// MIDDLEWARE - OWASP SECURITY
// ============================================================================

// A02 - Security Headers
app.use(securityHeaders());

// A09 - Request Logging with security context
app.use(requestLogger());

// A02 - CORS with strict origin checking
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.) in development
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    // Allow same-origin requests in production (no origin header)
    if (!origin) {
      return callback(null, true);
    }
    // Check string matches
    if (ALLOWED_ORIGINS.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    })) {
      return callback(null, true);
    }
    securityAuditLog({
      event: 'CORS_VIOLATION',
      severity: 'WARN',
      origin,
      allowedOrigins: ALLOWED_ORIGINS.filter(o => typeof o === 'string')
    });
    callback(new Error('CORS policy violation'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-CSRF-Token']
}));

// A07 - Rate limiting for all requests
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 500, // General limit
  keyGenerator: (req) => getClientIP(req)
}));

// Body parsing with size limits (A06 - Insecure Design)
app.use(express.json({ limit: '10mb' })); // Reduced from 50mb
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging with timestamp
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// WEBSOCKET SETUP
// ============================================================================

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3010', 'http://localhost:3011', 'http://127.0.0.1:3010'],
    credentials: true
  },
  path: '/ws'
});

io.on('connection', (socket) => {
  console.log(`🔌 WebSocket client connected: ${socket.id}`);

  socket.on('authenticate', async (token) => {
    // Verify token and join user room
    const session = await fetchFromGCS(BUCKETS.credentials, `sessions/${token}.json`);
    if (session && session.userId) {
      socket.join(`user-${session.userId}`);
      console.log(`User ${session.userId} authenticated on socket ${socket.id}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔌 WebSocket client disconnected: ${socket.id}`);
  });
});

app.set('io', io);

// ============================================================================
// HELPER FUNCTIONS - GCS OPERATIONS
// ============================================================================

async function fetchFromGCS(bucket, path) {
  try {
    const url = `${GCS_API_URL}/api/storage/read?bucket=${bucket}&path=${encodeURIComponent(path)}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`GCS read failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ Error fetching ${bucket}/${path}:`, error.message);
    return null;
  }
}

async function writeToGCS(bucket, path, data) {
  try {
    const url = `${GCS_API_URL}/api/storage/write`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket, path, data })
    });

    if (!response.ok) {
      throw new Error(`GCS write failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ Error writing ${bucket}/${path}:`, error.message);
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS - AUTH
// ============================================================================

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

function sanitizeUser(user) {
  const { passwordHash, loginAttempts, lockedUntil, ...sanitized } = user;
  return sanitized;
}

// ============================================================================
// VERIFY GCS CONNECTION
// ============================================================================

async function verifyGCSConnection(maxRetries = 10, retryDelay = 3000) {
  console.log('\n🔍 Verifying GCS connection...');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const healthUrl = `${GCS_API_URL}/api/health`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(healthUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('GCS API Server not responding');
      }

      const health = await response.json();
      console.log('✅ GCS API Server is healthy');
      console.log('   Service Account:', health.serviceAccount ? 'Found' : 'Using default credentials');

      return true;
    } catch (error) {
      console.log(`⏳ GCS connection attempt ${attempt}/${maxRetries} failed: ${error.message}`);
      if (attempt < maxRetries) {
        console.log(`   Retrying in ${retryDelay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  console.error('\n❌ GCS connection failed after all retries');
  console.error('   Make sure the GCS API Server is running internally\n');
  return false;
}

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Izara Auth Server',
    port: PORT
  });
});

// Register
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name, medicalLicenseNumber, specialty, dateOfBirth, phone, status } = req.body;

    // Validation
    if (!email || !password || !name || !medicalLicenseNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user already exists
    const usersIndex = await fetchFromGCS(BUCKETS.credentials, 'users/index.json') || [];
    const existingUser = usersIndex.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Create user ID
    const userId = `DOC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Determine if pending approval
    const isPending = status === 'pending_approval';

    // Create user credential
    const userCredential = {
      id: userId,
      email: email.toLowerCase().trim(),
      passwordHash: hashPassword(password),
      role: 'doctor',
      doctorId: userId,
      medicalLicenseNumber,
      isActive: !isPending, // Not active if pending
      isApproved: !isPending, // Needs approval
      approvalStatus: isPending ? 'pending' : 'approved',
      emailVerified: false,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      loginAttempts: 0,
      lockedUntil: null,
      preferences: {
        theme: 'light',
        language: 'en',
        notifications: {
          email: true,
          push: true,
          sms: false
        }
      },
      name,
      phone,
      dateOfBirth,
      specialty
    };

    // Save user credential
    await writeToGCS(BUCKETS.credentials, `users/${userId}.json`, userCredential);

    // Update users index
    usersIndex.push({
      id: userId,
      email: email.toLowerCase().trim(),
      role: 'doctor',
      isActive: !isPending,
      approvalStatus: isPending ? 'pending' : 'approved'
    });
    await writeToGCS(BUCKETS.credentials, 'users/index.json', usersIndex);

    // Create doctor profile
    const doctors = await fetchFromGCS(BUCKETS.doctor, 'doctors.json') || [];
    doctors.push({
      id: userId,
      name,
      specialty: specialty || 'General Practice',
      email,
      medicalLicenseNumber,
      avatarUrl: '',
      rating: 0,
      experience: '0 years',
      qualifications: [],
      availableSlots: [],
      isApproved: !isPending
    });
    await writeToGCS(BUCKETS.doctor, 'doctors.json', doctors);

    // Add to pending approvals if needed
    if (isPending) {
      const pendingApprovals = await fetchFromGCS(BUCKETS.credentials, 'pending-approvals.json') || [];
      pendingApprovals.push({
        userId,
        email: email.toLowerCase().trim(),
        name,
        medicalLicenseNumber,
        specialty: specialty || 'General Practice',
        requestedAt: new Date().toISOString(),
        status: 'pending'
      });
      await writeToGCS(BUCKETS.credentials, 'pending-approvals.json', pendingApprovals);

      // Send email notification to admin
      try {
        await emailService.sendAdminNotification(ADMIN_EMAIL, {
          name,
          email: email.toLowerCase().trim(),
          specialty: specialty || 'General Practice',
          createdAt: new Date().toISOString()
        });
        console.log(`📧 Admin notification email sent for new registration: ${email}`);
      } catch (emailError) {
        console.error('Failed to send admin notification email:', emailError);
      }
    }

    // A09 - Audit log successful registration
    securityAuditLog({
      event: 'USER_REGISTERED',
      severity: 'INFO',
      userId,
      email: email.toLowerCase().trim(),
      role: 'doctor',
      isPending,
      ip: getClientIP(req)
    });

    res.json({
      success: true,
      user: sanitizeUser(userCredential),
      message: isPending ? 'Registration submitted. Pending admin approval.' : 'Registration successful.'
    });
  } catch (error) {
    console.error('Registration error:', error);
    // A10 - Safe error response
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Login - A07 Authentication with security controls
app.post('/auth/login', 
  // A07 - Strict rate limiting for login endpoint
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // Max 10 login attempts per 15 minutes per IP
    keyGenerator: (req) => getClientIP(req),
    handler: (req, res) => {
      securityAuditLog({
        event: 'LOGIN_RATE_LIMIT_EXCEEDED',
        severity: 'HIGH',
        ip: getClientIP(req),
        email: req.body?.email
      });
      res.status(429).json({
        error: 'Too many login attempts. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 900
      });
    }
  }),
  async (req, res) => {
  try {
    const { email, password } = req.body;

    // A05 - Input validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password', code: 'MISSING_CREDENTIALS' });
    }

    // A05 - Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format', code: 'INVALID_EMAIL' });
    }

    // A07 - Check if account is locked (in-memory check first for performance)
    const lockStatus = isAccountLocked(email);
    if (lockStatus.locked) {
      securityAuditLog({
        event: 'LOGIN_ATTEMPT_LOCKED_ACCOUNT',
        severity: 'WARN',
        email,
        ip: getClientIP(req),
        remainingTime: lockStatus.remainingTime
      });
      return res.status(423).json({
        error: 'Account is temporarily locked due to multiple failed attempts',
        code: 'ACCOUNT_LOCKED',
        remainingTime: lockStatus.remainingTime
      });
    }

    // Find user by email
    const usersIndex = await fetchFromGCS(BUCKETS.credentials, 'users/index.json') || [];
    const userRef = usersIndex.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!userRef) {
      // A07 - Track failed attempt even for non-existent users (prevent enumeration)
      trackLoginAttempt(email, false);
      securityAuditLog({
        event: 'LOGIN_FAILED_USER_NOT_FOUND',
        severity: 'WARN',
        email,
        ip: getClientIP(req)
      });
      // A07 - Generic error message to prevent user enumeration
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    // Fetch full user credential
    const userCredential = await fetchFromGCS(BUCKETS.credentials, `users/${userRef.id}.json`);

    if (!userCredential) {
      trackLoginAttempt(email, false);
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    // Check if account is rejected
    if (userCredential.approvalStatus === 'rejected') {
      securityAuditLog({
        event: 'LOGIN_ATTEMPT_REJECTED_ACCOUNT',
        severity: 'WARN',
        userId: userRef.id,
        email,
        ip: getClientIP(req)
      });
      return res.status(403).json({ 
        error: 'Account application was rejected',
        code: 'ACCOUNT_REJECTED',
        message: userCredential.rejectionReason || 'Your account application was not approved. Please contact administrator for more information.'
      });
    }

    // Check if account is pending approval
    if (userCredential.approvalStatus === 'pending' || !userCredential.isApproved) {
      securityAuditLog({
        event: 'LOGIN_ATTEMPT_PENDING_ACCOUNT',
        severity: 'INFO',
        userId: userRef.id,
        email,
        ip: getClientIP(req)
      });
      return res.status(403).json({ 
        error: 'Account pending approval',
        code: 'PENDING_APPROVAL',
        message: 'Your account is awaiting administrator approval. You will receive an email once approved.'
      });
    }

    // Check if account is locked (persisted lock from GCS)
    if (userCredential.lockedUntil) {
      const lockTime = new Date(userCredential.lockedUntil);
      if (lockTime > new Date()) {
        const remainingTime = Math.ceil((lockTime - new Date()) / 1000);
        return res.status(423).json({
          error: 'Account is locked',
          code: 'ACCOUNT_LOCKED',
          lockedUntil: userCredential.lockedUntil,
          remainingTime
        });
      }
    }

    // Check if account is active
    if (!userCredential.isActive) {
      securityAuditLog({
        event: 'LOGIN_ATTEMPT_INACTIVE_ACCOUNT',
        severity: 'WARN',
        userId: userRef.id,
        email,
        ip: getClientIP(req)
      });
      return res.status(403).json({ 
        error: 'Account is deactivated. Please contact administrator.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // A04 - Verify password using bcrypt (timing-safe)
    if (!verifyPassword(password, userCredential.passwordHash)) {
      // A07 - Track failed login attempt
      const attemptResult = trackLoginAttempt(email, false);
      userCredential.loginAttempts = (userCredential.loginAttempts || 0) + 1;

      // A07 - Lock account after 5 failed attempts (persist to GCS)
      if (userCredential.loginAttempts >= 5) {
        const lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        userCredential.lockedUntil = lockUntil.toISOString();
        
        securityAuditLog({
          event: 'ACCOUNT_LOCKED_FAILED_ATTEMPTS',
          severity: 'HIGH',
          userId: userRef.id,
          email,
          ip: getClientIP(req),
          attempts: userCredential.loginAttempts
        });
      }

      await writeToGCS(BUCKETS.credentials, `users/${userRef.id}.json`, userCredential);

      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset login attempts
    userCredential.loginAttempts = 0;
    userCredential.lockedUntil = null;
    userCredential.lastLogin = new Date().toISOString();
    await writeToGCS(BUCKETS.credentials, `users/${userRef.id}.json`, userCredential);

    // Create session
    const sessionToken = generateToken();
    const session = {
      id: sessionToken,
      userId: userRef.id,
      email: userCredential.email,
      role: userCredential.role,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      lastActivity: new Date().toISOString(),
      // A07 - Session binding for security
      ip: getClientIP(req),
      userAgent: req.headers['user-agent']?.substring(0, 200)
    };

    await writeToGCS(BUCKETS.credentials, `sessions/${sessionToken}.json`, session);

    // A07 - Track successful login
    trackLoginAttempt(email, true);

    // A09 - Log successful login
    securityAuditLog({
      event: 'LOGIN_SUCCESS',
      severity: 'INFO',
      userId: userRef.id,
      email,
      role: userCredential.role,
      ip: getClientIP(req)
    });

    // Log login history
    const loginHistory = await fetchFromGCS(BUCKETS.credentials, `login-history/${userRef.id}.json`) || [];
    loginHistory.push({
      timestamp: new Date().toISOString(),
      success: true,
      ip: getClientIP(req),
      userAgent: req.headers['user-agent']?.substring(0, 100)
    });
    // Keep only last 100 entries
    if (loginHistory.length > 100) {
      loginHistory.splice(0, loginHistory.length - 100);
    }
    await writeToGCS(BUCKETS.credentials, `login-history/${userRef.id}.json`, loginHistory);

    res.json({
      success: true,
      token: sessionToken,
      user: sanitizeUser(userCredential),
      expiresAt: session.expiresAt
    });
  } catch (error) {
    console.error('Login error:', error);
    // A10 - Safe error response
    securityAuditLog({
      event: 'LOGIN_ERROR',
      severity: 'HIGH',
      error: error.message,
      ip: getClientIP(req)
    });
    res.status(500).json({ error: 'Login failed. Please try again.', code: 'LOGIN_ERROR' });
  }
});

// Logout - A07 Proper session termination
app.post('/auth/logout', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      // A07 - Invalidate session by marking it as logged out
      try {
        const session = await fetchFromGCS(BUCKETS.credentials, `sessions/${token}.json`);
        if (session) {
          session.loggedOutAt = new Date().toISOString();
          session.isValid = false;
          await writeToGCS(BUCKETS.credentials, `sessions/${token}.json`, session);
          
          securityAuditLog({
            event: 'LOGOUT_SUCCESS',
            severity: 'INFO',
            userId: session.userId,
            sessionId: token,
            ip: getClientIP(req)
          });
        }
      } catch (e) {
        // Session might not exist, that's okay
      }
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ============================================================================
// PASSWORD RESET ROUTES - A07 Secure password reset
// ============================================================================

// Request password reset - with rate limiting
app.post('/auth/request-password-reset',
  rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5, // Max 5 password reset requests per hour per IP
    keyGenerator: (req) => getClientIP(req)
  }),
  async (req, res) => {
  try {
    const { email } = req.body;

    // A05 - Input validation
    if (!email) {
      return res.status(400).json({ error: 'Email is required', code: 'MISSING_EMAIL' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format', code: 'INVALID_EMAIL' });
    }

    // Find user by email
    const usersIndex = await fetchFromGCS(BUCKETS.credentials, 'users/index.json') || [];
    const userRef = usersIndex.find(u => u.email.toLowerCase() === email.toLowerCase());

    // A07 - Always return same response to prevent user enumeration
    if (!userRef) {
      securityAuditLog({
        event: 'PASSWORD_RESET_REQUEST_UNKNOWN_EMAIL',
        severity: 'INFO',
        email,
        ip: getClientIP(req)
      });
      return res.json({ success: true, message: 'If the email exists, a reset link will be sent.' });
    }

    // Generate reset token with cryptographically secure random
    const resetToken = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    // Store reset token
    const resetData = {
      userId: userRef.id,
      email: email.toLowerCase().trim(),
      token: resetToken,
      createdAt: new Date().toISOString(),
      expiresAt,
      used: false
    };

    await writeToGCS(BUCKETS.credentials, `password-resets/${resetToken}.json`, resetData);

    // Send password reset email
    try {
      // Fetch user to get name
      const userCredential = await fetchFromGCS(BUCKETS.credentials, `users/${userRef.id}.json`);
      const userName = userCredential?.name || 'Doctor';
      
      await emailService.sendPasswordResetEmail(email, resetToken, userName);
      console.log(`📧 Password reset email sent to: ${email}`);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
    }

    // Log for development
    console.log(`\n📧 PASSWORD RESET REQUEST`);
    console.log(`   Email: ${email}`);
    console.log(`   Token: ${resetToken}`);
    console.log(`   Reset Link: http://localhost:3010/reset-password?token=${resetToken}`);
    console.log(`   Expires: ${expiresAt}\n`);

    res.json({ 
      success: true, 
      message: 'Password reset link sent to your email.',
      // For development only - remove in production
      devToken: resetToken
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify reset token (check if valid before showing reset form)
app.get('/auth/verify-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ valid: false, error: 'Token is required' });
    }

    // Fetch reset token data
    const resetData = await fetchFromGCS(BUCKETS.credentials, `password-resets/${token}.json`);

    if (!resetData) {
      return res.status(400).json({ valid: false, error: 'Invalid or expired reset token' });
    }

    if (resetData.used) {
      return res.status(400).json({ valid: false, error: 'Reset token has already been used' });
    }

    if (new Date(resetData.expiresAt) < new Date()) {
      return res.status(400).json({ valid: false, error: 'Reset token has expired' });
    }

    res.json({ valid: true, email: resetData.email });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ valid: false, error: 'Failed to verify token' });
  }
});

// Reset password with token
app.post('/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Fetch reset token data
    const resetData = await fetchFromGCS(BUCKETS.credentials, `password-resets/${token}.json`);

    if (!resetData) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    if (resetData.used) {
      return res.status(400).json({ error: 'Reset token has already been used' });
    }

    if (new Date(resetData.expiresAt) < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    // Fetch user
    const userCredential = await fetchFromGCS(BUCKETS.credentials, `users/${resetData.userId}.json`);

    if (!userCredential) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Update password
    userCredential.passwordHash = hashPassword(newPassword);
    await writeToGCS(BUCKETS.credentials, `users/${resetData.userId}.json`, userCredential);

    // Mark token as used
    resetData.used = true;
    resetData.usedAt = new Date().toISOString();
    await writeToGCS(BUCKETS.credentials, `password-resets/${token}.json`, resetData);

    res.json({ success: true, message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// EMAIL SENDING ROUTE (Using Gmail API)
// ============================================================================

app.post('/auth/send-email', async (req, res) => {
  try {
    const { to, subject, body } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, body' });
    }

    // Log email for development
    console.log(`\n📧 EMAIL NOTIFICATION`);
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body: ${body.substring(0, 100)}...`);
    console.log(`   Sent at: ${new Date().toISOString()}\n`);

    // Store email in GCS for tracking
    const emailLog = await fetchFromGCS(BUCKETS.credentials, 'email-logs.json') || [];
    emailLog.push({
      id: `EMAIL-${Date.now()}`,
      to,
      subject,
      body,
      sentAt: new Date().toISOString(),
      status: 'sent'
    });
    await writeToGCS(BUCKETS.credentials, 'email-logs.json', emailLog);

    // In production, integrate with Gmail API using VITE_GOOGLE_GMAIL_API_KEY
    // For now, just log and return success

    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ADMIN APPROVAL ROUTES
// ============================================================================

// Get all doctor users for admin management
app.get('/admin/pending-doctors', async (req, res) => {
  try {
    // Fetch users index to get all users
    const usersIndex = await fetchFromGCS(BUCKETS.credentials, 'users/index.json') || [];
    
    // Filter to get only doctor users (not admin)
    const doctorUsers = [];
    const approvalHistory = [];
    
    for (const userEntry of usersIndex) {
      if (userEntry.role === 'doctor') {
        try {
          // Fetch full user details
          const userDetails = await fetchFromGCS(BUCKETS.credentials, `users/${userEntry.id}.json`);
          if (userDetails) {
            const doctorInfo = {
              id: userDetails.id,
              email: userDetails.email,
              name: userDetails.name || 'Unknown',
              specialty: userDetails.specialty || 'General Practice',
              medicalLicenseNumber: userDetails.medicalLicenseNumber || 'N/A',
              phone: userDetails.phone || '',
              createdAt: userDetails.createdAt || new Date().toISOString(),
              approvalStatus: userDetails.approvalStatus || (userDetails.isActive ? 'approved' : 'pending'),
              isActive: userDetails.isActive !== false,
              qualifications: userDetails.qualifications || [],
              experience: userDetails.experience || '',
              hospital: userDetails.hospital || '',
              lastLogin: userDetails.lastLogin || null,
            };
            
            // Categorize by approval status
            if (doctorInfo.approvalStatus === 'approved' || doctorInfo.approvalStatus === 'rejected') {
              approvalHistory.push({
                ...doctorInfo,
                processedAt: userDetails.approvedAt || userDetails.rejectedAt || userDetails.createdAt,
                processedBy: userDetails.approvedBy || userDetails.rejectedBy || 'system'
              });
            }
            
            doctorUsers.push(doctorInfo);
          }
        } catch (err) {
          console.error(`Error fetching user ${userEntry.id}:`, err.message);
        }
      }
    }
    
    // Sort by creation date (newest first)
    doctorUsers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    approvalHistory.sort((a, b) => new Date(b.processedAt) - new Date(a.processedAt));
    
    console.log(`[Admin] Fetched ${doctorUsers.length} doctor users`);
    
    res.json({ 
      success: true, 
      doctors: doctorUsers,
      history: approvalHistory,
      total: doctorUsers.length
    });
  } catch (error) {
    console.error('Get doctor users error:', error);
    res.status(500).json({ error: error.message, doctors: [], history: [] });
  }
});

// Auth-prefixed admin endpoint for frontend compatibility (VITE_AUTH_URL includes /auth)
app.get('/auth/admin/pending-doctors', async (req, res) => {
  try {
    // Fetch users index to get all users
    const usersIndex = await fetchFromGCS(BUCKETS.credentials, 'users/index.json') || [];
    
    // Include all doctor users (including admins who are also doctors)
    const doctorUsers = [];
    const approvalHistory = [];
    
    for (const userEntry of usersIndex) {
      // Include both 'doctor' role and 'admin' role users (admins can also be doctors)
      if (userEntry.role === 'doctor' || userEntry.role === 'admin') {
        try {
          // Fetch full user details
          const userDetails = await fetchFromGCS(BUCKETS.credentials, `users/${userEntry.id}.json`);
          if (userDetails) {
            const doctorInfo = {
              id: userDetails.id,
              email: userDetails.email,
              name: userDetails.name || 'Unknown',
              specialty: userDetails.specialty || 'General Practice',
              medicalLicenseNumber: userDetails.medicalLicenseNumber || 'N/A',
              phone: userDetails.phone || '',
              createdAt: userDetails.createdAt || new Date().toISOString(),
              approvalStatus: userDetails.approvalStatus || (userDetails.isActive ? 'approved' : 'pending'),
              isActive: userDetails.isActive !== false,
              isAdmin: userDetails.isAdmin || userDetails.role === 'admin',
              role: userDetails.role || 'doctor',
              qualifications: userDetails.qualifications || [],
              experience: userDetails.experience || '',
              hospital: userDetails.hospital || '',
              lastLogin: userDetails.lastLogin || null,
            };
            
            // Categorize by approval status
            if (doctorInfo.approvalStatus === 'approved' || doctorInfo.approvalStatus === 'rejected') {
              approvalHistory.push({
                ...doctorInfo,
                processedAt: userDetails.approvedAt || userDetails.rejectedAt || userDetails.createdAt,
                processedBy: userDetails.approvedBy || userDetails.rejectedBy || 'system'
              });
            }
            
            doctorUsers.push(doctorInfo);
          }
        } catch (err) {
          console.error(`Error fetching user ${userEntry.id}:`, err.message);
        }
      }
    }
    
    // Sort by creation date (newest first)
    doctorUsers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    approvalHistory.sort((a, b) => new Date(b.processedAt) - new Date(a.processedAt));
    
    console.log(`[Admin] Fetched ${doctorUsers.length} doctor users (via /auth/admin/pending-doctors)`);
    
    res.json({ 
      success: true, 
      doctors: doctorUsers,
      history: approvalHistory,
      total: doctorUsers.length
    });
  } catch (error) {
    console.error('Get doctor users error:', error);
    res.status(500).json({ error: error.message, doctors: [], history: [] });
  }
});

// Auth-prefixed admin approve endpoint
app.post('/auth/admin/approve-doctor', async (req, res) => {
  try {
    const { userId, adminId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const userCredential = await fetchFromGCS(BUCKETS.credentials, `users/${userId}.json`);
    if (!userCredential) {
      return res.status(404).json({ error: 'User not found' });
    }

    userCredential.isActive = true;
    userCredential.isApproved = true;
    userCredential.approvalStatus = 'approved';
    userCredential.approvedAt = new Date().toISOString();
    userCredential.approvedBy = adminId || 'admin';

    await writeToGCS(BUCKETS.credentials, `users/${userId}.json`, userCredential);

    // Update users index
    const usersIndex = await fetchFromGCS(BUCKETS.credentials, 'users/index.json') || [];
    const userIndex = usersIndex.findIndex(u => u.id === userId);
    if (userIndex >= 0) {
      usersIndex[userIndex].isActive = true;
      usersIndex[userIndex].approvalStatus = 'approved';
      await writeToGCS(BUCKETS.credentials, 'users/index.json', usersIndex);
    }

    // Send approval email notification
    try {
      await emailService.sendApprovalNotification(userCredential.email, userCredential.name || 'Doctor');
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
    }

    console.log(`✅ [Admin] Doctor approved: ${userCredential.email} (via /auth/admin/approve-doctor)`);

    res.json({ 
      success: true, 
      message: 'Doctor has been approved successfully',
      user: sanitizeUser(userCredential)
    });
  } catch (error) {
    console.error('Admin approve doctor error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Auth-prefixed admin reject endpoint
app.post('/auth/admin/reject-doctor', async (req, res) => {
  try {
    const { userId, reason, adminId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const userCredential = await fetchFromGCS(BUCKETS.credentials, `users/${userId}.json`);
    if (!userCredential) {
      return res.status(404).json({ error: 'User not found' });
    }

    userCredential.isActive = false;
    userCredential.isApproved = false;
    userCredential.approvalStatus = 'rejected';
    userCredential.rejectedAt = new Date().toISOString();
    userCredential.rejectedBy = adminId || 'admin';
    userCredential.rejectionReason = reason || 'Not specified';

    await writeToGCS(BUCKETS.credentials, `users/${userId}.json`, userCredential);

    // Update users index
    const usersIndex = await fetchFromGCS(BUCKETS.credentials, 'users/index.json') || [];
    const userIndex = usersIndex.findIndex(u => u.id === userId);
    if (userIndex >= 0) {
      usersIndex[userIndex].isActive = false;
      usersIndex[userIndex].approvalStatus = 'rejected';
      await writeToGCS(BUCKETS.credentials, 'users/index.json', usersIndex);
    }

    // Send rejection email notification
    try {
      await emailService.sendRejectionNotification(
        userCredential.email, 
        userCredential.name || 'Doctor',
        reason || 'Your application did not meet our current requirements.'
      );
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
    }

    console.log(`❌ [Admin] Doctor rejected: ${userCredential.email} (via /auth/admin/reject-doctor)`);

    res.json({ 
      success: true, 
      message: 'Doctor registration has been rejected'
    });
  } catch (error) {
    console.error('Admin reject doctor error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Auth-prefixed admin update role endpoint
app.post('/auth/admin/update-role', async (req, res) => {
  try {
    const { userId, adminId, role, isAdmin } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const userCredential = await fetchFromGCS(BUCKETS.credentials, `users/${userId}.json`);
    if (!userCredential) {
      return res.status(404).json({ error: 'User not found' });
    }

    userCredential.role = role;
    userCredential.isAdmin = isAdmin;
    userCredential.roleUpdatedAt = new Date().toISOString();
    userCredential.roleUpdatedBy = adminId || 'admin';

    await writeToGCS(BUCKETS.credentials, `users/${userId}.json`, userCredential);

    // Update users index
    const usersIndex = await fetchFromGCS(BUCKETS.credentials, 'users/index.json') || [];
    const userIndex = usersIndex.findIndex(u => u.id === userId);
    if (userIndex >= 0) {
      usersIndex[userIndex].role = role;
      usersIndex[userIndex].isAdmin = isAdmin;
      await writeToGCS(BUCKETS.credentials, 'users/index.json', usersIndex);
    }

    console.log(`🔄 [Admin] Role updated for ${userCredential.email}: ${role} (via /auth/admin/update-role)`);

    res.json({ 
      success: true, 
      message: `Role has been updated to ${role}`,
      user: sanitizeUser(userCredential)
    });
  } catch (error) {
    console.error('Admin update role error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get pending approvals (Admin only) - Legacy endpoint
app.get('/auth/pending-approvals', async (req, res) => {
  try {
    const pendingApprovals = await fetchFromGCS(BUCKETS.credentials, 'pending-approvals.json') || [];
    res.json({ success: true, pendingApprovals });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approve doctor registration (Admin only)
app.post('/auth/approve-doctor', async (req, res) => {
  try {
    const { userId, adminId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Fetch user credential
    const userCredential = await fetchFromGCS(BUCKETS.credentials, `users/${userId}.json`);

    if (!userCredential) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user status
    userCredential.isActive = true;
    userCredential.isApproved = true;
    userCredential.approvalStatus = 'approved';
    userCredential.approvedAt = new Date().toISOString();
    userCredential.approvedBy = adminId || 'admin';

    await writeToGCS(BUCKETS.credentials, `users/${userId}.json`, userCredential);

    // Update users index
    const usersIndex = await fetchFromGCS(BUCKETS.credentials, 'users/index.json') || [];
    const userIndex = usersIndex.findIndex(u => u.id === userId);
    if (userIndex >= 0) {
      usersIndex[userIndex].isActive = true;
      usersIndex[userIndex].approvalStatus = 'approved';
      await writeToGCS(BUCKETS.credentials, 'users/index.json', usersIndex);
    }

    // Update doctors list
    const doctors = await fetchFromGCS(BUCKETS.doctor, 'doctors.json') || [];
    const doctorIndex = doctors.findIndex(d => d.id === userId);
    if (doctorIndex >= 0) {
      doctors[doctorIndex].isApproved = true;
      await writeToGCS(BUCKETS.doctor, 'doctors.json', doctors);
    }

    // Remove from pending approvals
    let pendingApprovals = await fetchFromGCS(BUCKETS.credentials, 'pending-approvals.json') || [];
    pendingApprovals = pendingApprovals.filter(p => p.userId !== userId);
    await writeToGCS(BUCKETS.credentials, 'pending-approvals.json', pendingApprovals);

    // Log approval notification
    console.log(`\n✅ DOCTOR APPROVED`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Email: ${userCredential.email}`);
    console.log(`   Approved by: ${adminId || 'admin'}`);
    console.log(`   Approved at: ${new Date().toISOString()}\n`);

    // Send approval email notification
    try {
      await emailService.sendApprovalNotification(userCredential.email, userCredential.name || 'Doctor');
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
    }

    res.json({ 
      success: true, 
      message: 'Doctor has been approved successfully',
      user: sanitizeUser(userCredential)
    });
  } catch (error) {
    console.error('Approve doctor error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reject doctor registration (Admin only)
app.post('/auth/reject-doctor', async (req, res) => {
  try {
    const { userId, reason, adminId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Fetch user credential
    const userCredential = await fetchFromGCS(BUCKETS.credentials, `users/${userId}.json`);

    if (!userCredential) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user status
    userCredential.isActive = false;
    userCredential.isApproved = false;
    userCredential.approvalStatus = 'rejected';
    userCredential.rejectedAt = new Date().toISOString();
    userCredential.rejectedBy = adminId || 'admin';
    userCredential.rejectionReason = reason || 'Not specified';

    await writeToGCS(BUCKETS.credentials, `users/${userId}.json`, userCredential);

    // Update pending approvals
    let pendingApprovals = await fetchFromGCS(BUCKETS.credentials, 'pending-approvals.json') || [];
    pendingApprovals = pendingApprovals.map(p => {
      if (p.userId === userId) {
        return { ...p, status: 'rejected', reason };
      }
      return p;
    });
    await writeToGCS(BUCKETS.credentials, 'pending-approvals.json', pendingApprovals);

    console.log(`\n❌ DOCTOR REJECTED`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Email: ${userCredential.email}`);
    console.log(`   Reason: ${reason || 'Not specified'}`);
    console.log(`   Rejected by: ${adminId || 'admin'}\n`);

    // Send rejection email notification
    try {
      await emailService.sendRejectionNotification(
        userCredential.email, 
        userCredential.name || 'Doctor',
        reason || 'Your application did not meet our current requirements.'
      );
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
    }

    res.json({ 
      success: true, 
      message: 'Doctor registration has been rejected'
    });
  } catch (error) {
    console.error('Reject doctor error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin routes aliases (same as /auth/* routes)
app.post('/admin/approve-doctor', async (req, res) => {
  try {
    const { userId, adminId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const userCredential = await fetchFromGCS(BUCKETS.credentials, `users/${userId}.json`);
    if (!userCredential) {
      return res.status(404).json({ error: 'User not found' });
    }

    userCredential.isActive = true;
    userCredential.isApproved = true;
    userCredential.approvalStatus = 'approved';
    userCredential.approvedAt = new Date().toISOString();
    userCredential.approvedBy = adminId || 'admin';

    await writeToGCS(BUCKETS.credentials, `users/${userId}.json`, userCredential);

    // Update users index
    const usersIndex = await fetchFromGCS(BUCKETS.credentials, 'users/index.json') || [];
    const userIndex = usersIndex.findIndex(u => u.id === userId);
    if (userIndex >= 0) {
      usersIndex[userIndex].isActive = true;
      usersIndex[userIndex].approvalStatus = 'approved';
      await writeToGCS(BUCKETS.credentials, 'users/index.json', usersIndex);
    }

    console.log(`✅ [Admin] Doctor approved: ${userCredential.email}`);

    res.json({ 
      success: true, 
      message: 'Doctor has been approved successfully',
      user: sanitizeUser(userCredential)
    });
  } catch (error) {
    console.error('Admin approve doctor error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/admin/reject-doctor', async (req, res) => {
  try {
    const { userId, reason, adminId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const userCredential = await fetchFromGCS(BUCKETS.credentials, `users/${userId}.json`);
    if (!userCredential) {
      return res.status(404).json({ error: 'User not found' });
    }

    userCredential.isActive = false;
    userCredential.isApproved = false;
    userCredential.approvalStatus = 'rejected';
    userCredential.rejectedAt = new Date().toISOString();
    userCredential.rejectedBy = adminId || 'admin';
    userCredential.rejectionReason = reason || 'Not specified';

    await writeToGCS(BUCKETS.credentials, `users/${userId}.json`, userCredential);

    // Update users index
    const usersIndex = await fetchFromGCS(BUCKETS.credentials, 'users/index.json') || [];
    const userIndex = usersIndex.findIndex(u => u.id === userId);
    if (userIndex >= 0) {
      usersIndex[userIndex].isActive = false;
      usersIndex[userIndex].approvalStatus = 'rejected';
      await writeToGCS(BUCKETS.credentials, 'users/index.json', usersIndex);
    }

    console.log(`❌ [Admin] Doctor rejected: ${userCredential.email}`);

    res.json({ 
      success: true, 
      message: 'Doctor registration has been rejected'
    });
  } catch (error) {
    console.error('Admin reject doctor error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify session
app.get('/auth/verify', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const session = await fetchFromGCS(BUCKETS.credentials, `sessions/${token}.json`);

    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Check if session expired
    if (new Date(session.expiresAt) < new Date()) {
      return res.status(401).json({ error: 'Session expired' });
    }

    // Fetch user
    const userCredential = await fetchFromGCS(BUCKETS.credentials, `users/${session.userId}.json`);

    if (!userCredential) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({
      valid: true,
      user: sanitizeUser(userCredential),
      session
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// PROXY GCS STORAGE OPERATIONS
// ============================================================================

// Proxy all storage requests to internal GCS API Server
app.use('/api/storage', async (req, res) => {
  try {
    const targetUrl = `${GCS_API_URL}/api/storage${req.path}`;
    const options = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (req.method !== 'GET') {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''), options);
    const data = await response.json();

    res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Storage operation failed' });
  }
});

// ============================================================================
// TEST-ONLY ENDPOINTS (Development Mode Only)
// ============================================================================

if (process.env.NODE_ENV !== 'production') {
  // Reset rate limits for testing
  app.post('/test/reset-rate-limits', (req, res) => {
    const result = resetRateLimits();
    console.log('🧪 Test endpoint called: Rate limits reset');
    res.json({ success: true, ...result, message: 'Rate limits cleared for testing' });
  });
}

// ============================================================================
// A10 - GLOBAL ERROR HANDLER
// ============================================================================

app.use(secureErrorHandler());

// ============================================================================
// START SERVER
// ============================================================================

async function startServer() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🔐 IZARA AUTHENTICATION SERVER (OWASP Top 10:2025 Compliant)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('🛡️  Security Features Enabled:');
  console.log('   • A01 - Role-based Access Control (RBAC)');
  console.log('   • A02 - Security Headers & CORS');
  console.log('   • A04 - bcrypt Password Hashing');
  console.log('   • A05 - Input Validation & Sanitization');
  console.log('   • A07 - Rate Limiting & Account Lockout');
  console.log('   • A09 - Security Audit Logging');
  console.log('   • A10 - Secure Error Handling\n');

  // Start listening immediately for faster startup
  server.listen(PORT, '0.0.0.0', () => {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`🚀 Auth Server running on http://localhost:${PORT}`);
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('🔗 Authentication Endpoints:');
    console.log('   POST /auth/register');
    console.log('   POST /auth/login');
    console.log('   POST /auth/logout');
    console.log('   GET  /auth/verify');
    console.log('   POST /auth/request-password-reset');
    console.log('   POST /auth/reset-password');
    console.log('\n🔗 Admin Endpoints (both prefixes supported):');
    console.log('   GET  /admin/pending-doctors (or /auth/admin/pending-doctors)');
    console.log('   POST /admin/approve-doctor (or /auth/admin/approve-doctor)');
    console.log('   POST /admin/reject-doctor (or /auth/admin/reject-doctor)');
    console.log('   POST /auth/admin/update-role');
    console.log('\n🔗 Storage Proxy:');
    console.log('   ALL  /api/storage/* → GCS API Server');
    console.log('\n🔌 WebSocket: ws://localhost:' + PORT + '/ws');
    console.log('\n📡 GCS API Server: ' + GCS_API_URL);
    console.log('\n═══════════════════════════════════════════════════════════════\n');
  });

  // Verify GCS connection in the background (non-blocking)
  verifyGCSConnection().then(gcsConnected => {
    if (!gcsConnected) {
      console.error('⚠️  WARNING: Could not connect to GCS API Server');
      console.error('   Make sure it\'s running on: ' + GCS_API_URL + '\n');
    }
  });

  // Initialize email service in the background (non-blocking)
  emailService.initialize().then(() => {
    console.log('📧 Email service initialized');
  }).catch(emailError => {
    console.warn('⚠️  Email service initialization failed:', emailError.message);
    console.warn('   Emails will be simulated in development mode\n');
  });
}

// Start the server
startServer();

module.exports = { app, server };
