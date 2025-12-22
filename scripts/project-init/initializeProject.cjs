/**
 * ================================================================================
 * IZARA TELEMEDICINE PLATFORM - PROJECT INITIALIZER
 * ================================================================================
 *
 * Main initialization script that:
 * 1. CHECKS if buckets are empty (WILL NOT RUN if data exists!)
 * 2. Creates admin user account
 * 3. Generates initial data structure
 * 4. Seeds minimal required data
 *
 * SAFETY: This script will ABORT if any bucket contains data.
 *
 * Usage:
 *   node scripts/project-init/initializeProject.cjs
 *   node scripts/project-init/initializeProject.cjs --skip-check  (DANGEROUS!)
 *   node scripts/project-init/initializeProject.cjs --dry-run
 *
 * @version 1.0.0
 * @date December 2025
 */

const { Storage } = require('@google-cloud/storage');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// ============================================================================
// CONFIGURATION
// ============================================================================

const args = process.argv.slice(2);
const SKIP_CHECK = args.includes('--skip-check');
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose') || args.includes('-v');

// Load environment variables
const envPath = path.join(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

// GCS Configuration
const GCS_BUCKETS = {
  AUTH: process.env.GCS_BUCKET_AUTH || 'izara-users-credentials',
  PATIENT: process.env.GCS_BUCKET_PATIENT || 'izara-patients-data',
  DOCTOR: process.env.GCS_BUCKET_DOCTOR || 'izara-doctors-data',
  APPOINTMENTS: process.env.GCS_BUCKET_APPOINTMENTS || 'izara-appointments',
  METADATA: process.env.GCS_BUCKET_METADATA || 'izara-meta-data'
};

// Admin Configuration (from environment or defaults)
const ADMIN_CONFIG = {
  id: 'ADMIN-001',
  email: process.env.ADMIN_EMAIL || 'admin@izara.com',
  password: process.env.ADMIN_PASSWORD || 'IzaraAdmin@2024',
  name: process.env.ADMIN_NAME || 'System Administrator',
  nameThai: 'ผู้ดูแลระบบ'
};

// ============================================================================
// UTILITIES
// ============================================================================

function log(message, type = 'info') {
  const icons = {
    info: '📘',
    success: '✅',
    warn: '⚠️',
    error: '❌',
    step: '➡️',
    skip: '⏭️',
    check: '🔍',
    create: '📝',
    upload: '☁️'
  };
  
  const timestamp = new Date().toISOString();
  console.log(`${icons[type] || '•'} [${timestamp}] ${message}`);
}

function logVerbose(message) {
  if (VERBOSE) log(message, 'info');
}

function getDateString(daysFromNow = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString();
}

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

// ============================================================================
// GCS FUNCTIONS
// ============================================================================

let storage;

function initializeStorage() {
  const projectId = process.env.GCP_PROJECT_ID || 'izara-telemedicine';
  
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (fs.existsSync(keyPath)) {
      logVerbose(`Using credentials: ${keyPath}`);
      return new Storage({ projectId, keyFilename: keyPath });
    }
  }
  
  const credentialPaths = [
    path.join(__dirname, '../../credentials/service-account.json'),
    path.join(__dirname, '../../Isara-doctor-portal/public/izara-telemedicine-dd0b6abe2bc8.json'),
    path.join(__dirname, '../../Isara-patient-portal/credentials/service-account.json'),
  ];
  
  for (const credPath of credentialPaths) {
    if (fs.existsSync(credPath)) {
      logVerbose(`Using credentials: ${credPath}`);
      return new Storage({ projectId, keyFilename: credPath });
    }
  }
  
  logVerbose('Using Application Default Credentials');
  return new Storage({ projectId });
}

async function bucketHasData(bucketName) {
  try {
    const bucket = storage.bucket(bucketName);
    const [exists] = await bucket.exists();
    
    if (!exists) return false;
    
    const [files] = await bucket.getFiles({ maxResults: 1 });
    return files.length > 0;
  } catch (error) {
    logVerbose(`Error checking bucket ${bucketName}: ${error.message}`);
    return false;
  }
}

async function writeToGCS(bucketName, filePath, data) {
  if (DRY_RUN) {
    log(`[DRY RUN] Would write to ${bucketName}/${filePath}`, 'skip');
    return true;
  }
  
  try {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filePath);
    
    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    await file.save(content, {
      contentType: 'application/json',
      metadata: {
        cacheControl: 'no-cache',
      },
    });
    
    logVerbose(`Uploaded: ${bucketName}/${filePath}`);
    return true;
  } catch (error) {
    log(`Failed to write ${bucketName}/${filePath}: ${error.message}`, 'error');
    return false;
  }
}

// ============================================================================
// DATA GENERATION
// ============================================================================

