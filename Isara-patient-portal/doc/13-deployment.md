# 13. Deployment Guide

**Version:** 1.0.0  
**Last Updated:** December 11, 2025

## 13.1 Overview

คู่มือการ Deploy Isara Patient Portal ทั้งบน Local Development, Docker (Unified Image), และ Google Cloud Run

> **สำคัญ:** ตั้งแต่ v1.0.0 เป็นต้นไป ใช้ **Unified Docker Image** ที่รวม Frontend และ Backend ไว้ในคอนเทนเนอร์เดียว

---

## 13.2 Prerequisites

### 13.2.1 Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18+ | Runtime |
| npm | 9+ | Package manager |
| Docker | 24+ | Containerization |
| Git | 2.40+ | Version control |

### 13.2.2 Google Cloud Setup

1. **Create GCP Project**
2. **Enable APIs:**
   - Cloud Storage API
   - Google Calendar API
   - Google Meet API (via Calendar)
   - Maps JavaScript API
   - Places API
   - Directions API
   - Geocoding API

3. **Create Service Account:**
   - Role: Storage Admin
   - Download JSON key

4. **Create GCS Buckets:**
   ```bash
   gsutil mb -l asia-southeast1 gs://izara-users-credentials
   gsutil mb -l asia-southeast1 gs://izara-patients-data
   gsutil mb -l asia-southeast1 gs://izara-doctors-data
   gsutil mb -l asia-southeast1 gs://izara-appointments
   gsutil mb -l asia-southeast1 gs://izara-meta-data
   ```

---

## 13.3 Local Development

### 13.3.1 Setup Steps

```bash
# 1. Clone repository
git clone https://github.com/your-org/isara-patient-portal.git
cd isara-patient-portal

# 2. Install dependencies
npm install

# 3. Setup credentials
mkdir -p credentials
# Copy your service-account.json to credentials/

# 4. Create environment file
cp .env.example .env
# Edit .env with your values

# 5. Start development server
npm run dev:all
```

### 13.3.2 Environment File (.env)

```env
# Server
PORT=3004
NODE_ENV=development

# Google Cloud
GCP_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./credentials/service-account.json

# GCS Buckets
GCS_BUCKET_AUTH=izara-users-credentials
GCS_BUCKET_PATIENT=izara-patients-data
GCS_BUCKET_DOCTOR=izara-doctors-data
GCS_BUCKET_APPOINTMENTS=izara-appointments
GCS_BUCKET_METADATA=izara-meta-data

# Google APIs
GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
GEMINI_API_KEY=xxx

# Frontend (Vite)
VITE_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
VITE_GCP_PROJECT_ID=your-project-id
VITE_API_URL=
```

### 13.3.3 NPM Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start frontend only |
| `dev:server` | `npm run dev:server` | Start backend only |
| `dev:all` | `npm run dev:all` | Start both concurrently |
| `build` | `npm run build` | Build frontend for production |
| `build:server` | `npm run build:server` | Build backend for production |
| `preview` | `npm run preview` | Preview production build |

---

## 13.4 Unified Docker Image (Recommended)

> **แนะนำ:** ใช้ Unified Docker Image สำหรับ Production เพราะง่ายต่อการ deploy และ manage

### 13.4.1 Dockerfile.unified

```dockerfile
# Isara Patient Portal - Unified Docker Image
# Combines React frontend + Express backend in a single container

# Stage 1: Build both frontend and backend
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm run build:server

# Stage 2: Production image
FROM node:18-alpine AS production
WORKDIR /app
RUN apk add --no-cache curl
COPY package*.json ./
RUN npm ci --only=production

# Copy built frontend (static files)
COPY --from=builder /app/dist ./dist

# Copy built backend
COPY --from=builder /app/dist/server ./dist/server

ENV NODE_ENV=production
ENV PORT=3004

EXPOSE 3004

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3004/health || exit 1

CMD ["node", "dist/server/index.js"]
```

