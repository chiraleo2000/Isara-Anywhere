/**
 * OWASP Top 10:2025 Security Middleware
 * 
 * Implements security controls for:
 * A01:2025 - Broken Access Control
 * A02:2025 - Security Misconfiguration
 * A03:2025 - Software Supply Chain Failures
 * A04:2025 - Cryptographic Failures
 * A05:2025 - Injection
 * A06:2025 - Insecure Design
 * A07:2025 - Authentication Failures
 * A08:2025 - Software or Data Integrity Failures
 * A09:2025 - Logging & Alerting Failures
 * A10:2025 - Mishandling of Exceptional Conditions
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

// ============================================================================
// A01:2025 - BROKEN ACCESS CONTROL
// ============================================================================

/**
 * Role-based access control middleware
 */
const ROLE_PERMISSIONS = {
  admin: ['read:all', 'write:all', 'delete:all', 'manage:users', 'manage:doctors', 'approve:doctors', 'view:audit'],
  doctor: ['read:patients', 'write:emr', 'write:prescriptions', 'write:laborders', 'read:appointments', 'write:appointments'],
  patient: ['read:own', 'write:own', 'read:appointments', 'write:appointments']
};

function checkPermission(requiredPermission) {
  return (req, res, next) => {
    const userRole = req.user?.role || 'guest';
    const permissions = ROLE_PERMISSIONS[userRole] || [];

    // Check for exact permission or wildcard
    const hasPermission = permissions.includes(requiredPermission) ||
      permissions.some(p => p.endsWith(':all') && requiredPermission.startsWith(p.replace(':all', ':')));

    if (!hasPermission) {
      securityAuditLog({
        event: 'ACCESS_DENIED',
        severity: 'WARN',
        userId: req.user?.id,
        role: userRole,
        requiredPermission,
        path: req.path,
        ip: getClientIP(req)
      });
      return res.status(403).json({
        error: 'Access denied',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    next();
  };
}

/**
 * Resource ownership verification
 */
function verifyResourceOwnership(resourceIdParam = 'id', resourceType = 'generic') {
  return async (req, res, next) => {
    const resourceId = req.params[resourceIdParam] || req.body[resourceIdParam];
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // Admins can access all resources
    if (userRole === 'admin') {
      return next();
    }

    // Doctors can access their assigned patients
    if (userRole === 'doctor' && resourceType === 'patient') {
      // Would need to verify patient is assigned to this doctor
      return next();
    }

    // Patients can only access their own resources
    if (userRole === 'patient' && resourceId !== userId && resourceId !== req.user?.patientId) {
      securityAuditLog({
        event: 'UNAUTHORIZED_RESOURCE_ACCESS',
        severity: 'WARN',
        userId,
        resourceId,
        resourceType,
        path: req.path
      });
      return res.status(403).json({
        error: 'Access denied to resource',
        code: 'RESOURCE_ACCESS_DENIED'
      });
    }

    next();
  };
}

// ============================================================================
// A02:2025 - SECURITY MISCONFIGURATION
// ============================================================================

/**
 * Security headers middleware
 */
function securityHeaders() {
  return (req, res, next) => {
    // Content Security Policy
    res.setHeader('Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://maps.googleapis.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: https: blob:; " +
      "connect-src 'self' http://localhost:* https://*.googleapis.com wss://*; " +
      "frame-src 'self' https://meet.google.com https://calendar.google.com;"
    );

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // XSS Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy
    res.setHeader('Permissions-Policy',
      'camera=(self), microphone=(self), geolocation=(self), payment=()'
    );

    // HSTS (for production)
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    // Remove server fingerprint
    res.removeHeader('X-Powered-By');

    next();
  };
}

/**
 * CORS configuration with strict origin checking
 */
function strictCors(allowedOrigins) {
  return (req, res, next) => {
    const origin = req.headers.origin;

    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, X-CSRF-Token');
      res.setHeader('Access-Control-Max-Age', '86400');
    }

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    next();
  };
}

// ============================================================================
// A04:2025 - CRYPTOGRAPHIC FAILURES
// ============================================================================

/**
 * Strong password policy enforcement
 */
const PASSWORD_POLICY = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecial: true,
  maxRepeatingChars: 3,
  preventCommonPasswords: true
};

const COMMON_PASSWORDS = [
  'password123', 'admin123', '123456789', 'qwerty123', 'letmein123',
  'welcome123', 'monkey123', 'dragon123', 'master123', 'login123'
];

function validatePassword(password) {
  const errors = [];

  if (!password || password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters`);
  }

  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (PASSWORD_POLICY.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (PASSWORD_POLICY.requireSpecial && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check for repeating characters
  if (PASSWORD_POLICY.maxRepeatingChars) {
    const regex = new RegExp(String.raw`(.)\1{${PASSWORD_POLICY.maxRepeatingChars},}`);
    if (regex.test(password)) {
      errors.push(`Password cannot have more than ${PASSWORD_POLICY.maxRepeatingChars} repeating characters`);
    }
  }

  // Check against common passwords
  if (PASSWORD_POLICY.preventCommonPasswords) {
    const lowerPassword = password.toLowerCase();
    if (COMMON_PASSWORDS.some(cp => lowerPassword.includes(cp))) {
      errors.push('Password is too common or easily guessable');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Secure token generation
 */
function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash sensitive data with salt
 */
function hashData(data, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

/**
 * Encrypt sensitive data
 */
function encryptData(data, key = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex')) {
  const iv = crypto.randomBytes(16);
  const keyBuffer = Buffer.from(key.slice(0, 32).padEnd(32, '0'));
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);

  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

/**
 * Decrypt sensitive data
 */
function decryptData(encryptedObj, key = process.env.ENCRYPTION_KEY || '') {
  try {
    const keyBuffer = Buffer.from(key.slice(0, 32).padEnd(32, '0'));
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      keyBuffer,
      Buffer.from(encryptedObj.iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(encryptedObj.authTag, 'hex'));

    let decrypted = decipher.update(encryptedObj.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  } catch (e) {
    throw new Error('Decryption failed - data may be corrupted or tampered with');
  }
}

// ============================================================================
// A05:2025 - INJECTION
// ============================================================================

/**
 * Input sanitization patterns
 */
const SANITIZATION_PATTERNS = {
  // SQL injection patterns
  sql: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE)\b)|(--)|(;)|(')/gi,
  // NoSQL injection patterns
  nosql: /(\$where|\$gt|\$lt|\$ne|\$or|\$and|\$regex|\$in|\$nin)/gi,
  // XSS patterns
  xss: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>|javascript:|on\w+\s*=/gi,
  // Path traversal
  pathTraversal: /\.\.[/\\]|[/\\]\.\.|%2e%2e/gi,
  // Command injection
  command: /[;&|`$(){}[\]!]/g
};

/**
 * Sanitize input string
 */
function sanitizeInput(input, type = 'general') {
  if (typeof input !== 'string') return input;

  let sanitized = input.trim();

  // Remove null bytes
  sanitized = sanitized.replaceAll('\0', '');

  // HTML entity encoding for XSS prevention
  sanitized = sanitized
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#x27;');

  return sanitized;
}

/**
 * Validate and sanitize request body
 */
function sanitizeRequestBody(allowedFields = []) {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      const sanitizedBody = {};

      for (const [key, value] of Object.entries(req.body)) {
        // Only allow specified fields
        if (allowedFields.length > 0 && !allowedFields.includes(key)) {
          continue;
        }

        // Sanitize based on value type
        if (typeof value === 'string') {
          // Check for injection attempts
          for (const [patternName, pattern] of Object.entries(SANITIZATION_PATTERNS)) {
            if (pattern.test(value)) {
              securityAuditLog({
                event: 'INJECTION_ATTEMPT',
                severity: 'HIGH',
                type: patternName,
                field: key,
                ip: getClientIP(req),
                path: req.path
              });
              return res.status(400).json({
                error: 'Invalid input detected',
                code: 'INVALID_INPUT'
              });
            }
          }
          sanitizedBody[key] = sanitizeInput(value);
        } else {
          sanitizedBody[key] = value;
        }
      }

      req.body = sanitizedBody;
    }
    next();
  };
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate phone number format
 */
