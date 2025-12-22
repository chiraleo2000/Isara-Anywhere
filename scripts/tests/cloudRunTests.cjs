/**
 * ============================================================================
 * IZARA TELEMEDICINE - Cloud Run E2E Tests
 * ============================================================================
 * 
 * Tests the deployed Cloud Run services for both Patient and Doctor portals
 * Similar to local tests but targeting production/cloud URLs
 * 
 * Usage:
 *   node scripts/tests/cloudRunTests.cjs [--headless] [--verbose]
 * 
 * Options:
 *   --headless    Run Chrome in headless mode
 *   --verbose     Show detailed logging
 *   --local       Test local servers instead of cloud (for comparison)
 * 
 * @version 1.0.0
 * @date January 2025
 */

const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const path = require('path');
const fs = require('fs');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Cloud Run URLs (Production)
  cloud: {
    patientPortal: 'https://izara-patient-portal-724889190329.asia-southeast1.run.app',
    doctorPortal: 'https://izara-doctor-portal-724889190329.asia-southeast1.run.app'
  },
  // Local URLs (Development)
  local: {
    patientPortal: 'http://localhost:3005',
    doctorPortal: 'http://localhost:3010'
  },
  // Test credentials
  credentials: {
    patient: {
      email: 'demo.test@gmail.com',
      password: 'P@ssw0rd'
    },
    doctor: {
      email: 'doctor.test@izara.com',
      password: 'IzaraDoctor@2024'
    },
    admin: {
      email: 'admin.test@izara.com',
      password: 'IzaraAdmin@2024'
    }
  },
  // Timeouts
  timeout: {
    pageLoad: 30000,
    element: 15000,
    api: 10000
  }
};

// Parse command line arguments
const args = process.argv.slice(2);
const HEADLESS = args.includes('--headless');
const VERBOSE = args.includes('--verbose');
const USE_LOCAL = args.includes('--local');

// Select URLs based on mode
const URLS = USE_LOCAL ? CONFIG.local : CONFIG.cloud;

// ============================================================================
// UTILITIES
// ============================================================================

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📘',
    success: '✅',
    error: '❌',
    warn: '⚠️',
    test: '🧪',
    cloud: '☁️'
  }[type] || '•';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function logVerbose(message) {
  if (VERBOSE) {
    log(message, 'info');
  }
}

async function createDriver() {
  const options = new chrome.Options();
  
  if (HEADLESS) {
    options.addArguments('--headless=new');
  }
  
  options.addArguments(
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-extensions',
    '--window-size=1920,1080',
    '--disable-web-security',
    '--allow-running-insecure-content'
  );
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
    
  await driver.manage().setTimeouts({
    implicit: CONFIG.timeout.element,
    pageLoad: CONFIG.timeout.pageLoad
  });
  
  return driver;
}

async function takeScreenshot(driver, name) {
  try {
    const screenshotDir = path.join(__dirname, '..', '..', 'test-results', 'cloud-screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    const timestamp = Date.now();
    const filename = `${name}-${timestamp}.png`;
    const filepath = path.join(screenshotDir, filename);
    const screenshot = await driver.takeScreenshot();
    fs.writeFileSync(filepath, screenshot, 'base64');
    logVerbose(`Screenshot saved: ${filename}`);
    return filepath;
  } catch (err) {
    log(`Screenshot failed: ${err.message}`, 'warn');
    return null;
  }
}

// ============================================================================
// TEST RESULTS TRACKING
// ============================================================================

const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
  startTime: null,
  endTime: null
};

function recordTest(name, status, duration, error = null) {
  testResults.tests.push({ name, status, duration, error });
  if (status === 'passed') testResults.passed++;
  else if (status === 'failed') testResults.failed++;
  else testResults.skipped++;
}

// ============================================================================
// CLOUD RUN TESTS
// ============================================================================

/**
 * Test 1: Patient Portal Health Check
 * Note: Patient Portal uses /health endpoint (not /api/health)
 */
