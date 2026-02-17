# 📡 Mobile API Specifications — Izara Dr. Anywhere

**Version:** 2.0.0  
**Date:** February 2026  
**Compatibility:** 100% backward-compatible with Phase 1 web APIs

---

## 1. API Strategy

### 1.1 Principle: Backend Reuse

Phase 2 mobile apps consume the **same REST APIs** as Phase 1 web portals. No duplication of backend logic. New endpoints are added only for mobile-specific features (push notifications, device registration, biometrics, payments, wearable sync).

### 1.2 API Base URLs

| Environment | Patient API | Doctor API | Meeting API |
|-------------|-------------|------------|-------------|
| Local | `http://localhost:3005` | `http://localhost:3010` | `http://localhost:3020` |
| Dev Cloud | `https://izara-patient-portal-dev-testing-hvht4obouq-as.a.run.app` | `https://izara-doctor-portal-dev-testing-hvht4obouq-as.a.run.app` | `https://izara-meeting-server-dev-testing-hvht4obouq-as.a.run.app` |
| Production | `https://izara-patient-portal-hvht4obouq-as.a.run.app` | `https://izara-doctor-portal-hvht4obouq-as.a.run.app` | `https://izara-jitsi-meeting-portal-hvht4obouq-as.a.run.app` |

### 1.3 Authentication Header

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
X-Platform: mobile                    # NEW: Identifies mobile client
X-Device-ID: <unique_device_id>       # NEW: Device fingerprint
X-App-Version: 2.0.0                  # NEW: App version for compat
```

---

## 2. Existing Phase 1 APIs (Used by Mobile — No Changes)

### 2.1 Patient Portal APIs (port 3005)

#### Authentication (`/api/auth`)

| Method | Endpoint | Mobile Usage | Description |
|--------|----------|--------------|-------------|
| POST | `/api/auth/register` | ✅ Register | New patient registration |
| POST | `/api/auth/login` | ✅ Login | Returns JWT token |
| POST | `/api/auth/validate` | ✅ Token check | Validate stored token on launch |
| POST | `/api/auth/logout` | ✅ Logout | Invalidate session |
| GET | `/api/auth/me` | ✅ Profile | Get current user profile |
| PUT | `/api/auth/profile` | ✅ Edit profile | Update name, phone, etc. |
| POST | `/api/auth/change-password` | ✅ Settings | Change password |
| POST | `/api/auth/request-password-reset` | ✅ Reset flow | Request password reset |
| POST | `/api/auth/reset-password` | ✅ Reset flow | Reset with token |
| POST | `/api/auth/avatar` | ✅ Photo picker | Upload profile photo |

#### PHR — Personal Health Records (`/api/phr`)

| Method | Endpoint | Mobile Usage | Description |
|--------|----------|--------------|-------------|
| GET | `/api/phr/` | ✅ Health tab | Get own PHR data |
| PUT | `/api/phr/:patientId` | ✅ Edit PHR | Update PHR (lifestyle, conditions) |
| GET | `/api/phr/:patientId/vitals` | ✅ Vitals chart | Get vitals history |
| POST | `/api/phr/:patientId/vitals` | ✅ Record vitals | Add new vital signs |
| GET | `/api/phr/:patientId/medications` | ✅ Meds list | Get medications |
| POST | `/api/phr/:patientId/medications` | ✅ Add meds | Add medication |
| GET | `/api/phr/:patientId/allergies` | ✅ Allergy list | Get allergies |
| POST | `/api/phr/:patientId/allergies` | ✅ Add allergy | Add allergy |
| GET | `/api/phr/:patientId/health-logs` | ✅ Timeline | Get health logs (EMR results) |
| GET | `/api/phr/:patientId/timeline` | ✅ Timeline | Get health timeline |
| GET | `/api/phr/:patientId/living-will` | ✅ Living will | Get living will |
| POST | `/api/phr/:patientId/living-will` | ✅ Create will | Create living will |
| PUT | `/api/phr/:patientId/living-will` | ✅ Update will | Update living will |

#### Appointments (`/api/appointments`)

| Method | Endpoint | Mobile Usage | Description |
|--------|----------|--------------|-------------|
| GET | `/api/appointments/my` | ✅ Appts tab | Get my appointments |
| GET | `/api/appointments/history` | ✅ History | Past appointments |
| GET | `/api/appointments/:appointmentId` | ✅ Detail | Single appointment |
| POST | `/api/appointments/` | ✅ Book | Create new appointment |
| PUT | `/api/appointments/:appointmentId/status` | ✅ Cancel | Cancel appointment |
| GET | `/api/appointments/notifications/:userId` | ✅ Notifications | Appointment alerts |

#### AI Features (`/api/ai`)

| Method | Endpoint | Mobile Usage | Description |
|--------|----------|--------------|-------------|
| POST | `/api/ai/chat` | ✅ AI chat | AI health assistant |
| GET | `/api/ai/chat/history` | ✅ Chat history | Previous conversations |
| POST | `/api/ai/chat/clear` | ✅ Clear | Clear chat history |
| POST | `/api/ai/symptom-checker` | ✅ Booking | Symptom analysis |
| POST | `/api/ai/risk-assessment` | ✅ Health tab | Health risk assessment |
| GET | `/api/ai/status` | ✅ Health check | AI service status |

#### Video Meeting (`/api/video-meeting`)

| Method | Endpoint | Mobile Usage | Description |
|--------|----------|--------------|-------------|
| GET | `/api/video-meeting/config` | ✅ Meeting init | Get Jitsi config |
| GET | `/api/video-meeting/:appointmentId` | ✅ Join meeting | Get meeting details + link |
| POST | `/api/video-meeting/:appointmentId/join` | ✅ Join | Join meeting |
| POST | `/api/video-meeting/:appointmentId/transcript` | ✅ Transcription | Add transcript segment |
| GET | `/api/video-meeting/:appointmentId/transcript` | ✅ View | Get full transcript |
| POST | `/api/video-meeting/:appointmentId/invite` | ✅ Invite | Invite family/friends |
| POST | `/api/video-meeting/join-with-invite` | ✅ Guest join | Join via invite token |

#### Other Patient APIs

| Method | Endpoint | Mobile Usage | Description |
|--------|----------|--------------|-------------|
| GET | `/api/doctors/` | ✅ Booking | List available doctors |
| GET | `/api/doctors/:doctorId/slots` | ✅ Booking | Available time slots |
| GET | `/api/content/medical` | ✅ Content tab | Medical articles |
| GET | `/api/content/health-tips` | ✅ Dashboard | Health tips |
| GET | `/api/google/maps/nearby` | ✅ Map screen | Nearby healthcare |
| GET | `/api/notifications/` | ✅ Notification center | All notifications |
| PUT | `/api/notifications/:id/read` | ✅ Mark read | Mark notification read |
| GET | `/api/pdpa/status` | ✅ PDPA screen | PDPA consent status |
| POST | `/api/pdpa/consent` | ✅ PDPA screen | Submit consent |
| GET | `/api/metadata/medications` | ✅ PHR | Medication database |
| GET | `/api/metadata/specialties` | ✅ Booking | Medical specialties |
| GET | `/api/emr/my` | ✅ Health logs | Own EMR records |

---

### 2.2 Doctor Portal APIs (port 3010 — Auth Server + Main API)

#### Doctor Authentication

| Method | Endpoint | Mobile Usage | Description |
|--------|----------|--------------|-------------|
| POST | `/auth/login` | ✅ Login | Doctor login (rate limited) |
| POST | `/auth/logout` | ✅ Logout | End session |
| GET | `/auth/me` | ✅ Profile | Current doctor profile |
| PUT | `/auth/profile` | ✅ Edit profile | Update doctor profile |
| GET | `/auth/verify` | ✅ Token check | Verify session valid |

#### Doctor Clinical APIs

| Method | Endpoint | Mobile Usage | Description |
|--------|----------|--------------|-------------|
| GET | `/api/dashboard/:doctorId` | ✅ Dashboard | Doctor dashboard data |
| GET | `/api/appointments` | ✅ Schedule | All appointments |
| GET | `/api/appointments/doctor/:doctorId` | ✅ My schedule | Doctor's appointments |
| GET | `/api/appointments/pending/:doctorId` | ✅ Pending | Pending appointments |
| POST | `/api/appointments/:appointmentId/confirm` | ✅ Confirm | Confirm appointment |
| POST | `/api/appointments/:appointmentId/decline` | ✅ Decline | Decline appointment |
| GET | `/api/patients` | ✅ Patient list | List patients |
| GET | `/api/patients/:patientId` | ✅ Patient detail | Patient info |
| GET | `/api/patients/:patientId/emr` | ✅ EMR view | Patient EMR history |
| GET | `/api/phr/patient/:patientId` | ✅ PHR view | Patient PHR data |
| POST | `/api/emr` | ✅ Create EMR | Create EMR record |
| POST | `/api/emr/:emrId/sign` | ✅ Sign EMR | Sign EMR |
| POST | `/api/prescriptions` | ✅ Prescribe | Create prescription |
| POST | `/api/lab-orders` | ✅ Order labs | Create lab order |
| GET | `/api/queue/doctor/:doctorId` | ✅ Queue | Doctor's patient queue |
| POST | `/api/queue/call-next` | ✅ Queue mgmt | Call next patient |

#### Doctor AI APIs

| Method | Endpoint | Mobile Usage | Description |
|--------|----------|--------------|-------------|
| POST | `/api/ai/chat` | ✅ AI copilot | AI clinical chat |
| GET | `/api/ai/pre-summary/:patientId` | ✅ Pre-consult | Pre-consultation summary |
| POST | `/api/ai/cds` | ✅ CDS alerts | Clinical Decision Support |
| POST | `/api/ai/cds/drug-interactions` | ✅ Prescribing | Drug interaction check |
| POST | `/api/ai/patient-instructions` | ✅ Instructions | Generate patient instructions |
| POST | `/api/ai/analyze-document` | ✅ Doc analysis | Analyze medical document |
| POST | `/api/ai/emr-summary` | ✅ EMR | Generate EMR summary |
| POST | `/api/ai/validate` | ✅ Man-in-loop | Validate AI output |

#### Doctor Video Meeting APIs

| Method | Endpoint | Mobile Usage | Description |
|--------|----------|--------------|-------------|
| POST | `/api/video-meeting/create` | ✅ Start meeting | Create meeting as HOST |
| GET | `/api/video-meeting/:appointmentId` | ✅ Meeting | Get meeting details |
| POST | `/api/video-meeting/:appointmentId/join` | ✅ Join | Join meeting |
| POST | `/api/video-meeting/:appointmentId/end` | ✅ End meeting | End + trigger AI |
| POST | `/api/video-meeting/:appointmentId/transcript` | ✅ Transcription | Add transcript |
| GET | `/api/video-meeting/history/:doctorId` | ✅ History | Meeting history |

#### Admin APIs (admin role only)

| Method | Endpoint | Mobile Usage | Description |
|--------|----------|--------------|-------------|
| GET | `/api/admin/stats` | ✅ Admin tab | System statistics |
| GET | `/api/admin/pending-doctors` | ✅ Admin | Pending doctor registrations |
| PUT | `/api/admin/doctors/:doctorId/approve` | ✅ Admin | Approve doctor |
| PUT | `/api/admin/doctors/:doctorId/reject` | ✅ Admin | Reject doctor |

---

### 2.3 Meeting Server APIs (port 3020)

| Method | Endpoint | Mobile Usage | Description |
|--------|----------|--------------|-------------|
| GET | `/api/health` | ✅ Health check | Server status |
| POST | `/api/meetings/create` | ✅ Doctor app | Create meeting room |
| GET | `/api/meetings/:id` | ✅ Both apps | Get meeting info |
| GET | `/api/meetings/:id/status` | ✅ Both apps | Meeting status |
| POST | `/api/meetings/:id/start-transcription` | ✅ Doctor app | Start transcript |
| POST | `/api/meetings/:id/pause-transcription` | ✅ Doctor app | Pause transcript |
| POST | `/api/meetings/:id/stop-transcription` | ✅ Doctor app | Stop transcript |
| POST | `/api/meetings/:id/transcript` | ✅ Both apps | Add transcript entry |
| GET | `/api/meetings/:id/transcript` | ✅ Both apps | Get full transcript |
| POST | `/api/meetings/:id/chat` | ✅ Both apps | Send chat message |
| GET | `/api/meetings/:id/chats` | ✅ Both apps | Get chat history |
| POST | `/api/meetings/:id/generate-summary` | ✅ Doctor app | Generate AI summary |
| GET | `/api/meetings/:id/summary` | ✅ Both apps | Get meeting summary |
| POST | `/api/meetings/:id/invite` | ✅ Both apps | Invite participants |

#### Socket.IO Events (Meeting Server)

| Event | Direction | Mobile Usage | Description |
|-------|-----------|--------------|-------------|
| `join-meeting` | Client→Server | ✅ Both apps | Join meeting room |
| `leave-meeting` | Client→Server | ✅ Both apps | Leave meeting |
| `transcript-segment` | Client→Server | ✅ Both apps | Send transcript text |
| `chat-message` | Client→Server | ✅ Both apps | Send chat |
| `meeting-status` | Server→Client | ✅ Both apps | Status updates |

---

## 3. NEW Phase 2 APIs (Mobile-Specific Additions)

### 3.1 Device Registration API

**Server:** Patient Portal + Doctor Portal  
**Path prefix:** `/api/mobile`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/mobile/device/register` | Yes | Register device for push notifications |
| DELETE | `/api/mobile/device/unregister` | Yes | Unregister device (logout) |
| PUT | `/api/mobile/device/token` | Yes | Update push token (token refresh) |
| GET | `/api/mobile/device/settings` | Yes | Get device notification settings |
| PUT | `/api/mobile/device/settings` | Yes | Update notification settings |

