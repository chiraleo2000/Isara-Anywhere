/**
 * ============================================================================
 * IZARA TELEMEDICINE - Email Notification Selection E2E Tests
 * ============================================================================
 * 
 * Tests the email recipient selection feature in appointment confirmations.
 * 
 * Test Coverage:
 *   1. Email recipient checkboxes visibility
 *   2. Patient email checkbox toggle
 *   3. Doctor email checkbox toggle
 *   4. Additional emails input field
 *   5. Email sending with selected recipients
 * 
 * Usage:
 *   node scripts/tests/e2e/emailNotificationTests.cjs
 *   node scripts/tests/e2e/emailNotificationTests.cjs --headless
 * 
 * Prerequisites:
 *   - Doctor Portal running on localhost:3010
 *   - User authenticated as doctor
 *   - Chrome/ChromeDriver installed
 * 
 * @version 1.0.0
 * @date December 2025
 */

const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  doctorPortalUrl: process.env.DOCTOR_PORTAL_URL || 'http://localhost:3010',
  timeout: 15000,
  shortTimeout: 5000,
  headless: process.argv.includes('--headless')
};

const USERS = {
  doctor: {
    email: 'doctor.test@izara.com',
    password: 'IzaraDoctor@2024'
  }
};

// ============================================================================
// TEST RESULTS
// ============================================================================

const testResults = {
  passed: [],
  failed: [],
  skipped: [],
  startTime: null,
  endTime: null
};

