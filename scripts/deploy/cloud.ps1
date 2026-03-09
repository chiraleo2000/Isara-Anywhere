#!/usr/bin/env pwsh
# ============================================================================
# IZARA TELEMEDICINE — Cloud Run Deployment Script v4.1.0
# ============================================================================
#
# Deploys all 5 services to Google Cloud Run with "-dev-testing" suffix:
#   1. izara-postgres-dev-testing     (PostgreSQL 18 + pgvector on GCE VM)
#   2. izara-pgadmin-dev-testing      (pgAdmin 4)
#   3. izara-patient-portal-dev-testing
#   4. izara-doctor-portal-dev-testing
#   5. izara-meeting-server-dev-testing
#
# Consolidated from: scripts/cloud-run/deploy-dev-testing.ps1
#
# Usage:
#   .\scripts\deploy\cloud.ps1                    # Deploy all services
#   .\scripts\deploy\cloud.ps1 -SkipBuild         # Deploy without rebuilding
#   .\scripts\deploy\cloud.ps1 -OnlyPostgres      # Deploy only PostgreSQL
#   .\scripts\deploy\cloud.ps1 -Teardown          # Delete all services
#   .\scripts\deploy\cloud.ps1 -StatusOnly         # Show service status
#
# ============================================================================

param(
    [switch]$SkipBuild,
    [switch]$OnlyPostgres,
    [switch]$OnlyPgAdmin,
    [switch]$OnlyApps,
    [switch]$Teardown,
    [switch]$StatusOnly
)

# ============================================================================
# CONFIGURATION
# ============================================================================
$PROJECT_ID     = "izara-telemedicine"
$REGION         = "asia-southeast1"
$REGISTRY       = "asia-southeast1-docker.pkg.dev/$PROJECT_ID/isara-anywhere-portals"
$TAG            = "v1.5.4"
$SUFFIX         = "-dev-testing"
$ROOT_DIR       = (Resolve-Path "$PSScriptRoot\..\..").Path

# Service names
$SVC_POSTGRES   = "izara-postgres$SUFFIX"
$SVC_PGADMIN    = "izara-pgadmin$SUFFIX"
$SVC_PATIENT    = "izara-patient-portal$SUFFIX"
$SVC_DOCTOR     = "izara-doctor-portal$SUFFIX"
$SVC_MEETING    = "izara-meeting-server$SUFFIX"

# Image names
$IMG_PATIENT    = "$REGISTRY/izara-patient-portal:$TAG"
$IMG_DOCTOR     = "$REGISTRY/izara-doctor-portal:$TAG"
$IMG_MEETING    = "$REGISTRY/izara-meeting-server:$TAG"

# Database credentials
$DB_USER        = "postgres"
$DB_PASSWORD    = "IzaraDb2024"
$DB_NAME        = "izara_phase1"

# API Keys (from .env.docker)
$GEMINI_API_KEY = "AIzaSyCaH9_CLZ6jZvRWYH-JSEnpj4TUn2UV5Vs"
$MAPS_API_KEY   = "AIzaSyC2ihx457OgeZd-tgwtSBntrKpJtKhT19Y"
$MAPS_MAP_ID    = "60687d30be2fe4b7e600b274"
$JWT_SECRET     = "izara-jwt-secret-key-phase1-2026-dev-testing"

# GCE VM config
$VM_NAME  = "izara-postgres-dev-testing"
$VM_ZONE  = "asia-southeast1-b"
$PG_HOST  = "35.240.157.230"
$DATABASE_URL = "postgresql://${DB_USER}:${DB_PASSWORD}@${PG_HOST}:5432/${DB_NAME}"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================
function Write-Step($msg) { Write-Host "`n▶ $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "  ✅ $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  ⚠️  $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "  ❌ $msg" -ForegroundColor Red }

function Get-ServiceUrl($svcName) {
    $url = gcloud run services describe $svcName --region=$REGION --format="value(status.url)" 2>$null
    return $url
}

# ============================================================================
# STATUS CHECK
# ============================================================================
if ($StatusOnly) {
    Write-Host "`n═══ IZARA DEV-TESTING — SERVICE STATUS ═══" -ForegroundColor Magenta
    foreach ($svc in @($SVC_POSTGRES, $SVC_PGADMIN, $SVC_PATIENT, $SVC_DOCTOR, $SVC_MEETING)) {
        $url = Get-ServiceUrl $svc
        if ($url) { Write-OK "$svc → $url" }
        else { Write-Warn "$svc → NOT DEPLOYED" }
    }
    exit 0
}

