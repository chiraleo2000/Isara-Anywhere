/**
 * Database Cleaning Script for Izara Telemedicine Platform
 * 
 * This script cleans/resets all data in GCS buckets before running tests.
 * Compatible with all environments (development, staging, production).
 * 
 * Run: node scripts/cleanDatabase.cjs
 * Requires: GCS API Server running on port 3012
 */

const http = require('http');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const GCS_API_URL = process.env.GCS_API_URL || 'http://localhost:3012';

const BUCKETS = {
  credentials: 'izara-users-credentials',
  doctor: 'izara-doctors-data',
  patient: 'izara-patients-data',
  appointments: 'izara-appointments',
  metadata: 'izara-meta-data'
};

// Paths to clean in each bucket
const CLEAN_PATHS = {
  credentials: [
    'users/',
    'sessions/',
    'pending-approvals.json',
    'password-resets/',
    'login-history/',
    'email-logs.json',
    'oauth/'
  ],
  doctor: [
    'doctors.json',
    'doctors/',
    'schedules/',
    'queues/',
    'profile/',
    'queue/'
  ],
  patient: [
    'users/',
    'patients/',
    'patients.json',
    'emr/',
    'emrs/',
    'prescriptions/',
    'lab-orders/',
    'imaging-orders/',
    'pdpa-consents/',
    'living-will/',
    'phr/',
    'medical-journey/'
  ],
  appointments: [
    'index.json',
    'appointments/',
    'appointment-pool.json',
    'reschedule-records.json',
    'APT-'
  ],
  metadata: [
    'audit-logs/',
    'icd10-codes.json',
    'drug-database.json',
    'specialties.json',
    'meeting-rules.json',
    'health-education-articles.json',
    'doctors.json',
    'hospitals-facilities.json',
    'health-tips.json',
    'lab-tests.json',
    'medications.json'
  ]
};

// Environment check
const ENVIRONMENT = process.env.NODE_ENV || process.env.VITE_APP_ENV || 'development';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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
          const result = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
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

async function checkApiServer() {
  try {
    const result = await makeRequest('GET', '/api/health');
    return result.status === 200;
  } catch (e) {
    return false;
  }
}

async function listFiles(bucket, prefix = '') {
  try {
    const encodedPrefix = encodeURIComponent(prefix);
    const result = await makeRequest('GET', `/api/storage/list?bucket=${bucket}&folder=${encodedPrefix}`);
    if (result.status === 200 && result.data.files) {
      return result.data.files;
    }
    return [];
  } catch (e) {
    console.error(`   ⚠️  Could not list files in ${bucket}/${prefix}: ${e.message}`);
    return [];
  }
}

async function deleteFile(bucket, filePath) {
  try {
    const result = await makeRequest('DELETE', '/api/storage/delete', {
      bucket: bucket,
      path: filePath
    });
    return result.status === 200 || result.status === 404;
  } catch (e) {
    console.error(`   ⚠️  Could not delete ${bucket}/${filePath}: ${e.message}`);
    return false;
  }
}

async function writeEmptyFile(bucket, filePath, content = []) {
  try {
    const result = await makeRequest('POST', '/api/storage/write', {
      bucket: bucket,
      path: filePath,
      data: content
    });
    return result.status === 200;
  } catch (e) {
    console.error(`   ⚠️  Could not reset ${bucket}/${filePath}: ${e.message}`);
    return false;
  }
}

// ============================================================================
// CLEANING FUNCTIONS
// ============================================================================

async function cleanBucket(bucketType, paths) {
  const bucketName = BUCKETS[bucketType];
  console.log(`\n📦 Cleaning bucket: ${bucketName}`);
  
  let deletedCount = 0;
  let errorCount = 0;

  for (const pathPattern of paths) {
    if (pathPattern.endsWith('/')) {
      // It's a folder - list and delete all files
      const folderPath = pathPattern;
      console.log(`   🗂️  Cleaning folder: ${folderPath}`);
      
      const files = await listFiles(bucketType, folderPath);
      
      for (const file of files) {
        const filePath = file.name || file;
        if (await deleteFile(bucketType, filePath)) {
          deletedCount++;
        } else {
          errorCount++;
        }
      }
      
      // Also try to delete the folder marker itself
      await deleteFile(bucketType, folderPath);
      
    } else if (pathPattern.includes('-')) {
      // It's a prefix pattern (like APT-)
      console.log(`   🔍 Cleaning pattern: ${pathPattern}*`);
      
      const files = await listFiles(bucketType, '');
      const matchingFiles = files.filter(f => {
        const name = f.name || f;
        return name.startsWith(pathPattern);
      });
      
      for (const file of matchingFiles) {
        const filePath = file.name || file;
        if (await deleteFile(bucketType, filePath)) {
          deletedCount++;
        } else {
          errorCount++;
        }
      }
      
    } else {
      // It's a specific file
      console.log(`   📄 Removing file: ${pathPattern}`);
      if (await deleteFile(bucketType, pathPattern)) {
        deletedCount++;
      } else {
        // File might not exist, that's okay
      }
    }
  }

  console.log(`   ✅ Deleted ${deletedCount} items, ${errorCount} errors`);
  return { deleted: deletedCount, errors: errorCount };
}