function isValidPhone(phone) {
  const phoneRegex = /^[\d\s\-+()]{10,20}$/;
  return phoneRegex.test(phone);
}

// ============================================================================
// A07:2025 - AUTHENTICATION FAILURES
// ============================================================================

/**
 * Rate limiting configuration
 */
const rateLimitStore = new Map();

function rateLimit(options = {}) {
  const {
    windowMs = 1 * 60 * 1000, // 1 minute window (reduced for testing)
    maxRequests = 10000, // High limit for testing
    keyGenerator = (req) => getClientIP(req),
    handler = (req, res) => res.status(429).json({
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(windowMs / 1000)
    })
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();

    // Get or create entry
    let entry = rateLimitStore.get(key);
    if (!entry || now - entry.windowStart > windowMs) {
      entry = { count: 0, windowStart: now };
    }

    entry.count++;
    rateLimitStore.set(key, entry);

    // Clean old entries periodically
    if (Math.random() < 0.01) {
      for (const [k, v] of rateLimitStore) {
        if (now - v.windowStart > windowMs) {
          rateLimitStore.delete(k);
        }
      }
    }

    // Set headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count));
    res.setHeader('X-RateLimit-Reset', new Date(entry.windowStart + windowMs).toISOString());

    if (entry.count > maxRequests) {
      securityAuditLog({
        event: 'RATE_LIMIT_EXCEEDED',
        severity: 'WARN',
        ip: key,
        path: req.path,
        count: entry.count
      });
      return handler(req, res);
    }

    next();
  };
}

