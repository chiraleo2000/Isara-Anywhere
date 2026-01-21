#!/bin/bash
# =============================================================================
# IZARA TELEMEDICINE - GOOGLE CLOUD DEPLOYMENT
# =============================================================================
# Deploys to Google Cloud Run with Cloud SQL
# Prerequisites:
#   - gcloud CLI installed and authenticated
#   - Project configured with Cloud Run and Cloud SQL enabled
#
# Usage: ./deploy-cloud.sh --project <project-id> [--env staging|production] [--seed] [--build-only]
# =============================================================================

set -e

# Parse arguments
PROJECT_ID=""
ENVIRONMENT="staging"
SEED_DATA=false
BUILD_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --project) PROJECT_ID="$2"; shift 2 ;;
        --env) ENVIRONMENT="$2"; shift 2 ;;
        --seed) SEED_DATA=true; shift ;;
        --build-only) BUILD_ONLY=true; shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

if [ -z "$PROJECT_ID" ]; then
    echo "Usage: ./deploy-cloud.sh --project <project-id> [--env staging|production]"
    exit 1
fi

# Configuration
REGION="asia-southeast1"
PATIENT_PORTAL_SERVICE="izara-patient-portal"
DOCTOR_PORTAL_SERVICE="izara-doctor-portal"
GCR_HOSTNAME="asia.gcr.io"

# Environment-specific settings
if [ "$ENVIRONMENT" = "production" ]; then
    CLOUD_SQL_INSTANCE="$PROJECT_ID:$REGION:izara-sql-production"
    MIN_INSTANCES=1
    MAX_INSTANCES=10
else
    CLOUD_SQL_INSTANCE="$PROJECT_ID:$REGION:izara-sql-staging"
    MIN_INSTANCES=0
    MAX_INSTANCES=2
fi
DATABASE_NAME="izara_phase1"

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

status() { echo -e "\n${CYAN}[INFO] $1${NC}"; }
success() { echo -e "${GREEN}[OK] $1${NC}"; }

# Get directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

echo "=============================================="
echo "  IZARA TELEMEDICINE - CLOUD DEPLOYMENT"
echo "=============================================="
echo "Project ID:  $PROJECT_ID"
echo "Environment: $ENVIRONMENT"
echo "Region:      $REGION"

# Verify gcloud authentication
status "Verifying gcloud authentication..."
ACCOUNT=$(gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>/dev/null)
if [ -z "$ACCOUNT" ]; then
    echo "Not authenticated. Run: gcloud auth login"
    exit 1
fi
success "Authenticated as: $ACCOUNT"

# Configure Docker for GCR
status "Configuring Docker for GCR..."
gcloud auth configure-docker $GCR_HOSTNAME --quiet

# Build and push Patient Portal
status "Building Patient Portal image..."
PATIENT_IMAGE="$GCR_HOSTNAME/$PROJECT_ID/$PATIENT_PORTAL_SERVICE:$ENVIRONMENT"
cd "$ROOT_DIR/Isara-patient-portal"
docker build -f Dockerfile.production -t "$PATIENT_IMAGE" .

status "Pushing Patient Portal image..."
docker push "$PATIENT_IMAGE"
success "Patient Portal image pushed"

# Build and push Doctor Portal
status "Building Doctor Portal image..."
DOCTOR_IMAGE="$GCR_HOSTNAME/$PROJECT_ID/$DOCTOR_PORTAL_SERVICE:$ENVIRONMENT"
cd "$ROOT_DIR/Isara-doctor-portal"
docker build -f Dockerfile.production -t "$DOCTOR_IMAGE" .

status "Pushing Doctor Portal image..."
docker push "$DOCTOR_IMAGE"
success "Doctor Portal image pushed"

if [ "$BUILD_ONLY" = true ]; then
    echo ""
    echo "Build complete. Images pushed to GCR."
    exit 0
fi

# Deploy Patient Portal
status "Deploying Patient Portal to Cloud Run..."
gcloud run deploy $PATIENT_PORTAL_SERVICE \
    --image "$PATIENT_IMAGE" \
    --platform managed \
    --region $REGION \
    --project $PROJECT_ID \
    --add-cloudsql-instances "$CLOUD_SQL_INSTANCE" \
    --min-instances $MIN_INSTANCES \
    --max-instances $MAX_INSTANCES \
    --memory 512Mi \
    --cpu 1 \
    --port 3005 \
    --allow-unauthenticated \
    --set-env-vars "NODE_ENV=production,DATABASE_URL=postgresql://postgres:@localhost/$DATABASE_NAME?host=/cloudsql/$CLOUD_SQL_INSTANCE"

success "Patient Portal deployed"

# Deploy Doctor Portal
status "Deploying Doctor Portal to Cloud Run..."
gcloud run deploy $DOCTOR_PORTAL_SERVICE \
    --image "$DOCTOR_IMAGE" \
    --platform managed \
    --region $REGION \
    --project $PROJECT_ID \
    --add-cloudsql-instances "$CLOUD_SQL_INSTANCE" \
    --min-instances $MIN_INSTANCES \
    --max-instances $MAX_INSTANCES \
    --memory 512Mi \
    --cpu 1 \
    --port 3010 \
    --allow-unauthenticated \
    --set-env-vars "NODE_ENV=production,DATABASE_URL=postgresql://postgres:@localhost/$DATABASE_NAME?host=/cloudsql/$CLOUD_SQL_INSTANCE"

success "Doctor Portal deployed"

# Get service URLs
status "Getting service URLs..."
PATIENT_URL=$(gcloud run services describe $PATIENT_PORTAL_SERVICE --platform managed --region $REGION --project $PROJECT_ID --format="value(status.url)")
DOCTOR_URL=$(gcloud run services describe $DOCTOR_PORTAL_SERVICE --platform managed --region $REGION --project $PROJECT_ID --format="value(status.url)")

echo ""
echo "=============================================="
echo "  CLOUD DEPLOYMENT COMPLETE"
echo "=============================================="
echo ""
echo -e "${YELLOW}Service URLs:${NC}"
echo "  Patient Portal: $PATIENT_URL"
echo "  Doctor Portal:  $DOCTOR_URL"
echo ""
echo -e "${YELLOW}Test Credentials:${NC}"
echo "  Patient: demo.test@gmail.com / P@ssw0rd"
echo "  Doctor:  doctor.test@izara.com / IzaraDoctor@2024"
echo "  Admin:   admin.test@izara.com / IzaraAdmin@2024"
echo ""

if [ "$SEED_DATA" = true ]; then
    echo -e "${YELLOW}To seed Cloud SQL, run:${NC}"
    echo "  gcloud sql connect <instance-name> --user=postgres --database=izara_phase1 < scripts/database/seed-cloud.sql"
fi
