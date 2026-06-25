# Run in PowerShell AS ADMINISTRATOR:
#   Set-ExecutionPolicy -Scope Process Bypass -Force
#   .\deploy\nginx\windows-update-hosts.ps1

$ServerIp = "192.168.10.239"
$HostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$Line = "$ServerIp   patient.demotoday.net doctor.demotoday.net meeting.demotoday.net dbadmin.demotoday.net"

$content = Get-Content $HostsPath -Raw
$content = $content -replace '(?m)^.*\.isara\.local.*\r?\n', ''
$content = $content -replace '(?m)^.*\.demotoday\.net.*\r?\n', ''

if (-not $content.EndsWith("`n")) { $content += "`n" }
$content += "$Line`n"

Set-Content -Path $HostsPath -Value $content.TrimEnd() -NoNewline
Add-Content -Path $HostsPath -Value ""
ipconfig /flushdns | Out-Null

Write-Host "Updated hosts file. Test with: ping patient.demotoday.net"
Write-Host "Next: trust mkcert rootCA.pem from server — see deploy/nginx/WINDOWS_CLIENT_SETUP.md"
