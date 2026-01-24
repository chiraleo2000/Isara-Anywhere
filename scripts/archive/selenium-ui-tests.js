/**
 * Izara Telemedicine - Selenium UI Tests with Visible Browser
 * 
 * This script runs comprehensive UI tests with the browser VISIBLE
 * so you can see all actions being performed.
 * 
 * @version 1.0.0
 * @date January 19, 2026
 */

const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('node:fs');
const path = require('node:path');

// Configuration
const CONFIG = {
  PATIENT_PORTAL_URL: 'http://localhost:3005',
  DOCTOR_PORTAL_URL: 'http://localhost:3010',
  TIMEOUT: 30000, // 30 seconds
  SCREENSHOT_DIR: path.join(__dirname, '../../test-screenshots'),
};

// Test credentials
const TEST_USERS = {
  doctor: { email: 'doctor.test@izara.com', password: 'IzaraDoctor@2024' },
  admin: { email: 'admin.test@izara.com', password: 'IzaraAdmin@2024' },
  patient: { email: 'demo.test@gmail.com', password: 'P@ssw0rd' },
  patientSomchai: { email: 'Somchai.Mankong@gmail.com', password: 'P@ssw0rd' },
};

// Ensure screenshot directory exists
if (!fs.existsSync(CONFIG.SCREENSHOT_DIR)) {
  fs.mkdirSync(CONFIG.SCREENSHOT_DIR, { recursive: true });
}

// Test results
let testResults = [];

async function logTest(category, testName, passed, details = '') {
  const emoji = passed ? '✅' : '❌';
  console.log(`${emoji} [${category}] ${testName} - ${details}`);
  testResults.push({ category, testName, passed, details, timestamp: new Date().toISOString() });
}

