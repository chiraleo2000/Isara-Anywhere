#!/bin/bash

set -e

echo "🚀 Starting deployment to Google Cloud..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check required environment variables
required_vars=(
    "VITE_GCP_PROJECT_ID"
    "VITE_GCP_REGION"
    "VITE_GOOGLE_MAPS_API_KEY"
    "VITE_GEMINI_API_KEY"
    "VITE_GOOGLE_CLIENT_ID"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: $var is not set"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# Set the project
gcloud config set project "$VITE_GCP_PROJECT_ID"

# Enable required APIs
echo "📦 Enabling required Google Cloud APIs..."
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    storage-api.googleapis.com \
    storage-component.googleapis.com

# Create buckets if they don't exist
echo "🪣 Creating storage buckets..."
npm run create-buckets

# Initialize mock data
echo "📊 Initializing mock data..."
npm run init-mock-data

# Build and deploy
echo "🏗️ Building and deploying to Cloud Run..."
gcloud builds submit --config cloudbuild.yaml \
    --substitutions=\
_GOOGLE_MAPS_API_KEY="$VITE_GOOGLE_MAPS_API_KEY",\
_GEMINI_API_KEY="$VITE_GEMINI_API_KEY",\
_GOOGLE_CLIENT_ID="$VITE_GOOGLE_CLIENT_ID"

# Get the service URL
SERVICE_URL=$(gcloud run services describe izara-anywhere \
    --region="$VITE_GCP_REGION" \
    --format="value(status.url)")

echo ""
echo "🎉 Deployment complete!"
echo "🌐 Service URL: $SERVICE_URL"
echo ""
echo "Next steps:"
echo "1. Update your OAuth redirect URIs to include: $SERVICE_URL"
echo "2. Configure your API keys if needed"
echo "3. Test the application at: $SERVICE_URL"