#### Request/Response Formats

```typescript
// POST /api/mobile/device/register
interface DeviceRegistrationRequest {
  device_token: string;          // FCM/APNS token
  platform: 'ios' | 'android';
  device_id: string;             // Unique device identifier
  device_model: string;          // e.g., "iPhone 15 Pro"
  os_version: string;            // e.g., "iOS 18.1"
  app_version: string;           // e.g., "2.0.0"
  push_enabled: boolean;
}

interface DeviceRegistrationResponse {
  success: boolean;
  device_id: string;
  registered_at: string;
}
```

#### Database Table

```sql
CREATE TABLE device_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL,
  platform VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android')),
  device_id VARCHAR(255) NOT NULL,
  device_model VARCHAR(255),
  os_version VARCHAR(50),
  app_version VARCHAR(20),
  push_enabled BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

CREATE INDEX idx_device_tokens_user ON device_tokens(user_id);
CREATE INDEX idx_device_tokens_active ON device_tokens(is_active);
```

---

### 3.2 Biometric Authentication API

**Path prefix:** `/api/mobile/biometric`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/mobile/biometric/enroll` | Yes | Enable biometric for this device |
| POST | `/api/mobile/biometric/verify` | No | Verify biometric token |
| DELETE | `/api/mobile/biometric/revoke` | Yes | Disable biometric for device |
| GET | `/api/mobile/biometric/status` | Yes | Check biometric enrollment status |

```typescript
// POST /api/mobile/biometric/enroll
interface BiometricEnrollRequest {
  device_id: string;
  biometric_type: 'face_id' | 'fingerprint' | 'iris';
  public_key: string;             // Device-generated public key
}

