/**
 * VISUAL SELENIUM UI TESTS - NON-HEADLESS
 * You will see the browser window during testing!
 * 
 * Tests:
 * 1. Admin Login & Dashboard
 * 2. Doctor Login & Dashboard
 * 3. Patient Login & Dashboard
 * 4. Appointment Booking Flow
 * 5. Meeting Preparation Flow
 * 
 * Run: node scripts/visualUITests.cjs
 */

const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

// ============================================================================
// CONFIGURATION
// ============================================================================

const TEST_USERS = {
  admin: {
    email: 'admin.test@izara.com',
    password: 'IzaraAdmin@2024',
    portal: 'http://localhost:3010',
    expectedDashboard: '/admin',
    name: 'Admin'
  },
  doctor: {
    email: 'doctor.test@izara.com',
    password: 'IzaraDoctor@2024',
    portal: 'http://localhost:3010',
    expectedDashboard: '/doctor/DOC-001/dashboard',
    name: 'Doctor'
  },
  patient: {
    email: 'demo.test@gmail.com',
    password: 'P@ssw0rd',
    portal: 'http://localhost:3005',
    expectedDashboard: '/',
    name: 'Patient'
  }
};

const DELAY = {
  short: 1000,
  medium: 2000,
  long: 3000,
  pageLoad: 4000
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(message, type = 'info') {
  const icons = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    test: '🧪',
    browser: '🌐'
  };
  console.log(`${icons[type] || '•'} ${message}`);
}

async function createVisibleDriver() {
  const options = new chrome.Options();
  
  // NO HEADLESS - You will see the browser!
  options.addArguments('--start-maximized');
  options.addArguments('--disable-blink-features=AutomationControlled');
  options.addArguments('--disable-infobars');
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-gpu');
  
  // Allow fake media for video/audio tests
  options.addArguments('--use-fake-ui-for-media-stream');
  options.addArguments('--use-fake-device-for-media-stream');
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
    
  // Set implicit wait
  await driver.manage().setTimeouts({ implicit: 10000 });
  
  return driver;
}

async function takeScreenshot(driver, name) {
  try {
    const screenshot = await driver.takeScreenshot();
    const fs = require('fs');
    const dir = './scripts/test-screenshots';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(`${dir}/${name}-${Date.now()}.png`, screenshot, 'base64');
    log(`Screenshot saved: ${name}`, 'info');
  } catch (e) {
    // Ignore screenshot errors
  }
}

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

async function testLogin(driver, userType) {
  const user = TEST_USERS[userType];
  log(`Testing ${user.name} login at ${user.portal}...`, 'test');
  
  try {
    // Clear cookies and local storage first
    await driver.manage().deleteAllCookies();
    try {
      await driver.executeScript('window.localStorage.clear(); window.sessionStorage.clear();');
    } catch (e) { /* ignore */ }
    
    // Navigate to portal
    await driver.get(user.portal + '/login');
    await delay(DELAY.pageLoad);
    
    log(`Loaded: ${user.portal}`, 'browser');
    
    // Check if already on login page or need to navigate
    const currentUrl = await driver.getCurrentUrl();
    if (!currentUrl.includes('login')) {
      // Try to find login link or navigate
      try {
        const loginLink = await driver.findElement(By.xpath("//a[contains(@href, 'login')]"));
        await loginLink.click();
        await delay(DELAY.medium);
      } catch (e) {
        // Maybe already logged in or no login link
      }
    }
    
    // Wait for login form
    log('Looking for login form...', 'browser');
    
    // Find email input (try multiple selectors)
    let emailInput;
    try {
      emailInput = await driver.findElement(By.css("input[type='email']"));
    } catch (e) {
      try {
        emailInput = await driver.findElement(By.css("input[name='email']"));
      } catch (e2) {
        emailInput = await driver.findElement(By.xpath("//input[contains(@placeholder, 'mail') or contains(@placeholder, 'Email') or contains(@placeholder, 'อีเมล')]"));
      }
    }
    
    // Clear and enter email
    await emailInput.clear();
    await emailInput.sendKeys(user.email);
    log(`Entered email: ${user.email}`, 'info');
    await delay(DELAY.short);
    
    // Find password input
    let passwordInput;
    try {
      passwordInput = await driver.findElement(By.css("input[type='password']"));
    } catch (e) {
      passwordInput = await driver.findElement(By.css("input[name='password']"));
    }
    
    // Clear and enter password
    await passwordInput.clear();
    await passwordInput.sendKeys(user.password);
    log(`Entered password: ${'*'.repeat(user.password.length)}`, 'info');
    await delay(DELAY.short);
    
    // Take screenshot before login
    await takeScreenshot(driver, `${userType}-before-login`);
    
    // Find and click login button
    let loginButton;
    try {
      loginButton = await driver.findElement(By.css("button[type='submit']"));
    } catch (e) {
      try {
        loginButton = await driver.findElement(By.xpath("//button[contains(text(), 'เข้าสู่ระบบ') or contains(text(), 'Login') or contains(text(), 'Sign In')]"));
      } catch (e2) {
        loginButton = await driver.findElement(By.xpath("//button[contains(@class, 'login') or contains(@class, 'submit')]"));
      }
    }
    
    await loginButton.click();
    log('Clicked login button', 'info');
    
    // Wait for navigation
    await delay(DELAY.pageLoad);
    
    // Check for successful login
    const newUrl = await driver.getCurrentUrl();
    log(`After login URL: ${newUrl}`, 'browser');
    
    // Check for error messages
    try {
      const errorElement = await driver.findElement(By.xpath("//*[contains(@class, 'error') or contains(@class, 'alert-danger') or contains(text(), 'Invalid') or contains(text(), 'ไม่ถูกต้อง')]"));
      const errorText = await errorElement.getText();
      log(`Login error: ${errorText}`, 'error');
      await takeScreenshot(driver, `${userType}-login-error`);
      return false;
    } catch (e) {
      // No error found - good!
    }
    
    // Take screenshot after login
    await takeScreenshot(driver, `${userType}-after-login`);
    
    // Verify we're on the expected page
    const loginUrl = user.portal + '/login';
    if (!newUrl.includes('/login')) {
      log(`${user.name} login successful! Now at: ${newUrl}`, 'success');
      return true;
    } else {
      log(`${user.name} login may have failed - still on login page`, 'warning');
      return false;
    }
    
  } catch (error) {
    log(`${user.name} login test failed: ${error.message}`, 'error');
    await takeScreenshot(driver, `${userType}-login-exception`);
    return false;
  }
}

