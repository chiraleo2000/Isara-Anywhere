# 🔐 Mobile Authentication & Security — Izara Dr. Anywhere

**Version:** 2.1.0  
**Date:** February 2026  
**Compliance:** PDPA (Thailand), OWASP Mobile Top 10 2024  
**Architecture:** Single Unified App with Role-Based Authentication

> **Key:** Authentication is scoped per-role (patient / doctor) within a single app.  
> See [16_Unified_App_Role_Selection.md](16_Unified_App_Role_Selection.md) for role selection design.  
> See [12_Multi_API_Token_Management.md](12_Multi_API_Token_Management.md) for multi-service token management.
> See [14_Mobile_PDPA_Privacy.md](14_Mobile_PDPA_Privacy.md) for PDPA compliance details.

---

## 1. Authentication Architecture

### 1.1 Auth Flow Overview

```
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│  Mobile App  │──────────│  API Server  │──────────│  PostgreSQL  │
│              │          │              │          │              │
│ SecureStore  │  HTTPS   │ JWT + Bcrypt │  TLS     │ users table  │
│ Biometrics   │◄────────►│ Rate Limiter │◄────────►│ sessions     │
│ Cert Pinning │          │ CORS Policy  │          │ biometric    │
└──────────────┘          └──────────────┘          └──────────────┘
```

### 1.2 Authentication Methods

| Method | Patient Mode | Doctor Mode | Description |
|--------|:-----------:|:----------:|-------------|
| Email + Password | ✅ | ✅ | Standard login (separate accounts per role) |
| Biometric (Face ID / Fingerprint) | ✅ | ✅ | After initial login, per-role binding |
| PIN Code | ✅ | ❌ | Fallback for older devices (patient only) |
| Social Login (Google) | ✅ (Phase 2.2) | ❌ | Future enhancement |
| 2FA / OTP | ❌ | ✅ | SMS/Email OTP required for doctors |
| Role Switch | ✅ | ✅ | Switch to other role from profile menu |

> **Note:** Patient and Doctor use **separate user accounts** with separate credentials.  
> A person can have both a patient account and a doctor account, switching between them in the unified app.

---

## 2. Token Management

### 2.1 JWT Token Strategy

```
Access Token:  Short-lived (15 minutes)
Refresh Token: Long-lived (30 days) 
Device Token:  Persistent (until logout/revoke)
```

### 2.2 Token Storage

```typescript
// Using expo-secure-store (Keychain on iOS, Keystore on Android)
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEYS = {
  // Per-role core auth tokens
  PATIENT_ACCESS_TOKEN: 'izara_patient_access_token',
  PATIENT_REFRESH_TOKEN: 'izara_patient_refresh_token',
  PATIENT_BIOMETRIC_KEY: 'izara_patient_biometric_key',
  DOCTOR_ACCESS_TOKEN: 'izara_doctor_access_token',
  DOCTOR_REFRESH_TOKEN: 'izara_doctor_refresh_token',
  DOCTOR_BIOMETRIC_KEY: 'izara_doctor_biometric_key',
  // Shared
  DEVICE_ID: 'izara_device_id',
  USER_PROFILE_PATIENT: 'izara_patient_profile_cache',
  USER_PROFILE_DOCTOR: 'izara_doctor_profile_cache',
  // Role state
  LAST_ACTIVE_ROLE: 'izara_last_active_role',  // MMKV
};

// Store tokens securely
async function storeTokens(accessToken: string, refreshToken: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEYS.ACCESS_TOKEN, accessToken, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  await SecureStore.setItemAsync(TOKEN_KEYS.REFRESH_TOKEN, refreshToken, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

// Retrieve tokens
async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEYS.ACCESS_TOKEN);
}

// Clear all tokens on logout
async function clearAllTokens(): Promise<void> {
  await Promise.all(
    Object.values(TOKEN_KEYS).map(key => SecureStore.deleteItemAsync(key))
  );
}
```

### 2.3 Token Refresh Flow

