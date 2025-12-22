#!/bin/bash
# =============================================================================
# Isara Anywhere - Docker Build and Push to Google Container Registry
# =============================================================================
# Registry: asia-southeast1-docker.pkg.dev/izara-telemedicine/isara-anywhere-portals
#
# Usage:
#   ./build-and-push-gcr.sh                    # Build and push both portals
#   ./build-and-push-gcr.sh --portal patient   # Build and push only patient portal
#   ./build-and-push-gcr.sh --portal doctor    # Build and push only doctor portal
#   ./build-and-push-gcr.sh --version "1.0.1"  # Specify custom version
#   ./build-and-push-gcr.sh --skip-push        # Build only, don't push
#   ./build-and-push-gcr.sh --no-cache         # Build without cache
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
REGISTRY="asia-southeast1-docker.pkg.dev/izara-telemedicine/isara-anywhere-portals"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Default values
PORTAL="all"
VERSION=""
SKIP_PUSH=false
NO_CACHE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --portal|-p)
            PORTAL="$2"
            shift 2
            ;;
        --version|-v)
            VERSION="$2"
            shift 2
            ;;
        --skip-push)
            SKIP_PUSH=true
            shift
            ;;
        --no-cache)
            NO_CACHE="--no-cache"
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Get version from package.json
get_package_version() {
    local project_path=$1
    grep '"version"' "$project_path/package.json" | head -1 | sed 's/.*"version": "\(.*\)".*/\1/'
}

# Build and push function
build_and_push() {
    local name=$1
    local project_path=$2
    local dockerfile=$3
    local image_version=$4
    
    local image_name="$REGISTRY/$name:$image_version"
    local image_latest="$REGISTRY/$name:latest"
    
    echo ""
    echo -e "${CYAN}=========================================${NC}"
    echo -e "${CYAN}Building: $name${NC}"
    echo -e "${CYAN}Version: $image_version${NC}"
    echo -e "${CYAN}Path: $project_path${NC}"
    echo -e "${CYAN}=========================================${NC}"
    
    echo ""
    echo -e "${YELLOW}Building Docker image...${NC}"
    echo "docker build $NO_CACHE -t $image_name -t $image_latest -f $project_path/$dockerfile $project_path"
    
    docker build $NO_CACHE \
        -t "$image_name" \
        -t "$image_latest" \
        -f "$project_path/$dockerfile" \
        "$project_path"
    
    echo -e "${GREEN}Build successful: $image_name${NC}"
    
    if [ "$SKIP_PUSH" = false ]; then
        echo ""
        echo -e "${YELLOW}Pushing to GCR...${NC}"
        
        echo "docker push $image_name"
        docker push "$image_name"
        
        echo "docker push $image_latest"
        docker push "$image_latest"
        
        echo -e "${GREEN}Push successful!${NC}"
        echo -e "  ${CYAN}- $image_name${NC}"
        echo -e "  ${CYAN}- $image_latest${NC}"
    fi
}

# Main script
echo ""
echo -e "${MAGENTA}==================================================${NC}"
echo -e "${MAGENTA}  Isara Anywhere - Docker Build & Push to GCR${NC}"
echo -e "${MAGENTA}==================================================${NC}"
echo ""
echo "Registry: $REGISTRY"
echo "Root Dir: $ROOT_DIR"
echo ""

# Check Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}ERROR: Docker is not running. Please start Docker.${NC}"
    exit 1
fi

# Check GCP authentication
echo -e "${YELLOW}Checking GCP authentication...${NC}"
GCLOUD_ACCOUNT=$(gcloud auth list --format="value(account)" 2>/dev/null | head -1)
if [ -z "$GCLOUD_ACCOUNT" ]; then
    echo -e "${RED}ERROR: gcloud is not authenticated. Run: gcloud auth login${NC}"
    exit 1
fi
echo -e "${GREEN}Authenticated as: $GCLOUD_ACCOUNT${NC}"

# Configure Docker to use GCP credentials
echo -e "${YELLOW}Configuring Docker for GCR...${NC}"
gcloud auth configure-docker asia-southeast1-docker.pkg.dev --quiet

# Build Patient Portal
if [ "$PORTAL" = "all" ] || [ "$PORTAL" = "patient" ]; then
    PATIENT_PATH="$ROOT_DIR/Isara-patient-portal"
    PATIENT_VERSION="${VERSION:-$(get_package_version "$PATIENT_PATH")}"
    
    build_and_push \
        "isara-patient-portal" \
        "$PATIENT_PATH" \
        "Dockerfile.unified" \
        "$PATIENT_VERSION"
fi

# Build Doctor Portal
if [ "$PORTAL" = "all" ] || [ "$PORTAL" = "doctor" ]; then
    DOCTOR_PATH="$ROOT_DIR/Isara-doctor-portal"
    DOCTOR_VERSION="${VERSION:-$(get_package_version "$DOCTOR_PATH")}"
    
    build_and_push \
        "isara-doctor-portal" \
        "$DOCTOR_PATH" \
        "Dockerfile.unified" \
        "$DOCTOR_VERSION"
fi

# Summary
echo ""
echo -e "${MAGENTA}==================================================${NC}"
echo -e "${MAGENTA}  Build & Push Complete!${NC}"
echo -e "${MAGENTA}==================================================${NC}"
echo ""
echo "Images pushed to:"
echo -e "  ${CYAN}$REGISTRY/isara-patient-portal${NC}"
echo -e "  ${CYAN}$REGISTRY/isara-doctor-portal${NC}"
echo ""
echo -e "${GREEN}Done!${NC}"