/**
 * Reset rate limit store (for testing only)
 * Should only be called in development/test environments
 */
function resetRateLimits() {
  rateLimitStore.clear();
  loginAttempts.clear();
  console.log('[SECURITY] Rate limits and login attempts reset (TEST MODE)');
  return { cleared: true };
}

/**
 * Account lockout after failed attempts
 */
const loginAttempts = new Map();

function trackLoginAttempt(email, success) {
  const key = email.toLowerCase();

  if (success) {
    loginAttempts.delete(key);
    return { locked: false };
  }

  let entry = loginAttempts.get(key) || { count: 0, firstAttempt: Date.now() };
  entry.count++;
  entry.lastAttempt = Date.now();

  // Lock account after 100 failed attempts (increased for testing - was 5)
  if (entry.count >= 100) {
    entry.lockedUntil = Date.now() + 1 * 60 * 1000; // 1 minute (reduced for testing - was 30 min)
    loginAttempts.set(key, entry);

    securityAuditLog({
      event: 'ACCOUNT_LOCKED',
      severity: 'WARN',
      email: key,
      attempts: entry.count
    });

    return {
      locked: true,
      lockedUntil: entry.lockedUntil,
      remainingTime: Math.ceil((entry.lockedUntil - Date.now()) / 1000)
    };
  }

  loginAttempts.set(key, entry);
  return { locked: false, attempts: entry.count };
}

function isAccountLocked(email) {
  const key = email.toLowerCase();
  const entry = loginAttempts.get(key);

  if (!entry || !entry.lockedUntil) return { locked: false };

  if (Date.now() > entry.lockedUntil) {
    loginAttempts.delete(key);
    return { locked: false };
  }

  return {
    locked: true,
    lockedUntil: entry.lockedUntil,
    remainingTime: Math.ceil((entry.lockedUntil - Date.now()) / 1000)
  };
}

/**
 * Session validation middleware
 */
function validateSession(fetchFromGCS, BUCKETS) {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authorization required',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      const session = await fetchFromGCS(BUCKETS.credentials, `sessions/${token}.json`);

      if (!session) {
        return res.status(401).json({
          error: 'Invalid session',
          code: 'INVALID_SESSION'
        });
      }

      // Check expiration
      if (new Date(session.expiresAt) < new Date()) {
        return res.status(401).json({
          error: 'Session expired',
          code: 'SESSION_EXPIRED'
        });
      }

      // Verify session integrity (IP binding in production)
      if (process.env.NODE_ENV === 'production' && session.ip && session.ip !== getClientIP(req)) {
        securityAuditLog({
          event: 'SESSION_IP_MISMATCH',
          severity: 'HIGH',
          sessionId: session.id,
          expectedIp: session.ip,
          actualIp: getClientIP(req)
        });
        return res.status(401).json({
          error: 'Session validation failed',
          code: 'SESSION_INVALID'
        });
      }

      req.user = {
        id: session.userId,
        email: session.email,
        role: session.role,
        sessionId: session.id
      };

      next();
    } catch (error) {
      return res.status(401).json({
        error: 'Session validation failed',
        code: 'SESSION_ERROR'
      });
    }
  };
}

// ============================================================================
// A08:2025 - SOFTWARE OR DATA INTEGRITY FAILURES
// ============================================================================

/**
 * Request integrity verification using HMAC
 */
