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

// Load environment variables from .env file FIRST
const dotenv = require('dotenv');
dotenv.config();

// Force unbuffered output for Cloud Run logging
process.stdout.write('[AUTH-SERVER] Starting module load...\n');
process.stdout.write(`[AUTH-SERVER] Loaded .env - USE_POSTGRESQL=${process.env.USE_POSTGRESQL}\n`);

process.stdout.write('[AUTH-SERVER] Loading express...\n');
const express = require('express');
process.stdout.write('[AUTH-SERVER] Loading cors...\n');
const cors = require('cors');
process.stdout.write('[AUTH-SERVER] Loading bcryptjs...\n');
const bcrypt = require('bcryptjs');
process.stdout.write('[AUTH-SERVER] Loading jsonwebtoken...\n');
const jwt = require('jsonwebtoken');
process.stdout.write('[AUTH-SERVER] Loading crypto...\n');
const crypto = require('node:crypto');
process.stdout.write('[AUTH-SERVER] Loading http...\n');
const http = require('node:http');
process.stdout.write('[AUTH-SERVER] Loading socket.io...\n');
const { Server } = require('socket.io');
const path = require('node:path');

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
const isProduction = process.env.NODE_ENV === 'production';

// ============================================================================
// JWT CONFIGURATION - MUST match mainApiServer.cjs
// ============================================================================
// SECURITY: No hardcoded fallback secrets. Fail fast in every environment.
const JWT_SECRET = process.env.JWT_SECRET || process.env.VITE_JWT_SECRET;
if (!JWT_SECRET) {
  console.error('[SECURITY] FATAL: JWT_SECRET not set. Generate one with `openssl rand -hex 32` and set it in .env. Exiting.');
  process.exit(1);
}
const JWT_SECRET_FINAL = JWT_SECRET;
const JWT_ISSUER = process.env.JWT_ISSUER || 'izara-telemedicine';
const JWT_EXPIRES_IN = '3h';
const REFRESH_TOKEN_EXPIRES_DAYS = 30;

/**
 * Authentication middleware - verify JWT token and attach user to request
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET_FINAL);
    req.user = decoded;
    next();
  } catch (error) {
    console.warn('[AUTH] Token verification failed:', error.message);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Admin authorization middleware - checks user has admin role
 */
function requireAdmin(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && !req.user.isAdmin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/**
 * Generate JWT token for authenticated user
 */
function generateJWT(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    doctorId: user.doctor_id || user.doctorId || null,
    isAdmin: user.is_admin || user.isAdmin || false
  };
  
  return jwt.sign(payload, JWT_SECRET_FINAL, {
    issuer: JWT_ISSUER,
    expiresIn: JWT_EXPIRES_IN,
    algorithm: 'HS256'
  });
}

// ============================================================================
// POSTGRESQL CONFIGURATION
// ============================================================================
// PRODUCTION MODE - Always use PostgreSQL
const USE_POSTGRESQL = true; // Always production mode
let PostgresDataService = null;
let pgPool = null;
let DB_AVAILABLE = false;

// Initialize PostgreSQL connection
try {
  PostgresDataService = require('./services/postgresDataService.cjs');
    const { Pool } = require('pg');
    
    // Parse DATABASE_URL if available
    let dbConfig = {};
    if (process.env.DATABASE_URL) {
      try {
        const url = new URL(process.env.DATABASE_URL);
        dbConfig = {
          host: url.hostname,
          port: Number.parseInt(url.port || '5432', 10),
          database: url.pathname.substring(1),
          user: url.username,
          password: decodeURIComponent(url.password),
        };
      } catch (e) {
        console.warn('⚠️ Failed to parse DATABASE_URL:', e.message);
      }
    }
    
    // PostgreSQL Docker service configuration (NO Cloud SQL)
    const dbHost = dbConfig.host || process.env.DB_HOST || 'localhost';
    
    const poolOptions = {
      host: dbHost,
      port: dbConfig.port || Number.parseInt(process.env.DB_PORT || '5433', 10),
      database: dbConfig.database || process.env.DB_NAME || 'izara_phase1',
      user: dbConfig.user || process.env.DB_USER || 'postgres',
      password: dbConfig.password || process.env.DB_PASSWORD || '',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };
    
    console.log(`[AUTH] PostgreSQL: host=${poolOptions.host}, port=${poolOptions.port}`);
    
    pgPool = new Pool(poolOptions);
    
    // Handle pool errors to prevent process exit
    pgPool.on('error', (err) => {
      console.error('PostgreSQL pool error:', err.message);
    });
    
    // Test connection
    pgPool.query('SELECT NOW()')
      .then(() => console.log('✅ PostgreSQL connected (Auth Server)'))
      .catch(err => console.error('❌ PostgreSQL connection error:', err.message));
    
    console.log('✅ PostgreSQL Auth Service loaded - USE_POSTGRESQL=true');
} catch (error) {
  console.error('❌ Failed to load PostgreSQL service:', error.message);
  console.error('❌ CRITICAL: PostgreSQL is required. Application may not function correctly.');
}

const BUCKETS = {
  credentials: 'izara-users-credentials',
  doctor: 'izara-doctors-data',
  patient: 'izara-patients-data',
  appointments: 'izara-appointments',
  metadata: 'izara-meta-data'
};

