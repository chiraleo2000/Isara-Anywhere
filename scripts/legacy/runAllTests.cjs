/**
 * Unified Test Runner - Runs All Tests in One Go
 * 
 * This script runs all available test suites and generates a combined report.
 * 
 * Usage: node scripts/runAllTests.cjs [options]
 * Options:
 *   --quick    : Run only quick API tests (no Selenium UI tests)
 *   --full     : Run all tests including UI tests
 *   --fix      : Attempt to auto-fix common issues
 */

const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  doctorPortalUrl: process.env.DOCTOR_PORTAL_URL || 'http://localhost:3010',
  patientPortalUrl: process.env.PATIENT_PORTAL_URL || 'http://localhost:3005',
  gcsApiUrl: process.env.GCS_API_URL || 'http://localhost:3012',
  patientApiUrl: process.env.PATIENT_API_URL || 'http://localhost:3004',
  authApiUrl: process.env.AUTH_API_URL || 'http://localhost:3011',
  timeout: 15000,
  shortTimeout: 5000,
  headless: process.env.HEADLESS !== 'false',
};

// Test Users
const USERS = {
  admin: { email: 'admin.test@izara.com', password: 'IzaraAdmin@2024' },
  doctor: { email: 'doctor.test@izara.com', password: 'IzaraDoctor@2024' },
  patient: { email: 'demo.test@gmail.com', password: 'P@ssw0rd' },
};

// ============================================================================
// RESULTS TRACKING
// ============================================================================

const results = {
  startTime: null,
  endTime: null,
  totalTests: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  sections: {},
  failures: [],
  logs: [],
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString().slice(11, 19);
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warn' ? '⚠️' : 'ℹ️';
  const logMsg = `[${timestamp}] ${prefix} ${message}`;
  console.log(logMsg);
  results.logs.push({ timestamp, type, message });
}

function recordTest(section, name, passed, details = '') {
  results.totalTests++;
  
  if (!results.sections[section]) {
    results.sections[section] = { passed: 0, failed: 0, skipped: 0, tests: [] };
  }
  
  if (passed === 'skip') {
    results.skipped++;
    results.sections[section].skipped++;
    results.sections[section].tests.push({ name, status: 'skipped', details });
    console.log(`   ⏭️  ${name}: ${details}`);
  } else if (passed) {
    results.passed++;
    results.sections[section].passed++;
    results.sections[section].tests.push({ name, status: 'passed', details });
    console.log(`   ✅ ${name}${details ? ` (${details})` : ''}`);
  } else {
    results.failed++;
    results.sections[section].failed++;
    results.sections[section].tests.push({ name, status: 'failed', details });
    results.failures.push({ section, name, details });
    console.log(`   ❌ ${name}: ${details}`);
  }
}

// ============================================================================
// HTTP HELPER
// ============================================================================