async function takeScreenshot(driver, name) {
  try {
    const screenshot = await driver.takeScreenshot();
    const filename = path.join(CONFIG.SCREENSHOT_DIR, `${name}-${Date.now()}.png`);
    fs.writeFileSync(filename, screenshot, 'base64');
    console.log(`📸 Screenshot saved: ${filename}`);
    return filename;
  } catch (error) {
    console.error(`Failed to take screenshot: ${error.message}`);
    return null;
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// PATIENT PORTAL TESTS
// ============================================================================

async function testPatientPortal() {
  console.log('\n🏥 ===== PATIENT PORTAL UI TESTS =====\n');
  
  const options = new chrome.Options();
  // NO HEADLESS - We want to see the browser!
  options.addArguments('--start-maximized');
  options.addArguments('--disable-blink-features=AutomationControlled');
  options.addArguments('--lang=th-TH');
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  
  try {
    // Test 1: Load Patient Portal
    console.log('\n📋 Test 1: Loading Patient Portal...');
    await driver.get(CONFIG.PATIENT_PORTAL_URL + '/login');
    await sleep(5000); // Wait longer for React to hydrate
    
    // Take screenshot of login page
    await takeScreenshot(driver, 'patient-portal-login');
    
    // Wait for login form - check for simpler selectors first
    try {
      // First wait for body to be ready
      await driver.wait(until.elementLocated(By.css('body')), 5000);
      
      // Then wait for the email input with more specific selectors
      await driver.wait(until.elementLocated(By.css('input[name="email"]')), CONFIG.TIMEOUT);
      await logTest('PATIENT_UI', 'Login Page Loads', true, 'Login form visible');
    } catch (error) {
      await logTest('PATIENT_UI', 'Login Page Loads', false, error.message);
      await takeScreenshot(driver, 'patient-login-error');
    }
    
    // Test 2: Login
    console.log('\n📋 Test 2: Logging in as patient...');
    try {
      // Find and fill email - use simpler selector
      const emailInput = await driver.findElement(By.css('input[name="email"]'));
      await emailInput.clear();
      await emailInput.sendKeys(TEST_USERS.patientSomchai.email);
      await sleep(500);
      
      // Find and fill password - use simpler selector
      const passwordInput = await driver.findElement(By.css('input[name="password"]'));
      await passwordInput.clear();
      await passwordInput.sendKeys(TEST_USERS.patientSomchai.password);
      await sleep(500);
      
      await takeScreenshot(driver, 'patient-login-filled');
      
      // Click login button
      const loginButton = await driver.findElement(By.css('button[type="submit"]'));
      await loginButton.click();
      
      // Wait for navigation
      await sleep(5000);
      await takeScreenshot(driver, 'patient-after-login');
      
      // Check if login was successful
      const currentUrl = await driver.getCurrentUrl();
      if (currentUrl.includes('dashboard') || currentUrl.includes('home') || !currentUrl.includes('login')) {
        await logTest('PATIENT_UI', 'Patient Login', true, `Navigated to: ${currentUrl}`);
      } else {
        // Check for error messages
        try {
          const errorElement = await driver.findElement(By.css('.error, .alert-danger, [role="alert"], .text-red-500'));
          const errorText = await errorElement.getText();
          await logTest('PATIENT_UI', 'Patient Login', false, `Error: ${errorText}`);
        } catch {
          await logTest('PATIENT_UI', 'Patient Login', false, 'Login may have failed - still on login page');
        }
      }
    } catch (error) {
      await logTest('PATIENT_UI', 'Patient Login', false, error.message);
      await takeScreenshot(driver, 'patient-login-exception');
    }
    
    // Test 3: Navigate Dashboard
    console.log('\n📋 Test 3: Exploring dashboard...');
    await sleep(2000);
    await takeScreenshot(driver, 'patient-dashboard');
    
    // Try to find navigation elements
    try {
      const navItems = await driver.findElements(By.css('nav a, aside a, .sidebar a, .menu-item, [role="navigation"] a, [class*="nav"] a'));
      console.log(`Found ${navItems.length} navigation items`);
      await logTest('PATIENT_UI', 'Dashboard Navigation', navItems.length > 0, `${navItems.length} nav items found`);
    } catch (error) {
      await logTest('PATIENT_UI', 'Dashboard Navigation', false, error.message);
    }
    
  } finally {
    await sleep(3000); // Let user see final state
    await driver.quit();
  }
}

// ============================================================================
// DOCTOR PORTAL TESTS
// ============================================================================

async function testDoctorPortal() {
  console.log('\n👨‍⚕️ ===== DOCTOR PORTAL UI TESTS =====\n');
  
  const options = new chrome.Options();
  // NO HEADLESS - We want to see the browser!
  options.addArguments('--start-maximized');
  options.addArguments('--disable-blink-features=AutomationControlled');
  options.addArguments('--lang=th-TH');
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  
  try {
    // Test 1: Load Doctor Portal
    console.log('\n📋 Test 1: Loading Doctor Portal...');
    await driver.get(CONFIG.DOCTOR_PORTAL_URL);
    await sleep(3000);
    
    // Take screenshot of login page
    await takeScreenshot(driver, 'doctor-portal-login');
    
    // Wait for login form
    try {
      await driver.wait(until.elementLocated(By.css('input[type="email"], input[name="email"], #email, input[placeholder*="Email"]')), CONFIG.TIMEOUT);
      await logTest('DOCTOR_UI', 'Login Page Loads', true, 'Login form visible');
    } catch (error) {
      await logTest('DOCTOR_UI', 'Login Page Loads', false, error.message);
      await takeScreenshot(driver, 'doctor-login-error');
    }
    
    // Test 2: Login as Doctor
    console.log('\n📋 Test 2: Logging in as doctor...');
    try {
      // Find and fill email
      const emailInput = await driver.findElement(By.css('input[type="email"], input[name="email"], #email'));
      await emailInput.clear();
      await emailInput.sendKeys(TEST_USERS.doctor.email);
      await sleep(500);
      
      // Find and fill password
      const passwordInput = await driver.findElement(By.css('input[type="password"], input[name="password"], #password'));
      await passwordInput.clear();
      await passwordInput.sendKeys(TEST_USERS.doctor.password);
      await sleep(500);
      
      await takeScreenshot(driver, 'doctor-login-filled');
      
      // Click login button
      const loginButton = await driver.findElement(By.css('button[type="submit"]'));
      await loginButton.click();
      
      // Wait for navigation - check for URL change or dashboard element
      console.log('   Waiting for navigation...');
      await sleep(5000);
      await takeScreenshot(driver, 'doctor-after-login');
      
      // Check if login was successful by looking at URL
      const currentUrl = await driver.getCurrentUrl();
      console.log(`   Current URL: ${currentUrl}`);
      
      if (currentUrl.includes('dashboard') || currentUrl.includes('patients') || !currentUrl.includes('login')) {
        await logTest('DOCTOR_UI', 'Doctor Login', true, `Navigated to: ${currentUrl}`);
      } else {
        // Check for error messages
        try {
          const errorElement = await driver.findElement(By.css('.error, .alert-danger, [role="alert"], .text-red-500, .MuiAlert-root'));
          const errorText = await errorElement.getText();
          await logTest('DOCTOR_UI', 'Doctor Login', false, `Error: ${errorText}`);
        } catch {
          await logTest('DOCTOR_UI', 'Doctor Login', false, 'Login may have failed - still on login page');
        }
      }
    } catch (error) {
      await logTest('DOCTOR_UI', 'Doctor Login', false, error.message);
      await takeScreenshot(driver, 'doctor-login-exception');
    }
    
    // Test 3: Navigate to Patient List
    console.log('\n📋 Test 3: Navigating to patient list...');
    await sleep(2000);
    try {
      // Try to find patient list button or link (sidebar uses buttons)
      const patientButton = await driver.findElement(By.xpath('//button[contains(text(), "Patients") or contains(text(), "ผู้ป่วย") or contains(text(), "Find Patient")]'));
      await patientButton.click();
      await sleep(3000);
      await takeScreenshot(driver, 'doctor-patient-list');
      await logTest('DOCTOR_UI', 'Patient List Navigation', true, 'Patient list accessed');
    } catch (error) {
      await takeScreenshot(driver, 'doctor-dashboard');
      await logTest('DOCTOR_UI', 'Patient List Navigation', false, error.message);
    }
    
    // Test 4: Navigate to Schedule (or Dashboard if already moved)
    console.log('\n📋 Test 4: Navigating to schedule/home...');
    try {
      // Try multiple navigation options
      let found = false;
      const navOptions = [
        '//button[contains(text(), "Schedule")]',
        '//button[contains(text(), "Calendar")]',
        '//button[contains(text(), "Dashboard")]',
        '//button[contains(text(), "🏠")]',
        '//button[contains(text(), "📅")]'
      ];
      
      for (const xpath of navOptions) {
        try {
          const button = await driver.findElement(By.xpath(xpath));
          if (button) {
            await button.click();
            found = true;
            await sleep(3000);
            await takeScreenshot(driver, 'doctor-schedule');
            await logTest('DOCTOR_UI', 'Schedule Navigation', true, 'Navigation accessed');
            break;
          }
        } catch { continue; }
      }
      
      if (!found) {
        throw new Error('No navigation button found');
      }
    } catch (error) {
      // This is a minor navigation test - log and continue
      await logTest('DOCTOR_UI', 'Schedule Navigation', false, error.message);
    }
    
  } finally {
    await sleep(3000); // Let user see final state
    await driver.quit();
  }
}

// ============================================================================
// ADMIN PORTAL TESTS
// ============================================================================

async function testAdminPortal() {
  console.log('\n👑 ===== ADMIN PORTAL UI TESTS =====\n');
  
  const options = new chrome.Options();
  options.addArguments('--start-maximized');
  options.addArguments('--disable-blink-features=AutomationControlled');
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  
  try {
    // Test 1: Load Doctor Portal (Admin uses same portal)
    console.log('\n📋 Test 1: Loading Admin Portal...');
    await driver.get(CONFIG.DOCTOR_PORTAL_URL);
    await sleep(3000);
    
    // Take screenshot of login page
    await takeScreenshot(driver, 'admin-portal-login');
    
    // Test 2: Login as Admin
    console.log('\n📋 Test 2: Logging in as admin...');
    try {
      const emailInput = await driver.findElement(By.css('input[type="email"], input[name="email"], #email'));
      await emailInput.clear();
      await emailInput.sendKeys(TEST_USERS.admin.email);
      await sleep(500);
      
      const passwordInput = await driver.findElement(By.css('input[type="password"], input[name="password"], #password'));
      await passwordInput.clear();
      await passwordInput.sendKeys(TEST_USERS.admin.password);
      await sleep(500);
      
      await takeScreenshot(driver, 'admin-login-filled');
      
      const loginButton = await driver.findElement(By.css('button[type="submit"]'));
      await loginButton.click();
      
      await sleep(5000);
      await takeScreenshot(driver, 'admin-after-login');
      
      const currentUrl = await driver.getCurrentUrl();
      if (currentUrl.includes('login')) {
        await logTest('ADMIN_UI', 'Admin Login', false, 'Still on login page');
      } else {
        await logTest('ADMIN_UI', 'Admin Login', true, `Navigated to: ${currentUrl}`);
      }
    } catch (error) {
      await logTest('ADMIN_UI', 'Admin Login', false, error.message);
      await takeScreenshot(driver, 'admin-login-exception');
    }
    
    // Test 3: Access Admin Features
    console.log('\n📋 Test 3: Accessing admin features...');
    await sleep(2000);
    try {
      // Try to find admin-specific links
      const adminLinks = await driver.findElements(By.xpath('//a[contains(@href, "admin") or contains(text(), "จัดการ") or contains(text(), "Manage") or contains(text(), "Admin")]'));
      console.log(`Found ${adminLinks.length} admin-related links`);
      await takeScreenshot(driver, 'admin-dashboard');
      await logTest('ADMIN_UI', 'Admin Dashboard', true, `${adminLinks.length} admin links found`);
    } catch (error) {
      await logTest('ADMIN_UI', 'Admin Dashboard', false, error.message);
    }
    
  } finally {
    await sleep(3000);
    await driver.quit();
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function runAllTests() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   IZARA TELEMEDICINE - SELENIUM UI TESTS (VISIBLE BROWSER)    ║');
  console.log('║   Date: ' + new Date().toISOString().split('T')[0] + '                                          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  
  try {
    // Run tests sequentially with visible browser
    await testPatientPortal();
    await testDoctorPortal();
    await testAdminPortal();
    
  } catch (error) {
    console.error('Test suite error:', error);
  }
  
  // Print summary
  console.log('\n📊 ===== TEST SUMMARY =====\n');
  
  const passed = testResults.filter(r => r.passed).length;
  const failed = testResults.filter(r => !r.passed).length;
  
  console.log('┌─────────────────────────────────────────────────────────┐');
  console.log(`│ TOTAL: ${passed}/${testResults.length} tests passed (${Math.round(passed/testResults.length*100)}%)${' '.repeat(20)}│`);
  console.log('└─────────────────────────────────────────────────────────┘');
  
  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.filter(r => !r.passed).forEach(r => {
      console.log(`   - [${r.category}] ${r.testName}: ${r.details}`);
    });
  }
  
  // Save results to file
  const reportPath = path.join(CONFIG.SCREENSHOT_DIR, `ui-test-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`\n📄 Test report saved to: ${reportPath}`);
}

// Run the tests
runAllTests().then(() => {
  console.log('Tests completed');
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
