#!/usr/bin/env pwsh
# ============================================================================
# IZARA TELEMEDICINE — Submit Cloud Build Deployment
# ============================================================================
#
# Triggers a full build + deploy of all 3 Isara services via Google Cloud Build.
# Uploads source to GCS, runs cloudbuild.yaml in the cloud — no local Docker needed.
#
# Usage:
#   .\scripts\deploy\submit-cloud-build.ps1              # Deploy all (v1.6.0)
#   .\scripts\deploy\submit-cloud-build.ps1 -Tag v1.7.0  # Deploy with custom tag
#   .\scripts\deploy\submit-cloud-build.ps1 -StatusOnly  # Check last build status
#   .\scripts\deploy\submit-cloud-build.ps1 -Async       # Submit & don't wait
#
# Prerequisites:
#   - gcloud authenticated:  gcloud auth login
#   - Project set:           gcloud config set project izara-telemedicine
#   - Setup complete:        .\scripts\deploy\setup-cloud-build.ps1
#
# ============================================================================

param(
    [string]$Tag        = "v1.6.0",
    [switch]$Async,
    [switch]$StatusOnly
)

$PROJECT_ID  = "izara-telemedicine"
$REGION      = "asia-southeast1"
$ROOT_DIR    = (Resolve-Path "$PSScriptRoot\..\..").Path
$CB_CONFIG   = "$ROOT_DIR\cloudbuild.yaml"

function Write-Step($msg) { Write-Host "`n▶ $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "  ✅ $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  ⚠️  $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "  ❌ $msg" -ForegroundColor Red }

# ──────────────────────────────────────────────────────────────────────────────
# STATUS ONLY
# ──────────────────────────────────────────────────────────────────────────────
if ($StatusOnly) {
    Write-Host "`n═══ CLOUD BUILD — Recent Builds ═══" -ForegroundColor Magenta
    gcloud builds list --limit=5 --project=$PROJECT_ID `
        --format="table(id,status,createTime.date(format='%Y-%m-%d %H:%M'),duration,source.storageSource.bucket)"
    Write-Host ""
    Write-Host "Current Cloud Run services:" -ForegroundColor Yellow
    gcloud run services list --region=$REGION --project=$PROJECT_ID `
        --format="table(SERVICE,URL,LAST_DEPLOYED_BY,LAST_DEPLOYED_AT)"
    exit 0
}

# ──────────────────────────────────────────────────────────────────────────────
# PRE-FLIGHT
# ──────────────────────────────────────────────────────────────────────────────
Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  IZARA TELEMEDICINE — Cloud Build Submission" -ForegroundColor Magenta
Write-Host "  Tag: $Tag  |  Project: $PROJECT_ID  |  Region: $REGION" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta

# Verify gcloud auth
Write-Step "Pre-flight checks..."
$project = gcloud config get-value project 2>$null
if ($project -ne $PROJECT_ID) {
    Write-Err "Active project is '$project', expected '$PROJECT_ID'"
    Write-Host "  Run: gcloud config set project $PROJECT_ID"
    exit 1
}
Write-OK "Project: $PROJECT_ID"

if (-not (Test-Path $CB_CONFIG)) {
    Write-Err "cloudbuild.yaml not found at: $CB_CONFIG"
    exit 1
}
Write-OK "Config: $CB_CONFIG"

# Check that secrets exist
Write-Step "Verifying Secret Manager secrets..."
$secrets = @("jwt-secret", "db-password", "database-url", "gemini-api-key", "google-maps-api-key")
$missing = @()
foreach ($s in $secrets) {
    $exists = gcloud secrets describe $s --project=$PROJECT_ID 2>$null
    if ($exists) { Write-OK "Found: $s" }
    else { Write-Warn "Missing: $s"; $missing += $s }
}
if ($missing.Count -gt 0) {
    Write-Err "Missing secrets: $($missing -join ', ')"
    Write-Host "  Run: .\scripts\deploy\setup-cloud-build.ps1"
    exit 1
}

# ──────────────────────────────────────────────────────────────────────────────
# SUBMIT
# ──────────────────────────────────────────────────────────────────────────────
Write-Step "Submitting build to Google Cloud Build..."
Write-Host "  Source: $ROOT_DIR" -ForegroundColor Gray
Write-Host "  Config: cloudbuild.yaml" -ForegroundColor Gray
Write-Host "  Tag:    $Tag" -ForegroundColor Gray
Write-Host ""
Write-Host "  Build logs will be available at:" -ForegroundColor Yellow
Write-Host "  https://console.cloud.google.com/cloud-build/builds?project=$PROJECT_ID" -ForegroundColor White
Write-Host ""

$gcloudArgs = @(
    "builds", "submit", $ROOT_DIR,
    "--config=$CB_CONFIG",
    "--project=$PROJECT_ID",
    "--substitutions=_TAG=$Tag",
    "--region=$REGION"
)

if ($Async) {
    $gcloudArgs += "--async"
    Write-Warn "Running in async mode — build submitted, not waiting for completion"
}

Push-Location $ROOT_DIR
gcloud @gcloudArgs
$exitCode = $LASTEXITCODE
Pop-Location

# ──────────────────────────────────────────────────────────────────────────────
# RESULT
# ──────────────────────────────────────────────────────────────────────────────
Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "  BUILD & DEPLOY SUCCESSFUL" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Cloud Run Services:" -ForegroundColor Yellow
    gcloud run services list --region=$REGION --project=$PROJECT_ID `
        --format="table(SERVICE,URL)" 2>$null
    Write-Host ""
    Write-Host "  Test Accounts:" -ForegroundColor Yellow
    Write-Host "    Patient:  demo.test@gmail.com / P@ssw0rd"
    Write-Host "    Doctor:   doctor.test@izara.com / IzaraDoctor@2024"
    Write-Host "    Admin:    admin.test@izara.com / IzaraAdmin@2024"
} else {
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host "  BUILD FAILED (exit code $exitCode)" -ForegroundColor Red
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host ""
    Write-Host "  View full logs:" -ForegroundColor Yellow
    Write-Host "  https://console.cloud.google.com/cloud-build/builds?project=$PROJECT_ID" -ForegroundColor White
    Write-Host ""
    Write-Host "  Quick log tail:" -ForegroundColor Yellow
    Write-Host "    gcloud builds list --limit=1 --project=$PROJECT_ID" -ForegroundColor Gray
    exit $exitCode
}
