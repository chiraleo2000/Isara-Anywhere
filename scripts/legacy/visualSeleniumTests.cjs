/**
 * Visual Selenium Test Suite - Robust version with visible browser
 * Tests both Doctor and Patient portals with visible browser actions
 */

const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

const CONFIG = {
  doctorPortalUrl: 'http://localhost:3010',
  patientPortalUrl: 'http://localhost:3005',
  timeout: 15000,
  shortTimeout: 5000
};

const USERS = {
  admin: { email: 'admin.test@izara.com', password: 'IzaraAdmin@2024' },
  doctor: { email: 'doctor.test@izara.com', password: 'IzaraDoctor@2024' },
  patient: { email: 'demo.test@gmail.com', password: 'P@ssw0rd' }
};

let results = { passed: 0, failed: 0, tests: [] };

async function createDriver() {
  const options = new chrome.Options();
  options.addArguments('--no-sandbox', '--disable-dev-shm-usage', '--window-size=1400,900');
  
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  await driver.manage().setTimeouts({ implicit: 5000, pageLoad: 20000 });
  return driver;
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function log(name, status, detail = '') {
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`   ${icon} ${name}${detail ? ` - ${detail}` : ''}`);
  results.tests.push({ name, status, detail });
  if (status === 'PASS') results.passed++; else results.failed++;
}

// ============================================================================
// DOCTOR PORTAL TESTS
// ============================================================================
async function testDoctorPortal() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  👨‍⚕️ DOCTOR PORTAL TESTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  let driver;
  try {
    driver = await createDriver();
    
    // Test 1: Load login page
    await driver.get(CONFIG.doctorPortalUrl);
    await sleep(2000);
    const title = await driver.getTitle();
    await log('Doctor Portal Loads', title ? 'PASS' : 'FAIL', title);
    
    // Test 2: Login as Doctor
    try {
      const emailField = await driver.wait(until.elementLocated(By.css('input[type="email"]')), CONFIG.timeout);
      await emailField.clear();
      await emailField.sendKeys(USERS.doctor.email);
      
      const pwField = await driver.wait(until.elementLocated(By.css('input[type="password"]')), CONFIG.timeout);
      await pwField.clear();
      await pwField.sendKeys(USERS.doctor.password);
      
      const submitBtn = await driver.findElement(By.xpath("//button[@type='submit']"));
      await submitBtn.click();
      await sleep(4000);
      
      // Check for successful login
      const pageSource = await driver.getPageSource();
      const loggedIn = pageSource.includes('Dashboard') || pageSource.includes('Schedule') || pageSource.includes('Patient');
      await log('Doctor Login', loggedIn ? 'PASS' : 'FAIL', loggedIn ? 'Logged in successfully' : 'Login failed');
      
      if (loggedIn) {
        // Test 3: Navigate to Schedule
        await sleep(1000);
        try {
          const scheduleBtn = await driver.findElement(By.xpath("//button[.//span[contains(text(), 'Schedule')]] | //*[contains(text(), 'Schedule')]"));
          await scheduleBtn.click();
          await sleep(2000);
          await log('Navigate to Schedule', 'PASS');
        } catch (e) {
          await log('Navigate to Schedule', 'FAIL', 'Schedule button not found');
        }
        
        // Test 4: Navigate to Patients
        try {
          const patientsBtn = await driver.findElement(By.xpath("//button[.//span[contains(text(), 'Patients')]] | //button[.//span[contains(text(), 'Patient')]] | //*[contains(text(), 'Patient')]"));
          await patientsBtn.click();
          await sleep(2000);
          await log('Navigate to Patients', 'PASS');
        } catch (e) {
          await log('Navigate to Patients', 'FAIL', 'Patients button not found');
        }
        
        // Test 5: Navigate to Queue
        try {
          const queueBtn = await driver.findElement(By.xpath("//button[.//span[contains(text(), 'Queue')]] | //*[contains(text(), 'Queue')]"));
          await queueBtn.click();
          await sleep(2000);
          await log('Navigate to Queue', 'PASS');
        } catch (e) {
          await log('Navigate to Queue', 'FAIL', 'Queue button not found');
        }
        
        // Test 6: Logout
        try {
          const logoutBtn = await driver.findElement(By.xpath("//*[contains(text(), 'Logout')] | //*[contains(text(), 'ออกจากระบบ')]"));
          await logoutBtn.click();
          await sleep(2000);
          await log('Doctor Logout', 'PASS');
        } catch (e) {
          await log('Doctor Logout', 'FAIL', 'Logout button not found');
        }
      }
    } catch (e) {
      await log('Doctor Login Flow', 'FAIL', e.message);
    }
    
    // Test 7: Admin Login
    await driver.get(CONFIG.doctorPortalUrl);
    await sleep(2000);
    try {
      const emailField = await driver.wait(until.elementLocated(By.css('input[type="email"]')), CONFIG.timeout);
      await emailField.clear();
      await emailField.sendKeys(USERS.admin.email);
      
      const pwField = await driver.findElement(By.css('input[type="password"]'));
      await pwField.clear();
      await pwField.sendKeys(USERS.admin.password);
      
      const submitBtn = await driver.findElement(By.xpath("//button[@type='submit']"));
      await submitBtn.click();
      await sleep(4000);
      
      const pageSource = await driver.getPageSource();
      const loggedIn = pageSource.includes('Dashboard') || pageSource.includes('Admin') || pageSource.includes('Doctor');
      await log('Admin Login', loggedIn ? 'PASS' : 'FAIL', loggedIn ? 'Admin logged in' : 'Admin login failed');
      
      if (loggedIn) {
        // Test 8: Check Admin Features
        try {
          const adminFeature = await driver.findElement(By.xpath("//*[contains(text(), 'Pending') or contains(text(), 'Approval') or contains(text(), 'Doctor')]"));
          await log('Admin Features Available', 'PASS');
        } catch (e) {
          await log('Admin Features Available', 'FAIL');
        }
      }
    } catch (e) {
      await log('Admin Login Flow', 'FAIL', e.message);
    }
    
  } catch (e) {
    console.error('Doctor Portal Error:', e.message);
  } finally {
    if (driver) {
      await sleep(1000);
      await driver.quit();
    }
  }
}

