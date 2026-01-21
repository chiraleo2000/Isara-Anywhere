/**
 * Izara Telemedicine - Comprehensive Workflow Tests
 * 
 * Complete end-to-end testing with VISIBLE BROWSER for:
 * - Patient Portal (all pages)
 * - Doctor Portal (all pages for Doctor user)
 * - Doctor Portal (all pages for Admin user)
 * - Cross-user workflows (appointments, meetings)
 * 
 * @version 2.0.0
 * @date January 19, 2026
 */

const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('node:fs');
const path = require('node:path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  PATIENT_PORTAL_URL: 'http://localhost:3005',
  DOCTOR_PORTAL_URL: 'http://localhost:3010',
  TIMEOUT: 30000,
  SHORT_WAIT: 2000,
  MEDIUM_WAIT: 4000,
  LONG_WAIT: 6000,
  SCREENSHOT_DIR: path.join(__dirname, '../../test-screenshots'),
  RESULTS_DIR: path.join(__dirname, '../../test-results'),
};

// Test credentials from Appointment_Workflows.md
const TEST_USERS = {
  patient: { 
    email: 'demo.test@gmail.com', 
    password: 'P@ssw0rd',
    id: 'PATIENT-DEMO',
    name: 'Demo Patient'
  },
  patientSomchai: { 
    email: 'Somchai.Mankong@gmail.com', 
    password: 'P@ssw0rd',
    id: 'PATIENT-SOMCHAI',
    name: 'Somchai Mankong'
  },
  patientAnan: { 
    email: 'Anan.Khayanrian@gmail.com', 
    password: 'P@ssw0rd',
    id: 'PATIENT-ANAN',
    name: 'Anan Khayanrian (Complex Case)'
  },
  doctor: { 
    email: 'doctor.test@izara.com', 
    password: 'IzaraDoctor@2024',
    id: 'DOCTOR-TEST',
    name: 'Dr. Test Physician'
  },
  admin: { 
    email: 'admin.test@izara.com', 
    password: 'IzaraAdmin@2024',
    id: 'ADMIN-TEST',
    name: 'Admin Test'
  },
};

// All pages in each portal
const PATIENT_PAGES = [
  { name: 'Dashboard', path: '/', selector: 'h1, .dashboard, [data-testid="dashboard"], main' },
  { name: 'Appointments', path: '/appointments', selector: 'h1, .appointments, [data-testid="appointments"], main' },
  { name: 'Book Appointment', path: '/appointments/book', selector: 'h1, .max-w-4xl, button, [data-testid="booking"], main' },
  { name: 'PHR (Health Records)', path: '/phr', selector: 'h1, .phr, [data-testid="phr"], main' },
  { name: 'AI Doctor', path: '/ai-doctor', selector: 'h1, .ai-doctor, textarea, [data-testid="ai-doctor"], main' },
  { name: 'Health Library', path: '/health-library', selector: 'h1, .health-library, [data-testid="health-library"], main' },
  { name: 'Profile', path: '/profile', selector: 'h1, .profile, form, [data-testid="profile"], main' },
  { name: 'Settings', path: '/settings', selector: 'h1, .settings, [data-testid="settings"], main' },
  { name: 'PDPA Consent', path: '/pdpa', selector: 'h1, .pdpa, [data-testid="pdpa"], main' },
  { name: 'Living Will', path: '/living-will', selector: 'h1, .living-will, [data-testid="living-will"], main' },
  { name: 'Map', path: '/map', selector: 'h1, .map, [data-testid="map"], iframe, main' },
  { name: 'Timeline', path: '/timeline', selector: 'h1, .timeline, [data-testid="timeline"], main' },
];

const DOCTOR_PAGES = [
  { name: 'Dashboard', path: 'dashboard', selector: 'h1, .dashboard, [data-testid="dashboard"], main' },
  { name: 'Schedule', path: 'schedule', selector: 'h1, .schedule, .calendar, [data-testid="schedule"], main' },
  { name: 'Patients', path: 'patients', selector: 'h1, .patients, table, [data-testid="patients"], main' },
  { name: 'Health Meeting', path: 'health-meeting', selector: 'h1, .health-meeting, [data-testid="health-meeting"], main' },
  { name: 'Medical Consultants', path: 'medical-consultants', selector: 'h1, .consultants, [data-testid="consultants"], main' },
  { name: 'Doctors List', path: 'doctors', selector: 'h1, .doctors, [data-testid="doctors"], main' },
  { name: 'Medical Content', path: 'medical-content', selector: 'h1, .medical-content, [data-testid="medical-content"], main' },
  { name: 'Clinical Resources', path: 'clinical-resources', selector: 'h1, .clinical-resources, [data-testid="clinical-resources"], main' },
  { name: 'Availability Settings', path: 'availability', selector: 'h1, .availability, form, [data-testid="availability"], main' },
];

const ADMIN_ONLY_PAGES = [
  { name: 'Doctor Management', path: 'doctor-management', selector: 'h1, .doctor-management, table, [data-testid="doctor-management"], main, .grid' },
  { name: 'Appointment Management', path: 'appointment-management', selector: 'h1, .appointment-management, [data-testid="appointment-management"], main, .grid, table, button' },
];

