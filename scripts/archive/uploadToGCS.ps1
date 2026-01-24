# ================================================================================
# IZARA TELEMEDICINE - GCS UPLOAD HELPER (PowerShell)
# ================================================================================
#
# Uploads generated demo data to Google Cloud Storage buckets.
#
# Prerequisites:
# 1. Google Cloud SDK installed (gcloud)
# 2. Authenticated: gcloud auth application-default login
#
# Usage: .\scripts\uploadToGCS.ps1
#
# Version: 2.0.0
# Date: November 2025
# ================================================================================

$ErrorActionPreference = "Stop"

# Configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$DataDir = Join-Path $ScriptDir "output"

$Buckets = @{
    "izara-users-credentials" = "AUTH"
    "izara-doctors-data" = "DOCTOR"
    "izara-patients-data" = "PATIENT"
    "izara-appointments" = "APPOINTMENTS"
    "izara-meta-data" = "METADATA"
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🚀 IZARA TELEMEDICINE - GCS UPLOAD UTILITY (PowerShell)" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow
Write-Host ""

# Check gcloud
try {
    $null = & gcloud --version 2>&1
    Write-Host "   ✅ Google Cloud SDK installed" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Google Cloud SDK (gcloud) is not installed." -ForegroundColor Red
    Write-Host "      Install from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Gray
    exit 1
}

# Check authentication
try {
    $null = & gcloud auth print-access-token 2>&1
    Write-Host "   ✅ Authenticated with Google Cloud" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Not authenticated with Google Cloud." -ForegroundColor Red
    Write-Host "      Run: gcloud auth application-default login" -ForegroundColor Gray
    exit 1
}

# Check data directory
if (-not (Test-Path $DataDir)) {
    Write-Host ""
    Write-Host "   ❌ Data directory not found: $DataDir" -ForegroundColor Red
    Write-Host "      Run: node scripts/generateUnifiedDemoData.cjs first" -ForegroundColor Gray
    exit 1
}
Write-Host "   ✅ Data directory found" -ForegroundColor Green

Write-Host ""
Write-Host "📤 Uploading data to GCS buckets..." -ForegroundColor Yellow
Write-Host ""

$TotalUploaded = 0

foreach ($Bucket in $Buckets.Keys) {
    $LocalDir = Join-Path $DataDir $Bucket

    Write-Host ""
    Write-Host "📁 [$Bucket]" -ForegroundColor Cyan

    if (-not (Test-Path $LocalDir)) {
        Write-Host "   ⚠️  No data found for this bucket" -ForegroundColor Yellow
        continue
    }

    $Files = Get-ChildItem -Path $LocalDir -Recurse -Filter "*.json"
    $BucketCount = 0

    foreach ($File in $Files) {
        $RelativePath = $File.FullName.Substring($LocalDir.Length + 1).Replace("\", "/")
        $GcsPath = "gs://$Bucket/$RelativePath"

        try {
            & gsutil cp $File.FullName $GcsPath 2>&1 | Out-Null
            Write-Host "   ✅ Uploaded: $Bucket/$RelativePath" -ForegroundColor Green
            $BucketCount++
            $TotalUploaded++
        } catch {
            Write-Host "   ❌ Failed: $Bucket/$RelativePath" -ForegroundColor Red
        }
    }

    Write-Host "   📊 Uploaded $BucketCount files" -ForegroundColor Gray
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ UPLOAD COMPLETE! Total files uploaded: $TotalUploaded" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "🔧 Post-upload configuration:" -ForegroundColor Yellow
Write-Host "   1. Set CORS on buckets:" -ForegroundColor Gray
Write-Host "      gsutil cors set scripts/cors.json gs://izara-users-credentials" -ForegroundColor DarkGray
Write-Host "      gsutil cors set scripts/cors.json gs://izara-doctors-data" -ForegroundColor DarkGray
Write-Host "      gsutil cors set scripts/cors.json gs://izara-patients-data" -ForegroundColor DarkGray
Write-Host "      gsutil cors set scripts/cors.json gs://izara-appointments" -ForegroundColor DarkGray
Write-Host "      gsutil cors set scripts/cors.json gs://izara-meta-data" -ForegroundColor DarkGray
Write-Host ""
Write-Host "   2. Make metadata publicly readable (optional):" -ForegroundColor Gray
Write-Host "      gsutil iam ch allUsers:objectViewer gs://izara-meta-data" -ForegroundColor DarkGray
Write-Host ""
Write-Host "   3. Update portal .env files with bucket names" -ForegroundColor Gray
Write-Host ""
