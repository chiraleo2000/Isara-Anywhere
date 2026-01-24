/**
 * ================================================================================
 * IZARA TELEMEDICINE - GCS UPLOAD HELPER
 * ================================================================================
 *
 * Uploads generated demo data to Google Cloud Storage buckets.
 *
 * Prerequisites:
 * 1. Google Cloud SDK installed (gcloud)
 * 2. Authenticated: gcloud auth application-default login
 * 3. OR service account key: GOOGLE_APPLICATION_CREDENTIALS env var
 *
 * Usage: node scripts/uploadToGCS.cjs
 *
 * @version 2.0.0
 * @date November 2025
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const DATA_DIR = path.join(__dirname, 'output');

const BUCKETS = {
  'izara-users-credentials': 'AUTH',
  'izara-doctors-data': 'DOCTOR',
  'izara-patients-data': 'PATIENT',
  'izara-appointments': 'APPOINTMENTS',
  'izara-meta-data': 'METADATA'
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function checkGcloudInstalled() {
  try {
    execSync('gcloud --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function checkAuthentication() {
  try {
    execSync('gcloud auth print-access-token', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function uploadFile(localPath, bucketPath) {
  try {
    // Use 'gcloud storage cp' instead of 'gsutil cp' for better Windows compatibility
    const cmd = `gcloud storage cp "${localPath}" "gs://${bucketPath}"`;
    execSync(cmd, { stdio: 'pipe' });
    return true;
  } catch (error) {
    console.error(`   ❌ Failed: ${bucketPath}`);
    if (error.stderr) {
      console.error(`      Error: ${error.stderr.toString().trim()}`);
    }
    return false;
  }
}

function uploadDirectory(localDir, bucket, prefix = '') {
  if (!fs.existsSync(localDir)) {
    console.log(`   ⚠️  Directory not found: ${localDir}`);
    return 0;
  }

  let uploadCount = 0;
  const entries = fs.readdirSync(localDir, { withFileTypes: true });

  for (const entry of entries) {
    const localPath = path.join(localDir, entry.name);
    const remotePath = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      uploadCount += uploadDirectory(localPath, bucket, remotePath);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      const bucketPath = `${bucket}/${remotePath}`;
      if (uploadFile(localPath, bucketPath)) {
        console.log(`   ✅ Uploaded: ${bucketPath}`);
        uploadCount++;
      }
    }
  }

  return uploadCount;
}

// ============================================================================
// MAIN UPLOAD FUNCTION
// ============================================================================

function uploadAllData() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 IZARA TELEMEDICINE - GCS UPLOAD UTILITY v2.0');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check prerequisites
  console.log('📋 Checking prerequisites...\n');

  if (!checkGcloudInstalled()) {
    console.error('❌ Google Cloud SDK (gcloud) is not installed.');
    console.log('\n   Install it from: https://cloud.google.com/sdk/docs/install');
    console.log('   Or use the manual upload commands below.\n');
    printManualCommands();
    process.exit(1);
  }
  console.log('   ✅ Google Cloud SDK installed');

  if (!checkAuthentication()) {
    console.error('❌ Not authenticated with Google Cloud.');
    console.log('\n   Run: gcloud auth application-default login');
    console.log('   Or set GOOGLE_APPLICATION_CREDENTIALS environment variable.\n');
    printManualCommands();
    process.exit(1);
  }
  console.log('   ✅ Authenticated with Google Cloud');

  // Check if data exists
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`\n❌ Data directory not found: ${DATA_DIR}`);
    console.log('   Run: node scripts/generateUnifiedDemoData.cjs first\n');
    process.exit(1);
  }
  console.log(`   ✅ Data directory found: ${DATA_DIR}`);

  // Upload to each bucket
  console.log('\n📤 Uploading data to GCS buckets...\n');

  let totalUploaded = 0;

  for (const [bucket, label] of Object.entries(BUCKETS)) {
    const localDir = path.join(DATA_DIR, bucket);

    console.log(`\n📁 [${bucket}]`);

    if (!fs.existsSync(localDir)) {
      console.log(`   ⚠️  No data found for this bucket`);
      continue;
    }

    const count = uploadDirectory(localDir, bucket);
    totalUploaded += count;
    console.log(`   📊 Uploaded ${count} files`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ UPLOAD COMPLETE! Total files uploaded: ${totalUploaded}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('🔧 Post-upload configuration:');
  console.log('   1. Set CORS on buckets if needed');
  console.log('   2. Make izara-meta-data publicly readable (optional)');
  console.log('   3. Update portal .env files with bucket names\n');
}

function printManualCommands() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 MANUAL UPLOAD COMMANDS (gcloud storage)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('# 1. Auth Bucket (User Credentials)');
  console.log('gcloud storage cp -r output/izara-users-credentials/* gs://izara-users-credentials/\n');

  console.log('# 2. Doctor Bucket');
  console.log('gcloud storage cp -r output/izara-doctors-data/* gs://izara-doctors-data/\n');

  console.log('# 3. Patient Bucket');
  console.log('gcloud storage cp -r output/izara-patients-data/* gs://izara-patients-data/\n');

  console.log('# 4. Appointments Bucket');
  console.log('gcloud storage cp -r output/izara-appointments/* gs://izara-appointments/\n');

  console.log('# 5. Metadata Bucket');
  console.log('gcloud storage cp -r output/izara-meta-data/* gs://izara-meta-data/\n');

  console.log('# 6. Make metadata publicly readable (optional)');
  console.log('gcloud storage buckets add-iam-policy-binding gs://izara-meta-data --member=allUsers --role=roles/storage.objectViewer\n');

  console.log('# 7. Set CORS configuration (required for browser access)');
  console.log('# Create cors.json with appropriate settings, then:');
  console.log('gcloud storage buckets update gs://izara-users-credentials --cors-file=cors.json');
  console.log('gcloud storage buckets update gs://izara-doctors-data --cors-file=cors.json');
  console.log('gcloud storage buckets update gs://izara-patients-data --cors-file=cors.json');
  console.log('gcloud storage buckets update gs://izara-appointments --cors-file=cors.json');
  console.log('gcloud storage buckets update gs://izara-meta-data --cors-file=cors.json\n');
}

// Run the uploader
uploadAllData();