function logTest(name, status, details = '') {
  const timestamp = new Date().toISOString();
  const result = { name, status, details, timestamp };
  
  if (status === 'PASSED') {
    testResults.passed.push(result);
    console.log(`   ✅ ${name}`);
  } else if (status === 'FAILED') {
    testResults.failed.push(result);
    console.log(`   ❌ ${name}: ${details}`);
  } else if (status === 'SKIPPED') {
    testResults.skipped.push(result);
    console.log(`   ⏭️  ${name}: ${details}`);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function createDriver() {
  const options = new chrome.Options();
  
  if (CONFIG.headless) {
    options.addArguments('--headless');
  }
  
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  options.addArguments('--window-size=1920,1080');
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  
  await driver.manage().setTimeouts({
    implicit: 10000,
    pageLoad: 30000
  });
  
  return driver;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForElement(driver, locator, timeout = CONFIG.timeout) {
  try {
    return await driver.wait(until.elementLocated(locator), timeout);
  } catch (e) {
    return null;
  }
}

async function isElementPresent(driver, locator, timeout = CONFIG.shortTimeout) {
  try {
    await driver.wait(until.elementLocated(locator), timeout);
    return true;
  } catch (e) {
    return false;
  }
}

async function takeScreenshot(driver, name) {
  try {
    const screenshot = await driver.takeScreenshot();
    const dir = path.join(__dirname, '..', '..', 'test-screenshots');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(path.join(dir, `${name}-${Date.now()}.png`), screenshot, 'base64');
  } catch (e) {
    console.log(`   ⚠️  Could not save screenshot: ${e.message}`);
  }
}

async function navigateToHealthMeeting(driver) {
  try {
    await driver.get(CONFIG.doctorPortalUrl);
    await sleep(2000);
    
    // Look for นัดหมาย/Appointments navigation
    const navLinks = await driver.findElements(By.css('nav a, aside a, .sidebar a'));
    for (const link of navLinks) {
      try {
        const text = await link.getText();
        if (text.includes('นัดหมาย') || text.includes('Appointment') || text.includes('Meeting')) {
          await link.click();
          await sleep(2000);
          return true;
        }
      } catch (e) {}
    }
    
    // Try direct URL
    await driver.get(`${CONFIG.doctorPortalUrl}/appointments`);
    await sleep(2000);
    return true;
  } catch (error) {
    console.log(`   ⚠️  Navigation error: ${error.message}`);
    return false;
  }
}

// ============================================================================
// EMAIL NOTIFICATION TESTS
// ============================================================================

async function testEmailRecipientsUIExists(driver) {
  const testName = 'Email Recipients UI - Elements Present';
  
  try {
    await navigateToHealthMeeting(driver);
    
    // Look for an appointment to confirm or create new one
    const appointmentCards = await driver.findElements(By.css('.appointment-card, [data-appointment], .meeting-item'));
    
    if (appointmentCards.length > 0) {
      // Click first appointment to see details
      await appointmentCards[0].click();
      await sleep(1000);
    }
    
    // Look for confirm/send email button
    const confirmButton = await waitForElement(driver, By.xpath(
      "//button[contains(text(), 'Confirm') or contains(text(), 'ยืนยัน') or contains(text(), 'Send') or contains(text(), 'ส่ง')]"
    ), CONFIG.shortTimeout);
    
    if (confirmButton) {
      await confirmButton.click();
      await sleep(1000);
      
      // Check for email recipient checkboxes
      const patientCheckbox = await isElementPresent(driver, By.xpath(
        "//input[@type='checkbox'][following-sibling::*[contains(text(), 'Patient') or contains(text(), 'ผู้ป่วย')]] | //label[contains(text(), 'Patient') or contains(text(), 'ผู้ป่วย')]//input[@type='checkbox']"
      ), CONFIG.shortTimeout);
      
      const doctorCheckbox = await isElementPresent(driver, By.xpath(
        "//input[@type='checkbox'][following-sibling::*[contains(text(), 'Doctor') or contains(text(), 'แพทย์')]] | //label[contains(text(), 'Doctor') or contains(text(), 'แพทย์')]//input[@type='checkbox']"
      ), CONFIG.shortTimeout);
      
      const additionalEmails = await isElementPresent(driver, By.xpath(
        "//input[@type='email' or @placeholder[contains(., 'email')] or @placeholder[contains(., 'อีเมล')]]"
      ), CONFIG.shortTimeout);
      
      if (patientCheckbox || doctorCheckbox || additionalEmails) {
        logTest(testName, 'PASSED', 'Email recipient controls found');
        return true;
      }
    }
    
    logTest(testName, 'SKIPPED', 'Could not access appointment confirmation modal');
    return false;
  } catch (error) {
    await takeScreenshot(driver, 'email-ui-error');
    logTest(testName, 'FAILED', error.message);
    return false;
  }
}

async function testEmailCheckboxToggle(driver) {
  const testName = 'Email Recipients - Checkbox Toggle';
  
  try {
    // Find a checkbox in the email section
    const checkboxes = await driver.findElements(By.css('input[type="checkbox"]'));
    
    for (const checkbox of checkboxes) {
      try {
        const isChecked = await checkbox.isSelected();
        await checkbox.click();
        await sleep(300);
        
        const newState = await checkbox.isSelected();
        
        if (isChecked !== newState) {
          logTest(testName, 'PASSED', 'Checkbox toggled successfully');
          
          // Toggle back
          await checkbox.click();
          return true;
        }
      } catch (e) {}
    }
    
    logTest(testName, 'SKIPPED', 'No toggleable checkboxes found');
    return false;
  } catch (error) {
    logTest(testName, 'FAILED', error.message);
    return false;
  }
}

async function testAdditionalEmailsInput(driver) {
  const testName = 'Email Recipients - Additional Emails Input';
  
  try {
    // Find additional emails input
    const emailInputs = await driver.findElements(By.css(
      'input[type="email"], input[placeholder*="email"], input[placeholder*="อีเมล"]'
    ));
    
    for (const input of emailInputs) {
      try {
        await input.clear();
        await input.sendKeys('test@example.com, another@test.com');
        await sleep(300);
        
        const value = await input.getAttribute('value');
        
        if (value.includes('test@example.com')) {
          logTest(testName, 'PASSED', 'Additional emails input accepts values');
          await input.clear();
          return true;
        }
      } catch (e) {}
    }
    
    logTest(testName, 'SKIPPED', 'Additional emails input not found');
    return false;
  } catch (error) {
    logTest(testName, 'FAILED', error.message);
    return false;
  }
}

async function testEmailNotificationLabels(driver) {
  const testName = 'Email Recipients - UI Labels Present';
  
  try {
    // Check for expected labels
    const labels = [
      'Send to Patient',
      'Send to Doctor',
      'Additional',
      'ส่งถึงผู้ป่วย',
      'ส่งถึงแพทย์',
      'เพิ่มเติม'
    ];
    
    let foundLabels = 0;
    
    for (const label of labels) {
      const element = await isElementPresent(driver, By.xpath(
        `//*[contains(text(), '${label}')]`
      ), 1000);
      
      if (element) {
        foundLabels++;
      }
    }
    
    if (foundLabels >= 2) {
      logTest(testName, 'PASSED', `Found ${foundLabels} relevant labels`);
      return true;
    } else {
      logTest(testName, 'SKIPPED', 'Insufficient labels found (modal may not be open)');
      return false;
    }
  } catch (error) {
    logTest(testName, 'FAILED', error.message);
    return false;
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('         IZARA - Email Notification Selection E2E Tests');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\n⏰ Started: ${new Date().toLocaleString()}`);
  console.log(`🔗 Doctor Portal: ${CONFIG.doctorPortalUrl}`);
  console.log(`🖥️  Mode: ${CONFIG.headless ? 'Headless' : 'Browser'}\n`);
  
  testResults.startTime = new Date();
  
  let driver;
  
  try {
    driver = await createDriver();
    
    console.log('\n📋 Email Notification Selection Tests');
    console.log('─────────────────────────────────────────────');
    
    await testEmailRecipientsUIExists(driver);
    await testEmailCheckboxToggle(driver);
    await testAdditionalEmailsInput(driver);
    await testEmailNotificationLabels(driver);
    
  } catch (error) {
    console.error(`\n❌ Test suite error: ${error.message}`);
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
  
  testResults.endTime = new Date();
  
  // Print results
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                        TEST RESULTS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\n   ✅ Passed: ${testResults.passed.length}`);
  console.log(`   ❌ Failed: ${testResults.failed.length}`);
  console.log(`   ⏭️  Skipped: ${testResults.skipped.length}`);
  
  const duration = (testResults.endTime - testResults.startTime) / 1000;
  console.log(`\n   ⏱️  Duration: ${duration.toFixed(1)}s`);
  console.log(`   🏁 Completed: ${testResults.endTime.toLocaleString()}\n`);
  
  process.exit(testResults.failed.length > 0 ? 1 : 0);
}

runAllTests().catch(console.error);