// POST /api/mobile/biometric/verify
interface BiometricVerifyRequest {
  device_id: string;
  signed_challenge: string;        // Challenge signed with private key
  challenge_id: string;            // Server-issued challenge ID
}

interface BiometricVerifyResponse {
  success: boolean;
  token: string;                   // JWT token
  user: UserProfile;
}
```

#### Database Table

```sql
CREATE TABLE biometric_credentials (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(255) NOT NULL,
  biometric_type VARCHAR(20) NOT NULL,
  public_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  enrolled_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  UNIQUE(user_id, device_id)
);
```

---

### 3.3 Push Notification Delivery API

**Internal server-side service** — not exposed as REST API to mobile clients  
Notifications are triggered by existing backend events and delivered via FCM/APNS.

#### Trigger Points (Backend Integration)

```typescript
// When appointment is confirmed → send push to patient
async function sendAppointmentConfirmedPush(appointmentId: string) {
  const appointment = await db.query('SELECT * FROM appointments WHERE id = $1', [appointmentId]);
  const devices = await db.query('SELECT * FROM device_tokens WHERE user_id = $1 AND is_active = true', [appointment.patient_id]);
  
  for (const device of devices) {
    await sendPush(device, {
      title: '✅ นัดหมายได้รับการยืนยัน',
      body: `แพทย์ ${appointment.doctor_name} ยืนยันนัดหมายวันที่ ${appointment.date}`,
      data: {
        type: 'appointment_confirmed',
        appointmentId: appointment.id,
        screen: '/appointments/' + appointment.id,
      }
    });
  }
}
```

#### Push Notification Types

| Type | Title (Thai) | Trigger | Deep Link |
|------|-------------|---------|-----------|
| `appointment_confirmed` | ✅ นัดหมายได้รับการยืนยัน | Doctor confirms | `/appointments/:id` |
| `appointment_reminder` | ⏰ แจ้งเตือนนัดหมาย | 24h & 1h before | `/appointments/:id` |
| `meeting_started` | 📹 แพทย์เริ่มการประชุมแล้ว | Doctor starts meeting | `/meeting/:id` |
| `emr_signed` | 📋 เวชระเบียนพร้อมดู | Doctor signs EMR | `/health/health-logs` |
| `prescription_ready` | 💊 ใบสั่งยาพร้อม | Prescription created | `/health/medications` |
| `lab_results_ready` | 🧪 ผลตรวจพร้อมดู | Lab results uploaded | `/health/health-logs` |
| `instruction_ready` | 📄 คำแนะนำจากแพทย์ | Instructions approved | `/health/health-logs` |
| `doctor_message` | 💬 ข้อความจากแพทย์ | Doctor sends message | `/notifications` |
| `appointment_cancelled` | ❌ นัดหมายถูกยกเลิก | Appointment cancelled | `/appointments` |
| `payment_success` | 💳 ชำระเงินสำเร็จ | Payment confirmed | `/profile/payments` |
| `medication_reminder` | 💊 ถึงเวลาทานยา | Scheduled local alarm | `/health/medications` |

---

### 3.4 Payment Gateway API

**Path prefix:** `/api/mobile/payments`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/mobile/payments/create-intent` | Yes | Create payment intent (Stripe) |
| POST | `/api/mobile/payments/confirm` | Yes | Confirm payment |
| GET | `/api/mobile/payments/history` | Yes | Get payment history |
| GET | `/api/mobile/payments/:paymentId` | Yes | Get payment details |
| GET | `/api/mobile/payments/:paymentId/receipt` | Yes | Get receipt PDF |
| POST | `/api/mobile/payments/refund` | Yes (Admin) | Request refund |

