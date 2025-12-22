/**
 * Shared Test Utilities
 * Common helper functions for Selenium E2E tests
 * 
 * @module testHelpers
 */

const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');
const { TIMEOUTS, DIRECTORIES } = require('./testConfig.cjs');

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString().substr(11, 12);
  const icons = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    step: '🔹',
    section: '📂'
  };
  const colors = {
    info: COLORS.cyan,
    success: COLORS.green,
    error: COLORS.red,
    warning: COLORS.yellow,
    step: COLORS.blue,
    section: COLORS.bright
  };
  const icon = icons[type] || '📋';
  const color = colors[type] || COLORS.reset;
  console.log(`${color}[${timestamp}] ${icon} ${message}${COLORS.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(70));
  console.log(`${COLORS.bright}📂 ${title}${COLORS.reset}`);
  console.log('='.repeat(70));
}

function logStep(step, total, description) {
  console.log(`\n${COLORS.blue}🔹 Step ${step}/${total}: ${description}${COLORS.reset}`);
}

// ============================================================================
// SCREENSHOT UTILITIES
// ============================================================================

async function takeScreenshot(driver, name, subdir = '') {
  try {
    const screenshotDir = subdir 
      ? path.join(DIRECTORIES.screenshots, subdir)
      : DIRECTORIES.screenshots;
    
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    const screenshot = await driver.takeScreenshot();
    const timestamp = Date.now();
    const filename = `${name}-${timestamp}.png`;
    const filepath = path.join(screenshotDir, filename);
    
    fs.writeFileSync(filepath, screenshot, 'base64');
    log(`Screenshot saved: ${filename}`, 'info');
    return filepath;
  } catch (error) {
    log(`Failed to take screenshot: ${error.message}`, 'error');
    return null;
  }
}

// ============================================================================
// WEBDRIVER UTILITIES
// ============================================================================

async function createDriver(headless = false) {
  const options = new chrome.Options();
  
  if (headless || process.env.HEADLESS === 'true') {
    options.addArguments('--headless=new');
  }
  
  options.addArguments(
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--window-size=1920,1080',
    '--disable-extensions',
    '--disable-popup-blocking',
    '--start-maximized'
  );
  
  // Disable notifications
  options.setUserPreferences({
    'profile.default_content_setting_values.notifications': 2
  });
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  
  await driver.manage().setTimeouts({
    implicit: TIMEOUTS.short,
    pageLoad: TIMEOUTS.pageLoad
  });
  
  return driver;
}

// ============================================================================
// ELEMENT INTERACTION UTILITIES
// ============================================================================

async function waitAndClick(driver, locator, timeout = TIMEOUTS.default) {
  try {
    const element = await driver.wait(until.elementLocated(locator), timeout);
    await driver.wait(until.elementIsVisible(element), timeout);
    await driver.wait(until.elementIsEnabled(element), timeout);
    
    // Scroll into view if needed
    await driver.executeScript('arguments[0].scrollIntoView({block: "center"})', element);
    await sleep(300);
    
    await element.click();
    return element;
  } catch (error) {
    throw new Error(`Failed to click element ${locator}: ${error.message}`);
  }
}

async function waitAndType(driver, locator, text, clear = true, timeout = TIMEOUTS.default) {
  try {
    const element = await driver.wait(until.elementLocated(locator), timeout);
    await driver.wait(until.elementIsVisible(element), timeout);
    await driver.wait(until.elementIsEnabled(element), timeout);
    
    if (clear) {
      await element.clear();
      // Extra clear for stubborn inputs
      await element.sendKeys(Key.CONTROL, 'a');
      await element.sendKeys(Key.DELETE);
    }
    
    await element.sendKeys(text);
    return element;
  } catch (error) {
    throw new Error(`Failed to type into element ${locator}: ${error.message}`);
  }
}

async function waitForElement(driver, locator, timeout = TIMEOUTS.default) {
  try {
    const element = await driver.wait(until.elementLocated(locator), timeout);
    await driver.wait(until.elementIsVisible(element), timeout);
    return element;
  } catch (error) {
    return null;
  }
}

async function elementExists(driver, locator, timeout = TIMEOUTS.short) {
  try {
    await driver.wait(until.elementLocated(locator), timeout);
    return true;
  } catch {
    return false;
  }
}

async function waitForElementToDisappear(driver, locator, timeout = TIMEOUTS.default) {
  try {
    const element = await driver.findElement(locator);
    await driver.wait(until.stalenessOf(element), timeout);
    return true;
  } catch {
    return true;
  }
}

async function getText(driver, locator, timeout = TIMEOUTS.default) {
  try {
    const element = await driver.wait(until.elementLocated(locator), timeout);
    return await element.getText();
  } catch {
    return null;
  }
}

async function getAttribute(driver, locator, attribute, timeout = TIMEOUTS.default) {
  try {
    const element = await driver.wait(until.elementLocated(locator), timeout);
    return await element.getAttribute(attribute);
  } catch {
    return null;
  }
}

async function selectDropdownByText(driver, locator, text, timeout = TIMEOUTS.default) {
  try {
    const dropdown = await driver.wait(until.elementLocated(locator), timeout);
    await dropdown.click();
    await sleep(500);
    
    // Try finding option by text
    const options = await driver.findElements(By.xpath(`//option[contains(text(), '${text}')]`));
    if (options.length > 0) {
      await options[0].click();
      return true;
    }
    
    // Try finding in custom dropdown
    const customOptions = await driver.findElements(By.xpath(`//*[contains(@class, 'option') and contains(text(), '${text}')]`));
    if (customOptions.length > 0) {
      await customOptions[0].click();
      return true;
    }
    
    return false;
  } catch (error) {
    throw new Error(`Failed to select '${text}' from dropdown: ${error.message}`);
  }
}