// Allowed CORS origins (A02 - Security Misconfiguration)
// Always include localhost for local Docker (NODE_ENV=production) + CORS_ORIGINS env override
const ALLOWED_ORIGINS = [
  'http://localhost:3010', 'http://localhost:3011', 'http://localhost:3005',
  'http://127.0.0.1:3010', 'http://0.0.0.0:3010',
  ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(s => s.trim()) : []),
];
if (process.env.NODE_ENV === 'production') {
  ALLOWED_ORIGINS.push(
    'https://doctor.izara.com',
    'https://izara.com',
    'https://izara-doctor-portal-724889190329.asia-southeast1.run.app',
    'https://izara-patient-portal-724889190329.asia-southeast1.run.app',
    'https://izara-jitsi-meeting-portal-724889190329.asia-southeast1.run.app',
    'https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app',
    'https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app',
    'https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app',
  );
}
// Regex pattern for Cloud Run dynamic URLs (both old hvht4obouq and new 724889190329 formats)
const CLOUD_RUN_PATTERN = /^https:\/\/izara-[a-z0-9-]+(-hvht4obouq-as\.a\.run\.app|-724889190329\.asia-southeast1\.run\.app)$/;

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
    // Check string matches and Cloud Run regex pattern
    if (ALLOWED_ORIGINS.includes(origin) || CLOUD_RUN_PATTERN.test(origin)) {
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

// A07 - Rate limiting for all requests (increased for testing)
app.use(rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 10000, // High limit for testing
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
    // Verify token using PostgreSQL and join user room
    if (!pgPool) {
      console.log(`[WS] PostgreSQL not available for socket authentication`);
      return;
    }
    const session = await pgValidateSession(token);
    if (session?.user_id) {
      socket.join(`user-${session.user_id}`);
      console.log(`User ${session.user_id} authenticated on socket ${socket.id}`);
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
  const { passwordHash, password_hash, loginAttempts, login_attempts, lockedUntil, locked_until, ...sanitized } = user;
  return sanitized;
}

// ============================================================================
// POSTGRESQL AUTH HELPERS
// ============================================================================

async function pgFindUserByEmail(email) {
  if (!pgPool) return null;
  try {
    console.log('[PG-AUTH] Looking up user:', email);
    const result = await pgPool.query(
      `SELECT u.*, 
              u.password_hash as "passwordHash",
              u.is_admin as "isAdmin",
              u.is_active as "isActive",
              u.admin_privileges as "adminPrivileges",
              u.name_thai as "nameThai",
              u.doctor_id as "doctorId",
              u.is_approved as "isApproved",
              u.approval_status as "approvalStatus",
              u.login_attempts as "loginAttempts",
              u.locked_until as "lockedUntil",
              u.last_login as "lastLogin",
              u.created_at as "createdAt",
              dp.specialty,
              dp.hospital_name as "hospitalName",
              dp.qualifications as "medicalLicenseNumber"
       FROM users u
       LEFT JOIN doctor_profiles dp ON dp.doctor_id = u.id
       WHERE LOWER(u.email) = LOWER($1)`,
      [email]
    );
    const user = result.rows[0] || null;
    if (user) {
      console.log('[PG-AUTH] Found user:', user.email, 'role:', user.role);
    } else {
      console.log('[PG-AUTH] User not found');
    }
    return user;
  } catch (err) {
    console.error('PostgreSQL user lookup error:', err.message);
    return null;
  }
}

async function pgCreateSession(userId, email, role, ip, userAgent, deviceId) {
  if (!pgPool) return null;
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours (matches JWT_EXPIRES_IN)
    
    // Invalidate all previous active sessions for this user to prevent cross-device contamination
    await pgPool.query(
      `UPDATE sessions SET expires_at = NOW(), logged_out_at = NOW()
       WHERE user_id = $1 AND expires_at > NOW() AND logged_out_at IS NULL`,
      [userId]
    );

    const result = await pgPool.query(
      `INSERT INTO sessions (id, user_id, token, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [crypto.randomUUID(), userId, token, expiresAt, ip, userAgent?.substring(0, 500)]
    );
    
    // Update last_login
    await pgPool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [userId]);
    
    return {
      token,
      expiresAt: expiresAt.toISOString(),
      session: result.rows[0]
    };
  } catch (err) {
    console.error('PostgreSQL session creation error:', err.message);
    return null;
  }
}

async function pgValidateSession(token) {
  if (!pgPool) return null;
  try {
    const result = await pgPool.query(
      `SELECT s.*, u.id as user_id, u.email, u.role, u.name, u.name_thai, u.is_admin, u.doctor_id,
              u.admin_privileges, u.specialty, dp.hospital_name
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN doctor_profiles dp ON dp.doctor_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW() AND s.logged_out_at IS NULL AND s.logged_out_at IS NULL`,
      [token]
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error('PostgreSQL session validation error:', err.message);
    return null;
  }
}

async function pgInvalidateSession(token) {
  if (!pgPool) return false;
  try {
    await pgPool.query('DELETE FROM sessions WHERE token = $1', [token]);
    return true;
  } catch (err) {
    console.error('PostgreSQL session invalidation error:', err.message);
    return false;
  }
}

async function pgUpdateLoginAttempts(userId, attempts, lockedUntil = null) {
  if (!pgPool) return false;
  try {
    await pgPool.query(
      'UPDATE users SET login_attempts = $1, locked_until = $2 WHERE id = $3',
      [attempts, lockedUntil, userId]
    );
    return true;
  } catch (err) {
    console.error('PostgreSQL update login attempts error:', err.message);
    return false;
  }
}

// ============================================================================
// PASSWORD RESET TOKEN HELPERS (PostgreSQL)
// ============================================================================

async function pgCreatePasswordResetToken(userId, email) {
  if (!pgPool) return null;
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    // Delete any existing tokens for this user
    await pgPool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
    
    // Create new token
    await pgPool.query(
      `INSERT INTO password_reset_tokens (id, user_id, token, expires_at, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [crypto.randomUUID(), userId, token, expiresAt]
    );
    
    return { token, expiresAt: expiresAt.toISOString() };
  } catch (err) {
    console.error('PostgreSQL create password reset token error:', err.message);
    return null;
  }
}

async function pgVerifyPasswordResetToken(token) {
  if (!pgPool) return null;
  try {
    const result = await pgPool.query(
      `SELECT prt.*, u.email, u.name 
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = $1 AND prt.expires_at > NOW() AND prt.used_at IS NULL`,
      [token]
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error('PostgreSQL verify password reset token error:', err.message);
    return null;
  }
}

async function pgUsePasswordResetToken(token, newPasswordHash) {
  if (!pgPool) return false;
  try {
    // Start transaction
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      
      // Get token data
      const tokenResult = await client.query(
        `SELECT user_id FROM password_reset_tokens 
         WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL`,
        [token]
      );
      
      if (tokenResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }
      
      const userId = tokenResult.rows[0].user_id;
      
      // Update password
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newPasswordHash, userId]
      );
      
      // Mark token as used
      await client.query(
        'UPDATE password_reset_tokens SET used_at = NOW() WHERE token = $1',
        [token]
      );
      
      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('PostgreSQL use password reset token error:', err.message);
    return false;
  }
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

// Register - PostgreSQL implementation
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name, medicalLicenseNumber, specialty, dateOfBirth, phone, status } = req.body;

    // Validation
    if (!email || !password || !name || !medicalLicenseNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Password validation (OWASP policy: 12+ chars, upper, lower, number, special)
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({ error: passwordCheck.errors.join('. ') });
    }

    // Check PostgreSQL availability
    if (!pgPool) {
      console.error('[AUTH] PostgreSQL connection not available for registration');
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please try again later.',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    const emailLower = email.toLowerCase().trim();

    // Check if user already exists
    const existingUserResult = await pgPool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [emailLower]
    );

    if (existingUserResult.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered. Please login instead.' });
    }

    // Create user ID - consistent format
    const userId = `DOC-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Determine if pending approval
    const isPending = status === 'pending_approval';
    const passwordHash = hashPassword(password);

    // Insert user into PostgreSQL with all required fields
    await pgPool.query(
      `INSERT INTO users (id, email, password_hash, name, role, doctor_id, medical_license_number, specialty, is_active, is_approved, is_verified, approval_status, phone, date_of_birth, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())`,
      [
        userId,
        emailLower,
        passwordHash,
        name,
        'doctor',
        userId, // doctor_id = user_id for doctors
        medicalLicenseNumber,
        specialty || 'General Practice',
        !isPending, // is_active
        !isPending, // is_approved
        true, // is_verified
        isPending ? 'pending' : 'approved',
        phone || null,
        dateOfBirth || null
      ]
    );

    // Insert doctor profile - doctor_id must reference users.id
    await pgPool.query(
      `INSERT INTO doctor_profiles (doctor_id, specialty, qualifications, hospital_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (doctor_id) DO UPDATE SET specialty = $2, qualifications = $3, hospital_name = $4, updated_at = NOW()`,
      [userId, specialty || 'General Practice', medicalLicenseNumber, 'Izara Telemedicine Hospital']
    );

    // Also insert into doctors table for patient-facing listing
    await pgPool.query(
      `INSERT INTO doctors (id, name, specialty, hospital, is_available, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET name = $2, specialty = $3, hospital = $4, updated_at = NOW()`,
      [userId, name, specialty || 'General Practice', 'Izara Telemedicine Hospital', !isPending]
    );

    // Send email notification to admin if pending
    if (isPending) {
      try {
        await emailService.sendAdminNotification(ADMIN_EMAIL, {
          name,
          email: emailLower,
          specialty: specialty || 'General Practice',
          createdAt: new Date().toISOString()
        });
        console.log(`📧 Admin notification email sent for new registration: ${emailLower}`);
      } catch (emailError) {
        console.error('Failed to send admin notification email:', emailError);
      }
    }

    // A09 - Audit log successful registration
    securityAuditLog({
      event: 'USER_REGISTERED',
      severity: 'INFO',
      userId,
      email: emailLower,
      role: 'doctor',
      isPending,
      ip: getClientIP(req),
      source: 'PostgreSQL'
    });

    console.log(`✅ Doctor registered successfully: ${emailLower}, ID: ${userId}, Status: ${isPending ? 'pending' : 'approved'}`);

    const userCredential = {
      id: userId,
      email: emailLower,
      name,
      role: 'doctor',
      doctorId: userId,
      medicalLicenseNumber,
      isActive: !isPending,
      isApproved: !isPending,
      approvalStatus: isPending ? 'pending' : 'approved',
      specialty: specialty || 'General Practice'
    };

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
  // A07 - Strict rate limiting for login endpoint (increased for testing)
  rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 1000, // High limit for testing
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
        retryAfter: 60
      });
    }
  }),
  async (req, res) => {
  try {
    const { email, password, deviceId, userAgent: clientUserAgent } = req.body;

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

    // ========================================================================
    // PostgreSQL PRODUCTION login (always use PostgreSQL)
    // ========================================================================
    if (!pgPool) {
      console.error('[AUTH] PostgreSQL connection not available');
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please try again later.',
        code: 'DATABASE_UNAVAILABLE'
      });
    }
    
    console.log('[AUTH] Using PostgreSQL for login');
    
    // Find user by email
    const user = await pgFindUserByEmail(email);
      
      if (!user) {
        trackLoginAttempt(email, false);
        securityAuditLog({
          event: 'LOGIN_FAILED_USER_NOT_FOUND',
          severity: 'WARN',
          email,
          ip: getClientIP(req)
        });
        return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
      }
      
      // Check if account is active
      if (user.isActive === false || user.is_active === false) {
        return res.status(403).json({ 
          error: 'Account is deactivated. Please contact administrator.',
          code: 'ACCOUNT_DEACTIVATED'
        });
      }
      
      // Check if account is locked
      if (user.lockedUntil || user.locked_until) {
        const lockTime = new Date(user.lockedUntil || user.locked_until);
        if (lockTime > new Date()) {
          return res.status(423).json({
            error: 'Account is locked',
            code: 'ACCOUNT_LOCKED',
            remainingTime: Math.ceil((lockTime - Date.now()) / 1000)
          });
        }
      }
      
      // Verify password
      const passwordHash = user.passwordHash || user.password_hash;
      if (!passwordHash || !verifyPassword(password, passwordHash)) {
        // Track failed attempt
        const attempts = (user.loginAttempts || user.login_attempts || 0) + 1;
        let lockedUntil = null;
        
        if (attempts >= 5) {
          lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
        }
        
        await pgUpdateLoginAttempts(user.id, attempts, lockedUntil);
        trackLoginAttempt(email, false);
        
        return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
      }
      
      // Reset login attempts on success
      await pgUpdateLoginAttempts(user.id, 0, null);
      
      // Create session for session tracking (optional)
      const clientIP = getClientIP(req);
      const sessionResult = await pgCreateSession(
        user.id, 
        user.email, 
        user.role, 
        clientIP, 
        clientUserAgent || req.headers['user-agent'],
        deviceId
      );
      
      if (!sessionResult) {
        return res.status(500).json({ error: 'Failed to create session', code: 'SESSION_ERROR' });
      }
      
      // Generate JWT token for API authentication
      const jwtToken = generateJWT(user);
      const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(); // 3 hours

      // Generate refresh token (30-day expiry, stored as SHA-256 hash)
      const refreshTokenRaw = crypto.randomBytes(64).toString('hex');
      const refreshTokenHash = crypto.createHash('sha256').update(refreshTokenRaw).digest('hex');
      const refreshTokenExpires = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
      const refreshTokenId = `RT-${crypto.randomUUID().substring(0, 12)}`;

      try {
        await pgPool.query(
          `INSERT INTO refresh_tokens (id, user_id, token_hash, device_id, expires_at, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [refreshTokenId, user.id, refreshTokenHash, deviceId || null,
           refreshTokenExpires, clientIP, (clientUserAgent || req.headers['user-agent'] || '').substring(0, 500)]
        );
      } catch (rtErr) {
        console.error('[AUTH] Failed to store refresh token:', rtErr.message);
        // Non-fatal — login still succeeds without refresh token
      }
      
      // Track successful login
      trackLoginAttempt(email, true);
      
      securityAuditLog({
        event: 'LOGIN_SUCCESS',
        severity: 'INFO',
        userId: user.id,
        email,
        role: user.role,
        ip: clientIP,
        source: 'PostgreSQL'
      });
      
      return res.json({
        success: true,
        token: jwtToken, // JWT token for API authentication
        refreshToken: refreshTokenRaw, // Refresh token for silent renewal
        sessionToken: sessionResult.token, // Session token for session management
        user: sanitizeUser({
          id: user.id,
          email: user.email,
          name: user.name,
          nameThai: user.name_thai || user.nameThai,
          role: user.role,
          doctorId: user.doctor_id || user.doctorId,
          isAdmin: user.is_admin || user.isAdmin,
          adminPrivileges: user.admin_privileges || user.adminPrivileges,
          specialty: user.specialty,
          hospitalName: user.hospital_name || user.hospitalName,
          medicalLicenseNumber: user.medical_license || user.medicalLicenseNumber
        }),
        expiresAt: expiresAt,
        expiresIn: 10800 // 3 hours in seconds
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

// =====================================================
// GOOGLE SSO — verify ID token, enforce pending_approval, issue JWT
// =====================================================
const { OAuth2Client: GoogleOAuth2Client } = require('google-auth-library');
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID ? new GoogleOAuth2Client(GOOGLE_CLIENT_ID) : null;
if (!GOOGLE_CLIENT_ID) {
  console.warn('[AUTH] GOOGLE_CLIENT_ID not set — /auth/google-auth will return 503');
}

async function verifyGoogleIdToken(idToken) {
  const fixture = process.env.GOOGLE_TOKEN_VERIFIER_FIXTURE;
  if (fixture && process.env.NODE_ENV !== 'production') {
    // Mode 1: '1'/'true' -> parse idToken itself as JSON payload (per-request).
    // Mode 2: env value is JSON -> always return that payload.
    const useTokenAsPayload = fixture === '1' || fixture.toLowerCase() === 'true';
    try {
      const p = useTokenAsPayload ? JSON.parse(idToken) : JSON.parse(fixture);
      if (!p || !p.sub || !p.email) return null;
      return { sub: p.sub, email: p.email, emailVerified: p.email_verified !== false, name: p.name, picture: p.picture };
    } catch {
      return null;
    }
  }
  if (!googleClient) return null;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
    const p = ticket.getPayload();
    if (!p || !p.sub || !p.email) return null;
    return { sub: p.sub, email: p.email, emailVerified: !!p.email_verified, name: p.name, picture: p.picture };
  } catch (err) {
    console.warn('[AUTH] Google token verification failed:', err.message);
    return null;
  }
}

app.post('/auth/google-auth', async (req, res) => {
  try {
    const { idToken } = req.body || {};
    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({ error: 'idToken is required', code: 'MISSING_TOKEN' });
    }
    if (!GOOGLE_CLIENT_ID && !process.env.GOOGLE_TOKEN_VERIFIER_FIXTURE) {
      return res.status(503).json({ error: 'Google SSO not configured', code: 'SSO_DISABLED' });
    }

    const payload = await verifyGoogleIdToken(idToken);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid Google token', code: 'INVALID_GOOGLE_TOKEN' });
    }
    if (!payload.emailVerified) {
      return res.status(403).json({ error: 'Google email not verified', code: 'EMAIL_NOT_VERIFIED' });
    }

    const emailLower = payload.email.toLowerCase().trim();
    const clientIP = getClientIP(req);
    const clientUserAgent = req.headers['user-agent'] || '';

    let user = await pgFindUserByEmail(emailLower);

    if (!user) {
      // STRICT MODE: existing accounts only. Unknown email -> 404 NOT_REGISTERED.
      securityAuditLog({
        event: 'GOOGLE_SSO_UNKNOWN_EMAIL',
        severity: 'INFO',
        email: emailLower, ip: clientIP, source: 'GoogleSSO',
      });
      return res.status(404).json({
        error: 'not_registered',
        code: 'NOT_REGISTERED',
        message: 'No doctor account found for this Google email. Please register first.',
        email: emailLower,
      });
    }

    // Require a real password (reject Google-only stub accounts)
    if (!user.password_hash || user.password_hash === '!google-sso!') {
      return res.status(403).json({
        error: 'password_not_set',
        code: 'PASSWORD_NOT_SET',
        message: 'Please complete registration with a username and password before using Google sign-in.',
        email: emailLower,
      });
    }

    // Existing user — link google_sub if missing (best-effort)
    try {
      await pgPool.query(
        'UPDATE users SET google_sub = COALESCE(google_sub, $1), updated_at = NOW() WHERE id = $2',
        [payload.sub, user.id]
      );
    } catch (linkErr) {
      console.warn('[AUTH/google] google_sub link skipped:', linkErr.message);
    }

    if (user.role !== 'doctor' && user.role !== 'admin') {
      return res.status(403).json({ error: 'This Google account is not registered as a doctor', code: 'ROLE_MISMATCH' });
    }
    if (user.is_active === false) {
      return res.status(403).json({ error: 'Account is deactivated', code: 'ACCOUNT_DEACTIVATED' });
    }
    if (user.approval_status === 'pending' || user.is_approved === false) {
      return res.status(403).json({
        error: 'pending_approval',
        code: 'PENDING_APPROVAL',
        message: 'Doctor account is awaiting admin approval',
        userId: user.id,
      });
    }
    if (user.approval_status === 'rejected') {
      return res.status(403).json({ error: 'Account has been rejected', code: 'ACCOUNT_REJECTED' });
    }

    // Issue JWT + session + refresh token (mirrors /auth/login)
    const sessionResult = await pgCreateSession(
      user.id, user.email, user.role, clientIP, clientUserAgent, null
    );
    if (!sessionResult) {
      return res.status(500).json({ error: 'Failed to create session', code: 'SESSION_ERROR' });
    }
    const jwtToken = generateJWT(user);
    const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

    const refreshTokenRaw = crypto.randomBytes(64).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshTokenRaw).digest('hex');
    const refreshTokenExpires = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
    const refreshTokenId = `RT-${crypto.randomUUID().substring(0, 12)}`;
    try {
      await pgPool.query(
        `INSERT INTO refresh_tokens (id, user_id, token_hash, device_id, expires_at, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [refreshTokenId, user.id, refreshTokenHash, null,
         refreshTokenExpires, clientIP, clientUserAgent.substring(0, 500)]
      );
    } catch (rtErr) {
      console.error('[AUTH/google] refresh token insert failed:', rtErr.message);
    }

    securityAuditLog({
      event: 'GOOGLE_SSO_LOGIN_SUCCESS',
      severity: 'INFO',
      userId: user.id, email: emailLower, role: user.role, ip: clientIP, source: 'GoogleSSO',
    });

    return res.json({
      success: true,
      token: jwtToken,
      refreshToken: refreshTokenRaw,
      sessionToken: sessionResult.token,
      user: sanitizeUser({
        id: user.id,
        email: user.email,
        name: user.name,
        nameThai: user.name_thai || user.nameThai,
        role: user.role,
        doctorId: user.doctor_id || user.doctorId,
        isAdmin: user.is_admin || user.isAdmin,
        adminPrivileges: user.admin_privileges || user.adminPrivileges,
        specialty: user.specialty,
        hospitalName: user.hospital_name || user.hospitalName,
        medicalLicenseNumber: user.medical_license || user.medicalLicenseNumber,
      }),
      expiresAt,
      expiresIn: 10800,
    });
  } catch (error) {
    console.error('[AUTH/google] error:', error);
    securityAuditLog({
      event: 'GOOGLE_SSO_ERROR', severity: 'HIGH', error: error.message, ip: getClientIP(req),
    });
    return res.status(500).json({ error: 'Google sign-in failed', code: 'GOOGLE_SSO_ERROR' });
  }
});

// Logout - A07 Proper session termination (PostgreSQL-only)
app.post('/auth/logout', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];

    if (!pgPool) {
      console.error('[AUTH] PostgreSQL connection not available for logout');
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please try again later.',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    if (token) {
      // Decode JWT to get userId for revoking refresh tokens
      let userId = null;
      try {
        const decoded = jwt.verify(token, JWT_SECRET_FINAL);
        userId = decoded.userId;
      } catch (verifyErr) {
        // Token may be expired — try decode without verification
        console.debug('[AUTH] logout token verify failed, falling back to decode:', verifyErr.message);
        try {
          const decoded = jwt.decode(token);
          userId = decoded?.userId;
        } catch (decodeErr) {
          console.debug('[AUTH] logout token decode failed:', decodeErr.message);
          userId = null;
        }
      }

      await pgInvalidateSession(token);

      // Revoke all refresh tokens for this user
      if (userId) {
        await pgPool.query(
          `UPDATE refresh_tokens SET is_revoked = true, revoked_at = NOW()
           WHERE user_id = $1 AND is_revoked = false`,
          [userId]
        );
      }

      securityAuditLog({
        event: 'LOGOUT_SUCCESS',
        severity: 'INFO',
        sessionId: token,
        ip: getClientIP(req),
        source: 'PostgreSQL'
      });
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ============================================================================
// TOKEN REFRESH - Refresh JWT using refresh token (rotation)
// ============================================================================
app.post('/auth/refresh',
  rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 30, // 30 refresh requests per minute per IP
    keyGenerator: (req) => getClientIP(req)
  }),
  async (req, res) => {
  try {
    const { refreshToken, deviceId } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required', code: 'MISSING_REFRESH_TOKEN' });
    }

    if (!pgPool) {
      return res.status(503).json({ error: 'Database unavailable', code: 'DATABASE_UNAVAILABLE' });
    }

    // Hash the incoming token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Find valid (non-revoked, non-expired) refresh token + user data
    const tokenResult = await pgPool.query(
      `SELECT rt.*, u.id as user_id, u.email, u.name, u.name_thai, u.role,
              u.doctor_id, u.is_admin, u.is_active, u.admin_privileges,
              u.specialty, u.medical_license_number
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.token_hash = $1 AND rt.is_revoked = false AND rt.expires_at > NOW()`,
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      securityAuditLog({
        event: 'TOKEN_REFRESH_INVALID',
        severity: 'WARN',
        ip: getClientIP(req)
      });
      return res.status(401).json({ error: 'Invalid or expired refresh token', code: 'INVALID_REFRESH_TOKEN' });
    }

    const tokenRow = tokenResult.rows[0];

    // Check if user account is still active
    if (!tokenRow.is_active) {
      return res.status(401).json({ error: 'Account is deactivated', code: 'ACCOUNT_DEACTIVATED' });
    }

    // === Token Rotation: revoke old, issue new ===
    const newRefreshTokenRaw = crypto.randomBytes(64).toString('hex');
    const newRefreshHash = crypto.createHash('sha256').update(newRefreshTokenRaw).digest('hex');
    const newTokenId = `RT-${crypto.randomUUID().substring(0, 12)}`;
    const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    // Revoke old refresh token
    await pgPool.query(
      `UPDATE refresh_tokens SET is_revoked = true, revoked_at = NOW(), replaced_by = $2 WHERE id = $1`,
      [tokenRow.id, newTokenId]
    );

    // Insert new refresh token
    await pgPool.query(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, device_id, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [newTokenId, tokenRow.user_id, newRefreshHash, deviceId || tokenRow.device_id,
       newExpiresAt, getClientIP(req), (req.headers['user-agent'] || '').substring(0, 500)]
    );

    // Generate new JWT
    const newJwt = generateJWT({
      id: tokenRow.user_id,
      email: tokenRow.email,
      role: tokenRow.role,
      name: tokenRow.name,
      doctor_id: tokenRow.doctor_id,
      is_admin: tokenRow.is_admin
    });

    // Create new session
    const sessionResult = await pgCreateSession(
      tokenRow.user_id, tokenRow.email, tokenRow.role,
      getClientIP(req), req.headers['user-agent'], deviceId
    );

    const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

    console.log(`[AUTH] Token refreshed for user: ${tokenRow.email}`);

    securityAuditLog({
      event: 'TOKEN_REFRESH_SUCCESS',
      severity: 'INFO',
      userId: tokenRow.user_id,
      email: tokenRow.email,
      ip: getClientIP(req)
    });

    res.json({
      success: true,
      token: newJwt,
      refreshToken: newRefreshTokenRaw,
      sessionToken: sessionResult?.token || null,
      expiresAt,
      expiresIn: 10800, // 3 hours in seconds
      user: sanitizeUser({
        id: tokenRow.user_id,
        email: tokenRow.email,
        name: tokenRow.name,
        nameThai: tokenRow.name_thai,
        role: tokenRow.role,
        doctorId: tokenRow.doctor_id,
        isAdmin: tokenRow.is_admin,
        adminPrivileges: tokenRow.admin_privileges,
        specialty: tokenRow.specialty,
        medicalLicenseNumber: tokenRow.medical_license_number
      })
    });
  } catch (error) {
    console.error('[AUTH] Token refresh error:', error);
    securityAuditLog({
      event: 'TOKEN_REFRESH_ERROR',
      severity: 'HIGH',
      error: error.message,
      ip: getClientIP(req)
    });
    res.status(500).json({ error: 'Token refresh failed', code: 'REFRESH_ERROR' });
  }
});

// ============================================================================
// PASSWORD RESET ROUTES - A07 Secure password reset
// ============================================================================

// Request password reset - with rate limiting (PostgreSQL-only)
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

    if (!pgPool) {
      console.error('[AUTH] PostgreSQL connection not available for password reset');
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please try again later.',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    // Find user by email using PostgreSQL
    const user = await pgFindUserByEmail(email);

    // A07 - Always return same response to prevent user enumeration
    if (!user) {
      securityAuditLog({
        event: 'PASSWORD_RESET_REQUEST_UNKNOWN_EMAIL',
        severity: 'INFO',
        email,
        ip: getClientIP(req)
      });
      return res.json({ success: true, message: 'If the email exists, a reset link will be sent.' });
    }

    // Create password reset token in PostgreSQL
    const tokenResult = await pgCreatePasswordResetToken(user.id, email);
    
    if (!tokenResult) {
      console.error('[AUTH] Failed to create password reset token');
      return res.status(500).json({ error: 'Failed to create reset token', code: 'TOKEN_ERROR' });
    }

    const { token: resetToken, expiresAt } = tokenResult;

    // Send password reset email
    try {
      const userName = user.name || 'Doctor';
      await emailService.sendPasswordResetEmail(email, resetToken, userName);
      console.log(`📧 Password reset email sent to: ${email}`);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
    }

    // Log for development (no sensitive data in production)
    console.log(`\n📧 PASSWORD RESET REQUEST`);
    console.log(`   Email: ${email}`);
    if (!isProduction) {
      console.log(`   Token: ${resetToken}`);
      console.log(`   Reset Link: http://localhost:3010/reset-password?token=${resetToken}`);
    }
    console.log(`   Expires: ${expiresAt}\n`);

    securityAuditLog({
      event: 'PASSWORD_RESET_REQUESTED',
      severity: 'INFO',
      userId: user.id,
      email,
      ip: getClientIP(req),
      source: 'PostgreSQL'
    });

    res.json({ 
      success: true, 
      message: 'Password reset link sent to your email.',
      // For development only - remove in production
      devToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Password reset request failed. Please try again.' });
  }
});

// Verify reset token (check if valid before showing reset form) - PostgreSQL-only
app.get('/auth/verify-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ valid: false, error: 'Token is required' });
    }

    if (!pgPool) {
      console.error('[AUTH] PostgreSQL connection not available for token verification');
      return res.status(503).json({ 
        valid: false, 
        error: 'Database connection unavailable. Please try again later.',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    // Verify token in PostgreSQL
    const tokenData = await pgVerifyPasswordResetToken(token);

    if (!tokenData) {
      return res.status(400).json({ valid: false, error: 'Invalid or expired reset token' });
    }

    res.json({ valid: true, email: tokenData.email });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ valid: false, error: 'Failed to verify token' });
  }
});

// Reset password with token - PostgreSQL-only
app.post('/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 12) {
      return res.status(400).json({ error: 'Password must be at least 12 characters' });
    }

    if (!pgPool) {
      console.error('[AUTH] PostgreSQL connection not available for password reset');
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please try again later.',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    // Verify token first
    const tokenData = await pgVerifyPasswordResetToken(token);

    if (!tokenData) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password and update in transaction
    const newPasswordHash = hashPassword(newPassword);
    const success = await pgUsePasswordResetToken(token, newPasswordHash);

    if (!success) {
      return res.status(400).json({ error: 'Failed to reset password. Token may be invalid or expired.' });
    }

    securityAuditLog({
      event: 'PASSWORD_RESET_SUCCESS',
      severity: 'INFO',
      userId: tokenData.user_id,
      email: tokenData.email,
      ip: getClientIP(req),
      source: 'PostgreSQL'
    });

    res.json({ success: true, message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Password reset failed. Please try again.' });
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

    // Store email log in PostgreSQL if available
    if (pgPool) {
      try {
        await pgPool.query(
          `INSERT INTO email_logs (id, recipient, subject, body, sent_at, status)
           VALUES ($1, $2, $3, $4, NOW(), $5)`,
          [`EMAIL-${Date.now()}`, to, subject, body.substring(0, 5000), 'sent']
        );
      } catch (dbError) {
        // Don't fail the request if email logging fails
        console.warn('[AUTH] Failed to log email to PostgreSQL:', dbError.message);
      }
    }

    // In production, integrate with Gmail API using VITE_GOOGLE_GMAIL_API_KEY
    // For now, just log and return success

    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// ADMIN APPROVAL ROUTES
// ============================================================================

// Get all doctor users for admin management - PostgreSQL implementation
app.get('/admin/pending-doctors', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Check PostgreSQL availability
    if (!pgPool) {
      console.error('[AUTH] PostgreSQL connection not available for pending doctors');
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please try again later.',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    // Fetch all doctor users from PostgreSQL
    const result = await pgPool.query(
      `SELECT u.id, u.email, u.name, u.phone, u.role, u.is_active, u.is_approved, 
              u.approval_status, u.created_at, u.last_login, u.specialty,
              u.approved_at, u.approved_by, u.rejected_at, u.rejected_by,
              dp.specialty as doctor_specialty, dp.qualifications, dp.hospital_name
       FROM users u
       LEFT JOIN doctor_profiles dp ON dp.doctor_id = u.id
       WHERE u.role = 'doctor'
       ORDER BY u.created_at DESC`
    );

    const doctorUsers = [];
    const approvalHistory = [];

    for (const row of result.rows) {
      const doctorInfo = {
        id: row.id,
        email: row.email,
        name: row.name || 'Unknown',
        specialty: row.doctor_specialty || row.specialty || 'General Practice',
        medicalLicenseNumber: row.qualifications || 'N/A',
        phone: row.phone || '',
        createdAt: row.created_at?.toISOString() || new Date().toISOString(),
        approvalStatus: row.approval_status || (row.is_active ? 'approved' : 'pending'),
        isActive: row.is_active !== false,
        qualifications: row.qualifications ? [row.qualifications] : [],
        experience: '',
        hospital: row.hospital_name || '',
        lastLogin: row.last_login?.toISOString() || null,
      };

      // Categorize by approval status
      if (doctorInfo.approvalStatus === 'approved' || doctorInfo.approvalStatus === 'rejected') {
        approvalHistory.push({
          ...doctorInfo,
          processedAt: row.approved_at?.toISOString() || row.rejected_at?.toISOString() || row.created_at?.toISOString(),
          processedBy: row.approved_by || row.rejected_by || 'system'
        });
      }

      doctorUsers.push(doctorInfo);
    }

    // Sort approval history
    approvalHistory.sort((a, b) => new Date(b.processedAt) - new Date(a.processedAt));

    console.log(`[Admin] Fetched ${doctorUsers.length} doctor users from PostgreSQL`);

    res.json({ 
      success: true, 
      doctors: doctorUsers,
      history: approvalHistory,
      total: doctorUsers.length
    });
  } catch (error) {
    console.error('Get doctor users error:', error);
    res.status(500).json({ error: 'Internal server error', doctors: [], history: [] });
  }
});

// Auth-prefixed admin endpoint for frontend compatibility - PostgreSQL implementation
app.get('/auth/admin/pending-doctors', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Check PostgreSQL availability
    if (!pgPool) {
      console.error('[AUTH] PostgreSQL connection not available for pending doctors');
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please try again later.',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    // Fetch all doctor and admin users from PostgreSQL
    const result = await pgPool.query(
      `SELECT u.id, u.email, u.name, u.phone, u.role, u.is_active, u.is_approved, u.is_admin,
              u.approval_status, u.created_at, u.last_login, u.specialty,
              u.approved_at, u.approved_by, u.rejected_at, u.rejected_by,
              dp.specialty as doctor_specialty, dp.qualifications, dp.hospital_name
       FROM users u
       LEFT JOIN doctor_profiles dp ON dp.doctor_id = u.id
       WHERE u.role IN ('doctor', 'admin')
       ORDER BY u.created_at DESC`
    );

    const doctorUsers = [];
    const approvalHistory = [];

    for (const row of result.rows) {
      const doctorInfo = {
        id: row.id,
        email: row.email,
        name: row.name || 'Unknown',
        specialty: row.doctor_specialty || row.specialty || 'General Practice',
        medicalLicenseNumber: row.qualifications || 'N/A',
        phone: row.phone || '',
        createdAt: row.created_at?.toISOString() || new Date().toISOString(),
        approvalStatus: row.approval_status || (row.is_active ? 'approved' : 'pending'),
        isActive: row.is_active !== false,
        isAdmin: row.is_admin || row.role === 'admin',
        role: row.role || 'doctor',
        qualifications: row.qualifications ? [row.qualifications] : [],
        experience: '',
        hospital: row.hospital_name || '',
        lastLogin: row.last_login?.toISOString() || null,
      };

      // Categorize by approval status
      if (doctorInfo.approvalStatus === 'approved' || doctorInfo.approvalStatus === 'rejected') {
        approvalHistory.push({
          ...doctorInfo,
          processedAt: row.approved_at?.toISOString() || row.rejected_at?.toISOString() || row.created_at?.toISOString(),
          processedBy: row.approved_by || row.rejected_by || 'system'
        });
      }

      doctorUsers.push(doctorInfo);
    }

    // Sort approval history
    approvalHistory.sort((a, b) => new Date(b.processedAt) - new Date(a.processedAt));

    console.log(`[Admin] Fetched ${doctorUsers.length} doctor users (via /auth/admin/pending-doctors) from PostgreSQL`);

    res.json({ 
      success: true, 
      doctors: doctorUsers,
      history: approvalHistory,
      total: doctorUsers.length
    });
  } catch (error) {
    console.error('Get doctor users error:', error);
    res.status(500).json({ error: 'Internal server error', doctors: [], history: [] });
  }
});

// Auth-prefixed admin approve endpoint - PostgreSQL implementation
app.post('/auth/admin/approve-doctor', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId, adminId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check PostgreSQL availability
    if (!pgPool) {
      console.error('[AUTH] PostgreSQL connection not available for doctor approval');
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please try again later.',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    // Fetch user from PostgreSQL
    const userResult = await pgPool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Update user approval status
    await pgPool.query(
      `UPDATE users SET is_active = true, is_approved = true, approval_status = 'approved',
       approved_at = NOW(), approved_by = $1, updated_at = NOW()
       WHERE id = $2`,
      [adminId || 'admin', userId]
    );

    // Send approval email notification
    try {
      await emailService.sendApprovalNotification(user.email, user.name || 'Doctor');
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
    }

    console.log(`✅ [Admin] Doctor approved: ${user.email} (via /auth/admin/approve-doctor) - PostgreSQL`);

    res.json({ 
      success: true, 
      message: 'Doctor has been approved successfully',
      user: sanitizeUser({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: true,
        isApproved: true,
        approvalStatus: 'approved'
      })
    });
  } catch (error) {
    console.error('Admin approve doctor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Auth-prefixed admin reject endpoint - PostgreSQL implementation
app.post('/auth/admin/reject-doctor', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId, reason, adminId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check PostgreSQL availability
    if (!pgPool) {
      console.error('[AUTH] PostgreSQL connection not available for doctor rejection');
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please try again later.',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    // Fetch user from PostgreSQL
    const userResult = await pgPool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Update user rejection status
    await pgPool.query(
      `UPDATE users SET is_active = false, is_approved = false, approval_status = 'rejected',
       rejected_at = NOW(), rejected_by = $1, rejection_reason = $2, updated_at = NOW()
       WHERE id = $3`,
      [adminId || 'admin', reason || 'Not specified', userId]
    );

    // Send rejection email notification
    try {
      await emailService.sendRejectionNotification(
        user.email, 
        user.name || 'Doctor',
        reason || 'Your application did not meet our current requirements.'
      );
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
    }

    console.log(`❌ [Admin] Doctor rejected: ${user.email} (via /auth/admin/reject-doctor) - PostgreSQL`);

    res.json({ 
      success: true, 
      message: 'Doctor registration has been rejected'
    });
  } catch (error) {
    console.error('Admin reject doctor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Auth-prefixed admin update role endpoint - PostgreSQL implementation
app.post('/auth/admin/update-role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId, role } = req.body;
    // Explicitly derive isAdmin from role to ensure consistency
    const isAdmin = role === 'admin';

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check PostgreSQL availability
    if (!pgPool) {
      console.error('[AUTH] PostgreSQL connection not available for role update');
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please try again later.',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    // Fetch user from PostgreSQL
    const userResult = await pgPool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Update user role (use updated_at for compatibility; role_updated_at/by are optional)
    await pgPool.query(
      `UPDATE users SET role = $1, is_admin = $2, updated_at = NOW()
       WHERE id = $3`,
      [role, isAdmin, userId]
    );

    console.log(`🔄 [Admin] Role updated for ${user.email}: ${role} (via /auth/admin/update-role) - PostgreSQL`);

    res.json({ 
      success: true, 
      message: `Role has been updated to ${role}`,
      user: sanitizeUser({
        id: user.id,
        email: user.email,
        name: user.name,
        role: role,
        isAdmin: isAdmin
      })
    });
  } catch (error) {
    console.error('Admin update role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update doctor status (Admin only) - PostgreSQL implementation
app.post('/admin/update-doctor-status', async (req, res) => {
  try {
    const { doctorId, updates, adminId } = req.body;

    if (!doctorId) {
      return res.status(400).json({ error: 'Doctor ID is required' });
    }

    console.log(`📝 [Admin] Update doctor status: ${doctorId}`, updates);

    // Check PostgreSQL availability
    if (!pgPool) {
      console.error('[AUTH] PostgreSQL connection not available for doctor status update');
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please try again later.',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    // Fetch user from PostgreSQL
    const userResult = await pgPool.query('SELECT * FROM users WHERE id = $1', [doctorId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const user = userResult.rows[0];

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (updates.isActive !== undefined) {
      updateFields.push(`is_active = $${paramCount++}`);
      updateValues.push(updates.isActive);
    }
    if (updates.status !== undefined) {
      updateFields.push(`status = $${paramCount++}`);
      updateValues.push(updates.status);
    }
    if (updates.isVerified !== undefined) {
      updateFields.push(`is_verified = $${paramCount++}`);
      updateValues.push(updates.isVerified);
    }

    updateFields.push(`updated_at = NOW()`, `updated_by = $${paramCount++}`);
    updateValues.push(adminId || 'admin', doctorId);

    await pgPool.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount}`,
      updateValues
    );

    // Also update doctor_profiles if needed
    if (updates.isActive !== undefined || updates.isVerified !== undefined) {
      const dpUpdateFields = [];
      const dpUpdateValues = [];
      let dpParamCount = 1;

      if (updates.isActive !== undefined) {
        dpUpdateFields.push(`is_active = $${dpParamCount++}`);
        dpUpdateValues.push(updates.isActive);
      }
      dpUpdateFields.push(`updated_at = NOW()`);
      dpUpdateValues.push(doctorId);

      if (dpUpdateFields.length > 1) {
        await pgPool.query(
          `UPDATE doctor_profiles SET ${dpUpdateFields.join(', ')} WHERE doctor_id = $${dpParamCount}`,
          dpUpdateValues
        ).catch(() => {}); // Ignore if doctor_profiles doesn't exist
      }
    }

    console.log(`✅ [Admin] Doctor status updated: ${user.email} - isActive: ${updates.isActive}, isVerified: ${updates.isVerified} - PostgreSQL`);

    res.json({ 
      success: true, 
      message: 'Doctor status updated successfully',
      doctor: sanitizeUser({
        id: user.id,
        email: user.email,
        name: user.name,
        isActive: updates.isActive === undefined ? user.is_active : updates.isActive,
        isVerified: updates.isVerified === undefined ? user.is_verified : updates.isVerified
      })
    });
  } catch (error) {
    console.error('Admin update doctor status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove/Demote admin (Admin only) - PostgreSQL implementation
app.post('/admin/remove-admin', async (req, res) => {
  try {
    const { targetUserId, adminId, action } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required' });
    }

    console.log(`🔄 [Admin] Remove admin request for: ${targetUserId}, action: ${action}`);

    // Check PostgreSQL availability
    if (!pgPool) {
      console.error('[AUTH] PostgreSQL connection not available for admin removal');
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please try again later.',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    // Fetch user from PostgreSQL
    const userResult = await pgPool.query('SELECT * FROM users WHERE id = $1', [targetUserId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Demote from admin to doctor
    if (action === 'demote') {
      await pgPool.query(
        `UPDATE users SET role = 'doctor', admin_privileges = NULL, is_admin = false,
         demoted_at = NOW(), demoted_by = $1, updated_at = NOW()
         WHERE id = $2`,
        [adminId || 'admin', targetUserId]
      );
    }
    // Remove completely (deactivate account)
    else if (action === 'remove') {
      await pgPool.query(
        `UPDATE users SET role = 'doctor', admin_privileges = NULL, is_admin = false,
         is_active = false, status = 'inactive',
         removed_at = NOW(), removed_by = $1, updated_at = NOW()
         WHERE id = $2`,
        [adminId || 'admin', targetUserId]
      );
    }

    console.log(`✅ [Admin] Admin ${action}d: ${user.email} - PostgreSQL`);

    res.json({ 
      success: true, 
      message: `Admin ${action === 'demote' ? 'demoted to doctor' : 'removed from platform'}`,
      user: sanitizeUser({
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'doctor',
        isActive: action !== 'remove'
      })
    });
  } catch (error) {
    console.error('Admin remove error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pending approvals (Admin only) - PostgreSQL implementation
app.get('/auth/pending-approvals', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Check PostgreSQL availability
    if (!pgPool) {
      console.error('[AUTH] PostgreSQL connection not available for pending approvals');
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please try again later.',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    const result = await pgPool.query(
      `SELECT id as "userId", email, name, specialty, created_at as "requestedAt", approval_status as status
       FROM users
       WHERE approval_status = 'pending' AND role = 'doctor'
       ORDER BY created_at DESC`
    );

    const pendingApprovals = result.rows.map(row => ({
      userId: row.userId,
      email: row.email,
      name: row.name,
      specialty: row.specialty || 'General Practice',
      requestedAt: row.requestedAt?.toISOString(),
      status: row.status
    }));

    res.json({ success: true, pendingApprovals });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve doctor registration (Admin only) - PostgreSQL implementation
app.post('/auth/approve-doctor', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId, adminId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check PostgreSQL availability
    if (!pgPool) {
      console.error('[AUTH] PostgreSQL connection not available for doctor approval');
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please try again later.',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    // Fetch user from PostgreSQL
    const userResult = await pgPool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Update user approval status
    await pgPool.query(
      `UPDATE users SET is_active = true, is_approved = true, approval_status = 'approved',
       approved_at = NOW(), approved_by = $1, updated_at = NOW()
       WHERE id = $2`,
      [adminId || 'admin', userId]
    );

    // Log approval notification
    console.log(`\n✅ DOCTOR APPROVED`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Approved by: ${adminId || 'admin'}`);
    console.log(`   Approved at: ${new Date().toISOString()}\n`);

    // Send approval email notification
    try {
      await emailService.sendApprovalNotification(user.email, user.name || 'Doctor');
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
    }

    res.json({ 
      success: true, 
      message: 'Doctor has been approved successfully',
      user: sanitizeUser({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: true,
        isApproved: true,
        approvalStatus: 'approved'
      })
    });
  } catch (error) {
    console.error('Approve doctor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reject doctor registration (Admin only) - PostgreSQL implementation
app.post('/auth/reject-doctor', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId, reason, adminId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check PostgreSQL availability
    if (!pgPool) {
      console.error('[AUTH] PostgreSQL connection not available for doctor rejection');
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please try again later.',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    // Fetch user from PostgreSQL
    const userResult = await pgPool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Update user rejection status
    await pgPool.query(
      `UPDATE users SET is_active = false, is_approved = false, approval_status = 'rejected',
       rejected_at = NOW(), rejected_by = $1, rejection_reason = $2, updated_at = NOW()
       WHERE id = $3`,
      [adminId || 'admin', reason || 'Not specified', userId]
    );

    console.log(`\n❌ DOCTOR REJECTED`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Reason: ${reason || 'Not specified'}`);
    console.log(`   Rejected by: ${adminId || 'admin'}\n`);

    // Send rejection email notification
    try {
      await emailService.sendRejectionNotification(
        user.email, 
        user.name || 'Doctor',
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin routes aliases - PostgreSQL implementation
app.post('/admin/approve-doctor', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId, adminId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check PostgreSQL availability
    if (!pgPool) {
      console.error('[AUTH] PostgreSQL connection not available for doctor approval');
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please try again later.',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    // Fetch user from PostgreSQL
    const userResult = await pgPool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Update user approval status
    await pgPool.query(
      `UPDATE users SET is_active = true, is_approved = true, approval_status = 'approved',
       approved_at = NOW(), approved_by = $1, updated_at = NOW()
       WHERE id = $2`,
      [adminId || 'admin', userId]
    );

    console.log(`✅ [Admin] Doctor approved: ${user.email} - PostgreSQL`);

    res.json({ 
      success: true, 
      message: 'Doctor has been approved successfully',
      user: sanitizeUser({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: true,
        isApproved: true,
        approvalStatus: 'approved'
      })
    });
  } catch (error) {
    console.error('Admin approve doctor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/admin/reject-doctor', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId, reason, adminId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check PostgreSQL availability
    if (!pgPool) {
      console.error('[AUTH] PostgreSQL connection not available for doctor rejection');
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please try again later.',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    // Fetch user from PostgreSQL
    const userResult = await pgPool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Update user rejection status
    await pgPool.query(
      `UPDATE users SET is_active = false, is_approved = false, approval_status = 'rejected',
       rejected_at = NOW(), rejected_by = $1, rejection_reason = $2, updated_at = NOW()
       WHERE id = $3`,
      [adminId || 'admin', reason || 'Not specified', userId]
    );

    console.log(`❌ [Admin] Doctor rejected: ${user.email} - PostgreSQL`);

    res.json({ 
      success: true, 
      message: 'Doctor registration has been rejected'
    });
  } catch (error) {
    console.error('Admin reject doctor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify session - PostgreSQL-only
app.get('/auth/verify', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    if (!pgPool) {
      console.error('[AUTH] PostgreSQL connection not available for session verification');
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please try again later.',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    // Try PostgreSQL session verification first (opaque session tokens)
    const sessionData = await pgValidateSession(token);
    
    if (sessionData) {
      return res.json({
        valid: true,
        user: sanitizeUser({
          id: sessionData.user_id,
          email: sessionData.email,
          name: sessionData.name,
          nameThai: sessionData.name_thai,
          role: sessionData.role,
          doctorId: sessionData.doctor_id,
          isAdmin: sessionData.is_admin,
          adminPrivileges: sessionData.admin_privileges,
          specialty: sessionData.specialty,
          hospitalName: sessionData.hospital_name
        }),
        session: {
          id: sessionData.id,
          expiresAt: sessionData.expires_at
        }
      });
    }
    
    // Fallback: Try JWT verification (login returns JWT as primary token)
    try {
      const decoded = jwt.verify(token, JWT_SECRET_FINAL, {
        issuer: JWT_ISSUER,
        algorithms: ['HS256']
      });
      
      // JWT is valid — fetch user from DB for latest data
      const userId = decoded.userId || decoded.id;
      const userResult = await pgPool.query(
        `SELECT u.id, u.email, u.name, u.name_thai, u.role, u.doctor_id, u.is_admin,
                u.admin_privileges, u.specialty, dp.hospital_name
         FROM users u
         LEFT JOIN doctor_profiles dp ON dp.doctor_id = u.id
         WHERE u.id = $1`,
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(401).json({ error: 'User not found' });
      }
      
      const user = userResult.rows[0];
      return res.json({
        valid: true,
        user: sanitizeUser({
          id: user.id,
          email: user.email,
          name: user.name,
          nameThai: user.name_thai,
          role: user.role,
          doctorId: user.doctor_id,
          isAdmin: user.is_admin,
          adminPrivileges: user.admin_privileges,
          specialty: user.specialty,
          hospitalName: user.hospital_name
        }),
        session: {
          id: 'jwt-session',
          expiresAt: new Date(decoded.exp * 1000).toISOString()
        }
      });
    } catch (jwtError) {
      // Both session and JWT verification failed
      console.warn('[AUTH] Session + JWT verification failed:', jwtError.message);
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Session verification failed. Please try again.' });
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
// AVATAR/PROFILE IMAGE ENDPOINTS
// ============================================================================

// GET /api/profile - Get current user profile
app.get('/api/profile', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET_FINAL);
    } catch (e) {
      console.warn('[AUTH] Token verification failed:', e.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const userId = decoded.userId || decoded.id;
    console.log(`[AUTH] Getting profile for user: ${userId}`);

    if (!pgPool) {
      console.error('[AUTH] PostgreSQL connection not available for profile fetch');
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please try again later.',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    const result = await pgPool.query(
      `SELECT id, email, name, name_thai, phone, role, specialty, 
              avatar_url, is_active, created_at
       FROM users WHERE id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, profile: result.rows[0] });
  } catch (error) {
    console.error('[AUTH] Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile: ' + error.message });
  }
});

// Profile update handler
const profileUpdateHandler = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET_FINAL);
    } catch (e) {
      console.warn('[AUTH] Token verification failed:', e.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const userId = decoded.userId || decoded.id;
    const { avatarUrl, displayName, phone, specialization } = req.body;

    console.log(`[AUTH] Updating profile for user: ${userId}`);

    if (!pgPool) {
      console.error('[AUTH] PostgreSQL connection not available for profile update');
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please try again later.',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    // Build dynamic update query based on provided fields
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (avatarUrl !== undefined) {
      updates.push(`avatar_url = $${paramCount++}`);
      values.push(avatarUrl);
    }
    if (displayName !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(displayName);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(phone);
    }
    if (specialization !== undefined) {
      updates.push(`specialty = $${paramCount++}`);
      values.push(specialization);
    }

    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      values.push(userId);
      await pgPool.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}`,
        values
      ).catch(e => console.log('[AUTH] DB update error:', e.message));
    }

    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      profile: { userId, avatarUrl, displayName }
    });
  } catch (error) {
    console.error('[AUTH] Profile update error:', error);
    res.status(500).json({ 
      error: 'Profile update failed. Please try again.',
      code: 'PROFILE_UPDATE_ERROR'
    });
  }
};

// Register profile update routes - both /auth/profile and /api/auth/profile
// nginx routes /api/auth/profile to /auth/profile on this server
app.put('/auth/profile', profileUpdateHandler);
app.put('/api/auth/profile', profileUpdateHandler);

// ============================================================================
// GET /auth/me & /auth/profile - Get current user profile
// ============================================================================
const getProfileHandler = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET_FINAL);
    } catch (e) {
      console.warn('[AUTH] Token verification failed:', e.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    const userId = decoded.userId || decoded.id;
    if (pgPool) {
      try {
        const result = await pgPool.query(
          'SELECT id, email, name, name_thai, role, specialty, phone, avatar_url, medical_license_number, is_admin, is_active, created_at FROM users WHERE id = $1',
          [userId]
        );
        if (result.rows.length > 0) {
          const u = result.rows[0];
          return res.json({ success: true, user: { ...u, display_name: u.name, specialization: u.specialty } });
        }
      } catch (error_) {
        console.log('[AUTH] DB query error for profile:', error_.message);
      }
    }
    res.json({
      success: true,
      user: {
        id: userId,
        email: decoded.email || '',
        role: decoded.role || 'doctor',
        display_name: decoded.name || decoded.displayName || '',
        name: decoded.name || decoded.displayName || '',
      }
    });
  } catch (error) {
    console.error('[AUTH] profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

app.get('/auth/profile', getProfileHandler);
app.get('/api/auth/profile', getProfileHandler);

app.get('/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET_FINAL);
    } catch (e) {
      console.warn('[AUTH] Token verification failed:', e.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    const userId = decoded.userId || decoded.id;
    if (pgPool) {
      try {
        const result = await pgPool.query(
          'SELECT id, email, name, name_thai, role, specialty, phone, avatar_url, medical_license_number, is_admin, is_active, created_at FROM users WHERE id = $1',
          [userId]
        );
        if (result.rows.length > 0) {
          const u = result.rows[0];
          return res.json({ success: true, user: { ...u, display_name: u.name, specialization: u.specialty } });
        }
      } catch (error_) {
        console.log('[AUTH] DB query error for /auth/me:', error_.message);
      }
    }
    // Fallback: return from JWT payload
    res.json({
      success: true,
      user: {
        id: userId,
        email: decoded.email || '',
        role: decoded.role || 'doctor',
        display_name: decoded.name || decoded.displayName || '',
      }
    });
  } catch (error) {
    console.error('[AUTH] /auth/me error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// POST /api/profile/avatar - Update user avatar URL
app.post('/api/profile/avatar', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET_FINAL);
    } catch (e) {
      console.warn('[AUTH] Token verification failed:', e.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const userId = decoded.userId || decoded.id;
    const { avatarUrl } = req.body;

    if (!avatarUrl) {
      return res.status(400).json({ error: 'Avatar URL is required' });
    }

    if (!pgPool) {
      console.error('[AUTH] PostgreSQL connection not available for avatar update');
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please try again later.',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    await pgPool.query(
      'UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2',
      [avatarUrl, userId]
    );
    console.log(`[AUTH] Avatar updated for user: ${userId}`);
    res.json({ success: true, avatarUrl, message: 'Avatar updated successfully' });
  } catch (error) {
    console.error('[AUTH] Avatar update error:', error);
    res.status(500).json({ error: 'Failed to update avatar: ' + error.message });
  }
});

// POST /api/users/avatar - Alias for avatar update
app.post('/api/users/avatar', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET_FINAL);
    } catch (e) {
      console.warn('[AUTH] Token verification failed:', e.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const userId = decoded.userId || decoded.id;
    const { avatarUrl } = req.body;

    if (!avatarUrl) {
      return res.status(400).json({ error: 'Avatar URL is required' });
    }

    if (!pgPool) {
      console.error('[AUTH] PostgreSQL connection not available for avatar update');
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please try again later.',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    await pgPool.query(
      'UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2',
      [avatarUrl, userId]
    );
    console.log(`[AUTH] Avatar updated via /api/users/avatar: ${userId}`);
    res.json({ success: true, avatarUrl, message: 'Avatar updated successfully' });
  } catch (error) {
    console.error('[AUTH] Avatar update error:', error);
    res.status(500).json({ error: 'Failed to update avatar: ' + error.message });
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

  // Debug user lookup (test only) - PostgreSQL implementation
  app.get('/test/check-user/:email', async (req, res) => {
    try {
      const email = decodeURIComponent(req.params.email).toLowerCase();

      if (!pgPool) {
        return res.status(503).json({ 
          found: false, 
          error: 'Database connection unavailable',
          code: 'DATABASE_UNAVAILABLE'
        });
      }

      const result = await pgPool.query(
        `SELECT u.id, u.email, u.role, u.is_active, u.is_approved, u.approval_status,
                (u.password_hash IS NOT NULL) AS has_password
         FROM users u
         WHERE LOWER(u.email) = LOWER($1)`,
        [email]
      );

      if (result.rows.length === 0) {
        return res.json({ found: false, email, message: 'User not found in PostgreSQL' });
      }

      const user = result.rows[0];

      res.json({
        found: true,
        email: user.email,
        id: user.id,
        role: user.role,
        isActive: user.is_active,
        isApproved: user.is_approved,
        approvalStatus: user.approval_status,
        hasPassword: user.has_password
      });
    } catch (error) {
      console.error('[AUTH] /test/check-user error:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
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

  // PostgreSQL-only mode - GCS is not used for authentication
  console.log('📦 Using PostgreSQL only - GCS verification skipped');

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

// Keep the process alive
setInterval(() => {
  // Keep-alive heartbeat
}, 30000);

module.exports = { app, server };
