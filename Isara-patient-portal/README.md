# 🏥 Izara Patient Portal

![Version](<https://img.shields.io/badge/version-1.5.10-blue.svg)>
![TypeScript](<https://img.shields.io/badge/TypeScript-5.2-blue.svg)>
![React](<https://img.shields.io/badge/React-18-61dafb.svg)>
![Node.js](<https://img.shields.io/badge/Node.js-22+-green.svg)>
![Vite](<https://img.shields.io/badge/Vite-7-646CFF.svg)>
![Database](<https://img.shields.io/badge/database-PostgreSQL%2018-blue.svg)>

> Patient-facing telemedicine application with AI-powered health assistance, appointment booking, personal health records (PHR), video consultations, and nearby healthcare facility finder.

---


## 🏗 Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│            Frontend (React + Vite — Port 3005)               │
│  Dashboard │ Health Studio │ Appointments │ PHR │ AI Chat    │
│  Map (15km) │ Timeline │ Living Will │ PDPA │ Settings      │
└─────────────────────────┬────────────────────────────────────┘
                          │ REST API
┌─────────────────────────▼────────────────────────────────────┐
│            Backend API (Express.js — Port 3005)              │
│  Auth │ PHR │ Appointments │ Doctors │ PDPA │ AI (Gemini)   │
│  Notifications │ Video Meeting │ Google Maps │ Content       │
└─────────────────────────┬────────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────────┐
│          PostgreSQL 18 + pgvector (Primary Database)         │
│   Local: Docker port 5433  │  Cloud: Cloud SQL               │
└──────────────────────────────────────────────────────────────┘
```

---


## ✨ Features

| Feature | Description |
| --------- | ------------- |
| 📅 Appointment Booking | Multi-step booking with AI symptom analysis |
| 📹 Video Consultations | Jitsi Meet integration (FREE, no account needed) |
| 🎙️ Live Transcription | Real-time speech-to-text via Web Speech API (FREE) |
| 📋 Personal Health Records | Vitals, allergies, medications, lifestyle tracking |
| 🤖 AI Health Assistant | Google Gemini-powered chat with history |
| 🗺️ Healthcare Map | Find nearby clinics/hospitals (1–20 km, bilingual) |
| 🔔 Notifications | Appointment updates, meeting reminders |
| 📚 Medical Content | Health education articles with images |
| 📄 Living Will | Digital advance directive management |
| 🔒 PDPA Consent | Thailand's data protection compliance |
| 🌐 Bilingual UI | Thai (primary) + English, all pages |
| 🌙 Dark Mode | System-wide dark theme support |


---


## 🚀 Quick Start


### With Docker (Recommended)

```bash

# From the root Isara-Anywhere directory
docker compose up -d --build

# Patient Portal: <http://localhost:3005>
```


### Local Development

```bash
cd Isara-patient-portal
npm install
cp .env.example .env   # Edit with your API keys
npm run dev:all         # Frontend + Backend
```


### Test Credentials

| Role | Email | Password |
| ------ | ------- | ---------- |
| Patient 1 | `demo.test@gmail.com` | `P@ssw0rd` |
| Patient 2 | `Somchai.Mankong@gmail.com` | `P@ssw0rd` |
| Patient 3 | `Anan.Khayanrian@gmail.com` | `P@ssw0rd` |


---


## 📁 Project Structure

```text
Isara-patient-portal/
├── src/                          # Frontend Source
│   ├── components/               # Reusable UI Components
│   │   ├── layout/               #   MainLayout, sidebar, header
│   │   ├── ui/                   #   Buttons, cards, modals, inputs
│   │   ├── health/               #   HealthStudio, VitalsChart, AIChat
│   │   ├── map/                  #   MiniMapWidget
│   │   ├── appointments/         #   SymptomInputStep
│   │   └── notifications/        #   NotificationBell
│   ├── pages/                    # Route Pages
│   │   ├── dashboard/            #   DashboardPage + Health Studio
│   │   ├── appointments/         #   Booking, list, details
│   │   ├── health/               #   PHR, AI Doctor, Medical Content
│   │   ├── map/                  #   MapPage (15km healthcare finder)
│   │   ├── auth/                 #   Login, Register, Reset Password
│   │   ├── pdpa/                 #   PDPA consent, Living Will
│   │   ├── profile/              #   User profile management
│   │   ├── settings/             #   Theme & language settings
│   │   └── timeline/             #   Medical history timeline
│   ├── contexts/                 # React Contexts (Auth, Settings)
│   ├── lib/                      # API client & service layer
│   └── types/                    # TypeScript definitions
├── server/                       # Backend API (Express.js)
│   ├── index.ts                  # Server entry point
│   ├── middleware/auth.ts        # JWT authentication
│   ├── security/                 # OWASP middleware
│   ├── services/                 # PostgreSQL data service
│   └── routes/                   # 13 API route modules
├── doc/                          # Documentation (18 files)
├── Dockerfile.unified            # Docker image (frontend + backend)
├── package.json                  # Dependencies & scripts
├── vite.config.ts                # Vite configuration
└── tailwind.config.js            # Tailwind CSS configuration
```

---


## 📡 API Endpoints

| Area | Key Endpoints |
| ------ | --------------- |
| Auth | `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/me` |
| PHR | `GET /api/phr/:userId`, `PUT /api/phr/:userId`, `POST /api/phr/:userId/vitals` |
| Appointments | `GET /api/appointments/patient/:id`, `POST /api/appointments` |
| AI | `POST /api/ai/chat`, `POST /api/ai/analyze` |
| Video | `POST /api/video-meeting/create`, `GET /api/video-meeting/health` |
| Map | `GET /api/google/places/nearby`, `GET /api/google/places/details` |
| Content | `GET /api/content/medical`, `GET /api/content/clinical` |
| Notifications | `GET /api/notifications/:userId`, `POST /api/notifications` |
| PDPA | `GET /api/pdpa/consent/:userId`, `POST /api/pdpa/consent` |


---


## ⚙️ Environment Configuration

| Variable | Purpose |
| ---------- | --------- |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps & Places API |
| `VITE_GEMINI_API_KEY` | Client-side AI chat |
| `GEMINI_API_KEY` | Server-side AI processing |
| `VITE_MEETING_SERVER_URL` | Jitsi meeting server URL |
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | Server port (default: 3005) |


---


## 🔒 Security


- **OWASP Top 10:2025** compliant middleware

- **bcrypt** password hashing (10 rounds)

- **Helmet.js** security headers (CSP, HSTS, XSS)

- **Rate limiting** on authentication endpoints

- **PDPA** consent management for Thailand compliance

---


## 📄 License

MIT License

---

**Izara Patient Portal v1.5.7** — Empowering patients with AI-driven healthcare access 🏥