async function resetEssentialFiles() {
  console.log('\n🔄 Resetting essential files to empty state...\n');

  // Reset users index
  await writeEmptyFile('credentials', 'users/index.json', []);
  console.log('   ✅ Reset users/index.json');

  // Reset doctors list
  await writeEmptyFile('doctor', 'doctors.json', []);
  console.log('   ✅ Reset doctors.json');

  // Reset patients list
  await writeEmptyFile('patient', 'patients.json', []);
  console.log('   ✅ Reset patients.json');

  // Reset appointments index
  await writeEmptyFile('appointments', 'index.json', []);
  console.log('   ✅ Reset appointments/index.json');

  // Reset pending approvals
  await writeEmptyFile('credentials', 'pending-approvals.json', []);
  console.log('   ✅ Reset pending-approvals.json');

  // Reset email logs
  await writeEmptyFile('credentials', 'email-logs.json', []);
  console.log('   ✅ Reset email-logs.json');
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  🧹 DATABASE CLEANING SCRIPT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`Environment: ${ENVIRONMENT}`);
  console.log(`GCS API URL: ${GCS_API_URL}`);

  // Safety check for production
  if (ENVIRONMENT === 'production') {
    console.log('\n⚠️  WARNING: Running in PRODUCTION environment!');
    console.log('This will DELETE all data in the production database.');
    console.log('\nTo proceed, set FORCE_CLEAN=true environment variable.');
    
    if (process.env.FORCE_CLEAN !== 'true') {
      console.log('\n❌ Aborted. Set FORCE_CLEAN=true to confirm.');
      process.exit(1);
    }
    
    console.log('\n⚠️  FORCE_CLEAN=true detected. Proceeding with production clean...');
    
    // Additional 5-second delay for production
    console.log('Waiting 5 seconds... Press Ctrl+C to abort.');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // Check API server
  console.log('\n🔍 Checking GCS API server...');
  const serverRunning = await checkApiServer();

  if (!serverRunning) {
    console.error('\n❌ ERROR: GCS API Server is not running!');
    console.error('Please start the server first: node server/gcsApiServer.cjs\n');
    process.exit(1);
  }

  console.log('✅ GCS API server is running');

  // Confirm cleaning
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🗑️  CLEANING ALL BUCKETS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const stats = {
    totalDeleted: 0,
    totalErrors: 0
  };

  // Clean each bucket
  for (const [bucketType, paths] of Object.entries(CLEAN_PATHS)) {
    try {
      const result = await cleanBucket(bucketType, paths);
      stats.totalDeleted += result.deleted;
      stats.totalErrors += result.errors;
    } catch (error) {
      console.error(`   ❌ Error cleaning ${bucketType}: ${error.message}`);
      stats.totalErrors++;
    }
  }

  // Reset essential files
  await resetEssentialFiles();

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  ✅ DATABASE CLEANING COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`📊 Summary:`);
  console.log(`   • Files deleted: ${stats.totalDeleted}`);
  console.log(`   • Errors: ${stats.totalErrors}`);
  console.log(`   • Essential files reset to empty state`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  💡 NEXT STEPS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Run mock data generation:');
  console.log('  node scripts/generateComprehensiveMockData.cjs');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  process.exit(stats.totalErrors > 0 ? 1 : 0);
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Database Cleaning Script for Izara Telemedicine Platform

Usage: node scripts/cleanDatabase.cjs [options]

Options:
  --help, -h     Show this help message
  --force        Same as setting FORCE_CLEAN=true

Environment Variables:
  NODE_ENV           Set to 'production' for production environment
  VITE_APP_ENV       Alternative to NODE_ENV
  GCS_API_URL        GCS API Server URL (default: http://localhost:3012)
  FORCE_CLEAN        Set to 'true' to clean production database

Examples:
  # Clean development database
  node scripts/cleanDatabase.cjs

  # Clean production database (requires confirmation)
  NODE_ENV=production FORCE_CLEAN=true node scripts/cleanDatabase.cjs
`);
  process.exit(0);
}

if (args.includes('--force')) {
  process.env.FORCE_CLEAN = 'true';
}

// Run
main().catch(error => {
  console.error('\n❌ FATAL ERROR:', error.message);
  process.exit(1);
});
