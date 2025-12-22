# Izara Telehealth - Security

## Overview

Security implemented following OWASP guidelines across all services.

---

## 🔐 Authentication

### Password Policy

| Requirement | Rule |
|-------------|------|
| Minimum length | 8 characters |
| Uppercase | At least 1 |
| Lowercase | At least 1 |
| Number | At least 1 |
| Special char | At least 1 (@$!%*?&) |
| Hashing | bcrypt (10 rounds) |

### Session Management

| Property | Value |
|----------|-------|
| Token type | Random 64 hex chars |
| Expiration | 24 hours |
| Storage | Server-side (GCS) |
| Validation | Every request |

---

## 🛡️ Rate Limiting

### Login Attempts

```
Limit: 10 attempts per 15 minutes per IP
After 5 failed attempts: Account locked 30 minutes
After lockout: Reset on successful login
```

### API Requests

```
General: 100 requests per minute per IP
Auth endpoints: 10 requests per 15 minutes per IP
```

---

## 🔒 Security Headers (Helmet)

```javascript
// Applied to all responses
{
  "Content-Security-Policy": "default-src 'self'",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=31536000",
  "Referrer-Policy": "strict-origin-when-cross-origin"
}
```

---

## 🌐 CORS Configuration

```javascript
// Allowed origins
const allowedOrigins = [
  'http://localhost:5173',  // Doctor Portal
  'http://localhost:5174',  // Patient Portal
  'http://localhost:3000',  // Patient API
  'http://localhost:3011',  // Auth Server
  'http://localhost:3012'   // GCS API
];

// Allowed methods
methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']

// Allowed headers
headers: ['Content-Type', 'Authorization']

// Credentials
credentials: true
```

---

## 🔍 Input Validation

### XSS Prevention

```javascript
// All inputs sanitized
- HTML entities escaped
- Script tags removed
- Event handlers stripped
- Data URLs blocked
```

### SQL/NoSQL Injection

```javascript
// JSON storage prevents SQL injection
// Object keys validated against allowlist
// Special characters escaped
```

### Input Sanitization

```javascript
// Applied to all string inputs
- Trim whitespace
- Remove null bytes
- Encode special characters
- Validate against schema
```

---

## 📝 Audit Logging

### Events Logged

| Event | Severity | Data |
|-------|----------|------|
| LOGIN_SUCCESS | INFO | userId, IP, timestamp |
| LOGIN_FAILURE | WARNING | email, IP, reason |
| LOGIN_ATTEMPT_BLOCKED | HIGH | IP, attempts |
| ACCOUNT_LOCKED | HIGH | userId, duration |
| PASSWORD_CHANGED | HIGH | userId, timestamp |
| USER_ROLE_CHANGED | CRITICAL | userId, oldRole, newRole |
| SESSION_INVALIDATED | INFO | sessionId, reason |

### Log Storage

```
Location: izara-users-credentials/login-history/{userId}.json
Retention: 90 days
Format: JSON array
```

---

## 🔐 Role-Based Access Control

### Patient Permissions

```javascript
patient: {
  read: ['own_profile', 'own_phr', 'own_appointments'],
  write: ['own_profile', 'own_phr', 'book_appointment'],
  delete: ['cancel_own_appointment']
}
```

### Doctor Permissions

```javascript
doctor: {
  read: ['own_profile', 'assigned_patients', 'assigned_appointments', 'clinical_resources'],
  write: ['own_profile', 'emr', 'prescriptions', 'clinical_resources_draft'],
  delete: ['own_drafts']
}
```

### Admin Permissions

```javascript
admin: {
  read: ['all'],
  write: ['all'],
  delete: ['all'],
  manage: ['doctors', 'appointments', 'resources', 'consultants', 'roles']
}
```

---

## 🔑 Session Security

### Session Token Generation

```javascript
// Cryptographically secure random token
const token = crypto.randomBytes(32).toString('hex');
// 64 character hexadecimal string
```

### Session Validation

```javascript
// On every protected request:
1. Extract token from Authorization header
2. Fetch session file from GCS
3. Check session exists
4. Check not expired
5. Check isValid flag
6. Update lastActivity
```

### Session Invalidation

```javascript
// On logout:
1. Set isValid = false
2. Set loggedOutAt = timestamp
3. Save to GCS

// Session file persists for audit
```

---

## 🚫 Account Lockout

### Lockout Flow

```
1. User enters wrong password
2. Increment loginAttempts
3. If loginAttempts >= 5:
   - Set lockedUntil = now + 30 minutes
   - Log ACCOUNT_LOCKED event
4. On next login attempt:
   - Check if lockedUntil > now
   - If locked, return ACCOUNT_LOCKED error
   - If expired, proceed with login
5. On successful login:
   - Reset loginAttempts to 0
   - Clear lockedUntil
```

---

## 📱 Multi-Factor (Planned)

| Feature | Status |
|---------|--------|
| Email verification | ✅ Implemented |
| SMS OTP | 🔄 Planned |
| TOTP (Google Auth) | 🔄 Planned |
| Biometric | 🔄 Future |

---

## 🔒 Data Protection

### At Rest

- GCS server-side encryption (AES-256)
- Bucket-level access controls
- No public access

### In Transit

- HTTPS required (production)
- TLS 1.2+ enforced
- Certificate validation

### Sensitive Data

| Data | Protection |
|------|------------|
| Passwords | bcrypt hash (never stored plaintext) |
| Session tokens | Server-side only |
| PHI | Role-based access |
| Audit logs | Append-only |

---

## 🛠️ Security Middleware Stack

```javascript
// Order matters - applied in sequence
app.use(helmet());               // Security headers
app.use(cors(corsOptions));      // CORS
app.use(rateLimit(limiter));     // Rate limiting
app.use(express.json());         // JSON parsing
app.use(sanitizeInput);          // XSS prevention
app.use(validateSession);        // Auth (protected routes)
app.use(checkPermissions);       // Authorization
```

---
**Last Updated:** December 14, 2025
