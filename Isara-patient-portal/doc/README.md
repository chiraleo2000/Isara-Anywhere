# Isara Patient Portal Documentation

## 📋 Table of Contents

1. [Project Overview](./01-overview.md)
2. [Architecture](./02-architecture.md)
3. [Data Structures](./03-data-structures.md)
4. [Database Schema (DBML)](./04-database-schema.dbml)
5. [API Reference](./05-api-reference.md)
6. [Feature Workflows](./06-workflows.md)
7. [Authentication Flow](./07-authentication.md)
8. [PDPA & Consent Management](./08-pdpa-consent.md)
9. [Appointment System](./09-appointments.md)
10. [Health Records (PHR)](./10-phr.md)
11. [AI Health Assistant](./11-ai-assistant.md)
12. [Google Services Integration](./12-google-services.md)
13. [Deployment Guide](./13-deployment.md)
14. [Frontend Components](./14-frontend-components.md)
15. [Glossary & Reference](./15-glossary.md)
16. [Detailed Flowcharts](./16-detailed-flowcharts.md)

### Quick References
- [📄 File Index](./FILE-INDEX.md) - Complete index of all documentation files
- [All Mermaid Diagrams](./diagrams.md)
- [Database Schema (DBML)](./04-database-schema.dbml)

---

## 🏥 Isara Patient Portal

**Version:** 1.0.0  
**Last Updated:** December 11, 2025  
**Release Stage:** Production Ready  
**Docker:** Unified Image (Frontend + Backend)

Isara Patient Portal is a comprehensive telemedicine platform designed to provide patients with seamless access to healthcare services, personal health records, appointment management, and AI-powered health assistance.

### Version History

| Version | Date | Changes |
|---------|------|--------|
| 1.0.0 | Dec 11, 2025 | Production release, Unified Docker Image, Cloud Run deployment |
| 0.0.2 | Dec 7, 2025 | Added Living Will versioning, AI Health Chat, Treatment Results filtering |
| 0.0.1 | Nov 2025 | Initial development release |

### Quick Start (Docker)

```bash
# Build unified image
docker build -f Dockerfile.unified -t isara-patient-portal:latest .

# Run locally
docker run -p 3004:3004 -e NODE_ENV=production isara-patient-portal:latest

# Access: http://localhost:3004
```

---

## 🌟 Key Features

| Feature | Description | Status |
|---------|-------------|--------|
| 🔐 Authentication | Secure login/registration with session management | ✅ Active |
| 📅 Appointments | Book, manage, and track appointments | ✅ Active |
| 📋 PHR | Personal Health Records management | ✅ Active |
| 🤖 AI Health Assistant | AI-powered health chat and symptom checking | ✅ Active |
| 📍 Map Integration | Find nearby healthcare facilities | ✅ Active |
| 📜 PDPA Consent | Thai PDPA compliance and consent management | ✅ Active |
| 📝 Living Will | Advanced healthcare directive management with versioning | ✅ Active |
| 🎥 Telehealth | Video consultations via Google Meet | ✅ Active |

---

## 🛠 Technology Stack

### Frontend
- **Framework:** React 18 with TypeScript
- **Routing:** React Router v6
- **Styling:** Tailwind CSS
- **Build Tool:** Vite
- **Icons:** Lucide React

### Backend
- **Runtime:** Node.js with Express
- **Language:** TypeScript
- **Storage:** Google Cloud Storage (GCS)
- **AI:** Gemini API integration

### Cloud Services
- **Google Cloud Storage** - Data persistence
- **Google Calendar API** - Appointment scheduling
- **Google Meet API** - Video consultations
- **Google Maps API** - Location services

---

## 📁 Project Structure

```
Isara-patient-portal/
├── src/                    # Frontend source code
│   ├── components/         # Reusable React components
│   ├── contexts/           # React context providers
│   ├── lib/                # API services and utilities
│   ├── pages/              # Page components
│   └── types.ts            # TypeScript type definitions
├── server/                 # Backend source code
│   ├── routes/             # Express route handlers
│   ├── middleware/         # Express middleware
│   └── index.ts            # Server entry point
├── public/                 # Static assets
├── credentials/            # Service account credentials
└── doc/                    # Documentation
```

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Run development server (frontend + backend)
npm run dev:all

# Frontend only
npm run dev

# Backend only
npm run server
```

---

For detailed documentation, please refer to the individual documentation files in this folder.
