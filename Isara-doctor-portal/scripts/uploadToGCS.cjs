/**
 * Upload Mock Data to Google Cloud Storage
 *
 * This script uploads generated mock data to GCS buckets:
 * - User credentials → izara-users-credentials/users/*.json
 * - Doctor data → izara-doctors-data/doctors/*.json
 * - Patient data → izara-patients-data/patients/*.json
 * - Medications, lab tests, ICD codes → izara-meta-data/
 *
 * Prerequisites:
 * 1. Run: npm run generate:all (to create local mock data)
 * 2. Have GCS authentication set up (see below)
 *
 * Authentication Options:
 * Option A: Service Account JSON Key
 *   - Download from GCP Console → IAM & Admin → Service Accounts
 *   - Save as: service-account-key.json (in project root, gitignored)
 *   - Run: node scripts/uploadToGCS.cjs
 *
 * Option B: Application Default Credentials
 *   - Run: gcloud auth application-default login
 *   - Run: node scripts/uploadToGCS.cjs
 */

const { Storage } = require('@google-cloud/storage');
const fs = require('node:fs');
const path = require('node:path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const BUCKETS = {
  AUTH: 'izara-users-credentials',
  PATIENT: 'izara-patients-data',
  DOCTOR: 'izara-doctors-data',
  APPOINTMENTS: 'izara-appointments',
  METADATA: 'izara-meta-data'
};

const PROJECT_ID = process.env.GCP_PROJECT_ID || process.env.VITE_GCP_PROJECT_ID || 'izara-telemedicine';
const REGION = process.env.GCP_REGION || process.env.VITE_GCP_REGION || 'asia-southeast1';

// ============================================================================
// INITIALIZE STORAGE CLIENT
// ============================================================================

function initializeStorage() {
  const opts = { projectId: PROJECT_ID };

  if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
    try {
      const keyJson = Buffer.from(process.env.GCP_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8');
      const credentials = JSON.parse(keyJson);
      console.log('✅ Using service account from GCP_SERVICE_ACCOUNT_KEY env var\n');
      opts.credentials = {
        client_email: credentials.client_email,
        private_key: credentials.private_key
      };
      return new Storage(opts);
    } catch (err) {
      console.error('❌ Invalid GCP_SERVICE_ACCOUNT_KEY:', err.message);
    }
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    console.log(`✅ Using GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}\n`);
    opts.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    return new Storage(opts);
  }

  const serviceAccountPaths = [
    path.join(__dirname, '..', 'public', 'izara-telemedicine-dd0b6abe2bc8.json'),
    path.join(__dirname, '..', 'service-account-key.json'),
  ];

  for (const serviceAccountPath of serviceAccountPaths) {
    if (fs.existsSync(serviceAccountPath)) {
      console.log(`✅ Using service account key: ${path.basename(serviceAccountPath)}\n`);
      opts.keyFilename = serviceAccountPath;
      return new Storage(opts);
    }
  }

  console.log('⚠️  No service account key found');
  console.log('📌 Using Application Default Credentials (ADC)\n');
  console.log('Expected locations:');
  serviceAccountPaths.forEach(p => console.log(`   - ${p}`));
  console.log('\nIf this fails, run: gcloud auth application-default login\n');

  return new Storage(opts);
}

// ============================================================================
// BUCKET CREATION (if not exists)
// ============================================================================

async function ensureBucketExists(storage, bucketName) {
  try {
    const [exists] = await storage.bucket(bucketName).exists();

    if (exists) {
      console.log(`✅ Bucket exists: ${bucketName}`);
    } else {
      console.log(`📦 Creating bucket: ${bucketName}`);
      await storage.createBucket(bucketName, {
        location: REGION,
        storageClass: 'STANDARD'
      });
      console.log(`✅ Bucket created: ${bucketName}`);
    }

    return storage.bucket(bucketName);
  } catch (error) {
    console.error(`❌ Error with bucket ${bucketName}:`, error.message);
    throw error;
  }
}

