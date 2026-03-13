/**
 * OWASP Top 10:2025 Security Middleware for Patient Portal
 * TypeScript version
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface User {
  id: string;
  email: string;
  role: 'admin' | 'doctor' | 'patient';
  patientId?: string;
  sessionId?: string;
}

interface AuditLogEntry {
  event: string;
  severity: 'INFO' | 'WARN' | 'HIGH' | 'CRITICAL';
  timestamp?: string;
  userId?: string;
  ip?: string;
  path?: string;
  [key: string]: any;
}

interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (req: Request) => string;
  handler?: (req: Request, res: Response) => void;
}

interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: User;
    }
  }
}

// ============================================================================
// A01:2025 - BROKEN ACCESS CONTROL
// ============================================================================

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['read:all', 'write:all', 'delete:all', 'manage:users', 'view:audit'],
  doctor: ['read:patients', 'write:emr', 'read:appointments', 'write:appointments'],
  patient: ['read:own', 'write:own', 'read:appointments', 'write:appointments', 'read:phr', 'write:phr']
};

export function checkPermission(requiredPermission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role || 'guest';
    const permissions = ROLE_PERMISSIONS[userRole] || [];
    
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

export function verifyResourceOwnership(resourceIdParam = 'id') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const resourceId = req.params[resourceIdParam] || req.body[resourceIdParam];
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    // Admins and doctors can access all patient resources
    if (userRole === 'admin' || userRole === 'doctor') {
      return next();
    }
    
    // Patients can only access their own resources
    if (userRole === 'patient' && resourceId !== userId && resourceId !== req.user?.patientId) {
      securityAuditLog({
        event: 'UNAUTHORIZED_RESOURCE_ACCESS',
        severity: 'WARN',
        userId,
        resourceId,
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

export function securityHeaders() {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Content-Security-Policy', 
      "default-src 'self' https:; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://maps.googleapis.com https://accounts.google.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: https: blob:; " +
      "connect-src 'self' http://localhost:* https://*.googleapis.com https://maps.googleapis.com; " +
      "frame-src 'self' https://meet.google.com https://accounts.google.com;"
    );
    
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(self)');
    
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    res.removeHeader('X-Powered-By');
    next();
  };
}

// ============================================================================
// A04:2025 - CRYPTOGRAPHIC FAILURES
// ============================================================================

const PASSWORD_POLICY = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecial: true,
  maxRepeatingChars: 3
};

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  
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
  
  if (PASSWORD_POLICY.requireSpecial && !/[!@#$%^&*()\-_=+{};':"\\|,.<>?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return { valid: errors.length === 0, errors };
}

export function generateSecureToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

export function hashPassword(password: string): string {
  // PBKDF2 with 600,000 iterations per OWASP 2024 password storage cheat sheet
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 600000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPasswordHash(password: string, storedHash: string): boolean {
  if (!storedHash?.includes(':')) {
    // Reject plain/base64 passwords — require migration to PBKDF2
    return false;
  }
  
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  // Use timing-safe comparison to prevent timing attacks
  const verifyHash = crypto.pbkdf2Sync(password, salt, 600000, 64, 'sha512').toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
  } catch {
    return false;
  }
}

// ============================================================================
// A05:2025 - INJECTION
// ============================================================================

const SANITIZATION_PATTERNS = {
  sql: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)|(--)|(;)|(')/gi,
  nosql: /(\$where|\$gt|\$lt|\$ne|\$or|\$and|\$regex)/gi,
  xss: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>|javascript:|on\w+\s*=/gi,
  pathTraversal: /\.\.[\\/]|[\\/]\.\./gi
};

export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return input;
  
  return input.trim()
    .replaceAll('\0', '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#x27;');
}

// Helper: check a string value for injection patterns
function detectInjection(value: string, key: string, req: Request): string | null {
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
      return patternName;
    }
  }
  return null;
}

export function sanitizeRequestBody(allowedFields: string[] = []) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.body || typeof req.body !== 'object') {
      return next();
    }

    const sanitizedBody: Record<string, any> = {};
    for (const [key, value] of Object.entries(req.body)) {
      if (allowedFields.length > 0 && !allowedFields.includes(key)) continue;

      if (typeof value === 'string') {
        const injectionType = detectInjection(value, key, req);
        if (injectionType) {
          return res.status(400).json({ error: 'Invalid input detected', code: 'INVALID_INPUT' });
        }
        sanitizedBody[key] = sanitizeInput(value);
      } else {
        sanitizedBody[key] = value;
      }
    }
    req.body = sanitizedBody;
    next();
  };
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-+()]{10,20}$/;
  return phoneRegex.test(phone);
}

// ============================================================================
// A07:2025 - AUTHENTICATION FAILURES
// ============================================================================

const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

// Periodic cleanup of stale rate-limit entries to prevent memory leaks
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart > 120_000) rateLimitStore.delete(key);
  }
}, 60_000);
// Prevent timer from keeping the process alive (Node.js only)
(cleanupTimer as unknown as { unref?: () => void }).unref?.();

export function rateLimit(options: RateLimitOptions = {}) {
  const {
    windowMs = 1 * 60 * 1000, // 1 minute window (reduced for testing)
    maxRequests = 10000, // High limit for testing
    keyGenerator = (req) => getClientIP(req),
    handler = (req, res) => res.status(429).json({
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED'
    })
  } = options;
  
  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    let entry = rateLimitStore.get(key);
    if (!entry || now - entry.windowStart > windowMs) {
      entry = { count: 0, windowStart: now };
    }
    
    entry.count++;
    rateLimitStore.set(key, entry);
    
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count).toString());
    
    if (entry.count > maxRequests) {
      securityAuditLog({
        event: 'RATE_LIMIT_EXCEEDED',
        severity: 'WARN',
        ip: key,
        path: req.path
      });
      return handler(req, res);
    }
    
    next();
  };
}

const loginAttempts = new Map<string, { count: number; lockedUntil?: number }>();

export function trackLoginAttempt(email: string, success: boolean) {
  const key = email.toLowerCase();
  
  if (success) {
    loginAttempts.delete(key);
    return { locked: false };
  }
  
  let entry = loginAttempts.get(key) || { count: 0 };
  entry.count++;
  
  if (entry.count >= 100) { // Increased from 5 for testing
    entry.lockedUntil = Date.now() + 1 * 60 * 1000; // 1 minute lockout (reduced for testing)
    securityAuditLog({
      event: 'ACCOUNT_LOCKED',
      severity: 'WARN',
      email: key,
      attempts: entry.count
    });
  }
  
  loginAttempts.set(key, entry);
  return {
    locked: entry.count >= 5,
    lockedUntil: entry.lockedUntil
  };
}

export function isAccountLocked(email: string): { locked: boolean; remainingTime?: number } {
  const entry = loginAttempts.get(email.toLowerCase());
  
  if (!entry?.lockedUntil) return { locked: false };
  
  if (Date.now() > entry.lockedUntil) {
    loginAttempts.delete(email.toLowerCase());
    return { locked: false };
  }
  
  return {
    locked: true,
    remainingTime: Math.ceil((entry.lockedUntil - Date.now()) / 1000)
  };
}

// ============================================================================
// A09:2025 - LOGGING & ALERTING FAILURES
// ============================================================================

const auditLogBuffer: AuditLogEntry[] = [];

export function securityAuditLog(entry: AuditLogEntry): void {
  const fullEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
    service: 'izara-patient-portal'
  };
  
  const severityColors: Record<string, string> = {
    INFO: '\x1b[36m',
    WARN: '\x1b[33m',
    HIGH: '\x1b[31m',
    CRITICAL: '\x1b[35m'
  };
  
  const color = severityColors[entry.severity] || '\x1b[0m';
  console.log(`${color}[SECURITY AUDIT] [${entry.severity}] ${entry.event}\x1b[0m`);
  
  auditLogBuffer.push(fullEntry);
  
  if (auditLogBuffer.length >= 100) {
    flushAuditLog();
  }
}

export async function flushAuditLog(): Promise<void> {
  if (auditLogBuffer.length === 0) return;
  
  const logsToFlush = [...auditLogBuffer];
  auditLogBuffer.length = 0;
  
  try {
    const logDir = './logs/security';
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(logDir, `patient-portal-audit-${date}.json`);
    
    let existingLogs: AuditLogEntry[] = [];
    if (fs.existsSync(logFile)) {
      existingLogs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    }
    
    existingLogs.push(...logsToFlush);
    fs.writeFileSync(logFile, JSON.stringify(existingLogs, null, 2));
  } catch (e) {
    console.error('Failed to flush audit log:', e instanceof Error ? e.message : 'unknown error');
  }
}

export function requestLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    req.requestId = crypto.randomUUID();
    res.setHeader('X-Request-ID', req.requestId);
    next();
  };
}

// ============================================================================
// A10:2025 - MISHANDLING OF EXCEPTIONAL CONDITIONS
// ============================================================================

export function secureErrorHandler() {
  return (err: Error & { statusCode?: number }, req: Request, res: Response, next: NextFunction) => {
    securityAuditLog({
      event: 'UNHANDLED_ERROR',
      severity: 'HIGH',
      requestId: req.requestId,
      path: req.path,
      error: err.message
    });
    
    const statusCode = err.statusCode || 500;
    const response: Record<string, any> = {
      error: statusCode === 500 ? 'An error occurred' : err.message,
      code: 'ERROR',
      requestId: req.requestId
    };
    
    if (process.env.NODE_ENV === 'development') {
      response.details = err.message;
    }
    
    res.status(statusCode).json(response);
  };
}

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

export function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  return req.socket?.remoteAddress || 'unknown';
}

export function maskSensitiveData<T extends object>(obj: T, sensitiveFields = ['password', 'passwordHash', 'token']): T {
  if (!obj || typeof obj !== 'object') return obj;
  
  const masked = { ...obj } as any;
  
  for (const key of Object.keys(masked)) {
    if (sensitiveFields.some(sf => key.toLowerCase().includes(sf.toLowerCase()))) {
      masked[key] = '[REDACTED]';
    } else if (typeof masked[key] === 'object' && masked[key] !== null) {
      masked[key] = maskSensitiveData(masked[key], sensitiveFields);
    }
  }
  
  return masked;
}

// Export all
export {
  ROLE_PERMISSIONS,
  PASSWORD_POLICY,
  SANITIZATION_PATTERNS
};
