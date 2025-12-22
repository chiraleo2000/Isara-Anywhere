# 🔌 API Reference

## Overview

The Izara Doctor Portal exposes APIs through three backend servers. This document provides complete API reference for all endpoints.

---

## 🖧 Server Architecture

| Server | Port | Base URL | Purpose |
|--------|------|----------|---------|
| Auth Server | 3011 | `http://localhost:3011` | Authentication, user management |
| GCS API Server | 3012 | `http://localhost:3012` | Google Cloud Storage operations |
| Main API Server | 3009 | `http://localhost:3009` | Business logic, integrations |

---

## 🔐 Authentication Server (Port 3011)

### Base Configuration

```
Base URL: http://localhost:3011
Content-Type: application/json
```

### Endpoints

---

### `POST /auth/login`

Authenticate user and create session.

**Request:**
```json
{
  "email": "doctor@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "DOC-1234-567",
    "email": "doctor@example.com",
    "name": "Dr. Smith",
    "role": "doctor",
    "doctorId": "DOC-1234-567",
    "medicalLicenseNumber": "MD-123456",
    "isActive": true,
    "emailVerified": true,
    "isAdmin": false,
    "preferences": {
      "theme": "light",
      "language": "en",
      "notifications": { "email": true, "push": true, "sms": false }
    }
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error Responses:**
- `401` - Invalid credentials
- `403` - Account locked / not approved
- `400` - Missing required fields

---

### `POST /auth/register`

Register a new doctor account (requires admin approval).

**Request:**
```json
{
  "email": "newdoctor@example.com",
  "password": "SecurePass123!",
  "name": "Dr. New Doctor",
  "phone": "+66-81-234-5678",
  "specialty": "Cardiology",
  "medicalLicenseNumber": "MD-654321",
  "dateOfBirth": "1985-05-15"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Registration successful. Awaiting admin approval.",
  "userId": "DOC-5678-901",
  "approvalStatus": "pending"
}
```

**Error Responses:**
- `400` - Validation error / email exists
- `409` - License number already registered

---

### `POST /auth/logout`

Invalidate current session.

**Headers:**
```
Authorization: Bearer {token}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### `GET /auth/me`

Get current user information.

**Headers:**
```
Authorization: Bearer {token}
```

**Success Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "DOC-1234-567",
    "email": "doctor@example.com",
    "name": "Dr. Smith",
    "role": "doctor",
    "isAdmin": false,
    "preferences": { ... }
  }
}
```

---

### `POST /auth/verify`

Verify session token validity.

**Request:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "valid": true,
  "user": { ... }
}
```

---

### `POST /auth/forgot-password`

Request password reset.

**Request:**
```json
{
  "email": "doctor@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

---

### `POST /auth/reset-password`

Reset password with token.

**Request:**
```json
{
  "token": "reset-token-xxx",
  "newPassword": "NewSecurePass123!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

---

### `PUT /auth/profile`

Update user profile.

**Headers:**
```
Authorization: Bearer {token}
```

**Request:**
```json
{
  "name": "Dr. Updated Name",
  "phone": "+66-81-999-9999",
  "specialty": "Internal Medicine",
  "preferences": {
    "theme": "dark",
    "language": "th"
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile updated",
  "user": { ... }
}
```

---

### Admin Endpoints (Requires Admin Role)

### `GET /auth/users`

List all users (admin only).

**Headers:**
```
Authorization: Bearer {admin-token}
```

**Query Parameters:**
- `role` - Filter by role (doctor, admin)
- `status` - Filter by approval status (pending, approved, rejected)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Success Response (200):**
```json
{
  "success": true,
  "users": [ ... ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

### `POST /auth/approve`

Approve or reject doctor registration (admin only).

**Headers:**
```
Authorization: Bearer {admin-token}
```

**Request:**
```json
{
  "userId": "DOC-5678-901",
  "action": "approve",
  "notes": "Verified medical license"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "User approved successfully",
  "user": { ... }
}
```

---

### `PUT /auth/users/:userId/toggle-active`

Enable/disable user account (admin only).

**Headers:**
```
Authorization: Bearer {admin-token}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "User status updated",
  "isActive": false
}
```

---

## 📦 GCS API Server (Port 3012)

### Base Configuration

```
Base URL: http://localhost:3012
Content-Type: application/json
Authorization: Bearer {token}
```

---

### Doctor Endpoints

### `GET /api/doctors`

List all approved doctors.

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "DOC-1234-567",
      "name": "Dr. Smith",
      "specialty": "Internal Medicine",
      "rating": 4.8,
      "isApproved": true
    }
  ]
}
```

