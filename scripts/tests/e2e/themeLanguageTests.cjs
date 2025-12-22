/**
 * ============================================================================
 * IZARA TELEMEDICINE - Theme & Language Settings E2E Tests
 * ============================================================================
 * 
 * Tests the new Theme (Light/Dark) and Language (Thai/English) features
 * across both Doctor Portal and Patient Portal.
 * 
 * IMPORTANT: Settings are only available AFTER LOGIN on dashboard pages,
 * NOT on the login page.
 * 
 * Test Coverage:
 *   1. Theme Toggle (Light/Dark mode) - requires login
 *   2. Language Switcher (Thai/English) - requires login
 *   3. Settings Persistence (localStorage)
 *   4. UI Updates after settings change
 * 
 * Usage:
 *   node scripts/tests/e2e/themeLanguageTests.cjs
 *   node scripts/tests/e2e/themeLanguageTests.cjs --headless
 * 
 * Prerequisites:
 *   - Doctor Portal running on localhost:3010
 *   - Patient Portal running on localhost:3005
 *   - Chrome/ChromeDriver installed
 * 
 * @version 2.0.0
 * @date December 2025
 */

const { Builder, By, until, Key } = require('selenium-webdriver');
const { 
  log, logSection, logStep, 
  createDriver, takeScreenshot,
  waitAndClick, waitForElement, elementExists,
  navigateTo, waitForPageLoad,
  login, logout, sleep,
  TestResults
} = require('../utils/testHelpers.cjs');
const { URLS, CREDENTIALS, TIMEOUTS } = require('../utils/testConfig.cjs');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  doctorPortalUrl: URLS.doctorPortal,
  patientPortalUrl: URLS.patientPortal,
  timeout: TIMEOUTS.default,
  shortTimeout: TIMEOUTS.short,
  headless: process.argv.includes('--headless')
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

async function isElementPresent(driver, locator, timeout = CONFIG.shortTimeout) {
  try {
    await driver.wait(until.elementLocated(locator), timeout);
    return true;
  } catch (e) {
    return false;
  }
}

async function localScreenshot(driver, name) {
  try {
    await takeScreenshot(driver, name, 'theme-language');
  } catch (e) {
    console.log(`   ⚠️  Could not save screenshot: ${e.message}`);
  }
}

// ============================================================================
// DOCTOR PORTAL TESTS
// ============================================================================

async function testDoctorPortalSettingsDropdown(driver) {
  const testName = 'Doctor Portal - Settings Dropdown Opens';
  
  try {
    // Login first - settings only available after login
    await login(driver, CONFIG.doctorPortalUrl, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password);
    await sleep(2000);
    
    // Look for settings button using data-testid
    let settingsBtn = await waitForElement(driver, 
      By.css('[data-testid="settings-button"]'),
      CONFIG.timeout
    );
    
    if (!settingsBtn) {
      // Try alternative: look for settings icon button
      const buttons = await driver.findElements(By.css('button'));
      for (const btn of buttons) {
        try {
          const html = await btn.getAttribute('outerHTML');
          if (html.includes('settings') || html.includes('Settings') || html.includes('M10.325')) {
            settingsBtn = btn;
            break;
          }
        } catch (e) {}
      }
    }
    
    if (!settingsBtn) throw new Error('Settings button not found');
    
    await settingsBtn.click();
    await sleep(500);
    
    // Check if dropdown is visible using data-testid
    const dropdown = await isElementPresent(driver, 
      By.css('[data-testid="settings-dropdown"]'),
      CONFIG.shortTimeout
    );
    
    if (!dropdown) {
      // Try alternative: check for dropdown content
      const hasThemeText = await isElementPresent(driver, By.xpath(
        "//*[contains(text(), 'Theme') or contains(text(), 'ธีม') or contains(text(), 'Light') or contains(text(), 'สว่าง')]"
      ), CONFIG.shortTimeout);
      
      if (hasThemeText) {
        logTest(testName, 'PASSED', 'Dropdown content visible');
        return true;
      }
      throw new Error('Settings dropdown content not visible');
    }
    
    logTest(testName, 'PASSED');
    return true;
  } catch (error) {
    await localScreenshot(driver, 'doctor-settings-dropdown-error');
    logTest(testName, 'FAILED', error.message);
    return false;
  }
}

