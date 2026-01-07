# ============================================================================
# IZARA TELEMEDICINE - Development & Deployment Workflow
# ============================================================================
#
# This script provides the proper workflow for development, testing, and deployment
#
# WORKFLOW:
#   1. Local Development → Test Locally → Pass Tests
#   2. Build Docker Images → Push to GCR
#   3. Deploy to Cloud Run → Run Cloud Tests
#   4. Verify Production Ready
#
# ============================================================================

param(
    [Parameter(Mandatory=$false)]
    [string]$Version = "",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("dev", "sit", "uat", "prod")]
    [string]$Environment = "dev",
    
    [switch]$LocalOnly,
    [switch]$SkipTests,
    [switch]$SkipBuild,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

# Colors
function Write-Success($msg) { Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Error($msg) { Write-Host "❌ $msg" -ForegroundColor Red }
function Write-Info($msg) { Write-Host "ℹ️  $msg" -ForegroundColor Cyan }
function Write-Warning($msg) { Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Write-Step($msg) { Write-Host "`n🔷 $msg" -ForegroundColor Blue }

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = $ScriptDir
$TestsDir = Join-Path $RootDir "scripts\tests"

if ($Help) {
    Write-Host ""
    Write-Host "IZARA TELEMEDICINE - Development & Deployment Workflow"
    Write-Host "========================================================"
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  .\scripts\deploy-workflow.ps1 -Version '1.2.0' -Environment dev"
    Write-Host "  .\scripts\deploy-workflow.ps1 -Version '1.2.0' -Environment sit"
    Write-Host "  .\scripts\deploy-workflow.ps1 -Version '1.2.0' -Environment uat"
    Write-Host "  .\scripts\deploy-workflow.ps1 -Version '1.2.0' -Environment prod"
    Write-Host "  .\scripts\deploy-workflow.ps1 -LocalOnly              # Local tests only"
    Write-Host ""
    Write-Host "Parameters:"
    Write-Host "  -Version       Version tag (e.g., '1.2.0')"
    Write-Host "  -Environment   Target environment: dev, sit, uat, prod"
    Write-Host "  -LocalOnly     Run local tests only, don't deploy"
    Write-Host "  -SkipTests     Skip tests (not recommended)"
    Write-Host "  -SkipBuild     Skip Docker build (redeploy existing)"
    Write-Host ""
    Write-Host "Environments:"
    Write-Host "  dev   - Development (local testing + optional cloud deploy)"
    Write-Host "  sit   - System Integration Testing"
    Write-Host "  uat   - User Acceptance Testing"
    Write-Host "  prod  - Production (requires all tests to pass)"
    Write-Host ""
    exit 0
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗"
Write-Host "║     IZARA TELEMEDICINE - Deployment Workflow                 ║"
Write-Host "╠══════════════════════════════════════════════════════════════╣"
Write-Host "║  Environment: $($Environment.ToUpper().PadRight(45))║"
if ($Version) {
Write-Host "║  Version:     $($Version.PadRight(45))║"
}
Write-Host "╚══════════════════════════════════════════════════════════════╝"
Write-Host ""

# ============================================================================
# STEP 1: LOCAL DEVELOPMENT TESTS
# ============================================================================

Write-Step "STEP 1: Running Local Development Tests"

if (-not $SkipTests) {
    Write-Info "Running local API and GCS connection tests..."
    
    try {
        Set-Location $TestsDir
        $localTestResult = & node localDevTests.cjs --api-only 2>&1
        Write-Output $localTestResult
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Local tests failed! Please fix issues before deploying."
            Write-Warning "Run: node scripts/tests/localDevTests.cjs for detailed results"
            exit 1
        }
        
        Write-Success "Local tests passed!"
    } catch {
        Write-Warning "Could not run local tests (servers may not be running)"
        Write-Info "Make sure local servers are running: .\scripts\start-local-dev.ps1"
    }
    
    Set-Location $RootDir
} else {
    Write-Warning "Skipping local tests (not recommended for production)"
}

if ($LocalOnly) {
    Write-Success "Local testing completed!"
    Write-Info "To deploy: .\scripts\deploy-workflow.ps1 -Version 'x.x.x' -Environment sit"
    exit 0
}

# ============================================================================
# STEP 2: VERSION CHECK
# ============================================================================

Write-Step "STEP 2: Version Validation"

if (-not $Version) {
    $Version = Read-Host "Enter version number (e.g., 1.2.0)"
}

if ($Version -notmatch '^\d+\.\d+\.\d+$') {
    Write-Error "Invalid version format. Use semantic versioning: x.y.z"
    exit 1
}

Write-Success "Version: $Version"

# ============================================================================
# STEP 3: BUILD DOCKER IMAGES
# ============================================================================

Write-Step "STEP 3: Building Docker Images"

if (-not $SkipBuild) {
    Write-Info "Building and pushing Docker images..."
    
    $buildScript = Join-Path $RootDir "scripts\build-and-push-gcr.ps1"
    & $buildScript -Version $Version
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker build failed!"
        exit 1
    }
    
    Write-Success "Docker images built and pushed"
} else {
    Write-Warning "Skipping Docker build (using existing images)"
}

# ============================================================================
# STEP 4: DEPLOY TO CLOUD RUN
# ============================================================================

Write-Step "STEP 4: Deploying to Cloud Run"

$deployScript = Join-Path $RootDir "scripts\deploy-to-cloud-run.ps1"
& $deployScript -Version $Version

if ($LASTEXITCODE -ne 0) {
    Write-Error "Cloud Run deployment failed!"
    exit 1
}

Write-Success "Deployed to Cloud Run"

# ============================================================================
# STEP 5: POST-DEPLOYMENT TESTS
# ============================================================================

Write-Step "STEP 5: Running Post-Deployment Tests"

if (-not $SkipTests) {
    Write-Info "Waiting 30 seconds for Cloud Run services to stabilize..."
    Start-Sleep -Seconds 30
    
    Write-Info "Running Cloud Run E2E tests..."
    
    Set-Location $TestsDir
    $cloudTestResult = & node cloudRunTests.cjs 2>&1
    Write-Output $cloudTestResult
    
    Set-Location $RootDir
    
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Some cloud tests failed. Check results above."
        
        if ($Environment -eq "prod") {
            Write-Error "Production deployment requires all tests to pass!"
            Write-Info "Consider rolling back or fixing the issues."
            exit 1
        }
    } else {
        Write-Success "All cloud tests passed!"
    }
}

# ============================================================================
# SUMMARY
# ============================================================================

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗"
Write-Host "║                 DEPLOYMENT COMPLETE                          ║"
Write-Host "╠══════════════════════════════════════════════════════════════╣"
Write-Host "║  Version:     $($Version.PadRight(45))║"
Write-Host "║  Environment: $($Environment.ToUpper().PadRight(45))║"
Write-Host "╠══════════════════════════════════════════════════════════════╣"
Write-Host "║  Patient Portal: https://izara-patient-portal-724889190329   ║"
Write-Host "║                  .asia-southeast1.run.app                    ║"
Write-Host "║  Doctor Portal:  https://izara-doctor-portal-724889190329    ║"
Write-Host "║                  .asia-southeast1.run.app                    ║"
Write-Host "╚══════════════════════════════════════════════════════════════╝"
Write-Host ""

Write-Success "Deployment workflow completed successfully!"
Write-Host ""