# ============================================================================
# TEARDOWN
# ============================================================================
if ($Teardown) {
    Write-Host "`n═══ TEARING DOWN DEV-TESTING SERVICES ═══" -ForegroundColor Red
    foreach ($svc in @($SVC_MEETING, $SVC_DOCTOR, $SVC_PATIENT, $SVC_PGADMIN)) {
        Write-Step "Deleting $svc..."
        gcloud run services delete $svc --region=$REGION --quiet 2>$null
        if ($LASTEXITCODE -eq 0) { Write-OK "Deleted $svc" }
        else { Write-Warn "$svc not found or already deleted" }
    }
    Write-Step "Deleting PostgreSQL VM..."
    gcloud compute instances delete $VM_NAME --zone=$VM_ZONE --quiet 2>$null
    Write-Step "Deleting firewall rule..."
    gcloud compute firewall-rules delete allow-postgres-dev-testing --quiet 2>$null
    Write-Host "`n✅ Teardown complete!" -ForegroundColor Green
    exit 0
}

# ============================================================================
# PRE-FLIGHT CHECKS
# ============================================================================
Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  IZARA TELEMEDICINE v1.5.4 — Cloud Run Deployment" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta

Write-Step "Pre-flight checks..."
$project = gcloud config get-value project 2>$null
if ($project -ne $PROJECT_ID) {
    Write-Err "GCP project is '$project', expected '$PROJECT_ID'"
    Write-Host "  Run: gcloud config set project $PROJECT_ID"
    exit 1
}
Write-OK "GCP Project: $PROJECT_ID"
Write-OK "Region: $REGION"

gcloud auth configure-docker asia-southeast1-docker.pkg.dev --quiet 2>$null
Write-OK "Docker auth configured"

# ============================================================================
# STEP 1: POSTGRESQL (GCE VM)
# ============================================================================
if ($OnlyPostgres) {
    Write-Step "Checking PostgreSQL VM status..."
    $vmStatus = gcloud compute instances describe $VM_NAME --zone=$VM_ZONE --format="value(status)" 2>$null
    if ($vmStatus -eq "RUNNING") { Write-OK "PostgreSQL VM is RUNNING at $PG_HOST" }
    else {
        Write-Warn "PostgreSQL VM status: $vmStatus — starting..."
        gcloud compute instances start $VM_NAME --zone=$VM_ZONE --quiet
        Start-Sleep -Seconds 30
        Write-OK "PostgreSQL VM started"
    }
    exit 0
}

# ============================================================================
# STEP 2: PGADMIN
# ============================================================================
if (-not $OnlyApps) {
    Write-Step "Deploying pgAdmin ($SVC_PGADMIN)..."
    gcloud run deploy $SVC_PGADMIN `
        --image=dpage/pgadmin4:8.14 --region=$REGION --platform=managed `
        --allow-unauthenticated --port=8080 --memory=1Gi --cpu=1 `
        --min-instances=0 --max-instances=1 --timeout=300 `
        --set-env-vars="PGADMIN_DEFAULT_EMAIL=admin@izara.com,PGADMIN_DEFAULT_PASSWORD=IzaraAdmin@2024,PGADMIN_LISTEN_PORT=8080,PGADMIN_CONFIG_ENHANCED_COOKIE_PROTECTION=False,PGADMIN_CONFIG_WTF_CSRF_ENABLED=False" `
        --quiet
    if ($LASTEXITCODE -ne 0) { Write-Err "pgAdmin deployment failed!"; exit 1 }
    Write-OK "pgAdmin deployed: $(Get-ServiceUrl $SVC_PGADMIN)"
}
if ($OnlyPgAdmin) { exit 0 }

Write-OK "PostgreSQL host: $PG_HOST (GCE VM)"

# ============================================================================
# STEP 2b: DATABASE MIGRATIONS (idempotent — safe to re-run)
# ============================================================================
Write-Step "Running database migrations on cloud PostgreSQL..."
$env:PGPASSWORD = $DB_PASSWORD
$migrationSql = @"
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_updated_by VARCHAR(50);
"@
$migrationSql | psql -h $PG_HOST -U $DB_USER -d $DB_NAME -v ON_ERROR_STOP=1 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-OK "Database migrations applied successfully"
} else {
    Write-Warn "psql not available locally — migrations will be applied via SSH"
    gcloud compute ssh $VM_NAME --zone=$VM_ZONE --command="sudo -u postgres psql -d $DB_NAME -c `"ALTER TABLE users ADD COLUMN IF NOT EXISTS role_updated_at TIMESTAMP WITH TIME ZONE; ALTER TABLE users ADD COLUMN IF NOT EXISTS role_updated_by VARCHAR(50);`"" 2>$null
    if ($LASTEXITCODE -eq 0) { Write-OK "Database migrations applied via SSH" }
    else { Write-Warn "Could not run migration — columns may need manual addition" }
}