function generateAdminCredentials() {
  const now = getDateString(0);
  
  return {
    id: ADMIN_CONFIG.id,
    email: ADMIN_CONFIG.email,
    passwordHash: hashPassword(ADMIN_CONFIG.password),
    role: 'admin',
    name: ADMIN_CONFIG.name,
    nameThai: ADMIN_CONFIG.nameThai,
    phone: '',
    isAdmin: true,
    isActive: true,
    isVerified: true,
    isApproved: true,
    approvalStatus: 'approved',
    status: 'approved',
    doctorId: ADMIN_CONFIG.id,
    loginAttempts: 0,
    lockedUntil: null,
    createdAt: now,
    updatedAt: now,
    lastLogin: null,
    preferences: {
      language: 'th',
      notifications: true,
      theme: 'light'
    }
  };
}

function generateAdminProfile() {
  const now = getDateString(0);
  
  return {
    id: ADMIN_CONFIG.id,
    email: ADMIN_CONFIG.email,
    name: ADMIN_CONFIG.name,
    nameThai: ADMIN_CONFIG.nameThai,
    role: 'admin',
    specialty: 'Healthcare Administration',
    specialtyThai: 'การบริหารระบบสุขภาพ',
    medicalLicenseNumber: 'ADMIN-LICENSE-001',
    hospital: 'Izara Medical Center',
    hospitalThai: 'ศูนย์การแพทย์อิซาร่า',
    department: 'Administration',
    isAdmin: true,
    isActive: true,
    isApproved: true,
    approvalStatus: 'approved',
    createdAt: now,
    updatedAt: now
  };
}

function generateUsersIndex(adminCredentials) {
  return {
    version: '1.0.0',
    lastUpdated: getDateString(0),
    totalUsers: 1,
    users: [
      {
        id: adminCredentials.id,
        email: adminCredentials.email,
        role: adminCredentials.role,
        isActive: adminCredentials.isActive
      }
    ]
  };
}

function generateDoctorsIndex(adminProfile) {
  return {
    version: '1.0.0',
    lastUpdated: getDateString(0),
    totalDoctors: 1,
    doctors: [
      {
        id: adminProfile.id,
        name: adminProfile.name,
        specialty: adminProfile.specialty,
        isActive: adminProfile.isActive,
        isAdmin: adminProfile.isAdmin
      }
    ]
  };
}

function generateMetadataIndex() {
  return {
    version: '1.0.0',
    lastUpdated: getDateString(0),
    systemInitialized: true,
    initializedAt: getDateString(0),
    initializedBy: ADMIN_CONFIG.email,
    config: {
      systemName: 'Izara Telemedicine Platform',
      version: '1.0.0',
      supportedLanguages: ['th', 'en'],
      defaultLanguage: 'th'
    }
  };
}

function generateEmptyIndex(type) {
  return {
    version: '1.0.0',
    lastUpdated: getDateString(0),
    total: 0,
    items: []
  };
}

// ============================================================================
// SAFETY CHECK
// ============================================================================

async function checkBucketsEmpty() {
  log('Checking bucket status...', 'check');
  
  const bucketsWithData = [];
  
  for (const [key, bucketName] of Object.entries(GCS_BUCKETS)) {
    const hasData = await bucketHasData(bucketName);
    if (hasData) {
      bucketsWithData.push({ key, name: bucketName });
      log(`  ${key}: Contains data ⚠️`, 'warn');
    } else {
      log(`  ${key}: Empty ✓`, 'success');
    }
  }
  
  return bucketsWithData;
}

// ============================================================================
// INITIALIZATION STEPS
// ============================================================================

async function createAdminAccount() {
  log('Creating admin account...', 'step');
  
  const adminCredentials = generateAdminCredentials();
  const adminProfile = generateAdminProfile();
  
  // Write admin credentials
  const credPath = `users/${ADMIN_CONFIG.id}.json`;
  const credSuccess = await writeToGCS(GCS_BUCKETS.AUTH, credPath, adminCredentials);
  
  // Write admin profile to doctors bucket
  const profilePath = `doctors/${ADMIN_CONFIG.id}.json`;
  const profileSuccess = await writeToGCS(GCS_BUCKETS.DOCTOR, profilePath, adminProfile);
  
  if (credSuccess && profileSuccess) {
    log(`Admin account created: ${ADMIN_CONFIG.email}`, 'success');
    return { credentials: adminCredentials, profile: adminProfile };
  } else {
    log('Failed to create admin account', 'error');
    return null;
  }
}

async function createIndexFiles(adminData) {
  log('Creating index files...', 'step');
  
  const indices = [
    {
      bucket: GCS_BUCKETS.AUTH,
      path: 'index.json',
      data: generateUsersIndex(adminData.credentials)
    },
    {
      bucket: GCS_BUCKETS.DOCTOR,
      path: 'index.json',
      data: generateDoctorsIndex(adminData.profile)
    },
    {
      bucket: GCS_BUCKETS.PATIENT,
      path: 'index.json',
      data: generateEmptyIndex('patients')
    },
    {
      bucket: GCS_BUCKETS.APPOINTMENTS,
      path: 'index.json',
      data: generateEmptyIndex('appointments')
    },
    {
      bucket: GCS_BUCKETS.METADATA,
      path: 'index.json',
      data: generateMetadataIndex()
    }
  ];
  
  let allSuccess = true;
  for (const index of indices) {
    const success = await writeToGCS(index.bucket, index.path, index.data);
    if (!success) allSuccess = false;
  }
  
  if (allSuccess) {
    log('All index files created', 'success');
  }
  
  return allSuccess;
}

