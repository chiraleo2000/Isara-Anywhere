# Izara Patient Portal - Overview

## 🏥 Introduction

The Izara Patient Portal is a healthcare platform enabling patients to manage their health digitally. Built with React and TypeScript, it provides secure access to health records, appointment booking, and AI-powered health assistance.

## 🌐 Access Information

| Environment | Frontend | Backend API |
|-------------|----------|-------------|
| Development | http://localhost:3005 | http://localhost:3004 |

### Test Accounts
| Role | Email | Password |
|------|-------|----------|
| Patient | demo.test@gmail.com | P@ssw0rd |
| Patient Relative | demo2.test@gmail.com | P@ssw0rd |

## 👤 User Type

| Role | Description |
|------|-------------|
| **Patient** | End-user who books appointments, manages health records, and accesses health services |

## 🎯 Core Features

| Feature | Description | Status |
|---------|-------------|--------|
| Dashboard | Health overview with appointments and results | ✅ |
| Appointment Booking | AI-assisted booking with symptom analysis | ✅ |
| Health Studio | PHR viewer (vitals, medications, allergies) | ✅ |
| AI Health Chat | Gemini-powered health assistant | ✅ |
| PDPA Consent | Thai privacy law compliance | ✅ |
| Living Will | Digital advance directive | ✅ |
| Profile | Personal information management | ✅ |

## 🏗️ Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Express.js (Node.js) |
| Storage | Google Cloud Storage |
| AI | Google Gemini API |

## 📁 Project Structure

```
Isara-patient-portal/
├── src/
│   ├── components/          # React components
│   │   ├── health/          # Health-related (HealthStudio, AIChat)
│   │   ├── appointments/    # Appointment components
│   │   └── ui/              # Reusable UI components
│   ├── pages/               # Page components
│   │   ├── auth/            # Login, Register
│   │   ├── dashboard/       # Main dashboard
│   │   └── appointments/    # Appointment pages
│   ├── contexts/            # AuthContext
│   └── lib/                 # API utilities
├── server/
│   ├── routes/              # API routes
│   └── middleware/          # Auth middleware
└── public/                  # Static assets
```

## 🔐 Authentication

| Property | Value |
|----------|-------|
| Method | Session-based tokens |
| Password | bcrypt hashed |
| Session | 15 minutes inactivity timeout |
| Storage | `izara-users-credentials` bucket |
| Flow | Newcomers/expired → Login → Home |

## 📊 Data Buckets

| Bucket | Purpose |
|--------|---------|
| `izara-users-credentials` | All user credentials & sessions |
| `izara-patients-data` | Patient profiles, PHR, health logs |
| `izara-appointments` | Appointment records |

## 📹 Video Meeting (Jitsi Meet)

| Feature | Description |
|---------|-------------|
| Provider | Jitsi Meet (meet.jit.si) - FREE |
| Lobby | Wait for doctor approval |
| Camera | ON by default |
| Microphone | ON by default |
| External Guests | Invite family members (non-registered) |

---
**Last Updated:** January 9, 2026
**Version:** 1.2.1