# ============================================================================
# STEP 3: MEETING SERVER
# ============================================================================
if (-not $SkipBuild) {
    Write-Step "Building Meeting Server..."
    Push-Location "$ROOT_DIR\Izara-jitsi-server"
    docker build -t $IMG_MEETING .
    if ($LASTEXITCODE -ne 0) { Write-Err "Build failed!"; Pop-Location; exit 1 }
    docker push $IMG_MEETING
    Write-OK "Meeting Server image pushed"
    Pop-Location
}

Write-Step "Deploying Meeting Server ($SVC_MEETING)..."
gcloud run deploy $SVC_MEETING `
    --image=$IMG_MEETING --region=$REGION --platform=managed `
    --allow-unauthenticated --port=3020 --memory=1Gi --cpu=1 `
    --min-instances=0 --max-instances=5 --timeout=300 `
    --set-env-vars="NODE_ENV=production,DB_HOST=$PG_HOST,DB_PORT=5432,DB_NAME=$DB_NAME,DB_USER=$DB_USER,DB_PASSWORD=$DB_PASSWORD,DB_SSL=false,DATABASE_URL=$DATABASE_URL,GEMINI_API_KEY=$GEMINI_API_KEY,GEMINI_MODEL=gemini-2.5-flash-lite,JITSI_DOMAIN=meet.jit.si,JWT_SECRET=$JWT_SECRET,CORS_ORIGINS=*,USE_POSTGRESQL=true" `
    --quiet
if ($LASTEXITCODE -ne 0) { Write-Err "Meeting Server deployment failed!"; exit 1 }
$MEETING_URL = Get-ServiceUrl $SVC_MEETING
Write-OK "Meeting Server deployed: $MEETING_URL"

# ============================================================================
# STEP 4: PATIENT PORTAL
# ============================================================================
if (-not $SkipBuild) {
    Write-Step "Building Patient Portal..."
    Push-Location "$ROOT_DIR\Isara-patient-portal"
    docker build -f Dockerfile.unified `
        --build-arg VITE_API_URL="" --build-arg VITE_APP_NAME="Izara Patient Portal (Dev)" `
        --build-arg VITE_APP_VERSION="1.5.4" --build-arg VITE_APP_ENV=production `
        --build-arg VITE_USE_POSTGRESQL=true --build-arg VITE_MEETING_SERVER_URL=$MEETING_URL `
        --build-arg VITE_GOOGLE_MAPS_API_KEY=$MAPS_API_KEY --build-arg VITE_GOOGLE_MAPS_MAP_ID=$MAPS_MAP_ID `
        --build-arg VITE_GEMINI_API_KEY=$GEMINI_API_KEY --build-arg VITE_GEMINI_MODEL=gemini-2.5-flash-lite `
        -t $IMG_PATIENT .
    if ($LASTEXITCODE -ne 0) { Write-Err "Build failed!"; Pop-Location; exit 1 }
    docker push $IMG_PATIENT
    Write-OK "Patient Portal image pushed"
    Pop-Location
}

Write-Step "Deploying Patient Portal ($SVC_PATIENT)..."
gcloud run deploy $SVC_PATIENT `
    --image=$IMG_PATIENT --region=$REGION --platform=managed `
    --allow-unauthenticated --port=3005 --memory=1Gi --cpu=1 `
    --min-instances=0 --max-instances=3 --timeout=300 `
    --set-env-vars="NODE_ENV=production,DEMO_MODE=false,DATABASE_URL=$DATABASE_URL,DB_HOST=$PG_HOST,DB_PORT=5432,DB_NAME=$DB_NAME,DB_USER=$DB_USER,DB_PASSWORD=$DB_PASSWORD,DB_SSL=false,USE_POSTGRESQL=true,VITE_USE_POSTGRESQL=true,USE_GCS=false,VITE_USE_GCS=false,MEETING_SERVER_URL=$MEETING_URL,VITE_MEETING_SERVER_URL=$MEETING_URL,GOOGLE_MAPS_API_KEY=$MAPS_API_KEY,VITE_GOOGLE_MAPS_API_KEY=$MAPS_API_KEY,GEMINI_API_KEY=$GEMINI_API_KEY,GEMINI_MODEL=gemini-2.5-flash-lite,JWT_SECRET=$JWT_SECRET" `
    --quiet
if ($LASTEXITCODE -ne 0) { Write-Err "Patient Portal deployment failed!"; exit 1 }
$PATIENT_URL = Get-ServiceUrl $SVC_PATIENT
Write-OK "Patient Portal deployed: $PATIENT_URL"