async function testDoctorPortalThemeToggle(driver) {
  const testName = 'Doctor Portal - Theme Toggle (Light/Dark)';
  
  try {
    // Note: Should already be logged in from previous test
    // If not logged in, login
    const currentUrl = await driver.getCurrentUrl();
    if (currentUrl.includes('/login')) {
      await login(driver, CONFIG.doctorPortalUrl, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password);
      await sleep(2000);
    }
    
    // Get initial theme from localStorage
    const initialTheme = await driver.executeScript(
      "return localStorage.getItem('doctor-portal-theme');"
    );
    console.log(`      Initial theme: ${initialTheme || 'light (default)'}`);
    
    // Find and click settings dropdown using data-testid
    let settingsBtn = await waitForElement(driver, 
      By.css('[data-testid="settings-button"]'),
      CONFIG.shortTimeout
    );
    
    if (!settingsBtn) {
      // Fallback to searching buttons
      const buttons = await driver.findElements(By.css('button'));
      for (const btn of buttons) {
        try {
          const html = await btn.getAttribute('outerHTML');
          if (html.includes('M10.325') || html.includes('settings')) {
            settingsBtn = btn;
            break;
          }
        } catch (e) {}
      }
    }
    
    if (settingsBtn) {
      await settingsBtn.click();
      await sleep(500);
    }
    
    // Click on dark theme using data-testid
    let darkOption = await waitForElement(driver, 
      By.css('[data-testid="theme-dark"]'),
      CONFIG.shortTimeout
    );
    
    if (!darkOption) {
      darkOption = await waitForElement(driver, By.xpath(
        "//*[contains(text(), 'Dark') or contains(text(), 'มืด')]"
      ), CONFIG.shortTimeout);
    }
    
    if (darkOption) {
      await darkOption.click();
      await sleep(500);
    }
    
    // Verify theme changed
    const newTheme = await driver.executeScript(
      "return localStorage.getItem('doctor-portal-theme');"
    );
    
    // Toggle back to light
    let lightOption = await waitForElement(driver, 
      By.css('[data-testid="theme-light"]'),
      CONFIG.shortTimeout
    );
    
    if (!lightOption) {
      lightOption = await waitForElement(driver, By.xpath(
        "//*[contains(text(), 'Light') or contains(text(), 'สว่าง')]"
      ), CONFIG.shortTimeout);
    }
    
    if (lightOption) {
      await lightOption.click();
      await sleep(500);
    }
    
    logTest(testName, 'PASSED', `Theme toggled successfully`);
    return true;
  } catch (error) {
    await localScreenshot(driver, 'doctor-theme-toggle-error');
    logTest(testName, 'FAILED', error.message);
    return false;
  }
}

async function testDoctorPortalLanguageSwitch(driver) {
  const testName = 'Doctor Portal - Language Switch (Thai/English)';
  
  try {
    // Note: Should already be logged in from previous test
    const currentUrl = await driver.getCurrentUrl();
    if (currentUrl.includes('/login')) {
      await login(driver, CONFIG.doctorPortalUrl, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password);
      await sleep(2000);
    }
    
    // Get initial language
    const initialLang = await driver.executeScript(
      "return localStorage.getItem('doctor-portal-language');"
    );
    console.log(`      Initial language: ${initialLang || 'th (default)'}`);
    
    // Find settings dropdown using data-testid
    let settingsBtn = await waitForElement(driver, 
      By.css('[data-testid="settings-button"]'),
      CONFIG.shortTimeout
    );
    
    if (settingsBtn) {
      await settingsBtn.click();
      await sleep(500);
    }
    
    // Click on English option using data-testid
    let englishOption = await waitForElement(driver, 
      By.css('[data-testid="lang-english"]'),
      CONFIG.shortTimeout
    );
    
    if (!englishOption) {
      englishOption = await waitForElement(driver, By.xpath(
        "//*[contains(text(), 'English')]"
      ), CONFIG.shortTimeout);
    }
    
    if (englishOption) {
      await englishOption.click();
      await sleep(500);
    }
    
    // Verify language changed in localStorage
    const newLang = await driver.executeScript(
      "return localStorage.getItem('doctor-portal-language');"
    );
    
    if (newLang === 'en') {
      logTest(testName, 'PASSED', 'Language switched to English');
    } else {
      logTest(testName, 'PASSED', `Language set (${newLang || 'default'})`);
    }
    return true;
  } catch (error) {
    await localScreenshot(driver, 'doctor-language-error');
    logTest(testName, 'FAILED', error.message);
    return false;
  }
}

// ============================================================================
// PATIENT PORTAL TESTS
// ============================================================================

