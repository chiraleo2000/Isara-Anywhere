# 5. API Reference

## 5.1 Base URL

```
Development: http://localhost:3004/api
Production: https://your-domain.com/api
```

## 5.2 Authentication

All protected endpoints require the `Authorization` header:
```
Authorization: Bearer <token>
```

---

## 5.3 Endpoints

### 5.3.1 Authentication (`/api/auth`)

#### POST `/api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required, min 6 chars)",
  "confirmPassword": "string (required)",
  "name": "string (required)",
  "phone": "string (required)",
  "dateOfBirth": "string (required, YYYY-MM-DD)",
  "gender": "string (required)",
  "height": "number (optional)",
  "weight": "number (optional)",
  "bloodType": "string (optional)",
  "allergies": "string (optional, comma-separated)",
  "chronicConditions": "string (optional, comma-separated)",
  "currentMedications": "string (optional, comma-separated)",
  "emergencyContactName": "string (optional)",
  "emergencyContactPhone": "string (optional)",
  "emergencyContactRelation": "string (optional)"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "user_xxx",
    "patientId": "patient_xxx",
    "name": "John Doe",
    "email": "john@example.com",
    "avatarUrl": "https://...",
    ...
  },
  "token": "session_xxx"
}
```

---

#### POST `/api/auth/login`
Login with email and password.

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response (200):**
```json
{
  "user": { ... },
  "token": "session_xxx"
}
```

**Error Response (401):**
```json
{
  "error": "Invalid credentials"
}
```

---

#### POST `/api/auth/logout`
Logout and invalidate session.

**Request Body:**
```json
{
  "token": "string (required)"
}
```

**Response (200):**
```json
{
  "success": true
}
```

---

#### POST `/api/auth/validate`
Validate a session token.

**Request Body:**
```json
{
  "token": "string (required)"
}
```

**Response (200):**
```json
{
  "valid": true,
  "userId": "user_xxx"
}
```

---

#### GET `/api/auth/me`
Get current authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "user": { ... }
}
```

---

### 5.3.2 Personal Health Records (`/api/phr`)

#### GET `/api/phr/:userId`
Get patient's PHR data.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "patientId": "patient_xxx",
  "userId": "user_xxx",
  "personalInfo": { ... },
  "physicalInfo": { ... },
  "medicalInfo": { ... },
  "emergencyContact": { ... },
  "vitalHistory": [ ... ],
  "labResults": [ ... ],
  "immunizations": [ ... ],
  "createdAt": "2025-12-01T00:00:00.000Z",
  "updatedAt": "2025-12-07T00:00:00.000Z"
}
```

---

#### PUT `/api/phr/:userId`
Update patient's PHR data.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "physicalInfo": {
    "height": 175,
    "weight": 70
  },
  "medicalInfo": {
    "allergies": ["Penicillin"]
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { ... }
}
```

---

#### GET `/api/phr/:userId/vitals`
Get vital signs history.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
[
  {
    "bloodPressure": { "systolic": 120, "diastolic": 80 },
    "heartRate": { "value": 72 },
    "measuredAt": "2025-12-07T10:00:00.000Z"
  }
]
```

---

#### POST `/api/phr/:userId/vitals`
Add new vital signs measurement.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "bloodPressure": { "systolic": 120, "diastolic": 80, "unit": "mmHg" },
  "heartRate": { "value": 72, "unit": "bpm" },
  "weight": { "value": 70, "unit": "kg" }
}
```

**Response (200):**
```json
{
  "success": true,
  "vital": { ... }
}
```

---

### 5.3.3 Appointments (`/api/appointments`)

#### GET `/api/appointments/patient/:patientId`
Get all appointments for a patient.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
[
  {
    "id": "apt_xxx",
    "patientId": "patient_xxx",
    "doctorId": "doctor_xxx",
    "doctorName": "Dr. Smith",
    "doctorSpecialty": "General Medicine",
    "appointmentDate": "2025-12-10T00:00:00.000Z",
    "appointmentTime": "10:00",
    "type": "telehealth",
    "status": "confirmed",
    "meetingLink": "https://meet.google.com/xxx"
  }
]
```

---

#### GET `/api/appointments/:appointmentId`
Get single appointment details.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": "apt_xxx",
  "patientId": "patient_xxx",
  "doctorId": "doctor_xxx",
  ...
}
```

---

