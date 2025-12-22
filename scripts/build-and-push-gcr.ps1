# =============================================================================
# Isara Anywhere - Docker Build and Push to Google Container Registry
# =============================================================================
# Registry: asia-southeast1-docker.pkg.dev/izara-telemedicine/isara-anywhere-portals
#
# Usage:
#   .\build-and-push-gcr.ps1                    # Build and push both portals
#   .\build-and-push-gcr.ps1 -Portal patient    # Build and push only patient portal
#   .\build-and-push-gcr.ps1 -Portal doctor     # Build and push only doctor portal
#   .\build-and-push-gcr.ps1 -Version "1.0.1"   # Specify custom version
#   .\build-and-push-gcr.ps1 -SkipPush          # Build only, don't push
# =============================================================================

param(
    [ValidateSet("all", "patient", "doctor")]
    [string]$Portal = "all",
    
    [string]$Version = "latest",
    
    [switch]$SkipPush,
    
    [switch]$NoCache
)

# Configuration
$REGISTRY = "asia-southeast1-docker.pkg.dev/izara-telemedicine/isara-anywhere-portals"
# Fix: Use parent of scripts folder as ROOT_DIR
$ROOT_DIR = Split-Path -Parent $PSScriptRoot
if (-not $ROOT_DIR) {
    $ROOT_DIR = (Get-Location).Path
}
# If ROOT_DIR doesn't contain Isara-patient-portal, try current location
if (-not (Test-Path (Join-Path $ROOT_DIR "Isara-patient-portal"))) {
    $ROOT_DIR = (Get-Location).Path
}

# Get version from package.json if not specified
function Get-PackageVersion {
    param([string]$ProjectPath)
    $packageJson = Get-Content "$ProjectPath\package.json" | ConvertFrom-Json
    return $packageJson.version
}

# Build and push function
function Build-And-Push {
    param(
        [string]$Name,
        [string]$ProjectPath,
        [string]$Dockerfile,
        [string]$ImageVersion
    )
    
    $imageName = "$REGISTRY/${Name}:${ImageVersion}"
    $imageLatest = "$REGISTRY/${Name}:latest"
    
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "Building: $Name" -ForegroundColor Cyan
    Write-Host "Version: $ImageVersion" -ForegroundColor Cyan
    Write-Host "Path: $ProjectPath" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    
    # Build arguments
    $buildArgs = @(
        "build",
        "-t", $imageName,
        "-t", $imageLatest,
        "-f", "$ProjectPath\$Dockerfile",
        $ProjectPath
    )
    
    if ($NoCache) {
        $buildArgs = @("build", "--no-cache") + $buildArgs[1..($buildArgs.Length-1)]
    }
    
    Write-Host ""
    Write-Host "Building Docker image..." -ForegroundColor Yellow
    Write-Host "docker $($buildArgs -join ' ')" -ForegroundColor DarkGray
    
    & docker @buildArgs
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Docker build failed for $Name" -ForegroundColor Red
        return $false
    }
    
    Write-Host "Build successful: $imageName" -ForegroundColor Green
    
    if (-not $SkipPush) {
        Write-Host ""
        Write-Host "Pushing to GCR..." -ForegroundColor Yellow
        
        # Push versioned tag
        Write-Host "docker push $imageName" -ForegroundColor DarkGray
        docker push $imageName
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: Docker push failed for $imageName" -ForegroundColor Red
            return $false
        }
        
        # Push latest tag
        Write-Host "docker push $imageLatest" -ForegroundColor DarkGray
        docker push $imageLatest
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: Docker push failed for $imageLatest" -ForegroundColor Red
            return $false
        }
        
        Write-Host "Push successful!" -ForegroundColor Green
        Write-Host "  - $imageName" -ForegroundColor Cyan
        Write-Host "  - $imageLatest" -ForegroundColor Cyan
    }
    
    return $true
}

# Main script
Write-Host ""
Write-Host "==================================================" -ForegroundColor Magenta
Write-Host "  Isara Anywhere - Docker Build & Push to GCR" -ForegroundColor Magenta
Write-Host "==================================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "Registry: $REGISTRY" -ForegroundColor White
Write-Host "Root Dir: $ROOT_DIR" -ForegroundColor White
Write-Host ""

# Check Docker is running
$dockerInfo = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check GCP authentication
Write-Host "Checking GCP authentication..." -ForegroundColor Yellow
$gcloudAuth = gcloud auth list --format="value(account)" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: gcloud is not authenticated. Run: gcloud auth login" -ForegroundColor Red
    exit 1
}
Write-Host "Authenticated as: $gcloudAuth" -ForegroundColor Green

# Configure Docker to use GCP credentials
Write-Host "Configuring Docker for GCR..." -ForegroundColor Yellow
gcloud auth configure-docker asia-southeast1-docker.pkg.dev --quiet

$results = @()

# Build Patient Portal
if ($Portal -eq "all" -or $Portal -eq "patient") {
    $patientPath = Join-Path $ROOT_DIR "Isara-patient-portal"
    $patientVersion = if ($Version -ne "latest") { $Version } else { Get-PackageVersion $patientPath }
    
    $result = Build-And-Push `
        -Name "isara-patient-portal" `
        -ProjectPath $patientPath `
        -Dockerfile "Dockerfile.unified" `
        -ImageVersion $patientVersion
    
    $results += @{
        Name = "Patient Portal"
        Success = $result
        Image = "$REGISTRY/isara-patient-portal:$patientVersion"
    }
}

# Build Doctor Portal
if ($Portal -eq "all" -or $Portal -eq "doctor") {
    $doctorPath = Join-Path $ROOT_DIR "Isara-doctor-portal"
    $doctorVersion = if ($Version -ne "latest") { $Version } else { Get-PackageVersion $doctorPath }
    
    $result = Build-And-Push `
        -Name "isara-doctor-portal" `
        -ProjectPath $doctorPath `
        -Dockerfile "Dockerfile.unified" `
        -ImageVersion $doctorVersion
    
    $results += @{
        Name = "Doctor Portal"
        Success = $result
        Image = "$REGISTRY/isara-doctor-portal:$doctorVersion"
    }
}

# Summary
Write-Host ""
Write-Host "==================================================" -ForegroundColor Magenta
Write-Host "  Build & Push Summary" -ForegroundColor Magenta
Write-Host "==================================================" -ForegroundColor Magenta

foreach ($r in $results) {
    $status = if ($r.Success) { "SUCCESS" } else { "FAILED" }
    $color = if ($r.Success) { "Green" } else { "Red" }
    Write-Host "$($r.Name): " -NoNewline
    Write-Host $status -ForegroundColor $color
    if ($r.Success) {
        Write-Host "  Image: $($r.Image)" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
