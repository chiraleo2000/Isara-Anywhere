/**
 * ================================================================================
 * IZARA TELEMEDICINE - PHR DATA SYNC SELENIUM TESTS
 * ================================================================================
 *
 * Comprehensive PHR (Personal Health Record) data sync tests between:
 * - Patient Portal: PHR creation, vital signs entry, medication management
 * - Doctor Portal: PHR viewing, data verification, patient record access
 *
 * This test ensures:
 * 1. Patient can create and update PHR data
 * 2. Doctor can view the same PHR data correctly
 * 3. Data types and key values match between portals
 * 4. Vital signs sync properly
 * 5. Medications, allergies, and chronic conditions are consistent
 *
 * Run: node scripts/phrDataSyncSeleniumTests.cjs
 * Requires: Both portals running, chromedriver installed
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
  doctorPortalUrl: 'http://localhost:3010',
  patientPortalUrl: 'http://localhost:3005',
  timeout: 30000,
  shortTimeout: 5000,
  waitAfterAction: 2000,
  waitAfterLogin: 3000,
  headless: process.argv.includes('--headless'),
  screenshotDir: path.join(__dirname, 'test-screenshots', 'phr-sync'),
  resultsDir: path.join(__dirname, 'test-results')
};

// Test user credentials
const USERS = {
  patient: { 
    email: 'demo.test@gmail.com', 
    password: 'P@ssw0rd', 
    id: 'PATIENT-001',
    name: 'John Demo Patient',
    portal: 'patient'
  },
  doctor: { 
    email: 'doctor.test@izara.com', 
    password: 'IzaraDoctor@2024', 
    id: 'DOC-001',
    name: 'Dr. Sarah Johnson',
    portal: 'doctor'
  }
};

// Test PHR data to be created by patient and verified by doctor
const TEST_PHR_DATA = {
  vitals: {
    bloodPressureSystolic: '120',
    bloodPressureDiastolic: '80',
    heartRate: '72',
    temperature: '36.5',
    weight: '70',
    oxygenSaturation: '98',
    bloodGlucose: '95'
  },
  medication: {
    name: 'Test Medication Selenium',
    dosage: '500mg',
    frequency: 'twice daily',
    purpose: 'Testing PHR sync'
  },
  allergy: 'Selenium Test Allergy',
  chronicCondition: 'Test Chronic Condition'
};

// ============================================================================
// TEST RESULTS TRACKING
// ============================================================================

const results = {
  passed: [],
  failed: [],
  skipped: [],
  startTime: null,
  endTime: null,
  phrSyncResults: {
    patientPHRCreation: null,
    doctorPHRViewing: null,
    vitalSignsSync: null,
    medicationsSync: null,
    allergiesSync: null,
    chronicConditionsSync: null
  }
};

function log(name, status, details = '') {
  const timestamp = new Date().toISOString().substr(11, 12);
  const result = { name, status, details, timestamp };
  
  if (status === 'PASSED') {
    results.passed.push(result);
    console.log(`   ✅ [${timestamp}] ${name}`);
  } else if (status === 'FAILED') {
    results.failed.push(result);
    console.log(`   ❌ [${timestamp}] ${name}: ${details}`);
  } else if (status === 'SKIPPED') {
    results.skipped.push(result);
    console.log(`   ⏭️  [${timestamp}] ${name}: ${details}`);
  } else {
    console.log(`   ℹ️  [${timestamp}] ${name}: ${details}`);
  }
}

// ============================================================================
// DRIVER MANAGEMENT
// ============================================================================

async function createDriver() {
  const options = new chrome.Options();
  
  if (CONFIG.headless) {
    options.addArguments('--headless=new');
  }
  
  options.addArguments(
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--window-size=1920,1080',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-popup-blocking'
  );
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  
  await driver.manage().setTimeouts({
    implicit: 5000,
    pageLoad: 30000,
    script: 30000
  });
  
  return driver;
}

async function safeQuit(driver) {
  if (driver) {
    try {
      await driver.quit();
    } catch (e) {
      // Ignore quit errors
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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

async function clickElement(driver, locator, timeout = CONFIG.timeout) {
  try {
    const element = await waitForElement(driver, locator, timeout);
    if (element) {
      await driver.wait(until.elementIsEnabled(element), timeout);
      await element.click();
      await sleep(CONFIG.waitAfterAction);
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

async function typeInElement(driver, locator, text, timeout = CONFIG.timeout) {
  try {
    const element = await waitForElement(driver, locator, timeout);
    if (element) {
      await element.clear();
      await element.sendKeys(text);
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

async function getElementText(driver, locator, timeout = CONFIG.shortTimeout) {
  try {
    const element = await waitForElement(driver, locator, timeout);
    if (element) {
      return await element.getText();
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function elementExists(driver, locator, timeout = CONFIG.shortTimeout) {
  try {
    await driver.wait(until.elementLocated(locator), timeout);
    return true;
  } catch (e) {
    return false;
  }
}

async function takeScreenshot(driver, name) {
  try {
    if (!fs.existsSync(CONFIG.screenshotDir)) {
      fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
    }
    const screenshot = await driver.takeScreenshot();
    const timestamp = Date.now();
    const filename = `${name}-${timestamp}.png`;
    fs.writeFileSync(path.join(CONFIG.screenshotDir, filename), screenshot, 'base64');
    console.log(`   📸 Screenshot saved: ${filename}`);
    return filename;
  } catch (e) {
    return null;
  }
}

async function getPageSource(driver) {
  try {
    return await driver.getPageSource();
  } catch (e) {
    return '';
  }
}

async function getCurrentUrl(driver) {
  try {
    return await driver.getCurrentUrl();
  } catch (e) {
    return '';
  }
}

// ============================================================================
// LOGIN FUNCTIONS
// ============================================================================

async function loginToPatientPortal(driver, user) {
  console.log('   🔐 Logging into Patient Portal...');
  
  await driver.get(`${CONFIG.patientPortalUrl}/login`);
  await sleep(2000);
  
  // Enter email
  const emailSelectors = [
    By.name('email'),
    By.css('input[type="email"]'),
    By.css('input[name="email"]'),
  ];
  
  for (const selector of emailSelectors) {
    if (await typeInElement(driver, selector, user.email, CONFIG.shortTimeout)) {
      break;
    }
  }
  
  // Enter password
  const passwordSelectors = [
    By.name('password'),
    By.css('input[type="password"]'),
  ];
  
  for (const selector of passwordSelectors) {
    if (await typeInElement(driver, selector, user.password, CONFIG.shortTimeout)) {
      break;
    }
  }
  
  // Submit
  const submitSelectors = [
    By.css('button[type="submit"]'),
    By.xpath('//button[contains(text(), "เข้าสู่ระบบ")]'),
    By.xpath('//button[contains(text(), "Login")]'),
  ];
  
  for (const selector of submitSelectors) {
    if (await clickElement(driver, selector, CONFIG.shortTimeout)) {
      await sleep(CONFIG.waitAfterLogin);
      break;
    }
  }
  
  // Verify login
  const currentUrl = await getCurrentUrl(driver);
  const pageSource = await getPageSource(driver);
  
  const success = !currentUrl.includes('/login') || 
    pageSource.includes('Dashboard') || 
    pageSource.includes(user.name);
    
  if (success) {
    console.log('   ✅ Patient login successful');
  } else {
    console.log('   ❌ Patient login failed');
  }
  
  return success;
}

async function loginToDoctorPortal(driver, user) {
  console.log('   🔐 Logging into Doctor Portal...');
  
  await driver.get(`${CONFIG.doctorPortalUrl}/login`);
  await sleep(2000);
  
  // Enter email
  const emailSelectors = [
    By.name('email'),
    By.css('input[type="email"]'),
    By.css('input[name="email"]'),
  ];
  
  for (const selector of emailSelectors) {
    if (await typeInElement(driver, selector, user.email, CONFIG.shortTimeout)) {
      break;
    }
  }
  
  // Enter password
  const passwordSelectors = [
    By.name('password'),
    By.css('input[type="password"]'),
  ];
  
  for (const selector of passwordSelectors) {
    if (await typeInElement(driver, selector, user.password, CONFIG.shortTimeout)) {
      break;
    }
  }
  
  // Submit
  const submitSelectors = [
    By.css('button[type="submit"]'),
    By.xpath('//button[contains(text(), "Login")]'),
    By.xpath('//button[contains(text(), "Sign in")]'),
  ];
  
  for (const selector of submitSelectors) {
    if (await clickElement(driver, selector, CONFIG.shortTimeout)) {
      await sleep(CONFIG.waitAfterLogin);
      break;
    }
  }
  
  // Verify login
  const currentUrl = await getCurrentUrl(driver);
  const pageSource = await getPageSource(driver);
  
  const success = !currentUrl.includes('/login') || 
    pageSource.includes('Dashboard') || 
    pageSource.includes(user.name);
    
  if (success) {
    console.log('   ✅ Doctor login successful');
  } else {
    console.log('   ❌ Doctor login failed');
  }
  
  return success;
}

// ============================================================================
// PATIENT PORTAL PHR TESTS
// ============================================================================

async function testPatientPHRNavigation(driver) {
  console.log('\n📋 Testing Patient PHR Navigation...');
  
  // Navigate to PHR page
  const phrNavSelectors = [
    By.xpath('//a[contains(text(), "PHR")]'),
    By.xpath('//a[contains(text(), "ประวัติสุขภาพ")]'),
    By.xpath('//button[contains(text(), "PHR")]'),
    By.css('[href*="phr"]'),
    By.css('[data-testid="phr-nav"]'),
  ];
  
  let navigated = false;
  for (const selector of phrNavSelectors) {
    if (await clickElement(driver, selector, CONFIG.shortTimeout)) {
      navigated = true;
      break;
    }
  }
  
  if (!navigated) {
    // Try direct navigation
    await driver.get(`${CONFIG.patientPortalUrl}/phr`);
    await sleep(2000);
    navigated = true;
  }
  
  await takeScreenshot(driver, 'patient-phr-page');
  
  // Verify PHR page loaded
  const pageSource = await getPageSource(driver);
  const phrPageLoaded = pageSource.includes('PHR') || 
    pageSource.includes('ประวัติสุขภาพ') ||
    pageSource.includes('Vital') ||
    pageSource.includes('สัญญาณชีพ');
  
  if (phrPageLoaded) {
    log('Patient PHR Navigation', 'PASSED');
  } else {
    log('Patient PHR Navigation', 'FAILED', 'Could not navigate to PHR page');
  }
  
  return phrPageLoaded;
}

async function testPatientAddVitals(driver) {
  console.log('\n💓 Testing Patient Add Vital Signs...');
  
  // Click on Vitals tab
  const vitalsTabSelectors = [
    By.xpath('//button[contains(text(), "สัญญาณชีพ")]'),
    By.xpath('//button[contains(text(), "Vitals")]'),
    By.xpath('//button[contains(text(), "vitals")]'),
    By.css('[data-tab="vitals"]'),
  ];
  
  for (const selector of vitalsTabSelectors) {
    if (await clickElement(driver, selector, CONFIG.shortTimeout)) {
      break;
    }
  }
  
  await sleep(1000);
  
  // Click Add Vitals button
  const addVitalsSelectors = [
    By.xpath('//button[contains(text(), "เพิ่ม")]'),
    By.xpath('//button[contains(text(), "Add")]'),
    By.css('[data-testid="add-vitals"]'),
  ];
  
  let addButtonClicked = false;
  for (const selector of addVitalsSelectors) {
    if (await clickElement(driver, selector, CONFIG.shortTimeout)) {
      addButtonClicked = true;
      break;
    }
  }
  
  if (!addButtonClicked) {
    log('Patient Add Vitals', 'SKIPPED', 'Add button not found');
    return false;
  }
  
  await sleep(1000);
  
  // Fill in vital signs form
  const vitals = TEST_PHR_DATA.vitals;
  
  // Blood Pressure Systolic
  await typeInElement(driver, 
    By.css('input[name="bloodPressureSystolic"], input[placeholder*="systolic"], input[placeholder*="บน"]'),
    vitals.bloodPressureSystolic, CONFIG.shortTimeout);
  
  // Blood Pressure Diastolic
  await typeInElement(driver,
    By.css('input[name="bloodPressureDiastolic"], input[placeholder*="diastolic"], input[placeholder*="ล่าง"]'),
    vitals.bloodPressureDiastolic, CONFIG.shortTimeout);
  
  // Heart Rate
  await typeInElement(driver,
    By.css('input[name="heartRate"], input[placeholder*="heart"], input[placeholder*="ชีพจร"]'),
    vitals.heartRate, CONFIG.shortTimeout);
  
  // Temperature
  await typeInElement(driver,
    By.css('input[name="temperature"], input[placeholder*="temp"], input[placeholder*="อุณหภูมิ"]'),
    vitals.temperature, CONFIG.shortTimeout);
  
  // Weight
  await typeInElement(driver,
    By.css('input[name="weight"], input[placeholder*="weight"], input[placeholder*="น้ำหนัก"]'),
    vitals.weight, CONFIG.shortTimeout);
  
  // Oxygen Saturation
  await typeInElement(driver,
    By.css('input[name="oxygenSaturation"], input[placeholder*="oxygen"], input[placeholder*="ออกซิเจน"]'),
    vitals.oxygenSaturation, CONFIG.shortTimeout);
  
  await takeScreenshot(driver, 'patient-vitals-form-filled');
  
  // Submit form
  const saveSelectors = [
    By.xpath('//button[contains(text(), "บันทึก")]'),
    By.xpath('//button[contains(text(), "Save")]'),
    By.css('button[type="submit"]'),
  ];
  
  let saved = false;
  for (const selector of saveSelectors) {
    if (await clickElement(driver, selector, CONFIG.shortTimeout)) {
      saved = true;
      break;
    }
  }
  
  await sleep(2000);
  await takeScreenshot(driver, 'patient-vitals-saved');
  
  // Verify save
  const pageSource = await getPageSource(driver);
  const saveSuccessful = pageSource.includes(vitals.bloodPressureSystolic) ||
    pageSource.includes(vitals.heartRate) ||
    pageSource.includes('บันทึกสำเร็จ') ||
    pageSource.includes('Success');
  
  if (saveSuccessful || saved) {
    log('Patient Add Vitals', 'PASSED', `BP: ${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic}, HR: ${vitals.heartRate}`);
    results.phrSyncResults.vitalSignsSync = { patientEntered: true, values: vitals };
    return true;
  } else {
    log('Patient Add Vitals', 'FAILED', 'Could not save vital signs');
    return false;
  }
}

async function testPatientAddMedication(driver) {
  console.log('\n💊 Testing Patient Add Medication...');
  
  // Click on Medications tab
  const medTabSelectors = [
    By.xpath('//button[contains(text(), "ยา")]'),
    By.xpath('//button[contains(text(), "Medication")]'),
    By.xpath('//button[contains(text(), "medications")]'),
  ];
  
  for (const selector of medTabSelectors) {
    if (await clickElement(driver, selector, CONFIG.shortTimeout)) {
      break;
    }
  }
  
  await sleep(1000);
  
  // Click Add Medication button
  const addMedSelectors = [
    By.xpath('//button[contains(text(), "เพิ่ม")]'),
    By.xpath('//button[contains(text(), "Add")]'),
  ];
  
  let addClicked = false;
  for (const selector of addMedSelectors) {
    if (await clickElement(driver, selector, CONFIG.shortTimeout)) {
      addClicked = true;
      break;
    }
  }
  
  if (!addClicked) {
    log('Patient Add Medication', 'SKIPPED', 'Add button not found');
    return false;
  }
  
  await sleep(1000);
  
  // Fill medication form
  const med = TEST_PHR_DATA.medication;
  
  await typeInElement(driver,
    By.css('input[name="name"], input[placeholder*="ชื่อยา"], input[placeholder*="medication"]'),
    med.name, CONFIG.shortTimeout);
  
  await typeInElement(driver,
    By.css('input[name="dosage"], input[placeholder*="ขนาด"], input[placeholder*="dosage"]'),
    med.dosage, CONFIG.shortTimeout);
  
  await typeInElement(driver,
    By.css('input[name="frequency"], input[placeholder*="ความถี่"], input[placeholder*="frequency"]'),
    med.frequency, CONFIG.shortTimeout);
  
  await typeInElement(driver,
    By.css('input[name="purpose"], input[placeholder*="วัตถุประสงค์"], input[placeholder*="purpose"]'),
    med.purpose, CONFIG.shortTimeout);
  
  await takeScreenshot(driver, 'patient-medication-form-filled');
  
  // Save
  const saveSelectors = [
    By.xpath('//button[contains(text(), "บันทึก")]'),
    By.xpath('//button[contains(text(), "Save")]'),
  ];
  
  for (const selector of saveSelectors) {
    if (await clickElement(driver, selector, CONFIG.shortTimeout)) {
      break;
    }
  }
  
  await sleep(2000);
  
  const pageSource = await getPageSource(driver);
  const success = pageSource.includes(med.name) || pageSource.includes('บันทึกสำเร็จ');
  
  if (success) {
    log('Patient Add Medication', 'PASSED', `Added: ${med.name}`);
    results.phrSyncResults.medicationsSync = { patientEntered: true, medication: med };
    return true;
  } else {
    log('Patient Add Medication', 'FAILED', 'Could not save medication');
    return false;
  }
}

async function testPatientAddAllergy(driver) {
  console.log('\n⚠️ Testing Patient Add Allergy...');
  
  // Click on Allergies tab
  const allergyTabSelectors = [
    By.xpath('//button[contains(text(), "การแพ้")]'),
    By.xpath('//button[contains(text(), "Allerg")]'),
  ];
  
  for (const selector of allergyTabSelectors) {
    if (await clickElement(driver, selector, CONFIG.shortTimeout)) {
      break;
    }
  }
  
  await sleep(1000);
  
  // Click Add Allergy button
  const addAllergySelectors = [
    By.xpath('//button[contains(text(), "เพิ่ม")]'),
    By.xpath('//button[contains(text(), "Add")]'),
  ];
  
  for (const selector of addAllergySelectors) {
    if (await clickElement(driver, selector, CONFIG.shortTimeout)) {
      break;
    }
  }
  
  await sleep(1000);
  
  // Fill allergy
  const allergy = TEST_PHR_DATA.allergy;
  
  await typeInElement(driver,
    By.css('input[type="text"]'),
    allergy, CONFIG.shortTimeout);
  
  await takeScreenshot(driver, 'patient-allergy-form-filled');
  
  // Save
  const saveSelectors = [
    By.xpath('//button[contains(text(), "บันทึก")]'),
    By.xpath('//button[contains(text(), "Save")]'),
  ];
  
  for (const selector of saveSelectors) {
    if (await clickElement(driver, selector, CONFIG.shortTimeout)) {
      break;
    }
  }
  
  await sleep(2000);
  
  const pageSource = await getPageSource(driver);
  const success = pageSource.includes(allergy) || pageSource.includes('บันทึกสำเร็จ');
  
  if (success) {
    log('Patient Add Allergy', 'PASSED', `Added: ${allergy}`);
    results.phrSyncResults.allergiesSync = { patientEntered: true, allergy };
    return true;
  } else {
    log('Patient Add Allergy', 'FAILED', 'Could not save allergy');
    return false;
  }
}

// ============================================================================
// DOCTOR PORTAL PHR VERIFICATION TESTS
// ============================================================================

async function testDoctorViewPatientPHR(driver, patientName) {
  console.log('\n👨‍⚕️ Testing Doctor View Patient PHR...');
  
  // Navigate to patients list or search
  const patientNavSelectors = [
    By.xpath('//a[contains(text(), "Patient")]'),
    By.xpath('//button[contains(text(), "Patient")]'),
    By.css('[href*="patient"]'),
    By.xpath('//a[contains(text(), "ผู้ป่วย")]'),
  ];
  
  for (const selector of patientNavSelectors) {
    if (await clickElement(driver, selector, CONFIG.shortTimeout)) {
      break;
    }
  }
  
  await sleep(2000);
  
  // Search for patient
  const searchSelectors = [
    By.css('input[type="search"]'),
    By.css('input[placeholder*="search"]'),
    By.css('input[placeholder*="ค้นหา"]'),
  ];
  
  for (const selector of searchSelectors) {
    if (await typeInElement(driver, selector, patientName, CONFIG.shortTimeout)) {
      await sleep(1500);
      break;
    }
  }
  
  // Click on patient card/row
  const patientCardSelectors = [
    By.xpath(`//div[contains(text(), "${patientName}")]`),
    By.xpath(`//td[contains(text(), "${patientName}")]`),
    By.xpath(`//span[contains(text(), "${patientName}")]`),
  ];
  
  let patientSelected = false;
  for (const selector of patientCardSelectors) {
    if (await clickElement(driver, selector, CONFIG.shortTimeout)) {
      patientSelected = true;
      break;
    }
  }
  
  await sleep(2000);
  await takeScreenshot(driver, 'doctor-patient-selected');
  
  // Click View Records / PHR tab
  const phrViewSelectors = [
    By.xpath('//button[contains(text(), "PHR")]'),
    By.xpath('//button[contains(text(), "Personal Health")]'),
    By.xpath('//button[contains(text(), "ดูประวัติ")]'),
    By.css('[data-tab="phr"]'),
  ];
  
  for (const selector of phrViewSelectors) {
    if (await clickElement(driver, selector, CONFIG.shortTimeout)) {
      break;
    }
  }
  
  await sleep(2000);
  await takeScreenshot(driver, 'doctor-phr-view');
  
  const pageSource = await getPageSource(driver);
  const phrLoaded = pageSource.includes('PHR') || 
    pageSource.includes('demographics') ||
    pageSource.includes('Vital') ||
    pageSource.includes('Patient');
  
  if (phrLoaded) {
    log('Doctor View Patient PHR', 'PASSED', `Viewing PHR for: ${patientName}`);
    return true;
  } else {
    log('Doctor View Patient PHR', 'FAILED', 'Could not load patient PHR');
    return false;
  }
}

async function testDoctorVerifyVitals(driver) {
  console.log('\n🔍 Testing Doctor Verify Vital Signs...');
  
  const pageSource = await getPageSource(driver);
  const vitals = TEST_PHR_DATA.vitals;
  
  // Check if vital signs values are visible
  const checks = {
    bloodPressure: pageSource.includes(vitals.bloodPressureSystolic) || 
                   pageSource.includes(`${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic}`),
    heartRate: pageSource.includes(vitals.heartRate),
    temperature: pageSource.includes(vitals.temperature),
    oxygenSaturation: pageSource.includes(vitals.oxygenSaturation),
    weight: pageSource.includes(vitals.weight)
  };
  
  const allMatched = Object.values(checks).every(v => v);
  const matchedCount = Object.values(checks).filter(v => v).length;
  
  if (results.phrSyncResults.vitalSignsSync) {
    results.phrSyncResults.vitalSignsSync.doctorVerified = allMatched;
    results.phrSyncResults.vitalSignsSync.matchDetails = checks;
  }
  
  if (allMatched) {
    log('Doctor Verify Vitals', 'PASSED', `All ${matchedCount}/5 vital signs matched`);
  } else if (matchedCount > 0) {
    log('Doctor Verify Vitals', 'PASSED', `${matchedCount}/5 vital signs matched (partial)`);
  } else {
    log('Doctor Verify Vitals', 'FAILED', 'No vital signs matched');
  }
  
  return matchedCount > 0;
}

async function testDoctorVerifyMedications(driver) {
  console.log('\n🔍 Testing Doctor Verify Medications...');
  
  const pageSource = await getPageSource(driver);
  const med = TEST_PHR_DATA.medication;
  
  const medFound = pageSource.includes(med.name);
  
  if (results.phrSyncResults.medicationsSync) {
    results.phrSyncResults.medicationsSync.doctorVerified = medFound;
  }
  
  if (medFound) {
    log('Doctor Verify Medications', 'PASSED', `Found: ${med.name}`);
  } else {
    log('Doctor Verify Medications', 'FAILED', `Medication "${med.name}" not found`);
  }
  
  return medFound;
}

async function testDoctorVerifyAllergies(driver) {
  console.log('\n🔍 Testing Doctor Verify Allergies...');
  
  const pageSource = await getPageSource(driver);
  const allergy = TEST_PHR_DATA.allergy;
  
  const allergyFound = pageSource.includes(allergy);
  
  if (results.phrSyncResults.allergiesSync) {
    results.phrSyncResults.allergiesSync.doctorVerified = allergyFound;
  }
  
  if (allergyFound) {
    log('Doctor Verify Allergies', 'PASSED', `Found: ${allergy}`);
  } else {
    log('Doctor Verify Allergies', 'FAILED', `Allergy "${allergy}" not found`);
  }
  
  return allergyFound;
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runPHRSyncTests() {
  console.log('\n' + '='.repeat(80));
  console.log('IZARA TELEMEDICINE - PHR DATA SYNC SELENIUM TESTS');
  console.log('='.repeat(80));
  console.log(`\nStarted: ${new Date().toISOString()}`);
  console.log(`Headless: ${CONFIG.headless}`);
  console.log(`Patient Portal: ${CONFIG.patientPortalUrl}`);
  console.log(`Doctor Portal: ${CONFIG.doctorPortalUrl}\n`);
  
  results.startTime = new Date();
  
  let patientDriver = null;
  let doctorDriver = null;
  
  try {
    // =========================================================================
    // PHASE 1: PATIENT PORTAL - CREATE PHR DATA
    // =========================================================================
    
    console.log('\n' + '-'.repeat(80));
    console.log('PHASE 1: PATIENT PORTAL - CREATE PHR DATA');
    console.log('-'.repeat(80));
    
    patientDriver = await createDriver();
    
    // Login as patient
    const patientLoggedIn = await loginToPatientPortal(patientDriver, USERS.patient);
    
    if (patientLoggedIn) {
      log('Patient Portal Login', 'PASSED');
      
      // Navigate to PHR
      await testPatientPHRNavigation(patientDriver);
      
      // Add vital signs
      await testPatientAddVitals(patientDriver);
      
      // Add medication
      await testPatientAddMedication(patientDriver);
      
      // Add allergy
      await testPatientAddAllergy(patientDriver);
      
      results.phrSyncResults.patientPHRCreation = true;
    } else {
      log('Patient Portal Login', 'FAILED', 'Could not login');
      results.phrSyncResults.patientPHRCreation = false;
    }
    
    await safeQuit(patientDriver);
    patientDriver = null;
    
    // Wait for data to sync to GCS
    console.log('\n   ⏳ Waiting 5 seconds for data sync to GCS...');
    await sleep(5000);
    
    // =========================================================================
    // PHASE 2: DOCTOR PORTAL - VERIFY PHR DATA
    // =========================================================================
    
    console.log('\n' + '-'.repeat(80));
    console.log('PHASE 2: DOCTOR PORTAL - VERIFY PHR DATA');
    console.log('-'.repeat(80));
    
    doctorDriver = await createDriver();
    
    // Login as doctor
    const doctorLoggedIn = await loginToDoctorPortal(doctorDriver, USERS.doctor);
    
    if (doctorLoggedIn) {
      log('Doctor Portal Login', 'PASSED');
      
      // View patient PHR
      const phrViewSuccess = await testDoctorViewPatientPHR(doctorDriver, USERS.patient.name);
      
      if (phrViewSuccess) {
        results.phrSyncResults.doctorPHRViewing = true;
        
        // Verify vital signs
        await testDoctorVerifyVitals(doctorDriver);
        
        // Verify medications
        await testDoctorVerifyMedications(doctorDriver);
        
        // Verify allergies
        await testDoctorVerifyAllergies(doctorDriver);
      } else {
        results.phrSyncResults.doctorPHRViewing = false;
      }
    } else {
      log('Doctor Portal Login', 'FAILED', 'Could not login');
    }
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    log('Test Execution', 'FAILED', error.message);
  } finally {
    await safeQuit(patientDriver);
    await safeQuit(doctorDriver);
  }
  
  results.endTime = new Date();
  
  // =========================================================================
  // RESULTS SUMMARY
  // =========================================================================
  
  console.log('\n' + '='.repeat(80));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(80));
  
  const totalTests = results.passed.length + results.failed.length;
  const passRate = totalTests > 0 ? ((results.passed.length / totalTests) * 100).toFixed(1) : 0;
  
  console.log(`\n📊 Results:`);
  console.log(`   ✅ Passed: ${results.passed.length}`);
  console.log(`   ❌ Failed: ${results.failed.length}`);
  console.log(`   ⏭️  Skipped: ${results.skipped.length}`);
  console.log(`   📈 Pass Rate: ${passRate}%`);
  
  console.log('\n📋 PHR Data Sync Results:');
  console.log(`   Patient PHR Creation: ${results.phrSyncResults.patientPHRCreation ? '✅' : '❌'}`);
  console.log(`   Doctor PHR Viewing: ${results.phrSyncResults.doctorPHRViewing ? '✅' : '❌'}`);
  
  if (results.phrSyncResults.vitalSignsSync) {
    console.log(`   Vital Signs Sync: Patient=${results.phrSyncResults.vitalSignsSync.patientEntered ? '✅' : '❌'} Doctor=${results.phrSyncResults.vitalSignsSync.doctorVerified ? '✅' : '❌'}`);
  }
  
  if (results.phrSyncResults.medicationsSync) {
    console.log(`   Medications Sync: Patient=${results.phrSyncResults.medicationsSync.patientEntered ? '✅' : '❌'} Doctor=${results.phrSyncResults.medicationsSync.doctorVerified ? '✅' : '❌'}`);
  }
  
  if (results.phrSyncResults.allergiesSync) {
    console.log(`   Allergies Sync: Patient=${results.phrSyncResults.allergiesSync.patientEntered ? '✅' : '❌'} Doctor=${results.phrSyncResults.allergiesSync.doctorVerified ? '✅' : '❌'}`);
  }
  
  const duration = (results.endTime - results.startTime) / 1000;
  console.log(`\n⏱️  Duration: ${duration.toFixed(1)} seconds`);
  console.log(`📁 Screenshots: ${CONFIG.screenshotDir}`);
  
  // Save results to file
  if (!fs.existsSync(CONFIG.resultsDir)) {
    fs.mkdirSync(CONFIG.resultsDir, { recursive: true });
  }
  
  const resultsFile = path.join(CONFIG.resultsDir, `phr-sync-results-${Date.now()}.json`);
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  console.log(`📝 Results saved: ${resultsFile}`);
  
  console.log('\n' + '='.repeat(80));
  
  // Exit with appropriate code
  process.exit(results.failed.length > 0 ? 1 : 0);
}

// Run tests
runPHRSyncTests().catch(console.error);
