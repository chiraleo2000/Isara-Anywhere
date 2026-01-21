/**
 * Full Automated Test Cycle Script for Izara Telemedicine Platform
 * 
 * This master script orchestrates the complete CI/CD testing workflow:
 * 1. Clean database (remove all old data)
 * 2. Generate & upload comprehensive mock data
 * 3. Run Selenium tests (UI, API, Backend validation)
 * 4. Iterate fix & retest cycle (up to 3 times)
 * 5. Retain final mock data and export results
 * 
 * Run: node scripts/runFullTestCycle.cjs
 * 
 * Options:
 *   --skip-clean     Skip database cleaning step
 *   --skip-generate  Skip mock data generation
 *   --max-retries N  Max test retry attempts (default: 3)
 *   --headless       Run tests in headless mode
 *   --export         Export final data to output folder
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  gcsApiUrl: process.env.GCS_API_URL || 'http://localhost:3012',
  doctorPortalUrl: process.env.DOCTOR_PORTAL_URL || 'http://localhost:3010',
  patientPortalUrl: process.env.PATIENT_PORTAL_URL || 'http://localhost:3005',
  maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
  headless: process.env.HEADLESS === 'true',
  outputDir: path.join(__dirname, 'output'),
  resultsDir: path.join(__dirname, 'test-results'),
  screenshotsDir: path.join(__dirname, 'test-screenshots'),
  logsDir: path.join(__dirname, 'test-logs')
};

const SCRIPTS = {
  clean: path.join(__dirname, 'cleanDatabase.cjs'),
  generate: path.join(__dirname, 'generateComprehensiveMockData.cjs'),
  test: path.join(__dirname, 'comprehensiveSeleniumTests.cjs')
};

// Parse command line arguments
const args = process.argv.slice(2);
const skipClean = args.includes('--skip-clean');
const skipGenerate = args.includes('--skip-generate');
const exportData = args.includes('--export');

const maxRetriesArg = args.indexOf('--max-retries');
if (maxRetriesArg !== -1 && args[maxRetriesArg + 1]) {
  CONFIG.maxRetries = parseInt(args[maxRetriesArg + 1]) || 3;
}

if (args.includes('--headless')) {
  CONFIG.headless = true;
  process.env.HEADLESS = 'true';
}

// ============================================================================
// TEST CYCLE STATE
// ============================================================================

const cycleState = {
  startTime: null,
  endTime: null,
  iteration: 0,
  results: [],
  finalResult: null,
  passRate: 0,
  totalPassed: 0,
  totalFailed: 0,
  totalTests: 0
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const icons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    step: '➡️',
    test: '🧪',
    clean: '🧹',
    generate: '📦',
    retry: '🔄'
  };
  console.log(`[${timestamp}] ${icons[type] || '•'} ${message}`);
}

function ensureDirectories() {
  [CONFIG.outputDir, CONFIG.resultsDir, CONFIG.screenshotsDir, CONFIG.logsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

function runScript(scriptPath, args = [], env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [scriptPath, ...args], {
      stdio: 'inherit',
      env: { ...process.env, ...env },
      cwd: path.dirname(scriptPath)
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, code });
      } else {
        resolve({ success: false, code });
      }
    });
  });
}

async function checkServices() {
  log('Checking required services...', 'info');
  
  const services = [
    { name: 'GCS API Server', url: CONFIG.gcsApiUrl, path: '/api/health' },
    { name: 'Doctor Portal', url: CONFIG.doctorPortalUrl, path: '/' },
    { name: 'Patient Portal', url: CONFIG.patientPortalUrl, path: '/' }
  ];

  const results = [];
  
  for (const service of services) {
    try {
      const url = new URL(service.path, service.url);
      const result = await new Promise((resolve) => {
        const req = http.get(url, (res) => {
          resolve({ running: res.statusCode < 500 });
        });
        req.on('error', () => resolve({ running: false }));
        req.setTimeout(5000, () => {
          req.destroy();
          resolve({ running: false });
        });
      });
      
      results.push({ ...service, ...result });
      log(`  ${result.running ? '✅' : '❌'} ${service.name}: ${result.running ? 'Running' : 'Not Available'}`, 
          result.running ? 'success' : 'error');
    } catch (e) {
      results.push({ ...service, running: false });
      log(`  ❌ ${service.name}: Error - ${e.message}`, 'error');
    }
  }

  const allRunning = results.every(r => r.running);
  if (!allRunning) {
    log('\nSome services are not running. Please start them first:', 'warning');
    log('  1. GCS API Server: cd Isara-doctor-portal && node server/gcsApiServer.cjs', 'info');
    log('  2. Doctor Portal: cd Isara-doctor-portal && npm run dev', 'info');
    log('  3. Patient Portal: cd Isara-patient-portal && npm run dev', 'info');
  }

  return allRunning;
}

function parseTestResults(resultsFile) {
  try {
    if (fs.existsSync(resultsFile)) {
      const data = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
      return {
        passed: data.passed || [],
        failed: data.failed || [],
        skipped: data.skipped || [],
        totalTests: (data.passed?.length || 0) + (data.failed?.length || 0) + (data.skipped?.length || 0),
        passRate: data.passed?.length / ((data.passed?.length || 0) + (data.failed?.length || 0)) * 100 || 0
      };
    }
  } catch (e) {
    log(`Could not parse results file: ${e.message}`, 'warning');
  }
  return null;
}

function findLatestResultsFile() {
  const files = fs.readdirSync(__dirname)
    .filter(f => f.startsWith('test-results-comprehensive-') && f.endsWith('.json'))
    .map(f => ({
      name: f,
      path: path.join(__dirname, f),
      mtime: fs.statSync(path.join(__dirname, f)).mtime
    }))
    .sort((a, b) => b.mtime - a.mtime);

  return files[0]?.path || null;
}

async function exportFinalData() {
  log('Exporting final mock data...', 'step');
  
  const exportDir = path.join(CONFIG.outputDir, `final-data-${Date.now()}`);
  fs.mkdirSync(exportDir, { recursive: true });

  // Export test results
  const latestResults = findLatestResultsFile();
  if (latestResults) {
    fs.copyFileSync(latestResults, path.join(exportDir, 'test-results.json'));
    log('  ✅ Exported test results', 'success');
  }

  // Create summary file
  const summary = {
    exportedAt: new Date().toISOString(),
    cycleInfo: {
      iterations: cycleState.iteration,
      totalDuration: cycleState.endTime - cycleState.startTime,
      finalPassRate: cycleState.passRate
    },
    results: cycleState.results,
    testUsers: {
      admin: { email: 'admin.test@izara.com', password: 'IzaraAdmin@2024', id: 'ADMIN-001' },
      doctor: { email: 'doctor.test@izara.com', password: 'IzaraDoctor@2024', id: 'DOC-001' },
      pendingDoctor: { email: 'doctor02.test@izara.com', password: 'IzaraDoctor@2024', id: 'DOC-002' },
      patient: { email: 'demo.test@gmail.com', password: 'P@ssw0rd', id: 'PATIENT-001' }
    }
  };

  fs.writeFileSync(
    path.join(exportDir, 'test-cycle-summary.json'),
    JSON.stringify(summary, null, 2)
  );
  log('  ✅ Exported test cycle summary', 'success');

  return exportDir;
}

// ============================================================================
// MAIN TEST CYCLE STEPS
// ============================================================================

async function step1_CleanDatabase() {
  if (skipClean) {
    log('Skipping database cleanup (--skip-clean)', 'warning');
    return true;
  }

  log('STEP 1: Cleaning database...', 'clean');
  console.log('\n' + '═'.repeat(60));
  
  const result = await runScript(SCRIPTS.clean);
  
  if (result.success) {
    log('Database cleaned successfully', 'success');
    return true;
  } else {
    log('Database cleaning failed', 'error');
    return false;
  }
}

async function step2_GenerateMockData() {
  if (skipGenerate) {
    log('Skipping mock data generation (--skip-generate)', 'warning');
    return true;
  }

  log('STEP 2: Generating comprehensive mock data...', 'generate');
  console.log('\n' + '═'.repeat(60));
  
  const result = await runScript(SCRIPTS.generate);
  
  if (result.success) {
    log('Mock data generated successfully', 'success');
    return true;
  } else {
    log('Mock data generation failed', 'error');
    return false;
  }
}

async function step3_RunTests() {
  log(`STEP 3: Running Selenium tests (Iteration ${cycleState.iteration + 1}/${CONFIG.maxRetries})...`, 'test');
  console.log('\n' + '═'.repeat(60));
  
  const env = CONFIG.headless ? { HEADLESS: 'true' } : {};
  const result = await runScript(SCRIPTS.test, [], env);
  
  // Parse results
  const latestResults = findLatestResultsFile();
  const parsedResults = latestResults ? parseTestResults(latestResults) : null;
  
  if (parsedResults) {
    cycleState.results.push({
      iteration: cycleState.iteration + 1,
      timestamp: new Date().toISOString(),
      passed: parsedResults.passed.length,
      failed: parsedResults.failed.length,
      skipped: parsedResults.skipped.length,
      passRate: parsedResults.passRate.toFixed(2) + '%',
      failures: parsedResults.failed.map(f => f.name)
    });
    
    cycleState.totalPassed = parsedResults.passed.length;
    cycleState.totalFailed = parsedResults.failed.length;
    cycleState.totalTests = parsedResults.totalTests;
    cycleState.passRate = parsedResults.passRate;
    
    log(`Test Results: ${parsedResults.passed.length} passed, ${parsedResults.failed.length} failed, ${parsedResults.skipped.length} skipped`, 'info');
    log(`Pass Rate: ${parsedResults.passRate.toFixed(2)}%`, 'info');
    
    if (parsedResults.failed.length > 0) {
      log('Failed tests:', 'warning');
      parsedResults.failed.forEach(f => {
        log(`  - ${f.name}: ${f.details || 'Unknown error'}`, 'error');
      });
    }
  }
  
  cycleState.iteration++;
  
  return {
    success: result.success || (parsedResults && parsedResults.failed.length === 0),
    allPassed: parsedResults && parsedResults.failed.length === 0,
    results: parsedResults
  };
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  cycleState.startTime = Date.now();
  
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     IZARA TELEMEDICINE - FULL AUTOMATED TEST CYCLE           ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  This script will:                                           ║');
  console.log('║  1. Clean all existing data from GCS buckets                 ║');
  console.log('║  2. Generate comprehensive mock data & users                 ║');
  console.log('║  3. Run Selenium tests (UI, API, Backend)                    ║');
  console.log('║  4. Retry failed tests up to ' + CONFIG.maxRetries + ' times                        ║');
  console.log('║  5. Export final mock data and results                       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('\n');

  log(`Configuration:`, 'info');
  log(`  Max Retries: ${CONFIG.maxRetries}`, 'info');
  log(`  Headless Mode: ${CONFIG.headless}`, 'info');
  log(`  Skip Clean: ${skipClean}`, 'info');
  log(`  Skip Generate: ${skipGenerate}`, 'info');
  log(`  Export Data: ${exportData}`, 'info');
  console.log('\n');

  // Ensure directories exist
  ensureDirectories();

  // Check services
  const servicesReady = await checkServices();
  if (!servicesReady) {
    log('Required services are not running. Exiting.', 'error');
    process.exit(1);
  }

  console.log('\n');

  // Step 1: Clean Database
  const cleanSuccess = await step1_CleanDatabase();
  if (!cleanSuccess && !skipClean) {
    log('Failed to clean database. Continue anyway? (y/n)', 'warning');
    // In automated mode, continue anyway
  }

  console.log('\n');

  // Step 2: Generate Mock Data
  const generateSuccess = await step2_GenerateMockData();
  if (!generateSuccess && !skipGenerate) {
    log('Failed to generate mock data. Exiting.', 'error');
    process.exit(1);
  }

  console.log('\n');

  // Step 3: Run Tests with Retry Loop
  let allTestsPassed = false;
  
  while (cycleState.iteration < CONFIG.maxRetries && !allTestsPassed) {
    const testResult = await step3_RunTests();
    allTestsPassed = testResult.allPassed;
    
    if (!allTestsPassed && cycleState.iteration < CONFIG.maxRetries) {
      log(`\n🔄 Retrying tests (${cycleState.iteration}/${CONFIG.maxRetries})...\n`, 'retry');
      
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  cycleState.endTime = Date.now();
  const duration = Math.round((cycleState.endTime - cycleState.startTime) / 1000);

  // Export final data if requested or if tests passed
  let exportDir = null;
  if (exportData || allTestsPassed) {
    exportDir = await exportFinalData();
  }

  // Final Summary
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST CYCLE COMPLETE                        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('\n');

  log('FINAL RESULTS:', 'info');
  console.log('━'.repeat(60));
  log(`  Total Iterations: ${cycleState.iteration}`, 'info');
  log(`  Total Duration: ${Math.floor(duration / 60)}m ${duration % 60}s`, 'info');
  log(`  Final Pass Rate: ${cycleState.passRate.toFixed(2)}%`, 'info');
  log(`  Tests Passed: ${cycleState.totalPassed}`, 'success');
  log(`  Tests Failed: ${cycleState.totalFailed}`, cycleState.totalFailed > 0 ? 'error' : 'success');
  console.log('━'.repeat(60));

  if (cycleState.results.length > 0) {
    log('\nIteration History:', 'info');
    cycleState.results.forEach(r => {
      log(`  Iteration ${r.iteration}: ${r.passed} passed, ${r.failed} failed (${r.passRate})`, 
          r.failed === 0 ? 'success' : 'warning');
    });
  }

  if (exportDir) {
    log(`\nExported data to: ${exportDir}`, 'success');
  }

  log('\nTEST USERS (Retained for reference):', 'info');
  console.log('━'.repeat(60));
  console.log('  Admin:          admin.test@izara.com / IzaraAdmin@2024');
  console.log('  Doctor:         doctor.test@izara.com / IzaraDoctor@2024');
  console.log('  Pending Doctor: doctor02.test@izara.com / IzaraDoctor@2024');
  console.log('  Patient:        demo.test@gmail.com / P@ssw0rd');
  console.log('━'.repeat(60));

  if (allTestsPassed) {
    log('\n✅ ALL TESTS PASSED! Mock data retained.', 'success');
    process.exit(0);
  } else {
    log(`\n⚠️ Some tests failed after ${CONFIG.maxRetries} iterations.`, 'warning');
    log('Review failed tests and fix issues manually.', 'info');
    process.exit(1);
  }
}

// Help text
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Full Automated Test Cycle for Izara Telemedicine Platform

Usage: node scripts/runFullTestCycle.cjs [options]

Options:
  --skip-clean      Skip database cleaning step
  --skip-generate   Skip mock data generation step
  --max-retries N   Maximum test retry attempts (default: 3)
  --headless        Run Selenium tests in headless mode
  --export          Force export of final data even on failure
  --help, -h        Show this help message

Environment Variables:
  GCS_API_URL       GCS API Server URL (default: http://localhost:3012)
  DOCTOR_PORTAL_URL Doctor Portal URL (default: http://localhost:3010)
  PATIENT_PORTAL_URL Patient Portal URL (default: http://localhost:3005)
  HEADLESS          Set to 'true' for headless browser mode
  MAX_RETRIES       Maximum test retry attempts

Examples:
  # Full test cycle with defaults
  node scripts/runFullTestCycle.cjs

  # Skip cleanup, run in headless mode
  node scripts/runFullTestCycle.cjs --skip-clean --headless

  # Maximum 5 retries, export data
  node scripts/runFullTestCycle.cjs --max-retries 5 --export

Required Services (must be running):
  1. GCS API Server: node server/gcsApiServer.cjs (port 3012)
  2. Doctor Portal: npm run dev (port 3010)
  3. Patient Portal: npm run dev (port 3005)
  `);
  process.exit(0);
}

// Run
main().catch(error => {
  log(`FATAL ERROR: ${error.message}`, 'error');
  console.error(error.stack);
  process.exit(1);
});