```
┌──────────┐                    ┌──────────┐
│  Mobile  │                    │  Server  │
└────┬─────┘                    └────┬─────┘
     │                               │
     │  API Request + Access Token   │
     │──────────────────────────────►│
     │                               │
     │  401 Token Expired            │
     │◄──────────────────────────────│
     │                               │
     │  POST /auth/refresh           │
     │  + Refresh Token              │
     │──────────────────────────────►│
     │                               │
     │  New Access + Refresh Token   │
     │◄──────────────────────────────│
     │                               │
     │  Retry Original Request       │
     │──────────────────────────────►│
     │                               │
     │  200 Success                  │
     │◄──────────────────────────────│
```

```typescript
// Axios interceptor for automatic token refresh
const apiClient = axios.create({ baseURL: API_BASE_URL });

let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('izara_refresh_token');
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });
        
        await storeTokens(data.accessToken, data.refreshToken);
        
        failedQueue.forEach(({ resolve }) => resolve(data.accessToken));
        failedQueue = [];
        
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        failedQueue.forEach(({ reject }) => reject(refreshError));
        failedQueue = [];
        
        // Force logout
        await clearAllTokens();
        router.replace('/login');
        throw refreshError;
      } finally {
        isRefreshing = false;
      }
    }
    throw error;
  }
);
```

---

## 3. Biometric Authentication

### 3.1 Enrollment Flow

```
User logs in with email/password
         │
         ▼
┌─────────────────────┐
│ Prompt: Enable       │
│ Biometric Login?     │
│ [Yes]  [Later]       │
└────────┬────────────┘
         │ Yes
         ▼
┌─────────────────────┐
│ expo-local-          │
│ authentication       │
│ .authenticateAsync() │
└────────┬────────────┘
         │ Biometric Success
         ▼
┌─────────────────────┐
│ Generate RSA         │
│ Key Pair             │
│ Store Private Key in │
│ SecureStore           │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ POST /api/mobile/    │
│ biometric/enroll     │
│ { device_id,         │
│   public_key,        │
│   biometric_type }   │
│                      │
│ Server stores        │
│ public key           │
└─────────────────────┘
```

### 3.2 Biometric Login Flow

```
App Launch
    │
    ▼
┌───────────────────┐
│ Check: Biometric   │
│ enrolled for this  │
│ device?            │
└───────┬───────────┘
        │ Yes
        ▼
┌───────────────────┐
│ Request challenge  │
│ from server        │
│ GET /biometric/    │
│ challenge          │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ Prompt biometric   │
│ (Face ID /         │
│  Fingerprint)      │
└───────┬───────────┘
        │ Success
        ▼
┌───────────────────┐
│ Sign challenge     │
│ with private key   │
│ from SecureStore   │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ POST /biometric/   │
│ verify             │
│ { device_id,       │
│   signed_challenge,│
│   challenge_id }   │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ Server verifies    │
│ signature with     │
│ stored public key  │
│                    │
│ Returns JWT tokens │
└───────────────────┘
```

### 3.3 Implementation

