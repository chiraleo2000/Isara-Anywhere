/**
 * ================================================================================
 * IZARA TELEMEDICINE PLATFORM - GCS BUCKET STATUS CHECKER
 * ================================================================================
 *
 * Checks all GCS buckets to determine if they contain data or are empty.
 * This is a SAFETY CHECK to prevent accidental data overwrites.
 *
 * Exit Codes:
 *   0 - All buckets are EMPTY (safe to initialize)
 *   1 - One or more buckets have DATA (NOT safe to initialize)
 *   2 - Error checking buckets (connection or permission issues)
 *
 * Usage:
 *   node scripts/project-init/checkBucketStatus.cjs
 *   node scripts/project-init/checkBucketStatus.cjs --verbose
 *   node scripts/project-init/checkBucketStatus.cjs --json
 *
 * @version 1.0.0
 * @date December 2025
 */

const { Storage } = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs');

// ============================================================================
// CONFIGURATION
// ============================================================================

// Parse command line arguments
const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose') || args.includes('-v');
const JSON_OUTPUT = args.includes('--json');
const FORCE_CHECK = args.includes('--force');

// Load environment variables from .env if exists
const envPath = path.join(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

// GCS Bucket Configuration
const GCS_BUCKETS = {
  AUTH: process.env.GCS_BUCKET_AUTH || 'izara-users-credentials',
  PATIENT: process.env.GCS_BUCKET_PATIENT || 'izara-patients-data',
  DOCTOR: process.env.GCS_BUCKET_DOCTOR || 'izara-doctors-data',
  APPOINTMENTS: process.env.GCS_BUCKET_APPOINTMENTS || 'izara-appointments',
  METADATA: process.env.GCS_BUCKET_METADATA || 'izara-meta-data'
};

// Files to check in each bucket to determine if data exists
const CRITICAL_FILES = {
  AUTH: ['users/', 'credentials/', 'index.json'],
  PATIENT: ['patients/', 'profiles/', 'index.json'],
  DOCTOR: ['doctors/', 'profiles/', 'index.json'],
  APPOINTMENTS: ['appointments/', 'bookings/', 'index.json'],
  METADATA: ['content/', 'config/', 'index.json']
};

// ============================================================================
// UTILITIES
// ============================================================================

function log(message, type = 'info') {
  if (JSON_OUTPUT) return;
  
  const icons = {
    info: '📘',
    success: '✅',
    warn: '⚠️',
    error: '❌',
    check: '🔍',
    bucket: '🗂️',
    empty: '📭',
    data: '📦'
  };
  
  const timestamp = new Date().toISOString();
  console.log(`${icons[type] || '•'} [${timestamp}] ${message}`);
}

function logVerbose(message) {
  if (VERBOSE && !JSON_OUTPUT) {
    log(message, 'info');
  }
}

// ============================================================================
// GCS INITIALIZATION
// ============================================================================

function initializeStorage() {
  const projectId = process.env.GCP_PROJECT_ID || 'izara-telemedicine';
  
  // Check for explicit credentials path
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (fs.existsSync(keyPath)) {
      logVerbose(`Using credentials: ${keyPath}`);
      return new Storage({ projectId, keyFilename: keyPath });
    }
  }
  
  // Check common credential paths
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
  
  logVerbose('Using Application Default Credentials (ADC)');
  return new Storage({ projectId });
}

// ============================================================================
// BUCKET CHECKING FUNCTIONS
// ============================================================================

/**
 * Check if a bucket exists
 */
async function bucketExists(storage, bucketName) {
  try {
    const bucket = storage.bucket(bucketName);
    const [exists] = await bucket.exists();
    return exists;
  } catch (error) {
    logVerbose(`Error checking bucket existence: ${error.message}`);
    return false;
  }
}

/**
 * Check if a bucket has any files
 */
async function bucketHasFiles(storage, bucketName, maxFilesToCheck = 10) {
  try {
    const bucket = storage.bucket(bucketName);
    const [files] = await bucket.getFiles({ maxResults: maxFilesToCheck });
    return {
      hasFiles: files.length > 0,
      fileCount: files.length,
      sampleFiles: files.slice(0, 5).map(f => f.name)
    };
  } catch (error) {
    logVerbose(`Error listing files in ${bucketName}: ${error.message}`);
    return { hasFiles: false, fileCount: 0, error: error.message };
  }
}

/**
 * Check for critical data files in a bucket
 */