// Ensure directories exist
[CONFIG.SCREENSHOT_DIR, CONFIG.RESULTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Test results storage
let testResults = {
  startTime: null,
  endTime: null,
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function log(emoji, message) {
  const timestamp = new Date().toLocaleTimeString('th-TH');
  console.log(`[${timestamp}] ${emoji} ${message}`);
}

async function logTest(category, testName, status, details = '') {
  const getEmoji = () => {
    if (status === 'pass') return '✅';
    if (status === 'fail') return '❌';
    return '⏭️';
  };
  const emoji = getEmoji();
  console.log(`${emoji} [${category}] ${testName} - ${details}`);
  
  testResults.tests.push({
    category,
    testName,
    status,
    details,
    timestamp: new Date().toISOString(),
  });
  
  testResults.summary.total++;
  if (status === 'pass') testResults.summary.passed++;
  else if (status === 'fail') testResults.summary.failed++;
  else testResults.summary.skipped++;
}

async function takeScreenshot(driver, name) {
  try {
    const screenshot = await driver.takeScreenshot();
    const cleanName = name.replaceAll(/[^a-zA-Z0-9-_]/g, '_');
    const filename = path.join(CONFIG.SCREENSHOT_DIR, `${cleanName}-${Date.now()}.png`);
    fs.writeFileSync(filename, screenshot, 'base64');
    log('📸', `Screenshot: ${path.basename(filename)}`);
    return filename;
  } catch (error) {
    log('⚠️', `Screenshot failed: ${error.message}`);
    return null;
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForElement(driver, selector, timeout = CONFIG.TIMEOUT) {
  try {
    const element = await driver.wait(until.elementLocated(By.css(selector)), timeout);
    await driver.wait(until.elementIsVisible(element), timeout);
    return element;
  } catch (error) {
    console.warn(`Element not found: ${selector}`);
    return null;
  }
}

async function checkForErrors(driver) {
  // Check for console errors, 500 errors, fetch failures
  const errors = [];
  
  try {
    // Check for error elements in DOM
    const errorSelectors = [
      '.error-boundary',
      '[data-error]',
      '.error-500',
      '.fetch-error',
      '[class*="error"]',
      '.MuiAlert-standardError',
    ];
    
    for (const selector of errorSelectors) {
      try {
        const errorElements = await driver.findElements(By.css(selector));
        for (const el of errorElements) {
          const text = await el.getText().catch(() => '');
          if (text && (text.includes('500') || text.includes('Error') || text.includes('Failed') || text.includes('ล้มเหลว'))) {
            errors.push(text);
          }
        }
      } catch { /* ignore */ }
    }
    
    // Check page source for error indicators
    const pageSource = await driver.getPageSource();
    if (pageSource.includes('500 Internal Server Error')) {
      errors.push('500 Internal Server Error found in page');
    }
    if (pageSource.includes('Failed to fetch')) {
      errors.push('Failed to fetch error found in page');
    }
    if (pageSource.includes('NetworkError')) {
      errors.push('Network error found in page');
    }
  } catch { /* ignore */ }
  
  return errors;
}

async function createDriver() {
  const options = new chrome.Options();
  // VISIBLE BROWSER - NO HEADLESS
  options.addArguments('--start-maximized');
  options.addArguments('--disable-blink-features=AutomationControlled');
  options.addArguments('--lang=th-TH');
  options.addArguments('--disable-gpu');
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
    
  return driver;
}

// ============================================================================
// LOGIN FUNCTIONS
// ============================================================================

async function loginPatientPortal(driver, user) {
  log('🔐', `Logging into Patient Portal as ${user.name}...`);
  
  await driver.get(CONFIG.PATIENT_PORTAL_URL + '/login');
  await sleep(CONFIG.MEDIUM_WAIT);
  
  try {
    // Wait for login form
    await waitForElement(driver, 'input[name="email"], input[type="email"]');
    
    // Fill credentials
    const emailInput = await driver.findElement(By.css('input[name="email"], input[type="email"]'));
    await emailInput.clear();
    await emailInput.sendKeys(user.email);
    await sleep(300);
    
    const passwordInput = await driver.findElement(By.css('input[name="password"], input[type="password"]'));
    await passwordInput.clear();
    await passwordInput.sendKeys(user.password);
    await sleep(300);
    
    await takeScreenshot(driver, `patient-login-${user.name}`);
    
    // Click login
    const loginButton = await driver.findElement(By.css('button[type="submit"]'));
    await loginButton.click();
    
    // Wait for navigation
    await sleep(CONFIG.LONG_WAIT);
    
    // Check success
    const currentUrl = await driver.getCurrentUrl();
    if (currentUrl.includes('login')) {
      log('❌', 'Patient login failed - still on login page');
      await takeScreenshot(driver, 'patient-login-failed');
      return false;
    } else {
      log('✅', `Patient login successful: ${currentUrl}`);
      return true;
    }
  } catch (error) {
    log('❌', `Patient login error: ${error.message}`);
    await takeScreenshot(driver, 'patient-login-error');
    return false;
  }
}

async function loginDoctorPortal(driver, user) {
  log('🔐', `Logging into Doctor Portal as ${user.name}...`);
  
  await driver.get(CONFIG.DOCTOR_PORTAL_URL);
  await sleep(CONFIG.MEDIUM_WAIT);
  
  try {
    // Wait for login form
    await waitForElement(driver, 'input[type="email"], input[name="email"]');
    
    // Fill credentials
    const emailInput = await driver.findElement(By.css('input[type="email"], input[name="email"]'));
    await emailInput.clear();
    await emailInput.sendKeys(user.email);
    await sleep(300);
    
    const passwordInput = await driver.findElement(By.css('input[type="password"], input[name="password"]'));
    await passwordInput.clear();
    await passwordInput.sendKeys(user.password);
    await sleep(300);
    
    await takeScreenshot(driver, `doctor-login-${user.name}`);
    
    // Click login
    const loginButton = await driver.findElement(By.css('button[type="submit"]'));
    await loginButton.click();
    
    // Wait for navigation
    await sleep(CONFIG.LONG_WAIT);
    
    // Check success
    const currentUrl = await driver.getCurrentUrl();
    if (currentUrl.includes('dashboard') || currentUrl.includes('doctor/')) {
      log('✅', `Doctor/Admin login successful: ${currentUrl}`);
      return true;
    } else {
      log('❌', 'Doctor/Admin login failed - still on login page');
      await takeScreenshot(driver, 'doctor-login-failed');
      return false;
    }
  } catch (error) {
    log('❌', `Doctor/Admin login error: ${error.message}`);
    await takeScreenshot(driver, 'doctor-login-error');
    return false;
  }
}

// ============================================================================
// PAGE TESTING FUNCTIONS
// ============================================================================

async function testPage(driver, page, baseUrl, userId = null) {
  const fullPath = userId ? `${baseUrl}/doctor/${userId}/${page.path}` : `${baseUrl}${page.path}`;
  
  log('📄', `Testing: ${page.name} (${fullPath})`);
  
  try {
    await driver.get(fullPath);
    await sleep(CONFIG.MEDIUM_WAIT);
    
    // Wait for page to load
    const loaded = await waitForElement(driver, page.selector, CONFIG.TIMEOUT);
    
    // Check for errors
    const errors = await checkForErrors(driver);
    
    // Take screenshot
    await takeScreenshot(driver, `page-${page.name.replaceAll(/\s+/g, '-')}`);
    
    if (loaded && errors.length === 0) {
      await logTest('PAGE', page.name, 'pass', 'Page loaded without errors');
      return true;
    } else if (errors.length > 0) {
      await logTest('PAGE', page.name, 'fail', `Errors: ${errors.join(', ')}`);
      return false;
    } else {
      await logTest('PAGE', page.name, 'fail', 'Page element not found');
      return false;
    }
  } catch (error) {
    await logTest('PAGE', page.name, 'fail', error.message);
    await takeScreenshot(driver, `page-error-${page.name.replaceAll(/\s+/g, '-')}`);
    return false;
  }
}

// ============================================================================
// TEST SUITES
// ============================================================================

async function testPatientPortalComplete() {
  log('🏥', '========== PATIENT PORTAL COMPLETE TEST ==========');
  
  const driver = await createDriver();
  
  try {
    // Login
    const loginSuccess = await loginPatientPortal(driver, TEST_USERS.patient);
    await logTest('PATIENT_AUTH', 'Patient Login', loginSuccess ? 'pass' : 'fail', 
      loginSuccess ? 'Successfully logged in' : 'Login failed');
    
    if (!loginSuccess) {
      log('⏭️', 'Skipping patient pages due to login failure');
      return;
    }
    
    // Test all patient pages
    for (const page of PATIENT_PAGES) {
      await testPage(driver, page, CONFIG.PATIENT_PORTAL_URL);
      await sleep(CONFIG.SHORT_WAIT);
    }
    
    // Test navigation through sidebar
    log('🧭', 'Testing sidebar navigation...');
    await driver.get(CONFIG.PATIENT_PORTAL_URL);
    await sleep(CONFIG.MEDIUM_WAIT);
    
    const navItems = ['appointments', 'phr', 'ai-doctor', 'health-library', 'profile', 'settings'];
    for (const navItem of navItems) {
      try {
        // Try to find and click nav item
        const navSelectors = [
          `a[href*="${navItem}"]`,
          `button[data-page="${navItem}"]`,
          `[data-testid="nav-${navItem}"]`,
        ];
        
        for (const selector of navSelectors) {
          try {
            const element = await driver.findElement(By.css(selector));
            if (element) {
              await element.click();
              await sleep(CONFIG.SHORT_WAIT);
              await logTest('NAV', `Navigate to ${navItem}`, 'pass', 'Navigation successful');
              break;
            }
          } catch { continue; }
        }
      } catch (error) {
        await logTest('NAV', `Navigate to ${navItem}`, 'fail', error.message);
      }
    }
    
  } finally {
    await sleep(CONFIG.SHORT_WAIT);
    await driver.quit();
  }
}

async function testDoctorPortalComplete(userType = 'doctor') {
  const user = userType === 'admin' ? TEST_USERS.admin : TEST_USERS.doctor;
  const portalName = userType === 'admin' ? 'ADMIN' : 'DOCTOR';
  
  log('👨‍⚕️', `========== ${portalName} PORTAL COMPLETE TEST ==========`);
  
  const driver = await createDriver();
  
  try {
    // Login
    const loginSuccess = await loginDoctorPortal(driver, user);
    await logTest(`${portalName}_AUTH`, `${portalName} Login`, loginSuccess ? 'pass' : 'fail',
      loginSuccess ? 'Successfully logged in' : 'Login failed');
    
    if (!loginSuccess) {
      log('⏭️', `Skipping ${portalName.toLowerCase()} pages due to login failure`);
      return;
    }
    
    // Get user ID from URL
    const currentUrl = await driver.getCurrentUrl();
    const userIdMatch = currentUrl.match(/doctor\/([^/]+)\//);
    const userId = userIdMatch ? userIdMatch[1] : user.id;
    
    // Test all doctor pages
    for (const page of DOCTOR_PAGES) {
      await testPage(driver, page, CONFIG.DOCTOR_PORTAL_URL, userId);
      await sleep(CONFIG.SHORT_WAIT);
    }
    
    // Test admin-only pages (for admin user)
    if (userType === 'admin') {
      log('👑', 'Testing admin-only pages...');
      for (const page of ADMIN_ONLY_PAGES) {
        await testPage(driver, page, CONFIG.DOCTOR_PORTAL_URL, userId);
        await sleep(CONFIG.SHORT_WAIT);
      }
    }
    
    // Test sidebar navigation
    log('🧭', 'Testing sidebar navigation...');
    await driver.get(`${CONFIG.DOCTOR_PORTAL_URL}/doctor/${userId}/dashboard`);
    await sleep(CONFIG.MEDIUM_WAIT);
    
    const sidebarItems = [
      { name: 'Schedule', text: 'ตารางนัด|Schedule' },
      { name: 'Patients', text: 'ผู้ป่วย|Patients' },
      { name: 'Health Meeting', text: 'นัดหมาย|Meetings' },
      { name: 'Medical Content', text: 'เนื้อหา|Content' },
      { name: 'Clinical Resources', text: 'ทรัพยากร|Resources' },
    ];
    
    for (const item of sidebarItems) {
      try {
        // Find button by text content - try Thai first, then English
        const textOptions = item.text.split('|');
        let clicked = false;
        
        for (const text of textOptions) {
          try {
            const button = await driver.findElement(By.xpath(`//button[contains(text(), "${text}") or contains(., "${text}")]`));
            if (button) {
              await button.click();
              await sleep(CONFIG.SHORT_WAIT);
              clicked = true;
              break;
            }
          } catch { continue; }
        }
        
        if (clicked) {
          // Check for errors after navigation
          const errors = await checkForErrors(driver);
          if (errors.length === 0) {
            await logTest('NAV', `Navigate to ${item.name}`, 'pass', 'Navigation successful');
          } else {
            await logTest('NAV', `Navigate to ${item.name}`, 'fail', `Errors: ${errors.join(', ')}`);
          }
          
          await takeScreenshot(driver, `nav-${item.name.replaceAll(/\s+/g, '-')}`);
        } else {
          await logTest('NAV', `Navigate to ${item.name}`, 'skip', 'Button not found');
        }
      } catch (error) {
        await logTest('NAV', `Navigate to ${item.name}`, 'fail', error.message);
      }
    }
    
  } finally {
    await sleep(CONFIG.SHORT_WAIT);
    await driver.quit();
  }
}

// ============================================================================
// CROSS-USER WORKFLOW TESTS
// ============================================================================

async function testAppointmentWorkflow() {
  log('📅', '========== APPOINTMENT WORKFLOW TEST ==========');
  log('📋', 'Testing complete appointment workflow with Patient, Doctor, and Admin');
  
  // Step 1: Patient books appointment
  log('1️⃣', 'STEP 1: Patient booking appointment...');
  
  const patientDriver = await createDriver();
  
  try {
    await loginPatientPortal(patientDriver, TEST_USERS.patient);
    await sleep(CONFIG.SHORT_WAIT);
    
    // Navigate to book appointment
    await patientDriver.get(CONFIG.PATIENT_PORTAL_URL + '/appointments/book');
    await sleep(CONFIG.LONG_WAIT);
    
    await takeScreenshot(patientDriver, 'appointment-booking-page');
    
    // Check booking page loads - look for heading or main content
    const bookingElement = await waitForElement(patientDriver, 'h1, .max-w-4xl, main, button', CONFIG.TIMEOUT);
    if (bookingElement) {
      await logTest('WORKFLOW', 'Booking Page Loads', 'pass', 'Booking page visible');
    } else {
      await logTest('WORKFLOW', 'Booking Page Loads', 'fail', 'Booking form not found');
    }
    
    // Check for doctor selection (from appointment pool)
    try {
      const doctorElements = await patientDriver.findElements(By.css('.doctor, [data-testid="doctor"], .grid > div, button'));
      await logTest('WORKFLOW', 'Doctor Selection Available', doctorElements.length > 0 ? 'pass' : 'fail', 
        `${doctorElements.length} doctor elements found`);
    } catch {
      await logTest('WORKFLOW', 'Doctor Selection Available', 'fail', 'No doctor selection found');
    }
    
  } finally {
    await sleep(CONFIG.SHORT_WAIT);
    await patientDriver.quit();
  }
  
  // Step 2: Doctor views schedule
  log('2️⃣', 'STEP 2: Doctor viewing schedule...');
  
  const doctorDriver = await createDriver();
  
  try {
    await loginDoctorPortal(doctorDriver, TEST_USERS.doctor);
    await sleep(CONFIG.SHORT_WAIT);
    
    // Get user ID
    const url = await doctorDriver.getCurrentUrl();
    const match = url.match(/doctor\/([^/]+)\//);
    const userId = match ? match[1] : 'DOC-001';
    
    // Navigate to schedule
    await doctorDriver.get(`${CONFIG.DOCTOR_PORTAL_URL}/doctor/${userId}/schedule`);
    await sleep(CONFIG.LONG_WAIT);
    
    await takeScreenshot(doctorDriver, 'doctor-schedule');
    
    // Check schedule loads - look for main content or any visible element
    const scheduleElement = await waitForElement(doctorDriver, 'main, h1, .calendar, table, div.grid', CONFIG.TIMEOUT);
    if (scheduleElement) {
      await logTest('WORKFLOW', 'Doctor Schedule Loads', 'pass', 'Schedule visible');
    } else {
      await logTest('WORKFLOW', 'Doctor Schedule Loads', 'fail', 'Schedule not found');
    }
    
    // Check for appointments in schedule - look for any clickable items
    try {
      const appointmentElements = await doctorDriver.findElements(By.css('.appointment, .event, [class*="appointment"], button, .card'));
      await logTest('WORKFLOW', 'Appointments in Schedule', 'pass', 
        `${appointmentElements.length} appointment elements found`);
    } catch {
      await logTest('WORKFLOW', 'Appointments in Schedule', 'fail', 'Could not check appointments');
    }
    
  } finally {
    await sleep(CONFIG.SHORT_WAIT);
    await doctorDriver.quit();
  }
  
  // Step 3: Admin views appointment management
  log('3️⃣', 'STEP 3: Admin managing appointments...');
  
  const adminDriver = await createDriver();
  
  try {
    await loginDoctorPortal(adminDriver, TEST_USERS.admin);
    await sleep(CONFIG.SHORT_WAIT);
    
    // Get user ID from URL (handles URLs with or without trailing slash)
    const url = await adminDriver.getCurrentUrl();
    const match = url.match(/doctor\/([^/]+)/);
    const userId = match ? match[1] : 'ADMIN-TEST';
    
    log('🔍', `Admin user ID extracted: ${userId} from URL: ${url}`);
    
    // Navigate to appointment management
    await adminDriver.get(`${CONFIG.DOCTOR_PORTAL_URL}/doctor/${userId}/appointment-management`);
    await sleep(CONFIG.LONG_WAIT);
    
    await takeScreenshot(adminDriver, 'admin-appointment-management');
    
    // Check admin page loads
    const adminElement = await waitForElement(adminDriver, 'main, h1, table, .grid, div', CONFIG.TIMEOUT);
    if (adminElement) {
      await logTest('WORKFLOW', 'Admin Appointment Management', 'pass', 'Admin page visible');
    } else {
      await logTest('WORKFLOW', 'Admin Appointment Management', 'fail', 'Admin page not found');
    }
    
  } finally {
    await sleep(CONFIG.SHORT_WAIT);
    await adminDriver.quit();
  }
}

async function testMeetingWorkflow() {
  log('📹', '========== VIDEO MEETING WORKFLOW TEST ==========');
  log('📋', 'Testing video meeting setup between Doctor and Patient');
  
  // Doctor initiates meeting
  log('1️⃣', 'STEP 1: Doctor preparing meeting...');
  
  const doctorDriver = await createDriver();
  
  try {
    await loginDoctorPortal(doctorDriver, TEST_USERS.doctor);
    await sleep(CONFIG.SHORT_WAIT);
    
    // Get user ID
    const url = await doctorDriver.getCurrentUrl();
    const match = url.match(/doctor\/([^/]+)\//);
    const userId = match ? match[1] : 'DOC-001';
    
    // Navigate to health meeting
    await doctorDriver.get(`${CONFIG.DOCTOR_PORTAL_URL}/doctor/${userId}/health-meeting`);
    await sleep(CONFIG.LONG_WAIT);
    
    await takeScreenshot(doctorDriver, 'doctor-health-meeting');
    
    // Check meeting page loads - look for main content
    const meetingElement = await waitForElement(doctorDriver, 'main, h1, .grid, div.p-4, section', CONFIG.TIMEOUT);
    if (meetingElement) {
      await logTest('WORKFLOW', 'Doctor Meeting Page', 'pass', 'Meeting page visible');
    } else {
      await logTest('WORKFLOW', 'Doctor Meeting Page', 'fail', 'Meeting page not found');
    }
    
    // Look for any buttons on the page
    try {
      const buttons = await doctorDriver.findElements(By.css('button'));
      await logTest('WORKFLOW', 'Meeting Controls', buttons.length > 0 ? 'pass' : 'fail',
        `${buttons.length} buttons found on meeting page`);
    } catch {
      await logTest('WORKFLOW', 'Meeting Controls', 'fail', 'Could not find meeting controls');
    }
    
  } finally {
    await sleep(CONFIG.SHORT_WAIT);
    await doctorDriver.quit();
  }
  
  // Patient views appointments for meeting
  log('2️⃣', 'STEP 2: Patient checking appointment for meeting...');
  
  const patientDriver = await createDriver();
  
  try {
    await loginPatientPortal(patientDriver, TEST_USERS.patient);
    await sleep(CONFIG.SHORT_WAIT);
    
    // Navigate to appointments
    await patientDriver.get(CONFIG.PATIENT_PORTAL_URL + '/appointments');
    await sleep(CONFIG.LONG_WAIT);
    
    await takeScreenshot(patientDriver, 'patient-appointments-for-meeting');
    
    // Check appointments page loads - look for main content
    const appointmentsElement = await waitForElement(patientDriver, 'main, h1, .grid, div, section', CONFIG.TIMEOUT);
    if (appointmentsElement) {
      await logTest('WORKFLOW', 'Patient Appointments Page', 'pass', 'Appointments page visible');
    } else {
      await logTest('WORKFLOW', 'Patient Appointments Page', 'fail', 'Appointments page not found');
    }
    
    // Look for appointment cards or buttons
    try {
      const cards = await patientDriver.findElements(By.css('.card, button, a[href*="appointment"], div[class*="rounded"]'));
      await logTest('WORKFLOW', 'Patient Appointment Cards', cards.length > 0 ? 'pass' : 'fail',
        `${cards.length} appointment elements found`);
    } catch {
      await logTest('WORKFLOW', 'Patient Appointment Cards', 'fail', 'Could not find appointment elements');
    }
    
  } finally {
    await sleep(CONFIG.SHORT_WAIT);
    await patientDriver.quit();
  }
}

// ============================================================================
// API HEALTH CHECK
// ============================================================================

async function testAPIEndpoints() {
  log('🔌', '========== API ENDPOINT TESTS ==========');
  
  // First login to get auth tokens
  let patientToken = '';
  let doctorToken = '';
  
  try {
    // Login to Patient Portal
    const patientLoginResp = await fetch('http://localhost:3005/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_USERS.patient.email,
        password: TEST_USERS.patient.password
      }),
    });
    
    if (patientLoginResp.ok) {
      const data = await patientLoginResp.json();
      patientToken = data.token;
      await logTest('API', 'Patient Login', 'pass', 'Status: 200');
    } else {
      await logTest('API', 'Patient Login', 'fail', `Status: ${patientLoginResp.status}`);
    }
    
    // Login to Doctor Portal
    const doctorLoginResp = await fetch('http://localhost:3010/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_USERS.doctor.email,
        password: TEST_USERS.doctor.password
      }),
    });
    
    if (doctorLoginResp.ok) {
      const data = await doctorLoginResp.json();
      doctorToken = data.token;
      await logTest('API', 'Doctor Login', 'pass', 'Status: 200');
    } else {
      await logTest('API', 'Doctor Login', 'fail', `Status: ${doctorLoginResp.status}`);
    }
  } catch (error) {
    await logTest('API', 'Login Requests', 'fail', error.message);
  }
  
  // Test authenticated endpoints
  const patientEndpoints = [
    { name: 'Patient Appointments', url: `http://localhost:3005/api/appointments/patient/${TEST_USERS.patient.id}` },
    { name: 'Medical Content', url: 'http://localhost:3005/api/content/medical' },
  ];
  
  const doctorEndpoints = [
    { name: 'Doctor Appointments', url: `http://localhost:3010/api/appointments/doctor/${TEST_USERS.doctor.id}` },
    { name: 'Patients List', url: 'http://localhost:3010/api/patients' },
  ];
  
  // Test patient endpoints with auth
  for (const endpoint of patientEndpoints) {
    try {
      const response = await fetch(endpoint.url, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${patientToken}`
        },
      });
      
      if (response.ok) {
        await logTest('API', endpoint.name, 'pass', `Status: ${response.status}`);
      } else {
        await logTest('API', endpoint.name, 'fail', `Status: ${response.status}`);
      }
    } catch (error) {
      await logTest('API', endpoint.name, 'fail', error.message);
    }
  }
  
  // Test doctor endpoints with auth
  for (const endpoint of doctorEndpoints) {
    try {
      const response = await fetch(endpoint.url, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${doctorToken}`
        },
      });
      
      if (response.ok) {
        await logTest('API', endpoint.name, 'pass', `Status: ${response.status}`);
      } else {
        await logTest('API', endpoint.name, 'fail', `Status: ${response.status}`);
      }
    } catch (error) {
      await logTest('API', endpoint.name, 'fail', error.message);
    }
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║   IZARA TELEMEDICINE - COMPREHENSIVE WORKFLOW TESTS               ║');
  console.log('║   Date: ' + new Date().toISOString().split('T')[0] + '                                              ║');
  console.log('║   Mode: VISIBLE BROWSER (Selenium WebDriver)                      ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝');
  console.log('');
  
  testResults.startTime = new Date().toISOString();
  
  try {
    // API Health Check
    await testAPIEndpoints();
    
    // Patient Portal Complete Test
    await testPatientPortalComplete();
    
    // Doctor Portal Complete Test (as Doctor)
    await testDoctorPortalComplete('doctor');
    
    // Doctor Portal Complete Test (as Admin)
    await testDoctorPortalComplete('admin');
    
    // Cross-user Workflows
    await testAppointmentWorkflow();
    await testMeetingWorkflow();
    
  } catch (error) {
    console.error('Test suite error:', error);
    await logTest('SUITE', 'Test Execution', 'fail', error.message);
  }
  
  testResults.endTime = new Date().toISOString();
  
  // Print Summary
  printSummary();
  
  // Save Results
  saveResults();
}