---

### `GET /api/doctors/:id`

Get doctor details.

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "DOC-1234-567",
    "name": "Dr. Smith",
    "specialty": "Internal Medicine",
    "qualifications": [ ... ],
    "availableSlots": [ ... ]
  }
}
```

---

### Patient Endpoints

### `GET /api/patients`

List all patients.

**Query Parameters:**
- `search` - Search by name or ID
- `riskLevel` - Filter by risk level
- `isActive` - Filter by active status

**Success Response (200):**
```json
{
  "success": true,
  "data": [ ... ],
  "count": 100
}
```

---

### `GET /api/patients/:id`

Get patient details.

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "PAT-2024-0001",
    "demographics": { ... },
    "contact": { ... },
    "medicalInfo": { ... },
    "consentStatus": { ... }
  }
}
```

---

### `POST /api/patients`

Create new patient.

**Request:**
```json
{
  "demographics": {
    "name": "New Patient",
    "dateOfBirth": "1990-01-01",
    "gender": "male",
    "idNumber": "1-2345-67890-12-3"
  },
  "contact": {
    "phone": "+66-81-234-5678",
    "email": "patient@example.com",
    "address": "123 Main St"
  }
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Patient created",
  "data": { "id": "PAT-2024-0002", ... }
}
```

---

### `PUT /api/patients/:id`

Update patient information.

**Request:**
```json
{
  "contact": {
    "phone": "+66-81-999-9999"
  },
  "medicalInfo": {
    "allergies": ["Penicillin", "Aspirin"]
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Patient updated",
  "data": { ... }
}
```

---

### EMR Endpoints

### `GET /api/emr/:patientId`

List EMRs for a patient.

**Query Parameters:**
- `startDate` - Filter by start date
- `endDate` - Filter by end date
- `status` - Filter by status (draft, finalized, amended)

**Success Response (200):**
```json
{
  "success": true,
  "data": [ ... ],
  "count": 5
}
```

---

### `GET /api/emr/:patientId/:emrId`

Get specific EMR record.

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "EMR-2024-0001-001",
    "chiefComplaint": "...",
    "diagnosis": [ ... ],
    "prescriptions": [ ... ]
  }
}
```

---

### `POST /api/emr/:patientId`

Create new EMR.

**Request:**
```json
{
  "encounterType": "consultation",
  "chiefComplaint": "Patient complaint",
  "vitalSigns": {
    "bloodPressure": { "systolic": 120, "diastolic": 80 },
    "heartRate": { "value": 72 }
  },
  "assessment": "Assessment text",
  "diagnosis": [
    { "code": "I10", "description": "Hypertension", "type": "primary" }
  ],
  "treatmentPlan": "Treatment plan"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "EMR created",
  "data": { "id": "EMR-2024-0001-002", ... }
}
```

---

### `PUT /api/emr/:patientId/:emrId`

Update EMR record.

**Success Response (200):**
```json
{
  "success": true,
  "message": "EMR updated",
  "data": { ... }
}
```

---

### `POST /api/emr/:patientId/:emrId/finalize`

Finalize EMR (lock for editing).

**Request:**
```json
{
  "digitalSignature": "DR-SMITH-2024-06-15"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "EMR finalized",
  "data": { "status": "finalized" }
}
```

---

### Prescription Endpoints

### `GET /api/prescriptions/:patientId`

List prescriptions for a patient.

**Success Response (200):**
```json
{
  "success": true,
  "data": [ ... ]
}
```

---

### `POST /api/prescriptions/:patientId`

Create new prescription.

**Request:**
```json
{
  "medications": [
    {
      "drugName": "Amlodipine",
      "genericName": "Amlodipine",
      "dosage": "1 tablet",
      "strength": "5mg",
      "route": "oral",
      "frequency": "Once daily",
      "duration": "30 days",
      "quantity": 30,
      "refills": 2,
      "instructions": "Take in the morning"
    }
  ],
  "emrId": "EMR-2024-0001-001"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Prescription created",
  "data": { "id": "RX-2024-0001-001", ... }
}
```

---

### Lab Order Endpoints

### `GET /api/lab-orders/:patientId`

List lab orders for a patient.

---

### `POST /api/lab-orders/:patientId`

Create new lab order.

**Request:**
```json
{
  "tests": [
    { "testCode": "CBC", "testName": "Complete Blood Count" },
    { "testCode": "CMP", "testName": "Comprehensive Metabolic Panel" }
  ],
  "clinicalIndication": "Routine monitoring",
  "urgency": "routine"
}
```

---

### Appointment Endpoints

### `GET /api/appointments`

List all appointments.

**Query Parameters:**
- `doctorId` - Filter by doctor
- `patientId` - Filter by patient
- `status` - Filter by status
- `date` - Filter by date
- `startDate` / `endDate` - Date range

---

### `GET /api/appointments/:id`

Get appointment details.

---

### `POST /api/appointments`

Create new appointment.

**Request:**
```json
{
  "patientId": "PAT-2024-0001",
  "doctorId": "DOC-1234-567",
  "date": "2024-06-20T10:00:00.000Z",
  "type": "Telehealth",
  "symptoms": ["Headache", "Fatigue"],
  "notes": "Follow up consultation"
}
```

---

### `PUT /api/appointments/:id`

Update appointment.

---

### `PUT /api/appointments/:id/status`

Update appointment status.

**Request:**
```json
{
  "status": "Confirmed",
  "notes": "Confirmed via phone"
}
```

---

### Queue Endpoints

### `GET /api/queue/:doctorId`

Get doctor's patient queue.

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "Q-001",
      "patientName": "John Doe",
      "queuePosition": 1,
      "status": "waiting",
      "priority": "routine",
      "estimatedWaitTime": 15
    }
  ]
}
```