```typescript
// POST /api/mobile/payments/create-intent
interface CreatePaymentIntentRequest {
  appointment_id: string;
  amount: number;                  // In Thai Baht (satang)
  currency: 'THB';
  payment_method: 'card' | 'promptpay' | 'mobile_banking';
  description?: string;
}

interface CreatePaymentIntentResponse {
  client_secret: string;           // Stripe client_secret
  payment_id: string;              // Internal payment ID
  amount: number;
  status: 'requires_payment_method' | 'requires_confirmation';
}
```

#### Database Table

```sql
CREATE TABLE payment_transactions (
  id SERIAL PRIMARY KEY,
  payment_id VARCHAR(255) UNIQUE NOT NULL,    -- Stripe/Omise payment ID
  appointment_id INTEGER REFERENCES appointments(id),
  patient_id INTEGER REFERENCES users(id),
  doctor_id INTEGER REFERENCES users(id),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'THB',
  payment_method VARCHAR(50) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',  -- pending | succeeded | failed | refunded
  stripe_payment_intent_id VARCHAR(255),
  receipt_url TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_payments_patient ON payment_transactions(patient_id);
CREATE INDEX idx_payments_appointment ON payment_transactions(appointment_id);
CREATE INDEX idx_payments_status ON payment_transactions(status);
```