// ============================================================================
// PATIENT PORTAL TESTS
// ============================================================================
async function testPatientPortal() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  👤 PATIENT PORTAL TESTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  let driver;
  try {
    driver = await createDriver();
    
    // Test 1: Load Patient Portal
    await driver.get(CONFIG.patientPortalUrl);
    await sleep(3000);
    const title = await driver.getTitle();
    await log('Patient Portal Loads', title ? 'PASS' : 'FAIL', title);
    
    // Test 2: Navigate to Login
    const currentUrl = await driver.getCurrentUrl();
    if (!currentUrl.includes('/login')) {
      await driver.get(CONFIG.patientPortalUrl + '/login');
      await sleep(2000);
    }
    
    // Test 3: Login as Patient
    try {
      const emailField = await driver.wait(until.elementLocated(By.css('input[type="email"], input[name="email"]')), CONFIG.timeout);
      await emailField.clear();
      await emailField.sendKeys(USERS.patient.email);
      
      const pwField = await driver.findElement(By.css('input[type="password"]'));
      await pwField.clear();
      await pwField.sendKeys(USERS.patient.password);
      
      await sleep(500);
      const submitBtn = await driver.findElement(By.xpath("//button[@type='submit' or contains(text(), 'เข้าสู่ระบบ') or contains(text(), 'Login')]"));
      await submitBtn.click();
      await sleep(4000);
      
      // Check for successful login
      const pageSource = await driver.getPageSource();
      const url = await driver.getCurrentUrl();
      const loggedIn = !url.includes('/login') || pageSource.includes('Dashboard') || pageSource.includes('Appointment') || pageSource.includes('Welcome');
      await log('Patient Login', loggedIn ? 'PASS' : 'FAIL', loggedIn ? 'Logged in successfully' : 'Login may have failed');
      
      if (loggedIn && !url.includes('/login')) {
        // Test 4: Navigate to Appointments
        try {
          const aptLink = await driver.findElement(By.xpath("//a[contains(@href, 'appointment')] | //*[contains(text(), 'Appointment') or contains(text(), 'นัดหมาย')]"));
          await aptLink.click();
          await sleep(2000);
          await log('Navigate to Appointments', 'PASS');
        } catch (e) {
          await log('Navigate to Appointments', 'FAIL', 'Link not found');
        }
        
        // Test 5: Navigate to PHR
        try {
          const phrLink = await driver.findElement(By.xpath("//a[contains(@href, 'phr')] | //*[contains(text(), 'PHR') or contains(text(), 'Health Record') or contains(text(), 'สุขภาพ')]"));
          await phrLink.click();
          await sleep(2000);
          await log('Navigate to PHR', 'PASS');
        } catch (e) {
          await log('Navigate to PHR', 'FAIL', 'Link not found');
        }
        
        // Test 6: Navigate to AI Doctor
        try {
          const aiLink = await driver.findElement(By.xpath("//a[contains(@href, 'ai')] | //*[contains(text(), 'AI') or contains(text(), 'หมอ AI')]"));
          await aiLink.click();
          await sleep(2000);
          await log('Navigate to AI Doctor', 'PASS');
        } catch (e) {
          await log('Navigate to AI Doctor', 'FAIL', 'Link not found');
        }
        
        // Test 7: Navigate to PDPA
        try {
          const pdpaLink = await driver.findElement(By.xpath("//a[contains(@href, 'pdpa')] | //*[contains(text(), 'PDPA') or contains(text(), 'Privacy') or contains(text(), 'ความยินยอม')]"));
          await pdpaLink.click();
          await sleep(2000);
          await log('Navigate to PDPA', 'PASS');
        } catch (e) {
          await log('Navigate to PDPA', 'FAIL', 'Link not found');
        }
      }
    } catch (e) {
      await log('Patient Login Flow', 'FAIL', e.message);
    }
    
  } catch (e) {
    console.error('Patient Portal Error:', e.message);
  } finally {
    if (driver) {
      await sleep(1000);
      await driver.quit();
    }
  }
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🧪 VISUAL SELENIUM TEST SUITE');
  console.log('  Izara Telemedicine Platform');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('\n⚠️  Browser windows will open - DO NOT CLOSE THEM!\n');
  
  const startTime = Date.now();
  
  // Run tests
  await testDoctorPortal();
  await testPatientPortal();
  
  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const total = results.passed + results.failed;
  const passRate = ((results.passed / total) * 100).toFixed(1);
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  📊 TEST RESULTS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\n⏱️  Duration: ${duration}s`);
  console.log(`📊 Total: ${total} tests`);
  console.log(`✅ Passed: ${results.passed} (${passRate}%)`);
  console.log(`❌ Failed: ${results.failed}`);
  
  if (results.failed > 0) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  FAILED TESTS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    results.tests.filter(t => t.status === 'FAIL').forEach(t => {
      console.log(`   • ${t.name}: ${t.detail}`);
    });
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════\n');
  
  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch(console.error);