// ============================================================================
// UPLOAD FILE TO GCS
// ============================================================================

async function uploadFile(bucket, localPath, remotePath) {
  try {
    const options = {
      destination: remotePath,
      metadata: {
        contentType: 'application/json',
        cacheControl: 'public, max-age=300'
      }
    };

    await bucket.upload(localPath, options);
    console.log(`   ✅ ${remotePath}`);
    return true;
  } catch (error) {
    console.error(`   ❌ Failed to upload ${remotePath}:`, error.message);
    return false;
  }
}

// ============================================================================
// MAKE BUCKET PUBLIC (Uniform Bucket-Level Access)
// ============================================================================

async function makeBucketPublic(bucket) {
  try {
    await bucket.iam.setPolicy({
      bindings: [
        {
          role: 'roles/storage.objectViewer',
          members: ['allUsers']
        }
      ]
    });
    console.log(`   🔓 Bucket made public: ${bucket.name}`);
    return true;
  } catch (error) {
    // If bucket is already public or we don't have permission, continue anyway
    console.log(`   ⚠️  Could not set public access: ${error.message}`);
    console.log(`   💡 You may need to manually set bucket permissions in GCS Console`);
    return false;
  }
}

// ============================================================================
// UPLOAD USER CREDENTIALS
// ============================================================================

async function uploadUserCredentials(storage) {
  console.log('\n📤 Uploading User Credentials...');

  const bucket = await ensureBucketExists(storage, BUCKETS.AUTH);

  // Make bucket public first
  await makeBucketPublic(bucket);

  const usersDir = path.join(__dirname, '..', 'public', 'mockData', 'users');

  if (!fs.existsSync(usersDir)) {
    console.log('⚠️  No user files found. Run: npm run generate:users');
    return;
  }

  const files = fs.readdirSync(usersDir).filter(f => f.endsWith('.json'));
  let uploaded = 0;

  for (const file of files) {
    const localPath = path.join(usersDir, file);
    const remotePath = `users/${file}`;

    if (await uploadFile(bucket, localPath, remotePath)) {
      uploaded++;
    }
  }

  console.log(`✅ Uploaded ${uploaded}/${files.length} user credential files\n`);
}

// ============================================================================
// UPLOAD DOCTOR DATA
// ============================================================================

async function uploadDoctorData(storage) {
  console.log('\n📤 Uploading Doctor Data...');

  const bucket = await ensureBucketExists(storage, BUCKETS.DOCTOR);

  // Make bucket public first
  await makeBucketPublic(bucket);

  const mockDataDir = path.join(__dirname, '..', 'public', 'mockData');

  const doctorFiles = [
    'doctors.json',
    'queue.json'
  ];

  let uploaded = 0;

  for (const file of doctorFiles) {
    const localPath = path.join(mockDataDir, file);

    if (fs.existsSync(localPath)) {
      if (await uploadFile(bucket, localPath, file)) {
        uploaded++;
      }
    } else {
      console.log(`   ⚠️  ${file} not found`);
    }
  }

  console.log(`✅ Uploaded ${uploaded}/${doctorFiles.length} doctor data files\n`);
}

// ============================================================================
// UPLOAD PATIENT DATA
// ============================================================================

async function uploadPatientData(storage) {
  console.log('\n📤 Uploading Patient Data...');

  const bucket = await ensureBucketExists(storage, BUCKETS.PATIENT);

  // Make bucket public first
  await makeBucketPublic(bucket);

  const mockDataDir = path.join(__dirname, '..', 'public', 'mockData');

  const patientFiles = [
    'patients.json',
    'emrs.json',
    'prescriptions.json',
    'lab-orders.json',
    'imaging-orders.json'
  ];

  let uploaded = 0;

  for (const file of patientFiles) {
    const localPath = path.join(mockDataDir, file);

    if (fs.existsSync(localPath)) {
      if (await uploadFile(bucket, localPath, file)) {
        uploaded++;
      }
    } else {
      console.log(`   ⚠️  ${file} not found`);
    }
  }

  console.log(`✅ Uploaded ${uploaded}/${patientFiles.length} patient data files\n`);
}

