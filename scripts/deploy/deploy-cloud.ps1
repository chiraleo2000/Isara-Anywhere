# =============================================================================
# IZARA TELEMEDICINE - GOOGLE CLOUD DEPLOYMENT
# =============================================================================
# Deploys to Google Cloud Run with Cloud SQL
# Prerequisites:
#   - gcloud CLI installed and authenticated
#   - Project configured with Cloud Run and Cloud SQL enabled
#   - Service account with appropriate permissions
#
# Usage: .\deploy-cloud.ps1 -ProjectId <project> [-Environment staging|production]
# =============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectId,
    
    [ValidateSet("staging", "production")]
    [string]$Environment = "staging",
    
    [switch]$SeedData,
    [switch]$BuildOnly
)

$ErrorActionPreference = "Stop"

# Configuration
$REGION = "asia-southeast1"
$PATIENT_PORTAL_SERVICE = "izara-patient-portal"
$DOCTOR_PORTAL_SERVICE = "izara-doctor-portal"
$GCR_HOSTNAME = "asia.gcr.io"

# Environment-specific settings
$config = @{
    staging = @{
        CLOUD_SQL_INSTANCE = "$ProjectId`:$REGION`:izara-sql-staging"
        DATABASE_NAME = "izara_phase1"
        MIN_INSTANCES = 0
        MAX_INSTANCES = 2
    }
    production = @{
        CLOUD_SQL_INSTANCE = "$ProjectId`:$REGION`:izara-sql-production"
        DATABASE_NAME = "izara_phase1"
        MIN_INSTANCES = 1
        MAX_INSTANCES = 10
    }
}

$envConfig = $config[$Environment]

function Write-Status { param($msg) Write-Host "`n[INFO] $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warning { param($msg) Write-Host "[WARN] $msg" -ForegroundColor Yellow }

# Get directories
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent (Split-Path -Parent $ScriptDir)

Write-Host "=============================================="
Write-Host "  IZARA TELEMEDICINE - CLOUD DEPLOYMENT"
Write-Host "=============================================="
Write-Host "Project ID:  $ProjectId"
Write-Host "Environment: $Environment"
Write-Host "Region:      $REGION"

# Verify gcloud is installed and authenticated
Write-Status "Verifying gcloud authentication..."
$account = gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>&1
if (!$account) {
    Write-Error "Not authenticated. Run: gcloud auth login"
    exit 1
}
Write-Success "Authenticated as: $account"

# Configure Docker for GCR
Write-Status "Configuring Docker for GCR..."
gcloud auth configure-docker $GCR_HOSTNAME --quiet

# Build and push Patient Portal
Write-Status "Building Patient Portal image..."
$patientImage = "$GCR_HOSTNAME/$ProjectId/$PATIENT_PORTAL_SERVICE`:$Environment"
Set-Location "$RootDir\Isara-patient-portal"
docker build -f Dockerfile.production -t $patientImage .
if ($LASTEXITCODE -ne 0) { throw "Patient Portal build failed" }

Write-Status "Pushing Patient Portal image..."
docker push $patientImage
Write-Success "Patient Portal image pushed"

# Build and push Doctor Portal
Write-Status "Building Doctor Portal image..."
$doctorImage = "$GCR_HOSTNAME/$ProjectId/$DOCTOR_PORTAL_SERVICE`:$Environment"
Set-Location "$RootDir\Isara-doctor-portal"
docker build -f Dockerfile.production -t $doctorImage .
if ($LASTEXITCODE -ne 0) { throw "Doctor Portal build failed" }

Write-Status "Pushing Doctor Portal image..."
docker push $doctorImage
Write-Success "Doctor Portal image pushed"

if ($BuildOnly) {
    Write-Host "`nBuild complete. Images pushed to GCR."
    exit 0
}

# Deploy to Cloud Run - Patient Portal
Write-Status "Deploying Patient Portal to Cloud Run..."
gcloud run deploy $PATIENT_PORTAL_SERVICE `
    --image $patientImage `
    --platform managed `
    --region $REGION `
    --project $ProjectId `
    --add-cloudsql-instances $envConfig.CLOUD_SQL_INSTANCE `
    --min-instances $envConfig.MIN_INSTANCES `
    --max-instances $envConfig.MAX_INSTANCES `
    --memory 512Mi `
    --cpu 1 `
    --port 3005 `
    --allow-unauthenticated `
    --set-env-vars "NODE_ENV=production,DATABASE_URL=postgresql://postgres:@localhost/$($envConfig.DATABASE_NAME)?host=/cloudsql/$($envConfig.CLOUD_SQL_INSTANCE)"

Write-Success "Patient Portal deployed"

# Deploy to Cloud Run - Doctor Portal
Write-Status "Deploying Doctor Portal to Cloud Run..."
gcloud run deploy $DOCTOR_PORTAL_SERVICE `
    --image $doctorImage `
    --platform managed `
    --region $REGION `
    --project $ProjectId `
    --add-cloudsql-instances $envConfig.CLOUD_SQL_INSTANCE `
    --min-instances $envConfig.MIN_INSTANCES `
    --max-instances $envConfig.MAX_INSTANCES `
    --memory 512Mi `
    --cpu 1 `
    --port 3010 `
    --allow-unauthenticated `
    --set-env-vars "NODE_ENV=production,DATABASE_URL=postgresql://postgres:@localhost/$($envConfig.DATABASE_NAME)?host=/cloudsql/$($envConfig.CLOUD_SQL_INSTANCE)"

Write-Success "Doctor Portal deployed"

# Seed data if requested
if ($SeedData) {
    Write-Status "To seed Cloud SQL, run:"
    Write-Host "  gcloud sql connect <instance-name> --user=postgres --database=izara_phase1 < scripts\database\seed-cloud.sql"
}

# Get service URLs
Write-Status "Getting service URLs..."
$patientUrl = gcloud run services describe $PATIENT_PORTAL_SERVICE --platform managed --region $REGION --project $ProjectId --format="value(status.url)"
$doctorUrl = gcloud run services describe $DOCTOR_PORTAL_SERVICE --platform managed --region $REGION --project $ProjectId --format="value(status.url)"

Write-Host "`n=============================================="
Write-Host "  CLOUD DEPLOYMENT COMPLETE"
Write-Host "=============================================="
Write-Host "`nService URLs:" -ForegroundColor Yellow
Write-Host "  Patient Portal: $patientUrl"
Write-Host "  Doctor Portal:  $doctorUrl"
Write-Host ""
Write-Host "Test Credentials:" -ForegroundColor Yellow
Write-Host "  Patient: demo.test@gmail.com / P@ssw0rd"
Write-Host "  Doctor:  doctor.test@izara.com / IzaraDoctor@2024"
Write-Host "  Admin:   admin.test@izara.com / IzaraAdmin@2024"
Write-Host ""
