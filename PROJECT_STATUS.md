# 🏥 Izara Telemedicine - Project Status

**Version:** 1.3.2  
**Last Updated:** January 26, 2026  
**Phase:** Phase 1 Complete ✅  
**Database:** PostgreSQL 16 + pgvector (Primary)

---

## 📊 Current Status

| Component | Status | Notes |
| ----------- | -------- | ------- |
| Patient Portal | ✅ Healthy | <http://localhost:3005> |
| Doctor Portal | ✅ Healthy | <http://localhost:3010> |
| PostgreSQL | ✅ Running | Port 5433 |
| pgAdmin | ✅ Running | Port 5050 |
| Medical Content | ✅ 6 Articles | With images |
| Clinical Resources | ✅ 11 Resources | Full library |
| Consultants | ✅ 3 Consultants | Database loaded |

---

## 🔑 Test Credentials

### Patient Portal (<http://localhost:3005>)

| Email | Password | Name |
| ------- | ---------- | ------ |
| `Somchai.Mankong@gmail.com` | `P@ssw0rd` | Somchai Mankong |
| `Anan.Khayanrian@gmail.com` | `P@ssw0rd` | Anan Khayanrian |

### Doctor Portal (<http://localhost:3010>)

| Email | Password | Role |
| ------- | ---------- | ------ |
| `somchai.prasert@izara.com` | `P@ssw0rd` | Doctor |
| `siriporn.thongchai@izara.com` | `P@ssw0rd` | Doctor |

---

## 🚀 Quick Start

```powershell
# Start all services
docker-compose up -d --build

# Check status
docker ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## ☁️ Cloud Deployment

### Deploy to Google Cloud Run

```powershell
# Deploy Patient Portal
cd Isara-patient-portal
gcloud builds submit --config=cloudbuild.yaml

# Deploy Doctor Portal
cd Isara-doctor-portal
gcloud builds submit --config=cloudbuild.yaml
```

### Upload Seed Data to Cloud SQL

```powershell
# Connect to Cloud SQL
gcloud sql connect izara-db-instance --user=izara_localdb_admin --database=izara_phase1

# Run schema (from within psql)
\i scripts/database/postgresql-schema-complete.sql
```

### Cloud URLs

| Portal | URL |
| -------- | ----- |
| Patient Portal | <https://izara-patient-portal-724889190329.asia-southeast1.run.app> |
| Doctor Portal | <https://izara-doctor-portal-724889190329.asia-southeast1.run.app> |

---

## ✅ Phase 1 Requirements Verification

### Dr. Isara's Requirements (สิ่งที่หมออิสระต้องการ)

| ID | Requirement | Status | API Endpoint |
| ---- | ------------- | -------- | -------------- |
| 2.1 | Video Call + Patient Instructions | ✅ | `/api/ai/patient-instructions` |
| 2.2 | AI Pre-Consultation Summary | ✅ | `/api/ai/pre-summary/:patientId` |
| 2.3 | AI Document/PDF Analysis | ✅ | `/api/ai/document-analysis` |
| 2.4 | Clinical Decision Support | ✅ | `/api/ai/cds` |
| 2.5 | Man-in-the-Loop | ✅ | `requiresValidation=true` |

### P. Beer's Recommendations (สิ่งที่พี่เบียร์แนะนำ)

| ID | Recommendation | Status |
| ---- | ---------------- | -------- |
| 3.1 | PostgreSQL Database | ✅ Done (No GCS) |
| 3.2 | Meeting Transcription | ✅ `/api/transcripts` |
| 3.3 | AI Knowledge System | ✅ `/api/ai/chat` |
| 3.5 | Device Speech-to-Text | ✅ Web Speech API |

### Phase 1 Scope (กรอบขอบเขต)

| ID | Feature | Status |
| ---- | --------- | -------- |
| 4.1 | Video Meeting + EMR | ✅ |
| 4.2 | AI Chat Assistance | ✅ |
| 4.3 | Man-in-the-Loop UI | ✅ |
| 4.4 | AI Summarization | ✅ |
| 4.5 | Patient Instruction Sheet | ✅ |

---

## 📁 Project Structure

Isara-Anywhere/
├── docker-compose.yml       # Container orchestration
├── Isara-patient-portal/    # Patient-facing application
├── Isara-doctor-portal/     # Doctor/Admin application
├── Processes/               # Workflow documentation
├── scripts/                 # Deployment & test scripts
│   ├── database/           # SQL schemas
│   ├── tests/              # Test suites
│   └── db/                 # Database initialization
└── credentials/             # Service account (gitignored)

---

## 🧪 Seed Data Summary

| Table | Records | Description |
| ------- | --------- | ------------- |
| `users` | 5+ | Test patients and doctors |
| `medical_content` | 6 | Health articles with images |
| `clinical_resources` | 11 | Medical reference library |
| `consultants` | 3 | Medical consultants |
| `appointments` | 5+ | Sample appointments |
| `phr` | 3+ | Personal health records |

---

## 🔧 Configuration

### Environment Variables

API keys are loaded from portal-specific `.env` files:

- `Isara-patient-portal/.env`
- `Isara-doctor-portal/.env`

**Important:** Never commit API keys to version control!

### Database

- **Local:** PostgreSQL on port 5433 (Docker)
- **Cloud:** Cloud SQL with Unix socket
- **Container:** `izara-postgres`
- **Database:** `izara_phase1`
- **Schema:** `scripts/database/postgresql-schema-complete.sql`

---

## 📞 Support

For development questions, see:

- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Commands and credentials
- [Processes/](Processes/) - Detailed workflow documentation
