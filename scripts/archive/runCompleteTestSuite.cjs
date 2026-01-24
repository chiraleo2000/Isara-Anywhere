/**
 * ============================================================================
 * IZARA TELEMEDICINE - Complete Test Suite Runner
 * ============================================================================
 * 
 * Master test runner that executes all tests in proper sequence:
 * 
 * PHASE 1: Unit Tests
 *   - Authentication tests
 *   - PHR tests
 *   - Appointment tests
 *   - Medical content tests
 *   - GCS sync tests
 *   - EMR & prescribing tests
 * 
 * PHASE 2: Local Development Tests (API)
 *   - Server health checks
 *   - GCS connectivity
 *   - Authentication flows
 *   - Data sync verification
 * 
 * PHASE 3: E2E Tests (Browser - Optional)
 *   - Appointment workflows
 *   - Health records
 *   - Medical content
 *   - Video meeting
 * 
 * Usage:
 *   node scripts/tests/runCompleteTestSuite.cjs
 *   node scripts/tests/runCompleteTestSuite.cjs --unit-only
 *   node scripts/tests/runCompleteTestSuite.cjs --skip-e2e
 *   node scripts/tests/runCompleteTestSuite.cjs --full
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

const SCRIPTS_DIR = __dirname;
const RESULTS_DIR = path.join(SCRIPTS_DIR, '..', 'test-results');

const TEST_PHASES = {
  unit: {
    name: 'Unit Tests',
    script: 'unit/runAllUnitTests.cjs',
    description: 'Core functionality validation (no browser)',
    required: true
  },
  localDev: {
    name: 'Local Development Tests',
    script: 'localDevTests.cjs',
    args: ['--api-only'],
    description: 'API endpoints and GCS connectivity',
    required: true
  },
  e2e: {
    name: 'E2E Browser Tests',
    script: 'runAllE2ETests.cjs',
    args: ['--headless'],
    description: 'Full browser-based workflow testing',
    required: false
  }
};

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
    header: colors.magenta,
    phase: colors.cyan
  };
  const icons = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warn: '⚠️',
    header: '🚀',
    phase: '📋'
  };
  const color = typeColors[type] || colors.reset;
  const icon = icons[type] || '•';
  console.log(`${colors.cyan}[${timestamp}]${colors.reset} ${color}${icon} ${message}${colors.reset}`);
}

function printBanner() {
  console.log('\n');
  console.log(`${colors.bright}${colors.cyan}╔══════════════════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║                                                                              ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║   ██╗███████╗ █████╗ ██████╗  █████╗     ████████╗███████╗███████╗████████╗  ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║   ██║╚══███╔╝██╔══██╗██╔══██╗██╔══██╗    ╚══██╔══╝██╔════╝██╔════╝╚══██╔══╝  ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║   ██║  ███╔╝ ███████║██████╔╝███████║       ██║   █████╗  ███████╗   ██║     ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║   ██║ ███╔╝  ██╔══██║██╔══██╗██╔══██║       ██║   ██╔══╝  ╚════██║   ██║     ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║   ██║███████╗██║  ██║██║  ██║██║  ██║       ██║   ███████╗███████║   ██║     ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║   ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝       ╚═╝   ╚══════╝╚══════╝   ╚═╝     ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║                                                                              ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║              COMPLETE TEST SUITE - Local Development                         ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║                                                                              ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚══════════════════════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log('\n');
}

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    unitOnly: args.includes('--unit-only'),
    skipE2E: args.includes('--skip-e2e'),
    full: args.includes('--full'),
    verbose: args.includes('--verbose'),
    help: args.includes('--help')
  };
}

function showHelp() {
  console.log(`
Usage: node runCompleteTestSuite.cjs [options]

Options:
  --unit-only    Run only unit tests
  --skip-e2e     Run unit + local dev tests (skip browser tests)
  --full         Run all tests including E2E browser tests
  --verbose      Show detailed output
  --help         Show this help message

Test Phases:
  1. Unit Tests      - Core functionality validation
  2. Local Dev Tests - API endpoints and GCS sync
  3. E2E Tests       - Browser-based workflows (optional)

Example workflow:
  1. Start portals manually (patient: 3004/3005, doctor: 3009-3012)
  2. Run: node runCompleteTestSuite.cjs --skip-e2e
  3. If all pass, run: node runCompleteTestSuite.cjs --full
  4. Deploy to cloud if all tests pass
`);
}

function ensureDirectories() {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
}

// ============================================================================
// TEST RUNNER
// ============================================================================

function runPhase(phaseName, phaseConfig, options) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const scriptPath = path.join(SCRIPTS_DIR, phaseConfig.script);
    
    console.log('\n');
    console.log(`${colors.bright}${colors.cyan}════════════════════════════════════════════════════════════════════${colors.reset}`);
    log(`PHASE: ${phaseConfig.name}`, 'phase');
    log(`${phaseConfig.description}`, 'info');
    console.log(`${colors.cyan}════════════════════════════════════════════════════════════════════${colors.reset}`);
    console.log('');
    
    const args = ['--no-warnings', scriptPath, ...(phaseConfig.args || [])];
    
    const child = spawn('node', args, {
      stdio: options.verbose ? 'inherit' : 'pipe',
      cwd: process.cwd()
    });
    
    let output = '';
    
    if (!options.verbose) {
      child.stdout?.on('data', (data) => {
        output += data.toString();
        // Print progress indicators
        const lines = data.toString().split('\n');
        lines.forEach(line => {
          if (line.includes('✅') || line.includes('❌')) {
            process.stdout.write('.');
          }
        });
      });
      child.stderr?.on('data', (data) => {
        output += data.toString();
      });
    }
    
    child.on('close', (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      // Parse results
      let passed = 0, failed = 0;
      const passMatch = output.match(/(\d+)\s*passed/i);
      const failMatch = output.match(/(\d+)\s*failed/i);
      if (passMatch) passed = parseInt(passMatch[1]);
      if (failMatch) failed = parseInt(failMatch[1]);
      
      console.log(''); // New line after progress dots
      
      const result = {
        phase: phaseName,
        name: phaseConfig.name,
        passed,
        failed,
        duration,
        success: code === 0,
        timestamp: new Date().toISOString()
      };
      
      if (code === 0) {
        log(`${phaseConfig.name}: PASSED (${passed} tests, ${duration}s)`, 'success');
      } else {
        log(`${phaseConfig.name}: FAILED (${failed} failures, ${duration}s)`, 'error');
        if (!options.verbose && output.includes('❌')) {
          // Show failed tests
          const failedLines = output.split('\n').filter(l => l.includes('❌') || l.includes('FAILED'));
          failedLines.slice(0, 10).forEach(line => console.log(`  ${line.trim()}`));
        }
      }
      
      resolve(result);
    });
    
    child.on('error', (error) => {
      log(`${phaseConfig.name}: ERROR - ${error.message}`, 'error');
      resolve({
        phase: phaseName,
        name: phaseConfig.name,
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

async function runTestSuite(options) {
  const startTime = Date.now();
  const results = [];
  
  // Determine which phases to run
  const phasesToRun = [];
  
  // Always run unit tests first
  phasesToRun.push('unit');
  
  if (!options.unitOnly) {
    phasesToRun.push('localDev');
    
    if (options.full && !options.skipE2E) {
      phasesToRun.push('e2e');
    }
  }
  
  log(`Running ${phasesToRun.length} test phase(s): ${phasesToRun.join(' → ')}`, 'info');
  
  // Run phases sequentially
  for (const phaseName of phasesToRun) {
    const phaseConfig = TEST_PHASES[phaseName];
    const result = await runPhase(phaseName, phaseConfig, options);
    results.push(result);
    
    // Stop if required phase fails
    if (!result.success && phaseConfig.required) {
      log(`Required phase "${phaseConfig.name}" failed. Stopping test suite.`, 'error');
      break;
    }
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
  let phasesPassedCount = 0;
  let phasesFailedCount = 0;
  
  results.forEach(r => {
    totalPassed += r.passed;
    totalFailed += r.failed;
    if (r.success) phasesPassedCount++;
    else phasesFailedCount++;
  });
  
  const passRate = totalPassed + totalFailed > 0 
    ? ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)
    : '0.0';
  
  console.log('\n');
  console.log(`${colors.bright}${colors.cyan}╔══════════════════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║                    COMPLETE TEST SUITE RESULTS                              ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╠══════════════════════════════════════════════════════════════════════════════╣${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║                                                                              ║${colors.reset}`);
  
  // Results by phase
  results.forEach(r => {
    const status = r.success ? `${colors.green}✅ PASS${colors.reset}` : `${colors.red}❌ FAIL${colors.reset}`;
    const name = r.name.padEnd(28);
    const stats = `${r.passed} passed, ${r.failed} failed`.padEnd(22);
    console.log(`${colors.cyan}║${colors.reset}  ${status}  ${name} ${stats} ${r.duration}s   ${colors.cyan}║${colors.reset}`);
  });
  
  console.log(`${colors.bright}${colors.cyan}║                                                                              ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╠══════════════════════════════════════════════════════════════════════════════╣${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║  TOTALS                                                                      ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║                                                                              ║${colors.reset}`);
  console.log(`${colors.cyan}║${colors.reset}  Phases:           ${(phasesPassedCount + ' passed, ' + phasesFailedCount + ' failed').padEnd(53)} ${colors.cyan}║${colors.reset}`);
  console.log(`${colors.cyan}║${colors.reset}  Total Tests:      ${(totalPassed + ' passed, ' + totalFailed + ' failed').padEnd(53)} ${colors.cyan}║${colors.reset}`);
  console.log(`${colors.cyan}║${colors.reset}  Pass Rate:        ${(passRate + '%').padEnd(53)} ${colors.cyan}║${colors.reset}`);
  console.log(`${colors.cyan}║${colors.reset}  Duration:         ${(totalDuration + 's').padEnd(53)} ${colors.cyan}║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║                                                                              ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚══════════════════════════════════════════════════════════════════════════════╝${colors.reset}`);
  
  // Save results
  const timestamp = Date.now();
  const combinedResults = {
    timestamp: new Date().toISOString(),
    duration: totalDuration,
    summary: {
      totalPhases: results.length,
      phasesPassed: phasesPassedCount,
      phasesFailed: phasesFailedCount,
      totalTests: totalPassed + totalFailed,
      testsPassed: totalPassed,
      testsFailed: totalFailed,
      passRate: parseFloat(passRate)
    },
    phases: results
  };
  
  fs.writeFileSync(
    path.join(RESULTS_DIR, `complete-test-suite-${timestamp}.json`),
    JSON.stringify(combinedResults, null, 2)
  );
  
  log(`Results saved to: ${RESULTS_DIR}/complete-test-suite-${timestamp}.json`, 'info');
  
  // Final status and next steps
  console.log('\n');
  if (phasesFailedCount === 0) {
    console.log(`${colors.green}${colors.bright}══════════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}${colors.bright}  🎉 ALL TESTS PASSED! Ready for deployment.${colors.reset}`);
    console.log(`${colors.green}${colors.bright}══════════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`
${colors.cyan}Next Steps:${colors.reset}
  1. Build Docker images:
     ${colors.yellow}powershell scripts/build-and-push-gcr.ps1 -Version "1.x.x"${colors.reset}
  
  2. Deploy to Cloud Run:
     ${colors.yellow}powershell scripts/deploy-to-cloud-run.ps1 -Version "1.x.x"${colors.reset}
  
  3. Run cloud tests after deployment:
     ${colors.yellow}node scripts/tests/cloudRunTests.cjs${colors.reset}
`);
  } else {
    console.log(`${colors.red}${colors.bright}══════════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.red}${colors.bright}  ⚠️  SOME TESTS FAILED! Please fix issues before deploying.${colors.reset}`);
    console.log(`${colors.red}${colors.bright}══════════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`
${colors.cyan}Troubleshooting:${colors.reset}
  1. Check if all servers are running
  2. Verify GCS credentials are configured
  3. Run verbose mode for details:
     ${colors.yellow}node runCompleteTestSuite.cjs --verbose${colors.reset}
`);
  }
  
  return phasesFailedCount === 0 ? 0 : 1;
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
  
  // Show configuration
  console.log(`${colors.cyan}Configuration:${colors.reset}`);
  console.log(`  Unit Tests Only: ${options.unitOnly ? 'Yes' : 'No'}`);
  console.log(`  Skip E2E: ${options.skipE2E || !options.full ? 'Yes' : 'No'}`);
  console.log(`  Full Suite: ${options.full ? 'Yes' : 'No'}`);
  console.log(`  Verbose: ${options.verbose ? 'Yes' : 'No'}`);
  console.log('');
  
  const results = await runTestSuite(options);
  const exitCode = printSummary(results);
  
  process.exit(exitCode);
}

main().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
