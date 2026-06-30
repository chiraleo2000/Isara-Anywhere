# Install mkcert root CA on Windows so Chrome/Edge trust *.demotoday.net LAN certs.
# Run PowerShell AS ADMINISTRATOR:
#   Set-ExecutionPolicy -Scope Process Bypass -Force
#   .\deploy\nginx\install-mkcert-ca-windows.ps1 -RootCaPath C:\Users\you\Downloads\isara-mkcert-rootCA.pem
param(
    [Parameter(Mandatory = $true)]
    [string]$RootCaPath
)

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "Run PowerShell as Administrator."
    exit 1
}

$RootCaPath = (Resolve-Path $RootCaPath).Path
if (-not (Test-Path $RootCaPath)) {
    Write-Error "File not found: $RootCaPath"
    exit 1
}

Write-Host "Installing mkcert root CA: $RootCaPath"
Import-Certificate -FilePath $RootCaPath -CertStoreLocation Cert:\LocalMachine\Root | Out-Null

Write-Host "Installed to Trusted Root Certification Authorities (Local Machine)."
Write-Host "Flush DNS and restart browsers (close all Chrome/Edge windows)."
ipconfig /flushdns | Out-Null

Write-Host ""
Write-Host "Test:"
Write-Host "  ping patient.demotoday.net   # should hit your Ubuntu LAN IP"
Write-Host "  https://patient.demotoday.net/login"
Write-Host ""
Write-Host "If you still see ERR_CERT_DATE_INVALID, sync Windows clock:"
Write-Host "  Settings → Time & language → Date & time → Sync now"