# ============================================================================
# STEP 5: DOCTOR PORTAL
# ============================================================================
if (-not $SkipBuild) {
    Write-Step "Building Doctor Portal..."
    Push-Location "$ROOT_DIR\Isara-doctor-portal"
    docker build -f Dockerfile.unified `
        --build-arg VITE_API_URL="" --build-arg VITE_AUTH_URL="" `
        --build-arg VITE_APP_NAME="Izara Doctor Portal (Dev)" `
        --build-arg VITE_APP_VERSION="1.5.4" --build-arg VITE_APP_ENV=production `
        --build-arg VITE_USE_POSTGRESQL=true --build-arg VITE_MEETING_SERVER_URL=$MEETING_URL `
        -t $IMG_DOCTOR .
    if ($LASTEXITCODE -ne 0) { Write-Err "Build failed!"; Pop-Location; exit 1 }
    docker push $IMG_DOCTOR
    Write-OK "Doctor Portal image pushed"
    Pop-Location
}

Write-Step "Deploying Doctor Portal ($SVC_DOCTOR)..."
gcloud run deploy $SVC_DOCTOR `
    --image=$IMG_DOCTOR --region=$REGION --platform=managed `
    --allow-unauthenticated --port=8080 --memory=1Gi --cpu=1 `
    --min-instances=0 --max-instances=3 --timeout=300 `
    --set-env-vars="NODE_ENV=production,DEMO_MODE=false,DATABASE_URL=$DATABASE_URL,DB_HOST=$PG_HOST,DB_PORT=5432,DB_NAME=$DB_NAME,DB_USER=$DB_USER,DB_PASSWORD=$DB_PASSWORD,DB_SSL=false,USE_POSTGRESQL=true,VITE_USE_POSTGRESQL=true,USE_GCS=false,VITE_USE_GCS=false,GCS_API_URL=http://localhost:3012,MEETING_SERVER_URL=$MEETING_URL,VITE_MEETING_SERVER_URL=$MEETING_URL,GEMINI_API_KEY=$GEMINI_API_KEY,GEMINI_MODEL=gemini-2.5-flash-lite,JWT_SECRET=$JWT_SECRET,JITSI_DOMAIN=meet.jit.si,GOOGLE_SPEECH_API_KEY=" `
    --execution-environment=gen2 --cpu-boost --quiet
if ($LASTEXITCODE -ne 0) { Write-Err "Doctor Portal deployment failed!"; exit 1 }
$DOCTOR_URL = Get-ServiceUrl $SVC_DOCTOR
Write-OK "Doctor Portal deployed: $DOCTOR_URL"

# ============================================================================
# STEP 6: UPDATE CORS
# ============================================================================
Write-Step "Updating Meeting Server CORS..."
$CORS_VALUE = "$PATIENT_URL,$DOCTOR_URL"
gcloud run services update $SVC_MEETING --region=$REGION `
    --set-env-vars="CORS_ORIGINS=$CORS_VALUE" --quiet 2>$null
if ($LASTEXITCODE -ne 0) {
    # Fallback: use env-vars-file for URLs with commas
    $envFile = [System.IO.Path]::GetTempFileName()
    "CORS_ORIGINS=$CORS_VALUE" | Out-File -Encoding utf8 -FilePath $envFile
    gcloud run services update $SVC_MEETING --region=$REGION `
        --update-env-vars="CORS_ORIGINS=*" --quiet
    Remove-Item $envFile -ErrorAction SilentlyContinue
}
Write-OK "CORS updated"

# ============================================================================
# DEPLOYMENT SUMMARY
# ============================================================================
Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  DEPLOYMENT COMPLETE — Izara Telemedicine v1.5.4 Dev-Testing" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  🖥️  PostgreSQL VM:   $PG_HOST`:5432 (GCE: $VM_NAME)" -ForegroundColor White
Write-Host "  🔧 pgAdmin:         $(Get-ServiceUrl $SVC_PGADMIN)" -ForegroundColor White
Write-Host "  🏥 Patient Portal:  $(Get-ServiceUrl $SVC_PATIENT)" -ForegroundColor White
Write-Host "  👨‍⚕ Doctor Portal:   $(Get-ServiceUrl $SVC_DOCTOR)" -ForegroundColor White
Write-Host "  🎥 Meeting Server:  $(Get-ServiceUrl $SVC_MEETING)" -ForegroundColor White
Write-Host ""
Write-Host "  👤 Test Accounts:" -ForegroundColor Yellow
Write-Host "     Patient:  demo.test@gmail.com / P@ssw0rd"
Write-Host "     Doctor:   doctor.test@izara.com / IzaraDoctor@2024"
Write-Host "     Admin:    admin.test@izara.com / IzaraAdmin@2024"
Write-Host ""
Write-Host "  🗑️  Teardown: .\scripts\deploy\cloud.ps1 -Teardown" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
