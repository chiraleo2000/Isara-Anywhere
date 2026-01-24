/**
 * ============================================================================
 * IZARA TELEMEDICINE - Master E2E Test Runner
 * ============================================================================
 * 
 * Runs ALL E2E test suites and generates a comprehensive report:
 * 
 * TEST SUITES:
 *   1. Appointment Workflow Tests
 *   2. Medical Content Tests  
 *   3. Health Records Tests
 *   4. Theme & Language Settings Tests (NEW)
 *   5. Email Notification Selection Tests (NEW)
 *   6. Jitsi Video Meeting Tests (NEW)
 *   7. ICD-10 Code Search Tests (NEW)
 *   8. New Features Integration Tests (NEW)
 * 
 * FEATURES:
 *   - Sequential or parallel execution
 *   - Combined results summary
 *   - HTML report generation
 *   - Screenshot collection
 *   - Slack/Email notifications (optional)
 * 
 * Usage:
 *   node scripts/tests/runAllE2ETests.cjs [--headless] [--parallel] [--suite=name]
 * 
 * Options:
 *   --headless    Run Chrome in headless mode
 *   --parallel    Run test suites in parallel (faster but uses more resources)
 *   --suite=name  Run specific suite only (appointment|content|health|settings|email|jitsi|icd10|integration)
 *   --report      Generate HTML report
 *   --verbose     Show detailed logging
 * 
 * @version 2.0.0
 * @date December 12, 2025
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ============================================================================
// CONFIGURATION
// ============================================================================

const TEST_SUITES = {
  appointment: {
    name: 'Appointment Workflow',
    file: 'appointmentWorkflowTests.cjs',
    description: 'Pre-meeting → During meeting → Post-meeting workflows'
  },
  content: {
    name: 'Medical Content',
    file: 'medicalContentTests.cjs',
    description: 'Doctor creates content → Patient views in Health Studio'
  },
  health: {
    name: 'Health Records',
    file: 'healthRecordsTests.cjs',
    description: 'PHR → Vitals/BMI → EMR → Health Logs workflows'
  },
  settings: {
    name: 'Theme & Language Settings',
    file: 'themeLanguageTests.cjs',
    description: 'Theme toggle (Light/Dark) & Language switch (Thai/English)'
  },
  email: {
    name: 'Email Notification Selection',
    file: 'emailNotificationTests.cjs',
    description: 'Email recipient checkboxes in appointment confirmation'
  },
  jitsi: {
    name: 'Jitsi Video Meeting',
    file: 'jitsiMeetingTests.cjs',
    description: 'Video call button & Jitsi meeting link generation'
  },
  jitsiWorkflow: {
    name: 'Jitsi Meeting Workflow',
    file: 'jitsiMeetingWorkflowTests.cjs',
    description: 'Complete meeting flow: Doctor hosts → Patient joins → 30s meeting → Transcription → AI Summary → EMR'
  },
  icd10: {
    name: 'ICD-10 Code Search',
    file: 'icd10CodeTests.cjs',
    description: 'ICD-10 diagnosis code data validation & search'
  },
  integration: {
    name: 'New Features Integration',
    file: 'newFeaturesIntegrationTest.cjs',
    description: 'Combined test of all new features (Theme, Language, Email, Jitsi, ICD-10)'
  }
};

const RESULTS_DIR = path.join(__dirname, '..', '..', 'test-results');
const SCREENSHOTS_DIR = path.join(RESULTS_DIR, 'screenshots');

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
  console.log(`${colors.bright}${colors.cyan}║   ██╗███████╗ █████╗ ██████╗  █████╗     ████████╗███████╗███████╗████████╗  ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║   ██║╚══███╔╝██╔══██╗██╔══██╗██╔══██╗    ╚══██╔══╝██╔════╝██╔════╝╚══██╔══╝  ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║   ██║  ███╔╝ ███████║██████╔╝███████║       ██║   █████╗  ███████╗   ██║     ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║   ██║ ███╔╝  ██╔══██║██╔══██╗██╔══██║       ██║   ██╔══╝  ╚════██║   ██║     ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║   ██║███████╗██║  ██║██║  ██║██║  ██║       ██║   ███████╗███████║   ██║     ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║   ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝       ╚═╝   ╚══════╝╚══════╝   ╚═╝     ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║                                                                              ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║              IZARA TELEMEDICINE - E2E TEST RUNNER                            ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║                                                                              ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚══════════════════════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log('\n');
}

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    headless: args.includes('--headless'),
    parallel: args.includes('--parallel'),
    report: args.includes('--report'),
    verbose: args.includes('--verbose'),
    suite: args.find(a => a.startsWith('--suite='))?.split('=')[1] || 'all'
  };
}

function ensureDirectories() {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
}

// ============================================================================
// TEST RUNNER
// ============================================================================

function runTestSuite(suiteName, suiteConfig, options) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const testFile = path.join(__dirname, 'e2e', suiteConfig.file);
    
    log(`Starting: ${suiteConfig.name}`, 'header');
    log(`  → ${suiteConfig.description}`, 'info');
    
    const args = ['--no-warnings', testFile];
    if (options.headless) {
      args.push('--headless');
    }
    
    const child = spawn('node', args, {
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
      
      const result = {
        suite: suiteName,
        name: suiteConfig.name,
        passed: code === 0,
        duration: parseFloat(duration),
        exitCode: code,
        output: output
      };
      
      if (code === 0) {
        log(`✅ ${suiteConfig.name} completed (${duration}s)`, 'success');
      } else {
        log(`❌ ${suiteConfig.name} failed (exit code: ${code})`, 'error');
      }
      
      resolve(result);
    });
    
    child.on('error', (error) => {
      log(`❌ ${suiteConfig.name} error: ${error.message}`, 'error');
      resolve({
        suite: suiteName,
        name: suiteConfig.name,
        passed: false,
        duration: 0,
        exitCode: -1,
        error: error.message
      });
    });
  });
}

async function runSequential(suites, options) {
  const results = [];
  
  for (const [key, config] of Object.entries(suites)) {
    const result = await runTestSuite(key, config, options);
    results.push(result);
    
    // Small delay between suites
    await new Promise(r => setTimeout(r, 2000));
  }
  
  return results;
}

async function runParallel(suites, options) {
  const promises = Object.entries(suites).map(([key, config]) => 
    runTestSuite(key, config, options)
  );
  
  return Promise.all(promises);
}

// ============================================================================
// REPORTING
// ============================================================================

function printSummary(results, totalDuration) {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                       TEST EXECUTION SUMMARY                          ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  // Suite results table
  console.log('┌─────────────────────────────────┬──────────┬────────────┐');
  console.log('│           Test Suite            │  Status  │  Duration  │');
  console.log('├─────────────────────────────────┼──────────┼────────────┤');
  
  for (const result of results) {
    const status = result.passed ? `${colors.green}PASSED${colors.reset}` : `${colors.red}FAILED${colors.reset}`;
    const name = result.name.padEnd(31);
    const duration = `${result.duration}s`.padStart(8);
    console.log(`│ ${name} │ ${status}  │ ${duration}   │`);
  }
  
  console.log('└─────────────────────────────────┴──────────┴────────────┘');
  console.log('');
  
  // Overall summary
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
  
  console.log('┌──────────────────────────────────────────────────────────────────────┐');
  console.log('│                          OVERALL RESULTS                             │');
  console.log('├──────────────────────────────────────────────────────────────────────┤');
  console.log(`│   Total Suites:    ${total.toString().padEnd(4)}                                             │`);
  console.log(`│   ${colors.green}Passed:${colors.reset}          ${passed.toString().padEnd(4)}                                             │`);
  console.log(`│   ${colors.red}Failed:${colors.reset}          ${failed.toString().padEnd(4)}                                             │`);
  console.log(`│   Pass Rate:       ${passRate}%                                            │`);
  console.log(`│   Total Duration:  ${totalDuration.toFixed(2)}s                                          │`);
  console.log('└──────────────────────────────────────────────────────────────────────┘');
  console.log('');
  
  // Failed suite details
  if (failed > 0) {
    console.log(`${colors.red}╔══════════════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.red}║                         FAILED SUITES                                ║${colors.reset}`);
    console.log(`${colors.red}╚══════════════════════════════════════════════════════════════════════╝${colors.reset}`);
    console.log('');
    
    for (const result of results.filter(r => !r.passed)) {
      console.log(`${colors.red}✖ ${result.name}${colors.reset}`);
      console.log(`  Exit Code: ${result.exitCode}`);
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
      console.log('');
    }
  }
}

function generateHTMLReport(results, totalDuration) {
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
  const timestamp = new Date().toISOString();
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IZARA E2E Test Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 12px; color: white; margin-bottom: 30px; text-align: center; }
    .header h1 { font-size: 2.5rem; margin-bottom: 10px; }
    .header p { opacity: 0.8; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .stat-card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; }
    .stat-card.passed { border-left: 4px solid #10b981; }
    .stat-card.failed { border-left: 4px solid #ef4444; }
    .stat-card.total { border-left: 4px solid #3b82f6; }
    .stat-value { font-size: 3rem; font-weight: bold; }
    .stat-label { color: #64748b; margin-top: 5px; }
    .results-table { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .results-table table { width: 100%; border-collapse: collapse; }
    .results-table th, .results-table td { padding: 15px 20px; text-align: left; }
    .results-table th { background: #f8fafc; font-weight: 600; color: #334155; border-bottom: 2px solid #e2e8f0; }
    .results-table tr:hover { background: #f8fafc; }
    .results-table td { border-bottom: 1px solid #e2e8f0; }
    .status { padding: 5px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; }
    .status.passed { background: #d1fae5; color: #065f46; }
    .status.failed { background: #fee2e2; color: #991b1b; }
    .footer { text-align: center; margin-top: 40px; color: #64748b; padding: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏥 IZARA Telemedicine</h1>
      <p>E2E Test Execution Report</p>
      <p style="margin-top: 10px; font-size: 0.9rem;">Generated: ${timestamp}</p>
    </div>
    
    <div class="stats">
      <div class="stat-card total">
        <div class="stat-value">${total}</div>
        <div class="stat-label">Total Suites</div>
      </div>
      <div class="stat-card passed">
        <div class="stat-value" style="color: #10b981;">${passed}</div>
        <div class="stat-label">Passed</div>
      </div>
      <div class="stat-card failed">
        <div class="stat-value" style="color: #ef4444;">${failed}</div>
        <div class="stat-label">Failed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #3b82f6;">${passRate}%</div>
        <div class="stat-label">Pass Rate</div>
      </div>
    </div>
    
    <div class="results-table">
      <table>
        <thead>
          <tr>
            <th>Test Suite</th>
            <th>Status</th>
            <th>Duration</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          ${results.map(r => `
            <tr>
              <td><strong>${r.name}</strong></td>
              <td><span class="status ${r.passed ? 'passed' : 'failed'}">${r.passed ? '✓ PASSED' : '✗ FAILED'}</span></td>
              <td>${r.duration}s</td>
              <td>${r.error || (r.passed ? 'All tests passed' : `Exit code: ${r.exitCode}`)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <div class="footer">
      <p>Total Execution Time: ${totalDuration.toFixed(2)} seconds</p>
      <p style="margin-top: 10px;">IZARA Telemedicine Platform - Automated Testing</p>
    </div>
  </div>
</body>
</html>
  `;
  
  const reportPath = path.join(RESULTS_DIR, 'e2e-report.html');
  fs.writeFileSync(reportPath, html);
  log(`HTML report generated: ${reportPath}`, 'success');
}

function saveJSONReport(results, totalDuration) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      passRate: results.length > 0 ? 
        ((results.filter(r => r.passed).length / results.length) * 100).toFixed(1) : 0,
      totalDuration: totalDuration.toFixed(2)
    },
    suites: results
  };
  
  const reportPath = path.join(RESULTS_DIR, 'e2e-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`JSON report saved: ${reportPath}`, 'success');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  printBanner();
  
  const options = parseArgs();
  ensureDirectories();
  
  log('Configuration:', 'header');
  log(`  Headless: ${options.headless}`, 'info');
  log(`  Parallel: ${options.parallel}`, 'info');
  log(`  Suite: ${options.suite}`, 'info');
  log(`  Verbose: ${options.verbose}`, 'info');
  console.log('');
  
  // Reset rate limits before running tests
  log('Resetting rate limits on auth servers...', 'info');
  try {
    const { resetDoctorPortalRateLimits } = require('./utils/testHelpers.cjs');
    await resetDoctorPortalRateLimits();
  } catch (error) {
    log(`Could not reset rate limits: ${error.message}`, 'warning');
    log('Tests may fail if rate limits are hit', 'warning');
  }
  console.log('');
  
  // Determine which suites to run
  let suitesToRun = {};
  
  if (options.suite === 'all') {
    suitesToRun = TEST_SUITES;
  } else if (TEST_SUITES[options.suite]) {
    suitesToRun[options.suite] = TEST_SUITES[options.suite];
  } else {
    log(`Unknown suite: ${options.suite}`, 'error');
    log(`Available suites: ${Object.keys(TEST_SUITES).join(', ')}`, 'info');
    process.exit(1);
  }
  
  log(`Running ${Object.keys(suitesToRun).length} test suite(s)...`, 'header');
  console.log('');
  
  const startTime = Date.now();
  
  // Run tests
  let results;
  if (options.parallel) {
    log('Executing in parallel mode', 'info');
    results = await runParallel(suitesToRun, options);
  } else {
    log('Executing sequentially', 'info');
    results = await runSequential(suitesToRun, options);
  }
  
  const totalDuration = (Date.now() - startTime) / 1000;
  
  // Generate reports
  printSummary(results, totalDuration);
  
  if (options.report) {
    generateHTMLReport(results, totalDuration);
  }
  
  saveJSONReport(results, totalDuration);
  
  // Exit code based on results
  const failed = results.filter(r => !r.passed).length;
  process.exit(failed > 0 ? 1 : 0);
}

// Run
main().catch(error => {
  log(`Fatal error: ${error.message}`, 'error');
  process.exit(1);
});