#### POST `/api/appointments`
Create new appointment.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "patientId": "patient_xxx",
  "patientName": "John Doe",
  "patientEmail": "john@example.com",
  "doctorId": "doctor_xxx",
  "doctorName": "Dr. Smith",
  "doctorSpecialty": "General Medicine",
  "appointmentDate": "2025-12-10",
  "appointmentTime": "10:00",
  "type": "telehealth",
  "reason": "Annual checkup",
  "symptoms": {
    "mainSymptom": "Headache",
    "description": "Persistent headache for 3 days",
    "severity": 5
  }
}
```

**Response (200):**
```json
{
  "id": "apt_xxx",
  "status": "pending",
  ...
}
```

---

#### PUT `/api/appointments/:appointmentId`
Update appointment.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "status": "confirmed",
  "meetingLink": "https://meet.google.com/xxx"
}
```

**Response (200):**
```json
{
  "id": "apt_xxx",
  "status": "confirmed",
  ...
}
```

---

#### DELETE `/api/appointments/:appointmentId`
Cancel appointment.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true
}
```

---

### 5.3.4 Doctors (`/api/doctors`)

#### GET `/api/doctors`
Get all doctors.

**Response (200):**
```json
[
  {
    "id": "doctor_xxx",
    "name": "Dr. Smith",
    "specialty": "General Medicine",
    "hospital": "Bangkok Hospital",
    "rating": 4.8,
    "consultationFee": 500
  }
]
```

---

#### GET `/api/doctors/:id`
Get doctor details.

**Response (200):**
```json
{
  "id": "doctor_xxx",
  "name": "Dr. Smith",
  "specialty": "General Medicine",
  "subSpecialty": "Internal Medicine",
  "education": ["MD - Chulalongkorn University"],
  "experience": "15 years",
  "languages": ["Thai", "English"],
  "availability": [
    { "day": "Monday", "slots": ["09:00", "10:00", "11:00"] }
  ]
}
```

---

#### GET `/api/doctors/search/specialty/:specialty`
Search doctors by specialty.

**Response (200):**
```json
[
  { "id": "doctor_xxx", "name": "Dr. Smith", ... }
]
```

---

### 5.3.5 PDPA Consent (`/api/pdpa`)

#### GET `/api/pdpa/consents/:patientId`
Get patient's PDPA consents.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "consents": [
    {
      "id": "consent_xxx",
      "type": "data_collection",
      "granted": true,
      "grantedAt": "2025-12-01T00:00:00.000Z"
    }
  ],
  "doctorConsents": [
    {
      "id": "consent_xxx",
      "doctorId": "doctor_xxx",
      "doctorName": "Dr. Smith",
      "dataTypes": ["demographics", "medical_history"],
      "status": "granted"
    }
  ]
}
```

---

#### PUT `/api/pdpa/consents/:patientId/:consentId`
Update consent (toggle on/off).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "granted": true
}
```

**Response (200):**
```json
{
  "success": true,
  "consent": { ... }
}
```

---

#### POST `/api/pdpa/consents/:patientId`
Grant consent to a doctor.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "doctorId": "doctor_xxx",
  "doctorName": "Dr. Smith",
  "dataTypes": ["demographics", "medical_history", "lab_results"],
  "purpose": "Ongoing treatment"
}
```

**Response (200):**
```json
{
  "success": true,
  "consent": { ... }
}
```

---

#### GET `/api/pdpa/living-will/:patientId`
Get patient's living will.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": "livingwill_xxx",
  "patientId": "patient_xxx",
  "healthcareProxy": {
    "primary": { "name": "Jane Doe", "phone": "0812345678" }
  },
  "preferences": {
    "cpr": false,
    "mechanicalVentilation": false,
    "organDonation": true
  },
  "digitalSignature": "base64...",
  "updatedAt": "2025-12-07T00:00:00.000Z"
}
```

---

#### POST `/api/pdpa/living-will/:patientId`
Save living will.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "healthcareProxy": { ... },
  "preferences": { ... },
  "digitalSignature": "base64..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { ... },
  "versionId": "version_xxx"
}
```

---

#### GET `/api/pdpa/living-will/:patientId/versions`
Get living will version history.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
[
  {
    "id": "version_xxx",
    "versionNumber": 3,
    "createdAt": "2025-12-07T00:00:00.000Z",
    "reason": "Updated preferences"
  },
  {
    "id": "version_yyy",
    "versionNumber": 2,
    "createdAt": "2025-11-15T00:00:00.000Z"
  }
]
```

---

#### GET `/api/pdpa/living-will/:patientId/versions/:versionId`
Get specific version of living will.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": "version_xxx",
  "versionNumber": 2,
  "data": { ... },
  "createdAt": "2025-11-15T00:00:00.000Z"
}
```

