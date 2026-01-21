# Izara Telemedicine Platform - Docker Local Deployment Guide

This document explains how to set up, deploy, and run the Izara Telemedicine Platform locally using Docker.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
- **Docker Compose** v2.0+
- **Git** for cloning the repository
- **PowerShell** (Windows) or **Bash** (Linux/Mac)

### Verify Installation

```powershell
# Check Docker
docker --version
docker-compose --version

# Docker should be running
docker info
```

## 🏗️ Project Structure

```
Isara-Anywhere/
├── docker-compose.yml          # Main Docker Compose configuration
├── Isara-patient-portal/       # Patient-facing application (React + Express)
├── Isara-doctor-portal/        # Doctor-facing application (React + Express)
├── scripts/
│   └── database/
│       └── seed-docker-complete.sql  # Database seed data
└── postgres-data/              # PostgreSQL data (auto-created)
```

## 🚀 Quick Start

### 1. Clone the Repository

```powershell
git clone <repository-url>
cd Isara-Anywhere
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory or ensure the following are set in `docker-compose.yml`:

```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=P@ssw0rd
POSTGRES_DB=izara_phase1

# API Keys (get from Google Cloud Console)
GOOGLE_API_KEY=your-google-maps-api-key
GEMINI_API_KEY=your-gemini-ai-api-key
GOOGLE_APPLICATION_CREDENTIALS=/app/credentials/service-account.json
```

### 3. Start the Docker Containers

```powershell
# Build and start all services
cd c:\Users\chira\Documents\Isara-telemed\Isara-Anywhere
docker-compose up -d --build

# Watch the build logs (optional)
docker-compose logs -f
```

### 4. Seed the Database

After containers are running, seed the database with test data:

```powershell
# Navigate to database scripts
cd scripts/database

# Run seed script
Get-Content -Path seed-docker-complete.sql -Encoding UTF8 | docker exec -i izara-postgres psql -U postgres -d izara_phase1
```

### 5. Verify Deployment

```powershell
# Check container status
docker-compose ps

# All containers should show "healthy" or "Up"
```

## 🌐 Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| **Patient Portal** | http://localhost:3005 | Patient-facing web app |
| **Doctor Portal** | http://localhost:3010 | Doctor-facing web app |
| **Doctor Auth Server** | http://localhost:3011 | Doctor authentication |
| **GCS API Server** | http://localhost:3012 | File storage API |
| **pgAdmin** | http://localhost:5050 | Database management |
| **PostgreSQL** | localhost:5432 | Database (direct) |

## 👤 Test User Accounts

### Patient Portal (http://localhost:3005)

| Email | Password | Description |
|-------|----------|-------------|
| `demo.test@gmail.com` | `P@ssw0rd` | Primary test patient |
| `demo2.test@gmail.com` | `P@ssw0rd` | Secondary test patient |
| `Somchai.Mankong@gmail.com` | `P@ssw0rd` | Thai patient with full data |
| `Anan.Khayanrian@gmail.com` | `P@ssw0rd` | Thai patient with diabetes |

### Doctor Portal (http://localhost:3010)

| Email | Password | Description |
|-------|----------|-------------|
| `doctor.test@izara.com` | `IzaraDoctor@2024` | Primary test doctor |
| `doctorunit.test@izara.com` | `IzaraDoctor@2024` | Secondary test doctor |
| `admin.test@izara.com` | `IzaraAdmin@2024` | Admin user |

### pgAdmin (http://localhost:5050)

| Email | Password |
|-------|----------|
| `admin@izara.com` | `admin123` |

**To connect to PostgreSQL in pgAdmin:**
- Host: `postgres` (or `izara-postgres`)
- Port: `5432`
- Database: `izara_phase1`
- Username: `postgres`
- Password: `P@ssw0rd`

## 🔧 Docker Commands Reference

### Start/Stop Services

```powershell
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart a specific service
docker-compose restart patient-portal
docker-compose restart doctor-portal

# View logs
docker-compose logs -f patient-portal
docker-compose logs -f doctor-portal
```

### Rebuild Services

```powershell
# Rebuild all services
docker-compose build --no-cache