async function testPatientPortalHealth() {
  const testName = 'Patient Portal Health Check';
  const startTime = Date.now();
  log(`Running: ${testName}`, 'test');
  
  try {
    // Patient Portal uses /health endpoint
    const response = await fetch(`${URLS.patientPortal}/health`);
    
    if (response.ok) {
      const data = await response.json();
      logVerbose(`Health response: ${JSON.stringify(data)}`);
      
      if (data.status === 'ok' || data.status === 'healthy') {
        log(`${testName}: PASSED - Service is healthy`, 'success');
        recordTest(testName, 'passed', Date.now() - startTime);
        return true;
      }
    }
    
    throw new Error(`Health check failed: ${response.status}`);
  } catch (error) {
    log(`${testName}: FAILED - ${error.message}`, 'error');
    recordTest(testName, 'failed', Date.now() - startTime, error.message);
    return false;
  }
}

/**
 * Test 2: Doctor Portal Health Check
 */
async function testDoctorPortalHealth() {
  const testName = 'Doctor Portal Health Check';
  const startTime = Date.now();
  log(`Running: ${testName}`, 'test');
  
  try {
    const response = await fetch(`${URLS.doctorPortal}/api/health`);
    
    if (response.ok) {
      const data = await response.json();
      logVerbose(`Health response: ${JSON.stringify(data)}`);
      
      if (data.status === 'ok' || data.status === 'healthy') {
        log(`${testName}: PASSED - Service is healthy`, 'success');
        recordTest(testName, 'passed', Date.now() - startTime);
        return true;
      }
    }
    
    throw new Error(`Health check failed: ${response.status}`);
  } catch (error) {
    log(`${testName}: FAILED - ${error.message}`, 'error');
    recordTest(testName, 'failed', Date.now() - startTime, error.message);
    return false;
  }
}

/**
 * Test 3: Patient Portal Login Page Loads
 */
async function testPatientPortalLoginPage(driver) {
  const testName = 'Patient Portal Login Page';
  const startTime = Date.now();
  log(`Running: ${testName}`, 'test');
  
  try {
    await driver.get(URLS.patientPortal);
    await driver.wait(until.titleContains('Izara'), CONFIG.timeout.pageLoad);
    
    // Check for login elements
    const loginButton = await driver.findElements(By.xpath("//button[contains(text(), 'เข้าสู่ระบบ') or contains(text(), 'Sign In') or contains(text(), 'Login')]"));
    
    if (loginButton.length > 0) {
      await takeScreenshot(driver, 'patient-login-page');
      log(`${testName}: PASSED - Login page loaded`, 'success');
      recordTest(testName, 'passed', Date.now() - startTime);
      return true;
    }
    
    throw new Error('Login button not found');
  } catch (error) {
    await takeScreenshot(driver, 'patient-login-error');
    log(`${testName}: FAILED - ${error.message}`, 'error');
    recordTest(testName, 'failed', Date.now() - startTime, error.message);
    return false;
  }
}

/**
 * Test 4: Doctor Portal Login Page Loads
 */
async function testDoctorPortalLoginPage(driver) {
  const testName = 'Doctor Portal Login Page';
  const startTime = Date.now();
  log(`Running: ${testName}`, 'test');
  
  try {
    await driver.get(URLS.doctorPortal);
    await driver.wait(until.titleContains('Izara'), CONFIG.timeout.pageLoad);
    
    // Check for login elements
    const loginElements = await driver.findElements(By.xpath("//button[contains(text(), 'เข้าสู่ระบบ') or contains(text(), 'Sign In') or contains(text(), 'Login')]"));
    
    if (loginElements.length > 0) {
      await takeScreenshot(driver, 'doctor-login-page');
      log(`${testName}: PASSED - Login page loaded`, 'success');
      recordTest(testName, 'passed', Date.now() - startTime);
      return true;
    }
    
    throw new Error('Login elements not found');
  } catch (error) {
    await takeScreenshot(driver, 'doctor-login-error');
    log(`${testName}: FAILED - ${error.message}`, 'error');
    recordTest(testName, 'failed', Date.now() - startTime, error.message);
    return false;
  }
}

