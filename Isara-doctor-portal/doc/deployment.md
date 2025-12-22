# 🚀 Deployment Guide

## Overview

This guide covers deploying the Izara Doctor Portal to Google Cloud Platform using a unified Docker image that runs all services (frontend + backend) in a single container.

---

## 📦 Docker Image Architecture

The unified Docker image (`Dockerfile.unified`) combines:

| Component | Internal Port | Description |
|-----------|--------------|-------------|
| **Nginx** | 8080 (external) | Reverse proxy + static frontend |
| **GCS API Server** | 3012 | Google Cloud Storage operations |
| **Auth Server** | 3011 | Authentication, sessions, WebSocket |
| **Main API Server** | 3009 | Business logic, appointments, EMR |

### Process Management
- Uses **Supervisor** to manage all processes
- Auto-restart on failure
- Centralized logging to stdout/stderr

---

## 🛠️ Build Commands

### Local Development Build
```bash
# Build unified image
docker build -f Dockerfile.unified -t izara-doctor-portal:latest .

# Run locally
docker run -p 8080:8080 \
  -e VITE_GCP_PROJECT_ID=your-project-id \
  -e VITE_GEMINI_API_KEY=your-gemini-key \
  -v /path/to/service-account.json:/var/secrets/google/key.json \
  -e GOOGLE_APPLICATION_CREDENTIALS=/var/secrets/google/key.json \
  izara-doctor-portal:latest
```

### Production Build with All Environment Variables
```bash
docker build -f Dockerfile.unified \
  --build-arg VITE_APP_NAME="Izara Doctor Portal" \
  --build-arg VITE_APP_ENV=production \
  --build-arg VITE_API_URL=https://your-domain.com/api \
  --build-arg VITE_AUTH_URL=https://your-domain.com/auth \
  --build-arg VITE_GCP_PROJECT_ID=your-project-id \
  --build-arg VITE_GCP_REGION=asia-southeast1 \
  --build-arg VITE_GEMINI_API_KEY=your-key \
  -t izara-doctor-portal:production .
```

---

## ☁️ Google Cloud Run Deployment

### Prerequisites
1. Google Cloud SDK installed (`gcloud`)
2. Docker installed
3. GCP Project with billing enabled
4. Service account with required permissions

### Step 1: Configure GCP
```bash
# Set project
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  containerregistry.googleapis.com \
  cloudbuild.googleapis.com \
  storage.googleapis.com
```

### Step 2: Create Service Account
```bash
# Create service account
gcloud iam service-accounts create izara-runtime \
  --display-name="Izara Runtime Service Account"

# Grant storage permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:izara-runtime@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"
```

### Step 3: Build and Push Image
```bash
# Configure Docker for GCR
gcloud auth configure-docker

# Build image
docker build -f Dockerfile.unified -t gcr.io/YOUR_PROJECT_ID/izara-doctor-portal:v1 .

# Push to GCR
docker push gcr.io/YOUR_PROJECT_ID/izara-doctor-portal:v1
```

### Step 4: Deploy to Cloud Run
```bash
gcloud run deploy izara-doctor-portal \
  --image gcr.io/YOUR_PROJECT_ID/izara-doctor-portal:v1 \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 2Gi \
  --cpu 2 \
  --min-instances 1 \
  --max-instances 10 \
  --timeout 300 \
  --service-account izara-runtime@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --set-env-vars "NODE_ENV=production,VITE_GCP_PROJECT_ID=YOUR_PROJECT_ID,VITE_GCP_REGION=asia-southeast1"
```

---

## 🔧 Environment Variables

### Required Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_GCP_PROJECT_ID` | GCP Project ID | `izara-telemedicine` |
| `VITE_GCP_REGION` | GCP Region | `asia-southeast1` |
| `VITE_GEMINI_API_KEY` | Gemini AI API Key | `AIza...` |

### Optional Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_APP_NAME` | Application name | `Izara Doctor Portal` |
| `VITE_APP_ENV` | Environment | `production` |
| `VITE_PDPA_ENABLED` | Enable PDPA compliance | `true` |
| `VITE_CONSENT_REQUIRED` | Require consent | `true` |