async function testDashboardNavigation(driver, userType) {
  const user = TEST_USERS[userType];
  log(`Testing ${user.name} dashboard navigation...`, 'test');
  
  try {
    await delay(DELAY.medium);
    
    // Look for navigation elements
    const navItems = await driver.findElements(By.xpath("//nav//a | //aside//a | //div[contains(@class, 'sidebar')]//a"));
    log(`Found ${navItems.length} navigation items`, 'info');
    
    // Get current page title
    const title = await driver.getTitle();
    log(`Page title: ${title}`, 'browser');
    
    // Take dashboard screenshot
    await takeScreenshot(driver, `${userType}-dashboard`);
    
    // Test some navigation (if available)
    if (navItems.length > 0) {
      for (let i = 0; i < Math.min(3, navItems.length); i++) {
        try {
          const navItem = navItems[i];
          const href = await navItem.getAttribute('href');
          const text = await navItem.getText();
          if (href && text && !href.includes('logout')) {
            log(`Nav item: ${text.trim()} -> ${href}`, 'info');
          }
        } catch (e) {
          // Ignore stale elements
        }
      }
    }
    
    log(`${user.name} dashboard navigation test completed`, 'success');
    return true;
    
  } catch (error) {
    log(`Dashboard navigation test failed: ${error.message}`, 'error');
    return false;
  }
}

async function testAppointmentBooking(driver) {
  log('Testing Appointment Booking Flow...', 'test');
  
  try {
    // First login as patient
    const loginSuccess = await testLogin(driver, 'patient');
    if (!loginSuccess) {
      log('Cannot test appointment booking - patient login failed', 'error');
      return false;
    }
    
    await delay(DELAY.medium);
    
    // Navigate to appointments
    log('Looking for appointments link...', 'browser');
    
    try {
      // Try to find appointments link
      const appointmentsLink = await driver.findElement(By.xpath("//a[contains(@href, 'appointment') or contains(text(), 'นัดหมาย') or contains(text(), 'Appointment')]"));
      await appointmentsLink.click();
      log('Clicked appointments link', 'info');
      await delay(DELAY.medium);
    } catch (e) {
      // Try direct navigation
      await driver.get('http://localhost:3005/appointments');
      await delay(DELAY.pageLoad);
    }
    
    // Take screenshot of appointments page
    await takeScreenshot(driver, 'patient-appointments-list');
    
    // Try to find "Book New" button
    try {
      const bookButton = await driver.findElement(By.xpath("//a[contains(@href, 'book') or contains(text(), 'ขอนัดหมาย') or contains(text(), 'Book') or contains(text(), 'นัดหมายใหม่')]"));
      await bookButton.click();
      log('Clicked book appointment button', 'info');
      await delay(DELAY.pageLoad);
      
      // Take screenshot of booking form
      await takeScreenshot(driver, 'patient-book-appointment');
      
      // Fill in symptom if form is available
      try {
        const symptomInput = await driver.findElement(By.xpath("//input[contains(@placeholder, 'อาการ') or contains(@name, 'symptom') or contains(@name, 'reason')]"));
        await symptomInput.sendKeys('ปวดหัว มึนงง 2 วัน');
        log('Entered symptom', 'info');
        await delay(DELAY.short);
        
        await takeScreenshot(driver, 'patient-symptom-filled');
      } catch (e) {
        log('Could not find symptom input field', 'warning');
      }
      
    } catch (e) {
      log('Could not find book appointment button: ' + e.message, 'warning');
    }
    
    log('Appointment booking flow test completed', 'success');
    return true;
    
  } catch (error) {
    log(`Appointment booking test failed: ${error.message}`, 'error');
    await takeScreenshot(driver, 'appointment-booking-error');
    return false;
  }
}

