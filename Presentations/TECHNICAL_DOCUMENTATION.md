# Izara Telemedicine Platform - Technical Documentation

> **Version:** 3.1.0 (Updated Jan 2026)
> **Status:** Phase 1 Complete (Cloud Deployment Ready)
> **Stack:** PostgreSQL / Express / React / Jitsi / Gemini AI / Google Cloud

---

## 🏗️ 1. Project Overview & Structure

### Project Structure (File Tree)
```
Isara-Anywhere/
├── credentials/                # Google Cloud Service Account Keys (Private)
├── Isara-patient-portal/       # 📱 Patient Front-end Application
│   ├── src/                    # React Source Code
│   ├── server/                 # Express Backend API (Port 3005)
│   └── Dockerfile.unified      # Production Container Config
├── Isara-doctor-portal/        # 💻 Doctor Clinical Application
│   ├── src/                    # React Source Code
│   ├── server/                 # Express Backend API (Port 3010)
│   └── Dockerfile.unified      # Production Container Config
├── Izara-jitsi-server/         # 📹 Video Meeting & Transcription Service (Port 3020)
├── Presentations/              # 📚 Documentation Hub
│   ├── database/               # DBML Schemas & Architecture
│   └── diagrams/               # Mermaid.js Workflow Diagrams
├── scripts/                    # 🛠️ DevOps & Database Scripts
│   ├── database/               # SQL Init Scripts (init-database.sql)
│   └── deploy.ps1              # Unified Deployment Automator
└── docker-compose.yml          # Local Orchestration Config
```

### Core Services
| Service | Port | Description |
|---------|------|-------------|
| **Patient Portal** | 3005 | Telehealth booking, PHR management, Symptom checker |
| **Doctor Portal** | 3010 | EMR, Prescribing, Appointment management, Tele-consultation |
| **Meeting Server** | 3020 | Jitsi Meet integration, recording handling, AI transcription |
| **PostgreSQL** | 5432/33 | Primary relational database (User data, Clinical records) |
| **pgAdmin** | 5050 | Database management UI |

---

## 🏛️ 2. System Architecture

The platform uses a **Hybrid Cloud-Native Architecture**:
- **Application Logic**: Containerized Node.js/React apps on Cloud Run.
- **Data Persistence**: Managed PostgreSQL (Cloud SQL or Local) for structured data.
- **File Storage**: Google Cloud Storage (GCS) for unstructured data (Documents, Images, Recordings).
- **Communication**: Jitsi Meet for real-time video, Socket.IO for signaling.

### Visualization
See `Presentations/diagrams/01-system-architecture.mmd` for the high-level diagram.
> **Interactive View:** [Open System Architecture Diagram](html-diagrams/01-system-architecture.html) or [View All Diagrams](html-diagrams/index.html)

---

## 💾 3. Database Design

### Schema Overview
The system has migrated from a JSON-based GCS storage to a robust **PostgreSQL Relational Database**.

**Key Features:**
- **Ref integrity**: Foreign keys ensure data consistency.
- **JSONB**: Used for flexible clinical data items (e.g., `symptoms`, `medications` list).
- **pgvector**: Enabled for AI Knowledge Base (RAG) embeddings.

**Schema Reference:**
- **Source of Truth**: `Presentations/database/izara-complete-schema-v3.dbml`
- **SQL Source**: `scripts/database/izara-database.sql`

**Core Tables:**
1. **Users & Auth**: `users`, `sessions`, `roles`
2. **Clinical**: `emr`, `prescriptions`, `lab_orders`
3. **Patient Health Service**: `patient_profiles`, `phr`, `vital_signs`
4. **Operations**: `appointments`, `meeting_records`
5. **Knowledge**: `medical_content`, `knowledge_base` (Vector Store)

---

## 🔐 4. User Management & Access Control

### User Roles (RBAC)
| Role | Access Level | Description |
|------|--------------|-------------|
| **Patient** | Basic | Can access own profile, book appointments, view own health records. |
| **Doctor** | Elevated | Can view assigned patient records, create EMR notes, prescribe. Requires admin approval. |
| **Admin** | System | Can manage user accounts, approve doctors, manage system content. |

### Authentication Security
1. **Password Hashing**: Uses `bcrypt` for secure storage.
2. **Session Management**: Server-side sessions stored in DB (`sessions` table) with secure HTTP-only cookies.
3. **API Security**: Middleware validates session tokens for all protected routes.

---

## 🔄 5. Core Workflows

The system workflows are documented in **Mermaid.js** format in `Presentations/diagrams/`.
> **[📂 Browse All Interactive Workflow Diagrams](html-diagrams/index.html)**

### 1. Appointment & Consultation
- **Patient** books slot -> **System** notifies Doctor -> **Doctor** confirms.
- **Jitsi Meet** link generated automatically upon confirmation.
- **Consultation**: Video call -> AI Transcription -> Auto-Summary generated.
- [View Diagram](html-diagrams/04-appointment-workflow.html)

### 2. Clinical Documentation (EMR)
- **SOAP Format**: Subjective, Objective, Assessment, Plan.
- **AI Assist**: Gemini analyzes transcript to suggest Assessment/Plan.
- **Prescribing**: Meds selected from database -> Drug Interaction Check -> Saved to DB.
- [View Diagram](html-diagrams/06-emr-workflow.html)

### 3. Patient Health Record (PHR)
- **Centralized**: Patients own their data.
- **Sync**: Vitals and history updated via Portal -> Saved to PostgreSQL.
- **Sharing**: Granular permission model for sharing records with doctors (Future Scope).
- [View Diagram](html-diagrams/14-phr-workflow.html)

---

## 🚀 6. Future Development Roadmap

### Phase 2: Intelligence & Optimization
- [ ] **Advanced AI**: RAG implementation using `knowledge_base` vector store for clinical decision support.
- [ ] **Mobile App**: React Native wrapper for Patient Portal.
- [ ] **IoMT Integration**: Direct integration with wearable devices for vital signs.
- [ ] **Payment Gateway**: Integration with Stripe/Omise for consultation fees.

### Phase 3: Scaling
- [ ] **Microservices Split**: Decouple Auth and Notification services.
- [ ] **Multi-Region**: Replicate GCS buckets and DB read replicas.

---

*For detailed setup instructions, refer to `SETUP_GUIDE.md` in the root directory.*