### GCS Bucket Names
| Variable | Default Bucket |
|----------|---------------|
| `VITE_GCS_BUCKET_AUTH` | `izara-users-credentials` |
| `VITE_GCS_BUCKET_DOCTOR` | `izara-doctors-data` |
| `VITE_GCS_BUCKET_PATIENT` | `izara-patients-data` |
| `VITE_GCS_BUCKET_APPOINTMENTS` | `izara-appointments` |
| `VITE_GCS_BUCKET_METADATA` | `izara-meta-data` |

---

## 🗄️ GCS Bucket Setup

### Create Buckets
```bash
# Create all required buckets
for bucket in izara-users-credentials izara-doctors-data izara-patients-data izara-appointments izara-meta-data; do
  gsutil mb -l asia-southeast1 gs://$bucket/
done

# Set lifecycle policy (optional - for cost management)
gsutil lifecycle set lifecycle.json gs://izara-users-credentials/
```

### Bucket Permissions
```bash
# Grant service account access
for bucket in izara-users-credentials izara-doctors-data izara-patients-data izara-appointments izara-meta-data; do
  gsutil iam ch serviceAccount:izara-runtime@YOUR_PROJECT_ID.iam.gserviceaccount.com:objectAdmin gs://$bucket/
done
```

---

## 📊 Monitoring & Logging

### View Logs
```bash
# Stream logs
gcloud run logs tail izara-doctor-portal --region asia-southeast1

# View specific service logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=izara-doctor-portal" --limit 50
```

### Health Check
```bash
# Check service health
curl https://your-service-url.run.app/health
```

---

## 🔄 CI/CD with Cloud Build

### cloudbuild.yaml
```yaml
steps:
  # Build the unified image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-f', 'Dockerfile.unified', '-t', 'gcr.io/$PROJECT_ID/izara-doctor-portal:$COMMIT_SHA', '.']

  # Push to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/izara-doctor-portal:$COMMIT_SHA']

  # Deploy to Cloud Run
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'izara-doctor-portal'
      - '--image=gcr.io/$PROJECT_ID/izara-doctor-portal:$COMMIT_SHA'
      - '--region=asia-southeast1'
      - '--platform=managed'

images:
  - 'gcr.io/$PROJECT_ID/izara-doctor-portal:$COMMIT_SHA'

timeout: '1200s'
```

### Trigger Setup
```bash
# Create trigger from GitHub
gcloud builds triggers create github \
  --repo-name=Telemedicine-Google-MoC \
  --repo-owner=chiraleo2000 \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml
```

---

## 🛡️ Security Considerations

### Service Account Permissions
- Minimize permissions to only what's needed
- Use Workload Identity for GKE deployments
- Rotate service account keys regularly

### Network Security
- Enable VPC connector for internal services
- Use Cloud Armor for DDoS protection
- Configure IAP for admin access

### Secrets Management
```bash
# Store secrets in Secret Manager
echo -n "your-api-key" | gcloud secrets create gemini-api-key --data-file=-

# Grant access to service account
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:izara-runtime@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 🔍 Troubleshooting

### Common Issues

#### Container fails to start
```bash
# Check logs
gcloud run logs read izara-doctor-portal --region asia-southeast1 --limit 100
```

#### GCS connection errors
- Verify service account has storage permissions
- Check bucket names match configuration
- Ensure GOOGLE_APPLICATION_CREDENTIALS is set

#### High memory usage
- Increase Cloud Run memory allocation
- Check for memory leaks in Node.js processes

---

## 📈 Scaling Configuration

### Cloud Run Settings
```bash
gcloud run services update izara-doctor-portal \
  --region asia-southeast1 \
  --min-instances 1 \
  --max-instances 20 \
  --concurrency 80 \
  --cpu 2 \
  --memory 2Gi
```

### Auto-scaling Metrics
- Target CPU utilization: 60%
- Target concurrent requests: 80
- Scale-up delay: 0s (instant)
- Scale-down delay: 300s

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-10 | Initial unified Docker deployment |