```typescript
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { generateKeyPair, sign } from 'react-native-rsa';

export class BiometricService {
  // Check device capability
  static async isAvailable(): Promise<boolean> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  }

  // Get supported types
  static async getSupportedTypes(): Promise<string[]> {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    return types.map(type => {
      switch (type) {
        case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
          return 'face_id';
        case LocalAuthentication.AuthenticationType.FINGERPRINT:
          return 'fingerprint';
        case LocalAuthentication.AuthenticationType.IRIS:
          return 'iris';
        default:
          return 'unknown';
      }
    });
  }

  // Prompt biometric authentication
  static async authenticate(reason: string = 'ยืนยันตัวตนเพื่อเข้าสู่ระบบ'): Promise<boolean> {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'ยกเลิก',
      fallbackLabel: 'ใช้รหัสผ่าน',
      disableDeviceFallback: false,
    });
    return result.success;
  }

  // Enroll biometric for this device
  static async enroll(deviceId: string): Promise<void> {
    const authenticated = await this.authenticate('เปิดใช้งานการเข้าสู่ระบบด้วยไบโอเมตริก');
    if (!authenticated) throw new Error('Biometric authentication failed');

    // Generate RSA key pair
    const { publicKey, privateKey } = await generateKeyPair(2048);

    // Store private key securely
    await SecureStore.setItemAsync('izara_biometric_key', privateKey, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });

    // Send public key to server
    const types = await this.getSupportedTypes();
    await mobileApi.enrollBiometric({
      device_id: deviceId,
      biometric_type: types[0],
      public_key: publicKey,
    });
  }

  // Login with biometrics
  static async login(deviceId: string): Promise<AuthResponse> {
    // 1. Get challenge from server
    const { challenge_id, challenge } = await mobileApi.getBiometricChallenge(deviceId);

    // 2. Authenticate with biometric
    const authenticated = await this.authenticate();
    if (!authenticated) throw new Error('Biometric authentication failed');

    // 3. Sign challenge with private key
    const privateKey = await SecureStore.getItemAsync('izara_biometric_key');
    if (!privateKey) throw new Error('Biometric not enrolled');

    const signedChallenge = await sign(challenge, privateKey);

    // 4. Verify with server
    const response = await mobileApi.verifyBiometric({
      device_id: deviceId,
      signed_challenge: signedChallenge,
      challenge_id,
    });

    // 5. Store tokens
    await storeTokens(response.token, response.refreshToken);

    return response;
  }
}
```

---

## 4. App Lock & Session Security

### 4.1 Auto-Lock Policy

```typescript
const SECURITY_CONFIG = {
  // Auto-lock after inactivity (role-aware within unified app)
  PATIENT_LOCK_TIMEOUT: 5 * 60 * 1000,    // 5 minutes
  DOCTOR_LOCK_TIMEOUT: 3 * 60 * 1000,     // 3 minutes (stricter for medical data)
  
  // Background lock
  BACKGROUND_LOCK_THRESHOLD: 30 * 1000,    // 30 seconds in background → require auth
  
  // Session limits
  MAX_CONCURRENT_DEVICES: 3,               // Per role
  MAX_FAILED_BIOMETRIC: 5,                 // After 5 fails → require password
  MAX_FAILED_PIN: 5,                       // After 5 fails → account locked 15 min
  
  // Role switch
  REQUIRE_AUTH_ON_ROLE_SWITCH: true,       // Always re-authenticate when switching roles
};
```

### 4.2 AppState Lock Handler

```typescript
import { AppState, AppStateStatus } from 'react-native';

export function useAppLock() {
  const [isLocked, setIsLocked] = useState(false);
  const backgroundTimestamp = useRef<number | null>(null);
  
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundTimestamp.current = Date.now();
      } else if (nextState === 'active' && backgroundTimestamp.current) {
        const elapsed = Date.now() - backgroundTimestamp.current;
        if (elapsed > SECURITY_CONFIG.BACKGROUND_LOCK_THRESHOLD) {
          setIsLocked(true);
        }
        backgroundTimestamp.current = null;
      }
    });
    
    return () => subscription.remove();
  }, []);

  const unlock = useCallback(async () => {
    const success = await BiometricService.authenticate();
    if (success) setIsLocked(false);
    return success;
  }, []);

  return { isLocked, unlock };
}
```

---

## 5. Network Security

### 5.1 Certificate Pinning

```typescript
// expo-plugins/certificate-pinning.ts
// Uses expo-certificate-transparency for pinning

const CERTIFICATE_PINS = {
  production: {
    'izara-patient-portal-hvht4obouq-as.a.run.app': [
      'sha256/YLh1dUR9y6Kja30RrAn7JKnbQG/uEtLMkBgFF2Fuihg=',
      'sha256/sRHdihwgkaib1P1gN7akqWAP3iPn/oA3DGILDr+R8Rw=',  // Backup
    ],
    'izara-doctor-portal-hvht4obouq-as.a.run.app': [
      'sha256/YLh1dUR9y6Kja30RrAn7JKnbQG/uEtLMkBgFF2Fuihg=',
      'sha256/sRHdihwgkaib1P1gN7akqWAP3iPn/oA3DGILDr+R8Rw=',
    ],
  },
};

// Axios adapter with pinning
import { createAdapter } from 'react-native-ssl-pinning';

const sslPinnedAxios = axios.create({
  adapter: createAdapter({
    certs: CERTIFICATE_PINS[ENV],
  }),
});
```