# Rebuild specific service
docker-compose build patient-portal --no-cache
docker-compose build doctor-portal --no-cache

# Rebuild and restart
docker-compose up -d --build
```

### Database Operations

```powershell
# Connect to PostgreSQL CLI
docker exec -it izara-postgres psql -U postgres -d izara_phase1

# View all tables
docker exec izara-postgres psql -U postgres -d izara_phase1 -c "\dt"

# View table data
docker exec izara-postgres psql -U postgres -d izara_phase1 -c "SELECT * FROM users;"

# Run SQL file
Get-Content seed-file.sql | docker exec -i izara-postgres psql -U postgres -d izara_phase1
```

### Container Management

```powershell
# View running containers
docker ps

# View container details
docker inspect izara-patient-portal
docker inspect izara-doctor-portal

# Access container shell
docker exec -it izara-patient-portal sh
docker exec -it izara-doctor-portal sh

# View container logs
docker logs izara-patient-portal --tail 100
docker logs izara-doctor-portal --tail 100
```

## 🔄 Data Persistence

Data is persisted in Docker volumes:

| Volume | Purpose |
|--------|---------|
| `postgres-data` | PostgreSQL database files |

To reset the database completely:

```powershell
# Stop containers
docker-compose down

# Remove PostgreSQL data volume
docker volume rm isara-anywhere_postgres-data

# Restart containers (will recreate database)
docker-compose up -d

# Re-seed the database
Get-Content seed-docker-complete.sql | docker exec -i izara-postgres psql -U postgres -d izara_phase1
```

## 🧪 Testing

### API Health Checks

```powershell
# Patient Portal
Invoke-RestMethod -Uri "http://localhost:3005/api/health"

# Doctor Portal
Invoke-RestMethod -Uri "http://localhost:3010/api/health"
```

### Test Login

```powershell
# Patient Login
$body = '{"email":"demo.test@gmail.com","password":"P@ssw0rd"}'
$headers = @{"Content-Type"="application/json"}
Invoke-RestMethod -Uri "http://localhost:3005/api/auth/login" -Method POST -Headers $headers -Body $body
```

### Test AI Chat

```powershell
# First login to get token
$loginResponse = Invoke-RestMethod -Uri "http://localhost:3005/api/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"demo.test@gmail.com","password":"P@ssw0rd"}'
$token = $loginResponse.token

# Test AI chat
$chatHeaders = @{"Content-Type"="application/json";"Authorization"="Bearer $token"}
$chatBody = '{"message":"Hello, I have a headache","language":"en"}'
Invoke-RestMethod -Uri "http://localhost:3005/api/ai/chat" -Method POST -Headers $chatHeaders -Body $chatBody
```

## 🎯 Features Overview

### Patient Portal Features
- ✅ User authentication (login/register)
- ✅ AI-powered health chat (Gemini AI)
- ✅ Appointment booking
- ✅ Health records management
- ✅ Vital signs tracking
- ✅ Medical content library
- ✅ Video consultations (Jitsi)
- ✅ Google Maps integration
- ✅ Living Will management

### Doctor Portal Features
- ✅ Doctor authentication
- ✅ Patient management
- ✅ Appointment management
- ✅ EMR (Electronic Medical Records)
- ✅ Clinical resources
- ✅ Medical content creation
- ✅ Video consultations

## 🐛 Troubleshooting

### Container Won't Start

```powershell
# Check container logs
docker logs izara-patient-portal
docker logs izara-doctor-portal

# Check port conflicts
netstat -an | findstr "3005 3010 5432"
```

### Database Connection Issues

```powershell
# Check if PostgreSQL is ready
docker exec izara-postgres pg_isready