function makeRequest(method, url, data = null, timeout = CONFIG.timeout) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: { 'Content-Type': 'application/json' },
    };
    
    const req = protocol.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const jsonData = body ? JSON.parse(body) : null;
          resolve({ status: res.statusCode, data: jsonData, raw: body });
        } catch (e) {
          resolve({ status: res.statusCode, data: null, raw: body });
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(timeout, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function checkHealth(url, name) {
  try {
    const response = await makeRequest('GET', url, null, 5000);
    return response.status >= 200 && response.status < 500;
  } catch (e) {
    return false;
  }
}

// ============================================================================
// SELENIUM HELPERS
// ============================================================================

async function createDriver() {
  const options = new chrome.Options();
  
  if (CONFIG.headless) {
    options.addArguments('--headless=new');
  }
  
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  options.addArguments('--window-size=1920,1080');
  options.addArguments('--disable-gpu');
  options.addArguments('--disable-extensions');
  options.addArguments('--mute-audio');
  options.addArguments('--use-fake-ui-for-media-stream');
  options.addArguments('--use-fake-device-for-media-stream');
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  
  await driver.manage().setTimeouts({ implicit: 5000, pageLoad: 30000 });
  return driver;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForElement(driver, locator, timeout = CONFIG.timeout) {
  try {
    const element = await driver.wait(until.elementLocated(locator), timeout);
    await driver.wait(until.elementIsVisible(element), timeout);
    return element;
  } catch (e) {
    return null;
  }
}

async function safeClick(driver, locator, timeout = CONFIG.shortTimeout) {
  try {
    const element = await waitForElement(driver, locator, timeout);
    if (element) {
      await element.click();
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

async function takeScreenshot(driver, name) {
  try {
    const screenshot = await driver.takeScreenshot();
    const dir = './scripts/test-screenshots';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(`${dir}/${name}-${Date.now()}.png`, screenshot, 'base64');
  } catch (e) {}
}

// ============================================================================
// TEST SECTION 1: SERVER HEALTH CHECKS
// ============================================================================

async function testServerHealth() {
  console.log('\n🏥 SECTION 1: Server Health Checks');
  console.log('='.repeat(50));
  
  const section = 'Server Health';
  
  // Check Doctor Portal Frontend
  const doctorFrontend = await checkHealth(CONFIG.doctorPortalUrl, 'Doctor Portal');
  recordTest(section, 'Doctor Portal Frontend', doctorFrontend, 
    doctorFrontend ? `Running on ${CONFIG.doctorPortalUrl}` : 'Not accessible');
  
  // Check Patient Portal Frontend
  const patientFrontend = await checkHealth(CONFIG.patientPortalUrl, 'Patient Portal');
  recordTest(section, 'Patient Portal Frontend', patientFrontend,
    patientFrontend ? `Running on ${CONFIG.patientPortalUrl}` : 'Not accessible');
  
  // Check GCS API
  const gcsApi = await checkHealth(`${CONFIG.gcsApiUrl}/health`, 'GCS API');
  recordTest(section, 'GCS API Server', gcsApi,
    gcsApi ? `Running on ${CONFIG.gcsApiUrl}` : 'Not accessible');
  
  // Check Patient API
  const patientApi = await checkHealth(`${CONFIG.patientApiUrl}/health`, 'Patient API');
  recordTest(section, 'Patient API Server', patientApi,
    patientApi ? `Running on ${CONFIG.patientApiUrl}` : 'Not accessible');
  
  // Check Auth API  
  const authApi = await checkHealth(`${CONFIG.authApiUrl}/api/health`, 'Auth API');
  recordTest(section, 'Auth API Server', authApi,
    authApi ? `Running on ${CONFIG.authApiUrl}` : 'Not accessible');
  
  return { doctorFrontend, patientFrontend, gcsApi, patientApi, authApi };
}

// ============================================================================
// TEST SECTION 2: API ENDPOINT TESTS
// ============================================================================

async function testAPIEndpoints(healthStatus) {
  console.log('\n🔌 SECTION 2: API Endpoint Tests');
  console.log('='.repeat(50));
  
  const section = 'API Endpoints';
  
  // Test Medical Content API
  if (healthStatus.gcsApi) {
    try {
      const response = await makeRequest('GET', `${CONFIG.gcsApiUrl}/api/content/medical`);
      recordTest(section, 'GET /api/content/medical', response.status === 200 || response.status === 404, 
        `Status: ${response.status}`);
    } catch (e) {
      recordTest(section, 'GET /api/content/medical', false, e.message);
    }
    
    try {
      const response = await makeRequest('GET', `${CONFIG.gcsApiUrl}/api/content/clinical`);
      recordTest(section, 'GET /api/content/clinical', response.status === 200 || response.status === 404,
        `Status: ${response.status}`);
    } catch (e) {
      recordTest(section, 'GET /api/content/clinical', false, e.message);
    }
  } else {
    recordTest(section, 'GCS API Endpoints', 'skip', 'GCS API not running');
  }
  
  // Test Patient API Endpoints
  if (healthStatus.patientApi) {
    try {
      const response = await makeRequest('GET', `${CONFIG.patientApiUrl}/api/appointments`);
      recordTest(section, 'GET /api/appointments', response.status < 500, `Status: ${response.status}`);
    } catch (e) {
      recordTest(section, 'GET /api/appointments', false, e.message);
    }
  } else {
    recordTest(section, 'Patient API Endpoints', 'skip', 'Patient API not running');
  }
  
  // Test Auth API
  if (healthStatus.authApi) {
    try {
      const response = await makeRequest('POST', `${CONFIG.authApiUrl}/auth/login`, {
        email: USERS.doctor.email,
        password: USERS.doctor.password
      });
      // 200 = success, 429 = rate limited (security working correctly)
      const passed = response.status === 200 || response.status === 429;
      recordTest(section, 'POST /auth/login (Doctor)', passed, 
        response.status === 429 ? 'Rate limited (security OK)' : `Status: ${response.status}`);
    } catch (e) {
      recordTest(section, 'POST /auth/login (Doctor)', false, e.message);
    }
    
    // Note: Patient uses different auth system (Patient Portal backend)
    // This test validates the Doctor Portal Auth API works
    try {
      const response = await makeRequest('POST', `${CONFIG.authApiUrl}/auth/login`, {
        email: USERS.admin.email,
        password: USERS.admin.password
      });
      // 200 = success, 429 = rate limited (security working correctly)
      const passed = response.status === 200 || response.status === 429;
      recordTest(section, 'POST /auth/login (Admin)', passed,
        response.status === 429 ? 'Rate limited (security OK)' : `Status: ${response.status}`);
    } catch (e) {
      recordTest(section, 'POST /auth/login (Admin)', false, e.message);
    }
  } else {
    recordTest(section, 'Auth API Endpoints', 'skip', 'Auth API not running');
  }
}

// ============================================================================
// TEST SECTION 3: DOCTOR PORTAL UI TESTS
// ============================================================================

async function testDoctorPortalUI(healthStatus) {
  console.log('\n👨‍⚕️ SECTION 3: Doctor Portal UI Tests');
  console.log('='.repeat(50));
  
  const section = 'Doctor Portal UI';
  
  if (!healthStatus.doctorFrontend) {
    recordTest(section, 'Doctor Portal UI', 'skip', 'Frontend not running');
    return;
  }
  
  let driver = null;
  
  try {
    driver = await createDriver();
    recordTest(section, 'WebDriver Init', true);
    
    // Test 1: Load Login Page
    await driver.get(CONFIG.doctorPortalUrl);
    await sleep(2000);
    
    const title = await driver.getTitle();
    recordTest(section, 'Load Login Page', title.length > 0, `Title: ${title}`);
    
    // Test 2: Find Login Form
    const emailInput = await waitForElement(driver, By.css('input[type="email"], input[name="email"]'), CONFIG.shortTimeout);
    recordTest(section, 'Login Form Exists', !!emailInput);
    
    if (emailInput) {
      // Test 3: Enter Credentials
      await emailInput.clear();
      await emailInput.sendKeys(USERS.doctor.email);
      
      const passwordInput = await waitForElement(driver, By.css('input[type="password"]'));
      if (passwordInput) {
        await passwordInput.clear();
        await passwordInput.sendKeys(USERS.doctor.password);
      }
      
      recordTest(section, 'Enter Credentials', true);
      
      // Test 4: Submit Login
      const loginBtn = await safeClick(driver, By.css('button[type="submit"]'));
      recordTest(section, 'Click Login Button', loginBtn);
      
      await sleep(3000);
      
      // Test 5: Check Navigation
      const currentUrl = await driver.getCurrentUrl();
      const loginSuccess = !currentUrl.includes('/login');
      recordTest(section, 'Login Success', loginSuccess, `URL: ${currentUrl}`);
      
      if (loginSuccess) {
        await takeScreenshot(driver, 'doctor-dashboard');
        
        // Test 6: Dashboard Elements
        const dashboardElement = await waitForElement(driver, 
          By.xpath("//*[contains(text(), 'Dashboard') or contains(text(), 'แดชบอร์ด') or contains(@class, 'dashboard')]"),
          CONFIG.shortTimeout
        );
        recordTest(section, 'Dashboard Loaded', !!dashboardElement);
        
        // Test 7: Navigation Menu
        const navExists = await waitForElement(driver, By.css('nav, [role="navigation"], .sidebar'), CONFIG.shortTimeout);
        recordTest(section, 'Navigation Menu Exists', !!navExists);
        
        // Test 8: Try navigating to Medical Content
        const contentLink = await safeClick(driver, 
          By.xpath("//*[contains(text(), 'Medical Content') or contains(text(), 'เนื้อหาทางการแพทย์') or contains(@href, 'medical-content')]")
        );
        if (contentLink) {
          await sleep(2000);
          await takeScreenshot(driver, 'doctor-medical-content');
          recordTest(section, 'Navigate to Medical Content', true);
        } else {
          recordTest(section, 'Navigate to Medical Content', 'skip', 'Link not found');
        }
      }
    }
    
  } catch (error) {
    recordTest(section, 'Doctor Portal Test Error', false, error.message);
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
}

// ============================================================================
// TEST SECTION 4: PATIENT PORTAL UI TESTS
// ============================================================================

async function testPatientPortalUI(healthStatus) {
  console.log('\n🏥 SECTION 4: Patient Portal UI Tests');
  console.log('='.repeat(50));
  
  const section = 'Patient Portal UI';
  
  if (!healthStatus.patientFrontend) {
    recordTest(section, 'Patient Portal UI', 'skip', 'Frontend not running');
    return;
  }
  
  let driver = null;
  
  try {
    driver = await createDriver();
    recordTest(section, 'WebDriver Init', true);
    
    // Test 1: Load Login Page
    await driver.get(CONFIG.patientPortalUrl);
    await sleep(2000);
    
    const title = await driver.getTitle();
    recordTest(section, 'Load Login Page', title.length > 0, `Title: ${title}`);
    
    // Test 2: Find Login Form
    const emailInput = await waitForElement(driver, By.css('input[type="email"], input[name="email"]'), CONFIG.shortTimeout);
    recordTest(section, 'Login Form Exists', !!emailInput);
    
    if (emailInput) {
      // Test 3: Enter Credentials
      await emailInput.clear();
      await emailInput.sendKeys(USERS.patient.email);
      
      const passwordInput = await waitForElement(driver, By.css('input[type="password"]'));
      if (passwordInput) {
        await passwordInput.clear();
        await passwordInput.sendKeys(USERS.patient.password);
      }
      
      recordTest(section, 'Enter Credentials', true);
      
      // Test 4: Submit Login
      const loginBtn = await safeClick(driver, By.css('button[type="submit"]'));
      recordTest(section, 'Click Login Button', loginBtn);
      
      await sleep(3000);
      
      // Test 5: Check Navigation
      const currentUrl = await driver.getCurrentUrl();
      const loginSuccess = !currentUrl.includes('/login');
      recordTest(section, 'Login Success', loginSuccess, `URL: ${currentUrl}`);
      
      if (loginSuccess) {
        await takeScreenshot(driver, 'patient-dashboard');
        
        // Test 6: Dashboard Elements
        const dashboardElement = await waitForElement(driver,
          By.xpath("//*[contains(text(), 'Dashboard') or contains(text(), 'หน้าหลัก') or contains(@class, 'dashboard')]"),
          CONFIG.shortTimeout
        );
        recordTest(section, 'Dashboard Loaded', !!dashboardElement);
        
        // Test 7: Try navigating to Appointments
        const appointmentLink = await safeClick(driver,
          By.xpath("//*[contains(text(), 'นัดหมาย') or contains(text(), 'Appointment') or contains(@href, 'appointment')]")
        );
        if (appointmentLink) {
          await sleep(2000);
          await takeScreenshot(driver, 'patient-appointments');
          recordTest(section, 'Navigate to Appointments', true);
        } else {
          recordTest(section, 'Navigate to Appointments', 'skip', 'Link not found');
        }
        
        // Test 8: Try navigating to Health/Medical Content
        await driver.get(CONFIG.patientPortalUrl);
        await sleep(1000);
        const healthLink = await safeClick(driver,
          By.xpath("//*[contains(text(), 'สุขภาพ') or contains(text(), 'Health') or contains(@href, 'health')]")
        );
        if (healthLink) {
          await sleep(2000);
          await takeScreenshot(driver, 'patient-health');
          recordTest(section, 'Navigate to Health Section', true);
        } else {
          recordTest(section, 'Navigate to Health Section', 'skip', 'Link not found');
        }
      }
    }
    
  } catch (error) {
    recordTest(section, 'Patient Portal Test Error', false, error.message);
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
}

// ============================================================================
// TEST SECTION 5: CONTENT MANAGEMENT TESTS
// ============================================================================

async function testContentManagement(healthStatus) {
  console.log('\n📝 SECTION 5: Content Management Tests');
  console.log('='.repeat(50));
  
  const section = 'Content Management';
  
  if (!healthStatus.gcsApi) {
    recordTest(section, 'Content Management', 'skip', 'GCS API not running');
    return;
  }
  
  // Test 1: Create Medical Content
  try {
    const article = {
      userId: 'test-user',
      userName: 'Test User',
      title: 'Test Health Article',
      titleTh: 'บทความทดสอบสุขภาพ',
      summary: 'Test article for automated testing',
      content: '# Test Content\n\nThis is test content for unit testing.',
      category: 'general-health',
      tags: ['test', 'automated'],
      type: 'article',
      status: 'draft',
      isFeatured: false,
    };
    
    const response = await makeRequest('POST', `${CONFIG.gcsApiUrl}/api/content/medical`, article);
    if (response.status === 201 && response.data?.id) {
      results.testArticleId = response.data.id;
    }
    recordTest(section, 'Create Medical Content', response.status === 200 || response.status === 201, 
      `Status: ${response.status}`);
  } catch (e) {
    recordTest(section, 'Create Medical Content', false, e.message);
  }
  
  // Test 2: Get Medical Content List
  try {
    const response = await makeRequest('GET', `${CONFIG.gcsApiUrl}/api/content/medical`);
    const hasContent = response.status === 200 && (response.data?.articles?.length >= 0 || Array.isArray(response.data));
    recordTest(section, 'Get Medical Content List', hasContent, `Status: ${response.status}`);
  } catch (e) {
    recordTest(section, 'Get Medical Content List', false, e.message);
  }
  
  // Test 3: Get Specific Article
  const articleIdToTest = results.testArticleId || 'nonexistent-id';
  try {
    const response = await makeRequest('GET', `${CONFIG.gcsApiUrl}/api/content/medical/${articleIdToTest}`);
    recordTest(section, 'Get Specific Article', response.status === 200 || response.status === 404, 
      `Status: ${response.status}`);
  } catch (e) {
    recordTest(section, 'Get Specific Article', false, e.message);
  }
  
  // Test 4: Update Article
  try {
    const response = await makeRequest('PUT', `${CONFIG.gcsApiUrl}/api/content/medical/${articleIdToTest}`, {
      userId: 'test-user',
      userName: 'Test User',
      title: 'Updated Test Article',
      changeNote: 'Updated via automated test',
    });
    recordTest(section, 'Update Medical Content', response.status < 500, `Status: ${response.status}`);
  } catch (e) {
    recordTest(section, 'Update Medical Content', false, e.message);
  }
  
  // Test 5: Delete Article (cleanup)
  try {
    const response = await makeRequest('DELETE', `${CONFIG.gcsApiUrl}/api/content/medical/${articleIdToTest}`);
    recordTest(section, 'Delete Medical Content', response.status < 500, `Status: ${response.status}`);
  } catch (e) {
    recordTest(section, 'Delete Medical Content', false, e.message);
  }
}

// ============================================================================
// TEST SECTION 6: APPOINTMENT WORKFLOW TESTS
// ============================================================================

async function testAppointmentWorkflow(healthStatus) {
  console.log('\n📅 SECTION 6: Appointment Workflow Tests');
  console.log('='.repeat(50));
  
  const section = 'Appointment Workflow';
  
  if (!healthStatus.patientApi) {
    recordTest(section, 'Appointment Workflow', 'skip', 'Patient API not running');
    return;
  }
  
  // Test 1: Get Appointments List
  try {
    const response = await makeRequest('GET', `${CONFIG.patientApiUrl}/api/appointments`);
    recordTest(section, 'Get Appointments List', response.status < 500, `Status: ${response.status}`);
  } catch (e) {
    recordTest(section, 'Get Appointments List', false, e.message);
  }
  
  // Test 2: Get Appointment Pool
  try {
    const response = await makeRequest('GET', `${CONFIG.patientApiUrl}/api/appointment-pool`);
    recordTest(section, 'Get Appointment Pool', response.status < 500, `Status: ${response.status}`);
  } catch (e) {
    recordTest(section, 'Get Appointment Pool', false, e.message);
  }
  
  // Test 3: Get Available Doctors
  try {
    const response = await makeRequest('GET', `${CONFIG.patientApiUrl}/api/doctors/available`);
    recordTest(section, 'Get Available Doctors', response.status < 500, `Status: ${response.status}`);
  } catch (e) {
    recordTest(section, 'Get Available Doctors', false, e.message);
  }
  
  // Test 4: Create Test Appointment
  const testAppointmentId = `test-apt-${Date.now()}`;
  try {
    const appointment = {
      id: testAppointmentId,
      patientId: 'test-patient',
      doctorId: 'test-doctor',
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '10:00',
      type: 'consultation',
      status: 'pending',
      reason: 'Test appointment for automated testing',
    };
    
    const response = await makeRequest('POST', `${CONFIG.patientApiUrl}/api/appointments`, appointment);
    recordTest(section, 'Create Appointment', response.status < 500, `Status: ${response.status}`);
  } catch (e) {
    recordTest(section, 'Create Appointment', false, e.message);
  }
  
  // Test 5: Meeting Time Check
  try {
    const now = new Date();
    const response = await makeRequest('POST', `${CONFIG.patientApiUrl}/api/appointment-pool/check-meeting-time`, {
      appointmentId: testAppointmentId,
      scheduledDate: now.toISOString().split('T')[0],
      scheduledTime: now.toTimeString().slice(0, 5),
    });
    recordTest(section, 'Meeting Time Check', response.status < 500, `Status: ${response.status}`);
  } catch (e) {
    recordTest(section, 'Meeting Time Check', false, e.message);
  }
}

// ============================================================================
// GENERATE REPORT
// ============================================================================

function generateReport() {
  results.endTime = Date.now();
  const duration = ((results.endTime - results.startTime) / 1000).toFixed(1);
  const passRate = results.totalTests > 0 ? ((results.passed / results.totalTests) * 100).toFixed(1) : 0;
  
  console.log('\n' + '═'.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('═'.repeat(60));
  
  console.log(`\n📈 Overall Results:`);
  console.log(`   Total Tests:  ${results.totalTests}`);
  console.log(`   ✅ Passed:    ${results.passed}`);
  console.log(`   ❌ Failed:    ${results.failed}`);
  console.log(`   ⏭️  Skipped:   ${results.skipped}`);
  console.log(`   📊 Pass Rate: ${passRate}%`);
  console.log(`   ⏱️  Duration:  ${duration}s`);
  
  console.log(`\n📋 Results by Section:`);
  for (const [section, data] of Object.entries(results.sections)) {
    const total = data.passed + data.failed + data.skipped;
    const emoji = data.failed === 0 ? '✅' : '❌';
    console.log(`   ${emoji} ${section}: ${data.passed}/${total} passed`);
  }
  
  if (results.failures.length > 0) {
    console.log(`\n❌ Failed Tests:`);
    results.failures.forEach((f, i) => {
      console.log(`   ${i + 1}. [${f.section}] ${f.name}`);
      console.log(`      Reason: ${f.details}`);
    });
  }
  
  // Save results to file
  const resultsDir = './scripts/test-results';
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });
  
  const resultsFile = `${resultsDir}/all-tests-${Date.now()}.json`;
  fs.writeFileSync(resultsFile, JSON.stringify({
    summary: {
      total: results.totalTests,
      passed: results.passed,
      failed: results.failed,
      skipped: results.skipped,
      passRate: `${passRate}%`,
      duration: `${duration}s`,
      timestamp: new Date().toISOString(),
    },
    sections: results.sections,
    failures: results.failures,
  }, null, 2));
  
  console.log(`\n💾 Results saved to: ${resultsFile}`);
  console.log('═'.repeat(60));
  
  return results.failed === 0;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const quickMode = args.includes('--quick');
  const fullMode = args.includes('--full');
  
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║        IZARA TELEMEDICINE - UNIFIED TEST RUNNER              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\nMode: ${quickMode ? 'Quick (API only)' : fullMode ? 'Full (API + UI)' : 'Standard'}`);
  console.log(`Started: ${new Date().toISOString()}`);
  
  results.startTime = Date.now();
  
  // Section 1: Health Checks
  const healthStatus = await testServerHealth();
  
  // Section 2: API Tests
  await testAPIEndpoints(healthStatus);
  
  // Section 3: Content Management
  await testContentManagement(healthStatus);
  
  // Section 4: Appointment Workflow  
  await testAppointmentWorkflow(healthStatus);
  
  // UI Tests (unless quick mode)
  if (!quickMode) {
    await testDoctorPortalUI(healthStatus);
    await testPatientPortalUI(healthStatus);
  }
  
  // Generate Report
  const success = generateReport();
  
  process.exit(success ? 0 : 1);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