### 5.2 Request Signing

```typescript
// HMAC request signing for sensitive operations
import CryptoJS from 'crypto-js';

function signRequest(method: string, path: string, body: any, timestamp: number): string {
  const payload = `${method}:${path}:${JSON.stringify(body || {})}:${timestamp}`;
  return CryptoJS.HmacSHA256(payload, API_SECRET).toString();
}

// Add to sensitive requests (payments, EMR creation, prescriptions)
apiClient.interceptors.request.use((config) => {
  if (SENSITIVE_ENDPOINTS.some(ep => config.url?.includes(ep))) {
    const timestamp = Date.now();
    config.headers['X-Timestamp'] = timestamp;
    config.headers['X-Signature'] = signRequest(
      config.method!.toUpperCase(),
      config.url!,
      config.data,
      timestamp
    );
  }
  return config;
});
```

### 5.3 Data Encryption at Rest

```typescript
// Sensitive data encryption before storing in SQLite
import * as Crypto from 'expo-crypto';

export class DataEncryption {
  private static async getEncryptionKey(): Promise<string> {
    let key = await SecureStore.getItemAsync('izara_encryption_key');
    if (!key) {
      key = await Crypto.getRandomBytesAsync(32).then(
        bytes => Buffer.from(bytes).toString('hex')
      );
      await SecureStore.setItemAsync('izara_encryption_key', key, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    }
    return key;
  }

  static async encrypt(data: string): Promise<string> {
    const key = await this.getEncryptionKey();
    return CryptoJS.AES.encrypt(data, key).toString();
  }

  static async decrypt(ciphertext: string): Promise<string> {
    const key = await this.getEncryptionKey();
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}
```

---

## 6. OWASP Mobile Top 10 Compliance

### 6.1 Compliance Matrix

| # | Risk | Mitigation | Status |
|---|------|------------|--------|
| M1 | Improper Platform Usage | Follow Apple/Google guidelines, use native APIs correctly | ✅ Planned |
| M2 | Insecure Data Storage | SecureStore (Keychain/Keystore), encrypted SQLite | ✅ Planned |
| M3 | Insecure Communication | TLS 1.3, certificate pinning, HSTS | ✅ Planned |
| M4 | Insecure Authentication | Biometric + JWT, rate limiting, brute-force protection | ✅ Planned |
| M5 | Insufficient Cryptography | AES-256 at rest, RSA-2048 for biometric keys | ✅ Planned |
| M6 | Insecure Authorization | Server-side role checks, no client-side bypass | ✅ Planned |
| M7 | Client Code Quality | TypeScript strict, ESLint security rules, code review | ✅ Planned |
| M8 | Code Tampering | Jailbreak/root detection, integrity checks | ✅ Planned |
| M9 | Reverse Engineering | ProGuard/R8 (Android), bitcode (iOS), obfuscation | ✅ Planned |
| M10 | Extraneous Functionality | Remove all debug logs/endpoints in production | ✅ Planned |

### 6.2 Jailbreak/Root Detection

```typescript
import DeviceInfo from 'react-native-device-info';

export async function checkDeviceSecurity(): Promise<SecurityCheckResult> {
  const checks = {
    isEmulator: await DeviceInfo.isEmulator(),
    isPinOrFingerprintSet: await DeviceInfo.isPinOrFingerprintSet(),
    // Additional checks for jailbreak/root
    debuggerAttached: __DEV__,
  };
  
  return {
    isSecure: !checks.isEmulator && checks.isPinOrFingerprintSet && !checks.debuggerAttached,
    warnings: Object.entries(checks)
      .filter(([_, value]) => value)
      .map(([key]) => key),
  };
}
```

