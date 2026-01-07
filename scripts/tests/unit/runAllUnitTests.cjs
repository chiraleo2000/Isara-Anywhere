/**
 * ============================================================================
 * IZARA TELEMEDICINE - Complete Unit Test Runner
 * ============================================================================
 * 
 * Runs ALL unit test suites and generates comprehensive report:
 * 
 * TEST SUITES:
 *   1. Authentication Tests
 *   2. PHR Tests
 *   3. Appointment Tests
 *   4. Medical Content Tests
 *   5. GCS Sync Tests
 *   6. EMR & Prescribing Tests
 * 
 * Usage:
 *   node scripts/tests/unit/runAllUnitTests.cjs
 *   node scripts/tests/unit/runAllUnitTests.cjs --suite=auth
 *   node scripts/tests/unit/runAllUnitTests.cjs --verbose
 * 
 * @version 1.0.0
 * @date January 7, 2026
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ============================================================================
// CONFIGURATION
// ============================================================================

const TEST_SUITES = {
  auth: {
    name: 'Authentication',
    file: 'authTests.cjs',
    description: 'Patient & Doctor authentication, token validation'
  },
  phr: {
    name: 'PHR (Personal Health Records)',
    file: 'phrTests.cjs',
    description: 'Vitals, BMI calculation, health logs'
  },
  appointment: {
    name: 'Appointments',
    file: 'appointmentTests.cjs',
    description: 'Booking, status transitions, meeting links'
  },
  content: {
    name: 'Medical Content',
    file: 'medicalContentTests.cjs',
    description: 'Articles, ICD-10 codes, drug database'
  },
  gcs: {
    name: 'GCS Data Sync',
    file: 'gcsSyncTests.cjs',
    description: 'Bucket access, read/write, cross-portal sync'
  },
  emr: {
    name: 'EMR & Prescribing',
    file: 'emrPrescribingTests.cjs',
    description: 'EMR structure, prescriptions, lab orders'
  }
};

const RESULTS_DIR = path.join(__dirname, '..', '..', 'test-results');

// ============================================================================
// UTILITIES
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const typeColors = {
    info: colors.blue,
    success: colors.green,
    error: colors.red,
    warn: colors.yellow,
    header: colors.magenta
  };
  const color = typeColors[type] || colors.reset;
  console.log(`${colors.cyan}[${timestamp}]${colors.reset} ${color}${message}${colors.reset}`);
}

function printBanner() {
  console.log('\n');
  console.log(`${colors.bright}${colors.cyan}╔══════════════════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║                                                                              ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║   ██╗███████╗ █████╗ ██████╗  █████╗     ██╗   ██╗███╗   ██╗██╗████████╗     ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║   ██║╚══███╔╝██╔══██╗██╔══██╗██╔══██╗    ██║   ██║████╗  ██║██║╚══██╔══╝     ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║   ██║  ███╔╝ ███████║██████╔╝███████║    ██║   ██║██╔██╗ ██║██║   ██║        ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║   ██║ ███╔╝  ██╔══██║██╔══██╗██╔══██║    ██║   ██║██║╚██╗██║██║   ██║        ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║   ██║███████╗██║  ██║██║  ██║██║  ██║    ╚██████╔╝██║ ╚████║██║   ██║        ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║   ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝     ╚═════╝ ╚═╝  ╚═══╝╚═╝   ╚═╝        ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║                                                                              ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║              IZARA TELEMEDICINE - UNIT TEST RUNNER                           ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║                                                                              ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚══════════════════════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log('\n');
}

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    verbose: args.includes('--verbose'),
    suite: args.find(a => a.startsWith('--suite='))?.split('=')[1] || 'all',
    help: args.includes('--help')
  };
}

function showHelp() {
  console.log(`
Usage: node runAllUnitTests.cjs [options]

Options:
  --suite=<name>   Run specific suite (auth|phr|appointment|content|gcs|emr)
  --verbose        Show detailed test output
  --help           Show this help message

Available Test Suites:`);
  
  Object.entries(TEST_SUITES).forEach(([key, suite]) => {
    console.log(`  ${key.padEnd(12)} - ${suite.name}: ${suite.description}`);
  });
  console.log('');
}

function ensureDirectories() {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
}

// ============================================================================
// TEST RUNNER
// ============================================================================

function runTestSuite(suiteName, suiteConfig, options) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const testFile = path.join(__dirname, suiteConfig.file);
    
    log(`Starting: ${suiteConfig.name}`, 'header');
    log(`  → ${suiteConfig.description}`, 'info');
    
    const child = spawn('node', ['--no-warnings', testFile], {
      stdio: options.verbose ? 'inherit' : 'pipe',
      cwd: process.cwd()
    });
    
    let output = '';
    
    if (!options.verbose) {
      child.stdout?.on('data', (data) => {
        output += data.toString();
      });
      child.stderr?.on('data', (data) => {
        output += data.toString();
      });
    }
    
    child.on('close', (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      // Parse results from output
      let passed = 0, failed = 0;
      const passMatch = output.match(/Passed:\s*(\d+)/);
      const failMatch = output.match(/Failed:\s*(\d+)/);
      if (passMatch) passed = parseInt(passMatch[1]);
      if (failMatch) failed = parseInt(failMatch[1]);
      
      const result = {
        suite: suiteName,
        name: suiteConfig.name,
        passed,
        failed,
        duration,
        success: code === 0,
        timestamp: new Date().toISOString()
      };
      
      if (code === 0) {
        log(`✅ ${suiteConfig.name}: PASSED (${passed} tests, ${duration}s)`, 'success');
      } else {
        log(`❌ ${suiteConfig.name}: FAILED (${failed} failures, ${duration}s)`, 'error');
      }
      
      resolve(result);
    });
    
    child.on('error', (error) => {
      log(`❌ ${suiteConfig.name}: ERROR - ${error.message}`, 'error');
      resolve({
        suite: suiteName,
        name: suiteConfig.name,
        passed: 0,
        failed: 1,
        duration: ((Date.now() - startTime) / 1000).toFixed(2),
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    });
  });
}

async function runAllSuites(options) {
  const startTime = Date.now();
  const results = [];
  
  const suitesToRun = options.suite === 'all' 
    ? Object.keys(TEST_SUITES)
    : [options.suite];
  
  // Validate suite name
  for (const suite of suitesToRun) {
    if (!TEST_SUITES[suite]) {
      log(`Unknown test suite: ${suite}`, 'error');
      showHelp();
      process.exit(1);
    }
  }
  
  log(`Running ${suitesToRun.length} test suite(s)...\n`, 'info');
  
  // Run suites sequentially
  for (const suiteName of suitesToRun) {
    const result = await runTestSuite(suiteName, TEST_SUITES[suiteName], options);
    results.push(result);
    console.log(''); // Spacing between suites
  }
  
  return {
    results,
    totalDuration: ((Date.now() - startTime) / 1000).toFixed(2)
  };
}

function printSummary(allResults) {
  const { results, totalDuration } = allResults;
  
  let totalPassed = 0;
  let totalFailed = 0;
  let suitesPassedCount = 0;
  let suitesFailedCount = 0;
  
  results.forEach(r => {
    totalPassed += r.passed;
    totalFailed += r.failed;
    if (r.success) suitesPassedCount++;
    else suitesFailedCount++;
  });
  
  const passRate = ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1);
  
  console.log('\n');
  console.log(`${colors.bright}${colors.cyan}╔══════════════════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║                         UNIT TEST RESULTS SUMMARY                           ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╠══════════════════════════════════════════════════════════════════════════════╣${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║                                                                              ║${colors.reset}`);
  
  // Results by suite
  results.forEach(r => {
    const status = r.success ? `${colors.green}✅ PASS${colors.reset}` : `${colors.red}❌ FAIL${colors.reset}`;
    const name = r.name.padEnd(25);
    const stats = `${r.passed} passed, ${r.failed} failed`.padEnd(20);
    console.log(`${colors.cyan}║${colors.reset}  ${status}  ${name} ${stats} ${r.duration}s        ${colors.cyan}║${colors.reset}`);
  });
  
  console.log(`${colors.bright}${colors.cyan}║                                                                              ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╠══════════════════════════════════════════════════════════════════════════════╣${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║  TOTALS                                                                      ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║                                                                              ║${colors.reset}`);
  console.log(`${colors.cyan}║${colors.reset}  Test Suites:     ${(suitesPassedCount + ' passed, ' + suitesFailedCount + ' failed').padEnd(56)} ${colors.cyan}║${colors.reset}`);
  console.log(`${colors.cyan}║${colors.reset}  Individual Tests: ${(totalPassed + ' passed, ' + totalFailed + ' failed').padEnd(55)} ${colors.cyan}║${colors.reset}`);
  console.log(`${colors.cyan}║${colors.reset}  Pass Rate:        ${(passRate + '%').padEnd(55)} ${colors.cyan}║${colors.reset}`);
  console.log(`${colors.cyan}║${colors.reset}  Total Duration:   ${(totalDuration + 's').padEnd(55)} ${colors.cyan}║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║                                                                              ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚══════════════════════════════════════════════════════════════════════════════╝${colors.reset}`);
  
  // Save combined results
  const combinedResults = {
    timestamp: new Date().toISOString(),
    duration: totalDuration,
    summary: {
      totalSuites: results.length,
      suitesPassed: suitesPassedCount,
      suitesFailed: suitesFailedCount,
      totalTests: totalPassed + totalFailed,
      testsPassed: totalPassed,
      testsFailed: totalFailed,
      passRate: parseFloat(passRate)
    },
    suites: results
  };
  
  fs.writeFileSync(
    path.join(RESULTS_DIR, `unit-tests-combined-${Date.now()}.json`),
    JSON.stringify(combinedResults, null, 2)
  );
  
  log(`\nResults saved to: ${RESULTS_DIR}`, 'info');
  
  // Final status
  console.log('\n');
  if (suitesFailedCount === 0) {
    console.log(`${colors.green}${colors.bright}🎉 All unit tests passed! Ready for E2E testing.${colors.reset}`);
    console.log(`   Next: node scripts/tests/localDevTests.cjs --full`);
  } else {
    console.log(`${colors.red}${colors.bright}⚠️  Some unit tests failed. Please fix issues before proceeding.${colors.reset}`);
  }
  console.log('\n');
  
  return suitesFailedCount === 0 ? 0 : 1;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const options = parseArgs();
  
  if (options.help) {
    showHelp();
    process.exit(0);
  }
  
  printBanner();
  ensureDirectories();
  
  const results = await runAllSuites(options);
  const exitCode = printSummary(results);
  
  process.exit(exitCode);
}

main().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
