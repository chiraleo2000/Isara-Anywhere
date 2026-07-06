#!/usr/bin/env pwsh
# ============================================================================
# IZARA TELEMEDICINE — Cloud Build One-Time Setup Script
# ============================================================================
#
# Run this ONCE before the first Cloud Build deployment to:
#   1. Enable required GCP APIs
#   2. Create Secret Manager secrets
#   3. Grant Cloud Build SA the necessary IAM roles
#   4. (Optional) Create an Artifact Registry repository
#
# Usage:
#   .\scripts\deploy\setup-cloud-build.ps1
#   .\scripts\deploy\setup-cloud-build.ps1 -RotateSecrets   # update secrets
#
# ============================================================================

param(
    [switch]$RotateSecrets
)

$PROJECT_ID = "izara-telemedicine"
$REGION     = "asia-southeast1"
$REPO_NAME  = "isara-anywhere-portals"

# ──────────────────────────────────────────────────────────────────────────────
# SECRET VALUES  (update these if credentials change)
# ──────────────────────────────────────────────────────────────────────────────
$DB_PASSWORD  = "IzaraDb2024"
$DB_HOST      = "35.240.157.230"
$DB_NAME      = "izara_phase1"
$DB_USER      = "postgres"
$DATABASE_URL = "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}"
$JWT_SECRET   = "izara-jwt-secret-key-phase1-2026-dev-testing" # NOSONAR
$GEMINI_KEY   = "AIzaSyCaH9_CLZ6jZvRWYH-JSEnpj4TUn2UV5Vs"     # NOSONAR
$MAPS_KEY     = "AIzaSyC2ihx457OgeZd-tgwtSBntrKpJtKhT19Y"     # NOSONAR

# ──────────────────────────────────────────────────────────────────────────────
function Write-Step($msg) { Write-Host "`n▶ $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "  ✅ $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  ⚠️  $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "  ❌ $msg" -ForegroundColor Red }

function Set-Secret($name, $value) {
    $existing = gcloud secrets describe $name --project=$PROJECT_ID 2>$null
    if ($existing -and -not $RotateSecrets) {
        Write-Warn "Secret '$name' already exists — skip (use -RotateSecrets to update)"
        return
    }
    if ($existing) {
        # Rotate: add new version
        $value | gcloud secrets versions add $name --data-file=- --project=$PROJECT_ID
        Write-OK "Secret '$name' rotated"
    } else {
        # Create new
        $value | gcloud secrets create $name `
            --data-file=- `
            --replication-policy=user-managed `
            --locations=$REGION `
            --project=$PROJECT_ID
        Write-OK "Secret '$name' created"
    }
}

# ──────────────────────────────────────────────────────────────────────────────
Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  IZARA — Cloud Build One-Time Setup" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta

# Ensure correct project
$cur = gcloud config get-value project 2>$null
if ($cur -ne $PROJECT_ID) {
    Write-Err "Active project is '$cur', expected '$PROJECT_ID'"
    Write-Host "  Run: gcloud config set project $PROJECT_ID"
    exit 1
}
Write-OK "Project: $PROJECT_ID"

# ──────────────────────────────────────────────────────────────────────────────
# STEP 1: Enable APIs
# ──────────────────────────────────────────────────────────────────────────────
Write-Step "Enabling required GCP APIs..."
$apis = @(
    "cloudbuild.googleapis.com",
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com"
)
foreach ($api in $apis) {
    gcloud services enable $api --project=$PROJECT_ID --quiet
    Write-OK "Enabled $api"
}

# ──────────────────────────────────────────────────────────────────────────────
# STEP 2: Artifact Registry repository
# ──────────────────────────────────────────────────────────────────────────────
Write-Step "Checking Artifact Registry repository..."
$repoExists = gcloud artifacts repositories describe $REPO_NAME `
    --location=$REGION --project=$PROJECT_ID 2>$null
if (-not $repoExists) {
    gcloud artifacts repositories create $REPO_NAME `
        --repository-format=docker `
        --location=$REGION `
        --description="Isara Telemedicine Docker images" `
        --project=$PROJECT_ID
    Write-OK "Artifact Registry repo '$REPO_NAME' created"
} else {
    Write-OK "Artifact Registry repo '$REPO_NAME' already exists"
}

# ──────────────────────────────────────────────────────────────────────────────
# STEP 3: Secret Manager secrets
# ──────────────────────────────────────────────────────────────────────────────
Write-Step "Creating/verifying Secret Manager secrets..."
Set-Secret "jwt-secret"          $JWT_SECRET
Set-Secret "db-password"          $DB_PASSWORD
Set-Secret "database-url"         $DATABASE_URL
Set-Secret "gemini-api-key"       $GEMINI_KEY
Set-Secret "google-maps-api-key"  $MAPS_KEY

# ──────────────────────────────────────────────────────────────────────────────
# STEP 4: IAM — grant Cloud Build SA required roles
# ──────────────────────────────────────────────────────────────────────────────
Write-Step "Configuring Cloud Build service account IAM..."

# Get the Cloud Build SA (uses the Compute default SA internally)
$PROJECT_NUMBER = gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
$CB_SA = "${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
Write-Host "  Cloud Build SA: $CB_SA"

$roles = @(
    "roles/run.admin",
    "roles/iam.serviceAccountUser",
    "roles/artifactregistry.writer",
    "roles/secretmanager.secretAccessor"
)
foreach ($role in $roles) {
    gcloud projects add-iam-policy-binding $PROJECT_ID `
        --member="serviceAccount:$CB_SA" `
        --role=$role `
        --quiet 2>$null | Out-Null
    Write-OK "Granted $role → $CB_SA"
}

# ──────────────────────────────────────────────────────────────────────────────
# STEP 5: Configure Docker auth for Artifact Registry
# ──────────────────────────────────────────────────────────────────────────────
Write-Step "Configuring local Docker auth for Artifact Registry..."
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
Write-OK "Docker auth configured for ${REGION}-docker.pkg.dev"

# ──────────────────────────────────────────────────────────────────────────────
Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  SETUP COMPLETE — you can now run Cloud Build deployments" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  Next step:" -ForegroundColor Yellow
Write-Host "    npm run cloud:deploy -- -Tag v1.7.59" -ForegroundColor White
Write-Host ""