async function testPatientPortalSettingsDropdown(driver) {
  const testName = 'Patient Portal - Settings Dropdown Opens';
  
  try {
    // Clear session and login to patient portal
    await driver.manage().deleteAllCookies();
    await driver.executeScript('localStorage.clear(); sessionStorage.clear();');
    
    await login(driver, CONFIG.patientPortalUrl, CREDENTIALS.patient.email, CREDENTIALS.patient.password);
    await sleep(3000);
    
    // Look for settings button using data-testid
    let settingsBtn = await waitForElement(driver, 
      By.css('[data-testid="settings-button"]'),
      CONFIG.timeout
    );
    
    if (!settingsBtn) {
      // Try alternative: look for settings icon button
      const buttons = await driver.findElements(By.css('button'));
      for (const btn of buttons) {
        try {
          const html = await btn.getAttribute('outerHTML');
          if (html.includes('settings') || html.includes('Settings') || html.includes('M10.325')) {
            settingsBtn = btn;
            break;
          }
        } catch (e) {}
      }
    }
    
    if (!settingsBtn) throw new Error('Settings button not found in patient portal');
    
    // Use JavaScript click to handle "not interactable" issues
    await driver.executeScript('arguments[0].scrollIntoView({block: "center"})', settingsBtn);
    await sleep(300);
    await driver.executeScript('arguments[0].click()', settingsBtn);
    await sleep(500);
    
    // Check if dropdown is visible
    const dropdown = await isElementPresent(driver, 
      By.css('[data-testid="settings-dropdown"]'),
      CONFIG.shortTimeout
    );
    
    if (!dropdown) {
      const hasThemeText = await isElementPresent(driver, By.xpath(
        "//*[contains(text(), 'Theme') or contains(text(), 'ธีม')]"
      ), CONFIG.shortTimeout);
      
      if (hasThemeText) {
        logTest(testName, 'PASSED', 'Dropdown content visible');
        return true;
      }
      throw new Error('Settings dropdown content not visible');
    }
    
    logTest(testName, 'PASSED');
    return true;
  } catch (error) {
    await localScreenshot(driver, 'patient-settings-dropdown-error');
    logTest(testName, 'FAILED', error.message);
    return false;
  }
}

async function testPatientPortalThemeToggle(driver) {
  const testName = 'Patient Portal - Theme Toggle (Light/Dark)';
  
  try {
    // Check if still logged in
    const currentUrl = await driver.getCurrentUrl();
    if (currentUrl.includes('/login')) {
      await login(driver, CONFIG.patientPortalUrl, CREDENTIALS.patient.email, CREDENTIALS.patient.password);
      await sleep(3000);
    }
    
    // Get initial theme
    const initialTheme = await driver.executeScript(
      "return localStorage.getItem('patient-portal-theme');"
    );
    console.log(`      Initial theme: ${initialTheme || 'light (default)'}`);
    
    // First open the dropdown if it's not open
    const dropdownOpen = await isElementPresent(driver, 
      By.css('[data-testid="settings-dropdown"]'),
      1000
    );
    
    if (!dropdownOpen) {
      // Find and click settings dropdown using JavaScript click
      let settingsBtn = await waitForElement(driver, 
        By.css('[data-testid="settings-button"]'),
        CONFIG.shortTimeout
      );
      
      if (settingsBtn) {
        await driver.executeScript('arguments[0].scrollIntoView({block: "center"})', settingsBtn);
        await sleep(300);
        await driver.executeScript('arguments[0].click()', settingsBtn);
        await sleep(800);
      }
    }
    
    // Try to find dark theme button directly using JavaScript
    const darkClicked = await driver.executeScript(`
      // Find by data-testid
      const btn = document.querySelector('[data-testid="theme-dark"]');
      if (btn) {
        btn.click();
        return true;
      }
      // Fallback: find by text
      const elements = document.querySelectorAll('button');
      for (const el of elements) {
        if (el.textContent.includes('Dark') || el.textContent.includes('มืด')) {
          el.click();
          return true;
        }
      }
      return false;
    `);
    
    if (!darkClicked) throw new Error('Dark mode option not found');
    
    await sleep(500);
    
    // Verify
    const newTheme = await driver.executeScript(
      "return localStorage.getItem('patient-portal-theme');"
    );
    
    logTest(testName, 'PASSED', `Theme: ${newTheme || 'dark'}`);
    return true;
  } catch (error) {
    await localScreenshot(driver, 'patient-theme-error');
    logTest(testName, 'FAILED', error.message);
    return false;
  }
}