---

### `POST /api/queue/:doctorId`

Add patient to queue.

**Request:**
```json
{
  "patientId": "PAT-2024-0001",
  "appointmentId": "APT-2024-0615-001",
  "reason": "Follow up",
  "priority": "routine"
}
```

---

### `PUT /api/queue/:doctorId/:queueId`

Update queue item (status, position).

**Request:**
```json
{
  "status": "in-consultation"
}
```

---

### `DELETE /api/queue/:doctorId/:queueId`

Remove from queue.

---

### Reference Data Endpoints

### `GET /api/medications`

Get drug database.

**Query Parameters:**
- `search` - Search drug name
- `category` - Filter by category

---

### `GET /api/lab-tests`

Get lab test catalog.

---

### `GET /api/icd10`

Get ICD-10 codes.

**Query Parameters:**
- `search` - Search code or description

---

## 🖧 Main API Server (Port 3009)

### Meeting Endpoints

### `POST /api/meetings/create`

Create meeting session.

**Request:**
```json
{
  "appointmentId": "APT-2024-0615-001"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "meetingId": "MEET-2024-0615-001",
    "meetLink": "https://meet.google.com/xxx-yyyy-zzz"
  }
}
```

---

### `POST /api/meetings/:id/join`

Record participant join.

---

### `POST /api/meetings/:id/leave`

Record participant leave.

---

### `POST /api/meetings/:id/end`

End meeting session.

---

### `GET /api/meetings/:id/summary`

Get AI-generated meeting summary.

---

### AI Endpoints

### `POST /api/ai/analyze`

Analyze clinical data with AI.

**Request:**
```json
{
  "type": "symptoms",
  "data": {
    "symptoms": ["chest pain", "shortness of breath"],
    "patientHistory": { ... }
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "analysis": {
    "possibleConditions": [ ... ],
    "recommendedTests": [ ... ],
    "redFlags": [ ... ],
    "confidence": 0.85
  }
}
```

---

### `POST /api/ai/summarize`

Summarize consultation.

---

### `POST /api/ai/suggest-treatment`

Get treatment suggestions.

---

## 🔒 Authentication Headers

All protected endpoints require:

```
Authorization: Bearer {jwt-token}
```

### Token Structure

```json
{
  "userId": "DOC-1234-567",
  "email": "doctor@example.com",
  "role": "doctor",
  "isAdmin": false,
  "iat": 1718892000,
  "exp": 1718978400
}
```

---

## 📊 Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - validation error |
| 401 | Unauthorized - invalid/missing token |
| 403 | Forbidden - insufficient permissions |
| 404 | Not Found |
| 409 | Conflict - duplicate resource |
| 422 | Unprocessable Entity |
| 500 | Internal Server Error |

---

## 🔄 WebSocket Events

### Connection

```javascript
const socket = io('http://localhost:3009', {
  path: '/ws',
  auth: { token: 'jwt-token' }
});
```

### Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `queue:update` | Server → Client | Queue changed |
| `appointment:status` | Server → Client | Appointment status changed |
| `meeting:participant` | Server → Client | Participant joined/left |
| `notification:new` | Server → Client | New notification |

---

## 🛡️ Rate Limiting

| Endpoint Type | Limit |
|---------------|-------|
| Authentication | 5 requests/minute |
| API Read | 100 requests/minute |
| API Write | 30 requests/minute |
| AI Endpoints | 10 requests/minute |
