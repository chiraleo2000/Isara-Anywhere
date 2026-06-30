#!/usr/bin/env pwsh
# Apply low-cost Cloud Run sizing WITHOUT rebuilding images.
# Profile: 1 vCPU, 1Gi RAM, min=0 max=2, no cpu-boost.
#
# Usage:
#   .\scripts\deploy\patch-cloud-run-cost.ps1
#   .\scripts\deploy\patch-cloud-run-cost.ps1 -MinInstances 0 -MaxInstances 2

param(
    [int]$MinInstances = 0,
    [int]$MaxInstances = 2,
    [string]$Region = "asia-southeast1",
    [string]$Project = "izara-telemedicine"
)

$ErrorActionPreference = "Stop"

$services = @(
    @{ Name = "izara-meeting-server-dev-testing"; Concurrency = 40 },
    @{ Name = "izara-patient-portal-dev-testing"; Concurrency = 80 },
    @{ Name = "izara-doctor-portal-dev-testing"; Concurrency = 80 }
)

Write-Host "`nPatching Cloud Run cost profile ($MinInstances–$MaxInstances instances, 1 CPU, 1Gi)..." -ForegroundColor Cyan

foreach ($svc in $services) {
    Write-Host "  → $($svc.Name)" -ForegroundColor Yellow
    gcloud run services update $svc.Name `
        --project=$Project `
        --region=$Region `
        --cpu=1 `
        --memory=1Gi `
        --min-instances=$MinInstances `
        --max-instances=$MaxInstances `
        --concurrency=$svc.Concurrency `
        --no-cpu-boost `
        --quiet
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to update $($svc.Name)"
    }
}

Write-Host "`nDone. Verify:" -ForegroundColor Green
gcloud run services list --project=$Project --region=$Region `
    --format="table(SERVICE,REGION,URL)"