// ============================================================================
// NAVIGATION UTILITIES
// ============================================================================

async function navigateTo(driver, url) {
  await driver.get(url);
  await sleep(TIMEOUTS.afterNavigation);
  await waitForPageLoad(driver);
}

async function waitForPageLoad(driver, timeout = TIMEOUTS.pageLoad) {
  await driver.wait(async () => {
    const readyState = await driver.executeScript('return document.readyState');
    return readyState === 'complete';
  }, timeout);
  
  // Also wait for React to hydrate
  await sleep(1000);
}

async function waitForUrl(driver, urlPattern, timeout = TIMEOUTS.default) {
  try {
    await driver.wait(async () => {
      const currentUrl = await driver.getCurrentUrl();
      if (typeof urlPattern === 'string') {
        return currentUrl.includes(urlPattern);
      }
      return urlPattern.test(currentUrl);
    }, timeout);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// AUTHENTICATION UTILITIES
// ============================================================================

async function login(driver, portalUrl, email, password) {
  log(`Logging in as ${email}...`, 'step');
  
  // First, clear ALL session data before switching portals
  try {
    await driver.manage().deleteAllCookies();
    await driver.executeScript('localStorage.clear(); sessionStorage.clear();');
  } catch (e) {
    // Ignore - may fail if on about:blank
  }
  
  // Navigate directly to the login page
  await navigateTo(driver, `${portalUrl}/login`);
  
  // Handle any redirects to login page - wait longer for page to fully load
  await sleep(3000);
  
  // Check if we're NOT on login page (somehow still logged in)
  let currentUrl = await driver.getCurrentUrl();
  if (!currentUrl.includes('/login') && !currentUrl.includes('/register')) {
    log(`Session detected, clearing and forcing re-login`, 'info');
    // Clear cookies again and force navigate to login
    await driver.manage().deleteAllCookies();
    await driver.executeScript('localStorage.clear(); sessionStorage.clear();');
    await driver.navigate().refresh();
    await sleep(2000);
    await navigateTo(driver, `${portalUrl}/login`);
    await sleep(2000);
  }
  
  // Wait for login page to fully render
  await sleep(1500);
  
  // Find and fill email
  const emailInput = await waitForElement(driver, By.css('input[type="email"], input[name="email"]'));
  if (!emailInput) {
    throw new Error('Email input not found');
  }
  await emailInput.clear();
  // Use keyboard commands for clearing to ensure field is empty
  await emailInput.sendKeys(Key.CONTROL, 'a');
  await emailInput.sendKeys(Key.DELETE);
  await emailInput.sendKeys(email);
  
  // Find and fill password
  const passwordInput = await waitForElement(driver, By.css('input[type="password"]'));
  if (!passwordInput) {
    throw new Error('Password input not found');
  }
  await passwordInput.clear();
  // Use keyboard commands for clearing
  await passwordInput.sendKeys(Key.CONTROL, 'a');
  await passwordInput.sendKeys(Key.DELETE);
  await passwordInput.sendKeys(password);
  
  // Wait a moment before clicking submit
  await sleep(500);
  
  // Submit
  const submitBtn = await waitForElement(driver, By.css('button[type="submit"]'));
  await submitBtn.click();
  
  // Wait for login to complete - actively poll for URL change with increased timeout
  const startTime = Date.now();
  const timeout = TIMEOUTS.afterLogin;
  let loginSuccessful = false;
  
  while (Date.now() - startTime < timeout) {
    await sleep(500);
    currentUrl = await driver.getCurrentUrl();
    if (!currentUrl.includes('/login')) {
      loginSuccessful = true;
      break;
    }
  }
  
  // Final verification
  currentUrl = await driver.getCurrentUrl();
  if (currentUrl.includes('/login')) {
    // Check for error message - use specific error container selectors
    // Note: .text-red-500 is used for required field asterisks (*), not errors
    // Error messages are typically in .text-red-700 or .error-message containers
    const errorSelectors = [
      '.bg-red-50 .text-red-700',          // Doctor portal error message
      '.error-message',                     // Generic error class
      '[role="alert"]',                     // Accessibility error role
      '.bg-red-100 p',                      // Patient portal error style
      '.border-red-500 p',                  // Red border error container
      '.bg-red-50 .text-red-600'           // Patient portal error style
    ];
    
    for (const selector of errorSelectors) {
      const errorExists = await elementExists(driver, By.css(selector));
      if (errorExists) {
        const errorText = await getText(driver, By.css(selector));
        if (errorText && errorText.trim()) {
          throw new Error(`Login failed: ${errorText.trim()}`);
        }
      }
    }
    throw new Error('Login failed - still on login page');
  }
  
  // Wait a bit more for the page to fully load after login
  await sleep(2000);
  
  log(`Successfully logged in as ${email}`, 'success');
  return true;
}

/**
 * Reset rate limits on the doctor auth server (for testing only)
 * Call this before running tests to ensure rate limits don't block login attempts
 */
async function resetDoctorPortalRateLimits() {
  const { URLS } = require('./testConfig.cjs');
  const authServerUrl = URLS.doctorAuthApi || 'http://localhost:3011';
  
  try {
    const response = await fetch(`${authServerUrl}/test/reset-rate-limits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const result = await response.json();
      log('Doctor portal rate limits reset successfully', 'success');
      return result;
    } else {
      log(`Failed to reset rate limits: ${response.status}`, 'warning');
      return null;
    }
  } catch (error) {
    log(`Could not reset rate limits: ${error.message}`, 'warning');
    return null;
  }
}

async function logout(driver) {
  try {
    // Try common logout patterns
    const logoutSelectors = [
      By.xpath('//button[contains(text(), "Logout")]'),
      By.xpath('//button[contains(text(), "ออกจากระบบ")]'),
      By.css('[data-action="logout"]'),
      By.css('button[aria-label="Logout"]')
    ];
    
    for (const selector of logoutSelectors) {
      if (await elementExists(driver, selector)) {
        await waitAndClick(driver, selector);
        await sleep(2000);
        log('Logged out successfully', 'success');
        break;
      }
    }
    
    // Always clear cookies and local storage regardless of logout button
    await driver.manage().deleteAllCookies();
    await driver.executeScript('localStorage.clear(); sessionStorage.clear();');
    
    // Navigate to blank page to fully reset
    await driver.get('about:blank');
    await sleep(TIMEOUTS.afterLogout || 3000);
    
    log('Cleared session', 'success');
    return true;
  } catch (error) {
    // Ensure we clear cookies even if error
    try {
      await driver.manage().deleteAllCookies();
      await driver.executeScript('localStorage.clear(); sessionStorage.clear();');
      await driver.get('about:blank');
    } catch(e) {}
    log(`Logout completed with cleanup: ${error.message}`, 'warning');
    return true;
  }
}

// ============================================================================
// WAIT UTILITIES
// ============================================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForLoading(driver, timeout = TIMEOUTS.default) {
  // Wait for any loading spinners to disappear
  const loadingSelectors = [
    By.css('.animate-spin'),
    By.css('.loading'),
    By.css('[data-loading="true"]'),
    By.css('.skeleton')
  ];
  
  for (const selector of loadingSelectors) {
    try {
      await waitForElementToDisappear(driver, selector, timeout);
    } catch {
      // Ignore if element never existed
    }
  }
  
  await sleep(500);
}

// ============================================================================
// ASSERTION UTILITIES
// ============================================================================

async function assertElementExists(driver, locator, message = '') {
  const exists = await elementExists(driver, locator);
  if (!exists) {
    throw new Error(message || `Expected element ${locator} to exist but it was not found`);
  }
  return true;
}

async function assertElementContainsText(driver, locator, expectedText) {
  const actualText = await getText(driver, locator);
  if (!actualText || !actualText.includes(expectedText)) {
    throw new Error(`Expected element to contain "${expectedText}" but got "${actualText}"`);
  }
  return true;
}

async function assertUrlContains(driver, expectedPart) {
  const currentUrl = await driver.getCurrentUrl();
  if (!currentUrl.includes(expectedPart)) {
    throw new Error(`Expected URL to contain "${expectedPart}" but got "${currentUrl}"`);
  }
  return true;
}

// ============================================================================
// RESULTS TRACKING
// ============================================================================

class TestResults {
  constructor(suiteName) {
    this.suiteName = suiteName;
    this.startTime = new Date();
    this.tests = [];
    this.sections = {};
    this.currentSection = null;
  }
  
  startSection(name) {
    this.currentSection = name;
    if (!this.sections[name]) {
      this.sections[name] = { passed: 0, failed: 0, skipped: 0, tests: [] };
    }
    logSection(name);
  }
  
  recordTest(name, status, details = '', duration = 0) {
    const result = {
      name,
      status,
      details,
      duration,
      timestamp: new Date().toISOString(),
      section: this.currentSection
    };
    
    this.tests.push(result);
    
    if (this.currentSection && this.sections[this.currentSection]) {
      this.sections[this.currentSection].tests.push(result);
      if (status === 'PASSED') {
        this.sections[this.currentSection].passed++;
        log(`${name}${details ? ` - ${details}` : ''}`, 'success');
      } else if (status === 'FAILED') {
        this.sections[this.currentSection].failed++;
        log(`${name}: ${details}`, 'error');
      } else if (status === 'SKIPPED') {
        this.sections[this.currentSection].skipped++;
        log(`${name} (skipped): ${details}`, 'warning');
      }
    }
  }
  
  pass(name, details = '') {
    this.recordTest(name, 'PASSED', details);
  }
  
  fail(name, error) {
    const details = error instanceof Error ? error.message : error;
    this.recordTest(name, 'FAILED', details);
  }
  
  skip(name, reason = '') {
    this.recordTest(name, 'SKIPPED', reason);
  }
  
  getSummary() {
    const passed = this.tests.filter(t => t.status === 'PASSED').length;
    const failed = this.tests.filter(t => t.status === 'FAILED').length;
    const skipped = this.tests.filter(t => t.status === 'SKIPPED').length;
    const total = this.tests.length;
    const duration = new Date() - this.startTime;
    
    return {
      suiteName: this.suiteName,
      startTime: this.startTime.toISOString(),
      endTime: new Date().toISOString(),
      duration,
      total,
      passed,
      failed,
      skipped,
      passRate: total > 0 ? ((passed / total) * 100).toFixed(1) : 0,
      sections: this.sections,
      tests: this.tests
    };
  }
  
  printSummary() {
    const summary = this.getSummary();
    
    console.log('\n' + '='.repeat(70));
    console.log(`${COLORS.bright}📊 TEST RESULTS SUMMARY: ${this.suiteName}${COLORS.reset}`);
    console.log('='.repeat(70));
    console.log(`Total:   ${summary.total}`);
    console.log(`${COLORS.green}Passed:  ${summary.passed}${COLORS.reset}`);
    console.log(`${COLORS.red}Failed:  ${summary.failed}${COLORS.reset}`);
    console.log(`${COLORS.yellow}Skipped: ${summary.skipped}${COLORS.reset}`);
    console.log(`Pass Rate: ${summary.passRate}%`);
    console.log(`Duration: ${(summary.duration / 1000).toFixed(2)}s`);
    console.log('='.repeat(70));
    
    if (summary.failed > 0) {
      console.log(`\n${COLORS.red}FAILED TESTS:${COLORS.reset}`);
      this.tests
        .filter(t => t.status === 'FAILED')
        .forEach(t => console.log(`  ❌ ${t.name}: ${t.details}`));
    }
    
    return summary;
  }
  
  saveToFile(filename = null) {
    const summary = this.getSummary();
    const dir = DIRECTORIES.results;
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const file = filename || `${this.suiteName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`;
    const filepath = path.join(dir, file);
    
    fs.writeFileSync(filepath, JSON.stringify(summary, null, 2));
    log(`Results saved to: ${file}`, 'info');
    
    return filepath;
  }
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  // Logging
  log,
  logSection,
  logStep,
  COLORS,
  
  // Screenshots
  takeScreenshot,
  
  // Driver
  createDriver,
  
  // Element interactions
  waitAndClick,
  waitAndType,
  waitForElement,
  elementExists,
  waitForElementToDisappear,
  getText,
  getAttribute,
  selectDropdownByText,
  
  // Navigation
  navigateTo,
  waitForPageLoad,
  waitForUrl,
  
  // Authentication
  login,
  logout,
  resetDoctorPortalRateLimits,
  
  // Waits
  sleep,
  waitForLoading,
  
  // Assertions
  assertElementExists,
  assertElementContainsText,
  assertUrlContains,
  
  // Results
  TestResults
};