### 13.4.2 Build & Run Unified Image

```bash
# Build unified image
docker build -f Dockerfile.unified -t isara-patient-portal:latest .

# Run locally with credentials
docker run -d \
  --name isara-portal \
  -p 3004:3004 \
  -e NODE_ENV=production \
  -e GCP_PROJECT_ID=your-project-id \
  -e GCS_BUCKET_AUTH=izara-users-credentials \
  -e GCS_BUCKET_PATIENT=izara-patients-data \
  -e GCS_BUCKET_DOCTOR=izara-doctors-data \
  -e GCS_BUCKET_APPOINTMENTS=izara-appointments \
  -e GCS_BUCKET_METADATA=izara-meta-data \
  -e VITE_GOOGLE_MAPS_API_KEY=your-maps-key \
  -e GEMINI_API_KEY=your-gemini-key \
  -v $(pwd)/credentials:/app/credentials:ro \
  isara-patient-portal:latest

# View logs
docker logs -f isara-portal

# Stop container
docker stop isara-portal && docker rm isara-portal
```

### 13.4.3 Verify Unified Image

```bash
# Check health
curl http://localhost:3004/health

# Check GCS connection
curl http://localhost:3004/api/health/gcs

# Access frontend
open http://localhost:3004
```

---

## 13.5 Google Cloud Run Deployment (Recommended)

### 13.5.1 Prerequisites

```bash
# Install gcloud CLI
# https://cloud.google.com/sdk/docs/install

# Login and set project
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com
```

### 13.5.2 Create Artifact Registry

```bash
# Create Docker repository
gcloud artifacts repositories create isara-portal \
  --repository-format=docker \
  --location=asia-southeast1 \
  --description="Isara Patient Portal images"
```

### 13.5.3 Build & Push Image

```bash
# Configure Docker for Artifact Registry
gcloud auth configure-docker asia-southeast1-docker.pkg.dev

# Build and tag
docker build -f Dockerfile.unified \
  -t asia-southeast1-docker.pkg.dev/YOUR_PROJECT_ID/isara-portal/patient:latest .

# Push to registry
docker push asia-southeast1-docker.pkg.dev/YOUR_PROJECT_ID/isara-portal/patient:latest
```

### 13.5.4 Create Secrets (Recommended)

```bash
# Create secrets for sensitive values
echo -n "your-gemini-api-key" | \
  gcloud secrets create gemini-api-key --data-file=-

echo -n "your-maps-api-key" | \
  gcloud secrets create maps-api-key --data-file=-

# Grant Cloud Run access to secrets
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 13.5.5 Deploy to Cloud Run

```bash
# Deploy with environment variables
gcloud run deploy isara-patient-portal \
  --image=asia-southeast1-docker.pkg.dev/YOUR_PROJECT_ID/isara-portal/patient:latest \
  --platform=managed \
  --region=asia-southeast1 \
  --allow-unauthenticated \
  --port=3004 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --set-env-vars="NODE_ENV=production" \
  --set-env-vars="GCP_PROJECT_ID=YOUR_PROJECT_ID" \
  --set-env-vars="GCS_BUCKET_AUTH=izara-users-credentials" \
  --set-env-vars="GCS_BUCKET_PATIENT=izara-patients-data" \
  --set-env-vars="GCS_BUCKET_DOCTOR=izara-doctors-data" \
  --set-env-vars="GCS_BUCKET_APPOINTMENTS=izara-appointments" \
  --set-env-vars="GCS_BUCKET_METADATA=izara-meta-data" \
  --set-secrets="GEMINI_API_KEY=gemini-api-key:latest" \
  --set-secrets="VITE_GOOGLE_MAPS_API_KEY=maps-api-key:latest"

# Get service URL
gcloud run services describe isara-patient-portal \
  --region=asia-southeast1 \
  --format="value(status.url)"