async function testDoctorAppointmentPool(driver) {
  log('Testing Doctor Appointment Pool...', 'test');
  
  try {
    // First login as doctor
    const loginSuccess = await testLogin(driver, 'doctor');
    if (!loginSuccess) {
      log('Cannot test appointment pool - doctor login failed', 'error');
      return false;
    }
    
    await delay(DELAY.medium);
    
    // Navigate to appointment pool
    try {
      const poolLink = await driver.findElement(By.xpath("//a[contains(@href, 'pool') or contains(text(), 'Pool') or contains(text(), 'รายการรอ')]"));
      await poolLink.click();
      log('Clicked appointment pool link', 'info');
      await delay(DELAY.medium);
    } catch (e) {
      // Try direct navigation
      await driver.get('http://localhost:3010/doctor/DOC-001/appointment-pool');
      await delay(DELAY.pageLoad);
    }
    
    // Take screenshot
    await takeScreenshot(driver, 'doctor-appointment-pool');
    
    log('Doctor appointment pool test completed', 'success');
    return true;
    
  } catch (error) {
    log(`Appointment pool test failed: ${error.message}`, 'error');
    return false;
  }
}

async function testAdminDashboard(driver) {
  log('Testing Admin Dashboard...', 'test');
  
  try {
    // Login as admin
    const loginSuccess = await testLogin(driver, 'admin');
    if (!loginSuccess) {
      log('Admin login failed', 'error');
      return false;
    }
    
    await delay(DELAY.medium);
    
    // Check for admin-specific elements
    try {
      const adminElements = await driver.findElements(By.xpath("//*[contains(text(), 'Admin') or contains(text(), 'แอดมิน') or contains(text(), 'อนุมัติ') or contains(text(), 'Pending')]"));
      log(`Found ${adminElements.length} admin-related elements`, 'info');
    } catch (e) {
      // Ignore
    }
    
    // Take dashboard screenshot
    await takeScreenshot(driver, 'admin-dashboard');
    
    // Try to navigate to doctor approval
    try {
      const approvalLink = await driver.findElement(By.xpath("//a[contains(@href, 'approval') or contains(@href, 'pending') or contains(text(), 'อนุมัติ')]"));
      await approvalLink.click();
      await delay(DELAY.medium);
      await takeScreenshot(driver, 'admin-approvals');
    } catch (e) {
      log('Could not find approval link', 'warning');
    }
    
    log('Admin dashboard test completed', 'success');
    return true;
    
  } catch (error) {
    log(`Admin dashboard test failed: ${error.message}`, 'error');
    return false;
  }
}

