# Izara Telehealth - API Reference

## Overview

Both portals share common backend services running on Express.js.

| Server | Port | Base URL |
|--------|------|----------|
| Patient API | 3004 | http://localhost:3004/api |
| Doctor Main API | 3009 | http://localhost:3009/api |
| Auth Server | 3011 | http://localhost:3011/auth |
| GCS API | 3012 | http://localhost:3012/api |

---

## Authentication API (Port 3011)

### Patient Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new patient |
| POST | `/auth/login` | Patient login |
| POST | `/auth/logout` | End session |
| GET | `/auth/validate-session` | Check session valid |
| GET | `/auth/me` | Get current user |

### Doctor Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new doctor |
| POST | `/auth/login` | Doctor login |
| POST | `/auth/logout` | End session |
| GET | `/auth/validate-session` | Check session valid |
| GET | `/auth/me` | Get current user |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/pending-doctors` | List all doctors |
| POST | `/admin/approve-doctor` | Approve doctor |
| POST | `/admin/reject-doctor` | Reject doctor |
| POST | `/admin/update-role` | Change user role |

---

## Request/Response Examples

### Register Patient

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "EXAMPLE_PASSWORD",
  "name": "John Doe",
  "phone": "0812345678",
  "dateOfBirth": "1990-01-15"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Registration successful",
  "userId": "PAT-1702500000000-abc123"
}
```

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "EXAMPLE_PASSWORD"
}
```

**Success Response:**
```json
{
  "success": true,
  "token": "abc123def456...",
  "user": {
    "id": "PAT-xxx",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "patient"
  }
}
```

---

## GCS API (Port 3012)

### Patient Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/patients/:id` | Get patient profile |
| PUT | `/api/patients/:id` | Update patient profile |
| GET | `/api/patients/:id/phr` | Get health records |
| PUT | `/api/patients/:id/phr` | Update health records |

### Doctor Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/doctors` | List all doctors |
| GET | `/api/doctors/:id` | Get doctor profile |
| PUT | `/api/doctors/:id` | Update doctor profile |

### Appointments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/appointments` | List appointments |
| POST | `/api/appointments` | Create appointment |
| GET | `/api/appointments/:id` | Get appointment |
| PUT | `/api/appointments/:id` | Update appointment |
| POST | `/api/appointments/:id/confirm` | Confirm appointment |
| POST | `/api/appointments/:id/decline` | Decline appointment |
| POST | `/api/appointments/:id/complete` | Mark complete |

### Clinical Resources

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/clinical-resources` | List resources |
| POST | `/api/clinical-resources` | Create resource |
| GET | `/api/clinical-resources/:id` | Get resource |
| PUT | `/api/clinical-resources/:id` | Update resource |
| DELETE | `/api/clinical-resources/:id` | Delete resource |
| POST | `/api/clinical-resources/:id/approve` | Approve (admin) |
| POST | `/api/clinical-resources/:id/reject` | Reject (admin) |

### Medical Consultants

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/medical-consultants` | List consultants |
| POST | `/api/medical-consultants` | Create (admin) |
| GET | `/api/medical-consultants/:id` | Get consultant |
| PUT | `/api/medical-consultants/:id` | Update (admin) |
| DELETE | `/api/medical-consultants/:id` | Delete (admin) |
| POST | `/api/medical-consultants/:id/reviews` | Add review |

---

## Appointment Request

```http
POST /api/appointments
Content-Type: application/json
Authorization: Bearer {token}

{
  "patientId": "PAT-xxx",
  "symptoms": "Headache and fever for 2 days",
  "duration": "2 days",
  "severity": "normal",
  "requestedDate": "2025-12-20",
  "requestedTime": "10:00",
  "appointmentType": "online"
}
```

**Response:**
```json
{
  "success": true,
  "appointment": {
    "id": "APT-xxx",
    "status": "pending",
    "createdAt": "2025-12-14T10:00:00Z"
  }
}
```

---

## Confirm Appointment