```

### 13.5.6 Cloud Run Service YAML (Alternative)

```yaml
# cloudrun-service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: isara-patient-portal
  labels:
    cloud.googleapis.com/location: asia-southeast1
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "0"
        autoscaling.knative.dev/maxScale: "10"
    spec:
      containerConcurrency: 80
      timeoutSeconds: 300
      containers:
        - image: asia-southeast1-docker.pkg.dev/YOUR_PROJECT_ID/isara-portal/patient:latest
          ports:
            - containerPort: 3004
          resources:
            limits:
              memory: 512Mi
              cpu: "1"
          env:
            - name: NODE_ENV
              value: "production"
            - name: GCP_PROJECT_ID
              value: "YOUR_PROJECT_ID"
            - name: GCS_BUCKET_AUTH
              value: "izara-users-credentials"
            - name: GCS_BUCKET_PATIENT
              value: "izara-patients-data"
            - name: GCS_BUCKET_DOCTOR
              value: "izara-doctors-data"
            - name: GCS_BUCKET_APPOINTMENTS
              value: "izara-appointments"
            - name: GCS_BUCKET_METADATA
              value: "izara-meta-data"
            - name: GEMINI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: gemini-api-key
                  key: latest
```

```bash
# Deploy using YAML
gcloud run services replace cloudrun-service.yaml --region=asia-southeast1
```

---

## 13.6 Legacy: Separate Docker Images

> **หมายเหตุ:** ส่วนนี้เก็บไว้สำหรับ reference กรณีต้องการ deploy แยก frontend/backend

### 13.6.1 Frontend Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 13.6.2 Backend Dockerfile

```dockerfile
# Dockerfile.backend
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist/server ./dist/server
EXPOSE 3004
CMD ["node", "dist/server/index.js"]
```

---

## 13.7 Nginx Configuration (For Separate Deployment)

```nginx
# nginx.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Frontend routes (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://backend:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://backend:3004;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    gzip_min_length 1000;
}
```

---

## 13.6 Google Cloud Run Deployment

### 13.6.1 Build and Push Image

```bash
# Set project
gcloud config set project YOUR_PROJECT_ID

# Build backend image
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/isara-backend ./

# Deploy to Cloud Run
gcloud run deploy isara-backend \
  --image gcr.io/YOUR_PROJECT_ID/isara-backend \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-env-vars="GCP_PROJECT_ID=YOUR_PROJECT_ID" \
  --set-env-vars="GCS_BUCKET_AUTH=izara-users-credentials" \
  --set-env-vars="GCS_BUCKET_PATIENT=izara-patients-data" \
  --set-env-vars="GCS_BUCKET_DOCTOR=izara-doctors-data" \
  --set-env-vars="GCS_BUCKET_APPOINTMENTS=izara-appointments" \
  --set-env-vars="GCS_BUCKET_METADATA=izara-meta-data"
```

### 13.6.2 Frontend on Cloud Storage + CDN

```bash
# Build frontend
npm run build