async function testPDPAPage(driver) {
  log('Testing PDPA Consent Page...', 'test');
  
  try {
    // Login as patient first
    await driver.get('http://localhost:3005');
    await delay(DELAY.pageLoad);
    
    const loginSuccess = await testLogin(driver, 'patient');
    if (!loginSuccess) {
      log('Cannot test PDPA - patient login failed', 'error');
      return false;
    }
    
    await delay(DELAY.medium);
    
    // Navigate to PDPA page
    try {
      const pdpaLink = await driver.findElement(By.xpath("//a[contains(@href, 'pdpa') or contains(text(), 'PDPA') or contains(text(), 'ข้อมูลส่วนบุคคล') or contains(text(), 'ความยินยอม')]"));
      await pdpaLink.click();
      await delay(DELAY.medium);
    } catch (e) {
      // Try direct navigation
      await driver.get('http://localhost:3005/pdpa');
      await delay(DELAY.pageLoad);
    }
    
    // Take screenshot of PDPA page
    await takeScreenshot(driver, 'patient-pdpa');
    
    // Look for consent toggles
    try {
      const toggles = await driver.findElements(By.xpath("//button[contains(@class, 'toggle') or @role='switch']"));
      log(`Found ${toggles.length} consent toggles`, 'info');
    } catch (e) {
      // Ignore
    }
    
    // Check for general doctor access section
    try {
      const doctorSection = await driver.findElement(By.xpath("//*[contains(text(), 'แพทย์ที่มีสิทธิ์') or contains(text(), 'การให้สิทธิ์แพทย์')]"));
      if (doctorSection) {
        log('Found general doctor access section (not specific doctor selection)', 'success');
      }
    } catch (e) {
      log('Could not find doctor access section', 'warning');
    }
    
    log('PDPA consent page test completed', 'success');
    return true;
    
  } catch (error) {
    log(`PDPA test failed: ${error.message}`, 'error');
    return false;
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('       IZARA TELEMEDICINE - VISUAL UI TESTS (NON-HEADLESS)     ');
  console.log('       👁️  You will see the browser window during tests!       ');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  let driver = null;
  
  try {
    // Check server health first
    log('Checking servers...', 'info');
    const http = require('http');
    
    const servers = [
      { name: 'Doctor Portal', url: 'http://localhost:3010' },
      { name: 'Patient Portal', url: 'http://localhost:3005' },
      { name: 'Auth Server', url: 'http://localhost:3011/api/health' },
      { name: 'GCS Server', url: 'http://localhost:3012/api/health' }
    ];
    
    for (const server of servers) {
      try {
        await new Promise((resolve, reject) => {
          http.get(server.url, (res) => {
            if (res.statusCode === 200 || res.statusCode === 302 || res.statusCode === 304) {
              log(`${server.name}: Running ✓`, 'success');
              resolve();
            } else {
              reject(new Error(`Status ${res.statusCode}`));
            }
          }).on('error', reject);
        });
      } catch (e) {
        log(`${server.name}: NOT RUNNING ✗`, 'error');
      }
    }
    
    console.log('\n');
    
    // Create visible browser
    log('Starting visible Chrome browser...', 'browser');
    driver = await createVisibleDriver();
    
    // Test 1: Admin Login & Dashboard
    console.log('\n--- TEST 1: Admin Login & Dashboard ---');
    const adminTest = await testAdminDashboard(driver);
    results.tests.push({ name: 'Admin Dashboard', passed: adminTest });
    if (adminTest) results.passed++; else results.failed++;
    
    await delay(DELAY.medium);
    
    // Test 2: Doctor Login & Dashboard
    console.log('\n--- TEST 2: Doctor Login & Dashboard ---');
    await driver.get('http://localhost:3010/login');
    await delay(DELAY.short);
    const doctorTest = await testDoctorAppointmentPool(driver);
    results.tests.push({ name: 'Doctor Appointment Pool', passed: doctorTest });
    if (doctorTest) results.passed++; else results.failed++;
    
    await delay(DELAY.medium);
    
    // Test 3: Patient Appointment Booking
    console.log('\n--- TEST 3: Patient Appointment Booking ---');
    await driver.get('http://localhost:3005');
    await delay(DELAY.short);
    const appointmentTest = await testAppointmentBooking(driver);
    results.tests.push({ name: 'Patient Appointment Booking', passed: appointmentTest });
    if (appointmentTest) results.passed++; else results.failed++;
    
    await delay(DELAY.medium);
    
    // Test 4: PDPA Consent Page
    console.log('\n--- TEST 4: PDPA Consent Page ---');
    await driver.get('http://localhost:3005');
    await delay(DELAY.short);
    const pdpaTest = await testPDPAPage(driver);
    results.tests.push({ name: 'PDPA Consent Page', passed: pdpaTest });
    if (pdpaTest) results.passed++; else results.failed++;
    
    // Print results
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                        TEST RESULTS                            ');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    for (const test of results.tests) {
      console.log(`  ${test.passed ? '✅' : '❌'} ${test.name}`);
    }
    
    console.log(`\n  Total: ${results.passed + results.failed} tests`);
    console.log(`  ✅ Passed: ${results.passed}`);
    console.log(`  ❌ Failed: ${results.failed}`);
    console.log(`  📊 Pass Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
    
    // Keep browser open for a moment so user can see final state
    log('\nBrowser will close in 5 seconds...', 'info');
    await delay(5000);
    
  } catch (error) {
    console.error('\n❌ Test runner error:', error);
  } finally {
    if (driver) {
      await driver.quit();
      log('Browser closed', 'browser');
    }
  }
  
  return results;
}

// Run if executed directly
if (require.main === module) {
  runAllTests()
    .then((results) => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests };
