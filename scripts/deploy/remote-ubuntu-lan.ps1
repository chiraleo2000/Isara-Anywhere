# Deploy remaining LAN + Jitsi work on Ubuntu via SSH (password auth).
# Usage:
#   $env:UBUNTU_SSH_PASSWORD='your-password'
#   .\scripts\deploy\remote-ubuntu-lan.ps1
# Or: .\scripts\deploy\remote-ubuntu-lan.ps1 -Password 'your-password'

param(
    [string]$ServerHost = '192.168.10.239',
    [string]$User = 'ubuntu',
    [string]$Password = $env:UBUNTU_SSH_PASSWORD,
    [string]$RepoPath = '/home/ubuntu/Isara-Anywhere'
)

$ErrorActionPreference = 'Stop'
$Plink = 'C:\Program Files\PuTTY\plink.exe'
$Pscp = 'C:\Program Files\PuTTY\pscp.exe'
$HostKey = 'SHA256:Paa0SLzukp1VU40m0Bb/7i26LH4btRkg2J8fyL9T9lw'

if (-not $Password) {
    throw 'Set -Password or env UBUNTU_SSH_PASSWORD for ubuntu@192.168.10.239'
}
if (-not (Test-Path $Plink)) {
    throw "PuTTY plink not found at $Plink"
}

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Write-Host "Syncing deploy scripts to ${User}@${ServerHost}:${RepoPath} ..."

& $Pscp -batch -hostkey $HostKey -pw $Password -r `
    "$RepoRoot\deploy\nginx" `
    "$RepoRoot\deploy\jitsi" `
    "$RepoRoot\scripts\jitsi" `
    "$RepoRoot\scripts\deploy\ubuntu-lan-remaining.sh" `
    "${User}@${ServerHost}:${RepoPath}/"

Write-Host "Running ubuntu-lan-remaining.sh on server..."
& $Plink -batch -hostkey $HostKey -pw $Password "${User}@${ServerHost}" `
    "cd ${RepoPath} && chmod +x scripts/deploy/ubuntu-lan-remaining.sh deploy/nginx/*.sh && bash scripts/deploy/ubuntu-lan-remaining.sh"

Write-Host "Done. Update Windows hosts: .\\deploy\\nginx\\windows-update-hosts.ps1 (Admin)"