// ============================================================================
// UPLOAD METADATA (medications, lab tests, ICD codes)
// ============================================================================

async function uploadMetadata(storage) {
  console.log('\n📤 Uploading Metadata...');

  const bucket = await ensureBucketExists(storage, BUCKETS.METADATA);

  // Make bucket public first
  await makeBucketPublic(bucket);

  const mockDataDir = path.join(__dirname, '..', 'public', 'mockData');

  const metadataFiles = [
    'medications.json',
    'lab-tests.json',
    'icd10-codes.json'
  ];

  let uploaded = 0;

  for (const file of metadataFiles) {
    const localPath = path.join(mockDataDir, file);

    if (fs.existsSync(localPath)) {
      if (await uploadFile(bucket, localPath, file)) {
        uploaded++;
      }
    } else {
      console.log(`   ⚠️  ${file} not found`);
    }
  }

  console.log(`✅ Uploaded ${uploaded}/${metadataFiles.length} metadata files\n`);
}

// ============================================================================
// UPLOAD APPOINTMENTS
// ============================================================================

async function uploadAppointments(storage) {
  console.log('\n📤 Uploading Appointments...');

  const bucket = await ensureBucketExists(storage, BUCKETS.APPOINTMENTS);

  // Make bucket public first
  await makeBucketPublic(bucket);

  const mockDataDir = path.join(__dirname, '..', 'public', 'mockData');
  const appointmentsFile = path.join(mockDataDir, 'appointments.json');

  if (fs.existsSync(appointmentsFile)) {
    await uploadFile(bucket, appointmentsFile, 'appointments.json');
    console.log('✅ Appointments uploaded\n');
  } else {
    console.log('⚠️  appointments.json not found\n');
  }
}

// ============================================================================
// MAIN UPLOAD FUNCTION
// ============================================================================

async function uploadAll() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Uploading Mock Data to Google Cloud Storage');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`📦 Project: ${PROJECT_ID}`);
  console.log(`📍 Region: ${REGION}\n`);

  try {
    const storage = initializeStorage();

    await uploadUserCredentials(storage);
    await uploadDoctorData(storage);
    await uploadPatientData(storage);
    await uploadAppointments(storage);
    await uploadMetadata(storage);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Upload Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 Summary:');
    console.log(`   - User credentials: https://storage.googleapis.com/${BUCKETS.AUTH}/users/`);
    console.log(`   - Doctor data: https://storage.googleapis.com/${BUCKETS.DOCTOR}/doctors.json`);
    console.log(`   - Patient data: https://storage.googleapis.com/${BUCKETS.PATIENT}/patients.json`);
    console.log(`   - Metadata: https://storage.googleapis.com/${BUCKETS.METADATA}/\n`);

    console.log('🔗 Access URLs:');
    console.log(`   https://storage.googleapis.com/${BUCKETS.AUTH}/users/john_smith_test_com.json`);
    console.log(`   https://storage.googleapis.com/${BUCKETS.DOCTOR}/doctors.json`);
    console.log(`   https://storage.googleapis.com/${BUCKETS.PATIENT}/patients.json\n`);

  } catch (error) {
    console.error('\n❌ Upload failed:', error.message);
    console.error('\n📌 Troubleshooting:');
    console.error('   1. Make sure you have GCS authentication set up');
    console.error('   2. Run: gcloud auth application-default login');
    console.error('   3. OR download service account key to: service-account-key.json');
    console.error('   4. Make sure you have permission to create/write to buckets\n');
    process.exit(1);
  }
}

// ============================================================================
// RUN
// ============================================================================

uploadAll();
