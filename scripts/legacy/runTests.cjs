/**
 * Test Runner Orchestrator for Izara Telemedicine Platform
 * 
 * This script orchestrates the complete test workflow:
 * 1. Clean database
 * 2. Generate mock data
 * 3. Wait for servers to be ready
 * 4. Run Selenium tests
 * 5. Report results
 * 
 * Run: node scripts/runTests.cjs
 */

const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Ports
  gcsApiPort: 3012,
  authPort: 3011,
  mainApiPort: 3009,
  doctorFrontendPort: 3010,
  patientApiPort: 3004,
  patientFrontendPort: 5173,
  
  // URLs
  gcsApiUrl: 'http://localhost:3012',
  authUrl: 'http://localhost:3011',
  doctorPortalUrl: 'http://localhost:3010',
  patientPortalUrl: 'http://localhost:5173',
  
  // Timeouts
  serverStartTimeout: 60000, // 60 seconds
  healthCheckInterval: 2000, // 2 seconds
  
  // Paths
  doctorPortalPath: path.join(__dirname, '..', 'Isara-doctor-portal'),
  patientPortalPath: path.join(__dirname, '..', 'Isara-patient-portal'),
  scriptsPath: __dirname
};

// Running processes
const processes = [];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function log(message, type = 'info') {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    step: '▶️'
  }[type] || '📋';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/api/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    
    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(name, port, timeout = CONFIG.serverStartTimeout) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await checkPort(port)) {
      log(`${name} is ready on port ${port}`, 'success');
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, CONFIG.healthCheckInterval));
  }
  
  log(`${name} failed to start on port ${port}`, 'error');
  return false;
}

function runScript(scriptPath, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const cwd = options.cwd || CONFIG.scriptsPath;
    
    log(`Running: node ${path.basename(scriptPath)} ${args.join(' ')}`, 'step');
    
    const proc = spawn('node', [scriptPath, ...args], {
      cwd,
      stdio: 'inherit',
      shell: true
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        reject(new Error(`Script exited with code ${code}`));
      }
    });
    
    proc.on('error', reject);
  });
}

function startServer(name, command, cwd, port) {
  return new Promise((resolve) => {
    log(`Starting ${name}...`, 'step');
    
    const proc = spawn(command, {
      cwd,
      stdio: 'pipe',
      shell: true,
      detached: false
    });
    
    processes.push({ name, proc, port });
    
    proc.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`[${name}] ${output}`);
      }
    });
    
    proc.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output && !output.includes('warning')) {
        console.log(`[${name}] ${output}`);
      }
    });
    
    proc.on('error', (err) => {
      log(`${name} error: ${err.message}`, 'error');
    });
    
    // Give process time to start
    setTimeout(() => resolve(proc), 3000);
  });
}

function stopAllServers() {
  log('Stopping all servers...', 'step');
  
  for (const { name, proc } of processes) {
    try {
      if (proc && !proc.killed) {
        proc.kill('SIGTERM');
        log(`Stopped ${name}`, 'info');
      }
    } catch (e) {
      log(`Could not stop ${name}: ${e.message}`, 'warning');
    }
  }
}