---

### 3.5 Wearable Health Data Sync API

**Path prefix:** `/api/mobile/health-sync`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/mobile/health-sync/vitals` | Yes | Sync wearable vitals batch |
| GET | `/api/mobile/health-sync/status` | Yes | Get sync status |
| PUT | `/api/mobile/health-sync/settings` | Yes | Configure sync settings |
| POST | `/api/mobile/health-sync/connect` | Yes | Connect wearable device |
| DELETE | `/api/mobile/health-sync/disconnect` | Yes | Disconnect wearable |

```typescript
// POST /api/mobile/health-sync/vitals
interface WearableSyncRequest {
  source: 'apple_health' | 'google_fit' | 'samsung_health';
  device_name: string;                // e.g., "Apple Watch Series 9"
  vitals: WearableVital[];
}

interface WearableVital {
  type: 'heart_rate' | 'blood_pressure' | 'blood_oxygen' | 'steps' | 'sleep' | 'blood_glucose';
  value: number | { systolic: number; diastolic: number };
  unit: string;
  recorded_at: string;               // ISO 8601
  source_device: string;
}

// Response
interface WearableSyncResponse {
  synced_count: number;
  skipped_count: number;             // Duplicates
  latest_sync_at: string;
}
```

---

### 3.6 Offline Sync API

**Path prefix:** `/api/mobile/sync`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/mobile/sync/push` | Yes | Push offline changes to server |
| GET | `/api/mobile/sync/pull` | Yes | Pull latest data since timestamp |
| GET | `/api/mobile/sync/status` | Yes | Check sync queue status |
| POST | `/api/mobile/sync/resolve-conflict` | Yes | Resolve sync conflict |