---

## 7. PDPA Compliance (Thai Personal Data Protection Act)

### 7.1 Mobile-Specific Requirements

| Requirement | Implementation |
|-------------|---------------|
| Consent before data collection | PDPA consent screen on first launch |
| Right to access personal data | Profile → Privacy → "ดาวน์โหลดข้อมูลของฉัน" |
| Right to erasure | Profile → Privacy → "ลบบัญชีของฉัน" (30-day grace period) |
| Data portability | Export PHR/EMR as PDF/JSON |
| Data minimization | Only collect necessary fields |
| Purpose limitation | Clear purpose for camera, location, health data |
| Breach notification | Push notification within 72 hours |

### 7.2 Permission Request Flow

```typescript
// Always explain WHY we need each permission

const PERMISSION_REASONS = {
  camera: {
    title: '📷 ขออนุญาตใช้กล้อง',
    message: 'สำหรับสแกนเอกสารทางการแพทย์และถ่ายรูปโปรไฟล์',
    required: false,
  },
  location: {
    title: '📍 ขออนุญาตเข้าถึงตำแหน่ง',
    message: 'สำหรับค้นหาสถานพยาบาลใกล้เคียง',
    required: false,
  },
  notifications: {
    title: '🔔 ขออนุญาตส่งการแจ้งเตือน',
    message: 'สำหรับแจ้งเตือนนัดหมาย, ผลตรวจ และข้อความจากแพทย์',
    required: false,
  },
  healthKit: {
    title: '❤️ ขออนุญาตเข้าถึง Apple Health',
    message: 'สำหรับซิงค์ข้อมูลสุขภาพจากอุปกรณ์สวมใส่',
    required: false,
  },
  microphone: {
    title: '🎤 ขออนุญาตใช้ไมโครโฟน',
    message: 'สำหรับการประชุมวิดีโอกับแพทย์',
    required: false,
  },
};
```

---

## 8. Logging & Audit Trail

### 8.1 Security Event Logging

```typescript
enum SecurityEvent {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  BIOMETRIC_ENROLLED = 'BIOMETRIC_ENROLLED',
  BIOMETRIC_LOGIN = 'BIOMETRIC_LOGIN',
  BIOMETRIC_FAILED = 'BIOMETRIC_FAILED',
  TOKEN_REFRESHED = 'TOKEN_REFRESHED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  FORCED_LOGOUT = 'FORCED_LOGOUT',
  DEVICE_REGISTERED = 'DEVICE_REGISTERED',
  APP_LOCKED = 'APP_LOCKED',
  APP_UNLOCKED = 'APP_UNLOCKED',
  DATA_EXPORTED = 'DATA_EXPORTED',
  SENSITIVE_DATA_ACCESSED = 'SENSITIVE_DATA_ACCESSED',
  PAYMENT_INITIATED = 'PAYMENT_INITIATED',
  JAILBREAK_DETECTED = 'JAILBREAK_DETECTED',
}

async function logSecurityEvent(event: SecurityEvent, metadata?: Record<string, any>): Promise<void> {
  const logEntry = {
    event,
    timestamp: new Date().toISOString(),
    device_id: await getDeviceId(),
    platform: Platform.OS,
    app_version: Constants.expoConfig?.version,
    ...metadata,
  };

  // Log locally (for offline access)
  await appendToLocalLog(logEntry);

  // Send to server (best-effort, don't block)
  try {
    await apiClient.post('/api/mobile/security/log', logEntry);
  } catch {
    // Will sync later
  }
}
```

### 8.2 Database Audit Table

```sql
CREATE TABLE mobile_security_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  event_type VARCHAR(50) NOT NULL,
  device_id VARCHAR(255),
  platform VARCHAR(10),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_security_events_user ON mobile_security_events(user_id);
CREATE INDEX idx_security_events_type ON mobile_security_events(event_type);
CREATE INDEX idx_security_events_time ON mobile_security_events(created_at);
```

---

### End of Mobile Authentication & Security — v2.1.0 — February 2026