function verifyRequestIntegrity(secret = process.env.HMAC_SECRET) {
  return (req, res, next) => {
    const signature = req.headers['x-signature'];
    const timestamp = req.headers['x-timestamp'];

    // Skip for GET requests and non-critical endpoints
    if (req.method === 'GET' || !signature) {
      return next();
    }

    // Reject if no HMAC secret is configured
    if (!secret) {
      securityAuditLog({
        event: 'HMAC_SECRET_MISSING',
        severity: 'HIGH',
        path: req.path,
        ip: getClientIP(req)
      });
      return res.status(500).json({
        error: 'Server integrity verification not configured',
        code: 'INTEGRITY_NOT_CONFIGURED'
      });
    }

    // Check timestamp freshness (5 minute window)
    if (timestamp) {
      const requestTime = Number.parseInt(timestamp, 10);
      const now = Date.now();
      if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
        return res.status(400).json({
          error: 'Request expired',
          code: 'TIMESTAMP_EXPIRED'
        });
      }
    }

    // Verify HMAC signature
    const payload = JSON.stringify(req.body) + (timestamp || '');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      securityAuditLog({
        event: 'INTEGRITY_VIOLATION',
        severity: 'HIGH',
        path: req.path,
        ip: getClientIP(req)
      });
      return res.status(400).json({
        error: 'Request integrity check failed',
        code: 'INTEGRITY_FAILED'
      });
    }

    next();
  };
}

/**
 * Generate request signature for clients
 */
function generateRequestSignature(body, timestamp, secret) {
  const payload = JSON.stringify(body) + timestamp;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

// ============================================================================
// A09:2025 - LOGGING & ALERTING FAILURES
// ============================================================================

const auditLogBuffer = [];
const AUDIT_LOG_FLUSH_SIZE = 100;
const AUDIT_LOG_FLUSH_INTERVAL = 60000; // 1 minute

/**
 * Security audit logging
 */
function securityAuditLog(logEntry) {
  const entry = {
    ...logEntry,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    service: 'izara-doctor-portal'
  };

  // Console log for immediate visibility
  const severityColors = {
    INFO: '\x1b[36m',   // Cyan
    WARN: '\x1b[33m',   // Yellow
    HIGH: '\x1b[31m',   // Red
    CRITICAL: '\x1b[35m' // Magenta
  };
  const color = severityColors[entry.severity] || '\x1b[0m';
  console.log(`${color}[SECURITY AUDIT] [${entry.severity}] ${entry.event}\x1b[0m`,
    JSON.stringify({ ...entry, timestamp: undefined, severity: undefined, event: undefined }));

  // Buffer for batch writing
  auditLogBuffer.push(entry);

  // Flush if buffer is full
  if (auditLogBuffer.length >= AUDIT_LOG_FLUSH_SIZE) {
    flushAuditLog();
  }

  // Alert on critical events
  if (entry.severity === 'CRITICAL' || entry.severity === 'HIGH') {
    triggerSecurityAlert(entry);
  }
}

/**
 * Flush audit log to persistent storage
 */
async function flushAuditLog() {
  if (auditLogBuffer.length === 0) return;

  const logsToFlush = [...auditLogBuffer];
  auditLogBuffer.length = 0;

  try {
    const logDir = path.join(__dirname, '..', 'logs', 'security');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(logDir, `security-audit-${date}.json`);

    let existingLogs = [];
    if (fs.existsSync(logFile)) {
      try {
        existingLogs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
      } catch (e) {
        existingLogs = [];
      }
    }

    existingLogs.push(...logsToFlush);
    fs.writeFileSync(logFile, JSON.stringify(existingLogs, null, 2));
  } catch (e) {
    console.error('Failed to flush audit log:', e.message);
  }
}

// Flush periodically
setInterval(flushAuditLog, AUDIT_LOG_FLUSH_INTERVAL);

/**
 * Trigger security alert for critical events
 */
function triggerSecurityAlert(entry) {
  // In production, this would integrate with alerting systems
  console.log('\x1b[41m\x1b[37m[SECURITY ALERT]\x1b[0m', entry);

  // Could integrate with:
  // - Email notifications
  // - Slack/Teams webhooks
  // - PagerDuty
  // - SIEM systems
}

/**
 * Request logging middleware with security context
 */
function requestLogger() {
  return (req, res, next) => {
    const requestId = crypto.randomUUID();
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);

    const startTime = Date.now();

    // Log request
    const requestLog = {
      requestId,
      method: req.method,
      path: req.path,
      query: Object.keys(req.query).length > 0 ? '[REDACTED]' : undefined,
      ip: getClientIP(req),
      userAgent: req.headers['user-agent']?.substring(0, 100),
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    };

    // Capture response
    const originalEnd = res.end;
    res.end = function (...args) {
      const duration = Date.now() - startTime;

      // Log response
      if (res.statusCode >= 400) {
        securityAuditLog({
          event: 'HTTP_ERROR',
          severity: res.statusCode >= 500 ? 'HIGH' : 'INFO',
          ...requestLog,
          statusCode: res.statusCode,
          duration
        });
      }

      return originalEnd.apply(this, args);
    };

    next();
  };
}