async function checkCriticalFiles(storage, bucketName, pathsToCheck) {
  const foundFiles = [];
  
  for (const filePath of pathsToCheck) {
    try {
      const bucket = storage.bucket(bucketName);
      
      if (filePath.endsWith('/')) {
        // Check for directory (prefix)
        const [files] = await bucket.getFiles({ 
          prefix: filePath, 
          maxResults: 1 
        });
        if (files.length > 0) {
          foundFiles.push(filePath);
        }
      } else {
        // Check for specific file
        const file = bucket.file(filePath);
        const [exists] = await file.exists();
        if (exists) {
          foundFiles.push(filePath);
        }
      }
    } catch (error) {
      logVerbose(`Error checking ${filePath}: ${error.message}`);
    }
  }
  
  return foundFiles;
}

/**
 * Check a single bucket's status
 */
async function checkBucket(storage, bucketKey, bucketName) {
  logVerbose(`Checking bucket: ${bucketName}`);
  
  const result = {
    key: bucketKey,
    name: bucketName,
    exists: false,
    isEmpty: true,
    fileCount: 0,
    criticalFilesFound: [],
    sampleFiles: [],
    error: null
  };
  
  // Check if bucket exists
  result.exists = await bucketExists(storage, bucketName);
  
  if (!result.exists) {
    result.error = 'Bucket does not exist';
    return result;
  }
  
  // Check for files
  const filesInfo = await bucketHasFiles(storage, bucketName);
  result.isEmpty = !filesInfo.hasFiles;
  result.fileCount = filesInfo.fileCount;
  result.sampleFiles = filesInfo.sampleFiles || [];
  
  if (filesInfo.error) {
    result.error = filesInfo.error;
  }
  
  // Check for critical data files
  const criticalPaths = CRITICAL_FILES[bucketKey] || [];
  result.criticalFilesFound = await checkCriticalFiles(storage, bucketName, criticalPaths);
  
  return result;
}

// ============================================================================
// MAIN CHECK FUNCTION
// ============================================================================

async function checkAllBuckets() {
  if (!JSON_OUTPUT) {
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║    IZARA TELEMEDICINE - GCS BUCKET STATUS CHECKER             ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log('║  Checking all buckets for existing data...                    ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  }
  
  let storage;
  try {
    storage = initializeStorage();
    log('GCS connection initialized', 'success');
  } catch (error) {
    log(`Failed to initialize GCS: ${error.message}`, 'error');
    process.exit(2);
  }
  
  const results = {
    timestamp: new Date().toISOString(),
    allEmpty: true,
    safeToInitialize: true,
    buckets: {}
  };
  
  // Check each bucket
  for (const [key, bucketName] of Object.entries(GCS_BUCKETS)) {
    log(`Checking ${key}: ${bucketName}...`, 'check');
    
    const bucketStatus = await checkBucket(storage, key, bucketName);
    results.buckets[key] = bucketStatus;
    
    if (!bucketStatus.exists) {
      log(`  ${key}: Bucket does not exist`, 'warn');
    } else if (bucketStatus.isEmpty) {
      log(`  ${key}: Empty ✓`, 'empty');
    } else {
      log(`  ${key}: Contains ${bucketStatus.fileCount}+ files`, 'data');
      if (bucketStatus.criticalFilesFound.length > 0) {
        log(`    Critical files found: ${bucketStatus.criticalFilesFound.join(', ')}`, 'warn');
      }
      results.allEmpty = false;
      results.safeToInitialize = false;
    }
  }
  
  // Output results
  if (JSON_OUTPUT) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                        STATUS SUMMARY                          ');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const statusTable = Object.entries(results.buckets).map(([key, status]) => ({
      Bucket: key,
      Name: status.name,
      Exists: status.exists ? '✅' : '❌',
      Empty: status.isEmpty ? '✅ Empty' : '⚠️ Has Data',
      Files: status.fileCount
    }));
    
    console.table(statusTable);
    
    console.log('\n═══════════════════════════════════════════════════════════════\n');
    
    if (results.safeToInitialize) {
      console.log('🟢 STATUS: ALL BUCKETS ARE EMPTY');
      console.log('   ✅ Safe to run initialization scripts');
      console.log('\n   Run: node scripts/project-init/initializeProject.cjs\n');
    } else {
      console.log('🔴 STATUS: ONE OR MORE BUCKETS CONTAIN DATA');
      console.log('   ❌ NOT safe to initialize - would overwrite existing data!');
      console.log('\n   If you want to reinitialize, first run:');
      console.log('   node scripts/project-init/clearAllBuckets.cjs\n');
      console.log('   ⚠️  WARNING: This will DELETE all existing data!\n');
    }
  }
  
  // Exit with appropriate code
  process.exit(results.safeToInitialize ? 0 : 1);
}

// ============================================================================
// RUN
// ============================================================================

checkAllBuckets().catch(error => {
  log(`Unexpected error: ${error.message}`, 'error');
  process.exit(2);
});