async function createDirectoryStructure() {
  log('Creating directory structure...', 'step');
  
  // Create placeholder files to establish directory structure
  const placeholders = [
    { bucket: GCS_BUCKETS.AUTH, path: 'sessions/.keep', data: {} },
    { bucket: GCS_BUCKETS.AUTH, path: 'login-history/.keep', data: {} },
    { bucket: GCS_BUCKETS.PATIENT, path: 'patients/.keep', data: {} },
    { bucket: GCS_BUCKETS.PATIENT, path: 'phr/.keep', data: {} },
    { bucket: GCS_BUCKETS.DOCTOR, path: 'doctors/.keep', data: {} },
    { bucket: GCS_BUCKETS.DOCTOR, path: 'schedules/.keep', data: {} },
    { bucket: GCS_BUCKETS.APPOINTMENTS, path: 'appointments/.keep', data: {} },
    { bucket: GCS_BUCKETS.APPOINTMENTS, path: 'queue/.keep', data: {} },
    { bucket: GCS_BUCKETS.METADATA, path: 'content/.keep', data: {} },
    { bucket: GCS_BUCKETS.METADATA, path: 'config/.keep', data: {} }
  ];
  
  for (const placeholder of placeholders) {
    await writeToGCS(placeholder.bucket, placeholder.path, placeholder.data);
  }
  
  log('Directory structure created', 'success');
}

// ============================================================================
// MAIN INITIALIZATION
// ============================================================================

async function initializeProject() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║    IZARA TELEMEDICINE - PROJECT INITIALIZER                   ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log(`║  Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}                                        ║`);
  console.log(`║  Skip Safety Check: ${SKIP_CHECK ? 'YES ⚠️' : 'NO ✓'}                                    ║`);
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  // Initialize GCS
  try {
    storage = initializeStorage();
    log('GCS connection initialized', 'success');
  } catch (error) {
    log(`Failed to initialize GCS: ${error.message}`, 'error');
    process.exit(1);
  }
  
  // SAFETY CHECK - Do not proceed if buckets have data
  if (!SKIP_CHECK) {
    const bucketsWithData = await checkBucketsEmpty();
    
    if (bucketsWithData.length > 0) {
      console.log('\n');
      console.log('╔═══════════════════════════════════════════════════════════════╗');
      console.log('║  ❌ INITIALIZATION ABORTED - DATA EXISTS IN BUCKETS           ║');
      console.log('╠═══════════════════════════════════════════════════════════════╣');
      console.log('║  The following buckets contain data:                          ║');
      for (const bucket of bucketsWithData) {
        console.log(`║    - ${bucket.key}: ${bucket.name.padEnd(40)}║`);
      }
      console.log('║                                                               ║');
      console.log('║  To reinitialize, first clear existing data:                  ║');
      console.log('║  node scripts/project-init/clearAllBuckets.cjs                ║');
      console.log('║                                                               ║');
      console.log('║  Or use --skip-check to force (DANGEROUS!)                    ║');
      console.log('╚═══════════════════════════════════════════════════════════════╝\n');
      process.exit(1);
    }
    
    log('All buckets are empty - safe to proceed', 'success');
  } else {
    log('⚠️  Safety check SKIPPED - proceeding anyway...', 'warn');
  }
  
  // Proceed with initialization
  console.log('\n--- Starting Initialization ---\n');
  
  // Step 1: Create Admin Account
  const adminData = await createAdminAccount();
  if (!adminData && !DRY_RUN) {
    log('Failed to create admin account - aborting', 'error');
    process.exit(1);
  }
  
  // Step 2: Create Index Files
  await createIndexFiles(adminData || { 
    credentials: generateAdminCredentials(), 
    profile: generateAdminProfile() 
  });
  
  // Step 3: Create Directory Structure
  await createDirectoryStructure();
  
  // Summary
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ PROJECT INITIALIZATION COMPLETE                           ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log('║  Admin Account Created:                                       ║');
  console.log(`║    Email: ${ADMIN_CONFIG.email.padEnd(48)}║`);
  console.log(`║    Password: ${ADMIN_CONFIG.password.padEnd(45)}║`);
  console.log('║                                                               ║');
  console.log('║  Next Steps:                                                  ║');
  console.log('║    1. Start the Doctor Portal to access admin dashboard       ║');
  console.log('║    2. Add doctors via admin panel                             ║');
  console.log('║    3. Start Patient Portal for patient registration           ║');
  console.log('║                                                               ║');
  console.log('║  Optional - Seed Sample Data:                                 ║');
  console.log('║    node scripts/project-init/seedSampleData.cjs               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
}

// ============================================================================
// RUN
// ============================================================================

initializeProject().catch(error => {
  log(`Unexpected error: ${error.message}`, 'error');
  console.error(error);
  process.exit(1);
});