# Check database exists
docker exec izara-postgres psql -U postgres -c "\l"
```

### "Password Mismatch" on Login

Ensure the password hashes are correctly set in the database. Re-run the seed script:

```powershell
cd scripts/database
Get-Content seed-docker-complete.sql | docker exec -i izara-postgres psql -U postgres -d izara_phase1
```

### AI Chat Returns Error

Verify that `GEMINI_API_KEY` is properly set in the docker-compose.yml and the container was rebuilt:

```powershell
docker exec izara-patient-portal printenv | Select-String "GEMINI"
```

### Maps Not Displaying

Verify that `GOOGLE_API_KEY` is set and has Maps JavaScript API enabled:

```powershell
docker exec izara-patient-portal printenv | Select-String "GOOGLE_API"
```

## 📊 Database Schema

The `izara_phase1` database contains 23+ tables including:

| Table | Purpose |
|-------|---------|
| `users` | User accounts (patients, doctors, admins) |
| `patient_profiles` | Patient demographic information |
| `doctor_profiles` | Doctor professional information |
| `appointments` | Appointment scheduling |
| `emr` | Electronic Medical Records |
| `vital_signs` | Patient vital measurements |
| `medical_content` | Health education articles |
| `clinical_resources` | Clinical guidelines for doctors |
| `knowledge_base` | AI knowledge base |
| `consultants` | External consultant directory |
| `sessions` | User authentication sessions |

## 🚢 Deployment to Google Cloud Run

### Cloud Run URLs

After deployment, the portals are accessible at:

| Portal | Cloud Run URL |
|--------|---------------|
| **Patient Portal** | https://izara-patient-portal-724889190329.asia-southeast1.run.app |
| **Doctor Portal** | https://izara-doctor-portal-724889190329.asia-southeast1.run.app |

### Prerequisites

1. **GCP Authentication**: `gcloud auth login`
2. **Project Set**: `gcloud config set project izara-telemedicine`
3. **Docker configured for GCR**: `gcloud auth configure-docker asia-southeast1-docker.pkg.dev`

### Build and Push Images

```powershell
cd scripts
.\build-and-push-gcr.ps1 -Portal all
```

This builds and pushes both portal images to:
- `asia-southeast1-docker.pkg.dev/izara-telemedicine/isara-anywhere-portals/isara-patient-portal:latest`
- `asia-southeast1-docker.pkg.dev/izara-telemedicine/isara-anywhere-portals/isara-doctor-portal:latest`

### Deploy to Cloud Run

```powershell
cd scripts
.\deploy-to-cloud-run.ps1 -Portal all -BuildFirst
```

Or deploy individually:

```powershell
# Patient Portal
gcloud run deploy izara-patient-portal \
  --image=asia-southeast1-docker.pkg.dev/izara-telemedicine/isara-anywhere-portals/isara-patient-portal:latest \
  --region=asia-southeast1 \
  --port=8080 \
  --add-cloudsql-instances=izara-telemedicine:asia-southeast1:izara-db-instance \
  --set-secrets="GEMINI_API_KEY=gemini-api-key:latest"

# Doctor Portal  
gcloud run deploy izara-doctor-portal \
  --image=asia-southeast1-docker.pkg.dev/izara-telemedicine/isara-anywhere-portals/isara-doctor-portal:latest \
  --region=asia-southeast1 \
  --port=3010 \
  --memory=1Gi \
  --add-cloudsql-instances=izara-telemedicine:asia-southeast1:izara-db-instance \
  --set-secrets="GEMINI_API_KEY=gemini-api-key:latest"
```

### Cloud SQL Connection

Cloud Run connects to CloudSQL via Unix socket:
- **Instance**: `izara-telemedicine:asia-southeast1:izara-db-instance`
- **Socket Path**: `/cloudsql/izara-telemedicine:asia-southeast1:izara-db-instance`
- **Database**: `izara_medical_db`

### Secrets Management

API keys are stored in GCP Secret Manager:
```powershell
# Create secret
gcloud secrets create gemini-api-key --replication-policy="automatic"
echo "YOUR_API_KEY" | gcloud secrets versions add gemini-api-key --data-file=-

# Grant access to Cloud Run
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:724889190329-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## 📝 Notes

- The PostgreSQL data is persisted in a Docker volume. Data survives container restarts.
- API keys must be valid for AI chat and Maps features to work.
- The auth middleware supports both PostgreSQL sessions (recommended) and legacy GCS sessions.
- Password hashes use bcrypt with cost factor 12.

## 📞 Support

For issues or questions, refer to:
- [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)
- [README.md](./README.md)
- Project documentation in `/doc` folders