```typescript
// POST /api/mobile/sync/push
interface SyncPushRequest {
  changes: SyncChange[];
  device_id: string;
  last_sync_at: string;              // ISO 8601
}

interface SyncChange {
  table: string;                     // 'vital_signs' | 'medications' | 'allergies'
  operation: 'create' | 'update' | 'delete';
  record_id?: string;
  data: Record<string, any>;
  local_timestamp: string;
}

// GET /api/mobile/sync/pull?since=2026-02-17T00:00:00Z
interface SyncPullResponse {
  changes: ServerChange[];
  server_timestamp: string;
  has_more: boolean;
}
```

---

### 3.7 Document Scanner API

**Path prefix:** `/api/mobile/scanner`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/mobile/scanner/ocr` | Yes | OCR scanned document image |
| POST | `/api/mobile/scanner/analyze` | Yes | AI-analyze scanned document |

```typescript
// POST /api/mobile/scanner/ocr (multipart/form-data)
interface ScannerOCRRequest {
  image: File;                       // Captured photo
  document_type: 'lab_result' | 'prescription' | 'medical_record' | 'other';
  language: 'th' | 'en';
}

interface ScannerOCRResponse {
  text: string;                      // Extracted text
  confidence: number;                // OCR confidence 0-1
  structured_data?: {
    patient_name?: string;
    test_results?: LabResult[];
    medications?: Medication[];
  };
}

// POST /api/mobile/scanner/analyze
// Uses existing /api/ai/analyze-document with OCR text as input
```

---

## 4. API Client Library (`@izara/api-client`)

### 4.1 Module Structure

```typescript
// @izara/api-client/src/index.ts
export { PatientApiClient } from './patient';
export { DoctorApiClient } from './doctor';
export { MeetingApiClient } from './meeting';
export { MobileApiClient } from './mobile';
export type * from './types';
```

### 4.2 Patient API Client

```typescript
// @izara/api-client/src/patient.ts
export class PatientApiClient {
  constructor(private baseURL: string, private getToken: () => Promise<string | null>);

  // Auth
  async login(email: string, password: string): Promise<AuthResponse>;
  async register(data: RegisterRequest): Promise<AuthResponse>;
  async validateToken(): Promise<boolean>;
  async logout(): Promise<void>;
  async getProfile(): Promise<UserProfile>;
  async updateProfile(data: ProfileUpdateRequest): Promise<UserProfile>;

  // Appointments
  async getMyAppointments(): Promise<Appointment[]>;
  async getAppointmentHistory(): Promise<Appointment[]>;
  async getAppointment(id: string): Promise<Appointment>;
  async bookAppointment(data: BookAppointmentRequest): Promise<Appointment>;
  async cancelAppointment(id: string): Promise<void>;

  // PHR
  async getPHR(): Promise<PHRData>;
  async getVitals(patientId: string): Promise<VitalSign[]>;
  async recordVitals(patientId: string, data: VitalSignInput): Promise<VitalSign>;
  async getMedications(patientId: string): Promise<Medication[]>;
  async addMedication(patientId: string, data: MedicationInput): Promise<Medication>;
  async getAllergies(patientId: string): Promise<Allergy[]>;
  async addAllergy(patientId: string, data: AllergyInput): Promise<Allergy>;
  async getTimeline(patientId: string): Promise<TimelineEntry[]>;