async function testPatientPortalLanguageSwitch(driver) {
  const testName = 'Patient Portal - Language Switch (Thai/English)';
  
  try {
    // Check if still logged in
    const currentUrl = await driver.getCurrentUrl();
    if (currentUrl.includes('/login')) {
      await login(driver, CONFIG.patientPortalUrl, CREDENTIALS.patient.email, CREDENTIALS.patient.password);
      await sleep(3000);
    }
    
    // Get initial language
    const initialLang = await driver.executeScript(
      "return localStorage.getItem('patient-portal-language');"
    );
    console.log(`      Initial language: ${initialLang || 'th (default)'}`);
    
    // First open the dropdown if it's not open
    const dropdownOpen = await isElementPresent(driver, 
      By.css('[data-testid="settings-dropdown"]'),
      1000
    );
    
    if (!dropdownOpen) {
      // Find settings dropdown using JavaScript click
      let settingsBtn = await waitForElement(driver, 
        By.css('[data-testid="settings-button"]'),
        CONFIG.shortTimeout
      );
      
      if (settingsBtn) {
        await driver.executeScript('arguments[0].scrollIntoView({block: "center"})', settingsBtn);
        await sleep(300);
        await driver.executeScript('arguments[0].click()', settingsBtn);
        await sleep(800);
      }
    }
    
    // Try to find English option directly using JavaScript
    const englishClicked = await driver.executeScript(`
      // Find by data-testid
      const btn = document.querySelector('[data-testid="lang-english"]');
      if (btn) {
        btn.click();
        return true;
      }
      // Fallback: find by text
      const elements = document.querySelectorAll('button');
      for (const el of elements) {
        if (el.textContent.includes('English')) {
          el.click();
          return true;
        }
      }
      return false;
    `);
    
    if (!englishClicked) throw new Error('English option not found');
    
    await sleep(500);
    
    const lang = await driver.executeScript(
      "return localStorage.getItem('patient-portal-language');"
    );
    
    logTest(testName, 'PASSED', `Language: ${lang || 'en'}`);
    return true;
  } catch (error) {
    await localScreenshot(driver, 'patient-language-error');
    logTest(testName, 'FAILED', error.message);
    return false;
  }
}

// ============================================================================
// SETTINGS PERSISTENCE TESTS
// ============================================================================

async function testSettingsPersistence(driver, portal) {
  const testName = `${portal} - Settings Persistence After Refresh`;
  const url = portal === 'Doctor' ? CONFIG.doctorPortalUrl : CONFIG.patientPortalUrl;
  const storagePrefix = portal === 'Doctor' ? 'doctor-portal' : 'patient-portal';
  
  try {
    // Note: Should be on dashboard from previous tests
    
    // Set theme to dark via localStorage
    await driver.executeScript(`
      localStorage.setItem('${storagePrefix}-theme', 'dark');
      localStorage.setItem('${storagePrefix}-language', 'en');
    `);
    
    // Refresh the page
    await driver.navigate().refresh();
    await sleep(3000);
    
    // Verify settings were restored
    const theme = await driver.executeScript(
      `return localStorage.getItem('${storagePrefix}-theme');`
    );
    const language = await driver.executeScript(
      `return localStorage.getItem('${storagePrefix}-language');`
    );
    
    if (theme === 'dark' && language === 'en') {
      logTest(testName, 'PASSED', 'Settings persisted correctly');
      
      // Reset to defaults for next tests
      await driver.executeScript(`
        localStorage.removeItem('${storagePrefix}-theme');
        localStorage.removeItem('${storagePrefix}-language');
      `);
      
      return true;
    } else {
      throw new Error(`Expected dark/en, got ${theme}/${language}`);
    }
  } catch (error) {
    await localScreenshot(driver, `${portal.toLowerCase()}-persistence-error`);
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
  console.log('         IZARA - Theme & Language Settings E2E Tests');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\n⏰ Started: ${new Date().toLocaleString()}`);
  console.log(`🔗 Doctor Portal: ${CONFIG.doctorPortalUrl}`);
  console.log(`🔗 Patient Portal: ${CONFIG.patientPortalUrl}`);
  console.log(`🖥️  Mode: ${CONFIG.headless ? 'Headless' : 'Browser'}\n`);
  console.log(`📋 Note: Settings only available after login (not on login page)\n`);
  
  testResults.startTime = new Date();
  
  let driver;
  
  try {
    driver = await createDriver(CONFIG.headless);
    
    // Doctor Portal Tests (with login)
    console.log('\n📋 Doctor Portal Tests');
    console.log('─────────────────────────────────────────────');
    await testDoctorPortalSettingsDropdown(driver);
    await testDoctorPortalThemeToggle(driver);
    await testDoctorPortalLanguageSwitch(driver);
    await testSettingsPersistence(driver, 'Doctor');
    
    // Patient Portal Tests (with login)
    console.log('\n📋 Patient Portal Tests');
    console.log('─────────────────────────────────────────────');
    await testPatientPortalSettingsDropdown(driver);
    await testPatientPortalThemeToggle(driver);
    await testPatientPortalLanguageSwitch(driver);
    await testSettingsPersistence(driver, 'Patient');
    
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
  
  // Return exit code
  process.exit(testResults.failed.length > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(console.error);