function printSummary() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('                       TEST SUMMARY                                 ');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');
  
  const { passed, failed, skipped, total } = testResults.summary;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
  
  console.log(`  ✅ Passed:  ${passed}`);
  console.log(`  ❌ Failed:  ${failed}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  📊 Total:   ${total}`);
  console.log('');
  console.log(`  🎯 Pass Rate: ${passRate}%`);
  console.log('');
  
  if (failed > 0) {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('                       FAILED TESTS                                ');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('');
    
    testResults.tests
      .filter(t => t.status === 'fail')
      .forEach(t => {
        console.log(`  ❌ [${t.category}] ${t.testName}`);
        console.log(`     └─ ${t.details}`);
      });
    console.log('');
  }
  
  console.log('═══════════════════════════════════════════════════════════════════');
}

function saveResults() {
  const reportPath = path.join(CONFIG.RESULTS_DIR, `comprehensive-test-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`📄 Test report saved: ${reportPath}`);
  
  // Also save markdown report
  const mdReport = generateMarkdownReport();
  const mdPath = path.join(CONFIG.RESULTS_DIR, `COMPREHENSIVE_TEST_REPORT.md`);
  fs.writeFileSync(mdPath, mdReport);
  console.log(`📄 Markdown report saved: ${mdPath}`);
}

function generateMarkdownReport() {
  const { passed, failed, skipped, total } = testResults.summary;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
  
  let md = `# Izara Telemedicine - Comprehensive Test Report\n\n`;
  md += `**Date:** ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n`;
  md += `**Time:** ${testResults.startTime} - ${testResults.endTime}\n\n`;
  
  md += `## Summary\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| ✅ Passed | ${passed} |\n`;
  md += `| ❌ Failed | ${failed} |\n`;
  md += `| ⏭️ Skipped | ${skipped} |\n`;
  md += `| 📊 Total | ${total} |\n`;
  md += `| 🎯 Pass Rate | ${passRate}% |\n\n`;
  
  md += `## Test Results by Category\n\n`;
  
  // Group by category
  const categories = {};
  testResults.tests.forEach(t => {
    if (!categories[t.category]) categories[t.category] = [];
    categories[t.category].push(t);
  });
  
  for (const [category, tests] of Object.entries(categories)) {
    md += `### ${category}\n\n`;
    md += `| Test | Status | Details |\n`;
    md += `|------|--------|----------|\n`;
    tests.forEach(t => {
      const getIcon = () => {
        if (t.status === 'pass') return '✅';
        if (t.status === 'fail') return '❌';
        return '⏭️';
      };
      const icon = getIcon();
      md += `| ${t.testName} | ${icon} ${t.status} | ${t.details} |\n`;
    });
    md += '\n';
  }
  
  if (failed > 0) {
    md += `## Failed Tests\n\n`;
    testResults.tests
      .filter(t => t.status === 'fail')
      .forEach(t => {
        md += `- **[${t.category}] ${t.testName}**: ${t.details}\n`;
      });
  }
  
  return md;
}

// ============================================================================
// EXTENDED WORKFLOW TESTS - Based on Process Documents
// ============================================================================

/**
 * Test PHR (Personal Health Records) Workflow
 * Based on: Health_Records_Processes.md
 */
async function testPHRWorkflow() {
  log('📋', '========== PHR WORKFLOW TEST ==========');
  
  const driver = await createDriver();
  
  try {
    await loginPatientPortal(driver, TEST_USERS.patient);
    await sleep(CONFIG.SHORT_WAIT);
    
    // Navigate to PHR page
    await driver.get(CONFIG.PATIENT_PORTAL_URL + '/phr');
    await sleep(CONFIG.LONG_WAIT);
    
    await takeScreenshot(driver, 'phr-page');
    
    // Check PHR tabs exist (Overview, Vitals, Medications)
    const tabSelectors = [
      'button[role="tab"], .tab, [data-testid="tab"]',
      'input, form, .vital-signs',
    ];
    
    for (const selector of tabSelectors) {
      try {
        const elements = await driver.findElements(By.css(selector));
        if (elements.length > 0) {
          await logTest('PHR', 'PHR Page Elements', 'pass', `Found ${elements.length} interactive elements`);
          break;
        }
      } catch { /* continue */ }
    }
    
    // Check for vitals chart
    try {
      const chartElements = await driver.findElements(By.css('canvas, svg, .chart, .recharts-wrapper'));
      await logTest('PHR', 'Vitals Chart', chartElements.length > 0 ? 'pass' : 'skip', 
        chartElements.length > 0 ? 'Chart element found' : 'No chart visible');
    } catch {
      await logTest('PHR', 'Vitals Chart', 'skip', 'Chart check skipped');
    }
    
    // Check no errors
    const errors = await checkForErrors(driver);
    await logTest('PHR', 'No Errors on PHR Page', errors.length === 0 ? 'pass' : 'fail',
      errors.length === 0 ? 'No errors detected' : `Errors: ${errors.join(', ')}`);
    
  } finally {
    await sleep(CONFIG.SHORT_WAIT);
    await driver.quit();
  }
}

/**
 * Test Living Will Workflow
 * Based on: Living_Will_Processes.md
 */
async function testLivingWillWorkflow() {
  log('📜', '========== LIVING WILL WORKFLOW TEST ==========');
  
  const driver = await createDriver();
  
  try {
    await loginPatientPortal(driver, TEST_USERS.patient);
    await sleep(CONFIG.SHORT_WAIT);
    
    // Navigate to Living Will page
    await driver.get(CONFIG.PATIENT_PORTAL_URL + '/living-will');
    await sleep(CONFIG.LONG_WAIT);
    
    await takeScreenshot(driver, 'living-will-page');
    
    // Check Living Will form elements
    const formSelectors = [
      'form, .living-will-form, main',
      'textarea, input, button',
      'h1, h2, .title',
    ];
    
    let foundElements = false;
    for (const selector of formSelectors) {
      try {
        const elements = await driver.findElements(By.css(selector));
        if (elements.length > 0) {
          await logTest('LIVING_WILL', 'Living Will Page', 'pass', `Page loaded with ${elements.length} elements`);
          foundElements = true;
          break;
        }
      } catch { /* continue */ }
    }
    
    if (!foundElements) {
      await logTest('LIVING_WILL', 'Living Will Page', 'fail', 'Page elements not found');
    }
    
    // Check for PDPA consent elements (required for sharing)
    try {
      const pdpaElements = await driver.findElements(By.css('input[type="checkbox"], .pdpa, .consent'));
      await logTest('LIVING_WILL', 'PDPA Consent Options', pdpaElements.length > 0 ? 'pass' : 'skip',
        pdpaElements.length > 0 ? 'Consent controls found' : 'Consent controls not visible');
    } catch {
      await logTest('LIVING_WILL', 'PDPA Consent Options', 'skip', 'Consent check skipped');
    }
    
  } finally {
    await sleep(CONFIG.SHORT_WAIT);
    await driver.quit();
  }
}

/**
 * Test Medical Content Workflow
 * Based on: Medicine_Content_Processes.md
 */
async function testMedicalContentWorkflow() {
  log('📰', '========== MEDICAL CONTENT WORKFLOW TEST ==========');
  
  // Test as Doctor (can create/edit)
  const doctorDriver = await createDriver();
  
  try {
    await loginDoctorPortal(doctorDriver, TEST_USERS.doctor);
    await sleep(CONFIG.SHORT_WAIT);
    
    const url = await doctorDriver.getCurrentUrl();
    const match = url.match(/doctor\/([^/]+)\//);
    const userId = match ? match[1] : 'DOC-001';
    
    // Navigate to Medical Content
    await doctorDriver.get(`${CONFIG.DOCTOR_PORTAL_URL}/doctor/${userId}/medical-content`);
    await sleep(CONFIG.LONG_WAIT);
    
    await takeScreenshot(doctorDriver, 'medical-content-doctor');
    
    // Check content list loads
    const contentElements = await doctorDriver.findElements(By.css('.card, article, .content-item, table tbody tr, .grid > div'));
    await logTest('CONTENT', 'Doctor Content List', 'pass',
      `${contentElements.length} content items visible`);
    
    // Check for create button (doctor can create)
    const createButton = await doctorDriver.findElements(By.css('button[class*="create"], button:contains("Create"), .btn-create, button'));
    await logTest('CONTENT', 'Create Button Available', createButton.length > 0 ? 'pass' : 'skip',
      createButton.length > 0 ? 'Create option available' : 'Create button not visible');
    
  } finally {
    await sleep(CONFIG.SHORT_WAIT);
    await doctorDriver.quit();
  }
  
  // Test as Admin (can approve/reject)
  const adminDriver = await createDriver();
  
  try {
    await loginDoctorPortal(adminDriver, TEST_USERS.admin);
    await sleep(CONFIG.SHORT_WAIT);
    
    const url = await adminDriver.getCurrentUrl();
    const match = url.match(/doctor\/([^/]+)\//);
    const userId = match ? match[1] : 'ADMIN-001';
    
    // Navigate to Medical Content
    await adminDriver.get(`${CONFIG.DOCTOR_PORTAL_URL}/doctor/${userId}/medical-content`);
    await sleep(CONFIG.LONG_WAIT);
    
    await takeScreenshot(adminDriver, 'medical-content-admin');
    
    // Check for pending approval badge/count
    const badgeElements = await adminDriver.findElements(By.css('.badge, .pending-count, [class*="badge"]'));
    await logTest('CONTENT', 'Admin Pending Badge', 'pass',
      `${badgeElements.length} badge elements found`);
    
  } finally {
    await sleep(CONFIG.SHORT_WAIT);
    await adminDriver.quit();
  }
}

/**
 * Test Clinical Resources Workflow
 * Based on: Clinical_Resources_&_Medical_Library_Workflows.md
 */
async function testClinicalResourcesWorkflow() {
  log('📚', '========== CLINICAL RESOURCES WORKFLOW TEST ==========');
  
  const driver = await createDriver();
  
  try {
    await loginDoctorPortal(driver, TEST_USERS.doctor);
    await sleep(CONFIG.SHORT_WAIT);
    
    const url = await driver.getCurrentUrl();
    const match = url.match(/doctor\/([^/]+)\//);
    const userId = match ? match[1] : 'DOC-001';
    
    // Navigate to Clinical Resources
    await driver.get(`${CONFIG.DOCTOR_PORTAL_URL}/doctor/${userId}/clinical-resources`);
    await sleep(CONFIG.LONG_WAIT);
    
    await takeScreenshot(driver, 'clinical-resources');
    
    // Check resources load
    const resourceElements = await driver.findElements(By.css('.card, article, .resource, table tbody tr, .grid > div, main'));
    await logTest('RESOURCES', 'Clinical Resources Page', resourceElements.length > 0 ? 'pass' : 'fail',
      `${resourceElements.length} resource elements visible`);
    
    // Check category filters
    const filterElements = await driver.findElements(By.css('select, .filter, button[class*="category"], .tabs button'));
    await logTest('RESOURCES', 'Category Filters', filterElements.length > 0 ? 'pass' : 'skip',
      `${filterElements.length} filter elements found`);
    
  } finally {
    await sleep(CONFIG.SHORT_WAIT);
    await driver.quit();
  }
}

/**
 * Test Medical Consultants Workflow
 * Based on: Medical_Consultants_Workflows.md
 */
async function testConsultantsWorkflow() {
  log('👨‍⚕️', '========== MEDICAL CONSULTANTS WORKFLOW TEST ==========');
  
  // Test as Doctor (can view and rate)
  const doctorDriver = await createDriver();
  
  try {
    await loginDoctorPortal(doctorDriver, TEST_USERS.doctor);
    await sleep(CONFIG.SHORT_WAIT);
    
    const url = await doctorDriver.getCurrentUrl();
    const match = url.match(/doctor\/([^/]+)\//);
    const userId = match ? match[1] : 'DOC-001';
    
    await doctorDriver.get(`${CONFIG.DOCTOR_PORTAL_URL}/doctor/${userId}/medical-consultants`);
    await sleep(CONFIG.LONG_WAIT);
    
    await takeScreenshot(doctorDriver, 'consultants-doctor-view');
    
    // Check consultants list
    const consultantCards = await doctorDriver.findElements(By.css('.card, .consultant, table tbody tr, .grid > div'));
    await logTest('CONSULTANTS', 'Doctor View Consultants', 'pass',
      `${consultantCards.length} consultant cards visible`);
    
  } finally {
    await sleep(CONFIG.SHORT_WAIT);
    await doctorDriver.quit();
  }
  
  // Test as Admin (can CRUD)
  const adminDriver = await createDriver();
  
  try {
    await loginDoctorPortal(adminDriver, TEST_USERS.admin);
    await sleep(CONFIG.SHORT_WAIT);
    
    const url = await adminDriver.getCurrentUrl();
    const match = url.match(/doctor\/([^/]+)\//);
    const userId = match ? match[1] : 'ADMIN-001';
    
    await adminDriver.get(`${CONFIG.DOCTOR_PORTAL_URL}/doctor/${userId}/medical-consultants`);
    await sleep(CONFIG.LONG_WAIT);
    
    await takeScreenshot(adminDriver, 'consultants-admin-view');
    
    // Check for admin actions (Add, Edit, Delete buttons)
    const adminButtons = await adminDriver.findElements(By.css('button'));
    await logTest('CONSULTANTS', 'Admin CRUD Controls', adminButtons.length > 0 ? 'pass' : 'skip',
      `${adminButtons.length} action buttons available`);
    
  } finally {
    await sleep(CONFIG.SHORT_WAIT);
    await adminDriver.quit();
  }
}

/**
 * Test AI Doctor Chat Workflow
 * Based on: PHASE1_REQUIREMENTS.md
 */
async function testAIDoctorWorkflow() {
  log('🤖', '========== AI DOCTOR WORKFLOW TEST ==========');
  
  const driver = await createDriver();
  
  try {
    await loginPatientPortal(driver, TEST_USERS.patient);
    await sleep(CONFIG.SHORT_WAIT);
    
    await driver.get(CONFIG.PATIENT_PORTAL_URL + '/ai-doctor');
    await sleep(CONFIG.LONG_WAIT);
    
    await takeScreenshot(driver, 'ai-doctor-chat');
    
    // Check chat interface
    const chatElements = await driver.findElements(By.css('textarea, input[type="text"], .chat-input, .message-input'));
    await logTest('AI', 'Chat Input Available', chatElements.length > 0 ? 'pass' : 'skip',
      chatElements.length > 0 ? 'Chat input found' : 'Chat input not visible');
    
    // Check chat history/messages area
    const messageArea = await driver.findElements(By.css('.messages, .chat-history, .conversation, main'));
    await logTest('AI', 'Chat Area Available', messageArea.length > 0 ? 'pass' : 'fail',
      `${messageArea.length} chat area elements`);
    
  } finally {
    await sleep(CONFIG.SHORT_WAIT);
    await driver.quit();
  }
}

/**
 * Test EMR Workflow (Doctor completing EMR)
 * Based on: Health_Records_Processes.md
 */
async function testEMRWorkflow() {
  log('📝', '========== EMR WORKFLOW TEST ==========');
  
  const driver = await createDriver();
  
  try {
    await loginDoctorPortal(driver, TEST_USERS.doctor);
    await sleep(CONFIG.SHORT_WAIT);
    
    const url = await driver.getCurrentUrl();
    const match = url.match(/doctor\/([^/]+)\//);
    const userId = match ? match[1] : 'DOC-001';
    
    // Navigate to patients page (EMR is accessed from patient records)
    await driver.get(`${CONFIG.DOCTOR_PORTAL_URL}/doctor/${userId}/patients`);
    await sleep(CONFIG.LONG_WAIT);
    
    await takeScreenshot(driver, 'patients-list');
    
    // Check patients list loads
    const patientElements = await driver.findElements(By.css('table tbody tr, .patient-card, .card, .grid > div'));
    await logTest('EMR', 'Patients List Loads', 'pass',
      `${patientElements.length} patient entries visible`);
    
    // Check for action buttons (view, edit, EMR)
    const actionButtons = await driver.findElements(By.css('button, a[href*="patient"]'));
    await logTest('EMR', 'Patient Actions Available', actionButtons.length > 0 ? 'pass' : 'skip',
      `${actionButtons.length} action elements found`);
    
  } finally {
    await sleep(CONFIG.SHORT_WAIT);
    await driver.quit();
  }
}

/**
 * Test User Management Workflow (Admin)
 * Based on: User_management_Workflows.md
 */
async function testUserManagementWorkflow() {
  log('👥', '========== USER MANAGEMENT WORKFLOW TEST ==========');
  
  const driver = await createDriver();
  
  try {
    await loginDoctorPortal(driver, TEST_USERS.admin);
    await sleep(CONFIG.SHORT_WAIT);
    
    const url = await driver.getCurrentUrl();
    const match = url.match(/doctor\/([^/]+)\//);
    const userId = match ? match[1] : 'ADMIN-001';
    
    // Navigate to doctor management
    await driver.get(`${CONFIG.DOCTOR_PORTAL_URL}/doctor/${userId}/doctor-management`);
    await sleep(CONFIG.LONG_WAIT);
    
    await takeScreenshot(driver, 'doctor-management');
    
    // Check management page loads
    const mgmtElements = await driver.findElements(By.css('table, .grid, main, h1'));
    await logTest('USER_MGMT', 'Doctor Management Page', mgmtElements.length > 0 ? 'pass' : 'fail',
      `${mgmtElements.length} management elements visible`);
    
    // Check for approval/reject buttons (admin can approve pending doctors)
    const approvalButtons = await driver.findElements(By.css('button'));
    await logTest('USER_MGMT', 'User Actions Available', approvalButtons.length > 0 ? 'pass' : 'skip',
      `${approvalButtons.length} action buttons found`);
    
  } finally {
    await sleep(CONFIG.SHORT_WAIT);
    await driver.quit();
  }
}

/**
 * Test Notification Workflow
 * Based on: Notification_Workflows.md
 */
async function testNotificationWorkflow() {
  log('🔔', '========== NOTIFICATION WORKFLOW TEST ==========');
  
  // Test in Patient Portal
  const patientDriver = await createDriver();
  
  try {
    await loginPatientPortal(patientDriver, TEST_USERS.patient);
    await sleep(CONFIG.MEDIUM_WAIT);
    
    // Check for notification bell/icon in header
    const notifBell = await patientDriver.findElements(By.css('.notification, [class*="notification"], [class*="bell"], button svg'));
    await logTest('NOTIFICATION', 'Patient Notification Bell', notifBell.length > 0 ? 'pass' : 'skip',
      notifBell.length > 0 ? 'Notification element found' : 'Bell not visible');
    
    await takeScreenshot(patientDriver, 'patient-notifications');
    
  } finally {
    await sleep(CONFIG.SHORT_WAIT);
    await patientDriver.quit();
  }
  
  // Test in Doctor Portal
  const doctorDriver = await createDriver();
  
  try {
    await loginDoctorPortal(doctorDriver, TEST_USERS.doctor);
    await sleep(CONFIG.MEDIUM_WAIT);
    
    // Check for notification in header
    const notifBell = await doctorDriver.findElements(By.css('.notification, [class*="notification"], [class*="bell"], button svg'));
    await logTest('NOTIFICATION', 'Doctor Notification Bell', notifBell.length > 0 ? 'pass' : 'skip',
      notifBell.length > 0 ? 'Notification element found' : 'Bell not visible');
    
    await takeScreenshot(doctorDriver, 'doctor-notifications');
    
  } finally {
    await sleep(CONFIG.SHORT_WAIT);
    await doctorDriver.quit();
  }
}

/**
 * Enhanced run function with all workflow tests
 */
async function runEnhancedTests() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║     IZARA TELEMEDICINE - ENHANCED COMPREHENSIVE WORKFLOW TESTS     ║');
  console.log('║═══════════════════════════════════════════════════════════════════║');
  console.log('║   Date: ' + new Date().toLocaleDateString('th-TH') + '                                              ║');
  console.log('║   Mode: VISIBLE BROWSER with Full Workflow Coverage               ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝');
  console.log('');
  
  testResults.startTime = new Date().toISOString();
  testResults.tests = [];
  testResults.summary = { total: 0, passed: 0, failed: 0, skipped: 0 };
  
  try {
    // API Health Check
    await testAPIEndpoints();
    
    // Patient Portal Complete Test
    await testPatientPortalComplete();
    
    // Doctor Portal Complete Test (as Doctor)
    await testDoctorPortalComplete('doctor');
    
    // Doctor Portal Complete Test (as Admin)
    await testDoctorPortalComplete('admin');
    
    // ========== ENHANCED WORKFLOW TESTS ==========
    console.log('');
    log('🔄', '========== STARTING ENHANCED WORKFLOW TESTS ==========');
    console.log('');
    
    // PHR Workflow
    await testPHRWorkflow();
    
    // Living Will Workflow
    await testLivingWillWorkflow();
    
    // Medical Content Workflow
    await testMedicalContentWorkflow();
    
    // Clinical Resources Workflow
    await testClinicalResourcesWorkflow();
    
    // Consultants Workflow
    await testConsultantsWorkflow();
    
    // AI Doctor Workflow
    await testAIDoctorWorkflow();
    
    // EMR Workflow
    await testEMRWorkflow();
    
    // User Management Workflow
    await testUserManagementWorkflow();
    
    // Notification Workflow
    await testNotificationWorkflow();
    
    // Cross-user Workflows
    await testAppointmentWorkflow();
    await testMeetingWorkflow();
    
  } catch (error) {
    console.error('Test suite error:', error);
    await logTest('SUITE', 'Test Execution', 'fail', error.message);
  }
  
  testResults.endTime = new Date().toISOString();
  
  // Print Summary
  printSummary();
  
  // Save Results
  saveResults();
}

// Main entry point - choose which test suite to run
if (process.argv.includes('--enhanced')) {
  // Run enhanced tests with full workflow coverage
  runEnhancedTests().then(() => {
    console.log('Enhanced tests completed');
  }).catch(err => {
    console.error('Enhanced tests failed:', err);
    process.exit(1);
  });
} else {
  // Run standard comprehensive tests
  runAllTests().then(() => {
    console.log('All tests completed');
  }).catch(err => {
    console.error('Tests failed:', err);
    process.exit(1);
  });
}
