/**
 * Generate Demo Doctor Users - Uploads DIRECTLY to GCS
 *
 * This script creates demo doctor accounts and uploads them to:
 * - GCS bucket: izara-users-credentials
 * - Path: users/{id}.json (individual user files)
 * - Path: users/index.json (email lookup index)
 *
 * REQUIRES: GCS API Server running on port 3011
 * Start it with: node server/gcsApiServer.cjs
 *
 * Run: node scripts/generateDoctorUsers.cjs
 */

const crypto = require('node:crypto');
const http = require('node:http');

// ============================================================================
// CONFIGURATION
// ============================================================================

const GCS_API_URL = 'http://localhost:3011';
const BUCKET_TYPE = 'credentials'; // Maps to izara-users-credentials

// ============================================================================
// DEMO DOCTOR ACCOUNTS
// ============================================================================

const DEMO_DOCTORS = [
  {
    id: 'DOC-DEMO-001',
    email: 'demo.doctor@hospital.com',
    password: 'DemoPass123!',
    name: 'Dr. Demo User',
    medicalLicenseNumber: 'MD-DEMO-001',
    specialty: 'General Practice',
    phone: '+66800000001',
  },
  {
    id: 'DOC-DEMO-002',
    email: 'john.smith@hospital.com',
    password: 'Password123!',
    name: 'Dr. John Smith',
    medicalLicenseNumber: 'MD-123456',
    specialty: 'Cardiology',
    phone: '+66812345001',
    dateOfBirth: '1980-05-15',
  },
  {
    id: 'DOC-DEMO-003',
    email: 'sarah.johnson@hospital.com',
    password: 'Password123!',
    name: 'Dr. Sarah Johnson',
    medicalLicenseNumber: 'MD-234567',
    specialty: 'Pediatrics',
    phone: '+66812345002',
    dateOfBirth: '1982-08-22',
  },
  {
    id: 'DOC-DEMO-004',
    email: 'michael.chen@hospital.com',
    password: 'Password123!',
    name: 'Dr. Michael Chen',
    medicalLicenseNumber: 'MD-345678',
    specialty: 'Internal Medicine',
    phone: '+66812345003',
    dateOfBirth: '1978-03-10',
  },
  {
    id: 'DOC-DEMO-005',
    email: 'emma.williams@hospital.com',
    password: 'Password123!',
    name: 'Dr. Emma Williams',
    medicalLicenseNumber: 'MD-456789',
    specialty: 'Dermatology',
    phone: '+66812345004',
    dateOfBirth: '1985-11-30',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Hash password using SHA256
 */
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Make HTTP request to GCS API server
 */
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, GCS_API_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(result);
          } else {
            reject(new Error(result.error || `HTTP ${res.statusCode}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', (e) => reject(e));

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

/**
 * Write JSON to GCS via API
 */
async function writeToGCS(path, data) {
  return makeRequest('POST', '/api/storage/write', {
    bucket: BUCKET_TYPE,
    path: path,
    data: data,
    makePublic: true,
  });
}

/**
 * Read JSON from GCS via API
 */
async function readFromGCS(path) {
  try {
    return await makeRequest('GET', `/api/storage/read?bucket=${BUCKET_TYPE}&path=${encodeURIComponent(path)}`);
  } catch (e) {
    // Handle all "not found" variations (case insensitive)
    const errorMsg = e.message.toLowerCase();
    if (errorMsg.includes('404') || errorMsg.includes('not found') || errorMsg.includes('file not found')) {
      console.log(`   ℹ️  File not found (will create): ${path}`);
      return null;
    }
    throw e;
  }
}

/**
 * Check if GCS API server is running
 */
async function checkApiServer() {
  try {
    await makeRequest('GET', '/api/health');
    return true;
  } catch (e) {
    return false;
  }
}

// ============================================================================
// USER CREATION
// ============================================================================

/**
 * Create user credential object matching the schema
 */
function createUserCredential(doctor) {
  const now = new Date().toISOString();

  return {
    id: doctor.id,
    email: doctor.email.toLowerCase().trim(),
    passwordHash: hashPassword(doctor.password),
    role: 'doctor',
    doctorId: doctor.id,
    medicalLicenseNumber: doctor.medicalLicenseNumber,
    isActive: true,
    emailVerified: true,
    createdAt: now,
    lastLogin: now,
    loginAttempts: 0,
    lockedUntil: null,
    preferences: {
      theme: 'light',
      language: 'en',
      notifications: {
        email: true,
        push: true,
        sms: false,
      },
    },
    name: doctor.name,
    phone: doctor.phone || null,
    dateOfBirth: doctor.dateOfBirth || null,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(doctor.name)}`,
    specialty: doctor.specialty || null,
  };
}

/**
 * Create user index entry
 */
function createIndexEntry(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  };
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  📤 GENERATE DEMO DOCTORS - GCS CLOUD UPLOAD');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check if API server is running
  console.log('🔍 Checking GCS API server...');
  const serverRunning = await checkApiServer();

  if (!serverRunning) {
    console.error('\n❌ ERROR: GCS API Server is not running!');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('Please start the server first:');
    console.error('  node server/gcsApiServer.cjs');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(1);
  }

  console.log('✅ GCS API server is running\n');

  // Get existing user index (or create empty)
  console.log('📥 Fetching existing user index...');
  let userIndex = await readFromGCS('users/index.json');
  if (userIndex) {
    console.log(`   Found ${userIndex.length} existing users`);
  } else {
    console.log('   Creating new index...');
    userIndex = [];
  }

  // Process each doctor
  console.log('\n👨‍⚕️ Creating demo doctor accounts...\n');

  const createdUsers = [];
  const credentials = [];

  for (const doctor of DEMO_DOCTORS) {
    try {
      // Check if user already exists
      const existingEntry = userIndex.find((u) => u.email === doctor.email.toLowerCase());
      if (existingEntry) {
        console.log(`⏭️  ${doctor.name} (${doctor.email}) - already exists, updating...`);
      }

      // Create user credential
      const userCredential = createUserCredential(doctor);

      // Upload to GCS: users/{id}.json
      console.log(`   💾 Uploading users/${userCredential.id}.json...`);
      await writeToGCS(`users/${userCredential.id}.json`, userCredential);

      // Update index
      const indexEntry = createIndexEntry(userCredential);
      const existingIndex = userIndex.findIndex((u) => u.email === userCredential.email);
      if (existingIndex >= 0) {
        userIndex[existingIndex] = indexEntry;
      } else {
        userIndex.push(indexEntry);
      }

      createdUsers.push(userCredential);
      credentials.push({
        email: doctor.email,
        password: doctor.password,
        name: doctor.name,
        id: doctor.id,
      });

      console.log(`   ✅ ${doctor.name} created successfully`);
    } catch (error) {
      console.error(`   ❌ Failed to create ${doctor.name}: ${error.message}`);
    }
  }

  // Upload updated index
  console.log('\n📤 Uploading user index...');
  try {
    await writeToGCS('users/index.json', userIndex);
    console.log('✅ User index updated');
  } catch (error) {
    console.error('❌ Failed to update index:', error.message);
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ✅ UPLOAD COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📦 GCS Bucket: izara-users-credentials');
  console.log(`📊 Total Users: ${userIndex.length}`);
  console.log(`✨ Created/Updated: ${createdUsers.length}\n`);

  console.log('🔐 TEST CREDENTIALS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  for (const cred of credentials) {
    console.log(`\n  👤 ${cred.name}`);
    console.log(`     🆔 ID: ${cred.id}`);
    console.log(`     📧 Email: ${cred.email}`);
    console.log(`     🔑 Password: ${cred.password}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  📍 GCS URLs:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Index: https://storage.googleapis.com/izara-users-credentials/users/index.json');

  for (const user of createdUsers) {
    console.log(`  User:  https://storage.googleapis.com/izara-users-credentials/users/${user.id}.json`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  💡 USAGE:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  1. Make sure GCS API server is running: node server/gcsApiServer.cjs');
  console.log('  2. Start the app: npm run dev');
  console.log('  3. Login with any of the credentials above');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Run
main().catch((error) => {
  console.error('\n❌ FATAL ERROR:', error.message);
  process.exit(1);
});