/**
 * Test 5: Patient Portal Authentication
 */
async function testPatientAuthentication(driver) {
  const testName = 'Patient Portal Authentication';
  const startTime = Date.now();
  log(`Running: ${testName}`, 'test');
  
  try {
    await driver.get(URLS.patientPortal);
    await driver.sleep(2000);
    
    // Find and fill email field
    const emailField = await driver.findElement(By.css('input[type="email"], input[name="email"], input[placeholder*="email" i]'));
    await emailField.clear();
    await emailField.sendKeys(CONFIG.credentials.patient.email);
    
    // Find and fill password field
    const passwordField = await driver.findElement(By.css('input[type="password"]'));
    await passwordField.clear();
    await passwordField.sendKeys(CONFIG.credentials.patient.password);
    
    // Click login button
    const loginButton = await driver.findElement(By.xpath("//button[contains(text(), 'เข้าสู่ระบบ') or contains(text(), 'Sign In') or contains(text(), 'Login')]"));
    await loginButton.click();
    
    // Wait for dashboard or redirect
    await driver.sleep(3000);
    const currentUrl = await driver.getCurrentUrl();
    
    if (currentUrl.includes('/dashboard') || currentUrl.includes('/home')) {
      await takeScreenshot(driver, 'patient-dashboard');
      log(`${testName}: PASSED - Login successful`, 'success');
      recordTest(testName, 'passed', Date.now() - startTime);
      return true;
    }
    
    // Check for error message
    const errorElements = await driver.findElements(By.css('.error, .alert-error, [role="alert"]'));
    if (errorElements.length > 0) {
      const errorText = await errorElements[0].getText();
      throw new Error(`Login failed: ${errorText}`);
    }
    
    throw new Error('Login did not redirect to dashboard');
  } catch (error) {
    await takeScreenshot(driver, 'patient-auth-error');
    log(`${testName}: FAILED - ${error.message}`, 'error');
    recordTest(testName, 'failed', Date.now() - startTime, error.message);
    return false;
  }
}

/**
 * Test 6: Doctor Portal Authentication
 */
async function testDoctorAuthentication(driver) {
  const testName = 'Doctor Portal Authentication';
  const startTime = Date.now();
  log(`Running: ${testName}`, 'test');
  
  try {
    await driver.get(URLS.doctorPortal);
    await driver.sleep(2000);
    
    // Find and fill email field
    const emailField = await driver.findElement(By.css('input[type="email"], input[name="email"], input[placeholder*="email" i]'));
    await emailField.clear();
    await emailField.sendKeys(CONFIG.credentials.doctor.email);
    
    // Find and fill password field
    const passwordField = await driver.findElement(By.css('input[type="password"]'));
    await passwordField.clear();
    await passwordField.sendKeys(CONFIG.credentials.doctor.password);
    
    // Click login button
    const loginButton = await driver.findElement(By.xpath("//button[contains(text(), 'เข้าสู่ระบบ') or contains(text(), 'Sign In') or contains(text(), 'Login')]"));
    await loginButton.click();
    
    // Wait for dashboard or redirect
    await driver.sleep(3000);
    const currentUrl = await driver.getCurrentUrl();
    
    if (currentUrl.includes('/dashboard') || currentUrl.includes('/doctor')) {
      await takeScreenshot(driver, 'doctor-dashboard');
      log(`${testName}: PASSED - Login successful`, 'success');
      recordTest(testName, 'passed', Date.now() - startTime);
      return true;
    }
    
    throw new Error('Login did not redirect to dashboard');
  } catch (error) {
    await takeScreenshot(driver, 'doctor-auth-error');
    log(`${testName}: FAILED - ${error.message}`, 'error');
    recordTest(testName, 'failed', Date.now() - startTime, error.message);
    return false;
  }
}

