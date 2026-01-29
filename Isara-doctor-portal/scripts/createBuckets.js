import { Storage } from '@google-cloud/storage';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

function initializeStorage() {
  const projectId = process.env.GCP_PROJECT_ID || process.env.VITE_GCP_PROJECT_ID || 'izara-telemedicine';
  const opts = { projectId };

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

  console.log('⚠️  Using Application Default Credentials (ADC)\n');
  return new Storage(opts);
}

const storage = initializeStorage();
const serviceAccountEmail = process.env.GCP_SERVICE_ACCOUNT_EMAIL;

const BUCKETS = [
  process.env.VITE_GCS_BUCKET_DOCTOR || process.env.GCS_BUCKET_DOCTOR,
  process.env.VITE_GCS_BUCKET_PATIENT || process.env.GCS_BUCKET_PATIENT,
  process.env.VITE_GCS_BUCKET_APPOINTMENTS || process.env.GCS_BUCKET_APPOINTMENTS,
  process.env.VITE_GCS_BUCKET_METADATA || process.env.GCS_BUCKET_METADATA,
  process.env.VITE_GCS_BUCKET_CREDENTIALS || process.env.VITE_GCS_BUCKET_AUTH || process.env.GCS_BUCKET_CREDENTIALS,
].filter(Boolean);

async function setServiceAccountPermissions(bucket) {
  if (!serviceAccountEmail) {
    console.log(`   - Skipping service account permissions: GCP_SERVICE_ACCOUNT_EMAIL not set in .env file.`);
    return;
  }

  try {
    // FIX: Changed bucket.getIamPolicy() to bucket.iam.getPolicy()
    const [policy] = await bucket.iam.getPolicy();

    const role = 'roles/storage.objectAdmin';
    const member = `serviceAccount:${serviceAccountEmail}`;

    const bindingExists = policy.bindings.some(b => b.role === role && b.members.includes(member));

    if (bindingExists) {
      console.log(`   ✓ Service account ${serviceAccountEmail} already has '${role}' permissions.`);
      return;
    }

    policy.bindings.push({
      role: role,
      members: [member],
    });

    // FIX: Changed bucket.setIamPolicy() to bucket.iam.setPolicy()
    await bucket.iam.setPolicy(policy);
    console.log(`   ✓ Granted write access to service account: ${serviceAccountEmail}`);

  } catch (error) {
    console.error(`   ✗ Error setting IAM permissions for service account:`, error.message);
    console.error(`   Please ensure the user running this script (you) has 'Storage Admin' permissions on the project.`);
  }
}


async function setBucketCors(bucketName, bucket) {
  try {
    await bucket.setCorsConfiguration([
      {
        origin: ['*'],
        method: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE'],
        responseHeader: ['Content-Type', 'Access-Control-Allow-Origin', 'Authorization'],
        maxAgeSeconds: 3600,
      },
    ]);
    console.log(`   ✓ CORS configured for ${bucketName}`);
  } catch (error) {
    console.error(`   ✗ Error configuring CORS for ${bucketName}:`, error.message);
  }
}

async function createBuckets() {
  console.log('🚀 Creating and configuring Google Cloud Storage buckets...\n');

  for (const bucketName of BUCKETS) {
    if (!bucketName) {
      console.warn('⚠️  Skipping undefined bucket name');
      continue;
    }

    try {
      const bucket = storage.bucket(bucketName);
      const [exists] = await bucket.exists();

      if (exists) {
        console.log(`📦 Bucket ${bucketName} already exists`);
      } else {
        await storage.createBucket(bucketName, {
          location: process.env.GCP_REGION || process.env.VITE_GCP_REGION || 'asia-southeast1',
          storageClass: 'STANDARD',
          iamConfiguration: {
            uniformBucketLevelAccess: {
              enabled: false,
            },
          },
        });
        console.log(`✅ Created bucket ${bucketName}`);
      }

      await setBucketCors(bucketName, bucket);
      await setServiceAccountPermissions(bucket);

    } catch (error) {
      console.error(`❌ Error with bucket ${bucketName}:`, error.message);
    }

    console.log('');
  }

  console.log('🎉 Bucket creation and configuration complete!');
  console.log('\nNext steps:');
  console.log('1. Run: npm run generate:local');
  console.log('2. Run: npm run upload:gcs');
}

createBuckets().catch(console.error);