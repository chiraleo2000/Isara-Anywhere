# Run in PowerShell AS ADMINISTRATOR:
#   Set-ExecutionPolicy -Scope Process Bypass -Force
#   .\deploy\nginx\windows-update-hosts.ps1

$ServerIp = "192.168.10.239"
$HostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$Line = "$ServerIp   patient.demotoday.net doctor.demotoday.net meeting.demotoday.net meet.demotoday.net dbadmin.demotoday.net"

$content = Get-Content $HostsPath -Raw
$content = $content -replace '(?m)^.*\.isara\.local.*\r?\n', ''
$content = $content -replace '(?m)^.*\.demotoday\.net.*\r?\n', ''

if (-not $content.EndsWith("`n")) { $content += "`n" }
$content += "$Line`n"

Set-Content -Path $HostsPath -Value $content.TrimEnd() -NoNewline
Add-Content -Path $HostsPath -Value ""
ipconfig /flushdns | Out-Null

Write-Host "Updated hosts file. Test with:"
Write-Host "  ping meet.demotoday.net   # must reply from $ServerIp (required for video/cam/mic)"
Write-Host "  ping patient.demotoday.net"
Write-Host "Next: install mkcert CA — .\deploy\nginx\install-mkcert-ca-windows.ps1 -RootCaPath <path\to\isara-mkcert-rootCA.pem>"
Write-Host "See deploy/nginx/WINDOWS_CLIENT_SETUP.md (ERR_CERT_DATE_INVALID → sync clock + fix-tls.sh on server)"