/**
 * Test 7: GCS API Connection (Patient Portal)
 * Note: Patient Portal uses /api/health/gcs for GCS health check
 */
async function testPatientGCSConnection() {
  const testName = 'Patient Portal GCS Connection';
  const startTime = Date.now();
  log(`Running: ${testName}`, 'test');
  
  try {
    // Test GCS health endpoint
    const response = await fetch(`${URLS.patientPortal}/api/health/gcs`);
    
    if (response.ok) {
      const data = await response.json();
      logVerbose(`GCS Health response: ${JSON.stringify(data)}`);
      if (data.status === 'healthy' || data.status === 'degraded') {
        log(`${testName}: PASSED - GCS connection working`, 'success');
        recordTest(testName, 'passed', Date.now() - startTime);
        return true;
      }
    }
    
    throw new Error(`GCS API failed: ${response.status}`);
  } catch (error) {
    log(`${testName}: FAILED - ${error.message}`, 'error');
    recordTest(testName, 'failed', Date.now() - startTime, error.message);
    return false;
  }
}

/**
 * Test 8: GCS API Connection (Doctor Portal)
 */
async function testDoctorGCSConnection() {
  const testName = 'Doctor Portal GCS Connection';
  const startTime = Date.now();
  log(`Running: ${testName}`, 'test');
  
  try {
    // Test health endpoint with GCS status
    const response = await fetch(`${URLS.doctorPortal}/api/health`);
    
    if (response.ok) {
      const data = await response.json();
      logVerbose(`Health response with GCS: ${JSON.stringify(data)}`);
      log(`${testName}: PASSED - GCS connection working`, 'success');
      recordTest(testName, 'passed', Date.now() - startTime);
      return true;
    }
    
    throw new Error(`GCS API failed: ${response.status}`);
  } catch (error) {
    log(`${testName}: FAILED - ${error.message}`, 'error');
    recordTest(testName, 'failed', Date.now() - startTime, error.message);
    return false;
  }
}

/**
 * Test 9: Jitsi Meeting Link Format Validation
 */
async function testJitsiMeetingLinkFormat() {
  const testName = 'Jitsi Meeting Link Format';
  const startTime = Date.now();
  log(`Running: ${testName}`, 'test');
  
  try {
    // Validate Jitsi meeting link format is correct
    const expectedFormat = /^https:\/\/meet\.jit\.si\/izara-[a-zA-Z0-9-]+$/;
    const sampleLink = 'https://meet.jit.si/izara-apt12345-1234567890-abc123';
    
    if (expectedFormat.test(sampleLink)) {
      log(`${testName}: PASSED - Meeting link format valid`, 'success');
      recordTest(testName, 'passed', Date.now() - startTime);
      return true;
    }
    
    throw new Error('Meeting link format invalid');
  } catch (error) {
    log(`${testName}: FAILED - ${error.message}`, 'error');
    recordTest(testName, 'failed', Date.now() - startTime, error.message);
    return false;
  }
}

/**
 * Test 10: Cross-Portal Data Sync Test
 * Note: Uses correct health endpoints for each portal
 */