  // AI
  async chatWithAI(message: string): Promise<AIResponse>;
  async getChatHistory(): Promise<ChatMessage[]>;
  async clearChatHistory(): Promise<void>;
  async checkSymptoms(symptoms: string[]): Promise<SymptomAnalysis>;

  // Meeting
  async getMeetingDetails(appointmentId: string): Promise<MeetingDetails>;
  async joinMeeting(appointmentId: string): Promise<JoinMeetingResponse>;

  // Content
  async getMedicalContent(): Promise<Article[]>;
  async getHealthTips(): Promise<HealthTip[]>;

  // Notifications
  async getNotifications(): Promise<Notification[]>;
  async markNotificationRead(id: string): Promise<void>;
  async markAllNotificationsRead(): Promise<void>;

  // Doctors
  async getDoctors(): Promise<Doctor[]>;
  async getDoctorSlots(doctorId: string): Promise<TimeSlot[]>;
  async getDoctorProfile(doctorId: string): Promise<Doctor>;

  // PDPA
  async getPDPAStatus(): Promise<PDPAStatus>;
  async submitConsent(data: ConsentRequest): Promise<void>;

  // Map
  async getNearbyHealthcare(lat: number, lng: number, radius: number): Promise<Facility[]>;
}
```

### 4.3 Doctor API Client

```typescript
// @izara/api-client/src/doctor.ts
export class DoctorApiClient {
  constructor(private baseURL: string, private getToken: () => Promise<string | null>);

  // Auth
  async login(email: string, password: string): Promise<AuthResponse>;
  async logout(): Promise<void>;
  async getProfile(): Promise<DoctorProfile>;
  async updateProfile(data: DoctorProfileUpdate): Promise<DoctorProfile>;

  // Dashboard
  async getDashboard(doctorId: string): Promise<DashboardData>;

  // Appointments
  async getAppointments(): Promise<Appointment[]>;
  async getDoctorAppointments(doctorId: string): Promise<Appointment[]>;
  async getPending(doctorId: string): Promise<Appointment[]>;
  async confirmAppointment(appointmentId: string): Promise<void>;
  async declineAppointment(appointmentId: string): Promise<void>;

  // Patients
  async getPatients(): Promise<Patient[]>;
  async getPatient(patientId: string): Promise<Patient>;
  async getPatientEMR(patientId: string): Promise<EMR[]>;
  async getPatientPHR(patientId: string): Promise<PHRData>;

  // EMR
  async createEMR(data: EMRCreateRequest): Promise<EMR>;
  async signEMR(emrId: string): Promise<void>;

  // Prescriptions & Labs
  async createPrescription(data: PrescriptionRequest): Promise<Prescription>;
  async createLabOrder(data: LabOrderRequest): Promise<LabOrder>;

  // Queue
  async getQueue(doctorId: string): Promise<QueueItem[]>;
  async callNextPatient(): Promise<QueueItem>;

  // AI
  async chatWithAI(message: string): Promise<AIResponse>;
  async getPreConsultationSummary(patientId: string): Promise<PreConsultSummary>;
  async getCDSAlerts(data: CDSRequest): Promise<CDSAlert[]>;
  async checkDrugInteractions(drugs: string[]): Promise<DrugInteraction[]>;
  async generatePatientInstructions(data: InstructionsRequest): Promise<Instructions>;
  async analyzeDocument(document: File): Promise<DocumentAnalysis>;
  async generateEMRSummary(data: EMRSummaryRequest): Promise<EMRSummary>;
  async validateAIOutput(id: string, decision: ValidationDecision): Promise<void>;

  // Meeting
  async createMeeting(appointmentId: string): Promise<MeetingDetails>;
  async getMeeting(appointmentId: string): Promise<MeetingDetails>;
  async endMeeting(appointmentId: string): Promise<MeetingSummary>;
  async getMeetingHistory(doctorId: string): Promise<MeetingHistory[]>;

  // Notifications
  async getNotifications(): Promise<Notification[]>;
  async markNotificationRead(id: string): Promise<void>;

