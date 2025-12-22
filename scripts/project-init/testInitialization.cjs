/**
 * ================================================================================
 * IZARA TELEMEDICINE PLATFORM - INITIALIZATION TESTS
 * ================================================================================
 *
 * Tests the project initialization scripts without actually modifying data.
 * Verifies that all required components are working correctly.
 *
 * Usage:
 *   node scripts/project-init/testInitialization.cjs
 *   node scripts/project-init/testInitialization.cjs --verbose
 *
 * @version 1.0.0
 * @date December 2025
 */

const { Storage } = require('@google-cloud/storage');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// ============================================================================
// CONFIGURATION
// ============================================================================

const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose') || args.includes('-v');

// Load environment
const envPath = path.join(__dirname, '../../.env');
const envExamplePath = path.join(__dirname, '.env.example');

// GCS Buckets
const GCS_BUCKETS = {
  AUTH: process.env.GCS_BUCKET_AUTH || 'izara-users-credentials',
  PATIENT: process.env.GCS_BUCKET_PATIENT || 'izara-patients-data',
  DOCTOR: process.env.GCS_BUCKET_DOCTOR || 'izara-doctors-data',
  APPOINTMENTS: process.env.GCS_BUCKET_APPOINTMENTS || 'izara-appointments',
  METADATA: process.env.GCS_BUCKET_METADATA || 'izara-meta-data'
};

// ============================================================================
// TEST UTILITIES
// ============================================================================

const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

function log(message, type = 'info') {
  const icons = {
    info: '📘',
    success: '✅',
    warn: '⚠️',
    error: '❌',
    test: '🧪',
    pass: '✅',
    fail: '❌',
    skip: '⏭️'
  };
  console.log(`${icons[type] || '•'} ${message}`);
}

function recordTest(name, status, details = '') {
  testResults.tests.push({ name, status, details });
  if (status === 'passed') testResults.passed++;
  else if (status === 'failed') testResults.failed++;
  else testResults.skipped++;
  
  const icon = status === 'passed' ? 'pass' : status === 'failed' ? 'fail' : 'skip';
  log(`${name}: ${status.toUpperCase()}${details ? ` - ${details}` : ''}`, icon);
}

// ============================================================================
// TESTS
// ============================================================================

async function testEnvironmentFiles() {
  log('Testing environment files...', 'test');
  
  // Check .env.example exists
  if (fs.existsSync(envExamplePath)) {
    recordTest('.env.example exists', 'passed');
  } else {
    recordTest('.env.example exists', 'failed', 'File not found');
  }
  
  // Check .env exists (optional, just warn)
  if (fs.existsSync(envPath)) {
    recordTest('.env exists', 'passed');
  } else {
    recordTest('.env exists', 'skipped', 'Optional - copy from .env.example');
  }
}

async function testDependencies() {
  log('Testing dependencies...', 'test');
  
  // Test bcryptjs
  try {
    const hash = bcrypt.hashSync('test', 10);
    const valid = bcrypt.compareSync('test', hash);
    if (valid) {
      recordTest('bcryptjs working', 'passed');
    } else {
      recordTest('bcryptjs working', 'failed', 'Hash verification failed');
    }
  } catch (error) {
    recordTest('bcryptjs working', 'failed', error.message);
  }
  
  // Test dotenv
  try {
    require('dotenv');
    recordTest('dotenv available', 'passed');
  } catch (error) {
    recordTest('dotenv available', 'failed', 'Module not found');
  }
}

async function testGCSConnection() {
  log('Testing GCS connection...', 'test');
  
  const projectId = process.env.GCP_PROJECT_ID || 'izara-telemedicine';
  
  // Find credentials
  const credentialPaths = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    path.join(__dirname, '../../credentials/service-account.json'),
    path.join(__dirname, '../../Isara-doctor-portal/public/izara-telemedicine-dd0b6abe2bc8.json'),
  ].filter(Boolean);
  
  let credPath = null;
  for (const p of credentialPaths) {
    if (fs.existsSync(p)) {
      credPath = p;
      break;
    }
  }
  
  if (credPath) {
    recordTest('GCS credentials found', 'passed', path.basename(credPath));
  } else {
    recordTest('GCS credentials found', 'skipped', 'Will use ADC');
  }
  
  // Test storage connection
  try {
    let storage;
    if (credPath) {
      storage = new Storage({ projectId, keyFilename: credPath });
    } else {
      storage = new Storage({ projectId });
    }
    
    // Try to list buckets
    const [buckets] = await storage.getBuckets();
    recordTest('GCS connection', 'passed', `Found ${buckets.length} buckets`);
    
    // Check each required bucket
    for (const [key, bucketName] of Object.entries(GCS_BUCKETS)) {
      try {
        const bucket = storage.bucket(bucketName);
        const [exists] = await bucket.exists();
        
        if (exists) {
          recordTest(`Bucket ${key} exists`, 'passed', bucketName);
        } else {
          recordTest(`Bucket ${key} exists`, 'failed', `${bucketName} not found`);
        }
      } catch (error) {
        recordTest(`Bucket ${key} exists`, 'failed', error.message);
      }
    }
  } catch (error) {
    recordTest('GCS connection', 'failed', error.message);
  }
}