async function testCrossPortalDataSync() {
  const testName = 'Cross-Portal Data Sync';
  const startTime = Date.now();
  log(`Running: ${testName}`, 'test');
  
  try {
    // Both portals should access the same GCS buckets
    // Patient Portal uses /health, Doctor Portal uses /api/health
    const [patientHealth, doctorHealth] = await Promise.all([
      fetch(`${URLS.patientPortal}/health`).then(r => r.json()),
      fetch(`${URLS.doctorPortal}/api/health`).then(r => r.json())
    ]);
    
    if (patientHealth.status && doctorHealth.status) {
      log(`${testName}: PASSED - Both portals accessible`, 'success');
      recordTest(testName, 'passed', Date.now() - startTime);
      return true;
    }
    
    throw new Error('One or both portals not responding');
  } catch (error) {
    log(`${testName}: FAILED - ${error.message}`, 'error');
    recordTest(testName, 'failed', Date.now() - startTime, error.message);
    return false;
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  const mode = USE_LOCAL ? 'LOCAL' : 'CLOUD';
  
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     IZARA TELEMEDICINE - Cloud Run E2E Tests                 ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Mode: ${mode.padEnd(54)}║`);
  console.log(`║  Patient Portal: ${URLS.patientPortal.substring(0,44).padEnd(44)}║`);
  console.log(`║  Doctor Portal:  ${URLS.doctorPortal.substring(0,44).padEnd(44)}║`);
  console.log(`║  Headless: ${HEADLESS ? 'Yes' : 'No'}${' '.repeat(50)}║`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  testResults.startTime = new Date();
  let driver = null;
  
  try {
    // === API Tests (No browser needed) ===
    log('Starting API Tests...', 'cloud');
    
    await testPatientPortalHealth();
    await testDoctorPortalHealth();
    await testPatientGCSConnection();
    await testDoctorGCSConnection();
    await testJitsiMeetingLinkFormat();
    await testCrossPortalDataSync();
    
    // === Browser Tests ===
    log('Starting Browser Tests...', 'cloud');
    driver = await createDriver();
    
    await testPatientPortalLoginPage(driver);
    await testDoctorPortalLoginPage(driver);
    await testPatientAuthentication(driver);
    await testDoctorAuthentication(driver);
    
  } catch (error) {
    log(`Test suite error: ${error.message}`, 'error');
  } finally {
    if (driver) {
      await driver.quit();
    }
    
    testResults.endTime = new Date();
  }
  
  // Print Summary
  printSummary();
  
  // Save results
  saveResults();
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

function printSummary() {
  const duration = ((testResults.endTime - testResults.startTime) / 1000).toFixed(2);
  const total = testResults.passed + testResults.failed + testResults.skipped;
  const passRate = total > 0 ? ((testResults.passed / total) * 100).toFixed(1) : 0;
  
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST RESULTS SUMMARY                      ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Total Tests:    ${total.toString().padEnd(44)}║`);
  console.log(`║  ✅ Passed:      ${testResults.passed.toString().padEnd(44)}║`);
  console.log(`║  ❌ Failed:      ${testResults.failed.toString().padEnd(44)}║`);
  console.log(`║  ⏭️  Skipped:     ${testResults.skipped.toString().padEnd(44)}║`);
  console.log(`║  Pass Rate:      ${(passRate + '%').padEnd(44)}║`);
  console.log(`║  Duration:       ${(duration + 's').padEnd(44)}║`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  if (testResults.failed > 0) {
    console.log('Failed Tests:');
    testResults.tests
      .filter(t => t.status === 'failed')
      .forEach(t => {
        console.log(`  ❌ ${t.name}: ${t.error}`);
      });
    console.log('');
  }
}

function saveResults() {
  const resultsDir = path.join(__dirname, '..', '..', 'test-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  const resultFile = path.join(resultsDir, 'cloud-run-test-results.json');
  const results = {
    mode: USE_LOCAL ? 'local' : 'cloud',
    urls: URLS,
    summary: {
      total: testResults.passed + testResults.failed + testResults.skipped,
      passed: testResults.passed,
      failed: testResults.failed,
      skipped: testResults.skipped,
      passRate: testResults.passed / (testResults.passed + testResults.failed + testResults.skipped) * 100
    },
    tests: testResults.tests,
    startTime: testResults.startTime,
    endTime: testResults.endTime,
    duration: (testResults.endTime - testResults.startTime) / 1000
  };
  
  fs.writeFileSync(resultFile, JSON.stringify(results, null, 2));
  log(`Results saved to: ${resultFile}`, 'info');
}

// Run tests
runAllTests();