  // Admin
  async getAdminStats(): Promise<AdminStats>;
  async getPendingDoctors(): Promise<PendingDoctor[]>;
  async approveDoctor(doctorId: string): Promise<void>;
  async rejectDoctor(doctorId: string): Promise<void>;
}
```

### 4.4 Mobile-Specific API Client

```typescript
// @izara/api-client/src/mobile.ts
export class MobileApiClient {
  constructor(private baseURL: string, private getToken: () => Promise<string | null>);

  // Device
  async registerDevice(data: DeviceRegistrationRequest): Promise<DeviceRegistrationResponse>;
  async unregisterDevice(): Promise<void>;
  async updatePushToken(token: string): Promise<void>;
  async getDeviceSettings(): Promise<DeviceSettings>;
  async updateDeviceSettings(settings: DeviceSettings): Promise<void>;

  // Biometric
  async enrollBiometric(data: BiometricEnrollRequest): Promise<void>;
  async verifyBiometric(data: BiometricVerifyRequest): Promise<BiometricVerifyResponse>;
  async revokeBiometric(): Promise<void>;
  async getBiometricStatus(): Promise<BiometricStatus>;

  // Payments
  async createPaymentIntent(data: CreatePaymentIntentRequest): Promise<CreatePaymentIntentResponse>;
  async confirmPayment(paymentId: string): Promise<PaymentResult>;
  async getPaymentHistory(): Promise<PaymentTransaction[]>;
  async getPaymentDetails(paymentId: string): Promise<PaymentTransaction>;
  async getReceipt(paymentId: string): Promise<ReceiptData>;

  // Wearable Sync
  async syncWearableVitals(data: WearableSyncRequest): Promise<WearableSyncResponse>;
  async getSyncStatus(): Promise<SyncStatus>;
  async updateSyncSettings(settings: SyncSettings): Promise<void>;

  // Offline Sync
  async pushOfflineChanges(data: SyncPushRequest): Promise<SyncPushResponse>;
  async pullLatestData(since: string): Promise<SyncPullResponse>;
  async resolveConflict(conflict: ConflictResolution): Promise<void>;

  // Document Scanner
  async ocrDocument(image: File, type: string): Promise<ScannerOCRResponse>;
  async analyzeScannedDocument(text: string): Promise<DocumentAnalysis>;
}
```

---

## 5. API Error Handling

### 5.1 Standard Error Response

```typescript
interface ApiErrorResponse {
  error: string;
  message: string;
  code: string;
  statusCode: number;
  details?: Record<string, any>;
}

// Error codes
enum ErrorCode {
  AUTH_INVALID_CREDENTIALS = 'AUTH_001',
  AUTH_TOKEN_EXPIRED = 'AUTH_002',
  AUTH_BIOMETRIC_FAILED = 'AUTH_003',
  DEVICE_NOT_REGISTERED = 'DEVICE_001',
  PAYMENT_FAILED = 'PAYMENT_001',
  PAYMENT_INSUFFICIENT_FUNDS = 'PAYMENT_002',
  SYNC_CONFLICT = 'SYNC_001',
  OFFLINE_QUEUE_FULL = 'SYNC_002',
  RATE_LIMITED = 'RATE_001',
  NETWORK_ERROR = 'NETWORK_001',
}
```

### 5.2 Mobile-Specific Error Handling

```typescript
// Retry logic for mobile
const retryConfig = {
  maxRetries: 3,
  retryDelay: [1000, 2000, 5000],    // Exponential backoff
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  retryableOnNetworkError: true,
};

// Offline fallback
const offlineFallback = {
  GET: 'serve_from_cache',           // Return cached data
  POST: 'queue_for_sync',            // Queue and sync later
  PUT: 'queue_for_sync',
  DELETE: 'queue_for_sync',
};
```

---

## 6. Rate Limiting (Mobile-Specific)

| Endpoint Group | Limit | Window |
|---------------|-------|--------|
| `/api/auth/login` | 10 requests | 15 minutes |
| `/api/mobile/biometric/verify` | 5 requests | 5 minutes |
| `/api/ai/chat` | 30 requests | 1 hour |
| `/api/mobile/payments/*` | 10 requests | 1 hour |
| `/api/mobile/health-sync/vitals` | 60 requests | 1 hour |
| General API calls | 200 requests | 1 minute |

---

### End of Mobile API Specifications — February 2026