---

#### POST `/api/pdpa/living-will/:patientId/rollback/:versionId`
Rollback to a previous version.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": { ... },
  "message": "Rolled back to version 2"
}
```

---

### 5.3.6 AI Services (`/api/ai`)

#### POST `/api/ai/chat`
Chat with AI health assistant.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "message": "I have a headache and fever",
  "conversationHistory": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hello! How can I help?" }
  ]
}
```

**Response (200):**
```json
{
  "reply": "I'm sorry to hear that. A headache combined with fever could indicate..."
}
```

---

#### POST `/api/ai/symptom-checker`
Analyze symptoms with AI.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "symptoms": "Headache, fever, body aches for 2 days",
  "patientContext": {
    "age": 35,
    "gender": "male",
    "allergies": ["Penicillin"],
    "chronicConditions": ["Hypertension"]
  }
}
```

**Response (200):**
```json
{
  "triage": "routine",
  "summary": "Based on your symptoms...",
  "recommendations": [
    "Rest and stay hydrated",
    "Monitor temperature"
  ],
  "suggestedActions": [
    "Schedule appointment if fever persists"
  ],
  "warningSign": false,
  "possibleConditions": ["Common cold", "Flu"]
}
```

---

### 5.3.7 Google Services (`/api/google`)

#### POST `/api/google/calendar/event`
Create calendar event.

**Request Body:**
```json
{
  "summary": "Doctor Appointment",
  "description": "Consultation with Dr. Smith",
  "startDateTime": "2025-12-10T10:00:00+07:00",
  "endDateTime": "2025-12-10T11:00:00+07:00",
  "location": "Bangkok Hospital",
  "attendees": [
    { "email": "patient@example.com" },
    { "email": "doctor@example.com" }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "calendarUrl": "https://calendar.google.com/calendar/event?eid=xxx",
  "event": { ... }
}
```

---

#### POST `/api/google/meet/create`
Create Google Meet link.

**Request Body:**
```json
{
  "appointmentId": "apt_xxx",
  "patientId": "patient_xxx",
  "doctorId": "doctor_xxx",
  "startDateTime": "2025-12-10T10:00:00+07:00",
  "endDateTime": "2025-12-10T11:00:00+07:00",
  "patientName": "John Doe",
  "doctorName": "Dr. Smith"
}
```

**Response (200):**
```json
{
  "success": true,
  "meetLink": "https://meet.google.com/xxx-yyy-zzz",
  "appointmentId": "apt_xxx"
}
```

---

#### GET `/api/google/maps/nearby`
Search nearby healthcare facilities.

**Query Parameters:**
- `location`: "lat,lng" (required)
- `type`: "hospital" | "pharmacy" | "doctor" (optional)
- `radius`: number in meters (optional, default 5000)
- `keyword`: search term (optional)

**Response (200):**
```json
{
  "success": true,
  "results": [
    {
      "place_id": "xxx",
      "name": "Bangkok Hospital",
      "vicinity": "123 Sukhumvit Road",
      "geometry": { "location": { "lat": 13.7563, "lng": 100.5018 } },
      "rating": 4.5,
      "opening_hours": { "open_now": true }
    }
  ],
  "query": { "location": "13.7563,100.5018", "radius": 5000 }
}
```

---

### 5.3.8 Health Check

#### GET `/health`
Server health check.

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-07T10:00:00.000Z",
  "service": "Izara Patient Portal API"
}
```

---

#### GET `/api/health/gcs`
GCS connection status.

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-07T10:00:00.000Z",
  "buckets": [
    { "name": "AUTH", "bucket": "izara-users-credentials", "connected": true },
    { "name": "PATIENT", "bucket": "izara-patients-data", "connected": true },
    { "name": "DOCTOR", "bucket": "izara-doctors-data", "connected": true },
    { "name": "APPOINTMENTS", "bucket": "izara-appointments", "connected": true },
    { "name": "METADATA", "bucket": "izara-meta-data", "connected": true }
  ]
}
```

---

## 5.4 Error Responses

All endpoints may return error responses in this format:

```json
{
  "error": "Error message",
  "message": "Detailed error description (optional)"
}
```

**Common HTTP Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid/missing token |
| 403 | Forbidden - No permission |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

---

[← Previous: Database Schema](./04-database-schema.dbml) | [Next: Feature Workflows →](./06-workflows.md)