# Upload to GCS
gsutil -m cp -r dist/* gs://izara-frontend/

# Set CORS
gsutil cors set cors.json gs://izara-frontend

# Make public
gsutil iam ch allUsers:objectViewer gs://izara-frontend
```

---

## 13.7 Kubernetes Deployment

### 13.7.1 Backend Deployment

```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: isara-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: isara-backend
  template:
    metadata:
      labels:
        app: isara-backend
    spec:
      containers:
      - name: backend
        image: gcr.io/YOUR_PROJECT/isara-backend:latest
        ports:
        - containerPort: 3004
        env:
        - name: PORT
          value: "3004"
        - name: GCP_PROJECT_ID
          valueFrom:
            secretKeyRef:
              name: isara-secrets
              key: gcp-project-id
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3004
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3004
          initialDelaySeconds: 5
          periodSeconds: 5
```

### 13.7.2 Service

```yaml
# k8s/backend-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: isara-backend-service
spec:
  selector:
    app: isara-backend
  ports:
  - port: 80
    targetPort: 3004
  type: ClusterIP
```

### 13.7.3 Ingress

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: isara-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - api.isara.health
    secretName: isara-tls
  rules:
  - host: api.isara.health
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: isara-backend-service
            port:
              number: 80
```

---

## 13.8 Environment-specific Configurations

### 13.8.1 Development

```env
NODE_ENV=development
VITE_API_URL=
# Uses Vite proxy
```

### 13.8.2 Staging

```env
NODE_ENV=staging
VITE_API_URL=https://api-staging.isara.health
```

### 13.8.3 Production

```env
NODE_ENV=production
VITE_API_URL=https://api.isara.health
```

---

## 13.9 Health Checks

### 13.9.1 Server Health

```bash
# Basic health
curl http://localhost:3004/health

# GCS health
curl http://localhost:3004/api/health/gcs
```

### 13.9.2 Expected Responses

```json
// /health
{
  "status": "healthy",
  "timestamp": "2025-12-07T10:00:00.000Z",
  "service": "Izara Patient Portal API"
}
```

```json
// /api/health/gcs
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

## 13.10 Monitoring & Logging

### 13.10.1 Request Logging

```typescript
// Built-in request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ➡️  ${req.method} ${req.path}`);
  
  res.on('finish', () => {
    const status = res.statusCode;
    const icon = status >= 400 ? '❌' : '✅';
    console.log(`[${timestamp}] ${icon} ${req.method} ${req.path} - ${status}`);
  });
  
  next();
});
```

### 13.10.2 Cloud Logging (GCP)

```bash
# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=isara-backend" --limit 100

# Stream logs
gcloud logging tail "resource.type=cloud_run_revision"
```

---

## 13.11 Security Checklist

### 13.11.1 Pre-deployment

- [ ] All secrets in environment variables
- [ ] Service account with minimal permissions
- [ ] CORS configured for production domains
- [ ] HTTPS enabled
- [ ] API keys restricted

### 13.11.2 Post-deployment

- [ ] Health checks passing
- [ ] All GCS buckets accessible
- [ ] SSL certificate valid
- [ ] Firewall rules configured
- [ ] Monitoring alerts set up

---

## 13.12 Troubleshooting

### 13.12.1 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| GCS permission denied | Invalid service account | Check IAM roles |
| CORS error | Wrong origin | Update CORS config |
| 502 Bad Gateway | Backend not running | Check container logs |
| Maps not loading | Invalid API key | Check API key restrictions |
| Build fails | Missing dependencies | Run `npm ci` |

### 13.12.2 Debug Commands

```bash
# Check container status
docker ps -a

# View container logs
docker logs isara-backend --tail 100

# SSH into container
docker exec -it isara-backend sh

# Check GCS connection
gsutil ls gs://izara-users-credentials

# Test API
curl -X GET http://localhost:3004/health
```

---

## 13.13 Backup & Recovery

### 13.13.1 GCS Backup

```bash
# Create backup bucket
gsutil mb gs://izara-backups

# Copy data
gsutil -m cp -r gs://izara-patients-data/* gs://izara-backups/patients-data/$(date +%Y%m%d)/
```

### 13.13.2 Automated Backup (Cloud Function)

```javascript
// Cloud Function for daily backup
exports.backupPatientData = async () => {
  const { Storage } = require('@google-cloud/storage');
  const storage = new Storage();
  
  const sourcesBucket = 'izara-patients-data';
  const backupBucket = 'izara-backups';
  const dateFolder = new Date().toISOString().split('T')[0];
  
  const [files] = await storage.bucket(sourceBucket).getFiles();
  
  for (const file of files) {
    await file.copy(
      storage.bucket(backupBucket).file(`${dateFolder}/${file.name}`)
    );
  }
  
  console.log(`Backed up ${files.length} files`);
};
```

---

[← Previous: Google Services](./12-google-services.md) | [Back to README →](./README.md)