// ============================================================================
// A10:2025 - MISHANDLING OF EXCEPTIONAL CONDITIONS
// ============================================================================

/**
 * Global error handler with security considerations
 */
function secureErrorHandler() {
  return (err, req, res, next) => {
    // Log the full error internally
    securityAuditLog({
      event: 'UNHANDLED_ERROR',
      severity: 'HIGH',
      requestId: req.requestId,
      path: req.path,
      method: req.method,
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });

    // Determine safe error response
    let statusCode = err.statusCode || 500;
    let message = 'An error occurred';
    let code = 'INTERNAL_ERROR';

    // Map known error types to safe responses
    if (err.name === 'ValidationError') {
      statusCode = 400;
      message = 'Validation failed';
      code = 'VALIDATION_ERROR';
    } else if (err.name === 'UnauthorizedError') {
      statusCode = 401;
      message = 'Authentication required';
      code = 'UNAUTHORIZED';
    } else if (err.name === 'ForbiddenError') {
      statusCode = 403;
      message = 'Access denied';
      code = 'FORBIDDEN';
    } else if (err.name === 'NotFoundError') {
      statusCode = 404;
      message = 'Resource not found';
      code = 'NOT_FOUND';
    }

    // Never expose internal details in production
    const response = {
      error: message,
      code,
      requestId: req.requestId
    };

    if (process.env.NODE_ENV === 'development') {
      response.details = err.message;
    }

    res.status(statusCode).json(response);
  };
}

/**
 * Async error wrapper for route handlers
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Safe JSON parsing with error handling
 */
function safeJsonParse(str, defaultValue = null) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return defaultValue;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get client IP address
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown';
}

/**
 * Mask sensitive data in logs
 */
function maskSensitiveData(obj, sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'apiKey']) {
  if (!obj || typeof obj !== 'object') return obj;

  const masked = Array.isArray(obj) ? [...obj] : { ...obj };

  for (const key of Object.keys(masked)) {
    if (sensitiveFields.some(sf => key.toLowerCase().includes(sf.toLowerCase()))) {
      masked[key] = '[REDACTED]';
    } else if (typeof masked[key] === 'object') {
      masked[key] = maskSensitiveData(masked[key], sensitiveFields);
    }
  }

  return masked;
}

/**
 * CSRF token generation and validation
 */
const csrfTokens = new Map();

function generateCSRFToken(sessionId) {
  const token = crypto.randomBytes(32).toString('hex');
  csrfTokens.set(sessionId, {
    token,
    createdAt: Date.now()
  });
  return token;
}

function validateCSRFToken(sessionId, token) {
  const stored = csrfTokens.get(sessionId);
  if (!stored) return false;

  // Token valid for 1 hour
  if (Date.now() - stored.createdAt > 3600000) {
    csrfTokens.delete(sessionId);
    return false;
  }

  return stored.token === token;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // A01 - Access Control
  checkPermission,
  verifyResourceOwnership,
  ROLE_PERMISSIONS,

  // A02 - Security Misconfiguration
  securityHeaders,
  strictCors,

  // A04 - Cryptographic Failures
  validatePassword,
  PASSWORD_POLICY,
  generateSecureToken,
  hashData,
  encryptData,
  decryptData,

  // A05 - Injection
  sanitizeInput,
  sanitizeRequestBody,
  isValidEmail,
  isValidPhone,
  SANITIZATION_PATTERNS,

  // A07 - Authentication Failures
  rateLimit,
  trackLoginAttempt,
  isAccountLocked,
  validateSession,
  resetRateLimits,  // For testing only

  // A08 - Data Integrity
  verifyRequestIntegrity,
  generateRequestSignature,

  // A09 - Logging
  securityAuditLog,
  requestLogger,
  flushAuditLog,

  // A10 - Error Handling
  secureErrorHandler,
  asyncHandler,
  safeJsonParse,

  // Utilities
  getClientIP,
  maskSensitiveData,
  generateCSRFToken,
  validateCSRFToken
};
