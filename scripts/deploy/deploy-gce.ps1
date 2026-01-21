# =============================================================================
# IZARA TELEMEDICINE - GOOGLE COMPUTE ENGINE DEPLOYMENT
# =============================================================================
# Deploys to Google Compute Engine with Docker Compose (similar to local)
# Uses containerized PostgreSQL instead of CloudSQL
#
# Prerequisites:
#   - gcloud CLI installed and authenticated
#   - Project configured with Compute Engine API enabled
#   - SSH keys configured for GCE access
#
# Usage: .\deploy-gce.ps1 -ProjectId <project> [-Environment staging|production]
# =============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectId,
    
    [ValidateSet("staging", "production")]
    [string]$Environment = "staging",
    
    [string]$Zone = "asia-southeast1-a",
    
    [switch]$CreateInstance,
    [switch]$UpdateOnly
)

$ErrorActionPreference = "Stop"

# Configuration
$INSTANCE_NAME = "izara-telemedicine-$Environment"
$MACHINE_TYPE = if ($Environment -eq "production") { "e2-standard-2" } else { "e2-medium" }
$DISK_SIZE = "30"

function Write-Status { param($msg) Write-Host "`n[INFO] $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warning { param($msg) Write-Host "[WARN] $msg" -ForegroundColor Yellow }

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent (Split-Path -Parent $ScriptDir)

Write-Host "=============================================="
Write-Host "  IZARA TELEMEDICINE - GCE DEPLOYMENT"
Write-Host "=============================================="
Write-Host "Project ID:  $ProjectId"
Write-Host "Environment: $Environment"
Write-Host "Instance:    $INSTANCE_NAME"
Write-Host "Zone:        $Zone"
Write-Host "Machine:     $MACHINE_TYPE"

# Verify gcloud authentication
Write-Status "Verifying gcloud authentication..."
$account = gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>&1
if (!$account) {
    Write-Error "Not authenticated. Run: gcloud auth login"
    exit 1
}
Write-Success "Authenticated as: $account"

# Set project
gcloud config set project $ProjectId

if ($CreateInstance) {
    Write-Status "Creating GCE instance..."
    
    # Create startup script
    $startupScript = @"
#!/bin/bash
set -e

# Install Docker
apt-get update
apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start Docker
systemctl enable docker
systemctl start docker

# Create app directory
mkdir -p /opt/izara-telemedicine
cd /opt/izara-telemedicine

echo "Instance setup complete. Ready for application deployment."
"@
    
    # Save startup script temporarily
    $startupScriptPath = "$env:TEMP\startup-script.sh"
    $startupScript | Out-File -FilePath $startupScriptPath -Encoding UTF8
    
    # Create instance
    gcloud compute instances create $INSTANCE_NAME `
        --project=$ProjectId `
        --zone=$Zone `
        --machine-type=$MACHINE_TYPE `
        --boot-disk-size="$($DISK_SIZE)GB" `
        --boot-disk-type=pd-standard `
        --image-family=debian-11 `
        --image-project=debian-cloud `
        --tags=http-server,https-server `
        --metadata-from-file=startup-script=$startupScriptPath
    
    # Create firewall rules if they don't exist
    $firewallExists = gcloud compute firewall-rules list --filter="name=allow-izara-http" --format="value(name)" 2>$null
    if (!$firewallExists) {
        Write-Status "Creating firewall rules..."
        gcloud compute firewall-rules create allow-izara-http `
            --project=$ProjectId `
            --direction=INGRESS `
            --priority=1000 `
            --network=default `
            --action=ALLOW `
            --rules=tcp:3005,tcp:3010,tcp:5050 `
            --source-ranges=0.0.0.0/0 `
            --target-tags=http-server
    }
    
    Write-Success "Instance created. Waiting for startup script to complete..."
    Start-Sleep -Seconds 60
}

# Get instance external IP
Write-Status "Getting instance IP..."
$externalIP = gcloud compute instances describe $INSTANCE_NAME --zone=$Zone --format="value(networkInterfaces[0].accessConfigs[0].natIP)"
Write-Host "Instance IP: $externalIP"

# Copy files to instance
Write-Status "Copying docker-compose.yml to instance..."
gcloud compute scp "$RootDir\docker-compose.yml" "${INSTANCE_NAME}:/opt/izara-telemedicine/" --zone=$Zone

# Copy database seed files
Write-Status "Copying database files..."
gcloud compute scp "$RootDir\scripts\database\postgresql-schema.sql" "${INSTANCE_NAME}:/opt/izara-telemedicine/scripts/database/" --zone=$Zone --recurse
gcloud compute scp "$RootDir\scripts\database\seed-cloud.sql" "${INSTANCE_NAME}:/opt/izara-telemedicine/scripts/database/" --zone=$Zone

# Copy portal directories (only needed files)
Write-Status "Copying Patient Portal..."
gcloud compute scp "$RootDir\Isara-patient-portal" "${INSTANCE_NAME}:/opt/izara-telemedicine/" --zone=$Zone --recurse

Write-Status "Copying Doctor Portal..."
gcloud compute scp "$RootDir\Isara-doctor-portal" "${INSTANCE_NAME}:/opt/izara-telemedicine/" --zone=$Zone --recurse

# SSH and run docker-compose
Write-Status "Building and starting containers on GCE..."
$dockerCmd = @"
cd /opt/izara-telemedicine
docker compose down --remove-orphans 2>/dev/null || true
docker compose up --build -d
docker compose ps
"@

gcloud compute ssh $INSTANCE_NAME --zone=$Zone --command=$dockerCmd

# Seed database
Write-Status "Seeding database..."
$seedCmd = @"
cd /opt/izara-telemedicine
sleep 30  # Wait for PostgreSQL to be ready
docker compose exec -T postgres psql -U postgres -d izara_phase1 < scripts/database/seed-cloud.sql
"@

gcloud compute ssh $INSTANCE_NAME --zone=$Zone --command=$seedCmd

Write-Host "`n=============================================="
Write-Host "  GCE DEPLOYMENT COMPLETE"
Write-Host "=============================================="
Write-Host "`nService URLs:" -ForegroundColor Yellow
Write-Host "  Patient Portal: http://${externalIP}:3005"
Write-Host "  Doctor Portal:  http://${externalIP}:3010"
Write-Host "  pgAdmin:        http://${externalIP}:5050"
Write-Host ""
Write-Host "Test Credentials:" -ForegroundColor Yellow
Write-Host "  Patient: demo.test@gmail.com / P@ssw0rd"
Write-Host "  Doctor:  doctor.test@izara.com / IzaraDoctor@2024"
Write-Host "  Admin:   admin.test@izara.com / IzaraAdmin@2024"
Write-Host ""
Write-Host "pgAdmin Credentials:" -ForegroundColor Yellow
Write-Host "  Email:    admin@izara.com"
Write-Host "  Password: IzaraAdmin@2024"
Write-Host ""
Write-Host "SSH Access:" -ForegroundColor Yellow
Write-Host "  gcloud compute ssh $INSTANCE_NAME --zone=$Zone"
Write-Host ""