async function testScriptFiles() {
  log('Testing script files...', 'test');
  
  const scripts = [
    'checkBucketStatus.cjs',
    'initializeProject.cjs',
    'seedSampleData.cjs',
    'clearAllBuckets.cjs',
    '.env.example'
  ];
  
  for (const script of scripts) {
    const scriptPath = path.join(__dirname, script);
    if (fs.existsSync(scriptPath)) {
      recordTest(`Script ${script}`, 'passed');
    } else {
      recordTest(`Script ${script}`, 'failed', 'File not found');
    }
  }
}

async function testPasswordHashing() {
  log('Testing password hashing...', 'test');
  
  // Test bcrypt for doctor portal
  const testPassword = 'TestPassword@123';
  const bcryptHash = bcrypt.hashSync(testPassword, 10);
  const bcryptValid = bcrypt.compareSync(testPassword, bcryptHash);
  
  if (bcryptValid) {
    recordTest('Bcrypt hashing (Doctor Portal)', 'passed');
  } else {
    recordTest('Bcrypt hashing (Doctor Portal)', 'failed');
  }
  
  // Test base64 for patient portal
  const base64Hash = Buffer.from(testPassword).toString('base64');
  const decoded = Buffer.from(base64Hash, 'base64').toString('utf-8');
  
  if (decoded === testPassword) {
    recordTest('Base64 encoding (Patient Portal)', 'passed');
  } else {
    recordTest('Base64 encoding (Patient Portal)', 'failed');
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function runTests() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║    IZARA TELEMEDICINE - INITIALIZATION TEST SUITE             ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log('║  Testing all initialization components...                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  const startTime = Date.now();
  
  // Run all tests
  await testEnvironmentFiles();
  console.log('');
  
  await testDependencies();
  console.log('');
  
  await testScriptFiles();
  console.log('');
  
  await testPasswordHashing();
  console.log('');
  
  await testGCSConnection();
  console.log('');
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // Summary
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                      TEST RESULTS SUMMARY                      ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`  Total Tests:  ${testResults.tests.length}`);
  console.log(`  ✅ Passed:    ${testResults.passed}`);
  console.log(`  ❌ Failed:    ${testResults.failed}`);
  console.log(`  ⏭️  Skipped:   ${testResults.skipped}`);
  console.log(`  Duration:     ${duration}s`);
  console.log('');
  
  const passRate = ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1);
  
  if (testResults.failed === 0) {
    console.log('🟢 All tests passed! Ready to initialize project.');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Check bucket status: node scripts/project-init/checkBucketStatus.cjs');
    console.log('  2. Initialize project:  node scripts/project-init/initializeProject.cjs');
    console.log('  3. Seed sample data:    node scripts/project-init/seedSampleData.cjs');
  } else {
    console.log(`🔴 ${testResults.failed} test(s) failed. Please fix issues before proceeding.`);
  }
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Save results to file
  const resultsPath = path.join(__dirname, '../../test-results/init-test-results.json');
  const resultsDir = path.dirname(resultsPath);
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  fs.writeFileSync(resultsPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    duration: `${duration}s`,
    summary: {
      total: testResults.tests.length,
      passed: testResults.passed,
      failed: testResults.failed,
      skipped: testResults.skipped,
      passRate: `${passRate}%`
    },
    tests: testResults.tests
  }, null, 2));
  
  log(`Results saved to: ${resultsPath}`, 'info');
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  log(`Error: ${error.message}`, 'error');
  process.exit(1);
});
