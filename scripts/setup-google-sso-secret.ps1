# Creates / updates the `google-client-id` secret in Google Secret Manager.
# Usage:
#   .\scripts\setup-google-sso-secret.ps1 -ClientId "xxx.apps.googleusercontent.com" -ProjectId "izara-telemedicine"
param(
  [Parameter(Mandatory = $true)] [string] $ClientId,
  [string] $ProjectId = "izara-telemedicine",
  [string] $SecretName = "google-client-id"
)

$ErrorActionPreference = "Stop"

Write-Host "Checking secret existence: $SecretName in $ProjectId" -ForegroundColor Cyan
$existing = gcloud secrets describe $SecretName --project=$ProjectId 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Creating new secret $SecretName" -ForegroundColor Yellow
  $ClientId | gcloud secrets create $SecretName --project=$ProjectId --replication-policy="automatic" --data-file=-
} else {
  Write-Host "Adding new version to existing secret $SecretName" -ForegroundColor Yellow
  $ClientId | gcloud secrets versions add $SecretName --project=$ProjectId --data-file=-
}

Write-Host "Granting Cloud Run service account access (best-effort)" -ForegroundColor Cyan
$projectNumber = gcloud projects describe $ProjectId --format='value(projectNumber)'
$sa = "$projectNumber-compute@developer.gserviceaccount.com"
gcloud secrets add-iam-policy-binding $SecretName --project=$ProjectId `
  --member="serviceAccount:$sa" --role="roles/secretmanager.secretAccessor" 2>$null | Out-Null

Write-Host "Done." -ForegroundColor Green