```http
POST /api/appointments/:id/confirm
Content-Type: application/json
Authorization: Bearer {token}

{
  "confirmedDate": "2025-12-20",
  "confirmedTime": "10:00",
  "notes": "Please have your medications ready"
}
```

**Response:**
```json
{
  "success": true,
  "appointment": {
    "id": "APT-xxx",
    "status": "confirmed",
    "meetLink": "https://meet.jit.si/izara-APT-xxx"
  }
}
```

---

## Video Meeting API

### End Meeting with Recording Upload

```http
POST /api/video-meeting/:appointmentId/end
Content-Type: application/json
Authorization: Bearer {token}

{
  "doctorId": "DOC-001",
  "generateSummary": true,
  "generateRecommendations": true,
  "audioBase64": "...",  // Optional: Base64-encoded audio
  "videoBase64": "..."   // Optional: Base64-encoded video
}
```

**Response:**
```json
{
  "success": true,
  "transcript": "หมอ: สวัสดีครับ...",
  "summary": "## สรุปการปรึกษา\n...",
  "recommendations": "## คำแนะนำสำหรับแพทย์\n...",
  "storagePaths": {
    "recording": "doctors/DOC-001/meetings/APT-xxx/recording.webm",
    "transcript": "doctors/DOC-001/meetings/APT-xxx/transcript.txt",
    "summary": "doctors/DOC-001/meetings/APT-xxx/summary.txt",
    "recommendations": "doctors/DOC-001/meetings/APT-xxx/recommendations.txt"
  }
}
```

### Get Meeting Files

```http
GET /api/video-meeting/:appointmentId/files?doctorId=DOC-001
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "files": {
    "transcript": "หมอ: สวัสดีครับ...",
    "summary": "## สรุปการปรึกษา\n...",
    "recommendations": "## คำแนะนำสำหรับแพทย์\n..."
  }
}
```

### Upload Recording (Separate)

```http
POST /api/video-meeting/:appointmentId/upload-recording
Content-Type: application/json
Authorization: Bearer {token}

{
  "doctorId": "DOC-001",
  "videoBase64": "...",
  "mimeType": "video/webm"
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message description",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `SESSION_EXPIRED` | 401 | Token expired |
| `UNAUTHORIZED` | 403 | Permission denied |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid input |
| `RATE_LIMITED` | 429 | Too many requests |
| `ACCOUNT_LOCKED` | 423 | Account locked |

---

## Headers

### Required Headers

| Header | Value | Required For |
|--------|-------|--------------|
| `Content-Type` | `application/json` | All POST/PUT |
| `Authorization` | `Bearer {token}` | Protected routes |

### Optional Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Request-ID` | UUID | Request tracking |
| `Accept-Language` | `th` or `en` | Response language |

---

## Video Meeting API (Patient Portal - Port 3004)

### Meeting Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/video-meeting/invite-guest` | Invite external guest |
| POST | `/api/video-meeting/validate-invite` | Validate invite token |
| POST | `/api/video-meeting/revoke-invite` | Revoke guest invite |
| GET | `/api/video-meeting/:appointmentId/invites` | List invites |

### Guest Types

| Type | Who Can Invite | Description |
|------|----------------|-------------|
| `patient_relative` | Patient | Family member |
| `patient_partner` | Patient | Spouse/Partner |
| `doctor_specialist` | Doctor | Medical specialist |
| `doctor_advisor` | Doctor | Medical advisor |
| `other` | Both | Other guests |

### Invite Guest Example

```http
POST /api/video-meeting/invite-guest
Content-Type: application/json
Authorization: Bearer {token}

{
  "appointmentId": "APT-xxx",
  "guestEmail": "relative@gmail.com",
  "guestName": "Family Member",
  "relationship": "patient_relative"
}
```

**Success Response:**
```json
{
  "success": true,
  "inviteId": "INV-xxx",
  "inviteToken": "abc123...",
  "inviteUrl": "https://izara-patient-portal.../join?token=abc123...",
  "expiresAt": "2026-01-08T12:00:00Z"
}
```

---
**Last Updated:** January 9, 2026
**Version:** 1.2.1