// ============================================================================
// MAIN WORKFLOW
// ============================================================================

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  🚀 IZARA TELEMEDICINE TEST RUNNER');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const startTime = Date.now();
  let exitCode = 0;

  // Handle cleanup on exit
  process.on('SIGINT', () => {
    log('Received SIGINT, cleaning up...', 'warning');
    stopAllServers();
    process.exit(1);
  });

  process.on('SIGTERM', () => {
    log('Received SIGTERM, cleaning up...', 'warning');
    stopAllServers();
    process.exit(1);
  });

  try {
    // ========================================================================
    // STEP 1: CHECK PREREQUISITES
    // ========================================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  📋 STEP 1: CHECK PREREQUISITES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Check if portals exist
    if (!fs.existsSync(CONFIG.doctorPortalPath)) {
      throw new Error(`Doctor portal not found at: ${CONFIG.doctorPortalPath}`);
    }
    log('Doctor portal found', 'success');

    if (!fs.existsSync(CONFIG.patientPortalPath)) {
      throw new Error(`Patient portal not found at: ${CONFIG.patientPortalPath}`);
    }
    log('Patient portal found', 'success');

    // Check for chromedriver
    try {
      execSync('chromedriver --version', { stdio: 'pipe' });
      log('ChromeDriver found', 'success');
    } catch (e) {
      log('ChromeDriver not found. Installing...', 'warning');
      execSync('npm install -g chromedriver', { stdio: 'inherit' });
    }

    // ========================================================================
    // STEP 2: START GCS API SERVER
    // ========================================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  🗄️  STEP 2: START GCS API SERVER');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Check if GCS API is already running
    if (await checkPort(CONFIG.gcsApiPort)) {
      log('GCS API Server is already running', 'success');
    } else {
      await startServer(
        'GCS-API',
        'node server/gcsApiServer.cjs',
        CONFIG.doctorPortalPath,
        CONFIG.gcsApiPort
      );
      
      if (!await waitForServer('GCS API Server', CONFIG.gcsApiPort)) {
        throw new Error('GCS API Server failed to start');
      }
    }

    // ========================================================================
    // STEP 3: CLEAN DATABASE
    // ========================================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  🧹 STEP 3: CLEAN DATABASE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
      await runScript(path.join(CONFIG.scriptsPath, 'cleanDatabase.cjs'));
      log('Database cleaned successfully', 'success');
    } catch (e) {
      log(`Database cleaning had issues: ${e.message}`, 'warning');
      // Continue anyway, some errors are expected if data doesn't exist
    }

    // ========================================================================
    // STEP 4: GENERATE MOCK DATA
    // ========================================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  📦 STEP 4: GENERATE MOCK DATA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await runScript(path.join(CONFIG.scriptsPath, 'generateComprehensiveMockData.cjs'));
    log('Mock data generated successfully', 'success');

    // ========================================================================
    // STEP 5: START ALL SERVERS
    // ========================================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  🖥️  STEP 5: START ALL SERVERS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Start Auth Server
    if (!await checkPort(CONFIG.authPort)) {
      await startServer(
        'Auth-Server',
        'node server/authServer.cjs',
        CONFIG.doctorPortalPath,
        CONFIG.authPort
      );
    } else {
      log('Auth Server is already running', 'success');
    }

    // Start Main API Server
    if (!await checkPort(CONFIG.mainApiPort)) {
      await startServer(
        'Main-API',
        'node server/mainApiServer.cjs',
        CONFIG.doctorPortalPath,
        CONFIG.mainApiPort
      );
    } else {
      log('Main API Server is already running', 'success');
    }

    // Start Doctor Portal Frontend
    if (!await checkPort(CONFIG.doctorFrontendPort)) {
      await startServer(
        'Doctor-Frontend',
        'npm run frontend',
        CONFIG.doctorPortalPath,
        CONFIG.doctorFrontendPort
      );
    } else {
      log('Doctor Portal Frontend is already running', 'success');
    }

    // Start Patient Portal API
    if (!await checkPort(CONFIG.patientApiPort)) {
      await startServer(
        'Patient-API',
        'npm run dev:server',
        CONFIG.patientPortalPath,
        CONFIG.patientApiPort
      );
    } else {
      log('Patient Portal API is already running', 'success');
    }

    // Start Patient Portal Frontend
    if (!await checkPort(CONFIG.patientFrontendPort)) {
      await startServer(
        'Patient-Frontend',
        'npm run dev',
        CONFIG.patientPortalPath,
        CONFIG.patientFrontendPort
      );
    } else {
      log('Patient Portal Frontend is already running', 'success');
    }

    // Wait for all servers to be ready
    log('Waiting for all servers to be ready...', 'step');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // ========================================================================
    // STEP 6: RUN SELENIUM TESTS
    // ========================================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  🧪 STEP 6: RUN SELENIUM TESTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
      await runScript(path.join(CONFIG.scriptsPath, 'seleniumTests.cjs'));
      log('All tests passed!', 'success');
    } catch (e) {
      log(`Some tests failed: ${e.message}`, 'error');
      exitCode = 1;
    }

  } catch (error) {
    log(`Test runner error: ${error.message}`, 'error');
    exitCode = 1;
  } finally {
    // ========================================================================
    // CLEANUP
    // ========================================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  🧹 CLEANUP');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Don't stop servers so user can inspect
    log('Servers left running for inspection', 'info');
    log('To stop servers, press Ctrl+C or close this terminal', 'info');

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`  ${exitCode === 0 ? '✅' : '❌'} TEST RUN ${exitCode === 0 ? 'COMPLETED' : 'FAILED'}`);
    console.log(`  ⏱️  Duration: ${duration} seconds`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Keep process alive if servers are running
    if (processes.length > 0) {
      log('Press Ctrl+C to stop all servers and exit', 'info');
      // Don't exit, let servers keep running
    } else {
      process.exit(exitCode);
    }
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Izara Telemedicine Test Runner

Usage: node scripts/runTests.cjs [options]

Options:
  --help, -h        Show this help message
  --clean-only      Only clean the database
  --data-only       Only generate mock data
  --tests-only      Only run tests (servers must be running)
  --headless        Run tests in headless mode

Environment Variables:
  HEADLESS          Set to 'true' for headless browser
  
Examples:
  # Run complete test workflow
  node scripts/runTests.cjs

  # Run tests in headless mode
  HEADLESS=true node scripts/runTests.cjs

  # Only generate mock data
  node scripts/runTests.cjs --data-only
`);
  process.exit(0);
}

if (args.includes('--clean-only')) {
  runScript(path.join(CONFIG.scriptsPath, 'cleanDatabase.cjs'))
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else if (args.includes('--data-only')) {
  runScript(path.join(CONFIG.scriptsPath, 'generateComprehensiveMockData.cjs'))
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else if (args.includes('--tests-only')) {
  runScript(path.join(CONFIG.scriptsPath, 'seleniumTests.cjs'))
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else {
  main();
}
